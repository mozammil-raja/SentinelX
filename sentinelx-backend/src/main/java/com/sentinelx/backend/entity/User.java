package com.sentinelx.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
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
     * Timestamp when the user account was registered in UTC.
     * Managed by the database during row creation.
     */
    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    /**
     * Timestamp when the user record was last modified in UTC.
     * Managed by the database on update triggers.
     */
    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}