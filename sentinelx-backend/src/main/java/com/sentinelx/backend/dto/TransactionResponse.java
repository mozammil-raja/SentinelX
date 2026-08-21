package com.sentinelx.backend.dto;

import com.sentinelx.backend.entity.Transaction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Public presentation DTO for {@link Transaction} entity records.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionResponse {

    private String id;
    private String userId;
    private BigDecimal amount;
    private String currency;
    private String merchantId;
    private String cardBin;
    private String ipAddress;
    private String deviceFingerprint;
    private String status;
    private OffsetDateTime timestamp;
    private OffsetDateTime createdAt;

    /**
     * Maps a JPA {@link Transaction} entity to its decoupled presentation DTO.
     *
     * @param transaction Transaction JPA entity
     * @return TransactionResponse DTO
     */
    public static TransactionResponse fromEntity(Transaction transaction) {
        if (transaction == null) {
            return null;
        }

        return TransactionResponse.builder()
                .id(transaction.getId())
                .userId(transaction.getUser() != null ? transaction.getUser().getId() : null)
                .amount(transaction.getAmount())
                .currency(transaction.getCurrency())
                .merchantId(transaction.getMerchantId())
                .cardBin(transaction.getCardBin())
                .ipAddress(transaction.getIpAddress())
                .deviceFingerprint(transaction.getDevice() != null ? transaction.getDevice().getFingerprint() : null)
                .status(transaction.getStatus())
                .timestamp(transaction.getTimestamp())
                .createdAt(transaction.getCreatedAt())
                .build();
    }
}
