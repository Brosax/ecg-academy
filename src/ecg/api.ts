/**
 * PUBLIC CONTRACT of the ECG viewer (src/ecg). Other modules import only from src/ecg/index.tsx, whose exported
 * components take exactly these props. Internals are free.
 *
 * The viewer is the protagonist of the app: paper at true scale, every layout, calipers, overlays for worked examples,
 * click-to-pick for `locate` items and a shared time cursor that secondary views (3D heart, figures) follow.
 */
import type { Signal } from '@preact/signals';
import type { Ecg } from '../core/ecg';
import type { L10n } from '../core/l10n';
import type { Lead } from '../core/leads';
import type { LayoutId } from '../app/store';

/** Colour roles (mapped to theme tokens: --c-atrial, --c-qrs, --c-repol, --c-injury, --c-vector, --c-highlight, --ok, --err). */
export type MarkColor = 'atrial' | 'qrs' | 'repol' | 'injury' | 'vector' | 'highlight' | 'ok' | 'err';

/**
 * Annotation marks for worked examples and feedback. `lead: 'all'` draws in every visible lead panel (and the rhythm
 * strip) at that time. Times are ms from record start; voltages mV.
 */
export type EcgMark =
  | { readonly kind: 'bracket'; readonly lead: Lead | 'all'; readonly t0: number; readonly t1: number; readonly color?: MarkColor; readonly label?: L10n | string }
  | { readonly kind: 'wave'; readonly lead: Lead | 'all'; readonly t: number; readonly label: string; readonly color?: MarkColor }
  | { readonly kind: 'region'; readonly lead: Lead | 'all'; readonly t0: number; readonly t1: number; readonly color?: MarkColor; readonly label?: L10n | string }
  | { readonly kind: 'hline'; readonly lead: Lead; readonly mv: number; readonly t0?: number; readonly t1?: number; readonly color?: MarkColor; readonly label?: L10n | string }
  | { readonly kind: 'arrow'; readonly lead: Lead; readonly t: number; readonly mv: number; readonly color?: MarkColor; readonly label?: L10n | string }
  | { readonly kind: 'lead'; readonly lead: Lead; readonly color?: MarkColor; readonly label?: L10n | string };

/** Answer pins for `locate` items. */
export interface EcgPin {
  readonly lead: Lead;
  readonly tMs: number;
  readonly tone: 'answer' | 'correct' | 'wrong';
}

export interface PickEvent {
  readonly lead: Lead;
  readonly tMs: number;
  /** signal value at that time in that lead (mV) */
  readonly mv: number;
}

export interface CaliperMeasure {
  /** lead panel the calipers were placed in (null = across panels) */
  readonly lead: Lead | null;
  readonly t0: number;
  readonly t1: number;
  readonly dtMs: number;
  /** amplitude mode */
  readonly mv0?: number;
  readonly mv1?: number;
}

export interface EcgViewProps {
  readonly ecg: Ecg;
  /** defaults come from store.settings.viewer; these override for this instance */
  readonly layout?: LayoutId;
  /** lead shown by 'single' and 'strip' layouts, and the rhythm-strip lead of '3x4+1' (default II) */
  readonly lead?: Lead;
  readonly speed?: 25 | 50;
  readonly gain?: 5 | 10 | 20;
  readonly chestHalfGain?: boolean;
  readonly cabrera?: boolean;
  /** time window shown by 'single' / 'strip' (ms); default whole record */
  readonly window?: readonly [number, number];
  /**
   * fixed CSS height in px, or fit the container width keeping true proportions (default). A fixed height keeps a
   * readable minimum scale (2.2 px/mm, or what the height allows if smaller); a narrow container scrolls sideways.
   */
  readonly height?: number;
  readonly marks?: readonly EcgMark[];
  readonly highlightLeads?: readonly Lead[];
  /** built-in overlays computed from ecg.truth (ignored when truth is null). All default to OFF so drills never reveal answers. */
  readonly overlays?: { readonly waveLabels?: boolean; readonly intervals?: boolean; readonly stMarkers?: boolean };
  /**
   * interactive tools. undefined = calipers, magnifier and crosshair all available; false = none (clicks still set the
   * cursor / pick); an object = only the tools it does not set to false. With toolbar=false, tools stay reachable by
   * keyboard (C/A/R/M/X) and their read-outs float over the bottom-right corner of the paper.
   */
  readonly tools?: false | { readonly calipers?: boolean; readonly magnifier?: boolean; readonly crosshair?: boolean };
  /** show the compact toolbar (speed, gain, layout, tools) above the paper */
  readonly toolbar?: boolean;
  /** shared time cursor (ms). Clicking the paper sets it (unless onPick is given). */
  readonly cursor?: Signal<number | null>;
  /** locate mode: clicking reports lead + time instead of moving the cursor */
  readonly onPick?: (e: PickEvent) => void;
  readonly pins?: readonly EcgPin[];
  readonly onCaliper?: (m: CaliperMeasure) => void;
  /** accessible description of the tracing */
  readonly ariaLabel?: string;
}

/**
 * A single continuously sweeping lead, like a bedside monitor. Plays once through the record and holds (no loop).
 * Speed and gain come from store.settings.viewer. Without `playing` it plays once on its own and shows its own play/pause.
 */
export interface MonitorProps {
  readonly ecg: Ecg;
  readonly lead?: Lead;
  /** visible width in seconds (default 6) */
  readonly seconds?: number;
  readonly playing?: Signal<boolean>;
  readonly cursor?: Signal<number | null>;
  readonly height?: number;
}
