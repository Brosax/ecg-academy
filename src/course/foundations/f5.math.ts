import { ELECTRODES, icsY } from '../../figures/data/electrodes';
export const CHEST_ORDER = ['V1', 'V2', 'V4', 'V3', 'V5', 'V6'] as const;
export type ChestElectrode = (typeof CHEST_ORDER)[number];
export type Point = readonly [number, number];
export const torsoPoint = (x: number, y: number): Point => [30 + (x - 100) * 1.4, 60 + (y - 130) * 1.8];
export const targetOf = (id: ChestElectrode): Point => torsoPoint(ELECTRODES[id].x, ELECTRODES[id].y);
export const ribSpace = (n: 2 | 3 | 4 | 5 | 6, x: number): Point => torsoPoint(x, icsY(n, x));
export function placementCorrect(id: ChestElectrode, p: Point): boolean {
  const target = targetOf(id);
  return Math.hypot(p[0] - target[0], p[1] - target[1]) <= 15;
}
export function nearestSite(p: Point): ChestElectrode | null {
  const nearest = [...CHEST_ORDER].sort((a, b) => Math.hypot(p[0] - targetOf(a)[0], p[1] - targetOf(a)[1]) - Math.hypot(p[0] - targetOf(b)[0], p[1] - targetOf(b)[1]))[0];
  return placementCorrect(nearest, p) ? nearest : null;
}
export function gradePlacement(placed: Readonly<Partial<Record<ChestElectrode, Point>>>): readonly ChestElectrode[] {
  return CHEST_ORDER.filter(id => !placed[id] || !placementCorrect(id, placed[id]!));
}
