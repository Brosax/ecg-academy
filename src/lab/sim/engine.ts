/**
 * Real electrophysiology engine (implements the SimEngine contract; mirrors StubEngine semantics).
 *
 * Pipeline: geometry (given) → atrial + ventricular fastest-route fields (conduction/graph) → anatomy-bound APD
 * (conduction/apd) → voxel-face EDL kernels (source/voxelEdl) → beat templates per (variant, RR bucket)
 * (rhythm/templates) → TemplateStream (pose applied, H_A and H_V separate) → Dower projector.
 * A event = SA firing (atrial field t = 0); V event = His activation (ventricular field t = 0). SinusRhythm's
 * atrio-nodal delay equals the atrial field's arrival at the AV node; the AH delay is derived so that PR = targetPrMs
 * at RRref and scales with (RR/RRref)^avExp.
 */
import { AfModel } from './source/afField';
import type { VfFrameSource } from './source/vfDriver';
import { VF_RESPONSIBLE, VfDriver } from './source/vfDriver';
import { specDirToLocal, VfModel } from './source/vfField';
import { TdpRhythm } from './rhythm/tdpRhythm';
import { localToFrankMatrix, mat3Mul, rotationAboutAxis } from './frame';
import { buildApdField, apdScaleFor } from './conduction/apd';
import { buildCircuitActivation, isCircuitActivation } from './conduction/atrialCircuit';
import type { AtrialActivation, VentricularActivation } from './conduction/graph';
import { buildAtrialActivation, buildVentricularActivation } from './conduction/graph';
import type { EngineParams } from './conduction/params';
import { resolveParams } from './conduction/params';
import type { PurkinjeLayer } from './conduction/purkinje';
import { dowerElectrodeField } from './leads/electrodes';
import { makeProjector } from './leads/projector';
import type { StructureWindow } from './measure/responsible';
import { responsibleFromWindows, windowsFromField } from './measure/responsible';
import type { VentricularTimes } from './measure/truth';
import { buildCycleTruth, MECH, ventricularTimes } from './measure/truth';
import { ScenarioRhythm } from './rhythm/scenarioRhythm';
import { TemplateStream } from './rhythm/stream';
import type { TemplateSource } from './rhythm/templates';
import { TemplateCache } from './rhythm/templates';
import { NORMAL_SCENARIO } from './scenarios/normal';
import { hypertrophyFields, hypertrophyKernels } from './scenarios/wallThickness';
import { applyApdChanges, applyNecrosis, restVector, sourceWeights, weightKernel } from './scenarios/tissue';
import type { SourceWeights } from './scenarios/tissue';
import type { Scenario } from './scenarios/types';
import { notchField } from './scenarios/notch';
import type { NotchField } from './source/apNotch';
import { buildKernel } from './source/voxelEdl';
import type {
  ActiveBeat, ApdField, BeatEvent, BeatSnapshot, BeatTemplate, CycleTruth, ElectrodeField, EngineFields,
  GeometryBundle, LeadProjector, Pose, SimEngine, SourceKernel, StructureId, Vec3,
} from './types';
import { CHAMBER, COMP, STRUCTURES } from './types';

export type { EngineParams } from './conduction/params';
export { DEFAULT_ENGINE_PARAMS, resolveParams } from './conduction/params';

type AEvent = Extract<BeatEvent, { kind: 'A' }>;
type VEvent = Extract<BeatEvent, { kind: 'V' }>;
type ActivationFieldLike = EngineFields['atrial'][0];

export type ProgressFn = (progress: number, label: string) => void;

export interface EngineBuildStats {
  readonly totalMs: number;
  readonly atrialMs: number;
  readonly ventricularMs: number;
  readonly apdMs: number;
  readonly kernelMs: number;
  readonly templateMs: number;
  readonly nAtrialVoxels: number;
  readonly nVentricularVoxels: number;
  readonly nKernelA: number;
  readonly nKernelV: number;
  readonly nPurkinje: number;
}

export interface EngineTiming {
  /** His → first ventricular activation (ms). */
  readonly hvMs: number;
  /** SA → AV-node arrival (ms). */
  readonly atrioNodalMs: number;
  /** AV-node entry → His at RRref (ms). */
  readonly ahMs: number;
  /** Atrial activation span (ms). */
  readonly atrialSpanMs: number;
  /** Ventricular activation span (ms). */
  readonly ventricularSpanMs: number;
}

