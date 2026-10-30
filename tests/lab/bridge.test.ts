/**
 * Host bridge and deep-link opener: the lab follows ECG Academy's language and theme while mounted (and stops when
 * unmounted); a deep link switches to disease mode and selects the scenario, serialised and ignoring unknown ids.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { store as hostStore } from '../../src/app/store';
import type { AppCommands } from '../../src/lab/app/commands';
import { isScenarioId, openScenario } from '../../src/lab/app/deepLink';
import { store as labStore } from '../../src/lab/app/store';
import { installHostBridge, syncFromHost, toLabLang, toLabTheme } from '../../src/lab/bridge';

const hostLang = hostStore.lang.peek();
const hostTheme = hostStore.theme.peek();
afterEach(() => {
  hostStore.lang.value = hostLang;
  hostStore.theme.value = hostTheme;
});

describe('host bridge', () => {
  it('copies the host language and theme once (before the first lab render)', () => {
    hostStore.lang.value = 'es';
    hostStore.theme.value = 'dark';
    syncFromHost();
    expect(labStore.lang.peek()).toBe('es');
    expect(labStore.theme.peek()).toBe('dark');
  });

  it('follows host changes while installed and stops after cleanup', () => {
    const off = installHostBridge();
    hostStore.lang.value = 'en';
    hostStore.theme.value = 'light';
    expect(labStore.lang.peek()).toBe('en');
    expect(labStore.theme.peek()).toBe('light');
    hostStore.lang.value = 'zh';
    expect(labStore.lang.peek()).toBe('zh');
    off();
    hostStore.lang.value = 'es';
    expect(labStore.lang.peek()).toBe('zh');
  });

  it('maps unknown values to the defaults', () => {
    expect(toLabLang('fr')).toBe('zh');
    expect(toLabTheme('sepia')).toBe('light');
  });
});

describe('deep link', () => {
  function fakeCommands() {
    const calls: string[] = [];
    const commands = {
      setMode(m: string) {
        calls.push(`mode:${m}`);
      },
      async setScenario(id: string) {
        calls.push(`start:${id}`);
        await new Promise((r) => setTimeout(r, 5));
        calls.push(`end:${id}`);
      },
    } as unknown as AppCommands;
    return { commands, calls };
  }

  it('knows the scenario ids', () => {
    expect(isScenarioId('lbbb')).toBe(true);
    expect(isScenarioId('toString')).toBe(false);
    expect(isScenarioId('no-such-thing')).toBe(false);
  });

  it('opens disease mode and selects the scenario; unknown ids do nothing', async () => {
    const { commands, calls } = fakeCommands();
    await openScenario(commands, 'no-such-thing');
    expect(calls).toEqual([]);
    await openScenario(commands, 'lbbb');
    expect(calls).toEqual(['mode:disease', 'start:lbbb', 'end:lbbb']);
  });

  it('serialises requests that arrive while a scenario is still loading', async () => {
    const { commands, calls } = fakeCommands();
    const a = openScenario(commands, 'rbbb');
    const b = openScenario(commands, 'lvh');
    await Promise.all([a, b]);
    expect(calls.filter((c) => !c.startsWith('mode:'))).toEqual(['start:rbbb', 'end:rbbb', 'start:lvh', 'end:lvh']);
  });
});
