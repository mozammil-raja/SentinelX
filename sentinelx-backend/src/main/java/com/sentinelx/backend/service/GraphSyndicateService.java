package com.sentinelx.backend.service;

import com.sentinelx.backend.dto.GraphEdge;
import com.sentinelx.backend.dto.GraphNetworkResponse;
import com.sentinelx.backend.dto.GraphNode;
import com.sentinelx.backend.dto.SyndicateDetectionResult;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * In-Memory Bipartite Graph Syndicate & Fraud Ring Detection Engine.
 *
 * <p>Maintains dynamic relationship links between Users, Devices, IPs, and Payment Cards.
 * Executes sub-millisecond 2-hop Breadth-First Search (BFS) shortest-path traversals to
 * identify whether an account shares physical infrastructure with known blocked fraudsters.</p>
 */
@Service
public class GraphSyndicateService {

    private static final Logger log = LoggerFactory.getLogger(GraphSyndicateService.class);

    private final Map<String, GraphNode> nodes = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> adjacencyList = new ConcurrentHashMap<>();
    private final Map<String, GraphEdge> edges = new ConcurrentHashMap<>();
    private final Set<String> blockedUsers = ConcurrentHashMap.newKeySet();

    @PostConstruct
    public void initSeedGraph() {
        nodes.clear();
        adjacencyList.clear();
        edges.clear();
        blockedUsers.clear();

        // Seed known historical fraud syndicate network
        markUserBlocked("usr_syndicate_banned_99");
        recordConnection("usr_syndicate_banned_99", "fp_charlie_phone", "203.0.113.88", "550000", true);
        
        markUserBlocked("usr_botnet_controller_01");
        recordConnection("usr_botnet_controller_01", "fp_shared_syndicate_ipad", "203.0.113.99", "540000", true);

        // Clean user Alice
        recordConnection("usr_1001", "fp_alice_iphone15_sha256", "198.51.100.10", "411111", false);
        // Clean user Bob
        recordConnection("usr_1002", "fp_bob_macbook_pro", "198.51.100.20", "424242", false);

        log.info("Graph Syndicate Engine initialized with {} nodes and {} edges", nodes.size(), edges.size());
    }

    /**
     * Records transaction entity associations and constructs bi-directional graph links.
     */
    public void recordConnection(String userId, String deviceFingerprint, String ipAddress, String cardBin, boolean isBlocked) {
        if (userId == null || userId.isBlank()) {
            return;
        }

        // 1. User Node
        String userNodeId = "usr:" + userId.trim();
        nodes.put(userNodeId, GraphNode.builder()
                .id(userNodeId)
                .label(userId)
                .type("USER")
                .isBlocked(isBlocked || blockedUsers.contains(userId.trim()))
                .riskScore(isBlocked ? 90 : 10)
                .build());

        if (isBlocked) {
            blockedUsers.add(userId.trim());
        }

        // 2. Device Node & Edge
        if (deviceFingerprint != null && !deviceFingerprint.isBlank()) {
            String devNodeId = "dev:" + deviceFingerprint.trim();
            nodes.putIfAbsent(devNodeId, GraphNode.builder()
                    .id(devNodeId)
                    .label("Device: " + (deviceFingerprint.length() > 14 ? deviceFingerprint.substring(0, 14) + "..." : deviceFingerprint))
                    .type("DEVICE")
                    .isBlocked(false)
                    .riskScore(0)
                    .build());

            addEdge(userNodeId, devNodeId, "USED_DEVICE");
        }

        // 3. IP Node & Edge
        if (ipAddress != null && !ipAddress.isBlank()) {
            String ipNodeId = "ip:" + ipAddress.trim();
            nodes.putIfAbsent(ipNodeId, GraphNode.builder()
                    .id(ipNodeId)
                    .label("IP: " + ipAddress)
                    .type("IP")
                    .isBlocked(false)
                    .riskScore(0)
                    .build());

            addEdge(userNodeId, ipNodeId, "SHARED_IP");
        }

        // 4. Card BIN Node & Edge
        if (cardBin != null && !cardBin.isBlank()) {
            String cardNodeId = "card:" + cardBin.trim();
            nodes.putIfAbsent(cardNodeId, GraphNode.builder()
                    .id(cardNodeId)
                    .label("BIN: " + cardBin)
                    .type("CARD")
                    .isBlocked(false)
                    .riskScore(0)
                    .build());

            addEdge(userNodeId, cardNodeId, "USED_CARD");
        }
    }

