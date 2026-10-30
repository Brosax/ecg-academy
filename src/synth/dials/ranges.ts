/**
 * Drill ranges (T5): the sub-ranges of the scenario dial ranges that drills draw from (drawDials) and that the dial
 * sweep validates. A scenario's own `dials` range (ScenarioDef.dials) is what lessons and live blocks may request — the
 * truth is exact everywhere in it — but near its edges the independent oracle cannot always re-measure the tracing
 * (the P onset at a short TP, the J point of a small ST elevation, F waves hidden at 2:1 flutter) or a hallmark sits
 * at its threshold, so an exam item could not be verified there. Each entry was narrowed by the sweep
 * (scripts/synth/sweep.ts) until min, middle and max pass T1–T3; `null` removes a dial from drills.
 * Ranges are intersected with the scenario's own range (drillRanges).
 */
import type { DialId, DialRange, ScenarioDef } from '../api';

type Ranges = Readonly<Partial<Record<DialId, DialRange | null>>>;

export const DRILL_RANGES: Readonly<Record<string, Ranges>> = {
  'normal': { rate: { min: 62, max: 98 }, pr: { min: 126, max: 194 }, qrs: { min: 80, max: 104 }, qtc: { min: 395, max: 435 }, axis: { min: 10, max: 80 }, pAxis: { min: 25, max: 65 }, tAmp: { min: 0.8, max: 1.05 } },
  'sinus-bradycardia': { rate: { min: 40, max: 57 }, pr: { min: 126, max: 194 }, qrs: { min: 80, max: 104 }, qtc: { min: 395, max: 435 }, axis: { min: 10, max: 80 }, pAxis: { min: 25, max: 65 }, tAmp: { min: 0.8, max: 1.05 }, hrv: { min: 0, max: 0.025 } },
  'sinus-tachycardia': { rate: { min: 104, max: 116 }, pr: { min: 128, max: 150 }, qrs: { min: 80, max: 100 }, qtc: { min: 395, max: 420 }, axis: { min: 30, max: 50 }, pAxis: { min: 35, max: 65 }, tAmp: { min: 0.8, max: 1 }, hrv: { min: 0, max: 0.03 } },
  'sinus-arrhythmia': { rate: { min: 62, max: 85 }, pr: { min: 126, max: 194 }, qrs: { min: 80, max: 104 }, qtc: { min: 395, max: 435 }, axis: { min: 25, max: 80 }, pAxis: { min: 25, max: 65 }, tAmp: { min: 0.8, max: 1.05 } },
  // the st dial scales the inferior / lateral shares with V2 (2026-10-29): below 0.09 the Jp in II / aVF falls under 0.1 mV
  'early-repolarization': { st: { min: 0.09, max: 0.13 } },
  'pac': { rate: { min: 62, max: 72 } },
  'junctional-escape-rhythm': { rate: { min: 42, max: 57 } },
  'accelerated-junctional-rhythm': { rate: { min: 65, max: 88 } },
  'atrial-fibrillation': { ventricularResponse: { min: 60, max: 110 }, fCoarseness: { min: 0.5, max: 0.9 } },
  'atrial-flutter': { conductionRatio: null },
  'vt-monomorphic': { rate: { min: 155, max: 170 } },
  'pvc': { rate: { min: 70, max: 88 } },
  'ventricular-bigeminy': { rate: { min: 69, max: 76 } },
  'av-block-1': { rate: { min: 55, max: 76 }, pr: { min: 220, max: 300 } },
  'av-block-2-mobitz2': { rate: { min: 60, max: 78 } },
  // nodal 2:1: above ≈ 280 ms the blocked P falls on the preceding T and the oracle cannot re-find it (lessons may
  // still request up to the scenario's 340 ms)
  'av-block-2-2to1': { pr: { min: 160, max: 280 } },
  'rbbb': { rate: { min: 55, max: 85 } },
  'lbbb': { rate: { min: 60, max: 85 }, qrs: { min: 145, max: 170 } },
  'lafb': { rate: { min: 55, max: 88 }, axis: { min: -64, max: -53 } },
  'lpfb': { rate: { min: 55, max: 88 }, axis: { min: 100, max: 125 } },
  'bifascicular-block': { rate: { min: 55, max: 85 } },
  'trifascicular-block': { rate: { min: 50, max: 68 }, pr: { min: 230, max: 270 } },
  'rate-dependent-bbb': { rate: null },
  'ivcd': { qrs: { min: 116, max: 135 } },
  'stemi-anterior': { rate: { min: 65, max: 95 }, st: { min: 0.26, max: 0.33 } },
  'stemi-anterolateral': { rate: { min: 65, max: 100 }, st: { min: 0.27, max: 0.4 } },
  'stemi-high-lateral': { st: { min: 0.16, max: 0.25 } },
  'stemi-lateral': { st: { min: 0.15, max: 0.3 } },
  // the tall, late upright mirror T of V1–V3 (posterior epicardial APD) reaches the next P above 90 /min: P onset read late
  'stemi-posterior': { rate: { min: 60, max: 90 } },
  'stemi-inferior': { rate: { min: 55, max: 88 }, st: { min: 0.2, max: 0.4 } },
  'hyperacute-t': { rate: { min: 60, max: 92 } },
  'de-winter': { rate: { min: 65, max: 92 } },
  'old-mi': { rate: { min: 55, max: 88 } },
  'sgarbossa': { rate: { min: 60, max: 82 } },
  'rae': { rate: { min: 65, max: 88 } },
  'lvh-strain': { rate: { min: 55, max: 85 } },
  'rvh': { rate: { min: 65, max: 95 } },
  'electrical-alternans': { rate: { min: 102, max: 120 } },
  'hyperkalemia-severe': { rate: { min: 55, max: 66 } },
  'hypocalcemia': { rate: { min: 55, max: 78 } },
  'na-channel-blockade': { rate: { min: 101, max: 105 } },
  'pulmonary-embolism': { rate: { min: 104, max: 115 } },
  'electrode-reversal-la-ra': { rate: { min: 62, max: 88 } },
  'electrode-reversal-la-ll': { rate: { min: 62, max: 88 } },
  'electrode-reversal-ra-ll': { rate: { min: 62, max: 88 } },
  'neutral-cable-reversal': { rate: { min: 62, max: 88 } },
  'precordial-misplacement': { rate: { min: 62, max: 88 } },
  'precordial-misplacement-high': { rate: { min: 62, max: 88 } },
  'limbs-on-torso': { rate: { min: 62, max: 88 } },
  'baseline-wander': { rate: { min: 62, max: 88 } },
  'muscle-tremor': { rate: { min: 62, max: 88 } },
  'muscle-tremor-parkinsonian': { rate: { min: 66, max: 85 } },
  'ac-interference': { rate: { min: 62, max: 88 } },
  'motion-artefact': { rate: { min: 62, max: 88 } },
};

/** The dial ranges drills draw from: the scenario's ranges, narrowed (or removed) by DRILL_RANGES. */
export function drillRanges(def: ScenarioDef): Readonly<Partial<Record<DialId, DialRange>>> {
  const over = DRILL_RANGES[def.id] ?? {};
  const out: Partial<Record<DialId, DialRange>> = {};
  for (const id of Object.keys(def.dials) as DialId[]) {
    const r = def.dials[id];
    if (!r) continue;
    const o = over[id];
    if (o === null) continue;
    const lo = Math.max(r.min, o?.min ?? r.min), hi = Math.min(r.max, o?.max ?? r.max);
    if (hi >= lo) out[id] = { min: lo, max: hi };
  }
  return out;
}
