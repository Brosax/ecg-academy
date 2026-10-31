/**
 * Tests of the "vector-pen" scene (docs/design/f-explainers.md §4.2): the strings contract, the beats (tiling,
 * continuity frame(to_k) ≈ frame(from_k+1), end-frame completeness) and the physiology of the one schematic loop
 * (src/figures/scenes/vector-pen.math.ts).
 */
import { describe, expect, it } from 'vitest';
import { LIMB_ANGLE_DEG, LIMB_LEADS } from '../../../src/core/leads';
import { angleDiff, angleOf, unit } from '../../../src/figures/math/geom';
import { deflectionKind } from '../../../src/figures/math/projection';
import { BEAT_IDS, en, es, tVectorPen, zh } from '../../../src/figures/scenes/vector-pen.i18n';
import * as M from '../../../src/figures/scenes/vector-pen.math';
import { specOf } from '../scene/spec';

describe('vector-pen: strings contract', () => {
  const spec = specOf('vector-pen');

  it('BEAT_IDS are the spec beats in order and every beat has a caption in zh / en / es', () => {
    expect([...BEAT_IDS]).toEqual([...spec.beats]);
    for (const b of BEAT_IDS) {
      for (const d of [zh, en, es]) expect(d[`beat_${b}`].trim()).not.toBe('');
    }
  });

  it('the translator serves the title in every language under the namespace scene-vector-pen', () => {
    expect(tVectorPen.ns).toBe('scene-vector-pen');
    expect(tVectorPen.in('zh', 'title')).toBe(zh.title);
    expect(tVectorPen.in('en', 'title')).toBe(en.title);
    expect(tVectorPen.in('es', 'title')).toBe(es.title);
  });

  it('no placeholder text is left and every caption is distinct per beat', () => {
    for (const d of [zh, en, es]) {
      for (const v of Object.values(d)) expect(v).not.toMatch(/\[(sum|drop|draw|turn|t)\]|待写|to be written|pendiente|建设中|under construction|construcción/i);
      expect(new Set(BEAT_IDS.map((b) => d[`beat_${b}`])).size).toBe(BEAT_IDS.length);
    }
  });

  it('narration and Predict feedback (shown in the narration box) stay within the README limits', () => {
    const keys = [...BEAT_IDS.map((b) => `beat_${b}` as const), 'pq_ok', 'pq_wrong'] as const;
    for (const k of keys) {
      expect(en[k].length, `en ${k}`).toBeLessThanOrEqual(110);
      expect(en[k].trim().split(/\s+/).length, `en ${k} words`).toBeLessThanOrEqual(20);
      expect(zh[k].length, `zh ${k}`).toBeLessThanOrEqual(45);
      expect(es[k].length, `es ${k}`).toBeLessThanOrEqual(130);
    }
  });

  it('the wrong-pick feedback names +30° as the answer among the options (−150° is perpendicular too)', () => {
    expect(en.pq_wrong).toMatch(/of these/);
    expect(es.pq_wrong).toMatch(/de estas opciones/);
    expect(zh.pq_wrong).toMatch(/在这些选项中/);
  });

  it('Spanish uses Spain terms (derivación, isodifásica) and Chinese the textbook terms (导联)', () => {
    const esAll = Object.values(es).join('\n');
    expect(esAll).toMatch(/derivaci[oó]n/);
    expect(esAll).toMatch(/isodifásica/);
    expect(Object.values(zh).join('\n')).toMatch(/导联/);
  });
});

const NUMERIC = ['arrowDeg', 'arrowLen', 'meanOn', 'chainF', 'chainOn', 'axisDeg', 'dropOn', 'guideOn', 'shadowOn', 'lettersOn', 's', 'penValue', 'chipsOn', 'tVecOn', 'labelSumOn'] as const;

function flat(f: M.Frame): number[] {
  return [...NUMERIC.map((k) => f[k]), ...f.cellOn];
}

