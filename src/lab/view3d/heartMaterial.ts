/**
 * Heart mesh: MeshStandardMaterial + onBeforeCompile. Colour = electrical state from the per-vertex activation
 * attributes and the beat uniforms (same fields as the ECG source); position = rest position + the shared
 * displacement field; rest-space clipping for the cross-section.
 */
import { BufferAttribute, BufferGeometry, FrontSide, MeshStandardMaterial } from 'three';
import type { IUniform, WebGLProgramParametersWithUniforms } from 'three';
import { ATTR } from './gpuContract';
import type { HeartAttributes } from './core/attributes';
import type { RenderMesh } from '../sim/types';
import { GLSL_BEATS, GLSL_CLIP, GLSL_DISPLACEMENT, GLSL_ELECTRICAL, GLSL_GRID, GLSL_HIGHLIGHT, insertAfter, replaceOnce } from './shaders/chunks';
import type { SharedUniforms } from './shaders/uniforms';

export const HEART_PROGRAM_KEY = 'hv-heart-v1';

type ShaderLike = Pick<WebGLProgramParametersWithUniforms, 'vertexShader' | 'fragmentShader' | 'uniforms'>;

// No `flat` varyings: ANGLE's D3D11 backend has to emulate GL's provoking-vertex flat shading, which measured
// noticeably more expensive on an Intel iGPU. Categorical inputs are turned into smooth quantities per vertex
// (compartment weights, static anatomical colour, highlight weight) instead.
const VERT_DECL = /* glsl */ `
attribute float ${ATTR.tAct0};
attribute float ${ATTR.tAct1};
attribute float ${ATTR.apdRef};
attribute float ${ATTR.wallDepth};
attribute float ${ATTR.tissue};
attribute float ${ATTR.region};
attribute float ${ATTR.aha};
varying vec3 vRestPos;
varying vec2 vTAct;
varying float vApd;
varying float vWall;
varying vec2 vCompW;
varying vec3 vStatic;
varying float vHl;
${GLSL_BEATS}
${GLSL_GRID}
${GLSL_DISPLACEMENT}
${GLSL_ELECTRICAL}
${GLSL_HIGHLIGHT}
`;

const VERT_MAIN = /* glsl */ `
// GPU contract: restPos = position (rest pose, local mm). Raycasting therefore uses the rest pose.
vec3 restPos = position;
vRestPos = restPos;
vTAct = vec2(${ATTR.tAct0}, ${ATTR.tAct1});
vApd = ${ATTR.apdRef};
vWall = ${ATTR.wallDepth};
float hvC = hvCompOfTissue(${ATTR.tissue});
vCompW = vec2(hvC > 0.5 && hvC < 1.5 ? 1.0 : 0.0, hvC > 1.5 ? 1.0 : 0.0);
vStatic = hvStaticColor(${ATTR.tissue});
vHl = hvHighlight(${ATTR.region});
transformed += heartDisplacementAt(restPos);
`;

const FRAG_DECL = /* glsl */ `
varying vec3 vRestPos;
varying vec2 vTAct;
varying float vApd;
varying float vWall;
varying vec2 vCompW;
varying vec3 vStatic;
varying float vHl;
uniform float uXray;
${GLSL_BEATS}
${GLSL_ELECTRICAL}
${GLSL_CLIP}
${GLSL_HIGHLIGHT}
`;

const FRAG_COLOR = /* glsl */ `
// dominant compartment → electrical state; blended toward the static colour (ring, vessels) across boundaries
float hvW = max(vCompW.x, vCompW.y);
float hvComp = vCompW.y >= vCompW.x ? 2.0 : 1.0;
vec4 hvE = hvComp > 1.5 ? hvVentricularColor(vRestPos, vTAct, vApd) : hvAtrialColor(vRestPos, vTAct, vApd);
vec4 hvState = mix(vec4(vStatic, 0.0), hvE, smoothstep(0.25, 0.75, hvW));
// endocardial surfaces slightly darker so the inside of a cut reads as cavity wall
diffuseColor.rgb = hvState.rgb * mix(0.86, 1.0, clamp(vWall, 0.0, 1.0));
float hvHl = clamp(vHl, 0.0, 1.0) * uHighlightMix;
diffuseColor.rgb = mix(diffuseColor.rgb, uColHighlight, hvHl * 0.45);
vec3 hvEmissive = uColFront * (hvState.a * 0.5) + uColHighlight * (hvHl * 0.3);
// X-ray view (blood-flow layer): the electrical colours step back toward a light grey so the blood colours lead
float hvLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.25 + 0.6 * hvLum), 0.55 * uXray);
hvEmissive *= 1.0 - 0.6 * uXray;
`;

