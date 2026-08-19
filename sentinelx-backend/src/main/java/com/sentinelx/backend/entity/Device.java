package com.sentinelx.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "devices")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Device {
    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private String fingerprint;

    @Column(name = "ip_address", nullable = false)
    private String ipAddress;

    private String os;
    
    private String browser;

    @Column(name = "is_trusted")
    @Builder.Default
    private Boolean isTrusted = true;

    @Column(name = "last_seen", insertable = false, updatable = false)
    private OffsetDateTime lastSeen;
}