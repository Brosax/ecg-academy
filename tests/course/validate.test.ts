/**
 * The lesson validator (src/course/validate.ts) against fake catalogues: the example fixture passes, and every class of
 * authoring error is reported with a clear path and message.
 */
import { describe, expect, it } from 'vitest';
import type { Lesson } from '../../src/course/api';
import { PLANNED_STAGE } from '../../src/course/catalogue';
import { errorsOf, formatIssues, validateLesson, type LessonIssue, type ValidateDeps } from '../../src/course/validate';
import { l } from '../../src/core/l10n';
import type { DrillFamily } from '../../src/practice/api';
import type { DialId, DialRange, ScenarioDef } from '../../src/synth/api';
import example from './fixtures/example-lesson';

const scenario = (id: string, dials: Partial<Record<DialId, DialRange>>, variants: readonly string[] = []): ScenarioDef => ({
  id,
  group: 'normal',
  findings: ['normal-ecg'],
  source: { rhythm: { kind: 'sinus', rateBpm: 70 }, activation: { kind: 'conducted' } },
  dials,
  variants: variants.length ? Object.fromEntries(variants.map((v) => [v, { label: l(v, v, v), patch: {} }])) : undefined,
});

const family: DrillFamily = {
  id: 'rate',
  stage: 'S',
  competency: 'C2',
  kind: 'rate',
  title: l('心率', 'Rate', 'Frecuencia'),
  description: l('心率', 'Rate', 'Frecuencia'),
  difficulties: ['classic', 'subtle'],
  findings: [],
};

const deps: ValidateDeps = {
  scenarios: [
    scenario('normal', { rate: { min: 60, max: 100 }, axis: { min: 0, max: 80 } }, ['vertical']),
    scenario('sinus-bradycardia', { rate: { min: 38, max: 58 } }),
    scenario('sinus-tachycardia', { rate: { min: 102, max: 150 } }),
  ],
  families: [family],
  getCase: (id) => (id === 1101 ? { id } : undefined),
  figureIds: ['rate-ruler', 'hexaxial', 'decision-tree'],
  treeIds: ['narrow-tachy'],
  plan: PLANNED_STAGE,
  fileId: 's2',
};

type Mutable = Record<string, unknown>;
/** Deep-cloned example lesson to break on purpose. */
const lesson = (): Mutable => structuredClone(example) as unknown as Mutable;
const blocks = (x: Mutable) => x.blocks as Mutable[];
const errors = (x: unknown, d: ValidateDeps = deps) => errorsOf(validateLesson(x, d));
const find = (issues: readonly LessonIssue[], path: string) => issues.filter((i) => i.path === path);

