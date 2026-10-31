/**
 * Tests of the "electrode-walk" scene (docs/design/f-explainers.md §4.7): the strings contract, the beats tiling,
 * continuity across every beat boundary (approached from both sides), the end frames (beat 2: every electrode on its
 * ELECTRODES site; p = 1: everything held), the cable map algebra, and the physiology of §4.7 against the engine —
 * the V2/V3 cable swap is an exact permutation of the block ECG's traces, R/(R+S) rises V1 → V4 only when the order
 * is correct.
 */
import { describe, expect, it } from 'vitest';
import type { Ecg } from '../../../src/core/ecg';
import { ELECTRODES, icsY, LINES } from '../../../src/figures/data/electrodes';
import { BEAT_IDS, en, es, tElectrodeWalk, zh } from '../../../src/figures/scenes/electrode-walk.i18n';
import * as M from '../../../src/figures/scenes/electrode-walk.math';
import { windowMedian } from '../../../src/figures/strip';
import { PLACEMENT } from '../../../src/course/lessons/f-shared';
import { generate } from '../../../src/synth';
import { specOf } from '../scene/spec';

import type { SynthRequest } from '../../../src/synth/api';

type Chest = NonNullable<NonNullable<NonNullable<SynthRequest['recording']>['placement']>['chest']>;
/** the engine preset the spec names (§4.7) */
const V2V3: Chest = PLACEMENT.v2v3.chest;
const ecgCache = new Map<string, Ecg>();
function ecgOf(chest?: Chest): Ecg {
  const k = JSON.stringify(chest ?? null);
  let e = ecgCache.get(k);
  if (!e) {
    e = generate({ scenario: 'normal', seed: 512, ...(chest ? { recording: { placement: { chest } } } : {}) }).ecg;
    ecgCache.set(k, e);
  }
  return e;
}
const correct = () => ecgOf();

describe('electrode-walk: strings contract', () => {
  const spec = specOf('electrode-walk');

  it('BEAT_IDS are the spec beats in order and every beat has a caption in zh / en / es', () => {
    expect([...BEAT_IDS]).toEqual([...spec.beats]);
    for (const b of BEAT_IDS) {
      for (const d of [zh, en, es]) expect(d[`beat_${b}`].trim()).not.toBe('');
    }
  });

  it('the translator serves the title in every language under the namespace scene-electrode-walk', () => {
    expect(tElectrodeWalk.ns).toBe('scene-electrode-walk');
    expect(tElectrodeWalk.in('zh', 'title')).toBe(zh.title);
    expect(tElectrodeWalk.in('en', 'title')).toBe(en.title);
    expect(tElectrodeWalk.in('es', 'title')).toBe(es.title);
  });

  it('every key is filled in the three languages, no placeholder text is left, narration within the limits', () => {
    const keys = Object.keys(zh);
    expect(Object.keys(en).sort()).toEqual([...keys].sort());
    expect(Object.keys(es).sort()).toEqual([...keys].sort());
    for (const d of [zh, en, es] as Record<string, string>[]) {
      for (const k of keys) {
        expect(d[k]?.trim(), k).toBeTruthy();
        expect(/待写|to be written|pendiente|under construction|建设中|en construcción/i.test(d[k]), `${k}: ${d[k]}`).toBe(false);
      }
    }
    for (const b of BEAT_IDS) {
      expect(en[`beat_${b}`].length).toBeLessThanOrEqual(110);
      expect(en[`beat_${b}`].trim().split(/\s+/).length, `en beat_${b} words`).toBeLessThanOrEqual(20);
      expect(zh[`beat_${b}`].length).toBeLessThanOrEqual(45);
      expect(es[`beat_${b}`].length).toBeLessThanOrEqual(130);
    }
  });

  it('labels the picture draws exist; numbers as criteria.md; Spain Spanish; decimal comma in es', () => {
    const labels = ['lbl_sternal', 'lbl_ics2', 'lbl_ics3', 'lbl_ics4', 'lbl_ics5', 'lbl_mcl', 'lbl_aal', 'lbl_mal', 'lbl_level', 'lbl_ghost', 'lbl_breast', 'lbl_ratio', 'lbl_rs', 'lbl_transition', 'lbl_jump', 'lbl_before', 'lbl_back', 'lbl_chip', 'lbl_rv', 'lbl_post', 'lbl_gain', 'lbl_summary', 'lbl_drag', 'ctl_reset', 'ctl_ghost', 'ctl_swap', 'ctl_none', 'ctl_electrode'];
    for (const k of labels) for (const d of [zh, en, es] as Record<string, string>[]) expect(d[k]?.trim(), k).toBeTruthy();
    // ST elevation ≥ 0.5 mm in V7–V9 and V3R/V4R (criteria.md extra-chest-leads): value and direction
    expect(en.lbl_chip).toContain('0.5 mm');
    expect(zh.lbl_chip).toContain('0.5 mm');
    expect(es.lbl_chip).toContain('0,5 mm');
    expect(en.lbl_chip).toMatch(/ST↑|ST elevation/);
    expect(zh.lbl_chip).toMatch(/ST↑|抬高/);
    expect(es.lbl_chip).toMatch(/ST↑|ascenso del ST/);
    // the walk narration names what the bars show (R/(R+S)), not a monotonic R wave (R peaks at V4–V5)
    for (const d of [zh, en, es]) {
      expect(d.beat_walk).toContain('R/(R+S)');
      expect(d.beat_walk).toContain('V4–V5');
    }
    // V4R is a placement (mirror site), not a reciprocal "mirror image"
    expect(es.beat_extra).not.toMatch(/imagen especular/);
    expect(Object.values(es).join('\n')).toMatch(/derivaci[oó]n/);
    expect(Object.values(es).join('\n')).not.toMatch(/\bderivadas?\b/i);
    expect(Object.values(zh).join('\n')).toMatch(/电极/);
    for (const d of [zh, en, es]) {
      expect(d.lbl_before).toContain('{a}');
      expect(d.lbl_before).toContain('{b}');
      expect(d.lbl_gain).toContain('{g}');
    }
  });
});

