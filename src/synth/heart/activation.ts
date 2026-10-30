/**
 * Region activation graph (DECISION §2.1.2): prototype A's fastest-route activation re-written on the 21 core
 * ventricular regions × {endocardial, epicardial} = 42 face nodes (adjacency baked in regionGeom.gen.ts).
 *
 * Sources: Purkinje–muscle junctions fed by four branches (LSF, LAF, LPF, RBB) with Durrer-type exit times
 * (Durrer D et al., Circulation 1970;41:899–912: three LV septal/paraseptal sites at 0–5 ms; RV 5–17 ms later; the
 * posterobasal LV and the RVOT have no exit and are reached last through muscle), plus optional extra sources
 * (ectopic focus, accessory-pathway insertion, pacing lead). Blocking a branch removes its exits; a 'delay' block
 * postpones them. Edges: transmural (wall / vT), LV endocardium, RV endocardium (incl. the RV septal surface),
 * epicardium, mixed; RV side ↔ LV free wall crossings at half speed (interventricular grooves).
 *
 * Output per face: an activation window [t0, t1] (the time the front needs to sweep that face); per region (REGION_LIST
 * order) the union of its two faces, relative to the earliest ventricular activation (= QRS onset). Runs in
 * microseconds; results are cached per input key.
 */
import type { RegionId } from '../../core/regions';
import type { Blocks } from '../api';
import { REGION_IDS, REGION_INDEX, VENT_IDS, VENT_INDEX } from './anatomy';
import { NORMAL_APD_MAP, type ApdMap } from './apd';
import { FACE_EDGES, VENT_GEOM } from './regionGeom.gen';

export const BRANCHES = ['LSF', 'LAF', 'LPF', 'RBB'] as const;
export type Branch = (typeof BRANCHES)[number];

const F = (id: (typeof VENT_IDS)[number], face: 0 | 1): number => VENT_INDEX[id] * 2 + face;
const N_FACES = VENT_IDS.length * 2;

export interface Pmj { readonly face: number; readonly branch: Branch; readonly t: number; readonly h: number }

/** Normal Purkinje exits (A's NORMAL_PMJ mapped onto the core faces; ms after the earliest LV septal breakthrough). */
export const NORMAL_PMJ: readonly Pmj[] = [
  { face: F('lv-mid-anteroseptal', 0), branch: 'LSF', t: 0, h: 12.9 },
  { face: F('lv-mid-inferoseptal', 0), branch: 'LSF', t: 3.9, h: 13.2 },
  { face: F('lv-apical-septal', 0), branch: 'LSF', t: 0, h: 16 },
  { face: F('lv-basal-anteroseptal', 0), branch: 'LSF', t: 28, h: 10.9 },
  { face: F('lv-basal-inferoseptal', 0), branch: 'LPF', t: 8.4, h: 8.3 },
  { face: F('lv-mid-anterior', 0), branch: 'LAF', t: 6, h: 15.9 },
  { face: F('lv-apical-anterior', 0), branch: 'LAF', t: 5.5, h: 12.8 },
  { face: F('lv-basal-anterior', 0), branch: 'LAF', t: 4.4, h: 9.8 },
  { face: F('lv-mid-inferior', 0), branch: 'LPF', t: 4.2, h: 8.6 },
  { face: F('lv-apical-inferior', 0), branch: 'LPF', t: 17.2, h: 11.8 },
  { face: F('lv-basal-inferior', 0), branch: 'LPF', t: 17.1, h: 13.4 },
  { face: F('lv-apex', 0), branch: 'LPF', t: 23.8, h: 15.9 },
  { face: F('lv-apical-lateral', 0), branch: 'LAF', t: 17.0, h: 5 },
  { face: F('lv-mid-anterolateral', 0), branch: 'LAF', t: 11.6, h: 10.5 },
  { face: F('lv-mid-inferolateral', 0), branch: 'LPF', t: 15.6, h: 6.7 },
  { face: F('lv-basal-anterolateral', 0), branch: 'LAF', t: 18.4, h: 16 },
  // right bundle (moderator band → anterior papillary muscle): the RV endocardium is reached 5–25 ms after the LV
  { face: F('rv-apical', 0), branch: 'RBB', t: 17.4, h: 16 },
  { face: F('lv-apical-septal', 1), branch: 'RBB', t: 28, h: 10.1 },
  { face: F('rv-mid', 0), branch: 'RBB', t: 12.8, h: 14.5 },
  { face: F('rv-basal', 0), branch: 'RBB', t: 22.5, h: 12 },
  { face: F('lv-mid-anteroseptal', 1), branch: 'RBB', t: 5, h: 10.9 },
  { face: F('lv-mid-inferoseptal', 1), branch: 'RBB', t: 15.1, h: 8.9 },
  { face: F('lv-basal-anteroseptal', 1), branch: 'RBB', t: 24.5, h: 13.5 },
  { face: F('lv-basal-inferoseptal', 1), branch: 'RBB', t: 22.7, h: 5.2 },
  // lv-basal-inferolateral and rv-outflow: no Purkinje exit (reached last through muscle)
];

