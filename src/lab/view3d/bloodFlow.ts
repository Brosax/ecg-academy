/**
 * Schematic blood flow (血流示意): comet streamlines along the flow paths — the four heart streams (core/flowPaths.ts)
 * and the vessel streams (core/vesselPaths.ts: venous inflow, great-artery outflow), local mm — and four valve-plane jet
 * arrows; optionally "blood cells" (flowParticles.ts) instead of the comets. Purely kinematic: the per-valve advance A
 * and intensity q come from core/flowTiming.ts (engine.cycleAt valve / mechanical truth), the venous ones from
 * core/venousTiming.ts (the same windows), and are written as a handful of uniform floats per frame; the geometry is
 * static. Slots 0–3 are the heart streams in VALVES order (the jets use their colours), vessel streams follow; an
 * outflow continuation advances as many dashes per window as its heart stream, so the comets cross the valve
 * seamlessly. Streams and jets ride the same GPU displacement field as the wall and the leaflets and honour the rest-space
 * cross-section clip. Two passes each, like the conduction tubes: core where visible, faint ghost where the wall hides it.
 * The comets are motion-blurred over their travel since the previous frame (cometBlur): during the rapid-filling and
 * early-ejection surges they move more than half a dash per frame at 1x, where a point-sampled sawtooth would alias
 * (comets frozen or running backwards, which would read as regurgitation).
 */
import {
  BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, DoubleSide, FrontSide, GreaterDepth, Group, InstancedMesh,
  Matrix4, Mesh, ShaderMaterial, TubeGeometry, Vector3,
} from 'three';
import type { IUniform, Side } from 'three';
import { VALVES } from '../sim/types';
import type { GeometryBundle, ValveId } from '../sim/types';
import { FLOW_A, FLOW_Q, isVesselPath } from './core/flowTypes';
import type { FlowPath } from './core/flowTypes';
import { VEN_A, VEN_Q } from './core/venousTiming';
import { createFlowChevrons } from './flowChevrons';
import type { FlowChevrons } from './flowChevrons';
import type { FlowStreamKey, FlowStyle } from './flowControls';
import { createFlowCells } from './flowParticles';
import type { FlowCells } from './flowParticles';
import { GLSL_BEATS, GLSL_CLIP, GLSL_DISPLACEMENT, GLSL_GRID, setClipDefine } from './shaders/chunks';
import type { SharedUniforms } from './shaders/uniforms';

export const FLOW_TUBE_RADIUS_MM = 2.2;
/** Uniform slots for streams (4 heart streams + up to 12 vessel streams). */
export const MAX_FLOW_PATHS = 16;
/** Comet period along a stream (one dash = head + fading tail). */
export const FLOW_DASH_MM = 8;
/** Distance a jet arrow travels downstream of its valve plane over one valve window (A: 0 → 1). */
export const JET_SLIDE_MM = 15;
const TUBULAR_SEGMENTS = 96;
const RADIAL_SEGMENTS = 8;
const GHOST_OPACITY = 0.8;
/** Alpha factor of the streams left out of the walkthrough's current step. */
export const FLOW_DIM = 0.12;
/** Fallback colours (light theme) until setColors is called: O2-rich red, O2-poor violet-blue. */
const DEFAULT_RICH = '#d23a2f';
const DEFAULT_POOR = '#5960b0';
/** Heart side per valve (VALVES order): left = O2-rich, right = O2-poor. */
const VALVE_SIDE: Readonly<Record<ValveId, 'L' | 'R'>> = { MITRAL: 'L', TRICUSPID: 'R', AORTIC: 'L', PULMONARY: 'R' };

/** Dashes along a path (N_p) and whole dashes advanced per valve window (m_p ≈ N_p / 2), both ≥ 1. */
export function flowDashes(lengthMm: number): { readonly n: number; readonly m: number } {
  const n = Number.isFinite(lengthMm) ? Math.max(1, Math.round(lengthMm / FLOW_DASH_MM)) : 1;
  return { n, m: Math.max(1, Math.round(n / 2)) };
}

/** Comet shifts (dashes per frame) over which the motion blur widens from the swept stretch to a whole dash. */
export const COMET_BLUR_RAMP = [0.3, 0.5] as const;

