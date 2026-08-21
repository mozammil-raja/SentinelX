package com.sentinelx.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Visual node-link network payload returned by the Graph REST API.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GraphNetworkResponse {

    private String focusUserId;
    private int totalNodes;
    private int totalEdges;
    private boolean hasBlockedConnections;
    private List<GraphNode> nodes;
    private List<GraphEdge> edges;
    private SyndicateDetectionResult syndicateAnalysis;
}
