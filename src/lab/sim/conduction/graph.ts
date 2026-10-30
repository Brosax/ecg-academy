/**
 * Conduction-system timing and the two activation variants of the normal heart.
 *
 * Atrial variant 'sinus': t = 0 at the A event (SA firing). Seed = atrial voxel nearest the SA landmark (RA preferred)
 *   at saExitMs; atrial muscle isotropic at vAtrial (0.8–1.0 m/s); Bachmann's bundle = cable layer along the BACHMANN
 *   path at > 1.7 m/s coupled to nearby atrial muscle. AVN arrival = tAct of the atrial voxel nearest the AVN landmark.
 * Ventricular variant 'normal': t = 0 at His activation (the V event). HIS → {LBB, RBB}, LBB → {LAF, LPF, LSF} are
 *   insulated cables at vBundle (1–2 m/s); each child starts at the closest point of its parent. Fascicle terminals
 *   (+ per-fascicle offsets) seed the Purkinje layer at the nearest subendocardial voxel of their cavity — the three LV
 *   terminals are the Durrer early sites (anterior paraseptal, mid left septal, posterior paraseptal), the RBB terminal
 *   the RV anterior papillary muscle (docs/research/activation-physiology.md §1; LG conduction anatomy). If the nearest
 *   subendocardial voxel is outside the Purkinje mask the muscle is seeded directly (after the PMJ delay).
 * Geometry-agnostic: uses only grid fields, geometry.paths and geometry.landmarks; missing paths degrade gracefully.
 */
import { selectVoxels } from '../scenarios/tissue';
import type { AtrialVariantSpec, SiteRef, VentricularVariantSpec } from '../scenarios/types';
import type { ActivationField, ActivationVariant, ConductionParams, GeometryBundle, Seed, StructureId, Vec3 } from '../types';
import { CHAMBER, COMP, TISSUE, compOfTissue } from '../types';
import type { LayerSeed } from './fastestRoute';
import { fastestRoute } from './fastestRoute';
import { closestOnPolyline, nearestVoxel, polylineArc, voxelCenter } from './gridUtil';
import type { EngineParams } from './params';
import type { CableLayer, PurkinjeLayer } from './purkinje';
import { buildCableLayer, buildPurkinjeLayer, chamberOfBundle } from './purkinje';

export type { EngineParams } from './params';
export { DEFAULT_ENGINE_PARAMS, resolveParams } from './params';

export interface PathTiming {
  readonly id: StructureId;
  readonly pointsMm: readonly Vec3[];
  /** Activation time at each point, ms rel. to the beat event. */
  readonly tMs: readonly number[];
  readonly t0: number;
  readonly t1: number;
  readonly lengthMm: number;
}

export interface TerminalSeed {
  readonly id: StructureId;
  /** Arrival at the terminal incl. offset (ms rel. to His). */
  readonly tTerminalMs: number;
  /** Seeded voxel (subendocardial). */
  readonly voxel: number;
  readonly onPurkinje: boolean;
  readonly snapMm: number;
}

export interface VentricularActivation {
  readonly field: ActivationField;
  readonly variant: ActivationVariant;
  readonly purkinje: PurkinjeLayer;
  /** Purkinje node activation times (ms). */
  readonly purkinjeT: Float32Array;
  readonly paths: readonly PathTiming[];
  readonly terminals: readonly TerminalSeed[];
  /** His → first ventricular muscle activation (ms). */
  readonly hvMs: number;
}

export interface AtrialActivation {
  readonly field: ActivationField;
  readonly variant: ActivationVariant;
  readonly saVoxel: number;
  readonly avnVoxel: number;
  /** Atrial activation reaching the AV node (ms after the A event) = SinusRhythm.atrioNodalMs. */
  readonly avnArrivalMs: number;
  readonly bachmann: CableLayer | null;
  /** Cable node times (ms). */
  readonly bachmannT: Float32Array | null;
  readonly paths: readonly PathTiming[];
}

export function conductionParams(p: EngineParams): ConductionParams {
  return {
    vMyoLongMps: p.vMyoLongMps,
    vMyoTransMps: p.vMyoTransMps,
    vAtrialMps: p.vAtrialMps,
    vBachmannMps: p.vBachmannMps,
    vPurkinjeMps: p.vPurkinjeMps,
    pmjDelayMs: p.pmjDelayMs,
    retroDelayMs: p.retroDelayMs,
  };
}

