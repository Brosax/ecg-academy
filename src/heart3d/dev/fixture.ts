/**
 * Development fixture (not shipped, not imported by app code): a hand-timed normal activation sequence as RegionStates,
 * used by the dev harness (dev/index.html) and the tests to exercise colours and phases without the synthetic engine.
 * Times in ms within one 1000 ms cycle: [depolarization start, end, repolarization start, end].
 */
import type { RegionStates } from '../../core/ecg';
import { REGION_LIST, type RegionId } from '../../core/regions';

type Timing = readonly [number, number, number, number];

const T: Readonly<Record<RegionId, Timing>> = {
  'sa-node': [0, 8, 250, 300],
  ra: [10, 75, 260, 330],
  la: [40, 105, 280, 350],
  'av-node': [60, 150, 300, 380],
  his: [150, 158, 320, 400],
  lbb: [158, 166, 330, 410],
  rbb: [158, 170, 330, 410],
  laf: [166, 176, 340, 420],
  lpf: [166, 176, 340, 420],
  purkinje: [172, 190, 350, 430],
  'lv-mid-anteroseptal': [180, 196, 420, 500],
  'lv-mid-inferoseptal': [181, 197, 420, 500],
  'lv-apical-septal': [186, 202, 410, 490],
  'lv-apex': [190, 206, 400, 480],
  'lv-apical-anterior': [192, 208, 405, 485],
  'lv-apical-inferior': [192, 208, 405, 485],
  'lv-apical-lateral': [195, 212, 405, 485],
  'lv-mid-anterior': [196, 214, 415, 500],
  'lv-mid-inferior': [196, 214, 415, 500],
  'lv-mid-anterolateral': [200, 220, 415, 505],
  'lv-mid-inferolateral': [202, 222, 415, 505],
  'lv-basal-anteroseptal': [200, 216, 430, 515],
  'lv-basal-inferoseptal': [201, 218, 430, 515],
  'lv-basal-anterior': [206, 226, 430, 520],
  'lv-basal-inferior': [206, 226, 430, 520],
  'lv-basal-anterolateral': [212, 236, 430, 525],
  'lv-basal-inferolateral': [214, 240, 430, 525],
  'rv-apical': [190, 206, 400, 480],
  'rv-mid': [194, 212, 405, 490],
  'rv-basal': [200, 220, 410, 495],
  'rv-outflow': [210, 232, 420, 505],
};

export const DEMO_CYCLE_MS = 1000;

export function stateFromTiming(t: number, [d0, d1, r0, r1]: Timing): number {
  if (t < d0) return 0;
  if (t < d1) return (t - d0) / (d1 - d0);
  if (t < r0) return 1;
  if (t < r1) return 1 + (t - r0) / (r1 - r0);
  return 2;
}

export function demoRegions(highlights: RegionStates['highlights'] = {}, override: Partial<Record<RegionId, Timing>> = {}): RegionStates {
  const ids = REGION_LIST.map((r) => r.id);
  return {
    ids,
    highlights,
    stateAt(tMs, out) {
      const t = ((tMs % DEMO_CYCLE_MS) + DEMO_CYCLE_MS) % DEMO_CYCLE_MS;
      ids.forEach((id, i) => {
        out[i] = stateFromTiming(t, override[id] ?? T[id]);
      });
    },
  };
}
