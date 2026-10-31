/**
 * Tests of the "triangle-to-wheel" scene (docs/design/f-explainers.md §4.4). Owned by the scene author: the scene's pure
 * maths (src/figures/scenes/triangle-to-wheel.math.ts — beats tile, continuity frame(to_k) ≈ frame(from_k+1), end-frame
 * completeness, the physiology facts of §4.4). The registry / strings checks stay in tests/figures/scene/.
 */
import { describe, expect, it } from 'vitest';
import { LIMB_ANGLE_DEG, LIMB_LEADS } from '../../../src/core/leads';
import { angleDiff, unit } from '../../../src/figures/math/geom';
import { compileBeats } from '../../../src/figures/scene/timeline';
import { BEAT_IDS, en, es, tTriangleToWheel, zh } from '../../../src/figures/scenes/triangle-to-wheel.i18n';
import * as M from '../../../src/figures/scenes/triangle-to-wheel.math';
import { generate } from '../../../src/synth/index';
import { specOf } from '../scene/spec';

describe('triangle-to-wheel: strings contract', () => {
  const spec = specOf('triangle-to-wheel');

  it('BEAT_IDS are the spec beats in order and every beat has a caption in zh / en / es', () => {
    expect([...BEAT_IDS]).toEqual([...spec.beats]);
    for (const b of BEAT_IDS) {
      for (const d of [zh, en, es]) expect(d[`beat_${b}`].trim()).not.toBe('');
    }
  });

  it('the translator serves the title in every language under the namespace scene-triangle-to-wheel', () => {
    expect(tTriangleToWheel.ns).toBe('scene-triangle-to-wheel');
    expect(tTriangleToWheel.in('zh', 'title')).toBe(zh.title);
    expect(tTriangleToWheel.in('en', 'title')).toBe(en.title);
    expect(tTriangleToWheel.in('es', 'title')).toBe(es.title);
  });

  it('zh / en / es have the same keys and placeholders; captions within the length limits; numbers localised', () => {
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort());
    expect(Object.keys(es).sort()).toEqual(Object.keys(zh).sort());
    for (const k of Object.keys(zh) as (keyof typeof zh)[]) {
      expect(ph(en[k]), k).toEqual(ph(zh[k]));
      expect(ph(es[k]), k).toEqual(ph(zh[k]));
    }
    for (const b of BEAT_IDS) {
      expect(en[`beat_${b}`].length).toBeLessThanOrEqual(110);
      expect(zh[`beat_${b}`].length).toBeLessThanOrEqual(45);
      expect(es[`beat_${b}`].length).toBeLessThanOrEqual(130);
    }
    expect(es.beat_augment).toContain('1,5');
    expect(en.beat_augment).toContain('1.5');
    expect(es.lbl_aVF).toContain('1,5');
    expect(Object.values(es).join(' ')).toMatch(/derivaci[oó]n/);
    // the identity read-out is filled by the scene in every language
    expect(tTriangleToWheel.in('es', 'lbl_identity', { i: '0,40', iii: '0,30', ii: '0,70', d: '0,00' })).toBe('I + III − II = 0,40 + 0,30 − 0,70 = 0,00 mV');
  });
});

const ecg = generate({ scenario: 'normal', seed: 311 }).ecg;
const beats = ecg.truth!.beats;
const beat = beats[M.chooseBeat(beats)];
const src = M.sourceOf(ecg.signal, beat);
const tl = compileBeats(M.BEATS);
const state: M.FrameState = { uStar: src.uStar };

