/**
 * Oracle vs the GE 12SL reference on one real record (DECISION §8.1). Shared by the validation test and the dev
 * report (scripts/synth/oracle-real.ts).
 */
import { measure } from './measure';
import { realLeads, type RealRecord } from './real-data';

export interface RealDelta {
  readonly id: number;
  readonly cls: string;
  /** oracle − reference (ms, bpm, degrees); null when either side has no value */
  readonly hr: number | null;
  readonly pr: number | null;
  readonly qrs: number | null;
  readonly qt: number | null;
  readonly axis: number | null;
  /** the reference has a PR and the oracle found none */
  readonly prMissing: boolean;
}

export function angleDiffDeg(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d <= -180) d += 360;
  if (d > 180) d -= 360;
  return d;
}

const NO_PR = new Set(['AFIB', 'AFLT']);

export function compareReal(r: RealRecord): RealDelta {
  const { fs, leads } = realLeads(r.id);
  const m = measure(leads, fs, { baseline: 'median' });
  const d = (a: number | null | undefined, b: number | null): number | null => (a === null || a === undefined || b === null || !Number.isFinite(a) ? null : a - b);
  const prRef = NO_PR.has(r.cls) ? null : r.ref.prMs;
  return {
    id: r.id,
    cls: r.cls,
    hr: d(m.hrBpm, r.ref.hrBpm),
    pr: d(m.prMs, prRef),
    qrs: d(m.qrsMs, r.ref.qrsMs),
    qt: d(m.qtMs, r.ref.qtMs),
    axis: r.ref.qrsAxisDeg === null ? null : angleDiffDeg(m.axisDeg, r.ref.qrsAxisDeg),
    prMissing: prRef !== null && m.prMs === null,
  };
}
