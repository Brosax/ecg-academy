/**
 * Dial application (DECISION §7): every dial maps to model parameters through one documented function; truth is
 * always read from the instantiated model, never echoed from the dial. Forward / analytic dials are applied to the
 * SourceSpec here; the axis and P-axis dials are 1-D root-finds on the ventricular-only / atrial-only area of the
 * built morphology (callbacks from generate()); the noise dial becomes a RecordingSpec layer.
 *
 * Variant ownership: a dial never overrides what the scenario's variant is about. When the variant's patch sets the
 * parameter a dial maps to (e.g. the 'variable' flutter variant patches the AV node, so `conductionRatio` would turn
 * it into fixed N:1; the 'rapid' AF variant patches the node, so `ventricularResponse` would undo it), the dial is not
 * applied and is absent from `applied` (graders use truth either way).
 */
import type { DeepPartial, DialId, JunctionSpec, ScenarioDef, SourceSpec } from '../api';
import { angleDiff } from '../frame';
import { baseQrsMs } from '../morph/compose';
import { createRng } from '../../core/rng';
import { AvNode, erpForRatio, resolveJunction, solveAhMin } from '../rhythm/junction';
import { DIALS, erpForSlowResponse, erpForVentricularResponse, ventricularResponseAt } from './dials';

export type DialValues = Readonly<Partial<Record<DialId, number>>>;

export interface Applied {
  readonly source: SourceSpec;
  readonly applied: Partial<Record<DialId, number>>;
  /** requested QRS axis (solved later in generate) */
  readonly axisTarget: number | null;
  /** requested P axis (solved later in generate) */
  readonly pAxisTarget: number | null;
  /** requested noise level (mV; a recording layer, realised level reported by the chain) */
  readonly noiseMv: number | null;
}

const clampTo = (def: ScenarioDef, id: DialId, v: number): number => {
  const r = def.dials[id] ?? DIALS[id].range;
  return Math.min(r.max, Math.max(r.min, v));
};

/** The effective RR (ms) of the scenario's dominant rhythm (for the PR solve). */
function rhythmRr(src: SourceSpec): number {
  const r = src.rhythm;
  if (r.kind === 'sinus' || r.kind === 'ventricular' || r.kind === 'junctional' || r.kind === 'atrial-ectopic' || r.kind === 'atrial-tachycardia') return 60000 / r.rateBpm;
  return 800;
}

const RATE_KINDS: ReadonlySet<SourceSpec['rhythm']['kind']> = new Set(['sinus', 'ventricular', 'junctional', 'atrial-ectopic', 'atrial-tachycardia']);

/** True when the variant patch sets the model parameter that dial `id` maps to (the variant wins). */
export function variantOwns(id: DialId, patch: DeepPartial<SourceSpec> | undefined): boolean {
  if (!patch) return false;
  const r = patch.rhythm as Record<string, unknown> | undefined;
  const avn = patch.junction?.avn as Record<string, unknown> | undefined;
  switch (id) {
    case 'rate': return !!r && ('rateBpm' in r || 'kind' in r);
    case 'hrv': return !!r && ('hrv' in r || 'kind' in r);
    case 'pr': return !!avn && 'ahMinMs' in avn;
    case 'qrs': return patch.substrate?.conduction !== undefined || patch.activation !== undefined;
    case 'qtc': return patch.repol?.qtcMs !== undefined;
    case 'axis': return patch.geometry?.frontalDeg !== undefined || patch.activation !== undefined;
    case 'pAxis': return patch.atria !== undefined;
    case 'st': return patch.injury !== undefined;
    case 'tAmp': return patch.repol?.gScale !== undefined;
    case 'voltage': return patch.geometry?.torsoGain !== undefined;
    case 'conductionRatio':
    case 'ventricularResponse': return !!avn || (!!r && 'kind' in r);
    case 'fCoarseness': return !!r && ('coarseness' in r || 'kind' in r);
    default: return false;
  }
}

/** Steady AV-node conduction ratio N (one of every N impulses crosses) for a regular atrial cycle; 1 when 1:1 or when
 *  the response is not a fixed N:1 (Wenckebach). */
