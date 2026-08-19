package com.sentinelx.backend.repository;

import com.sentinelx.backend.entity.Rule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * Spring Data JPA repository for managing dynamic {@link Rule} definitions in PostgreSQL.
 */
@Repository
public interface RuleRepository extends JpaRepository<Rule, String> {

    /**
     * Retrieves all active fraud scoring rules.
     * Invoked by the dynamic rule evaluation engine during server startup and cache refreshes.
     *
     * @return List of currently active Rule entities
     */
    List<Rule> findByIsActiveTrue();
}