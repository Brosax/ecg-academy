/**
 * FROZEN CONTRACT — the only way modules change shared state. The guided tour and the quiz drive the app through
 * these commands; views call them on user interaction.
 */
import type { ScenarioEngine } from '../sim/scenarioEngine';
import { SCENARIOS } from '../sim/scenarios/library';
import { ownsRate } from '../sim/scenarios/rate';
import type { LeadName, SimEngine, StructureId, Vec3, WaveSegment } from '../sim/types';
import type { Mode, SlicePreset, SliceState } from './store';
import { store } from './store';

/** Slice presets in the heart-LOCAL frame (+y apex→base, +z anterior, +x LV lateral). */
export const SLICE_PRESETS: Readonly<Record<SlicePreset, { normal: Vec3; offsetMm: number }>> = {
  /** Four-chamber view: plane through both AV valves and the apex, cutting away the anterior half. */
  fourChamber: { normal: [0, 0, 1], offsetMm: 0 },
  /** Short-axis slices (perpendicular to the long axis), cutting away the basal part. */
  shortBase: { normal: [0, 1, 0], offsetMm: 25 },
  shortMid: { normal: [0, 1, 0], offsetMm: 0 },
  shortApex: { normal: [0, 1, 0], offsetMm: -25 },
  /** Long-axis two-chamber-like view, cutting away the septal/RV side. */
  longAxis: { normal: [-1, 0, 0], offsetMm: 4 },
};

export interface AppCommands {
  seek(tMs: number): void;
  play(): void;
  pause(): void;
  togglePlay(): void;
  /** Clamped to 0.01 … 1 (the transport slider uses 0.05 … 1; the guided tour may go slower). */
  setSpeed(x: number): void;
  /** Jump to the next / previous electrical-segment boundary of the current cycle (pauses). */
  stepPhase(dir: 1 | -1): void;
  /** Seek to the start of a segment in the current cycle, pause, and highlight its structures. */
  focusSegment(seg: WaveSegment): void;
  highlight(ids: readonly StructureId[]): void;
  clearHighlight(): void;
  setSlice(s: SlicePreset | Partial<SliceState>): void;
  selectLead(l: LeadName): void;
  setMode(m: Mode): void;
  setHeartRate(bpm: number): void;
  /** Switch the simulated condition (disease scenario id). Resolves when the new engine is active. */
  setScenario(id: string): Promise<void>;
}

/** Structures that generate each segment — used by focusSegment and info cards. */
export const SEGMENT_STRUCTURES: Readonly<Record<WaveSegment, readonly StructureId[]>> = {
  P: ['SA', 'RA', 'BACHMANN', 'LA'],
  PR: ['AVN', 'HIS', 'LBB', 'RBB'],
  QRS: ['SEPTUM', 'LV_APEX', 'LV_ANTERIOR', 'LV_LATERAL', 'RV_FREE', 'LV_POSTEROBASAL', 'RVOT'],
  ST: ['LV_ANTERIOR', 'LV_LATERAL', 'LV_INFERIOR', 'SEPTUM', 'RV_FREE'],
  T: ['LV_APEX', 'LV_LATERAL', 'LV_ANTERIOR', 'LV_INFERIOR', 'LV_POSTEROBASAL'],
  TP: [],
};

const isScenarioEngine = (e: SimEngine): e is ScenarioEngine => typeof (e as Partial<ScenarioEngine>).setScenario === 'function';

export function createCommands(engine: SimEngine): AppCommands {
  const boundaries = (t: number): number[] => {
    const out: number[] = [];
    for (const probe of [t - 1500, t, t + 1500]) {
      const c = engine.cycleAt(probe);
      if (!c) continue;
      for (const s of c.segments) out.push(s.t0, s.t1);
    }
    return [...new Set(out.map((x) => Math.round(x * 10) / 10))].sort((a, b) => a - b);
  };
  // The student's sinus rate: a scenario with its own rate (AF: mean ventricular rate) must not overwrite it, so
  // "back to normal" returns to the rate they had chosen.
  const ownRate = (id: string) => !!SCENARIOS[id] && ownsRate(SCENARIOS[id]);
  let sinusBpm = store.heartRate.peek();
  const cmd: AppCommands = {
    seek(tMs) {
      store.time.value = Math.max(0, tMs);
    },
    play() {
      store.playing.value = true;
    },
    pause() {
      store.playing.value = false;
    },
    togglePlay() {
      store.playing.value = !store.playing.value;
    },
    setSpeed(x) {
      store.speed.value = Math.min(1, Math.max(0.01, x));
    },
    stepPhase(dir) {
      const t = store.time.peek();
      const b = boundaries(t);
      const next = dir > 0 ? b.find((x) => x > t + 0.5) : [...b].reverse().find((x) => x < t - 0.5);
      store.playing.value = false;
      if (next !== undefined) store.time.value = next;
    },
    focusSegment(seg) {
      const c = engine.cycleAt(store.time.peek());
      const s = c?.segments.find((x) => x.seg === seg);
      store.playing.value = false;
      if (s) store.time.value = s.t0;
      store.highlight.value = SEGMENT_STRUCTURES[seg];
    },
    highlight(ids) {
      store.highlight.value = ids;
    },
    clearHighlight() {
      store.highlight.value = [];
    },
    setSlice(s) {
      if (typeof s === 'string') {
        const p = SLICE_PRESETS[s];
        store.slice.value = { ...store.slice.peek(), enabled: true, preset: s, normal: p.normal, offsetMm: p.offsetMm };
      } else {
        store.slice.value = { ...store.slice.peek(), ...s };
      }
    },
    selectLead(l) {
      store.selectedLead.value = l;
    },
    setMode(m) {
      store.mode.value = m;
      const layers = store.layers.peek();
      if (m === 'leads') store.layers.value = { ...layers, torso: true, electrodes: true, leadAxis: true, vector: true };
      else store.layers.value = { ...layers, torso: false, electrodes: false, leadAxis: false };
      store.slice.value = { ...store.slice.peek(), enabled: m === 'section' };
    },
    setHeartRate(bpm) {
      const v = Math.round(Math.min(150, Math.max(40, bpm)));
      store.heartRate.value = v;
      engine.setHeartRate(v);
      if (!ownRate(store.scenario.peek().id)) sinusBpm = v;
    },
    async setScenario(id) {
      const sc = SCENARIOS[id];
      if (!sc || !isScenarioEngine(engine) || (store.scenario.peek().id === id && !store.scenario.peek().loading)) return;
      if (!ownRate(store.scenario.peek().id)) sinusBpm = store.heartRate.peek();
      store.scenario.value = { id, loading: true };
      try {
        await engine.setScenario(sc, store.time.peek(), sinusBpm);
        store.heartRate.value = Math.round(engine.rhythm.heartRate);
        store.highlight.value = sc.teach?.highlight ?? [];
      } finally {
        store.scenario.value = { id: engine.scenario.id, loading: false };
      }
    },
  };
  return cmd;
}
