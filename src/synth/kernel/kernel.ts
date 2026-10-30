/**
 * Kernels: instantiated lobes of the one cardiac source (DECISION §5 internal types, §6.2).
 *
 * A kernel contributes  far · amp · f(t) · d(t)  to the heart vector H(t) (Frank, mV) and, when it carries a location,
 * a near-field term at every electrode (render.ts). Lobes (`Lobe`, `Plateau`) are the resolved authoring units the
 * morphology builders produce (times relative to an anchor); `lobeKernel` shifts them to absolute strip time.
 */
import type { RegionWeights, Vec3 } from '../api';
import { apply, len, type Mat3, scale, unit } from '../frame';
import { bumpValue, partialArea, shapeConst, smoother, smootherInt } from './shapes';

export const WAVES = ['P', 'Ta', 'F', 'f', 'QRS', 'J', 'ST', 'T', 'U', 'stim', 'silent'] as const;
export type Wave = (typeof WAVES)[number];

/** A resolved bump lobe (times relative to its anchor, ms). */
export interface Lobe {
  readonly label: string;
  readonly on: number;
  readonly peak: number;
  readonly end: number;
  readonly endRule: 'edge' | 'tangent';
  readonly q: number;
  readonly dir: Vec3;
  readonly dir2: Vec3 | null;
  readonly amp: number;
  readonly regions: RegionWeights;
  /** near-field location (cm, Frank) or null (pure Dower far field) */
  readonly loc: Vec3 | null;
  /** 1 = dipole in H(t) + proximity correction; 0 = eccentric near field only */
  readonly far: number;
  readonly wave: Wave;
}

/** A resolved plateau (injury current), times relative to its anchor. */
export interface Plateau {
  readonly label: string;
  readonly on: number;
  readonly riseEnd: number;
  readonly fallStart: number;
  readonly end: number;
  readonly dir: Vec3;
  readonly amp: number;
  readonly regions: RegionWeights;
  readonly loc: Vec3 | null;
  readonly far: number;
  readonly wave: Wave;
}

export interface Kernel {
  readonly shape: 'bump' | 'plateau' | 'impulse';
  /** support [s0, s1] (absolute ms) */
  readonly s0: number;
  readonly s1: number;
  /** bump: peak; plateau: end of rise / start of fall; impulse: its time */
  readonly tp: number;
  readonly tq: number;
  /** bump half-widths (support), plateau rise / fall durations */
  readonly wl: number;
  readonly wr: number;
  /** clinical edges (2 % level / tangent end) used for truth */
  readonly on: number;
  readonly end: number;
  readonly q: number;
  readonly dir: Vec3;
  readonly dir2: Vec3 | null;
  /** mV (impulse: area in mV·ms) */
  readonly amp: number;
  readonly loc: Vec3 | null;
  readonly far: number;
  /** atrial kernel: uses the atrial column of the lead field (atrial centroid) */
  readonly atrialField: boolean;
  readonly wave: Wave;
  /** index of the beat / atrial event that owns the kernel (−1: none) */
  readonly beat: number;
}

export function lobeKernel(l: Lobe, shift: number, beat: number, atrialField = false): Kernel {
  const q = Math.round(l.q * 100) / 100;
  const sc = shapeConst(q);
  const wl = Math.max(0.5, (l.peak - l.on) / sc.edge);
  const wr = Math.max(0.5, (l.end - l.peak) / (l.endRule === 'tangent' ? sc.tangent : sc.edge));
  const tp = l.peak + shift;
  return {
    shape: 'bump', s0: tp - wl, s1: tp + wr, tp, tq: tp, wl, wr, on: l.on + shift, end: l.end + shift, q,
    dir: unit(l.dir), dir2: l.dir2 ? unit(l.dir2) : null, amp: l.amp, loc: l.loc, far: l.far, atrialField, wave: l.wave, beat,
  };
}

export function plateauKernel(p: Plateau, shift: number, beat: number, atrialField = false): Kernel {
  return {
    shape: 'plateau', s0: p.on + shift, s1: p.end + shift, tp: p.riseEnd + shift, tq: p.fallStart + shift,
    wl: p.riseEnd - p.on, wr: p.end - p.fallStart, on: p.on + shift, end: p.end + shift, q: 2,
    dir: unit(p.dir), dir2: null, amp: p.amp, loc: p.loc, far: p.far, atrialField, wave: p.wave, beat,
  };
}

/** Pacing stimulus: `area` mV·ms along `dir`, rendered into the one sample that contains `t`. */
export function impulseKernel(t: number, dir: Vec3, area: number, loc: Vec3 | null, far: number, beat: number): Kernel {
  return {
    shape: 'impulse', s0: t, s1: t, tp: t, tq: t, wl: 0, wr: 0, on: t, end: t, q: 2,
    dir: unit(dir), dir2: null, amp: area, loc, far, atrialField: false, wave: 'stim', beat,
  };
}

/** Unit-peak shape value at absolute time t (impulse: 0, see render.ts). */
export function shapeAt(k: Kernel, t: number): number {
  if (t <= k.s0 || t >= k.s1) return 0;
  if (k.shape === 'bump') return bumpValue(t < k.tp ? (k.tp - t) / k.wl : (t - k.tp) / k.wr, k.q);
  if (k.shape === 'plateau') {
    if (t < k.tp) return smoother((t - k.s0) / Math.max(1e-9, k.tp - k.s0));
    if (t <= k.tq) return 1;
    return smoother((k.s1 - t) / Math.max(1e-9, k.s1 - k.tq));
  }
  return 0;
}

