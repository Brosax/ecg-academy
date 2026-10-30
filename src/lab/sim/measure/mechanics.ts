/**
 * Beat-to-beat mechanics read from cycle truth only (pure): which atrial contractions fill the ventricles (kick) and
 * which hit shut AV valves (cannon a wave), and each beat's stroke volume SV(filling time, kick, RR). Shared by the
 * Wiggers panel (src/ecg/wiggers.ts) and the blood-flow layer (src/view3d/core/flowTiming.ts), so both show the same
 * volumes. CycleTruth (frozen) has no volume field: everything here is derived from its valve events, mech spans and
 * QRS onsets, so any consumer holding the same cycles gets the same numbers.
 *
 * Model (docs/research/haemodynamics.md §6) — schematic, calibrated to the textbook beat at 75/min (EDV 120, ESV 50,
 * SV 70 mL, kick 20 %):
 *   filling volume F = passive(T_fill) + kick, passive(T) = V_r·(1 − e^(−T/τ)) + q_d·T: rapid filling saturates within
 *     ≈ 4τ (≈ 360 ms), so SV tracks the preceding RR at short RR and flattens at long RR (AF Doppler data), while slow
 *     diastasis inflow keeps adding at very long RR (the large stroke volume of complete heart block);
 *   T_fill = this beat's mitral closure − the previous beat's mitral opening (≤ 0: the AV valves never opened);
 *   kick = an atrial systole whose peak lands while the mitral valve is open in that window;
 *   contractility C = R(RR₁) / R(RR₂), R(RR) = 1 − k·e^(−(RR − RR₀)/τ_R) (mechanical restitution, Hardman 1998):
 *     a premature beat is weaker, the beat after it (short pre-preceding interval) is potentiated (post-extrasystolic
 *     potentiation), and any steady rhythm has C = 1;
 *   EDV = max(ESV₀ + F, ESV of the previous beat), SV = C·(EDV − ESV₀) within physical bounds, ESV = EDV − SV; a beat
 *     with no filling at all does not eject (truth.ts gives it no semilunar events).
 */
import type { CycleTruth, ValveEvents } from '../types';
import { MECH } from './truth';

export const VOLUME = {
  /** End-systolic volume of the reference beat (mL). */
  esvMl: 50,
  /** Reference beat: 75/min, filling time 373 ms (mitral opening at QRS + 457 ms, next closure at QRS + 830 ms). */
  refFillMs: 373,
  svRefMl: 70,
  /** Atrial kick volume (20 % of the reference stroke volume). */
  kickMl: 14,
  /** Rapid-filling time constant (ms) and slow diastasis inflow (mL/ms). */
  tauFillMs: 90,
  diastasisMlPerMs: 0.02,
  /** Physical bounds: EDV ceiling (compliance), smallest ESV. */
  edvMaxMl: 160,
  esvMinMl: 20,
  /** Mechanical restitution R(RR) = 1 − k·e^(−(RR − RR₀)/τ). */
  restitutionK: 0.5,
  restitutionRr0Ms: 200,
  restitutionTauMs: 150,
} as const;

/** Rapid-filling amplitude V_r chosen so that the reference beat fills exactly SV_ref − kick. */
const RAPID_ML =
  (VOLUME.svRefMl - VOLUME.kickMl - VOLUME.diastasisMlPerMs * VOLUME.refFillMs) / (1 - Math.exp(-VOLUME.refFillMs / VOLUME.tauFillMs));

/** Passive filling volume (mL) over a filling time (ms); 0 when the AV valves never opened. */
export function passiveFillMl(fillMs: number): number {
  if (!(fillMs > 0)) return 0;
  return RAPID_ML * (1 - Math.exp(-fillMs / VOLUME.tauFillMs)) + VOLUME.diastasisMlPerMs * fillMs;
}

/** Mechanical restitution: relative contraction strength after a preceding interval rr (ms). */
export function restitution(rrMs: number): number {
  const x = Math.max(0, rrMs - VOLUME.restitutionRr0Ms);
  return 1 - VOLUME.restitutionK * Math.exp(-x / VOLUME.restitutionTauMs);
}

/** Contractility of a beat: restitution of its preceding interval relative to the one before (1 in any steady rhythm). */
export const contractility = (rr1Ms: number, rr2Ms: number): number => restitution(rr1Ms) / restitution(rr2Ms);

// ---------------------------------------------------------------- atrial contractions

export type AtrialKind = 'kick' | 'cannon';

