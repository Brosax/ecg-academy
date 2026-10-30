/**
 * Vessel streams of the schematic blood-flow layer (血流示意): venous inflow along the venae cavae and the pulmonary
 * veins into the atria, and outflow along the great arteries. Built once per geometry from geometry.overlays and the
 * labelled voxels, like the heart legs (core/flowPaths.ts); no fluid mechanics, only the textbook route.
 *
 *   right  SVC, IVC                    → caval orifice     → RA body (start of the TRICUSPID 'in' path)
 *   left   PV_RS, PV_RI, PV_LS, PV_LI  → pulmonary orifice → LA body (start of the MITRAL 'in' path)
 *   left   end of the AORTIC 'out' path (12 mm stub)    → ascending aorta → arch → descending aorta
 *   right  end of the PULMONARY 'out' path              → pulmonary trunk → left and right pulmonary arteries
 *
 * Orifices: atrial blood-domain voxels with a face neighbour of TISSUE.Vessel (the solid vessel plugs of the HRA bake);
 * each contact face goes to the overlay with the nearest vertex (every vessel overlay competes, so the coronary-sinus
 * ostium next to the IVC does not pull the IVC orifice), and a vein's orifice is the centroid of its faces. A vein with
 * no contact (HRA PV_LS ends ≈ 8 mm short of the left-atrial blood) is bridged straight from its nearest vertex to the
 * nearest atrial blood voxel when that gap is ≤ BRIDGE_MAX_MM, else it gets no stream.
 *
 * Centrelines: the HRA vessels are hollow tube walls (no solid lumen to voxelize), one mesh component per source node
 * (aorta: ascending, arch, descending and three branch stubs; trunk: trunk and both pulmonary arteries). A slab-centroid
 * march follows one component: step along the running direction, take the wall vertices in a thin slab across it,
 * and their outlier-trimmed centroid is the lumen centre (their mean distance the lumen radius); it ends where the slab
 * no longer finds a ring around the axis. A chain then continues into the nearest unvisited large component (ascending
 * → arch → descending) and forks when several are near (the pulmonary bifurcation); small components (arch branches)
 * are never entered. Without overlays (the stub heart) there are no vessel streams.
 */
import { polylineArc } from '../../sim/conduction/gridUtil';
import { add, cross, dot, normalize, scale, sub } from '../../sim/frame';
import type { GeometryBundle, OverlayMesh, ValveId, Vec3 } from '../../sim/types';
import { CHAMBER, TISSUE } from '../../sim/types';
import { computeFlowPaths, createFlowCtx, FLOW_MIN_RADIUS_MM, FLOW_STEP_MM, leg, snap, voxAt } from './flowPaths';
import type { FlowCtx } from './flowPaths';
import type { FlowPath, VesselFlowPath } from './flowTypes';

/** Veins draining into each atrium, by heart side (overlay ids). */
export const FLOW_VEINS = { R: ['SVC', 'IVC'], L: ['PV_RS', 'PV_RI', 'PV_LS', 'PV_LI'] } as const;
/** Great artery leaving each ventricle, by heart side. */
export const FLOW_ARTERIES = { L: 'AORTA', R: 'PULMONARY_TRUNK' } as const;

/** A contact face counts for the overlay with the nearest vertex within this distance (mm). */
const ORIFICE_ASSIGN_MM = 12;
/** Largest wall gap a vein without contact faces is bridged across (mm). */
export const BRIDGE_MAX_MM = 10;
const MARCH_STEP_MM = 1.5;
/** Half-width of the slab across the running direction (mm). */
const SLAB_MM = 1;
/** A ring needs this many wall vertices (angular coverage: RING_MIN_ARC_BINS of RING_BINS sectors). */
const RING_MIN_VERTS = 8;
const RING_BINS = 12;
/**
 * Search radius = max(RING_SEARCH_MIN_MM, RING_SEARCH_GAIN × r, r + RING_SEARCH_PAD_MM) for the previous lumen radius r
 * (first ring: RING_R0_MM), so a march that starts off the axis still reaches the far wall.
 */
