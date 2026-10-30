// model.ts — turns a parameter set (rhythm, conduction graph, regional AP parameters, geometry) into a node graph,
// runs the activation engine and returns per-node activation records plus action-potential template parameters.
import { buildGeom, DEFAULT_GEOM, CH, SF, DOM, norm, dot, SVC_BODY, IVC_BODY } from './geom.ts';
import type { Geom, GeomParams, Vec3 } from './geom.ts';
import { GraphBuilder, run, rng, gauss } from './engine.ts';
import type { Graph, Activations } from './engine.ts';

export interface Mod {
  sel: (m: Sites, i: number) => number;  // weight 0..1 for myocardial node i
  apdAdd?: number; apdScale?: number;    // APD (long-DI value) change
  amp?: number; rest?: number; notch?: number; slope?: number; cls?: number; // AP template targets (blended by weight)
  vScale?: number;                       // conduction-velocity scale (blended)
}

export type Rhythm =
  | { kind: 'sinus'; rr: number; hrv: number }
  | { kind: 'flutter'; ctiScale: number; ctiDelay: number; ratio: number; csAtExit?: boolean }
  | { kind: 'af'; drivers: { dir: Vec3; cl: number; ra?: boolean }[]; clJitter: number }
  | { kind: 'vt'; rr: number; hrv: number; cl: number; focus: { th: number; ab: number; tm: number; r?: number } };

export interface Params {
  geom: GeomParams;
  vT: number; vN: number; vPurk: number; vPurkRV: number; pmj: number; pmjRetro: number | null; retroLV: boolean; retroRV: boolean;
  apdSmooth: number; apdJitter: number;
  apd0: number; gAB: number; gTM: number; gLV: number; vRestA: number; vRestTau: number; vErp: number; slope: number;
  fasc: { lsf: number | null; laf: number | null; lpf: number | null; rbb: number | null };
  mbDelay: number;  // extra RBB->moderator band (RV free wall) delay
  roots: { lafTh: number; lafAb: number; lpfTh: number; lpfAb: number };
  purkAbMaxLV: number; purkAbMaxRV: number;
  // Purkinje coverage (max apex->base coordinate reached by the endocardial network) per wall; the posterolateral
  // sector [postTh0, postTh1] (degrees, 0 lateral, -90 inferior) can be left with less coverage (posterobasal LV late)
  purk: null | { lvFree: number; lvPost: number; postTh0: number; postTh1: number; lvSept: number; rvFree: number; rvSept: number };
  vA: number; vCrista: number; vBB: number; aApd: number; aRestA: number; aRestTau: number; aErp: number; aSlope: number; aAmp: number;
  aApdJitter: number;
  csDelay: number | null;   // coronary sinus RA -> LA connection delay (ms)
  septalBridgesOnly: boolean; fossaBridge: boolean;
  atrialFocus: Vec3 | null; // ectopic atrial pacemaker direction (body frame) from the RA centre, null = sinus node
  avn: { ahMin: number; ahExt: number; tauDec: number; erp: number; jitter: number; conceal: number };
  ap: null | { delay: number; erp: number; ventTh: number; ventAb: number };
  rhythm: Rhythm;
  mods: Mod[];
  gain: number;
  preMs: number;
}

