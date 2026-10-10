DELETE FROM tetris_leaderboard tl
WHERE NOT EXISTS (
    SELECT 1
    FROM app_users au
    WHERE au.role = 'CUSTOMER'
      AND LOWER(TRIM(au.username)) = LOWER(TRIM(tl.player_name))
);

