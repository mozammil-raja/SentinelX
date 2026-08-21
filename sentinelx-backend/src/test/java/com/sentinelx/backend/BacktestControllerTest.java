package com.sentinelx.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sentinelx.backend.dto.BacktestRequest;
import com.sentinelx.backend.dto.RuleRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BacktestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("HTTP 200: POST /api/v1/backtest/run returns complete backtest report")
    void testPostBacktestRunEndpoint() throws Exception {
        BacktestRequest request = BacktestRequest.builder()
                .datasetSource("SAMPLE_BENCHMARK")
                .candidateRules(List.of(
                        RuleRequest.builder()
                                .ruleId("RULE_01")
                                .name("High Velocity (5m)")
                                .weight(60)
                                .isActive(true)
                                .build()
                ))
                .build();

        mockMvc.perform(post("/api/v1/backtest/run")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runId", notNullValue()))
                .andExpect(jsonPath("$.totalTransactions", is(250)))
                .andExpect(jsonPath("$.baseline.allowCount", greaterThan(0)))
                .andExpect(jsonPath("$.candidate.allowCount", greaterThan(0)))
                .andExpect(jsonPath("$.distributionShift.ALLOW", notNullValue()));
    }

    @Test
    @DisplayName("HTTP 200: GET /api/v1/backtest/benchmark returns sample dataset preview")
    void testGetBenchmarkPreviewEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/backtest/benchmark"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount", is(250)))
                .andExpect(jsonPath("$.categories", hasSize(greaterThanOrEqualTo(3))));
    }
}
