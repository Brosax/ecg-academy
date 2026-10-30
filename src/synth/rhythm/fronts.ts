/**
 * Generated ventricular activation families (DECISION §6.3 "generated families", the ventricular half of frontsynth):
 * ectopic origins (PVC / VT / escape), pacing sites, accessory-pathway fronts and fusion, all from the one region
 * activation graph (heart/activation.ts) and the baked region geometry. Lives in rhythm/ because the scheduler picks
 * the pattern per beat; authored site sets (morph/patterns/sites.ts) take precedence where they exist.
 *
 * Source model. For a uniform double layer the time integral of the dipole of a front that sweeps a volume V at speed
 * v is ∝ V / v along the propagation direction, i.e. the QRS area vector of region r is a_r = k · m_r · ∇t_r (m_r the
 * region mass, ∇t_r the local activation-time gradient in ms/cm, which points along the propagation and grows when
 * conduction is slow). ∇t_r is the least-squares gradient of the face mid-activation times over the region's own two
 * faces (transmural component) and its graph neighbours (tangential component). Each region contributes one bump over
 * its activation window; regions are merged greedily (time overlap and direction) into ≤ MAX_LOBES lobes, each tagged
 * with its member regions (so the near field, the split T timing and the 3D state follow).
 *
 * Calibration (one family scale, DECISION §6.3 / §8.3 step 3): k is set so that the pattern generated from the
 * normal Purkinje exits has the peak spatial magnitude of the authored, PTB-XL-calibrated normal pattern; the two
 * reference checks (RV-apex pacing: LBBB-like with a superior axis; LV lateral origin: RBBB-like) are unit tests
 * (tests/synth/rhythm/fronts.test.ts).
 */
import type { RegionId } from '../../core/regions';
import type { LobeSpec, PacingSite, PathwaySite, Vec3, VentOrigin } from '../api';
import { add, dot, len, scale, sub, unit } from '../frame';
import { VENT_INDEX } from '../heart/anatomy';
import { faceOf, faceWindows, type ActivationInput, type Branch, type ExtraSource, type FaceWindow } from '../heart/activation';
import { FACE_EDGES, VENT_GEOM, VENT_IDS } from '../heart/regionGeom.gen';
import { lobeArea, lobeKernel, type Lobe } from '../kernel/kernel';
import { render } from '../kernel/render';
import { FULL_PREEXCITED_LOBES, NORMAL_PATTERN } from '../morph/patterns';
import { resolveLobe } from '../morph/resolve';
import type { VentPatternInput } from '../morph/ventricular';

type VentId = (typeof VENT_IDS)[number];

/** Upper bound on generated lobes per beat (render cost and smoothness; DECISION §6.3: ≤ 8). */
export const MAX_LOBES = 6;
/** Minimum width of a generated lobe (ms): muscle-to-muscle activation is broad and slurred, with less curvature than
 *  a Purkinje-driven QRS (Surawicz & Knilans: ectopic and paced complexes are slurred, without sharp notches). */
export const MIN_LOBE_MS = 40;
/** Largest local activation-time gradient used (ms/cm ↔ 0.04 cm/ms, transmural muscle): around a point source the
 *  least-squares gradient is an artefact of the radial spread, whose net dipole is small. */
const MAX_GRADIENT = 25;

// ── geometry helpers ──────────────────────────────────────────────────────────────────────────────────────────────
const NF = VENT_IDS.length * 2;
const faceCentroid = (f: number): Vec3 => (f % 2 === 0 ? VENT_GEOM[f >> 1].cEndo : VENT_GEOM[f >> 1].cEpi);
const NEIGHBOURS: readonly number[][] = (() => {
  const nb: number[][] = Array.from({ length: NF }, () => []);
  for (const [a, b] of FACE_EDGES) {
    nb[a].push(b);
    nb[b].push(a);
  }
  return nb;
})();

