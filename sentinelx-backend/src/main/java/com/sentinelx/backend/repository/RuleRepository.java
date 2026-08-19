package com.sentinelx.backend.repository;

import com.sentinelx.backend.entity.Rule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RuleRepository extends JpaRepository<Rule, String> {
    List<Rule> findByIsActiveTrue();
}