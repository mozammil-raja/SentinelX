package com.sentinelx.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "review_queue")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewQueue {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id", unique = true)
    private Transaction transaction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decision_id")
    private Decision decision;

    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "reviewer_id")
    private String reviewerId;

    @Column(name = "reviewer_notes")
    private String reviewerNotes;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}