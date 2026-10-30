/**
 * Lead features measured inside the model-truth windows of one ventricular beat (QRS on/off, repolarization end from
 * the beat template), not with blind fiducial detection: wide or abnormal complexes (bundle-branch block, ectopy,
 * injury) defeat the |dH/dt| J-point rule, while the truth windows are exact.
 * Baseline = each lead's value at QRS onset (PR level), i.e. an AC-coupled reading.
 */
import type { Engine } from '../../../src/lab/sim/engine';
import type { BeatEvent, LeadName } from '../../../src/lab/sim/types';
import { LEADS } from '../../../src/lab/sim/types';

export interface TruthLead {
  readonly q: number;
  readonly r: number;
  readonly s: number;
  readonly netQrs: number;
  /** ST level at the J point and 60 ms later (mV, vs the PR baseline). */
  readonly stJ: number;
  readonly st60: number;
  readonly tArea: number;
  /** QRS onset → highest QRS sample (ms). */
  readonly rPeakTime: number;
  /** Largest positive deflection in the first 40 ms of the QRS (initial r) and the deepest negative one (mV). */
  readonly initialR: number;
  readonly deepest: number;
  /** Duration of the initial negative deflection from QRS onset (ms; the whole QRS for QS) and its depth (mV). */
  readonly qDurMs: number;
  readonly qDepth: number;
  /** Net area of the first 40 ms (mV·ms, delta wave / initial forces) and of the first 60 ms. */
  readonly init40: number;
  readonly init60: number;
  /** Steepest upstroke within the first 40 ms of the QRS (mV/ms, over 5 ms steps) — slurred by a delta wave. */
  readonly upSlope40: number;
  /** Positive peaks inside the QRS above 0.05 mV: [ms from onset, mV]. */
  readonly peaks: readonly (readonly [number, number])[];
  /** Duration (ms) the signal stays below −0.02 mV after the tallest R (terminal S width). */
  readonly sDurMs: number;
}

export interface TruthBeat {
  readonly qrsMs: number;
  readonly prMs: number | null;
  readonly qtMs: number;
  readonly rrMs: number;
  readonly leads: Readonly<Record<LeadName, TruthLead>>;
  readonly v: Extract<BeatEvent, { kind: 'V' }>;
}

const maxUp = (x: Float32Array, i0: number, i1: number): number => {
  let m = 0;
  for (let i = i0 + 5; i <= i1; i++) m = Math.max(m, (x[i] - x[i - 5]) / 5);
  return m;
};