export interface Engine extends SimEngine, VfFrameSource {
  readonly params: EngineParams;
  readonly scenario: Scenario;
  readonly stats: EngineBuildStats;
  readonly timing: EngineTiming;
  readonly atrialActivation: AtrialActivation;
  readonly ventricularActivation: VentricularActivation;
  /** Alternative (slot 1) activations: ectopic / escape / retrograde, when the scenario defines them. */
  readonly atrialAltActivation: AtrialActivation | null;
  readonly ventricularAltActivation: VentricularActivation | null;
  readonly kernels: { readonly atrial: SourceKernel; readonly ventricular: SourceKernel };
  readonly templates: TemplateCache;
  readonly rhythm: ScenarioRhythm;
  /** Steady (diastolic) injury vectors, heart-local frame, mV. */
  readonly steady: { readonly atrial: Vec3; readonly ventricular: Vec3 };
  /** AF rotor field (null unless the scenario's rhythm is atrial fibrillation). */
  readonly af: AfModel | null;
  /** Ventricular scroll-wave field (VF / torsades de pointes), null otherwise. */
  readonly vf: VfDriver | null;
  /** Template for a beat kind at a given RR_prev (cached). */
  templateFor(kind: 'A' | 'V', rrPrevMs: number): BeatTemplate;
}

/** Optional reusable pieces (calibration loops rebuild engines many times on one geometry). */
export interface EnginePrep {
  readonly kernels?: { readonly atrial: SourceKernel; readonly ventricular: SourceKernel };
  /** Reused only if built with the same mask/stencil/speed/delay parameters. */
  readonly purkinje?: PurkinjeLayer;
}

const FS = 1000;
/** cycleAt looks at events from this long before t: the cycle at t, the one before it and their beats (< 3 s each). */
const CYCLE_LOOKBACK_MS = 8000;
/** A ventricular beat no P conducted takes over a blocked P whose onset is at most this long before its QRS. */
const ABSORB_BEFORE_MS = 300;
const yieldFrame = () => new Promise<void>((r) => setTimeout(r, 0));

/** Applies EngineParams pose deltas to a pose: R' = Rtilt(app z) · Razimuth(app y) · R · Rroll(local y). */
export function adjustPose(pose: Pose, p: Pick<EngineParams, 'poseRollDeg' | 'poseTiltDeg' | 'poseAzimuthDeg'>): Pose {
  const d2r = Math.PI / 180;
  const roll = rotationAboutAxis([0, 1, 0], p.poseRollDeg * d2r);
  const tilt = rotationAboutAxis([0, 0, 1], p.poseTiltDeg * d2r);
  const az = rotationAboutAxis([0, 1, 0], p.poseAzimuthDeg * d2r);
  return { R: mat3Mul(tilt, mat3Mul(az, mat3Mul(pose.R, roll))), tCm: pose.tCm };
}

export interface EngineOptions {
  readonly scenario?: Scenario;
  /** First beat no earlier than this (ms) — a scenario switch starts at the current playback time. */
  readonly startMs?: number;
  readonly prep?: EnginePrep;
  /** Yield to the event loop between stages so a progress bar can repaint (default true; createEngine only). */
  readonly yieldBetweenStages?: boolean;
}

/**
 * Build stages as a generator: each `yield` is a progress point (fraction, label = app.loading.* i18n key).
 * createEngine awaits a macrotask between stages; buildEngineSync runs them back to back (calibration, tests).
 */
