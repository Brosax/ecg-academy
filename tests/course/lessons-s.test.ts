/**
 * Stage S lessons (s1–s7, docs/PLAN.md §3): every lesson validates against the live catalogues with no errors and no
 * warnings, follows the lesson anatomy (attempt-first hook, worked example before practice, checks/drill, summary),
 * every live-block dial is realised by the engine, every family check generates, and every synthetic ECG the lessons
 * show can be generated.
 */
import { describe, expect, it } from 'vitest';
import type { Block, Lesson, LessonMark } from '../../src/course/api';
import { liveValidateDeps } from '../../src/course/deps';
import { REGISTERED } from '../../src/course/lessons/index';
import { realisedDials, startDials, sweepValues } from '../../src/course/live';
import { baselineBefore, leadWindows, MIN_WAVE_MV, qrsWaves, resolveMarks, type ResolveOptions } from '../../src/course/marks';
import { formatIssues, validateLesson } from '../../src/course/validate';
import type { BeatMarks, Ecg } from '../../src/core/ecg';
import type { FindingId } from '../../src/core/findings';
import type { L10n } from '../../src/core/l10n';
import type { StdLead } from '../../src/core/leads';
import type { EcgSource, Item } from '../../src/practice/api';
import { generateItem } from '../../src/practice';
import { getCase } from '../../src/real/library';
import { generate, scenarios, type SynthRequest } from '../../src/synth';

const IDS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'] as const;

const lessons: readonly Lesson[] = IDS.flatMap((id) => {
  const m = REGISTERED.find((x) => x.fileId === id);
  return m?.lesson ? [m.lesson] : [];
});

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

/** Live blocks whose dials the engine does not realise for their scenario (the player would hide the slider). */
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

