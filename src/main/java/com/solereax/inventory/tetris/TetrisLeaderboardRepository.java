package com.solereax.inventory.tetris;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TetrisLeaderboardRepository extends JpaRepository<TetrisLeaderboard, Long> {
    Optional<TetrisLeaderboard> findByPlayerName(String playerName);
    List<TetrisLeaderboard> findAllByOrderByHighestScoreDesc();
    List<TetrisLeaderboard> findTop10ByOrderByHighestScoreDesc();
}