export function defaultParams(): Params {
  const p: Params = {
    // calibrated by dbg_fit2.ts (pose) and re-fitted in the review by dbg_fit3.ts (conduction system, gain): one
    // coordinate search over these shared parameters so that normal conduction AND complete RBBB / LBBB (same heart,
    // one bundle removed) match textbook morphology together. The review fit enforces the physiological septal
    // sequence: the left septal fascicle fires first and the right bundle ~7 ms later, and only the mid/apical left
    // septum carries Purkinje (lvSept 0.46), which gives the small septal q in I, aVL, V6 and the small r in V1.
    geom: { ...DEFAULT_GEOM, el: 35.6, az: 45, roll: -12, apexBody: [68, -45, 50] },
    vT: 0.608, vN: 0.299, vPurk: 1.146, vPurkRV: 1.537, pmj: 2, pmjRetro: null, retroLV: true, retroRV: true,
    apdSmooth: 2, apdJitter: 0,
    apd0: 262, gAB: 20, gTM: 45, gLV: -30, vRestA: 0.5, vRestTau: 200, vErp: 0.92, slope: 0.06,
    fasc: { lsf: 22.3, laf: 35.25, lpf: 30, rbb: 29.3 }, mbDelay: 4.4,
    roots: { lafTh: 115, lafAb: 0.85, lpfTh: -107.5, lpfAb: 0.416 },
    purkAbMaxLV: 0.82, purkAbMaxRV: 0.78,
    purk: { lvFree: 0.98, lvPost: 0.91, postTh0: -60, postTh1: -2.5, lvSept: 0.46, rvFree: 0.832, rvSept: 0.975 },
    vA: 0.85, vCrista: 1.3, vBB: 1.7, aApd: 230, aRestA: 0.6, aRestTau: 100, aErp: 0.85, aSlope: 0.25, aAmp: 1,
    aApdJitter: 0,
    csDelay: 20,
    atrialFocus: null,
    septalBridgesOnly: true, fossaBridge: true,
    avn: { ahMin: 64, ahExt: 120, tauDec: 120, erp: 380, jitter: 0, conceal: 0 },
    ap: null,
    rhythm: { kind: 'sinus', rr: 833, hrv: 0.01 },
    mods: [],
    gain: 0.753,
    preMs: 3000,
  };
  // dev-only calibration hook (dbg_fit*.ts): FIELD_OVR='{"vPurk":3,"geom":{"az":40}}' overrides the shared normal-heart
  // parameters before a condition applies its own changes
  const ovr = typeof process !== 'undefined' ? process.env.FIELD_OVR : undefined;
  if (ovr) {
    const o = JSON.parse(ovr) as Record<string, unknown>; const t = p as unknown as Record<string, unknown>;
    for (const k of Object.keys(o)) { const v = o[k]; const cur = t[k]; t[k] = v && typeof v === 'object' && !Array.isArray(v) && cur && typeof cur === 'object' ? { ...(cur as object), ...(v as object) } : v; }
  }
  return p;
}

// handy anatomical selectors over geometry nodes
export interface Sites { g: Geom; }
export const sel = {
  lv: (s: Sites, i: number) => (s.g.ch[i] === CH.LV ? 1 : 0),
  rv: (s: Sites, i: number) => (s.g.ch[i] === CH.RV ? 1 : 0),
  sept: (s: Sites, i: number) => ((s.g.sf[i] & SF.SEPTAL) ? 1 : 0),
  rvot: (s: Sites, i: number) => ((s.g.sf[i] & SF.RVOT) ? 1 : 0),
  vent: (s: Sites, i: number) => (s.g.dom[i] === DOM.V ? 1 : 0),
};
export function smoothstep(e0: number, e1: number, x: number): number { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }
// angular window (degrees) with soft edges
export function angWin(th: number, a0: number, a1: number, soft = 15): number {
  const wrap = (a: number) => ((a % 360) + 540) % 360 - 180;
  const mid = (a0 + a1) / 2, half = Math.abs(wrap(a1 - a0)) / 2;
  const d = Math.abs(wrap(th - mid));
  return 1 - smoothstep(half - soft / 2, half + soft / 2, d);
}

export const SPECIAL = ['AVN', 'HIS', 'LBB', 'RBB', 'LSF', 'LAF', 'LPF', 'RETRO', 'AP'] as const;

export interface Model {
  p: Params;
  g: Geom;
  graph: Graph;
  nMyo: number;
  purkOf: Int32Array;           // myocardial node -> Purkinje node or -1
  spec: Record<string, number>;
  amp: Float32Array; rest: Float32Array; notch: Float32Array; slope: Float32Array; cls: Uint8Array;
  sites: Record<string, number>;
  focusSet: number[];
  acts?: Activations;
  avnLog: { t: number; conducted: boolean }[];
}

