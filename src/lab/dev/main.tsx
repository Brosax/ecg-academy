/**
 * DEV-ONLY mount page for the Heart Lab (not part of the build; nothing imports it). It mimics the ECG Academy host
 * without touching src/main.tsx or src/app: the host's theme/shell/ui CSS, the host store with its persistence (which
 * writes <html data-theme> and <html lang>), a stand-in header built from the host's header classes, and <LabPage>
 * full-bleed below it. The header buttons unmount/remount the lab, switch the host language and theme, and open a
 * scenario through the deep-link prop. `window.__labDev` exposes the same actions for scripted browser checks.
 *
 * Run: npx vite --port 5391 --strictPort   then open http://localhost:5391/src/lab/dev/index.html
 */
import { signal } from '@preact/signals';
import { render } from 'preact';
import '../../app/theme.css';
import '../../app/shell.css';
import { startPersistence, store } from '../../app/store';
import type { Theme } from '../../app/store';
import type { Lang } from '../../core/l10n';
import { Button } from '../../ui';
import { LabPage, labScenarioIds } from '../index';

startPersistence();

const mounted = signal(true);
const scenario = signal<string | undefined>(undefined);
const mounts = signal(1);

const actions = {
  mount() {
    if (!mounted.peek()) mounts.value = mounts.peek() + 1;
    mounted.value = true;
  },
  unmount() {
    mounted.value = false;
  },
  setLang(l: Lang) {
    store.lang.value = l;
  },
  setTheme(t: Theme) {
    store.theme.value = t;
  },
  open(id: string | undefined) {
    scenario.value = id;
  },
  state: () => ({ mounted: mounted.peek(), mounts: mounts.peek(), scenario: scenario.peek(), lang: store.lang.peek(), theme: store.theme.peek() }),
};
(window as unknown as { __labDev: typeof actions }).__labDev = actions;

function DevHeader() {
  const dark = store.theme.value === 'dark';
  return (
    <header class="app-header">
      <div class="app-header__inner">
        <span class="app-brand">
          <span class="app-brand__name">Heart Lab · dev</span>
        </span>
        {/* one fixed-height row like the real header; the dev controls scroll sideways on narrow screens */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 auto', minWidth: 0, overflowX: 'auto' }}>
        <Button size="sm" tone={mounted.value ? 'default' : 'primary'} onClick={() => (mounted.value ? actions.unmount() : actions.mount())}>
          {mounted.value ? 'Unmount' : 'Mount'}
        </Button>
        {(['zh', 'en', 'es'] as const).map((l) => (
          <Button size="sm" tone={store.lang.value === l ? 'primary' : 'default'} onClick={() => actions.setLang(l)}>
            {l}
          </Button>
        ))}
        <Button size="sm" onClick={() => actions.setTheme(dark ? 'light' : 'dark')}>
          {dark ? 'light' : 'dark'}
        </Button>
        <select aria-label="scenario" value={scenario.value ?? ''} onChange={(e) => actions.open((e.currentTarget as HTMLSelectElement).value || undefined)}>
          <option value="">(no deep link)</option>
          {labScenarioIds().map((id) => (
            <option value={id}>{id}</option>
          ))}
        </select>
        <span class="tabular">mounts: {mounts.value}</span>
        </div>
      </div>
    </header>
  );
}

function DevApp() {
  return (
    <div class="app">
      <DevHeader />
      {/* full-bleed, as the integrator should render the #/lab route */}
      <main id="main" class="app-main" style={{ maxWidth: 'none', padding: 0 }}>
        {mounted.value && <LabPage key={mounts.value} scenario={scenario.value} />}
      </main>
    </div>
  );
}

render(<DevApp />, document.getElementById('app')!);
