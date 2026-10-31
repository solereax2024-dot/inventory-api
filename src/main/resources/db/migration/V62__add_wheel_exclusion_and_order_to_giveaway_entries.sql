ALTER TABLE giveaway_wheel_entries
    ADD COLUMN IF NOT EXISTS excluded_from_wheel BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS wheel_display_order INTEGER NOT NULL DEFAULT 0;

WITH ordered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY updated_at DESC, id DESC) AS seq
    FROM giveaway_wheel_entries
)
UPDATE giveaway_wheel_entries entry
SET wheel_display_order = ordered.seq
FROM ordered
WHERE entry.id = ordered.id
  AND (entry.wheel_display_order IS NULL OR entry.wheel_display_order = 0);

CREATE INDEX IF NOT EXISTS idx_giveaway_wheel_entries_wheel_order
    ON giveaway_wheel_entries(excluded_from_wheel, wheel_display_order, updated_at DESC);

