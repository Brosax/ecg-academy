/**
 * Activation schedules.
 *
 * Ventricles: a fastest-route (Dijkstra) pass over a graph whose nodes are the region faces (IN = endocardial side,
 * OUT = epicardial side; septum: IN = LV side, OUT = RV side). Edges: transmural (wall / vT), along the LV endocardium,
 * along the RV endocardium (septal RV side + RV free-wall inner surface), along the epicardium, and diagonal links;
 * adjacency comes from the geometry (faces whose patches touch). Sources: Purkinje–muscle junctions (PMJ) fed by the
 * bundle branches / fascicles (Durrer 1970 timing), plus optional extra sources (ectopic focus, accessory pathway).
 * Output per face: an activation window [t0, t1] = the time the front needs to sweep that face.
 *
 * Atria: the same idea on a 7-node graph; each region also gets the local wavefront direction (from where the front
 * came from), which orients its dipole.
 */
import type { Heart } from './geometry.ts';
import { FACE } from './geometry.ts';
import type { V3 } from './vec.ts';
import { norm, sub, unit } from './vec.ts';

export const BRANCHES = ['LSF', 'LAF', 'LPF', 'RBB'] as const;
export type Branch = (typeof BRANCHES)[number];

export interface Pmj { face: string; branch: Branch; t: number; h?: number }

/** Normal PMJ timing (ms after the earliest LV septal breakthrough), Durrer-inspired. face = '<region>:IN|OUT'. */
export const NORMAL_PMJ: Pmj[] = [
  // Durrer: three LV endocardial sites at 0–5 ms (central left septum, high anterior paraseptal, posterior paraseptal
  // ~1/3 from the apex), confluent by 15–20 ms; the lateral/posterior free wall is reached last by the Purkinje
  // network and its thick wall keeps fronts alive to 50–60 ms; the basal posterolateral LV has no Purkinje exit.
  { face: 'm_antsep:IN', branch: 'LSF', t: 0, h: 12.9 },
  { face: 'm_infsep:IN', branch: 'LSF', t: 3.9, h: 13.2 },
  { face: 'a_sep:IN', branch: 'LSF', t: 0, h: 16 },
  { face: 'b_antsep:IN', branch: 'LSF', t: 28, h: 10.9 },
  { face: 'b_infsep:IN', branch: 'LPF', t: 8.4, h: 8.3 },
  { face: 'm_ant:IN', branch: 'LAF', t: 6, h: 15.9 },
  { face: 'a_ant:IN', branch: 'LAF', t: 5.5, h: 12.8 },
  { face: 'b_ant:IN', branch: 'LAF', t: 4.4, h: 9.8 },
  { face: 'm_inf:IN', branch: 'LPF', t: 4.2, h: 8.6 },
  { face: 'a_inf:IN', branch: 'LPF', t: 17.2, h: 11.8 },
  { face: 'b_inf:IN', branch: 'LPF', t: 17.1, h: 13.4 },
  { face: 'apex:IN', branch: 'LPF', t: 23.8, h: 15.9 },
  { face: 'a_lat:IN', branch: 'LAF', t: 17.0, h: 5 },
  { face: 'm_antlat:IN', branch: 'LAF', t: 11.6, h: 10.5 },
  { face: 'm_inflat:IN', branch: 'LPF', t: 15.6, h: 6.7 },
  { face: 'b_antlat:IN', branch: 'LAF', t: 18.4, h: 16 },
  // right bundle (moderator band → anterior papillary muscle) reaches the RV 5–10 ms after the LV starts; the RV
  // endocardium then spreads apex → base over ~15 ms
  { face: 'rv_apex:IN', branch: 'RBB', t: 17.4, h: 16 },
  { face: 'a_sep:OUT', branch: 'RBB', t: 28, h: 10.1 },
  { face: 'rv_free:IN', branch: 'RBB', t: 12.8, h: 14.5 },
  { face: 'rv_ant:IN', branch: 'RBB', t: 24.4, h: 12 },
  { face: 'rv_inf:IN', branch: 'RBB', t: 22.5, h: 12 },
  { face: 'm_antsep:OUT', branch: 'RBB', t: 5, h: 10.9 },
  { face: 'm_infsep:OUT', branch: 'RBB', t: 15.1, h: 8.9 },
  { face: 'b_antsep:OUT', branch: 'RBB', t: 24.5, h: 13.5 },
  { face: 'b_infsep:OUT', branch: 'RBB', t: 22.7, h: 5.2 },
  // b_inflat and rvot: no Purkinje exit — reached last through muscle
];