describe('electrode-walk: beats', () => {
  it('tile [0, 1] in spec order, ≈ 8 s; the two-idea "extra" beat is not the shortest', () => {
    const B = M.TIMELINE_BEATS;
    expect(B.map((b) => b.id)).toEqual([...BEAT_IDS]);
    expect(B[0].from).toBe(0);
    expect(B[B.length - 1].to).toBe(1);
    for (let k = 1; k < B.length; k++) expect(B[k].from).toBe(B[k - 1].to);
    const ms = M.BEATS.reduce((s, b) => s + b.ms, 0);
    expect(ms).toBeGreaterThanOrEqual(7000);
    expect(ms).toBeLessThanOrEqual(9000);
    expect(M.BEATS.find((b) => b.id === 'extra')!.ms).toBeGreaterThanOrEqual(1600);
  });
});

/** every number of a frame (marks flattened) */
function flat(f: M.Frame): number[] {
  const out: number[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'number') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(f);
  return out;
}
/** the frame without the strip reveals (each landing reveals an engine trace; spec §4.7: the continuity test excludes them) */
function motion(f: M.Frame): number[] {
  const { reveal: _r, ...rest } = f;
  return flat(rest as M.Frame);
}

describe('electrode-walk: continuity (no cuts)', () => {
  const inputs: M.SceneInput[] = [{ transition: 2 }, { transition: 3 }, { transition: null }, { transition: 0 }];
  it('frame(to_k − ε) ≈ frame(from_{k+1} + ε) at every beat boundary, for several states', () => {
    const eps = 1e-7;
    for (const s of inputs) {
      for (let k = 0; k < M.TIMELINE_BEATS.length - 1; k++) {
        const b = M.TIMELINE_BEATS[k].to;
        const a = motion(M.frame(b - eps, s));
        const c = motion(M.frame(b + eps, s));
        expect(a.length).toBe(c.length);
        for (let i = 0; i < a.length; i++) expect(Math.abs(a[i] - c[i]), `boundary ${k} value ${i}`).toBeLessThan(1e-3);
      }
    }
  });
  it('everything moves smoothly inside the beats too: ≤ 3 torso units / 0.02 opacity per 1/4000 of p (~2 ms)', () => {
    const s: M.SceneInput = { transition: 2 };
    const pos = (f: M.Frame) => [f.cursor[0], f.cursor[1], ...f.el.flatMap((e) => [e.x, e.y]), f.ghost.x, f.ghost.y, f.v4r.x, f.v4r.y, ...f.back.flatMap((b) => [b.x, b.y])];
    const fr = (f: M.Frame) => {
      const { reveal: _r, cursor: _c, el, ghost, v4r, back, ...rest } = f;
      return [...flat(rest as unknown as M.Frame), ...el.map((e) => e.on), ghost.on, v4r.on, ...back.map((b) => b.on)];
    };
    let pp = pos(M.frame(0, s)), pf = fr(M.frame(0, s));
    const n = 4000;
    let maxPos = 0, maxFr = 0;
    for (let i = 1; i <= n; i++) {
      const f = M.frame(i / n, s);
      const cp = pos(f), cf = fr(f);
      for (let j = 0; j < cp.length; j++) maxPos = Math.max(maxPos, Math.abs(cp[j] - pp[j]));
      for (let j = 0; j < cf.length; j++) maxFr = Math.max(maxFr, Math.abs(cf[j] - pf[j]));
      pp = cp;
      pf = cf;
    }
    expect(maxPos).toBeLessThanOrEqual(3);
    expect(maxFr).toBeLessThanOrEqual(0.02);
  });
});