const pathOf = (geo: GeometryBundle, id: StructureId) => geo.paths.find((p) => p.id === id && p.pointsMm.length > 0) ?? null;

// ---------------------------------------------------------------- atria

/** Resolves a scenario site: a landmark (or the end of a conduction path with that id), or a local point (mm). */
export function resolveSite(geo: GeometryBundle, site: SiteRef): Vec3 | null {
  if (typeof site !== 'string') return site;
  return geo.landmarks[site] ?? lastPoint(pathOf(geo, site)) ?? null;
}

/**
 * Atrial activation. Variant origin: the SA node (default), the AV node (retrograde atrial activation: junctional
 * rhythm, AVNRT) or an ectopic atrial site (PAC). t = 0 at the A event = activation of the origin.
 */
export function buildAtrialActivation(geo: GeometryBundle, p: EngineParams, id = 'sinus', spec?: AtrialVariantSpec): AtrialActivation {
  const g = geo.grid;
  const isAtrial = (v: number) => compOfTissue(g.tissue[v]) === COMP.Atrial;
  const bb = pathOf(geo, 'BACHMANN');
  const saPoint = geo.landmarks.SA ?? bb?.pointsMm[0] ?? null;
  let saVoxel = -1;
  if (saPoint) {
    saVoxel = nearestVoxel(g, saPoint, (v) => g.tissue[v] === TISSUE.RA, 25).voxel;
    if (saVoxel < 0) saVoxel = nearestVoxel(g, saPoint, isAtrial, 40).voxel;
  }
  if (saVoxel < 0) saVoxel = highestAtrialVoxel(geo);
  const avnPoint0 = geo.landmarks.AVN ?? lastPoint(pathOf(geo, 'AVN')) ?? firstPoint(pathOf(geo, 'HIS')) ?? geo.landmarks.HIS ?? null;
  const origin = spec?.origin ?? 'SA';
  let originVoxel = saVoxel, originT = p.saExitMs;
  if (origin === 'AVN') {
    originVoxel = avnPoint0 ? nearestVoxel(g, avnPoint0, isAtrial, 40).voxel : -1;
    originT = 0;
  } else if (origin !== 'SA') {
    const pt = resolveSite(geo, origin);
    originVoxel = pt ? nearestVoxel(g, pt, isAtrial, 40).voxel : -1;
    originT = 0;
  }
  if (originVoxel < 0) originVoxel = saVoxel;
  const seeds: Seed[] = originVoxel >= 0 ? [{ voxel: originVoxel, tMs: originT }] : [];

  const bachmann = bb && bb.pointsMm.length > 1
    ? buildCableLayer(g, bb.pointsMm, { comp: COMP.Atrial, vCableMps: p.vBachmannMps, couplingMm: p.bachmannCouplingMm, vCoupleMps: p.vAtrialMps })
    : null;
  const res = fastestRoute({
    grid: g, comp: COMP.Atrial, stencil: p.stencil, vLongMps: p.vAtrialMps, vTransMps: p.vAtrialMps, seeds,
    layers: bachmann ? [bachmann] : [],
  });
  const field: ActivationField = { id, comp: COMP.Atrial, tAct: res.tAct, tMinMs: res.tMinMs, tMaxMs: res.tMaxMs };

  const avnPoint = avnPoint0;
  let avnVoxel = -1;
  if (avnPoint) avnVoxel = nearestVoxel(g, avnPoint, (v) => isAtrial(v) && Number.isFinite(res.tAct[v]), 40).voxel;
  // no AVN landmark near the atria → latest atrial activation; no atria at all → 0 (keeps the rhythm finite)
  const avnArrivalMs = avnVoxel >= 0 ? res.tAct[avnVoxel] : Number.isFinite(res.tMaxMs) ? res.tMaxMs : 0;

  const paths: PathTiming[] = [];
  if (bachmann && res.layerT[0]) {
    const t = Array.from(res.layerT[0]);
    paths.push({ id: 'BACHMANN', pointsMm: bachmann.pointsMm, tMs: t, t0: Math.min(...t), t1: Math.max(...t), lengthMm: bachmann.arcMm[bachmann.arcMm.length - 1] });
  }
  const avn = pathOf(geo, 'AVN');
  if (avn) {
    // AV node: entered at the atrial arrival; its slow transit (AH) is a rhythm parameter, not a geometric speed.
    paths.push({ id: 'AVN', pointsMm: avn.pointsMm, tMs: avn.pointsMm.map(() => avnArrivalMs), t0: avnArrivalMs, t1: avnArrivalMs, lengthMm: polylineArc(avn.pointsMm).length });
  }
  return {
    field,
    variant: { id, comp: COMP.Atrial, seeds, params: conductionParams(p) },
    saVoxel, avnVoxel, avnArrivalMs,
    bachmann, bachmannT: res.layerT[0] ?? null,
    paths,
  };
}

