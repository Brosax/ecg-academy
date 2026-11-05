import { useEffect, useId, useState } from 'preact/hooks';
import { l } from '../../core/l10n';
import { lt } from '../../i18n';
import { leadPath } from '../../figures/strip';
import type { StorySceneProps, StoryStep } from './types';
import { Choices, Diagram } from './visuals';
import { paperDistance, paperHeight, pulseSize } from './f4.math';
import './f1f4.css';

export const F4_STEPS: readonly StoryStep[] = [
  { id: 'speed', title: l('纸走快，时间不变', 'Faster paper, unchanged time', 'Papel más rápido, el mismo tiempo'), narration: l('笔接收同一段信号。纸走得越快，相同的时间就占越多横向距离。', 'The pen receives the same signal. Faster paper gives the same time interval more horizontal space.', 'La pluma recibe la misma señal. Un papel más rápido da más espacio horizontal al mismo intervalo.'), task: l('预测纸速从 25 改为 50 mm/s 的结果，再切换纸速。', 'Predict the change from 25 to 50 mm/s, then switch paper speed.', 'Predice el cambio de 25 a 50 mm/s y cambia la velocidad.'), durationMs: 6000 },
  { id: 'gain', title: l('放大刻度，不放大心脏', 'Change the scale, not the heart', 'Cambia la escala, no el corazón'), narration: l('增益决定每毫伏画多高。信号和时间不变，只有纵向刻度改变。', 'Gain sets the height drawn for each millivolt. Signal and time stay the same; only the vertical scale changes.', 'La ganancia fija la altura de cada milivoltio. La señal y el tiempo no cambian, solo la escala vertical.'), task: l('预测增益从 10 改为 20 mm/mV 的结果，再切换增益。', 'Predict the change from 10 to 20 mm/mV, then switch gain.', 'Predice el cambio de 10 a 20 mm/mV y cambia la ganancia.'), durationMs: 6000 },
  { id: 'calibration', title: l('先读这道校准脉冲', 'Read the calibration pulse first', 'Lee primero el pulso de calibración'), narration: l('这道脉冲代表 1 mV，持续 200 ms。知道纸速与增益，才能把格数读成真实量。', 'This pulse is 1 mV high and lasts 200 ms. Paper speed and gain turn squares into real quantities.', 'Este pulso tiene 1 mV y dura 200 ms. Velocidad y ganancia convierten los cuadros en magnitudes reales.'), task: l('在 25 mm/s、10 mm/mV 下，这道脉冲有多宽、多高？', 'At 25 mm/s and 10 mm/mV, how wide and tall is the pulse?', 'A 25 mm/s y 10 mm/mV, ¿qué anchura y altura tiene el pulso?'), durationMs: 6000 },
  { id: 'measure', title: l('重新量一次，还是同一颗心', 'Measure again: it is the same heart', 'Mide de nuevo: sigue siendo el mismo corazón'), narration: l('把格数按纸速换回时间，RR 与心率不变。先检查校准，再解释“宽”或“高”。', 'Convert squares back to time using paper speed: RR and heart rate are unchanged. Check calibration before interpreting width or height.', 'Convierte los cuadros a tiempo usando la velocidad: RR y frecuencia no cambian. Comprueba la calibración antes de interpretar anchura o altura.'), task: l('只把纸速翻倍，实际心率如何变化？', 'If only paper speed doubles, what happens to the actual heart rate?', 'Si solo se duplica la velocidad del papel, ¿qué ocurre con la frecuencia real?'), durationMs: 6000 },
];

