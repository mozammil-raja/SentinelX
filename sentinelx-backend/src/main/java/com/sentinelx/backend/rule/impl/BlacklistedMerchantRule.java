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

import java.util.ArrayList;
import java.util.List;

/**
 * Strategy implementation for {@code RULE_05: Blacklisted Merchant}.
 * 
 * <p>Parses {@code condition_json} for a list of flagged high-risk merchant IDs
 * (e.g. {@code {"merchants": ["mer_black_1", "mer_black_2"]}}) and penalizes matching transactions.</p>
 */
@Slf4j
@Component
public class BlacklistedMerchantRule implements RiskRule {

    public static final String RULE_ID = "RULE_05";
    private static final List<String> DEFAULT_MERCHANTS = List.of("mer_black_1", "mer_black_2");
    private final ObjectMapper objectMapper;

    public BlacklistedMerchantRule(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public String getRuleId() {
        return RULE_ID;
    }

    @Override
    public RuleResult evaluate(TransactionRequest request, User user, Device device, Rule ruleConfig, EvaluationContext context) {
        List<String> blacklistedMerchants = new ArrayList<>();

        if (ruleConfig.getConditionJson() != null && !ruleConfig.getConditionJson().isBlank()) {
            try {
                JsonNode root = objectMapper.readTree(ruleConfig.getConditionJson());
                if (root.has("merchants") && root.get("merchants").isArray()) {
                    for (JsonNode node : root.get("merchants")) {
                        blacklistedMerchants.add(node.asText());
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to parse condition_json for rule {}: {}. Falling back to default baseline merchants.", ruleConfig.getId(), e.getMessage());
                blacklistedMerchants.addAll(DEFAULT_MERCHANTS);
            }
        } else {
            blacklistedMerchants.addAll(DEFAULT_MERCHANTS);
        }

        if (request.getMerchantId() != null && blacklistedMerchants.contains(request.getMerchantId())) {
            return RuleResult.triggered(
                    ruleConfig.getId(),
                    ruleConfig.getName(),
                    ruleConfig.getWeight(),
                    String.format("%s: %s: Merchant %s is flagged as high-risk/blacklisted (+%d pts)",
                            ruleConfig.getId(), ruleConfig.getName(), request.getMerchantId(), ruleConfig.getWeight())
            );
        }

        return RuleResult.notTriggered(ruleConfig.getId(), ruleConfig.getName());
    }
}