describe('triangle-to-wheel: one source (the block ECG, seed 311)', () => {
  it('the leads re-assembled from φ_RA, φ_LA, φ_LL equal the recorded limb leads within 1e-4 mV', () => {
    const phi = M.potentialsFromSignal(ecg.signal);
    const re = M.assembleLimbLeads(phi);
    for (const l of LIMB_LEADS) {
      const rec = ecg.signal.leads[l];
      let worst = 0;
      for (let i = 0; i < rec.length; i++) worst = Math.max(worst, Math.abs(re[l][i] - rec[i]));
      expect(worst, l).toBeLessThan(1e-4);
    }
  });

  it('the potentials are in the WCT gauge (sum 0) and the augmented leads are 1.5 × the limb potential', () => {
    const phi = M.potentialsFromSignal(ecg.signal);
    const re = M.assembleLimbLeads(phi);
    let sum = 0, aug = 0;
    for (let i = 0; i < phi.n; i++) {
      sum = Math.max(sum, Math.abs(phi.RA[i] + phi.LA[i] + phi.LL[i]));
      aug = Math.max(aug, Math.abs(re.aVF[i] - 1.5 * phi.LL[i]), Math.abs(re.aVL[i] - 1.5 * phi.LA[i]), Math.abs(re.aVR[i] - 1.5 * phi.RA[i]));
    }
    expect(sum).toBeLessThan(1e-9);
    expect(aug).toBeLessThan(1e-5);
  });

  it('max |I + III − II| < 1e-4 over the beat, and the read-out shows it at every instant', () => {
    let worst = 0, aug = 0;
    for (let j = 0; j < src.n; j++) {
      worst = Math.max(worst, Math.abs(src.leads.I[j] + src.leads.III[j] - src.leads.II[j]));
      aug = Math.max(aug, Math.abs(src.leads.aVR[j] + src.leads.aVL[j] + src.leads.aVF[j]));
    }
    expect(worst).toBeLessThan(1e-4);
    expect(aug).toBeLessThan(1e-4);
    for (let k = 0; k <= 200; k++) expect(Math.abs(M.identityAt(src, k / 200).d)).toBeLessThan(1e-4);
    // the baselines obey the law too, so the I + III overlay lands exactly on II
    expect(Math.abs(src.base.I + src.base.III - src.base.II)).toBeLessThan(1e-6);
  });

  it('the window is beatWindow of the chosen beat; the held instant lies in the QRS; the mean QRS agrees with the truth', () => {
    expect(src.win[0]).toBeLessThan(beat.qrsOn);
    expect(src.win[1]).toBeGreaterThan(beat.tOff);
    const tStar = M.timeOfU(src, src.uStar);
    expect(tStar).toBeGreaterThanOrEqual(beat.qrsOn - 2);
    expect(tStar).toBeLessThanOrEqual(beat.qrsOff + 2);
    expect(M.uOfTime(src, tStar)).toBeCloseTo(src.uStar, 9);
    expect(Math.abs(angleDiff(src.meanDeg, ecg.truth!.axisDeg.qrs))).toBeLessThan(10);
  });

  it('the instantaneous vector reproduces I and II exactly (frontalVectorOfLeads is the inverse)', () => {
    for (const j of [0, Math.floor(src.n / 3), Math.floor(src.n / 2), src.n - 1]) {
      const v = M.limbLeadsOfVector([src.vx[j], src.vy[j]]);
      expect(v.I).toBeCloseTo(src.leads.I[j] - src.base.I, 5);
      expect(v.II).toBeCloseTo(src.leads.II[j] - src.base.II, 5);
    }
  });

  it('the read-out arithmetic is consistent at 0.01 mV at every instant (shown II = shown I + shown III, d = 0.00)', () => {
    for (let k = 0; k <= 400; k++) {
      const r = M.readout(M.instantAt(src, M.timeOfU(src, k / 400)).leads);
      expect(Math.round(r.II * 100)).toBe(Math.round(r.I * 100) + Math.round(r.III * 100));
      expect(r.d).toBe(0);
      const raw = M.instantAt(src, M.timeOfU(src, k / 400)).leads.II;
      expect(Math.abs(r.II - raw)).toBeLessThanOrEqual(0.0151);
    }
  });

  it('traces stay within 300 points', () => {
    const d = M.tracePath(src.leads.II, src.base.II, 300, 40);
    expect((d.match(/[ML]/g) ?? []).length).toBeLessThanOrEqual(301);
  });
});

