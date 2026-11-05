import { useEffect, useId, useMemo, useState } from 'preact/hooks';
import { l } from '../../core/l10n';
import { lt } from '../../i18n';
import { ecgSource, HEART, CHAMBERS, WIRES, apTime } from '../../figures/scenes/conduction-journey.math';
import { apValue } from '../../figures/math/ap';
import { leadPath } from '../../figures/strip';
import { useEcg } from '../EcgFrame';
import { syn } from '../lessons/f-shared';
import type { StorySceneProps, StoryStep } from './types';
import { Choices } from './visuals';
import { momentWindow, phaseAt, teachingTime, type HeartMoment } from './f1.math';
import './f1f4.css';

export const F1_STEPS: readonly StoryStep[] = [
  { id: 'spark', title: l('一个起点，第一道波', 'One impulse, the first wave', 'Un impulso, la primera onda'), narration: l('窦房结发出冲动。冲动铺过心房肌时，II 导联开始画出 P 波。', 'The sinus node starts the impulse. As atrial muscle depolarizes, lead II draws the P wave.', 'El nodo sinusal inicia el impulso. Al despolarizarse las aurículas, la derivación II dibuja la onda P.'), task: l('点选产生 P 波的结构，也可以直接点 P 波。', 'Select the structure that produces P, or select P on the tracing.', 'Selecciona la estructura que produce la P, o la P en el trazado.'), durationMs: 6000 },
  { id: 'delay', title: l('平直，也有事情发生', 'A flat line still contains an event', 'En la línea plana también pasa algo'), narration: l('冲动经过房室结和希氏束时，细胞太少，体表看不到独立的波。这段等待改变时间。', 'The AV node and His bundle contain too few cells to draw a separate surface wave. Their delay changes timing.', 'El nodo AV y el haz de His tienen pocas células para dibujar una onda propia. Su retraso cambia el tiempo.'), task: l('先预测：增加房室结延迟，哪一段变长？再调整延迟验证。', 'Predict which interval lengthens, then change the delay to test it.', 'Predice qué intervalo se alarga y cambia el retraso para comprobarlo.'), durationMs: 6000 },
  { id: 'ventricles', title: l('迅速铺开的心室激动', 'The ventricles activate rapidly', 'Los ventrículos se activan deprisa'), narration: l('希氏束、束支和浦肯野系统把冲动快速送到心室肌。大量心肌的除极形成 QRS。', 'His, bundle branches and Purkinje fibres distribute the impulse. Depolarization of ventricular muscle makes QRS.', 'His, las ramas y Purkinje distribuyen el impulso. La despolarización del miocardio ventricular forma el QRS.'), task: l('点选 QRS 或心室，看两者如何对应。', 'Select QRS or the ventricles to connect the two views.', 'Selecciona el QRS o los ventrículos para relacionar las dos vistas.'), durationMs: 6000 },
  { id: 'recover', title: l('激动结束，恢复开始', 'Activation ends; recovery begins', 'Termina la activación, empieza la recuperación'), narration: l('ST 段时心室肌处于平台期；随后复极逐渐形成 T 波。小图是单个细胞，不是另一条心电图。', 'During ST, ventricular cells are on their plateau. Recovery then produces T. The inset is one cell, not another ECG.', 'Durante ST las células ventriculares están en meseta. La recuperación produce T. El recuadro representa una célula, no otro ECG.'), task: l('哪一段对应心室复极？点选波形验证。', 'Which wave represents ventricular recovery? Select it to test.', '¿Qué onda corresponde a la recuperación ventricular? Selecciónala.'), durationMs: 8000 },
  { id: 'clocks', title: l('时间来自起搏与传导', 'Pacemakers and pathways set the timing', 'Los marcapasos y las vías marcan el tiempo'), narration: l('窦房结通常最快，主导心率。房室交界和心室有较慢的后备节律；导线决定时间，心肌产生波。', 'The sinus node normally leads because it is fastest. Junctional and ventricular pacemakers are slower backups.', 'El nodo sinusal suele dirigir por ser el más rápido. La unión AV y los ventrículos son marcapasos de reserva más lentos.'), task: l('正常情况下，哪个起搏点主导心跳？', 'Which pacemaker normally leads the heartbeat?', '¿Qué marcapasos dirige normalmente el latido?'), durationMs: 7000 },
];

