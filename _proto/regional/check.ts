/**
 * Self-check. For every condition: (1) the limb-lead identities hold sample by sample; (2) intervals / axis / rate
 * measured from the signals alone (measure.ts: slope-energy QRS detection, global QRS on/off, tangent T end, P onset,
 * net-area frontal axis) agree with the model's truth; (3) the textbook criteria of the benchmark are measured on the
 * signals (amplitudes in mm at 10 mm/mV, durations in ms) and reported pass / fail.
 * Usage: node check.ts [id ...]        (generates in memory; reads nothing from disk)
 */
import { generate } from './synth.ts';
import { BENCHMARK_IDS } from './conditions.ts';
import { LEADS } from './leadfield.ts';
import type { LeadName } from './leadfield.ts';
import { detectBeats, leadAmplitudes, qrsAxis } from './measure.ts';
import type { LeadAmp, MeasuredBeat } from './measure.ts';

const ids = process.argv.length > 2 ? process.argv.slice(2) : BENCHMARK_IDS;
const fs = 500;
const mm = (v: number) => (v * 10).toFixed(1).padStart(6);
let failures = 0;
let critFail = 0;
const summary: string[] = [];

type Leads = Record<LeadName, Float32Array>;
interface Ctx { L: Leads; m: MeasuredBeat; amp: Record<LeadName, LeadAmp>; beats: MeasuredBeat[]; truth: ReturnType<typeof generate>['truth'] }
/** amplitude of a lead feature in mm (10 mm/mV) */
const A = (c: Ctx, l: string, k: 'q' | 'r' | 's' | 'j' | 'st60' | 't' | 'p'): number => c.amp[l as LeadName][k] * 10;

const I = (t: number) => Math.round((t * fs) / 1000);
/** value of a lead (mm) at time t (ms) relative to the PR/TQ baseline (mean of the 20 ms before QRS onset) */
function at(c: Ctx, l: LeadName, t: number): number {
  const x = c.L[l];
  let b = 0;
  for (let i = I(c.m.qrsOn - 20); i < I(c.m.qrsOn); i++) b += x[i];
  b /= I(20);
  return (x[I(t)] - b) * 10;
}
/** positive / negative extrema (mm) inside the QRS of one lead, in time order, with a minimum prominence */
function qrsExtrema(c: Ctx, l: LeadName, prom = 1): { t: number; v: number }[] {
  const out: { t: number; v: number }[] = [];
  const a = I(c.m.qrsOn), z = I(c.m.qrsOff);
  const v = (i: number) => at(c, l, (i * 1000) / fs);
  for (let i = a + 1; i < z; i++) {
    const y = v(i);
    if ((y > v(i - 1) && y >= v(i + 1)) || (y < v(i - 1) && y <= v(i + 1))) {
      if (out.length && Math.abs(y - out[out.length - 1].v) < prom) continue;
      out.push({ t: (i * 1000) / fs - c.m.qrsOn, v: y });
    }
  }
  return out;
}
/** T-wave asymmetry: rise time / fall time around the T peak of a lead (half-amplitude points) */
function tSymmetry(c: Ctx, l: LeadName): number {
  const a = I(c.m.qrsOff + 60), z = I(Math.min(c.m.tOff + 40, c.m.qrsOn + 700));
  const x = (i: number) => at(c, l, (i * 1000) / fs);
  let pk = a;
  for (let i = a; i < z; i++) if (Math.abs(x(i)) > Math.abs(x(pk))) pk = i;
  const h = x(pk) / 2;
  let i0 = pk, i1 = pk;
  while (i0 > a && Math.abs(x(i0)) > Math.abs(h)) i0--;
  while (i1 < z && Math.abs(x(i1)) > Math.abs(h)) i1++;
  return (pk - i0) / Math.max(1, i1 - pk);
}

/**
 * Notches / extra humps of the ST-T of one lead (review): zigzag extrema (reversals ≥ 0.3 mm) between J+30 and T end +
 * 80 ms whose |v| ≥ 15 % of the largest ST-T deflection; one extremum per lobe of alternating sign is the T wave itself
 * (monophasic or biphasic), every further same-sign extremum is a notch or a separate hump.
 */
