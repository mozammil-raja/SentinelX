package com.sentinelx.backend.rule.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.entity.Device;
import com.sentinelx.backend.entity.Rule;
import com.sentinelx.backend.entity.Transaction;
import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.rule.EvaluationContext;
import com.sentinelx.backend.rule.RiskRule;
import com.sentinelx.backend.rule.RuleResult;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Strategy implementation for {@code RULE_01: High Velocity (5m)}.
 * 
 * <p>Detects rapid bursts of transactions from a single user within a configurable time window.
 * Parses {@code condition_json} for {@code {"window": <seconds>, "limit": <count>}}.</p>
 */
@Component
public class HighVelocityRule implements RiskRule {

    public static final String RULE_ID = "RULE_01";
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String getRuleId() {
        return RULE_ID;
    }

    @Override
    public RuleResult evaluate(TransactionRequest request, User user, Device device, Rule ruleConfig, EvaluationContext context) {
        int windowSeconds = 300;
        int limit = 5;

        try {
            if (ruleConfig.getConditionJson() != null && !ruleConfig.getConditionJson().isBlank()) {
                JsonNode root = objectMapper.readTree(ruleConfig.getConditionJson());
                if (root.has("window")) {
                    windowSeconds = root.get("window").asInt(300);
                }
                if (root.has("limit")) {
                    limit = root.get("limit").asInt(5);
                }
            }
        } catch (Exception ignored) {
            // Fallback to default thresholds if JSON parsing encounters issues
        }

        OffsetDateTime cutoff = OffsetDateTime.now().minusSeconds(windowSeconds);
        List<Transaction> history = context.getRecentTransactions();
        long recentCount = history.stream()
                .filter(t -> t.getTimestamp() != null && t.getTimestamp().isAfter(cutoff))
                .count();

        if (recentCount >= limit) {
            return RuleResult.triggered(
                    ruleConfig.getId(),
                    ruleConfig.getName(),
                    ruleConfig.getWeight(),
                    String.format("%s: %s: %d transactions in %d seconds (limit: %d) (+%d pts)",
                            ruleConfig.getId(), ruleConfig.getName(), recentCount, windowSeconds, limit, ruleConfig.getWeight())
            );
        }

        return RuleResult.notTriggered(ruleConfig.getId(), ruleConfig.getName());
    }
}
