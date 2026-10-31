/**
 * "See how the blood flows" round: chevron arrows (src/view3d/flowChevrons.ts), walkthrough focus (bloodFlow.setFocus),
 * the walkthrough steps and their timing (flowControls.FLOW_TOUR, core/flowTour.ts), the name-tag anchors
 * (core/flowLabels.ts) and the X-ray heart patch (heartMaterial.ts).
 */
import { ShaderLib } from 'three';
import { describe, expect, it } from 'vitest';
import { StubEngine } from '../../../src/lab/sim/stub/stubEngine';
import type { CycleTruth, ValveId, Vec3 } from '../../../src/lab/sim/types';
import { VALVES } from '../../../src/lab/sim/types';
import { createBloodFlow, FLOW_DIM } from '../../../src/lab/view3d/bloodFlow';
import { flowLabelAnchors } from '../../../src/lab/view3d/core/flowLabels';
import { tourWindow, TOUR_EJECT_END_MS, TOUR_FILL_MS, TOUR_LEAD_MS } from '../../../src/lab/view3d/core/flowTour';
import type { FlowPath, VesselFlowPath } from '../../../src/lab/view3d/core/flowTypes';
import { CHEVRON_FRAGMENT, CHEVRON_VERTEX, chevronLayout } from '../../../src/lab/view3d/flowChevrons';
import { FLOW_LABEL_IDS, FLOW_LABEL_KEYS, FLOW_STYLES, FLOW_TOUR, flowStyle } from '../../../src/lab/view3d/flowControls';
import { createHeartMaterial, patchHeartShader, setHeartXray } from '../../../src/lab/view3d/heartMaterial';
import { GLSL_CLIP, GLSL_DISPLACEMENT } from '../../../src/lab/view3d/shaders/chunks';
import { createSharedUniforms } from '../../../src/lab/view3d/shaders/uniforms';

const count = (s: string, sub: string) => s.split(sub).length - 1;
const geo = new StubEngine().geometry;

function line(a: Vec3, b: Vec3, n = 20): Vec3[] {
  return Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n, a[2] + ((b[2] - a[2]) * i) / n] as Vec3);
}
const heart: FlowPath[] = VALVES.map((v, i) => {
  const pts = line([i * 10, 0, 0], [i * 10, 50, 0]);
  const left = v === 'MITRAL' || v === 'AORTIC', av = v === 'MITRAL' || v === 'TRICUSPID';
  return { valve: v, side: left ? 'L' : 'R', leg: av ? 'in' : 'out', pts, radiusMm: pts.map(() => 4), lengthMm: 50 };
});
const aorta: VesselFlowPath = { valve: 'AORTIC', side: 'L', leg: 'out', vessel: 'AORTA', pts: [[0, 0, 0], [0, 30, 0], [10, 60, 0], [20, 40, 0]], radiusMm: [10, 10, 10, 10], lengthMm: 90 };
const svc: VesselFlowPath = { valve: 'TRICUSPID', side: 'R', leg: 'in', vessel: 'SVC', pts: line([10, 70, 0], [10, 0, 0]), radiusMm: Array(21).fill(9), lengthMm: 70 };
const pv: VesselFlowPath = { valve: 'MITRAL', side: 'L', leg: 'in', vessel: 'PV_RS', pts: line([0, 90, 0], [0, 0, 0]), radiusMm: Array(21).fill(5), lengthMm: 90 };

