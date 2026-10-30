/**
 * Scenario definition helper: a scenario starts from the calibrated normal parameters and overrides only what its
 * mechanism changes. Used by library.ts and by scenario modules in subfolders.
 */
import type { EngineParams } from '../conduction/params';
import { NORMAL_PARAMS } from './normal';
import type { Scenario } from './types';

export type ScenarioDef = Omit<Scenario, 'params'> & { readonly params?: Partial<EngineParams> };

export const defineScenario = (d: ScenarioDef): Scenario => ({ ...d, params: { ...NORMAL_PARAMS, ...(d.params ?? {}) } });