/** Conduction constants (A's NORMAL_VCOND): velocities in cm/ms, window half-widths in ms. */
export const VCOND = {
  vT: 0.046,
  vEndo: 0.09,
  vRvEndo: 0.075,
  vEpi: 0.05,
  hMin: 5,
  hPmin: 8,
  tmDisp: 0.209,
  muscleSpread: 0.5,
  sweepK: 1.0,
  junction: 0.5,
  /** default extra delay of a branch with a 'delay' block (incomplete block), ms */
  delayMs: 22,
} as const;

export interface ExtraSource {
  readonly face: number;
  /** activation time of the source (ms, same reference as the Purkinje exits) */
  readonly t: number;
  /** half-width of the source window (ms) */
  readonly h: number;
}

export interface ActivationInput {
  readonly blocks?: Blocks;
  /** extra delay per branch (ms) on top of 'delay' blocks */
  readonly branchDelay?: Partial<Record<Branch, number>>;
  /** drop all Purkinje exits (ectopic / paced beats start from their own source) */
  readonly noPurkinje?: boolean;
  readonly extra?: readonly ExtraSource[];
  /** velocity factor per region (< 1 slower): scar border, ARVC */
  readonly speed?: Readonly<Partial<Record<RegionId, number>>>;
}

export interface FaceWindow {
  readonly t0: number;
  readonly t1: number;
}

/** Per-region activation windows (ms relative to QRS onset) and APDs, REGION_LIST order; NaN = not activated. */
export interface RegionTiming {
  readonly t0: Float32Array;
  readonly t1: Float32Array;
  readonly apdEndo: Float32Array;
  readonly apdEpi: Float32Array;
}

type EdgeType = 'T' | 'IN' | 'RVIN' | 'EPI' | 'X';
interface Edge { readonly to: number; readonly len: number; readonly type: EdgeType }

const ADJ: Edge[][] = (() => {
  const adj: Edge[][] = Array.from({ length: N_FACES }, () => []);
  VENT_GEOM.forEach((g, v) => {
    adj[2 * v].push({ to: 2 * v + 1, len: g.tmWall, type: 'T' });
    adj[2 * v + 1].push({ to: 2 * v, len: g.tmWall, type: 'T' });
  });
  for (const [a, b, type, l] of FACE_EDGES) {
    adj[a].push({ to: b, len: l, type });
    adj[b].push({ to: a, len: l, type });
  }
  return adj;
})();

const RADIUS = (n: number): number => (n % 2 === 0 ? VENT_GEOM[n >> 1].rEndo : VENT_GEOM[n >> 1].rEpi);
const KIND = (n: number): 'LV' | 'SEPT' | 'RV' => VENT_GEOM[n >> 1].kind;
const rvSide = (n: number): boolean => KIND(n) === 'RV' || (KIND(n) === 'SEPT' && (n & 1) === 1);
const lvFree = (n: number): boolean => KIND(n) === 'LV';