describe('chevron arrows', () => {
  it('one chevron in the middle of every dash, so a whole-dash phase jump maps the set onto itself', () => {
    const part = chevronLayout([{ slot: 0, n: 3 }, { slot: 5, n: 2 }]);
    expect([...part]).toEqual([0, 0.5, 0, 1.5, 0, 2.5, 5, 0.5, 5, 1.5]);
    const shifted = [...part].map((x, i) => (i % 2 ? x + 1 : x));
    // +1 dash, wrapped per path (n = 3 / 2): the same positions
    const wrap = shifted.map((x, i) => (i % 2 ? x % (part[i - 1] === 0 ? 3 : 2) : x));
    expect(new Set(wrap.filter((_, i) => i % 2).map((x, k) => `${part[2 * k]}:${x}`))).toEqual(
      new Set([...part].filter((_, i) => i % 2).map((x, k) => `${part[2 * k]}:${x}`)),
    );
  });

  it('shaders: the shared displacement chunk verbatim, the rest-space clip, focus-scaled alpha, no flat', () => {
    const vs = CHEVRON_VERTEX(16);
    expect(vs.includes(GLSL_DISPLACEMENT)).toBe(true);
    expect(count(vs, 'heartDisplacementAt(')).toBeGreaterThanOrEqual(4); // definition + three samples
    expect(vs).toContain('uniform float uFocus[16];');
    expect(vs).toContain('uFocus[slot]');
    expect(CHEVRON_FRAGMENT.includes(GLSL_CLIP)).toBe(true);
    expect(CHEVRON_FRAGMENT).toContain('HV_CLIP_DISCARD(vRestPos)');
    expect(vs + CHEVRON_FRAGMENT).not.toMatch(/\bflat\b/);
    expect(vs + CHEVRON_FRAGMENT).not.toContain('${');
  });

  it('arrows are the default look; the style switch shows chevrons over a faint track', () => {
    expect(flowStyle.peek()).toBe('arrows');
    expect(FLOW_STYLES).toEqual(['arrows', 'comets', 'cells']);
    const flow = createBloodFlow(geo, [...heart, aorta, svc, pv], createSharedUniforms());
    const byName = (n: string) => flow.group.children.find((o) => o.name === n);
    flow.setStyle('arrows');
    expect(byName('bloodFlow-chevrons')?.visible).toBe(true);
    expect(byName('bloodFlow-streams')?.visible).toBe(true);
    flow.setStyle('cells');
    expect(byName('bloodFlow-chevrons')?.visible).toBe(false);
    expect(byName('bloodFlow-streams')?.visible).toBe(false);
    flow.setStyle('comets');
    expect(byName('bloodFlow-chevrons')?.visible).toBe(false);
    expect(byName('bloodFlow-streams')?.visible).toBe(true);
    flow.dispose();
  });
});

describe('walkthrough focus', () => {
  it('setFocus keeps the named streams (and their jets) bright and dims the others; null restores all', () => {
    const flow = createBloodFlow(geo, [...heart, aorta, svc, pv], createSharedUniforms());
    const mesh = flow.group.children.find((o) => o.name === 'bloodFlow-streams') as unknown as { material: { uniforms: Record<string, { value: Float32Array }> } };
    const focus = mesh.material.uniforms.uFocus.value;
    flow.setFocus(new Set(['heart:AORTIC', 'out:AORTIC'] as const));
    // slots: heart streams 0..3 (VALVES order), then the vessels in input order: aorta 4, svc 5, pv 6
    const ai = VALVES.indexOf('AORTIC');
    expect(focus[ai]).toBe(1);
    expect(focus[4]).toBe(1);
    for (const i of [0, 1, 3, 5, 6]) if (i !== ai) expect(focus[i]).toBeCloseTo(FLOW_DIM);
    flow.setFocus(new Set(['ven:R'] as const));
    expect(focus[5]).toBe(1);
    expect(focus[6]).toBeCloseTo(FLOW_DIM);
    // the jet of a dimmed valve is scaled down with it
    const state = new Float32Array(8).fill(1);
    flow.update(state, [1, 1, 1, 1]);
    const jets = flow.group.children.find((o) => o.name === 'bloodFlow-jets') as unknown as { material: { uniforms: Record<string, { value: Float32Array }> } };
    expect(jets.material.uniforms.uJetAmp.value[ai]).toBeCloseTo(FLOW_DIM);
    flow.setFocus(null);
    expect([...focus.slice(0, 7)]).toEqual([1, 1, 1, 1, 1, 1, 1]);
    flow.dispose();
  });

  it('the seven steps follow the circuit: venae cavae → right heart → lungs → left heart → aorta', () => {
    expect(FLOW_TOUR.map((s) => s.key)).toEqual(FLOW_TOUR.map((_, i) => `flow.tour.${i + 1}`));
    expect(FLOW_TOUR[0].focus).toEqual(['ven:R']);
    expect(FLOW_TOUR[1].focus).toEqual(['heart:TRICUSPID']);
    expect(FLOW_TOUR.at(-1)?.focus).toEqual(['heart:AORTIC', 'out:AORTIC']);
    for (const s of FLOW_TOUR) {
      for (const l of s.labels) expect(FLOW_LABEL_IDS).toContain(l);
      // the timing valve belongs to the side the step shows
      const right = s.focus.some((f) => f === 'ven:R' || f.endsWith('TRICUSPID') || f.endsWith('PULMONARY'));
      expect(['TRICUSPID', 'PULMONARY'].includes(s.valve)).toBe(right);
    }
    expect(Object.keys(FLOW_LABEL_KEYS).sort()).toEqual([...FLOW_LABEL_IDS].sort());
  });
});

