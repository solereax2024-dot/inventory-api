ALTER TABLE tetris_run_sessions
    ADD COLUMN IF NOT EXISTS mismatch_strike_count INT NOT NULL DEFAULT 0;

