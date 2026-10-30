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
import { formatIssues, validateLesson } from '../../src/course/validate';
import type { Ecg } from '../../src/core/ecg';
import type { L10n } from '../../src/core/l10n';
import type { StdLead } from '../../src/core/leads';
import type { EcgSource } from '../../src/practice/api';
import { generateItem } from '../../src/practice';
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

describe('t1 on the tracings', () => {
  it('worked AVRT: ~190/min, retrograde P′ ~115 ms after QRS onset, negative in I and aVL, positive in III and aVF', () => {
    const e = ecgOf(blocksOf('t1', 'worked')[0].ecg);
    expect(Math.abs(e.truth!.hrBpm - 190)).toBeLessThan(5);
    const b = mid(e);
    expect(b.pOn).not.toBeNull();
    expect(Math.abs(b.pOn! - b.qrsOn - 115)).toBeLessThan(10);
    const w = (l: StdLead) => excursion(e, l, b.pOn!, b.pOn! + 10, b.pOn! + 45);
    expect(w('I')).toBeLessThan(-0.02);
    expect(w('aVL')).toBeLessThan(-0.04);
    expect(w('III')).toBeGreaterThan(0.05);
    expect(w('aVF')).toBeGreaterThan(0.05);
  });
  it('hook AVNRT: pseudo-S in II right after the QRS', () => {
    const e = ecgOf(blocksOf('t1', 'hook')[0].ecg);
    const b = mid(e);
    expect(excursion(e, 'II', b.qrsOn, b.qrsOff, b.qrsOff + 40)).toBeLessThan(-0.1);
  });
  it('AVNRT in V1: the S upstroke ends in a small terminal positive wave (pseudo-r′, about half a millimetre, under 1 mm)', () => {
    const e = ecgOf(blocksOf('t1', 'ecg').find((x) => x.view?.layout === 'strip' && x.view.lead === 'V1')!.ecg);
    const b = mid(e);
    expect(excursion(e, 'V1', b.qrsOn, b.qrsOn + 30, b.qrsOn + 70)).toBeLessThan(-0.4);
    const r = excursion(e, 'V1', b.qrsOn, b.qrsOff - 5, b.qrsOff + 20);
    expect(r).toBeGreaterThan(0.035);
    expect(r).toBeLessThan(0.1);
  });
});

describe('t2 on the tracings', () => {
  it('worked flutter with variable block: F–F 200 ms, every RR near 3, 4 or 5 F–F (no 2:1)', () => {
    const e = ecgOf(blocksOf('t2', 'worked')[0].ecg);
    expect(e.truth!.atrialRateBpm).toBe(300);
    const ratios = rrs(e).map((rr) => Math.round(rr / 200));
    for (const r of ratios) expect([3, 4, 5]).toContain(r);
    expect(new Set(ratios).size).toBeGreaterThanOrEqual(2);
  });
});

describe('t3 on the tracings', () => {
  it('hook and worked: 2:1 flutter, ventricles 150/min, atria 300/min', () => {
    for (const src of [blocksOf('t3', 'hook')[0].ecg, blocksOf('t3', 'worked')[0].ecg]) {
      const t = ecgOf(src).truth!;
      expect(Math.abs(t.hrBpm - 150)).toBeLessThan(3);
      expect(t.atrialRateBpm).toBe(300);
    }
  });
});

describe('t4 on the tracings', () => {
  it('worked WPW: PR < 120 ms, QRS > 120 ms, V1 R ≥ S, delta negative in I and aVL', () => {
    const e = ecgOf(blocksOf('t4', 'worked')[0].ecg);
    const t = e.truth!;
    expect(t.prMs!).toBeLessThan(120);
    expect(t.qrsMs).toBeGreaterThan(120);
    const b = mid(e);
    for (const l of ['I', 'aVL'] as const) expect(excursion(e, l, b.qrsOn, b.qrsOn, b.qrsOn + 40), l).toBeLessThan(-0.1);
    expect(excursion(e, 'V1', b.qrsOn, b.qrsOn, b.qrsOn + 60)).toBeGreaterThan(0.3);
  });
});

describe('t5 on the tracings', () => {
  it('worked VT: ~125/min, QRS ≥ 150 ms, superior (northwest) axis, AV dissociation with visible sinus P at ~75/min', () => {
    const e = ecgOf(blocksOf('t5', 'worked')[0].ecg);
    const t = e.truth!;
    expect(Math.abs(t.hrBpm - 125)).toBeLessThan(4);
    expect(Math.abs(t.atrialRateBpm! - 75)).toBeLessThan(4);
    expect(t.qrsMs).toBeGreaterThanOrEqual(150);
    expect(t.axisDeg.qrs).toBeLessThan(-90);
    expect(t.findings).toContain('av-dissociation');
    expect(t.atrial.filter((a) => a.conductedTo === null && a.visible).length).toBeGreaterThanOrEqual(3);
  });
  it('the capture/fusion strip has captures at beats 7 and 22 and a fusion beat at 9', () => {
    const blk = blocksOf('t5', 'ecg').find((b) => b.ecg.kind === 'synth' && b.ecg.req.variant === 'captures')!;
    const beats = ecgOf(blk.ecg).truth!.beats;
    expect(beats[7].kind).toBe('capture');
    expect(beats[9].kind).toBe('fusion');
    expect(beats[22].kind).toBe('capture');
  });
});

describe('t6 on the tracings', () => {
  it('hook torsades: sinus beats first, QT of the first sinus beat about 560–600 ms; contrast left has a normal QT context', () => {
    const e = ecgOf(blocksOf('t6', 'hook')[0].ecg);
    const first = e.truth!.beats[0];
    expect(first.kind).toBe('sinus');
    expect(first.tOff - first.qrsOn).toBeGreaterThan(540);
    expect(first.tOff - first.qrsOn).toBeLessThan(620);
    expect(e.truth!.findings).toContain('long-qt');
    const left = ecgOf(blocksOf('t6', 'contrast')[0].left.ecg).truth!;
    expect(left.rhythm).toBe('vt-polymorphic');
    expect(left.findings).not.toContain('long-qt');
  });
  it('the artefact strip is sinus rhythm with regular QRS through the burst', () => {
    const blk = blocksOf('t6', 'ecg').find((b) => b.ecg.kind === 'synth' && b.ecg.req.scenario === 'motion-artefact')!;
    const e = ecgOf(blk.ecg);
    expect(e.truth!.rhythm).toBe('sinus-rhythm');
    for (const rr of rrs(e)) expect(Math.abs(rr - 830)).toBeLessThan(60);
  });
});

describe('t7 on the tracings', () => {
  it('hook is asystole, the escape strip is about 34/min with a wide QRS', () => {
    expect(ecgOf(blocksOf('t7', 'hook')[0].ecg).truth!.rhythm).toBe('asystole');
    const esc = blocksOf('t7', 'ecg').find((b) => b.ecg.kind === 'synth' && b.ecg.req.scenario === 'av-block-3')!;
    const t = ecgOf(esc.ecg).truth!;
    expect(Math.abs(t.hrBpm - 34)).toBeLessThan(3);
    expect(t.qrsMs).toBeGreaterThanOrEqual(120);
  });
  it('drills 10-second recognition: a speed-round text precedes the drill', () => {
    const kinds = lessonById('t7').blocks.map((b) => b.kind);
    const d = kinds.indexOf('drill');
    const prev = lessonById('t7').blocks[d - 1];
    expect(prev.kind).toBe('text');
    if (prev.kind === 'text') expect(prev.body.en).toMatch(/10 seconds per strip/);
  });
});
