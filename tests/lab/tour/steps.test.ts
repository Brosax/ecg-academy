import { describe, expect, it } from 'vitest';
import type { AppCommands } from '../../../src/lab/app/commands';
import { SLICE_PRESETS } from '../../../src/lab/app/commands';
import type { Lang } from '../../../src/lab/app/store';
import { tt } from '../../../src/lab/i18n/tour';
import { StubEngine } from '../../../src/lab/sim/stub/stubEngine';
import { LEADS, STRUCTURES } from '../../../src/lab/sim/types';
import { MAX_HIGHLIGHT } from '../../../src/lab/view3d/gpuContract';
import { applyTourStep, keyMoment, pastWindowEnd, TOUR_MIN_SPEED, TOUR_TARGET_REAL_MS, tourSpeed } from '../../../src/lab/tour/player';
import { MIN_WINDOW_MS, resolveTourWindow, TOUR_STEP_IDS, TOUR_STEPS } from '../../../src/lab/tour/steps';

const LANGS: readonly Lang[] = ['zh', 'en', 'es'];

function recorder() {
  const calls: [string, unknown[]][] = [];
  const commands = new Proxy({} as AppCommands, {
    get: (_t, k) => (...args: unknown[]) => calls.push([String(k), args]),
  });
  return { commands, calls };
}

describe('tour step data', () => {
  it('has the ten steps in physiological order', () => {
    expect(TOUR_STEPS.map((s) => s.id)).toEqual([...TOUR_STEP_IDS]);
    expect(TOUR_STEPS.length).toBe(10);
  });

  it('references only valid structures, presets, leads and speeds', () => {
    for (const s of TOUR_STEPS) {
      for (const id of s.highlight) expect(STRUCTURES).toContain(id);
      expect(s.highlight.length).toBeLessThanOrEqual(MAX_HIGHLIGHT);
      expect(s.slice === 'none' || s.slice in SLICE_PRESETS).toBe(true);
      expect(LEADS).toContain(s.lead);
      expect(s.speed).toBeGreaterThanOrEqual(0.05);
      expect(s.speed).toBeLessThanOrEqual(1);
    }
  });

  it('has a title and body in every language', () => {
    for (const lang of LANGS)
      for (const s of TOUR_STEPS) {
        const title = tt.in(lang, `step.${s.id}.title`), body = tt.in(lang, `step.${s.id}.body`);
        expect(title.length).toBeGreaterThan(3);
        expect(body.length).toBeGreaterThan(lang === 'zh' ? 60 : 150);
      }
  });
});

describe('tour windows from model truth', () => {
  for (const bpm of [40, 75, 150])
    it(`are valid and chronological at ${bpm} bpm over several cycles`, () => {
      const e = new StubEngine();
      e.setHeartRate(bpm);
      const rr = 60000 / bpm;
      for (let k = 0; k < 3; k++) {
        const c = e.cycleAt(4000 + k * rr)!;
        expect(c).not.toBeNull();
        let prevT0 = -Infinity;
        for (const s of TOUR_STEPS) {
          const w = resolveTourWindow(s, c);
          expect(w, `${bpm} ${s.id}`).not.toBeNull();
          expect(w!.t1 - w!.t0).toBeGreaterThanOrEqual(MIN_WINDOW_MS);
          expect(w!.t0).toBeGreaterThanOrEqual(prevT0);
          expect(w!.t0).toBeGreaterThan(c.pOn! - 30);
          prevT0 = w!.t0;
        }
      }
    });

  it('highlights structures that the model says are active in the window (stub engine)', () => {
    const e = new StubEngine();
    const c = e.cycleAt(4000)!;
    for (const s of TOUR_STEPS) {
      if (s.id === 'plateau' || s.id === 'diastole') continue; // no wavefront: the whole myocardium is uniform
      const w = resolveTourWindow(s, c)!;
      const active = new Set(e.responsible((w.t0 + w.t1) / 2).map((r) => r.id));
      expect(s.highlight.some((id) => active.has(id)), s.id).toBe(true);
    }
  });

  it('places the QRS steps inside the QRS and the septum first', () => {
    const c = new StubEngine().cycleAt(4000)!;
    const w = (id: string) => resolveTourWindow(TOUR_STEPS.find((s) => s.id === id)!, c)!;
    expect(w('septum').t0).toBe(c.qrsOn);
    expect(w('baseRvot').t1).toBeCloseTo(c.qrsOff!, 6);
    expect(w('septum').t1).toBeLessThan(w('baseRvot').t0);
  });
});

describe('tour player', () => {
  it('drives the app only through AppCommands', () => {
    const { commands, calls } = recorder();
    const step = TOUR_STEPS.find((s) => s.id === 'septum')!;
    applyTourStep(step, { t0: 1000, t1: 1020 }, commands);
    expect(calls).toEqual([
      ['setSlice', ['shortMid']],
      ['highlight', [['SEPTUM']]],
      ['selectLead', ['V1']],
      ['setSpeed', [TOUR_MIN_SPEED]], // 20 ms window → slowed to the tour minimum so it is followable
      ['seek', [1000]],
      ['play', []],
    ]);
    const none = recorder();
    applyTourStep(TOUR_STEPS[0], { t0: 0, t1: 30 }, none.commands);
    expect(none.calls[0]).toEqual(['setSlice', [{ enabled: false }]]);
  });

  it('stops at the window end instead of snapping back (no back-and-forth between states)', () => {
    const win = { t0: 1000, t1: 1020 };
    expect(pastWindowEnd(1010, win)).toBe(false);
    expect(pastWindowEnd(1021, win)).toBe(true);
    // a manual seek before the window is not "past the end": the panel never fights the user
    expect(pastWindowEnd(500, win)).toBe(false);
    expect(keyMoment(win)).toBe(1010);
  });

  it('slows short windows so each step lasts about three seconds, never faster than the step speed', () => {
    for (const st of TOUR_STEPS) {
      for (const len of [20, 80, 400, 2000]) {
        const v = tourSpeed(st, { t0: 0, t1: len });
        expect(v).toBeGreaterThanOrEqual(TOUR_MIN_SPEED);
        expect(v).toBeLessThanOrEqual(st.speed);
        if (v > TOUR_MIN_SPEED) expect(len / v).toBeGreaterThanOrEqual(TOUR_TARGET_REAL_MS - 1e-6);
      }
    }
  });
});
