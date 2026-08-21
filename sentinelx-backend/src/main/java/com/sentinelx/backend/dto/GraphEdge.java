package com.sentinelx.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a relationship edge linking two entity nodes in the graph.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GraphEdge {

    /**
     * Source node identifier.
     */
    private String source;

    /**
     * Target node identifier.
     */
    private String target;

    /**
     * Relationship type: "USED_DEVICE", "SHARED_IP", "USED_CARD".
     */
    private String relationship;

    /**
     * Number of times this relationship was observed.
     */
    @Builder.Default
    private int weight = 1;
}
