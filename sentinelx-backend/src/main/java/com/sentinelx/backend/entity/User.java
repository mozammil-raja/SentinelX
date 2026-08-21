package com.sentinelx.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.OffsetDateTime;

/**
 * Represents an account holder or customer within the SentinelX platform.
 * 
 * <p>The {@code User} entity maintains the customer's baseline risk tier, contact
 * email, and audit timestamps. Every incoming transaction is linked to a user to enable
 * historical profiling, velocity tracking, and risk segmentation.</p>
 */
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class User {

    /**
     * Unique domain-prefixed identifier for the user (e.g. "usr_1001").
     * Prevents sequential integer enumeration attacks.
     */
    @Id
    private String id;

    /**
     * Customer full name for profile identification (e.g. "Sarah Khan").
     */
    @Column(name = "name")
    private String name;

    /**
     * Customer email address, used for identification and notification.
     * Enforces uniqueness across the platform.
     */
    @Column(nullable = false, unique = true)
    private String email;

    /**
     * Assigned risk classification tier for the user.
     * Possible values: "LOW", "MEDIUM", "HIGH", "CRITICAL".
     * Defaults to "MEDIUM" for newly registered or unclassified users.
     */
    @Column(name = "risk_segment", nullable = false)
    @Builder.Default
    private String riskSegment = "MEDIUM";

    /**
     * Customer's typical minimum spend per transaction (e.g. 500.00).
     */
    @Column(name = "typical_spend_min")
    private java.math.BigDecimal typicalSpendMin;

    /**
     * Customer's typical maximum spend per transaction (e.g. 3000.00).
     */
    @Column(name = "typical_spend_max")
    private java.math.BigDecimal typicalSpendMax;

    /**
     * Preferred or standard currency for the customer profile (e.g. "INR", "USD").
     */
    @Column(name = "currency")
    @Builder.Default
    private String currency = "INR";

    /**
     * Customer's usual or home location (e.g. "Delhi, India").
     */
    @Column(name = "usual_location")
    private String usualLocation;

    /**
     * Customer's usual IP address subnet prefix (e.g. "198.51.100.").
     */
    @Column(name = "usual_ip_subnet")
    private String usualIpSubnet;

    /**
     * Primary or trusted device description (e.g. "iPhone 15 Pro").
     */
    @Column(name = "primary_device")
    private String primaryDevice;

    /**
     * Typical daily transaction count for behavioral velocity checks (e.g. 3).
     */
    @Column(name = "daily_txn_count")
    @Builder.Default
    private Integer dailyTxnCount = 3;

    /**
     * Customer profile notes or role description (e.g. "Graphic Designer").
     */
    @Column(name = "occupation")
    private String occupation;

    /**
     * Timestamp when the user account was registered in UTC.
     * Managed by the database during row creation.
     */
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    /**
     * Timestamp when the user record was last modified in UTC.
     * Managed by the database on update triggers.
     */
    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}