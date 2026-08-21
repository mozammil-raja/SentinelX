package com.sentinelx.backend.dto;

import com.sentinelx.backend.entity.ReviewQueue;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Public presentation DTO for manual {@link ReviewQueue} cases.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewQueueResponse {

    private Long id;
    private String transactionId;
    private String decisionId;
    private String userId;
    private BigDecimal amount;
    private String currency;
    private String merchantId;
    private Integer initialScore;
    private String status;
    private String reviewerId;
    private String reviewerNotes;
    private String aiAnalysis;
    private OffsetDateTime reviewedAt;
    private OffsetDateTime createdAt;

    /**
     * Maps a JPA {@link ReviewQueue} entity to its decoupled presentation DTO.
     *
     * @param reviewQueue ReviewQueue JPA entity
     * @return ReviewQueueResponse DTO
     */
    public static ReviewQueueResponse fromEntity(ReviewQueue reviewQueue) {
        if (reviewQueue == null) {
            return null;
        }

        ReviewQueueResponseBuilder builder = ReviewQueueResponse.builder()
                .id(reviewQueue.getId())
                .status(reviewQueue.getStatus())
                .reviewerId(reviewQueue.getReviewerId())
                .reviewerNotes(reviewQueue.getReviewerNotes())
                .aiAnalysis(reviewQueue.getAiAnalysis())
                .reviewedAt(reviewQueue.getReviewedAt())
                .createdAt(reviewQueue.getCreatedAt());

        if (reviewQueue.getTransaction() != null) {
            builder.transactionId(reviewQueue.getTransaction().getId())
                   .amount(reviewQueue.getTransaction().getAmount())
                   .currency(reviewQueue.getTransaction().getCurrency())
                   .merchantId(reviewQueue.getTransaction().getMerchantId());

            if (reviewQueue.getTransaction().getUser() != null) {
                builder.userId(reviewQueue.getTransaction().getUser().getId());
            }
        }

        if (reviewQueue.getDecision() != null) {
            builder.decisionId(reviewQueue.getDecision().getId())
                   .initialScore(reviewQueue.getDecision().getFinalScore());
        }

        return builder.build();
    }
}
