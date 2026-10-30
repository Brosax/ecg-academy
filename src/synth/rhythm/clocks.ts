/**
 * Rhythm clocks (DECISION §6.7). Each clock draws from its own named rng fork, so adding a draw to one stream never
 * shifts another.
 *
 *  - SinusNode: a resettable sinus pacemaker with respiratory HRV (RR₀·(1 + hrv·sin φ(t)) + 4 ms noise), scheduled
 *    pauses (sinus arrest), second-degree SA exit block (type II: every N-th discharge does not exit, pause = 2 PP;
 *    type I: the exit delay grows by halving increments, so PP shortens before a pause < 2 PP), and reset by any atrial
 *    depolarisation that reaches it first (PAC, retrograde P′, atrial pacing: next discharge one cycle plus the
 *    sinoatrial conduction time later → the non-compensatory pause). A pause declared after beat k is measured from
 *    the last atrial activation after that beat, which makes it the overdrive-suppression pause of sick-sinus syndrome
 *    when an atrial run follows beat k.
 *  - atrialSiteClock: ectopic atrial rhythm (one site), wandering pacemaker (the site drifts every few beats, with a
 *    slightly different rate per site), multifocal (a random site per beat, irregular PP), atrial tachycardia.
 *  - focusClock: idioventricular / VT focus with jitter.
 */
import type { Rng } from '../../core/rng';
import type { AtrialSite } from '../api';

/** Respiratory period of the sinus modulation (ms, ≈ 14 breaths/min). */
export const RESP_PERIOD_MS = 4200;
/** Sinoatrial conduction time, in + out (ms): the extra delay of the cycle after a reset (Strauss 1973: 40–150 ms). */
export const SACT_MS = 70;

export interface SinusExit {
  /** P onset (absolute ms) */
  readonly t: number;
  /** strip index of the exit (0 = first exit at or after 0 ms; negative in the pre-roll) */
  readonly index: number;
  /** the interval since the previous exit is an undisturbed clock cycle (no pause, block, reset) */
  readonly regular: boolean;
}

export interface SinusOptions {
  readonly rateBpm: number;
  readonly hrv: number;
  readonly pauses?: readonly { readonly afterBeat: number; readonly ms: number }[];
  readonly saBlock?: { readonly ratio: number; readonly type: 'I' | 'II' };
}

export class SinusNode {
  private readonly rr0: number;
  private readonly hrv: number;
  private readonly rng: Rng;
  private readonly phi: number;
  private readonly pauses: readonly { afterBeat: number; ms: number }[];
  private readonly block: { ratio: number; type: 'I' | 'II' } | null;
  /** next discharge (absolute ms) and whether the interval to it is a plain cycle */
  private nextT: number;
  private nextRegular = false;
  private exits = 0;
  private stripIdx = -1;
  private started = false;
  /** discharges inside the current SA-block group (exit block) */
  private group = 0;
  private exitDelay = 0;
  private pendingPause: number | null = null;

  constructor(o: SinusOptions, t0: number, rng: Rng) {
    this.rr0 = 60000 / o.rateBpm;
    this.hrv = o.hrv;
    this.rng = rng;
    this.phi = rng.range(0, 2 * Math.PI);
    this.pauses = o.pauses ?? [];
    this.block = o.saBlock ?? null;
    this.nextT = t0 - rng.range(0, this.rr0);
  }

  phaseAt(t: number): number {
    return (2 * Math.PI * t) / RESP_PERIOD_MS + this.phi;
  }

  /** the clock cycle (ms) that starts at t */
  cycleAt(t: number): number {
    return Math.max(220, this.rr0 * (1 + this.hrv * Math.sin(this.phaseAt(t))) + 4 * this.rng.normal());
  }

  /** time of the next P onset (exit) */
  peek(): number {
    return this.nextT + this.exitDelay;
  }

  /** Consume the next exit. */
  take(): SinusExit {
    const t = this.peek();
    const regular = this.nextRegular;
    this.pendingPause = null;
    if (t >= 0 && !this.started) this.started = true;
    if (this.started) this.stripIdx++;
    const idx = this.started ? this.stripIdx : -1 - this.exits;
    this.exits++;
    // schedule the following discharge
    const pause = this.started ? this.pauses.find((p) => p.afterBeat === this.stripIdx) : undefined;
    if (pause) {
      this.pendingPause = pause.ms;
      this.nextT = t + pause.ms;
      this.exitDelay = 0;
      this.group = 0;
      this.nextRegular = false;
    } else {
      this.nextT += this.cycleAt(this.nextT);
      this.nextRegular = true;
      if (this.block) this.advanceBlock();
    }
    return { t, index: idx, regular };
  }