    /**
     * Executes 2-hop BFS traversal to discover whether the target transaction is linked to any blocked accounts via shared hardware or cards.
     */
    public SyndicateDetectionResult detectSyndicate(String userId, String deviceFingerprint, String ipAddress, String cardBin) {
        return detectSyndicate(userId, deviceFingerprint, ipAddress, cardBin, true, true, false);
    }

    /**
     * Parameterized syndicate detection with configurable inspection dimensions.
     */
    public SyndicateDetectionResult detectSyndicate(String userId,
                                                   String deviceFingerprint,
                                                   String ipAddress,
                                                   String cardBin,
                                                   boolean inspectDevices,
                                                   boolean inspectCards,
                                                   boolean inspectIps) {
        if (userId == null) {
            return SyndicateDetectionResult.builder().syndicateDetected(false).build();
        }

        String userNodeId = "usr:" + userId.trim();
        List<String> startingEntities = new ArrayList<>();

        if (inspectDevices && deviceFingerprint != null && !deviceFingerprint.isBlank()) {
            startingEntities.add("dev:" + deviceFingerprint.trim());
        }
        if (inspectCards && cardBin != null && !cardBin.isBlank()) {
            startingEntities.add("card:" + cardBin.trim());
        }
        if (inspectIps && ipAddress != null && !ipAddress.isBlank()) {
            startingEntities.add("ip:" + ipAddress.trim());
        }

        // Also inspect existing hardware/card connections from the user node
        Set<String> userNeighbors = adjacencyList.getOrDefault(userNodeId, Collections.emptySet());
        for (String neighbor : userNeighbors) {
            if ((inspectDevices && neighbor.startsWith("dev:")) ||
                (inspectCards && neighbor.startsWith("card:")) ||
                (inspectIps && neighbor.startsWith("ip:"))) {
                startingEntities.add(neighbor);
            }
        }

        Set<String> connectedBlockedUsers = new HashSet<>();
        String primaryBlockedUser = null;
        String sharedEntityId = null;
        String sharedEntityType = null;

        for (String entityId : startingEntities) {
            Set<String> associatedNodes = adjacencyList.getOrDefault(entityId, Collections.emptySet());
            for (String neighbor : associatedNodes) {
                if (neighbor.startsWith("usr:") && !neighbor.equals(userNodeId)) {
                    String candidateUserId = neighbor.substring(4);
                    if (blockedUsers.contains(candidateUserId)) {
                        connectedBlockedUsers.add(candidateUserId);
                        if (primaryBlockedUser == null) {
                            primaryBlockedUser = candidateUserId;
                            sharedEntityId = entityId;
                            sharedEntityType = entityId.startsWith("dev:") ? "DEVICE" : (entityId.startsWith("card:") ? "CARD" : "IP");
                        }
                    }
                }
            }
        }

        if (!connectedBlockedUsers.isEmpty()) {
            String explanation = String.format(
                    "Syndicate Alert: Account shares infrastructure (%s '%s') with known blocked fraudster '%s' (2 degrees of separation).",
                    sharedEntityType, sharedEntityId, primaryBlockedUser);

            return SyndicateDetectionResult.builder()
                    .syndicateDetected(true)
                    .connectedBlockedUserId(primaryBlockedUser)
                    .sharedEntityId(sharedEntityId)
                    .sharedEntityType(sharedEntityType)
                    .degreesOfSeparation(2)
                    .allConnectedBlockedUsers(new ArrayList<>(connectedBlockedUsers))
                    .explanation(explanation)
                    .build();
        }

        return SyndicateDetectionResult.builder()
                .syndicateDetected(false)
                .degreesOfSeparation(0)
                .allConnectedBlockedUsers(Collections.emptyList())
                .explanation("No shared infrastructure connections with blocked accounts detected.")
                .build();
    }

