/**
 * Helper for the catalogue group files: `defineGroup(group, [...])` checks at module load that every scenario of a
 * file belongs to that file's group (the registry in index.ts checks ids and findings across groups).
 */
import type { ScenarioDef, ScenarioGroup } from '../api';

export function defineGroup(group: ScenarioGroup, defs: readonly ScenarioDef[]): readonly ScenarioDef[] {
  for (const d of defs) if (d.group !== group) throw new Error(`src/synth catalogue: scenario '${d.id}' is in the '${group}' file but declares group '${d.group}'`);
  return defs;
}
