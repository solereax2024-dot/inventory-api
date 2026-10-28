package com.solereax.inventory.giveaway;

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
@Table(name = "giveaway_wheel_entries")
public class GiveawayWheelEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 255)
    private String fullName;

    @Column(name = "follow_proof_image_path", length = 500)
    private String followProofImagePath;

    @Column(name = "follow_proof_validated", nullable = false)
    private boolean followProofValidated = false;

    @Column(name = "follow_proof_revoked", nullable = false)
    private boolean followProofRevoked = false;

    @Column(name = "follow_proof_validation_message", length = 1000)
    private String followProofValidationMessage;

    @Column(name = "comment_proof_image_path", length = 500)
    private String commentProofImagePath;

    @Column(name = "comment_proof_validated", nullable = false)
    private boolean commentProofValidated = false;

    @Column(name = "comment_proof_revoked", nullable = false)
    private boolean commentProofRevoked = false;

    @Column(name = "comment_proof_validation_message", length = 1000)
    private String commentProofValidationMessage;

    @Column(name = "share_proof_image_path", length = 500)
    private String shareProofImagePath;

    @Column(name = "share_proof_validated", nullable = false)
    private boolean shareProofValidated = false;

    @Column(name = "share_proof_revoked", nullable = false)
    private boolean shareProofRevoked = false;

    @Column(name = "share_proof_validation_message", length = 1000)
    private String shareProofValidationMessage;

    @Column(name = "review_proof_image_path", length = 500)
    private String reviewProofImagePath;

    @Column(name = "review_proof_validated", nullable = false)
    private boolean reviewProofValidated = false;

    @Column(name = "review_proof_revoked", nullable = false)
    private boolean reviewProofRevoked = false;

    @Column(name = "review_proof_validation_message", length = 1000)
    private String reviewProofValidationMessage;

    @Column(name = "facebook_profile_image_path", nullable = false, length = 500)
    private String facebookProfileImagePath;

    @Column(name = "facebook_profile_validated", nullable = false)
    private boolean facebookProfileValidated = false;

    @Column(name = "facebook_profile_revoked", nullable = false)
    private boolean facebookProfileRevoked = false;

    @Column(name = "facebook_profile_validation_message", length = 1000)
    private String facebookProfileValidationMessage;

    @Column(name = "entry_count", nullable = false)
    private int entryCount;

    @Column(name = "submitted_entry_count", nullable = false)
    private int submittedEntryCount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GiveawayWheelEntryStatus status = GiveawayWheelEntryStatus.PENDING;

    @Column(name = "rejection_reason", length = 1000)
    private String rejectionReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}

