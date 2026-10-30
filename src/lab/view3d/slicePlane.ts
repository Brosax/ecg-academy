/**
 * Cross-section: a fixed 128×128 PlaneGeometry placed on the cut by uniforms (moving the plane only changes uniforms),
 * displaced by the same GLSL field as the heart wall and coloured per fragment from the 3D field / label textures with
 * the same electrical-state function. Propagation arrows (in-plane ∇tAct, computed on the CPU when the slice changes)
 * are instanced on the plane and light up while their tissue is being depolarized.
 * With the blood-flow layer on (setFlowOpen), the cavity fill is left out so the cut opens onto the streams behind it.
 */
import {
  BufferAttribute, BufferGeometry, DoubleSide, InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh, PlaneGeometry,
  ShaderMaterial, Vector2, Vector3,
} from 'three';
import type { SliceArrows, SliceRect } from './core/slice';
import { GLSL_BEATS, GLSL_DISPLACEMENT, GLSL_ELECTRICAL, GLSL_GRID } from './shaders/chunks';
import type { SharedUniforms } from './shaders/uniforms';

export const SLICE_SEGMENTS = 128;

export const SLICE_VERTEX = /* glsl */ `
uniform vec3 uPlaneCenter;
uniform vec3 uPlaneU;
uniform vec3 uPlaneV;
uniform vec2 uPlaneHalf;
varying vec3 vRestPos;
${GLSL_BEATS}
${GLSL_GRID}
${GLSL_DISPLACEMENT}
void main() {
  vec3 restPos = uPlaneCenter + uPlaneU * (position.x * 2.0 * uPlaneHalf.x) + uPlaneV * (position.y * 2.0 * uPlaneHalf.y);
  vRestPos = restPos;
  vec3 p = restPos + heartDisplacementAt(restPos);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const SLICE_FRAGMENT = /* glsl */ `
