# Tetris Score Popup Mobile Visibility Fix

## Problem
The score popup display (showing +points, combo bonuses, T-Spin, etc.) was hidden on mobile view, especially when displaying large scores like combo bonuses.

## Root Cause
The point popups animation moves elements upward to **-165% translateY** (far above the container). However, two CSS properties were clipping this overflow:

1. **`.tetris-grid`** had `clip-path: inset(0)` - preventing content outside boundaries
2. **`.tetris-playfield`** had both `overflow: hidden` and `clip-path: inset(0)` - clipping popups

On mobile where containers are smaller, the popups were clipped even earlier, making them completely invisible.

## Solution Applied

### File 1: `/frontend/src/styles/tetris/tetris-grid.css` (Line 22-23)
**Before:**
```css
clip-path: inset(0);
contain: layout paint;
```

**After:**
```css
/* clip-path removed to allow point popups to overflow above grid */
contain: layout style;
```

### File 2: `/frontend/src/styles/tetris/tetris-board.css` (Line 39-40)
**Before:**
```css
overflow: hidden;
clip-path: inset(0);
```

**After:**
```css
overflow: visible;
/* clip-path removed to allow point popups to overflow above playfield */
```

## How It Works
- Removed `clip-path: inset(0)` from both containers to stop clipping overflow
- Changed `overflow: hidden` to `overflow: visible` on `.tetris-playfield` to allow popups to animate above
- The `.tetris-point-popup` animation (1.32s duration) now properly animates upward without being clipped
- Point popups are still `pointer-events: none` so they don't interfere with gameplay

## Testing
1. Start the Tetris game on desktop and mobile
2. Place blocks to clear lines and trigger score popups
3. Verify popups float upward and fade out smoothly
4. Test with large scores (Tetris, combos, T-Spins)
5. Confirm popups are fully visible on both desktop and mobile

## Affected Elements
- ✅ Score popups (+points)
- ✅ Tetris clear bonuses
- ✅ Combo count popups
- ✅ Back-to-back bonuses
- ✅ T-Spin bonuses
- ✅ All animations during gameplay

## Build Status
✓ Frontend built successfully with changes applied

