/**
 * Ventricular morphology builder (DECISION §6.3 composition precedence): activation pattern → substrate → conduction
 * stretch → repolarisation (split T) → injury → near-field extras → geometry. One VentMorph per distinct pattern key;
 * `instantiateVent` turns it into the kernels of one beat (shift, JT rate law, alternans, per-beat rotation).
 *
 * Every ventricular lobe carries a location (default 'regions': the weighted centroid of its tagged regions), so the
 * near-field term and the electrode placement act on all of them (DECISION §0.3).
 */
import type { RegionId } from '../../core/regions';
import type { StdLead } from '../../core/leads';
import type { GeometrySpec, InjurySpec, LobeSpec, NearFieldSpec, RepolSpec, SubstrateSpec, Vec3 } from '../api';
import { add, apply, IDENTITY, isIdentity, len, mul, rotationMatrix, scale, sub, unit, type Mat3 } from '../frame';
import { activationTiming, type ActivationInput, type RegionTiming } from '../heart/activation';
import { isVentricular, massCentroid, REGION_INDEX, ventGeom, weightedCentroid } from '../heart/anatomy';
import { apdDelta, applyDelta, NORMAL_APD_MAP } from '../heart/apd';
import { resolveWhere } from '../heart/territories';
import { lobeArea, lobeKernel, lobeWithArea, mapLobeTimes, mapPlateauTimes, plateauKernel, rotateLobe, rotatePlateau, type Kernel, type Lobe, type Plateau } from '../kernel/kernel';
import { potentialsAt } from '../kernel/render';
import { leadAt } from '../leads/assemble';
import { STANDARD_HOOKUP } from '../leads/electrodes';
import { jtScale, scaleAfterJ, type JtLaw } from '../rhythm/rate';
import { injuryPlateaus } from './injury';
import { nearFieldLobes } from './nearfield';
import { NORMAL_PATTERN } from './patterns/normal';
import { buildRepol, MASS_LOBE, memoryQrsArea, primaryTiming, type TTiming } from './repol';
import { resolveLobe } from './resolve';

/** Ventricular lobes carry their regions' centroid as the near-field location (set false only to reproduce B). */
export const VENTRICULAR_NEAR_FIELD = true;

/** Target total T area of the normal heart (mV·ms, Frank): clinical T axis ≈ +40°, upright V2–V6. */
export const NORMAL_T_AREA: Vec3 = [39.3, 14.1, -22.4];

export interface VentPatternInput {
  readonly key: string;
  readonly lobes: readonly LobeSpec[];
  readonly activation: ActivationInput;
  /** the pattern's own phase-2 J shift (PatternDef.plateauSlope), used when the RepolSpec sets none */
  readonly plateauSlope?: number;
}

export interface VentBuildInput {
  readonly pattern: VentPatternInput;
  readonly substrate?: SubstrateSpec;
  readonly repol?: RepolSpec;
  readonly injury?: readonly InjurySpec[];
  readonly nearField?: readonly NearFieldSpec[];
  readonly geometry?: GeometrySpec;
  /** natural variability of the activation lobes (seeded, applied before everything else) */
  readonly jitterLobe?: (l: Lobe, i: number) => Lobe;
  /** natural variability of the gradient */
  readonly jitterG?: (g: Vec3) => Vec3;
  /** RR (ms) of the dominant rhythm: the injury amplitude is solved at this rate */
  readonly refRrMs: number;
  /** override of the normal gradient (calibration scripts only) */
  readonly gNormal?: Vec3;
}

