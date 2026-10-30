/**
 * Architecture B — parametric VCG kernels → forward Dower electrode potentials → 12 leads.
 *
 *   H(t) = Σ_k amp_k · f_k(t) · d_k(t)                         (Frank X, Y, Z; one source for everything)
 *   Φ_e(t) = L_e · H(t) + Σ_{k localised} amp_k f_k(t) d_k(t)·g_e(r_k)   (electrode potentials)
 *   leads = Einthoven / Goldberger / Wilson combinations of Φ_RA, Φ_LA, Φ_LL, Φ_V1..V6
 */
import { areaVector, cdfAt, dirAt, shapeArea, shapeAt, RegionNames, type Kernel, type RegionName, type Vec3 } from './kernels.ts';
import {
  ELECTRODES, ELECTRODE_LEAD_VECTORS, leadsFromElectrodes, proximityGains, STANDARD_HOOKUP,
  type ElectrodeMap, type ElectrodePotentials, type LeadName,
} from './leads.ts';
import { atrialKernels, ventricularKernels, VENT_REGIONS } from './model.ts';
import { CONDITIONS, type Condition } from './conditions.ts';
import { makeRng, subRng, type Rng } from './rng.ts';
import { bump } from './kernels.ts';

export type BeatTruth = { pOnMs: number | null; qrsOnMs: number; qrsOffMs: number; tOffMs: number };
export type Truth = {
  hrBpm: number;
  prMs: number | null;
  qrsMs: number;
  qtMs: number;
  qrsAxisDeg: number;
  rhythm: string;
  beats: BeatTruth[];
};
export type GenerateResult = {
  leads: Record<LeadName, Float32Array>;
  truth: Truth;
  regions: { names: string[]; activityAt(tMs: number): Float32Array };
};
export type GenerateOpts = { fs: number; durationS: number; seed: number; hookup?: ElectrodeMap };

type Group = { kernels: Kernel[] };
type Scheduled = { groups: Group[]; beats: (BeatTruth & { rr: number; conducted: boolean })[]; rrs: number[] };

// ------------------------------------------------------------------------------------------------ rhythm clocks

