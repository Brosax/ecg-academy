/**
 * Resolution of authoring units (LobeSpec / PlateauSpec from api.ts) into resolved lobes: defaults filled, the
 * near-field location resolved ('regions' → mass-free weighted centroid of the tagged regions; 'none' → no location).
 */
import type { LobeSpec, PlateauSpec, RegionWeights, Vec3 } from '../api';
import { weightedCentroid } from '../heart/anatomy';
import type { Lobe, Plateau, Wave } from '../kernel/kernel';

export function resolveLoc(loc: Vec3 | 'regions' | 'none' | undefined, regions: RegionWeights, dflt: 'regions' | 'none'): Vec3 | null {
  const l = loc ?? dflt;
  if (l === 'none') return null;
  if (l === 'regions') return weightedCentroid(regions);
  return l;
}

export function resolveLobe(s: LobeSpec, wave: Wave, dfltLoc: 'regions' | 'none'): Lobe {
  return {
    label: s.label, on: s.on, peak: s.peak, end: s.end, endRule: s.endRule ?? 'edge', q: s.q ?? 2,
    dir: s.dir, dir2: s.dir2 ?? null, amp: s.amp, regions: s.regions,
    loc: resolveLoc(s.loc, s.regions, dfltLoc), far: s.far ?? 1, wave,
  };
}

export function resolvePlateau(s: PlateauSpec, wave: Wave, dfltLoc: 'regions' | 'none'): Plateau {
  return {
    label: s.label, on: s.on, riseEnd: s.riseEnd, fallStart: s.fallStart, end: s.end, dir: s.dir, amp: s.amp,
    regions: s.regions, loc: resolveLoc(s.loc, s.regions, dfltLoc), far: s.far ?? 1, wave,
  };
}
