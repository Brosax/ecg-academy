/**
 * Assistant settings (src/assistant/settings.ts): URL normalisation and validation, effective defaults per provider,
 * "configured" rules, sanitising stored data, and persistence — the key goes to localStorage only while "remember" is
 * on (sessionStorage otherwise), and broken storage never throws.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanKey,
  isValidKey,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  DEFAULT_SETTINGS,
  effectiveBaseUrl,
  effectiveModel,
  isConfigured,
  isValidBaseUrl,
  loadSettings,
  normalizeBaseUrl,
  sanitizeSettings,
  saveSettings,
  SESSION_KEY,
  STORAGE_KEY,
} from '../../src/assistant/settings';

function fakeStorage(): Storage & { readonly map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    key: (i: number) => [...map.keys()][i] ?? null,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('base URL', () => {
  it('normalises whitespace and trailing slashes', () => {
    expect(normalizeBaseUrl('  https://api.deepseek.com/v1/  ')).toBe('https://api.deepseek.com/v1');
    expect(normalizeBaseUrl('')).toBe('');
    expect(normalizeBaseUrl('   ')).toBe('');
  });
  it('accepts empty and absolute http(s) URLs only', () => {
    expect(isValidBaseUrl('')).toBe(true);
    expect(isValidBaseUrl('https://api.openai.com/v1')).toBe(true);
    expect(isValidBaseUrl('http://localhost:11434/v1')).toBe(true);
    expect(isValidBaseUrl('api.openai.com/v1')).toBe(false);
    expect(isValidBaseUrl('ftp://x')).toBe(false);
    expect(isValidBaseUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('key cleaning', () => {
  it('removes whitespace and invisible characters a paste sweeps in', () => {
    expect(cleanKey(' sk-ant-abc​\n')).toBe('sk-ant-abc');
    expect(cleanKey('﻿sk-ant-abc⁠')).toBe('sk-ant-abc');
  });
  it('accepts printable ASCII only (a full-width character would break the request header)', () => {
    expect(isValidKey('sk-ant-abc_123-XYZ')).toBe(true);
    expect(isValidKey('')).toBe(true);
    expect(isValidKey('sk-ant-abc，')).toBe(false);
    expect(isValidKey('ｓk-ant')).toBe(false);
    expect(isValidKey('sk ant')).toBe(false);
  });
  it('a key with non-ASCII characters is not configured; sanitize cleans invisible characters', () => {
    expect(isConfigured({ ...DEFAULT_SETTINGS, apiKey: 'sk-ant-abc，' })).toBe(false);
    expect(sanitizeSettings({ apiKey: ' sk-​ant ' }).apiKey).toBe('sk-ant');
  });
});

describe('effective values and configured', () => {
  it('falls back to the provider defaults', () => {
    expect(effectiveBaseUrl(DEFAULT_SETTINGS)).toBe(DEFAULT_BASE_URL.anthropic);
    expect(effectiveModel(DEFAULT_SETTINGS)).toBe(DEFAULT_MODEL.anthropic);
    expect(DEFAULT_MODEL.anthropic).toBe('claude-opus-5-5');
    const oa = { ...DEFAULT_SETTINGS, provider: 'openai' as const };
    expect(effectiveBaseUrl(oa)).toBe('https://api.openai.com/v1');
    expect(effectiveModel(oa)).toBe('');
  });
  it('anthropic needs a key; an OpenAI-compatible endpoint needs a model (a key is optional for local servers)', () => {
    expect(isConfigured(DEFAULT_SETTINGS)).toBe(false);
    expect(isConfigured({ ...DEFAULT_SETTINGS, apiKey: 'sk-x' })).toBe(true);
    expect(isConfigured({ ...DEFAULT_SETTINGS, provider: 'openai', apiKey: 'k' })).toBe(false);
    expect(isConfigured({ ...DEFAULT_SETTINGS, provider: 'openai', model: 'llama3', baseUrl: 'http://localhost:11434/v1' })).toBe(true);
    expect(isConfigured({ ...DEFAULT_SETTINGS, apiKey: 'k', baseUrl: 'not a url' })).toBe(false);
  });
});

describe('sanitizeSettings', () => {
  it('drops unknown fields, fixes types and trims', () => {
    expect(sanitizeSettings({ provider: 'openai', apiKey: ' k ', baseUrl: 'https://x/v1/', model: ' m ', remember: false, extra: 1 })).toEqual({
      provider: 'openai',
      apiKey: 'k',
      baseUrl: 'https://x/v1',
      model: 'm',
      remember: false,
    });
    expect(sanitizeSettings({ provider: 'gemini', apiKey: 5, remember: 'yes' })).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('x')).toEqual(DEFAULT_SETTINGS);
  });
});

describe('persistence', () => {
  it('remember on: everything in localStorage, nothing in sessionStorage', () => {
    const ls = fakeStorage();
    const ss = fakeStorage();
    vi.stubGlobal('localStorage', ls);
    vi.stubGlobal('sessionStorage', ss);
    const s = { provider: 'anthropic' as const, apiKey: 'sk-1', baseUrl: '', model: '', remember: true };
    expect(saveSettings(s)).toEqual(s);
    expect(JSON.parse(ls.map.get(STORAGE_KEY) ?? '{}')).toEqual(s);
    expect(ss.map.has(SESSION_KEY)).toBe(false);
    expect(loadSettings()).toEqual(s);
  });

  it('remember off: the key goes to sessionStorage only and is read back from there', () => {
    const ls = fakeStorage();
    const ss = fakeStorage();
    vi.stubGlobal('localStorage', ls);
    vi.stubGlobal('sessionStorage', ss);
    const s = { provider: 'openai' as const, apiKey: 'k2', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', remember: false };
    saveSettings(s);
    expect(JSON.parse(ls.map.get(STORAGE_KEY) ?? '{}').apiKey).toBe('');
    expect(ss.map.get(SESSION_KEY)).toBe('k2');
    expect(loadSettings()).toEqual(s);
    // a new tab (no sessionStorage) has the settings but no key
    vi.stubGlobal('sessionStorage', fakeStorage());
    expect(loadSettings()).toEqual({ ...s, apiKey: '' });
  });

  it('switching remember off removes a previously stored key', () => {
    const ls = fakeStorage();
    vi.stubGlobal('localStorage', ls);
    vi.stubGlobal('sessionStorage', fakeStorage());
    saveSettings({ ...DEFAULT_SETTINGS, apiKey: 'sk-1' });
    saveSettings({ ...DEFAULT_SETTINGS, apiKey: 'sk-1', remember: false });
    expect(JSON.parse(ls.map.get(STORAGE_KEY) ?? '{}').apiKey).toBe('');
  });

  it('never throws when storage is missing, blocked or holds garbage', () => {
    vi.stubGlobal('localStorage', undefined);
    vi.stubGlobal('sessionStorage', undefined);
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow();
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    vi.stubGlobal('localStorage', throwing);
    vi.stubGlobal('sessionStorage', throwing);
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings({ ...DEFAULT_SETTINGS, apiKey: 'k', remember: false })).not.toThrow();
    const ls = fakeStorage();
    ls.map.set(STORAGE_KEY, '{not json');
    vi.stubGlobal('localStorage', ls);
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
