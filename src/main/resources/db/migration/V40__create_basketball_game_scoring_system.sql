-- Basketball Shooting Game System

-- Create Shooting Games table
CREATE TABLE basketball_shooting_games (
    id BIGSERIAL PRIMARY KEY,
    player_name VARCHAR(255) NOT NULL,
    level INT DEFAULT 1, -- Level 1-10
    current_score INT DEFAULT 0,
    shots_attempted INT DEFAULT 0,
    shots_made INT DEFAULT 0,
    combo_counter INT DEFAULT 0,
    board_ring_position VARCHAR(50) DEFAULT 'CENTER', -- CENTER, LEFT, RIGHT, TOP, BOTTOM, CORNER_TL, CORNER_TR, CORNER_BL, CORNER_BR
    board_ring_distance INT DEFAULT 1, -- Distance multiplier (1=easy, 3=hard)
    game_status VARCHAR(50) DEFAULT 'PLAYING', -- PLAYING, FINISHED
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Shot Records table
CREATE TABLE basketball_shots (
    id BIGSERIAL PRIMARY KEY,
    game_id BIGINT NOT NULL REFERENCES basketball_shooting_games(id) ON DELETE CASCADE,
    shot_number INT NOT NULL,
    board_ring_position VARCHAR(50) NOT NULL, -- Where the ring was positioned
    difficulty_level INT NOT NULL, -- Distance/difficulty
    shot_type VARCHAR(50), -- 'MADE', 'MISSED'
    points_earned INT DEFAULT 0,
    combo_bonus INT DEFAULT 0,
    total_points_after INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Leaderboard table
CREATE TABLE basketball_leaderboard (
    id BIGSERIAL PRIMARY KEY,
    player_name VARCHAR(255) NOT NULL,
    highest_score INT DEFAULT 0,
    highest_level INT DEFAULT 1,
    total_games INT DEFAULT 0,
    accuracy_percentage DECIMAL(5,2) DEFAULT 0,
    last_played TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_shooting_game_status ON basketball_shooting_games(game_status);
CREATE INDEX idx_shooting_game_player ON basketball_shooting_games(player_name);
CREATE INDEX idx_shots_game ON basketball_shots(game_id);
CREATE INDEX idx_leaderboard_score ON basketball_leaderboard(highest_score DESC);
CREATE INDEX idx_leaderboard_player ON basketball_leaderboard(player_name);

