/**
 * Translucent body and the 10 ECG electrodes in the app frame. With a realistic body model (HRA skin, same frame as
 * the heart) the skin, its electrode sites and the precordial landmark lines are drawn; otherwise a stylized
 * fallback torso (lathe trunk + capsule arm/leg stubs) in the app frame (cm,
 * origin = ventricular centroid, as ELECTRODE_POS_CM). The trunk's elliptical cross-section is fitted so the
 * precordial electrodes sit on its surface; limb electrodes are drawn on the limb stubs (limbs act as conductors, so
 * the potential equals that at the limb root — src/sim/leads/electrodes.ts).
 */
import {
  BufferAttribute, BufferGeometry as ThreeGeometry, CapsuleGeometry, CatmullRomCurve3, CylinderGeometry, Group, LatheGeometry,
  Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion, SphereGeometry, TorusGeometry, TubeGeometry, Vector2, Vector3,
} from 'three';
import type { BufferGeometry } from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ELECTRODE_COLORS, ELECTRODE_POS_CM } from '../sim/leads/electrodes';
import type { BodyGuideId, BodyModel, ElectrodeId, Vec3 } from '../sim/types';
import { ELECTRODES } from '../sim/types';

/** Trunk midline / depth centre and depth/width ratio (fitted to ELECTRODE_POS_CM, see header). */
export const TORSO_SHAPE = { midX: -2.5, midZ: -3.8, zScale: 0.68 } as const;
/** (radius, y) profile of the trunk before the z squash, cm. */
const PROFILE: readonly (readonly [number, number])[] = [
  [0.01, -36], [12.5, -35.5], [14, -31], [13.4, -22], [13.8, -12], [15.6, -4], [16.2, 2], [16.4, 9], [16.6, 14],
  [15.6, 18.5], [11.5, 21.5], [6.2, 23.4], [5.3, 24.6], [5.3, 29], [0.01, 29.4],
];

interface Limb {
  readonly from: Vec3;
  readonly to: Vec3;
  readonly radius: number;
  readonly electrode: ElectrodeId;
}
const { midX, midZ, zScale } = TORSO_SHAPE;
const LIMBS: readonly Limb[] = [
  { from: [midX - 17.5, 17.5, midZ], to: [midX - 21, 3, midZ + 1], radius: 3.8, electrode: 'RA' },
  { from: [midX + 17.5, 17.5, midZ], to: [midX + 21, 3, midZ + 1], radius: 3.8, electrode: 'LA' },
  { from: [midX - 8.5, -33, midZ], to: [midX - 9, -46, midZ + 1], radius: 5.6, electrode: 'RL' },
  { from: [midX + 8.5, -33, midZ], to: [midX + 9, -46, midZ + 1], radius: 5.6, electrode: 'LL' },
];

/** Where each electrode is drawn: precordial at ELECTRODE_POS_CM, limb electrodes on the anterior face of the stubs. */
export function electrodeDrawPositions(): Record<ElectrodeId, { pos: Vec3; normal: Vec3 }> {
  const out = {} as Record<ElectrodeId, { pos: Vec3; normal: Vec3 }>;
  for (const id of ELECTRODES) {
    const limb = LIMBS.find((l) => l.electrode === id);
    if (limb) {
      const f = 0.75;
      const c: Vec3 = [limb.from[0] + (limb.to[0] - limb.from[0]) * f, limb.from[1] + (limb.to[1] - limb.from[1]) * f, limb.from[2] + (limb.to[2] - limb.from[2]) * f];
      out[id] = { pos: [c[0], c[1], c[2] + limb.radius], normal: [0, 0, 1] };
    } else {
      const p = ELECTRODE_POS_CM[id];
      // ellipse normal ∝ (dx / a², dz / b²) with b = a·zScale
      const nx = p[0] - midX, nz = (p[2] - midZ) / (zScale * zScale);
      const l = Math.hypot(nx, nz) || 1;
      out[id] = { pos: p, normal: [nx / l, 0, nz / l] };
    }
  }
  return out;
}

