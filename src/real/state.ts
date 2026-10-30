/**
 * Module state shared by the case list and the case page: current filter (so "previous / next" follows the list the
 * learner came from), blind mode, the set of cases already revealed, and the optional reading-panel slot.
 */
import { signal } from '@preact/signals';
import type { ComponentType } from 'preact';
import type { CaliperMeasure } from '../ecg/api';
import type { ReadonlySignal } from '@preact/signals';
import type { Ecg } from '../core/ecg';
import type { RealCaseMeta } from './api';
import { NO_FILTER, type CaseFilter } from './library';
import { loadReadSet, saveReadSet } from './reading';

const BLIND_KEY = 'ecg-academy:real:blind:v1';

function loadBlind(): boolean {
  try {
    return globalThis.localStorage?.getItem(BLIND_KEY) !== '0';
  } catch {
    return true;
  }
}

export const filter = signal<CaseFilter>(NO_FILTER);

/** Blind mode (default on): cards show only case number, age and sex. */
export const blind = signal<boolean>(loadBlind());

export function setBlind(on: boolean): void {
  blind.value = on;
  try {
    globalThis.localStorage?.setItem(BLIND_KEY, on ? '1' : '0');
  } catch {
    /* preference lives for this session only */
  }
}

/** Ids of the cases whose answer the learner has revealed at least once. */
export const readSet = signal<ReadonlySet<number>>(loadReadSet());

export function markRead(id: number): void {
  if (readSet.value.has(id)) return;
  const next = new Set(readSet.value);
  next.add(id);
  readSet.value = next;
  saveReadSet(next);
}

/** Counter for the seeded "random case" button (no Math.random: date + click count). */
let randomClicks = 0;
export function nextRandomSeed(dateKey: string): string {
  randomClicks += 1;
  return `${dateKey}:${randomClicks}`;
}

/**
 * Props a replacement reading panel receives (see `setCaseReadingSlot`). The practice module can plug its structured
 * report form in here; the default is the checklist in ReadingPanel.tsx.
 */
export interface CaseReadingSlotProps {
  readonly caseMeta: RealCaseMeta;
  /** null while the signals are being decoded */
  readonly ecg: Ecg | null;
  /** has the learner revealed the cardiologists' labels for this case */
  readonly revealed: boolean;
  /** reveal the labels (also marks the case as read) */
  readonly onReveal: () => void;
  /** the learner's latest caliper measurement on the tracing (null until they measure) */
  readonly caliper: ReadonlySignal<CaliperMeasure | null>;
}

/** Optional replacement for the default reading checklist on every case page (null = default). */
export const caseReadingSlot = signal<ComponentType<CaseReadingSlotProps> | null>(null);

export function setCaseReadingSlot(c: ComponentType<CaseReadingSlotProps> | null): void {
  caseReadingSlot.value = c;
}
