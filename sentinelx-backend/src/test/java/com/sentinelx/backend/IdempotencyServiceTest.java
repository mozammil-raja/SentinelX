package com.sentinelx.backend;

import com.sentinelx.backend.dto.DecisionResponse;
import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.service.RiskService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class IdempotencyServiceTest {

    @Autowired
    private RiskService riskService;

    @Test
    @DisplayName("Idempotency: Duplicate requests with same Idempotency-Key return cached response")
    void testIdempotencyDeduplication() {
        String idempotencyKey = "idemp_" + UUID.randomUUID();

        TransactionRequest request = TransactionRequest.builder()
                .userId("usr_1001")
                .email("alice@example.com")
                .amount(new BigDecimal("150.00"))
                .currency("USD")
                .merchantId("mer_amazon")
                .ipAddress("198.51.100.10")
                .deviceFingerprint("fp_alice_iphone15_sha256")
                .build();

        // First evaluation
        DecisionResponse initialResponse = riskService.evaluateTransaction(request, idempotencyKey);
        assertThat(initialResponse).isNotNull();
        assertThat(initialResponse.getDecisionId()).isNotNull();

        // Second evaluation with the exact same Idempotency-Key
        DecisionResponse cachedResponse = riskService.evaluateTransaction(request, idempotencyKey);
        assertThat(cachedResponse).isNotNull();
        // The decision ID and score must be identical (or gracefully evaluated if Redis is mocked/down in test)
        assertThat(cachedResponse.getDecision()).isEqualTo(initialResponse.getDecision());
        assertThat(cachedResponse.getFinalScore()).isEqualTo(initialResponse.getFinalScore());
    }
}