describe('electrode-walk: end frames', () => {
  const s: M.SceneInput = { transition: 2 };
  it('end of beat 2: every electrode sits exactly on ELECTRODES[id], fully shown', () => {
    const f = M.frame(M.TIMELINE_BEATS[1].to, s);
    M.CHEST_IDS.forEach((id, k) => {
      expect(f.el[k].x, id).toBeCloseTo(ELECTRODES[id].x, 9);
      expect(f.el[k].y, id).toBeCloseTo(ELECTRODES[id].y, 9);
      expect(f.el[k].on, id).toBe(1);
    });
    expect(f.level).toBe(1);
    expect(f.mcl * f.aal * f.mal).toBe(1);
    expect(f.ghost.on).toBe(0);
    // V5 and V6 at V4's level
    expect(f.el[4].y).toBeCloseTo(f.el[3].y, 9);
    expect(f.el[5].y).toBeCloseTo(f.el[3].y, 9);
  });
  it('end of beat 1: V1 and V2 on the 4th space at the sternal borders, their strips drawn', () => {
    const f = M.frame(M.TIMELINE_BEATS[0].to, s);
    expect(f.el[0]).toMatchObject({ x: ELECTRODES.V1.x, y: ELECTRODES.V1.y, on: 1 });
    expect(f.el[1].x).toBeCloseTo(ELECTRODES.V2.x, 9);
    expect(f.reveal[0]).toBe(1);
    expect(f.reveal[1]).toBe(1);
    expect(f.ics.slice(0, 3)).toEqual([1, 1, 1]);
  });
  it('p = 1 is complete: all six strips and bars, the transition, the "before" row, V4R and V7–V9 with chips; cells back in correct order', () => {
    const f = M.frame(1, s);
    expect(f.reveal).toEqual([1, 1, 1, 1, 1, 1]);
    expect(f.bar).toEqual([1, 1, 1, 1, 1, 1]);
    expect(f.transitionOn).toBe(1);
    expect(f.beforeOn).toBe(1);
    expect(f.traceMix).toBe(0);
    expect(f.demoMix).toBe(0);
    expect(f.level).toBe(1);
    expect(f.insetOn).toBe(1);
    expect(f.chipsOn).toBe(1);
    expect(f.v4r).toMatchObject({ x: ELECTRODES.V4R.x, y: ELECTRODES.V4R.y, on: 1 });
    f.back.forEach((b, k) => {
      const id = (['V7', 'V8', 'V9'] as const)[k];
      expect(b.x).toBeCloseTo(ELECTRODES[id].x, 9);
      expect(b.y).toBeCloseTo(ELECTRODES[id].y, 9);
      expect(b.on).toBe(1);
    });
    M.CHEST_IDS.forEach((id, k) => expect([f.el[k].x, f.el[k].y]).toEqual([ELECTRODES[id].x, ELECTRODES[id].y]));
  });
  it('beat 4 crosses the cables and exchanges the traces in the middle of the beat', () => {
    const b = M.TIMELINE_BEATS[3];
    const mid = M.frame(b.from + 0.6 * (b.to - b.from), s);
    expect(mid.demoMix).toBe(1);
    expect(mid.traceMix).toBe(1);
    expect(mid.jumpOn).toBe(1);
  });
});

