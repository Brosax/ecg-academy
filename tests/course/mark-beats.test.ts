/**
 * A lesson mark must sit on the beat its text is about. Without `beat`, an auto mark goes to the dominant beat
 * (src/course/marks.ts defaultBeat); on a strip with more than one beat kind, an aberrant beat or a changing RR that
 * default can land on the wrong beat (a pause bracket on a normal cycle, a P′ mark on a sinus P). So on such strips
 * every auto mark names its beat, and the stage test asserts what that beat is.
 */
import { describe, expect, it } from 'vitest';
import type { AutoMark, Block, Lesson, LessonMark } from '../../src/course/api';
import { LESSONS } from '../../src/course/lessons/index';
import { startDials } from '../../src/course/live';
import { isAutoMark } from '../../src/course/marks';
import type { Ecg } from '../../src/core/ecg';
import type { EcgSource } from '../../src/practice/api';
import { generate, scenarios, type SynthRequest } from '../../src/synth';

const GATED = ['S', 'R', 'T', 'I', 'H', 'O', 'X'] as const;
/** kinds that mark every matching wave on the strip, not one beat */
const STRIP_WIDE: ReadonlySet<AutoMark['auto']> = new Set(['f-waves', 'blocked-p']);
const RR_SPREAD = 1.15;

interface Site {
  readonly path: string;
  readonly req: SynthRequest;
  readonly marks: readonly LessonMark[];
}

function sites(b: Block, p: string): Site[] {
  const out: Site[] = [];
  const add = (path: string, src: EcgSource, marks: readonly LessonMark[] | undefined) => {
    if (src.kind === 'synth' && marks?.length) out.push({ path, req: src.req, marks });
  };
  switch (b.kind) {
    case 'ecg':
      add(p, b.ecg, b.marks);
      break;
    case 'worked':
      b.steps.forEach((s, k) => add(`${p}.steps[${k}]`, b.ecg, s.marks));
      break;
    case 'contrast':
      add(`${p}.left`, b.left.ecg, b.left.marks);
      add(`${p}.right`, b.right.ecg, b.right.marks);
      break;
    case 'film':
      b.frames.forEach((f, k) => add(`${p}.frames[${k}]`, f.ecg, f.marks));
      break;
    case 'live': {
      const sc = scenarios().find((s) => s.id === b.scenario);
      if (sc && b.marks?.length) {
        const dials = startDials(sc, b.variant, b.dials.map((d) => d.id), b.play);
        out.push({ path: p, req: { scenario: b.scenario, ...(b.variant ? { variant: b.variant } : {}), seed: b.seed, dials }, marks: b.marks });
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
