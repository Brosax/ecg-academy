/**
 * Valves: simple leaflets at engine.geometry.valves. Closed leaflets fill the annulus; opening bends each leaflet
 * about its own annulus point toward the forward-flow normal (tips move most). Openness comes from model truth
 * (core/valveMotion.ts) and is applied in the vertex shader, followed by the shared displacement field so the valves
 * ride with the descending AV plane.
 */
import { BufferAttribute, BufferGeometry, DoubleSide, GreaterDepth, Group, Mesh, MeshStandardMaterial } from 'three';
import type { IUniform, WebGLProgramParametersWithUniforms } from 'three';
import { cross, normalize, scale, sub } from '../sim/frame';
import type { CycleTruth, GeometryBundle, StructureId, ValveEvents, ValveGeom, ValveId, Vec3 } from '../sim/types';
import { leafletOpenness, isSemilunar } from './core/valveMotion';
import { sliceBasis } from './core/slice';
import { GLSL_BEATS, GLSL_CLIP, GLSL_DISPLACEMENT, GLSL_GRID, GLSL_ROTATE, insertAfter, replaceOnce, setClipDefine } from './shaders/chunks';
import type { SharedUniforms } from './shaders/uniforms';

export const VALVE_PROGRAM_KEY = 'hv-valve-v1';
const MAX_ANGLE_RAD = (75 * Math.PI) / 180;

/** Leaflet patches in the closed position, with per-vertex hinge point, hinge axis and flex (0 at annulus … 1 at tip). */
export function buildLeafletGeometry(v: ValveGeom): BufferGeometry {
  const leaflets = v.id === 'MITRAL' ? 2 : 3;
  const { n, u, v: w } = sliceBasis(v.normal);
  const R = v.radiusMm;
  const NR = 6, NA = 10;
  const pos: number[] = [], nor: number[] = [], hinge: number[] = [], axis: number[] = [], flex: number[] = [], idx: number[] = [];
  // Semilunar cusps sag back toward the ventricle when closed; AV leaflets bulge slightly into the atrium.
  const dome = isSemilunar(v.id) ? -0.18 * R : -0.1 * R;
  for (let l = 0; l < leaflets; l++) {
    const a0 = (2 * Math.PI * l) / leaflets + 0.04, a1 = (2 * Math.PI * (l + 1)) / leaflets - 0.04;
    const base = pos.length / 3;
    for (let ia = 0; ia <= NA; ia++) {
      const phi = a0 + ((a1 - a0) * ia) / NA;
      const radial: Vec3 = [Math.cos(phi) * u[0] + Math.sin(phi) * w[0], Math.cos(phi) * u[1] + Math.sin(phi) * w[1], Math.cos(phi) * u[2] + Math.sin(phi) * w[2]];
      const h: Vec3 = [v.centerMm[0] + radial[0] * R, v.centerMm[1] + radial[1] * R, v.centerMm[2] + radial[2] * R];
      // rotating the inward direction about cross(inward, n) by +angle swings it toward +n (forward flow)
      const k = normalize(cross(scale(radial, -1), n));
      for (let ir = 0; ir <= NR; ir++) {
        const f = ir / NR; // 0 at annulus, 1 near the centre
        const r = R * (1 - 0.94 * f);
        const p = sub([v.centerMm[0] + radial[0] * r, v.centerMm[1] + radial[1] * r, v.centerMm[2] + radial[2] * r], scale(n, -dome * Math.sin(f * Math.PI * 0.5)));
        pos.push(p[0], p[1], p[2]);
        nor.push(n[0], n[1], n[2]);
        hinge.push(h[0], h[1], h[2]);
        axis.push(k[0], k[1], k[2]);
        flex.push(f);
      }
    }
    for (let ia = 0; ia < NA; ia++)
      for (let ir = 0; ir < NR; ir++) {
        const q = base + ia * (NR + 1) + ir;
        idx.push(q, q + NR + 1, q + 1, q + 1, q + NR + 1, q + NR + 2);
      }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(nor), 3));
  g.setAttribute('aHinge', new BufferAttribute(new Float32Array(hinge), 3));
  g.setAttribute('aHingeAxis', new BufferAttribute(new Float32Array(axis), 3));
  g.setAttribute('aFlex', new BufferAttribute(new Float32Array(flex), 1));
  g.setIndex(idx);
  return g;
}

const VERT_DECL = /* glsl */ `
attribute vec3 aHinge;
attribute vec3 aHingeAxis;
attribute float aFlex;
uniform float uOpen;
uniform float uMaxAngle;
varying vec3 vRestPos;
${GLSL_BEATS}
${GLSL_GRID}
${GLSL_DISPLACEMENT}
${GLSL_ROTATE}
`;

