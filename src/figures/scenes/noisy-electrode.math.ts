/**
 * Pure maths of the "noisy-electrode" scene (lesson f6, spec docs/design/f-explainers.md §4.9). No Preact, no DOM.
 *
 * One source. The block hands the scene a CLEAN synthetic ECG. The three limb potentials are recovered from the clean
 * leads in the Wilson gauge (Φ_RA + Φ_LA + Φ_LL = 0, the gauge of the engine's own assembly, src/synth/leads/assemble.ts):
 *   Φ_RA = −(I + II)/3,  Φ_LA = (2·I − II)/3,  Φ_LL = (2·II − I)/3,  Φ_Vk = Vk.
 * The artefact is added to ONE electrode potential, φ_e += a·n(t) — exactly where the engine's recording chain puts a
 * tremor or EMG (NoiseSpec.tremor.on / emgOn) — and the twelve leads are re-assembled by Einthoven / Goldberger / Wilson.
 * Nothing is drawn per lead; NOISE_FACTORS below are consequences of the formulas and the test's assertions.
 */
import type { EcgSignal } from '../../core/ecg';
import { CHEST_LEADS, LIMB_LEADS, type StdLead } from '../../core/leads';
import { createRng } from '../../core/rng';
import { clamp } from '../math/geom';
import type { Beat, BeatDef } from '../scene/timeline';
import { seg } from '../scene/timeline';
import { BEAT_IDS, type BeatId } from './noisy-electrode.i18n';

// ── constants ──────────────────────────────────────────────────────────────────────────────────────────────────

export const ELECTRODES = ['RA', 'LA', 'LL'] as const;
export type Electrode = (typeof ELECTRODES)[number];
export const NOISE_TYPES = ['tremor', 'mains', 'wander', 'emg'] as const;
export type NoiseType = (typeof NOISE_TYPES)[number];
export type LimbLead = (typeof LIMB_LEADS)[number];

/** Shown window: 2.5 s = three beats at the block's 72 /min, so the march-through is visible. */
export const WINDOW_MS = 2500;
/** Amplitude slider range (mV, peak). The engine's Parkinsonian preset uses 0.1 mV at 5 Hz on LL. */
export const AMP_MAX_MV = 0.3;
export const AMP_DEFAULT_MV = 0.15;
export const TREMOR_HZ = 5;
export const MAINS_HZ = 50;
export const WANDER_HZ = 0.3;
export const EMG_BAND_HZ: readonly [number, number] = [20, 60];

export type { BeatId };

/** Nominal beat lengths (ms). Keyed by BeatId, so a missing or stray beat is a compile error. */
const BEAT_MS: Readonly<Record<BeatId, number>> = { shake: 2200, find: 1600, move: 2300, heart: 1400 };
/** Narration beats (7.5 s), in the spec's order (BEAT_IDS, pinned by tests/figures/scene/spec.ts). */
export const BEATS: readonly BeatDef<BeatId>[] = BEAT_IDS.map((id) => ({ id, ms: BEAT_MS[id] }));
/** Wall-clock length of the tour over the length of the ECG window: the honest slow-motion factor (7.5 s / 2.5 s). */
export const SLOW = BEATS.reduce((s, b) => s + b.ms, 0) / WINDOW_MS;

/**
 * Signed factor of an electrode's noise n in each lead: lead = clean + factor · n. Read off the assembly formulas
 * (I = LA − RA, II = LL − RA, III = LL − LA, aVR = RA − (LA + LL)/2, …, Vk = Φk − (RA + LA + LL)/3).
 */
export const NOISE_FACTORS: Readonly<Record<Electrode, Readonly<Record<StdLead, number>>>> = {
  RA: { I: -1, II: -1, III: 0, aVR: 1, aVL: -0.5, aVF: -0.5, V1: -1 / 3, V2: -1 / 3, V3: -1 / 3, V4: -1 / 3, V5: -1 / 3, V6: -1 / 3 },
  LA: { I: 1, II: 0, III: -1, aVR: -0.5, aVL: 1, aVF: -0.5, V1: -1 / 3, V2: -1 / 3, V3: -1 / 3, V4: -1 / 3, V5: -1 / 3, V6: -1 / 3 },
  LL: { I: 0, II: 1, III: 1, aVR: -0.5, aVL: -0.5, aVF: 1, V1: -1 / 3, V2: -1 / 3, V3: -1 / 3, V4: -1 / 3, V5: -1 / 3, V6: -1 / 3 },
};

