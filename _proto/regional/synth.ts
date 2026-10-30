/**
 * Regional-dipole 12-lead ECG synthesiser (Architecture A).
 *
 * Source: 22 ventricular regions (AHA 17 LV segments + 5 RV), each a pair of double-layer faces (IN = endocardial / LV
 * septal side, OUT = epicardial / RV septal side) with geometry-derived patches, plus 7 atrial regions carrying
 * wavefront dipoles.
 *
 * Ventricular region dipole:  p_k(t) = −g · Σ_patches∈k  a_p · s_p(t)
 * where s_p is the normalised transmembrane potential of the patch (0 rest … 1 plateau). Inside one face every patch has
 * the same action potential, only shifted in time by where it lies along the face's sweep direction:
 *   - Purkinje-fed faces activate as a whole (many simultaneous breakthroughs) → one window [t0, t1];
 *   - faces reached through muscle are swept away from the neighbour the front came from (distance-ordered bins);
 *   - faces reached from an ectopic focus / accessory-pathway insertion are swept radially from the focus;
 *   - faces reached transmurally inherit the in-plane sweep of their partner face.
 * Because each region's faces are pieces of one closed surface, a region that is uniformly active contributes only its
 * boundary with resting neighbours: during activation this is exactly "local wavefront direction × envelope" (front area
 * = wall thickness × front length), and during the plateau/repolarisation it is the repolarisation-gradient dipole. A
 * uniform state of the whole heart gives zero (isoelectric ST) by construction.
 * Atrial region dipole: p_j(t) = g_A · m_j · d_j · (s_entry(t) − s_exit(t)).
 * Leads: electrode potentials φ_e = Σ_patches ℓ_e(c_p)·a_p · s_p(t) (+ atrial terms) from one lead field (leadfield.ts);
 * the 12 leads are formed only from φ_RA, φ_LA, φ_LL, φ_V1..V6 (Einthoven / Goldberger / Wilson).
 */
import type { Heart, HeartParams } from './geometry.ts';
import { buildHeart, DEFAULT_HEART, FACE } from './geometry.ts';
import type { LeadName } from './leadfield.ts';
import { buildLeadField, formLeads, ELECTRODES, LEADS } from './leadfield.ts';
import type { AWindow, FaceWindow, VConduction } from './conduction.ts';
import { aActivation, buildVGraph, NORMAL_VCOND, vActivation } from './conduction.ts';
import type { ApParams } from './membrane.ts';
import { apTauEff, apValue, apEnd } from './membrane.ts';
import type { AtrialParams, Condition, FlutterCircuit, VRep } from './model.ts';
import { baseApd, LEADSYS, NORMAL_ATRIA, NORMAL_VREP, TYPICAL_FLUTTER } from './model.ts';
import { CONDITIONS } from './conditions.ts';
import type { V3 } from './vec.ts';
import { dot, gauss, randUnit, rng, unit, norm, sub, smooth01 } from './vec.ts';

export interface Beat { pOnMs: number | null; qrsOnMs: number; qrsOffMs: number; tOffMs: number }
export interface Truth {
  hrBpm: number;
  prMs: number | null;
  qrsMs: number;
  qtMs: number;
  qrsAxisDeg: number;
  rhythm: string;
  beats: Beat[];
}
export interface Result {
  leads: Record<LeadName, Float32Array>;
  truth: Truth;
  regions: { names: string[]; activityAt(tMs: number): Float32Array };
}

const NE = ELECTRODES.length;

// --------------------------------------------------------------------------------------------- cached heart + weights

interface FacePatches {
  /** Patch centroids (x,y,z interleaved). */
  c: Float64Array;
  /** Closure-corrected electrode weights ℓ_e(c_p)·a_p, NE per patch. */
  w: Float64Array;
  /** Truth weight of the patch (its area): activation / repolarisation fractions for QRS offset and T end. */
  vol: Float64Array;
  /** Long-axis position of the patch relative to the face centroid (same units as region z: 0 apex … 1 base). */
  dz: Float64Array;
  n: number;
  centroid: V3;
}

interface Prepared {
  heart: Heart;
  faces: FacePatches[];
  /** Face-summed weights wV[e][f] (for dev tools). */
  wV: Float64Array[];
  /** Atrial lead vectors per electrode and region. */
  lA: V3[][];
  /** The lead field (for atrial sub-sources that sit between region centroids, e.g. a re-entrant front). */
  lf: ReturnType<typeof buildLeadField>;
  graph: ReturnType<typeof buildVGraph>;
}
const cache = new Map<string, Prepared>();