describe('electrode-walk: geometry', () => {
  it('the sternal angle is above the 2nd space; the cursor counts 2 → 3 → 4 down the right sternal border', () => {
    expect(M.STERNAL_ANGLE[1]).toBeLessThan(M.SPACE(2)[1]);
    expect(M.SPACE(2)[1]).toBeLessThan(M.SPACE(3)[1]);
    expect(M.SPACE(3)[1]).toBeLessThan(ELECTRODES.V1.y);
    expect(M.SITES[0]).toEqual([M.RIGHT_BORDER, icsY(4, M.RIGHT_BORDER)]);
  });
  it('V3 is midway between V2 and V4; the ghost path follows the 5th space and ends higher than V6', () => {
    expect(M.SITES[2][0]).toBeCloseTo((M.SITES[1][0] + M.SITES[3][0]) / 2, 9);
    expect(M.SITES[2][1]).toBeCloseTo((M.SITES[1][1] + M.SITES[3][1]) / 2, 9);
    expect(M.GHOST_SITES[1][0]).toBe(LINES.malL);
    expect(M.GHOST_SITES[1][1]).toBeLessThan(ELECTRODES.V6.y - 5);
  });
  it('front ↔ frame conversions invert each other in both layouts; every cell, staircase and inset fits the frame', () => {
    for (const L of Object.values(M.LAYOUTS)) {
      const q = M.fromFrame(L, ...M.toFrame(L, [ELECTRODES.V5.x, ELECTRODES.V5.y]));
      expect(q[0]).toBeCloseTo(ELECTRODES.V5.x, 9);
      expect(q[1]).toBeCloseTo(ELECTRODES.V5.y, 9);
      for (const r of [...L.cells, L.stair, L.before, L.inset, L.summary]) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(L.w);
        expect(r.y + r.h).toBeLessThanOrEqual(L.h);
      }
      for (const id of ['V7', 'V8', 'V9'] as const) {
        const [x, y] = M.backToFrame(L, [ELECTRODES[id].x, ELECTRODES[id].y]);
        expect(x).toBeGreaterThan(L.inset.x);
        expect(x).toBeLessThan(L.inset.x + L.inset.w);
        expect(y).toBeGreaterThan(L.inset.y);
        expect(y).toBeLessThan(L.inset.y + L.inset.h);
      }
      // hit targets ≥ 24 px at the smallest scale the layout is rendered at (wide from a 600 px stage, narrow down to
      // 320 px): neighbouring sites ≥ 24 px apart, so the r = HIT_R circles (≥ 24 px across) never overlap
      const k = M.minScale(L);
      expect(2 * M.HIT_R * k).toBeGreaterThanOrEqual(M.HIT_PX);
      for (let i = 0; i < 6; i++)
        for (let j = i + 1; j < 6; j++) {
          const a = M.toFrame(L, M.SITES[i]), b = M.toFrame(L, M.SITES[j]);
          const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
          expect(d * k, `${M.CHEST_IDS[i]}–${M.CHEST_IDS[j]}`).toBeGreaterThanOrEqual(M.HIT_PX);
          expect(d).toBeGreaterThanOrEqual(2 * M.HIT_R);
        }
      // the layout for a stage width
      expect(M.layoutFor(M.NARROW_BELOW - 1)).toBe(M.LAYOUTS.narrow);
      expect(M.layoutFor(M.NARROW_BELOW)).toBe(M.LAYOUTS.wide);
    }
  });
  it('a drop near a site picks that site, far away none', () => {
    M.SITES.forEach(([x, y], k) => expect(M.nearestSite(x + 3, y - 2)).toBe(k));
    expect(M.nearestSite(20, 20)).toBeNull();
  });
  it("a press inside an electrode's visible dot (r = 7) picks that electrode, never its neighbour", () => {
    for (const L of Object.values(M.LAYOUTS)) {
      M.SITES.forEach((q, k) => {
        const [cx, cy] = M.toFrame(L, q);
        for (let a = 0; a < 16; a++) {
          const x = cx + 6.5 * Math.cos((a * Math.PI) / 8), y = cy + 6.5 * Math.sin((a * Math.PI) / 8);
          const t = M.fromFrame(L, x, y);
          expect(M.nearestSite(t[0], t[1], M.HIT_R / L.torso.s)).toBe(k);
        }
      });
    }
  });
});

