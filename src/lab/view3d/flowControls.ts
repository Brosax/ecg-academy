/**
 * Shell-facing controls of the schematic blood-flow layer (血流示意). LEAF module: it must not import ./scene (or
 * ./viewControls, which imports ./scene at module scope) — scene.ts imports this file, so a cycle would hit a TDZ.
 * Not persisted, like the other 3D layers.
 * NOTE for the integrator: a `Layers.bloodFlow` flag (store.ts) would replace the `bloodFlow` signal.
 */
import { signal } from '@preact/signals';
import type { View3dKey } from '../i18n/view3d/zh';
import type { ValveId } from '../sim/types';
import type { FlowCaptionId } from './core/flowTypes';

/** Layer switch (the "血流（示意）" toggle in the layers popover). */
export const bloodFlow = signal(false);
/** What the blood is doing now; HeartScene publishes it (≤ 10 Hz, only on change) for the fixed-size caption chip. */
export const flowNow = signal<FlowCaptionId>('idle');

/**
 * Look of the streams: bold chevron arrows over a faint route track (flowChevrons.ts, the default: direction readable
 * in a still frame), comet dashes along tubes, or instanced "blood cells" (flowParticles.ts). The jets show in all.
 */
export type FlowStyle = 'arrows' | 'comets' | 'cells';
export const FLOW_STYLES: readonly FlowStyle[] = ['arrows', 'comets', 'cells'];
/** Stream look switch (a sub-option of the layer, shown while it is on). */
export const flowStyle = signal<FlowStyle>('arrows');
/** X-ray heart while the layer is on: a see-through wall (outline kept) so the cavity flow is not hidden. */
export const flowXray = signal(true);

/**
 * Stream groups, as named by the walkthrough: `heart:<valve>` = the chamber stream through that valve,
 * `out:<valve>` = its great-artery continuation, `ven:L|R` = the pulmonary veins / venae cavae.
 */
export type FlowStreamKey = `heart:${ValveId}` | `out:${ValveId}` | 'ven:L' | 'ven:R';
/** 3D name tags shown with the layer (chambers and the vessels the streams follow); i18n view3d `flow.label.<id>`. */
export const FLOW_LABEL_IDS = ['RA', 'RV', 'LA', 'LV', 'SVC', 'IVC', 'PA', 'PV', 'AO'] as const;
export type FlowLabelId = (typeof FLOW_LABEL_IDS)[number];
export const FLOW_LABEL_KEYS = {
  RA: 'flow.label.RA',
  RV: 'flow.label.RV',
  LA: 'flow.label.LA',
  LV: 'flow.label.LV',
  SVC: 'flow.label.SVC',
  IVC: 'flow.label.IVC',
  PA: 'flow.label.PA',
  PV: 'flow.label.PV',
  AO: 'flow.label.AO',
} as const satisfies Record<FlowLabelId, View3dKey>;

export interface FlowTourStep {
  /** Explanation shown in the walkthrough card. */
  readonly key: View3dKey;
  /** Streams kept bright; every other stream is dimmed. Empty = all dim (the lungs are not modelled). */
  readonly focus: readonly FlowStreamKey[];
  /** Name tags emphasised in this step. */
  readonly labels: readonly FlowLabelId[];
  /** Which moment of the beat to play once: ventricular ejection, early filling, or nothing (stay paused). */
  readonly at: 'ejection' | 'filling' | 'none';
  /** Valve whose window times that moment (venous S wave: the ejection on that side). */
  readonly valve: ValveId;
}

/**
 * "Follow the blood once round": venae cavae → RA → RV → pulmonary artery → lungs → pulmonary veins → LA → LV →
 * aorta. Each step plays its moment of the beat once and stops (no looping); text in view3d `flow.tour.<n>`.
 */
