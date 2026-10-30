/** Visible keyboard-shortcut hint (transport bar) and the full list (About dialog). */
import { ts } from '../../i18n/shell';

export function ShortcutHint() {
  return (
    <p class="shortcut-hint">
      <span class="visually-hidden">{ts('shell.shortcuts')}: </span>
      <span>
        <kbd>{ts('shell.key.spaceName')}</kbd> {ts('shell.key.space')}
      </span>
      <span>
        <kbd>←</kbd>
        <kbd>→</kbd> {ts('shell.key.arrows')}
      </span>
      <span>
        <kbd>1</kbd>–<kbd>4</kbd> {ts('shell.key.modes')}
      </span>
    </p>
  );
}

export function ShortcutList() {
  return (
    <dl class="shortcut-list">
      <dt>
        <kbd>{ts('shell.key.spaceName')}</kbd>
      </dt>
      <dd>{ts('shell.key.space')}</dd>
      <dt>
        <kbd>←</kbd> <kbd>→</kbd>
      </dt>
      <dd>{ts('shell.key.arrows')}</dd>
      <dt>
        <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd>
      </dt>
      <dd>{ts('shell.key.modes')}</dd>
    </dl>
  );
}
