-- Safety migration: V53 was empty in one release path, so ensure required columns exist.
ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS tetris_moderation_status VARCHAR(32) NOT NULL DEFAULT 'NORMAL';

ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS tetris_moderation_reason VARCHAR(1000);

ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS tetris_moderated_at TIMESTAMPTZ;

