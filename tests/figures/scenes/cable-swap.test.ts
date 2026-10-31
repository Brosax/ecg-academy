/**
 * Tests of the "cable-swap" scene (docs/design/f-explainers.md §4.8): the strings contract, the exact re-assembly of
 * the twelve leads under every limb-cable preset with the engine as oracle, the signature table, the flat lead and the
 * chest shift, the beats, continuity of the picture across beat boundaries and the completeness of the end frame.
 */
import { describe, expect, it } from 'vitest';
import { CHEST_LEADS, LIMB_LEADS, STD_LEADS } from '../../../src/core/leads';
import { compileBeats } from '../../../src/figures/scene/timeline';
import { BEAT_IDS, en, es, tCableSwap, zh } from '../../../src/figures/scenes/cable-swap.i18n';
import {
  assembleHookup,
  BEATS,
  CABLES,
  chestText,
  CHIP_H,
  composeManual,
  cableValue,
  fitGain,
  GAINS,
  maxSpan,
  meterFiducial,
  cursorFrac,
  cursorMs,
  CHIP_CHARS,
  fitLabel,
  penSlow,
  PLUG_HIT,
  PREDICT_LEAD,
  ROW_LIVE,
  rowOpacity,
  textWidth,
  vRowText,
  rowCells,
  stripBox,
  stripScale,
  windowSignal,
  descText,
  DURATION_MS,
  formulaText,
  frame,
  HOOKUPS,
  hookupId,
  hookupSignature,
  NARROW,
  peakToPeak,
  plugLimb,
  plugPos,
  potentialsFromSignal,
  sceneWindow,
  shownHookup,
  SWAP_IDS,
  swapCables,
  UNTRIED,
  WIDE,
  wctUnchanged,
  type Frame,
  type Hookup,
  type LimbLead,
  type SwapId,
} from '../../../src/figures/scenes/cable-swap.math';
import { PLACEMENT, syn } from '../../../src/course/lessons/f-shared';
import { generate } from '../../../src/synth/index';
import type { SynthRequest } from '../../../src/synth/api';
import { specOf } from '../scene/spec';

const reqOf = (s: ReturnType<typeof syn>): SynthRequest => {
  if (s.kind !== 'synth') throw new Error('expected a synthetic source');
  return s.req;
};
const base = generate(reqOf(syn('normal', 611))).ecg;
const phi = potentialsFromSignal(base.signal);

describe('cable-swap: strings contract', () => {
  const spec = specOf('cable-swap');

  it('BEAT_IDS are the spec beats in order and every beat has a caption in zh / en / es', () => {
    expect([...BEAT_IDS]).toEqual([...spec.beats]);
    for (const b of BEAT_IDS) {
      for (const d of [zh, en, es]) expect(d[`beat_${b}`].trim()).not.toBe('');
    }
  });

  it('the translator serves the title in every language under the namespace scene-cable-swap', () => {
    expect(tCableSwap.ns).toBe('scene-cable-swap');
    expect(tCableSwap.in('zh', 'title')).toBe(zh.title);
    expect(tCableSwap.in('en', 'title')).toBe(en.title);
    expect(tCableSwap.in('es', 'title')).toBe(es.title);
  });

  it('has a row label and a table text for every swap, and no placeholder text is left', () => {
    for (const d of [zh, en, es]) {
      for (const s of SWAP_IDS) expect(d[`row_${s}`].trim()).not.toBe('');
      for (const v of Object.values(d)) expect(v).not.toMatch(/待写|to be written|pendiente|construction|建设中|construcción/i);
    }
  });
});

