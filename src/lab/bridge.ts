/**
 * Host bridge: the Heart Lab follows ECG Academy's language and theme (one source of truth — the host store, written
 * only by the host's header / settings). The lab's own store keeps its `lang` / `theme` signals because every lab
 * module reads them; this effect mirrors the host values into them while the lab is mounted.
 * The theme colours themselves come from `:root[data-theme='dark'] .lab-root` (the host writes <html data-theme>);
 * src/lab/app/theme.ts bumps themeVersion so canvases and three.js re-read them.
 */
import { effect } from '@preact/signals';
import { store as hostStore } from '../app/store';
import { store as labStore } from './app/store';
import type { Lang, Theme } from './app/store';

const LANGS: readonly Lang[] = ['zh', 'en', 'es'];

export function toLabLang(l: string): Lang {
  return (LANGS as readonly string[]).includes(l) ? (l as Lang) : 'zh';
}

export function toLabTheme(t: string): Theme {
  return t === 'dark' ? 'dark' : 'light';
}

/** One synchronous copy (call before the lab renders, so its first frame is already in the host language). */
export function syncFromHost(): void {
  labStore.lang.value = toLabLang(hostStore.lang.peek());
  labStore.theme.value = toLabTheme(hostStore.theme.peek());
}

/** Mirrors host lang/theme into the lab store now and on every change; returns the cleanup. */
export function installHostBridge(): () => void {
  return effect(() => {
    labStore.lang.value = toLabLang(hostStore.lang.value);
    labStore.theme.value = toLabTheme(hostStore.theme.value);
  });
}
