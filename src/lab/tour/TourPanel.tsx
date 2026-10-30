/**
 * Guided-tour player. Loops each step's window in slow motion, prev/next, progress dots, ←/→ while focused, Esc to exit.
 * Drives the app only through AppCommands; store.tourStep (no command exists for it) is set directly.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { AppCommands } from '../app/commands';
import { store } from '../app/store';
import { LOCAL_KEYS_ATTR } from '../app/ui/shortcuts';
import { explainLeadAt, fmtCompact } from '../explain';
import { tm } from '../i18n/modes';
import { tt } from '../i18n/tour';
import type { CycleTruth, LeadName, SimEngine } from '../sim/types';
import { anchorCycle, applyTourStep, clampStep, keyMoment, pastWindowEnd, stepWindow, TOUR_LOOP_HOLD_MS, tourSpeed } from './player';
import type { TourWindow } from './player';
import { TOUR_STEPS } from './steps';

export interface TourPanelProps {
  readonly engine: SimEngine;
  readonly commands: AppCommands;
}

export function TourPanel({ engine, commands }: TourPanelProps) {
  const step = store.tourStep.value;
  const cycle = useRef<CycleTruth | null>(null);
  // what the tour changes and gives back on exit
  const prevSpeed = useRef<number | null>(null);
  const prevLead = useRef<LeadName | null>(null);
  const [win, setWin] = useState<TourWindow | null>(null);
  const panel = useRef<HTMLElement>(null);

  // ended: the step has played through and stopped on its last frame. loop: replay continuously (with a hold).
  const [ended, setEnded] = useState(false);
  const [loop, setLoop] = useState(false);

  const go = (i: number) => {
    const idx = clampStep(i);
    const w = stepWindow(idx, cycle.current);
    store.tourStep.value = idx;
    setWin(w);
    setEnded(false);
    if (w) applyTourStep(TOUR_STEPS[idx], w, commands);
  };

  const replay = () => {
    if (!win || step === null) return;
    setEnded(false);
    commands.setSpeed(tourSpeed(TOUR_STEPS[step], win));
    commands.seek(win.t0);
    commands.play();
  };

  const start = async (i = 0) => {
    // the tour narrates one normal heartbeat: leave a disease scenario first
    if (store.scenario.peek().id !== 'normal-sinus-rhythm') await commands.setScenario('normal-sinus-rhythm');
    if (prevSpeed.current === null) prevSpeed.current = store.speed.peek();
    if (prevLead.current === null) prevLead.current = store.selectedLead.peek();
    cycle.current = anchorCycle(engine, store.time.peek());
    go(i);
    // focus the panel so ←/→ work immediately
    requestAnimationFrame(() => panel.current?.focus());
  };

  const restore = () => {
    commands.clearHighlight();
    if (prevSpeed.current !== null) commands.setSpeed(prevSpeed.current);
    if (prevLead.current !== null) commands.selectLead(prevLead.current);
    prevSpeed.current = null;
    prevLead.current = null;
  };

  const exit = () => {
    store.tourStep.value = null;
    setWin(null);
    restore();
    // step 1 turns the cut off; bring it back for the section mode
    if (store.mode.peek() === 'section') commands.setSlice({ enabled: true });
    commands.play();
  };

  // Play the window once and stop on its last frame (or, with auto-loop, hold 1.5 s and replay). Never fights the
  // user: once a pass has ended, manual play/seek is left alone until "replay" or another step.
  // Render loops read store.time.peek(), never .value.
  useEffect(() => {
    if (step === null || !win || ended) return;
    let raf = 0;
    let hold: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      if (hold === null && store.playing.peek() && pastWindowEnd(store.time.peek(), win)) {
        commands.pause();
        commands.seek(win.t1);
        if (loop) {
          hold = setTimeout(() => {
            hold = null;
            commands.seek(win.t0);
            commands.play();
          }, TOUR_LOOP_HOLD_MS);
        } else {
          setEnded(true);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (hold !== null) clearTimeout(hold);
    };
  }, [step, win, ended, loop, commands]);

  // Leaving the mode while touring ends the tour (setMode already resets the cut).
  useEffect(
    () => () => {
      if (store.tourStep.peek() !== null) {
        store.tourStep.value = null;
        restore();
      }
    },
    [],
  );

  const onKeyDown = (e: KeyboardEvent) => {
    if (step === null || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target as Element | null)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') exit();
      else go(step + (e.key === 'ArrowRight' ? 1 : -1));
    }
  };

  const total = TOUR_STEPS.length;
  const props = { [LOCAL_KEYS_ATTR]: '' };

  if (step === null)
    return (
      <section class="card tour-card" aria-labelledby="tour-title">
        <h2 id="tour-title">{tt('tour.title')}</h2>
        <p>{tt('tour.intro')}</p>
        <button type="button" class="btn btn-primary" onClick={() => start(0)}>
          {tt('tour.start')}
        </button>
        <ol class="tour-outline">
          {TOUR_STEPS.map((s, i) => (
            <li>
              <button type="button" class="link-btn" onClick={() => start(i)}>
                {tt(`step.${s.id}.title`)}
              </button>
            </li>
          ))}
        </ol>
      </section>
    );

  const s = TOUR_STEPS[step];
  // While the step plays, explain its key moment (stable text); when paused or finished, explain the current instant.
  const nowT = store.now.value.tMs;
  const playingPass = store.playing.value && !ended && win !== null;
  const live = explainLeadAt(engine, s.lead, playingPass ? keyMoment(win) : nowT, store.lang.value);
  const speedNow = win ? tourSpeed(s, win) : s.speed;
  return (
    <section
      ref={panel}
      class="card tour-card tour-running"
      aria-labelledby="tour-step-title"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      {...props}
    >
      <div class="tour-top">
        <span class="muted">{tt('tour.progress', { n: step + 1, total })}</span>
        <button type="button" class="btn btn-sm" onClick={exit}>
          {tt('tour.exit')}
        </button>
      </div>
      <nav class="tour-dots" aria-label={tt('tour.dots')}>
        {TOUR_STEPS.map((d, i) => (
          <button
            type="button"
            class="tour-dot"
            aria-current={i === step ? 'step' : undefined}
            aria-label={tt('tour.goto', { n: i + 1, title: tt(`step.${d.id}.title`) })}
            onClick={() => go(i)}
          />
        ))}
      </nav>
      {/* Every step's title and text share one grid cell (inactive ones invisible), so the panel is as tall as the
          longest step and does not jump when moving between steps of different length. */}
      <div class="stable-stack tour-text">
        {TOUR_STEPS.map((d, i) => (
          <div class={i === step ? 'is-active' : 'is-ghost'} aria-hidden={i === step ? undefined : 'true'}>
            <h3 id={i === step ? 'tour-step-title' : undefined} aria-live={i === step ? 'polite' : undefined}>
              {tt(`step.${d.id}.title`)}
            </h3>
            <p>{tt(`step.${d.id}.body`)}</p>
          </div>
        ))}
      </div>
      <p class="tour-meta">
        {win ? (
          <span class="chip">
            {tt(ended ? 'tour.ended' : loop ? 'tour.looping' : 'tour.loop', {
              speed: fmtCompact(speedNow, store.lang.value),
              ms: Math.round(win.t1 - win.t0),
            })}
          </span>
        ) : (
          <span class="chip">{tt('tour.unavailable')}</span>
        )}
        <span class="chip">{tt('tour.lead', { lead: s.lead })}</span>
        {s.slice !== 'none' && <span class="chip">{tm(`sec.preset.${s.slice}`)}</span>}
      </p>
      <div class="tour-nav">
        <button type="button" class="btn" disabled={!win} onClick={replay}>
          {tt('tour.replay')}
        </button>
        <label class="tour-loop">
          <input
            id="tour-autoloop"
            type="checkbox"
            checked={loop}
            onChange={(e) => {
              const on = (e.target as HTMLInputElement).checked;
              setLoop(on);
              if (on && ended) replay();
            }}
          />{' '}
          {tt('tour.autoLoop')}
        </label>
      </div>
      <details class="sub-details" open>
        <summary class="one-line">{playingPass ? tt('tour.keyMoment') : tt('tour.live')}</summary>
        <ul class="explain-steps">
          {live.sentences.map((x) => (
            <li>{x}</li>
          ))}
        </ul>
      </details>
      <div class="tour-nav">
        <button type="button" class="btn" disabled={step === 0} onClick={() => go(step - 1)}>
          {tt('tour.prev')}
        </button>
        {step < total - 1 ? (
          <button type="button" class="btn btn-primary" onClick={() => go(step + 1)}>
            {tt('tour.next')}
          </button>
        ) : (
          <button type="button" class="btn btn-primary" onClick={exit}>
            {tt('tour.finish')}
          </button>
        )}
      </div>
      <p class="fine-print">{tt('tour.keys')}</p>
    </section>
  );
}