describe('cable-swap: exact re-assembly (engine as oracle)', () => {
  const PRESETS = ['laRa', 'laLl', 'raLl', 'raRl', 'laRl'] as const satisfies readonly SwapId[];

  it('the correct hook-up gives back the recorded twelve leads', () => {
    const out = assembleHookup(phi, HOOKUPS.correct);
    for (const l of STD_LEADS) {
      const a = out[l]!, b = base.signal.leads[l]!;
      let worst = 0;
      for (let i = 0; i < b.length; i++) worst = Math.max(worst, Math.abs(a[i] - b[i]));
      expect(worst, l).toBeLessThan(1e-4);
    }
  });

  for (const id of PRESETS) {
    it(`${id}: assembleHookup equals generate() under PLACEMENT.${id} within 1e-4 mV, every lead and sample`, () => {
      const oracle = generate(reqOf(syn('normal', 611, undefined, PLACEMENT[id]))).ecg.signal;
      const out = assembleHookup(phi, HOOKUPS[id]);
      for (const l of STD_LEADS) {
        const a = out[l]!, b = oracle.leads[l]!;
        expect(a.length, l).toBe(b.length);
        let worst = 0;
        for (let i = 0; i < b.length; i++) worst = Math.max(worst, Math.abs(a[i] - b[i]));
        expect(worst, `${id} ${l}`).toBeLessThan(1e-4);
      }
    });
  }

  it('a window re-assembly equals the matching slice of the full one', () => {
    const full = assembleHookup(phi, HOOKUPS.raRl);
    const part = assembleHookup(phi, HOOKUPS.raRl, 1000, 400);
    for (const l of STD_LEADS) expect(Array.from(part[l]!)).toEqual(Array.from(full[l]!.slice(1000, 1400)));
  });

  it('RA ↔ RL: II is a flat line (peak-to-peak < 0.05 mV), I = −III, aVF = III/2 and V′ = V − II/3', () => {
    const out = assembleHookup(phi, HOOKUPS.raRl);
    expect(peakToPeak(out.II!)).toBeLessThan(0.05);
    expect(peakToPeak(base.signal.leads.II)).toBeGreaterThan(0.5);
    const II = base.signal.leads.II, III = base.signal.leads.III;
    for (let i = 0; i < II.length; i += 7) {
      expect(out.I![i]).toBeCloseTo(-III[i], 4);
      expect(out.aVF![i]).toBeCloseTo(III[i] / 2, 4);
      for (const k of CHEST_LEADS) expect(out[k]![i]).toBeCloseTo(base.signal.leads[k][i] - II[i] / 3, 4);
    }
  });

  it('LA ↔ RL: III is a flat line', () => {
    expect(peakToPeak(assembleHookup(phi, HOOKUPS.laRl).III!)).toBeLessThan(0.05);
  });

  it('swaps among RA / LA / LL leave V1–V6 bit for bit unchanged', () => {
    for (const id of ['laRa', 'laLl', 'raLl'] as const) {
      const out = assembleHookup(phi, HOOKUPS[id]);
      for (const k of CHEST_LEADS) {
        expect(out[k], `${id} ${k}`).toBe(phi.V[k]);
        expect(Array.from(out[k]!)).toEqual(Array.from(base.signal.leads[k]));
      }
      expect(wctUnchanged(HOOKUPS[id])).toBe(true);
    }
    expect(wctUnchanged(HOOKUPS.raRl)).toBe(false);
    expect(wctUnchanged(HOOKUPS.laRl)).toBe(false);
  });

  it('every one of the 24 hook-ups re-assembles by Einthoven / Goldberger (II = I + III, aVR + aVL + aVF = 0)', () => {
    const all: Hookup[] = [];
    const limbs = ['RA', 'LA', 'LL', 'RL'] as const;
    const perm = (rest: readonly (typeof limbs)[number][], acc: (typeof limbs)[number][]) => {
      if (!rest.length) all.push({ RA: acc[0], LA: acc[1], LL: acc[2], RL: acc[3] });
      rest.forEach((x, i) => perm([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, x]));
    };
    perm(limbs, []);
    expect(all.length).toBe(24);
    for (const h of all) {
      const o = assembleHookup(phi, h, 2000, 300);
      for (let i = 0; i < 300; i += 13) {
        expect(o.II![i]).toBeCloseTo(o.I![i] + o.III![i], 5);
        expect(o.aVR![i] + o.aVL![i] + o.aVF![i]).toBeCloseTo(0, 5);
      }
    }
  });
});

