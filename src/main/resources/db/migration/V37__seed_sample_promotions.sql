-- Seed sample promotions for quick manual testing in admin and customer flows.

INSERT INTO promotions (
    code,
    name,
    description,
    discount_type,
    discount_value,
    min_order_amount,
    max_discount_amount,
    usage_limit,
    used_count,
    starts_at,
    ends_at,
    active,
    low_stock_only,
    target_brands,
    target_categories,
    target_product_types,
    target_product_ids,
    buy_one_take_one
) VALUES (
    'SALE-AUTO-SAMPLE01',
    'Sample Auto Sale 15% Off',
    '[SALE] Auto 15% discount for footwear items',
    'PERCENT',
    15.00,
    1000.00,
    1200.00,
    NULL,
    0,
    NULL,
    NULL,
    TRUE,
    FALSE,
    NULL,
    'FOOTWEAR',
    NULL,
    NULL,
    FALSE
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO promotions (
    code,
    name,
    description,
    discount_type,
    discount_value,
    min_order_amount,
    max_discount_amount,
    usage_limit,
    used_count,
    starts_at,
    ends_at,
    active,
    low_stock_only,
    target_brands,
    target_categories,
    target_product_types,
    target_product_ids,
    buy_one_take_one
) VALUES (
    'WELCOME500',
    'Sample Voucher 500 Off',
    '[VOUCHER] Flat 500 off for Nike orders',
    'FIXED',
    500.00,
    2500.00,
    NULL,
    200,
    0,
    NULL,
    NULL,
    TRUE,
    FALSE,
    'NIKE',
    NULL,
    NULL,
    NULL,
    FALSE
)
ON CONFLICT (code) DO NOTHING;

