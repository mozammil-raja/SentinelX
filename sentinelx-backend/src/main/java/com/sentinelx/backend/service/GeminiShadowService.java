package com.sentinelx.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sentinelx.backend.dto.DecisionResponse;
import com.sentinelx.backend.dto.GeminiShadowResult;
import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.entity.Decision;
import com.sentinelx.backend.entity.Device;
import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.repository.DecisionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Asynchronous Google Gemini GenAI Shadow Scoring Service.
 *
 * <p>Dispatches non-blocking shadow fraud evaluations to Google Gemini API (or local resilient fallback)
 * to benchmark zero-shot contextual AI reasoning against deterministic rule engine verdicts.</p>
 */
@Service
public class GeminiShadowService {

    private static final Logger log = LoggerFactory.getLogger(GeminiShadowService.class);
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    private final DecisionRepository decisionRepository;
    private final DecisionStreamService decisionStreamService;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    @Value("${sentinelx.gemini.api-key:${GEMINI_API_KEY:}}")
    private String geminiApiKey;

    public GeminiShadowService(DecisionRepository decisionRepository,
                               DecisionStreamService decisionStreamService,
                               ObjectMapper objectMapper) {
        this.decisionRepository = decisionRepository;
        this.decisionStreamService = decisionStreamService;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    /**
     * Asynchronously evaluates a transaction using Gemini GenAI and updates the audit Decision entity.
     */
    @Async
    @Transactional
    public CompletableFuture<GeminiShadowResult> evaluateShadowAsync(String decisionId,
                                                                    TransactionRequest request,
                                                                    User user,
                                                                    Device device,
                                                                    List<String> firedRules,
                                                                    int ruleScore,
                                                                    String ruleDecision) {
        try {
            GeminiShadowResult result;

            if (geminiApiKey != null && !geminiApiKey.isBlank()) {
                result = invokeGeminiApi(request, user, device, firedRules, ruleScore);
            } else {
                result = evaluateLocalFallback(request, user, device, firedRules, ruleScore);
            }

            // Persist shadow result to PostgreSQL Decision record
            Decision decision = decisionRepository.findById(decisionId).orElse(null);
            if (decision != null) {
                decision.setGeminiScore(result.getGeminiScore());
                decision.setGeminiCategory(result.getRiskCategory());
                decision.setGeminiReasoning(result.getReasoning());
                decision.setGeminiVerdict(result.getGeminiVerdict());
                decision.setGeminiConfidence(result.getConfidence());
                decisionRepository.save(decision);

                // Broadcast live SSE shadow update
                if (decisionStreamService != null) {
                    DecisionResponse streamUpdate = DecisionResponse.builder()
                            .decisionId(decision.getId())
                            .transactionId(decision.getTransactionId())
                            .userId(user.getId())
                            .finalScore(decision.getFinalScore())
                            .decision(decision.getDecision())
                            .firedRules(firedRules)
                            .evaluationTimeMs(decision.getEvaluationTimeMs())
                            .geminiScore(result.getGeminiScore())
                            .geminiCategory(result.getRiskCategory())
                            .geminiReasoning(result.getReasoning())
                            .geminiVerdict(result.getGeminiVerdict())
                            .geminiConfidence(result.getConfidence())
                            .timestamp(OffsetDateTime.now(ZoneOffset.UTC))
                            .build();

                    decisionStreamService.broadcast(streamUpdate);
                }
            }

            return CompletableFuture.completedFuture(result);
        } catch (Exception e) {
            log.warn("Gemini shadow evaluation error for decision '{}': {}. Reverting to local fallback.", decisionId, e.getMessage());
            GeminiShadowResult fallback = evaluateLocalFallback(request, user, device, firedRules, ruleScore);
            return CompletableFuture.completedFuture(fallback);
        }
    }

    /**
     * Calls Google Gemini 1.5 Flash API with JSON response format.
     */
    public GeminiShadowResult invokeGeminiApi(TransactionRequest request,
                                             User user,
                                             Device device,
                                             List<String> firedRules,
                                             int ruleScore) {
        String prompt = buildPrompt(request, user, device, firedRules, ruleScore);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt)
                        ))
                ),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json"
                )
        );

        String url = GEMINI_API_URL + "?key=" + geminiApiKey.trim();

        String rawResponse = restClient.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(String.class);

        return parseGeminiResponse(rawResponse, request, user, firedRules, ruleScore);
    }

    /**
     * Parses the Google Gemini JSON response structure into a strongly-typed GeminiShadowResult.
     */
    public GeminiShadowResult parseGeminiResponse(String responseJson,
                                                 TransactionRequest request,
                                                 User user,
                                                 List<String> firedRules,
                                                 int ruleScore) {
        try {
            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode textNode = root.path("candidates").get(0).path("content").path("parts").get(0).path("text");
            if (textNode.isMissingNode()) {
                return evaluateLocalFallback(request, user, null, firedRules, ruleScore);
            }

            JsonNode payload = objectMapper.readTree(textNode.asText());
            int score = payload.path("geminiScore").asInt(ruleScore);
            String category = payload.path("riskCategory").asText("GENERAL_ASSESSMENT");
            String reasoning = payload.path("reasoning").asText("Gemini zero-shot anomaly analysis completed.");
            double confidence = payload.path("confidence").asDouble(0.90);

            String verdict = score >= 70 ? "BLOCK" : (score >= 30 ? "REVIEW" : "ALLOW");

            return GeminiShadowResult.builder()
                    .geminiScore(Math.min(100, Math.max(0, score)))
                    .riskCategory(category)
                    .reasoning(reasoning)
                    .confidence(confidence)
                    .geminiVerdict(verdict)
                    .build();
        } catch (Exception e) {
            log.warn("Failed to parse raw Gemini response: {}. Using fallback parser.", e.getMessage());
            return evaluateLocalFallback(request, user, null, firedRules, ruleScore);
        }
    }

    /**
     * Local semantic fallback evaluator when API key is not configured or network call is unavailable.
     */
    public GeminiShadowResult evaluateLocalFallback(TransactionRequest request,
                                                    User user,
                                                    Device device,
                                                    List<String> firedRules,
                                                    int ruleScore) {
        String category = "CLEAN";
        int shadowScore = ruleScore;
        double confidence = 0.92;
        StringBuilder reasoning = new StringBuilder();

        boolean hasBlacklist = firedRules != null && firedRules.stream().anyMatch(r -> r.contains("RULE_05") || r.toLowerCase().contains("blacklist"));
        boolean hasVelocity = firedRules != null && firedRules.stream().anyMatch(r -> r.contains("RULE_01") || r.toLowerCase().contains("velocity"));
        boolean hasGeo = firedRules != null && firedRules.stream().anyMatch(r -> r.contains("RULE_04") || r.toLowerCase().contains("ip"));
        boolean hasNewDevice = firedRules != null && firedRules.stream().anyMatch(r -> r.contains("RULE_02") || r.toLowerCase().contains("device"));

        if (hasBlacklist) {
            category = "SANCTIONED_MERCHANT";
            shadowScore = Math.max(85, ruleScore);
            confidence = 0.98;
            reasoning.append("Critical risk: Transaction routed to high-risk watchlisted merchant '").append(request.getMerchantId()).append("'.");
        } else if (hasVelocity && hasNewDevice) {
            category = "ACCOUNT_TAKEOVER";
            shadowScore = Math.max(75, ruleScore + 10);
            confidence = 0.94;
            reasoning.append("High probability ATO: Rapid transaction frequency combined with an unrecognized hardware fingerprint.");
        } else if (hasGeo && hasNewDevice) {
            category = "GEO_MISMATCH";
            shadowScore = Math.max(65, ruleScore);
            confidence = 0.91;
            reasoning.append("Anomalous connection: Rapid geographic IP hop coinciding with untrusted client hardware.");
        } else if (request.getAmount() != null && request.getAmount().compareTo(BigDecimal.valueOf(10000)) >= 0) {
            category = "HIGH_VALUE_ANOMALY";
            shadowScore = Math.max(55, ruleScore);
            confidence = 0.89;
            reasoning.append("Spend deviation: High-value transaction ($").append(request.getAmount()).append(") deviates significantly from baseline.");
        } else if (ruleScore > 0) {
            category = "ELEVATED_RISK";
            shadowScore = ruleScore;
            confidence = 0.88;
            reasoning.append("Moderate risk heuristics triggered (Score: ").append(ruleScore).append("/100).");
        } else {
            category = "CLEAN";
            shadowScore = 0;
            confidence = 0.96;
            reasoning.append("Standard legitimate transaction profile with consistent device and IP characteristics.");
        }

        String verdict = shadowScore >= 70 ? "BLOCK" : (shadowScore >= 30 ? "REVIEW" : "ALLOW");

        return GeminiShadowResult.builder()
                .geminiScore(Math.min(100, Math.max(0, shadowScore)))
                .riskCategory(category)
                .reasoning(reasoning.toString())
                .confidence(confidence)
                .geminiVerdict(verdict)
                .build();
    }

    private String buildPrompt(TransactionRequest request,
                               User user,
                               Device device,
                               List<String> firedRules,
                               int ruleScore) {
        return """
                You are the AI Risk Engine for SentinelX Financial Security.
                Analyze the following payment transaction context and return a strict JSON assessment:
                {
                  "geminiScore": <integer 0-100>,
                  "riskCategory": <"CLEAN"|"SUSPICIOUS_VELOCITY"|"ACCOUNT_TAKEOVER"|"GEO_MISMATCH"|"HIGH_VALUE_ANOMALY"|"SANCTIONED_MERCHANT">,
                  "reasoning": <concise 1-2 sentence risk justification>,
                  "confidence": <float 0.0-1.0>
                }
                
                Transaction Context:
                - User ID: %s (Risk Segment: %s)
                - Amount: %s %s
                - Merchant: %s
                - IP Address: %s
                - Device Fingerprint: %s (Trusted: %s)
                - Triggered Rules: %s
                - Deterministic Rule Score: %d/100
                """.formatted(
                user != null ? user.getId() : request.getUserId(),
                user != null ? user.getRiskSegment() : "MEDIUM",
                request.getAmount() != null ? request.getAmount() : "0.00",
                request.getCurrency() != null ? request.getCurrency() : "USD",
                request.getMerchantId(),
                request.getIpAddress(),
                request.getDeviceFingerprint(),
                device != null ? device.getIsTrusted() : false,
                firedRules != null ? firedRules.toString() : "[]",
                ruleScore
        );
    }
}