/** The bipolar lead that does not use the electrode (the clean one), its two noisy bipolar leads and its aV lead. */
export const CULPRIT: Readonly<Record<Electrode, { readonly clean: LimbLead; readonly noisy: readonly [LimbLead, LimbLead]; readonly aug: LimbLead }>> = {
  RA: { clean: 'III', noisy: ['I', 'II'], aug: 'aVR' },
  LA: { clean: 'II', noisy: ['I', 'III'], aug: 'aVL' },
  LL: { clean: 'I', noisy: ['II', 'III'], aug: 'aVF' },
};

/** The order the noise visits the electrodes during `move`, starting from the home electrode: LL → LA → RA cycle. */
export function tourOrder(home: Electrode): readonly [Electrode, Electrode, Electrode] {
  const cycle: readonly Electrode[] = ['LL', 'LA', 'RA'];
  const k = cycle.indexOf(home);
  return [cycle[k], cycle[(k + 1) % 3], cycle[(k + 2) % 3]];
}

// ── window ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The 2.5-s window of the record: starts 300 ms before the QRS of the second beat (away from the record edges) and
 * is clamped to the record. Whole milliseconds (the cursor is whole ms too).
 */
export function chooseWindow(qrsOn: readonly number[], durationMs: number): readonly [number, number] {
  const span = Math.min(WINDOW_MS, Math.max(1, durationMs - 2));
  const anchor = qrsOn.length > 1 ? qrsOn[1] : qrsOn.length ? qrsOn[0] : 300;
  const t0 = Math.round(clamp(anchor - 300, 0, durationMs - span));
  return [t0, t0 + span];
}

// ── noise generators (seeded, unit peak) ───────────────────────────────────────────────────────────────────────

/**
 * n(t) of one artefact over `n` samples at `fs`, peak-normalised to 1 (the amplitude slider is the peak in mV).
 * Seeded (createRng), so the same type and seed give the same sequence. tremor: 5 Hz under a slow irregular envelope;
 * mains: a 50-Hz sine; wander: a 0.3-Hz respiratory drift; emg: band-limited 20–60 Hz noise under a burst envelope.
 */
export function noiseSeries(type: NoiseType, n: number, fs: number, seed: number | string = 618): Float32Array {
  const rng = createRng(`noisy-electrode:${type}:${seed}`);
  const out = new Float32Array(n);
  const TAU = 2 * Math.PI;
  if (type === 'tremor') {
    const p0 = rng.range(0, TAU), p1 = rng.range(0, TAU), p2 = rng.range(0, TAU);
    for (let i = 0; i < n; i++) {
      const t = i / fs;
      const env = 0.6 + 0.25 * Math.sin(TAU * 0.37 * t + p1) + 0.15 * Math.sin(TAU * 0.61 * t + p2);
      out[i] = env * Math.sin(TAU * TREMOR_HZ * t + p0);
    }
  } else if (type === 'mains') {
    const p0 = rng.range(0, TAU);
    for (let i = 0; i < n; i++) out[i] = Math.sin(TAU * MAINS_HZ * (i / fs) + p0);
  } else if (type === 'wander') {
    const p0 = rng.range(0, TAU);
    for (let i = 0; i < n; i++) out[i] = Math.sin(TAU * WANDER_HZ * (i / fs) + p0);
  } else {
    // emg: 24 sinusoids spread over the band (band-limited by construction), random phases and weights, burst envelope
    const K = 24;
    const f: number[] = [], ph: number[] = [], w: number[] = [];
    for (let k = 0; k < K; k++) {
      f.push(EMG_BAND_HZ[0] + ((k + rng.next()) / K) * (EMG_BAND_HZ[1] - EMG_BAND_HZ[0]));
      ph.push(rng.range(0, TAU));
      w.push(rng.range(0.4, 1));
    }
    const e1 = rng.range(0, TAU), e2 = rng.range(0, TAU);
    for (let i = 0; i < n; i++) {
      const t = i / fs;
      let s = 0;
      for (let k = 0; k < K; k++) s += w[k] * Math.sin(TAU * f[k] * t + ph[k]);
      const env = 0.55 + 0.3 * Math.sin(TAU * 1.3 * t + e1) + 0.15 * Math.sin(TAU * 2.9 * t + e2);
      out[i] = s * env;
    }
  }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) for (let i = 0; i < n; i++) out[i] /= peak;
  return out;
}

