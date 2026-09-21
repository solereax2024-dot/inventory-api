package com.solereax.inventory.gamification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CustomerBadgeRepository extends JpaRepository<CustomerBadge, Long> {
    List<CustomerBadge> findByCustomerId(Long customerId);
    boolean existsByCustomerIdAndBadgeId(Long customerId, Long badgeId);
}