export function F4Scene(props: StorySceneProps) {
  const [prediction, setPrediction] = useState<string>();
  const [speed, setSpeed] = useState(25);
  const [gain, setGain] = useState(10);
  const id = useId();
  useEffect(() => { setPrediction(undefined); setSpeed(props.step === 3 ? 50 : 25); setGain(10); }, [props.step]);
  const ecg = props.ecg;
  const beat = ecg?.truth?.beats[Math.floor((ecg?.truth?.beats.length ?? 1) / 2)];
  if (!ecg || !beat) return <div class="fd-scene fd-source-wait" role="status">{lt(l('正在准备信号…', 'Preparing the signal…', 'Preparando la señal…'))}</div>;
  const t0 = (beat.pOn ?? beat.qrsOn - 160) - 65;
  const windowMs = 1250;
  const pxMm = 5;
  const baseline = 205;
  const currentX = (t: number) => 30 + paperDistance(t - t0, speed) * pxMm;
  const currentY = (mv: number) => baseline - paperHeight(mv, gain) * pxMm;
  const refX = (t: number) => 30 + paperDistance(t - t0, 25) * pxMm;
  const refY = (mv: number) => baseline - paperHeight(mv, 10) * pxMm;
  const path = leadPath(ecg.signal, 'II', t0, t0 + windowMs, currentX, currentY, 340);
  const reference = leadPath(ecg.signal, 'II', t0, t0 + windowMs, refX, refY, 340);
  const pulse = pulseSize(speed, gain);
  const cx = 100, cy = 220;
  const pw = pulse.width * pxMm, ph = pulse.height * pxMm;
  const pulsePath = `M50 ${cy}H${cx}V${cy - ph}H${cx + pw}V${cy}H350`;
  const reveal = props.attempted ? 1 : props.progress;
  const nextBeat = ecg.truth?.beats[Math.floor(ecg.truth.beats.length / 2) + 1];
  const rr = nextBeat ? nextBeat.qrsOn - beat.qrsOn : 60000 / (ecg.truth?.hrBpm ?? 75);
  const choose = (v: string) => {
    props.onManipulate(); setPrediction(v);
    if (props.step === 2) props.onAttempt(v === 'five-ten', l('200 ms × 25 mm/s = 5 mm；1 mV × 10 mm/mV = 10 mm。宽度读时间，高度读电压。', '200 ms × 25 mm/s = 5 mm; 1 mV × 10 mm/mV = 10 mm. Width encodes time, height voltage.', '200 ms × 25 mm/s = 5 mm; 1 mV × 10 mm/mV = 10 mm. La anchura expresa tiempo y la altura voltaje.'));
    if (props.step === 3) props.onAttempt(v === 'same', l('心率不变。纸速加倍，RR 的毫米数也加倍；毫米数除以纸速，仍得到同一个 RR 时间。', 'Heart rate is unchanged. Paper speed doubles and RR occupies twice the millimetres; dividing distance by speed gives the same RR time.', 'La frecuencia no cambia. La velocidad y los milímetros de RR se duplican; distancia dividida por velocidad da el mismo tiempo RR.'));
  };
  const apply = (value: number) => {
    props.onManipulate();
    if (props.step === 0) setSpeed(value); else setGain(value);
    props.onAttempt(prediction === (props.step === 0 ? 'wide' : 'tall'), props.step === 0
      ? l('彩色曲线与灰色参照来自同一信号。纸速加倍后横向距离加倍，波高和实际心率不变。', 'The coloured curve and grey reference are the same signal. Doubling speed doubles horizontal distance, not height or actual rate.', 'La curva de color y la referencia gris son la misma señal. Al duplicar la velocidad se duplica la distancia horizontal, no la altura ni la frecuencia real.')
      : l('增益加倍后波高加倍，RR 和波形时间不变。灰线保留 10 mm/mV 的参照。', 'Doubling gain doubles height; RR and waveform duration stay the same. The grey reference remains at 10 mm/mV.', 'Al duplicar la ganancia se duplica la altura; RR y la duración no cambian. La referencia gris sigue a 10 mm/mV.'));
  };
  return <div class="fd-scene">
    <div class="fd-visuals fd-f4-visuals">
      <Diagram title={lt(l('校准脉冲：1 mV，200 ms', 'Calibration pulse: 1 mV, 200 ms', 'Pulso de calibración: 1 mV, 200 ms'))}>
        <defs><pattern id={`${id}-pulse-grid`} width={pxMm * 5} height={pxMm * 5} patternUnits="userSpaceOnUse"><path d={`M${pxMm * 5} 0H0V${pxMm * 5}`} stroke="var(--fd-grid)" stroke-width=".8" fill="none" /></pattern></defs>
        <text x="25" y="25" class="fd-svg-label">1 mV · 200 ms</text>
        <text x="25" y="49" class="fd-svg-note">{speed} mm/s · {gain} mm/mV</text>
        <rect x="50" y="65" width="310" height="170" fill={`url(#${id}-pulse-grid)`} />
        <path d={`M50 ${cy}H${cx}V${cy - 10 * pxMm}H${cx + 5 * pxMm}V${cy}H350`} class="fd-f4-reference" />
        <path d={pulsePath} pathLength="1" stroke-dasharray={`${Math.max(.002, reveal)} 1`} fill="none" stroke="var(--c-highlight)" stroke-width="3" />
        <g opacity={reveal > .55 ? 1 : .18}>
          <path d={`M${cx} ${cy + 14}v5H${cx + pw}v-5`} fill="none" stroke="var(--c-vector)" stroke-width="1.5" />
          <text x={cx + pw / 2} y={cy + 42} text-anchor="middle" fill="var(--c-vector)" class="fd-svg-label">{props.step === 2 && !props.attempted ? '?' : pulse.width} mm</text>
          <path d={`M${cx + pw + 18} ${cy}h6V${cy - ph}h-6`} fill="none" stroke="var(--c-repol)" stroke-width="1.5" />
          <text x={cx + pw + 33} y={cy - ph / 2 + 5} fill="var(--c-repol)" class="fd-svg-label">{props.step === 2 && !props.attempted ? '?' : pulse.height} mm</text>
        </g>
        <text x="25" y="292" class="fd-svg-note">{lt(l('灰线：25 mm/s · 10 mm/mV', 'Grey: 25 mm/s · 10 mm/mV', 'Gris: 25 mm/s · 10 mm/mV'))}</text>
      </Diagram>
      <Diagram title={lt(l('II 导联：同一信号，不同刻度', 'Lead II: the same signal at different scales', 'Derivación II: la misma señal a distintas escalas'))}>
        <defs><pattern id={`${id}-trace-grid`} width={pxMm} height={pxMm} patternUnits="userSpaceOnUse"><path d={`M${pxMm} 0H0V${pxMm}`} stroke="var(--fd-grid)" stroke-width=".45" fill="none" /></pattern><clipPath id={`${id}-trace-clip`}><rect x="29" y="54" width="385" height="195" /></clipPath><clipPath id={`${id}-trace-reveal`}><rect x="29" y="54" width={Math.max(1, paperDistance(windowMs * reveal, speed) * pxMm + 2)} height="195" /></clipPath></defs>
        <text x="30" y="25" class="fd-svg-label">II · {speed} mm/s · {gain} mm/mV</text>
        <text x="30" y="49" class="fd-svg-note">{lt(l('同一信号片段 · 相同采样', 'One signal segment · identical samples', 'Mismo segmento · mismas muestras'))}</text>
        <rect x="30" y="55" width="380" height="194" fill={`url(#${id}-trace-grid)`} />
        <g clip-path={`url(#${id}-trace-clip)`}><path d={reference} class="fd-f4-reference" /><path d={path} stroke="var(--c-vector)" fill="none" stroke-width="2.6" clip-path={`url(#${id}-trace-reveal)`} /></g>
        <path d={`M30 ${baseline}H410`} class="fd-baseline" />
        <path d={props.step === 3 ? `M${currentX(beat.qrsOn)} 260v6H${currentX(beat.qrsOn + rr)}v-6` : `M30 260v6H${currentX(t0 + 200)}v-6`} fill="none" stroke="var(--c-highlight)" stroke-width="1.4" />
        <text x="30" y="291" class="fd-svg-note">{props.step === 3 ? `RR ${Math.round(rr)} ms = ${Math.round(paperDistance(rr, speed))} mm` : `200 ms = ${paperDistance(200, speed)} mm`}</text>
        <text x="280" y="291" class="fd-svg-note">{props.step === 3 ? `${Math.round(60000/rr)}/min` : `1 mV = ${gain} mm`}</text>
      </Diagram>
    </div>
    <div class="fd-experiment">
      {props.step < 2 ? <>
        <Choices value={prediction} label={lt(F4_STEPS[props.step].task)} options={[{ id: 'wide', label: l('横向变宽', 'Wider', 'Más ancho') }, { id: 'tall', label: l('纵向变高', 'Taller', 'Más alto') }, { id: 'both', label: l('同时变宽、变高', 'Wider and taller', 'Más ancho y alto') }]} onChoose={choose} />
        <div class="fd-choices" role="group" aria-label={lt(props.step === 0 ? l('改变纸速', 'Change paper speed', 'Cambiar velocidad') : l('改变增益', 'Change gain', 'Cambiar ganancia'))}>{(props.step === 0 ? [25, 50] : [10, 20]).map(v => <button type="button" class={`fd-choice ${v === (props.step === 0 ? speed : gain) ? 'is-selected' : ''}`} aria-pressed={v === (props.step === 0 ? speed : gain)} disabled={!prediction || (!props.attempted && v === (props.step === 0 ? 25 : 10))} onClick={() => apply(v)}>{v} {props.step === 0 ? 'mm/s' : 'mm/mV'}</button>)}</div>
      </> : props.step === 2 ? <Choices value={prediction} label={lt(F4_STEPS[2].task)} options={[{ id: 'five-ten', label: l('宽 5 mm · 高 10 mm', '5 mm wide · 10 mm tall', '5 mm de ancho · 10 mm de alto') }, { id: 'ten-ten', label: l('宽 10 mm · 高 10 mm', '10 mm wide · 10 mm tall', '10 mm de ancho · 10 mm de alto') }, { id: 'five-twenty', label: l('宽 5 mm · 高 20 mm', '5 mm wide · 20 mm tall', '5 mm de ancho · 20 mm de alto') }]} onChoose={choose} /> : <Choices value={prediction} label={lt(F4_STEPS[3].task)} options={[{ id: 'same', label: l('实际心率不变', 'Actual rate is unchanged', 'La frecuencia real no cambia') }, { id: 'twice', label: l('实际心率翻倍', 'Actual rate doubles', 'La frecuencia real se duplica') }, { id: 'half', label: l('实际心率减半', 'Actual rate halves', 'La frecuencia real se reduce a la mitad') }]} onChoose={choose} />}
    </div>
  </div>;
}
