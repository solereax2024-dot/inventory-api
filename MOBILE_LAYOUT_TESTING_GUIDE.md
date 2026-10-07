# Mobile Layout Verification & Testing Guide
**Date:** October 5, 2026  
**Purpose:** Verify that Tetris mobile layout is working correctly after Phase 1 CSS cleanup

---

## 🧪 Quick Visual Test Checklist

### Test 1: DevTools Mobile Simulation
**Steps:**
1. Open the Tetris game in browser
2. Press `F12` to open DevTools
3. Click the device toggle (📱 icon) or press `Ctrl+Shift+M` (Windows) / `Cmd+Shift+M` (Mac)
4. Select "iPhone 12" or another mobile device preset
5. Open the Tetris game at `/tetris`

**Expected Results:**
- ✅ Only the game board is visible
- ✅ Leaderboard panel is HIDDEN
- ✅ Side details panel (Hold/Next) is HIDDEN
- ✅ Header is compact (26-38px height)
- ✅ Game board takes ~90% of vertical space
- ✅ Touch controls visible at bottom

**If you see 3 columns:**
- Viewport width is probably > 640px
- Try narrower device preset (e.g., iPhone SE instead of iPad)

---

### Test 2: Inspect Element (DevTools Inspector)
**Steps:**
1. Open DevTools (F12)
2. Right-click on the game area → "Inspect"
3. Look for the `.tetris-shell` element in the DOM tree
4. Check if it has the `is-mobile-viewport` class

**Expected Classes:**
```html
<div class="tetris-shell is-mobile-viewport">
  <!-- Should show mobile-specific classes -->
</div>
```

**Verify Media Queries:**
1. In DevTools, find the `.tetris-leaderboard-column` element
2. Right-click → "Inspect"
3. Look for `display: none` in the applied styles
4. Hover over the media query source - it should show `@media (max-width: 640px)`

**If display: none is NOT showing:**
- The viewport width is > 640px
- The media query isn't matching
- Try resizing browser to narrower width

---

### Test 3: Actual Mobile Device Testing

#### iPhone Testing
**Test on:**
- ✅ iPhone 12/13/14/15 (390px width)
- ✅ iPhone SE (375px width)
- ✅ iPhone XR/11 (414px width)

**How to test:**
1. On your Mac: Deploy app to test server
2. On iPhone: Open Safari, go to test server URL
3. Open Tetris game

**Expected Layout:**
```
┌──────────────────────┐
│  [Header - compact]  │  ← 26-38px
├──────────────────────┤
│                      │
│   [Game Board]       │  ← Full width, ~80% height
│                      │
│                      │
├──────────────────────┤
│  [Touch Controls]    │  ← Bottom bar
└──────────────────────┘
```

---

### Test 4: Responsive Width Check
**Using Browser DevTools:**
1. Open DevTools Console (F12 → Console)
2. Paste this code:
```javascript
console.log('Window width:', window.innerWidth);
console.log('Visual viewport width:', window.visualViewport?.width);
console.log('Is mobile (< 640px)?', window.innerWidth < 640);
console.log('Shell has is-mobile-viewport?', 
  document.querySelector('.tetris-shell')?.classList.contains('is-mobile-viewport')
);
```

3. Check the output

**Expected Output (Mobile):**
```
Window width: 390
Visual viewport width: 390
Is mobile (< 640px)? true
Shell has is-mobile-viewport? true
```

**Expected Output (Desktop):**
```
Window width: 1920
Visual viewport width: 1920
Is mobile (< 640px)? false
Shell has is-mobile-viewport? false
```

---

### Test 5: Verify CSS Media Query Application
**Steps:**
1. Open DevTools
2. Go to DevTools Styles panel (right side)
3. Find `.tetris-main` element
4. In the Styles panel, look for matching media query

**Should show:**
```css
@media (max-width: 640px) {
    .tetris-main {
        grid-template-columns: 1fr;
        ...
    }
    
    .tetris-leaderboard-column,
    .tetris-side-details {
        display: none !important;  ← KEY RULE
    }
}
```

**Verify it's active:**
- The media query should have a blue checkmark ✓
- If crossed out ✗, viewport width is > 640px

---

### Test 6: Touch Controls Visibility
**On mobile device:**
1. Play the game for a few seconds
2. Verify you can see:
   - ✅ Score, Level, Lines at top of board
   - ✅ Game controls at bottom
   - ✅ D-Pad / movement buttons
   - ✅ Rotation / drop buttons
3. Verify controls are easily tapable (> 44px touch target)

**Common issues:**
- ❌ Controls cut off at bottom → Height breakpoint issue
- ❌ Controls overlapping board → Flexbox gap issue
- ❌ Controls too small → Font size issue

---

## 🔍 Troubleshooting

