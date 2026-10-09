ALTER TABLE app_users ADD COLUMN IF NOT EXISTS follow_proof_image_path VARCHAR(500);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS follow_proof_image_filename VARCHAR(255);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS review_proof_image_path VARCHAR(500);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS review_proof_image_filename VARCHAR(255);

