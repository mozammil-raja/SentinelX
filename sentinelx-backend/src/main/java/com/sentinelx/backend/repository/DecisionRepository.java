package com.sentinelx.backend.repository;

import com.sentinelx.backend.entity.Decision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for persisting and querying immutable {@link Decision} audit records.
 */
@Repository
public interface DecisionRepository extends JpaRepository<Decision, String> {
}