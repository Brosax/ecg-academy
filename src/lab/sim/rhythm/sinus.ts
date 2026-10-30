/**
 * Normal sinus rhythm generator (deterministic, append-only).
 * A event = SA-node firing. V event = His-bundle activation (ventricular activation-field time zero).
 * AV delay (A → His) = atrioNodalMs + avnTransitMs · (RR/RRref)^avExp, so PR shortens with rate.
 * Ventricular APD scale = (RR_prev / RRref)^apdExp (APD restitution; QTc stays constant by Fridericia).
 */
import type { BeatEvent, RhythmGenerator } from '../types';

export interface SinusParams {
  readonly bpm: number;
  readonly rrRefMs: number;
  /** SA firing → AV-node entry (atrial conduction). */
  readonly atrioNodalMs: number;
  /** AV-node + His transit at RRref (AH + early HV). */
  readonly avnTransitMs: number;
  readonly avExp: number;
  readonly apdExp: number;
  readonly firstBeatMs: number;
  readonly atrialVariant: string;
  readonly ventricularVariant: string;
}

export const DEFAULT_SINUS: SinusParams = {
  bpm: 75,
  rrRefMs: 800,
  atrioNodalMs: 50,
  avnTransitMs: 80,
  avExp: 0.3,
  apdExp: 1 / 3,
  firstBeatMs: 100,
  atrialVariant: 'sinus',
  ventricularVariant: 'normal',
};

export class SinusRhythm implements RhythmGenerator {
  private readonly events: BeatEvent[] = [];
  private nextId = 1;
  private nextAMs: number;
  private bpm: number;
  private pendingRate: { bpm: number; fromMs: number } | null = null;
  private lastV: number | null = null;
  private lastA: number | null = null;

  constructor(private readonly p: SinusParams = DEFAULT_SINUS) {
    this.bpm = p.bpm;
    this.nextAMs = p.firstBeatMs;
  }

  get heartRate(): number {
    return this.bpm;
  }

  setHeartRate(bpm: number, fromMs: number): void {
    this.pendingRate = { bpm: Math.max(20, Math.min(220, bpm)), fromMs };
  }

  eventsUntil(tMs: number): readonly BeatEvent[] {
    while (this.nextAMs <= tMs) this.generateBeat();
    return this.events;
  }

  /** Atrial-to-His delay for a given cycle length. */
  avDelayMs(rrMs: number): number {
    return this.p.atrioNodalMs + this.p.avnTransitMs * Math.pow(rrMs / this.p.rrRefMs, this.p.avExp);
  }

  private generateBeat(): void {
    const tA = this.nextAMs;
    if (this.pendingRate && tA >= this.pendingRate.fromMs) {
      this.bpm = this.pendingRate.bpm;
      this.pendingRate = null;
    }
    const rr = 60000 / this.bpm;
    const rrPrevA = this.lastA === null ? rr : tA - this.lastA;
    const aId = this.nextId++;
    this.events.push({ kind: 'A', id: aId, tMs: tA, variant: this.p.atrialVariant, rrPrevMs: rrPrevA });
    const tV = tA + this.avDelayMs(rr);
    const rrPrevV = this.lastV === null ? rr : tV - this.lastV;
    this.events.push({
      kind: 'V',
      id: this.nextId++,
      tMs: tV,
      variant: this.p.ventricularVariant,
      rrPrevMs: rrPrevV,
      apdScale: Math.pow(rrPrevV / this.p.rrRefMs, this.p.apdExp),
      fromA: aId,
    });
    this.lastA = tA;
    this.lastV = tV;
    this.nextAMs = tA + rr;
  }
}
