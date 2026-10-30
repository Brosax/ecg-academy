/**
 * Engine provider (owned by the integrator). Real electrophysiology engine on the realistic HRA heart
 * (src/sim/geometry/hra: CC BY 4.0 Human Reference Atlas male heart + cardiac vessels, baked into src/assets).
 * Falls back to the stub geometry if the baked asset cannot be decoded; the engine is geometry-agnostic.
 */
import { ScenarioEngine } from '../sim/scenarioEngine';
import { loadHraBody } from '../sim/geometry/hra/body';
import { loadHraGeometry } from '../sim/geometry/hra/load';
import { buildStubGeometry } from '../sim/stub/stubGeometry';
import type { GeometryBundle } from '../sim/types';
import type { AppCommands } from './commands';
import { createCommands } from './commands';
import { store } from './store';

export type ProgressFn = (progress: number, label: string) => void;

const yieldFrame = () => new Promise<void>((r) => setTimeout(r, 0));

export async function loadEngine(onProgress: ProgressFn): Promise<ScenarioEngine> {
  onProgress(0.02, 'geometry');
  await yieldFrame();
  let geometry: GeometryBundle;
  try {
    geometry = await loadHraGeometry((p) => onProgress(0.02 + 0.24 * p, 'geometry'));
    try {
      // realistic body surface (HRA skin, same frame) for the electrodes view; the stylized torso is the fallback
      geometry = { ...geometry, body: await loadHraBody() };
    } catch (err) {
      console.error('Realistic body (HRA skin) failed to load — using the stylized torso.', err);
    }
  } catch (err) {
    console.error('Realistic heart (HRA) failed to load — falling back to the stub geometry.', err);
    geometry = buildStubGeometry(1.5);
  }
  onProgress(0.3, 'activation');
  await yieldFrame();
  return ScenarioEngine.create(geometry, (p, label) => onProgress(0.3 + 0.7 * p, label));
}

// ---------------------------------------------------------------- Heart Lab: one engine per page load

/** What the lab keeps between visits: the engine and its command set (commands remember the student's sinus rate). */
export interface LoadedLab {
  readonly engine: ScenarioEngine;
  readonly commands: AppCommands;
}

let pending: Promise<LoadedLab> | null = null;
let loaded: LoadedLab | null = null;

/** The engine and commands if they are already built (a revisit renders at once, without the loading screen). */
export function loadedLab(): LoadedLab | null {
  return loaded;
}

/**
 * Builds the engine once per page load and caches it at module level, so leaving and re-entering the lab is instant.
 * Progress goes to store.engine (a remount during the first load shows the same progress). A failed load is not cached:
 * the next mount retries.
 */
export function loadLabOnce(): Promise<LoadedLab> {
  if (loaded) return Promise.resolve(loaded);
  if (pending) return pending;
  pending = loadEngine((progress, label) => {
    store.engine.value = { ready: false, progress, label };
  }).then(
    (engine) => {
      engine.setHeartRate(store.heartRate.peek());
      loaded = { engine, commands: createCommands(engine) };
      store.engine.value = { ready: true, progress: 1, label: 'ready' };
      return loaded;
    },
    (err: unknown) => {
      pending = null;
      store.engine.value = { ready: false, progress: 0, label: 'error', error: err instanceof Error ? err.message : String(err) };
      throw err;
    },
  );
  return pending;
}
