package com.sentinelx.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sentinelx.backend.dto.ReviewResolutionRequest;
import com.sentinelx.backend.entity.Device;
import com.sentinelx.backend.entity.ReviewQueue;
import com.sentinelx.backend.entity.Transaction;
import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.repository.DeviceRepository;
import com.sentinelx.backend.repository.ReviewQueueRepository;
import com.sentinelx.backend.repository.TransactionRepository;
import com.sentinelx.backend.repository.UserRepository;
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
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test suite verifying the ReviewQueueController endpoints and resolution workflow.
 */
@SpringBootTest
@ActiveProfiles("test")
class ReviewQueueControllerTest {

    @Autowired
    private ReviewQueueRepository reviewQueueRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        reviewQueueRepository.deleteAllInBatch();
        transactionRepository.deleteAllInBatch();
        this.mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
    }

    @Test
    @DisplayName("HTTP 200: Successfully fetch review queue cases")
    void testGetReviewQueue() throws Exception {
        User user = userRepository.findById("usr_1001").orElseGet(() ->
                userRepository.save(User.builder().id("usr_1001").email("alice@example.com").build()));

        Transaction txn = transactionRepository.save(Transaction.builder()
                .id("txn_rev_test_1")
                .user(user)
                .amount(new BigDecimal("150.00"))
                .currency("USD")
                .merchantId("mer_shop")
                .status("REVIEW")
                .timestamp(OffsetDateTime.now())
                .build());

        ReviewQueue queueItem = reviewQueueRepository.save(ReviewQueue.builder()
                .transaction(txn)
                .status("PENDING")
                .build());

        mockMvc.perform(get("/api/v1/reviews?status=PENDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[0].status", is("PENDING")));
    }

    @Test
    @DisplayName("HTTP 200: Successfully resolve review case as APPROVED and elevate device trust")
    void testResolveReviewApprovedElevatesDeviceTrust() throws Exception {
        User user = userRepository.findById("usr_1001").orElseGet(() ->
                userRepository.save(User.builder().id("usr_1001").email("alice@example.com").build()));

        Device untrustedDev = deviceRepository.save(Device.builder()
                .id("dev_untrusted_" + System.currentTimeMillis())
                .user(user)
                .fingerprint("fp_untrusted_" + System.currentTimeMillis())
                .ipAddress("198.51.100.99")
                .isTrusted(false)
                .build());

        Transaction txn = transactionRepository.save(Transaction.builder()
                .id("txn_rev_approve_" + System.currentTimeMillis())
                .user(user)
                .device(untrustedDev)
                .amount(new BigDecimal("250.00"))
                .currency("USD")
                .merchantId("mer_shop")
                .status("REVIEW")
                .timestamp(OffsetDateTime.now())
                .build());

        ReviewQueue queueItem = reviewQueueRepository.save(ReviewQueue.builder()
                .transaction(txn)
                .status("PENDING")
                .build());

        ReviewResolutionRequest request = ReviewResolutionRequest.builder()
                .status("APPROVED")
                .reviewerId("analyst_bob@sentinelx.com")
                .reviewerNotes("Customer verified via phone call")
                .build();

        mockMvc.perform(post("/api/v1/reviews/" + queueItem.getId() + "/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("APPROVED")))
                .andExpect(jsonPath("$.reviewerId", is("analyst_bob@sentinelx.com")));

        // Verify transaction is now APPROVED
        Transaction updatedTxn = transactionRepository.findById(txn.getId()).orElseThrow();
        assertThat(updatedTxn.getStatus()).isEqualTo("APPROVED");

        // Verify device is now trusted!
        Device updatedDev = deviceRepository.findById(untrustedDev.getId()).orElseThrow();
        assertThat(updatedDev.getIsTrusted()).isTrue();
    }
}
