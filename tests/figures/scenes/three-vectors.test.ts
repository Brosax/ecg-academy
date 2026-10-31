/**
 * Tests of the "three-vectors" scene (docs/design/f-explainers.md §4.3): strings contract, the one-source loop (mirror
 * of horizontalQrsLoop, groups summing to the loop, pen = gain × drop), the physiology facts of §4.3 (rS in V1, qR(s)
 * in V6, normal transition, the late right vector), timing (beats tile, constant pen speed at ×SLOW, continuity at
 * every boundary, complete end frame) and the placement tables. The registry / strings checks stay in tests/figures/scene/.
 */
import { describe, expect, it } from 'vitest';
import { CHEST_LEADS } from '../../../src/core/leads';
import { angleOf } from '../../../src/figures/math/geom';
import { horizontalQrsLoop, loopPoints, measureRS, PRECORDIAL_DEG, PRECORDIAL_GAIN } from '../../../src/figures/math/projection';
import { compileBeats } from '../../../src/figures/scene/timeline';
import { BEAT_IDS, en, es, tThreeVectors, zh } from '../../../src/figures/scenes/three-vectors.i18n';
import * as M from '../../../src/figures/scenes/three-vectors.math';
import { specOf } from '../scene/spec';

const TL = compileBeats(M.BEATS);
const beats = TL.beats;
const proj = (v: readonly number[], deg: number) => v[0] * Math.cos((deg * Math.PI) / 180) + v[1] * Math.sin((deg * Math.PI) / 180);
const stamp = (s: M.Source, g: M.Group) => s.stamps.find((x) => x.g === g)!;
/** The drag range: its two ends and the default. */
const RANGE = [M.MAIN_MIN, M.MAIN_DEFAULT, M.MAIN_MAX] as const;
/** Every whole degree of the drag range. */
const DEGS = Array.from({ length: M.MAIN_MAX - M.MAIN_MIN + 1 }, (_, k) => M.MAIN_MIN + k);

describe('three-vectors: strings contract', () => {
  const spec = specOf('three-vectors');

  it('BEAT_IDS are the spec beats in order and every beat has a caption in zh / en / es', () => {
    expect([...BEAT_IDS]).toEqual([...spec.beats]);
    for (const b of BEAT_IDS) {
      for (const d of [zh, en, es]) expect(d[`beat_${b}`].trim()).not.toBe('');
    }
  });

  it('the translator serves the title in every language under the namespace scene-three-vectors', () => {
    expect(tThreeVectors.ns).toBe('scene-three-vectors');
    expect(tThreeVectors.in('zh', 'title')).toBe(zh.title);
    expect(tThreeVectors.in('en', 'title')).toBe(en.title);
    expect(tThreeVectors.in('es', 'title')).toBe(es.title);
  });

  it('the late-vector wordings of the bases and row beats exist in every language and respect the narration limits', () => {
    for (const k of ['beat_bases_late', 'beat_row_late'] as const) {
      expect(en[k].length).toBeLessThanOrEqual(110);
      expect(zh[k].length).toBeLessThanOrEqual(45);
      expect(es[k].length).toBeLessThanOrEqual(130);
      for (const d of [zh, en, es]) expect(d[k].trim()).not.toBe('');
    }
  });

  it('every narration names the wave letters it teaches (the same letters the strips label)', () => {
    for (const d of [zh, en, es]) {
      expect(d.beat_septum).toMatch(/\(r\)|（r）/);
      expect(d.beat_septum).toMatch(/\(q\)|（q）/);
      expect(d.beat_bases_late).toContain('{r}');
      expect(d.beat_bases_late).toContain('{s}');
      expect(d.beat_row).toMatch(/rS.*RS.*qRs/);
    }
  });
});

