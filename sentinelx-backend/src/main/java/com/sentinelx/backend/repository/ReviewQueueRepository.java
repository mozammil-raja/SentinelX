package com.sentinelx.backend.repository;

import com.sentinelx.backend.entity.ReviewQueue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for managing the human analyst {@link ReviewQueue} in PostgreSQL.
 */
@Repository
public interface ReviewQueueRepository extends JpaRepository<ReviewQueue, Long> {
}