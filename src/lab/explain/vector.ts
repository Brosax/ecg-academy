/**
 * Vector vocabulary for explanations. Every vector here is in the FRANK frame (what engine.sampleH and
 * projector.leadVector return): +X patient left, +Y inferior, +Z posterior (src/sim/frame.ts).
 */
import type { Lang } from '../app/store';
import { frontalAngleDeg } from '../sim/frame';
import type { FrankVec, LeadName, LeadProjector } from '../sim/types';
import { LEADS } from '../sim/types';
import { te } from '../i18n/explain';

export const DIRS = ['left', 'right', 'inferior', 'superior', 'anterior', 'posterior'] as const;
export type Dir = (typeof DIRS)[number];

/**
 * Below this a lead is called "near-isoelectric" (0.03 mV = 0.3 mm at 10 mm/mV, under what the eye resolves on the
 * tracing). Shared by the explanations, the quiz and the tests so they can never disagree.
 */
export const ISO_MV = 0.03;
/** Below this |H| the heart vector is described as "almost zero". */
export const H_MIN_MV = 0.05;

export type Deflection = 'up' | 'down' | 'iso';
export const deflectionOf = (mv: number): Deflection => (mv > ISO_MV ? 'up' : mv < -ISO_MV ? 'down' : 'iso');

export const mag = (v: FrankVec): number => Math.hypot(v[0], v[1], v[2]);
export const dotF = (a: FrankVec, b: FrankVec): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const addF = (a: FrankVec, b: FrankVec): FrankVec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** Angle between two vectors in degrees (0…180); null when either is ~zero. */
export function angleBetweenDeg(a: FrankVec, b: FrankVec): number | null {
  const m = mag(a) * mag(b);
  if (m < 1e-12) return null;
  return (Math.acos(Math.max(-1, Math.min(1, dotF(a, b) / m))) * 180) / Math.PI;
}

/** Horizontal (transverse) plane angle: 0° = patient left, +90° = anterior (Frank −Z). */
export const horizontalAngleDeg = (v: FrankVec): number => (Math.atan2(-v[2], v[0]) * 180) / Math.PI;
export { frontalAngleDeg };

/**
 * Named directions of a vector: each axis whose component is at least minFrac·|v| contributes one word,
 * in the fixed order left/right, inferior/superior, anterior/posterior.
 */
export function directionsOf(v: FrankVec, minFrac = 0.3): Dir[] {
  const m = mag(v);
  if (m < 1e-12) return [];
  const out: Dir[] = [];
  if (Math.abs(v[0]) >= minFrac * m) out.push(v[0] > 0 ? 'left' : 'right');
  if (Math.abs(v[1]) >= minFrac * m) out.push(v[1] > 0 ? 'inferior' : 'superior');
  if (Math.abs(v[2]) >= minFrac * m) out.push(v[2] > 0 ? 'posterior' : 'anterior');
  return out;
}

/** "leftward, inferiorly and posteriorly" / "左下后方" / "hacia la izquierda, abajo y atrás". */
export function dirPhrase(lang: Lang, dirs: readonly Dir[]): string {
  const w = dirs.map((d) => te.in(lang, `dir.${d}`));
  if (w.length === 0) return '';
  if (w.length === 1) return te.in(lang, 'dir.join1', { a: w[0] });
  if (w.length === 2) return te.in(lang, 'dir.join2', { a: w[0], b: w[1] });
  return te.in(lang, 'dir.join3', { a: w[0], b: w[1], c: w[2] });
}

export const joinList = (lang: Lang, items: readonly string[]): string => items.join(te.in(lang, 'list.sep'));
export const joinSentences = (lang: Lang, s: readonly string[]): string => s.join(te.in(lang, 'sentence.sep'));

/** Number with locale decimal mark (Spanish uses a comma) and a true minus sign; "-0.00" is printed as "0.00". */
export function fmtNum(x: number, digits: number, lang: Lang, signed = false): string {
  const r = Number(x.toFixed(digits));
  const abs = Math.abs(r).toFixed(digits);
  const s = lang === 'es' ? abs.replace('.', ',') : abs;
  if (r < 0) return `−${s}`;
  return signed && r > 0 ? `+${s}` : s;
}
export const fmtDeg = (x: number, lang: Lang): string => `${fmtNum(x, 0, lang, true)}°`;
/** Up to two decimals without trailing zeros (playback speeds: 0.05, 0.25, 1). */
export function fmtCompact(x: number, lang: Lang): string {
  const s = String(Math.round(x * 100) / 100);
  return lang === 'es' ? s.replace('.', ',') : s;
}

/** Rows of the projector for one lead: atrial (mA) and ventricular (mV) lead vectors (equal in the MVP). */
export function leadRows(p: LeadProjector, lead: LeadName): { readonly a: FrankVec; readonly v: FrankVec } {
  const i = LEADS.indexOf(lead) * 3;
  return { a: [p.mA[i], p.mA[i + 1], p.mA[i + 2]], v: [p.mV[i], p.mV[i + 1], p.mV[i + 2]] };
}

/** Exactly what the ECG shows: L_A·H_A + L_V·H_V (same formula as projector.project). */
export function projectLead(p: LeadProjector, lead: LeadName, hA: FrankVec, hV: FrankVec): number {
  const r = leadRows(p, lead);
  return dotF(r.a, hA) + dotF(r.v, hV);
}

/** Lead vector to *describe* at an instant: the atrial row while the atrial vector dominates, else the ventricular row. */
export function effectiveLeadVector(p: LeadProjector, lead: LeadName, hA: FrankVec, hV: FrankVec): FrankVec {
  const r = leadRows(p, lead);
  return mag(hA) > mag(hV) ? r.a : r.v;
}
