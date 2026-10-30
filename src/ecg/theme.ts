/**
 * Theme tokens for canvases. Colours are read from the CSS custom properties (src/app/theme.css) with
 * getComputedStyle and re-read whenever <html data-theme> changes (one shared MutationObserver; `themeVersion` bumps).
 * Nothing touches the DOM at import time, so pure modules may import the token types in Node tests.
 */
import { signal } from '@preact/signals';

export const TOKENS = [
  'ecg-paper',
  'ecg-grid-minor',
  'ecg-grid-major',
  'ecg-trace',
  'ecg-trace-muted',
  'ecg-cursor',
  'ecg-label',
  'ecg-caliper',
  'ecg-lead-highlight',
  'c-atrial',
  'c-qrs',
  'c-repol',
  'c-conduction',
  'c-vector',
  'c-injury',
  'c-highlight',
  'c-highlight-soft',
  'ok',
  'err',
  'info',
  'fg',
  'fg-muted',
  'bg-elev',
  'border-strong',
] as const;
export type Token = (typeof TOKENS)[number];
export type Palette = Readonly<Record<Token, string>>;

/** Bumps after every theme switch; views re-read colours lazily. */
export const themeVersion = signal(0);

let observing = false;

function ensureObserver(): void {
  if (observing || typeof MutationObserver !== 'function' || typeof document === 'undefined') return;
  observing = true;
  const mo = new MutationObserver(() => {
    themeVersion.value = themeVersion.peek() + 1;
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
}

let cached: { v: number; p: Palette } | null = null;

/** Current palette (cached per theme version). Call only in the browser. */
export function readPalette(): Palette {
  ensureObserver();
  const v = themeVersion.peek();
  if (cached && cached.v === v) return cached.p;
  const cs = getComputedStyle(document.documentElement);
  const out = {} as Record<Token, string>;
  // A missing token falls back to the document's text colour (never a hard-coded colour).
  for (const t of TOKENS) out[t] = cs.getPropertyValue(`--${t}`).trim() || cs.color;
  cached = { v, p: out };
  return out;
}

/** Start watching the theme (idempotent); returns the version signal to subscribe to. */
export function watchTheme(): typeof themeVersion {
  ensureObserver();
  return themeVersion;
}

export function prefersReducedMotion(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Canvas font in device px (canvas text is drawn on unscaled device-px contexts). */
export function canvasFont(cssPx: number, dpr: number, weight = 600, mono = false): string {
  const fam = mono
    ? "ui-monospace, 'SFMono-Regular', 'Cascadia Mono', Consolas, monospace"
    : "system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif";
  return `${weight} ${Math.round(cssPx * dpr)}px ${fam}`;
}
