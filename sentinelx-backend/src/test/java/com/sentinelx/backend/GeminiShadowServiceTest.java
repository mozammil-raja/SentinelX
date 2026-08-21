package com.sentinelx.backend;

import com.sentinelx.backend.dto.GeminiShadowResult;
import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.service.GeminiShadowService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class GeminiShadowServiceTest {

    @Autowired
    private GeminiShadowService geminiShadowService;

    @Test
    @DisplayName("Gemini Shadow: Fallback semantic evaluation produces accurate structured analysis")
    void testLocalSemanticFallbackEvaluation() {
        TransactionRequest request = TransactionRequest.builder()
                .userId("usr_1001")
                .amount(new BigDecimal("12500.00"))
                .currency("USD")
                .merchantId("mer_luxury_jewelry")
                .ipAddress("198.51.100.10")
                .deviceFingerprint("fp_trusted")
                .build();

        User user = User.builder()
                .id("usr_1001")
                .email("alice@example.com")
                .riskSegment("LOW")
                .build();

        GeminiShadowResult result = geminiShadowService.evaluateLocalFallback(
                request, user, null, List.of("RULE_03: High Value Transaction (+50 pts)"), 50);

        assertThat(result).isNotNull();
        assertThat(result.getGeminiScore()).isGreaterThanOrEqualTo(50);
        assertThat(result.getRiskCategory()).isEqualTo("HIGH_VALUE_ANOMALY");
        assertThat(result.getReasoning()).contains("Spend deviation");
        assertThat(result.getConfidence()).isGreaterThan(0.80);
        assertThat(result.getGeminiVerdict()).isEqualTo("REVIEW");
    }

    @Test
    @DisplayName("Gemini Shadow: Clean transaction correctly classified with zero risk")
    void testCleanTransactionClassification() {
        TransactionRequest request = TransactionRequest.builder()
                .userId("usr_1001")
                .amount(new BigDecimal("25.00"))
                .currency("USD")
                .merchantId("mer_coffee")
                .ipAddress("198.51.100.10")
                .deviceFingerprint("fp_trusted")
                .build();

        User user = User.builder()
                .id("usr_1001")
                .email("alice@example.com")
                .riskSegment("LOW")
                .build();

        GeminiShadowResult result = geminiShadowService.evaluateLocalFallback(
                request, user, null, List.of(), 0);

        assertThat(result).isNotNull();
        assertThat(result.getGeminiScore()).isEqualTo(0);
        assertThat(result.getRiskCategory()).isEqualTo("CLEAN");
        assertThat(result.getGeminiVerdict()).isEqualTo("ALLOW");
    }
}
