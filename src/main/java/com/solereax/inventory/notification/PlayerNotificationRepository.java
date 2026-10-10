package com.solereax.inventory.notification;

import com.solereax.inventory.user.AppUser;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlayerNotificationRepository extends JpaRepository<PlayerNotification, Long> {
    List<PlayerNotification> findByUserOrderByCreatedAtDesc(AppUser user);

    long countByUserAndReadAtIsNull(AppUser user);

    @Modifying
    @Query("update PlayerNotification n set n.readAt = :readAt where n.user = :user and n.readAt is null")
    int markAllAsRead(@Param("user") AppUser user, @Param("readAt") Instant readAt);

    void deleteByUserAndType(AppUser user, PlayerNotificationType type);
}

