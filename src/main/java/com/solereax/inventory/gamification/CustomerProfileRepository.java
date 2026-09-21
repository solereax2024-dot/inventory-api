package com.solereax.inventory.gamification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface CustomerProfileRepository extends JpaRepository<CustomerProfile, Long> {
    Optional<CustomerProfile> findByUsername(String username);

    @Query("SELECT cp FROM CustomerProfile cp ORDER BY cp.pointsBalance DESC LIMIT :limit")
    List<CustomerProfile> findTopByPoints(@Param("limit") int limit);
}

