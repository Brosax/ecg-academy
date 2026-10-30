/**
 * Schematic blood-flow streamlines (血流示意): one static polyline per valve, built once per geometry from data the
 * bundle already carries — ValveGeom (centre, forward-flow normal, annulus radius), ChamberAxis and the labelled blood
 * voxels. No fluid mechanics: the paths only trace the textbook route; the timing comes from core/flowTiming.ts.
 *
 *   MITRAL     L in   LA body → mitral orifice → LV apex
 *   TRICUSPID  R in   RA body → tricuspid orifice → RV apex
 *   AORTIC     L out  LV apex → LV outflow tract → aortic valve → 12 mm stub along the valve normal
 *   PULMONARY  R out  RV apex → RV outflow tract → pulmonary valve → 12 mm stub
 *
 * Chamber domains are the blood voxels of one cavity label restricted to its largest 6-connected component, so the HRA
 * label-leak crevices (RA↔LV, LV↔RV next to the central fibrous body) drop out and no path can fake a septal shunt.
 * Each chamber leg is a 26-neighbour A* geodesic inside its domain whose step cost grows near the wall (medial pull;
 * sdf saturates at 7.9 mm on HRA) and, in a ventricle, on the wrong side of the plane through the apex that separates
 * the AV valve from the semilunar valve: the inflow leg runs down the inflow side and the outflow leg up the outflow
 * tract, giving the inflow → apex → outflow loop. Valve crossings are straight runs along the valve normal through the
 * blood orifice (centroid of the atrium↔ventricle blood contact on HRA; the valve centre where a ring slab separates
 * the cavities, as on the stub), pinned through smoothing so every stream crosses its valve plane once, head-on.
 */
import { add, dot, normalize, scale, sub } from '../../sim/frame';
import { polylineArc, resamplePolyline } from '../../sim/conduction/gridUtil';
import { VoxelIndex } from '../../sim/geometry/hra/conduction';
import type { Chamber, ChamberAxis, GeometryBundle, ValveGeom, ValveId, Vec3, VoxelGrid } from '../../sim/types';
import { CHAMBER, TISSUE, VALVES } from '../../sim/types';
import type { FlowPath } from './flowTypes';

/** Arc-length spacing of the output samples (mm, upper bound). */
export const FLOW_STEP_MM = 2;
/** Great-artery stub past each semilunar valve, along its normal (mm). */
export const FLOW_STUB_MM = 12;
/** Floor of the lumen-radius estimate (mm): samples in the valve ring or the arterial root. */
export const FLOW_MIN_RADIUS_MM = 1;

/** Straight run on each side of a valve plane (mm) and how far along the normal to look for the chamber domain. */
const LEAD_MM = 7, LEAD_MAX_MM = 16;
/** Atrial body = axis centre + axis · 0.3 L (toward the roof); ventricular apex = centre + axis · 0.4 L. */
const BODY_FRAC = 0.3, APEX_FRAC = 0.4;
/** Endpoints prefer voxels at least this far from the wall (mm). */
const SNAP_SDF_MM = 2;
/** Step-cost multiplier 1 + WALL_GAIN · (1 − min(sdf, WALL_REF) / WALL_REF)². */
const WALL_REF_MM = 6, WALL_GAIN = 4;
/** Ventricular legs: × (1 + SIDE_GAIN · ramp) on the wrong side of the inflow/outflow plane, full after SIDE_RAMP_MM. */
const SIDE_RAMP_MM = 6, SIDE_GAIN = 2;
/** 3-point moving-average passes over the voxel staircase (pinned valve runs and ends stay put). */
const SMOOTH_PASSES = 10;

export type Vox = { readonly pt: Vec3; readonly vox: number };

/**
 * Per-voxel chamber code of the four blood domains (largest 6-connected component of each cavity label), else 0.
 * Same result as hra/voxelize removeIslands(blood && chamber === ch, 'largest') per chamber (ties → lowest voxel
 * index), in one labelling pass over the grid instead of four.
 */
