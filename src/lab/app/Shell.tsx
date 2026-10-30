/**
 * App shell, ECG-first layout (layout.css). ≥ 1024 px: one viewport-high screen — a transparent header over the cream
 * scene; the HERO (main area) is the mode's ECG in a glass frame; the SIDE glass panel holds the "now" strip, the live
 * 3D heart with its tool rail, the one-sentence caption, and the mode's own panels (scrolling); the disease mode adds a
 * picker column at the far left; the DOCK carries the transport and the cycle timeline; then the footer.
 * Below 1024 px everything stacks in reading order.
 * <HeartView> stays at one fixed position in the tree so its WebGL context survives mode switches; modes only supply
 * the panels around it (ModeView.Hero / Side / Aside). Everything changes state through AppCommands (or store fields no
 * command covers).
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { TimelineBar } from '../ecg';
import { tc } from '../i18n/common';
import { te } from '../i18n/ecg';
import { ts } from '../i18n/shell';
import { QuizDrawer } from '../quiz/QuizDrawer';
import type { QuizDrawerState } from '../quiz/QuizDrawer';
import type { SimEngine } from '../sim/types';
import { HeartView } from '../view3d';
import { heartEnlarged } from '../view3d/viewControls';
import type { AppCommands } from './commands';
import { MODE_VIEWS } from './modes';
import { ExplainPopup } from './modes/chain';
import { store } from './store';
import { AboutDialog } from './ui/AboutDialog';
import { Header } from './ui/Header';
import { ShortcutHint } from './ui/ShortcutHint';
import { applyShortcut, mapKey, targetInfo } from './ui/shortcuts';
import { NowStrip, StageCaption } from './ui/StageHud';
import { StageSheet } from './ui/StageSheet';
import { ToolRail } from './ui/ToolRail';
import { TransportBar } from './ui/TransportBar';
import './ui/shell.css';
import './ui/layout.css';

/** A keydown the lab may act on: focus inside a mounted .lab-root, or nothing focused. */
function isLabKeyTarget(target: EventTarget | null): boolean {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return true;
  if (target === document.body || target === document.documentElement) return true;
  return target.closest('.lab-root') !== null;
}

function skipToMain(e: Event): void {
  e.preventDefault();
  document.getElementById('lab-main')?.focus();
}

export interface ShellProps {
  readonly engine: SimEngine;
  readonly commands: AppCommands;
}

export function Shell({ engine, commands }: ShellProps) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [quiz, setQuiz] = useState<QuizDrawerState>('closed');
  const quizButton = useRef<HTMLButtonElement>(null);
  const aboutButton = useRef<HTMLButtonElement>(null);
  const side = useRef<HTMLElement>(null);

  // Global shortcuts: Space play/pause, ←/→ phase step, 1–4 modes (see ui/shortcuts.ts for what is left alone). In ECG
  // Academy they act only while the lab is mounted (the listener lives with this component) and only on keys aimed at
  // the lab: focus inside .lab-root, or nothing focused (body) — never the host's header, menus or form fields.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !isLabKeyTarget(e.target)) return;
      const action = mapKey(e, targetInfo(e.target));
      if (!action) return;
      e.preventDefault(); // Space would scroll the page, arrows would scroll sideways
      applyShortcut(action, commands);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commands]);

  // the self-test asks about one normal heartbeat (P, PR, QRS, T): leave a disease scenario before showing it
  const openQuiz = () => {
    if (store.scenario.peek().id === 'normal-sinus-rhythm') return setQuiz('open');
    void commands.setScenario('normal-sinus-rhythm').then(() => setQuiz('open'));
  };
  const closeQuiz = () => {
    setQuiz('closed');
    requestAnimationFrame(() => quizButton.current?.focus());
  };
  const minimizeQuiz = () => {
    setQuiz('minimized');
    // on phones the heart is above the fold only after scrolling back up
    side.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  };

  const mode = store.mode.value;
  const view = MODE_VIEWS[mode];
  const modeLabel = tc(`mode.${mode}`);
  return (
    <div class={`lab-app lab-app-e mode-${mode}${view.Aside ? ' has-aside' : ''}${heartEnlarged.value ? ' heart-large' : ''}`}>
      {/* a hash link would be a route change in the host app: move focus instead */}
      <a class="skip-link" href="#lab-main" onClick={skipToMain}>
        {ts('shell.skip')}
      </a>
      <Header
        commands={commands}
        quizOpen={quiz === 'open'}
        quizButtonRef={quizButton}
        aboutButtonRef={aboutButton}
        onQuiz={() => (quiz === 'open' ? closeQuiz() : openQuiz())}
        onAbout={() => setAboutOpen(true)}
      />

      {/* a slot that is `false` in the other modes, so HeartView keeps its tree position */}
      {view.Aside && (
        <aside class="glass mode-aside" aria-label={`${modeLabel} — ${ts('shell.panel')}`}>
          <view.Aside engine={engine} commands={commands} />
        </aside>
      )}

      <section id="lab-main" class="glass hero" tabIndex={-1} aria-label={`${modeLabel} — ${ts('shell.panel')}`}>
        <view.Hero engine={engine} commands={commands} />
        <StageSheet engine={engine} commands={commands} />
      </section>

      <section class="glass side" ref={side} aria-label={ts('shell.view3d')}>
        <NowStrip />
        <div class="heart-box">
          <HeartView engine={engine} commands={commands} class="heart-view" />
          <ToolRail engine={engine} commands={commands} />
        </div>
        <StageCaption engine={engine} />
        <div class="side-content">
          <view.Side engine={engine} commands={commands} />
        </div>
        <ExplainPopup engine={engine} commands={commands} />
      </section>

      <div class="glass dock">
        <TransportBar
          commands={commands}
          middle={
            <section class="timeline-wrap" aria-label={ts('shell.timeline')}>
              <TimelineBar engine={engine} commands={commands} class="timeline" />
            </section>
          }
        />
      </div>

      <footer class="lab-app-footer">
        <p title={tc('app.disclaimer')}>{tc('app.disclaimer')}</p>
        <p class="footer-legend" title={te('timeline.legend')}>
          {te('timeline.legend')}
        </p>
        <ShortcutHint />
      </footer>

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} returnFocus={aboutButton} />
      <QuizDrawer
        engine={engine}
        commands={commands}
        state={quiz}
        onClose={closeQuiz}
        onMinimize={minimizeQuiz}
        onRestore={openQuiz}
      />
    </div>
  );
}
