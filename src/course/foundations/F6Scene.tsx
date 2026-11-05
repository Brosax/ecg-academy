import { useEffect, useId, useMemo, useState } from 'preact/hooks';
import { l } from '../../core/l10n';
import type { StdLead } from '../../core/leads';
import { lt } from '../../i18n';
import { HOOKUPS, sameHookup, swapCables, type Cable, type Hookup, type HookupId } from '../../figures/scenes/cable-swap.math';
import { CULPRIT, NOISE_FACTORS, type Electrode, type NoiseType } from '../../figures/scenes/noisy-electrode.math';
import { Choices, Diagram, numberLabel } from './visuals';
import { smooth, type StorySceneProps, type StoryStep } from './types';
import { displaySamples, inspectRecording } from './f6.math';
import './f5-f6.css';

export const F6_STEPS: readonly StoryStep[] = [
  { id: 'observe', title: l('异常来自哪里？', 'Where did the change start?', '¿Dónde empezó el cambio?'), narration: l('同一次心跳，I 导联整体翻转，胸前导联未变。先查看记录方式，再解释心脏。', 'The same heartbeat: lead I flips while the chest leads stay unchanged. Inspect the recording before interpreting the heart.', 'El mismo latido: I se invierte y las precordiales no cambian. Revisa el registro antes de interpretar el corazón.'), task: l('右上肢和左上肢的线缆交换，I 导联会怎样？', 'What happens to lead I when the right- and left-arm cables are exchanged?', '¿Qué ocurre con I al intercambiar los cables de ambos brazos?'), durationMs: 6000 },
  { id: 'repair', title: l('修正连接，观察波形', 'Repair the connection', 'Corrige la conexión'), narration: l('每个导联都是电极电位的组合。把两条线接回去，所有受影响导联会一起恢复。', 'Every lead combines electrode potentials. Reconnect the two cables and the affected leads recover together.', 'Cada derivación combina potenciales de electrodos. Reconecta ambos cables y las derivaciones afectadas se recuperan juntas.'), task: l('依次选择需要交换的两条线缆，检查 I 导联是否恢复。', 'Select the two cables to exchange, then check whether lead I recovers.', 'Selecciona los dos cables que intercambiarías y comprueba si I se recupera.'), durationMs: 6000 },
  { id: 'noise', title: l('一个电极，多条噪声', 'One electrode, several noisy leads', 'Un electrodo, varias derivaciones ruidosas'), narration: l('噪声进入一个电极，再沿导联公式传播。比较 I、II、III：未受影响的一条是重要线索。', 'Noise enters one electrode and follows the lead equations. Compare I, II and III: the unaffected lead is a useful clue.', 'El ruido entra por un electrodo y sigue las fórmulas. Compara I, II y III: la derivación sin ruido aporta una pista.'), task: l('I 干净，II 和 III 有相同噪声。先检查哪个电极？', 'I is clean; II and III share the noise. Which electrode would you check first?', 'I está limpia; II y III comparten el ruido. ¿Qué electrodo revisarías primero?'), durationMs: 7000 },
  { id: 'explore', title: l('把规则带走', 'Try the rule yourself', 'Pon a prueba la regla'), narration: l('换接线、移动噪声来源，再恢复记录。心电源不变，变化来自电极与记录链。', 'Change a connection or move the noise source, then restore the recording. The cardiac source stays the same.', 'Cambia una conexión o mueve la fuente de ruido y restablece el registro. La fuente cardíaca permanece igual.'), task: l('改变一项设置，比较波形，然后记录你的观察。', 'Change one setting, compare the traces, then record your observation.', 'Cambia un ajuste, compara los trazados y registra tu observación.'), durationMs: 5000 },
];