const RING_SEARCH_MIN_MM = 6;
const RING_SEARCH_GAIN = 1.8;
const RING_SEARCH_PAD_MM = 8;
const RING_R0_MM = 10;
/** Ring radius bounds relative to the previous ring; the first ring is at least RING_FIRST_MIN_MM. */
const RING_SHRINK = 0.6;
const RING_GROW = 1.6;
const RING_FIRST_MIN_MM = 2.5;
/** Slabs without a ring the march crosses straight on (sparse tessellation, a joint between components). */
const MAX_MISS = 3;
/** Straight run allowed before the first ring is found (the arterial root, a bridged vein ostium). */
const LEAD_GAP_MM = 18;
/** Chains continue into a large component whose nearest vertex lies within this of the march end (mm). */
const JOIN_MM = 15;
/** Components smaller than this share of the vessel's largest one are skipped (arch branch stubs). */
const SMALL_COMPONENT = 0.3;
/** Initial direction: toward the centroid of the component's vertices within this distance (mm). */
const AIM_MM = 25;
const MAX_LEN_MM = 240;
/** 3-point moving-average passes over the joined polyline (ends stay put). */
const SMOOTH_PASSES = 6;

/** Vertex positions (packed xyz) of each large mesh component, largest first. */
export function vesselComponents(o: Pick<OverlayMesh, 'position' | 'index'>): Float32Array[] {
  const n = o.position.length / 3;
  const parent = new Int32Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  const find = (a: number): number => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]];
      a = parent[a];
    }
    return a;
  };
  const join = (a: number, b: number) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  for (let t = 0; t + 2 < o.index.length; t += 3) {
    join(o.index[t], o.index[t + 1]);
    join(o.index[t], o.index[t + 2]);
  }
  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    let g = groups.get(r);
    if (!g) groups.set(r, (g = []));
    g.push(i);
  }
  const all = [...groups.values()].sort((a, b) => b.length - a.length || a[0] - b[0]);
  const min = (all[0]?.length ?? 0) * SMALL_COMPONENT;
  return all
    .filter((g) => g.length >= Math.max(RING_MIN_VERTS, min))
    .map((g) => {
      const out = new Float32Array(3 * g.length);
      g.forEach((v, i) => out.set([o.position[3 * v], o.position[3 * v + 1], o.position[3 * v + 2]], 3 * i));
      return out;
    });
}

function minDist(V: Float32Array, p: Vec3): number {
  let best = Infinity;
  for (let i = 0; i < V.length; i += 3) best = Math.min(best, (V[i] - p[0]) ** 2 + (V[i + 1] - p[1]) ** 2 + (V[i + 2] - p[2]) ** 2);
  return Math.sqrt(best);
}

/** Unit direction from p toward the centroid of V's vertices within AIM_MM of p (null if none). */
function aim(V: Float32Array, p: Vec3): Vec3 | null {
  let sx = 0, sy = 0, sz = 0, n = 0;
  for (let i = 0; i < V.length; i += 3) {
    const dx = V[i] - p[0], dy = V[i + 1] - p[1], dz = V[i + 2] - p[2];
    if (dx * dx + dy * dy + dz * dz > AIM_MM * AIM_MM) continue;
    sx += dx;
    sy += dy;
    sz += dz;
    n++;
  }
  const l = Math.hypot(sx, sy, sz);
  return n && l > 1e-6 ? [sx / l, sy / l, sz / l] : null;
}

