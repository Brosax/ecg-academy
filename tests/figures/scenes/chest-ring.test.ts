/**
 * Tests of the "chest-ring" scene (docs/design/f-explainers.md §4.5). Owned by the scene author: the strings contract,
 * the beats tiling, continuity frame(to_k) = frame(from_k+1), end-frame completeness, the moving lead
 * (precordialAt / chestArcPoint) and the physiology facts of §4.5 (transition classes, R/(R+S) progression).
 */
import { describe, expect, it } from 'vitest';
import { CHEST_LEADS } from '../../../src/core/leads';
import { HEART_CENTER, PRECORDIAL_DEG, PRECORDIAL_GAIN, PRECORDIAL_SITES, rsTransition } from '../../../src/figures/math/projection';
import { BEAT_IDS, en, es, tChestRing, zh } from '../../../src/figures/scenes/chest-ring.i18n';
import {
  ALL_WHERE,
  BEAT_RANGES,
  BEATS,
  CELL_GROUP,
  cellGeom,
  cellPaths,
  cellPoint,
  dropOnAxis,
  insetAxes,
  LIMB_GROUP,
  loopMeanDeg,
  mainForMean,
  meanOfLoop,
  NEG_LEN,
  perpDeg,
  PILL,
  TICK,
  REVEAL_TO_DEG,
  revealFrom,
  axisGeom,
  junction,
  VLEN,
  penPoint,
  placementFor,
  REVEAL_TURN_DEG,
  rsLevels,
  straddling,
  whereOf,
  chestArcPoint,
  computeSource,
  flatten,
  frame,
  markerAt,
  markerScreen,
  movingTrace,
  NARROW,
  precordialAt,
  SITES_MAX,
  transitionCell,
  WIDE,
  type Placement,
} from '../../../src/figures/scenes/chest-ring.math';
import { compileBeats } from '../../../src/figures/scene/timeline';
import { specOf } from '../scene/spec';

describe('chest-ring: strings contract', () => {
  const spec = specOf('chest-ring');

  it('BEAT_IDS are the spec beats in order and every beat has a caption in zh / en / es', () => {
    expect([...BEAT_IDS]).toEqual([...spec.beats]);
    for (const b of BEAT_IDS) {
      for (const d of [zh, en, es]) expect(d[`beat_${b}`].trim()).not.toBe('');
    }
  });

  it('the translator serves the title in every language under the namespace scene-chest-ring', () => {
    expect(tChestRing.ns).toBe('scene-chest-ring');
    expect(tChestRing.in('zh', 'title')).toBe(zh.title);
    expect(tChestRing.in('en', 'title')).toBe(en.title);
    expect(tChestRing.in('es', 'title')).toBe(es.title);
  });

  it('every label the picture draws exists in the three languages, Spain Spanish and Chinese terms', () => {
    const keys = ['lbl_wct', 'lbl_junction', 'lbl_wct_ref', 'lbl_formula', 'lbl_closer', 'lbl_gain', 'lbl_transition', 'lbl_none', 'lbl_cls_early', 'lbl_cls_normal', 'lbl_cls_late', 'lbl_vector', 'lbl_septal', 'lbl_anterior', 'lbl_lateral', 'lbl_inferior', 'lbl_highLateral', 'lbl_frontal', 'lbl_equal', 'ctl_cell', 'ctl_drag', 'pq_early', 'pq_late'];
    for (const k of keys) for (const d of [zh, en, es]) expect((d as Record<string, string>)[k]?.trim(), k).toBeTruthy();
    expect(Object.values(es).join('\n')).toMatch(/derivaci[oó]n/);
    expect(Object.values(es).join('\n')).toMatch(/terminal central de Wilson/);
    expect(Object.values(zh).join('\n')).toMatch(/中心电端/);
    expect(zh.lbl_transition).toContain('{where}');
    expect(en.lbl_transition).toContain('{where}');
    expect(es.lbl_transition).toContain('{where}');
    // the WCT formula and the Predict chips carry the drawn numbers / leads in every language
    for (const d of [zh, en, es]) {
      expect(d.lbl_wct).toContain('(RA + LA + LL)/3');
      expect(d.lbl_wct).toContain('≈ 0');
      expect(d.pq_early).toContain('V1–V2');
      expect(d.pq_late).toContain('V5–V6');
      expect(d.beat_transition).toContain('V3–V4');
    }
    expect(tChestRing.in('es', 'lbl_transition', { where: 'V3–V4' })).toBe('transición V3–V4');
  });
});

