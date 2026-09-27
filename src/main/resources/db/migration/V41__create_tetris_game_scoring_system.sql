-- Tetris Game System

-- Create Leaderboard table
CREATE TABLE tetris_leaderboard (
    id BIGSERIAL PRIMARY KEY,
    player_name VARCHAR(255) NOT NULL UNIQUE,
    highest_score INT DEFAULT 0,
    highest_level INT DEFAULT 1,
    total_games INT DEFAULT 0,
    total_lines_cleared INT DEFAULT 0,
    last_played TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_tetris_leaderboard_score ON tetris_leaderboard(highest_score DESC);
CREATE INDEX idx_tetris_leaderboard_player ON tetris_leaderboard(player_name);
CREATE INDEX idx_tetris_leaderboard_level ON tetris_leaderboard(highest_level DESC);

