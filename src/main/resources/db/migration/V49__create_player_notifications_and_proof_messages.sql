ALTER TABLE app_users ADD COLUMN IF NOT EXISTS follow_proof_validation_message VARCHAR(1000);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS review_proof_validation_message VARCHAR(1000);

CREATE TABLE IF NOT EXISTS player_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(80) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_player_notifications_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_player_notifications_user_created_at
    ON player_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_notifications_user_read_at
    ON player_notifications (user_id, read_at);

