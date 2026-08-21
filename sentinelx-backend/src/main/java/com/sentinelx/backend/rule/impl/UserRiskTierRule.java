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
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Strategy implementation for {@code RULE_06: User Risk Segment}.
 * 
 * <p>Evaluates customer historical risk tier (HIGH, CRITICAL) dynamically from
 * condition JSON parameters (e.g. {@code {"highWeight": 30, "criticalWeight": 60}}).</p>
 */
@Slf4j
@Component
public class UserRiskTierRule implements RiskRule {

    public static final String RULE_ID = "RULE_06";
    private final ObjectMapper objectMapper;

    public UserRiskTierRule(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public String getRuleId() {
        return RULE_ID;
    }

    @Override
    public RuleResult evaluate(TransactionRequest request, User user, Device device, Rule ruleConfig, EvaluationContext context) {
        if (user == null || user.getRiskSegment() == null) {
            return RuleResult.notTriggered(ruleConfig.getId(), ruleConfig.getName());
        }

        int defaultHigh = ruleConfig.getWeight() > 0 ? ruleConfig.getWeight() : 30;
        int defaultCritical = ruleConfig.getWeight() > 0 ? (int) Math.min(100, ruleConfig.getWeight() * 2L) : 60;
        int highWeight = defaultHigh;
        int criticalWeight = defaultCritical;

        if (ruleConfig.getConditionJson() != null && !ruleConfig.getConditionJson().isBlank()) {
            try {
                JsonNode root = objectMapper.readTree(ruleConfig.getConditionJson());
                if (root.has("highWeight")) {
                    highWeight = root.get("highWeight").asInt(defaultHigh);
                }
                if (root.has("criticalWeight")) {
                    criticalWeight = root.get("criticalWeight").asInt(defaultCritical);
                }
            } catch (Exception e) {
                log.warn("Failed to parse condition_json for rule {}: {}. Using fallback weights.", ruleConfig.getId(), e.getMessage());
            }
        }

        String segment = user.getRiskSegment().toUpperCase();
        if ("CRITICAL".equals(segment)) {
            return RuleResult.triggered(
                    ruleConfig.getId(),
                    ruleConfig.getName(),
                    criticalWeight,
                    String.format("%s: %s: User is in CRITICAL risk segment (+%d pts)",
                            ruleConfig.getId(), ruleConfig.getName(), criticalWeight)
            );
        } else if ("HIGH".equals(segment)) {
            return RuleResult.triggered(
                    ruleConfig.getId(),
                    ruleConfig.getName(),
                    highWeight,
                    String.format("%s: %s: User is in HIGH risk segment (+%d pts)",
                            ruleConfig.getId(), ruleConfig.getName(), highWeight)
            );
        }

        return RuleResult.notTriggered(ruleConfig.getId(), ruleConfig.getName());
    }
}
