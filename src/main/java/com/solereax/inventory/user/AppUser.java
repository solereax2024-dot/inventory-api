package com.solereax.inventory.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "app_users")
public class AppUser {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(nullable = true, length = 255)
    private String fullName;

    @Column(name = "profile_image_path", nullable = true, length = 500)
    private String profileImagePath;

    @Column(name = "profile_image_filename", nullable = true, length = 255)
    private String profileImageFilename;

    @Column(name = "follow_proof_image_path", nullable = true, length = 500)
    private String followProofImagePath;

    @Column(name = "follow_proof_image_filename", nullable = true, length = 255)
    private String followProofImageFilename;

    @Column(name = "follow_proof_validated", nullable = false)
    private boolean followProofValidated = false;

    @Column(name = "follow_proof_revoked", nullable = false)
    private boolean followProofRevoked = false;

    @Column(name = "review_proof_image_path", nullable = true, length = 500)
    private String reviewProofImagePath;

    @Column(name = "review_proof_image_filename", nullable = true, length = 255)
    private String reviewProofImageFilename;

    @Column(name = "review_proof_validated", nullable = false)
    private boolean reviewProofValidated = false;

    @Column(name = "review_proof_revoked", nullable = false)
    private boolean reviewProofRevoked = false;

    @Column(name = "facebook_winner_contact_consent", nullable = false)
    private boolean facebookWinnerContactConsent = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
