package com.sentinelx.backend.repository;

import com.sentinelx.backend.entity.Transaction;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for managing {@link Transaction} records in PostgreSQL.
 */
@Repository
public interface TransactionRepository extends JpaRepository<Transaction, String> {


    /**
     * Retrieves the single most recent transaction executed by a user for O(1) previous state checks.
     *
     * @param userId Unique identifier of the user
     * @return Optional containing the most recent transaction if one exists
     */
    Optional<Transaction> findTop1ByUserIdOrderByTimestampDesc(String userId);

    /**
     * Retrieves transactions executed by a user since a specific timestamp cutoff (e.g. within sliding window).
     * Prevents unbounded O(N) database scans.
     *
     * @param userId Unique identifier of the user
     * @param cutoff Timestamp cutoff boundary
     * @return List of matching transactions ordered descending by timestamp
     */
    List<Transaction> findByUserIdAndTimestampGreaterThanEqualOrderByTimestampDesc(
            String userId,
            OffsetDateTime cutoff);

    /**
     * Retrieves transactions ordered from newest to oldest with pagination support.
     * Fetches user and device relations to prevent Jackson serialization proxy errors.
     *
     * @param pageable Pagination and sorting criteria
     * @return List of transactions
     */
    @Query("SELECT t FROM Transaction t LEFT JOIN FETCH t.user LEFT JOIN FETCH t.device ORDER BY t.timestamp DESC")
    List<Transaction> findRecentTransactions(Pageable pageable);

    /**
     * Retrieves a single transaction by ID with its user and device eagerly fetched.
     *
     * @param id Transaction identifier
     * @return Optional containing the transaction with initialized associations
     */
    @Query("SELECT t FROM Transaction t LEFT JOIN FETCH t.user LEFT JOIN FETCH t.device WHERE t.id = :id")
    Optional<Transaction> findByIdWithDetails(@Param("id") String id);
}