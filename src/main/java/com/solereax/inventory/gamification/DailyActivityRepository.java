package com.solereax.inventory.gamification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailyActivityRepository extends JpaRepository<DailyActivity, Long> {
    List<DailyActivity> findByCustomerIdAndActivityDate(Long customerId, LocalDate date);
    Optional<DailyActivity> findByCustomerIdAndActivityTypeAndActivityDate(Long customerId, String activityType, LocalDate date);
}