function nearestBy(g: Geom, pt: Vec3, f: (i: number) => boolean): number { return g.nearest(pt, f); }

export function buildModel(p: Params, seed: number): Model {
  const g = buildGeom({ ...p.geom, purkAbMaxLV: p.purkAbMaxLV, purkAbMaxRV: p.purkAbMaxRV });
  const n = g.n;
  if (p.purk) {
    const c = p.purk;
    for (let i = 0; i < n; i++) {
      if (g.dom[i] !== DOM.V) continue;
      g.sf[i] &= ~SF.PURK;
      const f = g.sf[i];
      if (f & SF.LV_ENDO) {
        const ab = (f & SF.SEPTAL) ? c.lvSept : c.lvFree + (c.lvPost - c.lvFree) * angWin(g.th[i], c.postTh0, c.postTh1, 40);
        if (g.ab[i] < ab) g.sf[i] |= SF.PURK;
      }
      if ((f & SF.RV_ENDO) && !(f & SF.RVOT)) {
        if (g.ab[i] < (g.ch[i] === CH.RV ? c.rvFree : c.rvSept)) g.sf[i] |= SF.PURK;
      }
    }
  }
  const R = rng(seed * 7919 + 13);
  const S: Sites = { g };
  // ---- per-node tissue maps
  const apd = new Float64Array(n), vs = new Float64Array(n).fill(1);
  const amp = new Float32Array(n).fill(1), rest = new Float32Array(n), notch = new Float32Array(n), slope = new Float32Array(n), cls = new Uint8Array(n);
  const RJ = rng(seed * 31337 + 5);
  for (let i = 0; i < n; i++) {
    if (g.dom[i] === DOM.V) {
      const sept = (g.sf[i] & SF.SEPTAL) !== 0;
      const tmEff = sept ? 0 : g.tm[i];
      apd[i] = p.apd0 + p.gAB * (Math.min(g.ab[i], 1.1) - 0.5) + p.gTM * (0.5 - tmEff) + p.gLV * (g.ch[i] === CH.LV ? 0.5 : -0.5);
      // intrinsic cell-to-cell APD heterogeneity (seeded); the electrotonic smoothing below turns it into a weak,
      // spatially correlated scatter that de-synchronises voxel-aligned repolarisation steps
      if (p.apdJitter > 0) apd[i] += p.apdJitter * gauss(RJ);
      slope[i] = p.slope; cls[i] = 0;
    } else {
      apd[i] = p.aApd * (1 + p.aApdJitter * gauss(R));
      slope[i] = p.aSlope; cls[i] = 1; amp[i] = p.aAmp;
    }
  }
  for (const m of p.mods) {
    for (let i = 0; i < n; i++) {
      const w = m.sel(S, i);
      if (w <= 0) continue;
      if (m.apdAdd !== undefined) apd[i] += w * m.apdAdd;
      if (m.apdScale !== undefined) apd[i] *= 1 + w * (m.apdScale - 1);
      if (m.amp !== undefined) amp[i] += w * (m.amp - amp[i]);
      if (m.rest !== undefined) rest[i] += w * (m.rest - rest[i]);
      if (m.notch !== undefined) notch[i] += w * (m.notch - notch[i]);
      if (m.slope !== undefined) slope[i] += w * (m.slope - slope[i]);
      if (m.cls !== undefined && w >= 0.5) cls[i] = m.cls;
      if (m.vScale !== undefined) vs[i] *= 1 + w * (m.vScale - 1);
    }
  }
  // electrotonic smoothing of the ventricular APD map (gap-junction coupling evens out step changes in intrinsic APD
  // over a few millimetres; without it, region borders give multi-humped T waves)
  for (let it = 0; it < p.apdSmooth; it++) {
    const nx = Float64Array.from(apd);
    for (let i = 0; i < n; i++) {
      if (g.dom[i] !== DOM.V) continue;
      let s = 0, c = 0;
      for (let q = g.nb6.start[i]; q < g.nb6.start[i + 1]; q++) { const j = g.nb6.idx[q]; if (g.dom[j] === DOM.V) { s += apd[j]; c++; } }
      if (c) nx[i] = 0.5 * apd[i] + 0.5 * s / c;
    }
    apd.set(nx);
  }
  // ---- graph
  const gb = new GraphBuilder();
  for (let i = 0; i < n; i++) {
    if (g.dom[i] === DOM.V) gb.addNode(apd[i], p.vRestA, p.vRestTau, p.vErp);
    else gb.addNode(apd[i], p.aRestA, p.aRestTau, p.aErp);
  }
  const sT = new Float64Array(n), sN = new Float64Array(n);
  // atrial special tracts
  const raC = p.geom.raC, laC = p.geom.laC;
  const L = (b: Vec3): Vec3 => norm(g.bodyToLocalDir(b));
  const up = L([0, 1, 0]), right = L([-1, 0, 0]), ant = L([0, 0, 1]), post = L([0, 0, -1]), left = L([1, 0, 0]);
  const dSVC = L(SVC_BODY), dIVC = L(IVC_BODY);
  const sepN = norm([laC[0] - raC[0], laC[1] - raC[1], laC[2] - raC[2]]);
  const add = (a: Vec3, b: Vec3, s = 1): Vec3 => [a[0] + s * b[0], a[1] + s * b[1], a[2] + s * b[2]];
  const loc = (i: number): Vec3 => [g.loc[3 * i], g.loc[3 * i + 1], g.loc[3 * i + 2]];
  const isRA = (i: number) => g.ch[i] === CH.RA, isLA = (i: number) => g.ch[i] === CH.LA;
  // crista terminalis: RA nodes close to the plane through raC spanned by dSVC and dIVC on the lateral (right) side
  const cristaN = norm([dSVC[1] * dIVC[2] - dSVC[2] * dIVC[1], dSVC[2] * dIVC[0] - dSVC[0] * dIVC[2], dSVC[0] * dIVC[1] - dSVC[1] * dIVC[0]]);
  const latDir = norm(add(right, post, 0.6));
  const cristaDist = (i: number) => { const v: Vec3 = [g.loc[3 * i] - raC[0], g.loc[3 * i + 1] - raC[1], g.loc[3 * i + 2] - raC[2]]; return { d: dot(v, cristaN), side: dot(v, latDir) }; };
  // cavotricuspid isthmus: RA floor between the IVC hole and the tricuspid opening
  const yB = p.geom.yBase;
  const avnePt = add(add(add(raC, sepN, 17), [0, -1, 0], 14), post, 6); // triangle of Koch (AV node entry)
  const ctiW = (i: number) => {
    if (!isRA(i)) return 0;
    const dA = Math.hypot(g.loc[3 * i] - avnePt[0], g.loc[3 * i + 1] - avnePt[1], g.loc[3 * i + 2] - avnePt[2]);
    if (dA < 9) return 0; // the isthmus ends at the CS os, the AV-node approaches stay outside it
    const v: Vec3 = [g.loc[3 * i] - raC[0], g.loc[3 * i + 1] - raC[1], g.loc[3 * i + 2] - raC[2]];
    const low = 1 - smoothstep(yB + 8, yB + 16, g.loc[3 * i + 1]);
    const towardIVC = smoothstep(0.0, 0.35, dot(norm(v), dIVC));
    return low * towardIVC;
  };
  for (let i = 0; i < n; i++) {
    if (g.dom[i] === DOM.V) { sT[i] = 1 / (p.vT * vs[i]); sN[i] = 1 / (p.vN * vs[i]); }
    else {
      let v = p.vA * vs[i];
      if (isRA(i)) {
        const c = cristaDist(i);
        if (Math.abs(c.d) < 4 && c.side > 0) v = p.vCrista * vs[i];
        if (p.rhythm.kind === 'flutter') v *= 1 + ctiW(i) * (p.rhythm.ctiScale - 1);
      }
      sT[i] = sN[i] = 1 / v;
    }
  }
  // flutter: functional block along the crista (no conduction across it on the posterolateral wall)
  const blockCrista = p.rhythm.kind === 'flutter';
  for (let i = 0; i < n; i++) {
    const nx = g.nrm[3 * i], ny = g.nrm[3 * i + 1], nz = g.nrm[3 * i + 2];
    const ci = blockCrista && isRA(i) ? cristaDist(i) : null;
    for (let q = g.nb26.start[i]; q < g.nb26.start[i + 1]; q++) {
      const j = g.nb26.idx[q], len = g.nb26.len[q];
      // the interatrial septum is not a conducting sheet: RA and LA connect only through Bachmann's bundle, the
      // coronary-sinus musculature and a small fossa-rim bridge (explicit edges below)
      if (p.septalBridgesOnly && g.dom[i] === DOM.A && g.ch[i] !== g.ch[j]) continue;
      if (ci) {
        const cj = cristaDist(j);
        if (isRA(j) && ci.side > 0 && cj.side > 0 && Math.sign(ci.d) !== Math.sign(cj.d)) continue;
      }
      const dx = (g.loc[3 * j] - g.loc[3 * i]) / len, dy = (g.loc[3 * j + 1] - g.loc[3 * i + 1]) / len, dz = (g.loc[3 * j + 2] - g.loc[3 * i + 2]) / len;
      const ci2 = (dx * nx + dy * ny + dz * nz) ** 2;
      const cj2 = (dx * g.nrm[3 * j] + dy * g.nrm[3 * j + 1] + dz * g.nrm[3 * j + 2]) ** 2;
      const si = Math.sqrt(ci2 * sN[i] * sN[i] + (1 - ci2) * sT[i] * sT[i]);
      const sj = Math.sqrt(cj2 * sN[j] * sN[j] + (1 - cj2) * sT[j] * sT[j]);
      gb.addEdge(i, j, len * 0.5 * (si + sj));
    }
  }
  // Purkinje layer
  const purkOf = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) if (g.sf[i] & SF.PURK) purkOf[i] = gb.addNode(330, 0.3, 200, 0.9);
  for (let i = 0; i < n; i++) {
    const pi = purkOf[i]; if (pi < 0) continue;
    for (let q = g.nb26.start[i]; q < g.nb26.start[i + 1]; q++) {
      const j = g.nb26.idx[q]; const pj = purkOf[j];
      if (pj >= 0) gb.addEdge(pi, pj, g.nb26.len[q] / ((g.ch[i] === CH.RV && g.ch[j] === CH.RV ? p.vPurkRV : p.vPurk) * Math.sqrt(vs[i] * vs[j])));
    }
    gb.addEdge(pi, i, p.pmj);
    // retrograde muscle -> Purkinje entry (slower than anterograde): lets a wave that reaches a still-resting
    // Purkinje network (bundle-branch block, ectopic beats) engage it
    if (p.pmjRetro !== null && (g.ch[i] === CH.RV ? p.retroRV : p.retroLV)) gb.addEdge(i, pi, p.pmjRetro);
  }
  // specials
  const spec: Record<string, number> = {};
  for (const s of SPECIAL) spec[s] = gb.addNode(s === 'AVN' ? 1 : s === 'RETRO' ? 150 : s === 'AP' ? (p.ap ? p.ap.erp / 0.9 : 300) : 330, 0, 100, 0.9);
  const sites: Record<string, number> = {};
  const focusSet: number[] = [];
  const vEndoLV = (i: number) => purkOf[i] >= 0 && g.ch[i] === CH.LV && (g.sf[i] & SF.LV_ENDO) !== 0;
  const at = (th: number, ab: number, r: number): Vec3 => { const y = -p.geom.lvEpiL + ab * (p.geom.yBase + p.geom.lvEpiL); const t = th * Math.PI / 180; return [r * Math.cos(t), y, r * Math.sin(t)]; };
  sites.LSF = nearestBy(g, at(180, 0.5, 20), (i) => vEndoLV(i) && (g.sf[i] & SF.SEPTAL) !== 0);
  sites.LAF = nearestBy(g, at(p.roots.lafTh, p.roots.lafAb, 22), vEndoLV);
  sites.LPF = nearestBy(g, at(p.roots.lpfTh, p.roots.lpfAb, 22), vEndoLV);
  sites.RVM = nearestBy(g, [-42, -12, 18], (i) => purkOf[i] >= 0 && g.ch[i] === CH.RV);
  sites.RVS = nearestBy(g, at(180, 0.42, 34), (i) => purkOf[i] >= 0 && g.ch[i] === CH.LV && (g.sf[i] & SF.RV_ENDO) !== 0);
  const h = spec.HIS;
  gb.addEdge(h, spec.LBB, 8);
  gb.addEdge(h, spec.RBB, 10);
  gb.addEdge(spec.LBB, spec.LSF, 4); gb.addEdge(spec.LBB, spec.LAF, 4); gb.addEdge(spec.LBB, spec.LPF, 4);
  if (p.fasc.lsf !== null) gb.addEdge(spec.LSF, purkOf[sites.LSF], p.fasc.lsf - 12);
  if (p.fasc.laf !== null) gb.addEdge(spec.LAF, purkOf[sites.LAF], p.fasc.laf - 12);
  if (p.fasc.lpf !== null) gb.addEdge(spec.LPF, purkOf[sites.LPF], p.fasc.lpf - 12);
  if (p.fasc.rbb !== null) { gb.addEdge(spec.RBB, purkOf[sites.RVS], p.fasc.rbb - 10); gb.addEdge(spec.RBB, purkOf[sites.RVM], p.fasc.rbb - 10 + p.mbDelay); }
  // retrograde penetration of the His bundle region from the basal septum (used for concealment only)
  for (let i = 0; i < n; i++) if ((g.sf[i] & SF.SEPTAL) && g.ab[i] > 0.8 && g.tm[i] < 0.3) gb.addEdge(i, spec.RETRO, 6);
  // atrial sites
  const raSurf = (d: Vec3, ax: Vec3 = p.geom.raAx) => { const k = 1 / Math.sqrt((d[0] / ax[0]) ** 2 + (d[1] / ax[1]) ** 2 + (d[2] / ax[2]) ** 2); return add(raC, d, k); };
  sites.SA = nearestBy(g, raSurf(norm(add(add(dSVC, right, 0.55), ant, 0.25))), isRA);
  // ectopic atrial pacemaker (replaces the sinus node): a body-frame direction from the RA centre
  if (p.atrialFocus) sites.SA = nearestBy(g, raSurf(norm(g.bodyToLocalDir(p.atrialFocus))), (i) => g.dom[i] === DOM.A);
  sites.AVNE = nearestBy(g, avnePt, isRA);
  // Bachmann's bundle: chain of atrial nodes along the anterior-superior interatrial groove
  const bbPts: Vec3[] = [];
  const laSurf = (d: Vec3) => { const ax = p.geom.laAx; const k = 1 / Math.sqrt((d[0] / ax[0]) ** 2 + (d[1] / ax[1]) ** 2 + (d[2] / ax[2]) ** 2); return add(laC, d, k); };
  const bbA = raSurf(norm(add(add(up, ant, 0.7), sepN, 0.5))), bbB = laSurf(norm(add(add(up, ant, 0.7), left, 0.3)));
  for (let k = 0; k <= 8; k++) { const s = k / 8; const pt: Vec3 = [bbA[0] + s * (bbB[0] - bbA[0]), bbA[1] + s * (bbB[1] - bbA[1]), bbA[2] + s * (bbB[2] - bbA[2])]; bbPts.push(pt); }
  const bbNodes = bbPts.map((pt) => nearestBy(g, pt, (i) => g.dom[i] === DOM.A));
  for (let k = 0; k + 1 < bbNodes.length; k++) {
    const a = bbNodes[k], b = bbNodes[k + 1]; if (a === b) continue;
    const d = Math.hypot(...([0, 1, 2].map((c) => g.loc[3 * a + c] - g.loc[3 * b + c]) as Vec3));
    gb.addEdge(a, b, d / p.vBB); gb.addEdge(b, a, d / p.vBB);
  }
  gb.addEdge(sites.AVNE, spec.AVN, 0);
  // coronary-sinus musculature: a second interatrial connection from the CS ostium (low posterior RA septum) to the
  // inferior LA wall
  // (its edges are added after the rhythm-specific sites: flutter may place the ostium at the isthmus exit)
  if (p.csDelay !== null) {
    sites.CSOS = nearestBy(g, add(add(add(raC, sepN, 12), [0, -1, 0], 16), post, 14), isRA);
    sites.LAINF = nearestBy(g, laSurf(norm(add(add([0, -1, 0], post, 1.0), left, 0.3))), isLA);
  }
  if (p.septalBridgesOnly && p.fossaBridge) {
    // fossa-ovalis rim: one short bridge across the mid septum
    const mid = add(add(raC, sepN, 0.5 * Math.hypot(laC[0] - raC[0], laC[1] - raC[1], laC[2] - raC[2])), [0, 1, 0], 2);
    const a1 = nearestBy(g, mid, isRA), b1 = nearestBy(g, mid, isLA);
    gb.addEdge(a1, b1, 6); gb.addEdge(b1, a1, 6);
  }
  if (p.ap) {
    sites.APA = nearestBy(g, laSurf(norm(add(add(left, [0, -1, 0], 1.2), post, 0.2))), isLA);
    sites.APV = nearestBy(g, at(p.ap.ventTh, p.ap.ventAb, 31), (i) => g.ch[i] === CH.LV && (g.sf[i] & SF.EPI) !== 0);
    gb.addEdge(sites.APA, spec.AP, 0);
    gb.addEdge(spec.AP, sites.APV, p.ap.delay);
  }
  // rhythm-specific sites
  if (p.rhythm.kind === 'vt') {
    const f = p.rhythm.focus;
    const rr = p.geom.lvEndoR + f.tm * (p.geom.lvEpiR - p.geom.lvEndoR);
    sites.FOCUS = nearestBy(g, at(f.th, f.ab, rr), (i) => g.ch[i] === CH.LV);
    // exit zone (e.g. the border zone of a scar through which a re-entrant wave emerges): all LV nodes within r mm
    const c0 = loc(sites.FOCUS); focusSet.length = 0;
    for (let i = 0; i < n; i++) if (g.ch[i] === CH.LV && Math.hypot(g.loc[3 * i] - c0[0], g.loc[3 * i + 1] - c0[1], g.loc[3 * i + 2] - c0[2]) <= (f.r ?? 0)) focusSet.push(i);
  }
  if (p.rhythm.kind === 'flutter') {
    // isthmus ends: RA floor nodes just outside the isthmus band, most septal (exit, near the CS os) and most lateral
    // (entry). The band itself is the slow zone, represented by one delay edge entry -> exit.
    let bS = -1, bL = -1, vS = -Infinity, vL = Infinity;
    for (let i = 0; i < n; i++) {
      const w = ctiW(i); if (w <= 0.08 || w >= 0.5) continue;
      const v = dot(norm([g.loc[3 * i] - raC[0], 0, g.loc[3 * i + 2] - raC[2]]), sepN);
      const sc = v - 0.04 * (g.loc[3 * i + 1] - raC[1]); // prefer low nodes (the isthmus ends on the floor)
      if (sc > vS) { vS = sc; bS = i; }
      if (v + 0.04 * (g.loc[3 * i + 1] - raC[1]) < vL) { vL = v + 0.04 * (g.loc[3 * i + 1] - raC[1]); bL = i; }
    }
    // the septal end of the isthmus is the coronary-sinus ostium: with csAtExit the CS musculature starts at the
    // isthmus exit, so the wave leaving the isthmus engages the caudal LA at once (LA activated caudo-cranially, as
    // mapped in typical counter-clockwise flutter)
    if (p.rhythm.csAtExit && p.csDelay !== null) sites.CSOS = bS;
    sites.FLUT = bS; sites.CTIL = bL;
    if (p.rhythm.ratio < 0) { gb.addEdge(bS, bL, p.rhythm.ctiDelay); sites.FLUT = bL; } else gb.addEdge(bL, bS, p.rhythm.ctiDelay);
  }
  if (p.csDelay !== null) { gb.addEdge(sites.CSOS, sites.LAINF, p.csDelay); gb.addEdge(sites.LAINF, sites.CSOS, p.csDelay); }
  if (p.rhythm.kind === 'af') {
    p.rhythm.drivers.forEach((d, k) => {
      const dir = norm(g.bodyToLocalDir(d.dir));
      sites['AF' + k] = nearestBy(g, d.ra ? raSurf(dir) : laSurf(dir), (i) => g.dom[i] === DOM.A);
    });
  }
  const graph = gb.build();
  // flutter: the cavotricuspid isthmus band (between the IVC orifice and the tricuspid annulus) conducts only as a slow
  // zone: its myocardial edges are removed and replaced by one delay edge from its lateral to its septal end, which is
  // unidirectional (the functional block that sustains counter-clockwise macro re-entry). Together with the crista
  // terminalis line of block this leaves one circuit: up the septum, over the roof, down the lateral wall, through the
  // isthmus. Cycle length = time round the annulus + isthmus delay.
  if (p.rhythm.kind === 'flutter') {
    for (let i = 0; i < n; i++) {
      if (!isRA(i)) continue;
      for (let e = graph.start[i]; e < graph.start[i + 1]; e++) {
        const j = graph.to[e]; if (j >= n || !isRA(j)) continue;
        if (ctiW(i) >= 0.5 || ctiW(j) >= 0.5) graph.blockUntil[e] = Infinity;
      }
    }
  }
  return { p, g, graph, nMyo: n, purkOf, spec, amp, rest, notch, slope, cls, sites, focusSet, avnLog: [] };
}

