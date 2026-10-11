ALTER TABLE app_users ADD COLUMN IF NOT EXISTS comment_proof_image_path VARCHAR(500);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS comment_proof_image_filename VARCHAR(255);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS comment_proof_validated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS comment_proof_revoked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS comment_proof_validation_message VARCHAR(1000);

