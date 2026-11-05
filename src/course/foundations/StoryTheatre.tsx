import type { ComponentType } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { l, type L10n } from '../../core/l10n';
import { lt } from '../../i18n';
import type { Lesson } from '../api';
import { EcgDisplay, useEcg } from '../EcgFrame';
import { syn } from '../lessons/f-shared';
import { Icon } from '../../ui';
import { F1Scene, F1_STEPS } from './F1Scene';
import { F2Scene, F2_STEPS } from './F2Scene';
import { F3Scene, F3_STEPS } from './F3Scene';
import { F4Scene, F4_STEPS } from './F4Scene';
import { F5Scene, F5_STEPS } from './F5Scene';
import { F6Scene, F6_STEPS } from './F6Scene';
import type { StorySceneProps, StoryStep } from './types';
import { canContinue, useStoryClock } from './clock';
import { attemptStorySegment, initialStoryState, visitStorySegment } from './storyState';
import { FoundationsBasics } from './FoundationsBasics';
import { FOUNDATION_EXPLANATIONS } from './explanations';

const STORIES: Record<string, { steps: readonly StoryStep[]; Scene: ComponentType<StorySceneProps> }> = {
  f1: { steps: F1_STEPS, Scene: F1Scene }, f2: { steps: F2_STEPS, Scene: F2Scene }, f3: { steps: F3_STEPS, Scene: F3Scene },
  f4: { steps: F4_STEPS, Scene: F4Scene }, f5: { steps: F5_STEPS, Scene: F5Scene }, f6: { steps: F6_STEPS, Scene: F6Scene },
};

