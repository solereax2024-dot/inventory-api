ALTER TABLE app_users ADD COLUMN IF NOT EXISTS follow_proof_validated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS follow_proof_revoked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS review_proof_validated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS review_proof_revoked BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE app_users
SET follow_proof_validated = TRUE,
    follow_proof_revoked = FALSE
WHERE follow_proof_image_path IS NOT NULL AND TRIM(follow_proof_image_path) <> '';

UPDATE app_users
SET review_proof_validated = TRUE,
    review_proof_revoked = FALSE
WHERE review_proof_image_path IS NOT NULL AND TRIM(review_proof_image_path) <> '';
