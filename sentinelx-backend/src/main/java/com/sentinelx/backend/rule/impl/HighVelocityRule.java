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
import com.sentinelx.backend.service.VelocityService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Strategy implementation for {@code RULE_01: High Velocity (5m)}.
 * 
 * <p>Detects rapid bursts of transactions from a single customer within a sliding time window.
 * Leverages Redis Sorted Sets (ZSET) via {@link VelocityService} for low-latency
 * in-memory evaluation, with automatic fallback to PostgreSQL transaction history inside VelocityService.</p>
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
     * @param velocityService Redis velocity tracking service with database fallback
     */
    public HighVelocityRule(ObjectMapper objectMapper, VelocityService velocityService) {
        this.objectMapper = objectMapper;
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
        } catch (Exception e) {
            log.warn("Failed to parse condition_json for rule {}: {}. Using defaults window={}s, limit={}.", ruleConfig.getId(), e.getMessage(), windowSeconds, limit);
        }

        // Delegate retrieval to VelocityService (handles Redis with transparent PostgreSQL fallback)
        int count = velocityService.getUserVelocity(user.getId(), windowSeconds);

        // Evaluate Threshold Breach
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