/** Least-squares circle (Kåsa) through 2D points; null when degenerate. */
function fitCircle(xs: readonly number[], ys: readonly number[]): { cx: number; cy: number; r: number } | null {
  let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0, sxz = 0, syz = 0, sz = 0;
  const n = xs.length;
  for (let i = 0; i < n; i++) {
    const x = xs[i], y = ys[i], z = x * x + y * y;
    sxx += x * x;
    sxy += x * y;
    syy += y * y;
    sx += x;
    sy += y;
    sxz += x * z;
    syz += y * z;
    sz += z;
  }
  // [sxx sxy sx; sxy syy sy; sx sy n] · [D E F] = −[sxz syz sz]
  const A = [sxx, sxy, sx, sxy, syy, sy, sx, sy, n], b = [-sxz, -syz, -sz];
  const det = (m: readonly number[]) => m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
  const d0 = det(A);
  if (!(Math.abs(d0) > 1e-9)) return null;
  const col = (k: number) => A.map((v, i) => (i % 3 === k ? b[(i / 3) | 0] : v));
  const D = det(col(0)) / d0, E = det(col(1)) / d0, F = det(col(2)) / d0;
  const r2 = (D * D + E * E) / 4 - F;
  return r2 > 0 ? { cx: -D / 2, cy: -E / 2, r: Math.sqrt(r2) } : null;
}

/** Inliers within max(RING_TOL_MM, RING_TOL × r) of the circle; a fit needs RING_MIN_VERTS of them. */
const RING_TOL_MM = 1;
const RING_TOL = 0.3;
/** Arcs covering fewer of the RING_BINS angular sectors are not rings (a fit to a wall patch). */
const RING_MIN_ARC_BINS = 5;

/**
 * Lumen centre and radius in the slab across d at q: a circle fitted (twice, the second time to the inliers of the
 * first) to the wall vertices in the slab, so a partial arc — the march entering a tube off its axis — still gives the
 * axis. Null when the slab holds no circular arc of radius within [rMin, rMax].
 */
export function ringAt(V: Float32Array, q: Vec3, d: Vec3, searchMm: number, rMin = 1, rMax = 30): { c: Vec3; r: number } | null {
  const u = normalize(Math.abs(d[0]) < 0.9 ? cross(d, [1, 0, 0]) : cross(d, [0, 1, 0]));
  const w = cross(d, u);
  let xs: number[] = [], ys: number[] = [];
  for (let i = 0; i < V.length; i += 3) {
    const dx = V[i] - q[0], dy = V[i + 1] - q[1], dz = V[i + 2] - q[2];
    if (Math.abs(dx * d[0] + dy * d[1] + dz * d[2]) > SLAB_MM || dx * dx + dy * dy + dz * dz > searchMm * searchMm) continue;
    xs.push(dx * u[0] + dy * u[1] + dz * u[2]);
    ys.push(dx * w[0] + dy * w[1] + dz * w[2]);
  }
  let fit: { cx: number; cy: number; r: number } | null = null;
  for (let pass = 0; pass < 2; pass++) {
    if (xs.length < RING_MIN_VERTS) return null;
    fit = fitCircle(xs, ys);
    if (!fit) return null;
    const tol = Math.max(RING_TOL_MM, RING_TOL * fit.r), f = fit;
    const keep = xs.map((x, i) => Math.abs(Math.hypot(x - f.cx, ys[i] - f.cy) - f.r) <= tol);
    xs = xs.filter((_, i) => keep[i]);
    ys = ys.filter((_, i) => keep[i]);
  }
  if (!fit || xs.length < RING_MIN_VERTS || fit.r < rMin || fit.r > rMax) return null;
  let bins = 0;
  for (let i = 0; i < xs.length; i++) {
    const ang = Math.atan2(ys[i] - fit.cy, xs[i] - fit.cx);
    bins |= 1 << Math.min(RING_BINS - 1, Math.floor(((ang + Math.PI) / (2 * Math.PI)) * RING_BINS));
  }
  let occupied = 0;
  for (let k = 0; k < RING_BINS; k++) if (bins & (1 << k)) occupied++;
  if (occupied < RING_MIN_ARC_BINS) return null;
  return { c: add(q, add(scale(u, fit.cx), scale(w, fit.cy))), r: fit.r };
}

