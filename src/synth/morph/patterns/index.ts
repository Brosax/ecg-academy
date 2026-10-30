/**
 * Registry of the authored activation patterns. Conducted beats pick the pattern whose `blocks` equal the scenario's
 * blocks (missing combinations are rejected by compose.ts). RV hypertrophy is a substrate operator (ventricular.ts),
 * not a pattern.
 */
import type { Blocks } from '../../api';
import { RBBB_LAFB_PATTERN, RBBB_LPFB_PATTERN } from './bifascicular';
import { ILBBB_PATTERN, LAFB_PATTERN, LPFB_PATTERN } from './fascicular';
import { IRBBB_PATTERN } from './irbbb';
import { LBBB_PATTERN } from './lbbb';
import { NORMAL_PATTERN } from './normal';
import { RBBB_PATTERN } from './rbbb';
import type { PatternDef } from './types';

export { ECTOPIC_SITES, FULL_PREEXCITED_LOBES, PREEXCITED_SITES, type EctopicDef, type PreexcitedDef } from './sites';
export type { PatternDef } from './types';
export { NORMAL_PATTERN, RBBB_PATTERN, LBBB_PATTERN, IRBBB_PATTERN, LAFB_PATTERN, LPFB_PATTERN, ILBBB_PATTERN, RBBB_LAFB_PATTERN, RBBB_LPFB_PATTERN };

export const CONDUCTED_PATTERNS: readonly PatternDef[] = [
  NORMAL_PATTERN, RBBB_PATTERN, LBBB_PATTERN, IRBBB_PATTERN, LAFB_PATTERN, LPFB_PATTERN, ILBBB_PATTERN, RBBB_LAFB_PATTERN, RBBB_LPFB_PATTERN,
];

const BRANCH_KEYS = ['rbb', 'lbb', 'laf', 'lpf'] as const;

export function blocksKey(b: Blocks | undefined): string {
  return BRANCH_KEYS.map((k) => `${k}:${b?.[k] ?? '-'}`).join(',');
}

/** The authored pattern for a set of blocks, or null when none is calibrated yet. */
export function patternForBlocks(b: Blocks | undefined): PatternDef | null {
  const key = blocksKey(b);
  return CONDUCTED_PATTERNS.find((p) => blocksKey(p.blocks) === key) ?? null;
}
