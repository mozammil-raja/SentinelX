package com.sentinelx.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Detailed discrepancy report for a single transaction whose verdict or score shifted during backtesting.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiscrepancyItem {

    private String transactionId;
    private String userId;
    private BigDecimal amount;
    private String merchantId;
    private String ipAddress;

    private String baselineVerdict;
    private int baselineScore;
    private List<String> baselineFiredRules;

    private String candidateVerdict;
    private int candidateScore;
    private List<String> candidateFiredRules;

    private int scoreDelta;
}
