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

type AnyLead = StdLead | 'V3R' | 'V4R' | 'V7' | 'V8' | 'V9';
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

describe('i1: measuring ST on the tracings', () => {
  it('hook / worked (man of 58): J point ≥ 2 mm in V2–V3, highest in V3, ≥ 1 mm in V4, mirror ≤ −0.5 mm in III and aVF', () => {
    for (const src of [blocksOf('i1', 'hook')[0].ecg, blocksOf('i1', 'worked')[0].ecg]) {
      const e = ecgOf(src);
      for (const l of ['V2', 'V3'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.2);
      expect(stAt(e, 'V4')).toBeGreaterThanOrEqual(0.1);
      expect(CHEST.reduce((m, l) => (stAt(e, l) > stAt(e, m) ? l : m))).toBe('V3');
      for (const l of ['III', 'aVF'] as const) expect(stAt(e, l), l).toBeLessThanOrEqual(-0.05);
      expect(stAt(e, 'V3')).toBeLessThan(0.4);
    }
  });
  it('contrast A (early repolarisation, man of 24): V3 below 2.5 mm, II/aVF J about 1.5 mm, V2–V6 elevated, no reciprocal depression ≥ 0.5 mm except aVR', () => {
    const e = ecgOf(blocksOf('i1', 'contrast')[0].left.ecg);
    expect(stAt(e, 'V3')).toBeLessThan(0.25);
    for (const l of ['II', 'aVF'] as const) {
      expect(stAt(e, l), l).toBeGreaterThan(0.12);
      expect(stAt(e, l), l).toBeLessThan(0.18);
    }
    for (const l of ['V2', 'V3', 'V4', 'V5', 'V6'] as const) expect(stAt(e, l), l).toBeGreaterThan(0.08);
    for (const l of ALL.filter((x) => x !== 'aVR')) expect(stAt(e, l), l).toBeGreaterThan(-0.05);
  });
  it('NSTE-ACS tracing (woman of 67): horizontal depression ≥ 0.5 mm in V4–V6, no lead elevated ≥ 1 mm', () => {
    const e = ecgOf(blocksOf('i1', 'ecg')[0].ecg);
    for (const l of ['V4', 'V5', 'V6'] as const) {
      expect(stAt(e, l), l).toBeLessThanOrEqual(-0.05);
      expect(Math.abs(stAt(e, l, 60) - stAt(e, l)), `${l} horizontal`).toBeLessThan(0.03);
    }
    for (const l of ALL) expect(stAt(e, l), l).toBeLessThan(0.1);
  });
});

describe('i2: territories on the tracings', () => {
  it('worked (anteroseptal, woman of 64): V1–V3 ≥ 1 mm, V2–V3 ≥ 1.5 mm, V4 under 1 mm, V5–V6/I/aVL not elevated', () => {
    const e = ecgOf(blocksOf('i2', 'worked')[0].ecg);
    for (const l of ['V1', 'V2', 'V3'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    for (const l of ['V2', 'V3'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.15);
    expect(stAt(e, 'V4')).toBeLessThan(0.1);
    for (const l of ['V5', 'V6', 'I', 'aVL'] as const) expect(stAt(e, l), l).toBeLessThan(0.05);
    expect(CHEST.reduce((m, l) => (stAt(e, l) > stAt(e, m) ? l : m))).toBe('V2');
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
  it('RV infarction: V4R ≥ 0.5 mm and V1 ≥ 1 mm with inferior elevation', () => {
    const e = ecgOf(blocksOf('i2', 'ecg')[0].ecg);
    expect(stAt(e, 'V4R')).toBeGreaterThanOrEqual(0.05);
    expect(stAt(e, 'V1')).toBeGreaterThanOrEqual(0.1);
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
  });
  it('posterolateral: V1–V2 depressed ≥ 0.5 mm ending in upright T waves (V1–V3), V5/V6 elevated ≥ 1 mm, I/aVL slightly up (< 1 mm); V8 ≥ 0.5 mm', () => {
    const e = ecgOf(blocksOf('i2', 'ecg')[1].ecg);
    for (const l of ['V1', 'V2'] as const) expect(stAt(e, l), l).toBeLessThanOrEqual(-0.05);
    for (const l of ['V1', 'V2', 'V3'] as const) expect(tw(e, l).max, `upright T ${l}`).toBeGreaterThan(0.1);
    for (const l of ['V5', 'V6'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    for (const l of ['I', 'aVL'] as const) {
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.05);
      expect(stAt(e, l), l).toBeLessThan(0.1);
    }
    expect(stAt(ecgOf(blocksOf('i2', 'ecg')[2].ecg), 'V8')).toBeGreaterThanOrEqual(0.05);
  });
});

describe('i3: anterior occlusion on the tracings', () => {
  it('hook (anterolateral): V3–V6 and I/aVL ≥ 1 mm, V1–V2 not ≥ 1 mm (not extensive anterior), III depressed more than II', () => {
    const e = ecgOf(blocksOf('i3', 'hook')[0].ecg);
    for (const l of ['V3', 'V4', 'V5', 'V6', 'I', 'aVL'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    for (const l of ['V1', 'V2'] as const) expect(stAt(e, l), l).toBeLessThan(0.1);
    expect(stAt(e, 'III')).toBeLessThan(-0.1);
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
  it('contrast B (high lateral, D1): I and aVL ≥ 1 mm (aVL about 2) with V2 up as much as V1, V3 less, V4 < 1 mm, the mirror in III about 3 mm, V5–V6 flat; A has I/aVL flat', () => {
    const e = ecgOf(blocksOf('i3', 'contrast')[0].right.ecg);
    for (const l of ['I', 'aVL', 'V2'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    expect(stAt(e, 'aVL')).toBeGreaterThan(0.18);
    expect(stAt(e, 'V2')).toBeGreaterThanOrEqual(stAt(e, 'V1') - 0.02);
    expect(stAt(e, 'V3')).toBeLessThan(stAt(e, 'V2'));
    expect(stAt(e, 'V4')).toBeLessThan(0.1);
    expect(stAt(e, 'III')).toBeLessThanOrEqual(-0.27);
    for (const l of ['V5', 'V6'] as const) expect(Math.abs(stAt(e, l)), l).toBeLessThan(0.06);
    const a = ecgOf(blocksOf('i3', 'contrast')[0].left.ecg);
    for (const l of ['I', 'aVL'] as const) expect(Math.abs(stAt(a, l)), l).toBeLessThan(0.05);
    for (const l of ['V2', 'V3'] as const) expect(stAt(a, l), l).toBeGreaterThan(0.1);
  });
  it('hyperacute T: broad tall T in V2–V4 (≥ 5 mm) with the J point under 1 mm, inverted T in III', () => {
    const e = ecgOf(blocksOf('i3', 'ecg')[0].ecg);
    for (const l of ['V2', 'V3', 'V4'] as const) {
      expect(tw(e, l).max, l).toBeGreaterThanOrEqual(0.5);
      expect(stAt(e, l), l).toBeLessThan(0.1);
    }
    expect(tInverted(e, 'III')).toBe(true);
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
  it('worked (RV): V1 ≥ 1 mm, V4R ≥ 0.5 mm, III the tallest inferior lead', () => {
    const e = ecgOf(blocksOf('i4', 'worked')[0].ecg);
    expect(stAt(e, 'V1')).toBeGreaterThanOrEqual(0.1);
    expect(stAt(e, 'V4R')).toBeGreaterThanOrEqual(0.05);
    expect(stAt(e, 'III')).toBeGreaterThan(Math.max(stAt(e, 'II'), stAt(e, 'aVF')));
  });
  it('posterior extension: V1–V4 depressed (deepest in V3), upright T in V3, III > II with I and aVL depressed and V5–V6 not elevated (dominant RCA)', () => {
    const e = ecgOf(blocksOf('i4', 'ecg')[0].ecg);
    for (const l of ['V1', 'V2', 'V3', 'V4'] as const) expect(stAt(e, l), l).toBeLessThanOrEqual(-0.05);
    for (const l of ['V1', 'V2', 'V4'] as const) expect(stAt(e, 'V3'), l).toBeLessThan(stAt(e, l));
    expect(tUpright(e, 'V3')).toBe(true);
    expect(stAt(e, 'III')).toBeGreaterThan(stAt(e, 'II'));
    for (const l of ['I', 'aVL'] as const) expect(stAt(e, l), l).toBeLessThan(-0.03);
    for (const l of ['V5', 'V6'] as const) expect(stAt(e, l), l).toBeLessThan(0.05);
  });
});

describe('i5: lateral STEMI on the tracings', () => {
  it('hook and contrast A (high lateral, D1): I and aVL ≥ 1 mm (aVL about 2), V1–V2 about 1.5 mm, V3 lower (about 1 mm), V4 < 1 mm, V5–V6 flat, III about −3 mm with II/aVF down', () => {
    for (const src of [blocksOf('i5', 'hook')[0].ecg, blocksOf('i5', 'contrast')[0].left.ecg]) {
      const e = ecgOf(src);
      for (const l of ['I', 'aVL', 'V2'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
      expect(stAt(e, 'aVL')).toBeGreaterThan(0.18);
      expect(stAt(e, 'aVL')).toBeLessThan(0.25);
      for (const l of ['V1', 'V2'] as const) {
        expect(stAt(e, l), l).toBeGreaterThan(0.12);
        expect(stAt(e, l), l).toBeLessThan(0.18);
      }
      expect(stAt(e, 'V3')).toBeLessThan(stAt(e, 'V2'));
      expect(stAt(e, 'V3')).toBeGreaterThan(0.07);
      expect(stAt(e, 'V4')).toBeLessThan(0.1);
      for (const l of ['V5', 'V6'] as const) expect(Math.abs(stAt(e, l)), l).toBeLessThan(0.06);
      expect(stAt(e, 'III')).toBeLessThanOrEqual(-0.27);
      expect(stAt(e, 'III')).toBeGreaterThan(-0.36);
      for (const l of ['II', 'aVF'] as const) expect(stAt(e, l), l).toBeLessThan(-0.15);
    }
  });
  it('worked and contrast B (lateral): V5–V6 about 1.5–2 mm, I/aVL about 1 mm, III about −1 mm with II spared, the mirror also in V1–V2', () => {
    for (const src of [blocksOf('i5', 'worked')[0].ecg, blocksOf('i5', 'contrast')[0].right.ecg]) {
      const e = ecgOf(src);
      for (const l of ['V5', 'V6'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.15);
      for (const l of ['I', 'aVL'] as const) {
        expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
        expect(stAt(e, l), l).toBeLessThan(stAt(e, 'V5'));
      }
      expect(stAt(e, 'III')).toBeLessThanOrEqual(-0.1);
      expect(stAt(e, 'III')).toBeGreaterThan(-0.15);
      expect(Math.abs(stAt(e, 'II'))).toBeLessThan(0.03);
      for (const l of ['V1', 'V2', 'aVR'] as const) expect(stAt(e, l), l).toBeLessThanOrEqual(-0.05);
      for (const l of ['V1', 'V2', 'V3'] as const) expect(stAt(e, l), l).toBeLessThan(0.01);
    }
  });
  it('the "flag" tracing: I/aVL up, III down and V2 up about 1.5 mm (as much as V1: all three stripes, D1); V3 about 1 mm, V4 < 1 mm, V5–V6 flat', () => {
    const e = ecgOf(blocksOf('i5', 'ecg')[0].ecg);
    for (const l of ['I', 'aVL'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    expect(stAt(e, 'III')).toBeLessThan(-0.1);
    expect(stAt(e, 'V2')).toBeGreaterThan(0.12);
    expect(stAt(e, 'V2')).toBeGreaterThanOrEqual(stAt(e, 'V1') - 0.02);
    expect(stAt(e, 'V3')).toBeLessThan(stAt(e, 'V2'));
    expect(stAt(e, 'V3')).toBeGreaterThan(0.07);
    expect(stAt(e, 'V4')).toBeLessThan(0.1);
    for (const l of ['V5', 'V6'] as const) expect(Math.abs(stAt(e, l)), l).toBeLessThan(0.06);
  });
  it('anterolateral: V3–V6 and I/aVL ≥ 1 mm, V1 not elevated', () => {
    const e = ecgOf(blocksOf('i5', 'ecg')[1].ecg);
    for (const l of ['V3', 'V4', 'V5', 'V6', 'I', 'aVL'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    expect(stAt(e, 'V1')).toBeLessThan(0.05);
  });
});

describe('i6: posterior infarction on the tracings', () => {
  it('hook / worked: V1–V2 depressed about 1.5 mm, about 1 mm in V3, gone by V4; V5–V6 elevated ≥ 1 mm, I/aVL slightly (< 1 mm); inferior leads not elevated; V8 ≥ 0.5 mm', () => {
    for (const src of [blocksOf('i6', 'hook')[0].ecg, blocksOf('i6', 'worked')[0].ecg]) {
      const e = ecgOf(src);
      for (const l of ['V1', 'V2'] as const) expect(stAt(e, l), l).toBeLessThanOrEqual(-0.12);
      expect(stAt(e, 'V3')).toBeLessThan(-0.07);
      expect(stAt(e, 'V3')).toBeGreaterThan(Math.min(stAt(e, 'V1'), stAt(e, 'V2')));
      expect(Math.abs(stAt(e, 'V4'))).toBeLessThan(0.03);
      for (const l of ['V5', 'V6'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
      for (const l of ['I', 'aVL'] as const) {
        expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.05);
        expect(stAt(e, l), l).toBeLessThan(0.1);
      }
      for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(e, l), l).toBeLessThan(0.1);
      expect(tw(e, 'V2').max, 'terminal T in V2 ends upright').toBeGreaterThan(0.05);
      // 2026-10-29 B11: the mirror T rises out of the depressed ST and ends upright in V1–V3 (T peak > 1 mm), in V2–V3
      // higher than the depth of the ST depression
      for (const l of ['V1', 'V2', 'V3'] as const) expect(tw(e, l).max, `upright T ${l}`).toBeGreaterThan(0.1);
      for (const l of ['V2', 'V3'] as const) expect(tw(e, l).max, `upright T ${l}`).toBeGreaterThan(-tw(e, l).min);
    }
    expect(stAt(ecgOf(blocksOf('i6', 'worked')[0].ecg), 'V8')).toBeGreaterThanOrEqual(0.05);
  });
  it('contrast B (subendocardial): depression in V4–V6 and I/aVL, V1–V2 not depressed, nothing elevated ≥ 1 mm', () => {
    const e = ecgOf(blocksOf('i6', 'contrast')[0].right.ecg);
    for (const l of ['V4', 'V5', 'V6', 'I', 'aVL'] as const) expect(stAt(e, l), l).toBeLessThanOrEqual(-0.05);
    for (const l of ['V1', 'V2'] as const) expect(stAt(e, l), l).toBeGreaterThan(0);
    for (const l of ALL) expect(stAt(e, l), l).toBeLessThan(0.1);
  });
  it('evolved: R outgrows S in V2, upright T in V1–V2', () => {
    const e = ecgOf(blocksOf('i6', 'ecg')[0].ecg);
    expect(qrs(e, 'V2').max).toBeGreaterThan(-qrs(e, 'V2').min);
    for (const l of ['V1', 'V2'] as const) expect(tUpright(e, l), l).toBe(true);
  });
  it('inferoposterior: II, III, aVF up with III > II, I and aVL depressed, V1–V3 depressed, V5–V6 not elevated (dominant RCA)', () => {
    const e = ecgOf(blocksOf('i6', 'ecg')[1].ecg);
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    expect(stAt(e, 'III')).toBeGreaterThan(stAt(e, 'II'));
    for (const l of ['I', 'aVL', 'V1', 'V2', 'V3'] as const) expect(stAt(e, l), l).toBeLessThan(-0.03);
    for (const l of ['V5', 'V6'] as const) expect(stAt(e, l), l).toBeLessThan(0.05);
  });
});

describe('i7: subtle occlusion on the tracings', () => {
  it('hook / serial 1 (man of 52): V2–V3 under the 2-mm limit, V3 about 1 mm, bulky T in V3, faint mirror in III', () => {
    for (const src of [blocksOf('i7', 'hook')[0].ecg, blocksOf('i7', 'ecg')[1].ecg]) {
      const e = ecgOf(src);
      for (const l of ['V2', 'V3'] as const) expect(stAt(e, l), l).toBeLessThan(0.2);
      expect(stAt(e, 'V3')).toBeGreaterThan(0.08);
      expect(tw(e, 'V3').max).toBeGreaterThan(0.5 * qrs(e, 'V3').p2p);
      expect(stAt(e, 'III')).toBeLessThan(-0.02);
    }
  });
  it('hyperacute T: in V3 the T is taller than the R; the J point in V2 under 1 mm', () => {
    for (const src of [blocksOf('i7', 'ecg')[0].ecg, blocksOf('i7', 'worked')[0].ecg]) {
      const e = ecgOf(src);
      expect(tw(e, 'V3').max).toBeGreaterThan(qrs(e, 'V3').max);
      expect(stAt(e, 'V2')).toBeLessThan(0.1);
    }
  });
  it('contrast B (early repolarisation): V2–V3 about 1.5 mm at J+60 (slightly above A, under 2.5 mm), inferior J notches, no depression outside aVR', () => {
    const e = ecgOf(blocksOf('i7', 'contrast')[0].right.ecg);
    const a = ecgOf(blocksOf('i7', 'contrast')[0].left.ecg);
    for (const l of ['V2', 'V3'] as const) {
      expect(stAt(e, l), l).toBeLessThan(0.25);
      expect(stAt(e, l, 60), l).toBeGreaterThan(0.13);
      expect(stAt(e, l, 60), l).toBeGreaterThan(stAt(a, l, 60));
    }
    for (const l of ['V1', 'V4', 'V5', 'V6'] as const) expect(stAt(e, l), l).toBeGreaterThan(0.05);
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(e, l), l).toBeGreaterThan(0.07);
    for (const l of ALL.filter((x) => x !== 'aVR')) expect(stAt(e, l), l).toBeGreaterThan(-0.05);
    // proportion (point text): T/QRS in V2 about 1 in A against about half in B; in V3 about 1.05 against 0.9
    const tq = (x: typeof e, l: AnyLead) => tw(x, l).max / Math.max(qrs(x, l).max, -qrs(x, l).min);
    expect(tq(a, 'V2')).toBeGreaterThan(0.9);
    expect(tq(e, 'V2')).toBeLessThan(0.6);
    expect(tq(e, 'V3')).toBeLessThan(tq(a, 'V3'));
    expect(tq(e, 'V3')).toBeGreaterThan(0.75);
  });
  it('serial 2: V2–V3 ≥ 2 mm and the inferior mirror deepened', () => {
    const e = ecgOf(blocksOf('i7', 'ecg')[2].ecg);
    for (const l of ['V2', 'V3'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.2);
    expect(stAt(e, 'III')).toBeLessThan(stAt(ecgOf(blocksOf('i7', 'ecg')[1].ecg), 'III'));
  });
});

describe('i8: Wellens, de Winter, aVR on the tracings', () => {
  it('Wellens A (hook): biphasic T in V2 (up then down), ST isoelectric, R preserved', () => {
    const e = ecgOf(blocksOf('i8', 'hook')[0].ecg);
    const b = midBeat(e);
    expect(tw(e, 'V2').max).toBeGreaterThan(0.02);
    expect(tw(e, 'V2').min).toBeLessThan(-0.08);
    const upFirst = span(e, 'V2', b.j + 40, (b.j + b.tOff) / 2, b).max > span(e, 'V2', (b.j + b.tOff) / 2, b.tOff, b).max;
    expect(upFirst).toBe(true);
    for (const l of ['V2', 'V3'] as const) expect(Math.abs(stAt(e, l)), l).toBeLessThan(0.05);
    expect(qrs(e, 'V3').max).toBeGreaterThan(0.5);
  });
  it('deeper Wellens variant: T inversion about 4 mm deep in V2–V3, reaching V1 and V4', () => {
    const e = ecgOf(blocksOf('i8', 'ecg')[0].ecg);
    for (const l of ['V2', 'V3'] as const) expect(tw(e, l).min, l).toBeLessThan(-0.3);
    for (const l of ['V1', 'V4'] as const) expect(tw(e, l).min, l).toBeLessThan(-0.1);
  });
  it('de Winter: J depressed > 1 mm in V2–V4 and upsloping, tall T in V3, slight elevation in aVR', () => {
    const e = ecgOf(blocksOf('i8', 'ecg')[1].ecg);
    for (const l of ['V2', 'V3', 'V4'] as const) {
      expect(stAt(e, l), l).toBeLessThan(-0.1);
      expect(stAt(e, l, 60), l).toBeGreaterThan(stAt(e, l));
    }
    expect(tw(e, 'V3').max).toBeGreaterThan(0.5);
    expect(stAt(e, 'aVR')).toBeGreaterThan(0.05);
    for (const l of CHEST) expect(stAt(e, l), l).toBeLessThan(0.05);
  });
  it('aVR + diffuse depression: ≥ 6 leads depressed ≥ 1 mm at J (II, III, aVF, V2–V5), aVR about 1 mm up, V1 depressed', () => {
    const e = ecgOf(blocksOf('i8', 'worked')[0].ecg);
    const depressed = ALL.filter((l) => stAt(e, l) <= -0.1);
    expect(depressed.length).toBeGreaterThanOrEqual(6);
    for (const l of ['II', 'III', 'aVF', 'V2', 'V3', 'V4', 'V5'] as const) expect(depressed, l).toContain(l);
    expect(stAt(e, 'aVR')).toBeGreaterThan(0.07);
    expect(stAt(e, 'V1')).toBeLessThan(0);
  });
  it('heavier tracing: aVR about 1.2 mm and V1 about 1 mm up, depression to 2.5 mm', () => {
    const e = ecgOf(blocksOf('i8', 'ecg')[2].ecg);
    expect(stAt(e, 'aVR')).toBeGreaterThan(0.1);
    expect(stAt(e, 'V1')).toBeGreaterThan(0.05);
    expect(Math.min(...ALL.map((l) => stAt(e, l, 60)))).toBeLessThan(-0.2);
  });
  it('contrast: A Wellens in V2–V3; B lateral T inversion (I, aVL, V6) with tall R', () => {
    const c = blocksOf('i8', 'contrast')[0];
    expect(tw(ecgOf(c.left.ecg), 'V2').min).toBeLessThan(-0.08);
    const b = ecgOf(c.right.ecg);
    for (const l of ['I', 'aVL', 'V6'] as const) expect(tw(b, l).min, l).toBeLessThan(-0.1);
    expect(tInverted(b, 'V6')).toBe(true);
  });
});

describe('i9: evolution, Q waves and aneurysm on the tracings', () => {
  it('timeline: hyperacute (V2 ST < 1 mm, tall T) → acute (V2 ≥ 2 mm) → evolving (Q in V2, T turning negative, ST still up) → old (QS V1–V3, ST back)', () => {
    const [p1, p2, p3] = blocksOf('i9', 'ecg').slice(0, 3).map((b) => ecgOf(b.ecg));
    expect(stAt(p1, 'V2')).toBeLessThan(0.1);
    expect(tw(p1, 'V2').max).toBeGreaterThan(0.4);
    expect(stAt(p2, 'V2')).toBeGreaterThanOrEqual(0.2);
    expect(qDurMs(p3, 'V2')).toBeGreaterThanOrEqual(20);
    expect(tw(p3, 'V2').min).toBeLessThan(-0.1);
    expect(stAt(p3, 'V2')).toBeGreaterThan(0.05);
    const old = ecgOf(blocksOf('i9', 'hook')[0].ecg);
    for (const l of ['V2', 'V3'] as const) {
      expect(qrs(old, l).max, l).toBeLessThan(0.05);
      expect(Math.abs(stAt(old, l)), l).toBeLessThan(0.05);
    }
  });
  it('worked (old inferior): Q ≥ 30 ms and ≥ 1 mm in II, QS in III and aVF, ST isoelectric, axis about −40°', () => {
    const e = ecgOf(blocksOf('i9', 'worked')[0].ecg);
    expect(qDurMs(e, 'II')).toBeGreaterThanOrEqual(30);
    expect(qrs(e, 'II').min).toBeLessThan(-0.1);
    for (const l of ['III', 'aVF'] as const) expect(qrs(e, l).max, l).toBeLessThan(0.05);
    for (const l of ['II', 'III', 'aVF'] as const) expect(Math.abs(stAt(e, l)), l).toBeLessThan(0.05);
    expect(e.truth!.axisDeg.qrs).toBeGreaterThan(-55);
    expect(e.truth!.axisDeg.qrs).toBeLessThan(-30);
  });
  it('fragmented QRS: QS in V1–V3 and an extra r′ after the S in V4', () => {
    const e = ecgOf(blocksOf('i9', 'ecg')[3].ecg);
    for (const l of ['V2', 'V3'] as const) expect(qrs(e, l).max, l).toBeLessThan(0.05);
    expect(shape(e, 'V4')).toMatch(/r′/);
  });
  it('contrast: aneurysm T/QRS < 0.36 in every lead V1–V4 with ST elevation over QS; acute STEMI T/QRS > 0.36 in V2', () => {
    const c = blocksOf('i9', 'contrast')[0];
    const a = ecgOf(c.left.ecg);
    for (const l of ['V1', 'V2', 'V3', 'V4'] as const) expect(tOverQrs(a, l), l).toBeLessThan(0.36);
    for (const l of ['V2', 'V3'] as const) expect(stAt(a, l), l).toBeGreaterThanOrEqual(0.1);
    const b = ecgOf(c.right.ecg);
    expect(tOverQrs(b, 'V2')).toBeGreaterThan(0.36);
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
  it('contrast A (uncomplicated LBBB): ST/S about −0.1 in V1–V3, lateral ST discordant', () => {
    const e = ecgOf(blocksOf('i10', 'contrast')[0].left.ecg);
    for (const l of ['V1', 'V2', 'V3'] as const) {
      expect(stOverS(e, l), l).toBeGreaterThan(-0.15);
      expect(stOverS(e, l), l).toBeLessThan(0);
    }
    for (const l of ['V5', 'V6'] as const) expect(stAt(e, l), l).toBeLessThan(0);
  });
  it('criterion 1: concordant elevation ≥ 1 mm in V5–V6 over positive QRS', () => {
    const e = ecgOf(blocksOf('i10', 'ecg')[0].ecg);
    for (const l of ['V5', 'V6'] as const) {
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
      expect(qrs(e, l).net, l).toBeGreaterThan(0);
    }
  });
  it('criterion 2: concordant depression ≥ 1 mm in V2–V3 (V1 about 0.5 mm) over negative QRS; no concordant elevation anywhere', () => {
    const e = ecgOf(blocksOf('i10', 'ecg')[1].ecg);
    for (const l of ['V1', 'V2', 'V3'] as const) expect(qrs(e, l).net, l).toBeLessThan(0);
    for (const l of ['V2', 'V3'] as const) expect(stAt(e, l), l).toBeLessThanOrEqual(-0.1);
    expect(stAt(e, 'V1')).toBeLessThan(-0.03);
    expect(stAt(e, 'V1')).toBeGreaterThan(-0.1);
    for (const l of ALL) if (qrs(e, l).net > 0) expect(stAt(e, l), `${l}: concordant elevation`).toBeLessThan(0.1);
  });
  it('RBBB: rsR′ in V1, T inverted in V1–V2, upright in V3–V6', () => {
    const e = ecgOf(blocksOf('i10', 'ecg')[3].ecg);
    expect(shape(e, 'V1')).toMatch(/R′/);
    for (const l of ['V1', 'V2'] as const) expect(tInverted(e, l), l).toBe(true);
    for (const l of ['V3', 'V4', 'V5', 'V6'] as const) expect(tUpright(e, l), l).toBe(true);
  });
  it('LVH: discordant V1–V2 elevation well under 25 % of the S, lateral depression with inverted T', () => {
    const e = ecgOf(blocksOf('i10', 'ecg')[4].ecg);
    for (const l of ['V1', 'V2'] as const) expect(stOverS(e, l), l).toBeGreaterThan(-0.25);
    for (const l of ['V5', 'V6'] as const) {
      expect(stAt(e, l, 60), l).toBeLessThan(-0.05);
      expect(tInverted(e, l), l).toBe(true);
    }
  });
});

describe('i11: mimics on the tracings', () => {
  it('early repolarisation: J about 1–1.5 mm in II, III, aVF, elevation across V1–V6, depression only in aVR', () => {
    const e = ecgOf(blocksOf('i11', 'ecg')[1].ecg);
    for (const l of ['II', 'III', 'aVF'] as const) {
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.09);
      expect(stAt(e, l), l).toBeLessThan(0.18);
    }
    for (const l of CHEST) expect(stAt(e, l), l).toBeGreaterThan(0.03);
    expect(stAt(e, 'aVR')).toBeLessThan(-0.05);
    for (const l of ALL.filter((x) => x !== 'aVR')) expect(stAt(e, l), l).toBeGreaterThan(-0.05);
  });
  it('pericarditis (hook, contrast A): widespread elevation incl. II and V2–V6, aVR depressed, no other lead depressed', () => {
    for (const src of [blocksOf('i11', 'hook')[0].ecg, blocksOf('i11', 'contrast')[0].left.ecg]) {
      const e = ecgOf(src);
      for (const l of ['II', 'aVF', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
      expect(stAt(e, 'aVR')).toBeLessThan(-0.05);
      for (const l of ALL.filter((x) => x !== 'aVR')) expect(stAt(e, l), l).toBeGreaterThan(-0.02);
    }
  });
  it('contrast B (anterior STEMI): V1–V4 elevated, reciprocal depression in II, III, aVF', () => {
    const e = ecgOf(blocksOf('i11', 'contrast')[0].right.ecg);
    for (const l of ['V1', 'V2', 'V3', 'V4'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    for (const l of ['II', 'III', 'aVF'] as const) expect(stAt(e, l), l).toBeLessThan(-0.05);
  });
  it('takotsubo: V3–V6 elevated, V1 not, aVR depressed, inferior leads nearly isoelectric; late: QTc (Fridericia) about 505 ms with T inverted in V4–V6', () => {
    const e = ecgOf(blocksOf('i11', 'worked')[0].ecg);
    for (const l of ['V3', 'V4', 'V5', 'V6'] as const) expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
    expect(stAt(e, 'V1')).toBeLessThan(0.05);
    expect(stAt(e, 'aVR')).toBeLessThan(-0.03);
    for (const l of ['III', 'aVF'] as const) expect(Math.abs(stAt(e, l)), l).toBeLessThan(0.05);
    const late = ecgOf(blocksOf('i11', 'ecg')[0].ecg);
    expect(Math.abs(late.truth!.qtcFridericiaMs - 505)).toBeLessThan(20);
    for (const l of ['V4', 'V5', 'V6'] as const) expect(tw(late, l).min, l).toBeLessThan(-0.05);
  });
  it('Brugada type 1: coved elevation ≥ 2 mm in V1–V2 into a negative T, V3 normal', () => {
    const e = ecgOf(blocksOf('i11', 'ecg')[2].ecg);
    for (const l of ['V1', 'V2'] as const) {
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.2);
      expect(stAt(e, l, 60), l).toBeLessThan(stAt(e, l));
      expect(tw(e, l).min, l).toBeLessThan(-0.1);
    }
    expect(Math.abs(stAt(e, 'V3'))).toBeLessThan(0.05);
  });
  it('hyperkalaemia: tall T in V3–V5 (taller than the R in V4), PR ≥ 200 ms, QRS 110–120 ms; severe: no P wave, QRS > 150 ms', () => {
    const e = ecgOf(blocksOf('i11', 'ecg')[3].ecg);
    expect(tw(e, 'V4').max).toBeGreaterThan(qrs(e, 'V4').max);
    expect(e.truth!.prMs!).toBeGreaterThanOrEqual(200);
    expect(e.truth!.qrsMs).toBeGreaterThanOrEqual(110);
    expect(e.truth!.qrsMs).toBeLessThan(120);
    const s = ecgOf(blocksOf('i11', 'ecg')[4].ecg);
    expect(s.truth!.prMs).toBeNull();
    expect(s.truth!.qrsMs).toBeGreaterThan(150);
  });
  it('aneurysm: ST elevation over QS in V2–V3 with T/QRS < 0.36 in V1–V4', () => {
    const e = ecgOf(blocksOf('i11', 'ecg')[5].ecg);
    for (const l of ['V2', 'V3'] as const) {
      expect(stAt(e, l), l).toBeGreaterThanOrEqual(0.1);
      expect(qDurMs(e, l), l).toBeGreaterThanOrEqual(40);
    }
    for (const l of ['V1', 'V2', 'V3', 'V4'] as const) expect(tOverQrs(e, l), l).toBeLessThan(0.36);
  });
});
