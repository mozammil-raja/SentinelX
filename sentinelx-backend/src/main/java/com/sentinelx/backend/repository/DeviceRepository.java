package com.sentinelx.backend.repository;

import com.sentinelx.backend.entity.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * Spring Data JPA repository for managing {@link Device} profiles in PostgreSQL.
 */
@Repository
public interface DeviceRepository extends JpaRepository<Device, String> {

    /**
     * Retrieves all devices historically registered to or used by a specific user.
     * Used by the risk engine to verify whether a new transaction originates from a trusted known device.
     *
     * @param userId Unique identifier of the user (e.g. "usr_1001")
     * @return List of matching Device records
     */
    List<Device> findByUserId(String userId);
}