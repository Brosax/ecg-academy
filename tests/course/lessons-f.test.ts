/**
 * Stage F lessons (src/course/lessons/f1.ts … f6.ts): what the validator checks (schema, ids, translations), plus what
 * it cannot see —
 *  - every synthetic request actually generates (placement overrides included) and records the leads it names;
 *  - every AutoMark finds its wave on the tracing it annotates, inside the visible window;
 *  - live-block dials are realised by the engine;
 *  - check families are available today and generate; inline answer keys grade as correct;
 *  - every drill has at least one available family; real cases are clean normal ECGs;
 *  - the text is complete in zh / en / es, uses current terminology and Spain Spanish number style;
 *  - what the text says is on a tracing is measurably there (rate, PR, QRS, flat leads, inverted leads, R progression…).
 */
import { describe, expect, it } from 'vitest';
import type { Block, Lesson, LessonMark } from '../../src/course/api';
import { liveValidateDeps } from '../../src/course/deps';
import { LESSONS } from '../../src/course/lessons/index';
import f1 from '../../src/course/lessons/f1';
import f2 from '../../src/course/lessons/f2';
import f3 from '../../src/course/lessons/f3';
import f4 from '../../src/course/lessons/f4';
import f5 from '../../src/course/lessons/f5';
import f6 from '../../src/course/lessons/f6';
import { realisedDials, startDials } from '../../src/course/live';
import { baselineBefore, isAutoMark, resolveMarks } from '../../src/course/marks';
import { formatIssues, validateLesson } from '../../src/course/validate';
import type { BeatMarks, Ecg } from '../../src/core/ecg';
import type { L10n } from '../../src/core/l10n';
import type { Lead, StdLead } from '../../src/core/leads';
import type { EcgMark } from '../../src/ecg/api';
import { familyAvailable, generateItem, gradeItem } from '../../src/practice';
import type { EcgSource, Item, ItemView } from '../../src/practice/api';
import { getCase } from '../../src/real';
import { generate, scenarios, type SynthRequest } from '../../src/synth';

const F: readonly Lesson[] = [f1, f2, f3, f4, f5, f6];

// ── helpers ───────────────────────────────────────────────────────────────────────────────────────────────────────

const cache = new Map<string, Ecg>();
function ecgOf(req: SynthRequest): Ecg {
  const k = JSON.stringify(req);
  let e = cache.get(k);
  if (!e) {
    e = generate(req).ecg;
    cache.set(k, e);
  }
  return e;
}
const synthReq = (src: EcgSource): SynthRequest => {
  if (src.kind !== 'synth') throw new Error('expected a synthetic source');
  return src.req;
};
const ecgAt = (src: EcgSource): Ecg => ecgOf(synthReq(src));

type BlockOf<K extends Block['kind']> = Extract<Block, { kind: K }>;
function blocks<K extends Block['kind']>(lesson: Lesson, kind: K): BlockOf<K>[] {
  return lesson.blocks.filter((b): b is BlockOf<K> => b.kind === kind);
}
function inlineItems(lesson: Lesson): Item[] {
  return blocks(lesson, 'check').flatMap((b) => ('inline' in b.item ? [b.item.inline] : []));
}
const itemBySeed = (lesson: Lesson, seed: number): Item => {
  const it = inlineItems(lesson).find((x) => x.seed === seed);
  if (!it) throw new Error(`${lesson.id}: no inline item with seed ${seed}`);
  return it;
};

/** One place a lesson shows an ECG (with the view and marks it is shown with). */
interface Use {
  readonly path: string;
  readonly src: EcgSource;
  readonly view?: ItemView;
  readonly marks?: readonly LessonMark[];
  readonly leads: readonly Lead[];
}

function leadsNamed(view?: ItemView, marks?: readonly LessonMark[], extra?: readonly Lead[]): Lead[] {
  const fromMarks = (marks ?? []).flatMap((m) => {
    const ld = (m as { lead?: Lead | 'all' }).lead;
    return ld && ld !== 'all' ? [ld] : [];
  });
  return [...(view?.lead ? [view.lead] : []), ...(view?.highlightLeads ?? []), ...fromMarks, ...(extra ?? [])];
}

