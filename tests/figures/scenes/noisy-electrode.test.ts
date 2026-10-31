/**
 * Tests of the "noisy-electrode" scene (docs/design/f-explainers.md §4.9): the beats tile, the frame is continuous in p
 * (no cuts) and complete at p = 1, the noise factors follow from re-assembling the block's clean ECG with an artefact
 * on one electrode potential (the one-source rule), the generator is seeded, and the clean lead's QRS onsets are the
 * truth's (nothing moved). The registry / strings checks stay in tests/figures/scene/.
 */
import { describe, expect, it } from 'vitest';
import { CHEST_LEADS, LIMB_LEADS, type StdLead } from '../../../src/core/leads';
import { compileBeats } from '../../../src/figures/scene/timeline';
import { BEAT_IDS, en, es, tNoisyElectrode, zh } from '../../../src/figures/scenes/noisy-electrode.i18n';
import * as M from '../../../src/figures/scenes/noisy-electrode.math';
import { generate } from '../../../src/synth/index';
import { specOf } from '../scene/spec';

describe('noisy-electrode: strings contract', () => {
  const spec = specOf('noisy-electrode');

  it('BEAT_IDS are the spec beats in order and every beat has a caption in zh / en / es', () => {
    expect([...BEAT_IDS]).toEqual([...spec.beats]);
    for (const b of BEAT_IDS) {
      for (const d of [zh, en, es]) expect(d[`beat_${b}`].trim()).not.toBe('');
    }
  });

  it('the translator serves the title in every language under the namespace scene-noisy-electrode', () => {
    expect(tNoisyElectrode.ns).toBe('scene-noisy-electrode');
    expect(tNoisyElectrode.in('zh', 'title')).toBe(zh.title);
    expect(tNoisyElectrode.in('en', 'title')).toBe(en.title);
    expect(tNoisyElectrode.in('es', 'title')).toBe(es.title);
  });

  it('every caption, Predict text and control label resolves for every electrode and noise type in all three languages', () => {
    for (const lang of ['zh', 'en', 'es'] as const) {
      for (const e of M.ELECTRODES) {
        const vars = { e: tNoisyElectrode.in(lang, `lbl_${e}`), c: M.CULPRIT[e].clean };
        for (const k of [...BEAT_IDS.map((b) => `beat_${b}` as const), 'nar_heart_other', 'pq_ok', 'pq_wrong', 'ctl_moveTo'] as const) {
          const s = tNoisyElectrode.in(lang, k, vars);
          expect(s, `${lang}.${k}`).not.toMatch(/[{}]/);
          expect(s.trim(), `${lang}.${k}`).not.toBe('');
        }
        expect(tNoisyElectrode.in(lang, 'pq_ok', vars)).toContain(M.CULPRIT[e].clean);
      }
      for (const v of M.NOISE_TYPES) expect(tNoisyElectrode.in(lang, `ctl_${v}`).trim()).not.toBe('');
      expect(tNoisyElectrode.in(lang, 'lbl_rr', { ms: 833 })).toContain('833');
    }
  });

  it('the narration claims only what is true for every start electrode and noise type', () => {
    // beat_move is neutral: tourOrder(RA) visits the leg first, so "to the arms" would be wrong for two of three homes
    expect(en.beat_move).not.toMatch(/\barms?\b/i);
    expect(es.beat_move).not.toMatch(/brazo/i);
    expect(zh.beat_move).not.toMatch(/手臂/);
    // beat_find: the culprit's aV lead is the largest among the aV leads only (II, III and aVF all carry n with LL)
    expect(en.beat_find).toMatch(/of the aV leads/i);
    expect(es.beat_find).toMatch(/entre las aV/);
    expect(zh.beat_find).toMatch(/三个 aV 导联中/);
    // only the 5-Hz tremor mimics flutter: the other artefacts get a type-neutral heart beat and verdict
    for (const d of [zh, en, es]) {
      expect(d.nar_heart_other).not.toMatch(/flutter|flúter|扑动/i);
      expect(d.lbl_verdict_other).not.toMatch(/flutter|flúter|扑动/i);
      expect(d.nar_heart_other.length).toBeLessThanOrEqual(d === zh ? 45 : d === en ? 110 : 130);
    }
  });

  it('the in-picture numbers match docs/curriculum/criteria.md (tremor 4–6 Hz mimics flutter at about 300 /min)', () => {
    expect(M.TREMOR_HZ).toBeGreaterThanOrEqual(4);
    expect(M.TREMOR_HZ).toBeLessThanOrEqual(6);
    expect(M.TREMOR_HZ * 60).toBe(300);
    for (const d of [zh, en, es]) {
      expect(d.lbl_rate).toContain('300');
      expect(d.lbl_rate).toContain(`${M.TREMOR_HZ} Hz`);
      expect(d.ctl_mains).toContain(`${M.MAINS_HZ} Hz`);
    }
  });
});