export interface VentMorph {
  readonly key: string;
  /** QRS lobes, relative to QRS onset */
  readonly qrs: readonly Lobe[];
  readonly qrsOn: number;
  readonly qrsOff: number;
  /** J-wave end relative to J (truth j), null when absent */
  readonly jEnd: number | null;
  /** T parts, ST lobe, U, near-field extras: relative to J at RR 1000 */
  readonly post: readonly Lobe[];
  /** injury plateaus: relative to J at RR 1000 */
  readonly plateaus: readonly Plateau[];
  readonly primaryIdx: readonly number[];
  readonly tPrimary: TTiming;
  readonly uEnd: number | null;
  readonly law: JtLaw;
  readonly timing: RegionTiming;
  /** solved injury amplitudes (mV, spatial) and their reference leads */
  readonly injury: readonly { readonly amp: number; readonly ref: StdLead }[];
  readonly G: Vec3;
  readonly aQrs: Vec3;
  readonly tArea: Vec3;
  /** fraction of the primary gradient alternating beat to beat (T-wave alternans; 0 = none) */
  readonly alternans: number;
  /** swinging heart (electrical alternans): the heart's position alternates every `everyBeats` beats */
  readonly swing: { readonly rot: Mat3; readonly shiftCm: Vec3; readonly gain: number; readonly everyBeats: number } | null;
}

const resolveV = (s: LobeSpec): Lobe => resolveLobe(s, 'QRS', VENTRICULAR_NEAR_FIELD ? 'regions' : 'none');
const locOf = (regions: readonly (readonly [RegionId, number])[]): Vec3 | null => (VENTRICULAR_NEAR_FIELD ? weightedCentroid(regions) : null);

/** QRS area of the normal base pattern and the normal gradient G = A_QRS + A_T (Wilson; B's gradientFor). */
export const NORMAL_QRS_AREA: Vec3 = NORMAL_PATTERN.lobes.map(resolveV).reduce<Vec3>((s, l) => add(s, lobeArea(l)), [0, 0, 0]);
export const G_NORMAL: Vec3 = add(NORMAL_QRS_AREA, NORMAL_T_AREA);

const LV_FREE = (id: RegionId): boolean => id.startsWith('lv-') && !id.includes('septal');

function lvFreeFraction(l: Lobe): number {
  let s = 0, f = 0;
  for (const [id, w] of l.regions) {
    if (!isVentricular(id)) continue;
    s += w;
    if (LV_FREE(id)) f += w;
  }
  return s > 0 ? f / s : 0;
}

/**
 * Necrosis coefficient k_N (mV·ms per unit region mass): the outward wall-crossing force a fully necrotic region no
 * longer contributes (DECISION §6.5). Calibrated (2026-10-17, catalogue old-mi variants) holding the normal base fixed:
 * anterior scar τ 0.9 → QS V1–V3 of 0.6–1.1 mV; inferior → Q ≥ 40 ms in III / aVF with a residual r in II; lateral
 * τ 1 → Q ≥ 30 ms in I, aVL, V6. (330 gave QS complexes deeper than 1.5 mV.)
 */
export const K_N = 220;
/**
 * RV hypertrophy force (mV per unit of rvMass − 1): a rightward-anterior lobe of the thickened RV free wall peaking in
 * the second half of the QRS, and the share of the LV free-wall force it cancels (DECISION §6.3 "reduces LV
 * dominance"; the share fades as lvMass⁻⁴ so a hypertrophied LV keeps its own force in biventricular hypertrophy).
 * Calibrated (2026-10-17) on the RVH criteria at rvMass 3: R/S V1 > 1 with R ≥ 0.7 mV, axis > +90°, S in V5–V6.
 */
export const K_RV = { amp: 0.5, lvLoss: 0.28 } as const;
/**
 * Unmasked force of a slowed region (mV·ms per unit region mass at full phase separation) and the delay at which half
 * of it is out of phase with the rest of the ventricles (ms). Same order as the necrosis coefficient K_N (the force a
 * wall contributes when nothing cancels it). Calibrated (2026-10-19) on Na-channel blockade (terminal R in aVR
 * ≥ 0.3 mV with R/S ≥ 0.7 at a 30 ms RVOT / basal RV delay) and ARVC (terminal activation duration ≥ 55 ms in V1–V3).
 */
export const K_SLOW = 300;
export const SLOW_PHASE_MS = 20;
/** Direction of the RV hypertrophy force (Frank: rightward, anterior, inferior). */
export const RV_HYPERTROPHY_DIR: Vec3 = unit([-0.72, 0.42, -0.56]);
const RV_TAGS: readonly (readonly [RegionId, number])[] = [['rv-mid', 1], ['rv-basal', 1], ['rv-apical', 0.7], ['rv-outflow', 0.7]];

