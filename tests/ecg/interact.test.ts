import { describe, expect, it } from 'vitest';
import { computeSheet, hitTest, pxX, pxY, rowOf, xOfT, yOfMv, type Frame } from '../../src/ecg/layout';
import {
  applyKey,
  caliperHandleAt,
  caliperHomePanel,
  caliperMeasure,
  caliperNumbers,
  clampTools,
  crossNumbers,
  cursorStep,
  dragCalipers,
  initialFocus,
  layCalipers,
  reconcileCalipers,
  reconcileFocus,
  resolveTools,
  revealRect,
  rowNeighbour,
  stepFocus,
  toggleTool,
  traceValue,
  BAR_OFFSET_PX,
  NO_TOOLS,
  type KeyState,
} from '../../src/ecg/interact';
import { sampleAt } from '../../src/core/ecg';
import { fixtureEcg, opts } from './fixtures';

const ecg = fixtureEcg();
const sheet = computeSheet(ecg.signal, opts());
const f: Frame = { pxPerMm: 4, ox: 0, oy: 0 };
const none = { shift: false, ctrl: false, alt: false, meta: false };
const shift = { ...none, shift: true };
const ALL = resolveTools(undefined);

describe('tool availability and toggles', () => {
  it('undefined = all tools, false = none, partial objects respected', () => {
    expect(resolveTools(undefined)).toEqual({ calipers: true, magnifier: true, crosshair: true });
    expect(resolveTools(false)).toEqual({ calipers: false, magnifier: false, crosshair: false });
    expect(resolveTools({ calipers: true, magnifier: false })).toEqual({ calipers: true, magnifier: false, crosshair: true });
  });

  it('amplitude and march-out are caliper modes', () => {
    let s = toggleTool(NO_TOOLS, 'amplitude', ALL);
    expect(s).toMatchObject({ calipers: true, amplitude: true, march: false });
    s = toggleTool(s, 'march', ALL);
    expect(s).toMatchObject({ calipers: true, amplitude: false, march: true });
    s = toggleTool(s, 'calipers', ALL);
    expect(s).toEqual(NO_TOOLS);
    expect(toggleTool(NO_TOOLS, 'magnifier', resolveTools({ magnifier: false }))).toBe(NO_TOOLS);
    expect(clampTools({ ...NO_TOOLS, crosshair: true, calipers: true }, resolveTools({ crosshair: false }))).toEqual({ ...NO_TOOLS, calipers: true });
  });
});

describe('keyboard focus point', () => {
  it('starts at the cursor (rhythm strip first) or the middle of the first panel', () => {
    expect(initialFocus(sheet, null)).toEqual({ panel: 0, t: 1250 });
    const rhythm = sheet.panels.find((p) => p.kind === 'rhythm');
    expect(initialFocus(sheet, 3000)).toEqual({ panel: rhythm?.index, t: 3000 });
  });

  it('←/→ step one small square (Shift: one large) and continue into the next column', () => {
    expect(cursorStep(25, false)).toBe(40);
    expect(cursorStep(25, true)).toBe(200);
    expect(cursorStep(50, false)).toBe(20);
    const iCell = sheet.panels[0]; // I, 0–2.5 s
    const next = stepFocus(sheet, { panel: iCell.index, t: 2480 }, 40);
    expect(sheet.panels[next.panel].label).toBe('aVR');
    expect(next.t).toBe(2520);
    const back = stepFocus(sheet, next, -40);
    expect(sheet.panels[back.panel].label).toBe('I');
    // the record start clamps
    expect(stepFocus(sheet, { panel: 0, t: 10 }, -40)).toEqual({ panel: 0, t: 0 });
  });

  it('↑/↓ keep the time: grid cell ↔ rhythm strip, column stays', () => {
    const aVF = sheet.panels.find((p) => p.lead === 'aVF');
    expect(aVF).toBeDefined();
    if (!aVF) return;
    const down = rowNeighbour(sheet, { panel: aVF.index, t: 3000 }, 1);
    expect(down && sheet.panels[down.panel].kind).toBe('rhythm');
    expect(down?.t).toBeCloseTo(3000);
    const up = rowNeighbour(sheet, { panel: aVF.index, t: 3000 }, -1);
    expect(up && sheet.panels[up.panel].label).toBe('aVL');
    expect(rowNeighbour(sheet, { panel: 0, t: 100 }, -1)).toBeNull();
  });
});

