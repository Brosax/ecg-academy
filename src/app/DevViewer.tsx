/**
 * `#/dev/viewer` (development builds only): mounts src/ecg/dev/ViewerDemo.tsx, which the viewer workstream builds in
 * parallel. import.meta.glob yields {} while the file does not exist, so the shell compiles either way; production
 * builds never include it.
 */
import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { tsh } from '../i18n/shell';
import './pages.css';

interface DevModule {
  readonly default?: ComponentType;
  readonly ViewerDemo?: ComponentType;
}

const DEV_VIEWER_LOADERS: Record<string, () => Promise<DevModule>> = import.meta.env.DEV
  ? import.meta.glob<DevModule>('../ecg/dev/ViewerDemo.tsx')
  : {};

type DevState =
  | { readonly status: 'loading' }
  | { readonly status: 'missing' }
  | { readonly status: 'ready'; readonly Comp: ComponentType };

export function DevViewer() {
  const [state, setState] = useState<DevState>({ status: 'loading' });
  useEffect(() => {
    const load = Object.values(DEV_VIEWER_LOADERS)[0];
    if (!load) {
      setState({ status: 'missing' });
      return;
    }
    let alive = true;
    load()
      .then((m) => {
        const Comp = m.default ?? m.ViewerDemo;
        if (alive) setState(Comp ? { status: 'ready', Comp } : { status: 'missing' });
      })
      .catch((err: unknown) => {
        console.error('ViewerDemo failed to load', err);
        if (alive) setState({ status: 'missing' });
      });
    return () => {
      alive = false;
    };
  }, []);

  if (state.status === 'ready') return <state.Comp />;
  return (
    <div class="app-page">
      <header class="app-pagehead">
        <h1>{tsh('titleDev')}</h1>
      </header>
      <p class="app-muted" aria-busy={state.status === 'loading'}>
        {state.status === 'missing' ? tsh('devMissing') : '…'}
      </p>
    </div>
  );
}
