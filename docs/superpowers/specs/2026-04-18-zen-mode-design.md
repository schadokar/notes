---
name: Zen Mode Configuration for Starlight View Modes
description: Add zen mode toggle (button + keyboard shortcut) to hide sidebar and right TOC, expand content to full viewport width
type: implementation
---

# Zen Mode Configuration for Starlight View Modes

## Overview

Extend the `starlight-view-modes` plugin to provide a zen mode feature that hides both the left sidebar and right table of contents, allowing full-viewport content width. Toggle via navbar button and keyboard shortcut `Shift+Cmd/Ctrl+Z`.

## Requirements

- **Default state:** Zen mode off (normal layout visible)
- **UI toggle:** Button in navbar header (right of social links, left of search)
- **Keyboard shortcut:** `Shift+Cmd+Z` (macOS) / `Shift+Ctrl+Z` (Windows/Linux)
- **Hidden elements:** Left sidebar + right TOC
- **Content width:** Full viewport (100vw)
- **Persistence:** State saved to localStorage
- **Behavior:** Smooth transitions, preserve scroll position on toggle

## Architecture

### Plugin Configuration
Extend `starlightViewModes()` in `astro.config.mjs` with zen mode option. Plugin emits `data-zen-mode="true"` on root element (`<html>` or `<body>`) when activated.

### State Management
- localStorage key: `zen-mode` (value: "true" or "false")
- On page load: check localStorage, apply state
- On toggle: update localStorage + DOM attribute

### UI Components
1. **Navbar button:** Toggle button in header (custom component or plugin slot)
   - Icon: eye (normal) / eye-off (zen)
   - Tooltip: "Zen Mode (Shift+Cmd+Z)"
   - Click handler: toggles state

2. **Keyboard handler:** Global listener for `Shift+Cmd/Ctrl+Z`
   - Prevents default browser behavior
   - Fires toggle function
   - Works on any page

### Styling
Create `src/styles/zen-mode.css`:
```css
/* Hide sidebar in zen mode */
[data-zen-mode="true"] aside {
  display: none;
}

/* Hide right TOC in zen mode */
[data-zen-mode="true"] .right-sidebar {
  display: none;
}

/* Expand content to full viewport */
[data-zen-mode="true"] .main-content {
  width: 100vw;
  margin: 0;
  padding: 1rem;
}

/* Optional: smooth transition */
aside,
.right-sidebar,
.main-content {
  transition: width 0.2s ease, margin 0.2s ease;
}
```

## Implementation Steps

1. **Update astro.config.mjs:** Pass zen mode config to plugin
2. **Create zen mode component:** Button + keyboard listener
3. **Add styling:** zen-mode.css with visibility toggles
4. **Integrate in layout:** Mount button in navbar header
5. **Test:** Verify toggle, keyboard shortcut, persistence, responsive behavior

## Testing

- Button click toggles zen mode on/off
- Keyboard shortcut works globally
- State persists across page reloads
- Content expands properly (no overflow)
- Sidebar/TOC fully hidden
- Smooth visual transition
- Works on mobile (optional: disable shortcut or adjust for smaller screens)

## Constraints

- Zen mode is off by default
- Only affects documentation pages (not homepage)
- Shortcut should not conflict with browser defaults
- Must work with Starlight's responsive design
