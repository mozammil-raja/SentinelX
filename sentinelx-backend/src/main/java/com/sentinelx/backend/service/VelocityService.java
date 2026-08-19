package com.sentinelx.backend.service;

import com.sentinelx.backend.dto.TransactionRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Set;

/**
 * Service providing high-throughput, sub-millisecond in-memory velocity tracking
 * using Redis Sorted Sets (ZSET) and atomic Lua scripts.
 *
 * <p>Employs the <b>Sliding Window Log</b> pattern to provide exact transaction count
 * and volume calculations over sliding time windows (e.g. 60s, 300s, 3600s), evicting
 * stale entries automatically with O(log N) efficiency.</p>
 */
@Slf4j
@Service
public class VelocityService {

    public static final String KEY_PREFIX_USER = "sentinelx:velocity:user:";
    public static final String KEY_PREFIX_DEVICE = "sentinelx:velocity:device:";
    public static final String KEY_PREFIX_IP = "sentinelx:velocity:ip:";
    public static final String KEY_PREFIX_CARD = "sentinelx:velocity:card:";
    public static final String KEY_PREFIX_MERCHANT = "sentinelx:velocity:merchant:";
    public static final String KEY_PREFIX_VOLUME_USER = "sentinelx:velocity:volume:user:";

    private final StringRedisTemplate redisTemplate;
    private final RedisScript<Long> slidingWindowRecordScript;
    private final RedisScript<Long> slidingWindowQueryScript;
    private final com.sentinelx.backend.repository.TransactionRepository transactionRepository;

    /**
     * Constructs the VelocityService with Redis template, pre-compiled Lua scripts, and database fallback repository.
     *
     * @param redisTemplate Spring StringRedisTemplate
     * @param slidingWindowRecordScript Atomic Lua script for recording and sliding count
     * @param slidingWindowQueryScript Atomic Lua script for querying sliding count
     * @param transactionRepository JPA Transaction repository for fallback calculations
     */
    public VelocityService(
            StringRedisTemplate redisTemplate,
            RedisScript<Long> slidingWindowRecordScript,
            RedisScript<Long> slidingWindowQueryScript,
            com.sentinelx.backend.repository.TransactionRepository transactionRepository) {
        this.redisTemplate = redisTemplate;
        this.slidingWindowRecordScript = slidingWindowRecordScript;
        this.slidingWindowQueryScript = slidingWindowQueryScript;
        this.transactionRepository = transactionRepository;
    }

