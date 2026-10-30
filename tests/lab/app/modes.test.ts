import { describe, expect, it } from 'vitest';
import spec from '../../../docs/lab-research/disease-spec.json';
import { SLICE_PRESETS } from '../../../src/lab/app/commands';
import { DISEASE_CATEGORIES, DISEASE_IDS, DISEASES, diseasesByCategory } from '../../../src/lab/app/modes/diseaseCatalog';
import { anglesFromNormal, normalFromAngles } from '../../../src/lab/app/modes/sliceAngles';
import { tm } from '../../../src/lab/i18n/modes';

describe('disease catalog', () => {
  const entries = (spec as { diseases: { id: string; category: string; priority: string }[] }).diseases;

  it('matches docs/research/disease-spec.json (ids, categories, priorities)', () => {
    expect(DISEASES.map((d) => d.id)).toEqual(entries.map((e) => e.id));
    expect([...DISEASE_IDS]).toEqual(entries.map((e) => e.id));
    for (const e of entries) {
      const d = DISEASES.find((x) => x.id === e.id)!;
      expect(d.category).toBe(e.category);
      expect(e.priority.startsWith(d.priority)).toBe(true);
      expect(DISEASE_CATEGORIES).toContain(e.category as (typeof DISEASE_CATEGORIES)[number]);
    }
  });

  it('has a localized name for every entry and category', () => {
    for (const lang of ['zh', 'en', 'es'] as const) {
      for (const id of DISEASE_IDS) expect(tm.in(lang, `dz.${id}`)).not.toBe(`dz.${id}`);
      for (const c of DISEASE_CATEGORIES) expect(tm.in(lang, `dzcat.${c}`)).not.toBe(`dzcat.${c}`);
    }
    expect(diseasesByCategory().reduce((n, g) => n + g.items.length, 0)).toBe(40);
  });
});

describe('custom slice angles', () => {
  it('round-trips the presets', () => {
    for (const p of Object.values(SLICE_PRESETS)) {
      const a = anglesFromNormal(p.normal);
      const n = normalFromAngles(a.tiltDeg, a.rotDeg ?? 0);
      for (let k = 0; k < 3; k++) expect(n[k]).toBeCloseTo(p.normal[k], 9);
    }
  });
  it('four-chamber = tilt 90°, rotation 90°; short axis has no azimuth', () => {
    expect(anglesFromNormal([0, 0, 1])).toEqual({ tiltDeg: 90, rotDeg: 90 });
    expect(anglesFromNormal([0, 1, 0]).rotDeg).toBeNull();
    const n = normalFromAngles(37, -120);
    expect(Math.hypot(...n)).toBeCloseTo(1, 12);
  });
});
