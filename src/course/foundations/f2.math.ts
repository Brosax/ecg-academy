import { LIMB_ANGLE_DEG, LIMB_LEADS, type StdLead } from '../../core/leads';
import { frontalQrsLoop, horizontalQrsLoop, PRECORDIAL_DEG, PRECORDIAL_GAIN, projectLoop } from '../../figures/math/projection';

export type Limb = (typeof LIMB_LEADS)[number];
export const projection = (angle: number, lead: Limb): number => Math.cos((angle - LIMB_ANGLE_DEG[lead]) * Math.PI / 180) * (lead.startsWith('a') ? Math.sqrt(3) / 2 : 1);
/** Exact electrode-potential algebra, rather than independently scaled augmented axes. */
export function limbValues(x: number, y: number): Record<Limb, number> {
  const I = x, II = x / 2 + Math.sqrt(3) * y / 2;
  return { I, II, III: II - I, aVR: -(I + II) / 2, aVL: I - II / 2, aVF: II - I / 2 };
}
export function limbTraces(angle: number): Record<Limb, number[]> {
  const points = frontalQrsLoop(angle, 180);
  return Object.fromEntries(LIMB_LEADS.map(lead => [lead, points.map(([x, y]) => limbValues(x, y)[lead])])) as Record<Limb, number[]>;
}
export function chestTraces(): { V1: number[]; V6: number[] } {
  const source = horizontalQrsLoop(40, 180);
  return { V1: projectLoop(source, PRECORDIAL_DEG.V1).map(x => x * PRECORDIAL_GAIN.V1), V6: projectLoop(source, PRECORDIAL_DEG.V6).map(x => x * PRECORDIAL_GAIN.V6) };
}
export const projectionKind = (v: number): 'positive' | 'zero' | 'negative' => Math.abs(v) < .08 ? 'zero' : v > 0 ? 'positive' : 'negative';