// ── timeline and frame ──────────────────────────────────────────────────────────────────────────────────────────

const tl = compileBeats(M.BEATS, { window: [0, M.WINDOW_MS] });
const beats = tl.beats;
type Flat = Record<string, number>;
const flat = (p: number, home: M.Electrode = 'LL'): Flat => {
  const f = M.frame(p, beats, { home });
  const out: Flat = {};
  for (const [k, v] of Object.entries(f)) {
    if (typeof v === 'number') out[k] = v;
    else for (const [e, x] of Object.entries(v as Record<string, number>)) out[`${k}.${e}`] = x;
  }
  return out;
};
const maxDiff = (a: Flat, b: Flat) => Math.max(...Object.keys(a).map((k) => Math.abs(a[k] - b[k])));

describe('noisy-electrode: beats and frame', () => {
  it('the beats tile [0, 1] in the spec order; the tour is 7.5 s over a 2.5-s window (honest ×3: the cursor is the only pen)', () => {
    expect(beats.map((b) => b.id)).toEqual([...BEAT_IDS]);
    expect(beats[0].from).toBe(0);
    expect(beats[beats.length - 1].to).toBe(1);
    for (let i = 1; i < beats.length; i++) expect(beats[i].from).toBe(beats[i - 1].to);
    expect(tl.durationMs).toBe(7500);
    expect(M.SLOW).toBe(3);
  });

  it('continuity: the end frame of beat k is the start frame of beat k + 1 (both sides, ≤ 1e-9 · scale)', () => {
    for (const home of M.ELECTRODES) {
      for (let k = 0; k < beats.length - 1; k++) {
        const b = beats[k].to;
        expect(maxDiff(flat(b - 1e-12, home), flat(b + 1e-12, home)), `${home} @ ${beats[k].id}|${beats[k + 1].id}`).toBeLessThan(1e-9);
        expect(maxDiff(flat(b, home), flat(beats[k + 1].from, home))).toBe(0);
      }
    }
  });

  it('no cuts anywhere: a 1e-4 step in p moves no frame value by more than 0.02', () => {
    for (const home of M.ELECTRODES) {
      let prev = flat(0, home);
      for (let i = 1; i <= 10000; i++) {
        const cur = flat(i / 10000, home);
        expect(maxDiff(prev, cur), `${home} @ p = ${i / 10000}`).toBeLessThan(0.02);
        prev = cur;
      }
    }
  });

  it('the crossfade weights always sum to 1 and visit LL → LA → RA → LL during move and heart', () => {
    for (let i = 0; i <= 200; i++) {
      const w = M.frame(i / 200, beats, { home: 'LL' }).w;
      expect(w.RA + w.LA + w.LL).toBeCloseTo(1, 12);
    }
    const mv = beats[2];
    const at = (x: number) => M.dominant(M.frame(mv.from + (mv.to - mv.from) * x, beats, { home: 'LL' }).w);
    expect([at(0), at(0.45), at(0.95)]).toEqual(['LL', 'LA', 'RA']);
    expect(M.dominant(M.frame(1, beats, { home: 'LL' }).w)).toBe('LL');
  });

  it('start frame: the clean strips with no noise (the cursor is the moving element); end frame complete on its own (noise on home, chips, rule, 3 rows, outline, verdict)', () => {
    const f0 = M.frame(0, beats, { home: 'LL' });
    expect(f0.gain).toBe(0);
    expect(f0.chips).toBe(0);
    expect(Object.keys(f0)).not.toContain('reveal'); // no fast pre-draw that would outrun the shared ECG cursor
    for (const home of M.ELECTRODES) {
      const f = M.frame(1, beats, { home });
      expect(f.pulse).toBe(0);
      for (const k of ['gain', 'chips', 'hi', 'rule', 'outline', 'verdict'] as const) expect(f[k], k).toBe(1);
      for (const e of M.ELECTRODES) expect(f.rows[e], e).toBe(1);
      expect(f.w[home]).toBe(1);
    }
  });

  it('every beat end is complete too (prev / next land there): the noise and its chips are on from shake on', () => {
    for (const b of beats) {
      const f = M.frame(b.to, beats, { home: 'LL' });
      expect(f.gain).toBe(1);
      expect(f.chips).toBe(1);
    }
  });

  it('blendWeights (click crossfade) sums to 1 and ends on the new state', () => {
    const a = M.frame(1, beats, { home: 'LL' }).w;
    const b = M.frame(1, beats, { home: 'RA' }).w;
    for (const x of [0, 0.3, 1]) {
      const w = M.blendWeights(a, b, x);
      expect(w.RA + w.LA + w.LL).toBeCloseTo(1, 12);
    }
    expect(M.blendWeights(a, b, 1)).toEqual(b);
  });

  it('a reveal crossfade blends the table rows of the two tour orders too: no row re-maps in one frame', () => {
    for (let i = 0; i <= 100; i++) {
      const p = i / 100;
      const a = M.frame(p, beats, { home: 'LL' }).rows;
      const b = M.frame(p, beats, { home: 'RA' }).rows;
      expect(M.blendWeights(a, b, 0)).toEqual(a);
      expect(M.blendWeights(a, b, 1)).toEqual(b);
      let prev = M.blendWeights(a, b, 0);
      for (let k = 1; k <= 50; k++) {
        const cur = M.blendWeights(a, b, k / 50);
        for (const e of M.ELECTRODES) expect(Math.abs(cur[e] - prev[e])).toBeLessThanOrEqual(1 / 50 + 1e-12);
        prev = cur;
      }
    }
  });

  it('placements: every strip, the torso and the table fit the fixed frame; hit targets clear the strips', () => {
    for (const pl of [M.PLACEMENT_WIDE, M.PLACEMENT_NARROW]) {
      const rects = [pl.torso, ...LIMB_LEADS.map((l) => pl.limb[l]), ...CHEST_LEADS.map((l) => pl.chest[l])];
      for (const r of rects) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(pl.w + 1e-9);
        expect(r.y + r.h).toBeLessThanOrEqual(pl.h + 1e-9);
      }
      expect(pl.table.y + 16 + pl.table.row * 3).toBeLessThanOrEqual(pl.h);
      for (const e of M.ELECTRODES) {
        const [x, y] = M.plugAt(pl, e);
        expect(x - M.HIT_R).toBeGreaterThanOrEqual(pl.torso.x - 8);
        expect(x + M.HIT_R).toBeLessThanOrEqual(pl.torso.x + pl.torso.w + 8);
        expect(y + M.HIT_R).toBeLessThanOrEqual(pl.torso.y + pl.torso.h + 8);
      }
      for (const l of M.ALL_LEADS) expect(M.stripRect(pl, l)).toBe(M.isLimb(l) ? pl.limb[l as M.LimbLead] : pl.chest[l as M.ChestLead]);
    }
    expect(M.placementFor(1200)).toBe(M.PLACEMENT_WIDE);
    expect(M.placementFor(390)).toBe(M.PLACEMENT_NARROW);
  });

  it('electrode hit targets stay >= 24 px at the smallest width of each placement (README §7)', () => {
    // wide from 560 px: the 760-unit stage is drawn at >= 560 / 760
    expect(M.placementFor(560)).toBe(M.PLACEMENT_WIDE);
    expect(2 * M.HIT_R * (560 / M.PLACEMENT_WIDE.w)).toBeGreaterThanOrEqual(24);
    // narrow at a 390-px phone (342 px of stage after the page gutters)
    expect(2 * M.HIT_R * (342 / M.PLACEMENT_NARROW.w)).toBeGreaterThanOrEqual(24);
  });

  it('factor chips read +n / −½n / 0 / −⅓n', () => {
    expect(M.factorLabel(1)).toBe('+n');
    expect(M.factorLabel(-1)).toBe('−n');
    expect(M.factorLabel(-0.5)).toBe('−½n');
    expect(M.factorLabel(0)).toBe('0');
    expect(M.factorLabel(-1 / 3)).toBe('−⅓n');
  });
});

