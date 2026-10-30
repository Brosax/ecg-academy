/**
 * FROZEN CONTRACT — global UI state (Preact signals). Only the integrator edits this file.
 *
 * Performance rule: never read `store.time.value` inside a Preact render (it changes every frame). Render loops
 * (three.js, canvases) read `store.time.peek()`. Components that need "what is happening now" use `store.now`
 * (updated ~10×/s by the clock).
 */
import { signal } from '@preact/signals';
import type { LeadName, MechPhase, StructureId, Vec3, WaveSegment } from '../sim/types';

export type Mode = 'overview' | 'leads' | 'section' | 'disease';
export type Lang = 'zh' | 'en' | 'es';
export type Theme = 'light' | 'dark';
export type SlicePreset = 'fourChamber' | 'shortBase' | 'shortMid' | 'shortApex' | 'longAxis';

export interface SliceState {
  readonly enabled: boolean;
  readonly preset: SlicePreset | 'custom';
  /** Plane normal in the heart-LOCAL frame (unit). Points toward the half that is cut away. */
  readonly normal: Vec3;
  /** Signed plane offset along the normal (mm, local frame): plane = { p : dot(p, normal) = offsetMm }. */
  readonly offsetMm: number;
  /** Show propagation-direction arrows (∇τ) on the slice. */
  readonly arrows: boolean;
}

export interface Layers {
  readonly conduction: boolean;
  readonly vector: boolean;
  readonly vcgTrail: boolean;
  readonly torso: boolean;
  readonly electrodes: boolean;
  readonly leadAxis: boolean;
  readonly valves: boolean;
  readonly labels: boolean;
  /** Contraction amplitude 0..1 (0 = frozen geometry). */
  readonly contraction: number;
}

export interface CaliperState {
  /** Absolute sim times (ms) of the two cursors. */
  readonly t0: number;
  readonly t1: number;
  /** Optional amplitude cursors (mV) on the measured lead. */
  readonly lead: LeadName;
  readonly v0?: number;
  readonly v1?: number;
}

export interface NowInfo {
  readonly tMs: number;
  readonly segment: WaveSegment | null;
  readonly mech: MechPhase | null;
  readonly responsible: readonly { readonly id: StructureId; readonly w: number }[];
}

export interface EngineStatus {
  readonly ready: boolean;
  /** 0..1 */
  readonly progress: number;
  readonly label: string;
  readonly error?: string;
}

export const DEFAULT_LAYERS: Layers = {
  conduction: true,
  vector: true,
  vcgTrail: true,
  torso: false,
  electrodes: false,
  leadAxis: false,
  valves: true,
  labels: true,
  contraction: 1,
};

export const DEFAULT_SLICE: SliceState = {
  enabled: false,
  preset: 'fourChamber',
  normal: [0, 0, 1],
  offsetMm: 0,
  arrows: true,
};

export const store = {
  /** Simulation time, ms (float64). Advanced by the clock while playing. */
  time: signal(0),
  playing: signal(true),
  /** Playback speed 0.01 … 1 (1 = real time; the transport slider spans 0.05 … 1, the guided tour may go slower). */
  speed: signal(1),
  mode: signal<Mode>('overview'),
  lang: signal<Lang>('zh'),
  theme: signal<Theme>('light'),
  heartRate: signal(75),
  selectedLead: signal<LeadName>('II'),
  /** Explicit highlight (tour, quiz, ECG click). Empty = automatic (responsible structures). */
  highlight: signal<readonly StructureId[]>([]),
  autoHighlight: signal(true),
  slice: signal<SliceState>(DEFAULT_SLICE),
  layers: signal<Layers>(DEFAULT_LAYERS),
  electrodeStandard: signal<'IEC' | 'AHA'>('IEC'),
  /** 'sync' = all 12 leads show the same time window (default); 'clinical' = sequential 4 × 2.5 s columns. */
  ecgLayout: signal<'sync' | 'clinical'>('sync'),
  calipers: signal<CaliperState | null>(null),
  /** Active guided-tour step (null = no tour). */
  tourStep: signal<number | null>(null),
  /** ~10 Hz summary of the current instant, for info cards. */
  now: signal<NowInfo>({ tMs: 0, segment: null, mech: null, responsible: [] }),
  engine: signal<EngineStatus>({ ready: false, progress: 0, label: '' }),
  /** Active disease scenario (round 2); `loading` while the engine for it is being built. */
  scenario: signal<{ readonly id: string; readonly loading: boolean }>({ id: 'normal-sinus-rhythm', loading: false }),
};

export type Store = typeof store;
