/**
 * PUBLIC CONTRACT of the small 3D heart (src/heart3d). Secondary view — it explains *why* the ECG looks as it does by
 * colouring anatomical regions (src/core/regions.ts) with the activation/repolarization state the synthetic engine
 * reports for the shared cursor time. Other modules import only from src/heart3d/index.tsx.
 */
import type { Signal } from '@preact/signals';
import type { RegionStates } from '../core/ecg';
import type { RegionId } from '../core/regions';

export interface Heart3DProps {
  /** region states from the synthetic engine; null = anatomy only (e.g. real ECGs) */
  readonly regions: RegionStates | null;
  /** shared cursor time (ms) — the heart shows the state at this instant */
  readonly cursor: Signal<number | null>;
  /** extra emphasis (e.g. a lesson pointing at a wall or the conduction system) */
  readonly emphasize?: readonly RegionId[];
  /** draw the conduction system as a gold overlay */
  readonly showConduction?: boolean;
  /** show region labels on hover / for emphasized regions */
  readonly labels?: boolean;
  /** CSS size (square by default) */
  readonly size?: number;
  readonly ariaLabel?: string;
}
