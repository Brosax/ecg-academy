/**
 * Pure colour logic of the 3D heart: CSS token parsing and the mapping from a region's activation/repolarization state
 * (RegionStates.stateAt codes) and highlight tag to a colour. The colour language follows src/app/theme.css:
 * atrial = amber, ventricular depolarization = magenta, repolarization = teal, conduction = gold, injury = red.
 * All colours derive from theme tokens (read at runtime, re-read on theme change); nothing here is hard-coded.
 */
import type { RegionStates } from '../core/ecg';

/** sRGB components in [0, 1]. */
export type Rgb = readonly [number, number, number];

export type HighlightTag = NonNullable<RegionStates['highlights'][keyof RegionStates['highlights']]>;

/** CSS custom properties (without the leading --) the heart reads. */
export const HEART_TOKENS = [
  'heart-rest',
  'heart-bg',
  'c-atrial',
  'c-qrs',
  'c-repol',
  'c-conduction',
  'c-injury',
  'c-highlight',
  'fg',
  'fg-faint',
] as const;
export type HeartToken = (typeof HEART_TOKENS)[number];

export interface HeartPalette {
  readonly rest: Rgb;
  readonly bg: Rgb;
  readonly atrial: Rgb;
  readonly qrs: Rgb;
  readonly repol: Rgb;
  readonly conduction: Rgb;
  readonly injury: Rgb;
  readonly highlight: Rgb;
  readonly fg: Rgb;
  readonly faint: Rgb;
}

const clamp01 = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x);

/** Parse #rgb, #rgba, #rrggbb, #rrggbbaa, rgb()/rgba() (comma or space syntax). Alpha is ignored. Null if unknown. */
export function parseCssColor(input: string): Rgb | null {
  const s = input.trim().toLowerCase();
  let m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m) {
    const h = m[1];
    if (h.length === 3 || h.length === 4) {
      return [parseInt(h[0] + h[0], 16) / 255, parseInt(h[1] + h[1], 16) / 255, parseInt(h[2] + h[2], 16) / 255];
    }
    if (h.length === 6 || h.length === 8) {
      return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
    }
    return null;
  }
  m = /^rgba?\(\s*([^)]*)\)$/.exec(s);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3);
    if (parts.length < 3) return null;
    const v = parts.map((p) => (p.endsWith('%') ? (parseFloat(p) / 100) * 255 : parseFloat(p)));
    if (v.some((x) => !Number.isFinite(x))) return null;
    return [clamp01(v[0] / 255), clamp01(v[1] / 255), clamp01(v[2] / 255)];
  }
  return null;
}

/**
 * Palette from a token reader (e.g. getComputedStyle(el).getPropertyValue). An unreadable token falls back to the
 * text colour, then to neutral grey (a parse fallback, not a design colour).
 */