describe('triangle-to-wheel: lead geometry', () => {
  it('frontalVectorOfLeads round-trips limbLeadsOfVector for 36 angles; identities hold', () => {
    for (let k = 0; k < 36; k++) {
      const deg = -180 + k * 10;
      const v = unit(deg).map((c) => 1.3 * c) as [number, number];
      const l = M.limbLeadsOfVector(v);
      const back = M.frontalVectorOfLeads(l.I, l.II);
      expect(back[0]).toBeCloseTo(v[0], 12);
      expect(back[1]).toBeCloseTo(v[1], 12);
      expect(l.I + l.III - l.II).toBeCloseTo(0, 12);
      expect(l.aVR + l.aVL + l.aVF).toBeCloseTo(0, 12);
      expect(l.aVF).toBeCloseTo((l.II + l.III) / 2, 12);
      // I, II, III are unit projections; the augmented leads 0.866 × the unit projection
      expect(l.II).toBeCloseTo(1.3 * Math.cos(((deg - 60) * Math.PI) / 180), 12);
      expect(l.aVL).toBeCloseTo(1.3 * (Math.sqrt(3) / 2) * Math.cos(((deg + 30) * Math.PI) / 180), 12);
    }
  });

  it('the axes derived from the electrodes are 0 / 60 / 120 / −150 / −30 / 90 (the hexaxial table)', () => {
    const want = { I: 0, II: 60, III: 120, aVR: -150, aVL: -30, aVF: 90 } as const;
    for (const l of LIMB_LEADS) {
      expect(M.derivedAxisDeg(l), l).toBeCloseTo(want[l], 9);
      expect(want[l]).toBe(LIMB_ANGLE_DEG[l]);
    }
    expect([...M.NEG_POLE_DEG].map(Math.round)).toEqual([180, -120, -60, 30, 150, -90]);
  });

  it('the drawn arrows point along the derived axes, on the triangle and after sliding to one centre of radius √3/2 · R', () => {
    const end = M.frame(1, tl.beats, state);
    const tri = M.frame(tl.beats[1].to, tl.beats, state);
    for (const pl of [M.WIDE, M.NARROW]) {
      for (const l of LIMB_LEADS) {
        const frames = (M.AUGMENTED as readonly string[]).includes(l) ? [end] : [tri, end];
        for (const f of frames) {
          const { tail, head } = M.axisSegment(pl, l, f);
          expect(Math.atan2(head[1] - tail[1], head[0] - tail[0]) * (180 / Math.PI), l).toBeCloseTo(LIMB_ANGLE_DEG[l], 9);
        }
        const { tail, head } = M.axisSegment(pl, l, end);
        expect((tail[0] + head[0]) / 2).toBeCloseTo(pl.cx, 9);
        expect((tail[1] + head[1]) / 2).toBeCloseTo(pl.cy, 9);
        expect(Math.hypot(head[0] - tail[0], head[1] - tail[1]) / 2).toBeCloseTo(M.wheelR(pl), 9);
      }
      // on the triangle the sides join the electrodes (− at the tail, + at the head)
      const s = M.axisSegment(pl, 'III', tri);
      expect(s.tail[0]).toBeCloseTo(M.electrodeAt(pl, 'LA')[0], 9);
      expect(s.head[1]).toBeCloseTo(M.electrodeAt(pl, 'LL')[1], 9);
    }
  });

  it('perpendicular pairs are 90° apart; Cabrera order is aVL, I, −aVR, II, aVF, III (30° steps); groups', () => {
    for (const [a, b] of M.PAIRS) expect(Math.abs(angleDiff(LIMB_ANGLE_DEG[a], LIMB_ANGLE_DEG[b]))).toBe(90);
    expect(M.CABRERA_ORDER).toEqual(['aVL', 'I', 'aVR', 'II', 'aVF', 'III']);
    const deg = M.CABRERA_ORDER.map((l) => (l === 'aVR' ? 30 : LIMB_ANGLE_DEG[l]));
    for (let i = 1; i < deg.length; i++) expect(deg[i] - deg[i - 1]).toBe(30);
    expect(M.partnerOf('aVL')).toBe('II');
    expect(M.groupOf('aVF')).toBe('inferior');
    expect(M.groupOf('aVL')).toBe('lateral');
    expect(M.groupOf('aVR')).toBeNull();
  });

  it('both placements fit their frame (diagram, meters, rows)', () => {
    for (const pl of [M.WIDE, M.NARROW]) {
      expect(pl.cy - 1.62 * pl.R).toBeGreaterThanOrEqual(0);
      // the lowest label (aVF where LL's label was) stays above the meters
      if (pl.kind === 'narrow') expect(pl.cy + pl.R + 20 + pl.font).toBeLessThanOrEqual(pl.meters.y);
      else {
        expect(pl.cy + pl.R + 20 + pl.font).toBeLessThanOrEqual(pl.h);
        expect(pl.cx + 1.25 * pl.R).toBeLessThanOrEqual(pl.meters.x);
      }
      expect(pl.rows.y + pl.rows.h).toBeLessThanOrEqual(pl.h);
      expect(pl.meters.x + pl.meters.w).toBeLessThanOrEqual(pl.w);
      expect(M.rowY(pl, 5) + pl.rowH).toBeCloseTo(pl.rows.y + pl.rows.h, 9);
      expect(M.rowY(pl, 1) - M.rowY(pl, 0)).toBeGreaterThan(pl.rowH);
    }
    expect(M.placementFor(390)).toBe(M.NARROW);
    expect(M.placementFor(1366)).toBe(M.WIDE);
  });
});

