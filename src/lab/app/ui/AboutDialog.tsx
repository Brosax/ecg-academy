/**
 * About: model description, colour code, limitations, the education-only disclaimer, shortcuts and key references.
 * Native <dialog>.showModal() gives focus containment, Esc to close and an inert background; we restore focus to the
 * opener ourselves.
 */
import type { RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { tc } from '../../i18n/common';
import { ts } from '../../i18n/shell';
import { Icon } from './controls';
import { KEY_REFERENCES, MODEL_CREDITS } from './references';
import { ShortcutList } from './ShortcutHint';

const COLORS = [
  ['--c-atrial', 'about.color.atrial'],
  ['--c-qrs', 'about.color.qrs'],
  ['--c-repol', 'about.color.repol'],
  ['--c-conduction', 'about.color.conduction'],
  ['--c-vector', 'about.color.vector'],
] as const;

const LIMITS = [
  'about.limit.geometry',
  'about.limit.torso',
  'about.limit.dipole',
  'about.limit.apd',
  'about.limit.scope',
  'about.limit.flow',
] as const;

export function AboutDialog(p: {
  readonly open: boolean;
  readonly onClose: () => void;
  /** Where focus returns on close (buttons are not focused by a click in every browser, so activeElement may be body). */
  readonly returnFocus?: RefObject<HTMLElement>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (p.open && !d.open) {
      const active = document.activeElement;
      opener.current = active && active !== document.body ? active : (p.returnFocus?.current ?? null);
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
      d.querySelector<HTMLElement>('.dialog-close')?.focus();
    } else if (!p.open && d.open) {
      d.close();
    }
    if (!p.open && opener.current instanceof HTMLElement) {
      opener.current.focus();
      opener.current = null;
    }
  }, [p.open]);

  return (
    <dialog
      ref={ref}
      class="about-dialog"
      aria-labelledby="about-title"
      onClose={p.onClose}
      onCancel={(e) => {
        e.preventDefault();
        p.onClose();
      }}
      onClick={(e) => {
        // click on the backdrop (the dialog element itself, outside the content box) closes
        if (e.target === ref.current) p.onClose();
      }}
    >
      <div class="dialog-body">
        <header class="dialog-head">
          <h2 id="about-title">{tc('about.title')}</h2>
          <button type="button" class="btn icon-btn dialog-close" aria-label={ts('about.close')} onClick={p.onClose}>
            <Icon name="close" />
          </button>
        </header>

        <section>
          <h3>{ts('about.modelTitle')}</h3>
          <p>{tc('about.body')}</p>
          <p>{ts('about.model2')}</p>
          <p>{ts('about.model3')}</p>
        </section>

        <section>
          <h3>{ts('about.colorsTitle')}</h3>
          <ul class="legend">
            {COLORS.map(([token, key]) => (
              <li>
                <span class="lab-swatch" style={{ background: `var(${token})` }} aria-hidden="true" />
                {ts(key)}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3>{ts('about.limitsTitle')}</h3>
          <ul>
            {LIMITS.map((k) => (
              <li>{ts(k)}</li>
            ))}
          </ul>
        </section>

        <section class="disclaimer" role="note">
          <h3>{ts('about.disclaimerTitle')}</h3>
          <p>{ts('about.disclaimer')}</p>
          <p>{tc('app.disclaimer')}</p>
        </section>

        <section>
          <h3>{ts('about.shortcutsTitle')}</h3>
          <ShortcutList />
        </section>

        {MODEL_CREDITS.length > 0 && (
          <section>
            <h3>{ts('about.creditsTitle')}</h3>
            <ul class="refs">
              {MODEL_CREDITS.map((c) => (
                <li lang="en">{c}</li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3>{ts('about.refsTitle')}</h3>
          <ol class="refs">
            {KEY_REFERENCES.map((r) => (
              <li lang="en">{r}</li>
            ))}
          </ol>
        </section>
      </div>
    </dialog>
  );
}