describe('keyboard point across sheet changes', () => {
  it('stays on its lead and time, not on the panel that took its index', () => {
    const v4 = sheet.panels.find((p) => p.lead === 'V4');
    if (!v4) throw new Error('no V4');
    const f = { panel: v4.index, t: v4.t0 + 300 };
    const twelve = computeSheet(ecg.signal, opts({ layout: '12x1' }));
    const r = reconcileFocus(sheet, twelve, f);
    expect(r && twelve.panels[r.panel].lead).toBe('V4');
    expect(r?.t).toBe(f.t);
    expect(twelve.panels[v4.index].lead).not.toBe('V4'); // the old index now points at another lead
    // Cabrera keeps aVR (shown as −aVR, now in another row)
    const avr = twelve.panels.find((p) => p.lead === 'aVR');
    if (!avr) throw new Error('no aVR');
    const cab12 = computeSheet(ecg.signal, opts({ layout: '12x1', cabrera: true }));
    const ra = reconcileFocus(twelve, cab12, { panel: avr.index, t: 3000 });
    expect(ra && cab12.panels[ra.panel].label).toBe('−aVR');
    expect(ra?.panel).not.toBe(avr.index);
    // in 3×4 Cabrera, −aVR moves to the first column (0–2.5 s): a point at 2.6 s on aVR has no panel left
    const avr34 = sheet.panels.find((p) => p.lead === 'aVR');
    if (!avr34) throw new Error('no aVR cell');
    expect(reconcileFocus(sheet, computeSheet(ecg.signal, opts({ cabrera: true })), { panel: avr34.index, t: avr34.t0 + 100 })).toBeNull();
    // a rhythm-strip point stays on the rhythm strip, not on the II cell that shows the same time
    const rhythm = sheet.panels.find((p) => p.kind === 'rhythm');
    if (!rhythm) throw new Error('no rhythm strip');
    const half = computeSheet(ecg.signal, opts({ chestHalfGain: true }));
    const rr = reconcileFocus(sheet, half, { panel: rhythm.index, t: 1000 });
    expect(rr && half.panels[rr.panel].kind).toBe('rhythm');
  });

  it('is dropped when no panel of its lead shows that time', () => {
    const single = computeSheet(ecg.signal, opts({ layout: 'single', lead: 'V1', window: [0, 2000] }));
    expect(reconcileFocus(sheet, single, { panel: 0, t: 500 })).toBeNull(); // lead I is gone
    const v1 = sheet.panels.find((p) => p.lead === 'V1');
    if (!v1) throw new Error('no V1');
    expect(reconcileFocus(sheet, single, { panel: v1.index, t: 600 })).toEqual({ panel: 0, t: 600 });
    expect(reconcileFocus(sheet, single, null)).toBeNull();
  });
});

