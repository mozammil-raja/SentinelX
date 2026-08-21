package com.sentinelx.backend.controller;

import com.sentinelx.backend.dto.CustomerResponse;
import com.sentinelx.backend.entity.Device;
import com.sentinelx.backend.entity.User;
import com.sentinelx.backend.exception.ResourceNotFoundException;
import com.sentinelx.backend.repository.DeviceRepository;
import com.sentinelx.backend.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Controller providing customer behavioral baseline profiles for the SentinelX simulation studio.
 */
@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
@Tag(name = "Customer Behavioral Profiles", description = "Endpoints for retrieving synthetic customer profiles and behavioral baselines")
public class CustomerController {

    private final UserRepository userRepository;
    private final DeviceRepository deviceRepository;

    @GetMapping
    @Operation(summary = "List all customer behavioral profiles with their spending and location baselines")
    public ResponseEntity<List<CustomerResponse>> listCustomers() {
        List<User> users = userRepository.findAll();
        List<CustomerResponse> responses = users.stream()
                .map(this::toCustomerResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Retrieve a specific customer baseline profile by ID")
    public ResponseEntity<CustomerResponse> getCustomerById(@PathVariable String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));
        return ResponseEntity.ok(toCustomerResponse(user));
    }

    private CustomerResponse toCustomerResponse(User user) {
        List<Device> devices = deviceRepository.findByUserId(user.getId());
        List<String> trustedFp = devices.stream()
                .filter(d -> Boolean.TRUE.equals(d.getIsTrusted()))
                .map(Device::getFingerprint)
                .collect(Collectors.toList());

        Device primaryDev = devices.isEmpty() ? null : devices.get(0);
        String primaryFp = primaryDev != null ? primaryDev.getFingerprint() : (user.getId() + "_primary_device");
        String usualIp = primaryDev != null ? primaryDev.getIpAddress() : (user.getUsualIpSubnet() != null ? user.getUsualIpSubnet() + "10" : "198.51.100.10");

        return CustomerResponse.builder()
                .id(user.getId())
                .name(user.getName() != null ? user.getName() : user.getEmail())
                .email(user.getEmail())
                .riskSegment(user.getRiskSegment() != null ? user.getRiskSegment() : "MEDIUM")
                .typicalSpendMin(user.getTypicalSpendMin())
                .typicalSpendMax(user.getTypicalSpendMax())
                .currency(user.getCurrency() != null ? user.getCurrency() : "INR")
                .usualLocation(user.getUsualLocation() != null ? user.getUsualLocation() : "Delhi, India")
                .usualIp(usualIp)
                .primaryDevice(user.getPrimaryDevice() != null ? user.getPrimaryDevice() : "Mobile App / Browser")
                .primaryDeviceFingerprint(primaryFp)
                .dailyTxnCount(user.getDailyTxnCount() != null ? user.getDailyTxnCount() : 3)
                .occupation(user.getOccupation() != null ? user.getOccupation() : "Account Holder")
                .trustedDeviceFingerprints(trustedFp)
                .build();
    }
}