export interface AtrialEvent {
  readonly t0: number;
  readonly t1: number;
  /** Peak of the contraction (where the Wiggers a wave peaks). */
  readonly peak: number;
  readonly kind: AtrialKind;
}

/** Peak of an atrial systole span (as the Wiggers a wave). */
export const atrialPeak = (s: { readonly t0: number; readonly t1: number }): number => s.t0 + 0.45 * (s.t1 - s.t0);

const mitralOf = (c: CycleTruth): ValveEvents | undefined => c.valves.find((v) => v.id === 'MITRAL');

/** Closed-mitral intervals [closure, opening) of the valved cycles. */
function closedIntervals(cycles: readonly CycleTruth[]): { t0: number; t1: number }[] {
  const out: { t0: number; t1: number }[] = [];
  for (const c of cycles) {
    const m = mitralOf(c);
    if (m) out.push({ t0: m.closeMs, t1: m.openMs });
  }
  return out;
}

/**
 * Every atrial systole of the given cycles (time order), classified against the mitral closures and openings of the
 * same cycles: a kick when its peak lands while the valve is open, a cannon a wave (atria contracting against shut AV
 * valves: AV dissociation, junctional P′, a P buried in a PVC) otherwise. Pass the neighbours of the cycles of
 * interest too: a contraction can overlap the previous beat's relaxation.
 */
export function atrialEvents(cycles: readonly CycleTruth[]): AtrialEvent[] {
  const shut = closedIntervals(cycles);
  const out: AtrialEvent[] = [];
  const seen = new Set<number>();
  for (const c of cycles) {
    for (const m of c.mech) {
      if (m.phase !== 'atrialSystole' || seen.has(m.t0)) continue;
      seen.add(m.t0);
      const peak = atrialPeak(m);
      const cannon = shut.some((s) => peak >= s.t0 && peak < s.t1);
      out.push({ t0: m.t0, t1: m.t1, peak, kind: cannon ? 'cannon' : 'kick' });
    }
  }
  return out.sort((x, y) => x.t0 - y.t0);
}

// ---------------------------------------------------------------- stroke volume

export interface BeatVolume {
  /** The cycle (with valve events) this beat belongs to. */
  readonly cycle: CycleTruth;
  readonly edvMl: number;
  readonly esvMl: number;
  readonly svMl: number;
  /** Volume that entered since the previous beat's mitral opening (passive + kick). */
  readonly fillMl: number;
  /** Mitral opening of the previous beat → this beat's mitral closure (ms); null when the previous beat is unknown. */
  readonly fillMs: number | null;
  readonly kick: boolean;
  /** Semilunar valves open (false: no filling, so no ejection). */
  readonly ejecting: boolean;
  /** RR₁ (preceding) and RR₂ (pre-preceding), ms. */
  readonly rr1Ms: number | null;
  readonly rr2Ms: number | null;
  readonly contractility: number;
}

const valved = (c: CycleTruth): boolean => mitralOf(c) !== undefined && c.qrsOn !== null;

/** Valve-less (dropped) cycles skipped per step when walking back for a beat's history. */
const MAX_DROPPED = 3;
/** Valved predecessors needed for a beat's volume (fill and contractility of the beat and of the one before). */
export const HISTORY_BEATS = 3;

/**
 * The cycles a beat's volume depends on, oldest first, ending with c: HISTORY_BEATS valved predecessors (fewer at the
 * start of the rhythm) and every dropped cycle in between (their atrial contractions can fill the ventricle).
 */
export function historyOf(cycleAt: (tMs: number) => CycleTruth | null, c: CycleTruth): CycleTruth[] {
  const out: CycleTruth[] = [c];
  let beats = 0, dropped = 0, cur = c;
  while (beats < HISTORY_BEATS && dropped <= MAX_DROPPED) {
    const s = cycleStartOf(cur);
    const p = cycleAt(s - 1);
    if (!p || cycleStartOf(p) >= s) break;
    out.unshift(p);
    if (valved(p)) {
      beats++;
      dropped = 0;
    } else dropped++;
    cur = p;
  }
  return out;
}

/** Earliest segment start (sampler.cycleStart, duplicated here to keep src/sim independent of src/ecg). */
function cycleStartOf(c: CycleTruth): number {
  let s = Infinity;
  for (const x of c.segments) s = Math.min(s, x.t0);
  return Number.isFinite(s) ? s : (c.pOn ?? c.qrsOn ?? 0);
}

