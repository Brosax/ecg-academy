/**
 * The synth UI dictionary (src/i18n/synth.ts) names every dial, difficulty and scenario group in zh / en / es.
 */
import { describe, expect, it } from 'vitest';
import { LANGS } from '../../src/core/l10n';
import { DIAL_LABEL_KEY, DIFFICULTY_LABEL_KEY, GROUP_LABEL_KEY, tSynth } from '../../src/i18n/synth';
import { DIAL_IDS, DIFFICULTIES, SCENARIO_GROUPS } from '../../src/synth';

describe('synth dictionary', () => {
  it('covers every DialId, Difficulty and ScenarioGroup', () => {
    expect(Object.keys(DIAL_LABEL_KEY).sort()).toEqual([...DIAL_IDS].sort());
    expect(Object.keys(DIFFICULTY_LABEL_KEY).sort()).toEqual([...DIFFICULTIES].sort());
    expect(Object.keys(GROUP_LABEL_KEY).sort()).toEqual([...SCENARIO_GROUPS].sort());
  });
  it('has a non-empty, distinct text in every language', () => {
    const keys = [...Object.values(DIAL_LABEL_KEY), ...Object.values(DIFFICULTY_LABEL_KEY), ...Object.values(GROUP_LABEL_KEY)];
    for (const lang of LANGS) {
      const texts = keys.map((k) => tSynth.in(lang, k));
      for (const t of texts) expect(t.length).toBeGreaterThan(0);
      expect(new Set(texts).size).toBe(texts.length);
    }
    expect(tSynth.in('es', 'originSeed', { seed: 7 })).toBe('ECG sintético · semilla 7');
  });
});
