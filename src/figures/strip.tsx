/**
 * A small single-lead strip drawn in SVG for the figures that need one (rate ruler, laddergram, vector loop). The
 * full ECG viewer lives in src/ecg; this is only a thin trace on paper aligned to a time axis.
 */
import type { EcgSignal } from '../core/ecg';
import type { Lead } from '../core/leads';

/** Median of the samples in [t0, t1] (the strip's baseline). */
export function windowMedian(x: Float32Array, fs: number, t0: number, t1: number): number {
  const i0 = Math.max(0, Math.floor((t0 * fs) / 1000));
  const i1 = Math.min(x.length - 1, Math.ceil((t1 * fs) / 1000));
  const v: number[] = [];
  const step = Math.max(1, Math.floor((i1 - i0) / 800));
  for (let i = i0; i <= i1; i += step) v.push(x[i]);
  v.sort((a, b) => a - b);
  return v.length ? v[v.length >> 1] : 0;
}

/**
 * SVG path of a lead over [t0, t1] mapped by toX(t) / toY(mV). Long windows are decimated with a min/max pair per
 * output column so QRS peaks survive.
 */
export function leadPath(
  sig: EcgSignal,
  lead: Lead,
  t0: number,
  t1: number,
  toX: (t: number) => number,
  toY: (mv: number) => number,
  columns = 900,
): string {
  const x = sig.leads[lead];
  if (!x) return '';
  const fs = sig.fs;
  const base = windowMedian(x, fs, t0, t1);
  const i0 = Math.max(0, Math.floor((t0 * fs) / 1000));
  const i1 = Math.min(x.length - 1, Math.ceil((t1 * fs) / 1000));
  const n = i1 - i0 + 1;
  let d = '';
  const r = (v: number) => Math.round(v * 10) / 10;
  if (n <= columns * 2) {
    for (let i = i0; i <= i1; i++) d += `${i === i0 ? 'M' : 'L'}${r(toX((i * 1000) / fs))} ${r(toY(x[i] - base))}`;
    return d;
  }
  const per = n / columns;
  for (let c = 0; c < columns; c++) {
    const a = i0 + Math.floor(c * per);
    const b = Math.min(i1, i0 + Math.floor((c + 1) * per) - 1);
    let lo = Infinity, hi = -Infinity, iLo = a, iHi = a;
    for (let i = a; i <= b; i++) {
      if (x[i] < lo) {
        lo = x[i];
        iLo = i;
      }
      if (x[i] > hi) {
        hi = x[i];
        iHi = i;
      }
    }
    const first = iLo < iHi ? iLo : iHi;
    const second = iLo < iHi ? iHi : iLo;
    d += `${c === 0 ? 'M' : 'L'}${r(toX((first * 1000) / fs))} ${r(toY(x[first] - base))}`;
    d += `L${r(toX((second * 1000) / fs))} ${r(toY(x[second] - base))}`;
  }
  return d;
}
