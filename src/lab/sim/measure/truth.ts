/**
 * Builds model-truth cycle descriptions (electrical segments, mechanical phases, valve events) from beat events and
 * template truths. Shared by the stub and the real engine so the UI timeline never hard-codes timings.
 *
 * Mechanics (docs/research/activation-physiology.md §5, haemodynamics.md §6): mechanical activation ≈ 1.06·tAct +
 * 8.4 ms; atrial contraction starts 40–60 ms after P onset; IVCT ≈ 35 ms; aortic closure ≈ end of T; IVRT ≈ 93 ms —
 * all at 75/min. Ejection and relaxation scale with the beat's preceding RR (ventricularTimes): aortic closure is capped
 * by Weissler's QS2 = 546 − 2.1·HR, so at fast rates (and after a short RR: AF, PVC) ejection ends before the T wave
 * does and a filling window survives, and IVRT shortens weakly (−2 % per 10/min). IVCT stays 35 ms: the pre-ejection
 * period hardly changes with rate (Weissler −0.4 ms/min; no significant change with atropine, Kelman 1981). At RR
 * 800 ms every value equals the constant above. A beat whose QRS comes before the previous beat's mitral opening gets no filling:
 * it does not eject (no semilunar events; its contraction stays isovolumic), the extreme of the AF pulse deficit.
 */
import type { BeatEvent, BeatTemplate, CycleTruth, MechSpan, SegmentSpan, ValveEvents } from '../types';

export interface CycleInput {
  readonly a: Extract<BeatEvent, { kind: 'A' }> | null;
  readonly aTpl: BeatTemplate | null;
  readonly v: Extract<BeatEvent, { kind: 'V' }> | null;
  readonly vTpl: BeatTemplate | null;
  /** Start of the next cycle (its P onset, or the QRS onset of a ventricular-only cycle): closes TP. Null if unknown. */
  readonly nextStartMs: number | null;
  /** Mitral closure of the next ventricular beat: filling runs up to it. Null if unknown (rrMs fallback). */
  readonly nextMvCloseMs?: number | null;
  /** Onset of the next cycle's own atrial systole when it falls in this beat's diastole (A-anchored: the next P's kick). */
  readonly nextAtrialStartMs?: number | null;
  /**
   * Mitral opening of the previous ventricular beat. At or after this beat's mitral closure (− MECH.minFillMs) the AV
   * valves never opened in between: no filling, and the beat does not eject.
   */
  readonly prevMvOpenMs?: number | null;
  /**
   * Atrial activations of a dissociated rhythm that fall in this cycle (CHB, VT, junctional P′, flutter waves): P onset
   * and the preceding atrial cycle. Mechanical only — they add atrial-systole spans, never P segments or pOn.
   */
  readonly atrial?: readonly { readonly pOnMs: number; readonly aaMs: number }[];
  /** Fallback cycle length (ms) when the next beat is unknown. */
  readonly rrMs: number;
}

export const MECH = {
  atrialEmdMs: 50,
  atrialSystoleMs: 110,
  /** Atrial systole lasts at most this fraction of the atrial cycle (flutter waves come every ≈ 200 ms). */
  atrialSystoleMaxFrac: 0.55,
  /** QRS onset → mitral/tricuspid closure (first mechanical activation). */
  ventricularEmdMs: 30,
  ivctMs: 35,
  /** Aortic closure relative to T end. */
  aorticCloseAfterTEndMs: 10,
  ivrtMs: 93,
  rightLagMs: 8,
  /** AV-valve windows shorter than this carry no filling (shared with the flow layer). */
  minFillMs: 2,
  /** Heart rate at which the constants above hold (RR 800 ms). */
  refBpm: 75,
} as const;

/**
 * Rate laws of the mechanical intervals, HR = 60000 / RR_prev of the beat (haemodynamics.md §6). Weissler 1968 (men):
 * QS2 = 546 − 2.1·HR (ms); IVRT −2 % per 10/min (Weiss 1976: the relaxation time constant is nearly rate-independent;
 * Cieslinski 1984: IVCT / IVRT do not explain the RR dependence of filling in AF).
 */
export const RATE = {
  qs2Ms: 546,
  qs2PerBpm: 2.1,
  ivrtFracPer10Bpm: 0.02,
  ivrtMinMs: 55,
  ivrtMaxMs: 115,
  minEjectionMs: 80,
  minBpm: 25,
  maxBpm: 220,
} as const;

export interface VentricularTimes {
  readonly mvClose: number;
  readonly avOpen: number;
  readonly avClose: number;
  readonly mvOpen: number;
}

/** Valve times of one ventricular beat from its QRS onset, T end and preceding RR (absolute ms). */
export function ventricularTimes(qrsOn: number, tEnd: number, rrPrevMs: number): VentricularTimes {
  const hr = Math.min(RATE.maxBpm, Math.max(RATE.minBpm, 60000 / Math.max(1, rrPrevMs)));
  const dHr = hr - MECH.refBpm;
  const mvClose = qrsOn + MECH.ventricularEmdMs;
  const avOpen = mvClose + MECH.ivctMs;
  const qs2 = RATE.qs2Ms - RATE.qs2PerBpm * hr;
  const avClose = Math.max(avOpen + RATE.minEjectionMs, Math.min(tEnd + MECH.aorticCloseAfterTEndMs, qrsOn + qs2));
  const ivrt = Math.min(RATE.ivrtMaxMs, Math.max(RATE.ivrtMinMs, MECH.ivrtMs * (1 - (RATE.ivrtFracPer10Bpm * dHr) / 10)));
  return { mvClose, avOpen, avClose, mvOpen: avClose + ivrt };
}

