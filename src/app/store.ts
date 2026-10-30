/**
 * Global app state (signals). Owned by the integrator; modules read it, only the shell/settings write it.
 * Never read fast-changing signals inside a Preact render except through `.value` in components meant to re-render.
 * Persistence: localStorage inside try/catch (private windows / blocked storage must still work).
 */
import { effect, signal } from '@preact/signals';
import { LANGS, type Lang } from '../core/l10n';

export type Theme = 'light' | 'dark';

export const LAYOUTS = ['3x4+1', '3x4+3', '6x2', '12x1', 'single', 'strip'] as const;
export type LayoutId = (typeof LAYOUTS)[number];

export interface ViewerSettings {
  /** paper speed, mm/s */
  readonly speed: 25 | 50;
  /** gain, mm/mV */
  readonly gain: 5 | 10 | 20;
  /** half gain on the chest leads (common when LVH voltages overlap) */
  readonly chestHalfGain: boolean;
  readonly layout: LayoutId;
  /** limb leads in Cabrera order (aVL, I, −aVR, II, aVF, III) */
  readonly cabrera: boolean;
  /** physical screen calibration (CSS px per real mm); null = fit to the container */
  readonly pxPerMm: number | null;
}

export interface Settings {
  readonly viewer: ViewerSettings;
  /** reduce animation (also follows prefers-reduced-motion) */
  readonly reduceMotion: boolean;
  /** show the small 3D heart side panel where available */
  readonly showHeart: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  viewer: { speed: 25, gain: 10, chestHalfGain: false, layout: '3x4+1', cabrera: false, pxPerMm: null },
  reduceMotion: false,
  showHeart: true,
};

const KEY = 'ecg-academy:prefs:v1';

interface Persisted {
  lang?: Lang;
  theme?: Theme;
  settings?: Settings;
}

function load(): Persisted {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? (JSON.parse(raw) as Persisted) : {};
  } catch {
    return {};
  }
}

function initialLang(p: Persisted): Lang {
  if (p.lang && (LANGS as readonly string[]).includes(p.lang)) return p.lang;
  const nav = (globalThis.navigator?.language ?? 'zh').toLowerCase();
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('en')) return 'en';
  return 'zh';
}

const persisted = load();

export const store = {
  lang: signal<Lang>(initialLang(persisted)),
  theme: signal<Theme>(persisted.theme === 'dark' ? 'dark' : 'light'),
  settings: signal<Settings>({
    ...DEFAULT_SETTINGS,
    ...persisted.settings,
    viewer: { ...DEFAULT_SETTINGS.viewer, ...persisted.settings?.viewer },
  }),
};

export function updateViewer(patch: Partial<ViewerSettings>): void {
  const s = store.settings.value;
  store.settings.value = { ...s, viewer: { ...s.viewer, ...patch } };
}

export function updateSettings(patch: Partial<Omit<Settings, 'viewer'>>): void {
  store.settings.value = { ...store.settings.value, ...patch };
}

/** Persist preferences and mirror lang/theme onto <html>. Called once from main. */
export function startPersistence(): () => void {
  return effect(() => {
    const data: Persisted = { lang: store.lang.value, theme: store.theme.value, settings: store.settings.value };
    try {
      globalThis.localStorage?.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage unavailable — preferences live for this session only */
    }
    const root = globalThis.document?.documentElement;
    if (root) {
      root.dataset.theme = data.theme;
      root.lang = data.lang === 'zh' ? 'zh-CN' : (data.lang ?? 'zh');
    }
  });
}
