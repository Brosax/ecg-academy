/**
 * Torsades de pointes episodes on a long-QT sinus rhythm (pause-dependent initiation; deterministic, append-only).
 *
 * Each episode cycle: `sinusBeats` conducted sinus beats (long QT) → an isolated PVC from the ectopic focus just after
 * the T wave ("short" cycle) → the next sinus impulse is concealed in the AV node (retrograde penetration by the PVC),
 * so the ventricles pause (compensatory pause, "long" cycle) → the post-pause sinus beat has an even longer QT
 * (rate adaptation of the APD after the long cycle) → an R-on-T beat from the same focus fires before that beat's T wave
 * has ended → it is the first wave of a run of torsades (the precessing scroll wave of source/vfField.ts) lasting
 * `runMs` → every point completes its last action potential → sinus conduction resumes.
 * The sinus node keeps firing throughout; impulses reaching the ventricles during a run are concealed ('block' events).
 * Faster sinus rates (≥ suppressAtBpm) shorten the QT and abolish the pauses: no episodes (overdrive suppression).
 *
 * Runs are not beat events (BeatEvent is a frozen contract): they are exposed through runAt / runsUntil, which the
 * engine uses for the ECG source (TemplateStream continuous ventricular source), the GPU frame and the cycle truth.
 */
import type { RhythmSpec } from '../scenarios/types';
import type { TdpEpisodeSpec } from '../source/vfField';
import type { BeatEvent } from '../types';
import type { ScenarioRhythmTiming } from './scenarioRhythm';
import { ScenarioRhythm } from './scenarioRhythm';

type VEvent = Extract<BeatEvent, { kind: 'V' }>;

export interface TdpRun {
  /** Trigger time (ms): the R-on-T beat leaves the focus (run time 0). */
  readonly tMs: number;
  /** Run length D (ms): no upstroke is accepted after tMs + runMs. */
  readonly runMs: number;
  /** Every point has recovered (ms, absolute): end of the run's source. */
  readonly endMs: number;
  /** The beat the trigger falls on (post-pause sinus beat). */
  readonly prev: VEvent;
}

export interface TdpTiming {
  /** T end (model truth: 95 % of the source surface repolarized) of a main-variant beat after its V event, for RR_prev. */
  readonly tEndMs: (rrPrevMs: number) => number;
  /** From the trigger until every point of the run has recovered (ms). */
  readonly runSpanMs: number;
}

/** The isolated PVC comes at least this long after the preceding T end (it must not itself fall on the T wave). */
const PVC_AFTER_T_MS = 40;

export class TdpRhythm extends ScenarioRhythm {
  private readonly evs: BeatEvent[] = [];
  private readonly runList: TdpRun[] = [];
  private readonly ep: TdpEpisodeSpec;
  private id = 1;
  private nextA: number;
  private bpmS: number;
  private pending: { bpm: number; fromMs: number } | null = null;
  private lastA: number | null = null;
  private lastV: number | null = null;
  /** Conducted sinus beats in the current episode cycle. */
  private k = 0;
  private stage: 'sinus' | 'pause' | 'postPause' = 'sinus';
  private blockedUntil = -Infinity;

  constructor(
    private readonly rspec: RhythmSpec,
    private readonly tm: ScenarioRhythmTiming,
    private readonly tdp: TdpTiming,
  ) {
    const spec = rspec;
    super(spec, tm);
    if (!spec.vf?.episodes) throw new Error('TdpRhythm: rhythm.vf.episodes missing');
    this.ep = spec.vf.episodes;
    this.bpmS = spec.bpm ?? tm.bpm;
    this.nextA = tm.startMs;
  }

  override get heartRate(): number {
    return this.bpmS;
  }

  override setHeartRate(bpm: number, fromMs: number): void {
    this.pending = { bpm: Math.max(20, Math.min(220, bpm)), fromMs };
  }

  override eventsUntil(tMs: number): readonly BeatEvent[] {
    while (this.nextA <= tMs) this.sinusBeat();
    return this.evs;
  }