describe('chest-ring: beats', () => {
  it('tile [0, 1] in spec order, ≈ 8–9 s, and BEAT_RANGES agrees with compileBeats', () => {
    expect(BEATS.map((b) => b.id)).toEqual([...BEAT_IDS]);
    const total = BEATS.reduce((s, b) => s + b.ms, 0);
    expect(total).toBeGreaterThanOrEqual(7500);
    expect(total).toBeLessThanOrEqual(9000);
    const tl = compileBeats(BEATS);
    for (const b of tl.beats) {
      expect(BEAT_RANGES[b.id][0]).toBeCloseTo(b.from, 12);
      expect(BEAT_RANGES[b.id][1]).toBeCloseTo(b.to, 12);
    }
    expect(BEAT_RANGES.wct[0]).toBe(0);
    expect(BEAT_RANGES.groups[1]).toBe(1);
  });
});

describe('chest-ring: frame(p)', () => {
  const state = { mainDeg: 40 };

  it('is continuous at every beat boundary (no cuts) and monotone where it should be', () => {
    const tl = compileBeats(BEATS);
    for (let k = 0; k + 1 < tl.beats.length; k++) {
      const a = flatten(frame(tl.beats[k].to - 1e-9, state));
      const b = flatten(frame(tl.beats[k + 1].from + 1e-9, state));
      a.forEach((v, i) => expect(Math.abs(v - b[i]), `boundary ${k} component ${i}`).toBeLessThan(1e-6));
    }
    // no jumps anywhere along the timeline
    let prev = flatten(frame(0, state));
    for (let i = 1; i <= 2000; i++) {
      const cur = flatten(frame(i / 2000, state));
      cur.forEach((v, j) => expect(Math.abs(v - prev[j]), `p=${i / 2000} component ${j}`).toBeLessThan(0.05));
      prev = cur;
    }
    // the electrode only moves forward, cells only reveal
    let s = 0;
    const cells = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i <= 1000; i++) {
      const f = frame(i / 1000, state);
      expect(f.s).toBeGreaterThanOrEqual(s - 1e-9);
      s = f.s;
      f.cells.forEach((c, j) => {
        expect(c).toBeGreaterThanOrEqual(cells[j] - 1e-9);
        cells[j] = c;
      });
    }
  });

  it('starts empty and ends complete: wires, WCT, electrode at V6, all six cells drawn, transition and groups on', () => {
    const f0 = frame(0, state);
    expect(f0.wires).toBe(0);
    expect(f0.electrode).toBe(0);
    expect(f0.cells).toEqual([0, 0, 0, 0, 0, 0]);
    expect(f0.groups).toBe(0);
    const f1 = frame(1, state);
    expect(f1.wires).toBe(1);
    expect(f1.wct).toBe(1);
    expect(f1.electrode).toBe(1);
    expect(f1.s).toBe(SITES_MAX);
    expect(f1.axis).toBe(1);
    expect(f1.vector).toBe(1);
    expect(f1.cells).toEqual([1, 1, 1, 1, 1, 1]);
    expect(f1.drawing).toBe(-1);
    expect(f1.transition).toBe(1);
    expect(f1.groups).toBe(1);
    expect(f1.deg).toBe(40);
  });

  it('every beat end is complete on its own (what prev / next and reduced motion show)', () => {
    const fWct = frame(BEAT_RANGES.wct[1], state);
    expect(fWct.wires).toBe(1);
    expect(fWct.wct).toBe(1);
    expect(fWct.electrode).toBe(0);
    const fOne = frame(BEAT_RANGES.one[1], state);
    expect(fOne.electrode).toBe(1);
    expect(fOne.s).toBe(0);
    expect(fOne.cells[0]).toBe(1);
    expect(fOne.cells[1]).toBe(0);
    const fWalk = frame(BEAT_RANGES.walk[1], state);
    expect(fWalk.s).toBe(SITES_MAX);
    expect(fWalk.cells).toEqual([1, 1, 1, 1, 1, 1]);
    expect(fWalk.transition).toBe(0);
    const fTr = frame(BEAT_RANGES.transition[1], state);
    expect(fTr.transition).toBe(1);
    expect(fTr.groups).toBe(0);
  });

  it('the visible pen never jumps: it draws a cell, then flies to the next one while the electrode glides', () => {
    const src = computeSource(40);
    for (const pl of [WIDE, NARROW]) {
      const [a, b] = BEAT_RANGES.walk;
      const [a1] = BEAT_RANGES.one;
      let prev = penPoint(pl, src, frame(a1 + (a - a1) * 0.5, state));
      for (let i = 1; i <= 3000; i++) {
        const p = a1 + (a - a1) * 0.5 + ((b - (a1 + (a - a1) * 0.5)) * i) / 3000;
        const cur = penPoint(pl, src, frame(p, state));
        expect(Math.hypot(cur[0] - prev[0], cur[1] - prev[1]), `p=${p}`).toBeLessThan(6);
        prev = cur;
      }
      expect(penPoint(pl, src, frame(b, state))).toEqual(cellPoint(pl, src, SITES_MAX, 1));
    }
  });

  it('walks the electrode V1 → V6 pausing at each site while that cell draws', () => {
    const [a, b] = BEAT_RANGES.walk;
    for (let k = 1; k <= SITES_MAX; k++) {
      // the moment leg k−1 ends its glide: electrode exactly at site k, cell k not yet drawn
      const pGlideEnd = a + ((b - a) * (k - 1 + 0.5)) / SITES_MAX;
      const f = frame(pGlideEnd, state);
      expect(f.s).toBeCloseTo(k, 9);
      expect(f.cells[k]).toBeCloseTo(0, 9);
      // mid-pause: still at site k, cell k half drawn, the pen on that cell
      const pMid = a + ((b - a) * (k - 1 + 0.75)) / SITES_MAX;
      const g = frame(pMid, state);
      expect(g.s).toBeCloseTo(k, 9);
      expect(g.cells[k]).toBeCloseTo(0.5, 9);
      expect(g.drawing).toBe(k);
      expect(g.pen).toBeCloseTo(0.5, 9);
    }
  });

  it('a Predict reveal turns the loop 40° → 95° inside the transition beat and holds it afterwards', () => {
    const st = { mainDeg: 40, reveal: revealFrom(40) };
    expect(st.reveal).toEqual({ from: 40, to: 95 });
    expect(frame(BEAT_RANGES.walk[1], st).deg).toBe(40);
    const mid = frame((BEAT_RANGES.transition[0] + BEAT_RANGES.transition[1]) / 2, st).deg;
    expect(mid).toBeGreaterThan(40);
    expect(mid).toBeLessThan(95);
    expect(frame(BEAT_RANGES.transition[1], st).deg).toBe(95);
    expect(frame(1, st).deg).toBe(95);
    // the reveal turns the short way round from any start
    expect(revealFrom(-170).to + 170).toBeCloseTo(-95, 9);
  });
});

