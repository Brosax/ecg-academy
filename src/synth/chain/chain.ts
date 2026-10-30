/**
 * Recording chain (DECISION §6.9): acts on electrode potentials, never on a lead. Order:
 *
 *   1. additive artefacts per electrode (noise.ts; seeded per process)
 *   2. amplifier gain (calibration error)
 *   3. filters (filters.ts; LTI, so they commute with lead formation and the identities survive)
 *   4. lead assembly through the hook-up (cables → body sites; assemble.ts)
 *   5. ADC on the independently recorded channels (I, II, V1–V6, extra leads): quantisation and clipping, with III,
 *      aVR, aVL, aVF derived from the quantised I and II as real recorders do.
 *
 * Truth is computed on the clean, unfiltered potentials and is never changed here; the chain reports the realised noise
 * level and the technical findings of the artefacts that are visible after filtering (`artefacts`).
 *
 * A recording without noise and filters needs nothing but the potentials: gain, placement and ADC give exactly the
 * leads assemble() gives. Noise and filters need the sampling rate (and a seeded stream): `opts.fs`, `opts.rng`
 * (generate() passes fs and rng.fork('chain')); a caller that passes no `fs` gets the clean recording.
 */
import type { LeadSignals } from '../../core/ecg';
import type { FindingId } from '../../core/findings';
import { deriveLimbLeads, EXTRA_LEADS, STD_LEADS, type ExtraLead, type StdLead } from '../../core/leads';
import { createRng, hashString, type Rng } from '../../core/rng';
import type { Difficulty, NoiseSpec, RecordingSpec } from '../api';
import { FILTER_PRESETS } from '../api';
import { assemble, sitePotential, type SitePotentials } from '../leads/assemble';
import type { Hookup } from '../leads/electrodes';
import { applyFilter, filterStages, magnitude } from './filters';
import { emgBursts, NOISE_PROCESSES, noiseProcesses, type Cable, type NoiseProcess } from './noise';

export interface ChainOptions {
  /** sampling rate (Hz): required by noise and filters */
  readonly fs?: number;
  /** seeded stream for the artefacts (generate(): rng.fork('chain')); default: derived from the potentials + spec */
  readonly rng?: Rng;
  /** skeletal-muscle bursts of the source (schedule.myopotentials: what a pacemaker oversenses), absolute ms. They
   *  are recorded on the arm electrodes; a spec with `emgMv: 0` (SILENT_NOISE) silences them with the other EMG */
  readonly emgBursts?: readonly { readonly from: number; readonly to: number }[];
}

/** RMS (mV) of the myopotential bursts on each arm electrode. */
export const MYOPOTENTIAL_EMG_MV = 0.06;

export interface ChainOut {
  readonly leads: LeadSignals;
  /** realised noise level: the largest RMS (mV) of the additive artefacts over the delivered leads, scaled by the gain
   *  and the filter response in each artefact's band */
  readonly noiseMv: number;
  /** technical findings of the visible artefacts (baseline-wander, muscle-tremor, ac-interference) */
  readonly artefacts: readonly FindingId[];
}

/** The recorder used when an electrode is off and the spec names no ADC (saturation at ±10 mV, 1 µV). */
export const DEFAULT_ADC = { lsbUv: 1, rangeMv: 10 } as const;

/** Visibility thresholds of the artefact findings (on the delivered leads, after filtering; DECISION §9.12). */
export const ARTEFACT_VISIBLE = {
  /** low-frequency excursion (p2p, mV) in at least one lead */
  wanderP2p: 0.2,
  /** muscle / tremor noise RMS (mV) in at least one lead */
  muscleRms: 0.015,
  /** mains interference p2p (mV, twice the steady 50 / 60 Hz amplitude) in at least one lead */
  mainsP2p: 0.02,
} as const;

const hasNoise = (n: NoiseSpec | undefined): boolean =>
  !!n && ((n.wanderMv ?? 0) > 0 || (n.emgMv ?? 0) > 0 || (n.tremor?.mv ?? 0) > 0 || (n.mains?.mv ?? 0) > 0 || (n.pop?.mv ?? 0) !== 0 || (n.motion?.mv ?? 0) > 0 || !!n.leadOff);

