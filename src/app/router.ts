/**
 * Hash router (no dependency). Routes mirror docs/PLAN.md §2. `route` is a signal; `href()` builds links; `go()` navigates.
 */
import { signal } from '@preact/signals';

export type Route =
  | { readonly name: 'home' }
  | { readonly name: 'learn' }
  | { readonly name: 'lesson'; readonly id: string; readonly step?: number }
  | { readonly name: 'practice' }
  | { readonly name: 'lab'; readonly scenario?: string }
  | { readonly name: 'drill'; readonly id: string }
  | { readonly name: 'cases' }
  | { readonly name: 'case'; readonly id: number }
  | { readonly name: 'atlas' }
  | { readonly name: 'finding'; readonly id: string }
  | { readonly name: 'exam' }
  | { readonly name: 'tools'; readonly tab?: string }
  | { readonly name: 'progress' }
  | { readonly name: 'settings' }
  | { readonly name: 'about' }
  | { readonly name: 'notfound'; readonly path: string };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0];
  const [a, b, c] = path.split('/').map((s) => decodeURIComponent(s));
  switch (a ?? '') {
    case '':
      return { name: 'home' };
    case 'learn':
      if (!b) return { name: 'learn' };
      return c && /^\d+$/.test(c) ? { name: 'lesson', id: b, step: Number(c) } : { name: 'lesson', id: b };
    case 'practice':
      return b ? { name: 'drill', id: b } : { name: 'practice' };
    case 'lab':
      return b ? { name: 'lab', scenario: b } : { name: 'lab' };
    case 'cases':
      return b && /^\d+$/.test(b) ? { name: 'case', id: Number(b) } : { name: 'cases' };
    case 'atlas':
      return b ? { name: 'finding', id: b } : { name: 'atlas' };
    case 'exam':
      return { name: 'exam' };
    case 'tools':
      return b ? { name: 'tools', tab: b } : { name: 'tools' };
    case 'progress':
      return { name: 'progress' };
    case 'settings':
      return { name: 'settings' };
    case 'about':
      return { name: 'about' };
    default:
      return { name: 'notfound', path };
  }
}

export function href(r: Route): string {
  const e = encodeURIComponent;
  switch (r.name) {
    case 'home':
      return '#/';
    case 'learn':
      return '#/learn';
    case 'lesson':
      return r.step != null ? `#/learn/${e(r.id)}/${r.step}` : `#/learn/${e(r.id)}`;
    case 'practice':
      return '#/practice';
    case 'drill':
      return `#/practice/${e(r.id)}`;
    case 'lab':
      return r.scenario ? `#/lab/${e(r.scenario)}` : '#/lab';
    case 'cases':
      return '#/cases';
    case 'case':
      return `#/cases/${r.id}`;
    case 'atlas':
      return '#/atlas';
    case 'finding':
      return `#/atlas/${e(r.id)}`;
    case 'exam':
      return '#/exam';
    case 'tools':
      return r.tab ? `#/tools/${e(r.tab)}` : '#/tools';
    case 'progress':
      return '#/progress';
    case 'settings':
      return '#/settings';
    case 'about':
      return '#/about';
    case 'notfound':
      return `#/${r.path}`;
  }
}

export const route = signal<Route>(parseHash(globalThis.location?.hash ?? ''));

export function go(r: Route, replace = false): void {
  const h = href(r);
  if (globalThis.location) {
    if (replace) globalThis.history?.replaceState(null, '', h);
    else globalThis.location.hash = h;
  }
  route.value = r;
}

/** Start listening to hashchange. Called once from main. */
export function startRouter(): () => void {
  const on = () => {
    route.value = parseHash(globalThis.location.hash);
  };
  globalThis.addEventListener?.('hashchange', on);
  return () => globalThis.removeEventListener?.('hashchange', on);
}
