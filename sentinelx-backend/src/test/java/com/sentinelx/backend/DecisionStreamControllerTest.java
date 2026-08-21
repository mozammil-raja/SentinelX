package com.sentinelx.backend;

import com.sentinelx.backend.dto.DecisionResponse;
import com.sentinelx.backend.service.DecisionStreamService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for the Server-Sent Events (SSE) stream endpoint.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DecisionStreamControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DecisionStreamService decisionStreamService;

    @Test
    @DisplayName("SSE Stream: GET /api/v1/decisions/stream establishes text/event-stream connection")
    void testStreamEndpointHandshake() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/decisions/stream"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", MediaType.TEXT_EVENT_STREAM_VALUE))
                .andExpect(header().string("Cache-Control", "no-cache, no-transform"))
                .andExpect(request().asyncStarted())
                .andReturn();

        assertThat(result.getResponse().getContentType()).isEqualTo(MediaType.TEXT_EVENT_STREAM_VALUE);
    }

    @Test
    @DisplayName("SSE Service: Broadcasts decision events to active subscribers")
    void testBroadcastDecision() {
        int initialCount = decisionStreamService.getActiveSubscriberCount();
        SseEmitter emitter = decisionStreamService.subscribe();
        assertThat(decisionStreamService.getActiveSubscriberCount()).isGreaterThanOrEqualTo(initialCount + 1);

        DecisionResponse decision = DecisionResponse.builder()
                .decisionId("dec_test_sse_1")
                .transactionId("txn_test_sse_1")
                .userId("usr_test_sse")
                .finalScore(85)
                .decision("BLOCK")
                .firedRules(List.of("RULE_05: Blacklisted Merchant"))
                .evaluationTimeMs(4)
                .timestamp(OffsetDateTime.now())
                .build();

        // Broadcast should not throw exceptions
        decisionStreamService.broadcast(decision);
        decisionStreamService.sendHeartbeat();
    }
}
