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
}