const names: Record<Cable, ReturnType<typeof l>> = {
  RA: l('右上肢 RA', 'Right arm · RA', 'Brazo derecho · RA'), LA: l('左上肢 LA', 'Left arm · LA', 'Brazo izquierdo · LA'),
  LL: l('左下肢 LL', 'Left leg · LL', 'Pierna izquierda · LL'), RL: l('右下肢 RL', 'Right leg · RL', 'Pierna derecha · RL'),
};
const tips = {
  inversion: l('I = LA − RA。交换 RA 与 LA 后得到 RA − LA，所以 I 整体反向；心脏没有改变。', 'I = LA − RA. After swapping RA and LA, it becomes RA − LA: the whole lead reverses, while the heart is unchanged.', 'I = LA − RA. Al intercambiarlos queda RA − LA: toda la derivación se invierte, pero el corazón no cambia.'),
  repaired: l('RA 与 LA 接回正确上肢后，I、II、III 和加压导联同时恢复。虚线是同一次心跳的原始记录。', 'Restoring RA and LA restores the limb and augmented leads together. The dashed trace is the original recording of this heartbeat.', 'Al reconectar RA y LA se recuperan las derivaciones de miembros y aumentadas. La línea discontinua es el registro original del mismo latido.'),
  wrong: l('目标是把 RA 接右上肢、LA 接左上肢。当前接线仍不同于标准连接；可以再试，也可以继续。', 'Connect RA to the right arm and LA to the left. The current hookup still differs from standard; try again or continue.', 'Conecta RA al brazo derecho y LA al izquierdo. La conexión sigue siendo distinta de la estándar; puedes repetir o continuar.'),
  noise: l('II = LL − RA，III = LL − LA，都包含 LL；I = LA − RA 不含 LL。先检查左下肢电极接触。', 'II = LL − RA and III = LL − LA both contain LL; I = LA − RA does not. Check the left-leg electrode contact first.', 'II = LL − RA y III = LL − LA incluyen LL; I = LA − RA no. Revisa primero el contacto del electrodo de la pierna izquierda.'),
};
const CABLES: readonly Cable[] = ['RA', 'LA', 'LL', 'RL'];
const PORTS: Record<Cable, readonly [number, number]> = { RA: [72, 58], LA: [368, 58], LL: [331, 283], RL: [109, 283] };
const SITES: Record<Cable, readonly [number, number]> = { RA: [128, 124], LA: [312, 124], LL: [268, 229], RL: [172, 229] };
const cableColor = (c: Cable) => c === 'RA' ? 'var(--c-highlight)' : c === 'LA' ? 'var(--c-atrial)' : c === 'LL' ? 'var(--c-repol)' : 'var(--fd-muted)';

function RecordingTrace(p: { values: readonly number[]; ghost: readonly number[]; label: string; progress: number; color: string }) {
  const uid = useId();
  const path = (values: readonly number[]) => values.map((v, i) => `${i ? 'L' : 'M'}${28 + i / Math.max(1, values.length - 1) * 384},${72 - v * 33}`).join(' ');
  return <Diagram title={p.label} viewBox="0 0 440 125" class="fd-trace">
    <defs><clipPath id={`strip-${uid}`}><rect x="26" y="31" width={388 * p.progress} height="88" /></clipPath><pattern id={`paper-${uid}`} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="var(--fd-grid)" stroke-width=".7" /></pattern></defs>
    <text x="28" y="23" class="fd-svg-label">{p.label}</text><rect x="28" y="33" width="384" height="80" fill={`url(#paper-${uid})`} /><path d="M28 72H412" class="fd-baseline" />
    <path d={path(p.ghost)} class="fd-ghost-trace" /><g clip-path={`url(#strip-${uid})`}><path d={path(p.values)} fill="none" stroke={p.color} stroke-width="2.3" stroke-linejoin="round" /></g>
  </Diagram>;
}