export function truthBeat(e: Engine, atMs: number, pick?: (v: Extract<BeatEvent, { kind: 'V' }>) => boolean): TruthBeat {
  const evs = e.rhythm.eventsUntil(atMs + 4000);
  const vs = evs.filter((x): x is Extract<BeatEvent, { kind: 'V' }> => x.kind === 'V' && x.tMs >= atMs);
  const v = vs.find((x) => !pick || pick(x));
  if (!v) throw new Error('no ventricular beat found');
  const tpl = e.templates.get(v.variant, v.rrPrevMs)!;
  const qrsOn = v.tMs + tpl.truth.onMs, qrsOff = v.tMs + tpl.truth.offMs, tEnd = v.tMs + tpl.truth.repolEndMs;
  const a = v.fromA !== null ? evs.find((x) => x.kind === 'A' && x.id === v.fromA) : undefined;
  const aTpl = a && a.kind === 'A' ? e.templates.get(a.variant, a.rrPrevMs) : null;
  const pOn = a && aTpl ? a.tMs + aTpl.truth.onMs : null;
  const t0 = Math.floor(qrsOn - 20), n = Math.ceil(tEnd + 20 - t0);
  const out = new Float32Array(12 * n);
  e.sampleLeads(t0, n, out);
  const idx = (t: number) => Math.max(0, Math.min(n - 1, Math.round(t - t0)));
  const iOn = idx(qrsOn), iOff = idx(qrsOff), iEnd = idx(tEnd), iJ60 = idx(qrsOff + 60);
  const prev = vs.length ? evs.filter((x) => x.kind === 'V' && x.tMs < v.tMs).pop() : undefined;
  const leads = {} as Record<LeadName, TruthLead>;
  LEADS.forEach((l, li) => {
    const x = out.subarray(li * n, (li + 1) * n);
    const b = x[iOn];
    let rMax = 0, iR = iOn, area = 0;
    for (let i = iOn; i <= iOff; i++) {
      const y = x[i] - b;
      area += y;
      if (y > rMax) {
        rMax = y;
        iR = i;
      }
    }
    let q = 0;
    for (let i = iOn; i < iR; i++) q = Math.max(q, -(x[i] - b));
    let s = 0;
    for (let i = iR; i <= iOff; i++) s = Math.max(s, -(x[i] - b));
    let tArea = 0;
    for (let i = iOff; i <= iEnd; i++) tArea += x[i] - b;
    let initialR = 0, deepest = 0;
    for (let i = iOn; i <= Math.min(iOff, iOn + 40); i++) initialR = Math.max(initialR, x[i] - b);
    for (let i = iOn; i <= iOff; i++) deepest = Math.max(deepest, -(x[i] - b));
    let qDurMs = 0, qDepth = 0;
    for (let i = iOn; i <= iOff && x[i] - b <= 0.02; i++, qDurMs++) qDepth = Math.max(qDepth, b - x[i]);
    if (qDepth < 0.02) qDurMs = 0;
    let init40 = 0, init60 = 0;
    for (let i = iOn; i < Math.min(iOff, iOn + 60); i++) {
      if (i < iOn + 40) init40 += x[i] - b;
      init60 += x[i] - b;
    }
    const peaks: [number, number][] = [];
    for (let i = iOn + 1; i < iOff; i++) if (x[i] - b > 0.05 && x[i] >= x[i - 1] && x[i] > x[i + 1]) peaks.push([i - iOn, x[i] - b]);
    let sDurMs = 0;
    for (let i = iR; i <= iOff; i++) if (x[i] - b < -0.02) sDurMs++;
    leads[l] = {
      q, r: rMax, s, netQrs: area, stJ: x[iOff] - b, st60: x[iJ60] - b, tArea, rPeakTime: iR - iOn, initialR, deepest,
      qDurMs, qDepth, init40, init60, upSlope40: maxUp(x, iOn, Math.min(iOff, iOn + 40)), peaks, sDurMs,
    };
  });
  return {
    qrsMs: qrsOff - qrsOn,
    prMs: pOn !== null ? qrsOn - pOn : null,
    qtMs: tEnd - qrsOn,
    rrMs: prev ? v.tMs - prev.tMs : 60000 / e.rhythm.heartRate,
    leads,
    v,
  };
}

/** Frontal axis (degrees) from the net areas of I and aVF: atan2(2·aVF/√3, I). */
export const frontalAxis = (i: number, avf: number): number => (Math.atan2((2 * avf) / Math.sqrt(3), i) * 180) / Math.PI;

/** P wave of one atrial beat: net areas (mV·ms) of the atrial component per lead and the frontal P axis. */
export function pWave(e: Engine, a: Extract<BeatEvent, { kind: 'A' }>): { readonly area: Readonly<Record<LeadName, number>>; readonly axis: number; readonly onMs: number } {
  const tpl = e.templates.get(a.variant, a.rrPrevMs)!;
  const t0 = a.tMs + tpl.truth.onMs, n = Math.round(tpl.truth.offMs - tpl.truth.onMs + 30);
  const hA = new Float32Array(3 * n), hV = new Float32Array(3 * n), out = new Float32Array(12 * n);
  e.sampleH(t0, n, hA, hV);
  e.projector.project(hA, new Float32Array(3 * n), n, out);
  const area = {} as Record<LeadName, number>;
  LEADS.forEach((l, li) => {
    let s2 = 0;
    for (let i = 0; i < n; i++) s2 += out[li * n + i];
    area[l] = s2;
  });
  return { area, axis: frontalAxis(area.I, area.aVF), onMs: t0 };
}

type AEv = Extract<BeatEvent, { kind: 'A' }>;
type VEv = Extract<BeatEvent, { kind: 'V' }>;

