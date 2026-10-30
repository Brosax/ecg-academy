/**
 * Stage H lessons (h1–h9, docs/PLAN.md §3): every lesson validates against the live catalogues with no errors and no
 * warnings, follows the lesson anatomy (attempt-first hook, worked example before practice, checks/drill, summary),
 * every live-block dial is realised by the engine, every family check generates (and is on the lesson's topic), every
 * synthetic ECG the lessons show can be generated, and what the text says is on each tracing is measurable on it.
 *
 * The lessons are imported directly (not through the lessons index) so a broken lesson elsewhere cannot hide these.
 * h6 (ARVC) and h8 (Brugada / early repolarisation) have no real-case block: PTB-XL has no ARVC, epsilon-wave or
 * Brugada label, so nothing honest can be shown there.
 */
import { describe, expect, it } from 'vitest';
import type { Block, Lesson } from '../../src/course/api';
import { liveValidateDeps } from '../../src/course/deps';
import h1 from '../../src/course/lessons/h1';
import h2 from '../../src/course/lessons/h2';
import h3 from '../../src/course/lessons/h3';
import h4 from '../../src/course/lessons/h4';
import h5 from '../../src/course/lessons/h5';
import h6 from '../../src/course/lessons/h6';
import h7 from '../../src/course/lessons/h7';
import h8 from '../../src/course/lessons/h8';
import h9 from '../../src/course/lessons/h9';
import { realisedDials, startDials } from '../../src/course/live';
import { baselineBefore, qrsWaves } from '../../src/course/marks';
import { formatIssues, validateLesson } from '../../src/course/validate';
import type { BeatMarks, Ecg } from '../../src/core/ecg';
import type { FindingId } from '../../src/core/findings';
import type { L10n } from '../../src/core/l10n';
import type { StdLead } from '../../src/core/leads';
import type { EcgSource } from '../../src/practice/api';
import { generateItem } from '../../src/practice';
import { generate, scenarios, type SynthRequest } from '../../src/synth';

const lessons: readonly Lesson[] = [h1, h2, h3, h4, h5, h6, h7, h8, h9];
const NO_REAL_CASE = new Set(['h6', 'h8']);

/** Every ECG source a lesson shows (hook, ecg, figure, heart, worked, contrast, inline items). */
function sourcesOf(lesson: Lesson): { readonly path: string; readonly src: EcgSource }[] {
  const out: { path: string; src: EcgSource }[] = [];
  lesson.blocks.forEach((b: Block, i) => {
    const p = `blocks[${i}]`;
    switch (b.kind) {
      case 'hook':
      case 'ecg':
      case 'heart':
      case 'worked':
        out.push({ path: p, src: b.ecg });
        break;
      case 'figure':
        if (b.ecg) out.push({ path: p, src: b.ecg });
        break;
      case 'contrast':
        out.push({ path: `${p}.left`, src: b.left.ecg }, { path: `${p}.right`, src: b.right.ecg });
        break;
      case 'check':
        if ('inline' in b.item) {
          out.push({ path: `${p}.item`, src: b.item.inline.ecg });
          if (b.item.inline.kind === 'compare') out.push({ path: `${p}.item.ecg2`, src: b.item.inline.ecg2 });
        }
        break;
      default:
        break;
    }
  });
  return out;
}

function unrealisedLiveDials(lesson: Lesson): string[] {
  const out: string[] = [];
  lesson.blocks.forEach((b, i) => {
    if (b.kind !== 'live') return;
    const sc = scenarios().find((s) => s.id === b.scenario);
    if (!sc) {
      out.push(`blocks[${i}]: unknown scenario "${b.scenario}"`);
      return;
    }
    const ids = b.dials.map((d) => d.id);
    const applied = generate({ scenario: b.scenario, variant: b.variant, seed: b.seed, dials: startDials(sc, b.variant, ids) }).applied;
    const realised = realisedDials(ids, applied);
    for (const id of ids) if (!realised.includes(id)) out.push(`blocks[${i}].dials: "${id}" is not realised for "${b.scenario}"`);
  });
  return out;
}

/** What each lesson's family checks must be about: the item's own findings must hit one of these. */
const CHECK_TOPIC: Readonly<Record<string, readonly FindingId[]>> = {
  h1: ['lae', 'rae', 'biatrial-abnormality', 'interatrial-block'],
  h2: ['lvh', 'lvh-strain'],
  h3: ['rvh', 'biventricular-hypertrophy', 'copd-pattern'],
  h4: ['low-voltage', 'electrical-alternans', 'pericardial-effusion'],
  h5: ['hcm', 'apical-hcm'],
  h6: ['arvc', 'epsilon-wave'],
  h7: [],
  h8: ['brugada-type1', 'brugada-type2', 'early-repolarization'],
  h9: ['athlete-changes', 'hcm'],
};

