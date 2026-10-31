/**
 * Anchors (local mm) of the blood-flow layer's name tags: the four chambers at their contraction-axis centres and the
 * vessels the streams follow, on the stream itself (upstream part of a vein, the top of the aortic arch, the start of
 * the pulmonary trunk) so a tag sits on the flow it names. Pure; missing anatomy just leaves a tag out.
 */
import { CHAMBER } from '../../sim/types';
import type { GeometryBundle, Vec3 } from '../../sim/types';
import type { FlowLabelId } from '../flowControls';
import type { VesselFlowPath } from './flowTypes';

const CHAMBER_LABEL: Readonly<Partial<Record<number, FlowLabelId>>> = {
  [CHAMBER.RA]: 'RA',
  [CHAMBER.RV]: 'RV',
  [CHAMBER.LA]: 'LA',
  [CHAMBER.LV]: 'LV',
};

const at = (pts: readonly Vec3[], f: number): Vec3 | undefined => pts[Math.round(f * (pts.length - 1))];

export function flowLabelAnchors(geo: GeometryBundle, vessels: readonly VesselFlowPath[]): Partial<Record<FlowLabelId, Vec3>> {
  const out: Partial<Record<FlowLabelId, Vec3>> = {};
  for (const c of geo.chambers) {
    const id = CHAMBER_LABEL[c.chamber];
    if (id) out[id] = c.centerMm;
  }
  const first = (pred: (p: VesselFlowPath) => boolean) => vessels.find((p) => pred(p) && p.pts.length > 1);
  const svc = first((p) => p.vessel === 'SVC');
  const ivc = first((p) => p.vessel === 'IVC');
  const pv = first((p) => p.vessel.startsWith('PV_'));
  const pa = first((p) => p.vessel === 'PULMONARY_TRUNK');
  const ao = first((p) => p.vessel === 'AORTA');
  // veins run toward the heart: their upstream end is outside it
  if (svc) out.SVC = at(svc.pts, 0.2);
  if (ivc) out.IVC = at(ivc.pts, 0.2);
  if (pv) out.PV = at(pv.pts, 0.2);
  if (pa) out.PA = at(pa.pts, 0.3);
  // aorta: the top of the arch (+y = toward the base)
  if (ao) out.AO = ao.pts.reduce((m, p) => (p[1] > m[1] ? p : m), ao.pts[0]);
  return out;
}