describe('vector-pen: beats', () => {
  const input = (axis = 60, lead: number = LIMB_ANGLE_DEG.II): M.SceneInput => ({ loop: M.loopFor(axis), leadDeg: lead });

  it('the five beats tile [0, 1] in spec order and last ≈ 8 s', () => {
    const b = M.TIMELINE.beats;
    expect(b.map((x) => x.id)).toEqual([...BEAT_IDS]);
    expect(b[0].from).toBe(0);
    expect(b[b.length - 1].to).toBeCloseTo(1, 12);
    for (let k = 1; k < b.length; k++) expect(b[k].from).toBeCloseTo(b[k - 1].to, 12);
    expect(M.TIMELINE.durationMs).toBeGreaterThanOrEqual(7500);
    expect(M.TIMELINE.durationMs).toBeLessThanOrEqual(9000);
  });

  for (const [axis, lead] of [[60, 60], [60, -30], [30, 120], [-45, 0], [150, -150]] as const) {
    it(`no cuts: the end frame of each beat is the start frame of the next (axis ${axis}°, lead ${lead}°)`, () => {
      const b = M.TIMELINE.beats;
      const inp = input(axis, lead);
      for (let k = 0; k + 1 < b.length; k++) {
        const a = flat(M.frame(b[k].to - 1e-12, inp));
        const c = flat(M.frame(b[k + 1].from, inp));
        a.forEach((v, j) => expect(Math.abs(v - c[j]), `${b[k].id}→${b[k + 1].id} ${[...NUMERIC, 'cell0', 'cell1', 'cell2'][j]}`).toBeLessThanOrEqual(1e-6));
      }
    });
  }

  it('continuity inside the beats: no field jumps between two nearby instants', () => {
    const inp = input();
    let prev = flat(M.frame(0, inp));
    for (let i = 1; i <= 4000; i++) {
      const cur = flat(M.frame(i / 4000, inp));
      cur.forEach((v, j) => {
        const d = j === NUMERIC.indexOf('axisDeg') || j === NUMERIC.indexOf('arrowDeg') ? Math.abs(angleDiff(v, prev[j])) : Math.abs(v - prev[j]);
        // the instantaneous arrow turns fast through the tiny vectors at the loop's ends; everything else is smooth
        const tol = j === NUMERIC.indexOf('arrowDeg') ? 40 : j === NUMERIC.indexOf('axisDeg') ? 1.5 : 0.06;
        expect(d, `${[...NUMERIC, 'cell0', 'cell1', 'cell2'][j]} at p=${i / 4000}`).toBeLessThanOrEqual(tol);
      });
      prev = cur;
    }
  });

  it('beat 1: the strip is empty, the pen on the baseline, axis II highlighted', () => {
    const f = M.frame(M.TIMELINE.beats[0].to * 0.6, input());
    expect(f.s).toBe(0);
    expect(f.penValue).toBe(0);
    expect(f.axisDeg).toBe(60);
  });

  it('beat 2 end: the pen stands at the shadow of the mean vector on II (cos 0° = 1)', () => {
    const f = M.frame(M.TIMELINE.beats[1].to - 1e-9, input());
    expect(f.penValue).toBeCloseTo(1, 6);
    const g = M.frame(M.TIMELINE.beats[1].to - 1e-9, input(0));
    expect(g.penValue).toBeCloseTo(Math.cos((60 * Math.PI) / 180), 6);
  });

  it('beat 4: the axis turns II → I → aVL → aVR and the cells fill in that order', () => {
    expect(M.turnAxis(60, 0)).toBe(60);
    expect(M.turnAxis(60, 1)).toBe(-150);
    const tII = M.passTime(60, 60)!, tL = M.passTime(60, -30)!, tR = M.passTime(60, -150)!;
    expect(tII).toBeLessThan(tL);
    expect(tL).toBeLessThan(tR);
    // the axis really passes aVL at its pass time
    expect(M.turnAxis(60, tL)).toBeCloseTo(-30, 6);
    const b = M.TIMELINE.beats[3];
    const mid = M.frame(b.from + (b.to - b.from) * ((tL + tR) / 2), input());
    expect(mid.cellOn[0]).toBeCloseTo(1, 6);
    expect(mid.cellOn[2]).toBeLessThan(0.01);
  });

  it('end frame (p = 1) is complete: QRS + T drawn, axis back on the lead, three cells, chips, T vector, mean vector', () => {
    for (const lead of LIMB_LEADS) {
      const f = M.frame(1, input(60, LIMB_ANGLE_DEG[lead]));
      expect(f.beat).toBe('t');
      expect(f.s).toBe(1);
      expect(f.axisDeg).toBeCloseTo(LIMB_ANGLE_DEG[lead], 9);
      expect(f.cellOn).toEqual([1, 1, 1]);
      expect(f.chipsOn).toBe(1);
      expect(f.tVecOn).toBe(1);
      expect(f.meanOn).toBe(1);
      expect(f.shadowOn).toBe(1);
      expect(f.lettersOn).toBe(1);
      expect(f.chainOn).toBe(0);
      expect(f.guideOn).toBe(0);
    }
  });
});

