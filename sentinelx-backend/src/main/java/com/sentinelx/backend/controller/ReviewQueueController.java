package com.sentinelx.backend.controller;

import com.sentinelx.backend.dto.ReviewQueueResponse;
import com.sentinelx.backend.dto.ReviewResolutionRequest;
import com.sentinelx.backend.entity.ReviewQueue;
import com.sentinelx.backend.service.ReviewQueueService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * REST controller for managing human fraud analyst review queue cases.
 * 
 * <p>Enables querying pending reviews, inspecting suspicious transaction details,
 * submitting authoritative analyst resolutions (APPROVED / REJECTED), and automatically
 * elevating device trust upon resolution approval.</p>
 */
@RestController
@RequestMapping("/api/v1/reviews")
public class ReviewQueueController {

    private final ReviewQueueService reviewQueueService;

    public ReviewQueueController(ReviewQueueService reviewQueueService) {
        this.reviewQueueService = reviewQueueService;
    }

    /**
     * Retrieves all review queue cases, optionally filtered by status (e.g. PENDING).
     *
     * @param status Optional filter: "PENDING", "APPROVED", "REJECTED"
     * @return List of matching ReviewQueue presentation DTOs ordered newest first
     */
    @GetMapping
    public ResponseEntity<List<ReviewQueueResponse>> getReviewQueue(@RequestParam(required = false) String status) {
        List<ReviewQueue> results = reviewQueueService.getReviewQueue(status);
        List<ReviewQueueResponse> responses = results.stream()
                .map(ReviewQueueResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    /**
     * Retrieves a specific review queue case by ID.
     *
     * @param id Unique review queue identifier
     * @return ReviewQueue presentation DTO
     */
    @GetMapping("/{id}")
    public ResponseEntity<ReviewQueueResponse> getReviewById(@PathVariable Long id) {
        ReviewQueue item = reviewQueueService.getReviewById(id);
        return ResponseEntity.ok(ReviewQueueResponse.fromEntity(item));
    }

    /**
     * Authoritatively resolves a review queue case as APPROVED or REJECTED.
     * Updates the review status, modifies the transaction status, and marks the user device as trusted if approved.
     *
     * @param id      Review queue ID
     * @param request Validated resolution request payload
     * @return Updated ReviewQueue presentation DTO
     */
    @PostMapping("/{id}/resolve")
    public ResponseEntity<ReviewQueueResponse> resolveReview(
            @PathVariable Long id,
            @Valid @RequestBody ReviewResolutionRequest request) {
        ReviewQueue saved = reviewQueueService.resolveReview(id, request);
        return ResponseEntity.ok(ReviewQueueResponse.fromEntity(saved));
    }
}
