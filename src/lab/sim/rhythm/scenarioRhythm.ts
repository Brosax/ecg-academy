/**
 * General rhythm generator for disease scenarios (deterministic, append-only, events kept sorted by time).
 *
 * A event = atrial activation origin (SA node, ectopic focus or retrograde AV node); V event = ventricular field
 * t = 0 (His activation for conducted / junctional beats, the focus for ectopic beats).
 * Conducted beats: V = A + atrioNodal + AH, AH = ahMs·(RR/RRref)^avExp, modified by the AV spec:
 *   first-degree — PR target; Wenckebach — AH grows by inc, inc/2, inc/4 … and the last beat of each cycle is blocked;
 *   Mobitz II — constant AH, the last beat of each cycle blocked; complete — nothing conducts, an escape focus fires.
 * Ectopy replaces every Nth beat: PAC = early atrial beat from the alt focus (sinus node reset, non-compensatory);
 * PVC = early ventricular beat from the alt focus; the next sinus beat meets refractory tissue (compensatory pause).
 * VT: ventricular events from the VT focus at a fixed rate; sinus P waves continue, dissociated.
 * AF: no A events (the atrial field is continuous); V events are the impulses the AV-node filter lets through.
 * Junctional: no sinus beats; the junction fires V events (main variant) and retrograde A events (P′).
 * Flutter: no sinus beats; one A event per revolution of the atrial re-entry circuit; every Nth conducts (flutterAv.ts).
 * VF: sinus A events continue, none conducts (the ventricular field is continuous); torsades episodes: tdpRhythm.ts.
 * The heart-rate slider sets the rate of the driving pacemaker (scenarios/rate.ts): sinus, VT focus, junction, mean
 * ventricular rate in AF (and in flutter, through the AV conduction ratio); in complete block the atrial rate.
 */
import type { AvnSpec } from '../source/afField';
import type { RhythmSpec } from '../scenarios/types';
import type { BeatEvent, RhythmGenerator } from '../types';
import type { AvnImpulses } from './avnFilter';
import { AvnFilter } from './avnFilter';
import { FlutterAvConduction, flutterRatioFor } from './flutterAv';

export interface ScenarioRhythmTiming {
  readonly bpm: number;
  readonly rrRefMs: number;
  /** SA firing → AV-node entry (ms). */
  readonly atrioNodalMs: number;
  /** Ectopic atrial origin → AV-node entry (ms) for the alternative atrial variant (PAC). */
  readonly atrioNodalAltMs?: number;
  /** AV-node transit at RRref for a normal beat (ms). */
  readonly ahMs: number;
  /** QRS onset after the His event minus P onset after the A event (ms): PR = atrioNodal + AH + prOffset. */
  readonly prOffsetMs?: number;
  readonly avExp: number;
  readonly apdExp: number;
  /** First beat no earlier than this (ms) — new scenarios start at the current time. */
  readonly startMs: number;
  readonly atrialMain: string;
  readonly atrialAlt: string | null;
  readonly ventricularMain: string;
  readonly ventricularAlt: string | null;
  /** AF: atrial impulse train at the AV node and the node's parameters. */
  readonly af?: { readonly impulses: AvnImpulses; readonly avn: AvnSpec; readonly seed: number } | null;
  /** Atrial flutter: revolution time of the re-entry circuit (ms) = interval between A events. */
  readonly flutterCycleMs?: number | null;
}

/** Refractory window after a premature ventricular beat during which a sinus beat does not conduct (ms). */
const PVC_REFRACTORY_MS = 420;
/**
 * Decremental AV-node conduction of a premature atrial beat: extra AH (ms) per unit of prematurity (1 − coupling),
 * i.e. +28 ms at a coupling of 0.65 — the node has not fully recovered.
 */
const PREMATURE_AH_GAIN_MS = 80;

export class ScenarioRhythm implements RhythmGenerator {
  private readonly events: BeatEvent[] = [];
  private nextId = 1;
  private nextAMs: number;
  private bpm: number;
  private pendingRate: { bpm: number; fromMs: number } | null = null;
  private lastAMs: number | null = null;
  private lastVMs: number | null = null;
  private beat = 0;
  private cyclePos = 0;
  private refractoryUntil = -Infinity;
  private nextEscapeMs: number | null = null;
  private nextVtMs: number | null = null;
  private vtBpm = 0;
  private nextJMs: number | null = null;
  private readonly avn: AvnFilter | null = null;
  /** Atrial flutter: N:1 (or variable) conduction of the flutter waves, and the flutter cycle length. */
  private readonly flutterAv: FlutterAvConduction | null = null;
  private readonly flutterCl: number = 0;

