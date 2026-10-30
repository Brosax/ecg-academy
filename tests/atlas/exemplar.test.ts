/**
 * Exemplar selection (preferred scenarios, variants, caps), reproducible seeds, the never-throwing generation cache,
 * real-case ranking and the thumbnail path.
 */
import { describe, expect, it, vi } from 'vitest';
import type { Ecg } from '../../src/core/ecg';
import type { ScenarioDef, SynthRequest, SynthResult } from '../../src/synth/api';
import { exemplarOptions, exemplarRequest, exemplarSeed, generateCached, MAX_OPTIONS, peekCached } from '../../src/atlas/exemplar';
import { allEntries, entryOf } from '../../src/atlas/registry';
import { FINDINGS, type FindingId } from '../../src/core/findings';
import { generate, scenarios } from '../../src/synth';
import { rankCases, stripPath, THUMB, THUMB_H, THUMB_W } from '../../src/atlas/thumbs';

const sc = (id: string, findings: string[], variants?: ScenarioDef['variants']): ScenarioDef =>
  ({ id, group: 'chambers', findings, source: {} as ScenarioDef['source'], dials: {}, ...(variants ? { variants } : {}) }) as ScenarioDef;

const L = (s: string) => ({ zh: s, en: s, es: s });

describe('exemplarOptions', () => {
  const lvh = sc('lvh', ['lvh'], { strain: { label: L('strain'), patch: {}, findings: ['lvh-strain'] }, tall: { label: L('tall'), patch: {} } });
  const hcm = sc('hcm', ['hcm', 'lvh']);
  const other = sc('rvh', ['rvh']);

  it('puts the entry’s preferred scenario first, then the catalogue’s, with variants', () => {
    const opts = exemplarOptions('lvh', entryOf('lvh'), [other, hcm, lvh], [hcm, lvh]);
    expect(opts.map((o) => o.key)).toEqual(['lvh', 'lvh:strain', 'lvh:tall', 'hcm']);
  });

  it('skips variants that show another finding when the scenario does not declare this one', () => {
    const s = sc('normal', ['normal-ecg'], { lad: { label: L('lad'), patch: {}, findings: ['lad'] }, rad: { label: L('rad'), patch: {}, findings: ['rad'] } });
    const opts = exemplarOptions('lad', undefined, [s], [s]);
    expect(opts.map((o) => o.key)).toEqual(['normal', 'normal:lad']);
  });

  it('ignores preferred scenarios the catalogue does not have, and returns none for an empty catalogue', () => {
    expect(exemplarOptions('lvh', entryOf('lvh'), [], [])).toEqual([]);
  });

  it(`caps the chips at ${MAX_OPTIONS}`, () => {
    const many = Array.from({ length: 12 }, (_, i) => sc(`s${i}`, ['lvh']));
    expect(exemplarOptions('lvh', undefined, many, many)).toHaveLength(MAX_OPTIONS);
  });
});

describe('seeds and requests', () => {
  it('are reproducible and differ per example number and option', () => {
    expect(exemplarSeed('lvh', 'lvh', 0)).toBe(exemplarSeed('lvh', 'lvh', 0));
    expect(exemplarSeed('lvh', 'lvh', 1)).not.toBe(exemplarSeed('lvh', 'lvh', 0));
    expect(exemplarSeed('lvh', 'lvh:strain', 0)).not.toBe(exemplarSeed('lvh', 'lvh', 0));
    const r = exemplarRequest('lvh', { key: 'lvh:strain', scenario: 'lvh', variant: 'strain', label: L('x') }, 2);
    expect(r).toMatchObject({ scenario: 'lvh', variant: 'strain', durationS: 10 });
    expect(Number.isInteger(r.seed) && r.seed >= 0).toBe(true);
  });
});

describe('generateCached', () => {
  const req: SynthRequest = { scenario: 'cache-test', seed: 1 };

  it('never throws and caches the outcome', () => {
    const boom = vi.fn((_r: SynthRequest): SynthResult => {
      throw new Error('engine not built');
    });
    const g = generateCached(req, boom);
    expect(g.ok).toBe(false);
    expect(peekCached(req)).toBe(g);
    generateCached(req, boom);
    expect(boom).toHaveBeenCalledTimes(1);
  });

  it('returns the engine result', () => {
    const r2: SynthRequest = { scenario: 'cache-test', seed: 2 };
    const fake = { ecg: {} as Ecg, applied: {}, axisAmbiguous: false } satisfies SynthResult;
    const g = generateCached(r2, () => fake);
    expect(g.ok && g.result).toBe(fake);
  });
});

describe('real-case ranking', () => {
  it('prefers the teaching class, then the purest tracing, then case number', () => {
    const cases = [
      { id: 1, num: 5, cls: 'NORM', findings: ['lvh', 'sinus-rhythm', 'lad'] as const },
      { id: 2, num: 9, cls: 'LVH', findings: ['lvh', 'sinus-rhythm', 'lvh-strain'] as const },
      { id: 3, num: 7, cls: 'LVH', findings: ['lvh', 'sinus-rhythm'] as const },
      { id: 4, num: 1, cls: 'IMI', findings: ['lvh', 'sinus-rhythm'] as const },
    ];
    expect(rankCases(cases, (c) => c === 'LVH').map((c) => c.id)).toEqual([3, 2, 4, 1]);
  });
});

