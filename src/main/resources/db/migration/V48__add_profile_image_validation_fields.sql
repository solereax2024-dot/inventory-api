ALTER TABLE app_users ADD COLUMN IF NOT EXISTS profile_image_validated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS profile_image_validation_message VARCHAR(1000);

UPDATE app_users
SET profile_image_validated = TRUE
WHERE profile_image_path IS NOT NULL AND TRIM(profile_image_path) <> '';

