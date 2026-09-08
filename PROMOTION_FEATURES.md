# Promotion Features (Clear Guide)

Purpose: gawing simple at checkable ang current promotion behavior natin kahit 2 lang ang types (`SALE`, `VOUCHER`).

## 1) Promo Types (Source of Truth)

### `SALE`
- Auto-apply sa matching products.
- Walang customer-facing voucher code.
- Internal code ay system-generated (`SALE-AUTO-*`) para sa storage/traceability lang.
- Sa admin table, dapat `AUTO` ang nakikita sa code column.

### `VOUCHER`
- Manual code entry ng customer sa reservation flow.
- Code is required at dapat unique.
- Validation includes active window, usage limit, min order, at target matching.

## 2) Admin UI Rules (Expected)

## Add/Edit Promotion
- `Promotion Type = SALE`
  - Voucher code input is visible but disabled.
  - Generate button is disabled.
  - Hint text: no voucher code needed, auto-applied.
- `Promotion Type = VOUCHER`
  - Voucher code input enabled.
  - Generate button enabled.
  - Code required before save.

## Validation before Save
- `SALE`: name required; code not required from admin input.
- `VOUCHER`: name + code required.

## 3) Affected Products (Targeting)

All targeting fields are optional. If none are set -> promo applies to all products.

- `targetBrands`: comma-separated brands (example: `NIKE,ADIDAS`)
- `targetCategories`: comma-separated categories (example: `FOOTWEAR,APPAREL`)
- `targetProductTypes`: comma-separated product types (example: `LIFESTYLE_SNEAKERS`)
- `targetProductIds`: comma-separated numeric IDs (example: `101,205`)
- `lowStockOnly`: applies only to low stock items (<= 3)
- `buyOneTakeOne`: requires at least 2 matching quantity to be valid

## 4) End-to-End Behavior

### A) SALE flow
1. Super admin creates `SALE` promo and activates schedule.
2. Catalog can show sale-filtered products via `sale=true`.
3. Product cards can show sale badge/caption from `salePromotions`.
4. Customer should not need to type code for SALE.

### B) VOUCHER flow
1. Super admin creates `VOUCHER` with code.
2. Customer enters code in reservation confirm step.
3. Backend validates code + rules.
4. If valid, discount is applied and persisted in order.

## 5) API/Service Checkpoints

- Admin create/list/update/delete promotions:
  - `/api/admin/promotions`
- Public voucher validation:
  - `/api/public/promotions/validate`
- Reservation apply path:
  - `/api/public/orders/reserve`

Core enforcement:
- Backend rejects manual application of non-voucher code with:
  - `This sale promo is automatic. No voucher code is needed.`

## 6) Quick UAT Checklist

## SALE (should pass)
- [ ] Add promo with `Promotion Type = SALE`
- [ ] Voucher code input cannot be edited
- [ ] Save works with name only (no manual code needed)
- [ ] Promotions table shows type `Sale` and code `AUTO`
- [ ] Copy code action is disabled for SALE row
- [ ] Product appears in `/collections?sale=true` when active and matching

## VOUCHER (should pass)
- [ ] Add promo with `Promotion Type = VOUCHER`
- [ ] Voucher code input is editable and required
- [ ] Customer can apply code in reservation
- [ ] Invalid target/minimum/order window shows proper error

## 7) Current Notes / Pending Alignment

- Admin side for SALE/VOUCHER is now simplified and enforced.
- Customer reservation modal still has generic voucher area; next cleanup can hide/disable it when context is SALE-only to remove confusion fully.
- Buy 1 Take 1 currently has rule-gate validation (>=2 matching qty); exact discount math refinement can be finalized next if needed.

## 8) File References (implementation)

- `frontend/src/components/modals/admin/PromotionForm.jsx`
- `frontend/src/pages/admin/components/PromotionsSection.jsx`
- `src/main/java/com/solereax/inventory/promotion/PromotionService.java`
- `src/main/java/com/solereax/inventory/promotion/PromotionTargetingSupport.java`
- `src/main/java/com/solereax/inventory/promotion/Promotion.java`
- `src/main/java/com/solereax/inventory/inventory/InventoryService.java`
- `frontend/src/components/catalog/ProductCard.jsx`

