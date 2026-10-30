/**
 * Coordinate search of the normal base (DECISION §8.3 step 1) against the PTB-XL+ NORM envelope medians
 * (tests/synth/fixtures/ptbxl-envelopes.json) plus the textbook constraints of the normal criteria and the judges'
 * fixes (DECISION §12.2): axis ≈ +50°, transition V3–V4, septal q < 25 % of R, T in V3–V4 ≤ ½ R, P axis ≈ +50°.
 * The strip is a clean, jitter-free sinus rhythm at 72/min built from the engine's own builders; it is measured by the
 * independent oracle. Prints the calibrated constants for morph/patterns/normal.ts, morph/atrial.ts (SINUS_P) and
 * morph/ventricular.ts (NORMAL_T_AREA); they are committed by hand with a provenance comment.
 *
 *   node --import ./scripts/synth/node-hooks.mjs scripts/synth/calibrate.ts [--passes 4] [--beta]
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { STD_LEADS, type StdLead } from '../../src/core/leads';
import type { LobeSpec, Vec3 } from '../../src/synth/api';
import { add, unit } from '../../src/synth/frame';
import { lobeArea, lobeKernel, type Kernel } from '../../src/synth/kernel/kernel';
import { electrodePotentials, render } from '../../src/synth/kernel/render';
import { assemble } from '../../src/synth/leads/assemble';
import { STANDARD_HOOKUP } from '../../src/synth/leads/electrodes';
import { BETA } from '../../src/synth/leads/leadfield';
import { buildAtrial, SINUS_P, type SinusPBase } from '../../src/synth/morph/atrial';
import { NORMAL_PATTERN } from '../../src/synth/morph/patterns/normal';
import { DEFAULT_RISE_FRAC, DEFAULT_ST_FRAC } from '../../src/synth/morph/repol';
import { resolveLobe } from '../../src/synth/morph/resolve';
import { buildVentricular, instantiateVent, NORMAL_T_AREA } from '../../src/synth/morph/ventricular';
import { measure, type Measurement } from '../../tests/synth/oracle/measure';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
interface Env { p5: number; p50: number; p95: number }
const ENV = (JSON.parse(readFileSync(`${ROOT}tests/synth/fixtures/ptbxl-envelopes.json`, 'utf8')) as { classes: Record<string, { leads: Record<string, Record<string, Env>>; global: Record<string, Env> }> }).classes.NORM;

const args = process.argv.slice(2);
const passes = Number(args[args.indexOf('--passes') + 1] || 4);
const tuneBeta = args.includes('--beta');

// ── parameter vector ──────────────────────────────────────────────────────────────────────────────────────────────
interface Params {
  lobes: { on: number; peak: number; end: number; dir: [number, number, number]; amp: number }[];
  tArea: [number, number, number];
  st: number;
  rise: number;
  p: { ra: { dir: [number, number, number]; amp: number }; la: { dir: [number, number, number]; amp: number } };
  beta: number;
}
const init: Params = {
  lobes: NORMAL_PATTERN.lobes.map((l) => ({ on: l.on, peak: l.peak, end: l.end, dir: [...l.dir] as [number, number, number], amp: l.amp })),
  tArea: [...NORMAL_T_AREA] as [number, number, number],
  st: DEFAULT_ST_FRAC,
  rise: DEFAULT_RISE_FRAC,
  p: { ra: { dir: [...SINUS_P.ra.dir] as [number, number, number], amp: SINUS_P.ra.amp }, la: { dir: [...SINUS_P.la.dir] as [number, number, number], amp: SINUS_P.la.amp } },
  beta: BETA,
};
interface Knob { name: string; get: (p: Params) => number; set: (p: Params, v: number) => void; step: number; lo: number; hi: number }
const knobs: Knob[] = [];
init.lobes.forEach((_, i) => {
  knobs.push({ name: `L${i}.amp`, get: (p) => p.lobes[i].amp, set: (p, v) => (p.lobes[i].amp = v), step: 0.06, lo: 0.05, hi: 3 });
  for (let c = 0; c < 3; c++) knobs.push({ name: `L${i}.dir${'xyz'[c]}`, get: (p) => p.lobes[i].dir[c], set: (p, v) => (p.lobes[i].dir[c] = v), step: 0.08, lo: -1.2, hi: 1.2 });
  // the peak stays in the middle 30–70 % of the lobe (no needle-like rise or fall)
  const span = init.lobes[i].end - init.lobes[i].on;
  knobs.push({ name: `L${i}.peak`, get: (p) => p.lobes[i].peak, set: (p, v) => (p.lobes[i].peak = v), step: 2, lo: init.lobes[i].on + 0.3 * span, hi: init.lobes[i].on + 0.7 * span });
  if (i === init.lobes.length - 1) knobs.push({ name: `L${i}.end`, get: (p) => p.lobes[i].end, set: (p, v) => (p.lobes[i].end = v), step: 2, lo: init.lobes[i].end - 8, hi: init.lobes[i].end + 6 });
});
for (let c = 0; c < 3; c++) knobs.push({ name: `T.${'xyz'[c]}`, get: (p) => p.tArea[c], set: (p, v) => (p.tArea[c] = v), step: 6, lo: -120, hi: 120 });
knobs.push({ name: 'T.st', get: (p) => p.st, set: (p, v) => (p.st = v), step: 0.02, lo: 0.22, hi: 0.45 });
knobs.push({ name: 'T.rise', get: (p) => p.rise, set: (p, v) => (p.rise = v), step: 0.02, lo: 0.5, hi: 0.72 });
for (const a of ['ra', 'la'] as const) {
  knobs.push({ name: `P.${a}.amp`, get: (p) => p.p[a].amp, set: (p, v) => (p.p[a].amp = v), step: 0.01, lo: 0.04, hi: 0.3 });
  // the LA force stays posterior (terminal negative P in V1)
  for (let c = 0; c < 3; c++) knobs.push({ name: `P.${a}.dir${'xyz'[c]}`, get: (p) => p.p[a].dir[c], set: (p, v) => (p.p[a].dir[c] = v), step: 0.08, lo: a === 'la' && c === 2 ? 0.45 : -1.2, hi: 1.2 });
}
if (tuneBeta) knobs.push({ name: 'beta', get: (p) => p.beta, set: (p, v) => (p.beta = v), step: 0.1, lo: 0.2, hi: 1.6 });

const clone = (p: Params): Params => JSON.parse(JSON.stringify(p)) as Params;

function lobeSpecs(p: Params): LobeSpec[] {
  return NORMAL_PATTERN.lobes.map((l, i) => ({ ...l, on: p.lobes[i].on, peak: p.lobes[i].peak, end: p.lobes[i].end, dir: p.lobes[i].dir, amp: p.lobes[i].amp }));
}

function strip(p: Params): ReturnType<typeof assemble> {
  const pBase: SinusPBase = { ...SINUS_P, ra: { ...SINUS_P.ra, dir: p.p.ra.dir, amp: p.p.ra.amp }, la: { ...SINUS_P.la, dir: p.p.la.dir, amp: p.p.la.amp } };
  const atrial = buildAtrial(undefined, 'sinus', false, pBase);
  const lobes = lobeSpecs(p);
  const aQrs = lobes.map((s) => lobeArea(resolveLobe(s, 'QRS', 'none'))).reduce<Vec3>((s, a) => add(s, a), [0, 0, 0]);
  const vm = buildVentricular({
    pattern: { key: 'cal', lobes, activation: {} }, refRrMs: 833, gNormal: add(aQrs, p.tArea),
    repol: { tShape: { stMs: undefined, riseFrac: p.rise } }, jitterLobe: undefined,
  });
  // st fraction: rebuild with the explicit ST duration
  const jt = vm.law.jtRef;
  const vm2 = buildVentricular({
    pattern: { key: 'cal', lobes, activation: {} }, refRrMs: 833, gNormal: add(aQrs, p.tArea), repol: { tShape: { stMs: p.st * jt, riseFrac: p.rise } },
  });
  const ks: Kernel[] = [];
  const rr = 833;
  for (let k = -2; k < 13; k++) {
    const t = k * rr + 200;
    for (const l of atrial.lobes) ks.push(lobeKernel(l, t, k, true));
    if (atrial.ta) ks.push(lobeKernel(atrial.ta, t, k, true));
    ks.push(...instantiateVent(vm2, t + 160, rr, k).kernels);
  }
  return assemble(electrodePotentials(render(ks, 500, 5000, 0, p.beta)), STANDARD_HOOKUP);
}

const sd = (e: Env): number => Math.max(0.03, (e.p95 - e.p5) / 3.29);
function loss(p: Params, verbose = false): number {
  let m: Measurement;
  try {
    m = measure(strip(p), 500);
  } catch {
    return 1e9;
  }
  let L = 0;
  const add_ = (name: string, v: number, target: number, s: number, w = 1): void => {
    const e = ((v - target) / s) ** 2 * w;
    L += e;
    if (verbose && e > 0.5) console.log(`  ${name.padEnd(14)} ${v.toFixed(3)} target ${target.toFixed(3)} (±${s.toFixed(3)}) cost ${e.toFixed(2)}`);
  };
  for (const l of STD_LEADS) {
    const f = m.feats[l], e = ENV.leads[l];
    add_(`${l} R`, f.r, e.R_Amp.p50, sd(e.R_Amp));
    add_(`${l} S`, f.s, e.S_Amp.p50, sd(e.S_Amp), 0.7);
    add_(`${l} T`, f.t, e.T_Amp.p50, sd(e.T_Amp));
    add_(`${l} P`, Math.abs(f.p) > Math.abs(f.pNeg) ? f.p : f.pNeg, e.P_Amp.p50, sd(e.P_Amp), 0.6);
  }
  for (const l of ['I', 'aVL', 'V5', 'V6'] as StdLead[]) {
    const f = m.feats[l];
    add_(`${l} q`, f.q, ENV.leads[l].Q_Amp.p50 - 0.03, 0.04, 0.5);
    if (f.q < -0.25 * f.r) add_(`${l} q/R`, f.q / Math.max(0.05, f.r), -0.2, 0.05, 2);
  }
  // biphasic P in V1 (small positive then negative), the textbook sinus P
  if (m.feats.V1.pNeg > -0.02) add_('V1 P−', m.feats.V1.pNeg, -0.04, 0.015, 1);
  if (m.feats.V1.p < 0.01) add_('V1 P+', m.feats.V1.p, 0.03, 0.015, 1);
  add_('axis', m.axisDeg, 40, 6, 2);
  add_('P axis', m.pAxisDeg ?? 0, 50, 6, 1);
  add_('T axis', m.tAxisDeg ?? 0, 41, 8, 1);
  add_('QRS', m.qrsMs, 92, 4, 1);
  // transition V3–V4: V2 R < |S|, V3 near equiphasic, V4 R > |S|
  const ratio = (l: StdLead): number => m.feats[l].r / Math.max(0.05, -m.feats[l].s);
  if (ratio('V2') > 0.8) add_('V2 R/S', ratio('V2'), 0.6, 0.1, 2);
  if (ratio('V4') < 1.5) add_('V4 R/S', ratio('V4'), 2, 0.3, 2);
  // T in V3–V4 ≤ ½ R; a real ST segment (no J depression)
  // V4 T ≤ ½ R (judges), V3 T < ¾ R (the PTB-XL+ NORM medians give V3 T/R ≈ 0.55), with margin for the ±8 % jitter
  for (const [l, lim] of [['V3', 0.65], ['V4', 0.42]] as const) if (m.feats[l].t > lim * m.feats[l].r) add_(`${l} T/R`, m.feats[l].t / m.feats[l].r, lim - 0.05, 0.05, 2);
  for (const l of STD_LEADS) if (Math.abs(m.feats[l].j) > 0.05) add_(`${l} J`, m.feats[l].j, 0, 0.03, 0.5);
  return L;
}

let best = clone(init);
let bestL = loss(best);
console.log(`initial loss ${bestL.toFixed(2)}`);
const steps = new Map(knobs.map((k) => [k.name, k.step]));
for (let pass = 0; pass < passes; pass++) {
  let improved = 0;
  for (const k of knobs) {
    const st = steps.get(k.name)!;
    for (const sgn of [1, -1]) {
      const c = clone(best);
      const v = Math.min(k.hi, Math.max(k.lo, k.get(c) + sgn * st));
      k.set(c, v);
      const l = loss(c);
      if (l < bestL - 1e-6) {
        best = c;
        bestL = l;
        improved++;
        break;
      }
    }
  }
  console.log(`pass ${pass + 1}: loss ${bestL.toFixed(2)} (${improved} improvements)`);
  if (!improved) for (const k of knobs) steps.set(k.name, steps.get(k.name)! / 2);
}
loss(best, true);
const r = (x: number, d = 3): number => Math.round(x * 10 ** d) / 10 ** d;
console.log('\n// normal.ts lobes');
best.lobes.forEach((l, i) => console.log(`  [${NORMAL_PATTERN.lobes[i].label}] on ${r(l.on, 1)} peak ${r(l.peak, 1)} end ${r(l.end, 1)} dir [${unit(l.dir).map((x) => r(x)).join(', ')}] amp ${r(l.amp)}`));
console.log(`// NORMAL_T_AREA [${best.tArea.map((x) => r(x, 1)).join(', ')}]  DEFAULT_ST_FRAC ${r(best.st)}  DEFAULT_RISE_FRAC ${r(best.rise)}`);
console.log(`// SINUS_P ra dir [${unit(best.p.ra.dir).map((x) => r(x)).join(', ')}] amp ${r(best.p.ra.amp)}  la dir [${unit(best.p.la.dir).map((x) => r(x)).join(', ')}] amp ${r(best.p.la.amp)}`);
if (tuneBeta) console.log(`// BETA ${r(best.beta, 2)}`);
