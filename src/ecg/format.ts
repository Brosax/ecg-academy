/** Locale-aware number formatting for read-outs (Spanish uses the decimal comma, typographic minus everywhere). Pure. */
import type { Lang } from '../core/l10n';

const LOCALE: Readonly<Record<Lang, string>> = { zh: 'zh-CN', en: 'en-US', es: 'es-ES' };
const cache = new Map<string, Intl.NumberFormat>();

export function fmtNum(lang: Lang, v: number, digits = 0, signed = false): string {
  if (!Number.isFinite(v)) return '—';
  if (Number(v.toFixed(digits)) === 0) v = 0; // never "−0.00"
  const key = `${lang}|${digits}|${signed}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE[lang], {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      signDisplay: signed ? 'exceptZero' : 'auto',
      useGrouping: false,
    });
    cache.set(key, f);
  }
  return f.format(v).replace('-', '−');
}

/** Nullable variant: "—" when unknown. */
export const fmtOpt = (lang: Lang, v: number | null | undefined, digits = 0, signed = false): string =>
  v === null || v === undefined ? '—' : fmtNum(lang, v, digits, signed);