/** Share of a lobe's tagged (mass-weighted) regions that lies in a region set. */
function regionShare(l: Lobe, set: ReadonlySet<RegionId>): number {
  let s = 0, f = 0;
  for (const [id, w] of l.regions) {
    if (!isVentricular(id) || w <= 0) continue;
    const m = w * ventGeom(id).mass;
    s += m;
    if (set.has(id)) f += m;
  }
  return s > 0 ? f / s : 0;
}

/** Mass-weighted direction of late activation in a region set: half propagation (centre → region), half transmural. */
function lateDirection(ids: readonly RegionId[]): Vec3 {
  let v: Vec3 = [0, 0, 0];
  for (const id of ids) {
    if (!isVentricular(id)) continue;
    const g = ventGeom(id);
    v = add(v, scale(add(scale(unit(g.c), 0.5), scale(g.n, 0.5)), g.mass));
  }
  return len(v) > 0 ? unit(v) : [0, 0, -1];
}

/** Velocity factor of the region graph for slowed regions (3D timeline and split-T timing). */
export function slowSpeed(s: SubstrateSpec | undefined): Partial<Record<RegionId, number>> | undefined {
  if (!s?.slow?.length) return undefined;
  const out: Partial<Record<RegionId, number>> = {};
  for (const sl of s.slow) for (const id of resolveWhere(sl.where)) if (isVentricular(id)) out[id] = Math.min(out[id] ?? 1, 1 / (1 + sl.delayMs / 25));
  return out;
}

/**
 * Substrate operators on the QRS lobes (DECISION §6.3), in order: LV mass, RV mass, septum, slow regions, necrosis,
 * conduction stretch. Returns the lobes and the QRS area the changed myocardium added (it is added to the gradient, so
 * a substrate change does not by itself invert the T: the dead or extra wall carries its own repolarisation; primary
 * changes come from ApdChange).
 */
