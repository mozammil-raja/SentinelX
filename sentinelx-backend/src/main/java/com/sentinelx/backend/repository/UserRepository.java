package com.sentinelx.backend.repository;

import com.sentinelx.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for managing {@link User} entities in PostgreSQL.
 * Provides standard CRUD capabilities and primary key lookups.
 */
@Repository
public interface UserRepository extends JpaRepository<User, String> {
}