function* engineStages(geometry0: GeometryBundle, params: Partial<EngineParams> | undefined, options: EngineOptions | undefined): Generator<[number, string], Engine, void> {
  const scenario = options?.scenario ?? NORMAL_SCENARIO;
  const p = resolveParams({ ...scenario.params, ...(params ?? {}) });
  const T = () => performance.now();
  const tStart = T();
  // necrosis relabels voxels Dead before anything else (activation, APD and kernels all see the scar)
  const grid = applyNecrosis(geometry0.grid, scenario.tissue);
  const geometry: GeometryBundle = grid === geometry0.grid ? geometry0 : { ...geometry0, grid };
  // hypertrophy (batch 3): thicker walls → transmural speed factor for every ventricular variant + weighted kernels
  const hyp = hypertrophyFields(grid, scenario.tissue);
  const transScale = hyp?.transScale ?? undefined;

  yield [0.05, 'activation'];
  let t = T();
  // atrial flutter: the main atrial variant is one revolution of a re-entry circuit (conduction/atrialCircuit.ts)
  const am = scenario.atrial.main;
  const atrial = am.circuit ? buildCircuitActivation(geometry, p, am.id, am.circuit) : buildAtrialActivation(geometry, p, am.id, am);
  const atrialAlt = scenario.atrial.alt ? buildAtrialActivation(geometry, p, scenario.atrial.alt.id, scenario.atrial.alt) : null;
  const atrialMs = T() - t;
  yield [0.3, 'activation'];
  t = T();
  const reusePk = grid === geometry0.grid ? options?.prep?.purkinje : undefined;
  const ventricular = buildVentricularActivation(geometry, p, scenario.ventricular.main.id, reusePk, scenario.ventricular.main, transScale);
  const ventricularAlt = scenario.ventricular.alt
    ? buildVentricularActivation(geometry, p, scenario.ventricular.alt.id, reusePk, scenario.ventricular.alt, transScale)
    : null;
  const ventricularMs = T() - t;

  yield [0.6, 'source'];
  t = T();
  const apd = applyApdChanges(geometry.grid, buildApdField(geometry.grid, p), scenario.tissue);
  const apdMs = T() - t;
  t = T();
  // hypertrophy weights the kernels, so prep.kernels (unweighted, calibration loops) are not reused then
  const kernels = hyp
    ? hypertrophyKernels(geometry.grid, hyp)
    : (grid === geometry0.grid ? options?.prep?.kernels : undefined) ?? {
        atrial: buildKernel(geometry.grid, COMP.Atrial),
        ventricular: buildKernel(geometry.grid, COMP.Ventricular),
      };
  const weights = sourceWeights(geometry.grid, scenario.tissue);
  const kernelMs = T() - t;

  yield [0.8, 'source'];
  t = T();
  // The constructor synthesizes the reference-RR templates (needed to derive the AH delay).
  const engine = new RealEngine(
    geometry, p, scenario,
    { atrial, atrialAlt, ventricular, ventricularAlt },
    apd, kernels, weights, options?.startMs ?? 100,
  );
  engine.warmTemplates();
  const templateMs = T() - t;
  let nA = 0, nV = 0;
  for (let v = 0; v < geometry.grid.tissue.length; v++) {
    if (Number.isFinite(atrial.field.tAct[v])) nA++;
    if (Number.isFinite(ventricular.field.tAct[v])) nV++;
  }
  engine.stats = {
    totalMs: T() - tStart, atrialMs, ventricularMs, apdMs, kernelMs, templateMs,
    nAtrialVoxels: nA, nVentricularVoxels: nV,
    nKernelA: kernels.atrial.voxels.length, nKernelV: kernels.ventricular.voxels.length,
    nPurkinje: ventricular.purkinje.size,
  };
  return engine;
}

/** Builds the engine on the main thread in chunks, reporting progress ('activation', 'source', 'ready'). */
export async function createEngine(
  geometry: GeometryBundle,
  params?: Partial<EngineParams>,
  onProgress?: ProgressFn,
  options?: EngineOptions,
): Promise<Engine> {
  const doYield = options?.yieldBetweenStages ?? true;
  const it = engineStages(geometry, params, options);
  for (;;) {
    const r = it.next();
    if (r.done) {
      onProgress?.(1, 'ready');
      return r.value;
    }
    onProgress?.(r.value[0], r.value[1]);
    if (doYield) await yieldFrame();
  }
}

/** Synchronous build (no progress, no yielding) — calibration loops and tests. */
export function buildEngineSync(geometry: GeometryBundle, params?: Partial<EngineParams>, options?: EngineOptions): Engine {
  const it = engineStages(geometry, params, options);
  for (;;) {
    const r = it.next();
    if (r.done) return r.value;
  }
}

interface Activations {
  readonly atrial: AtrialActivation;
  readonly atrialAlt: AtrialActivation | null;
  readonly ventricular: VentricularActivation;
  readonly ventricularAlt: VentricularActivation | null;
}

class RealEngine implements Engine {
  geometry: GeometryBundle;
  readonly fields: EngineFields;
  readonly fsHz = FS;
  readonly projector: LeadProjector;
  readonly electrodes: ElectrodeField;
  readonly rhythm: ScenarioRhythm;
  readonly templates: TemplateCache;
  readonly timing: EngineTiming;
  readonly kernels: { readonly atrial: SourceKernel; readonly ventricular: SourceKernel };
  readonly steady: { readonly atrial: Vec3; readonly ventricular: Vec3 };
  readonly atrialActivation: AtrialActivation;
  readonly ventricularActivation: VentricularActivation;
  readonly atrialAltActivation: AtrialActivation | null;
  readonly ventricularAltActivation: VentricularActivation | null;
  readonly af: AfModel | null;
  readonly vf: VfDriver | null;
  stats!: EngineBuildStats;
  private readonly stream: TemplateStream;
  private readonly listeners = new Set<() => void>();
  /** Structure windows per activation variant id. */
  private readonly windows = new Map<string, StructureWindow[]>();
  /** Dissociated rhythms (complete block, VT) define cycles by ventricular beats. */
  private readonly vCycles: boolean;
  /** Earliest activation per ventricular variant relative to its V event (≤ 0; negative with pre-excitation). */
  private readonly vStartMs = new Map<string, number>();
  private readonly vLeadMs: number;
  private scratchA = new Float32Array(0);
  private scratchV = new Float32Array(0);

