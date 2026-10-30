/**
 * Unit-peak kernel shapes with compact support (ported from prototype B `kernels.ts`, DECISION §6.2).
 *
 *  - bump:    f(u) = (1 − |u|^q)³, asymmetric (separate half-widths before / after the peak). Authoring uses clinical
 *             edges: `on` is the 2 % level (u = edge), `end` the 2 % level or, for T waves, the tangent-method end (the
 *             point where the tangent at the steepest descent meets zero, u = tangent). So the truth timing is what a
 *             reader measures. q = 2 is the smooth default; q < 2 gives a pointed apex (tented T of hyperkalaemia).
 *  - plateau: smootherstep rise, flat top, smootherstep fall (injury currents).
 *  - impulse: a pacing stimulus, rendered area-preserving into one sample (render.ts).
 */

/** u at which (1 − u²)³ = 2.1 % of the peak. */
export const EDGE_U = 0.85;
/** q = 2: the tangent at the steepest descent (u = 1/√5) crosses zero at u = 1/√5 + f/f′ = √5/3 ≈ 0.74536. */
export const TANGENT_U = Math.sqrt(5) / 3;
/** ∫₀¹ (1 − u²)³ du */
const HALF_AREA_Q2 = 16 / 35;

export interface ShapeConst {
  /** u of the 2 % level */
  readonly edge: number;
  /** u of the tangent-method end */
  readonly tangent: number;
  /** ∫₀¹ f */
  readonly half: number;
  /** cumulative ∫₀^u f on a uniform grid (null for q = 2, which has a closed form) */
  readonly cdf: Float64Array | null;
}

const SHAPES = new Map<number, ShapeConst>();
const MAX_SHAPES = 64;

/** Shape constants for a peakedness q (bounded cache: q values come from authored constants and a few dials). */
export function shapeConst(qIn: number): ShapeConst {
  // q is quantised to 0.01 so continuous values (jitter, dials) cannot defeat the cache
  const q = Math.round(qIn * 100) / 100;
  const hit = SHAPES.get(q);
  if (hit) return hit;
  let c: ShapeConst;
  if (q === 2) c = { edge: EDGE_U, tangent: TANGENT_U, half: HALF_AREA_Q2, cdf: null };
  else {
    const f = (u: number): number => (1 - u ** q) ** 3;
    const edge = (1 - Math.cbrt(0.02)) ** (1 / q);
    let um = 0, sm = 0;
    const N = 2000;
    for (let i = 1; i < N; i++) {
      const u = i / N;
      const sl = (f(u - 0.5 / N) - f(u + 0.5 / N)) * N;
      if (sl > sm) {
        sm = sl;
        um = u;
      }
    }
    const tangent = um + f(um) / sm;
    const cdf = new Float64Array(N + 1);
    for (let i = 1; i <= N; i++) cdf[i] = cdf[i - 1] + f((i - 0.5) / N) / N;
    c = { edge, tangent, half: cdf[N], cdf };
  }
  if (SHAPES.size >= MAX_SHAPES) SHAPES.clear();
  SHAPES.set(q, c);
  return c;
}

/** ∫₀^u (1 − s²)³ ds */
const P7 = (u: number): number => u - u ** 3 + (3 * u ** 5) / 5 - u ** 7 / 7;

/** ∫₀^u f for the shape `c` (u ∈ [0, 1]). */
export function partialArea(c: ShapeConst, u: number): number {
  if (!c.cdf) return P7(Math.min(1, Math.max(0, u)));
  const N = c.cdf.length - 1;
  const x = Math.min(N, Math.max(0, u * N));
  const i = Math.floor(x);
  return i >= N ? c.cdf[N] : c.cdf[i] + (c.cdf[i + 1] - c.cdf[i]) * (x - i);
}

/** f(u) = (1 − |u|^q)³ for |u| < 1, else 0. */
export function bumpValue(u: number, q: number): number {
  const a = Math.abs(u);
  if (a >= 1) return 0;
  const b = 1 - (q === 2 ? a * a : a ** q);
  return b * b * b;
}

/** C2 smootherstep on [0, 1]. */
export const smoother = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (6 * x - 15) + 10));
/** ∫₀^x smootherstep (x ∈ [0, 1]). */
export const smootherInt = (x: number): number => x * x * x * x * (x * (x - 3) + 2.5);
/** C1 smoothstep on [0, 1]. */
export const smoothstep = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