export function F6Scene(props: StorySceneProps) {
  const uid = useId();
  const [hook, setHook] = useState<Hookup>(HOOKUPS.laRa);
  const [selected, setSelected] = useState<Cable | null>(null);
  const [answer, setAnswer] = useState('');
  const [electrode, setElectrode] = useState<Electrode>('LL');
  const [noiseType, setNoiseType] = useState<NoiseType>('tremor');
  const [amplitude, setAmplitude] = useState(.22);
  const [lead, setLead] = useState<StdLead>('I');
  const [changed, setChanged] = useState(false);
  useEffect(() => { setHook(props.step < 2 ? HOOKUPS.laRa : HOOKUPS.correct); setSelected(null); setAnswer(''); setElectrode('LL'); setNoiseType('tremor'); setAmplitude(.22); setLead('I'); setChanged(false); }, [props.step]);
  const source = props.ecg?.signal;
  const clean = useMemo(() => source ? inspectRecording(source, HOOKUPS.correct) : null, [source]);
  const observed = useMemo(() => source ? inspectRecording(source, hook, props.step >= 2 ? { electrode, type: noiseType, amplitude } : undefined) : null, [source, hook, props.step, electrode, noiseType, amplitude]);
  const chooseCable = (c: Cable) => {
    props.onManipulate();
    if (props.step !== 1) return;
    if (selected === null || selected === c) { setSelected(selected === c ? null : c); return; }
    const next = swapCables(hook, selected, c); setHook(next); setSelected(null);
    props.onAttempt(sameHookup(next, HOOKUPS.correct), sameHookup(next, HOOKUPS.correct) ? tips.repaired : tips.wrong);
  };
  const chooseAnswer = (id: string, correct: string, explanation: ReturnType<typeof l>) => { props.onManipulate(); setAnswer(id); props.onAttempt(id === correct, explanation); };
  const alter = (fn: () => void) => { props.onManipulate(); setChanged(true); fn(); };
  const p = props.progress;
  const showNoise = props.step >= 2 && amplitude > 0;
  const repaired = sameHookup(hook, HOOKUPS.correct);
  const shownLeads: StdLead[] = props.step === 2 ? ['I', 'II', 'III'] : [lead, lead === 'I' ? 'V1' : 'I'];
  return <div class="fd-scene fd-recording">
    <div class="fd-visuals">
      <div class="fd-diagram"><svg viewBox="0 0 440 330" role="group" aria-label={lt(l('电极、线缆与导联的连接', 'Electrodes, cables and lead connections', 'Electrodos, cables y derivaciones'))}>
        <defs><pattern id={`noise-${uid}`} width="14" height="14" patternUnits="userSpaceOnUse"><path d="M0 7L3 3L6 11L10 4L14 7" stroke="var(--err)" fill="none" /></pattern></defs>
        <path d="M196 48Q220 32 244 48L245 74Q300 79 323 121L292 149L274 235H166L148 149L117 121Q140 79 195 74Z" fill="var(--panel-2)" stroke="var(--fd-muted)" stroke-width="1.5" opacity=".8" />
        <path d="M213 126C198 104 171 134 214 167C260 134 233 103 213 126" fill="var(--c-qrs)" opacity=".45" />
        <text x="220" y="197" text-anchor="middle" class="fd-svg-note">{lt(l('同一心电源', 'Same cardiac source', 'Misma fuente cardíaca'))}</text>
        {CABLES.map(c => {
          const [x, y] = PORTS[c]; const [sx, sy] = SITES[hook[c]];
          const path = `M${x} ${y}Q220 ${y < 100 ? 95 : 260} ${sx} ${sy}`;
          return <g key={c} opacity={.35 + .65 * smooth(p, .05, .4)}>
            <path d={path} fill="none" stroke={cableColor(c)} stroke-width={selected === c ? 3.5 : 2} pathLength="1" stroke-dasharray={`${smooth(p, .05, .45)} 1`} />
            <circle cx={sx} cy={sy} r="5" fill={cableColor(c)} />
            <g class="fd-cable-button" role={props.step === 1 ? 'button' : undefined} tabIndex={props.step === 1 ? 0 : undefined} aria-label={lt(names[c])} aria-pressed={props.step === 1 ? selected === c : undefined} onClick={() => chooseCable(c)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chooseCable(c); } }}>
              <rect x={x - 25} y={y - 22} width="50" height="44" rx="12" fill="var(--fd-bg)" stroke={selected === c ? 'var(--c-highlight)' : cableColor(c)} stroke-width={selected === c ? 3 : 1.5} />
              <text x={x} y={y + 5} text-anchor="middle" class="fd-svg-label">{c}</text>
            </g>
          </g>;
        })}
        {showNoise && amplitude > 0 && <g opacity={smooth(p, .15, .5)}><circle cx={SITES[electrode][0]} cy={SITES[electrode][1]} r="24" fill={`url(#noise-${uid})`} opacity=".6" /><circle cx={SITES[electrode][0]} cy={SITES[electrode][1]} r="27" fill="none" stroke="var(--err)" stroke-width="1.5" /></g>}
        <text x="220" y="316" text-anchor="middle" class="fd-svg-note">{showNoise ? `${electrode} → ${CULPRIT[electrode].noisy.join(' + ')}` : repaired ? 'I = LA − RA' : sameHookup(hook, HOOKUPS.laRa) ? 'I′ = RA − LA = −I' : `I′ = Φ${hook.LA} − Φ${hook.RA}`}</text>
        {props.attempted && props.step === 1 && !repaired && <g opacity=".55">{(['RA', 'LA'] as const).map(c => <path d={`M${PORTS[c][0]} ${PORTS[c][1]}L${SITES[c][0]} ${SITES[c][1]}`} fill="none" stroke="var(--ok)" stroke-dasharray="4 5" stroke-width="2" />)}</g>}
      </svg></div>
      <div class={`fd-cable-traces ${shownLeads.length === 3 ? 'is-three' : ''}`}>
        {observed && clean ? shownLeads.map(lid => <RecordingTrace key={lid} values={displaySamples(observed, lid)} ghost={displaySamples(clean, lid)} label={`${lid} · ${showNoise && NOISE_FACTORS[electrode][lid] === 0 ? lt(l('未受噪声影响', 'Unaffected by noise', 'Sin este ruido')) : lt(l('当前记录', 'Current recording', 'Registro actual'))}`} progress={props.attempted || changed ? 1 : smooth(p, .2, .9)} color={showNoise && NOISE_FACTORS[electrode][lid] !== 0 ? 'var(--c-highlight)' : 'var(--c-vector)'} />) : <p class="fd-scene-note">{lt(l('正在准备同一次心跳的记录…', 'Preparing the recording of one heartbeat…', 'Preparando el registro de un mismo latido…'))}</p>}
        <p class="fd-scene-note">{lt(l('虚线：标准连接的原始信号 · 2.4 秒', 'Dashed: original signal with standard connections · 2.4 s', 'Discontinua: señal original con conexiones estándar · 2,4 s'))}</p>
      </div>
    </div>
    <div class="fd-experiment">
      {props.step === 0 && <Choices value={answer} options={[{ id: 'invert', label: l('整体反向', 'The whole lead reverses', 'Se invierte toda la derivación') }, { id: 'faster', label: l('心率加快', 'The heart rate increases', 'Aumenta la frecuencia') }, { id: 'flat', label: l('变成直线', 'It becomes flat', 'Se vuelve plana') }]} onChoose={id => chooseAnswer(id, 'invert', tips.inversion)} />}
      {props.step === 1 && <Choices value={selected ?? ''} label={lt(l('选择两条线缆进行交换', 'Choose two cables to exchange', 'Elige dos cables que intercambiar'))} options={CABLES.map(id => ({ id, label: names[id] }))} onChoose={id => chooseCable(id as Cable)} />}
      {props.step === 2 && <>
        <Choices value={answer} options={(['RA', 'LA', 'LL'] as const).map(id => ({ id, label: names[id] }))} onChoose={id => chooseAnswer(id, 'LL', tips.noise)} />
        {props.attempted && <div class="fd-choices">
          <button type="button" class="fd-choice" disabled={amplitude === 0} onClick={() => {
            props.onManipulate(); setAmplitude(0);
            props.onAttempt(true, l('重新固定左下肢电极后，II、III 中的噪声消失，实线与原始虚线重合。I 始终不变，因为它不使用 LL 的电位。', 'After securing the left-leg electrode, the noise disappears from II and III and their traces match the originals. I stays unchanged because it does not use LL.', 'Al fijar de nuevo el electrodo de la pierna izquierda, desaparece el ruido de II y III y los trazados coinciden con los originales. I no cambia porque no utiliza LL.'));
          }}>{lt(l('重新固定左下肢电极', 'Secure the left-leg electrode', 'Fijar el electrodo de la pierna izquierda'))}</button>
          <button type="button" class="fd-choice" disabled={amplitude > 0} onClick={() => {
            props.onManipulate(); setAmplitude(.22);
            props.onAttempt(true, l('再次加入同一段噪声：II、III 同时受影响，I 仍然干净。再固定电极即可比较修正前后。', 'The same noise returns in II and III, while I remains clean. Secure the electrode again to compare before and after.', 'El mismo ruido vuelve a II y III, mientras I sigue limpia. Fija de nuevo el electrodo para comparar antes y después.'));
          }}>{lt(l('再次加入噪声', 'Add the noise again', 'Volver a añadir el ruido'))}</button>
        </div>}
      </>}
      {props.step === 3 && <div class="fd-explore-settings">
        <p class="fd-scene-note">{lt(l('每次隔离一种变化：交换线缆会移除噪声；添加噪声会恢复标准连接。', 'Isolate one change: a cable swap removes noise; adding noise restores standard connections.', 'Aísla un cambio: intercambiar cables quita el ruido; añadir ruido restaura las conexiones estándar.'))}</p>
        <Choices options={[{ id: 'correct', label: l('标准连接', 'Standard hookup', 'Conexión estándar') }, { id: 'laRa', label: l('交换 RA / LA', 'Swap RA / LA', 'Intercambiar RA / LA') }, { id: 'laLl', label: l('交换 LA / LL', 'Swap LA / LL', 'Intercambiar LA / LL') }]} value={sameHookup(hook, HOOKUPS.correct) ? 'correct' : sameHookup(hook, HOOKUPS.laRa) ? 'laRa' : 'laLl'} onChoose={id => alter(() => { setHook(HOOKUPS[id as HookupId]); setAmplitude(0); })} />
        <Choices label={lt(l('噪声进入的电极', 'Electrode receiving noise', 'Electrodo que recibe el ruido'))} options={(['RA', 'LA', 'LL'] as const).map(id => ({ id, label: l(`噪声 → ${id}`, `Noise → ${id}`, `Ruido → ${id}`) }))} value={electrode} onChoose={id => alter(() => { setElectrode(id as Electrode); setHook(HOOKUPS.correct); setAmplitude(.22); })} />
        <Choices options={[{ id: 'tremor', label: l('震颤', 'Tremor', 'Temblor') }, { id: 'wander', label: l('基线漂移', 'Baseline wander', 'Deriva de la línea de base') }, { id: 'mains', label: l('50 Hz 干扰', '50 Hz interference', 'Interferencia de 50 Hz') }]} value={noiseType} onChoose={id => alter(() => { setNoiseType(id as NoiseType); setHook(HOOKUPS.correct); setAmplitude(.22); })} />
        <label class="fd-noise-slider">{lt(l('噪声幅度', 'Noise amplitude', 'Amplitud del ruido'))}<input type="range" min="0" max=".3" step=".01" value={amplitude} onInput={e => alter(() => { setAmplitude(Number(e.currentTarget.value)); if (Number(e.currentTarget.value) > 0) setHook(HOOKUPS.correct); })} /><output>{numberLabel(amplitude)} mV</output></label>
        <Choices options={(['I', 'II', 'III', 'aVR', 'V1'] as const).map(id => ({ id, label: l(id, id, id) }))} value={lead} onChoose={id => alter(() => setLead(id as StdLead))} />
        <button type="button" class="fd-choice" disabled={!changed} onClick={() => props.onAttempt(true, amplitude > 0 ? l(`当前噪声进入 ${electrode}，其直接影响的肢体导联包括 ${CULPRIT[electrode].noisy.join('、')}；${CULPRIT[electrode].clean} 不含该噪声。将幅度调为 0 可观察干净记录。`, `Noise enters ${electrode}: ${CULPRIT[electrode].noisy.join(' and ')} carry it, while ${CULPRIT[electrode].clean} does not. Set amplitude to zero to see the clean recording.`, `El ruido entra por ${electrode}: aparece en ${CULPRIT[electrode].noisy.join(' y ')}, pero no en ${CULPRIT[electrode].clean}. Pon la amplitud a cero para ver el registro limpio.`) : l('现在没有额外噪声，波形差异只来自接线。恢复标准连接后，实线与原始虚线重合。', 'There is no added noise: differences come only from the hookup. Restore standard connections and the traces overlap.', 'No hay ruido añadido: las diferencias proceden de las conexiones. Al restablecerlas, los trazados coinciden.'))}>{lt(l('记录我的观察', 'Record my observation', 'Registrar mi observación'))}</button>
      </div>}
    </div>
  </div>;
}
