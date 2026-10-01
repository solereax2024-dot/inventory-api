# Mobile View Audit

This document summarizes why the current mobile view can feel cramped or "panget" and visualizes the current layout stack.

## Current Mobile Composition

### Portrait flow

```text
┌──────────────────────────────────────┐
│ Header                               │  30–38px
├──────────────────────────────────────┤
│ Compact stats bar                    │  2–4px padding
├──────────────────────────────────────┤
│ Board shell                          │  1–4px padding
│ ┌─────────┬──────────────┬─────────┐ │
│ │ Hold    │   Game grid   │  Next   │ │
│ │ preview │   (center)    │ queue   │ │
│ └─────────┴──────────────┴─────────┘ │
├──────────────────────────────────────┤
│ Touch controls                       │  2–8px padding
│ [Move] [Drop] [Actions]              │
└──────────────────────────────────────┘
```

## Audit Findings

### 1) The board is competing with too many vertical consumers
- Header still reserves fixed height on mobile.
- Stats bar still exists above the board on gameplay screens.
- Hold / Next panels still occupy vertical space even when the main board should dominate.
- Touch controls still stack below the board and need their own area.

### 2) Hold / Next preview containers are still visually heavy
- Each preview panel has its own shell, heading, and padding.
- Even after compression, the hold/next columns still behave like full side panels.
- The board grid is visually secondary because the eye is split among 3 columns.

### 3) The mobile UI feels "preset" because of compact start/prestart styling
- The start state uses minimal cards and special compact treatment.
- This creates a separate visual language for mobile before gameplay starts.
- If the goal is a cleaner gameplay-first phone layout, the start state should be simpler and visually closer to gameplay styling.

### 4) The mini-block previews are capped by CSS constraints
- Preview blocks use `clamp(...)` values that prevent the hold/next pieces from scaling naturally.
- The mini-grid is still bound to a fixed preview geometry rather than a fully fluid content-driven size.

## What is currently strongest visually
- The main board shell already has a premium frame and glow.
- Touch controls are readable and grouped correctly.
- The gameplay screen is functional and responsive.

## What still makes the mobile view feel crowded
1. Fixed header height.
2. Stats bar above the board.
3. Hold / Next columns around the board.
4. Touch controls below the board.
5. Preview panels still have their own padding and labels.

## Recommended direction
If the goal is to make mobile feel cleaner and larger:

- Reduce or hide the top stats during gameplay.
- Make the board column visually dominant.
- Collapse hold / next into slimmer preview bands.
- Reduce label density and panel padding.
- Let the board grid consume more of the viewport height.

## Quick visual target

```text
Desired mobile gameplay:
┌──────────────────────────────────────┐
│ Header (smaller)                     │
├──────────────────────────────────────┤
│ Board dominates most of the screen   │
│ [slim hold] [large grid] [slim next] │
├──────────────────────────────────────┤
│ Controls compressed but usable       │
└──────────────────────────────────────┘
```

## Notes
- Current implementation is functional.
- The main issue is visual hierarchy, not game logic.
- The board should be the star on mobile; hold/next and controls should support it, not compete with it.


