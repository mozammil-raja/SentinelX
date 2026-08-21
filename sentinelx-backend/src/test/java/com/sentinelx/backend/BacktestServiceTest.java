package com.sentinelx.backend;

import com.sentinelx.backend.dto.BacktestReportResponse;
import com.sentinelx.backend.dto.BacktestRequest;
import com.sentinelx.backend.dto.RuleRequest;
import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.service.BacktestService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class BacktestServiceTest {

    @Autowired
    private BacktestService backtestService;

    @Test
    @DisplayName("Backtesting: Benchmark dataset simulation executes cleanly and returns complete analytics")
    void testBenchmarkBacktestRun() {
        BacktestRequest request = BacktestRequest.builder()
                .datasetSource("SAMPLE_BENCHMARK")
                .build();

        BacktestReportResponse report = backtestService.runBacktest(request);

        assertThat(report).isNotNull();
        assertThat(report.getTotalTransactions()).isEqualTo(250);
        assertThat(report.getBaseline()).isNotNull();
        assertThat(report.getCandidate()).isNotNull();
        assertThat(report.getBaseline().getTotalProcessed()).isEqualTo(250);
        assertThat(report.getBaseline().getAllowCount()).isGreaterThan(0);
        assertThat(report.getBaseline().getBlockCount()).isGreaterThan(0);
        assertThat(report.getDiscrepancies()).isNotNull();
    }

    @Test
    @DisplayName("Backtesting: Candidate rule weight adjustments accurately produce distribution shift and discrepancies")
    void testCandidateRuleWeightAdjustmentDiscrepancies() {
        // Adjust High-Value rule (RULE_03) weight from 50 to 80 pts (escalating from REVIEW to instant BLOCK)
        RuleRequest candidateRule3 = RuleRequest.builder()
                .ruleId("RULE_03")
                .name("High-Value Transaction")
                .weight(80)
                .isActive(true)
                .build();

        BacktestRequest request = BacktestRequest.builder()
                .datasetSource("SAMPLE_BENCHMARK")
                .candidateRules(List.of(candidateRule3))
                .build();

        BacktestReportResponse report = backtestService.runBacktest(request);

        assertThat(report).isNotNull();
        // The candidate block count must increase or equal baseline
        assertThat(report.getCandidate().getBlockCount()).isGreaterThanOrEqualTo(report.getBaseline().getBlockCount());
        // Discrepancy count should detect the shifted high-value transactions
        assertThat(report.getDiscrepancyCount()).isGreaterThan(0);
        assertThat(report.getDiscrepancies()).isNotEmpty();
    }

    @Test
    @DisplayName("Backtesting: Custom uploaded transaction batch executes accurately in dry-run mode")
    void testCustomBatchSimulation() {
        List<TransactionRequest> customBatch = List.of(
                TransactionRequest.builder()
                        .userId("usr_1001")
                        .amount(new BigDecimal("25.00"))
                        .currency("USD")
                        .merchantId("mer_safe")
                        .ipAddress("198.51.100.10")
                        .deviceFingerprint("fp_alice_iphone15_sha256")
                        .build(),
                TransactionRequest.builder()
                        .userId("usr_1003")
                        .amount(new BigDecimal("500.00"))
                        .currency("USD")
                        .merchantId("mer_black_1")
                        .ipAddress("198.51.100.2")
                        .deviceFingerprint("fp_risky")
                        .build()
        );

        BacktestRequest request = BacktestRequest.builder()
                .datasetSource("CUSTOM_PAYLOAD")
                .customTransactions(customBatch)
                .build();

        BacktestReportResponse report = backtestService.runBacktest(request);

        assertThat(report.getTotalTransactions()).isEqualTo(2);
        assertThat(report.getBaseline().getAllowCount()).isEqualTo(1);
        assertThat(report.getBaseline().getBlockCount()).isEqualTo(1);
    }
}