function schedule(c: Condition, durMs: number, seed: number): Scheduled {
  const r = c.rhythm;
  const groups: Group[] = [];
  const beats: Scheduled['beats'] = [];
  const rrs: number[] = [];
  const pre = 1500; // start the clocks before t = 0 so the strip opens mid-rhythm
  if (r.kind === 'sinus') {
    const rng = subRng(seed, 'sinus');
    const rr0 = 60000 / r.rateBpm;
    const phase = rng.uniform(0, 2 * Math.PI);
    let t = -pre + rng.uniform(0, rr0);
    let rrPrev = rr0;
    while (t < durMs + 200) {
      const a = atrialKernels(c.atrial, t, true);
      const qrsOn = t + r.prMs;
      const v = ventricularKernels(c.vent, qrsOn, rrPrev, a.pOn);
      groups.push({ kernels: a.kernels }, { kernels: v.kernels });
      beats.push({ pOnMs: a.pOn, qrsOnMs: v.qrsOn, qrsOffMs: v.qrsOff, tOffMs: v.tOff, rr: rrPrev, conducted: true });
      const rr = rr0 * (1 + r.hrv * Math.sin((2 * Math.PI * t) / 4200 + phase)) + 4 * rng.normal();
      rrs.push(rr);
      rrPrev = rr;
      t += rr;
    }
  } else if (r.kind === 'afib') {
    const rng = subRng(seed, 'afib-rr');
    const mean = 60000 / r.meanRateBpm;
    const sigma = Math.sqrt(Math.log(1 + r.cv * r.cv));
    const mu = Math.log(mean) - (sigma * sigma) / 2;
    let t = -pre + rng.uniform(0, mean);
    let rrPrev = mean;
    while (t < durMs + 200) {
      const v = ventricularKernels(c.vent, t, rrPrev, null);
      groups.push({ kernels: v.kernels });
      beats.push({ pOnMs: null, qrsOnMs: v.qrsOn, qrsOffMs: v.qrsOff, tOffMs: v.tOff, rr: rrPrev, conducted: false });
      let rr = 0;
      do rr = Math.exp(mu + sigma * rng.normal());
      while (rr < r.minRrMs || rr > 2.2 * mean);
      rrs.push(rr);
      rrPrev = rr;
      t += rr;
    }
    groups.push(...fibrillation(r.fib, -pre, durMs + 200, subRng(seed, 'afib-f')));
  } else if (r.kind === 'flutter') {
    const rng = subRng(seed, 'flutter');
    const cyc = r.flutter.cycleMs;
    let t = -pre + rng.uniform(0, cyc);
    let k = 0;
    const rrv = cyc * r.conduction;
    // atrial repolarisation of one cycle: a broad lobe (≈ 2 cycles wide, so consecutive ones overlap into an almost
    // flat sum) whose area is −taRatio × the cycle's depolarisation area (see FlutterSpec.taRatio)
    const fArea = r.flutter.lobes.reduce<Vec3>((a, l) => {
      const v = areaVector(bump(l, 0, 'F', 'depol'));
      return [a[0] + v[0], a[1] + v[1], a[2] + v[2]];
    }, [0, 0, 0]);
    const taRatio = r.flutter.taRatio ?? 0;
    const taUnit = bump({ label: 'Ta', on: 0, peak: cyc, end: 2 * cyc, dir: [1, 0, 0], amp: 1 }, 0, 'Ta', 'none');
    const taAmp = (Math.hypot(...fArea) * taRatio) / shapeArea(taUnit);
    const nf = r.flutter.loc ? { loc: r.flutter.loc, far: 1 } : {}; // atrial lead field (see AtrialMorph.loc)
    while (t < durMs + 200) {
      const ks = r.flutter.lobes.map((l) => bump({ ...nf, ...l }, t, 'F', 'depol'));
      ks.push(...r.flutter.lobes.map((l) => bump({ ...l, on: l.on + cyc * 0.55, peak: l.peak + cyc * 0.55, end: l.end + cyc * 0.55, amp: 0 }, t, 'silent', 'repol')));
      if (taAmp > 0) ks.push(bump({ label: 'Ta (flutter)', on: 0, peak: cyc, end: 2 * cyc, dir: [-fArea[0], -fArea[1], -fArea[2]], amp: taAmp, ...nf }, t, 'Ta', 'none'));
      groups.push({ kernels: ks });
      if (k % r.conduction === 0) {
        const v = ventricularKernels(c.vent, t + r.frMs, rrv, null);
        groups.push({ kernels: v.kernels });
        beats.push({ pOnMs: null, qrsOnMs: v.qrsOn, qrsOffMs: v.qrsOff, tOffMs: v.tOff, rr: rrv, conducted: true });
        rrs.push(rrv);
      }
      k++;
      t += cyc;
    }
  } else {
    // ventricular tachycardia with AV dissociation: two independent clocks
    const rng = subRng(seed, 'vt');
    const rrv = 60000 / r.rateBpm;
    let t = -pre + rng.uniform(0, rrv);
    while (t < durMs + 200) {
      const v = ventricularKernels(c.vent, t, rrv, null);
      groups.push({ kernels: v.kernels });
      beats.push({ pOnMs: null, qrsOnMs: v.qrsOn, qrsOffMs: v.qrsOff, tOffMs: v.tOff, rr: rrv, conducted: false });
      rrs.push(rrv);
      t += rrv + 1.5 * rng.normal();
    }
    const rs = subRng(seed, 'vt-sinus');
    const rra = 60000 / r.sinusRateBpm;
    let ta = -pre + rs.uniform(0, rra);
    while (ta < durMs + 200) {
      groups.push({ kernels: atrialKernels(c.atrial, ta, true).kernels });
      ta += rra + 6 * rs.normal();
    }
  }
  return { groups, beats, rrs };
}

/** Atrial fibrillation: a few independent wavelet streams (multiple-wavelet hypothesis). Each stream is a renewal
 *  process of contiguous activation cycles: in one cycle a wavefront sweeps under its region, so the local dipole
 *  points one way and then reverses (a biphasic, zero-mean deflection). Cycle length, amplitude and direction drift
 *  from cycle to cycle; streams superpose, so the surface f waves are irregular in rate, shape and amplitude. Seeded. */
