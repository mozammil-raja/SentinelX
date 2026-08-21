package com.sentinelx.backend.service;

import com.sentinelx.backend.dto.ReviewResolutionRequest;
import com.sentinelx.backend.entity.Device;
import com.sentinelx.backend.entity.ReviewQueue;
import com.sentinelx.backend.entity.Transaction;
import com.sentinelx.backend.exception.ResourceNotFoundException;
import com.sentinelx.backend.repository.DeviceRepository;
import com.sentinelx.backend.repository.ReviewQueueRepository;
import com.sentinelx.backend.repository.TransactionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

/**
 * Service managing human fraud analyst review workflows and resolution lifecycle.
 */
@Slf4j
@Service
public class ReviewQueueService {

    private final ReviewQueueRepository reviewQueueRepository;
    private final TransactionRepository transactionRepository;
    private final DeviceRepository deviceRepository;

    public ReviewQueueService(ReviewQueueRepository reviewQueueRepository,
                              TransactionRepository transactionRepository,
                              DeviceRepository deviceRepository) {
        this.reviewQueueRepository = reviewQueueRepository;
        this.transactionRepository = transactionRepository;
        this.deviceRepository = deviceRepository;
    }

    /**
     * Retrieves review queue cases, optionally filtered by status (PENDING, APPROVED, REJECTED).
     *
     * @param status Optional filter status
     * @return List of ReviewQueue items ordered newest first
     */
    @Transactional(readOnly = true)
    public List<ReviewQueue> getReviewQueue(String status) {
        if (status != null && !status.isBlank()) {
            return reviewQueueRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase());
        }
        return reviewQueueRepository.findAllByOrderByCreatedAtDesc();
    }

    /**
     * Retrieves a specific review case by ID.
     *
     * @param id Unique review queue record ID
     * @return ReviewQueue item
     */
    @Transactional(readOnly = true)
    public ReviewQueue getReviewById(Long id) {
        return reviewQueueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Review queue item not found with ID: " + id));
    }

    /**
     * Resolves a review queue case, updating transaction state and elevating device trust if approved.
     *
     * @param id Review queue record ID
     * @param request Resolution details
     * @return Updated ReviewQueue item
     */
    @Transactional
    public ReviewQueue resolveReview(Long id, ReviewResolutionRequest request) {
        ReviewQueue item = getReviewById(id);

        String resolvedStatus = request.getStatus().toUpperCase();
        item.setStatus(resolvedStatus);
        item.setReviewerId(request.getReviewerId());
        item.setReviewerNotes(request.getReviewerNotes());
        item.setReviewedAt(OffsetDateTime.now(ZoneOffset.UTC));

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
                log.info("Device {} marked as trusted following analyst approval for txn {}", device.getId(), transaction.getId());
            }
        }

        ReviewQueue saved = reviewQueueRepository.save(item);
        log.info("Review queue case {} resolved as {} by {}", id, resolvedStatus, request.getReviewerId());
        return saved;
    }
}
