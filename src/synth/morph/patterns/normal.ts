/**
 * Normal ventricular activation (the calibrated base every other pattern inherits; DECISION §8.3 step 1).
 *
 * Four lobes (Durrer 1970): septal activation left → right (anterior-rightward: septal q in I, aVL, V5, V6 and r in
 * V1), anteroapical LV + RV (Purkinje-fed, early), the LV free wall (the dominant leftward-inferior-posterior force),
 * and the posterobasal LV + RV outflow tract (reached last, no Purkinje exits: terminal superior-posterior force).
 * Provenance: prototype B `NORMAL_QRS`, re-tagged with core regions, then re-calibrated in the port against the
 * PTB-XL+ NORM envelope and the judges' fixes (DECISION §12.2: septal lobe less superior, smaller anterior force for
 * a V3–V4 transition, larger lead I R). Last calibration 2026-10-17 (calibrate.ts, 10 passes, axis target +40°, loss
 * 18.7 → 8.4; residuals inside the NORM 5–95 % envelope: V2 S −0.64 vs −1.08 mV median, V4 T 0.55 vs 0.38 mV).
 */
import { lobe, type PatternDef } from './types';

export const NORMAL_PATTERN: PatternDef = {
  id: 'normal',
  blocks: {},
  activation: {},
  provenance: 'prototype B NORMAL_QRS → core regions; recalibrated on PTB-XL+ NORM (scripts/synth/calibrate.ts)',
  lobes: [
    lobe('septal L→R', 0, 7, 27, [-0.357, 0.279, -0.891], 0.12, [['lv-mid-anteroseptal', 1], ['lv-mid-inferoseptal', 1], ['lv-apical-septal', 0.5]]),
    lobe('anteroapical LV + RV', 8, 32, 50, [0.903, -0.025, -0.429], 0.83, [
      ['lv-mid-anterior', 1], ['lv-apical-anterior', 1], ['lv-basal-anterior', 0.5], ['lv-apical-septal', 0.5], ['lv-basal-anteroseptal', 0.5],
      ['lv-basal-inferoseptal', 0.5], ['rv-mid', 1], ['rv-apical', 1], ['rv-basal', 0.5],
    ]),
    lobe('LV free wall', 22, 51, 68, [0.677, 0.459, 0.576], 1.35, [
      ['lv-mid-anterolateral', 1], ['lv-mid-inferolateral', 1], ['lv-apical-lateral', 1], ['lv-mid-inferior', 1], ['lv-apical-inferior', 1],
      ['lv-apex', 0.5], ['lv-basal-inferior', 0.5],
    ]),
    lobe('posterobasal LV + RVOT', 52, 69, 94, [-0.074, -0.115, 0.991], 0.36, [
      ['lv-basal-inferolateral', 1], ['lv-basal-anterolateral', 1], ['rv-outflow', 1],
    ]),
  ],
};