  /** SA exit block: decide whether the next discharge exits, and with which exit delay. */
  private advanceBlock(): void {
    const b = this.block!;
    this.group++;
    if (b.type === 'II') {
      if (this.group >= b.ratio - 1) {
        // the next discharge does not exit: skip one cycle
        this.nextT += this.cycleAt(this.nextT);
        this.group = 0;
        this.nextRegular = false;
      }
      return;
    }
    // type I (SA Wenckebach): exit delay grows by halving increments (largest first), then a discharge blocks
    const step = 0.16 * this.rr0;
    if (this.group >= b.ratio - 1) {
      this.nextT += this.cycleAt(this.nextT);
      this.group = 0;
      this.exitDelay = 0;
      this.nextRegular = false;
      return;
    }
    this.exitDelay += step / 2 ** (this.group - 1);
  }

  /** An atrial depolarisation at `t` reached the node before its discharge: reset (non-compensatory pause). */
  reset(t: number): void {
    if (t >= this.peek()) return;
    // a pending pause stays armed through every reset until the node fires: after a run of atrial activations it is
    // measured from the last one (overdrive suppression)
    const pause = this.pendingPause;
    this.exitDelay = 0;
    this.group = 0;
    this.nextT = pause !== null ? t + pause : t + SACT_MS + this.cycleAt(t);
    this.nextRegular = false;
  }
}

/** Legacy pure sinus generator (respiratory HRV and pauses), kept for scripts: P-onset times. */
export interface SinusClock {
  readonly times: readonly number[];
  readonly phaseAt: (t: number) => number;
}
export function sinusClock(rateBpm: number, hrv: number, t0: number, t1: number, rng: Rng, pauses: readonly { afterBeat: number; ms: number }[] = []): SinusClock {
  const node = new SinusNode({ rateBpm, hrv, pauses }, t0, rng);
  const times: number[] = [];
  while (node.peek() < t1) times.push(node.take().t);
  return { times, phaseAt: (t) => node.phaseAt(t) };
}

/** Ventricular focus (VT, idioventricular): regular cycle with a small jitter (SD `jitterMs`). */
export function focusClock(rateBpm: number, t0: number, t1: number, rng: Rng, jitterMs = 1.5): number[] {
  const rr = 60000 / rateBpm;
  const out: number[] = [];
  let t = t0 - rng.range(0, rr);
  while (t < t1) {
    out.push(t);
    t += rr + jitterMs * rng.normal();
  }
  return out;
}

export interface AtrialBeat {
  readonly t: number;
  readonly site: AtrialSite;
  readonly regular: boolean;
}

/**
 * Ectopic atrial clocks. fixed / tachycardia: one site, regular (PP SD ≈ 1 %); wandering: the pacemaker drifts
 * through the sites (2–4 beats each, back and forth), each site with its own rate (sinus-area sites faster, low sites
 * slower: ± 8 %); multifocal: a random site per beat with an irregular PP (CV ≈ 12 %).
 */
export function atrialSiteClock(mode: 'fixed' | 'wandering' | 'multifocal' | 'tachycardia', sites: readonly AtrialSite[], rateBpm: number, t0: number, t1: number, rng: Rng): AtrialBeat[] {
  const rr = 60000 / rateBpm;
  const out: AtrialBeat[] = [];
  let t = t0 - rng.range(0, rr);
  let si = 0, dwell = rng.int(2, 4), dirn = 1;
  while (t < t1) {
    let site = sites[0];
    let k = 1;
    if (mode === 'wandering') {
      site = sites[si];
      k = 1 + 0.08 * (si / Math.max(1, sites.length - 1)) * 2 - 0.08;
      if (--dwell <= 0) {
        if (si + dirn < 0 || si + dirn >= sites.length) dirn = -dirn;
        si += dirn;
        dwell = rng.int(2, 4);
      }
    } else if (mode === 'multifocal') {
      site = rng.pick(sites);
      k = 1 + 0.12 * rng.normal();
    }
    out.push({ t, site, regular: mode === 'fixed' || mode === 'tachycardia' });
    t += Math.max(250, rr * k + (mode === 'multifocal' ? 0 : 0.01 * rr * rng.normal()));
  }
  return out;
}