export function StoryTheatre({ lesson, onComplete }: { lesson: Lesson; onComplete: (ready: boolean) => void }) {
  const { steps, Scene } = STORIES[lesson.id];
  const [session, setSession] = useState(initialStoryState);
  const { step, attempts, feedback } = session;
  const [showEcg, setShowEcg] = useState(false);
  const [showBasics, setShowBasics] = useState(false);
  const [showExplanation, setShowExplanation] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const item = steps[step];
  const clock = useStoryClock(`${lesson.id}:${step}`, item.durationMs ?? 6000, !!attempts[step]);
  const { state, retry } = useEcg(syn('normal', 111));
  const attempted = !!attempts[step];
  const ready = canContinue(clock.progress, attempted);
  useEffect(() => { onComplete(steps.every((_, k) => !!attempts[k]) && ready); }, [attempts, ready]);
  const goSegment = (next: number) => { clock.pause(); setShowExplanation(true); setShowBasics(false); setSession(old => visitStorySegment(old, next)); heading.current?.focus({ preventScroll: true }); };
  const attempt = (correct: boolean, text: L10n) => { clock.seek(1); setSession(old => attemptStorySegment(old, { correct, text })); };
  const play = (restart = false) => { setShowExplanation(false); setShowBasics(false); clock.play(restart); };
  return <section class="fd-theatre" aria-labelledby="fd-scene-title" onKeyDown={e => {
    if (e.code === 'Space' && e.target === e.currentTarget) { e.preventDefault(); clock.playing ? clock.pause() : play(); }
  }}>
    <header class="fd-scenehead"><div><p class="fd-eyebrow">{lt(l('看见原理', 'MAKE THE INVISIBLE VISIBLE', 'HAZ VISIBLE EL MECANISMO'))} <span>{String(step+1).padStart(2,'0')} / {String(steps.length).padStart(2,'0')}</span></p><h2 id="fd-scene-title" ref={heading} tabIndex={-1}>{lt(item.title)}</h2></div><span class="fd-stage-tag">{lt(l('推演 · 实验', 'WATCH · TRY', 'OBSERVA · PRUEBA'))}</span></header>
    <div class="fd-narration" aria-live="polite"><p>{lt(item.narration)}</p></div>
    <button type="button" class="fd-textbutton fd-basics-link" aria-expanded={showBasics} onClick={() => { clock.pause(); setShowBasics(!showBasics); }}>{lt(showBasics ? l('收起入门讲解','Close the basics','Cerrar los conceptos básicos') : l('这些词还不熟？从零开始了解','New to these terms? Start with the basics','¿No conoces estos términos? Empieza desde cero'))}</button>
    {showBasics && <FoundationsBasics lessonId={lesson.id} onFinish={() => { setShowBasics(false); heading.current?.focus({preventScroll:true}); heading.current?.scrollIntoView({block:'start'}); }}/>}
    <div hidden={showBasics}>
    <details class="fd-step-explanation" open={showExplanation} onToggle={e => { setShowExplanation(e.currentTarget.open); if (e.currentTarget.open) clock.pause(); }}>
      <summary>{lt(l('把这一步讲清楚','Understand this step','Comprende este paso'))}</summary>
      {FOUNDATION_EXPLANATIONS[lesson.id]?.[item.id]?.map(text => <p>{lt(text)}</p>)}
    </details>
    {state.status !== 'ready' ? <div class="fd-loading" role="status"><p>{lt(l('正在准备这一搏…', 'Preparing this heartbeat…', 'Preparando este latido…'))}</p>{state.status === 'error' && <button type="button" class="fd-choice" onClick={retry}>{lt(l('重新加载', 'Try again', 'Reintentar'))}</button>}</div> : <Scene step={step} progress={clock.progress} attempted={feedback !== null} ecg={state.ecg} onAttempt={attempt} onManipulate={clock.pause} />}
    <div class="fd-taskline"><span class="fd-taskmark">{attempted ? '✓' : '↗'}</span><p>{lt(item.task)}</p></div>
    <div class={`fd-feedback ${feedback ? 'has-feedback' : ''}`} aria-live="polite">{feedback ? <><strong>{lt(feedback.correct ? l('观察到了', 'You found it', 'Lo has visto') : l('对照图形再看一次', 'Compare what happened', 'Compara lo que ha ocurrido'))}</strong><span>{lt(feedback.text)}</span></> : <span>{lt(attempted ? l('本段已尝试，可重播或重新操作。', 'You have tried this segment. Replay it or try the experiment again.', 'Ya has intentado este segmento. Puedes repetirlo o probar el experimento de nuevo.') : l('先看一段，再试一次。答案不必正确，重要的是看见原因。', 'Watch one explanation, then try. A wrong answer still lets you continue—the explanation is what matters.', 'Observa una explicación y prueba. Puedes continuar aunque te equivoques: lo importante es comprender la causa.'))}</span>}</div>
    <div class="fd-transport">
      <button type="button" class="fd-play" disabled={state.status !== 'ready'} onClick={() => clock.playing ? clock.pause() : play()}><Icon name={clock.playing ? 'pause' : 'play'} size={17}/>{lt(clock.playing ? l('暂停', 'Pause', 'Pausar') : clock.progress === 0 ? l('开始推演', 'Start explanation', 'Iniciar explicación') : clock.progress >= 1 ? l('再看一次', 'Watch again', 'Ver de nuevo') : l('继续播放', 'Resume', 'Continuar'))}</button>
      <button type="button" class="fd-iconbutton" onClick={() => play(true)} aria-label={lt(l('重播本段', 'Replay this segment', 'Repetir este segmento'))} title={lt(l('重播本段', 'Replay this segment', 'Repetir este segmento'))}><Icon name="refresh" size={17}/></button>
      <label class="fd-timeline"><span class="crs-sr">{lt(l('推演时间轴', 'Explanation timeline', 'Tiempo de la explicación'))}</span><input type="range" min="0" max="1000" value={Math.round(clock.progress * 1000)} onInput={e => clock.seek(Number(e.currentTarget.value)/1000)} /><output>{Math.round(clock.progress*100)}%</output></label>
      <div class="fd-segmentnav"><button type="button" class="fd-iconbutton" disabled={step === 0} onClick={() => goSegment(step-1)} aria-label={lt(l('上一段', 'Previous segment', 'Segmento anterior'))}><Icon name="prev" size={18}/></button><button type="button" class="fd-next" disabled={!ready || step === steps.length-1} onClick={() => goSegment(step+1)}>{lt(l('下一段', 'Next segment', 'Siguiente segmento'))}<Icon name="next" size={16}/></button></div>
    </div>
    {clock.reduced && <p class="fd-muted fd-motion-note">{lt(l('已减少动画：显示关键帧，所有实验仍可操作。', 'Reduced motion: key frames are shown; every experiment remains available.', 'Movimiento reducido: se muestran fotogramas clave; todos los experimentos siguen disponibles.'))}</p>}
    <details class="fd-source" onToggle={e => { setShowEcg(e.currentTarget.open); clock.pause(); }}><summary>{lt(l('展开本课基准十二导联', 'Open the reference 12-lead ECG', 'Ver el ECG de referencia de 12 derivaciones'))}</summary>{showEcg && state.status === 'ready' && <EcgDisplay ecg={state.ecg} view={{layout:'3x4+1'}} />}</details>
    </div>
  </section>;
}
