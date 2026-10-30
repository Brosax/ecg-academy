import { GreaterDepth, InstancedMesh, Matrix4, Mesh, ShaderLib, ShaderMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { buildPose } from '../../../src/lab/sim/frame';
import { StubEngine } from '../../../src/lab/sim/stub/stubEngine';
import { STRUCTURES, VALVES } from '../../../src/lab/sim/types';
import type { Vec3 } from '../../../src/lab/sim/types';
import {
  COMET_BLUR_RAMP, cometBlur, createBloodFlow, FLOW_DASH_MM, FLOW_FRAGMENT, FLOW_VERTEX, flowDashes, flowPhase, JET_FRAGMENT,
  JET_SLIDE_MM, JET_VERTEX, MAX_FLOW_PATHS,
} from '../../../src/lab/view3d/bloodFlow';
import { CAMERA_PRESETS, fitDistance, presetDirection } from '../../../src/lab/view3d/cameras';
import { TUBE_FRAGMENT, TUBE_VERTEX } from '../../../src/lab/view3d/conductionTubes';
import { structureAnchors, ventricularCentroid } from '../../../src/lab/view3d/core/anchors';
import { FLOW_A, FLOW_Q, FLOW_STATE_LEN } from '../../../src/lab/view3d/core/flowTypes';
import type { FlowPath } from '../../../src/lab/view3d/core/flowTypes';
import { ATTR, UNIFORM } from '../../../src/lab/view3d/gpuContract';
import { HEART_PROGRAM_KEY, patchHeartShader } from '../../../src/lab/view3d/heartMaterial';
import { GLSL_BEATS, GLSL_CLIP, GLSL_DISPLACEMENT, GLSL_ELECTRICAL, GLSL_GRID, GLSL_HIGHLIGHT } from '../../../src/lab/view3d/shaders/chunks';
import { createSharedUniforms } from '../../../src/lab/view3d/shaders/uniforms';
import { ARROW_FRAGMENT, ARROW_VERTEX, createSlicePlane, SLICE_FRAGMENT, SLICE_VERTEX } from '../../../src/lab/view3d/slicePlane';
import { patchValveShader, VALVE_PROGRAM_KEY } from '../../../src/lab/view3d/valves';

const standard = () => ({ vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader, uniforms: {} });
const count = (s: string, sub: string) => s.split(sub).length - 1;

describe('shared GLSL', () => {
  const uniforms = createSharedUniforms();
  const heart = standard();
  patchHeartShader(heart, uniforms);
  const valve = standard();
  patchValveShader(valve, uniforms);
  const vertexSources: Record<string, string> = {
    heart: heart.vertexShader,
    slicePlane: SLICE_VERTEX,
    sliceArrows: ARROW_VERTEX,
    conductionTubes: TUBE_VERTEX,
    valves: valve.vertexShader,
    bloodFlow: FLOW_VERTEX,
    bloodFlowJets: JET_VERTEX,
  };

  it('the ONE displacement chunk is included verbatim (once) in the heart material and the slice plane, and used', () => {
    for (const [name, src] of Object.entries(vertexSources)) {
      expect(src.includes(GLSL_DISPLACEMENT), name).toBe(true);
      expect(count(src, 'vec3 heartDisplacement(vec3 p'), name).toBe(1);
      expect(count(src, 'heartDisplacementAt('), name).toBeGreaterThanOrEqual(2); // definition + call
    }
  });

  it('heart fragment and slice fragment colour with the same electrical-state chunk', () => {
    expect(heart.fragmentShader.includes(GLSL_ELECTRICAL)).toBe(true);
    expect(SLICE_FRAGMENT.includes(GLSL_ELECTRICAL)).toBe(true);
    expect(heart.fragmentShader).toContain('hvAtrialColor(vRestPos, vTAct, vApd)');
    expect(heart.vertexShader + heart.fragmentShader).not.toMatch(/flat/);
    expect(SLICE_FRAGMENT).toContain('hvTissueColor(tissue, f.xy, f.z, vRestPos)');
  });

  it('heart patch hooks into r186 chunks: clipping, colour, emissive, contract attributes', () => {
    expect(heart.fragmentShader).toContain('HV_CLIP_DISCARD(vRestPos)');
    expect(heart.fragmentShader).toContain('totalEmissiveRadiance += hvEmissive;');
    expect(heart.fragmentShader.includes(GLSL_CLIP) && heart.fragmentShader.includes(GLSL_HIGHLIGHT)).toBe(true);
    for (const a of Object.values(ATTR)) expect(heart.vertexShader).toContain(`attribute float ${a};`);
    expect(HEART_PROGRAM_KEY).not.toBe(VALVE_PROGRAM_KEY);
  });

  it('every contract uniform is declared in the chunks and provided by the shared uniform set', () => {
    const all = GLSL_BEATS + GLSL_GRID + GLSL_DISPLACEMENT + GLSL_CLIP + GLSL_HIGHLIGHT;
    for (const u of Object.values(UNIFORM)) {
      expect(new RegExp(`uniform\\s+[\\w ]+\\s${u}\\b`).test(all), u).toBe(true);
      expect(u in uniforms, u).toBe(true);
    }
    expect(uniforms.uBeatA.value.length).toBe(2);
    expect(uniforms.uHighlight.value.length).toBe(8);
    // the patched shader carries the shared IUniform objects by reference (zero-copy per-frame updates)
    expect((heart.uniforms as Record<string, unknown>).uBeatV).toBe(uniforms.uBeatV);
  });

  it('GLSL sources are syntactically balanced', () => {
    const sources = [
      GLSL_BEATS, GLSL_GRID, GLSL_DISPLACEMENT, GLSL_ELECTRICAL, GLSL_CLIP, GLSL_HIGHLIGHT, SLICE_VERTEX, SLICE_FRAGMENT, ARROW_VERTEX,
      ARROW_FRAGMENT, TUBE_VERTEX, TUBE_FRAGMENT, FLOW_VERTEX, FLOW_FRAGMENT, JET_VERTEX, JET_FRAGMENT,
    ];
    for (const s of sources) {
      expect(count(s, '{')).toBe(count(s, '}'));
      expect(count(s, '(')).toBe(count(s, ')'));
      expect(s).not.toContain('${');
    }
  });

  it('blood-flow shaders: rest-space clip in both fragments, displacement at the rest position, plain varyings', () => {
    for (const fs of [FLOW_FRAGMENT, JET_FRAGMENT]) {
      expect(fs.includes(GLSL_CLIP)).toBe(true);
      expect(fs).toContain('HV_CLIP_DISCARD(vRestPos)');
      expect(fs).toContain('#include <colorspace_fragment>');
    }
    expect(FLOW_VERTEX).toContain('vRestPos = position;');
    expect(FLOW_VERTEX).toContain('vec3 p = position + heartDisplacementAt(position);');
    expect(JET_VERTEX).toContain('heartDisplacementAt(centre)');
    expect(FLOW_FRAGMENT).toContain('fract(vComet.x)');
    // motion blur: the comet is box-filtered over [x, x + w] with the sawtooth antiderivatives
    expect(FLOW_FRAGMENT).toContain('(sawInt(vComet.x + w) - sawInt(vComet.x)) / w');
    expect(FLOW_FRAGMENT).toContain('(sawInt4(vComet.x + w) - sawInt4(vComet.x)) / w');
    expect(FLOW_VERTEX).toContain('uBlur[i]');
    for (const s of [FLOW_VERTEX, FLOW_FRAGMENT, JET_VERTEX, JET_FRAGMENT]) expect(s).not.toMatch(/flat/);
    // per-path / per-valve values are material-local uniforms, not shared ones
    const shared = createSharedUniforms() as Record<string, unknown>;
    // per stream slot (heart streams 0–3 in VALVES order, vessel streams after them) / per valve (jets)
    for (const u of ['uPhase', 'uFlow', 'uDash', 'uBlur', 'uColor']) {
      expect(new RegExp(`uniform\\s+\\w+\\s+${u}\\[${MAX_FLOW_PATHS}\\];`).test(FLOW_VERTEX), u).toBe(true);
      expect(u in shared, u).toBe(false);
    }
    expect(JET_VERTEX).toContain(`uniform vec3 uColor[${MAX_FLOW_PATHS}];`);
    for (const u of ['uJetAmp', 'uJetSlide']) {
      expect(new RegExp(`uniform\\s+\\w+\\s+${u}\\[4\\];`).test(JET_VERTEX), u).toBe(true);
      expect(u in shared, u).toBe(false);
    }
  });

  it('slice plane: with the flow layer on, the blood fill is discarded (the cut cavity opens onto the streams)', () => {
    expect(SLICE_FRAGMENT).toMatch(/uniform\s+float\s+uFlowOpen;/);
    // the switch sits in the blood (not-wall) branch only, after the tissue test: the wall section is never affected
    const blood = SLICE_FRAGMENT.slice(SLICE_FRAGMENT.indexOf('if (f.w >= 0.0)'), SLICE_FRAGMENT.indexOf('} else if (tissue < 1.5)'));
    expect(blood).toContain('if (uFlowOpen > 0.5) discard;');
    expect(count(SLICE_FRAGMENT, 'uFlowOpen')).toBe(2);
    const slice = createSlicePlane(createSharedUniforms());
    const u = (slice.mesh.material as ShaderMaterial).uniforms;
    expect(u.uFlowOpen.value).toBe(0);
    slice.setFlowOpen(true);
    expect(u.uFlowOpen.value).toBe(1);
    slice.setFlowOpen(false);
    expect(u.uFlowOpen.value).toBe(0);
    slice.dispose();
  });
});

describe('blood-flow comet phase', () => {
  it('dash counts: N = round(L / 8 mm), m = round(N / 2), both at least 1', () => {
    expect(FLOW_DASH_MM).toBe(8);
    expect(flowDashes(80)).toEqual({ n: 10, m: 5 });
    expect(flowDashes(100)).toEqual({ n: 13, m: 7 });
    expect(flowDashes(3)).toEqual({ n: 1, m: 1 });
    expect(flowDashes(Number.NaN)).toEqual({ n: 1, m: 1 });
  });

  it('phase is fract(m·A) in [0, 1) and identical at A = 0 and A = 1 (seamless window wrap)', () => {
    for (let m = 1; m <= 12; m++) {
      expect(flowPhase(m, 0)).toBe(0);
      expect(flowPhase(m, 1)).toBe(0);
      expect(flowPhase(m, 0.3)).toBeCloseTo((m * 0.3) % 1, 12);
      expect(flowPhase(m, 0.3)).toBeGreaterThanOrEqual(0);
      expect(flowPhase(m, 0.3)).toBeLessThan(1);
    }
    expect(flowPhase(3, Number.NaN)).toBe(0);
    expect(flowPhase(3, Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('phase is continuous mod 1 across successive valve windows (A: 0 → 1 held, next window from 0)', () => {
    // seeded (mulberry32) uneven steps of A
    let seed = 0x5eed;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const maxStep = 0.002;
    for (const L of [36, 64, 90, 150]) {
      const { n, m } = flowDashes(L);
      let a = 0, prev = flowPhase(m, 0), maxJump = 0, wraps = 0;
      for (let k = 0; k < 6000; k++) {
        a += maxStep * rnd();
        if (a >= 1) {
          // window end: A reaches 1 (held), then the next window starts again at 0
          const end = flowPhase(m, 1), d0 = Math.abs(end - prev);
          maxJump = Math.max(maxJump, Math.min(d0, 1 - d0));
          prev = end;
          a = 0;
          wraps++;
        }
        const cur = flowPhase(m, a), d = Math.abs(cur - prev);
        maxJump = Math.max(maxJump, Math.min(d, 1 - d));
        prev = cur;
      }
      expect(wraps).toBeGreaterThan(3);
      expect(maxJump).toBeLessThanOrEqual(m * maxStep + 1e-9);
      expect(maxJump).toBeLessThan(1 / n);
    }
  });
});

describe('blood-flow layer (stub geometry)', () => {
  const geo = new StubEngine().geometry;
  const v3 = (a: Vec3) => new Vector3(a[0], a[1], a[2]);
  // synthetic paths through each valve along its forward normal (core/flowPaths.ts builds the real ones)
  const paths: FlowPath[] = geo.valves.map((v) => {
    const c = v3(v.centerMm), n = v3(v.normal).normalize();
    const off = new Vector3(1, 0, 0).cross(n).lengthSq() > 1e-6 ? new Vector3(1, 0, 0).cross(n).normalize() : new Vector3(0, 0, 1);
    const pts: Vec3[] = [];
    for (let i = 0; i <= 20; i++) {
      const p = c.clone().addScaledVector(n, -24 + (48 * i) / 20).addScaledVector(off, 6 * Math.sin((Math.PI * i) / 20));
      pts.push([p.x, p.y, p.z]);
    }
    const left = v.id === 'MITRAL' || v.id === 'AORTIC', av = v.id === 'MITRAL' || v.id === 'TRICUSPID';
    return { valve: v.id, side: left ? 'L' : 'R', leg: av ? 'in' : 'out', pts, radiusMm: pts.map(() => 5), lengthMm: 50 };
  });

  it('builds one merged stream geometry (aPath = VALVES index) and one instanced jet mesh, two passes each', () => {
    expect(paths.length).toBe(4);
    const U = createSharedUniforms();
    const flow = createBloodFlow(geo, paths, U);
    const meshes = flow.group.children as Mesh[];
    const streams = meshes.filter((m) => m.name.startsWith('bloodFlow-streams'));
    const jets = meshes.filter((m): m is InstancedMesh => m instanceof InstancedMesh);
    expect(streams.length).toBe(2);
    expect(jets.length).toBe(2);
    expect(streams[0].geometry).toBe(streams[1].geometry);
    const g = streams[0].geometry;
    expect(g.getAttribute('position').count).toBe(paths.length * 97 * 9); // (96 + 1) rings × (8 + 1) vertices per tube
    const slot = g.getAttribute('aPath');
    const seen = new Set<number>();
    for (let i = 0; i < slot.count; i++) seen.add(slot.getX(i));
    expect([...seen].sort()).toEqual(paths.map((p) => VALVES.indexOf(p.valve)).sort());
    const index = g.getIndex()!;
    for (let i = 0; i < index.count; i += 3) {
      // a triangle never spans two paths, so per-path varyings are constant over it
      expect(slot.getX(index.getX(i))).toBe(slot.getX(index.getX(i + 1)));
      expect(slot.getX(index.getX(i))).toBe(slot.getX(index.getX(i + 2)));
    }
    for (const m of meshes) expect(m.frustumCulled).toBe(false);
    // core pass where visible, ghost where the wall hides it (conduction-tube convention)
    const phase = (streams[0].material as ShaderMaterial).uniforms.uPhase;
    for (const m of [...streams, ...jets]) {
      const mat = m.material as ShaderMaterial;
      expect(mat.transparent && !mat.depthWrite).toBe(true);
      const ghost = m.name.endsWith('-ghost');
      expect(mat.depthFunc === GreaterDepth).toBe(ghost);
      expect(m.renderOrder).toBe(ghost ? 5 : 3);
      expect(mat.uniforms.uOpacity.value).toBe(ghost ? 0.8 : 1);
      // shared uniforms by reference (zero-copy), local ones common to every pass
      expect(mat.uniforms.uBeatV).toBe(U.uBeatV);
      expect(mat.uniforms.uPhase).toBe(phase);
    }
    // jets sit at the valve centres with +X along the forward-flow normal
    const m4 = new Matrix4(), o = new Vector3(), ax = new Vector3();
    for (const j of jets) expect(j.count).toBe(VALVES.length);
    for (let i = 0; i < VALVES.length; i++) {
      const v = geo.valves.find((x) => x.id === VALVES[i]);
      if (!v) continue;
      jets[0].getMatrixAt(i, m4);
      o.setFromMatrixPosition(m4);
      expect(o.distanceTo(v3(v.centerMm))).toBeLessThan(1e-4);
      ax.setFromMatrixColumn(m4, 0).normalize();
      expect(ax.dot(v3(v.normal).normalize())).toBeGreaterThan(0.999);
    }
    flow.dispose();
  });

  it('update writes only uniform floats: phase = fract(m·A), q, jet amplitude = openness·q, slide = A·15 mm', () => {
    const flow = createBloodFlow(geo, paths, createSharedUniforms());
    const u = ((flow.group.children[0] as Mesh).material as ShaderMaterial).uniforms;
    const before = { phase: u.uPhase.value, flow: u.uFlow.value, amp: u.uJetAmp.value, slide: u.uJetSlide.value, color: u.uColor.value };
    const state = new Float32Array(FLOW_STATE_LEN);
    const open = [1, 0.5, 0, 1];
    const A = [0.3, 0.6, 0.9, 1], q = [0.8, 0.2, 0, 1];
    for (let i = 0; i < 4; i++) {
      state[FLOW_A + i] = A[i];
      state[FLOW_Q + i] = q[i];
    }
    flow.update(state, open);
    const { n, m } = flowDashes(50);
    for (let i = 0; i < 4; i++) {
      expect(u.uDash.value[i]).toBe(n);
      expect(u.uPhase.value[i]).toBeCloseTo(flowPhase(m, Math.fround(A[i])), 6);
      expect(u.uFlow.value[i]).toBeCloseTo(q[i], 6);
      expect(u.uJetAmp.value[i]).toBeCloseTo(open[i] * q[i], 6);
      expect(u.uJetSlide.value[i]).toBeCloseTo(Math.fround(A[i]) * JET_SLIDE_MM, 4);
    }
    expect(u.uJetAmp.value[2]).toBe(0); // valve shut, q = 0: no jet; the stream keeps its phase (frozen)
    // the same arrays are written in place (no per-frame allocation, no new uniform objects)
    expect(u.uPhase.value).toBe(before.phase);
    expect(u.uFlow.value).toBe(before.flow);
    expect(u.uJetAmp.value).toBe(before.amp);
    expect(u.uJetSlide.value).toBe(before.slide);
    // non-finite / out-of-range inputs are clamped
    state.fill(Number.NaN);
    flow.update(state, [2, -1, Number.NaN, 1]);
    for (let i = 0; i < 4; i++) {
      expect(u.uPhase.value[i]).toBe(0);
      expect(u.uFlow.value[i]).toBe(0);
      expect(u.uJetAmp.value[i]).toBe(0);
    }
    // left heart (MITRAL, AORTIC) O2-rich, right heart (TRICUSPID, PULMONARY) O2-poor
    flow.setColors('#ff0000', '#0000ff');
    expect(u.uColor.value).toBe(before.color);
    const [mv, tv, av, pv] = u.uColor.value as { r: number; b: number }[];
    for (const c of [mv, av]) expect(c.r > 0.99 && c.b < 0.01).toBe(true);
    for (const c of [tv, pv]) expect(c.b > 0.99 && c.r < 0.01).toBe(true);
    flow.dispose();
  });

  it('motion blur: width = cometBlur(m · ΔA) since the previous update; the 1 → 0 window wrap continues the motion', () => {
    const flow = createBloodFlow(geo, paths, createSharedUniforms());
    const u = ((flow.group.children[0] as Mesh).material as ShaderMaterial).uniforms;
    const blur = u.uBlur.value as Float32Array;
    const { m } = flowDashes(50);
    const state = new Float32Array(FLOW_STATE_LEN);
    const step = (A: readonly number[]): void => {
      for (let i = 0; i < 4; i++) state[FLOW_A + i] = A[i];
      flow.update(state, [1, 1, 1, 1]);
    };
    step([0.2, 0.5, 0.95, 0.3]);
    step([0.21, 0.5, 0.02, 0.9]);
    const travel = [0.01, 0, 1 - 0.95 + 0.02, 0.6].map((d, i) => m * (i === 3 ? Math.fround(0.9) - Math.fround(0.3) : d));
    for (let i = 0; i < 4; i++) expect(blur[i], `slot ${i}`).toBeCloseTo(cometBlur(travel[i]), 5);
    expect(blur[1]).toBe(0); // held A (valve shut, or paused): sharp comets
    expect(blur[3]).toBe(1); // several dashes in one frame: even
    // paused: the same A again leaves every comet sharp; the array is written in place
    step([0.21, 0.5, 0.02, 0.9]);
    expect([...blur]).toEqual(new Array(MAX_FLOW_PATHS).fill(0));
    expect(u.uBlur.value).toBe(blur);
    flow.dispose();
  });

  it('cometBlur: the swept stretch for slow motion, a whole dash from half a dash per frame on (no wagon-wheel aliasing)', () => {
    const [r0, r1] = COMET_BLUR_RAMP;
    expect(r1).toBe(0.5);
    expect(cometBlur(0)).toBe(0);
    expect(cometBlur(Number.NaN)).toBe(0);
    for (const s of [0.01, 0.1, r0]) expect(cometBlur(s)).toBeCloseTo(s, 12);
    for (const s of [0.5, 0.51, 0.8, 1, 3.7, 40]) expect(cometBlur(s)).toBe(1);
    expect(cometBlur(-0.2)).toBe(cometBlur(0.2));
    // monotone and continuous, so the streak lengthens smoothly as the flow speeds up
    let last = 0;
    for (let s = 0; s <= 1; s += 1 / 512) {
      const w = cometBlur(s);
      expect(w).toBeGreaterThanOrEqual(last);
      expect(w - last).toBeLessThan(0.02);
      expect(w).toBeGreaterThanOrEqual(Math.min(1, s));
      last = w;
    }
    // what is left of the dash pattern (its fundamental, |sinc w|) while the shift is close below half a dash: faint
    const residual = (w: number) => Math.abs(Math.sin(Math.PI * w) / (Math.PI * w));
    expect(residual(cometBlur(0.45))).toBeLessThan(0.25);
  });

  it('setClip toggles the HV_CLIP program variant on every pass; without paths only the jets remain', () => {
    const flow = createBloodFlow(geo, paths, createSharedUniforms());
    const mats = (flow.group.children as Mesh[]).map((m) => m.material as ShaderMaterial);
    expect(mats.length).toBe(4);
    flow.setClip(true);
    for (const m of mats) expect('HV_CLIP' in (m.defines ?? {})).toBe(true);
    flow.setClip(false);
    for (const m of mats) expect('HV_CLIP' in (m.defines ?? {})).toBe(false);
    flow.dispose();
    const bare = createBloodFlow(geo, [], createSharedUniforms());
    expect(bare.group.children.length).toBe(2);
    bare.update(new Float32Array(FLOW_STATE_LEN), [0, 0, 0, 0]);
    bare.dispose();
  });
});

describe('camera presets and label anchors', () => {
  it('preset directions are unit vectors and avoid the OrbitControls pole', () => {
    const R = buildPose().R;
    for (const p of CAMERA_PRESETS) {
      const d = presetDirection(p, R, [0, -1, 0]);
      expect(Math.hypot(d[0], d[1], d[2])).toBeCloseTo(1, 9);
      expect(Math.abs(d[1])).toBeLessThan(0.97);
    }
    expect(presetDirection('anterior', R, null)).toEqual([0, 0, 1]);
    // base view looks from the base: local +y (apex → base) points up/right/back in the app frame
    const b = presetDirection('base', R, null);
    expect(b[1]).toBeGreaterThan(0);
    expect(b[2]).toBeLessThan(0);
  });
  it('fits a sphere in both fields of view', () => {
    expect(fitDistance(10, 35, 1)).toBeCloseTo(10 / Math.sin((17.5 * Math.PI) / 180), 6);
    expect(fitDistance(10, 35, 0.5)).toBeGreaterThan(fitDistance(10, 35, 1));
  });
  it('every structure that can be highlighted on the stub has a label anchor', () => {
    const eng = new StubEngine();
    const a = structureAnchors(eng.geometry);
    for (const id of ['SA', 'AVN', 'HIS', 'LBB', 'RBB', 'SEPTUM', 'LV_APEX', 'RVOT', 'MITRAL', 'AORTIC', 'LA', 'RA'] as const) expect(a[id], id).toBeDefined();
    expect(Object.keys(a).every((k) => (STRUCTURES as readonly string[]).includes(k))).toBe(true);
    const c = ventricularCentroid(eng.geometry);
    expect(Math.hypot(c[0], c[1], c[2])).toBeLessThan(30);
  });
});
