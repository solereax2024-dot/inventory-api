ALTER TABLE customer_orders
    ADD COLUMN subtotal_price NUMERIC(12,2),
    ADD COLUMN promo_code VARCHAR(40),
    ADD COLUMN promo_name VARCHAR(120),
    ADD COLUMN promo_discount_amount NUMERIC(12,2);

