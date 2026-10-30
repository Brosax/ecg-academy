/**
 * Natural per-instance variability (DECISION §7 rule 3): applied to the model before truth is computed, so two normals
 * are never identical and the answer key stays exact. Lobe amplitude ±8 %, timing ±3 ms, direction ±6°; the gradient
 * (T) and the P lobes likewise. Seeded (one fork per element), bounded (truncated normal).
 */
import type { Rng } from '../../core/rng';
import type { Vec3 } from '../api';
import { cross, len, rotateAbout, scale, unit } from '../frame';
import type { Lobe } from '../kernel/kernel';

const trunc = (r: Rng, sd: number, lim: number): number => Math.max(-lim, Math.min(lim, r.normal(0, sd)));

function randomAxis(r: Rng, about: Vec3): Vec3 {
  // an axis perpendicular to `about` (so the direction turns by the drawn angle)
  const v: Vec3 = [r.normal(), r.normal(), r.normal()];
  const c = cross(about, v);
  return len(c) > 1e-9 ? unit(c) : [0, 0, 1];
}

export interface JitterScale {
  readonly amp: number;
  readonly timeMs: number;
  readonly dirDeg: number;
}
export const NATURAL: JitterScale = { amp: 0.08, timeMs: 3, dirDeg: 6 };

export function jitterLobe(rng: Rng, s: JitterScale = NATURAL): (l: Lobe, i: number) => Lobe {
  return (l, i) => {
    const r = rng.fork(`lobe:${i}`);
    const k = 1 + trunc(r, s.amp / 2, s.amp);
    const dt = trunc(r, s.timeMs / 2, s.timeMs);
    const d = unit(l.dir);
    const ang = trunc(r, s.dirDeg / 2, s.dirDeg);
    const ax = randomAxis(r, d);
    const nd = rotateAbout(d, ax, ang);
    // the first lobe keeps its onset at 0 (the QRS / P onset reference); later lobes shift as a whole
    const shift = i === 0 ? 0 : dt;
    const widen = i === 0 ? dt / 2 : 0;
    return {
      ...l, amp: l.amp * k, on: l.on + shift, peak: l.peak + shift + widen / 2, end: l.end + shift + widen,
      dir: nd, dir2: l.dir2 ? rotateAbout(unit(l.dir2), ax, ang) : null,
    };
  };
}

export function jitterVector(rng: Rng, s: JitterScale = NATURAL): (g: Vec3) => Vec3 {
  return (g) => {
    const r = rng.fork('vector');
    const k = 1 + trunc(r, s.amp / 2, s.amp);
    const d = unit(g);
    return scale(rotateAbout(d, randomAxis(r, d), trunc(r, s.dirDeg / 2, s.dirDeg)), len(g) * k);
  };
}
