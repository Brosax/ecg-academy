/**
 * Hallmark criteria, group 'av-block' (DECISION §9.5; synth-rhythm M3). Every criterion reads the oracle's measurement
 * and the delivered signal only (rhythm readers: tests/synth/rhythm/readers.ts): the P onset the oracle finds before
 * each complex (PR sequences), the P waves of the QRST-subtracted residual (non-conducted and dissociated P waves) and
 * the averaged beat (a blocked P that is phase-locked to the QRS, as in 2:1 block, is part of it). Thresholds: the
 * criteria.md rows named in `source`.
 */
import type { StdLead } from '../../../../src/core/leads';
import { beatsMs, beatWidth, f0, f2, median, pPeaks, pPolarity, type RBeat } from '../../rhythm/readers';
import { cycle, humps } from './atrial';
import { crit, fmt, type CriterionCtx, type ScenarioCriteria } from './types';

/** P waves of the residual with a sinus-like upright deflection in II (≥ 0.05 mV), from 400 ms on. */
const sinusP = (c: CriterionCtx): number[] => pPeaks(c).filter((p) => p >= 400 && pPolarity(c, 'II', p) >= 0.05);
/** Atrial cycle from the residual P waves: the median interval between consecutive P waves shorter than 1.5 × the
 *  shortest one (P waves hidden in a QRS leave double intervals out). */
function ppCycle(c: CriterionCtx): number {
  const ps = sinusP(c);
  const pp = ps.slice(1).map((p, i) => p - ps[i]);
  const lo = Math.min(...pp);
  return median(pp.filter((x) => x < 1.5 * lo));
}
/** Groups of conducted complexes separated by pauses (RR > 1.4 × the shortest RR). */
function groups(c: CriterionCtx): RBeat[][] {
  const b = beatsMs(c);
  const rr = b.map((x) => x.rrPre).filter((x): x is number => x !== null);
  const lo = Math.min(...rr);
  const out: RBeat[][] = [];
  let cur: RBeat[] = [];
  for (const x of b) {
    if (x.rrPre !== null && x.rrPre > 1.4 * lo && cur.length) {
      out.push(cur);
      cur = [];
    }
    cur.push(x);
  }
  if (cur.length) out.push(cur);
  return out;
}
const prRange = (bs: readonly RBeat[]): number => {
  const prs = bs.map((b) => b.pr).filter((x): x is number => x !== null);
  return prs.length ? Math.max(...prs) - Math.min(...prs) : NaN;
};
/** A P on the averaged beat half a cycle after the QRS-conducted one (a blocked P phase-locked at 2:1). */
function midwayP(c: CriterionCtx): { lead: StdLead | null; at: number } {
  const at = cycle(c) / 2 - (c.m.prMs ?? 0) + 45;
  const lead = (['II', 'aVF', 'I'] as const).find((l) => humps(c, l, at - 40, at + 40, 0.03) >= 1) ?? null;
  return { lead, at };
}
const narrow = (c: CriterionCtx): number => median(beatsMs(c).map((b) => beatWidth(c, b)));
/** Height of the largest upright P-like hump in II within a window (ms): peak minus the lower of the window's two ends. */
function uprightIn(c: CriterionCtx, a: number, z: number): number {
  const x = c.leads.II;
  const i0 = Math.max(0, Math.round((a * c.fs) / 1000)), i1 = Math.min(x.length - 1, Math.round((z * c.fs) / 1000));
  let pk = -Infinity;
  for (let i = i0; i <= i1; i++) pk = Math.max(pk, x[i]);
  return pk - Math.min(x[i0], x[i1]);
}
/** ≥ 80 % of the PRs within ± tol of their median (a P search can misplace a P onset on a large T). */
const prConstant = (bs: readonly RBeat[], tol: number): [boolean, string] => {
  const prs = bs.map((b) => b.pr).filter((x): x is number => x !== null);
  const m = median(prs);
  const near = prs.filter((x) => Math.abs(x - m) <= tol).length;
  return [prs.length >= 2 && near >= 0.8 * prs.length, `${near}/${prs.length} PRs within ± ${tol} ms of ${f0(m)}`];
};

