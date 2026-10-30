/**
 * Atrial morphology (DECISION §6.6): the sinus P as two lobes (RA then LA) seen through the atrial lead field (every
 * atrial kernel carries the atrial centroid as its location, far = 1), atrial repolarisation Ta (area −ratio × P area,
 * long and low: Holmqvist 2009), and the AtrialSpec modifiers (RA / LA abnormality, interatrial delay and block,
 * atrial injury → PR-segment depression, flattening). Ectopic / retrograde / wandering sites come from frontsynth on
 * the 7-node atrial graph (synth-rhythm); only 'sinus' is authored here.
 */
import type { AtrialSite, AtrialSpec, Vec3 } from '../api';
import { add, apply, len, lerp, rotateAbout, rotationMatrix, scale, unit } from '../frame';
import { lobeArea, lobeKernel, lobeWithArea, plateauKernel, type Kernel, type Lobe, type Plateau } from '../kernel/kernel';
import { electrodePotentials, render } from '../kernel/render';
import { assemble } from '../leads/assemble';
import { DOWER } from '../leads/dower';
import { STANDARD_HOOKUP } from '../leads/electrodes';
import { ATRIAL_FIELD_LOC } from '../leads/leadfield';
import { areaAxisOf } from '../truth/axis';

export interface AtrialMorph {
  readonly site: AtrialSite;
  /** P lobes, ms relative to the P onset */
  readonly lobes: readonly Lobe[];
  /** atrial repolarisation (Ta), relative to the P onset */
  readonly ta: Lobe | null;
  /** atrial injury current (PR-segment shift), relative to the P onset */
  readonly plateaus: readonly Plateau[];
  /** P onset / offset (2 % edges) relative to the nominal P onset */
  readonly pOn: number;
  readonly pOff: number;
}

/**
 * Calibrated sinus P (prototype B NORMAL_P after its pass-2 atrial lead field, re-tuned in the port: P axis ≈ +50°,
 * II the tallest P, biphasic V1).
 */
export interface SinusPBase {
  readonly ra: { readonly on: number; readonly peak: number; readonly end: number; readonly dir: Vec3; readonly amp: number };
  readonly la: { readonly on: number; readonly peak: number; readonly end: number; readonly dir: Vec3; readonly amp: number };
  readonly ta: { readonly on: number; readonly peak: number; readonly end: number; readonly ratio: number };
}

export const SINUS_P: SinusPBase = {
  ra: { on: 0, peak: 38, end: 72, dir: [0.525, 0.846, 0.098], amp: 0.085 },
  la: { on: 32, peak: 70, end: 104, dir: [0.95, -0.149, 0.275], amp: 0.06 },
  ta: { on: 60, peak: 165, end: 330, ratio: 0.4 },
};

/** Direction of the dilated LA force (Frank: leftward, slightly inferior, posterior), reached at laScale 2.2. */
export const LAE_DIR: Vec3 = unit([0.5, 0.3, 0.95]);

const RA_TAG = [['ra', 1]] as const;
const LA_TAG = [['la', 1]] as const;