describe('triangle-to-wheel: timeline', () => {
  const keys = (f: M.Frame) => Object.keys(f) as (keyof M.Frame)[];

  it('beats tile [0, 1] in spec order; the first sweep is about ×6 slow motion', () => {
    expect(tl.beats.map((b) => b.id)).toEqual([...BEAT_IDS]);
    expect(tl.beats[0].from).toBe(0);
    expect(tl.beats[tl.beats.length - 1].to).toBe(1);
    for (let i = 1; i < tl.beats.length; i++) expect(tl.beats[i].from).toBe(tl.beats[i - 1].to);
    expect(M.sweepSlow(src.win[1] - src.win[0])).toBeGreaterThan(5);
    expect(M.sweepSlow(src.win[1] - src.win[0])).toBeLessThan(7);
  });

  it('no cuts: frame(to_k) = frame(from_k+1) within 1e-9 at every boundary (default state)', () => {
    for (let k = 0; k + 1 < tl.beats.length; k++) {
      const b = tl.beats[k].to;
      const a = M.frame(b - 1e-13, tl.beats, state);
      const c = M.frame(b, tl.beats, state);
      for (const key of keys(a)) expect(Math.abs(a[key] - c[key]), `${key} at ${tl.beats[k].id}→${tl.beats[k + 1].id}`).toBeLessThan(1e-9);
    }
  });

  it('every value moves continuously inside the beats (no jump between neighbouring frames)', () => {
    let prev = M.frame(0, tl.beats, state);
    for (let i = 1; i <= 8000; i++) {
      const f = M.frame(i / 8000, tl.beats, state);
      for (const key of keys(f)) expect(Math.abs(f[key] - prev[key]), `${key} at p=${i / 8000}`).toBeLessThan(0.05);
      prev = f;
    }
  });

  it('the instant sweeps the whole beat in the first narration beat and holds in the QRS at the end', () => {
    expect(M.frame(0, tl.beats, state).u).toBe(0);
    expect(M.frame(tl.beats[0].to, tl.beats, state).u).toBeCloseTo(1, 9);
    expect(M.frame(1, tl.beats, state).u).toBeCloseTo(src.uStar, 12);
  });

  it('end frame is complete: wheel, labels, strips, overlay, pairs, mean vector and identity line all shown', () => {
    const f = M.frame(1, tl.beats, state);
    for (const key of ['growI', 'growII', 'growIII', 'revI', 'revII', 'revIII', 'lift', 'merge', 'drop', 'readout', 'augSum', 'slide', 'degA', 'augGrow', 'fAug', 'augRows', 'augSlide', 'degB', 'ring', 'degC', 'mean', 'pair0', 'pair1', 'pair2', 'identity', 'meterRev', 'wct'] as const) {
      expect(f[key], key).toBeCloseTo(1, 9);
    }
    expect(f.ghost).toBeGreaterThan(0.2);
    for (const key of ['hi0', 'hi1', 'hi2', 'fly', 'fSides', 'slow1', 'slow2'] as const) expect(f[key], key).toBeCloseTo(0, 9);
    for (const l of LIMB_LEADS) expect(M.rowReveal(f, l)).toBeCloseTo(1, 9);
  });

  it('each beat end frame shows what its caption says', () => {
    const end = (id: (typeof BEAT_IDS)[number]) => M.frame(tl.beats[BEAT_IDS.indexOf(id)].to - 1e-13, tl.beats, state);
    expect(end('potentials').meterRev).toBeCloseTo(1, 6);
    const d = end('difference');
    expect([d.revI, d.revII, d.revIII, d.growI, d.growII, d.growIII].every((x) => x > 0.999)).toBe(true);
    expect(end('law').drop).toBeCloseTo(1, 6);
    expect(end('slide').degA).toBeCloseTo(1, 6);
    expect(end('augment').degB).toBeCloseTo(1, 6);
  });

  it('a pen is only ever drawn on the trace being swept: pen = frame().u; the augmented rows fade in whole, without a pen', () => {
    let seen = 0;
    for (let i = 0; i <= 20000; i++) {
      const f = M.frame(i / 20000, tl.beats, state);
      for (const l of LIMB_LEADS) {
        const rd = M.rowDraw(f, l);
        if ((M.AUGMENTED as readonly string[]).includes(l)) {
          expect(rd.pen, l).toBeNull();
          expect(rd.clip).toBe(1);
          expect(rd.op).toBe(f.augRows);
          continue;
        }
        expect(rd.clip).toBe(M.rowReveal(f, l));
        if (rd.pen == null) continue;
        seen++;
        expect(Math.abs(rd.pen - f.u), `${l} at p=${i / 20000}`).toBeLessThan(1e-9);
      }
    }
    expect(seen).toBeGreaterThan(1000);
  });

  it('the identity read-out first appears with non-trivial numbers (the instant is already in the QRS)', () => {
    let first = -1;
    for (let i = 0; i <= 20000 && first < 0; i++) if (M.frame(i / 20000, tl.beats, state).readout > 0.5) first = i / 20000;
    expect(first).toBeGreaterThan(0);
    const f = M.frame(first, tl.beats, state);
    expect(f.u).toBeCloseTo(src.uStar, 9);
    const id = M.identityAt(src, f.u);
    expect(Math.abs(id.I)).toBeGreaterThan(0.1);
    expect(Math.abs(id.II)).toBeGreaterThan(0.1);
    // and the read-out is still invisible while the instant glides back from the end of the window
    for (let i = 0; i <= 2000; i++) {
      const g = M.frame(tl.beats[2].from + ((tl.beats[2].to - tl.beats[2].from) * i) / 2000, tl.beats, state);
      if (Math.abs(g.u - src.uStar) > 1e-6) expect(g.readout).toBe(0);
    }
  });

  it('slow-motion tags: ×6 for the single sweep of beat 1, ×2 for the two sweeps of beat 2, shown only while they play', () => {
    expect(M.slowFactors(src.win[1] - src.win[0])).toEqual([6, 2]);
    const mid = (k: number) => M.frame((tl.beats[k].from + tl.beats[k].to) / 2, tl.beats, state);
    expect(mid(0).slow1).toBeCloseTo(1, 9);
    expect(mid(0).slow2).toBe(0);
    expect(mid(1).slow2).toBeCloseTo(1, 9);
    expect(mid(1).slow1).toBeCloseTo(0, 9);
    for (const k of [2, 3, 4, 5]) expect(mid(k).slow1 + mid(k).slow2, `beat ${k}`).toBe(0);
  });
});