describe('applyKey', () => {
  const st0: KeyState = { tools: NO_TOOLS, cal: null, active: 2, focus: null };
  const ctx = { sheet, avail: ALL, cursor: null };

  it('arrows move the focus point, Enter selects it', () => {
    const r1 = applyKey(ctx, st0, 'ArrowRight', none);
    expect(r1.handled).toBe(true);
    expect(r1.moved).toBe(true);
    expect(r1.state.focus).toEqual({ panel: 0, t: 1290 });
    const r2 = applyKey(ctx, r1.state, 'ArrowRight', shift);
    expect(r2.state.focus?.t).toBe(1490);
    const r3 = applyKey(ctx, r2.state, 'ArrowDown', none);
    expect(sheet.panels[r3.state.focus?.panel ?? -1].label).toBe('II');
    const r4 = applyKey(ctx, r3.state, 'Enter', none);
    expect(r4.select).toEqual(r3.state.focus);
  });

  it('tool letters toggle tools; calipers get a default placement', () => {
    const c = applyKey(ctx, st0, 'c', none);
    expect(c.state.tools.calipers).toBe(true);
    expect(c.state.cal).not.toBeNull();
    expect(c.caliperChanged).toBe(true);
    const home = caliperHomePanel(sheet, null);
    expect(c.state.cal?.panel).toBe(home?.index);
    expect(home?.kind).toBe('rhythm');
    expect(applyKey(ctx, st0, 'M', none).state.tools.magnifier).toBe(true);
    expect(applyKey(ctx, st0, 'x', none).state.tools.crosshair).toBe(true);
    expect(applyKey({ ...ctx, avail: resolveTools(false) }, st0, 'c', none).handled).toBe(false);
    // browser shortcuts are left alone
    expect(applyKey(ctx, st0, 'c', { ...none, ctrl: true }).handled).toBe(false);
  });

  it('with calipers on: ←/→ nudge the active line, Space cycles it, ↑/↓ move panels', () => {
    const on = applyKey(ctx, st0, 'c', none).state;
    const cal = on.cal;
    expect(cal).not.toBeNull();
    if (!cal) return;
    // active = both: the interval is kept
    const both = applyKey(ctx, on, 'ArrowRight', none).state.cal;
    expect(both?.t0).toBe(cal.t0 + 4);
    expect(both?.t1).toBe(cal.t1 + 4);
    const a0 = applyKey(ctx, on, ' ', none).state;
    expect(a0.active).toBe(0);
    const moved = applyKey(ctx, a0, 'ArrowLeft', shift).state.cal;
    expect(moved?.t0).toBe(cal.t0 - 40);
    expect(moved?.t1).toBe(cal.t1);
    // the strip's centre (4.5–5.5 s) spans two grid columns, so the calipers stay put
    const upRes = applyKey(ctx, on, 'ArrowUp', none);
    expect(upRes.handled).toBe(true);
    expect(upRes.caliperChanged).toBeUndefined();
    expect(upRes.state.cal?.panel).toBe(cal.panel);
    // calipers inside one column move up into that grid cell, keeping their times
    const inCol = { ...on, cal: { ...cal, t0: 3000, t1: 3800 } };
    const up2 = applyKey(ctx, inCol, 'ArrowUp', none);
    expect(up2.caliperChanged).toBe(true);
    expect(sheet.panels[up2.state.cal?.panel ?? -1].label).toBe('aVF');
    expect(up2.state.cal?.t0).toBeCloseTo(3000);
    expect(up2.state.cal?.t1).toBeCloseTo(3800);
  });

  it('amplitude mode: ↑/↓ nudge the voltage lines', () => {
    const on = applyKey(ctx, st0, 'a', none).state;
    expect(on.tools.amplitude).toBe(true);
    const up = applyKey(ctx, on, 'ArrowUp', none).state.cal;
    expect(up?.mv0).toBeCloseTo((on.cal?.mv0 ?? 0) + 0.01);
    expect(up?.mv1).toBeCloseTo((on.cal?.mv1 ?? 0) + 0.01);
    const coarse = applyKey(ctx, on, 'ArrowDown', shift).state.cal;
    expect(coarse?.mv0).toBeCloseTo((on.cal?.mv0 ?? 0) - 0.1);
  });

  it('Esc clears tools first, then the focus point, then lets the key through', () => {
    const on = applyKey(ctx, { ...st0, focus: { panel: 0, t: 100 } }, 'c', none).state;
    const e1 = applyKey(ctx, on, 'Escape', none);
    expect(e1.state.tools).toEqual(NO_TOOLS);
    expect(e1.state.cal).toBeNull();
    expect(e1.state.focus).not.toBeNull();
    const e2 = applyKey(ctx, e1.state, 'Escape', none);
    expect(e2.state.focus).toBeNull();
    expect(applyKey(ctx, e2.state, 'Escape', none).handled).toBe(false);
  });
});