// ── potentials and re-assembly ─────────────────────────────────────────────────────────────────────────────────

export type Leads12 = Readonly<Record<StdLead, Float32Array>>;

/** Sample index range [i0, i0 + n) of a window of the signal. */
export function sampleRange(sig: EcgSignal, win: readonly [number, number]): { readonly i0: number; readonly n: number } {
  const i0 = Math.max(0, Math.floor((win[0] * sig.fs) / 1000));
  const i1 = Math.min(sig.leads.I.length - 1, Math.ceil((win[1] * sig.fs) / 1000));
  return { i0, n: Math.max(1, i1 - i0 + 1) };
}

/**
 * The twelve leads over the window with an artefact a·n(t) on one electrode potential: potentials recovered from the
 * clean I, II and V1–V6 in the Wilson gauge, the chosen one perturbed, every lead re-assembled by the formulas.
 * `noise` is the unit series of the window (noiseSeries); `ampMv` its peak in mV (0 → the clean leads, bit for bit).
 */
export function assembleNoisy(sig: EcgSignal, win: readonly [number, number], electrode: Electrode, noise: Float32Array, ampMv: number): Leads12 {
  const { i0, n } = sampleRange(sig, win);
  const I = sig.leads.I, II = sig.leads.II;
  const mk = (): Float32Array => new Float32Array(n);
  const out = { I: mk(), II: mk(), III: mk(), aVR: mk(), aVL: mk(), aVF: mk(), V1: mk(), V2: mk(), V3: mk(), V4: mk(), V5: mk(), V6: mk() };
  const chest = CHEST_LEADS.map((l) => sig.leads[l]);
  for (let j = 0; j < n; j++) {
    const i = i0 + j;
    const a = I[i], b = II[i];
    let r = -(a + b) / 3, l = (2 * a - b) / 3, f = (2 * b - a) / 3;
    const d = ampMv * (noise[j] ?? 0);
    if (electrode === 'RA') r += d;
    else if (electrode === 'LA') l += d;
    else f += d;
    const wct = (r + l + f) / 3; // = d / 3
    out.I[j] = l - r;
    out.II[j] = f - r;
    out.III[j] = f - l;
    out.aVR[j] = r - (l + f) / 2;
    out.aVL[j] = l - (r + f) / 2;
    out.aVF[j] = f - (r + l) / 2;
    for (let k = 0; k < 6; k++) out[CHEST_LEADS[k]][j] = chest[k][i] - wct;
  }
  return out;
}

/** An EcgSignal of the window alone (time origin = the window start), so strip helpers can draw it. */
export function windowSignal(sig: EcgSignal, win: readonly [number, number], leads: Leads12): EcgSignal {
  const { n } = sampleRange(sig, win);
  return { fs: sig.fs, durationMs: (n * 1000) / sig.fs, leads };
}

export function rms(x: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, x.length));
}

/** rms of (noisy − clean) per lead, divided by the rms of a·n: the measured |factor| of each lead. */
export function measuredFactors(clean: Leads12, noisy: Leads12, noise: Float32Array, ampMv: number): Record<StdLead, number> {
  const ref = rms(noise) * ampMv;
  const out = {} as Record<StdLead, number>;
  for (const l of [...LIMB_LEADS, ...CHEST_LEADS]) {
    const a = clean[l], b = noisy[l];
    const d = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) d[i] = b[i] - a[i];
    out[l] = ref > 0 ? rms(d) / ref : 0;
  }
  return out;
}

/**
 * QRS onset near an expected time (ms from the window start): the PR-segment level is the mean of [expect − 50,
 * expect − 20] ms; the onset is the first sample in [expect − 20, expect + 60] ms that leaves it by ≥ 0.015 mV. Used by
 * the tests to show nothing moved in the clean lead.
 */