  constructor(
    geometry: GeometryBundle,
    readonly params: EngineParams,
    readonly scenario: Scenario,
    acts: Activations,
    apd: ApdField,
    kernels: { readonly atrial: SourceKernel; readonly ventricular: SourceKernel },
    weights: SourceWeights,
    startMs: number,
  ) {
    const p = params;
    this.geometry = { ...geometry, pose: adjustPose(geometry.pose, p) };
    this.kernels = kernels;
    this.atrialActivation = acts.atrial;
    this.ventricularActivation = acts.ventricular;
    this.atrialAltActivation = acts.atrialAlt;
    this.ventricularAltActivation = acts.ventricularAlt;
    this.fields = {
      atrial: [acts.atrial.field, acts.atrialAlt?.field ?? null],
      ventricular: [acts.ventricular.field, acts.ventricularAlt?.field ?? null],
      apd,
      apAtrial: p.apAtrial,
      apVentricular: p.apVentricular,
    };
    this.electrodes = dowerElectrodeField();
    this.projector = makeProjector(this.electrodes);
    const gainA = p.gainMvPerMm2 * p.atrialGainFactor, gainV = p.gainMvPerMm2;
    const kA = weightKernel(kernels.atrial, weights), kV = weightKernel(kernels.ventricular, weights);
    this.steady = { atrial: restVector(kernels.atrial, weights, gainA), ventricular: restVector(kernels.ventricular, weights, gainV) };
    // phase-1 AP notch (tissue.notch → source/apNotch.ts): ventricular sources only; null keeps the plain AP
    const notch = notchField(geometry.grid, scenario.tissue);
    const src = (field: ActivationFieldLike, kernel: SourceKernel, ap: typeof p.apAtrial, gain: number, nf: NotchField | null = null): TemplateSource => ({
      kernel, field, apdRefMs: apd.apdRefMs, ap, gain, ...(nf ? { notch: nf } : {}),
    });
    const sources = new Map<string, TemplateSource>([
      [scenario.atrial.main.id, src(acts.atrial.field, kA, p.apAtrial, gainA)],
      [scenario.ventricular.main.id, src(acts.ventricular.field, kV, p.apVentricular, gainV, notch)],
    ]);
    if (acts.atrialAlt && scenario.atrial.alt) sources.set(scenario.atrial.alt.id, src(acts.atrialAlt.field, kA, p.apAtrial, gainA));
    if (acts.ventricularAlt && scenario.ventricular.alt) sources.set(scenario.ventricular.alt.id, src(acts.ventricularAlt.field, kV, p.apVentricular, gainV, notch));
    this.templates = new TemplateCache(sources, { rrRefMs: p.rrRefMs, rateExp: p.rateExp, bucketMs: p.rrBucketMs, fsHz: FS });

    // AV conduction: atrio-nodal delay from the field; AH chosen so that PR(RRref) = targetPrMs unless given.
    const atrioNodalMs = acts.atrial.avnArrivalMs;
    const aOn = this.templates.get(scenario.atrial.main.id, p.rrRefMs)!.truth.onMs;
    const vOn = this.templates.get(scenario.ventricular.main.id, p.rrRefMs)!.truth.onMs;
    // AH is a property of the AV node: calibrate it on the His–Purkinje onset, not on a pre-excited QRS onset (an
    // accessory pathway activates the ventricles before His–Purkinje does; that must shorten the PR, not lengthen AH)
    const vf = acts.ventricular;
    const hpOn = vf.terminals.length ? Math.min(...vf.terminals.map((t) => t.tTerminalMs)) + p.pmjDelayMs : vf.field.tMinMs;
    const vOnHp = scenario.ventricular.main.accessory ? vOn + Math.max(0, hpOn - vf.field.tMinMs) : vOn;
    const ahMs = p.ahMs ?? Math.min(200, Math.max(30, p.targetPrMs - atrioNodalMs - vOnHp + aOn));
    // AF: a continuous rotor field replaces the beat-wise atrial source; its upstrokes at the AV node feed the rhythm
    const afSpec = scenario.rhythm.af;
    this.af = afSpec ? new AfModel(geometry.grid, afSpec) : null;
    const afTiming = this.af && afSpec
      ? {
          impulses: { periodMs: this.af.periodMs, times: this.af.upstrokesAt(geometry.landmarks.AVN ?? geometry.landmarks.RA ?? [0, 0, 0]) },
          avn: afSpec.avn,
          seed: afSpec.seed,
        }
      : null;
    const rhythmTiming = {
      bpm: p.bpm, rrRefMs: p.rrRefMs, atrioNodalMs, ahMs, avExp: p.avExp, apdExp: p.rateExp, startMs,
      atrioNodalAltMs: acts.atrialAlt?.avnArrivalMs, prOffsetMs: vOnHp - aOn,
      atrialMain: scenario.atrial.main.id, atrialAlt: scenario.atrial.alt?.id ?? null,
      ventricularMain: scenario.ventricular.main.id, ventricularAlt: scenario.ventricular.alt?.id ?? null,
      af: afTiming,
      flutterCycleMs: isCircuitActivation(acts.atrial) ? acts.atrial.cycleMs : null,
    };
    // VF / TdP: a continuous scroll-wave field drives the ventricles (always for VF, in episodes for TdP)
    const vfSpec = scenario.rhythm.vf;
    const vfModel = vfSpec
      ? new VfModel(geometry.grid, vfSpec, vfSpec.precession ? specDirToLocal(this.geometry.pose, vfSpec.precession.axis) : undefined)
      : null;
    const tdpRhythm = vfSpec?.episodes && vfModel
      ? new TdpRhythm(scenario.rhythm, rhythmTiming, {
          tEndMs: (rr) => this.templates.get(scenario.ventricular.main.id, rr)!.truth.repolEndMs,
          runSpanMs: vfModel.runSpanMs(vfSpec.episodes.runMs),
        })
      : null;
    this.rhythm = tdpRhythm ?? new ScenarioRhythm(scenario.rhythm, rhythmTiming);
    this.vCycles = !!scenario.rhythm.vt || scenario.rhythm.av?.mode === 'complete' || !!this.af || !!scenario.rhythm.junctional ||
      !!scenario.rhythm.flutter || (!!vfSpec && !vfSpec.episodes);
    this.vStartMs.set(scenario.ventricular.main.id, Math.min(0, acts.ventricular.field.tMinMs));
    if (acts.ventricularAlt && scenario.ventricular.alt) this.vStartMs.set(scenario.ventricular.alt.id, Math.min(0, acts.ventricularAlt.field.tMinMs));
    this.vLeadMs = -Math.min(0, ...this.vStartMs.values());
    this.timing = {
      hvMs: acts.ventricular.hvMs,
      atrioNodalMs,
      ahMs,
      atrialSpanMs: acts.atrial.field.tMaxMs - acts.atrial.field.tMinMs,
      ventricularSpanMs: acts.ventricular.field.tMaxMs - acts.ventricular.field.tMinMs,
    };
    this.stream = new TemplateStream(this.rhythm, this.templates.lookup, this.geometry.pose, FS);
    if (this.af && afSpec) this.stream.setContinuousAtrial(this.af.buildLoop(kA, gainA * afSpec.amplitude));
    if (tdpRhythm && !acts.ventricularAlt) throw new Error('torsades de pointes needs the ectopic focus as ventricular alt variant');
    this.vf = vfModel
      ? new VfDriver({
          model: vfModel, grid: geometry.grid, kernel: kV, gain: gainV, startMs,
          tdp: tdpRhythm && acts.ventricularAlt
            ? { rhythm: tdpRhythm, prevField: acts.ventricular.field, triggerField: acts.ventricularAlt.field, apd, prevTauRepMs: p.apVentricular.tauRepMs }
            : undefined,
        })
      : null;
    if (this.vf) this.stream.setContinuousVentricular(this.vf.source);
    // The clinical ECG is AC-coupled (0.05 Hz high-pass): the steady diastolic injury current only shifts the absolute
    // baseline, which the recorder removes. Its effect on ST relative to TQ is already in the template amplitude
    // a = 1 − ε − r, so the stream stays AC-coupled; engine.steady is kept for teaching (TQ depression mechanism).

    const g = geometry.grid;
    const atrialWindows = (a: AtrialActivation, isMainSinus: boolean): StructureWindow[] => {
      const sa: StructureWindow[] = isMainSinus ? [{ id: 'SA', t0: p.saExitMs - 4, t1: p.saExitMs + 6 }] : [];
      return [
        ...sa,
        ...windowsFromField(g.region, a.field.tAct, apd.apdRefMs, STRUCTURES, 2 * p.apAtrial.tauRepMs),
        ...a.paths.filter((x) => x.id === 'BACHMANN').map((x) => ({ id: x.id, t0: x.t0, t1: x.t1 })),
      ];
    };
    const ventricularWindows = (va: VentricularActivation): StructureWindow[] => {
      const pk = va.purkinje;
      const pkWin = (ch: number, id: StructureId): StructureWindow[] => {
        let a = Infinity, b = -Infinity;
        for (let n = 0; n < pk.size; n++) {
          const tt = va.purkinjeT[n];
          if (pk.chamber[n] !== ch || !Number.isFinite(tt)) continue;
          a = Math.min(a, tt);
          b = Math.max(b, tt);
        }
        return Number.isFinite(a) ? [{ id, t0: a, t1: b }] : [];
      };
      // blocked bundle branches / fascicles carry no impulse: drop their windows
      const live = (id: StructureId) => !['LAF', 'LPF', 'LSF', 'RBB'].includes(id) || va.terminals.some((t) => t.id === id);
      const ectopic = va.terminals.length === 0;
      return [
        ...(ectopic ? [] : va.paths.filter((x) => live(x.id)).map((x) => ({ id: x.id, t0: x.t0, t1: x.t1 }))),
        ...pkWin(CHAMBER.LV, 'PURKINJE_LV'),
        ...pkWin(CHAMBER.RV, 'PURKINJE_RV'),
        ...windowsFromField(g.region, va.field.tAct, apd.apdRefMs, STRUCTURES, 2 * p.apVentricular.tauRepMs),
      ];
    };
    const sinusMain = (scenario.atrial.main.origin ?? 'SA') === 'SA' && !scenario.atrial.main.circuit;
    this.windows.set(scenario.atrial.main.id, atrialWindows(acts.atrial, sinusMain));
    if (acts.atrialAlt && scenario.atrial.alt) this.windows.set(scenario.atrial.alt.id, atrialWindows(acts.atrialAlt, false));
    this.windows.set(scenario.ventricular.main.id, ventricularWindows(acts.ventricular));
    if (acts.ventricularAlt && scenario.ventricular.alt) this.windows.set(scenario.ventricular.alt.id, ventricularWindows(acts.ventricularAlt));
  }