export function flowChamberDomains(g: VoxelGrid): Uint8Array {
  const T = g.tissue, C = g.chamber, n = T.length, B = TISSUE.Blood;
  const [nx, ny, nz] = g.dims, sz = nx * ny;
  const label = new Int32Array(n);
  const sizes = [0], chOf = [0];
  const stack = new Int32Array(n);
  for (let s = 0; s < n; s++) {
    if (label[s] || T[s] !== B || !C[s]) continue;
    const id = sizes.length, ch = C[s];
    let top = 0, size = 0;
    const visit = (w: number) => {
      if (label[w] || T[w] !== B || C[w] !== ch) return;
      label[w] = id;
      stack[top++] = w;
    };
    visit(s);
    while (top) {
      const v = stack[--top];
      size++;
      const k = (v / sz) | 0, r = v - k * sz, j = (r / nx) | 0, i = r - j * nx;
      if (i > 0) visit(v - 1);
      if (i < nx - 1) visit(v + 1);
      if (j > 0) visit(v - nx);
      if (j < ny - 1) visit(v + nx);
      if (k > 0) visit(v - sz);
      if (k < nz - 1) visit(v + sz);
    }
    sizes.push(size);
    chOf.push(ch);
  }
  const best = new Int32Array(256);
  for (let l = 1; l < sizes.length; l++) if (sizes[l] > sizes[best[chOf[l]]]) best[chOf[l]] = l;
  const dom = new Uint8Array(n);
  for (let v = 0; v < n; v++) {
    const l = label[v];
    if (l && best[chOf[l]] === l) dom[v] = chOf[l];
  }
  return dom;
}

/** Trilinear sample of grid.sdfMm (clamped to the grid). */
function sampleSdf(g: VoxelGrid, p: Vec3): number {
  const [nx, ny, nz] = g.dims;
  const f = (x: number, o: number, n: number) => Math.min(n - 1, Math.max(0, (x - o) / g.hMm));
  const fx = f(p[0], g.originMm[0], nx), fy = f(p[1], g.originMm[1], ny), fz = f(p[2], g.originMm[2], nz);
  const i = Math.min(nx - 2, Math.floor(fx)), j = Math.min(ny - 2, Math.floor(fy)), k = Math.min(nz - 2, Math.floor(fz));
  const u = fx - i, w = fy - j, t = fz - k;
  const S = g.sdfMm, sy = nx, sz = nx * ny, v = i + nx * (j + ny * k);
  const lerp = (a: number, b: number, s: number) => a + (b - a) * s;
  const c00 = lerp(S[v], S[v + 1], u), c10 = lerp(S[v + sy], S[v + sy + 1], u);
  const c01 = lerp(S[v + sz], S[v + sz + 1], u), c11 = lerp(S[v + sy + sz], S[v + sy + sz + 1], u);
  return lerp(lerp(c00, c10, w), lerp(c01, c11, w), t);
}

/** Ventricular legs: penalise voxels on the wrong side of the plane through `o` with normal `s` (+ = the leg's side). */
interface SidePlane {
  readonly o: Vec3;
  readonly s: Vec3;
  readonly sign: 1 | -1;
}

/**
 * Weighted 26-neighbour A* over one domain on reusable typed arrays (VoxelIndex.geodesic is unweighted and Map-based).
 * Step cost = Euclidean length · mean node multiplier (≥ 1), so the straight-line heuristic stays admissible.
 * Node multiplier = wall term (1 + WALL_GAIN · (1 − min(sdf, WALL_REF) / WALL_REF)²) × optional side term.
 */
export class DomainSearch {
  private readonly gCost: Float64Array;
  private readonly prev: Int32Array;
  private readonly mult: Float32Array;
  private readonly closed: Uint8Array;
  private touched: number[] = [];
  private hk = new Float64Array(1024);
  private hv = new Int32Array(1024);
  private hn = 0;
  private readonly oi = new Int32Array(26);
  private readonly oj = new Int32Array(26);
  private readonly ok = new Int32Array(26);
  private readonly ov = new Int32Array(26);
  private readonly olen = new Float64Array(26);

