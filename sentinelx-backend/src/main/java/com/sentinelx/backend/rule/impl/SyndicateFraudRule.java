package com.sentinelx.backend.rule.impl;

import com.sentinelx.backend.dto.SyndicateDetectionResult;
import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.entity.Device;
import com.sentinelx.backend.entity.Rule;
import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.rule.EvaluationContext;
import com.sentinelx.backend.rule.RiskRule;
import com.sentinelx.backend.rule.RuleResult;
import com.sentinelx.backend.service.GraphSyndicateService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Strategy implementation for {@code RULE_07: Syndicate Fraud Ring / Shared Infrastructure}.
 * 
 * <p>Leverages the {@link GraphSyndicateService} to traverse multi-hop graph associations.
 * If the transacting user shares hardware devices, proxy IPs, or payment cards with known
 * blocked fraudsters, a heavy risk penalty is contributed.</p>
 */
@Slf4j
@Component
public class SyndicateFraudRule implements RiskRule {

    public static final String RULE_ID = "RULE_07";

    private final GraphSyndicateService graphSyndicateService;

    public SyndicateFraudRule(GraphSyndicateService graphSyndicateService) {
        this.graphSyndicateService = graphSyndicateService;
    }

    @Override
    public String getRuleId() {
        return RULE_ID;
    }

    @Override
    public RuleResult evaluate(TransactionRequest request, User user, Device device, Rule ruleConfig, EvaluationContext context) {
        // 1. Check graph syndicate connection
        SyndicateDetectionResult result = graphSyndicateService.detectSyndicate(
                request.getUserId(),
                request.getDeviceFingerprint(),
                request.getIpAddress(),
                request.getCardBin()
        );

        // 2. Record this observed connection in the live graph
        graphSyndicateService.recordConnection(
                request.getUserId(),
                request.getDeviceFingerprint(),
                request.getIpAddress(),
                request.getCardBin(),
                false
        );

        if (result.isSyndicateDetected()) {
            return RuleResult.triggered(
                    ruleConfig.getId(),
                    ruleConfig.getName(),
                    ruleConfig.getWeight(),
                    String.format("%s: %s: %s (+%d pts)",
                            ruleConfig.getId(), ruleConfig.getName(), result.getExplanation(), ruleConfig.getWeight())
            );
        }

        return RuleResult.notTriggered(ruleConfig.getId(), ruleConfig.getName());
    }
}
