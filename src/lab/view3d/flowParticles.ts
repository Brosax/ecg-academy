/**
 * "Blood cells" of the schematic blood-flow layer (血流示意): up to MAX_FLOW_CELLS instanced discs riding the same
 * streams as the comets (bloodFlow.ts), as an alternative look. Every position is computed in the vertex shader from a
 * static path texture and the per-path comet phase uniforms, so the cells are a pure function of sim time (scrubbing
 * is exact; nothing accumulates on the CPU). Like the comets they ride the GPU displacement field and honour the
 * rest-space cross-section clip, in two passes (core where visible, faint ghost where the wall hides it).
 *
 * Seamless window wrap: a stream's phase is φ = fract(m · A) dashes; at a window edge φ jumps by whole dashes. The cell
 * layout repeats every dash along a path (CELLS per dash at fixed offsets within the dash), so a whole-dash jump maps
 * the set of cells onto itself. Everything else (lateral offset, size, the slow twist about the axis) is a function of
 * the cell's base pattern and its CURRENT arc position, never of its index along the path, so the jump stays invisible.
 * Motion blur: each cell is drawn as a capsule from its position one blur width (bloodFlow's cometBlur, in dashes)
 * back to its current position; at half a dash per frame or faster the capsules span whole dashes and the pattern
 * evens out instead of aliasing.
 */
import {
  BufferAttribute, DataTexture, FloatType, GreaterDepth, InstancedBufferAttribute, InstancedBufferGeometry, Mesh,
  NearestFilter, RGBAFormat, ShaderMaterial,
} from 'three';
import type { IUniform } from 'three';
import { polylineArc } from '../sim/conduction/gridUtil';
import type { Vec3 } from '../sim/types';
import type { FlowPath } from './core/flowTypes';
import { GLSL_BEATS, GLSL_CLIP, GLSL_DISPLACEMENT, GLSL_GRID } from './shaders/chunks';
import type { SharedUniforms } from './shaders/uniforms';

/** Instance budget of the cell layer. */
export const MAX_FLOW_CELLS = 1500;
/** Samples per path row of the path texture (uniform in arc length). */
export const PATH_TEX_SAMPLES = 128;
/** Disc radius of a cell (mm, schematic: a red cell is 4 µm). */
export const CELL_RADIUS_MM = 0.75;
/** Lateral spread: cells fill this share of the lumen radius, at most CELL_SPREAD_MAX_MM from the axis. */
const CELL_SPREAD = 0.7;
const CELL_SPREAD_MAX_MM = 8;
/** One slow turn about the stream axis per this many mm of travel (breaks the per-dash repetition). */
const TWIST_MM = 90;

/** Deterministic PRNG (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CellPathInput {
  /** Uniform slot of the path (index into the per-path uniform arrays). */
  readonly slot: number;
  /** Dashes along the path (N_p, bloodFlow.flowDashes). */
  readonly n: number;
  /** Mean lumen radius (mm). */
  readonly radiusMm: number;
}

export interface CellLayout {
  readonly count: number;
  /** Per instance: slot, base dash coordinate (dash index + offset in the dash), lateral angle, lateral fraction. */
  readonly part: Float32Array;
  /** Per instance: size factor. */
  readonly size: Float32Array;
  /** Cells per dash, per input path. */
  readonly perDash: readonly number[];
}

/**
 * Cell layout: cells per dash proportional to the mean lumen radius (wider vessels look as full as narrow ones), at
 * least one, scaled so the total stays within `max`. Deterministic (seeded per slot); the same base pattern repeats in
 * every dash of a path.
 */
export function cellLayout(paths: readonly CellPathInput[], max = MAX_FLOW_CELLS): CellLayout {
  const r = paths.map((p) => Math.min(10, Math.max(2, p.radiusMm)));
  const weight = paths.reduce((s, p, i) => s + r[i] * Math.max(1, p.n), 0);
  const k = weight > 0 ? max / weight : 0;
  const perDash = paths.map((_, i) => Math.max(1, Math.floor(k * r[i])));
  const total = () => perDash.reduce((s, c, i) => s + c * Math.max(1, paths[i].n), 0);
  while (total() > max) {
    let big = -1;
    perDash.forEach((c, i) => {
      if (c > 1 && (big < 0 || c * paths[i].n > perDash[big] * paths[big].n)) big = i;
    });
    if (big < 0) break;
    perDash[big]--;
  }
  const count = Math.min(max, total());
  const part = new Float32Array(4 * count), size = new Float32Array(count);
  let o = 0;
  paths.forEach((p, i) => {
    const rand = rng(0x9e3779b1 ^ Math.imul(p.slot + 1, 0x85ebca6b));
    const base = Array.from({ length: perDash[i] }, () => ({ s: rand(), ang: 2 * Math.PI * rand(), frac: Math.sqrt(rand()), size: 0.8 + 0.4 * rand() }));
    for (let j = 0; j < Math.max(1, p.n); j++)
      for (const b of base) {
        if (o >= count) return;
        part.set([p.slot, j + b.s, b.ang, b.frac], 4 * o);
        size[o++] = b.size;
      }
  });
  return { count, part, size, perDash };
}

