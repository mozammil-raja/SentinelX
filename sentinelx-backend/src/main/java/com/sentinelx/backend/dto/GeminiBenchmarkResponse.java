package com.sentinelx.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Analytical comparative benchmark report measuring agreement between the deterministic Rule Engine and the Gemini AI Shadow Router.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GeminiBenchmarkResponse {

    private int totalEvaluated;
    private double agreementRatePercentage;
    private double averageRuleScore;
    private double averageGeminiScore;
    private double averageScoreVariance;

    private Map<String, Integer> ruleVerdictBreakdown;
    private Map<String, Integer> geminiVerdictBreakdown;
    private Map<String, Integer> categoryDistribution;
}