/** Normal regional wall thickness used for transmural conduction time (cm). */
export const NORMAL_WALL: Record<string, number> = {
  b_inflat: 0.98, m_inflat: 1.35, b_antlat: 1.5, m_antlat: 1.41, a_lat: 1.11,
  b_inf: 1.5, m_inf: 1.5, a_inf: 0.73, b_ant: 0.72, m_ant: 0.77, a_ant: 1.31, apex: 0.59,
  // RV: transmural activation crosses only the thin compact layer (~2.5 mm); the trabecular layer is Purkinje-invested
  rv_apex: 0.24, rv_free: 0.24, rv_ant: 0.24, rv_inf: 0.24, rvot: 0.24,
};

export interface VConduction {
  vT: number; // transmural (cm/ms)
  vEndo: number; // along the LV endocardium (cm/ms; subendocardial Purkinje-aided)
  vRvEndo: number; // along the RV endocardium incl. the RV septal surface (cm/ms)
  vEpi: number; // along epicardium (cm/ms)
  hP: number; // half-width of a Purkinje-fed window (ms)
  hMin: number;
  /** Minimum half-width of a Purkinje-fed window (ms): a Purkinje exit activates a patch of tissue, not a point. */
  hPmin: number;
  /** Transmural dispersion: a front crossing the wall arrives over a spread of ±tmDisp·transit time. */
  tmDisp: number;
  /** Half-width of a muscle-propagated window as a fraction of the edge travel time (front sweeping the region). */
  muscleSpread: number;
  /** A face reached through muscle is swept over at least sweepK × radius / v on each side of its centroid time. */
  sweepK: number;
  pmj: Pmj[];
  blocked: Partial<Record<Branch, boolean>>;
  branchDelay: Partial<Record<Branch, number>>;
  pmjScale: number; // stretch of PMJ times (His–Purkinje slowing)
  /** Extra sources: ectopic focus / accessory-pathway insertion (time relative to the beat reference). */
  extra: { face: string; t: number; h: number; at?: 'centre' | 'base' | 'apex' }[];
  /** Per-region conduction slowing factor (velocity multiplier) e.g. scar border, hypertrophy. */
  regionSpeed: Record<string, number>;
  /**
   * Per-region transmural velocity factor (only the wall crossing, e.g. slow transverse conduction across the septum
   * when it is entered from one side by muscle); spread along the surfaces is unaffected.
   */
  tmSpeed: Record<string, number>;
  /** Per-region wall-thickness override (cm). */
  wall: Record<string, number>;
  /** Velocity factor across the RV free wall ↔ LV free wall junctions (interventricular grooves: fat, vessels). */
  junction: number;
  /**
   * Front dispersion inside a swept face: the activation window of the sweep bin at fraction u is widened by
   * (1 + sweepDisp·u), so a front that crosses a whole face reaches its far boundary over a spread of times (0 = off).
   */
  sweepDisp: number;
}

export const NORMAL_VCOND: VConduction = {
  vT: 0.046,
  vEndo: 0.09,
  vRvEndo: 0.075,
  vEpi: 0.05,
  hP: 10,
  hMin: 5,
  hPmin: 8,
  tmDisp: 0.209,
  muscleSpread: 0.5,
  sweepK: 1.0,
  pmj: NORMAL_PMJ,
  blocked: {},
  branchDelay: {},
  pmjScale: 1,
  extra: [],
  regionSpeed: {},
  tmSpeed: {},
  wall: NORMAL_WALL,
  junction: 0.5,
  sweepDisp: 0,
};

/**
 * Activation window of one face. via: how the front arrived — 'P' Purkinje exit (many simultaneous breakthroughs →
 * the face activates as a whole), 'E' extra source (ectopic focus / accessory-pathway insertion: spreads radially from the
 * face centre), 'T' transmural from the partner face (inherits the partner's in-plane sweep), 'S' along the wall from the
 * neighbouring face `pred` (the front sweeps the face away from that neighbour).
 */
export interface FaceWindow { t0: number; t1: number; T: number; viaPurkinje: boolean; via: 'P' | 'E' | 'T' | 'S'; pred: number; at?: 'centre' | 'base' | 'apex' }