describe('three-vectors: one source', () => {
  it('normalComponents mirror horizontalQrsLoop exactly (the tested horizontal model)', () => {
    for (const d of [0, 25, 40, 61, 80]) expect(loopPoints(M.normalComponents(d), 64)).toEqual(horizontalQrsLoop(d, 64));
  });

  it('the rescaled loop over u ∈ [0, 4/3] is horizontalQrsLoop sampled at the same instants (u ≤ 1)', () => {
    for (const d of [0, 40, 80]) {
      const src = M.computeSource(d, false);
      const ref = horizontalQrsLoop(d, 256); // s = j / 255; u_i = 4i / 255  →  j = 4i
      for (let i = 0; 4 * i <= 255; i++) {
        expect(src.loop[i][0]).toBeCloseTo(ref[4 * i][0], 12);
        expect(src.loop[i][1]).toBeCloseTo(ref[4 * i][1], 12);
      }
    }
  });

  it('the activation groups sum to the loop, and the tip-to-tail chain ends on the loop', () => {
    for (const late of [false, true]) {
      const src = M.computeSource(40, late);
      src.loop.forEach((v, i) => {
        let x = 0, y = 0;
        for (const g of M.GROUPS) if (src.groups[g].length) (x += src.groups[g][i][0]), (y += src.groups[g][i][1]);
        expect(Math.abs(x - v[0]) + Math.abs(y - v[1])).toBeLessThan(1e-12);
      });
      for (const u of [-0.1, 0, 0.13, 0.4, 0.55, 0.83, 1.1, M.U_SPAN]) {
        const chain = M.chainAt(src, u);
        const end = chain[chain.length - 1].to;
        const v = M.vectorAt(src, u);
        expect(Math.abs(end[0] - v[0]) + Math.abs(end[1] - v[1])).toBeLessThan(1e-12);
      }
      expect(src.stamps.map((s) => s.g)).toEqual(late ? ['septal', 'walls', 'basal', 'late'] : ['septal', 'walls', 'basal']);
    }
  });

  it('every trace is the gain-scaled projection of the loop; the pen height is gain × the drop at every instant', () => {
    for (const late of [false, true]) {
      const src = M.computeSource(40, late);
      for (const l of CHEST_LEADS) {
        src.loop.forEach((v, i) => expect(src.traces[l][i]).toBeCloseTo(proj(v, PRECORDIAL_DEG[l]) * PRECORDIAL_GAIN[l], 12));
        for (let u = M.U_LEFT - 0.05; u <= M.U_SPAN; u += 0.013) {
          expect(M.traceAt(src, l, u)).toBeCloseTo(PRECORDIAL_GAIN[l] * M.dropAt(src, l, u), 12);
          if (Math.abs(M.traceAt(src, l, u)) > 1e-12) expect(Math.sign(M.traceAt(src, l, u))).toBe(Math.sign(M.dropAt(src, l, u)));
        }
        // the pen sits exactly on the drawn polyline at every sample
        src.traces[l].forEach((v, i) => expect(M.traceAt(src, l, M.uOf(i))).toBeCloseTo(v, 12));
      }
    }
  });

  it('a drag or a toggle recomputes the source (never pre-baked)', () => {
    const a = M.computeSource(40, false), b = M.computeSource(60, false), c = M.computeSource(40, true);
    expect(b.traces.V3).not.toEqual(a.traces.V3);
    expect(c.traces.V1).not.toEqual(a.traces.V1);
  });
});

