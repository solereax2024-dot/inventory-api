package com.solereax.inventory.user;

import com.solereax.inventory.user.dto.AdminUserResponse;
import com.solereax.inventory.user.dto.CreateAdminUserRequest;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserManagementController {
    private final AdminUserManagementService adminUserManagementService;

    public AdminUserManagementController(AdminUserManagementService adminUserManagementService) {
        this.adminUserManagementService = adminUserManagementService;
    }

    @GetMapping
    public List<AdminUserResponse> listPrivilegedUsers() {
        return adminUserManagementService.listPrivilegedUsers();
    }

    @PostMapping("/admins")
    public AdminUserResponse createAdminUser(@Valid @RequestBody CreateAdminUserRequest request) {
        return adminUserManagementService.createAdminUser(request);
    }

    @PatchMapping("/admins/{userId}/disable")
    public AdminUserResponse disableAdminUser(@PathVariable Long userId, Principal principal) {
        return adminUserManagementService.disableAdminUser(userId, principal.getName());
    }

    @PatchMapping("/admins/{userId}/enable")
    public AdminUserResponse enableAdminUser(@PathVariable Long userId, Principal principal) {
        return adminUserManagementService.enableAdminUser(userId, principal.getName());
    }
}