export const FLOW_TOUR: readonly FlowTourStep[] = [
  { key: 'flow.tour.1', focus: ['ven:R'], labels: ['SVC', 'IVC', 'RA'], at: 'ejection', valve: 'PULMONARY' },
  { key: 'flow.tour.2', focus: ['heart:TRICUSPID'], labels: ['RA', 'RV'], at: 'filling', valve: 'TRICUSPID' },
  { key: 'flow.tour.3', focus: ['heart:PULMONARY', 'out:PULMONARY'], labels: ['RV', 'PA'], at: 'ejection', valve: 'PULMONARY' },
  { key: 'flow.tour.4', focus: ['out:PULMONARY', 'ven:L'], labels: ['PA', 'PV'], at: 'none', valve: 'PULMONARY' },
  { key: 'flow.tour.5', focus: ['ven:L'], labels: ['PV', 'LA'], at: 'ejection', valve: 'AORTIC' },
  { key: 'flow.tour.6', focus: ['heart:MITRAL'], labels: ['LA', 'LV'], at: 'filling', valve: 'MITRAL' },
  { key: 'flow.tour.7', focus: ['heart:AORTIC', 'out:AORTIC'], labels: ['LV', 'AO'], at: 'ejection', valve: 'AORTIC' },
];
/** Current walkthrough step (index into FLOW_TOUR), or null when the walkthrough is closed. */
export const flowTourStep = signal<number | null>(null);

export type FlowTone = 'rich' | 'poor';
export type FlowPalette = Readonly<Record<FlowTone, string>>;

/**
 * Anatomical stream colours (sRGB hex; the theme tokens are frozen, cf. overlayColor). Red = O2-rich, violet-blue =
 * O2-poor — a convention, stated in the legend. Each is ≥ 3:1 against its --scene-bg and kept apart from QRS magenta,
 * the vector blue and the coronary / cardiac-vein overlays (tests/view3d/flowColors.test.ts).
 */
export const FLOW_COLORS = {
  light: { rich: '#e0402c', poor: '#5960b0' },
  dark: { rich: '#ff5a4a', poor: '#9b8fe8' },
} as const satisfies Record<'light' | 'dark', FlowPalette>;

/** Palette for a --scene-bg value (as read by readThemeColors): the dark set on a dark background. */
export function flowPaletteForBg(sceneBg: string): FlowPalette {
  const m = /^#?([0-9a-f]{6})$/i.exec(sceneBg.trim());
  if (!m) return FLOW_COLORS.light;
  const n = parseInt(m[1], 16);
  const luma = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return luma < 128 ? FLOW_COLORS.dark : FLOW_COLORS.light;
}

/** Two-tone swatch (CSS background) for the layer toggle. */
export function flowSwatch(p: FlowPalette): string {
  return `linear-gradient(90deg, ${p.rich} 50%, ${p.poor} 50%)`;
}

/**
 * Colour-key rows appended to both legends while the layer is on; note rows have no swatch. `cut` rows show only while
 * the cross-section is on (the four-chamber cut shows filling, the LVOT cut left-ventricular ejection; the pulmonary
 * outflow lies in front of both), `style` rows only for that look of the streams.
 */
export const FLOW_LEGEND: readonly {
  readonly key: View3dKey;
  readonly tone: FlowTone | null;
  readonly cut?: boolean;
  readonly style?: FlowStyle;
}[] = [
  { key: 'legend.flowRich', tone: 'rich' },
  { key: 'legend.flowPoor', tone: 'poor' },
  { key: 'legend.flowArrows', tone: null, style: 'arrows' },
  { key: 'legend.flowNote', tone: null, style: 'comets' },
  { key: 'legend.flowCells', tone: null, style: 'cells' },
  { key: 'legend.flowVeins', tone: null },
  { key: 'legend.flowCut', tone: null, cut: true },
];

/** The legend rows to show for a cut state and a stream look. */
export function flowLegendRows(cut: boolean, style: FlowStyle): typeof FLOW_LEGEND {
  return FLOW_LEGEND.filter((it) => (!it.cut || cut) && (!it.style || it.style === style));
}

/** i18n key of each caption id (view3d `flow.now.<id>`). */
export const FLOW_CAPTION_KEYS = {
  ejection: 'flow.now.ejection',
  ivc: 'flow.now.ivc',
  ivr: 'flow.now.ivr',
  rapidFill: 'flow.now.rapidFill',
  diastasis: 'flow.now.diastasis',
  kick: 'flow.now.kick',
  cannon: 'flow.now.cannon',
  dropped: 'flow.now.dropped',
  noKickAf: 'flow.now.noKickAf',
  noOutput: 'flow.now.noOutput',
  idle: 'flow.now.idle',
} as const satisfies Record<FlowCaptionId, View3dKey>;
