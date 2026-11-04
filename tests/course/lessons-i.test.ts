/**
 * Stage I lessons (i1–i11, docs/PLAN.md §3: ischaemia and infarction): every lesson validates against the live
 * catalogues with no errors and no warnings, follows the lesson anatomy (attempt-first hook, worked example before
 * practice, checks/drill, summary), every live-block dial is realised by the engine, every family check generates,
 * every synthetic ECG the lessons show can be generated, the text is complete in zh / en / es with Spain-Spanish terms,
 * real PTB-XL infarcts staged old are never presented as acute STEMIs, and what the text says is on each tracing
 * (millimetres, leads, reciprocity, T shape, Q waves, ST/S ratios) is measurable on the signal.
 */
import { describe, expect, it } from 'vitest';
import type { Block, Lesson } from '../../src/course/api';
import { liveValidateDeps } from '../../src/course/deps';
import { REGISTERED } from '../../src/course/lessons/index';
import { realisedDials, startDials } from '../../src/course/live';
import { formatIssues, validateLesson } from '../../src/course/validate';
import { baselineBefore, qrsWaves } from '../../src/course/marks';
import type { BeatMarks, Ecg } from '../../src/core/ecg';
import type { L10n } from '../../src/core/l10n';
import type { StdLead } from '../../src/core/leads';
import type { EcgSource } from '../../src/practice/api';
import { generateItem } from '../../src/practice';
import { mapScpToFindings } from '../../src/real/scp';
import { rawMeta } from '../../src/real/library';
import { generate, scenarios, type SynthRequest } from '../../src/synth';

const IDS = ['i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7', 'i8', 'i9', 'i10', 'i11'] as const;

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

