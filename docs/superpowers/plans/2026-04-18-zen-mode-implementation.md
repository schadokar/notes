# Zen Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add zen mode feature to hide sidebar & right TOC, expand content to full viewport, toggle via navbar button and `Shift+Cmd/Ctrl+Z` shortcut.

**Architecture:** Create a zen mode utility module for state management (localStorage), a reusable component for the toggle button, and CSS for hiding UI elements. Initialize zen state on page load and listen for keyboard shortcuts globally. Persist user preference to localStorage.

**Tech Stack:** Astro, TypeScript, vanilla CSS, localStorage API

---

## File Structure

```
src/
├── lib/
│   └── zenMode.ts          # State management & toggle logic
├── components/
│   └── ZenModeToggle.astro # Button component with keyboard listener
└── styles/
    └── zen-mode.css         # Visibility toggles for sidebar/TOC
```

---

## Task 1: Create zen mode state management module

**Files:**
- Create: `src/lib/zenMode.ts`

- [ ] **Step 1: Write zenMode.ts with state functions**

```typescript
// src/lib/zenMode.ts

const ZEN_MODE_KEY = 'zen-mode';

export function getZenMode(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(ZEN_MODE_KEY);
  return stored === 'true';
}

export function setZenMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ZEN_MODE_KEY, String(enabled));
  applyZenMode(enabled);
}

export function toggleZenMode(): void {
  const current = getZenMode();
  setZenMode(!current);
}

function applyZenMode(enabled: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (enabled) {
    root.setAttribute('data-zen-mode', 'true');
  } else {
    root.removeAttribute('data-zen-mode');
  }
}

export function initializeZenMode(): void {
  if (typeof document === 'undefined') return;
  const enabled = getZenMode();
  applyZenMode(enabled);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/zenMode.ts
git commit -m "feat: add zen mode state management"
```

---

## Task 2: Create ZenModeToggle component

**Files:**
- Create: `src/components/ZenModeToggle.astro`

- [ ] **Step 1: Write ZenModeToggle.astro component**

```astro
---
// src/components/ZenModeToggle.astro
---

<button
  id="zen-mode-toggle"
  class="zen-mode-btn"
  title="Zen Mode (Shift+Cmd+Z)"
  aria-label="Toggle zen mode"
>
  <svg
    class="zen-mode-icon"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <!-- Eye icon (normal state) -->
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
</button>

<style>
  .zen-mode-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--sl-color-text);
    transition: color 0.2s ease;
  }

  .zen-mode-btn:hover {
    color: var(--sl-color-text-accent);
  }

  .zen-mode-icon {
    width: 1.5rem;
    height: 1.5rem;
  }
</style>

<script>
  import { toggleZenMode, initializeZenMode } from '../lib/zenMode';

  // Initialize on page load
  initializeZenMode();

  // Button click handler
  const button = document.getElementById('zen-mode-toggle');
  if (button) {
    button.addEventListener('click', () => {
      toggleZenMode();
    });
  }

  // Keyboard shortcut: Shift+Cmd+Z (macOS) / Shift+Ctrl+Z (Windows/Linux)
  document.addEventListener('keydown', (e) => {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    const modKey = isMac ? e.metaKey : e.ctrlKey;

    if (modKey && e.shiftKey && e.key === 'Z') {
      e.preventDefault();
      toggleZenMode();
    }
  });
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ZenModeToggle.astro
git commit -m "feat: add zen mode toggle button with keyboard shortcut"
```

---

## Task 3: Create zen mode CSS styles

**Files:**
- Create: `src/styles/zen-mode.css`

- [ ] **Step 1: Write zen-mode.css**

```css
/* src/styles/zen-mode.css */

/* Smooth transitions for layout changes */
aside,
.right-sidebar,
.main-content {
  transition: opacity 0.2s ease, width 0.2s ease, margin 0.2s ease;
}

/* Hide sidebar in zen mode */
[data-zen-mode="true"] aside {
  display: none;
}

/* Hide right TOC in zen mode */
[data-zen-mode="true"] .right-sidebar {
  display: none;
}

/* Expand content to full viewport width in zen mode */
[data-zen-mode="true"] main {
  width: 100%;
  max-width: 100%;
}

[data-zen-mode="true"] article {
  width: 100%;
  margin: 0;
  padding: 2rem 1rem;
}

/* Ensure content doesn't overflow */
[data-zen-mode="true"] .sl-markdown-content {
  width: 100%;
  overflow-x: auto;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/zen-mode.css
git commit -m "feat: add zen mode CSS styles for hiding sidebar and TOC"
```

---

## Task 4: Import zen mode styles in layout

**Files:**
- Modify: `astro.config.mjs`

