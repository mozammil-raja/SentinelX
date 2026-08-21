package com.sentinelx.backend.controller;

import com.sentinelx.backend.dto.GeminiBenchmarkResponse;
import com.sentinelx.backend.entity.Decision;
import com.sentinelx.backend.repository.DecisionRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * REST controller for inspecting Google Gemini GenAI shadow scoring telemetry and benchmark metrics.
 */
@RestController
@RequestMapping("/api/v1/decisions")
public class GeminiShadowController {

    private final DecisionRepository decisionRepository;

    public GeminiShadowController(DecisionRepository decisionRepository) {
        this.decisionRepository = decisionRepository;
    }

    /**
     * Calculates comparative benchmark metrics between the deterministic Rule Engine and Gemini AI Shadow predictions.
     */
    @GetMapping("/gemini-benchmark")
    public ResponseEntity<GeminiBenchmarkResponse> getGeminiBenchmarkMetrics() {
        List<Decision> decisions = decisionRepository.findAll(
                PageRequest.of(0, 500, Sort.by(Sort.Direction.DESC, "createdAt"))
        ).getContent();

        int total = 0;
        int agreements = 0;
        long totalRuleScore = 0;
        long totalGeminiScore = 0;
        long totalVariance = 0;

        Map<String, Integer> ruleVerdicts = new LinkedHashMap<>(Map.of("ALLOW", 0, "REVIEW", 0, "BLOCK", 0));
        Map<String, Integer> geminiVerdicts = new LinkedHashMap<>(Map.of("ALLOW", 0, "REVIEW", 0, "BLOCK", 0));
        Map<String, Integer> categories = new LinkedHashMap<>();

        for (Decision d : decisions) {
            if (d.getGeminiScore() != null) {
                total++;
                totalRuleScore += d.getFinalScore();
                totalGeminiScore += d.getGeminiScore();
                totalVariance += Math.abs(d.getFinalScore() - d.getGeminiScore());

                String ruleV = d.getDecision();
                String geminiV = d.getGeminiVerdict() != null ? d.getGeminiVerdict() : (d.getGeminiScore() >= 70 ? "BLOCK" : (d.getGeminiScore() >= 30 ? "REVIEW" : "ALLOW"));

                ruleVerdicts.put(ruleV, ruleVerdicts.getOrDefault(ruleV, 0) + 1);
                geminiVerdicts.put(geminiV, geminiVerdicts.getOrDefault(geminiV, 0) + 1);

                if (ruleV.equalsIgnoreCase(geminiV)) {
                    agreements++;
                }

                String category = d.getGeminiCategory() != null ? d.getGeminiCategory() : "GENERAL_ASSESSMENT";
                categories.put(category, categories.getOrDefault(category, 0) + 1);
            }
        }

        double agreementRate = total > 0 ? roundDouble((double) agreements * 100 / total) : 100.0;
        double avgRule = total > 0 ? roundDouble((double) totalRuleScore / total) : 0.0;
        double avgGemini = total > 0 ? roundDouble((double) totalGeminiScore / total) : 0.0;
        double avgVar = total > 0 ? roundDouble((double) totalVariance / total) : 0.0;

        GeminiBenchmarkResponse response = GeminiBenchmarkResponse.builder()
                .totalEvaluated(total)
                .agreementRatePercentage(agreementRate)
                .averageRuleScore(avgRule)
                .averageGeminiScore(avgGemini)
                .averageScoreVariance(avgVar)
                .ruleVerdictBreakdown(ruleVerdicts)
                .geminiVerdictBreakdown(geminiVerdicts)
                .categoryDistribution(categories)
                .build();

        return ResponseEntity.ok(response);
    }

    private double roundDouble(double val) {
        return BigDecimal.valueOf(val).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