export function simulate(m: Model, durMs: number, seed: number): Activations {
  const p = m.p; const R = rng(seed * 104729 + 7);
  const ext: { t: number; node: number }[] = [];
  const t0 = -p.preMs;
  const rh = p.rhythm;
  if (rh.kind === 'sinus' || rh.kind === 'vt') {
    let t = t0 + 20;
    while (t < durMs) { ext.push({ t, node: m.sites.SA }); t += rh.rr * (1 + rh.hrv * gauss(R)); }
  }
  if (rh.kind === 'vt') {
    let t = t0 + 330;
    while (t < durMs) { ext.push({ t, node: m.sites.FOCUS }); for (const i of m.focusSet) ext.push({ t, node: i }); t += rh.cl; }
  }
  if (rh.kind === 'flutter') ext.push({ t: t0, node: m.sites.FLUT });
  if (rh.kind === 'af') {
    rh.drivers.forEach((d, k) => {
      let t = t0 + R() * d.cl;
      while (t < durMs) { ext.push({ t, node: m.sites['AF' + k] }); t += d.cl * (1 + rh.clJitter * gauss(R)); }
    });
  }
  // AV node gate
  const avn = p.avn; const S = m.spec;
  let lastExit = -1e9, erpCur = avn.erp;
  const special = new Set<number>([S.AVN, S.RETRO]);
  const acts = run(m.graph, {
    tEnd: durMs + 600,
    external: ext,
    special,
    onSpecial: (node, t, push) => {
      if (node === S.RETRO) { if (t - lastExit > 260) lastExit = t; return true; }
      const Rr = t - lastExit;
      if (Rr < erpCur) {
        if (avn.conceal > 0 && Rr > 0.55 * erpCur && R() < avn.conceal) lastExit = t - 0.5 * erpCur;
        m.avnLog.push({ t, conducted: false });
        return false;
      }
      const ah = avn.ahMin + avn.ahExt * Math.exp(-(Rr - erpCur) / avn.tauDec);
      push(S.HIS, t + ah);
      lastExit = t;
      erpCur = avn.erp * Math.max(0.6, 1 + avn.jitter * gauss(R));
      m.avnLog.push({ t, conducted: true });
      return true;
    },
  });
  m.acts = acts;
  return acts;
}

