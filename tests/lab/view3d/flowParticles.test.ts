/**
 * Blood-flow stream slots with vessel streams (src/view3d/bloodFlow.ts) and the "blood cell" look
 * (src/view3d/flowParticles.ts): ≤ MAX_FLOW_CELLS instances, laid out so a whole-dash phase jump maps the cells onto
 * themselves (the window wrap stays invisible), positioned in the vertex shader from a static path texture and the
 * same per-slot uniforms as the comets (a pure function of sim time).
 */
import { Mesh, ShaderMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { StubEngine } from '../../../src/lab/sim/stub/stubEngine';
import type { Vec3 } from '../../../src/lab/sim/types';
import { VALVES } from '../../../src/lab/sim/types';
import { createBloodFlow, flowDashes, flowPhase, flowSlots, MAX_FLOW_PATHS } from '../../../src/lab/view3d/bloodFlow';
import { FLOW_A, FLOW_Q, FLOW_STATE_LEN } from '../../../src/lab/view3d/core/flowTypes';
import type { FlowPath, VesselFlowPath } from '../../../src/lab/view3d/core/flowTypes';
import { VEN_A, VEN_Q, VENOUS_STATE_LEN } from '../../../src/lab/view3d/core/venousTiming';
import {
  CELL_FRAGMENT, CELL_VERTEX, cellLayout, MAX_FLOW_CELLS, PATH_TEX_SAMPLES, pathTextureData,
} from '../../../src/lab/view3d/flowParticles';
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
const artery: VesselFlowPath = { valve: 'AORTIC', side: 'L', leg: 'out', vessel: 'AORTA', pts: line([20, 50, 0], [20, 50, 120], 40), radiusMm: Array(41).fill(10), lengthMm: 120 };
const vein: VesselFlowPath = { valve: 'MITRAL', side: 'L', leg: 'in', vessel: 'PV_RS', pts: line([0, 90, 0], [0, 0, 0]), radiusMm: Array(21).fill(5), lengthMm: 90 };
const caval: VesselFlowPath = { valve: 'TRICUSPID', side: 'R', leg: 'in', vessel: 'SVC', pts: line([10, 70, 0], [10, 0, 0]), radiusMm: Array(21).fill(9), lengthMm: 70 };

describe('stream slots with vessel streams', () => {
  it('heart streams at their VALVES slot, vessel streams after them, at most MAX_FLOW_PATHS', () => {
    const slots = flowSlots([artery, ...heart, vein]);
    expect(slots.map((s) => [s.slot, s.path.valve, (s.path as VesselFlowPath).vessel ?? null])).toEqual([
      [0, 'MITRAL', null], [1, 'TRICUSPID', null], [2, 'AORTIC', null], [3, 'PULMONARY', null], [4, 'AORTIC', 'AORTA'], [5, 'MITRAL', 'PV_RS'],
    ]);
    const many = Array.from({ length: 20 }, () => vein);
    expect(flowSlots([...heart, ...many]).length).toBe(MAX_FLOW_PATHS);
  });

  it('outflow continuation: the semilunar A at its heart stream’s dash rate; veins: the venous A and q of their side', () => {
    const flow = createBloodFlow(geo, [...heart, artery, vein, caval], createSharedUniforms());
    const u = ((flow.group.children[0] as Mesh).material as ShaderMaterial).uniforms;
    const state = new Float32Array(FLOW_STATE_LEN), ven = new Float32Array(VENOUS_STATE_LEN);
    const AI = VALVES.indexOf('AORTIC');
    state[FLOW_A + AI] = 0.37;
    state[FLOW_Q + AI] = 0.6;
    ven[VEN_A] = 0.42; // left (pulmonary veins)
    ven[VEN_Q] = 0.3;
    ven[VEN_A + 1] = 0.81; // right (venae cavae)
    ven[VEN_Q + 1] = 0.5;
    flow.update(state, [1, 1, 1, 1], ven);
    const mAortic = flowDashes(50).m;
    expect(u.uPhase.value[4]).toBeCloseTo(flowPhase(mAortic, Math.fround(0.37)), 6); // same m as the aortic stream
    expect(u.uPhase.value[4]).toBeCloseTo(u.uPhase.value[AI], 6);
    expect(u.uFlow.value[4]).toBeCloseTo(0.6, 6);
    expect(u.uDash.value[4]).toBe(flowDashes(120).n);
    expect(u.uPhase.value[5]).toBeCloseTo(flowPhase(flowDashes(90).m, Math.fround(0.42)), 6);
    expect(u.uFlow.value[5]).toBeCloseTo(0.3, 6);
    expect(u.uPhase.value[6]).toBeCloseTo(flowPhase(flowDashes(70).m, Math.fround(0.81)), 6);
    expect(u.uFlow.value[6]).toBeCloseTo(0.5, 6);
    // colours follow the heart side of each stream
    flow.setColors('#ff0000', '#0000ff');
    const col = u.uColor.value as { r: number; b: number }[];
    for (const i of [0, 2, 4, 5]) expect(col[i].r > 0.99 && col[i].b < 0.01).toBe(true);
    for (const i of [1, 3, 6]) expect(col[i].b > 0.99 && col[i].r < 0.01).toBe(true);
    // without venous state the veins hold still
    flow.update(state, [1, 1, 1, 1]);
    expect(u.uPhase.value[5]).toBe(0);
    expect(u.uFlow.value[5]).toBe(0);
    flow.dispose();
  });
});

describe('blood-cell layout', () => {
  const inputs = [...heart, artery, vein, caval].map((p, i) => ({
    slot: i, n: flowDashes(p.lengthMm).n, radiusMm: p.radiusMm.reduce((s, r) => s + r, 0) / p.radiusMm.length,
  }));

  it('stays within the instance budget, fills most of it, deterministic', () => {
    const a = cellLayout(inputs), b = cellLayout(inputs);
    expect(a.count).toBeLessThanOrEqual(MAX_FLOW_CELLS);
    expect(a.count).toBeGreaterThan(0.8 * MAX_FLOW_CELLS);
    expect(a.part).toEqual(b.part);
    expect(a.size).toEqual(b.size);
    // wider lumen, more cells per dash
    expect(a.perDash[4]).toBeGreaterThan(a.perDash[0]);
    for (const c of a.perDash) expect(c).toBeGreaterThanOrEqual(1);
    // a tight budget still gives every stream at least one cell per dash, never more than the budget
    const small = cellLayout(inputs, 120);
    expect(small.count).toBeLessThanOrEqual(120);
    expect(cellLayout(inputs.slice(0, 1), MAX_FLOW_CELLS).count).toBeLessThanOrEqual(MAX_FLOW_CELLS);
  });

  it('a whole-dash phase jump maps every stream’s cells onto themselves (the window wrap is invisible)', () => {
    const L = cellLayout(inputs);
    for (const inp of inputs) {
      const cells: string[] = [];
      for (let k = 0; k < L.count; k++) {
        if (L.part[4 * k] !== inp.slot) continue;
        cells.push(`${L.part[4 * k + 1]}|${L.part[4 * k + 2]}|${L.part[4 * k + 3]}|${L.size[k]}`);
      }
      const key = (shift: number) =>
        cells
          .map((c) => {
            const [x, ang, frac, size] = c.split('|').map(Number);
            // cell positions depend on (x mod n, angle, fraction, size) only
            return `${((((x + shift) % inp.n) + inp.n) % inp.n).toFixed(4)}|${ang}|${frac}|${size}`;
          })
          .sort()
          .join(';');
      for (const shift of [1, 2, inp.n - 1]) expect(key(shift), `slot ${inp.slot} shift ${shift}`).toBe(key(0));
    }
  });

  it('path texture: one position row and one unit-normal row per slot, uniform in arc length', () => {
    const S = PATH_TEX_SAMPLES;
    const data = pathTextureData([{ slot: 1, path: artery }], 3);
    expect(data.length).toBe(4 * S * 2 * 3);
    const px = (row: number, s: number) => Array.from(data.subarray(4 * (row * S + s), 4 * (row * S + s) + 4));
    expect(px(2, 0).slice(0, 3)).toEqual([20, 50, 0]);
    expect(px(2, S - 1)[2]).toBeCloseTo(120, 4);
    expect(px(2, (S - 1) / 2 + 0.5 | 0)[2]).toBeCloseTo((120 * ((S / 2) | 0)) / (S - 1), 3);
    expect(px(2, 10)[3]).toBe(10); // lumen radius
    for (const s of [0, 40, S - 1]) {
      const n = new Vector3(...px(3, s).slice(0, 3));
      expect(n.length()).toBeCloseTo(1, 5);
      expect(Math.abs(n.z)).toBeLessThan(1e-6); // ⊥ the tangent (+z)
    }
    // unused slots stay zero
    expect(px(0, 5)).toEqual([0, 0, 0, 0]);
  });
});

describe('blood-cell meshes and shaders', () => {
  it('built on the first setStyle("cells"), sharing the comets’ per-slot uniforms; the streams hide, the jets stay', () => {
    const U = createSharedUniforms();
    const flow = createBloodFlow(geo, [...heart, artery, vein], U);
    expect(flow.cells).toBe(0);
    const stream = flow.group.children.find((m) => m.name === 'bloodFlow-streams') as Mesh;
    flow.setStyle('cells');
    const cells = flow.group.children.filter((m) => m.name.startsWith('bloodFlow-cells')) as Mesh[];
    expect(cells.map((m) => m.name)).toEqual(['bloodFlow-cells', 'bloodFlow-cells-ghost']);
    expect(flow.cells).toBeGreaterThan(0);
    expect(flow.cells).toBeLessThanOrEqual(MAX_FLOW_CELLS);
    expect(stream.visible).toBe(false);
    expect(cells.every((m) => m.visible && !m.frustumCulled)).toBe(true);
    expect(flow.group.children.filter((m) => m.name.startsWith('bloodFlow-jets')).every((m) => m.visible)).toBe(true);
    const su = (stream.material as ShaderMaterial).uniforms;
    for (const m of cells) {
      const cu = (m.material as ShaderMaterial).uniforms;
      for (const k of ['uPhase', 'uDash', 'uBlur', 'uColor']) expect(cu[k], k).toBe(su[k]);
      expect(cu.uBeatV).toBe(U.uBeatV);
    }
    // the clip define follows the layer
    flow.setClip(true);
    for (const m of cells) expect('HV_CLIP' in ((m.material as ShaderMaterial).defines ?? {})).toBe(true);
    flow.setStyle('comets');
    expect(stream.visible).toBe(true);
    expect(cells.every((m) => !m.visible)).toBe(true);
    flow.dispose();
  });

  it('vertex shader: displacement chunk, path texture, per-slot arrays; fragment: rest-space clip, disc / capsule', () => {
    const vs = CELL_VERTEX(MAX_FLOW_PATHS);
    expect(vs.includes(GLSL_DISPLACEMENT)).toBe(true);
    expect(count(vs, 'heartDisplacementAt(')).toBeGreaterThanOrEqual(3); // definition + head + tail
    expect(vs).toContain('texelFetch(uPathTex');
    for (const u of ['uPhase', 'uDash', 'uBlur', 'uColor']) expect(vs).toMatch(new RegExp(`uniform\\s+\\w+\\s+${u}\\[${MAX_FLOW_PATHS}\\];`));
    expect(CELL_FRAGMENT.includes(GLSL_CLIP)).toBe(true);
    expect(CELL_FRAGMENT).toContain('HV_CLIP_DISCARD(vRestPos)');
    expect(CELL_FRAGMENT).toContain('#include <colorspace_fragment>');
    for (const s of [vs, CELL_FRAGMENT]) {
      expect(count(s, '{')).toBe(count(s, '}'));
      expect(count(s, '(')).toBe(count(s, ')'));
      expect(s).not.toContain('${');
      expect(s).not.toMatch(/flat/);
    }
  });
});