describe('cable-swap: the signature table', () => {
  const cell = (h: Hookup, l: LimbLead) => descText(hookupSignature(h).per[l]);
  const row = (h: Hookup) => LIMB_LEADS.map((l) => cell(h, l));

  it('LA ↔ RA: I inverted, II ⇄ III, aVR ⇄ aVL, aVF same, V same', () => {
    const s = hookupSignature(HOOKUPS.laRa);
    expect(row(HOOKUPS.laRa)).toEqual(['−I', 'III', 'II', 'aVL', 'aVR', '=']);
    expect(s.inverted).toEqual(['I']);
    expect(s.swapped).toEqual([['II', 'III'], ['aVR', 'aVL']]);
    expect(s.same).toEqual(['aVF']);
    expect(s.chestShift).toBe(false);
    expect(chestText(HOOKUPS.laRa)).toBe('=');
  });

  it('LA ↔ LL: I ⇄ II, aVL ⇄ aVF, III inverted, aVR same', () => {
    const s = hookupSignature(HOOKUPS.laLl);
    expect(row(HOOKUPS.laLl)).toEqual(['II', 'I', '−III', '=', 'aVF', 'aVL']);
    expect(s.inverted).toEqual(['III']);
    expect(s.same).toEqual(['aVR']);
    expect(s.chestShift).toBe(false);
  });

  it('RA ↔ LL: II inverted (I and III trade places inverted), aVR ⇄ aVF, aVL same', () => {
    const s = hookupSignature(HOOKUPS.raLl);
    expect(row(HOOKUPS.raLl)).toEqual(['−III', '−II', '−I', 'aVF', '=', 'aVR']);
    expect(s.inverted).toEqual(['I', 'II', 'III']);
    expect(s.swapped).toEqual([['I', 'III'], ['aVR', 'aVF']]);
    expect(s.same).toEqual(['aVL']);
    expect(s.chestShift).toBe(false);
  });

  it('RA ↔ RL: II flat, I = −III, aVR = aVF = III/2, V shifted by −II/3', () => {
    const s = hookupSignature(HOOKUPS.raRl);
    expect(row(HOOKUPS.raRl)).toEqual(['−III', '0', '=', 'III/2', '−III', 'III/2']);
    expect(s.flat).toEqual(['II']);
    expect(s.chestShift).toBe(true);
    expect(chestText(HOOKUPS.raRl)).toBe('−II/3');
  });

  it('LA ↔ RL: III flat', () => {
    const s = hookupSignature(HOOKUPS.laRl);
    expect(s.flat).toEqual(['III']);
    expect(s.chestShift).toBe(true);
    expect(chestText(HOOKUPS.laRl)).toBe('−III/3');
  });

  it('the symbolic signature agrees with the signal (each lead = k × the named original lead)', () => {
    for (const id of SWAP_IDS) {
      const out = assembleHookup(phi, HOOKUPS[id]);
      const s = hookupSignature(HOOKUPS[id]);
      for (const l of LIMB_LEADS) {
        const d = s.per[l];
        for (let i = 0; i < base.signal.leads.I.length; i += 11) {
          const want = d.from ? d.k * base.signal.leads[d.from][i] : 0;
          expect(out[l]![i], `${id} ${l}`).toBeCloseTo(want, 4);
        }
      }
    }
  });

  it('swapping two plugs is an involution and lands on the table presets', () => {
    expect(hookupId(swapCables(HOOKUPS.correct, 'LA', 'RA'))).toBe('laRa');
    expect(hookupId(swapCables(HOOKUPS.correct, 'LL', 'LA'))).toBe('laLl');
    expect(hookupId(swapCables(HOOKUPS.correct, 'RA', 'LL'))).toBe('raLl');
    expect(hookupId(swapCables(HOOKUPS.correct, 'RL', 'RA'))).toBe('raRl');
    expect(hookupId(swapCables(HOOKUPS.correct, 'LA', 'RL'))).toBe('laRl');
    expect(hookupId(swapCables(swapCables(HOOKUPS.correct, 'LA', 'RA'), 'RA', 'LA'))).toBe('correct');
    // the neutral cable swapped with nothing that records: LL ↔ RL changes nothing (both legs one potential)
    expect(hookupSignature(swapCables(HOOKUPS.correct, 'LL', 'RL')).same).toEqual([...LIMB_LEADS]);
  });

  it('formulas name the limbs the cables touch', () => {
    expect(formulaText('I', HOOKUPS.correct)).toBe('I = LA − RA');
    expect(formulaText('I', HOOKUPS.laRa)).toBe('I = RA − LA = −I');
    expect(formulaText('II', HOOKUPS.raRl)).toBe('II = LL − RL = 0');
    expect(formulaText('aVF', HOOKUPS.laRa)).toBe('aVF = LL − (LA+RA)/2');
    expect(formulaText('III', HOOKUPS.laLl, true)).toBe('LA−LL=−III');
  });
});

