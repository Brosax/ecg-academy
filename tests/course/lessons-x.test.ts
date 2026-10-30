/**
 * Stage X lessons (x1–x4, docs/PLAN.md §3): every lesson validates against the live catalogues with no errors and no
 * warnings, follows the lesson anatomy (attempt-first hook, worked example before practice, contrast, checks/drill, real
 * cases, summary), every family check generates, every synthetic ECG can be generated and shows what the text says,
 * and every real PTB-XL case is described as its labels and 12SL reference measurements say.
 */
import { describe, expect, it } from 'vitest';
import type { Block, Lesson } from '../../src/course/api';
import { liveValidateDeps } from '../../src/course/deps';
import { REGISTERED } from '../../src/course/lessons/index';
import { baselineBefore, qrsWaves } from '../../src/course/marks';
import { formatIssues, validateLesson } from '../../src/course/validate';
import type { BeatMarks, Ecg } from '../../src/core/ecg';
import { FINDINGS, type FindingId } from '../../src/core/findings';
import type { L10n } from '../../src/core/l10n';
import type { StdLead } from '../../src/core/leads';
import type { EcgSource, Item } from '../../src/practice/api';
import { generateItem } from '../../src/practice';
import { getCase } from '../../src/real/library';
import { generate, type SynthRequest } from '../../src/synth';

const IDS = ['x1', 'x2', 'x3', 'x4'] as const;

const lessons: readonly Lesson[] = IDS.flatMap((id) => {
  const m = REGISTERED.find((x) => x.fileId === id);
  return m?.lesson ? [m.lesson] : [];
});

/** Every ECG source a lesson shows (hook, ecg, figure, heart, worked, contrast, inline items, real blocks). */
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
      case 'real':
        b.ids.forEach((id, k) => out.push({ path: `${p}.ids[${k}]`, src: { kind: 'real', id } }));
        break;
      default:
        break;
    }
  });
  return out;
}

const realIds = (lesson: Lesson): number[] => [...new Set(sourcesOf(lesson).flatMap(({ src }) => (src.kind === 'real' ? [src.id] : [])))];

