package com.sentinelx.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

/**
 * Represents a dynamic fraud detection rule evaluated by the SentinelX Risk Engine.
 * 
 * <p>Rules are stored in PostgreSQL and loaded into memory to evaluate transactions.
 * Each rule defines a polymorphic JSON parameter configuration (e.g. time windows, threshold amounts,
 * merchant blacklists) and a numerical risk penalty weight. When a rule condition is met, its weight
 * is added to the transaction's cumulative risk score.</p>
 */
@Entity
@Table(name = "rules", uniqueConstraints = {@UniqueConstraint(columnNames = {"name", "version"})})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rule {

    /**
     * Unique identifier for the rule (e.g. "RULE_01", "RULE_VELOCITY_5M").
     */
    @Id
    private String id;

    /**
     * Human-readable rule title (e.g. "High Velocity (5m)", "Blacklisted Merchant").
     * Must be unique per rule version.
     */
    @Column(nullable = false, length = 100)
    private String name;

    /**
     * Detailed business or compliance description of what this rule detects.
     */
    private String description;

    /**
     * Serialized JSON string containing parameterized condition criteria.
     * Examples:
     * <ul>
     *   <li>Velocity: {@code {"window": 300, "limit": 5}}</li>
     *   <li>High Value: {@code {"threshold": 10000}}</li>
     *   <li>Blacklist: {@code {"merchants": ["mer_black_1", "mer_black_2"]}}</li>
     * </ul>
     */
    @Column(name = "condition_json", nullable = false, length = 2000)
    private String conditionJson;

    /**
     * Numerical risk score contribution (0 to 100).
     * Added to the overall transaction risk score when this rule fires.
     */
    @Column(nullable = false)
    private Integer weight;

    /**
     * Version number of this rule specification.
     * Enables safe rule evolution and backtesting simulations without breaking historical audits.
     */
    @Column(nullable = false)
    @Builder.Default
    private Integer version = 1;

    /**
     * Active toggle switch for the rule engine.
     * Inactive rules are ignored during real-time scoring.
     */
    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    /**
     * Identity or email of the risk analyst or admin who created/updated this rule.
     */
    @Column(name = "created_by")
    private String createdBy;

    /**
     * Audit timestamp when this rule was created in UTC.
     */
    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    /**
     * Audit timestamp when this rule was last modified in UTC.
     */
    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}