describe('chest-ring: the moving lead (precordialAt / chestArcPoint)', () => {
  it('equals the fixed site, PRECORDIAL_DEG and PRECORDIAL_GAIN at every integer s', () => {
    CHEST_LEADS.forEach((l, k) => {
      expect(chestArcPoint(k)).toEqual(PRECORDIAL_SITES[l]);
      const m = precordialAt(k);
      expect(m.deg).toBeCloseTo(PRECORDIAL_DEG[l], 9);
      expect(m.gain).toBeCloseTo(PRECORDIAL_GAIN[l], 9);
      expect(m.site).toEqual(PRECORDIAL_SITES[l]);
    });
  });

  it('stays on the anterior chest wall between the sites', () => {
    for (let i = 0; i <= 500; i++) {
      const [x, y] = chestArcPoint((i / 500) * SITES_MAX);
      expect(y).toBeLessThan(0);
      expect((x / 150) ** 2 + (y / 105) ** 2).toBeCloseTo(1, 6);
    }
  });

  it('angle and gain are continuous; the angle grows monotonically V1 → V6; the gain peaks near V3–V4', () => {
    const N = 1000;
    let prev = precordialAt(0);
    let best = 0;
    let bestS = 0;
    for (let i = 1; i <= N; i++) {
      const s = (i / N) * SITES_MAX;
      const m = precordialAt(s);
      expect(m.deg).toBeGreaterThan(prev.deg);
      expect(Math.abs(m.deg - prev.deg)).toBeLessThan(1.5);
      expect(Math.abs(m.gain - prev.gain)).toBeLessThan(0.02);
      if (m.gain > best) {
        best = m.gain;
        bestS = s;
      }
      prev = m;
    }
    // closer = larger: one maximum between V3 and V4, monotone on either side
    expect(bestS).toBeGreaterThanOrEqual(2);
    expect(bestS).toBeLessThanOrEqual(3);
    for (let i = 1; i <= N; i++) {
      const s0 = ((i - 1) / N) * SITES_MAX;
      const s1 = (i / N) * SITES_MAX;
      const d = precordialAt(s1).gain - precordialAt(s0).gain;
      if (s1 <= bestS) expect(d).toBeGreaterThanOrEqual(-1e-12);
      else expect(d).toBeLessThanOrEqual(1e-12);
    }
    expect(precordialAt(0).deg).toBeLessThan(-100);
    expect(precordialAt(SITES_MAX).deg).toBeGreaterThan(-10);
  });

  it('the moving electrode records exactly the fixed cell at each site (one source)', () => {
    const src = computeSource(40);
    CHEST_LEADS.forEach((_, k) => {
      const mv = movingTrace(src.loop, k);
      mv.forEach((v, i) => expect(v).toBeCloseTo(src.traces[k][i], 9));
    });
  });
});

