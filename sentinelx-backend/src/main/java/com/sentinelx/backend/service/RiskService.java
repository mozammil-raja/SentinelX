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

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Core risk evaluation and fraud decisioning service.
 * 
 * <p>Orchestrates transaction ingestion, user/device profile resolution, dynamic rule engine
 * evaluation, database persistence, idempotency deduplication, distributed concurrency locking,
 * and AI risk copilot synthesis for analyst review cases.</p>
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
    private final IdempotencyService idempotencyService;
    private final DistributedLockService distributedLockService;
    private final AiRiskCopilotService aiRiskCopilotService;
    private final GeminiShadowService geminiShadowService;
    private final ObjectMapper objectMapper;

    public RiskService(UserRepository userRepository,
                       DeviceRepository deviceRepository,
                       TransactionRepository transactionRepository,
                       DecisionRepository decisionRepository,
                       ReviewQueueRepository reviewQueueRepository,
                       RuleEngine ruleEngine,
                       VelocityService velocityService,
                       DecisionStreamService decisionStreamService,
                       IdempotencyService idempotencyService,
                       DistributedLockService distributedLockService,
                       AiRiskCopilotService aiRiskCopilotService,
                       GeminiShadowService geminiShadowService,
                       ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.deviceRepository = deviceRepository;
        this.transactionRepository = transactionRepository;
        this.decisionRepository = decisionRepository;
        this.reviewQueueRepository = reviewQueueRepository;
        this.ruleEngine = ruleEngine;
        this.velocityService = velocityService;
        this.decisionStreamService = decisionStreamService;
        this.idempotencyService = idempotencyService;
        this.distributedLockService = distributedLockService;
        this.aiRiskCopilotService = aiRiskCopilotService;
        this.geminiShadowService = geminiShadowService;
        this.objectMapper = objectMapper;
    }

    /**
     * Evaluates transaction with optional idempotency key deduplication and distributed locking.
     */
    public DecisionResponse evaluateTransaction(TransactionRequest request) {
        return evaluateTransaction(request, null);
    }

    /**
     * Evaluates an incoming transaction request dynamically using the {@link RuleEngine}.
     *
     * @param request Validated transaction request payload
     * @param idempotencyKey Optional client-supplied deduplication token
     * @return Synchronous decision response with score, verdict, fired rules, and latency
     */
    @Transactional
    public DecisionResponse evaluateTransaction(TransactionRequest request, String idempotencyKey) {
        // 1. Check Idempotency Cache
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<DecisionResponse> cached = idempotencyService.getCachedDecision(idempotencyKey);
            if (cached.isPresent()) {
                return cached.get();
            }
        }

        // 2. Acquire Distributed Concurrency Lock on User with bounded spin-lock retry
        String lockToken = UUID.randomUUID().toString();
        boolean lockAcquired = distributedLockService.acquireUserLockWithRetry(
                request.getUserId(), lockToken, Duration.ofSeconds(5), Duration.ofMillis(100), Duration.ofMillis(10));
        if (!lockAcquired) {
            log.warn("Distributed lock contention timeout for user '{}'. Proceeding with transaction evaluation.", request.getUserId());
        }

        long startTime = System.currentTimeMillis();
        try {
            // 3. Resolve or auto-provision customer user entity
            User user = userRepository.findById(request.getUserId()).orElseGet(() -> {
                String safeEmail = request.getEmail();
                if (safeEmail != null && userRepository.findByEmail(safeEmail).isPresent()) {
                    safeEmail = request.getUserId() + "_" + safeEmail;
                }
                User newUser = User.builder()
                        .id(request.getUserId())
                        .email(safeEmail != null ? safeEmail : request.getUserId() + "@sentinelx.local")
                        .riskSegment("MEDIUM")
                        .build();
                return userRepository.save(newUser);
            });

            if (user.getEmail() != null && request.getEmail() != null && !user.getEmail().equalsIgnoreCase(request.getEmail())) {
                log.debug("Ingestion payload email '{}' differs from stored account profile email '{}' for user '{}'",
                        request.getEmail(), user.getEmail(), user.getId());
            }

            // 4. Resolve or dynamically register device profile
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

            // 5. Pre-fetch targeted evaluation context (O(1) last historical transaction check for IP changes)
            Transaction lastTransaction = transactionRepository.findTop1ByUserIdOrderByTimestampDesc(user.getId()).orElse(null);
            EvaluationContext context = EvaluationContext.builder()
                    .lastTransaction(lastTransaction)
                    .recentTransactions(lastTransaction != null ? List.of(lastTransaction) : List.of())
                    .build();

            // 6. Execute dynamic rule strategy scoring
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

            // 7. Persist Transaction
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
                    .timestamp(OffsetDateTime.now(ZoneOffset.UTC))
                    .build();

            transaction = transactionRepository.save(transaction);

            // 8. Persist Decision Audit Record
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

            // 9. If REVIEW, generate AI Risk Copilot analysis & route to Review Queue
            if ("REVIEW".equals(report.getDecision())) {
                String aiAnalysis = aiRiskCopilotService.synthesizeReviewAnalysis(
                        request, user, device, report.getFiredRuleResults(), report.getFinalScore());

                ReviewQueue queueItem = ReviewQueue.builder()
                        .transaction(transaction)
                        .decision(decision)
                        .status("PENDING")
                        .aiAnalysis(aiAnalysis)
                        .build();
                reviewQueueRepository.save(queueItem);
            }

            // 10. Update Redis multi-dimensional velocity metrics
            velocityService.recordTransactionMetrics(request, transaction.getId());

            // 11. Build synchronous API response and broadcast to real-time SSE dashboard subscribers
            DecisionResponse response = DecisionResponse.builder()
                    .decisionId(decision.getId())
                    .transactionId(transaction.getId())
                    .userId(user.getId())
                    .finalScore(report.getFinalScore())
                    .decision(report.getDecision())
                    .firedRules(report.getFiredRuleExplanations())
                    .evaluationTimeMs(totalLatency)
                    .timestamp(OffsetDateTime.now(ZoneOffset.UTC))
                    .build();

            if (decisionStreamService != null) {
                decisionStreamService.broadcast(response);
            }

            // 12. Cache in Redis for Idempotency
            if (idempotencyKey != null && !idempotencyKey.isBlank()) {
                idempotencyService.cacheDecision(idempotencyKey, response);
            }

            // 13. Asynchronously Dispatch Google Gemini GenAI Shadow Scoring Route (Non-blocking)
            if (geminiShadowService != null) {
                geminiShadowService.evaluateShadowAsync(
                        decision.getId(),
                        request,
                        user,
                        device,
                        report.getFiredRuleExplanations(),
                        report.getFinalScore(),
                        report.getDecision()
                );
            }

            return response;
        } finally {
            // 13. Safe Lock Release
            if (lockAcquired) {
                distributedLockService.releaseUserLock(request.getUserId(), lockToken);
            }
        }
    }
}
