package com.sentinelx.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "rules", uniqueConstraints = {@UniqueConstraint(columnNames = {"name", "version"})})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rule {
    @Id
    private String id;

    @Column(nullable = false, length = 100)
    private String name;

    private String description;

    @Column(name = "condition_json", nullable = false, length = 2000)
    private String conditionJson;

    @Column(nullable = false)
    private Integer weight;

    @Column(nullable = false)
    @Builder.Default
    private Integer version = 1;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}