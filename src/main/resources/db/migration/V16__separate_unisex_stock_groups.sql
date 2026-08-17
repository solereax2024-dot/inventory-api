ALTER TABLE product_stocks
    ADD COLUMN size_group VARCHAR(20);

UPDATE product_stocks
SET size_group = CASE
    WHEN COALESCE(
        (
            SELECT pcd.department
            FROM product_colorway_details pcd
            WHERE pcd.product_id = product_stocks.product_id
              AND pcd.colorway = product_stocks.colorway
            LIMIT 1
        ),
        p.department
    ) = 'UNISEX' THEN 'MEN'
    ELSE 'STANDARD'
END
FROM products p
WHERE p.id = product_stocks.product_id;

UPDATE product_stocks
SET size_group = 'STANDARD'
WHERE size_group IS NULL;

ALTER TABLE product_stocks
    ALTER COLUMN size_group SET NOT NULL;

ALTER TABLE product_stocks
    DROP CONSTRAINT IF EXISTS uq_product_size_colorway;

ALTER TABLE product_stocks
    ADD CONSTRAINT uq_product_size_colorway_group UNIQUE (product_id, size_label, colorway, size_group);

ALTER TABLE customer_order_items
    ADD COLUMN size_group VARCHAR(20);

UPDATE customer_order_items
SET size_group = CASE
    WHEN COALESCE(
        (
            SELECT pcd.department
            FROM product_colorway_details pcd
            WHERE pcd.product_id = customer_order_items.product_id
              AND pcd.colorway = customer_order_items.colorway
            LIMIT 1
        ),
        p.department
    ) = 'UNISEX' THEN 'MEN'
    ELSE 'STANDARD'
END
FROM products p
WHERE p.id = customer_order_items.product_id;

UPDATE customer_order_items
SET size_group = 'STANDARD'
WHERE size_group IS NULL;

ALTER TABLE customer_order_items
    ALTER COLUMN size_group SET NOT NULL;