function branchState(blocks: Blocks | undefined, extra: Partial<Record<Branch, number>> | undefined): { blocked: Set<Branch>; delay: Record<Branch, number> } {
  const blocked = new Set<Branch>();
  const delay: Record<Branch, number> = { LSF: 0, LAF: 0, LPF: 0, RBB: 0 };
  const apply = (lvl: 'delay' | 'complete' | undefined, bs: readonly Branch[]): void => {
    if (lvl === 'complete') bs.forEach((b) => blocked.add(b));
    else if (lvl === 'delay') bs.forEach((b) => (delay[b] += VCOND.delayMs));
  };
  apply(blocks?.rbb, ['RBB']);
  apply(blocks?.lbb, ['LSF', 'LAF', 'LPF']);
  apply(blocks?.laf, ['LAF']);
  apply(blocks?.lpf, ['LPF']);
  for (const b of BRANCHES) delay[b] += extra?.[b] ?? 0;
  return { blocked, delay };
}

/** Fastest-route activation windows of the 42 faces (times in the Purkinje-exit reference). */
export function faceWindows(input: ActivationInput = {}): FaceWindow[] {
  const { blocked, delay } = branchState(input.blocks, input.branchDelay);
  type Cand = { T: number; h: number };
  const src: Cand[][] = Array.from({ length: N_FACES }, () => []);
  if (!input.noPurkinje) {
    for (const p of NORMAL_PMJ) {
      if (blocked.has(p.branch)) continue;
      const hp = Math.max(VCOND.hPmin, p.h);
      src[p.face].push({ T: p.t + delay[p.branch] + hp, h: hp });
    }
  }
  for (const e of input.extra ?? []) src[e.face].push({ T: e.t + e.h, h: e.h });
  const speed = (n: number): number => input.speed?.[VENT_IDS[n >> 1]] ?? 1;
  const edgeTime = (from: number, e: Edge): number => {
    let sp = Math.min(speed(from), speed(e.to));
    if ((rvSide(from) && lvFree(e.to)) || (lvFree(from) && rvSide(e.to))) sp *= VCOND.junction;
    switch (e.type) {
      case 'T': return e.len / (VCOND.vT * sp);
      case 'IN': return e.len / (VCOND.vEndo * sp);
      case 'RVIN': return e.len / (VCOND.vRvEndo * sp);
      case 'EPI': return e.len / (VCOND.vEpi * sp);
      default: return e.len / (VCOND.vT * 1.4 * sp);
    }
  };
  const sweepH = (to: number, dt: number, e: Edge): number => {
    const v = e.len / Math.max(1e-6, dt);
    return Math.max(VCOND.hMin, VCOND.muscleSpread * dt, (VCOND.sweepK * RADIUS(to)) / v);
  };
  const T = new Float64Array(N_FACES).fill(Infinity);
  const H = new Float64Array(N_FACES).fill(VCOND.hMin);
  const viaP = new Uint8Array(N_FACES);
  const done = new Uint8Array(N_FACES);
  for (let i = 0; i < N_FACES; i++) for (const s of src[i]) if (s.T < T[i]) {
    T[i] = s.T;
    H[i] = s.h;
    viaP[i] = 1;
  }
  for (;;) {
    let u = -1, best = Infinity;
    for (let i = 0; i < N_FACES; i++) if (!done[i] && T[i] < best) {
      best = T[i];
      u = i;
    }
    if (u < 0) break;
    done[u] = 1;
    for (const e of ADJ[u]) {
      const dt = edgeTime(u, e);
      const t = T[u] + dt;
      if (t < T[e.to]) {
        T[e.to] = t;
        H[e.to] = e.type === 'T' ? H[u] + VCOND.tmDisp * dt : sweepH(e.to, dt, e);
        viaP[e.to] = 0;
      }
    }
  }
  const out: { t0: number; t1: number; T: number; P: boolean }[] = [];
  for (let i = 0; i < N_FACES; i++) {
    if (!Number.isFinite(T[i])) {
      out.push({ t0: NaN, t1: NaN, T: NaN, P: false });
      continue;
    }
    let t0 = T[i] - H[i], t1 = T[i] + H[i];
    for (const s of src[i]) {
      t0 = Math.min(t0, s.T - s.h);
      t1 = Math.min(t1, s.T + s.h);
    }
    for (const e of ADJ[i]) {
      if (!Number.isFinite(T[e.to])) continue;
      const back = ADJ[e.to].find((x) => x.to === i);
      if (!back) continue;
      const dt = edgeTime(e.to, back);
      const hh = back.type === 'T' ? H[e.to] + VCOND.tmDisp * dt : sweepH(i, dt, back);
      t0 = Math.min(t0, T[e.to] + dt - hh);
      t1 = Math.min(t1, T[e.to] + dt + hh);
    }
    if (t1 < t0 + 2 * VCOND.hMin) t1 = t0 + 2 * VCOND.hMin;
    out.push({ t0, t1, T: (t0 + t1) / 2, P: viaP[i] === 1 && src[i].length > 0 });
  }
  // transmural consistency: the face activated second lags the first by at least the transmural time
  for (let v = 0; v < N_FACES / 2; v++) {
    const a = 2 * v, b = a + 1;
    if (!Number.isFinite(out[a].T) || !Number.isFinite(out[b].T)) continue;
    const lead = out[a].T <= out[b].T ? a : b, trail = lead === a ? b : a;
    if (out[trail].P) continue;
    const tm = VENT_GEOM[v].tmWall / (VCOND.vT * speed(a));
    const t0 = out[lead].t0 + (1 - VCOND.tmDisp) * tm;
    if (out[trail].t0 >= t0) continue;
    const t1 = Math.max(out[trail].t1, out[lead].t1 + (1 + VCOND.tmDisp) * tm);
    out[trail] = { t0, t1, T: (t0 + t1) / 2, P: false };
  }
  return out.map((o) => ({ t0: o.t0, t1: o.t1 }));
}