interface Run {
  readonly pts: Vec3[];
  readonly radii: number[];
}

/** Running direction: from the ring this many steps back (a single step is dominated by centroid jitter). */
const DIR_BASE = 3;

/**
 * Slab-centroid march through one component from `start` along d0, at most maxLen mm of travel. The direction follows
 * the ring centroids only (never the start point, which may sit off the axis: an orifice, the valve stub).
 */
export function marchTube(V: Float32Array, start: Vec3, d0: Vec3, maxLen: number): Run & { readonly dir: Vec3 } {
  let p = start, d = normalize(d0), rPrev = RING_R0_MM, travelled = 0, miss = 0;
  const pts: Vec3[] = [], radii: number[] = [];
  while (travelled < maxLen) {
    const q = add(p, scale(d, MARCH_STEP_MM));
    travelled += MARCH_STEP_MM;
    const search = Math.max(RING_SEARCH_MIN_MM, RING_SEARCH_GAIN * rPrev, rPrev + RING_SEARCH_PAD_MM);
    // the lumen narrows gradually (a closed vein end) but never jumps: a much smaller or larger circle is something else
    const ring = pts.length ? ringAt(V, q, d, search, RING_SHRINK * rPrev, RING_GROW * rPrev) : ringAt(V, q, d, search, RING_FIRST_MIN_MM);
    if (!ring) {
      if ((!pts.length && travelled < LEAD_GAP_MM) || (pts.length && ++miss <= MAX_MISS)) {
        p = q;
        continue;
      }
      break;
    }
    miss = 0;
    if (pts.length) {
      const s = sub(ring.c, pts[Math.max(0, pts.length - DIR_BASE)]);
      // a ring behind the slab (a cap folding back) ends the march
      if (dot(s, d) <= 0) break;
      d = normalize(add(scale(d, 0.5), scale(normalize(s), 0.5)));
    }
    p = ring.c;
    pts.push(p);
    radii.push(ring.r);
    rPrev = ring.r;
  }
  return { pts, radii, dir: d };
}

const runLength = (r: Run): number => polylineArc(r.pts).length;

/**
 * Centreline alternatives through a vessel's components from `start`: march the unvisited component nearest start;
 * every other unvisited component that comes within JOIN_MM of the run's wall (lumen radius + JOIN_MM from a run
 * point) is a continuation or branch from that point — one alternative per branch (the pulmonary bifurcation forks).
 */
function chainRuns(comps: readonly Float32Array[], used: readonly boolean[], start: Vec3, d0: Vec3 | null, budget: number, depth = 0): Run[] {
  let first = -1, best = JOIN_MM + LEAD_GAP_MM;
  comps.forEach((V, i) => {
    if (used[i]) return;
    const d = minDist(V, start);
    if (d < best) {
      best = d;
      first = i;
    }
  });
  if (first < 0 || budget <= 0) return [];
  const V = comps[first];
  const dir = d0 ?? aim(V, start);
  if (!dir) return [];
  const m = marchTube(V, start, dir, budget);
  if (!m.pts.length) return [];
  const now = used.slice();
  now[first] = true;
  // where each unvisited component attaches to this run (closest run point)
  const attach: { i: number; k: number }[] = [];
  comps.forEach((C, i) => {
    if (now[i]) return;
    let bk = -1, bd = Infinity;
    m.pts.forEach((p, k) => {
      const dd = minDist(C, p) - m.radii[k];
      if (dd < bd) {
        bd = dd;
        bk = k;
      }
    });
    if (bk >= 0 && bd <= JOIN_MM) attach.push({ i, k: bk });
  });
  if (!attach.length || depth >= 3) return [m];
  const out: Run[] = [];
  const blocked = now.map((x, j) => x || attach.some((a) => a.i === j));
  for (const { i, k } of attach) {
    const pre: Run = { pts: m.pts.slice(0, k + 1), radii: m.radii.slice(0, k + 1) };
    const from = m.pts[k];
    // siblings are not entered from this branch
    const u = blocked.map((x, j) => (j === i ? false : x));
    const tails = chainRuns(comps, u, from, aim(comps[i], from) ?? m.dir, budget - runLength(pre), depth + 1);
    for (const t of tails) out.push({ pts: [...pre.pts, ...t.pts], radii: [...pre.radii, ...t.radii] });
  }
  return out.length ? out : [m];
}

