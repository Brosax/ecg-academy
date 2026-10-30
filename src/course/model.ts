/**
 * The course as the running app sees it: the eight stages with every planned lesson, ready or planned (lessons are
 * static data, so this is computed once).
 */
import type { StageDef } from './api';
import { LESSONS } from './lessons/index';
import { buildStages } from './stages';

export const STAGE_DEFS: readonly StageDef[] = buildStages(LESSONS);

/** The eight stages of the course map (StageDef, src/course/api.ts). */
export function courseStages(): readonly StageDef[] {
  return STAGE_DEFS;
}
