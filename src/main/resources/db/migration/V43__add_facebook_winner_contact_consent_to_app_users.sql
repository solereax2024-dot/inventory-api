-- V43__add_facebook_winner_contact_consent_to_app_users.sql
-- Store whether Tetris registrants agree to be contacted via Facebook if they win.

ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS facebook_winner_contact_consent BOOLEAN NOT NULL DEFAULT FALSE;

