package com.sentinelx.backend;

import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.rule.RuleResult;
import com.sentinelx.backend.service.AiRiskCopilotService;
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
class AiRiskCopilotServiceTest {

    @Autowired
    private AiRiskCopilotService aiRiskCopilotService;

    @Test
    @DisplayName("AI Copilot: Accurately synthesizes ATO correlation when velocity and new device rules fire together")
    void testAccountTakeoverCorrelationSynthesis() {
        TransactionRequest request = TransactionRequest.builder()
                .userId("usr_1001")
                .amount(new BigDecimal("250.00"))
                .merchantId("mer_amazon")
                .build();

        User user = User.builder()
                .id("usr_1001")
                .email("alice@example.com")
                .riskSegment("LOW")
                .build();

        List<RuleResult> firedRules = List.of(
                RuleResult.triggered("RULE_01", "High Velocity (5m)", 40, "High velocity triggered"),
                RuleResult.triggered("RULE_02", "New Device Fingerprint", 25, "New device triggered")
        );

        String analysis = aiRiskCopilotService.synthesizeReviewAnalysis(request, user, null, firedRules, 65);

        assertThat(analysis).isNotNull();
        assertThat(analysis).contains("AI Risk Copilot Analysis");
        assertThat(analysis).contains("High velocity transaction burst originating from an unrecognized device");
        assertThat(analysis).contains("Recommended Action:");
        assertThat(analysis).contains("Step-Up 2FA");
    }
}
