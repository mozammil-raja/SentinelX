package com.sentinelx.backend.repository;

import com.sentinelx.backend.entity.ReviewQueue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ReviewQueueRepository extends JpaRepository<ReviewQueue, Long> {
    List<ReviewQueue> findByStatus(String status);
}