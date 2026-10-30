import { describe, expect, it } from 'vitest';
import { buildPose } from '../../../src/lab/sim/frame';
import { buildEngineSync, createEngine } from '../../../src/lab/sim/engine';
import { buildStubGeometry } from '../../../src/lab/sim/stub/stubGeometry';
import type { BeatEvent } from '../../../src/lab/sim/types';
import { LEADS } from '../../../src/lab/sim/types';
import { symEig } from '../oracle/linalg';

const geo2 = buildStubGeometry(2);

describe('createEngine (stub geometry)', () => {
  it('builds fields + kernels + first templates quickly on a 1.5 mm grid and reports progress', async () => {
    const geo = buildStubGeometry(1.5);
    const labels: string[] = [];
    const e = await createEngine(geo, {}, (_p, l) => labels.push(l));
    console.log(`build on 1.5 mm stub: ${JSON.stringify(e.stats)}`);
    expect(labels).toContain('activation');
    expect(labels).toContain('source');
    expect(labels[labels.length - 1]).toBe('ready');
    expect(e.stats.totalMs).toBeLessThan(10000); // target ≤ 1 s; timing is reported, not gated tightly
    expect(e.fields.ventricular[0].tAct.length).toBe(geo.grid.tissue.length);
    expect(e.fields.ventricular[1]).toBeNull();
    expect(e.fields.apVentricular.tauUpMs).toBeGreaterThanOrEqual(2.5);
  });

  const e = buildEngineSync(geo2);

  it('atrio-nodal delay equals the atrial field arrival at the AV node', () => {
    const t = e.atrialActivation.field.tAct[e.atrialActivation.avnVoxel];
    expect(e.timing.atrioNodalMs).toBe(t);
    expect(e.rhythm.avDelayMs(800)).toBeCloseTo(e.timing.atrioNodalMs + e.timing.ahMs, 9);
    // PR (truth) at RRref ≈ targetPrMs by construction
    const c = e.cycleAt(e.rhythm.eventsUntil(3000).find((x) => x.kind === 'A' && x.tMs > 1500)!.tMs + 20)!;
    expect(c.qrsOn! - c.pOn!).toBeCloseTo(e.params.targetPrMs, 0);
  });

  it('12 leads have rank 3 (one source): σ4/σ1 < 1e-6', () => {
    const n = 1600;
    const out = new Float32Array(12 * n);
    e.sampleLeads(1000, n, out);
    const G = LEADS.map((_, a) => LEADS.map((_, b) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += out[a * n + i] * out[b * n + i];
      return s;
    }));
    const ev = symEig(G).map((x) => Math.sqrt(Math.max(0, x)));
    console.log(`singular values: ${ev.slice(0, 5).map((x) => x.toExponential(2)).join(' ')}`);
    expect(ev[3] / ev[0]).toBeLessThan(1e-6);
    expect(ev[2] / ev[0]).toBeGreaterThan(1e-3);
  });

  it('templates superpose continuously across beats (no steps at template edges)', () => {
    const n = 6000;
    const a = new Float32Array(3 * n), v = new Float32Array(3 * n);
    e.sampleH(0, n, a, v);
    const evs = e.rhythm.eventsUntil(n).filter((x): x is Extract<BeatEvent, { kind: 'A' | 'V' }> => x.kind !== 'block');
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.hypot(v[3 * i], v[3 * i + 1], v[3 * i + 2]));
    for (const ev of evs) {
      const tpl = e.templates.lookup(ev)!;
      const out = ev.kind === 'A' ? a : v;
      for (const edge of [ev.tMs + tpl.t0Ms, ev.tMs + tpl.t0Ms + tpl.n - 1]) {
        const i = Math.round(edge);
        if (i < 1 || i >= n - 1) continue;
        const jump = Math.hypot(out[3 * i + 3] - out[3 * i - 3], out[3 * i + 4] - out[3 * i - 2], out[3 * i + 5] - out[3 * i - 1]);
        expect(jump / peak).toBeLessThan(2e-3);
      }
    }
  });

  it('Ta wave emerges from atrial repolarization (no hand-made wave): opposite to P, total atrial area ≈ 0', () => {
    const tpl = e.templateFor('A', 800);
    const p = [0, 0, 0], ta = [0, 0, 0];
    for (let i = 0; i < tpl.n; i++) {
      const dst = tpl.t0Ms + i <= tpl.truth.offMs + 10 ? p : ta;
      for (let c = 0; c < 3; c++) dst[c] += tpl.H[3 * i + c];
    }
    const dot = p[0] * ta[0] + p[1] * ta[1] + p[2] * ta[2];
    expect(dot).toBeLessThan(0);
    // uniform atrial APD ⇒ atrial gradient −gain·Σc·∫s = 0 (Σc ≡ 0)
    expect(Math.hypot(p[0] + ta[0], p[1] + ta[1], p[2] + ta[2]) / Math.hypot(...p)).toBeLessThan(0.05);
  });

  it('degrades gracefully on a geometry without conduction paths or landmarks', () => {
    const bare = buildEngineSync({ ...geo2, paths: [], landmarks: {} });
    expect(Number.isFinite(bare.timing.hvMs)).toBe(true);
    expect(Number.isFinite(bare.timing.atrioNodalMs)).toBe(true);
    expect(Number.isFinite(bare.rhythm.avDelayMs(800))).toBe(true);
    const n = 1000, out = new Float32Array(12 * n);
    bare.sampleLeads(1000, n, out);
    expect(out.every((x) => Number.isFinite(x))).toBe(true);
  });

  it('is deterministic', () => {
    const e2 = buildEngineSync(geo2);
    expect(e2.fields.ventricular[0].tAct).toEqual(e.fields.ventricular[0].tAct);
    expect(e2.fields.atrial[0].tAct).toEqual(e.fields.atrial[0].tAct);
    const n = 900, o1 = new Float32Array(12 * n), o2 = new Float32Array(12 * n);
    e.sampleLeads(2000, n, o1);
    e2.sampleLeads(2000, n, o2);
    expect(o2).toEqual(o1);
  });

  it('setPose rotates H without recomputing anything; onChange fires', () => {
    const n = 400;
    const a1 = new Float32Array(3 * n), v1 = new Float32Array(3 * n), a2 = new Float32Array(3 * n), v2 = new Float32Array(3 * n);
    const e3 = buildEngineSync(geo2);
    e3.sampleH(1100, n, a1, v1);
    const fields = e3.fields;
    let fired = 0;
    const off = e3.onChange(() => fired++);
    e3.setPose(buildPose({ apexDirApp: [0.2, -0.9, 0.3], rollDeg: 20, tCm: [0, 0, 0] }));
    e3.sampleH(1100, n, a2, v2);
    off();
    expect(fired).toBe(1);
    expect(e3.fields).toBe(fields);
    let diff = 0;
    for (let i = 0; i < n; i++) {
      expect(Math.hypot(v2[3 * i], v2[3 * i + 1], v2[3 * i + 2])).toBeCloseTo(Math.hypot(v1[3 * i], v1[3 * i + 1], v1[3 * i + 2]), 4);
      diff = Math.max(diff, Math.abs(v2[3 * i] - v1[3 * i]));
    }
    expect(diff).toBeGreaterThan(1e-3);
  });

  it('cycle truth, active beats and responsible structures follow the SimEngine contract', () => {
    const evs = e.rhythm.eventsUntil(4000);
    const a = evs.find((x): x is Extract<BeatEvent, { kind: 'A' }> => x.kind === 'A' && x.tMs > 2000)!;
    const v = evs.find((x): x is Extract<BeatEvent, { kind: 'V' }> => x.kind === 'V' && x.fromA === a.id)!;
    const c = e.cycleAt(a.tMs + 20)!;
    expect(c.segments.map((s) => s.seg).slice(0, 5)).toEqual(['P', 'PR', 'QRS', 'ST', 'T']);
    expect(c.valves.length).toBe(4);
    const snap = e.activeBeats(v.tMs + 50);
    expect(snap.ventricular[0]!.eventId).toBe(v.id);
    expect(snap.ventricular[0]!.apdScale).toBe(v.apdScale);
    expect(snap.atrial[0]!.eventId).toBe(a.id);
    expect(snap.atrial[0]!.apdScale).toBeCloseTo(Math.cbrt(a.rrPrevMs / 800), 9);
    const during = (t: number) => e.responsible(t).map((r) => r.id);
    expect(during(a.tMs + 5)).toContain('SA');
    expect(during(a.tMs + 30)).toContain('RA');
    expect(during(v.tMs - 20)).toContain('AVN');
    const qrs = during(c.qrsOn! + 15);
    expect(qrs.some((id) => id.startsWith('LV_') || id === 'SEPTUM' || id.startsWith('PURKINJE'))).toBe(true);
    expect(during(c.tEnd! - 30).length).toBeGreaterThan(0);
  });
});
