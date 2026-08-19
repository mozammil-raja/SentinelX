package com.sentinelx.backend.rule;

import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.entity.Device;
import com.sentinelx.backend.entity.Rule;
import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.repository.RuleRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Central dynamic rule evaluation engine.
 * 
 * <p>Discovers all registered {@link RiskRule} strategy beans at application startup and
 * executes them dynamically against the active rule configurations queried from PostgreSQL
 * ({@link RuleRepository#findByIsActiveTrue()}).</p>
 */
@Service
public class RuleEngine {

    private final RuleRepository ruleRepository;
    private final Map<String, RiskRule> strategyMap = new HashMap<>();

    /**
     * Dependency injection constructor discovering all available RiskRule strategies.
     *
     * @param ruleRepository Repository for querying active rules from PostgreSQL
     * @param strategies     Spring-injected list of all component-annotated RiskRule beans
     */
    public RuleEngine(RuleRepository ruleRepository, List<RiskRule> strategies) {
        this.ruleRepository = ruleRepository;
        for (RiskRule strategy : strategies) {
            this.strategyMap.put(strategy.getRuleId(), strategy);
        }
    }

    /**
     * Executes dynamic risk evaluation against all active database rules.
     *
     * @param request Inbound transaction request
     * @param user    Resolved customer entity
     * @param device  Resolved client device entity
     * @param context Shared historical evaluation context
     * @return EvaluationReport containing final score, verdict, and fired rule explanations
     */
    public EvaluationReport evaluate(TransactionRequest request, User user, Device device, EvaluationContext context) {
        long startTime = System.currentTimeMillis();

        int score = 0;
        List<RuleResult> firedRuleResults = new ArrayList<>();
        List<String> firedExplanations = new ArrayList<>();

        // 1. Base risk penalty from customer risk tier
        if ("HIGH".equalsIgnoreCase(user.getRiskSegment())) {
            score += 30;
            RuleResult tierResult = RuleResult.triggered("USER_TIER", "High Risk Segment User", 30, "User is in HIGH risk segment (+30 pts)");
            firedRuleResults.add(tierResult);
            firedExplanations.add(tierResult.reason());
        } else if ("CRITICAL".equalsIgnoreCase(user.getRiskSegment())) {
            score += 60;
            RuleResult tierResult = RuleResult.triggered("USER_TIER", "Critical Risk Segment User", 60, "User is in CRITICAL risk segment (+60 pts)");
            firedRuleResults.add(tierResult);
            firedExplanations.add(tierResult.reason());
        }

        // 2. Fetch active dynamic rules from PostgreSQL
        List<Rule> activeRules = ruleRepository.findByIsActiveTrue();

        // 3. Evaluate each active rule using its corresponding strategy handler
        for (Rule ruleConfig : activeRules) {
            RiskRule strategy = strategyMap.get(ruleConfig.getId());
            if (strategy != null) {
                RuleResult result = strategy.evaluate(request, user, device, ruleConfig, context);
                if (result.triggered()) {
                    score += result.scoreContribution();
                    firedRuleResults.add(result);
                    firedExplanations.add(result.reason());
                }
            }
        }

        // 4. Clamp score between 0 and 100
        int finalScore = Math.min(100, Math.max(0, score));

        // 5. Determine operational decision verdict
        String decisionVerdict;
        if (finalScore >= 70) {
            decisionVerdict = "BLOCK";
        } else if (finalScore >= 30) {
            decisionVerdict = "REVIEW";
        } else {
            decisionVerdict = "ALLOW";
        }

        long endTime = System.currentTimeMillis();
        int evaluationLatency = (int) Math.max(1, endTime - startTime);

        return EvaluationReport.builder()
                .finalScore(finalScore)
                .decision(decisionVerdict)
                .firedRuleResults(firedRuleResults)
                .firedRuleExplanations(firedExplanations)
                .evaluationTimeMs(evaluationLatency)
                .build();
    }
}