  /** Builds the reference-rate templates and the ones for the current rate. */
  warmTemplates(): void {
    const rr = 60000 / this.params.bpm;
    this.templates.get(this.scenario.atrial.main.id, rr);
    this.templates.get(this.scenario.ventricular.main.id, rr);
    // TdP: synthesize the first run now (deterministic), not during playback
    this.vf?.warm();
  }

  templateFor(kind: 'A' | 'V', rrPrevMs: number): BeatTemplate {
    return this.templates.get(kind === 'A' ? this.scenario.atrial.main.id : this.scenario.ventricular.main.id, rrPrevMs)!;
  }

  private tplOf(ev: AEvent | VEvent): BeatTemplate | null {
    return this.templates.get(ev.variant, ev.rrPrevMs);
  }

  sampleH(t0Ms: number, n: number, outA: Float32Array, outV: Float32Array): void {
    this.stream.sample(t0Ms, n, outA, outV);
  }

  sampleLeads(t0Ms: number, n: number, out: Float32Array): void {
    if (this.scratchA.length < 3 * n) {
      this.scratchA = new Float32Array(3 * n);
      this.scratchV = new Float32Array(3 * n);
    }
    const a = this.scratchA, v = this.scratchV;
    this.stream.sample(t0Ms, n, a, v);
    this.projector.project(a, v, n, out);
  }

