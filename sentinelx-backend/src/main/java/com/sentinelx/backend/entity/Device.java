package com.sentinelx.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

/**
 * Represents a physical or browser-based client device used by a customer to execute transactions.
 * 
 * <p>Device profiling is a cornerstone of fraud detection. By tracking canvas/hardware fingerprints,
 * IP addresses, operating systems, and user trust status, the risk engine can detect account takeover (ATO),
 * credential stuffing, and sudden device hopping.</p>
 */
@Entity
@Table(name = "devices")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Device {

    /**
     * Unique domain-prefixed identifier for the device (e.g. "dev_alice_phone").
     */
    @Id
    private String id;

    /**
     * The customer associated with this device profile.
     * Uses lazy loading to avoid unnecessary relational joins during high-throughput ingestion.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    /**
     * Cryptographic SHA-256 hash representing the hardware/browser canvas fingerprint.
     */
    @Column(nullable = false)
    private String fingerprint;

    /**
     * Public or network IP address observed during the last transaction from this device.
     */
    @Column(name = "ip_address", nullable = false)
    private String ipAddress;

    /**
     * Operating system name detected via client user-agent (e.g. "iOS", "macOS", "Windows", "Android").
     */
    private String os;
    
    /**
     * Browser name detected via client user-agent (e.g. "Safari", "Chrome", "Firefox", "Edge").
     */
    private String browser;

    /**
     * Flag indicating whether this device has passed multi-factor authentication or previous manual review.
     * If false or unrecognized, triggers the New Device risk rule (RULE_02).
     */
    @Column(name = "is_trusted")
    @Builder.Default
    private Boolean isTrusted = true;

    /**
     * UTC timestamp when this device was last observed executing a transaction.
     */
    @Column(name = "last_seen", insertable = false, updatable = false)
    private OffsetDateTime lastSeen;
}