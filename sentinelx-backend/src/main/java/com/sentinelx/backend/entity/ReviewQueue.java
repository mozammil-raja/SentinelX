package com.sentinelx.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

/**
 * Represents an entry in the fraud analyst manual review queue.
 * 
 * <p>When a transaction scores in the medium risk band (30 <= score < 70) and receives a "REVIEW"
 * decision verdict, it is routed into the review queue. Compliance analysts can view pending transactions,
 * inspect triggered rules, review device history, and provide an authoritative human decision ("APPROVED" or "REJECTED").</p>
 */
@Entity
@Table(name = "review_queue")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ReviewQueue {

    /**
     * Unique auto-increment database sequence ID.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * One-to-one relationship with the transaction under investigation.
     */
    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "transaction_id", unique = true)
    private Transaction transaction;

    /**
     * The initial algorithmic decision that routed this transaction into the review queue.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "decision_id")
    private Decision decision;

    /**
     * Current review state.
     * Possible values: "PENDING" (awaiting investigation), "APPROVED" (analyst cleared), "REJECTED" (analyst confirmed fraud).
     */
    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING";

    /**
     * Identity or email of the human risk analyst who investigated the case.
     */
    @Column(name = "reviewer_id")
    private String reviewerId;

    /**
     * Detailed notes or justification provided by the risk analyst upon case resolution.
     */
    @Column(name = "reviewer_notes")
    private String reviewerNotes;

    /**
     * UTC timestamp when the analyst completed the review and submitted notes.
     */
    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    /**
     * UTC timestamp when the review item was enqueued.
     */
    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}