    /**
     * Checks whether the Redis cluster or standalone node is responsive.
     *
     * @return true if Redis is online and responsive, false otherwise
     */
    public boolean isAvailable() {
        try {
            if (redisTemplate.getConnectionFactory() == null) {
                return false;
            }
            String ping = redisTemplate.getConnectionFactory().getConnection().ping();
            return "PONG".equalsIgnoreCase(ping);
        } catch (Exception e) {
            log.debug("Redis is currently unavailable: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Atomically records a transaction for a user and calculates the updated transaction velocity
     * count within the specified sliding time window using Redis ZSETs.
     *
     * @param userId Unique customer/user identifier
     * @param txnId Unique transaction identifier
     * @param windowSeconds Sliding time window in seconds (e.g. 300 for 5 minutes)
     * @return Number of transactions in the sliding window, or -1 if Redis is unavailable
     */
    public int recordAndGetUserVelocity(String userId, String txnId, int windowSeconds) {
        String key = KEY_PREFIX_USER + userId;
        return executeRecordScript(key, txnId, windowSeconds);
    }

    /**
     * Queries the current transaction count for a user in the sliding window without recording a new event.
     * Falls back automatically to PostgreSQL if Redis is unavailable.
     *
     * @param userId Unique customer identifier
     * @param windowSeconds Sliding time window in seconds
     * @return Active transaction count in the window
     */
    public int getUserVelocity(String userId, int windowSeconds) {
        if (!isAvailable()) {
            if (transactionRepository != null && userId != null) {
                java.time.OffsetDateTime cutoff = java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC).minusSeconds(windowSeconds);
                List<com.sentinelx.backend.entity.Transaction> txns = transactionRepository.findRecentByUserIdSince(userId, cutoff);
                return txns.size();
            }
            return 0;
        }
        String key = KEY_PREFIX_USER + userId;
        return executeQueryScript(key, windowSeconds);
    }

    /**
     * Atomically records a transaction for a device fingerprint and returns the active count in window.
     *
     * @param fingerprint SHA-256 device fingerprint
     * @param txnId Unique transaction identifier
     * @param windowSeconds Sliding time window in seconds
     * @return Active transaction count for the device, or -1 if Redis is unavailable
     */
    public int recordAndGetDeviceVelocity(String fingerprint, String txnId, int windowSeconds) {
        if (fingerprint == null || fingerprint.isBlank()) {
            return 0;
        }
        String key = KEY_PREFIX_DEVICE + fingerprint;
        return executeRecordScript(key, txnId, windowSeconds);
    }

    /**
     * Queries the current transaction count for a device fingerprint in the sliding window.
     *
     * @param fingerprint Device fingerprint
     * @param windowSeconds Sliding time window in seconds
     * @return Active count in window, or -1 if Redis is unavailable
     */
    public int getDeviceVelocity(String fingerprint, int windowSeconds) {
        if (fingerprint == null || fingerprint.isBlank()) {
            return 0;
        }
        String key = KEY_PREFIX_DEVICE + fingerprint;
        return executeQueryScript(key, windowSeconds);
    }

    /**
     * Atomically records a transaction for an IP address and returns the active count in window.
     *
     * @param ipAddress Client IP address
     * @param txnId Unique transaction identifier
     * @param windowSeconds Sliding time window in seconds
     * @return Active transaction count from this IP, or -1 if Redis is unavailable
     */
    public int recordAndGetIpVelocity(String ipAddress, String txnId, int windowSeconds) {
        if (ipAddress == null || ipAddress.isBlank()) {
            return 0;
        }
        String key = KEY_PREFIX_IP + ipAddress;
        return executeRecordScript(key, txnId, windowSeconds);
    }

    /**
     * Queries the current transaction count for an IP address in the sliding window.
     *
     * @param ipAddress Client IP address
     * @param windowSeconds Sliding time window in seconds
     * @return Active count in window, or -1 if Redis is unavailable
     */
    public int getIpVelocity(String ipAddress, int windowSeconds) {
        if (ipAddress == null || ipAddress.isBlank()) {
            return 0;
        }
        String key = KEY_PREFIX_IP + ipAddress;
        return executeQueryScript(key, windowSeconds);
    }

    /**
     * Records all multi-dimensional velocity metrics (User, Device, IP, Card BIN, Merchant, Volume)
     * for an evaluated transaction into Redis.
     *
     * @param request The transaction request payload
     * @param txnId The generated transaction identifier
     */
    public void recordTransactionMetrics(TransactionRequest request, String txnId) {
        try {
            long nowMs = Instant.now().toEpochMilli();
            int defaultWindow = 3600; // 1 hour retention for sliding checks

            // 1. Record User Velocity
            if (request.getUserId() != null) {
                recordAndGetUserVelocity(request.getUserId(), txnId, defaultWindow);
            }

            // 2. Record Device Velocity
            if (request.getDeviceFingerprint() != null) {
                recordAndGetDeviceVelocity(request.getDeviceFingerprint(), txnId, defaultWindow);
            }

            // 3. Record IP Velocity
            if (request.getIpAddress() != null) {
                recordAndGetIpVelocity(request.getIpAddress(), txnId, defaultWindow);
            }

            // 4. Record Card BIN Velocity
            if (request.getCardBin() != null) {
                String cardKey = KEY_PREFIX_CARD + request.getCardBin();
                executeRecordScript(cardKey, txnId, defaultWindow);
            }

            // 5. Record Merchant Velocity
            if (request.getMerchantId() != null) {
                String merKey = KEY_PREFIX_MERCHANT + request.getMerchantId();
                executeRecordScript(merKey, txnId, defaultWindow);
            }

            // 6. Record Volume Velocity (User spend accumulation)
            if (request.getUserId() != null && request.getAmount() != null) {
                String volumeKey = KEY_PREFIX_VOLUME_USER + request.getUserId();
                String volumeMember = txnId + ":" + request.getAmount().toPlainString() + ":" + nowMs;
                long cutoffMs = nowMs - (defaultWindow * 1000L);

                redisTemplate.opsForZSet().removeRangeByScore(volumeKey, Double.NEGATIVE_INFINITY, cutoffMs);
                redisTemplate.opsForZSet().add(volumeKey, volumeMember, nowMs);
                redisTemplate.expire(volumeKey, java.time.Duration.ofSeconds(defaultWindow + 60));
            }
        } catch (Exception e) {
            log.warn("Failed to asynchronously update Redis velocity metrics for txn {}: {}", txnId, e.getMessage());
        }
    }

    /**
     * Calculates the cumulative monetary transaction volume for a user in the specified sliding window.
     * Falls back automatically to PostgreSQL if Redis is unavailable.
     *
     * @param userId Unique customer identifier
     * @param windowSeconds Sliding time window in seconds
     * @return Sum of transaction amounts within the window, or BigDecimal.ZERO if empty/unavailable
     */
    public BigDecimal getUserVolumeVelocity(String userId, int windowSeconds) {
        if (!isAvailable()) {
            if (transactionRepository != null && userId != null) {
                java.time.OffsetDateTime cutoff = java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC).minusSeconds(windowSeconds);
                List<com.sentinelx.backend.entity.Transaction> txns = transactionRepository.findRecentByUserIdSince(userId, cutoff);
                BigDecimal sum = BigDecimal.ZERO;
                for (com.sentinelx.backend.entity.Transaction t : txns) {
                    if (t.getAmount() != null) {
                        sum = sum.add(t.getAmount());
                    }
                }
                return sum;
            }
            return BigDecimal.ZERO;
        }

        try {
            String volumeKey = KEY_PREFIX_VOLUME_USER + userId;
            long nowMs = Instant.now().toEpochMilli();
            long cutoffMs = nowMs - (windowSeconds * 1000L);

            // Clean stale volume entries
            redisTemplate.opsForZSet().removeRangeByScore(volumeKey, Double.NEGATIVE_INFINITY, cutoffMs);

            // Query active elements in window
            Set<ZSetOperations.TypedTuple<String>> tuples = redisTemplate.opsForZSet()
                    .rangeByScoreWithScores(volumeKey, cutoffMs, Double.POSITIVE_INFINITY);

            if (tuples == null || tuples.isEmpty()) {
                return BigDecimal.ZERO;
            }

            BigDecimal total = BigDecimal.ZERO;
            for (ZSetOperations.TypedTuple<String> tuple : tuples) {
                String val = tuple.getValue();
                if (val != null) {
                    String[] parts = val.split(":");
                    if (parts.length >= 2) {
                        try {
                            total = total.add(new BigDecimal(parts[1]));
                        } catch (NumberFormatException ignored) {
                        }
                    }
                }
            }
            return total;
        } catch (Exception e) {
            log.warn("Failed to calculate user volume velocity for {}: {}", userId, e.getMessage());
            return BigDecimal.ZERO;
        }
    }

    /**
     * Clears velocity keys for a user (useful in unit testing and cache eviction).
     *
     * @param userId Unique customer identifier
     */
    public void resetUserVelocity(String userId) {
        try {
            redisTemplate.delete(KEY_PREFIX_USER + userId);
            redisTemplate.delete(KEY_PREFIX_VOLUME_USER + userId);
        } catch (Exception ignored) {
        }
    }

    /**
     * Executes the atomic record Lua script against a Redis key.
     */
    private int executeRecordScript(String key, String txnId, int windowSeconds) {
        try {
            long nowMs = Instant.now().toEpochMilli();
            long cutoffMs = nowMs - (windowSeconds * 1000L);
            String member = (txnId != null ? txnId : "ev") + ":" + nowMs;
            int ttlSeconds = windowSeconds + 60;

            Long count = redisTemplate.execute(
                    slidingWindowRecordScript,
                    Collections.singletonList(key),
                    String.valueOf(nowMs),
                    String.valueOf(cutoffMs),
                    member,
                    String.valueOf(ttlSeconds)
            );

            return count != null ? count.intValue() : 1;
        } catch (Exception e) {
            log.warn("Redis velocity execution failed for key {}: {}. Will fallback to database history.", key, e.getMessage());
            return -1;
        }
    }

    /**
     * Executes the atomic query Lua script against a Redis key.
     */
    private int executeQueryScript(String key, int windowSeconds) {
        try {
            long nowMs = Instant.now().toEpochMilli();
            long cutoffMs = nowMs - (windowSeconds * 1000L);

            Long count = redisTemplate.execute(
                    slidingWindowQueryScript,
                    Collections.singletonList(key),
                    String.valueOf(cutoffMs)
            );

            return count != null ? count.intValue() : 0;
        } catch (Exception e) {
            log.warn("Redis velocity query failed for key {}: {}. Will fallback to database history.", key, e.getMessage());
            return -1;
        }
    }
}
