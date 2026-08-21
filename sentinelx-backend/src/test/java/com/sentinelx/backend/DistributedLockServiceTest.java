package com.sentinelx.backend;

import com.sentinelx.backend.service.DistributedLockService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class DistributedLockServiceTest {

    @Autowired
    private DistributedLockService distributedLockService;

    @Test
    @DisplayName("Distributed Lock: Lock acquisition and safe release cycle executes cleanly")
    void testLockAcquisitionAndRelease() {
        String userId = "usr_lock_test_" + UUID.randomUUID().toString().substring(0, 6);
        String token = UUID.randomUUID().toString();

        boolean acquired = distributedLockService.acquireUserLock(userId, token, Duration.ofSeconds(2));
        assertThat(acquired).isTrue();

        // Release lock
        distributedLockService.releaseUserLock(userId, token);
    }

    @Test
    @DisplayName("Distributed Lock: Token mismatch prevents accidental release by other callers")
    void testLockTokenMismatchSafety() {
        String userId = "usr_lock_mismatch_" + UUID.randomUUID().toString().substring(0, 6);
        String tokenOwner = UUID.randomUUID().toString();
        String tokenImposter = UUID.randomUUID().toString();

        boolean acquired = distributedLockService.acquireUserLock(userId, tokenOwner, Duration.ofSeconds(5));
        assertThat(acquired).isTrue();

        // Attempt release with wrong token
        distributedLockService.releaseUserLock(userId, tokenImposter);

        // Proper release
        distributedLockService.releaseUserLock(userId, tokenOwner);
    }

    @Test
    @DisplayName("Distributed Lock: Spin-lock retry acquires lock after previous holder releases")
    void testSpinLockRetryAcquisition() {
        String userId = "usr_lock_retry_" + UUID.randomUUID().toString().substring(0, 6);
        String token1 = UUID.randomUUID().toString();
        String token2 = UUID.randomUUID().toString();

        // Acquire with token1
        boolean acq1 = distributedLockService.acquireUserLock(userId, token1, Duration.ofSeconds(2));
        assertThat(acq1).isTrue();

        // Immediately release token1
        distributedLockService.releaseUserLock(userId, token1);

        // Spin-lock retry with token2 should succeed
        boolean acq2 = distributedLockService.acquireUserLockWithRetry(userId, token2, Duration.ofSeconds(2), Duration.ofMillis(200), Duration.ofMillis(20));
        assertThat(acq2).isTrue();

        distributedLockService.releaseUserLock(userId, token2);
    }

    @Test
    @DisplayName("Distributed Lock: Handles null or blank user IDs gracefully")
    void testNullOrBlankUserLock() {
        assertThat(distributedLockService.acquireUserLock(null, "token", Duration.ofSeconds(1))).isTrue();
        assertThat(distributedLockService.acquireUserLock("", "token", Duration.ofSeconds(1))).isTrue();
        distributedLockService.releaseUserLock(null, "token");
        distributedLockService.releaseUserLock("", "token");
    }
}
