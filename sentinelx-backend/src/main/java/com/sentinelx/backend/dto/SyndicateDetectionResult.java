package com.sentinelx.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Outcome of a 2-hop graph syndicate search evaluating whether an account shares infrastructure with blocked fraudsters.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SyndicateDetectionResult {

    /**
     * True if a connection to a blocked fraud account was discovered within 2 hops.
     */
    private boolean syndicateDetected;

    /**
     * Unique ID of the primary connected blocked user account (if detected).
     */
    private String connectedBlockedUserId;

    /**
     * The shared entity mediating the connection (e.g. device fingerprint or IP address).
     */
    private String sharedEntityId;

    /**
     * Type of shared entity: "DEVICE", "IP", "CARD".
     */
    private String sharedEntityType;

    /**
     * Number of intermediate hops (1 or 2).
     */
    private int degreesOfSeparation;

    /**
     * List of all connected blocked user IDs within the cluster.
     */
    private List<String> allConnectedBlockedUsers;

    /**
     * Detailed human-readable explanation of the detected syndicate link.
     */
    private String explanation;
}
