/**
 * EcgTruth from the scheduler's beat instances and the clean, unfiltered, noise-free model signal (DECISION §3.4,
 * §6.10). Fiducials are kernel edges and scheduler events; amplitude truths (ST at J+60, voltages) are read from the
 * clean signal at model fiducials. Every value must be re-measurable by the independent oracle (tests/synth/oracle).
 *
 * Rhythm conventions (synth-rhythm, M3):
 *  - the dominant beats are the most frequent morphology among the non-premature beats (bigeminy: the sinus beats, not
 *    whichever comes first); ectopic beats keep their own marks and kinds;
 *  - PR is reported only when it is consistent: the median over the dominant beats conducted from the dominant atrial
 *    mechanism when those PRs span <= 40 ms, else null with the range in facts.prRangeMs (Wenckebach, MAT, wandering
 *    pacemaker: a reader reports the pattern, not one PR; DECISION 6.10 asked for the post-pause PR, which the
 *    signal-averaged oracle cannot re-measure);
 *  - atrial rate and PP variation come from the dominant atrial mechanism (sinus / ectopic clock / flutter) over its
 *    undisturbed cycles (PACs, retrograde P', pauses and blocked SA exits excluded); sinus rhythm is named by that P
 *    rate, so 2:1 block at 80/min is sinus rhythm, not sinus bradycardia;
 *  - rhythms without measurable intervals (VF, polymorphic VT, ventricular flutter, asystole, pre-excited AF: intervals
 *    'not-applicable') carry the declared findings only; without any ventricular complex the rate is 0;
 *  - paced beats: the QRS onset is the stimulus artefact (the clinical convention for the paced QRS duration and the
 *    AV interval); the stimulus sample is kept out of the axis window;
 *  - the rate counts the complexes whose first 30 ms lie inside the strip; generated atrial waves (ectopic,
 *    retrograde, paced P′) carry the visible-onset convention of rhythm/atrialSites.ts.
 *
 * Recording conventions (synth-finish, M6):
 *  - stMv covers every recorded lead (the twelve and the requested V3R / V4R / V7–V9); the J-point ST of the same
 *    leads gives the STEMI-criterion facts (findings.ts › stFacts: sex- and age-specific V2–V3 limits);
 *  - the truth describes the recorded tracing (axes, amplitudes) — but a finding that depends only on where the
 *    electrodes were put is not a finding of the heart: with re-cabled or displaced limb electrodes (limb-cable
 *    reversal, Mason–Likar) the derived axis and low-voltage findings are dropped, with displaced chest electrodes
 *    poor R progression is dropped (the reader's answer there is the technical error, not "right axis deviation").
 */
import { sampleAt, type AtrialEvent, type BeatMarks, type EcgTruth, type LeadSignals } from '../../core/ecg';
import { FINDINGS, type FindingId } from '../../core/findings';
import { EXTRA_LEADS, STD_LEADS, type Lead, type StdLead } from '../../core/leads';
import type { PlacementSpec, ScenarioDef } from '../api';
import type { Schedule } from '../rhythm/scheduler';
import { areaAxisOf, qrsAxisOf } from './axis';
import { deriveFindings, sinusLabel, stFacts, voltageFacts, type LeadAmps } from './findings';

export interface TruthInput {
  readonly scenario: ScenarioDef;
  readonly declared: readonly FindingId[];
  readonly schedule: Schedule;
  /** clean leads, sample 0 at t = 0, and their ventricular-only and atrial-only parts (clean = vent + atrial) */
  readonly clean: LeadSignals;
  readonly vent: LeadSignals;
  readonly atrialOnly: LeadSignals;
  readonly fs: number;
  readonly durationMs: number;
  readonly facts: Readonly<Record<string, string>>;
  /** electrode placement of the recording (undefined: standard) */
  readonly placement?: PlacementSpec;
}

