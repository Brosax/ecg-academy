/**
 * Parametric heart-vector kernels (Frank axes: +X patient left, +Y inferior, +Z posterior; amplitudes in mV).
 *
 * A kernel contributes  amp * f(t) * d(t)  to the heart vector H(t), where f is a unit-peak shape with compact support
 * and d(t) a unit direction (optionally rotating from `dir` to `dir2` across the support).
 *
 * Shapes
 *  - 'bump': asymmetric compact bump  f = (1 - u^2)^3, u = (tp - t)/wl before the peak, (t - tp)/wr after it.
 *    Authoring uses clinically meaningful edges: `on` = the 2 % level (u = EDGE_U), `end` = either the 2 % level
 *    or, for T waves, the point where the tangent at the steepest descent crosses zero (u = TANGENT_U) — i.e. the
 *    tangent-method T end that a reader measures. The truth timing therefore equals what is measurable.
 *  - 'plateau': smootherstep rise on [t0, tp], 1 on [tp, tq], smootherstep fall on [tq, t1]  (injury currents).
 */

export type Vec3 = readonly [number, number, number];

export const RegionNames = [
  'SAN', 'RA', 'LA', 'AVN', 'HIS_BB', 'IVS', 'RV', 'RVOT', 'LV_ANT', 'LV_LAT', 'LV_INF', 'LV_APEX', 'LV_BASE',
] as const;
export type RegionName = (typeof RegionNames)[number];
export type RegionTag = readonly [RegionName, number];

/** depol: raises the region's depolarized fraction; repol: lowers it; none: no effect on the 3D state (injury). */
export type Role = 'depol' | 'repol' | 'none';
export type Wave = 'P' | 'Ta' | 'QRS' | 'ST' | 'T' | 'U' | 'F' | 'silent';

export type Kernel = {
  shape: 'bump' | 'plateau';
  /** support start / end (ms, absolute once instantiated) */
  s0: number;
  s1: number;
  /** bump: peak time and half widths; plateau: tp = end of rise, tq = start of fall */
  tp: number;
  tq: number;
  wl: number;
  wr: number;
  /** nominal (clinically visible) edges used for truth timing */
  on: number;
  end: number;
  dir: Vec3;
  dir2: Vec3 | null;
  amp: number;
  /** eccentric source location (cm, Frank, origin = ventricular centroid) → proximity (non-dipolar) term */
  loc: Vec3 | null;
  /** localised sources only: fraction of the source carried by the torso-corrected Dower far field (1 = dipole at the
   *  centroid + proximity correction; 0 = pure infinite-medium potential of a small eccentric dipole) */
  far: number;
  /** bump peakedness: f = (1 − |u|^q)^3. q = 2 is the smooth default; q < 2 gives a pointed (tented) apex */
  q: number;
  wave: Wave;
  role: Role;
  regions: readonly RegionTag[];
  label: string;
};

export const EDGE_U = 0.85; // f(EDGE_U) = 2.1 % of peak
export const TANGENT_U = 0.7453; // tangent at max descending slope (u = 1/sqrt 5) crosses zero here
const HALF_AREA = 16 / 35; // ∫0^1 (1-u^2)^3 du

export const norm = (v: Vec3): Vec3 => {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
};

export type BumpSpec = {
  on: number;
  peak: number;
  end: number;
  dir: Vec3;
  amp: number;
  regions?: readonly RegionTag[];
  dir2?: Vec3;
  loc?: Vec3;
  label: string;
  /** 'edge' (default): end is the 2 % level; 'tangent': end is the tangent-method end (T waves) */
  endRule?: 'edge' | 'tangent';
  far?: number;
  q?: number;
};

export type PlateauSpec = {
  on: number;
  riseEnd: number;
  fallStart: number;
  end: number;
  dir: Vec3;
  amp: number;
  regions?: readonly RegionTag[];
  loc?: Vec3;
  far?: number;
  label: string;
};

/** shape constants for f(u) = (1 − u^q)^3 on [0, 1]: 2 % level, tangent-method end, half area (cached per q) */
type ShapeConst = { edge: number; tangent: number; half: number; cdf: Float64Array | null };
const SHAPES = new Map<number, ShapeConst>();
export function shapeConst(q: number): ShapeConst {
  let c = SHAPES.get(q);
  if (c) return c;
  if (q === 2) c = { edge: EDGE_U, tangent: TANGENT_U, half: HALF_AREA, cdf: null };
  else {
    const f = (u: number): number => (1 - u ** q) ** 3;
    const edge = (1 - Math.cbrt(0.02)) ** (1 / q);
    // steepest descent and its tangent's zero crossing
    let um = 0, sm = 0;
    const N = 4000;
    for (let i = 1; i < N; i++) {
      const u = i / N;
      const sl = (f(u - 0.5 / N) - f(u + 0.5 / N)) * N;
      if (sl > sm) { sm = sl; um = u; }
    }
    const tangent = um + f(um) / sm;
    const cdf = new Float64Array(N + 1);
    for (let i = 1; i <= N; i++) cdf[i] = cdf[i - 1]! + (f((i - 0.5) / N)) / N;
    c = { edge, tangent, half: cdf[N]!, cdf };
  }
  SHAPES.set(q, c);
  return c;
}
/** ∫0^u f */
function partial(c: ShapeConst, u: number): number {
  if (!c.cdf) return P7(u);
  const N = c.cdf.length - 1;
  const x = Math.min(N, Math.max(0, u * N));
  const i = Math.floor(x);
  return i >= N ? c.cdf[N]! : c.cdf[i]! + (c.cdf[i + 1]! - c.cdf[i]!) * (x - i);
}