function fibrillation(f: Extract<Condition['rhythm'], { kind: 'afib' }>['fib'], t0: number, t1: number, rng: Rng): Group[] {
  const out: Group[] = [];
  const nf = f.loc ? { loc: f.loc, far: 1 } : {}; // atrial lead field (see AtrialMorph.loc)
  for (const s of f.streams) {
    let t = t0 - rng.uniform(0, s.meanMs);
    let d: Vec3 = [s.dir[0], s.dir[1], s.dir[2]];
    let amp = rng.uniform(s.amp[0], s.amp[1]);
    while (t < t1) {
      d = [
        0.75 * d[0] + 0.25 * s.dir[0] + s.spread * rng.normal(),
        0.75 * d[1] + 0.25 * s.dir[1] + s.spread * rng.normal(),
        0.75 * d[2] + 0.25 * s.dir[2] + s.spread * rng.normal(),
      ];
      // amplitude: slow random walk inside the stream's range (coarse and fine stretches)
      amp = Math.min(s.amp[1], Math.max(s.amp[0], amp + 0.25 * (s.amp[1] - s.amp[0]) * rng.normal()));
      const c = Math.min(1.5 * s.meanMs, Math.max(0.65 * s.meanMs, s.meanMs + s.jitterMs * rng.normal()));
      const m = c * rng.uniform(0.42, 0.58);
      const tag = [[s.region, 0.5]] as const;
      const dB: Vec3 = [-d[0] + 0.2 * rng.normal(), -d[1] + 0.2 * rng.normal(), -d[2] + 0.2 * rng.normal()];
      out.push({
        kernels: [
          bump({ label: 'f+', on: 0, peak: m * 0.5, end: m, dir: d, amp, regions: tag, ...nf }, t, 'F', 'depol'),
          bump({ label: 'f−', on: m, peak: m + (c - m) * 0.5, end: c, dir: dB, amp: amp * rng.uniform(0.75, 1.0), regions: tag, ...nf }, t, 'F', 'none'),
          bump({ label: 'f rec', on: c, peak: c + 40, end: c + 80, dir: [1, 0, 0], amp: 0, regions: tag }, t, 'silent', 'repol'),
        ],
      });
      t += c;
    }
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ rendering

function render(groups: Group[], fs: number, n: number): ElectrodePotentials {
  const H = [new Float64Array(n), new Float64Array(n), new Float64Array(n)] as const;
  const phi = {} as ElectrodePotentials;
  for (const e of ELECTRODES) phi[e] = new Float64Array(n);
  const NE = ELECTRODES.length;
  const phiArr = ELECTRODES.map((e) => phi[e]);
  const dt = 1000 / fs;
  // near-field gains depend only on (location, far): cache them (every sinus P/Ta kernel shares the atrial centroid)
  const gainCache = new Map<Vec3, Map<number, ReturnType<typeof proximityGains>>>();
  const gainsFor = (loc: Vec3, far: number): ReturnType<typeof proximityGains> => {
    let byFar = gainCache.get(loc);
    if (!byFar) gainCache.set(loc, (byFar = new Map()));
    let g = byFar.get(far);
    if (!g) byFar.set(far, (g = proximityGains(loc, far)));
    return g;
  };
  const proj = new Float64Array(NE);
  for (const g of groups) {
    for (const k of g.kernels) {
      if (k.amp === 0) continue;
      const i0 = Math.max(0, Math.ceil(k.s0 / dt));
      const i1 = Math.min(n - 1, Math.floor(k.s1 / dt));
      if (i1 < i0) continue;
      const gains = k.loc ? gainsFor(k.loc, k.far) : null;
      const fw = k.loc ? k.far : 1;
      // near-field gains projected on the kernel direction once (fixed direction) or per sample (rotating direction)
      if (gains && !k.dir2) ELECTRODES.forEach((e, j) => { proj[j] = k.dir[0] * gains[e][0] + k.dir[1] * gains[e][1] + k.dir[2] * gains[e][2]; });
      for (let i = i0; i <= i1; i++) {
        const t = i * dt;
        const f = k.amp * shapeAt(k, t);
        if (f === 0) continue;
        const d = dirAt(k, t);
        H[0][i] = H[0][i]! + fw * f * d[0];
        H[1][i] = H[1][i]! + fw * f * d[1];
        H[2][i] = H[2][i]! + fw * f * d[2];
        if (gains) {
          if (k.dir2) ELECTRODES.forEach((e, j) => { proj[j] = d[0] * gains[e][0] + d[1] * gains[e][1] + d[2] * gains[e][2]; });
          for (let j = 0; j < NE; j++) phiArr[j]![i] = phiArr[j]![i]! + f * proj[j]!;
        }
      }
    }
  }
  for (const e of ELECTRODES) {
    const L = ELECTRODE_LEAD_VECTORS[e];
    const p = phi[e];
    for (let i = 0; i < n; i++) p[i] = p[i]! + L[0] * H[0][i]! + L[1] * H[1][i]! + L[2] * H[2][i]!;
  }
  return phi;
}

// ------------------------------------------------------------------------------------------------ regions (3D state)

type RegionEntry = { k: Kernel; w: number };

function buildRegions(groups: Group[]): GenerateResult['regions'] {
  const names = [...RegionNames];
  const per = new Map<RegionName, RegionEntry[]>();
  for (const r of names) per.set(r, []);
  for (const g of groups) {
    // normalize each region's depol weights (and repol weights) to 1 within one event group
    const sums = new Map<string, number>();
    for (const k of g.kernels) for (const [r, w] of k.regions) if (k.role !== 'none') sums.set(r + k.role, (sums.get(r + k.role) ?? 0) + w);
    for (const k of g.kernels) {
      if (k.role === 'none') continue;
      for (const [r, w] of k.regions) per.get(r)!.push({ k, w: (k.role === 'depol' ? 1 : -1) * (w / sums.get(r + k.role)!) });
    }
  }
  for (const list of per.values()) list.sort((a, b) => a.k.s0 - b.k.s0);
  const out = new Float32Array(names.length);
  return {
    names,
    activityAt(t: number): Float32Array {
      names.forEach((r, i) => {
        let s = 0;
        for (const e of per.get(r)!) {
          if (e.k.s0 >= t) break;
          s += e.w * cdfAt(e.k, t);
        }
        out[i] = Math.min(1, Math.max(0, s));
      });
      return out;
    },
  };
}

// ------------------------------------------------------------------------------------------------ truth helpers

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/** clinical frontal QRS axis: atan2(net QRS area in aVF, net QRS area in I) over the model's own QRS windows,
 *  summed over all complete beats of the generated signal (so superimposed atrial activity counts, as it would for a
 *  reader). Hexaxial convention (I = 0°, aVF = +90°). */
function qrsAxis(leads: Record<LeadName, Float32Array>, beats: BeatTruth[], fs: number): number {
  let a = 0, f = 0;
  const n = leads.I.length;
  for (const b of beats) {
    const i0 = Math.ceil((b.qrsOnMs * fs) / 1000), i1 = Math.floor((b.qrsOffMs * fs) / 1000);
    if (i0 < 0 || i1 >= n) continue;
    for (let i = i0; i <= i1; i++) {
      a += leads.I[i]!;
      f += leads.aVF[i]!;
    }
  }
  return (Math.atan2(f, a) * 180) / Math.PI;
}

// ------------------------------------------------------------------------------------------------ public API

export function getCondition(id: string): Condition {
  const c = CONDITIONS[id];
  if (!c) throw new Error(`unknown condition '${id}'. Known: ${Object.keys(CONDITIONS).join(', ')}`);
  return c;
}

export function generate(conditionId: string, opts: { fs: number; durationS: number; seed: number; hookup?: ElectrodeMap }): GenerateResult {
  const c = getCondition(conditionId);
  const durMs = opts.durationS * 1000;
  const n = Math.round(opts.durationS * opts.fs);
  const sch = schedule(c, durMs, opts.seed);
  const phi = render(sch.groups, opts.fs, n);
  const leads = leadsFromElectrodes(phi, opts.hookup ?? STANDARD_HOOKUP);
  const inside = sch.beats.filter((b) => b.qrsOnMs >= 0 && b.qrsOnMs < durMs);
  const full = inside.filter((b) => b.tOffMs < durMs);
  const ref = full.length ? full : inside;
  const rrIn = sch.rrs.filter((_, i) => sch.beats[i]!.qrsOnMs >= 0 && sch.beats[i]!.qrsOnMs < durMs);
  const meanRr = rrIn.length ? rrIn.reduce((a, b) => a + b, 0) / rrIn.length : 60000 / 72;
  const prs = ref.filter((b) => b.pOnMs !== null && b.conducted).map((b) => b.qrsOnMs - b.pOnMs!);
  const truth: Truth = {
    hrBpm: 60000 / meanRr,
    prMs: prs.length ? median(prs) : null,
    qrsMs: median(ref.map((b) => b.qrsOffMs - b.qrsOnMs)),
    qtMs: median(ref.map((b) => b.tOffMs - b.qrsOnMs)),
    qrsAxisDeg: qrsAxis(leads, ref, opts.fs),
    rhythm: c.rhythmLabel,
    beats: inside.map((b) => ({ pOnMs: b.pOnMs, qrsOnMs: b.qrsOnMs, qrsOffMs: b.qrsOffMs, tOffMs: b.tOffMs })),
  };
  return { leads, truth, regions: buildRegions(sch.groups) };
}

export { VENT_REGIONS, makeRng };