function applySubstrate(lobes: readonly Lobe[], s: SubstrateSpec | undefined, timing: RegionTiming): { lobes: Lobe[]; dMass: Vec3 } {
  let out = [...lobes];
  let dMass: Vec3 = [0, 0, 0];
  if (!s) return { lobes: out, dMass };
  const m = s.lvMass ?? 1;
  if (m !== 1) {
    out = out.map((l) => {
      const f = lvFreeFraction(l);
      if (f < 0.4) return l;
      const d = (m - 1) * f;
      const k = 1 + d;
      const w = Math.cbrt(1 + d);
      const before = lobeArea(l);
      // thicker free wall: larger, longer and more posterior force (R-peak time ↑, posterior displacement of the loop).
      // The extra wall adds a posterior-superior component ON TOP of the scaled force (the leftward part keeps growing
      // with the mass: tall R in V5–V6 and deep S in V1–V2 together)
      const u0 = unit(l.dir);
      const v: Vec3 = [u0[0], u0[1] - 0.15 * d, u0[2] + 0.35 * d];
      const nl: Lobe = {
        ...l, amp: l.amp * k * len(v), peak: l.on + (l.peak - l.on) * w, end: l.on + (l.end - l.on) * w, dir: unit(v),
      };
      dMass = add(dMass, sub(lobeArea(nl), before));
      return nl;
    });
  }
  const rv = s.rvMass ?? 1;
  if (rv !== 1) {
    // thickened RV free wall: its force (rightward-anterior, peaking in the second half of the QRS) now rivals the LV
    // free wall, which loses part of its net force by cancellation
    const d = rv - 1;
    // a hypertrophied LV (biventricular hypertrophy) keeps its own dominance: the cancellation share fades with lvMass
    const loss = K_RV.lvLoss / Math.max(1, m) ** 4;
    out = out.map((l) => {
      const f = lvFreeFraction(l);
      if (f < 0.4) return l;
      const nl = { ...l, amp: l.amp * Math.max(0.3, 1 - loss * d * f) };
      dMass = add(dMass, sub(lobeArea(nl), lobeArea(l)));
      return nl;
    });
    const w = Math.cbrt(1 + 0.3 * d);
    const rvLobe: Lobe = {
      label: `${MASS_LOBE}RV hypertrophy`, on: 18, peak: 18 + 36 * w, end: 18 + 64 * w, endRule: 'edge', q: 2, dir: RV_HYPERTROPHY_DIR, dir2: null,
      amp: K_RV.amp * d, regions: RV_TAGS, loc: locOf(RV_TAGS), far: 1, wave: 'QRS',
    };
    out.push(rvLobe);
    dMass = add(dMass, lobeArea(rvLobe));
  }
  // septum: > 1 hypertrophied septum (HCM: deep narrow septal q in I, aVL, V5–V6); < 0 reversed (right-to-left)
  // septal activation of acute RV pressure overload (the septum bulges into the LV and is activated from the RV side:
  // initial q in III and V1 — the Q3 of S1Q3T3, the qR in V1 of acute cor pulmonale)
  if (s.septum !== undefined && s.septum !== 1) {
    const k = s.septum;
    out = out.map((l, i) => {
      if (!(i === 0 || /septal/.test(l.label))) return l;
      const nl = { ...l, amp: l.amp * Math.abs(k), dir: k < 0 ? scale(l.dir, -1) : l.dir, dir2: l.dir2 && k < 0 ? scale(l.dir2, -1) : l.dir2 };
      // the extra (or reversed) septal force is substrate: like LV mass, it carries its own repolarisation share
      dMass = add(dMass, sub(lobeArea(nl), lobeArea(l)));
      return nl;
    });
  }
  // slow regions (ARVC, peri-infarct block, Na-channel blockade of the RV outflow), two effects of one delay:
  //  (a) the part of every lobe that belongs to the slowed regions is activated `delayMs` later, cell to cell (lower,
  //      longer), toward those regions (the moved force);
  //  (b) activated out of phase with the rest of the ventricles, the slowed wall's own force is no longer cancelled by
  //      the opposite wall activated at the same time (RBBB physics): an unmasked force K_SLOW·Σ m_r·ĉ_r·φ(delay) along
  //      the propagation direction into the region (centre → region), φ = delay / (delay + SLOW_PHASE_MS)
  // Both form ONE late lobe (separate lobes would notch the terminal QRS).
  for (const sl of s.slow ?? []) {
    const ids = resolveWhere(sl.where).filter(isVentricular);
    if (!ids.length || sl.delayMs <= 0) continue;
    const set = new Set<RegionId>(ids);
    let moved = 0, t0 = Infinity, t1 = -Infinity;
    out = out.map((l) => {
      const share = regionShare(l, set);
      if (share <= 0) return l;
      moved += share * len(lobeArea(l));
      return { ...l, amp: l.amp * (1 - share) };
    });
    for (const id of ids) {
      const i = REGION_INDEX[id];
      if (!Number.isFinite(timing.t0[i])) continue;
      t0 = Math.min(t0, timing.t0[i]);
      t1 = Math.max(t1, timing.t1[i]);
    }
    if (!Number.isFinite(t0)) continue;
    const phase = sl.delayMs / (sl.delayMs + SLOW_PHASE_MS);
    const unmasked = ids.reduce<Vec3>((a, id) => add(a, scale(unit(ventGeom(id).c), K_SLOW * ventGeom(id).mass * phase)), [0, 0, 0]);
    const area = add(scale(lateDirection(ids), moved), unmasked);
    if (len(area) <= 0) continue;
    const tags = ids.map((id) => [id, 1] as const);
    const late = lobeWithArea({
      label: `slow conduction (${ids.length} regions)`, on: t0 + 0.5 * sl.delayMs, peak: 0.5 * (t0 + t1) + sl.delayMs, end: t1 + sl.delayMs,
      endRule: 'edge', q: 2, regions: tags, loc: locOf(tags), far: 1, wave: 'QRS',
    }, area);
    out.push(late);
    // the slowed wall still repolarises with its own gradient share: only the redistribution enters the T (secondary)
  }
  // necrosis (Q waves): each scar region r with transmurality τ loses its outward wall-crossing force −τ·k_N·m_r·n_r
  // over its activation window in THIS pattern (old MI inside a bundle-branch block uses that block's windows). The
  // regions of one scar are one contiguous wall: their lost forces form one smooth lobe over the union of their
  // windows, peaking at the area-weighted early part of the windows (separate lobes per region notched the QRS)
  if (s.scar?.length) {
    const qrsOn = Math.min(...out.map((l) => l.on));
    const qrsOff = Math.max(...out.map((l) => l.end));
    const clampT = (t: number): number => Math.max(qrsOn, Math.min(qrsOff - 2, t));
    for (const sc of s.scar) {
      const tau = Math.min(1, Math.max(0, sc.transmurality));
      if (tau <= 0) continue;
      let area: Vec3 = [0, 0, 0];
      let on = Infinity, end = -Infinity, tw = 0, w = 0;
      const ids: RegionId[] = [];
      for (const id of resolveWhere(sc.where)) {
        if (!isVentricular(id)) continue;
        const i = REGION_INDEX[id];
        if (!Number.isFinite(timing.t0[i])) continue;
        const g = ventGeom(id);
        const a = scale(g.n, -tau * K_N * g.mass);
        const r0 = clampT(timing.t0[i]), r1 = Math.max(r0 + 16, clampT(timing.t1[i]));
        area = add(area, a);
        on = Math.min(on, r0);
        end = Math.max(end, r1);
        tw += len(a) * (r0 + 0.32 * (r1 - r0));
        w += len(a);
        ids.push(id);
      }
      if (!ids.length || len(area) === 0) continue;
      end = Math.min(qrsOff - 2, Math.max(on + 16, end));
      const peak = Math.max(on + 6, Math.min(end - 6, tw / w));
      const tags = ids.map((id) => [id, 1] as const);
      const nl = lobeWithArea({
        label: `${MASS_LOBE}necrosis (${ids.length} regions)`, on, peak, end, endRule: 'edge', q: 2, regions: tags, loc: massCentroid(ids), far: 1, wave: 'QRS',
      }, area);
      out.push(nl);
      dMass = add(dMass, lobeArea(nl));
      if (sc.fragmented) {
        // border-zone fragments: two small opposite deflections late in the scar's window (fQRS notches)
        const a = 0.06 + 0.06 * tau;
        const mid = on + 0.65 * (end - on);
        const n = unit(scale(area, -1));
        const loc = massCentroid(ids);
        out.push({ label: 'fragment (+)', on: mid - 9, peak: mid - 3, end: mid + 3, endRule: 'edge', q: 2, dir: n, dir2: null, amp: a, regions: tags, loc, far: 1, wave: 'QRS' });
        out.push({ label: 'fragment (−)', on: mid + 1, peak: mid + 7, end: mid + 13, endRule: 'edge', q: 2, dir: scale(n, -1), dir2: null, amp: a, regions: tags, loc, far: 1, wave: 'QRS' });
      }
    }
  }
  const k = s.conduction ?? 1;
  if (k !== 1) out = out.map((l) => ({ ...mapLobeTimes(l, (t) => t * k), amp: l.amp * k ** -0.3 }));
  return { lobes: out, dMass };
}

