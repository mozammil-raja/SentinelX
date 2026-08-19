package com.sentinelx.backend.repository;

import com.sentinelx.backend.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Spring Data JPA repository for managing {@link Transaction} records in PostgreSQL.
 */
@Repository
public interface TransactionRepository extends JpaRepository<Transaction, String> {

    /**
     * Retrieves all transactions executed by a user, ordered from most recent to oldest.
     * Used for velocity calculations, historical profile comparisons, and backtest replays.
     *
     * @param userId Unique identifier of the user (e.g. "usr_1001")
     * @return Chronologically descending list of transactions
     */
    @org.springframework.data.jpa.repository.Query("SELECT t FROM Transaction t WHERE t.user.id = :userId ORDER BY t.timestamp DESC")
    List<Transaction> findByUserIdOrderByTimestampDesc(@org.springframework.data.repository.query.Param("userId") String userId);

    /**
     * Retrieves transactions ordered from newest to oldest with pagination support.
     * Eagerly fetches user and device relations to prevent Jackson serialization proxy errors.
     *
     * @param pageable Pagination and sorting criteria
     * @return List of transactions
     */
    @org.springframework.data.jpa.repository.Query("SELECT t FROM Transaction t LEFT JOIN FETCH t.user LEFT JOIN FETCH t.device ORDER BY t.timestamp DESC")
    List<Transaction> findRecentTransactions(Pageable pageable);
}