/** Atrial systole span after a P onset; atrial cycle `aaMs` limits its length (flutter). */
export function atrialSystoleOf(pOnMs: number, aaMs: number): { t0: number; t1: number } {
  const t0 = pOnMs + MECH.atrialEmdMs;
  return { t0, t1: t0 + Math.min(MECH.atrialSystoleMs, MECH.atrialSystoleMaxFrac * aaMs) };
}

export function buildCycleTruth(c: CycleInput): CycleTruth {
  const pOn = c.a && c.aTpl ? c.a.tMs + c.aTpl.truth.onMs : null;
  const pOff = c.a && c.aTpl ? c.a.tMs + c.aTpl.truth.offMs : null;
  const qrsOn = c.v && c.vTpl ? c.v.tMs + c.vTpl.truth.onMs : null;
  const qrsOff = c.v && c.vTpl ? c.v.tMs + c.vTpl.truth.offMs : null;
  const tOn = c.v && c.vTpl ? c.v.tMs + c.vTpl.truth.repolOnMs : null;
  const tEnd = c.v && c.vTpl ? c.v.tMs + c.vTpl.truth.repolEndMs : null;

  const segments: SegmentSpan[] = [];
  if (pOn !== null && pOff !== null) segments.push({ seg: 'P', t0: pOn, t1: pOff });
  if (pOff !== null && qrsOn !== null && qrsOn > pOff) segments.push({ seg: 'PR', t0: pOff, t1: qrsOn });
  if (qrsOn !== null && qrsOff !== null) segments.push({ seg: 'QRS', t0: qrsOn, t1: qrsOff });
  if (qrsOff !== null && tOn !== null && tOn > qrsOff) segments.push({ seg: 'ST', t0: qrsOff, t1: tOn });
  if (tOn !== null && tEnd !== null) segments.push({ seg: 'T', t0: Math.max(tOn, qrsOff ?? tOn), t1: tEnd });
  if (tEnd !== null && c.nextStartMs !== null && c.nextStartMs > tEnd) segments.push({ seg: 'TP', t0: tEnd, t1: c.nextStartMs });

  const mech: MechSpan[] = [];
  const valves: ValveEvents[] = [];
  const atrialSpans: { t0: number; t1: number }[] = [];
  if (pOn !== null && c.a) atrialSpans.push(atrialSystoleOf(pOn, c.a.rrPrevMs));
  for (const x of c.atrial ?? []) atrialSpans.push(atrialSystoleOf(x.pOnMs, x.aaMs));
  for (const s of atrialSpans) mech.push({ phase: 'atrialSystole', t0: s.t0, t1: s.t1 });
  if (qrsOn !== null && tEnd !== null && c.v) {
    const { mvClose, avOpen, avClose, mvOpen } = ventricularTimes(qrsOn, tEnd, c.v.rrPrevMs);
    const ejects = c.prevMvOpenMs == null || mvClose - c.prevMvOpenMs >= MECH.minFillMs;
    const L = MECH.rightLagMs;
    if (ejects) {
      mech.push({ phase: 'isovolumicContraction', t0: mvClose, t1: avOpen });
      mech.push({ phase: 'ejection', t0: avOpen, t1: avClose });
      mech.push({ phase: 'isovolumicRelaxation', t0: avClose, t1: mvOpen });
    } else {
      // nothing entered the ventricle since the last beat: LV pressure never reaches the aortic level, so the
      // contraction and relaxation are isovolumic throughout (peak pressure ≈ the first third of the would-be ejection)
      const peak = avOpen + 0.35 * (avClose - avOpen);
      mech.push({ phase: 'isovolumicContraction', t0: mvClose, t1: peak });
      mech.push({ phase: 'isovolumicRelaxation', t0: peak, t1: mvOpen });
    }
    // diastole: filling up to the next beat's atrial systole (A-anchored) or mitral closure, around this cycle's own
    // atrial systoles that land in it (dissociated rhythms)
    const fallback = mvOpen + Math.max(100, c.rrMs - (mvOpen - qrsOn));
    let fillEnd = c.nextMvCloseMs ?? fallback;
    if (c.nextAtrialStartMs != null && c.nextAtrialStartMs > mvOpen) fillEnd = Math.min(fillEnd, c.nextAtrialStartMs);
    let f0 = mvOpen;
    for (const s of [...atrialSpans].sort((x, y) => x.t0 - y.t0)) {
      if (s.t1 <= f0 || s.t0 >= fillEnd) continue;
      if (s.t0 > f0) mech.push({ phase: 'filling', t0: f0, t1: s.t0 });
      f0 = Math.max(f0, s.t1);
    }
    if (fillEnd > f0) mech.push({ phase: 'filling', t0: f0, t1: fillEnd });
    valves.push({ id: 'MITRAL', openMs: mvOpen, closeMs: mvClose });
    valves.push({ id: 'TRICUSPID', openMs: mvOpen - L, closeMs: mvClose + L });
    if (ejects) {
      valves.push({ id: 'AORTIC', openMs: avOpen, closeMs: avClose });
      valves.push({ id: 'PULMONARY', openMs: avOpen - L, closeMs: avClose + L });
    }
  }
  mech.sort((x, y) => x.t0 - y.t0);
  return { aId: c.a?.id ?? null, vId: c.v?.id ?? null, segments, mech, valves, pOn, pOff, qrsOn, qrsOff, tEnd };
}

/** Is a valve open at time t for a given cycle? (Semilunar: open between openMs and closeMs; AV valves: open outside [close, open].) */
export function valveOpenAt(v: ValveEvents, tMs: number): boolean {
  if (v.id === 'AORTIC' || v.id === 'PULMONARY') return tMs >= v.openMs && tMs < v.closeMs;
  return !(tMs >= v.closeMs && tMs < v.openMs);
}
