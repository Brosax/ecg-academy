/**
 * The oracle tiers as functions (DECISION §8.2), shared by the per-tier test files and the dial sweeps (T5):
 *  - t1Max: the largest Einthoven / Goldberger residual of the delivered leads (T1 gate 1e-6 mV);
 *  - t2Violations: truth vs the oracle's re-measurement of the clean signal (T2 gates; the techniques per declared
 *    rhythm are documented in tests/synth/truth/truth-vs-oracle.test.ts);
 *  - t3Failures: the scenario's hallmark criteria (+ variant additions) and the generic sanity set minus opt-outs.
 */
import type { LeadSignals } from '../../../src/core/ecg';
import { STD_LEADS } from '../../../src/core/leads';
import type { ScenarioDef, SynthResult } from '../../../src/synth';
import { CRITERIA, GENERIC, GENERIC_IDS, VARIANT_CRITERIA, type CriterionCtx } from './criteria';
import { atrialActivity, cancelFlutter, fSubtractedQrs, measure, residualPWaves, tqReferenced, type Measurement } from './measure';

export const GATES = { hr: 2, pr: 10, qrs: 8, qt: 15, axis: 5, pAxis: 10, tAxis: 10, qrsOn: 8, qrsOnShare: 0.95, st: 0.03 } as const;
/** beats are compared inside this window of QRS onsets (ms from the strip start / before its end) */
const EDGE = { lead: 100, tail: 250 } as const;

const angle = (a: number, b: number): number => {
  let d = (a - b) % 360;
  if (d <= -180) d += 360;
  if (d > 180) d -= 360;
  return Math.abs(d);
};

