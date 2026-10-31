/**
 * Tests of the "conduction-journey" scene (docs/design/f-explainers.md §4.1): beats tile, continuity at the beat
 * boundaries, end-frame completeness, the physiology facts of §4.1 on the block's ECG (syn('normal', 111)) and the
 * schematic path, and the i18n completeness of the beat captions and labels. The registry / strings checks stay in
 * tests/figures/scene/.
 */
import { describe, expect, it } from 'vitest';
import { generate } from '../../../src/synth';
import { statesFromRegions } from '../../../src/figures/math/conduction';
import { pOfTime, timeOfP } from '../../../src/figures/scene/timeline';
import { BEAT_IDS, en, es, tConductionJourney, zh } from '../../../src/figures/scenes/conduction-journey.i18n';
import * as M from '../../../src/figures/scenes/conduction-journey.math';
import { specOf } from '../scene/spec';

describe('conduction-journey: strings contract', () => {
  const spec = specOf('conduction-journey');

  it('BEAT_IDS are the spec beats in order and every beat has a caption in zh / en / es', () => {
    expect([...BEAT_IDS]).toEqual([...spec.beats]);
    for (const b of BEAT_IDS) {
      for (const d of [zh, en, es]) expect(d[`beat_${b}`].trim()).not.toBe('');
    }
  });

  it('the translator serves the title in every language under the namespace scene-conduction-journey', () => {
    expect(tConductionJourney.ns).toBe('scene-conduction-journey');
    expect(tConductionJourney.in('zh', 'title')).toBe(zh.title);
    expect(tConductionJourney.in('en', 'title')).toBe(en.title);
    expect(tConductionJourney.in('es', 'title')).toBe(es.title);
  });

  it('every label key exists in all three languages; criteria numbers follow docs/curriculum/criteria.md', () => {
    const keys = Object.keys(zh).sort();
    expect(Object.keys(en).sort()).toEqual(keys);
    expect(Object.keys(es).sort()).toEqual(keys);
    for (const d of [zh, en, es]) {
      expect(d.lbl_p).toBe('P < 120 ms');
      expect(d.lbl_pr).toBe('PR 120–200 ms');
      expect(d.lbl_qrs).toBe('QRS < 110 ms');
      expect(d.lbl_rateSa).toMatch(/^60–100 /);
      expect(d.lbl_rateAv).toMatch(/^35–60 /);
      expect(d.lbl_rateV).toMatch(/^20–40 /);
      expect(d.lbl_speedHis).toBe('2–4 m/s');
    }
    expect(en.lbl_speedAv).toBe('0.02–0.05 m/s');
    expect(es.lbl_speedAv).toBe('0,02–0,05 m/s');
    expect(es.lbl_rateSa).toContain('lpm');
    expect(tConductionJourney.in('es', 'lbl_phase', { n: 3 })).toBe('fase 3');
    expect(tConductionJourney.in('zh', 'lbl_phase', { n: 0 })).toContain('0');
  });
});

const ecg = generate({ scenario: 'normal', seed: 111 }).ecg;
const truth = ecg.truth!;
const src = M.ecgSource(ecg)!;
const noRegions = M.ecgSource({ ...ecg, regions: null })!;
const schem = M.schematicSource();
const beatOf = (s: M.JourneySource, id: M.BeatId) => s.timeline.beats.find((b) => b.id === id)!;
const win = (s: M.JourneySource) => s.timeline.window!;
const flat = (fr: M.Frame): number[] => [
  fr.t,
  fr.mv,
  fr.penGlow,
  fr.avArc,
  fr.lblP,
  fr.ladder,
  fr.chipAv,
  fr.prGrow,
  fr.lblPr,
  fr.chipHis,
  fr.qrsGrow,
  fr.lblQrs,
  fr.lblSt,
  fr.lblT,
  fr.moral,
  fr.apMv / 130, // mV over the inset range
  ...M.CHAMBERS.map((k) => fr.anat.fill[k]),
  // visible ink of each wire (a wire's opacity resets while its reveal is 0)
  ...M.WIRES.map((k) => fr.anat.wire[k] * fr.anat.wireOp[k]),
];