/** Overlay vertex arrays with their bounding boxes (contact-face assignment). */
interface Box {
  readonly id: string;
  readonly V: ArrayLike<number>;
  readonly lo: Vec3;
  readonly hi: Vec3;
}

function boxOf(o: OverlayMesh): Box {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < o.position.length; i += 3)
    for (let a = 0; a < 3; a++) {
      lo[a] = Math.min(lo[a], o.position[i + a]);
      hi[a] = Math.max(hi[a], o.position[i + a]);
    }
  return { id: o.id, V: o.position, lo: lo as unknown as Vec3, hi: hi as unknown as Vec3 };
}

export interface VeinOrifice {
  /** Orifice point: centroid of the blood↔Vessel contact faces, or the atrial blood voxel a bridge ends on. */
  readonly o: Vec3;
  /** Contact faces assigned to this vein (0 when bridged). */
  readonly faces: number;
  readonly bridged: boolean;
}

/** Orifices of the given veins into atrial blood domain `ch` (see the file header). */
export function veinOrifices(c: FlowCtx, geo: GeometryBundle, ch: number, ids: readonly string[]): Map<string, VeinOrifice> {
  const { g, dom, X } = c;
  const [nx, ny, nz] = g.dims, sz = nx * ny, h = g.hMm;
  const boxes = (geo.overlays ?? []).map(boxOf);
  const acc = new Map<string, number[]>(ids.map((id) => [id, [0, 0, 0, 0]]));
  const steps = [1, -1, nx, -nx, sz, -sz];
  for (let v = 0; v < dom.length; v++) {
    if (dom[v] !== ch) continue;
    const k = (v / sz) | 0, r = v - k * sz, j = (r / nx) | 0, i = r - j * nx;
    if (i === 0 || j === 0 || k === 0 || i === nx - 1 || j === ny - 1 || k === nz - 1) continue;
    for (const s of steps) {
      if (g.tissue[v + s] !== TISSUE.Vessel) continue;
      const p = X.pos(v), q = X.pos(v + s);
      const m: Vec3 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
      let bestId = '', bd = ORIFICE_ASSIGN_MM * ORIFICE_ASSIGN_MM;
      for (const b of boxes) {
        let out = false;
        for (let a = 0; a < 3; a++) if (m[a] < b.lo[a] - ORIFICE_ASSIGN_MM || m[a] > b.hi[a] + ORIFICE_ASSIGN_MM) out = true;
        if (out) continue;
        const V = b.V;
        for (let t = 0; t < V.length; t += 3) {
          const d2 = (V[t] - m[0]) ** 2 + (V[t + 1] - m[1]) ** 2 + (V[t + 2] - m[2]) ** 2;
          if (d2 < bd) {
            bd = d2;
            bestId = b.id;
          }
        }
      }
      const a = acc.get(bestId);
      if (!a) continue;
      a[0] += m[0];
      a[1] += m[1];
      a[2] += m[2];
      a[3]++;
    }
  }
  const out = new Map<string, VeinOrifice>();
  for (const id of ids) {
    const a = acc.get(id)!;
    if (a[3] > 0) {
      out.set(id, { o: [a[0] / a[3], a[1] / a[3], a[2] / a[3]], faces: a[3], bridged: false });
      continue;
    }
    // no contact: bridge from the vein's vertex nearest to the atrial blood, when the gap is small
    const o = geo.overlays?.find((x) => x.id === id);
    if (!o) continue;
    let bestV = -1, bd = Infinity;
    for (let t = 0; t < o.position.length; t += 9) {
      const p: Vec3 = [o.position[t], o.position[t + 1], o.position[t + 2]];
      const w = X.nearest(p, (x) => dom[x] === ch, BRIDGE_MAX_MM);
      if (w < 0) continue;
      const q = X.pos(w), d = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
      if (d < bd) {
        bd = d;
        bestV = w;
      }
    }
    if (bestV >= 0 && bd <= BRIDGE_MAX_MM) out.set(id, { o: X.pos(bestV), faces: 0, bridged: true });
  }
  return out;
}