  constructor(private readonly g: VoxelGrid, private readonly dom: Uint8Array) {
    const n = g.tissue.length;
    this.gCost = new Float64Array(n).fill(Infinity);
    this.prev = new Int32Array(n).fill(-1);
    this.mult = new Float32Array(n);
    this.closed = new Uint8Array(n);
    const [nx, ny] = g.dims;
    let o = 0;
    for (let dk = -1; dk <= 1; dk++)
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj && !dk) continue;
          this.oi[o] = di;
          this.oj[o] = dj;
          this.ok[o] = dk;
          this.ov[o] = di + nx * (dj + ny * dk);
          this.olen[o++] = Math.sqrt(di * di + dj * dj + dk * dk) * g.hMm;
        }
  }

  private multOf(v: number, i: number, j: number, k: number, side: SidePlane | undefined): number {
    const mult = this.mult;
    if (mult[v] === 0) {
      const g = this.g;
      const t = 1 - Math.min(Math.max(g.sdfMm[v], 0), WALL_REF_MM) / WALL_REF_MM;
      let m = 1 + WALL_GAIN * t * t;
      if (side) {
        const { o, s } = side, h = g.hMm;
        const x = g.originMm[0] + i * h - o[0], y = g.originMm[1] + j * h - o[1], z = g.originMm[2] + k * h - o[2];
        const wrong = -side.sign * (x * s[0] + y * s[1] + z * s[2]);
        if (wrong > 0) m *= 1 + SIDE_GAIN * Math.min(1, wrong / SIDE_RAMP_MM);
      }
      mult[v] = m;
      this.touched.push(v);
    }
    return mult[v];
  }

  private push(f: number, v: number): void {
    if (this.hn === this.hk.length) {
      const k = new Float64Array(this.hn * 2), w = new Int32Array(this.hn * 2);
      k.set(this.hk);
      w.set(this.hv);
      this.hk = k;
      this.hv = w;
    }
    const hk = this.hk, hv = this.hv;
    let i = this.hn++;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (hk[p] <= f) break;
      hk[i] = hk[p];
      hv[i] = hv[p];
      i = p;
    }
    hk[i] = f;
    hv[i] = v;
  }

  private pop(): number {
    const hk = this.hk, hv = this.hv;
    const top = hv[0];
    const n = --this.hn;
    if (n > 0) {
      const f = hk[n], v = hv[n];
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= n) break;
        const m = l + 1 < n && hk[l + 1] < hk[l] ? l + 1 : l;
        if (hk[m] >= f) break;
        hk[i] = hk[m];
        hv[i] = hv[m];
        i = m;
      }
      hk[i] = f;
      hv[i] = v;
    }
    return top;
  }

  /** Voxel path a → b inside domain `ch` (both ends must be in it); empty if unreachable. */
  path(a: number, b: number, ch: number, side?: SidePlane): number[] {
    const { g, dom, gCost, prev, mult, closed, oi, oj, ok, ov, olen } = this;
    const [nx, ny, nz] = g.dims, h = g.hMm, sz = nx * ny;
    const bk = (b / sz) | 0, bj = ((b - bk * sz) / nx) | 0, bi = b - bk * sz - bj * nx;
    const dist = (i: number, j: number, k: number) => Math.sqrt((i - bi) ** 2 + (j - bj) ** 2 + (k - bk) ** 2) * h;
    const ak = (a / sz) | 0, aj = ((a - ak * sz) / nx) | 0, ai = a - ak * sz - aj * nx;
    this.multOf(a, ai, aj, ak, side);
    gCost[a] = 0;
    this.hn = 0;
    this.push(dist(ai, aj, ak), a);
    while (this.hn > 0) {
      const v = this.pop();
      if (closed[v]) continue;
      closed[v] = 1;
      if (v === b) break;
      const k = (v / sz) | 0, j = ((v - k * sz) / nx) | 0, i = v - k * sz - j * nx;
      const mv = mult[v], gv = gCost[v];
      for (let o = 0; o < 26; o++) {
        const ii = i + oi[o], jj = j + oj[o], kk = k + ok[o];
        if (ii < 0 || jj < 0 || kk < 0 || ii >= nx || jj >= ny || kk >= nz) continue;
        const w = v + ov[o];
        if (dom[w] !== ch || closed[w]) continue;
        const gw = gv + olen[o] * 0.5 * (mv + this.multOf(w, ii, jj, kk, side));
        if (gw >= gCost[w]) continue;
        gCost[w] = gw;
        prev[w] = v;
        this.push(gw + dist(ii, jj, kk), w);
      }
    }
    const out: number[] = [];
    if (closed[b]) for (let v = b; v >= 0; v = v === a ? -1 : prev[v]) out.push(v);
    for (const v of this.touched) {
      gCost[v] = Infinity;
      prev[v] = -1;
      mult[v] = 0;
      closed[v] = 0;
    }
    this.touched = [];
    return out.reverse();
  }
}