describe('cable-swap: beats and frames', () => {
  const TL = compileBeats(BEATS).beats;
  /** what is drawn: plug positions and limbs, the hook-up on screen with its weight, the scalar fields */
  const picture = (fr: Frame): Record<string, number | string> => {
    const out: Record<string, number | string> = {};
    for (const c of CABLES) {
      const [x, y] = plugPos(fr.cables[c], WIDE);
      out[`${c}x`] = x;
      out[`${c}y`] = y;
      out[`${c}@`] = plugLimb(fr.cables[c]);
    }
    const sameAB = fr.hookA === fr.hookB || JSON.stringify(fr.hookA) === JSON.stringify(fr.hookB);
    out.shown = JSON.stringify(shownHookup(fr));
    out.weight = sameAB ? 1 : Math.max(fr.xf, 1 - fr.xf);
    for (const [k, v] of Object.entries(fr)) if (typeof v === 'number') out[k] = k === 'xf' ? 0 : v;
    for (const s of SWAP_IDS) out[`row_${s}`] = fr.rows[s];
    return out;
  };

  it('beats tile [0, 1] in the spec order and last ≈ 9 s', () => {
    expect(TL.map((b) => b.id)).toEqual([...BEAT_IDS]);
    expect(TL[0].from).toBe(0);
    expect(TL[TL.length - 1].to).toBe(1);
    for (let i = 1; i < TL.length; i++) expect(TL[i].from).toBe(TL[i - 1].to);
    expect(DURATION_MS).toBeGreaterThanOrEqual(8000);
    expect(DURATION_MS).toBeLessThanOrEqual(10000);
  });

  it('the picture is continuous across every beat boundary (≤ 1e-9)', () => {
    for (let k = 0; k + 1 < TL.length; k++) {
      const b = TL[k].to;
      const a = picture(frame(b - 1e-9)), c = picture(frame(b + 1e-9)), m = picture(frame(b));
      for (const key of Object.keys(a)) {
        if (typeof a[key] === 'number') {
          expect(Math.abs((a[key] as number) - (c[key] as number)), `boundary ${k} ${key}`).toBeLessThanOrEqual(1e-6);
          expect(Math.abs((m[key] as number) - (c[key] as number)), `boundary ${k} ${key}`).toBeLessThanOrEqual(1e-6);
        } else expect(c[key], `boundary ${k} ${key}`).toBe(a[key]);
      }
    }
  });

  it('the strips only ever crossfade between two exact hook-ups, quickly (≈ 300 ms), never mid-move', () => {
    let fading = 0;
    const N = 4000;
    for (let i = 0; i <= N; i++) {
      const fr = frame(i / N);
      if (fr.xf > 0 && fr.xf < 1 && hookupId(fr.hookA) !== hookupId(fr.hookB)) fading++;
      expect(hookupId(fr.hookA)).not.toBeNull();
      expect(hookupId(fr.hookB)).not.toBeNull();
    }
    // three crossfades (LA↔RA, back, RA↔RL), each ≈ 300 ms of the ≈ 9 s tour
    const ms = (fading / N) * DURATION_MS;
    expect(ms).toBeGreaterThan(600);
    expect(ms).toBeLessThan(1200);
  });

  it('beat 2 ends with the LA ↔ RA hook-up and its table row; beat 3 joins the wires into the WCT', () => {
    const e2 = frame(TL[1].to), e3 = frame(TL[2].to);
    expect(hookupId(shownHookup(e2))).toBe('laRa');
    expect(e2.rows.laRa).toBe(1);
    expect(plugLimb(e2.cables.RA)).toBe('LA');
    expect(e3.wctJoin).toBe(1);
    expect(e3.wctLabelOp).toBe(1);
    expect(e3.vCheckOp).toBe(1);
  });

  it('the end frame is complete: RA ↔ RL on the torso, every table row shown, flat / shift labels and the chip', () => {
    const f = frame(1);
    expect(hookupId(shownHookup(f))).toBe('raRl');
    expect(plugLimb(f.cables.RA)).toBe('RL');
    expect(plugLimb(f.cables.RL)).toBe('RA');
    expect(f.reveal).toBe(1);
    expect(f.formulaOp).toBe(1);
    expect(f.rlOp).toBe(1);
    expect(f.flatOp).toBe(1);
    expect(f.shiftOp).toBe(1);
    expect(f.dextroOp).toBe(1);
    expect(f.rows.laRa).toBe(1);
    expect(f.rows.raRl).toBe(1);
    expect(f.rows.laRl).toBe(1);
    expect(f.rows.laLl).toBe(UNTRIED);
    expect(f.rows.raLl).toBe(UNTRIED);
    expect(UNTRIED).toBeGreaterThan(0.4);
  });

  it('a learner swap moves the plugs continuously and crossfades at its midpoint', () => {
    const m = (x: number) => composeManual(frame(1), { from: HOOKUPS.correct, to: HOOKUPS.laLl, f: x });
    expect(shownHookup(m(0))).toBe(HOOKUPS.correct);
    expect(shownHookup(m(1))).toBe(HOOKUPS.laLl);
    expect(plugPos(m(0).cables.LA, WIDE)).toEqual(WIDE.limbs.LA);
    expect(plugPos(m(1).cables.LA, WIDE)).toEqual(WIDE.limbs.LL);
    let prev = plugPos(m(0).cables.LA, WIDE);
    for (let i = 1; i <= 100; i++) {
      const p = plugPos(m(i / 100).cables.LA, WIDE);
      expect(Math.hypot(p[0] - prev[0], p[1] - prev[1])).toBeLessThan(12);
      prev = p;
    }
  });

  it('placements: fixed frames, everything inside, hit targets apart', () => {
    for (const pl of [WIDE, NARROW]) {
      for (const l of LIMB_LEADS) {
        const [x, y] = pl.strips[l];
        expect(x + pl.stripW).toBeLessThanOrEqual(pl.w);
        expect(y + pl.stripH).toBeLessThanOrEqual(pl.h);
      }
      expect(pl.vRow[0] + 6 * pl.vW + 5 * pl.vGap).toBeLessThanOrEqual(pl.w + 1e-9);
      expect(pl.table[1] + 6 * pl.rowH).toBeLessThanOrEqual(pl.chip[1]);
      expect(pl.chip[1] + CHIP_H).toBeLessThanOrEqual(pl.h);
      for (const l of LIMB_LEADS) expect(pl.strips[l][1] + pl.stripH + 12).toBeLessThan(pl.vRow[1] - (pl.narrow ? 20 : 6));
      const limbs = Object.values(pl.limbs);
      for (let i = 0; i < limbs.length; i++)
        for (let j = i + 1; j < limbs.length; j++) expect(Math.hypot(limbs[i][0] - limbs[j][0], limbs[i][1] - limbs[j][1])).toBeGreaterThan(40);
    }
  });

  it('the scene window is one beat of the block ECG', () => {
    const w = sceneWindow(base.truth!, base.signal.durationMs)!;
    expect(w).not.toBeNull();
    const inside = base.truth!.beats.filter((b) => b.qrsOn >= w[0] && b.qrsOff <= w[1]);
    expect(inside.length).toBe(1);
    expect(w[1] - w[0]).toBeGreaterThan(400);
    expect(w[1] - w[0]).toBeLessThan(1500);
  });
});

