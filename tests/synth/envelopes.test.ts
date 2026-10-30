/**
 * T4 realism envelopes (DECISION §8.2): at default dials and seeds 1–5, the share of a scenario's oracle features that
 * lie inside its PTB-XL class 5–95 % envelope must not fall below its ratchet floor (tests/synth/fixtures/
 * t4-floors.json; target ≥ 0.90). Floors only go up: after an improvement run
 *   node --import ./scripts/synth/node-hooks.mjs scripts/synth/realism-report.ts --write
 * Known class mismatches (recorded, not hidden): PTB-XL's AMI / IMI classes are dominated by subacute and old
 * infarcts, so the acute ST values of stemi-anterior / stemi-inferior lie outside them; PTB-XL's WPW records mostly keep
 * an upright T in II, while the curriculum's classic tracing shows the discordant secondary T.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { gen } from './helpers';
import { measure } from './oracle/measure';
import { checkFeatures, SCENARIO_CLASS } from './realism';

const FLOORS = (JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/t4-floors.json', import.meta.url)), 'utf8')) as { floors: Record<string, number> }).floors;

describe('realism envelopes (T4, ratchet)', () => {
  it('every mapped scenario has a floor', () => {
    expect(Object.keys(SCENARIO_CLASS).filter((id) => FLOORS[id] === undefined)).toEqual([]);
  });
  for (const [id, cls] of Object.entries(SCENARIO_CLASS)) {
    it(`${id} vs PTB-XL ${cls}`, () => {
      let inside = 0, total = 0;
      const outliers = new Set<string>();
      for (let seed = 1; seed <= 5; seed++) {
        const r = gen({ scenario: id, seed });
        for (const c of checkFeatures(measure(r.ecg.signal.leads, r.ecg.signal.fs), cls)) {
          total++;
          if (c.inside) inside++;
          else outliers.add(c.name);
        }
      }
      const frac = inside / total;
      expect(frac, `${id}: ${(100 * frac).toFixed(1)} % inside (floor ${FLOORS[id]}); outliers: ${[...outliers].join(', ')}`).toBeGreaterThanOrEqual(FLOORS[id] - 1e-9);
    });
  }
});