/** Derived findings that only electrode placement can create (dropped when the limb / chest electrodes are moved). */
const LIMB_PLACEMENT_FINDINGS: readonly FindingId[] = ['axis-normal', 'lad', 'rad', 'extreme-axis', 'low-voltage'];
const CHEST_PLACEMENT_FINDINGS: readonly FindingId[] = ['poor-r-progression'];

/** Limb electrodes off their limbs (a re-cabled limb or Mason–Likar torso sites) / chest electrodes off their sites. */
export function placementMoves(p: PlacementSpec | undefined): { limbs: boolean; chest: boolean } {
  if (!p) return { limbs: false, chest: false };
  const limbs = !!p.limbsOnTorso || Object.entries(p.limbs ?? {}).some(([cable, limb]) => limb !== undefined && limb !== cable);
  const chest = Object.entries(p.chest ?? {}).some(([cable, site]) => site !== undefined && site !== cable);
  return { limbs, chest };
}

export interface TruthOut {
  readonly truth: EcgTruth;
  readonly axisAmbiguous: boolean;
  /** index (in schedule.beats) of the representative dominant beat */
  readonly refBeat: number | null;
}

const median = (xs: readonly number[]): number => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
/** a complex is counted for the rate when this much of it (ms from its QRS onset) is inside the strip */
const SEEN_MS = 15;
const mean = (xs: readonly number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

/** The signals without the pacing stimuli: each stimulus is a one-sample impulse, replaced by its neighbours' mean
 *  (the truth describes the cardiac signal; recorders and the oracle blank the artefact the same way). */
function withoutStimuli(L: LeadSignals, stimuli: readonly { t: number }[], fs: number): LeadSignals {
  if (!stimuli.length) return L;
  const out = {} as Record<StdLead, Float32Array>;
  for (const l of STD_LEADS) {
    const x = Float32Array.from(L[l]);
    for (const s of stimuli) {
      const i = Math.round((s.t * fs) / 1000);
      if (i < 1 || i >= x.length - 1) continue;
      x[i] = 0.5 * (x[i - 1] + x[i + 1]);
    }
    out[l] = x;
  }
  return out as LeadSignals;
}

export function buildTruth(inp0: TruthInput): TruthOut {
  const stim = inp0.schedule.stimuli ?? [];
  const inp: TruthInput = stim.length
    ? { ...inp0, clean: withoutStimuli(inp0.clean, stim, inp0.fs), vent: withoutStimuli(inp0.vent, stim, inp0.fs) }
    : inp0;
  const { schedule: S, fs, durationMs: dur, clean } = inp;
  const inStrip = S.beats.filter((b) => b.qrsOn >= 0 && b.qrsOn < dur);
  const applicable = inp.scenario.intervals !== 'not-applicable';
  // dominant pattern: the most frequent pattern key among the non-premature beats of the strip (all beats otherwise)
  const counts = new Map<string, number>();
  const pool = inStrip.some((b) => !b.ectopic) ? inStrip.filter((b) => !b.ectopic) : inStrip;
  for (const b of pool) counts.set(b.patternKey, (counts.get(b.patternKey) ?? 0) + 1);
  let domKey = pool[0]?.patternKey ?? '';
  for (const [k, n] of counts) if (n > (counts.get(domKey) ?? 0)) domKey = k;
  const dominant = inStrip.filter((b) => b.patternKey === domKey);
  const complete = dominant.filter((b) => b.qrsOn - 120 >= 0 && b.tOff < dur);
  const ref = complete.length ? complete.reduce((best, b) => (Math.abs(b.qrsOn - dur / 2) < Math.abs(best.qrsOn - dur / 2) ? b : best)) : (dominant[0] ?? null);
  // ── beats and atrial events ─────────────────────────────────────────────────────────────────────────────────
  const beatIndex = new Map<number, number>();
  inStrip.forEach((b, i) => beatIndex.set(b.index, i));
  const beats: BeatMarks[] = inStrip.map((b) => {
    // the conducting atrial wave, or the beat's own retrograde P'
    const own = b.retroEvent !== undefined && b.retroEvent !== null ? S.atrial[b.retroEvent] : null;
    const ev = b.atrialEvent !== null ? S.atrial[b.atrialEvent] : own;
    const withP = ev && (ev.kind === 'sinus' || ev.kind === 'ectopic' || ev.kind === 'retrograde' || ev.kind === 'paced');
    return {
      kind: b.kind, pOn: withP ? ev.pOn : null, pOff: withP ? ev.pOff : null, qrsOn: b.qrsOn, qrsOff: b.qrsOff, j: b.j,
      tPeak: b.tPeak, tOff: b.tOff, uOff: b.uOff, aberrant: b.aberrant,
    };
  });
  // a P is visible when its amplitude reaches 0.05 mV in II or V1 and it overlaps no QRS ± 10 ms; a paced QRS starts at
  // its one-sample stimulus, whose activation follows a few ms later, so a P that ends before the spike is seen whole
  const busy = S.beats.map((b) => [b.qrsOn - (b.stimAt !== undefined && b.stimAt !== null && b.kind === 'paced-ventricular' ? 0 : 10), b.qrsOff + 10] as const);
  const atrial: AtrialEvent[] = [];
  for (const e of S.atrial) {
    if (e.pOn < 0 || e.pOn >= dur) continue;
    let visible = false;
    if (e.kind !== 'fibrillation') {
      const free = !busy.some(([a, b]) => e.pOn < b && e.pOff > a);
      if (free && e.pOff < dur) {
        // peak of the atrial wave in II or V1 on the atrial-only clean signal, against its level where its kernels
        // start (a generated P's visible onset lies a few ms into its upstroke)
        let peak = 0;
        const t0 = Math.min(e.t, e.pOn);
        const b2 = sampleAt(inp.atrialOnly.II, fs, t0), b1 = sampleAt(inp.atrialOnly.V1, fs, t0);
        for (let t = e.pOn; t <= e.pOff; t += 2) {
          peak = Math.max(peak, Math.abs(sampleAt(inp.atrialOnly.II, fs, t) - b2), Math.abs(sampleAt(inp.atrialOnly.V1, fs, t) - b1));
        }
        visible = peak >= 0.05;
      }
    }
    atrial.push({ t: e.pOn, kind: e.kind, conductedTo: e.conductedTo !== null ? (beatIndex.get(e.conductedTo) ?? null) : null, visible });
  }
  // ── rate, rhythm ────────────────────────────────────────────────────────────────────────────────────────────
  // rate over the complexes a reader sees: a complex counts when its first SEEN_MS are inside the strip (one cut right
  // at its onset is not recognisable; one cut later is — in bigeminy that last beat changes the mean RR by 3 bpm)
  const seen = inStrip.filter((b) => b.qrsOn + SEEN_MS <= dur);
  const rrs = seen.slice(1).map((b, i) => b.qrsOn - seen[i].qrsOn);
  const meanRr = rrs.length ? mean(rrs) : seen.length ? 1000 : Infinity;
  const hrBpm = Number.isFinite(meanRr) ? 60000 / meanRr : 0;
  const regular = rrs.length > 0 && rrs.every((r) => Math.abs(r - meanRr) <= 0.05 * meanRr);
  // atrial rate and PP variation from the dominant atrial mechanism's undisturbed cycles (fallback: every P wave)
  const stripAtrial = S.atrial.filter((e) => e.pOn >= 0 && e.pOn < dur && e.kind !== 'fibrillation');
  const domAtrial = stripAtrial.filter((e) => e.dominant);
  const domPps = domAtrial.slice(1).map((e, i) => ({ pp: e.t - domAtrial[i].t, regular: e.regularCycle === true }));
  const regularPps = domPps.filter((x) => x.regular).map((x) => x.pp);
  const anyPps = stripAtrial.slice(1).map((e, i) => e.t - stripAtrial[i].t);
  // with ≥ 2 undisturbed cycles of the dominant mechanism: its rate; otherwise (every cycle reset by an ectopic P′,
  // e.g. atrial bigeminy) the rate of all atrial waves
  const pps = regularPps.length >= 2 ? regularPps : anyPps;
  const atrialRateBpm = pps.length ? 60000 / mean(pps) : null;
  const ppRange = regularPps.length >= 2 ? Math.max(...regularPps) - Math.min(...regularPps) : null;
  const declaredRhythm = inp.declared.find((f) => FINDINGS[f].cat === 'rhythm') ?? 'sinus-rhythm';
  const sinus = ['sinus-rhythm', 'sinus-bradycardia', 'sinus-tachycardia', 'sinus-arrhythmia'].includes(declaredRhythm);
  // sinus rhythm is named by the sinus P rate over undisturbed cycles (equal to the heart rate with 1:1 conduction);
  // without undisturbed sinus cycles the declared label stands
  const sinusCycles = domPps.filter((x, i) => x.regular && domAtrial[i + 1].kind === 'sinus').map((x) => x.pp);
  const rhythm: FindingId = !sinus ? declaredRhythm
    : sinusCycles.length >= 2 ? sinusLabel(60000 / mean(sinusCycles), ppRange)
      : domAtrial.some((e) => e.kind === 'sinus') ? declaredRhythm : sinusLabel(hrBpm, ppRange);
  // ── intervals ───────────────────────────────────────────────────────────────────────────────────────────────
  // PR: dominant beats conducted from the dominant atrial mechanism (or atrial pacing); reported when consistent
  const fromDominantP = (b: (typeof dominant)[number]): boolean => {
    if (b.atrialEvent === null) return false;
    const e = S.atrial[b.atrialEvent];
    return (e.kind === 'sinus' || e.kind === 'ectopic' || e.kind === 'paced') && !e.premature;
  };
  const conducted = dominant.filter(fromDominantP);
  const prs = conducted.map((b) => b.qrsOn - S.atrial[b.atrialEvent!].pOn);
  const prSpan = prs.length ? Math.max(...prs) - Math.min(...prs) : 0;
  // P waves from ≥ 2 sites (wandering pacemaker, MAT): no single PR or P axis
  const pSites = new Set(conducted.map((b) => S.atrial[b.atrialEvent!].site ?? 'sinus'));
  const prMs = prs.length && prs.length >= dominant.length / 2 && prSpan <= 40 && pSites.size <= 1 ? median(prs) : null;
  const domFull = complete.length ? complete : dominant;
  const qrsMs = median(domFull.map((b) => b.qrsOff - b.qrsOn));
  const qtMs = median(domFull.map((b) => b.tOff - b.qrsOn));
  // QTc: the preceding RR in a regular rhythm; in an irregular one the undisturbed sinus cycle when every sinus P
  // conducts (a pause or a PVC does not change the cycle the QT adapts to), else the mean RR of the strip (criteria.md
  // qtc-bazett: average RR in AF)
  const allConducted = domAtrial.length > 0 && domAtrial.every((e) => e.kind === 'sinus' && (e.conductedTo !== null || e.pOn > dur - 400));
  const rrMed = regular || !rrs.length ? median(domFull.map((b) => b.rrPrevMs)) : allConducted && sinusCycles.length >= 2 ? mean(sinusCycles) : mean(rrs);
  const qtcBazettMs = qtMs / Math.sqrt(rrMed / 1000);
  const qtcFridericiaMs = qtMs / Math.cbrt(rrMed / 1000);
  // graded QTc (long / short QT findings): in fibrillation (irregularly irregular conduction, the QTc above uses the
  // mean RR of the strip) the QT of each beat follows its own preceding cycles, and one median QT over one mean RR falls
  // a few ms either side of a limit at normal values — the mean of the per-beat QTcF over the strip is graded instead
  // (criteria.md qtc-bazett: in AF "average over about 10 beats"). Ectopy (bigeminy: every sinus beat follows a
  // compensatory pause) keeps the reported QTc.
  const meanRrQtc = !(regular || !rrs.length) && S.atrial.some((e) => e.kind === 'fibrillation');
  const perBeat = domFull.filter((b) => b.rrPrevMs > 0).map((b) => (b.tOff - b.qrsOn) / Math.cbrt(b.rrPrevMs / 1000));
  const gradedQtcF = meanRrQtc && perBeat.length >= 3 ? mean(perBeat) : qtcFridericiaMs;
  // ── axes (ventricular-only / atrial-only) ───────────────────────────────────────────────────────────────────
  const axisBeats = (domFull.length ? domFull : inStrip).filter((b) => b.qrsOn >= 0 && b.tOff < dur);
  // a pacing stimulus is a one-sample impulse just before the paced QRS: keep it out of the window
  const qrsWin = (b: (typeof axisBeats)[number]): { a: number; b: number } => ({ a: b.stimAt !== undefined && b.stimAt !== null ? Math.max(b.qrsOn, b.stimAt + 1.5 * (1000 / fs)) : b.qrsOn, b: b.qrsOff });
  // a retrograde P′ inscribed in the QRS belongs to the complex (pseudo-r′ / pseudo-S of AVNRT, junctional rhythm):
  // the axis is read on the clean signal there, as a reader reads it; otherwise on the ventricular-only signal (atrial
  // waves running through do not move it)
  const ownInQrs = axisBeats.filter((b) => {
    const e = b.retroEvent !== undefined && b.retroEvent !== null ? S.atrial[b.retroEvent] : null;
    return e !== null && e.pOn < b.qrsOff && e.pOff > b.qrsOn;
  }).length;
  const qa = axisBeats.length ? qrsAxisOf(ownInQrs > axisBeats.length / 2 ? clean : inp.vent, axisBeats.map(qrsWin), fs) : null;
  // T axis over the beats whose T is complete (the next complex starts after the T end: a stimulus or a beat that lands
  // in the T — undersensing, R on T — would add its own QRS to the T area)
  const nextOn = (b: (typeof axisBeats)[number]): number => S.beats.find((x) => x.qrsOn > b.qrsOn)?.qrsOn ?? Infinity;
  const fullT = axisBeats.filter((b) => nextOn(b) > b.tOff);
  const tBeats = fullT.length ? fullT : axisBeats;
  const tAxis = tBeats.length ? areaAxisOf(inp.vent, tBeats.map((b) => ({ a: b.j, b: Math.min(b.tOff, nextOn(b)) })), fs) : null;
  const pEvents = conducted.map((b) => S.atrial[b.atrialEvent!]).filter((e) => (e.kind === 'sinus' || e.kind === 'ectopic' || e.kind === 'paced') && e.pOn >= 0 && e.pOff < dur);
  // the P axis is reported with a consistent P–QRS relation (a reader takes it from the P waves that conduct)
  const pAxis = pEvents.length && prMs !== null ? areaAxisOf(inp.atrialOnly, pEvents.map((e) => ({ a: e.pOn, b: e.pOff })), fs) : null;
  // ── ST at J+60 (median over the complete dominant beats) and QRS amplitudes of the representative beat ────────
  // ST is read against the PR-segment level of the clean signal (UDMI convention: atrial repolarisation and atrial
  // injury belong to that baseline). In fibrillation and flutter there is no PR segment and f / F waves are atrial,
  // not ST: the ventricular-only clean signal is used (the reader estimates the baseline through the f / F waves).
  const stMv: Partial<Record<Lead, number>> = {};
  const stJ: Partial<Record<Lead, number>> = {};
  const amps = {} as Record<StdLead, LeadAmps>;
  const atrialChaos = S.atrial.some((e) => e.kind === 'fibrillation' || e.kind === 'flutter');
  const stSrc = atrialChaos ? inp.vent : clean;
  // Reference level. A beat conducted from its own P has a PR segment (P end → QRS onset): its median is the reference
  // even when the segment slopes (atrial repolarisation, the PR depression of pericarditis — read flat at zero, the
  // depressed PR would show up as ST elevation and as extra R / missing S). Without a PR segment (VT, junctional, a P on
  // the T or running into the QRS) the window 30–10 ms before the QRS is used where it is isoelectric (range ≤ 0.04 mV),
  // else the model's zero baseline (no source active = the TP level).
  const prSegment = (b: (typeof S.beats)[number]): { a: number; z: number } | null => {
    if (b.atrialEvent === null || b.atrialEvent === undefined) return null;
    const e = S.atrial[b.atrialEvent];
    if (!e || !(e.kind === 'sinus' || e.kind === 'ectopic' || e.kind === 'paced')) return null;
    const a = Math.max(e.pOff, b.qrsOn - 30), z = b.qrsOn - 10;
    return z - a >= 6 ? { a, z } : null;
  };
  const prLevel = (x: Float32Array, b: (typeof S.beats)[number]): number => {
    const seg = prSegment(b);
    const vs: number[] = [];
    for (let t = seg ? seg.a : b.qrsOn - 30; t <= (seg ? seg.z : b.qrsOn - 10); t += 1000 / fs) vs.push(sampleAt(x, fs, t));
    if (!vs.length) return 0;
    if (seg) return median(vs);
    return Math.max(...vs) - Math.min(...vs) <= 0.04 ? mean(vs) : 0;
  };
  const stBeats = complete.length ? complete : ref ? [ref] : [];
  const recorded: Lead[] = [...STD_LEADS, ...EXTRA_LEADS.filter((l) => clean[l] !== undefined && stSrc[l] !== undefined)];
  if (ref && stBeats.length) {
    for (const l of recorded) {
      const x = stSrc[l]!;
      stMv[l] = Math.round(median(stBeats.map((b) => sampleAt(x, fs, b.j + 60) - prLevel(x, b))) * 1e4) / 1e4;
      stJ[l] = Math.round(median(stBeats.map((b) => sampleAt(x, fs, b.j) - prLevel(x, b))) * 1e4) / 1e4;
    }
  }
  for (const l of STD_LEADS) {
    if (!ref) {
      amps[l] = { r: 0, s: 0 };
      continue;
    }
    const x = clean[l];
    const pr = prLevel(x, ref);
    let r = 0, s = 0;
    for (let t = ref.qrsOn; t <= ref.qrsOff; t += 1000 / fs) {
      const v = sampleAt(x, fs, t) - pr;
      r = Math.max(r, v);
      s = Math.min(s, v);
    }
    amps[l] = { r, s };
  }
  const sex = inp.scenario.patient?.sex ?? null;
  const ageY = inp.scenario.patient?.ageY ?? null;
  // the axis / QT / R-progression findings of a ventricular, escape-ventricular or paced rhythm are not reported
  const ventricularRhythm = dominant.length > 0 && (dominant[0].kind === 'ventricular' || dominant[0].kind === 'paced-ventricular' || dominant[0].kind === 'escape-ventricular');
  const qaxis = qa ? qa.netDeg : 0;
  let findings = applicable && qa
    ? deriveFindings({
      declared: inp.declared, rhythm, hrBpm, ppRangeMs: ppRange, prMs, qrsMs, qtcFridericiaMs: gradedQtcF, axisDeg: qaxis, amps, sex, ageY, ventricularRhythm,
      ventricularFocus: ventricularRhythm && dominant[0].kind !== 'paced-ventricular',
    })
    : [...new Set<FindingId>(inp.declared)];
  // QTc is not graded at rates above 150/min (the rate corrections diverge) nor right after a run of ≥ 3 ectopic beats
  // (the QT is still adapting to the abrupt rate change); a QT finding there must be declared
  const run3 = inStrip.some((b, i) => i >= 2 && b.ectopic && inStrip[i - 1].ectopic && inStrip[i - 2].ectopic);
  if (hrBpm > 150 || run3) findings = findings.filter((f) => inp.declared.includes(f) || (f !== 'short-qt' && f !== 'long-qt'));
  // a paced ventricle's AV interval is programmed: no short-PR / first-degree-block finding from it
  if (dominant.length > 0 && dominant[0].kind === 'paced-ventricular') findings = findings.filter((f) => inp.declared.includes(f) || (f !== 'short-pr' && f !== 'av-block-1'));
  // voltage and R-progression criteria are not applied to ventricular, escape or paced complexes
  if (ventricularRhythm) findings = findings.filter((f) => inp.declared.includes(f) || (f !== 'low-voltage' && f !== 'poor-r-progression'));
  // a prolonged PR inside a higher-degree AV block or AV dissociation is not first-degree block (criteria.md
  // first-degree-avb: "all P conducted")
  const HIGHER: readonly FindingId[] = ['av-block-2-mobitz1', 'av-block-2-mobitz2', 'av-block-2-2to1', 'av-block-high-grade', 'av-block-3', 'av-dissociation'];
  if (!inp.declared.includes('av-block-1') && HIGHER.some((f) => inp.declared.includes(f))) findings = findings.filter((f) => f !== 'av-block-1');
  // findings of the electrode placement, not of the heart (a declared one stays)
  const moved = placementMoves(inp.placement);
  if (moved.limbs) findings = findings.filter((f) => inp.declared.includes(f) || !LIMB_PLACEMENT_FINDINGS.includes(f));
  if (moved.chest) findings = findings.filter((f) => inp.declared.includes(f) || !CHEST_PLACEMENT_FINDINGS.includes(f));
  const stemiApplies = !ventricularRhythm && !findings.includes('lbbb');
  const facts: Record<string, string> = {
    ...inp.facts, ...(ref ? voltageFacts(amps, sex) : {}), ...(ref && applicable && Object.keys(stJ).length ? stFacts(stJ, sex, ageY, stemiApplies) : {}), ...(S.notes ?? {}),
  };
  if (ppRange !== null) facts.ppRangeMs = String(Math.round(ppRange));
  if (prs.length > 1 && prMs === null) facts.prRangeMs = `${Math.round(Math.min(...prs))}-${Math.round(Math.max(...prs))}`;
  // conduction ratio of the dominant atrial mechanism over the strip (P waves conducted / P waves)
  const domIn = domAtrial.filter((e) => e.kind !== 'retrograde');
  if (domIn.length >= 3 && inStrip.length) {
    const cond = domIn.filter((e) => e.conductedTo !== null).length;
    if (cond > 0 && cond < domIn.length) facts.conductedP = `${cond}/${domIn.length}`;
  }
  if (S.stimuli?.length) {
    const st = S.stimuli.filter((x) => x.t >= 0 && x.t < dur);
    facts.stimuli = `${st.filter((x) => x.chamber === 'A').length} atrial, ${st.filter((x) => x.chamber === 'V').length} ventricular, ${st.filter((x) => !x.captured).length} not captured`;
  }
  const truth: EcgTruth = {
    rhythm,
    findings,
    regular,
    hrBpm,
    atrialRateBpm: rhythm === 'atrial-fibrillation' ? null : atrialRateBpm,
    prMs: applicable ? prMs : null,
    qrsMs: Number.isFinite(qrsMs) ? qrsMs : 0,
    qtMs: Number.isFinite(qtMs) ? qtMs : 0,
    qtcBazettMs: Number.isFinite(qtcBazettMs) ? qtcBazettMs : 0,
    qtcFridericiaMs: Number.isFinite(qtcFridericiaMs) ? qtcFridericiaMs : 0,
    axisDeg: { p: pAxis, qrs: qaxis, t: tAxis ?? 0 },
    beats,
    atrial,
    stMv,
    facts,
  };
  return { truth, axisAmbiguous: qa ? qa.ambiguous : true, refBeat: ref ? ref.index : null };
}
