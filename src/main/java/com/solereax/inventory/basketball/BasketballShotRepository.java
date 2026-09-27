package com.solereax.inventory.basketball;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BasketballShotRepository extends JpaRepository<BasketballShot, Long> {

    @Query("SELECT s FROM BasketballShot s WHERE s.game.id = :gameId ORDER BY s.shotNumber ASC")
    List<BasketballShot> findByGameId(@Param("gameId") Long gameId);

    @Query("SELECT s FROM BasketballShot s WHERE s.game.id = :gameId AND s.shotType = 'MADE' ORDER BY s.createdAt DESC")
    List<BasketballShot> findMadeShotsByGameId(@Param("gameId") Long gameId);
}

