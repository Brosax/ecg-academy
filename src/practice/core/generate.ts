/**
 * generateItem(family, seed, difficulty, opts) — deterministic: the same arguments (and the same catalogue / engine) give
 * a deep-equal item. The item id is `${family}:${difficulty}:${seed}`, or `${family}:${difficulty}:${seed}:${topic}` when
 * a strict topic was requested (families with `topics`: metabolic, systemic, artefacts), so every id regenerates its item.
 */
import { isFindingId, type FindingId } from '../../core/findings';
import { createRng } from '../../core/rng';
import type { Difficulty } from '../../synth/index';
import type { GenerateOptions, Item } from '../api';
import { getSpec } from './families';
import { GenerationError, itemId } from './gen/common';

/** Options of generateItem (contract: ../api.ts). */
export type { GenerateOptions };

export async function generateItem(familyId: string, seed: number, difficulty?: Difficulty, opts: GenerateOptions = {}): Promise<Item> {
  const spec = getSpec(familyId);
  if (!spec) throw new GenerationError(`unknown drill family "${familyId}"`, familyId);
  const d: Difficulty = difficulty && spec.difficulties.includes(difficulty) ? difficulty : spec.difficulties[0];
  const s = Math.floor(Math.abs(seed)) >>> 0;
  const topic = opts.topic;
  if (topic !== undefined) {
    if (!spec.topics) throw new GenerationError(`drill family "${spec.id}" takes no topic`, spec.id);
    if (!spec.findings.includes(topic)) throw new GenerationError(`drill family "${spec.id}" has no topic "${topic}"`, spec.id);
  }
  const rng = createRng(itemId(spec.id, d, s, topic));
  return spec.make({ spec, seed: s, difficulty: d, rng, ...(opts.focus ? { focus: opts.focus } : {}), ...(topic ? { topic } : {}) });
}

/** Parse a reproducible item id back into its parts (null when malformed); `topic` only when the id carries one. */
export function parseItemId(id: string): { family: string; difficulty: Difficulty; seed: number; topic?: FindingId } | null {
  const m = /^([^:]+):(classic|subtle|noisy|borderline):(\d+)(?::([a-z0-9-]+))?$/.exec(id);
  if (!m) return null;
  if (m[4] !== undefined && !isFindingId(m[4])) return null;
  return { family: m[1], difficulty: m[2] as Difficulty, seed: Number(m[3]), ...(m[4] !== undefined ? { topic: m[4] as FindingId } : {}) };
}
