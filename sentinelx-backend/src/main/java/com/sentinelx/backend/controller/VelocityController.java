package com.sentinelx.backend.controller;

import com.sentinelx.backend.dto.VelocityMetricsResponse;
import com.sentinelx.backend.service.VelocityService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;

/**
 * REST Controller exposing real-time velocity metrics, sliding window diagnostics,
 * and Redis cluster health telemetry for operational monitoring.
 */
@RestController
@RequestMapping("/api/v1/velocity")
public class VelocityController {

    private final VelocityService velocityService;

    /**
     * Constructs the VelocityController with the VelocityService dependency.
     *
     * @param velocityService In-memory velocity tracking service
     */
    public VelocityController(VelocityService velocityService) {
        this.velocityService = velocityService;
    }

    /**
     * Inspects the sliding window transaction frequency and cumulative volume for a specific customer.
     *
     * @param userId Unique customer identifier
     * @param window Time window in seconds (default 300 = 5 minutes)
     * @return Multi-dimensional velocity metrics response
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<VelocityMetricsResponse> getUserVelocity(
            @PathVariable String userId,
            @RequestParam(defaultValue = "300") int window) {
        int boundedWindow = Math.max(1, Math.min(window, 86400)); // clamp 1s to 24h
        int count = velocityService.getUserVelocity(userId, boundedWindow);
        BigDecimal volume = velocityService.getUserVolumeVelocity(userId, boundedWindow);
        boolean available = velocityService.isAvailable();

        VelocityMetricsResponse response = VelocityMetricsResponse.builder()
                .userId(userId)
                .windowSeconds(boundedWindow)
                .userVelocityCount(Math.max(0, count))
                .userVolumeAmount(volume)
                .isRedisAvailable(available)
                .timestamp(OffsetDateTime.now())
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Inspects the sliding window transaction frequency for a client IP address.
     *
     * @param ipAddress Client IPv4 or IPv6 address
     * @param window Time window in seconds (default 300 = 5 minutes)
     * @return Multi-dimensional velocity metrics response
     */
    @GetMapping("/ip/{ipAddress}")
    public ResponseEntity<VelocityMetricsResponse> getIpVelocity(
            @PathVariable String ipAddress,
            @RequestParam(defaultValue = "300") int window) {
        int boundedWindow = Math.max(1, Math.min(window, 86400));
        int count = velocityService.getIpVelocity(ipAddress, boundedWindow);
        boolean available = velocityService.isAvailable();

        VelocityMetricsResponse response = VelocityMetricsResponse.builder()
                .ipAddress(ipAddress)
                .windowSeconds(boundedWindow)
                .ipVelocityCount(Math.max(0, count))
                .isRedisAvailable(available)
                .timestamp(OffsetDateTime.now())
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Inspects the sliding window transaction frequency for a device hardware fingerprint.
     *
     * @param fingerprint SHA-256 device canvas/hardware fingerprint
     * @param window Time window in seconds (default 300 = 5 minutes)
     * @return Multi-dimensional velocity metrics response
     */
    @GetMapping("/device/{fingerprint}")
    public ResponseEntity<VelocityMetricsResponse> getDeviceVelocity(
            @PathVariable String fingerprint,
            @RequestParam(defaultValue = "300") int window) {
        int boundedWindow = Math.max(1, Math.min(window, 86400));
        int count = velocityService.getDeviceVelocity(fingerprint, boundedWindow);
        boolean available = velocityService.isAvailable();

        VelocityMetricsResponse response = VelocityMetricsResponse.builder()
                .deviceFingerprint(fingerprint)
                .windowSeconds(boundedWindow)
                .deviceVelocityCount(Math.max(0, count))
                .isRedisAvailable(available)
                .timestamp(OffsetDateTime.now())
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Returns Redis velocity acceleration availability and health status.
     *
     * @return Status map indicating if Redis in-memory acceleration is live
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getVelocityHealth() {
        boolean available = velocityService.isAvailable();
        return ResponseEntity.ok(Map.of(
                "status", available ? "UP" : "DOWN",
                "engine", "Redis Sorted Sets (ZSET) Sliding Window Log",
                "isRedisAvailable", available,
                "timestamp", OffsetDateTime.now().toString()
        ));
    }
}