interface BeatInput {
  readonly cycle: CycleTruth;
  readonly fillMs: number | null;
  readonly kick: boolean;
  readonly rr1: number | null;
  readonly rr2: number | null;
  readonly ejecting: boolean;
}

/** Per valved cycle of `cycles` (time order): filling time, kick, RR₁ and RR₂ from the cycles before it in the list. */
function beatInputs(cycles: readonly CycleTruth[]): BeatInput[] {
  const beats = cycles.filter(valved);
  const kicks = atrialEvents(cycles).filter((a) => a.kind === 'kick');
  return beats.map((c, i) => {
    const prev = beats[i - 1], prev2 = beats[i - 2];
    const mc = mitralOf(c)!.closeMs;
    const mo = prev ? mitralOf(prev)!.openMs : null;
    const fillMs = mo === null ? null : mc - mo;
    const kick = kicks.some((k) => k.peak < mc && (mo === null ? k.peak >= cycleStartOf(c) : k.peak >= mo));
    const rr1 = prev ? c.qrsOn! - prev.qrsOn! : null;
    const rr2 = prev && prev2 ? prev.qrsOn! - prev2.qrsOn! : null;
    return { cycle: c, fillMs, kick, rr1, rr2, ejecting: c.valves.some((v) => v.id === 'AORTIC') };
  });
}

/** Filling volume (mL) of a beat; an unknown filling time counts as the reference beat's. */
export function fillVolumeMl(fillMs: number | null, kick: boolean): number {
  const passive = passiveFillMl(fillMs ?? VOLUME.refFillMs);
  return Math.min(VOLUME.edvMaxMl - VOLUME.esvMl, passive + (kick ? VOLUME.kickMl : 0));
}

function solve(b: BeatInput, esvPrev: number | null): BeatVolume {
  const fillMl = fillVolumeMl(b.fillMs, b.kick);
  const C = b.rr1 !== null && b.rr2 !== null ? contractility(b.rr1, b.rr2) : 1;
  const edv = Math.min(VOLUME.edvMaxMl, Math.max(VOLUME.esvMl + fillMl, esvPrev ?? 0));
  const sv = b.ejecting ? Math.max(0, Math.min(C * (edv - VOLUME.esvMl), edv - VOLUME.esvMinMl)) : 0;
  return {
    cycle: b.cycle, edvMl: edv, esvMl: edv - sv, svMl: sv, fillMl, fillMs: b.fillMs, kick: b.kick, ejecting: b.ejecting,
    rr1Ms: b.rr1, rr2Ms: b.rr2, contractility: C,
  };
}

/**
 * Volumes of the last valved cycle in `history` (oldest first, e.g. historyOf(...)). The previous beat's ESV is its
 * own one-beat estimate (EDV = ESV₀ + F), so a beat's volumes depend only on its HISTORY_BEATS predecessors and are
 * the same whichever neighbourhood a consumer looks at it from.
 */
export function beatVolume(history: readonly CycleTruth[]): BeatVolume | null {
  const ins = beatInputs(history);
  const n = ins.length;
  if (n === 0) return null;
  const prev = n > 1 ? solve(ins[n - 2], null) : null;
  return solve(ins[n - 1], prev ? prev.esvMl : null);
}

/** Volumes of a valved cycle, from its own history via cycleAt (null for a dropped cycle). */
export function volumeOf(cycleAt: (tMs: number) => CycleTruth | null, c: CycleTruth): BeatVolume | null {
  return valved(c) ? beatVolume(historyOf(cycleAt, c)) : null;
}

/**
 * Shares of a filling window's volume: rapid filling, slow diastasis (q_d over its duration) and the atrial kick
 * (its fixed volume), summing to 1. `diastasisMs` = time between the end of rapid filling and the kick (or closure).
 */
export function fillShares(fillMl: number, diastasisMs: number, kick: boolean): { rapid: number; diastasis: number; kick: number } {
  if (!(fillMl > 0)) return { rapid: 1, diastasis: 0, kick: 0 };
  const k = kick ? Math.min(1, VOLUME.kickMl / fillMl) : 0;
  const d = Math.min(1 - k, Math.max(0, (VOLUME.diastasisMlPerMs * diastasisMs) / fillMl));
  return { rapid: 1 - k - d, diastasis: d, kick: k };
}

/** AV-valve windows shorter than this carry no filling (truth.ts MECH.minFillMs). */
export const MIN_FILL_MS = MECH.minFillMs;
