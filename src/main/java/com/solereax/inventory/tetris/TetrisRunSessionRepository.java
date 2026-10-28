package com.solereax.inventory.tetris;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface TetrisRunSessionRepository extends JpaRepository<TetrisRunSession, String> {
    Optional<TetrisRunSession> findByRunIdAndUsernameIgnoreCaseAndEndedFalse(String runId, String username);

    void deleteByEndedTrueOrUpdatedAtBefore(Instant cutoff);
}

