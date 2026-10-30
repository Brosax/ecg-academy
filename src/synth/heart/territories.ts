/**
 * Coronary territories → core RegionId sets (DECISION §6.5).
 *
 * Assignment of the AHA 17-segment model (Cerqueira MD et al., Circulation 2002;105:539–542): LAD 1, 2, 7, 8, 13, 14,
 * 17; RCA 3, 4, 9, 10, 15; LCx 5, 6, 11, 12, 16 (right-dominant circulation), with the usual variants:
 * proximal LAD includes the first diagonal (anterolateral wall); the wrap-around of the distal LAD reaches the apex;
 * the posterior descending artery supplies the inferior septum; the posterolateral branches the inferolateral base.
 * `rv` is the RV free wall (RV branches of the proximal RCA); `apical` is the apical ballooning of takotsubo; `global`
 * is the whole ventricular myocardium (pericarditis, diffuse subendocardial ischaemia).
 */
import type { RegionId } from '../../core/regions';
import type { Territory, Where } from '../api';
import { VENT_IDS } from './anatomy';

export const TERRITORY_REGIONS: Readonly<Record<Territory, readonly RegionId[]>> = {
  'lad-proximal': [
    'lv-basal-anterior', 'lv-basal-anteroseptal', 'lv-mid-anterior', 'lv-mid-anteroseptal', 'lv-mid-anterolateral',
    'lv-apical-anterior', 'lv-apical-septal', 'lv-apex',
  ],
  'lad-mid': ['lv-mid-anterior', 'lv-mid-anteroseptal', 'lv-apical-anterior', 'lv-apical-septal', 'lv-apex'],
  'lad-distal': ['lv-apical-anterior', 'lv-apical-septal', 'lv-apical-inferior', 'lv-apex'],
  diagonal: ['lv-basal-anterolateral', 'lv-mid-anterolateral', 'lv-basal-anterior'],
  lcx: ['lv-basal-anterolateral', 'lv-basal-inferolateral', 'lv-mid-anterolateral', 'lv-mid-inferolateral', 'lv-apical-lateral'],
  om: ['lv-mid-anterolateral', 'lv-mid-inferolateral', 'lv-apical-lateral'],
  'rca-proximal': ['lv-basal-inferoseptal', 'lv-basal-inferior', 'lv-mid-inferoseptal', 'lv-mid-inferior', 'lv-apical-inferior', 'lv-basal-inferolateral'],
  'rca-distal': ['lv-basal-inferior', 'lv-mid-inferior', 'lv-apical-inferior', 'lv-basal-inferolateral'],
  pda: ['lv-basal-inferoseptal', 'lv-mid-inferoseptal', 'lv-basal-inferior'],
  posterolateral: ['lv-basal-inferolateral', 'lv-mid-inferolateral'],
  rv: ['rv-basal', 'rv-mid', 'rv-apical'],
  apical: ['lv-apical-anterior', 'lv-apical-septal', 'lv-apical-inferior', 'lv-apical-lateral', 'lv-apex'],
  global: [...VENT_IDS],
};

/** Resolve a `Where` (a territory or an explicit region list) into region ids. */
export function resolveWhere(w: Where): readonly RegionId[] {
  return typeof w === 'string' ? TERRITORY_REGIONS[w] : w;
}

/** Culprit artery fact for a territory (truth facts). */
export const TERRITORY_ARTERY: Readonly<Record<Territory, string>> = {
  'lad-proximal': 'LAD (proximal)',
  'lad-mid': 'LAD (mid)',
  'lad-distal': 'LAD (distal)',
  diagonal: 'diagonal branch',
  lcx: 'LCx',
  om: 'obtuse marginal',
  'rca-proximal': 'RCA (proximal)',
  'rca-distal': 'RCA (distal)',
  pda: 'PDA',
  posterolateral: 'posterolateral branch',
  rv: 'RCA (RV branches)',
  apical: 'none (apical ballooning)',
  global: 'diffuse',
};