export function nodalRatio(j: JunctionSpec, cycleMs: number): number {
  const node = new AvNode({ ...j, avn: { ...j.avn, jitter: 0, conceal: 0 } }, createRng(1));
  const seq: boolean[] = [];
  for (let k = 0; k < 24; k++) seq.push(node.offer(k * cycleMs).conducted);
  const at = seq.slice(8).map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
  if (at.length < 2) return 1;
  const gaps = at.slice(1).map((x, i) => x - at[i]);
  return gaps.every((g) => g === gaps[0]) ? gaps[0] : 1;
}

/** Response class of an AF variant that patches the AV node: the band its ventricularResponse dial is realised in
 *  (slow: below the bradycardia limit; rapid: above the tachycardia limit), or null (no node patch / a middle node). */
export function afVariantBand(patch: DeepPartial<SourceSpec> | undefined): { min: number; max: number } | null {
  const r = patch?.rhythm as Record<string, unknown> | undefined;
  const erp = patch?.junction?.avn?.erpMs;
  if (erp === undefined || (r && 'kind' in r && r.kind !== 'fibrillation')) return null;
  const bpm = ventricularResponseAt(erp);
  return bpm < 60 ? { min: 40, max: 55 } : bpm > 100 ? { min: 105, max: 160 } : null;
}

export function applyDials(def: ScenarioDef, base: SourceSpec, dials: DialValues | undefined, variantPatch?: DeepPartial<SourceSpec>): Applied {
  let s: SourceSpec = base;
  const applied: Partial<Record<DialId, number>> = {};
  if (!dials) return { source: s, applied, axisTarget: null, pAxisTarget: null, noiseMv: null };
  const has = (id: DialId): boolean => dials[id] !== undefined && Number.isFinite(dials[id]) && DIALS[id].implemented && !variantOwns(id, variantPatch);
  const val = (id: DialId): number => clampTo(def, id, dials[id]!);
  if (has('rate') && RATE_KINDS.has(s.rhythm.kind)) {
    const v = val('rate');
    s = { ...s, rhythm: { ...s.rhythm, rateBpm: v } as SourceSpec['rhythm'] };
    applied.rate = v;
  }
  if (has('hrv') && s.rhythm.kind === 'sinus') {
    const v = val('hrv');
    s = { ...s, rhythm: { ...s.rhythm, hrv: v } };
    applied.hrv = v;
  }
  if (has('pr') && s.activation.kind === 'conducted') {
    const v = val('pr');
    const j = resolveJunction(s.junction);
    // the node's recovery before a conducted P is N P–P cycles minus its AH in N:1 nodal block (2:1 with a long PR),
    // one cycle with 1:1 conduction (an infra-His N:1 block leaves the node conducting every P)
    const cycle = rhythmRr(s);
    const ahMin = solveAhMin(j, v, nodalRatio(j, cycle) * cycle);
    s = { ...s, junction: { ...s.junction, avn: { ...j.avn, ahMinMs: ahMin } } };
    applied.pr = v;
  }
  if (has('qrs')) {
    const v = val('qrs');
    const k = v / baseQrsMs(s);
    s = { ...s, substrate: { ...s.substrate, conduction: k } };
    applied.qrs = v;
  }
  if (has('qtc')) {
    const v = val('qtc');
    s = { ...s, repol: { ...s.repol, qtcMs: v } };
    applied.qtc = v;
  }
  if (has('tAmp')) {
    const v = val('tAmp');
    s = { ...s, repol: { ...s.repol, gScale: v } };
    applied.tAmp = v;
  }
  if (has('st') && s.injury?.length) {
    // the first injury is solved to the dial value in its reference lead; the other injuries of the same source (the
    // inferior / lateral shares of early repolarisation) scale by the same factor, so the dial changes the whole
    // pattern the learner sees, not only the reference lead
    const v = val('st');
    const k0 = s.injury[0].stMv;
    const k = Math.abs(k0) > 1e-9 ? v / k0 : 1;
    s = { ...s, injury: s.injury.map((x, i) => (i === 0 ? { ...x, stMv: v } : { ...x, stMv: x.stMv * k })) };
    applied.st = v;
  }
  if (has('voltage')) {
    const v = val('voltage');
    s = { ...s, geometry: { ...s.geometry, torsoGain: v } };
    applied.voltage = v;
  }
  if (has('fCoarseness') && (s.rhythm.kind === 'fibrillation' || s.rhythm.kind === 'vf')) {
    const v = val('fCoarseness');
    s = { ...s, rhythm: { ...s.rhythm, coarseness: v } };
    applied.fCoarseness = v;
  }
  if (has('conductionRatio') && (s.rhythm.kind === 'flutter' || s.rhythm.kind === 'atrial-tachycardia')) {
    const n = Math.round(val('conductionRatio'));
    const j = resolveJunction(s.junction);
    const cycle = s.rhythm.kind === 'flutter' ? s.rhythm.cycleMs : 60000 / s.rhythm.rateBpm;
    // N:1 when the recovery after a conducted impulse stays under R_min for N − 1 cycles (fixed, no concealment)
    const erp = erpForRatio({ ...j, avn: { ...j.avn, jitter: 0, conceal: 0 } }, cycle, n);
    s = { ...s, junction: { ...s.junction, avn: { ...j.avn, erpMs: erp, jitter: 0, conceal: 0 } } };
    applied.conductionRatio = n;
  }
  // ventricularResponse is a statistic: generate() replaces this request by the realised mean rate. An AF variant that
  // patches the node (slow / rapid ventricular response) keeps its class: the dial is realised inside the variant's
  // band (slow < 60, rapid > 100) with the scenario's own calibrated node, so a drill that asks the 'slow' variant for
  // 75 /min gets the closest slow response instead of a silently ignored dial
  const vrBand = afVariantBand(variantPatch);
  const vrOk = dials.ventricularResponse !== undefined && Number.isFinite(dials.ventricularResponse) && DIALS.ventricularResponse.implemented
    && (!variantOwns('ventricularResponse', variantPatch) || vrBand !== null);
  if (vrOk && s.rhythm.kind === 'fibrillation' && s.activation.kind === 'conducted') {
    const v = vrBand
      ? Math.min(vrBand.max, Math.max(vrBand.min, dials.ventricularResponse!))
      : val('ventricularResponse');
    // slow class: the variant's own node (little jitter and concealment: the slow, more regular response) on its own
    // measured map; rapid class and the base: the scenario's calibrated node on AF_RESPONSE_MAP
    const slow = vrBand !== null && vrBand.max < 60;
    const node = resolveJunction(vrBand && !slow ? def.source.junction : s.junction).avn;
    s = { ...s, junction: { ...s.junction, avn: { ...node, erpMs: slow ? erpForSlowResponse(v) : erpForVentricularResponse(v) } } };
    applied.ventricularResponse = v;
  }
  const axisTarget = has('axis') ? val('axis') : null;
  const pAxisTarget = has('pAxis') ? val('pAxis') : null;
  const noiseMv = has('noise') ? val('noise') : null;
  return { source: s, applied, axisTarget, pAxisTarget, noiseMv };
}