describe('stripPath', () => {
  it('draws one point pair per column inside the box, at true scale', () => {
    const fs = 500;
    const x = new Float32Array(10 * fs);
    for (let i = 0; i < x.length; i++) x[i] = i % 500 === 250 ? 1 : 0; // 1 mV spikes once a second
    const d = stripPath(x, fs, 1000);
    expect(d.startsWith('M')).toBe(true);
    const pts = d
      .slice(1)
      .split('L')
      .map((p) => p.split(' ').map(Number));
    expect(pts.length).toBeGreaterThanOrEqual(THUMB_W);
    for (const [px, py] of pts) {
      expect(px).toBeGreaterThanOrEqual(0);
      expect(px).toBeLessThanOrEqual(THUMB_W);
      expect(py).toBeGreaterThanOrEqual(0);
      expect(py).toBeLessThanOrEqual(THUMB_H);
    }
    const base = THUMB_H * THUMB.baseline;
    const minY = Math.min(...pts.map((p) => p[1]));
    // 1 mV = 10 mm = 40 units above the baseline
    expect(base - minY).toBeCloseTo(40, 0);
  });

  it('returns an empty path for a too-short signal', () => {
    expect(stripPath(new Float32Array(1), 500)).toBe('');
  });
});

describe('recording fallback (technical findings shown on a normal heart)', () => {
  const normal = sc('normal', ['normal-ecg', 'sinus-rhythm']);
  const id = 'electrode-reversal-la-ra' as const;

  it('is offered only while the catalogue has no scenario for the finding', () => {
    const e = entryOf(id);
    const opts = exemplarOptions(id, e, [normal], []);
    expect(opts).toHaveLength(1);
    expect(opts[0].scenario).toBe('normal');
    expect(opts[0].recording?.placement?.limbs).toEqual({ RA: 'LA', LA: 'RA' });
    const req = exemplarRequest(id, opts[0], 0, e);
    expect(req).toMatchObject({ scenario: 'normal', recording: opts[0].recording });

    const own = sc(id, [id]);
    expect(exemplarOptions(id, e, [normal, own], [own]).map((o) => o.key)).toEqual([id]);
  });

  it('needs its base scenario in the catalogue', () => {
    expect(exemplarOptions(id, entryOf(id), [], [])).toEqual([]);
  });

  it('every fallback is a recording change on a technical finding', () => {
    const withFb = allEntries().filter((e) => e.exemplar?.fallback);
    expect(withFb.map((e) => e.id).sort()).toEqual(['electrode-reversal-la-ll', 'electrode-reversal-la-ra', 'electrode-reversal-ra-ll', 'precordial-misplacement']);
    for (const e of withFb) expect(FINDINGS[e.id].cat).toBe('technical');
  });
});

describe('recording fallback with the real engine', () => {
  // same seed, only the cables differ: the limb leads must follow Einthoven / Goldberger exactly
  const base = (id: FindingId) => {
    const e = entryOf(id);
    const opt = exemplarOptions(id, e, scenarios(), scenarios({ finding: id }))[0];
    if (!opt) throw new Error(`no exemplar for ${id}`);
    return { opt, req: { ...exemplarRequest(id, opt, 0, e), durationS: 2, jitter: false } };
  };
  const maxDiff = (a: Float32Array, b: Float32Array, sign: 1 | -1) => a.reduce((m, v, i) => Math.max(m, Math.abs(v - sign * b[i])), 0);

  it('LA/RA reversal: I inverted, II and III exchanged, aVR and aVL exchanged', () => {
    const { opt, req } = base('electrode-reversal-la-ra');
    if (!opt.recording) return; // the catalogue has a real scenario now: nothing to check here
    const { recording: _r, ...plain } = req;
    const sw = generate(req).ecg.signal.leads;
    const ok = generate(plain).ecg.signal.leads;
    const tol = 0.02; // mV (ADC quantisation)
    expect(maxDiff(sw.I, ok.I, 1)).toBeGreaterThan(0.1); // the swap really changed lead I
    expect(maxDiff(sw.I, ok.I, -1)).toBeLessThan(tol);
    expect(maxDiff(sw.II, ok.III, 1)).toBeLessThan(tol);
    expect(maxDiff(sw.III, ok.II, 1)).toBeLessThan(tol);
    expect(maxDiff(sw.aVR, ok.aVL, 1)).toBeLessThan(tol);
    expect(maxDiff(sw.aVF, ok.aVF, 1)).toBeLessThan(tol);
    expect(maxDiff(sw.V1, ok.V1, 1)).toBeLessThan(tol);
  });

  it('V2/V3 swap exchanges the two tracings and leaves the rest', () => {
    const { opt, req } = base('precordial-misplacement');
    if (!opt.recording) return;
    const { recording: _r, ...plain } = req;
    const sw = generate(req).ecg.signal.leads;
    const ok = generate(plain).ecg.signal.leads;
    expect(maxDiff(sw.V2, ok.V2, 1)).toBeGreaterThan(0.1);
    expect(maxDiff(sw.V2, ok.V3, 1)).toBeLessThan(0.02);
    expect(maxDiff(sw.V3, ok.V2, 1)).toBeLessThan(0.02);
    expect(maxDiff(sw.V4, ok.V4, 1)).toBeLessThan(0.02);
  });
});
