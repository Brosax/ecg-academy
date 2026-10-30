/**
 * Ventricular fibrillation and torsades de pointes on the realistic HRA heart, checked against the test_oracle lines of
 * docs/research/disease-spec.json. Measurements use model truth where the model has it (rotor cycle length, run
 * windows, beat templates' QT and T end, trigger activation times); where the spec names a detector, a simple
 * deterministic one is defined in the test (local maxima above a fraction of the record maximum with a refractory gap).
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Engine } from '../../../../src/lab/sim/engine';
import { buildEngineSync } from '../../../../src/lab/sim/engine';
import { loadHraGeometry } from '../../../../src/lab/sim/geometry/hra/load';
import type { TdpRhythm, TdpRun } from '../../../../src/lab/sim/rhythm/tdpRhythm';
import { TORSADES_DE_POINTES, VENTRICULAR_FIBRILLATION } from '../../../../src/lab/sim/scenarios/batch3/ventricularField';
import { MONOMORPHIC_VT } from '../../../../src/lab/sim/scenarios/library';
import { runGateAt, VF_FRAME_FLOATS, VF_NONE, vfStatePacked } from '../../../../src/lab/sim/source/vfField';
import type { BeatEvent, GeometryBundle, LeadName } from '../../../../src/lab/sim/types';
import { LEADS } from '../../../../src/lab/sim/types';
import { pearson, symEig } from '../linalg';

type VEv = Extract<BeatEvent, { kind: 'V' }>;
const ASSET = new URL('../../../../src/lab/assets/heart-hra.bin', import.meta.url);
let geo: GeometryBundle;

beforeAll(async () => {
  geo = await loadHraGeometry(undefined, new Uint8Array(readFileSync(ASSET)));
});

/** 12 leads over [t0, t0 + n) at 1 kHz. */
function leadsOf(e: Engine, t0: number, n: number): (l: LeadName) => Float32Array {
  const out = new Float32Array(12 * n);
  e.sampleLeads(t0, n, out);
  return (l) => out.subarray(LEADS.indexOf(l) * n, (LEADS.indexOf(l) + 1) * n);
}

/** Dominant frequency (Hz) of a 1 kHz record, DFT scanned over 1–12 Hz in 0.05 Hz steps. */
function dominantHz(x: ArrayLike<number>): number {
  let best = 0, bf = 0;
  for (let f = 1; f <= 12; f += 0.05) {
    let re = 0, im = 0;
    for (let i = 0; i < x.length; i++) {
      re += x[i] * Math.cos((2 * Math.PI * f * i) / 1000);
      im += x[i] * Math.sin((2 * Math.PI * f * i) / 1000);
    }
    if (re * re + im * im > best) {
      best = re * re + im * im;
      bf = f;
    }
  }
  return bf;
}

/** Detector: positive local maxima above 30 % of the record's maximum, at least `refractoryMs` apart (1 kHz). */
function detect(x: ArrayLike<number>, refractoryMs = 150): number[] {
  let mx = 0;
  for (let i = 0; i < x.length; i++) mx = Math.max(mx, x[i]);
  const pk: number[] = [];
  for (let i = 1; i < x.length - 1; i++) {
    if (x[i] <= 0.3 * mx || x[i] < x[i - 1] || x[i] <= x[i + 1]) continue;
    if (pk.length && i - pk[pk.length - 1] < refractoryMs) {
      if (x[i] > x[pk[pk.length - 1]]) pk[pk.length - 1] = i;
      continue;
    }
    pk.push(i);
  }
  return pk;
}

/**
 * Complex counter for a twisting record: upward crossings through a ±h hysteresis band (one per complex whatever its
 * polarity or size, as long as it exceeds ±h), sample indices.
 */
function upCrossings(x: ArrayLike<number>, h = 0.05): number[] {
  const out: number[] = [];
  let low = false;
  for (let i = 0; i < x.length; i++) {
    if (x[i] < -h) low = true;
    else if (low && x[i] > h) {
      out.push(i);
      low = false;
    }
  }
  return out;
}

const cv = (xs: number[]) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length) / m;
};
const rms = (x: ArrayLike<number>) => {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / x.length);
};