function geometryMatrix(g: GeometrySpec | undefined): Mat3 {
  if (!g) return IDENTITY;
  return rotationMatrix(g.frontalDeg ?? 0, g.transverseDeg ?? 0, g.sagittalDeg ?? 0);
}

const MIRROR: Mat3 = [-1, 0, 0, 0, 1, 0, 0, 0, 1];

/** The orientation of the heart (rotation, then the dextrocardia mirror) applied to every ventricular source. */
export function heartMatrix(g: GeometrySpec | undefined): Mat3 {
  return g?.mirror ? mul(MIRROR, geometryMatrix(g)) : geometryMatrix(g);
}

/** Build one ventricular morphology. */
export function buildVentricular(inp: VentBuildInput): VentMorph {
  // 1. activation pattern (+ natural variability)
  let qrs = inp.pattern.lobes.map(resolveV);
  if (inp.jitterLobe) qrs = qrs.map((l, i) => inp.jitterLobe!(l, i));
  const qrs0 = Math.max(...qrs.map((l) => l.end)) - Math.min(...qrs.map((l) => l.on));
  // region timing of this pattern (slowed regions slow the graph too): necrosis windows, split-T timing, 3D
  const delta = apdDelta(inp.repol?.apd);
  const apd = delta.regions.length ? applyDelta(NORMAL_APD_MAP, delta) : NORMAL_APD_MAP;
  const speed = slowSpeed(inp.substrate);
  const baseTiming = activationTiming(inp.pattern.activation, apd);
  const timing = speed ? activationTiming({ ...inp.pattern.activation, speed }, apd) : baseTiming;
  // 2–3. substrate and conduction stretch (lobe windows from the pattern's own timing: the slow-region delay is added
  // explicitly, the slowed graph only drives the 3D timeline and the split-T timing)
  const sub_ = applySubstrate(qrs, inp.substrate, baseTiming);
  qrs = sub_.lobes;
  const qrsOn = Math.min(...qrs.map((l) => l.on));
  const qrsOff = Math.max(...qrs.map((l) => l.end));
  // 4. repolarisation (cardiac memory: the gradient keeps a share of the remembered pattern's QRS area)
  let G = scale(add(inp.gNormal ?? G_NORMAL, sub_.dMass), inp.repol?.gScale ?? 1);
  if (inp.repol?.memory) G = add(G, scale(memoryQrsArea(inp.repol.memory.from), inp.repol.memory.weight));
  if (inp.jitterG) G = inp.jitterG(G);
  const ps = inp.repol?.plateauSlope ?? inp.pattern.plateauSlope;
  const repolSpec = ps !== undefined && inp.repol?.plateauSlope === undefined ? { ...inp.repol, plateauSlope: ps } : inp.repol;
  const rep = buildRepol({ qrs, qrsOff, qrs0, timing, apd, delta, G, spec: repolSpec, locOf, stFromActivation: inp.repol?.plateauSlope === undefined && ps !== undefined });
  let post: Lobe[] = [...rep.lobes];
  let tPrimary = rep.tPrimary;
  let uEnd = rep.uEnd;
  // 6. near-field extras (5. injury below: it needs the finished beat for its solve)
  const nf = nearFieldLobes(inp.nearField);
  let jEnd = nf.jEnd;
  let qrsEnd = qrsOff;
  if (nf.domeMs > 0 && nf.jEnd !== null) {
    // an Osborn dome is a terminal QRS deflection, read as part of the QRS (its end is the J point): the J wave joins
    // the QRS lobes, the QRS ends after it, and repolarisation keeps its absolute timing (QT unchanged)
    const d = nf.jEnd;
    for (const l of nf.lobes) {
      if (l.wave === 'J') qrs.push(mapLobeTimes(l, (u) => u + qrsOff));
      else post.push(mapLobeTimes(l, (u) => u - d));
    }
    post = post.map((l, i) => (i < rep.lobes.length ? mapLobeTimes(l, (u) => u - d) : l));
    tPrimary = { on: tPrimary.on - d, peak: tPrimary.peak - d, end: tPrimary.end - d };
    uEnd = uEnd !== null ? uEnd - d : null;
    qrsEnd = qrsOff + d;
    jEnd = null;
  } else post.push(...nf.lobes);
  const pt = primaryTiming(inp.repol, qrs0);
  const law: JtLaw = { qtc: pt.qtc, qrs0, jtRef: pt.jtRef };
  // 7. geometry (rotation of the heart, then the mirror image of dextrocardia)
  const m: Mat3 = heartMatrix(inp.geometry);
  const ident = isIdentity(m);
  const rot = (l: Lobe): Lobe => (ident ? l : rotateLobe(l, m));
  const rotP = (p: Plateau): Plateau => (ident ? p : rotatePlateau(p, m));
  qrs = qrs.map(rot);
  post = post.map(rot);
  let plateaus: Plateau[] = [];
  const injuries: { amp: number; ref: StdLead }[] = [];
  const base: VentMorph = {
    key: inp.pattern.key, qrs, qrsOn, qrsOff: qrsEnd, jEnd, post, plateaus, primaryIdx: rep.primaryIdx, tPrimary,
    uEnd, law, timing, injury: injuries, G: apply(m, G), aQrs: apply(m, rep.aQrs), tArea: apply(m, rep.tArea),
    alternans: Math.min(0.9, Math.max(0, inp.repol?.alternans ?? 0)),
    swing: inp.geometry?.swing ? swingOf(inp.geometry.swing) : null,
  };
  // 5. injury: unit plateaus, then amplitudes solved from stMv at J+60 in the reference lead (affine)
  if (inp.injury?.length) {
    const unitSets = inp.injury.map((spec) => injuryPlateaus(spec, qrsEnd - qrsOn, tPrimary.end, tPrimary.peak).map(rotP));
    const solved = solveInjury(base, unitSets, inp.injury, inp.refRrMs, inp.geometry?.torsoGain ?? 1);
    plateaus = unitSets.flatMap((set, i) => set.map((p) => ({ ...p, amp: p.amp * solved[i].amp })));
    injuries.push(...solved);
    return { ...base, plateaus, injury: injuries };
  }
  return base;
}

