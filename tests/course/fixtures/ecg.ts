/**
 * Hand-built ECGs for the course tests (no src/synth): Gaussian waves at known times, so AutoMark resolution and the
 * QRS wave labeller can be checked exactly. Not one-source (leads are written independently) — only the marks logic is
 * under test here, never physiology.
 */
import type { AtrialEvent, BeatMarks, Ecg, EcgTruth } from '../../../src/core/ecg';
import { STD_LEADS, type StdLead } from '../../../src/core/leads';

interface G {
  readonly at: number; // ms relative to the beat's QRS onset
  readonly s: number; // ms
  readonly a: number; // mV
}

export const FS = 500;
export const DURATION_MS = 10_000;
export const RR_MS = 800;
export const FIRST_QRS_MS = 400;
export const QRS_MS = 90;
export const PR_MS = 160;
/** index of the one ventricular (aberrant, wide) beat */
export const PVC_BEAT = 5;

/** QRS recipe per lead (relative to QRS onset), P and T shared unless overridden. */
const QRS: Partial<Record<StdLead, readonly G[]>> = {
  // qRs
  II: [
    { at: 15, s: 5, a: -0.12 },
    { at: 42, s: 8, a: 1.2 },
    { at: 72, s: 6, a: -0.25 },
  ],
  // rS
  V1: [
    { at: 20, s: 6, a: 0.2 },
    { at: 52, s: 10, a: -1.0 },
  ],
  // rSR′
  V2: [
    { at: 15, s: 5, a: 0.3 },
    { at: 40, s: 6, a: -0.6 },
    { at: 70, s: 7, a: 0.8 },
  ],
  // QS
  aVR: [{ at: 45, s: 12, a: -0.8 }],
};
const DEFAULT_QRS: readonly G[] = [
  { at: 25, s: 6, a: -0.1 },
  { at: 45, s: 9, a: 0.9 },
];

const gauss = (t: number, c: number, s: number, a: number) => a * Math.exp(-0.5 * ((t - c) / s) ** 2);

export function beatsTruth(): { beats: BeatMarks[]; atrial: AtrialEvent[] } {
  const beats: BeatMarks[] = [];
  const atrial: AtrialEvent[] = [];
  for (let k = 0; ; k++) {
    const qrsOn = FIRST_QRS_MS + k * RR_MS;
    if (qrsOn + 420 > DURATION_MS) break;
    const pvc = k === PVC_BEAT;
    beats.push({
      kind: pvc ? 'ventricular' : 'sinus',
      pOn: pvc ? null : qrsOn - PR_MS,
      pOff: pvc ? null : qrsOn - PR_MS + 100,
      qrsOn,
      qrsOff: qrsOn + (pvc ? 150 : QRS_MS),
      j: qrsOn + (pvc ? 150 : QRS_MS),
      tPeak: qrsOn + 300,
      tOff: qrsOn + 400,
      uOff: null,
      aberrant: pvc,
    });
    if (!pvc) atrial.push({ t: qrsOn - PR_MS, kind: 'sinus', conductedTo: k, visible: true });
  }
  // one blocked P in the middle of a long diastole (between beats 8 and 9)
  atrial.push({ t: FIRST_QRS_MS + 8 * RR_MS + 450, kind: 'sinus', conductedTo: null, visible: true });
  atrial.sort((a, b) => a.t - b.t);
  return { beats, atrial };
}

/** 10 s, 12 leads, 75/min sinus with one PVC (beat 5) and one blocked P; ST +0.2 mV in V3. */
export function testEcg(): Ecg {
  const { beats, atrial } = beatsTruth();
  const n = (DURATION_MS * FS) / 1000;
  const leads = {} as Record<StdLead, Float32Array>;
  for (const lead of STD_LEADS) {
    const arr = new Float32Array(n);
    const recipe = QRS[lead] ?? DEFAULT_QRS;
    for (let i = 0; i < n; i++) {
      const t = (i * 1000) / FS;
      let v = 0;
      for (const b of beats) {
        if (t < b.qrsOn - 300 || t > b.qrsOn + 600) continue;
        const x = t - b.qrsOn;
        if (b.kind === 'ventricular') {
          v += gauss(x, 70, 30, lead === 'aVR' ? -1.0 : 1.0);
          v += gauss(x, 320, 50, -0.3);
          continue;
        }
        v += gauss(x, -PR_MS + 50, 15, lead === 'aVR' ? -0.1 : 0.12);
        for (const g of recipe) v += gauss(x, g.at, g.s, g.a);
        v += gauss(x, 300, 40, lead === 'aVR' ? -0.2 : lead === 'V1' ? -0.1 : 0.3);
        if (lead === 'V3') {
          // ST plateau of 0.2 mV from J into the T wave (smooth edges)
          const up = 1 / (1 + Math.exp(-(x - (QRS_MS - 5)) / 3));
          const down = 1 / (1 + Math.exp((x - 330) / 15));
          v += 0.2 * up * down;
        }
      }
      for (const e of atrial) if (e.conductedTo === null) v += gauss(t, e.t + 50, 15, 0.12);
      arr[i] = v;
    }
    leads[lead] = arr;
  }
  const truth: EcgTruth = {
    rhythm: 'sinus-rhythm',
    findings: ['sinus-rhythm', 'pvc'],
    regular: false,
    hrBpm: 75,
    atrialRateBpm: 75,
    prMs: PR_MS,
    qrsMs: QRS_MS,
    qtMs: 400,
    qtcBazettMs: 447,
    qtcFridericiaMs: 431,
    axisDeg: { p: 60, qrs: 60, t: 50 },
    beats,
    atrial,
    stMv: { V3: 0.2, II: 0 },
    facts: {},
  };
  return {
    origin: { kind: 'synthetic', scenarioId: 'fixture', seed: 1 },
    signal: { fs: FS, durationMs: DURATION_MS, leads },
    truth,
    regions: null,
  };
}

/** The same tracing without truth (as a real ECG would arrive). */
export function realLikeEcg(): Ecg {
  const e = testEcg();
  return { ...e, origin: { kind: 'real', dataset: 'PTB-XL', ecgId: 1 }, truth: null };
}
