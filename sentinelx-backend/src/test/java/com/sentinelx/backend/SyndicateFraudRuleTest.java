package com.sentinelx.backend;

import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.entity.Rule;
import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.rule.EvaluationContext;
import com.sentinelx.backend.rule.RuleResult;
import com.sentinelx.backend.rule.impl.SyndicateFraudRule;
import com.sentinelx.backend.service.GraphSyndicateService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class SyndicateFraudRuleTest {

    @Autowired
    private SyndicateFraudRule syndicateFraudRule;

    @Autowired
    private GraphSyndicateService graphSyndicateService;

    @BeforeEach
    void setUp() {
        graphSyndicateService.initSeedGraph();
    }

    @Test
    @DisplayName("RULE_07: Triggers +75 penalty points when user shares device with banned fraudster")
    void testRule07TriggersOnSharedDevice() {
        TransactionRequest request = TransactionRequest.builder()
                .userId("usr_syndicate_member")
                .amount(new BigDecimal("150.00"))
                .currency("USD")
                .merchantId("mer_electronics")
                .ipAddress("198.51.100.99")
                .deviceFingerprint("fp_charlie_phone") // Shared with blocked user usr_1003
                .build();

        User user = User.builder()
                .id("usr_syndicate_member")
                .email("syndicate@example.com")
                .riskSegment("LOW")
                .build();

        Rule ruleConfig = Rule.builder()
                .id("RULE_07")
                .name("Syndicate Fraud Ring")
                .weight(75)
                .isActive(true)
                .build();

        EvaluationContext context = EvaluationContext.builder().build();
        RuleResult result = syndicateFraudRule.evaluate(request, user, null, ruleConfig, context);

        assertThat(result).isNotNull();
        assertThat(result.triggered()).isTrue();
        assertThat(result.scoreContribution()).isEqualTo(75);
        assertThat(result.reason()).contains("Syndicate Alert");
    }

    @Test
    @DisplayName("RULE_07: Does not trigger for clean isolated transaction")
    void testRule07PassesOnCleanTransaction() {
        TransactionRequest request = TransactionRequest.builder()
                .userId("usr_clean_isolated_user")
                .amount(new BigDecimal("40.00"))
                .currency("USD")
                .merchantId("mer_grocery")
                .ipAddress("198.51.100.120")
                .deviceFingerprint("fp_isolated_clean_device")
                .build();

        User user = User.builder()
                .id("usr_clean_isolated_user")
                .email("clean@example.com")
                .riskSegment("LOW")
                .build();

        Rule ruleConfig = Rule.builder()
                .id("RULE_07")
                .name("Syndicate Fraud Ring")
                .weight(75)
                .isActive(true)
                .build();

        EvaluationContext context = EvaluationContext.builder().build();
        RuleResult result = syndicateFraudRule.evaluate(request, user, null, ruleConfig, context);

        assertThat(result).isNotNull();
        assertThat(result.triggered()).isFalse();
        assertThat(result.scoreContribution()).isEqualTo(0);
    }
}