describe('stage X lessons', () => {
  it('all four lesson files exist and export their lesson', () => {
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
        expect(lesson.stage).toBe('X');
        expect(kinds[0]).toBe('hook');
        expect(kinds[kinds.length - 1]).toBe('summary');
        const firstWorked = kinds.indexOf('worked');
        const firstPractice = kinds.findIndex((k) => k === 'check' || k === 'drill');
        expect(firstWorked).toBeGreaterThanOrEqual(0);
        expect(firstPractice).toBeGreaterThan(firstWorked);
        for (const k of ['criteria', 'contrast', 'check', 'drill', 'real', 'pitfalls'] as const) expect(kinds, `${lesson.id} has a ${k} block`).toContain(k);
        const summary = lesson.blocks[lesson.blocks.length - 1];
        if (summary.kind === 'summary') {
          expect(summary.points.length).toBeGreaterThanOrEqual(3);
          expect(summary.points.length).toBeLessThanOrEqual(5);
        }
        expect(lesson.sources.length).toBeGreaterThanOrEqual(2);
        expect(lesson.sources.some((s) => s.startsWith('Castellano et al. 2004'))).toBe(true);
      });

      it('is a full-length capstone lesson (≥ 1300 English words)', () => {
        const words = texts(lesson).map(({ t }) => t.en).join(' ').split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
        expect(words).toBeGreaterThanOrEqual(1300);
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

      it('every real ECG it shows is a case of the library', () => {
        for (const id of realIds(lesson)) expect(getCase(id), `PTB-XL ${id}`).toBeDefined();
      });

      it('every family check generates an item', async () => {
        const failures: string[] = [];
        for (const [i, b] of lesson.blocks.entries()) {
          if (b.kind !== 'check' || 'inline' in b.item) continue;
          try {
            const item = await generateItem(b.item.family, b.item.seed, b.item.difficulty);
            if (item.family !== b.item.family) failures.push(`blocks[${i}]: got family ${item.family}`);
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

/** Every L10n object inside a value, with its path. */
function texts(v: unknown, path = ''): { readonly path: string; readonly t: L10n }[] {
  if (Array.isArray(v)) return v.flatMap((x, i) => texts(x, `${path}[${i}]`));
  if (typeof v !== 'object' || v === null) return [];
  const o = v as Record<string, unknown>;
  if (typeof o.zh === 'string' && typeof o.en === 'string' && typeof o.es === 'string') return [{ path, t: o as unknown as L10n }];
  return Object.entries(o).flatMap(([k, x]) => texts(x, path ? `${path}.${k}` : k));
}

describe('stage X text', () => {
  const OUTDATED: Readonly<Record<'zh' | 'en' | 'es', RegExp>> = {
    zh: /半支阻滞|心房肥大|类本位曲折|病窦综合征|结性心律|劳损/,
    en: /intrinsicoid|hemiblock|sick sinus|nodal rhythm|\bPSVT\b|strain pattern|atrial enlargement|Lown/i,
    es: /hemibloqueo|crecimiento auricular|intrinsecoide|enfermedad del seno|sobrecarga sist[oó]lica|\bnodal\b|\batrios?\b|computadora|\bderivadas?\b|\bcosto\b|isodin[aá]mic|remedicaci[oó]n/i,
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
  it('no lesson invents a clinical vignette for a real case beyond age and sex (no "fever", "palpitations", "sports club")', () => {
    for (const lesson of lessons) {
      for (const { path, t } of texts(lesson)) {
        if (!/\b(1101|13441|6764|4440|19170|6282|2627|12899|18776|4408|7688|19269|16151|19505|2084|10730|4078|17892|18373)\b|real case|real ECG|tracing \d|Tracing \d/i.test(t.en)) continue;
        expect(/\bfever\b.*\b(4408|77-year-old)|palpitations|sports club|pre-season/i.test(t.en), `${lesson.id} ${path}: invented vignette in "${t.en}"`).toBe(false);
      }
    }
  });
});

// ── what the text says is on the tracing (synthetic) ─────────────────────────────────────────────────────────────

const lessonById = (id: string): Lesson => {
  const x = lessons.find((y) => y.id === id);
  if (!x) throw new Error(`no lesson ${id}`);
  return x;
};
type BlockOf<K extends Block['kind']> = Extract<Block, { kind: K }>;
function blocksOf<K extends Block['kind']>(id: string, kind: K): BlockOf<K>[] {
  return lessonById(id).blocks.filter((b): b is BlockOf<K> => b.kind === kind);
}
const inlineItem = (id: string, itemId: string): Item => {
  for (const b of blocksOf(id, 'check')) if ('inline' in b.item && b.item.inline.id === itemId) return b.item.inline;
  throw new Error(`${id}: no inline item ${itemId}`);
};

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
const tw = (ecg: Ecg, lead: StdLead, b = midBeat(ecg)) => span(ecg, lead, b.j + 40, b.tOff, b);
const tUpright = (ecg: Ecg, lead: StdLead) => tw(ecg, lead).max > 0.1 && tw(ecg, lead).max > -tw(ecg, lead).min;
/** deviation from the PR baseline at J + plusMs (mV) */
function stAt(ecg: Ecg, lead: StdLead, plusMs = 0, b = midBeat(ecg)): number {
  const a = ecg.signal.leads[lead];
  const fs = ecg.signal.fs;
  const x = ((b.j + plusMs) * fs) / 1000;
  const i = Math.floor(x);
  return a[i] * (1 - (x - i)) + a[i + 1] * (x - i) - baselineBefore(a, fs, b.qrsOn);
}
const rrs = (ecg: Ecg): number[] => ecg.truth!.beats.slice(1).map((b, i) => b.qrsOn - ecg.truth!.beats[i].qrsOn);
const transition = (ecg: Ecg): StdLead | undefined => CHEST.find((l) => qrs(ecg, l).max >= -qrs(ecg, l).min);
const shape = (e: Ecg, l: StdLead): string => {
  const bt = midBeat(e);
  return qrsWaves(e.signal.leads[l], e.signal.fs, bt.qrsOn, bt.qrsOff).map((w) => w.role).join('');
};

/** The anterior STEMI of x1 (hook and worked) as the text reads it, step by step. */
function expectX1Stemi(e: Ecg): void {
  const t = e.truth!;
  expect(Math.abs(t.hrBpm - 84)).toBeLessThan(2);
  expect(t.atrialRateBpm).toBeCloseTo(t.hrBpm, 0);
  expect(t.rhythm).toBe('sinus-rhythm');
  for (const rr of rrs(e)) expect(Math.abs(rr - 712)).toBeLessThan(30);
  expect(Math.abs(t.prMs! - 160)).toBeLessThan(5);
  expect(Math.abs(t.qrsMs - 95)).toBeLessThan(6);
  expect(Math.abs(t.qtMs - 365)).toBeLessThan(10);
  expect(Math.abs(t.qtcFridericiaMs - 410)).toBeLessThan(8);
  expect(Math.abs(t.axisDeg.qrs - 40)).toBeLessThan(8);
  expect(t.findings).toContain('stemi-anterior');
  // recording: P and QRS upright in I, negative in aVR
  expect(qrs(e, 'I').net).toBeGreaterThan(0.3);
  expect(qrs(e, 'aVR').net).toBeLessThan(-0.3);
  // axis step: I and aVF positive, II the most positive limb lead
  expect(qrs(e, 'aVF').net).toBeGreaterThan(0.2);
  expect(qrs(e, 'II').net).toBeGreaterThanOrEqual(Math.max(qrs(e, 'I').net, qrs(e, 'aVF').net));
  // morphology: rS in V1–V2, transition at V3, no Q in V1–V3, T upright in V2–V4
  for (const l of ['V1', 'V2'] as const) {
    expect(shape(e, l).startsWith('rs'), l).toBe(true);
    expect(-qrs(e, l).min, l).toBeGreaterThan(qrs(e, l).max);
  }
  expect(transition(e)).toBe('V3');
  for (const l of ['V1', 'V2', 'V3'] as const) expect(shape(e, l).startsWith('q'), l).toBe(false);
  for (const l of ['V2', 'V3', 'V4'] as const) expect(tUpright(e, l), l).toBe(true);
  // ST at J + 60: V2 ≈ 3, V3 ≈ 4 (the highest), V4 ≈ 2, V1 ≈ 1 mm; III ≈ −1 mm, II/aVF depressed; I, aVL, V5 < 1 mm; V6 ≈ 0
  expect(Math.abs(stAt(e, 'V2', 60) - 0.3)).toBeLessThan(0.06);
  expect(Math.abs(stAt(e, 'V3', 60) - 0.4)).toBeLessThan(0.06);
  expect(Math.abs(stAt(e, 'V4', 60) - 0.2)).toBeLessThan(0.06);
  expect(Math.abs(stAt(e, 'V1', 60) - 0.1)).toBeLessThan(0.05);
  for (const l of CHEST) expect(stAt(e, l, 60), l).toBeLessThanOrEqual(stAt(e, 'V3', 60));
  expect(Math.abs(stAt(e, 'III', 60) + 0.1)).toBeLessThan(0.05);
  for (const l of ['II', 'aVF'] as const) expect(stAt(e, l, 60), l).toBeLessThan(-0.05);
  for (const l of ['I', 'aVL', 'V5'] as const) expect(Math.abs(stAt(e, l, 60)), l).toBeLessThan(0.1);
  expect(Math.abs(stAt(e, 'V6', 60))).toBeLessThan(0.05);
  // UDMI: V2–V3 at the J point reach ≥ 2.5 mm (above the threshold for any sex and age)
  for (const l of ['V2', 'V3'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.245);
}

describe('x1: the structured report on the tracings', () => {
  it('hook and worked example: the same anterior STEMI reading (84/min, normal intervals and axis, ST ↑ V1–V4, reciprocal ↓ II/III/aVF)', () => {
    expectX1Stemi(ecgOf(blocksOf('x1', 'hook')[0].ecg));
    expectX1Stemi(ecgOf(blocksOf('x1', 'worked')[0].ecg));
  });
  it('weak vs strong report: the same tracing on both sides, and it is the worked one', () => {
    const c = blocksOf('x1', 'contrast')[0];
    expect(c.left.ecg).toEqual(c.right.ecg);
    expect(c.left.ecg).toEqual(blocksOf('x1', 'worked')[0].ecg);
  });
  it('normal vs first-degree AV block: 72/min PR 160 QRS ≈ 95 QTc ≈ 410 axis ≈ +40 vs PR 280', () => {
    const c = blocksOf('x1', 'contrast')[1];
    const a = ecgOf(c.left.ecg).truth!;
    expect(Math.abs(a.hrBpm - 72)).toBeLessThan(2);
    expect(Math.abs(a.prMs! - 160)).toBeLessThan(5);
    expect(Math.abs(a.qrsMs - 95)).toBeLessThan(6);
    expect(Math.abs(a.qtcFridericiaMs - 410)).toBeLessThan(8);
    expect(Math.abs(a.axisDeg.qrs - 40)).toBeLessThan(8);
    expect(a.findings).toContain('normal-ecg');
    const b = ecgOf(c.right.ecg).truth!;
    expect(Math.abs(b.prMs! - 280)).toBeLessThan(5);
    expect(b.findings).toContain('av-block-1');
  });
  it('the inline report on PTB-XL 4440 is keyed to the 12SL values and the labels', () => {
    const it4440 = inlineItem('x1', 'x1:report-4440');
    if (it4440.kind !== 'report' || it4440.ecg.kind !== 'real') throw new Error('expected a real report item');
    const c = getCase(it4440.ecg.id)!;
    const k = it4440.key;
    expect(k.rateBpm).toBe(c.ref.hrBpm);
    expect(k.prMs).toBe(c.ref.prMs);
    expect(k.qrsMs).toBe(c.ref.qrsMs);
    expect(k.qtcMs).toBe(c.ref.qtcFridericiaMs);
    expect(k.axisDeg).toBe(c.ref.qrsAxisDeg);
    expect(c.findings).toContain(k.rhythm!);
    expect(k.regular).toBeNull();
    for (const f of k.findings) expect(c.findings).toContain(f);
    expect(c.findings.filter((f) => f !== k.rhythm && FINDINGS[f].severity !== 'normal')).toEqual([...k.findings]);
    expect(c.ref.prMs!).toBeGreaterThan(200);
  });
});

describe('x3: triage tracings', () => {
  it('hook and contrast: infra-His complete AV block, escape ≈ 34/min with QRS ≈ 150 ms, P waves ≈ 78/min', () => {
    for (const src of [blocksOf('x3', 'hook')[0].ecg, blocksOf('x3', 'contrast')[0].right.ecg]) {
      const t = ecgOf(src).truth!;
      expect(t.findings).toContain('av-block-3');
      expect(Math.abs(t.hrBpm - 34)).toBeLessThan(2);
      expect(Math.abs(t.atrialRateBpm! - 78)).toBeLessThan(3);
      expect(t.qrsMs).toBeGreaterThanOrEqual(140);
      expect(t.qrsMs).toBeLessThan(160);
    }
  });
  it('worked: 92/min, narrow QRS, ST ↑ ≈ 2.5–4.5 mm V2–V4 (highest V3), reciprocal ↓ II/III/aVF, no tall tented T', () => {
    const e = ecgOf(blocksOf('x3', 'worked')[0].ecg);
    const t = e.truth!;
    expect(Math.abs(t.hrBpm - 92)).toBeLessThan(2);
    expect(t.qrsMs).toBeLessThan(110);
    for (const l of ['V2', 'V3', 'V4'] as const) {
      expect(stAt(e, l, 60), l).toBeGreaterThan(0.22);
      expect(stAt(e, l, 60), l).toBeLessThan(0.48);
    }
    expect(stAt(e, 'V3', 60)).toBeGreaterThan(Math.max(stAt(e, 'V2', 60), stAt(e, 'V4', 60)));
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(e, l, 60), l).toBeLessThan(-0.05);
    expect(t.findings).not.toContain('hyperkalemia');
  });
  it('hyperkalaemia: no visible P in II, QRS ≈ 170 ms, T in V3–V5 well above the T in II', () => {
    const e = ecgOf(blocksOf('x3', 'ecg')[0].ecg);
    const t = e.truth!;
    expect(t.findings).toContain('hyperkalemia');
    expect(Math.abs(t.qrsMs - 170)).toBeLessThan(10);
    const b = midBeat(e);
    expect(span(e, 'II', b.qrsOn - 200, b.qrsOn - 20, b).max).toBeLessThan(0.05);
    for (const l of ['V3', 'V4'] as const) expect(tw(e, l).max, l).toBeGreaterThan(2 * tw(e, 'II').max);
    expect(tw(e, 'V5').max).toBeGreaterThan(1.5 * tw(e, 'II').max);
  });
  it('digoxin effect: PR ≈ 190 ms (upper normal), QTc not long, ST sagging below the baseline in V4–V6', () => {
    const e = ecgOf(blocksOf('x3', 'ecg')[1].ecg);
    const t = e.truth!;
    expect(t.findings).toContain('digoxin-effect');
    expect(Math.abs(t.prMs! - 190)).toBeLessThan(10);
    expect(t.prMs!).toBeLessThanOrEqual(200);
    expect(t.qtcFridericiaMs).toBeLessThan(420);
    for (const l of ['V4', 'V5', 'V6'] as const) expect(stAt(e, l, 60), l).toBeLessThan(-0.02);
  });
});

describe('x4: calibration tracings', () => {
  it('autopsy LAFB: axis ≈ −60°, qR in aVL, rS in II/III/aVF, QRS < 120 ms', () => {
    const e = ecgOf(blocksOf('x4', 'worked')[0].ecg);
    const t = e.truth!;
    expect(Math.abs(t.axisDeg.qrs + 60)).toBeLessThan(5);
    expect(t.qrsMs).toBeLessThan(120);
    expect(t.findings).toContain('lafb');
    expect(shape(e, 'aVL')).toBe('qr');
    for (const l of ['II', 'III', 'aVF'] as const) expect(shape(e, l), l).toBe('rs');
  });
  it('contrast: normal vs LAFB at ≈ −75°', () => {
    const c = blocksOf('x4', 'contrast')[0];
    expect(ecgOf(c.left.ecg).truth!.findings).toContain('normal-ecg');
    const r = ecgOf(c.right.ecg).truth!;
    expect(r.findings).toContain('lafb');
    expect(Math.abs(r.axisDeg.qrs + 75)).toBeLessThan(5);
  });
  it('sinus tachycardia ≈ 125/min, regular', () => {
    const t = ecgOf(blocksOf('x4', 'ecg')[0].ecg).truth!;
    expect(t.rhythm).toBe('sinus-tachycardia');
    expect(Math.abs(t.hrBpm - 125)).toBeLessThan(3);
    expect(t.regular).toBe(true);
  });
});

// ── what the text says about each real case (labels and 12SL reference) ──────────────────────────────────────────

interface RealClaim {
  readonly id: number;
  readonly sex: 'M' | 'F';
  readonly age: number;
  /** labels the text names */
  readonly has?: readonly FindingId[];
  /** labels the text says are absent */
  readonly not?: readonly FindingId[];
  readonly hr?: readonly [number, number];
  readonly pr?: readonly [number, number];
  readonly qrs?: readonly [number, number];
  readonly axis?: readonly [number, number];
}

const CLAIMS: readonly RealClaim[] = [
  // x1
  { id: 4440, sex: 'F', age: 63, has: ['sinus-rhythm', 'av-block-1'], hr: [80, 90], pr: [240, 265], qrs: [85, 100] },
  { id: 1101, sex: 'F', age: 53, has: ['normal-ecg'] },
  { id: 13441, sex: 'F', age: 81, has: ['rbbb'] },
  { id: 6764, sex: 'M', age: 64, has: ['pathological-q', 'old-mi-anterior', 'old-mi-lateral'] },
  // x2
  { id: 19170, sex: 'M', age: 73, has: ['atrial-fibrillation', 'atrial-flutter'], hr: [105, 118], qrs: [110, 120], axis: [-20, -8] },
  { id: 6282, sex: 'M', age: 42, has: ['sinus-rhythm', 'rbbb'], hr: [72, 80], pr: [125, 140], qrs: [145, 160] },
  { id: 6271, sex: 'F', age: 60, has: ['normal-ecg'] },
  { id: 2320, sex: 'M', age: 64, has: ['normal-ecg'] },
  { id: 11459, sex: 'F', age: 18, has: ['normal-ecg'] },
  { id: 2627, sex: 'M', age: 45, has: ['sinus-arrhythmia', 'pathological-q', 'old-mi-inferior'], not: ['stemi-inferior'], hr: [75, 85], pr: [135, 150], qrs: [80, 95], axis: [-10, 5] },
  { id: 12899, sex: 'F', age: 67, has: ['stemi-inferior'] },
  { id: 18776, sex: 'M', age: 35, has: ['lvh'], hr: [50, 56], qrs: [95, 105] },
  { id: 2594, sex: 'F', age: 58, has: ['normal-ecg', 'sinus-bradycardia'] },
  { id: 14874, sex: 'M', age: 47, has: ['normal-ecg', 'sinus-arrhythmia'] },
  { id: 6727, sex: 'F', age: 28, has: ['av-block-1'] },
  { id: 2739, sex: 'M', age: 89, has: ['atrial-flutter'], hr: [140, 155] },
  { id: 2466, sex: 'F', age: 73, has: ['pac'] },
  { id: 17835, sex: 'M', age: 76, has: ['pac'] },
  // x3
  { id: 4408, sex: 'M', age: 77, has: ['sinus-tachycardia'], hr: [125, 135] },
  { id: 7688, sex: 'F', age: 86, has: ['av-block-3'], hr: [36, 44], qrs: [80, 115] },
  { id: 19269, sex: 'F', age: 87, has: ['stemi-inferior', 'stemi-posterior'] },
  { id: 16151, sex: 'F', age: 87, has: ['av-block-3'], hr: [20, 32], qrs: [120, 200] },
  { id: 19505, sex: 'F', age: 43, has: ['sinus-tachycardia', 'normal-ecg'], hr: [130, 145] },
  // x4
  { id: 2084, sex: 'F', age: 16, has: ['normal-ecg', 'sinus-arrhythmia'], hr: [72, 80] },
  { id: 10730, sex: 'F', age: 80, has: ['lafb'], qrs: [85, 100], axis: [-44, -31] },
  { id: 4078, sex: 'F', age: 69, has: ['sinus-tachycardia', 'pac'], hr: [102, 112] },
  { id: 17892, sex: 'F', age: 63, has: ['nonspecific-st-t'] },
  { id: 18373, sex: 'F', age: 79, has: ['lafb'], axis: [-90, -45] },
];

describe('stage X real cases: the text agrees with the labels and the 12SL reference', () => {
  it('every real case the lessons show has a claim, and every claim is a case they show', () => {
    const shown = new Set(lessons.flatMap(realIds));
    expect([...shown].sort((a, b) => a - b)).toEqual(CLAIMS.map((c) => c.id).sort((a, b) => a - b));
  });
  for (const c of CLAIMS) {
    it(`PTB-XL ${c.id}: ${c.sex}${c.age}${c.has ? `, ${c.has.join(' + ')}` : ''}`, () => {
      const k = getCase(c.id)!;
      expect(k.sex).toBe(c.sex);
      expect(k.age).toBe(c.age);
      for (const f of c.has ?? []) expect(k.findings, `${c.id} labelled ${f}`).toContain(f);
      for (const f of c.not ?? []) expect(k.findings, `${c.id} not labelled ${f}`).not.toContain(f);
      const within = (v: number | null, r: readonly [number, number] | undefined, what: string) => {
        if (!r) return;
        expect(v, `${c.id} ${what}`).not.toBeNull();
        expect(v!, `${c.id} ${what}`).toBeGreaterThanOrEqual(r[0]);
        expect(v!, `${c.id} ${what}`).toBeLessThanOrEqual(r[1]);
      };
      within(k.ref.hrBpm, c.hr, 'HR');
      within(k.ref.prMs, c.pr, 'PR');
      within(k.ref.qrsMs, c.qrs, 'QRS');
      within(k.ref.qrsAxisDeg, c.axis, 'axis');
    });
  }

  it('x2 stream is prevalence-weighted as its text says: 5 normal, 4 minor, 4 major, 1 act-now (14 tracings)', () => {
    const tally = { normal: 0, minor: 0, major: 0, critical: 0 };
    for (const id of realIds(lessonById('x2'))) {
      const f = getCase(id)!.findings;
      if (f.includes('normal-ecg')) tally.normal++;
      else if (f.some((x) => FINDINGS[x].severity === 'critical')) tally.critical++;
      else if (f.some((x) => FINDINGS[x].severity === 'major')) tally.major++;
      else tally.minor++;
    }
    expect(tally).toEqual({ normal: 5, minor: 4, major: 4, critical: 1 });
  });

  it('inline triage items: "act now" exactly when the case carries a critical label (the triage drill\'s rule)', () => {
    for (const [lid, itemId] of [['x2', 'x2:bin-12899'], ['x3', 'x3:bin-7688']] as const) {
      const it = inlineItem(lid, itemId);
      if (it.kind !== 'choice' || it.ecg.kind !== 'real') throw new Error(`${itemId}: expected a real choice item`);
      const critical = getCase(it.ecg.id)!.findings.some((f) => FINDINGS[f].severity === 'critical');
      expect(it.key.correct === 'critical', itemId).toBe(critical);
      expect(it.key.options.map((o) => o.id)).toEqual(['critical', 'major', 'routine']);
    }
  });

  it('x4 borderline axis: 10730 is labelled LAFB but its 12SL axis misses the current −45° threshold; the "sure" answer is the description', () => {
    const it = inlineItem('x4', 'x4:sure-statement-10730');
    if (it.kind !== 'choice' || it.ecg.kind !== 'real') throw new Error('expected a real choice item');
    const k = getCase(it.ecg.id)!;
    expect(k.findings).toContain('lafb');
    expect(k.ref.qrsAxisDeg!).toBeGreaterThan(-45);
    expect(k.ref.qrsAxisDeg!).toBeLessThan(-30);
    expect(it.key.correct).toBe('lad');
  });
});