/** Fallback SA site: the highest (roof-most) RA voxel, else any atrial voxel; −1 if the grid has no atria. */
function highestAtrialVoxel(geo: GeometryBundle): number {
  const g = geo.grid;
  let best = -1, bestAb = -Infinity, anyAtrial = -1;
  const RA = TISSUE.RA;
  for (let v = 0; v < g.tissue.length; v++) {
    if (anyAtrial < 0 && compOfTissue(g.tissue[v]) === COMP.Atrial) anyAtrial = v;
    if (g.tissue[v] === RA && g.apexBase[v] > bestAb) {
      best = v;
      bestAb = g.apexBase[v];
    }
  }
  return best >= 0 ? best : anyAtrial;
}

const firstPoint = (p: { pointsMm: readonly Vec3[] } | null): Vec3 | null => (p ? p.pointsMm[0] : null);
const lastPoint = (p: { pointsMm: readonly Vec3[] } | null): Vec3 | null => (p ? p.pointsMm[p.pointsMm.length - 1] : null);

// ---------------------------------------------------------------- His–Purkinje

const PARENTS: Partial<Record<StructureId, readonly StructureId[]>> = {
  LBB: ['HIS'],
  RBB: ['HIS'],
  LAF: ['LBB', 'HIS'],
  LPF: ['LBB', 'HIS'],
  LSF: ['LBB', 'HIS'],
};
const TERMINALS: readonly StructureId[] = ['LAF', 'LPF', 'LSF', 'RBB'];

/** Times along HIS, LBB, RBB and fascicles at vBundle (ms after His activation). */
export function hisPurkinjeTiming(geo: GeometryBundle, p: EngineParams): PathTiming[] {
  const v = p.vBundleMps;
  const out = new Map<StructureId, PathTiming>();
  const his = pathOf(geo, 'HIS');
  const hisPts: Vec3[] = his ? [...his.pointsMm] : geo.landmarks.HIS ? [geo.landmarks.HIS] : [];
  if (hisPts.length > 0) out.set('HIS', timed('HIS', hisPts, 0, v));
  for (const id of ['LBB', 'RBB', 'LAF', 'LPF', 'LSF'] as const) {
    const path = pathOf(geo, id);
    if (!path) continue;
    const parent = (PARENTS[id] ?? []).map((pid) => out.get(pid)).find((x) => x !== undefined);
    if (!parent) continue;
    const c = closestOnPolyline(parent.pointsMm, path.pointsMm[0]);
    const tStart = timeAtArc(parent, c.arcMm, v) + c.distMm / v;
    out.set(id, timed(id, path.pointsMm, tStart, v));
  }
  return [...out.values()];
}

function timed(id: StructureId, pts: readonly Vec3[], t0: number, v: number): PathTiming {
  const { cum, length } = polylineArc(pts);
  const tMs = cum.map((c) => t0 + c / v);
  return { id, pointsMm: pts, tMs, t0, t1: t0 + length / v, lengthMm: length };
}

function timeAtArc(p: PathTiming, arc: number, v: number): number {
  return p.t0 + arc / v;
}

/**
 * Ventricular activation for the 'normal' variant. `purkinje` may be passed in to reuse a layer built with identical
 * mask parameters (calibration loops).
 */
/**
 * Ventricular activation. Variant spec (scenario): blocked terminals (bundle-branch / fascicular block), terminal
 * delays, extra Purkinje exclusions, finite retrograde muscle→Purkinje entry, an ectopic origin (no His–Purkinje
 * input; PVC / VT / ventricular escape) or an accessory-pathway seed (pre-excitation). t = 0 at the V event.
 */
