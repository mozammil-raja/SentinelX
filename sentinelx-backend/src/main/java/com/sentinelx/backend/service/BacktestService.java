package com.sentinelx.backend.service;

import com.sentinelx.backend.dto.*;
import com.sentinelx.backend.entity.Device;
import com.sentinelx.backend.entity.Rule;
import com.sentinelx.backend.entity.Transaction;
import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.repository.DeviceRepository;
import com.sentinelx.backend.repository.RuleRepository;
import com.sentinelx.backend.repository.TransactionRepository;
import com.sentinelx.backend.repository.UserRepository;
import com.sentinelx.backend.rule.EvaluationContext;
import com.sentinelx.backend.rule.EvaluationReport;
import com.sentinelx.backend.rule.RiskRule;
import com.sentinelx.backend.rule.RuleResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Historical Replay & Backtesting Simulation Engine.
 *
 * <p>Executes historical transaction batches in a completely non-persisted dry-run context,
 * comparing active baseline rule configurations against proposed candidate rule sets.</p>
 */
@Service
public class BacktestService {

    private static final Logger log = LoggerFactory.getLogger(BacktestService.class);

    private final RuleRepository ruleRepository;
    private final UserRepository userRepository;
    private final DeviceRepository deviceRepository;
    private final TransactionRepository transactionRepository;
    private final Map<String, RiskRule> strategyMap = new HashMap<>();

    public BacktestService(RuleRepository ruleRepository,
                           UserRepository userRepository,
                           DeviceRepository deviceRepository,
                           TransactionRepository transactionRepository,
                           List<RiskRule> strategies) {
        this.ruleRepository = ruleRepository;
        this.userRepository = userRepository;
        this.deviceRepository = deviceRepository;
        this.transactionRepository = transactionRepository;
        for (RiskRule strategy : strategies) {
            this.strategyMap.put(strategy.getRuleId(), strategy);
        }
    }