interface Edge { to: number; len: number; type: 'T' | 'IN' | 'RVIN' | 'EPI' | 'X' }


/** nodes: face ids; adj: symmetric edges; radius: RMS distance of the face's patches from its centroid (cm). */
export interface VGraph { nodes: string[]; adj: Edge[][]; radius: Float64Array }

/** Surface class of a face: LV endocardium, RV endocardium (septal RV side + RV inner), or epicardium. */
function surf(h: Heart, region: number, face: number): 'IN' | 'RVIN' | 'EPI' {
  const k = h.vregions[region].kind;
  if (k === 'SEPT') return face === FACE.IN ? 'IN' : 'RVIN';
  if (k === 'RV') return face === FACE.IN ? 'RVIN' : 'EPI';
  return face === FACE.IN ? 'IN' : 'EPI';
}

export function buildVGraph(h: Heart): VGraph {
  const R = h.vregions.length;
  const nodes: string[] = [];
  for (let k = 0; k < R; k++) nodes.push(`${h.vregions[k].id}:IN`, `${h.vregions[k].id}:OUT`);
  const adj: Edge[][] = nodes.map(() => []);
  // patch lists per face
  const pts: V3[][] = nodes.map(() => []);
  for (const q of h.patches) if (q.face !== FACE.RIM) pts[q.region * 2 + q.face].push(q.c);
  const cent = (n: number): V3 => (n % 2 === 0 ? h.vregions[n >> 1].cIn : h.vregions[n >> 1].cOut);
  const thr = 0.75;
  // bounding spheres (centroid of the patch centres + max distance) to skip far-apart face pairs
  const bc: V3[] = pts.map((P) => { const c: V3 = [0, 0, 0]; for (const p of P) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; } const k = Math.max(1, P.length); return [c[0] / k, c[1] / k, c[2] / k]; });
  const br = pts.map((P, a) => { let m = 0; for (const p of P) m = Math.max(m, norm(sub(p, bc[a]))); return m; });
  for (let a = 0; a < nodes.length; a++) {
    for (let b = a + 1; b < nodes.length; b++) {
      const ra = a >> 1, rb = b >> 1;
      if (ra === rb) {
        adj[a].push({ to: b, len: h.vregions[ra].wall, type: 'T' });
        adj[b].push({ to: a, len: h.vregions[ra].wall, type: 'T' });
        continue;
      }
      if (norm(sub(bc[a], bc[b])) > br[a] + br[b] + thr) continue;
      let dmin = Infinity;
      const A = pts[a], B = pts[b];
      for (let i = 0; i < A.length && dmin > thr; i += 1) {
        for (let j = 0; j < B.length; j += 1) {
          const dx = A[i][0] - B[j][0], dy = A[i][1] - B[j][1], dz = A[i][2] - B[j][2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < dmin * dmin) dmin = Math.sqrt(d2);
          if (dmin <= thr) break;
        }
      }
      if (dmin > thr) continue;
      const sa = surf(h, ra, a % 2), sb = surf(h, rb, b % 2);
      const type: Edge['type'] = sa === sb ? sa : 'X';
      const len = norm(sub(cent(a), cent(b)));
      adj[a].push({ to: b, len, type });
      adj[b].push({ to: a, len, type });
    }
  }
  const radius = new Float64Array(nodes.length);
  for (let a = 0; a < nodes.length; a++) {
    const c0 = cent(a);
    let s2 = 0;
    for (const p of pts[a]) s2 += (p[0] - c0[0]) ** 2 + (p[1] - c0[1]) ** 2 + (p[2] - c0[2]) ** 2;
    radius[a] = Math.sqrt(s2 / Math.max(1, pts[a].length));
  }
  return { nodes, adj, radius };
}

/**
 * Ventricular activation for one beat. Times are relative to the beat reference (His activation for conducted beats,
 * focus firing for ectopic beats). Returns one window per face node (index = region*2 + face).
 */