describe('vector-pen: one source, the physiology of §4.2', () => {
  it('the mean QRS vector (area vector) is within 3° of axisDeg for −90° … +180°', () => {
    for (let a = -90; a <= 180; a += 5) expect(Math.abs(angleDiff(M.meanQrsDeg(M.loopFor(a).points), a)), `${a}°`).toBeLessThanOrEqual(3);
  });

  it('every lead is a projection of the same loop: II = I + III and aVR + aVL + aVF = 0 sample by sample', () => {
    const loop = M.loopFor(47);
    const tr = Object.fromEntries(LIMB_LEADS.map((l) => [l, M.traceOn(loop, LIMB_ANGLE_DEG[l])])) as Record<string, number[]>;
    for (let i = 0; i < M.LOOP_N; i++) {
      expect(tr.II[i]).toBeCloseTo(tr.I[i] + tr.III[i], 12);
      expect(tr.aVR[i] + tr.aVL[i] + tr.aVF[i]).toBeCloseTo(0, 12);
    }
  });

  it('the loop is the spec source: septal +165°, main at the axis, basal axis − 170°, T axis − 15°', () => {
    const loop = M.loopFor(60);
    const [sep, main, bas, t] = loop.components;
    expect(sep.deg).toBe(165);
    expect(sep.amp).toBe(0.18);
    expect(sep.center).toBe(0.12);
    expect(Math.abs(angleDiff(main.deg, 60))).toBeLessThan(10);
    expect(main.amp).toBe(1);
    expect(main.width).toBe(0.07);
    expect(main.sweep).toBe(70);
    expect(bas.deg).toBe(-110);
    expect(bas.amp).toBe(0.15);
    expect(t.deg).toBe(45);
    expect(t.amp).toBe(0.35);
    expect(M.tVectorDeg(60)).toBe(45);
  });

  it('ST is flat between s = 0.45 and 0.6 (|v| < 6 % of R)', () => {
    const loop = M.loopFor(60);
    for (let s = 0.45; s <= 0.6; s += 0.005) {
      const [x, y] = M.heartVectorOf(loop.components, s);
      expect(Math.hypot(x, y), `s=${s}`).toBeLessThan(0.06);
    }
  });

  it('III is equiphasic at +30°: |net| < 5 % of its peak-to-peak; deflectionKind(30, 120) is equiphasic', () => {
    const { net, pp } = M.qrsNet(M.traceOn(M.loopFor(30), LIMB_ANGLE_DEG.III));
    expect(Math.abs(net)).toBeLessThan(0.05 * pp);
    expect(deflectionKind(30, 120)).toBe('equiphasic');
    expect(M.kindOf(30, 120)).toBe('equiphasic');
    // the wrong picks are not
    expect(M.kindOf(-60, 120)).toBe('negative');
    expect(M.kindOf(120, 120)).toBe('positive');
  });

  it('at +60°: II net > 0, aVR net < 0, aVL net small; the cells read positive / equiphasic / negative', () => {
    const loop = M.loopFor(60);
    const II = M.qrsNet(M.traceOn(loop, 60));
    const aVR = M.qrsNet(M.traceOn(loop, -150));
    const aVL = M.qrsNet(M.traceOn(loop, -30));
    expect(II.net).toBeGreaterThan(0);
    expect(aVR.net).toBeLessThan(0);
    expect(Math.abs(aVL.net)).toBeLessThan(0.05 * aVL.pp);
    expect(M.TOUR_CELLS.map((c) => M.kindOfTrace(M.traceOn(loop, c.deg)))).toEqual(['positive', 'equiphasic', 'negative']);
  });

  it('every cell label agrees with the QRS it draws (all limb leads, axis −180° … 180° in 5° steps)', () => {
    for (let a = -180; a <= 180; a += 5) {
      const loop = M.loopFor(a);
      for (const l of LIMB_LEADS) {
        const tr = M.traceOn(loop, LIMB_ANGLE_DEG[l]).slice(0, M.QRS_LAST_I + 1);
        const R = Math.max(0, ...tr), S = -Math.min(0, ...tr);
        const kind = M.kindOfTrace(M.traceOn(loop, LIMB_ANGLE_DEG[l]));
        const tag = `${a}° ${l} ${kind} R ${R.toFixed(3)} S ${S.toFixed(3)}`;
        if (kind === 'positive') expect(R, tag).toBeGreaterThan(S);
        else if (kind === 'negative') expect(S, tag).toBeGreaterThan(R);
        else {
          // equiphasic: R and S of comparable size (R/S between 1/2 and 2)
          expect(R, tag).toBeGreaterThanOrEqual(0.5 * S);
          expect(S, tag).toBeGreaterThanOrEqual(0.5 * R);
        }
      }
    }
  });

  it('the shadow / cell kind of the drawn complex agrees with the Predict key at the three picks on III', () => {
    for (const d of [30, -60, 120]) expect(M.kindOfTrace(M.traceOn(M.loopFor(d), LIMB_ANGLE_DEG.III)), `${d}°`).toBe(M.kindOf(d, LIMB_ANGLE_DEG.III));
  });

  it('off-perpendicular probes on III read from the trace, not the angle tolerance', () => {
    // +45°: clearly positive (R/S ≈ 6); +15° and +20°: rS (negative); +30°: equiphasic
    expect(M.kindOfTrace(M.traceOn(M.loopFor(45), 120))).toBe('positive');
    expect(M.kindOfTrace(M.traceOn(M.loopFor(15), 120))).toBe('negative');
    expect(M.kindOfTrace(M.traceOn(M.loopFor(20), 120))).toBe('negative');
    expect(M.kindOfTrace(M.traceOn(M.loopFor(30), 120))).toBe('equiphasic');
  });

  it('T has the QRS polarity: on every lead the T net has the sign of the QRS net (axis +60°)', () => {
    const loop = M.loopFor(60);
    for (const l of ['I', 'II', 'III', 'aVR', 'aVF'] as const) {
      const tr = M.traceOn(loop, LIMB_ANGLE_DEG[l]);
      expect(Math.sign(M.tNet(tr)), l).toBe(Math.sign(M.qrsNet(tr).net));
    }
    // and the T on II is upright
    expect(M.tNet(M.traceOn(loop, 60))).toBeGreaterThan(0);
  });

  it('the small arrows of beat 1 sum to the mean vector (unit length at axisDeg)', () => {
    for (const a of [60, -30, 135]) {
      const fr = M.fronts(M.loopFor(a));
      expect(fr.length).toBe(5);
      const sx = fr.reduce((s, f) => s + f.vx, 0), sy = fr.reduce((s, f) => s + f.vy, 0);
      const [ux, uy] = unit(a);
      expect(sx).toBeCloseTo(ux, 6);
      expect(sy).toBeCloseTo(uy, 6);
      // and the chained head of the last front lands on the mean vector's tip
      const end = M.frontSegment(fr, 4, 1);
      expect(end.x1).toBeCloseTo(ux, 6);
      expect(end.y1).toBeCloseTo(uy, 6);
    }
  });

  it('the fronts point different ways: septal ≈ +165°, three free-wall fronts around the axis, basal ≈ axis − 170°', () => {
    for (let a = -180; a < 180; a += 15) {
      const fr = M.fronts(M.loopFor(a));
      const deg = fr.map((f) => angleOf(f.vx, f.vy));
      expect(Math.abs(angleDiff(deg[0], 165)), `${a}° septal ${deg[0]}`).toBeLessThanOrEqual(20);
      expect(Math.abs(angleDiff(deg[4], a - 170)), `${a}° basal ${deg[4]}`).toBeLessThanOrEqual(20);
      for (const k of [1, 2, 3]) expect(Math.abs(angleDiff(deg[k], a)), `${a}° front ${k}`).toBeLessThanOrEqual(35);
      // early → late free-wall fronts turn with the loop's sweep
      expect(angleDiff(deg[3], deg[1])).toBeGreaterThan(20);
    }
  });

  it('the main component three front windows partition the QRS samples', () => {
    const r = M.FRONT_RANGES;
    expect(r[0][0]).toBe(0);
    expect(r[r.length - 1][1]).toBe(M.QRS_LAST_I);
    for (let k = 1; k < r.length; k++) expect(r[k][0]).toBe(r[k - 1][1] + 1);
  });

  it('the pen draws what the loop says: at every instant of beat 3 the pen is the projection on II', () => {
    const loop = M.loopFor(60);
    const b = M.TIMELINE.beats[2];
    for (let k = 1; k <= 20; k++) {
      const f = M.frame(b.from + ((b.to - b.from) * k) / 20, { loop, leadDeg: 60 });
      if (f.s <= 0) continue;
      const [x, y] = M.heartVectorOf(loop.components, f.s);
      const [ux, uy] = unit(60);
      expect(f.penValue).toBeCloseTo(x * ux + y * uy, 9);
    }
  });

  it('wave letters come from the trace: R s + upright T on II, a septal q in I, nothing on a negative lead', () => {
    const loop = M.loopFor(60);
    // at +60° the septal vector (+165°) is almost perpendicular to II: its q shows in I (and the left leads), not in II
    expect(M.waveLetters(M.traceOn(loop, 60)).map((l) => l.text)).toEqual(['R', 's', 'T']);
    expect(M.waveLetters(M.traceOn(loop, 0)).map((l) => l.text)).toEqual(['q', 'R', 's', 'T']);
    expect(M.waveLetters(M.traceOn(loop, 60)).find((l) => l.text === 'T')!.v).toBeGreaterThan(0);
    expect(M.waveLetters(M.traceOn(loop, -150))).toEqual([]);
  });
});

