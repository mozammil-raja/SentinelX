package com.sentinelx.backend;

import com.sentinelx.backend.dto.DecisionResponse;
import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.repository.DecisionRepository;
import com.sentinelx.backend.repository.ReviewQueueRepository;
import com.sentinelx.backend.repository.TransactionRepository;
import com.sentinelx.backend.service.RiskService;
import com.sentinelx.backend.service.VelocityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration and HTTP verification test suite for Sliding Window Velocity and Telemetry endpoints.
 */
@SpringBootTest
@ActiveProfiles("test")
class VelocitySlidingWindowIntegrationTest {

    @Autowired
    private RiskService riskService;

    @Autowired
    private VelocityService velocityService;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private DecisionRepository decisionRepository;

    @Autowired
    private ReviewQueueRepository reviewQueueRepository;

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        reviewQueueRepository.deleteAllInBatch();
        decisionRepository.deleteAllInBatch();
        transactionRepository.deleteAllInBatch();
        this.mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
    }

    @Test
    @DisplayName("Sliding Window Velocity: Rapid burst of transactions triggers RULE_01 penalty")
    void testHighVelocityBurstTriggersRule() {
        String testUserId = "usr_burst_" + System.currentTimeMillis();
        String testDevice = "fp_trusted_phone_" + System.currentTimeMillis();
        String testIp = "198.51.100.25";

        // Ingest 6 rapid transactions
        DecisionResponse lastResponse = null;
        for (int i = 1; i <= 6; i++) {
            TransactionRequest request = TransactionRequest.builder()
                    .userId(testUserId)
                    .email("burst." + testUserId + "@example.com")
                    .amount(new BigDecimal("25.00"))
                    .currency("USD")
                    .merchantId("mer_coffee_shop")
                    .cardBin("411111")
                    .ipAddress(testIp)
                    .deviceFingerprint(testDevice)
                    .build();

            lastResponse = riskService.evaluateTransaction(request);
        }

        assertThat(lastResponse).isNotNull();
        // Upon the 6th rapid transaction (>= limit of 5 in 300s), RULE_01 must trigger
        assertThat(lastResponse.getFiredRules())
                .anyMatch(r -> r.contains("RULE_01") || r.contains("High Velocity"));

        assertThat(lastResponse.getFinalScore()).isGreaterThanOrEqualTo(40);

        velocityService.resetVelocity(testUserId, testIp, testDevice);
    }

    @Test
    @DisplayName("HTTP 200: Successfully fetch customer velocity metrics via REST endpoint")
    void testGetCustomerVelocityEndpoint() throws Exception {
        String testUserId = "usr_telemetry_" + System.currentTimeMillis();

        mockMvc.perform(get("/api/v1/velocity/user/" + testUserId + "?window=300")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId", is(testUserId)))
                .andExpect(jsonPath("$.windowSeconds", is(300)))
                .andExpect(jsonPath("$.userVelocityCount", greaterThanOrEqualTo(0)))
                .andExpect(jsonPath("$.timestamp", notNullValue()));
    }

    @Test
    @DisplayName("HTTP 200: Successfully fetch IP and device velocity metrics via REST endpoint")
    void testGetIpAndDeviceVelocityEndpoints() throws Exception {
        mockMvc.perform(get("/api/v1/velocity/ip/198.51.100.77?window=600"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ipAddress", is("198.51.100.77")))
                .andExpect(jsonPath("$.windowSeconds", is(600)))
                .andExpect(jsonPath("$.ipVelocityCount", greaterThanOrEqualTo(0)));

        mockMvc.perform(get("/api/v1/velocity/device/fp_device_abc?window=600"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deviceFingerprint", is("fp_device_abc")))
                .andExpect(jsonPath("$.windowSeconds", is(600)))
                .andExpect(jsonPath("$.deviceVelocityCount", greaterThanOrEqualTo(0)));
    }

    @Test
    @DisplayName("HTTP 200: Successfully fetch velocity service health status")
    void testGetVelocityHealthEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/velocity/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.engine", containsString("Redis Sorted Sets")))
                .andExpect(jsonPath("$.timestamp", notNullValue()));
    }
}
