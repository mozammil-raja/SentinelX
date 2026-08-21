package com.sentinelx.backend.dto;

import lombok.*;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Synchronous fraud risk response returned by {@code POST /api/v1/transactions}.
 * 
 * <p>Contains the calculated risk score, conclusive decision (ALLOW, REVIEW, BLOCK),
 * triggered rule explanations, and execution latency.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DecisionResponse {

    /**
     * Unique decision audit identifier (e.g. "dec_1708362000000").
     */
    private String decisionId;

    /**
     * Identifier of the evaluated transaction (e.g. "txn_...").
     */
    private String transactionId;

    /**
     * Account identifier of the user who initiated the transaction.
     */
    private String userId;

    /**
     * Conclusive risk score between 0 (safe) and 100 (critical fraud).
     */
    private Integer finalScore;

    /**
     * Conclusive operational verdict:
     * <ul>
     *   <li><b>ALLOW</b>: Low risk (score &lt; 30) — transaction approved immediately.</li>
     *   <li><b>REVIEW</b>: Suspicious (30 &le; score &lt; 70) — held for manual analyst inspection.</li>
     *   <li><b>BLOCK</b>: High risk (score &ge; 70) — transaction blocked immediately.</li>
     * </ul>
     */
    private String decision;

    /**
     * List of human-readable rule names or IDs that fired during evaluation.
     */
    private List<String> firedRules;

    /**
     * Evaluation latency in milliseconds.
     */
    private Integer evaluationTimeMs;

    /**
     * Optional Asynchronous Google Gemini GenAI shadow score.
     */
    private Integer geminiScore;

    /**
     * Gemini risk category tag.
     */
    private String geminiCategory;

    /**
     * Gemini natural-language reasoning summary.
     */
    private String geminiReasoning;

    /**
     * Gemini recommended verdict (ALLOW, REVIEW, BLOCK).
     */
    private String geminiVerdict;

    /**
     * Gemini confidence rating (0.0 to 1.0).
     */
    private Double geminiConfidence;

    /**
     * ISO-8601 UTC timestamp when the decision was generated.
     */
    private OffsetDateTime timestamp;
}