describe('walkthrough timing', () => {
  const ev = (id: ValveId, openMs: number, closeMs: number) => ({ id, openMs, closeMs });
  const cycle = { valves: [ev('AORTIC', 1120, 1420), ev('PULMONARY', 1112, 1428), ev('MITRAL', 1512, 1085), ev('TRICUSPID', 1504, 1093)] } as unknown as CycleTruth;
  const engine = { cycleAt: (t: number) => (t >= 1000 && t < 1800 ? cycle : null) };

  it('ejection plays from just before the semilunar valve opens to just before it shuts', () => {
    expect(tourWindow(engine, 1200, FLOW_TOUR[6])).toEqual({ t0: 1120 - TOUR_LEAD_MS, t1: 1420 - TOUR_EJECT_END_MS });
    expect(tourWindow(engine, 1200, FLOW_TOUR[2])).toEqual({ t0: 1112 - TOUR_LEAD_MS, t1: 1428 - TOUR_EJECT_END_MS });
  });

  it('filling plays the AV opening and the rapid-filling surge', () => {
    expect(tourWindow(engine, 1200, FLOW_TOUR[5])).toEqual({ t0: 1512 - TOUR_LEAD_MS, t1: 1512 + TOUR_FILL_MS });
  });

  it('looks ahead to the next beat with valves; nothing to play → null (stay paused)', () => {
    expect(tourWindow(engine, 600, FLOW_TOUR[6])?.t0).toBe(1080);
    expect(tourWindow({ cycleAt: () => null }, 0, FLOW_TOUR[6])).toBeNull();
    expect(tourWindow(engine, 1200, FLOW_TOUR[3])).toBeNull(); // the lungs step
  });

  it('the StubEngine gives a window for every step that plays', () => {
    const stub = new StubEngine();
    for (const s of FLOW_TOUR) {
      const w = tourWindow(stub, 2000, s);
      if (s.at === 'none') expect(w).toBeNull();
      else expect(w && w.t1 > w.t0).toBe(true);
    }
  });
});

describe('name tags', () => {
  it('chambers at their axis centres, vessels on their streams (vein upstream part, top of the arch)', () => {
    const a = flowLabelAnchors(geo, [aorta, svc, pv]);
    for (const c of geo.chambers) {
      const id = ({ 1: 'LA', 2: 'RA', 3: 'LV', 4: 'RV' } as Record<number, string>)[c.chamber];
      if (id) expect(a[id as 'LA']).toEqual(c.centerMm);
    }
    expect(a.SVC).toEqual(svc.pts[4]);
    expect(a.PV).toEqual(pv.pts[4]);
    expect(a.AO).toEqual([10, 60, 0]);
    expect(a.IVC).toBeUndefined();
    expect(a.PA).toBeUndefined();
  });
});

describe('X-ray heart', () => {
  it('patch: see-through alpha after the opaque chunk, electrical colours toned down, no flat', () => {
    const sh = { vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader, uniforms: {} };
    patchHeartShader(sh, createSharedUniforms());
    const fs = sh.fragmentShader;
    expect(fs).toContain('uniform float uXray;');
    expect(fs.indexOf('gl_FragColor.a *= mix(1.0')).toBeGreaterThan(fs.indexOf('#include <opaque_fragment>'));
    expect(fs).toContain('0.55 * uXray');
    expect(fs).not.toMatch(/\bflat\b/);
  });

  it('setHeartXray toggles transparency and depth writes (one recompile per change) and the uniform', () => {
    const m = createHeartMaterial(createSharedUniforms());
    const v0 = m.version;
    setHeartXray(m, true);
    expect([m.transparent, m.depthWrite, m.xray.value]).toEqual([true, false, 1]);
    expect(m.version).toBe(v0 + 1);
    setHeartXray(m, true);
    expect(m.version).toBe(v0 + 1);
    setHeartXray(m, false);
    expect([m.transparent, m.depthWrite, m.xray.value]).toEqual([false, true, 0]);
    m.dispose();
  });
});