uniform float uFlowOpen;
varying vec3 vRestPos;
${GLSL_BEATS}
${GLSL_GRID}
${GLSL_ELECTRICAL}
float hvLabel(vec3 uvw) { return floor(texture(uLabelTex, uvw).r * 255.0 + 0.5); }
// First of the 6 face-neighbour labels (1 voxel away) that is blood (wantBlood) or wall; 0 if none. Resolves samples
// where the smooth SDF and the NEAREST voxel label disagree (within a voxel of the surface).
float hvNeighbourLabel(vec3 uvw, bool wantBlood) {
  vec3 tx = 1.0 / vec3(textureSize(uLabelTex, 0));
  vec3 o[6] = vec3[6](vec3(tx.x, 0.0, 0.0), vec3(-tx.x, 0.0, 0.0), vec3(0.0, tx.y, 0.0), vec3(0.0, -tx.y, 0.0), vec3(0.0, 0.0, tx.z), vec3(0.0, 0.0, -tx.z));
  float r = 0.0;
  for (int i = 0; i < 6; i++) {
    float t = hvLabel(uvw + o[i]);
    bool ok = wantBlood ? (t > 0.5 && t < 1.5) : t > 1.5;
    if (r < 0.5 && ok) r = t;
  }
  return r;
}
void main() {
  vec3 uvw = hvTexCoord(vRestPos);
  if (any(lessThan(uvw, vec3(0.0))) || any(greaterThan(uvw, vec3(1.0)))) discard;
  vec4 f = texture(uFieldTex, uvw);
  float tissue = hvLabel(uvw);
  // Wall vs not-wall from the smooth SDF (the surface the mesh was extracted from), so cut outlines are not
  // voxel-stepped; outside the wall only blood (cavities) is drawn.
  if (f.w >= 0.0) {
    if (tissue > 1.5) tissue = hvNeighbourLabel(uvw, true);
    if (tissue < 0.5 || tissue > 1.5) discard;
    // blood-flow layer: the cut cavity is a window onto the streams (the plane already discards, so no early-z cost)
    if (uFlowOpen > 0.5) discard;
  } else if (tissue < 1.5) {
    tissue = hvNeighbourLabel(uvw, false);
    if (tissue < 0.5) discard;
  }
  vec4 st = hvTissueColor(tissue, f.xy, f.z, vRestPos);
  vec3 c = st.rgb + uColFront * (st.a * 0.3);
  // thin darker rim where the wall meets blood / outside (|sdf| < ~1 mm), like a textbook section outline
  if (hvCompOfTissue(tissue) > 0.5) c *= 1.0 - 0.3 * (1.0 - smoothstep(0.0, 1.0, abs(f.w)));
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export interface SlicePlane {
  readonly mesh: Mesh;
  setRect(r: SliceRect): void;
  /** Leave the blood fill out (cut cavities open) while the blood-flow layer is shown. */
  setFlowOpen(on: boolean): void;
  dispose(): void;
}

export function createSlicePlane(shared: SharedUniforms): SlicePlane {
  const local = {
    uPlaneCenter: { value: new Vector3() },
    uPlaneU: { value: new Vector3(1, 0, 0) },
    uPlaneV: { value: new Vector3(0, 1, 0) },
    uPlaneHalf: { value: new Vector2(1, 1) },
    uFlowOpen: { value: 0 },
  };
  const material = new ShaderMaterial({
    uniforms: { ...shared, ...local },
    vertexShader: SLICE_VERTEX,
    fragmentShader: SLICE_FRAGMENT,
    side: DoubleSide,
  });
  const geometry = new PlaneGeometry(1, 1, SLICE_SEGMENTS, SLICE_SEGMENTS);
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false; // placed and displaced on the GPU
  mesh.name = 'slicePlane';
  return {
    mesh,
    setRect(r) {
      local.uPlaneCenter.value.fromArray(r.center);
      local.uPlaneU.value.fromArray(r.u);
      local.uPlaneV.value.fromArray(r.v);
      local.uPlaneHalf.value.set(r.halfU, r.halfV);
    },
    setFlowOpen(on) {
      local.uFlowOpen.value = on ? 1 : 0;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

// ---------------------------------------------------------------- arrows

export const ARROW_VERTEX = /* glsl */ `
attribute vec2 aITAct;
attribute float aIComp;
varying float vGlow;
varying float vComp;
${GLSL_BEATS}
${GLSL_GRID}
${GLSL_DISPLACEMENT}
float hvArrowGlow(vec4 b, vec2 tAct) {
  float t = hvSlotT(b, tAct);
  if (b.w < 0.5 || t >= HV_T_VALID) return 0.0;
  float tau = b.x - t;
  return smoothstep(-8.0, 0.0, tau) * (1.0 - smoothstep(10.0, 40.0, tau));
}
void main() {
  vec3 centre = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 restPos = (instanceMatrix * vec4(position, 1.0)).xyz;
  // the arrow rides rigidly on the tissue under its centre (same displacement field as the plane)
  vec3 p = restPos + heartDisplacementAt(centre);
  bool v = aIComp > 1.5;
  vGlow = max(hvArrowGlow(v ? uBeatV[0] : uBeatA[0], aITAct), hvArrowGlow(v ? uBeatV[1] : uBeatA[1], aITAct));
  vComp = aIComp;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const ARROW_FRAGMENT = /* glsl */ `
uniform vec3 uColAtrial;
uniform vec3 uColQrs;
uniform vec3 uColFront;
uniform vec3 uColArrowRest;
varying float vGlow;
varying float vComp;
void main() {
  vec3 c = mix(uColArrowRest, vComp > 1.5 ? uColQrs : uColAtrial, smoothstep(0.0, 0.4, vGlow));
  c = mix(c, uColFront, 0.35 * vGlow);
  gl_FragColor = vec4(c, max(0.22, vGlow));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** Flat arrow in the XY plane pointing +X, length 1 centred on the origin. */
function arrowGeometry(): BufferGeometry {
  const s0 = -0.5, s1 = 0.08, tip = 0.5, hw = 0.08, hh = 0.24;
  const p = new Float32Array([s0, -hw, 0, s1, -hw, 0, s1, hw, 0, s0, hw, 0, s1, -hh, 0, tip, 0, 0, s1, hh, 0]);
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(p, 3));
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6]);
  return g;
}

export interface SliceArrowLayer {
  readonly mesh: InstancedMesh;
  /** Rebuilds instances (slice moved). Not per frame. */
  set(arrows: SliceArrows, normal: readonly [number, number, number], spacingMm: number): void;
  dispose(): void;
}

export function createSliceArrows(shared: SharedUniforms, maxCount = 900): SliceArrowLayer {
  const geometry = arrowGeometry();
  const tAct = new InstancedBufferAttribute(new Float32Array(2 * maxCount), 2);
  const comp = new InstancedBufferAttribute(new Float32Array(maxCount), 1);
  geometry.setAttribute('aITAct', tAct);
  geometry.setAttribute('aIComp', comp);
  const material = new ShaderMaterial({
    uniforms: shared,
    vertexShader: ARROW_VERTEX,
    fragmentShader: ARROW_FRAGMENT,
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new InstancedMesh(geometry, material, maxCount);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.name = 'sliceArrows';
  const m = new Matrix4(), x = new Vector3(), y = new Vector3(), z = new Vector3();
  return {
    mesh,
    set(a, normal, spacingMm) {
      const n = Math.min(a.count, maxCount);
      const len = spacingMm * 0.8;
      z.fromArray(normal).normalize();
      for (let i = 0; i < n; i++) {
        x.fromArray(a.dir, 3 * i);
        y.crossVectors(z, x).normalize();
        m.makeBasis(x.clone().multiplyScalar(len), y.multiplyScalar(len), z);
        // lift 0.6 mm toward the removed half so the arrow sits on top of the cut surface
        m.setPosition(a.pos[3 * i] + z.x * 0.6, a.pos[3 * i + 1] + z.y * 0.6, a.pos[3 * i + 2] + z.z * 0.6);
        mesh.setMatrixAt(i, m);
        tAct.array[2 * i] = a.tAct[2 * i];
        tAct.array[2 * i + 1] = a.tAct[2 * i + 1];
        comp.array[i] = a.comp[i];
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      tAct.needsUpdate = true;
      comp.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
}
