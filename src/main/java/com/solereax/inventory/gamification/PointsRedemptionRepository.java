package com.solereax.inventory.gamification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PointsRedemptionRepository extends JpaRepository<PointsRedemption, Long> {
    List<PointsRedemption> findByCustomerId(Long customerId);
}

