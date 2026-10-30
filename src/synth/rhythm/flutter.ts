/**
 * Atrial flutter circuits (DECISION §6.6). Typical counter-clockwise flutter: one macro-re-entrant cycle around the
 * tricuspid annulus as four overlapping lobes — slow conduction through the cavotricuspid isthmus (a gentle superior
 * drift, the "plateau" of the sawtooth), fast caudo-cranial septal ascent with LA activation (superior force → the sharp
 * negative deflection in II, III, aVF), RA roof / anterior wall (anterior → the discrete positive wave in V1), lateral
 * wall descent (inferior → the fast return). Each cycle also carries its own atrial repolarisation: one broad lobe whose
 * area is −taRatio × the cycle's depolarisation area, so the F train is zero-mean as a real recorder shows it.
 * Provenance: prototype B FLUTTER (review pass 1; `taRatio` 1), authored at a 200 ms cycle and scaled to `cycleMs`.
 * Clockwise flutter is the same circuit run backwards: every segment's propagation (dipole) is reversed and the order
 * inverted, so the inferior F waves turn positive and V1 broad negative (Saoudi N et al., Eur Heart J 2001). Left-atrial
 * (perimitral) flutter: a left-atrial loop with smaller, broader F waves, positive in V1, flat or negative in I and
 * aVL (Bochoeyer A et al., Circulation 2003); authored, not calibrated on PTB-XL (no class with enough records).
 */
import type { Vec3 } from '../api';
import { add, scale } from '../frame';
import { lobeArea, lobeWithArea, type Lobe } from '../kernel/kernel';

const CCW: readonly { label: string; on: number; peak: number; end: number; dir: Vec3; amp: number; region: 'ra' | 'la' }[] = [
  { label: 'cavotricuspid isthmus (slow)', on: 0, peak: 85, end: 118, dir: [0.1, -0.9, 0.4], amp: 0.09, region: 'ra' },
  { label: 'septal ascent + LA', on: 78, peak: 114, end: 138, dir: [0.3, -0.95, -0.05], amp: 0.26, region: 'la' },
  { label: 'RA roof / anterior wall', on: 100, peak: 135, end: 165, dir: [-0.35, -0.2, -0.92], amp: 0.15, region: 'ra' },
  { label: 'lateral RA descent', on: 122, peak: 150, end: 218, dir: [-0.2, 0.95, -0.2], amp: 0.085, region: 'ra' },
];
/** Perimitral (left-atrial) flutter loop, authored at a 220 ms cycle. */
const LA_LOOP: typeof CCW = [
  { label: 'LA lateral wall (mitral annulus, posterior → lateral)', on: 0, peak: 62, end: 112, dir: [0.85, 0.3, 0.42], amp: 0.11, region: 'la' },
  { label: 'LA anterior wall (lateral → septal)', on: 78, peak: 128, end: 176, dir: [-0.25, -0.35, -0.9], amp: 0.12, region: 'la' },
  { label: 'septal / RA passive activation', on: 140, peak: 176, end: 228, dir: [-0.65, 0.55, 0.1], amp: 0.07, region: 'ra' },
];
const TA_RATIO = 1;

export interface FlutterCycle {
  /** depolarisation lobes, relative to the cycle start (the isthmus onset) */
  readonly lobes: readonly Lobe[];
  /** per-cycle atrial repolarisation (spans ≈ 2 cycles, so consecutive ones overlap into an almost flat level) */
  readonly ta: Lobe;
}

export function flutterCycle(circuit: 'ccw' | 'cw' | 'la', cycleMs: number, mirror = false): FlutterCycle {
  const ref = circuit === 'la' ? 220 : 200;
  const k = cycleMs / ref;
  const mx = (v: Vec3): Vec3 => (mirror ? [-v[0], v[1], v[2]] : v);
  // clockwise: the CCW loop reversed in time with every segment's propagation reversed
  const loop = circuit === 'ccw' ? CCW : circuit === 'la' ? LA_LOOP : CCW.map((c) => ({ ...c, on: ref - c.end, peak: ref - c.peak, end: ref - c.on, dir: [-c.dir[0], -c.dir[1], -c.dir[2]] as Vec3 })).reverse();
  const lobes: Lobe[] = loop.map((c) => ({
    label: c.label, on: c.on * k, peak: c.peak * k, end: c.end * k, endRule: 'edge', q: 2, dir: mx(c.dir), dir2: null,
    amp: c.amp, regions: [[c.region, 1]], loc: null, far: 1, wave: 'F',
  }));
  const area = lobes.reduce<Vec3>((s, l) => add(s, lobeArea(l)), [0, 0, 0]);
  const ta = lobeWithArea({ label: 'Ta (flutter)', on: 0, peak: cycleMs, end: 2 * cycleMs, endRule: 'edge', q: 2, regions: [['ra', 1], ['la', 1]], loc: null, far: 1, wave: 'Ta' }, scale(area, -TA_RATIO));
  return { lobes, ta };
}
