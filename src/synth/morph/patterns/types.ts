/**
 * Authored activation patterns: calibrated QRS lobe sets (relative to QRS onset) tagged with core regions.
 * A pattern describes depolarisation only; the T wave follows from the gradient rule (repol.ts) and the substrate,
 * injury and near-field stages are applied on top (ventricular.ts).
 */
import type { RegionId } from '../../../core/regions';
import type { Blocks, LobeSpec, Vec3 } from '../../api';
import type { ActivationInput } from '../../heart/activation';

export interface PatternDef {
  readonly id: string;
  /** the branch blocks this pattern stands for (selection key for conducted beats) */
  readonly blocks: Blocks;
  readonly lobes: readonly LobeSpec[];
  /** region-graph input that produces the matching activation timing (3D state, split-T timing, coverage test) */
  readonly activation: ActivationInput;
  /**
   * Phase-2 J shift of this activation sequence (repol.ts › plateau-slope ST lobe, area −p·A_QRS), used when the
   * source's RepolSpec sets none. A slow, wide activation (LBBB) leaves the early-activated myocardium declining on its
   * plateau while the late regions still depolarise: the discordant ST shift that starts at the J point.
   */
  readonly plateauSlope?: number;
  /** short provenance note (where the constants come from and how they were calibrated) */
  readonly provenance: string;
}

/** Shorthand used by the pattern files. */
export function lobe(label: string, on: number, peak: number, end: number, dir: Vec3, amp: number, regions: readonly (readonly [RegionId, number])[], extra: Partial<LobeSpec> = {}): LobeSpec {
  return { label, on, peak, end, dir, amp, regions, ...extra };
}

/** Frequently used region groups. */
export const SEPTUM_MID: readonly (readonly [RegionId, number])[] = [['lv-mid-anteroseptal', 1], ['lv-mid-inferoseptal', 1], ['lv-apical-septal', 0.5]];
export const SEPTUM_ALL: readonly (readonly [RegionId, number])[] = [
  ['lv-mid-anteroseptal', 1], ['lv-mid-inferoseptal', 1], ['lv-apical-septal', 1], ['lv-basal-anteroseptal', 1], ['lv-basal-inferoseptal', 1],
];
