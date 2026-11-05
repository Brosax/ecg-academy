import { sampleAt, type Ecg } from '../../core/ecg';
import { CHEST_LEADS, LIMB_LEADS } from '../../core/leads';
import { leadsOfPotentials, LEAD_POLES, type Electrode, type LimbLead } from '../../figures/scenes/triangle-to-wheel.math';
import { computeSource } from '../../figures/scenes/chest-ring.math';
import { DEFAULT_HORIZONTAL_DEG } from '../../figures/math/projection';

export const TRIANGLE: Readonly<Record<Electrode, readonly [number, number]>> = {
  RA: [220 - 110 * Math.sqrt(3) / 2, 105], LA: [220 + 110 * Math.sqrt(3) / 2, 105], LL: [220, 270],
};

/** Translate the entire electrode-difference vector; never rotate it into a different lead. */
export function leadGeometry(lead: LimbLead, slide: number) {
  const poles = LEAD_POLES[lead];
  const head = TRIANGLE[poles.pos];
  const tail: [number, number] = [0, 0];
  for (const e of poles.neg) {
    tail[0] += TRIANGLE[e][0] / poles.neg.length;
    tail[1] += TRIANGLE[e][1] / poles.neg.length;
  }
  const dx = (220 - (head[0] + tail[0]) / 2) * slide;
  const dy = (160 - (head[1] + tail[1]) / 2) * slide;
  return { x1: tail[0] + dx, y1: tail[1] + dy, x2: head[0] + dx, y2: head[1] + dy };
}

/** Recover a common set of electrode potentials from the model's I and II. */
export function limbWindow(ecg: Ecg | undefined, count = 241) {
  if (!ecg) return null;
  const beats = ecg.truth?.beats ?? [];
  const beat = beats[Math.min(2, beats.length - 1)];
  const from = beat ? Math.max(0, (beat.pOn ?? beat.qrsOn - 180) - 70) : 0;
  const to = beat ? Math.min(ecg.signal.durationMs, beat.tOff + 90) : Math.min(800, ecg.signal.durationMs);
  const phi = { RA: [] as number[], LA: [] as number[], LL: [] as number[] };
  const leads = Object.fromEntries(LIMB_LEADS.map(k => [k, [] as number[]])) as Record<LimbLead, number[]>;
  for (let i = 0; i < count; i++) {
    const t = from + (to - from) * i / (count - 1);
    const I = sampleAt(ecg.signal.leads.I, ecg.signal.fs, t);
    const II = sampleAt(ecg.signal.leads.II, ecg.signal.fs, t);
    const RA = -(I + II) / 3;
    const p = { RA, LA: RA + I, LL: RA + II };
    const v = leadsOfPotentials(p);
    for (const e of ['RA', 'LA', 'LL'] as const) phi[e].push(p[e]);
    for (const lead of LIMB_LEADS) leads[lead].push(v[lead]);
  }
  const max = Math.max(0.2, ...LIMB_LEADS.flatMap(k => leads[k].map(Math.abs)));
  return { from, to, phi, leads, max };
}

/** The chest example is explicitly schematic: a single horizontal loop, all leads against WCT. */
export const CHEST_SOURCE = computeSource(DEFAULT_HORIZONTAL_DEG);
export const CHEST_CHOICES = CHEST_LEADS;
export const isPairCorrect = (lead: string): boolean => lead === 'II';
export const isSumCorrect = (lead: string): boolean => lead === 'II';
export const isAxisCorrect = (lead: string): boolean => lead === 'aVF';
export const isReferenceCorrect = (choice: string): boolean => choice === 'average';
export const isChestPredictionCorrect = (choice: string): boolean => choice === 'different';