/**
 * Path texture rows (RGBA float, PATH_TEX_SAMPLES wide): row 2·slot = position (local mm) + lumen radius; row
 * 2·slot + 1 = a parallel-transported unit normal (the lateral frame). Uniform in arc length.
 */
export function pathTextureData(paths: readonly { readonly slot: number; readonly path: FlowPath }[], slots: number): Float32Array {
  const S = PATH_TEX_SAMPLES;
  const data = new Float32Array(4 * S * 2 * slots);
  for (const { slot, path } of paths) {
    const pts = path.pts, rad = path.radiusMm;
    if (pts.length < 2) continue;
    const { cum, length } = polylineArc(pts);
    const P: Vec3[] = [], R: number[] = [];
    let seg = 1;
    for (let s = 0; s < S; s++) {
      const a = (length * s) / (S - 1);
      while (seg < pts.length - 1 && cum[seg] < a) seg++;
      const a0 = cum[seg - 1], a1 = cum[seg], u = a1 > a0 ? Math.min(1, Math.max(0, (a - a0) / (a1 - a0))) : 0;
      const p0 = pts[seg - 1], p1 = pts[seg];
      P.push([p0[0] + u * (p1[0] - p0[0]), p0[1] + u * (p1[1] - p0[1]), p0[2] + u * (p1[2] - p0[2])]);
      R.push((rad[seg - 1] ?? 1) + u * ((rad[seg] ?? 1) - (rad[seg - 1] ?? 1)));
    }
    // parallel transport of a normal along the tangents
    let N: Vec3 | null = null;
    for (let s = 0; s < S; s++) {
      const a = P[Math.max(0, s - 1)], b = P[Math.min(S - 1, s + 1)];
      let T: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const tl = Math.hypot(T[0], T[1], T[2]) || 1;
      T = [T[0] / tl, T[1] / tl, T[2] / tl];
      let n: Vec3 = N ?? (Math.abs(T[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]);
      const d = n[0] * T[0] + n[1] * T[1] + n[2] * T[2];
      n = [n[0] - d * T[0], n[1] - d * T[1], n[2] - d * T[2]];
      const nl = Math.hypot(n[0], n[1], n[2]) || 1;
      N = [n[0] / nl, n[1] / nl, n[2] / nl];
      const r0 = 4 * (2 * slot * S + s), r1 = 4 * ((2 * slot + 1) * S + s);
      data.set([P[s][0], P[s][1], P[s][2], R[s]], r0);
      data.set([N[0], N[1], N[2], 0], r1);
    }
  }
  return data;
}

export const CELL_VERTEX = (slots: number) => /* glsl */ `
#define HV_PATH_SAMPLES ${PATH_TEX_SAMPLES}
attribute vec4 aPart;
attribute float aSize;
uniform highp sampler2D uPathTex;
uniform float uPhase[${slots}];
uniform float uDash[${slots}];
uniform float uBlur[${slots}];
uniform vec3 uColor[${slots}];
uniform float uCellMm;
varying vec3 vRestPos;
varying vec3 vColor;
varying vec2 vCap;
varying float vLen;
varying float vEnds;
${GLSL_BEATS}
${GLSL_GRID}
${GLSL_DISPLACEMENT}
vec4 hvPathAt(int row, float u) {
  float x = clamp(u, 0.0, 1.0) * float(HV_PATH_SAMPLES - 1);
  int i0 = int(floor(x));
  int i1 = min(i0 + 1, HV_PATH_SAMPLES - 1);
  return mix(texelFetch(uPathTex, ivec2(i0, row), 0), texelFetch(uPathTex, ivec2(i1, row), 0), x - float(i0));
}
// rest position of a cell at dash coordinate x (wrapped into the path), its arc fraction in u
vec3 hvCellAt(int slot, float x, out float u) {
  float n = uDash[slot];
  u = mod(x, n) / n;
  vec4 c = hvPathAt(2 * slot, u);
  float h = 1.0 / float(HV_PATH_SAMPLES - 1);
  vec3 t = hvPathAt(2 * slot, u + h).xyz - hvPathAt(2 * slot, u - h).xyz;
  vec3 T = t / max(length(t), 1e-6);
  vec3 N = normalize(hvPathAt(2 * slot + 1, u).xyz);
  vec3 B = cross(T, N);
  // lateral offset: a function of the base pattern and the current arc position only (seamless whole-dash wraps)
  float a = aPart.z + 6.2831853 * u * n * 8.0 / ${TWIST_MM.toFixed(1)};
  float r = min(c.w * ${CELL_SPREAD.toFixed(2)}, ${CELL_SPREAD_MAX_MM.toFixed(1)}) * aPart.w;
  return c.xyz + (cos(a) * N + sin(a) * B) * r;
}
void main() {
  int slot = int(aPart.x + 0.5);
  float x = aPart.y + uPhase[slot];
  float uh, ut;
  vec3 headRest = hvCellAt(slot, x, uh);
  vec3 tailRest = hvCellAt(slot, x - uBlur[slot], ut);
  // a tail that wrapped to the other end of the path collapses onto the head
  if (abs(uh - ut) > 0.5) tailRest = headRest;
  vec4 hv = modelViewMatrix * vec4(headRest + heartDisplacementAt(headRest), 1.0);
  vec4 tv = modelViewMatrix * vec4(tailRest + heartDisplacementAt(tailRest), 1.0);
  float rad = uCellMm * aSize * length(modelViewMatrix[0].xyz);
  vec3 ax = hv.xyz - tv.xyz;
  float len = length(ax);
  vec3 dir = len > 1e-5 ? ax / len : vec3(1.0, 0.0, 0.0);
  vec3 side = cross(dir, normalize(-mix(tv.xyz, hv.xyz, 0.5)));
  side = length(side) > 1e-5 ? normalize(side) : vec3(0.0, 1.0, 0.0);
  // quad corner: position.x across (-1, 1), position.y tail (0) to head (1), each end extended by the radius
  float along = position.y * len + (position.y * 2.0 - 1.0) * rad;
  vec3 p = tv.xyz + dir * along + side * position.x * rad;
  vCap = vec2(position.x, along / rad);
  vLen = len / rad;
  vRestPos = mix(tailRest, headRest, position.y);
  vColor = uColor[slot];
  vEnds = smoothstep(0.0, 0.03, uh) * (1.0 - smoothstep(0.97, 1.0, uh));
  gl_Position = projectionMatrix * vec4(p, 1.0);
}
`;

export const CELL_FRAGMENT = /* glsl */ `
uniform float uOpacity;
varying vec3 vRestPos;
varying vec3 vColor;
varying vec2 vCap;
varying float vLen;
varying float vEnds;
${GLSL_CLIP}
void main() {
  HV_CLIP_DISCARD(vRestPos)
  // distance (in radii) to the tail → head segment: a disc at rest, a capsule while moving
  float s = clamp(vCap.y, 0.0, vLen);
  float d = length(vec2(vCap.x, vCap.y - s));
  if (d > 1.0) discard;
  // biconcave look: a paler centre and a slightly darker rim
  float pallor = 1.0 - smoothstep(0.0, 0.55, d);
  vec3 col = vColor * (0.82 + 0.3 * pallor) * (1.0 - 0.18 * smoothstep(0.75, 1.0, d));
  float a = (1.0 - smoothstep(0.85, 1.0, d)) * vEnds * uOpacity / (1.0 + 0.25 * vLen);
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export interface FlowCells {
  readonly meshes: readonly Mesh[];
  readonly count: number;
  setVisible(on: boolean): void;
  readonly materials: readonly ShaderMaterial[];
  dispose(): void;
}

/**
 * The cell meshes (core + ghost). `local` carries the per-path uniforms shared with the comet streams (uPhase, uDash,
 * uBlur, uColor; sized `slots`), so one bloodFlow.update drives both looks.
 */
export function createFlowCells(
  paths: readonly { readonly slot: number; readonly path: FlowPath; readonly n: number }[], slots: number, U: SharedUniforms,
  local: Record<string, IUniform>, ghostOpacity: number,
): FlowCells {
  const S = PATH_TEX_SAMPLES;
  const tex = new DataTexture(pathTextureData(paths, slots), S, 2 * slots, RGBAFormat, FloatType);
  tex.minFilter = tex.magFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  const layout = cellLayout(paths.map((p) => ({ slot: p.slot, n: p.n, radiusMm: p.path.radiusMm.reduce((s, r) => s + r, 0) / Math.max(1, p.path.radiusMm.length) })));
  const geom = new InstancedBufferGeometry();
  geom.setAttribute('position', new BufferAttribute(new Float32Array([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0]), 3));
  geom.setIndex([0, 1, 2, 0, 2, 3]);
  geom.setAttribute('aPart', new InstancedBufferAttribute(layout.part, 4));
  geom.setAttribute('aSize', new InstancedBufferAttribute(layout.size, 1));
  geom.instanceCount = layout.count;
  const vertexShader = CELL_VERTEX(slots);
  const materials: ShaderMaterial[] = [];
  const meshes: Mesh[] = [];
  for (const ghost of [false, true]) {
    const m = new ShaderMaterial({
      uniforms: { ...U, ...local, uPathTex: { value: tex }, uCellMm: { value: CELL_RADIUS_MM }, uOpacity: { value: ghost ? ghostOpacity : 1 } },
      vertexShader,
      fragmentShader: CELL_FRAGMENT,
      transparent: true,
      depthWrite: false,
    });
    if (ghost) m.depthFunc = GreaterDepth;
    materials.push(m);
    const mesh = new Mesh(geom, m);
    mesh.frustumCulled = false; // positioned on the GPU
    mesh.renderOrder = ghost ? 5 : 3;
    mesh.name = ghost ? 'bloodFlow-cells-ghost' : 'bloodFlow-cells';
    mesh.visible = false;
    meshes.push(mesh);
  }
  return {
    meshes,
    materials,
    count: layout.count,
    setVisible(on) {
      for (const m of meshes) m.visible = on && layout.count > 0;
    },
    dispose() {
      geom.dispose();
      tex.dispose();
      materials.forEach((m) => m.dispose());
    },
  };
}
