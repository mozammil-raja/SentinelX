package com.sentinelx.backend.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

/**
 * Incoming payload submitted to {@code POST /api/v1/transactions} for real-time risk scoring.
 * 
 * <p>Contains the core financial attributes of the transaction along with the customer's email,
 * device fingerprint, client IP address, and card details.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionRequest {

    /**
     * Optional custom transaction ID. If omitted or blank, the system generates a domain-prefixed ID (e.g. "txn_...").
     */
    private String transactionId;

    /**
     * Identifier of the user initiating the transaction (e.g. "usr_1001").
     */
    @NotBlank(message = "User ID is required")
    private String userId;

    /**
     * Customer email address for validation and risk notifications.
     */
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    /**
     * Exact transaction amount. Must be strictly positive (> 0.00).
     */
    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Transaction amount must be greater than zero")
    private BigDecimal amount;

    /**
     * ISO-4217 3-letter currency code (e.g. "USD", "EUR", "GBP").
     */
    @NotBlank(message = "Currency is required")
    @Size(min = 3, max = 3, message = "Currency must be a 3-character ISO code")
    private String currency;

    /**
     * Identifier of the target merchant endpoint (e.g. "mer_stripe_01").
     */
    @NotBlank(message = "Merchant ID is required")
    private String merchantId;

    /**
     * Optional 6 to 8 digits of the payment card (Bank Identification Number) per ISO/IEC 7812.
     */
    @Pattern(regexp = "^[0-9]{6,8}$", message = "Card BIN must be 6 to 8 numeric digits")
    private String cardBin;

    /**
     * Client IP address where the transaction originated.
     */
    @NotBlank(message = "IP address is required")
    private String ipAddress;

    /**
     * Hardware or canvas browser fingerprint hash.
     */
    private String deviceFingerprint;

    /**
     * Operating system detected from user-agent.
     */
    private String os;

    /**
     * Web browser detected from user-agent.
     */
    private String browser;
}