describe('stage I lessons', () => {
  it('all eleven lesson files exist and export their lesson', () => {
    expect(lessons.map((x) => x.id)).toEqual([...IDS]);
  });

  for (const lesson of lessons) {
    describe(lesson.id, () => {
      it('validates against the live catalogues with no errors and no warnings', () => {
        const issues = validateLessonSafe(lesson);
        expect(issues, `lesson ${lesson.id}`).toBe('');
      });

      it('follows the lesson anatomy: hook first, worked example before practice, summary last', () => {
        const kinds = lesson.blocks.map((b) => b.kind);
        expect(lesson.stage).toBe('I');
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

function validateLessonSafe(lesson: Lesson): string {
  return formatIssues(validateLesson(lesson, liveValidateDeps(lesson.id)));
}

// ── the text: complete, current terms, Spain-Spanish numbers and abbreviations ───────────────────────────────────────

function texts(v: unknown, path = ''): { readonly path: string; readonly t: L10n }[] {
  if (Array.isArray(v)) return v.flatMap((x, i) => texts(x, `${path}[${i}]`));
  if (typeof v !== 'object' || v === null) return [];
  const o = v as Record<string, unknown>;
  if (typeof o.zh === 'string' && typeof o.en === 'string' && typeof o.es === 'string') return [{ path, t: o as unknown as L10n }];
  return Object.entries(o).flatMap(([k, x]) => texts(x, path ? `${path}.${k}` : k));
}

describe('stage I text', () => {
  const OUTDATED: Readonly<Record<'zh' | 'en' | 'es', RegExp>> = {
    zh: /半支阻滞|心房肥大|类本位曲折|病窦综合征|结性心律|劳损(?!”|")/,
    en: /intrinsicoid|hemiblock|sick sinus|nodal rhythm|\bPSVT\b|atrial enlargement|Lown|non-Q[- ]wave MI|subepicardial injury/i,
    // SCASEST is the Spain abbreviation for NSTE-ACS (SCAEST would read "with ST elevation"); "isoeléctrico", not "isodinámico"
    es: /hemibloqueo|crecimiento auricular|intrinsecoide|enfermedad del seno|\bnodal\b|\batrios?\b|computadora|\bderivadas?\b|SCAEST|SCA-SEST|isodin[aá]mic|isod[eé]ctric|marginal obtuso/i,
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

  it('the UDMI V2–V3 thresholds are quoted correctly wherever they appear (2 / 2.5 / 1.5 mm)', () => {
    for (const lesson of lessons) {
      for (const { path, t } of texts(lesson)) {
        if (!/V2[–-]V3/.test(t.en) || !/men/.test(t.en) || !/women/.test(t.en)) continue;
        if (/≥ ?2 mm in men ≥ ?40|men ≥ ?40/.test(t.en)) expect(/2\.5/.test(t.en), `${lesson.id} ${path}`).toBe(true);
        expect(/≥ ?1 mm in women|women[^.;]*≥ ?1 mm\b/.test(t.en), `${lesson.id} ${path}: women's V2–V3 limit is 1.5 mm`).toBe(false);
      }
    }
  });
});

// ── real cases: PTB-XL infarcts that are not staged acute are never sold as acute STEMIs ─────────────────────────────

describe('stage I real cases', () => {
  const NOT_ACUTE = new Set(['Stadium II', 'Stadium II-III', 'Stadium III', 'unknown']);
  for (const lesson of lessons) {
    const blocks = lesson.blocks.filter((b): b is Extract<Block, { kind: 'real' }> => b.kind === 'real');
    for (const b of blocks) {
      it(`${lesson.id}: the real-case caption matches the database stage of ${b.ids.join(', ')}`, () => {
        const recs = b.ids.map((id) => rawMeta.records.find((r) => r.id === id));
        for (const [k, r] of recs.entries()) expect(r, `case ${b.ids[k]} exists`).toBeDefined();
        // never "three real STEMIs", "real anterior STEMIs", "real acute …"
        expect(/real (?:[a-z-]+ )*STEMIs?\b/i.test(b.caption.en), b.caption.en).toBe(false);
        expect(/IAMCEST (?:[a-z]+ )*reales/i.test(b.caption.es), b.caption.es).toBe(false);
        const staged = recs.filter((r) => r && r.infarctionStadium && NOT_ACUTE.has(r.infarctionStadium) && mapScpToFindings(r.codes, r.infarctionStadium).includes('pathological-q'));
        if (staged.length > 0) expect(/\bold\b|unknown|not (?:an? )?acute|not a STEMI|evolving/i.test(b.caption.en), b.caption.en).toBe(true);
        for (const r of recs) {
          if (!r) continue;
          const f = mapScpToFindings(r.codes, r.infarctionStadium);
          const acute = f.some((x) => x.startsWith('stemi-'));
          if (!acute && /\bacute\b/i.test(b.caption.en)) {
            // the word may appear only in a negation ("not an acute STEMI", "not acute")
            expect(/not (?:an? )?acute|labelled (?:an )?acute|acute ST elevation to|acute event|acute elevation|acute (?:STEMIs?|occlusion)\b[^.]*\bnot\b|no acute/i.test(b.caption.en), b.caption.en).toBe(true);
          }
        }
      });
    }
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
/** the ECG a film frame shows */
const frame = (id: string, film: number, k: number): Ecg => ecgOf(blocksOf(id, 'film')[film].frames[k].ecg);

type AnyLead =StdLead | 'V3R' | 'V4R' | 'V7' | 'V8' | 'V9';
const CHEST: readonly StdLead[] = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
const ALL: readonly StdLead[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', ...CHEST];
const sig = (ecg: Ecg, lead: AnyLead): Float32Array => {
  const a = (ecg.signal.leads as Partial<Record<AnyLead, Float32Array>>)[lead];
  if (!a) throw new Error(`no lead ${lead}`);
  return a;
};
const midBeat = (ecg: Ecg): BeatMarks => ecg.truth!.beats[Math.floor(ecg.truth!.beats.length / 2)];
function span(ecg: Ecg, lead: AnyLead, t0: number, t1: number, b: BeatMarks) {
  const a = sig(ecg, lead);
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
const qrs = (ecg: Ecg, lead: AnyLead, b = midBeat(ecg)) => span(ecg, lead, b.qrsOn, b.qrsOff, b);
/** the T wave (J + 40 ms → T end) */
const tw = (ecg: Ecg, lead: AnyLead, b = midBeat(ecg)) => span(ecg, lead, b.j + 40, b.tOff, b);
const tInverted = (ecg: Ecg, lead: AnyLead) => tw(ecg, lead).min < -0.1 && -tw(ecg, lead).min > tw(ecg, lead).max;
const tUpright = (ecg: Ecg, lead: AnyLead) => tw(ecg, lead).max > 0.1 && tw(ecg, lead).max > -tw(ecg, lead).min;
/** deviation from the PR baseline at J + plusMs (mV; 0.1 mV = 1 mm) */
function stAt(ecg: Ecg, lead: AnyLead, plusMs = 0, b = midBeat(ecg)): number {
  const a = sig(ecg, lead);
  const fs = ecg.signal.fs;
  const x = ((b.j + plusMs) * fs) / 1000;
  const i = Math.floor(x);
  return a[i] * (1 - (x - i)) + a[i + 1] * (x - i) - baselineBefore(a, fs, b.qrsOn);
}
/** Smith ST/S: J-point deviation over the depth of the S wave (negative when the ST is elevated over a deep S) */
const stOverS = (ecg: Ecg, lead: AnyLead): number => stAt(ecg, lead) / qrs(ecg, lead).min;
/** duration of an initial negative deflection (Q) from QRS onset, in ms (0 when the QRS starts upward) */
function qDurMs(ecg: Ecg, lead: AnyLead, b = midBeat(ecg)): number {
  const a = sig(ecg, lead);
  const fs = ecg.signal.fs;
  const base = baselineBefore(a, fs, b.qrsOn);
  let i = Math.round((b.qrsOn * fs) / 1000) + 1;
  const end = Math.round((b.qrsOff * fs) / 1000);
  while (i < end && a[i] - base < 0.01) i++;
  return ((i - Math.round((b.qrsOn * fs) / 1000)) * 1000) / fs;
}
const shape = (e: Ecg, l: AnyLead): string => {
  const bt = midBeat(e);
  return qrsWaves(sig(e, l), e.signal.fs, bt.qrsOn, bt.qrsOff).map((w) => w.label).join(' ');
};
/** T amplitude over QRS amplitude (Klein / Smith T/QRS for aneurysm vs acute STEMI) */
const tOverQrs = (e: Ecg, l: AnyLead): number => Math.max(tw(e, l).max, -tw(e, l).min) / qrs(e, l).p2p;
/** mean PR segment (P end → QRS onset) against the TP stretch just before the P wave (mV) */
function prSegment(ecg: Ecg, lead: AnyLead, b = midBeat(ecg)): number {
  const a = sig(ecg, lead);
  const fs = ecg.signal.fs;
  if (b.pOn === null || b.pOff === null) throw new Error('no P wave');
  const mean = (t0: number, t1: number): number => {
    const i0 = Math.round((t0 * fs) / 1000);
    const i1 = Math.round((t1 * fs) / 1000);
    let s = 0;
    for (let i = i0; i <= i1; i++) s += a[i];
    return s / (i1 - i0 + 1);
  };
  return mean(b.pOff + 5, b.qrsOn - 5) - mean(b.pOn - 50, b.pOn - 10);
}

describe('i1: measuring ST on the tracings', () => {
  it('hook / worked (man of 58): J point about 2–3.5 mm in V2–V4, highest in V3 (worked: V2 about 2.5, V3 3–3.5, V4 about 2, J+60 read-out about 4), V1 about 1 mm, mirror about −1 mm in III and aVF, II depressed too', () => {
    for (const src of [blocksOf('i1', 'hook')[0].ecg, blocksOf('i1', 'worked')[0].ecg]) {
      const e = ecgOf(src);
      expect(stAt(e, 'II'), 'II in the mirror').toBeLessThanOrEqual(-0.05);
      for (const l of ['V2', 'V3'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.2);
      expect(stAt(e, 'V4')).toBeGreaterThanOrEqual(0.1);
      expect(CHEST.reduce((m, l) => (stAt(e, l) > stAt(e, m) ? l : m))).toBe('V3');
      expect(stAt(e, 'V1')).toBeGreaterThanOrEqual(0.075);
      expect(stAt(e, 'V1')).toBeLessThanOrEqual(0.125);
      for (const l of ['III', 'aVF'] as const) {
        expect(stAt(e, l), l).toBeLessThanOrEqual(-0.075);
        expect(stAt(e, l), l).toBeGreaterThanOrEqual(-0.125);
      }
      expect(stAt(e, 'V3')).toBeLessThan(0.4);
      for (const l of ['V2', 'V3', 'V4'] as const) {
        expect(stAt(e, l), `${l} about 2–3.5 mm`).toBeGreaterThanOrEqual(0.175);
        expect(stAt(e, l), `${l} about 2–3.5 mm`).toBeLessThanOrEqual(0.375);
      }
    }
    const w = ecgOf(blocksOf('i1', 'worked')[0].ecg);
    expect(stAt(w, 'V2'), 'V2 about 2.5 mm').toBeGreaterThanOrEqual(0.225);
    expect(stAt(w, 'V2'), 'V2 about 2.5 mm').toBeLessThanOrEqual(0.275);
    expect(stAt(w, 'V3'), 'V3 3–3.5 mm').toBeGreaterThanOrEqual(0.3);
    expect(stAt(w, 'V3'), 'V3 3–3.5 mm').toBeLessThanOrEqual(0.35);
    expect(stAt(w, 'V4'), 'V4 about 2 mm').toBeGreaterThanOrEqual(0.175);
    expect(stAt(w, 'V4'), 'V4 about 2 mm').toBeLessThanOrEqual(0.225);
    expect(w.truth!.stMv.V3, 'the st60 read-out on V3, about 4 mm').toBeGreaterThanOrEqual(0.375);
    expect(w.truth!.stMv.V3, 'the st60 read-out on V3, about 4 mm').toBeLessThanOrEqual(0.425);
  });
  it('heart block: the lit segments are the injured LAD segments, basal ones included; on its tracing V2–V4 are up and II, III and aVF depressed', () => {
    const h = blocksOf('i1', 'heart')[0];
    const req = h.ecg.kind === 'synth' ? h.ecg.req : null;
    const sc = scenarios().find((s) => s.id === req?.scenario);
    const injured = sc!.source.injury!.flatMap((x) => (typeof x.where === 'string' ? [] : [...x.where]));
    expect([...(h.emphasize ?? [])].sort()).toEqual([...new Set(injured)].sort());
    const e = ecgOf(h.ecg);
    for (const l of ['V2', 'V3', 'V4'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(e, l), l).toBeLessThanOrEqual(-0.05);
  });
  it('contrast A (early repolarisation, man of 24): V3 below 2.5 mm, II/aVF J about 1.5 mm, V2–V6 elevated, no reciprocal depression ≥ 0.5 mm except aVR', () => {
    const e = ecgOf(blocksOf('i1', 'contrast')[0].left.ecg);
    expect(stAt(e, 'V3')).toBeLessThan(0.25);
    expect(e.truth!.stMv.V3, 'V3 J+60 read-out').toBeLessThan(0.25);
    for (const l of ['II', 'aVF'] as const) {
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.125);
      expect(stAt(e, l), l).toBeLessThanOrEqual(0.175);
    }
    for (const l of ['V2', 'V3', 'V4', 'V5', 'V6'] as const) expect(stAt(e, l), l).toBeGreaterThan(0.08);
    for (const l of ALL.filter((x) => x !== 'aVR')) expect(stAt(e, l), l).toBeGreaterThan(-0.05);
  });
  it('NSTE-ACS frame (woman of 67): horizontal depression of about 1 mm in V4–V6, no lead elevated ≥ 1 mm', () => {
    const e = frame('i1', 0, 0);
    expect(e.truth!.findings).toContain('st-depression-ischemic');
    for (const l of ['V4', 'V5', 'V6'] as const) {
      expect(stAt(e, l), l).toBeLessThanOrEqual(-0.075);
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(-0.125);
      expect(Math.abs(stAt(e, l, 60) - stAt(e, l)), `${l} horizontal`).toBeLessThan(0.03);
    }
    for (const l of ['V5', 'V6'] as const) {
      expect(e.truth!.stMv[l], `${l} J+60 read-out`).toBeLessThanOrEqual(-0.075);
      expect(e.truth!.stMv[l], `${l} J+60 read-out`).toBeGreaterThanOrEqual(-0.125);
    }
    for (const l of ALL) expect(stAt(e, l), l).toBeLessThan(0.1);
  });
  it('depression film: mirror III/aVF about −1 mm under V2–V4 elevation; high lateral II/III/aVF deeply down with I/aVL up; posterior V1–V3 about −1.5 mm with upright T and nothing elevated', () => {
    const mirror = frame('i1', 0, 1);
    for (const l of ['III', 'aVF'] as const) {
      expect(stAt(mirror, l), l).toBeLessThanOrEqual(-0.075);
      expect(stAt(mirror, l), l).toBeGreaterThanOrEqual(-0.125);
    }
    for (const l of ['V2', 'V3', 'V4'] as const) expect(stAt(mirror, l), l).toBeGreaterThanOrEqual(0.15);
    const hl = frame('i1', 0, 2);
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(hl, l), l).toBeLessThan(-0.15);
    for (const l of ['I', 'aVL'] as const) expect(stAt(hl, l), l).toBeGreaterThanOrEqual(0.1);
    const post = frame('i1', 0, 3);
    for (const l of ['V1', 'V2', 'V3'] as const) {
      expect(stAt(post, l), l).toBeLessThanOrEqual(-0.125);
      expect(stAt(post, l), l).toBeGreaterThanOrEqual(-0.175);
      expect(tw(post, l).max, `upright T ${l}`).toBeGreaterThan(0.1);
    }
    for (const l of ['V2', 'V3'] as const) expect(tUpright(post, l), `upright T ${l}`).toBe(true);
    for (const l of ALL) expect(stAt(post, l), l).toBeLessThan(0.05);
  });
  it('injury sweep notes (J point): V3 about 2.5 mm and V4 about 1.5 mm at 0.22–0.24 (both over their 2 and 1 mm limits); V2–V4 rise as III and aVF fall across 0.25–0.36; V3 4–5 mm with III 1.5–2 mm down at 0.37–0.45', () => {
    for (const v of [0.22, 0.24]) {
      const e = played('i1', 0, v);
      expect(stAt(e, 'V3'), `${v} V3`).toBeGreaterThanOrEqual(0.24);
      expect(stAt(e, 'V3'), `${v} V3`).toBeLessThan(0.28);
      expect(stAt(e, 'V4'), `${v} V4`).toBeGreaterThanOrEqual(0.13);
      expect(stAt(e, 'V4'), `${v} V4`).toBeLessThan(0.17);
    }
    const [lo, hi] = [played('i1', 0, 0.25), played('i1', 0, 0.36)];
    for (const l of ['V2', 'V3', 'V4'] as const) expect(stAt(hi, l), l).toBeGreaterThan(stAt(lo, l) + 0.05);
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(hi, l), l).toBeLessThan(stAt(lo, l) - 0.02);
    for (const v of [0.37, 0.45]) {
      const e = played('i1', 0, v);
      expect(stAt(e, 'V3'), `${v} V3`).toBeGreaterThanOrEqual(0.4);
      expect(stAt(e, 'V3'), `${v} V3`).toBeLessThan(0.505);
      expect(stAt(e, 'III'), `${v} III`).toBeLessThanOrEqual(-0.145);
      expect(stAt(e, 'III'), `${v} III`).toBeGreaterThanOrEqual(-0.2);
    }
  });
});

describe('i2: territories on the tracings', () => {
  it('worked (anteroseptal, woman of 64): V1–V3 ≥ 1 mm, V2 about 2.5 and V3 about 2 mm, V4 under 1 mm, V5–V6/I/aVL not elevated', () => {
    const e = ecgOf(blocksOf('i2', 'worked')[0].ecg);
    for (const l of ['V1', 'V2', 'V3'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    for (const l of ['V2', 'V3'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.15);
    expect(stAt(e, 'V4'), 'V4 under 1 mm').toBeLessThan(0.1);
    expect(stAt(e, 'V4'), 'V4 under 1 mm, not depressed').toBeGreaterThanOrEqual(0);
    for (const l of ['V5', 'V6', 'I', 'aVL'] as const) expect(stAt(e, l), l).toBeLessThan(0.05);
    expect(CHEST.reduce((m, l) => (stAt(e, l) > stAt(e, m) ? l : m))).toBe('V2');
    const about = { V2: 0.25, V3: 0.2 } as const;
    for (const [l, mv] of Object.entries(about) as [StdLead, number][]) {
      expect(stAt(e, l), `${l} about ${mv * 10} mm`).toBeGreaterThanOrEqual(mv - 0.025);
      expect(stAt(e, l), `${l} about ${mv * 10} mm`).toBeLessThanOrEqual(mv + 0.025);
    }
  });
  it('hook and heart (one tracing): II, III and aVF elevated with I and aVL depressed', () => {
    const hook = blocksOf('i2', 'hook')[0].ecg;
    expect(blocksOf('i2', 'heart')[0].ecg).toEqual(hook);
    const e = ecgOf(hook);
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    for (const l of ['I', 'aVL'] as const) expect(stAt(e, l), l).toBeLessThanOrEqual(-0.05);
  });
  it('contrast: A (RCA) III > II with depression in I; B (LCx) II ≥ III, I isoelectric, V5–V6 elevated, aVL still depressed', () => {
    const c = blocksOf('i2', 'contrast')[0];
    const a = ecgOf(c.left.ecg);
    const b = ecgOf(c.right.ecg);
    expect(stAt(a, 'III')).toBeGreaterThan(stAt(a, 'II'));
    expect(stAt(a, 'I')).toBeLessThan(-0.03);
    expect(stAt(b, 'II')).toBeGreaterThanOrEqual(stAt(b, 'III'));
    expect(Math.abs(stAt(b, 'I'))).toBeLessThan(0.03);
    for (const l of ['V5', 'V6'] as const) expect(stAt(b, l), l).toBeGreaterThan(0.05);
    expect(stAt(b, 'aVL')).toBeLessThan(0);
  });
  it('V4R film: flat V4R in the inferior STEMI; V4R > 1 mm and V1 about 1 mm with inferior elevation in the RV infarction', () => {
    expect(Math.abs(stAt(frame('i2', 1, 0), 'V4R'))).toBeLessThan(0.04);
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(frame('i2', 1, 0), l), l).toBeGreaterThanOrEqual(0.1);
    const e = frame('i2', 1, 1);
    expect(stAt(e, 'V4R')).toBeGreaterThan(0.1);
    expect(stAt(e, 'V1')).toBeGreaterThanOrEqual(0.1);
    expect(stAt(e, 'V1')).toBeLessThanOrEqual(0.125);
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
  });
  it('posterolateral frame: V1–V2 depressed ≥ 0.5 mm ending in upright T waves (V1–V3), V5/V6 elevated ≥ 1 mm, I/aVL slightly up (< 1 mm); V8 ≥ 0.5 mm', () => {
    const e = frame('i2', 0, 3);
    for (const l of ['V1', 'V2'] as const) expect(stAt(e, l), l).toBeLessThanOrEqual(-0.05);
    for (const l of ['V1', 'V2', 'V3'] as const) expect(tw(e, l).max, `upright T ${l}`).toBeGreaterThan(0.1);
    for (const l of ['V5', 'V6'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    for (const l of ['I', 'aVL'] as const) {
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.05);
      expect(stAt(e, l), l).toBeLessThan(0.1);
    }
    const v8 = blocksOf('i2', 'ecg')[0].ecg;
    expect(v8.kind === 'synth' && v8.req.seed).toBe(827);
    expect(stAt(ecgOf(v8), 'V8')).toBeGreaterThanOrEqual(0.05);
  });
  it('territory film: anterior V1–V4 up with V3 highest and II/III/aVF down; inferior III > II with I/aVL down; lateral I/aVL/V5–V6 up with III down; RV frame V1 about 1 mm over an inferior STEMI', () => {
    const ant = frame('i2', 0, 0);
    for (const l of ['V1', 'V2', 'V3', 'V4'] as const) expect(stAt(ant, l), l).toBeGreaterThanOrEqual(0.1);
    expect(CHEST.reduce((m, l) => (stAt(ant, l) > stAt(ant, m) ? l : m))).toBe('V3');
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(ant, l), l).toBeLessThan(-0.05);
    const inf = frame('i2', 0, 1);
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(inf, l), l).toBeGreaterThanOrEqual(0.1);
    expect(stAt(inf, 'III')).toBeGreaterThan(stAt(inf, 'II'));
    for (const l of ['I', 'aVL'] as const) expect(stAt(inf, l), l).toBeLessThan(-0.03);
    const lat = frame('i2', 0, 2);
    for (const l of ['I', 'aVL', 'V5', 'V6'] as const) expect(stAt(lat, l), l).toBeGreaterThanOrEqual(0.1);
    expect(stAt(lat, 'III')).toBeLessThan(-0.05);
    const rv = frame('i2', 0, 4);
    expect(rv.truth!.findings).toContain('rv-infarction');
    expect(stAt(rv, 'V1')).toBeGreaterThanOrEqual(0.075);
    expect(stAt(rv, 'V1')).toBeLessThanOrEqual(0.125);
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(rv, l), l).toBeGreaterThanOrEqual(0.1);
  });
});

describe('i3: anterior occlusion on the tracings', () => {
  it('hook (anterolateral): V3–V6 and I/aVL ≥ 1 mm, V1–V2 not ≥ 1 mm (not extensive anterior), III and aVF depressed, III more than II', () => {
    const e = ecgOf(blocksOf('i3', 'hook')[0].ecg);
    for (const l of ['V3', 'V4', 'V5', 'V6', 'I', 'aVL'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    for (const l of ['V1', 'V2'] as const) expect(stAt(e, l), l).toBeLessThan(0.1);
    expect(stAt(e, 'III')).toBeLessThan(-0.1);
    expect(stAt(e, 'aVF')).toBeLessThanOrEqual(-0.05);
    expect(stAt(e, 'III')).toBeLessThan(stAt(e, 'II'));
  });
  it('worked and contrast A (anteroseptal, woman of 64): V1–V3 elevated, V2 highest, V4 under 1 mm', () => {
    for (const src of [blocksOf('i3', 'worked')[0].ecg, blocksOf('i3', 'contrast')[0].left.ecg]) {
      const e = ecgOf(src);
      for (const l of ['V1', 'V2', 'V3'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
      expect(CHEST.reduce((m, l) => (stAt(e, l) > stAt(e, m) ? l : m))).toBe('V2');
      expect(stAt(e, 'V4')).toBeLessThan(0.1);
      expect(stAt(e, 'aVR')).toBeLessThan(0.05);
    }
  });
  it('worked: V2 and V3 over the 1.5 mm limit, V5–V6 and I/aVL not elevated, no depression beyond the flat band in II, III, aVF', () => {
    const e = ecgOf(blocksOf('i3', 'worked')[0].ecg);
    for (const l of ['V2', 'V3'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.15);
    for (const l of ['V5', 'V6', 'I', 'aVL'] as const) expect(stAt(e, l), l).toBeLessThan(0.05);
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(-0.05);
  });
  it('contrast B (high lateral, D1): I and aVL ≥ 1 mm (aVL about 2) with V2 up as much as V1, V3 less, V4–V6 < 1 mm, the mirror in III about 3 mm and its largest deflection; A has I/aVL flat', () => {
    const e = ecgOf(blocksOf('i3', 'contrast')[0].right.ecg);
    for (const l of ['I', 'aVL', 'V2'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    expect(stAt(e, 'aVL')).toBeGreaterThanOrEqual(0.175);
    expect(stAt(e, 'aVL')).toBeLessThanOrEqual(0.225);
    expect(stAt(e, 'V2')).toBeGreaterThanOrEqual(stAt(e, 'V1') - 0.02);
    expect(stAt(e, 'V3')).toBeLessThan(stAt(e, 'V2'));
    expect(stAt(e, 'III')).toBeLessThanOrEqual(-0.275);
    expect(stAt(e, 'III')).toBeGreaterThanOrEqual(-0.325);
    const others = ALL.filter((l) => l !== 'III').map((l) => Math.abs(stAt(e, l)));
    expect(-stAt(e, 'III'), 'III the largest deflection').toBeGreaterThan(Math.max(...others));
    for (const l of ['V4', 'V5', 'V6'] as const) expect(stAt(e, l), l).toBeLessThan(0.1);
    const a = ecgOf(blocksOf('i3', 'contrast')[0].left.ecg);
    for (const l of ['I', 'aVL'] as const) expect(Math.abs(stAt(a, l)), l).toBeLessThan(0.05);
    for (const l of ['V2', 'V3'] as const) expect(stAt(a, l), l).toBeGreaterThan(0.1);
  });
  it('hyperacute T frame: broad tall T in V2–V4 (≥ 5 mm) with the J point under 1 mm, inverted T in III', () => {
    const e = frame('i3', 0, 0);
    for (const l of ['V2', 'V3', 'V4'] as const) {
      expect(tw(e, l).max, l).toBeGreaterThanOrEqual(0.5);
      expect(stAt(e, l), l).toBeLessThan(0.1);
    }
    expect(tInverted(e, 'III')).toBe(true);
  });
  it('family film: anteroseptal V1–V3 up with V2 highest, V4 < 1 mm, V5–V6/I/aVL not elevated; anteroseptal V1–V4 up with V3 highest and an inferior mirror; anterolateral = the hook', () => {
    const as = frame('i3', 0, 1);
    for (const l of ['V1', 'V2', 'V3'] as const) expect(stAt(as, l), l).toBeGreaterThanOrEqual(0.1);
    expect(CHEST.reduce((m, l) => (stAt(as, l) > stAt(as, m) ? l : m))).toBe('V2');
    expect(stAt(as, 'V4')).toBeLessThan(0.1);
    for (const l of ['V5', 'V6', 'I', 'aVL'] as const) expect(stAt(as, l), l).toBeLessThan(0.05);
    const ant = frame('i3', 0, 2);
    for (const l of ['V1', 'V2', 'V3', 'V4'] as const) expect(stAt(ant, l), l).toBeGreaterThanOrEqual(0.1);
    expect(CHEST.reduce((m, l) => (stAt(ant, l) > stAt(ant, m) ? l : m))).toBe('V3');
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(ant, l), l).toBeLessThan(-0.05);
    expect(blocksOf('i3', 'film')[0].frames[3].ecg).toEqual(blocksOf('i3', 'hook')[0].ecg);
  });
  it('injury sweep notes (J point): V3 2–3.5 mm with V5–V6 under 1 mm at 0.22–0.30; V2–V4 grow and III deepens with V5–V6 still under 1 mm across 0.31–0.45', () => {
    for (const v of [0.22, 0.3]) {
      const e = played('i3', 0, v);
      expect(stAt(e, 'V3'), `${v} V3`).toBeGreaterThanOrEqual(0.2);
      expect(stAt(e, 'V3'), `${v} V3`).toBeLessThanOrEqual(0.35);
    }
    for (const v of [0.22, 0.26, 0.3, 0.31, 0.38, 0.45]) for (const l of ['V5', 'V6'] as const) expect(stAt(played('i3', 0, v), l), `${v} ${l}`).toBeLessThan(0.1);
    const [lo, hi] = [played('i3', 0, 0.31), played('i3', 0, 0.45)];
    for (const l of ['V2', 'V3', 'V4'] as const) expect(stAt(hi, l), l).toBeGreaterThan(stAt(lo, l) + 0.05);
    expect(stAt(hi, 'III')).toBeLessThan(stAt(lo, 'III') - 0.03);
  });
});

describe('i4: inferior and RV infarction on the tracings', () => {
  it('hook and contrast A (RCA): III > II, I and aVL depressed', () => {
    for (const src of [blocksOf('i4', 'hook')[0].ecg, blocksOf('i4', 'contrast')[0].left.ecg]) {
      const e = ecgOf(src);
      expect(stAt(e, 'III')).toBeGreaterThan(stAt(e, 'II'));
      for (const l of ['I', 'aVL'] as const) expect(stAt(e, l), l).toBeLessThan(-0.03);
    }
  });
  it('worked (RV): II, III, aVF elevated with III the tallest, I and aVL depressed (also on the J+60 read-outs), V1 ≥ 1 mm, V4R ≥ 0.5 mm', () => {
    const e = ecgOf(blocksOf('i4', 'worked')[0].ecg);
    expect(stAt(e, 'V1')).toBeGreaterThanOrEqual(0.1);
    expect(stAt(e, 'V4R')).toBeGreaterThanOrEqual(0.05);
    expect(stAt(e, 'III')).toBeGreaterThan(Math.max(stAt(e, 'II'), stAt(e, 'aVF')));
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    for (const l of ['I', 'aVL'] as const) expect(stAt(e, l), l).toBeLessThanOrEqual(-0.05);
    const ro = e.truth!.stMv;
    expect(ro.III!, 'st60 read-outs: III > II').toBeGreaterThan(ro.II!);
    expect(ro.I!, 'st60 read-out: I depressed').toBeLessThanOrEqual(-0.05);
  });
  it('film: RCA frame = the hook with V1 flat; LCx II ≥ III with I flat, V5–V6 rising and aVL down; RV frame V1 about 1 mm over an inferior STEMI', () => {
    expect(blocksOf('i4', 'film')[0].frames[0].ecg).toEqual(blocksOf('i4', 'hook')[0].ecg);
    expect(Math.abs(stAt(frame('i4', 0, 0), 'V1'))).toBeLessThan(0.04);
    const lcx = frame('i4', 0, 1);
    expect(stAt(lcx, 'II')).toBeGreaterThanOrEqual(stAt(lcx, 'III'));
    expect(Math.abs(stAt(lcx, 'I'))).toBeLessThan(0.03);
    for (const l of ['V5', 'V6'] as const) expect(stAt(lcx, l), l).toBeGreaterThan(0.05);
    expect(stAt(lcx, 'aVL')).toBeLessThan(-0.05);
    const rv = frame('i4', 0, 2);
    expect(stAt(rv, 'V1')).toBeGreaterThanOrEqual(0.075);
    expect(stAt(rv, 'V1')).toBeLessThanOrEqual(0.125);
    expect(stAt(rv, 'III')).toBeGreaterThan(stAt(rv, 'II'));
  });
  it('injury sweep notes: III above II and aVL below the baseline at every value; I and aVL deeper at 0.40 than at 0.25', () => {
    for (const v of [0.15, 0.2, 0.24, 0.25, 0.32, 0.4]) {
      const e = played('i4', 0, v);
      expect(stAt(e, 'III'), `${v}`).toBeGreaterThan(stAt(e, 'II') + 0.02);
      expect(stAt(e, 'aVL'), `${v}`).toBeLessThan(-0.05);
    }
    const [lo, hi] = [played('i4', 0, 0.25), played('i4', 0, 0.4)];
    for (const l of ['I', 'aVL'] as const) expect(stAt(hi, l), l).toBeLessThan(stAt(lo, l) - 0.03);
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(hi, l), l).toBeGreaterThan(stAt(lo, l) + 0.05);
  });
  it('posterior extension frame: V1–V4 depressed (deepest in V3), upright T in V3, III > II with I and aVL depressed and V5–V6 not elevated (dominant RCA)', () => {
    const e = frame('i4', 0, 3);
    for (const l of ['V1', 'V2', 'V3', 'V4'] as const) expect(stAt(e, l), l).toBeLessThanOrEqual(-0.05);
    for (const l of ['V1', 'V2', 'V4'] as const) expect(stAt(e, 'V3'), l).toBeLessThan(stAt(e, l));
    expect(tUpright(e, 'V3')).toBe(true);
    expect(stAt(e, 'III')).toBeGreaterThan(stAt(e, 'II'));
    for (const l of ['I', 'aVL'] as const) expect(stAt(e, l), l).toBeLessThan(-0.03);
    for (const l of ['V5', 'V6'] as const) expect(stAt(e, l), l).toBeLessThan(0.05);
  });
});

describe('i5: lateral STEMI on the tracings', () => {
  it('hook and contrast A (high lateral, D1): I and aVL about 1–2 mm (aVL about 2), V1–V2 about 1.5 mm, V3 lower (about 1 mm), V4–V6 < 1 mm and fading towards V6, III about −3 mm with II/aVF down', () => {
    for (const src of [blocksOf('i5', 'hook')[0].ecg, blocksOf('i5', 'contrast')[0].left.ecg]) {
      const e = ecgOf(src);
      for (const l of ['I', 'aVL', 'V2'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
      for (const l of ['I', 'aVL'] as const) expect(stAt(e, l), `${l} about 1–2 mm`).toBeLessThanOrEqual(0.225);
      expect(stAt(e, 'aVL')).toBeGreaterThan(0.18);
      for (const l of ['V1', 'V2'] as const) {
        expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.125);
        expect(stAt(e, l), l).toBeLessThanOrEqual(0.175);
      }
      expect(stAt(e, 'V3')).toBeLessThan(stAt(e, 'V2'));
      expect(stAt(e, 'V3')).toBeGreaterThanOrEqual(0.075);
      expect(stAt(e, 'V3')).toBeLessThanOrEqual(0.125);
      for (const l of ['V4', 'V5', 'V6'] as const) expect(stAt(e, l), l).toBeLessThan(0.1);
      for (const [a, b] of [['V2', 'V3'], ['V3', 'V4'], ['V4', 'V5'], ['V5', 'V6']] as const) expect(stAt(e, b), `${b} below ${a}`).toBeLessThan(stAt(e, a));
      expect(stAt(e, 'III')).toBeLessThanOrEqual(-0.275);
      expect(stAt(e, 'III')).toBeGreaterThanOrEqual(-0.325);
      for (const l of ['II', 'aVF'] as const) expect(stAt(e, l), l).toBeLessThan(-0.15);
    }
  });
  it('heart block: the lit segments are the injured lateral wall; aVR, V1–V2 and III depressed', () => {
    const h = blocksOf('i5', 'heart')[0];
    const req = h.ecg.kind === 'synth' ? h.ecg.req : null;
    const sc = scenarios().find((s) => s.id === req?.scenario);
    const injured = sc!.source.injury!.flatMap((x) => (typeof x.where === 'string' ? [] : [...x.where]));
    expect([...(h.emphasize ?? [])].sort()).toEqual([...new Set(injured)].sort());
    const e = ecgOf(h.ecg);
    for (const l of ['aVR', 'V1', 'V2', 'III'] as const) expect(stAt(e, l), l).toBeLessThanOrEqual(-0.05);
  });
  it('worked and contrast B (lateral): V5–V6 about 1.5–2 mm, I/aVL about 1 mm, III about −1 mm and aVF about −0.5 mm with II spared, the mirror also in V1–V2 and aVR (about 0.5–1 mm)', () => {
    for (const src of [blocksOf('i5', 'worked')[0].ecg, blocksOf('i5', 'contrast')[0].right.ecg]) {
      const e = ecgOf(src);
      for (const l of ['V5', 'V6'] as const) {
        expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.15);
        expect(stAt(e, l), l).toBeLessThanOrEqual(0.225);
      }
      expect(stAt(e, 'aVF'), 'aVF about −0.5 mm').toBeLessThanOrEqual(-0.025);
      expect(stAt(e, 'aVF'), 'aVF about −0.5 mm').toBeGreaterThanOrEqual(-0.075);
      for (const l of ['V1', 'V2', 'aVR'] as const) expect(stAt(e, l), `${l} about −0.5 to −1 mm`).toBeGreaterThanOrEqual(-0.125);
      for (const l of ['I', 'aVL'] as const) {
        expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
        expect(stAt(e, l), l).toBeLessThanOrEqual(0.125);
        expect(stAt(e, l), l).toBeLessThan(stAt(e, 'V5'));
      }
      expect(stAt(e, 'III')).toBeLessThanOrEqual(-0.1);
      expect(stAt(e, 'III')).toBeGreaterThanOrEqual(-0.125);
      expect(Math.abs(stAt(e, 'II'))).toBeLessThan(0.03);
      for (const l of ['V1', 'V2', 'aVR'] as const) expect(stAt(e, l), l).toBeLessThanOrEqual(-0.05);
      for (const l of ['V1', 'V2', 'V3'] as const) expect(stAt(e, l), l).toBeLessThan(0.01);
    }
  });
  it('injury sweep notes (J point): aVL ≥ 1 mm with I under 1 mm at 0.15–0.21; I and aVL both ≥ 1 mm at 0.22–0.28 with III the biggest deflection of all twelve leads; III deeper than aVL is high at every value', () => {
    for (const v of [0.15, 0.21]) {
      const e = played('i5', 0, v);
      expect(stAt(e, 'aVL'), `${v} aVL`).toBeGreaterThanOrEqual(0.1);
      expect(stAt(e, 'I'), `${v} I`).toBeLessThan(0.1);
    }
    for (const v of [0.22, 0.28]) {
      const e = played('i5', 0, v);
      for (const l of ['I', 'aVL'] as const) expect(stAt(e, l), `${v} ${l}`).toBeGreaterThanOrEqual(0.1);
      const others = ALL.filter((l) => l !== 'III').map((l) => Math.abs(stAt(e, l)));
      expect(-stAt(e, 'III'), `${v}: III the biggest deflection`).toBeGreaterThan(Math.max(...others));
    }
    for (const v of [0.15, 0.21, 0.22, 0.28]) {
      const e = played('i5', 0, v);
      expect(-stAt(e, 'III'), `${v}`).toBeGreaterThan(stAt(e, 'aVL'));
      expect(Math.min(...ALL.map((l) => stAt(e, l))), `${v}`).toBe(stAt(e, 'III'));
    }
    const [lo, hi] = [played('i5', 0, 0.15), played('i5', 0, 0.28)];
    expect(stAt(lo, 'III') - stAt(hi, 'III')).toBeGreaterThan(stAt(hi, 'aVL') - stAt(lo, 'aVL'));
  });
  it('low-lateral frame: V5–V6 1.5–2 mm, I/aVL about 1 mm, III about −1 mm with II spared, V1–V2 down', () => {
    const e = frame('i5', 0, 1);
    for (const l of ['V5', 'V6'] as const) {
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.15);
      expect(stAt(e, l), l).toBeLessThanOrEqual(0.2);
    }
    for (const l of ['I', 'aVL'] as const) {
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.075);
      expect(stAt(e, l), l).toBeLessThanOrEqual(0.125);
    }
    expect(stAt(e, 'III')).toBeLessThanOrEqual(-0.075);
    expect(stAt(e, 'III')).toBeGreaterThanOrEqual(-0.125);
    expect(Math.abs(stAt(e, 'II'))).toBeLessThan(0.03);
    for (const l of ['V1', 'V2'] as const) expect(stAt(e, l), l).toBeLessThan(-0.05);
  });
  it('the "flag" frame: I/aVL up, III down and V2 up about 1.5 mm (as much as V1: all three stripes, D1); V3 about 1 mm, V4–V6 < 1 mm', () => {
    const e = frame('i5', 0, 0);
    for (const l of ['I', 'aVL'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    expect(stAt(e, 'III')).toBeLessThan(-0.1);
    expect(stAt(e, 'V2')).toBeGreaterThan(0.12);
    expect(stAt(e, 'V2')).toBeGreaterThanOrEqual(stAt(e, 'V1') - 0.02);
    expect(stAt(e, 'V3')).toBeLessThan(stAt(e, 'V2'));
    expect(stAt(e, 'V3')).toBeGreaterThanOrEqual(0.075);
    expect(stAt(e, 'V3')).toBeLessThanOrEqual(0.125);
    for (const l of ['V4', 'V5', 'V6'] as const) expect(stAt(e, l), l).toBeLessThan(0.1);
  });
  it('anterolateral frame: V3–V6 and I/aVL ≥ 1 mm, V1 not elevated, III and aVF down', () => {
    const e = frame('i5', 0, 2);
    for (const l of ['III', 'aVF'] as const) expect(stAt(e, l), l).toBeLessThan(-0.05);
    for (const l of ['V3', 'V4', 'V5', 'V6', 'I', 'aVL'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    expect(stAt(e, 'V1')).toBeLessThan(0.05);
  });
});

describe('i6: posterior infarction on the tracings', () => {
  it('hook / worked: V1–V2 depressed about 1.5 mm, about 1 mm in V3, gone by V4; V5–V6 elevated about 1–1.5 mm, I/aVL slightly (< 1 mm); inferior leads not elevated and III a mirror; V8 ≥ 0.5 mm', () => {
    for (const src of [blocksOf('i6', 'hook')[0].ecg, blocksOf('i6', 'worked')[0].ecg]) {
      const e = ecgOf(src);
      for (const l of ['V1', 'V2'] as const) {
        expect(stAt(e, l), l).toBeLessThanOrEqual(-0.125);
        expect(stAt(e, l), l).toBeGreaterThanOrEqual(-0.175);
        expect(Math.abs(stAt(e, l, 60) - stAt(e, l)), `${l} horizontal`).toBeLessThan(0.03);
      }
      expect(stAt(e, 'V3')).toBeLessThanOrEqual(-0.075);
      expect(stAt(e, 'V3')).toBeGreaterThanOrEqual(-0.125);
      expect(stAt(e, 'V3')).toBeGreaterThan(Math.min(stAt(e, 'V1'), stAt(e, 'V2')));
      expect(Math.abs(stAt(e, 'V4'))).toBeLessThan(0.03);
      for (const l of ['V5', 'V6'] as const) {
        expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
        expect(stAt(e, l), l).toBeLessThanOrEqual(0.175);
      }
      for (const l of ['I', 'aVL'] as const) {
        expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.05);
        expect(stAt(e, l), l).toBeLessThan(0.1);
      }
      for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(e, l), l).toBeLessThan(0.1);
      expect(stAt(e, 'III'), 'III a mirror').toBeLessThanOrEqual(-0.05);
      expect(tw(e, 'V2').max, 'terminal T in V2 ends upright').toBeGreaterThan(0.05);
      // 2026-10-29 B11: the mirror T rises out of the depressed ST and ends upright in V1–V3 (T peak > 1 mm), in V2–V3
      // higher than the depth of the ST depression
      for (const l of ['V1', 'V2', 'V3'] as const) expect(tw(e, l).max, `upright T ${l}`).toBeGreaterThan(0.1);
      for (const l of ['V2', 'V3'] as const) expect(tw(e, l).max, `upright T ${l}`).toBeGreaterThan(-tw(e, l).min);
    }
    expect(stAt(ecgOf(blocksOf('i6', 'worked')[0].ecg), 'V8')).toBeGreaterThanOrEqual(0.05);
  });
  it('contrast A (posterolateral): depression deepest in V1–V2 and horizontal there, gone by V4, I, aVL and V5–V6 elevated', () => {
    const e = ecgOf(blocksOf('i6', 'contrast')[0].left.ecg);
    expect(['V1', 'V2']).toContain(ALL.reduce((m, l) => (stAt(e, l) < stAt(e, m) ? l : m)));
    for (const l of ['V1', 'V2'] as const) {
      expect(stAt(e, l), l).toBeLessThanOrEqual(-0.05);
      expect(Math.abs(stAt(e, l, 60) - stAt(e, l)), `${l} horizontal`).toBeLessThan(0.03);
    }
    expect(Math.abs(stAt(e, 'V4'))).toBeLessThan(0.03);
    for (const l of ['I', 'aVL', 'V5', 'V6'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.05);
  });
  it('contrast B (subendocardial): depression in V4–V6 and I/aVL, V1–V2 not depressed, nothing up ≥ 1 mm (caption and point)', () => {
    const e = ecgOf(blocksOf('i6', 'contrast')[0].right.ecg);
    for (const l of ['V4', 'V5', 'V6', 'I', 'aVL'] as const) expect(stAt(e, l), l).toBeLessThanOrEqual(-0.05);
    for (const l of ['V1', 'V2'] as const) expect(stAt(e, l), l).toBeGreaterThan(0);
    for (const l of ALL) expect(stAt(e, l), l).toBeLessThan(0.1);
  });
  it('evolution film (same seed): acute V1–V2 about −1.5 mm with R < S in V2; days later R outgrows S in V2, upright T in V1–V2, shallower ST, smaller lateral R', () => {
    const evo = blocksOf('i6', 'film')[1].frames;
    expect(new Set(evo.map((f) => (f.ecg.kind === 'synth' ? f.ecg.req.seed : -1))).size).toBe(1);
    const [acute, e] = evo.map((f) => ecgOf(f.ecg));
    for (const l of ['V1', 'V2'] as const) {
      expect(stAt(acute, l), l).toBeLessThan(-0.12);
      expect(stAt(acute, l), l).toBeGreaterThan(-0.18);
      expect(tw(acute, l).max, l).toBeGreaterThan(0.1);
      expect(stAt(e, l), l).toBeGreaterThan(stAt(acute, l));
    }
    expect(qrs(acute, 'V2').max).toBeLessThan(-qrs(acute, 'V2').min);
    for (const l of ['V5', 'V6'] as const) expect(qrs(e, l).max, l).toBeLessThan(qrs(acute, l).max - 0.2);
    expect(qrs(e, 'V2').max).toBeGreaterThan(-qrs(e, 'V2').min);
    for (const l of ['V1', 'V2'] as const) expect(tUpright(e, l), l).toBe(true);
  });
  it('company film: the hook first (shown before the prediction), then the isolated frame V1–V4 down with upright T and nothing elevated', () => {
    const iso = frame('i6', 0, 1);
    for (const l of ['V1', 'V2', 'V3', 'V4'] as const) expect(stAt(iso, l), l).toBeLessThanOrEqual(-0.05);
    for (const l of ['V2', 'V3'] as const) expect(tUpright(iso, l), l).toBe(true);
    expect(tw(iso, 'V1').max).toBeGreaterThan(0.1);
    for (const l of ALL) expect(stAt(iso, l), l).toBeLessThan(0.05);
    expect(blocksOf('i6', 'film')[0].frames[0].ecg).toEqual(blocksOf('i6', 'hook')[0].ecg);
  });
  it('inferoposterior frame: II, III, aVF up with III > II, I and aVL depressed, V1–V3 depressed, V5–V6 not elevated (dominant RCA)', () => {
    const e = frame('i6', 0, 2);
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    expect(stAt(e, 'III')).toBeGreaterThan(stAt(e, 'II'));
    for (const l of ['I', 'aVL', 'V1', 'V2', 'V3'] as const) expect(stAt(e, l), l).toBeLessThanOrEqual(-0.05);
    for (const l of ['V5', 'V6'] as const) expect(stAt(e, l), l).toBeLessThan(0.05);
  });
  it('company film prediction: V5–V6, up on the opening tracing, do not rise when the inferior wall joins instead (a yes/no question, not a scale)', () => {
    const p = blocksOf('i6', 'film')[0].predict!;
    expect(p.ordered).toBeUndefined();
    expect(p.answer).toBe(1);
    expect(p.options[p.answer].en).toBe('No, they do not rise');
    for (const l of ['V5', 'V6'] as const) {
      expect(stAt(frame('i6', 0, 0), l), `opening tracing ${l} up`).toBeGreaterThanOrEqual(0.05);
      expect(stAt(frame('i6', 0, 2), l), `inferoposterior ${l} not up`).toBeLessThan(0.05);
    }
  });
});

describe('i7: subtle occlusion on the tracings', () => {
  it('hook / "below the line" frame (man of 52): V2–V4 up to about 1 mm, most in V3, under the 2-mm limit, bulky T in V3, the faint mirror an inverted T in III', () => {
    for (const src of [blocksOf('i7', 'hook')[0].ecg, blocksOf('i7', 'film')[0].frames[1].ecg]) {
      const e = ecgOf(src);
      for (const l of ['V2', 'V3'] as const) expect(stAt(e, l), l).toBeLessThan(0.2);
      expect(stAt(e, 'V3')).toBeGreaterThanOrEqual(0.075);
      expect(stAt(e, 'V3')).toBeLessThanOrEqual(0.125);
      for (const l of ['V2', 'V4'] as const) {
        expect(stAt(e, l), l).toBeGreaterThan(0.05);
        expect(stAt(e, l), l).toBeLessThan(stAt(e, 'V3'));
      }
      expect(tw(e, 'V3').max).toBeGreaterThan(0.5 * qrs(e, 'V3').p2p);
      expect(stAt(e, 'III')).toBeLessThan(-0.02);
      expect(tInverted(e, 'III')).toBe(true);
    }
  });
  it('hyperacute T: in V3 the T is taller than the R; the J point in V2 under 1 mm', () => {
    for (const src of [blocksOf('i7', 'film')[0].frames[2].ecg, blocksOf('i7', 'worked')[0].ecg]) {
      const e = ecgOf(src);
      expect(tw(e, 'V3').max).toBeGreaterThan(qrs(e, 'V3').max);
      expect(stAt(e, 'V2')).toBeLessThan(0.1);
    }
  });
  it('worked (man of 55): V3 T/QRS (R + S) about 0.85; J and J+60 in V2 about 0.5 mm', () => {
    const e = ecgOf(blocksOf('i7', 'worked')[0].ecg);
    expect(tw(e, 'V3').max / qrs(e, 'V3').p2p).toBeGreaterThanOrEqual(0.8);
    expect(tw(e, 'V3').max / qrs(e, 'V3').p2p).toBeLessThanOrEqual(0.9);
    for (const plus of [0, 60]) {
      expect(stAt(e, 'V2', plus), `V2 J+${plus}`).toBeGreaterThanOrEqual(0.025);
      expect(stAt(e, 'V2', plus), `V2 J+${plus}`).toBeLessThanOrEqual(0.075);
    }
  });
  it('contrast A (occlusion) elevation at most about 1 mm (V3 the highest) with an inverted T in III; B (early repolarisation): V2–V3 about 1.5 mm at J+60 (slightly above A, under 2.5 mm), inferior J notches, no depression outside aVR; T/QRS (R + S) in V2 about two-thirds against a third, in V3 about 0.7 against 0.55', () => {
    const e = ecgOf(blocksOf('i7', 'contrast')[0].right.ecg);
    const a = ecgOf(blocksOf('i7', 'contrast')[0].left.ecg);
    expect(CHEST.reduce((m, l) => (stAt(a, l) > stAt(a, m) ? l : m))).toBe('V3');
    expect(stAt(a, 'V3')).toBeGreaterThanOrEqual(0.075);
    expect(stAt(a, 'V3')).toBeLessThanOrEqual(0.125);
    expect(tInverted(a, 'III')).toBe(true);
    for (const l of ['V2', 'V3'] as const) {
      expect(stAt(e, l), l).toBeLessThan(0.25);
      expect(stAt(e, l, 60), l).toBeGreaterThanOrEqual(0.125);
      expect(stAt(e, l, 60), l).toBeLessThanOrEqual(0.175);
      expect(stAt(e, l, 60), l).toBeGreaterThan(stAt(a, l, 60));
    }
    for (const l of ['V1', 'V4', 'V5', 'V6'] as const) expect(stAt(e, l), l).toBeGreaterThan(0.05);
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(e, l), l).toBeGreaterThan(0.07);
    for (const l of ALL.filter((x) => x !== 'aVR')) expect(stAt(e, l), l).toBeGreaterThan(-0.05);
    const i7TOverQrs = (x: Ecg, l: AnyLead) => tw(x, l).max / qrs(x, l).p2p;
    const near = (v: number, x: number) => Math.abs(v - x) <= 0.05;
    expect(near(i7TOverQrs(a, 'V2'), 2 / 3), `A V2 ${i7TOverQrs(a, 'V2')}`).toBe(true);
    expect(near(i7TOverQrs(e, 'V2'), 1 / 3), `B V2 ${i7TOverQrs(e, 'V2')}`).toBe(true);
    expect(near(i7TOverQrs(a, 'V3'), 0.7), `A V3 ${i7TOverQrs(a, 'V3')}`).toBe(true);
    expect(near(i7TOverQrs(e, 'V3'), 0.55), `B V3 ${i7TOverQrs(e, 'V3')}`).toBe(true);
  });
  it('serial film (same seed, hyperacute then acute): first J under 1 mm in V2–V4 with the V3 T almost as tall as the R and T inverted in III; repeat V2–V3 ≥ 2 mm, V3 about 3.5 mm, III and aVF 1–1.5 mm down, the inferior mirror deepened', () => {
    const [f1, f2] = blocksOf('i7', 'film')[1].frames;
    if (f1.ecg.kind !== 'synth' || f2.ecg.kind !== 'synth') throw new Error('synthetic frames');
    expect(f1.ecg.req.seed).toBe(f2.ecg.req.seed);
    expect(f1.ecg.req.scenario).toBe(f2.ecg.req.scenario);
    const [first, e] = [ecgOf(f1.ecg), ecgOf(f2.ecg)];
    for (const l of ['V2', 'V3', 'V4'] as const) expect(stAt(first, l), l).toBeLessThan(0.1);
    expect(tw(first, 'V3').max).toBeGreaterThan(0.8 * qrs(first, 'V3').max);
    expect(tw(first, 'V3').max).toBeLessThanOrEqual(qrs(first, 'V3').max);
    expect(tInverted(first, 'III')).toBe(true);
    for (const l of ['V2', 'V3'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.2);
    expect(stAt(e, 'V3')).toBeGreaterThanOrEqual(0.325);
    expect(stAt(e, 'V3')).toBeLessThanOrEqual(0.375);
    for (const l of ['III', 'aVF'] as const) {
      expect(stAt(e, l), l).toBeLessThanOrEqual(-0.1);
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(-0.15);
    }
    expect(stAt(e, 'III')).toBeLessThan(stAt(first, 'III') - 0.05);
  });
  it('T-beside-QRS film: normal V3 T under half the R; below the line V3 about 1 mm; hyperacute (seed 922) J under 1 mm in V2–V4, broad-based V3 T (half-height width ≥ 100 ms) and T inverted in III; hyperkalaemia T tall but narrow (half-height width under 0.7 of the hyperacute T) with PR ≥ 200 ms and QRS 110–120 ms', () => {
    const normal = frame('i7', 0, 0);
    expect(tw(normal, 'V3').max).toBeLessThan(0.5 * qrs(normal, 'V3').max);
    const borderline = frame('i7', 0, 1);
    expect(stAt(borderline, 'V3')).toBeGreaterThanOrEqual(0.075);
    expect(stAt(borderline, 'V3')).toBeLessThanOrEqual(0.125);
    expect(tw(borderline, 'V3').max).toBeGreaterThan(qrs(borderline, 'V3').max);
    expect(tInverted(borderline, 'III')).toBe(true);
    const halfWidth = (e: Ecg, l: AnyLead): number => {
      const b = midBeat(e);
      const a = sig(e, l);
      const fs = e.signal.fs;
      const base = baselineBefore(a, fs, b.qrsOn);
      const peak = tw(e, l).max;
      let n = 0;
      for (let i = Math.round(((b.j + 40) * fs) / 1000); i <= Math.round((b.tOff * fs) / 1000); i++) if (a[i] - base > peak / 2) n++;
      return (n * 1000) / fs;
    };
    const [hyperacute, k] = [frame('i7', 0, 2), frame('i7', 0, 3)];
    const hSrc = blocksOf('i7', 'film')[0].frames[2].ecg;
    expect(hSrc.kind === 'synth' && hSrc.req.seed).toBe(922);
    for (const l of ['V2', 'V3', 'V4'] as const) expect(stAt(hyperacute, l), l).toBeLessThan(0.1);
    expect(tw(hyperacute, 'V3').max).toBeGreaterThan(qrs(hyperacute, 'V3').max);
    expect(halfWidth(hyperacute, 'V3')).toBeGreaterThanOrEqual(100);
    expect(tInverted(hyperacute, 'III')).toBe(true);
    expect(tw(k, 'V3').max).toBeGreaterThan(qrs(k, 'V3').max);
    expect(halfWidth(k, 'V3')).toBeLessThan(0.7 * halfWidth(hyperacute, 'V3'));
    expect(k.truth!.prMs!).toBeGreaterThanOrEqual(200);
    expect(k.truth!.qrsMs).toBeGreaterThanOrEqual(110);
    expect(k.truth!.qrsMs).toBeLessThan(120);
    expect(hyperacute.truth!.qrsMs).toBeLessThan(100);
  });
});

describe('i8: Wellens, de Winter, aVR on the tracings', () => {
  /** times (ms) of the T peak and the T trough, J + 40 ms → T end */
  const i8PeakTimes = (e: Ecg, l: AnyLead): { up: number; down: number } => {
    const b = midBeat(e);
    const a = sig(e, l);
    const fs = e.signal.fs;
    const i0 = Math.round(((b.j + 40) * fs) / 1000);
    let up = i0;
    let down = i0;
    for (let i = i0; i <= Math.round((b.tOff * fs) / 1000); i++) {
      if (a[i] > a[up]) up = i;
      if (a[i] < a[down]) down = i;
    }
    return { up: (up * 1000) / fs, down: (down * 1000) / fs };
  };
  it('Wellens A (hook, and the heart block on the same tracing): T in V3 up then down, in V2 inverted, ST isoelectric, R preserved, no Q in V2–V3', () => {
    expect(blocksOf('i8', 'heart')[0].ecg).toEqual(blocksOf('i8', 'hook')[0].ecg);
    const e = ecgOf(blocksOf('i8', 'hook')[0].ecg);
    expect(tw(e, 'V3').max).toBeGreaterThan(0.05);
    expect(tw(e, 'V3').min).toBeLessThan(-0.05);
    expect(i8PeakTimes(e, 'V3').up).toBeLessThan(i8PeakTimes(e, 'V3').down);
    expect(tInverted(e, 'V2')).toBe(true);
    for (const l of ['V2', 'V3'] as const) {
      expect(Math.abs(stAt(e, l)), l).toBeLessThan(0.05);
      expect(shape(e, l), `${l} starts without a Q`).toMatch(/^R/i);
    }
    expect(qrs(e, 'V3').max).toBeGreaterThan(0.5);
  });
  it('Wellens B frame: T inversion about 7 mm deep in V2–V3 with no real upright start (T max under a tenth of the depth and under half the type A upright part), ST flat, R preserved; the inversion reaches V1 to V4 and stops there (the prediction); type A frame = the hook', () => {
    expect(blocksOf('i8', 'film')[0].frames[0].ecg).toEqual(blocksOf('i8', 'hook')[0].ecg);
    const e = frame('i8', 0, 1);
    const typeA = frame('i8', 0, 0);
    for (const l of ['V2', 'V3'] as const) {
      expect(tw(e, l).min, l).toBeLessThanOrEqual(-0.665);
      expect(tw(e, l).min, l).toBeGreaterThanOrEqual(-0.735);
      expect(Math.abs(stAt(e, l)), l).toBeLessThan(0.03);
      expect(tw(e, l).max, `${l} upright start`).toBeLessThan(0.1 * -tw(e, l).min);
      expect(tw(e, l).max, `${l} upright start against type A`).toBeLessThan(0.5 * tw(typeA, l).max);
    }
    expect(qrs(e, 'V3').max).toBeGreaterThan(0.5);
    for (const l of ['V1', 'V4'] as const) expect(tw(e, l).min, l).toBeLessThan(-0.1);
    const p = blocksOf('i8', 'film')[0].predict!;
    expect(p.options[p.answer].en).toBe('V1 to V4');
    for (const l of ['V1', 'V2', 'V3', 'V4'] as const) expect(tInverted(e, l), l).toBe(true);
    for (const l of ['V5', 'V6'] as const) expect(tUpright(e, l), l).toBe(true);
  });
  it('de Winter frame: J depressed > 2 mm in V2–V4 and upsloping, tall T in V3, slight elevation in aVR, no chest elevation (V1–V6 below the baseline at J, J+60 and all through J → J+80 ms)', () => {
    const e = frame('i8', 0, 2);
    const b = midBeat(e);
    for (const l of ['V2', 'V3', 'V4'] as const) {
      expect(stAt(e, l), l).toBeLessThan(-0.2);
      expect(stAt(e, l, 60), l).toBeGreaterThan(stAt(e, l));
    }
    expect(tw(e, 'V3').max).toBeGreaterThan(0.5);
    expect(stAt(e, 'aVR')).toBeGreaterThan(0.05);
    for (const l of CHEST) {
      expect(stAt(e, l), l).toBeLessThan(0.05);
      expect(stAt(e, l, 60), `${l} J+60`).toBeLessThan(0.05);
      expect(span(e, l, b.j, b.j + 80, b).max, `${l} J → J+80`).toBeLessThan(0.05);
    }
  });
  it('aVR + diffuse depression (worked, and the heart block on the same tracing): seven leads depressed ≥ 1 mm at J (II, III, aVF, V2–V5), V6 less, I barely, aVR about 1 mm up and the only lead raised, V1 depressed', () => {
    expect(blocksOf('i8', 'heart')[1].ecg).toEqual(blocksOf('i8', 'worked')[0].ecg);
    const e = ecgOf(blocksOf('i8', 'worked')[0].ecg);
    const depressed = ALL.filter((l) => stAt(e, l) <= -0.1);
    expect(depressed.length).toBe(7);
    for (const l of ['II', 'III', 'aVF', 'V2', 'V3', 'V4', 'V5'] as const) expect(depressed, l).toContain(l);
    expect(stAt(e, 'V6')).toBeLessThan(-0.05);
    expect(stAt(e, 'V6')).toBeGreaterThan(-0.1);
    expect(Math.abs(stAt(e, 'I'))).toBeLessThanOrEqual(0.05);
    expect(stAt(e, 'aVR')).toBeGreaterThanOrEqual(0.075);
    expect(stAt(e, 'aVR')).toBeLessThanOrEqual(0.125);
    for (const l of ALL.filter((x) => x !== 'aVR')) expect(stAt(e, l), l).toBeLessThan(0.05);
    expect(stAt(e, 'V1')).toBeLessThan(-0.05);
  });
  it('heavier frame: seven leads depressed ≥ 1 mm at J, aVR and V1 about 1 mm up, depression to about 2.5 mm', () => {
    const e = frame('i8', 0, 3);
    expect(ALL.filter((l) => stAt(e, l) <= -0.1).length).toBe(7);
    for (const l of ['aVR', 'V1'] as const) {
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.075);
      expect(stAt(e, l), l).toBeLessThanOrEqual(0.125);
    }
    expect(Math.min(...ALL.map((l) => stAt(e, l, 60)))).toBeLessThanOrEqual(-0.225);
    expect(Math.min(...ALL.map((l) => stAt(e, l, 60)))).toBeGreaterThanOrEqual(-0.275);
  });
  it('contrast: A Wellens in V2–V3; B lateral T inversion (I, aVL, V5, V6) with tall R', () => {
    const c = blocksOf('i8', 'contrast')[0];
    expect(tw(ecgOf(c.left.ecg), 'V2').min).toBeLessThan(-0.08);
    const b = ecgOf(c.right.ecg);
    for (const l of ['I', 'aVL', 'V5', 'V6'] as const) expect(tw(b, l).min, l).toBeLessThan(-0.1);
    expect(tInverted(b, 'V6')).toBe(true);
  });
});

describe('i9: evolution, Q waves and aneurysm on the tracings', () => {
  it('timeline film (one seed): hyperacute (V2 ST < 1 mm, T taller than R) → acute (V2 about 3 mm, III down, R and no Q) → evolving (V2 starts with a Q, T inverted, ST still up about 1 mm) → old (QS V1–V3, ST back), as in the hook (with upright T in V2–V3)', () => {
    const film = blocksOf('i9', 'film')[0];
    expect(new Set(film.frames.map((f) => (f.ecg.kind === 'synth' ? f.ecg.req.seed : -1))).size).toBe(1);
    const [p1, p2, p3, p4] = film.frames.map((f) => ecgOf(f.ecg));
    expect(tw(p1, 'V2').max).toBeGreaterThan(qrs(p1, 'V2').max);
    expect(stAt(p2, 'V2')).toBeGreaterThanOrEqual(0.275);
    expect(stAt(p2, 'V2')).toBeLessThanOrEqual(0.325);
    expect(stAt(p2, 'III')).toBeLessThan(-0.05);
    // hours: the R still there, no Q; about a day: V2 starts with a Q, the R gone (the prediction), the T inverted
    expect(shape(p2, 'V2'), 'hours: V2 starts with an R').toMatch(/^r/i);
    expect(shape(p3, 'V2'), 'about a day: V2 starts with a Q').toMatch(/^q/i);
    const p = film.predict!;
    expect(p.options[p.answer].en).toBe('With a Q: the R is gone');
    expect(tInverted(p3, 'V2')).toBe(true);
    expect(stAt(p3, 'V2')).toBeLessThan(0.13);
    for (const l of ['V1', 'V2', 'V3'] as const) {
      expect(qrs(p4, l).max, l).toBeLessThan(0.05);
      expect(Math.abs(stAt(p4, l)), l).toBeLessThan(0.05);
    }
    expect(stAt(p1, 'V2')).toBeLessThan(0.1);
    expect(tw(p1, 'V2').max).toBeGreaterThan(0.4);
    expect(stAt(p2, 'V2')).toBeGreaterThanOrEqual(0.2);
    expect(qDurMs(p3, 'V2')).toBeGreaterThanOrEqual(20);
    expect(tw(p3, 'V2').min).toBeLessThan(-0.1);
    expect(stAt(p3, 'V2')).toBeGreaterThanOrEqual(0.075);
    expect(stAt(p3, 'V2')).toBeLessThanOrEqual(0.125);
    const old = ecgOf(blocksOf('i9', 'hook')[0].ecg);
    for (const l of ['V1', 'V2', 'V3'] as const) {
      expect(qrs(old, l).max, l).toBeLessThan(0.05);
      expect(Math.abs(stAt(old, l)), l).toBeLessThan(0.05);
    }
    for (const l of ['V2', 'V3'] as const) expect(tUpright(old, l), `hook: upright T ${l}`).toBe(true);
  });
  it('worked (old inferior): Q about 35 ms and nearly 5 mm deep in II, QS in III and aVF, ST isoelectric, T upright in II and aVF, axis about −40°', () => {
    const e = ecgOf(blocksOf('i9', 'worked')[0].ecg);
    expect(qDurMs(e, 'II')).toBeGreaterThanOrEqual(30);
    expect(qDurMs(e, 'II')).toBeLessThanOrEqual(40);
    expect(shape(e, 'II')).toMatch(/^Q R/);
    expect(qrs(e, 'II').min, 'nearly 5 mm').toBeLessThanOrEqual(-0.45);
    expect(qrs(e, 'II').min, 'nearly 5 mm').toBeGreaterThanOrEqual(-0.5);
    for (const l of ['III', 'aVF'] as const) expect(qrs(e, l).max, l).toBeLessThan(0.05);
    for (const l of ['II', 'III', 'aVF'] as const) expect(Math.abs(stAt(e, l)), l).toBeLessThan(0.05);
    for (const l of ['II', 'aVF'] as const) expect(tUpright(e, l), `upright T ${l}`).toBe(true);
    expect(e.truth!.axisDeg.qrs).toBeGreaterThanOrEqual(-45);
    expect(e.truth!.axisDeg.qrs).toBeLessThanOrEqual(-35);
  });
  it('fragmented QRS (heart block): QS in V1–V3 and an extra r′ after the S in V4', () => {
    const e = ecgOf(blocksOf('i9', 'heart')[0].ecg);
    expect(qrs(e, 'V1').max).toBeLessThan(0.05);
    for (const l of ['V2', 'V3'] as const) expect(qrs(e, l).max, l).toBeLessThan(0.05);
    expect(shape(e, 'V4')).toMatch(/r′/);
  });
  it('contrast: both elevated ≥ 1 mm in V2–V3; aneurysm over wide Q waves (≥ 40 ms) in V2–V3 with T/QRS < 0.36 in every lead V1–V4; acute STEMI with no Q in V1–V4 and T/QRS > 0.36 in V2', () => {
    const c = blocksOf('i9', 'contrast')[0];
    const a = ecgOf(c.left.ecg);
    for (const l of ['V1', 'V2', 'V3', 'V4'] as const) expect(tOverQrs(a, l), l).toBeLessThan(0.36);
    for (const l of ['V2', 'V3'] as const) {
      expect(stAt(a, l), l).toBeGreaterThanOrEqual(0.1);
      expect(qDurMs(a, l), l).toBeGreaterThanOrEqual(40);
    }
    const b = ecgOf(c.right.ecg);
    expect(tOverQrs(b, 'V2')).toBeGreaterThan(0.36);
    for (const l of ['V2', 'V3'] as const) expect(stAt(b, l), l).toBeGreaterThanOrEqual(0.1);
    for (const l of ['V1', 'V2', 'V3', 'V4'] as const) expect(shape(b, l), `B ${l} starts without a Q`).toMatch(/^r/i);
  });
});

describe('i10: confounders on the tracings', () => {
  it('hook / worked / contrast B (Smith): ST/S ≤ −0.25 in V1–V3 (V3 about −0.3), no concordant elevation (V4 under 1 mm over a net-positive QRS) or depression', () => {
    for (const src of [blocksOf('i10', 'hook')[0].ecg, blocksOf('i10', 'worked')[0].ecg, blocksOf('i10', 'contrast')[0].right.ecg]) {
      const e = ecgOf(src);
      expect(e.truth!.qrsMs).toBeGreaterThanOrEqual(120);
      for (const l of ['V1', 'V2', 'V3'] as const) {
        expect(stOverS(e, l), l).toBeLessThanOrEqual(-0.25);
        expect(stAt(e, l), l).toBeGreaterThan(0.3);
      }
      expect(stOverS(e, 'V3')).toBeGreaterThan(-0.35);
      expect(qrs(e, 'V4').net).toBeGreaterThan(0);
      expect(stAt(e, 'V4')).toBeLessThan(0.1);
      for (const l of ALL) if (qrs(e, l).net > 0) expect(stAt(e, l), `${l}: concordant elevation`).toBeLessThan(0.1);
    }
  });
  /** depth of the S wave (mm) below the PR baseline */
  const i10SDepthMm = (e: Ecg, l: AnyLead): number => -qrs(e, l).min * 10;
  it('hook (man of 73): V3 J about 3.5 mm on an S about 13 mm deep, ST/S about −0.28; V2 about 5 mm on an S about 18 mm; V1 crosses −0.25 too', () => {
    const e = ecgOf(blocksOf('i10', 'hook')[0].ecg);
    expect(stAt(e, 'V3') * 10).toBeGreaterThanOrEqual(3.25);
    expect(stAt(e, 'V3') * 10).toBeLessThanOrEqual(3.75);
    expect(i10SDepthMm(e, 'V3')).toBeGreaterThanOrEqual(12.35);
    expect(i10SDepthMm(e, 'V3')).toBeLessThanOrEqual(13.65);
    expect(stOverS(e, 'V3')).toBeGreaterThanOrEqual(-0.29);
    expect(stOverS(e, 'V3')).toBeLessThanOrEqual(-0.27);
    expect(stAt(e, 'V2') * 10).toBeGreaterThanOrEqual(4.75);
    expect(stAt(e, 'V2') * 10).toBeLessThanOrEqual(5.25);
    expect(i10SDepthMm(e, 'V2')).toBeGreaterThanOrEqual(17.1);
    expect(i10SDepthMm(e, 'V2')).toBeLessThanOrEqual(18.9);
    for (const l of ['V1', 'V2'] as const) expect(stOverS(e, l), l).toBeLessThanOrEqual(-0.25);
  });
  it('worked (seed 983): wide QRS, R without septal q in I and V6, deep S in V1; I and V5–V6 depressed, aVL flat; V4 net positive ending in R′ with J about 0.5 mm; V3 J about 3.5 mm on an S about 11.5 mm, ST/S about −0.3; V1 and V2 about −0.27 and −0.29', () => {
    const e = ecgOf(blocksOf('i10', 'worked')[0].ecg);
    expect(e.truth!.qrsMs).toBeGreaterThanOrEqual(120);
    for (const l of ['I', 'V6'] as const) expect(shape(e, l), `${l} starts with the R`).toMatch(/^R/);
    expect(qrs(e, 'V1').min).toBeLessThan(-1);
    for (const l of ['I', 'V5', 'V6'] as const) expect(stAt(e, l), l).toBeLessThan(-0.05);
    expect(Math.abs(stAt(e, 'aVL'))).toBeLessThanOrEqual(0.05);
    expect(qrs(e, 'V4').net).toBeGreaterThan(0);
    expect(shape(e, 'V4')).toMatch(/R′$/);
    expect(stAt(e, 'V4')).toBeGreaterThanOrEqual(0.025);
    expect(stAt(e, 'V4')).toBeLessThanOrEqual(0.075);
    expect(stAt(e, 'V3') * 10).toBeGreaterThanOrEqual(3.25);
    expect(stAt(e, 'V3') * 10).toBeLessThanOrEqual(3.75);
    expect(i10SDepthMm(e, 'V3')).toBeGreaterThanOrEqual(10.925);
    expect(i10SDepthMm(e, 'V3')).toBeLessThanOrEqual(12.075);
    expect(stOverS(e, 'V3')).toBeGreaterThanOrEqual(-0.35);
    expect(stOverS(e, 'V3')).toBeLessThanOrEqual(-0.25);
    expect(stOverS(e, 'V1')).toBeGreaterThanOrEqual(-0.28);
    expect(stOverS(e, 'V1')).toBeLessThanOrEqual(-0.26);
    expect(stOverS(e, 'V2')).toBeGreaterThanOrEqual(-0.3);
    expect(stOverS(e, 'V2')).toBeLessThanOrEqual(-0.28);
  });
  it('contrast A (uncomplicated LBBB): ST/S about −0.1 in V1–V3, lateral ST discordant; B is also an LBBB baseline', () => {
    const e = ecgOf(blocksOf('i10', 'contrast')[0].left.ecg);
    for (const l of ['V1', 'V2', 'V3'] as const) {
      expect(stOverS(e, l), l).toBeGreaterThanOrEqual(-0.15);
      expect(stOverS(e, l), l).toBeLessThanOrEqual(-0.05);
    }
    for (const l of ['V5', 'V6'] as const) expect(stAt(e, l), l).toBeLessThan(0);
    for (const side of ['left', 'right'] as const) expect(ecgOf(blocksOf('i10', 'contrast')[0][side].ecg).truth!.findings, side).toContain('lbbb');
  });
  it('criterion 1 frame: concordant elevation 1.4–1.8 mm in V5–V6 over positive QRS', () => {
    const e = frame('i10', 0, 1);
    for (const l of ['V5', 'V6'] as const) {
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.14);
      expect(stAt(e, l), l).toBeLessThanOrEqual(0.18);
    }
    for (const l of ['V5', 'V6'] as const) {
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
      expect(qrs(e, l).net, l).toBeGreaterThan(0);
    }
  });
  it('criterion 2 frame: concordant depression ≥ 1 mm in V2–V3 (V3 about 2.5 mm, V1 about 0.5 mm) over negative QRS; no concordant elevation anywhere', () => {
    const e = frame('i10', 0, 2);
    expect(stAt(e, 'V3')).toBeLessThanOrEqual(-0.225);
    expect(stAt(e, 'V3')).toBeGreaterThanOrEqual(-0.275);
    for (const l of ['V1', 'V2', 'V3'] as const) expect(qrs(e, l).net, l).toBeLessThan(0);
    for (const l of ['V2', 'V3'] as const) expect(stAt(e, l), l).toBeLessThanOrEqual(-0.1);
    expect(stAt(e, 'V1')).toBeLessThan(-0.03);
    expect(stAt(e, 'V1')).toBeGreaterThan(-0.1);
    for (const l of ALL) if (qrs(e, l).net > 0) expect(stAt(e, l), `${l}: concordant elevation`).toBeLessThan(0.1);
  });
  it('RBBB frame: rsR′ in V1, T inverted in V1–V2, upright in V3–V6', () => {
    const e = frame('i10', 1, 0);
    expect(shape(e, 'V1')).toMatch(/R′/);
    for (const l of ['V1', 'V2'] as const) expect(tInverted(e, l), l).toBe(true);
    for (const l of ['V3', 'V4', 'V5', 'V6'] as const) expect(tUpright(e, l), l).toBe(true);
  });
  it('Smith frame = the hook; paced frame: QRS about 160 ms, QS in II, III, aVF and V1 with the T opposite (upright)', () => {
    expect(blocksOf('i10', 'film')[0].frames[0].ecg).toEqual(blocksOf('i10', 'hook')[0].ecg);
    const p = frame('i10', 0, 3);
    expect(p.truth!.rhythm).toBe('paced-rhythm');
    expect(Math.abs(p.truth!.qrsMs - 160)).toBeLessThan(5);
    for (const l of ['II', 'III', 'aVF', 'V1'] as const) {
      expect(qrs(p, l).max, l).toBeLessThan(0.02);
      expect(qrs(p, l).min, l).toBeLessThan(-1);
      expect(tUpright(p, l), l).toBe(true);
    }
  });
  it('LVH frame: discordant V1–V2 elevation well under 25 % of the S (ST/S above −0.15), lateral depression with inverted T', () => {
    const e = frame('i10', 1, 1);
    for (const l of ['V1', 'V2'] as const) {
      expect(stOverS(e, l), l).toBeLessThan(0);
      expect(stOverS(e, l), l).toBeGreaterThan(-0.15);
    }
    for (const l of ['V5', 'V6'] as const) {
      expect(stAt(e, l, 60), l).toBeLessThan(-0.05);
      expect(tInverted(e, l), l).toBe(true);
    }
  });
});

describe('i11: mimics on the tracings', () => {
  it('early repolarisation: J 1–2 mm in II, III, aVF (at or above the 1-mm ER threshold), elevation across V1–V6, depression only in aVR', () => {
    const e = frame('i11', 1, 1);
    for (const l of ['II', 'III', 'aVF'] as const) {
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
      expect(stAt(e, l), l).toBeLessThan(0.18);
    }
    for (const l of CHEST) expect(stAt(e, l), l).toBeGreaterThan(0.03);
    expect(stAt(e, 'aVR')).toBeLessThan(-0.05);
    for (const l of ALL.filter((x) => x !== 'aVR')) expect(stAt(e, l), l).toBeGreaterThan(-0.05);
  });
  it('pericarditis (hook, contrast A): widespread elevation incl. II and V2–V6, aVR depressed, no other lead depressed; PR segment down in II and V4–V6, up in aVR', () => {
    for (const src of [blocksOf('i11', 'hook')[0].ecg, blocksOf('i11', 'contrast')[0].left.ecg]) {
      const e = ecgOf(src);
      for (const l of ['II', 'aVF', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
      expect(stAt(e, 'aVR')).toBeLessThan(-0.05);
      for (const l of ALL.filter((x) => x !== 'aVR')) expect(stAt(e, l), l).toBeGreaterThan(-0.02);
      for (const l of ['II', 'V4', 'V5', 'V6'] as const) expect(prSegment(e, l), `PR ${l}`).toBeLessThan(-0.05);
      expect(prSegment(e, 'aVR'), 'PR aVR').toBeGreaterThan(0.05);
    }
  });
  it('contrast B (anterior STEMI): V1–V4 elevated, reciprocal depression in II, III, aVF, PR segment flat in II and aVR', () => {
    const e = ecgOf(blocksOf('i11', 'contrast')[0].right.ecg);
    for (const l of ['V1', 'V2', 'V3', 'V4'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(e, l), l).toBeLessThan(-0.05);
    for (const l of ['II', 'aVR'] as const) expect(Math.abs(prSegment(e, l)), `PR ${l}`).toBeLessThanOrEqual(0.05);
  });
  it('takotsubo: V3–V6 elevated, V1 not, aVR depressed, I, aVL and II slightly up (under 1 mm), III and aVF nearly isoelectric; late: QTc (Fridericia) about 505 ms with T inverted in V4–V6', () => {
    const e = ecgOf(blocksOf('i11', 'worked')[0].ecg);
    for (const l of ['V3', 'V4', 'V5', 'V6'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    expect(stAt(e, 'V1')).toBeLessThan(0.05);
    expect(stAt(e, 'aVR')).toBeLessThan(-0.03);
    for (const l of ['I', 'aVL', 'II'] as const) {
      expect(stAt(e, l), l).toBeGreaterThan(0.03);
      expect(stAt(e, l), l).toBeLessThan(0.1);
    }
    for (const l of ['III', 'aVF'] as const) expect(Math.abs(stAt(e, l)), l).toBeLessThan(0.05);
    const late = frame('i11', 0, 1);
    expect(Math.abs(late.truth!.qtcFridericiaMs - 505)).toBeLessThan(20);
    for (const l of ['V4', 'V5', 'V6'] as const) expect(tw(late, l).min, l).toBeLessThan(-0.05);
  });
  it('takotsubo film (one seed): acute = the worked tracing with V4 the highest at about 3 mm; days later no elevation, T inverted in V3–V6 and I, about 11 mm deep in V4–V5 and deepest there of all twelve leads (the prediction), QT about 480 ms', () => {
    const film = blocksOf('i11', 'film')[0];
    expect(film.frames[0].ecg).toEqual(blocksOf('i11', 'worked')[0].ecg);
    const [acute, late] = [frame('i11', 0, 0), frame('i11', 0, 1)];
    expect(CHEST.reduce((m, l) => (stAt(acute, l) > stAt(acute, m) ? l : m))).toBe('V4');
    expect(stAt(acute, 'V4')).toBeGreaterThanOrEqual(0.275);
    expect(stAt(acute, 'V4')).toBeLessThanOrEqual(0.325);
    for (const l of ALL) expect(stAt(late, l), l).toBeLessThan(0.05);
    for (const l of ['V3', 'V4', 'V5', 'V6', 'I'] as const) expect(tInverted(late, l), l).toBe(true);
    for (const l of ['V4', 'V5'] as const) {
      expect(tw(late, l).min, l).toBeLessThanOrEqual(-1.045);
      expect(tw(late, l).min, l).toBeGreaterThanOrEqual(-1.155);
    }
    const p = film.predict!;
    expect(p.options[p.answer].en).toBe('V4–V5');
    const deepest = ALL.reduce((m, l) => (tw(late, l).min < tw(late, m).min ? l : m));
    expect(['V4', 'V5']).toContain(deepest);
    const v45 = Math.max(tw(late, 'V4').min, tw(late, 'V5').min);
    for (const l of ['III', 'aVF', 'V1', 'V2'] as const) expect(tw(late, l).min, l).toBeGreaterThan(v45 + 0.3);
    expect(Math.abs(late.truth!.qtMs - 480)).toBeLessThan(5);
  });
  it('mimic film: pericarditis frame = the hook; early repolarisation inferior J 1–2 mm', () => {
    expect(blocksOf('i11', 'film')[1].frames[0].ecg).toEqual(blocksOf('i11', 'hook')[0].ecg);
    const er = frame('i11', 1, 1);
    for (const l of ['II', 'III', 'aVF'] as const) {
      expect(stAt(er, l), l).toBeGreaterThanOrEqual(0.1);
      expect(stAt(er, l), l).toBeLessThanOrEqual(0.2);
    }
  });
  it('Brugada type 1: coved elevation ≥ 2 mm in V1–V2 into a negative T, V3 normal', () => {
    const e = frame('i11', 1, 2);
    for (const l of ['V1', 'V2'] as const) {
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.2);
      expect(stAt(e, l, 60), l).toBeLessThan(stAt(e, l));
      expect(tw(e, l).min, l).toBeLessThan(-0.1);
    }
    expect(Math.abs(stAt(e, 'V3'))).toBeLessThan(0.05);
  });
  it('hyperkalaemia: tall T in V3–V5 (taller than the R in V4) and no ST elevation at J in any lead (so the mimic film does not call its frames ST elevations), PR ≥ 200 ms, QRS 110–120 ms; severe: no P wave, QRS > 150 ms', () => {
    const e = frame('i11', 1, 3);
    for (const l of ALL) expect(stAt(e, l), l).toBeLessThan(0.05);
    expect(tw(e, 'V4').max).toBeGreaterThan(qrs(e, 'V4').max);
    expect(e.truth!.prMs!).toBeGreaterThanOrEqual(200);
    expect(e.truth!.qrsMs).toBeGreaterThanOrEqual(110);
    expect(e.truth!.qrsMs).toBeLessThan(120);
    const s = frame('i11', 1, 4);
    expect(s.truth!.prMs).toBeNull();
    expect(s.truth!.qrsMs).toBeGreaterThan(150);
  });
  it('aneurysm: ST elevation over wide Q waves (≥ 40 ms) in V2–V3 with T/QRS < 0.36 in V1–V4', () => {
    const e = frame('i11', 1, 5);
    for (const l of ['V2', 'V3'] as const) {
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
      expect(qDurMs(e, l), l).toBeGreaterThanOrEqual(40);
    }
    for (const l of ['V1', 'V2', 'V3', 'V4'] as const) expect(tOverQrs(e, l), l).toBeLessThan(0.36);
  });
});
