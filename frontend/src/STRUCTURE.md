# Frontend Structure Guide

This frontend is organized by responsibility to keep features easier to find and maintain.

## Main Folders

- `components/`
  - `core/`: app-level infrastructure (`AppErrorBoundary`)
  - `catalog/`: customer catalog building blocks (`ProductCard`, `BrandsMarquee`)
  - `layout/`: global layout building blocks (`SiteHeader`, `SiteFooter`)
  - `theme/`: theme customization components (`ThemeColorPicker`, `WelcomeThemeModal`)
  - `modals/`: reusable modal components grouped by audience (`admin/`, `customer/`)
- `pages/`
  - `admin/`: admin route pages and admin-only composed page sections
  - `customer/`: customer-facing route pages
- `constants/`
  - `product.js`: product/catalog constants
  - `reservation.js`: reservation/payment/status/courier options
  - `index.js`: barrel exports for shared imports
- `hooks/`
  - reusable UI/state hooks (modal state, toggle state, reservation editor state)
  - `index.js`: barrel exports
- `utils/`
  - shared business and formatting utilities
  - `tracking/`: analytics/session tracking exports

## Conventions

- Prefer importing constants from `constants/index.js`.
- Prefer importing hooks from `hooks/index.js`.
- Keep modal styles in `styles/modals.css` for consistency.
- Extract page-specific complexity into `hooks/` or `utils/` when it grows.