/** Rhythm truth over [t0, t1]: atrial beats with P onset, ventricular beats with QRS onset, AV pairing and blocks. */
export function rhythmTruth(e: Engine, t0: number, t1: number) {
  const evs = e.rhythm.eventsUntil(t1 + 3000);
  const as = evs.filter((x): x is AEv => x.kind === 'A' && x.tMs >= t0 && x.tMs <= t1);
  const vs = evs.filter((x): x is VEv => x.kind === 'V' && x.tMs >= t0 && x.tMs <= t1);
  const blocks = evs.filter((x) => x.kind === 'block' && x.tMs >= t0 && x.tMs <= t1);
  const pOn = (a: AEv) => a.tMs + e.templates.get(a.variant, a.rrPrevMs)!.truth.onMs;
  const qrsOn = (v: VEv) => v.tMs + e.templates.get(v.variant, v.rrPrevMs)!.truth.onMs;
  const vOf = (a: AEv) => evs.find((x): x is VEv => x.kind === 'V' && x.fromA === a.id) ?? null;
  const pr = (a: AEv) => {
    const v = vOf(a);
    return v ? qrsOn(v) - pOn(a) : null;
  };
  const diffs = (t: number[]) => t.slice(1).map((x, i) => x - t[i]);
  return { as, vs, blocks, pOn, qrsOn, vOf, pr, pp: diffs(as.map((a) => a.tMs)), rr: diffs(vs.map((v) => v.tMs)) };
}

/** One ventricular beat sampled from 250 ms before QRS onset to the end of the T wave, with truth times. */
export interface Shape {
  readonly b: TruthBeat;
  readonly on: number;
  readonly off: number;
  readonly tOn: number;
  readonly tEnd: number;
  /** Lead value at time t relative to the PR level (QRS onset). */
  at(l: LeadName, t: number): number;
  /** Lead value at time t relative to the TP level just before the beat's P wave (or 200 ms before QRS onset). */
  tp(l: LeadName, t: number): number;
  /** T wave: signed peak, time of peak, half-amplitude width and the rise / fall halves (ms). */
  t(l: LeadName): { readonly pk: number; readonly tPk: number; readonly width: number; readonly up: number; readonly down: number };
  readonly pOn: number | null;
}

export function beatShape(e: Engine, atMs = 3000, pick?: (v: Extract<BeatEvent, { kind: 'V' }>) => boolean): Shape {
  const b = truthBeat(e, atMs, pick);
  const tpl = e.templates.get(b.v.variant, b.v.rrPrevMs)!;
  const on = b.v.tMs + tpl.truth.onMs, off = b.v.tMs + tpl.truth.offMs;
  const tOn = b.v.tMs + tpl.truth.repolOnMs, tEnd = b.v.tMs + tpl.truth.repolEndMs;
  const pOn = b.prMs !== null ? on - b.prMs : null;
  const t0 = Math.floor((pOn ?? on - 200) - 40), n = Math.ceil(tEnd + 20 - t0);
  const out = new Float32Array(12 * n);
  e.sampleLeads(t0, n, out);
  const raw = (l: LeadName, t: number) => out[LEADS.indexOf(l) * n + Math.max(0, Math.min(n - 1, Math.round(t - t0)))];
  const at = (l: LeadName, t: number) => raw(l, t) - raw(l, on);
  const tp = (l: LeadName, t: number) => raw(l, t) - raw(l, (pOn ?? on - 200) - 15);
  const t = (l: LeadName) => {
    let ip = off;
    for (let s = off; s <= tEnd; s++) if (Math.abs(at(l, s)) > Math.abs(at(l, ip))) ip = s;
    const pk = at(l, ip);
    let a = ip, c = ip;
    while (a > off && Math.abs(at(l, a)) > Math.abs(pk) / 2) a--;
    while (c < tEnd && Math.abs(at(l, c)) > Math.abs(pk) / 2) c++;
    return { pk, tPk: ip, width: c - a, up: ip - a, down: c - ip };
  };
  return { b, on, off, tOn, tEnd, at, tp, t, pOn };
}

/** Lead over the QRS window (morphology correlation). */
export function qrsOf(_e: Engine, s: Shape, l: LeadName): number[] {
  const out: number[] = [];
  for (let t = s.on; t <= s.off; t++) out.push(s.at(l, t));
  return out;
}