describe('cable-swap: strips, scale and table cells', () => {
  const w = sceneWindow(base.truth!, base.signal.durationMs)!;

  it('a window signal is the exact re-assembly of that slice, starting at time 0', () => {
    const ws = windowSignal(phi, HOOKUPS.laRa, w);
    const from = Math.floor((w[0] * phi.fs) / 1000);
    const full = assembleHookup(phi, HOOKUPS.laRa);
    expect(ws.fs).toBe(base.signal.fs);
    expect(ws.durationMs).toBeGreaterThanOrEqual(w[1] - w[0]);
    for (const l of STD_LEADS) expect(ws.leads[l]![3]).toBe(full[l]![from + 3]);
  });

  it('gains are standard and the tallest deflection fits its strip in both layouts', () => {
    expect(fitGain(2, 9.4, 62)).toBe(2.5);
    expect(fitGain(0.2, 9.4, 62)).toBe(10);
    for (const pl of [WIDE, NARROW]) {
      const s = stripScale(phi, w, pl);
      expect(GAINS).toContain(s.g);
      expect(GAINS).toContain(s.gv);
      const ref = windowSignal(phi, HOOKUPS.correct, w);
      expect(maxSpan(ref, LIMB_LEADS) * s.g * s.mmL).toBeLessThanOrEqual(0.86 * pl.stripH);
      expect(s.g).toBeGreaterThanOrEqual(2.5);
      expect(maxSpan(ref, CHEST_LEADS) * s.gv * s.mmV).toBeLessThanOrEqual(0.86 * pl.vH);
      // 25 mm/s: the window spans its length / 40 ms of millimetres
      expect(s.mmL * ((w[1] - w[0]) / 40)).toBeCloseTo(pl.stripW, 6);
      expect(stripBox(pl, 'V6')[0] + pl.vW).toBeCloseTo(pl.vRow[0] + 6 * pl.vW + 5 * pl.vGap, 6);
    }
  });

  it('the meters read the potential of the limb each recording cable touches (RL ≡ LL)', () => {
    const i = Math.round(((w[0] + 0.5 * (w[1] - w[0])) * phi.fs) / 1000);
    expect(cableValue(phi, HOOKUPS.correct, 'RA', w, 0.5)).toBe(phi.RA[i]);
    expect(cableValue(phi, HOOKUPS.raRl, 'RA', w, 0.5)).toBe(phi.LL[i]);
    expect(cableValue(phi, HOOKUPS.laRa, 'LA', w, 0.5)).toBe(phi.RA[i]);
    expect(phi.RA[i] + phi.LA[i] + phi.LL[i]).toBeCloseTo(0, 6);
  });

  it('the table cells spell the signature table of the spec', () => {
    const texts = (id: SwapId) => rowCells(WIDE, id, 'swap', 'key').map((c) => c.text);
    expect(texts('laRa')).toEqual(['LA↔RA', '−I', 'III', 'II', 'aVL', 'aVR', '=', '✓', 'key']);
    expect(texts('laLl')).toEqual(['LA↔LL', 'II', 'I', '−III', '=', 'aVF', 'aVL', '✓', 'key']);
    expect(texts('raLl')).toEqual(['RA↔LL', '−III', '−II', '−I', 'aVF', '=', 'aVR', '✓', 'key']);
    expect(texts('raRl')).toEqual(['RA↔RL', '−III', '0', '=', 'III/2', '−III', 'III/2', '−II/3', 'key']);
    expect(texts('laRl').slice(1, 4)).toEqual(['II', '=', '0']);
    expect(rowCells(NARROW, null, 'swap', 'key').map((c) => c.text)).toEqual(['swap', ...LIMB_LEADS, 'V1–V6', 'key']);
    for (const c of rowCells(NARROW, 'raRl', '', 'II flat')) {
      expect(c.x).toBeGreaterThanOrEqual(NARROW.table[0]);
      expect(c.x).toBeLessThan(NARROW.table[0] + NARROW.tableW);
      expect(c.fill.startsWith('var(--')).toBe(true);
    }
  });
});

