/**
 * Open/closed state of the shell's floating panels (ECG-first layout): the tool-rail popover next to the heart, the
 * rhythm-strip sheet that slides over the ECG hero, and the causal-chain popup over the heart. Local UI state, so it
 * lives here rather than in the frozen store.
 */
import { signal } from '@preact/signals';

export type RailPanel = 'view' | 'layers' | 'legend' | 'wiggers';
export const railPanel = signal<RailPanel | null>(null);

export type SheetKind = 'rhythm';
export const sheet = signal<SheetKind | null>(null);

/** The "why does this lead look like this now?" popup (causal chain), opened from the "now" strip's button. */
export const explainOpen = signal(false);

/** id of the "why does lead X look like this now?" button in the "now" strip (focus returns there on close). */
export const WHY_BUTTON_ID = 'now-why';