/**
 * Solve a rotation (deg, within ±100°) that gives a target frontal axis. `axisAt(deg)` builds the morphology rotated
 * by `deg` and returns its truth axis. Bisection on the wrapped error; stops at |error| ≤ `tol`.
 */
export function solveAxis(axisAt: (deg: number) => number, target: number, tol = 0.3): { deg: number; axis: number } {
  const err = (d: number): number => angleDiff(axisAt(d), target);
  let lo = -100, hi = 100;
  let elo = err(lo), ehi = err(hi);
  if (Math.sign(elo) === Math.sign(ehi)) {
    // the rotation range does not bracket the target: take the end with the smaller error
    const deg = Math.abs(elo) < Math.abs(ehi) ? lo : hi;
    return { deg, axis: axisAt(deg) };
  }
  for (let i = 0; i < 40 && hi - lo > 0.05; i++) {
    const mid = 0.5 * (lo + hi);
    const e = err(mid);
    if (Math.abs(e) <= tol) return { deg: mid, axis: axisAt(mid) };
    if (Math.sign(e) === Math.sign(elo)) {
      lo = mid;
      elo = e;
    } else {
      hi = mid;
      ehi = e;
    }
  }
  const deg = 0.5 * (lo + hi);
  return { deg, axis: axisAt(deg) };
}
