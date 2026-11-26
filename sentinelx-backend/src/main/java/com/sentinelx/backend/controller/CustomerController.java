package com.sentinelx.backend.controller;

import com.sentinelx.backend.dto.CustomerResponse;
import com.sentinelx.backend.dto.RiskRecalculationResult;
import com.sentinelx.backend.entity.Decision;
import com.sentinelx.backend.entity.Device;
import com.sentinelx.backend.entity.Transaction;
import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.exception.ResourceNotFoundException;
import com.sentinelx.backend.repository.DecisionRepository;
import com.sentinelx.backend.repository.DeviceRepository;
import com.sentinelx.backend.repository.ReviewQueueRepository;
import com.sentinelx.backend.repository.UserRepository;
import com.sentinelx.backend.repository.TransactionRepository;
import com.sentinelx.backend.service.GraphSyndicateService;
import com.sentinelx.backend.service.VelocityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controller providing customer behavioral baseline profiles for the SentinelX simulation studio.
 */
@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
@Tag(name = "Customer Behavioral Profiles", description = "Endpoints for retrieving synthetic customer profiles and behavioral baselines")
public class CustomerController {

    private final UserRepository userRepository;
    private final DeviceRepository deviceRepository;
    private final TransactionRepository transactionRepository;
    private final DecisionRepository decisionRepository;
    private final ReviewQueueRepository reviewQueueRepository;
    private final VelocityService velocityService;
    private final GraphSyndicateService graphSyndicateService;

    private static final List<String> PRIORITY_PERSONA_ORDER = List.of(
            "usr_alice", "usr_arjun", "usr_sarah", "usr_david", "usr_viktor"
    );