export function qrsOnsetNear(x: ArrayLike<number>, fs: number, expectMs: number): number {
  const at = (ms: number) => Math.min(x.length - 1, Math.max(0, Math.round((ms * fs) / 1000)));
  let base = 0;
  const b0 = at(expectMs - 50), b1 = at(expectMs - 20);
  for (let i = b0; i <= b1; i++) base += x[i];
  base /= Math.max(1, b1 - b0 + 1);
  for (let i = b1; i <= at(expectMs + 60); i++) if (Math.abs(x[i] - base) >= 0.015) return (i * 1000) / fs;
  return expectMs;
}

// ── placement ──────────────────────────────────────────────────────────────────────────────────────────────────

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
export type ChestLead = (typeof CHEST_LEADS)[number];
export interface Placement {
  readonly w: number;
  readonly h: number;
  /** the torso drawing (its path is authored in a 190 × 280 box) */
  readonly torso: Rect;
  /** electrode centres as fractions (0…1) of the torso rect */
  readonly plug: Readonly<Record<Electrode, readonly [number, number]>>;
  readonly limb: Readonly<Record<LimbLead, Rect>>;
  readonly chest: Readonly<Record<ChestLead, Rect>>;
  /** the culprit table: top-left, width and row pitch */
  readonly table: { readonly x: number; readonly y: number; readonly w: number; readonly row: number };
  /** the rule label: top-left and wrap length in characters */
  readonly rule: readonly [number, number, number];
  /** the verdict callout ("artefact, not flutter"): top-left */
  readonly verdict: readonly [number, number];
}

function grid<K extends StdLead>(x: number, y: number, w: number, h: number, cols: number, gapX: number, gapY: number, ids: readonly K[]): Record<K, Rect> {
  const out = {} as Record<K, Rect>;
  ids.forEach((id, k) => {
    out[id] = { x: x + (k % cols) * (w + gapX), y: y + Math.floor(k / cols) * (h + gapY), w, h };
  });
  return out;
}

const PLUG: Placement['plug'] = { RA: [0.25, 0.36], LA: [0.75, 0.36], LL: [0.64, 0.93] };

/** Hit radius of an electrode (user units): 2 × 17 × 560 / 760 ≈ 25 px at the wide breakpoint, ≥ 24 px (README §7). */
export const HIT_R = 17;

/** Wide (≥ 560 px): torso left, the 3 × 2 limb strips and the thin V row right, the table under the strips. */
export const PLACEMENT_WIDE: Placement = {
  w: 760,
  h: 440,
  torso: { x: 6, y: 6, w: 190, h: 280 },
  plug: PLUG,
  limb: grid(212, 6, 266, 84, 2, 14, 8, LIMB_LEADS),
  chest: grid(212, 284, 86, 52, 6, 4, 0, CHEST_LEADS),
  table: { x: 212, y: 350, w: 546, row: 23 },
  rule: [8, 312, 24],
  verdict: [8, 372],
};

/** Narrow (< 560 px): torso and rule on top, strips two per row, the V row, the table. */
export const PLACEMENT_NARROW: Placement = {
  w: 420,
  h: 680,
  torso: { x: 6, y: 6, w: 150, h: 221 },
  plug: PLUG,
  limb: grid(6, 236, 200, 78, 2, 8, 8, LIMB_LEADS),
  chest: grid(6, 500, 66, 48, 6, 2.4, 0, CHEST_LEADS),
  table: { x: 6, y: 568, w: 408, row: 26 },
  rule: [170, 60, 20],
  verdict: [170, 120],
};

export function placementFor(widthPx: number): Placement {
  return widthPx < 560 ? PLACEMENT_NARROW : PLACEMENT_WIDE;
}

/** The twelve leads in strip order: six limb strips, then the chest row. */
export const ALL_LEADS: readonly StdLead[] = [...LIMB_LEADS, ...CHEST_LEADS];
export function isLimb(l: StdLead): l is LimbLead {
  return (LIMB_LEADS as readonly StdLead[]).includes(l);
}
/** The strip rect of a lead in a placement. */
export function stripRect(pl: Placement, l: StdLead): Rect {
  return isLimb(l) ? pl.limb[l] : pl.chest[l as ChestLead];
}

