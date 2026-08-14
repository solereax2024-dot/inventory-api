package com.solereax.inventory.config;

import com.solereax.inventory.user.AppUser;
import com.solereax.inventory.user.AppUserRepository;
import com.solereax.inventory.user.UserRole;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class BootstrapDataConfig {
    @Bean
    public CommandLineRunner bootstrapAdminUser(
            AppUserRepository appUserRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin.username:admin}") String adminUsername,
            @Value("${app.admin.password:admin123}") String adminPassword,
            @Value("${app.super-admin.username:superadmin}") String superAdminUsername,
            @Value("${app.super-admin.password:superadmin123}") String superAdminPassword
    ) {
        return args -> {
            if (appUserRepository.findByUsername(superAdminUsername).isEmpty()) {
                AppUser superAdmin = new AppUser();
                superAdmin.setUsername(superAdminUsername.trim());
                superAdmin.setPasswordHash(passwordEncoder.encode(superAdminPassword));
                superAdmin.setRole(UserRole.SUPER_ADMIN);
                superAdmin.setEnabled(true);
                appUserRepository.save(superAdmin);
            }

            if (appUserRepository.findByUsername(adminUsername).isEmpty()) {
                AppUser admin = new AppUser();
                admin.setUsername(adminUsername.trim());
                admin.setPasswordHash(passwordEncoder.encode(adminPassword));
                admin.setRole(UserRole.ADMIN);
                admin.setEnabled(true);
                appUserRepository.save(admin);
            }
        };
    }
}