/** Build context shared by the heart legs and the vessel streams (core/vesselPaths.ts): domains, index, search. */
export interface FlowCtx {
  readonly g: VoxelGrid;
  readonly X: VoxelIndex;
  readonly dom: Uint8Array;
  readonly search: DomainSearch;
}
type Ctx = FlowCtx;

export function createFlowCtx(geo: GeometryBundle): FlowCtx {
  const g = geo.grid;
  const dom = flowChamberDomains(g);
  return { g, X: new VoxelIndex(g), dom, search: new DomainSearch(g, dom) };
}

/** Voxel containing p (nearest centre), −1 outside the grid. */
export function voxAt(g: VoxelGrid, p: Vec3): number {
  const [nx, ny, nz] = g.dims;
  const i = Math.round((p[0] - g.originMm[0]) / g.hMm), j = Math.round((p[1] - g.originMm[1]) / g.hMm), k = Math.round((p[2] - g.originMm[2]) / g.hMm);
  return i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? -1 : i + nx * (j + ny * k);
}

/** Domain voxel nearest p, preferring voxels ≥ SNAP_SDF_MM from the wall. */
export function snap(c: Ctx, p: Vec3, ch: number): Vox {
  const { X, dom, g } = c;
  let v = X.nearest(p, (w) => dom[w] === ch && g.sdfMm[w] >= SNAP_SDF_MM, 40);
  if (v < 0) v = X.nearest(p, (w) => dom[w] === ch, 80);
  if (v < 0) throw new Error(`flowPaths: no blood voxels for chamber ${ch}`);
  return { pt: X.pos(v), vox: v };
}

/**
 * Where an AV stream crosses the valve plane: the centroid of the atrium↔ventricle blood contact faces inside the
 * annulus, projected onto the plane; the valve centre when the cavities do not touch (a ring slab, as on the stub).
 */
function orifice(c: Ctx, valve: ValveGeom, up: number, down: number): Vec3 {
  const { g, dom, X } = c;
  const [nx, ny, nz] = g.dims;
  const cn = valve.centerMm, n = valve.normal, r = valve.radiusMm;
  const half = Math.ceil((r + 3) / g.hMm);
  const ci = Math.round((cn[0] - g.originMm[0]) / g.hMm), cj = Math.round((cn[1] - g.originMm[1]) / g.hMm), ck = Math.round((cn[2] - g.originMm[2]) / g.hMm);
  const step = [1, nx, nx * ny];
  let sx = 0, sy = 0, sz = 0, cnt = 0;
  for (let k = Math.max(0, ck - half); k <= Math.min(nz - 1, ck + half); k++)
    for (let j = Math.max(0, cj - half); j <= Math.min(ny - 1, cj + half); j++)
      for (let i = Math.max(0, ci - half); i <= Math.min(nx - 1, ci + half); i++) {
        const v = i + nx * (j + ny * k);
        const dv = dom[v];
        if (dv !== up && dv !== down) continue;
        for (let a = 0; a < 3; a++) {
          if ((a === 0 && i === nx - 1) || (a === 1 && j === ny - 1) || (a === 2 && k === nz - 1)) continue;
          const dw = dom[v + step[a]];
          if (!((dv === up && dw === down) || (dv === down && dw === up))) continue;
          const p = X.pos(v);
          const m: Vec3 = [p[0] + (a === 0 ? g.hMm / 2 : 0), p[1] + (a === 1 ? g.hMm / 2 : 0), p[2] + (a === 2 ? g.hMm / 2 : 0)];
          const d = sub(m, cn), s = dot(d, n);
          if (Math.abs(s) > 6 || dot(d, d) - s * s > r * r) continue;
          sx += m[0];
          sy += m[1];
          sz += m[2];
          cnt++;
        }
      }
  if (!cnt) return cn;
  const m: Vec3 = [sx / cnt, sy / cnt, sz / cnt];
  return sub(m, scale(n, dot(sub(m, cn), n)));
}

