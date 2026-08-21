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
 * Strategy implementation for {@code RULE_02: New Device}.
 * 
 * <p>Triggers a risk penalty if a transaction originates from an unrecognized device
 * fingerprint or an untrusted device profile.</p>
 */
@Slf4j
@Component
public class NewDeviceRule implements RiskRule {

    public static final String RULE_ID = "RULE_02";
    private final ObjectMapper objectMapper;

    public NewDeviceRule(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public String getRuleId() {
        return RULE_ID;
    }

    @Override
    public RuleResult evaluate(TransactionRequest request, User user, Device device, Rule ruleConfig, EvaluationContext context) {
        boolean trustedOnly = true;

        if (ruleConfig.getConditionJson() != null && !ruleConfig.getConditionJson().isBlank()) {
            try {
                JsonNode root = objectMapper.readTree(ruleConfig.getConditionJson());
                if (root.has("trustedOnly")) {
                    trustedOnly = root.get("trustedOnly").asBoolean(true);
                }
            } catch (Exception e) {
                log.debug("Using default trustedOnly=true for rule {}", ruleConfig.getId());
            }
        }

        boolean isUntrustedOrNew = (device == null) || (trustedOnly && Boolean.FALSE.equals(device.getIsTrusted()));

        if (isUntrustedOrNew) {
            return RuleResult.triggered(
                    ruleConfig.getId(),
                    ruleConfig.getName(),
                    ruleConfig.getWeight(),
                    String.format("%s: %s: Unrecognized or untrusted device fingerprint (+%d pts)",
                            ruleConfig.getId(), ruleConfig.getName(), ruleConfig.getWeight())
            );
        }

        return RuleResult.notTriggered(ruleConfig.getId(), ruleConfig.getName());
    }
}
