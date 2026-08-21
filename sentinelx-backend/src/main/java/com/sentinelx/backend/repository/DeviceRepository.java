package com.sentinelx.backend.repository;

import com.sentinelx.backend.entity.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for managing {@link Device} profiles in PostgreSQL.
 */
@Repository
public interface DeviceRepository extends JpaRepository<Device, String> {

    /**
     * Retrieves all devices historically registered to or used by a specific user.
     *
     * @param userId Unique identifier of the user (e.g. "usr_1001")
     * @return List of matching Device records
     */
    List<Device> findByUserId(String userId);

    /**
     * Directly queries for a specific device profile belonging to a user matching the given hardware/canvas fingerprint.
     *
     * @param userId Unique identifier of the user
     * @param fingerprint Cryptographic fingerprint hash
     * @return Optional containing the Device profile if recognized
     */
    Optional<Device> findByUserIdAndFingerprint(String userId, String fingerprint);
}