/**
 * Lab header: title, mode navigation (1–4), quiz and About. Language and theme follow the host app (ECG Academy's header
 * is the one switch for both — see src/lab/bridge.ts), so the old language / theme buttons are gone.
 */
import type { Ref } from 'preact';
import { tc } from '../../i18n/common';
import { tq } from '../../i18n/quiz';
import { ts } from '../../i18n/shell';
import type { AppCommands } from '../commands';
import { store } from '../store';
import type { Mode } from '../store';
import { Icon } from './controls';

export const MODES: readonly Mode[] = ['overview', 'leads', 'section', 'disease'];

export interface HeaderProps {
  readonly commands: AppCommands;
  readonly quizOpen: boolean;
  readonly onQuiz: () => void;
  readonly onAbout: () => void;
  readonly quizButtonRef?: Ref<HTMLButtonElement>;
  readonly aboutButtonRef?: Ref<HTMLButtonElement>;
}

export function Header({ commands, quizOpen, onQuiz, onAbout, quizButtonRef, aboutButtonRef }: HeaderProps) {
  const mode = store.mode.value;
  return (
    <header class="lab-app-header">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true" />
        <div>
          <h1>{tc('app.title')}</h1>
          <p class="brand-sub" title={tc('app.subtitle')}>
            {tc('app.subtitle')}
          </p>
        </div>
      </div>

      <nav class="mode-nav" aria-label={ts('shell.modes')}>
        {MODES.map((m, i) => (
          <button
            type="button"
            class="btn mode-btn"
            aria-current={mode === m ? 'page' : undefined}
            aria-keyshortcuts={String(i + 1)}
            onClick={() => commands.setMode(m)}
          >
            <kbd aria-hidden="true">{i + 1}</kbd>
            <span>{tc(`mode.${m}`)}</span>
          </button>
        ))}
      </nav>

      <div class="header-tools">
        <button type="button" class="btn" ref={quizButtonRef} aria-expanded={quizOpen} aria-controls="quiz-drawer" onClick={onQuiz}>
          <Icon name="quiz" />
          <span>{tq('quiz.open')}</span>
        </button>
        <button type="button" class="btn" ref={aboutButtonRef} aria-haspopup="dialog" onClick={onAbout}>
          <Icon name="info" />
          <span>{tc('ctl.about')}</span>
        </button>
      </div>
    </header>
  );
}