function oneSource(e: Engine, t0: number, n: number): void {
  const out = new Float32Array(12 * n);
  e.sampleLeads(t0, n, out);
  const L = (l: LeadName, i: number) => out[LEADS.indexOf(l) * n + i];
  for (let i = 0; i < n; i += 7) expect(Math.abs(L('I', i) + L('III', i) - L('II', i))).toBeLessThan(1e-5);
  const G = LEADS.map((_, a) => LEADS.map((_, b) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += out[a * n + i] * out[b * n + i];
    return s;
  }));
  const ev = symEig(G).map((x) => Math.sqrt(Math.max(0, x)));
  expect(ev[3] / ev[0]).toBeLessThan(1e-6);
}

describe('ventricular fibrillation', () => {
  let e: Engine;
  let lead: (l: LeadName) => Float32Array;
  const T0 = 2000, N = 20000;
  beforeAll(() => {
    e = buildEngineSync(geo, undefined, { scenario: VENTRICULAR_FIBRILLATION });
    lead = leadsOf(e, T0, N);
  });

  it('no P, QRS or T: no ventricular beat events, cycleAt never reports a cycle; the sinus node keeps firing, nothing conducts', () => {
    const evs = e.rhythm.eventsUntil(60000);
    expect(evs.some((x) => x.kind === 'V')).toBe(false);
    expect(evs.filter((x) => x.kind === 'A').length).toBeGreaterThan(60);
    for (let t = 3000; t < 9000; t += 97) expect(e.cycleAt(t)).toBeNull();
  });

  it('QRS detector finds no regular complexes: deflections detected in II (> 30 % of max, ≥ 150 ms apart) have RR CV > 0.3', () => {
    const cvs = LEADS.map((l) => {
      const pk = detect(lead(l));
      return cv(pk.slice(1).map((v, i) => v - pk[i]));
    });
    console.log(`VF: detected-deflection RR CV per lead ${LEADS.map((l, i) => `${l} ${cvs[i].toFixed(2)}`).join(', ')}`);
    expect(cvs[LEADS.indexOf('II')]).toBeGreaterThan(0.3);
    // no lead shows a regular train of complexes either
    for (const c of cvs) expect(c).toBeGreaterThan(0.2);
  });

  it('dominant frequency of lead II between 2.5 and 8.3 Hz (150–500/min)', () => {
    const f = dominantHz(lead('II').subarray(0, 10000));
    const f2 = dominantHz(lead('II').subarray(10000, 20000));
    console.log(`VF: dominant frequency II ${f.toFixed(2)} Hz (${(f * 60).toFixed(0)}/min), next 10 s ${f2.toFixed(2)} Hz`);
    for (const x of [f, f2]) {
      expect(x).toBeGreaterThanOrEqual(2.5);
      expect(x).toBeLessThanOrEqual(8.3);
    }
  });

  it('no isoelectric segment > 200 ms in any lead: every 200-ms window has ≥ 0.1 mV peak-to-peak (20 s, 12 leads)', () => {
    let worst = Infinity, at = '';
    for (const l of LEADS) {
      const x = lead(l);
      for (let w = 0; w + 200 <= N; w += 10) {
        let lo = Infinity, hi = -Infinity;
        for (let i = w; i < w + 200; i++) {
          lo = Math.min(lo, x[i]);
          hi = Math.max(hi, x[i]);
        }
        if (hi - lo < worst) {
          worst = hi - lo;
          at = `${l} @ ${T0 + w} ms`;
        }
      }
    }
    console.log(`VF: smallest 200-ms peak-to-peak ${worst.toFixed(3)} mV (${at})`);
    expect(worst).toBeGreaterThanOrEqual(0.1);
  });

  it('coarse VF: median 1-s peak-to-peak in II 0.4–2 mV at onset', () => {
    const x = lead('II'), pp: number[] = [];
    for (let w = 0; w + 1000 <= N; w += 1000) {
      let lo = Infinity, hi = -Infinity;
      for (let i = w; i < w + 1000; i++) {
        lo = Math.min(lo, x[i]);
        hi = Math.max(hi, x[i]);
      }
      pp.push(hi - lo);
    }
    const med = pp.sort((a, b) => a - b)[pp.length >> 1];
    console.log(`VF: coarse II peak-to-peak median ${med.toFixed(2)} mV`);
    expect(med).toBeGreaterThan(0.4);
    expect(med).toBeLessThan(2);
  });

  it('coarse → fine (evolution enabled): RMS of the last 10 s of a 3-min episode < RMS of the first 10 s (all leads)', () => {
    const first = leadsOf(e, 100, 10000), last = leadsOf(e, 170100, 10000);
    const ratios = LEADS.map((l) => rms(last(l)) / rms(first(l)));
    console.log(`VF: RMS last/first 10 s ${ratios.map((r) => r.toFixed(2)).join(' ')}`);
    for (const r of ratios) expect(r).toBeLessThan(0.6);
  });

  it('one source: Einthoven holds and the 12 leads keep rank 3 with the continuous ventricular field', () => {
    oneSource(e, 2000, 3000);
  });
});

