package com.sentinelx.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload for resolving an item in the analyst review queue.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResolutionRequest {

    /**
     * The decision status to apply. Must be either APPROVED or REJECTED.
     */
    @NotBlank(message = "Resolution status is required")
    @Pattern(regexp = "^(APPROVED|REJECTED)$", message = "Status must be either APPROVED or REJECTED")
    private String status;

    /**
     * Identity or email of the compliance analyst resolving the case.
     */
    @NotBlank(message = "Reviewer ID is required")
    private String reviewerId;

    /**
     * Detailed notes or justification for the audit trail.
     */
    private String reviewerNotes;
}