export const AV_BLOCK_CRITERIA: Readonly<Record<string, ScenarioCriteria>> = {
  'av-block-1': {
    hallmarks: [
      crit('PR > 200 ms', 'first-degree-avb', (c) => [c.m.prMs !== null && c.m.prMs > 200, `PR ${fmt(c.m.prMs, 0)}`]),
      crit('constant PR (± 10 ms) and every P conducted (a P before every complex, regular rhythm)', 'first-degree-avb', (c) => {
        const b = beatsMs(c).filter((x) => x.on > 400);
        const withP = b.filter((x) => x.pr !== null).length;
        return [withP === b.length && prRange(b) <= 20 && c.m.rrCv < 0.05, `${withP}/${b.length} with P, PR range ${f0(prRange(b))} ms, RR CV ${fmt(100 * c.m.rrCv, 1)} %`];
      }),
    ],
  },
  'av-block-2-mobitz1': {
    hallmarks: [
      crit('groups of n − 1 conducted beats (4:3; variants 3:2, 5:4) separated by a blocked P', 'mobitz-i; fixed-variable-advanced-avb', (c) => {
        const want = c.variant === '3to2' ? 2 : c.variant === '5to4' ? 4 : 3;
        const g = groups(c).slice(1, -1);
        return [g.length >= 1 && g.every((x) => x.length === want), `inner group sizes ${g.map((x) => x.length).join(', ') || 'none'} (want ${want})`];
      }),
      crit('PR lengthens within each group, the largest increment after the first beat; the first PR after the pause is the shortest', 'mobitz-i; wenckebach-arithmetic', (c) => {
        const bad: string[] = [];
        for (const g of groups(c).slice(1)) {
          const prs = g.map((b) => b.pr);
          if (prs.some((x) => x === null) || g.length < 2) continue;
          const p = prs as number[];
          const inc = p.slice(1).map((x, i) => x - p[i]);
          if (inc.some((d) => d <= 5) || inc.slice(1).some((d, i) => d > inc[i])) bad.push(p.map(f0).join('→'));
        }
        return [bad.length === 0 && groups(c).length >= 2, bad.length ? `PR sequences ${bad.join('; ')}` : 'no group'];
      }),
      crit('RR shortens before the pause; pause < 2 P–P (typical Wenckebach)', 'mobitz-i; wenckebach-arithmetic', (c) => {
        const pp = ppCycle(c);
        const bad: string[] = [];
        const gs = groups(c);
        gs.slice(1).forEach((g) => {
          const pause = g[0].rrPre as number;
          if (pause >= 2 * pp) bad.push(`pause ${f0(pause)} ≥ 2 × ${f0(pp)}`);
        });
        for (const g of gs.slice(1, -1)) {
          const rr = g.slice(1).map((b) => b.rrPre as number);
          if (rr.length >= 2 && !(rr[rr.length - 1] < rr[0])) bad.push(`RR ${rr.map(f0).join(' ')} not shortening`);
        }
        return [bad.length === 0, bad.join('; ')];
      }),
      crit('a P wave without a QRS in each pause (an upright P ≥ 0.05 mV in II between the T and the next conducted P)', 'mobitz-i', (c) => {
        const gs = groups(c);
        const missing = gs.slice(1).filter((g) => {
          const prev = c.m.beats[g[0].i - 1];
          if (!prev || g[0].pOn === null) return false;
          const a = (((prev.tOff ?? prev.qrsOn + 0.45 * c.fs) * 1000) / c.fs) + 30, z = g[0].pOn - 60;
          return !(z - a > 60 && uprightIn(c, a, z) >= 0.05);
        });
        return [missing.length === 0, `${missing.length} of ${gs.length - 1} pauses without a blocked P`];
      }),
    ],
    optOut: { 'sinus-p': 'the PR varies beat to beat: the averaged beat has no single P (P waves are read per beat)' },
  },
  'av-block-2-mobitz2': {
    hallmarks: [
      // ± 7 ms (the textbook "constant PR" is exact in the model: truth PR 160 on every conducted beat): the beat after a
      // pause has a longer QT, and the tail of its RBBB secondary T (≈ 0.01 mV, decaying) still runs into the next P, so
      // the oracle's P-onset detector, referenced to the level before it, finds that one P onset 5–10 ms late (seed 3:
      // two PRs of 150 against 156)
      crit('constant PR (± 7 ms) before and after the blocked P', 'mobitz-ii', (c) => prConstant(beatsMs(c).filter((x) => x.on > 400), 7)),
      crit('the pause is two P–P cycles (± 40 ms)', 'mobitz-ii', (c) => {
        const b = beatsMs(c);
        const rr = b.map((x) => x.rrPre).filter((x): x is number => x !== null);
        const pp = median(rr.filter((x) => x < 1.4 * Math.min(...rr)));
        const pauses = rr.filter((x) => x >= 1.4 * Math.min(...rr));
        return [pauses.length >= 1 && pauses.every((x) => Math.abs(x - 2 * pp) <= 40), `pauses ${pauses.map(f0).join(', ')} vs 2 × ${f0(pp)}`];
      }),
      crit('wide QRS (≥ 120 ms): infranodal block with a bundle-branch block', 'mobitz-ii; escape-site', (c) => [c.m.qrsMs >= 120, `QRS ${fmt(c.m.qrsMs, 0)}`]),
    ],
    optOut: { 't-asymmetry': 'secondary T of the bundle-branch block', 'st-segment': 'secondary ST-T of the bundle-branch block', 'tp-level': 'LBBB variant: the large secondary T reaches into the TP stretch' },
  },
  'av-block-2-2to1': {
    hallmarks: [
      crit('regular rhythm with a constant PR', 'fixed-variable-advanced-avb', (c) => {
        const b = beatsMs(c).filter((x) => x.on > 400);
        return [c.m.rrCv < 0.03 && prRange(b) <= 15, `RR CV ${fmt(100 * c.m.rrCv, 1)} %, PR range ${f0(prRange(b))} ms`];
      }),
      crit('every second P blocked: a P half a cycle after each conducted one (atrial rate = 2 × ventricular)', 'fixed-variable-advanced-avb', (c) => {
        const m = midwayP(c);
        return [m.lead !== null, `blocked P at QRS + ${f0(m.at)} ms: ${m.lead ?? 'not found'}`];
      }),
      crit('nodal: narrow QRS; infra-His variant: wide QRS (≥ 120 ms)', 'fixed-variable-advanced-avb; escape-site', (c) => {
        return [c.variant === 'infra-his' ? c.m.qrsMs >= 120 : c.m.qrsMs < 110, `QRS ${fmt(c.m.qrsMs, 0)}`];
      }),
    ],
    optOut: { 't-asymmetry': 'infra-His variant: secondary T', 'st-segment': 'infra-His variant: secondary ST-T' },
  },
  'av-block-high-grade': {
    hallmarks: [
      crit('≥ 2 consecutive P waves blocked: RR ≈ 3 P–P (3:1)', 'fixed-variable-advanced-avb', (c) => {
        const k = cycle(c) / ppCycle(c);
        return [Math.abs(k - Math.round(k)) <= 0.15 && Math.round(k) >= 3, `RR / P–P = ${f2(k)}`];
      }),
      crit('the conducted beats have a constant PR (± 10 ms)', 'fixed-variable-advanced-avb', (c) => {
        const b = beatsMs(c).filter((x) => x.on > 400);
        return [b.every((x) => x.pr !== null) && prRange(b) <= 20, `PR range ${f0(prRange(b))} ms`];
      }),
    ],
  },
  'av-block-3': {
    hallmarks: [
      crit('regular P waves and regular complexes, atrial rate > ventricular rate', 'complete-avb', (c) => {
        const atrial = 60000 / ppCycle(c);
        return [c.m.rrCv < 0.03 && atrial > c.m.hrBpm + 10, `atrial ${f0(atrial)} /min, ventricular ${fmt(c.m.hrBpm, 0)} /min, RR CV ${fmt(100 * c.m.rrCv, 1)} %`];
      }),
      crit('no conduction: the P–QRS relation varies (PR range > 80 ms where a P precedes the complex)', 'complete-avb; av-dissociation', (c) => {
        const b = beatsMs(c);
        const prs = b.map((x) => x.pr).filter((x): x is number => x !== null);
        const without = b.length - prs.length;
        return [without >= 2 || (prs.length >= 2 && Math.max(...prs) - Math.min(...prs) > 80), `PR ${prs.map(f0).join(', ')}; ${without} complexes without a P`];
      }),
      crit('nodal block: narrow junctional escape 40–60 /min; infra-His: wide ventricular escape 20–40 /min', 'escape-site', (c) => {
        const r = c.m.hrBpm, w = narrow(c);
        if (c.variant === 'infra-his') return [r >= 20 && r <= 40 && w >= 120, `escape ${fmt(r, 0)} /min, ${f0(w)} ms`];
        return [r >= 40 && r <= 60 && w < 110, `escape ${fmt(r, 0)} /min, ${f0(w)} ms`];
      }),
    ],
    optOut: { 'sinus-p': 'complete AV block: the P waves do not conduct', 't-over-r-v5v6': 'infra-His variant: QS of the ventricular escape in V5–V6', 't-asymmetry': 'infra-His variant: secondary T' },
  },
  'av-dissociation': {
    hallmarks: [
      crit('accelerated junctional rhythm: narrow, 61–100 /min, ventricular rate ≥ atrial rate', 'av-dissociation; junctional-rhythm', (c) => {
        const r = c.m.hrBpm;
        return [r > 60 && r <= 100 && narrow(c) < 110, `rate ${fmt(r, 0)}, ${f0(narrow(c))} ms`];
      }),
      crit('the P–QRS relation drifts (P waves at different PR, or hidden in the QRS)', 'av-dissociation', (c) => {
        const b = beatsMs(c);
        const prs = b.map((x) => x.pr).filter((x): x is number => x !== null);
        const without = b.length - prs.length;
        const drift = prs.length >= 2 ? Math.max(...prs) - Math.min(...prs) : 0;
        return [without >= 2 && (drift >= 30 || prs.length <= 1 || without >= b.length / 2), `PR ${prs.map(f0).join(', ')}; ${without} complexes without a P`];
      }),
    ],
    optOut: { 'sinus-p': 'AV dissociation: the P waves drift through the QRS' },
  },
};