describe('torsades de pointes', () => {
  let e: Engine;
  let r: TdpRhythm;
  let runs: readonly TdpRun[];
  let cl: number;
  /** Lead II complexes of one run: one window per rotor cycle from the trigger. */
  let cx: Float32Array[];
  beforeAll(() => {
    e = buildEngineSync(geo, undefined, { scenario: TORSADES_DE_POINTES });
    r = e.rhythm as TdpRhythm;
    runs = r.runsUntil(60000);
    cl = e.vf!.model.cycleMs(0);
    const run = runs[0];
    const n = Math.ceil(run.runMs + cl);
    const II = leadsOf(e, run.tMs, n)('II');
    cx = [];
    for (let k = 0; (k + 1) * cl <= run.runMs; k++) cx.push(II.slice(Math.round(k * cl), Math.round((k + 1) * cl)));
  });

  it('QTc of the sinus beats before each onset > 500 ms (Bazett, model-truth QT), including the post-pause beat', () => {
    const evs = r.eventsUntil(60000);
    let prevEnd = 0;
    const qtcs: number[] = [];
    for (const run of runs.slice(0, 4)) {
      const sinus = evs.filter((x): x is VEv => x.kind === 'V' && x.variant === 'normal' && x.tMs > prevEnd && x.tMs <= run.prev.tMs);
      expect(sinus.length).toBeGreaterThanOrEqual(4);
      for (const v of sinus) {
        const tpl = e.templates.get(v.variant, v.rrPrevMs)!;
        if (v.rrPrevMs < 600) continue; // the first beat after a run (preceding cycle ends with the run)
        const qtc = (tpl.truth.repolEndMs - tpl.truth.onMs) / Math.sqrt(v.rrPrevMs / 1000);
        qtcs.push(qtc);
        expect(qtc).toBeGreaterThan(500);
      }
      prevEnd = run.endMs;
    }
    console.log(`TdP: sinus QTc ${Math.min(...qtcs).toFixed(0)}–${Math.max(...qtcs).toFixed(0)} ms`);
  });

  it('initiation: RR(n−1) short, RR(n) > 1.2 × RR(n−1), then a premature beat starting before the end of the preceding T (R on T)', () => {
    const evs = r.eventsUntil(60000);
    const kv = e.kernels.ventricular.voxels;
    for (const run of runs.slice(0, 3)) {
      const vs = evs.filter((x): x is VEv => x.kind === 'V' && x.tMs <= run.prev.tMs);
      const [a, pvc, b] = vs.slice(-3);
      const rr1 = pvc.tMs - a.tMs, rr2 = b.tMs - pvc.tMs;
      expect(rr2).toBeGreaterThan(1.2 * rr1);
      // trigger onset (model truth): the earliest point that accepts the trigger beat
      const gate = e.vf!.gateOf(run);
      let onset = Infinity;
      for (const v of kv) {
        const [, acc] = runGateAt(gate, e.vf!.model.rhoMs(0), e.vf!.model.tauRepMs, gate.tActPrev[v], gate.tActTrigger[v], gate.apdRefMs[v]);
        if (acc === acc) onset = Math.min(onset, acc);
      }
      const tEnd = b.tMs + e.templates.get(b.variant, b.rrPrevMs)!.truth.repolEndMs;
      const qrsOn = b.tMs + e.templates.get(b.variant, b.rrPrevMs)!.truth.onMs;
      console.log(`TdP: RR ${rr1.toFixed(0)} → ${rr2.toFixed(0)} ms; trigger onset ${(run.tMs + onset - qrsOn).toFixed(0)} ms after the QRS onset, T end at ${(tEnd - qrsOn).toFixed(0)} ms`);
      expect(run.tMs + onset).toBeLessThan(tEnd);
      expect(run.tMs + onset).toBeGreaterThan(qrsOn + 300);
    }
  });

  it('during the run: rate 150–250/min (rotor cycle, model truth; complexes counted in II; dominant frequency of II); QRS ≥ 120 ms (activation spread per cycle)', () => {
    expect(60000 / cl).toBeGreaterThanOrEqual(150);
    expect(60000 / cl).toBeLessThanOrEqual(250);
    const run = runs[0];
    const II = leadsOf(e, run.tMs, run.runMs)('II');
    // the dominant deflection points either way and shrinks at the nodes: count upward crossings of a ±0.05 mV band
    const pk = upCrossings(II);
    const det = 60000 / ((pk[pk.length - 1] - pk[0]) / (pk.length - 1));
    const df = dominantHz(II) * 60;
    // activation spread of one rotor cycle mid-run: local upstroke times of every kernel voxel (GPU-twin state)
    const gate = e.vf!.gateOf(run);
    const f = new Float32Array(VF_FRAME_FLOATS), st = new Float64Array(3);
    const tMid = run.tMs + 3000;
    e.vf!.frame(tMid, f);
    const g = geo.grid, [nx, ny] = g.dims;
    const ups: number[] = [];
    for (const v of e.kernels.ventricular.voxels) {
      const p: [number, number, number] = [g.originMm[0] + (v % nx) * g.hMm, g.originMm[1] + (Math.floor(v / nx) % ny) * g.hMm, g.originMm[2] + Math.floor(v / (nx * ny)) * g.hMm];
      vfStatePacked(f, 1, p, gate.tActPrev[v], gate.tActTrigger[v], gate.apdRefMs[v], st);
      if (st[0] !== VF_NONE) ups.push(tMid - st[0]);
    }
    ups.sort((a, b) => a - b);
    const spread = ups[Math.floor(0.95 * (ups.length - 1))] - ups[Math.floor(0.05 * (ups.length - 1))];
    const rr = pk.slice(1).map((v, i) => v - pk[i]);
    console.log(`TdP: rotor ${(60000 / cl).toFixed(0)}/min, detected in II ${det.toFixed(0)}/min (${pk.length} deflections, RR ${Math.min(...rr)}–${Math.max(...rr)} ms, CV ${cv(rr).toFixed(2)}), dominant frequency of II ${df.toFixed(0)}/min; activation spread per cycle (p5–p95) ${spread.toFixed(0)} ms over ${ups.length} kernel voxels`);
    for (const rate of [det, df]) {
      expect(rate).toBeGreaterThanOrEqual(150);
      expect(rate).toBeLessThanOrEqual(250);
    }
    expect(spread).toBeGreaterThanOrEqual(120);
  });

  it('twisting: the II amplitude envelope has nodes every 5–20 beats and the complexes reverse polarity across every node', () => {
    const pp = cx.map((w) => Math.max(...w) - Math.min(...w));
    let ref = 0;
    for (let k = 0; k < pp.length; k++) if (pp[k] > pp[ref]) ref = k;
    const pol = cx.map((w) => Math.sign(pearson(w, cx[ref])));
    // nodes: local minima of the envelope below half of the largest complex on each side
    const nodes: number[] = [];
    for (let k = 1; k < pp.length - 1; k++) {
      if (pp[k] > pp[k - 1] || pp[k] > pp[k + 1]) continue;
      const left = Math.max(...pp.slice(0, k)), right = Math.max(...pp.slice(k + 1));
      if (pp[k] < 0.5 * left && pp[k] < 0.5 * right) nodes.push(k);
    }
    console.log(`TdP: II complexes ${pp.map((x, k) => (pol[k] > 0 ? '+' : '−') + x.toFixed(1)).join(' ')} | nodes at beats ${nodes.join(', ')}`);
    expect(nodes.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < nodes.length; i++) {
      expect(nodes[i] - nodes[i - 1]).toBeGreaterThanOrEqual(5);
      expect(nodes[i] - nodes[i - 1]).toBeLessThanOrEqual(20);
    }
    // polarity of the two complexes 2 beats either side of each node is opposite
    for (const k of nodes) if (k >= 2 && k + 2 < pol.length) expect(pol[k - 2] * pol[k + 2]).toBe(-1);
  });

  it('polymorphic: mean Pearson r of consecutive complexes in II < 0.8 (monomorphic VT in this library: > 0.95)', () => {
    const rs = cx.slice(1).map((w, k) => pearson(w, cx[k]));
    const mean = rs.reduce((a, b) => a + b, 0) / rs.length;
    const med = [...rs].sort((a, b) => a - b)[rs.length >> 1];
    // contrast: consecutive VT complexes from one fixed focus
    const vt = buildEngineSync(geo, undefined, { scenario: MONOMORPHIC_VT });
    const vvs = vt.rhythm.eventsUntil(12000).filter((x): x is VEv => x.kind === 'V' && x.variant === 'vt' && x.tMs > 3000);
    const vII = leadsOf(vt, vvs[0].tMs, Math.ceil(vvs[5].tMs - vvs[0].tMs))('II');
    const per = Math.round(vvs[1].tMs - vvs[0].tMs);
    const vcx = Array.from({ length: 4 }, (_, k) => vII.slice(k * per, (k + 1) * per));
    const vtR = vcx.slice(1).map((w, k) => pearson(w, vcx[k]));
    console.log(`TdP: consecutive-complex r mean ${mean.toFixed(2)}, median ${med.toFixed(2)}; monomorphic VT r ${vtR.map((x) => x.toFixed(3)).join(' ')}`);
    expect(mean).toBeLessThan(0.8);
    for (const x of vtR) expect(x).toBeGreaterThan(0.95);
  });

  it('the run ends by itself: no ventricular events in it, sinus conduction resumes after full recovery; episodes recur', () => {
    const evs = r.eventsUntil(60000);
    expect(runs.length).toBeGreaterThanOrEqual(4);
    for (const run of runs.slice(0, 3)) {
      expect(evs.some((x) => x.kind === 'V' && x.tMs > run.tMs && x.tMs < run.endMs)).toBe(false);
      expect(evs.some((x) => x.kind === 'block' && x.tMs > run.tMs && x.tMs < run.endMs)).toBe(true);
      expect(e.cycleAt(run.tMs + 2000)).toBeNull();
      const next = evs.find((x): x is VEv => x.kind === 'V' && x.tMs > run.endMs)!;
      const c = e.cycleAt(next.tMs + 300)!;
      expect(c.qrsOn).not.toBeNull();
      expect(c.pOn).not.toBeNull();
    }
  });

  it('no superposition artefact: H_V has no step where the trigger starts or where the run stops accepting upstrokes', () => {
    const run = runs[0];
    const t0 = run.prev.tMs - 50, n = Math.ceil(run.endMs - t0 + 50);
    const hA = new Float32Array(3 * n), hV = new Float32Array(3 * n);
    e.sampleH(t0, n, hA, hV);
    const step = (a: number, b: number) => {
      let m = 0;
      for (let i = Math.max(1, Math.floor(a - t0)); i < Math.min(n, Math.ceil(b - t0)); i++)
        m = Math.max(m, Math.hypot(hV[3 * i] - hV[3 * i - 3], hV[3 * i + 1] - hV[3 * i - 2], hV[3 * i + 2] - hV[3 * i - 1]));
      return m;
    };
    const qrs = step(run.prev.tMs, run.prev.tMs + 120);
    const atTrigger = step(run.tMs - 15, run.tMs + 15), atEnd = step(run.tMs + run.runMs - 5, run.endMs);
    console.log(`TdP: max |ΔH_V| per ms — sinus QRS ${qrs.toFixed(3)}, at the trigger ${atTrigger.toFixed(3)}, after D ${atEnd.toFixed(3)} mV`);
    expect(atTrigger).toBeLessThan(0.25 * qrs);
    expect(atEnd).toBeLessThan(0.5 * qrs);
  });

  it('one source: Einthoven holds and the 12 leads keep rank 3 across a run', () => {
    oneSource(e, runs[0].tMs - 500, 4000);
  });
});