/** Point on the valve-normal line through x0, `dir` = −1 upstream / +1 downstream, ≥ LEAD_MM away and inside `ch`. */
function lead(c: Ctx, x0: Vec3, n: Vec3, dir: 1 | -1, ch: number): Vox {
  const { g, dom } = c;
  for (let t = LEAD_MM; t <= LEAD_MAX_MM; t += g.hMm / 2) {
    const p = add(x0, scale(n, dir * t));
    const v = voxAt(g, p);
    if (v >= 0 && dom[v] === ch) return { pt: p, vox: v };
  }
  return snap(c, add(x0, scale(n, dir * LEAD_MM)), ch);
}

/** Straight run a → b sampled every ≤ spacing (a included, b excluded). */
function straight(a: Vec3, b: Vec3, spacing: number): Vec3[] {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / spacing));
  const out: Vec3[] = [];
  for (let s = 0; s < n; s++) out.push(add(a, scale(sub(b, a), s / n)));
  return out;
}

/** Leg between two domain voxels as voxel centres (straight fallback if the search fails). */
export function leg(c: Ctx, a: Vox, b: Vox, ch: number, side?: SidePlane): Vec3[] {
  const vox = c.search.path(a.vox, b.vox, ch, side);
  return vox.length ? vox.map((v) => c.X.pos(v)) : [a.pt, b.pt];
}

/** Smooths the free points (pinned ones stay), resamples at FLOW_STEP_MM and estimates the lumen radius. */
function finish(valve: ValveGeom, side: 'L' | 'R', legKind: 'in' | 'out', pts: Vec3[], pin: boolean[], g: VoxelGrid): FlowPath {
  let p = pts;
  const last = p.length - 1;
  for (let s = 0; s < SMOOTH_PASSES; s++) {
    const q = p;
    p = q.map((x, i) => (i === 0 || i === last || pin[i] ? x : scale(add(add(q[i - 1], x), q[i + 1]), 1 / 3)));
  }
  const res = resamplePolyline(p, FLOW_STEP_MM).pts.map((x) => Object.freeze([x[0], x[1], x[2]]) as Vec3);
  const radiusMm = res.map((x) => Math.max(FLOW_MIN_RADIUS_MM, Math.min(0.8 * sampleSdf(g, x), valve.radiusMm)));
  return Object.freeze({
    valve: valve.id, side, leg: legKind,
    pts: Object.freeze(res), radiusMm: Object.freeze(radiusMm), lengthMm: polylineArc(res).length,
  });
}

