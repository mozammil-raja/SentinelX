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

import java.math.BigDecimal;

/**
 * Strategy implementation for {@code RULE_03: High-Value Transaction}.
 * 
 * <p>Parses {@code condition_json} for {@code {"threshold": <amount>}} and penalizes transactions
 * exceeding the configured monetary threshold (default $10,000).</p>
 */
@Slf4j
@Component
public class HighValueTransactionRule implements RiskRule {

    public static final String RULE_ID = "RULE_03";
    private static final BigDecimal DEFAULT_THRESHOLD = new BigDecimal("10000");
    private final ObjectMapper objectMapper;

    public HighValueTransactionRule(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public String getRuleId() {
        return RULE_ID;
    }

    private static final java.util.Map<String, BigDecimal> USD_EXCHANGE_RATES = java.util.Map.of(
            "USD", BigDecimal.ONE,
            "EUR", new BigDecimal("1.08"),
            "GBP", new BigDecimal("1.27"),
            "INR", new BigDecimal("0.012")
    );

    @Override
    public RuleResult evaluate(TransactionRequest request, User user, Device device, Rule ruleConfig, EvaluationContext context) {
        BigDecimal thresholdUsd = DEFAULT_THRESHOLD;

        try {
            if (ruleConfig.getConditionJson() != null && !ruleConfig.getConditionJson().isBlank()) {
                JsonNode root = objectMapper.readTree(ruleConfig.getConditionJson());
                if (root.has("threshold")) {
                    thresholdUsd = new BigDecimal(root.get("threshold").asText());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse condition_json for rule {}: {}. Using default threshold {}.", ruleConfig.getId(), e.getMessage(), thresholdUsd);
        }

        if (request.getAmount() == null) {
            return RuleResult.notTriggered(ruleConfig.getId(), ruleConfig.getName());
        }

        String currency = (request.getCurrency() != null && !request.getCurrency().isBlank()) 
                ? request.getCurrency().toUpperCase() 
                : "USD";

        BigDecimal rate = USD_EXCHANGE_RATES.getOrDefault(currency, BigDecimal.ONE);
        BigDecimal amountInUsd = request.getAmount().multiply(rate);

        // 1. Check User Behavioral Baseline Spend Deviation
        if (user != null && user.getTypicalSpendMax() != null && user.getTypicalSpendMax().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal baselineLimit = user.getTypicalSpendMax().multiply(BigDecimal.valueOf(2.5));
            if (request.getAmount().compareTo(baselineLimit) > 0) {
                String explanation = String.format("%s: %s: Transaction amount %s %s significantly deviates from customer's typical spend baseline (%s–%s %s) (+%d pts)",
                        ruleConfig.getId(),
                        ruleConfig.getName(),
                        request.getAmount().toPlainString(),
                        currency,
                        user.getTypicalSpendMin() != null ? user.getTypicalSpendMin().toPlainString() : "0",
                        user.getTypicalSpendMax().toPlainString(),
                        currency,
                        ruleConfig.getWeight());

                return RuleResult.triggered(
                        ruleConfig.getId(),
                        ruleConfig.getName(),
                        ruleConfig.getWeight(),
                        explanation
                );
            }
        }

        // 2. Check Global High-Value USD Threshold
        if (amountInUsd.compareTo(thresholdUsd) > 0) {
            String explanation = "USD".equals(currency)
                    ? String.format("%s: %s: Amount %s USD exceeds threshold %s USD (+%d pts)",
                            ruleConfig.getId(), ruleConfig.getName(), request.getAmount().toPlainString(),
                            thresholdUsd.toPlainString(), ruleConfig.getWeight())
                    : String.format("%s: %s: Amount %s %s (~$%s USD) exceeds threshold %s USD (+%d pts)",
                            ruleConfig.getId(), ruleConfig.getName(), request.getAmount().toPlainString(),
                            currency, amountInUsd.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString(),
                            thresholdUsd.toPlainString(), ruleConfig.getWeight());

            return RuleResult.triggered(
                    ruleConfig.getId(),
                    ruleConfig.getName(),
                    ruleConfig.getWeight(),
                    explanation
            );
        }

        return RuleResult.notTriggered(ruleConfig.getId(), ruleConfig.getName());
    }
}
