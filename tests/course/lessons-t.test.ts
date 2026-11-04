/**
 * Stage T lessons (t1–t7, docs/PLAN.md §3): every lesson validates against the live catalogues with no errors and no
 * warnings, follows the lesson anatomy, every live-block dial is realised, every family check generates an item on the
 * lesson's topic, every real case carries the label the caption claims, and what the text says is on each synthetic
 * tracing is measurable on the signal (retrograde P′ polarity, flutter ratios, delta polarity, AV dissociation,
 * capture/fusion beats, the long sinus QT before torsades, the artefact with the QRS marching through).
 */
import { describe, expect, it } from 'vitest';
import type { Block, Lesson } from '../../src/course/api';
import { liveValidateDeps } from '../../src/course/deps';
import t1 from '../../src/course/lessons/t1';
import t2 from '../../src/course/lessons/t2';
import t3 from '../../src/course/lessons/t3';
import t4 from '../../src/course/lessons/t4';
import t5 from '../../src/course/lessons/t5';
import t6 from '../../src/course/lessons/t6';
import t7 from '../../src/course/lessons/t7';
import { realisedDials, startDials } from '../../src/course/live';
import { baselineBefore, qrsWaves } from '../../src/course/marks';
import { formatIssues, validateLesson } from '../../src/course/validate';
import type { Ecg } from '../../src/core/ecg';
import type { FindingId } from '../../src/core/findings';
import type { L10n } from '../../src/core/l10n';
import type { StdLead } from '../../src/core/leads';
import type { RegionId } from '../../src/core/regions';
import type { EcgSource } from '../../src/practice/api';
import { generateItem } from '../../src/practice';
import { getCase } from '../../src/real/library';
import { generate, scenarios, type SynthRequest } from '../../src/synth';
import meta from '../../src/data/real/ptbxl-meta.json';

const IDS = ['t1', 't2', 't3', 't4', 't5', 't6', 't7'] as const;

// imported directly (not through lessons/index) so the stage-T checks do not depend on the other stages' files
const lessons: readonly Lesson[] = [t1, t2, t3, t4, t5, t6, t7];

/** Scenarios with no organised ventricular activity: their truth legitimately has no beats. */
const NO_BEATS = new Set(['ventricular-fibrillation', 'asystole']);

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
      case 'film':
        b.frames.forEach((f, k) => out.push({ path: `${p}.frames[${k}]`, src: f.ecg }));
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

/** The scenarios each lesson's checks may draw (keeps check seeds on topic). */
const CHECK_TOPICS: Readonly<Record<(typeof IDS)[number], readonly string[]>> = {
  t1: ['avnrt', 'avrt', 'atrial-tachycardia', 'sinus-tachycardia', 'atrial-flutter'],
  t2: ['atrial-fibrillation', 'atrial-flutter', 'mat', 'pac', 'sinus-arrhythmia', 'ventricular-bigeminy'],
  t3: ['atrial-flutter'],
  t4: ['wpw', 'short-pr', 'preexcited-af', 'avrt'],
  t5: ['vt-monomorphic', 'ventricular-flutter'],
  t6: ['torsades', 'vt-polymorphic', 'ventricular-fibrillation', 'ventricular-flutter', 'asystole'],
  t7: ['ventricular-fibrillation', 'asystole', 'vt-monomorphic', 'vt-polymorphic', 'ventricular-flutter'],
};

describe('stage T lessons', () => {
  it('all seven lesson files exist and export their lesson', () => {
    expect(lessons.map((x) => x.id)).toEqual([...IDS]);
  });

  for (const lesson of lessons) {
    describe(lesson.id, () => {
      it('validates against the live catalogues with no errors and no warnings', () => {
        const issues = validateLesson(lesson, liveValidateDeps(lesson.id));
        expect(formatIssues(issues), `lesson ${lesson.id}`).toBe('');
      });

      it('follows the lesson anatomy: hook first, worked example before practice, summary last', () => {
        const kinds = lesson.blocks.map((b) => b.kind);
        expect(lesson.stage).toBe('T');
        expect(kinds[0]).toBe('hook');
        expect(kinds[kinds.length - 1]).toBe('summary');
        const firstWorked = kinds.indexOf('worked');
        const firstPractice = kinds.findIndex((k) => k === 'check' || k === 'drill');
        expect(firstWorked).toBeGreaterThanOrEqual(0);
        expect(firstPractice).toBeGreaterThan(firstWorked);
        for (const k of ['criteria', 'contrast', 'drill', 'pitfalls'] as const) expect(kinds, `${lesson.id} has a ${k} block`).toContain(k);
        const summary = lesson.blocks[lesson.blocks.length - 1];
        if (summary.kind === 'summary') {
          expect(summary.points.length).toBeGreaterThanOrEqual(3);
          expect(summary.points.length).toBeLessThanOrEqual(5);
        }
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
            if (!r.ecg.truth) failures.push(`${path}: no truth`);
            else if (r.ecg.truth.beats.length === 0 && !NO_BEATS.has(src.req.scenario)) failures.push(`${path}: no beats`);
          } catch (e) {
            failures.push(`${path}: ${String(e)}`);
          }
        }
        expect(failures).toEqual([]);
      });

      it('every family check generates an item on the lesson topic', async () => {
        const failures: string[] = [];
        const topic = CHECK_TOPICS[lesson.id as (typeof IDS)[number]];
        for (const [i, b] of lesson.blocks.entries()) {
          if (b.kind !== 'check' || 'inline' in b.item) continue;
          try {
            const item = await generateItem(b.item.family, b.item.seed, b.item.difficulty);
            if (item.family !== b.item.family) failures.push(`blocks[${i}]: got family ${item.family}`);
            const sc = item.ecg.kind === 'synth' ? item.ecg.req.scenario : null;
            if (sc && !topic.includes(sc)) failures.push(`blocks[${i}] (${b.item.family}#${b.item.seed}): off-topic scenario ${sc}`);
          } catch (e) {
            failures.push(`blocks[${i}] (${b.item.family}#${b.item.seed}): ${String(e)}`);
          }
        }
        expect(failures).toEqual([]);
      });
    });
  }
});

// ── the text ─────────────────────────────────────────────────────────────────────────────────────────────────────────

function texts(v: unknown, path = ''): { readonly path: string; readonly t: L10n }[] {
  if (Array.isArray(v)) return v.flatMap((x, i) => texts(x, `${path}[${i}]`));
  if (typeof v !== 'object' || v === null) return [];
  const o = v as Record<string, unknown>;
  if (typeof o.zh === 'string' && typeof o.en === 'string' && typeof o.es === 'string') return [{ path, t: o as unknown as L10n }];
  return Object.entries(o).flatMap(([k, x]) => texts(x, path ? `${path}.${k}` : k));
}

describe('stage T text', () => {
  const OUTDATED: Readonly<Record<'zh' | 'en' | 'es', RegExp>> = {
    zh: /半支阻滞|心房肥大|病窦综合征|结性心律|劳损/,
    en: /hemiblock|sick sinus|nodal rhythm|\bPSVT\b|strain pattern|atrial enlargement|\bLown\b|32-36 °C for 24 h/i,
    es: /hemibloqueo|crecimiento auricular|ritmo nodal|\batrios?\b|computadora|\bderivadas?\b|flúter|pseudoolas|\bablar\b/i,
  };
  for (const lesson of lessons) {
    it(`${lesson.id}: zh / en / es complete and translated, current terms, decimal comma in Spanish`, () => {
      for (const { path, t } of texts(lesson)) {
        for (const k of ['zh', 'en', 'es'] as const) {
          expect(t[k].trim(), `${path}.${k} is empty`).not.toBe('');
          expect(OUTDATED[k].test(t[k]), `${path}.${k}: outdated or non-standard term in "${t[k]}"`).toBe(false);
        }
        if (/[A-Za-z]{4,}/.test(t.en)) expect(/[㐀-鿿]/.test(t.zh), `${path}.zh is not Chinese: "${t.zh}"`).toBe(true);
        if (/[a-z]{4,}\s+[a-z]{4,}/i.test(t.en)) expect(t.es, `${path}.es is not translated`).not.toBe(t.en);
        expect(/\d\.\d/.test(t.es), `${path}.es: Spanish uses a decimal comma: "${t.es}"`).toBe(false);
        expect(/\d,\d/.test(t.en), `${path}.en: English uses a decimal point: "${t.en}"`).toBe(false);
      }
    });
  }
  it('the torsades trigger is not called short-coupled (that is the normal-QT variant)', () => {
    const t6 = lessons.find((x) => x.id === 't6')!;
    for (const { path, t } of texts(t6)) expect(/short-coupled PVC/i.test(t.en), path).toBe(false);
  });
});

// ── real cases carry the labels the captions claim ───────────────────────────────────────────────────────────────

interface RealRec {
  readonly id: number;
  readonly codes: Readonly<Record<string, number | undefined>>;
}
const records = (meta as unknown as { records: readonly RealRec[] }).records;
const REAL_CODES: Readonly<Record<(typeof IDS)[number], readonly string[]>> = {
  t1: ['PSVT'],
  t2: ['AFIB'],
  t3: ['AFLT'],
  t4: ['WPW'],
  t5: ['WPW', 'CRBBB'],
  t6: [],
  t7: [],
};
describe('stage T real cases', () => {
  for (const lesson of lessons) {
    it(`${lesson.id}: every real id exists and carries a lesson code at ≥ 80 % likelihood`, () => {
      const wanted = REAL_CODES[lesson.id as (typeof IDS)[number]];
      for (const b of lesson.blocks) {
        if (b.kind !== 'real') continue;
        for (const id of b.ids) {
          const r = records.find((x) => x.id === id);
          expect(r, `real ${id}`).toBeDefined();
          expect(wanted.some((c) => (r!.codes[c] ?? -1) >= 80), `real ${id} codes ${JSON.stringify(r!.codes)}`).toBe(true);
        }
      }
    });
  }
  it('the AF caption shows AF only (no flutter-coded record)', () => {
    const t2 = lessons.find((x) => x.id === 't2')!;
    for (const b of t2.blocks) if (b.kind === 'real') for (const id of b.ids) expect(records.find((x) => x.id === id)!.codes.AFLT ?? 0).toBe(0);
  });
});

// ── what each real-case caption says: labels and the 12SL reference only ───────────────────────────────────────────

interface RealClaim {
  readonly lesson: (typeof IDS)[number];
  readonly id: number;
  readonly sex?: 'M' | 'F';
  readonly age?: number;
  /** labels the caption names */
  readonly has?: readonly FindingId[];
  /** the caption says no other label applies */
  readonly only?: readonly FindingId[];
  readonly hr?: readonly [number, number];
  readonly pr?: readonly [number, number];
  readonly qrs?: readonly [number, number];
  /** the caption says the 12SL counts one P per QRS */
  readonly oneP?: true;
}