/** Least-squares gradient of the activation time around region v (ms/cm), from its two faces and their neighbours. */
function regionGradient(v: number, mid: Float64Array): Vec3 {
  const c = VENT_GEOM[v].c;
  const pts: { x: Vec3; t: number; w: number }[] = [];
  for (const f of [2 * v, 2 * v + 1]) {
    if (!Number.isFinite(mid[f])) continue;
    pts.push({ x: faceCentroid(f), t: mid[f], w: 2 });
    for (const g of NEIGHBOURS[f]) if (Number.isFinite(mid[g])) pts.push({ x: faceCentroid(g), t: mid[g], w: 1 });
  }
  if (pts.length < 4) return [0, 0, 0];
  // fit t = t0 + g·(x − c): normal equations of [1, dx, dy, dz]
  const A = Array.from({ length: 4 }, () => new Float64Array(4));
  const b = new Float64Array(4);
  for (const p of pts) {
    const d = sub(p.x, c);
    const row = [1, d[0], d[1], d[2]];
    for (let i = 0; i < 4; i++) {
      b[i] += p.w * row[i] * p.t;
      for (let k = 0; k < 4; k++) A[i][k] += p.w * row[i] * row[k];
    }
  }
  for (let i = 0; i < 4; i++) A[i][i] += 1e-6;
  // Gaussian elimination
  for (let col = 0; col < 4; col++) {
    let p = col;
    for (let r = col + 1; r < 4; r++) if (Math.abs(A[r][col]) > Math.abs(A[p][col])) p = r;
    [A[col], A[p]] = [A[p], A[col]];
    [b[col], b[p]] = [b[p], b[col]];
    for (let r = col + 1; r < 4; r++) {
      const f = A[r][col] / A[col][col];
      for (let k = col; k < 4; k++) A[r][k] -= f * A[col][k];
      b[r] -= f * b[col];
    }
  }
  const x = new Float64Array(4);
  for (let r = 3; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < 4; k++) s -= A[r][k] * x[k];
    x[r] = s / A[r][r];
  }
  const g: Vec3 = [x[1], x[2], x[3]];
  const n = len(g);
  return n > MAX_GRADIENT ? scale(g, MAX_GRADIENT / n) : g;
}

// ── the generator ────────────────────────────────────────────────────────────────────────────────────────────────
interface Part {
  on: number;
  end: number;
  peakW: number;
  area: Vec3;
  /** area of the earlier / later half of the members (rotation dir → dir2) */
  early: Vec3;
  late: Vec3;
  regions: [RegionId, number][];
  mass: number;
}

const dirCos = (a: Vec3, b: Vec3): number => {
  const la = len(a), lb = len(b);
  return la > 0 && lb > 0 ? dot(a, b) / (la * lb) : 0;
};

function partsFrom(windows: readonly FaceWindow[], k: number, keep?: (v: number) => boolean): Part[] {
  let first = Infinity;
  for (const w of windows) if (Number.isFinite(w.t0)) first = Math.min(first, w.t0);
  const mid = new Float64Array(NF);
  windows.forEach((w, f) => (mid[f] = Number.isFinite(w.t0) ? 0.5 * (w.t0 + w.t1) - first : NaN));
  const out: Part[] = [];
  VENT_IDS.forEach((id, v) => {
    const a = windows[2 * v], b = windows[2 * v + 1];
    const lo = Math.min(a.t0, b.t0), hi = Math.max(a.t1, b.t1);
    if (!Number.isFinite(lo) || (keep && !keep(v))) return;
    const g = regionGradient(v, mid);
    const area = scale(g, k * VENT_GEOM[v].mass);
    out.push({ on: lo - first, end: hi - first, peakW: 0.5 * (lo + hi) - first, area, early: area, late: area, regions: [[id as VentId, VENT_GEOM[v].mass]], mass: VENT_GEOM[v].mass });
  });
  return out;
}

function merge(a: Part, b: Part): Part {
  const [x, y] = a.peakW <= b.peakW ? [a, b] : [b, a];
  const la = len(x.area), lb = len(y.area);
  return {
    on: Math.min(a.on, b.on),
    end: Math.max(a.end, b.end),
    peakW: (x.peakW * la + y.peakW * lb) / Math.max(1e-9, la + lb),
    area: add(a.area, b.area),
    early: add(x.early, scale(y.early, 0.25)),
    late: add(y.late, scale(x.late, 0.25)),
    regions: [...a.regions, ...b.regions],
    mass: a.mass + b.mass,
  };
}

