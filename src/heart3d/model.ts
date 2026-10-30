/**
 * Pure geometry helpers of the 3D heart (no three.js): normals, region masks and outlines, wall thickening for
 * hypertrophy, tubes for the conduction system and markers, polyline arc fractions, the accessory-pathway bridge.
 * The three.js layer (view.ts) only uploads what these functions return.
 */
import { REGIONS, type RegionId } from '../core/regions';
import type { HeartAsset, HeartLabel, Vec3 } from './format';

export type Vec3Mut = [number, number, number];

export interface TubeData {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly indices: Uint32Array;
  /** per vertex: arc fraction (0 … 1) of its ring along the source polyline */
  readonly along: Float32Array;
}

const sub3 = (a: Vec3, b: Vec3): Vec3Mut => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add3 = (a: Vec3, b: Vec3): Vec3Mut => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale3 = (a: Vec3, s: number): Vec3Mut => [a[0] * s, a[1] * s, a[2] * s];
const dot3 = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a: Vec3, b: Vec3): Vec3Mut => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len3 = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const norm3 = (a: Vec3): Vec3Mut => {
  const l = len3(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const at = (P: ArrayLike<number>, i: number): Vec3Mut => [P[3 * i], P[3 * i + 1], P[3 * i + 2]];

export { add3, cross3, dot3, len3, norm3, scale3, sub3 };

// ------------------------------------------------------------------------------------------------ mesh

/** Area-weighted vertex normals of an indexed triangle mesh. */
export function computeNormals(pos: ArrayLike<number>, idx: ArrayLike<number>): Float32Array {
  const n = new Float32Array(pos.length);
  for (let t = 0; t < idx.length; t += 3) {
    const a = 3 * idx[t], b = 3 * idx[t + 1], c = 3 * idx[t + 2];
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const p of [a, b, c]) {
      n[p] += nx;
      n[p + 1] += ny;
      n[p + 2] += nz;
    }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l;
    n[i + 1] /= l;
    n[i + 2] /= l;
  }
  return n;
}

/** Vertex adjacency in CSR form (neighbours of v = list[offsets[v] … offsets[v+1])). */
export function vertexNeighbors(idx: ArrayLike<number>, vertexCount: number): { readonly offsets: Uint32Array; readonly list: Uint32Array } {
  const sets: Set<number>[] = Array.from({ length: vertexCount }, () => new Set<number>());
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    sets[a].add(b).add(c);
    sets[b].add(a).add(c);
    sets[c].add(a).add(b);
  }
  const offsets = new Uint32Array(vertexCount + 1);
  for (let v = 0; v < vertexCount; v++) offsets[v + 1] = offsets[v] + sets[v].size;
  const list = new Uint32Array(offsets[vertexCount]);
  for (let v = 0; v < vertexCount; v++) {
    let k = offsets[v];
    for (const w of sets[v]) list[k++] = w;
  }
  return { offsets, list };
}

/** Per-vertex mask (1 = vertex label in `ids`). */
export function labelMask(asset: HeartAsset, ids: readonly HeartLabel[]): Uint8Array {
  const want = new Set<number>();
  ids.forEach((id) => {
    const k = asset.labelIds.indexOf(id);
    if (k >= 0) want.add(k);
  });
  const out = new Uint8Array(asset.labels.length);
  for (let v = 0; v < out.length; v++) if (want.has(asset.labels[v])) out[v] = 1;
  return out;
}

/**
 * Thicken the wall where mask = 1: every vertex moves `mm` along its normal (epicardium outward, endocardium into the
 * cavity), with a smooth falloff over `passes` rings of neighbours so no step appears at the region border.
 */
export function inflate(
  pos: Float32Array,
  normals: Float32Array,
  neighbors: { readonly offsets: Uint32Array; readonly list: Uint32Array },
  mask: Uint8Array,
  mm: number,
  passes = 3,
): Float32Array {
  const V = mask.length;
  let w = Float32Array.from(mask);
  for (let p = 0; p < passes; p++) {
    const next = new Float32Array(V);
    for (let v = 0; v < V; v++) {
      if (mask[v]) {
        next[v] = 1;
        continue;
      }
      let s = 0;
      const a = neighbors.offsets[v], b = neighbors.offsets[v + 1];
      for (let k = a; k < b; k++) s += w[neighbors.list[k]];
      next[v] = b > a ? s / (b - a) : 0;
    }
    w = next;
  }
  const out = Float32Array.from(pos);
  for (let v = 0; v < V; v++) {
    if (!w[v]) continue;
    const d = mm * w[v];
    out[3 * v] += normals[3 * v] * d;
    out[3 * v + 1] += normals[3 * v + 1] * d;
    out[3 * v + 2] += normals[3 * v + 2] * d;
  }
  return out;
}