const CLAIMS: readonly RealClaim[] = [
  // t1: "labelled paroxysmal supraventricular tachycardia"
  { lesson: 't1', id: 1919, has: ['svt'] },
  { lesson: 't1', id: 8461, has: ['svt'] },
  { lesson: 't1', id: 2051, has: ['svt'] },
  // t2: AF at about 170/min, AF at about 50/min, AF in a 39-year-old man
  { lesson: 't2', id: 14102, has: ['atrial-fibrillation'], hr: [169, 171] },
  { lesson: 't2', id: 12542, has: ['atrial-fibrillation'], hr: [49, 51] },
  { lesson: 't2', id: 4117, sex: 'M', age: 39, has: ['atrial-fibrillation'] },
  // t3: all AFLT; two at about 140–150/min, one below 50/min
  { lesson: 't3', id: 7159, has: ['atrial-flutter'], hr: [139, 151] },
  { lesson: 't3', id: 2739, has: ['atrial-flutter'], hr: [139, 151] },
  { lesson: 't3', id: 2430, has: ['atrial-flutter'], hr: [0, 49] },
  // t4: WPW, ages 55–63, no arrhythmia label, one P per QRS; two with PR under 120 ms, one with a 12SL PR of 140 ms
  { lesson: 't4', id: 11889, age: 55, has: ['wpw'], only: ['sinus-rhythm', 'wpw'], pr: [0, 119], oneP: true },
  { lesson: 't4', id: 2145, age: 55, has: ['wpw'], only: ['sinus-rhythm', 'wpw'], pr: [0, 119], oneP: true },
  { lesson: 't4', id: 12559, age: 63, has: ['wpw'], only: ['sinus-rhythm', 'wpw'], pr: [140, 140], oneP: true },
  // t5: A, a 55-year-old man in sinus rhythm with WPW, PR 100 ms and QRS 184 ms; B, an 87-year-old woman with AF and RBBB at about 170/min, QRS 116 ms
  { lesson: 't5', id: 11889, sex: 'M', age: 55, has: ['sinus-rhythm', 'wpw'], pr: [100, 100], qrs: [184, 184] },
  { lesson: 't5', id: 21804, sex: 'F', age: 87, has: ['atrial-fibrillation', 'rbbb'], hr: [169, 171], qrs: [116, 116] },
];

describe('stage T real cases: the captions agree with the labels and the 12SL reference', () => {
  it('every real case a lesson shows has a claim for that lesson, and every claim is a case it shows', () => {
    for (const lesson of lessons) {
      const shown = lesson.blocks.flatMap((b) => (b.kind === 'real' ? [...b.ids] : [])).sort((a, b) => a - b);
      const claimed = CLAIMS.filter((c) => c.lesson === lesson.id).map((c) => c.id).sort((a, b) => a - b);
      expect(claimed, lesson.id).toEqual(shown);
    }
  });
  for (const c of CLAIMS) {
    it(`${c.lesson}: PTB-XL ${c.id}`, () => {
      const k = getCase(c.id)!;
      if (c.sex) expect(k.sex).toBe(c.sex);
      if (c.age !== undefined) expect(k.age).toBe(c.age);
      for (const f of c.has ?? []) expect(k.findings, `${c.id} labelled ${f}`).toContain(f);
      if (c.only) for (const f of k.findings) expect(c.only, `${c.id} also labelled ${f}`).toContain(f);
      const within = (v: number | null, r: readonly [number, number] | undefined, what: string) => {
        if (!r) return;
        expect(v, `${c.id} ${what}`).not.toBeNull();
        expect(v!, `${c.id} ${what}`).toBeGreaterThanOrEqual(r[0]);
        expect(v!, `${c.id} ${what}`).toBeLessThanOrEqual(r[1]);
      };
      within(k.ref.hrBpm, c.hr, 'HR');
      within(k.ref.prMs, c.pr, 'PR');
      within(k.ref.qrsMs, c.qrs, 'QRS');
      if (c.oneP) expect(k.ref.atrialRateBpm, `${c.id} one P per QRS`).toBe(k.ref.hrBpm);
    });
  }
});

// ── what the text says is on the tracing ─────────────────────────────────────────────────────────────────────────