/** Greedy agglomeration: merge the pair with the best (time overlap × direction agreement) until ≤ max parts. */
function agglomerate(parts: Part[], max: number): Part[] {
  const ps = [...parts].sort((p, q) => p.peakW - q.peakW);
  const cost = (p: Part, q: Part): number => {
    const ov = Math.min(p.end, q.end) - Math.max(p.on, q.on);
    const span = Math.max(p.end, q.end) - Math.min(p.on, q.on);
    const timeSim = Math.max(0, ov) / Math.max(1, span);
    const dirSim = 0.5 * (1 + dirCos(p.area, q.area));
    // merging small or narrow parts is cheap; the peak-time distance is the main penalty
    const narrow = Math.min(p.end - p.on, q.end - q.on) < MIN_LOBE_MS ? 1 : 0;
    return Math.abs(p.peakW - q.peakW) / 10 + 2 * (1 - dirSim) + (1 - timeSim) - 0.5 * Math.min(1, 1 / (1 + 30 * Math.min(p.mass, q.mass))) - narrow;
  };
  while (ps.length > max) {
    let bi = 0, bc = Infinity;
    // only time-adjacent parts merge (keeps lobes contiguous in time)
    for (let i = 0; i + 1 < ps.length; i++) {
      const c = cost(ps[i], ps[i + 1]);
      if (c < bc) {
        bc = c;
        bi = i;
      }
    }
    ps.splice(bi, 2, merge(ps[bi], ps[bi + 1]));
  }
  return ps;
}

function toLobes(parts: readonly Part[], label: string): LobeSpec[] {
  return parts.map((p, i) => {
    // a narrow part is widened about its peak (area kept, so its amplitude drops), never before the QRS onset
    let on = p.on, end = p.end;
    if (end - on < MIN_LOBE_MS) {
      const c = Math.max(p.peakW, on + MIN_LOBE_MS / 2);
      on = Math.max(0, c - MIN_LOBE_MS / 2);
      end = on + MIN_LOBE_MS;
    }
    const peak = Math.min(end - 0.3 * (end - on), Math.max(on + 0.3 * (end - on), p.peakW));
    const rotate = dirCos(p.early, p.late) < 0.9;
    const dir = unit(rotate ? p.early : p.area);
    const dir2 = rotate ? unit(p.late) : undefined;
    // amplitude so that the lobe's area magnitude equals |Σ a_r|
    const probe: Lobe = { label: '', on, peak, end, endRule: 'edge', q: 2, dir, dir2: dir2 ?? null, amp: 1, regions: p.regions, loc: null, far: 1, wave: 'QRS' };
    const unitArea = len(lobeArea(probe));
    const amp = unitArea > 0 ? len(p.area) / unitArea : 0;
    return { label: `${label} ${i + 1}`, on, peak, end, dir, ...(dir2 ? { dir2 } : {}), amp, regions: p.regions };
  });
}

/** Generated lobes for an activation input (k: family scale). */
/** Lobes whose area is under this fraction of the largest are dropped: an invisible lobe must not set the QRS onset. */
const MIN_LOBE_SHARE = 0.06;

function significant(lobes: LobeSpec[]): LobeSpec[] {
  const areas = lobes.map((l) => len(lobeArea(resolveLobe(l, 'QRS', 'none'))));
  const big = Math.max(0, ...areas);
  return lobes.filter((_, i) => areas[i] >= MIN_LOBE_SHARE * big);
}

/**
 * The exit part of a point source (the source regions alone, or any part narrower than MIN_LOBE_MS) is merged into the front it
 * starts: the radial spread around a point source has little net dipole, and on its own it is a narrow, early lobe —
 * a sharp notch at the start of every ectopic / paced QRS (review defect A14) — instead of the slow, slurred initial
 * upstroke of muscle-to-muscle activation. Applied only with an extra (ectopic, paced, pathway) source: the Purkinje
 * activation of the family-scale reference is left as it is.
 */
function mergeExit(parts: Part[], input: ActivationInput): Part[] {
  if (!input.extra?.length) return parts;
  const src = new Set(input.extra.map((e) => VENT_IDS[e.face >> 1] as string));
  const big = Math.max(0, ...parts.map((p) => len(p.area)));
  // a source-region part with a visible force (an exit that is too small is dropped later as insignificant, so it
  // cannot set the QRS onset: the LV lateral origin's two exits carry 4–9 % of the largest regional force)
  const exitOnly = (p: Part): boolean => p.regions.every(([id]) => src.has(id)) && len(p.area) >= 0.1 * big;
  const ps = [...parts].sort((p, q) => p.peakW - q.peakW);
  // the merged lobe peaks with the front it starts (an exit-weighted peak would leave a shoulder on the upstroke)
  while (ps.length > 1 && (ps[0].end - ps[0].on < MIN_LOBE_MS || exitOnly(ps[0]))) ps.splice(0, 2, { ...merge(ps[0], ps[1]), peakW: ps[1].peakW });
  return ps;
}

