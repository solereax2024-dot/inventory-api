ALTER TABLE giveaway_wheel_entries
    ADD COLUMN IF NOT EXISTS is_winner BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS won_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS win_mode VARCHAR(20) NULL;

CREATE INDEX IF NOT EXISTS idx_giveaway_wheel_entries_winner_state
    ON giveaway_wheel_entries(is_winner, excluded_from_wheel, updated_at DESC);

