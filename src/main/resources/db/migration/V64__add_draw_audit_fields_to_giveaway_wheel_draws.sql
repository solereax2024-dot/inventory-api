ALTER TABLE giveaway_wheel_draws
    ADD COLUMN IF NOT EXISTS eligible_entry_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS draw_snapshot_hash VARCHAR(64) NOT NULL DEFAULT '';

