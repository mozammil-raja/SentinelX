package com.sentinelx.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.repository.DecisionRepository;
import com.sentinelx.backend.repository.ReviewQueueRepository;
import com.sentinelx.backend.repository.TransactionRepository;
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

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * HTTP and Controller integration test suite verifying REST API endpoints,
 * request validation rules, and error handlers.
 */
@SpringBootTest
@ActiveProfiles("test")
class TransactionApiIntegrationTest {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private DecisionRepository decisionRepository;

    @Autowired
    private ReviewQueueRepository reviewQueueRepository;

    @Autowired
    private VelocityService velocityService;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        reviewQueueRepository.deleteAllInBatch();
        decisionRepository.deleteAllInBatch();
        transactionRepository.deleteAllInBatch();
        velocityService.resetUserVelocity("usr_1001");
        this.mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
    }

    @Test
    @DisplayName("HTTP 200: Successfully ingest valid transaction and return decision")
    void testIngestValidTransactionHttp() throws Exception {
        TransactionRequest request = TransactionRequest.builder()
                .userId("usr_1001")
                .email("alice@example.com")
                .amount(new BigDecimal("99.99"))
                .currency("USD")
                .merchantId("mer_stripe_store")
                .ipAddress("198.51.100.10")
                .deviceFingerprint("fp_alice_iphone15_sha256")
                .build();

        mockMvc.perform(post("/api/v1/transactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decisionId", notNullValue()))
                .andExpect(jsonPath("$.transactionId", notNullValue()))
                .andExpect(jsonPath("$.decision", is("ALLOW")))
                .andExpect(jsonPath("$.finalScore", lessThan(30)));
    }

    @Test
    @DisplayName("HTTP 200: Scored transaction with blacklisted merchant returns BLOCK decision payload")
    void testIngestBlockedTransactionHttp() throws Exception {
        TransactionRequest request = TransactionRequest.builder()
                .userId("usr_1001")
                .email("alice@example.com")
                .amount(new BigDecimal("500.00"))
                .currency("USD")
                .merchantId("mer_black_1")
                .ipAddress("198.51.100.10")
                .deviceFingerprint("fp_alice_iphone15_sha256")
                .build();

        mockMvc.perform(post("/api/v1/transactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decision", is("BLOCK")))
                .andExpect(jsonPath("$.finalScore", greaterThanOrEqualTo(70)));
    }

    @Test
    @DisplayName("HTTP 400: Rejects invalid transaction payload with negative amount and invalid email")
    void testValidationFailureHttp() throws Exception {
        TransactionRequest invalidRequest = TransactionRequest.builder()
                .userId("")
                .email("invalid-email-format")
                .amount(new BigDecimal("-10.00"))
                .currency("US")
                .merchantId("")
                .ipAddress("")
                .build();

        mockMvc.perform(post("/api/v1/transactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Validation Failed")))
                .andExpect(jsonPath("$.details", notNullValue()));
    }

    @Test
    @DisplayName("HTTP 200: Successfully fetch paginated recent transactions")
    void testGetRecentTransactionsHttp() throws Exception {
        mockMvc.perform(get("/api/v1/transactions?page=0&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", notNullValue()));
    }
}
