/**
 * ECG-local UI state shared by the ECG panels (not part of the global store contract).
 * Global ECG state lives in the store: store.ecgLayout, store.calipers (written directly — there is no AppCommands
 * entry for them yet; see the workstream report).
 */
import { signal } from '@preact/signals';
import type { CaliperMode } from './calipers';

/** Coloured P / QRS / ST-T bands from model truth on every trace. */
export const bandsOn = signal(true);
/** Caliper mode: plain interval (Δt, rate) or QT (with QTc). */
export const caliperMode = signal<CaliperMode>('interval');
/** Which caliper cursor the keyboard moves. */
export const caliperHandle = signal<0 | 1>(1);
