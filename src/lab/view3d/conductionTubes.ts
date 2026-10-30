/**
 * Conduction system: gold tubes along engine.geometry.paths (local mm) with an emissive pulse travelling along uv.x,
 * timed by conductionTiming.ts. Three passes per path: solid core (visible parts), ghost core where the myocardium
 * hides it (depthFunc Greater, faint), and an additive halo for the pulse (no bloom).
 */
import {
  AdditiveBlending, CatmullRomCurve3, GreaterDepth, Group, Mesh, ShaderMaterial, SphereGeometry, TubeGeometry, Vector3,
} from 'three';
import type { BufferGeometry, IUniform } from 'three';
import type { BeatSnapshot, GeometryBundle, StructureId } from '../sim/types';
import { CONDUCTION_TIMING, isConductionId, pulseWindow } from './conductionTiming';
import type { ConductionId } from './conductionTiming';
import { GLSL_BEATS, GLSL_CLIP, GLSL_DISPLACEMENT, GLSL_GRID, setClipDefine } from './shaders/chunks';
import type { SharedUniforms } from './shaders/uniforms';

export const TUBE_RADIUS_MM = 0.8;
const HALO_RADIUS_MM = 2.2;
const SA_RADIUS_MM = 2.4;

export const TUBE_VERTEX = /* glsl */ `
uniform float uSince;
uniform float uDur;
uniform float uGlowMs;
varying float vPulse;
varying vec3 vNormalV;
varying vec3 vRestPos;
${GLSL_BEATS}
${GLSL_GRID}
${GLSL_DISPLACEMENT}
void main() {
  // arrival at this point = start + uv.x * transit; bright head, exponential afterglow (conductionTiming.pulseIntensity)
  float age = uSince - uv.x * uDur;
  vPulse = age < -1.5 ? 0.0 : clamp((age + 1.5) / 1.5, 0.0, 1.0) * exp(-max(age, 0.0) / uGlowMs);
  vRestPos = position;
  vec3 p = position + heartDisplacementAt(position);
  vNormalV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const TUBE_FRAGMENT = /* glsl */ `
