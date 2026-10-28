CREATE TABLE IF NOT EXISTS tetris_moderation_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    username VARCHAR(100) NOT NULL,
    previous_status VARCHAR(32) NOT NULL,
    new_status VARCHAR(32) NOT NULL,
    reason VARCHAR(1000),
    acted_by VARCHAR(100) NOT NULL,
    acted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tetris_moderation_audit_user_id
    ON tetris_moderation_audit_log (user_id, acted_at DESC);

