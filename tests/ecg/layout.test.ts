import { describe, expect, it } from 'vitest';
import { LAYOUTS } from '../../src/app/store';
import {
  computeSheet,
  displayLead,
  grid3x4,
  hitTest,
  limbOrder,
  mmX,
  mmY,
  mvOfY,
  panelAt,
  panelsFor,
  pxX,
  pxY,
  tOfX,
  xOfT,
  yOfMv,
  leadExtent,
  COL_GAP_MM,
  PAGE_TRACE_MM,
  READOUT_BAND_MM,
  RIGHT_MARGIN_MM,
  type Frame,
  type Sheet,
} from '../../src/ecg/layout';
import { calZoneMm } from '../../src/ecg/paper';
import { fixtureEcg, opts } from './fixtures';

const ecg10 = fixtureEcg({ durationMs: 10000 });
const ecg20 = fixtureEcg({ durationMs: 20000 });
const sig = ecg10.signal;

const leadsOf = (s: Sheet, row: number) => s.panels.filter((p) => p.row === row).map((p) => p.label);

describe('3×4 layouts', () => {
  for (const speed of [25, 50] as const) {
    it(`3x4+1 at ${speed} mm/s: four 2.5 s (or 1.25 s) columns and a rhythm strip`, () => {
      const s = computeSheet(sig, opts({ speed }));
      const cal = calZoneMm(speed);
      const colMs = speed === 25 ? 2500 : 1250;
      expect(s.rows.length).toBe(4);
      expect(leadsOf(s, 0)).toEqual(['I', 'aVR', 'V1', 'V4']);
      expect(leadsOf(s, 1)).toEqual(['II', 'aVL', 'V2', 'V5']);
      expect(leadsOf(s, 2)).toEqual(['III', 'aVF', 'V3', 'V6']);
      expect(leadsOf(s, 3)).toEqual(['II']);
      for (const p of s.panels.filter((q) => q.kind === 'cell')) {
        expect(p.t0).toBeCloseTo(p.col * colMs);
        expect(p.t1).toBeCloseTo((p.col + 1) * colMs);
        expect(p.wMm).toBeCloseTo(62.5);
        expect(p.xMm).toBeCloseTo(cal + p.col * 62.5);
        expect(p.speed).toBe(speed);
      }
      const rhythm = s.panels.find((p) => p.kind === 'rhythm');
      expect(rhythm).toBeDefined();
      expect(rhythm?.t0).toBe(0);
      expect(rhythm?.t1).toBeCloseTo(4 * colMs);
      expect(rhythm?.wMm).toBeCloseTo(PAGE_TRACE_MM);
      expect(s.widthMm).toBeCloseTo(cal + PAGE_TRACE_MM + RIGHT_MARGIN_MM);
      // one separator tick between each pair of columns in the three grid rows
      expect(s.separators.length).toBe(9);
      expect(s.separators.filter((x) => x.row === 0).map((x) => x.xMm)).toEqual([cal + 62.5, cal + 125, cal + 187.5]);
    });
  }

  it('3x4+1 rhythm strip follows props.lead', () => {
    const s = computeSheet(sig, opts({ lead: 'V1' }));
    expect(s.panels.filter((p) => p.kind === 'rhythm').map((p) => p.lead)).toEqual(['V1']);
  });

  it('3x4+3 has II, V1 and V5 rhythm strips', () => {
    const s = computeSheet(sig, opts({ layout: '3x4+3' }));
    expect(s.rows.length).toBe(6);
    expect(s.panels.filter((p) => p.kind === 'rhythm').map((p) => p.lead)).toEqual(['II', 'V1', 'V5']);
  });

  it('rows stack without overlap and baselines sit on major lines', () => {
    for (const layout of LAYOUTS) {
      const s = computeSheet(ecg20.signal, opts({ layout, brackets: true, waveLabels: true }));
      let y = 0;
      for (const r of s.rows) {
        expect(r.topMm).toBeCloseTo(y);
        expect(r.baselineMm).toBeGreaterThan(r.topMm);
        expect(r.baselineMm).toBeLessThan(r.topMm + r.hMm);
        expect(r.baselineMm % 5).toBeCloseTo(0);
        y += r.hMm;
      }
      expect(s.heightMm).toBeCloseTo(y);
      for (const p of s.panels) {
        expect(p.xMm).toBeGreaterThanOrEqual(s.calZoneMm - 1e-9);
        expect(p.xMm + p.wMm).toBeLessThanOrEqual(s.widthMm + 1e-9);
        expect(p.t1).toBeGreaterThan(p.t0);
      }
    }
  });

  it('a short record shrinks the columns; window[0] starts the sheet', () => {
    const short = fixtureEcg({ durationMs: 4000 });
    const s = computeSheet(short.signal, opts());
    expect(s.panels[0].t1 - s.panels[0].t0).toBeCloseTo(1000);
    const w = computeSheet(sig, opts({ window: [2000, 3000] }));
    expect(w.panels[0].t0).toBe(2000);
    expect(w.panels.find((p) => p.kind === 'rhythm')?.t1).toBeCloseTo(10000);
  });

  it('ST markers keep a read-out band free above the tallest wave and its label in every row', () => {
    const tall = fixtureEcg({ st: [-0.08, 0.28, 0.02] });
    for (const layout of LAYOUTS) {
      const s = computeSheet(tall.signal, opts({ layout, waveLabels: true, stMarkers: true }));
      const plain = computeSheet(tall.signal, opts({ layout, waveLabels: true }));
      expect(s.heightMm).toBeGreaterThanOrEqual(plain.heightMm);
      for (const r of s.rows) {
        let up = 0;
        for (const p of s.panels.filter((q) => q.row === r.index)) {
          const e = leadExtent(tall.signal, p.lead, p.t0, p.t1);
          up = Math.max(up, (p.invert ? -e.min : e.max) * p.gain);
        }
        // tallest wave + 4 mm of wave-label room + the band, all below the row top
        expect(r.baselineMm - r.topMm).toBeGreaterThanOrEqual(Math.min(up, 35) + 4 + READOUT_BAND_MM - 1e-9);
      }
    }
  });

  it('bracket room is reserved only under the bracket host', () => {
    const s = computeSheet(sig, opts({ brackets: true }));
    const hosts = s.panels.filter((p) => p.bracketHost);
    expect(hosts.map((p) => p.kind)).toEqual(['rhythm']);
    expect(s.rows.filter((r) => r.bracketMm > 0).map((r) => r.index)).toEqual([hosts[0].row]);
    const none = computeSheet(sig, opts({ brackets: false }));
    expect(none.panels.some((p) => p.bracketHost)).toBe(false);
  });
});

