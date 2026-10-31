/**
 * Chevron arrows of the schematic blood-flow layer (血流示意), the default look: one bold "›" per dash riding every
 * stream (bloodFlow.ts), drawn camera-facing and turned along the stream's on-screen direction, with a dark outline so
 * it reads on any wall colour. The direction is legible in a single still frame, unlike the comet sawtooth. Positions
 * come from the static path texture (flowParticles.pathTextureData) and the per-path phase uniforms, so the arrows are
 * a pure function of sim time (scrubbing is exact); one chevron per dash at a fixed offset in it, so the whole-dash phase
 * jump at a window edge maps the set onto itself (seamless, as for the comets and cells).
 */
import {
  BufferAttribute, DataTexture, FloatType, GreaterDepth, InstancedBufferAttribute, InstancedBufferGeometry, Mesh,
  NearestFilter, RGBAFormat, ShaderMaterial,
} from 'three';
import type { IUniform } from 'three';
import type { FlowPath } from './core/flowTypes';
import { PATH_TEX_SAMPLES, pathTextureData } from './flowParticles';
import { GLSL_BEATS, GLSL_CLIP, GLSL_DISPLACEMENT, GLSL_GRID } from './shaders/chunks';
import type { SharedUniforms } from './shaders/uniforms';

/** Half-size of a chevron (mm); one dash is 8 mm, so neighbouring arrows never touch. */
export const CHEVRON_HALF_MM = 4.2;

/** Per instance: (slot, base dash coordinate) — one chevron at the middle of every dash of every path. */
export function chevronLayout(paths: readonly { readonly slot: number; readonly n: number }[]): Float32Array {
  const out: number[] = [];
  for (const p of paths) for (let j = 0; j < Math.max(1, Math.round(p.n)); j++) out.push(p.slot, j + 0.5);
  return new Float32Array(out);
}

export const CHEVRON_VERTEX = (slots: number) => /* glsl */ `
#define HV_PATH_SAMPLES ${PATH_TEX_SAMPLES}
attribute vec2 aPart;
uniform highp sampler2D uPathTex;
uniform float uPhase[${slots}];
uniform float uDash[${slots}];
uniform float uBlur[${slots}];
uniform float uFlow[${slots}];
uniform float uFocus[${slots}];
uniform vec3 uColor[${slots}];
uniform float uChevMm;
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
varying vec3 vRestPos;
${GLSL_BEATS}
${GLSL_GRID}
${GLSL_DISPLACEMENT}
vec3 hvPathPos(int row, float u) {
  float x = clamp(u, 0.0, 1.0) * float(HV_PATH_SAMPLES - 1);
  int i0 = int(floor(x));
  int i1 = min(i0 + 1, HV_PATH_SAMPLES - 1);
  return mix(texelFetch(uPathTex, ivec2(i0, row), 0), texelFetch(uPathTex, ivec2(i1, row), 0), x - float(i0)).xyz;
}
void main() {
  int slot = int(aPart.x + 0.5);
  float n = uDash[slot];
  float u = mod(aPart.y + uPhase[slot], n) / n;
  float h = 1.5 / float(HV_PATH_SAMPLES - 1);
  vec3 c = hvPathPos(2 * slot, u);
  vec3 a = hvPathPos(2 * slot, u - h);
  vec3 b = hvPathPos(2 * slot, u + h);
  vec4 cv = modelViewMatrix * vec4(c + heartDisplacementAt(c), 1.0);
  vec3 dv = (modelViewMatrix * vec4(b + heartDisplacementAt(b), 1.0)).xyz - (modelViewMatrix * vec4(a + heartDisplacementAt(a), 1.0)).xyz;
  // on-screen direction; a stream running toward or away from the viewer fades instead of spinning
  float l2 = length(dv.xy);
  float facing = l2 / max(length(dv), 1e-6);
  vec2 D = l2 > 1e-6 ? dv.xy / l2 : vec2(0.0, 1.0);
  vec2 S = vec2(D.y, -D.x);
  float size = uChevMm * length(modelViewMatrix[0].xyz);
  vec3 p = cv.xyz + vec3((D * position.y + S * position.x) * size, 0.0);
  vUv = position.xy;
  vRestPos = c;
  float q = uFlow[slot];
  // fast surges (more than about half a dash per frame) would alias like a wagon wheel: soften the arrows there
  float steady = 1.0 - smoothstep(0.35, 0.8, uBlur[slot]);
  float ends = smoothstep(0.0, 0.05, u) * (1.0 - smoothstep(0.95, 1.0, u));
  vAlpha = uFocus[slot] * mix(0.45, 1.0, q) * mix(0.4, 1.0, steady) * ends * smoothstep(0.15, 0.45, facing);
  vColor = uColor[slot] * (0.85 + 0.3 * q);
  gl_Position = projectionMatrix * vec4(p, 1.0);
}
`;

