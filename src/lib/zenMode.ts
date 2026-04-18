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
