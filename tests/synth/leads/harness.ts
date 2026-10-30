/**
 * Test harness of the lead-system tests: `scheduleOf` runs steps 1–3 of generate() (resolve, morphologies, schedule)
 * and returns the kernels of a request, so a test can render electrode sites, the near field or the chain directly.
 * It mirrors src/synth/index.ts › generate() only for requests without the axis and pAxis dials (here the axis is
 * solved by full-build bisection and the sinus P is not rotated, so the kernels can differ slightly from generate()'s);
 * tests that need delivered leads call generate() itself.
 */
import { createRng } from '../../../src/core/rng';
import type { DialId, ScenarioDef, SynthRequest, VentOrigin } from '../../../src/synth';
import { scenarioById } from '../../../src/synth/catalogue';
import { jitterLobe, jitterVector } from '../../../src/synth/dials/jitter';
import { applyDials, solveAxis } from '../../../src/synth/dials/solve';
import { resolvePlacement } from '../../../src/synth/leads/electrodes';
import { buildAtrial } from '../../../src/synth/morph/atrial';
import { ectopicPattern, mergePatch, nativePattern, resolveScenario, validateSource } from '../../../src/synth/morph/compose';
import { buildVentricular, instantiateVent, type VentBuildInput, type VentMorph } from '../../../src/synth/morph/ventricular';
import { resolveJunction } from '../../../src/synth/rhythm/junction';
import { scheduleRhythm } from '../../../src/synth/rhythm/scheduler';
import { beatQrsAxis } from '../../../src/synth/truth/axis';

const PRE_ROLL_MS = 4000;
const TAIL_MS = 500;

function dominantRr(src: ScenarioDef['source']): number {
  const r = src.rhythm;
  if (r.kind === 'sinus' || r.kind === 'ventricular') return 60000 / r.rateBpm;
  return 800;
}

/** Steps 1–3 of generate() (resolve, morphologies, schedule): the kernels of a request. */
export function scheduleOf(req: SynthRequest, def: ScenarioDef = scenarioById(req.scenario)) {
  const fs = req.fs ?? 500;
  const durationS = req.durationS ?? 10;
  const dur = durationS * 1000;
  const n = Math.round(durationS * fs);
  const rng = createRng(req.seed);
  const useJitter = req.jitter ?? true;
  const resolved = resolveScenario(def, req.variant);
  const dialled = applyDials(def, resolved.source, req.dials, req.variant ? def.variants?.[req.variant]?.patch : undefined);
  let source = dialled.source;
  const applied: Partial<Record<DialId, number>> = { ...dialled.applied };
  validateSource(source);
  const junction = resolveJunction(source.junction);
  const mirror = source.geometry?.mirror ?? false;
  const jit = rng.fork('jitter');
  const atrial = buildAtrial(source.atria, 'sinus', mirror);
  const atrialJ = useJitter ? { ...atrial, lobes: atrial.lobes.map(jitterLobe(jit.fork('P'))) } : atrial;
  const native = nativePattern(source);
  const morphInput = (src: typeof source, pattern: VentBuildInput['pattern'], salt: string): VentBuildInput => ({
    pattern, substrate: src.substrate, repol: src.repol, injury: src.injury, nearField: src.nearField, geometry: src.geometry,
    jitterLobe: useJitter ? jitterLobe(jit.fork(`qrs:${salt}`)) : undefined,
    jitterG: useJitter ? jitterVector(jit.fork(`G:${salt}`)) : undefined,
    refRrMs: dominantRr(src),
  });
  if (dialled.axisTarget !== null) {
    const isVentricular = source.rhythm.kind === 'ventricular';
    const pattern = isVentricular && source.rhythm.kind === 'ventricular' ? ectopicPattern(source.rhythm.origin) : native.pattern;
    const base = source.geometry?.frontalDeg ?? 0;
    const axisAt = (deg: number): number => {
      const src = mergePatch(source, { geometry: { frontalDeg: base + deg } });
      const m = buildVentricular(morphInput(src, pattern, isVentricular ? 'ectopic' : 'native'));
      const b = instantiateVent(m, 1000, dominantRr(src), 0);
      return beatQrsAxis(b.kernels, b.qrsOn, b.qrsOff, fs, resolvePlacement(undefined));
    };
    const sol = solveAxis(axisAt, dialled.axisTarget);
    source = mergePatch(source, { geometry: { frontalDeg: base + sol.deg } });
    applied.axis = Math.round(sol.axis * 10) / 10;
  }
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
  const torsoGain = source.geometry?.torsoGain ?? 1;
  const kV = schedule.kernels.filter((k) => !k.atrialField), kA = schedule.kernels.filter((k) => k.atrialField);
  return { fs, n, dur, rng, resolved, source, applied, junction, schedule, torsoGain, kV, kA };
}
