/**
 * Scenario-switching facade over the real engine (implements SimEngine). The app holds one ScenarioEngine for its
 * lifetime; setScenario() builds a new inner engine for the chosen disease (≈ 0.3–0.6 s) and fires onChange, so the
 * views rebuild their per-vertex data and caches without recreating the WebGL context.
 * The new rhythm starts a few seconds before the current playback time, so the ECG history on screen immediately shows
 * the new condition instead of a flat gap. A normal reference engine is kept for the "compare with normal" overlay.
 */
import type { Engine, ProgressFn } from './engine';
import { createEngine } from './engine';
import { NORMAL_SCENARIO } from './scenarios/normal';
import { ownsRate } from './scenarios/rate';
import type { Scenario } from './scenarios/types';
import type {
  BeatSnapshot, CycleTruth, ElectrodeField, EngineFields, GeometryBundle, LeadProjector, Pose, RhythmGenerator, SimEngine,
  StructureId,
} from './types';

/** How far back (ms) a new scenario's rhythm starts relative to the current playback time. */
const HISTORY_MS = 4000;

export class ScenarioEngine implements SimEngine {
  readonly fsHz = 1000;
  private inner: Engine;
  private normalRef: Engine | null;
  private readonly listeners = new Set<() => void>();
  private unsubInner: () => void;
  private building: Promise<void> | null = null;

  constructor(
    /** Geometry before any scenario changes (necrosis relabels a copy per scenario). */
    private readonly baseGeometry: GeometryBundle,
    inner: Engine,
  ) {
    this.inner = inner;
    this.normalRef = inner.scenario.id === NORMAL_SCENARIO.id ? inner : null;
    this.unsubInner = inner.onChange(() => this.emit());
  }

  static async create(geometry: GeometryBundle, onProgress?: ProgressFn): Promise<ScenarioEngine> {
    const e = await createEngine(geometry, undefined, onProgress, { scenario: NORMAL_SCENARIO });
    return new ScenarioEngine(geometry, e);
  }

  get scenario(): Scenario {
    return this.inner.scenario;
  }
  get current(): Engine {
    return this.inner;
  }
  get geometry(): GeometryBundle {
    return this.inner.geometry;
  }
  get fields(): EngineFields {
    return this.inner.fields;
  }
  get projector(): LeadProjector {
    return this.inner.projector;
  }
  get electrodes(): ElectrodeField {
    return this.inner.electrodes;
  }
  get rhythm(): RhythmGenerator {
    return this.inner.rhythm;
  }

  /** The normal-sinus reference engine (built on first use) — for overlays and comparisons. */
  async normal(): Promise<Engine> {
    if (!this.normalRef) this.normalRef = await createEngine(this.baseGeometry, undefined, undefined, { scenario: NORMAL_SCENARIO });
    return this.normalRef;
  }

  /**
   * Switches to another scenario. `nowMs` = current playback time; `bpm` = the sinus rate to keep (ignored when the
   * scenario sets its own rate). Resolves once the new engine is active.
   */
  setScenario(sc: Scenario, nowMs: number, bpm?: number, onProgress?: ProgressFn): Promise<void> {
    const run = async () => {
      const e = await createEngine(this.baseGeometry, undefined, onProgress, {
        scenario: sc,
        startMs: Math.max(100, nowMs - HISTORY_MS),
      });
      if (bpm !== undefined && !ownsRate(sc)) e.setHeartRate(bpm);
      this.unsubInner();
      this.inner = e;
      if (sc.id === NORMAL_SCENARIO.id) this.normalRef = e;
      this.unsubInner = e.onChange(() => this.emit());
      this.emit();
    };
    const p = (this.building ?? Promise.resolve()).then(run, run);
    this.building = p.finally(() => {
      if (this.building === p) this.building = null;
    });
    return p;
  }

  sampleH(t0Ms: number, n: number, outA: Float32Array, outV: Float32Array): void {
    this.inner.sampleH(t0Ms, n, outA, outV);
  }
  sampleLeads(t0Ms: number, n: number, out: Float32Array): void {
    this.inner.sampleLeads(t0Ms, n, out);
  }
  activeBeats(tMs: number): BeatSnapshot {
    return this.inner.activeBeats(tMs);
  }
  cycleAt(tMs: number): CycleTruth | null {
    return this.inner.cycleAt(tMs);
  }
  responsible(tMs: number): readonly { readonly id: StructureId; readonly w: number }[] {
    return this.inner.responsible(tMs);
  }
  afFrame(tMs: number, out: Float32Array): number {
    return this.inner.afFrame(tMs, out);
  }
  /** Ventricular field frame (VF / torsades; source/vfDriver.ts VfFrameSource — not part of the frozen SimEngine). */
  vfFrame(tMs: number, out: Float32Array): number {
    return this.inner.vfFrame(tMs, out);
  }

  setHeartRate(bpm: number): void {
    this.inner.setHeartRate(bpm);
  }
  setPose(pose: Pose): void {
    this.inner.setPose(pose);
  }
  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(): void {
    for (const cb of this.listeners) cb();
  }
}
