/**
 * Assistant settings: provider, key, base URL, model. Persisted under their own key — never inside the app's
 * preferences (src/app/store.ts), so a key can never end up in a preferences export. localStorage / sessionStorage
 * only inside try/catch (private windows and blocked storage must still work: the settings then live for the session).
 */
import { PROVIDERS, type AssistantSettings, type ProviderId } from './api';

export const DEFAULT_MODEL: Readonly<Record<ProviderId, string>> = {
  anthropic: 'claude-opus-5-5',
  openai: '',
};

export const DEFAULT_BASE_URL: Readonly<Record<ProviderId, string>> = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com/v1',
};

export const DEFAULT_SETTINGS: AssistantSettings = { provider: 'anthropic', apiKey: '', baseUrl: '', model: '', remember: true };

export const STORAGE_KEY = 'ecg-academy:assistant:v1';
/** the key while "remember" is off: sessionStorage, this tab only */
export const SESSION_KEY = 'ecg-academy:assistant:key';

export function isProviderId(s: unknown): s is ProviderId {
  return typeof s === 'string' && (PROVIDERS as readonly string[]).includes(s);
}

/** Drop every whitespace and invisible character a copy-paste can sweep in with a key (zero-width spaces, BOM…). */
export function cleanKey(raw: string): string {
  return raw.replace(/[\s​-‍⁠﻿]/g, '');
}

/**
 * A key the browser can put in a request header: printable ASCII only. A full-width character typed through an IME,
 * for example, makes `Headers.append` throw "String contains non ISO-8859-1 code point".
 */
export function isValidKey(key: string): boolean {
  return /^[\x21-\x7E]*$/.test(key);
}

/** Trim and drop trailing slashes ('' stays ''). */
export function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}

/** Empty, or an absolute http(s) URL. */
export function isValidBaseUrl(raw: string): boolean {
  const s = normalizeBaseUrl(raw);
  if (s === '') return true;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function effectiveBaseUrl(s: AssistantSettings): string {
  return normalizeBaseUrl(s.baseUrl) || DEFAULT_BASE_URL[s.provider];
}

export function effectiveModel(s: AssistantSettings): string {
  return s.model.trim() || DEFAULT_MODEL[s.provider];
}

/** Ready to send: a valid base URL, a model, and a key for Anthropic (a local OpenAI-compatible server may need none). */
export function isConfigured(s: AssistantSettings): boolean {
  if (!isValidBaseUrl(s.baseUrl)) return false;
  if (effectiveModel(s) === '') return false;
  const key = cleanKey(s.apiKey);
  if (!isValidKey(key)) return false;
  return s.provider !== 'anthropic' || key !== '';
}

/** Coerce anything read from storage into settings (unknown fields dropped, wrong types replaced by defaults). */
export function sanitizeSettings(raw: unknown): AssistantSettings {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  return {
    provider: isProviderId(r.provider) ? r.provider : DEFAULT_SETTINGS.provider,
    apiKey: cleanKey(str(r.apiKey)),
    baseUrl: normalizeBaseUrl(str(r.baseUrl)),
    model: str(r.model).trim(),
    remember: typeof r.remember === 'boolean' ? r.remember : DEFAULT_SETTINGS.remember,
  };
}

interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

function local(): StorageLike | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function session(): StorageLike | undefined {
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined;
  }
}

export function loadSettings(): AssistantSettings {
  let s = DEFAULT_SETTINGS;
  try {
    const raw = local()?.getItem(STORAGE_KEY);
    if (raw) s = sanitizeSettings(JSON.parse(raw));
  } catch {
    /* unreadable storage: defaults */
  }
  if (!s.remember && s.apiKey === '') {
    try {
      const k = session()?.getItem(SESSION_KEY);
      if (k) s = { ...s, apiKey: k };
    } catch {
      /* ignore */
    }
  }
  return s;
}

/** Persist (the key only where "remember" says) and return the sanitized settings. */
export function saveSettings(s: AssistantSettings): AssistantSettings {
  const clean = sanitizeSettings(s);
  const stored: AssistantSettings = clean.remember ? clean : { ...clean, apiKey: '' };
  try {
    local()?.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    /* storage unavailable — settings live for this session only */
  }
  try {
    const ss = session();
    if (ss) {
      if (clean.remember || clean.apiKey === '') ss.removeItem(SESSION_KEY);
      else ss.setItem(SESSION_KEY, clean.apiKey);
    }
  } catch {
    /* ignore */
  }
  return clean;
}