// ── per-beat instantiation ─────────────────────────────────────────────────────────────────────────────────────────

export interface BeatOptions {
  /** extra rotation of this beat (respiration, swing) */
  readonly rot?: Mat3 | null;
  /** primary-gradient factor of this beat (alternans) */
  readonly gFactor?: number;
  /** amplitude factor of every ventricular kernel of this beat (respiration, swing) */
  readonly ampFactor?: number;
}

export interface VentBeat {
  readonly kernels: Kernel[];
  readonly qrsOn: number;
  readonly qrsOff: number;
  readonly j: number;
  readonly tPeak: number;
  readonly tOff: number;
  readonly uOff: number | null;
  /** JT scale used for this beat */
  readonly s: number;
}

/** Kernels and fiducials of one ventricular beat whose activation starts at `t` (absolute ms). */
export function instantiateVent(m: VentMorph, t: number, rrEff: number, beat: number, o: BeatOptions = {}): VentBeat {
  const s = jtScale(m.law, rrEff);
  const J = t + m.qrsOff;
  const ks: Kernel[] = [];
  // swinging heart: every other group of `everyBeats` beats the heart sits rotated and shifted (beat −1 = reference)
  const swung = m.swing !== null && beat >= 0 && Math.floor(beat / m.swing.everyBeats) % 2 === 1;
  const rot = swung ? (o.rot ? mul(o.rot, m.swing!.rot) : m.swing!.rot) : (o.rot ?? null);
  const shift = swung ? m.swing!.shiftCm : null;
  const a = (o.ampFactor ?? 1) * (swung ? m.swing!.gain : 1);
  const r = (l: Lobe): Lobe => {
    let x = rot ? rotateLobe(l, rot) : l;
    if (shift && x.loc) x = { ...x, loc: add(x.loc, shift) };
    return a !== 1 ? { ...x, amp: x.amp * a } : x;
  };
  for (const l of m.qrs) ks.push(lobeKernel(r(l), t, beat));
  // T-wave alternans: the primary gradient is larger and smaller on alternate beats
  const g = o.gFactor ?? (m.alternans > 0 && beat >= 0 ? 1 + (beat % 2 === 0 ? m.alternans : -m.alternans) : 1);
  m.post.forEach((l, i) => {
    let x = mapLobeTimes(l, (u) => scaleAfterJ(u, s));
    if (g !== 1 && m.primaryIdx.includes(i)) x = { ...x, amp: x.amp * g };
    ks.push(lobeKernel(r(x), J, beat));
  });
  for (const p of m.plateaus) {
    const x = mapPlateauTimes(p, (u) => scaleAfterJ(u, s));
    let y = rot ? rotatePlateau(x, rot) : x;
    if (shift && y.loc) y = { ...y, loc: add(y.loc, shift) };
    ks.push(plateauKernel(a !== 1 ? { ...y, amp: y.amp * a } : y, J, beat));
  }
  return {
    kernels: ks,
    qrsOn: t + m.qrsOn,
    qrsOff: J,
    j: m.jEnd !== null ? J + scaleAfterJ(m.jEnd, s) : J,
    tPeak: J + scaleAfterJ(m.tPrimary.peak, s),
    tOff: J + scaleAfterJ(m.tPrimary.end, s),
    uOff: m.uEnd !== null ? J + scaleAfterJ(m.uEnd, s) : null,
    s,
  };
}

