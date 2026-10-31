CREATE TABLE IF NOT EXISTS giveaway_wheel_draws (
    id BIGSERIAL PRIMARY KEY,
    winner_entry_id BIGINT NOT NULL REFERENCES giveaway_wheel_entries(id),
    winner_full_name VARCHAR(255) NOT NULL,
    winner_entry_count INTEGER NOT NULL,
    total_tickets INTEGER NOT NULL,
    winning_ticket_index INTEGER NOT NULL,
    winner_ticket_offset INTEGER NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_giveaway_wheel_draws_created_at
    ON giveaway_wheel_draws(created_at DESC);

