ALTER TABLE product_stocks
    ADD COLUMN colorway VARCHAR(80);

UPDATE product_stocks
SET colorway = 'DEFAULT'
WHERE colorway IS NULL;

ALTER TABLE product_stocks
    ALTER COLUMN colorway SET NOT NULL;

ALTER TABLE product_stocks
    DROP CONSTRAINT IF EXISTS uq_product_size;

ALTER TABLE product_stocks
    ADD CONSTRAINT uq_product_size_colorway UNIQUE (product_id, size_label, colorway);

ALTER TABLE customer_order_items
    ADD COLUMN colorway VARCHAR(80);

UPDATE customer_order_items
SET colorway = 'DEFAULT'
WHERE colorway IS NULL;

ALTER TABLE customer_order_items
    ALTER COLUMN colorway SET NOT NULL;
