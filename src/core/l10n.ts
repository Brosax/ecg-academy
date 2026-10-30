/**
 * Inline localized text for content (lessons, atlas, findings). UI chrome strings use per-module dictionaries
 * (src/i18n); content text lives next to the content as `{ zh, en, es }` so one reviewer sees all three at once.
 * Spanish is Spain usage ("derivación", "aurícula", "bloqueo de rama"); Chinese uses standard textbook terms.
 */
export const LANGS = ['zh', 'en', 'es'] as const;
export type Lang = (typeof LANGS)[number];

export interface L10n {
  readonly zh: string;
  readonly en: string;
  readonly es: string;
}

/** Pick the text for a language, falling back to English then Chinese. */
export function pick(t: L10n, lang: Lang): string {
  return t[lang] || t.en || t.zh;
}

/** Build an L10n (helps keep argument order zh, en, es consistent in data files). */
export function l(zh: string, en: string, es: string): L10n {
  return { zh, en, es };
}

/** "{name}" placeholder substitution shared by UI dictionaries and content. */
export function format(s: string, params?: Readonly<Record<string, string | number>>): string {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (_m, k: string) => (k in params ? String(params[k]) : `{${k}}`));
}