/**
 * Box-filter width (dashes, 0..1) for a comet that moved `shiftDashes` since the previous frame. Slow motion: exactly
 * the stretch swept (true motion blur; 0 while paused, so the comets stay sharp). Above COMET_BLUR_RAMP[0] it widens,
 * reaching a whole dash (the pattern evens out to its mean) at half a dash per frame: from there on a sampled sawtooth
 * aliases like a wagon wheel, and a box exactly as wide as the shift would still leave a backward-moving residual.
 */
export function cometBlur(shiftDashes: number): number {
  const s = Math.abs(shiftDashes);
  if (!(s > 0)) return 0;
  const r0 = COMET_BLUR_RAMP[0], r1 = COMET_BLUR_RAMP[1];
  if (s >= r1) return 1;
  const x = s <= r0 ? 0 : (s - r0) / (r1 - r0);
  return s + (1 - s) * x * x * (3 - 2 * x);
}

/**
 * Comet phase φ = fract(m · A) in [0, 1), float64. With an integer m the pattern at A = 1 equals the one at A = 0, so
 * the jump of A at a window boundary (1 → 0) is invisible; non-finite input gives 0.
 */
export function flowPhase(m: number, a: number): number {
  const x = m * a;
  const f = x - Math.floor(x);
  return f >= 0 && f < 1 ? f : 0;
}

export const FLOW_VERTEX = /* glsl */ `
attribute float aPath;
uniform float uPhase[${MAX_FLOW_PATHS}];
uniform float uFlow[${MAX_FLOW_PATHS}];
uniform float uDash[${MAX_FLOW_PATHS}];
uniform float uBlur[${MAX_FLOW_PATHS}];
uniform vec3 uColor[${MAX_FLOW_PATHS}];
uniform float uFocus[${MAX_FLOW_PATHS}];
varying vec4 vComet;
varying vec3 vColor;
varying float vFocus;
varying vec3 vNormalV;
varying vec3 vRestPos;
${GLSL_BEATS}
${GLSL_GRID}
${GLSL_DISPLACEMENT}
void main() {
  // per-path values are constant over every triangle (one path per tube), so plain varyings carry them exactly
  int i = int(aPath + 0.5);
  // (dash coordinate - phase, intensity q, arc-length position along the path, motion-blur width in dashes)
  vComet = vec4(uv.x * uDash[i] - uPhase[i], uFlow[i], uv.x, uBlur[i]);
  vColor = uColor[i];
  vFocus = uFocus[i];
  vRestPos = position;
  vec3 p = position + heartDisplacementAt(position);
  vNormalV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const FLOW_FRAGMENT = /* glsl */ `
