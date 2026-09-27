package com.solereax.inventory.basketball;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BasketballShootingGameRepository extends JpaRepository<BasketballShootingGame, Long> {

    @Query("SELECT g FROM BasketballShootingGame g WHERE g.playerName = :playerName ORDER BY g.startedAt DESC")
    List<BasketballShootingGame> findByPlayerName(@Param("playerName") String playerName);

    @Query("SELECT g FROM BasketballShootingGame g WHERE g.gameStatus = :status ORDER BY g.startedAt DESC")
    List<BasketballShootingGame> findByGameStatus(@Param("status") String status);

    @Query("SELECT g FROM BasketballShootingGame g ORDER BY g.startedAt DESC")
    List<BasketballShootingGame> findAllGames();
}
