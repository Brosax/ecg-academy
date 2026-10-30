/**
 * 3D lead axis of the selected lead through the heart centre along its (Dower) lead vector L̂ (Frank → app), with
 * + / − ends, Wilson's central terminal as a ring at the centre for precordial leads, links from the electrodes that
 * form the negative pole, and the projection of H on the axis as a thick segment of signed length = lead voltage ×
 * 4 cm/mV (= |L|·(H·L̂), the value the ECG shows).
 */
import {
  BufferAttribute, BufferGeometry, CylinderGeometry, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial,
  SphereGeometry, TorusGeometry, Vector3,
} from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { ElectrodeId, Vec3 } from '../sim/types';
import type { LeadAxisSpec } from './core/vectors';

const UP = new Vector3(0, 1, 0);
export const AXIS_HALF_CM = 14;

export interface LeadAxisView {
  /** Positioned at the heart centre (app frame). */
  readonly group: Group;
  setSpec(spec: LeadAxisSpec, electrodePos: Readonly<Record<ElectrodeId, { pos: Vec3 }>>, centre: Vector3): void;
  /** Signed projection length (cm) and the label text. */
  setProjection(lengthCm: number): void;
  setValueText(text: string): void;
  setLabels(plus: string, minus: string, wct: string): void;
  setColors(axisCss: string, posCss: string, negCss: string, projCss: string): void;
  dispose(): void;
}

function label(cls: string): { obj: CSS2DObject; el: HTMLDivElement } {
  const el = document.createElement('div');
  el.className = `hv-label ${cls}`;
  return { obj: new CSS2DObject(el), el };
}

export function createLeadAxis(): LeadAxisView {
  const group = new Group();
  group.name = 'leadAxis';
  const axisRoot = new Group(); // +y = L̂
  group.add(axisRoot);
  const top = (m: Mesh | LineSegments, order = 18) => {
    m.renderOrder = order;
    m.frustumCulled = false;
    return m;
  };
  const axisMat = new MeshBasicMaterial({ color: 0x5c6370, depthTest: false, transparent: true, opacity: 0.85 });
  const posMat = new MeshBasicMaterial({ color: 0xff7a00, depthTest: false, transparent: true });
  const negMat = new MeshBasicMaterial({ color: 0x1f2328, depthTest: false, transparent: true });
  const projMat = new MeshBasicMaterial({ color: 0x1d5fd6, depthTest: false, transparent: true, opacity: 0.9 });
  const axisG = new CylinderGeometry(0.06, 0.06, 2 * AXIS_HALF_CM, 8);
  const endG = new SphereGeometry(0.42, 16, 12);
  const ringG = new TorusGeometry(0.85, 0.1, 8, 40).rotateX(Math.PI / 2);
  const projG = new CylinderGeometry(0.24, 0.24, 1, 16).translate(0, 0.5, 0);
  const axis = top(new Mesh(axisG, axisMat));
  const plus = top(new Mesh(endG, posMat));
  const minus = top(new Mesh(endG, negMat));
  const ring = top(new Mesh(ringG, negMat));
  const proj = top(new Mesh(projG, projMat), 21);
  plus.position.y = AXIS_HALF_CM;
  minus.position.y = -AXIS_HALF_CM;
  axisRoot.add(axis, plus, minus, ring, proj);

  const lPlus = label('hv-axis-end hv-pos'), lMinus = label('hv-axis-end hv-neg'), lWct = label('hv-axis-end hv-neg');
  const lValue = label('hv-axis-value');
  lPlus.obj.position.y = AXIS_HALF_CM + 1.4;
  lMinus.obj.position.y = -AXIS_HALF_CM - 1.4;
  lWct.obj.position.set(1.6, 0, 0);
  axisRoot.add(lPlus.obj, lMinus.obj, lWct.obj, lValue.obj);

  // links: negative-pole electrodes → their average (augmented) or → WCT ring (precordial). App frame, centre-relative.
  const linkPos = new Float32Array(6 * 3);
  const linkG = new BufferGeometry();
  linkG.setAttribute('position', new BufferAttribute(linkPos, 3));
  const linkMat = new LineBasicMaterial({ color: 0x1f2328, depthTest: false, transparent: true, opacity: 0.45 });
  const links = top(new LineSegments(linkG, linkMat), 17);
  group.add(links);
  const avgDot = top(new Mesh(new SphereGeometry(0.3, 12, 8), negMat), 18);
  group.add(avgDot);

  let kindWct = false;
  const tmp = new Vector3();
  return {
    group,
    setSpec(spec, epos, centre) {
      tmp.set(spec.dirApp[0], spec.dirApp[1], spec.dirApp[2]);
      axisRoot.quaternion.setFromUnitVectors(UP, tmp);
      kindWct = spec.wct;
      ring.visible = spec.wct;
      lWct.obj.visible = spec.wct;
      minus.visible = !spec.wct;
      lMinus.obj.visible = !spec.wct;
      // link segments
      let n = 0;
      const negs = spec.kind === 'bipolar' ? [] : spec.negative;
      let ax = 0, ay = 0, az = 0;
      for (const id of negs) {
        const p = epos[id].pos;
        ax += p[0] / negs.length;
        ay += p[1] / negs.length;
        az += p[2] / negs.length;
      }
      const hub: Vec3 = spec.wct ? [0, 0, 0] : [ax - centre.x, ay - centre.y, az - centre.z];
      for (const id of negs) {
        const p = epos[id].pos;
        linkPos.set([p[0] - centre.x, p[1] - centre.y, p[2] - centre.z, hub[0], hub[1], hub[2]], 6 * n++);
      }
      linkG.setDrawRange(0, 2 * n);
      (linkG.attributes.position as BufferAttribute).needsUpdate = true;
      avgDot.visible = spec.kind === 'augmented';
      avgDot.position.set(hub[0], hub[1], hub[2]);
    },
    setProjection(len) {
      const visible = Math.abs(len) > 0.02;
      proj.visible = visible;
      lValue.obj.visible = visible;
      if (!visible) return;
      proj.scale.set(1, len, 1); // negative scale = pointing toward the negative pole
      lValue.obj.position.set(1.4, len + (len >= 0 ? 0.8 : -0.8), 0);
    },
    setValueText(text) {
      if (lValue.el.textContent !== text) lValue.el.textContent = text;
    },
    setLabels(p, m, w) {
      lPlus.el.textContent = p;
      lMinus.el.textContent = m;
      lWct.el.textContent = kindWct ? w : '';
    },
    setColors(axisCss, posCss, negCss, projCss) {
      axisMat.color.setStyle(axisCss);
      posMat.color.setStyle(posCss);
      negMat.color.setStyle(negCss);
      linkMat.color.setStyle(negCss);
      projMat.color.setStyle(projCss);
    },
    dispose() {
      for (const g of [axisG, endG, ringG, projG, linkG, avgDot.geometry]) g.dispose();
      for (const m of [axisMat, posMat, negMat, projMat, linkMat]) m.dispose();
      for (const l of [lPlus, lMinus, lWct, lValue]) l.el.remove();
    },
  };
}
