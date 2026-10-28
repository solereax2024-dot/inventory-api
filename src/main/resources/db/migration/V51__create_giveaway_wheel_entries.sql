CREATE TABLE IF NOT EXISTS giveaway_wheel_entries (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    follow_proof_image_path VARCHAR(500),
    comment_proof_image_path VARCHAR(500),
    share_proof_image_path VARCHAR(500),
    review_proof_image_path VARCHAR(500),
    facebook_profile_image_path VARCHAR(500) NOT NULL,
    entry_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    rejection_reason VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_giveaway_wheel_entries_full_name
    ON giveaway_wheel_entries (LOWER(full_name));

CREATE INDEX IF NOT EXISTS idx_giveaway_wheel_entries_status_updated_at
    ON giveaway_wheel_entries (status, updated_at DESC);