/** Every violation of one generated ECG, as readable strings (empty = agrees). */
export function t2Violations(r: SynthResult, declared: readonly string[], intervalsApplicable: boolean): string[] {
  const out: string[] = [];
  const t = r.ecg.truth!;
  const fs = r.ecg.signal.fs;
  const L = r.ecg.signal.leads as LeadSignals;
  const dur = r.ecg.signal.durationMs;
  const m: Measurement = measure(L, fs);
  const ms = (i: number): number => (i * 1000) / fs;
  const chk = (name: string, truth: number | null, oracle: number | null | undefined, gate: number, isAngle = false): void => {
    if (truth === null) return;
    if (oracle === null || oracle === undefined || !Number.isFinite(oracle)) {
      out.push(`${name}: truth ${truth.toFixed(1)} not measurable by the oracle`);
      return;
    }
    const d = isAngle ? angle(oracle, truth) : Math.abs(oracle - truth);
    if (d > gate) out.push(`${name}: truth ${truth.toFixed(1)} oracle ${oracle.toFixed(1)} (|Δ| ${d.toFixed(1)} > ${gate})`);
  };
  const flutter = declared.includes('atrial-flutter');
  const fibrillation = declared.includes('atrial-fibrillation');
  const dissociated = declared.includes('av-dissociation');
  if (!intervalsApplicable) return out;
  chk('HR', t.hrBpm, m.hrBpm, GATES.hr);
  // ── intervals ────────────────────────────────────────────────────────────────────────────────────────────────
  let qrs: number = m.qrsMs, axis: number = m.axisDeg;
  let atrialCycle: number | null = null;
  let fsub: ReturnType<typeof fSubtractedQrs> = null;
  if (flutter) {
    const a = atrialActivity(L, m, 'II', -1);
    atrialCycle = a.cycleMs ?? a.zcCycleMs;
    fsub = atrialCycle !== null ? fSubtractedQrs(L, m, atrialCycle) : null;
    if (fsub) {
      qrs = fsub.qrsMs;
      axis = fsub.axisDeg;
      atrialCycle = fsub.cycleMs;
    }
  }
  // flutter: the F-cancelled signal (cancelFlutter) when the cycle is stable, else the F-subtracted QRS
  const fc = flutter && atrialCycle !== null ? cancelFlutter(L, m, atrialCycle) : null;
  const fm = fc ? measure(fc.leads, fs) : null;
  if (fm) {
    qrs = fm.qrsMs;
    axis = fm.axisDeg;
  }
  chk('PR', t.prMs, m.prMs, GATES.pr);
  chk('QRS', t.qrsMs, qrs, GATES.qrs);
  chk('QRS axis', t.axisDeg.qrs, axis, GATES.axis, true);
  if (!flutter && !fibrillation) chk('P axis', t.axisDeg.p, m.pAxisDeg, GATES.pAxis, true);
  // fibrillation: the T axis from TQ-referenced per-beat T areas (the truth sums per-beat areas the same way);
  // flutter: on the F-cancelled signal
  const tqT = fibrillation ? tqReferenced(L, m, 0) : null;
  // atrial waves (other than F / f) on most T waves: the vent-only T axis is not measurable from the surface
  const onT = t.beats.filter((b, i) => i > 0 && t.atrial.some((a) => a.kind !== 'fibrillation' && a.kind !== 'flutter' && a.t < b.tOff && a.t + 100 > b.j)).length;
  if (onT <= t.beats.length / 2) chk('T axis', t.axisDeg.t, tqT ? tqT.tAxisDeg : fm ? fm.tAxisDeg : m.tAxisDeg, GATES.tAxis, true);
  if (onT <= t.beats.length / 2) chk('QT', t.qtMs, fm ? fm.qtMs : m.qtMs, GATES.qt);
  if (flutter && t.atrialRateBpm !== null) chk('atrial rate', t.atrialRateBpm, fc ? 60000 / fc.cycleMs : atrialCycle !== null ? 60000 / atrialCycle : null, 0.02 * t.atrialRateBpm);
  // ── beats ────────────────────────────────────────────────────────────────────────────────────────────────────
  // beat count: every truth beat in the window has an oracle beat within 40 ms, and no oracle beat inside the window
  // (shrunk by 40 ms) lacks a truth beat — exact, and insensitive to the side of a window edge a beat falls on
  const inWin = (on: number, pad = 0): boolean => on >= EDGE.lead + pad && on <= dur - EDGE.tail - pad;
  const near = (a: number, b: number): boolean => Math.abs(a - b) <= 40;
  const tb = t.beats.map((b, i) => ({ b, i })).filter((x) => inWin(x.b.qrsOn));
  const missed = tb.filter((x) => !m.beats.some((o) => near(ms(o.qrsOn), x.b.qrsOn))).length;
  const extra = m.beats.filter((o) => inWin(ms(o.qrsOn), 40) && !t.beats.some((b) => near(ms(o.qrsOn), b.qrsOn))).length;
  if (missed || extra) out.push(`beat count: ${missed} truth beat(s) missed, ${extra} extra oracle beat(s)`);
  let good = 0, judged = 0;
  const matched: { ti: number; o: Measurement['beats'][number] }[] = [];
  for (const x of tb) {
    const o = m.beats.reduce<Measurement['beats'][number] | null>((best, y) => (!best || Math.abs(ms(y.qrsOn) - x.b.qrsOn) < Math.abs(ms(best.qrsOn) - x.b.qrsOn) ? y : best), null);
    if (!o || !near(ms(o.qrsOn), x.b.qrsOn)) continue;
    matched.push({ ti: x.i, o });
    // the onset of a complex is not delineable to ± 8 ms where it is superimposed on something else: a QRS inside
    // the previous T (R on T, a stimulus during the T), a dissociated P whose (nominal 105 ms) extent reaches the
    // QRS onset (from 30 ms before it to 10 ms after), or a fusion beat (its first, small front is the onset)
    const prevB = t.beats[x.i - 1];
    if (prevB && x.b.qrsOn < prevB.tOff) continue;
    if (x.b.kind === 'fusion') continue;
    if (t.atrial.some((a) => a.conductedTo !== x.i && a.kind !== 'fibrillation' && a.kind !== 'flutter' && a.t + 105 >= x.b.qrsOn - 30 && a.t <= x.b.qrsOn + 10)) continue;
    judged++;
    if (Math.abs(ms(o.qrsOn) - x.b.qrsOn) <= GATES.qrsOn) good++;
  }
  if (judged && good / judged < GATES.qrsOnShare) out.push(`per-beat QRS onset: only ${good}/${judged} within ±${GATES.qrsOn} ms`);
  // ── visible atrial events ────────────────────────────────────────────────────────────────────────────────────
  if (dissociated) {
    // counted from 400 ms on (the beat before the strip has no template to subtract). Each oracle residual-P peak is
    // matched to the truth P that starts 10–110 ms before it. Visibility is the truth's rule (no overlap with QRS ±
    // 10 ms); a P whose 2 % edge lies within 20 ms of that boundary is ambiguous (its low-amplitude LA tail is invisible
    // in II / V1, about 15 ms) and is not counted on either
    // side (P extent: the nominal sinus P of the base, 105 ms — non-conducted P waves carry no offset in EcgTruth).
    const pWin = (x: number): boolean => x >= 400 && x <= dur - EDGE.tail;
    const P_MS = 105, BAND = 20;
    const gap = (p: number): number => Math.min(...t.beats.map((b) => Math.max(b.qrsOn - 10 - (p + P_MS), p - (b.qrsOff + 10))));
    const truthP = t.atrial.filter((a) => pWin(a.t));
    const peaks = residualPWaves(L, m).filter((tp) => pWin(tp - 40));
    let fp = 0;
    for (const tp of peaks) {
      const a = truthP.find((e) => tp - e.t >= 10 && tp - e.t <= 110);
      if (!a) fp++;
      else if (!a.visible && Math.abs(gap(a.t)) > BAND) fp++;
    }
    const fn = truthP.filter((a) => a.visible && Math.abs(gap(a.t)) > BAND && !peaks.some((tp) => tp - a.t >= 10 && tp - a.t <= 110)).length;
    if (fp || fn) out.push(`visible dissociated P: ${fn} missed, ${fp} spurious (truth visible ${truthP.filter((a) => a.visible).length}, oracle ${peaks.length})`);
  } else if (!flutter && !fibrillation) {
    let mism = 0;
    for (const { ti, o } of matched) {
      // the truth lists atrial events that start inside the strip: skip beats whose P may begin before 0 ms
      const beat = t.beats[ti];
      if (beat.qrsOn < 400) continue;
      // the conducting P, or the beat's own retrograde P′ when it precedes the QRS (BeatMarks convention)
      const own = beat.pOn !== null && beat.pOn < beat.qrsOn ? t.atrial.find((a) => Math.abs(a.t - beat.pOn!) < 0.5) : undefined;
      const ev = t.atrial.find((a) => a.conductedTo === ti) ?? own;
      // the oracle looks for a P after the previous T end only (± 40 ms: the T end itself is a measurement); a complex
      // that starts inside the previous T has no P window at all
      const prev = t.beats[ti - 1];
      if (ev && prev && ev.t < prev.tOff + 40) continue;
      if (prev && beat.qrsOn < prev.tOff + 40) continue;
      const truthVisible = ev !== undefined && ev.visible;
      // synth-rhythm M3: a P that does not conduct (complete AV block under a pacemaker, a blocked P before a junctional
      // or escape beat, its tail possibly running into the QRS) is found by the oracle's P search too; it agrees when
      // the truth has a non-conducted atrial wave starting within ± 30 ms of the oracle's P onset — or, when that wave
      // starts before the oracle's 330 ms search window, one whose nominal extent (105 ms) covers the onset found
      const oP = o.pOn !== null ? ms(o.pOn) : null;
      const nonConducted = !truthVisible && oP !== null && t.atrial.some((a) => a.conductedTo === null && a.kind !== 'fibrillation'
        && (Math.abs(a.t - oP) <= 30 || (a.t < oP && a.t + 105 >= oP && oP - ms(o.qrsOn) <= -320)));
      if (!nonConducted && truthVisible !== (o.pOn !== null)) mism++;
    }
    if (mism) out.push(`visible conducted P: ${mism} beat(s) where truth and oracle disagree`);
  }
  // ── ST at J+60: the amplitude is checked at the truth's J+60 instant, located from the oracle's own QRS onset (the
  // QRS duration is gated above; on a sloping ST a few ms of J difference would otherwise dominate). Flutter: on the
  // F-subtracted beat (the truth reads ST on the ventricular-only signal there).
  // Fibrillation: against each beat's TQ mean (tqReferenced); the gate adds twice the oracle's own f-wave standard
  // error (the random f value at J+60 does not average out over a 10 s strip).
  // J of the dominant beats (beats whose QRS duration is the truth's dominant one; ectopic beats have their own J)
  const domLike = t.beats.filter((b) => Math.abs(b.qrsOff - b.qrsOn - t.qrsMs) <= 10);
  const jBeats = domLike.length ? domLike : t.beats;
  const jRel = jBeats.length ? jBeats.map((b) => b.j - b.qrsOn).sort((a, b) => a - b)[jBeats.length >> 1] : 0;
  const at = (x: Float32Array, i: number): number => x[Math.max(0, Math.min(x.length - 1, i))];
  const tq = fibrillation ? tqReferenced(L, m, jRel + 60) : null;
  for (const l of STD_LEADS) {
    const tv = t.stMv[l];
    if (tv === undefined) continue;
    const k = Math.round(((jRel + 60) * fs) / 1000);
    const ov = fsub ? at(fsub.template[l], fsub.on + k) - fsub.level[l] : tq ? tq.st[l] : at(m.median[l], m.medianOn + k);
    const gate = GATES.st + (tq ? 2 * tq.stSe[l] : 0);
    if (Math.abs(ov - tv) > gate) out.push(`ST60 ${l}: truth ${tv.toFixed(3)} oracle ${ov.toFixed(3)}`);
  }
  return out;
}


