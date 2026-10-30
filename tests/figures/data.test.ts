import { describe, expect, it } from 'vitest';
import { LANGS } from '../../src/core/l10n';
import { LEAD_GROUPS } from '../../src/core/leads';
import { AP_CELL_NAME, AP_PHASE_TEXT } from '../../src/figures/data/ap';
import { ELECTRODE_IDS, ELECTRODES, icsY, LINES, MIDLINE } from '../../src/figures/data/electrodes';
import { initialTerritory, TERRITORIES, TERRITORY_IDS } from '../../src/figures/data/territories';
import { AP_CELLS } from '../../src/figures/math/ap';

describe('electrode landmarks', () => {
  const E = ELECTRODES;

  it('V1 and V2 sit in the 4th intercostal space on either side of the sternum', () => {
    expect(E.V1.x).toBeLessThan(MIDLINE);
    expect(E.V2.x).toBeGreaterThan(MIDLINE);
    expect(E.V1.y).toBeCloseTo(icsY(4, E.V1.x));
    expect(E.V2.y).toBeCloseTo(icsY(4, E.V2.x));
    expect(MIDLINE - E.V1.x).toBeCloseTo(E.V2.x - MIDLINE);
  });

  it('V4 is in the 5th intercostal space at the left midclavicular line; V3 is midway V2–V4', () => {
    expect(E.V4.x).toBe(LINES.mclL);
    expect(E.V4.y).toBeCloseTo(icsY(5, LINES.mclL));
    expect(E.V3.x).toBeCloseTo((E.V2.x + E.V4.x) / 2);
    expect(E.V3.y).toBeCloseTo((E.V2.y + E.V4.y) / 2);
    expect(E.V4.y).toBeGreaterThan(E.V2.y); // lower on the chest than V2
  });

  it('V5 (anterior axillary) and V6 (mid-axillary) are on the horizontal level of V4', () => {
    expect(E.V5.x).toBe(LINES.aalL);
    expect(E.V6.x).toBe(LINES.malL);
    expect(E.V5.y).toBe(E.V4.y);
    expect(E.V6.y).toBe(E.V4.y);
    // the intercostal space rises laterally, so V5–V6 are below the 5th space at their lines
    expect(E.V6.y).toBeGreaterThan(icsY(5, LINES.malL));
  });

  it('right-sided leads mirror V3 and V4; posterior leads share the V4–V6 level', () => {
    expect(E.V4R.x).toBe(LINES.mclR);
    expect(MIDLINE - E.V4R.x).toBeCloseTo(E.V4.x - MIDLINE);
    expect(E.V4R.y).toBe(E.V4.y);
    expect(E.V3R.x).toBeCloseTo(2 * MIDLINE - E.V3.x);
    for (const id of ['V7', 'V8', 'V9'] as const) {
      expect(E[id].view).toBe('back');
      expect(E[id].y).toBe(E.V4.y);
    }
    expect(E.V7.x).toBeLessThan(E.V8.x);
    expect(E.V8.x).toBeLessThan(E.V9.x);
  });

  it('every electrode has a landmark in zh / en / es', () => {
    for (const id of ELECTRODE_IDS) for (const lang of LANGS) expect(E[id].where[lang].length).toBeGreaterThan(3);
  });
});

describe('coronary territories', () => {
  it('lead groups agree with the shared contiguous groups', () => {
    expect(TERRITORIES.inferior.leads).toEqual(LEAD_GROUPS.inferior);
    expect(TERRITORIES.septal.leads).toEqual(LEAD_GROUPS.septal);
    expect(TERRITORIES.anterior.leads).toEqual(LEAD_GROUPS.anterior);
    expect(TERRITORIES.rv.leads).toEqual(LEAD_GROUPS.rightVentricular);
    expect(TERRITORIES.posterior.leads).toEqual(LEAD_GROUPS.posterior);
    expect(TERRITORIES.lateral.leads).toEqual([...LEAD_GROUPS.highLateral, ...LEAD_GROUPS.lowLateral]);
  });

  it('classic reciprocity: inferior ↔ I/aVL, posterior ↔ V1–V3 depression', () => {
    expect(TERRITORIES.inferior.reciprocal).toEqual(['I', 'aVL']);
    expect(TERRITORIES.posterior.reciprocal).toEqual(['V1', 'V2', 'V3']);
  });

  it('culprit arteries: LAD for anterior/septal, RCA for inferior and RV, LCx for lateral', () => {
    expect(TERRITORIES.anterior.arteries).toContain('ladMid');
    expect(TERRITORIES.septal.arteries).toContain('septal');
    expect(TERRITORIES.inferior.arteries).toContain('pda');
    expect(TERRITORIES.rv.arteries).toContain('rcaProx');
    expect(TERRITORIES.lateral.arteries).toContain('lcx');
  });

  it('all text is translated', () => {
    for (const id of TERRITORY_IDS) {
      const t = TERRITORIES[id];
      for (const lang of LANGS) {
        expect(t.name[lang].length).toBeGreaterThan(0);
        expect(t.artery[lang].length).toBeGreaterThan(0);
        expect(t.note[lang].length).toBeGreaterThan(20);
      }
    }
  });

  it('opens on the lesson\'s territory; an explicit null means nothing selected; no parameter shows an example', () => {
    expect(initialTerritory({ highlight: 'posterior' })).toBe('posterior');
    expect(initialTerritory({ highlight: null })).toBeNull();
    expect(initialTerritory({})).toBe('inferior');
    expect(initialTerritory(undefined)).toBe('inferior');
  });
});

describe('action-potential phase texts', () => {
  it('cover every cell and phase in zh / en / es', () => {
    for (const c of AP_CELLS) {
      for (const lang of LANGS) expect(AP_CELL_NAME[c][lang].length).toBeGreaterThan(0);
      for (const ph of [0, 1, 2, 3, 4] as const) for (const lang of LANGS) expect(AP_PHASE_TEXT[c][ph][lang].length).toBeGreaterThan(10);
    }
  });
});
