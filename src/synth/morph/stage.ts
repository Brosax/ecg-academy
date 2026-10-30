/**
 * Stage maps (DECISION §6.5 "infarct age", §9.9 hyperkalaemia, §9.10 pericarditis): one documented function per
 * course that turns a stage in [0, 1] into the SourceSpec parts that change with it. The catalogue builds its stage
 * variants with these functions; the `stage` dial (synth-finish, dials/) is meant to call the same functions, so a
 * dialled stage and a catalogue variant at that stage are the same model.
 *
 * Infarct (acute coronary occlusion → old MI), piecewise linear between the knots below:
 *   ΔAPD_epi of the territory (ms): −40 (hyperacute: epicardial APD shortening → broad, tall T) → −15 → +55 → +60 → +15
 *   injury current (fraction of the peak ST):  0.15 → 1 → 0.35 → 0.1 → 0
 *   necrosis transmurality τ:                  0 → 0.15 → 0.65 → 0.8 → 0.8
 *   QTc (ms):                                  405 → 405 → 445 → 440 → 410
 * at stage 0 (hyperacute, minutes) · 0.25 (acute, hours) · 0.5 (evolving, ~1–2 days) · 0.75 (subacute, weeks) · 1 (old).
 * Wagner GS et al. (AHA/ACCF/HRS 2009 Part VI, Circulation 2009;119:e262) and criteria.md `mi-time-course`: hyperacute
 * T → ST elevation → Q waves with T inversion → resolution of the ST (persistent ST elevation = aneurysm).
 */
import type { ApdChange, InjurySpec, SourceSpec, Where } from '../api';

const lerpKnots = (knots: readonly (readonly [number, number])[], s: number): number => {
  const x = Math.min(1, Math.max(0, s));
  for (let i = 1; i < knots.length; i++) {
    const [x0, y0] = knots[i - 1], [x1, y1] = knots[i];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return knots[knots.length - 1][1];
};

export const INFARCT_KNOTS = {
  apdEpiMs: [[0, -40], [0.25, -15], [0.5, 55], [0.75, 60], [1, 15]],
  injury: [[0, 0.15], [0.25, 1], [0.5, 0.35], [0.75, 0.1], [1, 0]],
  necrosis: [[0, 0], [0.25, 0.15], [0.5, 0.65], [0.75, 0.8], [1, 0.8]],
  /** QTc (Fridericia, ms): the deep post-infarction T inversion comes with a longer QT */
  qtcMs: [[0, 405], [0.25, 405], [0.5, 445], [0.75, 440], [1, 410]],
} as const;

export interface InfarctStageInput {
  /** territory of the occluded artery (injury, APD change and scar) */
  readonly where: Where;
  /** peak ST at J+60 in `ref` (mV) reached at the acute stage */
  readonly peakStMv: number;
  readonly ref?: InjurySpec['ref'];
  /** where the scar forms if not the whole territory (necrosis is usually smaller than the area at risk) */
  readonly scarWhere?: Where;
  /** where the post-infarction epicardial APD prolongation (T inversion) sits, if not the whole territory */
  readonly inversionWhere?: Where;
  readonly fragmented?: boolean;
}

/** The SourceSpec parts of an infarct at `stage` (0 hyperacute … 1 old). */
export function infarctStage(inp: InfarctStageInput, stage: number): Pick<SourceSpec, 'injury'> & { repol: { apd: ApdChange[]; qtcMs: number }; substrate: NonNullable<SourceSpec['substrate']> } {
  const inj = lerpKnots(INFARCT_KNOTS.injury, stage);
  const apd = lerpKnots(INFARCT_KNOTS.apdEpiMs, stage);
  const tau = lerpKnots(INFARCT_KNOTS.necrosis, stage);
  const injury: InjurySpec[] = inj > 0.005 ? [{ where: inp.where, layer: 'transmural', stMv: Math.round(inp.peakStMv * inj * 1000) / 1000, ...(inp.ref ? { ref: inp.ref } : {}) }] : [];
  return {
    injury,
    repol: {
      apd: Math.abs(apd) > 0.5 ? [{ where: apd > 0 ? (inp.inversionWhere ?? inp.where) : inp.where, layer: 'epi', deltaMs: Math.round(apd) }] : [],
      qtcMs: Math.round(lerpKnots(INFARCT_KNOTS.qtcMs, stage)),
    },
    substrate: { scar: tau > 0.005 ? [{ where: inp.scarWhere ?? inp.where, transmurality: Math.round(tau * 100) / 100, ...(inp.fragmented ? { fragmented: true } : {}) }] : [] },
  };
}

/**
 * Hyperkalaemia (criteria.md `qt-causes`, DECISION §9.9, §11 "accepted and named"): stage 0 → 1 maps mild → severe.
 * T: phase-3 steepening (tShape.q 1.6 → 1.35: tall, tented), the ST segment shortening to nothing and the T rising
 * earlier (riseFrac 0.6 → 0.45) so that at the severe end the T rises straight out of the wide QRS (pre-sine-wave); P
 * flattening (atria.gain 1 → 0.15); PR prolongation (AV-node ahMin +0 → +80 ms); QRS widening (conduction 1 → 1.9).
 */
export function hyperkalemiaStage(stage: number): Pick<SourceSpec, 'atria' | 'substrate'> & { repol: NonNullable<SourceSpec['repol']>; ahExtraMs: number } {
  const s = Math.min(1, Math.max(0, stage));
  return {
    atria: { gain: Math.round((1 - 0.85 * s ** 1.3) * 100) / 100 },
    substrate: { conduction: Math.round((1 + 0.9 * s ** 2) * 100) / 100 },
    repol: {
      qtcMs: Math.round(385 - 15 * s),
      gScale: Math.round((1.1 + 0.4 * s) * 100) / 100,
      // tall, tented T (phase-3 steepening); its ST segment shrinks to nothing, so at the severe end the T rises
      // straight out of the wide QRS
      tShape: { q: Math.round((1.6 - 0.25 * s) * 100) / 100, stMs: Math.round(40 * (1 - s)), riseFrac: Math.round((0.6 - 0.15 * s) * 100) / 100 },
      u: { ratio: 0 },
    },
    ahExtraMs: Math.round(80 * s ** 1.5),
  };
}