export function generateLobes(input: ActivationInput, label: string, k = familyScale()): LobeSpec[] {
  const parts = agglomerate(mergeExit(partsFrom(faceWindows(input), k), input), MAX_LOBES);
  return significant(toLobes(parts.filter((p) => len(p.area) > 1e-9), label));
}

/** Peak spatial magnitude (mV) of a lobe set (rendered at 1 kHz, far field only). */
export function peakMagnitude(lobes: readonly LobeSpec[]): number {
  const ks = lobes.map((l) => lobeKernel(resolveLobe(l, 'QRS', 'none'), 0, -1));
  const lo = Math.floor(Math.min(...ks.map((k) => k.s0))), hi = Math.ceil(Math.max(...ks.map((k) => k.s1)));
  const r = render(ks, 1000, hi - lo + 1, lo, 0);
  let best = 0;
  for (let i = 0; i < r.n; i++) best = Math.max(best, Math.hypot(r.H[0][i], r.H[1][i], r.H[2][i]));
  return best;
}

/**
 * Gain of the ectopic / paced family relative to the normal-matched scale. The coherent, slow muscle-to-muscle
 * activation of an ectopic beat sums with little cancellation, so the raw scale makes paced and ectopic QRS complexes
 * about twice as large as recorded ones. Calibrated on the two references of DECISION §6.3: RV-apex pacing with a
 * deepest precordial S of ≈ 2.5–3 mV and QS in II, III, aVF of ≈ 0.6–1 mV, and an LV lateral origin with a dominant R in
 * V1 of ≈ 1 mV (Surawicz B, Knilans TK, Chou's Electrocardiography, 6th ed., paced and ectopic complexes).
 */
export const FAMILY_GAIN = 0.7;

let FAMILY_K: number | null = null;
/** Family scale: the generated normal (Purkinje exits only) matches the authored normal's peak magnitude, × FAMILY_GAIN. */
export function familyScale(): number {
  if (FAMILY_K === null) {
    const gen = agglomerate(partsFrom(faceWindows({}), 1), MAX_LOBES);
    const ref = peakMagnitude(NORMAL_PATTERN.lobes);
    const g = peakMagnitude(toLobes(gen, 'probe'));
    FAMILY_K = (g > 0 ? ref / g : 1) * FAMILY_GAIN;
  }
  return FAMILY_K;
}

// ── sites ────────────────────────────────────────────────────────────────────────────────────────────────────────
const src = (id: VentId, face: 0 | 1, t = 0, h = 8): ExtraSource => ({ face: faceOf(id, face), t, h });

/** Activation input per ectopic origin (escape and ectopic foci start in the muscle; fascicular ones in the Purkinje). */
export const ORIGIN_INPUT: Readonly<Record<Exclude<VentOrigin, 'junctional'>, ActivationInput>> = {
  'rvot-septal': { noPurkinje: true, extra: [src('lv-basal-anteroseptal', 1), src('rv-outflow', 0, 6)] },
  'rvot-free': { noPurkinje: true, extra: [src('rv-outflow', 1)] },
  'rv-free-wall': { noPurkinje: true, extra: [src('rv-mid', 1)] },
  'rv-apex': { noPurkinje: true, extra: [src('rv-apical', 0)] },
  'lvot-cusp': { noPurkinje: true, extra: [src('lv-basal-anteroseptal', 0), src('lv-basal-anterior', 0, 6)] },
  'lv-basal-inferolateral': { noPurkinje: true, extra: [src('lv-basal-inferolateral', 0)] },
  // mid-to-basal lateral wall (a single mid-anterolateral seed gives one coherent, featureless monophasic QRS whose
  // T rivals it in slope; the two-seed exit keeps the RBBB-like, rightward-inferior pattern of LV lateral PVCs)
  'lv-lateral': { noPurkinje: true, extra: [src('lv-mid-anterolateral', 0), src('lv-basal-anterolateral', 0, 4)] },
  'lv-apex': { noPurkinje: true, extra: [src('lv-apex', 0)] },
  'lv-anterior-scar': { noPurkinje: true, extra: [src('lv-apical-anterior', 0), src('lv-mid-anterior', 0, 8, 10)], speed: { 'lv-apical-anterior': 0.6, 'lv-mid-anterior': 0.7 } },
  'lv-inferior-scar': { noPurkinje: true, extra: [src('lv-apical-inferior', 0), src('lv-mid-inferior', 0, 6, 10)] },
  // fascicular: the impulse exits through one fascicle's Purkinje network, the others are reached retrogradely
  // through the Purkinje later; the right bundle is reached last (RBBB-like, QRS 110–140)
  'fascicular-posterior': { blocks: { rbb: 'complete' }, branchDelay: { LAF: 26, LSF: 14 } },
  'fascicular-anterior': { blocks: { rbb: 'complete' }, branchDelay: { LPF: 26, LSF: 14 } },
};

