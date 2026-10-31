ALTER TABLE giveaway_wheel_entries
    ADD COLUMN IF NOT EXISTS entry_password_hash VARCHAR(255);

