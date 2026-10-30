/**
 * Ectopy insertion patterns (DECISION §6.7): PAC, PJC and PVC as single beats, bigeminy, trigeminy, couplets, runs or
 * random beats, unifocal or multifocal. A plan only decides WHEN an ectopic impulse fires (coupling to its trigger)
 * and from WHICH origin; what it does (resetting the sinus node, finding a refractory node, aberrancy, a compensatory
 * pause) is the scheduler's physiology.
 *
 * Triggers: PVC and PJC couple to the preceding QRS onset (R–R′); PAC couples to the preceding P onset (P–P′).
 * Placement of the one-off patterns, so lessons and drills can rely on them: 'single' after the first trigger at or
 * after 3.8 s of the strip; 'couplet' after the first trigger at or after 2.5 s and then after every 5th trigger; 'run'
 * after the trigger whose strip index (counting triggers from 0 ms) equals `runAfter` (the sinus pause anchor of
 * sinus-node dysfunction), else the first trigger at or after 1.8 s. Repeating patterns (bigeminy, trigeminy, random)
 * run through the pre-roll too, so the strip opens mid-pattern.
 */
import type { Rng } from '../../core/rng';
import type { AtrialSite, EctopySpec, VentOrigin } from '../api';

export interface EctopicFire {
  /** absolute time of the ectopic impulse (P′ onset for PAC; QRS onset for PVC; His activation is derived for PJC) */
  readonly t: number;
  readonly kind: 'pac' | 'pjc' | 'pvc';
  readonly origin: AtrialSite | VentOrigin;
  /** position inside a run / couplet (0 = first) */
  readonly ordinal: number;
}

interface PlanState {
  readonly spec: EctopySpec;
  readonly rng: Rng;
  /** triggers since the last ectopic occurrence */
  since: number;
  occurrences: number;
  fired: number;
  stripIndex: number;
  doneOnce: boolean;
}

export class EctopyPlan {
  private readonly plans: PlanState[];
  private readonly runAfter: number | null;
  constructor(specs: readonly EctopySpec[], rng: Rng, runAfter: number | null = null) {
    this.plans = specs.map((spec, i) => ({ spec, rng: rng.fork(`ectopy:${i}`), since: 0, occurrences: 0, fired: 0, stripIndex: -1, doneOnce: false }));
    this.runAfter = runAfter;
  }

  /** Does any plan couple to this trigger kind ('qrs': PVC / PJC, 'p': PAC)? */
  has(trigger: 'qrs' | 'p'): boolean {
    return this.plans.some((p) => (trigger === 'p') === (p.spec.kind === 'pac'));
  }

  /**
   * A native trigger happened at `t` (QRS onset of a native beat, or P onset of a native atrial event). Returns the
   * ectopic impulses coupled to it (empty for most triggers).
   */
  after(trigger: 'qrs' | 'p', t: number): EctopicFire[] {
    const out: EctopicFire[] = [];
    for (const p of this.plans) {
      if ((trigger === 'p') !== (p.spec.kind === 'pac')) continue;
      if (t >= 0) p.stripIndex++;
      p.since++;
      const n = this.count(p, t);
      for (let k = 0; k < n; k++) {
        const origins = p.spec.origins as readonly (AtrialSite | VentOrigin)[];
        const origin = origins[p.fired % Math.max(1, origins.length)];
        out.push({ t: t + (k + 1) * p.spec.couplingMs, kind: p.spec.kind, origin, ordinal: k });
        p.fired++;
      }
      if (n > 0) {
        p.occurrences++;
        p.since = 0;
      }
    }
    return out;
  }

  /** number of ectopic impulses to couple to this trigger (0 = none) */
  private count(p: PlanState, t: number): number {
    const s = p.spec;
    switch (s.pattern) {
      case 'bigeminy':
        return 1;
      case 'trigeminy':
        return p.since >= 2 ? 1 : 0;
      case 'couplet':
        if (t < 2500) return 0;
        return p.occurrences === 0 || p.since >= 5 ? 2 : 0;
      case 'run': {
        if (p.doneOnce || t < 0) return 0;
        const ok = this.runAfter !== null ? p.stripIndex === this.runAfter : t >= 1800;
        if (!ok) return 0;
        p.doneOnce = true;
        return Math.max(3, s.runLength ?? 5);
      }
      case 'single':
        if (p.doneOnce || t < 3800) return 0;
        p.doneOnce = true;
        return 1;
      case 'random':
        return p.since >= 2 && p.rng.next() < (s.probability ?? 0.15) ? 1 : 0;
    }
  }
}