  constructor(
    private readonly spec: RhythmSpec,
    private readonly t: ScenarioRhythmTiming,
  ) {
    this.bpm = spec.bpm ?? t.bpm;
    this.nextAMs = t.startMs;
    if (spec.av?.mode === 'complete' && spec.av.escape) this.nextEscapeMs = t.startMs + 300;
    if (spec.vt) {
      this.nextVtMs = t.startMs + 150;
      this.vtBpm = spec.vt.bpm;
    }
    if (spec.junctional) {
      this.bpm = spec.junctional.bpm;
      this.nextJMs = t.startMs + 200;
      this.nextAMs = Infinity;
    }
    if (spec.af && t.af) {
      this.avn = new AvnFilter(t.af.impulses, t.af.avn, t.ahMs, 60000 / this.bpm, t.startMs, t.af.seed);
      this.nextAMs = Infinity;
    }
    if (spec.flutter && t.flutterCycleMs) {
      this.flutterCl = t.flutterCycleMs;
      this.flutterAv = new FlutterAvConduction(spec.flutter.ratio);
      this.bpm = 60000 / (spec.flutter.ratio * this.flutterCl);
    }
  }

  get heartRate(): number {
    // flutter: the mean ventricular rate (atrial rate / conduction ratio)
    if (this.flutterAv) return 60000 / (this.flutterAv.ratio * this.flutterCl);
    return this.spec.vt ? this.vtBpm : this.bpm;
  }

  setHeartRate(bpm: number, fromMs: number): void {
    const b = Math.max(20, Math.min(220, bpm));
    if (this.flutterAv) {
      // the circuit sets the atrial rate; the control sets the mean ventricular rate through the AV conduction ratio
      this.flutterAv.setRatio(flutterRatioFor(b, this.flutterCl));
      this.bpm = this.heartRate;
      return;
    }
    if (this.avn) {
      this.bpm = b;
      this.avn.retarget(60000 / b);
      return;
    }
    if (this.spec.vt) {
      this.vtBpm = b;
      return;
    }
    if (this.spec.junctional) {
      this.bpm = b;
      return;
    }
    this.pendingRate = { bpm: b, fromMs };
  }

  eventsUntil(tMs: number): readonly BeatEvent[] {
    while (this.nextAMs <= tMs) {
      if (this.flutterAv) this.flutterWave();
      else this.sinusCycle();
    }
    while (this.nextEscapeMs !== null && this.nextEscapeMs <= tMs) this.escapeBeat();
    while (this.nextVtMs !== null && this.nextVtMs <= tMs) this.vtBeat();
    while (this.nextJMs !== null && this.nextJMs <= tMs) this.junctionalBeat();
    while (this.avn && this.avn.nextImpulseMs <= tMs) {
      const tV = this.avn.step();
      if (tV !== null) this.emitV(tV, this.t.ventricularMain, null);
    }
    return this.events;
  }

  /** Atrial-to-His delay of a normally conducted beat for a cycle length (ms). */
  avDelayMs(rrMs: number): number {
    return this.t.atrioNodalMs + this.ah(rrMs);
  }

  /** AV-node transit for a cycle length (ms). */
  private ah(rr: number): number {
    return this.t.ahMs * Math.pow(rr / this.t.rrRefMs, this.t.avExp);
  }

  private push(ev: BeatEvent): void {
    const e = this.events;
    let i = e.length;
    while (i > 0 && e[i - 1].tMs > ev.tMs) i--;
    e.splice(i, 0, ev);
  }

  private emitV(tV: number, variant: string, fromA: number | null): void {
    const rrPrev = this.lastVMs === null ? 60000 / this.bpm : Math.max(150, tV - this.lastVMs);
    this.push({
      kind: 'V', id: this.nextId++, tMs: tV, variant, rrPrevMs: rrPrev,
      apdScale: Math.pow(rrPrev / this.t.rrRefMs, this.t.apdExp), fromA,
    });
    this.lastVMs = tV;
  }