function tNotches(c: Ctx, l: LeadName): number {
  const a = c.m.qrsOff + 30, z = c.m.tOff + 80;
  const v = (t: number) => at(c, l, t);
  let big = 0;
  for (let t = a; t < z; t += 2) if (Math.abs(v(t)) > Math.abs(big)) big = v(t);
  const ext: number[] = [];
  let lastY = v(a), dir = 0;
  for (let t = a + 2; t < z; t += 2) {
    const y = v(t);
    if (dir >= 0 && y < lastY - 0.3) { if (dir > 0) ext.push(lastY); dir = -1; lastY = y; }
    else if (dir <= 0 && y > lastY + 0.3) { if (dir < 0) ext.push(lastY); dir = 1; lastY = y; }
    else if ((dir > 0 && y > lastY) || (dir < 0 && y < lastY)) lastY = y;
  }
  const sig = ext.filter((y) => Math.abs(y) >= 0.15 * Math.abs(big));
  let changes = 0;
  for (let i = 1; i < sig.length; i++) if (Math.sign(sig[i]) !== Math.sign(sig[i - 1])) changes++;
  return Math.max(0, sig.length - 1 - changes);
}

/** largest positive deflection (mm) in the first 40 ms of the QRS */
function initR(c: Ctx, l: LeadName): number {
  let m = 0;
  for (let t = c.m.qrsOn; t <= c.m.qrsOn + 40; t += 2) m = Math.max(m, at(c, l, t));
  return m;
}
/** width (ms) at half height of the largest-magnitude QRS deflection of a lead */
function halfWidth(c: Ctx, l: LeadName): number {
  let tb = c.m.qrsOn;
  for (let t = c.m.qrsOn; t <= c.m.qrsOff; t += 2) if (Math.abs(at(c, l, t)) > Math.abs(at(c, l, tb))) tb = t;
  const big = at(c, l, tb);
  let ta = tb, tz = tb;
  while (ta > c.m.qrsOn - 20 && at(c, l, ta) / big > 0.5) ta -= 2;
  while (tz < c.m.qrsOff + 20 && at(c, l, tz) / big > 0.5) tz += 2;
  return tz - ta;
}
/** zigzag extrema (reversals ≥ 0.3 mm) per 200 ms of the T–Q stretches of a lead (flutter-wave shape) */
function fExtremaPerCycle(c: Ctx, l: LeadName): number {
  let ext = 0, cyc = 0;
  for (let k = 0; k + 1 < c.beats.length; k++) {
    const a = c.beats[k].qrsOff + 260, z = c.beats[k + 1].qrsOn - 20;
    if (z - a < 200) continue;
    let lastY = c.L[l][I(a)] * 10, dir = 0;
    for (let t = a; t < z; t += 2) {
      const y = c.L[l][I(t)] * 10;
      if (dir >= 0 && y < lastY - 0.3) { if (dir > 0) ext++; dir = -1; lastY = y; }
      else if (dir <= 0 && y > lastY + 0.3) { if (dir < 0) ext++; dir = 1; lastY = y; }
      else if ((dir > 0 && y > lastY) || (dir < 0 && y < lastY)) lastY = y;
    }
    cyc += (z - a) / 200;
  }
  return cyc ? ext / cyc : NaN;
}