describe('6×2, 12×1, single, strip', () => {
  it('6x2: limb column + chest column over the same window', () => {
    for (const speed of [25, 50] as const) {
      const s = computeSheet(sig, opts({ layout: '6x2', speed }));
      const cal = calZoneMm(speed);
      expect(s.rows.length).toBe(6);
      const left = s.panels.filter((p) => p.col === 0).map((p) => p.lead);
      const right = s.panels.filter((p) => p.col === 1).map((p) => p.lead);
      expect(left).toEqual(['I', 'II', 'III', 'aVR', 'aVL', 'aVF']);
      expect(right).toEqual(['V1', 'V2', 'V3', 'V4', 'V5', 'V6']);
      const span = speed === 25 ? 5000 : 2500;
      for (const p of s.panels) {
        expect(p.t0).toBe(0);
        expect(p.t1).toBeCloseTo(span);
        expect(p.wMm).toBeCloseTo(125);
        expect(p.xMm).toBeCloseTo(p.col === 0 ? cal : cal + 125 + COL_GAP_MM);
      }
      expect(s.separators.length).toBe(6);
    }
  });

  it('12x1: one full-page lead per row', () => {
    const s = computeSheet(sig, opts({ layout: '12x1' }));
    expect(s.rows.length).toBe(12);
    expect(s.panels.map((p) => p.lead)).toEqual(['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']);
    for (const p of s.panels) {
      expect(p.t0).toBe(0);
      expect(p.t1).toBe(10000);
      expect(p.wMm).toBeCloseTo(250);
    }
    expect(s.separators.length).toBe(0);
  });

  it('single: one lead over the window (default whole record)', () => {
    const s = computeSheet(sig, opts({ layout: 'single', lead: 'V2' }));
    expect(s.panels.length).toBe(1);
    expect(s.panels[0]).toMatchObject({ lead: 'V2', kind: 'lead', t0: 0, t1: 10000 });
    const w = computeSheet(sig, opts({ layout: 'single', lead: 'II', window: [1200, 2400], speed: 50 }));
    expect(w.panels[0].t0).toBe(1200);
    expect(w.panels[0].t1).toBe(2400);
    expect(w.panels[0].wMm).toBeCloseTo(60);
    // inverted / out-of-range windows are repaired
    const bad = computeSheet(sig, opts({ layout: 'single', window: [12000, 9000] }));
    expect(bad.panels[0].t0).toBeGreaterThanOrEqual(0);
    expect(bad.panels[0].t1).toBeLessThanOrEqual(10000);
    expect(bad.panels[0].t1).toBeGreaterThan(bad.panels[0].t0);
  });

  it('strip: one long lead wrapping across page-wide rows', () => {
    const s = computeSheet(ecg20.signal, opts({ layout: 'strip', lead: 'II' }));
    expect(s.rows.length).toBe(2);
    expect(s.panels.map((p) => [p.t0, p.t1])).toEqual([
      [0, 10000],
      [10000, 20000],
    ]);
    const fast = computeSheet(ecg20.signal, opts({ layout: 'strip', speed: 50 }));
    expect(fast.rows.length).toBe(4);
    expect(fast.panels.every((p) => Math.abs(p.wMm - 250) < 1e-9)).toBe(true);
    const part = computeSheet(ecg20.signal, opts({ layout: 'strip', window: [3000, 15000] }));
    expect(part.panels.map((p) => [p.t0, p.t1])).toEqual([
      [3000, 13000],
      [13000, 15000],
    ]);
  });
});

