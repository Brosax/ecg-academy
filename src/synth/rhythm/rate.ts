/**
 * JT rate law (DECISION §6.4): QT = QRS + JT(RR), JT(RR) = QTc_F·(RR/1000)^⅓ − QRS₀, with RR an exponentially weighted
 * history (weight RR_HISTORY_W on the preceding RR). Every post-J time of a beat is scaled by JT(RR)/JT(1000); times at or before J
 * are not scaled. Premature beats (diastolic interval < 300 ms) add C's APD restitution (`prematureFactor`).
 */

export interface JtLaw {
  /** Fridericia QTc target (ms) */
  readonly qtc: number;
  /** QRS of the pattern before conduction stretch (ms) */
  readonly qrs0: number;
  /** JT at RR = 1000 (ms) */
  readonly jtRef: number;
}

/** JT (ms) at an effective RR. */
export function jtAt(law: JtLaw, rrMs: number): number {
  return Math.max(80, law.qtc * Math.cbrt(Math.max(200, rrMs) / 1000) - law.qrs0);
}

/** Scale factor of the post-J times for an effective RR. */
export function jtScale(law: JtLaw, rrMs: number): number {
  return jtAt(law, rrMs) / law.jtRef;
}

/**
 * Weight of the preceding RR in the effective RR. DECISION §6.4 proposed 0.6; the port uses 0.2 because QT adapts to
 * RR slowly (QT/RR hysteresis over minutes with a small immediate component: Lau CP et al., Cardiovasc Res 1988;
 * Pueyo E et al., Ann Biomed Eng 2003): with 0.6, atrial fibrillation swung the QT by ±70 ms from beat to beat.
 * The immediate component of premature beats is restitution (prematureFactor, synth-rhythm).
 */
export const RR_HISTORY_W = 0.2;

/** Effective RR: exponentially weighted history with weight RR_HISTORY_W on the preceding RR. */
export function nextEffectiveRr(prevEff: number, rrPrev: number): number {
  return RR_HISTORY_W * rrPrev + (1 - RR_HISTORY_W) * prevEff;
}

/** Map a time relative to J through the rate scaling (times ≤ 0 unchanged). */
export function scaleAfterJ(t: number, s: number): number {
  return t <= 0 ? t : t * s;
}

/**
 * APD restitution of a premature beat (prototype C; DECISION §6.4): APD = APDmax·(1 − A·exp(−DI/τ)), so a beat that
 * follows the previous T end by a diastolic interval DI shorter than the rhythm's steady one repolarises earlier.
 * Returned as the factor on the JT of the beat relative to a steady beat of the same rhythm (the rate law already
 * holds the steady state, so a sustained tachycardia is not shortened twice); 1 when DI is not shorter.
 */
export const RESTITUTION = { a: 0.3, tauMs: 90 } as const;
export function prematureFactor(diastolicIntervalMs: number, steadyDiMs = 400): number {
  const steady = Math.max(0, steadyDiMs);
  if (diastolicIntervalMs >= steady - 20 || diastolicIntervalMs >= 300) return 1;
  const r = RESTITUTION;
  const f = (di: number): number => 1 - r.a * Math.exp(-Math.max(0, di) / r.tauMs);
  return f(diastolicIntervalMs) / f(Math.min(300, steady));
}

/** The effective RR (ms) whose JT is `jtMs` (inverse of jtAt; used to apply restitution through the same law). */
export function rrForJt(law: JtLaw, jtMs: number): number {
  return 1000 * ((Math.max(80, jtMs) + law.qrs0) / law.qtc) ** 3;
}