describe('three-vectors: physiology (spec §4.3, criteria.md activation-vectors)', () => {
  it('at 40°: V1 r < S (rS), V6 small q and tall R (qRs), transition normal', () => {
    const src = M.computeSource(40, false);
    const v1 = measureRS(src.traces.V1);
    expect(v1.r).toBeLessThan(v1.s);
    expect(v1.r).toBeGreaterThan(0.1 * v1.s); // a real septal r, not nothing
    expect(M.morphology(src.waves.V1)).toBe('rS');
    expect(M.morphology(src.waves.V6)).toBe('qRs');
    const [q, R] = src.waves.V6;
    expect(q.v).toBeLessThan(0);
    expect(-q.v).toBeLessThan(0.25 * R.v);
    expect(R.v).toBe(Math.max(...src.traces.V6));
    expect(src.transition.cls).toBe('normal');
    expect(M.morphology(src.waves.V3)).toBe('RS');
  });

  it('the three vectors point where the criteria say, over the whole drag range', () => {
    for (const d of [M.MAIN_MIN, 30, 40, 55, M.MAIN_MAX]) {
      const src = M.computeSource(d, false);
      const sep = stamp(src, 'septal').v, wal = stamp(src, 'walls').v, bas = stamp(src, 'basal').v;
      // septum: right (x < 0) and anterior (y < 0): toward V1, away from V6
      expect(sep[0]).toBeLessThan(0);
      expect(sep[1]).toBeLessThan(0);
      expect(proj(sep, PRECORDIAL_DEG.V1)).toBeGreaterThan(0);
      expect(proj(sep, PRECORDIAL_DEG.V6)).toBeLessThan(0);
      // free walls: left, the largest vector: away from V1, toward V6
      expect(wal[0]).toBeGreaterThan(0);
      expect(Math.hypot(...wal)).toBeGreaterThan(3 * Math.hypot(...sep));
      expect(proj(wal, PRECORDIAL_DEG.V1)).toBeLessThan(0);
      expect(proj(wal, PRECORDIAL_DEG.V6)).toBeGreaterThan(0);
      // bases: posterior and to the right of the main vector, small: away from V6
      expect(angleOf(bas[0], bas[1])).toBeCloseTo(d + 110 > 180 ? d + 110 - 360 : d + 110, 6);
      expect(proj(bas, PRECORDIAL_DEG.V6)).toBeLessThan(0);
      // every lead is rS-like in V1 and has a septal q in V6
      expect(src.waves.V1[0].v).toBeGreaterThan(0);
      expect(src.waves.V6[0].v).toBeLessThan(0);
    }
    // the default 40° is left-posterior: V6 tall R, V1 deep S
    expect(stamp(M.computeSource(40, false), 'walls').v[1]).toBeGreaterThan(0);
  });

  it('the trace returns to the baseline within the drawn span (normal and late)', () => {
    for (const late of [false, true])
      for (const d of [0, 40, 80]) {
        const src = M.computeSource(d, late);
        for (const l of CHEST_LEADS) {
          const tr = src.traces[l];
          const max = Math.max(...tr.map(Math.abs));
          expect(Math.abs(tr[tr.length - 1])).toBeLessThan(0.01 * max);
        }
      }
  });

  it('with the late right vector V1 ends positive (R′) and V6 ends negative (broad S); the normal V1 does not', () => {
    for (const d of [20, 40, 60]) {
      const src = M.computeSource(d, true);
      const w1 = src.waves.V1, w6 = src.waves.V6;
      expect(w1[w1.length - 1].v).toBeGreaterThan(0);
      expect(w1[w1.length - 1].name.toUpperCase()).toBe('R′');
      expect(w6[w6.length - 1].v).toBeLessThan(0);
      // the terminal S of V6 is broad: well over twice the normal terminal s (schematic; no ms value is drawn)
      expect(M.terminalMs(src.traces.V6, -1)).toBeGreaterThan(30);
      expect(M.terminalMs(src.traces.V6, -1)).toBeGreaterThan(2 * M.terminalMs(M.computeSource(d, false).traces.V6, -1));
    }
    const n = M.computeSource(40, false).waves.V1;
    expect(n[n.length - 1].v).toBeLessThan(0);
    expect(M.computeSource(40, true).transition.cls).toBe('normal');
  });

  it('names waves from the trace (criteria.md qrs-naming)', () => {
    expect(M.morphology(M.namedWaves([0, 0.2, 0, -1, 0]))).toBe('rS');
    expect(M.morphology(M.namedWaves([0, -0.1, 0, 1, 0, -0.2, 0]))).toBe('qRs');
    expect(M.morphology(M.namedWaves([0, 0.3, 0, -1, 0, 0.6, 0]))).toBe('rSR′');
    expect(M.morphology(M.namedWaves([0, -1, -0.5, 0]))).toBe('QS');
    expect(M.morphology(M.namedWaves([0, 1, 0.01, 1, 0, -1, 0]))).toBe('RS'); // a dip under 8 % does not split R
  });
});