describe('conduction-journey: timeline', () => {
  it('follows a sinus beat with its whole window inside the record, near the middle', () => {
    const k = M.pickBeat(truth.beats, ecg.signal.durationMs);
    const b = truth.beats[k];
    expect(b.kind).toBe('sinus');
    expect(b.pOn).not.toBeNull();
    expect(src.beat).toBe(b);
    expect(win(src)[0]).toBeGreaterThanOrEqual(0);
    expect(win(src)[1]).toBeLessThanOrEqual(ecg.signal.durationMs);
  });

  it('beats tile [0, 1] in the spec order (ECG, ECG without regions, schematic) and last ≈ 4.6 s at ×6', () => {
    for (const s of [src, noRegions, schem]) {
      const beats = s.timeline.beats;
      expect(beats.map((b) => b.id)).toEqual([...BEAT_IDS]);
      expect(beats[0].from).toBe(0);
      expect(beats[beats.length - 1].to).toBe(1);
      for (let i = 1; i < beats.length; i++) expect(beats[i].from).toBe(beats[i - 1].to);
    }
    expect(src.timeline.durationMs).toBeCloseTo((win(src)[1] - win(src)[0]) * M.SLOW, 6);
    expect(src.timeline.durationMs).toBeGreaterThan(3500);
    expect(src.timeline.durationMs).toBeLessThan(5000);
  });

  it('the qrs beat spans [qrsOn, qrsOff] of the chosen beat', () => {
    const q = beatOf(src, 'qrs');
    expect(timeOfP(win(src), q.from)).toBeCloseTo(src.beat.qrsOn, 6);
    expect(timeOfP(win(src), q.to)).toBeCloseTo(src.beat.qrsOff, 6);
    const sq = beatOf(schem, 'qrs');
    expect(timeOfP(win(schem), sq.from)).toBeCloseTo(160, 6);
    expect(timeOfP(win(schem), sq.to)).toBeCloseTo(245, 6);
  });

  it('frame reads only p: the end frame of beat k is the start frame of beat k + 1, and nothing jumps across a boundary', () => {
    for (const s of [src, schem]) {
      const beats = s.timeline.beats;
      for (let k = 0; k + 1 < beats.length; k++) {
        const a = flat(M.frame(beats[k].to, s));
        const b = flat(M.frame(beats[k + 1].from, s));
        for (let i = 0; i < a.length; i++) expect(Math.abs(a[i] - b[i])).toBeLessThanOrEqual(1e-9);
        // one ten-thousandth of the beat window either side: every motion is continuous
        const e = 1e-4;
        const lo = flat(M.frame(beats[k].to - e, s));
        const hi = flat(M.frame(beats[k + 1].from + e, s));
        for (let i = 2; i < lo.length; i++) expect(Math.abs(lo[i] - hi[i]), `${beats[k].id}→${beats[k + 1].id} #${i}`).toBeLessThan(0.05);
      }
    }
  });
});

