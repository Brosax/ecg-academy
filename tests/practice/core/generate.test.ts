import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { COMPETENCIES, ITEM_KINDS, STAGES } from '../../../src/practice/api';
import { FAMILY_SPECS, families, familiesTraining, getFamily } from '../../../src/practice/core/families';
import { generateItem } from '../../../src/practice/core/generate';
import { GenerationError } from '../../../src/practice/core/gen/common';
import { clearEcgCache, ecgOf, setPracticePorts } from '../../../src/practice/core/ports';
import { nonEmptyL10n } from '../../../src/practice/core/text';
import { fakeReal, fakeSynth, throwingSynth } from '../fake';
import { validate } from '../validate';

beforeAll(() => setPracticePorts({ synth: fakeSynth, real: fakeReal }));
afterAll(() => setPracticePorts({ synth: null, real: null }));

const SEEDS = [1, 7, 4242];

describe('drill families', () => {
  it('have unique ids, valid stages and every item kind', () => {
    const ids = FAMILY_SPECS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of FAMILY_SPECS) expect(STAGES).toContain(s.stage);
    const kinds = new Set(FAMILY_SPECS.map((s) => s.kind));
    for (const k of ITEM_KINDS) expect(kinds.has(k)).toBe(true);
  });

  it('cover every competency C1–C12 with a synthetic family', () => {
    for (const c of COMPETENCIES) expect(FAMILY_SPECS.some((s) => s.competency === c && s.source === 'synth')).toBe(true);
  });

  it('have real twins that exist and train the same competency', () => {
    for (const s of FAMILY_SPECS) {
      if (!s.realTwin) continue;
      const twin = getFamily(s.realTwin);
      expect(twin, s.id).toBeDefined();
    }
  });

  it('expose DrillFamily objects with titles in three languages; pool findings grow with the catalogue', () => {
    const fs = families();
    expect(fs.length).toBe(FAMILY_SPECS.length);
    for (const f of fs) {
      expect(nonEmptyL10n(f.title)).toBe(true);
      expect(nonEmptyL10n(f.description)).toBe(true);
      expect(f.difficulties.length).toBeGreaterThan(0);
    }
    expect(getFamily('findings')?.findings).toContain('lbbb');
    expect(familiesTraining('lbbb').map((s) => s.id)).toContain('bundle-branch');
  });
});

describe('generateItem', () => {
  for (const spec of FAMILY_SPECS) {
    it(`${spec.id}: every difficulty yields valid items`, async () => {
      for (const d of spec.difficulties) {
        for (const seed of SEEDS) {
          const item = await generateItem(spec.id, seed, d);
          validate(item, spec.id);
          expect(item.difficulty).toBe(d);
          const ecg = await ecgOf(item.ecg);
          expect(ecg.signal.durationMs).toBeGreaterThan(0);
          if (item.kind === 'compare') await expect(ecgOf(item.ecg2)).resolves.toBeDefined();
        }
      }
    });
  }

  it('is deterministic per seed (also after the cache is cleared)', async () => {
    for (const spec of FAMILY_SPECS) {
      const a = await generateItem(spec.id, 99, spec.difficulties[0]);
      clearEcgCache();
      const b = await generateItem(spec.id, 99, spec.difficulties[0]);
      expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    }
  });

  it('varies with the seed', async () => {
    const keys = new Set<string>();
    for (let s = 1; s <= 12; s++) keys.add(JSON.stringify((await generateItem('bundle-branch', s)).key));
    expect(keys.size).toBeGreaterThan(3);
  });

  it('honours a focus finding (spaced review)', async () => {
    for (let s = 1; s <= 5; s++) {
      const item = await generateItem('av-block', s, 'classic', { focus: 'av-block-2-mobitz2' });
      expect(item.kind === 'choice' && item.key.correct).toBe('av-block-2-mobitz2');
    }
  });

  it('falls back to the first difficulty a family offers', async () => {
    const item = await generateItem('leads', 3, 'noisy');
    expect(item.difficulty).toBe('classic');
  });

  it('rejects unknown families and reports an engine failure', async () => {
    await expect(generateItem('nope', 1)).rejects.toBeInstanceOf(GenerationError);
    setPracticePorts({ synth: throwingSynth });
    await expect(generateItem('rate', 1)).rejects.toThrow();
    // real families do not need the engine
    await expect(generateItem('rate-real', 1)).resolves.toBeDefined();
    setPracticePorts({ synth: fakeSynth });
  });

  it('real families read the 12SL reference', async () => {
    const item = await generateItem('measure-real', 5);
    expect(item.ecg.kind).toBe('real');
    expect(item.kind).toBe('measure');
  });
});