describe('calipers by pointer', () => {
  const p = sheet.panels.find((q) => q.kind === 'rhythm');
  if (!p) throw new Error('no rhythm strip');
  const row = rowOf(sheet, p);
  const cal = { panel: p.index, t0: 1000, t1: 1800, mv0: 0, mv1: 1 };
  const xA = pxX(f, xOfT(p, 1000)), xB = pxX(f, xOfT(p, 1800));
  const yMid = pxY(f, row.baselineMm);

  it('finds lines and the bar (time mode)', () => {
    expect(caliperHandleAt(sheet, f, cal, 'time', xA + 2, yMid)).toBe(0);
    expect(caliperHandleAt(sheet, f, cal, 'time', xB - 3, yMid)).toBe(1);
    expect(caliperHandleAt(sheet, f, cal, 'time', (xA + xB) / 2, pxY(f, row.topMm) + BAR_OFFSET_PX)).toBe(2);
    expect(caliperHandleAt(sheet, f, cal, 'time', (xA + xB) / 2, yMid)).toBe(-1);
    // another row is not the calipers' panel
    expect(caliperHandleAt(sheet, f, cal, 'time', xA, pxY(f, sheet.rows[0].baselineMm))).toBe(-1);
  });

  it('finds lines (amplitude mode)', () => {
    const y0 = pxY(f, yOfMv(row, p, 0)), y1 = pxY(f, yOfMv(row, p, 1));
    expect(caliperHandleAt(sheet, f, cal, 'amplitude', xA, y0 + 1)).toBe(0);
    expect(caliperHandleAt(sheet, f, cal, 'amplitude', xA, y1 - 1)).toBe(1);
  });

  it('dragging a line follows the pointer; the bar moves both', () => {
    const one = dragCalipers(sheet, f, cal, 'time', 1, xB, yMid, xB + 4 * 4, yMid); // +4 mm = +160 ms
    expect(one.t0).toBe(1000);
    expect(one.t1).toBeCloseTo(1960);
    const bar = dragCalipers(sheet, f, cal, 'time', 2, xA + 10, 0, xA + 10 - 2 * 4, 0); // −2 mm = −80 ms
    expect(bar.t0).toBeCloseTo(920);
    expect(bar.t1).toBeCloseTo(1720);
    const amp = dragCalipers(sheet, f, cal, 'amplitude', 0, xA, yMid, xA, yMid - 5 * 4); // up 5 mm = +0.5 mV
    expect(amp.mv0).toBeCloseTo(0.5);
    expect(amp.mv1).toBe(1);
  });

  it('dragging across a panel lays new calipers', () => {
    const c = layCalipers(sheet, f, p, 'time', null, xA, yMid, xB, yMid);
    expect(c.t0).toBeCloseTo(1000);
    expect(c.t1).toBeCloseTo(1800);
    const m = caliperMeasure(sheet, c, 'time');
    expect(m).toEqual({ lead: 'II', t0: c.t0, t1: c.t1, dtMs: c.t1 - c.t0 });
    const a = layCalipers(sheet, f, p, 'amplitude', c, xA, yMid, xA, yMid - 20);
    expect(a.mv1 - a.mv0).toBeCloseTo(0.5);
    expect(caliperMeasure(sheet, a, 'amplitude')).toMatchObject({ mv0: a.mv0, mv1: a.mv1 });
  });

  it('read-out numbers', () => {
    expect(caliperNumbers('en', sheet, cal, 'time').values).toEqual(['800', '20.0', '75']);
    expect(caliperNumbers('es', sheet, cal, 'amplitude').values).toEqual(['1,00', '10,0']);
    expect(crossNumbers('en', 1234.4, 0.5)).toEqual(['1234', '+0.50']);
  });

  it('calipers follow their lead across layout changes', () => {
    const twelve = computeSheet(ecg.signal, opts({ layout: '12x1' }));
    const r = reconcileCalipers(twelve, cal, 'II');
    expect(r && twelve.panels[r.panel].lead).toBe('II');
    expect(r?.t0).toBe(1000);
    expect(reconcileCalipers(twelve, null, null)).toBeNull();
  });

  it('calipers whose lines were dragged past each other still follow their lead', () => {
    const v5 = sheet.panels.find((p) => p.lead === 'V5' && p.kind === 'cell');
    if (!v5) throw new Error('no V5 cell');
    const crossed = { panel: v5.index, t0: v5.t0 + 900, t1: v5.t0 + 300, mv0: 0, mv1: 1 };
    const twelve = computeSheet(ecg.signal, opts({ layout: '12x1' }));
    const r = reconcileCalipers(twelve, crossed, 'V5');
    expect(r && twelve.panels[r.panel].lead).toBe('V5');
    expect([r?.t0, r?.t1]).toEqual([crossed.t0, crossed.t1]);
  });
});

describe('pick hit-testing', () => {
  it('a click reports the true lead, the time and the trace value there', () => {
    const cab = computeSheet(ecg.signal, opts({ cabrera: true }));
    const p = cab.panels.find((q) => q.label === '−aVR');
    expect(p).toBeDefined();
    if (!p) return;
    const t = (p.t0 + p.t1) / 2;
    const hit = hitTest(cab, f, pxX(f, xOfT(p, t)), pxY(f, rowOf(cab, p).baselineMm));
    expect(hit?.panel.lead).toBe('aVR');
    expect(hit?.tMs).toBeCloseTo(t);
    const mv = traceValue(ecg.signal, p, t);
    expect(mv).toBeCloseTo(sampleAt(ecg.signal.leads.aVR, ecg.signal.fs, t), 9);
  });
});

describe('re-homing calipers and keeping the keyboard point in view', () => {
  it('calipers whose times no panel shows fall back to a default placement, keeping the voltage lines', () => {
    const short = computeSheet(ecg.signal, opts({ layout: 'single', window: [0, 2000] }));
    const r = reconcileCalipers(short, { panel: 12, t0: 6000, t1: 6800, mv0: 0.2, mv1: 1.4 }, 'II');
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.panel).toBe(0);
    expect(r.t0).toBeGreaterThanOrEqual(0);
    expect(r.t1).toBeLessThanOrEqual(2000);
    expect([r.mv0, r.mv1]).toEqual([0.2, 1.4]);
  });

  it('revealRect: a margin around the point, clamped to the paper', () => {
    expect(revealRect(500, 200, 1200, 800)).toEqual({ left: 476, top: 176, width: 48, height: 48 });
    expect(revealRect(5, 790, 1200, 800)).toEqual({ left: 0, top: 766, width: 29, height: 34 });
    expect(revealRect(-50, 900, 1200, 800, 10)).toEqual({ left: 0, top: 790, width: 10, height: 10 });
  });
});