    /**
     * Executes a complete backtest simulation comparing baseline rules against candidate rules.
     *
     * @param request Backtest parameters and candidate rule set
     * @return BacktestReportResponse with comparative metrics and discrepancy analysis
     */
    public BacktestReportResponse runBacktest(BacktestRequest request) {
        long startTime = System.currentTimeMillis();
        String runId = "bkt_" + UUID.randomUUID().toString().substring(0, 8);

        List<TransactionRequest> transactions = loadDataset(request);
        List<Rule> baselineRules = ruleRepository.findByIsActiveTrue();
        List<Rule> candidateRules = buildCandidateRules(baselineRules, request.getCandidateRules());

        List<DiscrepancyItem> discrepancies = new ArrayList<>();

        int baseAllow = 0, baseReview = 0, baseBlock = 0;
        int candAllow = 0, candReview = 0, candBlock = 0;
        long totalBaseScore = 0;
        long totalCandScore = 0;

        Map<String, Transaction> lastSeenByUser = new HashMap<>();

        for (int i = 0; i < transactions.size(); i++) {
            TransactionRequest txn = transactions.get(i);
            String txnId = "txn_sim_" + (i + 1);

            User user = resolveUser(txn.getUserId(), txn.getEmail());
            Device device = resolveDevice(user, txn.getDeviceFingerprint(), txn.getIpAddress(), txn.getOs(), txn.getBrowser());
            Transaction prevTxn = lastSeenByUser.get(txn.getUserId());
            EvaluationContext context = EvaluationContext.builder()
                    .lastTransaction(prevTxn)
                    .recentTransactions(prevTxn != null ? List.of(prevTxn) : Collections.emptyList())
                    .build();

            // 1. Evaluate with Baseline Rules
            EvaluationReport baseReport = evaluateRules(txn, user, device, baselineRules, context);
            // 2. Evaluate with Candidate Rules
            EvaluationReport candReport = evaluateRules(txn, user, device, candidateRules, context);

            // Record this transaction for subsequent historical context in replay
            Transaction currentSimTxn = Transaction.builder()
                    .id(txnId)
                    .user(user)
                    .amount(txn.getAmount())
                    .currency(txn.getCurrency())
                    .merchantId(txn.getMerchantId())
                    .ipAddress(txn.getIpAddress())
                    .device(device)
                    .timestamp(OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(Math.max(1, (transactions.size() - i) * 2L)))
                    .build();
            lastSeenByUser.put(txn.getUserId(), currentSimTxn);

            // Accumulate baseline counts
            switch (baseReport.getDecision()) {
                case "ALLOW" -> baseAllow++;
                case "REVIEW" -> baseReview++;
                case "BLOCK" -> baseBlock++;
            }
            totalBaseScore += baseReport.getFinalScore();

            // Accumulate candidate counts
            switch (candReport.getDecision()) {
                case "ALLOW" -> candAllow++;
                case "REVIEW" -> candReview++;
                case "BLOCK" -> candBlock++;
            }
            totalCandScore += candReport.getFinalScore();

            // Check for verdict discrepancy or significant score deviation
            if (!baseReport.getDecision().equals(candReport.getDecision()) ||
                    Math.abs(baseReport.getFinalScore() - candReport.getFinalScore()) >= 15) {
                discrepancies.add(DiscrepancyItem.builder()
                        .transactionId(txnId)
                        .userId(txn.getUserId())
                        .amount(txn.getAmount())
                        .merchantId(txn.getMerchantId())
                        .ipAddress(txn.getIpAddress())
                        .baselineVerdict(baseReport.getDecision())
                        .baselineScore(baseReport.getFinalScore())
                        .baselineFiredRules(baseReport.getFiredRuleResults().stream().map(RuleResult::ruleName).toList())
                        .candidateVerdict(candReport.getDecision())
                        .candidateScore(candReport.getFinalScore())
                        .candidateFiredRules(candReport.getFiredRuleResults().stream().map(RuleResult::ruleName).toList())
                        .scoreDelta(candReport.getFinalScore() - baseReport.getFinalScore())
                        .build());
            }
        }

        int total = transactions.size();
        long duration = System.currentTimeMillis() - startTime;
        double avgBaseScore = total > 0 ? (double) totalBaseScore / total : 0.0;
        double avgCandScore = total > 0 ? (double) totalCandScore / total : 0.0;

        SimulationSummary baselineSummary = SimulationSummary.builder()
                .totalProcessed(total)
                .allowCount(baseAllow)
                .reviewCount(baseReview)
                .blockCount(baseBlock)
                .allowPercentage(total > 0 ? roundDouble((double) baseAllow * 100 / total) : 0.0)
                .reviewPercentage(total > 0 ? roundDouble((double) baseReview * 100 / total) : 0.0)
                .blockPercentage(total > 0 ? roundDouble((double) baseBlock * 100 / total) : 0.0)
                .averageScore(roundDouble(avgBaseScore))
                .averageLatencyMs(roundDouble((double) duration / Math.max(1, total)))
                .build();

        SimulationSummary candidateSummary = SimulationSummary.builder()
                .totalProcessed(total)
                .allowCount(candAllow)
                .reviewCount(candReview)
                .blockCount(candBlock)
                .allowPercentage(total > 0 ? roundDouble((double) candAllow * 100 / total) : 0.0)
                .reviewPercentage(total > 0 ? roundDouble((double) candReview * 100 / total) : 0.0)
                .blockPercentage(total > 0 ? roundDouble((double) candBlock * 100 / total) : 0.0)
                .averageScore(roundDouble(avgCandScore))
                .averageLatencyMs(roundDouble((double) duration / Math.max(1, total)))
                .build();

        Map<String, Integer> distributionShift = new LinkedHashMap<>();
        distributionShift.put("ALLOW", candAllow - baseAllow);
        distributionShift.put("REVIEW", candReview - baseReview);
        distributionShift.put("BLOCK", candBlock - baseBlock);

        double blockRateShift = candidateSummary.getBlockPercentage() - baselineSummary.getBlockPercentage();

        return BacktestReportResponse.builder()
                .runId(runId)
                .datasetSource(request.getDatasetSource() != null ? request.getDatasetSource() : "SAMPLE_BENCHMARK")
                .totalTransactions(total)
                .simulationDurationMs(duration)
                .baseline(baselineSummary)
                .candidate(candidateSummary)
                .distributionShift(distributionShift)
                .blockRateShiftPercentage(roundDouble(blockRateShift))
                .discrepancyCount(discrepancies.size())
                .discrepancies(discrepancies.stream().limit(50).collect(Collectors.toList()))
                .build();
    }

