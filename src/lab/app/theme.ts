/**
 * Theme access for canvases and three.js (CSS variables → JS). `themeVersion` bumps after every theme switch so render
 * loops can re-read colours lazily.
 *
 * Heart Lab (ECG Academy): the tokens live on `.lab-root` (src/lab/app/theme.css), not on <html>, so colours are read
 * from an element inside the lab (callers pass their own host element). The host app owns <html data-theme>; the lab
 * never writes it. installTheme() bumps themeVersion when the lab's theme signal changes (deferred to a microtask, so
 * the host's own effect has already written data-theme) and whenever <html data-theme> changes.
 */
import { effect, signal } from '@preact/signals';
import { store } from './store';

export const THEME_TOKENS = [
  'bg', 'panel', 'fg', 'fg-muted', 'border',
  'c-atrial', 'c-qrs', 'c-repol', 'c-conduction', 'c-vector', 'c-myo-rest', 'c-blood', 'c-vessel', 'c-ring', 'c-highlight',
  'ecg-paper', 'ecg-grid-minor', 'ecg-grid-major', 'ecg-trace', 'ecg-trace-muted', 'ecg-cursor', 'ecg-label',
  'scene-bg', 'scene-ambient', 'torso',
] as const;
export type ThemeToken = (typeof THEME_TOKENS)[number];
export type ThemeColors = Readonly<Record<ThemeToken, string>>;

export const themeVersion = signal(0);

/** The element that carries the lab's tokens: the first mounted .lab-root (documentElement as a last resort). */
function labTokenElement(): Element {
  return document.querySelector('.lab-root') ?? document.documentElement;
}

/** Reads the lab tokens as seen from `el` (any element inside .lab-root inherits them). */
export function readThemeColors(el: Element = labTokenElement()): ThemeColors {
  const cs = getComputedStyle(el);
  const out = {} as Record<ThemeToken, string>;
  for (const t of THEME_TOKENS) out[t] = cs.getPropertyValue(`--${t}`).trim() || '#ff00ff';
  return out;
}

/** Bumps themeVersion on lab theme changes and on <html data-theme> changes. Call on mount; returns the cleanup. */
export function installTheme(): () => void {
  let live = true;
  const bump = () => {
    if (live) themeVersion.value = themeVersion.peek() + 1;
  };
  const off = effect(() => {
    void store.theme.value;
    queueMicrotask(bump);
  });
  let mo: MutationObserver | null = null;
  if (typeof MutationObserver === 'function' && typeof document !== 'undefined') {
    mo = new MutationObserver(bump);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
  return () => {
    live = false;
    off();
    mo?.disconnect();
  };
}
