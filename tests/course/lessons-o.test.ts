/**
 * Stage O lessons (o1–o12, docs/PLAN.md §3): every lesson validates against the live catalogues with no errors and no
 * warnings, follows the lesson anatomy (attempt-first hook, worked example before practice, checks and a drill,
 * pitfalls, summary), every live-block dial is realised, every family check generates an item on the lesson's topic,
 * every synthetic ECG can be generated, the text is complete in zh / en / es, and what the captions say is on the
 * tracing is on the tracing (measured on the generated signal, so an engine change that breaks a caption fails here).
 *
 * The lessons are imported directly (not through the glob registry) so that a broken lesson file elsewhere in the
 * course cannot hide the stage-O results.
 */
import { describe, expect, it } from 'vitest';
import type { AutoMark, Block, Lesson, LessonMark } from '../../src/course/api';
import { liveValidateDeps } from '../../src/course/deps';
import { realisedDials, startDials } from '../../src/course/live';
import { baselineBefore, isAutoMark, qrsWaves, resolveMarks } from '../../src/course/marks';
import { formatIssues, validateLesson } from '../../src/course/validate';
import type { BeatMarks, Ecg } from '../../src/core/ecg';
import type { FindingId } from '../../src/core/findings';
import type { L10n } from '../../src/core/l10n';
import type { StdLead } from '../../src/core/leads';
import type { EcgSource, Item, ItemView } from '../../src/practice/api';
import { getCase } from '../../src/real';
import { generateItem } from '../../src/practice';
import { generate, scenarios, type SynthRequest } from '../../src/synth';
import o1 from '../../src/course/lessons/o1';
import o2 from '../../src/course/lessons/o2';
import o3 from '../../src/course/lessons/o3';
import o4 from '../../src/course/lessons/o4';
import o5 from '../../src/course/lessons/o5';
import o6 from '../../src/course/lessons/o6';
import o7 from '../../src/course/lessons/o7';
import o8 from '../../src/course/lessons/o8';
import o9 from '../../src/course/lessons/o9';
import o10 from '../../src/course/lessons/o10';
import o11 from '../../src/course/lessons/o11';
import o12 from '../../src/course/lessons/o12';

const lessons: readonly Lesson[] = [o1, o2, o3, o4, o5, o6, o7, o8, o9, o10, o11, o12];
const IDS = ['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8', 'o9', 'o10', 'o11', 'o12'] as const;

/** Lessons with a real PTB-XL block; the others have no fitting record in the curated library (o5, o10). */
const WITH_REAL = ['o1', 'o2', 'o3', 'o4', 'o6', 'o7', 'o8', 'o9', 'o11', 'o12'];

/** Each family check must train the lesson's own topic: the findings its generated item may carry. */
const ON_TOPIC: Readonly<Record<string, readonly FindingId[]>> = {
  o1: ['hyperkalemia', 'hypokalemia'],
  o2: ['hypercalcemia', 'hypocalcemia'],
  o3: ['digoxin-effect'],
  o4: ['na-channel-blockade', 'long-qt'],
  o5: ['hypothermia', 'osborn-waves', 'sinus-bradycardia', 'hypercalcemia'],
  o6: ['pulmonary-embolism'],
  o7: ['pericarditis', 'pericardial-effusion', 'electrical-alternans'],
  o8: ['cerebral-t', 'wellens'],
  o9: ['electrode-reversal-la-ll', 'electrode-reversal-ra-ll', 'electrode-reversal-la-ra', 'precordial-misplacement', 'dextrocardia'],
  o10: ['muscle-tremor', 'baseline-wander', 'ac-interference'],
  o11: ['paced-rhythm', 'pacing-undersensing', 'pacing-failure-capture', 'pacing-oversensing'],
};

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

/** Dials a synthetic request asks for that the engine did not realise (a caption would quote a value that is not drawn). */
function unrealisedRequestDials(lesson: Lesson): string[] {
  const out: string[] = [];
  for (const { path, src } of sourcesOf(lesson)) {
    if (src.kind !== 'synth' || !src.req.dials) continue;
    const applied = generate(src.req).applied;
    for (const id of Object.keys(src.req.dials)) if (!(id in applied)) out.push(`${path}: dial "${id}" not realised for ${src.req.scenario}`);
  }
  return out;
}

describe('stage O lessons', () => {
  it('all twelve lesson files export their lesson', () => {
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
        expect(lesson.stage).toBe('O');
        expect(kinds[0]).toBe('hook');
        expect(kinds[kinds.length - 1]).toBe('summary');
        const firstWorked = kinds.indexOf('worked');
        const firstPractice = kinds.findIndex((k) => k === 'check' || k === 'drill');
        expect(firstWorked).toBeGreaterThanOrEqual(0);
        expect(firstPractice).toBeGreaterThan(firstWorked);
        for (const k of ['criteria', 'contrast', 'drill', 'pitfalls'] as const) expect(kinds, `${lesson.id} has a ${k} block`).toContain(k);
        if (WITH_REAL.includes(lesson.id)) expect(kinds, `${lesson.id} has a real block`).toContain('real');
        expect(kinds.filter((k) => k === 'check').length, `${lesson.id}: at least two checks`).toBeGreaterThanOrEqual(2);
        const summary = lesson.blocks[lesson.blocks.length - 1];
        if (summary.kind === 'summary') {
          expect(summary.points.length).toBeGreaterThanOrEqual(3);
          expect(summary.points.length).toBeLessThanOrEqual(5);
        }
        expect(lesson.sources.length).toBeGreaterThanOrEqual(2);
        expect(lesson.sources.some((s) => s.startsWith('Castellano et al. 2004'))).toBe(true);
      });

      it('every live-block dial and every requested dial is realised by the engine', () => {
        expect(unrealisedLiveDials(lesson)).toEqual([]);
        expect(unrealisedRequestDials(lesson)).toEqual([]);
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

      it('every family check generates an item on the lesson’s topic', async () => {
        const failures: string[] = [];
        for (const [i, b] of lesson.blocks.entries()) {
          if (b.kind !== 'check' || 'inline' in b.item) continue;
          try {
            const item = await generateItem(b.item.family, b.item.seed, b.item.difficulty);
            if (item.family !== b.item.family) failures.push(`blocks[${i}]: got family ${item.family}`);
            const topic = ON_TOPIC[lesson.id];
            if (topic && item.findings.length > 0 && !item.findings.some((f) => topic.includes(f))) failures.push(`blocks[${i}] (${b.item.family}#${b.item.seed}): off-topic item [${item.findings.join(', ')}]`);
          } catch (e) {
            failures.push(`blocks[${i}] (${b.item.family}#${b.item.seed}): ${String(e)}`);
          }
        }
        expect(failures).toEqual([]);
      });
    });
  }
});

// ── every AutoMark resolves on its tracing; every real case exists and matches its caption ─────────────────────────

/** Every (source, view, marks) triple a lesson draws marks on. */
function markedSources(lesson: Lesson): { readonly path: string; readonly src: EcgSource; readonly view?: ItemView; readonly marks: readonly LessonMark[] }[] {
  const out: { path: string; src: EcgSource; view?: ItemView; marks: readonly LessonMark[] }[] = [];
  lesson.blocks.forEach((b, i) => {
    const p = `blocks[${i}]`;
    if (b.kind === 'ecg' && b.marks) out.push({ path: p, src: b.ecg, view: b.view, marks: b.marks });
    if (b.kind === 'contrast') {
      if (b.left.marks) out.push({ path: `${p}.left`, src: b.left.ecg, view: b.view, marks: b.left.marks });
      if (b.right.marks) out.push({ path: `${p}.right`, src: b.right.ecg, view: b.view, marks: b.right.marks });
    }
    if (b.kind === 'worked') b.steps.forEach((st, k) => st.marks && out.push({ path: `${p}.steps[${k}]`, src: b.ecg, view: st.view ?? b.view, marks: st.marks }));
    if (b.kind === 'film') b.frames.forEach((f, k) => f.marks && out.push({ path: `${p}.frames[${k}]`, src: f.ecg, view: b.view, marks: f.marks }));
  });
  return out;
}

describe('stage O marks and real cases', () => {
  for (const lesson of lessons) {
    it(`${lesson.id}: every AutoMark resolves to at least one drawn mark`, () => {
      const failures: string[] = [];
      for (const { path, src, view, marks } of markedSources(lesson)) {
        if (src.kind !== 'synth') {
          if (marks.some(isAutoMark)) failures.push(`${path}: AutoMark on a real ECG`);
          continue;
        }
        const ecg = generate(src.req).ecg;
        for (const m of marks) {
          if (!isAutoMark(m)) continue;
          const r = resolveMarks(ecg, [m], { layout: view?.layout ?? '3x4+1', lead: view?.lead });
          if (r.length === 0) failures.push(`${path}: ${m.auto} on ${m.lead ?? 'default'} resolved to nothing (${src.req.scenario})`);
        }
      }
      expect(failures).toEqual([]);
    });
  }

  it('every real case exists in the curated library', () => {
    for (const L of lessons) for (const b of L.blocks) if (b.kind === 'real') for (const id of b.ids) expect(getCase(id), `${L.id}: case ${id}`).toBeDefined();
    for (const L of lessons) for (const { src } of sourcesOf(L)) if (src.kind === 'real') expect(getCase(src.id), `${L.id}: case ${src.id}`).toBeDefined();
  });

  it('the real cases match the numbers their captions quote', () => {
    const ref = (id: number) => getCase(id)!.ref!;
    // o3 worked: slow AF on digoxin, about 45/min
    expect(getCase(1065)!.codes).toHaveProperty('DIG');
    expect(getCase(1065)!.codes).toHaveProperty('AFIB');
    expect(Math.abs(ref(1065).hrBpm! - 45)).toBeLessThan(5);
    // o6: sinus tachycardia about 130/min; RVH
    expect(Math.abs(ref(4408).hrBpm! - 130)).toBeLessThan(6);
    expect(getCase(2417)!.codes).toHaveProperty('RVH');
    // o7: low voltage, one in sinus rhythm, one in AF at about 100/min
    expect(getCase(10303)!.codes).toHaveProperty('LVOLT');
    expect(getCase(12632)!.codes).toHaveProperty('LVOLT');
    expect(getCase(12632)!.codes).toHaveProperty('AFIB');
    expect(Math.abs(ref(12632).hrBpm! - 100)).toBeLessThan(8);
    // o9: a negative QRS in lead I that is the heart's own rightward axis, with a sinus-directed P
    expect(ref(17860).qrsAxisDeg!).toBeGreaterThan(90);
    expect(ref(17860).pAxisDeg!).toBeGreaterThan(-30);
    expect(ref(17860).pAxisDeg!).toBeLessThan(90);
    // o4: labelled long QT
    for (const id of [6479, 9894]) expect(getCase(id)!.codes, String(id)).toHaveProperty('LNGQT');
  });
});

// ── the text: complete, current terms, Spain-Spanish numbers ─────────────────────────────────────────────────────────

function texts(v: unknown, path = ''): { readonly path: string; readonly t: L10n }[] {
  if (Array.isArray(v)) return v.flatMap((x, i) => texts(x, `${path}[${i}]`));
  if (typeof v !== 'object' || v === null) return [];
  const o = v as Record<string, unknown>;
  if (typeof o.zh === 'string' && typeof o.en === 'string' && typeof o.es === 'string') return [{ path, t: o as unknown as L10n }];
  return Object.entries(o).flatMap(([k, x]) => texts(x, path ? `${path}.${k}` : k));
}

