package com.sentinelx.backend.rule;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * Aggregated risk assessment report produced by the {@link RuleEngine}.
 */
@Getter
@Builder
public class EvaluationReport {

    /**
     * Total accumulated risk score clamped between 0 and 100.
     */
    private final int finalScore;

    /**
     * Operational decision verdict: "ALLOW", "REVIEW", or "BLOCK".
     */
    private final String decision;

    /**
     * Detailed outcomes of all rules that triggered during evaluation.
     */
    private final List<RuleResult> firedRuleResults;

    /**
     * Formatted string list of explanations for all fired rules.
     */
    private final List<String> firedRuleExplanations;

    /**
     * Total evaluation duration in milliseconds.
     */
    private final int evaluationTimeMs;
}
