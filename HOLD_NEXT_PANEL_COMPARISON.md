# Hold vs Next Panel Comparison

## Issue Found: Panels Are NOT Positioned/Styled the Same

### **HOLD PANEL** (Left Side)
**File:** `TetrisBoardStage.jsx` - Line 62

```jsx
<section className="tetris-board-side-panel tetris-board-side-panel-hold tetris-detail-panel tetris-panel tetris-panel-compact tetris-panel-subtle tetris-hud-card"
```

**Unique CSS Classes:**
- ✅ `tetris-panel-subtle` → Adds opacity: 0.96 (more transparent)

**Styling:**
- Padding: 8px 6px (desktop)
- **Opacity: 0.96** ← Makes it appear faded/less prominent
- Standard box-shadow (0 4px 12px...)
- Background: Linear gradient (basic)


---

### **NEXT PANEL** (Right Side)
**File:** `TetrisBoardStage.jsx` - Line 81

```jsx
<section className="tetris-board-side-panel tetris-board-side-panel-next tetris-detail-panel tetris-panel tetris-panel-compact tetris-panel-priority tetris-panel-featured tetris-hud-card"
```

**Unique CSS Classes:**
- ✅ `tetris-panel-priority` → Adds box-shadow: var(--shadow-lg) (larger, more prominent shadow)
- ✅ `tetris-panel-featured` → Adds special border-color and background gradient with golden accent

**Styling:**
- Padding: 8px 6px (desktop)
- **Full opacity (1.0)** ← Fully visible and prominent
- **Enhanced box-shadow** (0 6px 16px...) ← More dramatic
- **Background: Radial gradient at top right with golden accent** (rgba(251, 191, 36, 0.12))
- **Border-color: rgba(251, 191, 36, 0.32)** ← Golden tint

---

## Visual Differences Summary

| Aspect | Hold Panel | Next Panel |
|--------|-----------|-----------|
| **Opacity** | 0.96 (Faded) | 1.0 (Full) |
| **Box Shadow** | Standard | Enhanced (shadow-lg) |
| **Border Color** | Default blue | **Golden accent** |
| **Background Accent** | Basic gradient | **Golden radial gradient** |
| **Visual Priority** | ⬇️ Lower (subtle) | ⬆️ Higher (featured) |

---

## CSS Code References

### Hold Panel - `tetris-panel-subtle`
**Location:** `tetris-panels.css` - Line 237-239
```css
.tetris-panel-subtle {
    opacity: 0.96;
}
```

### Next Panel - `tetris-panel-priority`
**Location:** `tetris-panels.css` - Line 226-228
```css
.tetris-panel-priority {
    box-shadow: var(--shadow-lg);
}
```

### Next Panel - `tetris-panel-featured`
**Location:** `tetris-panels.css` - Line 230-235
```css
.tetris-panel-featured {
    border-color: rgba(251, 191, 36, 0.32);
    background:
            radial-gradient(circle at top right, rgba(251, 191, 36, 0.12), transparent 34%),
            linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.94));
}
```

---

## Recommendation

The panels are **intentionally styled differently**:
- ✅ **Hold Panel:** Subtle, less intrusive design
- ✅ **Next Panel:** More prominent with golden accents, indicating it's the primary focus

This is a **design choice** to show visual hierarchy. The Next queue is what the player needs to prepare for, while Hold is a utility feature. If you want them to match, you would need to:

1. Remove `tetris-panel-subtle` from Hold panel
2. Remove `tetris-panel-priority` and `tetris-panel-featured` from Next panel
3. Or swap the classes to make them both the same style

Would you like me to make them match?

