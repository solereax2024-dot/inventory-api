-- Create Customer table to track customer information and loyalty
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    total_points BIGINT DEFAULT 0,
    total_spent DECIMAL(15, 2) DEFAULT 0,
    total_visits INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_email ON customers(email);
CREATE INDEX idx_customer_phone ON customers(phone);

-- Create Daily Spin/Game table - tracks when customer last played
CREATE TABLE customer_daily_spins (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    points_won BIGINT NOT NULL,
    spin_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_claimed BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_spins_customer ON customer_daily_spins(customer_id);
CREATE INDEX idx_spins_timestamp ON customer_daily_spins(spin_timestamp);

-- Create Points History table
CREATE TABLE customer_points_history (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_id BIGINT REFERENCES customer_orders(id),
    points_earned BIGINT NOT NULL,
    points_reason VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    balance_after_transaction BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_points_history_customer ON customer_points_history(customer_id);
CREATE INDEX idx_points_history_order ON customer_points_history(order_id);

-- Add customer_id to existing customer_orders table
ALTER TABLE customer_orders
ADD COLUMN customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX idx_orders_customer ON customer_orders(customer_id);

