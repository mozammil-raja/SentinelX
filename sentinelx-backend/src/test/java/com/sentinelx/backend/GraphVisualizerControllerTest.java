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
class GraphVisualizerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("HTTP 200: GET /api/v1/graph/network/{userId} returns network topology schema")
    void testGetNetworkTopology() throws Exception {
        mockMvc.perform(get("/api/v1/graph/network/usr_1001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalNodes", greaterThan(0)))
                .andExpect(jsonPath("$.nodes", notNullValue()))
                .andExpect(jsonPath("$.edges", notNullValue()))
                .andExpect(jsonPath("$.syndicateAnalysis", notNullValue()));
    }

    @Test
    @DisplayName("HTTP 200: GET /api/v1/graph/summary returns global graph metrics")
    void testGetGraphSummary() throws Exception {
        mockMvc.perform(get("/api/v1/graph/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalNodes", greaterThan(0)))
                .andExpect(jsonPath("$.totalEdges", greaterThan(0)))
                .andExpect(jsonPath("$.blockedUsersCount", greaterThan(0)));
    }
}