export function buildVentricularActivation(
  geo: GeometryBundle,
  p: EngineParams,
  id = 'normal',
  purkinje?: PurkinjeLayer,
  spec?: VentricularVariantSpec,
  /** Per-voxel transmural speed factor (tissue.hypertrophy: 1/thickness), shared by every variant of a scenario. */
  transScale?: Float32Array,
): VentricularActivation {
  const g = geo.grid;
  const custom = !!spec && (spec.retroDelayMs !== undefined || (spec.purkinjeExclude?.length ?? 0) > 0
    || (spec.purkinjeExcludeAha?.length ?? 0) > 0);
  const pk = (custom ? undefined : purkinje) ?? buildPurkinjeLayer(g, {
    extent: p.purkinjeExtent, exclude: [...p.purkinjeExclude, ...(spec?.purkinjeExclude ?? [])], stencil: p.stencil,
    vPurkinjeMps: p.vPurkinjeMps, pmjDelayMs: p.pmjDelayMs, retroDelayMs: spec?.retroDelayMs ?? p.retroDelayMs,
    // fascicular block: the blocked fascicle's LV Purkinje territory (AHA segments) is removed
    excludeAha: spec?.purkinjeExcludeAha,
  });
  const paths = hisPurkinjeTiming(geo, p);
  const extra = spec?.terminalDelayMs ?? {};
  const offsets: Partial<Record<StructureId, number>> = {
    LAF: p.lafOffsetMs + (extra.LAF ?? 0), LPF: p.lpfOffsetMs + (extra.LPF ?? 0),
    LSF: p.lsfOffsetMs + (extra.LSF ?? 0), RBB: p.rbbOffsetMs + (extra.RBB ?? 0),
  };
  const blocked = new Set<StructureId>(spec?.blockTerminals ?? []);
  const ectopic = spec?.ectopic ?? null;
  let terms = ectopic ? [] : paths.filter((x) => TERMINALS.includes(x.id) && !blocked.has(x.id));
  if (!ectopic && !terms.some((x) => x.id !== 'RBB') && !['LAF', 'LPF', 'LSF'].some((t) => blocked.has(t as StructureId))) {
    // No left fascicles in this geometry: let the LBB (or His) end feed the LV.
    const lbb = paths.find((x) => x.id === 'LBB') ?? paths.find((x) => x.id === 'HIS');
    if (lbb) terms = [...terms, { ...lbb, id: 'LSF' }];
  }

  const muscleSeeds: Seed[] = [];
  const layerSeeds: LayerSeed[] = [];
  const terminals: TerminalSeed[] = [];
  for (const t of terms) {
    const end = t.pointsMm[t.pointsMm.length - 1];
    const ch = chamberOfBundle(t.id);
    const snap = nearestSubendo(pk, g, end, ch);
    if (snap.voxel < 0) continue;
    const tTerm = t.t1 + (offsets[t.id] ?? 0) + snap.distMm / p.vBundleMps;
    const node = pk.nodeOfVoxel[snap.voxel];
    if (node >= 0) layerSeeds.push({ layer: 0, node, tMs: tTerm });
    else muscleSeeds.push({ voxel: snap.voxel, tMs: tTerm + p.pmjDelayMs });
    terminals.push({ id: t.id, tTerminalMs: tTerm, voxel: snap.voxel, onPurkinje: node >= 0, snapMm: snap.distMm });
  }
  if (ectopic) {
    // ectopic origin: the beat starts in the muscle at the site (subendocardial or subepicardial), no His–Purkinje input
    const pt = resolveSite(geo, ectopic.at);
    const isV = (v: number) => compOfTissue(g.tissue[v]) === COMP.Ventricular;
    const want = ectopic.layer === 'epi' ? (v: number) => isV(v) && g.wallDepth[v] > 0.75 : (v: number) => isV(v) && g.wallDepth[v] < 0.3;
    let r = pt ? nearestVoxel(g, pt, want, 40) : { voxel: -1, distMm: Infinity };
    if (r.voxel < 0 && pt) r = nearestVoxel(g, pt, isV, 60);
    if (r.voxel >= 0) muscleSeeds.push({ voxel: r.voxel, tMs: 0 });
  }
  if (spec?.accessory) {
    // accessory pathway: ventricular insertion at the AV ring, activated before the His bundle (pre-excitation)
    const pt = resolveSite(geo, spec.accessory.at);
    const r = pt ? nearestVoxel(g, pt, (v) => compOfTissue(g.tissue[v]) === COMP.Ventricular, 40) : { voxel: -1, distMm: Infinity };
    if (r.voxel >= 0) muscleSeeds.push({ voxel: r.voxel, tMs: spec.accessory.tMs });
  }
  if (terminals.length === 0 && !ectopic && blocked.size === 0) {
    // Geometry without any conduction-system path or His landmark: seed the LV septal endocardium at a nominal HV
    // (40 ms, Denker 1984) so the engine stays usable; geometry.paths should normally provide HIS/LBB/RBB.
    const anchor = geo.landmarks.SEPTUM ?? geo.landmarks.LV_APEX ?? geo.chambers.find((c) => c.chamber === CHAMBER.LV)?.centerMm ?? null;
    const snap = anchor ? nearestSubendo(pk, g, anchor, CHAMBER.LV) : { voxel: -1, distMm: Infinity };
    if (snap.voxel >= 0) {
      muscleSeeds.push({ voxel: snap.voxel, tMs: 40 });
      terminals.push({ id: 'LSF', tTerminalMs: 40 - p.pmjDelayMs, voxel: snap.voxel, onPurkinje: false, snapMm: snap.distMm });
    }
  }

  let speedScale: Float32Array | undefined;
  if (spec?.speed?.length) {
    speedScale = new Float32Array(g.tissue.length).fill(1);
    for (const s of spec.speed) for (const v of selectVoxels(g, s)) speedScale[v] *= s.factor;
  }
  const res = fastestRoute({
    grid: g, comp: COMP.Ventricular, stencil: p.stencil, vLongMps: p.vMyoLongMps, vTransMps: p.vMyoTransMps,
    speedScale, transScale, seeds: muscleSeeds, layers: [pk], layerSeeds,
  });
  const field: ActivationField = { id, comp: COMP.Ventricular, tAct: res.tAct, tMinMs: res.tMinMs, tMaxMs: res.tMaxMs };
  const seedsForContract: Seed[] = [...muscleSeeds, ...layerSeeds.map((s) => ({ voxel: pk.voxel[s.node], tMs: s.tMs + p.pmjDelayMs }))];
  return {
    field,
    variant: { id, comp: COMP.Ventricular, seeds: seedsForContract, params: conductionParams(p) },
    purkinje: pk,
    purkinjeT: res.layerT[0],
    paths,
    terminals,
    hvMs: res.tMinMs,
  };
}

