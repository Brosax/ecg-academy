/**
 * Complete right bundle-branch block (criteria.md `rbbb-complete`, AHA/ACCF/HRS 2009 Part III).
 *
 * The LV is activated normally (septum left → right first); without a right bundle the septum is crossed from the
 * left only and the wavefront breaks through into the RV endocardium while the LV free wall is still active (an
 * anterior force that truncates the V1 S → rsR′ "M"); the RV free wall and outflow tract are then activated slowly,
 * cell to cell (terminal rightward-anterior lobe → R′ in V1–V2, broad slurred S in I, aVL, V5, V6). The secondary,
 * discordant T (inverted V1–V2) follows from the unchanged ventricular gradient.
 * Provenance: prototype B `RBBB_QRS` (review pass 1), derived from the normal base; judge fixes of DECISION §12.2.
 */
import { NORMAL_PATTERN } from './normal';
import { lobe, type PatternDef } from './types';

const N = NORMAL_PATTERN.lobes;

export const RBBB_PATTERN: PatternDef = {
  id: 'rbbb',
  blocks: { rbb: 'complete' },
  activation: { blocks: { rbb: 'complete' } },
  provenance: 'prototype B RBBB_QRS (normal septal + free-wall lobes, transseptal breakthrough, slow RV/RVOT lobe)',
  lobes: [
    N[0],
    { ...N[1], label: 'anteroapical LV', regions: [['lv-mid-anterior', 1], ['lv-apical-anterior', 1], ['lv-basal-anterior', 0.5], ['lv-apical-septal', 0.5]] },
    N[2],
    lobe('posterobasal LV', 52, 68, 86, [-0.2, -0.55, 0.8], 0.32, [['lv-basal-inferolateral', 1], ['lv-basal-anterolateral', 1]]),
    lobe('transseptal → RV breakthrough', 18, 44, 72, [-0.05, 0.1, -0.99], 0.3, [
      ['lv-mid-anteroseptal', 0.5], ['lv-mid-inferoseptal', 0.5], ['lv-basal-anteroseptal', 0.5], ['lv-basal-inferoseptal', 0.5], ['rv-apical', 0.5],
    ]),
    lobe('RV free wall + RVOT (slow)', 46, 94, 142, [-0.65, -0.3, -0.7], 0.85, [['rv-mid', 1], ['rv-basal', 1], ['rv-outflow', 1]]),
  ],
};
