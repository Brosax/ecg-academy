/**
 * Ventricular scroll-wave field (VF / torsades de pointes): periodicity, repolarization within every cycle, the packed
 * GPU frame (float32) against the float64 CPU path, the precessing filament, CPU synthesis against the GLSL-twin state
 * (vfStatePacked mirrors hvVfState line by line), the torsades rhythm sequence and the GLSL layout.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Engine } from '../../../src/lab/sim/engine';
import { buildEngineSync } from '../../../src/lab/sim/engine';
import { loadHraGeometry } from '../../../src/lab/sim/geometry/hra/load';
import type { TdpRhythm } from '../../../src/lab/sim/rhythm/tdpRhythm';
import { rateKind } from '../../../src/lab/sim/scenarios/rate';
import { TORSADES_DE_POINTES, VENTRICULAR_FIBRILLATION } from '../../../src/lab/sim/scenarios/batch3/ventricularField';
import { afAp, afTauPacked } from '../../../src/lab/sim/source/afField';
import { vfFrameOf } from '../../../src/lab/sim/source/vfDriver';
import {
  specDirToLocal, VF_FRAME_FLOATS, VF_HEADER_OFFSET, VF_MAX_ROTORS, VF_MODE, VF_NONE, VF_SLOPE, VF_STRIDE, VF_TAU_UP,
  VF_UPSTROKE_MS, VfModel, vfStatePacked,
} from '../../../src/lab/sim/source/vfField';
import type { BeatEvent, GeometryBundle, SourceKernel, Vec3 } from '../../../src/lab/sim/types';
import { COMP, TISSUE } from '../../../src/lab/sim/types';
import { GLSL_BEATS, GLSL_DISPLACEMENT, GLSL_ELECTRICAL } from '../../../src/lab/view3d/shaders/chunks';
import { createSharedUniforms } from '../../../src/lab/view3d/shaders/uniforms';

let geo: GeometryBundle;
let vf: Engine;
let tdp: Engine;
const pts: Vec3[] = [];
const voxOf: number[] = [];

const posOf = (g: GeometryBundle['grid'], v: number): Vec3 => {
  const [nx, ny] = g.dims;
  return [g.originMm[0] + (v % nx) * g.hMm, g.originMm[1] + (Math.floor(v / nx) % ny) * g.hMm, g.originMm[2] + Math.floor(v / (nx * ny)) * g.hMm];
};

beforeAll(async () => {
  geo = await loadHraGeometry(undefined, new Uint8Array(readFileSync(new URL('../../../src/lab/assets/heart-hra.bin', import.meta.url))));
  vf = buildEngineSync(geo, undefined, { scenario: VENTRICULAR_FIBRILLATION });
  tdp = buildEngineSync(geo, undefined, { scenario: TORSADES_DE_POINTES });
  const g = geo.grid;
  for (let v = 0, k = 0; v < g.tissue.length; v++) {
    const t = g.tissue[v];
    if (t !== TISSUE.LV && t !== TISSUE.RV && t !== TISSUE.Septum) continue;
    if (k++ % 211) continue;
    pts.push(posOf(g, v));
    voxOf.push(v);
  }
});

describe('VF scroll-wave field', () => {
  it('places five rotors on the ventricles; cycle lengths are whole cycles per loop, 150–250 ms (4–6.7 Hz)', () => {
    const m = vf.vf!.model;
    expect(m.n).toBe(5);
    for (let i = 0; i < m.n; i++) {
      const cl = m.cycleMs(i);
      expect(Math.abs(m.periodMs / cl - Math.round(m.periodMs / cl))).toBeLessThan(1e-9);
      expect(cl).toBeGreaterThanOrEqual(150);
      expect(cl).toBeLessThanOrEqual(250);
    }
  });

  it('is exactly periodic in the loop length', () => {
    const m = vf.vf!.model;
    for (const p of pts.slice(0, 60))
      for (const t of [123.4, 7654.3]) {
        const a = m.tauAt(p, t)[0], b = m.tauAt(p, t + m.periodMs)[0], c = m.tauAt(p, t + 4 * m.periodMs)[0];
        expect(Math.abs(a - b)).toBeLessThan(1e-6);
        expect(Math.abs(a - c)).toBeLessThan(1e-6);
      }
  });

  it('every point repolarizes within its cycle (s < 0.05 at both ends, plateau > 0.8) — VF rotors and the torsades rotor', () => {
    for (const m of [vf.vf!.model, tdp.vf!.model]) {
      const frame = new Float64Array(VF_FRAME_FLOATS);
      m.pack(0, frame);
      for (let i = 0; i < m.n; i++) {
        const rho = frame[i * VF_STRIDE + 3], tauRep = frame[i * VF_STRIDE + 16];
        expect(afAp(m.cycleMs(i) - VF_UPSTROKE_MS - 0.5, rho, VF_TAU_UP, tauRep, VF_SLOPE)).toBeLessThan(0.05);
        expect(afAp(-VF_UPSTROKE_MS, rho, VF_TAU_UP, tauRep, VF_SLOPE)).toBeLessThan(0.05);
        expect(afAp(rho / 2, rho, VF_TAU_UP, tauRep, VF_SLOPE)).toBeGreaterThan(0.8);
      }
    }
  });

  it('the packed frame in float32 (as the GPU gets it) gives the same local time as the float64 CPU path (|Δτ| < 0.1 ms)', () => {
    const m = vf.vf!.model;
    const f32 = new Float32Array(VF_FRAME_FLOATS), r32 = new Float64Array(3);
    let worst = 0, n = 0;
    for (const t of [10, 2500.5, 7777.7, 123456.7]) {
      const nr = m.pack(t, f32);
      for (const p of pts) {
        afTauPacked(f32, nr, p[0], p[1], p[2], r32);
        const d = Math.abs(r32[0] - m.tauAt(p, t)[0]);
        if (d > 50) continue; // the two sides of a phase wrap (θ within float eps of 2πk) — same instant, either side
        worst = Math.max(worst, d);
        n++;
      }
    }
    expect(n).toBeGreaterThan(300);
    expect(worst).toBeLessThan(0.1);
  });

  it('CPU synthesis = closed form: a one-voxel kernel through buildLoop reproduces s(t) of the packed field', () => {
    const m = vf.vf!.model;
    let bad = 0, n = 0;
    for (const v of voxOf.slice(0, 12)) {
      const kernel: SourceKernel = { comp: COMP.Ventricular, voxels: Uint32Array.of(v), c: Float32Array.of(1, 0, 0) };
      const loop = m.buildLoop(kernel, -1, 500);
      const p = posOf(geo.grid, v);
      for (let s = 0; s < loop.n; s += 37, n++) if (Math.abs(loop.H[3 * s] - m.apAt(p, s * 2)) > 0.05) bad++;
    }
    // knot-interpolated geometric phase vs exact: only samples within ~1 ms of an upstroke may differ
    expect(bad / n).toBeLessThan(0.02);
  });

  it('VF engine: H_V loop seamless, no ventricular beat events, field frame on (continuous mode) at all times', () => {
    const evs = vf.rhythm.eventsUntil(30000);
    expect(evs.some((e) => e.kind === 'V')).toBe(false);
    expect(evs.filter((e) => e.kind === 'A').length).toBeGreaterThan(30);
    const out = new Float32Array(VF_FRAME_FLOATS);
    for (const t of [500, 9000, 61000]) {
      expect(vfFrameOf(vf, t, out)).toBe(5);
      expect(out[VF_HEADER_OFFSET + 7]).toBe(VF_MODE.Continuous);
      expect(vf.cycleAt(t)).toBeNull();
      expect(vf.responsible(t).map((r) => r.id)).toEqual(expect.arrayContaining(['SEPTUM', 'LV_APEX', 'RV_FREE']));
    }
    // seam: the loop's end joins its start like any other step
    const n = 4000, hA = new Float32Array(3 * n), hV = new Float32Array(3 * n);
    const L = vf.vf!.model.periodMs;
    vf.sampleH(L - 2000, n, hA, hV);
    let maxStep = 0, seam = 0;
    for (let i = 1; i < n; i++) {
      const d = Math.hypot(hV[3 * i] - hV[3 * i - 3], hV[3 * i + 1] - hV[3 * i - 2], hV[3 * i + 2] - hV[3 * i - 1]);
      if (i === 2000) seam = d;
      else maxStep = Math.max(maxStep, d);
    }
    expect(seam).toBeLessThanOrEqual(maxStep * 1.05);
  });

  it('coarse → fine: the source envelope decays from 1 toward 0.25 (and the 3D colour reads the same factor)', () => {
    const d = vf.vf!;
    const t0 = 100;
    expect(d.envelope(t0)).toBeCloseTo(1, 6);
    expect(d.envelope(t0 + 120000)).toBeCloseTo(0.25 + 0.75 * Math.exp(-1), 6);
    const out = new Float32Array(VF_FRAME_FLOATS);
    vfFrameOf(vf, t0 + 120000, out);
    expect(out[VF_HEADER_OFFSET + 6]).toBeCloseTo(d.envelope(t0 + 120000), 5);
  });

  it('builds the VF loop and a torsades run (timings reported; the plan treats performance as a report, not a gate)', () => {
    const m = vf.vf!.model;
    let t = performance.now();
    m.buildLoop(vf.kernels.ventricular, 1e-3, 500);
    const loopMs = performance.now() - t;
    const run = (tdp.rhythm as TdpRhythm).runsUntil(30000)[0];
    t = performance.now();
    tdp.vf!.model.buildRun(tdp.kernels.ventricular, 1e-3, tdp.vf!.gateOf(run));
    const runMs = performance.now() - t;
    console.log(`VF loop (12 s @ 500 Hz) ${loopMs.toFixed(0)} ms, torsades run (6 s @ 500 Hz) ${runMs.toFixed(0)} ms`);
    // sanity bound only (≈ 1 s each alone; several times that when the full suite runs engines in parallel workers)
    expect(loopMs).toBeLessThan(15000);
    expect(runMs).toBeLessThan(15000);
  });
});

describe('torsades rotor and run gate', () => {
  it('the filament precesses about the body axis: e2 = m, n = e1 × e2 ⊥ m, one turn per precession period', () => {
    const m = tdp.vf!.model;
    const axis = specDirToLocal(tdp.geometry.pose, TORSADES_DE_POINTES.rhythm.vf!.precession!.axis);
    const P = TORSADES_DE_POINTES.rhythm.vf!.precession!.periodMs;
    const f = new Float64Array(VF_FRAME_FLOATS);
    const nAt = (t: number): Vec3 => {
      m.pack(t, f);
      const e1: Vec3 = [f[8], f[9], f[10]], e2: Vec3 = [f[12], f[13], f[14]];
      expect(Math.abs(e2[0] - axis[0]) + Math.abs(e2[1] - axis[1]) + Math.abs(e2[2] - axis[2])).toBeLessThan(1e-9);
      return [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    };
    const n0 = nAt(0);
    for (const frac of [0.25, 0.5, 1]) {
      const n1 = nAt(frac * P);
      expect(Math.abs(n1[0] * axis[0] + n1[1] * axis[1] + n1[2] * axis[2])).toBeLessThan(1e-9);
      const c = n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2];
      expect(c).toBeCloseTo(Math.cos(2 * Math.PI * frac), 6);
    }
  });

  it('CPU run synthesis = GLSL-twin state: one-voxel kernels through buildRun vs vfStatePacked on the packed GPU frame', () => {
    const d = tdp.vf!, m = d.model;
    const run = (tdp.rhythm as TdpRhythm).runsUntil(30000)[0];
    const gate = d.gateOf(run);
    const f = new Float32Array(VF_FRAME_FLOATS), st = new Float64Array(3);
    const span = m.runSpanMs(run.runMs);
    let bad = 0, n = 0, fieldSamples = 0, trigSamples = 0;
    const kv = tdp.kernels.ventricular.voxels;
    for (let q = 0; q < kv.length; q += 701) {
      const v = kv[q];
      const kernel: SourceKernel = { comp: COMP.Ventricular, voxels: Uint32Array.of(v), c: Float32Array.of(1, 0, 0) };
      const sig = m.buildRun(kernel, -1, gate);
      const p = posOf(geo.grid, v);
      for (let tau = -VF_UPSTROKE_MS; tau < span; tau += 13, n++) {
        d.frame(run.tMs + tau, f);
        vfStatePacked(f, 1, p, gate.tActPrev[v], gate.tActTrigger[v], gate.apdRefMs[v], st);
        const gpu = st[0] === VF_NONE ? 0 : afAp(st[0], st[1], VF_TAU_UP, st[2], VF_SLOPE);
        if (st[0] !== VF_NONE) {
          if (Math.abs(st[1] - m.rhoMs(0)) < 1e-6 && f[VF_HEADER_OFFSET] < run.runMs) fieldSamples++;
        }
        if (st[0] !== VF_NONE && tau < 400) trigSamples++;
        const x = (tau - sig.t0Ms) * (sig.fsHz / 1000);
        const i0 = Math.min(sig.n - 2, Math.floor(x)), fr = x - i0;
        const cpu = sig.H[3 * i0] * (1 - fr) + sig.H[3 * i0 + 3] * fr;
        if (Math.abs(cpu - gpu) > 0.05) bad++;
      }
    }
    console.log(`run twin: ${n} samples, ${bad} differ > 0.05 (upstroke edges), ${fieldSamples} driven by the field`);
    expect(fieldSamples).toBeGreaterThan(n / 3);
    expect(trigSamples).toBeGreaterThan(0);
    expect(bad / n).toBeLessThan(0.03);
  });

  it('the field is off between runs and on (run mode) from the trigger until every point has recovered', () => {
    const r = tdp.rhythm as TdpRhythm;
    const run = r.runsUntil(30000)[0];
    const out = new Float32Array(VF_FRAME_FLOATS);
    expect(vfFrameOf(tdp, run.tMs - 300, out)).toBe(0);
    expect(vfFrameOf(tdp, run.tMs + 100, out)).toBe(1);
    expect(out[VF_HEADER_OFFSET + 7]).toBe(VF_MODE.Run);
    expect(out[VF_HEADER_OFFSET]).toBeCloseTo(100, 3);
    expect(out[VF_HEADER_OFFSET + 1]).toBe(run.runMs);
    expect(vfFrameOf(tdp, run.tMs + run.runMs + 50, out)).toBe(1);
    expect(vfFrameOf(tdp, run.endMs + 50, out)).toBe(0);
  });
});

describe('torsades rhythm (pause-dependent episodes)', () => {
  type VEv = Extract<BeatEvent, { kind: 'V' }>;
  it('sinus beats → PVC after the T wave → concealed sinus impulse → post-pause beat → R-on-T trigger → run → recovery', () => {
    const r = tdp.rhythm as TdpRhythm;
    const evs = r.eventsUntil(40000);
    const runs = r.runsUntil(40000);
    expect(runs.length).toBeGreaterThanOrEqual(3);
    for (const run of runs.slice(0, 3)) {
      const vs = evs.filter((e): e is VEv => e.kind === 'V' && e.tMs <= run.prev.tMs);
      const [pre, pvc, post] = vs.slice(-3);
      expect(post).toBe(run.prev);
      expect(pvc.variant).toBe('tdp-focus');
      expect(pre.variant).toBe('normal');
      // the sinus impulse between the PVC and the post-pause beat is blocked in the AV node
      expect(evs.some((e) => e.kind === 'block' && e.tMs > pvc.tMs && e.tMs < post.tMs)).toBe(true);
      // the PVC itself does not fall on the T wave
      const preTpl = tdp.templates.get(pre.variant, pre.rrPrevMs)!;
      expect(pvc.tMs + tdp.templates.get(pvc.variant, pvc.rrPrevMs)!.truth.onMs).toBeGreaterThan(pre.tMs + preTpl.truth.repolEndMs);
      // no ventricular events during the run; conduction resumes only after full recovery
      const during = evs.filter((e) => e.kind === 'V' && e.tMs > run.tMs && e.tMs < run.endMs);
      expect(during.length).toBe(0);
      const next = evs.find((e): e is VEv => e.kind === 'V' && e.tMs >= run.endMs)!;
      expect(next.variant).toBe('normal');
      expect(next.fromA).not.toBeNull();
    }
  });

  it('warming the first run does not advance the rhythm (a rate change applies from the next beat)', () => {
    const e = buildEngineSync(geo, undefined, { scenario: TORSADES_DE_POINTES });
    const ev = e.rhythm.eventsUntil(0);
    expect(ev.length).toBe(0);
  });

  it('a sinus rate ≥ 85/min suppresses the episodes (overdrive suppression): long-QT sinus rhythm only', () => {
    const e = buildEngineSync(geo, undefined, { scenario: TORSADES_DE_POINTES });
    e.setHeartRate(90);
    const r = e.rhythm as TdpRhythm;
    const evs = r.eventsUntil(60000);
    expect(r.runsUntil(60000).filter((x) => x.tMs > 3000).length).toBe(0);
    expect(evs.filter((x) => x.kind === 'V' && x.tMs > 3000).every((x) => x.kind === 'V' && x.variant === 'normal')).toBe(true);
    expect(e.rhythm.heartRate).toBe(90);
  });

  it('rate control: VF has none (disabled), torsades sets the underlying sinus rate', () => {
    expect(rateKind(VENTRICULAR_FIBRILLATION)).toBe('none');
    expect(rateKind(TORSADES_DE_POINTES)).toBe('underlyingSinus');
  });
});

describe('GLSL twin of the ventricular field', () => {
  it('declares the uniform block with the CPU layout and the shared uniform set provides it', () => {
    expect(VF_STRIDE).toBe(5 * 4);
    expect(GLSL_BEATS).toContain('uniform float uVfOn;');
    expect(GLSL_BEATS).toContain('uniform float uVfN;');
    expect(GLSL_BEATS).toContain(`uniform vec4 uVf[${VF_MAX_ROTORS * 5}];`);
    expect(GLSL_BEATS).toContain('uniform vec4 uVfRun[2];');
    const u = createSharedUniforms();
    expect(u.uVf.value.length).toBe(VF_MAX_ROTORS * 5);
    expect(u.uVfRun.value.length).toBe(2);
    expect(VF_HEADER_OFFSET).toBe(VF_STRIDE * VF_MAX_ROTORS);
  });

  it('hvVfTauOf is hvAfTau with the ventricular uniforms (same packed math), constant loop bound', () => {
    for (const frag of [
      'uVf[i * 5].xyz',
      `for (int i = 0; i < ${VF_MAX_ROTORS}; i++)`,
      'uVf[o + 1].w - uVf[o + 3].w * length(d)',
      'atan(dot(d, uVf[o + 3].xyz), dot(d, uVf[o + 2].xyz) + 1e-9)',
      `ph / uVf[o + 2].w - ${VF_UPSTROKE_MS.toFixed(1)}`,
      'uVf[o].w, uVf[o + 4].x',
    ])
      expect(GLSL_BEATS).toContain(frag);
  });

  it('hvVfState mirrors vfStatePacked (run gate, live / end slot, trigger AP) and feeds colour and motion', () => {
    for (const frag of [
      'float rho = uVf[0].w;',
      'float tr = uVf[4].x;',
      'h0.z + tAct.x + apdRef * h0.w + h1.x * h1.y',
      `tAct.y < HV_T_VALID && tAct.y - ${VF_UPSTROKE_MS.toFixed(1)} >= rec`,
      'max(trig ? tAct.y + rho + h1.x * tr : rec, 0.0)',
      'bool live = h0.x <= h0.y;',
      'hvVfTauOf(p, live ? 0 : 5)',
      `(live ? h0.x : h0.y) - f.x - ${VF_UPSTROKE_MS.toFixed(1)}`,
      'r = vec3(h0.x - tAct.y, rho, tr);',
    ])
      expect(GLSL_BEATS).toContain(frag);
    expect(GLSL_ELECTRICAL).toContain('vec4 hvVentricularColor(vec3 p, vec2 tAct, float apdRef)');
    expect(GLSL_ELECTRICAL).toContain('if (comp > 1.5) r = hvVentricularColor(p, tAct, apdRef);');
    expect(GLSL_DISPLACEMENT).toContain('vec3 vf = hvVfState(p, tAct, apd);');
    // single exit in the colour functions (ANGLE), balanced source
    const body = GLSL_ELECTRICAL.slice(GLSL_ELECTRICAL.indexOf('vec4 hvVentricularColor'), GLSL_ELECTRICAL.indexOf('vec4 hvTissueColor'));
    const returns = (src: string) => src.split(/[^A-Za-z_]return[^A-Za-z_]/).length - 1;
    expect(returns(body)).toBe(1);
    const st = GLSL_BEATS.slice(GLSL_BEATS.indexOf('vec3 hvVfState'));
    expect(returns(st)).toBe(1);
  });
});
