package com.solereax.inventory.tetris;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "tetris_run_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TetrisRunSession {

    @Id
    @Column(name = "run_id", nullable = false, length = 64)
    private String runId;

    @Column(name = "username", nullable = false, length = 100)
    private String username;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "last_heartbeat_at", nullable = false)
    private Instant lastHeartbeatAt;

    @Column(name = "last_elapsed_ms", nullable = false)
    private Long lastElapsedMs;

    @Column(name = "last_score", nullable = false)
    private Integer lastScore;

    @Column(name = "last_level", nullable = false)
    private Integer lastLevel;

    @Column(name = "last_lines_cleared", nullable = false)
    private Integer lastLinesCleared;

    @Column(name = "last_pieces_locked", nullable = false)
    private Integer lastPiecesLocked;

    @Column(name = "heartbeat_count", nullable = false)
    private Integer heartbeatCount;

    @Column(name = "suspicious_signal_count", nullable = false)
    private Integer suspiciousSignalCount;

    @Column(name = "blocked", nullable = false)
    private boolean blocked;

    @Column(name = "block_reason", length = 1000)
    private String blockReason;

    @Column(name = "ended", nullable = false)
    private boolean ended;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}