/** Pacing lead tips (ventricular sites; 'ra-appendage' is atrial and handled by the atrial family). */
export const PACING_INPUT: Readonly<Record<Exclude<PacingSite, 'ra-appendage'>, ActivationInput>> = {
  'rv-apex': { noPurkinje: true, extra: [src('rv-apical', 0, 0, 6)] },
  'rv-septal': { noPurkinje: true, extra: [src('lv-mid-anteroseptal', 1, 0, 6)] },
  rvot: { noPurkinje: true, extra: [src('rv-outflow', 0, 0, 6)] },
  'lv-lateral-epicardial': { noPurkinje: true, extra: [src('lv-mid-anterolateral', 1, 0, 6)] },
  // His-bundle pacing: the normal sequence (selective capture); LBB-area pacing: left Purkinje first, RV late
  his: {},
  'lbb-area': { branchDelay: { RBB: 28 } },
};

/** Biventricular pacing: RV apex and an LV lead on the mid lateral wall (lateral coronary-vein branch, the usual CRT
 *  target; it spans the two mid-lateral faces of the region graph), all fronts at t = 0 (min of arrivals): QRS ≈ 135 ms,
 *  narrower than RV apical pacing (≈ 158 ms), negative lead I and a right-superior axis — the usual BiV pattern. */
export const BIV_INPUT: ActivationInput = {
  noPurkinje: true,
  extra: [src('rv-apical', 0, 0, 6), src('lv-mid-anterolateral', 1, 0, 6), src('lv-mid-inferolateral', 1, 0, 6)],
};

/** Accessory-pathway ventricular insertions (annulus, epicardial side). */
export const PATHWAY_INSERTION: Readonly<Record<PathwaySite, readonly ExtraSource[]>> = {
  'left-lateral': [src('lv-basal-anterolateral', 1)],
  'left-posterolateral': [src('lv-basal-inferolateral', 1)],
  'posteroseptal-left': [src('lv-basal-inferoseptal', 0)],
  'posteroseptal-right': [src('lv-basal-inferoseptal', 1)],
  'right-free-wall': [src('rv-basal', 1)],
  'right-anteroseptal': [src('lv-basal-anteroseptal', 1)],
  midseptal: [src('lv-mid-inferoseptal', 1)],
};

const ALL_BRANCHES: readonly Branch[] = ['LSF', 'LAF', 'LPF', 'RBB'];

/**
 * Retrograde engagement of the His–Purkinje system by a fully pre-excited front (ms after the delta onset): the
 * muscle front from the insertion reaches the Purkinje network, which is then activated retrogradely and conducts into
 * the regions the muscle front has not reached yet. Without it a basal insertion activates the ventricles muscle to
 * muscle in ≈ 185 ms; with it the fully pre-excited QRS is ≈ 160 ms (clinical range of maximal pre-excitation 140–180).
 */
export const PREEXCITED_HP_ENGAGE_MS = 85;

/** Fully pre-excited activation from a pathway insertion (the AV node takes no part antegradely). */
export function preexcitedInput(site: PathwaySite, _nodalOffsetMs: null = null): ActivationInput {
  const d = PREEXCITED_HP_ENGAGE_MS;
  return { extra: PATHWAY_INSERTION[site], branchDelay: { LSF: d, LAF: d, LPF: d, RBB: d } };
}

/** The pathway's muscle front alone (fusion with the AV-nodal front, which engages the His–Purkinje antegradely). */
export function pathwayFrontInput(site: PathwaySite): ActivationInput {
  return { noPurkinje: true, extra: PATHWAY_INSERTION[site] };
}

