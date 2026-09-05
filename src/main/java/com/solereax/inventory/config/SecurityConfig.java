package com.solereax.inventory.config;

import com.solereax.inventory.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthenticationFilter jwtAuthenticationFilter
    ) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(
                                "/",
                                "/collection",
                                "/collection/",
                                "/collection/**",
                                "/collections",
                                "/collections/",
                                "/collections/**",
                                "/brands",
                                "/brands/",
                                "/brands/**",
                                "/shop",
                                "/shop/",
                                "/shop/**",
                                "/reserve",
                                "/reserve/",
                                "/reserve/**",
                                "/admin",
                                "/admin/",
                                "/admin/**",
                                "/index.html",
                                "/admin.html",
                                "/admin.html/**",
                                "/assets/**",
                                "/uploads/**",
                                "/favicon.ico",
                                "/favicon-48x48.png",
                                "/favicon-192x192.png",
                                "/apple-touch-icon.png",
                                "/site.webmanifest",
                                "/logo.png",
                                "/api/public/**",
                                "/api/auth/login"
                        ).permitAll()
                        .requestMatchers(HttpMethod.DELETE, "/api/admin/products/**").hasRole("SUPER_ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/admin/orders/**").hasRole("SUPER_ADMIN")
                        .requestMatchers("/api/admin/users/**").hasRole("SUPER_ADMIN")
                        .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "SUPER_ADMIN")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
