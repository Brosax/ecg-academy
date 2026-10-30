/**
 * Built-in rhythm "truths" for the time-based figures when no ECG is supplied (laddergram, conduction). They use the
 * same shapes as EcgTruth (src/core/ecg.ts) so the same layout code runs on them; times in ms. In these fixtures
 * `AtrialEvent.t` is the P onset.
 */
import type { AtrialEvent, BeatMarks, EcgTruth } from '../../core/ecg';

export type DemoTruth = Pick<EcgTruth, 'atrial' | 'beats' | 'prMs'>;

export const DEMO_RHYTHMS = ['sinus', 'av1', 'wenckebach', 'mobitz2', 'complete', 'pvc'] as const;
export type DemoRhythm = (typeof DEMO_RHYTHMS)[number];

function beat(kind: BeatMarks['kind'], pOn: number | null, qrsOn: number, qrsMs = 90, qtMs = 380, aberrant = false): BeatMarks {
  return {
    kind,
    pOn,
    pOff: pOn == null ? null : pOn + 100,
    qrsOn,
    qrsOff: qrsOn + qrsMs,
    j: qrsOn + qrsMs,
    tPeak: qrsOn + qtMs - 110,
    tOff: qrsOn + qtMs,
    uOff: null,
    aberrant,
  };
}

/** Sinus P waves every `pp` ms with the given PR per P (null = blocked). */
function conductedSeries(first: number, pp: number, prs: readonly (number | null)[], qrsMs = 90): DemoTruth {
  const atrial: AtrialEvent[] = [];
  const beats: BeatMarks[] = [];
  prs.forEach((pr, k) => {
    const t = first + k * pp;
    if (pr == null) {
      atrial.push({ t, kind: 'sinus', conductedTo: null, visible: true });
    } else {
      atrial.push({ t, kind: 'sinus', conductedTo: beats.length, visible: true });
      beats.push(beat('sinus', t, t + pr, qrsMs));
    }
  });
  const firstPr = prs.find((p) => p != null) ?? 160;
  return { atrial, beats, prMs: firstPr };
}

export function demoTruth(id: DemoRhythm): DemoTruth {
  switch (id) {
    case 'sinus':
      return conductedSeries(200, 800, [160, 160, 160, 160, 160, 160, 160]);
    case 'av1':
      return conductedSeries(200, 860, [300, 300, 300, 300, 300, 300]);
    case 'wenckebach':
      // 4:3 Wenckebach: PR 180 → 280 → 320 → blocked; the PR after the pause is the shortest again
      return conductedSeries(200, 700, [180, 280, 320, null, 180, 280, 320, null, 180]);
    case 'mobitz2':
      return conductedSeries(200, 760, [180, 180, 180, null, 180, 180, null, 180]);
    case 'complete': {
      // atria 90 /min, ventricular escape 38 /min, no relation
      const atrial: AtrialEvent[] = [];
      for (let k = 0; k < 11; k++) atrial.push({ t: 150 + k * 667, kind: 'sinus', conductedTo: null, visible: true });
      const beats = [beat('escape-ventricular', null, 600, 150, 460), beat('escape-ventricular', null, 2180, 150, 460), beat('escape-ventricular', null, 3760, 150, 460), beat('escape-ventricular', null, 5340, 150, 460)];
      return { atrial, beats, prMs: null };
    }
    case 'pvc': {
      // sinus 75 /min with a PVC (coupling 400 ms) and a full compensatory pause: the next sinus P falls on the PVC's
      // ST–T, finds the AV node / ventricles refractory and is neither conducted nor visible
      const base = conductedSeries(200, 800, [160, 160, null, 160, 160, 160]);
      const beats = base.beats.slice();
      const pvc = beat('ventricular', null, 1560, 150, 420);
      beats.splice(2, 0, pvc);
      const atrial = base.atrial.map((a) => (a.conductedTo == null ? { ...a, visible: false } : { ...a, conductedTo: a.conductedTo >= 2 ? a.conductedTo + 1 : a.conductedTo }));
      return { atrial, beats, prMs: 160 };
    }
  }
}
