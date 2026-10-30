/**
 * Atrial fibrillation as independent wavelet streams (multiple-wavelet hypothesis; DECISION §6.6, §11).
 * Each stream is a renewal process of contiguous activation cycles: in one cycle a wavefront sweeps under its region,
 * so the local dipole points one way then reverses (a biphasic, zero-mean deflection). Cycle length (≥ 20 % jitter),
 * shape, amplitude and direction drift from cycle to cycle; streams superpose into irregular f waves. Judges' fix: an
 * amplitude floor per stream and four streams, so f waves are present in every 1 s window of II and V1 (no long flat
 * stretches). `coarseness` 0 (fine, < 0.5 mm) … 1 (coarse, > 1 mm). Every stream cycle reaches the AV node (the
 * bombardment that, through the node's refractoriness and concealment, gives the irregular ventricular response).
 * Provenance: prototype B `fibrillation`, re-tuned in the port.
 */
import type { Rng } from '../../core/rng';
import type { Vec3 } from '../api';
import { scale } from '../frame';
import { lobeArea, lobeWithArea, type Lobe } from '../kernel/kernel';

interface Stream {
  readonly cycleK: number;
  readonly dir: Vec3;
  readonly spread: number;
  /** amplitude range (mV) at coarseness 0.5 */
  readonly amp: readonly [number, number];
  readonly region: 'ra' | 'la';
}

/** Location of the f-wave sources: null = plain Dower field (prototype B; the atrial-centroid field halved V1). */
const AF_LOC: Vec3 | null = null;

/** f-wave apex shapes (a small discrete set keeps the shape-constant cache tiny) */
const F_SHAPES = [1.5, 1.7, 1.9, 2, 2.2] as const;

const STREAMS: readonly Stream[] = [
  { cycleK: 0.97, dir: [-0.3, 0.55, -0.78], spread: 0.42, amp: [0.04, 0.075], region: 'ra' },
  { cycleK: 0.86, dir: [0.1, 0.9, -0.3], spread: 0.45, amp: [0.03, 0.05], region: 'ra' },
  { cycleK: 1.07, dir: [0.45, 0.6, 0.55], spread: 0.45, amp: [0.025, 0.045], region: 'la' },
  { cycleK: 1.18, dir: [-0.1, 0.35, -0.93], spread: 0.45, amp: [0.025, 0.045], region: 'la' },
];

export interface FibCycle {
  /** absolute start time of the wavelet cycle */
  readonly t: number;
  /** lobes relative to `t` */
  readonly lobes: readonly Lobe[];
  /** stream index (3D state: per-stream phase) */
  readonly stream: number;
  readonly region: 'ra' | 'la';
  readonly cycleMs: number;
}

export function fibrillationCycles(coarseness: number, cycleMs: number, t0: number, t1: number, rng: Rng, mirror = false): FibCycle[] {
  const out: FibCycle[] = [];
  // amplitude scale: coarseness 0 → fine (< 0.5 mm), 0.5 → medium (≈ 1 mm in V1), 1 → coarse (> 1.5 mm)
  const ampK = 0.25 + 1.0 * Math.min(1, Math.max(0, coarseness));
  const mx = (v: Vec3): Vec3 => (mirror ? [-v[0], v[1], v[2]] : v);
  STREAMS.forEach((s, si) => {
    const r = rng.fork(`stream:${si}`);
    const mean = cycleMs * s.cycleK;
    const jitter = 0.24 * mean;
    let t = t0 - r.range(0, mean);
    let d: Vec3 = s.dir;
    const lo = s.amp[0] * ampK, hi = s.amp[1] * ampK;
    let amp = r.range(lo, hi);
    while (t < t1) {
      d = [
        0.72 * d[0] + 0.28 * s.dir[0] + s.spread * r.normal(),
        0.72 * d[1] + 0.28 * s.dir[1] + s.spread * r.normal(),
        0.72 * d[2] + 0.28 * s.dir[2] + s.spread * r.normal(),
      ];
      amp = Math.min(hi, Math.max(lo, amp + 0.3 * (hi - lo) * r.normal()));
      const c = Math.min(1.6 * mean, Math.max(0.6 * mean, mean + jitter * r.normal()));
      const m = c * r.range(0.36, 0.64);
      const q1 = r.pick(F_SHAPES), q2 = r.pick(F_SHAPES);
      const regions = [[s.region, 1]] as const;
      const loc = AF_LOC ? mx(AF_LOC) : null;
      const fPlus: Lobe = { label: 'f+', on: 0, peak: m * r.range(0.35, 0.65), end: m, endRule: 'edge', q: q1, dir: mx(d), dir2: null, amp, regions, loc, far: 1, wave: 'f' };
      // a wavefront passing under its region gives a biphasic deflection with zero net area (activation then
      // recovery of the same tissue): the second half is shaped freely but its area vector cancels the first
      const peak2 = m + (c - m) * r.range(0.35, 0.65);
      const fMinus = lobeWithArea({ label: 'f−', on: m, peak: peak2, end: c, endRule: 'edge', q: q2, regions, loc, far: 1, wave: 'f' }, scale(lobeArea(fPlus), -1));
      out.push({ t, stream: si, region: s.region, cycleMs: c, lobes: [fPlus, fMinus] });
      t += c;
    }
  });
  out.sort((a, b) => a.t - b.t);
  return out;
}