describe('electrode-walk: cable map algebra', () => {
  it('swapSites is an involution and cableAt inverts the map', () => {
    const m = M.swapSites(M.IDENTITY, 1, 2);
    expect(m).toEqual([0, 2, 1, 3, 4, 5]);
    expect(M.swapSites(m, 1, 2)).toEqual([...M.IDENTITY]);
    const m2 = M.swapSites(M.swapSites(M.IDENTITY, 0, 4), 4, 5);
    const at = M.cableAt(m2);
    m2.forEach((s, c) => expect(at[s]).toBe(c));
  });
  it('the params map to the engine placement presets', () => {
    expect(M.toPlacement(M.mapFromParam('v2v3'))).toEqual({ V2: 'V3', V3: 'V2' });
    expect(M.toPlacement(M.mapFromParam('v1v3'))).toEqual({ V1: 'V3', V3: 'V1' });
    expect(M.toPlacement(M.mapFromParam('none'))).toEqual({});
    expect(M.isIdentity(M.mapFromParam(undefined))).toBe(true);
    expect(M.toPlacement(M.DEMO)).toEqual(PLACEMENT.v2v3.chest);
  });
});

describe('electrode-walk: physiology against the engine (syn normal 512)', () => {
  it('the V2/V3 cable swap is an exact permutation of the correct traces (PLACEMENT.v2v3, bit for bit)', () => {
    const ok = correct().signal;
    const sw = ecgOf(V2V3).signal;
    const cells = M.cellLeads(M.mapFromParam('v2v3'));
    expect(cells).toEqual(['V1', 'V3', 'V2', 'V4', 'V5', 'V6']);
    M.CHEST_IDS.forEach((cell, k) => {
      const a = sw.leads[cell], b = ok.leads[cells[k]];
      expect(a.length).toBe(b.length);
      expect(a.every((v, i) => v === b[i]), cell).toBe(true);
    });
    for (const l of ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'] as const) expect(sw.leads[l].every((v, i) => v === ok.leads[l][i]), l).toBe(true);
  });
  it('any dragged map is the engine placement: a V1/V5 drop, then a V5/V6 drop, permute exactly', () => {
    const m = M.swapSites(M.swapSites(M.IDENTITY, 0, 4), 4, 5);
    const sw = ecgOf(M.toPlacement(m)).signal;
    const ok = correct().signal;
    const cells = M.cellLeads(m);
    M.CHEST_IDS.forEach((cell, k) => expect(sw.leads[cell].every((v, i) => v === ok.leads[cells[k]][i]), cell).toBe(true));
  });
  it('R/(R+S) rises V1 → V4 with the correct order, the transition is at V3 or V4; not after the swap, and the jump is flagged', () => {
    const src = M.sourceOf(correct())!;
    expect(src).not.toBeNull();
    const r = M.cellRatios(src.site, M.IDENTITY);
    expect(M.risesToV4(r)).toBe(true);
    expect(M.jumps(r)).toEqual([]);
    expect([2, 3]).toContain(M.transitionIndex(r));
    expect(r[0]).toBeLessThan(0.5); // rS in V1
    expect(r[1]).toBeLessThan(0.5); // rS in V2
    const sw = M.cellRatios(src.site, M.DEMO);
    expect(M.risesToV4(sw)).toBe(false);
    expect(M.jumps(sw)).toEqual([2]);
    // what the cells show after the swap is what the engine's swapped recording measures
    const eng = M.siteRatios(ecgOf(V2V3).signal, src.beat);
    sw.forEach((v, k) => expect(eng[k]).toBeCloseTo(v, 12));
  });
  it('the cells use a standard gain that fits every lead (25 mm/s; 10, 5 or 2.5 mm/mV)', () => {
    const e = correct();
    const src = M.sourceOf(e)!;
    const ext = M.extents(e.signal, src.win, (x) => windowMedian(x, e.signal.fs, src.win[0], src.win[1]));
    for (const L of Object.values(M.LAYOUTS)) {
      const c = M.cellScale(L.cells[0], src.win[1] - src.win[0], ext);
      expect([10, 5, 2.5]).toContain(c.gain);
      expect(c.base - ext.up * c.gain * c.mm).toBeGreaterThanOrEqual(0);
      expect(c.base + ext.down * c.gain * c.mm).toBeLessThanOrEqual(L.cells[0].h);
    }
  });
  it('sourceOf tolerates a record without beats', () => {
    const e = correct();
    expect(M.sourceOf({ ...e, truth: { ...e.truth, beats: [] } } as Ecg)).toBeNull();
    expect(M.sourceOf(undefined)).toBeNull();
  });
});

describe('electrode-walk: what a swap draws (exact permutations, crossfaded)', () => {
  const site = [0.17, 0.38, 0.66, 0.88, 0.95, 0.95];
  it('a cell only ever shows true source sites, with weights summing to 1, at every stage of a change and of the crossing', () => {
    const prev = M.IDENTITY, map = M.swapSites(M.IDENTITY, 0, 4);
    for (const mx of [0, 0.3, 1])
      for (const tm of [0, 0.5, 1])
        for (const tour of [0, 0.4, 1])
          for (let k = 0; k < 6; k++) {
            const ls = M.cellLayers(k, { prev, map, mx, tm, tour });
            expect(ls.reduce((a, [, w]) => a + w, 0)).toBeCloseTo(1, 2);
            const allowed = [prev[k], map[k], M.IDENTITY[k], M.DEMO[k]];
            for (const [s] of ls) expect(allowed).toContain(s);
          }
    // held states: one layer, the map's own source
    expect(M.cellLayers(1, { prev: M.IDENTITY, map: M.IDENTITY, mx: 1, tm: 0, tour: 1 })).toEqual([[1, 1]]);
    expect(M.cellLayers(1, { prev: M.IDENTITY, map: M.IDENTITY, mx: 1, tm: 1, tour: 1 })).toEqual([[2, 1]]);
  });
  it('the two demo bars slide past each other and land on the other slot; the jump turns red only on the demo map', () => {
    const s = { prev: M.IDENTITY, map: M.IDENTITY, mx: 1, tm: 0, tour: 1 };
    expect(M.barSlot(1, s)).toBe(1);
    expect(M.barSlot(1, { ...s, tm: 1 })).toBe(2);
    expect(M.barSlot(2, { ...s, tm: 1 })).toBe(1);
    expect(M.barSlot(4, { ...s, tm: 1 })).toBe(4);
    expect(M.jumpLabelOn(s, site, 0)).toBe(0);
    expect(M.jumpLabelOn(s, site, 1)).toBe(1);
    // after the crossing, bar 1 (value of V2) sits in slot 2, below V2's slot value (V3's) → red
    expect(M.barErr(1, { ...s, tm: 1 }, site, 1)).toBe(1);
    expect(M.barErr(2, { ...s, tm: 1 }, site, 1)).toBe(0);
    // a dragged swap shows its jump once the learner's map is drawn (after the tour)
    const sw = { prev: M.IDENTITY, map: M.mapFromParam('v2v3'), mx: 1, tm: 0, tour: 0 };
    expect(M.jumpLabelOn(sw, site, 0)).toBe(1);
    expect(M.siteNames(1, sw)).toEqual([[2, 1]]);
    expect(M.siteWrong(1, sw)).toBe(1);
    expect(M.siteWrong(0, sw)).toBe(0);
  });
  it("the tour is independent of the learner's map: with map = v2v3 every beat shows what its narration says", () => {
    const map = M.mapFromParam('v2v3');
    const B = M.TIMELINE_BEATS;
    const at = (k: number, l: number) => M.frame(B[k].from + l * (B[k].to - B[k].from), { transition: M.transitionIndex(site) });
    const mixAt = (f: M.Frame): M.SwapMix => ({ prev: map, map, mx: 1, tm: f.traceMix, tour: f.tourOn });
    // beat 3 (walk, "no jumps"): the correct placement, no red, no jump label, the six cells in order
    for (const l of [0.2, 0.6, 1]) {
      const f = at(2, l), s = mixAt(f);
      expect(f.tourOn).toBe(1);
      for (let k = 0; k < 6; k++) expect(M.cellLayers(k, s)).toEqual([[k, 1]]);
      expect(M.jumpLabelOn(s, site, f.jumpOn)).toBe(0);
      for (let k = 0; k < 6; k++) expect(M.barErr(k, s, site, f.jumpOn)).toBe(0);
      expect(M.transitionMark(s, site).x).toBe(M.transitionIndex(site));
    }
    // beat 4 middle ("swap two cables and the staircase breaks"): DEMO is drawn and the jump is flagged
    const mid = at(3, 0.6), sm = mixAt(mid);
    for (let k = 0; k < 6; k++) expect(M.cellLayers(k, sm)).toEqual([[M.DEMO[k], 1]]);
    expect(M.jumpLabelOn(sm, site, mid.jumpOn)).toBe(1);
    expect(M.jumps(M.cellRatios(site, M.DEMO))).toEqual([2]);
    // the "before" row is DEMO on the block's sites, whatever the map: it has the jump its label names
    expect(M.jumps(M.cellRatios(site, M.DEMO)).length).toBeGreaterThan(0);
    // end of the tour: the learner's own map, with its jump
    const end = M.frame(1, { transition: M.transitionIndex(site) }), se = mixAt(end);
    expect(end.tourOn).toBe(0);
    for (let k = 0; k < 6; k++) expect(M.cellLayers(k, se)).toEqual([[map[k], 1]]);
    expect(M.jumpLabelOn(se, site, end.jumpOn)).toBe(1);
    // and the hand-over at the end of beat 4 is continuous (the tour has already put the cells back in order)
    const b4 = M.frame(B[3].to - 1e-9, { transition: 2 }), b5 = M.frame(B[4].from + 1e-9, { transition: 2 });
    expect(Math.abs(b4.tourOn - b5.tourOn)).toBeLessThan(1e-6);
    expect(b4.traceMix).toBe(0);
  });
  it('the transition marker tweens between the two maps of a change (no teleport) and fades where one has none', () => {
    const sw = M.swapSites(M.IDENTITY, 1, 3); // V2 ↔ V4: the transition moves V3 → V2
    const a = M.transitionIndex(site)!, b = M.transitionIndex(M.cellRatios(site, sw))!;
    expect(b).not.toBe(a);
    let last = a;
    for (let i = 1; i <= 100; i++) {
      const m = M.transitionMark({ prev: M.IDENTITY, map: sw, mx: i / 100, tm: 0, tour: 0 }, site);
      expect(Math.abs(m.x - last)).toBeLessThanOrEqual(Math.abs(b - a) / 50);
      expect(m.on).toBeCloseTo(1, 9);
      last = m.x;
    }
    expect(last).toBe(b);
    const none = [0.1, 0.2, 0.3, 0.4, 0.45, 0.48];
    expect(M.transitionMark({ prev: M.IDENTITY, map: M.IDENTITY, mx: 1, tm: 0, tour: 0 }, none).on).toBe(0);
    expect(M.transitionMark({ prev: M.IDENTITY, map: M.IDENTITY, mx: 1, tm: 0, tour: 0 }, site).on).toBe(1);
  });
  it('the live region names the jump and the transition of a map', () => {
    expect(M.mapSummary(M.IDENTITY, site)).toEqual({ jumps: [], transition: 'V3' });
    expect(M.mapSummary(M.DEMO, site)).toEqual({ jumps: ['V3'], transition: 'V2' });
  });
  it('every landmark label of the end frame is shown (only the ghost waits for its toggle), and they all sit inside the frame', () => {
    for (const L of Object.values(M.LAYOUTS)) {
      const labels = M.torsoLabels(L, M.frame(1, { transition: 2 }), 0);
      for (const b of labels) {
        if (b.key !== 'lbl_ghost') expect(b.o, b.key ?? b.text).toBe(1);
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x).toBeLessThanOrEqual(L.w);
        expect(b.y).toBeGreaterThan(0);
        expect(b.y).toBeLessThanOrEqual(L.h);
      }
      expect(labels.filter((b) => b.key === 'lbl_chip').length).toBe(2);
      expect(M.torsoLabels(L, M.frame(1, { transition: 2 }), 1).find((b) => b.key === 'lbl_ghost')!.o).toBe(1);
    }
  });
});
