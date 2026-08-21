package com.sentinelx.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sentinelx.backend.dto.DecisionResponse;
import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.entity.*;
import com.sentinelx.backend.repository.*;
import com.sentinelx.backend.rule.EvaluationContext;
import com.sentinelx.backend.rule.EvaluationReport;
import com.sentinelx.backend.rule.RuleEngine;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Core risk evaluation and fraud decisioning service.
 * 
 * <p>Orchestrates transaction ingestion, user/device profile resolution, dynamic rule engine
 * evaluation, database persistence, and analyst review queue dispatch.</p>
 */
@Slf4j
@Service
public class RiskService {

    private final UserRepository userRepository;
    private final DeviceRepository deviceRepository;
    private final TransactionRepository transactionRepository;
    private final DecisionRepository decisionRepository;
    private final ReviewQueueRepository reviewQueueRepository;
    private final RuleEngine ruleEngine;
    private final VelocityService velocityService;
    private final DecisionStreamService decisionStreamService;
    private final ObjectMapper objectMapper;

    /**
     * Spring dependency injection constructor.
     */
    public RiskService(UserRepository userRepository,
                       DeviceRepository deviceRepository,
                       TransactionRepository transactionRepository,
                       DecisionRepository decisionRepository,
                       ReviewQueueRepository reviewQueueRepository,
                       RuleEngine ruleEngine,
                       VelocityService velocityService,
                       DecisionStreamService decisionStreamService,
                       ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.deviceRepository = deviceRepository;
        this.transactionRepository = transactionRepository;
        this.decisionRepository = decisionRepository;
        this.reviewQueueRepository = reviewQueueRepository;
        this.ruleEngine = ruleEngine;
        this.velocityService = velocityService;
        this.decisionStreamService = decisionStreamService;
        this.objectMapper = objectMapper;
    }

    /**
     * Evaluates an incoming transaction request dynamically using the {@link RuleEngine}.
     *
     * @param request Validated transaction request payload
     * @return Synchronous decision response with score, verdict, fired rules, and latency
     */
    @Transactional
    public DecisionResponse evaluateTransaction(TransactionRequest request) {
        long startTime = System.currentTimeMillis();

        // 1. Resolve or auto-provision customer user entity
        User user = userRepository.findById(request.getUserId()).orElseGet(() -> {
            User newUser = User.builder()
                    .id(request.getUserId())
                    .email(request.getEmail())
                    .riskSegment("MEDIUM")
                    .build();
            return userRepository.save(newUser);
        });

        if (user.getEmail() != null && request.getEmail() != null && !user.getEmail().equalsIgnoreCase(request.getEmail())) {
            log.warn("Ingestion payload email '{}' differs from stored account profile email '{}' for user '{}'",
                    request.getEmail(), user.getEmail(), user.getId());
        }

        // 2. Resolve or dynamically register device profile
        Device device = null;
        if (request.getDeviceFingerprint() != null && !request.getDeviceFingerprint().isBlank()) {
            device = deviceRepository.findByUserIdAndFingerprint(user.getId(), request.getDeviceFingerprint())
                    .orElse(null);

            if (device == null) {
                device = Device.builder()
                        .id("dev_" + UUID.randomUUID().toString().substring(0, 8))
                        .user(user)
                        .fingerprint(request.getDeviceFingerprint())
                        .ipAddress(request.getIpAddress())
                        .os(request.getOs() != null ? request.getOs() : "Unknown")
                        .browser(request.getBrowser() != null ? request.getBrowser() : "Unknown")
                        .isTrusted(false)
                        .build();
                device = deviceRepository.save(device);
            }
        }

        // 3. Pre-fetch targeted evaluation context (O(1) last historical transaction check for IP changes)
        Transaction lastTransaction = transactionRepository.findTop1ByUserIdOrderByTimestampDesc(user.getId()).orElse(null);
        EvaluationContext context = EvaluationContext.builder()
                .lastTransaction(lastTransaction)
                .recentTransactions(lastTransaction != null ? List.of(lastTransaction) : List.of())
                .build();

        // 4. Execute dynamic rule strategy scoring
        EvaluationReport report = ruleEngine.evaluate(request, user, device, context);

        // Map decision to transaction entity status
        String transactionStatus;
        if ("BLOCK".equals(report.getDecision())) {
            transactionStatus = "BLOCKED";
        } else if ("REVIEW".equals(report.getDecision())) {
            transactionStatus = "REVIEW";
        } else {
            transactionStatus = "APPROVED";
        }

        // 5. Persist Transaction
        String txnId = (request.getTransactionId() != null && !request.getTransactionId().isBlank())
                ? request.getTransactionId()
                : "txn_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);

        Transaction transaction = Transaction.builder()
                .id(txnId)
                .user(user)
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .merchantId(request.getMerchantId())
                .cardBin(request.getCardBin())
                .ipAddress(request.getIpAddress())
                .device(device)
                .status(transactionStatus)
                .timestamp(OffsetDateTime.now(java.time.ZoneOffset.UTC))
                .build();

        transaction = transactionRepository.save(transaction);

        // 6. Persist Decision Audit Record
        long endTime = System.currentTimeMillis();
        int totalLatency = (int) Math.max(1, endTime - startTime);

        String firedRulesJson;
        try {
            firedRulesJson = objectMapper.writeValueAsString(report.getFiredRuleExplanations());
        } catch (Exception e) {
            firedRulesJson = report.getFiredRuleExplanations().toString();
        }

        Decision decision = Decision.builder()
                .id("dec_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 4))
                .transactionId(transaction.getId())
                .user(user)
                .finalScore(report.getFinalScore())
                .decision(report.getDecision())
                .firedRules(firedRulesJson)
                .evaluationTimeMs(totalLatency)
                .build();

        decision = decisionRepository.save(decision);

        // 7. If REVIEW, automatically route into Analyst Review Queue
        if ("REVIEW".equals(report.getDecision())) {
            ReviewQueue queueItem = ReviewQueue.builder()
                    .transaction(transaction)
                    .decision(decision)
                    .status("PENDING")
                    .build();
            reviewQueueRepository.save(queueItem);
        }

        // 8. Update Redis multi-dimensional velocity metrics
        velocityService.recordTransactionMetrics(request, transaction.getId());

        // 9. Build synchronous API response and broadcast to real-time SSE dashboard subscribers
        DecisionResponse response = DecisionResponse.builder()
                .decisionId(decision.getId())
                .transactionId(transaction.getId())
                .userId(user.getId())
                .finalScore(report.getFinalScore())
                .decision(report.getDecision())
                .firedRules(report.getFiredRuleExplanations())
                .evaluationTimeMs(totalLatency)
                .timestamp(OffsetDateTime.now(java.time.ZoneOffset.UTC))
                .build();

        if (decisionStreamService != null) {
            decisionStreamService.broadcast(response);
        }

        return response;
    }
}
