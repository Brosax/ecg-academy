/**
 * Criteria registry (DECISION §8.2 T3): scenario id → hallmark criteria (+ generic opt-outs), variant additions.
 * Each group file mirrors a catalogue group file of src/synth/catalogue. Criteria read only the oracle's measurement.
 */
import { ATRIAL_CRITERIA } from './atrial';
import { AV_BLOCK_CRITERIA } from './av-block';
import { CHAMBER_CRITERIA, CHAMBER_VARIANT_CRITERIA, REPOLARIZATION_CRITERIA, STRUCTURAL_CRITERIA } from './chambers';
import { CONDUCTION_CRITERIA, CONDUCTION_VARIANT_CRITERIA } from './conduction';
import { ISCHEMIA_CRITERIA, ISCHEMIA_VARIANT_CRITERIA } from './ischemia';
import { NORMAL_CRITERIA, NORMAL_VARIANT_CRITERIA } from './normal';
import { PACING_CRITERIA } from './pacing';
import { SVT_CRITERIA } from './svt';
import { TECHNICAL_CRITERIA } from './technical';
import type { Criterion, ScenarioCriteria } from './types';
import { VENTRICULAR_CRITERIA, VENTRICULAR_VARIANT_CRITERIA } from './ventricular';

export { GENERIC } from './generic';
export * from './types';

const parts: readonly Readonly<Record<string, ScenarioCriteria>>[] = [
  NORMAL_CRITERIA, ATRIAL_CRITERIA, SVT_CRITERIA, VENTRICULAR_CRITERIA, AV_BLOCK_CRITERIA, CONDUCTION_CRITERIA,
  ISCHEMIA_CRITERIA, CHAMBER_CRITERIA, REPOLARIZATION_CRITERIA, STRUCTURAL_CRITERIA, PACING_CRITERIA, TECHNICAL_CRITERIA,
];

export const CRITERIA: Readonly<Record<string, ScenarioCriteria>> = (() => {
  const out: Record<string, ScenarioCriteria> = {};
  for (const p of parts) for (const [id, c] of Object.entries(p)) {
    if (out[id]) throw new Error(`criteria: duplicate scenario id '${id}'`);
    out[id] = c;
  }
  return out;
})();

/** scenario id → variant → additional hallmarks */
export const VARIANT_CRITERIA: Readonly<Record<string, Readonly<Record<string, readonly Criterion[]>>>> = {
  ...NORMAL_VARIANT_CRITERIA,
  ...VENTRICULAR_VARIANT_CRITERIA,
  ...CONDUCTION_VARIANT_CRITERIA,
  ...ISCHEMIA_VARIANT_CRITERIA,
  ...CHAMBER_VARIANT_CRITERIA,
};
