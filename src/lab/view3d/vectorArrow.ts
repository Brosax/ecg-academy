/**
 * Heart vector H = H_A + H_V as a thick arrow (cylinder + cone) from the heart centre, 1 mV ≈ 4 cm, plus an optional
 * VCG trail (last ≈ 400 ms of the tip, coloured by ECG segment). Drawn on top (depthTest off) because the vector's
 * origin is inside the ventricles. All per-frame updates write into preallocated objects.
 */
import {
  BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Group, Line, LineBasicMaterial, Mesh,
  MeshStandardMaterial, SphereGeometry, Vector3,
} from 'three';

const UP = new Vector3(0, 1, 0);
export const TRAIL_POINTS = 200;

export interface VectorArrow {
  readonly group: Group;
  readonly trail: Line;
  /** dir: unit app-frame direction; lengthCm = |H|·cm/mV. */
  update(dir: Vector3, lengthCm: number): void;
  setColor(css: string): void;
  /** Writes trail point i (app frame, relative to the heart centre) and its colour. */
  setTrailPoint(i: number, x: number, y: number, z: number, c: Color): void;
  commitTrail(count: number): void;
  dispose(): void;
}

export function createVectorArrow(): VectorArrow {
  const group = new Group();
  group.name = 'heartVector';
  const mat = new MeshStandardMaterial({ color: 0x1d5fd6, roughness: 0.35, metalness: 0.05, depthTest: false, transparent: true, opacity: 0.96 });
  const shaftG = new CylinderGeometry(0.17, 0.17, 1, 16, 1).translate(0, 0.5, 0);
  const headG = new ConeGeometry(0.46, 1, 24).translate(0, 0.5, 0);
  const baseG = new SphereGeometry(0.32, 16, 12);
  const shaft = new Mesh(shaftG, mat), head = new Mesh(headG, mat), base = new Mesh(baseG, mat);
  const tip = new Group();
  tip.add(shaft, head);
  group.add(tip, base);
  for (const m of [shaft, head, base]) m.renderOrder = 20;

  const pos = new Float32Array(3 * TRAIL_POINTS), col = new Float32Array(3 * TRAIL_POINTS);
  const tg = new BufferGeometry();
  const pa = new BufferAttribute(pos, 3), ca = new BufferAttribute(col, 3);
  tg.setAttribute('position', pa);
  tg.setAttribute('color', ca);
  tg.setDrawRange(0, 0);
  const tm = new LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true, opacity: 0.9 });
  const trail = new Line(tg, tm);
  trail.frustumCulled = false;
  trail.renderOrder = 19;

  return {
    group,
    trail,
    update(dir, len) {
      const visible = len > 0.08;
      tip.visible = visible;
      if (!visible) return;
      const headLen = Math.min(1.3, 0.28 * len + 0.15);
      const w = Math.min(1, len / 1.6);
      tip.quaternion.setFromUnitVectors(UP, dir);
      shaft.scale.set(w, Math.max(len - headLen, 0.001), w);
      head.position.y = Math.max(len - headLen, 0);
      head.scale.set(w, headLen, w);
    },
    setColor(css) {
      mat.color.setStyle(css);
    },
    setTrailPoint(i, x, y, z, c) {
      pos[3 * i] = x;
      pos[3 * i + 1] = y;
      pos[3 * i + 2] = z;
      col[3 * i] = c.r;
      col[3 * i + 1] = c.g;
      col[3 * i + 2] = c.b;
    },
    commitTrail(count) {
      tg.setDrawRange(0, count);
      pa.needsUpdate = true; // ≈ 2.4 KB, only while time advances (the heart mesh itself never re-uploads)
      ca.needsUpdate = true;
    },
    dispose() {
      shaftG.dispose();
      headG.dispose();
      baseG.dispose();
      mat.dispose();
      tg.dispose();
      tm.dispose();
    },
  };
}