  /** Runs whose trigger is at or before tMs (generating as needed), ascending. */
  runsUntil(tMs: number): readonly TdpRun[] {
    this.eventsUntil(tMs);
    return this.runList;
  }

  /** The first run the current settings produce, from a throwaway copy (this rhythm is not advanced). */
  previewRun(): TdpRun | null {
    const copy = new TdpRhythm(this.rspec, { ...this.tm, bpm: this.bpmS }, this.tdp);
    copy.bpmS = this.pending?.bpm ?? this.bpmS;
    return copy.runsUntil(this.tm.startMs + 60000)[0] ?? null;
  }

  /** The run whose source is active at tMs (from δ before the trigger to full recovery), or null. */
  runAt(tMs: number, leadMs = 10): TdpRun | null {
    const rs = this.runsUntil(tMs + leadMs);
    for (let i = rs.length - 1; i >= 0; i--) {
      const r = rs[i];
      if (r.endMs < tMs) return null;
      if (r.tMs - leadMs <= tMs) return r;
    }
    return null;
  }

  private pushEv(ev: BeatEvent): void {
    const e = this.evs;
    let i = e.length;
    while (i > 0 && e[i - 1].tMs > ev.tMs) i--;
    e.splice(i, 0, ev);
  }

  private emitVent(tV: number, variant: string, fromA: number | null): VEvent {
    const rrPrev = this.lastV === null ? 60000 / this.bpmS : Math.max(150, tV - this.lastV);
    const v: VEvent = {
      kind: 'V', id: this.id++, tMs: tV, variant, rrPrevMs: rrPrev,
      apdScale: Math.pow(rrPrev / this.tm.rrRefMs, this.tm.apdExp), fromA,
    };
    this.pushEv(v);
    this.lastV = tV;
    return v;
  }

  private sinusBeat(): void {
    if (this.pending && this.nextA >= this.pending.fromMs) {
      this.bpmS = this.pending.bpm;
      this.pending = null;
    }
    const rr = 60000 / this.bpmS;
    const tA = this.nextA;
    const aId = this.id++;
    this.pushEv({ kind: 'A', id: aId, tMs: tA, variant: this.tm.atrialMain, rrPrevMs: this.lastA === null ? rr : tA - this.lastA });
    this.lastA = tA;
    this.nextA = tA + rr;
    const tV = tA + this.avDelayMs(rr);
    // concealed: the PVC penetrated the AV node retrogradely (compensatory pause), or the ventricles are in a run
    if (this.stage === 'pause' || tV < this.blockedUntil) {
      this.pushEv({ kind: 'block', id: this.id++, tMs: tA + this.tm.atrioNodalMs, aId, site: 'AVN' });
      if (this.stage === 'pause') this.stage = 'postPause';
      return;
    }
    const v = this.emitVent(tV, this.tm.ventricularMain, aId);
    const episodes = this.bpmS < this.ep.suppressAtBpm && this.tm.ventricularAlt !== null;
    if (this.stage === 'postPause') {
      // R-on-T: the trigger fires before the post-pause beat's T wave has ended; the run starts with it
      const tTrig = v.tMs + this.tdp.tEndMs(v.rrPrevMs) - this.ep.triggerBeforeTEndMs;
      this.runList.push({ tMs: tTrig, runMs: this.ep.runMs, endMs: tTrig + this.tdp.runSpanMs, prev: v });
      this.blockedUntil = tTrig + this.tdp.runSpanMs;
      // APD restitution of the first beat after the run: its preceding cycle ends with the run's last upstrokes
      this.lastV = tTrig + this.ep.runMs;
      this.stage = 'sinus';
      this.k = 0;
      return;
    }
    this.k++;
    if (episodes && this.k >= this.ep.sinusBeats) {
      const coupling = Math.max(this.ep.pvcCouplingFrac * rr, this.tdp.tEndMs(v.rrPrevMs) + PVC_AFTER_T_MS);
      this.emitVent(v.tMs + coupling, this.tm.ventricularAlt!, null);
      this.stage = 'pause';
    }
  }
}
