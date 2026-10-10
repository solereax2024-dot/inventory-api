WITH ranked_entries AS (
    SELECT id,
           ROW_NUMBER() OVER (
               ORDER BY highest_score DESC,
                        highest_level DESC,
                        total_lines_cleared DESC,
                        LOWER(TRIM(player_name)) ASC,
                        id ASC
           ) AS leaderboard_rank
    FROM tetris_leaderboard
)
DELETE FROM tetris_leaderboard
WHERE id IN (
    SELECT id
    FROM ranked_entries
    WHERE leaderboard_rank > 10
);