/** The torso outline, authored in a 190 × 280 box (scaled into Placement.torso). */
export const TORSO_PATH =
  'M95 8a20 20 0 1 0 0.01 0zM60 58H130Q150 58 152 78L158 170Q158 185 145 185H45Q32 185 32 170L38 78Q40 58 60 58zM38 70L22 140L34 150L52 94zM152 70L168 140L156 150L138 94zM46 185L42 272H70L84 195zM106 195L120 272H148L144 185z';

/** Electrode centre in stage coordinates. */
export function plugAt(pl: Placement, e: Electrode): readonly [number, number] {
  const [fx, fy] = pl.plug[e];
  return [pl.torso.x + fx * pl.torso.w, pl.torso.y + fy * pl.torso.h];
}

/**
 * Strip mapping at 25 mm/s and 10 mm/mV on the strip's own mm: x from window ms, y from mV (baseline at 53 %, so the
 * noisiest re-assembly at AMP_MAX_MV — R plus noise up, aVR's QRS plus noise down — stays inside the paper).
 */
export function stripScale(r: Rect): { readonly mm: number; readonly x: (tMs: number) => number; readonly y: (mv: number) => number } {
  const mm = r.w / ((WINDOW_MS / 1000) * 25);
  return { mm, x: (tMs) => r.x + (mm * 25 * tMs) / 1000, y: (mv) => r.y + r.h * 0.53 - mv * 10 * mm };
}

// ── frame ──────────────────────────────────────────────────────────────────────────────────────────────────────

export interface SceneInput {
  /** the electrode the noise lives on outside the tour (default LL) */
  readonly home: Electrode;
}

/** Flat per-frame state. Every value is continuous in p; the component only maps numbers to attributes. */
export interface Frame {
  /** 0 … 1 multiplier of the slider amplitude (ramps up during `shake`) */
  readonly gain: number;
  /** opacity of each electrode's exact re-assembly (crossfade weights; they sum to 1) */
  readonly w: Readonly<Record<Electrode, number>>;
  /** factor chips beside the strips */
  readonly chips: number;
  /** emphasis of the two noisy bipolar strips and the "largest aV" / "clean" tags */
  readonly hi: number;
  /** one pulse of the ring around the culprit electrode (0 at both ends of `find`) */
  readonly pulse: number;
  /** the rule label */
  readonly rule: number;
  /** opacity of each table row */
  readonly rows: Readonly<Record<Electrode, number>>;
  /** QRS outlines + RR bracket */
  readonly outline: number;
  /** "artefact, not flutter" + the 5 Hz = 300 /min label */
  readonly verdict: number;
}

const one = (e: Electrode): Record<Electrode, number> => ({ RA: e === 'RA' ? 1 : 0, LA: e === 'LA' ? 1 : 0, LL: e === 'LL' ? 1 : 0 });
const mix = (a: Electrode, b: Electrode, f: number): Record<Electrode, number> => {
  const out = { RA: 0, LA: 0, LL: 0 };
  out[a] += 1 - f;
  out[b] += f;
  return out;
};

/** Local progress 0…1 of p inside beat `id` (0 before, 1 after). */
function localOf(beats: readonly Beat<BeatId>[], id: BeatId, p: number): number {
  const b = beats.find((x) => x.id === id);
  if (!b) return 0;
  if (b.to <= b.from) return p >= b.from ? 1 : 0;
  return clamp((p - b.from) / (b.to - b.from), 0, 1);
}