describe('vector-pen: what the picture places', () => {
  const pl = M.PLACEMENT.wide;

  it('beat 2 end: the foot label and the pen label carry the same number (the shadow is the pen height)', () => {
    for (const axis of [60, 10, -100]) {
      const f = M.frame(M.TIMELINE.beats[1].to - 1e-12, { loop: M.loopFor(axis), leadDeg: 60 });
      const P = M.points(pl, f, axis);
      expect(P.inst).toBeCloseTo(f.penValue, 9);
      expect((P.baseY - P.penY) / M.TRACE_SCALE).toBeCloseTo(P.inst, 9);
    }
  });

  it('the foot is the orthogonal projection of the tip on the highlighted axis, at every instant', () => {
    const loop = M.loopFor(35);
    for (let i = 0; i <= 200; i++) {
      const f = M.frame(i / 200, { loop, leadDeg: 60 });
      const P = M.points(pl, f, 35);
      const [ux, uy] = unit(f.axisDeg);
      expect((P.tip[0] - P.foot[0]) * ux + (P.tip[1] - P.foot[1]) * uy).toBeCloseTo(0, 9);
      // and once the pen draws, its height is that projection
      if (f.s > 0) expect((P.baseY - P.penY) / M.TRACE_SCALE).toBeCloseTo(P.inst, 9);
    }
  });

  it('every lead of every axis stays inside the strip (|trace| ≤ 1.1 R)', () => {
    for (let a = -180; a < 180; a += 15) {
      const loop = M.loopFor(a);
      for (let d = -180; d < 180; d += 15) for (const v of M.traceOn(loop, d)) expect(Math.abs(v)).toBeLessThanOrEqual(1.1);
    }
  });

  it('the paper puts the drawn instant under the fixed pen', () => {
    const f = M.frame(0.5, { loop: M.loopFor(60), leadDeg: 60 });
    const P = M.points(pl, f, 60);
    expect(P.paperX + f.s * M.PX_PER_S).toBeCloseTo(P.penX, 9);
  });
});

