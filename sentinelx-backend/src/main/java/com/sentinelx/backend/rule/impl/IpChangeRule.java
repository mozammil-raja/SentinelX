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
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/**
 * Strategy implementation for {@code RULE_04: Rapid IP Change}.
 * 
 * <p>Detects rapid IP address changes within a configurable time window (default 1800 seconds / 30 minutes),
 * indicating potential VPN proxy hopping, account takeover, or session hijacking.</p>
 */
@Slf4j
@Component
public class IpChangeRule implements RiskRule {

    public static final String RULE_ID = "RULE_04";
    private final ObjectMapper objectMapper;

    public IpChangeRule(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public String getRuleId() {
        return RULE_ID;
    }

    @Override
    public RuleResult evaluate(TransactionRequest request, User user, Device device, Rule ruleConfig, EvaluationContext context) {
        int timeWindowSeconds = 1800;

        try {
            if (ruleConfig.getConditionJson() != null && !ruleConfig.getConditionJson().isBlank()) {
                JsonNode root = objectMapper.readTree(ruleConfig.getConditionJson());
                if (root.has("timeWindow")) {
                    timeWindowSeconds = root.get("timeWindow").asInt(1800);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse condition_json for rule {}: {}. Using default window {}s.", ruleConfig.getId(), e.getMessage(), timeWindowSeconds);
        }

        Transaction lastTxn = (context != null && context.getLastTransaction() != null)
                ? context.getLastTransaction()
                : ((context != null && !context.getRecentTransactions().isEmpty()) ? context.getRecentTransactions().get(0) : null);

        if (lastTxn == null) {
            return RuleResult.notTriggered(ruleConfig.getId(), ruleConfig.getName());
        }

        OffsetDateTime cutoff = OffsetDateTime.now(ZoneOffset.UTC).minusSeconds(timeWindowSeconds);
        boolean withinWindow = lastTxn.getTimestamp() != null
                && lastTxn.getTimestamp().isAfter(cutoff);

        if (withinWindow
                && lastTxn.getIpAddress() != null
                && !lastTxn.getIpAddress().equals(request.getIpAddress())) {
            return RuleResult.triggered(
                    ruleConfig.getId(),
                    ruleConfig.getName(),
                    ruleConfig.getWeight(),
                    String.format("%s: %s: IP changed from %s to %s within %d seconds (+%d pts)",
                            ruleConfig.getId(), ruleConfig.getName(), lastTxn.getIpAddress(), request.getIpAddress(), timeWindowSeconds, ruleConfig.getWeight())
            );
        }

        return RuleResult.notTriggered(ruleConfig.getId(), ruleConfig.getName());
    }
}
