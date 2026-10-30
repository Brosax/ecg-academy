import type { ComponentType } from 'preact';
import type { SimEngine } from '../../sim/types';
import type { AppCommands } from '../commands';

export interface ModeProps {
  readonly engine: SimEngine;
  readonly commands: AppCommands;
}

/**
 * A mode supplies the panels AROUND the persistent 3D view (ECG-first layout): `Hero` is the mode's ECG in the main
 * area (a `.hero-primary` box that fills the height, plus an optional fixed-height `.hero-secondary` row); `Side`
 * renders under the heart in the side panel (return null to give the heart the room); an optional `Aside` gets its
 * own column at the far left. The Shell keeps <HeartView> at a fixed tree position so its WebGL context survives
 * mode switches.
 */
export interface ModeView {
  readonly Hero: ComponentType<ModeProps>;
  readonly Side: ComponentType<ModeProps>;
  readonly Aside?: ComponentType<ModeProps>;
}
