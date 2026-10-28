CREATE TABLE IF NOT EXISTS tetris_run_sessions (
    run_id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    last_heartbeat_at TIMESTAMPTZ NOT NULL,
    last_elapsed_ms BIGINT NOT NULL DEFAULT 0,
    last_score INT NOT NULL DEFAULT 0,
    last_level INT NOT NULL DEFAULT 1,
    last_lines_cleared INT NOT NULL DEFAULT 0,
    last_pieces_locked INT NOT NULL DEFAULT 0,
    heartbeat_count INT NOT NULL DEFAULT 0,
    suspicious_signal_count INT NOT NULL DEFAULT 0,
    blocked BOOLEAN NOT NULL DEFAULT FALSE,
    block_reason VARCHAR(1000),
    ended BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tetris_run_sessions_username_active
    ON tetris_run_sessions (username, ended, updated_at DESC);

