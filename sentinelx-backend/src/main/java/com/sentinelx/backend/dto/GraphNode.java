package com.sentinelx.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents an entity node within the SentinelX relationship graph.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GraphNode {

    /**
     * Unique node identifier (e.g. "usr_1001", "dev_fp_iphone15", "ip_198.51.100.10").
     */
    private String id;

    /**
     * Human-readable display label.
     */
    private String label;

    /**
     * Entity type: "USER", "DEVICE", "IP", "CARD".
     */
    private String type;

    /**
     * Whether this entity is associated with a banned / blocked fraudster.
     */
    private boolean isBlocked;

    /**
     * Risk level or score associated with this node.
     */
    private Integer riskScore;
}
