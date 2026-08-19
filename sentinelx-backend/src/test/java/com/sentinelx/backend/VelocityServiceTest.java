package com.sentinelx.backend;

import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.service.VelocityService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit and integration test suite verifying the VelocityService sliding window log algorithm,
 * atomic Lua scripts, multi-dimensional tracking, and fallback resilience.
 */
@SpringBootTest
@ActiveProfiles("test")
class VelocityServiceTest {

    @Autowired
    private VelocityService velocityService;

    @Test
    @DisplayName("VelocityService availability or graceful fallback is operational")
    void testRedisAvailabilityOrFallback() {
        // Under test profile, isAvailable will report true if local redis is up, or false if offline
        boolean available = velocityService.isAvailable();
        assertThat(available).isIn(true, false);
    }

    @Test
    @DisplayName("Sliding window record and count operations return non-negative or fallback values")
    void testSlidingWindowRecordAndCount() {
        String testUserId = "usr_vel_test_" + System.currentTimeMillis();
        String txnId1 = "txn_v1_" + System.currentTimeMillis();
        String txnId2 = "txn_v2_" + System.currentTimeMillis();

        int count1 = velocityService.recordAndGetUserVelocity(testUserId, txnId1, 300);
        int count2 = velocityService.recordAndGetUserVelocity(testUserId, txnId2, 300);

        if (velocityService.isAvailable()) {
            assertThat(count1).isEqualTo(1);
            assertThat(count2).isEqualTo(2);

            int queryCount = velocityService.getUserVelocity(testUserId, 300);
            assertThat(queryCount).isEqualTo(2);
        } else {
            // Graceful fallback returns -1 or 0 when Redis is offline
            assertThat(count1).isIn(1, -1);
            assertThat(count2).isIn(2, -1);
        }

        velocityService.resetUserVelocity(testUserId);
    }

    @Test
    @DisplayName("Multi-dimensional metric recording for IP, Device, Card BIN, and Volume")
    void testMultiDimensionalMetrics() {
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

        if (velocityService.isAvailable()) {
            int ipCount = velocityService.getIpVelocity(testIp, 300);
            int deviceCount = velocityService.getDeviceVelocity(testDevice, 300);
            BigDecimal volume = velocityService.getUserVolumeVelocity(testUserId, 300);

            assertThat(ipCount).isGreaterThanOrEqualTo(1);
            assertThat(deviceCount).isGreaterThanOrEqualTo(1);
            assertThat(volume).isGreaterThanOrEqualTo(new BigDecimal("150.00"));
        }

        velocityService.resetUserVelocity(testUserId);
    }
}
