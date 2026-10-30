/**
 * DEV / TEST FIXTURE — not the synthetic engine (src/synth). A tiny one-source ECG for checking the viewer: a single
 * cardiac dipole H(t) built from Gaussian lobes (P; septal, free-wall and basal QRS; ST injury plateau; T; U) is
 * projected on fixed lead vectors. I and II are projections, III / aVR / aVL / aVF come from Einthoven / Goldberger
 * (deriveLimbLeads) and the precordials are projections referenced to the central terminal, so the 12 leads always
 * agree with each other. Truth fiducials are the lobe edges (centre ± 2.5 σ); ST deviations and axes are measured on
 * the generated samples, so the truth agrees with the signal by construction. Randomness: seeded (core/rng).
 */
import { type AtrialEvent, type BeatMarks, type Ecg, type EcgTruth, sampleAt } from '../../core/ecg';
import type { FindingId } from '../../core/findings';
import { deriveLimbLeads, type ExtraLead, type StdLead } from '../../core/leads';
import { createRng } from '../../core/rng';

export type Vec3 = readonly [number, number, number];

export interface FixtureOptions {
  readonly fs?: number;
  readonly durationMs?: number;
  readonly hrBpm?: number;
  /** P onset → QRS onset (ms) */
  readonly prMs?: number;
  readonly seed?: number;
  /** ± uniform jitter of each PP interval (ms); 0 = perfectly regular */
  readonly rrJitterMs?: number;
  /** injury vector added over the ST segment (mV, x left · y inferior · z anterior) */
  readonly st?: Vec3;
  /** pre-excitation: short PR and a δ wave */
  readonly wpw?: boolean;
  /** Osborn J wave after the QRS */
  readonly jWave?: boolean;
  readonly uWave?: boolean;
  /** every Nth P wave is not conducted (0 = all conducted) */
  readonly blockedEvery?: number;
  /** also produce V3R, V4R, V7–V9 */
  readonly extraLeads?: boolean;
  readonly findings?: readonly FindingId[];
  readonly rhythm?: FindingId;
  readonly scenarioId?: string;
}

/** Lead vectors (x left, y inferior, z anterior) for the projected leads. */
const LIMB_VEC = { I: [1, 0, 0] as Vec3, II: [0.5, Math.sqrt(3) / 2, 0] as Vec3 };
const PRE_ANGLE: Readonly<Record<'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6' | ExtraLead, number>> = {
  V1: 115,
  V2: 95,
  V3: 75,
  V4: 55,
  V5: 30,
  V6: 5,
  V3R: 135,
  V4R: 150,
  V7: -20,
  V8: -40,
  V9: -60,
};
const PRE_GAIN = 1.4;
const preVec = (deg: number): Vec3 => {
  const r = (deg * Math.PI) / 180;
  return [PRE_GAIN * Math.cos(r), PRE_GAIN * 0.1, PRE_GAIN * Math.sin(r)];
};

const norm = (v: Vec3): Vec3 => {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
};

interface Lobe {
  readonly c: number;
  /** σ before and after the centre (ms) */
  readonly s1: number;
  readonly s2: number;
  readonly v: Vec3;
}

/** Smooth plateau 0 → 1 → 0 with raised-cosine ramps [a, b] up and [c, d] down. */
interface Plateau {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly v: Vec3;
}

const lobe = (c: number, s1: number, s2: number, amp: number, dir: Vec3): Lobe => {
  const n = norm(dir);
  return { c, s1, s2, v: [n[0] * amp, n[1] * amp, n[2] * amp] };
};

