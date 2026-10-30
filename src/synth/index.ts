/**
 * Public surface of the synthetic ECG engine (DECISION §4, §6.1). Other modules import only this file.
 *
 * generate(): resolve (scenario + variant + dials + seeded jitter → one SourceSpec, validated) → schedule (atrial
 * events → junction → beat instances) → build morphologies once per pattern → render all kernels into H(t) and the
 * near-field electrode sums → electrode potentials (the nine computed sites plus every other site the hook-up uses:
 * explicit chest sites, Mason–Likar, V3R / V4R / V7–V9) → clean leads → truth (from model timing, re-measurable on the
 * clean signal) → recording chain (artefacts, gain, filters, ADC) → delivered leads → region states for the 3D heart.
 */
import type { Ecg } from '../core/ecg';
import type { FindingId } from '../core/findings';
import { createRng, type Rng } from '../core/rng';
import type { Difficulty, DialId, RecordingSpec, ScenarioDef, ScenarioGroup, SynthRequest, SynthResult, VentOrigin } from './api';
import { listScenarios, scenarioById } from './catalogue';
import { chainIsIdentity, recordingChain, recordingForDifficulty } from './chain/chain';
import { noiseForLevel } from './dials/dials';
import { drawDialValues } from './dials/draw';
import { jitterLobe, jitterVector } from './dials/jitter';
import { applyDials, solveAxis } from './dials/solve';
import { rotateKernel } from './kernel/kernel';
import { electrodePotentials, render } from './kernel/render';
import { angleDiff, mul, rotationMatrix, transpose } from './frame';
import { assemble } from './leads/assemble';
import { resolvePlacement, STANDARD_HOOKUP, type ComputedSite } from './leads/electrodes';
import { hookupSitePotentials } from './leads/sites';
import { atrialAreaAxis, buildAtrial, rotateAtrial } from './morph/atrial';
import { ectopicPattern, mergePatch, nativePattern, resolveScenario, validateSource } from './morph/compose';
import { buildVentricular, heartMatrix, instantiateVent, type VentBuildInput, type VentMorph } from './morph/ventricular';
import { buildRegionStates } from './regions3d/states';
import { resolveJunction } from './rhythm/junction';
import { scheduleRhythm } from './rhythm/scheduler';
import { beatQrsAxis } from './truth/axis';
import { buildTruth } from './truth/truth';

export * from './api';

/** Pre-roll before the strip (clocks start mid-rhythm, the RR history of the JT law settles, filters warm up) and
 *  tail after it (ms). */
const PRE_ROLL_MS = 4000;
const TAIL_MS = 500;

/** electrode potentials: the nine computed sites plus any other site of the hook-up */
type Potentials = Record<ComputedSite, Float64Array> & Record<string, Float64Array>;

function sumPotentials(a: Potentials, b: Potentials): Potentials {
  const out = {} as Potentials;
  for (const k of Object.keys(a)) {
    const x = a[k], y = b[k], z = new Float64Array(x.length);
    for (let i = 0; i < x.length; i++) z[i] = x[i] + y[i];
    out[k] = z;
  }
  return out;
}

function dominantRr(src: ScenarioDef['source']): number {
  const r = src.rhythm;
  if (r.kind === 'sinus' || r.kind === 'ventricular') return 60000 / r.rateBpm;
  return 800;
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * Recording layers, merged in order: the scenario's recording, the difficulty layer (noisy: diagnostic filter +
 * noise), the noise dial, the request's recording. Deep merge, except that a layer's `placement.limbs` / `.chest` map
 * replaces the previous one (a lesson that re-cables a reversal scenario states the whole hook-up).
 */
function mergeRecording(layers: readonly (RecordingSpec | undefined)[]): RecordingSpec | undefined {
  let out: RecordingSpec | undefined;
  for (const l of layers) {
    if (!l || !Object.keys(l).length) continue;
    if (!out) {
      out = l;
      continue;
    }
    const merged = mergePatch<RecordingSpec>(out, l);
    const pl = l.placement;
    if (pl && isObj(pl) && (pl.limbs || pl.chest)) {
      out = { ...merged, placement: { ...merged.placement, ...(pl.limbs ? { limbs: pl.limbs } : {}), ...(pl.chest ? { chest: pl.chest } : {}) } };
    } else out = merged;
  }
  return out;
}

