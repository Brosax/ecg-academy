/**
 * Incomplete right bundle-branch block (criteria.md `rbbb-incomplete` / `bbb-qrs-cutoff`: QRS 110–119 ms with the RBBB
 * morphology; rsr′ in V1–V2, terminal slurred S in I and V6). A normal variant in the young and in athletes.
 *
 * Delayed (not absent) right-bundle conduction: the normal LV sequence, a smaller transseptal breakthrough and a short,
 * earlier late RV/RVOT lobe than in complete RBBB.
 * Provenance: new in the port (derived from the RBBB pattern, calibrated against the PTB-XL+ IRBBB envelope).
 */
import { NORMAL_PATTERN } from './normal';
import { lobe, type PatternDef } from './types';

const N = NORMAL_PATTERN.lobes;

export const IRBBB_PATTERN: PatternDef = {
  id: 'irbbb',
  blocks: { rbb: 'delay' },
  activation: { blocks: { rbb: 'delay' } },
  provenance: 'port: RBBB pattern with a 22 ms right-bundle delay instead of a block (region graph) and a shorter RV lobe',
  lobes: [
    N[0],
    { ...N[1], label: 'anteroapical LV (+ early RV)', amp: N[1].amp * 0.9, regions: [['lv-mid-anterior', 1], ['lv-apical-anterior', 1], ['lv-basal-anterior', 0.5], ['lv-apical-septal', 0.5], ['rv-apical', 0.5]] },
    N[2],
    lobe('posterobasal LV', 52, 68, 86, [-0.2, -0.55, 0.8], 0.32, [['lv-basal-inferolateral', 1], ['lv-basal-anterolateral', 1]]),
    lobe('transseptal → RV', 20, 44, 68, [-0.1, 0.1, -0.99], 0.3, [['lv-mid-anteroseptal', 0.5], ['lv-mid-inferoseptal', 0.5], ['rv-apical', 0.5]]),
    lobe('delayed RV free wall + RVOT', 46, 84, 116, [-0.45, -0.25, -0.86], 0.45, [['rv-mid', 1], ['rv-basal', 1], ['rv-outflow', 1]]),
  ],
};
