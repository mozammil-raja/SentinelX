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
 * Strategy implementation for {@code RULE_04: Geolocation Hop}.
 * 
 * <p>Detects rapid IP address hopping within a short time window (default 1800 seconds / 30 minutes),
 * which is a strong indicator of VPN proxy switching or credential stuffing.</p>
 */
@Component
public class GeolocationHopRule implements RiskRule {

    public static final String RULE_ID = "RULE_04";
    private final ObjectMapper objectMapper = new ObjectMapper();

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
        } catch (Exception ignored) {
            // Fallback to default time window
        }

        List<Transaction> history = context.getRecentTransactions();

        if (history.isEmpty()) {
            return RuleResult.notTriggered(ruleConfig.getId(), ruleConfig.getName());
        }

        Transaction lastTxn = history.get(0);

        OffsetDateTime cutoff = OffsetDateTime.now().minusSeconds(timeWindowSeconds);
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
