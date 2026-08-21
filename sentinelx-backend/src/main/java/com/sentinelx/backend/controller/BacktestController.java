package com.sentinelx.backend.controller;

import com.sentinelx.backend.dto.BacktestReportResponse;
import com.sentinelx.backend.dto.BacktestRequest;
import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.service.BacktestService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for launching historical replay and backtesting simulations.
 */
@RestController
@RequestMapping("/api/v1/backtest")
public class BacktestController {

    private final BacktestService backtestService;

    public BacktestController(BacktestService backtestService) {
        this.backtestService = backtestService;
    }

    /**
     * Executes a dry-run backtesting simulation comparing baseline vs candidate rules.
     */
    @PostMapping("/run")
    public ResponseEntity<BacktestReportResponse> runBacktest(@RequestBody(required = false) BacktestRequest request) {
        BacktestRequest backtestReq = request != null ? request : BacktestRequest.builder().build();
        BacktestReportResponse report = backtestService.runBacktest(backtestReq);
        return ResponseEntity.ok(report);
    }

    /**
     * Returns the pre-packaged 250-transaction benchmark dataset metadata and preview.
     */
    @GetMapping("/benchmark")
    public ResponseEntity<Map<String, Object>> getBenchmarkPreview() {
        List<TransactionRequest> sample = backtestService.generateBenchmarkDataset();
        return ResponseEntity.ok(Map.of(
                "totalCount", sample.size(),
                "categories", List.of("Standard Safe", "High-Value Transfers", "Rapid IP Hops", "Sanctioned Merchants", "High Risk Segment"),
                "sampleTransactions", sample.stream().limit(5).toList()
        ));
    }
}