  /**
   * The two most recent beats of a kind that have started by tMs. A ventricular beat starts at its earliest
   * activation, which precedes the V (His) event when an accessory pathway pre-excites the ventricles.
   */
  private lastTwo<K extends 'A' | 'V'>(kind: K, tMs: number): Extract<BeatEvent, { kind: K }>[] {
    const evs = this.rhythm.eventsUntil(kind === 'V' ? tMs + this.vLeadMs : tMs);
    const out: Extract<BeatEvent, { kind: K }>[] = [];
    for (let i = evs.length - 1; i >= 0 && out.length < 2; i--) {
      const e = evs[i];
      if (e.kind !== kind) continue;
      const start = e.kind === 'V' ? e.tMs + (this.vStartMs.get(e.variant) ?? 0) : e.tMs;
      if (start <= tMs) out.push(e as Extract<BeatEvent, { kind: K }>);
    }
    return out;
  }

  private atrialScale(e: AEvent): number {
    return apdScaleFor(e.rrPrevMs, this.params.rrRefMs, this.params.rateExp);
  }

  activeBeats(tMs: number): BeatSnapshot {
    // GPU slot: 0 = the scenario's main variant, 1 = its alternative (ectopic / escape / retrograde)
    const mk = (e: AEvent | VEvent | undefined): ActiveBeat | null =>
      e
        ? {
            eventId: e.id,
            slot: e.variant === (e.kind === 'A' ? this.scenario.atrial.main.id : this.scenario.ventricular.main.id) ? 0 : 1,
            sinceMs: tMs - e.tMs,
            apdScale: e.kind === 'V' ? e.apdScale : this.atrialScale(e),
          }
        : null;
    const a = this.lastTwo('A', tMs), v = this.lastTwo('V', tMs);
    return { atrial: [mk(a[0]), mk(a[1])], ventricular: [mk(v[0]), mk(v[1])] };
  }