const LABELS = {
  atria: l('心房肌', 'Atrial muscle', 'Miocardio auricular'), av: l('房室结', 'AV node', 'Nodo AV'), ventricles: l('心室肌', 'Ventricular muscle', 'Miocardio ventricular'),
  sa: l('窦房结', 'Sinus node', 'Nodo sinusal'), his: l('希氏束–浦肯野', 'His–Purkinje', 'His-Purkinje'), schematic: l('结构示意 · 波形来自模型', 'Schematic anatomy · model ECG', 'Anatomía esquemática · ECG del modelo'),
};
const MOMENTS: readonly HeartMoment[] = ['p', 'pr', 'qrs', 'st', 't'];
const WAVE_LABEL: Record<HeartMoment, string> = { p: 'P', pr: 'PR', qrs: 'QRS', st: 'ST', t: 'T' };
const COLORS: Record<HeartMoment, string> = { p: 'var(--c-atrial)', pr: 'var(--c-conduction)', qrs: 'var(--c-qrs)', st: 'var(--c-repol)', t: 'var(--c-repol)' };

export function F1Scene(props: StorySceneProps) {
  const [pr, setPr] = useState(160);
  const [prediction, setPrediction] = useState<string>();
  const [selected, setSelected] = useState<HeartMoment | null>(null);
  const [choice, setChoice] = useState<string>();
  const id = useId();
  // This is a real source change, not a stretch or interpolation of individual leads.
  const adjusted = useEcg(props.step === 1 && pr !== 160 ? syn('normal', 111, { pr }) : undefined);
  const ecg = props.step === 1 && pr !== 160 && adjusted.state.status === 'ready' ? adjusted.state.ecg : props.ecg;
  const src = useMemo(() => ecg ? ecgSource(ecg) : null, [ecg]);
  useEffect(() => { setPr(160); setPrediction(undefined); setSelected(null); setChoice(undefined); }, [props.step]);
  useEffect(() => { if (props.progress < 1) setSelected(null); }, [props.progress]);

  if (!src || !ecg) return <div class="fd-scene fd-source-wait" role="status">{lt(l('正在准备这一搏…', 'Preparing this beat…', 'Preparando este latido…'))}</div>;
  const beat = src.beat;
  const start = (beat.pOn ?? beat.qrsOn - 160) - 65;
  const end = start + 800;
  const tm = teachingTime(beat, props.step, props.progress, selected);
  const active = selected ?? phaseAt(beat, tm);
  const anat = src.anat(tm);
  const x = (t: number) => 30 + (t - start) / (end - start) * 380;
  const amp = Math.max(.8, src.range[1], -src.range[0]);
  const y = (mv: number) => 175 - mv / amp * 100;
  const d = leadPath(ecg.signal, 'II', start, end, x, y, 360);
  const panelTitle = lt(l('结构与电活动', 'Structure and electrical activity', 'Estructura y actividad eléctrica'));
  const select = (moment: HeartMoment) => {
    props.onManipulate(); setSelected(moment);
    const expected = props.step === 0 ? 'p' : props.step === 2 ? 'qrs' : props.step === 3 ? 't' : 'pr';
    if (props.step !== 1 && props.step !== 4) props.onAttempt(moment === expected, moment === expected
      ? l('图形与波形现在停在同一时刻。亮起的心肌对应选中的波；传导组织主要表现为时间。', 'Both views now show the same instant. Active muscle corresponds to the selected wave; conduction tissue mainly changes timing.', 'Las dos vistas muestran el mismo instante. El músculo activo corresponde a la onda; el tejido conductor cambia sobre todo el tiempo.')
      : l('再比较高亮的位置：P 来自心房肌，QRS 是心室除极，T 是心室复极。你可以继续点击对照。', 'Compare the highlighted regions: P is atrial activation, QRS ventricular activation, and T ventricular recovery. Keep exploring.', 'Compara las regiones: P es activación auricular; QRS, activación ventricular; T, recuperación ventricular. Puedes seguir explorando.'));
  };
  const keySelect = (event: KeyboardEvent, moment: HeartMoment) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(moment); } };
  const titleFor = (moment: HeartMoment) => moment === 'p' ? LABELS.atria : moment === 'pr' ? LABELS.av : LABELS.ventricles;
  return <div class="fd-scene">
    <div class="fd-visuals fd-f1-visuals">
      <div class="fd-diagram"><svg viewBox="0 0 440 320" role="group" aria-label={panelTitle}>
        <text x="22" y="24" class="fd-svg-label">{panelTitle}</text>
        <text x="22" y="65" class="fd-svg-note">{lt(LABELS.sa)}</text><path d="M130 68L186 85" fill="none" stroke="var(--c-conduction)" stroke-width="1" stroke-dasharray="3 4" />
        <g transform="translate(92 22) scale(.77)">
          {CHAMBERS.map(c => <path key={c} d={HEART.chamber[c]} fill={c === 'ra' || c === 'la' ? 'var(--c-atrial)' : active === 't' || active === 'st' ? 'var(--c-repol)' : 'var(--c-qrs)'} fill-opacity={.06 + (anat.fill[c] * .2) + anat.repol[c] * .25} stroke="var(--border-strong)" stroke-width="1.5" />)}
          {WIRES.flatMap(w => HEART.wire[w].map((wire, i) => <g key={`${w}-${i}`}><path d={wire} fill="none" stroke="var(--c-conduction)" stroke-opacity=".18" stroke-width="2" /><path d={wire} fill="none" stroke="var(--c-conduction)" stroke-width="3" pathLength="1" stroke-dasharray={`${anat.wire[w]} 1`} opacity={Math.max(.3, anat.wireOp[w])} /></g>))}
          <circle cx={HEART.sa[0]} cy={HEART.sa[1]} r={5 + anat.sa * 4} fill="var(--c-conduction)" />
          <circle cx={HEART.av[0]} cy={HEART.av[1]} r={5 + anat.av * 5} fill="var(--c-conduction)" />
          <g role="button" tabIndex={0} aria-label={lt(LABELS.atria)} aria-pressed={selected === 'p'} onClick={() => select('p')} onKeyDown={e => keySelect(e, 'p')} class="fd-f1-hotspot"><ellipse cx="167" cy="103" rx="120" ry="55" fill="transparent" /><text x="168" y="102" text-anchor="middle" fill="var(--c-atrial)">{lt(LABELS.atria)}</text></g>
          <g role="button" tabIndex={0} aria-label={lt(LABELS.av)} aria-pressed={selected === 'pr'} onClick={() => select('pr')} onKeyDown={e => keySelect(e, 'pr')} class="fd-f1-hotspot"><rect x="130" y="120" width="130" height="50" rx="10" fill="transparent" /><text x="190" y="148" fill="var(--c-conduction)">{lt(LABELS.av)}</text></g>
          <g role="button" tabIndex={0} aria-label={lt(LABELS.ventricles)} aria-pressed={selected === (props.step === 3 ? 't' : 'qrs')} onClick={() => select(props.step === 3 ? 't' : 'qrs')} onKeyDown={e => keySelect(e, props.step === 3 ? 't' : 'qrs')} class="fd-f1-hotspot"><ellipse cx="196" cy="244" rx="95" ry="64" fill="transparent" /><text x="190" y="252" text-anchor="middle" fill={active === 't' ? 'var(--c-repol)' : 'var(--c-qrs)'}>{lt(LABELS.ventricles)}</text></g>
        </g>
        <text x="22" y="308" class="fd-svg-note">{lt(LABELS.schematic)}</text>
      </svg></div>
      <div class="fd-diagram"><svg viewBox="0 0 440 320" role="group" aria-label={lt(l('II 导联：点选波段', 'Lead II: select a wave', 'Derivación II: selecciona una onda'))}>
        <defs><pattern id={`${id}-grid`} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" stroke="var(--fd-grid)" stroke-width=".6" fill="none" /></pattern><clipPath id={`${id}-draw`}><rect x="29" y="40" width={Math.max(1, x(tm) - 29)} height="210" /></clipPath></defs>
        <text x="30" y="24" class="fd-svg-label">II</text>
        <rect x="30" y="40" width="380" height="210" fill={`url(#${id}-grid)`} />
        <path d="M30 175H410" class="fd-baseline" />
        <path d={d} stroke="var(--border-strong)" stroke-width="1.3" fill="none" opacity=".55" />
        <path d={d} stroke={active ? COLORS[active] : 'var(--fd-fg)'} stroke-width="2.8" fill="none" clip-path={`url(#${id}-draw)`} />
        {active && (() => { const [a, b] = momentWindow(beat, active); return <rect x={x(a)} y="41" width={Math.max(3, x(b) - x(a))} height="208" fill={COLORS[active]} opacity=".1" />; })()}
        <path d={`M${x(tm)} 40V249`} stroke="var(--c-highlight)" stroke-width="1.3" stroke-dasharray="4 4" />
        <circle cx={x(tm)} cy={y(src.mv(tm))} r="4" fill="var(--c-highlight)" />
        {MOMENTS.map((m, i) => <g role="button" tabIndex={0} key={m} aria-label={WAVE_LABEL[m]} aria-pressed={selected === m} onClick={() => select(m)} onKeyDown={e => keySelect(e, m)} class="fd-f1-hotspot"><rect x={29 + i * 78} y="259" width="71" height="38" rx="7" fill={active === m ? COLORS[m] : 'var(--panel)'} fill-opacity={active === m ? .2 : 1} stroke={active === m ? COLORS[m] : 'var(--border-strong)'} /><text x={64 + i * 78} y="284" text-anchor="middle" fill={COLORS[m]}>{WAVE_LABEL[m]}</text></g>)}
        <text x="30" y="315" class="fd-svg-note">PR {Math.round(beat.qrsOn - (beat.pOn ?? beat.qrsOn))} ms · QRS {Math.round(beat.qrsOff - beat.qrsOn)} ms</text>
      </svg></div>
    </div>
    <div class="fd-experiment">
      {props.step === 1 ? <>
        <Choices value={prediction} label={lt(F1_STEPS[1].task)} options={[{ id: 'pr', label: l('PR 间期', 'PR interval', 'Intervalo PR') }, { id: 'qrs', label: l('QRS 宽度', 'QRS width', 'Anchura del QRS') }, { id: 'p', label: l('P 波宽度', 'P-wave width', 'Anchura de P') }]} onChoose={v => { props.onManipulate(); setPrediction(v); }} />
        <label class="fd-f1-delay">{lt(l('房室传导延迟', 'AV conduction delay', 'Retraso de la conducción AV'))}<input type="range" min="120" max="200" step="10" value={pr} disabled={!prediction} onInput={e => { const value = Number(e.currentTarget.value); props.onManipulate(); setPr(value); setSelected('pr'); props.onAttempt(prediction === 'pr', l('比较前后：PR 改变，P 和 QRS 的形状保持不变。正常成人 PR 为 120–200 ms。', 'Compare: PR changes while P and QRS keep their shapes. Normal adult PR is 120–200 ms.', 'Compara: cambia PR, pero P y QRS conservan su forma. El PR normal adulto es de 120–200 ms.')); }} /><output>{pr} ms</output></label>
      </> : props.step === 4 ? <>
        <Choices value={choice} label={lt(F1_STEPS[4].task)} options={[{ id: 'sa', label: l('窦房结 · 60–100/min', 'Sinus node · 60–100/min', 'Nodo sinusal · 60–100/min') }, { id: 'av', label: l('房室交界 · 35–60/min', 'AV junction · 35–60/min', 'Unión AV · 35–60/min') }, { id: 'v', label: l('心室 · 20–40/min', 'Ventricle · 20–40/min', 'Ventrículo · 20–40/min') }]} onChoose={v => { props.onManipulate(); setChoice(v); props.onAttempt(v === 'sa', l('通常由最快的窦房结主导。房室结传导约 0.02–0.05 m/s；浦肯野约 2–4 m/s。起搏频率与传导速度是两件事。', 'The fastest sinus node normally leads. AV-node conduction is about 0.02–0.05 m/s; Purkinje conduction about 2–4 m/s. Pacemaker rate and conduction velocity differ.', 'Dirige normalmente el nodo sinusal, el más rápido. La conducción nodal AV es de unos 0,02–0,05 m/s; Purkinje, 2–4 m/s. Frecuencia y velocidad de conducción son distintas.')); }} />
      </> : <Choices label={lt(F1_STEPS[props.step].task)} value={selected ?? undefined} options={(props.step === 3 ? ['qrs', 'st', 't'] as const : ['p', 'pr', 'qrs'] as const).map(m => ({ id: m, label: l(`${WAVE_LABEL[m]} · ${titleFor(m).zh}`, `${WAVE_LABEL[m]} · ${titleFor(m).en}`, `${WAVE_LABEL[m]} · ${titleFor(m).es}`) }))} onChoose={m => select(m as HeartMoment)} />}
      {props.step === 3 && <div class="fd-f1-ap"><svg viewBox="0 0 320 90" role="img" aria-label={lt(l('单个心室细胞动作电位示意', 'Schematic action potential of one ventricular cell', 'Potencial de acción esquemático de una célula ventricular'))}><path d={Array.from({length: 130}, (_, i) => { const t = start + (end - start) * i / 129; return `${i ? 'L' : 'M'}${15 + i / 129 * 290},${70 - (apValue('ventricular', apTime(src.beat, t)) + 86) / 112 * 55}`; }).join(' ')} fill="none" stroke="var(--c-repol)" stroke-width="2" /><path d={`M${15 + (tm - start) / (end - start) * 290} 10V76`} stroke="var(--c-highlight)" stroke-dasharray="3 3" /></svg><span>{lt(l('单个细胞：平台 → 复极', 'One cell: plateau → recovery', 'Una célula: meseta → recuperación'))}</span></div>}
    </div>
  </div>;
}
