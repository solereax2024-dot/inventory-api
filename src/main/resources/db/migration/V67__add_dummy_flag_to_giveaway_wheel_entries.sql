ALTER TABLE giveaway_wheel_entries
    ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_giveaway_wheel_entries_dummy_state
    ON giveaway_wheel_entries(is_dummy, excluded_from_wheel, updated_at DESC);