/** Per-region timing relative to the earliest activation, with an APD map (default: the normal map). */
export function regionTiming(faces: readonly FaceWindow[], apd: ApdMap = NORMAL_APD_MAP, shift?: number): RegionTiming {
  const n = REGION_IDS.length;
  const t0 = new Float32Array(n).fill(NaN), t1 = new Float32Array(n).fill(NaN);
  let first = Infinity;
  for (const f of faces) if (Number.isFinite(f.t0)) first = Math.min(first, f.t0);
  const ref = shift ?? first;
  VENT_IDS.forEach((id, v) => {
    const a = faces[2 * v], b = faces[2 * v + 1];
    const lo = Math.min(a.t0, b.t0), hi = Math.max(a.t1, b.t1);
    if (!Number.isFinite(lo)) return;
    const i = REGION_INDEX[id];
    t0[i] = lo - ref;
    t1[i] = hi - ref;
  });
  return { t0, t1, apdEndo: apd.endo, apdEpi: apd.epi };
}

const CACHE = new Map<string, RegionTiming>();

/** Activation timing for an input (cached; the key is the JSON of the input). */
export function activationTiming(input: ActivationInput = {}, apd: ApdMap = NORMAL_APD_MAP): RegionTiming {
  const key = JSON.stringify(input) + (apd === NORMAL_APD_MAP ? '' : `|${Array.from(apd.epi).join(',')}|${Array.from(apd.endo).join(',')}`);
  const hit = CACHE.get(key);
  if (hit) return hit;
  const t = regionTiming(faceWindows(input), apd);
  if (CACHE.size > 64) CACHE.clear();
  CACHE.set(key, t);
  return t;
}

/** Face index of a ventricular region (0 = endocardial, 1 = epicardial). */
export function faceOf(id: (typeof VENT_IDS)[number], face: 0 | 1): number {
  return F(id, face);
}

/** Earliest and latest activation of the ventricles in a timing (QRS extent of the region graph). */
export function timingExtent(t: RegionTiming): { first: number; last: number } {
  let first = Infinity, last = -Infinity;
  for (const id of VENT_IDS) {
    const i = REGION_INDEX[id];
    if (!Number.isFinite(t.t0[i])) continue;
    first = Math.min(first, t.t0[i]);
    last = Math.max(last, t.t1[i]);
  }
  return { first, last };
}
