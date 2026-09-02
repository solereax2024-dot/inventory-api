UPDATE stock_movements
SET reason = 'Manual adjustment'
WHERE reason IN ('ON_HAND', 'IN_TRANSIT', 'PRE_ORDER');