export function prepare(hp: HeartParams): Prepared {
  const key = JSON.stringify(hp) + LEADSYS.beta;
  const hit = cache.get(key);
  if (hit) return hit;
  const heart = buildHeart(hp);
  const lf = buildLeadField(LEADSYS.beta);
  const F = heart.vregions.length * 2;
  // patch lists per face (rim patches belong half to each face of their region)
  const lists: { c: V3; a: V3; k: number }[][] = Array.from({ length: F }, () => []);
  for (const q of heart.patches) {
    if (q.face === FACE.RIM) {
      const half: V3 = [q.a[0] / 2, q.a[1] / 2, q.a[2] / 2];
      lists[q.region * 2].push({ c: q.c, a: half, k: q.region });
      lists[q.region * 2 + 1].push({ c: q.c, a: half, k: q.region });
    } else lists[q.region * 2 + q.face].push({ c: q.c, a: q.a, k: q.region });
  }
  let areaSum = 0;
  for (const L of lists) for (const p of L) areaSum += norm(p.a);
  const eps = new Float64Array(NE);
  for (const L of lists) for (const p of L) for (let e = 0; e < NE; e++) eps[e] += dot(lf.at(e, p.c), p.a);
  const Ho = hp.lvHin + hp.lvApexWall;
  const faces: FacePatches[] = lists.map((L, f) => {
    const n = L.length;
    const c = new Float64Array(n * 3), w = new Float64Array(n * NE), vol = new Float64Array(n), dz = new Float64Array(n);
    const cen: V3 = [0, 0, 0];
    let asum = 0;
    L.forEach((p, i) => {
      c[3 * i] = p.c[0]; c[3 * i + 1] = p.c[1]; c[3 * i + 2] = p.c[2];
      const A = norm(p.a);
      // closure correction: a uniform state must give exactly zero (true for any closed double layer)
      for (let e = 0; e < NE; e++) w[i * NE + e] = dot(lf.at(e, p.c), p.a) - (eps[e] * A) / areaSum;
      vol[i] = A;
      for (let j = 0; j < 3; j++) cen[j] += p.c[j] * A;
      asum += A;
    });
    const centroid: V3 = [cen[0] / asum, cen[1] / asum, cen[2] / asum];
    // long-axis offset from the face centroid (z grows toward the base, as region z): for the in-face APD gradient
    for (let i = 0; i < n; i++) dz[i] = -((c[3 * i] - centroid[0]) * heart.eL[0] + (c[3 * i + 1] - centroid[1]) * heart.eL[1] + (c[3 * i + 2] - centroid[2]) * heart.eL[2]) / Ho;
    return { c, w, vol, dz, n, centroid };
  });
  const wV: Float64Array[] = [];
  for (let e = 0; e < NE; e++) {
    const row = new Float64Array(F);
    faces.forEach((fp, f) => { for (let i = 0; i < fp.n; i++) row[f] += fp.w[i * NE + e]; });
    wV.push(row);
  }
  const lA = ELECTRODES.map((_, e) => heart.aregions.map((a) => lf.at(e, a.c)));
  const prep = { heart, faces, wV, lA, lf, graph: buildVGraph(heart) };
  cache.set(key, prep);
  return prep;
}

// ---------------------------------------------------------------------------------------------------------- sweeps

/** Point of a face where a focus / pathway insertion sits: centroid, or the most basal / most apical patch. */
function focusPoint(prep: Prepared, f: number, at: 'centre' | 'base' | 'apex'): V3 {
  const fp = prep.faces[f];
  if (at === 'centre') return fp.centroid;
  const eL = prep.heart.eL;
  let best = -1, bv = at === 'apex' ? -Infinity : Infinity;
  for (let i = 0; i < fp.n; i++) {
    const v = fp.c[3 * i] * eL[0] + fp.c[3 * i + 1] * eL[1] + fp.c[3 * i + 2] * eL[2];
    if (at === 'apex' ? v > bv : v < bv) { bv = v; best = i; }
  }
  return [fp.c[3 * best], fp.c[3 * best + 1], fp.c[3 * best + 2]];
}

/**
 * One sub-source of a face: the patches the front reaches at the same fraction u of the face's activation window
 * (swept faces), or — for a face activated as a whole — the patches at the same long-axis level. dz: the bin's mean
 * long-axis offset from the face centroid (it carries the apex→base APD gradient inside the face).
 */
interface Bin { w: Float64Array; vol: number; u: number; du: number; dz: number; swept: boolean }

const SWEEP_BINS = 8;
/** Half-width of a sweep bin's activation window in units of the bin spacing (W·du): adjacent bins overlap. Mutable
 * only so dev tools can explore it (like LEADSYS). */
export const SWEEP = { overlap: 1.5 };

/** Tabulated phase-3 decay L(y) = exp(−ln2·e^y) (membrane.ts), y = (t − tm − apd) / τ_eff; 1 below −12, 0 above 3. */
const P3_Y0 = -12, P3_STEP = 0.002, P3_N = Math.ceil((3 - P3_Y0) / P3_STEP) + 1;
const P3 = new Float64Array(P3_N);
for (let q = 0; q < P3_N; q++) { const y = P3_Y0 + q * P3_STEP; P3[q] = y > 3 ? 0 : Math.exp(-Math.LN2 * Math.exp(y)); }
function phase3(y: number): number {
  if (y <= P3_Y0) return 1;
  const x = (y - P3_Y0) / P3_STEP;
  const q = x | 0;
  if (q >= P3_N - 1) return 0;
  return P3[q] + (P3[q + 1] - P3[q]) * (x - q);
}
/** Long-axis levels of a face activated as a whole (Purkinje-fed): same window, APD graded along the long axis. */
const Z_BINS = 4;

/**
 * Split every face into sweep bins for one activation pattern. Origin of the sweep: centroid of the predecessor face
 * (surface spread), the face centre (focus), the partner's origin (transmural), none (Purkinje: whole face at once).
 */