describe('validateLesson', () => {
  it('the example fixture (every block kind) has no errors and no warnings', () => {
    const issues = validateLesson(example, deps);
    expect(formatIssues(issues)).toBe('');
  });

  it('a non-object is rejected', () => {
    expect(errors(42).length).toBeGreaterThan(0);
    expect(errors(null)[0].message).toMatch(/object/);
  });

  it('unknown scenario ids fail clearly (and say when the synth catalogue is empty)', () => {
    const x = lesson();
    ((blocks(x)[2].ecg as Mutable).req as Mutable).scenario = 'no-such-scenario';
    const e = errors(x);
    expect(e).toHaveLength(1);
    expect(e[0].path).toBe('blocks[2].ecg.req.scenario');
    expect(e[0].message).toContain('"no-such-scenario"');
    const empty = errors(example, { ...deps, scenarios: [] });
    expect(empty.length).toBeGreaterThan(0);
    expect(empty.every((i) => i.message.includes('synth catalogue is empty'))).toBe(true);
  });

  it('every L10n needs zh, en and es (path points at the missing language)', () => {
    const x = lesson();
    delete ((blocks(x)[1] as Mutable).body as Mutable).es;
    ((x.objectives as Mutable[])[0] as Mutable).zh = '  ';
    const e = errors(x);
    expect(e.map((i) => i.path).sort()).toEqual(['blocks[1].body.es', 'objectives[0].zh']);
    const y = lesson();
    (y as Mutable).title = 'Heart rate';
    expect(find(errors(y), 'title')[0].message).toMatch(/zh, en, es/);
  });

  it('dials: unknown id, not allowed by the scenario, outside its range', () => {
    const x = lesson();
    const req = (blocks(x)[0].ecg as Mutable).req as Mutable;
    req.scenario = 'normal';
    req.dials = { rate: 200, qtc: 450, bogus: 1 };
    const e = errors(x);
    expect(e.map((i) => i.path).sort()).toEqual(['blocks[0].ecg.req.dials.bogus', 'blocks[0].ecg.req.dials.qtc', 'blocks[0].ecg.req.dials.rate']);
    expect(find(e, 'blocks[0].ecg.req.dials.rate')[0].message).toMatch(/60…100/);
    const live = lesson();
    (blocks(live)[3].dials as Mutable[])[0].id = 'pr';
    expect(errors(live)[0]).toMatchObject({ path: 'blocks[3].dials[0].id' });
  });

  it('variants must exist in the scenario', () => {
    const x = lesson();
    ((blocks(x)[2].ecg as Mutable).req as Mutable).variant = 'horizontal';
    expect(errors(x)[0]).toMatchObject({ path: 'blocks[2].ecg.req.variant' });
    ((blocks(x)[2].ecg as Mutable).req as Mutable).variant = 'vertical';
    expect(errors(x)).toEqual([]);
  });

  it('drill families must exist (and the practice engine must be there to say so)', () => {
    const x = lesson();
    (blocks(x)[10] as Mutable).families = ['rate', 'no-family'];
    expect(errors(x)[0]).toMatchObject({ path: 'blocks[10].families[1]' });
    const off = errors(example, { ...deps, families: null });
    expect(off.length).toBe(2);
    expect(off[0].message).toMatch(/practice engine is not available/);
    const diff = lesson();
    ((blocks(diff)[9].item as Mutable) as Mutable).difficulty = 'noisy';
    expect(errors(diff)[0].message).toMatch(/no "noisy" difficulty/);
  });

  it('finding ids, real case ids, figure ids and decision trees are checked', () => {
    const x = lesson();
    (x.findings as string[]).push('not-a-finding');
    (blocks(x)[11].ids as number[]).push(7);
    ((blocks(x)[4] as Mutable).figure as Mutable).id = 'no-figure';
    const e = errors(x);
    expect(e.map((i) => i.path).sort()).toEqual(['blocks[11].ids[1]', 'blocks[4].figure.id', 'findings[2]']);
    const t = lesson();
    blocks(t)[4].figure = { id: 'decision-tree', params: { tree: 'nope' } };
    expect(errors(t)[0]).toMatchObject({ path: 'blocks[4].figure.params.tree' });
  });

  it('AutoMarks cannot be used on real ECGs; extra leads must be requested', () => {
    const x = lesson();
    blocks(x)[2].ecg = { kind: 'real', id: 1101 };
    expect(errors(x)[0].message).toMatch(/AutoMarks need the model truth/);
    const y = lesson();
    blocks(y)[2].marks = [{ auto: 'st60', lead: 'V4R' }];
    expect(errors(y)[0].message).toMatch(/extraLeads/);
    ((blocks(y)[2].ecg as Mutable).req as Mutable).extraLeads = ['V3R', 'V4R'];
    expect(errors(y)).toEqual([]);
  });

  it('views and marks are type-checked', () => {
    const x = lesson();
    blocks(x)[2].view = { layout: '4x3', lead: 'V7', window: [500, 100] };
    blocks(x)[2].marks = [{ auto: 'zz' }, { kind: 'wave', lead: 'II', t: 100 }];
    const paths = errors(x).map((i) => i.path).sort();
    expect(paths).toEqual(['blocks[2].marks[0].auto', 'blocks[2].marks[1].label', 'blocks[2].view.layout', 'blocks[2].view.lead', 'blocks[2].view.window']);
  });

  it('id, file name, stage and the curriculum plan agree', () => {
    const x = lesson();
    x.id = 's9';
    const e = errors(x);
    expect(e.map((i) => i.message).join('\n')).toMatch(/file name "s2\.ts"/);
    expect(e.map((i) => i.message).join('\n')).toMatch(/not in the curriculum plan/);
    const y = lesson();
    y.stage = 'F';
    expect(errors(y)[0]).toMatchObject({ path: 'stage' });
    const z = lesson();
    z.sources = [];
    expect(errors(z)[0]).toMatchObject({ path: 'sources' });
  });

  it('inline items are checked like generated ones', () => {
    const x = lesson();
    blocks(x)[9].item = {
      inline: {
        id: 'inline:1',
        family: 'lesson-s2',
        kind: 'choice',
        competency: 'C2',
        difficulty: 'classic',
        seed: 1,
        prompt: l('心率？', 'Rate?', '¿Frecuencia?'),
        ecg: { kind: 'synth', req: { scenario: 'normal', seed: 3 } },
        explanation: l('约 75 次/分。', 'About 75/min.', 'Unos 75 lpm.'),
        findings: [],
        key: { options: [{ id: 'a', label: l('50', '50', '50') }, { id: 'b', label: l('75', '75', '75') }], correct: 'c' },
      },
    };
    expect(errors(x)).toEqual([expect.objectContaining({ path: 'blocks[9].item.inline.key.correct' })]);
  });

  it('authoring warnings: no hook first, no summary, no practice, a criteria card without a source', () => {
    const x = lesson();
    x.blocks = blocks(x).filter((b) => !['hook', 'summary', 'check', 'drill'].includes(b.kind as string));
    delete blocks(x).find((b) => b.kind === 'criteria')!.source;
    const issues = validateLesson(x, deps);
    expect(errorsOf(issues)).toEqual([]);
    expect(issues.filter((i) => i.level === 'warning').map((i) => i.path).sort()).toEqual(['blocks', 'blocks', 'blocks[0]', 'blocks[5].source']);
  });

  it('a lesson typed as Lesson keeps type-checking (fixture shape)', () => {
    const typed: Lesson = example;
    expect(typed.blocks.map((b) => b.kind)).toEqual([
      'hook', 'text', 'ecg', 'live', 'figure', 'heart', 'criteria', 'worked', 'contrast', 'check', 'drill', 'real', 'pitfalls', 'summary',
    ]);
  });
});
