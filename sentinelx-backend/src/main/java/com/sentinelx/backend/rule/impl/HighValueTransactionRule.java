package com.sentinelx.backend.rule.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.entity.Device;
import com.sentinelx.backend.entity.Rule;
import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.rule.EvaluationContext;
import com.sentinelx.backend.rule.RiskRule;
import com.sentinelx.backend.rule.RuleResult;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Strategy implementation for {@code RULE_03: High-Value Transaction}.
 * 
 * <p>Parses {@code condition_json} for {@code {"threshold": <amount>}} and penalizes transactions
 * exceeding the monetary threshold.</p>
 */
@Component
public class HighValueTransactionRule implements RiskRule {

    public static final String RULE_ID = "RULE_03";
    private static final BigDecimal DEFAULT_THRESHOLD = new BigDecimal("10000");
    private final ObjectMapper objectMapper;

    public HighValueTransactionRule(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    @Override
    public String getRuleId() {
        return RULE_ID;
    }

    @Override
    public RuleResult evaluate(TransactionRequest request, User user, Device device, Rule ruleConfig, EvaluationContext context) {
        BigDecimal threshold = DEFAULT_THRESHOLD;

        try {
            if (ruleConfig.getConditionJson() != null && !ruleConfig.getConditionJson().isBlank()) {
                JsonNode root = objectMapper.readTree(ruleConfig.getConditionJson());
                if (root.has("threshold")) {
                    threshold = new BigDecimal(root.get("threshold").asText());
                }
            }
        } catch (Exception ignored) {
            // Use default threshold if parsing fails
        }

        if (request.getAmount() != null && request.getAmount().compareTo(threshold) > 0) {
            return RuleResult.triggered(
                    ruleConfig.getId(),
                    ruleConfig.getName(),
                    ruleConfig.getWeight(),
                    String.format("%s: %s: Amount %s exceeds threshold %s (+%d pts)",
                            ruleConfig.getId(), ruleConfig.getName(), request.getAmount().toPlainString(), threshold.toPlainString(), ruleConfig.getWeight())
            );
        }

        return RuleResult.notTriggered(ruleConfig.getId(), ruleConfig.getName());
    }
}
