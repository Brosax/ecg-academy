/**
 * Generic sanity criteria (DECISION §8.2): every scenario satisfies these unless it opts out with a reason. They encode
 * the blind judges' recurring complaints (spikes, square shelves, symmetric dome T without an ST segment, QT that jumps
 * between adjacent leads, wandering TP level, T taller than R laterally).
 */
import { STD_LEADS, type StdLead } from '../../../../src/core/leads';
import { tangentEnd } from '../measure';
import { f, fmt, type CriterionCtx, type GenericId } from './types';

const SINUS = new Set(['sinus-rhythm', 'sinus-bradycardia', 'sinus-tachycardia', 'sinus-arrhythmia']);
const IND: readonly StdLead[] = ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
/** adjacent leads: Cabrera limb sequence and the precordial row */
const ADJACENT: readonly (readonly [StdLead, StdLead])[] = [
  ['aVL', 'I'], ['I', 'aVR'], ['aVR', 'II'], ['II', 'aVF'], ['aVF', 'III'],
  ['V1', 'V2'], ['V2', 'V3'], ['V3', 'V4'], ['V4', 'V5'], ['V5', 'V6'],
];

/** The dominant-T lead of the representative beat and its T peak index. */
function dominantT(c: CriterionCtx): { lead: StdLead; peak: number; amp: number } | null {
  const m = c.m;
  const t1 = Math.min(m.median.I.length - 2, m.medianTOff !== null ? m.medianTOff + Math.round(0.12 * c.fs) : m.median.I.length - 2);
  let best: { lead: StdLead; peak: number; amp: number } | null = null;
  for (const l of IND) {
    const e = tangentEnd(m.median[l], m.medianOff + Math.round(0.04 * c.fs), t1, c.fs);
    if (e && (!best || e.amp > best.amp)) best = { lead: l, peak: e.peak, amp: e.amp };
  }
  return best;
}