    /**
     * Evaluates a single transaction against an explicit list of active or candidate rules.
     */
    private EvaluationReport evaluateRules(TransactionRequest request, User user, Device device, List<Rule> rules, EvaluationContext context) {
        int cumulativeScore = 0;
        List<RuleResult> firedRules = new ArrayList<>();

        for (Rule ruleConfig : rules) {
            if (Boolean.FALSE.equals(ruleConfig.getIsActive())) {
                continue;
            }

            RiskRule strategy = strategyMap.get(ruleConfig.getId());
            if (strategy != null) {
                RuleResult result = strategy.evaluate(request, user, device, ruleConfig, context);
                if (result.triggered()) {
                    firedRules.add(result);
                    cumulativeScore += result.scoreContribution();
                }
            }
        }

        int boundedScore = Math.min(100, Math.max(0, cumulativeScore));
        String verdict;
        if (boundedScore >= 70) {
            verdict = "BLOCK";
        } else if (boundedScore >= 30) {
            verdict = "REVIEW";
        } else {
            verdict = "ALLOW";
        }

        return EvaluationReport.builder()
                .finalScore(boundedScore)
                .decision(verdict)
                .firedRuleResults(firedRules)
                .firedRuleExplanations(firedRules.stream().map(RuleResult::reason).toList())
                .build();
    }

    /**
     * Merges user-supplied candidate rule overrides with existing baseline configurations.
     */
    private List<Rule> buildCandidateRules(List<Rule> baselineRules, List<RuleRequest> candidateRequests) {
        if (candidateRequests == null || candidateRequests.isEmpty()) {
            return baselineRules;
        }

        Map<String, RuleRequest> overrideMap = new HashMap<>();
        for (RuleRequest req : candidateRequests) {
            if (req.getRuleId() != null) {
                overrideMap.put(req.getRuleId(), req);
            }
        }

        List<Rule> result = new ArrayList<>();
        for (Rule base : baselineRules) {
            RuleRequest override = overrideMap.get(base.getId());
            if (override != null) {
                result.add(Rule.builder()
                        .id(base.getId())
                        .name(override.getName() != null ? override.getName() : base.getName())
                        .description(override.getDescription() != null ? override.getDescription() : base.getDescription())
                        .conditionJson(override.getConditionJson() != null ? override.getConditionJson() : base.getConditionJson())
                        .weight(override.getWeight() != null ? override.getWeight() : base.getWeight())
                        .isActive(override.getIsActive() != null ? override.getIsActive() : base.getIsActive())
                        .version(base.getVersion())
                        .build());
            } else {
                result.add(base);
            }
        }
        return result;
    }

