import { describe, expect, it } from 'vitest';
import { LANGS, pick } from '../../../src/core/l10n';
import { FOUNDATION_BASICS } from '../../../src/course/foundations/basics';
import { FOUNDATION_EXPLANATIONS } from '../../../src/course/foundations/explanations';
import { F1_STEPS } from '../../../src/course/foundations/F1Scene';
import { F2_STEPS } from '../../../src/course/foundations/F2Scene';
import { F3_STEPS } from '../../../src/course/foundations/F3Scene';
import { F4_STEPS } from '../../../src/course/foundations/F4Scene';
import { F5_STEPS } from '../../../src/course/foundations/F5Scene';
import { F6_STEPS } from '../../../src/course/foundations/F6Scene';

describe('beginner prerequisites and explanations cover every foundation story', () => {
  const stories = { f1: F1_STEPS, f2: F2_STEPS, f3: F3_STEPS, f4: F4_STEPS, f5: F5_STEPS, f6: F6_STEPS };
  for (const [id, steps] of Object.entries(stories)) {
    it(`${id}: every concept and animation segment has explicit content in all three languages`, () => {
      const pages = FOUNDATION_BASICS[id];
      expect(pages.length).toBeGreaterThan(0);
      expect(Object.keys(FOUNDATION_EXPLANATIONS[id]).sort()).toEqual(steps.map(s => s.id).sort());
      const texts = pages.flatMap(p => {
        expect(p.paragraphs.length).toBeGreaterThan(0);
        expect(p.sequence.length).toBeGreaterThan(0);
        return [p.title, ...p.paragraphs, ...p.sequence, p.takeaway];
      });
      for (const step of steps) {
        const paragraphs = FOUNDATION_EXPLANATIONS[id][step.id];
        expect(paragraphs.length).toBeGreaterThan(0);
        texts.push(...paragraphs);
      }
      for (const text of texts) for (const lang of LANGS) {
        // Do not allow English fallback to hide a missing introductory translation.
        expect(text[lang]?.trim().length).toBeGreaterThan(0);
        expect(pick(text, lang)).not.toMatch(/undefined|TODO/);
      }
    });
  }
});
