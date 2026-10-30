/**
 * Test fixtures for the viewer. Two kinds:
 *  - `fixtureEcg()` — the dev fixture (src/ecg/dev/fixture.ts): Gaussian dipole lobes projected on fixed lead vectors,
 *    limb leads by Einthoven/Goldberger, so all 12 leads are consistent and the truth comes from the model timing;
 *  - `handEcg()` — a tiny hand-built record whose QRS in each lead is a known sum of Gaussians, for exact
 *    morphology checks (q/R/s, rS, QS, R′).
 * Nothing here imports src/synth.
 */
import type { BeatMarks, Ecg, EcgTruth } from '../../src/core/ecg';
import { STD_LEADS, type StdLead } from '../../src/core/leads';
import type { LayoutOptions } from '../../src/ecg/layout';
import { makeFixtureEcg, type FixtureOptions } from '../../src/ecg/dev/fixture';

export const fixtureEcg = (o: FixtureOptions = {}): Ecg => makeFixtureEcg(o);

export function opts(p: Partial<LayoutOptions> = {}): LayoutOptions {
  return {
    layout: '3x4+1',
    speed: 25,
    gain: 10,
    chestHalfGain: false,
    cabrera: false,
    lead: 'II',
    window: null,
    brackets: false,
    waveLabels: false,
    stMarkers: false,
    ...p,
  };
}

interface G {
  readonly c: number;
  readonly s: number;
  readonly a: number;
}
const gauss = (t: number, g: G) => g.a * Math.exp(-0.5 * ((t - g.c) / g.s) ** 2);

/**
 * One beat at 500 Hz in a 1.2 s record: P at 150 ms, QRS 300–400 ms, T peak 600 ms. Each lead gets its own QRS recipe
 * (P and T are shared); III / aVR / aVL / aVF are NOT derived — this fixture only tests per-lead overlay extraction.
 */
export function handEcg(): Ecg {
  const fs = 500;
  const durationMs = 1200;
  const n = (durationMs * fs) / 1000;
  const P: G = { c: 150, s: 18, a: 0.15 };
  const T: G = { c: 600, s: 45, a: 0.3 };
  const recipes: Partial<Record<StdLead, G[]>> = {
    // small q, tall R, small s → "qRs"
    II: [
      { c: 320, s: 5, a: -0.12 },
      { c: 350, s: 8, a: 1.2 },
      { c: 380, s: 5, a: -0.2 },
    ],
    // small r, deep S → "rS"
    V1: [
      { c: 325, s: 6, a: 0.2 },
      { c: 360, s: 9, a: -1.0 },
    ],
    // no positive lobe → "QS"
    aVR: [{ c: 350, s: 10, a: -0.8 }],
    // rSR′ (RBBB-like)
    V2: [
      { c: 320, s: 5, a: 0.3 },
      { c: 345, s: 6, a: -0.6 },
      { c: 375, s: 6, a: 0.7 },
    ],
  };
  const leads = {} as Record<StdLead, Float32Array>;
  for (const l of STD_LEADS) {
    const a = new Float32Array(n);
    const qrs = recipes[l] ?? [{ c: 350, s: 8, a: 0.6 }];
    for (let i = 0; i < n; i++) {
      const t = (i * 1000) / fs;
      let v = gauss(t, P) + gauss(t, T);
      for (const g of qrs) v += gauss(t, g);
      a[i] = v;
    }
    leads[l] = a;
  }
  const beat: BeatMarks = {
    kind: 'sinus',
    pOn: 100,
    pOff: 200,
    qrsOn: 300,
    qrsOff: 400,
    j: 400,
    tPeak: 600,
    tOff: 720,
    uOff: null,
    aberrant: false,
  };
  const truth: EcgTruth = {
    rhythm: 'sinus-rhythm',
    findings: ['sinus-rhythm'],
    regular: true,
    hrBpm: 60,
    atrialRateBpm: 60,
    prMs: 200,
    qrsMs: 100,
    qtMs: 420,
    qtcBazettMs: 420,
    qtcFridericiaMs: 420,
    axisDeg: { p: 60, qrs: 60, t: 60 },
    beats: [beat],
    atrial: [{ t: 100, kind: 'sinus', conductedTo: 0, visible: true }],
    stMv: {},
    facts: {},
  };
  return { origin: { kind: 'synthetic', scenarioId: 'hand', seed: 0 }, signal: { fs, durationMs, leads }, truth, regions: null };
}
