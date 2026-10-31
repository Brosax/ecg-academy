/**
 * Tests of the "moving-paper" scene (docs/design/f-explainers.md §4.6): the strings contract, the plan built from the
 * block's own ECG (seed 412, the f4 worked example's heart), the paper geometry (∫ speed, pulse invariants at every
 * interpolated speed and gain), continuity at every beat boundary, and the end frame.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { Ecg } from '../../../src/core/ecg';
import { calibrationPulse, mmFromMv } from '../../../src/figures/math/paper';
import { beatTarget, compileBeats } from '../../../src/figures/scene/timeline';
import { BEAT_IDS, en, es, tMovingPaper, zh } from '../../../src/figures/scenes/moving-paper.i18n';
import * as M from '../../../src/figures/scenes/moving-paper.math';
import { generate } from '../../../src/synth/index';
import { specOf } from '../scene/spec';

describe('moving-paper: strings contract', () => {
  const spec = specOf('moving-paper');

  it('BEAT_IDS are the spec beats in order and every beat has a caption in zh / en / es', () => {
    expect([...BEAT_IDS]).toEqual([...spec.beats]);
    for (const b of BEAT_IDS) {
      for (const d of [zh, en, es]) expect(d[`beat_${b}`].trim()).not.toBe('');
    }
  });

  it('the translator serves the title in every language under the namespace scene-moving-paper', () => {
    expect(tMovingPaper.ns).toBe('scene-moving-paper');
    expect(tMovingPaper.in('zh', 'title')).toBe(zh.title);
    expect(tMovingPaper.in('en', 'title')).toBe(en.title);
    expect(tMovingPaper.in('es', 'title')).toBe(es.title);
  });

  it('every key exists in all three languages with the same placeholders; the narration stays short', () => {
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const k of Object.keys(zh) as (keyof typeof zh)[]) {
      for (const d of [en, es]) {
        expect(d[k]?.trim(), k).toBeTruthy();
        expect(ph(d[k]), k).toEqual(ph(zh[k]));
      }
    }
    for (const b of BEAT_IDS) {
      expect(en[`beat_${b}`].length).toBeLessThanOrEqual(110);
      expect(zh[`beat_${b}`].length).toBeLessThanOrEqual(45);
      expect(es[`beat_${b}`].length).toBeLessThanOrEqual(130);
    }
  });

  it('formats the in-picture arithmetic in every language (Spanish lpm, Chinese 次/分)', () => {
    expect(tMovingPaper.in('en', 'lbl_rr', { n: 4, sq: 200, ms: 800 })).toBe('4 × 200 ms = 800 ms');
    expect(tMovingPaper.in('es', 'lbl_rate', { k: 300, n: 4, bpm: 75 })).toBe('300 ÷ 4 = 75 lpm');
    expect(tMovingPaper.in('zh', 'lbl_rate', { k: 300, n: 4, bpm: 75 })).toContain('次/分');
  });
});

describe('moving-paper: geometry of the paper (pure)', () => {
  it('the smoothstep integral is exact (numerical check) and continuous at the ramp ends', () => {
    const a = 100, b = 190;
    let acc = 0;
    const dt = 0.01;
    for (let i = 0; i < 30000; i++) acc += M.step((i + 0.5) * dt, a, b) * dt;
    expect(M.stepIntegral(300, a, b)).toBeCloseTo(acc, 4);
    expect(M.stepIntegral(b - 1e-9, a, b)).toBeCloseTo(M.stepIntegral(b + 1e-9, a, b), 6);
    expect(M.stepIntegral(b, a, b)).toBeCloseTo((b - a) / 2, 9);
  });

  it('blend moves continuously from intermediate weights and keeps them convex', () => {
    const mid = M.blend(M.TOUR.sw, [0, 0, 1], 0.4);
    const again = M.blend(mid, [0, 1, 0], 0);
    expect(again).toEqual(mid);
    for (const f of [0, 0.3, 1]) expect(M.blend(mid, [0, 1, 0], f).reduce((s, w) => s + w, 0)).toBeCloseTo(1, 12);
  });
});

describe('moving-paper: the block ECG (syn normal 412, rate 75, hrv 0)', () => {
  let ecg: Ecg;
  let plan: M.Plan;
  beforeAll(() => {
    ecg = generate({ scenario: 'normal', seed: 412, dials: { rate: 75, hrv: 0 } }).ecg;
    const p = M.planFor(ecg.truth!.beats, ecg.signal.leads.II, ecg.signal.fs, ecg.signal.durationMs);
    expect(p).not.toBeNull();
    plan = p!;
  });

  it('RR of the worked example is 800 ms (±15) and the rate ≈ 75 /min; every bracket of the tour agrees', () => {
    const t = ecg.truth!;
    expect(t.hrBpm).toBeGreaterThan(73);
    expect(t.hrBpm).toBeLessThan(77);
    const q = t.beats.map((b) => b.qrsOn);
    for (let k = 1; k < q.length; k++) expect(Math.abs(q[k] - q[k - 1] - 800)).toBeLessThanOrEqual(15);
    for (const rr of plan.rrMs) {
      expect(Math.abs(rr - 800)).toBeLessThanOrEqual(15);
      expect(M.rrShown(rr)).toBe(800);
      expect(Math.round(M.rrLabel(rr, 25).bpm)).toBe(75);
    }
    // 300 ÷ 4 at 25 mm/s, 600 ÷ 8 at 50 mm/s: the same rate
    const a = M.rrLabel(plan.rrMs[0], 25), b = M.rrLabel(plan.rrMs[1], 50);
    expect(Math.round(a.n)).toBe(4);
    expect(a.k).toBe(300);
    expect(Math.round(b.n)).toBe(8);
    expect(b.sq).toBe(100);
    expect(b.k / Math.round(b.n)).toBe(75);
  });

  it('the plan is ordered: pulses sit between waves, ramps never overlap a pulse, beats tile the window', () => {
    const b = plan.bounds;
    expect(b.length).toBe(BEAT_IDS.length + 1);
    for (let k = 1; k < b.length; k++) expect(b[k]).toBeGreaterThan(b[k - 1]);
    expect(b[0]).toBe(plan.t0);
    expect(b[b.length - 1]).toBe(plan.t1);
    const beats = ecg.truth!.beats;
    for (const q of plan.pulses.slice(1)) {
      expect(q.off - q.on).toBe(M.PULSE_MS);
      // inside a TP segment: after the previous T, before the next P
      const prev = beats.filter((x) => x.tOff <= q.on).pop()!;
      const next = beats.find((x) => (x.pOn ?? x.qrsOn) >= q.off)!;
      expect(prev).toBeDefined();
      expect(next.pOn! - q.off).toBeGreaterThanOrEqual(5);
    }
    for (const r of [plan.accel, plan.decel, plan.gainDown, plan.gainUp])
      for (const q of plan.pulses) expect(r.off <= q.on || r.on >= q.off).toBe(true);
    // the tour state of each pulse: standard, 50 mm/s, 5 mm/mV, standard again (calibrates the last beat)
    const st = plan.pulses.map((_, k) => M.pulseOf(plan, M.TOUR, k));
    expect(st.map((x) => [x.v, x.g])).toEqual([[25, 10], [50, 10], [25, 5], [25, 10]]);
    expect(st.map((x) => [x.widthMm, x.heightMm])).toEqual([[5, 10], [10, 10], [5, 5], [5, 10]]);
    // the gain is back to 10 mm/mV before pulse 4, and pulse 4 sits between B5 and B6
    expect(plan.gainUp.off).toBeLessThan(plan.pulses[3].on);
    expect(plan.pulses[3].on).toBeGreaterThan(plan.r[4]);
    expect(plan.pulses[3].off).toBeLessThan(plan.qrs[5].on);
    // the speed ramp sits in B2's TP (after T, before pulse 2; at most the last 40 ms of T on a short TP)
    const b2 = beats.find((x) => x.qrsOn === plan.qrs[1].on)!;
    expect(plan.accel.on).toBeGreaterThanOrEqual(b2.tOff - 40);
    expect(plan.accel.off).toBeLessThan(plan.pulses[1].on);
  });

  it('the tour brackets: R1–R2 spans 4 large squares at 25 mm/s, R3–R4 spans 8 at 50 mm/s, R5–R6 spans 4 again', () => {
    const X = (t: number) => M.paperX(plan, M.TOUR, t);
    expect((X(plan.r[1]) - X(plan.r[0])) / 5).toBeCloseTo(4, 1);
    expect((X(plan.r[3]) - X(plan.r[2])) / 5).toBeCloseTo(8, 1);
    expect((X(plan.r[5]) - X(plan.r[4])) / 5).toBeCloseTo(4, 1);
    // the ruler: 25 mm of paper is 1 s, and the paper origin (input connected) is a heavy grid line
    expect(X(plan.conn)).toBe(0);
    expect(X(plan.rulerEnd)).toBeCloseTo(25, 9);
    // R height halves at 5 mm/mV, then returns
    const h = (k: number) => M.inkMm(plan, M.TOUR, plan.r[k]);
    expect(h(4) / h(5)).toBeCloseTo(0.5 * (M.inputMv(plan, plan.r[4]) / M.inputMv(plan, plan.r[5])), 6);
  });

  it('at every interpolated speed: pulse width × speed = 200 ms; at every gain: pulse height ÷ gain = 1 mV', () => {
    for (let f = 0; f <= 1 + 1e-9; f += 0.05) {
      for (const sTo of [[0, 1, 0], [0, 0, 1]]) {
        for (const gTo of [[0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]) {
          const s: M.Scale = { sw: M.blend(M.TOUR.sw, sTo, f), gw: M.blend(M.TOUR.gw, gTo, f) };
          for (let k = 0; k < 4; k++) {
            const q = plan.pulses[k];
            const pu = M.pulseOf(plan, s, k);
            const width = M.paperX(plan, s, q.off) - M.paperX(plan, s, q.on);
            expect((width / pu.v) * 1000).toBeCloseTo(200, 6);
            expect(width).toBeCloseTo(calibrationPulse(pu.v, pu.g).widthMm, 6);
            // the drawn step is exactly the 1 mV pulse at the gain of that moment
            const mid = (q.on + q.off) / 2;
            const step = M.inkMm(plan, s, mid) - mmFromMv(M.inputMv(plan, mid), M.gainAt(plan, s, mid));
            expect(step / pu.g).toBeCloseTo(1, 9);
            expect(pu.heightMm / pu.g).toBeCloseTo(1, 12);
          }
        }
      }
    }
  });

  it('ink never moves backwards: X is increasing for every scale; the ink path stays a light trace', () => {
    const scales: M.Scale[] = [M.TOUR, M.scaleOf(50, 20), M.scaleOf(25, 5), { sw: [0.5, 0, 0.5], gw: [0.5, 0.5, 0, 0] }];
    for (const s of scales) {
      let last = -Infinity;
      for (let t = plan.t0; t <= plan.t1; t += 5) {
        const x = M.paperX(plan, s, t);
        expect(x).toBeGreaterThan(last);
        last = x;
      }
      const d = M.inkPath(plan, s, M.WIDE.base);
      const n = (d.match(/[ML]/g) ?? []).length;
      expect(n).toBeGreaterThan(100);
      expect(n).toBeLessThan(1400);
    }
  });

  describe('frames', () => {
    let beats: ReturnType<typeof compileBeats<M.BeatId>>['beats'];
    beforeAll(() => {
      beats = compileBeats(M.beatDefs(plan), { window: [plan.t0, plan.t1] }).beats;
    });

    it('beats tile [0, 1] in spec order and map to the plan boundaries (p linear in record time)', () => {
      expect(beats.map((b) => b.id)).toEqual([...BEAT_IDS]);
      expect(beats[0].from).toBe(0);
      expect(beats[beats.length - 1].to).toBe(1);
      for (let k = 0; k < beats.length; k++) {
        if (k) expect(beats[k].from).toBe(beats[k - 1].to);
        expect(M.frame(beats[k].to, plan, M.TOUR, M.WIDE).t).toBeCloseTo(plan.bounds[k + 1], 6);
      }
    });

    it('continuity: the frame just before each boundary equals the frame just after (≤ 1e-3 mm, both layouts)', () => {
      for (const lay of [M.WIDE, M.NARROW]) {
        for (let k = 0; k < beats.length - 1; k++) {
          const at = beats[k].to;
          const a = M.frameNumbers(M.frame(at - 1e-9, plan, M.TOUR, lay));
          const b = M.frameNumbers(M.frame(at + 1e-9, plan, M.TOUR, lay));
          const c = M.frameNumbers(M.frame(beats[k + 1].from, plan, M.TOUR, lay));
          expect(a.length).toBe(b.length);
          for (let i = 0; i < a.length; i++) {
            expect(Math.abs(a[i] - b[i])).toBeLessThanOrEqual(1e-3);
            expect(Math.abs(M.frameNumbers(M.frame(at, plan, M.TOUR, lay))[i] - c[i])).toBeLessThanOrEqual(1e-9);
          }
        }
      }
    });

    it('nothing jumps along the whole tour: the paper moves monotonically left, the pen stays on the paper', () => {
      let shift = Infinity;
      for (let p = 0; p <= 1; p += 0.002) {
        const f = M.frame(p, plan, M.TOUR, M.WIDE);
        expect(f.shift).toBeLessThan(shift + 1e-9);
        shift = f.shift;
        expect(f.penY).toBeGreaterThanOrEqual(M.WIDE.pt);
        expect(f.penY).toBeLessThanOrEqual(M.WIDE.pb);
      }
    });

    it('receipts: the count equals the pulses that passed the pen, and all four are home at p = 1', () => {
      for (const p of [0, 0.05, 0.3, 0.6, 0.9, 1]) {
        const f = M.frame(p, plan, M.TOUR, M.WIDE);
        expect(f.receipts.filter((r) => r.fly > 0).length).toBe(f.passed);
        expect(f.passed).toBe(M.receiptsPassed(plan, f.t));
      }
      const end = M.frame(1, plan, M.TOUR, M.WIDE);
      expect(end.passed).toBe(4);
      expect(end.receipts.map((r) => r.fly)).toEqual([1, 1, 1, 1]);
      expect(end.receipts.map((r) => r.k)).toEqual([M.RECEIPT_SCALE, M.RECEIPT_SCALE, M.RECEIPT_SCALE, M.RECEIPT_SCALE]);
      expect(end.receipts.map((r) => [r.v, r.g])).toEqual([[25, 10], [50, 10], [25, 5], [25, 10]]);
      // the fourth (standard) copy lands exactly on receipt 1: the confirmation stamp
      expect(end.receipts[3].x).toBeCloseTo(end.receipts[0].x, 9);
      expect(end.receipts[3].y).toBeCloseTo(end.receipts[0].y, 9);
      // at the end of beat 1 the first receipt is already home
      expect(M.frame(beats[0].to, plan, M.TOUR, M.WIDE).receipts[0].fly).toBe(1);
    });

    it('end frames are complete: each beat end holds its labels; p = 1 holds the last bracket, the QRS and the half-gain beat', () => {
      const at = (k: number) => M.frame(beats[k].to, plan, M.TOUR, M.WIDE);
      expect(at(1).rulerO).toEqual([1, 1, 1]);
      expect(at(2).rr[0].o).toBe(1);
      expect(at(2).rr[0].lo).toBe(1);
      expect(at(2).qrs[0].o).toBe(1);
      expect(at(3).rr[1].o).toBe(1);
      expect(at(3).rr[1].lo).toBe(1);
      expect(Math.round(at(3).rr[1].label.n)).toBe(8);
      const end = M.frame(1, plan, M.TOUR, M.WIDE);
      expect(end.rr[2].o).toBe(1);
      expect(end.rr[2].lo).toBe(1);
      expect(end.rr[2].x2).toBeCloseTo(M.paperX(plan, M.TOUR, plan.r[5]), 9);
      expect(Math.round(end.rr[2].label.n)).toBe(4);
      expect(end.qrs[1].o).toBe(1);
      expect(end.qrs[1].ms).toBeCloseTo(ecg.truth!.beats.find((b) => b.qrsOn === plan.qrs[5].on)!.qrsOff - plan.qrs[5].on, 9);
      expect(end.halfO).toBe(1);
      expect([end.v, end.g]).toEqual([25, 10]);
      // the visible paper (left of the pen) holds the 5 mm/mV pulse, the half-gain R, the standard pulse and the standard R
      const left = (x: number) => end.shift + x;
      for (const lay of [M.WIDE, M.NARROW]) {
        const e = M.frame(1, plan, M.TOUR, lay);
        const vis = (x: number) => e.shift + x >= 0 && e.shift + x <= lay.pen;
        expect(vis(e.receipts[2].px)).toBe(true);
        expect(vis(e.receipts[3].px)).toBe(true);
        expect(vis(e.receipts[3].px + e.receipts[3].widthMm)).toBe(true);
        expect([e.receipts[3].g, e.receipts[3].heightMm, e.receipts[3].dimO]).toEqual([10, 10, 1]);
        // the last bracket clears pulse 4 and its height label; the earlier brackets are gone
        const b = e.rr[2];
        expect(b.wDown).toBe(0);
        expect(b.tick0).toBeLessThan(lay.base - e.receipts[3].heightMm - 0.7 - 0.75 * lay.fs);
        expect(Math.min(b.y1, b.y2) - 0.75 * lay.fs).toBeGreaterThanOrEqual(lay.pt);
        expect([e.rr[0].o, e.rr[1].o, e.qrs[0].o]).toEqual([0, 0, 0]);
        expect(vis(M.paperX(plan, M.TOUR, plan.r[4]))).toBe(true);
        expect(vis(M.paperX(plan, M.TOUR, plan.r[5]))).toBe(true);
      }
      expect(left(end.rr[0].x1)).toBeLessThan(0);
      // the 50 mm/s bracket fits on the narrow paper at the end of its beat
      const n3 = M.frame(beats[3].to, plan, M.TOUR, M.NARROW);
      expect(n3.shift + n3.rr[1].x1).toBeGreaterThanOrEqual(0);
    });

    it('a toggle re-draws the whole record: at 50 mm/s every RR spans 8 squares and the ms label stays the same', () => {
      const s = M.scaleOf(50, 'tour');
      const f = M.frame(1, plan, s, M.WIDE);
      for (const b of f.rr) {
        expect(Math.round(b.label.n)).toBe(8);
        expect(M.rrShown(b.label.ms)).toBe(800);
      }
      expect(f.receipts.map((r) => r.widthMm)).toEqual([10, 10, 10, 10]);
      const g = M.frame(1, plan, M.scaleOf('tour', 20), M.WIDE);
      expect(g.receipts.map((r) => r.heightMm)).toEqual([20, 20, 20, 20]);
      // the bracket goes where it fits: never above the paper band, never below it
      for (const lay of [M.WIDE, M.NARROW]) {
        for (const b of M.frame(1, plan, M.scaleOf('tour', 20), lay).rr) {
          expect([0, 1]).toContain(b.wDown);
          expect(Math.min(b.y1, b.y2) - 0.75 * lay.fs).toBeGreaterThanOrEqual(lay.pt - 1e-9);
          expect(Math.max(b.y1, b.y2) + 0.25 * lay.fs).toBeLessThanOrEqual(lay.pb + 1e-9);
        }
      }
    });

    it('a gain morph never cuts: the bracket placement is continuous in the blend factor (both layouts)', () => {
      const corners = [M.TOUR, M.scaleOf('tour', 5), M.scaleOf('tour', 10), M.scaleOf('tour', 20)];
      for (const lay of [M.WIDE, M.NARROW]) {
        for (const from of corners) {
          for (const to of corners) {
            if (from === to) continue;
            for (const p of [0.33, 0.63, 1]) {
              let prev: number[] | null = null;
              for (let f = 0; f <= 1 + 1e-9; f += 0.01) {
                const s: M.Scale = { sw: from.sw, gw: M.blend(from.gw, to.gw, f) };
                const fr = M.frame(p, plan, s, lay);
                const cur = fr.rr.flatMap((b) => [b.lineY, b.y1, b.y2, b.tick0, b.tick1, b.wDown]);
                if (prev) for (let i = 0; i < cur.length; i++) expect(Math.abs(cur[i] - prev[i]), `${lay.id} p=${p} f=${f.toFixed(2)} #${i}`).toBeLessThan(0.6);
                prev = cur;
                for (const b of fr.rr) expect(Math.min(b.y1, b.y2) - 0.75 * lay.fs).toBeGreaterThanOrEqual(lay.pt - 1e-9);
              }
            }
          }
        }
      }
    });

    it('the pulse height label fits on the paper at every gain, both layouts', () => {
      for (const lay of [M.WIDE, M.NARROW]) {
        for (const g of [5, 10, 20] as const) {
          const f = M.frame(1, plan, M.scaleOf('tour', g), lay);
          for (const r of f.receipts) {
            expect(lay.base - r.heightMm - 0.7 - 0.75 * lay.fs).toBeGreaterThanOrEqual(lay.pt);
            expect(lay.base + 2.4 + 0.25 * lay.fs).toBeLessThanOrEqual(lay.pb);
          }
        }
      }
    });

    it('the arithmetic can be read during the tour: the rr beat and every bracket label last >= 1.5 s of wall time', () => {
      const wall = (ms: number) => ms * M.SLOW;
      const timeAt = (p: number) => plan.t0 + (plan.t1 - plan.t0) * p;
      const rrBeat = beats[BEAT_IDS.indexOf('rr')];
      expect(wall(timeAt(rrBeat.to) - timeAt(rrBeat.from))).toBeGreaterThanOrEqual(1500);
      // record ms during which each label is at full opacity (1 ms steps over the tour)
      const full = [0, 0, 0, 0];
      for (let t = plan.t0; t <= plan.t1; t += 1) {
        const f = M.frame((t - plan.t0) / (plan.t1 - plan.t0), plan, M.TOUR, M.WIDE);
        f.rr.forEach((b, k) => {
          if (b.lo === 1 && b.o === 1) full[k]++;
        });
        if (f.qrs[0].o === 1) full[3]++;
      }
      expect(wall(full[0])).toBeGreaterThanOrEqual(1500);
      expect(wall(full[1])).toBeGreaterThanOrEqual(1500);
      expect(wall(full[3])).toBeGreaterThanOrEqual(1500);
      // the last bracket holds on the end frame
      expect(M.frame(1, plan, M.TOUR, M.WIDE).rr[2].lo).toBe(1);
    });

    it('prev / next reach every beat end: next x4 from 0 visits ends 1-4, prev from 1 walks back to 0', () => {
      const n = beats.length;
      let p = 0;
      let i = M.navIndex(beats, p);
      expect(i).toBe(0);
      for (let k = 1; k < n; k++) {
        p = beatTarget(beats, i + 1, 'end');
        i = M.navIndex(beats, p);
        expect(p).toBe(beats[k].to);
        expect(i).toBe(k);
      }
      expect(i).toBe(n - 1); // next is disabled at the last beat
      for (let k = n - 2; k >= 0; k--) {
        p = beatTarget(beats, i - 1, 'end');
        i = M.navIndex(beats, p);
        expect(p).toBe(beats[k].to);
        expect(i).toBe(k);
      }
      // inside a beat the index is that beat; playBeat(k) holds on beats[k].to, shown as beat k
      expect(M.navIndex(beats, (beats[2].from + beats[2].to) / 2)).toBe(2);
      expect(M.navIndex(beats, 1)).toBe(n - 1);
    });
  });
});

describe('moving-paper: the tour fits ordinary sinus records', () => {
  it('planFor finds a tour from 55 to 85 /min, with and without rate variability', () => {
    for (const [rate, hrv] of [[55, 0], [65, 0], [80, 0], [85, 0], [75, 1]] as const) {
      const ecg = generate({ scenario: 'normal', seed: 412, dials: { rate, hrv } }).ecg;
      expect(M.planFor(ecg.truth!.beats, ecg.signal.leads.II, ecg.signal.fs, ecg.signal.durationMs), `${rate}/${hrv}`).not.toBeNull();
    }
  });
});

describe('moving-paper: grid extent', () => {
  it('covers the visible paper at every p for the widest scale and starts on a heavy line', () => {
    const ecg = generate({ scenario: 'normal', seed: 412, dials: { rate: 75, hrv: 0 } }).ecg;
    const plan = M.planFor(ecg.truth!.beats, ecg.signal.leads.II, ecg.signal.fs, ecg.signal.durationMs)!;
    for (const lay of [M.WIDE, M.NARROW]) {
      const [a, b] = M.gridExtent(plan, lay);
      expect(Math.abs(a % 5)).toBe(0);
      for (const s of [M.TOUR, M.scaleOf(50, 'tour'), M.scaleOf(25, 'tour')]) {
        for (const p of [0, 0.5, 1]) {
          const f = M.frame(p, plan, s, lay);
          expect(a).toBeLessThanOrEqual(-f.shift);
          expect(b).toBeGreaterThanOrEqual(lay.w - f.shift);
        }
      }
    }
  });
});