describe('chest-ring: physiology (criteria.md precordial-progression)', () => {
  it('transition normal (V3–V4) at 40°, late (clockwise) at 75°, early (counter-clockwise) at 5°', () => {
    const n = computeSource(40);
    expect(n.transition.cls).toBe('normal');
    expect(transitionCell(n.transition)).toBeGreaterThanOrEqual(2);
    expect(transitionCell(n.transition)).toBeLessThanOrEqual(3);
    expect(computeSource(75).transition.cls).toBe('late');
    expect(computeSource(5).transition.cls).toBe('early');
    expect(rsTransition(computeSource(75).rs).cls).toBe('late');
  });

  it('R/(R+S) rises monotonically V1 → V6 at 40°; V1 is rS and V6 is dominantly positive', () => {
    const { transition, rs } = computeSource(40);
    for (let i = 1; i < transition.ratios.length; i++) expect(transition.ratios[i]).toBeGreaterThan(transition.ratios[i - 1]);
    expect(rs[0].r).toBeLessThan(rs[0].s);
    expect(rs[5].r).toBeGreaterThan(rs[5].s);
  });

  it('the Predict reveal moves the transition marker to the left side of the ring (late)', () => {
    const a = computeSource(40).transition;
    const rv = computeSource(REVEAL_TO_DEG);
    const b = rv.transition;
    expect(REVEAL_TURN_DEG).toBe(55);
    expect(REVEAL_TO_DEG).toBe(95);
    const ca = a.crossing ?? SITES_MAX;
    const cb = b.crossing ?? SITES_MAX;
    expect(cb).toBeGreaterThan(ca + 1);
    expect(cb).toBeGreaterThan(3.85);
    expect(cb).toBeLessThan(4);
    expect(b.cls).toBe('late');
    expect(transitionCell(b)).toBe(4); // R overtakes S only at V5 (pq_ok / pq_wrong say so)
    expect(whereOf(b)).toBe('V4–V5'); // R = S just before V5
    // the drawn mean vector turns from about 14° to about 77°
    expect(rv.meanDeg).toBeGreaterThan(74);
    expect(rv.meanDeg).toBeLessThan(80);
    // the marker walks continuously as the vector turns (the reveal re-projects the one loop every frame)
    let prev = computeSource(40).transition.crossing!;
    for (let d = 40.5; d <= REVEAL_TO_DEG; d += 0.5) {
      const c = computeSource(d).transition.crossing!;
      expect(c).toBeGreaterThanOrEqual(prev - 1e-9);
      expect(c - prev).toBeLessThan(0.1);
      prev = c;
    }
  });

  it('names the R = S point by the two leads that straddle it (V3–V4 at 40°), V1 when early in V1, none when never', () => {
    const n = computeSource(40).transition;
    expect(straddling(n)).toEqual([2, 3]);
    expect(whereOf(n)).toBe('V3–V4');
    expect(transitionCell(n)).toBe(3);
    expect(whereOf(computeSource(75).transition)).toBe('V4–V5');
    expect(whereOf(computeSource(-10).transition)).toBe('V1');
    const never = rsTransition([0, 1, 2, 3, 4, 5].map(() => ({ r: 0.1, s: 0.9, net: -1 })));
    expect(straddling(never)).toEqual([]);
    expect(whereOf(never)).toBeNull();
    for (const d of [-60, -10, 5, 20, 40, 60, 75, 90, 120]) {
      const w = whereOf(computeSource(d).transition);
      if (w) expect(ALL_WHERE).toContain(w);
    }
    // R < S on the left cell of the pair, R ≥ S on the right one
    const src = computeSource(40);
    expect(src.rs[2].r).toBeLessThan(src.rs[2].s);
    expect(src.rs[3].r).toBeGreaterThanOrEqual(src.rs[3].s);
  });

  it('the arrow is the loop mean: the sum of the loop points, about 14° at the default; mainForMean inverts it', () => {
    const src = computeSource(40);
    let x = 0;
    let y = 0;
    for (const [a, b] of src.loop) {
      x += a;
      y += b;
    }
    expect(src.meanDeg).toBeCloseTo((Math.atan2(y, x) * 180) / Math.PI, 9);
    expect(src.meanDeg).toBe(meanOfLoop(src.loop));
    expect(src.meanDeg).toBeGreaterThan(10);
    expect(src.meanDeg).toBeLessThan(18);
    for (let t = -180; t <= 180; t += 7) {
      const m = mainForMean(t);
      const back = loopMeanDeg(m);
      expect(Math.abs(((back - t + 540) % 360) - 180), `target ${t}`).toBeLessThan(1e-6);
      // the main component leads the mean by 13°–28°
      expect(m - t).toBeGreaterThan(10);
      expect(m - t).toBeLessThan(30);
    }
    // monotone: one mean per loop parameter
    let prev = loopMeanDeg(-180);
    for (let d = -179; d <= 180; d++) {
      const cur = loopMeanDeg(d);
      expect(((cur - prev + 540) % 360) - 180).toBeGreaterThan(0);
      prev = cur;
    }
  });

  it('R = S where the lead axis is perpendicular to the mean vector (within 12° wherever the crossing is interior)', () => {
    for (let d = 10; d <= 100; d += 2.5) {
      const src = computeSource(d);
      const c = src.transition.crossing!;
      expect(c).toBeGreaterThan(0);
      expect(c).toBeLessThan(SITES_MAX);
      const lead = precordialAt(c).deg;
      expect(Math.abs(((lead - perpDeg(src.meanDeg) + 540) % 360) - 180), `mainDeg ${d}`).toBeLessThan(12);
    }
    // the default is within a few degrees, the reveal target within about 10°
    for (const [d, tol] of [
      [40, 4],
      [REVEAL_TO_DEG, 11],
    ] as const) {
      const src = computeSource(d);
      const lead = precordialAt(src.transition.crossing!).deg;
      expect(Math.abs(((lead - perpDeg(src.meanDeg) + 540) % 360) - 180)).toBeLessThan(tol);
    }
    // the dashed perpendicular is drawn on the anterior side (where the chest leads are)
    for (let m = -180; m <= 180; m += 15) expect(Math.sin((perpDeg(m) * Math.PI) / 180)).toBeLessThanOrEqual(1e-12);
  });

  it('every drop lands on a drawn axis: the negative halves are longer than the deepest projection', () => {
    let deepest = 0;
    let tallest = 0;
    for (let d = -180; d < 180; d += 5) {
      const { loop } = computeSource(d);
      for (const [x, y] of loop)
        for (const l of CHEST_LEADS) {
          const a = (PRECORDIAL_DEG[l] * Math.PI) / 180;
          const v = x * Math.cos(a) + y * Math.sin(a);
          deepest = Math.max(deepest, -v);
          tallest = Math.max(tallest, v);
        }
    }
    expect(NEG_LEN).toBeGreaterThanOrEqual(deepest * VLEN);
    // the positive half runs to the electrode; a foot past it stays inside the electrode dot (5 units on screen)
    for (const pl of [WIDE, NARROW]) {
      const [jx, jy] = junction(pl);
      for (let k = 0; k < 6; k++) {
        const g = axisGeom(pl, k);
        expect(Math.hypot(g.neg[0] - jx, g.neg[1] - jy)).toBeCloseTo(NEG_LEN * pl.scale, 9);
        expect(tallest * VLEN * pl.scale).toBeLessThanOrEqual(Math.hypot(g.site[0] - jx, g.site[1] - jy) + 5);
      }
    }
  });

  it('the cell traces are exactly the one-source projections (path through every sample, common scale)', () => {
    const src = computeSource(40);
    for (const pl of [WIDE, NARROW]) {
      const paths = cellPaths(pl, src);
      expect(paths).toHaveLength(6);
      paths.forEach((d, k) => {
        expect(d.split('L')).toHaveLength(src.traces[k].length);
        const g = cellGeom(pl, k, src.maxAmp);
        const lv = rsLevels(pl, src, k);
        expect(lv.base - lv.r).toBeCloseTo(src.rs[k].r * g.scale, 9);
        expect(lv.s - lv.base).toBeCloseTo(src.rs[k].s * g.scale, 9);
        // every trace stays inside its cell
        for (const v of src.traces[k]) expect(Math.abs(v * g.scale)).toBeLessThanOrEqual(pl.cellH / 2 - 7 + 1e-9);
      });
    }
  });

  it('the drop on the moving axis is the projection the cell records (before the gain)', () => {
    const src = computeSource(40);
    for (const s of [0, 1.5, 3, 5]) {
      const m = precordialAt(s);
      const tr = movingTrace(src.loop, s);
      for (const i of [10, 30, 40]) {
        const u = i / (src.loop.length - 1);
        const d = dropOnAxis(WIDE, src.loop, u, m.deg);
        expect(d.v * m.gain).toBeCloseTo(tr[i], 9);
      }
    }
  });

  it('cells are tinted septal / anterior / lateral in pairs; the inset tints II, III, aVF inferior and I, aVL high lateral', () => {
    expect(CELL_GROUP).toEqual(['septal', 'septal', 'anterior', 'anterior', 'lateral', 'lateral']);
    expect(LIMB_GROUP).toEqual({ I: 'highLateral', II: 'inferior', III: 'inferior', aVR: 'none', aVL: 'highLateral', aVF: 'inferior' });
    const ax = insetAxes(WIDE);
    const ii = ax.find((a) => a.lead === 'II')!;
    // II at +60°: down and to the patient's left on screen
    expect(ii.end[0]).toBeGreaterThan(WIDE.inset[0]);
    expect(ii.end[1]).toBeGreaterThan(WIDE.inset[1]);
    const avl = ax.find((a) => a.lead === 'aVL')!;
    expect(avl.end[1]).toBeLessThan(WIDE.inset[1]);
  });
});

