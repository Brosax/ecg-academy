/**
 * Shell side effects outside the component tree (started once from main, before the first render):
 * - document.title follows the route and the language. It runs synchronously when the route signal changes, i.e.
 *   before pages re-render, so a page may refine the title in its own effect (e.g. with the lesson name).
 * - the "reduce motion" setting is mirrored onto <html data-reduce-motion> (shell.css turns animation off).
 */
import { effect } from '@preact/signals';
import { route } from './router';
import { documentTitle } from './routes';
import { store } from './store';

export function startShellEffects(): () => void {
  const stopTitle = effect(() => {
    const title = documentTitle(route.value, store.lang.value);
    if (globalThis.document) globalThis.document.title = title;
  });
  const stopMotion = effect(() => {
    const reduce = store.settings.value.reduceMotion;
    const root = globalThis.document?.documentElement;
    if (root) root.dataset.reduceMotion = reduce ? 'true' : 'false';
  });
  return () => {
    stopTitle();
    stopMotion();
  };
}