describe('stage S lessons', () => {
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
        expect(lesson.stage).toBe('S');
        expect(kinds[0]).toBe('hook');
        expect(kinds[kinds.length - 1]).toBe('summary');
        const firstWorked = kinds.indexOf('worked');
        const firstPractice = kinds.findIndex((k) => k === 'check' || k === 'drill');
        expect(firstWorked).toBeGreaterThanOrEqual(0);
        expect(firstPractice).toBeGreaterThan(firstWorked);
        for (const k of ['criteria', 'contrast', 'drill', 'real', 'pitfalls'] as const) expect(kinds, `${lesson.id} has a ${k} block`).toContain(k);
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

describe('stage S text', () => {
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
});

// ── what the text says is on the tracing ──────────────────────────────────────────────────────────────────────────

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
/** the request a playing live block generates with its played dial at `v` (its other dials at their start values) */
function playedReq(id: string, i: number, v: number): SynthRequest {
  const b = blocksOf(id, 'live')[i];
  if (!b.play) throw new Error(`${id}: live block ${i} does not play`);
  const sc = scenarios().find((s) => s.id === b.scenario);
  if (!sc) throw new Error(`unknown scenario ${b.scenario}`);
  const dials = { ...startDials(sc, b.variant, b.dials.map((d) => d.id), b.play), [b.play.dial]: v };
  return { scenario: b.scenario, ...(b.variant ? { variant: b.variant } : {}), seed: b.seed, dials };
}
const played = (id: string, i: number, v: number): Ecg => ecgOf(playedReq(id, i, v));

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
const pw = (ecg: Ecg, lead: StdLead, b = midBeat(ecg)) => span(ecg, lead, b.pOn ?? b.qrsOn - 150, b.pOff ?? b.qrsOn - 60, b);
/** the T wave (J + 40 ms → T end): its largest excursion either side of the baseline */
const tw = (ecg: Ecg, lead: StdLead, b = midBeat(ecg)) => span(ecg, lead, b.j + 40, b.tOff, b);
const tInverted = (ecg: Ecg, lead: StdLead) => tw(ecg, lead).min < -0.1 && -tw(ecg, lead).min > tw(ecg, lead).max;
const tUpright = (ecg: Ecg, lead: StdLead) => tw(ecg, lead).max > 0.1 && tw(ecg, lead).max > -tw(ecg, lead).min;
/** how long (ms) an upright T stays above a fraction of its height; at 0.2 it measures the T near its base */
function tWidthMs(ecg: Ecg, lead: StdLead, frac: number, b = midBeat(ecg)): number {
  let peakAt = 40;
  for (let d = 40; d <= b.tOff - b.j; d++) if (stAt(ecg, lead, d, b) > stAt(ecg, lead, peakAt, b)) peakAt = d;
  const h = frac * stAt(ecg, lead, peakAt, b);
  let lo = peakAt;
  while (lo > 0 && stAt(ecg, lead, lo - 1, b) > h) lo--;
  let hi = peakAt;
  while (stAt(ecg, lead, hi + 1, b) > h) hi++;
  return hi - lo;
}
/** deviation from the PR baseline at J + plusMs (mV) */
function stAt(ecg: Ecg, lead: StdLead, plusMs = 0, b = midBeat(ecg)): number {
  const a = ecg.signal.leads[lead];
  const fs = ecg.signal.fs;
  const x = ((b.j + plusMs) * fs) / 1000;
  const i = Math.floor(x);
  return a[i] * (1 - (x - i)) + a[i + 1] * (x - i) - baselineBefore(a, fs, b.qrsOn);
}
/** Jp: the peak of the terminal notch in the 24 ms before the J mark (Macfarlane 2015), above the PR baseline. */
function jPeak(ecg: Ecg, lead: StdLead, b = midBeat(ecg)): number {
  const a = ecg.signal.leads[lead];
  const fs = ecg.signal.fs;
  let peak = -Infinity;
  for (let i = Math.floor(((b.j - 24) * fs) / 1000); i <= Math.ceil((b.j * fs) / 1000); i++) peak = Math.max(peak, a[i]);
  return peak - baselineBefore(a, fs, b.qrsOn);
}
/** the end-QRS notch: the lowest point where the R downstroke ends (J − 32…J − 20 ms) and the highest point after it */
function notch(ecg: Ecg, lead: StdLead, b = midBeat(ecg)): { readonly dip: number; readonly peak: number } {
  let dipAt = -32;
  for (let d = -31; d <= -20; d++) if (stAt(ecg, lead, d, b) < stAt(ecg, lead, dipAt, b)) dipAt = d;
  let peak = -Infinity;
  for (let d = dipAt; d <= 0; d++) peak = Math.max(peak, stAt(ecg, lead, d, b));
  return { dip: stAt(ecg, lead, dipAt, b), peak };
}
const mostEquiphasic = (ecg: Ecg): StdLead =>
  LIMB.reduce((best, l) => (Math.abs(qrs(ecg, l).net) / qrs(ecg, l).p2p < Math.abs(qrs(ecg, best).net) / qrs(ecg, best).p2p ? l : best));
const transition = (ecg: Ecg): StdLead | undefined => CHEST.find((l) => qrs(ecg, l).max >= -qrs(ecg, l).min);
const rrs = (ecg: Ecg): number[] => ecg.truth!.beats.slice(1).map((b, i) => b.qrsOn - ecg.truth!.beats[i].qrsOn);
const hasRPrime = (ecg: Ecg, lead: StdLead): boolean => {
  const b = midBeat(ecg);
  return qrsWaves(ecg.signal.leads[lead], ecg.signal.fs, b.qrsOn, b.qrsOff).some((w) => w.role === 'r' && w.label.includes('′'));
};
const meanRr = (e: Ecg) => rrs(e).reduce((s, x) => s + x, 0) / rrs(e).length;
/** the milliseconds a mark prints on screen, e.g. `QT 520 ms` */
function markedMs(ecg: Ecg, marks: readonly LessonMark[] | undefined, name: string, o: ResolveOptions = {}): number {
  const text = resolveMarks(ecg, marks, o)
    .map((m) => ('label' in m && m.label ? (typeof m.label === 'string' ? m.label : m.label.en) : ''))
    .join(' ');
  return Number(new RegExp(`${name} (\\d+) ms`).exec(text)?.[1]);
}
/** the beat an auto mark names */
function markBeat(marks: readonly LessonMark[] | undefined, auto: string, lead?: StdLead): number {
  const m = (marks ?? []).find((x) => 'auto' in x && x.auto === auto && (lead === undefined || x.lead === lead));
  if (!m || !('auto' in m) || m.beat === undefined) throw new Error(`no ${auto}${lead ? ` ${lead}` : ''} mark with a beat`);
  return m.beat;
}

describe('s1: the reading order on the tracings', () => {
  it('hook (pre-excitation): PR about 115 ms, QRS about 125 ms, R ≥ S in V1, T inverted in II, III, aVF and V3–V6', () => {
    const e = ecgOf(blocksOf('s1', 'hook')[0].ecg);
    const t = e.truth!;
    expect(Math.abs(t.prMs! - 115)).toBeLessThanOrEqual(5);
    expect(t.prMs!).toBeLessThan(120);
    expect(Math.abs(t.qrsMs - 125)).toBeLessThanOrEqual(5);
    expect(t.findings).toContain('wpw');
    expect(qrs(e, 'V1').max).toBeGreaterThanOrEqual(-qrs(e, 'V1').min);
    for (const l of ['II', 'III', 'aVF', 'V3', 'V4', 'V5', 'V6'] as const) expect(tInverted(e, l), l).toBe(true);
  });
  it('worked: 75/min, PR 160, QRS about 90, QT about 380, QTc (Fridericia) about 410, axis about +60 with aVL equiphasic, transition at V3', () => {
    const e = ecgOf(blocksOf('s1', 'worked')[0].ecg);
    const t = e.truth!;
    expect(Math.abs(t.hrBpm - 75)).toBeLessThan(2);
    expect(Math.abs(t.prMs! - 160)).toBeLessThan(5);
    expect(Math.abs(t.qrsMs - 90)).toBeLessThan(8);
    expect(Math.abs(t.qtMs - 380)).toBeLessThan(15);
    expect(Math.abs(t.qtcFridericiaMs - 410)).toBeLessThan(10);
    expect(Math.abs(t.axisDeg.qrs - 60)).toBeLessThan(8);
    expect(mostEquiphasic(e)).toBe('aVL');
    expect(transition(e)).toBe('V3');
  });
  it('contrast B (hyperkalaemia): PR about 205, QRS about 115, tall peaked T in V3–V5 (over twice the T in A, narrower near its base), taller than the R in V3–V4', () => {
    const c = blocksOf('s1', 'contrast')[0];
    const e = ecgOf(c.right.ecg);
    const t = e.truth!;
    expect(Math.abs(t.prMs! - 205)).toBeLessThanOrEqual(5);
    expect(Math.abs(t.qrsMs - 115)).toBeLessThanOrEqual(5);
    expect(t.qrsMs).toBeGreaterThanOrEqual(110);
    expect(t.qrsMs).toBeLessThan(120);
    for (const l of ['V3', 'V4'] as const) expect(tw(e, l).max, l).toBeGreaterThan(qrs(e, l).max);
    expect(tw(e, 'V5').max).toBeGreaterThan(0.85 * qrs(e, 'V5').max);
    const a = ecgOf(c.left.ecg);
    for (const l of ['V3', 'V4', 'V5'] as const) {
      expect(tw(e, l).max, l).toBeGreaterThan(2 * tw(a, l).max);
      expect(tWidthMs(e, l, 0.2), l).toBeLessThan(0.7 * tWidthMs(a, l, 0.2));
    }
  });
  it('walk-through film: every frame is the hook tracing, about 72/min in sinus rhythm (PR, QRS and T are asserted on the hook)', () => {
    const hook = blocksOf('s1', 'hook')[0].ecg;
    for (const f of blocksOf('s1', 'film')[0].frames) expect(f.ecg).toEqual(hook);
    const t = ecgOf(hook).truth!;
    expect(Math.abs(t.hrBpm - 72)).toBeLessThan(3);
    expect(t.rhythm).toBe('sinus-rhythm');
  });
  it('recording film: correct cables (I upright, aVR negative); arm cables swapped (I all negative, aVR QRS and T upright); left-arm noise in I, III and aVL with II untouched', () => {
    const [ok, swapped, noisy] = blocksOf('s1', 'film')[1].frames.map((f) => ecgOf(f.ecg));
    for (const part of [pw, qrs, tw]) {
      expect(part(ok, 'I').net).toBeGreaterThan(0.03);
      expect(part(ok, 'aVR').net).toBeLessThan(-0.03);
      expect(part(swapped, 'I').net).toBeLessThan(-0.03);
    }
    expect(qrs(swapped, 'aVR').net).toBeGreaterThan(0.1);
    expect(tw(swapped, 'aVR').net).toBeGreaterThan(0.05);
    const diff = (l: StdLead) => Math.max(...noisy.signal.leads[l].map((x, i) => Math.abs(x - ok.signal.leads[l][i])));
    expect(diff('II')).toBeLessThan(1e-6);
    for (const l of ['I', 'III', 'aVL'] as const) expect(diff(l), l).toBeGreaterThan(0.03);
  });
  it('never-miss film: ST up in V1–V4 with III and aVF down; T taller than R in V3–V4, PR > 200, QRS > 110; marked QT about 520 ms at 60/min with RR about 1 s, so QTc about 520; PR < 120 with pre-excitation; coved ST ≥ 2 mm into a negative T in V1–V2; P about 96/min with one in three conducted at about 32/min', () => {
    const film = blocksOf('s1', 'film')[2];
    const [occlusion, potassium, longQt, preExcited, brugada, avBlock] = film.frames.map((f) => ecgOf(f.ecg));
    const qtMarks = film.frames[2].marks;
    expect(Math.abs(markedMs(longQt, qtMarks, 'QT') - 520)).toBeLessThanOrEqual(5);
    expect(Math.abs(longQt.truth!.qtMs - 520)).toBeLessThanOrEqual(5);
    expect(Math.abs(longQt.truth!.hrBpm - 60)).toBeLessThanOrEqual(1);
    expect(Math.abs(meanRr(longQt) - 1000)).toBeLessThanOrEqual(5);
    expect(Math.abs(markedMs(longQt, qtMarks, 'RR') - 1000)).toBeLessThanOrEqual(10);
    for (const l of ['V1', 'V2', 'V3', 'V4'] as const) expect(stAt(occlusion, l), l).toBeGreaterThanOrEqual(0.1);
    for (const l of ['III', 'aVF'] as const) expect(stAt(occlusion, l), l).toBeLessThan(-0.05);
    for (const l of ['V3', 'V4'] as const) expect(tw(potassium, l).max, l).toBeGreaterThan(qrs(potassium, l).max);
    expect(potassium.truth!.prMs!).toBeGreaterThan(200);
    expect(potassium.truth!.qrsMs).toBeGreaterThan(110);
    for (const q of [longQt.truth!.qtcBazettMs, longQt.truth!.qtcFridericiaMs]) expect(Math.abs(q - 520)).toBeLessThanOrEqual(5);
    expect(preExcited.truth!.prMs!).toBeLessThan(120);
    expect(preExcited.truth!.findings).toContain('wpw');
    for (const l of ['V1', 'V2'] as const) {
      expect(stAt(brugada, l), l).toBeGreaterThanOrEqual(0.2);
      expect(stAt(brugada, l, 60), l).toBeLessThan(stAt(brugada, l));
      expect(tw(brugada, l).min, l).toBeLessThan(-0.1);
    }
    const t = avBlock.truth!;
    expect(Math.abs(t.atrialRateBpm! - 96)).toBeLessThan(3);
    expect(Math.abs(t.hrBpm - 32)).toBeLessThan(2);
    expect(Math.abs(t.atrial.length / t.atrial.filter((a) => a.conductedTo !== null).length - 3)).toBeLessThan(0.4);
  });
});

describe('s2: rate on the tracings', () => {
  it('hook: 50/min, RR about six large squares (1200 ms)', () => {
    const e = ecgOf(blocksOf('s2', 'hook')[0].ecg);
    expect(Math.abs(e.truth!.hrBpm - 50)).toBeLessThan(2);
    for (const rr of rrs(e)) expect(Math.abs(rr - 1200)).toBeLessThan(60);
  });
  it('worked: RR about four large squares, 12–13 QRS complexes in 10 s', () => {
    const e = ecgOf(blocksOf('s2', 'worked')[0].ecg);
    for (const rr of rrs(e)) expect(Math.abs(rr - 800)).toBeLessThan(40);
    expect(e.truth!.beats.length).toBeGreaterThanOrEqual(12);
    expect(e.truth!.beats.length).toBeLessThanOrEqual(13);
  });
  it('contrast: A regular at about 115/min; B irregularly irregular', () => {
    const c = blocksOf('s2', 'contrast')[0];
    const a = ecgOf(c.left.ecg);
    const b = ecgOf(c.right.ecg);
    expect(Math.abs(a.truth!.hrBpm - 115)).toBeLessThan(3);
    expect(Math.max(...rrs(a)) - Math.min(...rrs(a))).toBeLessThan(40);
    expect(b.truth!.rhythm).toBe('atrial-fibrillation');
    expect(Math.max(...rrs(b)) - Math.min(...rrs(b))).toBeGreaterThan(300);
  });
  const swept = (i: number, rate: number) => {
    const b = blocksOf('s2', 'live')[i];
    return ecgOf({ scenario: b.scenario, seed: b.seed, dials: { rate } });
  };
  it('clock sweep notes: 5 large squares at 60–62, 4 at 73–77, 3 at 98–100 (one large square = 200 ms)', () => {
    for (const [rate, squares] of [[60, 5], [62, 5], [73, 4], [77, 4], [98, 3], [100, 3]] as const) {
      expect(Math.abs(meanRr(swept(0, rate)) / 200 - squares), `${rate}/min`).toBeLessThan(0.2);
    }
  });
  it('fast sweep notes: 14–15 small squares at 102–106, about 10 at 145–150 (one small square = 40 ms)', () => {
    for (const rate of [102, 106]) {
      const n = meanRr(swept(1, rate)) / 40;
      expect(n, `${rate}/min`).toBeGreaterThan(13.8);
      expect(n, `${rate}/min`).toBeLessThan(15.2);
    }
    for (const rate of [145, 150]) expect(Math.abs(meanRr(swept(1, rate)) / 40 - 10), `${rate}/min`).toBeLessThan(0.6);
  });
  it('film: regular at 115/min; sinus arrhythmia varies with breathing; AF irregularly irregular', () => {
    const [reg, sa, af] = blocksOf('s2', 'film')[0].frames.map((f) => ecgOf(f.ecg));
    expect(Math.abs(reg.truth!.hrBpm - 115)).toBeLessThan(3);
    expect(Math.max(...rrs(reg)) - Math.min(...rrs(reg))).toBeLessThan(40);
    expect(Math.max(...rrs(sa)) - Math.min(...rrs(sa))).toBeGreaterThan(120);
    expect(af.truth!.rhythm).toBe('atrial-fibrillation');
  });
  it('film: the RR marked on the breathing and AF strips is their shortest, and its rate misses the 10-s count × 6 by more than 10 %', () => {
    const film = blocksOf('s2', 'film')[0];
    for (const k of [1, 2]) {
      const e = ecgOf(film.frames[k].ecg);
      const rr = rrs(e)[markBeat(film.frames[k].marks, 'rr')];
      expect(rr, `frame ${k}`).toBe(Math.min(...rrs(e)));
      const counted = 6 * e.truth!.beats.length;
      expect(Math.abs(60000 / rr - counted) / counted, `frame ${k}`).toBeGreaterThan(0.1);
    }
  });
});

describe('s3: sinus rhythm on the tracings', () => {
  it('hook: same PR every beat, PP from about 730 to about 990 ms', () => {
    const e = ecgOf(blocksOf('s3', 'hook')[0].ecg);
    const pp = rrs(e);
    expect(Math.min(...pp)).toBeGreaterThan(700);
    expect(Math.min(...pp)).toBeLessThan(760);
    expect(Math.max(...pp)).toBeGreaterThan(960);
    expect(Math.max(...pp)).toBeLessThan(1020);
    const prs = e.truth!.beats.map((b) => b.qrsOn - b.pOn!);
    expect(Math.max(...prs) - Math.min(...prs)).toBeLessThan(5);
  });
  it('worked: PR about 160 ms; PP varies by more than 120 ms', () => {
    const e = ecgOf(blocksOf('s3', 'worked')[0].ecg);
    expect(Math.abs(e.truth!.prMs! - 160)).toBeLessThan(10);
    expect(Math.max(...rrs(e)) - Math.min(...rrs(e))).toBeGreaterThan(120);
  });
  it('140/min film frame: the marked P starts before the marked T has ended', () => {
    const f = blocksOf('s3', 'film')[0].frames[2];
    const e = ecgOf(f.ecg);
    const beats = e.truth!.beats;
    const beatOf = (k: string): number => {
      const m = (f.marks ?? []).find((x) => 'auto' in x && x.auto === k);
      if (!m || !('auto' in m) || m.beat === undefined) throw new Error(`no ${k} mark with a beat`);
      return m.beat;
    };
    expect(beatOf('p')).toBe(beatOf('t') + 1);
    expect(beats[beatOf('p')].pOn!).toBeLessThan(beats[beatOf('t')].tOff);
  });
  it('rate film: 50, 75 and 140/min, each with a P upright in II and negative in aVR; the same P at 50 and 75', () => {
    const frames = blocksOf('s3', 'film')[0].frames.map((f) => ecgOf(f.ecg));
    frames.forEach((e, k) => {
      expect(Math.abs(e.truth!.hrBpm - [50, 75, 140][k]), `frame ${k}`).toBeLessThan(3);
      expect(e.truth!.rhythm, `frame ${k}`).toMatch(/^sinus/);
      expect(pw(e, 'II').max, `frame ${k}`).toBeGreaterThan(0.05);
      expect(pw(e, 'aVR').net, `frame ${k}`).toBeLessThan(-0.03);
    });
    expect(Math.abs(pw(frames[0], 'II').max - pw(frames[1], 'II').max)).toBeLessThan(0.01);
  });
  it('P-axis sweep notes and caption: III flat or slightly negative with aVL upright at 20–30 and a small upright aVF; III and aVL small at 35–55; aVL flat or slightly negative with III upright at 60–70; I, II, aVF upright and aVR negative at every step (no opposite wave of 0.5 mm), changing only in size', () => {
    const sc = scenarios().find((s) => s.id === 'normal')!;
    for (const v of sweepValues('pAxis', sc.dials.pAxis!, 20, 70)) {
      const e = played('s3', 0, v);
      for (const l of ['I', 'II', 'aVF'] as const) {
        expect(pw(e, l).max, `${v}° ${l}`).toBeGreaterThan(0.03);
        expect(pw(e, l).min, `${v}° ${l}`).toBeGreaterThan(-MIN_WAVE_MV);
      }
      for (const l of ['II', 'aVF'] as const) expect(pw(e, l).max, `${v}° ${l}`).toBeGreaterThan(MIN_WAVE_MV);
      expect(pw(e, 'aVR').min, `${v}° aVR`).toBeLessThan(-MIN_WAVE_MV);
      expect(pw(e, 'aVR').max, `${v}° aVR`).toBeLessThan(MIN_WAVE_MV);
      if (v <= 30) expect(pw(e, 'aVF').max, `${v}° aVF small`).toBeLessThan(0.1);
    }
    const [lo, hi] = [played('s3', 0, 20), played('s3', 0, 70)];
    expect(pw(hi, 'I').net).toBeLessThan(pw(lo, 'I').net);
    for (const l of ['II', 'aVF'] as const) expect(pw(hi, l).net, l).toBeGreaterThan(pw(lo, l).net);
    for (const v of [20, 30, 35, 55, 60, 70]) {
      const e = played('s3', 0, v);
      expect(Math.abs(e.truth!.axisDeg.p! - v), `${v}°`).toBeLessThan(3);
      for (const l of ['I', 'II'] as const) expect(pw(e, l).net, `${v}° ${l}`).toBeGreaterThan(0.03);
      expect(pw(e, 'aVR').net, `${v}° aVR`).toBeLessThan(-0.04);
      if (v >= 35) expect(pw(e, 'aVF').net, `${v}° aVF`).toBeGreaterThan(0.03);
      const [iii, avl, ii] = [pw(e, 'III').net, pw(e, 'aVL').net, pw(e, 'II').net];
      if (v <= 30) {
        expect(iii, `${v}° III`).toBeLessThan(0.005);
        expect(iii, `${v}° III`).toBeGreaterThan(-0.04);
        expect(avl, `${v}° aVL`).toBeGreaterThan(0.03);
        expect(pw(e, 'aVL').min, `${v}° aVL`).toBeGreaterThan(-MIN_WAVE_MV);
      } else if (v <= 55) {
        for (const x of [iii, avl]) expect(Math.abs(x), `${v}° III/aVL`).toBeLessThan(0.6 * ii);
      } else {
        expect(avl, `${v}° aVL`).toBeLessThan(0.005);
        expect(avl, `${v}° aVL`).toBeGreaterThan(-0.04);
        expect(iii, `${v}° III`).toBeGreaterThan(0.04);
      }
    }
  });
  it('variability sweep notes: PP spread > 120 ms at 0.10–0.139 and 230–290 ms at 0.14–0.18, with a PR of 160 ms and the same P height in II on every beat', () => {
    for (const v of [0.1, 0.139, 0.14, 0.18]) {
      const e = played('s3', 1, v);
      const beats = e.truth!.beats;
      const pp = beats.slice(1).map((b, i) => b.pOn! - beats[i].pOn!);
      const spread = Math.max(...pp) - Math.min(...pp);
      if (v < 0.14) expect(spread, `${v}`).toBeGreaterThan(120);
      else {
        expect(spread, `${v}`).toBeGreaterThan(225);
        expect(spread, `${v}`).toBeLessThan(295);
      }
      for (const b of beats) expect(Math.abs(b.qrsOn - b.pOn! - 160), `${v}`).toBeLessThan(5);
      const heights = beats.map((b) => pw(e, 'II', b).max);
      expect(Math.max(...heights) - Math.min(...heights), `${v} P height`).toBeLessThan(0.005);
    }
  });
  it('long-PR check: sinus P (upright I, II, aVF; negative aVR), PR about 220 ms, rate under 60', () => {
    const e = ecgOf(inlineItem('s3', 's3:long-pr-still-sinus').ecg);
    expect(Math.abs(e.truth!.prMs! - 220)).toBeLessThan(10);
    expect(e.truth!.hrBpm).toBeLessThan(60);
    for (const l of ['I', 'II', 'aVF'] as const) expect(pw(e, l).max, l).toBeGreaterThan(0.03);
    expect(pw(e, 'aVR').min).toBeLessThan(-0.03);
  });
});

describe('s4: intervals on the tracings', () => {
  it('hook (130/min): QT about 325 ms, Bazett about 478 ms, Fridericia about 420 ms', () => {
    const t = ecgOf(blocksOf('s4', 'hook')[0].ecg).truth!;
    expect(Math.abs(t.hrBpm - 130)).toBeLessThan(2);
    expect(Math.abs(t.qtMs - 325)).toBeLessThan(10);
    expect(Math.abs(t.qtcBazettMs - 478)).toBeLessThan(8);
    expect(Math.abs(t.qtcFridericiaMs - 420)).toBeLessThan(5);
  });
  it('contrast A (45/min): QT about 462 ms, Bazett about 400 ms, Fridericia about 420 ms', () => {
    const t = ecgOf(blocksOf('s4', 'contrast')[0].left.ecg).truth!;
    expect(Math.abs(t.qtMs - 462)).toBeLessThan(10);
    expect(Math.abs(t.qtcBazettMs - 400)).toBeLessThan(8);
    expect(Math.abs(t.qtcFridericiaMs - 420)).toBeLessThan(5);
  });
  it('worked: PR about 180 ms and QRS about 95 ms; QT about 420 ms at 60/min', () => {
    const [w1, w2] = blocksOf('s4', 'worked');
    const a = ecgOf(w1.ecg).truth!;
    expect(Math.abs(a.prMs! - 180)).toBeLessThan(5);
    expect(Math.abs(a.qrsMs - 95)).toBeLessThan(6);
    const b = ecgOf(w2.ecg).truth!;
    expect(Math.abs(b.hrBpm - 60)).toBeLessThan(1.5);
    expect(Math.abs(b.qtMs - 420)).toBeLessThan(10);
  });
  it('PR sweep notes: about 3 small squares at 120–125 ms and about 5 at 195–200 ms (one small square = 40 ms)', () => {
    for (const [v, squares] of [[120, 3], [125, 3], [195, 5], [200, 5]] as const) {
      const pr = played('s4', 0, v).truth!.prMs!;
      expect(Math.abs(pr - v), `${v} ms`).toBeLessThan(3);
      expect(Math.abs(pr / 40 - squares), `${v} ms`).toBeLessThan(0.2);
    }
  });
  it('rate sweep notes, on the QT and RR the strip marks and the QTc read-out: QT about 405 ms at RR ≈ 1 s at 60–62/min; the QT shortens while the read-out holds 405 at 63–99; at 100/min QT 342 and RR 603 ms, Bazett 342 ÷ √0.603 ≈ 440 and Fridericia 342 ÷ ∛0.603 ≈ 405', () => {
    const b = blocksOf('s4', 'live')[1];
    const shown = (v: number) => {
      const req = playedReq('s4', 1, v);
      const text = resolveMarks(ecgOf(req), b.marks, { layout: b.view?.layout, lead: b.view?.lead })
        .map((m) => ('label' in m && m.label ? (typeof m.label === 'string' ? m.label : m.label.en) : ''))
        .join(' ');
      const ms = (name: string) => Number(new RegExp(`${name} (\\d+) ms`).exec(text)?.[1]);
      return { qt: ms('QT'), rr: ms('RR'), readout: generate(req).applied.qtc, truth: ecgOf(req).truth! };
    };
    for (const v of [60, 62]) {
      const s = shown(v);
      expect(Math.abs(s.qt - 405), `${v}/min QT`).toBeLessThanOrEqual(5);
      expect(Math.abs(s.rr - 1000), `${v}/min RR`).toBeLessThan(30);
      expect(s.readout, `${v}/min`).toBe(405);
      for (const x of [s.truth.qtcBazettMs, s.truth.qtcFridericiaMs]) expect(Math.abs(x - 405), `${v}/min`).toBeLessThan(6);
    }
    expect(shown(99).qt).toBeLessThan(shown(63).qt - 20);
    for (const v of [63, 89, 99]) {
      expect(shown(v).readout, `${v}/min`).toBe(405);
      expect(Math.abs(shown(v).truth.qtcFridericiaMs - 405), `${v}/min`).toBeLessThan(6);
    }
    const end = shown(100);
    expect(end.qt).toBe(342);
    expect(end.rr).toBe(603);
    expect(Math.round(342 / Math.sqrt(0.603))).toBe(440);
    expect(Math.round(342 / Math.cbrt(0.603))).toBe(405);
    expect(end.readout).toBe(405);
    expect(Math.abs(end.truth.qtcBazettMs - 440)).toBeLessThan(5);
    expect(Math.abs(end.truth.qtcFridericiaMs - 405)).toBeLessThan(5);
  });
  it('QTc-calculator caption: RR about 460 ms in the hook and about 1330 ms in contrast A', () => {
    const meanRr = (e: Ecg) => rrs(e).reduce((s, x) => s + x, 0) / rrs(e).length;
    expect(Math.abs(meanRr(ecgOf(blocksOf('s4', 'hook')[0].ecg)) - 460)).toBeLessThan(15);
    expect(Math.abs(meanRr(ecgOf(blocksOf('s4', 'contrast')[0].left.ecg)) - 1330)).toBeLessThan(30);
  });
});

describe('s5: axis on the tracings', () => {
  it('worked (+30°): III is the most equiphasic limb lead, I and II positive', () => {
    const e = ecgOf(blocksOf('s5', 'worked')[0].ecg);
    expect(mostEquiphasic(e)).toBe('III');
    for (const l of ['I', 'II'] as const) expect(qrs(e, l).net, l).toBeGreaterThan(0.1);
  });
  it('R-wave progression film, normal frame: rS in V1, the R overtakes the S at V3, qR in V6, small or no S in V5–V6', () => {
    const e = ecgOf(blocksOf('s5', 'film')[0].frames[0].ecg);
    expect(transition(e)).toBe('V3');
    const b = midBeat(e);
    const waves = (l: StdLead) => qrsWaves(e.signal.leads[l], e.signal.fs, b.qrsOn, b.qrsOff);
    const roles = (l: StdLead) => waves(l).map((w) => w.role).join('');
    expect(roles('V1')).toBe('rs');
    expect(roles('V6').startsWith('qr')).toBe(true);
    for (const l of ['V5', 'V6'] as const) {
      const r = Math.max(...waves(l).filter((w) => w.role === 'r').map((w) => w.mv));
      for (const s of waves(l).filter((w) => w.role === 's')) {
        expect(-s.mv, `${l} S`).toBeLessThan(0.1);
        expect(-s.mv, `${l} S`).toBeLessThan(0.1 * r);
      }
    }
  });
  it('R-wave progression film: poor progression has an R of about 2 mm in V3 (transition at V4); V1–V2 high on the same heart shrinks the r in V2 from about 3.5 to 1 mm, halves the r in V1 and turns the P in V1 negative', () => {
    const [normal, poor, high] = blocksOf('s5', 'film')[0].frames.map((f) => ecgOf(f.ecg));
    expect(qrs(poor, 'V3').max).toBeGreaterThan(0.15);
    expect(qrs(poor, 'V3').max).toBeLessThanOrEqual(0.25);
    expect(transition(poor)).toBe('V4');
    expect(Math.abs(qrs(normal, 'V2').max - 0.35)).toBeLessThan(0.05);
    expect(Math.abs(qrs(high, 'V2').max - 0.1)).toBeLessThan(0.03);
    const v1 = qrs(high, 'V1').max / qrs(normal, 'V1').max;
    expect(v1).toBeGreaterThan(0.4);
    expect(v1).toBeLessThan(0.6);
    expect(pw(normal, 'V1').max).toBeGreaterThan(0.005);
    expect(pw(high, 'V1').max).toBeLessThan(0.003);
    expect(pw(high, 'V1').min).toBeLessThan(-0.02);
    for (const l of [...LIMB, 'V3', 'V4', 'V5', 'V6'] as const) expect(high.signal.leads[l]).toEqual(normal.signal.leads[l]);
  });
  it('axis sweep notes: aVF most equiphasic at 0–20° with its R growing at 15–20°; III at 25–35°; II the tallest at 40–50°; aVL at 55–65°; I under half of aVF at 70–80°; the read-out matches the dial', () => {
    for (let v = 0; v <= 80; v += 5) expect(Math.abs(played('s5', 0, v).truth!.axisDeg.qrs - v), `${v}°`).toBeLessThan(3);
    for (const [v, lead] of [[0, 'aVF'], [10, 'aVF'], [15, 'aVF'], [20, 'aVF'], [25, 'III'], [35, 'III'], [55, 'aVL'], [65, 'aVL']] as const) {
      expect(mostEquiphasic(played('s5', 0, v)), `${v}°`).toBe(lead);
    }
    expect(qrs(played('s5', 0, 20), 'aVF').max).toBeGreaterThan(qrs(played('s5', 0, 15), 'aVF').max);
    for (const v of [40, 50]) {
      const e = played('s5', 0, v);
      for (const l of LIMB.filter((x) => x !== 'II')) {
        expect(qrs(e, 'II').net, `${v}° vs ${l}`).toBeGreaterThan(qrs(e, l).net);
        expect(qrs(e, 'II').max, `${v}° vs ${l}`).toBeGreaterThan(qrs(e, l).max);
      }
    }
    for (const v of [70, 80]) {
      const e = played('s5', 0, v);
      expect(qrs(e, 'I').net, `${v}°`).toBeLessThan(0.5 * qrs(e, 'aVF').net);
    }
  });
  it('contrast LAD vs RAD: A I+, aVF−, II− (about −60°); B I−, aVF+ (about +115°); both QRS < 120 ms', () => {
    const c = blocksOf('s5', 'contrast').find((b) => b.title.en === 'Left or right: quadrant first');
    if (!c) throw new Error('no LAD/RAD contrast');
    const a = ecgOf(c.left.ecg);
    const b = ecgOf(c.right.ecg);
    expect(qrs(a, 'I').net).toBeGreaterThan(0.2);
    expect(qrs(a, 'aVF').net).toBeLessThan(-0.2);
    expect(qrs(a, 'II').net).toBeLessThan(-0.2);
    expect(Math.abs(a.truth!.axisDeg.qrs + 60)).toBeLessThan(8);
    expect(qrs(b, 'I').net).toBeLessThan(-0.2);
    expect(qrs(b, 'aVF').net).toBeGreaterThan(0.2);
    expect(Math.abs(b.truth!.axisDeg.qrs - 115)).toBeLessThan(8);
    for (const e of [a, b]) expect(e.truth!.qrsMs).toBeLessThan(120);
    // the fascicular-block patterns the point names: qR in aVL and rS in II/III/aVF (A); rS in I/aVL and qR in III/aVF (B)
    const shape = (e: Ecg, l: StdLead): string => {
      const bt = midBeat(e);
      return qrsWaves(e.signal.leads[l], e.signal.fs, bt.qrsOn, bt.qrsOff).map((w) => w.role).join('');
    };
    expect(shape(a, 'aVL')).toBe('qr');
    for (const l of ['II', 'III', 'aVF'] as const) expect(shape(a, l), l).toBe('rs');
    for (const l of ['I', 'aVL'] as const) expect(shape(b, l), l).toBe('rs');
    for (const l of ['III', 'aVF'] as const) expect(shape(b, l), l).toBe('qr');
  });
});

describe('s6: ST measurement on the tracings', () => {
  it('hook (inferior): about 2 mm ST elevation in II, III, aVF (largest in III, each ≥ 1 mm at J); depression in aVL and I', () => {
    const e = ecgOf(blocksOf('s6', 'hook')[0].ecg);
    for (const l of ['II', 'III', 'aVF'] as const) {
      expect(stAt(e, l), `${l} at J`).toBeGreaterThanOrEqual(0.1);
      expect(stAt(e, l, 60), `${l} at J+60`).toBeGreaterThan(0.15);
      expect(stAt(e, l, 60), `${l} at J+60`).toBeLessThan(0.3);
    }
    expect(stAt(e, 'III', 60)).toBeGreaterThan(Math.max(stAt(e, 'II', 60), stAt(e, 'aVF', 60)));
    expect(stAt(e, 'aVL', 60)).toBeLessThan(-0.1);
    expect(stAt(e, 'I', 60)).toBeLessThan(0);
  });
  /** the millimetres the J+60 read-out (AutoMark st60) prints for a lead */
  const readout = (e: Ecg, lead: StdLead): string => {
    const m = resolveMarks(e, [{ auto: 'st60', lead }]).find((x) => x.kind === 'arrow');
    const label = m && 'label' in m && m.label ? (typeof m.label === 'string' ? m.label : m.label.en) : '';
    return /ST ([+−±]\d+\.\d) mm/.exec(label)?.[1] ?? label;
  };
  it('worked (anterior): V2 about 2.6 mm at J with a read-out of +3.0, V3 about 3.3 mm at J with +3.8, read-outs V4 +2.2 and V1 +1.3; I and aVL < 1 mm; read-outs III −1.3 and aVF −1.0', () => {
    const e = ecgOf(blocksOf('s6', 'worked')[0].ecg);
    expect(Math.abs(stAt(e, 'V2') - 0.26)).toBeLessThanOrEqual(0.015);
    expect(Math.abs(stAt(e, 'V3') - 0.33)).toBeLessThanOrEqual(0.015);
    for (const [l, mm] of [['V2', '+3.0'], ['V3', '+3.8'], ['V4', '+2.2'], ['V1', '+1.3'], ['III', '−1.3'], ['aVF', '−1.0']] as const) expect(readout(e, l), l).toBe(mm);
    for (const l of ['I', 'aVL'] as const) {
      expect(stAt(e, l), l).toBeLessThan(0.1);
      expect(stAt(e, l, 60), l).toBeLessThan(0.1);
    }
  });
  it('live: more injury current raises V3 and lowers III (reciprocity)', () => {
    const b = blocksOf('s6', 'live')[0];
    const at = (st: number) => generate({ scenario: b.scenario, seed: b.seed, dials: { st } }).ecg;
    const lo = at(0.22);
    const hi = at(0.45);
    expect(stAt(hi, 'V3', 60)).toBeGreaterThan(stAt(lo, 'V3', 60) + 0.15);
    expect(stAt(hi, 'III', 60)).toBeLessThan(stAt(lo, 'III', 60) - 0.05);
  });
  it('ST sweep notes (J+60 read-out): V3 about +3 mm and III about −1 mm at 0.22–0.24 mV; V2–V4 rise as III and aVF fall across 0.25–0.42; V3 +5–6 mm and III about −2 mm at 0.43–0.45', () => {
    for (const v of [0.22, 0.24]) {
      const e = played('s6', 0, v);
      expect(Math.abs(stAt(e, 'V3', 60) - 0.3), `${v}`).toBeLessThanOrEqual(0.02);
      expect(Math.abs(stAt(e, 'III', 60) + 0.1), `${v}`).toBeLessThanOrEqual(0.015);
    }
    const [lo, hi] = [played('s6', 0, 0.25), played('s6', 0, 0.42)];
    for (const l of ['V2', 'V3', 'V4'] as const) expect(stAt(hi, l, 60), l).toBeGreaterThan(stAt(lo, l, 60) + 0.05);
    for (const l of ['III', 'aVF'] as const) expect(stAt(hi, l, 60), l).toBeLessThan(stAt(lo, l, 60) - 0.02);
    for (const v of [0.43, 0.45]) {
      const e = played('s6', 0, v);
      expect(stAt(e, 'V3', 60), `${v}`).toBeGreaterThanOrEqual(0.5);
      expect(stAt(e, 'V3', 60), `${v}`).toBeLessThanOrEqual(0.6);
      expect(Math.abs(stAt(e, 'III', 60) + 0.2), `${v}`).toBeLessThanOrEqual(0.015);
    }
  });
  it('thresholds film: injury 1.9–3.3 mm in V2–V4 at J with III and aVF 1–1.2 mm down; the monitor filter drops V4 from about 1.9 to 0.6 mm and V3 from about 3.3 to 2.1 mm; LBBB 2–2.5 mm in V1–V2, under a quarter of the S before it, QRS about 150 ms; hyperacute T with V2–V3 0.9–1.2 mm and the T in V3 as tall as the R', () => {
    const film = blocksOf('s6', 'film')[0];
    expect(film.frames[0].ecg).toEqual(blocksOf('s6', 'worked')[0].ecg);
    const [injury, monitor, lbbb, hyper] = film.frames.map((f) => ecgOf(f.ecg));
    for (const l of ['V2', 'V3', 'V4'] as const) {
      expect(stAt(injury, l), l).toBeGreaterThanOrEqual(0.185);
      expect(stAt(injury, l), l).toBeLessThan(0.335);
    }
    for (const l of ['III', 'aVF'] as const) {
      expect(-stAt(injury, l), l).toBeGreaterThanOrEqual(0.095);
      expect(-stAt(injury, l), l).toBeLessThan(0.125);
    }
    for (const [e, l, mm] of [[injury, 'V4', 1.9], [monitor, 'V4', 0.6], [injury, 'V3', 3.3], [monitor, 'V3', 2.1]] as const) {
      expect(Math.abs(stAt(e, l) * 10 - mm), `${l} ${mm} mm`).toBeLessThanOrEqual(0.1);
    }
    expect(Math.abs(lbbb.truth!.qrsMs - 150)).toBeLessThanOrEqual(5);
    for (const l of ['V1', 'V2'] as const) {
      expect(stAt(lbbb, l), l).toBeGreaterThanOrEqual(0.2);
      expect(stAt(lbbb, l), l).toBeLessThanOrEqual(0.25);
      expect(qrs(lbbb, l).min, l).toBeLessThan(-1.5);
      expect(stAt(lbbb, l) / -qrs(lbbb, l).min, `${l} ST/S`).toBeLessThan(0.25);
    }
    for (const l of ['V2', 'V3'] as const) {
      expect(stAt(hyper, l), l).toBeGreaterThanOrEqual(0.085);
      expect(stAt(hyper, l), l).toBeLessThan(0.125);
    }
    expect(tw(hyper, 'V3').max).toBeGreaterThanOrEqual(0.95 * qrs(hyper, 'V3').max);
  });
  it('contrast A (early repolarisation, man of 24): V2–V3 below 2.5 mm, ST at the J point 1–1.7 mm in the inferior leads and V4–V6, only aVR depressed', () => {
    const e = ecgOf(blocksOf('s6', 'contrast')[0].left.ecg);
    for (const l of ['V2', 'V3'] as const) expect(stAt(e, l), l).toBeLessThan(0.25);
    for (const l of ['II', 'III', 'aVF', 'V4', 'V5', 'V6'] as const) {
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.095);
      expect(stAt(e, l), l).toBeLessThan(0.175);
    }
    expect(stAt(e, 'aVR')).toBeLessThan(-0.03);
    for (const l of ['I', 'II', 'III', 'aVL', 'aVF', ...CHEST] as const) expect(stAt(e, l), l).toBeGreaterThan(-0.05);
  });
});

describe('s7: normal variants on the tracings', () => {
  it('athlete (hook = worked): about 48/min with RR varying > 120 ms, QRS 110–119 with r′ in V1, SV1 + RV5 ≥ 35 mm, J-point elevation about 1–1.5 mm in II and V5–V6, T inverted in V1', () => {
    const e = ecgOf(blocksOf('s7', 'hook')[0].ecg);
    expect(blocksOf('s7', 'worked')[0].ecg).toEqual(blocksOf('s7', 'hook')[0].ecg);
    const t = e.truth!;
    expect(Math.abs(t.hrBpm - 48)).toBeLessThan(3);
    expect(Math.max(...rrs(e)) - Math.min(...rrs(e))).toBeGreaterThan(120);
    expect(t.qrsMs).toBeGreaterThanOrEqual(110);
    expect(t.qrsMs).toBeLessThan(120);
    expect(hasRPrime(e, 'V1')).toBe(true);
    expect(-qrs(e, 'V1').min + qrs(e, 'V5').max).toBeGreaterThanOrEqual(3.5);
    for (const l of ['II', 'V5', 'V6'] as const) {
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
      expect(stAt(e, l), l).toBeLessThan(0.16);
    }
    for (const l of ['V5', 'V6'] as const) expect(stAt(e, l, 60), l).toBeGreaterThan(0);
    expect(tInverted(e, 'V1')).toBe(true);
    for (const l of ['V3', 'V4', 'V5', 'V6', 'I', 'II'] as const) expect(tUpright(e, l), l).toBe(true);
  });
  it('ST sweep: in II and aVF at both ends the notch is a separate hump after the R downstroke (from a dip that stays on or above the baseline it rises over 2 mm to the Jp), standing above the J mark; QRS < 120 ms throughout', () => {
    for (const v of [0.06, 0.14]) {
      const e = played('s7', 0, v);
      for (const l of ['II', 'aVF'] as const) {
        const n = notch(e, l);
        expect(n.peak - n.dip, `${v} ${l} hump above the dip`).toBeGreaterThan(0.2);
        expect(n.dip, `${v} ${l} dip not below the baseline`).toBeGreaterThan(-MIN_WAVE_MV);
        expect(Math.abs(n.peak - jPeak(e, l)), `${v} ${l} the hump is the Jp`).toBeLessThan(0.01);
      }
      expect(jPeak(e, 'II') - stAt(e, 'II'), `${v} notch stands above the J mark`).toBeGreaterThan(0.15);
    }
    for (const v of [0.06, 0.09, 0.14]) expect(played('s7', 0, v).truth!.qrsMs, `${v}`).toBeLessThan(120);
  });
  it('ST sweep note at 0.06–0.08: the notch about 3.5 mm in II and 3 mm in aVF, the ST at the J mark under 1 mm in both', () => {
    for (const v of [0.06, 0.08]) {
      const e = played('s7', 0, v);
      expect(Math.abs(jPeak(e, 'II') - 0.35), `${v} II`).toBeLessThan(0.03);
      expect(Math.abs(jPeak(e, 'aVF') - 0.3), `${v} aVF`).toBeLessThan(0.03);
      for (const l of ['II', 'aVF'] as const) expect(stAt(e, l), `${v} ${l}`).toBeLessThan(0.1);
    }
  });
  it('ST sweep note from 0.09: the ST at the J mark in II reaches 1 mm and the notch in II stays about 3.5–4 mm', () => {
    const sc = scenarios().find((s) => s.id === 'early-repolarization')!;
    for (const v of sweepValues('st', sc.dials.st!, 0.09, 0.14)) {
      const e = played('s7', 0, v);
      expect(stAt(e, 'II'), `${v}`).toBeGreaterThanOrEqual(0.1);
      expect(jPeak(e, 'II'), `${v}`).toBeGreaterThanOrEqual(0.34);
      expect(jPeak(e, 'II'), `${v}`).toBeLessThanOrEqual(0.4);
    }
  });
  it('ST sweep caption: at both ends the notch is over 2 mm in II, III and aVF with a horizontal ST after it (within 0.5 mm of the J mark at J + 60 and J + 100 ms)', () => {
    for (const v of [0.06, 0.14]) {
      const e = played('s7', 0, v);
      for (const l of ['II', 'III', 'aVF'] as const) {
        expect(jPeak(e, l), `${v} ${l}`).toBeGreaterThan(0.2);
        for (const d of [60, 100]) expect(Math.abs(stAt(e, l, d) - stAt(e, l)), `${v} ${l} J+${d}`).toBeLessThan(0.05);
      }
    }
  });
  it('juvenile T (both tracings): T inverted in V1–V3, upright from V4', () => {
    for (const src of [blocksOf('s7', 'film')[0].frames[0].ecg, blocksOf('s7', 'contrast')[0].left.ecg]) {
      const e = ecgOf(src);
      for (const l of ['V1', 'V2', 'V3'] as const) expect(tInverted(e, l), l).toBe(true);
      for (const l of ['V4', 'V5', 'V6'] as const) expect(tUpright(e, l), l).toBe(true);
    }
  });
  it('never-a-variant film: QS in V2–V3; complete LBBB with QRS about 150 ms; PR about 115 ms with pre-excitation; QTc about 500 ms', () => {
    const [oldMi, lbbb, preExcited, longQt] = blocksOf('s7', 'film')[1].frames.map((f) => ecgOf(f.ecg));
    for (const l of ['V2', 'V3'] as const) {
      expect(qrs(oldMi, l).max, l).toBeLessThan(0.02);
      expect(qrs(oldMi, l).min, l).toBeLessThan(-0.8);
    }
    expect(oldMi.truth!.findings).toContain('pathological-q');
    expect(Math.abs(lbbb.truth!.qrsMs - 150)).toBeLessThan(10);
    expect(lbbb.truth!.findings).toContain('lbbb');
    expect(Math.abs(preExcited.truth!.prMs! - 115)).toBeLessThanOrEqual(5);
    expect(preExcited.truth!.findings).toContain('wpw');
    for (const q of [longQt.truth!.qtcBazettMs, longQt.truth!.qtcFridericiaMs]) expect(Math.abs(q - 500)).toBeLessThan(10);
  });
  it('incomplete RBBB: QRS about 118 ms (110–119) with an r′ in V1', () => {
    const e = ecgOf(blocksOf('s7', 'film')[0].frames[1].ecg);
    expect(Math.abs(e.truth!.qrsMs - 118)).toBeLessThanOrEqual(3);
    expect(e.truth!.qrsMs).toBeGreaterThanOrEqual(110);
    expect(e.truth!.qrsMs).toBeLessThan(120);
    expect(hasRPrime(e, 'V1')).toBe(true);
  });
  it('LVH with secondary ST–T: T inverted with ST depression in V5–V6, T inverted in I and aVL, deep S in V1–V3', () => {
    const e = ecgOf(blocksOf('s7', 'contrast')[0].right.ecg);
    for (const l of ['V5', 'V6', 'I', 'aVL'] as const) expect(tInverted(e, l), l).toBe(true);
    for (const l of ['V5', 'V6'] as const) expect(stAt(e, l, 60), l).toBeLessThan(-0.05);
    for (const l of ['V1', 'V2', 'V3'] as const) expect(-qrs(e, l).min, l).toBeGreaterThan(1.5);
  });
  it('variant or Brugada: A has upright T in V2–V3 (shallow negative T in V1 only) and inferior J notches; B coved ST ≥ 2 mm into a negative T in V1–V2 only', () => {
    const c = blocksOf('s7', 'contrast')[1];
    const a = ecgOf(c.left.ecg);
    const b = ecgOf(c.right.ecg);
    for (const l of ['V2', 'V3'] as const) expect(tUpright(a, l), l).toBe(true);
    expect(tw(a, 'V1').max).toBeLessThan(0.1);
    expect(tw(a, 'V1').min).toBeLessThan(-0.05);
    expect(tw(a, 'V1').min).toBeGreaterThan(-0.2);
    expect(stAt(a, 'V1')).toBeLessThan(0.1);
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(a, l), l).toBeGreaterThanOrEqual(0.09);
    for (const l of ['V1', 'V2'] as const) {
      expect(stAt(b, l), l).toBeGreaterThanOrEqual(0.2);
      expect(stAt(b, l, 60), l).toBeLessThan(stAt(b, l));
      expect(tw(b, l).min, l).toBeLessThan(-0.1);
    }
    expect(Math.abs(stAt(b, 'V3'))).toBeLessThan(0.05);
  });
  it('athlete check: about 48/min, PR about 220 ms, r′ in V1', () => {
    const e = ecgOf(inlineItem('s7', 's7:athlete-workup').ecg);
    expect(Math.abs(e.truth!.hrBpm - 48)).toBeLessThan(3);
    expect(Math.abs(e.truth!.prMs! - 220)).toBeLessThan(10);
    expect(hasRPrime(e, 'V1')).toBe(true);
  });
});

