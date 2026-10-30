/**
 * AV junction (DECISION §2.2.2, §6.7; prototype C's rules re-implemented as arithmetic).
 *
 * AV node. An impulse reaches the node at its entry time (atrial event + intra-atrial time). Its recovery time R is the
 * time since the node's last EXIT (the His activation of the last conducted impulse: H1–A2, the abscissa of the AV
 * nodal recovery curve; Billette J, Circ Res 1987). It conducts when R ≥ R_min = ERP − ahMin, so the clinical AV-nodal
 * ERP (the longest A1–A2 that blocks) equals `erpMs` when the previous impulse crossed with the minimum AH, and the
 * functional refractoriness lengthens after a slowly conducted one. The nodal delay is decremental:
 *   AH = ahMin + ahExt·exp(−(R − R_min)/τ).
 * With ahExt/τ < 1 the PR increments of a Wenckebach period shrink beat by beat (largest increment on the second
 * conducted beat) until R falls under R_min and a P is blocked (criteria.md `wenckebach-arithmetic`); the post-pause PR
 * is the shortest. A blocked impulse may conceal (penetrate without exiting), which prolongs the refractoriness: with a
 * jittered ERP this turns the AF bombardment into an irregularly irregular response; flutter gets an exact N:1.
 * PR = intraAtrial + AH + HV.
 *
 * Below the node: His–Purkinje all-or-none block (Mobitz II with a ratio or a probability, fixed N:1, complete), bundle
 * refractoriness with the Ashman rule (a branch whose ERP, lengthened by the preceding long cycle, exceeds the coupling
 * blocks → aberrant beat), the accessory pathway (antegrade arrival and ERP → pre-excitation; retrograde limb for
 * AVRT), retrograde VA conduction through the node, and the escape timer (junctional or ventricular, reset by every
 * ventricular activation).
 */
import { createRng, type Rng } from '../../core/rng';
import type { JunctionSpec } from '../api';

export const DEFAULT_JUNCTION: JunctionSpec = {
  intraAtrialMs: 35,
  avn: { ahMinMs: 80, ahExtMs: 60, tauMs: 70, erpMs: 280, jitter: 0, conceal: 0 },
  hvMs: 45,
};

export function resolveJunction(p: Partial<JunctionSpec> | undefined): JunctionSpec {
  const j: JunctionSpec = { ...DEFAULT_JUNCTION, ...p, avn: { ...DEFAULT_JUNCTION.avn, ...(p?.avn ?? {}) } };
  if (j.avn.ahMinMs < 20 || j.avn.ahMinMs > 400) throw new Error('src/synth: junction.avn.ahMinMs outside 20–400 ms');
  if (j.avn.erpMs <= j.avn.ahMinMs) throw new Error('src/synth: junction.avn.erpMs must exceed ahMinMs (R_min = ERP − ahMin > 0)');
  if (j.hvMs < 25 || j.hvMs > 120) throw new Error('src/synth: junction.hvMs outside 25–120 ms');
  const ih = j.infraHis;
  if (ih && ih.pattern !== 'complete' && ih.ratio !== undefined && (ih.ratio < 2 || !Number.isInteger(ih.ratio))) {
    throw new Error('src/synth: junction.infraHis.ratio must be an integer ≥ 2');
  }
  return j;
}

/** Recovery threshold (ms after the node's last exit): R_min = ERP − ahMin. */
export function recoveryMin(j: JunctionSpec): number {
  return j.avn.erpMs - j.avn.ahMinMs;
}

/** AH (ms) for a recovery time R (ms since the node's last exit). */
export function ahAt(j: JunctionSpec, recoveryMs: number): number {
  const a = j.avn;
  return a.ahMinMs + a.ahExtMs * Math.exp(-Math.max(0, recoveryMs - recoveryMin(j)) / Math.max(1, a.tauMs));
}

/** PR (ms) for a recovery time R: intra-atrial + AH + HV. */
export function prAt(j: JunctionSpec, recoveryMs: number): number {
  return j.intraAtrialMs + ahAt(j, recoveryMs) + j.hvMs;
}

