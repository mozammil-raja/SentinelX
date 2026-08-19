package com.sentinelx.backend;

import com.sentinelx.backend.dto.DecisionResponse;
import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.entity.Rule;
import com.sentinelx.backend.entity.Transaction;
import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.repository.RuleRepository;
import com.sentinelx.backend.repository.UserRepository;
import com.sentinelx.backend.rule.EvaluationContext;
import com.sentinelx.backend.rule.RuleResult;
import com.sentinelx.backend.rule.impl.GeolocationHopRule;
import com.sentinelx.backend.service.RiskService;
import com.sentinelx.backend.service.VelocityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Automated test suite verifying the dynamic pluggable strategy engine (Phase 4).
 */
@SpringBootTest
@ActiveProfiles("test")
class DynamicRuleEngineTest {

    @Autowired
    private RiskService riskService;

    @Autowired
    private RuleRepository ruleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.sentinelx.backend.repository.TransactionRepository transactionRepository;

    @Autowired
    private com.sentinelx.backend.repository.DecisionRepository decisionRepository;

    @Autowired
    private com.sentinelx.backend.repository.ReviewQueueRepository reviewQueueRepository;

    @Autowired
    private VelocityService velocityService;

    @Autowired
    private com.sentinelx.backend.rule.RuleEngine ruleEngine;

    @BeforeEach
    void setUp() {
        reviewQueueRepository.deleteAllInBatch();
        decisionRepository.deleteAllInBatch();
        transactionRepository.deleteAllInBatch();
        velocityService.resetUserVelocity("usr_1001");
        ruleEngine.refreshRules();

        if (!userRepository.existsById("usr_1001")) {
            userRepository.save(User.builder().id("usr_1001").email("alice@example.com").riskSegment("LOW").build());
        }
    }

    @Test
    @DisplayName("Dynamic Toggle: Disabling a rule in database immediately removes its penalty from live scoring")
    void testDynamicRuleToggle() {
        // 1. Initially RULE_05 (Blacklisted Merchant) is active -> should BLOCK (+80 pts)
        TransactionRequest request = TransactionRequest.builder()
                .userId("usr_1001")
                .email("alice@example.com")
                .amount(new BigDecimal("50.00"))
                .currency("USD")
                .merchantId("mer_black_1")
                .ipAddress("198.51.100.10")
                .deviceFingerprint("fp_alice_iphone15_sha256")
                .build();

        DecisionResponse initialResponse = riskService.evaluateTransaction(request);
        assertThat(initialResponse.getDecision()).isEqualTo("BLOCK");
        assertThat(initialResponse.getFiredRules()).anyMatch(r -> r.contains("RULE_05") || r.contains("Blacklisted Merchant"));

        // 2. Dynamically deactivate RULE_05 in database
        Rule blackListRule = ruleRepository.findById("RULE_05").orElseThrow();
        blackListRule.setIsActive(false);
        ruleRepository.save(blackListRule);
        ruleEngine.refreshRules();

        // 3. Re-evaluate identical transaction -> should now ALLOW without penalty
        DecisionResponse toggledResponse = riskService.evaluateTransaction(request);
        assertThat(toggledResponse.getDecision()).isEqualTo("ALLOW");
        assertThat(toggledResponse.getFinalScore()).isLessThan(30);
        assertThat(toggledResponse.getFiredRules()).noneMatch(r -> r.contains("Blacklisted Merchant"));

        // 4. Clean up: Re-activate rule
        blackListRule.setIsActive(true);
        ruleRepository.save(blackListRule);
        ruleEngine.refreshRules();
    }

    @Test
    @DisplayName("Dynamic Weight: Modifying rule weight in database immediately recalculates final score")
    void testDynamicWeightModification() {
        Rule highValueRule = ruleRepository.findById("RULE_03").orElseThrow();
        int originalWeight = highValueRule.getWeight();

        // 1. Temporarily increase weight to 85 (causes immediate BLOCK for amount > 10,000)
        highValueRule.setWeight(85);
        ruleRepository.save(highValueRule);
        ruleEngine.refreshRules();

        TransactionRequest request = TransactionRequest.builder()
                .userId("usr_1001")
                .email("alice@example.com")
                .amount(new BigDecimal("12000.00"))
                .currency("USD")
                .merchantId("mer_safe_store")
                .ipAddress("198.51.100.10")
                .deviceFingerprint("fp_alice_iphone15_sha256")
                .build();

        DecisionResponse response = riskService.evaluateTransaction(request);
        assertThat(response.getFinalScore()).isGreaterThanOrEqualTo(85);
        assertThat(response.getDecision()).isEqualTo("BLOCK");

        // 2. Restore original weight
        highValueRule.setWeight(originalWeight);
        ruleRepository.save(highValueRule);
        ruleEngine.refreshRules();
    }

    @Test
    @DisplayName("Strategy Evaluation: GeolocationHopRule triggers only when the client IP changes within the time window")
    void testGeolocationHopStrategy() {
        Rule ruleConfig = Rule.builder()
                .id("RULE_04")
                .name("Geolocation Hop")
                .conditionJson("{\"timeWindow\": 1800}")
                .weight(60)
                .build();

        User user = User.builder().id("usr_geo").riskSegment("LOW").build();

        TransactionRequest hopRequest = TransactionRequest.builder()
                .userId("usr_geo")
                .ipAddress("203.0.113.99")
                .build();

        GeolocationHopRule rule = new GeolocationHopRule();

        // Recent transaction (5 minutes ago) from a different IP -> triggers
        Transaction recentTxn = Transaction.builder()
                .id("txn_geo_prev")
                .ipAddress("198.51.100.10")
                .timestamp(OffsetDateTime.now().minusMinutes(5))
                .build();
        EvaluationContext recentContext = EvaluationContext.builder()
                .recentTransactions(List.of(recentTxn))
                .build();

        RuleResult triggered = rule.evaluate(hopRequest, user, null, ruleConfig, recentContext);
        assertThat(triggered.triggered()).isTrue();

        // Old transaction (2 hours ago) from a different IP -> does not trigger
        Transaction oldTxn = Transaction.builder()
                .id("txn_geo_old")
                .ipAddress("198.51.100.10")
                .timestamp(OffsetDateTime.now().minusHours(2))
                .build();
        EvaluationContext oldContext = EvaluationContext.builder()
                .recentTransactions(List.of(oldTxn))
                .build();

        RuleResult notTriggered = rule.evaluate(hopRequest, user, null, ruleConfig, oldContext);
        assertThat(notTriggered.triggered()).isFalse();
    }
}
