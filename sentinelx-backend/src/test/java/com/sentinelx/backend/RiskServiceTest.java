package com.sentinelx.backend;

import com.sentinelx.backend.dto.DecisionResponse;
import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.repository.UserRepository;
import com.sentinelx.backend.service.RiskService;
import com.sentinelx.backend.service.VelocityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Automated test suite verifying the real-time scoring logic in {@link RiskService}.
 */
@SpringBootTest
@ActiveProfiles("test")
class RiskServiceTest {

    @Autowired
    private RiskService riskService;

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

    @BeforeEach
    void setUp() {
        reviewQueueRepository.deleteAllInBatch();
        decisionRepository.deleteAllInBatch();
        transactionRepository.deleteAllInBatch();
        velocityService.resetUserVelocity("usr_1001");

        if (!userRepository.existsById("usr_1001")) {
            userRepository.save(User.builder().id("usr_1001").email("alice@example.com").riskSegment("LOW").build());
        }
    }

    @Test
    @DisplayName("Should approve low-risk transaction from known user with normal amount")
    void testLowRiskTransactionApproval() {
        TransactionRequest request = TransactionRequest.builder()
                .userId("usr_1001")
                .email("alice@example.com")
                .amount(new BigDecimal("50.00"))
                .currency("USD")
                .merchantId("mer_safe_store")
                .ipAddress("198.51.100.10")
                .deviceFingerprint("fp_alice_iphone15_sha256")
                .build();

        DecisionResponse response = riskService.evaluateTransaction(request);

        assertThat(response).isNotNull();
        assertThat(response.getFinalScore()).isLessThan(30);
        assertThat(response.getDecision()).isEqualTo("ALLOW");
        assertThat(response.getTransactionId()).isNotBlank();
        assertThat(response.getEvaluationTimeMs()).isGreaterThanOrEqualTo(0);
    }

    @Test
    @DisplayName("Should flag high-value transaction for review (> $10,000)")
    void testHighValueTransactionReview() {
        TransactionRequest request = TransactionRequest.builder()
                .userId("usr_1001")
                .email("alice@example.com")
                .amount(new BigDecimal("15000.00"))
                .currency("USD")
                .merchantId("mer_safe_store")
                .ipAddress("198.51.100.10")
                .deviceFingerprint("fp_alice_iphone15_sha256")
                .build();

        DecisionResponse response = riskService.evaluateTransaction(request);

        assertThat(response).isNotNull();
        assertThat(response.getFinalScore()).isGreaterThanOrEqualTo(50);
        assertThat(response.getDecision()).isIn("REVIEW", "BLOCK");
        assertThat(response.getFiredRules()).anyMatch(r -> r.contains("RULE_03: High-Value Transaction"));
    }

    @Test
    @DisplayName("Should block transaction with blacklisted merchant (+80 weight)")
    void testBlacklistedMerchantBlocked() {
        TransactionRequest request = TransactionRequest.builder()
                .userId("usr_1001")
                .email("alice@example.com")
                .amount(new BigDecimal("100.00"))
                .currency("USD")
                .merchantId("mer_black_1")
                .ipAddress("198.51.100.10")
                .deviceFingerprint("fp_alice_iphone15_sha256")
                .build();

        DecisionResponse response = riskService.evaluateTransaction(request);

        assertThat(response).isNotNull();
        assertThat(response.getFinalScore()).isGreaterThanOrEqualTo(70);
        assertThat(response.getDecision()).isEqualTo("BLOCK");
        assertThat(response.getFiredRules()).anyMatch(r -> r.contains("RULE_05: Blacklisted Merchant"));
    }
}
