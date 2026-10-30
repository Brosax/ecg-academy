import { describe, expect, it } from 'vitest';
import {
  classifyState,
  conductionColor,
  conductionDim,
  conductionLevel,
  emphasisTint,
  infarctColor,
  mix,
  myocardiumColor,
  paletteFromTokens,
  parseCssColor,
  PLATEAU_MIX,
  srgbToLinear,
  stateColor,
  toCss,
  vesselColor,
  type HeartPalette,
  type HeartToken,
  type Rgb,
} from '../../src/heart3d/colors';

// light-theme token values (src/app/theme.css) as the browser would report them
const LIGHT: Record<HeartToken, string> = {
  'heart-rest': '#c98f8a',
  'heart-bg': '#f3efe8',
  'c-atrial': '#c26a00',
  'c-qrs': '#b0179e',
  'c-repol': '#0f8a80',
  'c-conduction': '#a87900',
  'c-injury': '#d0312d',
  'c-highlight': '#ff7a00',
  fg: '#1f2328',
  'fg-faint': '#8a919c',
};
const P: HeartPalette = paletteFromTokens((t) => ` ${LIGHT[t]} `);

const dist = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const close = (a: Rgb, b: Rgb, eps = 1e-6) => expect(dist(a, b)).toBeLessThan(eps);

describe('CSS colour parsing', () => {
  it('parses hex and rgb() forms', () => {
    close(parseCssColor('#fff')!, [1, 1, 1]);
    close(parseCssColor('#FF000080')!, [1, 0, 0]);
    close(parseCssColor('#0f8a80')!, [15 / 255, 138 / 255, 128 / 255]);
    close(parseCssColor('rgb(255 122 0 / 0.14)')!, [1, 122 / 255, 0]);
    close(parseCssColor('rgba(0, 51, 255, 0.5)')!, [0, 0.2, 1]);
    close(parseCssColor('rgb(100%, 0%, 50%)')!, [1, 0, 0.5]);
    expect(parseCssColor('')).toBeNull();
    expect(parseCssColor('hotpink')).toBeNull();
    expect(parseCssColor('#12345')).toBeNull();
  });

  it('falls back to the text colour for an unreadable token', () => {
    const p = paletteFromTokens((t) => (t === 'c-qrs' ? '' : LIGHT[t]));
    close(p.qrs, p.fg);
  });

  it('round-trips through toCss and converts sRGB to linear', () => {
    expect(toCss(P.qrs)).toBe('#b0179e');
    close(srgbToLinear([0, 0, 0]), [0, 0, 0]);
    close(srgbToLinear([1, 1, 1]), [1, 1, 1]);
    expect(srgbToLinear([0.5, 0.5, 0.5])[0]).toBeCloseTo(0.214, 3);
  });
});

describe('state codes', () => {
  it('classifies rest, depolarizing, depolarized, repolarizing and recovered', () => {
    expect(classifyState(0)).toEqual({ phase: 'rest', fraction: 0 });
    expect(classifyState(Number.NaN).phase).toBe('rest');
    expect(classifyState(-1).phase).toBe('rest');
    expect(classifyState(0.25)).toEqual({ phase: 'depolarizing', fraction: 0.25 });
    expect(classifyState(1)).toEqual({ phase: 'depolarized', fraction: 1 });
    expect(classifyState(1.75).phase).toBe('repolarizing');
    expect(classifyState(1.75).fraction).toBeCloseTo(0.75, 9);
    expect(classifyState(2).phase).toBe('rest');
  });
});

