package com.sentinelx.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request payload for launching a historical replay or backtesting simulation run.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BacktestRequest {

    /**
     * Source of the backtest dataset:
     * - "SAMPLE_BENCHMARK": Uses the pre-packaged 250+ transaction benchmark dataset.
     * - "DATABASE_RANGE": Reads historical transactions from PostgreSQL.
     * - "CUSTOM_PAYLOAD": Evaluates the attached list of custom transactions.
     */
    @Builder.Default
    private String datasetSource = "SAMPLE_BENCHMARK";

    /**
     * Maximum number of database transactions to evaluate if using DATABASE_RANGE.
     */
    @Builder.Default
    private Integer limit = 500;

    /**
     * Optional attached transaction batch for CUSTOM_PAYLOAD mode.
     */
    private List<TransactionRequest> customTransactions;

    /**
     * Proposed candidate rule configurations to backtest against the current active baseline rules.
     */
    private List<RuleRequest> candidateRules;
}
