package com.sentinelx.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Analytical comparative performance report returned after a backtest simulation run.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BacktestReportResponse {

    private String runId;
    private String datasetSource;
    private int totalTransactions;
    private long simulationDurationMs;

    private SimulationSummary baseline;
    private SimulationSummary candidate;

    /**
     * Net shifts in decision counts: candidate minus baseline (e.g. {"ALLOW": -5, "REVIEW": +2, "BLOCK": +3})
     */
    private Map<String, Integer> distributionShift;

    /**
     * Estimated percentage shift in false positives or blocks.
     */
    private double blockRateShiftPercentage;

    /**
     * Count of transactions whose final decision verdict changed.
     */
    private int discrepancyCount;

    /**
     * List of top transaction-level discrepancies between baseline and candidate configurations.
     */
    private List<DiscrepancyItem> discrepancies;
}