/** Smooths (ends fixed), resamples at FLOW_STEP_MM with linearly interpolated radii, and freezes. */
function finishVessel(
  pts: readonly Vec3[], radii: readonly number[], base: Omit<VesselFlowPath, 'pts' | 'radiusMm' | 'lengthMm'>,
): VesselFlowPath | null {
  let p = pts.slice();
  const last = p.length - 1;
  for (let s = 0; s < SMOOTH_PASSES; s++) {
    const q = p;
    p = q.map((x, i) => (i === 0 || i === last ? x : scale(add(add(q[i - 1], x), q[i + 1]), 1 / 3)));
  }
  const { cum, length } = polylineArc(p);
  if (p.length < 2 || !(length > FLOW_STEP_MM)) return null;
  const n = Math.max(1, Math.ceil(length / FLOW_STEP_MM));
  const outPts: Vec3[] = [], outR: number[] = [];
  let seg = 1;
  for (let s = 0; s <= n; s++) {
    const a = (length * s) / n;
    while (seg < p.length - 1 && cum[seg] < a) seg++;
    const a0 = cum[seg - 1], a1 = cum[seg], u = a1 > a0 ? (a - a0) / (a1 - a0) : 0;
    const p0 = p[seg - 1], p1 = p[seg];
    outPts.push(Object.freeze([p0[0] + u * (p1[0] - p0[0]), p0[1] + u * (p1[1] - p0[1]), p0[2] + u * (p1[2] - p0[2])]) as Vec3);
    outR.push(Math.max(FLOW_MIN_RADIUS_MM, radii[seg - 1] + u * (radii[seg] - radii[seg - 1])));
  }
  return Object.freeze({ ...base, pts: Object.freeze(outPts), radiusMm: Object.freeze(outR), lengthMm: polylineArc(outPts).length });
}

/** Lumen radius estimate of a blood-domain sample (mm). */
function cavityRadius(c: FlowCtx, p: Vec3): number {
  const v = voxAt(c.g, p);
  return Math.max(FLOW_MIN_RADIUS_MM, v < 0 ? 0 : 0.8 * Math.max(0, c.g.sdfMm[v]));
}

/** The venous streams into one atrium (in flow direction, ending on the atrial body point `body`). */
function buildVeins(c: FlowCtx, geo: GeometryBundle, side: 'L' | 'R', body: Vec3): VesselFlowPath[] {
  const ch = side === 'L' ? CHAMBER.LA : CHAMBER.RA;
  const valve: ValveId = side === 'L' ? 'MITRAL' : 'TRICUSPID';
  const ids = FLOW_VEINS[side];
  const orifices = veinOrifices(c, geo, ch, ids);
  const bodyVox = snap(c, body, ch);
  const out: VesselFlowPath[] = [];
  for (const id of ids) {
    const ori = orifices.get(id), mesh = geo.overlays?.find((x) => x.id === id);
    if (!ori || !mesh) continue;
    const comps = vesselComponents(mesh);
    const runs = chainRuns(comps, comps.map(() => false), ori.o, null, MAX_LEN_MM);
    const run = runs.reduce<Run | null>((a, r) => (!a || runLength(r) > runLength(a) ? r : a), null);
    if (!run || run.pts.length < 2) continue;
    // atrium leg: orifice → body inside the atrial blood domain (A*, medial pull)
    const oVox = snap(c, ori.o, ch);
    const inside = leg(c, oVox, bodyVox, ch);
    const pts = [...run.pts.slice().reverse(), ori.o, ...inside];
    const radii = [...run.radii.slice().reverse(), run.radii[0], ...inside.map((p) => cavityRadius(c, p))];
    const path = finishVessel(pts, radii, { valve, side, leg: 'in', vessel: id, ...(ori.bridged ? { bridged: true } : {}) });
    if (path) out.push(path);
  }
  return out;
}

