package com.sentinelx.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Data Transfer Object representing real-time multi-dimensional velocity metrics
 * evaluated across sliding time windows for operational diagnostics and live telemetry.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VelocityMetricsResponse {

    /**
     * Customer / User identifier.
     */
    private String userId;

    /**
     * Client IP address.
     */
    private String ipAddress;

    /**
     * Client device hardware/canvas SHA-256 fingerprint.
     */
    private String deviceFingerprint;

    /**
     * Evaluated sliding time window in seconds (e.g. 60, 300, 3600).
     */
    private int windowSeconds;

    /**
     * Number of transactions initiated by this user within the sliding window.
     */
    private int userVelocityCount;

    /**
     * Number of transactions initiated from this IP within the sliding window.
     */
    private int ipVelocityCount;

    /**
     * Number of transactions initiated on this device within the sliding window.
     */
    private int deviceVelocityCount;

    /**
     * Cumulative monetary volume spent by this user in the sliding window.
     */
    private BigDecimal userVolumeAmount;

    /**
     * Operational flag indicating whether Redis in-memory acceleration is active.
     */
    private boolean isRedisAvailable;

    /**
     * Timestamp when the velocity evaluation occurred.
     */
    @Builder.Default
    private OffsetDateTime timestamp = OffsetDateTime.now();
}