export const CHEVRON_FRAGMENT = /* glsl */ `
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
varying vec3 vRestPos;
${GLSL_CLIP}
float hvSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}
void main() {
  HV_CLIP_DISCARD(vRestPos)
  // a "^" pointing along +y (downstream): coloured stroke inside a dark outline, readable on any wall colour
  float d = min(hvSeg(vUv, vec2(-0.72, -0.32), vec2(0.0, 0.38)), hvSeg(vUv, vec2(0.72, -0.32), vec2(0.0, 0.38)));
  float rim = 1.0 - smoothstep(0.27, 0.33, d);
  if (rim <= 0.0 || vAlpha <= 0.0) discard;
  float body = 1.0 - smoothstep(0.15, 0.21, d);
  vec3 col = mix(vColor * 0.25, vColor, body);
  gl_FragColor = vec4(col, rim * mix(0.75, 1.0, body) * vAlpha * uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export interface FlowChevrons {
  readonly meshes: readonly Mesh[];
  readonly count: number;
  readonly materials: readonly ShaderMaterial[];
  setVisible(on: boolean): void;
  dispose(): void;
}

/**
 * Chevron meshes (core + ghost). `local` carries the per-path uniforms shared with the streams (uPhase, uDash, uBlur,
 * uFlow, uFocus, uColor; sized `slots`), so one bloodFlow.update drives every look.
 */
export function createFlowChevrons(
  paths: readonly { readonly slot: number; readonly path: FlowPath; readonly n: number }[], slots: number, U: SharedUniforms,
  local: Record<string, IUniform>, ghostOpacity: number,
): FlowChevrons {
  const S = PATH_TEX_SAMPLES;
  const tex = new DataTexture(pathTextureData(paths, slots), S, 2 * slots, RGBAFormat, FloatType);
  tex.minFilter = tex.magFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  const part = chevronLayout(paths);
  const count = part.length / 2;
  const geom = new InstancedBufferGeometry();
  geom.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  geom.setIndex([0, 1, 2, 0, 2, 3]);
  geom.setAttribute('aPart', new InstancedBufferAttribute(part, 2));
  geom.instanceCount = count;
  const vertexShader = CHEVRON_VERTEX(slots);
  const materials: ShaderMaterial[] = [];
  const meshes: Mesh[] = [];
  for (const ghost of [false, true]) {
    const m = new ShaderMaterial({
      uniforms: { ...U, ...local, uPathTex: { value: tex }, uChevMm: { value: CHEVRON_HALF_MM }, uOpacity: { value: ghost ? ghostOpacity : 1 } },
      vertexShader,
      fragmentShader: CHEVRON_FRAGMENT,
      transparent: true,
      depthWrite: false,
    });
    if (ghost) m.depthFunc = GreaterDepth;
    materials.push(m);
    const mesh = new Mesh(geom, m);
    mesh.frustumCulled = false; // positioned on the GPU
    mesh.renderOrder = ghost ? 6 : 4; // over the stream tracks
    mesh.name = ghost ? 'bloodFlow-chevrons-ghost' : 'bloodFlow-chevrons';
    mesh.visible = false;
    meshes.push(mesh);
  }
  return {
    meshes,
    materials,
    count,
    setVisible(on) {
      for (const m of meshes) m.visible = on && count > 0;
    },
    dispose() {
      geom.dispose();
      tex.dispose();
      materials.forEach((m) => m.dispose());
    },
  };
}