describe('conduction-journey: physiology on syn(normal, 111)', () => {
  const sweep = (s: M.JourneySource, from: number, to: number, n = 60) => Array.from({ length: n + 1 }, (_, i) => M.frame(from + ((to - from) * i) / n, s));

  it('the pen stays on the baseline through av and his (|II| < 0.05 mV): the nodes and His–Purkinje draw nothing', () => {
    for (const s of [src, schem]) {
      for (const id of ['av', 'his'] as const) {
        const b = beatOf(s, id);
        for (const fr of sweep(s, b.from, b.to)) expect(Math.abs(fr.mv), `${id} at ${fr.t}`).toBeLessThan(0.05);
      }
    }
    // and it does draw during P, QRS and T
    const peak = (id: M.BeatId) => Math.max(...sweep(src, beatOf(src, id).from, beatOf(src, id).to, 120).map((fr) => Math.abs(fr.mv)));
    expect(peak('qrs')).toBeGreaterThan(0.4);
    expect(peak('t')).toBeGreaterThan(0.1);
    expect(peak('p')).toBeGreaterThan(0.05);
  });

  it('the pen glows on the baseline for the 40 ms before P onset while the sinus node fires', () => {
    const fr = M.frame(pOfTime(win(src), src.fid.pOn - 15), src);
    expect(fr.penGlow).toBe(1);
    expect(Math.abs(fr.mv)).toBeLessThan(0.05);
    expect(fr.anat.sa).toBeGreaterThan(0);
    expect(M.frame(pOfTime(win(src), src.fid.pOn + 30), src).penGlow).toBe(0);
  });

  it('atrial fill is > 0 only after P onset, and spreads right atrium → left atrium', () => {
    for (const s of [src, noRegions, schem]) {
      const pOn = s.fid.pOn;
      for (const fr of sweep(s, 0, pOfTime(win(s), pOn - 0.5), 40)) {
        expect(fr.anat.fill.ra).toBe(0);
        expect(fr.anat.fill.la).toBe(0);
      }
      const early = M.frame(pOfTime(win(s), pOn + 20), s);
      expect(early.anat.fill.ra).toBeGreaterThan(0);
      expect(early.anat.fill.la).toBe(0);
      const late = M.frame(pOfTime(win(s), s.fid.pOff), s);
      expect(late.anat.fill.la).toBeGreaterThan(0.5);
    }
  });

  it('the ventricles fill during the QRS (septum first, bases last), hold through ST and fade in T', () => {
    const at = (tm: number) => M.frame(pOfTime(win(src), tm), src).anat;
    const { qrsOn, qrsOff } = src.beat;
    const early = at(qrsOn + 12);
    expect(early.fill.sep).toBeGreaterThan(early.fill.base);
    expect(at(qrsOn - 2).fill.sep).toBe(0);
    const st = at((qrsOff + src.fid.tPeak) / 2);
    for (const k of ['sep', 'rv', 'lv', 'base'] as const) expect(st.fill[k], k).toBeGreaterThan(0.9);
    const end = at(win(src)[1]);
    for (const k of M.CHAMBERS) expect(end.fill[k], k).toBeLessThan(0.05);
    // the conduction system lights before the muscle
    expect(at(qrsOn - 1).wire.his).toBeGreaterThan(0.9);
  });

  it('the action-potential inset: rest before the QRS, phase 0 inside it, plateau in ST, phase 3 in T, phase 4 at the end', () => {
    const phase = (tm: number) => M.frame(pOfTime(win(src), tm), src).apPhase;
    expect(phase(src.beat.qrsOn - 10)).toBe(4);
    const q = beatOf(src, 'qrs');
    const phases = sweep(src, q.from, q.to, 200).map((fr) => fr.apPhase);
    expect(phases).toContain(0);
    expect(phase(src.beat.qrsOff + 0.25 * (src.fid.tPeak - src.beat.qrsOff))).toBe(2);
    expect(phase(src.fid.tPeak)).toBe(3);
    expect(phase(src.fid.tPeak + 20)).toBe(3);
    expect(M.frame(1, src).apPhase).toBe(4);
    expect(M.apTime(src.beat, src.beat.qrsOn)).toBe(160);
    expect(M.apTime(src.beat, src.beat.tOff)).toBeCloseTo(500, 9);
  });

  it('the end frame is complete: all five strip labels, both brackets, ladder, chips, the moral; heart in end-of-T state', () => {
    for (const s of [src, schem]) {
      const fr = M.frame(1, s);
      expect(M.stripLabels(fr)).toEqual({ p: 1, pr: 1, qrs: 1, st: 1, t: 1 });
      for (const v of [fr.ladder, fr.chipAv, fr.chipHis, fr.prGrow, fr.qrsGrow, fr.moral, fr.avArc]) expect(v).toBe(1);
      expect(fr.t).toBeCloseTo(s.fid.end, 9);
      expect(fr.penGlow).toBe(0);
    }
  });

  it('every beat end is complete on its own (prev / next and reduced motion only show ends)', () => {
    const end = (id: M.BeatId) => M.frame(beatOf(src, id).to, src);
    expect(end('p').lblP).toBe(1);
    expect(end('p').ladder).toBe(1);
    expect(end('av').lblPr).toBe(1);
    expect(end('av').prGrow).toBe(1);
    expect(end('av').chipAv).toBe(1);
    expect(end('his').chipHis).toBe(1);
    expect(end('qrs').lblQrs).toBe(1);
    expect(end('qrs').qrsGrow).toBe(1);
    expect(end('st').lblSt).toBe(1);
    expect(end('t').lblT).toBe(1);
    // and no label shows before its beat: the P end frame carries only P (no PR label, no AV speed chip)
    expect(end('p').lblPr).toBe(0);
    expect(end('p').chipAv).toBe(0);
    expect(M.frame(beatOf(src, 'av').from, src).lblPr).toBe(0);
    expect(M.frame(beatOf(src, 'qrs').from, src).lblQrs).toBe(0);
    expect(M.frame(beatOf(src, 'st').from, src).lblSt).toBe(0);
    expect(M.frame(beatOf(src, 't').from, src).lblT).toBe(0);
  });
});