describe('triangle-to-wheel: what the labels claim', () => {
  it('the mean QRS label and arrow use the engine truth axis of the block ECG (the grading axis)', () => {
    expect(M.meanAxisDeg(src, ecg.truth)).toBe(ecg.truth!.axisDeg.qrs);
    expect(M.meanAxisDeg(src, null)).toBe(src.meanDeg);
    expect(M.meanAxisDeg(src, { axisDeg: { qrs: Number.NaN } })).toBe(src.meanDeg);
  });

  it('the fourth meter is the gauge Σφ = φRA + φLA + φLL, 0 at every instant by construction (not a recorded potential)', () => {
    for (let k = 0; k <= 400; k++) {
      const phi = M.instantAt(src, M.timeOfU(src, k / 400)).phi;
      expect(Math.abs(phi.RA + phi.LA + phi.LL)).toBeLessThan(1e-9);
    }
    for (const d of [zh, en, es]) expect(d.lbl_wctShort).toBe('Σφ');
    expect(en.lbl_wct).toContain('a reference, not a true zero');
    expect(es.lbl_wct).toContain('una referencia, no un cero verdadero');
    expect(zh.lbl_wct).toContain('不是真正的零电位');
  });

  it('lead-group names exist in every language; the group labels sit inside their sectors', () => {
    for (const d of [zh, en, es]) for (const k of ['lbl_inferior', 'lbl_lateral'] as const) expect(d[k].trim()).not.toBe('');
    for (const pl of [M.WIDE, M.NARROW]) {
      for (const [g, lo, hi] of [['inferior', 60, 120], ['lateral', -30, 0]] as const) {
        const [x, y] = M.groupLabelAt(pl, g);
        const deg = Math.atan2(y - pl.cy, x - pl.cx) * (180 / Math.PI);
        expect(deg).toBeGreaterThan(lo);
        expect(deg).toBeLessThan(hi);
        expect(Math.hypot(x - pl.cx, y - pl.cy)).toBeLessThan(M.wheelR(pl));
      }
    }
  });
});
