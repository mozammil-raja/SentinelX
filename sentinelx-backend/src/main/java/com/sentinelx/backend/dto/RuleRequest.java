package com.sentinelx.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

/**
 * Request payload for creating or updating a dynamic fraud detection rule via {@code /api/v1/rules}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RuleRequest {

    /**
     * Optional rule identifier (e.g. "RULE_01", "RULE_02"). If provided, must match a registered strategy.
     */
    private String ruleId;

    /**
     * Human-readable rule title (e.g. "High Velocity (5m)").
     */
    @NotBlank(message = "Rule name is required")
    private String name;

    /**
     * Detailed business or compliance description.
     */
    private String description;

    /**
     * Serialized JSON condition string configuring threshold values or entity lists.
     */
    @NotBlank(message = "Condition JSON is required")
    private String conditionJson;

    /**
     * Numerical score weight contribution (0 to 100).
     */
    @NotNull(message = "Weight is required")
    @Min(value = 0, message = "Weight must be non-negative")
    @Max(value = 100, message = "Weight cannot exceed 100")
    private Integer weight;

    /**
     * Active toggle switch for the rule.
     */
    private Boolean isActive;
}
