/**
 * Stage R lessons (r1–r8, docs/PLAN.md §3): every lesson validates against the live catalogues with no errors and no
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
function ecgOf(src: EcgSource | undefined): Ecg {
  if (!src || src.kind !== 'synth') throw new Error('expected a synthetic source');
  const k = JSON.stringify(src.req);
  let e = cache.get(k);
  if (!e) {
    e = generate(src.req).ecg;
    cache.set(k, e);
  }
  return e;
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
  it('type I SA block: the pause is shorter than 2 x PP', () => {
    const r = rrs(ecgOf(blocksOf('r1', 'ecg')[0].ecg));
    expect(Math.max(...r)).toBeLessThan(2 * Math.min(...r));
    expect(Math.max(...r)).toBeGreaterThan(1.4 * Math.min(...r));
  });
  it('tachy–brady: the post-conversion pause is about 2.9 s', () => {
    const e = ecgOf(blocksOf('r1', 'ecg')[2].ecg);
    expect(e.truth!.rhythm).toBe('sinus-node-dysfunction');
    expect(Math.abs(Math.max(...rrs(e)) - 2870)).toBeLessThan(100);
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
  it('isorhythmic dissociation: junction faster than sinus; only an occasional P conducts', () => {
    const t = ecgOf(blocksOf('r2', 'ecg')[1].ecg).truth!;
    expect(t.atrialRateBpm!).toBeLessThan(t.hrBpm);
    const captures = t.beats.filter((b) => b.kind === 'sinus').length;
    expect(captures).toBeGreaterThanOrEqual(1);
    expect(captures).toBeLessThanOrEqual(3);
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
  it('AIVR: sinus about 72/min, with a capture and a fusion beat', () => {
    const t = ecgOf(blocksOf('r2', 'ecg')[2].ecg).truth!;
    const kinds = t.beats.map((b) => b.kind);
    expect(kinds).toContain('capture');
    expect(kinds).toContain('fusion');
    expect(Math.abs((t.atrialRateBpm ?? 0) - 72)).toBeLessThan(3);
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
  it('3:2 cycles: PR about 150 → 260 ms', () => {
    const p = prs(ecgOf(blocksOf('r3', 'ecg')[0].ecg));
    expect(Math.abs(Math.min(...p) - 150)).toBeLessThan(10);
    expect(Math.abs(Math.max(...p) - 262)).toBeLessThan(12);
  });
  it('athlete: PR between 200 and 400 ms, 1:1', () => {
    const e = ecgOf(blocksOf('r3', 'ecg')[2].ecg);
    expect(e.truth!.prMs!).toBeGreaterThan(200);
    expect(e.truth!.prMs!).toBeLessThan(400);
    expect(blocked(e).filter((a) => a.visible).length).toBe(0);
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
  it('high-grade: 3:1 — runs of two blocked P waves', () => {
    let run = 0;
    let maxRun = 0;
    for (const a of ecgOf(blocksOf('r4', 'ecg')[0].ecg).truth!.atrial) {
      run = a.conductedTo === null ? run + 1 : 0;
      maxRun = Math.max(maxRun, run);
    }
    expect(maxRun).toBe(2);
  });
  it('worked: complete block, narrow escape about 45/min, sinus about 78/min, no P conducts', () => {
    const t = ecgOf(blocksOf('r4', 'worked')[0].ecg).truth!;
    expect(Math.abs(t.hrBpm - 45)).toBeLessThan(2);
    expect(Math.abs((t.atrialRateBpm ?? 0) - 78)).toBeLessThan(3);
    expect(t.atrial.every((a) => a.conductedTo === null)).toBe(true);
  });
  it('infra-His complete block: wide ventricular escape about 34/min', () => {
    const t = ecgOf(blocksOf('r4', 'ecg')[1].ecg).truth!;
    expect(Math.abs(t.hrBpm - 34)).toBeLessThan(2);
    expect(t.qrsMs).toBeGreaterThanOrEqual(120);
  });
});

describe('r5: premature beats on the tracings', () => {
  it('PAC: P′R about the sinus PR; less-than-compensatory pause', () => {
    const e = ecgOf(blocksOf('r5', 'ecg')[0].ecg);
    const beats = e.truth!.beats;
    const i = beats.findIndex((b) => b.kind === 'atrial');
    expect(Math.abs(beats[i].qrsOn - (beats[i].pOn ?? 0) - e.truth!.prMs!)).toBeLessThan(15);
    expect(beats[i + 1].qrsOn - beats[i - 1].qrsOn).toBeLessThan(2 * (beats[i - 1].qrsOn - beats[i - 2].qrsOn) - 100);
  });
  it('PJC: narrow early beat, retrograde P′ just after the QRS (early ST), negative in II', () => {
    const e = ecgOf(blocksOf('r5', 'ecg')[1].ecg);
    const t = e.truth!;
    const j = t.beats.find((b) => b.kind === 'junctional')!;
    expect(j.qrsOff - j.qrsOn).toBeLessThan(110);
    const p = t.atrial.find((a) => a.kind === 'retrograde')!;
    expect(p.t).toBeGreaterThanOrEqual(j.qrsOff);
    expect(p.t).toBeLessThan(j.qrsOff + 40);
    const a = e.signal.leads.II;
    const base = baselineBefore(a, e.signal.fs, j.qrsOn);
    const v = (ms: number) => a[Math.round((ms * e.signal.fs) / 1000)] - base;
    expect(Math.min(v(j.qrsOff + 40), v(j.qrsOff + 50))).toBeLessThan(-0.04);
  });
  it('blocked-PAC bigeminy: ventricles about 46/min, atria about 95/min, every P′ blocked', () => {
    const t = ecgOf(blocksOf('r5', 'ecg')[2].ecg).truth!;
    expect(Math.abs(t.hrBpm - 46)).toBeLessThan(2);
    expect(Math.abs((t.atrialRateBpm ?? 0) - 95)).toBeLessThan(4);
    expect(t.atrial.filter((a) => a.kind === 'ectopic').every((a) => a.conductedTo === null)).toBe(true);
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
  it('rate-dependent LBBB: wide beats end shorter cycles than narrow ones; same PR', () => {
    const e = ecgOf(blocksOf('r6', 'ecg')[0].ecg);
    const beats = e.truth!.beats;
    const cyc = beats.slice(1).map((b, i) => ({ rr: b.qrsOn - beats[i].qrsOn, wide: b.aberrant }));
    expect(Math.max(...cyc.filter((c) => c.wide).map((c) => c.rr))).toBeLessThan(Math.min(...cyc.filter((c) => !c.wide).map((c) => c.rr)));
    const p = prs(e);
    expect(Math.max(...p) - Math.min(...p)).toBeLessThan(5);
  });
  it('incomplete RBBB: QRS 110–119 ms', () => {
    const t = ecgOf(blocksOf('r6', 'ecg')[1].ecg).truth!;
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
  it('IVCD: QRS about 125 ms, no R′ in V1', () => {
    const e = ecgOf(blocksOf('r7', 'ecg')[1].ecg);
    expect(Math.abs(e.truth!.qrsMs - 125)).toBeLessThan(6);
    expect(hasRPrime(e, 'V1', mid(e))).toBe(false);
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
  it('dissociation ladder: sinus about 60/min with at least one capture', () => {
    const fig = blocksOf('r8', 'figure').find((b) => b.ecg?.kind === 'synth' && b.ecg.req.scenario === 'av-dissociation');
    const t = ecgOf(fig?.ecg).truth!;
    expect(Math.abs((t.atrialRateBpm ?? 0) - 60)).toBeLessThan(2);
    expect(t.beats.some((b) => b.kind === 'sinus')).toBe(true);
  });
});
