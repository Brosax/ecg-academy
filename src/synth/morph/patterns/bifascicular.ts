/**
 * Bifascicular blocks (criteria.md `bifascicular`): RBBB + LAFB and RBBB + LPFB. The LV part is the fascicular block's
 * sequence (fascicular.ts) without the RV (no right bundle), and the RV is activated late and slowly across the septum
 * exactly as in complete RBBB (rbbb.ts): R′ in V1, broad terminal S in I / V6, and the fascicular frontal axis.
 * Provenance: composition of the calibrated RBBB and fascicular lobe sets (no new constants beyond the region tags).
 */
import { LAFB_PATTERN, LPFB_PATTERN } from './fascicular';
import { RBBB_PATTERN } from './rbbb';
import type { PatternDef } from './types';

const LV_ONLY = (l: PatternDef['lobes'][number], label: string): PatternDef['lobes'][number] => ({
  ...l,
  label,
  regions: l.regions.filter(([id]) => !id.startsWith('rv-')),
});

/** RBBB's two RV lobes: transseptal breakthrough and the slow RV free wall + RVOT. */
const RV_LATE = RBBB_PATTERN.lobes.slice(4);
const LA = LAFB_PATTERN.lobes;
const LP = LPFB_PATTERN.lobes;

export const RBBB_LAFB_PATTERN: PatternDef = {
  id: 'rbbb-lafb',
  blocks: { rbb: 'complete', laf: 'complete' },
  activation: { blocks: { rbb: 'complete', laf: 'complete' } },
  provenance: 'port: LAFB LV sequence + RBBB late RV lobes (rbbb.ts, fascicular.ts)',
  lobes: [LA[0], LV_ONLY(LA[1], 'inferoapical LV'), LA[2], LV_ONLY(LA[3], 'posterobasal LV'), ...RV_LATE],
};

export const RBBB_LPFB_PATTERN: PatternDef = {
  id: 'rbbb-lpfb',
  blocks: { rbb: 'complete', lpf: 'complete' },
  activation: { blocks: { rbb: 'complete', lpf: 'complete' } },
  provenance: 'port: LPFB LV sequence + RBBB late RV lobes (rbbb.ts, fascicular.ts)',
  // without the right bundle the early rightward RV force no longer cancels the anteroapical LV force (net larger)
  lobes: [LP[0], { ...LV_ONLY(LP[1], 'anteroapical LV'), amp: LP[1].amp * 1.3 }, LP[2], LV_ONLY(LP[3], 'posterobasal LV'), ...RV_LATE],
};
