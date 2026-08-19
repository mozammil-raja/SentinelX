package com.sentinelx.backend.rule.impl;

import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.entity.Device;
import com.sentinelx.backend.entity.Rule;
import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.rule.EvaluationContext;
import com.sentinelx.backend.rule.RiskRule;
import com.sentinelx.backend.rule.RuleResult;
import org.springframework.stereotype.Component;

/**
 * Strategy implementation for {@code RULE_02: New Device}.
 * 
 * <p>Triggers a risk penalty if a transaction originates from an unrecognized device
 * fingerprint or an untrusted device profile.</p>
 */
@Component
public class NewDeviceRule implements RiskRule {

    public static final String RULE_ID = "RULE_02";

    @Override
    public String getRuleId() {
        return RULE_ID;
    }

    @Override
    public RuleResult evaluate(TransactionRequest request, User user, Device device, Rule ruleConfig, EvaluationContext context) {
        boolean isUntrustedOrNew = (device == null) || Boolean.FALSE.equals(device.getIsTrusted());

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