export const GENERIC: Readonly<Record<GenericId, (c: CriterionCtx) => string | null>> = {
  // no slope-reversal pair < 10 ms apart with > 0.05 mV excursion (needle spikes, fragmentation)
  'no-spikes': (c) => {
    const w = Math.round(0.01 * c.fs);
    const bad: string[] = [];
    for (const l of STD_LEADS) {
      const x = c.leads[l];
      const ext: number[] = [];
      for (let i = 1; i < x.length - 1; i++) if ((x[i] > x[i - 1] && x[i] >= x[i + 1]) || (x[i] < x[i - 1] && x[i] <= x[i + 1])) ext.push(i);
      for (let k = 1; k + 1 < ext.length; k++) {
        const a = ext[k - 1], b = ext[k], d = ext[k + 1];
        // an excursion out and back within 10 ms, each leg > 0.05 mV
        if (d - a <= 2 * w && b - a < w && d - b < w && Math.abs(x[b] - x[a]) > 0.05 && Math.abs(x[d] - x[b]) > 0.05) {
          bad.push(`${l}@${Math.round((b * 1000) / c.fs)}ms`);
          break;
        }
      }
    }
    return bad.length ? `spike / fragment in ${bad.join(', ')}` : null;
  },
  // no sample-to-sample jump > 0.5 mV (pacing stimuli excepted by opt-out)
  'no-jumps': (c) => {
    for (const l of STD_LEADS) {
      const x = c.leads[l];
      for (let i = 1; i < x.length; i++) if (Math.abs(x[i] - x[i - 1]) > 0.5) return `${l}: jump ${fmt(x[i] - x[i - 1])} mV at ${Math.round((i * 1000) / c.fs)} ms`;
    }
    return null;
  },
  // QT dispersion between adjacent leads ≤ 25 ms (tangent end, leads with a clear T ≥ 0.1 mV of the same T wave)
  'qt-dispersion': (c) => {
    const m = c.m;
    const dom = dominantT(c);
    if (!dom) return null;
    const t1 = Math.min(m.median.I.length - 2, m.medianTOff !== null ? m.medianTOff + Math.round(0.12 * c.fs) : m.median.I.length - 2);
    // only adjacent leads whose T has the same polarity: at a T-polarity transition the tangent end is not defined
    const end: Partial<Record<StdLead, number>> = {};
    const sign: Partial<Record<StdLead, number>> = {};
    for (const l of STD_LEADS) {
      const e = tangentEnd(m.median[l], m.medianOff + Math.round(0.04 * c.fs), t1, c.fs);
      if (e && e.amp >= 0.1 && Math.abs(e.peak - dom.peak) <= Math.round(0.1 * c.fs)) {
        end[l] = (e.end * 1000) / c.fs;
        sign[l] = Math.sign(m.median[l][e.peak]);
      }
    }
    const bad = ADJACENT.filter(([a, b]) => end[a] !== undefined && end[b] !== undefined && sign[a] === sign[b] && Math.abs(end[a]! - end[b]!) > 25)
      .map(([a, b]) => `${a}/${b} ${fmt(Math.abs(end[a]! - end[b]!), 0)} ms`);
    return bad.length ? `QT dispersion > 25 ms: ${bad.join(', ')}` : null;
  },
  // TP level within ± 0.05 mV of the PR level: per beat, the TP stretch (previous T end + 40 ms … P onset − 10 ms,
  // ≥ 40 ms) against the beat's PR level; median over beats. No TP stretch (fast rates): not applicable.
  'tp-level': (c) => {
    const m = c.m;
    const hold = (x: number): number => Math.round((x * c.fs) / 1000);
    const per: Partial<Record<StdLead, number[]>> = {};
    for (let k = 1; k < m.beats.length; k++) {
      const b = m.beats[k], p = m.beats[k - 1];
      if (p.tOff === null || b.pOn === null) continue;
      const a = Math.ceil(p.tOff) + hold(40), z = b.pOn - hold(10);
      if (z - a < hold(40)) continue;
      STD_LEADS.forEach((l, li) => {
        let s = 0;
        for (let i = a; i < z; i++) s += c.leads[l][i];
        (per[l] ??= []).push(s / (z - a) - b.base[li]);
      });
    }
    const bad: string[] = [];
    for (const l of STD_LEADS) {
      const v = per[l];
      if (!v || v.length < 3) continue;
      const md = [...v].sort((x, y) => x - y)[v.length >> 1];
      if (Math.abs(md) > 0.05) bad.push(`${l} ${fmt(md, 3)}`);
    }
    return bad.length ? `TP vs PR level > 0.05 mV: ${bad.join(', ')}` : null;
  },
  // T / R < 1 in V5–V6
  't-over-r-v5v6': (c) => {
    const bad = (['V5', 'V6'] as const).filter((l) => Math.abs(f(c, l).t) >= Math.max(f(c, l).r, f(c, l).r2));
    return bad.length ? `T ≥ R in ${bad.map((l) => `${l} (T ${fmt(f(c, l).t)} R ${fmt(f(c, l).r)})`).join(', ')}` : null;
  },
  // at least one limb lead with QRS ≥ 0.5 mV peak to peak
  'limb-voltage': (c) => {
    const mx = Math.max(...(['I', 'II', 'III', 'aVR', 'aVL', 'aVF'] as const).map((l) => f(c, l).p2p));
    return mx >= 0.5 ? null : `largest limb-lead QRS ${fmt(mx)} mV p2p`;
  },
  // P present and sinus-shaped when the rhythm is sinus (criteria.md `p-wave-normal`: axis 0…+75, upright in II)
  'sinus-p': (c) => {
    if (!c.def.findings.some((x) => SINUS.has(x))) return null;
    const m = c.m;
    if (m.medianPOn === null || m.pAxisDeg === null) return 'no P wave on the representative beat';
    if (m.pAxisDeg < 0 || m.pAxisDeg > 75) return `P axis ${fmt(m.pAxisDeg, 0)}° outside 0…+75°`;
    if (f(c, 'II').p < 0.05) return `P in II ${fmt(f(c, 'II').p)} mV (not upright)`;
    return null;
  },
  // an ST segment exists at rates < 100: in the dominant-T lead the T reaches 10 % of its amplitude ≥ 60 ms after J
  'st-segment': (c) => {
    if (c.m.hrBpm >= 100) return null;
    const dom = dominantT(c);
    if (!dom) return null;
    const x = c.m.median[dom.lead];
    const j = c.m.medianOff;
    const xj = x[j];
    const amp = x[dom.peak] - xj;
    let i = dom.peak;
    while (i > j && Math.abs(x[i] - xj) > 0.1 * Math.abs(amp)) i--;
    const st = ((i - j) * 1000) / c.fs;
    return st >= 60 ? null : `T leaves the J level ${fmt(st, 0)} ms after J in ${dom.lead} (needs ≥ 60)`;
  },
  // a normal T is asymmetric: rise / fall (half-amplitude durations) ≥ 1.2 in the dominant-T lead
  't-asymmetry': (c) => {
    const dom = dominantT(c);
    if (!dom) return null;
    const a = f(c, dom.lead).tAsym;
    return a >= 1.2 ? null : `T rise/fall ${fmt(a)} in ${dom.lead} (needs ≥ 1.2)`;
  },
};