export function paletteFromTokens(read: (token: HeartToken) => string): HeartPalette {
  const fg = parseCssColor(read('fg')) ?? ([0.5, 0.5, 0.5] as const);
  const get = (t: HeartToken): Rgb => parseCssColor(read(t)) ?? fg;
  return {
    rest: get('heart-rest'),
    bg: get('heart-bg'),
    atrial: get('c-atrial'),
    qrs: get('c-qrs'),
    repol: get('c-repol'),
    conduction: get('c-conduction'),
    injury: get('c-injury'),
    highlight: get('c-highlight'),
    fg,
    faint: get('fg-faint'),
  };
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const k = clamp01(t);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

export function darken(a: Rgb, k: number): Rgb {
  const f = clamp01(k);
  return [a[0] * f, a[1] * f, a[2] * f];
}

/** sRGB → linear (three.js vertex colours and material colours are linear when colour management is on). */
export function srgbToLinear(c: Rgb): Rgb {
  const f = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return [f(c[0]), f(c[1]), f(c[2])];
}

export function toCss(c: Rgb): string {
  const h = (x: number) => Math.round(clamp01(x) * 255).toString(16).padStart(2, '0');
  return `#${h(c[0])}${h(c[1])}${h(c[2])}`;
}

// ------------------------------------------------------------------------------------------------ states

export const STATE_PHASES = ['rest', 'depolarizing', 'depolarized', 'repolarizing'] as const;
export type StatePhase = (typeof STATE_PHASES)[number];

/**
 * Decode a RegionStates code: 0 rest · (0,1) depolarizing (fraction activated) · 1 depolarized ·
 * (1,2) repolarizing (fraction recovered) · ≥ 2 recovered (= rest). NaN / negative = rest.
 */
export function classifyState(s: number): { readonly phase: StatePhase; readonly fraction: number } {
  if (!(s > 0) || s >= 2) return { phase: 'rest', fraction: 0 };
  if (s < 1) return { phase: 'depolarizing', fraction: s };
  if (s === 1) return { phase: 'depolarized', fraction: 1 };
  return { phase: 'repolarizing', fraction: s - 1 };
}

/** Share of the depolarization colour in a fully depolarized (plateau) region — "muted" magenta / amber. */
export const PLATEAU_MIX = 0.5;
/** A region that has just started to depolarize already shows this much colour, so the wavefront is visible. */
export const ONSET_MIX = 0.25;

export type MyocardiumKind = 'atria' | 'ventricle';

/**
 * Colour of a myocardial region for a state code (null = no state, anatomy only):
 * rest = --heart-rest; depolarizing → --c-qrs (atria → --c-atrial) blending with the activated fraction;
 * depolarized = muted (plateau); repolarizing → --c-repol fading back to rest as the region recovers.
 */
export function stateColor(state: number | null, kind: MyocardiumKind, P: HeartPalette): Rgb {
  if (state === null) return P.rest;
  const { phase, fraction } = classifyState(state);
  const dep = kind === 'atria' ? P.atrial : P.qrs;
  switch (phase) {
    case 'rest':
      return P.rest;
    case 'depolarizing':
      return mix(P.rest, dep, ONSET_MIX + (1 - ONSET_MIX) * fraction);
    case 'depolarized':
      return mix(P.rest, dep, PLATEAU_MIX);
    case 'repolarizing':
      return mix(P.repol, P.rest, fraction);
  }
}

/** Infarcted (necrotic, electrically silent) myocardium: dark red whatever the state. */
export function infarctColor(P: HeartPalette): Rgb {
  return darken(P.injury, 0.6);
}

/** Region colour with its static highlight applied. Accessory pathway and ectopic focus are drawn as geometry. */
export function myocardiumColor(state: number | null, kind: MyocardiumKind, tag: HighlightTag | undefined, P: HeartPalette): Rgb {
  if (tag === 'infarct') return infarctColor(P);
  const base = stateColor(state, kind, P);
  if (tag === 'ischemia') return mix(base, P.injury, 0.45);
  if (tag === 'block') return mix(base, P.faint, 0.8);
  if (tag === 'hypertrophy') return darken(base, 0.85); // plus a thickened wall (geometry)
  return base;
}

/** Emphasized regions get a light tint of the highlight colour (plus an outline drawn as geometry). */
export function emphasisTint(c: Rgb, P: HeartPalette): Rgb {
  return mix(c, P.highlight, 0.2);
}

/** Great-vessel stubs: a pale, neutral version of the myocardium colour (orientation only). */
export function vesselColor(P: HeartPalette): Rgb {
  return mix(P.rest, P.bg, 0.45);
}

// ------------------------------------------------------------------------------------------------ conduction

/** Width (in polyline arc fraction) of the soft leading edge of an activation front along a conduction path. */
export const FRONT_SOFTNESS = 0.08;

/**
 * Activation level (0 = resting, dim … 1 = activated, bright) of a point at arc fraction `frac` ∈ [0,1] along a
 * conduction polyline whose region has state `state`. While depolarizing, the proximal part (frac ≤ fraction) is lit
 * and the front has a short soft edge; depolarized = lit; repolarizing fades back.
 */
export function conductionLevel(state: number, frac: number): number {
  const { phase, fraction } = classifyState(state);
  switch (phase) {
    case 'rest':
      return 0;
    case 'depolarized':
      return 1;
    case 'repolarizing':
      return 1 - fraction;
    case 'depolarizing': {
      if (frac <= fraction) return 1;
      return clamp01(1 - (frac - fraction) / FRONT_SOFTNESS);
    }
  }
}

/** Dim (resting) conduction colour: the gold token faded toward the background. */
export function conductionDim(P: HeartPalette): Rgb {
  return mix(P.conduction, P.bg, 0.4);
}

/** Conduction colour for an activation level; a blocked segment is grey. */
export function conductionColor(level: number, blocked: boolean, P: HeartPalette): Rgb {
  if (blocked) return P.faint;
  return mix(conductionDim(P), P.conduction, level);
}