/** Deterministic stream for a recording when the caller passes none: the spec and a few potential samples. */
function derivedRng(phi: SitePotentials<Float64Array>, rec: RecordingSpec): Rng {
  let h = hashString(JSON.stringify(rec));
  const buf = new Float64Array(1);
  const words = new Uint32Array(buf.buffer);
  for (const k of ['RA', 'LL', 'V1'] as const) {
    const x = phi[k];
    for (let j = 0; j < 32; j++) {
      buf[0] = x[Math.floor((j * (x.length - 1)) / 31)];
      h = Math.imul(h ^ words[0], 16777619) >>> 0;
      h = Math.imul(h ^ words[1], 16777619) >>> 0;
    }
  }
  return createRng(h);
}

function adc(leads: LeadSignals, a: { readonly lsbUv: number; readonly rangeMv: number }): LeadSignals {
  const q = a.lsbUv / 1000, range = a.rangeMv;
  const quant = (x: Float32Array): Float32Array => x.map((v) => Math.max(-range, Math.min(range, Math.round(v / q) * q)));
  const out = { ...leads } as Record<StdLead | ExtraLead, Float32Array>;
  for (const l of ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) out[l] = quant(leads[l]);
  for (const l of EXTRA_LEADS) {
    const x = leads[l];
    if (x) out[l] = quant(x);
  }
  const d = deriveLimbLeads(out.I, out.II);
  return { ...out, ...d } as LeadSignals;
}

const CHEST = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;

/**
 * Sum of squares, minimum and maximum of each standard lead formed from per-cable signals (the same formulas as
 * assemble(), Float64, without allocating the leads): one pass per lead.
 */
function leadStats(RA: Float64Array, LA: Float64Array, LL: Float64Array, V: readonly Float64Array[], n: number): { s2: number; lo: number; hi: number }[] {
  const NL = 6 + V.length;
  const s2 = new Float64Array(NL), lo = new Float64Array(NL).fill(Infinity), hi = new Float64Array(NL).fill(-Infinity);
  const x = new Float64Array(NL);
  for (let i = 0; i < n; i++) {
    const r = RA[i], l = LA[i], f = LL[i];
    const w = (r + l + f) / 3;
    x[0] = l - r;
    x[1] = f - r;
    x[2] = f - l;
    x[3] = r - (l + f) / 2;
    x[4] = l - (r + f) / 2;
    x[5] = f - (r + l) / 2;
    for (let j = 0; j < V.length; j++) x[6 + j] = V[j][i] - w;
    for (let j = 0; j < NL; j++) {
      const v = x[j];
      s2[j] += v * v;
      if (v < lo[j]) lo[j] = v;
      if (v > hi[j]) hi[j] = v;
    }
  }
  return Array.from({ length: NL }, (_, j) => ({ s2: s2[j], lo: lo[j], hi: hi[j] }));
}

/** True when the recording delivers exactly the clean leads (no artefacts, filter, gain error or ADC). */
export function chainIsIdentity(rec: RecordingSpec | undefined, emgBursts?: readonly unknown[]): boolean {
  const bursts = !!emgBursts?.length && rec?.noise?.emgMv !== 0;
  return !bursts && !hasNoise(rec?.noise) && !rec?.filter && !rec?.adc && (rec?.gain ?? 1) === 1;
}

