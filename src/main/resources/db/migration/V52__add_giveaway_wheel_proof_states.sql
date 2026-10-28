ALTER TABLE giveaway_wheel_entries
    ADD COLUMN IF NOT EXISTS submitted_entry_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS follow_proof_validated BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS follow_proof_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS follow_proof_validation_message VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS comment_proof_validated BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS comment_proof_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS comment_proof_validation_message VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS share_proof_validated BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS share_proof_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS share_proof_validation_message VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS review_proof_validated BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS review_proof_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS review_proof_validation_message VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS facebook_profile_validated BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS facebook_profile_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS facebook_profile_validation_message VARCHAR(1000);

UPDATE giveaway_wheel_entries
SET submitted_entry_count = COALESCE(NULLIF(submitted_entry_count, 0), entry_count);

UPDATE giveaway_wheel_entries
SET follow_proof_validated = CASE
        WHEN COALESCE(TRIM(follow_proof_image_path), '') <> '' AND status = 'APPROVED' THEN TRUE
        ELSE FALSE
    END,
    follow_proof_revoked = CASE
        WHEN COALESCE(TRIM(follow_proof_image_path), '') <> '' AND status = 'REJECTED' THEN TRUE
        ELSE FALSE
    END,
    follow_proof_validation_message = CASE
        WHEN COALESCE(TRIM(follow_proof_image_path), '') <> '' AND status = 'REJECTED' THEN rejection_reason
        ELSE NULL
    END,
    comment_proof_validated = CASE
        WHEN COALESCE(TRIM(comment_proof_image_path), '') <> '' AND status = 'APPROVED' THEN TRUE
        ELSE FALSE
    END,
    comment_proof_revoked = CASE
        WHEN COALESCE(TRIM(comment_proof_image_path), '') <> '' AND status = 'REJECTED' THEN TRUE
        ELSE FALSE
    END,
    comment_proof_validation_message = CASE
        WHEN COALESCE(TRIM(comment_proof_image_path), '') <> '' AND status = 'REJECTED' THEN rejection_reason
        ELSE NULL
    END,
    share_proof_validated = CASE
        WHEN COALESCE(TRIM(share_proof_image_path), '') <> '' AND status = 'APPROVED' THEN TRUE
        ELSE FALSE
    END,
    share_proof_revoked = CASE
        WHEN COALESCE(TRIM(share_proof_image_path), '') <> '' AND status = 'REJECTED' THEN TRUE
        ELSE FALSE
    END,
    share_proof_validation_message = CASE
        WHEN COALESCE(TRIM(share_proof_image_path), '') <> '' AND status = 'REJECTED' THEN rejection_reason
        ELSE NULL
    END,
    review_proof_validated = CASE
        WHEN COALESCE(TRIM(review_proof_image_path), '') <> '' AND status = 'APPROVED' THEN TRUE
        ELSE FALSE
    END,
    review_proof_revoked = CASE
        WHEN COALESCE(TRIM(review_proof_image_path), '') <> '' AND status = 'REJECTED' THEN TRUE
        ELSE FALSE
    END,
    review_proof_validation_message = CASE
        WHEN COALESCE(TRIM(review_proof_image_path), '') <> '' AND status = 'REJECTED' THEN rejection_reason
        ELSE NULL
    END,
    facebook_profile_validated = CASE
        WHEN COALESCE(TRIM(facebook_profile_image_path), '') <> '' AND status = 'APPROVED' THEN TRUE
        ELSE FALSE
    END,
    facebook_profile_revoked = CASE
        WHEN COALESCE(TRIM(facebook_profile_image_path), '') <> '' AND status = 'REJECTED' THEN TRUE
        ELSE FALSE
    END,
    facebook_profile_validation_message = CASE
        WHEN COALESCE(TRIM(facebook_profile_image_path), '') <> '' AND status = 'REJECTED' THEN rejection_reason
        ELSE NULL
    END,
    entry_count = CASE
        WHEN status = 'APPROVED' THEN COALESCE(submitted_entry_count, entry_count)
        ELSE 0
    END;

