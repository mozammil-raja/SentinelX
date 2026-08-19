package com.sentinelx.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sentinelx.backend.controller.TransactionController;
import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.exception.GlobalExceptionHandler;
import com.sentinelx.backend.repository.TransactionRepository;
import com.sentinelx.backend.service.RiskService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

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
class PhaseThreeVerificationTest {

    @Autowired
    private RiskService riskService;

    @Autowired
    private TransactionRepository transactionRepository;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        TransactionController controller = new TransactionController(riskService, transactionRepository);
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        mapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        org.springframework.http.converter.json.MappingJackson2HttpMessageConverter converter =
                new org.springframework.http.converter.json.MappingJackson2HttpMessageConverter(mapper);

        this.mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(converter)
                .build();
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
    @DisplayName("HTTP 403: Blocked transaction with blacklisted merchant returns 403 Forbidden")
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
                .andExpect(status().isForbidden())
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
                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", notNullValue()));
    }
}