function uses(lesson: Lesson): Use[] {
  const out: Use[] = [];
  lesson.blocks.forEach((b, i) => {
    const p = `blocks[${i}]`;
    switch (b.kind) {
      case 'hook':
        out.push({ path: p, src: b.ecg, view: b.view, leads: leadsNamed(b.view) });
        break;
      case 'ecg':
        out.push({ path: p, src: b.ecg, view: b.view, marks: b.marks, leads: leadsNamed(b.view, b.marks) });
        break;
      case 'figure':
        if (b.ecg) out.push({ path: p, src: b.ecg, leads: [] });
        break;
      case 'heart':
        out.push({ path: p, src: b.ecg, leads: [] });
        break;
      case 'worked':
        b.steps.forEach((s, k) => {
          const v = s.view ?? b.view;
          out.push({ path: `${p}.steps[${k}]`, src: b.ecg, view: v, marks: s.marks, leads: leadsNamed(v, s.marks, s.highlightLeads) });
        });
        break;
      case 'contrast':
        for (const side of ['left', 'right'] as const) {
          out.push({ path: `${p}.${side}`, src: b[side].ecg, view: b.view, marks: b[side].marks, leads: leadsNamed(b.view, b[side].marks) });
        }
        break;
      case 'check':
        if ('inline' in b.item) {
          const it = b.item.inline;
          const targets = it.kind === 'locate' ? it.key.targets.flatMap((t) => (t.lead === 'any' ? [] : [t.lead])) : [];
          out.push({ path: `${p}.item.inline`, src: it.ecg, view: it.view, leads: leadsNamed(it.view, undefined, targets) });
          if (it.kind === 'compare') out.push({ path: `${p}.item.inline.ecg2`, src: it.ecg2, leads: [] });
        }
        break;
      default:
        break;
    }
  });
  return out;
}

/** Times of a resolved viewer mark (null for marks without a time). */
function markSpan(m: EcgMark): readonly [number, number] | null {
  if (m.kind === 'bracket' || m.kind === 'region') return [m.t0, m.t1];
  if (m.kind === 'wave' || m.kind === 'arrow') return [m.t, m.t];
  return null;
}

/** Every L10n object inside a value, with its path. */
function texts(v: unknown, path = ''): { readonly path: string; readonly t: L10n }[] {
  if (Array.isArray(v)) return v.flatMap((x, i) => texts(x, `${path}[${i}]`));
  if (typeof v !== 'object' || v === null) return [];
  const o = v as Record<string, unknown>;
  if (typeof o.zh === 'string' && typeof o.en === 'string' && typeof o.es === 'string') return [{ path, t: o as unknown as L10n }];
  return Object.entries(o).flatMap(([k, x]) => texts(x, path ? `${path}.${k}` : k));
}

// signal measurements on one beat (mV, relative to the PR baseline before the QRS)
const LIMB: readonly StdLead[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];
const CHEST: readonly StdLead[] = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
const midBeat = (ecg: Ecg): BeatMarks => {
  const bs = ecg.truth!.beats;
  return bs[Math.floor(bs.length / 2)];
};
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
const tPeak = (ecg: Ecg, lead: StdLead, b = midBeat(ecg)) => {
  if (b.tPeak === null) throw new Error('beat without a T peak');
  const a = ecg.signal.leads[lead];
  return a[Math.round((b.tPeak * ecg.signal.fs) / 1000)] - baselineBefore(a, ecg.signal.fs, b.qrsOn);
};
/** the limb lead whose QRS is closest to equiphasic (smallest |net| relative to its size) */
const mostEquiphasic = (ecg: Ecg): StdLead =>
  LIMB.reduce((best, l) => {
    const s = qrs(ecg, l);
    const r = Math.abs(s.net) / s.p2p;
    const q = qrs(ecg, best);
    return r < Math.abs(q.net) / q.p2p ? l : best;
  });
const sameTrace = (a: Float32Array, b: Float32Array): boolean => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 1e-9);

// ── every stage-F lesson ──────────────────────────────────────────────────────────────────────────────────────────