describe('gain and chest half gain', () => {
  it('panel gain follows the sheet gain; chest leads halve when asked', () => {
    for (const gain of [5, 10, 20] as const) {
      const s = computeSheet(sig, opts({ gain, chestHalfGain: true }));
      for (const p of s.panels) expect(p.gain).toBe(p.chest ? gain / 2 : gain);
      // rows with limb and chest leads get the stepped calibration pulse
      expect(s.rows[0].cal).toEqual([gain, gain / 2]);
      // the II rhythm strip is limb only
      expect(s.rows[3].cal).toEqual([gain]);
      const plain = computeSheet(sig, opts({ gain }));
      expect(plain.rows.every((r) => r.cal.length === 1 && r.cal[0] === gain)).toBe(true);
    }
    const chestOnly = computeSheet(sig, opts({ layout: 'single', lead: 'V3', chestHalfGain: true }));
    expect(chestOnly.rows[0].cal).toEqual([5]);
  });
});

describe('Cabrera', () => {
  it('limb order aVL, I, −aVR, II, aVF, III with aVR inverted', () => {
    expect(limbOrder(true).map((d) => d.label)).toEqual(['aVL', 'I', '−aVR', 'II', 'aVF', 'III']);
    expect(limbOrder(false).map((d) => d.label)).toEqual(['I', 'II', 'III', 'aVR', 'aVL', 'aVF']);
    expect(limbOrder(true).filter((d) => d.invert).map((d) => d.lead)).toEqual(['aVR']);
    expect(displayLead('aVR', true)).toEqual({ lead: 'aVR', invert: true, label: '−aVR' });
    expect(displayLead('aVR', false)).toEqual({ lead: 'aVR', invert: false, label: 'aVR' });
  });

  it('3×4 grid in Cabrera order', () => {
    expect(grid3x4(true).map((r) => r.map((d) => d.label))).toEqual([
      ['aVL', 'II', 'V1', 'V4'],
      ['I', 'aVF', 'V2', 'V5'],
      ['−aVR', 'III', 'V3', 'V6'],
    ]);
    const s = computeSheet(sig, opts({ layout: '6x2', cabrera: true }));
    expect(s.panels.filter((p) => p.col === 0).map((p) => p.label)).toEqual(['aVL', 'I', '−aVR', 'II', 'aVF', 'III']);
  });

  it('−aVR draws the true aVR voltage upside down; picks still speak aVR', () => {
    const s = computeSheet(sig, opts({ cabrera: true }));
    const p = s.panels.find((q) => q.lead === 'aVR');
    expect(p).toBeDefined();
    if (!p) return;
    expect(p.invert).toBe(true);
    expect(p.label).toBe('−aVR');
    const row = s.rows[p.row];
    expect(yOfMv(row, p, 0.5)).toBeCloseTo(row.baselineMm + 5);
    expect(mvOfY(row, p, row.baselineMm + 5)).toBeCloseTo(0.5);
    const f: Frame = { pxPerMm: 4, ox: 0, oy: 0 };
    // 2.5 mm below the baseline of the inverted panel = +0.25 mV of true aVR
    const hit = hitTest(s, f, pxX(f, p.xMm + p.wMm / 2), pxY(f, row.baselineMm + 2.5));
    expect(hit?.panel.lead).toBe('aVR');
    expect(hit?.yMv).toBeCloseTo(0.25);
  });
});