/** `base` overrides the calibrated sinus P (calibration scripts only). */
export function buildAtrial(spec: AtrialSpec | undefined, site: AtrialSite = 'sinus', mirror = false, base: SinusPBase = SINUS_P): AtrialMorph {
  const SINUS_P = base;
  if (site !== 'sinus') throw new Error(`src/synth: atrial site '${site}' needs the generated atrial family (frontsynth, not calibrated yet)`);
  const s = spec ?? {};
  const gain = s.gain ?? 1;
  const ra = s.raScale ?? 1, la = s.laScale ?? 1;
  const iab = s.iab ?? 'none';
  // interatrial block: Bachmann's bundle conducts late and slowly → the LA is activated later and over a longer time
  const laDelay = (s.laDelayMs ?? 0) + (iab === 'partial' ? 10 : iab === 'advanced' ? 16 : 0);
  const iabLen = iab === 'none' ? 1 : 1.3;
  const mx = (v: Vec3): Vec3 => (mirror ? [-v[0], v[1], v[2]] : v);
  // RA abnormality: taller RA force turned toward the inferior (P axis > +75°)
  // RA abnormality: the dilated RA lies more anterior and its force turns inferior (P axis > +75°) and anterior (tall
  // initial P in V1–V2)
  const raRot = ra > 1 ? rotateAbout(unit(SINUS_P.ra.dir), [0, 0, 1], Math.min(25, (ra - 1) * 22)) : SINUS_P.ra.dir;
  const raDir: Vec3 = ra > 1 ? unit([raRot[0], raRot[1], raRot[2] - 0.2 * Math.min(2, ra - 1)]) : raRot;
  const raExtra = Math.min(2.5, Math.max(0, ra - 1));
  // LA abnormality: larger, longer and more posterior LA force (wide notched P in II, deep terminal P in V1)
  const laLen = (1 + 0.25 * Math.max(0, la - 1)) * iabLen;
  // (the dilated LA lies posterior and its force keeps an inferior component: deep terminal P in V1 and the second
  // hump of the bifid P in II, P mitrale)
  let laDir: Vec3 = la > 1 ? unit(lerp(SINUS_P.la.dir, LAE_DIR, Math.min(1, (la - 1) / 1.2))) : SINUS_P.la.dir;
  // advanced interatrial block: the LA is activated caudo-cranially → its force turns superior (biphasic inferior P)
  if (iab === 'advanced') laDir = unit([1.2 * laDir[0], -Math.abs(laDir[1]) - 0.8, laDir[2]]);
  // caudo-cranial activation of the whole LA from the coronary-sinus musculature is one large coherent front
  const laGain = 1;
  const loc = mx(ATRIAL_FIELD_LOC);
  const raLobe: Lobe = {
    // the abnormal RA force is peaked (P pulmonale: tall and pointed, not wider; its area — and so its Ta — grows
    // less than its height)
    label: 'RA', on: SINUS_P.ra.on, peak: SINUS_P.ra.peak - 2 * raExtra, end: SINUS_P.ra.end - 5 * raExtra, endRule: 'edge',
    q: ra > 1 ? Math.max(1.5, 2 - 0.2 * (ra - 1)) : 2, dir: mx(raDir), dir2: null,
    amp: SINUS_P.ra.amp * ra * gain, regions: RA_TAG, loc, far: 1, wave: 'P',
  };
  const laOn = SINUS_P.la.on + laDelay;
  const laLobe: Lobe = {
    label: 'LA', on: laOn, peak: laOn + (SINUS_P.la.peak - SINUS_P.la.on) * laLen, end: laOn + (SINUS_P.la.end - SINUS_P.la.on) * laLen,
    endRule: 'edge', q: 2, dir: mx(laDir), dir2: null, amp: SINUS_P.la.amp * la * gain * laGain, regions: LA_TAG, loc, far: 1, wave: 'P',
  };
  const lobes = [raLobe, laLobe];
  const pOff = Math.max(raLobe.end, laLobe.end);
  // Ta: opposite to the P area vector, long and low; it shifts with the P offset
  const pArea = add(lobeArea(raLobe), lobeArea(laLobe));
  const taShift = pOff - 104;
  const ta = len(pArea) > 0
    ? lobeWithArea({
      label: 'Ta', on: SINUS_P.ta.on + taShift, peak: SINUS_P.ta.peak + taShift, end: SINUS_P.ta.end + taShift, endRule: 'edge', q: 2,
      regions: [['ra', 1], ['la', 1]], loc, far: 1, wave: 'Ta',
    }, scale(pArea, -SINUS_P.ta.ratio))
    : null;
  const plateaus: Plateau[] = [];
  if (s.injuryMv && len(pArea) > 0) {
    // atrial injury current (pericarditis, atrial infarction): an exaggerated, sustained atrial repolarisation current of
    // the injured atrial epicardium — like the Ta it points opposite to the P vector, so the PR segment is depressed in
    // the leads with an upright P (II, aVF, V4–V6) and elevated in aVR. It builds up after the P (its decline is hidden
    // in the QRS), so the P keeps its shape and axis. `injuryMv` is the PR depression in lead II (Dower II row).
    const dir = unit(scale(pArea, -1));
    // lead-II gain of the (negative-going) current: −dir · DOWER.II, bounded away from 0 for unusual P axes
    const gainII = Math.max(0.2, -(dir[0] * DOWER.II[0] + dir[1] * DOWER.II[1] + dir[2] * DOWER.II[2]));
    plateaus.push({
      label: 'atrial injury', on: pOff + 20, riseEnd: pOff + 38, fallStart: pOff + 95, end: pOff + 160, dir, amp: s.injuryMv / gainII,
      regions: [['ra', 1], ['la', 1]], loc, far: 1, wave: 'ST',
    });
  }
  return { site, lobes, ta, plateaus, pOn: Math.min(...lobes.map((l) => l.on)), pOff };
}

/**
 * The atrial morphology turned by `deg` about Frank Z (the pAxis dial: a change of the P vector's frontal direction —
 * atrial orientation / exit site within the sinus node area — with the same shape and timing). Only the directions
 * turn; the atrial lead-field location stays.
 */
export function rotateAtrial(m: AtrialMorph, deg: number): AtrialMorph {
  if (deg === 0) return m;
  const R = rotationMatrix(deg);
  const rl = (l: Lobe): Lobe => ({ ...l, dir: apply(R, l.dir), dir2: l.dir2 ? apply(R, l.dir2) : null });
  return { ...m, lobes: m.lobes.map(rl), ta: m.ta ? rl(m.ta) : null, plateaus: m.plateaus.map((p) => ({ ...p, dir: apply(R, p.dir) })) };
}

/** Area P axis (hexaxial °) of one isolated atrial wave, as the truth reads it (atrial-only I and aVF over P on → off). */
export function atrialAreaAxis(m: AtrialMorph, fs: number): number {
  const ks: Kernel[] = m.lobes.map((l) => lobeKernel(l, 0, 0, true));
  if (m.ta) ks.push(lobeKernel(m.ta, 0, 0, true));
  for (const p of m.plateaus) ks.push(plateauKernel(p, 0, 0, true));
  const n = Math.ceil(((m.pOff - m.pOn) * fs) / 1000) + 1;
  const leads = assemble(electrodePotentials(render(ks, fs, n, m.pOn)), STANDARD_HOOKUP);
  return areaAxisOf(leads, [{ a: 0, b: m.pOff - m.pOn }], fs) ?? 0;
}