// ── what the text says about each real case (labels and the 12SL reference) ─────────────────────────────────────────

interface RealClaim {
  readonly id: number;
  readonly sex?: 'M' | 'F';
  readonly age?: number;
  /** labels the text names */
  readonly has?: readonly FindingId[];
  /** labels the text says are absent */
  readonly not?: readonly FindingId[];
  readonly hr?: readonly [number, number];
  readonly pr?: readonly [number, number];
  readonly axis?: readonly [number, number];
  readonly qtcF?: readonly [number, number];
}

/** per lesson, every real case it shows and what its text states about it (a bare id: the text states nothing) */
const REAL_CLAIMS: Readonly<Partial<Record<(typeof IDS)[number], readonly RealClaim[]>>> = {
  s1: [{ id: 13683 }, { id: 21589 }, { id: 14918 }],
  s2: [{ id: 14918 }, { id: 8931 }, { id: 19505 }],
};

function realIdsOf(lesson: Lesson): number[] {
  const ids = sourcesOf(lesson).flatMap(({ src }) => (src.kind === 'real' ? [src.id] : []));
  for (const b of lesson.blocks) if (b.kind === 'real') ids.push(...b.ids);
  return [...new Set(ids)].sort((a, b) => a - b);
}

describe('stage S real cases: the text agrees with the labels and the 12SL reference', () => {
  for (const [lessonId, claims] of Object.entries(REAL_CLAIMS)) {
    it(`${lessonId}: every real case it shows has a claim`, () => {
      expect(realIdsOf(lessonById(lessonId))).toEqual(claims!.map((c) => c.id).sort((a, b) => a - b));
    });
    for (const c of claims!) {
      it(`${lessonId} PTB-XL ${c.id}${c.sex ? ` ${c.sex}${c.age}` : ''}${c.has ? `, ${c.has.join(' + ')}` : ''}`, () => {
        const k = getCase(c.id);
        expect(k, `PTB-XL ${c.id}`).toBeDefined();
        if (c.sex) expect(k!.sex).toBe(c.sex);
        if (c.age !== undefined) expect(k!.age).toBe(c.age);
        for (const f of c.has ?? []) expect(k!.findings, `${c.id} labelled ${f}`).toContain(f);
        for (const f of c.not ?? []) expect(k!.findings, `${c.id} not labelled ${f}`).not.toContain(f);
        const within = (v: number | null, r: readonly [number, number] | undefined, what: string) => {
          if (!r) return;
          expect(v, `${c.id} ${what}`).not.toBeNull();
          expect(v!, `${c.id} ${what}`).toBeGreaterThanOrEqual(r[0]);
          expect(v!, `${c.id} ${what}`).toBeLessThanOrEqual(r[1]);
        };
        within(k!.ref.hrBpm, c.hr, 'HR');
        within(k!.ref.prMs, c.pr, 'PR');
        within(k!.ref.qrsAxisDeg, c.axis, 'axis');
        within(k!.ref.qtcFridericiaMs, c.qtcF, 'QTc (Fridericia)');
      });
    }
  }
});
