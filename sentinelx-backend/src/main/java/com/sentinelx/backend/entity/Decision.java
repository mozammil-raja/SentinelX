package com.sentinelx.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.OffsetDateTime;

/**
 * Represents the audit verdict produced by the Risk Engine for an evaluated transaction.
 * 
 * <p>Every transaction evaluated by SentinelX generates a {@code Decision} record. It records the
 * final aggregated risk score (0-100), the conclusive action ("ALLOW", "REVIEW", "BLOCK"), the exact
 * list of rules triggered, and the millisecond-resolution evaluation latency.</p>
 */
@Entity
@Table(name = "decisions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Decision {

    /**
     * Unique domain-prefixed identifier for the decision record (e.g. "dec_1234").
     */
    @Id
    private String id;

    /**
     * Reference ID of the evaluated transaction.
     */
    @Column(name = "transaction_id", nullable = false)
    private String transactionId;

    /**
     * Customer associated with the evaluated transaction.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    /**
     * Final aggregated risk penalty score (0 to 100).
     */
    @Column(name = "final_score", nullable = false)
    private Integer finalScore;

    /**
     * Final verdict issued by the risk engine.
     * Possible values: "ALLOW" (score < 30), "REVIEW" (30 <= score < 70), "BLOCK" (score >= 70).
     */
    @Column(nullable = false, length = 15)
    private String decision;

    /**
     * Serialized JSON array containing metadata of every rule triggered during evaluation.
     * Example: {@code [{"ruleId": "RULE_01", "name": "High Velocity", "weight": 40}]}
     */
    @Column(name = "fired_rules", nullable = false, length = 4000)
    private String firedRules;

    /**
     * Total scoring engine evaluation time in milliseconds (latency benchmark).
     */
    @Column(name = "evaluation_time_ms", nullable = false)
    private Integer evaluationTimeMs;

    /**
     * UTC timestamp when this decision record was persisted to PostgreSQL.
     */
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}