describe('stage O text', () => {
  const OUTDATED: Readonly<Record<'zh' | 'en' | 'es', RegExp>> = {
    zh: /半支阻滞|心房肥大|类本位曲折|病窦综合征|结性心律|劳损/,
    en: /intrinsicoid|hemiblock|sick sinus|nodal rhythm|\bPSVT\b|strain pattern|atrial enlargement|Lown/i,
    es: /hemibloqueo|crecimiento auricular|intrinsecoide|enfermedad del seno|sobrecarga sist[oó]lica|\bnodal\b|\batrios?\b|computadora|\bderivadas?\b/i,
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

  it('the expanded lessons carry full-length teaching (≥ 1100 English words each)', () => {
    const words = (L: Lesson) => texts(L).map(({ t }) => t.en).join(' ').split(/\s+/).filter(Boolean).length;
    for (const L of [o3, o4, o5, o7, o8, o10]) expect(words(L), L.id).toBeGreaterThanOrEqual(1100);
  });
});

// ── what the text says is on the tracing ──────────────────────────────────────────────────────────────────────────

type BlockOf<K extends Block['kind']> = Extract<Block, { kind: K }>;
const byId = (id: string): Lesson => {
  const x = lessons.find((y) => y.id === id);
  if (!x) throw new Error(`no lesson ${id}`);
  return x;
};
function blocksOf<K extends Block['kind']>(id: string, kind: K): BlockOf<K>[] {
  return byId(id).blocks.filter((b): b is BlockOf<K> => b.kind === kind);
}
const inlineItem = (id: string, itemId: string): Item => {
  for (const b of blocksOf(id, 'check')) if ('inline' in b.item && b.item.inline.id === itemId) return b.item.inline;
  throw new Error(`${id}: no inline item ${itemId}`);
};
const contrastTitled = (id: string, en: string): BlockOf<'contrast'> => {
  const c = blocksOf(id, 'contrast').find((b) => b.title.en === en);
  if (!c) throw new Error(`${id}: no contrast "${en}"`);
  return c;
};
/** the synthetic sources of one lesson that use a scenario */
const sourcesWith = (id: string, scenario: string): EcgSource[] =>
  sourcesOf(byId(id))
    .map((s) => s.src)
    .filter((s) => s.kind === 'synth' && s.req.scenario === scenario);

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
/** what a playing live block shows with its played dial at `v` (its other dials at their start values) */
function played(id: string, i: number, v: number): Ecg {
  const b = blocksOf(id, 'live')[i];
  if (!b.play) throw new Error(`${id}: live block ${i} does not play`);
  const sc = scenarios().find((s) => s.id === b.scenario);
  if (!sc) throw new Error(`unknown scenario ${b.scenario}`);
  const dials = { ...startDials(sc, b.variant, b.dials.map((d) => d.id), b.play), [b.play.dial]: v };
  return ecgOf({ scenario: b.scenario, ...(b.variant ? { variant: b.variant } : {}), seed: b.seed, dials });
}
const frames = (id: string, i: number): Ecg[] => blocksOf(id, 'film')[i].frames.map((f) => ecgOf(f.ecg));

const LIMB: readonly StdLead[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];
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
const tInverted = (ecg: Ecg, lead: StdLead) => tw(ecg, lead).min < -0.1 && -tw(ecg, lead).min > tw(ecg, lead).max;
const tUpright = (ecg: Ecg, lead: StdLead) => tw(ecg, lead).max > 0.1 && tw(ecg, lead).max > -tw(ecg, lead).min;
function sample(ecg: Ecg, lead: StdLead, tMs: number): number {
  const a = ecg.signal.leads[lead];
  const x = (tMs * ecg.signal.fs) / 1000;
  const i = Math.floor(x);
  return a[i] * (1 - (x - i)) + a[i + 1] * (x - i);
}
/** deviation from the PR baseline at J + plusMs (mV) */
function stAt(ecg: Ecg, lead: StdLead, plusMs = 0, b = midBeat(ecg)): number {
  return sample(ecg, lead, b.j + plusMs) - baselineBefore(ecg.signal.leads[lead], ecg.signal.fs, b.qrsOn);
}
/** ST deviation at J+60 measured from the TP segment (the reference when the PR segment itself is shifted) */
const stTp = (ecg: Ecg, lead: StdLead, b = midBeat(ecg)) => sample(ecg, lead, b.j + 60) - sample(ecg, lead, (b.pOn ?? b.qrsOn - 150) - 40);
/** PR-segment shift from the TP segment (mid-PR segment minus TP) */
const prShift = (ecg: Ecg, lead: StdLead, b = midBeat(ecg)) => sample(ecg, lead, (b.pOff! + b.qrsOn) / 2) - sample(ecg, lead, b.pOn! - 40);
const rrs = (ecg: Ecg): number[] => ecg.truth!.beats.slice(1).map((b, i) => b.qrsOn - ecg.truth!.beats[i].qrsOn);
/** the beats that the auto marks of one kind name (a mark without `beat` gives -1, which no assertion accepts) */
const markBeats = (marks: readonly LessonMark[] | undefined, auto: AutoMark['auto']): number[] =>
  (marks ?? []).filter((m): m is AutoMark => isAutoMark(m) && m.auto === auto).map((m) => m.beat ?? -1);
const roles = (ecg: Ecg, lead: StdLead): string => {
  const b = midBeat(ecg);
  return qrsWaves(ecg.signal.leads[lead], ecg.signal.fs, b.qrsOn, b.qrsOff).map((w) => w.role).join('');
};
/** high-frequency activity outside the QRS (mean |second difference|, mV per sample): EMG and tremor live here */
function hfNoise(ecg: Ecg, lead: StdLead): number {
  const a = ecg.signal.leads[lead];
  const fs = ecg.signal.fs;
  const inQrs = (i: number) => ecg.truth!.beats.some((b) => (i * 1000) / fs > b.qrsOn - 30 && (i * 1000) / fs < b.qrsOff + 30);
  let s = 0;
  let n = 0;
  for (let i = 1; i < a.length - 1; i++) {
    if (inQrs(i)) continue;
    s += Math.abs(a[i + 1] - 2 * a[i] + a[i - 1]);
    n++;
  }
  return s / n;
}
/** largest excursion outside the QRS within a time window (motion artefact) */
function excursion(ecg: Ecg, lead: StdLead, t0: number, t1: number): number {
  const a = ecg.signal.leads[lead];
  const fs = ecg.signal.fs;
  const inQrs = (t: number) => ecg.truth!.beats.some((b) => t > b.qrsOn - 30 && t < b.qrsOff + 30);
  const vals: number[] = [];
  for (let t = t0; t < t1; t += 1000 / fs) if (!inQrs(t)) vals.push(a[Math.round((t * fs) / 1000)]);
  const sorted = [...vals].sort((x, y) => x - y);
  const med = sorted[Math.floor(sorted.length / 2)];
  return Math.max(...vals.map((v) => Math.abs(v - med)));
}

/** the U wave in a lead: its peak above the baseline between T end and U end */
const uw = (ecg: Ecg, lead: StdLead, b = midBeat(ecg)) => span(ecg, lead, b.tOff, b.uOff!, b);
/** from the end of the U to the next P (ms) */
const uToNextP = (ecg: Ecg, b = midBeat(ecg)) => ecg.truth!.atrial.find((a) => a.t > b.qrsOn + 50)!.t - b.uOff!;

describe('o1: potassium on the tracings', () => {
  it('stage 1–2 hyperkalaemia (hook, ladder film, contrast): PR already ≈ 205 ms, QRS 105–120 ms, T in V3 taller than its R', () => {
    for (const src of sourcesWith('o1', 'hyperkalemia')) {
      const e = ecgOf(src);
      expect(Math.abs(e.truth!.prMs! - 205)).toBeLessThan(12);
      expect(e.truth!.qrsMs).toBeGreaterThanOrEqual(105);
      expect(e.truth!.qrsMs).toBeLessThan(120);
      expect(tw(e, 'V3').max).toBeGreaterThan(qrs(e, 'V3').max);
    }
  });
  it('severe hyperkalaemia (worked): no measurable PR, QRS > 150 ms', () => {
    const e = ecgOf(blocksOf('o1', 'worked')[0].ecg);
    expect(e.truth!.prMs).toBeNull();
    expect(e.truth!.qrsMs).toBeGreaterThan(150);
  });
  it('ladder film: normal PR 160 and QRS ≈ 95 with the V3 T below its R; then PR ≈ 205, QRS ≈ 115; severe has the P in II almost gone, no PR, QRS ≈ 170', () => {
    const [normal, tented, severe] = frames('o1', 0);
    expect(Math.abs(normal.truth!.prMs! - 160)).toBeLessThan(3);
    expect(Math.abs(normal.truth!.qrsMs - 95)).toBeLessThan(4);
    expect(tw(normal, 'V3').max).toBeLessThan(0.6 * qrs(normal, 'V3').max);
    expect(Math.abs(tented.truth!.prMs! - 205)).toBeLessThan(5);
    expect(Math.abs(tented.truth!.qrsMs - 115)).toBeLessThan(4);
    expect(severe.truth!.prMs).toBeNull();
    expect(Math.abs(severe.truth!.qrsMs - 170)).toBeLessThan(5);
    const pII = (e: Ecg) => span(e, 'II', midBeat(e).pOn!, midBeat(e).pOff!, midBeat(e)).max;
    expect(pII(severe)).toBeLessThan(0.3 * pII(normal));
    expect(severe.truth!.beats.length).toBeGreaterThan(5);
  });
  it('hypokalaemia film (V2): the normal T stands alone; low K halves the T, the U overtakes it, and the QT to the end of the T stays ≈ 410 ms', () => {
    const [normal, low] = frames('o1', 1);
    expect(uw(normal, 'V2').max).toBeLessThan(0.2 * tw(normal, 'V2').max);
    const ratio = tw(low, 'V2').max / tw(normal, 'V2').max;
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(0.6);
    expect(uw(low, 'V2').max).toBeGreaterThan(tw(low, 'V2').max);
    for (const e of [normal, low]) expect(Math.abs(e.truth!.qtMs - 410)).toBeLessThan(5);
  });
  it('hypokalaemia sweep (V2): 52–58/min U above T, QT 410–430 vs QU 570–600 ms; 59–68/min the U, still above the T, closes on the next P', () => {
    for (const v of [52, 58]) {
      const e = played('o1', 0, v);
      const b = midBeat(e);
      expect(uw(e, 'V2').max, `${v}`).toBeGreaterThan(tw(e, 'V2').max);
      expect(e.truth!.qtMs, `${v}`).toBeGreaterThanOrEqual(410);
      expect(e.truth!.qtMs, `${v}`).toBeLessThanOrEqual(430);
      expect(b.uOff! - b.qrsOn, `${v}`).toBeGreaterThanOrEqual(570);
      expect(b.uOff! - b.qrsOn, `${v}`).toBeLessThanOrEqual(600);
    }
    for (const v of [59, 68]) {
      const e = played('o1', 0, v);
      expect(uw(e, 'V2').max, `${v}`).toBeGreaterThan(tw(e, 'V2').max);
    }
    const gaps = [52, 59, 68].map((v) => uToNextP(played('o1', 0, v)));
    expect(gaps[1]).toBeLessThan(gaps[0]);
    expect(gaps[2]).toBeLessThan(gaps[1]);
    expect(gaps[2]).toBeLessThan(0.5 * gaps[0]);
  });
});

/** when the T rises past 15 % of its peak after the J point (ms): where the ST ends */
function tStart(ecg: Ecg, lead: StdLead, b = midBeat(ecg)): number {
  const base = baselineBefore(ecg.signal.leads[lead], ecg.signal.fs, b.qrsOn);
  const t = tw(ecg, lead, b);
  const peak = t.max >= -t.min ? t.max : t.min;
  for (let x = b.j + 10; x < b.tOff; x += 2) if ((sample(ecg, lead, x) - base) / peak > 0.15) return x;
  return b.tOff;
}
const stLength = (ecg: Ecg, lead: StdLead) => tStart(ecg, lead) - midBeat(ecg).j;
const tWidth = (ecg: Ecg, lead: StdLead) => midBeat(ecg).tOff - tStart(ecg, lead);

describe('o2: calcium on the tracings', () => {
  it('calcium film (II, 75/min): QT ≈ 380 / 470 / 310 ms; low Ca stretches the ST with a T no wider; high Ca removes the ST with the T width unchanged', () => {
    const [normal, low, high] = frames('o2', 0);
    for (const e of [normal, low, high]) expect(Math.abs(e.truth!.hrBpm - 75)).toBeLessThan(1);
    expect(Math.abs(normal.truth!.qtMs - 380)).toBeLessThan(5);
    expect(Math.abs(low.truth!.qtMs - 470)).toBeLessThan(5);
    expect(Math.abs(high.truth!.qtMs - 310)).toBeLessThan(5);
    expect(stLength(low, 'II')).toBeGreaterThan(2 * stLength(normal, 'II'));
    expect(tWidth(low, 'II')).toBeLessThanOrEqual(tWidth(normal, 'II'));
    expect(stLength(high, 'II')).toBeLessThan(0.5 * stLength(normal, 'II'));
    expect(Math.abs(tWidth(high, 'II') - tWidth(normal, 'II'))).toBeLessThan(15);
  });
  it('which-part film (V5): low Ca long by its ST; drug long QT ≈ 480 ms by a low, wide T; high Ca without ST; digoxin shorter QT with a scooped ST below the line, a low T and PR ≈ 190 ms', () => {
    const normal = frames('o2', 0)[0];
    const [low, drug, high, dig] = frames('o2', 1);
    expect(low.truth!.qtMs).toBeGreaterThan(normal.truth!.qtMs + 60);
    expect(stLength(low, 'V5')).toBeGreaterThan(2 * stLength(normal, 'V5'));
    expect(tWidth(low, 'V5')).toBeLessThanOrEqual(tWidth(normal, 'V5'));
    expect(Math.abs(drug.truth!.qtMs - 480)).toBeLessThan(5);
    expect(tWidth(drug, 'V5')).toBeGreaterThan(1.1 * tWidth(normal, 'V5'));
    expect(tWidth(drug, 'V5')).toBeGreaterThan(tWidth(low, 'V5') + 50);
    expect(tw(drug, 'V5').max).toBeLessThan(0.5 * tw(normal, 'V5').max);
    expect(high.truth!.qtMs).toBeLessThan(normal.truth!.qtMs - 50);
    expect(stLength(high, 'V5')).toBeLessThan(40);
    expect(dig.truth!.qtMs).toBeLessThan(normal.truth!.qtMs);
    expect(stAt(dig, 'V5', 60)).toBeLessThan(-0.05);
    expect(stAt(dig, 'V5', 60)).toBeLessThan(stAt(dig, 'V5'));
    expect(tw(dig, 'V5').max).toBeLessThan(0.5 * tw(normal, 'V5').max);
    expect(Math.abs(dig.truth!.prMs! - 190)).toBeLessThan(5);
  });
});

describe('o3: digoxin on the tracings', () => {
  it('digoxin effect: shallow ST sag in V5–V6 (deeper at J+60 than at J, under 1.2 mm), QTcF < 410 ms, PR ≈ 190 ms', () => {
    for (const src of sourcesWith('o3', 'digoxin-effect')) {
      const e = ecgOf(src);
      for (const l of ['V5', 'V6'] as const) {
        expect(stAt(e, l, 60), l).toBeLessThan(-0.03);
        expect(stAt(e, l, 60), l).toBeGreaterThan(-0.12);
        expect(stAt(e, l, 60), l).toBeLessThan(stAt(e, l));
      }
      expect(e.truth!.qtcFridericiaMs).toBeLessThan(410);
      expect(Math.abs(e.truth!.prMs! - 190)).toBeLessThan(10);
    }
  });
  it('contrast: the ischaemic side is horizontal and ≈ 1 mm deep in V5 with an upright T', () => {
    const e = ecgOf(contrastTitled('o3', 'Scoop or ischaemic depression?').right.ecg);
    expect(stAt(e, 'V5')).toBeLessThan(-0.08);
    expect(Math.abs(stAt(e, 'V5', 60) - stAt(e, 'V5'))).toBeLessThan(0.02);
    expect(tUpright(e, 'V5')).toBe(true);
  });
  it('AT with block: atria ≈ 180/min, ventricles ≈ 90/min (2:1); accelerated junctional ≈ 80/min; complete block ≈ 45/min, regular', () => {
    const at = ecgOf(inlineItem('o3', 'o3:at-with-block').ecg);
    expect(Math.abs(at.truth!.atrialRateBpm! - 180)).toBeLessThan(8);
    expect(Math.abs(at.truth!.hrBpm - 90)).toBeLessThan(5);
    const ajr = ecgOf(sourcesWith('o3', 'accelerated-junctional-rhythm')[0]);
    expect(ajr.truth!.rhythm).toBe('accelerated-junctional-rhythm');
    expect(Math.abs(ajr.truth!.hrBpm - 82)).toBeLessThan(6);
    const chb = ecgOf(sourcesWith('o3', 'av-block-3')[0]);
    expect(chb.truth!.findings).toContain('av-block-3');
    expect(Math.abs(chb.truth!.hrBpm - 45)).toBeLessThan(3);
    expect(Math.max(...rrs(chb)) - Math.min(...rrs(chb))).toBeLessThan(30);
  });
  it('effect film (V5, 68/min): before, a level ST, PR 160, QT ≈ 390; on digoxin, J ≈ 0.7 mm low, ≈ 1 mm at J+60, a low T, QT ≈ 350, PR 190', () => {
    const [before, dig] = frames('o3', 0);
    expect(Math.abs(before.truth!.prMs! - 160)).toBeLessThan(3);
    expect(Math.abs(before.truth!.qtMs - 390)).toBeLessThan(5);
    expect(Math.abs(stAt(before, 'V5'))).toBeLessThan(0.02);
    expect(tUpright(before, 'V5')).toBe(true);
    expect(stAt(dig, 'V5')).toBeGreaterThan(-0.08);
    expect(stAt(dig, 'V5')).toBeLessThan(-0.06);
    expect(stAt(dig, 'V5', 60)).toBeGreaterThan(-0.11);
    expect(stAt(dig, 'V5', 60)).toBeLessThan(-0.09);
    expect(tw(dig, 'V5').max).toBeLessThan(0.5 * tw(before, 'V5').max);
    expect(Math.abs(dig.truth!.qtMs - 350)).toBeLessThan(5);
    expect(Math.abs(dig.truth!.prMs! - 190)).toBeLessThan(3);
  });
  it('toxicity film (II): bigeminy with early wide PVCs, the RR mark on the short sinus-to-PVC coupling; AT 180/min with 2:1 block and the blocked P′ in the T upslope; junctional ≈ 80/min without P; complete block ≈ 45/min; regularised AF ≈ 45/min, perfectly regular', () => {
    const [big, at, ajr, chb, regAf] = frames('o3', 1);
    const kinds = big.truth!.beats.map((b) => b.kind);
    kinds.forEach((k, i) => expect(k).toBe(kinds[0] === 'sinus' ? (i % 2 ? 'ventricular' : 'sinus') : i % 2 ? 'sinus' : 'ventricular'));
    const width = (b: BeatMarks) => b.qrsOff - b.qrsOn;
    const pvcs = big.truth!.beats.filter((b) => b.kind === 'ventricular');
    const sinus = big.truth!.beats.filter((b) => b.kind === 'sinus');
    for (const p of pvcs) expect(width(p)).toBeGreaterThanOrEqual(120);
    expect(width(pvcs[0])).toBeGreaterThan(width(sinus[0]) + 30);
    const r = rrs(big);
    expect(Math.min(...r)).toBeLessThan(0.6 * Math.max(...r));
    const [early] = markBeats(blocksOf('o3', 'film')[1].frames[0].marks, 'rr');
    expect(big.truth!.beats[early].kind).toBe('sinus');
    expect(big.truth!.beats[early + 1].kind).toBe('ventricular');
    expect(r[early]).toBeLessThan(0.6 * r[early + 1]);
    expect(Math.abs(at.truth!.atrialRateBpm! - 180)).toBeLessThan(5);
    expect(Math.abs(at.truth!.hrBpm - 90)).toBeLessThan(5);
    const b = midBeat(at);
    const blocked = at.truth!.atrial.filter((a) => a.conductedTo === null && a.t > b.qrsOn && a.t < b.tOff + 60);
    expect(blocked.length).toBe(1);
    expect(blocked[0].t).toBeGreaterThan(b.j);
    expect(blocked[0].t).toBeLessThan(b.tPeak!);
    expect(ajr.truth!.prMs).toBeNull();
    expect(Math.abs(ajr.truth!.hrBpm - 80)).toBeLessThan(5);
    expect(Math.max(...rrs(ajr)) - Math.min(...rrs(ajr))).toBeLessThan(30);
    expect(Math.abs(chb.truth!.hrBpm - 45)).toBeLessThan(5);
    expect(regAf.truth!.rhythm).toBe('atrial-fibrillation');
    expect(regAf.truth!.findings).toContain('av-block-3');
    expect(Math.abs(regAf.truth!.hrBpm - 45)).toBeLessThan(5);
    expect(Math.max(...rrs(regAf)) - Math.min(...rrs(regAf))).toBeLessThan(10);
  });
  it('bigeminy check: every other beat is a PVC', () => {
    const e = ecgOf(inlineItem('o3', 'o3:bigeminy-on-digoxin').ecg);
    expect(e.truth!.findings).toContain('ventricular-bigeminy');
  });
});

describe('o4: sodium-channel blockade on the tracings', () => {
  it('every Na-blockade tracing: sinus ≈ 104/min, QRS 120–135 ms, aVR ends in an r ≥ 3 mm with R/S ≥ 0.7, lead I ends in an S', () => {
    for (const src of sourcesWith('o4', 'na-channel-blockade')) {
      const e = ecgOf(src);
      expect(e.truth!.rhythm).toBe('sinus-tachycardia');
      expect(e.truth!.qrsMs).toBeGreaterThanOrEqual(120);
      expect(e.truth!.qrsMs).toBeLessThan(135);
      const avr = qrs(e, 'aVR');
      expect(avr.max).toBeGreaterThanOrEqual(0.3);
      expect(avr.max / -avr.min).toBeGreaterThanOrEqual(0.7);
      expect(roles(e, 'aVR').endsWith('r')).toBe(true);
      expect(roles(e, 'I').endsWith('s')).toBe(true);
    }
    const inline = ecgOf(inlineItem('o4', 'o4:tca-qrs-risk').ecg);
    expect(inline.truth!.qrsMs).toBeGreaterThanOrEqual(100);
  });
  it('blockade film: before, QRS ≈ 95 ms with aVR all negative and I all upright; blocked, QRS ≈ 130 ms, aVR ends in an R ≈ 4 mm, I in an S; the Brugada variant raises J ≈ 3 mm in V1–V2 into a negative T in V1; RBBB ends in an R in aVR with a tall R′ in V1 the poisoning lacks', () => {
    const [before, na, brugada, rbbb] = frames('o4', 0);
    expect(Math.abs(before.truth!.hrBpm - 104)).toBeLessThan(1);
    expect(Math.abs(before.truth!.qrsMs - 95)).toBeLessThan(5);
    expect(qrs(before, 'aVR').max).toBeLessThan(0.08);
    expect(qrs(before, 'I').min).toBeGreaterThan(-0.06);
    expect(Math.abs(na.truth!.qrsMs - 130)).toBeLessThan(5);
    expect(qrs(na, 'aVR').max).toBeGreaterThan(0.35);
    expect(qrs(na, 'aVR').max).toBeLessThan(0.45);
    for (const l of ['V1', 'V2'] as const) {
      expect(stAt(brugada, l), l).toBeGreaterThan(0.25);
      expect(stAt(brugada, l), l).toBeLessThan(0.35);
    }
    expect(tInverted(brugada, 'V1')).toBe(true);
    expect(brugada.truth!.findings).toContain('brugada-type1');
    expect(roles(rbbb, 'aVR').endsWith('r')).toBe(true);
    expect(qrs(rbbb, 'V1').max).toBeGreaterThan(1.0);
    expect(qrs(na, 'V1').max).toBeLessThan(0.2);
  });
  it('drug film: K-channel block QT ≈ 505 ms at 64/min with a low, broad T and a narrow QRS; digoxin QT ≈ 350 ms with a scooped V5 ST and a low T; AV-nodal blockers ≈ 55/min with PR 240 ms', () => {
    const [k, dig, avn] = frames('o4', 1);
    expect(Math.abs(k.truth!.qtMs - 505)).toBeLessThan(5);
    expect(Math.abs(k.truth!.hrBpm - 64)).toBeLessThan(1);
    expect(k.truth!.qrsMs).toBeLessThan(110);
    expect(tw(k, 'II').max).toBeLessThan(0.15);
    expect(tWidth(k, 'II')).toBeGreaterThan(200);
    expect(Math.abs(dig.truth!.qtMs - 350)).toBeLessThan(5);
    expect(stAt(dig, 'V5', 60)).toBeLessThan(stAt(dig, 'V5'));
    expect(stAt(dig, 'V5')).toBeLessThan(-0.03);
    expect(tw(dig, 'V5').max).toBeLessThan(0.2);
    expect(Math.abs(avn.truth!.hrBpm - 55)).toBeLessThan(1);
    expect(Math.abs(avn.truth!.prMs! - 240)).toBeLessThan(3);
  });
  it('contrast: severe hyperkalaemia is slow, without a measurable PR, with an even wider QRS', () => {
    const e = ecgOf(contrastTitled('o4', 'Two "metabolic" wide QRS complexes').right.ecg);
    expect(e.truth!.hrBpm).toBeLessThan(70);
    expect(e.truth!.prMs).toBeNull();
    expect(e.truth!.qrsMs).toBeGreaterThan(155);
  });
  it('drug-induced long QT: about 64/min, QT ≈ 505 ms, QTc ≈ 515 ms (> 500 ms), narrow QRS', () => {
    const e = ecgOf(sourcesWith('o4', 'long-qt')[0]);
    expect(Math.abs(e.truth!.hrBpm - 64)).toBeLessThan(2);
    expect(Math.abs(e.truth!.qtMs - 505)).toBeLessThan(15);
    expect(e.truth!.qtcFridericiaMs).toBeGreaterThan(500);
    expect(Math.abs(e.truth!.qtcBazettMs - 515)).toBeLessThan(15);
    expect(e.truth!.qrsMs).toBeLessThan(110);
  });
});

describe('o5: hypothermia on the tracings', () => {
  it('every hypothermia tracing: the requested rate, PR ≈ 230 ms, QRS ≈ 140 ms (the Osborn dome is its terminal part), QTcF ≈ 490 ms, Osborn waves', () => {
    for (const src of sourcesWith('o5', 'hypothermia')) {
      const e = ecgOf(src);
      const want = src.kind === 'synth' ? src.req.dials?.rate : undefined;
      if (want !== undefined) expect(Math.abs(e.truth!.hrBpm - want)).toBeLessThan(2);
      expect(e.truth!.rhythm).toBe('sinus-bradycardia');
      expect(Math.abs(e.truth!.prMs! - 230)).toBeLessThan(10);
      expect(e.truth!.qrsMs).toBeGreaterThanOrEqual(130);
      expect(e.truth!.qrsMs).toBeLessThan(150);
      expect(Math.abs(e.truth!.qtcFridericiaMs - 490)).toBeLessThan(15);
      expect(e.truth!.findings).toContain('osborn-waves');
    }
  });
  it('the J-wave differentials: early repolarisation at ≈ 62/min has a normal QT and J ≈ 1.5 mm in II; hypercalcaemia (J-wave film) has a QTcF < 350 ms', () => {
    const er = ecgOf(contrastTitled('o5', 'Osborn waves or early repolarisation?').right.ecg);
    expect(Math.abs(er.truth!.hrBpm - 62)).toBeLessThan(1);
    expect(er.truth!.qtcFridericiaMs).toBeLessThan(440);
    expect(stAt(er, 'II')).toBeGreaterThan(0.12);
    expect(stAt(er, 'II')).toBeLessThan(0.19);
    const ca = frames('o5', 1)[1];
    expect(ca.truth!.qtcFridericiaMs).toBeLessThan(350);
  });
  it('slow-or-cold film: normal PR 160, QRS ≈ 95, QT ≈ 380 at 75/min; bradycardia at 46/min keeps PR and QRS, QT ≈ 445, no Osborn wave; the cold at 46/min has PR ≈ 230, QRS ≈ 140, QT ≈ 540', () => {
    const [normal, brady, cold] = frames('o5', 0);
    for (const e of [normal, brady]) {
      expect(Math.abs(e.truth!.prMs! - 160)).toBeLessThan(3);
      expect(Math.abs(e.truth!.qrsMs - 95)).toBeLessThan(5);
      expect(e.truth!.findings).not.toContain('osborn-waves');
    }
    expect(Math.abs(normal.truth!.qtMs - 380)).toBeLessThan(5);
    expect(Math.abs(normal.truth!.hrBpm - 75)).toBeLessThan(1);
    expect(Math.abs(brady.truth!.hrBpm - 46)).toBeLessThan(1);
    expect(Math.abs(brady.truth!.qtMs - 445)).toBeLessThan(5);
    expect(Math.abs(cold.truth!.hrBpm - 46)).toBeLessThan(1);
    expect(Math.abs(cold.truth!.prMs! - 230)).toBeLessThan(5);
    expect(Math.abs(cold.truth!.qrsMs - 140)).toBeLessThan(5);
    expect(Math.abs(cold.truth!.qtMs - 540)).toBeLessThan(5);
  });
  it('J-wave film: cold QT ≈ 530 ms at 48/min with a flat ST after the hump; high calcium QT ≈ 310 ms; inferior STEMI ST up in II, III, aVF (III highest), down in aVL', () => {
    const [cold, ca, stemi] = frames('o5', 1);
    expect(Math.abs(cold.truth!.hrBpm - 48)).toBeLessThan(1);
    expect(Math.abs(cold.truth!.qtMs - 530)).toBeLessThan(5);
    expect(Math.abs(stAt(cold, 'II', 60))).toBeLessThan(0.05);
    expect(Math.abs(ca.truth!.qtMs - 310)).toBeLessThan(5);
    for (const l of ['II', 'aVF'] as const) {
      expect(stAt(stemi, 'III', 60), l).toBeGreaterThan(stAt(stemi, l, 60));
      expect(stAt(stemi, l, 60), l).toBeGreaterThan(0.1);
    }
    expect(stAt(stemi, 'aVL', 60)).toBeLessThan(-0.1);
  });
  it('shivering film: the same cold heart with EMG on LA has I, III and aVL noisy and II clean; slow AF ≈ 55/min and irregular, the RR mark on its longest interval', () => {
    const [still, shiver, af] = frames('o5', 2);
    expect(shiver.truth!.beats).toEqual(still.truth!.beats);
    for (const l of ['I', 'III', 'aVL'] as const) {
      expect(hfNoise(shiver, l), l).toBeGreaterThan(3 * hfNoise(shiver, 'II'));
      expect(hfNoise(shiver, l), l).toBeGreaterThan(3 * hfNoise(still, l));
    }
    expect(af.truth!.rhythm).toBe('atrial-fibrillation');
    expect(Math.abs(af.truth!.hrBpm - 55)).toBeLessThan(5);
    expect(Math.max(...rrs(af)) - Math.min(...rrs(af))).toBeGreaterThan(150);
    const [k] = markBeats(blocksOf('o5', 'film')[2].frames[2].marks, 'rr');
    expect(af.truth!.beats[k].kind).toBe('atrial');
    expect(rrs(af)[k]).toBe(Math.max(...rrs(af)));
  });
});

describe('o6: pulmonary embolism on the tracings', () => {
  const strain = (e: Ecg, at: string) => {
    expect(roles(e, 'I').endsWith('s'), `${at}: S in I`).toBe(true);
    expect(roles(e, 'III').startsWith('q'), `${at}: Q in III`).toBe(true);
    for (const l of ['III', 'V1', 'V2'] as const) expect(tInverted(e, l), `${at}: T in ${l}`).toBe(true);
  };
  it('every PE tracing (hook, heart, film, worked, contrast): S in I, Q and inverted T in III, T inverted in V1–V2, at its requested rate (about 106/min in the hook, 102/min in the worked example)', () => {
    for (const { path, src } of sourcesOf(byId('o6'))) {
      if (src.kind !== 'synth' || src.req.scenario !== 'pulmonary-embolism') continue;
      strain(ecgOf(src), path);
      expect(Math.abs(ecgOf(src).truth!.hrBpm - src.req.dials!.rate!), path).toBeLessThan(1);
    }
  });
  it('contrast: acute PE has no RV voltage (R in V1 and S in V5–V6 under 7 mm); chronic RVH has a pure tall R in V1, an S deeper than the R in V5–V6 (≥ 7 mm) and a right axis', () => {
    const c = contrastTitled('o6', 'Acute strain or chronic hypertrophy?');
    const pe = ecgOf(c.left.ecg);
    const rvh = ecgOf(c.right.ecg);
    expect(qrs(pe, 'V1').max).toBeLessThan(0.7);
    expect(roles(rvh, 'V1')).toBe('r');
    expect(qrs(rvh, 'V1').max).toBeGreaterThan(0.7);
    for (const l of ['V5', 'V6'] as const) {
      expect(qrs(pe, l).min, l).toBeGreaterThan(-0.7);
      expect(qrs(rvh, l).min, l).toBeLessThan(-0.7);
      expect(-qrs(rvh, l).min, l).toBeGreaterThan(qrs(rvh, l).max);
    }
    expect(rvh.truth!.axisDeg.qrs).toBeGreaterThan(90);
  });
  it('rate sweep: the strain signs at both ends, 100 and 115/min', () => {
    for (const v of [100, 115]) {
      const e = played('o6', 0, v);
      expect(Math.abs(e.truth!.hrBpm - v), `${v}`).toBeLessThan(1.5);
      strain(e, `${v}/min`);
    }
  });
  it('film: at ≈ 108/min tachycardia alone has I all R, no Q in III and an upright T in V2; the strained heart adds S1Q3T3, T inversion in V1–V2 and a qR in V1', () => {
    const [tachy, pe] = frames('o6', 0);
    for (const e of [tachy, pe]) expect(Math.abs(e.truth!.hrBpm - 108)).toBeLessThan(1.5);
    expect(roles(tachy, 'I')).toBe('r');
    expect(roles(tachy, 'III').startsWith('q')).toBe(false);
    expect(tUpright(tachy, 'V2')).toBe(true);
    strain(pe, 'film');
    expect(roles(pe, 'V1').startsWith('qr')).toBe(true);
  });
});

describe('o7: pericardium on the tracings', () => {
  it('every pericarditis tracing: ST up in II and V4, down only in aVR, flat in aVL; PR depressed in II and V5, elevated in aVR (vs TP)', () => {
    for (const src of sourcesWith('o7', 'pericarditis')) {
      const e = ecgOf(src);
      // worked caption: ST about 1.5–2 mm in II and 2–3 mm in V3–V4 above TP, larger than the PR depression in II
      expect(stTp(e, 'II')).toBeGreaterThan(0.14);
      expect(stTp(e, 'II')).toBeLessThan(0.2);
      expect(stTp(e, 'II')).toBeGreaterThan(-prShift(e, 'II') + 0.04);
      for (const l of ['V3', 'V4'] as const) {
        expect(stTp(e, l), l).toBeGreaterThan(0.18);
        expect(stTp(e, l), l).toBeLessThan(0.32);
      }
      expect(stTp(e, 'aVR')).toBeLessThan(-0.04);
      expect(Math.abs(stTp(e, 'aVL'))).toBeLessThan(0.05);
      for (const l of ['I', 'II', 'III', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) expect(stTp(e, l), l).toBeGreaterThan(-0.03);
      for (const l of ['II', 'V5'] as const) expect(prShift(e, l), l).toBeLessThan(-0.03);
      expect(prShift(e, 'aVR')).toBeGreaterThan(0.03);
    }
  });
  it('contrast with early repolarisation (II and V6): PR about 1 mm below TP in pericarditis vs level in early repolarisation; ST in II 1.5–2 mm above TP; J ≈ 1.5 mm in ER; V6 ST/T ≈ 0.55 vs ≈ 0.2 (the classic 0.25 line) with the ER ST about 1 mm; rates ≈ 96 vs ≈ 62', () => {
    const c = contrastTitled('o7', 'Pericarditis or early repolarisation');
    expect(c.view).toEqual({ highlightLeads: ['II', 'V6'] });
    const p = ecgOf(c.left.ecg);
    const er = ecgOf(c.right.ecg);
    expect(prShift(p, 'II')).toBeGreaterThan(-0.125);
    expect(prShift(p, 'II')).toBeLessThan(-0.08);
    expect(stTp(p, 'II')).toBeGreaterThanOrEqual(0.15);
    expect(stTp(p, 'II')).toBeLessThanOrEqual(0.2);
    expect(stTp(p, 'II')).toBeGreaterThan(-prShift(p, 'II') + 0.04);
    const ratio = (e: typeof p) => stAt(e, 'V6', 60) / tw(e, 'V6').max;
    expect(ratio(p)).toBeGreaterThan(0.5);
    expect(ratio(p)).toBeLessThan(0.6);
    expect(ratio(er)).toBeGreaterThan(0.15);
    expect(ratio(er)).toBeLessThan(0.22);
    expect(stAt(er, 'V6', 60)).toBeGreaterThan(0.08);
    expect(stAt(er, 'V6', 60)).toBeLessThan(0.125);
    expect(Math.abs(prShift(er, 'II'))).toBeLessThan(0.02);
    expect(stAt(er, 'II')).toBeGreaterThan(0.125);
    expect(stAt(er, 'II')).toBeLessThan(0.175);
    expect(Math.abs(p.truth!.hrBpm - 96)).toBeLessThan(1);
    expect(Math.abs(er.truth!.hrBpm - 62)).toBeLessThan(1);
  });
  it('contrast with inferior STEMI: pericarditis has II ≥ III, aVL level and the PR depressed in II; the STEMI has III > II, mirror depression in aVL and I, and a level PR', () => {
    const c = contrastTitled('o7', 'Pericarditis or inferior STEMI');
    const p = ecgOf(c.left.ecg);
    expect(stTp(p, 'II')).toBeGreaterThanOrEqual(stTp(p, 'III'));
    expect(Math.abs(stTp(p, 'aVL'))).toBeLessThanOrEqual(0.05);
    expect(prShift(p, 'II')).toBeLessThan(-0.05);
    const e = ecgOf(c.right.ecg);
    expect(stAt(e, 'III', 60)).toBeGreaterThan(stAt(e, 'II', 60));
    for (const l of ['aVL', 'I'] as const) expect(stAt(e, l, 60), l).toBeLessThan(-0.05);
    expect(Math.abs(prShift(e, 'II'))).toBeLessThanOrEqual(0.05);
  });
  it('three-questions film: normal at 96/min has PR, ST and TP level; pericarditis lifts the ST in I, II, aVF and V2–V6, drops the PR ≈ 1 mm in II and V4–V6 and lifts it ≈ 1 mm in aVR, and depresses only aVR', () => {
    const [normal, dist, pr, recip] = frames('o7', 0);
    expect(Math.abs(normal.truth!.hrBpm - 96)).toBeLessThan(1);
    expect(Math.abs(prShift(normal, 'II'))).toBeLessThan(0.02);
    for (const l of ['II', 'V4'] as const) expect(Math.abs(stTp(normal, l)), l).toBeLessThan(0.03);
    const film = blocksOf('o7', 'film')[0];
    expect(film.frames[2].ecg).toEqual(film.frames[1].ecg);
    expect(film.frames[3].ecg).toEqual(film.frames[1].ecg);
    for (const l of ['I', 'II', 'aVF', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) expect(stTp(dist, l), l).toBeGreaterThan(0.05);
    for (const l of ['II', 'V4', 'V5', 'V6'] as const) {
      expect(prShift(pr, l), l).toBeGreaterThan(-0.125);
      expect(prShift(pr, l), l).toBeLessThan(-0.075);
    }
    expect(prShift(pr, 'aVR')).toBeGreaterThan(0.075);
    expect(prShift(pr, 'aVR')).toBeLessThan(0.125);
    expect(stTp(recip, 'aVR')).toBeLessThan(-0.04);
    expect(Math.abs(stTp(recip, 'aVL'))).toBeLessThan(0.05);
    for (const l of ['I', 'II', 'III', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) expect(stTp(recip, l), l).toBeGreaterThan(-0.03);
  });
  it('fluid film: tachycardia at 106/min with QRS ≈ 9 mm in II; the effusion keeps the rate, shrinks every limb QRS under 5 mm (II ≈ 4 mm) and the chest leads too; alternans flips the V3 R every beat', () => {
    const [tachy, eff, alt] = frames('o7', 1);
    for (const e of [tachy, eff]) expect(Math.abs(e.truth!.hrBpm - 106)).toBeLessThan(1);
    expect(qrs(tachy, 'II').p2p).toBeGreaterThan(0.85);
    expect(qrs(tachy, 'II').p2p).toBeLessThan(0.95);
    for (const l of LIMB) expect(qrs(eff, l).p2p, l).toBeLessThan(0.5);
    expect(qrs(eff, 'II').p2p).toBeGreaterThan(0.35);
    expect(qrs(eff, 'II').p2p).toBeLessThan(0.45);
    expect(qrs(eff, 'V3').p2p).toBeLessThan(0.6 * qrs(tachy, 'V3').p2p);
    const r = alt.truth!.beats.map((b) => span(alt, 'V3', b.qrsOn, b.qrsOff, b).max);
    const d = r.slice(1).map((x, i) => x - r[i]);
    expect(d.slice(1).filter((x, i) => Math.sign(x) !== Math.sign(d[i])).length).toBeGreaterThanOrEqual(d.length - 3);
    expect(Math.max(...rrs(alt)) - Math.min(...rrs(alt))).toBeLessThan(30);
    expect(alt.truth!.beats.length).toBeGreaterThan(6);
  });
  it('effusion: limb QRS < 5 mm in every limb lead, sinus tachycardia; alternans: the R in V3 alternates beat to beat', () => {
    const eff = ecgOf(sourcesWith('o7', 'pericardial-effusion')[0]);
    for (const l of LIMB) expect(qrs(eff, l).p2p, l).toBeLessThan(0.5);
    expect(eff.truth!.hrBpm).toBeGreaterThan(100);
    const alt = ecgOf(sourcesWith('o7', 'electrical-alternans')[0]);
    const beats = alt.truth!.beats;
    const r = beats.map((b) => span(alt, 'V3', b.qrsOn, b.qrsOff, b).max);
    const d = r.slice(1).map((x, i) => x - r[i]);
    const flips = d.slice(1).filter((x, i) => Math.sign(x) !== Math.sign(d[i])).length;
    expect(flips).toBeGreaterThanOrEqual(d.length - 3);
    expect(Math.max(...d.map(Math.abs))).toBeGreaterThan(0.1);
    const step = blocksOf('o7', 'worked').find((w) => w.title.en === 'Finding electrical alternans')!.steps[1];
    for (const m of step.marks ?? []) if ('auto' in m && m.beat !== undefined) expect(m.beat).toBeLessThan(beats.length - 1);
  });
});

describe('o8: deep T inversion on the tracings', () => {
  it('cerebral T: QTcF ≈ 560 ms; V3–V5 inverted about 11–14 mm, V2 and V6 shallower; I, II, aVF inverted; aVR upright', () => {
    for (const src of sourcesWith('o8', 'cerebral-t')) {
      const e = ecgOf(src);
      expect(Math.abs(e.truth!.qtcFridericiaMs - 560)).toBeLessThan(5);
      for (const l of ['V3', 'V4', 'V5'] as const) {
        expect(tw(e, l).min, l).toBeLessThan(-1.045);
        expect(tw(e, l).min, l).toBeGreaterThan(-1.47);
        for (const s of ['V2', 'V6'] as const) expect(tw(e, s).min, `${s} vs ${l}`).toBeGreaterThan(tw(e, l).min);
      }
      for (const l of ['I', 'II', 'aVF'] as const) expect(tInverted(e, l), l).toBe(true);
      expect(tUpright(e, 'aVR')).toBe(true);
    }
  });
  it('cerebral T worked example and contrast (seed 1543): about 68/min, QT ≈ 535 ms; V3 about 12 mm deep', () => {
    const e = ecgOf(blocksOf('o8', 'worked')[0].ecg);
    expect(contrastTitled('o8', 'Cerebral T or Wellens?').left.ecg).toEqual(blocksOf('o8', 'worked')[0].ecg);
    expect(Math.abs(e.truth!.hrBpm - 68)).toBeLessThan(1);
    expect(Math.abs(e.truth!.qtMs - 535)).toBeLessThan(5);
    expect(tw(e, 'V3').min).toBeGreaterThan(-1.26);
    expect(tw(e, 'V3').min).toBeLessThan(-1.14);
  });
  it('cardiac memory (both tracings): all three Shvilkin signs, T inverted in III, aVF, V1, V2', () => {
    for (const src of sourcesWith('o8', 'cardiac-memory')) {
      const e = ecgOf(src);
      expect(tUpright(e, 'aVL')).toBe(true);
      expect(tUpright(e, 'I')).toBe(true);
      for (const l of ['III', 'aVF', 'V1', 'V2'] as const) expect(tInverted(e, l), l).toBe(true);
      const deepestPrecordial = Math.min(...(['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const).map((l) => tw(e, l).min));
      expect(deepestPrecordial).toBeLessThan(tw(e, 'III').min);
    }
  });
  it('cardiac-memory check (seed 1549): T inverted in V1–V3 too, about 7 mm in V1 and V2', () => {
    const e = ecgOf(inlineItem('o8', 'o8:cardiac-memory').ecg);
    expect(tInverted(e, 'V3')).toBe(true);
    for (const l of ['V1', 'V2'] as const) {
      expect(tw(e, l).min, l).toBeGreaterThan(-0.735);
      expect(tw(e, l).min, l).toBeLessThan(-0.665);
    }
  });
  it('Wellens A: biphasic T in V3 with a normal QT; Wellens B: deep symmetric inversion about 7–8 mm in V2–V3, shallower in V1 and V4', () => {
    const a = ecgOf(contrastTitled('o8', 'Cerebral T or Wellens?').right.ecg);
    expect(tw(a, 'V3').max).toBeGreaterThan(0.05);
    expect(tw(a, 'V3').min).toBeLessThan(-0.05);
    expect(a.truth!.qtcFridericiaMs).toBeLessThan(460);
    const b = ecgOf(contrastTitled('o8', 'Giant inverted T: apical HCM or Wellens type B?').right.ecg);
    for (const l of ['V2', 'V3'] as const) {
      expect(tw(b, l).min, l).toBeLessThan(-0.665);
      expect(tw(b, l).min, l).toBeGreaterThan(-0.84);
      expect(tw(b, l).max, l).toBeLessThan(0.05);
    }
    for (const l of ['V1', 'V4'] as const) expect(tw(b, l).min, l).toBeGreaterThan(tw(b, 'V2').min);
  });
  it('family film: Wellens biphasic in V3 with R kept, no Q, ST barely up; cerebral T ≈ 14 mm in V4 with QT ≈ 535 ms at 68/min; apical HCM deepest in V4 ≈ 20 mm with R ≈ 21 mm in V6; secondary T against a tall-R, deep-S QRS in I, aVL, V5–V6', () => {
    const [wellens, cerebral, hcm, secondary] = frames('o8', 0);
    expect(tw(wellens, 'V3').max).toBeGreaterThan(0.05);
    expect(tw(wellens, 'V3').min).toBeLessThan(-0.05);
    expect(qrs(wellens, 'V3').max).toBeGreaterThan(0.8);
    for (const l of ['V2', 'V3'] as const) {
      expect(roles(wellens, l).startsWith('q'), l).toBe(false);
      expect(Math.abs(stAt(wellens, l)), l).toBeLessThan(0.1);
    }
    expect(tw(cerebral, 'V4').min).toBeGreaterThan(-1.45);
    expect(tw(cerebral, 'V4').min).toBeLessThan(-1.35);
    for (const l of ['V2', 'V3', 'V4', 'V5', 'V6', 'I', 'II', 'aVF'] as const) expect(tInverted(cerebral, l), l).toBe(true);
    expect(Math.abs(cerebral.truth!.qtMs - 535)).toBeLessThan(5);
    expect(Math.abs(cerebral.truth!.hrBpm - 68)).toBeLessThan(1);
    expect(tw(hcm, 'V4').min).toBeGreaterThan(-2.05);
    expect(tw(hcm, 'V4').min).toBeLessThan(-1.95);
    for (const l of ['V1', 'V2', 'V3', 'V5', 'V6'] as const) expect(tw(hcm, 'V4').min, l).toBeLessThan(tw(hcm, l).min);
    for (const l of ['V1', 'V2', 'V3'] as const) expect(qrs(hcm, l).min, l).toBeLessThan(-1.5);
    expect(qrs(hcm, 'V6').max).toBeGreaterThan(2.05);
    expect(qrs(hcm, 'V6').max).toBeLessThan(2.15);
    expect(qrs(secondary, 'V6').max).toBeGreaterThan(1.5);
    expect(qrs(secondary, 'V2').min).toBeLessThan(-2);
    for (const l of ['I', 'aVL', 'V5', 'V6'] as const) expect(tInverted(secondary, l), l).toBe(true);
  });
  it('memory film: RV pacing QRS ≈ 160 ms negative in III, aVF, V1 (and mostly negative in V2); another patient off pacing has QRS ≈ 95 ms with T inverted in III, aVF and V1–V2 (the predicted answer); Shvilkin depths ≈ 7.5 mm in V1 vs ≈ 4 mm in III', () => {
    const film = blocksOf('o8', 'film')[1];
    const [paced, own, check] = frames('o8', 1);
    expect(Math.abs(paced.truth!.qrsMs - 160)).toBeLessThan(5);
    for (const l of ['III', 'aVF', 'V1'] as const) expect(qrs(paced, l).max, l).toBeLessThan(0.05);
    expect(qrs(paced, 'V2').net).toBeLessThan(0);
    expect(film.predict!.options[film.predict!.answer].en).toBe('III, aVF and V1–V2');
    for (const l of ['III', 'aVF', 'V1', 'V2'] as const) expect(tInverted(own, l), l).toBe(true);
    expect(Math.abs(own.truth!.qrsMs - 95)).toBeLessThan(5);
    expect(film.frames[2].ecg).toEqual(film.frames[1].ecg);
    expect(tw(check, 'V1').min).toBeGreaterThan(-0.7875);
    expect(tw(check, 'V1').min).toBeLessThan(-0.7125);
    expect(Math.min(...(['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const).map((l) => tw(check, l).min))).toBe(tw(check, 'V1').min);
    expect(tw(check, 'III').min).toBeGreaterThan(-0.425);
    expect(tw(check, 'III').min).toBeLessThan(-0.375);
  });
  it('apical HCM (contrast, seed 1546): inversion about 18–20 mm in V4–V5, deepest there, deep S in V1–V3, tall R in V5–V6', () => {
    const e = ecgOf(contrastTitled('o8', 'Giant inverted T: apical HCM or Wellens type B?').left.ecg);
    for (const l of ['V4', 'V5'] as const) {
      expect(tw(e, l).min, l).toBeLessThan(-1.71);
      expect(tw(e, l).min, l).toBeGreaterThan(-2.1);
    }
    expect(Math.min(tw(e, 'V4').min, tw(e, 'V5').min)).toBeLessThan(Math.min(tw(e, 'V2').min, tw(e, 'V3').min));
    for (const l of ['V1', 'V2', 'V3'] as const) expect(qrs(e, l).min, l).toBeLessThan(-1.5);
    for (const l of ['V5', 'V6'] as const) expect(qrs(e, l).max, l).toBeGreaterThan(1.5);
  });
});

describe('o9: placement errors on the tracings', () => {
  /** lead `la` of `a` equals `sign` × lead `lb` of `b`, sample by sample */
  const sameLead = (a: Ecg, la: StdLead, b: Ecg, lb: StdLead, sign = 1) => {
    const x = a.signal.leads[la];
    const y = b.signal.leads[lb];
    let worst = 0;
    for (let i = 0; i < x.length; i++) worst = Math.max(worst, Math.abs(x[i] - sign * y[i]));
    return worst < 0.002;
  };
  const pAmp = (e: Ecg, l: StdLead) => span(e, l, midBeat(e).pOn!, midBeat(e).pOff!, midBeat(e));
  it('limb film: one heart; LA/RA inverts I and swaps II↔III and aVR↔aVL; LA/LL swaps I↔II and aVL↔aVF and inverts III with a bigger P in I; RA/LL inverts I, II, III and swaps aVR↔aVF; LA/RL flattens III and makes I = II; V1–V6 untouched', () => {
    const [ok, laRa, laLl, raLl, laRl] = frames('o9', 0);
    for (const e of [laRa, laLl, raLl, laRl]) expect(e.truth!.beats).toEqual(ok.truth!.beats);
    expect(pAmp(ok, 'II').max).toBeGreaterThan(Math.max(...(['I', 'III', 'aVL', 'aVF'] as const).map((l) => pAmp(ok, l).max)));
    expect(qrs(ok, 'aVR').max).toBeLessThan(0.06);
    expect(tInverted(ok, 'aVR')).toBe(true);
    for (const l of ['I', 'II'] as const) expect(tUpright(ok, l), l).toBe(true);
    expect(sameLead(laRa, 'I', ok, 'I', -1)).toBe(true);
    expect(sameLead(laRa, 'II', ok, 'III')).toBe(true);
    expect(sameLead(laRa, 'III', ok, 'II')).toBe(true);
    expect(sameLead(laRa, 'aVR', ok, 'aVL')).toBe(true);
    expect(sameLead(laRa, 'aVL', ok, 'aVR')).toBe(true);
    expect(sameLead(laRa, 'aVF', ok, 'aVF')).toBe(true);
    for (const l of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) for (const e of [laRa, laLl, raLl]) expect(sameLead(e, l, ok, l), l).toBe(true);
    const chestShift = Math.max(...(['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const).map((l) => Math.abs(qrs(laRl, l).p2p / qrs(ok, l).p2p - 1)));
    expect(chestShift).toBeGreaterThan(0.05);
    expect(chestShift).toBeLessThan(0.25);
    expect(sameLead(laLl, 'I', ok, 'II')).toBe(true);
    expect(sameLead(laLl, 'II', ok, 'I')).toBe(true);
    expect(sameLead(laLl, 'III', ok, 'III', -1)).toBe(true);
    expect(sameLead(laLl, 'aVR', ok, 'aVR')).toBe(true);
    expect(sameLead(laLl, 'aVL', ok, 'aVF')).toBe(true);
    expect(sameLead(laLl, 'aVF', ok, 'aVL')).toBe(true);
    expect(pAmp(laLl, 'I').max).toBeGreaterThan(pAmp(laLl, 'II').max);
    expect(sameLead(raLl, 'I', ok, 'III', -1)).toBe(true);
    expect(sameLead(raLl, 'II', ok, 'II', -1)).toBe(true);
    expect(sameLead(raLl, 'III', ok, 'I', -1)).toBe(true);
    expect(sameLead(raLl, 'aVR', ok, 'aVF')).toBe(true);
    expect(sameLead(raLl, 'aVF', ok, 'aVR')).toBe(true);
    expect(qrs(laRl, 'III').p2p).toBeLessThan(0.02);
    expect(sameLead(laRl, 'I', laRl, 'II')).toBe(true);
  });
  it('chest film: one heart; R ≈ 1, 5, 12, 14 mm in V1–V4 with an up-down P in V1; V2/V3 swapped puts ≈ 12 mm in V2 and ≈ 5 mm in V3; V1–V2 high turns the V1 P negative and shrinks the V2 r from ≈ 5 to ≈ 2 mm', () => {
    const [ok, swap, high] = frames('o9', 1);
    for (const e of [swap, high]) expect(e.truth!.beats).toEqual(ok.truth!.beats);
    const r = (e: Ecg, l: StdLead) => qrs(e, l).max;
    [0.1, 0.5, 1.2, 1.4].forEach((mv, k) => expect(Math.abs(r(ok, CHEST4[k]) - mv), CHEST4[k]).toBeLessThan(0.05));
    expect(pAmp(ok, 'V1').max).toBeGreaterThan(0.01);
    expect(pAmp(ok, 'V1').min).toBeLessThan(-0.01);
    expect(Math.abs(r(swap, 'V2') - 1.2)).toBeLessThan(0.05);
    expect(Math.abs(r(swap, 'V3') - 0.5)).toBeLessThan(0.05);
    expect(r(swap, 'V4')).toBeGreaterThan(r(swap, 'V3') + 0.5);
    expect(pAmp(high, 'V1').max).toBeLessThan(0.005);
    expect(pAmp(high, 'V1').min).toBeLessThan(-0.02);
    expect(Math.abs(r(high, 'V2') - 0.2)).toBeLessThan(0.05);
  });
  it('dextrocardia (worked, contrast): P, QRS and T inverted in I; the P clearly inverted in aVL and only just above the line in aVR; the tallest R in V1, falling to V4, smaller still in V5–V6, V6 almost fully negative; the LA/RA side rises smoothly from V1 to V5', () => {
    const r = (e: Ecg, l: StdLead) => qrs(e, l).max;
    const worked = ecgOf(blocksOf('o9', 'worked')[0].ecg);
    const right = ecgOf(contrastTitled('o9', 'One inverted I, two different chests').right.ecg);
    for (const e of [worked, right]) {
      expect(pAmp(e, 'I').max).toBeLessThan(0.01);
      expect(pAmp(e, 'I').min).toBeLessThan(-0.05);
      expect(qrs(e, 'I').max).toBeLessThan(0.05);
      expect(qrs(e, 'I').min).toBeLessThan(-0.5);
      expect(tInverted(e, 'I')).toBe(true);
      expect(pAmp(e, 'aVL').max).toBeLessThan(0.01);
      expect(pAmp(e, 'aVL').min).toBeLessThan(-0.075);
      expect(pAmp(e, 'aVR').max).toBeGreaterThan(0.01);
      expect(pAmp(e, 'aVR').max).toBeLessThanOrEqual(0.05);
      expect(pAmp(e, 'aVR').min).toBeGreaterThan(-0.01);
      for (let k = 1; k < 4; k++) expect(r(e, CHEST4[k]), CHEST4[k]).toBeLessThan(r(e, CHEST4[k - 1]));
      for (const l of ['V5', 'V6'] as const) expect(r(e, l), l).toBeLessThan(r(e, 'V4'));
      expect(-qrs(e, 'V6').min).toBeGreaterThan(5 * r(e, 'V6'));
    }
    const left = ecgOf(contrastTitled('o9', 'One inverted I, two different chests').left.ecg);
    const chest = ['V1', 'V2', 'V3', 'V4', 'V5'] as const;
    for (let k = 1; k < chest.length; k++) expect(r(left, chest[k]), chest[k]).toBeGreaterThan(r(left, chest[k - 1]));
    expect(pAmp(left, 'I').max).toBeLessThan(0.01);
    expect(pAmp(left, 'I').min).toBeLessThan(-0.05);
    expect(qrs(left, 'I').net).toBeLessThan(0);
    expect(tInverted(left, 'I')).toBe(true);
  });
});
const CHEST4: readonly StdLead[] = ['V1', 'V2', 'V3', 'V4'];

describe('o11: pacing on the tracings', () => {
  /** the spike: the largest excursion in the few ms around a paced QRS onset */
  const spike = (e: Ecg, l: StdLead, b = midBeat(e)) => {
    const s = span(e, l, b.qrsOn - 3, b.qrsOn + 4, b);
    return Math.max(s.max, -s.min);
  };
  /** the paced QRS without its spike */
  const body = (e: Ecg, l: StdLead, b = midBeat(e)) => span(e, l, b.qrsOn + 10, b.qrsOff, b);
  const paced = (e: Ecg) => e.truth!.beats.filter((b) => b.kind === 'paced-ventricular');
  /** stimulus times (ms): only a unipolar spike jumps more than 1 mV between two samples of lead II */
  const stimuli = (e: Ecg): number[] => {
    const a = e.signal.leads.II;
    const t: number[] = [];
    for (let i = 1; i < a.length; i++) {
      const ms = (i * 1000) / e.signal.fs;
      if (Math.abs(a[i] - a[i - 1]) > 1 && (t.length === 0 || ms - t[t.length - 1] > 30)) t.push(ms);
    }
    return t;
  };
  it('mode film: AAI 70/min with a P after each atrial stimulus and a narrow own QRS; VVI 60/min, QRS ≈ 160 ms negative in II, III, aVF and QS in V1 over AF; bipolar spike about a fifth; DDD AP–VP 64/min with both stimuli; AS–VP tracks sinus P waves with ventricular spikes only; CRT QRS ≈ 135 ms with lead I and V1 negative', () => {
    const [aai, vvi, bipolar, apvp, asvp, crt] = frames('o11', 0);
    expect(Math.abs(aai.truth!.hrBpm - 70)).toBeLessThan(1);
    expect(Math.abs(aai.truth!.qrsMs - 95)).toBeLessThan(5);
    expect(aai.truth!.atrial.every((a) => a.kind === 'paced' && a.conductedTo !== null)).toBe(true);
    expect(aai.truth!.beats.every((b) => b.kind === 'paced-atrial' || b.kind === 'sinus')).toBe(true);
    expect(Math.abs(vvi.truth!.hrBpm - 60)).toBeLessThan(1);
    expect(Math.abs(vvi.truth!.qrsMs - 160)).toBeLessThan(5);
    expect(vvi.truth!.findings).toContain('atrial-fibrillation');
    for (const l of ['II', 'III', 'aVF'] as const) expect(body(vvi, l).max, l).toBeLessThan(0.05);
    expect(body(vvi, 'V1').max).toBeLessThan(0.05);
    expect(paced(vvi).length).toBe(vvi.truth!.beats.length);
    expect(bipolar.truth!.beats).toEqual(vvi.truth!.beats);
    // the bipolar note's clues: a superior axis, exactly the lower rate (above), AF underneath
    expect(bipolar.truth!.axisDeg.qrs).toBeGreaterThan(-90);
    expect(bipolar.truth!.axisDeg.qrs).toBeLessThan(-30);
    expect(bipolar.truth!.findings).toContain('atrial-fibrillation');
    for (const l of ['II', 'V6'] as const) {
      expect(spike(bipolar, l) / spike(vvi, l), l).toBeGreaterThan(0.15);
      expect(spike(bipolar, l) / spike(vvi, l), l).toBeLessThan(0.25);
    }
    expect(Math.abs(apvp.truth!.hrBpm - 64)).toBeLessThan(1);
    expect(apvp.truth!.atrial.every((a) => a.kind === 'paced')).toBe(true);
    expect(paced(apvp).length).toBe(apvp.truth!.beats.length);
    expect(asvp.truth!.atrial.every((a) => a.kind === 'sinus')).toBe(true);
    expect(paced(asvp).length).toBe(asvp.truth!.beats.length);
    const delays = asvp.truth!.beats.map((b) => b.qrsOn - b.pOn!);
    expect(Math.max(...delays) - Math.min(...delays)).toBeLessThan(5);
    expect(Math.abs(crt.truth!.qrsMs - 135)).toBeLessThan(5);
    expect(crt.truth!.qrsMs).toBeLessThan(vvi.truth!.qrsMs - 15);
    expect(body(crt, 'I').max).toBeLessThan(0.05);
    expect(body(crt, 'I').min).toBeLessThan(-0.3);
    expect(body(vvi, 'I').max).toBeGreaterThan(0.3);
    // the pitfall: V1 is negative here although both leads capture
    expect(body(crt, 'V1').max).toBeLessThan(0.05);
    expect(body(crt, 'V1').min).toBeLessThan(-0.5);
  });
  it('function film: working VVI 1000 ms spike to spike (the predicted answer); every third spike in the strip has no QRS after it, with a ≈ 36/min junctional escape under the RR mark; undersensing spikes after own QRS; an oversensing pause ≈ 2.6 s without spike or QRS under the RR mark', () => {
    const film = blocksOf('o11', 'film')[1];
    expect(film.predict!.options[film.predict!.answer].en).toBe('1000 ms');
    const [ok, noCapture, under, over] = frames('o11', 1);
    for (const r of rrs(ok)) expect(Math.abs(r - 1000)).toBeLessThan(5);
    expect(paced(ok).length).toBe(ok.truth!.beats.length);
    expect(noCapture.truth!.findings).toContain('pacing-failure-capture');
    const followed = stimuli(noCapture).map((t) => noCapture.truth!.beats.some((b) => b.qrsOn >= t - 5 && b.qrsOn < t + 300));
    expect(followed.length).toBeGreaterThanOrEqual(6);
    expect(followed).toEqual(followed.map((_, i) => i % 3 !== 2));
    const long = rrs(noCapture).filter((r) => r > 1200);
    expect(long.length).toBeGreaterThanOrEqual(2);
    for (const r of long) expect(Math.abs(60000 / r - 36)).toBeLessThan(1);
    const [esc] = markBeats(film.frames[1].marks, 'rr');
    expect(noCapture.truth!.beats[esc + 1].kind).toBe('escape-junctional');
    expect(Math.abs(60000 / rrs(noCapture)[esc] - 36)).toBeLessThan(1);
    expect(noCapture.truth!.beats[markBeats(film.frames[1].marks, 'pacing-spike')[0]].kind).toBe('paced-ventricular');
    expect(under.truth!.findings).toContain('pacing-undersensing');
    const [u] = markBeats(film.frames[2].marks, 'pacing-spike');
    expect(under.truth!.beats[u].kind).toBe('paced-ventricular');
    expect(under.truth!.beats[u - 1].kind).toBe('sinus');
    expect(under.truth!.beats[u].qrsOn - under.truth!.beats[u - 1].qrsOn).toBeLessThan(1000);
    expect(over.truth!.findings).toContain('pacing-oversensing');
    const pause = Math.max(...rrs(over));
    expect(Math.abs(pause - 2600)).toBeLessThan(50);
    expect(rrs(over).filter((r) => r < 1100).every((r) => Math.abs(r - 1000) < 5)).toBe(true);
    const [o] = markBeats(film.frames[3].marks, 'rr');
    expect(rrs(over)[o]).toBe(pause);
    const [b0, b1] = [over.truth!.beats[o], over.truth!.beats[o + 1]];
    expect(stimuli(over).filter((t) => t > b0.qrsOn + 50 && t < b1.qrsOn - 50)).toEqual([]);
  });
  it('hook (seed 1601, twelve leads): a wide QRS, QS in II, III, aVF and V1, upright I and V6 (LBBB-like) and a superior axis', () => {
    const e = ecgOf(blocksOf('o11', 'hook')[0].ecg);
    expect(e.truth!.qrsMs).toBeGreaterThanOrEqual(140);
    expect(e.truth!.axisDeg.qrs).toBeGreaterThan(-90);
    expect(e.truth!.axisDeg.qrs).toBeLessThan(-30);
    for (const l of ['II', 'III', 'aVF', 'V1'] as const) expect(body(e, l).max, l).toBeLessThan(0.05);
    for (const l of ['I', 'V6'] as const) {
      expect(body(e, l).max, l).toBeGreaterThan(0.3);
      expect(body(e, l).min, l).toBeGreaterThan(-0.05);
    }
  });
  it('worked DDD (seed 1603): the second spike about 170 ms after the first; spike to spike about 940 ms = 64/min', () => {
    const e = ecgOf(blocksOf('o11', 'worked')[0].ecg);
    const st = stimuli(e);
    const av = paced(e)
      .slice(1)
      .map((b) => {
        const v = st.find((t) => Math.abs(t - b.qrsOn) < 10)!;
        return v - st.filter((t) => t < v - 50).pop()!;
      });
    expect(av.length).toBeGreaterThanOrEqual(8);
    for (const x of av) expect(Math.abs(x - 170)).toBeLessThanOrEqual(5);
    for (const r of rrs(e)) expect(Math.abs(r - 940)).toBeLessThanOrEqual(5);
    expect(Math.abs(e.truth!.hrBpm - 64)).toBeLessThan(1);
  });
  it('capture-or-sensing contrast: failure to capture with a junctional escape near 36/min; undersensing with a spike right after the marked intrinsic QRS, spikes that keep their 1000-ms beat, and a captured spike less than 1000 ms after an intrinsic QRS', () => {
    const c = contrastTitled('o11', 'What happens after the spike?');
    const fail = ecgOf(c.left.ecg);
    const r = rrs(fail);
    const long = r.map((x, i) => [x, i] as const).filter(([x]) => x > 1200);
    expect(long.length).toBeGreaterThanOrEqual(2);
    for (const [x, i] of long) {
      expect(Math.abs(60000 / x - 36)).toBeLessThan(1);
      expect(fail.truth!.beats[i + 1].kind).toBe('escape-junctional');
    }
    expect(fail.truth!.beats[markBeats(c.left.marks, 'pacing-spike')[0]].kind).toBe('paced-ventricular');
    const under = ecgOf(c.right.ecg);
    const st = stimuli(under);
    st.slice(1).forEach((t, i) => expect(Math.abs(t - st[i] - 1000)).toBeLessThanOrEqual(5));
    const own = under.truth!.beats[markBeats(c.right.marks, 'qrs')[0]];
    expect(own.kind).toBe('sinus');
    expect(st.some((t) => t > own.qrsOff && t < own.qrsOn + 300)).toBe(true);
    const [p] = markBeats(c.right.marks, 'pacing-spike');
    expect(under.truth!.beats[p].kind).toBe('paced-ventricular');
    expect(under.truth!.beats[p - 1].kind).toBe('sinus');
    expect(under.truth!.beats[p].qrsOn - under.truth!.beats[p - 1].qrsOn).toBeLessThan(1000);
  });
});

describe('o12: what a machine can get wrong, on the tracings', () => {
  it('machine film: LL tremor with a regular RR and lead I clean; the same heart with the arm cables swapped inverts lead I and leaves V1–V6 alone; bipolar VVI exactly 60/min; non-specific ST–T with flat lateral T waves and a level ST', () => {
    const [tremor, swapped, paced, nonspecific] = frames('o12', 0);
    expect(swapped.truth!.beats).toEqual(tremor.truth!.beats);
    for (const l of ['II', 'III', 'aVF'] as const) expect(hfNoise(tremor, l), l).toBeGreaterThan(3 * hfNoise(tremor, 'I'));
    expect(Math.max(...rrs(tremor)) - Math.min(...rrs(tremor))).toBeLessThan(60);
    expect(qrs(swapped, 'I').max).toBeLessThan(0.05);
    expect(qrs(swapped, 'I').min).toBeLessThan(-0.4);
    expect(tInverted(swapped, 'I')).toBe(true);
    const clean = ecgOf({ scenario: 'normal', seed: 1626, dials: { rate: 72 } });
    for (const l of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) {
      const a = swapped.signal.leads[l];
      const b = clean.signal.leads[l];
      let worst = 0;
      for (let i = 0; i < a.length; i++) worst = Math.max(worst, Math.abs(a[i] - b[i]));
      expect(worst, l).toBeLessThan(0.002);
    }
    expect(paced.truth!.beats.every((b) => b.kind === 'paced-ventricular')).toBe(true);
    for (const r of rrs(paced)) expect(Math.abs(r - 1000)).toBeLessThan(5);
    for (const l of ['I', 'aVL', 'V5', 'V6'] as const) expect(tw(nonspecific, l).max, l).toBeLessThan(0.06);
    for (const l of ['I', 'II', 'aVL', 'V5', 'V6'] as const) expect(Math.abs(stAt(nonspecific, l, 60)), l).toBeLessThan(0.05);
  });
  it('measurement film (V2): a clear T end with QT ≈ 405 ms; low K keeps the QT ≈ 405 ms but the QU reads ≈ 565 ms (too long, the predicted answer); AF ≈ 100/min with RR from ≈ 350 to ≈ 1100 ms, both ends under an RR mark', () => {
    const film = blocksOf('o12', 'film')[1];
    expect(film.predict!.options[film.predict!.answer].en).toBe('Too long');
    const [clear, lowK, af] = frames('o12', 1);
    expect(markBeats(film.frames[2].marks, 'rr').map((k) => rrs(af)[k])).toEqual([Math.min(...rrs(af)), Math.max(...rrs(af))]);
    for (const e of [clear, lowK]) expect(Math.abs(e.truth!.qtMs - 405)).toBeLessThan(5);
    expect(uw(clear, 'V2').max).toBeLessThan(0.2 * tw(clear, 'V2').max);
    expect(uw(lowK, 'V2').max).toBeGreaterThan(tw(lowK, 'V2').max);
    const b = midBeat(lowK);
    expect(Math.abs(b.uOff! - b.qrsOn - 565)).toBeLessThan(5);
    expect(af.truth!.rhythm).toBe('atrial-fibrillation');
    expect(Math.abs(af.truth!.hrBpm - 100)).toBeLessThan(5);
    expect(Math.abs(Math.min(...rrs(af)) - 350)).toBeLessThan(10);
    expect(Math.abs(Math.max(...rrs(af)) - 1100)).toBeLessThan(10);
  });
});

describe('o10: artefacts and filters on the tracings', () => {
  it('Parkinsonian tremor (LL): II, III, aVF noisy, I clean', () => {
    for (const src of sourcesWith('o10', 'muscle-tremor-parkinsonian')) {
      const e = ecgOf(src);
      for (const l of ['II', 'III', 'aVF'] as const) expect(hfNoise(e, l), l).toBeGreaterThan(3 * hfNoise(e, 'I'));
      expect(Math.max(...rrs(e)) - Math.min(...rrs(e))).toBeLessThan(60);
    }
  });
  /** the recording fault alone: the faulty frame minus the clean frame of the same heart */
  const fault = (e: Ecg, clean: Ecg, l: StdLead) => e.signal.leads[l].map((x, i) => x - clean.signal.leads[l][i]);
  /** local maxima of a signal within [t0, t1) ms */
  const peaks = (x: Float32Array, fs: number, t0: number, t1: number) => {
    let n = 0;
    for (let i = Math.round((t0 * fs) / 1000) + 1; i < Math.round((t1 * fs) / 1000) - 1; i++) if (x[i] > x[i - 1] && x[i] >= x[i + 1] && x[i] > 0) n++;
    return n;
  };
  it('atlas film: one heart at 72/min; EMG on LA (I, III, aVL noisy, II clean); a 5-Hz tremor on LL (II, III, aVF; I clean; RR unchanged); wander drifting most in the chest; 50-Hz mains ≈ 10 peaks per 200 ms; RA motion for ≈ 3.5 s in I, II, aVR with III quiet', () => {
    const [clean, emg, tremor, wander, mains, motion] = frames('o10', 0);
    for (const e of [emg, tremor, wander, mains, motion]) expect(e.truth!.beats).toEqual(clean.truth!.beats);
    expect(Math.abs(clean.truth!.hrBpm - 72)).toBeLessThan(1);
    for (const l of ['I', 'III', 'aVL'] as const) expect(hfNoise(emg, l), l).toBeGreaterThan(3 * hfNoise(emg, 'II'));
    for (const l of ['II', 'III', 'aVF'] as const) expect(hfNoise(tremor, l), l).toBeGreaterThan(3 * hfNoise(tremor, 'I'));
    const t = fault(tremor, clean, 'II');
    expect(peaks(t, tremor.signal.fs, 2000, 4000)).toBeGreaterThanOrEqual(9);
    expect(peaks(t, tremor.signal.fs, 2000, 4000)).toBeLessThanOrEqual(11);
    const drift = (l: StdLead) => Math.max(...fault(wander, clean, l)) - Math.min(...fault(wander, clean, l));
    for (const v of ['V3', 'V4'] as const) for (const limb of ['I', 'II', 'III'] as const) expect(drift(v), `${v} vs ${limb}`).toBeGreaterThan(drift(limb));
    const hum = (l: StdLead) => fault(mains, clean, l);
    const busiest = (['I', 'II', 'III'] as const).reduce((a, b) => (Math.max(...hum(b)) > Math.max(...hum(a)) ? b : a));
    for (const t0 of [1000, 3000, 5000]) {
      const n = peaks(hum(busiest), mains.signal.fs, t0, t0 + 200);
      expect(n, `${t0}`).toBeGreaterThanOrEqual(9);
      expect(n, `${t0}`).toBeLessThanOrEqual(11);
    }
    const quiet = excursion(motion, 'III', 2600, 6200);
    for (const l of ['I', 'II', 'aVR'] as const) {
      expect(excursion(motion, l, 2600, 6200), l).toBeGreaterThan(3 * quiet);
      expect(excursion(motion, l, 2600, 6200), l).toBeGreaterThan(3 * excursion(motion, l, 200, 2400));
    }
  });
  it('motion on RA (film frame and inline check): I, II, aVR swing widely between 2.6 and 6.2 s, III stays quiet; aVR swings as widely as I and II', () => {
    for (const e of [frames('o10', 0)[5], ecgOf(inlineItem('o10', 'o10:which-electrode').ecg)]) {
      const quiet = excursion(e, 'III', 2600, 6200);
      for (const l of ['I', 'II', 'aVR'] as const) expect(excursion(e, l, 2600, 6200), l).toBeGreaterThan(3 * quiet);
    }
    const check = ecgOf(inlineItem('o10', 'o10:which-electrode').ecg);
    for (const l of ['I', 'II'] as const) {
      const ratio = excursion(check, 'aVR', 2600, 6200) / excursion(check, l, 2600, 6200);
      expect(ratio, l).toBeGreaterThan(0.85);
      expect(ratio, l).toBeLessThan(1.15);
    }
  });
  it('worked tremor (LL): aVF as noisy as II and III, aVR and aVL about half; the RR marches at about 830 ms (72/min), the marked RR among them', () => {
    const w = blocksOf('o10', 'worked')[0];
    const e = ecgOf(w.ecg);
    for (const l of ['II', 'III'] as const) {
      const ratio = hfNoise(e, 'aVF') / hfNoise(e, l);
      expect(ratio, l).toBeGreaterThan(0.85);
      expect(ratio, l).toBeLessThan(1.15);
    }
    for (const l of ['aVR', 'aVL'] as const) {
      const ratio = hfNoise(e, l) / hfNoise(e, 'II');
      expect(ratio, l).toBeGreaterThan(0.4);
      expect(ratio, l).toBeLessThan(0.7);
    }
    expect(Math.abs(e.truth!.hrBpm - 72)).toBeLessThan(1);
    expect(Math.abs(60000 / e.truth!.hrBpm - 830)).toBeLessThan(5);
    const [k] = markBeats(w.steps[1].marks, 'rr');
    expect(Math.abs(rrs(e)[k] - 830)).toBeLessThanOrEqual(5);
  });
  it('tremor-or-AF contrast: the AF side is atrial fibrillation with an irregularly irregular RR, the RR mark on its longest interval', () => {
    const c = contrastTitled('o10', 'Tremor artefact or AF?');
    const af = ecgOf(c.right.ecg);
    expect(af.truth!.rhythm).toBe('atrial-fibrillation');
    const r = rrs(af);
    expect(Math.max(...r) - Math.min(...r)).toBeGreaterThan(300);
    const d = r.slice(1).map((x, i) => x - r[i]);
    expect(d.slice(1).filter((x, i) => Math.sign(x) !== Math.sign(d[i])).length).toBeGreaterThanOrEqual(5);
    const [k] = markBeats(c.right.marks, 'rr');
    expect(af.truth!.beats[k].kind).toBe('atrial');
    expect(r[k]).toBe(Math.max(...r));
  });
  it('filter film: one heart; diagnostic J in V4–V6 on the baseline; monitor J in V4–V6 about 1 mm low; zero-phase 0.67 Hz J back on the baseline', () => {
    const [diag, mon, zero] = frames('o10', 1);
    for (const e of [mon, zero]) expect(e.truth!.beats).toEqual(diag.truth!.beats);
    for (const l of ['V4', 'V5', 'V6'] as const) {
      expect(Math.abs(stAt(diag, l)), l).toBeLessThan(0.03);
      expect(stAt(mon, l), l).toBeLessThan(-0.075);
      expect(stAt(mon, l), l).toBeGreaterThan(-0.125);
      expect(Math.abs(stAt(zero, l)), l).toBeLessThan(0.03);
    }
  });
});
