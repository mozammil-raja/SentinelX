package com.sentinelx.backend;

import com.sentinelx.backend.dto.GraphNetworkResponse;
import com.sentinelx.backend.dto.SyndicateDetectionResult;
import com.sentinelx.backend.service.GraphSyndicateService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class GraphSyndicateServiceTest {

    @Autowired
    private GraphSyndicateService graphSyndicateService;

    @BeforeEach
    void setUp() {
        graphSyndicateService.initSeedGraph();
    }

    @Test
    @DisplayName("Graph Engine: Detects 2-hop connection when clean account transacts on device shared with blocked fraudster")
    void testDetectSyndicateSharedDevice() {
        // Known blocked user 'usr_1003' is associated with 'fp_charlie_phone'
        // Simulate new user 'usr_syndicate_new_victim' using the exact same phone fingerprint
        SyndicateDetectionResult result = graphSyndicateService.detectSyndicate(
                "usr_syndicate_new_victim",
                "fp_charlie_phone",
                "198.51.100.99",
                "411111"
        );

        assertThat(result).isNotNull();
        assertThat(result.isSyndicateDetected()).isTrue();
        assertThat(result.getConnectedBlockedUserId()).isEqualTo("usr_syndicate_banned_99");
        assertThat(result.getSharedEntityType()).isEqualTo("DEVICE");
        assertThat(result.getDegreesOfSeparation()).isEqualTo(2);
        assertThat(result.getExplanation()).contains("Syndicate Alert");
    }

    @Test
    @DisplayName("Graph Engine: Clean isolated user returns zero syndicate alerts")
    void testCleanIsolatedUser() {
        SyndicateDetectionResult result = graphSyndicateService.detectSyndicate(
                "usr_clean_isolated",
                "fp_clean_unique_mac",
                "198.51.100.222",
                "424242"
        );

        assertThat(result).isNotNull();
        assertThat(result.isSyndicateDetected()).isFalse();
        assertThat(result.getDegreesOfSeparation()).isEqualTo(0);
    }

    @Test
    @DisplayName("Graph Engine: Network topology export includes nodes and edges")
    void testGetNetworkTopology() {
        GraphNetworkResponse topology = graphSyndicateService.getNetworkTopology("usr_1001");

        assertThat(topology).isNotNull();
        assertThat(topology.getTotalNodes()).isGreaterThan(0);
        assertThat(topology.getNodes()).isNotEmpty();
    }
}
