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
import com.sentinelx.backend.service.VelocityService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Strategy implementation for {@code RULE_01: High Velocity (5m)}.
 * 
 * <p>Detects rapid bursts of transactions from a single customer within a sliding time window.
 * Leverages Redis Sorted Sets (ZSET) via {@link VelocityService} for sub-millisecond O(log N)
 * in-memory evaluation, with automatic fallback to PostgreSQL transaction history.</p>
 */
@Slf4j
@Component
public class HighVelocityRule implements RiskRule {

    public static final String RULE_ID = "RULE_01";
    private final ObjectMapper objectMapper;
    private final VelocityService velocityService;

    /**
     * Constructs the HighVelocityRule with ObjectMapper and VelocityService dependencies.
     *
     * @param objectMapper Spring-managed JSON object mapper
     * @param velocityService In-memory Redis velocity tracking service
     */
    public HighVelocityRule(ObjectMapper objectMapper, VelocityService velocityService) {
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.velocityService = velocityService;
    }

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
            // Fallback to default parameters
        }

        long count = -1;

        // 1. In-Memory Acceleration: Query Redis Sliding Window ZSET
        if (velocityService != null && velocityService.isAvailable()) {
            int redisCount = velocityService.getUserVelocity(user.getId(), windowSeconds);
            if (redisCount >= 0) {
                count = redisCount;
            }
        }

        // 2. High-Availability Fallback: Scan PostgreSQL history if Redis is unavailable or unpopulated
        if (count < 0) {
            java.time.OffsetDateTime cutoff = java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC).minusSeconds(windowSeconds);
            List<Transaction> history = (context != null && context.getRecentTransactions() != null)
                    ? context.getRecentTransactions()
                    : List.of();
            count = history.stream()
                    .filter(t -> t.getTimestamp() != null && t.getTimestamp().isAfter(cutoff))
                    .count();
        }

        // 3. Evaluate Threshold Breach
        if (count >= limit) {
            return RuleResult.triggered(
                    ruleConfig.getId(),
                    ruleConfig.getName(),
                    ruleConfig.getWeight(),
                    String.format("%s: %s: %d transactions in %d seconds exceeds limit of %d (+%d pts)",
                            ruleConfig.getId(), ruleConfig.getName(), count, windowSeconds, limit, ruleConfig.getWeight())
            );
        }

        return RuleResult.notTriggered(ruleConfig.getId(), ruleConfig.getName());
    }
}

