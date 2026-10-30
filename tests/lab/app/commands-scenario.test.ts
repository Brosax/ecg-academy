/**
 * Scenario switching keeps the student's sinus rate: a scenario with its own rate (AF: mean ventricular rate) shows
 * that rate, and "back to normal" returns to the rate chosen before (normal @ 75 → AF @ 110 → normal @ 75).
 */
import { describe, expect, it } from 'vitest';
import { createCommands } from '../../../src/lab/app/commands';
import { store } from '../../../src/lab/app/store';
import type { Scenario } from '../../../src/lab/sim/scenarios/types';
import type { SimEngine } from '../../../src/lab/sim/types';

function fakeFacade() {
  let rate = 75;
  let scenario = { id: 'normal-sinus-rhythm' } as Scenario;
  const calls: number[] = [];
  const engine = {
    get scenario() {
      return scenario;
    },
    rhythm: {
      get heartRate() {
        return rate;
      },
    },
    setHeartRate(b: number) {
      rate = b;
    },
    async setScenario(sc: Scenario, _t: number, bpm?: number) {
      calls.push(bpm ?? NaN);
      scenario = sc;
      rate = sc.rhythm.bpm ?? bpm ?? rate;
    },
  };
  return { engine: engine as unknown as SimEngine, calls };
}

describe('setScenario keeps the sinus rate', () => {
  it('normal @ 75 → AF (110) → normal returns to 75; the AF slider does not change the remembered sinus rate', async () => {
    store.scenario.value = { id: 'normal-sinus-rhythm', loading: false };
    store.heartRate.value = 75;
    const { engine, calls } = fakeFacade();
    const cmd = createCommands(engine);
    cmd.setHeartRate(75);
    await cmd.setScenario('atrial-fibrillation');
    expect(store.heartRate.value).toBe(110);
    cmd.setHeartRate(140); // mean ventricular rate in AF
    await cmd.setScenario('normal-sinus-rhythm');
    expect(calls.at(-1)).toBe(75);
    expect(store.heartRate.value).toBe(75);
  });
});
