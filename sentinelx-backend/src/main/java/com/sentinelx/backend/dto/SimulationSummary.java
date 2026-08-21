package com.sentinelx.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Aggregate summary metrics for a single backtesting simulation run.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SimulationSummary {

    private int totalProcessed;
    private int allowCount;
    private int reviewCount;
    private int blockCount;
    private double allowPercentage;
    private double reviewPercentage;
    private double blockPercentage;
    private double averageScore;
    private double averageLatencyMs;
}
