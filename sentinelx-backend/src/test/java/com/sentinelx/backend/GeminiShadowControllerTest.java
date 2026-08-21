package com.sentinelx.backend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GeminiShadowControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("HTTP 200: GET /api/v1/decisions/gemini-benchmark returns valid benchmark schema")
    void testGetGeminiBenchmarkEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/decisions/gemini-benchmark"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEvaluated", notNullValue()))
                .andExpect(jsonPath("$.agreementRatePercentage", notNullValue()))
                .andExpect(jsonPath("$.ruleVerdictBreakdown", notNullValue()))
                .andExpect(jsonPath("$.geminiVerdictBreakdown", notNullValue()));
    }
}
