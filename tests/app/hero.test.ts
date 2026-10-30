/**
 * The home hero (src/app/hero.ts): a reproducible normal 12-lead from the real synthetic engine, and the measurements
 * it reveals agree with the model truth and lie inside the normal limits the course teaches (docs/curriculum/criteria.md:
 * rate 60–100 /min (hero dials), PR 120–200 ms, QRS < 120 ms, QTc (Fridericia) < 450 ms, axis −30° … +90°).
 */
import { describe, expect, it } from 'vitest';
import { generate } from '../../src/synth';
import { heroDay, heroFacts, heroPaperHeight, heroRequest, HERO_SCENARIO, signedDeg, type HeroLayout } from '../../src/app/hero';
// viewer internals, used only to check that the hero's sheet fits its card (the page imports src/ecg/index.tsx)
import { computeSheet } from '../../src/ecg/layout';
import { paperBox } from '../../src/ecg/paper';

describe('home hero ECG', () => {
  it('formats the local calendar date', () => {
    expect(heroDay(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(heroDay(new Date(2026, 9, 22))).toBe('2026-10-22');
  });

  it('is reproducible from the day and the example counter', () => {
    expect(heroRequest('2026-10-22', 0)).toEqual(heroRequest('2026-10-22', 0));
    expect(heroRequest('2026-10-22', 0).seed).not.toBe(heroRequest('2026-10-22', 1).seed);
    expect(heroRequest('2026-10-22', 0).scenario).toBe(HERO_SCENARIO);
  });

  it('writes axes the way a report does', () => {
    expect(signedDeg(60)).toBe('+60°');
    expect(signedDeg(-30)).toBe('−30°');
    expect(signedDeg(0)).toBe('0°');
  });

  for (const [day, n] of [
    ['2026-10-22', 0],
    ['2026-10-22', 1],
    ['2026-10-23', 0],
    ['2027-02-14', 3],
  ] as const) {
    it(`${day} #${n}: a normal sinus 12-lead whose revealed values are normal`, () => {
      const r = generate(heroRequest(day, n));
      const t = r.ecg.truth;
      expect(t).not.toBeNull();
      if (!t) return;
      expect(r.ecg.origin.kind).toBe('synthetic');
      expect(t.rhythm).toBe('sinus-rhythm');
      expect(t.findings).toContain('normal-ecg');
      expect(r.ecg.regions).not.toBeNull();
      const f = heroFacts(t);
      expect(f.rateBpm).toBeGreaterThanOrEqual(60);
      expect(f.rateBpm).toBeLessThanOrEqual(100);
      expect(f.prMs).not.toBeNull();
      expect(f.prMs!).toBeGreaterThanOrEqual(120);
      expect(f.prMs!).toBeLessThanOrEqual(200);
      expect(f.qrsMs).toBeLessThan(120);
      expect(f.qtcMs).toBeLessThan(450);
      expect(f.axisDeg).toBeGreaterThanOrEqual(-30);
      expect(f.axisDeg).toBeLessThanOrEqual(90);
      // the read-out matches the viewer's interval brackets (whole ms); the axis is reported to 5°
      expect(f.qrsMs).toBe(Math.round(t.qrsMs));
      expect(f.qtMs).toBe(Math.round(t.qtMs));
      expect(Math.abs(f.axisDeg - t.axisDeg.qrs)).toBeLessThanOrEqual(2.5);
    });
  }

  it('the whole sheet fits the card at every width, with and without labels (no sideways scrolling)', () => {
    const days = Array.from({ length: 24 }, (_, i) => [`2027-03-${String(i + 1).padStart(2, '0')}`, i % 4] as const);
    for (const [day, n] of days) {
      const sig = generate(heroRequest(day, n)).ecg.signal;
      for (const layout of ['3x4+1', '6x2'] as const satisfies readonly HeroLayout[]) {
        for (const labels of [false, true]) {
          const sheet = computeSheet(sig, { layout, speed: 25, gain: 10, chestHalfGain: false, cabrera: false, lead: 'II', window: null, brackets: labels, waveLabels: labels, stMarkers: false });
          for (const width of [300, 332, 480, 526, 566, 611, 900]) {
            const h = heroPaperHeight(width, layout, labels);
            const box = paperBox(sheet.widthMm, sheet.heightMm, h, null);
            expect(box.minWidth ?? 0, `${day}#${n} ${layout} labels=${labels} width=${width}`).toBeLessThanOrEqual(width);
            // and it is not drawn needlessly small: at least 75 % of the card width is used
            expect(sheet.widthMm * Math.min(2.2, h / sheet.heightMm), `${day}#${n} ${layout} ${labels} ${width}`).toBeGreaterThanOrEqual(0.75 * Math.min(width, 2.2 * sheet.widthMm));
          }
        }
      }
    }
  });
});
