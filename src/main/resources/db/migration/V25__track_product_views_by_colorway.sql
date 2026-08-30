ALTER TABLE product_view_sessions
    ADD COLUMN colorway_key VARCHAR(80);

UPDATE product_view_sessions
SET colorway_key = 'DEFAULT'
WHERE colorway_key IS NULL OR TRIM(colorway_key) = '';

ALTER TABLE product_view_sessions
    ALTER COLUMN colorway_key SET NOT NULL;

ALTER TABLE product_view_sessions
    DROP CONSTRAINT IF EXISTS uq_product_view_session;

ALTER TABLE product_view_sessions
    ADD CONSTRAINT uq_product_view_session UNIQUE (product_id, session_id, colorway_key);

CREATE INDEX IF NOT EXISTS idx_product_view_sessions_product_colorway
    ON product_view_sessions (product_id, colorway_key);