const CRITERIA: Record<string, (c: Ctx) => [string, boolean, string][]> = {
  normal: (c) => [
    ['QRS 80–110 ms', c.truth.qrsMs >= 80 && c.truth.qrsMs <= 110, `${c.truth.qrsMs}`],
    ['PR 120–200 ms', (c.truth.prMs ?? 0) >= 120 && (c.truth.prMs ?? 0) <= 200, `${c.truth.prMs}`],
    ['QRS axis +30…+75°', c.truth.qrsAxisDeg >= 30 && c.truth.qrsAxisDeg <= 75, `${c.truth.qrsAxisDeg}`],
    ['rS in V1 (R < |S|)', c.amp.V1.r < -c.amp.V1.s, `r ${mm(c.amp.V1.r)} S ${mm(c.amp.V1.s)}`],
    ['R grows V1→V5', c.amp.V1.r < c.amp.V3.r && c.amp.V3.r < c.amp.V5.r, `${mm(c.amp.V1.r)}${mm(c.amp.V3.r)}${mm(c.amp.V5.r)}`],
    ['transition V3–V4', c.amp.V2.r < -c.amp.V2.s && c.amp.V4.r > -c.amp.V4.s, `V2 ${mm(c.amp.V2.r)}/${mm(c.amp.V2.s)} V4 ${mm(c.amp.V4.r)}/${mm(c.amp.V4.s)}`],
    ['septal q in I, aVL, V6', A(c, 'I', 'q') < -0.2 && A(c, 'aVL', 'q') < -0.2 && A(c, 'V6', 'q') < -0.2, `${mm(c.amp.I.q)}${mm(c.amp.aVL.q)}${mm(c.amp.V6.q)}`],
    ['T + in I, II, aVF, V2–V6; − in aVR', ['I', 'II', 'aVF', 'V2', 'V3', 'V4', 'V5', 'V6'].every((l) => A(c, l, 't') > 0.5) && A(c, 'aVR', 't') < -0.5, ''],
    ['P + in I, II, aVF; − in aVR', A(c, 'I', 'p') > 0.2 && A(c, 'II', 'p') > 0.5 && A(c, 'aVF', 'p') > 0.3 && A(c, 'aVR', 'p') < -0.3, `${mm(c.amp.II.p)}${mm(c.amp.aVR.p)}`],
    ['ST isoelectric (|J+40| < 0.5 mm)', LEADS.every((l) => Math.abs(at(c, l, c.m.qrsOff + 40)) < 0.5), ''],
  ],
  rbbb: (c) => {
    const e = qrsExtrema(c, 'V1');
    const pos = e.filter((x) => x.v > 0.5);
    const r1 = pos[0], r2 = pos[pos.length - 1];
    const trough = r1 && r2 && r1 !== r2 ? Math.min(...e.filter((x) => x.t > r1.t && x.t < r2.t).map((x) => x.v)) : NaN;
    return [
      ['QRS ≥ 120 ms', c.truth.qrsMs >= 120, `${c.truth.qrsMs}`],
      ["rsR' in V1 (two R peaks, R' > r)", !!(r1 && r2 && r1 !== r2 && r2.v > r1.v && trough < r1.v - 1), r1 && r2 ? `r ${r1.v.toFixed(1)}@${r1.t.toFixed(0)} trough ${trough.toFixed(1)} R' ${r2.v.toFixed(1)}@${r2.t.toFixed(0)}` : 'no peaks'],
      ['R peak time V1 > 50 ms', !!r2 && r2.t > 50, `${r2?.t.toFixed(0)}`],
      ['wide S in I and V6 (terminal 40 ms < −0.5 mm)', at(c, 'I', c.m.qrsOff - 20) < -0.5 && at(c, 'V6', c.m.qrsOff - 20) < -0.5, `${at(c, 'I', c.m.qrsOff - 20).toFixed(1)} ${at(c, 'V6', c.m.qrsOff - 20).toFixed(1)}`],
      ['T inverted V1', A(c, 'V1', 't') < -1, `${mm(c.amp.V1.t)}`],
      // review: the task asks for rsR′ with R′ > r in V1 *and* V2
      (() => { const e2 = qrsExtrema(c, 'V2'); const p2 = e2.filter((x) => x.v > 0.5); const a = p2[0], b = p2[p2.length - 1];
        return ["rsR' in V2 (R' > r)", !!(a && b && a !== b && b.v > a.v), a && b ? `r ${a.v.toFixed(1)}@${a.t.toFixed(0)} R' ${b.v.toFixed(1)}@${b.t.toFixed(0)}` : 'no peaks'] as [string, boolean, string]; })(),
      // clinicians read the RBBB axis from the net deflections of I and aVF (the slurred terminal S shifts the area axis)
      ['frontal axis normal (net-amplitude method, −30…+100°)', (() => { const ax = netAxis(c); return ax > -30 && ax <= 100; })(), `net ${netAxis(c).toFixed(0)}°, area ${c.truth.qrsAxisDeg}°`],
    ];
  },
  lbbb: (c) => [
    ['QRS ≥ 140 ms', c.truth.qrsMs >= 140, `${c.truth.qrsMs}`],
    ['no septal q in I, V5, V6', A(c, 'I', 'q') > -0.5 && A(c, 'V5', 'q') > -0.5 && A(c, 'V6', 'q') > -0.5, `${mm(c.amp.I.q)}${mm(c.amp.V5.q)}${mm(c.amp.V6.q)}`],
    ['R peak time V6 > 60 ms', c.amp.V6.rPeakMs > 60, `${c.amp.V6.rPeakMs}`],
    // review: the initial r (first 40 ms) — the QRS maximum is otherwise the elevated J point at the end of the QS
    ['QS or tiny initial r in V1–V3 (< 2 mm in the first 40 ms)', (['V1', 'V2', 'V3'] as LeadName[]).every((l) => initR(c, l) < 2), (['V1', 'V2', 'V3'] as LeadName[]).map((l) => initR(c, l).toFixed(1)).join(' ')],
    ['ST ↑ + T + in V1–V2', at(c, 'V1', c.m.qrsOff + 40) > 0.3 && A(c, 'V1', 't') > 1 && A(c, 'V2', 't') > 1, `${at(c, 'V1', c.m.qrsOff + 40).toFixed(1)}`],
    ['ST ↓ + T − in I, aVL, V6', ['I', 'aVL', 'V6'].every((l) => A(c, l, 't') < -1) && at(c, 'V6', c.m.qrsOff + 40) < 0, `${at(c, 'V6', c.m.qrsOff + 40).toFixed(1)}`],
    ['axis normal or left (−45…+60°)', c.truth.qrsAxisDeg >= -45 && c.truth.qrsAxisDeg <= 60, `${c.truth.qrsAxisDeg}`],
  ],
  'anterior-stemi': (c) => [
    ['J ≥ 2 mm in V2 and V3', at(c, 'V2', c.m.qrsOff + 10) >= 2 && at(c, 'V3', c.m.qrsOff + 10) >= 2, `${at(c, 'V2', c.m.qrsOff + 10).toFixed(1)} ${at(c, 'V3', c.m.qrsOff + 10).toFixed(1)}`],
    ['ST ↑ in V1–V4', ['V1', 'V2', 'V3', 'V4'].every((l) => at(c, l as LeadName, c.m.qrsOff + 40) > 0.5), ['V1', 'V4'].map((l) => at(c, l as LeadName, c.m.qrsOff + 40).toFixed(1)).join(' ')],
    ['reciprocal ST ↓ III, aVF', at(c, 'III', c.m.qrsOff + 40) < -0.5 && at(c, 'aVF', c.m.qrsOff + 40) < -0.5, `${at(c, 'III', c.m.qrsOff + 40).toFixed(1)} ${at(c, 'aVF', c.m.qrsOff + 40).toFixed(1)}`],
    ['hyperacute T V2–V4 (≥ 6 mm)', ['V2', 'V3', 'V4'].every((l) => A(c, l, 't') >= 6), ['V2', 'V3', 'V4'].map((l) => A(c, l, 't').toFixed(1)).join(' ')],
    ['QRS narrow (< 110 ms)', c.truth.qrsMs < 110, `${c.truth.qrsMs}`],
  ],
  'inferior-stemi': (c) => {
    const st = (l: LeadName) => at(c, l, c.m.qrsOff + 40);
    return [
      ['ST ↑ II, III, aVF', st('II') > 0.5 && st('III') > 1 && st('aVF') > 1, `${st('II').toFixed(1)} ${st('III').toFixed(1)} ${st('aVF').toFixed(1)}`],
      ['ST III > II', st('III') > st('II'), ''],
      ['reciprocal ST ↓ I, aVL (aVL deepest)', st('I') < 0 && st('aVL') < st('I'), `${st('I').toFixed(1)} ${st('aVL').toFixed(1)}`],
      // review: posterior-wall mirror image — the precordial ST depression is V1–V3 predominant, V5–V6 near isoelectric
      ['precordial ST ↓ V1–V3 predominant (mean V1–V3 < mean V5–V6 − 0.5, |V6| < 0.5)', (st('V1') + st('V2') + st('V3')) / 3 < (st('V5') + st('V6')) / 2 - 0.5 && Math.abs(st('V6')) < 0.5, ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'].map((l) => st(l as LeadName).toFixed(1)).join(' ')],
      ['QRS narrow (< 110 ms)', c.truth.qrsMs < 110, `${c.truth.qrsMs}`],
    ];
  },
  'lvh-strain': (c) => {
    const sok = -c.amp.V1.s * 10 + Math.max(c.amp.V5.r, c.amp.V6.r) * 10;
    return [
      ['S V1 + R V5/V6 ≥ 35 mm', sok >= 35, sok.toFixed(1)],
      ['QRS 95–115 ms', c.truth.qrsMs >= 95 && c.truth.qrsMs <= 115, `${c.truth.qrsMs}`],
      ['R peak time V5/V6 ≥ 50 ms', Math.max(c.amp.V5.rPeakMs, c.amp.V6.rPeakMs) >= 50, `${c.amp.V5.rPeakMs} ${c.amp.V6.rPeakMs}`],
      ['ST ↓ + T − in I, aVL, V5, V6', ['I', 'aVL', 'V5', 'V6'].every((l) => at(c, l as LeadName, c.m.qrsOff + 40) < -0.5 && A(c, l, 't') < -1), ['I', 'aVL', 'V5', 'V6'].map((l) => `${at(c, l as LeadName, c.m.qrsOff + 40).toFixed(1)}/${A(c, l, 't').toFixed(1)}`).join(' ')],
      ['asymmetric inverted T (slow descent, fast return) V5', tSymmetry(c, 'V5') > 1.2, tSymmetry(c, 'V5').toFixed(2)],
      ['R aVL ≥ 11 mm (optional)', A(c, 'aVL', 'r') >= 11, `${mm(c.amp.aVL.r)}`],
      ['mild left axis tendency (−30…+30°)', c.truth.qrsAxisDeg >= -30 && c.truth.qrsAxisDeg <= 30, `${c.truth.qrsAxisDeg}`],
    ];
  },
  wpw: (c) => {
    // delta: slow initial upstroke — mean slope over the first 30 ms < 40 % of the steepest QRS slope (lead II and V1)
    const slow = (l: LeadName) => {
      const s0 = Math.abs(at(c, l, c.m.qrsOn + 30) - at(c, l, c.m.qrsOn)) / 30;
      let mx = 0;
      for (let t = c.m.qrsOn; t < c.m.qrsOff - 4; t += 2) mx = Math.max(mx, Math.abs(at(c, l, t + 4) - at(c, l, t)) / 4);
      return s0 / Math.max(1e-6, mx);
    };
    return [
      ['PR < 120 ms', (c.truth.prMs ?? 999) < 120, `${c.truth.prMs}`],
      ['QRS ≥ 110 ms', c.truth.qrsMs >= 110, `${c.truth.qrsMs}`],
      ['delta wave (slurred first 30 ms) in II, III, aVF, V1', ['II', 'III', 'aVF', 'V1'].every((l) => slow(l as LeadName) < 0.4), ['II', 'III', 'aVF', 'V1'].map((l) => slow(l as LeadName).toFixed(2)).join(' ')],
      ['dominant R in V1 (type A)', c.amp.V1.r > -c.amp.V1.s, `${mm(c.amp.V1.r)} ${mm(c.amp.V1.s)}`],
      ['negative delta in I / aVL (left lateral AP)', at(c, 'aVL', c.m.qrsOn + 25) < -0.3, `${at(c, 'aVL', c.m.qrsOn + 25).toFixed(1)}`],
      ['secondary T opposite to delta in III', at(c, 'III', c.m.qrsOn + 25) * c.amp.III.t < 0, `${mm(c.amp.III.t)}`],
    ];
  },
  'brugada-type1': (c) => [
    ['J ≥ 2 mm in V1 and V2', at(c, 'V1', c.m.qrsOff) >= 2 && at(c, 'V2', c.m.qrsOff) >= 2, `${at(c, 'V1', c.m.qrsOff).toFixed(1)} ${at(c, 'V2', c.m.qrsOff).toFixed(1)}`],
    ['coved: ST descends J → J+80 in V1', at(c, 'V1', c.m.qrsOff + 20) > at(c, 'V1', c.m.qrsOff + 80) && at(c, 'V1', c.m.qrsOff + 80) > 0.5, `${at(c, 'V1', c.m.qrsOff + 20).toFixed(1)} → ${at(c, 'V1', c.m.qrsOff + 80).toFixed(1)}`],
    ['negative symmetric T in V1', A(c, 'V1', 't') < -1 && tSymmetry(c, 'V1') > 0.6 && tSymmetry(c, 'V1') < 1.6, `${mm(c.amp.V1.t)} sym ${tSymmetry(c, 'V1').toFixed(2)}`],
    ['no reciprocal ST ↓ (limb leads, V5–V6 > −0.5 mm)', ['I', 'II', 'III', 'aVL', 'aVF', 'V5', 'V6'].every((l) => at(c, l as LeadName, c.m.qrsOff + 40) > -0.5), ['I', 'II', 'III', 'aVL', 'aVF', 'V5', 'V6'].map((l) => at(c, l as LeadName, c.m.qrsOff + 40).toFixed(1)).join(' ')],
    ['other leads essentially normal (|ST| < 1 mm in I, II, V4–V6)', ['I', 'II', 'V4', 'V5', 'V6'].every((l) => Math.abs(at(c, l as LeadName, c.m.qrsOff + 40)) < 1), ['I', 'II', 'V4', 'V5', 'V6'].map((l) => at(c, l as LeadName, c.m.qrsOff + 40).toFixed(1)).join(' ')],
  ],
  aflutter: (c) => [
    ['ventricular rate 70–80 regular', Math.abs(c.truth.hrBpm - 75) < 5, `${c.truth.hrBpm}`],
    ['F-wave cycle 180–220 ms (lead II autocorrelation)', (() => { const p = acPeriod(c.L.II, 150, 300); return p >= 180 && p <= 220; })(), `${acPeriod(c.L.II, 150, 300)}`],
    ['F waves negative in II, III, aVF (min < −2 mm, |min| > max in TQ)', ['II', 'III', 'aVF'].every((l) => tqExtremes(c, l as LeadName).min < -2 && -tqExtremes(c, l as LeadName).min > tqExtremes(c, l as LeadName).max), ['II', 'III', 'aVF'].map((l) => { const e = tqExtremes(c, l as LeadName); return `${e.min.toFixed(1)}/${e.max.toFixed(1)}`; }).join(' ')],
    ['F waves positive in V1', tqExtremes(c, 'V1').max > -tqExtremes(c, 'V1').min && tqExtremes(c, 'V1').max > 0.8, `${tqExtremes(c, 'V1').min.toFixed(1)}/${tqExtremes(c, 'V1').max.toFixed(1)}`],
    // review: a clean sawtooth has one trough and one peak per flutter cycle (no notches / spikes inside the F wave)
    ['clean sawtooth in II, III, aVF (≤ 2.5 extrema per F cycle)', (['II', 'III', 'aVF'] as LeadName[]).every((l) => fExtremaPerCycle(c, l) <= 2.5), (['II', 'III', 'aVF'] as LeadName[]).map((l) => fExtremaPerCycle(c, l).toFixed(1)).join(' ')],
    ['QRS narrow', c.truth.qrsMs < 110, `${c.truth.qrsMs}`],
  ],
  hyperk: (c) => [
    ['peaked T ≥ 10 mm in V2–V4', ['V2', 'V3', 'V4'].every((l) => A(c, l, 't') >= 10), ['V2', 'V3', 'V4'].map((l) => mm(c.amp[l as LeadName].t)).join('')],
    ['smooth T: no notch / second hump in any lead', LEADS.every((l) => tNotches(c, l) === 0), LEADS.filter((l) => tNotches(c, l) > 0).join(' ')],
    ['symmetric T (rise/fall 0.7–1.4) V3', tSymmetry(c, 'V3') > 0.7 && tSymmetry(c, 'V3') < 1.4, tSymmetry(c, 'V3').toFixed(2)],
    ['flat P (< 1 mm in II)', A(c, 'II', 'p') < 1, `${mm(c.amp.II.p)}`],
    ['PR ≥ 190 ms', (c.truth.prMs ?? 0) >= 190, `${c.truth.prMs}`],
    ['QRS 100–120 ms', c.truth.qrsMs >= 100 && c.truth.qrsMs <= 120, `${c.truth.qrsMs}`],
    ['QTc ≤ 440 ms', c.truth.qtMs / Math.sqrt(60 / c.truth.hrBpm) <= 440, `${(c.truth.qtMs / Math.sqrt(60 / c.truth.hrBpm)).toFixed(0)}`],
  ],
  afib: (c) => {
    const rr = c.beats.slice(1).map((b, i) => b.qrsOn - c.beats[i].qrsOn);
    const mean = rr.reduce((a, b) => a + b, 0) / rr.length;
    const cv = Math.sqrt(rr.reduce((a, b) => a + (b - mean) ** 2, 0) / rr.length) / mean;
    const f = tqExtremes(c, 'V1');
    return [
      ['irregularly irregular RR (CV > 10 %)', cv > 0.1, `${(cv * 100).toFixed(1)} %`],
      ['mean rate 85–115', 60000 / mean > 85 && 60000 / mean < 115, `${(60000 / mean).toFixed(0)}`],
      ['f waves visible in V1 (TQ peak-to-peak 0.5–3 mm)', f.max - f.min > 0.5 && f.max - f.min < 3, `${(f.max - f.min).toFixed(1)}`],
      ['QRS narrow', c.truth.qrsMs < 110, `${c.truth.qrsMs}`],
    ];
  },
  vt: (c) => [
    ['QRS ≥ 140 ms', c.truth.qrsMs >= 140, `${c.truth.qrsMs}`],
    ['rate 150–190, regular', c.truth.hrBpm > 150 && c.truth.hrBpm < 190, `${c.truth.hrBpm}`],
    ['RBBB-like: V1 net positive', c.amp.V1.qrsArea > 0, `${c.amp.V1.qrsArea.toFixed(1)}`],
    ['superior axis (−180…−30°)', c.truth.qrsAxisDeg <= -30, `${c.truth.qrsAxisDeg}`],
    ['V6 R/S < 1', c.amp.V6.r < -c.amp.V6.s, `${mm(c.amp.V6.r)} ${mm(c.amp.V6.s)}`],
    // review: every precordial complex must look wide — the largest QRS deflection is ≥ 40 ms wide at half height
    ['wide everywhere: largest deflection ≥ 40 ms at half height in V1–V6', (['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as LeadName[]).every((l) => halfWidth(c, l) >= 40), (['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as LeadName[]).map((l) => halfWidth(c, l).toFixed(0)).join(' ')],
  ],
};

/** frontal axis from the net QRS deflections (R + S, mm) of I and aVF */
function netAxis(c: Ctx): number {
  return (Math.atan2(A(c, 'aVF', 'r') + A(c, 'aVF', 's') + A(c, 'aVF', 'q'), A(c, 'I', 'r') + A(c, 'I', 's') + A(c, 'I', 'q')) * 180) / Math.PI;
}

/** dominant period (ms) of a lead between lo and hi ms (autocorrelation peak) */
function acPeriod(x: Float32Array, lo: number, hi: number): number {
  let mean = 0;
  for (const v of x) mean += v;
  mean /= x.length;
  let best = lo, bv = -Infinity;
  for (let lag = I(lo); lag <= I(hi); lag++) {
    let s = 0;
    for (let i = 0; i + lag < x.length; i++) s += (x[i] - mean) * (x[i + lag] - mean);
    if (s > bv) { bv = s; best = lag; }
  }
  return (best * 1000) / fs;
}
/** extremes (mm) of a lead in the T–Q intervals (from T end + 20 ms to next QRS onset − 20 ms), median-referenced */
function tqExtremes(c: Ctx, l: LeadName): { min: number; max: number } {
  const x = c.L[l];
  const vals: number[] = [];
  for (let k = 0; k + 1 < c.beats.length; k++) {
    const a = c.beats[k].qrsOff + 260, z = c.beats[k + 1].qrsOn - 20;
    for (let t = a; t < z; t += 2) vals.push(x[I(t)]);
  }
  if (!vals.length) return { min: 0, max: 0 };
  const s = [...vals].sort((p, q) => p - q);
  const med = s[Math.floor(s.length / 2)];
  return { min: (s[Math.floor(s.length * 0.02)] - med) * 10, max: (s[Math.floor(s.length * 0.98)] - med) * 10 };
}

for (const id of ids) {
  const t0 = performance.now();
  const res = generate(id, { fs, durationS: 10, seed: 1 });
  const genMs = performance.now() - t0;
  const L = res.leads as Leads;
  const tr = res.truth;
  let idErr = 0;
  for (let i = 0; i < L.I.length; i++) {
    const a = L.I[i], b = L.II[i];
    idErr = Math.max(idErr, Math.abs(L.III[i] - (b - a)), Math.abs(L.aVR[i] + (a + b) / 2), Math.abs(L.aVL[i] - (a - b / 2)), Math.abs(L.aVF[i] - (b - a / 2)));
  }
  const sinus = tr.prMs !== null;
  const mb = detectBeats(L, fs, { pWave: sinus });
  const pairs: { t: (typeof tr.beats)[number]; m: MeasuredBeat }[] = [];
  for (const t of tr.beats) {
    const m = mb.find((x) => Math.abs(x.qrsOn - t.qrsOnMs) < 40);
    if (m && t.qrsOnMs > 300 && t.tOffMs < 9800) pairs.push({ t, m });
  }
  const med = (a: number[]) => { const s = a.filter((x) => isFinite(x)).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
  const mQrs = med(pairs.map((p) => p.m.qrsOff - p.m.qrsOn));
  const mQt = med(pairs.map((p) => p.m.tOff - p.m.qrsOn));
  const mPr = sinus ? med(pairs.map((p) => (p.m.pOn === null ? NaN : p.m.qrsOn - p.m.pOn))) : null;
  const mAxis = med(pairs.map((p) => qrsAxis(L, fs, p.m.qrsOn, p.m.qrsOff)));
  const rrs: number[] = [];
  for (let i = 1; i < mb.length; i++) rrs.push(mb[i].qrsOn - mb[i - 1].qrsOn);
  const mHr = 60000 / (rrs.reduce((a, b) => a + b, 0) / Math.max(1, rrs.length));
  const tol = { hr: 3, pr: 20, qrs: 20, qt: 30, axis: 15 };
  const rows: string[] = [];
  const row = (name: string, truth: number | null, meas: number | null, t: number) => {
    const measurable = meas !== null && isFinite(meas);
    const ok = truth === null ? meas === null : !measurable ? false : Math.abs(truth - (meas as number)) <= t;
    if (!ok) failures++;
    rows.push(`${name} truth ${truth === null ? '—' : truth.toFixed(0)} meas ${measurable ? (meas as number).toFixed(0) : '—'} ${ok ? 'ok' : 'MISMATCH'}`);
  };
  row('HR', tr.hrBpm, mHr, tol.hr);
  row('PR', tr.prMs, mPr, tol.pr);
  row('QRS', tr.qrsMs, mQrs, tol.qrs);
  // QT is only measurable when the T wave ends before the next beat (not in a 170/min tachycardia, where T runs into
  // the next QRS — QT is not read clinically there either)
  if (pairs.some((p) => isFinite(p.m.tOff)) && tr.hrBpm < 150) row('QT', tr.qtMs, mQt, tol.qt);
  else rows.push(`QT truth ${tr.qtMs} meas ${isFinite(mQt) ? mQt.toFixed(0) : '—'} (T fused with the next QRS: not compared)`);
  // the frontal axis is compared by angular distance
  const dAx = Math.abs((((tr.qrsAxisDeg - mAxis) % 360) + 540) % 360 - 180);
  if (!(dAx <= tol.axis)) failures++;
  rows.push(`axis truth ${tr.qrsAxisDeg} meas ${isFinite(mAxis) ? mAxis.toFixed(0) : '—'} ${dAx <= tol.axis ? 'ok' : 'MISMATCH'}`);
  console.log(`\n=== ${id} (${tr.rhythm}) — ${genMs.toFixed(0)} ms; beats truth ${tr.beats.length} detected ${mb.length}, paired ${pairs.length}; limb identity max err ${idErr.toExponential(1)} mV`);
  console.log('  ' + rows.join(' | '));
  if (idErr > 1e-5) { failures++; console.log('  LIMB IDENTITY FAILURE'); }
  const p = pairs[Math.floor(pairs.length / 2)];
  if (!p) { failures++; continue; }
  const amp = {} as Record<LeadName, LeadAmp>;
  console.log('  lead     Q      R      S   Rpk(ms)  J     ST60    T      P   (mm at 10 mm/mV)');
  for (const l of LEADS) {
    amp[l] = leadAmplitudes(L[l], fs, p.m.qrsOn, p.m.qrsOff, isFinite(p.m.tOff) ? p.m.tOff : p.m.qrsOn + 380, p.m.pOn ?? (sinus ? p.t.pOnMs : null));
    const a = amp[l];
    console.log(`  ${l.padEnd(4)}${mm(a.q)}${mm(a.r)}${mm(a.s)}${a.rPeakMs.toFixed(0).padStart(7)}${mm(a.j)}${mm(a.st60)}${mm(a.t)}${mm(a.p)}`);
  }
  const crit = CRITERIA[id];
  if (crit) {
    const ctx: Ctx = { L, m: { ...p.m, tOff: isFinite(p.m.tOff) ? p.m.tOff : p.m.qrsOn + 380 }, amp, beats: mb, truth: tr };
    const res2 = crit(ctx);
    let nOk = 0;
    for (const [name, ok, detail] of res2) {
      if (ok) nOk++; else critFail++;
      console.log(`  [${ok ? 'pass' : 'FAIL'}] ${name}${detail ? '  (' + detail.trim() + ')' : ''}`);
    }
    summary.push(`${id.padEnd(15)} criteria ${nOk}/${res2.length}  generate ${genMs.toFixed(0)} ms`);
  }
}
console.log('\n' + summary.join('\n'));
console.log(failures ? `\n${failures} truth/measurement check(s) failed` : '\nall truth/measurement checks passed');
console.log(critFail ? `${critFail} textbook criterion check(s) failed` : 'all textbook criteria passed');
process.exitCode = failures ? 1 : 0;