/** Inflow and outflow paths of one heart side. */
function buildSide(c: Ctx, av: ValveGeom, sl: ValveGeom, atrium: ChamberAxis, ventricle: ChamberAxis, side: 'L' | 'R'): [FlowPath, FlowPath] {
  const A = atrium.chamber, V = ventricle.chamber, h = c.g.hMm;
  const x0 = orifice(c, av, A, V);
  const preAV = lead(c, x0, av.normal, -1, A), postAV = lead(c, x0, av.normal, 1, V);
  const preSL = lead(c, sl.centerMm, sl.normal, -1, V);
  const stub = add(sl.centerMm, scale(sl.normal, FLOW_STUB_MM));
  const body = snap(c, add(atrium.centerMm, scale(atrium.axis, BODY_FRAC * atrium.lengthMm)), A);
  const apex = snap(c, add(ventricle.centerMm, scale(ventricle.axis, APEX_FRAC * ventricle.lengthMm)), V);

  // plane through the apex and the mid-point of the two valve runs, separating the AV side (+) from the outflow side
  const ax = normalize(sub(scale(add(postAV.pt, preSL.pt), 0.5), apex.pt));
  const d = sub(postAV.pt, preSL.pt);
  const s = normalize(sub(d, scale(ax, dot(d, ax))));

  const inPts: Vec3[] = [], inPin: boolean[] = [];
  const put = (pts: Vec3[], pins: boolean[], q: readonly Vec3[], pinned: boolean) => {
    for (const x of q) {
      pts.push(x);
      pins.push(pinned);
    }
  };
  put(inPts, inPin, leg(c, body, preAV, A).slice(0, -1), false);
  put(inPts, inPin, [...straight(preAV.pt, x0, h), ...straight(x0, postAV.pt, h), postAV.pt], true);
  put(inPts, inPin, leg(c, postAV, apex, V, { o: apex.pt, s, sign: 1 }).slice(1), false);

  const outPts: Vec3[] = [], outPin: boolean[] = [];
  put(outPts, outPin, leg(c, apex, preSL, V, { o: apex.pt, s, sign: -1 }).slice(0, -1), false);
  put(outPts, outPin, [...straight(preSL.pt, sl.centerMm, h), ...straight(sl.centerMm, stub, h), stub], true);

  return [finish(av, side, 'in', inPts, inPin, c.g), finish(sl, side, 'out', outPts, outPin, c.g)];
}

/** The four streamlines in VALVES order, uncached (see buildFlowPaths). Throws if a valve or chamber axis is missing. */
export function computeFlowPaths(geo: GeometryBundle, ctx?: FlowCtx): readonly FlowPath[] {
  const c = ctx ?? createFlowCtx(geo);
  const valve = (id: ValveId): ValveGeom => {
    const v = geo.valves.find((x) => x.id === id);
    if (!v) throw new Error(`flowPaths: missing valve ${id}`);
    return v;
  };
  const axis = (ch: Chamber): ChamberAxis => {
    const a = geo.chambers.find((x) => x.chamber === ch);
    if (!a) throw new Error(`flowPaths: missing chamber axis ${ch}`);
    return a;
  };
  const [mitral, aortic] = buildSide(c, valve('MITRAL'), valve('AORTIC'), axis(CHAMBER.LA), axis(CHAMBER.LV), 'L');
  const [tricuspid, pulmonary] = buildSide(c, valve('TRICUSPID'), valve('PULMONARY'), axis(CHAMBER.RA), axis(CHAMBER.RV), 'R');
  const byId: Record<ValveId, FlowPath> = { MITRAL: mitral, TRICUSPID: tricuspid, AORTIC: aortic, PULMONARY: pulmonary };
  return Object.freeze(VALVES.map((id) => byId[id]));
}

const cache = new Map<string, readonly FlowPath[]>();
const CACHE_MAX = 4;

/**
 * The four schematic streamlines in VALVES order (MITRAL, TRICUSPID, AORTIC, PULMONARY), local mm, in flow direction.
 * Pure and deterministic; cached per geometry (hash + grid shape — the stub keeps one hash across resolutions).
 */
export function buildFlowPaths(geo: GeometryBundle): readonly FlowPath[] {
  const key = `${geo.hash}|${geo.grid.dims.join('x')}|${geo.grid.hMm}`;
  let paths = cache.get(key);
  if (!paths) {
    paths = computeFlowPaths(geo);
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(key, paths);
  }
  return paths;
}
