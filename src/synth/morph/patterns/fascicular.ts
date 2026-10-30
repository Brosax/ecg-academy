/**
 * Fascicular blocks (criteria.md `lafb`, `lpfb`, AHA/ACCF/HRS 2009 Part III) and the incomplete left bundle-branch
 * block (`lbbb-grades`: QRS 110–119 ms, no septal q in I / V5 / V6, R-peak time > 60 ms in V5–V6).
 *
 * LAFB: the anterior fascicle's Purkinje exits are lost, so the LV starts from the posterior fascicle (initial
 * inferior-rightward force: small q in I / aVL, small r in II / III / aVF) and the anterosuperior wall is reached late
 * from below (the dominant leftward-superior force: qR in aVL with a late R peak, rS in the inferior leads, axis −45…−90°).
 * LPFB is the mirror image: initial superior-leftward force (r in I / aVL, q in III / aVF), then the inferoposterior
 * wall late from above (rS in I / aVL, qR in III / aVF, axis +90…+180°).
 * iLBBB: delayed (not absent) left-bundle conduction: the septum is crossed right → left (no septal q laterally), the
 * LV free wall is reached late (R-peak time > 60 ms in V5–V6) but the QRS stays < 120 ms.
 * Provenance: new in the port, lobe directions from the region graph windows with the same blocks (heart/activation.ts),
 * amplitudes calibrated against the criteria above and the PTB-XL+ LAFB envelope (scripts/synth/realism-report.ts).
 */
import { lobe, type PatternDef } from './types';

export const LAFB_PATTERN: PatternDef = {
  id: 'lafb',
  blocks: { laf: 'complete' },
  activation: { blocks: { laf: 'complete' } },
  provenance: 'port: posterior-fascicle start, late anterosuperior LV (region graph with the LAF exits removed)',
  lobes: [
    lobe('septum + inferior LV (posterior fascicle first)', 0, 12, 30, [-0.3, 0.6, -0.74], 0.2, [
      ['lv-mid-anteroseptal', 1], ['lv-mid-inferoseptal', 1], ['lv-apical-septal', 0.5], ['lv-mid-inferior', 0.5],
    ]),
    lobe('inferoapical LV + RV', 8, 30, 52, [0.66, 0.32, -0.68], 0.55, [
      ['lv-mid-inferior', 1], ['lv-apical-inferior', 1], ['lv-apex', 0.5], ['lv-apical-septal', 0.5], ['rv-mid', 1], ['rv-apical', 1],
    ]),
    lobe('anterosuperior + lateral LV (late, from below)', 26, 58, 92, [0.6, -0.72, 0.3], 1.35, [
      ['lv-mid-anterior', 1], ['lv-apical-anterior', 1], ['lv-basal-anterior', 1], ['lv-mid-anterolateral', 1], ['lv-apical-lateral', 1],
      ['lv-mid-inferolateral', 0.5],
    ]),
    lobe('posterobasal LV + RVOT', 62, 86, 108, [-0.3, -0.6, 0.74], 0.5, [
      ['lv-basal-anterolateral', 1], ['lv-basal-inferolateral', 1], ['rv-outflow', 1],
    ]),
  ],
};

export const LPFB_PATTERN: PatternDef = {
  id: 'lpfb',
  blocks: { lpf: 'complete' },
  activation: { blocks: { lpf: 'complete' } },
  provenance: 'port: anterior-fascicle start, late inferoposterior LV (region graph with the LPF exits removed)',
  lobes: [
    lobe('septum + anterior LV (anterior fascicle first)', 0, 12, 30, [0.18, -0.52, -0.83], 0.26, [
      ['lv-mid-anteroseptal', 1], ['lv-mid-anterior', 0.5], ['lv-basal-anterior', 0.5], ['lv-apical-septal', 0.5],
    ]),
    lobe('anteroapical LV + RV', 8, 30, 52, [0.88, -0.12, -0.46], 0.72, [
      ['lv-mid-anterior', 1], ['lv-apical-anterior', 1], ['lv-apical-septal', 0.5], ['rv-mid', 1], ['rv-apical', 1],
    ]),
    lobe('inferior + inferolateral LV (late, from above)', 26, 56, 92, [-0.24, 0.93, 0.28], 1.5, [
      ['lv-mid-inferior', 1], ['lv-basal-inferior', 1], ['lv-apical-inferior', 1], ['lv-mid-inferolateral', 1], ['lv-basal-inferoseptal', 0.5],
      ['lv-apex', 0.5],
    ]),
    lobe('posterobasal LV + RVOT', 62, 84, 106, [-0.25, 0.42, 0.87], 0.4, [
      ['lv-basal-inferolateral', 1], ['lv-basal-anterolateral', 0.5], ['rv-outflow', 1],
    ]),
  ],
};

export const ILBBB_PATTERN: PatternDef = {
  id: 'ilbbb',
  blocks: { lbb: 'delay' },
  activation: { blocks: { lbb: 'delay' } },
  provenance: 'port: LBBB sequence compressed by a left-bundle delay instead of a block (region graph, delay 22 ms)',
  lobes: [
    lobe('RV + right septum', 0, 14, 32, [0.4, 0.3, -0.87], 0.13, [['rv-mid', 1], ['rv-apical', 0.5], ['lv-mid-anteroseptal', 0.5]]),
    lobe('septum R→L', 12, 44, 76, [0.5, 0.15, 0.85], 1.0, [
      ['lv-mid-anteroseptal', 1], ['lv-mid-inferoseptal', 1], ['lv-apical-septal', 1], ['lv-basal-anteroseptal', 1], ['lv-mid-anterior', 1],
    ]),
    lobe('LV free wall (late)', 34, 70, 100, [0.76, 0.22, 0.6], 1.75, [
      ['lv-mid-anterolateral', 1], ['lv-mid-inferolateral', 1], ['lv-apical-lateral', 1], ['lv-mid-inferior', 1], ['lv-apical-inferior', 1],
      ['lv-apex', 1], ['lv-basal-anterior', 1], ['lv-basal-inferior', 1],
    ]),
    lobe('posterobasal LV + RVOT', 80, 98, 115, [0.45, -0.4, 0.8], 0.3, [['lv-basal-inferolateral', 1], ['lv-basal-anterolateral', 1], ['rv-outflow', 0.5]]),
  ],
};
