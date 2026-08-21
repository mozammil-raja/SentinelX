package com.sentinelx.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Data Transfer Object representing a Customer Profile and behavioral baseline.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerResponse {
    private String id;
    private String name;
    private String email;
    private String riskSegment;
    private BigDecimal typicalSpendMin;
    private BigDecimal typicalSpendMax;
    private String currency;
    private String usualLocation;
    private String usualIp;
    private String primaryDevice;
    private String primaryDeviceFingerprint;
    private Integer dailyTxnCount;
    private String occupation;
    private List<String> trustedDeviceFingerprints;
}
