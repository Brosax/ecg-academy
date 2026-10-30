/**
 * Complete left bundle-branch block (criteria.md `lbbb-complete`, Strauss–Selvester–Wagner 2011).
 *
 * No left-septal start: initial forces come from the right septum / RV (small, anterior-leftward, rounded); the LV is
 * then activated slowly across the septum and the free wall: two leftward-posterior lobes whose overlap gives the
 * broad notched / plateaued R in I, aVL, V5, V6 (R-peak time > 60 ms), QS or rS in V1–V3; a terminal posterobasal lobe
 * aligned with the free wall. Directions follow B's gradient budget: with the normal ventricular gradient the secondary
 * T area G − A_QRS projects negatively on V5 only if A_QRS is clearly more leftward than G.
 * Provenance: prototype B `LBBB_QRS` (review passes 1–2); judge fixes of DECISION §12.2.
 */
import { lobe, type PatternDef } from './types';

export const LBBB_PATTERN: PatternDef = {
  id: 'lbbb',
  blocks: { lbb: 'complete' },
  activation: { blocks: { lbb: 'complete' } },
  // appropriate discordance (gallery review M6): J-point ST elevation in V1–V2 ≈ 0.2–0.25 mV (ST/S ≈ −0.1, well inside
  // Smith's −0.25) and ST depression ≈ 0.1–0.15 mV in I, aVL, V5, V6 — without it the ST was isoelectric before a tall T
  plateauSlope: 0.2,
  provenance: 'prototype B LBBB_QRS (review pass 2: free wall slightly inferior); plateau slope from the M6 gallery review',
  lobes: [
    lobe('RV + right septum', 0, 16, 36, [0.4, 0.3, -0.87], 0.14, [['rv-mid', 1], ['rv-apical', 0.5], ['lv-mid-anteroseptal', 0.5], ['rv-basal', 0.5]]),
    lobe('septum R→L (slow)', 14, 58, 102, [0.35, 0.08, 0.93], 1.7, [
      ['lv-mid-anteroseptal', 1], ['lv-mid-inferoseptal', 1], ['lv-apical-septal', 1], ['lv-basal-anteroseptal', 1], ['lv-basal-inferoseptal', 1],
      ['lv-mid-anterior', 1], ['lv-apical-anterior', 0.5], ['rv-outflow', 0.5],
    ]),
    lobe('LV free wall (slow)', 50, 106, 142, [0.76, 0.12, 0.64], 2.1, [
      ['lv-mid-anterolateral', 1], ['lv-mid-inferolateral', 1], ['lv-apical-lateral', 1], ['lv-mid-inferior', 1], ['lv-apical-inferior', 1],
      ['lv-apex', 1], ['lv-basal-anterior', 1], ['lv-basal-inferior', 1],
    ]),
    lobe('posterobasal LV', 112, 134, 150, [0.55, -0.35, 0.76], 0.3, [['lv-basal-inferolateral', 1], ['lv-basal-anterolateral', 1]]),
  ],
};
