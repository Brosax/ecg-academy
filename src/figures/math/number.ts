/**
 * Numbers in the figures' UI.
 * - Typed input (QTc calculator and other number fields): a controlled field must not clamp on every keystroke —
 *   typing "450" into a field with min 200 passes through "4" and "45", which are partial entries, not values.
 * - Display: localized decimal separator and a true minus sign (shared.tsx wraps these with the current language).
 */
import type { Lang } from '../../core/l10n';

/** Parse what the learner typed ('.' or ',' as decimal separator); null when empty or not a number. */
export function parseTyped(raw: string): number | null {
  const s = raw.trim().replace(',', '.');
  if (!s) return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

/** While typing: the value to commit now, or null to wait (empty, partial or out of range). */
export function liveNumber(raw: string, min: number, max: number): number | null {
  const v = parseTyped(raw);
  return v != null && v >= min && v <= max ? v : null;
}

/** When the field is left (blur / Enter): the typed value clamped to [min, max], or `previous` if nothing valid. */
export function finalNumber(raw: string, min: number, max: number, previous: number): number {
  const v = parseTyped(raw);
  return v == null ? previous : Math.min(max, Math.max(min, v));
}

// ── display ─────────────────────────────────────────────────────────────────────────────────────────────────────

const MINUS = '−';

/**
 * Fixed decimals with the language's decimal separator (comma in Spanish) and a true minus sign (U+2212). A value that
 * rounds to zero is shown without a sign ("0.00", never "−0.00").
 */
export function formatFixed(x: number, digits: number, lang: Lang): string {
  const s = Math.abs(x).toFixed(digits);
  const body = lang === 'es' ? s.replace('.', ',') : s;
  return (x < 0 && Number(s) !== 0 ? MINUS : '') + body;
}

/** As formatFixed, with an explicit plus on positive values (axis angles: +60°, −30°). */
export function formatSigned(x: number, digits: number, lang: Lang): string {
  const s = formatFixed(x, digits, lang);
  return x > 0 && Number(Math.abs(x).toFixed(digits)) !== 0 ? `+${s}` : s;
}
