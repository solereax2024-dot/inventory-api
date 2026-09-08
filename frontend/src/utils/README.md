# Frontend Utils Map

This folder contains shared frontend helper modules.

## Current modules

- `api.js`: HTTP request wrapper used by pages and admin flows.
- `price.js`: currency formatter and price display helpers.
- `format.js`: display formatters for enums and colorway labels.
- `colorway.js`: colorway normalization, sorting, image and details lookups.
- `stock.js`: stock grouping helpers for colorway/size rendering.
- `sizePresentation.js`: size-group and section builders for product/reserve screens.
- `sizeGuide.js`: brand size-guide mapping and selection helpers.
- `productDescription.js`: product description cleanup utilities.
- `productFormHelpers.js`: admin product form mappers/helpers.
- `reservationHelpers.js`: reservation row and monetary helpers.
- `reservationStatsHelpers.js`: reservation stats/filter summary builders.
- `stockSummaryHelpers.js`: stock dashboard aggregation helpers.
- `adminHelpers.js`: admin-focused formatting/status helpers.
- `metaPixel.js`: Meta/Facebook pixel bridge utility.
- `viewSession.js`: view-tracking session id helpers.
- `tracking/`: consolidated tracking exports.

## Re-export entry

Use `utils/index.js` for centralized exports when adding new shared utilities.