function sweepBins(prep: Prepared, wins: FaceWindow[]): Bin[][] {
  const F = wins.length;
  const origin: (V3 | null)[] = new Array(F).fill(null);
  // resolve origins in activation order so that transmural faces can inherit their partner's origin
  const order = wins.map((_, i) => i).sort((a, b) => wins[a].T - wins[b].T);
  for (const f of order) {
    const w = wins[f];
    if (w.via === 'S' && w.pred >= 0) origin[f] = prep.faces[w.pred].centroid;
    else if (w.via === 'E') origin[f] = focusPoint(prep, f, w.at ?? 'centre');
    else if (w.via === 'T' && w.pred >= 0) origin[f] = origin[w.pred];
  }
  return prep.faces.map((fp, f) => {
    const o = origin[f];
    // sort key: distance from the sweep origin (swept face) or long-axis level (face activated as a whole)
    const d = new Float64Array(fp.n);
    let dmin = Infinity, dmax = -Infinity;
    for (let i = 0; i < fp.n; i++) {
      d[i] = o ? Math.hypot(fp.c[3 * i] - o[0], fp.c[3 * i + 1] - o[1], fp.c[3 * i + 2] - o[2]) : fp.dz[i];
      dmin = Math.min(dmin, d[i]); dmax = Math.max(dmax, d[i]);
    }
    const K = o ? SWEEP_BINS : Z_BINS;
    const bins: Bin[] = Array.from({ length: K }, (_, b) => ({ w: new Float64Array(NE), vol: 0, u: o ? (b + 0.5) / K : 0.5, du: o ? 1 / K : 1, dz: 0, swept: !!o }));
    const span = Math.max(1e-9, dmax - dmin);
    for (let i = 0; i < fp.n; i++) {
      const b = Math.min(K - 1, Math.floor(((d[i] - dmin) / span) * K));
      for (let e = 0; e < NE; e++) bins[b].w[e] += fp.w[i * NE + e];
      bins[b].vol += fp.vol[i];
      bins[b].dz += fp.dz[i] * fp.vol[i];
    }
    for (const b of bins) if (b.vol > 0) b.dz /= b.vol;
    return bins.filter((b) => b.vol > 0);
  });
}

// ------------------------------------------------------------------------------------------------------------ events

interface VBeat { tRef: number; rr: number; cond: VConduction; tP: number | null }
/** One atrial sub-source activation: wavefront dipole d·m over a bump centred on T (half-width h). pos: location if the
 * front sits between region centroids (otherwise the region centroid). */
interface AEvt { region: number; tStart: number; T: number; h: number; d: V3; m: number; apd: number; tau: number; plat: number; gain: number; pos?: V3; apdK?: number }

const rrFromHr = (hr: number) => 60000 / hr;

function sinusTimes(r: () => number, hr: number, rsa: number, from: number, to: number): number[] {
  const out: number[] = [];
  const rr0 = rrFromHr(hr);
  const ph = r() * 2 * Math.PI;
  let t = from + r() * rr0 * 0.5;
  let n = 0;
  while (t < to) {
    out.push(t);
    const rr = rr0 * (1 + rsa * Math.sin((2 * Math.PI * n) / 4.3 + ph) + 0.004 * gauss(r));
    t += rr;
    n++;
  }
  return out;
}

function atrialFromWindows(ws: AWindow[], tP: number, ap: AtrialParams, cycle: number, gain = 1): AEvt[] {
  const f = Math.pow(cycle / 833, 0.3);
  return ws.map((w) => ({
    region: w.region, tStart: tP + w.T - w.h, T: tP + w.T, h: w.h, d: w.d, m: w.m,
    apd: ap.apd * f, tau: ap.tau, plat: ap.plat, gain,
  }));
}

/** Closed Catmull–Rom curve through control points; returns position and unit tangent at parameter u ∈ [0,1). */
function loopAt(P: V3[], u: number): { p: V3; d: V3 } {
  const n = P.length;
  const x = (((u % 1) + 1) % 1) * n;
  const i = Math.floor(x), t = x - i;
  const p0 = P[(i + n - 1) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
  const p: V3 = [0, 0, 0], d: V3 = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const a = 2 * p1[k], b = p2[k] - p0[k], c = 2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k], e = -p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k];
    p[k] = 0.5 * (a + b * t + c * t * t + e * t * t * t);
    d[k] = 0.5 * (b + 2 * c * t + 3 * e * t * t);
  }
  return { p, d: unit(d) };
}

/**
 * Typical (counter-clockwise, LAO view) flutter: one revolution of the macro-reentrant front around the tricuspid annulus
 * — cavotricuspid isthmus (slow) → interatrial septum (caudo-cranial) → roof → lateral RA wall (cranio-caudal) → isthmus —
 * as a moving wavefront dipole (tangent of the circuit × regional front size), plus the LA activated passively from the
 * coronary-sinus ostium (caudo-cranial, posterior wall) and through Bachmann's bundle (roof → appendage).
 * The front is always somewhere in the circuit, so there is no isoelectric interval between flutter waves.
 */
