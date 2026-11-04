/**
 * Stage R lessons (r1–r8, docs/PLAN.md §3): every lesson validates against the live catalogues with no errors and no
 * warnings, follows the lesson anatomy (attempt-first hook, worked example before practice, checks/drill, summary),
 * every live-block dial is realised by the engine, every family check generates, and every synthetic ECG the lessons
 * show can be generated.
 */
import { describe, expect, it } from 'vitest';
import type { AutoMark, Block, Lesson } from '../../src/course/api';
import { liveValidateDeps } from '../../src/course/deps';
import { REGISTERED } from '../../src/course/lessons/index';
import { realisedDials, startDials } from '../../src/course/live';
import { baselineBefore, isAutoMark, qrsWaves } from '../../src/course/marks';
import { formatIssues, validateLesson } from '../../src/course/validate';
import type { BeatMarks, Ecg } from '../../src/core/ecg';
import type { L10n } from '../../src/core/l10n';
import type { StdLead } from '../../src/core/leads';
import type { EcgSource, Item } from '../../src/practice/api';
import { generateItem } from '../../src/practice';
import { generate, scenarios, type SynthRequest } from '../../src/synth';

const IDS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'] as const;

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

describe('stage R lessons', () => {
  it('all eight lesson files exist and export their lesson', () => {
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
        expect(lesson.stage).toBe('R');
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

describe('stage R text', () => {
  const OUTDATED: Readonly<Record<'zh' | 'en' | 'es', RegExp>> = {
    zh: /半支阻滞|心房肥大|类本位曲折|病窦综合征|结性心律|劳损/,
    // r5 names Lown grades only to replace them ("instead of Lown grades, describe…"), so Lown is not banned here
    en: /intrinsicoid|hemiblock|sick sinus|nodal rhythm|\bPSVT\b|strain pattern|atrial enlargement/i,
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
const cache = new Map<string, Ecg>();
function ecgOf(src: EcgSource | SynthRequest | undefined): Ecg {
  const req = src && 'kind' in src ? (src.kind === 'synth' ? src.req : null) : src;
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
/** the beat indices of a film frame's `kind` marks, as the lesson places them */
const markBeats = (id: string, film: number, frame: number, kind: AutoMark['auto']): number[] =>
  (blocksOf(id, 'film')[film].frames[frame].marks ?? []).flatMap((m) => (isAutoMark(m) && m.auto === kind && m.beat !== undefined ? [m.beat] : []));
/** the P wave of a beat (default the middle one) in a lead: its largest excursion above (sign 1) or below (sign −1, returned positive) the PR baseline (mV) */
function pAmp(e: Ecg, lead: StdLead, b = mid(e), sign: 1 | -1 = 1): number {
  const a = e.signal.leads[lead];
  const fs = e.signal.fs;
  const base = baselineBefore(a, fs, b.qrsOn);
  let max = -Infinity;
  for (let i = Math.round(((b.pOn ?? b.qrsOn - 150) * fs) / 1000); i < Math.round((b.qrsOn * fs) / 1000); i++) max = Math.max(max, sign * (a[i] - base));
  return max;
}
const onsets = (e: Ecg): number[] => e.truth!.beats.map((b) => b.qrsOn);
const rrs = (e: Ecg): number[] => {
  const o = onsets(e);
  return o.slice(1).map((t, i) => t - o[i]);
};
const blocked = (e: Ecg) => e.truth!.atrial.filter((a) => a.conductedTo === null);
const prs = (e: Ecg): number[] => e.truth!.beats.filter((b) => b.pOn !== null).map((b) => b.qrsOn - (b.pOn ?? 0));
function qrsSpan(e: Ecg, lead: StdLead, b: BeatMarks) {
  const a = e.signal.leads[lead];
  const fs = e.signal.fs;
  const base = baselineBefore(a, fs, b.qrsOn);
  let max = -Infinity;
  let min = Infinity;
  for (let i = Math.round((b.qrsOn * fs) / 1000); i <= Math.round((b.qrsOff * fs) / 1000); i++) {
    max = Math.max(max, a[i] - base);
    min = Math.min(min, a[i] - base);
  }
  return { max, min };
}
const shape = (e: Ecg, l: StdLead, b: BeatMarks): string =>
  qrsWaves(e.signal.leads[l], e.signal.fs, b.qrsOn, b.qrsOff)
    .map((w) => w.role)
    .join('');
const hasRPrime = (e: Ecg, l: StdLead, b: BeatMarks): boolean =>
  qrsWaves(e.signal.leads[l], e.signal.fs, b.qrsOn, b.qrsOff).some((w) => w.role === 'r' && w.label.includes('′'));
const mid = (e: Ecg): BeatMarks => e.truth!.beats[Math.floor(e.truth!.beats.length / 2)];
/** the answers of every family check in a lesson */
async function checkAnswers(id: string): Promise<string[]> {
  const out: string[] = [];
  for (const b of blocksOf(id, 'check')) {
    if ('inline' in b.item) continue;
    const item: Item = await generateItem(b.item.family, b.item.seed, b.item.difficulty);
    out.push(...item.findings);
  }
  return out;
}

describe('r1: the sinus node on the tracings', () => {
  it('hook: sinus arrest — the pause is about 2.85 s, about 3.3 PP (not a multiple)', () => {
    const r = rrs(ecgOf(blocksOf('r1', 'hook')[0].ecg));
    const pause = Math.max(...r);
    expect(Math.abs(pause - 2850)).toBeLessThan(60);
    expect(pause / Math.min(...r)).toBeGreaterThan(3.1);
    expect(pause / Math.min(...r)).toBeLessThan(3.5);
  });
  it('worked: SA exit block — every pause is 2 x the basic PP (about 1580 ms)', () => {
    const r = rrs(ecgOf(blocksOf('r1', 'worked')[0].ecg));
    const pp = Math.min(...r);
    for (const x of r.filter((y) => y > 1.5 * pp)) expect(Math.abs(x / pp - 2)).toBeLessThan(0.06);
    expect(Math.abs(Math.max(...r) - 1580)).toBeLessThan(40);
  });
  it('pause film: arrest (the hook tracing) pauses about 2.85 s = about 3.3 PP; type II (the worked tracing) pauses about 1580 ms = 2 PP', () => {
    const f = blocksOf('r1', 'film')[0].frames;
    expect(f[0].ecg).toEqual(blocksOf('r1', 'hook')[0].ecg);
    expect(f[1].ecg).toEqual(blocksOf('r1', 'worked')[0].ecg);
    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    const [arrest, exit] = frames('r1', 0).map(rrs);
    const a = Math.max(...arrest);
    expect(Math.abs(a - 2850)).toBeLessThan(10);
    expect(a / mean(arrest.filter((x) => x < 1000))).toBeGreaterThan(3.25);
    expect(a / mean(arrest.filter((x) => x < 1000))).toBeLessThan(3.35);
    const pp = mean(exit.filter((x) => x < 1000));
    for (const x of exit.filter((y) => y > 1000)) {
      expect(Math.abs(x - 1580)).toBeLessThan(10);
      expect(Math.abs(x / pp - 2)).toBeLessThan(0.03);
    }
    expect(markBeats('r1', 0, 0, 'rr').map((k) => arrest[k]), 'the arrest bracket is on the pause').toEqual([a]);
    const exitMarks = markBeats('r1', 0, 1, 'rr');
    expect(exitMarks).toHaveLength(1);
    expect(Math.abs(exit[exitMarks[0]] - 1580), 'the type II bracket is on a pause').toBeLessThan(10);
  });
  it('type I SA block (film frame 3): in each group the PP shortens from a little over 900 to about 850 ms, then a pause shorter than 2 x PP; the brackets mark one group and its pause', () => {
    const r = rrs(frames('r1', 0)[2]);
    expect(Math.max(...r)).toBeLessThan(2 * Math.min(...r));
    expect(Math.max(...r)).toBeGreaterThan(1.4 * Math.min(...r));
    const pauses = r.flatMap((x, i) => (x > 1.4 * Math.min(...r) ? [i] : []));
    for (const k of pauses.filter((i) => i + 2 < r.length)) {
      expect(r[k + 1], `group after pause ${k}`).toBeGreaterThan(900);
      expect(r[k + 1], `group after pause ${k}`).toBeLessThan(920);
      expect(Math.abs(r[k + 2] - 850), `group after pause ${k}`).toBeLessThan(5);
      expect(r[k + 2]).toBeLessThan(r[k + 1]);
    }
    const [first, second, pause] = markBeats('r1', 0, 2, 'rr');
    expect(pauses, 'the first bracket opens a group').toContain(first - 1);
    expect([second, pause]).toEqual([first + 1, first + 2]);
    expect(pauses, 'the third bracket is the pause').toContain(pause);
  });
  it('tachy–brady (film frame 4): an atrial tachycardia ends in a post-conversion pause of about 2.9 s, and the bracket is on it', () => {
    const e = frames('r1', 0)[3];
    expect(e.truth!.rhythm).toBe('sinus-node-dysfunction');
    const r = rrs(e);
    const k = r.indexOf(Math.max(...r));
    expect(Math.abs(r[k] - 2900)).toBeLessThan(50);
    expect(e.truth!.beats[k].kind).toBe('atrial');
    expect(markBeats('r1', 0, 3, 'rr')).toEqual([k]);
  });
  it('rate sweep notes: 50–58 below 60 and 40–49 below 50 and 38–39 below 40 on the read-out; P and PR the same at every rate, only the RR grows', () => {
    for (const [v, lo, hi] of [[58, 50, 60], [50, 50, 60], [49, 40, 50], [40, 40, 50], [39, 30, 40], [38, 30, 40]] as const) {
      const hr = played('r1', 0, v).truth!.hrBpm;
      expect(hr, `${v}/min`).toBeGreaterThanOrEqual(lo);
      expect(hr, `${v}/min`).toBeLessThan(hi);
    }
    const [fast, slow] = [played('r1', 0, 58), played('r1', 0, 38)];
    for (const e of [fast, slow]) {
      for (const p of prs(e)) expect(Math.abs(p - 160)).toBeLessThan(2);
      expect(e.truth!.beats.every((b) => b.kind === 'sinus')).toBe(true);
    }
    expect(Math.abs(pAmp(slow, 'II') - pAmp(fast, 'II'))).toBeLessThan(0.005);
    expect(Math.min(...rrs(slow))).toBeGreaterThan(Math.max(...rrs(fast)) + 400);
  });
  it('sinus tachycardia: about 130/min, a sinus P before every QRS at a fixed PR', () => {
    const e = ecgOf(blocksOf('r1', 'ecg')[0].ecg);
    expect(Math.abs(e.truth!.hrBpm - 130)).toBeLessThan(2);
    expect(e.truth!.beats.every((b) => b.kind === 'sinus' && b.pOn !== null)).toBe(true);
    expect(Math.max(...prs(e)) - Math.min(...prs(e))).toBeLessThan(5);
  });
  it('checks stay on sinus-node topics', async () => {
    const ok = ['sinus-tachycardia', 'sinus-bradycardia', 'sinus-pause', 'sa-exit-block', 'sinus-node-dysfunction', 'sinus-rhythm'];
    for (const f of await checkAnswers('r1')) expect(ok).toContain(f);
  });
});

describe('r2: escape and dissociation on the tracings', () => {
  it('hook: junctional escape about 46/min, narrow, retrograde P′ about 110 ms before every QRS', () => {
    const e = ecgOf(blocksOf('r2', 'hook')[0].ecg);
    expect(Math.abs(e.truth!.hrBpm - 46)).toBeLessThan(2);
    expect(e.truth!.qrsMs).toBeLessThan(110);
    for (const pr of prs(e)) expect(Math.abs(pr - 108)).toBeLessThan(15);
  });
  it('isorhythmic dissociation (mechanism film frame 1): sinus about 70, junction about 76; only an occasional P conducts', () => {
    const e = frames('r2', 1)[0];
    const t = e.truth!;
    expect(t.atrialRateBpm!).toBeLessThan(t.hrBpm);
    expect(Math.abs(t.atrialRateBpm! - 70)).toBeLessThan(2);
    const esc = t.beats.flatMap((b, i) => (i > 0 && b.kind === 'escape-junctional' && t.beats[i - 1].kind === 'escape-junctional' ? [b.qrsOn - t.beats[i - 1].qrsOn] : []));
    for (const rr of esc) expect(Math.abs(60000 / rr - 76)).toBeLessThan(1.5);
    const captures = t.beats.filter((b) => b.kind === 'sinus').length;
    expect(captures).toBeGreaterThanOrEqual(1);
    expect(captures).toBeLessThanOrEqual(3);
  });
  it('escape film: the sinus node stops and a narrow junctional escape with no P comes about 1.43 s after the last beat', () => {
    const e = frames('r2', 0)[0];
    const beats = e.truth!.beats;
    const k = beats.findIndex((b) => b.kind === 'escape-junctional');
    expect(k).toBe(5);
    expect(beats[k].pOn).toBeNull();
    expect(Math.abs(beats[k].qrsOn - beats[k - 1].qrsOn - 1430)).toBeLessThan(10);
    for (const r of rrs(e).filter((_, i) => i !== k - 1 && i !== k)) expect(r).toBeLessThan(900);
    expect(Math.abs(beats[k].qrsOff - beats[k].qrsOn - (beats[0].qrsOff - beats[0].qrsOn))).toBeLessThan(3);
  });
  it('escape film: P at 78/min and none conducts in both; AV-node block escapes at 45/min narrow, infra-His block at 34/min wide', () => {
    const [, node, infra] = frames('r2', 0);
    for (const e of [node, infra]) {
      expect(Math.abs(e.truth!.atrialRateBpm! - 78)).toBeLessThan(1);
      expect(e.truth!.atrial.every((a) => a.conductedTo === null)).toBe(true);
    }
    expect(Math.abs(node.truth!.hrBpm - 45)).toBeLessThan(1);
    expect(node.truth!.qrsMs).toBeLessThan(110);
    expect(Math.abs(infra.truth!.hrBpm - 34)).toBeLessThan(1);
    expect(infra.truth!.qrsMs).toBeGreaterThanOrEqual(120);
    expect(blocksOf('r2', 'film')[1].frames[2].ecg).toEqual(blocksOf('r2', 'film')[0].frames[1].ecg);
  });
  it('worked: sinus about 60, junction about 66, captures with the same narrow QRS', () => {
    const t = ecgOf(blocksOf('r2', 'worked')[0].ecg).truth!;
    expect(Math.abs((t.atrialRateBpm ?? 0) - 60)).toBeLessThan(2);
    const esc = t.beats.filter((b) => b.kind !== 'sinus');
    expect(Math.abs(60000 / (esc[2].qrsOn - esc[1].qrsOn) - 66)).toBeLessThan(2);
    const cap = t.beats.filter((b) => b.kind === 'sinus');
    expect(cap.length).toBeGreaterThanOrEqual(1);
    for (const c of cap) expect(Math.abs(c.qrsOff - c.qrsOn - (esc[0].qrsOff - esc[0].qrsOn))).toBeLessThan(10);
  });
  it('AIVR (mechanism film frame 2): wide QRS at about 76/min against sinus about 72/min, a narrow early capture and a fusion beat of in-between width', () => {
    const t = frames('r2', 1)[1].truth!;
    const kinds = t.beats.map((b) => b.kind);
    expect(kinds).toContain('capture');
    expect(kinds).toContain('fusion');
    expect(Math.abs((t.atrialRateBpm ?? 0) - 72)).toBeLessThan(2);
    const w = (b: BeatMarks) => b.qrsOff - b.qrsOn;
    const v = t.beats.filter((b) => b.kind === 'ventricular');
    const vrr = t.beats.flatMap((b, i) => (i > 0 && b.kind === 'ventricular' && t.beats[i - 1].kind === 'ventricular' ? [b.qrsOn - t.beats[i - 1].qrsOn] : []));
    expect(Math.abs(60000 / (vrr.reduce((s, x) => s + x, 0) / vrr.length) - 76)).toBeLessThan(1.5);
    for (const b of v) expect(w(b)).toBeGreaterThanOrEqual(120);
    const ci = t.beats.findIndex((b) => b.kind === 'capture');
    const cap = t.beats[ci];
    const fus = t.beats.find((b) => b.kind === 'fusion')!;
    expect(w(cap)).toBeLessThan(110);
    expect(cap.qrsOn - t.beats[ci - 1].qrsOn).toBeLessThan(Math.min(...vrr) - 200);
    expect(w(fus)).toBeGreaterThan(w(cap));
    expect(w(fus)).toBeLessThan(w(v[0]));
  });
  it('contrast: junctional about 46/min narrow vs ventricular about 32/min wide', () => {
    const c = blocksOf('r2', 'contrast')[0];
    const a = ecgOf(c.left.ecg).truth!;
    const b = ecgOf(c.right.ecg).truth!;
    expect(Math.abs(a.hrBpm - 46)).toBeLessThan(2);
    expect(a.qrsMs).toBeLessThan(110);
    expect(Math.abs(b.hrBpm - 32)).toBeLessThan(2);
    expect(b.qrsMs).toBeGreaterThanOrEqual(120);
  });
  it('checks: escape rhythm and AV dissociation', async () => {
    const ans = await checkAnswers('r2');
    expect(ans).toContain('ventricular-escape-rhythm');
    expect(ans).toContain('av-dissociation');
  });
});

describe('r3: first degree and Mobitz I on the tracings', () => {
  it('worked: PR about 150 → 280, pause about 1470 ms (< 2 x PP)', () => {
    const e = ecgOf(blocksOf('r3', 'worked')[0].ecg);
    const p = prs(e);
    expect(Math.abs(Math.min(...p) - 150)).toBeLessThan(10);
    expect(Math.abs(Math.max(...p) - 280)).toBeLessThan(10);
    expect(Math.abs(Math.max(...rrs(e)) - 1470)).toBeLessThan(40);
  });
  it('3:2 cycles (PR film frame 2): two of every three P conduct, PR about 150 → 260 ms', () => {
    const e = frames('r3', 0)[1];
    const p = prs(e);
    expect(Math.abs(Math.min(...p) - 150)).toBeLessThan(5);
    expect(Math.abs(Math.max(...p) - 260)).toBeLessThan(5);
    for (let i = 0; i + 1 < p.length; i += 2) expect(p[i + 1]).toBeGreaterThan(p[i] + 80);
    const a = e.truth!.atrial;
    expect(Math.abs(a.length / a.filter((x) => x.conductedTo !== null).length - 1.5)).toBeLessThan(0.1);
  });
  it('athlete (PR film frame 1): about 48/min, PR about 220 ms (under 400), 1:1', () => {
    const e = frames('r3', 0)[0];
    expect(Math.abs(e.truth!.hrBpm - 48)).toBeLessThan(1);
    expect(Math.abs(e.truth!.prMs! - 220)).toBeLessThan(5);
    expect(blocked(e).filter((a) => a.visible).length).toBe(0);
  });
  it('5:4 cycles (PR film frame 3): PR about 150 → 230 → 265 → 285 ms, each step smaller, RR shortening; the first PR after the pause is the shortest', () => {
    const e = frames('r3', 0)[2];
    const beats = e.truth!.beats;
    const r = rrs(e);
    const p = beats.map((b) => b.qrsOn - (b.pOn ?? 0));
    const starts = r.flatMap((x, i) => (x > 1300 ? [i + 1] : []));
    expect(starts.length).toBeGreaterThanOrEqual(1);
    for (const s of starts) {
      expect(s + 3).toBeLessThan(p.length);
      [150, 230, 265, 285].forEach((v, k) => expect(Math.abs(p[s + k] - v), `beat ${s + k}`).toBeLessThan(5));
      expect(p[s + 2] - p[s + 1]).toBeLessThan(p[s + 1] - p[s]);
      expect(p[s + 3] - p[s + 2]).toBeLessThan(p[s + 2] - p[s + 1]);
      expect(r[s + 1]).toBeLessThan(r[s]);
      expect(r[s + 2]).toBeLessThan(r[s + 1]);
      expect(p[s]).toBeLessThan(Math.min(p[s + 1], p[s + 2], p[s + 3]));
      expect(p[s]).toBeLessThan(p[s - 1] - 100);
    }
  });
  it('heart: PR about 280 ms, 1:1, narrow QRS', () => {
    const e = ecgOf(blocksOf('r3', 'heart')[0].ecg);
    expect(Math.abs(e.truth!.prMs! - 280)).toBeLessThan(5);
    expect(e.truth!.qrsMs).toBeLessThan(110);
    expect(blocked(e).filter((a) => a.t < e.truth!.beats[e.truth!.beats.length - 1].qrsOn).length).toBe(0);
  });
  it('PR sweep notes: the read-out is over 200 and at most 300 ms at 220–300, over 300 at 301–360; always 1:1 with a narrow QRS', () => {
    for (const [v, lo, hi] of [[220, 200, 300], [300, 200, 300], [301, 300, 360], [360, 300, 360]] as const) {
      const e = played('r3', 0, v);
      expect(e.truth!.prMs!, `${v} ms`).toBeGreaterThan(lo);
      expect(e.truth!.prMs!, `${v} ms`).toBeLessThanOrEqual(hi);
      expect(e.truth!.qrsMs, `${v} ms`).toBeLessThan(110);
      expect(blocked(e).filter((a) => a.t < e.truth!.beats[e.truth!.beats.length - 1].qrsOn).length, `${v} ms`).toBe(0);
      expect(e.truth!.findings).toContain('av-block-1');
    }
  });
  it('checks: first degree and Mobitz I only', async () => {
    const ans = await checkAnswers('r3');
    expect(ans).toContain('av-block-1');
    expect(ans).toContain('av-block-2-mobitz1');
    expect(ans).not.toContain('av-block-high-grade');
  });
});

describe('r4: Mobitz II to complete block on the tracings', () => {
  it('hook: constant PR, dropped P waves, wide RBBB QRS', () => {
    const e = ecgOf(blocksOf('r4', 'hook')[0].ecg);
    const p = prs(e);
    expect(Math.max(...p) - Math.min(...p)).toBeLessThan(5);
    expect(blocked(e).length).toBeGreaterThanOrEqual(2);
    expect(e.truth!.qrsMs).toBeGreaterThanOrEqual(120);
    expect(e.truth!.findings).toContain('rbbb');
  });
  it('2:1 contrast: left narrow (PR 180 ms), right wide with a normal PR', () => {
    const c = blocksOf('r4', 'contrast')[0];
    const a = ecgOf(c.left.ecg).truth!;
    const b = ecgOf(c.right.ecg).truth!;
    expect(a.qrsMs).toBeLessThan(110);
    expect(Math.abs(a.prMs! - 180)).toBeLessThan(10);
    expect(b.qrsMs).toBeGreaterThanOrEqual(120);
    expect(b.prMs!).toBeLessThanOrEqual(200);
    for (const t of [a, b]) expect(Math.abs((t.atrialRateBpm ?? 0) / t.hrBpm - 2)).toBeLessThan(0.1);
  });
  it('high-grade (ladder film frame 4): 3:1 — runs of two blocked P waves, atria about 96/min, ventricles about 32/min', () => {
    const t = frames('r4', 0)[3].truth!;
    let run = 0;
    let maxRun = 0;
    for (const a of t.atrial) {
      run = a.conductedTo === null ? run + 1 : 0;
      maxRun = Math.max(maxRun, run);
    }
    expect(maxRun).toBe(2);
    expect(Math.abs(t.atrialRateBpm! - 96)).toBeLessThan(2);
    expect(Math.abs(t.hrBpm - 32)).toBeLessThan(1);
  });
  it('heart: P at 75/min, PR 160 ms on every conducted beat, every fourth P blocked, RBBB', () => {
    const e = ecgOf(blocksOf('r4', 'heart')[0].ecg);
    const t = e.truth!;
    expect(Math.abs(t.atrialRateBpm! - 75)).toBeLessThan(1);
    for (const p of prs(e)) expect(Math.abs(p - 160)).toBeLessThan(3);
    t.atrial.filter((a) => a.t < t.beats[t.beats.length - 1].qrsOn).forEach((a, i) => expect(a.conductedTo === null, `P ${i}`).toBe((i - 1) % 4 === 0));
    expect(t.qrsMs).toBeGreaterThanOrEqual(120);
    expect(t.findings).toContain('rbbb');
  });
  it('ladder film: first degree PR about 280 ms 1:1; Mobitz I PR about 150 → 235 → 280 then a drop, narrow; Mobitz II is the hook with a constant PR of about 160 ms and every fourth P dropped; third degree is the worked tracing', () => {
    const [first, m1, m2] = frames('r4', 0);
    expect(Math.abs(first.truth!.prMs! - 280)).toBeLessThan(5);
    for (const p of prs(first)) expect(Math.abs(p - 280)).toBeLessThan(3);
    expect(blocked(first).filter((a) => a.t < first.truth!.beats[first.truth!.beats.length - 1].qrsOn).length).toBe(0);
    const p1 = prs(m1);
    const resets = p1.flatMap((p, i) => (i > 0 && p < p1[i - 1] - 100 ? [i] : []));
    expect(resets.length).toBeGreaterThanOrEqual(2);
    for (const s of resets.filter((i) => i + 2 < p1.length)) [150, 235, 280].forEach((v, k) => expect(Math.abs(p1[s + k] - v), `beat ${s + k}`).toBeLessThan(5));
    expect(m1.truth!.qrsMs).toBeLessThan(110);
    const f = blocksOf('r4', 'film')[0].frames;
    expect(f[2].ecg).toEqual(blocksOf('r4', 'hook')[0].ecg);
    expect(f[4].ecg).toEqual(blocksOf('r4', 'worked')[0].ecg);
    for (const p of prs(m2)) expect(Math.abs(p - 160)).toBeLessThan(3);
    const t2 = m2.truth!;
    t2.atrial.filter((a) => a.t < t2.beats[t2.beats.length - 1].qrsOn).forEach((a, i) => expect(a.conductedTo === null, `P ${i}`).toBe((i - 1) % 4 === 0));
  });
  it('worked: complete block, narrow escape about 45/min, sinus about 78/min, no P conducts', () => {
    const t = ecgOf(blocksOf('r4', 'worked')[0].ecg).truth!;
    expect(Math.abs(t.hrBpm - 45)).toBeLessThan(2);
    expect(Math.abs((t.atrialRateBpm ?? 0) - 78)).toBeLessThan(3);
    expect(t.atrial.every((a) => a.conductedTo === null)).toBe(true);
  });
  it('infra-His complete block (complete-or-not film frame 1): P at about 78/min in every part of the cycle, none conducted; wide escape about 34/min', () => {
    const e = frames('r4', 1)[0];
    const t = e.truth!;
    expect(Math.abs(t.hrBpm - 34)).toBeLessThan(1);
    expect(Math.abs(t.atrialRateBpm! - 78)).toBeLessThan(1);
    expect(t.qrsMs).toBeGreaterThanOrEqual(120);
    expect(t.atrial.every((a) => a.conductedTo === null)).toBe(true);
    const on = onsets(e);
    const rr = rrs(e)[0];
    const phase = t.atrial.filter((a) => a.t > on[0] && a.t < on[on.length - 1]).map((a) => (a.t - Math.max(...on.filter((q) => q <= a.t))) / rr);
    expect(Math.max(...phase) - Math.min(...phase)).toBeGreaterThan(0.7);
  });
  it('complete-or-not film: AF with a regular escape at about 44/min; dissociation with sinus about 60, junction about 66 and early captures', () => {
    const [, af, diss] = frames('r4', 1);
    expect(af.truth!.rhythm).toBe('atrial-fibrillation');
    expect(af.truth!.findings).toContain('av-block-3');
    expect(Math.max(...rrs(af)) - Math.min(...rrs(af))).toBeLessThan(5);
    expect(Math.abs(af.truth!.hrBpm - 44)).toBeLessThan(1);
    const t = diss.truth!;
    expect(Math.abs(t.atrialRateBpm! - 60)).toBeLessThan(1);
    const junc = t.beats.flatMap((b, i) => (i > 0 && b.kind === 'escape-junctional' && t.beats[i - 1].kind === 'escape-junctional' ? [b.qrsOn - t.beats[i - 1].qrsOn] : []));
    for (const rr of junc) expect(Math.abs(60000 / rr - 66)).toBeLessThan(1);
    const caps = t.beats.flatMap((b, i) => (b.kind === 'sinus' && i > 0 ? [b.qrsOn - t.beats[i - 1].qrsOn] : []));
    expect(caps.length).toBeGreaterThanOrEqual(1);
    for (const c of caps) expect(c).toBeLessThan(Math.min(...junc) - 300);
  });
});

describe('r5: premature beats on the tracings', () => {
  it('PAC (three-questions film frame 1): an early P′ negative in II, P′R about 155 ms like the sinus PR, same QRS; less-than-compensatory pause', () => {
    const e = frames('r5', 0)[0];
    const beats = e.truth!.beats;
    const i = beats.findIndex((b) => b.kind === 'atrial');
    expect(i).toBe(5);
    expect(Math.abs(beats[i].qrsOn - (beats[i].pOn ?? 0) - e.truth!.prMs!)).toBeLessThan(15);
    expect(Math.abs(beats[i].qrsOn - (beats[i].pOn ?? 0) - 155)).toBeLessThan(5);
    expect(beats[i].qrsOn - beats[i - 1].qrsOn).toBeLessThan(0.8 * (beats[i - 1].qrsOn - beats[i - 2].qrsOn));
    expect(pAmp(e, 'II', beats[i])).toBeLessThan(0.03);
    expect(pAmp(e, 'II', beats[i], -1), 'P′ depth below baseline in II').toBeGreaterThan(0.04);
    expect(pAmp(e, 'II', beats[i - 1])).toBeGreaterThan(0.08);
    expect(Math.abs(beats[i].qrsOff - beats[i].qrsOn - (beats[0].qrsOff - beats[0].qrsOn))).toBeLessThan(3);
    expect(beats[i + 1].qrsOn - beats[i - 1].qrsOn).toBeLessThan(2 * (beats[i - 1].qrsOn - beats[i - 2].qrsOn) - 100);
    expect(markBeats('r5', 0, 0, 'p')).toEqual([i]);
    expect(markBeats('r5', 0, 0, 'pr')).toEqual([i]);
  });
  it('PVC (three-questions film frame 3): no P′, QRS about 175 ms, the R waves either side about two sinus cycles apart; V1 negative and II, III, aVF tall, no retrograde P (the heart caption)', () => {
    const e = frames('r5', 0)[2];
    expect(blocksOf('r5', 'film')[0].frames[2].ecg).toEqual(blocksOf('r5', 'heart')[0].ecg);
    const beats = e.truth!.beats;
    const i = beats.findIndex((b) => b.kind === 'ventricular');
    expect(i).toBe(5);
    expect(markBeats('r5', 0, 2, 'qrs')).toEqual([i]);
    expect(e.truth!.atrial.every((a) => a.kind === 'sinus'), 'this PVC does not reach the atria').toBe(true);
    expect(beats[i].pOn).toBeNull();
    expect(Math.abs(beats[i].qrsOff - beats[i].qrsOn - 175)).toBeLessThan(5);
    const pp = beats[i - 1].qrsOn - beats[i - 2].qrsOn;
    expect(Math.abs(beats[i + 1].qrsOn - beats[i - 1].qrsOn - 2 * pp)).toBeLessThan(60);
    expect(qrsSpan(e, 'V1', beats[i]).min).toBeLessThan(-3 * Math.max(0, qrsSpan(e, 'V1', beats[i]).max));
    for (const l of ['II', 'III', 'aVF'] as const) {
      expect(qrsSpan(e, l, beats[i]).max, l).toBeGreaterThan(0.8);
      expect(qrsSpan(e, l, beats[i]).max, l).toBeGreaterThan(qrsSpan(e, l, beats[i - 1]).max);
    }
  });
  it('PJC (three-questions film frame 2): narrow early beat, retrograde P′ just after the QRS (early ST), negative in II where the sinus beats have none', () => {
    const e = frames('r5', 0)[1];
    const t = e.truth!;
    const k = t.beats.findIndex((b) => b.kind === 'junctional');
    expect(markBeats('r5', 0, 1, 'st')).toEqual([k]);
    const j = t.beats[k];
    expect(j.qrsOff - j.qrsOn).toBeLessThan(110);
    const p = t.atrial.find((a) => a.kind === 'retrograde')!;
    expect(p.t).toBeGreaterThanOrEqual(j.qrsOff);
    expect(p.t).toBeLessThan(j.qrsOff + 40);
    const a = e.signal.leads.II;
    const fs = e.signal.fs;
    const earlySt = (b: BeatMarks) => {
      const base = baselineBefore(a, fs, b.qrsOn);
      return [40, 50].map((ms) => a[Math.round(((b.qrsOff + ms) * fs) / 1000)] - base);
    };
    expect(Math.min(...earlySt(j))).toBeLessThan(-0.04);
    const sinus = t.beats.filter((b) => b.kind === 'sinus' && b.qrsOff + 50 < e.signal.durationMs);
    expect(sinus.length).toBeGreaterThanOrEqual(5);
    for (const b of sinus) expect(Math.min(...earlySt(b)), `sinus beat at ${Math.round(b.qrsOn)} ms`).toBeGreaterThanOrEqual(0);
  });
  it('blocked-PAC bigeminy (grouping film frame 1): ventricles about 46/min, atria about 95/min, every P′ blocked', () => {
    const t = frames('r5', 1)[0].truth!;
    expect(Math.abs(t.hrBpm - 46)).toBeLessThan(1);
    expect(Math.abs((t.atrialRateBpm ?? 0) - 95)).toBeLessThan(1.5);
    expect(t.atrial.filter((a) => a.kind === 'ectopic').every((a) => a.conductedTo === null)).toBe(true);
  });
  it('grouping film: bigeminy with a fixed coupling of about 480 ms; trigeminy with two alternating PVC shapes in II; a couplet; each mark sits on the beats its note names', () => {
    const [, big, tri, cp] = frames('r5', 1);
    const kinds = (e: Ecg) => e.truth!.beats.map((b) => (b.kind === 'ventricular' ? 'V' : 'S')).join('');
    expect(kinds(big)).toMatch(/^(VS)+V?$|^(SV)+S?$/);
    const t = big.truth!.beats;
    for (let i = 1; i < t.length; i++) if (t[i].kind === 'ventricular') expect(Math.abs(t[i].qrsOn - t[i - 1].qrsOn - 480)).toBeLessThan(5);
    const coupling = markBeats('r5', 1, 1, 'rr');
    expect(coupling).toHaveLength(1);
    const [c] = coupling;
    expect([t[c].kind, t[c + 1].kind], 'the bracket runs from a sinus beat to its PVC').toEqual(['sinus', 'ventricular']);
    expect(Math.abs(t[c + 1].qrsOn - t[c].qrsOn - 480)).toBeLessThan(5);
    expect(kinds(tri)).toMatch(/^S*(SSV)+S*$/);
    const pv = tri.truth!.beats.filter((b) => b.kind === 'ventricular' && b.qrsOff < 9800).map((b) => qrsSpan(tri, 'II', b).max);
    expect(pv.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < pv.length; i++) expect(Math.abs(pv[i] - pv[i - 1])).toBeGreaterThan(0.4);
    for (let i = 2; i < pv.length; i++) expect(Math.abs(pv[i] - pv[i - 2])).toBeLessThan(0.05);
    const tb = tri.truth!.beats;
    const shapes = markBeats('r5', 1, 2, 'qrs');
    expect(shapes).toHaveLength(2);
    for (const k of shapes) expect(tb[k].kind, `marked beat ${k}`).toBe('ventricular');
    expect(shapes[1] - shapes[0], 'two consecutive PVCs').toBe(3);
    expect(Math.abs(qrsSpan(tri, 'II', tb[shapes[0]]).max - qrsSpan(tri, 'II', tb[shapes[1]]).max), 'one tall, one short in II').toBeGreaterThan(0.4);
    expect(kinds(cp)).toContain('SVVS');
    expect(kinds(cp)).not.toContain('VVV');
    expect(cp.truth!.findings).toContain('ventricular-couplet');
    const cb = cp.truth!.beats;
    const pair = markBeats('r5', 1, 3, 'qrs');
    expect(pair).toHaveLength(2);
    expect(pair[1]).toBe(pair[0] + 1);
    expect([cb[pair[0] - 1], cb[pair[0]], cb[pair[1]], cb[pair[1] + 1]].map((b) => b.kind), 'the marks cover the couplet').toEqual(['sinus', 'ventricular', 'ventricular', 'sinus']);
  });
  it('contrast: aberrant PAC is wide with an R′ in V1 after an early P′; the PVC pause is fully compensatory', () => {
    const c = blocksOf('r5', 'contrast')[0];
    const a = ecgOf(c.left.ecg);
    const ab = a.truth!.beats.find((b) => b.aberrant)!;
    expect(ab.qrsOff - ab.qrsOn).toBeGreaterThanOrEqual(120);
    expect(ab.pOn).not.toBeNull();
    expect(hasRPrime(a, 'V1', ab)).toBe(true);
    const beats = ecgOf(c.right.ecg).truth!.beats;
    const i = beats.findIndex((b) => b.kind === 'ventricular');
    const pp = beats[i - 1].qrsOn - beats[i - 2].qrsOn;
    expect(Math.abs(beats[i + 1].qrsOn - beats[i - 1].qrsOn - 2 * pp)).toBeLessThan(60);
  });
});

describe('r6: bundle branch block on the tracings', () => {
  it('hook: RBBB — QRS ≥ 120, a late dominant R′ in V1 (R-peak time > 50 ms), S in I and V6', () => {
    const e = ecgOf(blocksOf('r6', 'hook')[0].ecg);
    const b = mid(e);
    expect(e.truth!.qrsMs).toBeGreaterThanOrEqual(120);
    const v1 = e.signal.leads.V1;
    const fs = e.signal.fs;
    let k = Math.round((b.qrsOn * fs) / 1000);
    for (let i = k; i <= Math.round((b.qrsOff * fs) / 1000); i++) if (v1[i] > v1[k]) k = i;
    expect((k * 1000) / fs - b.qrsOn).toBeGreaterThan(50);
    expect(qrsSpan(e, 'V1', b).max).toBeGreaterThan(-qrsSpan(e, 'V1', b).min);
    for (const l of ['I', 'V6'] as const) expect(qrsSpan(e, l, b).min, l).toBeLessThan(-0.1);
  });
  it('RBBB tracings (hook, worked, contrast A): V1 is rsR′ — the s dips below the baseline before the tall R′', () => {
    for (const src of [blocksOf('r6', 'hook')[0].ecg, blocksOf('r6', 'worked')[0].ecg, blocksOf('r6', 'contrast')[0].left.ecg]) {
      const e = ecgOf(src);
      const b = mid(e);
      const w = qrsWaves(e.signal.leads.V1, e.signal.fs, b.qrsOn, b.qrsOff);
      expect(w.map((x) => x.label.toLowerCase().replace(/′/g, "'")).join(' ')).toMatch(/^r s r'$/);
      expect(w[1].mv).toBeLessThan(-0.15);
      expect(w[2].mv).toBeGreaterThan(w[0].mv);
    }
  });
  it('worked: LBBB — QRS ≥ 120, V1 mainly negative, no q in I or V6', () => {
    const e = ecgOf(blocksOf('r6', 'worked')[0].ecg);
    const b = mid(e);
    expect(e.truth!.qrsMs).toBeGreaterThanOrEqual(120);
    const v1 = qrsSpan(e, 'V1', b);
    expect(-v1.min).toBeGreaterThan(3 * Math.max(0, v1.max));
    for (const l of ['I', 'V6'] as const) expect(shape(e, l, b).startsWith('q'), l).toBe(false);
  });
  const v1Waves = (e: Ecg) => {
    const b = mid(e);
    return qrsWaves(e.signal.leads.V1, e.signal.fs, b.qrsOn, b.qrsOff);
  };
  it('QRS sweep notes: the read-out is ≥120 ms from 125 to 160 and grows; V1 stays r s R′ with the s below the baseline and the R′ far taller than the r', () => {
    let last = 0;
    for (const v of [125, 139, 140, 160]) {
      const e = played('r6', 0, v);
      expect(e.truth!.qrsMs, `${v} ms`).toBeGreaterThanOrEqual(120);
      expect(Math.abs(e.truth!.qrsMs - v), `${v} ms`).toBeLessThan(3);
      expect(e.truth!.qrsMs, `${v} ms`).toBeGreaterThan(last);
      last = e.truth!.qrsMs;
      const w = v1Waves(e);
      expect(w.map((x) => x.label.toLowerCase().replace(/′/g, "'")).join(' '), `${v} ms`).toMatch(/^r s r'$/);
      expect(w[1].mv, `${v} ms`).toBeLessThan(-0.15);
      expect(w[2].mv, `${v} ms`).toBeGreaterThan(4 * w[0].mv);
      expect(e.truth!.findings).toContain('rbbb');
    }
  });
  it('width film: complete RBBB is the sweep start, global QRS about 125 ms with a broad S in I and V6; incomplete RBBB rsR′ at about 114 ms', () => {
    const [full, inc] = frames('r6', 0);
    expect(full).toBe(played('r6', 0, 125));
    expect(Math.abs(full.truth!.qrsMs - 125)).toBeLessThan(5);
    for (const l of ['I', 'V6'] as const) expect(qrsSpan(full, l, mid(full)).min, l).toBeLessThan(-0.1);
    expect(Math.abs(inc.truth!.qrsMs - 114)).toBeLessThan(5);
    expect(v1Waves(inc).map((x) => x.label.toLowerCase().replace(/′/g, "'")).join(' ')).toMatch(/^r s r'$/);
  });
  it('LBBB heart: QRS ≥120, V1 and V2 dominated by a deep S, no q and a dominant R in I, V5 and V6', () => {
    const e = ecgOf(blocksOf('r6', 'heart')[1].ecg);
    const b = mid(e);
    expect(e.truth!.qrsMs).toBeGreaterThanOrEqual(120);
    for (const l of ['V1', 'V2'] as const) expect(-qrsSpan(e, l, b).min, l).toBeGreaterThan(3 * qrsSpan(e, l, b).max);
    for (const l of ['I', 'V5', 'V6'] as const) {
      expect(shape(e, l, b).startsWith('q'), l).toBe(false);
      expect(qrsSpan(e, l, b).max, l).toBeGreaterThan(3 * -qrsSpan(e, l, b).min);
    }
  });
  it('RBBB heart: late R′ in V1, broad S in V6', () => {
    const e = ecgOf(blocksOf('r6', 'heart')[0].ecg);
    expect(v1Waves(e).map((x) => x.label.toLowerCase().replace(/′/g, "'")).join(' ')).toMatch(/^r s r'$/);
    expect(qrsSpan(e, 'V6', mid(e)).min).toBeLessThan(-0.1);
  });
  it('rate-dependent LBBB (width film frame 3): wide beats end shorter cycles than narrow ones; same PR', () => {
    const e = frames('r6', 0)[2];
    const beats = e.truth!.beats;
    const cyc = beats.slice(1).map((b, i) => ({ rr: b.qrsOn - beats[i].qrsOn, wide: b.aberrant }));
    expect(Math.max(...cyc.filter((c) => c.wide).map((c) => c.rr))).toBeLessThan(Math.min(...cyc.filter((c) => !c.wide).map((c) => c.rr)));
    const p = prs(e);
    expect(Math.max(...p) - Math.min(...p)).toBeLessThan(5);
  });
  it('incomplete RBBB (width film frame 2): QRS 110–119 ms', () => {
    const t = frames('r6', 0)[1].truth!;
    expect(t.qrsMs).toBeGreaterThanOrEqual(110);
    expect(t.qrsMs).toBeLessThan(120);
  });
  it('checks: RBBB and LBBB (bifascicular block belongs to r7)', async () => {
    const ans = await checkAnswers('r6');
    expect(ans).toContain('rbbb');
    expect(ans).toContain('lbbb');
    expect(ans).not.toContain('bifascicular-block');
  });
});

describe('r7: fascicular blocks on the tracings', () => {
  it('LAFB: axis about −60°, QRS < 120, qR in aVL, rS in II/III/aVF', () => {
    const e = ecgOf(blocksOf('r7', 'worked')[0].ecg);
    const b = mid(e);
    expect(Math.abs(e.truth!.axisDeg.qrs + 60)).toBeLessThan(8);
    expect(e.truth!.qrsMs).toBeLessThan(120);
    expect(shape(e, 'aVL', b)).toBe('qr');
    for (const l of ['II', 'III', 'aVF'] as const) expect(shape(e, l, b), l).toBe('rs');
  });
  it('LPFB: axis between +90 and +180, rS in I', () => {
    const e = ecgOf(blocksOf('r7', 'contrast')[0].right.ecg);
    expect(e.truth!.axisDeg.qrs).toBeGreaterThan(90);
    expect(shape(e, 'I', mid(e))).toBe('rs');
  });
  it('long PR vs Mobitz II: both RBBB + LAFB with PR about 260; only B drops P waves, at a constant PR', () => {
    const c = blocksOf('r7', 'contrast')[1];
    const a = ecgOf(c.left.ecg);
    const b = ecgOf(c.right.ecg);
    for (const e of [a, b]) {
      expect(Math.abs(e.truth!.prMs! - 260)).toBeLessThan(10);
      expect(e.truth!.findings).toEqual(expect.arrayContaining(['rbbb', 'lafb']));
    }
    const inStrip = (e: Ecg) => blocked(e).filter((x) => x.t < e.truth!.beats[e.truth!.beats.length - 1].qrsOn);
    expect(inStrip(a).length).toBe(0);
    expect(inStrip(b).length).toBeGreaterThanOrEqual(2);
    const p = prs(b);
    expect(Math.max(...p) - Math.min(...p)).toBeLessThan(5);
  });
  it('IVCD (the sweep at 124 ms): QRS about 125 ms, no R′ in V1', () => {
    const e = played('r7', 1, 124);
    expect(Math.abs(e.truth!.qrsMs - 125)).toBeLessThan(6);
    expect(hasRPrime(e, 'V1', mid(e))).toBe(false);
  });
  it('LAFB sweep notes: the read-out follows the dial from −50° to −80°; I positive, rS in II, III, aVF, qR in aVL, QRS < 120 throughout; the S in II deepens', () => {
    let s = 0;
    for (const v of [-50, -60, -61, -80]) {
      const e = played('r7', 0, v);
      const b = mid(e);
      expect(Math.abs(e.truth!.axisDeg.qrs - v), `${v}°`).toBeLessThan(1.5);
      expect(e.truth!.qrsMs, `${v}°`).toBeLessThan(120);
      expect(qrsSpan(e, 'I', b).max, `${v}° I`).toBeGreaterThan(-qrsSpan(e, 'I', b).min);
      for (const l of ['II', 'III', 'aVF'] as const) expect(shape(e, l, b), `${v}° ${l}`).toBe('rs');
      expect(shape(e, 'aVL', b), `${v}° aVL`).toBe('qr');
      const sII = -qrsSpan(e, 'II', b).min;
      expect(sII, `${v}° S in II`).toBeGreaterThan(s);
      s = sII;
    }
  });
  it('IVCD sweep notes: the read-out is over 110 ms from 112 to 135; V1 has no R′, I and V6 no broad S, V6 keeps a small q; never RBBB or LBBB', () => {
    for (const v of [112, 123, 124, 135]) {
      const e = played('r7', 1, v);
      const b = mid(e);
      expect(e.truth!.qrsMs, `${v} ms`).toBeGreaterThan(110);
      expect(Math.abs(e.truth!.qrsMs - v), `${v} ms`).toBeLessThan(2);
      expect(hasRPrime(e, 'V1', b), `${v} ms`).toBe(false);
      for (const l of ['I', 'V6'] as const) expect(qrsSpan(e, l, b).min, `${v} ms ${l}`).toBeGreaterThan(-0.1);
      expect(shape(e, 'V6', b).startsWith('q'), `${v} ms`).toBe(true);
      expect(e.truth!.findings, `${v} ms`).toContain('ivcd');
      expect(e.truth!.findings, `${v} ms`).not.toContain('rbbb');
      expect(e.truth!.findings, `${v} ms`).not.toContain('lbbb');
    }
  });
  it('bifascicular film: RBBB + LAFB with rsR′ in V1, broad S in I and V6, axis about −70°; RBBB + LPFB with a broad R in V1 (R peak > 50 ms), rS in I and aVL, qR in III, axis about +95°', () => {
    const [laf, lpf] = frames('r7', 0);
    expect(blocksOf('r7', 'film')[0].frames[0].ecg).toEqual(blocksOf('r7', 'heart')[1].ecg);
    const b1 = mid(laf);
    expect(hasRPrime(laf, 'V1', b1)).toBe(true);
    for (const l of ['I', 'V6'] as const) expect(qrsSpan(laf, l, b1).min, l).toBeLessThan(-0.2);
    expect(Math.abs(laf.truth!.axisDeg.qrs + 70)).toBeLessThan(5);
    expect(laf.truth!.findings).toEqual(expect.arrayContaining(['rbbb', 'lafb']));
    const b2 = mid(lpf);
    expect(lpf.truth!.findings).toEqual(expect.arrayContaining(['rbbb', 'lpfb']));
    expect(lpf.truth!.qrsMs).toBeGreaterThanOrEqual(120);
    expect(qrsSpan(lpf, 'V1', b2).max).toBeGreaterThan(3 * Math.max(0.01, -qrsSpan(lpf, 'V1', b2).min));
    const v1 = lpf.signal.leads.V1;
    let k = Math.round((b2.qrsOn * lpf.signal.fs) / 1000);
    for (let i = k; i <= Math.round((b2.qrsOff * lpf.signal.fs) / 1000); i++) if (v1[i] > v1[k]) k = i;
    expect((k * 1000) / lpf.signal.fs - b2.qrsOn).toBeGreaterThan(50);
    for (const l of ['I', 'aVL'] as const) expect(shape(lpf, l, b2), l).toBe('rs');
    expect(shape(lpf, 'III', b2)).toBe('qr');
    expect(Math.abs(lpf.truth!.axisDeg.qrs - 95)).toBeLessThan(5);
  });
});

describe('r8: ladders on the tracings', () => {
  it('5:4 Wenckebach: four conducted beats per cycle with a lengthening PR', () => {
    const e = ecgOf(blocksOf('r8', 'worked')[0].ecg);
    const beats = e.truth!.beats;
    const k = rrs(e).findIndex((x) => x > 1200);
    const cycle = beats.slice(k + 1, k + 5).map((b) => b.qrsOn - (b.pOn ?? 0));
    expect(cycle.length).toBe(4);
    for (let i = 1; i < cycle.length; i++) expect(cycle[i]).toBeGreaterThan(cycle[i - 1]);
  });
  it('dissociation ladder: sinus about 60/min, junction about 66/min, with at least one capture', () => {
    const fig = blocksOf('r8', 'figure').find((b) => b.ecg?.kind === 'synth' && b.ecg.req.scenario === 'av-dissociation');
    const t = ecgOf(fig?.ecg).truth!;
    expect(Math.abs((t.atrialRateBpm ?? 0) - 60)).toBeLessThan(1);
    const junc = t.beats.flatMap((b, i) => (i > 0 && b.kind === 'escape-junctional' && t.beats[i - 1].kind === 'escape-junctional' ? [b.qrsOn - t.beats[i - 1].qrsOn] : []));
    for (const rr of junc) expect(Math.abs(60000 / rr - 66)).toBeLessThan(1);
    expect(t.beats.some((b) => b.kind === 'sinus')).toBe(true);
  });
  it('bigeminy ladder: every other beat ventricular with no P, the sinus P on time through each PVC (fully compensatory)', () => {
    const fig = blocksOf('r8', 'figure').find((b) => b.ecg?.kind === 'synth' && b.ecg.req.scenario === 'ventricular-bigeminy');
    const t = ecgOf(fig?.ecg).truth!;
    t.beats.forEach((b, i) => expect(b.kind, `beat ${i}`).toBe(i % 2 ? 'ventricular' : 'sinus'));
    const pp = t.atrial.slice(1).map((a, i) => a.t - t.atrial[i].t);
    expect(Math.max(...pp) - Math.min(...pp)).toBeLessThan(60);
    for (let i = 1; i + 1 < t.beats.length; i += 2) expect(t.beats[i].pOn).toBeNull();
  });
  it('five-lines film: first degree PR about 280 ms 1:1; Wenckebach PR about 150 → 235 → 275 then a drop; Mobitz II PR about 160 ms with every fourth P dropped and a wide QRS; third degree P about 78 vs QRS about 45, none conducted; PJC with a retrograde P′ after it; AIVR with a narrow capture and a fusion beat', () => {
    const [first, m1, m2, third, pjc, aivr] = frames('r8', 0);
    for (const p of prs(first)) expect(Math.abs(p - 280)).toBeLessThan(3);
    expect(blocked(first).filter((a) => a.t < first.truth!.beats[first.truth!.beats.length - 1].qrsOn).length).toBe(0);
    const p1 = prs(m1);
    const resets = p1.flatMap((p, i) => (i > 0 && p < p1[i - 1] - 100 ? [i] : []));
    expect(resets.length).toBeGreaterThanOrEqual(2);
    for (const s of resets.filter((i) => i + 2 < p1.length)) [150, 235, 275].forEach((v, k) => expect(Math.abs(p1[s + k] - v), `beat ${s + k}`).toBeLessThan(5));
    for (const p of prs(m2)) expect(Math.abs(p - 160)).toBeLessThan(3);
    const t2 = m2.truth!;
    t2.atrial.filter((a) => a.t < t2.beats[t2.beats.length - 1].qrsOn).forEach((a, i) => expect(a.conductedTo === null, `P ${i}`).toBe((i - 1) % 4 === 0));
    expect(t2.qrsMs).toBeGreaterThanOrEqual(120);
    expect(Math.abs(third.truth!.atrialRateBpm! - 78)).toBeLessThan(1);
    expect(Math.abs(third.truth!.hrBpm - 45)).toBeLessThan(1);
    expect(third.truth!.atrial.every((a) => a.conductedTo === null)).toBe(true);
    const j = pjc.truth!.beats[5];
    expect(j.kind).toBe('junctional');
    expect(pjc.truth!.atrial.some((a) => a.kind === 'retrograde' && a.t >= j.qrsOff && a.t < j.qrsOff + 40)).toBe(true);
    const [cap, fus] = [aivr.truth!.beats[5], aivr.truth!.beats[6]];
    expect([cap.kind, fus.kind]).toEqual(['capture', 'fusion']);
    expect(cap.qrsOff - cap.qrsOn).toBeLessThan(110);
  });
});