/** Unit direction at time t (rotates linearly dir → dir2 across the support, renormalised). */
export function dirAt(k: Kernel, t: number): Vec3 {
  if (!k.dir2) return k.dir;
  const l = Math.min(1, Math.max(0, (t - k.s0) / Math.max(1e-9, k.s1 - k.s0)));
  return unit([k.dir[0] * (1 - l) + k.dir2[0] * l, k.dir[1] * (1 - l) + k.dir2[1] * l, k.dir[2] * (1 - l) + k.dir2[2] * l]);
}

/** Area of the unit shape (ms). */
export function unitArea(k: Kernel): number {
  if (k.shape === 'bump') return (k.wl + k.wr) * shapeConst(k.q).half;
  if (k.shape === 'plateau') return (k.tp - k.s0) / 2 + (k.tq - k.tp) + (k.s1 - k.tq) / 2;
  return 1;
}

/** Area vector ∫ amp f(t) d(t) dt (mV·ms): exact for fixed directions, 0.25 ms quadrature for rotating ones. */
export function areaVector(k: Kernel): Vec3 {
  if (!k.dir2) return scale(k.dir, k.amp * unitArea(k));
  let x = 0, y = 0, z = 0;
  const dt = 0.25;
  for (let t = k.s0 + dt / 2; t < k.s1; t += dt) {
    const f = k.amp * shapeAt(k, t) * dt;
    const d = dirAt(k, t);
    x += f * d[0];
    y += f * d[1];
    z += f * d[2];
  }
  return [x, y, z];
}

/** Area vector of a lobe (no instantiation needed by callers). */
export function lobeArea(l: Lobe): Vec3 {
  return areaVector(lobeKernel(l, 0, -1));
}
export function plateauArea(p: Plateau): Vec3 {
  return areaVector(plateauKernel(p, 0, -1));
}

/** Normalised cumulative area of the unit shape in [0, 1]. */
export function cdfAt(k: Kernel, t: number): number {
  if (t <= k.s0) return 0;
  if (t >= k.s1) return 1;
  if (k.shape === 'bump') {
    const c = shapeConst(k.q);
    const total = (k.wl + k.wr) * c.half;
    if (t < k.tp) return (k.wl * (c.half - partialArea(c, (k.tp - t) / k.wl))) / total;
    return (k.wl * c.half + k.wr * partialArea(c, (t - k.tp) / k.wr)) / total;
  }
  if (k.shape === 'plateau') {
    const r = k.tp - k.s0, h = k.tq - k.tp, f = k.s1 - k.tq;
    const total = r / 2 + h + f / 2;
    if (t < k.tp) return (r * smootherInt((t - k.s0) / Math.max(1e-9, r))) / total;
    if (t <= k.tq) return (r / 2 + (t - k.tp)) / total;
    return (r / 2 + h + f * (0.5 - smootherInt((k.s1 - t) / Math.max(1e-9, f)))) / total;
  }
  return t >= k.tp ? 1 : 0;
}

// ── lobe transforms (pure: they return new lobes) ─────────────────────────────────────────────────────────────────

/** Map every time edge of a lobe through a monotone function. */
export function mapLobeTimes(l: Lobe, f: (t: number) => number): Lobe {
  return { ...l, on: f(l.on), peak: f(l.peak), end: f(l.end) };
}
export function mapPlateauTimes(p: Plateau, f: (t: number) => number): Plateau {
  return { ...p, on: f(p.on), riseEnd: f(p.riseEnd), fallStart: f(p.fallStart), end: f(p.end) };
}

/** Rotate a lobe's directions and location (geometry change of the heart). */
/** A kernel turned by `m` (directions and near-field location). */
export function rotateKernel(k: Kernel, m: Mat3): Kernel {
  return { ...k, dir: apply(m, k.dir), dir2: k.dir2 ? apply(m, k.dir2) : null, loc: k.loc ? apply(m, k.loc) : null };
}

export function rotateLobe(l: Lobe, m: Mat3): Lobe {
  return { ...l, dir: apply(m, l.dir), dir2: l.dir2 ? apply(m, l.dir2) : null, loc: l.loc ? apply(m, l.loc) : null };
}
export function rotatePlateau(p: Plateau, m: Mat3): Plateau {
  return { ...p, dir: apply(m, p.dir), loc: p.loc ? apply(m, p.loc) : null };
}

/** Lobe with direction set to the area vector `a` and amplitude chosen so that its area vector equals `a`. */
export function lobeWithArea(l: Omit<Lobe, 'dir' | 'dir2' | 'amp'>, a: Vec3): Lobe {
  const unitLobe: Lobe = { ...l, dir: [1, 0, 0], dir2: null, amp: 1 };
  const u = unitArea(lobeKernel(unitLobe, 0, -1));
  const n = len(a);
  return { ...l, dir: n > 0 ? unit(a) : [1, 0, 0], dir2: null, amp: n / u };
}
