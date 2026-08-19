package com.sentinelx.backend.exception;

import lombok.*;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Standardized error payload returned to clients during HTTP error events.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ErrorResponse {

    /**
     * HTTP status code (e.g. 400, 404, 500).
     */
    private int status;

    /**
     * Primary high-level error message or category.
     */
    private String error;

    /**
     * Detailed error message or list of validation failure descriptions.
     */
    private List<String> details;

    /**
     * Requested URI path that triggered the error.
     */
    private String path;

    /**
     * UTC timestamp when the error occurred.
     */
    private OffsetDateTime timestamp;
}
