package com.sentinelx.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Collections;

/**
 * Distributed Concurrency Locking Service.
 *
 * <p>Implements Redis-based distributed locking to serialize concurrent requests
 * from identical user accounts within milliseconds, preventing fraud rings from
 * evading sliding-window velocity thresholds via race conditions.</p>
 */
@Service
public class DistributedLockService {

    private static final Logger log = LoggerFactory.getLogger(DistributedLockService.class);
    private static final String LOCK_PREFIX = "sentinelx:lock:user:";

    // Atomic Lua script to safely release lock only if the token matches the holder
    private static final String UNLOCK_LUA_SCRIPT =
            "if redis.call('get', KEYS[1]) == ARGV[1] then " +
            "    return redis.call('del', KEYS[1]) " +
            "else " +
            "    return 0 " +
            "end";

    private final StringRedisTemplate redisTemplate;
    private final DefaultRedisScript<Long> unlockScript;

    public DistributedLockService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.unlockScript = new DefaultRedisScript<>(UNLOCK_LUA_SCRIPT, Long.class);
    }

    /**
     * Attempts to acquire an atomic distributed lock for a user ID.
     *
     * @param userId Unique user identifier
     * @param lockToken Unique lock token (e.g. UUID) owned by the calling thread
     * @param timeout Duration before the lock auto-expires (e.g. 5 seconds)
     * @return true if acquired or Redis unavailable; false if already locked by another thread
     */
    public boolean acquireUserLock(String userId, String lockToken, Duration timeout) {
        if (userId == null || userId.isBlank()) {
            return true;
        }

        String key = LOCK_PREFIX + userId.trim();
        try {
            Boolean acquired = redisTemplate.opsForValue().setIfAbsent(key, lockToken, timeout);
            return Boolean.TRUE.equals(acquired);
        } catch (Exception e) {
            log.warn("Redis distributed lock acquisition failed for user '{}': {}. Falling back to open execution.", userId, e.getMessage());
            return true; // Fail-safe: allow request to proceed if Redis is unreachable
        }
    }

    /**
     * Releases the distributed lock only if the calling thread still holds the matching token.
     *
     * @param userId Unique user identifier
     * @param lockToken Token supplied during lock acquisition
     */
    public void releaseUserLock(String userId, String lockToken) {
        if (userId == null || userId.isBlank() || lockToken == null) {
            return;
        }

        String key = LOCK_PREFIX + userId.trim();
        try {
            redisTemplate.execute(unlockScript, Collections.singletonList(key), lockToken);
        } catch (Exception e) {
            log.warn("Failed to release Redis distributed lock for user '{}': {}", userId, e.getMessage());
        }
    }
}