describe('three-vectors: timing', () => {
  it('beats tile [0, 1] in the spec order, ≈ 7 s', () => {
    expect(beats.map((b) => b.id)).toEqual([...BEAT_IDS]);
    expect(beats[0].from).toBe(0);
    expect(beats[beats.length - 1].to).toBe(1);
    for (let k = 1; k < beats.length; k++) expect(beats[k].from).toBe(beats[k - 1].to);
    expect(TL.durationMs).toBeGreaterThanOrEqual(6500);
    expect(TL.durationMs).toBeLessThanOrEqual(7500);
  });

  it('the pens draw at a constant ×SLOW (wall-clock ms per ECG ms) inside each draw window', () => {
    for (const id of ['septum', 'walls', 'bases'] as const) {
      const [a, b, u0, u1] = M.DRAW_WINDOWS[id];
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(0.8); // room for the labels to settle before the beat ends
      expect((b - a) * M.BEAT_MS[id]).toBeCloseTo((u1 - u0) * M.MS_PER_U * M.SLOW, 9);
    }
    expect(M.DRAW_WINDOWS.septum[3]).toBe(M.DRAW_WINDOWS.walls[2]);
    expect(M.DRAW_WINDOWS.walls[3]).toBe(M.DRAW_WINDOWS.bases[2]);
    expect(M.DRAW_WINDOWS.bases[3]).toBe(M.U_SPAN);
    // the pen speed is the same in all three windows (px per wall-clock ms ∝ du / dt)
    const speeds = (['septum', 'walls', 'bases'] as const).map((id) => {
      const [a, b, u0, u1] = M.DRAW_WINDOWS[id];
      return (u1 - u0) / ((b - a) * M.BEAT_MS[id]);
    });
    for (const s of speeds) expect(s).toBeCloseTo(speeds[0], 12);
  });

  it('u is non-decreasing in p; pens wait during look and hold during row', () => {
    let last = -Infinity;
    for (let i = 0; i <= 2000; i++) {
      const f = M.frame(i / 2000, beats);
      expect(f.u).toBeGreaterThanOrEqual(last - 1e-12);
      last = f.u;
    }
    const mid = (k: number) => (beats[k].from + beats[k].to) / 2;
    expect(M.frame(mid(0), beats).u).toBe(M.U_LEFT);
    expect(M.frame(mid(0), beats).drawing).toBe(false);
    expect(M.frame(beats[1].to, beats).u).toBeCloseTo(M.U_SEPTUM_END, 12);
    expect(M.frame(beats[2].to, beats).u).toBeCloseTo(M.U_WALLS_END, 12);
    expect(M.frame(beats[3].to, beats).u).toBeCloseTo(M.U_SPAN, 12);
    expect(M.frame(mid(4), beats).u).toBe(M.U_SPAN);
    expect(M.frame(mid(4), beats).drawing).toBe(false);
  });

  it('no cuts: every frame number is continuous across every beat boundary (default state)', () => {
    const flat = (f: M.Frame) => [f.axes, f.axisLbl, f.u, f.loopHi, f.rowLbl, f.same, ...f.cells, ...M.GROUPS.map((g) => f.emph[g])];
    const EPS = 1e-12; // one-sided: the end of beat k (local 1⁻) against the start of beat k + 1 (local 0⁺)
    for (let k = 0; k < beats.length - 1; k++) {
      expect(beats[k + 1].from).toBe(beats[k].to);
      const end = M.frame(beats[k].to - EPS, beats);
      const at = M.frame(beats[k].to, beats);
      const start = M.frame(beats[k + 1].from + EPS, beats);
      const [a, b, c] = [flat(end), flat(at), flat(start)];
      a.forEach((x, j) => {
        expect(Math.abs(x - c[j]), `boundary ${k}→${k + 1}, value ${j}`).toBeLessThanOrEqual(1e-9);
        expect(Math.abs(x - b[j])).toBeLessThanOrEqual(1e-9);
      });
      expect([end.drawing, start.drawing]).toEqual([false, false]);
    }
  });

  it('the end frame (p = 1) is complete: axes, all arrows, all wave labels, the row and its labels', () => {
    const f = M.frame(1, beats);
    expect([f.axes, f.axisLbl, f.loopHi, f.rowLbl, f.same]).toEqual([1, 1, 1, 1, 1]);
    expect(f.cells).toEqual([1, 1, 1, 1]);
    for (const g of M.GROUPS) expect(f.emph[g]).toBe(1);
    expect(f.u).toBe(M.U_SPAN);
    for (const late of [false, true])
      for (const d of RANGE) {
        const src = M.computeSource(d, late);
        for (const s of src.stamps) expect(M.after(f.u, M.uOf(s.i))).toBe(1);
        for (const l of ['V1', 'V6'] as const) for (const w of src.waves[l]) expect(M.after(f.u, M.uOf(w.i))).toBe(1);
        expect(M.arcAt(src, f.u)).toBeCloseTo(1, 12);
      }
  });

  it('each end frame of beats 2–4 shows the waves its narration names', () => {
    const src = M.computeSource(40, false);
    const shown = (k: number, l: 'V1' | 'V6') => src.waves[l].filter((w) => M.after(M.frame(beats[k].to, beats).u, M.uOf(w.i)) === 1).map((w) => w.name).join('');
    expect([shown(1, 'V1'), shown(1, 'V6')]).toEqual(['r', 'q']);
    expect([shown(2, 'V1'), shown(2, 'V6')]).toEqual(['rS', 'qR']);
    expect([shown(3, 'V1'), shown(3, 'V6')]).toEqual(['rS', 'qRs']);
    // the stamped arrows: 1 after the septum, 1–2 after the walls, 1–3 after the bases
    const stamped = (k: number) => src.stamps.filter((s) => M.after(M.frame(beats[k].to, beats).u, M.uOf(s.i)) === 1).length;
    expect([stamped(0), stamped(1), stamped(2), stamped(3)]).toEqual([0, 1, 2, 3]);
  });
});