describe('conduction-journey: region mapping and geometry', () => {
  it('regionFill is statesFromRegions act − recovered for one region (the same code convention)', () => {
    for (const c of [0, 0.25, 0.8, 1, 1.3, 1.9, 2]) {
      const s = statesFromRegions(['rv-mid'], [c]).rv;
      expect(M.regionFill(c)).toBeCloseTo(s.act - s.recovered, 12);
    }
    expect(M.regionRepol(1.5)).toBe(1);
    expect(M.regionRepol(2)).toBe(0);
  });

  it('every myocardial region of the engine maps to one drawn chamber', () => {
    const regions = ecg.regions!;
    const mapped = regions.ids.filter((id) => M.chamberOf(id) != null);
    const ventricular = regions.ids.filter((id) => id.startsWith('lv-') || id.startsWith('rv-'));
    expect(mapped.length).toBe(ventricular.length + 2);
    for (const k of M.CHAMBERS) expect(regions.ids.some((id) => M.chamberOf(id) === k), k).toBe(true);
  });

  it('the strip is true paper (square mm) holding the whole window and signal range in both placements', () => {
    for (const pl of [M.WIDE, M.NARROW]) {
      const g = M.stripGeom(pl.strip, win(src), src.range);
      expect(g.w).toBeLessThanOrEqual(pl.strip.w + 1e-9);
      expect(M.stripX(g, win(src)[1]) - M.stripX(g, win(src)[0])).toBeCloseTo(g.w, 9);
      expect(M.stripY(g, src.range[1])).toBeGreaterThan(g.y0);
      expect(M.stripY(g, src.range[0])).toBeLessThan(g.y0 + g.h);
      expect(pl.ap.w).toBe(120);
      expect(pl.ap.h).toBe(60);
      expect(pl.ap.y + pl.ap.h + 14).toBeLessThanOrEqual(pl.h);
    }
    expect(M.placementFor(390)).toBe(M.NARROW);
    expect(M.placementFor(1200)).toBe(M.WIDE);
  });

  it('every wire subpath is a single subpath (a pathLength=1 dash restarts on each one)', () => {
    for (const k of M.WIRES) {
      expect(M.HEART.wire[k].length, k).toBeGreaterThan(0);
      for (const d of M.HEART.wire[k]) expect(d.match(/M/g)?.length, k).toBe(1);
    }
    expect(M.HEART.wire.atrial.length).toBe(3);
    expect(M.HEART.wire.purk.length).toBe(5);
  });

  it('no speed / rate chip covers a heart name or another chip (both placements, zh / en / es)', () => {
    const gap = (a: M.Box, b: M.Box) => Math.max(b.x0 - a.x1, a.x0 - b.x1, b.y0 - a.y1, a.y0 - b.y1);
    for (const pl of [M.WIDE, M.NARROW]) {
      const H = (p: readonly [number, number]) => M.heartToStage(pl, p);
      for (const d of [zh, en, es]) {
        const names = M.NAME_IDS.map((k) => {
          const n = M.HEART.names[k];
          const [x, y] = H(n.at);
          return { k, b: M.textBox(x, y, d[`lbl_${k}`], n.anchor) };
        });
        const lad = M.HEART.ladder;
        const ladKeys = ['lbl_rateSa', 'lbl_rateAv', 'lbl_rateV'] as const;
        const chips = [
          { k: 'chipAv', b: M.chipBox(...H(M.HEART.chipAv), d.lbl_speedAv) },
          { k: 'chipHis', b: M.chipBox(...H(M.HEART.chipHis), d.lbl_speedHis) },
          ...lad.rows.map((r, i) => ({ k: ladKeys[i], b: M.chipBox(...H([lad.x, r.y]), d[ladKeys[i]], true) })),
        ];
        // the dot at the end of each strip-label leader sits clear of names and chips
        for (const id of M.LEADERS) {
          const [x, y] = H(M.HEART.target[id]);
          const dot = { x0: x - 2.5, y0: y - 2.5, x1: x + 2.5, y1: y + 2.5 };
          for (const o of [...names, ...chips]) expect(gap(dot, o.b), `${pl.id} ${d.lbl_lead}: ${id} dot vs ${o.k}`).toBeGreaterThanOrEqual(3);
        }
        for (const c of chips) {
          for (const o of [...names, ...chips]) {
            if (o === c) continue;
            expect(gap(c.b, o.b), `${pl.id} ${d.lbl_lead}: ${c.k} vs ${o.k}`).toBeGreaterThanOrEqual(2);
          }
        }
      }
    }
  });

  it('leaders run from the label through the gutter to the structure, above the trace and clear of the paper', () => {
    for (const pl of [M.WIDE, M.NARROW]) {
      const g = M.stripGeom(pl.strip, win(src), src.range);
      const rTop = M.stripY(g, src.range[1]);
      for (const [k, id] of M.LEADERS.entries()) {
        const to = M.heartToStage(pl, M.HEART.target[id]);
        const from = [M.stripX(g, src.fid.pOn + 30 * k), k < 3 ? g.y0 + 60 : g.y0 + g.h + 12] as const;
        const r = M.leaderRoute(pl, g, id, from, to);
        expect(r[0]).toEqual(from);
        expect(r[r.length - 1]).toEqual(to);
        if (k < 3) expect(M.laneY(pl, g, k), `${pl.id} ${id}`).toBeLessThan(rTop - 6);
        const gx = M.gutterX(pl, g, k);
        // the elbow into the gutter is outside the paper's x-range
        expect(gx < g.x0 || gx > g.x0 + g.w, `${pl.id} ${id}`).toBe(true);
      }
      if (pl.id === 'wide') {
        // the gutter lies between the heart's right edge (LV wall) and the paper
        const right = Math.max(...Array.from({ length: 21 }, (_, i) => M.heartToStage(pl, M.vpt(i / 20, 1))[0]));
        expect(M.gutterX(pl, g, 0)).toBeGreaterThan(right);
        expect(M.gutterX(pl, g, 0)).toBeLessThan(g.x0);
      } else {
        expect(M.gutterX(pl, g, 4)).toBeLessThan(pl.w);
        // a low-amplitude record makes the paper width-limited (as wide as the strip rect): the gutter still fits
        const flatG = M.stripGeom(pl.strip, win(src), [-0.05, 0.1]);
        expect(flatG.w).toBeCloseTo(pl.strip.w, 6);
        expect(M.gutterX(pl, flatG, 4) + 4).toBeLessThanOrEqual(pl.w);
        // the moral line moved below the strip, left of the AP inset (es is the longest)
        expect(pl.moral.y).toBeGreaterThan(g.y0 + g.h + 40);
        expect(pl.moral.x + es.lbl_moral.length * 7.6).toBeLessThan(pl.ap.x);
      }
    }
  });

  it('the ventricular outline closes at the apex and the base runs along the AV ring', () => {
    const apex = M.vpt(1, 0);
    expect(M.vpt(1, -1)[0]).toBeCloseTo(apex[0], 9);
    expect(M.vpt(1, 1)[1]).toBeCloseTo(apex[1], 9);
    expect(M.HEART.outline.startsWith('M')).toBe(true);
    for (const k of M.CHAMBERS) expect(M.HEART.chamber[k].endsWith('Z'), k).toBe(true);
  });
});