describe('state → colour mapping (pure)', () => {
  it('rest and recovered regions use --heart-rest; no state = anatomy = rest', () => {
    close(stateColor(0, 'ventricle', P), P.rest);
    close(stateColor(2, 'ventricle', P), P.rest);
    close(stateColor(null, 'atria', P), P.rest);
  });

  it('depolarizing ventricles move from rest toward --c-qrs with the activated fraction', () => {
    const d = [0.05, 0.3, 0.6, 0.95].map((s) => dist(stateColor(s, 'ventricle', P), P.qrs));
    for (let i = 1; i < d.length; i++) expect(d[i]).toBeLessThan(d[i - 1]);
    expect(dist(stateColor(0.999, 'ventricle', P), P.qrs)).toBeLessThan(0.01);
    // a region that just started is already visibly tinted
    expect(dist(stateColor(0.01, 'ventricle', P), P.rest)).toBeGreaterThan(0.05);
  });

  it('atria depolarize in --c-atrial, not magenta', () => {
    expect(dist(stateColor(0.99, 'atria', P), P.atrial)).toBeLessThan(0.01);
    expect(dist(stateColor(0.99, 'atria', P), P.qrs)).toBeGreaterThan(0.2);
  });

  it('depolarized (plateau) is a muted magenta between rest and --c-qrs', () => {
    const c = stateColor(1, 'ventricle', P);
    close(c, mix(P.rest, P.qrs, PLATEAU_MIX));
    expect(dist(c, P.qrs)).toBeGreaterThan(0.05);
    expect(dist(c, P.rest)).toBeGreaterThan(0.05);
  });

  it('repolarizing starts at --c-repol and fades back to rest', () => {
    expect(dist(stateColor(1.001, 'ventricle', P), P.repol)).toBeLessThan(0.01);
    const d = [1.1, 1.4, 1.7, 1.95].map((s) => dist(stateColor(s, 'ventricle', P), P.rest));
    for (let i = 1; i < d.length; i++) expect(d[i]).toBeLessThan(d[i - 1]);
  });

  it('applies highlights: infarct overrides, ischemia tints red, block greys, hypertrophy deepens', () => {
    for (const s of [0, 0.5, 1, 1.5]) close(myocardiumColor(s, 'ventricle', 'infarct', P), infarctColor(P));
    const isch = myocardiumColor(0, 'ventricle', 'ischemia', P);
    expect(dist(isch, P.injury)).toBeLessThan(dist(P.rest, P.injury));
    const blk = myocardiumColor(0.5, 'ventricle', 'block', P);
    expect(dist(blk, P.faint)).toBeLessThan(dist(stateColor(0.5, 'ventricle', P), P.faint));
    const hyp = myocardiumColor(0, 'ventricle', 'hypertrophy', P);
    expect(hyp[0] + hyp[1] + hyp[2]).toBeLessThan(P.rest[0] + P.rest[1] + P.rest[2]);
    // tags drawn as geometry leave the state colour untouched
    close(myocardiumColor(0.4, 'ventricle', 'pathway', P), stateColor(0.4, 'ventricle', P));
    close(myocardiumColor(0.4, 'ventricle', 'focus', P), stateColor(0.4, 'ventricle', P));
    close(myocardiumColor(0.4, 'ventricle', undefined, P), stateColor(0.4, 'ventricle', P));
  });

  it('infarct is a dark red; emphasis tints toward the highlight; vessels are neutral', () => {
    const inf = infarctColor(P);
    expect(inf[0]).toBeGreaterThan(inf[1] * 2);
    expect(inf[0]).toBeLessThan(P.injury[0]);
    const e = emphasisTint(P.rest, P);
    expect(dist(e, P.highlight)).toBeLessThan(dist(P.rest, P.highlight));
    const v = vesselColor(P);
    expect(dist(v, P.bg)).toBeLessThan(dist(P.rest, P.bg));
  });
});

describe('conduction overlay', () => {
  it('lights the proximal part of a fibre while it depolarizes', () => {
    expect(conductionLevel(0, 0)).toBe(0);
    expect(conductionLevel(0.5, 0.2)).toBe(1);
    expect(conductionLevel(0.5, 0.5)).toBe(1);
    expect(conductionLevel(0.5, 0.54)).toBeCloseTo(0.5, 6);
    expect(conductionLevel(0.5, 0.9)).toBe(0);
    expect(conductionLevel(1, 0.9)).toBe(1);
    expect(conductionLevel(1.25, 0.3)).toBeCloseTo(0.75, 6);
    expect(conductionLevel(2, 0.3)).toBe(0);
  });

  it('is dim gold at rest, full --c-conduction when activated, grey when blocked', () => {
    close(conductionColor(1, false, P), P.conduction);
    close(conductionColor(0, false, P), conductionDim(P));
    expect(dist(conductionDim(P), P.bg)).toBeLessThan(dist(P.conduction, P.bg));
    close(conductionColor(1, true, P), P.faint);
    close(conductionColor(0, true, P), P.faint);
  });

  it('works for the dark theme tokens too', () => {
    const dark = paletteFromTokens((t) => ({ ...LIGHT, 'heart-rest': '#a8615d', 'heart-bg': '#12161c', 'c-qrs': '#ef6fe0', 'c-conduction': '#f5cf4a' })[t]);
    // on a dark background the activated conduction colour is the brighter one
    const lum = (c: Rgb) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    expect(lum(conductionColor(1, false, dark))).toBeGreaterThan(lum(conductionColor(0, false, dark)));
    close(stateColor(0.999, 'ventricle', dark), dark.qrs, 0.01);
  });
});
