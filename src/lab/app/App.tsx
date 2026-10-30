/**
 * Lab root: gets the (cached) engine with progress, runs the clock while mounted, renders the Shell.
 *
 * Heart Lab (ECG Academy): mounted by src/lab/index.tsx (LabPage) inside .lab-root, possibly many times per page load.
 * The engine and its commands are built once (app/engine.ts loadLabOnce) so a revisit is instant; the clock, the
 * persistence and theme effects live only while this component is mounted. `scenario` (a deep link) opens disease mode
 * with that scenario selected.
 */
import { useEffect, useState } from 'preact/hooks';
import { tc } from '../i18n/common';
import { startClock } from './clock';
import { openScenario } from './deepLink';
import { loadedLab, loadLabOnce } from './engine';
import type { LoadedLab } from './engine';
import { installPersistence } from './persist';
import { Shell } from './Shell';
import { store } from './store';
import { installTheme } from './theme';
import './theme.css';

export interface AppProps {
  /** Disease scenario id to open (src/lab/sim/scenarios/library.ts); unknown ids are ignored. */
  readonly scenario?: string;
}

export function App({ scenario }: AppProps) {
  const [lab, setLab] = useState<LoadedLab | null>(loadedLab);

  useEffect(() => {
    const offPersist = installPersistence();
    const offTheme = installTheme();
    let stopClock: (() => void) | null = null;
    let cancelled = false;
    loadLabOnce()
      .then((l) => {
        if (cancelled) return;
        stopClock = startClock(l.engine);
        setLab(l);
      })
      .catch(() => {
        /* store.engine carries the error for the loading screen */
      });
    return () => {
      cancelled = true;
      stopClock?.();
      offPersist();
      offTheme();
    };
  }, []);

  // deep link: (re)applied when the engine is ready and whenever the requested scenario changes
  useEffect(() => {
    if (lab && scenario) void openScenario(lab.commands, scenario);
  }, [lab, scenario]);

  if (!lab) return <Loading />;
  return <Shell engine={lab.engine} commands={lab.commands} />;
}

function Loading() {
  const s = store.engine.value;
  return (
    <div class="lab-app-loading" role="status" aria-live="polite" style={{ display: 'grid', placeItems: 'center', minHeight: '100%', gap: '12px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '18px', fontWeight: 600 }}>{tc('app.title')}</div>
        <div style={{ color: 'var(--fg-muted)', marginTop: '6px' }}>
          {s.error ? tc('app.error', { msg: s.error }) : `${tc('app.loading')} ${Math.round(s.progress * 100)}%`}
        </div>
        <progress max={1} value={s.progress} style={{ width: '220px', marginTop: '10px' }} />
      </div>
    </div>
  );
}
