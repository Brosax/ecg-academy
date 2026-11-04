/**
 * A lesson mark must sit on the beat its text is about. Without `beat`, an auto mark goes to the dominant beat
 * (src/course/marks.ts defaultBeat); on a strip with more than one beat kind, an aberrant beat or a changing RR that
 * default can land on the wrong beat (a pause bracket on a normal cycle, a P′ mark on a sinus P). So on such strips
 * every auto mark names its beat, and the stage test asserts what that beat is. Every auto mark must also draw
 * something on a lead the block shows: a P mark on a beat without a P, or a lead-II mark on a V2 strip, draws nothing.
 */
import { describe, expect, it } from 'vitest';
import type { AutoMark, Block, Lesson, LessonMark } from '../../src/course/api';
import { LESSONS } from '../../src/course/lessons/index';
import { startDials } from '../../src/course/live';
import { isAutoMark, resolveMarks } from '../../src/course/marks';
import type { Ecg } from '../../src/core/ecg';
import type { EcgSource, ItemView } from '../../src/practice/api';
import { generate, scenarios, type SynthRequest } from '../../src/synth';

const GATED = ['S', 'R', 'T', 'I', 'H', 'O', 'X'] as const;
/** every stage, Foundations included, must draw the marks it places */
const DRAWN = ['F', ...GATED] as const;
/** kinds that mark every matching wave on the strip, not one beat */
const STRIP_WIDE: ReadonlySet<AutoMark['auto']> = new Set(['f-waves', 'blocked-p', 'pacing-spike']);
const RR_SPREAD = 1.15;

interface Site {
  readonly path: string;
  readonly req: SynthRequest;
  readonly marks: readonly LessonMark[];
  readonly view?: ItemView;
}

function sites(b: Block, p: string): Site[] {
  const out: Site[] = [];
  const add = (path: string, src: EcgSource, marks: readonly LessonMark[] | undefined, view?: ItemView) => {
    if (src.kind === 'synth' && marks?.length) out.push({ path, req: src.req, marks, view });
  };
  switch (b.kind) {
    case 'ecg':
      add(p, b.ecg, b.marks, b.view);
      break;
    case 'worked':
      b.steps.forEach((s, k) => add(`${p}.steps[${k}]`, b.ecg, s.marks, s.view ?? b.view));
      break;
    case 'contrast':
      add(`${p}.left`, b.left.ecg, b.left.marks, b.view);
      add(`${p}.right`, b.right.ecg, b.right.marks, b.view);
      break;
    case 'film':
      b.frames.forEach((f, k) => add(`${p}.frames[${k}]`, f.ecg, f.marks, b.view));
      break;
    case 'live': {
      const sc = scenarios().find((s) => s.id === b.scenario);
      if (sc && b.marks?.length) {
        const dials = startDials(sc, b.variant, b.dials.map((d) => d.id), b.play);
        out.push({ path: p, req: { scenario: b.scenario, ...(b.variant ? { variant: b.variant } : {}), seed: b.seed, dials }, marks: b.marks, view: b.view });
      }
      break;
    }
    default:
      break;
  }
  return out;
}

/** why the default beat is ambiguous on this strip, or null */
function ambiguity(ecg: Ecg): string | null {
  const beats = ecg.truth?.beats ?? [];
  if (beats.length < 2) return null;
  const kinds = new Set(beats.map((x) => x.kind));
  if (kinds.size > 1) return `beat kinds ${[...kinds].join(' + ')}`;
  if (beats.some((x) => x.aberrant)) return 'aberrant beats';
  const rr = beats.slice(1).map((x, i) => x.qrsOn - beats[i].qrsOn);
  if (Math.max(...rr) > Math.min(...rr) * RR_SPREAD) return `RR ${Math.round(Math.min(...rr))}–${Math.round(Math.max(...rr))} ms`;
  return null;
}

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

function unnamed(lesson: Lesson): string[] {
  const out: string[] = [];
  lesson.blocks.forEach((b, i) => {
    for (const s of sites(b, `blocks[${i}]`)) {
      const loose = s.marks.filter((m): m is AutoMark => isAutoMark(m) && m.beat === undefined && !STRIP_WIDE.has(m.auto));
      if (loose.length === 0) continue;
      const why = ambiguity(ecgOf(s.req));
      if (why) for (const m of loose) out.push(`${s.path} '${m.auto}'${m.lead ? ` in ${m.lead}` : ''}: ${why}`);
    }
  });
  return out;
}

/** auto marks that draw nothing, or only on a lead the block's single-lead view does not show */
function invisible(lesson: Lesson): string[] {
  const out: string[] = [];
  lesson.blocks.forEach((b, i) => {
    for (const s of sites(b, `blocks[${i}]`)) {
      const layout = s.view?.layout ?? '3x4+1';
      const shown = s.view?.lead ?? 'II';
      const oneLead = layout === 'single' || layout === 'strip';
      for (const m of s.marks) {
        if (!isAutoMark(m)) continue;
        const drawn = resolveMarks(ecgOf(s.req), [m], { layout, lead: s.view?.lead, window: s.view?.window });
        const what = `${s.path} '${m.auto}'${m.lead ? ` in ${m.lead}` : ''}${m.beat !== undefined ? ` beat ${m.beat}` : ''}`;
        if (drawn.length === 0) out.push(`${what}: draws nothing`);
        else if (oneLead && drawn.every((d) => d.lead !== 'all' && d.lead !== shown)) out.push(`${what}: drawn off the ${shown} ${layout}`);
      }
    }
  });
  return out;
}

const lessons = [...LESSONS.values()].sort((a, b) => a.order - b.order);

for (const stage of GATED) {
  describe(`stage ${stage}: marks on mixed strips name their beat`, () => {
    for (const lesson of lessons.filter((l) => l.stage === stage)) {
      it(lesson.id, () => {
        expect(unnamed(lesson)).toEqual([]);
      });
    }
  });
}

for (const stage of DRAWN) {
  describe(`stage ${stage}: every mark draws on a lead the block shows`, () => {
    for (const lesson of lessons.filter((l) => l.stage === stage)) {
      it(lesson.id, () => {
        expect(invisible(lesson)).toEqual([]);
      });
    }
  });
}
