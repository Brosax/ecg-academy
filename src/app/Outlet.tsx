/**
 * The page outlet: renders the page for route.value (the switch itself is views.tsx). On a page change (pageKey) the
 * window scrolls to the top and focus moves to the new page's h1, so keyboard and screen-reader users land on the
 * content; the initial load does not steal focus.
 */
import { useEffect, useRef } from 'preact/hooks';
import { route } from './router';
import { pageKey } from './routes';
import { viewFor } from './views';

/** Move keyboard / screen-reader focus to the page heading (falls back to <main>). */
export function focusPageHeading(): void {
  const main = globalThis.document?.getElementById('main');
  if (!main) return;
  const target = main.querySelector<HTMLElement>('h1') ?? main;
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

export function Outlet() {
  const r = route.value;
  const key = pageKey(r);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    globalThis.scrollTo?.(0, 0);
    // the new page is already committed when the effect runs; a timeout (not rAF) also fires in background tabs
    const id = setTimeout(focusPageHeading, 0);
    return () => clearTimeout(id);
  }, [key]);

  return (
    <div key={key} class="app-view">
      {viewFor(r)}
    </div>
  );
}