  private pOnOf(a: AEvent): number | null {
    const tpl = this.tplOf(a);
    return tpl ? a.tMs + tpl.truth.onMs : null;
  }

  private qrsOnOf(v: VEvent): number | null {
    const tpl = this.tplOf(v);
    return tpl ? v.tMs + tpl.truth.onMs : null;
  }

  /** Valve times of a ventricular beat (truth.ts rate laws). */
  private vTimesOf(v: VEvent | null | undefined): VentricularTimes | null {
    const tpl = v ? this.tplOf(v) : null;
    return v && tpl ? ventricularTimes(v.tMs + tpl.truth.onMs, v.tMs + tpl.truth.repolEndMs, v.rrPrevMs) : null;
  }

  /** Events from fromMs on (the event list is sorted by time; binary search instead of a scan of the whole history). */
  private static eventsFrom(evs: readonly BeatEvent[], fromMs: number): readonly BeatEvent[] {
    let lo = 0, hi = evs.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (evs[mid].tMs < fromMs) lo = mid + 1;
      else hi = mid;
    }
    return evs.slice(lo);
  }

  /**
   * A-anchored cycles around a time: one per atrial beat (P onset; its conducted QRS, if any), and one per ventricular
   * beat no atrial beat conducted (PVC, escape: QRS onset). Such a beat takes over the non-conducted P it blocks — P
   * onset within ABSORB_BEFORE_MS before its QRS or during its QT — so the PVC, the sinus P buried in it (whose
   * contraction hits shut valves) and its compensatory pause form one cycle.
   */
  private aCycles(evs: readonly BeatEvent[]): { a: AEvent | null; v: VEvent | null; start: number }[] {
    const as = evs.filter((e): e is AEvent => e.kind === 'A');
    const vs = evs.filter((e): e is VEvent => e.kind === 'V');
    const conducted = new Map<number, VEvent>();
    for (const v of vs) if (v.fromA !== null) conducted.set(v.fromA, v);
    const claimed = new Set<number>();
    const out: { a: AEvent | null; v: VEvent | null; start: number }[] = [];
    for (const v of vs) {
      if (v.fromA !== null) continue;
      const tpl = this.tplOf(v);
      if (!tpl) continue;
      const q = v.tMs + tpl.truth.onMs, tEnd = v.tMs + tpl.truth.repolEndMs;
      let absorbed: AEvent | null = null, pAbs = q;
      for (const a of as) {
        if (conducted.has(a.id) || claimed.has(a.id)) continue;
        const p = this.pOnOf(a);
        if (p === null || p < q - ABSORB_BEFORE_MS || p >= tEnd) continue;
        absorbed = a;
        pAbs = p;
        break;
      }
      if (absorbed) claimed.add(absorbed.id);
      out.push({ a: absorbed, v, start: Math.min(q, pAbs) });
    }
    for (const a of as) {
      const p = claimed.has(a.id) ? null : this.pOnOf(a);
      if (p !== null) out.push({ a, v: conducted.get(a.id) ?? null, start: p });
    }
    return out.sort((x, y) => x.start - y.start);
  }

  cycleAt(tMs: number): CycleTruth | null {
    // the scroll-wave field drives the ventricles: no P–QRS–T cycle (VF; a torsades run)
    if (this.vf?.activeAt(tMs)) return null;
    // the cycle at t, its predecessor and successor all lie in this window (cycles are < 3 s at ≥ 20/min)
    const evs = RealEngine.eventsFrom(this.rhythm.eventsUntil(tMs + 2000), tMs - CYCLE_LOOKBACK_MS);
    const rrMs = 60000 / this.rhythm.heartRate;
    const vs = evs.filter((e): e is VEvent => e.kind === 'V');
    if (this.vCycles) {
      // dissociated rhythm: a cycle runs from one ventricular beat to the next; its atrial beats only add atrial
      // systoles (mechanical), never a P wave
      let idx = -1;
      for (let i = 0; i < vs.length; i++) {
        const q = this.qrsOnOf(vs[i]);
        if (q !== null && q <= tMs) idx = i;
      }
      if (idx < 0) return null;
      const v = vs[idx], next = vs[idx + 1] ?? null;
      const start = this.qrsOnOf(v)!;
      const nextStart = next ? this.qrsOnOf(next) : null;
      const end = nextStart ?? start + rrMs;
      const atrial: { pOnMs: number; aaMs: number }[] = [];
      for (const e of evs) {
        if (e.kind !== 'A') continue;
        const p = this.pOnOf(e);
        if (p !== null && p >= start && p < end) atrial.push({ pOnMs: p, aaMs: e.rrPrevMs });
      }
      return buildCycleTruth({
        a: null, aTpl: null, v, vTpl: this.tplOf(v), nextStartMs: nextStart,
        nextMvCloseMs: this.vTimesOf(next)?.mvClose ?? null,
        prevMvOpenMs: this.vTimesOf(vs[idx - 1])?.mvOpen ?? null,
        atrial, rrMs: next ? next.tMs - v.tMs : rrMs,
      });
    }
    const cycles = this.aCycles(evs);
    let idx = -1;
    for (let i = 0; i < cycles.length; i++) if (cycles[i].start <= tMs) idx = i;
    if (idx < 0) return null;
    const { a, v } = cycles[idx];
    const next = cycles[idx + 1] ?? null;
    const vi = v ? vs.indexOf(v) : -1;
    const nextA = next?.a ? this.pOnOf(next.a) : null;
    return buildCycleTruth({
      a, aTpl: a ? this.tplOf(a) : null, v, vTpl: v ? this.tplOf(v) : null,
      nextStartMs: next ? next.start : null,
      nextMvCloseMs: vi >= 0 ? (this.vTimesOf(vs[vi + 1])?.mvClose ?? null) : null,
      nextAtrialStartMs: nextA !== null ? nextA + MECH.atrialEmdMs : null,
      prevMvOpenMs: vi > 0 ? (this.vTimesOf(vs[vi - 1])?.mvOpen ?? null) : null,
      rrMs,
    });
  }

  responsible(tMs: number): readonly { id: StructureId; w: number }[] {
    const a = this.lastTwo('A', tMs)[0], v = this.lastTwo('V', tMs)[0];
    const out: { id: StructureId; w: number }[] = [];
    if (a) {
      const vOfA = this.rhythm.eventsUntil(tMs).find((e): e is VEvent => e.kind === 'V' && e.fromA === a.id);
      const avnEnd = vOfA ? vOfA.tMs - a.tMs : this.timing.atrioNodalMs + this.timing.ahMs;
      const avnWin: StructureWindow[] = vOfA ? [{ id: 'AVN', t0: this.timing.atrioNodalMs, t1: avnEnd }] : [];
      const win: StructureWindow[] = [...(this.windows.get(a.variant) ?? []), ...avnWin];
      out.push(...responsibleFromWindows(win, tMs - a.tMs, this.atrialScale(a)));
    }
    if (v) out.push(...responsibleFromWindows(this.windows.get(v.variant) ?? [], tMs - v.tMs, v.apdScale));
    // AF: both atria fibrillate continuously
    if (this.af) out.push({ id: 'LA', w: 1 }, { id: 'RA', w: 1 }, { id: 'LAA', w: 1 });
    // VF / torsades run: the ventricles fibrillate / re-enter as a whole
    if (this.vf?.activeAt(tMs)) for (const id of VF_RESPONSIBLE) out.push({ id, w: 1 });
    // keep the strongest weight per structure
    const best = new Map<StructureId, number>();
    for (const r of out) best.set(r.id, Math.max(best.get(r.id) ?? 0, r.w));
    return [...best.entries()].map(([id, w]) => ({ id, w })).sort((x, y) => y.w - x.w);
  }

  afFrame(tMs: number, out: Float32Array): number {
    return this.af ? this.af.pack(tMs, out) : 0;
  }

  vfFrame(tMs: number, out: Float32Array): number {
    return this.vf ? this.vf.frame(tMs, out) : 0;
  }

  setHeartRate(bpm: number): void {
    this.rhythm.setHeartRate(bpm, 0);
  }

  setPose(pose: Pose): void {
    this.geometry = { ...this.geometry, pose };
    this.stream.setPose(pose);
    this.listeners.forEach((cb) => cb());
  }

  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Local → Frank matrix of the current pose (for tests / VCG display). */
  frankMatrix() {
    return localToFrankMatrix(this.geometry.pose);
  }
}