/** Nearest subendocardial voxel facing the given cavity (falls back to any ventricular voxel). */
function nearestSubendo(pk: PurkinjeLayer, g: GeometryBundle['grid'], p: Vec3, chamber: number): { voxel: number; distMm: number } {
  let best = -1, bestD = Infinity;
  const sv = pk.subendo.voxel, sc = pk.subendo.chamber;
  for (let s = 0; s < sv.length; s++) {
    if (sc[s] !== chamber) continue;
    const c = voxelCenter(g, sv[s]);
    const d = Math.hypot(c[0] - p[0], c[1] - p[1], c[2] - p[2]);
    if (d < bestD) {
      bestD = d;
      best = sv[s];
    }
  }
  if (best >= 0) return { voxel: best, distMm: bestD };
  const r = nearestVoxel(g, p, (v) => compOfTissue(g.tissue[v]) === COMP.Ventricular, 60);
  return r;
}

/** Durrer check helper: activation time of each terminal's seeded voxel relative to the first ventricular activation. */
export function terminalOnsets(va: VentricularActivation): { id: StructureId; relMs: number; chamber: number }[] {
  return va.terminals.map((t) => ({ id: t.id, relMs: va.field.tAct[t.voxel] - va.field.tMinMs, chamber: chamberOfBundle(t.id) }));
}

/** LV (CHAMBER.LV) vs RV onset: earliest activation among voxels facing each cavity. */
export function cavityOnsets(va: VentricularActivation): { lvMs: number; rvMs: number } {
  let lv = Infinity, rv = Infinity;
  const { voxel, chamber } = va.purkinje.subendo;
  for (let s = 0; s < voxel.length; s++) {
    const t = va.field.tAct[voxel[s]];
    if (chamber[s] === CHAMBER.LV) lv = Math.min(lv, t);
    else rv = Math.min(rv, t);
  }
  return { lvMs: lv, rvMs: rv };
}
