/**
 * Heart Lab deep links: every finding → scenario entry points at a scenario the lab simulates, every key is an ECG
 * Academy finding id, and every lab scenario is reachable from at least one finding.
 */
import { describe, expect, it } from 'vitest';
import { FINDINGS, isFindingId } from '../../src/core/findings';
import type { FindingId } from '../../src/core/findings';
import { LAB_SCENARIOS, labHref, labScenarioIds } from '../../src/lab';
import { SCENARIOS } from '../../src/lab/sim/scenarios/library';

const entries = Object.entries(LAB_SCENARIOS) as [FindingId, string][];

describe('LAB_SCENARIOS', () => {
  it('maps finding ids to scenarios of the lab library', () => {
    expect(entries.length).toBeGreaterThan(40);
    for (const [finding, scenario] of entries) {
      expect(isFindingId(finding), finding).toBe(true);
      expect(Object.keys(SCENARIOS), `${finding} → ${scenario}`).toContain(scenario);
    }
  });

  it('reaches every lab scenario from at least one finding', () => {
    const reached = new Set(entries.map(([, s]) => s));
    expect(labScenarioIds().filter((id) => !reached.has(id))).toEqual([]);
  });

  it('builds #/lab/<scenarioId> links, null where the lab has no scenario', () => {
    expect(labHref('lbbb')).toBe('#/lab/lbbb');
    expect(labHref('av-block-3')).toBe('#/lab/complete-heart-block');
    expect(labHref('asystole')).toBeNull();
    for (const id of Object.keys(FINDINGS) as FindingId[]) {
      const href = labHref(id);
      if (href !== null) expect(href).toMatch(/^#\/lab\/[a-z0-9-]+$/);
    }
  });

  it('labScenarioIds lists the scenario library', () => {
    expect([...labScenarioIds()].sort()).toEqual(Object.keys(SCENARIOS).sort());
    expect(labScenarioIds()).toContain('normal-sinus-rhythm');
  });
});