/**
 * X-ray alpha: nearly clear where the wall faces the viewer, more opaque toward the silhouette (Fresnel-like), so the
 * heart reads as an outline with the cavity flow visible inside. uXray = 0 leaves the opaque material unchanged.
 */
const FRAG_XRAY = /* glsl */ `
float hvRim = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
gl_FragColor.a *= mix(1.0, 0.08 + 0.62 * hvRim * hvRim, uXray);
`;

/** Pure string patch (unit-tested): injects attributes, varyings, shared chunks, displacement, clip and colour. */
export function patchHeartShader(shader: ShaderLike, uniforms: Record<string, IUniform>): void {
  let vs = insertAfter(shader.vertexShader, '#include <common>', VERT_DECL);
  vs = insertAfter(vs, '#include <begin_vertex>', VERT_MAIN);
  let fs = insertAfter(shader.fragmentShader, '#include <common>', FRAG_DECL);
  fs = replaceOnce(fs, '#include <clipping_planes_fragment>', 'HV_CLIP_DISCARD(vRestPos)\n#include <clipping_planes_fragment>');
  fs = insertAfter(fs, '#include <color_fragment>', FRAG_COLOR);
  fs = insertAfter(fs, '#include <emissivemap_fragment>', 'totalEmissiveRadiance += hvEmissive;');
  fs = insertAfter(fs, '#include <opaque_fragment>', FRAG_XRAY);
  shader.vertexShader = vs;
  shader.fragmentShader = fs;
  Object.assign(shader.uniforms, uniforms);
}

export interface HeartMaterial extends MeshStandardMaterial {
  /** 0 = opaque myocardium, 1 = X-ray (see-through wall, outline kept); set with setHeartXray. */
  readonly xray: IUniform<number>;
}

export function createHeartMaterial(uniforms: SharedUniforms): HeartMaterial {
  const xray: IUniform<number> = { value: 0 };
  const m = Object.assign(new MeshStandardMaterial({ color: 0xffffff, roughness: 0.58, metalness: 0, side: FrontSide }), { xray });
  m.onBeforeCompile = (shader) => patchHeartShader(shader, { ...uniforms, uXray: xray });
  m.customProgramCacheKey = () => HEART_PROGRAM_KEY;
  return m;
}

/**
 * X-ray on/off. Transparent without depth writes, so everything inside (blood flow, valves, conduction system) draws
 * in full over it; the transparent switch recompiles once per state (three's OPAQUE define), then both stay cached.
 */
export function setHeartXray(m: HeartMaterial, on: boolean): void {
  m.xray.value = on ? 1 : 0;
  if (m.transparent === on) return;
  m.transparent = on;
  m.depthWrite = !on;
  m.needsUpdate = true;
}

/** Static geometry: render mesh + contract attributes (uploaded once; rebuilt only on engine.onChange). */
export function createHeartGeometry(mesh: RenderMesh, attr: HeartAttributes): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(mesh.position, 3));
  g.setAttribute('normal', new BufferAttribute(mesh.normal, 3));
  g.setIndex(new BufferAttribute(mesh.index, 1));
  g.setAttribute(ATTR.tAct0, new BufferAttribute(attr.tAct0, 1));
  g.setAttribute(ATTR.tAct1, new BufferAttribute(attr.tAct1, 1));
  g.setAttribute(ATTR.apdRef, new BufferAttribute(attr.apdRef, 1));
  g.setAttribute(ATTR.wallDepth, new BufferAttribute(attr.wallDepth, 1));
  g.setAttribute(ATTR.tissue, new BufferAttribute(attr.tissue, 1));
  g.setAttribute(ATTR.region, new BufferAttribute(attr.region, 1));
  g.setAttribute(ATTR.aha, new BufferAttribute(attr.aha, 1));
  g.computeBoundingSphere();
  return g;
}