/** Deliver the leads of a recording from the site potentials (sample 0 = strip start). */
export function recordingChain(phi: SitePotentials<Float64Array>, hook: Hookup, rec: RecordingSpec | undefined, opts: ChainOptions = {}): ChainOut {
  const g = rec?.gain ?? 1;
  const bursts = opts.emgBursts?.length && rec?.noise?.emgMv !== 0 ? opts.emgBursts : null;
  const noisy = hasNoise(rec?.noise) || !!bursts;
  if (!noisy && !rec?.filter) {
    let src: SitePotentials<Float64Array> = phi;
    if (g !== 1) {
      const scaled: Record<string, Float64Array> = {};
      for (const k of Object.keys(phi)) {
        const v = phi[k];
        if (v) scaled[k] = v.map((x) => x * g);
      }
      src = scaled as SitePotentials<Float64Array>;
    }
    const leads = assemble(src, hook);
    return { leads: rec?.adc ? adc(leads, rec.adc) : leads, noiseMv: 0, artefacts: [] };
  }
  const fs = opts.fs;
  // without the sampling rate (generate() before the synth-leads wiring) the chain cannot shape noise or filters: it
  // delivers the clean recording — the documented M2 behaviour — instead of failing a lesson that asks for a filter
  if (fs === undefined) return recordingChain(phi, hook, { ...rec, noise: undefined, filter: undefined }, { ...opts, emgBursts: undefined });
  // 1. per-cable signals (the potential of the site each cable is clipped to)
  const cables: Cable[] = ['RA', 'LA', 'LL', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', ...hook.extra];
  const siteOf = (c: Cable): string => (c === 'RA' || c === 'LA' || c === 'LL' || c === 'V1' || c === 'V2' || c === 'V3' || c === 'V4' || c === 'V5' || c === 'V6' ? hook[c] : (hook.extraSite[c as ExtraLead] ?? c));
  const n = phi.RA.length;
  const cableHook: Hookup = {
    RA: 'RA', LA: 'LA', LL: 'LL', V1: 'V1', V2: 'V2', V3: 'V3', V4: 'V4', V5: 'V5', V6: 'V6',
    extra: hook.extra, extraSite: Object.fromEntries(hook.extra.map((l) => [l, l])), sites: {},
  };
  const sig: Record<string, Float64Array> = {};
  for (const c of cables) sig[c] = Float64Array.from(sitePotential(phi, siteOf(c)));
  // 1. artefacts
  const procs = noisy && hasNoise(rec?.noise) ? noiseProcesses(rec!.noise!, cables, fs, n, opts.rng ?? derivedRng(phi, rec ?? {})) : {};
  if (bursts) {
    const b = emgBursts(bursts, MYOPOTENTIAL_EMG_MV, ['LA', 'RA'], fs, n, (opts.rng ?? derivedRng(phi, rec ?? {})).fork('myopotential'));
    const m = (procs.emg ??= {});
    for (const c of ['LA', 'RA'] as const) {
      const prev = m[c], x = b[c]!;
      if (prev) for (let i = 0; i < n; i++) prev[i] += x[i];
      else m[c] = x;
    }
  }
  for (const p of NOISE_PROCESSES) {
    const m = procs[p];
    if (!m) continue;
    for (const c of cables) {
      const x = m[c];
      if (!x) continue;
      const s = sig[c];
      for (let i = 0; i < n; i++) s[i] += x[i];
    }
  }
  // 2–3. gain, filters
  const process = (x: Float64Array): Float64Array => {
    const y = g !== 1 ? x.map((v) => v * g) : x;
    return rec?.filter ? applyFilter(y, rec.filter, fs) : y;
  };
  for (const c of cables) sig[c] = process(sig[c]);
  // 4–5. leads, ADC (an electrode that is off saturates the recorder)
  const leads = assemble(sig as SitePotentials<Float64Array>, cableHook);
  const conv = rec?.adc ?? (rec?.noise?.leadOff ? DEFAULT_ADC : undefined);
  // realised artefacts: each process alone through the same leads, scaled by the gain and the filter's response in the
  // process's band (filters are linear; |H| at the band's frequency, squared for zero-phase): no extra filtering
  const stages = rec?.filter ? filterStages(rec.filter, fs) : [];
  const hAt = (f: number): number => {
    if (!stages.length) return 1;
    const m = magnitude(stages, f, fs);
    return rec!.filter!.phase === 'zero' ? m * m : m;
  };
  const emgBand = (): number => {
    const hi = Math.min(150, 0.45 * fs);
    let s2 = 0;
    for (let k = 0; k < 12; k++) s2 += hAt(20 * Math.pow(hi / 20, k / 11)) ** 2;
    return Math.sqrt(s2 / 12);
  };
  const noise = rec?.noise;
  const bandGain: Record<NoiseProcess, () => number> = {
    wander: () => hAt(0.25),
    emg: emgBand,
    tremor: () => hAt(noise?.tremor?.hz ?? 5),
    mains: () => hAt(noise?.mains?.hz ?? 50),
    pop: () => hAt(1),
    motion: () => hAt(4),
    leadOff: () => hAt(0.5),
  };
  let noiseMv = 0;
  const artefacts = new Set<FindingId>();
  const zero = new Float64Array(n);
  for (const p of NOISE_PROCESSES) {
    const m = procs[p];
    if (!m) continue;
    const k = Math.abs(g) * bandGain[p]();
    const st = leadStats(m.RA ?? zero, m.LA ?? zero, m.LL ?? zero, CHEST.map((c) => m[c] ?? zero), n);
    for (const { s2, lo, hi } of st) {
      const r = k * Math.sqrt(s2 / n);
      noiseMv = Math.max(noiseMv, r);
      if (p === 'wander' && k * (hi - lo) >= ARTEFACT_VISIBLE.wanderP2p) artefacts.add('baseline-wander');
      if ((p === 'emg' || p === 'tremor') && r >= ARTEFACT_VISIBLE.muscleRms) artefacts.add('muscle-tremor');
      // mains: a pure sinusoid before the filters, so its p2p scales exactly with |H(f)| (a notch removes it)
      if (p === 'mains' && k * (hi - lo) >= ARTEFACT_VISIBLE.mainsP2p) artefacts.add('ac-interference');
    }
  }
  return { leads: conv ? adc(leads, conv) : leads, noiseMv: Math.round(noiseMv * 1e4) / 1e4, artefacts: [...artefacts] };
}

/** Which artefact processes a noise spec switches on (for lesson captions and tests). */
export function activeProcesses(n: NoiseSpec | undefined): NoiseProcess[] {
  if (!n) return [];
  return NOISE_PROCESSES.filter((p) => {
    switch (p) {
      case 'wander': return (n.wanderMv ?? 0) > 0;
      case 'emg': return (n.emgMv ?? 0) > 0;
      case 'tremor': return (n.tremor?.mv ?? 0) > 0;
      case 'mains': return (n.mains?.mv ?? 0) > 0;
      case 'pop': return (n.pop?.mv ?? 0) !== 0;
      case 'motion': return (n.motion?.mv ?? 0) > 0;
      default: return !!n.leadOff;
    }
  });
}

/**
 * Recording layer of the difficulty ladder (DECISION §7): classic, subtle and borderline record on a clean chain (their
 * difficulty lies in the dial values: dials/draw.ts); noisy adds the diagnostic filter (0.05 Hz causal high-pass,
 * 150 Hz low-pass) and the noise of the `noise` dial at 0.3 mV — respiratory wander 0.3 mV, EMG 0.02 mV RMS on the
 * limb electrodes and 50 Hz mains (≈ 0.02 mV in a lead): clearly noisy, still readable (T6, tests/synth/dials/noisy.test.ts). generate() merges it over the scenario's recording.
 */
export function recordingForDifficulty(d: Difficulty): RecordingSpec {
  if (d !== 'noisy') return {};
  return { filter: FILTER_PRESETS.diagnostic, noise: { wanderMv: 0.3, emgMv: 0.02, mains: { mv: 0.05, hz: 50, imbalance: 0.25 } } };
}

/**
 * A noise spec that switches every artefact process off when merged over a scenario's recording (amplitudes 0):
 * `generate({ …, recording: { noise: SILENT_NOISE } })` is the noise-free twin of an artefact scenario — the same heart,
 * placement and filters (T2 measures that twin; the artefact itself is graded by the scenario's criteria).
 */
export const SILENT_NOISE: NoiseSpec = {
  wanderMv: 0,
  emgMv: 0,
  tremor: { mv: 0, hz: 5, on: 'RA' },
  mains: { mv: 0, hz: 50, imbalance: 0 },
  pop: { electrode: 'RA', tMs: 0, mv: 0 },
  motion: { electrode: 'RA', tMs: 0, durMs: 0, mv: 0 },
};