const PATTERN_CACHE = new Map<string, VentPatternInput>();

/** A generated pattern (cached by key). */
export function generatedPattern(key: string, input: ActivationInput, label: string): VentPatternInput {
  let p = PATTERN_CACHE.get(key);
  if (!p) {
    p = { key, lobes: generateLobes(input, label), activation: input };
    if (PATTERN_CACHE.size > 128) PATTERN_CACHE.clear();
    PATTERN_CACHE.set(key, p);
  }
  return p;
}

/** The fully pre-excited pattern of a pathway: the authored set where one exists (morph/patterns/sites.ts ›
 *  FULL_PREEXCITED_LOBES: base → apex, Steurer-consistent V4–V6), else generated; region timing from the graph. */
export function fullPreexcitedPattern(site: PathwaySite): VentPatternInput {
  const authored = FULL_PREEXCITED_LOBES[site];
  const key = `preexcited:${site}:full`;
  return authored ? { key, lobes: authored, activation: preexcitedInput(site) } : generatedPattern(key, preexcitedInput(site), 'pre-excited');
}

/**
 * Fusion (DECISION §6.3): a ventricular front `focus` (starting at 0) and the authored conducted pattern `native`
 * whose Purkinje exits fire `lagMs` later (negative: the conducted front leads). Each region is taken by whichever
 * front reaches it first (region graph with both sources). The authored lobes keep their shape, scaled by the share
 * of their tagged regions still reached by their own front; the focus' lobes are generated for the regions it captures.
 */
export function fusedPattern(key: string, native: VentPatternInput, focus: ActivationInput, lagMs: number): VentPatternInput {
  const hit = PATTERN_CACHE.get(key);
  if (hit) return hit;
  const lead = Math.min(0, lagMs);
  const shiftExtra = (e: ExtraSource): ExtraSource => ({ ...e, t: e.t - lead });
  const delay = Object.fromEntries(ALL_BRANCHES.map((b) => [b, Math.max(0, lagMs) + (native.activation.branchDelay?.[b] ?? 0)])) as Partial<Record<Branch, number>>;
  const fusedIn: ActivationInput = { ...native.activation, branchDelay: delay, extra: [...(native.activation.extra ?? []), ...(focus.extra ?? []).map(shiftExtra)], ...(focus.speed ? { speed: focus.speed } : {}) };
  const focusIn: ActivationInput = { ...focus, extra: (focus.extra ?? []).map(shiftExtra) };
  const nativeIn: ActivationInput = { ...native.activation, branchDelay: delay };
  const wF = faceWindows(fusedIn), wFocus = faceWindows(focusIn), wNat = faceWindows(nativeIn);
  const first = (w: readonly FaceWindow[]): number => Math.min(...w.filter((x) => Number.isFinite(x.t0)).map((x) => x.t0));
  const midOf = (w: readonly FaceWindow[], v: number): number => {
    const a = w[2 * v], b = w[2 * v + 1];
    const xs = [a, b].filter((x) => Number.isFinite(x.t0)).map((x) => 0.5 * (x.t0 + x.t1));
    return xs.length ? Math.min(...xs) : Infinity;
  };
  const byFocus = VENT_IDS.map((_, v) => midOf(wFocus, v) < midOf(wNat, v));
  const share = (regions: readonly (readonly [RegionId, number])[]): number => {
    let s = 0, n = 0;
    for (const [id, w] of regions) {
      const v = VENT_INDEX[id];
      if (v === undefined) continue;
      n += w;
      if (!byFocus[v]) s += w;
    }
    return n > 0 ? s / n : 1;
  };
  const shift = first(wNat) - first(wF);
  const nativeLobes: LobeSpec[] = native.lobes.map((l) => ({ ...l, on: l.on + shift, peak: l.peak + shift, end: l.end + shift, amp: l.amp * share(l.regions) })).filter((l) => l.amp > 1e-4);
  const focusParts = agglomerate(mergeExit(partsFrom(wF, familyScale(), (v) => byFocus[v]), focus), 4).filter((p) => len(p.area) > 1e-9);
  const p: VentPatternInput = { key, lobes: significant([...nativeLobes, ...toLobes(focusParts, 'fusion: ectopic front')]), activation: fusedIn };
  if (PATTERN_CACHE.size > 128) PATTERN_CACHE.clear();
  PATTERN_CACHE.set(key, p);
  return p;
}
