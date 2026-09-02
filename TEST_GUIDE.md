# Manual Testing Guide

## Setup
- Backend running: http://localhost:8080
- Database: PostgreSQL (Docker container: sole-reax-postgres)
- Frontend: Embedded in Spring Boot static assets

## Test Scenarios

### 1. Stock Supplier/Source Tracking ✅

#### 1.1 Add Stock with Supplier (Required)
1. Navigate to http://localhost:8080
2. Login as admin
3. Go to Admin section → View Stocks (or Product Management)
4. Select a product and click "Adjust Stock"
5. Select "Add Stock" mode
6. **Expected:** Supplier field should appear and be marked as required
7. Try adding stock WITHOUT filling supplier
   - **Expected:** Error message "Enter supplier/source before adding stock."
8. Fill in supplier (e.g., "Nike Warehouse", "Local Distributor")
9. Fill quantity and select source type (ON_HAND, IN_TRANSIT, PRE_ORDER)
10. Click "Add Stock"
    - **Expected:** Stock added successfully and supplier persisted

#### 1.2 Remove Stock (Supplier Optional)
1. Select "Remove Stock" mode
2. **Expected:** Supplier field should appear but NOT be required
3. Proceed without supplier
    - **Expected:** Stock removal succeeds without supplier

#### 1.3 Update Only Supplier
1. Existing stock row should have supplier displayed
2. Use quick edit to update supplier directly
    - **Expected:** Supplier updates without changing quantity

### 2. Stock Summary UI Enhancements ✅

#### 2.1 Metrics Cards Display
1. Open "View Stock Summary" modal for any product
2. **Expected:** Top section shows:
   - "On Hand: [total qty]" card
   - "In Transit: [total qty]" card  
   - "Pre-Order: [total qty]" card

#### 2.2 Supplier Column
1. In stock summary table, look for "Supplier" column
2. **Expected:** Shows supplier value as chip/badge if present, empty otherwise
3. **Visual:** Colored chip background (brand-aware styling)

#### 2.3 Quick Filter Chips
1. Above the stock summary table, find filter section
2. **Available filters:**
   - "Low Stock Only" - shows rows with qty < 10
   - "Missing Supplier" - shows rows where supplier is empty
   - "With In-Transit" - shows only rows with inTransit qty > 0
   - "Clear" - resets all filters

#### Test Each Filter:
1. Click "Low Stock Only"
   - **Expected:** Table rows filtered to show only quantity < 10
2. Click "Missing Supplier"
   - **Expected:** Table rows show only items without supplier
3. Click "With In-Transit"
   - **Expected:** Table rows show only items with in-transit stock
4. Click "Clear"
   - **Expected:** All rows show, no filters active

#### 2.4 Per-Row Quick Edit Controls
1. In stock summary table, look for "Quick Edit" column
2. **For Quantity:**
   - See input field with quantity
   - Click "+ Add" → adds 1 to on-hand stock
   - Click "- Remove" → removes 1 from on-hand stock
   - **Expected:** Row updates optimistically with saving indicator

3. **For Supplier:**
   - See input field with current supplier value
   - Edit the text
   - Click "Save Supplier"
   - **Expected:** Supplier updates in database and UI refreshes

4. **For Price:**
   - See input field with current price
   - Edit the number
   - Click "Save Price"
   - **Expected:** Price updates in database and UI refreshes

#### 2.5 Save State Indicator
1. Trigger any quick edit action
2. **Expected:** Button changes to show "Saving..." state
3. **Expected:** Once saved, button returns to normal state
4. Try rapid multiple edits
   - **Expected:** No duplicate submissions (row-level locking)

### 3. Search Suggestion Consistency ✅

#### 3.1 Homepage Search Suggestions
1. Go to http://localhost:8080 homepage
2. Click search bar
3. Type a brand name (e.g., "Nike", "Adidas", "On")
4. **Expected:** Suggestion cards appear
5. **CRITICAL CHECK:** Verify label and image match
   - Example: If label says "Nike Air Max", image should be Nike product
   - Example: If label says "On Cloud", image should be On Cloud shoe (NOT Nike)
   - NO mismatches like "On Cloud" label with Nike image

#### 3.2 Fallback Suggestions  
1. If typed brand has no products, system shows fallback suggestions
2. **Expected:** Fallback suggestions show consistent data:
   - Label matches actual product
   - Image matches that product
   - Query matches product brand/name

### 4. Database Verification ✅

#### 4.1 Check Migration Applied
```sql
-- Connect to database (if you have psql)
-- Table should have supplier column
SELECT * FROM product_stocks LIMIT 1;
-- Verify 'supplier' column exists
```

#### 4.2 Sample Query
```sql
-- Find stocks with suppliers
SELECT product_id, size_label, quantity, supplier 
FROM product_stocks 
WHERE supplier IS NOT NULL 
LIMIT 5;
```

## Troubleshooting

### Backend Not Running
```bash
# Check if running
curl -s http://localhost:8080 | head -5

# Restart if needed
cd /Users/Domingo/Documents/inventory-api
docker-compose up -d  # Start DB
./mvnw spring-boot:run -DskipTests=true
```

### Database Connection Issues
```bash
# Verify Docker containers
docker-compose ps

# Restart database
docker-compose down
docker-compose up -d
```

### Frontend Not Updated
```bash
# Rebuild frontend
cd /Users/Domingo/Documents/inventory-api/frontend
npm run build

# Then restart backend
cd ..
./mvnw spring-boot:run -DskipTests=true
```

## Test Results Template

Use this to document your testing:

```
Test Date: ___________
Tester: ___________

1. Supplier Tracking: ☐ PASS ☐ FAIL
   Notes: _________________________________

2. Stock Summary Metrics: ☐ PASS ☐ FAIL
   Notes: _________________________________

3. Quick Filters: ☐ PASS ☐ FAIL
   Notes: _________________________________

4. Quick Edit Controls: ☐ PASS ☐ FAIL
   Notes: _________________________________

5. Search Suggestions: ☐ PASS ☐ FAIL
   Notes: _________________________________

Overall: ☐ ALL PASS ☐ ISSUES FOUND
Issues to fix: _________________________________
```

## Code Changes Reference

| File | Change | Impact |
|------|--------|--------|
| ProductStock.java | Added `supplier` column | DB persistence |
| AdminAdjustStockRequest.java | Added `supplier` field | API input |
| SizeStockResponse.java | Added `supplier` field | API output |
| InventoryService.java | Supplier validation & mapping | Business logic |
| V26__...sql | Schema migration | Database |
| AdminPage.jsx | Stock form + summary UI | Frontend |
| stock.js | Supplier tracking in rows | Data transformation |
| admin.css | Styling for new features | Visual |
| SiteHeader.jsx | Search suggestion fix | Bug fix |

## Contact

If issues arise:
1. Check logs: `./mvnw spring-boot:run` (not in background)
2. Clear cache: `rm -rf target/ && rm -rf frontend/node_modules/.vite`
3. Rebuild: `npm run build && ./mvnw clean spring-boot:run`

