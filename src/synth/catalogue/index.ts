/**
 * Scenario registry (DECISION §4, §9). Every group file exports one `defineGroup(group, [...])` list; this file imports
 * them explicitly (no import.meta.glob: the Node scripts load the registry too) and checks at load time that ids are
 * unique and every declared finding (scenario and variants) exists in src/core/findings.ts.
 *
 * To add scenarios: append ScenarioDefs to the matching group file (or a new group file listed below) and declare the
 * scenario's hallmark criteria in tests/synth/oracle/criteria/<group>.ts under the same id.
 */
import { isFindingId, type FindingId } from '../../core/findings';
import type { ScenarioDef, ScenarioGroup } from '../api';
import { AV_BLOCK_SCENARIOS } from './av-block';
import { CHAMBER_SCENARIOS } from './chambers';
import { CONDUCTION_SCENARIOS } from './conduction';
import { ISCHEMIA_SCENARIOS } from './ischemia';
import { NORMAL_SCENARIOS } from './normal';
import { PACING_SCENARIOS } from './pacing';
import { REPOLARIZATION_SCENARIOS } from './repolarization';
import { ATRIAL_SCENARIOS } from './rhythm-atrial';
import { SVT_SCENARIOS } from './rhythm-svt';
import { VENTRICULAR_SCENARIOS } from './rhythm-ventricular';
import { STRUCTURAL_SCENARIOS } from './structural';
import { TECHNICAL_SCENARIOS } from './technical';

export const ALL_SCENARIOS: readonly ScenarioDef[] = [
  ...NORMAL_SCENARIOS, ...ATRIAL_SCENARIOS, ...SVT_SCENARIOS, ...VENTRICULAR_SCENARIOS, ...AV_BLOCK_SCENARIOS,
  ...CONDUCTION_SCENARIOS, ...ISCHEMIA_SCENARIOS, ...CHAMBER_SCENARIOS, ...REPOLARIZATION_SCENARIOS,
  ...STRUCTURAL_SCENARIOS, ...PACING_SCENARIOS, ...TECHNICAL_SCENARIOS,
];

const BY_ID = new Map<string, ScenarioDef>();
for (const d of ALL_SCENARIOS) {
  if (BY_ID.has(d.id)) throw new Error(`src/synth catalogue: duplicate scenario id '${d.id}'`);
  const all = [d.findings, ...Object.values(d.variants ?? {}).map((v) => v.findings ?? [])].flat();
  for (const f of all) if (!isFindingId(f)) throw new Error(`src/synth catalogue: scenario '${d.id}' declares unknown finding '${f}'`);
  BY_ID.set(d.id, d);
}

export function scenarioById(id: string): ScenarioDef {
  const d = BY_ID.get(id);
  if (!d) throw new Error(`src/synth: unknown scenario '${id}'`);
  return d;
}

export function hasScenario(id: string): boolean {
  return BY_ID.has(id);
}

/** Scenarios filtered by group and / or by a finding they declare (in the base or a variant). */
export function listScenarios(filter?: { readonly group?: ScenarioGroup; readonly finding?: FindingId }): readonly ScenarioDef[] {
  return ALL_SCENARIOS.filter((d) => {
    if (filter?.group && d.group !== filter.group) return false;
    if (filter?.finding) {
      const f = filter.finding;
      if (!d.findings.includes(f) && !Object.values(d.variants ?? {}).some((v) => v.findings?.includes(f))) return false;
    }
    return true;
  });
}