export function bump(s: BumpSpec, shift: number, wave: Wave, role: Role): Kernel {
  const q = s.q ?? 2;
  const sc = shapeConst(q);
  const wl = Math.max(1, (s.peak - s.on) / sc.edge);
  const wr = Math.max(1, (s.end - s.peak) / (s.endRule === 'tangent' ? sc.tangent : sc.edge));
  const tp = s.peak + shift;
  return {
    shape: 'bump', s0: tp - wl, s1: tp + wr, tp, tq: tp, wl, wr, on: s.on + shift, end: s.end + shift,
    dir: norm(s.dir), dir2: s.dir2 ? norm(s.dir2) : null, amp: s.amp, loc: s.loc ?? null, far: s.far ?? 1, q,
    wave, role, regions: s.regions ?? [], label: s.label,
  };
}

export function plateau(s: PlateauSpec, shift: number, wave: Wave, role: Role): Kernel {
  return {
    shape: 'plateau', s0: s.on + shift, s1: s.end + shift, tp: s.riseEnd + shift, tq: s.fallStart + shift,
    wl: s.riseEnd - s.on, wr: s.end - s.fallStart, on: s.on + shift, end: s.end + shift,
    dir: norm(s.dir), dir2: null, amp: s.amp, loc: s.loc ?? null, far: s.far ?? 1, q: 2, wave, role,
    regions: s.regions ?? [], label: s.label,
  };
}

const smoother = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);
const smootherInt = (x: number): number => x * x * x * x * (x * (x - 3) + 2.5); // ∫0^x smoother

/** unit-peak shape value */
export function shapeAt(k: Kernel, t: number): number {
  if (t <= k.s0 || t >= k.s1) return 0;
  if (k.shape === 'bump') {
    const u = t < k.tp ? (k.tp - t) / k.wl : (t - k.tp) / k.wr;
    const a = 1 - (k.q === 2 ? u * u : u ** k.q);
    return a * a * a;
  }
  if (t < k.tp) return smoother((t - k.s0) / Math.max(1e-9, k.tp - k.s0));
  if (t <= k.tq) return 1;
  return smoother((k.s1 - t) / Math.max(1e-9, k.s1 - k.tq));
}

/** direction at time t (unit) */
export function dirAt(k: Kernel, t: number): Vec3 {
  if (!k.dir2) return k.dir;
  const l = Math.min(1, Math.max(0, (t - k.s0) / (k.s1 - k.s0)));
  return norm([
    k.dir[0] * (1 - l) + k.dir2[0] * l,
    k.dir[1] * (1 - l) + k.dir2[1] * l,
    k.dir[2] * (1 - l) + k.dir2[2] * l,
  ]);
}

const P7 = (u: number): number => u - u ** 3 + (3 * u ** 5) / 5 - u ** 7 / 7; // ∫0^u (1-s^2)^3 ds

/** normalized cumulative area of the shape in [0, 1] (drives the 3D region state) */
export function cdfAt(k: Kernel, t: number): number {
  if (t <= k.s0) return 0;
  if (t >= k.s1) return 1;
  if (k.shape === 'bump') {
    const c = shapeConst(k.q);
    const total = (k.wl + k.wr) * c.half;
    if (t < k.tp) return (k.wl * (c.half - partial(c, (k.tp - t) / k.wl))) / total;
    return (k.wl * c.half + k.wr * partial(c, (t - k.tp) / k.wr)) / total;
  }
  const r = k.tp - k.s0;
  const h = k.tq - k.tp;
  const f = k.s1 - k.tq;
  const total = r / 2 + h + f / 2;
  if (t < k.tp) return (r * smootherInt((t - k.s0) / Math.max(1e-9, r))) / total;
  if (t <= k.tq) return (r / 2 + (t - k.tp)) / total;
  return (r / 2 + h + f * (0.5 - smootherInt((k.s1 - t) / Math.max(1e-9, f)))) / total;
}

/** area vector ∫ amp f(t) d(t) dt  (mV·ms), numeric at 0.5 ms */
export function areaVector(k: Kernel): Vec3 {
  let x = 0, y = 0, z = 0;
  const dt = 0.5;
  for (let t = k.s0; t < k.s1; t += dt) {
    const f = k.amp * shapeAt(k, t) * dt;
    const d = dirAt(k, t);
    x += f * d[0];
    y += f * d[1];
    z += f * d[2];
  }
  return [x, y, z];
}

/** area of the unit shape (ms) */
export function shapeArea(k: Kernel): number {
  if (k.shape === 'bump') return (k.wl + k.wr) * shapeConst(k.q).half;
  return (k.tp - k.s0) / 2 + (k.tq - k.tp) + (k.s1 - k.tq) / 2;
}