const lessonById = (id: string): Lesson => lessons.find((y) => y.id === id)!;
type BlockOf<K extends Block['kind']> = Extract<Block, { kind: K }>;
function blocksOf<K extends Block['kind']>(id: string, kind: K): BlockOf<K>[] {
  return lessonById(id).blocks.filter((b): b is BlockOf<K> => b.kind === kind);
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
const at = (e: Ecg, lead: StdLead, ms: number): number => e.signal.leads[lead][Math.round((ms * e.signal.fs) / 1000)];
/** extreme deviation (signed, mV) of a lead over [t0, t1] relative to its value at tRef */
function excursion(e: Ecg, lead: StdLead, tRef: number, t0: number, t1: number): number {
  const ref = at(e, lead, tRef);
  let best = 0;
  for (let t = t0; t <= t1; t += 2) {
    const d = at(e, lead, t) - ref;
    if (Math.abs(d) > Math.abs(best)) best = d;
  }
  return best;
}
const rrs = (e: Ecg): number[] => e.truth!.beats.slice(1).map((b, i) => b.qrsOn - e.truth!.beats[i].qrsOn);
const mid = (e: Ecg) => e.truth!.beats[Math.floor(e.truth!.beats.length / 2)];
/** what a playing live block shows with its played dial at `v` (its other dials at their start values) */
function played(id: string, i: number, v: number): Ecg {
  const b = blocksOf(id, 'live')[i];
  if (!b.play) throw new Error(`${id}: live block ${i} does not play`);
  const sc = scenarios().find((s) => s.id === b.scenario);
  if (!sc) throw new Error(`unknown scenario ${b.scenario}`);
  const dials = { ...startDials(sc, b.variant, b.dials.map((d) => d.id), b.play), [b.play.dial]: v };
  return ecgOf({ scenario: b.scenario, ...(b.variant ? { variant: b.variant } : {}), seed: b.seed, dials });
}
const frames = (id: string, k: number): Ecg[] => blocksOf(id, 'film')[k].frames.map((f) => ecgOf(f.ecg));
/** largest deviation of a lead over [t0, t1] from the straight line joining its ends (a wave riding on a slope) */
function detrended(e: Ecg, lead: StdLead, t0: number, t1: number): number {
  const a = at(e, lead, t0);
  const z = at(e, lead, t1);
  let best = 0;
  for (let t = t0; t <= t1; t += 2) {
    const d = at(e, lead, t) - (a + ((z - a) * (t - t0)) / (t1 - t0));
    if (Math.abs(d) > Math.abs(best)) best = d;
  }
  return best;
}
/**
 * tallest strict local maximum of sign × lead over [t0, t1] above the straight line joining the window ends (mV), or
 * −Infinity without one: a wave of its own on a slope, not the curvature of the slope
 */
function localPeak(e: Ecg, lead: StdLead, sign: 1 | -1, t0: number, t1: number): number {
  const xs: number[] = [];
  for (let t = t0; t <= t1; t += 2) xs.push(sign * at(e, lead, t));
  let best = -Infinity;
  for (let k = 1; k + 1 < xs.length; k++) {
    if (xs[k] > xs[k - 1] && xs[k] >= xs[k + 1]) best = Math.max(best, xs[k] - (xs[0] + ((xs[xs.length - 1] - xs[0]) * k) / (xs.length - 1)));
  }
  return best;
}
/** P onset of each beat minus the T end of the beat before (negative: the P starts on the previous T) */
const pAfterT = (e: Ecg): number[] => e.truth!.beats.slice(1).map((b, i) => b.pOn! - e.truth!.beats[i].tOff);
const hiddenShare = (e: Ecg): number => e.truth!.atrial.filter((a) => !a.visible).length / e.truth!.atrial.length;
/** median peak-to-peak of the baseline between T end + 40 ms and the next QRS − 40 ms (f or F waves), mV */
function diastolicP2p(e: Ecg, lead: StdLead): number {
  const b = e.truth!.beats;
  const out: number[] = [];
  for (let i = 0; i + 1 < b.length; i++) {
    const t0 = b[i].tOff + 40;
    const t1 = b[i + 1].qrsOn - 40;
    if (t1 - t0 < 150) continue;
    let mx = -Infinity;
    let mn = Infinity;
    for (let t = t0; t <= t1; t += 2) {
      mx = Math.max(mx, at(e, lead, t));
      mn = Math.min(mn, at(e, lead, t));
    }
    out.push(mx - mn);
  }
  return out.sort((x, y) => x - y)[Math.floor(out.length / 2)];
}
const median = (xs: readonly number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
/** every RR holds four F waves, exactly one of them hidden, and that one starts within 100 ms before the next QRS (it overlaps it) */
function expectFourFOneInQrs(e: Ecg): void {
  const { beats, atrial } = e.truth!;
  for (let i = 0; i + 1 < beats.length; i++) {
    const f = atrial.filter((a) => a.t >= beats[i].qrsOn && a.t < beats[i + 1].qrsOn);
    expect(f.length, `RR ${i}`).toBe(4);
    const hidden = f.filter((a) => !a.visible);
    expect(hidden.length, `RR ${i}`).toBe(1);
    expect(beats[i + 1].qrsOn - hidden[0].t, `RR ${i}`).toBeGreaterThan(0);
    expect(beats[i + 1].qrsOn - hidden[0].t, `RR ${i}`).toBeLessThan(100);
  }
}

describe('t1 on the tracings', () => {
  it('worked AVRT: 190/min with RR about 316 ms; retrograde P′ about 115 ms after QRS onset and about 200 ms before the next QRS; a dip in I and aVL and a hump in III; in II and aVF it rides on the T upstroke with no hump of its own', () => {
    const e = ecgOf(blocksOf('t1', 'worked')[0].ecg);
    expect(Math.abs(e.truth!.hrBpm - 190)).toBeLessThanOrEqual(1);
    expect(Math.abs(median(rrs(e)) - 316)).toBeLessThan(5);
    const bs = e.truth!.beats;
    const i = Math.floor(bs.length / 2);
    const b = bs[i];
    expect(b.pOn).not.toBeNull();
    expect(Math.abs(b.pOn! - b.qrsOn - 115)).toBeLessThan(5);
    expect(Math.abs(bs[i + 1].qrsOn - b.pOn! - 200), 'P′R').toBeLessThan(5);
    const w = (l: StdLead) => excursion(e, l, b.pOn!, b.pOn! + 10, b.pOn! + 45);
    expect(w('I')).toBeLessThan(-0.02);
    expect(w('aVL')).toBeLessThan(-0.04);
    expect(w('III')).toBeGreaterThan(0.05);
    expect(w('aVF')).toBeGreaterThan(0.05);
    expect(b.tPeak).not.toBeNull();
    expect(b.pOn!).toBeGreaterThan(b.j);
    expect(b.pOn!).toBeLessThan(b.tPeak!);
    const wave = (l: StdLead, sign: 1 | -1) => localPeak(e, l, sign, b.pOn!, b.tPeak! - 10);
    for (const l of ['I', 'aVL'] as const) expect(wave(l, -1), `dip in ${l}`).toBeGreaterThan(0.05);
    expect(wave('III', 1), 'hump in III').toBeGreaterThan(0.05);
    for (const l of ['II', 'aVF'] as const) expect(wave(l, 1), `no hump in ${l}`).toBeLessThanOrEqual(0.05);
    expect(at(e, 'II', b.tPeak!) - at(e, 'II', b.pOn!)).toBeGreaterThan(0.15);
    for (let t = b.pOn!; t + 2 <= b.tPeak! - 10; t += 2) expect(at(e, 'II', t + 2), `II at P′ + ${Math.round(t - b.pOn!)} ms`).toBeGreaterThan(at(e, 'II', t) - 0.002);
  });
  it('hook AVNRT: 176/min, regular, narrow, every P′ starting inside the QRS (no clear P), pseudo-S in II right after the QRS', () => {
    const e = ecgOf(blocksOf('t1', 'hook')[0].ecg);
    expect(Math.abs(e.truth!.hrBpm - 176)).toBeLessThanOrEqual(1);
    expect(Math.max(...rrs(e)) - Math.min(...rrs(e))).toBeLessThan(10);
    expect(e.truth!.qrsMs).toBeLessThan(120);
    for (const x of e.truth!.beats) {
      expect(x.pOn!).toBeGreaterThan(x.qrsOn);
      expect(x.pOn!).toBeLessThan(x.qrsOff);
    }
    const b = mid(e);
    expect(excursion(e, 'II', b.qrsOn, b.qrsOff, b.qrsOff + 40)).toBeLessThan(-0.1);
  });
  it('AVNRT in V1: narrow QRS whose S upstroke ends in a small terminal positive wave (pseudo-r′, about half a millimetre, under 1 mm)', () => {
    const e = ecgOf(blocksOf('t1', 'ecg').find((x) => x.view?.layout === 'strip' && x.view.lead === 'V1')!.ecg);
    expect(e.truth!.qrsMs).toBeLessThan(120);
    for (const b of e.truth!.beats.slice(1, -1)) {
      expect(excursion(e, 'V1', b.qrsOn, b.qrsOn + 30, b.qrsOn + 70), `beat at ${Math.round(b.qrsOn)} ms`).toBeLessThan(-0.4);
      const r = excursion(e, 'V1', b.qrsOn, b.qrsOff - 5, b.qrsOff + 20);
      expect(r, `beat at ${Math.round(b.qrsOn)} ms`).toBeGreaterThan(0.04);
      expect(r, `beat at ${Math.round(b.qrsOn)} ms`).toBeLessThan(0.06);
    }
  });
  it('P′ film (12-lead sheet): sinus P upright in II with PR about 150 ms and RP > PR; AVNRT P′ starts inside the QRS with a pseudo-S in II; AVRT P′ after the QRS and before the T peak, a dip in I and aVL (where its marks sit) and no hump in II, RP about 115 ms and < P′R; AT P′ 180/min, QRS 90/min, each blocked P′ on the ST–T of the beat before', () => {
    const film = blocksOf('t1', 'film')[0];
    expect(film.view?.layout).toBe('3x4+1');
    expect(film.frames[2].marks?.map((m) => ('auto' in m ? m.lead : null))).toEqual(['I', 'aVL']);
    const [sinus, avnrt, avrt, at21] = frames('t1', 0);
    const s = sinus.truth!;
    const sb = mid(sinus);
    expect(Math.abs(s.prMs! - 150)).toBeLessThan(5);
    expect(detrended(sinus, 'II', sb.pOn!, sb.pOff!)).toBeGreaterThan(0.05);
    for (const rr of rrs(sinus)) expect(rr - s.prMs!).toBeGreaterThan(s.prMs!);
    const nb = mid(avnrt);
    expect(nb.pOn! - nb.qrsOn).toBeGreaterThan(0);
    expect(nb.pOn! - nb.qrsOn).toBeLessThan(avnrt.truth!.qrsMs);
    expect(excursion(avnrt, 'II', nb.qrsOn, nb.qrsOff, nb.qrsOff + 40)).toBeLessThan(-0.1);
    const vb = mid(avrt);
    const rp = vb.pOn! - vb.qrsOn;
    expect(Math.abs(rp - 115)).toBeLessThan(5);
    expect(vb.pOn!).toBeGreaterThan(vb.qrsOff);
    expect(vb.pOn!).toBeLessThan(vb.tPeak!);
    for (const l of ['I', 'aVL'] as const) expect(localPeak(avrt, l, -1, vb.pOn!, vb.tPeak! - 10), `dip in ${l}`).toBeGreaterThan(0.05);
    expect(localPeak(avrt, 'II', 1, vb.pOn!, vb.tPeak! - 10), 'no hump in II').toBeLessThanOrEqual(0.05);
    for (const rr of rrs(avrt)) expect(rr - rp).toBeGreaterThan(rp);
    const a = at21.truth!;
    expect(Math.abs(a.atrialRateBpm! - 180)).toBeLessThanOrEqual(1);
    expect(Math.abs(a.hrBpm - 90)).toBeLessThanOrEqual(1);
    const blocked = a.atrial.filter((x) => x.conductedTo === null && x.t > a.beats[0].qrsOn && x.t < a.beats[a.beats.length - 1].qrsOn);
    expect(blocked.length).toBeGreaterThanOrEqual(10);
    for (const x of blocked) {
      const prev = [...a.beats].reverse().find((b) => b.qrsOn < x.t)!;
      expect(x.t).toBeGreaterThan(prev.qrsOff);
      expect(x.t).toBeLessThan(prev.tOff);
    }
  });
  it('sinus sweep notes: P clear of the previous T, PR about 150 ms and RP > PR at 102–124; P within 25 ms of the T end at 125–133; P starting before the T end on every beat, one P per QRS, at 134–150', () => {
    for (const v of [102, 124]) {
      const e = played('t1', 0, v);
      expect(Math.min(...pAfterT(e)), `${v}`).toBeGreaterThan(0);
      expect(Math.abs(e.truth!.prMs! - 150), `${v}`).toBeLessThan(5);
      for (const rr of rrs(e)) expect(rr - e.truth!.prMs!, `${v}`).toBeGreaterThan(e.truth!.prMs!);
    }
    for (const v of [125, 133]) for (const g of pAfterT(played('t1', 0, v))) expect(Math.abs(g), `${v}`).toBeLessThan(25);
    for (const v of [134, 150]) {
      const e = played('t1', 0, v);
      expect(Math.max(...pAfterT(e)), `${v}`).toBeLessThan(0);
      expect(Math.abs(e.truth!.atrialRateBpm! - e.truth!.hrBpm), `${v}`).toBeLessThan(1);
    }
  });
  it('AVRT heart: ventricles activated first, atria about 115 ms after QRS onset, the pathway highlighted', () => {
    const e = ecgOf(blocksOf('t1', 'heart')[0].ecg);
    const rs = e.regions!;
    const b = mid(e);
    const buf = new Float32Array(rs.ids.length);
    const state = (id: RegionId, t: number): number => {
      rs.stateAt(t, buf);
      return buf[rs.ids.indexOf(id)];
    };
    const atriaStart = (t: number): boolean => (['ra', 'la'] as const).some((id) => state(id, t) > 0 && state(id, t) < 1);
    expect(state('lv-mid-anteroseptal', b.qrsOn + 60)).toBeGreaterThanOrEqual(1);
    expect(atriaStart(b.qrsOn + 60)).toBe(false);
    let t = b.qrsOn + 60;
    while (!atriaStart(t) && t < b.qrsOn + 300) t += 2;
    expect(Math.abs(t - b.qrsOn - 115)).toBeLessThan(5);
    expect(rs.highlights['lv-basal-anterolateral']).toBe('pathway');
  });
  it('flutter sweep notes: 2:1 at 150/min with about half the F waves hidden; 3:1 at 100/min; 4:1 at 75/min with most F waves showing; atria at 300/min throughout', () => {
    for (const [v, hr] of [[2, 150], [3, 100], [4, 75]] as const) {
      const e = played('t1', 1, v);
      expect(Math.abs(e.truth!.hrBpm - hr), `${v}:1`).toBeLessThan(1);
      expect(e.truth!.atrialRateBpm, `${v}:1`).toBe(300);
      expect(Math.max(...rrs(e)) - Math.min(...rrs(e)), `${v}:1 regular`).toBeLessThan(10);
    }
    expect(Math.abs(hiddenShare(played('t1', 1, 2)) - 0.5)).toBeLessThan(0.1);
    expect(hiddenShare(played('t1', 1, 4))).toBeLessThan(0.35);
  });
  it('long-RP contrast: atypical AVNRT at 150/min, sinus tachycardia at 130/min; RP > PR in both; atypical AVNRT P′ negative in II, III and aVF; sinus P upright in II', () => {
    const c = blocksOf('t1', 'contrast')[0];
    const [atyp, sinus] = [ecgOf(c.left.ecg), ecgOf(c.right.ecg)];
    expect(Math.abs(atyp.truth!.hrBpm - 150)).toBeLessThanOrEqual(1);
    expect(Math.abs(sinus.truth!.hrBpm - 130)).toBeLessThanOrEqual(1);
    for (const e of [atyp, sinus]) {
      const b = mid(e);
      const pr = b.qrsOn - b.pOn!;
      for (const rr of rrs(e)) expect(rr - pr).toBeGreaterThan(pr);
    }
    const ab = mid(atyp);
    for (const l of ['II', 'III', 'aVF'] as const) expect(detrended(atyp, l, ab.pOn!, ab.pOff!), l).toBeLessThan(-0.1);
    const sb = mid(sinus);
    expect(detrended(sinus, 'II', sb.pOn!, sb.pOff!)).toBeGreaterThan(0.05);
  });
});

/** the beat an auto mark of this kind names (its `beat`), for marks the text pins to one beat */
function markBeat(marks: readonly unknown[] | undefined, kind: string, lead?: string): number {
  const m = (marks ?? []).find((x): x is { auto: string; beat?: number; lead?: string } => typeof x === 'object' && x !== null && (x as { auto?: unknown }).auto === kind && (lead === undefined || (x as { lead?: string }).lead === lead));
  if (m?.beat === undefined) throw new Error(`no ${kind} mark with a beat`);
  return m.beat;
}

describe('t2 on the tracings', () => {
  it('worked flutter with variable block: F–F 200 ms, every RR near 3, 4 or 5 F–F (no 2:1); step 1 brackets the shortest RR (3 F–F), step 2 an RR of 5 F–F, step 4 the 3 F–F one again', () => {
    const w = blocksOf('t2', 'worked')[0];
    const e = ecgOf(w.ecg);
    expect(e.truth!.atrialRateBpm).toBe(300);
    const ratios = rrs(e).map((rr) => Math.round(rr / 200));
    for (const r of ratios) expect([3, 4, 5]).toContain(r);
    expect(new Set(ratios).size).toBeGreaterThanOrEqual(2);
    const rr = rrs(e);
    const [s1, s2, s4] = [0, 1, 3].map((k) => markBeat(w.steps[k].marks, 'rr'));
    expect(rr[s1]).toBe(Math.min(...rr));
    expect(Math.round(rr[s1] / 200)).toBe(3);
    expect(Math.round(rr[s2] / 200)).toBe(5);
    expect(Math.abs(rr[s2] / 200 - 5)).toBeLessThan(0.2);
    expect(s4).toBe(s1);
  });
  it('laddergram: the worked flutter tracing, an F every 200 ms, every 3rd, 4th or 5th F conducted', () => {
    const fig = blocksOf('t2', 'figure').find((b) => b.figure.id === 'laddergram')!;
    expect(fig.ecg).toEqual(blocksOf('t2', 'worked')[0].ecg);
    const atr = ecgOf(fig.ecg!).truth!.atrial;
    for (let i = 1; i < atr.length; i++) expect(Math.abs(atr[i].t - atr[i - 1].t - 200)).toBeLessThan(3);
    const conducted = atr.flatMap((a, i) => (a.conductedTo !== null ? [i] : []));
    for (let k = 1; k < conducted.length; k++) expect([3, 4, 5]).toContain(conducted[k] - conducted[k - 1]);
  });
  it('irregular film: AF RR with no pattern; flutter = the worked tracing; two PACs with P′ negative in II and a less-than-compensatory pause; sinus arrhythmia with one P and one PR; bigeminy pairs a sinus beat with an early wide QRS that has no P', () => {
    const film = blocksOf('t2', 'film')[0];
    const [af, , pac, sa, big] = frames('t2', 0);
    expect(af.truth!.rhythm).toBe('atrial-fibrillation');
    expect(Math.max(...rrs(af)) - Math.min(...rrs(af))).toBeGreaterThan(300);
    expect(film.frames[1].ecg).toEqual(blocksOf('t2', 'worked')[0].ecg);
    const pb = pac.truth!.beats;
    const early = pb.flatMap((b, i) => (b.kind === 'atrial' ? [i] : []));
    expect(early.length).toBe(2);
    const pMark = film.frames[2].marks?.find((m) => 'auto' in m && m.auto === 'p');
    expect(early, 'the P′ mark points at a PAC').toContain(pMark && 'auto' in pMark ? pMark.beat : undefined);
    const sinusRr = median(pb.slice(1).flatMap((b, i) => (b.kind === 'sinus' && pb[i].kind === 'sinus' ? [b.qrsOn - pb[i].qrsOn] : [])));
    const s = pb.find((b) => b.kind === 'sinus')!;
    expect(detrended(pac, 'II', s.pOn!, s.pOff!)).toBeGreaterThan(0.05);
    for (const i of early) {
      expect(detrended(pac, 'II', pb[i].pOn!, pb[i].pOff!), `PAC ${i}`).toBeLessThan(-0.05);
      expect(pb[i].qrsOn - pb[i - 1].qrsOn, `PAC ${i} early`).toBeLessThan(0.8 * sinusRr);
      expect(pb[i + 1].qrsOn - pb[i - 1].qrsOn, `PAC ${i} pause`).toBeLessThan(2 * sinusRr - 100);
    }
    const sb = sa.truth!.beats;
    expect(sb.every((b) => b.kind === 'sinus')).toBe(true);
    const prs = sb.map((b) => b.qrsOn - b.pOn!);
    expect(Math.max(...prs) - Math.min(...prs)).toBeLessThan(5);
    expect(Math.max(...rrs(sa)) - Math.min(...rrs(sa))).toBeGreaterThan(200);
    const bb = big.truth!.beats;
    bb.forEach((b, i) => expect(b.kind, `beat ${i}`).toBe(bb[0].kind === 'ventricular' ? (i % 2 ? 'sinus' : 'ventricular') : i % 2 ? 'ventricular' : 'sinus'));
    const pvcs = bb.filter((b) => b.kind === 'ventricular');
    for (const b of pvcs) {
      expect(b.qrsOff - b.qrsOn).toBeGreaterThanOrEqual(120);
      expect(b.pOn).toBeNull();
    }
    const coupling = bb.flatMap((b, i) => (b.kind === 'ventricular' && i > 0 ? [b.qrsOn - bb[i - 1].qrsOn] : []));
    expect(Math.max(...coupling) - Math.min(...coupling)).toBeLessThan(10);
    const after = bb.flatMap((b, i) => (b.kind === 'ventricular' && i + 1 < bb.length ? [bb[i + 1].qrsOn - b.qrsOn] : []));
    expect(Math.min(...after)).toBeGreaterThan(2 * Math.max(...coupling));
    // the marks sit on the beats the notes are about
    const afRr = markBeat(film.frames[0].marks, 'rr');
    expect(af.truth!.beats[afRr].kind).toBe(af.truth!.beats[0].kind);
    expect(rrs(af)[afRr], 'AF: the bracket shows the longest RR').toBe(Math.max(...rrs(af)));
    const flRr = rrs(frames('t2', 0)[1])[markBeat(film.frames[1].marks, 'rr')];
    expect(Math.round(flRr / 200), 'flutter: the bracket spans 5 F–F').toBe(5);
    expect(Math.abs(flRr / 200 - 5)).toBeLessThan(0.2);
    for (const k of ['p', 'rr']) expect(sb[markBeat(film.frames[3].marks, k)].kind, `sinus arrhythmia ${k}`).toBe('sinus');
    const bq = bb[markBeat(film.frames[4].marks, 'qrs')];
    expect(bq.kind, 'bigeminy: the QRS mark is on the early wide beat').toBe('ventricular');
    expect(bq.pOn).toBeNull();
    expect(bq.qrsOff - bq.qrsOn).toBeGreaterThanOrEqual(120);
  });
  it('MAT contrast: atrial rate > 100/min; the three marked P′ waves stand clear of the T, differ in shape in II (> 0.5 mm apart) and in PR; PP varies; the baseline between P′ waves is flat wherever a P′ stands clear of the T', () => {
    const c = blocksOf('t2', 'contrast')[0];
    const e = ecgOf(c.left.ecg);
    const t = e.truth!;
    expect(t.rhythm).toBe('mat');
    expect(t.atrialRateBpm!).toBeGreaterThan(100);
    const marked = (c.left.marks ?? []).map((m) => ('auto' in m && m.auto === 'p' ? m.beat! : -1));
    expect(marked.length).toBe(3);
    const wave = (i: number) => {
      const b = t.beats[i];
      const base = at(e, 'II', b.pOn! - 4);
      const out: number[] = [];
      for (let s = 0; s <= 120; s += 2) out.push(at(e, 'II', b.pOn! + s) - base);
      return out;
    };
    for (const i of marked) expect(t.beats[i].pOn!, `beat ${i} clear of the T`).toBeGreaterThan(t.beats[i - 1].tOff);
    for (let x = 0; x < marked.length; x++)
      for (let y = x + 1; y < marked.length; y++) {
        const [a, b] = [wave(marked[x]), wave(marked[y])];
        expect(Math.max(...a.map((v, k) => Math.abs(v - b[k]))), `P′ ${marked[x]} vs ${marked[y]}`).toBeGreaterThan(0.05);
        const pr = (i: number) => t.beats[i].qrsOn - t.beats[i].pOn!;
        expect(Math.abs(pr(marked[x]) - pr(marked[y])), `PR ${marked[x]} vs ${marked[y]}`).toBeGreaterThan(15);
      }
    expect(Math.max(...rrs(e)) - Math.min(...rrs(e))).toBeGreaterThan(100);
    let clear = 0;
    t.beats.forEach((b, i) => {
      if (i === 0 || b.pOn! - t.beats[i - 1].tOff < 20) return;
      clear++;
      const base = baselineBefore(e.signal.leads.II, e.signal.fs, b.qrsOn);
      for (let s = t.beats[i - 1].tOff + 10; s <= b.pOn! - 10; s += 2) expect(Math.abs(at(e, 'II', s) - base), `TP before beat ${i}`).toBeLessThanOrEqual(0.05);
    });
    expect(clear).toBeGreaterThanOrEqual(8);
  });
  it('f-wave sweep notes: V1 f waves over 1 mm at 0.7–0.9 and under 1 mm at 0.2–0.45; the RR identical at every setting', () => {
    for (const v of [0.7, 0.9]) expect(diastolicP2p(played('t2', 0, v), 'V1'), `${v}`).toBeGreaterThan(0.1);
    for (const v of [0.2, 0.45]) expect(diastolicP2p(played('t2', 0, v), 'V1'), `${v}`).toBeLessThan(0.1);
    const ref = rrs(played('t2', 0, 0.9));
    for (const v of [0.2, 0.46, 0.69]) expect(rrs(played('t2', 0, v)), `${v}`).toEqual(ref);
    expect(played('t2', 0, 0.2).truth!.rhythm).toBe('atrial-fibrillation');
  });
  it('rate film: about 133/min irregular; about 45/min irregular; about 44/min regular escape with f waves and complete AV block; pre-excited AF about 190/min, wide QRS varying beat to beat, shortest RR about 225 ms (bracketed, with a wide QRS marked after it)', () => {
    const film = blocksOf('t2', 'film')[1];
    const [untreated, slow, regular, pre] = frames('t2', 1);
    expect(Math.abs(untreated.truth!.hrBpm - 133)).toBeLessThanOrEqual(1);
    expect(Math.max(...rrs(untreated)) - Math.min(...rrs(untreated))).toBeGreaterThan(300);
    expect(rrs(untreated)[markBeat(film.frames[0].marks, 'rr')]).toBe(Math.max(...rrs(untreated)));
    expect(Math.abs(slow.truth!.hrBpm - 45)).toBeLessThanOrEqual(1);
    expect(Math.max(...rrs(slow)) - Math.min(...rrs(slow))).toBeGreaterThan(300);
    expect(rrs(slow)[markBeat(film.frames[1].marks, 'rr')]).toBe(Math.max(...rrs(slow)));
    const r = regular.truth!;
    expect(Math.abs(r.hrBpm - 44)).toBeLessThanOrEqual(1);
    expect(Math.max(...rrs(regular)) - Math.min(...rrs(regular))).toBeLessThan(10);
    expect(r.findings).toContain('av-block-3');
    expect(r.beats.every((b) => b.kind.startsWith('escape'))).toBe(true);
    expect(diastolicP2p(regular, 'V1')).toBeGreaterThan(0.05);
    const p = pre.truth!;
    expect(Math.abs(p.hrBpm - 190)).toBeLessThanOrEqual(1);
    expect(Math.abs(Math.min(...rrs(pre)) - 225)).toBeLessThan(5);
    const widths = p.beats.map((b) => b.qrsOff - b.qrsOn);
    expect(Math.max(...widths)).toBeGreaterThanOrEqual(140);
    expect(Math.max(...widths) - Math.min(...widths)).toBeGreaterThan(30);
    expect(p.findings).toContain('wpw');
    const short = markBeat(film.frames[3].marks, 'rr');
    expect(rrs(pre)[short], 'the bracket is the shortest RR').toBe(Math.min(...rrs(pre)));
    expect(markBeat(film.frames[3].marks, 'qrs'), 'the QRS mark is the beat that ends it').toBe(short + 1);
    expect(widths[short + 1]).toBeGreaterThanOrEqual(140);
    expect(widths[short], 'the shortest RR runs between two wide beats').toBeGreaterThanOrEqual(140);
  });
});

/** median swing of the baseline between T end + 30 ms and the next QRS − 30 ms above and below its median (F-wave polarity), mV */
function swing(e: Ecg, lead: StdLead): { up: number; dn: number } {
  const bs = e.truth!.beats;
  const up: number[] = [];
  const dn: number[] = [];
  for (let i = 0; i + 1 < bs.length; i++) {
    const xs: number[] = [];
    for (let t = bs[i].tOff + 30; t <= bs[i + 1].qrsOn - 30; t += 2) xs.push(at(e, lead, t));
    if (xs.length < 100) continue;
    const m = median(xs);
    up.push(Math.max(...xs) - m);
    dn.push(m - Math.min(...xs));
  }
  return { up: median(up), dn: median(dn) };
}
const ffMedian = (e: Ecg): number => median(e.truth!.atrial.slice(1).map((x, i) => x.t - e.truth!.atrial[i].t));

describe('t3 on the tracings', () => {
  it('hook, heart and worked: 2:1 flutter, ventricles at 150/min with every RR 400 ms, atria at 300/min with F–F 200 ms', () => {
    for (const src of [blocksOf('t3', 'hook')[0].ecg, blocksOf('t3', 'worked')[0].ecg, blocksOf('t3', 'heart')[0].ecg]) {
      const e = ecgOf(src);
      const t = e.truth!;
      expect(Math.abs(t.hrBpm - 150)).toBeLessThanOrEqual(1);
      for (const rr of rrs(e)) expect(Math.abs(rr - 400)).toBeLessThan(5);
      expect(t.atrialRateBpm).toBe(300);
      expect(Math.abs(ffMedian(e) - 200)).toBeLessThan(5);
    }
  });
  it('hook and worked at 2:1: the hidden F starts after the T ends and runs into the next QRS; the visible F sits on the ST segment right after the QRS, before the T peak', () => {
    for (const src of [blocksOf('t3', 'hook')[0].ecg, blocksOf('t3', 'worked')[0].ecg]) {
      const t = ecgOf(src).truth!;
      const inStrip = t.atrial.filter((a) => a.t > t.beats[0].qrsOn && a.t < t.beats[t.beats.length - 1].qrsOn);
      expect(inStrip.length).toBeGreaterThanOrEqual(40);
      for (const a of inStrip) {
        const prev = [...t.beats].reverse().find((b) => b.qrsOn < a.t)!;
        const next = t.beats.find((b) => b.qrsOn > a.t)!;
        if (a.visible) {
          expect(a.t, 'visible F after the J point').toBeGreaterThan(prev.j);
          expect(a.t - prev.j, 'visible F right after the QRS').toBeLessThan(50);
          expect(a.t, 'visible F before the T peak').toBeLessThan(prev.tPeak!);
        } else {
          expect(a.t, 'hidden F after the T end').toBeGreaterThan(prev.tOff);
          expect(next.qrsOn - a.t, 'hidden F runs into the next QRS').toBeLessThan(100);
        }
      }
    }
  });
  it('flutter heart: the atria start firing every 200 ms', () => {
    const e = ecgOf(blocksOf('t3', 'heart')[0].ecg);
    const rs = e.regions!;
    const buf = new Float32Array(rs.ids.length);
    const ra = rs.ids.indexOf('ra');
    const onsets: number[] = [];
    rs.stateAt(0, buf);
    let prev = buf[ra];
    for (let t = 2; t < e.signal.durationMs; t += 2) {
      rs.stateAt(t, buf);
      const s = buf[ra];
      if (s > 0 && s < 1 && !(prev > 0 && prev < 1)) onsets.push(t);
      prev = s;
    }
    expect(onsets.length).toBeGreaterThanOrEqual(40);
    for (let k = 1; k < onsets.length; k++) expect(Math.abs(onsets[k] - onsets[k - 1] - 200), `RA onset ${k}`).toBeLessThan(5);
  });
  it('worked step 4: the F waves of this heart are upright in V1 (its 4:1 version, the same seed with only the ratio dial changed, frees them from the T)', () => {
    const w = blocksOf('t3', 'worked')[0].ecg;
    if (w.kind !== 'synth') throw new Error('synthetic worked ECG expected');
    const four = ecgOf({ ...w.req, dials: { ...w.req.dials, conductionRatio: 4 } });
    expect(four.truth!.atrialRateBpm).toBe(300);
    expect(swing(four, 'V1').up).toBeGreaterThan(1.5 * swing(four, 'V1').dn);
    expect(swing(four, 'II').dn).toBeGreaterThan(1.5 * swing(four, 'II').up);
  });
  it('laddergram: the hook strip, an F every 200 ms, every second F conducted and visible, every blocked F hidden', () => {
    const fig = blocksOf('t3', 'figure').find((b) => b.figure.id === 'laddergram')!;
    expect(fig.ecg).toEqual(blocksOf('t3', 'hook')[0].ecg);
    const t = ecgOf(fig.ecg!).truth!;
    const inStrip = t.atrial.filter((a) => a.t > t.beats[0].qrsOn && a.t < t.beats[t.beats.length - 1].qrsOn);
    for (let i = 1; i < t.atrial.length; i++) expect(Math.abs(t.atrial[i].t - t.atrial[i - 1].t - 200)).toBeLessThan(3);
    inStrip.forEach((a, i) => {
      expect(a.conductedTo === null, `F ${i}`).toBe(inStrip[0].conductedTo === null ? i % 2 === 0 : i % 2 === 1);
      expect(a.visible, `F ${i}`).toBe(a.conductedTo !== null);
    });
  });
  it('direction film: one heart; counter-clockwise F negative in II, III, aVF and upright in V1; clockwise F positive inferiorly and negative in V1', () => {
    const film = blocksOf('t3', 'film')[0];
    const [ccw, cw] = film.frames.map((f) => (f.ecg.kind === 'synth' ? f.ecg.req : null));
    expect({ ...cw!, variant: undefined }).toEqual({ ...ccw!, variant: undefined });
    const [a, b] = frames('t3', 0);
    for (const l of ['II', 'III', 'aVF'] as const) {
      expect(swing(a, l).dn, `ccw ${l}`).toBeGreaterThan(1.5 * swing(a, l).up);
      expect(swing(b, l).up, `cw ${l}`).toBeGreaterThan(1.5 * swing(b, l).dn);
    }
    expect(swing(a, 'V1').up).toBeGreaterThan(1.5 * swing(a, 'V1').dn);
    expect(swing(b, 'V1').dn).toBeGreaterThan(1.5 * swing(b, 'V1').up);
    expect(a.truth!.rhythm).toBe('atrial-flutter');
    expect(b.truth!.rhythm).toBe('atrial-flutter');
    expect(Math.abs(ffMedian(a) - 200), 'counter-clockwise F–F').toBeLessThan(3);
    expect(Math.abs(ffMedian(b) - 210), 'clockwise F–F').toBeLessThan(3);
  });
  it('ratio sweep notes: 2:1 at 150/min with about half the F waves hidden; 3:1 at 100/min with more F showing; 4:1 at 75/min with four F per RR, one running into the QRS; atria at 300/min throughout', () => {
    const [two, three, four] = [2, 3, 4].map((v) => played('t3', 0, v));
    for (const [e, hr] of [[two, 150], [three, 100], [four, 75]] as const) {
      expect(Math.abs(e.truth!.hrBpm - hr), `${hr}`).toBeLessThan(1);
      expect(e.truth!.atrialRateBpm, `${hr}`).toBe(300);
    }
    expect(Math.abs(hiddenShare(two) - 0.5)).toBeLessThan(0.1);
    expect(hiddenShare(three)).toBeLessThan(hiddenShare(two) - 0.1);
    for (const rr of rrs(four)) expect(Math.round(rr / 200)).toBe(4);
    expect(hiddenShare(four)).toBeLessThan(0.35);
    expectFourFOneInQrs(four);
  });
  it('4:1 contrast: ventricles at 75/min, four F per RR with one running into the QRS; sinus rhythm at 75/min with one P before every QRS, a constant PR and a flat baseline before the P and in the PR segment', () => {
    const c = blocksOf('t3', 'contrast')[0];
    const e = ecgOf(c.left.ecg);
    expect(Math.abs(e.truth!.hrBpm - 75)).toBeLessThan(1);
    expectFourFOneInQrs(e);
    const s = ecgOf(c.right.ecg);
    const t = s.truth!;
    expect(t.rhythm).toBe('sinus-rhythm');
    expect(Math.abs(t.hrBpm - 75)).toBeLessThanOrEqual(1);
    for (const [i, b] of t.beats.entries()) {
      expect(b.pOn, `beat ${i} has its P`).not.toBeNull();
      expect(t.atrial.filter((a) => a.conductedTo === i).length, `one P for beat ${i}`).toBe(1);
    }
    const prs = t.beats.map((b) => b.qrsOn - b.pOn!);
    expect(Math.max(...prs) - Math.min(...prs)).toBeLessThan(5);
    t.beats.forEach((b, i) => {
      const base = baselineBefore(s.signal.leads.II, s.signal.fs, b.qrsOn);
      for (let x = b.pOff! + 4; x <= b.qrsOn - 4; x += 2) expect(Math.abs(at(s, 'II', x) - base), `PR segment ${i}`).toBeLessThanOrEqual(0.05);
      if (i > 0) for (let x = t.beats[i - 1].tOff + 20; x <= b.pOn! - 10; x += 2) expect(Math.abs(at(s, 'II', x) - base), `TP before ${i}`).toBeLessThanOrEqual(0.05);
    });
  });
  it('variable-block strip: every RR within 0.2 F–F of a whole multiple of 200 ms, from 3 to 5; the bracketed RR spans 5 F–F', () => {
    const b = blocksOf('t3', 'ecg')[0];
    const e = ecgOf(b.ecg);
    expect(e.truth!.atrialRateBpm).toBe(300);
    for (const rr of rrs(e)) {
      expect(Math.abs(rr / 200 - Math.round(rr / 200)), `${rr}`).toBeLessThan(0.2);
      expect([3, 4, 5]).toContain(Math.round(rr / 200));
    }
    const rr = rrs(e)[markBeat(b.marks, 'rr')];
    expect(Math.round(rr / 200)).toBe(5);
    expect(Math.abs(rr / 200 - 5)).toBeLessThan(0.2);
  });
});

describe('t4 on the tracings', () => {
  it('worked WPW: PR about 116 ms (< 120), QRS > 120 ms, V1 mainly positive with R ≥ S, delta negative in I and aVL, nearly isoelectric in V5 and negative in V6', () => {
    const e = ecgOf(blocksOf('t4', 'worked')[0].ecg);
    const t = e.truth!;
    expect(Math.abs(t.prMs! - 116)).toBeLessThan(5);
    expect(t.prMs!).toBeLessThan(120);
    expect(t.qrsMs).toBeGreaterThan(120);
    const b = mid(e);
    for (const l of ['I', 'aVL'] as const) expect(excursion(e, l, b.qrsOn, b.qrsOn, b.qrsOn + 40), l).toBeLessThan(-0.1);
    expect(excursion(e, 'V1', b.qrsOn, b.qrsOn, b.qrsOn + 60)).toBeGreaterThan(0.3);
    const v1 = qrsWaves(e.signal.leads.V1, e.signal.fs, b.qrsOn, b.qrsOff);
    const r = Math.max(...v1.filter((x) => x.role === 'r').map((x) => x.mv));
    const s = Math.min(0, ...v1.filter((x) => x.role === 's').map((x) => x.mv));
    expect(r, 'V1 R ≥ S').toBeGreaterThanOrEqual(-s);
    expect(v1[0].role, 'V1 starts with its R').toBe('r');
    expect(Math.abs(excursion(e, 'V5', b.qrsOn, b.qrsOn, b.qrsOn + 30)), 'V5 delta').toBeLessThanOrEqual(0.05);
    expect(excursion(e, 'V6', b.qrsOn, b.qrsOn, b.qrsOn + 30), 'V6 delta').toBeLessThan(-0.05);
  });
  it('WPW heart: the region at the pathway depolarises at QRS onset, at least 20 ms before any other ventricular region', () => {
    const e = ecgOf(blocksOf('t4', 'heart')[0].ecg);
    const rs = e.regions!;
    const b = mid(e);
    const buf = new Float32Array(rs.ids.length);
    const first = new Map<string, number>();
    for (let t = b.qrsOn - 40; t < b.qrsOn + 150; t += 2) {
      rs.stateAt(t, buf);
      rs.ids.forEach((id, k) => {
        if (!first.has(id) && /^(lv|rv)-/.test(id) && buf[k] > 0 && buf[k] < 1) first.set(id, t - b.qrsOn);
      });
    }
    expect(rs.highlights['lv-basal-anterolateral']).toBe('pathway');
    const ap = first.get('lv-basal-anterolateral')!;
    expect(Math.abs(ap)).toBeLessThanOrEqual(10);
    for (const [id, t] of first) if (id !== 'lv-basal-anterolateral') expect(t, id).toBeGreaterThanOrEqual(ap + 20);
  });
  it('mimic film: every frame is the hook ECG; V1 wide and mainly positive; negative delta in I and aVL; T opposite to the QRS in II, III, aVF and V1–V6; I nearly isoelectric, aVF upright, axis beyond +90°', () => {
    const hook = blocksOf('t4', 'hook')[0].ecg;
    for (const f of blocksOf('t4', 'film')[0].frames) expect(f.ecg).toEqual(hook);
    const e = ecgOf(hook);
    const b = mid(e);
    const net = (lead: StdLead, t0: number, t1: number) => {
      const a = e.signal.leads[lead];
      const base = baselineBefore(a, e.signal.fs, b.qrsOn);
      let mx = -Infinity;
      let mn = Infinity;
      for (let t = t0; t <= t1; t += 2) {
        mx = Math.max(mx, at(e, lead, t) - base);
        mn = Math.min(mn, at(e, lead, t) - base);
      }
      return { net: mx + mn, p2p: mx - mn };
    };
    expect(e.truth!.prMs!, 'hook reveal: PR < 120 ms').toBeLessThan(120);
    expect(e.truth!.qrsMs, 'hook reveal: QRS > 120 ms').toBeGreaterThan(120);
    expect(net('V1', b.qrsOn, b.qrsOff).net).toBeGreaterThan(0.1);
    for (const l of ['I', 'aVL'] as const) expect(excursion(e, l, b.qrsOn, b.qrsOn, b.qrsOn + 30), l).toBeLessThan(-0.1);
    for (const l of ['II', 'III', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) {
      expect(net(l, b.qrsOn, b.qrsOff).net, `${l} QRS`).toBeGreaterThan(0.1);
      expect(net(l, b.j + 40, b.tOff).net, `${l} T`).toBeLessThan(-0.04);
    }
    const i = net('I', b.qrsOn, b.qrsOff);
    expect(Math.abs(i.net)).toBeLessThan(0.25 * i.p2p);
    expect(net('aVF', b.qrsOn, b.qrsOff).net).toBeGreaterThan(0.3);
    expect(e.truth!.axisDeg.qrs).toBeGreaterThan(90);
  });
  it('pathway film (12-lead sheet): four left lateral pathways; sinus PR about 115 ms with QRS about 120 ms; orthodromic AVRT narrow and regular at 190/min through a concealed pathway (no WPW finding), the P′ on the ST segment with a dip in I and aVL (where its marks sit) and no hump in II; antidromic AVRT regular, 185/min, QRS about 155 ms; pre-excited AF 200/min, irregular, QRS width varying with narrower beats, shortest RR about 210 ms (bracketed) ending on a wide beat (marked)', () => {
    const film = blocksOf('t4', 'film')[1];
    expect(film.view?.layout).toBe('3x4+1');
    const [sinus, ortho, anti, af] = frames('t4', 1);
    for (const e of [sinus, ortho, anti, af]) expect(e.truth!.facts.pathway).toMatch(/^left lateral/);
    expect(Math.abs(sinus.truth!.prMs! - 115)).toBeLessThan(5);
    expect(Math.abs(sinus.truth!.qrsMs - 120)).toBeLessThan(5);
    expect(sinus.truth!.findings).toContain('wpw');
    const o = ortho.truth!;
    expect(Math.abs(o.hrBpm - 190)).toBeLessThanOrEqual(1);
    expect(o.qrsMs).toBeLessThan(110);
    expect(Math.max(...rrs(ortho)) - Math.min(...rrs(ortho))).toBeLessThan(10);
    const ob = mid(ortho);
    expect(ob.pOn!).toBeGreaterThan(ob.qrsOff);
    expect(ob.pOn!).toBeLessThan(ob.tPeak!);
    for (const l of ['I', 'aVL'] as const) expect(localPeak(ortho, l, -1, ob.pOn!, ob.tPeak! - 10), `dip in ${l}`).toBeGreaterThan(0.05);
    expect(localPeak(ortho, 'II', 1, ob.pOn!, ob.tPeak! - 10), 'no hump in II').toBeLessThanOrEqual(0.05);
    expect(film.frames[1].marks?.map((m) => ('auto' in m ? m.lead : null))).toEqual(['I', 'aVL']);
    expect(o.findings).not.toContain('wpw');
    const a = anti.truth!;
    expect(Math.abs(a.hrBpm - 185)).toBeLessThanOrEqual(1);
    expect(Math.abs(a.qrsMs - 155)).toBeLessThan(5);
    expect(Math.max(...rrs(anti)) - Math.min(...rrs(anti))).toBeLessThan(10);
    const p = af.truth!;
    expect(Math.abs(p.hrBpm - 200)).toBeLessThanOrEqual(1);
    expect(Math.abs(Math.min(...rrs(af)) - 210)).toBeLessThan(5);
    expect(Math.max(...rrs(af)) - Math.min(...rrs(af))).toBeGreaterThan(150);
    const widths = p.beats.map((x) => x.qrsOff - x.qrsOn);
    expect(Math.max(...widths)).toBeGreaterThanOrEqual(150);
    expect(widths.filter((w) => w < 110).length).toBeGreaterThanOrEqual(2);
    const short = markBeat(film.frames[3].marks, 'rr');
    expect(rrs(af)[short], 'the bracket is the shortest RR').toBe(Math.min(...rrs(af)));
    expect(markBeat(film.frames[3].marks, 'qrs')).toBe(short + 1);
    expect(widths[short + 1], 'the marked QRS is wide').toBeGreaterThanOrEqual(150);
  });
  it('delta contrast: both PR < 120 ms; left wide QRS (≥ 120 ms) with pre-excitation, right narrow QRS without', () => {
    const c = blocksOf('t4', 'contrast')[0];
    const [wpw, short] = [ecgOf(c.left.ecg).truth!, ecgOf(c.right.ecg).truth!];
    for (const t of [wpw, short]) expect(t.prMs!).toBeLessThan(120);
    expect(wpw.qrsMs).toBeGreaterThanOrEqual(120);
    expect(wpw.findings).toContain('wpw');
    expect(short.qrsMs).toBeLessThan(110);
    expect(short.findings).not.toContain('wpw');
  });
});

describe('t5 on the tracings', () => {
  it('hook VT: wide and regular at 150/min', () => {
    const e = ecgOf(blocksOf('t5', 'hook')[0].ecg);
    expect(Math.abs(e.truth!.hrBpm - 150)).toBeLessThanOrEqual(1);
    expect(e.truth!.qrsMs).toBeGreaterThanOrEqual(120);
    expect(Math.max(...rrs(e)) - Math.min(...rrs(e))).toBeLessThan(10);
  });
  it('worked VT: QRS about 160 ms, RR about 480 ms (125/min), AV dissociation with visible sinus P at 75/min, axis about −100° with I, II and aVF mainly negative, V1 positive, aVR starting with a dominant R; V1–V4 RS, V5–V6 QS, R onset to S nadir about 135 ms in V1–V3 (the longest)', () => {
    const e = ecgOf(blocksOf('t5', 'worked')[0].ecg);
    const t = e.truth!;
    expect(Math.abs(t.hrBpm - 125)).toBeLessThanOrEqual(1);
    expect(Math.abs(median(rrs(e)) - 480)).toBeLessThan(5);
    expect(Math.abs(t.atrialRateBpm! - 75)).toBeLessThanOrEqual(1);
    expect(Math.abs(t.qrsMs - 160)).toBeLessThan(5);
    expect(Math.abs(t.axisDeg.qrs - -100)).toBeLessThan(5);
    expect(t.findings).toContain('av-dissociation');
    expect(t.atrial.filter((a) => a.conductedTo === null && a.visible).length).toBeGreaterThanOrEqual(3);
    const b = mid(e);
    const waves = (l: StdLead) => qrsWaves(e.signal.leads[l], e.signal.fs, b.qrsOn, b.qrsOff);
    const netOf = (l: StdLead) => waves(l).reduce((s, w) => s + w.mv, 0);
    for (const l of ['I', 'II', 'aVF'] as const) expect(netOf(l), `${l} mainly negative`).toBeLessThan(-0.1);
    expect(netOf('V1'), 'V1 positive').toBeGreaterThan(0.1);
    const avr = waves('aVR');
    expect(avr[0].role, 'aVR starts with an R').toBe('r');
    expect(Math.abs(avr[0].mv), 'aVR initial R dominant').toBe(Math.max(...avr.map((w) => Math.abs(w.mv))));
    const rsMs = (l: StdLead) => {
      const w = waves(l);
      const r = w.findIndex((x) => x.role === 'r');
      const s = w.findIndex((x, k) => k > r && x.role === 's');
      return r >= 0 && s > r ? w[s].t - b.qrsOn : null;
    };
    for (const l of ['V1', 'V2', 'V3', 'V4'] as const) expect(rsMs(l), `${l} has an RS`).not.toBeNull();
    for (const l of ['V5', 'V6'] as const) expect(waves(l).map((w) => w.label), l).toEqual(['QS']);
    for (const l of ['V1', 'V2', 'V3'] as const) {
      expect(waves(l)[0].role, `${l} starts with its R`).toBe('r');
      expect(Math.abs(rsMs(l)! - 135), `${l} R onset to S nadir`).toBeLessThan(5);
      expect(rsMs(l)!, `${l} longer than V4`).toBeGreaterThan(rsMs('V4')!);
    }
  });
  it('capture film: one strip in every frame; sinus P at about 68/min dissociated; narrow upright captures at beats 7 and 22, early for the VT but on time for their sinus P; a fusion beat of about 115 ms at beat 9, between the capture and the VT widths', () => {
    const film = blocksOf('t5', 'film')[0];
    for (const f of film.frames) expect(f.ecg).toEqual(film.frames[0].ecg);
    const e = ecgOf(film.frames[0].ecg);
    const t = e.truth!;
    const beats = t.beats;
    expect(Math.abs(t.atrialRateBpm! - 68)).toBeLessThanOrEqual(1);
    expect(t.findings).toContain('av-dissociation');
    expect(beats[7].kind).toBe('capture');
    expect(beats[9].kind).toBe('fusion');
    expect(beats[22].kind).toBe('capture');
    const w = (i: number) => beats[i].qrsOff - beats[i].qrsOn;
    const netII = (i: number) => {
      const a = e.signal.leads.II;
      const base = baselineBefore(a, e.signal.fs, beats[i].qrsOn);
      let mx = -Infinity;
      let mn = Infinity;
      for (let x = beats[i].qrsOn; x <= beats[i].qrsOff; x += 2) {
        mx = Math.max(mx, at(e, 'II', x) - base);
        mn = Math.min(mn, at(e, 'II', x) - base);
      }
      return mx + mn;
    };
    const vtRr = median(rrs(e));
    const pp = median(t.atrial.slice(1).map((a, k) => a.t - t.atrial[k].t));
    for (const i of [7, 22]) {
      expect(w(i), `capture ${i}`).toBeLessThan(100);
      expect(netII(i), `capture ${i}`).toBeGreaterThan(0.2);
      expect(beats[i].qrsOn - beats[i - 1].qrsOn, `capture ${i} early`).toBeLessThan(vtRr - 10);
      const k = t.atrial.findIndex((a) => a.conductedTo === i);
      expect(k, `capture ${i} has its P`).toBeGreaterThan(0);
      expect(t.atrial[k].kind, `capture ${i}`).toBe('sinus');
      expect(Math.abs(t.atrial[k].t - t.atrial[k - 1].t - pp), `capture ${i}: its P on the sinus PP`).toBeLessThan(20);
      expect(beats[i].qrsOn - t.atrial[k].t, `capture ${i} PR`).toBeGreaterThanOrEqual(120);
      expect(beats[i].qrsOn - t.atrial[k].t, `capture ${i} PR`).toBeLessThanOrEqual(220);
    }
    expect(netII(5)).toBeLessThan(-0.2);
    expect(Math.abs(w(9) - 115)).toBeLessThan(5);
    expect(w(9)).toBeGreaterThan(w(7));
    expect(w(9)).toBeLessThan(w(5));
  });
  it('VT heart: activation starts at the inferior scar focus and spreads region by region over most of a QRS of about 160 ms; the atria stay sinus and dissociated', () => {
    const e = ecgOf(blocksOf('t5', 'heart')[0].ecg);
    const rs = e.regions!;
    const b = mid(e);
    const buf = new Float32Array(rs.ids.length);
    const first = new Map<string, number>();
    for (let t = b.qrsOn - 40; t < b.qrsOn + 250; t += 2) {
      rs.stateAt(t, buf);
      rs.ids.forEach((id, k) => {
        if (!first.has(id) && /^(lv|rv)-/.test(id) && buf[k] > 0 && buf[k] < 1) first.set(id, t - b.qrsOn);
      });
    }
    expect(rs.highlights['lv-apical-inferior']).toBe('focus');
    expect(rs.highlights['lv-mid-inferior']).toBe('infarct');
    expect(Math.abs(first.get('lv-apical-inferior')!)).toBeLessThanOrEqual(4);
    expect(Math.min(...first.values())).toBe(first.get('lv-apical-inferior'));
    expect(Math.max(...first.values())).toBeGreaterThan(80);
    expect(Math.abs(e.truth!.qrsMs - 160)).toBeLessThan(5);
    expect(e.truth!.atrial.every((a) => a.kind === 'sinus' && a.conductedTo === null)).toBe(true);
  });
  it('VT sweep notes: 75–100 ms of flat line and some dissociated P visible at every rate of 140–150 (sinus about 80/min); under 25 ms and at most 2 P visible at every rate of 189–200; QRS about 160 ms with a northwest axis at both ends', () => {
    const flat = (e: Ecg) => median(rrs(e)) - (mid(e).tOff - mid(e).qrsOn);
    const visibleP = (e: Ecg) => e.truth!.atrial.filter((a) => a.conductedTo === null && a.visible).length;
    const notes = blocksOf('t5', 'live')[0].play!.notes!;
    expect(notes.map((n) => [n.min, n.max])).toEqual([[140, 150], [189, 200]]);
    for (let v = 140; v <= 150; v++) {
      const e = played('t5', 0, v);
      expect(flat(e), `${v}`).toBeGreaterThan(75);
      expect(flat(e), `${v}`).toBeLessThan(100);
      expect(visibleP(e), `${v}`).toBeGreaterThanOrEqual(3);
      expect(Math.abs(e.truth!.atrialRateBpm! - 80), `${v}`).toBeLessThanOrEqual(1);
    }
    for (let v = 189; v <= 200; v++) {
      const e = played('t5', 0, v);
      expect(flat(e), `${v}`).toBeLessThan(25);
      expect(visibleP(e), `${v}`).toBeLessThanOrEqual(2);
    }
    for (const v of [140, 200]) {
      const t = played('t5', 0, v).truth!;
      expect(Math.abs(t.qrsMs - 160), `${v}`).toBeLessThan(5);
      expect(t.axisDeg.qrs, `${v}`).toBeLessThan(-90);
      expect(t.rhythm).toBe('vt-monomorphic');
    }
  });
  it('mimics film: an early aberrant PAC with rsR′ in V1 and in V6 a q, a tall R and a smaller S (R/S > 1); pre-excited AF irregular with the QRS width changing beat to beat and shortest RR about 235 ms; every QRS paced and wide; right-arm artefact in I, II and aVR with III untouched and a steady RR', () => {
    const mimics = blocksOf('t5', 'film')[1];
    for (const s of [mimics.title.en, mimics.predict!.question.en]) expect(s, 'the title and question do not name the answer').not.toMatch(/mimic|artefact|artifact|"/i);
    const [ab, pre, paced, art] = frames('t5', 1);
    const bs = ab.truth!.beats;
    const b = bs[6];
    expect(b.kind).toBe('atrial');
    expect(b.qrsOff - b.qrsOn).toBeGreaterThanOrEqual(120);
    expect(b.qrsOn - bs[5].qrsOn).toBeLessThan(0.8 * median(rrs(ab)));
    const labels = (lead: StdLead) => qrsWaves(ab.signal.leads[lead], ab.signal.fs, b.qrsOn, b.qrsOff).map((x) => x.label).join('');
    expect(labels('V1')).toBe('rsR′');
    expect(labels('V6')).toBe('qRS');
    const v6 = qrsWaves(ab.signal.leads.V6, ab.signal.fs, b.qrsOn, b.qrsOff);
    expect(v6.map((x) => x.role)).toEqual(['q', 'r', 's']);
    expect(v6[1].mv / Math.abs(v6[2].mv), 'V6 R/S').toBeGreaterThan(1);
    expect(Math.abs(Math.min(...rrs(pre)) - 235)).toBeLessThan(5);
    expect(rrs(pre)[markBeat(blocksOf('t5', 'film')[1].frames[1].marks, 'rr')], 'the bracket is the shortest RR').toBe(Math.min(...rrs(pre)));
    expect(Math.max(...rrs(pre)) - Math.min(...rrs(pre))).toBeGreaterThan(150);
    const widths = pre.truth!.beats.map((x) => x.qrsOff - x.qrsOn);
    expect(Math.max(...widths)).toBeGreaterThanOrEqual(140);
    expect(Math.max(...widths) - Math.min(...widths)).toBeGreaterThan(30);
    expect(widths.slice(1).filter((x, i) => Math.abs(x - widths[i]) > 20).length, 'width changes between neighbouring beats').toBeGreaterThanOrEqual(8);
    expect(paced.truth!.beats.every((x) => x.kind === 'paced-ventricular' && x.qrsOff - x.qrsOn >= 120)).toBe(true);
    const artReq = blocksOf('t5', 'film')[1].frames[3].ecg;
    if (artReq.kind !== 'synth') throw new Error('synthetic artefact frame expected');
    const clean = ecgOf({ ...artReq.req, recording: { noise: { motion: { electrode: 'RA', tMs: 2600, durMs: 3600, mv: 0 } } } });
    const diff = (l: StdLead) => Math.max(...art.signal.leads[l].map((x, i) => Math.abs(x - clean.signal.leads[l][i])));
    expect(diff('III')).toBeLessThan(1e-6);
    for (const l of ['I', 'II', 'aVR'] as const) expect(diff(l), l).toBeGreaterThan(0.2);
    expect(Math.max(...rrs(art)) - Math.min(...rrs(art))).toBeLessThan(60);
  });
  it('VT vs antidromic AVRT contrast: V4–V6 mainly negative in the VT and positive in the AVRT; ventricular flutter about 300/min with a cycle of about 200 ms', () => {
    const c = blocksOf('t5', 'contrast')[0];
    const [vt, avrt] = [ecgOf(c.left.ecg), ecgOf(c.right.ecg)];
    const net = (e: Ecg, lead: StdLead) => {
      const b = mid(e);
      const base = baselineBefore(e.signal.leads[lead], e.signal.fs, b.qrsOn);
      let mx = -Infinity;
      let mn = Infinity;
      for (let x = b.qrsOn; x <= b.qrsOff; x += 2) {
        mx = Math.max(mx, at(e, lead, x) - base);
        mn = Math.min(mn, at(e, lead, x) - base);
      }
      return mx + mn;
    };
    for (const l of ['V4', 'V5', 'V6'] as const) {
      expect(net(vt, l), `VT ${l}`).toBeLessThan(-0.1);
      expect(net(avrt, l), `AVRT ${l}`).toBeGreaterThan(0.1);
    }
    const vf = ecgOf(blocksOf('t5', 'ecg').find((b) => b.ecg.kind === 'synth' && b.ecg.req.scenario === 'ventricular-flutter')!.ecg);
    expect(Math.abs(vf.truth!.hrBpm - 300)).toBeLessThanOrEqual(1);
    expect(Math.abs(median(rrs(vf)) - 200)).toBeLessThan(5);
  });
});

describe('t6 on the tracings', () => {
  it('hook torsades: sinus beats first, QT of the first sinus beat about 565 ms and its Bazett QTc about 570 ms; the twisting run at about 220/min; contrast left has a normal QT context', () => {
    const e = ecgOf(blocksOf('t6', 'hook')[0].ecg);
    const [first, second] = e.truth!.beats;
    expect(first.kind).toBe('sinus');
    const qt = first.tOff - first.qrsOn;
    expect(Math.abs(qt - 565)).toBeLessThan(5);
    expect(Math.abs(qt / Math.sqrt((second.qrsOn - first.qrsOn) / 1000) - 570)).toBeLessThan(5);
    const bs = e.truth!.beats;
    const run = bs.slice(1).flatMap((b, i) => (b.kind === 'ventricular' && bs[i].kind === 'ventricular' ? [b.qrsOn - bs[i].qrsOn] : []));
    expect(run.length).toBeGreaterThanOrEqual(10);
    expect(Math.abs(60_000 / (run.reduce((s, x) => s + x, 0) / run.length) - 220), 'run rate').toBeLessThanOrEqual(1);
    expect(e.truth!.findings).toContain('long-qt');
    const left = ecgOf(blocksOf('t6', 'contrast')[0].left.ecg).truth!;
    expect(left.rhythm).toBe('vt-polymorphic');
    expect(left.findings).not.toContain('long-qt');
  });
  it('torsades contrast: the QT of the first sinus beat is marked on both sides; normal (under 440 ms) on the left, about 565 ms on the right', () => {
    const c = blocksOf('t6', 'contrast')[0];
    for (const side of [c.left, c.right]) expect(side.marks).toContainEqual({ auto: 'qt', beat: 0 });
    const [l0, r0] = [ecgOf(c.left.ecg).truth!.beats[0], ecgOf(c.right.ecg).truth!.beats[0]];
    expect(l0.kind).toBe('sinus');
    expect(l0.tOff - l0.qrsOn).toBeLessThan(440);
    expect(r0.kind).toBe('sinus');
    expect(Math.abs(r0.tOff - r0.qrsOn - 565)).toBeLessThan(5);
  });
  it('artefact film: a title and a question that do not name the answer; sinus rhythm with regular QRS through the burst (RR about 830 ms, marked beats inside it); the burst sits at about 3–6 s in II; with the electrode still the same heart beats identically and III never changes', () => {
    const film = blocksOf('t6', 'film')[1];
    for (const s of [film.title.en, film.predict!.question.en]) expect(s).not.toMatch(/\bVT\b|artefact|artifact/i);
    expect(film.frames[1].ecg).toEqual(film.frames[0].ecg);
    const [noisy, , still] = frames('t6', 1);
    expect(noisy.truth!.rhythm).toBe('sinus-rhythm');
    for (const rr of rrs(noisy)) expect(Math.abs(rr - 830)).toBeLessThan(60);
    const meanRr = rrs(noisy).reduce((s, x) => s + x, 0) / rrs(noisy).length;
    expect(Math.abs(meanRr - 830)).toBeLessThan(5);
    for (const i of [4, 5]) {
      expect(noisy.truth!.beats[i].qrsOn, `beat ${i}`).toBeGreaterThan(2600);
      expect(noisy.truth!.beats[i].qrsOn, `beat ${i}`).toBeLessThan(6200);
    }
    expect(still.truth!.beats.map((b) => b.qrsOn)).toEqual(noisy.truth!.beats.map((b) => b.qrsOn));
    const fs = noisy.signal.fs;
    const d = (l: StdLead, t0: number, t1: number) => {
      let m = 0;
      for (let i = Math.round((t0 * fs) / 1000); i < Math.round((t1 * fs) / 1000); i++) m = Math.max(m, Math.abs(noisy.signal.leads[l][i] - still.signal.leads[l][i]));
      return m;
    };
    expect(d('III', 0, 10_000)).toBeLessThan(1e-6);
    expect(d('II', 2600, 6200)).toBeGreaterThan(0.2);
    expect(d('II', 0, 2500)).toBeLessThan(1e-6);
    expect(d('II', 6400, 10_000)).toBeLessThan(1e-6);
  });
  it('VF sweep notes: about 2 mV (20 mm) of II at 0.91–0.98 and about 1–1.3 mV at 0.5–0.6, VF throughout; the fine-VF frame about 2 mm, far smaller', () => {
    const p2p = (e: Ecg) => {
      const a = e.signal.leads.II;
      const fs = e.signal.fs;
      const out: number[] = [];
      for (let s = 0; s + fs <= a.length; s += fs) {
        let mx = -Infinity;
        let mn = Infinity;
        for (let i = s; i < s + fs; i++) {
          mx = Math.max(mx, a[i]);
          mn = Math.min(mn, a[i]);
        }
        out.push(mx - mn);
      }
      return median(out);
    };
    const notes = blocksOf('t6', 'live')[0].play!.notes!;
    expect(notes.map((n) => [n.min, n.max])).toEqual([[0.91, 0.98], [0.5, 0.6]]);
    for (const v of [0.91, 0.98]) {
      const e = played('t6', 0, v);
      expect(Math.abs(p2p(e) - 2), `${v}`).toBeLessThanOrEqual(0.1);
      expect(e.truth!.rhythm).toBe('ventricular-fibrillation');
    }
    for (const v of [0.5, 0.6]) {
      const e = played('t6', 0, v);
      expect(p2p(e), `${v}`).toBeGreaterThan(1);
      expect(p2p(e), `${v}`).toBeLessThan(1.3);
      expect(e.truth!.rhythm).toBe('ventricular-fibrillation');
    }
    const fine = frames('t6', 0)[2];
    expect(Math.abs(p2p(fine) - 0.2), 'about 2 mm').toBeLessThanOrEqual(0.025);
    expect(p2p(fine)).toBeLessThan(0.3 * p2p(played('t6', 0, 0.5)));
  });
  it('shock film: VF with no beats; ventricular flutter 300/min, cycle about 200 ms varying ≤ 30 ms; fine VF (frame 3, the prediction): small chaotic waves, not a flat line and no complexes; P waves at 52/min with no QRS', () => {
    const film = blocksOf('t6', 'film')[0];
    const [vf, vfl, fine, asys] = frames('t6', 0);
    expect(vf.truth!.rhythm).toBe('ventricular-fibrillation');
    expect(vf.truth!.beats.length).toBe(0);
    expect(Math.abs(vfl.truth!.hrBpm - 300)).toBeLessThanOrEqual(1);
    expect(Math.abs(median(rrs(vfl)) - 200)).toBeLessThan(5);
    expect(Math.max(...rrs(vfl)) - Math.min(...rrs(vfl))).toBeLessThanOrEqual(30);
    expect(film.predict!.options[film.predict!.answer].en).toBe('Small, chaotic waves');
    expect(fine.truth!.rhythm).toBe('ventricular-fibrillation');
    expect(fine.truth!.beats.length, 'no complexes').toBe(0);
    const ii = fine.signal.leads.II;
    expect(Math.max(...ii) - Math.min(...ii), 'not a flat line').toBeGreaterThan(0.05);
    const a = asys.truth!;
    expect(a.rhythm).toBe('asystole');
    expect(a.beats.length).toBe(0);
    expect(Math.abs(a.atrialRateBpm! - 52)).toBeLessThanOrEqual(1);
    expect(a.atrial.every((x) => x.conductedTo === null)).toBe(true);
  });
});

describe('t7 on the tracings', () => {
  it('hook is asystole; the complete-AV-block heart: sinus P about 78/min, none conducted, a wide ventricular escape about 34/min that starts at the apex', () => {
    expect(ecgOf(blocksOf('t7', 'hook')[0].ecg).truth!.rhythm).toBe('asystole');
    const e = ecgOf(blocksOf('t7', 'heart')[0].ecg);
    const t = e.truth!;
    expect(Math.abs(t.hrBpm - 34)).toBeLessThan(3);
    expect(t.qrsMs).toBeGreaterThanOrEqual(120);
    expect(Math.abs(t.atrialRateBpm! - 78)).toBeLessThan(3);
    expect(t.atrial.every((a) => a.conductedTo === null)).toBe(true);
    expect(t.beats.every((b) => b.kind === 'escape-ventricular')).toBe(true);
    const rs = e.regions!;
    const b = mid(e);
    const buf = new Float32Array(rs.ids.length);
    const first = new Map<string, number>();
    for (let x = b.qrsOn - 40; x < b.qrsOn + 200; x += 2) {
      rs.stateAt(x, buf);
      rs.ids.forEach((id, k) => {
        if (!first.has(id) && /^(lv|rv)-/.test(id) && buf[k] > 0 && buf[k] < 1) first.set(id, x - b.qrsOn);
      });
    }
    expect(Math.min(...first.values())).toBe(first.get('lv-apex'));
  });
  it('pulse film: a wide regular VT at about 150/min; an organised sinus rhythm at about 70/min', () => {
    const [vt, organised] = frames('t7', 0);
    expect(vt.truth!.rhythm).toBe('vt-monomorphic');
    expect(Math.abs(vt.truth!.hrBpm - 150)).toBeLessThan(5);
    expect(vt.truth!.qrsMs).toBeGreaterThanOrEqual(120);
    expect(Math.max(...rrs(vt)) - Math.min(...rrs(vt))).toBeLessThan(20);
    expect(organised.truth!.rhythm).toBe('sinus-rhythm');
    expect(Math.abs(organised.truth!.hrBpm - 70)).toBeLessThan(3);
  });
  it('post-ROSC film: ST up 1–3.5 mm in V1–V4 with II, III and aVF down; QT about 505 ms at about 64/min with QTc over 500 ms; PR about 115 ms with QRS about 125 ms and pre-excitation; coved ST about 3.5 mm into a negative T in V1–V2', () => {
    const [stemi, lqt, wpw, brugada] = frames('t7', 1);
    const st = (e: Ecg, lead: StdLead, plus = 0) => {
      const b = mid(e);
      return at(e, lead, b.j + plus) - baselineBefore(e.signal.leads[lead], e.signal.fs, b.qrsOn);
    };
    for (const l of ['V1', 'V2', 'V3', 'V4'] as const) {
      expect(st(stemi, l), l).toBeGreaterThanOrEqual(0.1);
      expect(st(stemi, l), l).toBeLessThanOrEqual(0.35);
    }
    for (const l of ['II', 'III', 'aVF'] as const) expect(st(stemi, l), l).toBeLessThan(-0.05);
    const q = lqt.truth!;
    expect(Math.abs(q.qtMs - 505)).toBeLessThan(5);
    expect(Math.abs(q.hrBpm - 64)).toBeLessThan(2);
    for (const qtc of [q.qtcBazettMs, q.qtcFridericiaMs]) {
      expect(qtc).toBeGreaterThan(q.qtMs);
      expect(qtc).toBeGreaterThan(500);
    }
    expect(Math.abs(wpw.truth!.prMs! - 115)).toBeLessThan(5);
    expect(Math.abs(wpw.truth!.qrsMs - 125)).toBeLessThan(5);
    expect(wpw.truth!.findings).toContain('wpw');
    for (const l of ['V1', 'V2'] as const) {
      expect(st(brugada, l), l).toBeGreaterThanOrEqual(0.3);
      expect(st(brugada, l), l).toBeLessThanOrEqual(0.4);
      expect(st(brugada, l, 60), l).toBeLessThan(st(brugada, l));
      const b = mid(brugada);
      let mn = Infinity;
      for (let x = b.j + 80; x <= b.tOff; x += 2) mn = Math.min(mn, at(brugada, l, x) - baselineBefore(brugada.signal.leads[l], brugada.signal.fs, b.qrsOn));
      expect(mn, `${l} T`).toBeLessThan(-0.1);
    }
  });
  it('drills 10-second recognition: a speed-round text precedes the drill', () => {
    const kinds = lessonById('t7').blocks.map((b) => b.kind);
    const d = kinds.indexOf('drill');
    const prev = lessonById('t7').blocks[d - 1];
    expect(prev.kind).toBe('text');
    if (prev.kind === 'text') expect(prev.body.en).toMatch(/10 seconds per strip/);
  });
});
