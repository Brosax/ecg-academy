/**
 * Criteria registry types (DECISION §8.2 T3). A scenario declares its hallmark criteria (§9) under its catalogue id in
 * tests/synth/oracle/criteria/<group>.ts; every criterion reads ONLY the oracle's measurement of the delivered clean
 * ECG (never the engine truth), with thresholds from docs/curriculum/criteria.md ("current value" column; the row id
 * is recorded next to each threshold). The generic sanity set (generic.ts) applies to every scenario unless the
 * scenario opts out of a named check with a reason.
 */
import type { LeadSignals } from '../../../../src/core/ecg';
import type { StdLead } from '../../../../src/core/leads';
import type { ScenarioDef } from '../../../../src/synth';
import type { LeadFeat, Measurement } from '../measure';

export interface CriterionCtx {
  readonly m: Measurement;
  readonly leads: LeadSignals;
  readonly fs: number;
  readonly def: ScenarioDef;
  /** the variant being graded (undefined: the base scenario) — for hallmarks that differ by variant (synth-rhythm M3) */
  readonly variant?: string;
}

/** One hallmark: returns null when it holds, else a short reason with the measured values. */
export interface Criterion {
  readonly id: string;
  /** criteria.md row id (or DECISION §9 / §12.2 when the check encodes a judges' fix) */
  readonly source: string;
  readonly check: (c: CriterionCtx) => string | null;
}

export const GENERIC_IDS = ['no-spikes', 'no-jumps', 'qt-dispersion', 'tp-level', 't-over-r-v5v6', 'limb-voltage', 'sinus-p', 'st-segment', 't-asymmetry'] as const;
export type GenericId = (typeof GENERIC_IDS)[number];

export interface ScenarioCriteria {
  readonly hallmarks: readonly Criterion[];
  /** generic checks this scenario does not satisfy by design, with the reason */
  readonly optOut?: Readonly<Partial<Record<GenericId, string>>>;
}

// ── helpers ──────────────────────────────────────────────────────────────────────────────────────────────────────
export const mm = (mv: number): number => mv * 10;
export const f = (c: CriterionCtx, l: StdLead): LeadFeat => c.m.feats[l];
export const fmt = (x: number | null | undefined, d = 2): string => (x === null || x === undefined || !Number.isFinite(x) ? '—' : x.toFixed(d));

/** criterion helper: `ok` is the condition; `msg` describes the measured values when it fails */
export function crit(id: string, source: string, check: (c: CriterionCtx) => [boolean, string]): Criterion {
  return {
    id,
    source,
    check: (c) => {
      const [ok, msg] = check(c);
      return ok ? null : msg;
    },
  };
}

/** Sokolow–Lyon (mm): S in V1 + the larger R of V5 / V6 (criteria.md `lvh-axis-voltage`). */
export function sokolowMm(c: CriterionCtx): number {
  return mm(-f(c, 'V1').s + Math.max(f(c, 'V5').r, f(c, 'V6').r));
}
/** Cornell (mm): R in aVL + S in V3 (criteria.md `lvh-axis-voltage`, Romhilt–Estes / Casale). */
export function cornellMm(c: CriterionCtx): number {
  return mm(f(c, 'aVL').r - f(c, 'V3').s);
}
/** Value of a lead of the representative beat at `ms` after its QRS onset (PR-level referenced). */
export function at(c: CriterionCtx, l: StdLead, ms: number): number {
  const x = c.m.median[l];
  return x[Math.max(0, Math.min(x.length - 1, c.m.medianOn + Math.round((ms * c.fs) / 1000)))];
}
/** ST deviation (mV) at the J point (QRS offset) of the representative beat. */
export const stJ = (c: CriterionCtx, l: StdLead): number => f(c, l).j;
/** QRS duration of the representative beat (ms). */
export const qrsMs = (c: CriterionCtx): number => c.m.qrsMs;
/** largest R (positive deflection) of a lead, mV */
export const rOf = (c: CriterionCtx, l: StdLead): number => Math.max(f(c, l).r, f(c, l).r2);

/** Positive QRS peaks of a lead on the representative beat (local maxima ≥ 0.05 mV separated by a dip of ≥ 0.05 mV). */
export function positivePeaks(c: CriterionCtx, l: StdLead): number[] {
  const x = c.m.median[l];
  const out: number[] = [];
  let minSince = Infinity;
  for (let i = c.m.medianOn + 1; i < c.m.medianOff; i++) {
    minSince = Math.min(minSince, x[i]);
    if (!(x[i] > x[i - 1] && x[i] >= x[i + 1] && x[i] >= 0.05)) continue;
    const last = out[out.length - 1];
    if (last !== undefined && (last - minSince < 0.05 || x[i] - minSince < 0.05)) out[out.length - 1] = Math.max(last, x[i]);
    else out.push(x[i]);
    minSince = Infinity;
  }
  return out;
}
