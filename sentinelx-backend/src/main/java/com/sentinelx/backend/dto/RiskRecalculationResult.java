package com.sentinelx.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result of recalculating a customer's risk segment from their recent stored transaction history.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiskRecalculationResult {

    private String userId;
    private String name;
    private String previousRiskSegment;
    private String newRiskSegment;
    private boolean changed;
    private long totalTransactions;
    private int recentWindowSize;
    private int recentApprovedCount;
    private int recentReviewCount;
    private int recentBlockedCount;
    private int recentAverageScore;
    private String reason;
}