    @GetMapping
    @Operation(summary = "List all customer behavioral profiles with their spending and location baselines")
    public ResponseEntity<List<CustomerResponse>> listCustomers() {
        List<User> users = userRepository.findAll();
        List<CustomerResponse> responses = users.stream()
                .map(this::toCustomerResponse)
                .sorted(Comparator.comparingInt(c -> {
                    int idx = PRIORITY_PERSONA_ORDER.indexOf(c.getId());
                    return idx >= 0 ? idx : 999;
                }))
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Retrieve a specific customer baseline profile by ID")
    public ResponseEntity<CustomerResponse> getCustomerById(@PathVariable String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));
        return ResponseEntity.ok(toCustomerResponse(user));
    }

    @PostMapping("/{id}/reset")
    @Transactional
    @Operation(summary = "Reset a customer's simulated transactions, untrusted devices, Redis velocity, and graph links back to the seeded baseline")
    public ResponseEntity<Map<String, String>> resetCustomerSimulation(@PathVariable String id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("Customer not found with id: " + id);
        }
        reviewQueueRepository.deleteSimulatedByUserId(id);
        decisionRepository.deleteSimulatedByUserId(id);
        transactionRepository.deleteSimulatedByUserId(id);
        deviceRepository.deleteSimulatedUntrustedByUserId(id);
        velocityService.resetUserVelocity(id);
        graphSyndicateService.resetToSeedState();
        return ResponseEntity.ok(Map.of("status", "reset", "userId", id));
    }

    @PostMapping("/recalculate-risk")
    @Transactional
    @Operation(summary = "Recalculate risk segments for all 5 personas based on their last 10 stored transactions")
    public ResponseEntity<List<RiskRecalculationResult>> recalculateAllRiskTiers() {
        List<RiskRecalculationResult> results = new ArrayList<>();

        for (String userId : PRIORITY_PERSONA_ORDER) {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                continue;
            }

            String previousSegment = user.getRiskSegment() != null ? user.getRiskSegment().toUpperCase() : "MEDIUM";
            long totalTxns = transactionRepository.countByUserId(userId);
            List<Transaction> recentTxns = transactionRepository.findByUserIdOrderByTimestampDesc(userId, PageRequest.of(0, 10));

            int approved = 0;
            int review = 0;
            int blocked = 0;
            for (Transaction t : recentTxns) {
                String st = t.getStatus() != null ? t.getStatus().toUpperCase() : "APPROVED";
                if ("BLOCKED".equals(st)) blocked++;
                else if ("REVIEW".equals(st)) review++;
                else approved++;
            }

            List<String> txnIds = recentTxns.stream().map(Transaction::getId).collect(Collectors.toList());
            Map<String, Integer> scoreByTxnId = txnIds.isEmpty()
                    ? Map.of()
                    : decisionRepository.findByTransactionIdIn(txnIds).stream()
                            .collect(Collectors.toMap(
                                    Decision::getTransactionId,
                                    d -> d.getFinalScore() != null ? d.getFinalScore() : 0,
                                    (a, b) -> a
                            ));

            int scoreSum = 0;
            int scoreCount = 0;
            for (Transaction t : recentTxns) {
                Integer s = scoreByTxnId.get(t.getId());
                if (s != null) {
                    scoreSum += s;
                    scoreCount++;
                }
            }
            int avgScore = scoreCount > 0 ? Math.round((float) scoreSum / scoreCount) : 0;

            String newSegment;
            String reason;
            if (blocked >= 4 || avgScore >= 65) {
                newSegment = "CRITICAL";
                reason = String.format("%d blocked txns & avg score %d/100 in last %d txns", blocked, avgScore, recentTxns.size());
            } else if (blocked >= 2 || avgScore >= 35) {
                newSegment = "HIGH";
                reason = String.format("%d blocked txns & avg score %d/100 in last %d txns", blocked, avgScore, recentTxns.size());
            } else if ((blocked + review) >= 1 || avgScore >= 15) {
                newSegment = "MEDIUM";
                reason = String.format("%d flagged (review/block) & avg score %d/100 in last %d txns", blocked + review, avgScore, recentTxns.size());
            } else {
                newSegment = "LOW";
                reason = String.format("%d clean approved txns & avg score %d/100 in last %d txns", approved, avgScore, recentTxns.size());
            }

            boolean changed = !previousSegment.equals(newSegment);
            if (changed) {
                user.setRiskSegment(newSegment);
                userRepository.save(user);
            }

            results.add(RiskRecalculationResult.builder()
                    .userId(user.getId())
                    .name(user.getName() != null ? user.getName() : user.getEmail())
                    .previousRiskSegment(previousSegment)
                    .newRiskSegment(newSegment)
                    .changed(changed)
                    .totalTransactions(totalTxns)
                    .recentWindowSize(recentTxns.size())
                    .recentApprovedCount(approved)
                    .recentReviewCount(review)
                    .recentBlockedCount(blocked)
                    .recentAverageScore(avgScore)
                    .reason(reason)
                    .build());
        }

        return ResponseEntity.ok(results);
    }

    private CustomerResponse toCustomerResponse(User user) {
        List<Device> devices = deviceRepository.findByUserId(user.getId());
        List<String> trustedFp = devices.stream()
                .filter(d -> Boolean.TRUE.equals(d.getIsTrusted()))
                .map(Device::getFingerprint)
                .collect(Collectors.toList());

        Device primaryDev = devices.isEmpty() ? null : devices.get(0);
        String primaryFp = primaryDev != null ? primaryDev.getFingerprint() : (user.getId() + "_primary_device");
        String usualIp = primaryDev != null ? primaryDev.getIpAddress() : (user.getUsualIpSubnet() != null ? user.getUsualIpSubnet() + "10" : "198.51.100.10");

        long txnCount = transactionRepository.countByUserId(user.getId());

        return CustomerResponse.builder()
                .id(user.getId())
                .name(user.getName() != null ? user.getName() : user.getEmail())
                .email(user.getEmail())
                .riskSegment(user.getRiskSegment() != null ? user.getRiskSegment() : "MEDIUM")
                .typicalSpendMin(user.getTypicalSpendMin())
                .typicalSpendMax(user.getTypicalSpendMax())
                .currency(user.getCurrency() != null ? user.getCurrency() : "INR")
                .usualLocation(user.getUsualLocation() != null ? user.getUsualLocation() : "Delhi, India")
                .usualIp(usualIp)
                .primaryDevice(user.getPrimaryDevice() != null ? user.getPrimaryDevice() : "Mobile App / Browser")
                .primaryDeviceFingerprint(primaryFp)
                .dailyTxnCount(user.getDailyTxnCount() != null ? user.getDailyTxnCount() : 3)
                .occupation(user.getOccupation() != null ? user.getOccupation() : "Account Holder")
                .trustedDeviceFingerprints(trustedFp)
                .historicalTxnCount(txnCount)
                .build();
    }
}
