/**
 * Golden hashes (DECISION §8.2 T7). The signal is serialised with prototype A's rule: I, II and V1–V6 rounded to 1 µV,
 * III / aVR / aVL / aVF re-derived from the rounded I and II (deriveLimbLeads), so the identities survive rounding. The
 * hash covers the rounded independent channels and a compact truth summary. Shared by the T7 test and by
 * scripts/synth/golden.ts (which writes tests/synth/fixtures/golden.json).
 */
import type { SynthResult } from '../../src/synth';
import { fnv } from './helpers';

const RECORDED = ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;

export const GOLDEN_SEED = 1;

export function signalHash(r: SynthResult): string {
  let h = 2166136261;
  for (const l of RECORDED) h = fnv(Array.from(r.ecg.signal.leads[l], (v) => Math.round(v * 1000)), h);
  return h.toString(16).padStart(8, '0');
}

export function truthSummary(r: SynthResult): string {
  const t = r.ecg.truth!;
  const n = (x: number | null): string => (x === null ? '-' : x.toFixed(1));
  return [
    t.rhythm, [...t.findings].sort().join('+'), n(t.hrBpm), n(t.prMs), n(t.qrsMs), n(t.qtMs), n(t.axisDeg.qrs), n(t.axisDeg.p), n(t.axisDeg.t),
    t.beats.length, t.atrial.length, t.atrial.filter((a) => a.visible).length,
  ].join('|');
}
