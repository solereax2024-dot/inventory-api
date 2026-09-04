ALTER TABLE customer_orders
    ADD COLUMN payment_provider VARCHAR(40),
    ADD COLUMN payment_status VARCHAR(30),
    ADD COLUMN payment_reference VARCHAR(120),
    ADD COLUMN payment_checkout_id VARCHAR(120),
    ADD COLUMN payment_checkout_url VARCHAR(500),
    ADD COLUMN payment_last_event VARCHAR(120),
    ADD COLUMN payment_paid_at TIMESTAMP;

CREATE INDEX idx_customer_orders_payment_checkout_id ON customer_orders(payment_checkout_id);

