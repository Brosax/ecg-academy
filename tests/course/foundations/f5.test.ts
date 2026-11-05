import { describe, expect, it } from 'vitest';
import { CHEST_ORDER, gradePlacement, nearestSite, placementCorrect, ribSpace, targetOf, type ChestElectrode, type Point } from '../../../src/course/foundations/f5.math';

describe('foundations electrode placement', () => {
  it('preserves patient right/left, V3 midpoint and the V4–V6 horizontal level', () => {
    expect(targetOf('V1')[0]).toBeLessThan(targetOf('V2')[0]);
    for (const axis of [0, 1] as const) expect(targetOf('V3')[axis]).toBeCloseTo((targetOf('V2')[axis] + targetOf('V4')[axis]) / 2);
    expect(targetOf('V5')[1]).toBe(targetOf('V4')[1]);
    expect(targetOf('V6')[1]).toBe(targetOf('V4')[1]);
  });
  it('rejects placing V1 two spaces too high and distinguishes a wrong label at a valid site', () => {
    expect(placementCorrect('V1', ribSpace(2, 188))).toBe(false);
    expect(placementCorrect('V1', targetOf('V2'))).toBe(false);
    expect(placementCorrect('V4', targetOf('V4'))).toBe(true);
    expect(nearestSite([0, 0])).toBeNull();
  });
  it('checks all six independently, including missing electrodes; no invented signal is produced', () => {
    const placed: Partial<Record<ChestElectrode, Point>> = {};
    expect(gradePlacement(placed)).toHaveLength(6);
    for (const id of CHEST_ORDER) placed[id] = targetOf(id);
    expect(gradePlacement(placed)).toEqual([]);
    placed.V5 = targetOf('V6');
    placed.V6 = targetOf('V5');
    expect(gradePlacement(placed)).toEqual(['V5', 'V6']);
  });
});