export function makeFixtureEcg(o: FixtureOptions = {}): Ecg {
  const fs = o.fs ?? 500;
  const durationMs = o.durationMs ?? 10000;
  const hr = o.hrBpm ?? 72;
  const seed = o.seed ?? 1;
  const rng = createRng(seed);
  const pp = 60000 / hr;
  const wpw = o.wpw ?? false;
  const pr = o.prMs ?? (wpw ? 110 : 160);
  const rr = pp;
  const qt = Math.round(400 * Math.sqrt(rr / 1000));
  const qrsShift = wpw ? 30 : 0;

  const lobes: Lobe[] = [];
  const plateaus: Plateau[] = [];
  const beats: BeatMarks[] = [];
  const atrial: AtrialEvent[] = [];
  let tP = 250;
  for (let k = 0; ; k++) {
    if (k > 0) tP += pp + (o.rrJitterMs ? rng.range(-o.rrJitterMs, o.rrJitterMs) : 0);
    const blocked = (o.blockedEvery ?? 0) > 0 && (k + 1) % (o.blockedEvery ?? 1) === 0;
    const qrsOn = tP + pr;
    const qrsEnd = qrsOn + qrsShift + 92;
    const j = o.jWave ? qrsEnd + 32 : qrsEnd;
    const tOff = qrsOn + qt + qrsShift;
    const tPeak = tOff - 100;
    const uOff = o.uWave ? tOff + 125 : null;
    const end = blocked ? tP + 100 : (uOff ?? tOff);
    if (end + 20 > durationMs) break;
    lobes.push(lobe(tP + 50, 20, 20, 0.15, [0.55, 0.8, 0.25]));
    if (blocked) {
      atrial.push({ t: tP, kind: 'sinus', conductedTo: null, visible: true });
      continue;
    }
    if (wpw) lobes.push(lobe(qrsOn + 40, 16, 16, 0.35, [0.6, 0.3, 0.6]));
    const q0 = qrsOn + qrsShift;
    lobes.push(lobe(q0 + 18, 7, 7, 0.25, [-0.55, 0.35, 0.75]));
    lobes.push(lobe(q0 + 45, 11, 11, 1.5, [0.72, 0.62, -0.32]));
    lobes.push(lobe(q0 + 72, 8, 8, 0.35, [-0.35, -0.7, -0.4]));
    if (o.jWave) lobes.push(lobe(qrsEnd + 12, 8, 8, 0.25, [0.6, 0.7, 0.4]));
    lobes.push(lobe(tPeak, 60, 40, 0.35, [0.62, 0.7, 0.1]));
    if (o.uWave) lobes.push(lobe(tOff + 70, 22, 22, 0.06, [0.62, 0.7, 0.1]));
    if (o.st) plateaus.push({ a: j - 20, b: j, c: tPeak, d: tOff, v: o.st });
    atrial.push({ t: tP, kind: 'sinus', conductedTo: beats.length, visible: true });
    beats.push({ kind: 'sinus', pOn: tP, pOff: tP + 100, qrsOn, qrsOff: qrsEnd, j, tPeak, tOff, uOff, aberrant: false });
  }

  // Dipole samples
  const n = Math.round((durationMs * fs) / 1000);
  const H = [new Float64Array(n), new Float64Array(n), new Float64Array(n)];
  for (const l of lobes) {
    const i0 = Math.max(0, Math.floor(((l.c - 4 * l.s1) * fs) / 1000));
    const i1 = Math.min(n - 1, Math.ceil(((l.c + 4 * l.s2) * fs) / 1000));
    for (let i = i0; i <= i1; i++) {
      const t = (i * 1000) / fs;
      const s = t < l.c ? l.s1 : l.s2;
      const g = Math.exp(-0.5 * ((t - l.c) / s) ** 2);
      H[0][i] += l.v[0] * g;
      H[1][i] += l.v[1] * g;
      H[2][i] += l.v[2] * g;
    }
  }
  const ramp = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, x)));
  for (const p of plateaus) {
    const i0 = Math.max(0, Math.floor((p.a * fs) / 1000));
    const i1 = Math.min(n - 1, Math.ceil((p.d * fs) / 1000));
    for (let i = i0; i <= i1; i++) {
      const t = (i * 1000) / fs;
      const e = t < p.b ? ramp((t - p.a) / (p.b - p.a)) : t > p.c ? 1 - ramp((t - p.c) / (p.d - p.c)) : 1;
      H[0][i] += p.v[0] * e;
      H[1][i] += p.v[1] * e;
      H[2][i] += p.v[2] * e;
    }
  }
  const project = (v: Vec3): Float32Array => {
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = H[0][i] * v[0] + H[1][i] * v[1] + H[2][i] * v[2];
    return out;
  };
  const I = project(LIMB_VEC.I);
  const II = project(LIMB_VEC.II);
  const limb = deriveLimbLeads(I, II);
  const leads: Record<string, Float32Array> = { I, II, ...limb };
  for (const l of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) leads[l] = project(preVec(PRE_ANGLE[l]));
  if (o.extraLeads) for (const l of ['V3R', 'V4R', 'V7', 'V8', 'V9'] as const) leads[l] = project(preVec(PRE_ANGLE[l]));

  // Truth measured on the samples
  const ref = beats[Math.min(1, beats.length - 1)];
  const stMv: Partial<Record<StdLead | ExtraLead, number>> = {};
  const area = (a: Float32Array, t0: number, t1: number) => {
    let s = 0;
    for (let i = Math.round((t0 * fs) / 1000); i <= Math.round((t1 * fs) / 1000); i++) s += a[i] ?? 0;
    return s;
  };
  const axis = (t0: number, t1: number) => {
    const x = area(leads.I, t0, t1), y = area(leads.aVF, t0, t1);
    return Math.round((Math.atan2(y, x) * 180) / Math.PI);
  };
  if (ref) {
    for (const [name, a] of Object.entries(leads)) {
      const base = mean(a, fs, (ref.pOff ?? ref.qrsOn - 20) + 4, ref.qrsOn - 4);
      stMv[name as StdLead] = round3(sampleAt(a, fs, ref.j + 60) - base);
    }
  }
  const qtMs = ref ? ref.tOff - ref.qrsOn : qt;
  const truth: EcgTruth = {
    rhythm: o.rhythm ?? 'sinus-rhythm',
    findings: [
      ...(o.findings ?? ['sinus-rhythm']),
      ...(wpw && !(o.findings ?? []).includes('wpw') ? (['wpw'] as const) : []),
      ...(o.jWave && !(o.findings ?? []).includes('osborn-waves') ? (['osborn-waves'] as const) : []),
    ],
    regular: !o.rrJitterMs && !o.blockedEvery,
    hrBpm: Math.round(beats.length > 1 ? 60000 / ((beats[beats.length - 1].qrsOn - beats[0].qrsOn) / (beats.length - 1)) : hr),
    atrialRateBpm: Math.round(hr),
    prMs: ref ? ref.qrsOn - (ref.pOn ?? ref.qrsOn) : pr,
    qrsMs: ref ? ref.qrsOff - ref.qrsOn : 92,
    qtMs,
    qtcBazettMs: Math.round(qtMs / Math.sqrt(rr / 1000)),
    qtcFridericiaMs: Math.round(qtMs / Math.cbrt(rr / 1000)),
    axisDeg: ref
      ? { p: axis(ref.pOn ?? ref.qrsOn, ref.pOff ?? ref.qrsOn), qrs: axis(ref.qrsOn, ref.qrsOff), t: axis(ref.j, ref.tOff) }
      : { p: null, qrs: 0, t: 0 },
    beats,
    atrial,
    stMv,
    facts: {},
  };
  return {
    origin: { kind: 'synthetic', scenarioId: o.scenarioId ?? 'dev-fixture', seed },
    signal: { fs, durationMs, leads: leads as unknown as Ecg['signal']['leads'] },
    truth,
    regions: null,
  };
}