export function flutterRevolution(h: Heart, t0: number, cl: number, ap: AtrialParams, fc: FlutterCircuit = TYPICAL_FLUTTER): AEvt[] {
  const ix = (id: string) => h.aregions.findIndex((a) => a.id === id);
  const C = (id: string) => h.aregions[ix(id)].c;
  const circuit = ['ra_cti', 'ra_sep', 'sa', 'ra_lat'];
  const frac = fc.segFrac;
  const P = circuit.map(C);
  const apd = Math.min(ap.apd * Math.pow(cl / 833, 0.3), cl * 0.7);
  const out: AEvt[] = [];
  const N = fc.subSources;
  const cum = [0];
  for (const f of frac) cum.push(cum[cum.length - 1] + f);
  const sgn = fc.reverse ? -1 : 1;
  for (let k = 0; k < N; k++) {
    const u = (k + 0.5) / N; // curve parameter: segment s spans [s/4, (s+1)/4)
    const seg = Math.min(3, Math.floor(u * 4));
    const v = u * 4 - seg;
    // clockwise flutter runs the same loop backwards in time
    const T = t0 + cl * (fc.reverse ? 1 - (cum[seg] + frac[seg] * v) : cum[seg] + frac[seg] * v);
    const hh = (cl * frac[seg]) / (N / 4) * fc.overlap;
    const { p, d } = loopAt(P, u);
    if (seg >= 2) p[2] += fc.latAnterior;
    out.push({ region: ix(circuit[seg]), tStart: T - hh, T, h: hh, d: [d[0] * sgn, d[1] * sgn, d[2] * sgn], m: fc.segM[seg], apd, tau: ap.tau, plat: ap.plat, gain: 1, pos: p, apdK: fc.apdK });
  }
  // LA bystander: posterior wall caudo-cranial from the CS ostium (septal segment start), anterior LA via Bachmann
  const NL = 8;
  const csStart = t0 + cl * (fc.reverse ? 1 - cum[2] : cum[1]) + 10, laDur = cl * 0.5;
  const laPath: V3[] = [C('ra_sep'), C('la_post'), C('la_ant')];
  for (let k = 0; k < NL; k++) {
    const v = (k + 0.5) / NL;
    const a = v < 0.5 ? 0 : 1, w = v < 0.5 ? v * 2 : (v - 0.5) * 2;
    const p: V3 = [0, 0, 0];
    for (let j = 0; j < 3; j++) p[j] = laPath[a][j] + (laPath[a + 1][j] - laPath[a][j]) * w;
    const T = csStart + laDur * v, hh = (laDur / NL) * fc.overlap;
    out.push({ region: ix(a === 0 ? 'la_post' : 'la_ant'), tStart: T - hh, T, h: hh, d: unit(fc.laDir), m: fc.laM, apd, tau: ap.tau, plat: ap.plat, gain: 1, pos: p, apdK: fc.apdK });
  }
  const tB = t0 + cl * (fc.reverse ? 1 - cum[3] : cum[2]) + 5, dB = cl * 0.25;
  for (let k = 0; k < 4; k++) {
    const v = (k + 0.5) / 4;
    const p: V3 = [0, 0, 0];
    for (let j = 0; j < 3; j++) p[j] = C('bachmann')[j] + (C('la_ant')[j] - C('bachmann')[j]) * v;
    const T = tB + dB * v, hh = (dB / 4) * fc.overlap;
    out.push({ region: ix('bachmann'), tStart: T - hh, T, h: hh, d: unit(sub(C('la_ant'), C('sa'))), m: fc.bbM, apd, tau: ap.tau, plat: ap.plat, gain: 1, pos: p, apdK: fc.apdK });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------------- main engine

export interface Sim {
  fs: number;
  n: number;
  leads: Record<LeadName, Float32Array>;
  truth: Truth;
  heart: Heart;
  /** Face-level action potentials (window = whole face) — for the region-activity view and dev tools. */
  vEvents: { face: number; p: ApParams }[];
  aEvents: AEvt[];
  beats: Beat[];
  /** Per-region electrode potentials (only with opts.trace): regPhi[k][e] over the cropped window. */
  regPhi?: Float64Array[][];
  /** Per-beat activated / repolarised area fractions on a 1-ms grid (only with opts.trace). */
  fracs: { t0: number; act: Float64Array; rep: Float64Array }[];
}

/**
 * Truth fiducials from the model's own timing: QRS offset = instant the activated fraction of the ventricular surface
 * reaches `qrsEnd`; T end = instant the repolarised fraction reaches `tEnd` (thresholds calibrated once so that the
 * model's fiducials agree with standard signal measurements — global QRS offset and tangent T end).
 */
export const TRUTH = { qrsEnd: 0.99, tEnd: 0.98 };

function mergeVcond(c?: Partial<VConduction>): VConduction {
  return {
    ...NORMAL_VCOND, ...(c ?? {}),
    blocked: { ...(c?.blocked ?? {}) }, branchDelay: { ...(c?.branchDelay ?? {}) },
    regionSpeed: { ...(c?.regionSpeed ?? {}) }, tmSpeed: { ...(c?.tmSpeed ?? {}) }, wall: { ...NORMAL_VCOND.wall, ...(c?.wall ?? {}) },
    extra: [...(c?.extra ?? [])], pmj: c?.pmj ?? NORMAL_VCOND.pmj,
  };
}

export function mergeVrep(v?: Partial<VRep>): VRep {
  return { ...NORMAL_VREP, ...(v ?? {}), dTM: { ...NORMAL_VREP.dTM, ...(v?.dTM ?? {}) }, dGroup: { ...NORMAL_VREP.dGroup, ...(v?.dGroup ?? {}) } };
}

export function simulate(cond: Condition, opts: { fs: number; durationS: number; seed: number; trace?: boolean }): Sim {
  const fs = opts.fs;
  const dur = opts.durationS * 1000;
  const hp: HeartParams = { ...DEFAULT_HEART, ...(cond.heart ?? {}) };
  const prep = prepare(hp);
  const { heart } = prep;
  const vrep = mergeVrep(cond.vrep);
  const atr: AtrialParams = { ...NORMAL_ATRIA, ...(cond.atria ?? {}) };
  const r = rng(opts.seed * 7919 + cond.id.length * 31 + cond.id.charCodeAt(0));
  const PRE = 1500, POST = 800;
  const tOrigin = -PRE;
  const NT = Math.ceil(((dur + PRE + POST) * fs) / 1000);
  const vcBase = mergeVcond(cond.vcond);
  const dt = 1000 / fs;

  // ---- rhythm → ventricular beats + atrial events
  const vBeats: VBeat[] = [];
  const aEvents: AEvt[] = [];
  const rh = cond.rhythm;
  if (rh.kind === 'sinus') {
    const tps = sinusTimes(r, rh.hr, rh.rsa, -PRE + 200, dur + 400);
    const ws = aActivation(heart, 'sa', atr.dir0, atr.vScale, atr.dirs);
    let cAp: VConduction | null = null;
    for (let i = 0; i < tps.length; i++) {
      const tP = tps[i];
      const prev = i > 0 ? tps[i] - tps[i - 1] : rrFromHr(rh.hr);
      aEvents.push(...atrialFromWindows(ws, tP, atr, prev, atr.gain));
      let c = vcBase;
      if (rh.ap) {
        // accessory pathway: atrial insertion site reached → AP conduction → ventricular insertion (pre-excitation)
        if (!cAp) {
          const site = ws[heart.aregions.findIndex((a) => a.id === rh.ap!.site)];
          const tIns = site.T - site.h * 0.3 + rh.ap.delay - rh.pr; // relative to the His reference
          // the ventricular insertion may branch into neighbouring faces (comma-separated list)
          cAp = { ...vcBase, extra: [...vcBase.extra, ...rh.ap.face.split(',').map((face) => ({ face, t: tIns, h: rh.ap!.h, at: rh.ap!.at }))] };
        }
        c = cAp;
      }
      vBeats.push({ tRef: tP + rh.pr, rr: prev, cond: c, tP });
    }
  } else if (rh.kind === 'vt') {
    const rr = rrFromHr(rh.rate);
    let t = -PRE + 100;
    const c: VConduction = { ...vcBase, pmj: [], extra: [{ face: rh.origin, t: 0, h: rh.originH, at: rh.originAt }] };
    while (t < dur + 400) {
      vBeats.push({ tRef: t, rr, cond: c, tP: null });
      t += rr + 0.8 * gauss(r);
    }
    const ws = aActivation(heart, 'sa', atr.dir0, atr.vScale, atr.dirs);
    const tps = sinusTimes(r, rh.sinusHr, 0.02, -PRE + 50, dur + 400);
    for (const tP of tps) aEvents.push(...atrialFromWindows(ws, tP, atr, rrFromHr(rh.sinusHr), atr.gain));
  } else if (rh.kind === 'flutter') {
    let t = -PRE + 50 + r() * rh.cl;
    let n = 0;
    while (t < dur + 400) {
      aEvents.push(...flutterRevolution(heart, t, rh.cl, atr, { ...TYPICAL_FLUTTER, ...(rh.circuit ?? {}) }));
      if (n % rh.ratio === 0) vBeats.push({ tRef: t + rh.fr, rr: rh.cl * rh.ratio, cond: vcBase, tP: null });
      t += rh.cl;
      n++;
    }
  } else if (rh.kind === 'af') {
    // fibrillating atria: every region re-excited at its own irregular cycle with a random wavefront direction
    for (let k = 0; k < heart.aregions.length; k++) {
      let t = -PRE + r() * rh.fCL;
      while (t < dur + 400) {
        const cl = rh.fCL * (0.8 + 0.4 * r());
        const hh = (heart.aregions[k].extent / (2 * 0.07)) * (0.5 + 0.5 * r());
        const d = randUnit(r);
        aEvents.push({ region: k, tStart: t, T: t + hh, h: hh, d, m: heart.aregions[k].m, apd: cl * 0.62, tau: 14, plat: 0.5, gain: rh.fGain * (0.6 + 0.8 * r()) });
        t += cl;
      }
    }
    let t = -PRE + 100;
    let prev = rh.meanRR;
    while (t < dur + 400) {
      vBeats.push({ tRef: t, rr: prev, cond: vcBase, tP: null });
      const g = -Math.log(Math.max(1e-9, r())) - Math.log(Math.max(1e-9, r()));
      const rr = rh.minRR + ((rh.meanRR - rh.minRR) / 2) * g;
      t += rr;
      prev = rr;
    }
  }

  // ---- ventricular sources → electrode potentials
  const R = heart.vregions.length;
  const F = R * 2;
  const phi: Float64Array[] = Array.from({ length: NE }, () => new Float64Array(NT));
  const [P0, P1, P2, P3, P4, P5, P6, P7, P8] = phi;
  const regPhi: Float64Array[][] | undefined = opts.trace ? Array.from({ length: R }, () => Array.from({ length: NE }, () => new Float64Array(NT))) : undefined;
  const actCache = new Map<VConduction, { wins: FaceWindow[]; bins: Bin[][]; whole: Bin[][]; first: number }>();
  const vEvents: { face: number; p: ApParams }[] = [];
  const beats: Beat[] = [];
  const fracs: { t0: number; act: Float64Array; rep: Float64Array }[] = [];
  const g = -LEADSYS.gainV;
  const ws = new Float64Array(NE);
  for (const b of vBeats) {
    let act = actCache.get(b.cond);
    if (!act) {
      const wins = vActivation(heart, prep.graph, b.cond);
      let first = Infinity;
      for (const w of wins) first = Math.min(first, w.t0);
      const bins = sweepBins(prep, wins);
      // the same faces as one bin each (used when the long-axis levels of a whole-face activation share one APD)
      const whole = bins.map((bs) => {
        const w = new Float64Array(NE);
        let vol = 0, dz = 0;
        for (const b of bs) { for (let e = 0; e < NE; e++) w[e] += b.w[e]; vol += b.vol; dz += b.dz * b.vol; }
        return [{ w, vol, u: 0.5, du: 1, dz: dz / vol, swept: false }];
      });
      act = { wins, bins, whole, first };
      actCache.set(b.cond, act);
    }
    const restit = Math.pow(b.rr / 833, vrep.restExp);
    let qOn = Infinity, tOff = -Infinity;
    // area-weighted activation and repolarisation fractions (truth for QRS offset and T end): per bin its weight,
    // activation window and repolarisation midpoint / slope; the fiducials are found by bisection afterwards
    const tb: number[] = [];
    const gridT0 = b.tRef + act.first - 5;
    for (let f = 0; f < F; f++) {
      const k = f >> 1, face = f & 1;
      const reg = heart.vregions[k];
      const m = cond.regions?.[reg.id] ?? {};
      const w = act.wins[f];
      let apd = baseApd(vrep, reg, face === FACE.IN);
      apd += (m.dApd ?? 0) + (face === FACE.IN ? (m.dApdIn ?? 0) : (m.dApdOut ?? 0));
      apd *= restit;
      const amp = (m.amp ?? 1) * (face === FACE.IN ? (m.ampIn ?? 1) : (m.ampOut ?? 1));
      const notch = face === FACE.OUT ? m.notchOut : undefined;
      const rest = face === FACE.IN ? (m.restIn ?? m.rest ?? 0) : (m.restOut ?? m.rest ?? 0);
      const base: ApParams = {
        t0: b.tRef + w.t0, t1: b.tRef + w.t1, apd, tau: (face === FACE.IN ? m.tauIn : m.tauOut) ?? m.tau ?? vrep.tau, spread: vrep.spread,
        plat: (face === FACE.IN ? m.platIn : m.platOut) ?? m.plat ?? vrep.plat, amp: amp - rest, rest: 0,
        notchDepth: notch?.depth ?? 0, notchD1: notch?.d1 ?? 0, notchD2: notch?.d2 ?? 1,
      };
      vEvents.push({ face: f, p: base });
      qOn = Math.min(qOn, base.t0);
      const W = w.t1 - w.t0;
      // in-face apex→base APD gradient (the region's own gradient continued inside the face; not above the base plane)
      const gIn = reg.z <= 1.1 ? vrep.gAB * vrep.gABin * restit : 0;
      // a face activated as a whole needs its long-axis levels only when their APDs differ
      const bins = !act.bins[f][0].swept && gIn === 0 && vrep.couple === 0 ? act.whole[f] : act.bins[f];
      const swept = bins[0].swept && bins.length > 1;
      const hb = swept ? Math.max(5, SWEEP.overlap * W * bins[0].du) : W / 2;
      // all bins of a face share one activation/plateau shape shifted in time and one phase-3 shape (only the APD differs
      // between bins): tabulate the pre-phase-3 part once at dt/2 and multiply by the tabulated phase-3 decay
      let tmpl: Float64Array | null = null, tmplX0 = 0, teT = 1;
      const tStep = dt / 2;
      const disp = swept ? b.cond.sweepDisp : 0;
      if (bins.length > 1 && disp === 0) {
        const p0: ApParams = { ...base, t0: -hb, t1: hb, apd: 1e9 };
        teT = apTauEff(p0);
        tmplX0 = -hb;
        let dzMax = 0;
        for (const bin of bins) dzMax = Math.max(dzMax, gIn * bin.dz);
        const nT = Math.ceil((hb + base.apd + dzMax + 3 * teT - tmplX0) / tStep) + 2;
        tmpl = new Float64Array(nT);
        for (let q = 0; q < nT; q++) tmpl[q] = apValue(p0, tmplX0 + q * tStep, teT);
      }
      const rp = regPhi?.[k];
      for (const bin of bins) {
        // sub-window of this bin inside the face window; APD graded along the long axis and (optionally) shortened with
        // later activation (electrotonic coupling)
        const tc = base.t0 + W * bin.u;
        // optional front dispersion: the far bins of a swept face activate over a wider window (the front reaches the
        // far boundary of the face at different times along its length) → the face's force tapers instead of stopping
        const hbB = hb * (1 + disp * bin.u);
        const tAct = tc - (b.tRef + act.first);
        const p: ApParams = { ...base, t0: tc - hbB, t1: tc + hbB, apd: base.apd + gIn * bin.dz - vrep.couple * tAct * restit };
        const tauEff = apTauEff(p);
        tb.push(bin.vol, p.t0, p.t1, (p.t0 + p.t1) / 2 + p.apd, tauEff);
        for (let e = 0; e < NE; e++) ws[e] = g * bin.w[e];
        const end = apEnd(p);
        const i0 = Math.max(0, Math.ceil((p.t0 - tOrigin) / dt));
        const i1 = Math.min(NT - 1, Math.floor((end - tOrigin) / dt));
        const w0 = ws[0], w1 = ws[1], w2 = ws[2], w3 = ws[3], w4 = ws[4], w5 = ws[5], w6 = ws[6], w7 = ws[7], w8 = ws[8];
        const x0 = (tOrigin - tc - tmplX0) / tStep, xs = dt / tStep;
        const y0 = (tOrigin - tc - p.apd) / teT, ys = dt / teT;
        for (let i = i0; i <= i1; i++) {
          let s: number;
          if (tmpl) {
            const xq = x0 + i * xs;
            const q = xq | 0;
            if (q < 0 || q + 1 >= tmpl.length) continue;
            s = (tmpl[q] + (tmpl[q + 1] - tmpl[q]) * (xq - q)) * phase3(y0 + i * ys);
          } else s = apValue(p, tOrigin + i * dt, tauEff);
          if (s === 0) continue;
          P0[i] += w0 * s; P1[i] += w1 * s; P2[i] += w2 * s; P3[i] += w3 * s; P4[i] += w4 * s;
          P5[i] += w5 * s; P6[i] += w6 * s; P7[i] += w7 * s; P8[i] += w8 * s;
          if (rp) for (let e = 0; e < NE; e++) rp[e][i] += ws[e] * s;
        }
      }
    }
    const actF = (t: number) => { let a = 0, v = 0; for (let j = 0; j < tb.length; j += 5) { a += tb[j] * smooth01((t - tb[j + 1]) / (tb[j + 2] - tb[j + 1])); v += tb[j]; } return a / v; };
    const repF = (t: number) => {
      let a = 0, v = 0;
      for (let j = 0; j < tb.length; j += 5) { const x = (t - tb[j + 3]) / tb[j + 4]; a += tb[j] * (x > 3 ? 1 : x < -12 ? 0 : 1 - Math.exp(-Math.LN2 * Math.exp(x))); v += tb[j]; }
      return a / v;
    };
    const solve = (f: (t: number) => number, target: number, lo: number, hi: number) => {
      for (let it = 0; it < 30; it++) { const mid = (lo + hi) / 2; if (f(mid) >= target) hi = mid; else lo = mid; }
      return hi;
    };
    const qOff = solve(actF, TRUTH.qrsEnd, qOn, qOn + 600);
    tOff = solve(repF, TRUTH.tEnd, qOn, qOn + 1500);
    beats.push({ pOnMs: b.tP, qrsOnMs: qOn, qrsOffMs: qOff, tOffMs: tOff });
    if (opts.trace) {
      const GRID = 900, act2 = new Float64Array(GRID), rep2 = new Float64Array(GRID);
      for (let j = 0; j < GRID; j++) { act2[j] = actF(gridT0 + j); rep2[j] = repF(gridT0 + j); }
      fracs.push({ t0: gridT0, act: act2, rep: rep2 });
    }
  }

  // ventricular-only limb electrodes (RA, LA, LL) — the truth axis is the ventricles' own, free of atrial waves
  const offV = Math.round((PRE * fs) / 1000);
  const nV = Math.round(opts.durationS * fs);
  const vRA = phi[0].slice(offV, offV + nV), vLA = phi[1].slice(offV, offV + nV), vLL = phi[2].slice(offV, offV + nV);

  // ---- atria: entry/exit faces of each region, dipole along the local wavefront direction
  for (const ev of aEvents) {
    // entry and exit faces of the region: overlapping smooth windows so that the regional front is a smooth bump and
    // neighbouring regions blend into one P wave
    const pa: ApParams = { t0: ev.T - 1.6 * ev.h, t1: ev.T + 0.3 * ev.h, apd: ev.apd, tau: ev.tau, spread: 0, plat: ev.plat, amp: 1, rest: 0, notchDepth: 0, notchD1: 0, notchD2: 1 };
    // later-activated atrial muscle has a shorter APD (inverse APD–activation-time relation): the atrial gradient is
    // not zero, so the Ta wave is smaller and broader than the mirror image of P
    const pb: ApParams = { ...pa, t0: ev.T - 0.3 * ev.h, t1: ev.T + 1.6 * ev.h, apd: ev.apd - (ev.apdK ?? 0.6) * 1.3 * ev.h };
    const ta = apTauEff(pa), tb = apTauEff(pb);
    for (let e = 0; e < NE; e++) ws[e] = LEADSYS.gainA * ev.gain * ev.m * dot(ev.pos ? prep.lf.at(e, ev.pos) : prep.lA[e][ev.region], ev.d);
    const i0 = Math.max(0, Math.ceil((pa.t0 - tOrigin) / dt));
    const i1 = Math.min(NT - 1, Math.floor((pb.t1 + ev.apd + 4 * Math.max(ta, tb) - tOrigin) / dt));
    for (let i = i0; i <= i1; i++) {
      const t = tOrigin + i * dt;
      const v = apValue(pa, t, ta) - apValue(pb, t, tb);
      if (v === 0) continue;
      for (let e = 0; e < NE; e++) phi[e][i] += ws[e] * v;
    }
  }

  // ---- crop and form leads
  const n = Math.round(opts.durationS * fs);
  const off = Math.round((PRE * fs) / 1000);
  const crop = phi.map((p) => p.subarray(off, off + n));
  const leads = formLeads(crop, n);

  // ---- truth (from the model's own timing)
  const inWin = beats.filter((b) => b.qrsOnMs >= 0 && b.tOffMs <= dur);
  const allIn = beats.filter((b) => b.qrsOnMs >= 0 && b.qrsOnMs < dur);
  const rrs: number[] = [];
  for (let i = 1; i < allIn.length; i++) rrs.push(allIn[i].qrsOnMs - allIn[i - 1].qrsOnMs);
  const meanRR = rrs.reduce((a, b) => a + b, 0) / Math.max(1, rrs.length);
  const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
  const qrs = med(inWin.map((b) => b.qrsOffMs - b.qrsOnMs));
  const qt = med(inWin.map((b) => b.tOffMs - b.qrsOnMs));
  const conducted = rh.kind === 'sinus';
  const pr = conducted ? med(inWin.map((b) => b.qrsOnMs - (b.pOnMs ?? b.qrsOnMs))) : null;
  const axes: number[] = [];
  for (const b of inWin) {
    const a = Math.round((b.qrsOnMs * fs) / 1000), z = Math.round((b.qrsOffMs * fs) / 1000);
    let sI = 0, sF = 0;
    const vI = (i: number) => vLA[i] - vRA[i], vF = (i: number) => vLL[i] - (vRA[i] + vLA[i]) / 2;
    const b0I = vI(a), b0F = vF(a);
    for (let i = a; i <= z && i < n; i++) { sI += vI(i) - b0I; sF += vF(i) - b0F; }
    axes.push((Math.atan2(sF, sI) * 180) / Math.PI);
  }
  const truth: Truth = {
    hrBpm: Math.round((60000 / meanRR) * 10) / 10,
    prMs: pr === null ? null : Math.round(pr),
    qrsMs: Math.round(qrs),
    qtMs: Math.round(qt),
    qrsAxisDeg: Math.round(med(axes)),
    rhythm: cond.rhythmLabel,
    beats: allIn.map((b) => ({
      pOnMs: b.pOnMs === null ? null : Math.round(b.pOnMs * 10) / 10,
      qrsOnMs: Math.round(b.qrsOnMs * 10) / 10,
      qrsOffMs: Math.round(b.qrsOffMs * 10) / 10,
      tOffMs: Math.round(b.tOffMs * 10) / 10,
    })),
  };
  const regCrop = regPhi?.map((rows) => rows.map((p) => p.slice(off, off + n)));
  return { fs, n, leads, truth, heart, vEvents, aEvents, beats, regPhi: regCrop, fracs };
}

export function generate(conditionId: string, opts: { fs: number; durationS: number; seed: number }): Result {
  const cond = CONDITIONS[conditionId];
  if (!cond) throw new Error(`unknown condition ${conditionId}`);
  const sim = simulate(cond, opts);
  const heart = sim.heart;
  const names = [...heart.vregions.map((r) => r.name), ...heart.aregions.map((a) => a.name)];
  const R = heart.vregions.length;
  // index events per region for the activity view
  const vByRegion: ApParams[][] = Array.from({ length: R }, () => []);
  for (const ev of sim.vEvents) vByRegion[ev.face >> 1].push(ev.p);
  const aByRegion: AEvt[][] = heart.aregions.map(() => []);
  for (const ev of sim.aEvents) aByRegion[ev.region].push(ev);
  return {
    leads: sim.leads,
    truth: sim.truth,
    regions: {
      names,
      /** 0 = resting, rising to 1 while the region depolarises, held on the plateau, falling back with repolarisation. */
      activityAt(tMs: number): Float32Array {
        const out = new Float32Array(names.length);
        for (let k = 0; k < R; k++) {
          let s = 0;
          for (const p of vByRegion[k]) if (tMs > p.t0 && tMs < p.t0 + 2000) s += apValue(p, tMs, apTauEff(p)) / Math.max(1e-6, p.amp);
          out[k] = Math.max(0, Math.min(1, s / 2));
        }
        for (let j = 0; j < aByRegion.length; j++) {
          let s = 0;
          for (const ev of aByRegion[j]) {
            if (tMs < ev.tStart || tMs > ev.tStart + 1200) continue;
            const pa: ApParams = { t0: ev.T - ev.h, t1: ev.T + ev.h, apd: ev.apd, tau: ev.tau, spread: 0, plat: ev.plat, amp: 1, rest: 0, notchDepth: 0, notchD1: 0, notchD2: 1 };
            s += apValue(pa, tMs, apTauEff(pa));
          }
          out[R + j] = Math.max(0, Math.min(1, s));
        }
        return out;
      },
    },
  };
}

export { LEADS };
