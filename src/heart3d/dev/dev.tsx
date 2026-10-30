/**
 * Development harness for <Heart3D> (open /src/heart3d/dev/index.html with `npx vite`). Not part of the app build.
 */
import { render } from 'preact';
import { signal } from '@preact/signals';
import { useMemo, useState } from 'preact/hooks';
import '../../app/theme.css';
import { store } from '../../app/store';
import type { RegionStates } from '../../core/ecg';
import type { RegionId } from '../../core/regions';
import { Heart3D } from '../index';
import { demoRegions } from './fixture';

// initial state from the query string (?t=200&scenario=wpw&cond=1&anat=1&emph=a,b&size=320&lang=en&theme=dark)
const q = new URLSearchParams(location.search);
const cursor = signal<number | null>(q.has('t') ? Number(q.get('t')) : null);
if (q.get('lang') === 'zh' || q.get('lang') === 'en' || q.get('lang') === 'es') store.lang.value = q.get('lang') as 'zh' | 'en' | 'es';
if (q.get('theme') === 'dark') document.documentElement.dataset.theme = 'dark';
// ?nogl=1 simulates a browser without WebGL (checks the fallback text)
if (q.get('nogl') === '1') {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
    return type.startsWith('webgl') || type === 'experimental-webgl' ? null : (orig as (...a: unknown[]) => unknown).call(this, type, ...rest);
  } as typeof orig;
}

const SCENARIOS: Record<string, RegionStates['highlights']> = {
  normal: {},
  anteriorMI: { 'lv-mid-anterior': 'infarct', 'lv-apical-anterior': 'infarct', 'lv-basal-anterior': 'ischemia', 'lv-mid-anteroseptal': 'ischemia' },
  wpw: { 'lv-basal-inferolateral': 'pathway' },
  pvc: { 'rv-outflow': 'focus' },
  rbbb: { rbb: 'block' },
  lvh: { 'lv-mid-inferolateral': 'hypertrophy', 'lv-mid-anterolateral': 'hypertrophy', 'lv-basal-anterolateral': 'hypertrophy', 'lv-basal-inferolateral': 'hypertrophy' },
};

function Dev() {
  const [scenario, setScenario] = useState(q.get('scenario') ?? 'normal');
  const [cond, setCond] = useState(q.get('cond') === '1');
  const [anatomy, setAnatomy] = useState(q.get('anat') === '1');
  const [emph, setEmph] = useState<string>(q.get('emph') ?? '');
  const [size, setSize] = useState(Number(q.get('size') ?? 320));
  const [mounted, setMounted] = useState(true);
  const regions = useMemo(() => (anatomy ? null : demoRegions(SCENARIOS[scenario])), [scenario, anatomy]);
  const emphasize = emph ? (emph.split(',') as RegionId[]) : undefined;
  return (
    <div style={{ padding: '16px', display: 'flex', gap: '24px', flexWrap: 'wrap', fontFamily: 'var(--font-sans)' }}>
      {mounted ? <Heart3D regions={regions} cursor={cursor} showConduction={cond} emphasize={emphasize} size={size} /> : <div style={{ width: size + 'px' }} />}
      <div style={{ display: 'grid', gap: '8px', alignContent: 'start', minWidth: '260px' }}>
        <label>
          t (ms){' '}
          <input
            id="t"
            type="range"
            min={0}
            max={700}
            step={1}
            value={cursor.value ?? 0}
            onInput={(e) => (cursor.value = Number((e.target as HTMLInputElement).value))}
          />{' '}
          <span class="tabular">{cursor.value ?? '—'}</span>
        </label>
        <label>
          scenario{' '}
          <select id="scenario" value={scenario} onChange={(e) => setScenario((e.target as HTMLSelectElement).value)}>
            {Object.keys(SCENARIOS).map((k) => (
              <option value={k}>{k}</option>
            ))}
          </select>
        </label>
        <label>
          <input id="cond" type="checkbox" checked={cond} onChange={(e) => setCond((e.target as HTMLInputElement).checked)} /> conduction
        </label>
        <label>
          <input id="anat" type="checkbox" checked={anatomy} onChange={(e) => setAnatomy((e.target as HTMLInputElement).checked)} /> anatomy only
        </label>
        <label>
          emphasize <input id="emph" value={emph} onChange={(e) => setEmph((e.target as HTMLInputElement).value)} />
        </label>
        <label>
          size <input id="size" type="number" value={size} onChange={(e) => setSize(Number((e.target as HTMLInputElement).value))} />
        </label>
        <div>
          {(['zh', 'en', 'es'] as const).map((l) => (
            <button type="button" onClick={() => (store.lang.value = l)}>
              {l}
            </button>
          ))}
          <button id="mount" type="button" onClick={() => setMounted(!mounted)}>
            mount
          </button>
          <button type="button" onClick={() => (document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')}>
            theme
          </button>
        </div>
      </div>
    </div>
  );
}

document.body.style.background = 'var(--bg)';
render(<Dev />, document.getElementById('app')!);