/** The outflow stream(s) along the great artery of one side, continuing the side's 'out' path. */
function buildArtery(geo: GeometryBundle, side: 'L' | 'R', outPath: FlowPath): VesselFlowPath[] {
  const id = FLOW_ARTERIES[side];
  const mesh = geo.overlays?.find((x) => x.id === id);
  const valve = geo.valves.find((v) => v.id === outPath.valve);
  if (!mesh || !valve) return [];
  const comps = vesselComponents(mesh);
  const start = outPath.pts[outPath.pts.length - 1];
  const runs = chainRuns(comps, comps.map(() => false), start, valve.normal, MAX_LEN_MM).filter((r) => r.pts.length >= 2);
  // patient left = app +x = row 0 of the pose rotation
  const R = geo.pose.R;
  const appX = (p: Vec3) => R[0] * p[0] + R[1] * p[1] + R[2] * p[2];
  const order = runs.map((r) => appX(r.pts[r.pts.length - 1]));
  const out: VesselFlowPath[] = [];
  runs.forEach((r, i) => {
    const branch = runs.length > 1 ? (order[i] >= Math.max(...order) ? 'L' : 'R') : undefined;
    const path = finishVessel([start, ...r.pts], [r.radii[0], ...r.radii], {
      valve: outPath.valve, side, leg: 'out', vessel: id, ...(branch ? { branch } : {}),
    });
    if (path) out.push(path);
  });
  return out;
}

/**
 * Vessel streams for a geometry whose four heart paths are `heart` (VALVES order, from computeFlowPaths with the same
 * ctx): veins first (right, then left), then the arteries (aorta, then the pulmonary branches). Empty without overlays.
 */
export function computeVesselPaths(geo: GeometryBundle, c: FlowCtx, heart: readonly FlowPath[]): readonly VesselFlowPath[] {
  if (!geo.overlays?.length) return Object.freeze([]);
  const find = (valve: ValveId, legKind: 'in' | 'out') => heart.find((p) => p.valve === valve && p.leg === legKind);
  const tIn = find('TRICUSPID', 'in'), mIn = find('MITRAL', 'in'), aOut = find('AORTIC', 'out'), pOut = find('PULMONARY', 'out');
  const out: VesselFlowPath[] = [];
  if (tIn) out.push(...buildVeins(c, geo, 'R', tIn.pts[0]));
  if (mIn) out.push(...buildVeins(c, geo, 'L', mIn.pts[0]));
  if (aOut) out.push(...buildArtery(geo, 'L', aOut));
  if (pOut) out.push(...buildArtery(geo, 'R', pOut));
  return Object.freeze(out);
}

export interface FlowNetwork {
  /** The four heart streams, VALVES order (core/flowPaths.ts). */
  readonly heart: readonly FlowPath[];
  readonly vessels: readonly VesselFlowPath[];
}

const cache = new Map<string, FlowNetwork>();
const CACHE_MAX = 4;

/** Heart and vessel streams of a geometry, built on one shared context; cached like buildFlowPaths. */
export function buildFlowNetwork(geo: GeometryBundle): FlowNetwork {
  const key = `${geo.hash}|${geo.grid.dims.join('x')}|${geo.grid.hMm}|${geo.overlays?.length ?? 0}`;
  let net = cache.get(key);
  if (!net) {
    const c = createFlowCtx(geo);
    const heart = computeFlowPaths(geo, c);
    net = Object.freeze({ heart, vessels: computeVesselPaths(geo, c, heart) });
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(key, net);
  }
  return net;
}
