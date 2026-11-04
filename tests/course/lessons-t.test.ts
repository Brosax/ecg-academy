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
import { baselineBefore } from '../../src/course/marks';
import { formatIssues, validateLesson } from '../../src/course/validate';
import type { Ecg } from '../../src/core/ecg';
import type { L10n } from '../../src/core/l10n';
import type { StdLead } from '../../src/core/leads';
import type { RegionId } from '../../src/core/regions';
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
/** what a playing live block shows with its played dial at `v` (its other dials at their start values) */
function played(id: string, i: number, v: number): Ecg {
  const b = blocksOf(id, 'live')[i];
  if (!b.play) throw new Error(`${id}: live block ${i} does not play`);
  const sc = scenarios().find((s) => s.id === b.scenario);
  if (!sc) throw new Error(`unknown scenario ${b.scenario}`);
  const dials = { ...startDials(sc, b.variant, b.dials.map((d) => d.id), b.play), [b.play.dial]: v };
  return ecgOf({ scenario: b.scenario, ...(b.variant ? { variant: b.variant } : {}), seed: b.seed, dials });
}
const frames = (id: string, k: number): Ecg[] => blocksOf(id, 'film')[k].frames.map((f) => ecgOf(f.ecg));
/** largest deviation of a lead over [t0, t1] from the straight line joining its ends (a wave riding on a slope) */
function detrended(e: Ecg, lead: StdLead, t0: number, t1: number): number {
  const a = at(e, lead, t0);
  const z = at(e, lead, t1);
  let best = 0;
  for (let t = t0; t <= t1; t += 2) {
    const d = at(e, lead, t) - (a + ((z - a) * (t - t0)) / (t1 - t0));
    if (Math.abs(d) > Math.abs(best)) best = d;
  }
  return best;
}
/** P onset of each beat minus the T end of the beat before (negative: the P starts on the previous T) */
const pAfterT = (e: Ecg): number[] => e.truth!.beats.slice(1).map((b, i) => b.pOn! - e.truth!.beats[i].tOff);
const hiddenShare = (e: Ecg): number => e.truth!.atrial.filter((a) => !a.visible).length / e.truth!.atrial.length;
/** median peak-to-peak of the baseline between T end + 40 ms and the next QRS − 40 ms (f or F waves), mV */
function diastolicP2p(e: Ecg, lead: StdLead): number {
  const b = e.truth!.beats;
  const out: number[] = [];
  for (let i = 0; i + 1 < b.length; i++) {
    const t0 = b[i].tOff + 40;
    const t1 = b[i + 1].qrsOn - 40;
    if (t1 - t0 < 150) continue;
    let mx = -Infinity;
    let mn = Infinity;
    for (let t = t0; t <= t1; t += 2) {
      mx = Math.max(mx, at(e, lead, t));
      mn = Math.min(mn, at(e, lead, t));
    }
    out.push(mx - mn);
  }
  return out.sort((x, y) => x - y)[Math.floor(out.length / 2)];
}
const median = (xs: readonly number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

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
  it('P′ film: sinus P upright in II with PR about 150 ms and RP > PR; AVNRT P′ starts inside the QRS with a pseudo-S in II; AVRT P′ after the QRS in II, RP about 115 ms and < P′R; AT P′ about 180/min, QRS about 90/min, each blocked P′ on the ST–T of the beat before', () => {
    const [sinus, avnrt, avrt, at21] = frames('t1', 0);
    const s = sinus.truth!;
    const sb = mid(sinus);
    expect(Math.abs(s.prMs! - 150)).toBeLessThan(5);
    expect(detrended(sinus, 'II', sb.pOn!, sb.pOff!)).toBeGreaterThan(0.05);
    for (const rr of rrs(sinus)) expect(rr - s.prMs!).toBeGreaterThan(s.prMs!);
    const nb = mid(avnrt);
    expect(nb.pOn! - nb.qrsOn).toBeGreaterThan(0);
    expect(nb.pOn! - nb.qrsOn).toBeLessThan(avnrt.truth!.qrsMs);
    expect(excursion(avnrt, 'II', nb.qrsOn, nb.qrsOff, nb.qrsOff + 40)).toBeLessThan(-0.1);
    const vb = mid(avrt);
    const rp = vb.pOn! - vb.qrsOn;
    expect(Math.abs(rp - 115)).toBeLessThan(5);
    expect(vb.pOn!).toBeGreaterThan(vb.qrsOff);
    expect(detrended(avrt, 'II', vb.pOn!, vb.pOff!)).toBeGreaterThan(0.05);
    for (const rr of rrs(avrt)) expect(rr - rp).toBeGreaterThan(rp);
    const a = at21.truth!;
    expect(Math.abs(a.atrialRateBpm! - 180)).toBeLessThan(3);
    expect(Math.abs(a.hrBpm - 90)).toBeLessThan(2);
    const blocked = a.atrial.filter((x) => x.conductedTo === null && x.t > a.beats[0].qrsOn && x.t < a.beats[a.beats.length - 1].qrsOn);
    expect(blocked.length).toBeGreaterThanOrEqual(10);
    for (const x of blocked) {
      const prev = [...a.beats].reverse().find((b) => b.qrsOn < x.t)!;
      expect(x.t).toBeGreaterThan(prev.qrsOff);
      expect(x.t).toBeLessThan(prev.tOff);
    }
  });
  it('sinus sweep notes: P clear of the previous T, PR about 150 ms and RP > PR at 102–124; P within 25 ms of the T end at 125–133; P starting before the T end on every beat, one P per QRS, at 134–150', () => {
    for (const v of [102, 124]) {
      const e = played('t1', 0, v);
      expect(Math.min(...pAfterT(e)), `${v}`).toBeGreaterThan(0);
      expect(Math.abs(e.truth!.prMs! - 150), `${v}`).toBeLessThan(5);
      for (const rr of rrs(e)) expect(rr - e.truth!.prMs!, `${v}`).toBeGreaterThan(e.truth!.prMs!);
    }
    for (const v of [125, 133]) for (const g of pAfterT(played('t1', 0, v))) expect(Math.abs(g), `${v}`).toBeLessThan(25);
    for (const v of [134, 150]) {
      const e = played('t1', 0, v);
      expect(Math.max(...pAfterT(e)), `${v}`).toBeLessThan(0);
      expect(Math.abs(e.truth!.atrialRateBpm! - e.truth!.hrBpm), `${v}`).toBeLessThan(1);
    }
  });
  it('AVRT heart: ventricles activated first, atria about 115 ms after QRS onset, the pathway highlighted', () => {
    const e = ecgOf(blocksOf('t1', 'heart')[0].ecg);
    const rs = e.regions!;
    const b = mid(e);
    const buf = new Float32Array(rs.ids.length);
    const state = (id: RegionId, t: number): number => {
      rs.stateAt(t, buf);
      return buf[rs.ids.indexOf(id)];
    };
    const atriaStart = (t: number): boolean => (['ra', 'la'] as const).some((id) => state(id, t) > 0 && state(id, t) < 1);
    expect(state('lv-mid-anteroseptal', b.qrsOn + 60)).toBeGreaterThanOrEqual(1);
    expect(atriaStart(b.qrsOn + 60)).toBe(false);
    let t = b.qrsOn + 60;
    while (!atriaStart(t) && t < b.qrsOn + 300) t += 2;
    expect(Math.abs(t - b.qrsOn - 115)).toBeLessThan(5);
    expect(rs.highlights['lv-basal-anterolateral']).toBe('pathway');
  });
  it('flutter sweep notes: 2:1 at 150/min with about half the F waves hidden; 3:1 at 100/min; 4:1 at 75/min with most F waves showing; atria at 300/min throughout', () => {
    for (const [v, hr] of [[2, 150], [3, 100], [4, 75]] as const) {
      const e = played('t1', 1, v);
      expect(Math.abs(e.truth!.hrBpm - hr), `${v}:1`).toBeLessThan(1);
      expect(e.truth!.atrialRateBpm, `${v}:1`).toBe(300);
      expect(Math.max(...rrs(e)) - Math.min(...rrs(e)), `${v}:1 regular`).toBeLessThan(10);
    }
    expect(Math.abs(hiddenShare(played('t1', 1, 2)) - 0.5)).toBeLessThan(0.1);
    expect(hiddenShare(played('t1', 1, 4))).toBeLessThan(0.35);
  });
  it('long-RP contrast: RP > PR in both; atypical AVNRT P′ negative in II, III and aVF; sinus P upright in II', () => {
    const c = blocksOf('t1', 'contrast')[0];
    const [atyp, sinus] = [ecgOf(c.left.ecg), ecgOf(c.right.ecg)];
    for (const e of [atyp, sinus]) {
      const b = mid(e);
      const pr = b.qrsOn - b.pOn!;
      for (const rr of rrs(e)) expect(rr - pr).toBeGreaterThan(pr);
    }
    const ab = mid(atyp);
    for (const l of ['II', 'III', 'aVF'] as const) expect(detrended(atyp, l, ab.pOn!, ab.pOff!), l).toBeLessThan(-0.1);
    const sb = mid(sinus);
    expect(detrended(sinus, 'II', sb.pOn!, sb.pOff!)).toBeGreaterThan(0.05);
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
  it('laddergram: the worked flutter tracing, an F every 200 ms, every 3rd, 4th or 5th F conducted', () => {
    const fig = blocksOf('t2', 'figure').find((b) => b.figure.id === 'laddergram')!;
    expect(fig.ecg).toEqual(blocksOf('t2', 'worked')[0].ecg);
    const atr = ecgOf(fig.ecg!).truth!.atrial;
    for (let i = 1; i < atr.length; i++) expect(Math.abs(atr[i].t - atr[i - 1].t - 200)).toBeLessThan(3);
    const conducted = atr.flatMap((a, i) => (a.conductedTo !== null ? [i] : []));
    for (let k = 1; k < conducted.length; k++) expect([3, 4, 5]).toContain(conducted[k] - conducted[k - 1]);
  });
  it('irregular film: AF RR with no pattern; flutter = the worked tracing; two PACs with P′ negative in II and a less-than-compensatory pause; sinus arrhythmia with one P and one PR; bigeminy pairs a sinus beat with an early wide QRS that has no P', () => {
    const film = blocksOf('t2', 'film')[0];
    const [af, , pac, sa, big] = frames('t2', 0);
    expect(af.truth!.rhythm).toBe('atrial-fibrillation');
    expect(Math.max(...rrs(af)) - Math.min(...rrs(af))).toBeGreaterThan(300);
    expect(film.frames[1].ecg).toEqual(blocksOf('t2', 'worked')[0].ecg);
    const pb = pac.truth!.beats;
    const early = pb.flatMap((b, i) => (b.kind === 'atrial' ? [i] : []));
    expect(early.length).toBe(2);
    const sinusRr = median(pb.slice(1).flatMap((b, i) => (b.kind === 'sinus' && pb[i].kind === 'sinus' ? [b.qrsOn - pb[i].qrsOn] : [])));
    const s = pb.find((b) => b.kind === 'sinus')!;
    expect(detrended(pac, 'II', s.pOn!, s.pOff!)).toBeGreaterThan(0.05);
    for (const i of early) {
      expect(detrended(pac, 'II', pb[i].pOn!, pb[i].pOff!), `PAC ${i}`).toBeLessThan(-0.05);
      expect(pb[i].qrsOn - pb[i - 1].qrsOn, `PAC ${i} early`).toBeLessThan(0.8 * sinusRr);
      expect(pb[i + 1].qrsOn - pb[i - 1].qrsOn, `PAC ${i} pause`).toBeLessThan(2 * sinusRr - 100);
    }
    const sb = sa.truth!.beats;
    expect(sb.every((b) => b.kind === 'sinus')).toBe(true);
    const prs = sb.map((b) => b.qrsOn - b.pOn!);
    expect(Math.max(...prs) - Math.min(...prs)).toBeLessThan(5);
    expect(Math.max(...rrs(sa)) - Math.min(...rrs(sa))).toBeGreaterThan(200);
    const bb = big.truth!.beats;
    bb.forEach((b, i) => expect(b.kind, `beat ${i}`).toBe(bb[0].kind === 'ventricular' ? (i % 2 ? 'sinus' : 'ventricular') : i % 2 ? 'ventricular' : 'sinus'));
    const pvcs = bb.filter((b) => b.kind === 'ventricular');
    for (const b of pvcs) {
      expect(b.qrsOff - b.qrsOn).toBeGreaterThanOrEqual(120);
      expect(b.pOn).toBeNull();
    }
    const coupling = bb.flatMap((b, i) => (b.kind === 'ventricular' && i > 0 ? [b.qrsOn - bb[i - 1].qrsOn] : []));
    expect(Math.max(...coupling) - Math.min(...coupling)).toBeLessThan(10);
    const after = bb.flatMap((b, i) => (b.kind === 'ventricular' && i + 1 < bb.length ? [bb[i + 1].qrsOn - b.qrsOn] : []));
    expect(Math.min(...after)).toBeGreaterThan(2 * Math.max(...coupling));
  });
  it('f-wave sweep notes: V1 f waves over 1 mm at 0.7–0.9 and under 1 mm at 0.2–0.45; the RR identical at every setting', () => {
    for (const v of [0.7, 0.9]) expect(diastolicP2p(played('t2', 0, v), 'V1'), `${v}`).toBeGreaterThan(0.1);
    for (const v of [0.2, 0.45]) expect(diastolicP2p(played('t2', 0, v), 'V1'), `${v}`).toBeLessThan(0.1);
    const ref = rrs(played('t2', 0, 0.9));
    for (const v of [0.2, 0.46, 0.69]) expect(rrs(played('t2', 0, v)), `${v}`).toEqual(ref);
    expect(played('t2', 0, 0.2).truth!.rhythm).toBe('atrial-fibrillation');
  });
  it('rate film: about 130/min irregular; about 45/min irregular; about 45/min regular escape with f waves and complete AV block; pre-excited AF about 190/min, wide QRS varying beat to beat, shortest RR about 225 ms', () => {
    const [untreated, slow, regular, pre] = frames('t2', 1);
    expect(Math.abs(untreated.truth!.hrBpm - 130)).toBeLessThanOrEqual(5);
    expect(Math.max(...rrs(untreated)) - Math.min(...rrs(untreated))).toBeGreaterThan(300);
    expect(Math.abs(slow.truth!.hrBpm - 45)).toBeLessThanOrEqual(3);
    expect(Math.max(...rrs(slow)) - Math.min(...rrs(slow))).toBeGreaterThan(300);
    const r = regular.truth!;
    expect(Math.abs(r.hrBpm - 45)).toBeLessThanOrEqual(3);
    expect(Math.max(...rrs(regular)) - Math.min(...rrs(regular))).toBeLessThan(10);
    expect(r.findings).toContain('av-block-3');
    expect(r.beats.every((b) => b.kind.startsWith('escape'))).toBe(true);
    expect(diastolicP2p(regular, 'V1')).toBeGreaterThan(0.05);
    const p = pre.truth!;
    expect(Math.abs(p.hrBpm - 190)).toBeLessThanOrEqual(5);
    expect(Math.abs(Math.min(...rrs(pre)) - 225)).toBeLessThan(5);
    const widths = p.beats.map((b) => b.qrsOff - b.qrsOn);
    expect(Math.max(...widths)).toBeGreaterThanOrEqual(140);
    expect(Math.max(...widths) - Math.min(...widths)).toBeGreaterThan(30);
    expect(p.findings).toContain('wpw');
  });
});

describe('t3 on the tracings', () => {
  it('hook and worked: 2:1 flutter, ventricles 150/min, atria 300/min', () => {
    for (const src of [blocksOf('t3', 'hook')[0].ecg, blocksOf('t3', 'worked')[0].ecg, blocksOf('t3', 'heart')[0].ecg]) {
      const t = ecgOf(src).truth!;
      expect(Math.abs(t.hrBpm - 150)).toBeLessThan(3);
      expect(t.atrialRateBpm).toBe(300);
    }
  });
  it('laddergram: the hook strip, an F every 200 ms, every second F conducted and visible, every blocked F hidden', () => {
    const fig = blocksOf('t3', 'figure').find((b) => b.figure.id === 'laddergram')!;
    expect(fig.ecg).toEqual(blocksOf('t3', 'hook')[0].ecg);
    const t = ecgOf(fig.ecg!).truth!;
    const inStrip = t.atrial.filter((a) => a.t > t.beats[0].qrsOn && a.t < t.beats[t.beats.length - 1].qrsOn);
    for (let i = 1; i < t.atrial.length; i++) expect(Math.abs(t.atrial[i].t - t.atrial[i - 1].t - 200)).toBeLessThan(3);
    inStrip.forEach((a, i) => {
      expect(a.conductedTo === null, `F ${i}`).toBe(inStrip[0].conductedTo === null ? i % 2 === 0 : i % 2 === 1);
      expect(a.visible, `F ${i}`).toBe(a.conductedTo !== null);
    });
  });
  it('direction film: one heart; counter-clockwise F negative in II, III, aVF and upright in V1; clockwise F positive inferiorly and negative in V1', () => {
    const film = blocksOf('t3', 'film')[0];
    const [ccw, cw] = film.frames.map((f) => (f.ecg.kind === 'synth' ? f.ecg.req : null));
    expect({ ...cw!, variant: undefined }).toEqual({ ...ccw!, variant: undefined });
    const [a, b] = frames('t3', 0);
    const swing = (e: Ecg, lead: StdLead) => {
      const bs = e.truth!.beats;
      const up: number[] = [];
      const dn: number[] = [];
      for (let i = 0; i + 1 < bs.length; i++) {
        const xs: number[] = [];
        for (let t = bs[i].tOff + 30; t <= bs[i + 1].qrsOn - 30; t += 2) xs.push(at(e, lead, t));
        if (xs.length < 100) continue;
        const m = median(xs);
        up.push(Math.max(...xs) - m);
        dn.push(m - Math.min(...xs));
      }
      return { up: median(up), dn: median(dn) };
    };
    for (const l of ['II', 'III', 'aVF'] as const) {
      expect(swing(a, l).dn, `ccw ${l}`).toBeGreaterThan(1.5 * swing(a, l).up);
      expect(swing(b, l).up, `cw ${l}`).toBeGreaterThan(1.5 * swing(b, l).dn);
    }
    expect(swing(a, 'V1').up).toBeGreaterThan(1.5 * swing(a, 'V1').dn);
    expect(swing(b, 'V1').dn).toBeGreaterThan(1.5 * swing(b, 'V1').up);
    expect(a.truth!.rhythm).toBe('atrial-flutter');
    expect(b.truth!.rhythm).toBe('atrial-flutter');
  });
  it('ratio sweep notes: 2:1 at 150/min with about half the F waves hidden; 3:1 at 100/min with more F showing; 4:1 at 75/min with three F per RR; atria at 300/min throughout', () => {
    const [two, three, four] = [2, 3, 4].map((v) => played('t3', 0, v));
    for (const [e, hr] of [[two, 150], [three, 100], [four, 75]] as const) {
      expect(Math.abs(e.truth!.hrBpm - hr), `${hr}`).toBeLessThan(1);
      expect(e.truth!.atrialRateBpm, `${hr}`).toBe(300);
    }
    expect(Math.abs(hiddenShare(two) - 0.5)).toBeLessThan(0.1);
    expect(hiddenShare(three)).toBeLessThan(hiddenShare(two) - 0.1);
    for (const rr of rrs(four)) expect(Math.round(rr / 200)).toBe(4);
    expect(hiddenShare(four)).toBeLessThan(0.35);
  });
  it('variable-block strip: every RR within 0.2 F–F of a whole multiple of 200 ms, from 3 to 5', () => {
    const e = ecgOf(blocksOf('t3', 'ecg')[0].ecg);
    expect(e.truth!.atrialRateBpm).toBe(300);
    for (const rr of rrs(e)) {
      expect(Math.abs(rr / 200 - Math.round(rr / 200)), `${rr}`).toBeLessThan(0.2);
      expect([3, 4, 5]).toContain(Math.round(rr / 200));
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
  it('WPW heart: the region at the pathway depolarises at QRS onset, at least 20 ms before any other ventricular region', () => {
    const e = ecgOf(blocksOf('t4', 'heart')[0].ecg);
    const rs = e.regions!;
    const b = mid(e);
    const buf = new Float32Array(rs.ids.length);
    const first = new Map<string, number>();
    for (let t = b.qrsOn - 40; t < b.qrsOn + 150; t += 2) {
      rs.stateAt(t, buf);
      rs.ids.forEach((id, k) => {
        if (!first.has(id) && /^(lv|rv)-/.test(id) && buf[k] > 0 && buf[k] < 1) first.set(id, t - b.qrsOn);
      });
    }
    expect(rs.highlights['lv-basal-anterolateral']).toBe('pathway');
    const ap = first.get('lv-basal-anterolateral')!;
    expect(Math.abs(ap)).toBeLessThanOrEqual(10);
    for (const [id, t] of first) if (id !== 'lv-basal-anterolateral') expect(t, id).toBeGreaterThanOrEqual(ap + 20);
  });
  it('mimic film: every frame is the hook ECG; V1 wide and mainly positive; negative delta in I and aVL; T opposite to the QRS in II, III, aVF and V1–V6; I nearly isoelectric, aVF upright, axis beyond +90°', () => {
    const hook = blocksOf('t4', 'hook')[0].ecg;
    for (const f of blocksOf('t4', 'film')[0].frames) expect(f.ecg).toEqual(hook);
    const e = ecgOf(hook);
    const b = mid(e);
    const net = (lead: StdLead, t0: number, t1: number) => {
      const a = e.signal.leads[lead];
      const base = baselineBefore(a, e.signal.fs, b.qrsOn);
      let mx = -Infinity;
      let mn = Infinity;
      for (let t = t0; t <= t1; t += 2) {
        mx = Math.max(mx, at(e, lead, t) - base);
        mn = Math.min(mn, at(e, lead, t) - base);
      }
      return { net: mx + mn, p2p: mx - mn };
    };
    expect(e.truth!.qrsMs).toBeGreaterThanOrEqual(120);
    expect(net('V1', b.qrsOn, b.qrsOff).net).toBeGreaterThan(0.1);
    for (const l of ['I', 'aVL'] as const) expect(excursion(e, l, b.qrsOn, b.qrsOn, b.qrsOn + 30), l).toBeLessThan(-0.1);
    for (const l of ['II', 'III', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) {
      expect(net(l, b.qrsOn, b.qrsOff).net, `${l} QRS`).toBeGreaterThan(0.1);
      expect(net(l, b.j + 40, b.tOff).net, `${l} T`).toBeLessThan(-0.04);
    }
    const i = net('I', b.qrsOn, b.qrsOff);
    expect(Math.abs(i.net)).toBeLessThan(0.25 * i.p2p);
    expect(net('aVF', b.qrsOn, b.qrsOff).net).toBeGreaterThan(0.3);
    expect(e.truth!.axisDeg.qrs).toBeGreaterThan(90);
  });
  it('pathway film: sinus PR about 115 ms with QRS about 120 ms; orthodromic AVRT narrow and regular at about 190/min with the P′ after the QRS; antidromic AVRT regular, about 185/min, QRS about 155 ms; pre-excited AF about 200/min, irregular, QRS width varying with narrower beats, shortest RR about 210 ms', () => {
    const [sinus, ortho, anti, af] = frames('t4', 1);
    expect(Math.abs(sinus.truth!.prMs! - 115)).toBeLessThan(5);
    expect(Math.abs(sinus.truth!.qrsMs - 120)).toBeLessThan(5);
    expect(sinus.truth!.findings).toContain('wpw');
    const o = ortho.truth!;
    expect(Math.abs(o.hrBpm - 190)).toBeLessThan(5);
    expect(o.qrsMs).toBeLessThan(110);
    expect(Math.max(...rrs(ortho)) - Math.min(...rrs(ortho))).toBeLessThan(10);
    expect(mid(ortho).pOn!).toBeGreaterThan(mid(ortho).qrsOff);
    const a = anti.truth!;
    expect(Math.abs(a.hrBpm - 185)).toBeLessThan(5);
    expect(Math.abs(a.qrsMs - 155)).toBeLessThan(5);
    expect(Math.max(...rrs(anti)) - Math.min(...rrs(anti))).toBeLessThan(10);
    const p = af.truth!;
    expect(Math.abs(p.hrBpm - 200)).toBeLessThan(5);
    expect(Math.abs(Math.min(...rrs(af)) - 210)).toBeLessThan(5);
    expect(Math.max(...rrs(af)) - Math.min(...rrs(af))).toBeGreaterThan(150);
    const widths = p.beats.map((x) => x.qrsOff - x.qrsOn);
    expect(Math.max(...widths)).toBeGreaterThanOrEqual(150);
    expect(widths.filter((w) => w < 110).length).toBeGreaterThanOrEqual(2);
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
