/**
 * Heart Lab deep links (ECG Academy `#/lab/<scenarioId>`): open disease mode with a scenario selected.
 * Requests are serialised so a second link that arrives while a scenario is still being built waits for it.
 */
import { SCENARIOS } from '../sim/scenarios/library';
import type { AppCommands } from './commands';

let chain: Promise<void> = Promise.resolve();

export function isScenarioId(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(SCENARIOS, id);
}

/** Switches to disease mode and selects `id`; resolves when the scenario is active (unknown ids: no-op). */
export function openScenario(commands: AppCommands, id: string): Promise<void> {
  if (!isScenarioId(id)) return Promise.resolve();
  commands.setMode('disease');
  chain = chain
    .then(() => commands.setScenario(id))
    .catch((err: unknown) => {
      console.error(`[lab] could not open scenario "${id}"`, err);
    });
  return chain;
}
