/**
 * Page context (src/assistant/context.ts): every sample route gives a bounded description without throwing; lessons
 * and atlas pages carry their visible text; real cases, drills and lesson hooks never leak the hidden answer; the
 * system prompt (src/assistant/prompt.ts) carries the language, the terminology rules and the context.
 */
import { describe, expect, it } from 'vitest';
import { blockText, clip, MAX_CONTEXT_CHARS, MAX_STEP_CHARS, pageContext } from '../../src/assistant/context';
import { STABLE_SYSTEM, systemPrompt } from '../../src/assistant/prompt';
import { entryOf } from '../../src/atlas';
import { FINDINGS } from '../../src/core/findings';
import { LANGS } from '../../src/core/l10n';
import { getLesson, LESSONS } from '../../src/course';
import { getFamily } from '../../src/practice';
import { getCases, SCP_LIST } from '../../src/real';
import { SAMPLE_ROUTES } from '../app/fixtures';

describe('pageContext on every sample route', () => {
  for (const r of SAMPLE_ROUTES) {
    for (const lang of LANGS) {
      it(`${JSON.stringify(r)} / ${lang}`, () => {
        const ctx = pageContext(r, lang);
        expect(typeof ctx.title).toBe('string');
        expect(typeof ctx.text).toBe('string');
        expect(ctx.text.length).toBeLessThanOrEqual(MAX_CONTEXT_CHARS + 400);
      });
    }
  }
});

describe('lessons', () => {
  it('a lesson gives its title, summary and objectives in the UI language', () => {
    const f1 = getLesson('f1');
    expect(f1).toBeDefined();
    const ctx = pageContext({ name: 'lesson', id: 'f1' }, 'zh');
    expect(ctx.kind).toBe('lesson');
    expect(ctx.title).toContain('F1');
    expect(ctx.text).toContain(f1!.title.zh);
    expect(ctx.text).toContain(f1!.objectives[0].zh);
    expect(ctx.text).not.toContain('Current step');
  });

  it('a step adds that block, clipped; the step is clamped to the lesson', () => {
    const f1 = getLesson('f1')!;
    const n = f1.blocks.length;
    const ctx = pageContext({ name: 'lesson', id: 'f1', step: 2 }, 'en');
    expect(ctx.text).toContain(`Current step 2 of ${n}`);
    expect(ctx.text).toContain(clip(blockText(f1.blocks[1], 'en'), MAX_STEP_CHARS).slice(0, 40));
    expect(pageContext({ name: 'lesson', id: 'f1', step: 0 }, 'en').text).toContain('Current step 1 of');
    expect(pageContext({ name: 'lesson', id: 'f1', step: 999 }, 'en').text).toContain(`Current step ${n} of ${n}`);
  });

  it('a hook block gives its question but never its reveal; a check gives nothing', () => {
    let checked = 0;
    for (const lesson of LESSONS.values()) {
      for (const b of lesson.blocks) {
        if (b.kind === 'hook') {
          const t = blockText(b, 'en');
          expect(t).toContain(b.question.en);
          if (b.reveal.en.length > 12 && !b.question.en.includes(b.reveal.en)) expect(t).not.toContain(b.reveal.en);
          checked++;
        }
        if (b.kind === 'check' || b.kind === 'drill') expect(blockText(b, 'en')).toMatch(/withheld/);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('an unknown lesson id does not throw', () => {
    expect(pageContext({ name: 'lesson', id: 'zz9' }, 'es').text).toContain('ZZ9');
  });
});

describe('atlas pages', () => {
  it('a finding gives the entry definition, criteria with sources and the mechanism', () => {
    const e = entryOf('lbbb')!;
    const ctx = pageContext({ name: 'finding', id: 'lbbb' }, 'es');
    expect(ctx.kind).toBe('finding');
    expect(ctx.title).toBe(FINDINGS.lbbb.name.es);
    expect(ctx.text).toContain(e.definition.es);
    expect(ctx.text).toContain(e.criteria[0].source);
    expect(ctx.text.length).toBeLessThanOrEqual(MAX_CONTEXT_CHARS);
  });
  it('an unknown finding does not throw', () => {
    expect(pageContext({ name: 'finding', id: 'not-a-finding' }, 'en').kind).toBe('finding');
  });
});

describe('no answer leakage', () => {
  it('a real case gives its blind number, age and sex — no labels, codes, findings or measurements', () => {
    const c = getCases().find((x) => x.findings.length > 0 && Object.keys(x.codes).length > 0)!;
    const ctx = pageContext({ name: 'case', id: c.id }, 'en');
    expect(ctx.kind).toBe('case');
    expect(ctx.text).toContain(String(c.num).padStart(3, '0'));
    for (const code of Object.keys(c.codes)) expect(ctx.text).not.toContain(code);
    for (const f of c.findings) {
      expect(ctx.text).not.toContain(FINDINGS[f].name.en);
      expect(ctx.text).not.toContain(f);
    }
    for (const s of SCP_LIST) if (c.codes[s.code] !== undefined) expect(ctx.text).not.toContain(s.name.en);
    expect(ctx.text).not.toContain(c.cls);
    if (c.ref.qrsMs != null) expect(ctx.text).not.toMatch(new RegExp(`\\b${c.ref.qrsMs}\\b`));
    expect(ctx.text).toMatch(/Never guess/);
    expect(ctx.title).toMatch(/\d{3}/);
  });

  it('a drill gives the family title, never the item seed or topic', () => {
    const fam = getFamily('rate')!;
    const ctx = pageContext({ name: 'drill', id: 'rate:12345' }, 'en');
    expect(ctx.kind).toBe('drill');
    expect(ctx.text).toContain(fam.title.en);
    expect(ctx.text).not.toContain('12345');
    expect(ctx.text).toMatch(/never state or guess/);
    expect(pageContext({ name: 'drill', id: 'mixed' }, 'en').text).toContain('mixed');
  });

  it('the exam context forbids answers', () => {
    expect(pageContext({ name: 'exam' }, 'zh').text).toMatch(/never give or guess/);
  });
});

describe('systemPrompt', () => {
  it('names the reply language and carries the terminology rules and the page context', () => {
    const ctx = pageContext({ name: 'finding', id: 'lafb' }, 'zh');
    const p = systemPrompt('zh', ctx);
    expect(p.startsWith(STABLE_SYSTEM)).toBe(true);
    expect(p).toContain('Simplified Chinese');
    expect(p).toContain('fascicular block');
    expect(p).toContain('atrial abnormality');
    expect(p).toContain(ctx.text);
    expect(systemPrompt('es', null)).toContain('Spain');
    expect(systemPrompt('en', { kind: 'general', title: '', text: '' })).not.toContain('Where the learner is');
  });
  it('the stable part is identical across languages and pages (cacheable prefix)', () => {
    const a = systemPrompt('en', null);
    const b = systemPrompt('es', pageContext({ name: 'lesson', id: 'f1' }, 'es'));
    expect(a.slice(0, STABLE_SYSTEM.length)).toBe(b.slice(0, STABLE_SYSTEM.length));
  });
});
