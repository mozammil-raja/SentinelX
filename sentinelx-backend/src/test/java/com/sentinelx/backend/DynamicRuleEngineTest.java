package com.sentinelx.backend;

import com.sentinelx.backend.dto.DecisionResponse;
import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.entity.Rule;
import com.sentinelx.backend.entity.Transaction;
import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.repository.RuleRepository;
import com.sentinelx.backend.repository.TransactionRepository;
import com.sentinelx.backend.repository.UserRepository;
import com.sentinelx.backend.service.RiskService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

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
    private TransactionRepository transactionRepository;

    @BeforeEach
    void setUp() {
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

        // 3. Re-evaluate identical transaction -> should now ALLOW without penalty
        DecisionResponse toggledResponse = riskService.evaluateTransaction(request);
        assertThat(toggledResponse.getDecision()).isEqualTo("ALLOW");
        assertThat(toggledResponse.getFinalScore()).isLessThan(30);
        assertThat(toggledResponse.getFiredRules()).noneMatch(r -> r.contains("Blacklisted Merchant"));

        // 4. Clean up: Re-activate rule
        blackListRule.setIsActive(true);
        ruleRepository.save(blackListRule);
    }

    @Test
    @DisplayName("Dynamic Weight: Modifying rule weight in database immediately recalculates final score")
    void testDynamicWeightModification() {
        Rule highValueRule = ruleRepository.findById("RULE_03").orElseThrow();
        int originalWeight = highValueRule.getWeight();

        // 1. Temporarily increase weight to 85 (causes immediate BLOCK for amount > 10,000)
        highValueRule.setWeight(85);
        ruleRepository.save(highValueRule);

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
    }

    @Test
    @DisplayName("Strategy Evaluation: GeolocationHopRule triggers when client IP shifts rapidly within time window")
    void testGeolocationHopStrategy() {
        String testUserId = "usr_geo_" + System.currentTimeMillis();
        User user = userRepository.save(User.builder()
                .id(testUserId)
                .email("geo." + System.currentTimeMillis() + "@example.com")
                .riskSegment("LOW")
                .build());

        // 1. Insert previous transaction from IP A 5 minutes ago and flush to database
        Transaction previousTxn = Transaction.builder()
                .id("txn_geo_prev_" + System.currentTimeMillis())
                .user(user)
                .amount(new BigDecimal("20.00"))
                .currency("USD")
                .merchantId("mer_store")
                .ipAddress("198.51.100.10")
                .status("APPROVED")
                .timestamp(OffsetDateTime.now().minusMinutes(5))
                .build();
        transactionRepository.saveAndFlush(previousTxn);

        // 2. New transaction arrives from IP B (different country/network)
        TransactionRequest hopRequest = TransactionRequest.builder()
                .userId(testUserId)
                .email(user.getEmail())
                .amount(new BigDecimal("30.00"))
                .currency("USD")
                .merchantId("mer_store")
                .ipAddress("203.0.113.99")
                .deviceFingerprint("fp_alice_iphone15_sha256")
                .build();

        DecisionResponse response = riskService.evaluateTransaction(hopRequest);
        assertThat(response.getFiredRules()).anyMatch(r -> r.contains("RULE_04") || r.contains("Geolocation Hop"));
    }
}
