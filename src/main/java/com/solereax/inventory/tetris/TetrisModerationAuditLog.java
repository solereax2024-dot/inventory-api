package com.solereax.inventory.tetris;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import com.solereax.inventory.user.TetrisModerationStatus;

@Getter
@Setter
@Entity
@Table(name = "tetris_moderation_audit_log")
public class TetrisModerationAuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "username", nullable = false, length = 100)
    private String username;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", nullable = false, length = 32)
    private TetrisModerationStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false, length = 32)
    private TetrisModerationStatus newStatus;

    @Column(name = "reason", nullable = true, length = 1000)
    private String reason;

    @Column(name = "acted_by", nullable = false, length = 100)
    private String actedBy;

    @Column(name = "acted_at", nullable = false)
    private Instant actedAt = Instant.now();
}