  private sinusCycle(): void {
    const s = this.spec;
    if (this.pendingRate && this.nextAMs >= this.pendingRate.fromMs) {
      this.bpm = this.pendingRate.bpm;
      this.pendingRate = null;
    }
    let rr = 60000 / this.bpm;
    if (s.respiratory) rr *= 1 + s.respiratory.depth * Math.sin((2 * Math.PI * this.nextAMs) / s.respiratory.periodMs);
    let tA = this.nextAMs;
    let aVariant = this.t.atrialMain;
    const ect = s.ectopy;
    const ectopicNow = !!ect && this.beat % ect.every === ect.every - 1;
    // PAC: an early atrial beat from the alternative focus; the sinus node is reset by it
    if (ectopicNow && ect!.comp === 'A' && this.t.atrialAlt && this.lastAMs !== null) {
      tA = this.lastAMs + ect!.couplingFrac * rr;
      aVariant = this.t.atrialAlt;
    }
    const rrPrevA = this.lastAMs === null ? rr : tA - this.lastAMs;
    const aId = this.nextId++;
    this.push({ kind: 'A', id: aId, tMs: tA, variant: aVariant, rrPrevMs: rrPrevA });
    this.lastAMs = tA;

    // PVC: early ventricular beat from the alternative focus before this beat's conducted QRS
    if (ectopicNow && ect!.comp === 'V' && this.t.ventricularAlt && this.lastVMs !== null) {
      const tPvc = this.lastVMs + ect!.couplingFrac * rr;
      this.emitV(tPvc, this.t.ventricularAlt, null);
      this.refractoryUntil = tPvc + PVC_REFRACTORY_MS;
    }

    // AV conduction (an ectopic atrial beat reaches the AV node from its own origin, and arrives early)
    const av = s.av ?? { mode: 'normal' as const };
    // VF: impulses reaching fibrillating ventricles are concealed (no V events; the field drives the ventricles)
    const conducts = !s.vt && !s.vf && av.mode !== 'complete';
    const ectopicA = aVariant !== this.t.atrialMain;
    const atrioNodal = ectopicA ? (this.t.atrioNodalAltMs ?? this.t.atrioNodalMs) : this.t.atrioNodalMs;
    if (conducts) {
      let ah = this.ah(rr) + (ectopicA && ect ? PREMATURE_AH_GAIN_MS * (1 - ect.couplingFrac) : 0);
      let blocked = false;
      const ratio = Math.max(2, av.ratio ?? 4);
      const prOff = this.t.atrioNodalMs + (this.t.prOffsetMs ?? 0);
      if (av.mode === 'first-degree' && av.prMs) ah = Math.max(20, (av.prMs - prOff) * Math.pow(rr / this.t.rrRefMs, this.t.avExp));
      if (av.mode === 'wenckebach') {
        const k = this.cyclePos % ratio;
        if (k === ratio - 1) blocked = true;
        else {
          const base = av.prMs ? Math.max(20, av.prMs - prOff) : ah;
          const inc = av.incrementMs ?? 80;
          ah = base + (k === 0 ? 0 : inc * (2 - Math.pow(2, 1 - k)));
        }
        this.cyclePos++;
      } else if (av.mode === 'mobitz2') {
        if (this.cyclePos % ratio === ratio - 1) blocked = true;
        this.cyclePos++;
      }
      const tV = tA + atrioNodal + ah;
      if (blocked || tV < this.refractoryUntil) {
        const site = blocked && av.mode === 'mobitz2' ? (av.site ?? 'His') : 'AVN';
        this.push({ kind: 'block', id: this.nextId++, tMs: tA + atrioNodal + (site === 'His' ? ah : 0), aId, site });
      } else {
        this.emitV(tV, this.t.ventricularMain, aId);
      }
    }
    this.beat++;
    this.nextAMs = (aVariant === this.t.atrialMain ? this.nextAMs : tA) + rr;
  }

  /**
   * One revolution of the flutter circuit (A event = re-excitation of the CTI exit). Conducted waves reach the His
   * bundle atrioNodal + AH later, AH at the ventricular cycle (ratio × flutter cycle); blocked ones stop in the AV node.
   */
  private flutterWave(): void {
    const tA = this.nextAMs, cl = this.flutterCl;
    const aId = this.nextId++;
    this.push({ kind: 'A', id: aId, tMs: tA, variant: this.t.atrialMain, rrPrevMs: cl });
    this.lastAMs = tA;
    const fav = this.flutterAv!;
    if (fav.next()) this.emitV(tA + this.t.atrioNodalMs + this.ah(fav.ratio * cl), this.t.ventricularMain, aId);
    else this.push({ kind: 'block', id: this.nextId++, tMs: tA + this.t.atrioNodalMs, aId, site: 'AVN' });
    this.nextAMs = tA + cl;
  }

  private escapeBeat(): void {
    const esc = this.spec.av!.escape!;
    this.emitV(this.nextEscapeMs!, esc.variant, null);
    this.nextEscapeMs! += 60000 / esc.bpm;
  }

  private vtBeat(): void {
    this.emitV(this.nextVtMs!, this.spec.vt!.variant, null);
    this.nextVtMs! += 60000 / this.vtBpm;
  }

  private junctionalBeat(): void {
    const j = this.spec.junctional!;
    const tJ = this.nextJMs!, rr = 60000 / this.bpm;
    this.emitV(tJ, this.t.ventricularMain, null);
    const tA = tJ + j.retroDelayMs;
    this.push({ kind: 'A', id: this.nextId++, tMs: tA, variant: j.retroVariant, rrPrevMs: this.lastAMs === null ? rr : tA - this.lastAMs });
    this.lastAMs = tA;
    this.nextJMs = tJ + rr;
  }
}