/** T1: the largest identity residual (mV) of the delivered limb leads. */
export function t1Max(r: SynthResult): number {
  const L = r.ecg.signal.leads;
  let m = 0;
  for (let i = 0; i < L.I.length; i++) {
    m = Math.max(m, Math.abs(L.III[i] - (L.II[i] - L.I[i])), Math.abs(L.aVR[i] + (L.I[i] + L.II[i]) / 2), Math.abs(L.aVL[i] - (L.I[i] - L.II[i] / 2)), Math.abs(L.aVF[i] - (L.II[i] - L.I[i] / 2)));
  }
  return m;
}

/** T3: the failed hallmark and generic criteria of one generated ECG (empty = passes). */
export function t3Failures(r: SynthResult, def: ScenarioDef, variant: string | undefined): string[] {
  const sc = CRITERIA[def.id];
  if (!sc) return [`no criteria declared for '${def.id}'`];
  const leads = r.ecg.signal.leads;
  const ctx: CriterionCtx = { m: measure(leads, r.ecg.signal.fs), leads, fs: r.ecg.signal.fs, def, variant };
  const out: string[] = [];
  for (const g of GENERIC_IDS) {
    if (sc.optOut?.[g]) continue;
    const msg = GENERIC[g](ctx);
    if (msg) out.push(`[generic ${g}] ${msg}`);
  }
  for (const h of [...sc.hallmarks, ...(variant ? (VARIANT_CRITERIA[def.id]?.[variant] ?? []) : [])]) {
    const msg = h.check(ctx);
    if (msg) out.push(`[${h.id}] ${msg}`);
  }
  return out;
}
