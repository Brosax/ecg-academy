/**
 * Global keyboard shortcuts: Space play/pause, ←/→ previous/next phase, 1–4 modes.
 * mapKey is pure (testable without a DOM); targetInfo reads the DOM in the browser.
 */
import type { AppCommands } from '../commands';
import type { Mode } from '../store';

export type ShortcutAction =
  | { readonly type: 'togglePlay' }
  | { readonly type: 'step'; readonly dir: 1 | -1 }
  | { readonly type: 'mode'; readonly mode: Mode };

export interface KeyLike {
  readonly key: string;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
  readonly repeat?: boolean;
}

export interface TargetInfo {
  /** Upper-case tag name of the focused element ('BODY' when nothing is focused). */
  readonly tag: string;
  readonly role: string | null;
  readonly contentEditable: boolean;
  /** Inside a widget that handles its own arrow keys (tour panel, radio groups…). */
  readonly inLocalKeys: boolean;
  /** Inside an open modal dialog. */
  readonly inModal: boolean;
}

export const BODY_TARGET: TargetInfo = { tag: 'BODY', role: null, contentEditable: false, inLocalKeys: false, inModal: false };

export const MODE_KEYS: Readonly<Record<string, Mode>> = { '1': 'overview', '2': 'leads', '3': 'section', '4': 'disease' };

/** Elements whose native keyboard behaviour must win. */
const FORM_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
/** Space already activates these natively — toggling play as well would double-fire. */
const SPACE_NATIVE_TAGS = new Set(['BUTTON', 'A', 'SUMMARY']);
const SPACE_NATIVE_ROLES = new Set(['button', 'link', 'tab', 'checkbox', 'switch', 'radio', 'menuitem', 'option', 'slider']);

export function mapKey(e: KeyLike, t: TargetInfo): ShortcutAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (t.inModal || t.contentEditable || FORM_TAGS.has(t.tag)) return null;
  if (e.key === ' ' || e.key === 'Spacebar') {
    if (e.repeat || SPACE_NATIVE_TAGS.has(t.tag) || (t.role && SPACE_NATIVE_ROLES.has(t.role))) return null;
    return { type: 'togglePlay' };
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    if (t.inLocalKeys || t.role === 'slider') return null;
    return { type: 'step', dir: e.key === 'ArrowRight' ? 1 : -1 };
  }
  const mode = MODE_KEYS[e.key];
  if (mode && !e.repeat) return { type: 'mode', mode };
  return null;
}

export function applyShortcut(a: ShortcutAction, commands: AppCommands): void {
  if (a.type === 'togglePlay') commands.togglePlay();
  else if (a.type === 'step') commands.stepPhase(a.dir);
  else commands.setMode(a.mode);
}

/** Marks a container whose arrow keys are local (e.g. the tour panel). */
export const LOCAL_KEYS_ATTR = 'data-local-keys';

export function targetInfo(target: EventTarget | null): TargetInfo {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return BODY_TARGET;
  return {
    tag: target.tagName.toUpperCase(),
    role: target.getAttribute('role'),
    contentEditable: target instanceof HTMLElement && target.isContentEditable,
    inLocalKeys: !!target.closest(`[${LOCAL_KEYS_ATTR}], [role="radiogroup"], [role="tablist"]`),
    inModal: !!target.closest('dialog[open]'),
  };
}
