/**
 * Quiz drawer (right side on desktop, full width on phones). Stays mounted while minimized so progress survives
 * "show me in 3D". Arrow keys inside it are local (the strip uses them), Esc closes it.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { AppCommands } from '../app/commands';
import { Icon } from '../app/ui/controls';
import { LOCAL_KEYS_ATTR } from '../app/ui/shortcuts';
import { tq } from '../i18n/quiz';
import type { SimEngine } from '../sim/types';
import { QuizPanel } from './QuizPanel';

export type QuizDrawerState = 'closed' | 'open' | 'minimized';

export interface QuizDrawerProps {
  readonly engine: SimEngine;
  readonly commands: AppCommands;
  readonly state: QuizDrawerState;
  readonly onClose: () => void;
  readonly onMinimize: () => void;
  readonly onRestore: () => void;
}

export function QuizDrawer({ engine, commands, state, onClose, onMinimize, onRestore }: QuizDrawerProps) {
  const [progress, setProgress] = useState({ n: 1, total: 10 });
  const title = useRef<HTMLHeadingElement>(null);
  const restoreBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state === 'open') requestAnimationFrame(() => title.current?.focus());
    else if (state === 'minimized') requestAnimationFrame(() => restoreBtn.current?.focus());
  }, [state]);

  if (state === 'closed') return null;
  const local = { [LOCAL_KEYS_ATTR]: '' };
  return (
    <>
      <aside
        id="quiz-drawer"
        class="quiz-drawer"
        hidden={state !== 'open'}
        aria-labelledby="quiz-title"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
        {...local}
      >
        <header class="drawer-head">
          <h2 id="quiz-title" ref={title} tabIndex={-1}>
            {tq('quiz.title')}
          </h2>
          <button type="button" class="btn btn-sm" onClick={onMinimize}>
            {tq('quiz.minimize')}
          </button>
          <button type="button" class="btn icon-btn" aria-label={tq('quiz.close')} title={tq('quiz.close')} onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <p class="fine-print drawer-intro">{tq('quiz.intro')}</p>
        <QuizPanel engine={engine} commands={commands} onShow3D={onMinimize} onProgress={(n, total) => setProgress({ n, total })} />
      </aside>
      {state === 'minimized' && (
        <button type="button" ref={restoreBtn} class="btn btn-primary quiz-restore" onClick={onRestore}>
          <Icon name="quiz" />
          <span>{tq('quiz.restore', progress)}</span>
        </button>
      )}
    </>
  );
}