describe('vector-pen: interaction helpers and placement', () => {
  it('snaps to the six axes (and their negative poles) within 5°, not beyond', () => {
    expect(M.snapToAxes(57)).toBe(60);
    expect(M.snapToAxes(-26)).toBe(-30);
    expect(M.snapToAxes(178)).toBe(180);
    expect(M.snapToAxes(-177)).toBe(180);
    expect(M.snapToAxes(53)).toBe(53);
    expect(M.snapToAxes(44)).toBe(44);
  });

  it('tweenAngle takes the short way round', () => {
    expect(M.tweenAngle(60, 30, 0.5)).toBeCloseTo(45, 9);
    expect(M.tweenAngle(170, -170, 0.5)).toBeCloseTo(180, 9);
  });

  it('Cabrera order runs aVL, I, −aVR, II, aVF, III at −30° … +120°', () => {
    expect(M.sixCells(true).map((c) => c.deg)).toEqual([-30, 0, 30, 60, 90, 120]);
    expect(M.sixCells(false).map((c) => c.label)).toEqual([...LIMB_LEADS]);
  });

  it('both placements fit their frame: wheel labels, strip, cells and chips (three and six cells)', () => {
    for (const pl of [M.PLACEMENT.wide, M.PLACEMENT.narrow]) {
      const { cx, cy, r } = pl.wheel;
      expect(cx - r - 24).toBeGreaterThanOrEqual(0);
      expect(cy - r - 24).toBeGreaterThanOrEqual(0);
      expect(pl.strip.x + pl.strip.w).toBeLessThanOrEqual(pl.w);
      for (const six of [false, true]) {
        const last = M.cellRect(pl, six ? 5 : 2, six);
        expect(last.x + last.w).toBeLessThanOrEqual(pl.w);
        expect(last.y + last.h).toBeLessThanOrEqual((six ? pl.chipY6 : pl.chipY) - 4);
        expect((six ? pl.chipY6 : pl.chipY) + M.CHIP_H).toBeLessThanOrEqual(pl.h);
      }
      // the paper never runs out under the pen: the whole loop fits between the strip's left edge and the pen
      expect(M.penX(pl) - M.PX_PER_S).toBeGreaterThanOrEqual(pl.strip.x);
      // R (≈ 1) and the deepest S fit in the strip
      expect(M.baseY(pl) - 1.3 * M.TRACE_SCALE).toBeGreaterThanOrEqual(pl.strip.y);
      expect(M.baseY(pl) + 1.1 * M.TRACE_SCALE).toBeLessThanOrEqual(pl.strip.y + pl.strip.h);
    }
  });
});
