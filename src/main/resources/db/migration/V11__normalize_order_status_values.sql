UPDATE customer_orders
SET status = 'ORDERED'
WHERE status = 'RESERVED';
