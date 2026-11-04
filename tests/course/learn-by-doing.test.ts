/**
 * Learn by doing (docs/design/learn-by-doing.md): every lesson after Foundations teaches through things the learner
 * watches or moves, with short explanations attached to them. Limits are anchored to the F lessons (no text blocks,
 * captions ≤ 95 zh characters). Lessons still in PENDING are expected to fail; once one passes, `it.fails` turns red
 * and the lesson must leave PENDING, so the list only shrinks. One line per stage.
 *
 * Criteria are reading thresholds: every item in fixtures/criteria-baseline.json must survive verbatim in its lesson.
 */
import { describe, expect, it } from 'vitest';
import type { Block, Lesson } from '../../src/course/api';
import { LESSONS } from '../../src/course/lessons/index';
import baseline from './fixtures/criteria-baseline.json';

const LIMITS = { textZh: 200, captionZh: 120, noteZh: 80, media: 3, playing: 1 } as const;
const GATED = ['S', 'R', 'T', 'I', 'H', 'O', 'X'] as const;
const PENDING: ReadonlySet<string> = new Set(
  [
    'r1 r2 r3 r4 r5 r6 r7 r8',
    't1 t2 t3 t4 t5 t6 t7',
    'i1 i2 i3 i4 i5 i6 i7 i8 i9 i10 i11',
    'h1 h2 h3 h4 h5 h6 h7 h8 h9',
    'o1 o2 o3 o4 o5 o6 o7 o8 o9 o10 o11 o12',
    'x4',
  ].flatMap((s) => s.split(' ')),
);
const MEDIA: ReadonlySet<Block['kind']> = new Set(['live', 'heart', 'figure', 'film']);

const zh = (x: { readonly zh: string } | undefined) => (x ? x.zh.length : 0);

function problems(lesson: Lesson): string[] {
  const out: string[] = [];
  let text = 0;
  let media = 0;
  let playing = 0;
  lesson.blocks.forEach((b, i) => {
    if (b.kind === 'text') text += zh(b.title) + zh(b.body);
    if (MEDIA.has(b.kind)) media++;
    if ((b.kind === 'live' && b.play) || b.kind === 'film') playing++;
    if (b.kind === 'ecg' || b.kind === 'live' || b.kind === 'heart' || b.kind === 'figure' || b.kind === 'film') {
      if (zh(b.caption) > LIMITS.captionZh) out.push(`blocks[${i}] (${b.kind}) caption ${zh(b.caption)} > ${LIMITS.captionZh} zh chars`);
    }
    if (b.kind === 'live') b.play?.notes?.forEach((n, k) => zh(n.text) > LIMITS.noteZh && out.push(`blocks[${i}].play.notes[${k}] ${zh(n.text)} > ${LIMITS.noteZh}`));
    if (b.kind === 'film') b.frames.forEach((f, k) => zh(f.note) > LIMITS.noteZh && out.push(`blocks[${i}].frames[${k}].note ${zh(f.note)} > ${LIMITS.noteZh}`));
  });
  if (text > LIMITS.textZh) out.push(`text blocks ${text} > ${LIMITS.textZh} zh chars`);
  if (media < LIMITS.media) out.push(`${media} live/heart/figure/film blocks < ${LIMITS.media}`);
  if (playing < LIMITS.playing) out.push(`no block that plays (live with play, or film)`);
  return out;
}

const lessons = [...LESSONS.values()].sort((a, b) => a.order - b.order);

for (const stage of GATED) {
  describe(`stage ${stage} teaches by animation and experiment`, () => {
    for (const lesson of lessons.filter((l) => l.stage === stage)) {
      (PENDING.has(lesson.id) ? it.fails : it)(lesson.id, () => {
        expect(problems(lesson)).toEqual([]);
      });
    }
  });
}

describe('criteria survive verbatim', () => {
  const base = baseline as Readonly<Record<string, readonly unknown[]>>;
  for (const [id, items] of Object.entries(base)) {
    it(id, () => {
      const lesson = LESSONS.get(id);
      expect(lesson, `lesson ${id}`).toBeDefined();
      const now = lesson!.blocks.flatMap((b) => (b.kind === 'criteria' ? b.items.map((x) => ({ label: x.label, value: x.value })) : []));
      for (const item of items) expect(now).toContainEqual(item);
    });
  }
});