describe('three-vectors: interaction and placement', () => {
  it('the drag range is 20°…70° around the default 40°, clamped to the nearer end when the pointer goes behind', () => {
    expect([M.MAIN_MIN, M.MAIN_DEFAULT, M.MAIN_MAX]).toEqual([20, 40, 70]);
    expect(M.clampMain(55.4)).toBe(55);
    expect(M.clampMain(120)).toBe(70);
    expect(M.clampMain(-150)).toBe(70);
    expect(M.clampMain(-120)).toBe(20);
    expect(M.clampMain(0)).toBe(20);
    expect(M.clampMain(-20)).toBe(20);
  });

  it('two fixed-size tables; the two strips share x and width (one clip rect reveals both)', () => {
    const W = M.PLACEMENT_WIDE, N = M.PLACEMENT_NARROW;
    expect(W.w).toBe(760);
    expect(W.h).toBeGreaterThanOrEqual(400);
    expect(W.h).toBeLessThanOrEqual(440);
    expect(N.w).toBe(420);
    expect(N.h).toBeGreaterThanOrEqual(600);
    expect(N.h).toBeLessThanOrEqual(680);
    expect(M.placementFor(1000)).toBe(W);
    expect(M.placementFor(400)).toBe(N);
    for (const pl of [W, N]) {
      expect([pl.v1.x, pl.v1.w]).toEqual([pl.v6.x, pl.v6.w]);
      expect([pl.row.x, pl.row.w]).toEqual([pl.v1.x, pl.v1.w]);
      expect(pl.v1.y + pl.v1.h).toBeLessThan(pl.row.y);
      expect(pl.row.y + pl.row.h).toBeLessThan(pl.v6.y);
      expect(pl.v6.y + pl.v6.h).toBeLessThanOrEqual(pl.h);
      expect(pl.v1.x + pl.v1.w).toBeLessThanOrEqual(pl.w);
      const [rx, ry] = M.chestRadii(pl);
      expect(pl.ox - rx).toBeGreaterThan(10);
      expect(pl.oy - ry).toBeGreaterThan(20);
      // the traces stay inside their strips and cells over the whole drag range, late vector included
      for (const late of [false, true])
        for (const d of [0, 40, 80]) {
          const src = M.computeSource(d, late);
          for (const l of ['V1', 'V6'] as const) {
            const peak = Math.max(...src.traces[l].map(Math.abs)) * pl.amp;
            expect(peak + 16).toBeLessThan(pl.v1.h / 2); // the wave letter sits 16 px beyond the peak
          }
          for (const l of M.ROW_LEADS) {
            const tr = src.traces[l];
            expect(Math.max(...tr) * pl.cellAmp).toBeLessThan(pl.row.h * 0.48 - 16);
            expect(-Math.min(...tr) * pl.cellAmp).toBeLessThan(pl.row.h * 0.52 - 14);
          }
          // the strip x of the last sample stays inside the strip
          expect(M.stripX(pl.v1, M.U_SPAN)).toBeLessThan(pl.v1.x + pl.v1.w);
          expect(M.stripX(pl.v1, M.U_LEFT)).toBeGreaterThan(pl.v1.x);
        }
    }
  });

  it('the transition mark sits inside the V2–V5 row, over the cell where R/S crosses (normal over the drag range)', () => {
    for (const late of [false, true])
      for (const d of DEGS) {
        const t = M.computeSource(d, late).transition;
        expect(t.crossing).not.toBeNull();
        expect(t.crossing!).toBeGreaterThanOrEqual(1);
        expect(t.crossing!).toBeLessThanOrEqual(4);
        for (const pl of [M.PLACEMENT_WIDE, M.PLACEMENT_NARROW]) {
          const m = M.transitionMark(pl, t)!;
          expect(m.edge).toBe(0);
          const cw = pl.row.w / 4;
          expect(m.x).toBeCloseTo(pl.row.x + cw / 2 + (t.crossing! - 1) * cw, 9);
          expect(m.x - M.TR_HALF).toBeGreaterThanOrEqual(pl.row.x);
          expect(m.x + M.TR_HALF).toBeLessThanOrEqual(pl.row.x + pl.row.w);
        }
      }
  });

  it('an early (at 0°: R ≥ S already in V1) or late-past-V5 crossing goes to the row edge, never over V2 / V5', () => {
    const early = M.computeSource(0, false).transition;
    expect(early.crossing).toBe(0);
    const tr = (crossing: number | null) => ({ ...early, crossing });
    for (const pl of [M.PLACEMENT_WIDE, M.PLACEMENT_NARROW]) {
      for (const [c, edge] of [[early.crossing, -1], [0.5, -1], [1, 0], [4, 0], [4.5, 1], [5, 1]] as const) {
        const m = M.transitionMark(pl, tr(c))!;
        expect(m.edge).toBe(edge);
        const L = M.transitionLabel(pl, m, en.lbl_transition);
        if (edge < 0) expect([m.x, L.anchor, L.text.startsWith('←')]).toEqual([pl.row.x + M.TR_HALF, 'start', true]);
        if (edge > 0) expect([m.x, L.anchor, L.text.endsWith('→')]).toEqual([pl.row.x + pl.row.w - M.TR_HALF, 'end', true]);
      }
      expect(M.transitionMark(pl, tr(null))).toBeNull();
    }
  });

  it('the transition label never covers a cell label (zh / en / es, both tables, every degree, late on and off)', () => {
    const hit = (a: number[], b: number[]) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
    for (const d of [zh, en, es])
      for (const pl of [M.PLACEMENT_WIDE, M.PLACEMENT_NARROW])
        for (const late of [false, true])
          for (const deg of DEGS) {
            const src = M.computeSource(deg, late);
            const L = M.transitionLabel(pl, M.transitionMark(pl, src.transition)!, d.lbl_transition);
            const box = M.labelBox(L.text, L.x, L.y, L.anchor);
            expect(box[0]).toBeGreaterThanOrEqual(pl.row.x);
            expect(box[2]).toBeLessThanOrEqual(pl.row.x + pl.row.w);
            expect(box[1]).toBeGreaterThan(pl.row.y); // inside the row, below the V1 strip
            M.ROW_LEADS.forEach((l, k) => {
              const r = M.cellRect(pl, k);
              const lead = M.labelBox(l, r.x + 8, M.cellLabelY(r), 'start');
              const morph = M.labelBox(M.morphology(src.waves[l]), r.x + r.w / 2, M.cellLabelY(r), 'middle');
              expect(hit(box, lead), `${d.lbl_transition} × ${l} at ${deg}°`).toBe(false);
              expect(hit(box, morph)).toBe(false);
              expect(hit(lead, morph), `${l} name × morphology at ${deg}°`).toBe(false);
              expect(lead[3]).toBeLessThanOrEqual(r.y + r.h);
            });
          }
  });

  it('every drop foot lands on the drawn V1 / V6 axis, on both sides (both tables, every degree, late on and off)', () => {
    for (const pl of [M.PLACEMENT_WIDE, M.PLACEMENT_NARROW]) {
      const [hx, hy] = M.heartScreen(pl);
      const [rx, ry] = M.chestRadii(pl);
      for (const l of ['V1', 'V6'] as const) {
        // the negative end of the drawn axis stays inside the chest section
        const [ex, ey] = M.axisPoint(pl, l, -M.NEG_AXIS_U);
        expect(((ex - pl.ox) / rx) ** 2 + ((ey - pl.oy) / ry) ** 2).toBeLessThan(1);
        // the positive half-axis ends at the electrode
        const [sx, sy] = M.siteScreen(pl, l);
        expect(Math.hypot(sx - hx, sy - hy)).toBeCloseTo(M.posAxisU(pl, l) * pl.vlen, 9);
        for (const late of [false, true])
          for (const d of [...DEGS, 0, 80]) {
            const src = M.computeSource(d, late);
            for (let i = 0; i < M.LOOP_N; i++) {
              const x = M.dropAt(src, l, M.uOf(i));
              if (x < 0) expect(-x, `${l} at ${d}°, sample ${i}`).toBeLessThanOrEqual(M.NEG_AXIS_U);
              else expect(x).toBeLessThanOrEqual(M.posAxisU(pl, l));
            }
          }
      }
    }
    // the deepest V1 drop (≈ −1 at 60°) is the reason for the length: the old 72 px half-axis was too short
    const deepest = Math.min(...Array.from({ length: M.LOOP_N }, (_, i) => M.dropAt(M.computeSource(60, false), 'V1', M.uOf(i))));
    expect(-deepest).toBeGreaterThan(72 / M.PLACEMENT_WIDE.vlen);
    expect(-deepest).toBeLessThanOrEqual(M.NEG_AXIS_U);
  });

  it('the hit disc around the heart stays clear of the strips and the row (they still scroll the page on a phone)', () => {
    for (const pl of [M.PLACEMENT_WIDE, M.PLACEMENT_NARROW]) {
      const [hx, hy] = M.heartScreen(pl);
      const r = M.hitRadius(pl);
      for (const box of [pl.v1, pl.row, pl.v6]) {
        const nx = Math.max(box.x, Math.min(hx, box.x + box.w));
        const ny = Math.max(box.y, Math.min(hy, box.y + box.h));
        expect(Math.hypot(nx - hx, ny - hy)).toBeGreaterThan(r);
      }
      // it covers the whole drawn vector and the handle
      for (const late of [false, true])
        for (const d of RANGE) for (const v of M.computeSource(d, late).loop) expect(Math.hypot(...v) * pl.vlen + 13).toBeLessThanOrEqual(r);
    }
  });

  it('a tap away from the handle is not a drag; a press on the handle or a 6 px move is', () => {
    const h = [100, 100];
    expect(M.dragStart([110, 105], h).live).toBe(true);
    const d = M.dragStart([150, 100], h);
    expect(d.live).toBe(false);
    expect(M.dragLive(d, [153, 102])).toBe(false);
    expect(M.dragLive(d, [157, 100])).toBe(true);
  });

  it('the handle sits on arrow 2 and lands under the pointer: a pointer on the handle keeps the main angle', () => {
    for (const late of [false, true])
      for (const d of DEGS) {
        const src = M.computeSource(d, late);
        const w = stamp(src, 'walls').v;
        expect(angleOf(w[0], w[1]) + M.handleOffset(src)).toBeCloseTo(d, 9);
        expect(Math.abs(M.handleOffset(src))).toBeLessThan(5);
        expect(M.clampMain(angleOf(w[0], w[1]) + M.handleOffset(src))).toBe(d);
      }
  });

  it('the slider keys follow WAI-ARIA: up / right increase, Home / End go to the range ends', () => {
    const k = (key: string, deg: number, shiftKey = false) => M.mainKey({ key, shiftKey }, deg);
    expect([k('ArrowUp', 40), k('ArrowRight', 40), k('ArrowDown', 40), k('ArrowLeft', 40)]).toEqual([45, 45, 35, 35]);
    expect([k('ArrowUp', 40, true), k('ArrowLeft', 40, true)]).toEqual([41, 39]);
    expect([k('PageUp', 40), k('PageDown', 40)]).toEqual([50, 30]);
    expect([k('Home', 40), k('End', 40)]).toEqual([M.MAIN_MIN, M.MAIN_MAX]);
    expect([k('ArrowUp', M.MAIN_MAX), k('ArrowDown', M.MAIN_MIN)]).toEqual([M.MAIN_MAX, M.MAIN_MIN]);
    expect(k('a', 40)).toBeNull();
  });
});