// ── ventricular fibrillation and ventricular flutter ─────────────────────────────────────────────────────────────
/** VF wavelet streams: ventricular sources, 4–8 Hz, direction and amplitude drifting cycle to cycle (renewal). */
const VF_STREAMS: readonly { readonly dir: Vec3; readonly cycleK: number; readonly regions: readonly (readonly ['lv-apex' | 'rv-mid' | 'lv-mid-inferolateral' | 'lv-mid-anterior', number])[] }[] = [
  { dir: [0.7, 0.5, 0.5], cycleK: 1.0, regions: [['lv-mid-inferolateral', 1]] },
  { dir: [-0.6, 0.3, -0.7], cycleK: 0.88, regions: [['rv-mid', 1]] },
  { dir: [0.3, -0.8, -0.4], cycleK: 1.13, regions: [['lv-mid-anterior', 1]] },
];

export interface VentWave {
  readonly t: number;
  readonly lobes: readonly Lobe[];
  readonly stream: number;
}

/**
 * Ventricular fibrillation (DECISION §6.7): three ventricular wavelet streams, mean cycle 170 ms (≈ 6 Hz, range 4–8 Hz)
 * with 25 % jitter; each cycle is a biphasic zero-net deflection whose direction drifts. `coarseness` 0 → fine VF
 * (≈ 0.1–0.25 mV peak to peak in the limb leads: easily taken for asystole), 0.75 → coarse (≈ 1–2 mV).
 */
export function vfCycles(coarseness: number, t0: number, t1: number, rng: Rng): VentWave[] {
  const out: VentWave[] = [];
  const ampK = 0.01 + 0.6 * Math.min(1, Math.max(0, coarseness));
  VF_STREAMS.forEach((s, si) => {
    const r = rng.fork(`vf:${si}`);
    const mean = 170 * s.cycleK;
    let t = t0 - r.range(0, mean);
    let d: Vec3 = s.dir;
    let amp = ampK * r.range(0.7, 1.2);
    while (t < t1) {
      d = [0.6 * d[0] + 0.4 * s.dir[0] + 0.5 * r.normal(), 0.6 * d[1] + 0.4 * s.dir[1] + 0.5 * r.normal(), 0.6 * d[2] + 0.4 * s.dir[2] + 0.5 * r.normal()];
      amp = Math.min(1.5 * ampK, Math.max(0.5 * ampK, amp + 0.25 * ampK * r.normal()));
      const c = Math.min(250, Math.max(110, mean + 0.25 * mean * r.normal()));
      const m = c * r.range(0.4, 0.6);
      const plus: Lobe = { label: 'VF+', on: 0, peak: m * r.range(0.4, 0.6), end: m, endRule: 'edge', q: 2, dir: d, dir2: null, amp, regions: s.regions, loc: null, far: 1, wave: 'QRS' };
      const minus = lobeWithArea({ label: 'VF−', on: m, peak: m + (c - m) * r.range(0.4, 0.6), end: c, endRule: 'edge', q: 2, regions: s.regions, loc: null, far: 1, wave: 'QRS' }, scale(lobeArea(plus), -1));
      out.push({ t, lobes: [plus, minus], stream: si });
      t += c;
    }
  });
  out.sort((a, b) => a.t - b.t);
  return out;
}

/**
 * Ventricular flutter: one large rotating wavefront per cycle (a sine-like zig-zag with no isoelectric segment, QRS and
 * T indistinguishable). Per cycle the source direction turns from d to −d through a perpendicular, so every lead shows
 * one smooth oscillation; the axis of the turn drifts slowly from cycle to cycle.
 */
export function vflutterCycles(rateBpm: number, t0: number, t1: number, rng: Rng): VentWave[] {
  const c = 60000 / rateBpm;
  const out: VentWave[] = [];
  let t = t0 - rng.range(0, c);
  let phase = rng.range(0, 2 * Math.PI);
  const regions = [['lv-apex', 1]] as const;
  while (t < t1) {
    phase += 0.25 + 0.05 * rng.normal();
    const d: Vec3 = [0.75 * Math.cos(phase), 0.6, 0.55 * Math.sin(phase)];
    const amp = 1.1 * (1 + 0.06 * rng.normal());
    const cc = c * (1 + 0.015 * rng.normal());
    const up: Lobe = { label: 'VFL+', on: 0, peak: 0.25 * cc, end: 0.56 * cc, endRule: 'edge', q: 2, dir: d, dir2: null, amp, regions, loc: null, far: 1, wave: 'QRS' };
    const down = lobeWithArea({ label: 'VFL−', on: 0.44 * cc, peak: 0.75 * cc, end: 1.06 * cc, endRule: 'edge', q: 2, regions, loc: null, far: 1, wave: 'QRS' }, scale(lobeArea(up), -1));
    out.push({ t, lobes: [up, down], stream: 0 });
    t += cc;
  }
  return out;
}