/**
 * Torso-transfer gain per cm of swing: the swung heart lies closer to the chest wall, behind less effusion, so every
 * lead records it larger (the alternans of a swinging heart reaches the limb leads too, without an axis change).
 * Calibrated (2026-10-29) on the electrical-alternans scenario: ≥ 10 % beat-to-beat QRS alternation in ≥ 3 limb leads.
 */
export const SWING_GAIN_PER_CM = 0.12;

/** Swing geometry: a rotation about the frontal and sagittal axes by `rotDeg`, a shift of every source location and
 *  the transfer gain of the nearer position. */
function swingOf(w: NonNullable<GeometrySpec['swing']>): NonNullable<VentMorph['swing']> {
  return { rot: rotationMatrix(0.5 * w.rotDeg, 0, w.rotDeg), shiftCm: w.shiftCm, gain: 1 + SWING_GAIN_PER_CM * len(w.shiftCm), everyBeats: Math.max(1, Math.round(w.everyBeats)) };
}

// ── injury solve ───────────────────────────────────────────────────────────────────────────────────────────────

const ALL_STD: readonly StdLead[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

/** ST at J+60 of one beat in a lead (ventricular kernels only; the PR level of an isolated beat is 0), recorded through
 *  the torso transfer gain of the source (the render multiplies every lead vector by it). */
function stAt(ks: readonly Kernel[], j: number, lead: StdLead, torsoGain: number): number {
  return leadAt(lead, potentialsAt(ks, j + 60, torsoGain), STANDARD_HOOKUP);
}

/** Injury amplitudes such that the recorded ST at J+60 in each reference lead equals its `stMv` — on the recorded
 *  signal, i.e. after the torso gain (effusion, lean chest, the `voltage` dial): the injury is a cardiac source, the
 *  ST the reader measures is what the request asks for. */
function solveInjury(m: VentMorph, unitSets: readonly Plateau[][], specs: readonly InjurySpec[], rr: number, torsoGain: number): { amp: number; ref: StdLead }[] {
  const beatOf = (plateaus: readonly Plateau[]): VentBeat => instantiateVent({ ...m, plateaus }, 0, rr, -1);
  const b0 = beatOf([]);
  const units = unitSets.map((set) => beatOf(set).kernels.filter((k) => k.wave === 'ST' && k.shape === 'plateau'));
  const refs: StdLead[] = specs.map((spec, i) => {
    if (spec.ref) {
      if (!ALL_STD.includes(spec.ref as StdLead)) throw new Error(`src/synth: injury reference lead ${spec.ref} needs the extra-lead table (synth-leads)`);
      return spec.ref as StdLead;
    }
    let best: StdLead = 'V2', bv = -Infinity;
    for (const l of ALL_STD) {
      const v = Math.sign(spec.stMv || 1) * stAt(units[i], b0.qrsOff, l, torsoGain);
      if (v > bv) {
        bv = v;
        best = l;
      }
    }
    return best;
  });
  const n = specs.length;
  const A: number[][] = refs.map((ref) => units.map((u) => stAt(u, b0.qrsOff, ref, torsoGain)));
  const rhs = refs.map((ref, i) => specs[i].stMv - stAt(b0.kernels, b0.qrsOff, ref, torsoGain));
  // Gaussian elimination (n is tiny)
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [rhs[c], rhs[p]] = [rhs[p], rhs[c]];
    if (Math.abs(A[c][c]) < 1e-9) throw new Error('src/synth: injury reference lead does not see the injury vector');
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / A[c][c];
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      rhs[r] -= f * rhs[c];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let c = n - 1; c >= 0; c--) {
    let v = rhs[c];
    for (let k = c + 1; k < n; k++) v -= A[c][k] * x[k];
    x[c] = v / A[c][c];
  }
  return x.map((amp, i) => ({ amp, ref: refs[i] }));
}
