/**
 * Every lesson data file in src/course/lessons/ validates against the live catalogues: the synth scenarios
 * (src/synth scenarios()), the practice drill families (src/practice families()), the curated real cases and the
 * figure ids. Lessons that reference scenarios or families not built yet fail here with the offending id named — the
 * suite turns green as the synth catalogue and the practice engine land.
 */
import { describe, expect, it } from 'vitest';
import { PLANNED_IDS } from '../../src/course/catalogue';
import { liveValidateDeps } from '../../src/course/deps';
import { LESSONS, REGISTERED } from '../../src/course/lessons/index';
import type { Lesson } from '../../src/course/api';
import { realisedDials, startDials } from '../../src/course/live';
import { errorsOf, formatIssues, validateLesson } from '../../src/course/validate';
import { generate, scenarios } from '../../src/synth';

/**
 * Live blocks whose dials the engine does not realise for their scenario (the slider would do nothing, so the player
 * hides it). Only blocks whose scenario exists are checked — unknown scenarios are reported by the validator.
 */
function unrealisedLiveDials(lesson: Lesson): string[] {
  const out: string[] = [];
  lesson.blocks.forEach((b, i) => {
    if (b.kind !== 'live') return;
    const sc = scenarios().find((s) => s.id === b.scenario);
    if (!sc) return;
    const ids = b.dials.map((d) => d.id);
    let applied: Readonly<Record<string, number>> = {};
    try {
      applied = generate({ scenario: b.scenario, variant: b.variant, seed: b.seed, dials: startDials(sc, b.variant, ids) }).applied;
    } catch (e) {
      out.push(`blocks[${i}]: the engine cannot generate "${b.scenario}" (${String(e)})`);
      return;
    }
    const realised = realisedDials(ids, applied);
    for (const id of ids) if (!realised.includes(id)) out.push(`blocks[${i}].dials: "${id}" is not realised by the engine for scenario "${b.scenario}" (src/synth/dials)`);
  });
  return out;
}

describe('lesson registry', () => {
  it('every lesson file is named after a planned lesson id and exports one lesson', () => {
    const problems = REGISTERED.flatMap((m) => [
      ...(PLANNED_IDS.includes(m.fileId) ? [] : [`${m.path}: "${m.fileId}" is not a lesson id of docs/PLAN.md §3`]),
      ...(m.lesson ? [] : [`${m.path}: exports no lesson (use \`export default lesson\`)`]),
    ]);
    expect(problems).toEqual([]);
  });

  it('lesson ids are unique', () => {
    const ids = REGISTERED.flatMap((m) => (m.lesson ? [m.lesson.id] : []));
    expect(ids.length).toBe(new Set(ids).size);
    expect(LESSONS.size).toBe(ids.length);
  });
});

const lessonFiles = REGISTERED.filter((m) => m.lesson !== null);

describe('registered lessons validate against the live catalogues', () => {
  if (lessonFiles.length === 0) {
    it('no lesson files yet (src/course/lessons/<id>.ts)', () => {
      expect(REGISTERED).toEqual([]);
    });
    return;
  }
  for (const m of lessonFiles) {
    it(`${m.fileId}: no errors`, () => {
      const issues = validateLesson(m.lesson, liveValidateDeps(m.fileId));
      const errors = errorsOf(issues);
      // the message lists every error with its path (unknown scenario / family / case ids are named)
      expect(formatIssues(errors), `lesson ${m.fileId}\n${formatIssues(issues)}`).toBe('');
    });
  }
});

describe('the example lesson fixture (the template lesson writers copy)', () => {
  it('validates against the live catalogues (scenarios, families, real cases, figures)', async () => {
    const example = (await import('./fixtures/example-lesson')).default;
    const issues = validateLesson(example, liveValidateDeps('s2'));
    expect(formatIssues(issues)).toBe('');
    expect(unrealisedLiveDials(example)).toEqual([]);
  });
});