export function vActivation(h: Heart, g: VGraph, c: VConduction): FaceWindow[] {
  const N = g.nodes.length;
  const idx: Record<string, number> = {};
  g.nodes.forEach((n, i) => (idx[n] = i));
  type Cand = { T: number; h: number; P: boolean; at?: 'centre' | 'base' | 'apex' };
  const src: Cand[][] = g.nodes.map(() => []);
  for (const p of c.pmj) {
    if (c.blocked[p.branch]) continue;
    const i = idx[p.face];
    if (i === undefined) continue;
    const hp = Math.max(c.hPmin, p.h ?? c.hP);
    src[i].push({ T: p.t * c.pmjScale + (c.branchDelay[p.branch] ?? 0) + hp, h: hp, P: true });
  }
  for (const e of c.extra) {
    const i = idx[e.face];
    if (i !== undefined) src[i].push({ T: e.t + e.h, h: e.h, P: false, at: e.at });
  }
  const speed = (n: number) => c.regionSpeed[h.vregions[n >> 1].id] ?? 1;
  const tmSp = (n: number) => c.tmSpeed[h.vregions[n >> 1].id] ?? 1;
  const wallOf = (n: number) => c.wall[h.vregions[n >> 1].id] ?? h.vregions[n >> 1].wall;
  const T = new Float64Array(N).fill(Infinity);
  const H = new Float64Array(N).fill(c.hMin);
  const P = new Uint8Array(N);
  const via: ('P' | 'E' | 'T' | 'S')[] = new Array(N).fill('S');
  const pred = new Int32Array(N).fill(-1);
  const atArr: ('centre' | 'base' | 'apex' | undefined)[] = new Array(N).fill(undefined);
  const done = new Uint8Array(N);
  for (let i = 0; i < N; i++) for (const s of src[i]) if (s.T < T[i]) { T[i] = s.T; H[i] = s.h; P[i] = s.P ? 1 : 0; via[i] = s.P ? 'P' : 'E'; atArr[i] = s.at; }
  // RV side = RV faces + the RV (OUT) face of the septum; junction = RV side ↔ LV free wall (interventricular grooves)
  const rvSide = (n: number) => h.vregions[n >> 1].kind === 'RV' || (h.vregions[n >> 1].kind === 'SEPT' && (n & 1) === 1);
  const lvFree = (n: number) => h.vregions[n >> 1].kind === 'LV';
  const edgeTime = (from: number, e: Edge): number => {
    let sp = Math.min(speed(from), speed(e.to));
    if ((rvSide(from) && lvFree(e.to)) || (lvFree(from) && rvSide(e.to))) sp *= c.junction;
    switch (e.type) {
      case 'T': return wallOf(from) / (c.vT * sp * tmSp(from));
      case 'IN': return e.len / (c.vEndo * sp);
      case 'RVIN': return e.len / (c.vRvEndo * sp);
      case 'EPI': return e.len / (c.vEpi * sp);
      default: return e.len / (c.vT * 1.4 * sp);
    }
  };
  // half-width of the window of a face entered along the wall: the front needs radius / v to cross half the face
  const sweepH = (to: number, dt: number, e: Edge): number => {
    const v = e.len / Math.max(1e-6, dt);
    return Math.max(c.hMin, c.muscleSpread * dt, (c.sweepK * g.radius[to]) / v);
  };
  for (;;) {
    let u = -1, best = Infinity;
    for (let i = 0; i < N; i++) if (!done[i] && T[i] < best) { best = T[i]; u = i; }
    if (u < 0) break;
    done[u] = 1;
    for (const e of g.adj[u]) {
      const dt = edgeTime(u, e);
      const t = T[u] + dt;
      if (t < T[e.to]) {
        T[e.to] = t;
        H[e.to] = e.type === 'T' ? H[u] + c.tmDisp * dt : sweepH(e.to, dt, e);
        P[e.to] = 0;
        via[e.to] = e.type === 'T' ? 'T' : 'S';
        pred[e.to] = u;
      }
    }
  }
  // windows: earliest start / earliest end over all candidates (Purkinje + every incoming edge)
  const out: FaceWindow[] = [];
  for (let i = 0; i < N; i++) {
    let t0 = T[i] - H[i], t1 = T[i] + H[i];
    for (const s of src[i]) { t0 = Math.min(t0, s.T - s.h); t1 = Math.min(t1, s.T + s.h); }
    for (const e of g.adj[i]) {
      // incoming edge from e.to (graph is symmetric)
      const back = g.adj[e.to].find((x) => x.to === i);
      if (!back || !isFinite(T[e.to])) continue;
      const dt = edgeTime(e.to, back);
      const hh = back.type === 'T' ? H[e.to] + c.tmDisp * dt : sweepH(i, dt, back);
      t0 = Math.min(t0, T[e.to] + dt - hh);
      t1 = Math.min(t1, T[e.to] + dt + hh);
    }
    if (t1 < t0 + 2 * c.hMin) t1 = t0 + 2 * c.hMin;
    out.push({ t0, t1, T: (t0 + t1) / 2, viaPurkinje: P[i] === 1, via: via[i], pred: pred[i], at: via[i] === 'E' ? atArr[i] : undefined });
  }
  // transmural consistency: within one region the wall is crossed at vT, so the face activated second lags the first by
  // at least the transmural time (a front sweeping along a wall is slanted across it); the lagging face then shares the
  // leading face's in-plane sweep. Faces with their own Purkinje exits are left alone.
  for (let k = 0; k < N / 2; k++) {
    const a = 2 * k, b = 2 * k + 1;
    const lead = out[a].T <= out[b].T ? a : b, trail = lead === a ? b : a;
    if (out[trail].via === 'P') continue;
    const tm = wallOf(a) / (c.vT * speed(a) * tmSp(a));
    const t0 = out[lead].t0 + (1 - c.tmDisp) * tm;
    if (out[trail].t0 >= t0) continue;
    const t1 = Math.max(out[trail].t1, out[lead].t1 + (1 + c.tmDisp) * tm);
    out[trail] = { t0, t1, T: (t0 + t1) / 2, viaPurkinje: false, via: 'T', pred: lead };
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------- atria

export interface AEdge { a: string; b: string; v: number }

export const ATRIAL_EDGES: AEdge[] = [
  { a: 'sa', b: 'ra_lat', v: 0.1 },
  { a: 'sa', b: 'bachmann', v: 0.16 },
  { a: 'sa', b: 'ra_sep', v: 0.09 },
  { a: 'ra_lat', b: 'ra_cti', v: 0.09 },
  { a: 'ra_cti', b: 'ra_sep', v: 0.06 },
  { a: 'ra_sep', b: 'la_post', v: 0.08 },
  { a: 'bachmann', b: 'la_ant', v: 0.1 },
  { a: 'la_ant', b: 'la_post', v: 0.08 },
];

export interface AWindow { region: number; T: number; h: number; d: V3; m: number }

/**
 * Atrial activation from a source region (sinus / ectopic atrial). v scales all atrial velocities.
 * Direction of each region = from the centroid of the region that activated it (source: `dir0`).
 */
export function aActivation(h: Heart, source: string, dir0: V3, vScale = 1, dirOverride: Record<string, V3> = {}): AWindow[] {
  const ids = h.aregions.map((a) => a.id);
  const n = ids.length;
  const ix: Record<string, number> = {};
  ids.forEach((id, i) => (ix[id] = i));
  const T = new Float64Array(n).fill(Infinity);
  const pred = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  const v = 0.09 * vScale;
  const s = ix[source];
  T[s] = h.aregions[s].extent / (2 * v);
  for (;;) {
    let u = -1, best = Infinity;
    for (let i = 0; i < n; i++) if (!done[i] && T[i] < best) { best = T[i]; u = i; }
    if (u < 0) break;
    done[u] = 1;
    for (const e of ATRIAL_EDGES) {
      let w = -1;
      if (e.a === ids[u]) w = ix[e.b];
      else if (e.b === ids[u]) w = ix[e.a];
      if (w < 0) continue;
      const t = T[u] + norm(sub(h.aregions[w].c, h.aregions[u].c)) / (e.v * vScale);
      if (t < T[w]) { T[w] = t; pred[w] = u; }
    }
  }
  return ids.map((id, i) => {
    // the front sweeps the region over its extent; the window also covers the run-in from the predecessor so that
    // consecutive regions overlap (one continuous front, one smooth P wave)
    let hh = h.aregions[i].extent / (2 * v);
    if (pred[i] >= 0) hh = Math.max(hh, 0.8 * (T[i] - T[pred[i]]));
    const key = pred[i] >= 0 ? `${ids[pred[i]]}>${id}` : id;
    const d = dirOverride[key] ?? (pred[i] < 0 ? unit(dir0) : unit(sub(h.aregions[i].c, h.aregions[pred[i]].c)));
    return { region: i, T: T[i], h: hh, d: unit(d), m: h.aregions[i].m };
  });
}
