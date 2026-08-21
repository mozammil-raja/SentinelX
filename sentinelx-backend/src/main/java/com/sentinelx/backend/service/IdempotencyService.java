package com.sentinelx.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sentinelx.backend.dto.DecisionResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

/**
 * Enterprise Idempotency Protection Service.
 *
 * <p>Prevents duplicate transaction processing and double-billing by caching
 * and returning historical {@link DecisionResponse} evaluations keyed on client-supplied
 * {@code Idempotency-Key} HTTP headers.</p>
 */
@Service
public class IdempotencyService {

    private static final Logger log = LoggerFactory.getLogger(IdempotencyService.class);
    private static final String IDEMPOTENCY_PREFIX = "sentinelx:idempotency:";
    private static final Duration DEFAULT_TTL = Duration.ofHours(24);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public IdempotencyService(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Attempts to retrieve a previously cached DecisionResponse for an Idempotency-Key.
     *
     * @param idempotencyKey Client-supplied unique transaction token
     * @return Optional containing the cached decision if found and parsed
     */
    public Optional<DecisionResponse> getCachedDecision(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return Optional.empty();
        }

        String key = IDEMPOTENCY_PREFIX + idempotencyKey.trim();
        try {
            String cachedJson = redisTemplate.opsForValue().get(key);
            if (cachedJson != null && !cachedJson.isBlank()) {
                DecisionResponse response = objectMapper.readValue(cachedJson, DecisionResponse.class);
                log.info("Idempotency HIT for key '{}': returning cached decision '{}'", idempotencyKey, response.getDecisionId());
                return Optional.of(response);
            }
        } catch (Exception e) {
            log.warn("Failed to check idempotency key in Redis for key '{}': {}. Proceeding with standard evaluation.", idempotencyKey, e.getMessage());
        }

        return Optional.empty();
    }

    /**
     * Persists the evaluated DecisionResponse in Redis associated with the Idempotency-Key.
     *
     * @param idempotencyKey Client-supplied unique transaction token
     * @param decision Evaluated decision response
     */
    public void cacheDecision(String idempotencyKey, DecisionResponse decision) {
        if (idempotencyKey == null || idempotencyKey.isBlank() || decision == null) {
            return;
        }

        String key = IDEMPOTENCY_PREFIX + idempotencyKey.trim();
        try {
            String json = objectMapper.writeValueAsString(decision);
            redisTemplate.opsForValue().set(key, json, DEFAULT_TTL);
            log.debug("Idempotency key cached successfully for key '{}'", idempotencyKey);
        } catch (Exception e) {
            log.warn("Failed to cache idempotency decision in Redis for key '{}': {}", idempotencyKey, e.getMessage());
        }
    }
}
