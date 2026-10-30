/**
 * Small helpers for inline localized content (L10n) built by the item generators and graders: templates whose
 * parameters may themselves be localized, joins, finding names and number formatting that every language shares.
 */
import { FINDINGS, type FindingId } from '../../core/findings';
import { LANGS, type L10n, type Lang } from '../../core/l10n';

export const L = (zh: string, en: string, es: string): L10n => ({ zh, en, es });

export type TplValue = string | number | L10n;

const isL10n = (v: TplValue): v is L10n => typeof v === 'object' && v !== null;

/** Fill `{name}` placeholders in every language; L10n parameters are picked per language. */
export function tpl(t: L10n, params: Readonly<Record<string, TplValue>>): L10n {
  const fill = (lang: Lang): string =>
    t[lang].replace(/\{(\w+)\}/g, (m, k: string) => {
      const v = params[k];
      if (v === undefined) return m;
      return isL10n(v) ? v[lang] : String(v);
    });
  return { zh: fill('zh'), en: fill('en'), es: fill('es') };
}

/** Join localized parts with a separator (Chinese uses no space after full-width punctuation). */
export function join(parts: readonly (L10n | null | undefined)[], sep: L10n = L('', ' ', ' ')): L10n {
  const xs = parts.filter((p): p is L10n => !!p);
  const out = {} as Record<Lang, string>;
  for (const lang of LANGS) out[lang] = xs.map((p) => p[lang]).filter((s) => s.length > 0).join(sep[lang]);
  return out;
}

/** A localized list "a, b and c" (Chinese: 、). */
export function list(items: readonly L10n[]): L10n {
  if (items.length === 0) return L('—', '—', '—');
  const out = {} as Record<Lang, string>;
  const conj: Record<Lang, string> = { zh: '和', en: ' and ', es: ' y ' };
  const comma: Record<Lang, string> = { zh: '、', en: ', ', es: ', ' };
  for (const lang of LANGS) {
    const xs = items.map((i) => i[lang]);
    out[lang] = xs.length === 1 ? xs[0] : xs.slice(0, -1).join(comma[lang]) + conj[lang] + xs[xs.length - 1];
  }
  return out;
}

export function fname(id: FindingId): L10n {
  return FINDINGS[id].name;
}

export function same(s: string): L10n {
  return { zh: s, en: s, es: s };
}

/** Signed degrees with a typographic minus: +60°, −30°. */
export function fmtDeg(d: number): string {
  const r = Math.round(d);
  return r > 0 ? `+${r}°` : r < 0 ? `−${Math.abs(r)}°` : '0°';
}

/** ST deviation in mm (1 mm = 0.1 mV at standard gain), signed with a typographic minus: +2.5 mm, −1.0 mm. */
export function fmtStMm(mv: number): string {
  const mm = mv * 10;
  const s = Math.abs(mm).toFixed(1);
  return mm >= 0.05 ? `+${s} mm` : mm <= -0.05 ? `−${s} mm` : '0.0 mm';
}

export function fmtMs(ms: number): string {
  return `${Math.round(ms)} ms`;
}

/** Rounded to `step` (e.g. 5 ms), never −0. */
export function roundTo(x: number, step: number): number {
  const r = Math.round(x / step) * step;
  return r === 0 ? 0 : r;
}

export function nonEmptyL10n(t: L10n | undefined): boolean {
  return !!t && LANGS.every((k) => typeof t[k] === 'string' && t[k].trim().length > 0);
}