export interface Torso {
  readonly body: Group;
  readonly electrodes: Group;
  readonly drawPos: Record<ElectrodeId, { pos: Vec3; normal: Vec3 }>;
  /** True when the realistic skin is shown. */
  readonly realistic: boolean;
  setColors(torsoCss: string, standard: 'IEC' | 'AHA', guideCss?: string): void;
  /** Landmark-line labels (realistic body only). */
  setGuideLabels(text: (id: BodyGuideId) => string): void;
  /** Mark the electrodes forming the selected lead (+ / −); null clears. */
  setRoles(positive: ElectrodeId | null, negative: readonly ElectrodeId[], posCss: string, negCss: string): void;
  setLabels(text: (id: ElectrodeId, long: boolean) => string): void;
  dispose(): void;
}

const UP = new Vector3(0, 1, 0);

/** Where the landmark-line labels go: top of vertical lines, sternal end of the intercostal arcs. */
const GUIDE_LABEL_AT: Readonly<Record<BodyGuideId, 'first' | 'last'>> = {
  midsternal: 'last', midclavicular: 'last', anteriorAxillary: 'last', midAxillary: 'last', ics4: 'first', ics5: 'first',
};

export function createTorso(model?: BodyModel): Torso {
  const body = new Group();
  body.name = 'torso';
  const geoms: BufferGeometry[] = [];
  const realistic = !!model;
  const mat = new MeshStandardMaterial({
    color: 0xd9cfc4, transparent: true, opacity: realistic ? 0.2 : 0.14, depthWrite: false, roughness: 0.75, metalness: 0,
  });
  // Fresnel-like edge: silhouettes stay readable while the chest in front of the heart stays clear.
  mat.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace(
      '#include <opaque_fragment>',
      'diffuseColor.a *= mix(0.35, 2.0, pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0));\n#include <opaque_fragment>',
    );
  };
  mat.customProgramCacheKey = () => 'hv-torso-v1';

  const meshes: Mesh[] = [];
  const guideMat = new MeshBasicMaterial({ color: 0x6b7280, transparent: true, opacity: 0.75, depthWrite: false });
  const guideLabels: { id: BodyGuideId; el: HTMLDivElement }[] = [];
  if (model) {
    // realistic skin (HRA, same frame as the heart)
    const g = new ThreeGeometry();
    g.setAttribute('position', new BufferAttribute(model.skin.position, 3));
    g.setAttribute('normal', new BufferAttribute(model.skin.normal, 3));
    g.setIndex(new BufferAttribute(model.skin.index, 1));
    geoms.push(g);
    meshes.push(new Mesh(g, mat));
    // precordial landmark lines on the skin
    for (const gd of model.guides) {
      if (gd.points.length < 2) continue;
      const curve = new CatmullRomCurve3(gd.points.map((p) => new Vector3(p[0], p[1], p[2])));
      const tube = new TubeGeometry(curve, Math.max(8, gd.points.length * 3), 0.09, 6, false);
      geoms.push(tube);
      const m = new Mesh(tube, guideMat);
      m.renderOrder = 9;
      body.add(m);
      const at = GUIDE_LABEL_AT[gd.id] === 'first' ? gd.points[0] : gd.points[gd.points.length - 1];
      const el = document.createElement('div');
      el.className = 'hv-label hv-guide';
      const lab = new CSS2DObject(el);
      lab.position.set(at[0], at[1] + (GUIDE_LABEL_AT[gd.id] === 'last' ? 1.2 : 0), at[2]);
      body.add(lab);
      guideLabels.push({ id: gd.id, el });
    }
  } else {
    const trunk = new LatheGeometry(PROFILE.map(([r, y]) => new Vector2(r, y)), 56);
    trunk.scale(1, 1, zScale).translate(midX, 0, midZ);
    geoms.push(trunk);
    meshes.push(new Mesh(trunk, mat));
    const q = new Quaternion(), dir = new Vector3();
    for (const l of LIMBS) {
      dir.set(l.to[0] - l.from[0], l.to[1] - l.from[1], l.to[2] - l.from[2]);
      const len = dir.length();
      const g = new CapsuleGeometry(l.radius, len, 6, 20);
      q.setFromUnitVectors(UP, dir.normalize());
      g.applyQuaternion(q).translate((l.from[0] + l.to[0]) / 2, (l.from[1] + l.to[1]) / 2, (l.from[2] + l.to[2]) / 2);
      geoms.push(g);
      meshes.push(new Mesh(g, mat));
    }
  }
  for (const m of meshes) {
    m.renderOrder = 8; // after the heart and its ghost passes
    body.add(m);
  }

  // ---- electrodes
  const electrodes = new Group();
  electrodes.name = 'electrodes';
  const drawPos: Record<ElectrodeId, { pos: Vec3; normal: Vec3 }> = model
    ? (Object.fromEntries(ELECTRODES.map((id) => [id, { pos: model.electrodes[id].pos, normal: model.electrodes[id].normal }])) as Record<
        ElectrodeId,
        { pos: Vec3; normal: Vec3 }
      >)
    : electrodeDrawPositions();
  const disc = new CylinderGeometry(0.8, 0.8, 0.28, 24);
  const nub = new SphereGeometry(0.28, 12, 8).translate(0, 0.2, 0);
  const ring = new TorusGeometry(1.25, 0.14, 8, 32).rotateX(Math.PI / 2);
  geoms.push(disc, nub, ring);
  const nubMat = new MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.3, metalness: 0.6 });
  const items = new Map<ElectrodeId, { group: Group; mat: MeshStandardMaterial; ringMesh: Mesh; ringMat: MeshStandardMaterial; label: CSS2DObject; el: HTMLDivElement }>();
  for (const id of ELECTRODES) {
    const g = new Group();
    const { pos, normal } = drawPos[id];
    g.position.set(pos[0], pos[1], pos[2]);
    g.quaternion.setFromUnitVectors(UP, new Vector3(normal[0], normal[1], normal[2]));
    const m = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0 });
    const ringMat = new MeshStandardMaterial({ color: 0xff7a00, roughness: 0.4, emissive: 0x000000 });
    const ringMesh = new Mesh(ring, ringMat);
    ringMesh.visible = false;
    g.add(new Mesh(disc, m), new Mesh(nub, nubMat), ringMesh);
    const el = document.createElement('div');
    el.className = 'hv-label hv-electrode';
    const label = new CSS2DObject(el);
    label.position.set(0, 1.7, 0);
    g.add(label);
    electrodes.add(g);
    items.set(id, { group: g, mat: m, ringMesh, ringMat, label, el });
  }

  return {
    body,
    electrodes,
    drawPos,
    realistic,
    setColors(torsoCss, standard, guideCss) {
      mat.color.setStyle(torsoCss);
      if (guideCss) guideMat.color.setStyle(guideCss);
      for (const [id, it] of items) it.mat.color.setStyle(ELECTRODE_COLORS[standard][id]);
    },
    setRoles(positive, negative, posCss, negCss) {
      for (const [id, it] of items) {
        const isPos = id === positive, isNeg = negative.includes(id);
        it.ringMesh.visible = isPos || isNeg;
        if (isPos || isNeg) it.ringMat.color.setStyle(isPos ? posCss : negCss);
        it.group.scale.setScalar(isPos || isNeg ? 1.25 : 1);
        it.el.classList.toggle('hv-pos', isPos);
        it.el.classList.toggle('hv-neg', isNeg);
      }
    },
    setGuideLabels(text) {
      for (const g of guideLabels) g.el.textContent = text(g.id);
    },
    setLabels(text) {
      for (const [id, it] of items) {
        const long = it.el.classList.contains('hv-pos') || it.el.classList.contains('hv-neg');
        it.el.textContent = text(id, long);
        it.el.title = text(id, true);
      }
    },
    dispose() {
      geoms.forEach((g) => g.dispose());
      mat.dispose();
      guideMat.dispose();
      for (const g of guideLabels) g.el.remove();
      nubMat.dispose();
      for (const it of items.values()) {
        it.mat.dispose();
        it.ringMat.dispose();
        it.el.remove();
      }
    },
  };
}