uniform float uOpacity;
uniform float uTrack;
varying vec4 vComet;
varying vec3 vColor;
varying float vFocus;
varying vec3 vNormalV;
varying vec3 vRestPos;
${GLSL_CLIP}
// antiderivatives of the sawtooth fract(s) and of fract(s)^4, for the box filter below
float sawInt(float x) {
  float f = fract(x);
  return 0.5 * (floor(x) + f * f);
}
float sawInt4(float x) {
  float f = fract(x);
  float f2 = f * f;
  return 0.2 * (floor(x) + f2 * f2 * f);
}
void main() {
  HV_CLIP_DISCARD(vRestPos)
  // sawtooth comet: c rises from the tail (0) to the head (1) at the downstream end of each dash; as the phase grows
  // the pattern moves toward +uv.x (the flow direction). q = 0: frozen (phase held) and dimmed.
  float c = fract(vComet.x);
  float c4 = c * c * c * c;
  // motion blur: x = dash coordinate - phase falls as the phase grows, so this fragment swept [x, x + w] since the
  // previous frame; average the comet over it (the tail lengthens behind the head; w = 1 evens it out to its mean)
  float w = vComet.w;
  if (w > 1e-3) {
    c = (sawInt(vComet.x + w) - sawInt(vComet.x)) / w;
    c4 = (sawInt4(vComet.x + w) - sawInt4(vComet.x)) / w;
  }
  float q = vComet.y;
  float facing = abs(normalize(vNormalV).z);
  // head: most opaque and slightly brighter (scaled, not mixed toward white, so it stays saturated on the light theme)
  vec3 col = vColor * (0.55 + 0.45 * facing) * (0.8 + 0.2 * q) * (1.0 + 0.35 * q * c4);
  float ends = smoothstep(0.0, 0.03, vComet.z) * (1.0 - smoothstep(0.97, 1.0, vComet.z));
  float a = clamp(0.4 + c * (0.25 + 0.6 * q), 0.0, 1.0);
  // arrows look: the tube is only a faint, steady route track under the chevrons (flowChevrons.ts)
  if (uTrack > 0.5) {
    col = vColor * (0.55 + 0.45 * facing);
    a = 0.3;
  }
  gl_FragColor = vec4(col, a * ends * vFocus * uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const JET_VERTEX = /* glsl */ `
uniform float uJetAmp[4];
uniform float uJetSlide[4];
uniform vec3 uColor[${MAX_FLOW_PATHS}];
varying vec3 vColor;
varying float vAlpha;
varying vec3 vRestPos;
${GLSL_BEATS}
${GLSL_GRID}
${GLSL_DISPLACEMENT}
void main() {
  // instance i = valve i in VALVES order (= stream slot i); amp = openness * q scales the arrow about its tail on the valve plane
  float amp = uJetAmp[gl_InstanceID];
  vec3 centre = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 axis = instanceMatrix[0].xyz;
  vec3 dir = axis * inversesqrt(max(dot(axis, axis), 1e-12)); // zero matrix (valve missing): stays degenerate
  vec3 restPos = (instanceMatrix * vec4(position * amp, 1.0)).xyz + dir * uJetSlide[gl_InstanceID];
  vRestPos = restPos;
  vColor = uColor[gl_InstanceID];
  vAlpha = amp;
  // the arrow rides rigidly on the tissue at the valve centre (same displacement field as the leaflets)
  vec3 p = restPos + heartDisplacementAt(centre);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const JET_FRAGMENT = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor;
varying float vAlpha;
varying vec3 vRestPos;
${GLSL_CLIP}
void main() {
  HV_CLIP_DISCARD(vRestPos)
  gl_FragColor = vec4(vColor, clamp(vAlpha, 0.0, 1.0) * 0.9 * uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** Stream slots: the heart stream of VALVES[i] at slot i, vessel streams from slot 4 (at most MAX_FLOW_PATHS). */
export function flowSlots(paths: readonly FlowPath[]): { readonly slot: number; readonly path: FlowPath }[] {
  const out: { slot: number; path: FlowPath }[] = [];
  for (const path of paths) {
    if (isVesselPath(path)) continue;
    const slot = VALVES.indexOf(path.valve);
    if (slot >= 0 && !out.some((o) => o.slot === slot)) out.push({ slot, path });
  }
  let next = VALVES.length;
  for (const path of paths) if (isVesselPath(path) && next < MAX_FLOW_PATHS) out.push({ slot: next++, path });
  return out;
}

/** Merges one TubeGeometry per path into a single indexed geometry with a per-vertex path slot (flowSlots). */
function buildStreamGeometry(slots: readonly { readonly slot: number; readonly path: FlowPath }[], dashOut: Float32Array): BufferGeometry {
  const tubes: { g: TubeGeometry; slot: number }[] = [];
  for (const { slot, path } of slots) {
    const pts: Vector3[] = [];
    for (const p of path.pts) {
      const v = new Vector3(p[0], p[1], p[2]);
      if (!pts.length || v.distanceToSquared(pts[pts.length - 1]) > 1e-8) pts.push(v);
    }
    if (pts.length < 2) continue;
    const curve = new CatmullRomCurve3(pts, false, 'centripetal');
    dashOut[slot] = flowDashes(path.lengthMm > 0 ? path.lengthMm : curve.getLength()).n;
    // TubeGeometry samples getPointAt(i / segments): uv.x is the arc-length fraction along the path
    tubes.push({ g: new TubeGeometry(curve, TUBULAR_SEGMENTS, FLOW_TUBE_RADIUS_MM, RADIAL_SEGMENTS, false), slot });
  }
  let nv = 0, ni = 0;
  for (const t of tubes) {
    nv += t.g.getAttribute('position').count;
    ni += t.g.getIndex()?.count ?? 0;
  }
  const pos = new Float32Array(3 * nv), nor = new Float32Array(3 * nv), uv = new Float32Array(2 * nv), slot = new Float32Array(nv);
  const index = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let ov = 0, oi = 0;
  for (const t of tubes) {
    const p = t.g.getAttribute('position'), nm = t.g.getAttribute('normal'), u = t.g.getAttribute('uv'), idx = t.g.getIndex();
    pos.set(p.array as ArrayLike<number>, 3 * ov);
    nor.set(nm.array as ArrayLike<number>, 3 * ov);
    uv.set(u.array as ArrayLike<number>, 2 * ov);
    slot.fill(t.slot, ov, ov + p.count);
    if (idx) for (let k = 0; k < idx.count; k++) index[oi + k] = idx.getX(k) + ov;
    ov += p.count;
    oi += idx?.count ?? 0;
    t.g.dispose();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('normal', new BufferAttribute(nor, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setAttribute('aPath', new BufferAttribute(slot, 1));
  g.setIndex(new BufferAttribute(index, 1));
  return g;
}

/**
 * Two crossed arrow plates through the +X axis (one in XY, one in XZ) so the jet reads from any view; tail at the
 * origin, tip at x = 1 (scaling about the tail keeps it on the valve plane).
 */
function jetGeometry(): BufferGeometry {
  const s1 = 0.55, hw = 0.12, hh = 0.3;
  const p: number[] = [];
  for (const plate of [0, 1]) {
    const q = (x: number, w: number) => (plate === 0 ? p.push(x, w, 0) : p.push(x, 0, w));
    q(0, -hw); q(s1, -hw); q(s1, hw); q(0, hw); q(s1, -hh); q(1, 0); q(s1, hh);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(p), 3));
  const idx: number[] = [];
  for (const o of [0, 7]) idx.push(o, o + 1, o + 2, o, o + 2, o + 3, o + 4, o + 5, o + 6);
  g.setIndex(idx);
  return g;
}

export interface BloodFlow {
  readonly group: Group;
  /**
   * Per-frame update (allocation-free, uniform floats only); call it once per rendered frame, since the motion blur
   * is the comet travel since the previous call. `state`: FLOW_STATE_LEN floats from flowTiming.flowAt — A[4] at
   * FLOW_A, q[4] at FLOW_Q, VALVES order. `open`: valve leaflet openness 0..1 per valve, VALVES order. `venous`:
   * VENOUS_STATE_LEN floats from venousTiming.venousAt (A, q per side L, R); without it the veins stay still.
   */
  update(state: ArrayLike<number>, open: ArrayLike<number>, venous?: ArrayLike<number>): void;
  setStyle(style: FlowStyle): void;
  /** Walkthrough emphasis: only these streams (and their jets) stay bright; null = all. */
  setFocus(keys: ReadonlySet<FlowStreamKey> | null): void;
  /** Stream slots in use and cell instances built so far (diagnostics, tests). */
  readonly slots: number;
  readonly cells: number;
  setClip(on: boolean): void;
  /** CSS colours for O2-rich (left heart) and O2-poor (right heart) blood. */
  setColors(rich: string, poor: string): void;
  dispose(): void;
}

const clamp01 = (x: number): number => (x > 0 ? (x < 1 ? x : 1) : 0);

export function createBloodFlow(geo: GeometryBundle, paths: readonly FlowPath[], U: SharedUniforms): BloodFlow {
  const group = new Group();
  group.name = 'bloodFlow';
  const P = MAX_FLOW_PATHS;
  const slots = flowSlots(paths);
  // heart side per slot (colour); timing source per slot: valve index (heart streams, arterial outflow) or venous side
  const sideOf: ('L' | 'R')[] = Array.from({ length: P }, (_, i) => (i < VALVES.length ? VALVE_SIDE[VALVES[i]] : 'L'));
  const valveOf = new Int8Array(P).fill(-1), venOf = new Int8Array(P).fill(-1);
  for (let i = 0; i < VALVES.length; i++) valveOf[i] = i;
  for (const { slot, path } of slots) {
    sideOf[slot] = path.side;
    if (slot < VALVES.length) continue;
    if (path.leg === 'out') valveOf[slot] = VALVES.indexOf(path.valve);
    else venOf[slot] = path.side === 'L' ? 0 : 1;
  }
  // walkthrough key of every slot (heart stream, its arterial continuation, or a venous side)
  const keyOf: (FlowStreamKey | null)[] = Array.from({ length: P }, (_, i) => (i < VALVES.length ? (`heart:${VALVES[i]}` as const) : null));
  for (const { slot, path } of slots) if (slot >= VALVES.length) keyOf[slot] = path.leg === 'out' ? `out:${path.valve}` : path.side === 'L' ? 'ven:L' : 'ven:R';
  const local = {
    uPhase: { value: new Float32Array(P) },
    uFlow: { value: new Float32Array(P) },
    uDash: { value: new Float32Array(P).fill(1) },
    uBlur: { value: new Float32Array(P) },
    uColor: { value: sideOf.map((s) => new Color(s === 'L' ? DEFAULT_RICH : DEFAULT_POOR)) },
    uFocus: { value: new Float32Array(P).fill(1) },
    uTrack: { value: 1 },
    uJetAmp: { value: new Float32Array(4) },
    uJetSlide: { value: new Float32Array(4) },
  } satisfies Record<string, IUniform>;
  const dashesPerWindow = new Float32Array(P).fill(1);
  // A at the previous update, per slot: the comet travel since then sets the motion blur
  const prevA = new Float32Array(P);
  const materials: ShaderMaterial[] = [];
  let clipOn = false;

  const make = (vertexShader: string, fragmentShader: string, ghost: boolean, side: Side): ShaderMaterial => {
    const m = new ShaderMaterial({
      uniforms: { ...U, ...local, uOpacity: { value: ghost ? GHOST_OPACITY : 1 } },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      side,
    });
    if (ghost) m.depthFunc = GreaterDepth; // only where the wall hides it: an X-ray view of the cavity flow
    materials.push(m);
    return m;
  };

  // streams: one merged geometry, front faces only so the far half of a tube does not double-blend
  const streams = buildStreamGeometry(slots, local.uDash.value);
  const dashCount = local.uDash.value;
  // whole dashes per window: half the stream (m = round(N / 2)); an outflow continuation as many as its heart stream
  // (same speed in mm per window, so the comets run on through the valve stub into the artery)
  for (const { slot } of slots) dashesPerWindow[slot] = flowDashes(dashCount[slot] * FLOW_DASH_MM).m;
  for (const { slot, path } of slots) if (slot >= VALVES.length && path.leg === 'out') dashesPerWindow[slot] = dashesPerWindow[valveOf[slot]];
  const streamMeshes: Mesh[] = [];
  if (streams.getAttribute('position').count > 0) {
    for (const ghost of [false, true]) {
      const mesh = new Mesh(streams, make(FLOW_VERTEX, FLOW_FRAGMENT, ghost, FrontSide));
      mesh.frustumCulled = false; // displaced on the GPU
      mesh.renderOrder = ghost ? 5 : 3;
      mesh.name = ghost ? 'bloodFlow-streams-ghost' : 'bloodFlow-streams';
      group.add(mesh);
      streamMeshes.push(mesh);
    }
  }
  // blood cells: the same per-slot uniforms; built on the first setStyle('cells')
  let cells: FlowCells | null = null;
  const cellsOf = (): FlowCells => {
    if (!cells) {
      cells = createFlowCells(slots.map((s) => ({ ...s, n: dashCount[s.slot] })), P, U, local, GHOST_OPACITY);
      for (const m of cells.materials) {
        setClipDefine(m, clipOn);
        materials.push(m);
      }
      group.add(...cells.meshes);
    }
    return cells;
  };
  // chevron arrows: the same per-slot uniforms; built on the first setStyle('arrows')
  let chevrons: FlowChevrons | null = null;
  const chevronsOf = (): FlowChevrons => {
    if (!chevrons) {
      chevrons = createFlowChevrons(slots.map((s) => ({ ...s, n: dashCount[s.slot] })), P, U, local, GHOST_OPACITY);
      for (const m of chevrons.materials) {
        setClipDefine(m, clipOn);
        materials.push(m);
      }
      group.add(...chevrons.meshes);
    }
    return chevrons;
  };

  // jets: instance i = VALVES[i] (gl_InstanceID indexes the uniforms); a missing valve keeps a zero matrix
  const jetGeom = jetGeometry();
  const jets: InstancedMesh[] = [];
  const m4 = new Matrix4(), x = new Vector3(), y = new Vector3(), z = new Vector3(), zero = new Matrix4().makeScale(0, 0, 0);
  for (const ghost of [false, true]) {
    const mesh = new InstancedMesh(jetGeom, make(JET_VERTEX, JET_FRAGMENT, ghost, DoubleSide), VALVES.length);
    for (let i = 0; i < VALVES.length; i++) {
      const v = geo.valves.find((g) => g.id === VALVES[i]);
      if (!v) {
        mesh.setMatrixAt(i, zero);
        continue;
      }
      const len = Math.min(18, Math.max(9, v.radiusMm));
      x.fromArray(v.normal).normalize();
      // first plate faces local +z (anterior, the default camera) where possible
      y.set(0, 0, 1).cross(x);
      if (y.lengthSq() < 1e-6) y.set(1, 0, 0).cross(x);
      y.normalize();
      z.crossVectors(x, y);
      m4.makeBasis(x.multiplyScalar(len), y.multiplyScalar(len), z.multiplyScalar(len));
      m4.setPosition(v.centerMm[0], v.centerMm[1], v.centerMm[2]);
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.renderOrder = ghost ? 5 : 3;
    mesh.name = ghost ? 'bloodFlow-jets-ghost' : 'bloodFlow-jets';
    group.add(mesh);
    jets.push(mesh);
  }

  const used = slots.reduce<number>((n, s) => Math.max(n, s.slot + 1), VALVES.length);
  return {
    group,
    slots: slots.length,
    get cells() {
      return cells?.count ?? 0;
    },
    update(state, open, venous) {
      for (let i = 0; i < used; i++) {
        const v = valveOf[i], w = venOf[i];
        const a = clamp01(v >= 0 ? state[FLOW_A + v] : w >= 0 && venous ? venous[VEN_A + w] : 0);
        const q = clamp01(v >= 0 ? state[FLOW_Q + v] : w >= 0 && venous ? venous[VEN_Q + w] : 0);
        local.uPhase.value[i] = flowPhase(dashesPerWindow[i], a);
        // travel since the last frame; A's drop 1 → 0 at a window edge continues the motion (m is an integer). A scrub,
        // a scenario switch or showing the layer again blurs one frame at most (the width saturates at one dash).
        let da = a - prevA[i];
        if (da < -0.5) da += 1;
        prevA[i] = a;
        local.uBlur.value[i] = cometBlur(dashesPerWindow[i] * da);
        local.uFlow.value[i] = q;
      }
      for (let i = 0; i < 4; i++) {
        const a = clamp01(state[FLOW_A + i]), q = clamp01(state[FLOW_Q + i]);
        local.uJetAmp.value[i] = clamp01(open[i]) * q * local.uFocus.value[i];
        // A held at a window end while q = 0 hides the arrow, so the reset to the plane at the next window is unseen
        local.uJetSlide.value[i] = a * JET_SLIDE_MM;
      }
    },
    setStyle(style) {
      for (const m of streamMeshes) m.visible = style !== 'cells';
      local.uTrack.value = style === 'arrows' ? 1 : 0;
      if (style === 'arrows') chevronsOf().setVisible(true);
      else chevrons?.setVisible(false);
      if (style === 'cells') cellsOf().setVisible(true);
      else cells?.setVisible(false);
    },
    setFocus(keys) {
      for (let i = 0; i < P; i++) local.uFocus.value[i] = !keys || (keyOf[i] !== null && keys.has(keyOf[i] as FlowStreamKey)) ? 1 : FLOW_DIM;
    },
    setClip(on) {
      clipOn = on;
      for (const m of materials) setClipDefine(m, on);
    },
    setColors(rich, poor) {
      for (let i = 0; i < P; i++) local.uColor.value[i].setStyle(sideOf[i] === 'L' ? rich : poor);
    },
    dispose() {
      streams.dispose();
      jetGeom.dispose();
      materials.forEach((m) => m.dispose());
      jets.forEach((j) => j.dispose());
      (cells as FlowCells | null)?.dispose();
      (chevrons as FlowChevrons | null)?.dispose();
    },
  };
}