describe('three-vectors: the narration is true of the drawn signal over the whole drag range', () => {
  it('septum (r in V1, q in V6), walls (S in V1, R in V6; left and back), bases (s in V6), row (rS → RS → qRs)', () => {
    for (const late of [false, true])
      for (const d of DEGS) {
        const src = M.computeSource(d, late);
        const w1 = src.waves.V1.map((w) => w.name), w6 = src.waves.V6.map((w) => w.name);
        expect([w1[0], w1[1]], `V1 at ${d}° late=${late}`).toEqual(['r', 'S']);
        expect([w6[0], w6[1]], `V6 at ${d}° late=${late}`).toEqual(['q', 'R']);
        const wal = stamp(src, 'walls').v;
        expect(wal[0]).toBeGreaterThan(0); // left
        expect(wal[1]).toBeGreaterThan(0); // back
        expect(Math.abs(wal[1])).toBeLessThan(Math.abs(wal[0]) * 3); // left before back: not a posterior vector
        if (!late) {
          expect(M.morphology(src.waves.V1), `V1 at ${d}°`).toBe('rS');
          expect(M.morphology(src.waves.V6), `V6 at ${d}°`).toBe('qRs');
          expect(M.ROW_LEADS.some((l) => M.morphology(src.waves[l]) === 'RS'), `an RS in V2–V5 at ${d}°`).toBe(true);
          expect(src.transition.cls).not.toBe('early');
        } else {
          // the late caption names V1's terminal R′ / r′ and V6's terminal S / s exactly as the strips label them
          const e = M.lateEnds(src);
          expect(e.r.toUpperCase()).toBe('R′');
          expect(e.s.toUpperCase()).toBe('S');
          expect(e).toEqual({ r: w1[w1.length - 1], s: w6[w6.length - 1] });
          for (const lang of ['zh', 'en', 'es'] as const) {
            const s = tThreeVectors.in(lang, 'beat_bases_late', e);
            expect(s).toContain(e.r);
            expect(s).not.toMatch(/\{|\}/);
          }
        }
      }
  });

  it('the screen-reader summary lists the computed morphologies and the transition', () => {
    const src = M.computeSource(40, false);
    expect(M.leadsText(src)).toBe('V1 rS, V2 rS, V3 RS, V4 Rs, V5 Rs, V6 qRs');
    expect(M.transitionText(src.transition)).toBe('V3–V4');
    const t = src.transition;
    expect(M.transitionText({ ...t, crossing: 0 })).toBe('V1');
    expect(M.transitionText({ ...t, crossing: 2 })).toBe('V3');
    expect(M.transitionText({ ...t, crossing: 5 })).toBe('V6');
    expect(M.transitionText({ ...t, crossing: null })).toBe('');
    for (const lang of ['zh', 'en', 'es'] as const) {
      const s = tThreeVectors.in(lang, 'sr_result', { leads: M.leadsText(src), tr: M.transitionText(t) });
      expect(s).toContain('V6 qRs');
      expect(s).toContain('V3–V4');
    }
  });
});
