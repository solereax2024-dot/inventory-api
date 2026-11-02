ALTER TABLE giveaway_wheel_entries
    ADD COLUMN IF NOT EXISTS source_tag VARCHAR(50);

