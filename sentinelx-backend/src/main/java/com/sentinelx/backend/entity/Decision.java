package com.sentinelx.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "decisions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Decision {
    @Id
    private String id;

    @Column(name = "transaction_id", nullable = false)
    private String transactionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "final_score", nullable = false)
    private Integer finalScore;

    @Column(nullable = false, length = 15)
    private String decision;

    @Column(name = "fired_rules", nullable = false, length = 4000)
    private String firedRules;

    @Column(name = "evaluation_time_ms", nullable = false)
    private Integer evaluationTimeMs;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}