/** Steady-state 1:1 AH (ms) at an atrial cycle (fixed point of AH = f(cycle − AH)), or null when 1:1 is impossible. */
export function steadyAh(j: JunctionSpec, cycleMs: number): number | null {
  let ah = j.avn.ahMinMs;
  for (let i = 0; i < 400; i++) {
    const r = cycleMs - ah;
    if (r < recoveryMin(j)) return null;
    const nx = ahAt(j, r);
    if (Math.abs(nx - ah) < 1e-6) return nx;
    ah = nx;
  }
  return cycleMs - ah >= recoveryMin(j) ? ah : null;
}

/**
 * ahMin that realises a PR at an atrial cycle in steady 1:1 conduction (the `pr` dial: analytic, exact per steady beat).
 * The second argument is the atrial cycle (ms); the recovery is the cycle minus the AH itself, and R_min depends on
 * ahMin, so the root is found by bisection (monotone in ahMin for ahExt/τ < 1, bracketed otherwise).
 */
export function solveAhMin(j: JunctionSpec, prMs: number, cycleMs: number): number {
  const ah = prMs - j.intraAtrialMs - j.hvMs;
  const a = j.avn;
  const h = (u: number): number => u + a.ahExtMs * Math.exp(-Math.max(0, cycleMs - ah - a.erpMs + u) / Math.max(1, a.tauMs)) - ah;
  let lo = ah - a.ahExtMs - 1, hi = ah;
  if (h(lo) > 0) return lo;
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    if (h(mid) > 0) hi = mid;
    else lo = mid;
  }
  return 0.5 * (lo + hi);
}

/**
 * AV-node ERP (the clinical A1–A2 value, `avn.erpMs`) that gives an N:1 response to a regular atrial cycle (flutter,
 * atrial tachycardia): the recovery after a conducted impulse must stay under R_min for N − 1 cycles and exceed it at
 * the N-th. Placed 0.2 cycle inside the window (the conductionRatio dial; dials/solve.ts should call this helper).
 */
export function erpForRatio(j: JunctionSpec, cycleMs: number, n: number): number {
  // after an N:1 period the recovery is N·c − AH, with AH ≈ ahAt(N·c − AH) (iterate twice: AH barely depends on it)
  let ah = j.avn.ahMinMs;
  for (let i = 0; i < 4; i++) ah = ahAt({ ...j, avn: { ...j.avn, erpMs: (n - 0.2) * cycleMs - ah + j.avn.ahMinMs } }, n * cycleMs - ah);
  return (n - 0.2) * cycleMs - (ah - j.avn.ahMinMs);
}

export interface NodeDecision {
  /** the impulse exits the node (it may still block below the His) */
  readonly conducted: boolean;
  /** His activation time (absolute ms) when conducted */
  readonly hisAt: number;
  /** AV-node entry time */
  readonly nodeIn: number;
  /** recovery time R of this impulse (ms since the last exit) */
  readonly recoveryMs: number;
}

/**
 * Retrograde conduction through the node is slower than antegrade (His–atrial times of 100–180 ms with retrograde VA
 * conduction vs an AH of 60–120 ms; Josephson, Clinical Cardiac Electrophysiology): the retrograde nodal time is the
 * antegrade AH law plus this. A junctional premature beat (His focus) then inscribes its retrograde P′ just after its
 * narrow QRS (H → QRS onset 45 ms, H → P′ ≈ 150 ms), as usually recorded.
 */
export const RETRO_EXTRA_MS = 60;

/** Stateful AV-node gate fed with impulses in time order (antegrade and retrograde). */
export class AvNode {
  /** exit (His) time of the last impulse that crossed the node in either direction */
  private lastExit = -Infinity;
  /** absolute time before which the node does not conduct (recovery threshold of the last exit, jittered) */
  private refractoryUntil = -Infinity;
  private readonly j: JunctionSpec;
  private readonly rng: Rng;
  constructor(j: JunctionSpec, rng: Rng) {
    this.j = j;
    this.rng = rng;
  }

