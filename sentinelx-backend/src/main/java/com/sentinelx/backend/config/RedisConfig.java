package com.sentinelx.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;

/**
 * Spring configuration class for Redis connection factories, StringRedisTemplate,
 * and pre-compiled atomic Lua scripts powering SentinelX real-time velocity tracking.
 */
@Configuration
public class RedisConfig {

    /**
     * Configures the primary {@link StringRedisTemplate} using UTF-8 string serializers
     * for high-throughput velocity counter operations.
     *
     * @param connectionFactory Spring Data Redis connection factory (Lettuce)
     * @return Configured StringRedisTemplate bean
     */
    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory connectionFactory) {
        return new StringRedisTemplate(connectionFactory);
    }

    /**
     * Pre-compiled atomic Lua script executing the complete Sliding Window Log algorithm in a single round-trip:
     * 1. Evicts stale records older than the sliding window cutoff (ZREMRANGEBYSCORE)
     * 2. Adds the current transaction timestamp as score and unique ID as member (ZADD)
     * 3. Sets key TTL to auto-reclaim memory (EXPIRE)
     * 4. Returns the active transaction count in the window (ZCARD)
     *
     * @return Pre-compiled RedisScript bean returning the active count
     */
    @Bean
    public RedisScript<Long> slidingWindowRecordScript() {
        String script =
                "local key = KEYS[1] " +
                "local nowMs = tonumber(ARGV[1]) " +
                "local cutoffMs = tonumber(ARGV[2]) " +
                "local member = ARGV[3] " +
                "local ttlSeconds = tonumber(ARGV[4]) " +
                "redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoffMs) " +
                "redis.call('ZADD', key, nowMs, member) " +
                "redis.call('EXPIRE', key, ttlSeconds) " +
                "return redis.call('ZCARD', key)";

        return new DefaultRedisScript<>(script, Long.class);
    }

    /**
     * Pre-compiled atomic Lua script querying active items in a sliding window without inserting:
     * 1. Evicts stale records older than the sliding window cutoff (ZREMRANGEBYSCORE)
     * 2. Returns the active transaction count (ZCARD)
     *
     * @return Pre-compiled RedisScript bean returning the current count
     */
    @Bean
    public RedisScript<Long> slidingWindowQueryScript() {
        String script =
                "local key = KEYS[1] " +
                "local cutoffMs = tonumber(ARGV[1]) " +
                "redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoffMs) " +
                "return redis.call('ZCARD', key)";

        return new DefaultRedisScript<>(script, Long.class);
    }
}
