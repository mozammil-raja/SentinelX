package com.sentinelx.backend.rule;

import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.entity.Device;
import com.sentinelx.backend.entity.Rule;
import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.repository.RuleRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
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
@Slf4j
@Service
public class RuleEngine {

    private final RuleRepository ruleRepository;
    private final Map<String, RiskRule> strategyMap = new HashMap<>();
    private volatile List<Rule> cachedActiveRules = new ArrayList<>();
    private volatile boolean initialized = false;

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
        refreshRules();
    }


    /**
     * Refreshes the in-memory active rules cache from PostgreSQL.
     * Invoked on startup and whenever rules are created, updated, or toggled.
     */
    public synchronized void refreshRules() {
        if (ruleRepository != null) {
            try {
                this.cachedActiveRules = ruleRepository.findByIsActiveTrue();
                this.initialized = true;
                log.debug("Refreshed active rules cache. Loaded {} rules.", cachedActiveRules.size());
            } catch (Exception e) {
                log.debug("Rules cache refresh bypassed during initialization or test setup: {}", e.getMessage());
            }
        }
    }

    /**
     * Retrieves the currently active cached rules.
     *
     * @return List of active Rule entities
     */
    public List<Rule> getActiveRules() {
        if (!initialized || cachedActiveRules == null) {
            refreshRules();
        }
        return cachedActiveRules != null ? cachedActiveRules : Collections.emptyList();
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

        // 1. Fetch active dynamic rules from in-memory cache
        List<Rule> activeRules = getActiveRules();

        // 2. Evaluate each active rule using its corresponding strategy handler
        for (Rule ruleConfig : activeRules) {
            RiskRule strategy = strategyMap.get(ruleConfig.getId());
            if (strategy != null) {
                RuleResult result = strategy.evaluate(request, user, device, ruleConfig, context);
                if (result.triggered()) {
                    score += result.scoreContribution();
                    firedRuleResults.add(result);
                    firedExplanations.add(result.reason());
                }
            } else {
                log.warn("Active database rule {} ('{}') has no matching registered Java RiskRule strategy bean and will be skipped.",
                        ruleConfig.getId(), ruleConfig.getName());
            }
        }

        // 3. Clamp score between 0 and 100
        int finalScore = Math.min(100, Math.max(0, score));

        // 4. Determine operational decision verdict
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
