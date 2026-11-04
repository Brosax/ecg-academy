/**
 * Stage S lessons (s1–s7, docs/PLAN.md §3): every lesson validates against the live catalogues with no errors and no
 * warnings, follows the lesson anatomy (attempt-first hook, worked example before practice, checks/drill, summary),
 * every live-block dial is realised by the engine, every family check generates, and every synthetic ECG the lessons
 * show can be generated.
 */
import { describe, expect, it } from 'vitest';
import type { Block, Lesson } from '../../src/course/api';
import { liveValidateDeps } from '../../src/course/deps';
import { REGISTERED } from '../../src/course/lessons/index';
import { realisedDials, startDials } from '../../src/course/live';
import { baselineBefore, qrsWaves } from '../../src/course/marks';
import { formatIssues, validateLesson } from '../../src/course/validate';
import type { BeatMarks, Ecg } from '../../src/core/ecg';
import type { L10n } from '../../src/core/l10n';
import type { StdLead } from '../../src/core/leads';
import type { EcgSource, Item } from '../../src/practice/api';
import { generateItem } from '../../src/practice';
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
/** what a playing live block shows with its played dial at `v` (its other dials at their start values) */
function played(id: string, i: number, v: number): Ecg {
  const b = blocksOf(id, 'live')[i];
  if (!b.play) throw new Error(`${id}: live block ${i} does not play`);
  const sc = scenarios().find((s) => s.id === b.scenario);
  if (!sc) throw new Error(`unknown scenario ${b.scenario}`);
  const dials = { ...startDials(sc, b.variant, b.dials.map((d) => d.id), b.play), [b.play.dial]: v };
  return ecgOf({ scenario: b.scenario, ...(b.variant ? { variant: b.variant } : {}), seed: b.seed, dials });
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
const pw = (ecg: Ecg, lead: StdLead, b = midBeat(ecg)) => span(ecg, lead, b.pOn ?? b.qrsOn - 150, b.pOff ?? b.qrsOn - 60, b);
/** the T wave (J + 40 ms → T end): its largest excursion either side of the baseline */
const tw = (ecg: Ecg, lead: StdLead, b = midBeat(ecg)) => span(ecg, lead, b.j + 40, b.tOff, b);
const tInverted = (ecg: Ecg, lead: StdLead) => tw(ecg, lead).min < -0.1 && -tw(ecg, lead).min > tw(ecg, lead).max;
const tUpright = (ecg: Ecg, lead: StdLead) => tw(ecg, lead).max > 0.1 && tw(ecg, lead).max > -tw(ecg, lead).min;
/** deviation from the PR baseline at J + plusMs (mV) */
function stAt(ecg: Ecg, lead: StdLead, plusMs = 0, b = midBeat(ecg)): number {
  const a = ecg.signal.leads[lead];
  const fs = ecg.signal.fs;
  const x = ((b.j + plusMs) * fs) / 1000;
  const i = Math.floor(x);
  return a[i] * (1 - (x - i)) + a[i + 1] * (x - i) - baselineBefore(a, fs, b.qrsOn);
}
const mostEquiphasic = (ecg: Ecg): StdLead =>
  LIMB.reduce((best, l) => (Math.abs(qrs(ecg, l).net) / qrs(ecg, l).p2p < Math.abs(qrs(ecg, best).net) / qrs(ecg, best).p2p ? l : best));
const transition = (ecg: Ecg): StdLead | undefined => CHEST.find((l) => qrs(ecg, l).max >= -qrs(ecg, l).min);
const rrs = (ecg: Ecg): number[] => ecg.truth!.beats.slice(1).map((b, i) => b.qrsOn - ecg.truth!.beats[i].qrsOn);
const hasRPrime = (ecg: Ecg, lead: StdLead): boolean => {
  const b = midBeat(ecg);
  return qrsWaves(ecg.signal.leads[lead], ecg.signal.fs, b.qrsOn, b.qrsOff).some((w) => w.role === 'r' && w.label.includes('′'));
};

describe('s1: the reading order on the tracings', () => {
  it('hook (pre-excitation): PR about 115 ms, QRS about 125 ms, R ≥ S in V1, T inverted in II, III, aVF and V3–V6', () => {
    const e = ecgOf(blocksOf('s1', 'hook')[0].ecg);
    const t = e.truth!;
    expect(t.prMs!).toBeGreaterThanOrEqual(105);
    expect(t.prMs!).toBeLessThan(120);
    expect(t.qrsMs).toBeGreaterThanOrEqual(115);
    expect(t.qrsMs).toBeLessThanOrEqual(135);
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
  it('contrast B (hyperkalaemia): PR about 205, QRS about 115, peaked T in V3–V5 as tall as the R', () => {
    const e = ecgOf(blocksOf('s1', 'contrast')[0].right.ecg);
    const t = e.truth!;
    expect(Math.abs(t.prMs! - 205)).toBeLessThan(10);
    expect(t.qrsMs).toBeGreaterThanOrEqual(110);
    expect(t.qrsMs).toBeLessThan(120);
    for (const l of ['V3', 'V4'] as const) expect(tw(e, l).max, l).toBeGreaterThan(qrs(e, l).max);
    expect(tw(e, 'V5').max).toBeGreaterThan(0.85 * qrs(e, 'V5').max);
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
  it('never-miss film: ST up in V1–V4 with III and aVF down; T taller than R in V3–V4, PR > 200, QRS > 110; QTc about 520; PR < 120 with pre-excitation; coved ST ≥ 2 mm into a negative T in V1–V2; P about 96/min with one in three conducted at about 32/min', () => {
    const [occlusion, potassium, longQt, preExcited, brugada, avBlock] = blocksOf('s1', 'film')[2].frames.map((f) => ecgOf(f.ecg));
    for (const l of ['V1', 'V2', 'V3', 'V4'] as const) expect(stAt(occlusion, l), l).toBeGreaterThanOrEqual(0.1);
    for (const l of ['III', 'aVF'] as const) expect(stAt(occlusion, l), l).toBeLessThan(-0.05);
    for (const l of ['V3', 'V4'] as const) expect(tw(potassium, l).max, l).toBeGreaterThan(qrs(potassium, l).max);
    expect(potassium.truth!.prMs!).toBeGreaterThan(200);
    expect(potassium.truth!.qrsMs).toBeGreaterThan(110);
    for (const q of [longQt.truth!.qtcBazettMs, longQt.truth!.qtcFridericiaMs]) expect(Math.abs(q - 520)).toBeLessThan(10);
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
  const meanRr = (e: Ecg) => rrs(e).reduce((s, x) => s + x, 0) / rrs(e).length;
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
  it('P-axis sweep notes: III flat or slightly negative at 20–30; III and aVL small at 35–55; aVL flat or slightly negative with III upright at 60–70; I and II upright and aVR negative throughout, aVF upright from 35', () => {
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
      } else if (v <= 55) {
        for (const x of [iii, avl]) expect(Math.abs(x), `${v}° III/aVL`).toBeLessThan(0.6 * ii);
      } else {
        expect(avl, `${v}° aVL`).toBeLessThan(0.005);
        expect(avl, `${v}° aVL`).toBeGreaterThan(-0.04);
        expect(iii, `${v}° III`).toBeGreaterThan(0.04);
      }
    }
  });
  it('variability sweep notes: PP spread > 120 ms at 0.10–0.139 and 230–290 ms at 0.14–0.18, with a PR of 160 ms on every beat', () => {
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
  it('rate sweep notes: QT ≈ QTc ≈ 405 ms at 60–62/min; the QT shortens while Fridericia holds; at 90–100/min QT 340–355, Fridericia about 405, Bazett about 430–440', () => {
    for (const v of [60, 62]) {
      const t = played('s4', 1, v).truth!;
      for (const x of [t.qtMs, t.qtcBazettMs, t.qtcFridericiaMs]) expect(Math.abs(x - 405), `${v}/min`).toBeLessThan(6);
    }
    expect(played('s4', 1, 89).truth!.qtMs).toBeLessThan(played('s4', 1, 63).truth!.qtMs - 20);
    for (const v of [63, 89]) expect(Math.abs(played('s4', 1, v).truth!.qtcFridericiaMs - 405), `${v}/min`).toBeLessThan(6);
    for (const v of [90, 100]) {
      const t = played('s4', 1, v).truth!;
      expect(t.qtMs, `${v}/min`).toBeGreaterThan(338);
      expect(t.qtMs, `${v}/min`).toBeLessThan(357);
      expect(Math.abs(t.qtcFridericiaMs - 405), `${v}/min`).toBeLessThan(6);
      expect(t.qtcBazettMs, `${v}/min`).toBeGreaterThan(427);
      expect(t.qtcBazettMs, `${v}/min`).toBeLessThan(444);
    }
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
  it('R-wave progression film, normal frame: rS in V1, the R overtakes the S at V3, qR in V6', () => {
    const e = ecgOf(blocksOf('s5', 'film')[0].frames[0].ecg);
    expect(transition(e)).toBe('V3');
    const b = midBeat(e);
    const roles = (l: StdLead) => qrsWaves(e.signal.leads[l], e.signal.fs, b.qrsOn, b.qrsOff).map((w) => w.role).join('');
    expect(roles('V1')).toBe('rs');
    expect(roles('V6').startsWith('qr')).toBe(true);
  });
  it('R-wave progression film: poor progression has an R of about 2 mm in V3 and its transition at V4; V1–V2 high on the same heart shrinks the r in V2 from about 3.5 to 1 mm and turns the P in V1 negative', () => {
    const [normal, poor, high] = blocksOf('s5', 'film')[0].frames.map((f) => ecgOf(f.ecg));
    expect(qrs(poor, 'V3').max).toBeGreaterThan(0.15);
    expect(qrs(poor, 'V3').max).toBeLessThanOrEqual(0.25);
    expect(transition(poor)).toBe('V4');
    expect(Math.abs(qrs(normal, 'V2').max - 0.35)).toBeLessThan(0.05);
    expect(Math.abs(qrs(high, 'V2').max - 0.1)).toBeLessThan(0.03);
    expect(pw(normal, 'V1').max).toBeGreaterThan(0.005);
    expect(pw(high, 'V1').max).toBeLessThan(0.003);
    expect(pw(high, 'V1').min).toBeLessThan(-0.02);
    for (const l of [...LIMB, 'V3', 'V4', 'V5', 'V6'] as const) expect(high.signal.leads[l]).toEqual(normal.signal.leads[l]);
  });
  it('axis sweep notes: aVF most equiphasic at 0–20°, III at 25–50°, aVL at 55–80°; lead I shrinks near +90°', () => {
    for (const [v, lead] of [[0, 'aVF'], [20, 'aVF'], [25, 'III'], [50, 'III'], [55, 'aVL'], [80, 'aVL']] as const) {
      const e = played('s5', 0, v);
      expect(Math.abs(e.truth!.axisDeg.qrs - v), `${v}°`).toBeLessThan(3);
      expect(mostEquiphasic(e), `${v}°`).toBe(lead);
    }
    const [at55, at80] = [played('s5', 0, 55), played('s5', 0, 80)];
    expect(qrs(at80, 'I').net).toBeLessThan(0.5 * qrs(at55, 'I').net);
    expect(qrs(at80, 'I').net).toBeLessThan(0.3 * qrs(at80, 'aVF').net);
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
  it('worked (anterior): V2 ≈ 2.5 mm at J / 3 mm at J+60, V3 ≈ 3 / 4 mm, V4 ≈ 2 mm, V1 ≈ 1 mm; I and aVL < 1 mm; III and aVF ≈ −1 mm', () => {
    const e = ecgOf(blocksOf('s6', 'worked')[0].ecg);
    expect(stAt(e, 'V2')).toBeGreaterThan(0.2);
    expect(stAt(e, 'V2')).toBeLessThan(0.3);
    expect(stAt(e, 'V2', 60)).toBeGreaterThan(0.25);
    expect(stAt(e, 'V2', 60)).toBeLessThan(0.35);
    expect(stAt(e, 'V3')).toBeGreaterThan(0.25);
    expect(stAt(e, 'V3', 60)).toBeGreaterThan(0.33);
    expect(stAt(e, 'V3', 60)).toBeLessThan(0.45);
    expect(stAt(e, 'V4', 60)).toBeGreaterThan(0.15);
    expect(stAt(e, 'V4', 60)).toBeLessThan(0.27);
    expect(stAt(e, 'V1', 60)).toBeGreaterThan(0.08);
    expect(stAt(e, 'V1', 60)).toBeLessThan(0.17);
    for (const l of ['I', 'aVL'] as const) expect(stAt(e, l), l).toBeLessThan(0.1);
    for (const l of ['III', 'aVF'] as const) {
      expect(stAt(e, l, 60), l).toBeLessThan(-0.07);
      expect(stAt(e, l, 60), l).toBeGreaterThan(-0.17);
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
  it('ST sweep notes (J+60 read-out): V3 about +3 mm and III about −1 mm at 0.22–0.25 mV; V2–V4 rise as III and aVF fall across 0.26–0.39; V3 about +5–6 mm and III about −2 mm at 0.40–0.45', () => {
    for (const v of [0.22, 0.25]) {
      const e = played('s6', 0, v);
      expect(stAt(e, 'V3', 60), `${v}`).toBeGreaterThan(0.27);
      expect(stAt(e, 'V3', 60), `${v}`).toBeLessThan(0.34);
      expect(stAt(e, 'III', 60), `${v}`).toBeGreaterThan(-0.125);
      expect(stAt(e, 'III', 60), `${v}`).toBeLessThan(-0.085);
    }
    const [lo, hi] = [played('s6', 0, 0.26), played('s6', 0, 0.39)];
    for (const l of ['V2', 'V3', 'V4'] as const) expect(stAt(hi, l, 60), l).toBeGreaterThan(stAt(lo, l, 60) + 0.05);
    for (const l of ['III', 'aVF'] as const) expect(stAt(hi, l, 60), l).toBeLessThan(stAt(lo, l, 60) - 0.02);
    for (const v of [0.4, 0.45]) {
      const e = played('s6', 0, v);
      expect(stAt(e, 'V3', 60), `${v}`).toBeGreaterThan(0.49);
      expect(stAt(e, 'V3', 60), `${v}`).toBeLessThan(0.6);
      expect(stAt(e, 'III', 60), `${v}`).toBeGreaterThan(-0.21);
      expect(stAt(e, 'III', 60), `${v}`).toBeLessThan(-0.165);
    }
  });
  it('thresholds film: injury 2–3.5 mm in V2–V4 at J with III and aVF about −1 mm; the monitor filter drops V4 from about 2 to 0.6 mm and V3 from about 3.3 to 2 mm; LBBB 2–2.5 mm in V1–V2 after a deep S with QRS about 150 ms; hyperacute T with V2–V3 about 1 mm and the T in V3 as tall as the R', () => {
    const film = blocksOf('s6', 'film')[0];
    expect(film.frames[0].ecg).toEqual(blocksOf('s6', 'worked')[0].ecg);
    const [injury, monitor, lbbb, hyper] = film.frames.map((f) => ecgOf(f.ecg));
    for (const l of ['V2', 'V3', 'V4'] as const) {
      expect(stAt(injury, l), l).toBeGreaterThan(0.18);
      expect(stAt(injury, l), l).toBeLessThan(0.35);
    }
    for (const l of ['III', 'aVF'] as const) {
      expect(stAt(injury, l), l).toBeGreaterThan(-0.13);
      expect(stAt(injury, l), l).toBeLessThan(-0.08);
    }
    expect(stAt(injury, 'V4')).toBeGreaterThan(0.17);
    expect(stAt(injury, 'V4')).toBeLessThan(0.21);
    expect(stAt(monitor, 'V4')).toBeGreaterThan(0.045);
    expect(stAt(monitor, 'V4')).toBeLessThan(0.08);
    expect(stAt(injury, 'V3')).toBeGreaterThan(0.31);
    expect(stAt(injury, 'V3')).toBeLessThan(0.35);
    expect(stAt(monitor, 'V3')).toBeGreaterThan(0.19);
    expect(stAt(monitor, 'V3')).toBeLessThan(0.22);
    expect(Math.abs(lbbb.truth!.qrsMs - 150)).toBeLessThan(10);
    for (const l of ['V1', 'V2'] as const) {
      expect(stAt(lbbb, l), l).toBeGreaterThan(0.2);
      expect(stAt(lbbb, l), l).toBeLessThan(0.26);
      expect(qrs(lbbb, l).min, l).toBeLessThan(-1.5);
    }
    for (const l of ['V2', 'V3'] as const) {
      expect(stAt(hyper, l), l).toBeGreaterThan(0.07);
      expect(stAt(hyper, l), l).toBeLessThan(0.14);
    }
    expect(tw(hyper, 'V3').max).toBeGreaterThanOrEqual(0.95 * qrs(hyper, 'V3').max);
  });
  it('contrast A (early repolarisation, man of 24): V2–V3 below 2.5 mm, inferior and V4–V6 J about 1–1.5 mm, only aVR depressed', () => {
    const e = ecgOf(blocksOf('s6', 'contrast')[0].left.ecg);
    for (const l of ['V2', 'V3'] as const) expect(stAt(e, l), l).toBeLessThan(0.25);
    for (const l of ['II', 'III', 'aVF', 'V4', 'V5', 'V6'] as const) {
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.09);
      expect(stAt(e, l), l).toBeLessThan(0.2);
    }
    expect(stAt(e, 'aVR')).toBeLessThan(-0.03);
    for (const l of ['I', 'II', 'III', 'aVL', 'aVF', ...CHEST] as const) expect(stAt(e, l), l).toBeGreaterThan(-0.05);
  });
});

describe('s7: normal variants on the tracings', () => {
  it('athlete (hook = worked): about 48/min with RR varying > 120 ms, QRS 110–119 with r′ in V1, SV1 + RV5 ≥ 35 mm, J about 1–1.5 mm in II and V5–V6 (formal early repolarisation), T inverted in V1', () => {
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
  it('early repolarisation pattern: J ≥ 1 mm in II and aVF, QRS < 120 ms', () => {
    const e = ecgOf(blocksOf('s7', 'ecg')[0].ecg);
    for (const l of ['II', 'aVF'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    expect(e.truth!.qrsMs).toBeLessThan(120);
  });
  it('juvenile T (both tracings): T inverted in V1–V3, upright from V4', () => {
    for (const src of [blocksOf('s7', 'ecg')[1].ecg, blocksOf('s7', 'contrast')[0].left.ecg]) {
      const e = ecgOf(src);
      for (const l of ['V1', 'V2', 'V3'] as const) expect(tInverted(e, l), l).toBe(true);
      for (const l of ['V4', 'V5', 'V6'] as const) expect(tUpright(e, l), l).toBe(true);
    }
  });
  it('incomplete RBBB: QRS about 118 ms (110–119) with an r′ in V1', () => {
    const e = ecgOf(blocksOf('s7', 'ecg')[2].ecg);
    expect(e.truth!.qrsMs).toBeGreaterThanOrEqual(113);
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
