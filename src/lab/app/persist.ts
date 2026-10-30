/**
 * Per-viewer conveniences in localStorage — always guarded, never required.
 *
 * Heart Lab (ECG Academy): language and theme belong to the host app (its store and its own storage key; it also owns
 * <html lang> and <html data-theme>), so this keeps only the lab's own preference (electrode colour standard) under the
 * old key. Old saved lang/theme values are read only to keep the record intact on write.
 */
import { effect } from '@preact/signals';
import { store } from './store';

const KEY = 'dyn-ecg:prefs:v1';

interface Prefs {
  lang?: string;
  theme?: string;
  electrodeStandard?: 'IEC' | 'AHA';
}

function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Prefs) : {};
  } catch {
    /* storage unavailable (private mode, sandbox) or unreadable — defaults apply */
    return {};
  }
}

export function installPersistence(): () => void {
  const saved = readPrefs();
  if (saved.electrodeStandard === 'IEC' || saved.electrodeStandard === 'AHA') store.electrodeStandard.value = saved.electrodeStandard;
  return effect(() => {
    const p: Prefs = { ...saved, electrodeStandard: store.electrodeStandard.value };
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  });
}
