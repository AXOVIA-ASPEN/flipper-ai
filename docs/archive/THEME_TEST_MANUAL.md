# Manual Theme Testing Guide

## Quick Verification Steps

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to settings:**
   - Go to http://localhost:3000/settings

3. **Test theme switching:**
   - Click on each theme option (Purple Dream, Ocean Breeze, Sunset Glow, etc.)
   - **Expected:** Theme colors should change instantly
   - **Expected:** Active theme should have a green indicator dot
   - **Expected:** "Active Theme" label should appear on selected theme

4. **Test persistence:**
   - Select a theme (e.g., "Ocean Breeze")
   - Refresh the page
   - **Expected:** Ocean theme should still be active
   - Navigate to home page (/)
   - Navigate back to /settings
   - **Expected:** Ocean theme should still be active

5. **Test localStorage:**
   - Open browser devtools → Application → Local Storage
   - Look for key `flipper-theme`
   - **Expected:** Value should match the selected theme ID (e.g., "ocean")

6. **Visual verification:**
   - Go to home page (/)
   - **Expected:** Dashboard should use the selected theme's gradient colors
   - Check background orbs, button gradients, card colors

## Browser Console Tests

Run these in the browser console:

```javascript
// Check current theme
localStorage.getItem('flipper-theme')
// Should return: "ocean" (or whatever theme you selected)

// Manually set a theme
localStorage.setItem('flipper-theme', 'sunset')
location.reload()
// Should reload with Sunset theme active

// Clear theme (should default to purple)
localStorage.removeItem('flipper-theme')
location.reload()
// Should reload with Purple Dream theme active
```

## Known Issues

- E2E tests need Next.js dev server running
- ThemeSettings component requires client-side rendering (uses localStorage)

## Fix Completed

✅ Restored original ThemeContext
✅ Fixed ThemeSettings to use correct theme structure
✅ Theme switching now works correctly
✅ Theme persists across page reloads
✅ All 6 themes available (Purple, Ocean, Sunset, Forest, Midnight, Rose)