type ShaderLike = Pick<WebGLProgramParametersWithUniforms, 'vertexShader' | 'fragmentShader' | 'uniforms'>;

export function patchValveShader(shader: ShaderLike, uniforms: Record<string, IUniform>): void {
  let vs = insertAfter(shader.vertexShader, '#include <common>', VERT_DECL);
  vs = replaceOnce(vs, '#include <beginnormal_vertex>', 'vec3 objectNormal = hvRotate(vec3(normal), aHingeAxis, uOpen * uMaxAngle * aFlex);');
  vs = insertAfter(
    vs,
    '#include <begin_vertex>',
    'transformed = aHinge + hvRotate(position - aHinge, aHingeAxis, uOpen * uMaxAngle * aFlex);\nvRestPos = position;\ntransformed += heartDisplacementAt(position);',
  );
  let fs = insertAfter(shader.fragmentShader, '#include <common>', `varying vec3 vRestPos;\nuniform float uHl;\nuniform vec3 uColHighlight;\n${GLSL_CLIP}`);
  fs = replaceOnce(fs, '#include <clipping_planes_fragment>', 'HV_CLIP_DISCARD(vRestPos)\n#include <clipping_planes_fragment>');
  fs = insertAfter(fs, '#include <color_fragment>', 'diffuseColor.rgb = mix(diffuseColor.rgb, uColHighlight, uHl * 0.5);');
  fs = insertAfter(fs, '#include <emissivemap_fragment>', 'totalEmissiveRadiance += uColHighlight * (uHl * 0.3);');
  shader.vertexShader = vs;
  shader.fragmentShader = fs;
  Object.assign(shader.uniforms, uniforms);
}

export interface Valves {
  readonly group: Group;
  /** prev: the cycle before `cycle`, whose ejection / relaxation can outlast the next P onset at high rates. */
  update(cycle: CycleTruth | null, prev: CycleTruth | null, tMs: number): void;
  setHighlight(ids: ReadonlySet<StructureId>): void;
  setColor(css: string): void;
  setClip(on: boolean): void;
  dispose(): void;
}

function eventsOf(c: CycleTruth | null, id: ValveId): ValveEvents | undefined {
  if (c) for (let j = 0; j < c.valves.length; j++) if (c.valves[j].id === id) return c.valves[j];
  return undefined;
}

export function createValves(geo: GeometryBundle, shared: SharedUniforms): Valves {
  const group = new Group();
  group.name = 'valves';
  const items: { id: ValveId; open: IUniform<number>; hl: IUniform<number>; mats: MeshStandardMaterial[]; geom: BufferGeometry }[] = [];
  for (const v of geo.valves) {
    const geom = buildLeafletGeometry(v);
    const open = { value: isSemilunar(v.id) ? 0 : 1 }, hl = { value: 0 };
    const mats: MeshStandardMaterial[] = [];
    for (const ghost of [false, true]) {
      const m = new MeshStandardMaterial({ color: 0xeee4d2, roughness: 0.65, metalness: 0, side: DoubleSide });
      if (ghost) {
        m.transparent = true;
        m.opacity = 0.28;
        m.depthWrite = false;
        m.depthFunc = GreaterDepth; // faint X-ray view of leaflets hidden inside the annulus
      }
      m.onBeforeCompile = (s) => patchValveShader(s, { ...shared, uOpen: open, uMaxAngle: { value: MAX_ANGLE_RAD }, uHl: hl });
      m.customProgramCacheKey = () => VALVE_PROGRAM_KEY;
      const mesh = new Mesh(geom, m);
      mesh.frustumCulled = false;
      mesh.renderOrder = ghost ? 5 : 1;
      mesh.name = `valve-${v.id}`;
      group.add(mesh);
      mats.push(m);
    }
    items.push({ id: v.id, open, hl, mats, geom });
  }
  return {
    group,
    update(cycle, prev, tMs) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        it.open.value = leafletOpenness(it.id, eventsOf(prev, it.id), eventsOf(cycle, it.id), tMs);
      }
    },
    setHighlight(ids) {
      for (const it of items) it.hl.value = ids.has(it.id) ? 1 : 0;
    },
    setColor(css) {
      for (const it of items) for (const m of it.mats) m.color.setStyle(css);
    },
    setClip(on) {
      for (const it of items) for (const m of it.mats) setClipDefine(m, on);
    },
    dispose() {
      for (const it of items) {
        it.geom.dispose();
        it.mats.forEach((m) => m.dispose());
      }
    },
  };
}
