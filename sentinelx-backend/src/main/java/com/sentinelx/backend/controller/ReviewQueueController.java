package com.sentinelx.backend.controller;

import com.sentinelx.backend.dto.ReviewResolutionRequest;
import com.sentinelx.backend.entity.Device;
import com.sentinelx.backend.entity.ReviewQueue;
import com.sentinelx.backend.entity.Transaction;
import com.sentinelx.backend.exception.ResourceNotFoundException;
import com.sentinelx.backend.repository.DeviceRepository;
import com.sentinelx.backend.repository.ReviewQueueRepository;
import com.sentinelx.backend.repository.TransactionRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * REST controller for managing human fraud analyst review queue cases.
 * 
 * <p>Enables querying pending reviews, inspecting suspicious transaction details,
 * submitting authoritative analyst resolutions (APPROVED / REJECTED), and automatically
 * elevating device trust upon resolution approval.</p>
 */
@RestController
@RequestMapping("/api/v1/reviews")
@CrossOrigin(origins = "*")
public class ReviewQueueController {

    private final ReviewQueueRepository reviewQueueRepository;
    private final TransactionRepository transactionRepository;
    private final DeviceRepository deviceRepository;

    public ReviewQueueController(ReviewQueueRepository reviewQueueRepository,
                                 TransactionRepository transactionRepository,
                                 DeviceRepository deviceRepository) {
        this.reviewQueueRepository = reviewQueueRepository;
        this.transactionRepository = transactionRepository;
        this.deviceRepository = deviceRepository;
    }

    /**
     * Retrieves all review queue cases, optionally filtered by status (e.g. PENDING).
     *
     * @param status Optional filter: "PENDING", "APPROVED", "REJECTED"
     * @return List of matching ReviewQueue items ordered newest first
     */
    @GetMapping
    public ResponseEntity<List<ReviewQueue>> getReviewQueue(@RequestParam(required = false) String status) {
        List<ReviewQueue> results;
        if (status != null && !status.isBlank()) {
            results = reviewQueueRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase());
        } else {
            results = reviewQueueRepository.findAllByOrderByCreatedAtDesc();
        }
        return ResponseEntity.ok(results);
    }

    /**
     * Retrieves a specific review queue case by ID.
     *
     * @param id Unique review queue identifier
     * @return ReviewQueue item
     */
    @GetMapping("/{id}")
    public ResponseEntity<ReviewQueue> getReviewById(@PathVariable Long id) {
        ReviewQueue item = reviewQueueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Review queue item not found with ID: " + id));
        return ResponseEntity.ok(item);
    }

    /**
     * Authoritatively resolves a review queue case as APPROVED or REJECTED.
     * Updates the review status, modifies the transaction status, and marks the user device as trusted if approved.
     *
     * @param id      Review queue ID
     * @param request Validated resolution request payload
     * @return Updated ReviewQueue item
     */
    @PostMapping("/{id}/resolve")
    @Transactional
    public ResponseEntity<ReviewQueue> resolveReview(
            @PathVariable Long id,
            @Valid @RequestBody ReviewResolutionRequest request) {
        ReviewQueue item = reviewQueueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Review queue item not found with ID: " + id));

        String resolvedStatus = request.getStatus().toUpperCase();
        item.setStatus(resolvedStatus);
        item.setReviewerId(request.getReviewerId());
        item.setReviewerNotes(request.getReviewerNotes());
        item.setReviewedAt(OffsetDateTime.now());

        // Update underlying transaction status
        Transaction transaction = item.getTransaction();
        if (transaction != null) {
            String txnStatus = "APPROVED".equals(resolvedStatus) ? "APPROVED" : "BLOCKED";
            transaction.setStatus(txnStatus);
            transactionRepository.save(transaction);

            // If approved, elevate device trust
            Device device = transaction.getDevice();
            if (device != null && "APPROVED".equals(resolvedStatus)) {
                device.setIsTrusted(true);
                deviceRepository.save(device);
            }
        }

        ReviewQueue saved = reviewQueueRepository.save(item);
        return ResponseEntity.ok(saved);
    }
}