    /**
     * Loads the target transaction dataset based on the requested source.
     */
    public List<TransactionRequest> loadDataset(BacktestRequest request) {
        String source = request.getDatasetSource() != null ? request.getDatasetSource() : "SAMPLE_BENCHMARK";

        if ("CUSTOM_PAYLOAD".equalsIgnoreCase(source) && request.getCustomTransactions() != null && !request.getCustomTransactions().isEmpty()) {
            return request.getCustomTransactions();
        }

        if ("DATABASE_RANGE".equalsIgnoreCase(source)) {
            int limit = request.getLimit() != null && request.getLimit() > 0 ? Math.min(request.getLimit(), 1000) : 250;
            List<Transaction> dbTxns = transactionRepository.findAll(PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "timestamp"))).getContent();
            if (!dbTxns.isEmpty()) {
                return dbTxns.stream().map(t -> TransactionRequest.builder()
                        .userId(t.getUser() != null ? t.getUser().getId() : "usr_db_sim")
                        .email(t.getUser() != null ? t.getUser().getEmail() : "user@example.com")
                        .amount(t.getAmount())
                        .currency(t.getCurrency())
                        .merchantId(t.getMerchantId())
                        .cardBin(t.getCardBin())
                        .ipAddress(t.getIpAddress())
                        .deviceFingerprint(t.getDevice() != null ? t.getDevice().getFingerprint() : null)
                        .build()
                ).collect(Collectors.toList());
            }
        }

        return generateBenchmarkDataset();
    }

    /**
     * Generates a rich, deterministic benchmark dataset of 250 synthetic transactions covering all fraud scenarios.
     */
    public List<TransactionRequest> generateBenchmarkDataset() {
        List<TransactionRequest> dataset = new ArrayList<>(250);

        String[] safeMerchants = {"mer_amazon", "mer_apple_store", "mer_uber", "mer_starbucks", "mer_target", "mer_netflix"};
        String[] riskyMerchants = {"mer_black_1", "mer_black_2"};

        // 1. 140 Standard Safe Everyday Transactions
        for (int i = 1; i <= 140; i++) {
            dataset.add(TransactionRequest.builder()
                    .userId("usr_1001")
                    .email("alice@example.com")
                    .amount(BigDecimal.valueOf(15.0 + (i % 80)))
                    .currency("USD")
                    .merchantId(safeMerchants[i % safeMerchants.length])
                    .cardBin("411111")
                    .ipAddress("198.51.100.10")
                    .deviceFingerprint("fp_alice_iphone15_sha256")
                    .os("iOS")
                    .browser("Safari")
                    .build());
        }

        // 2. 30 High-Value Transfer Transactions ($8,000 - $45,000)
        for (int i = 1; i <= 30; i++) {
            dataset.add(TransactionRequest.builder()
                    .userId("usr_1002")
                    .email("bob@example.com")
                    .amount(BigDecimal.valueOf(9500.0 + (i * 1200)))
                    .currency("USD")
                    .merchantId("mer_luxury_jewelry")
                    .cardBin("424242")
                    .ipAddress("198.51.100.20")
                    .deviceFingerprint("fp_bob_macbook_pro")
                    .os("macOS")
                    .browser("Chrome")
                    .build());
        }

        // 3. 30 Rapid IP Change / VPN Hop Transactions
        for (int i = 1; i <= 30; i++) {
            dataset.add(TransactionRequest.builder()
                    .userId("usr_1001")
                    .email("alice@example.com")
                    .amount(BigDecimal.valueOf(50.0 + (i * 10)))
                    .currency("USD")
                    .merchantId(safeMerchants[i % safeMerchants.length])
                    .cardBin("411111")
                    .ipAddress("203.0.113." + (i % 250))
                    .deviceFingerprint("fp_alice_iphone15_sha256")
                    .os("iOS")
                    .browser("Safari")
                    .build());
        }

        // 4. 25 Blacklisted & Sanctioned Merchant Transactions
        for (int i = 1; i <= 25; i++) {
            dataset.add(TransactionRequest.builder()
                    .userId("usr_1003")
                    .email("charlie@example.com")
                    .amount(BigDecimal.valueOf(100.0 + (i * 25)))
                    .currency("USD")
                    .merchantId(riskyMerchants[i % riskyMerchants.length])
                    .cardBin("400000")
                    .ipAddress("198.51.100.99")
                    .deviceFingerprint("fp_charlie_phone")
                    .os("Android")
                    .browser("Firefox")
                    .build());
        }

        // 5. 25 High Risk User Segment Transactions
        for (int i = 1; i <= 25; i++) {
            dataset.add(TransactionRequest.builder()
                    .userId("usr_1003")
                    .email("charlie@example.com")
                    .amount(BigDecimal.valueOf(35.0 + (i * 15)))
                    .currency("USD")
                    .merchantId(safeMerchants[i % safeMerchants.length])
                    .cardBin("411111")
                    .ipAddress("198.51.100.33")
                    .deviceFingerprint("fp_untrusted_device_" + i)
                    .os("Linux")
                    .browser("TorBrowser")
                    .build());
        }

        return dataset;
    }

    private User resolveUser(String userId, String email) {
        if (userId != null) {
            return userRepository.findById(userId).orElseGet(() -> User.builder()
                    .id(userId)
                    .email(email != null ? email : userId + "@sim.io")
                    .riskSegment("LOW")
                    .build());
        }
        return User.builder().id("usr_sim").email("sim@example.com").riskSegment("LOW").build();
    }

    private Device resolveDevice(User user, String fingerprint, String ip, String os, String browser) {
        if (fingerprint != null) {
            return deviceRepository.findByUserIdAndFingerprint(user.getId(), fingerprint).orElseGet(() -> Device.builder()
                    .id("dev_sim_" + fingerprint.hashCode())
                    .user(user)
                    .fingerprint(fingerprint)
                    .ipAddress(ip != null ? ip : "127.0.0.1")
                    .os(os != null ? os : "Unknown")
                    .browser(browser != null ? browser : "Unknown")
                    .isTrusted(false)
                    .lastSeen(OffsetDateTime.now(ZoneOffset.UTC))
                    .build());
        }
        return null;
    }

    private double roundDouble(double val) {
        return BigDecimal.valueOf(val).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