describe('cable-swap: meters, one clock, rows, Predict and the labels', () => {
  const TL = compileBeats(BEATS).beats;
  const w = sceneWindow(base.truth!, base.signal.durationMs)!;
  const fid = meterFiducial(phi, base.truth!, w);
  /** SvgLabel's split: one line, or two at the space nearest the middle */
  const lines = (text: string, max: number): string[] => {
    if (text.length <= max || !text.includes(' ')) return [text];
    let best = -1;
    for (let i = 0; i < text.length; i++) if (text[i] === ' ' && (best < 0 || Math.abs(i - text.length / 2) < Math.abs(best - text.length / 2))) best = i;
    return [text.slice(0, best), text.slice(best + 1)];
  };
  const widest = (text: string, max: number, bold = 1) => Math.max(...lines(text, max).map((x) => textWidth(x) * bold));

  it('the meters settle on the R peak of the window beat: every end frame shows a reading', () => {
    const b = base.truth!.beats.find((x) => x.qrsOn >= w[0] && x.qrsOff <= w[1])!;
    const tMs = w[0] + fid * (w[1] - w[0]);
    expect(tMs).toBeGreaterThanOrEqual(b.qrsOn);
    expect(tMs).toBeLessThanOrEqual(b.qrsOff);
    for (const k of TL.keys()) expect(frame(TL[k].to, null, fid).meterT, `end of beat ${k + 1}`).toBe(fid);
    const reading = Math.max(...(['RA', 'LA', 'LL'] as const).map((c) => Math.abs(cableValue(phi, HOOKUPS.correct, c, w, fid))));
    expect(reading).toBeGreaterThan(0.3);
  });

  it('one clock: the meters follow the pen in beat 1, never run backwards, and the cursor maps both ways', () => {
    let prev = -1;
    for (let i = 0; i <= 2000; i++) {
      const m = frame(i / 2000, null, fid).meterT;
      expect(m).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = m;
    }
    const mid = TL[0].from + 0.4 * (TL[0].to - TL[0].from);
    expect(frame(mid, null, fid).meterT).toBeCloseTo(Math.min(frame(mid, null, fid).reveal, fid), 12);
    expect(cursorMs(w, 0)).toBe(Math.round(w[0]));
    expect(cursorFrac(w, cursorMs(w, fid))).toBeCloseTo(fid, 2);
    expect(cursorFrac(w, w[0] - 500)).toBe(0);
    expect(cursorFrac(w, w[1] + 500)).toBe(1);
    // the ×k chip is the pen's speed: the window drawn over 70 % of beat 1
    expect(penSlow(w[1] - w[0])).toBe(Math.round((0.7 * BEATS[0].ms) / (w[1] - w[0])));
    expect(penSlow(w[1] - w[0])).toBeLessThan(8);
  });

  it('table rows are interactive only once visible (tour fill or tried)', () => {
    const early = frame(TL[0].to);
    for (const s of SWAP_IDS) expect(rowOpacity(early, s, false), s).toBeLessThan(ROW_LIVE);
    for (const s of SWAP_IDS) expect(rowOpacity(early, s, true), s).toBe(1);
    const end = frame(1);
    for (const s of SWAP_IDS) expect(rowOpacity(end, s, false), s).toBeGreaterThan(ROW_LIVE);
    expect(rowOpacity(frame(TL[1].to), 'laRa', false)).toBe(1);
    expect(rowOpacity(frame(TL[1].to), 'laLl', false)).toBeLessThan(ROW_LIVE);
  });

  it('Predict: the answer comes from the LA ↔ LL signature', () => {
    expect(PREDICT_LEAD).toBe('III');
    expect(hookupSignature(HOOKUPS.laLl).inverted).toEqual([PREDICT_LEAD]);
  });

  it('the dextrocardia view is the LA ↔ RA hook-up: I inverted, aVR shows aVL, V1–V6 unchanged; the chip names it', () => {
    const s = hookupSignature(HOOKUPS.laRa);
    expect(s.per.I.k).toBe(-1);
    expect(s.per.aVR.from).toBe('aVL');
    expect(s.chestShift).toBe(false);
    for (const d of [zh, en, es]) expect(d.lbl_chip.startsWith('LA↔RA')).toBe(true);
    expect(vRowText(HOOKUPS.laRa, 'shift', 'wct', 'same')).toBe('wct   same');
    expect(vRowText(HOOKUPS.raRl, 'shift', 'wct', 'same')).toBe('V′ = V − II/3 · shift');
  });

  it('hit targets: rows ≥ 24 units (≥ 24 px in the narrow layout at 362 px), plugs ≥ 24 px', () => {
    for (const pl of [WIDE, NARROW]) expect(pl.rowH).toBeGreaterThanOrEqual(24);
    const px = 362 / NARROW.w;
    expect(NARROW.rowH * px).toBeGreaterThanOrEqual(24);
    expect(2 * PLUG_HIT * px).toBeGreaterThanOrEqual(24);
    // the gain line sits between the table and the chip
    for (const pl of [WIDE, NARROW]) expect(pl.table[1] + 6 * pl.rowH).toBeLessThanOrEqual(pl.chip[1] - 6 - 9);
  });

  it('labels fit in every language: RL note left of the table, flat label inside its strip, chip inside its box', () => {
    for (const d of [zh, en, es]) {
      expect(widest(d.lbl_rl, WIDE.rlMax), `wide RL note "${d.lbl_rl}"`).toBeLessThanOrEqual(WIDE.table[0] - WIDE.rlNote[0] - 4);
      expect(lines(d.lbl_rl, WIDE.rlMax).length).toBeLessThanOrEqual(2);
      expect(NARROW.rlNote[0] + widest(d.lbl_rl, NARROW.rlMax)).toBeLessThanOrEqual(NARROW.w);
      for (const pl of [WIDE, NARROW]) {
        const f = fitLabel(d.lbl_flat, d.lbl_flatShort, pl.stripW - 8);
        expect(textWidth(f), `${pl.narrow ? 'narrow' : 'wide'} "${f}"`).toBeLessThanOrEqual(pl.stripW - 8);
        expect(widest(d.lbl_chip, CHIP_CHARS, 1.1), `chip ${pl.narrow ? 'narrow' : 'wide'}`).toBeLessThanOrEqual(pl.chipW - 20);
        expect(lines(d.lbl_chip, CHIP_CHARS).length).toBeLessThanOrEqual(2);
      }
    }
    // en and zh keep the long flat label in the wide layout
    expect(fitLabel(en.lbl_flat, en.lbl_flatShort, WIDE.stripW - 8)).toBe(en.lbl_flat);
    expect(fitLabel(es.lbl_flat, es.lbl_flatShort, WIDE.stripW - 8)).toBe(es.lbl_flat);
    // the narrow RL note sits below the limb strips and their formulas
    const bottom = Math.max(...LIMB_LEADS.map((l) => NARROW.strips[l][1] + NARROW.stripH + 12));
    expect(NARROW.rlNote[1] - 11).toBeGreaterThan(bottom);
  });
});