export function generate(req: SynthRequest): SynthResult {
  const def = scenarioById(req.scenario);
  const fs = req.fs ?? 500;
  const durationS = req.durationS ?? 10;
  const dur = durationS * 1000;
  const n = Math.round(durationS * fs);
  const rng = createRng(req.seed);
  const useJitter = req.jitter ?? true;
  const difficulty: Difficulty = req.difficulty ?? 'classic';
  // 1. resolve: scenario + variant, dials (a dial never overrides what the variant is about), validation
  const resolved = resolveScenario(def, req.variant);
  const dialled = applyDials(def, resolved.source, req.dials, req.variant ? def.variants?.[req.variant]?.patch : undefined);
  let source = dialled.source;
  const applied: Partial<Record<DialId, number>> = { ...dialled.applied };
  validateSource(source);
  const junction = resolveJunction(source.junction);
  const mirror = source.geometry?.mirror ?? false;
  const jit = rng.fork('jitter');
  const atrial0 = buildAtrial(source.atria, 'sinus', mirror);
  let atrialJ = useJitter ? { ...atrial0, lobes: atrial0.lobes.map(jitterLobe(jit.fork('P'))) } : atrial0;
  // P-axis dial: rotate the (jittered) sinus P about Frank Z until its atrial-only area axis hits the target (≤ 2°)
  if (dialled.pAxisTarget !== null) {
    const base = atrialJ;
    const sol = solveAxis((deg) => atrialAreaAxis(rotateAtrial(base, deg), fs), dialled.pAxisTarget, 1);
    atrialJ = rotateAtrial(base, sol.deg);
    applied.pAxis = Math.round(sol.axis * 10) / 10;
  }
  const native = nativePattern(source);
  const morphInput = (src: typeof source, pattern: VentBuildInput['pattern'], salt: string): VentBuildInput => ({
    pattern, substrate: src.substrate, repol: src.repol, injury: src.injury, nearField: src.nearField, geometry: src.geometry,
    jitterLobe: useJitter ? jitterLobe(jit.fork(`qrs:${salt}`)) : undefined,
    jitterG: useJitter ? jitterVector(jit.fork(`G:${salt}`)) : undefined,
    refRrMs: dominantRr(src),
  });
  // axis dial: rotate the heart about Frank Z until the ventricular-only net axis hits the target (≤ 1°). The search
  // turns the kernels of one built beat (a frontal rotation of the heart is R·Rz(Δ)·Rᵀ on the built sources); the
  // result is then checked — and refined if needed — on full builds at the found angle (exact truth)
  if (dialled.axisTarget !== null) {
    const isVentricular = source.rhythm.kind === 'ventricular';
    const pattern = isVentricular && source.rhythm.kind === 'ventricular' ? ectopicPattern(source.rhythm.origin) : native.pattern;
    const salt = isVentricular ? 'ectopic' : 'native';
    const base = source.geometry?.frontalDeg ?? 0;
    const rr = dominantRr(source);
    const exactAt = (deg: number): number => {
      const src = mergePatch(source, { geometry: { frontalDeg: base + deg } });
      const b = instantiateVent(buildVentricular(morphInput(src, pattern, salt)), 1000, rr, 0);
      return beatQrsAxis(b.kernels, b.qrsOn, b.qrsOff, fs, STANDARD_HOOKUP);
    };
    const b0 = instantiateVent(buildVentricular(morphInput(source, pattern, salt)), 1000, rr, 0);
    const M = heartMatrix(source.geometry), Mt = transpose(M);
    const inQrs = b0.kernels.filter((k) => k.s1 > b0.qrsOn - 4 && k.s0 < b0.qrsOff + 4);
    const fastAt = (deg: number): number => {
      const Q = mul(M, mul(rotationMatrix(deg), Mt));
      return beatQrsAxis(inQrs.map((k) => rotateKernel(k, Q)), b0.qrsOn, b0.qrsOff, fs, STANDARD_HOOKUP);
    };
    let deg = solveAxis(fastAt, dialled.axisTarget).deg;
    let axis = exactAt(deg);
    for (let k = 0; k < 3 && Math.abs(angleDiff(axis, dialled.axisTarget)) > 0.5; k++) {
      const d2 = Math.max(-100, Math.min(100, deg - angleDiff(axis, dialled.axisTarget)));
      const a2 = exactAt(d2);
      if (Math.abs(angleDiff(a2, dialled.axisTarget)) >= Math.abs(angleDiff(axis, dialled.axisTarget))) break;
      deg = d2;
      axis = a2;
    }
    source = mergePatch(source, { geometry: { frontalDeg: base + deg } });
    applied.axis = Math.round(axis * 10) / 10;
  }
  // 2–3. morphologies (once per pattern) and the schedule
  const nativeMorph = buildVentricular(morphInput(source, native.pattern, 'native'));
  const ectopicCache = new Map<VentOrigin, VentMorph>();
  const ectopic = (o: VentOrigin): VentMorph => {
    let m = ectopicCache.get(o);
    if (!m) {
      m = buildVentricular(morphInput(source, ectopicPattern(o), `ectopic:${o}`));
      ectopicCache.set(o, m);
    }
    return m;
  };
  const schedule = scheduleRhythm({
    source, junction, atrial: atrialJ, native: nativeMorph, nativeKind: native.kind, ectopic, rng: rng.fork('rhythm'),
    t0: -PRE_ROLL_MS, t1: dur + TAIL_MS, mirror,
  });
  // the recording: placement (cables, explicit chest sites, Mason–Likar, extra leads) must be known before the render
  const recording = mergeRecording([
    def.recording, recordingForDifficulty(difficulty), dialled.noiseMv !== null ? { noise: noiseForLevel(dialled.noiseMv) } : undefined, req.recording,
  ]);
  const hook = resolvePlacement(recording?.placement, req.extraLeads);
  // 4–6. render, electrode potentials, clean leads. Ventricular and atrial kernels are rendered separately (their sum
  // is the clean signal): the truth reads the ventricular-only and atrial-only parts without any extra render
  const torsoGain = source.geometry?.torsoGain ?? 1;
  const kV = schedule.kernels.filter((k) => !k.atrialField), kA = schedule.kernels.filter((k) => k.atrialField);
  const rV = render(kV, fs, n, 0);
  const rA = render(kA, fs, n, 0);
  const phiV: Potentials = { ...electrodePotentials(rV, torsoGain), ...hookupSitePotentials(rV, kV, hook, torsoGain) };
  const phiA: Potentials = { ...electrodePotentials(rA, torsoGain), ...hookupSitePotentials(rA, kA, hook, torsoGain) };
  // the clean leads are assembled from the summed potentials (every lead formula applied once: Einthoven / Goldberger
  // to Float32 rounding, and a cable swap permutes the leads bit for bit); the ventricular-only and atrial-only parts
  // are the truth's
  const phi = sumPotentials(phiV, phiA);
  const vent = assemble(phiV, hook), atrialOnly = assemble(phiA, hook);
  const clean = assemble(phi, hook);
  const { truth, axisAmbiguous } = buildTruth({
    scenario: def, declared: resolved.declared, schedule, clean, fs, durationMs: dur, vent, atrialOnly,
    facts: { ...(def.facts ?? {}), ...(req.variant ? { variant: req.variant } : {}) }, placement: recording?.placement,
  });
  if (dialled.applied.ventricularResponse !== undefined) applied.ventricularResponse = Math.round(truth.hrBpm * 10) / 10;
  // 7. recording chain (seeded on its own fork: no other stream moves)
  const chain = chainIsIdentity(recording, schedule.myopotentials)
    ? { leads: clean, noiseMv: 0, artefacts: [] as FindingId[] }
    : recordingChain(phi, hook, recording, { fs, rng: rng.fork('chain'), emgBursts: schedule.myopotentials });
  if (dialled.noiseMv !== null) applied.noise = chain.noiseMv;
  const findings: FindingId[] = chain.artefacts.length ? [...new Set([...truth.findings, ...chain.artefacts])] : [...truth.findings];
  // 8. region states
  const regions = buildRegionStates({
    schedule, blocks: source.activation.blocks, hvMs: junction.hvMs, highlights: def.highlights ?? {},
  });
  const ecg: Ecg = {
    origin: { kind: 'synthetic', scenarioId: def.id, seed: req.seed },
    signal: { fs, durationMs: dur, leads: chain.leads },
    truth: { ...truth, findings },
    regions,
  };
  const vcg = req.withVcg
    ? ([0, 1, 2].map((c) => Float32Array.from(rV.H[c], (v, i) => v + rA.H[c][i])) as unknown as readonly [Float32Array, Float32Array, Float32Array])
    : undefined;
  return { ecg, applied, axisAmbiguous, ...(vcg ? { vcg } : {}) };
}

/** Catalogue scenarios, optionally filtered by group and / or a declared finding. */
export function scenarios(filter?: { readonly group?: ScenarioGroup; readonly finding?: FindingId }): readonly ScenarioDef[] {
  return listScenarios(filter);
}

/**
 * Draw dial values for a drill item (seeded; DECISION §7 difficulty ladder, dials/draw.ts): classic = the middle half
 * of each scenario range outside the exclusion bands of the dial's thresholds; subtle = the quarter nearest the
 * scenario's closest threshold, outside its band; noisy = classic values (generate() adds the noise for the
 * request's difficulty); borderline = inside a band that meets the range. Only implemented dials the scenario
 * declares are drawn; the values are on each dial's step grid.
 */
export function drawDials(scenarioId: string, rng: Rng, difficulty: Difficulty): Readonly<Partial<Record<DialId, number>>> {
  return drawDialValues(scenarioById(scenarioId), rng, difficulty);
}
