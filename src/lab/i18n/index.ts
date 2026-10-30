/**
 * Minimal typed i18n. Each module owns its own dictionaries in src/i18n/<module>/{zh,en,es}.ts and calls
 * defineDict() once; en/es must cover every zh key (enforced by the type). Reading `tr(...)` inside a Preact
 * render subscribes to store.lang, so language switches re-render automatically.
 *
 * Template params: "{name}" placeholders, e.g. tr('hr', { bpm: 75 }).
 */
import { store } from '../app/store';
import type { Lang } from '../app/store';

export type Dict = Record<string, string>;
export type Params = Record<string, string | number>;

export function format(s: string, params?: Params): string {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (_m, k: string) => (k in params ? String(params[k]) : `{${k}}`));
}

export interface Translator<K extends string> {
  (key: K, params?: Params): string;
  /** Explicit language (no signal subscription) — for canvases and three.js labels. */
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
  const lookup = (lang: Lang, key: string, params?: Params) => format(all[lang][key] ?? all.zh[key] ?? key, params);
  const tr = Object.assign((key: string, params?: Params) => lookup(store.lang.value, key, params), { in: lookup, ns });
  return tr as unknown as Translator<Extract<keyof T, string>>;
}

export const LANGS: readonly { id: Lang; label: string; htmlLang: string }[] = [
  { id: 'zh', label: '中文', htmlLang: 'zh-CN' },
  { id: 'en', label: 'English', htmlLang: 'en' },
  { id: 'es', label: 'Español', htmlLang: 'es' },
];
