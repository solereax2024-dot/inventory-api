-- V42__add_tetris_user_profile_fields.sql
-- Add profile fields to app_users table for Tetris registration

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS profile_image_path VARCHAR(500);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS profile_image_filename VARCHAR(255);

