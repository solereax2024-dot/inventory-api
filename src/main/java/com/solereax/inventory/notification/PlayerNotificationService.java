package com.solereax.inventory.notification;

import com.solereax.inventory.shared.NotFoundException;
import com.solereax.inventory.user.AppUser;
import com.solereax.inventory.user.AppUserRepository;
import com.solereax.inventory.user.UserRole;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlayerNotificationService {
    private final PlayerNotificationRepository playerNotificationRepository;
    private final AppUserRepository appUserRepository;

    public PlayerNotificationService(
            PlayerNotificationRepository playerNotificationRepository,
            AppUserRepository appUserRepository
    ) {
        this.playerNotificationRepository = playerNotificationRepository;
        this.appUserRepository = appUserRepository;
    }

    @Transactional(readOnly = true)
    public List<PlayerNotificationResponse> getNotificationsForUsername(String username) {
        AppUser user = findUserByUsername(username);
        return playerNotificationRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public long countUnreadForUsername(String username) {
        AppUser user = findUserByUsername(username);
        return playerNotificationRepository.countByUserAndReadAtIsNull(user);
    }

    @Transactional
    public int markAllAsRead(String username) {
        AppUser user = findUserByUsername(username);
        return playerNotificationRepository.markAllAsRead(user, Instant.now());
    }

    @Transactional
    public AdminPlayerNotificationDispatchResponse sendCustomMessageToUser(Long userId, String title, String message) {
        AppUser user = findUserById(userId);
        saveNotification(user, PlayerNotificationType.CUSTOM_MESSAGE, title, message);
        return new AdminPlayerNotificationDispatchResponse("Admin message sent successfully.", 1);
    }

    @Transactional
    public AdminPlayerNotificationDispatchResponse sendBroadcastMessage(String title, String message) {
        List<AppUser> customers = appUserRepository.findAllByRoleAndEnabledTrue(UserRole.CUSTOMER);
        if (customers.isEmpty()) {
            return new AdminPlayerNotificationDispatchResponse("No active players available for broadcast.", 0);
        }

        List<PlayerNotification> notifications = customers.stream()
                .map(user -> buildNotification(user, PlayerNotificationType.BROADCAST_MESSAGE, title, message))
                .toList();
        playerNotificationRepository.saveAll(notifications);
        return new AdminPlayerNotificationDispatchResponse("Broadcast message sent successfully.", notifications.size());
    }

    @Transactional
    public void sendSystemNotification(Long userId, PlayerNotificationType type, String title, String message) {
        AppUser user = findUserById(userId);
        saveNotification(user, type, title, message);
    }

    @Transactional
    public void clearNotificationsByTypeForUsername(String username, PlayerNotificationType type) {
        AppUser user = findUserByUsername(username);
        playerNotificationRepository.deleteByUserAndType(user, type);
    }

    @Transactional
    public void clearNotificationsByType(Long userId, PlayerNotificationType type) {
        AppUser user = findUserById(userId);
        playerNotificationRepository.deleteByUserAndType(user, type);
    }

    private void saveNotification(AppUser user, PlayerNotificationType type, String title, String message) {
        playerNotificationRepository.save(buildNotification(user, type, title, message));
    }

    private PlayerNotification buildNotification(AppUser user, PlayerNotificationType type, String title, String message) {
        PlayerNotification notification = new PlayerNotification();
        notification.setUser(user);
        notification.setType(type);
        notification.setTitle(sanitize(title, "Title"));
        notification.setMessage(sanitize(message, "Message"));
        notification.setReadAt(null);
        notification.setCreatedAt(Instant.now());
        return notification;
    }

    private PlayerNotificationResponse toResponse(PlayerNotification notification) {
        return new PlayerNotificationResponse(
                notification.getId(),
                notification.getType().name(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getReadAt() == null,
                notification.getCreatedAt()
        );
    }

    private AppUser findUserByUsername(String username) {
        return appUserRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new NotFoundException("User not found: " + username));
    }

    private AppUser findUserById(Long userId) {
        return appUserRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
    }

    private String sanitize(String value, String label) {
        String sanitized = value == null ? "" : value.trim();
        if (sanitized.isEmpty()) {
            throw new IllegalArgumentException(label + " is required.");
        }
        return sanitized;
    }
}