  private erpDraw(): number {
    const a = this.j.avn;
    return a.erpMs * (1 + a.jitter * Math.max(-2.5, Math.min(2.5, this.rng.normal())));
  }

  /** Can an impulse that reaches the node at `t` cross it (no state change)? */
  canConduct(t: number): boolean {
    return !this.j.completeNodal && t >= this.refractoryUntil;
  }

  /** Offer an antegrade impulse that reaches the node at `t` (absolute ms). */
  offer(t: number): NodeDecision {
    const R = t - this.lastExit;
    if (this.canConduct(t)) {
      const ah = ahAt(this.j, R);
      this.lastExit = t + ah;
      this.refractoryUntil = this.lastExit + Math.max(100, this.erpDraw() - this.j.avn.ahMinMs);
      return { conducted: true, hisAt: t + ah, nodeIn: t, recoveryMs: R };
    }
    const a = this.j.avn;
    if (!this.j.completeNodal && a.conceal > 0 && this.rng.next() < a.conceal) {
      // concealed conduction: the blocked impulse penetrates and renews part of the refractory period
      this.refractoryUntil = Math.max(this.refractoryUntil, t + 0.45 * a.erpMs);
    }
    return { conducted: false, hisAt: NaN, nodeIn: t, recoveryMs: R };
  }

  /**
   * A ventricular (or junctional) activation reaches the node retrogradely at `t` (lower end). Returns the time the
   * impulse exits into the atria when it crosses (retrograde VA conduction), else null (concealed: it still renews the
   * node's refractoriness, so the next sinus P may conduct with a longer PR or block — the compensatory pause).
   */
  retrograde(t: number, conductToAtria: boolean, depth = 1): number | null {
    if (this.j.completeNodal) return null;
    const crosses = conductToAtria && t >= this.refractoryUntil;
    const vaAh = crosses ? ahAt(this.j, t - this.lastExit) + RETRO_EXTRA_MS : 0;
    // depth < 1: partial penetration (a ventricular impulse blocked low in the node renews only part of its
    // refractoriness, so sinus impulses can still capture during a slow VT or after a late PVC)
    const d = crosses ? 1 : Math.max(0, Math.min(1, depth));
    const exit = t + (crosses ? vaAh : 0.5 * d * this.j.avn.ahMinMs);
    this.lastExit = Math.max(this.lastExit, exit);
    this.refractoryUntil = Math.max(this.refractoryUntil, exit + d * Math.max(100, this.j.avn.erpMs - this.j.avn.ahMinMs));
    return crosses ? t + vaAh : null;
  }
}

/** His–Purkinje all-or-none conduction below the node (Mobitz II, fixed N:1, complete). */
export class HisPurkinje {
  private count = 0;
  private readonly j: JunctionSpec;
  private readonly rng: Rng;
  constructor(j: JunctionSpec, rng: Rng) {
    this.j = j;
    this.rng = rng;
  }

  /** Does the impulse that activated the His conduct to the ventricles? */
  conducts(): boolean {
    const ih = this.j.infraHis;
    if (!ih) return true;
    this.count++;
    switch (ih.pattern) {
      case 'complete':
        return false;
      case 'fixed-ratio':
        // N:1 — one of every N His activations conducts
        return (this.count - 1) % (ih.ratio ?? 2) === 0;
      case 'mobitz2':
        // N:(N − 1) — every N-th blocks; or a random block with a probability
        if (ih.ratio !== undefined) return this.count % ih.ratio !== 0;
        return this.rng.next() >= (ih.probability ?? 0.25);
    }
  }
}

/** Bundle-branch ERP (ms) after a preceding cycle (Ashman: ERP = base + slope·(RRprev − 1000)). */
export function bundleErp(base: number, slope: number, rrPrevMs: number): number {
  return Math.max(150, base + slope * (rrPrevMs - 1000));
}

