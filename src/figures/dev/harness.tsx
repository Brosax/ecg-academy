/**
 * DEV ONLY — visual harness for the figures (open /src/figures/dev/harness.html with the Vite dev server). Not part of
 * the app build. Uses the ECG workstream's dev fixture to feed the ECG-reading figures.
 */
import { signal } from '@preact/signals';
import { render } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import '../../app/theme.css';
import { store } from '../../app/store';
import type { Ecg } from '../../core/ecg';
import type { Lang } from '../../core/l10n';
import { FIXTURE_PRESETS, makeFixtureEcg, type FixturePreset } from '../../ecg/dev/fixture';
import { Figure, FIGURE_IDS, type FigureProps } from '../index';

const q = new URLSearchParams(location.search);
const cursor = signal<number | null>(q.get('t') ? Number(q.get('t')) : null);
if (q.get('lang')) store.lang.value = q.get('lang') as Lang;
if (q.get('theme')) document.documentElement.dataset.theme = q.get('theme')!;

function App() {
  const [which, setWhich] = useState<string>(q.get('fig') ?? 'all');
  const [preset, setPreset] = useState<FixturePreset | 'none'>((q.get('ecg') as FixturePreset | null) ?? 'none');
  const ecg: Ecg | undefined = useMemo(() => (preset === 'none' ? undefined : makeFixtureEcg(FIXTURE_PRESETS[preset])), [preset]);
  const items: FigureProps[] = [
    { id: 'paper' },
    { id: 'electrodes', params: { highlight: ['V1', 'V2'], showExtra: q.get('extra') === '1' } },
    { id: 'hexaxial', params: { quadrantMode: true } },
    { id: 'horizontal-plane' },
    { id: 'conduction', ecg, cursor },
    { id: 'conduction', params: { block: 'rbb' } },
    { id: 'laddergram', ecg, cursor },
    { id: 'action-potential', ecg, cursor },
    { id: 'dipole' },
    { id: 'axis-calculator', ecg },
    { id: 'rate-ruler', ecg },
    { id: 'qtc-calculator', ecg },
    { id: 'territories' },
    { id: 'decision-tree', params: { tree: 'wide-tachy' } },
    { id: 'decision-tree', params: { tree: 'brady-av-block' } },
    { id: 'vector-loop', ecg, cursor },
  ];
  const shown = which === 'all' ? items : items.filter((f) => f.id === which);
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px', background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={store.lang.value} onChange={(e) => (store.lang.value = e.currentTarget.value as Lang)}>
          <option value="zh">中文</option>
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
        <select
          onChange={(e) => {
            document.documentElement.dataset.theme = e.currentTarget.value;
          }}
        >
          <option value="light">light</option>
          <option value="dark">dark</option>
        </select>
        <select value={which} onChange={(e) => setWhich(e.currentTarget.value)}>
          <option value="all">all</option>
          {FIGURE_IDS.map((id) => (
            <option value={id}>{id}</option>
          ))}
        </select>
        <select value={preset} onChange={(e) => setPreset(e.currentTarget.value as FixturePreset | 'none')}>
          <option value="none">no ECG</option>
          {Object.keys(FIXTURE_PRESETS).map((k) => (
            <option value={k}>{k}</option>
          ))}
        </select>
        <span>cursor: {cursor.value ?? '—'}</span>
      </div>
      {shown.map((f) => (
        <Figure {...f} />
      ))}
    </div>
  );
}

render(<App />, document.getElementById('app')!);

// ?scrub=0.4 drives every range input of the shown figures to that fraction (to inspect mid-animation states)
const scrub = q.get('scrub');
if (scrub != null) {
  setTimeout(() => {
    for (const el of Array.from(document.querySelectorAll<HTMLInputElement>('figure input[type=range]'))) {
      const lo = Number(el.min), hi = Number(el.max);
      el.value = String(Math.round(lo + (hi - lo) * Number(scrub)));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, 300);
}