describe('time / voltage ↔ sheet mapping', () => {
  it('round-trips at every speed and gain', () => {
    for (const speed of [25, 50] as const)
      for (const gain of [5, 10, 20] as const) {
        const s = computeSheet(sig, opts({ speed, gain, layout: '12x1' }));
        const p = s.panels[1];
        const row = s.rows[p.row];
        expect(xOfT(p, p.t0)).toBeCloseTo(p.xMm);
        expect(xOfT(p, p.t0 + 1000)).toBeCloseTo(p.xMm + speed);
        expect(tOfX(p, xOfT(p, 1234))).toBeCloseTo(1234);
        expect(yOfMv(row, p, 1)).toBeCloseTo(row.baselineMm - gain);
        expect(mvOfY(row, p, yOfMv(row, p, -0.37))).toBeCloseTo(-0.37);
      }
  });

  it('screen frame round-trips', () => {
    const f: Frame = { pxPerMm: 3.7, ox: 12, oy: -4 };
    expect(mmX(f, pxX(f, 42.5))).toBeCloseTo(42.5);
    expect(mmY(f, pxY(f, 17))).toBeCloseTo(17);
  });
});

describe('hit testing', () => {
  const f: Frame = { pxPerMm: 4, ox: 6, oy: 3 };
  for (const layout of LAYOUTS) {
    it(`${layout}: every panel centre hits its own lead and time`, () => {
      const s = computeSheet(ecg20.signal, opts({ layout, brackets: true }));
      for (const p of s.panels) {
        const row = s.rows[p.row];
        const h = hitTest(s, f, pxX(f, p.xMm + p.wMm / 2), pxY(f, row.baselineMm));
        expect(h?.panel.index).toBe(p.index);
        expect(h?.tMs).toBeCloseTo((p.t0 + p.t1) / 2, 6);
      }
    });
  }

  it('calibration zone and margins are not panels; slack picks the nearest', () => {
    const s = computeSheet(sig, opts());
    const row = s.rows[0];
    expect(hitTest(s, f, pxX(f, 3), pxY(f, row.baselineMm))).toBeNull();
    expect(hitTest(s, f, pxX(f, s.widthMm - 1), pxY(f, row.baselineMm))).toBeNull();
    expect(hitTest(s, f, pxX(f, 50), pxY(f, s.heightMm + 2))).toBeNull();
    expect(hitTest({ ...s }, { pxPerMm: 0, ox: 0, oy: 0 }, 10, 10)).toBeNull();
    const near = panelAt(s, s.calZoneMm - 1, row.baselineMm, 2);
    expect(near?.lead).toBe('I');
    expect(panelAt(s, s.calZoneMm - 3, row.baselineMm, 2)).toBeNull();
  });

  it('time is clamped to the panel window', () => {
    const s = computeSheet(sig, opts({ layout: 'single' }));
    const p = s.panels[0];
    const h = hitTest(s, f, pxX(f, p.xMm + p.wMm + 1), pxY(f, s.rows[0].baselineMm), 2);
    expect(h?.tMs).toBe(p.t1);
  });

  it('panelsFor finds every panel showing a lead at a time', () => {
    const s = computeSheet(sig, opts());
    expect(panelsFor(s, 'II', 1000).map((p) => p.kind)).toEqual(['cell', 'rhythm']);
    expect(panelsFor(s, 'II', 3000).map((p) => p.kind)).toEqual(['rhythm']);
    expect(panelsFor(s, 'all', 3000).length).toBe(4); // aVR, aVL, aVF cells + rhythm strip
  });
});