uniform vec3 uColConduction;
uniform vec3 uColPulse;
uniform vec3 uColHighlight;
uniform float uHl;
uniform float uOpacity;
uniform float uHalo;
varying float vPulse;
varying vec3 vNormalV;
varying vec3 vRestPos;
${GLSL_CLIP}
void main() {
  HV_CLIP_DISCARD(vRestPos)
  float facing = abs(normalize(vNormalV).z);
  if (uHalo > 0.5) {
    gl_FragColor = vec4(uColPulse * vPulse * (0.25 + 0.75 * (1.0 - facing)), 1.0);
  } else {
    vec3 base = mix(uColConduction, uColHighlight, uHl * 0.6) * (0.55 + 0.45 * facing);
    gl_FragColor = vec4(base + uColPulse * vPulse, clamp(uOpacity + 0.6 * vPulse, 0.0, 1.0));
  }
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

interface PathUniforms {
  uSince: IUniform<number>;
  uDur: IUniform<number>;
  uGlowMs: IUniform<number>;
  uHl: IUniform<number>;
}

interface TubeEntry {
  readonly id: ConductionId;
  readonly u: PathUniforms;
}

export interface ConductionTubes {
  readonly group: Group;
  update(snap: BeatSnapshot, avGap: number, vScale: number): void;
  setHighlight(ids: ReadonlySet<StructureId>): void;
  /**
   * Conduction state of the scenario: blocked paths never carry a pulse (bundle-branch block); with
   * `ectopicSlot1`, beats from the alternative ventricular variant (ectopic / escape focus) do not light the
   * His–Purkinje paths either.
   */
  setBlocked(ids: ReadonlySet<StructureId>, ectopicSlot1: boolean): void;
  setClip(on: boolean): void;
  dispose(): void;
}

export function createConductionTubes(geo: GeometryBundle, shared: SharedUniforms): ConductionTubes {
  const group = new Group();
  group.name = 'conduction';
  const entries: TubeEntry[] = [];
  const geometries: BufferGeometry[] = [];
  const materials: ShaderMaterial[] = [];

  const make = (u: PathUniforms, kind: 'core' | 'ghost' | 'halo'): ShaderMaterial => {
    const m = new ShaderMaterial({
      uniforms: { ...shared, ...u, uOpacity: { value: kind === 'ghost' ? 0.3 : 1 }, uHalo: { value: kind === 'halo' ? 1 : 0 } },
      vertexShader: TUBE_VERTEX,
      fragmentShader: TUBE_FRAGMENT,
    });
    if (kind === 'ghost') {
      m.transparent = true;
      m.depthWrite = false;
      m.depthFunc = GreaterDepth; // only where the wall hides the tube: an X-ray hint of the hidden conduction system
    } else if (kind === 'halo') {
      m.transparent = true;
      m.depthWrite = false;
      m.depthTest = false;
      m.blending = AdditiveBlending;
    }
    materials.push(m);
    return m;
  };

  const addMeshes = (id: ConductionId, core: BufferGeometry, halo: BufferGeometry) => {
    const u: PathUniforms = {
      uSince: { value: -1e4 },
      uDur: { value: 0 },
      uGlowMs: { value: CONDUCTION_TIMING[id].glowMs },
      uHl: { value: 0 },
    };
    geometries.push(core, halo);
    const a = new Mesh(core, make(u, 'core'));
    const b = new Mesh(core, make(u, 'ghost'));
    const c = new Mesh(halo, make(u, 'halo'));
    a.renderOrder = 1;
    b.renderOrder = 5;
    c.renderOrder = 6;
    for (const m of [a, b, c]) {
      m.frustumCulled = false;
      m.name = `conduction-${id}`;
      group.add(m);
    }
    entries.push({ id, u });
  };

  for (const path of geo.paths) {
    if (!isConductionId(path.id) || path.pointsMm.length < 2) continue;
    const pts = path.pointsMm.map((p) => new Vector3(p[0], p[1], p[2]));
    const curve = new CatmullRomCurve3(pts, false, 'centripetal');
    const seg = Math.max(8, Math.min(120, Math.round(curve.getLength() / 1.2)));
    addMeshes(path.id, new TubeGeometry(curve, seg, TUBE_RADIUS_MM, 8, false), new TubeGeometry(curve, seg, HALO_RADIUS_MM, 8, false));
  }
  const sa = geo.landmarks.SA;
  if (sa && !geo.paths.some((p) => p.id === 'SA')) {
    const core = new SphereGeometry(SA_RADIUS_MM, 18, 12).translate(sa[0], sa[1], sa[2]);
    const halo = new SphereGeometry(SA_RADIUS_MM * 2, 18, 12).translate(sa[0], sa[1], sa[2]);
    addMeshes('SA', core, halo); // uDur = 0 (set per frame): the whole node lights at once
  }

  const win = { sinceStartMs: 0, durMs: 0 };
  let blocked: ReadonlySet<StructureId> = new Set();
  let ectopic1 = false;
  return {
    group,
    update(snap, avGap, vScale) {
      const vEctopic = ectopic1 && snap.ventricular[0]?.slot === 1;
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (blocked.has(e.id) || (vEctopic && CONDUCTION_TIMING[e.id].end.ref === 'V' && e.id !== 'AVN')) {
          e.u.uSince.value = -1e4;
          e.u.uDur.value = 0;
          continue;
        }
        const w = pulseWindow(e.id, snap, avGap, vScale, win);
        e.u.uSince.value = w ? Math.max(-1e4, Math.min(1e4, w.sinceStartMs)) : -1e4;
        e.u.uDur.value = w && e.id !== 'SA' ? w.durMs : 0;
      }
    },
    setHighlight(ids) {
      for (const e of entries) e.u.uHl.value = ids.has(e.id) ? 1 : 0;
    },
    setBlocked(ids, ectopicSlot1) {
      blocked = ids;
      ectopic1 = ectopicSlot1;
    },
    setClip(on) {
      for (const m of materials) setClipDefine(m, on);
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
