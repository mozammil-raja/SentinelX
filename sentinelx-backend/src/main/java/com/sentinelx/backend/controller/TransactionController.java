package com.sentinelx.backend.controller;

import com.sentinelx.backend.dto.DecisionResponse;
import com.sentinelx.backend.dto.TransactionRequest;
import com.sentinelx.backend.entity.Transaction;
import com.sentinelx.backend.exception.ResourceNotFoundException;
import com.sentinelx.backend.repository.TransactionRepository;
import com.sentinelx.backend.service.RiskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for transaction ingestion and fraud risk scoring.
 * 
 * <p>Exposes the primary synchronous scoring endpoint {@code POST /api/v1/transactions}
 * and historical inquiry endpoints.</p>
 */
@RestController
@RequestMapping("/api/v1/transactions")
@CrossOrigin(origins = "*")
public class TransactionController {

    private final RiskService riskService;
    private final TransactionRepository transactionRepository;

    public TransactionController(RiskService riskService, TransactionRepository transactionRepository) {
        this.riskService = riskService;
        this.transactionRepository = transactionRepository;
    }

    /**
     * Primary synchronous transaction ingestion and real-time fraud scoring endpoint.
     *
     * @param request Validated transaction request payload
     * @return Synchronous decision response with risk score, decision verdict, and latency
     */
    @PostMapping
    public ResponseEntity<DecisionResponse> ingestTransaction(@Valid @RequestBody TransactionRequest request) {
        DecisionResponse response = riskService.evaluateTransaction(request);
        HttpStatus status = "BLOCK".equals(response.getDecision()) ? HttpStatus.FORBIDDEN : HttpStatus.OK;
        return new ResponseEntity<>(response, status);
    }

    /**
     * Retrieves the most recent transactions recorded across the system with pagination.
     *
     * @param page Page index (0-based, defaults to 0)
     * @param size Page size (defaults to 50, maximum 100)
     * @return List of recent transactions ordered by newest first
     */
    @GetMapping
    public ResponseEntity<List<Transaction>> getRecentTransactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        int boundedSize = Math.min(Math.max(1, size), 100);
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, boundedSize);
        List<Transaction> transactions = transactionRepository.findRecentTransactions(pageable);
        return ResponseEntity.ok(transactions);
    }

    /**
     * Retrieves detailed information for a specific transaction by ID.
     *
     * @param id Transaction identifier (e.g. "txn_9001")
     * @return Transaction entity
     */
    @GetMapping("/{id}")
    public ResponseEntity<Transaction> getTransactionById(@PathVariable String id) {
        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with ID: " + id));
        return ResponseEntity.ok(transaction);
    }
}
