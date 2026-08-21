package com.sentinelx.backend.repository;

import com.sentinelx.backend.entity.ReviewQueue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * Spring Data JPA repository for managing the human analyst {@link ReviewQueue} in PostgreSQL.
 */
@Repository
public interface ReviewQueueRepository extends JpaRepository<ReviewQueue, Long> {
    /**
     * Retrieves all review queue items matching a specific lifecycle status (PENDING, APPROVED, REJECTED),
     * ordered newest first.
     *
     * @param status Status filter
     * @return List of review queue items
     */
    @Query("SELECT rq FROM ReviewQueue rq LEFT JOIN FETCH rq.transaction t LEFT JOIN FETCH t.user LEFT JOIN FETCH rq.decision WHERE rq.status = :status ORDER BY rq.createdAt DESC")
    List<ReviewQueue> findByStatusOrderByCreatedAtDesc(@Param("status") String status);

    /**
     * Retrieves all review queue items ordered newest first.
     *
     * @return List of all review items
     */
    @Query("SELECT rq FROM ReviewQueue rq LEFT JOIN FETCH rq.transaction t LEFT JOIN FETCH t.user LEFT JOIN FETCH rq.decision ORDER BY rq.createdAt DESC")
    List<ReviewQueue> findAllByOrderByCreatedAtDesc();
}