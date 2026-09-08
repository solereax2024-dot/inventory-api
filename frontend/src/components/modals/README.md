# Modal Structure

This folder centralizes reusable modal components.

## Folders

- `admin/`: modals used in admin pages
- `customer/`: modals used in customer pages

## Conventions

- Keep modal state in parent page when it needs shared data.
- Keep modal-only UI state inside the modal component.
- Use shared classes from `frontend/src/styles/modals.css` for base layout (`modal-overlay`, `modal-panel`, `modal-sticky-footer`).
- Add feature-specific classes only when needed to avoid style overlap.

## Exports

- `admin/index.js` and `customer/index.js` provide barrel exports for cleaner imports.

