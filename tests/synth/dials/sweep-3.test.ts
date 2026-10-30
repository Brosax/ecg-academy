/**
 * T5 dial sweep, shard 3 of 4 (DECISION §8.2; tests/synth/dials/sweep.ts): every scenario of this shard × every
 * declared dial at {min, mid, max} (seed 1), and one drawDials item per difficulty (classic, subtle, borderline; noisy
 * also checks that the noisy chain leaves the truth unchanged): T1–T3 pass, the dial is realised within its exactness
 * and other truths move only by the declared couplings. The whole matrix with more seeds: scripts/synth/sweep.ts.
 */
import { describe, expect, it } from 'vitest';
import { createRng } from '../../../src/core/rng';
import { DIFFICULTIES, drawDials, scenarios } from '../../../src/synth';
import { dialGrid, sweepDial, sweepDraw } from './sweep';

const SHARD = 3, SHARDS = 4;

describe('T5 dial sweep (shard 3)', () => {
  scenarios().forEach((def, i) => {
    if (i % SHARDS !== SHARD) return;
    const grid = dialGrid(def);
    if (!grid.length) return;
    it(`${def.id}: ${grid.length} dial values + one draw per difficulty`, () => {
      const fails: string[] = [];
      for (const g of grid) fails.push(...sweepDial(def, g.id, g.value, 1));
      for (const d of DIFFICULTIES) {
        const dials = drawDials(def.id, createRng(`${def.id}:${d}:0`), d);
        if (Object.keys(dials).length) fails.push(...sweepDraw(def, dials, 1, d));
      }
      expect(fails).toEqual([]);
    }, 120_000);
  });
});
