ALTER TABLE promotions
    ADD COLUMN low_stock_only BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN target_brands VARCHAR(2000),
    ADD COLUMN target_categories VARCHAR(2000),
    ADD COLUMN target_product_types VARCHAR(2000),
    ADD COLUMN target_product_ids VARCHAR(2000),
    ADD COLUMN buy_one_take_one BOOLEAN NOT NULL DEFAULT FALSE;

