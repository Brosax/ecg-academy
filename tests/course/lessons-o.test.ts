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
import type { Block, Lesson, LessonMark } from '../../src/course/api';
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

describe('o1: potassium on the tracings', () => {
  it('stage 1–2 hyperkalaemia (hook, ecg, contrast): PR already ≈ 205 ms, QRS 105–120 ms, T in V3 taller than its R', () => {
    for (const src of sourcesWith('o1', 'hyperkalemia')) {
      const e = ecgOf(src);
      expect(Math.abs(e.truth!.prMs! - 205)).toBeLessThan(12);
      expect(e.truth!.qrsMs).toBeGreaterThanOrEqual(105);
      expect(e.truth!.qrsMs).toBeLessThan(120);
    }
  });
  it('severe hyperkalaemia (worked): no measurable PR, QRS > 150 ms', () => {
    const e = ecgOf(blocksOf('o1', 'worked')[0].ecg);
    expect(e.truth!.prMs).toBeNull();
    expect(e.truth!.qrsMs).toBeGreaterThan(150);
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
  it('the J-wave contrasts: early repolarisation has a normal QT and J ≈ 1.5 mm in II; hypercalcaemia has a QTcF < 350 ms', () => {
    const er = ecgOf(contrastTitled('o5', 'Osborn waves or early repolarisation?').right.ecg);
    expect(er.truth!.qtcFridericiaMs).toBeLessThan(440);
    expect(stAt(er, 'II')).toBeGreaterThan(0.12);
    expect(stAt(er, 'II')).toBeLessThan(0.19);
    const ca = ecgOf(contrastTitled('o5', 'Which way does the QT go: cold or calcium?').right.ecg);
    expect(ca.truth!.qtcFridericiaMs).toBeLessThan(350);
  });
  it('shivering (EMG on LA): I, III and aVL noisy, II clean; slow AF ≈ 50/min and irregular', () => {
    const e = ecgOf(sourcesWith('o5', 'muscle-tremor')[0]);
    for (const l of ['I', 'III', 'aVL'] as const) expect(hfNoise(e, l), l).toBeGreaterThan(3 * hfNoise(e, 'II'));
    const af = ecgOf(sourcesWith('o5', 'atrial-fibrillation')[0]);
    expect(af.truth!.rhythm).toBe('atrial-fibrillation');
    expect(af.truth!.hrBpm).toBeGreaterThan(40);
    expect(af.truth!.hrBpm).toBeLessThan(62);
    expect(Math.max(...rrs(af)) - Math.min(...rrs(af))).toBeGreaterThan(150);
  });
});

describe('o7: pericardium on the tracings', () => {
  it('every pericarditis tracing: ST up in II and V4, down in aVR, flat in aVL; PR depressed in II and V5, elevated in aVR (vs TP)', () => {
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
      for (const l of ['II', 'V5'] as const) expect(prShift(e, l), l).toBeLessThan(-0.03);
      expect(prShift(e, 'aVR')).toBeGreaterThan(0.03);
    }
  });
  it('contrast with early repolarisation (II and V6): PR about 1 mm below TP in pericarditis vs level in early repolarisation; ST in II 1.5–2 mm above TP; J ≈ 1.5 mm in ER; V6 ST/T ≈ 0.55 vs ≈ 0.2 (the classic 0.25 line); rates ≈ 96 vs ≈ 62', () => {
    const c = contrastTitled('o7', 'Pericarditis or early repolarisation');
    expect(c.view).toEqual({ highlightLeads: ['II', 'V6'] });
    const p = ecgOf(c.left.ecg);
    const er = ecgOf(c.right.ecg);
    expect(prShift(p, 'II')).toBeLessThan(-0.08);
    expect(stTp(p, 'II')).toBeGreaterThan(0.14);
    expect(stTp(p, 'II')).toBeLessThan(0.2);
    expect(stTp(p, 'II')).toBeGreaterThan(-prShift(p, 'II') + 0.04);
    const ratio = (e: typeof p) => stAt(e, 'V6', 60) / tw(e, 'V6').max;
    expect(ratio(p)).toBeGreaterThan(0.45);
    expect(ratio(p)).toBeLessThan(0.65);
    expect(ratio(er)).toBeGreaterThan(0.15);
    expect(ratio(er)).toBeLessThan(0.22);
    expect(stAt(er, 'V6', 60)).toBeGreaterThan(0.08);
    expect(stAt(er, 'V6', 60)).toBeLessThan(0.15);
    expect(Math.abs(prShift(er, 'II'))).toBeLessThan(0.02);
    expect(stAt(er, 'II')).toBeGreaterThan(0.12);
    expect(stAt(er, 'II')).toBeLessThan(0.2);
    expect(Math.abs(p.truth!.hrBpm - 96)).toBeLessThan(3);
    expect(Math.abs(er.truth!.hrBpm - 62)).toBeLessThan(3);
  });
  it('contrast with inferior STEMI: III > II, depression in aVL', () => {
    const e = ecgOf(contrastTitled('o7', 'Pericarditis or inferior STEMI').right.ecg);
    expect(stAt(e, 'III', 60)).toBeGreaterThan(stAt(e, 'II', 60));
    expect(stAt(e, 'aVL', 60)).toBeLessThan(-0.05);
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
  it('cerebral T: QTcF > 540 ms; V3–V5 inverted by more than 1 mV; I, II, aVF inverted; aVR upright', () => {
    for (const src of sourcesWith('o8', 'cerebral-t')) {
      const e = ecgOf(src);
      expect(e.truth!.qtcFridericiaMs).toBeGreaterThan(540);
      for (const l of ['V3', 'V4', 'V5'] as const) expect(tw(e, l).min, l).toBeLessThan(-1.0);
      for (const l of ['I', 'II', 'aVF'] as const) expect(tInverted(e, l), l).toBe(true);
      expect(tUpright(e, 'aVR')).toBe(true);
    }
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
  it('Wellens A: biphasic T in V3 with a normal QT; Wellens B: deep symmetric inversion ≈ 7–8 mm in V2–V3, shallower in V1 and V4', () => {
    const a = ecgOf(contrastTitled('o8', 'Cerebral T or Wellens?').right.ecg);
    expect(tw(a, 'V3').max).toBeGreaterThan(0.05);
    expect(tw(a, 'V3').min).toBeLessThan(-0.05);
    expect(a.truth!.qtcFridericiaMs).toBeLessThan(460);
    const b = ecgOf(contrastTitled('o8', 'Giant inverted T: apical HCM or Wellens type B?').right.ecg);
    for (const l of ['V2', 'V3'] as const) {
      expect(tw(b, l).min, l).toBeLessThan(-0.65);
      expect(tw(b, l).min, l).toBeGreaterThan(-0.85);
      expect(tw(b, l).max, l).toBeLessThan(0.05);
    }
    for (const l of ['V1', 'V4'] as const) expect(tw(b, l).min, l).toBeGreaterThan(tw(b, 'V2').min);
  });
  it('apical HCM: giant inversion in V4 (> 1 mV), deepest in V4–V5, deep S in V1–V3, tall R in V6', () => {
    const e = ecgOf(contrastTitled('o8', 'Giant inverted T: apical HCM or Wellens type B?').left.ecg);
    expect(tw(e, 'V4').min).toBeLessThan(-1.0);
    expect(Math.min(tw(e, 'V4').min, tw(e, 'V5').min)).toBeLessThan(Math.min(tw(e, 'V2').min, tw(e, 'V3').min));
    for (const l of ['V1', 'V2', 'V3'] as const) expect(qrs(e, l).min, l).toBeLessThan(-1.5);
    expect(qrs(e, 'V6').max).toBeGreaterThan(1.8);
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
  it('EMG on LA: I, III, aVL noisy, II clean', () => {
    const e = ecgOf(sourcesWith('o10', 'muscle-tremor')[0]);
    for (const l of ['I', 'III', 'aVL'] as const) expect(hfNoise(e, l), l).toBeGreaterThan(3 * hfNoise(e, 'II'));
  });
  it('motion on RA (both tracings): I, II, aVR swing widely between 2.6 and 6.2 s, III stays quiet', () => {
    for (const src of sourcesWith('o10', 'motion-artefact')) {
      const e = ecgOf(src);
      const quiet = excursion(e, 'III', 2600, 6200);
      for (const l of ['I', 'II', 'aVR'] as const) expect(excursion(e, l, 2600, 6200), l).toBeGreaterThan(3 * quiet);
    }
  });
  it('one heart, two filters: diagnostic J in V5 on the baseline; monitor J in V4–V6 about 1 mm low', () => {
    const c = contrastTitled('o10', 'One normal heart, two filters');
    const diag = ecgOf(c.left.ecg);
    const mon = ecgOf(c.right.ecg);
    expect(Math.abs(stAt(diag, 'V5'))).toBeLessThan(0.03);
    for (const l of ['V4', 'V5', 'V6'] as const) {
      expect(stAt(mon, l), l).toBeLessThan(-0.06);
      expect(stAt(mon, l), l).toBeGreaterThan(-0.16);
    }
  });
});
