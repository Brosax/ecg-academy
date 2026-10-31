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

  // ── animated scenes (src/figures/scenes, runtime src/figures/scene; docs/design/f-explainers.md §4). Params are
  //    start values only: all interaction is internal state (Figure remounts on any params change). ──
  /** f1 — one beat along the conduction system: what each structure draws on lead II (block ECG + cursor) */
  readonly 'conduction-journey': Record<string, never>;
  /** f2 — the heart vector as the pen: one schematic loop projected on a highlighted limb-lead axis */
  readonly 'vector-pen': { readonly axisDeg?: number; readonly lead?: 'I' | 'II' | 'III' | 'aVR' | 'aVL' | 'aVF' };
  /** f2 — septal, free-wall and basal vectors seen from V1 and V6 (rS / qR); optional late right vector */
  readonly 'three-vectors': { readonly mainDeg?: number; readonly lateVector?: boolean };
  /** f3 — Einthoven's triangle sliding into the hexaxial wheel, leads re-assembled from the block ECG's potentials */
  readonly 'triangle-to-wheel': { readonly cabrera?: boolean };
  /** f3 — Wilson's central terminal and an electrode walking V1 → V6 around the chest section */
  readonly 'chest-ring': { readonly mainDeg?: number };
  /** f4 — paper speed and gain as a drawing scale under a fixed pen (block ECG, lead II) */
  readonly 'moving-paper': { readonly speed?: 25 | 50; readonly gain?: 5 | 10 | 20 };
  /** f5 — placing V1–V6 on the torso; a cable swap permutes the block ECG's chest traces */
  readonly 'electrode-walk': { readonly swap?: 'none' | 'v2v3' | 'v1v3' };
  /** f6 — limb-cable reversals re-assembled exactly from the block ECG's electrode potentials */
  readonly 'cable-swap': { readonly start?: 'correct' | 'laRa' | 'laLl' | 'raLl' | 'raRl' | 'laRl' };
  /** f6 — noise on one limb electrode and where it shows up (block ECG, clean recording) */
  readonly 'noisy-electrode': { readonly electrode?: 'RA' | 'LA' | 'LL'; readonly noise?: 'tremor' | 'mains' | 'wander' | 'emg' };
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
  // animated scenes
  'conduction-journey',
  'vector-pen',
  'three-vectors',
  'triangle-to-wheel',
  'chest-ring',
  'moving-paper',
  'electrode-walk',
  'cable-swap',
  'noisy-electrode',
] as const satisfies readonly FigureId[];

/** The animated scenes among the figure ids (docs/design/f-explainers.md §4), in lesson order. */
export const SCENE_IDS = [
  'conduction-journey',
  'vector-pen',
  'three-vectors',
  'triangle-to-wheel',
  'chest-ring',
  'moving-paper',
  'electrode-walk',
  'cable-swap',
  'noisy-electrode',
] as const satisfies readonly FigureId[];
export type SceneId = (typeof SCENE_IDS)[number];

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