### Issue 1: Still Seeing 3-Column Layout on Mobile
**Causes:**
1. Browser viewport is actually > 640px (not truly mobile)
2. CSS media queries not loading
3. CSS specificity conflict

**Solutions:**
1. Check viewport width in console (see Test 4)
2. Verify build was successful: `npm run build`
3. Clear browser cache: DevTools → Settings → Network → Disable cache, then reload
4. Check for CSS parsing errors in console

**Detailed Debug:**
```javascript
// In browser console:
const shell = document.querySelector('.tetris-shell');
const leaderboard = document.querySelector('.tetris-leaderboard-column');
const computedStyle = window.getComputedStyle(leaderboard);
console.log('Leaderboard display:', computedStyle.display);
console.log('Is it hidden?', computedStyle.display === 'none');
```

---

### Issue 2: Mobile Detected but Layout Still Shows 3 Columns
**Cause:** `is-mobile-viewport` class applied but media query not matching

**Debug:**
```javascript
// Check viewport width
console.log('window.innerWidth:', window.innerWidth);
console.log('window.visualViewport.width:', window.visualViewport?.width);

// Should be < 640 if is-mobile-viewport is true but layout shows 3 columns
```

**Solution:**
If `window.innerWidth > 640` but `is-mobile-viewport` class is applied:
- This is actually correct behavior
- The CSS media query uses browser viewport, not custom class
- The `is-mobile-viewport` class is for JavaScript logic only

---

### Issue 3: Header Too Large/Small on Mobile
**Expected:** 26-38px depending on screen height

**Check:**
```javascript
const header = document.querySelector('.tetris-header');
const height = window.getComputedStyle(header).height;
console.log('Header height:', height);
```

**Solutions:**
- Check if using correct height breakpoints
- Verify tetris-responsive.css media queries for height
- Clear cache and rebuild

---

### Issue 4: Touch Controls Cut Off
**Cause:** Viewport height too small or controls too tall

**Check:**
```javascript
console.log('viewport height:', window.innerHeight);
console.log('is short mobile?', window.innerHeight <= 760);
console.log('is very short mobile?', window.innerHeight <= 680);
```

**Solutions:**
- Very short (< 680px) → Use compact mode
- Short (< 760px) → Use reduced padding
- Normal (> 760px) → Use normal spacing

---

## 📊 Expected Breakpoints & Behavior

| Metric | Mobile | Tablet | Desktop |
|--------|--------|--------|---------|
| **Width** | < 640px | 640-1024px | > 1024px |
| **Layout Columns** | 1 | 3 | 3 |
| **Leaderboard** | HIDDEN | VISIBLE | VISIBLE |
| **Side Panels** | HIDDEN | VISIBLE | VISIBLE |
| **Header Height** | 26-38px | 40-50px | 50-80px |
| **Block Size** | 7-14px | 15-20px | 20-30px |
| **Grid Inset** | 2-8px | 8px | 8px |

---

## 🧹 CSS Files Status After Phase 1 Cleanup

| File | Status | Notes |
|------|--------|-------|
| `tetris-layout.css` | ✅ ACTIVE | Contains main mobile media query |
| `tetris-responsive.css` | ✅ ACTIVE | Contains height breakpoints |
| `tetris-polish.css` | ✅ CLEANED | Removed 84 unused lines |
| `tetris-layout-modern.css` | 🗑️ DELETED | Was conflicting |
| `tetris-modern-theme.css` | 🗑️ DELETED | Was unused |

---

## ✅ Verification Checklist

After Phase 1 cleanup, verify:

- [ ] Build completes without errors: `npm run build`
- [ ] Desktop layout still works (3-column on > 640px)
- [ ] Mobile layout works in DevTools mobile simulator
- [ ] Mobile layout works on real iPhone/Android device
- [ ] No console errors or CSS warnings
- [ ] Touch controls are accessible and functional
- [ ] Header is appropriately sized for each breakpoint
- [ ] Leaderboard is hidden on mobile (display: none)
- [ ] Side panels are hidden on mobile (display: none)
- [ ] Game board takes full width on mobile
- [ ] No layout shifts when resizing
- [ ] Safe area insets handled correctly on notched devices

---

## 📞 Next Steps

1. **Run the verification tests above** - especially Test 2 & 4
2. **Test on real mobile device** if possible
3. **If mobile layout still shows 3 columns:**
   - Check actual viewport width (should be < 640px for mobile view)
   - Verify CSS loaded: Check Network tab in DevTools
   - Clear cache and reload
4. **If all tests pass:**
   - Consider Phase 2: Consolidate theme variables
   - Consider Phase 3: Centralize responsive queries
5. **Report any issues** with specific viewport sizes and devices

---

**Status:** ✅ Phase 1 Complete - Ready for Testing
**Last Updated:** October 5, 2026

