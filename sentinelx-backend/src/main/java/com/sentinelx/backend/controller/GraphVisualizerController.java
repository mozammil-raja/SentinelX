package com.sentinelx.backend.controller;

import com.sentinelx.backend.dto.GraphNetworkResponse;
import com.sentinelx.backend.service.GraphSyndicateService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for exploring the entity relationship graph and syndicate fraud ring clusters.
 */
@RestController
@RequestMapping("/api/v1/graph")
public class GraphVisualizerController {

    private final GraphSyndicateService graphSyndicateService;

    public GraphVisualizerController(GraphSyndicateService graphSyndicateService) {
        this.graphSyndicateService = graphSyndicateService;
    }

    /**
     * Retrieves the 2-hop graph sub-network centered on a specific user.
     */
    @GetMapping("/network/{userId}")
    public ResponseEntity<GraphNetworkResponse> getNetworkTopology(@PathVariable String userId) {
        GraphNetworkResponse response = graphSyndicateService.getNetworkTopology(userId);
        return ResponseEntity.ok(response);
    }

    /**
     * Returns global graph network statistics.
     */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getGraphSummary() {
        return ResponseEntity.ok(graphSyndicateService.getGraphSummary());
    }

    /**
     * Manually marks a user node as BLOCKED in the graph engine.
     */
    @PostMapping("/block/{userId}")
    public ResponseEntity<Map<String, String>> blockUserInGraph(@PathVariable String userId) {
        graphSyndicateService.markUserBlocked(userId);
        return ResponseEntity.ok(Map.of("message", "User " + userId + " marked as BLOCKED in graph relationship network"));
    }
}