export function frame(p: number, beats: readonly Beat<BeatId>[], s: SceneInput): Frame {
  const [home, e1, e2] = tourOrder(s.home);
  const lS = localOf(beats, 'shake', p);
  const lF = localOf(beats, 'find', p);
  const lM = localOf(beats, 'move', p);
  const lH = localOf(beats, 'heart', p);

  // shake: the clean strips are on the paper from p = 0 and the shared ECG cursor is the moving element (the window's
  // ECG time, timeOfP, at the honest ×3); the artefact grows continuously on the home electrode; chips fade in
  const gain = seg(lS, 0.08, 0.7);
  const chips = seg(lS, 0.6, 1);

  // find: the two noisy bipolar strips light up, the electrode pulses once, the rule appears, first table row
  const hi = seg(lF, 0, 0.35);
  const pulse = lF <= 0 || lF >= 1 ? 0 : Math.sin(Math.PI * clamp((lF - 0.05) / 0.6, 0, 1));
  const rule = seg(lF, 0.3, 0.6);
  const row0 = seg(lF, 0.55, 0.85);

  // move: two crossfades between exact re-assemblies, home → e1 → e2; each lands a table row
  const m1 = seg(lM, 0.08, 0.4);
  const m2 = seg(lM, 0.55, 0.88);
  const row1 = seg(lM, 0.32, 0.5);
  const row2 = seg(lM, 0.8, 1);

  // heart: back to home, then the QRS outlines march through and the verdict lands
  const back = seg(lH, 0.04, 0.3);
  const outline = seg(lH, 0.3, 0.6);
  const verdict = seg(lH, 0.6, 0.9);

  let w: Record<Electrode, number>;
  if (lM <= 0) w = one(home);
  else if (lM < 1) w = lM < 0.5 ? mix(home, e1, m1) : mix(e1, e2, m2);
  else w = mix(e2, home, back);

  const rows = { RA: 0, LA: 0, LL: 0 };
  rows[home] = row0;
  rows[e1] = row1;
  rows[e2] = row2;

  return { gain, w, chips, hi, pulse, rule, rows, outline, verdict };
}

/**
 * Blend two per-electrode sets (a reveal moving the noise: old home → new home, f eased 0 → 1): the crossfade weights
 * (sums stay 1) and the table-row opacities of the two tour orders, so nothing re-maps in one frame.
 */
export function blendWeights(a: Readonly<Record<Electrode, number>>, b: Readonly<Record<Electrode, number>>, f: number): Record<Electrode, number> {
  const g = clamp(f, 0, 1);
  const h = 1 - g; // a·(1 − g) + b·g: exactly a at g = 0 and exactly b at g = 1
  return { RA: a.RA * h + b.RA * g, LA: a.LA * h + b.LA * g, LL: a.LL * h + b.LL * g };
}

/** The electrode whose state is drawn on top (the heaviest weight). */
export function dominant(w: Readonly<Record<Electrode, number>>): Electrode {
  return ELECTRODES.reduce((best, e) => (w[e] > w[best] ? e : best), 'LL' as Electrode);
}

/** Correct Predict answer: the bipolar lead that does not use the home electrode. */
export function cleanLeadOf(e: Electrode): LimbLead {
  return CULPRIT[e].clean;
}

/** Factor chip of a lead ("+n", "−½n", "0", "−⅓n"). */
export function factorLabel(f: number): string {
  if (Math.abs(f) < 1e-12) return '0';
  const sign = f < 0 ? '−' : '+';
  const a = Math.abs(f);
  const mag = Math.abs(a - 1) < 1e-9 ? '' : Math.abs(a - 0.5) < 1e-9 ? '½' : Math.abs(a - 1 / 3) < 1e-9 ? '⅓' : String(Math.round(a * 100) / 100);
  return `${sign}${mag}n`;
}

/** The QRS complexes wholly inside the window (record ms) and the RR between the first two (ms; 0 if fewer). */
export function qrsInWindow<B extends { readonly qrsOn: number; readonly qrsOff: number }>(
  beats: readonly B[],
  win: readonly [number, number],
): { readonly qrs: readonly B[]; readonly rr: number } {
  const qrs = beats.filter((b) => b.qrsOn >= win[0] && b.qrsOff <= win[1]);
  return { qrs, rr: qrs.length > 1 ? Math.round(qrs[1].qrsOn - qrs[0].qrsOn) : 0 };
}

/** Visual jitter of an electrode (user units) at window time t for n(t), gain and amplitude. */
export function jitterPx(noise: Float32Array, fs: number, tMs: number, gain: number, ampMv: number, type: NoiseType): number {
  const i = clamp(Math.round((tMs * fs) / 1000), 0, Math.max(0, noise.length - 1));
  const v = noise[i] ?? 0;
  const scale = type === 'mains' || type === 'emg' ? 1.5 : 3.5;
  return v * gain * (ampMv / AMP_MAX_MV) * scale;
}