describe('stage F lessons', () => {
  it('all six exist, are registered under their file names and are in order', () => {
    expect(F.map((x) => x.id)).toEqual(['f1', 'f2', 'f3', 'f4', 'f5', 'f6']);
    for (const lesson of F) {
      expect(LESSONS.get(lesson.id)).toBe(lesson);
      expect(lesson.stage).toBe('F');
      expect(lesson.order).toBe(Number(lesson.id.slice(1)));
    }
  });
});

describe.each(F.map((x) => [x.id, x] as const))('%s', (id, lesson) => {
  it('validates against the live catalogues: no errors, no warnings', () => {
    expect(formatIssues(validateLesson(lesson, liveValidateDeps(id)))).toBe('');
  });

  it('opens with a hook (attempt first) and ends with a 3–5 point summary', () => {
    expect(lesson.blocks[0].kind).toBe('hook');
    const last = lesson.blocks[lesson.blocks.length - 1];
    expect(last.kind).toBe('summary');
    if (last.kind === 'summary') expect(last.points.length).toBeGreaterThanOrEqual(3);
  });

  it('every synthetic ECG generates and records every lead the lesson names', () => {
    for (const u of uses(lesson)) {
      if (u.src.kind !== 'synth') continue;
      const ecg = ecgAt(u.src);
      expect(ecg.truth, u.path).not.toBeNull();
      for (const ld of u.leads) expect(ecg.signal.leads[ld as StdLead], `${u.path}: lead ${ld}`).toBeInstanceOf(Float32Array);
    }
  });

  it('every AutoMark finds its wave on the tracing, inside the shown window', () => {
    for (const u of uses(lesson)) {
      if (!u.marks || u.src.kind !== 'synth') continue;
      const ecg = ecgAt(u.src);
      const o = { layout: u.view?.layout ?? '3x4+1', window: u.view?.window, lead: u.view?.lead } as const;
      u.marks.forEach((m, k) => {
        if (!isAutoMark(m)) return;
        const at = `${u.path}.marks[${k}] (${m.auto} ${m.lead ?? 'II'})`;
        const r = resolveMarks(ecg, [m], o);
        expect(r.length, at).toBeGreaterThan(0);
        const w = u.view?.window;
        if (w) {
          for (const x of r) {
            const s = markSpan(x);
            if (s) expect(s[0] >= w[0] && s[1] <= w[1], `${at}: ${s.join('–')} ms outside the window ${w.join('–')}`).toBe(true);
          }
        }
      });
    }
  });

  it('labelled brackets and regions on one tracing do not crowd each other (≥ 150 ms apart in a lead)', () => {
    const spans = (ecg: Ecg, marks: readonly LessonMark[], view?: ItemView) => {
      const o = { layout: view?.layout ?? '3x4+1', window: view?.window, lead: view?.lead } as const;
      return resolveMarks(ecg, marks, o).flatMap((m) => (m.kind === 'bracket' || m.kind === 'region' ? [{ lead: m.lead, t0: m.t0, t1: m.t1 }] : []));
    };
    const check = (at: string, xs: readonly { lead: Lead | 'all'; t0: number; t1: number }[]) => {
      for (let i = 0; i < xs.length; i++)
        for (let j = i + 1; j < xs.length; j++) {
          const a = xs[i];
          const b = xs[j];
          if (a.lead !== b.lead && a.lead !== 'all' && b.lead !== 'all') continue;
          const gap = Math.max(a.t0, b.t0) - Math.min(a.t1, b.t1);
          expect(gap, `${at}: marks ${i} and ${j} in ${a.lead}`).toBeGreaterThanOrEqual(150);
        }
    };
    for (const u of uses(lesson)) if (u.marks && u.src.kind === 'synth') check(u.path, spans(ecgAt(u.src), u.marks, u.view));
    for (const b of blocks(lesson, 'live')) {
      const sc = scenarios().find((s) => s.id === b.scenario)!;
      const ids = b.dials.map((d) => d.id);
      for (const pick of ['min', 'max'] as const) {
        const dials = { ...startDials(sc, b.variant, ids), ...Object.fromEntries(ids.map((id) => [id, sc.dials[id]![pick]])) };
        check(`live ${b.scenario} at ${pick}`, spans(generate({ scenario: b.scenario, variant: b.variant, seed: b.seed, dials }).ecg, b.marks ?? [], b.view));
      }
    }
  });

  it('live blocks: every dial is realised by the engine and every mark resolves', () => {
    for (const b of blocks(lesson, 'live')) {
      const sc = scenarios().find((s) => s.id === b.scenario);
      expect(sc, b.scenario).toBeDefined();
      if (!sc) continue;
      const ids = b.dials.map((d) => d.id);
      const res = generate({ scenario: b.scenario, variant: b.variant, seed: b.seed, dials: startDials(sc, b.variant, ids) });
      expect(realisedDials(ids, res.applied)).toEqual(ids);
      const o = { layout: b.view?.layout ?? '3x4+1', window: b.view?.window, lead: b.view?.lead } as const;
      for (const m of b.marks ?? []) if (isAutoMark(m)) expect(resolveMarks(res.ecg, [m], o).length, `${b.scenario} ${m.auto}`).toBeGreaterThan(0);
      // the extremes of every dial generate too
      for (const id of ids) {
        const r = sc.dials[id]!;
        for (const v of [r.min, r.max]) expect(() => generate({ scenario: b.scenario, variant: b.variant, seed: b.seed, dials: { [id]: v } }), `${id}=${v}`).not.toThrow();
      }
    }
  });

  it('check blocks: families are available and generate; inline keys grade as correct', async () => {
    for (const b of blocks(lesson, 'check')) {
      if ('family' in b.item) {
        expect(familyAvailable(b.item.family), b.item.family).toBe(true);
        const item = await generateItem(b.item.family, b.item.seed, b.item.difficulty);
        expect(item.family).toBe(b.item.family);
        continue;
      }
      const it = b.item.inline;
      expect(it.id).toBe(`${it.family}:classic:${it.seed}`);
      expect(familyAvailable(it.family) || it.family === 'artefacts', `${it.id}: family exists`).toBe(true);
      if (it.kind === 'choice') {
        expect(gradeItem(it, { kind: 'choice', id: it.key.correct }).verdict, it.id).toBe('correct');
        const wrong = it.key.options.find((x) => x.id !== it.key.correct)!;
        expect(gradeItem(it, { kind: 'choice', id: wrong.id }).verdict, it.id).toBe('incorrect');
      } else if (it.kind === 'locate') {
        const t = it.key.targets[0];
        expect(t.lead).not.toBe('any');
        const picks = [{ lead: t.lead as Lead, tMs: (t.t0 + t.t1) / 2 }];
        expect(gradeItem(it, { kind: 'picks', picks }).verdict, it.id).toBe('correct');
      }
    }
  });

  it('every drill has at least one family that can produce items today', () => {
    for (const b of blocks(lesson, 'drill')) expect(b.families.some((f) => familyAvailable(f)), b.families.join(', ')).toBe(true);
  });

  it('real cases are clean normal ECGs (PTB-XL class NORM)', () => {
    for (const b of blocks(lesson, 'real')) for (const x of b.ids) expect(getCase(x)?.cls, `case ${x}`).toBe('NORM');
  });

  it('text: zh / en / es complete and translated, current terms, Spain-Spanish numbers', () => {
    const OUTDATED: Readonly<Record<'zh' | 'en' | 'es', RegExp>> = {
      zh: /半支阻滞|心房肥大|类本位曲折|病窦综合征|结性心律|劳损/,
      en: /intrinsicoid|hemiblock|sick sinus|nodal rhythm|\bPSVT\b|strain pattern|atrial enlargement|Lown/i,
      es: /hemibloqueo|crecimiento auricular|intrinsecoide|enfermedad del seno|sobrecarga sist[oó]lica|\bnodal\b|\batrios?\b|computadora|\bderivadas?\b/i,
    };
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
});

// ── what the text says is on the tracing ──────────────────────────────────────────────────────────────────────────

describe('f1: the conduction path on the tracing', () => {
  it('contrast: normal PR 120–200 ms; the accessory pathway shortens PR below 120 ms and widens the QRS', () => {
    const c = blocks(f1, 'contrast')[0];
    const n = ecgAt(c.left.ecg).truth!;
    const w = ecgAt(c.right.ecg).truth!;
    expect(n.prMs!).toBeGreaterThanOrEqual(120);
    expect(n.prMs!).toBeLessThanOrEqual(200);
    expect(w.prMs!).toBeLessThan(120);
    expect(w.qrsMs!).toBeGreaterThan(n.qrsMs! + 15);
  });
  it('the bundle-branch check: normal PR, QRS ≥ 120 ms', () => {
    const t = ecgAt(itemBySeed(f1, 11002).ecg).truth!;
    expect(t.qrsMs!).toBeGreaterThanOrEqual(120);
    expect(t.prMs!).toBeGreaterThanOrEqual(120);
    expect(t.prMs!).toBeLessThanOrEqual(200);
  });
  it('live AV-node dial: PR follows the slider, the QRS does not change', () => {
    const b = blocks(f1, 'live')[0];
    const at = (pr: number) => generate({ scenario: b.scenario, seed: b.seed, dials: { pr } }).ecg.truth!;
    const lo = at(120);
    const hi = at(200);
    expect(hi.prMs! - lo.prMs!).toBeGreaterThan(70);
    expect(Math.abs(hi.qrsMs! - lo.qrsMs!)).toBeLessThan(3);
  });
});

describe('f2: deflections from vectors', () => {
  it('check: with a horizontal vector aVF is the most equiphasic limb lead and I the most positive', () => {
    const e = ecgAt(itemBySeed(f2, 21001).ecg);
    expect(mostEquiphasic(e)).toBe('aVF');
    const most = LIMB.reduce((a, l) => (qrs(e, l).net > qrs(e, a).net ? l : a));
    expect(most).toBe('I');
    expect(qrs(e, 'I').min).toBeGreaterThan(-0.1);
  });
  it('check: aVR has a negative QRS and a negative T', () => {
    const e = ecgAt(itemBySeed(f2, 21002).ecg);
    expect(qrs(e, 'aVR').net).toBeLessThan(0);
    expect(tPeak(e, 'aVR')).toBeLessThan(0);
  });
  it('live: lead III is the most equiphasic at about +30°', () => {
    const b = blocks(f2, 'live')[0];
    expect(mostEquiphasic(generate({ scenario: b.scenario, seed: b.seed, dials: { axis: 30 } }).ecg)).toBe('III');
  });
  it('worked: V1 is rS (r smaller than S); V6 has a tall R', () => {
    const e = ecgAt(blocks(f2, 'worked')[0].ecg);
    expect(qrs(e, 'V1').max).toBeLessThan(-qrs(e, 'V1').min);
    expect(qrs(e, 'V6').max).toBeGreaterThan(0.8);
  });
  it('contrast: the right-bundle block ends with a tall wave in V1 and a terminal S in V6', () => {
    const e = ecgAt(blocks(f2, 'contrast')[0].right.ecg);
    expect(qrs(e, 'V1').max).toBeGreaterThan(-qrs(e, 'V1').min);
    expect(qrs(e, 'V6').min).toBeLessThan(-0.15);
  });
});

describe('f3: the lead system', () => {
  it('hook: II = I + III at every sample (Einthoven)', () => {
    const e = ecgAt(blocks(f3, 'hook')[0].ecg);
    const { I, II, III } = e.signal.leads;
    let worst = 0;
    for (let i = 0; i < I.length; i++) worst = Math.max(worst, Math.abs(II[i] - (I[i] + III[i])));
    expect(worst).toBeLessThan(1e-4);
  });
  it('worked: aVL is the most equiphasic lead; II, I and aVF are positive (vector ≈ +60°)', () => {
    const e = ecgAt(blocks(f3, 'worked')[0].ecg);
    expect(mostEquiphasic(e)).toBe('aVL');
    for (const l of ['I', 'II', 'aVF'] as const) expect(qrs(e, l).net, l).toBeGreaterThan(0.1);
  });
  it('contrast: A ≈ 0° (aVF equiphasic), B ≈ +80° (I small, aVL negative, inferior leads tall)', () => {
    const c = blocks(f3, 'contrast')[0];
    const a = ecgAt(c.left.ecg);
    const b = ecgAt(c.right.ecg);
    expect(mostEquiphasic(a)).toBe('aVF');
    expect(qrs(b, 'aVL').net).toBeLessThan(0);
    expect(qrs(b, 'I').net).toBeLessThan(qrs(b, 'II').net / 3);
    for (const l of ['II', 'III', 'aVF'] as const) expect(qrs(b, l).net, l).toBeGreaterThan(0.5);
  });
});

describe('f4: squares to numbers', () => {
  it('hook and worked example: RR 800 ms on average, every RR within ±15 ms (four large squares ± less than half a small square)', () => {
    for (const src of [blocks(f4, 'hook')[0].ecg, blocks(f4, 'worked')[0].ecg]) {
      const e = ecgAt(src);
      const bs = e.truth!.beats;
      // the sinus clock keeps a little natural beat-to-beat jitter even with hrv = 0
      for (let i = 1; i < bs.length; i++) expect(Math.abs(bs[i].qrsOn - bs[i - 1].qrsOn - 800)).toBeLessThan(15);
      expect(Math.abs(e.truth!.hrBpm - 75)).toBeLessThan(0.5);
    }
  });
  it('worked: QRS 80–100 ms, R in II about 1 mV (10 small squares)', () => {
    const e = ecgAt(blocks(f4, 'worked')[0].ecg);
    expect(e.truth!.qrsMs!).toBeGreaterThanOrEqual(80);
    expect(e.truth!.qrsMs!).toBeLessThanOrEqual(100);
    expect(qrs(e, 'II').max).toBeGreaterThan(0.8);
    expect(qrs(e, 'II').max).toBeLessThan(1.3);
  });
  it('the 3×4 sheet: the marked beat lies well inside one 2.5-s column', () => {
    const b = blocks(f4, 'ecg')[0];
    const marks = resolveMarks(ecgAt(b.ecg), b.marks, { layout: '3x4+1' });
    expect(marks.length).toBe(1);
    const s = markSpan(marks[0])!;
    expect(Math.floor((s[0] - 300) / 2500)).toBe(Math.floor((s[1] + 300) / 2500));
  });
});

describe('f5: placement shapes the chest leads', () => {
  it('hook (V2/V3 swapped): R rises to V2, falls in V3, rises again in V4', () => {
    const e = ecgAt(blocks(f5, 'hook')[0].ecg);
    expect(qrs(e, 'V2').max).toBeGreaterThan(qrs(e, 'V3').max + 0.2);
    expect(qrs(e, 'V4').max).toBeGreaterThan(qrs(e, 'V3').max + 0.2);
  });
  it('worked (correct placement): R grows V1 → V4 and the transition is at V3 or V4', () => {
    const e = ecgAt(blocks(f5, 'worked')[0].ecg);
    const r = CHEST.map((l) => qrs(e, l).max);
    for (let i = 1; i < 4; i++) expect(r[i], CHEST[i]).toBeGreaterThan(r[i - 1]);
    const first = CHEST.find((l) => qrs(e, l).max >= -qrs(e, l).min);
    expect(['V3', 'V4']).toContain(first);
  });
  it('contrast: same limb leads; in B V1 has a tall R and V3 the rS', () => {
    const c = blocks(f5, 'contrast')[0];
    const a = ecgAt(c.left.ecg);
    const b = ecgAt(c.right.ecg);
    for (const l of LIMB) expect(sameTrace(a.signal.leads[l], b.signal.leads[l]), l).toBe(true);
    expect(qrs(b, 'V1').max).toBeGreaterThan(-qrs(b, 'V1').min);
    expect(qrs(b, 'V3').max).toBeLessThan(-qrs(b, 'V3').min);
  });
  it('check (V1/V2 swapped): r larger in V1 than V2; P upright in V1, biphasic in V2', () => {
    const e = ecgAt(itemBySeed(f5, 51001).ecg);
    expect(qrs(e, 'V1').max).toBeGreaterThan(qrs(e, 'V2').max);
    expect(pw(e, 'V1').max).toBeGreaterThan(pw(e, 'V2').max);
    expect(pw(e, 'V2').min).toBeLessThan(-0.01);
  });
});

describe('f6: the technical check', () => {
  it('hook (LA/RA): I has negative P, QRS and T; aVR has upright P and QRS; chest leads unchanged', () => {
    const src = blocks(f6, 'hook')[0].ecg;
    const e = ecgAt(src);
    const ok = ecgOf({ ...synthReq(src), recording: undefined });
    expect(qrs(e, 'I').net).toBeLessThan(0);
    expect(pw(e, 'I').min).toBeLessThan(-pw(e, 'I').max);
    expect(tPeak(e, 'I')).toBeLessThan(0);
    expect(qrs(e, 'aVR').net).toBeGreaterThan(0);
    expect(pw(e, 'aVR').max).toBeGreaterThan(-pw(e, 'aVR').min);
    for (const l of CHEST) expect(sameTrace(e.signal.leads[l], ok.signal.leads[l]), l).toBe(true);
    const r = CHEST.slice(0, 5).map((l) => qrs(e, l).max);
    expect(r[4]).toBeGreaterThan(r[0]);
  });
  it('contrast: A has a flat II, B a flat III; the other limb leads carry signal', () => {
    const c = blocks(f6, 'contrast')[0];
    const a = ecgAt(c.left.ecg);
    const b = ecgAt(c.right.ecg);
    expect(qrs(a, 'II').p2p).toBeLessThan(0.05);
    expect(qrs(b, 'III').p2p).toBeLessThan(0.05);
    for (const l of ['I', 'III', 'aVL'] as const) expect(qrs(a, l).p2p, `A ${l}`).toBeGreaterThan(0.3);
    // RA cable on the right leg (≈ LL potential): aVR = aVF = (LL − LA)/2, half of the true lead III — smaller, not flat
    for (const l of ['aVR', 'aVF'] as const) expect(qrs(a, l).p2p, `A ${l}`).toBeGreaterThan(0.12);
    for (const l of ['I', 'II', 'aVR', 'aVL', 'aVF'] as const) expect(qrs(b, l).p2p, `B ${l}`).toBeGreaterThan(0.3);
  });
  it('check (LA/RL): lead III is the flat lead', () => {
    const e = ecgAt(itemBySeed(f6, 61001).ecg);
    expect(qrs(e, 'III').p2p).toBeLessThan(0.05);
  });
  it('check (RA/LL): II inverted (P, QRS, T); aVL and V1–V6 as in the correct recording', () => {
    const src = itemBySeed(f6, 61002).ecg;
    const e = ecgAt(src);
    const ok = ecgOf({ ...synthReq(src), recording: undefined });
    expect(qrs(e, 'II').net).toBeLessThan(0);
    expect(pw(e, 'II').min).toBeLessThan(-pw(e, 'II').max);
    expect(tPeak(e, 'II')).toBeLessThan(0);
    for (const l of ['aVL', ...CHEST] as const) expect(sameTrace(e.signal.leads[l], ok.signal.leads[l]), l).toBe(true);
  });
  it('check (LA/LL): P larger in I than in II; P in III mainly negative', () => {
    const e = ecgAt(itemBySeed(f6, 61003).ecg);
    expect(pw(e, 'I').max).toBeGreaterThan(pw(e, 'II').max);
    expect(-pw(e, 'III').min).toBeGreaterThan(pw(e, 'III').max);
  });
});

// ── blocks added in the 2026-10-22 review (filters, artefacts, high V1–V2) ───────────────────────────────────────────

/** J-point deviation (mV) of the middle beat against the PR baseline. */
const jDev = (ecg: Ecg, lead: StdLead, plusMs = 0, b = midBeat(ecg)): number => {
  const a = ecg.signal.leads[lead];
  const fs = ecg.signal.fs;
  const x = (b.j + plusMs) * fs / 1000;
  const i = Math.floor(x);
  const v = a[i] * (1 - (x - i)) + a[i + 1] * (x - i);
  return v - baselineBefore(a, fs, b.qrsOn);
};
/** Spread of the PR-segment baseline across beats (mV): a slow artefact moves it from beat to beat. */
const baselineSpread = (ecg: Ecg, lead: StdLead): number => {
  const a = ecg.signal.leads[lead];
  const xs = ecg.truth!.beats.map((b) => baselineBefore(a, ecg.signal.fs, b.qrsOn));
  return Math.max(...xs) - Math.min(...xs);
};
/** RMS of the second difference (mV): fine, fast noise (EMG, mains) raises it. */
const roughness = (ecg: Ecg, lead: StdLead): number => {
  const a = ecg.signal.leads[lead];
  let s = 0;
  for (let i = 1; i < a.length - 1; i++) s += (a[i + 1] - 2 * a[i] + a[i - 1]) ** 2;
  return Math.sqrt(s / a.length);
};

describe('f4: one heart, two filters', () => {
  const c = blocks(f4, 'contrast')[0];
  it('A (diagnostic): ST on the baseline in V1–V2 and V5–V6', () => {
    const a = ecgAt(c.left.ecg);
    for (const l of ['V1', 'V2', 'V5', 'V6'] as const) expect(Math.abs(jDev(a, l)), l).toBeLessThan(0.03);
  });
  it('B (monitor 0.5–40 Hz): about 1–2 mm false J/ST depression in V5–V6 (deepest in V6), about 1–1.5 mm false elevation in V1–V3, smaller QRS', () => {
    const a = ecgAt(c.left.ecg);
    const b = ecgAt(c.right.ecg);
    for (const l of ['V5', 'V6'] as const) {
      expect(jDev(b, l), `${l} at J`).toBeLessThan(-0.1);
      expect(jDev(b, l), `${l} at J`).toBeGreaterThan(-0.25);
      expect(jDev(b, l, 60), `${l} at J+60`).toBeLessThan(-0.03);
    }
    expect(jDev(b, 'V6')).toBeLessThan(jDev(b, 'V5'));
    expect(jDev(b, 'V6', 60)).toBeLessThan(-0.08);
    for (const l of ['V1', 'V2', 'V3'] as const) {
      expect(jDev(b, l), l).toBeGreaterThan(0.08);
      expect(jDev(b, l), l).toBeLessThan(0.18);
    }
    expect(qrs(b, 'V6').max).toBeLessThan(qrs(a, 'V6').max);
  });
});

describe('f5: V1–V2 placed too high', () => {
  it('check: negative P and inverted T in V1, tiny r in V1–V2, then a normal R in V3', () => {
    const e = ecgAt(itemBySeed(f5, 51003).ecg);
    expect(pw(e, 'V1').min).toBeLessThan(-0.03);
    expect(pw(e, 'V1').max).toBeLessThan(0.02);
    expect(Math.abs(pw(e, 'V2').max) + Math.abs(pw(e, 'V2').min)).toBeLessThan(0.04);
    expect(tPeak(e, 'V1')).toBeLessThan(-0.08);
    for (const l of ['V1', 'V2'] as const) expect(qrs(e, l).max, l).toBeLessThan(0.2);
    expect(qrs(e, 'V3').max).toBeGreaterThan(0.8);
  });
});

describe('f6: artefacts on one electrode', () => {
  const c = blocks(f6, 'contrast')[1];
  it('the second contrast is flutter vs tremor', () => {
    expect(c.title.en).toBe('Flutter or tremor?');
  });
  it('A: true flutter at 4:1 — atrial rate about 300/min, ventricular rate about 75/min', () => {
    const t = ecgAt(c.left.ecg).truth!;
    expect(t.rhythm).toBe('atrial-flutter');
    expect(t.atrialRateBpm!).toBeGreaterThan(270);
    expect(t.atrialRateBpm!).toBeLessThan(330);
    expect(Math.abs(t.hrBpm - 75)).toBeLessThan(4);
  });
  it('B: sinus rhythm; lead I clean, the 5-Hz oscillation in II, III and aVF (left-leg electrode)', () => {
    const e = ecgAt(c.right.ecg);
    expect(e.truth!.rhythm).toBe('sinus-rhythm');
    expect(pw(e, 'I').max).toBeGreaterThan(0.04);
    expect(baselineSpread(e, 'I')).toBeLessThan(0.03);
    for (const l of ['II', 'III', 'aVF'] as const) expect(baselineSpread(e, l), l).toBeGreaterThan(0.08);
  });
  it('EMG check: II is the only clean limb lead; I, III and aVL carry the noise (left-arm electrode)', () => {
    const e = ecgAt(itemBySeed(f6, 61004).ecg);
    const ii = roughness(e, 'II');
    for (const l of ['I', 'III', 'aVL'] as const) expect(roughness(e, l), l).toBeGreaterThan(5 * ii);
    for (const l of ['aVR', 'aVF'] as const) expect(roughness(e, l), l).toBeGreaterThan(2 * ii);
  });
});