/** Which bundle branch blocks functionally for a beat (aberrancy), from its coupling and the preceding cycle. */
export function aberrancy(j: JunctionSpec, couplingMs: number, rrPrevMs: number): { rbb: boolean; lbb: boolean } {
  const b = j.bundleErp;
  if (!b) return { rbb: false, lbb: false };
  return { rbb: couplingMs < bundleErp(b.rbbMs, b.slope, rrPrevMs), lbb: couplingMs < bundleErp(b.lbbMs, b.slope, rrPrevMs) };
}

/**
 * Accessory pathway: all-or-none conduction with its own ERP (antegrade and retrograde share the refractoriness).
 * Under bombardment (AF) the refractoriness is not a constant: it follows the irregular preceding cycles (SD
 * PATHWAY_ERP_JITTER of the ERP), and a wavelet that reaches the pathway while it is refractory may penetrate it
 * without crossing (probability PATHWAY_CONCEAL), renewing part of its refractoriness — the pathway analogue of the
 * AV node's concealed conduction. Together they make pre-excited AF irregular and let the AV node win some cycles
 * (narrow and fused beats among the pre-excited ones). Without an rng the pathway is deterministic.
 */
export const PATHWAY_ERP_JITTER = 0.08;
export const PATHWAY_CONCEAL = 0.3;
export class Pathway {
  private last = -Infinity;
  private refUntil = -Infinity;
  readonly spec: NonNullable<JunctionSpec['pathway']>;
  private readonly rng: Rng | null;
  constructor(spec: NonNullable<JunctionSpec['pathway']>, rng: Rng | null = null) {
    this.spec = spec;
    this.rng = rng;
  }
  /** an impulse at the pathway's atrial (antegrade) or ventricular (retrograde) end at `t` */
  offer(t: number, dir: 'antegrade' | 'retrograde'): boolean {
    if (dir === 'antegrade' && !this.spec.antegrade) return false;
    if (dir === 'retrograde' && !this.spec.retrograde) return false;
    if (t < this.refUntil) {
      if (this.rng && t >= this.last + 0.5 * this.spec.erpMs && this.rng.next() < PATHWAY_CONCEAL) {
        this.refUntil = Math.max(this.refUntil, t + 0.4 * this.spec.erpMs);
      }
      return false;
    }
    this.last = t;
    const k = this.rng ? 1 + PATHWAY_ERP_JITTER * Math.max(-2.5, Math.min(2.5, this.rng.normal())) : 1;
    this.refUntil = t + this.spec.erpMs * k;
    return true;
  }
}

/** Escape interval (ms) of the junction's escape pacemaker, or null. */
export function escapeIntervalMs(j: JunctionSpec): number | null {
  return j.escape ? 60000 / j.escape.rateBpm : null;
}

/**
 * Typical Wenckebach solve (the conductionRatio dial of Mobitz I): the ERP in the middle of the range for which a
 * regular atrial cycle conducts N − 1 impulses and blocks the N-th (simulated from a post-pause start), so small
 * P–P variations keep the period. Returns null when no ERP in the search range gives exactly N:(N − 1).
 */
export function solveWenckebach(j: JunctionSpec, cycleMs: number, n: number): number | null {
  const ratioAt = (erp: number): number | null => {
    const jj: JunctionSpec = { ...j, avn: { ...j.avn, erpMs: erp, jitter: 0, conceal: 0 } };
    const node = new AvNode(jj, createRng(1));
    const seq: boolean[] = [];
    for (let k = 0; k < 12 * n; k++) seq.push(node.offer(k * cycleMs).conducted);
    // the run lengths of conducted impulses between blocks must all be n − 1
    const blocks = seq.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
    if (blocks.length < 4) return null;
    const runs = blocks.slice(1).map((b, i) => b - blocks[i] - 1);
    return runs.every((r) => r === runs[0]) ? runs[0] + 1 : null;
  };
  let lo: number | null = null, hi: number | null = null;
  for (let erp = j.avn.ahMinMs + 40; erp < 2 * cycleMs; erp += 1) {
    if (ratioAt(erp) === n) {
      lo ??= erp;
      hi = erp;
    } else if (lo !== null) break;
  }
  return lo !== null && hi !== null ? Math.round((lo + hi) / 2) : null;
}
