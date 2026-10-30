/**
 * PUBLIC CONTRACT of the 2D explainer figures (src/figures). Lessons embed a figure by id with params; the atlas and
 * tools pages reuse them. Each figure is self-contained (SVG or canvas), themed by tokens, interactive where useful,
 * layout-stable (fixed aspect ratio), and fully localized (zh/en/es). Other modules import only from src/figures/index.tsx:
 *   <Figure id="hexaxial" params={{ vectorDeg: 60, interactive: true }} cursor={cursor} ecg={ecg} />
 */
import type { Signal } from '@preact/signals';
import type { Ecg } from '../core/ecg';

export interface FigureParams {
  /** ECG paper explorer: small/large squares, speed & gain toggles, calibration pulse */
  readonly paper: { readonly showCalibration?: boolean };
  /** electrode placement on a torso diagram (limb + precordial, with landmarks: 4th/5th ICS, MCL, AAL, MAL) */
  readonly electrodes: { readonly highlight?: readonly string[]; readonly showExtra?: boolean };
  /** Einthoven triangle + hexaxial wheel; a heart vector (draggable when interactive) projected onto the six limb leads */
  readonly hexaxial: { readonly vectorDeg?: number; readonly interactive?: boolean; readonly showProjections?: boolean; readonly quadrantMode?: boolean };
  /** horizontal plane: precordial leads around the chest, vector projection, transition zone */
  readonly 'horizontal-plane': { readonly vectorDeg?: number; readonly interactive?: boolean };
  /** conduction system schematic; follows the ECG cursor when an ECG with truth is given */
  readonly conduction: { readonly block?: 'none' | 'av' | 'rbb' | 'lbb' | 'laf' | 'lpf' | 'accessory' };
  /** laddergram (A / AV / V tiers) built from ecg.truth.atrial + ecg.truth.beats */
  readonly laddergram: { readonly maxBeats?: number };
  /** ventricular / nodal action potential aligned with the surface ECG; phases 0–4 */
  readonly 'action-potential': { readonly cell?: 'ventricular' | 'nodal' | 'atrial' };
  /** a depolarization wavefront moving along a strip of tissue and the deflection at electrodes at several angles */
  readonly dipole: { readonly autoplay?: boolean };
  /** net QRS in I and aVF (dials or from an ECG) → axis on the wheel */
  readonly 'axis-calculator': Record<string, never>;
  /** 300-150-100-75-60-50 ruler over a strip; 1500 / small-squares and 6-second methods */
  readonly 'rate-ruler': { readonly method?: '300' | '1500' | '6s' };
  /** QT/RR inputs → QTc by Bazett, Fridericia, Framingham, Hodges with limits by sex */
  readonly 'qtc-calculator': Record<string, never>;
  /** coronary arteries ↔ walls ↔ lead groups map; highlight a territory */
  readonly territories: { readonly highlight?: 'anterior' | 'septal' | 'lateral' | 'inferior' | 'posterior' | 'rv' | null };
  /** interactive decision trees */
  readonly 'decision-tree': { readonly tree: 'narrow-tachy' | 'wide-tachy' | 'brady-av-block' | 'st-elevation' | 'bundle-branch' };
  /** frontal & horizontal VCG loops of the ECG's QRS/T with the instantaneous vector at the cursor */
  readonly 'vector-loop': { readonly plane?: 'frontal' | 'horizontal' | 'both' };
}

export type FigureId = keyof FigureParams;

export const FIGURE_IDS = [
  'paper',
  'electrodes',
  'hexaxial',
  'horizontal-plane',
  'conduction',
  'laddergram',
  'action-potential',
  'dipole',
  'axis-calculator',
  'rate-ruler',
  'qtc-calculator',
  'territories',
  'decision-tree',
  'vector-loop',
] as const satisfies readonly FigureId[];

export type FigureProps = {
  [K in FigureId]: {
    readonly id: K;
    readonly params?: FigureParams[K];
    /** figures that follow time (conduction, laddergram, vector-loop, action-potential) read this */
    readonly cursor?: Signal<number | null>;
    /** figures that read an ECG (laddergram, vector-loop, axis-calculator, rate-ruler, conduction) */
    readonly ecg?: Ecg;
  };
}[FigureId];