/**
 * Outline of a region on the surface: the edges between triangles inside the region (≥ 2 vertices in the mask) and
 * triangles outside, chained into polylines and lifted `lift` mm along the vertex normals.
 */
export function regionOutline(pos: ArrayLike<number>, normals: ArrayLike<number>, idx: ArrayLike<number>, mask: Uint8Array, lift = 0.6): Float32Array[] {
  const V = mask.length;
  const edges = new Map<number, [number, number]>(); // key → [trianglesIn, trianglesOut]
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    const inside = mask[a] + mask[b] + mask[c] >= 2;
    for (const [p, q] of [[a, b], [b, c], [c, a]] as const) {
      const key = Math.min(p, q) * V + Math.max(p, q);
      const e = edges.get(key) ?? [0, 0];
      e[inside ? 0 : 1]++;
      edges.set(key, e);
    }
  }
  const adj = new Map<number, number[]>();
  const bnd: [number, number][] = [];
  for (const [key, [nIn, nOut]] of edges) {
    if (!nIn || !nOut) continue;
    const p = Math.floor(key / V), q = key % V;
    const e = bnd.length;
    bnd.push([p, q]);
    for (const v of [p, q]) {
      const l = adj.get(v);
      if (l) l.push(e);
      else adj.set(v, [e]);
    }
  }
  const used = new Uint8Array(bnd.length);
  const lifted = (v: number): number[] => [pos[3 * v] + normals[3 * v] * lift, pos[3 * v + 1] + normals[3 * v + 1] * lift, pos[3 * v + 2] + normals[3 * v + 2] * lift];
  /** Follow unused boundary edges from `start`; stops at a dead end or when the loop closes back at `from`. */
  const walk = (start: number, from: number): number[] => {
    const chain: number[] = [];
    let v = start;
    for (;;) {
      const next = (adj.get(v) ?? []).find((e) => !used[e]);
      if (next === undefined) break;
      used[next] = 1;
      const [p, q] = bnd[next];
      v = p === v ? q : p;
      chain.push(v);
      if (v === from) break;
    }
    return chain;
  };
  const out: Float32Array[] = [];
  for (let e = 0; e < bnd.length; e++) {
    if (used[e]) continue;
    used[e] = 1;
    const [p, q] = bnd[e];
    const fwd = walk(q, p);
    const back = walk(p, q);
    const verts = [...back.reverse(), p, q, ...fwd];
    if (verts.length < 3) continue;
    const closed = verts[0] === verts[verts.length - 1];
    out.push(smoothPolyline(Float32Array.from(verts.flatMap(lifted)), 2, closed));
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ polylines

/** Moving-average smoothing (weights ¼ ½ ¼); open polylines keep their ends, closed ones (first = last point) wrap. */
export function smoothPolyline(points: Float32Array, passes = 1, closed = false): Float32Array {
  const n = points.length / 3;
  if (n < 3) return points;
  let p = points;
  for (let k = 0; k < passes; k++) {
    const q = Float32Array.from(p);
    const m = closed ? n - 1 : n; // closed: the last point duplicates the first
    for (let i = 0; i < m; i++) {
      if (!closed && (i === 0 || i === n - 1)) continue;
      const a = closed ? (i - 1 + m) % m : i - 1, b = closed ? (i + 1) % m : i + 1;
      for (let d = 0; d < 3; d++) q[3 * i + d] = 0.25 * p[3 * a + d] + 0.5 * p[3 * i + d] + 0.25 * p[3 * b + d];
    }
    if (closed) for (let d = 0; d < 3; d++) q[3 * (n - 1) + d] = q[d];
    p = q;
  }
  return p;
}

/** Cumulative arc length of a polyline normalised to [0, 1] (all zeros for a degenerate polyline). */
export function arcFractions(points: ArrayLike<number>): Float32Array {
  const n = points.length / 3;
  const out = new Float32Array(n);
  let s = 0;
  for (let i = 1; i < n; i++) {
    s += Math.hypot(points[3 * i] - points[3 * i - 3], points[3 * i + 1] - points[3 * i - 2], points[3 * i + 2] - points[3 * i - 1]);
    out[i] = s;
  }
  if (s > 0) for (let i = 1; i < n; i++) out[i] /= s;
  return out;
}

/** Point at arc fraction f ∈ [0, 1] along a polyline. */
export function pointAtFraction(points: ArrayLike<number>, fr: ArrayLike<number>, f: number): Vec3Mut {
  const n = fr.length;
  if (n === 0) return [0, 0, 0];
  if (f <= 0 || n === 1) return at(points, 0);
  if (f >= 1) return at(points, n - 1);
  let i = 1;
  while (i < n - 1 && fr[i] < f) i++;
  const a = fr[i - 1], b = fr[i];
  const t = b > a ? (f - a) / (b - a) : 0;
  const p = at(points, i - 1), q = at(points, i);
  return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
}

/** Total length (mm) of a polyline. */
export function polylineLength(points: ArrayLike<number>): number {
  let s = 0;
  for (let i = 3; i < points.length; i += 3) s += Math.hypot(points[i] - points[i - 3], points[i + 1] - points[i - 2], points[i + 2] - points[i - 1]);
  return s;
}

/** A tube of `radial` sides around a polyline (parallel-transport frames, open ends). */
export function buildTube(points: ArrayLike<number>, radius: number, radial = 6): TubeData {
  const n = points.length / 3;
  const fr = arcFractions(points);
  const positions = new Float32Array(n * radial * 3);
  const normals = new Float32Array(n * radial * 3);
  const along = new Float32Array(n * radial);
  let prevN: Vec3Mut | null = null;
  for (let i = 0; i < n; i++) {
    const p = at(points, i);
    const t = norm3(sub3(at(points, Math.min(n - 1, i + 1)), at(points, Math.max(0, i - 1))));
    let nn: Vec3Mut;
    if (prevN) nn = norm3(sub3(prevN, scale3(t, dot3(prevN, t))));
    else nn = norm3(cross3(t, Math.abs(t[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
    if (!Number.isFinite(nn[0]) || len3(nn) < 0.5) nn = norm3(cross3(t, Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [0, 0, 1]));
    prevN = nn;
    const b = cross3(t, nn);
    for (let k = 0; k < radial; k++) {
      const th = (2 * Math.PI * k) / radial;
      const c = Math.cos(th), s = Math.sin(th);
      const d: Vec3 = [nn[0] * c + b[0] * s, nn[1] * c + b[1] * s, nn[2] * c + b[2] * s];
      const o = 3 * (i * radial + k);
      positions[o] = p[0] + d[0] * radius;
      positions[o + 1] = p[1] + d[1] * radius;
      positions[o + 2] = p[2] + d[2] * radius;
      normals[o] = d[0];
      normals[o + 1] = d[1];
      normals[o + 2] = d[2];
      along[i * radial + k] = fr[i];
    }
  }
  const indices = new Uint32Array(Math.max(0, n - 1) * radial * 6);
  let w = 0;
  for (let i = 0; i + 1 < n; i++)
    for (let k = 0; k < radial; k++) {
      const a = i * radial + k, b = i * radial + ((k + 1) % radial), c = (i + 1) * radial + k, d = (i + 1) * radial + ((k + 1) % radial);
      indices[w++] = a;
      indices[w++] = c;
      indices[w++] = b;
      indices[w++] = b;
      indices[w++] = c;
      indices[w++] = d;
    }
  return { positions, normals, indices, along };
}

/** Concatenate tubes into one geometry. */
export function mergeTubes(list: readonly TubeData[]): TubeData {
  let nv = 0, ni = 0;
  for (const t of list) {
    nv += t.along.length;
    ni += t.indices.length;
  }
  const positions = new Float32Array(nv * 3), normals = new Float32Array(nv * 3), along = new Float32Array(nv), indices = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const t of list) {
    positions.set(t.positions, ov * 3);
    normals.set(t.normals, ov * 3);
    along.set(t.along, ov);
    for (let i = 0; i < t.indices.length; i++) indices[oi + i] = t.indices[i] + ov;
    ov += t.along.length;
    oi += t.indices.length;
  }
  return { positions, normals, indices, along };
}

// ------------------------------------------------------------------------------------------------ regions

export interface Anchor {
  readonly p: Vec3;
  readonly n: Vec3;
  /** outward direction of the region seen from the heart's centre (for orienting the camera toward it) */
  readonly out: Vec3;
}

/**
 * Label / marker anchor of every mesh label: the most outward vertex of the region near the ray from the heart's centre
 * through the region centroid, among vertices whose normal faces that way (so it lies on the epicardium for free
 * walls and atria, not on the endocardium). Falls back to the vertex nearest the centroid.
 */
export function regionAnchors(asset: HeartAsset, normals: ArrayLike<number>): Partial<Record<HeartLabel, Anchor>> {
  const cent = labelCentroids(asset);
  const P = asset.positions, L = asset.labels;
  let c: Vec3Mut = [0, 0, 0], nc = 0;
  for (let v = 0; v < L.length; v++) {
    const id = asset.labelIds[L[v]];
    if (id === 'aorta' || id === 'pulmonary-trunk') continue;
    c = add3(c, at(P, v));
    nc++;
  }
  c = scale3(c, 1 / Math.max(1, nc));
  const out: Partial<Record<HeartLabel, Anchor>> = {};
  asset.labelIds.forEach((id, k) => {
    const m = cent[id];
    if (!m) return;
    const d = norm3(sub3(m, c));
    let best = -1, bs = -Infinity, near = -1, nd = Infinity;
    for (let v = 0; v < L.length; v++) {
      if (L[v] !== k) continue;
      const p = at(P, v);
      const r = sub3(p, m);
      const dm = len3(r);
      if (dm < nd) {
        nd = dm;
        near = v;
      }
      if (dot3(at(normals, v), d) < 0.35) continue;
      const along = dot3(sub3(p, c), d);
      const radial = len3(sub3(r, scale3(d, dot3(r, d))));
      const score = along - 0.6 * radial;
      if (score > bs) {
        bs = score;
        best = v;
      }
    }
    const v = best >= 0 ? best : near;
    out[id] = { p: at(P, v), n: norm3(at(normals, v)), out: d };
  });
  return out;
}

/** Centroid of the vertices of each label (absent labels are omitted). */
export function labelCentroids(asset: HeartAsset): Partial<Record<HeartLabel, Vec3>> {
  const acc = asset.labelIds.map(() => [0, 0, 0, 0]);
  for (let v = 0; v < asset.labels.length; v++) {
    const a = acc[asset.labels[v]];
    a[0] += asset.positions[3 * v];
    a[1] += asset.positions[3 * v + 1];
    a[2] += asset.positions[3 * v + 2];
    a[3]++;
  }
  const out: Partial<Record<HeartLabel, Vec3>> = {};
  asset.labelIds.forEach((id, k) => {
    const a = acc[k];
    if (a[3]) out[id] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]];
  });
  return out;
}

const ATRIA: readonly HeartLabel[] = ['ra', 'la'];

/**
 * Accessory pathway drawn as a bridge across the AV groove, on the outside of the heart: from the epicardial vertex of
 * `region` closest to the other level (atria for a ventricular region, ventricles for an atrial one) to that closest
 * outward-facing vertex, bulging outward by `bulgeMm`. Outward = from the heart's centre toward the region centroid.
 * The bridge spans `spanMm` across the groove along the long axis (atria lie toward the base), landing on outward-facing
 * vertices of both levels. Null when the region has no vertices.
 */
export function pathwayBridge(asset: HeartAsset, normals: ArrayLike<number>, region: RegionId, bulgeMm = 3, spanMm = 16, steps = 12): Float32Array | null {
  const k = asset.labelIds.indexOf(region);
  if (k < 0) return null;
  const isAtrial = REGIONS[region].group === 'atria';
  const other = new Set<number>();
  asset.labelIds.forEach((id, i) => {
    if (id === 'aorta' || id === 'pulmonary-trunk') return;
    if (ATRIA.includes(id) !== isAtrial) other.add(i);
  });
  const P = asset.positions, L = asset.labels;
  const m = labelCentroids(asset)[region];
  if (!m) return null;
  let c: Vec3Mut = [0, 0, 0], nc = 0;
  for (let v = 0; v < L.length; v++) {
    if (L[v] === k || other.has(L[v])) {
      c = add3(c, at(P, v));
      nc++;
    }
  }
  const out = norm3(sub3(m, scale3(c, 1 / Math.max(1, nc))));
  const collect = (strict: boolean) => {
    const mine: number[] = [], theirs: number[] = [];
    for (let v = 0; v < L.length; v++) {
      const f = dot3(at(normals, v), out);
      if (L[v] === k && (!strict || f > 0.25)) mine.push(v);
      else if (other.has(L[v]) && (!strict || f > 0)) theirs.push(v);
    }
    return { mine, theirs };
  };
  let cand = collect(true);
  if (!cand.mine.length || !cand.theirs.length) cand = collect(false);
  if (!cand.mine.length || !cand.theirs.length) return null;
  let best = Infinity, bv = -1, bw = -1;
  for (const v of cand.mine) {
    const x = P[3 * v], y = P[3 * v + 1], z = P[3 * v + 2];
    for (const w of cand.theirs) {
      const d = (P[3 * w] - x) ** 2 + (P[3 * w + 1] - y) ** 2 + (P[3 * w + 2] - z) ** 2;
      if (d < best) {
        best = d;
        bv = v;
        bw = w;
      }
    }
  }
  // groove point, then one landing point on each level, half a span toward the base (atria) / apex (ventricles)
  const g = scale3(add3(at(P, bw), at(P, bv)), 0.5);
  const u = norm3(asset.header.frame.longAxis);
  const atrialSet = isAtrial ? cand.mine : cand.theirs;
  const ventSet = isAtrial ? cand.theirs : cand.mine;
  const nearest = (set: readonly number[], q: Vec3): Vec3Mut => {
    let bi = set[0], bd = Infinity;
    for (const v of set) {
      const d = (P[3 * v] - q[0]) ** 2 + (P[3 * v + 1] - q[1]) ** 2 + (P[3 * v + 2] - q[2]) ** 2;
      if (d < bd) {
        bd = d;
        bi = v;
      }
    }
    return at(P, bi);
  };
  const a = nearest(atrialSet, add3(g, scale3(u, spanMm / 2)));
  const b = nearest(ventSet, add3(g, scale3(u, -spanMm / 2)));
  const mid = add3(scale3(add3(a, b), 0.5), scale3(out, bulgeMm));
  const pts: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const q = add3(add3(scale3(a, (1 - t) ** 2), scale3(mid, 2 * t * (1 - t))), scale3(b, t * t));
    pts.push(q[0], q[1], q[2]);
  }
  return Float32Array.from(pts);
}

/** Ring (torus-like) polyline of radius r around point p in the plane ⊥ n — the static ectopic-focus marker. */
export function ringPoints(p: Vec3, n: Vec3, r: number, segments = 32): Float32Array {
  let nn = norm3(n);
  if (!(len3(n) > 0.1)) nn = [0, 0, 1];
  const e1 = norm3(cross3(nn, Math.abs(nn[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
  const e2 = cross3(nn, e1);
  const out = new Float32Array((segments + 1) * 3);
  for (let k = 0; k <= segments; k++) {
    const th = (2 * Math.PI * k) / segments;
    const c = Math.cos(th) * r, s = Math.sin(th) * r;
    out[3 * k] = p[0] + e1[0] * c + e2[0] * s;
    out[3 * k + 1] = p[1] + e1[1] * c + e2[1] * s;
    out[3 * k + 2] = p[2] + e1[2] * c + e2[2] * s;
  }
  return out;
}

/** Bounding sphere (centre of the bbox, radius to the farthest vertex) of a position array. */
export function boundingSphere(pos: ArrayLike<number>): { readonly center: Vec3; readonly radius: number } {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3)
    for (let d = 0; d < 3; d++) {
      mn[d] = Math.min(mn[d], pos[i + d]);
      mx[d] = Math.max(mx[d], pos[i + d]);
    }
  const c: Vec3 = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
  let r = 0;
  for (let i = 0; i < pos.length; i += 3) r = Math.max(r, Math.hypot(pos[i] - c[0], pos[i + 1] - c[1], pos[i + 2] - c[2]));
  return { center: c, radius: r };
}
