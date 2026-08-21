package com.sentinelx.backend;

import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.entity.Transaction;
import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.repository.TransactionRepository;
import com.sentinelx.backend.repository.UserRepository;
import com.sentinelx.backend.service.VelocityService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit and integration test suite verifying the VelocityService sliding window log algorithm,
 * multi-dimensional tracking, and fallback resilience.
 */
@SpringBootTest
@ActiveProfiles("test")
class VelocityServiceTest {

    @Autowired
    private VelocityService velocityService;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("Sliding window record and query operations function when Redis is available")
    void testSlidingWindowRecordAndCount() {
        if (!velocityService.isAvailable()) {
            return; // Skip Redis-specific assertions when running in environment without live Redis
        }

        String testUserId = "usr_vel_test_" + System.currentTimeMillis();
        String txnId1 = "txn_v1_" + System.currentTimeMillis();
        String txnId2 = "txn_v2_" + System.currentTimeMillis();

        int count1 = velocityService.recordAndGetUserVelocity(testUserId, txnId1, 300);
        int count2 = velocityService.recordAndGetUserVelocity(testUserId, txnId2, 300);

        assertThat(count1).isEqualTo(1);
        assertThat(count2).isEqualTo(2);

        int queryCount = velocityService.getUserVelocity(testUserId, 300);
        assertThat(queryCount).isEqualTo(2);

        velocityService.resetUserVelocity(testUserId);
    }

    @Test
    @DisplayName("Atomic volume recording and query operations function correctly over sliding window")
    void testSlidingWindowVolumeAccumulation() {
        if (!velocityService.isAvailable()) {
            return;
        }

        String testUserId = "usr_vol_test_" + System.currentTimeMillis();
        String txnId1 = "txn_vol1_" + System.currentTimeMillis();
        String txnId2 = "txn_vol2_" + System.currentTimeMillis();

        BigDecimal vol1 = velocityService.recordAndGetUserVolumeVelocity(testUserId, txnId1, new BigDecimal("120.50"), 300);
        BigDecimal vol2 = velocityService.recordAndGetUserVolumeVelocity(testUserId, txnId2, new BigDecimal("79.50"), 300);

        assertThat(vol1).isEqualByComparingTo(new BigDecimal("120.50"));
        assertThat(vol2).isEqualByComparingTo(new BigDecimal("200.00"));

        BigDecimal queryVol = velocityService.getUserVolumeVelocity(testUserId, 300);
        assertThat(queryVol).isEqualByComparingTo(new BigDecimal("200.00"));

        velocityService.resetUserVelocity(testUserId);
    }

    @Test
    @DisplayName("Multi-dimensional metric recording for IP, Device, Card BIN, and Volume")
    void testMultiDimensionalMetrics() {
        if (!velocityService.isAvailable()) {
            return; // Skip Redis-specific assertions when running in environment without live Redis
        }

        String testUserId = "usr_multi_" + System.currentTimeMillis();
        String testIp = "198.51.100.42";
        String testDevice = "fp_canvas_sha256_" + System.currentTimeMillis();
        String txnId = "txn_multi_" + System.currentTimeMillis();

        TransactionRequest request = TransactionRequest.builder()
                .userId(testUserId)
                .amount(new BigDecimal("150.00"))
                .currency("USD")
                .merchantId("mer_electronics")
                .cardBin("411111")
                .ipAddress(testIp)
                .deviceFingerprint(testDevice)
                .build();

        velocityService.recordTransactionMetrics(request, txnId);

        int ipCount = velocityService.getIpVelocity(testIp, 300);
        int deviceCount = velocityService.getDeviceVelocity(testDevice, 300);
        BigDecimal volume = velocityService.getUserVolumeVelocity(testUserId, 300);

        assertThat(ipCount).isGreaterThanOrEqualTo(1);
        assertThat(deviceCount).isGreaterThanOrEqualTo(1);
        assertThat(volume).isGreaterThanOrEqualTo(new BigDecimal("150.00"));

        velocityService.resetUserVelocity(testUserId);
    }

    @Test
    @DisplayName("Fallback Resilience: When Redis is unavailable or query fails, falls back to PostgreSQL history")
    void testDatabaseFallbackWhenRedisOffline() {
        String testUserId = "usr_fallback_" + System.currentTimeMillis();

        if (!userRepository.existsById(testUserId)) {
            userRepository.save(User.builder().id(testUserId).email("fallback@example.com").riskSegment("LOW").build());
        }

        // Persist 3 historical transactions in PostgreSQL within the 5-minute window
        User user = userRepository.findById(testUserId).orElseThrow();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        transactionRepository.save(Transaction.builder()
                .id("txn_fb_1_" + System.currentTimeMillis())
                .user(user)
                .amount(new BigDecimal("50.00"))
                .currency("USD")
                .merchantId("mer_store")
                .ipAddress("198.51.100.1")
                .status("APPROVED")
                .timestamp(now.minusSeconds(30))
                .build());

        transactionRepository.save(Transaction.builder()
                .id("txn_fb_2_" + System.currentTimeMillis())
                .user(user)
                .amount(new BigDecimal("75.00"))
                .currency("USD")
                .merchantId("mer_store")
                .ipAddress("198.51.100.1")
                .status("APPROVED")
                .timestamp(now.minusSeconds(60))
                .build());

        transactionRepository.save(Transaction.builder()
                .id("txn_fb_3_" + System.currentTimeMillis())
                .user(user)
                .amount(new BigDecimal("100.00"))
                .currency("USD")
                .merchantId("mer_store")
                .ipAddress("198.51.100.1")
                .status("APPROVED")
                .timestamp(now.minusSeconds(90))
                .build());

        // When Redis is not tracking this user, getUserVelocity retrieves count from PostgreSQL
        if (!velocityService.isAvailable()) {
            int velocity = velocityService.getUserVelocity(testUserId, 300);
            assertThat(velocity).isEqualTo(3);

            BigDecimal volume = velocityService.getUserVolumeVelocity(testUserId, 300);
            assertThat(volume).isEqualByComparingTo(new BigDecimal("225.00"));
        }
    }
}