describe('chest-ring: placement', () => {
  const noOverlap = (pl: Placement) => {
    for (let i = 0; i < 6; i++)
      for (let j = i + 1; j < 6; j++) {
        const dx = Math.abs(pl.cells[i][0] - pl.cells[j][0]);
        const dy = Math.abs(pl.cells[i][1] - pl.cells[j][1]);
        expect(dx >= pl.cellW + 4 || dy >= pl.cellH + 4, `cells ${i} and ${j} overlap`).toBe(true);
      }
    for (const [x, y] of pl.cells) {
      expect(x - pl.cellW / 2).toBeGreaterThanOrEqual(0);
      expect(x + pl.cellW / 2).toBeLessThanOrEqual(pl.w);
      expect(y - pl.cellH / 2).toBeGreaterThanOrEqual(0);
      expect(y + pl.cellH / 2).toBeLessThanOrEqual(pl.h);
    }
  };

  it('six cells inside the frame without overlap in both tables; cells clear the section', () => {
    noOverlap(WIDE);
    noOverlap(NARROW);
    for (const pl of [WIDE, NARROW]) {
      for (const [x, y] of pl.cells) {
        // the nearest cell corner to the section centre lies outside the chest ellipse
        const cx = x > pl.ox ? x - pl.cellW / 2 : x + pl.cellW / 2;
        const cy = y > pl.oy ? y - pl.cellH / 2 : y + pl.cellH / 2;
        const u = (cx - pl.ox) / (150 * pl.scale);
        const v = (cy - pl.oy) / (105 * pl.scale);
        expect(u * u + v * v).toBeGreaterThan(1);
      }
      expect(pl.inset[0] - pl.insetR).toBeGreaterThanOrEqual(0);
      expect(pl.inset[0] + pl.insetR).toBeLessThanOrEqual(pl.w);
    }
  });

  it('the transition marker sits on a cell at integer crossings and between two cells otherwise', () => {
    expect(markerAt(WIDE, 2)).toEqual(WIDE.cells[2]);
    const m = markerAt(WIDE, 2.5);
    expect(m[0]).toBeCloseTo((WIDE.cells[2][0] + WIDE.cells[3][0]) / 2, 9);
    expect(m[1]).toBeCloseTo((WIDE.cells[2][1] + WIDE.cells[3][1]) / 2, 9);
    expect(markerAt(NARROW, 5.7)).toEqual(NARROW.cells[5]);
  });

  it('the on-screen marker moves continuously with the crossing; in the narrow grid it runs down the column gap', () => {
    for (const pl of [WIDE, NARROW]) {
      let prev = markerScreen(pl, 0);
      for (let i = 1; i <= 500; i++) {
        const c = (i / 500) * SITES_MAX;
        const m = markerScreen(pl, c);
        expect(Math.hypot(m[0] - prev[0], m[1] - prev[1])).toBeLessThan(3);
        prev = m;
      }
    }
    const gap = (NARROW.cells[0][0] + NARROW.cells[1][0]) / 2;
    for (const c of [0, 1, 2.12, 3.42, 3.93, 5]) {
      const [x] = markerScreen(NARROW, c);
      expect(x).toBeCloseTo(gap, 9);
      // the 40-unit pill stays clear of both cells' traces (left trace ends 8 units before its cell's right edge)
      expect(x - 20).toBeGreaterThanOrEqual(NARROW.cells[0][0] + NARROW.cellW / 2 - 8 - 4);
      expect(x + 20).toBeLessThanOrEqual(NARROW.cells[1][0] - NARROW.cellW / 2 + 22);
    }
    // the wide marker sits inside the ring, nearer the section than the cells are
    const m = markerScreen(WIDE, 2.12);
    const r = Math.hypot(m[0] - WIDE.ox, m[1] - WIDE.oy);
    expect(r).toBeLessThan(200 - 40);
  });

  it('the R = S pill never covers an R / S bracket of the straddling cells; brackets stay inside their cell, clear of its name', () => {
    for (const pl of [WIDE, NARROW]) {
      for (let d = -90; d <= 125; d += 0.5) {
        const src = computeSource(d);
        const tr = src.transition;
        if (tr.crossing == null) continue;
        const [mx, my] = markerScreen(pl, tr.crossing);
        for (const k of straddling(tr)) {
          const lv = rsLevels(pl, src, k);
          const x0 = lv.x - TICK;
          const x1 = lv.x + TICK;
          const y0 = Math.min(lv.r, lv.base);
          const y1 = Math.max(lv.s, lv.base);
          const hit = x1 >= mx - PILL.w / 2 && x0 <= mx + PILL.w / 2 && y1 >= my - PILL.h / 2 && y0 <= my + PILL.h / 2;
          expect(hit, `${pl.w} wide, mainDeg ${d}, cell ${k}`).toBe(false);
          const [cx] = pl.cells[k];
          expect(x0).toBeGreaterThan(cx - pl.cellW / 2);
          expect(x1).toBeLessThan(cx + pl.cellW / 2);
          // a left-side bracket sits between the border (half a stroke) and the lead name (6 units in); a right-side
          // one is past the trace
          if (lv.x < cx) {
            expect(x0).toBeGreaterThanOrEqual(cx - pl.cellW / 2 + 0.5);
            expect(x1).toBeLessThanOrEqual(cx - pl.cellW / 2 + 6);
          } else expect(x0).toBeGreaterThan(cellGeom(pl, k, src.maxAmp).x1);
        }
      }
    }
  });

  it('group names and legend sit outside every cell, inside the frame', () => {
    for (const pl of [WIDE, NARROW]) {
      for (const [gx, gy] of pl.groupAt) {
        const x0 = pl.groupAnchor === 'start' ? gx : gx - 30;
        const x1 = pl.groupAnchor === 'start' ? gx + 60 : gx + 30;
        for (const [cx, cy] of pl.cells) {
          const apart = x1 < cx - pl.cellW / 2 || x0 > cx + pl.cellW / 2 || gy < cy - pl.cellH / 2 || gy - 11 > cy + pl.cellH / 2;
          expect(apart, `group label at ${gx},${gy}`).toBe(true);
        }
        expect(x0).toBeGreaterThanOrEqual(0);
        expect(gy).toBeLessThanOrEqual(pl.h);
      }
      expect(pl.legendAt[1] + 15 + 4).toBeLessThanOrEqual(pl.h);
      expect(pl.panel[1] + pl.panelRows[pl.panelRows.length - 1] + 4).toBeLessThanOrEqual(pl.h);
    }
  });

  it('chooses the narrow table below 560 px, the wide one above', () => {
    expect(placementFor(390)).toBe(NARROW);
    expect(placementFor(1000)).toBe(WIDE);
  });

  it('the heart centre stays inside the section on screen', () => {
    for (const pl of [WIDE, NARROW]) {
      const hx = pl.ox + HEART_CENTER[0] * pl.scale;
      const hy = pl.oy + HEART_CENTER[1] * pl.scale;
      expect(Math.abs(hx - pl.ox)).toBeLessThan(150 * pl.scale);
      expect(Math.abs(hy - pl.oy)).toBeLessThan(105 * pl.scale);
    }
  });
});
