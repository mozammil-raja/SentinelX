package com.sentinelx.backend.service;

import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.entity.Device;
import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.rule.RuleResult;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * AI Risk Copilot Service.
 *
 * <p>Synthesizes multi-rule risk signals into natural-language analytical reasoning
 * and actionable recommendation tags for human compliance officers reviewing flagged transactions.</p>
 */
@Service
public class AiRiskCopilotService {

    /**
     * Synthesizes fired risk rules and customer profile into an executive summary and recommended action.
     *
     * @param request The incoming transaction request
     * @param user The user profile
     * @param device The device record (if present)
     * @param firedRules The list of rules triggered during evaluation
     * @param finalScore The aggregated risk score
     * @return Formatted AI reasoning summary string
     */
    public String synthesizeReviewAnalysis(TransactionRequest request,
                                           User user,
                                           Device device,
                                           List<RuleResult> firedRules,
                                           int finalScore) {
        if (firedRules == null || firedRules.isEmpty()) {
            return "Transaction flagged for review based on aggregate risk score (" + finalScore + "/100). No specific high-penalty rules fired.";
        }

        Set<String> ruleIds = firedRules.stream().map(RuleResult::ruleId).collect(Collectors.toSet());
        List<String> insights = new ArrayList<>();

        // Correlation 1: Velocity + New Device (Account Takeover / Credential Stuffing)
        if (ruleIds.contains("RULE_01") && ruleIds.contains("RULE_02")) {
            insights.add("⚠️ High velocity transaction burst originating from an unrecognized device hardware fingerprint. Classic signature of account takeover (ATO) or automated bot credential stuffing.");
        }

        // Correlation 2: Geo Hop + New Device (Proxy / Travel / Hijack)
        if (ruleIds.contains("RULE_04") && ruleIds.contains("RULE_02")) {
            insights.add("🌐 Rapid IP subnet transition detected concurrent with an untrusted device. Likely proxy/VPN tunneling or session hijacking.");
        }

        // Correlation 3: High Value + Elevated Risk Tier
        if (ruleIds.contains("RULE_03") && (ruleIds.contains("RULE_06") || "HIGH".equalsIgnoreCase(user.getRiskSegment()))) {
            insights.add(String.format("💰 High-value transfer ($%s) attempted by a customer in the '%s' risk tier. Deviates from baseline transaction volume.",
                    request.getAmount() != null ? request.getAmount().toPlainString() : "0.00", user.getRiskSegment()));
        }

        // Correlation 4: Blacklisted Merchant
        if (ruleIds.contains("RULE_05")) {
            insights.add(String.format("🚫 Merchant '%s' is identified on the high-risk/compliance watchlist.", request.getMerchantId()));
        }

        // Fallback individual rule summaries
        if (insights.isEmpty()) {
            for (RuleResult res : firedRules) {
                insights.add("• " + res.reason());
            }
        }

        StringBuilder sb = new StringBuilder();
        sb.append("AI Risk Copilot Analysis (Score: ").append(finalScore).append("/100):\n");
        for (String insight : insights) {
            sb.append(insight).append("\n");
        }

        // Recommendation
        sb.append("\nRecommended Action: ");
        if (ruleIds.contains("RULE_01") || ruleIds.contains("RULE_04")) {
            sb.append("Challenge customer with Step-Up 2FA / OTP verification before release.");
        } else if (request.getAmount() != null && request.getAmount().compareTo(BigDecimal.valueOf(5000)) > 0) {
            sb.append("Verify source of funds and validate authorization with cardholder.");
        } else {
            sb.append("Review historical transaction pattern and approve if consistent with user activity.");
        }

        return sb.toString();
    }
}