function mean(a: Float32Array, fs: number, t0: number, t1: number): number {
  const i0 = Math.max(0, Math.round((t0 * fs) / 1000)), i1 = Math.min(a.length - 1, Math.round((t1 * fs) / 1000));
  let s = 0;
  for (let i = i0; i <= i1; i++) s += a[i];
  return i1 >= i0 ? s / (i1 - i0 + 1) : 0;
}
const round3 = (v: number) => Math.round(v * 1000) / 1000;

/** Named presets for the dev demo. */
export const FIXTURE_PRESETS = {
  normal: { hrBpm: 72, uWave: true, findings: ['sinus-rhythm', 'normal-ecg'] },
  inferiorStemi: { hrBpm: 80, st: [-0.08, 0.28, 0.02], findings: ['sinus-rhythm', 'stemi-inferior', 'reciprocal-changes'] },
  anteriorStemi: { hrBpm: 90, st: [0.05, -0.02, 0.26], findings: ['sinus-rhythm', 'stemi-anterior'] },
  wpw: { hrBpm: 75, wpw: true, findings: ['sinus-rhythm'] },
  osborn: { hrBpm: 50, jWave: true, findings: ['sinus-bradycardia', 'hypothermia'], rhythm: 'sinus-bradycardia' },
  mobitz2: { hrBpm: 84, blockedEvery: 4, findings: ['sinus-rhythm', 'av-block-2-mobitz2'] },
  irregular: { hrBpm: 95, rrJitterMs: 160, durationMs: 20000, findings: ['sinus-arrhythmia'], rhythm: 'sinus-arrhythmia' },
} as const satisfies Readonly<Record<string, FixtureOptions>>;
export type FixturePreset = keyof typeof FIXTURE_PRESETS;
