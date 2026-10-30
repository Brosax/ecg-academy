/**
 * Typed UI-string dictionaries. Each module owns `src/i18n/<module>.ts` and calls defineDict() once; en/es must cover every
 * zh key (enforced by the type). Calling `tr(key)` inside a Preact render subscribes to store.lang, so a language switch
 * re-renders. Content text (lessons, atlas, findings) uses inline L10n objects instead (src/core/l10n.ts).
 */
import { store } from '../app/store';
import { format, pick, type L10n, type Lang } from '../core/l10n';

export type Dict = Record<string, string>;
export type Params = Readonly<Record<string, string | number>>;

export interface Translator<K extends string> {
  (key: K, params?: Params): string;
  /** explicit language, no signal subscription — for canvases and three.js labels */
  in(lang: Lang, key: K, params?: Params): string;
  readonly ns: string;
}

export function defineDict<T extends Dict>(
  ns: string,
  zh: T,
  en: { readonly [K in keyof T]: string },
  es: { readonly [K in keyof T]: string },
): Translator<Extract<keyof T, string>> {
  const all: Record<Lang, Dict> = { zh, en: en as Dict, es: es as Dict };
  const lookup = (lang: Lang, key: string, params?: Params) => format(all[lang][key] ?? all.en[key] ?? all.zh[key] ?? key, params);
  const tr = Object.assign((key: string, params?: Params) => lookup(store.lang.value, key, params), { in: lookup, ns });
  return tr as unknown as Translator<Extract<keyof T, string>>;
}

/** Localize inline content text in the current language (subscribes to store.lang when used in a render). */
export function lt(t: L10n): string {
  return pick(t, store.lang.value);
}

export const LANG_OPTIONS: readonly { id: Lang; label: string }[] = [
  { id: 'zh', label: '中文' },
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
];
