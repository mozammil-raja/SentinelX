package com.sentinelx.backend.repository;

import com.sentinelx.backend.entity.Decision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for persisting and querying immutable {@link Decision} audit records.
 */
@Repository
public interface DecisionRepository extends JpaRepository<Decision, String> {

    /**
     * Fetches decision records matching a batch of transaction IDs.
     */
    List<Decision> findByTransactionIdIn(List<String> transactionIds);

    /**
     * Deletes simulated (non-historical) decision records for a user during simulation reset.
     */
    @Modifying
    @Query("DELETE FROM Decision d WHERE d.user.id = :userId AND d.transactionId NOT LIKE 'txn_hist_%'")
    void deleteSimulatedByUserId(@Param("userId") String userId);
}