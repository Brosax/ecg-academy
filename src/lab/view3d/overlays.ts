/**
 * Static anatomical overlays from geometry.overlays (great vessels, coronary arteries, cardiac veins of the HRA heart).
 * Not electrically active. They live in the heart-local pose group, ride with the shared displacement field (so the
 * coronaries stay on the contracting epicardium) and honour the rest-space cross-section clip like the heart.
 * Colours are anatomical, not electrical: coronary arteries red, cardiac veins blue-violet, great vessels in muted
 * arterial / venous tones.
 */
import { BufferAttribute, BufferGeometry, Color, DoubleSide, FrontSide, Group, Mesh, MeshStandardMaterial } from 'three';
import type { IUniform, WebGLProgramParametersWithUniforms } from 'three';
import type { GeometryBundle, OverlayMesh } from '../sim/types';
import { GLSL_BEATS, GLSL_CLIP, GLSL_DISPLACEMENT, GLSL_GRID, insertAfter, replaceOnce, setClipDefine } from './shaders/chunks';
import type { SharedUniforms } from './shaders/uniforms';

export const OVERLAY_PROGRAM_KEY = 'hv-overlay-v1';

/** Anatomical colour per overlay (sRGB hex). */
export function overlayColor(o: Pick<OverlayMesh, 'id' | 'kind'>): string {
  switch (o.kind) {
    case 'coronaryArtery':
      return '#c8312b';
    case 'cardiacVein':
      return '#5b4cb8';
    case 'pulmonaryVein':
      return '#c07670';
    case 'greatVein':
      return '#7470ad';
    case 'greatArtery':
      return o.id === 'PULMONARY_TRUNK' ? '#6f80b4' : '#b65a52';
    default:
      return '#a88a80';
  }
}

type ShaderLike = Pick<WebGLProgramParametersWithUniforms, 'vertexShader' | 'fragmentShader' | 'uniforms'>;

export function patchOverlayShader(shader: ShaderLike, uniforms: Record<string, IUniform>): void {
  let vs = insertAfter(shader.vertexShader, '#include <common>', `varying vec3 vRestPos;\n${GLSL_BEATS}\n${GLSL_GRID}\n${GLSL_DISPLACEMENT}`);
  vs = insertAfter(vs, '#include <begin_vertex>', 'vRestPos = position;\ntransformed += heartDisplacementAt(position);');
  let fs = insertAfter(shader.fragmentShader, '#include <common>', `varying vec3 vRestPos;\n${GLSL_CLIP}`);
  fs = replaceOnce(fs, '#include <clipping_planes_fragment>', 'HV_CLIP_DISCARD(vRestPos)\n#include <clipping_planes_fragment>');
  shader.vertexShader = vs;
  shader.fragmentShader = fs;
  Object.assign(shader.uniforms, uniforms);
}

export interface Overlays {
  readonly group: Group;
  setClip(on: boolean): void;
  /** Glow the given overlays (e.g. the culprit coronary artery of an infarction scenario). */
  setHighlight(ids: ReadonlySet<string>, css: string): void;
  dispose(): void;
}

export function createOverlays(geo: GeometryBundle, shared: SharedUniforms): Overlays {
  const group = new Group();
  group.name = 'overlays';
  const items: { id: string; geom: BufferGeometry; mat: MeshStandardMaterial }[] = [];
  for (const o of geo.overlays ?? []) {
    const geom = new BufferGeometry();
    geom.setAttribute('position', new BufferAttribute(o.position, 3));
    geom.setAttribute('normal', new BufferAttribute(o.normal, 3));
    geom.setIndex(new BufferAttribute(o.index, 1));
    const vessel = o.kind === 'greatArtery' || o.kind === 'greatVein' || o.kind === 'pulmonaryVein';
    const mat = new MeshStandardMaterial({ color: new Color(overlayColor(o)), roughness: vessel ? 0.6 : 0.45, metalness: 0, side: FrontSide });
    mat.onBeforeCompile = (s) => patchOverlayShader(s, shared);
    mat.customProgramCacheKey = () => OVERLAY_PROGRAM_KEY;
    const mesh = new Mesh(geom, mat);
    mesh.name = `overlay-${o.id}`;
    mesh.frustumCulled = false; // displaced on the GPU
    mesh.renderOrder = 2;
    group.add(mesh);
    items.push({ id: o.id, geom, mat });
  }
  return {
    group,
    setClip(on) {
      for (const it of items) {
        setClipDefine(it.mat, on);
        it.mat.side = on ? DoubleSide : FrontSide;
      }
    },
    setHighlight(ids, css) {
      for (const it of items) {
        if (ids.has(it.id)) {
          it.mat.emissive.setStyle(css);
          it.mat.emissiveIntensity = 0.9;
        } else {
          it.mat.emissive.setRGB(0, 0, 0);
          it.mat.emissiveIntensity = 0;
        }
      }
    },
    dispose() {
      for (const it of items) {
        it.geom.dispose();
        it.mat.dispose();
      }
    },
  };
}