// ── physiology: one source, the noise factors, the march-through ───────────────────────────────────────────────

const ecg = generate({ scenario: 'normal', seed: 618 }).ecg;
const sig = ecg.signal;
const truth = ecg.truth!.beats;
const win = M.chooseWindow(
  truth.map((b) => b.qrsOn),
  sig.durationMs,
);
const { i0, n } = M.sampleRange(sig, win);
const ALL: readonly StdLead[] = [...LIMB_LEADS, ...CHEST_LEADS];

describe('noisy-electrode: one-source re-assembly of the block ECG', () => {
  it('the window is 2.5 s inside the record and holds three QRS complexes at the record RR', () => {
    expect(win[1] - win[0]).toBe(M.WINDOW_MS);
    expect(win[0]).toBeGreaterThanOrEqual(0);
    expect(win[1]).toBeLessThanOrEqual(sig.durationMs);
    const { qrs, rr } = M.qrsInWindow(truth, win);
    expect(qrs.length).toBeGreaterThanOrEqual(2);
    expect(qrs.length).toBeLessThanOrEqual(3);
    expect(rr).toBe(Math.round(truth[truth.indexOf(qrs[1])].qrsOn - truth[truth.indexOf(qrs[0])].qrsOn));
    expect(rr).toBeGreaterThan(600);
    expect(rr).toBeLessThan(1000);
  });

  it('with no noise the recovered potentials re-assemble the engine leads (Einthoven / Goldberger / Wilson exactly)', () => {
    const z = new Float32Array(n);
    for (const e of M.ELECTRODES) {
      const out = M.assembleNoisy(sig, win, e, z, 0.3);
      for (const l of ALL) {
        let d = 0;
        for (let j = 0; j < n; j++) d = Math.max(d, Math.abs(out[l][j] - sig.leads[l][i0 + j]));
        expect(d, `${e} ${l}`).toBeLessThan(1e-5);
      }
    }
  });

  for (const type of M.NOISE_TYPES) {
    for (const e of M.ELECTRODES) {
      it(`${type} on ${e}: rms(lead − clean) / rms(a·n) = |NOISE_FACTORS| (clean bipolar ≈ 0, aV ½ or 1, every Vk ⅓) within 1 %`, () => {
        const noise = M.noiseSeries(type, n, sig.fs);
        const a = 0.2;
        const clean = M.assembleNoisy(sig, win, e, noise, 0);
        const noisy = M.assembleNoisy(sig, win, e, noise, a);
        const got = M.measuredFactors(clean, noisy, noise, a);
        for (const l of ALL) {
          const want = Math.abs(M.NOISE_FACTORS[e][l]);
          if (want === 0) expect(got[l], l).toBeLessThan(1e-4);
          else expect(Math.abs(got[l] - want) / want, l).toBeLessThan(0.01);
        }
        const c = M.CULPRIT[e];
        expect(got[c.clean]).toBeLessThan(1e-4);
        expect(got[c.noisy[0]]).toBeCloseTo(1, 2);
        expect(got[c.noisy[1]]).toBeCloseTo(1, 2);
        // its own aV lead is the largest of the three augmented leads (1 vs ½, ½)
        for (const aug of ['aVR', 'aVL', 'aVF'] as const) if (aug !== c.aug) expect(got[c.aug]).toBeGreaterThan(1.9 * got[aug]);
      });
    }
  }

  it('the signed factors are the read-off of the lead formulas (I = LA − RA, …, Vk = Φk − WCT)', () => {
    for (const e of M.ELECTRODES) {
      const phi = { RA: e === 'RA' ? 1 : 0, LA: e === 'LA' ? 1 : 0, LL: e === 'LL' ? 1 : 0 };
      const wct = (phi.RA + phi.LA + phi.LL) / 3;
      const want: Record<StdLead, number> = {
        I: phi.LA - phi.RA,
        II: phi.LL - phi.RA,
        III: phi.LL - phi.LA,
        aVR: phi.RA - (phi.LA + phi.LL) / 2,
        aVL: phi.LA - (phi.RA + phi.LL) / 2,
        aVF: phi.LL - (phi.RA + phi.LA) / 2,
        V1: -wct, V2: -wct, V3: -wct, V4: -wct, V5: -wct, V6: -wct,
      };
      for (const l of ALL) expect(M.NOISE_FACTORS[e][l], `${e} ${l}`).toBeCloseTo(want[l], 12);
      expect(M.CULPRIT[e].clean).toBe((['I', 'II', 'III'] as const).find((l) => want[l] === 0));
      expect(M.NOISE_FACTORS[e][M.CULPRIT[e].aug]).toBe(1);
    }
  });

  it('the signed noise term is exactly factor · a · n in every lead', () => {
    const noise = M.noiseSeries('tremor', n, sig.fs);
    for (const e of M.ELECTRODES) {
      const clean = M.assembleNoisy(sig, win, e, noise, 0);
      const noisy = M.assembleNoisy(sig, win, e, noise, 0.25);
      for (const l of ALL) {
        let d = 0;
        for (let j = 0; j < n; j++) d = Math.max(d, Math.abs(noisy[l][j] - clean[l][j] - M.NOISE_FACTORS[e][l] * 0.25 * noise[j]));
        expect(d, `${e} ${l}`).toBeLessThan(1e-5);
      }
    }
  });

  it('the generator is seeded: identical sequence for the same seed, a different one for another seed; peak 1', () => {
    for (const type of M.NOISE_TYPES) {
      const a = M.noiseSeries(type, n, sig.fs, 618);
      const b = M.noiseSeries(type, n, sig.fs, 618);
      const c = M.noiseSeries(type, n, sig.fs, 619);
      expect(Array.from(a)).toEqual(Array.from(b));
      expect(Array.from(a)).not.toEqual(Array.from(c));
      expect(Math.max(...Array.from(a, Math.abs))).toBeCloseTo(1, 6);
    }
  });

  it('the generators carry their stated frequencies (tremor 5 Hz, mains 50 Hz, wander 0.3 Hz, EMG inside 20–60 Hz)', () => {
    const fs = sig.fs;
    const N = 5000; // 10 s
    const tone = (x: Float32Array, hz: number) => {
      let re = 0, im = 0;
      for (let i = 0; i < x.length; i++) {
        re += x[i] * Math.cos((2 * Math.PI * hz * i) / fs);
        im += x[i] * Math.sin((2 * Math.PI * hz * i) / fs);
      }
      return Math.hypot(re, im) / x.length;
    };
    const tr = M.noiseSeries('tremor', N, fs);
    expect(tone(tr, 5)).toBeGreaterThan(5 * Math.max(tone(tr, 3), tone(tr, 8)));
    const mn = M.noiseSeries('mains', N, fs);
    expect(tone(mn, 50)).toBeGreaterThan(0.4);
    const wd = M.noiseSeries('wander', N, fs);
    expect(tone(wd, 0.3)).toBeGreaterThan(0.3);
    const em = M.noiseSeries('emg', N, fs);
    const inBand = [25, 35, 45, 55].reduce((s, h) => s + tone(em, h), 0);
    const outBand = [2, 8, 12, 75, 100].reduce((s, h) => s + tone(em, h), 0);
    expect(inBand).toBeGreaterThan(3 * outBand);
  });

  it('the clean lead keeps the truth QRS onsets: nothing moved (detected onset = clean signal onset, within 12 ms of truth qrsOn)', () => {
    const { qrs } = M.qrsInWindow(truth, win);
    for (const e of M.ELECTRODES) {
      const noise = M.noiseSeries('tremor', n, sig.fs);
      const noisy = M.assembleNoisy(sig, win, e, noise, M.AMP_MAX_MV);
      const clean = M.assembleNoisy(sig, win, e, noise, 0);
      const l = M.CULPRIT[e].clean;
      for (const b of qrs) {
        const tWin = b.qrsOn - win[0];
        const got = M.qrsOnsetNear(noisy[l], sig.fs, tWin);
        expect(got, `${e} ${l}`).toBe(M.qrsOnsetNear(clean[l], sig.fs, tWin));
        expect(Math.abs(got - tWin), `${e} ${l} vs truth`).toBeLessThanOrEqual(12);
      }
    }
  });

  it('the strips fit their paper at 10 mm/mV: clean, and the noisiest re-assembly (AMP_MAX_MV, every electrode and type)', () => {
    // the component draws leadPath(...), which subtracts the window median of the drawn (noisy) lead
    const fits = (leads: M.Leads12, what: string) => {
      for (const pl of [M.PLACEMENT_WIDE, M.PLACEMENT_NARROW]) {
        for (const l of M.ALL_LEADS) {
          const r = M.stripRect(pl, l);
          const s = M.stripScale(r);
          const x = Array.from(leads[l]).sort((a, b) => a - b);
          const base = x[x.length >> 1];
          expect(s.y(x[x.length - 1] - base), `${what} ${l} top (${pl.w})`).toBeGreaterThanOrEqual(r.y);
          expect(s.y(x[0] - base), `${what} ${l} bottom (${pl.w})`).toBeLessThanOrEqual(r.y + r.h);
        }
      }
    };
    fits(M.assembleNoisy(sig, win, 'LL', new Float32Array(n), 0), 'clean');
    for (const type of M.NOISE_TYPES) {
      const noise = M.noiseSeries(type, n, sig.fs);
      for (const e of M.ELECTRODES) fits(M.assembleNoisy(sig, win, e, noise, M.AMP_MAX_MV), `${type} on ${e}`);
    }
  });
});
