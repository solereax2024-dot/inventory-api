package com.solereax.inventory.tetris;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TetrisModerationAuditLogRepository extends JpaRepository<TetrisModerationAuditLog, Long> {
    List<TetrisModerationAuditLog> findByUserIdOrderByActedAtDesc(Long userId);
}

