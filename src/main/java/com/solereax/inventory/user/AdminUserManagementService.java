package com.solereax.inventory.user;

import com.solereax.inventory.shared.NotFoundException;
import com.solereax.inventory.user.dto.AdminUserResponse;
import com.solereax.inventory.user.dto.CreateAdminUserRequest;
import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminUserManagementService {
    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminUserManagementService(AppUserRepository appUserRepository, PasswordEncoder passwordEncoder) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> listPrivilegedUsers() {
        return appUserRepository.findAll().stream()
                .filter(user -> user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.SUPER_ADMIN)
                .sorted((left, right) -> left.getUsername().compareToIgnoreCase(right.getUsername()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AdminUserResponse createAdminUser(CreateAdminUserRequest request) {
        String username = request.username() == null ? "" : request.username().trim();
        if (username.isEmpty()) {
            throw new IllegalArgumentException("Username cannot be empty.");
        }
        if (appUserRepository.existsByUsernameIgnoreCase(username)) {
            throw new IllegalArgumentException("Username already exists: " + username);
        }
        if (request.role() != UserRole.ADMIN && request.role() != UserRole.SUPER_ADMIN) {
            throw new IllegalArgumentException("Only ADMIN or SUPER_ADMIN roles can be assigned here.");
        }

        AppUser user = new AppUser();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role());
        user.setEnabled(true);
        return toResponse(appUserRepository.save(user));
    }

    @Transactional
    public AdminUserResponse disableAdminUser(Long userId, String actingUsername) {
        return setAdminUserEnabled(userId, false, actingUsername);
    }

    @Transactional
    public AdminUserResponse enableAdminUser(Long userId, String actingUsername) {
        return setAdminUserEnabled(userId, true, actingUsername);
    }

    private AdminUserResponse setAdminUserEnabled(Long userId, boolean enabled, String actingUsername) {
        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
        if (user.getRole() != UserRole.ADMIN) {
            throw new IllegalArgumentException("Only ADMIN users can be updated.");
        }
        if (user.getUsername().equalsIgnoreCase(actingUsername)) {
            throw new IllegalArgumentException("You cannot update your own account status.");
        }
        if (user.isEnabled() == enabled) {
            throw new IllegalArgumentException(enabled ? "User is already enabled." : "User is already disabled.");
        }
        user.setEnabled(enabled);
        return toResponse(appUserRepository.save(user));
    }

    private AdminUserResponse toResponse(AppUser user) {
        return new AdminUserResponse(
                user.getId(),
                user.getUsername(),
                user.getRole().name(),
                user.isEnabled(),
                user.getCreatedAt()
        );
    }
}