    /**
     * Builds and returns the 2-hop sub-graph network topology centered around a given user.
     */
    public GraphNetworkResponse getNetworkTopology(String focusUserId) {
        String focusNodeId = "usr:" + (focusUserId != null ? focusUserId.trim() : "usr_1001");
        Set<String> targetNodes = new HashSet<>();

        if (nodes.containsKey(focusNodeId)) {
            targetNodes.add(focusNodeId);
        } else {
            // Fallback: return top 25 nodes
            targetNodes.addAll(nodes.keySet().stream().limit(25).collect(Collectors.toSet()));
        }

        // 1-Hop neighbors
        Set<String> hop1 = new HashSet<>();
        for (String id : targetNodes) {
            hop1.addAll(adjacencyList.getOrDefault(id, Collections.emptySet()));
        }
        targetNodes.addAll(hop1);

        // 2-Hop neighbors
        Set<String> hop2 = new HashSet<>();
        for (String id : hop1) {
            hop2.addAll(adjacencyList.getOrDefault(id, Collections.emptySet()));
        }
        targetNodes.addAll(hop2);

        List<GraphNode> resultNodes = targetNodes.stream()
                .map(nodes::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        List<GraphEdge> resultEdges = edges.values().stream()
                .filter(e -> targetNodes.contains(e.getSource()) && targetNodes.contains(e.getTarget()))
                .collect(Collectors.toList());

        boolean hasBlocked = resultNodes.stream().anyMatch(GraphNode::isBlocked);
        SyndicateDetectionResult detection = detectSyndicate(focusUserId, null, null, null);

        return GraphNetworkResponse.builder()
                .focusUserId(focusUserId)
                .totalNodes(resultNodes.size())
                .totalEdges(resultEdges.size())
                .hasBlockedConnections(hasBlocked)
                .nodes(resultNodes)
                .edges(resultEdges)
                .syndicateAnalysis(detection)
                .build();
    }

    /**
     * Returns global graph summary statistics.
     */
    public Map<String, Object> getGraphSummary() {
        long userCount = nodes.values().stream().filter(n -> "USER".equals(n.getType())).count();
        long deviceCount = nodes.values().stream().filter(n -> "DEVICE".equals(n.getType())).count();
        long ipCount = nodes.values().stream().filter(n -> "IP".equals(n.getType())).count();
        long cardCount = nodes.values().stream().filter(n -> "CARD".equals(n.getType())).count();

        return Map.of(
                "totalNodes", nodes.size(),
                "totalEdges", edges.size(),
                "totalUsers", userCount,
                "totalDevices", deviceCount,
                "totalIps", ipCount,
                "totalCards", cardCount,
                "blockedUsersCount", blockedUsers.size()
        );
    }

    public void markUserBlocked(String userId) {
        if (userId != null) {
            String cleanId = userId.trim();
            blockedUsers.add(cleanId);
            String userNodeId = "usr:" + cleanId;
            GraphNode node = nodes.get(userNodeId);
            if (node != null) {
                node.setBlocked(true);
                node.setRiskScore(95);
            }
        }
    }

    private void addEdge(String src, String dst, String rel) {
        adjacencyList.computeIfAbsent(src, k -> ConcurrentHashMap.newKeySet()).add(dst);
        adjacencyList.computeIfAbsent(dst, k -> ConcurrentHashMap.newKeySet()).add(src);

        String edgeKey = src + "->" + dst;
        edges.putIfAbsent(edgeKey, GraphEdge.builder()
                .source(src)
                .target(dst)
                .relationship(rel)
                .weight(1)
                .build());
    }
}