- [ ] **Step 1: Update astro.config.mjs to import zen mode CSS**

Replace the imports section with:

```javascript
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';
import expressiveCode from 'astro-expressive-code';
import { readingTimeRemarkPlugin } from './src/lib/readingTime.ts';
import starlightViewModes from 'starlight-view-modes'
import './src/styles/zen-mode.css';
```

- [ ] **Step 2: Verify import doesn't break build**

```bash
npm run build
```

Expected: Build succeeds without errors.

- [ ] **Step 3: Commit**

```bash
git add astro.config.mjs
git commit -m "feat: import zen mode CSS in Astro config"
```

---

## Task 5: Add ZenModeToggle to Starlight layout

**Files:**
- Create: `src/components/header/ZenModeHeader.astro`
- Modify: `astro.config.mjs` (Starlight plugin config)

- [ ] **Step 1: Create header override component**

```astro
---
// src/components/header/ZenModeHeader.astro
// This wraps the default Starlight header and adds our zen mode button

import DefaultHead from '@astrojs/starlight/components/Header.astro';
import ZenModeToggle from '../ZenModeToggle.astro';
---

<div class="header-wrapper">
  <DefaultHead {...Astro.props} />
  <ZenModeToggle />
</div>

<style>
  .header-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
</style>
```

- [ ] **Step 2: Update astro.config.mjs to use custom header component**

Update the Starlight config section to:

```javascript
starlight({
  title: 'Schadokar Notes',
  social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/schadokar/schadokar-notes' }],
  sidebar: [
    {
      label: 'Design Patterns',
      autogenerate: { directory: 'design-patterns' },
    },
    {
      label: 'Distributed Systems',
      autogenerate: { directory: 'distributed-systems' },
    },
    {
      label: 'Notes',
      autogenerate: { directory: 'notes' },
    },
  ],
  lastUpdated: true,
  plugins: [starlightViewModes()],
  components: {
    Header: 'src/components/header/ZenModeHeader.astro',
  },
}),
```

- [ ] **Step 3: Test header renders without error**

```bash
npm run dev
```

Expected: Dev server starts, no console errors about missing Header component.

- [ ] **Step 4: Commit**

```bash
git add src/components/header/ZenModeHeader.astro astro.config.mjs
git commit -m "feat: integrate zen mode toggle into header"
```

---

## Task 6: Test zen mode functionality

**Files:**
- Test: Manual testing in browser

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open documentation page in browser**

Navigate to `http://localhost:3000/design-patterns/` or any doc page.

- [ ] **Step 3: Verify button renders in header**

Look for eye icon in top right of header (right of social links). Title should say "Zen Mode (Shift+Cmd+Z)".

- [ ] **Step 4: Click button to toggle zen mode**

Expected:
- Sidebar disappears
- Right TOC disappears
- Content expands to full width
- Smooth transition (no jarring jump)
- Button visual state changes (optional icon swap)

- [ ] **Step 5: Click button again to exit zen mode**

Expected:
- Sidebar reappears
- Right TOC reappears
- Content width returns to normal
- Smooth transition

- [ ] **Step 6: Test keyboard shortcut**

Press `Shift+Cmd+Z` (macOS) or `Shift+Ctrl+Z` (Windows/Linux).

Expected:
- Zen mode toggles same as button click
- Works on any page in the docs

- [ ] **Step 7: Verify localStorage persistence**

1. Enable zen mode
2. Reload page (`Cmd+R` or `Ctrl+R`)
3. Zen mode should still be enabled

Disable zen mode, reload again. Zen mode should be off.

- [ ] **Step 8: Test on different screen sizes**

Resize browser to mobile width (< 768px).

Expected:
- Zen mode still works
- Content readable at small width
- No horizontal scrolling issues

- [ ] **Step 9: Commit test results**

```bash
git add -A
git commit -m "test: verify zen mode functionality"
```

---

## Spec Coverage Checklist

- ✅ Default state off (zen mode doesn't activate until user toggles)
- ✅ UI toggle button in navbar (ZenModeToggle component)
- ✅ Keyboard shortcut `Shift+Cmd/Ctrl+Z` (event listener in component)
- ✅ Hide sidebar + right TOC (CSS with `[data-zen-mode="true"]`)
- ✅ Content full viewport width (zen-mode.css)
- ✅ Persistence via localStorage (zenMode.ts state management)
- ✅ Smooth transitions (CSS transitions on affected elements)
- ✅ Scroll position preserved (no page reload, just DOM attribute changes)

---

## Next Steps

After completing all tasks:
1. Build for production to verify no errors: `npm run build`
2. Review changes with `git log --oneline` to see commit history
3. Consider adding visual feedback (icon change) when zen mode active (Task 7 optional enhancement)
