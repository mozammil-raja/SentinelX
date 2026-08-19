package com.sentinelx.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Represents a financial payment or transfer event submitted to SentinelX for risk evaluation.
 * 
 * <p>Transactions capture the core economic details (amount, currency, merchant) as well as the
 * network and device context (IP address, device link, card BIN). Each transaction undergoes real-time
 * scoring to determine whether it should be approved immediately, held for analyst review, or blocked.</p>
 */
@Entity
@Table(name = "transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Transaction {

    /**
     * Unique domain-prefixed identifier for the transaction (e.g. "txn_9001").
     */
    @Id
    private String id;

    /**
     * Reference to the account holder initiating the transaction.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    private User user;

    /**
     * Exact monetary amount of the transaction.
     * Uses {@link BigDecimal} to guarantee zero floating-point rounding errors in financial audits.
     */
    @Column(nullable = false)
    private BigDecimal amount;

    /**
     * ISO-4217 three-letter currency code (e.g. "USD", "EUR", "GBP", "INR").
     */
    @Column(nullable = false, length = 3)
    private String currency;

    /**
     * Unique identifier of the receiving merchant or platform endpoint (e.g. "mer_stripe_01").
     */
    @Column(name = "merchant_id", nullable = false)
    private String merchantId;

    /**
     * 6 to 8 digits of the payment card (Bank Identification Number) per ISO/IEC 7812.
     */
    @Column(name = "card_bin", length = 8)
    private String cardBin;

    /**
     * Client IP address where the payment was initiated.
     */
    @Column(name = "ip_address")
    private String ipAddress;

    /**
     * Optional device entity associated with the transaction session.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "device_id")
    private Device device;

    /**
     * Current lifecycle status of the transaction.
     * Possible values: "PENDING", "APPROVED", "BLOCKED", "REVIEW".
     */
    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING";

    /**
     * Explicit UTC timestamp when the payment was initiated at the checkout layer.
     */
    @Column(nullable = false)
    private OffsetDateTime timestamp;

    /**
     * Audit timestamp when this transaction row was written to the PostgreSQL database.
     */
    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}