describe('stage H lessons', () => {
  it('all nine lessons load in order', () => {
    expect(lessons.map((x) => x.id)).toEqual(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9']);
    expect(lessons.map((x) => x.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  for (const lesson of lessons) {
    describe(lesson.id, () => {
      it('validates against the live catalogues with no errors and no warnings', () => {
        const issues = validateLesson(lesson, liveValidateDeps(lesson.id));
        expect(formatIssues(issues), `lesson ${lesson.id}`).toBe('');
      });

      it('follows the lesson anatomy: hook first, worked example before practice, summary last', () => {
        const kinds = lesson.blocks.map((b) => b.kind);
        expect(lesson.stage).toBe('H');
        expect(kinds[0]).toBe('hook');
        expect(kinds[kinds.length - 1]).toBe('summary');
        const firstWorked = kinds.indexOf('worked');
        const firstPractice = kinds.findIndex((k) => k === 'check' || k === 'drill');
        expect(firstWorked).toBeGreaterThanOrEqual(0);
        expect(firstPractice).toBeGreaterThan(firstWorked);
        for (const k of ['criteria', 'contrast', 'drill', 'pitfalls'] as const) expect(kinds, `${lesson.id} has a ${k} block`).toContain(k);
        if (NO_REAL_CASE.has(lesson.id)) expect(kinds).not.toContain('real');
        else expect(kinds).toContain('real');
        const summary = lesson.blocks[lesson.blocks.length - 1];
        if (summary.kind === 'summary') {
          expect(summary.points.length).toBeGreaterThanOrEqual(3);
          expect(summary.points.length).toBeLessThanOrEqual(5);
        }
        expect(lesson.sources.length).toBeGreaterThanOrEqual(2);
        expect(lesson.sources.some((s) => s.startsWith('Castellano et al. 2004'))).toBe(true);
      });

      it('every live-block dial is realised by the engine', () => {
        expect(unrealisedLiveDials(lesson)).toEqual([]);
      });

      it('every synthetic ECG it shows can be generated', () => {
        const failures: string[] = [];
        for (const { path, src } of sourcesOf(lesson)) {
          if (src.kind !== 'synth') continue;
          try {
            const r = generate(src.req);
            if (!r.ecg.truth || r.ecg.truth.beats.length === 0) failures.push(`${path}: no beats`);
          } catch (e) {
            failures.push(`${path}: ${String(e)}`);
          }
        }
        expect(failures).toEqual([]);
      });

      it('every family check generates an item on the lesson topic', async () => {
        const failures: string[] = [];
        const topic = CHECK_TOPIC[lesson.id];
        for (const [i, b] of lesson.blocks.entries()) {
          if (b.kind !== 'check' || 'inline' in b.item) continue;
          try {
            const item = await generateItem(b.item.family, b.item.seed, b.item.difficulty);
            if (item.family !== b.item.family) failures.push(`blocks[${i}]: got family ${item.family}`);
            if (topic.length > 0 && !item.findings.some((f) => topic.includes(f))) failures.push(`blocks[${i}] (${b.item.family}#${b.item.seed}): off topic [${item.findings.join(', ')}]`);
          } catch (e) {
            failures.push(`blocks[${i}] (${b.item.family}#${b.item.seed}): ${String(e)}`);
          }
        }
        expect(failures).toEqual([]);
      });
    });
  }
});

// ── the text: complete, current terms, Spain-Spanish numbers ─────────────────────────────────────────────────────────

function texts(v: unknown, path = ''): { readonly path: string; readonly t: L10n }[] {
  if (Array.isArray(v)) return v.flatMap((x, i) => texts(x, `${path}[${i}]`));
  if (typeof v !== 'object' || v === null) return [];
  const o = v as Record<string, unknown>;
  if (typeof o.zh === 'string' && typeof o.en === 'string' && typeof o.es === 'string') return [{ path, t: o as unknown as L10n }];
  return Object.entries(o).flatMap(([k, x]) => texts(x, path ? `${path}.${k}` : k));
}

describe('stage H text', () => {
  // Same lists as stage S, except that stage H deliberately names the retired words "strain" (劳损) and "sobrecarga
  // sistólica" in order to retire them, so those two are not banned here.
  const OUTDATED: Readonly<Record<'zh' | 'en' | 'es', RegExp>> = {
    zh: /半支阻滞|心房肥大|类本位曲折|病窦综合征|结性心律/,
    en: /intrinsicoid|hemiblock|sick sinus|nodal rhythm|\bPSVT\b|strain pattern|atrial enlargement|Lown/i,
    es: /hemibloqueo|\bHAI\b|crecimiento auricular|intrinsecoide|enfermedad del seno|\bnodal\b|\batrios?\b|computadora|\bderivadas?\b|pectus excavado/i,
  };
  for (const lesson of lessons) {
    it(`${lesson.id}: zh / en / es complete and translated, current terms, decimal comma in Spanish`, () => {
      for (const { path, t } of texts(lesson)) {
        for (const k of ['zh', 'en', 'es'] as const) {
          expect(t[k].trim(), `${path}.${k} is empty`).not.toBe('');
          expect(OUTDATED[k].test(t[k]), `${path}.${k}: outdated or non-standard term in "${t[k]}"`).toBe(false);
        }
        const eponym = t.zh === t.en && t.en === t.es; // a proper name (e.g. "Sokolow-Lyon") is the same in all three
        if (!eponym && /[A-Za-z]{4,}/.test(t.en)) expect(/[㐀-鿿]/.test(t.zh), `${path}.zh is not Chinese: "${t.zh}"`).toBe(true);
        if (/[a-z]{4,}\s+[a-z]{4,}/i.test(t.en)) expect(t.es, `${path}.es is not translated`).not.toBe(t.en);
        expect(/\d\.\d/.test(t.es), `${path}.es: Spanish uses a decimal comma: "${t.es}"`).toBe(false);
        expect(/\d,\d/.test(t.en), `${path}.en: English uses a decimal point: "${t.en}"`).toBe(false);
      }
    });
  }
});

// ── what the text says is on the tracing ──────────────────────────────────────────────────────────────────────────

type BlockOf<K extends Block['kind']> = Extract<Block, { kind: K }>;
const byId = new Map(lessons.map((x) => [x.id, x]));
function blocksOf<K extends Block['kind']>(id: string, kind: K): BlockOf<K>[] {
  const x = byId.get(id);
  if (!x) throw new Error(`no lesson ${id}`);
  return x.blocks.filter((b): b is BlockOf<K> => b.kind === kind);
}

const cache = new Map<string, Ecg>();
function ecgOf(src: EcgSource | SynthRequest): Ecg {
  const req = 'kind' in src ? (src.kind === 'synth' ? src.req : null) : src;
  if (!req) throw new Error('expected a synthetic source');
  const k = JSON.stringify(req);
  let e = cache.get(k);
  if (!e) {
    e = generate(req).ecg;
    cache.set(k, e);
  }
  return e;
}

const LIMB: readonly StdLead[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];
const CHEST: readonly StdLead[] = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
const midBeat = (ecg: Ecg): BeatMarks => ecg.truth!.beats[Math.floor(ecg.truth!.beats.length / 2)];
function span(ecg: Ecg, lead: StdLead, t0: number, t1: number, b: BeatMarks) {
  const a = ecg.signal.leads[lead];
  const fs = ecg.signal.fs;
  const base = baselineBefore(a, fs, b.qrsOn);
  let max = -Infinity;
  let min = Infinity;
  for (let i = Math.max(0, Math.round((t0 * fs) / 1000)); i <= Math.min(a.length - 1, Math.round((t1 * fs) / 1000)); i++) {
    max = Math.max(max, a[i] - base);
    min = Math.min(min, a[i] - base);
  }
  return { max, min, net: max + min, p2p: max - min };
}
const qrs = (ecg: Ecg, lead: StdLead, b = midBeat(ecg)) => span(ecg, lead, b.qrsOn, b.qrsOff, b);
const pw = (ecg: Ecg, lead: StdLead, b = midBeat(ecg)) => span(ecg, lead, b.pOn!, b.pOff!, b);
const tw = (ecg: Ecg, lead: StdLead, b = midBeat(ecg)) => span(ecg, lead, b.j + 40, b.tOff, b);
const tInverted = (ecg: Ecg, lead: StdLead) => tw(ecg, lead).min < -0.1 && -tw(ecg, lead).min > tw(ecg, lead).max;
const tUpright = (ecg: Ecg, lead: StdLead) => tw(ecg, lead).max > 0.1 && tw(ecg, lead).max > -tw(ecg, lead).min;
function stAt(ecg: Ecg, lead: StdLead, plusMs = 0, b = midBeat(ecg)): number {
  const a = ecg.signal.leads[lead];
  const fs = ecg.signal.fs;
  const x = ((b.j + plusMs) * fs) / 1000;
  const i = Math.floor(x);
  return a[i] * (1 - (x - i)) + a[i + 1] * (x - i) - baselineBefore(a, fs, b.qrsOn);
}
const waves = (ecg: Ecg, lead: StdLead, b = midBeat(ecg)) => qrsWaves(ecg.signal.leads[lead], ecg.signal.fs, b.qrsOn, b.qrsOff);
const hasRPrime = (ecg: Ecg, lead: StdLead): boolean => waves(ecg, lead).some((w) => w.role === 'r' && w.label.includes('′'));
/** initial q: depth (mV, positive) and time of its nadir after QRS onset (ms); 0 when the QRS does not start negative */
function initialQ(ecg: Ecg, lead: StdLead): { depth: number; atMs: number } {
  const b = midBeat(ecg);
  const w = waves(ecg, lead)[0];
  return w && w.role === 'q' ? { depth: -w.mv, atMs: w.t - b.qrsOn } : { depth: 0, atMs: 0 };
}
/** P samples in a lead (mV above the PR baseline), one per ms over [pOn, pOff] */
function pSamples(ecg: Ecg, lead: StdLead, b = midBeat(ecg)): number[] {
  const a = ecg.signal.leads[lead];
  const fs = ecg.signal.fs;
  const base = baselineBefore(a, fs, b.qrsOn);
  const out: number[] = [];
  for (let t = b.pOn!; t <= b.pOff!; t += 1) {
    const x = (t * fs) / 1000;
    const i = Math.floor(x);
    out.push(a[i] * (1 - (x - i)) + a[i + 1] * (x - i) - base);
  }
  return out;
}
const sokolow = (e: Ecg) => -qrs(e, 'V1').min + Math.max(qrs(e, 'V5').max, qrs(e, 'V6').max);
const cornell = (e: Ecg) => qrs(e, 'aVL').max - qrs(e, 'V3').min;
const deepestS = (e: Ecg): StdLead => [...LIMB, ...CHEST].reduce((best, l) => (qrs(e, l).min < qrs(e, best).min ? l : best));
const peguero = (e: Ecg) => -qrs(e, deepestS(e)).min - qrs(e, 'V4').min;

describe('h1: the P wave on the tracings', () => {
  const laes = () => [blocksOf('h1', 'hook')[0].ecg, blocksOf('h1', 'worked')[0].ecg, blocksOf('h1', 'contrast')[0].right.ecg].map(ecgOf);
  it('LAE (hook, worked, contrast B): P about 150 ms, not tall, notched in II with peaks >= 40 ms apart', () => {
    for (const e of laes()) {
      const b = midBeat(e);
      expect(b.pOff! - b.pOn!).toBeGreaterThanOrEqual(140);
      expect(b.pOff! - b.pOn!).toBeLessThan(160);
      expect(pw(e, 'II').max).toBeLessThan(0.25);
      const p = pSamples(e, 'II');
      const peaks = p.map((v, i) => (i > 3 && i < p.length - 4 && v > 0.02 && v >= p[i - 3] && v >= p[i + 3] && v > p[i - 1] - 1e-9 && v >= p[i + 1] ? i : -1)).filter((i) => i >= 0);
      expect(peaks.length, 'two humps').toBeGreaterThanOrEqual(2);
      expect(peaks[peaks.length - 1] - peaks[0]).toBeGreaterThanOrEqual(40);
    }
  });
  it('LAE worked: V1 terminal negativity about 1 mm (0.9) deep and about 75 ms long (PTF about 0.07 mm·s)', () => {
    const e = ecgOf(blocksOf('h1', 'worked')[0].ecg);
    const p = pSamples(e, 'V1');
    const neg = p.filter((v) => v < -0.01).length; // ms below the baseline
    const depth = -Math.min(...p);
    expect(depth).toBeGreaterThan(0.08);
    expect(depth).toBeLessThan(0.11);
    expect(Math.abs(neg - 75)).toBeLessThan(10);
    expect(depth * 10 * (neg / 1000)).toBeGreaterThan(0.06);
    expect(depth * 10 * (neg / 1000)).toBeLessThan(0.08);
  });
  it('RAE (ecg, contrast A): P >= 2.5 mm in II, duration < 120 ms, initial V1 positivity > 1.5 mm', () => {
    for (const src of [blocksOf('h1', 'ecg')[0].ecg, blocksOf('h1', 'contrast')[0].left.ecg]) {
      const e = ecgOf(src);
      const b = midBeat(e);
      expect(pw(e, 'II').max).toBeGreaterThanOrEqual(0.25);
      expect(b.pOff! - b.pOn!).toBeLessThan(120);
      expect(pw(e, 'V1').max).toBeGreaterThan(0.15);
    }
  });
  it('advanced interatrial block: P >= 120 ms, biphasic +/− in II, III and aVF', () => {
    const e = ecgOf(blocksOf('h1', 'ecg')[1].ecg);
    const b = midBeat(e);
    expect(b.pOff! - b.pOn!).toBeGreaterThanOrEqual(120);
    for (const l of ['II', 'III', 'aVF'] as const) {
      const p = pSamples(e, l);
      const iMax = p.indexOf(Math.max(...p));
      const iMin = p.indexOf(Math.min(...p));
      expect(p[iMax], l).toBeGreaterThan(0.05);
      expect(p[iMin], l).toBeLessThan(-0.02);
      expect(iMin, `${l}: positive first, negative last`).toBeGreaterThan(iMax);
    }
  });
  it('biatrial: II tall and broad (> 2.5 mm, >= 120 ms); V1 borderline: initial about 1.5 mm, terminal about 0.9 mm', () => {
    const e = ecgOf(blocksOf('h1', 'ecg')[2].ecg);
    const b = midBeat(e);
    expect(pw(e, 'II').max).toBeGreaterThan(0.25);
    expect(b.pOff! - b.pOn!).toBeGreaterThanOrEqual(120);
    expect(pw(e, 'V1').max).toBeGreaterThan(0.13);
    expect(pw(e, 'V1').max).toBeLessThan(0.17);
    expect(pw(e, 'V1').min).toBeLessThan(-0.07);
    expect(pw(e, 'V1').min).toBeGreaterThan(-0.1);
  });
});

describe('h2: LVH voltage and secondary ST–T on the tracings', () => {
  it('hook and worked: Sokolow-Lyon > 35 mm, Cornell > 28 mm and Peguero ≥ 28 mm (positive even at the male cut-offs); deepest S in V3', () => {
    for (const src of [blocksOf('h2', 'hook')[0].ecg, blocksOf('h2', 'worked')[0].ecg]) {
      const e = ecgOf(src);
      expect(sokolow(e)).toBeGreaterThan(3.5);
      expect(cornell(e)).toBeGreaterThan(2.8);
      expect(cornell(e)).toBeLessThan(4.0);
      expect(peguero(e)).toBeGreaterThanOrEqual(2.8);
      expect(peguero(e)).toBeLessThan(4.5);
      expect(deepestS(e)).toBe('V3');
      expect(qrs(e, 'aVL').max).toBeLessThan(1.1);
    }
  });
  it('secondary ST–T (hook, worked, ecg, contrast B): ST depression and T inversion in V5–V6, T inverted in I and aVL, mirror ST elevation in V1–V2', () => {
    for (const src of [blocksOf('h2', 'hook')[0].ecg, blocksOf('h2', 'worked')[0].ecg, blocksOf('h2', 'ecg')[0].ecg, blocksOf('h2', 'contrast')[0].right.ecg]) {
      const e = ecgOf(src);
      for (const l of ['I', 'aVL', 'V5', 'V6'] as const) expect(tInverted(e, l), l).toBe(true);
      for (const l of ['V5', 'V6'] as const) expect(stAt(e, l, 60), l).toBeLessThan(-0.05);
      expect(stAt(e, 'V6', 60)).toBeLessThan(-0.08);
      for (const l of ['V1', 'V2'] as const) expect(stAt(e, l, 60), l).toBeGreaterThan(0.1);
    }
  });
  it('contrast: Sokolow-Lyon positive on both sides; A keeps upright T in V5–V6', () => {
    const c = blocksOf('h2', 'contrast')[0];
    const a = ecgOf(c.left.ecg);
    expect(sokolow(a)).toBeGreaterThan(3.5);
    expect(sokolow(ecgOf(c.right.ecg))).toBeGreaterThan(3.5);
    for (const l of ['V5', 'V6'] as const) expect(tUpright(a, l), l).toBe(true);
  });
});

describe('h3: RVH and right-heart load on the tracings', () => {
  it('hook and worked: narrow QRS, normal PR, axis about +120° (RAD ≥ +110°), tall R in V1 with almost no S, RV1 + SV5 > 10.5 mm, R/S < 1 in V5–V6, small R in aVR', () => {
    for (const src of [blocksOf('h3', 'hook')[0].ecg, blocksOf('h3', 'worked')[0].ecg]) {
      const e = ecgOf(src);
      const t = e.truth!;
      expect(t.qrsMs).toBeLessThan(120);
      expect(t.prMs!).toBeGreaterThan(120);
      expect(t.prMs!).toBeLessThan(200);
      expect(t.axisDeg.qrs).toBeGreaterThanOrEqual(110);
      expect(t.axisDeg.qrs).toBeLessThan(130);
      expect(qrs(e, 'V1').max).toBeGreaterThan(1.6);
      expect(qrs(e, 'V1').max).toBeLessThan(1.95);
      expect(qrs(e, 'V1').min).toBeGreaterThan(-0.2);
      expect(qrs(e, 'V1').max - qrs(e, 'V5').min).toBeGreaterThan(1.05);
      expect(-qrs(e, 'V5').min).toBeGreaterThan(0.85);
      expect(-qrs(e, 'V5').min).toBeLessThan(1.1);
      expect(qrs(e, 'aVR').max).toBeLessThan(0.5);
      for (const l of ['V5', 'V6'] as const) expect(qrs(e, l).max / -qrs(e, l).min, l).toBeLessThan(1);
    }
  });
  it('worked: T shallowly inverted in V1 only, upright from V2', () => {
    const e = ecgOf(blocksOf('h3', 'worked')[0].ecg);
    expect(tInverted(e, 'V1')).toBe(true);
    expect(tw(e, 'V1').min).toBeGreaterThan(-0.2);
    for (const l of ['V2', 'V3'] as const) expect(tUpright(e, l), l).toBe(true);
  });
  it('strain variant: deep T inversion in V1–V2, only a trace in V3, inverted in III and shallow in aVF', () => {
    const e = ecgOf(blocksOf('h3', 'ecg')[0].ecg);
    for (const l of ['V1', 'V2'] as const) expect(tw(e, l).min, l).toBeLessThan(-0.65);
    expect(tw(e, 'V3').min).toBeGreaterThan(-0.15);
    expect(tInverted(e, 'III')).toBe(true);
    expect(tw(e, 'aVF').min).toBeLessThan(-0.05);
  });
  it('COPD pattern: P about 3 mm in II/III/aVF, QRS axis about +95°, limb leads NOT low (II about 7 mm), R in V1 < 1 mm', () => {
    const e = ecgOf(blocksOf('h3', 'ecg')[1].ecg);
    for (const l of ['II', 'III', 'aVF'] as const) expect(pw(e, l).max, l).toBeGreaterThanOrEqual(0.25);
    expect(e.truth!.axisDeg.qrs).toBeGreaterThan(85);
    expect(e.truth!.axisDeg.qrs).toBeLessThan(110);
    expect(qrs(e, 'II').p2p).toBeGreaterThan(0.5);
    expect(qrs(e, 'V1').max).toBeLessThan(0.1);
  });
  it('biventricular: axis > +90°, R V1 about 11 mm, S V3 about 25 mm (Peguero about 40 mm) while Sokolow-Lyon stays about 11 mm', () => {
    const e = ecgOf(blocksOf('h3', 'contrast')[0].right.ecg);
    expect(e.truth!.axisDeg.qrs).toBeGreaterThan(90);
    expect(qrs(e, 'V1').max).toBeGreaterThan(0.9);
    expect(-qrs(e, 'V3').min).toBeGreaterThan(2.2);
    expect(peguero(e)).toBeGreaterThan(2.8);
    expect(sokolow(e)).toBeLessThan(1.5);
  });
});

describe('h4: low voltage and alternans on the tracings', () => {
  it('hook and worked: every limb QRS < 5 mm and every precordial QRS < 10 mm peak to peak, rate 70–90 (nothing points to a cause)', () => {
    for (const src of [blocksOf('h4', 'hook')[0].ecg, blocksOf('h4', 'worked')[0].ecg, blocksOf('h4', 'contrast')[0].left.ecg]) {
      const e = ecgOf(src);
      for (const l of LIMB) expect(qrs(e, l).p2p, l).toBeLessThan(0.5);
      for (const l of CHEST) expect(qrs(e, l).p2p, l).toBeLessThan(1.0);
      expect(e.truth!.hrBpm).toBeGreaterThan(65);
      expect(e.truth!.hrBpm).toBeLessThan(90);
    }
  });
  it('emphysema: precordial QRS < 10 mm, limb QRS < 5 mm (II, III, aVF about 4–5 mm), vertical axis 60–90°, P in II about 1 mm', () => {
    const e = ecgOf(blocksOf('h4', 'ecg')[0].ecg);
    for (const l of CHEST) expect(qrs(e, l).p2p, l).toBeLessThan(1.0);
    for (const l of LIMB) expect(qrs(e, l).p2p, l).toBeLessThan(0.5);
    for (const l of ['II', 'III', 'aVF'] as const) expect(qrs(e, l).p2p, l).toBeGreaterThanOrEqual(0.4);
    expect(e.truth!.axisDeg.qrs).toBeGreaterThan(60);
    expect(e.truth!.axisDeg.qrs).toBeLessThan(90);
    expect(pw(e, 'II').max).toBeLessThan(0.15);
  });
  it('electrical alternans: V3 alternates (about 16 vs 6 mm) beat to beat while lead II alternates only about 1 mm; ~110/min with low limb voltage', () => {
    const b = blocksOf('h4', 'ecg')[1];
    expect(b.view?.lead).toBe('V3');
    const e = ecgOf(b.ecg);
    const beats = e.truth!.beats;
    for (let k = 2; k < beats.length - 2; k++) {
      const a = qrs(e, 'V3', beats[k]).p2p;
      const c = qrs(e, 'V3', beats[k + 1]).p2p;
      expect(Math.max(a, c) / Math.min(a, c)).toBeGreaterThan(1.6);
      const d = Math.abs(qrs(e, 'II', beats[k]).p2p - qrs(e, 'II', beats[k + 1]).p2p);
      expect(d).toBeGreaterThan(0.04);
      expect(d).toBeLessThan(0.15);
    }
    expect(e.truth!.hrBpm).toBeGreaterThan(102);
    expect(e.truth!.hrBpm).toBeLessThan(120);
    for (const l of LIMB) expect(qrs(e, l).p2p, l).toBeLessThan(0.5);
  });
  it('effusion without alternans: about 106/min, every limb QRS < 5 mm', () => {
    const e = ecgOf(blocksOf('h4', 'ecg')[2].ecg);
    expect(Math.abs(e.truth!.hrBpm - 106)).toBeLessThan(3);
    for (const l of LIMB) expect(qrs(e, l).p2p, l).toBeLessThan(0.5);
  });
});

describe('h5: HCM on the tracings', () => {
  it('hook: narrow lateral q (< 20 ms to its nadir), about 3.5 mm in aVL and V6, smaller in I and V5; Sokolow-Lyon > 35 mm', () => {
    const e = ecgOf(blocksOf('h5', 'hook')[0].ecg);
    for (const l of ['aVL', 'V6'] as const) expect(initialQ(e, l).depth, l).toBeGreaterThan(0.3);
    for (const l of ['I', 'V5'] as const) {
      expect(initialQ(e, l).depth, l).toBeGreaterThan(0.15);
      expect(initialQ(e, l).depth, l).toBeLessThan(0.3);
    }
    for (const l of ['I', 'aVL', 'V5', 'V6'] as const) expect(initialQ(e, l).atMs, l).toBeLessThan(20);
    expect(sokolow(e)).toBeGreaterThan(3.5);
  });
  it('worked: q > 3 mm in aVL and V6, about 2 mm in I and V5; P < 115 ms and no V1 terminal negativity (no LAE on this tracing)', () => {
    const e = ecgOf(blocksOf('h5', 'worked')[0].ecg);
    for (const l of ['aVL', 'V6'] as const) expect(initialQ(e, l).depth, l).toBeGreaterThan(0.3);
    for (const l of ['I', 'V5'] as const) expect(initialQ(e, l).depth, l).toBeLessThan(0.25);
    const b = midBeat(e);
    expect(b.pOff! - b.pOn!).toBeLessThan(115);
    expect(pw(e, 'V1').min).toBeGreaterThan(-0.05);
    expect(qrs(e, 'V1').max).toBeGreaterThan(0.6);
  });
  it('repolarisation variant: lateral ST depression and T inversion (V5–V6, I, aVL)', () => {
    const e = ecgOf(blocksOf('h5', 'ecg')[0].ecg);
    for (const l of ['I', 'aVL', 'V5', 'V6'] as const) expect(tInverted(e, l), l).toBe(true);
    for (const l of ['V5', 'V6'] as const) expect(stAt(e, l, 60), l).toBeLessThan(-0.05);
  });
  it('apical: giant T inversion deepest in V4 (about 20 mm) and V5 (about 18 mm), about 10 mm in V3 and V6, shallow in V2, inverted in I, II, aVL; tall R in V5', () => {
    const e = ecgOf(blocksOf('h5', 'ecg')[1].ecg);
    expect(tw(e, 'V4').min).toBeLessThanOrEqual(-1.7);
    expect(tw(e, 'V5').min).toBeLessThan(-1.5);
    for (const l of ['V3', 'V6'] as const) {
      expect(tw(e, l).min, l).toBeLessThan(-0.9);
      expect(tw(e, l).min, l).toBeGreaterThan(tw(e, 'V5').min);
    }
    for (const l of ['I', 'II', 'aVL'] as const) expect(tInverted(e, l), l).toBe(true);
    expect(tw(e, 'V2').min).toBeGreaterThan(-0.3);
    expect(qrs(e, 'V5').max).toBeGreaterThan(1.3);
  });
  it('contrast: HCM keeps a narrow q + tall R in aVL; the old lateral infarct writes a QS in aVL', () => {
    const c = blocksOf('h5', 'contrast')[0];
    const a = ecgOf(c.left.ecg);
    expect(initialQ(a, 'aVL').depth).toBeGreaterThan(0.3);
    expect(qrs(a, 'aVL').max).toBeGreaterThan(0.4);
    expect(waves(ecgOf(c.right.ecg), 'aVL').map((w) => w.role)).toEqual(['qs']);
  });
});

describe('h6: ARVC on the tracings', () => {
  it('every ARVC tracing: QRS < 120 ms, T inverted V1–V3, epsilon wave in the truth', () => {
    for (const { src } of sourcesOf(h6)) {
      if (src.kind !== 'synth' || src.req.scenario !== 'arvc') continue;
      const e = ecgOf(src);
      expect(e.truth!.qrsMs).toBeLessThan(120);
      for (const l of ['V1', 'V2', 'V3'] as const) expect(tInverted(e, l), l).toBe(true);
      expect(e.truth!.findings).toContain('epsilon-wave');
    }
  });
  it('contrast B (iRBBB): r′ in V1, QRS < 120 ms', () => {
    const e = ecgOf(blocksOf('h6', 'contrast')[0].right.ecg);
    expect(hasRPrime(e, 'V1')).toBe(true);
    expect(e.truth!.qrsMs).toBeLessThan(120);
  });
});

describe('h7: QT on the tracings', () => {
  it('hook and worked: 60/min, QT = QTc about 515 ms (>= 480 and > 500 ms)', () => {
    for (const src of [blocksOf('h7', 'hook')[0].ecg, blocksOf('h7', 'worked')[0].ecg]) {
      const t = ecgOf(src).truth!;
      expect(Math.abs(t.hrBpm - 60)).toBeLessThan(1.5);
      expect(t.qtcBazettMs).toBeGreaterThan(500);
      expect(Math.abs(t.qtcBazettMs - 515)).toBeLessThan(12);
    }
  });
  it('live: the QTc dial really moves the QTc across 500 ms (490 → 560)', () => {
    const b = blocksOf('h7', 'live')[0];
    const at = (qtc: number) => generate({ scenario: b.scenario, variant: b.variant, seed: b.seed, dials: { rate: 64, qtc } }).ecg.truth!.qtcBazettMs;
    expect(at(490)).toBeLessThan(500);
    expect(at(560)).toBeGreaterThan(540);
  });
  it('LQT1 vs LQT3: both QTc > 480 ms; LQT3 has the later T peak and the narrower T', () => {
    const c = blocksOf('h7', 'contrast')[0];
    const a = ecgOf(c.left.ecg);
    const b = ecgOf(c.right.ecg);
    for (const e of [a, b]) expect(e.truth!.qtcBazettMs).toBeGreaterThan(480);
    const peak = (e: Ecg) => midBeat(e).tPeak! - midBeat(e).j;
    const width = (e: Ecg) => midBeat(e).tOff - midBeat(e).tPeak!;
    expect(peak(b)).toBeGreaterThan(peak(a) + 40);
    expect(width(b)).toBeLessThan(width(a));
  });
  it('LQT2 shape: QTc about 520 ms, low T in II (< 2.5 mm), a bifid T in V3 with humps about 100 ms apart', () => {
    const e = ecgOf(blocksOf('h7', 'ecg')[0].ecg);
    const b = midBeat(e);
    expect(Math.abs(e.truth!.qtcBazettMs - 520)).toBeLessThan(15);
    expect(tw(e, 'II').max).toBeLessThan(0.25);
    const a = e.signal.leads.V3;
    const fs = e.signal.fs;
    const base = baselineBefore(a, fs, b.qrsOn);
    const v = (ms: number) => a[Math.round((ms * fs) / 1000)] - base;
    const humps: number[] = [];
    for (let ms = b.j + 60; ms <= b.tOff - 10; ms += 2) if (v(ms) > 0.2 && v(ms) >= v(ms - 10) && v(ms) > v(ms + 10)) humps.push(ms);
    expect(humps.length).toBeGreaterThanOrEqual(2);
    expect(humps[humps.length - 1] - humps[0]).toBeGreaterThan(70);
    const notch = Math.min(...Array.from({ length: humps[humps.length - 1] - humps[0] }, (_, k) => v(humps[0] + k)));
    expect(notch).toBeLessThan(Math.min(v(humps[0]), v(humps[humps.length - 1])) - 0.05);
  });
  it('hypokalaemia shows U waves; the true long QT does not reach its QTc through a U', () => {
    const c = blocksOf('h7', 'contrast')[1];
    expect(ecgOf(c.left.ecg).truth!.findings).toContain('u-waves');
    expect(ecgOf(c.right.ecg).truth!.findings).not.toContain('u-waves');
  });
  it('short QT: QTc <= 330 ms', () => {
    expect(ecgOf(blocksOf('h7', 'contrast')[3].left.ecg).truth!.qtcBazettMs).toBeLessThanOrEqual(330);
  });
});

describe('h8: Brugada and early repolarisation on the tracings', () => {
  it('type 1 (hook, heart, worked): coved J >= 2 mm descending into a negative T in V1–V2, V3 spared, no broad S in V6 or I', () => {
    for (const src of [blocksOf('h8', 'hook')[0].ecg, blocksOf('h8', 'heart')[0].ecg, blocksOf('h8', 'worked')[0].ecg]) {
      const e = ecgOf(src);
      for (const l of ['V1', 'V2'] as const) {
        expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.2);
        expect(stAt(e, l, 60), l).toBeLessThan(stAt(e, l));
        expect(tw(e, l).min, l).toBeLessThan(-0.2);
      }
      expect(Math.abs(stAt(e, 'V3'))).toBeLessThan(0.05);
      for (const l of ['V6', 'I'] as const) expect(qrs(e, l).min, l).toBeGreaterThan(-0.1);
    }
  });
  it('type 2: J >= 2 mm in V2 with an upright T (saddleback)', () => {
    const e = ecgOf(blocksOf('h8', 'contrast')[0].left.ecg);
    expect(stAt(e, 'V2')).toBeGreaterThanOrEqual(0.2);
    expect(tUpright(e, 'V2')).toBe(true);
  });
  it('iRBBB: r′ in V1, QRS < 120 ms, a terminal S in V6', () => {
    const e = ecgOf(blocksOf('h8', 'contrast')[0].right.ecg);
    expect(hasRPrime(e, 'V1')).toBe(true);
    expect(e.truth!.qrsMs).toBeLessThan(120);
    expect(qrs(e, 'V6').min).toBeLessThan(-0.15);
  });
  it('early repolarisation: J about 1–1.5 mm in II, III, aVF and V4–V6 (inferolateral); V2–V3 < 2.5 mm; QRS < 120 ms', () => {
    const e = ecgOf(blocksOf('h8', 'ecg')[0].ecg);
    for (const l of ['II', 'III', 'aVF', 'V4', 'V5', 'V6'] as const) {
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.09);
      expect(stAt(e, l), l).toBeLessThan(0.2);
    }
    for (const l of ['V2', 'V3'] as const) expect(stAt(e, l), l).toBeLessThan(0.25);
    expect(e.truth!.qrsMs).toBeLessThan(120);
  });
  it('live (early repolarisation): the st dial moves the whole pattern — V2 J about 0.6–1.3 mm, II about 0.8–1.6 mm — with V6 ST/T < 0.25 throughout', () => {
    const b = blocksOf('h8', 'live')[0];
    expect(b.view).toEqual({ layout: 'strip', lead: 'V2' });
    const at = (st: number) => ecgOf({ scenario: b.scenario, variant: b.variant, seed: b.seed, dials: { st } });
    const lo = at(0.06);
    const hi = at(0.14);
    expect(stAt(lo, 'V2')).toBeLessThan(0.08);
    expect(stAt(hi, 'V2')).toBeGreaterThan(0.12);
    expect(stAt(lo, 'II')).toBeGreaterThan(0.06);
    expect(stAt(lo, 'II')).toBeLessThan(0.1);
    expect(stAt(hi, 'II')).toBeGreaterThan(0.14);
    expect(stAt(hi, 'II')).toBeLessThan(0.18);
    for (const l of ['II', 'V5'] as const) expect(stAt(hi, l) - stAt(lo, l), l).toBeGreaterThan(0.06);
    for (const e of [lo, hi]) expect(stAt(e, 'V6', 60) / tw(e, 'V6').max).toBeLessThan(0.25);
  });
});

describe('h9: the athlete ECG on the tracings', () => {
  it('hook and worked: 44–48/min, PR about 160 ms, QRS 110–119 ms with r′ in V1, Sokolow-Lyon >= 35 mm, J about 1–1.5 mm in V5 with no ST depression, T inverted only in V1–V2 (V2 shallow)', () => {
    for (const src of [blocksOf('h9', 'hook')[0].ecg, blocksOf('h9', 'worked')[0].ecg]) {
      const e = ecgOf(src);
      const t = e.truth!;
      expect(t.hrBpm).toBeGreaterThan(43);
      expect(t.hrBpm).toBeLessThan(49);
      expect(Math.abs(t.prMs! - 160)).toBeLessThan(8);
      expect(t.qrsMs).toBeGreaterThanOrEqual(110);
      expect(t.qrsMs).toBeLessThan(120);
      expect(hasRPrime(e, 'V1')).toBe(true);
      expect(sokolow(e)).toBeGreaterThanOrEqual(3.5);
      expect(stAt(e, 'V5')).toBeGreaterThan(0.08);
      expect(stAt(e, 'V5')).toBeLessThan(0.18);
      expect(stAt(e, 'V5', 60)).toBeGreaterThan(0);
      expect(tInverted(e, 'V1')).toBe(true);
      expect(tw(e, 'V2').min).toBeGreaterThan(-0.25);
      for (const l of ['V3', 'V4', 'V5', 'V6', 'I', 'II'] as const) expect(tUpright(e, l), l).toBe(true);
    }
  });
  it('first-degree variant: PR about 220 ms', () => {
    expect(Math.abs(ecgOf(blocksOf('h9', 'ecg')[0].ecg).truth!.prMs! - 220)).toBeLessThan(10);
  });
  it('contrast: A has upright lateral T; B (HCM) lateral T inversion >= 1 mm with ST depression >= 0.5 mm', () => {
    const c = blocksOf('h9', 'contrast')[0];
    const a = ecgOf(c.left.ecg);
    const b = ecgOf(c.right.ecg);
    for (const l of ['V5', 'V6'] as const) {
      expect(tUpright(a, l), l).toBe(true);
      expect(tInverted(b, l), l).toBe(true);
      expect(stAt(b, l, 60), l).toBeLessThanOrEqual(-0.05);
    }
  });
});
