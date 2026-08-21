package com.sentinelx.backend.dto;

import com.sentinelx.backend.entity.Rule;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * Public presentation DTO for dynamic {@link Rule} entity configurations.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RuleResponse {

    private String id;
    private String name;
    private String description;
    private String conditionJson;
    private Integer weight;
    private Integer version;
    private Boolean isActive;
    private String createdBy;
    private OffsetDateTime createdAt;

    /**
     * Maps a JPA {@link Rule} entity to its decoupled presentation DTO.
     *
     * @param rule Rule JPA entity
     * @return RuleResponse DTO
     */
    public static RuleResponse fromEntity(Rule rule) {
        if (rule == null) {
            return null;
        }

        return RuleResponse.builder()
                .id(rule.getId())
                .name(rule.getName())
                .description(rule.getDescription())
                .conditionJson(rule.getConditionJson())
                .weight(rule.getWeight())
                .version(rule.getVersion())
                .isActive(rule.getIsActive())
                .createdBy(rule.getCreatedBy())
                .createdAt(rule.getCreatedAt())
                .build();
    }
}
