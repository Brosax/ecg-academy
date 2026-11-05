import { useEffect, useId, useMemo, useState } from 'preact/hooks';
import { l } from '../../core/l10n';
import { LIMB_ANGLE_DEG, LIMB_LEADS } from '../../core/leads';
import { lt } from '../../i18n';
import { CHEST, HEART_CENTER, PRECORDIAL_SITES } from '../../figures/math/projection';
import { LEAD_POLES, type LimbLead } from '../../figures/scenes/triangle-to-wheel.math';
import { Choices, Diagram, Trace, numberLabel } from './visuals';
import { smooth, type StorySceneProps, type StoryStep } from './types';
import { CHEST_CHOICES, CHEST_SOURCE, isAxisCorrect, isChestPredictionCorrect, isPairCorrect, isReferenceCorrect, isSumCorrect, leadGeometry, limbWindow, TRIANGLE } from './f3.math';
import './f3.css';

export const F3_STEPS: readonly StoryStep[] = [
  {
    id: 'pair', title: l('两个电极，一条导联', 'Two electrodes, one lead', 'Dos electrodos, una derivación'),
    narration: l('导联不是一个电极。它记录正极电位减去负极电位；同一搏，从不同方向看。', 'A lead is not an electrode. It records the positive potential minus the negative potential: one beat, seen from different directions.', 'Una derivación no es un electrodo: registra el potencial positivo menos el negativo. Un latido, visto desde distintas direcciones.'),
    task: l('预测：右臂作负极、左腿作正极，得到哪条导联？选一条，观察连线和记录。', 'Predict: right arm negative, left leg positive — which lead? Choose one and inspect the connection and trace.', 'Predice: brazo derecho negativo y pierna izquierda positiva, ¿qué derivación? Elige y observa la conexión y el trazado.'), durationMs: 6500,
  },
  {
    id: 'sum', title: l('三条边来自同一组电位', 'Three sides, the same potentials', 'Tres lados, los mismos potenciales'),
    narration: l('沿三角形走两条边，中间的左臂电位抵消。两条记录相加，就能得到第三条。', 'Follow two sides of the triangle. The intermediate left-arm potential cancels: adding two recordings gives the third.', 'Recorre dos lados del triángulo. El potencial intermedio del brazo izquierdo se cancela: la suma da la tercera derivación.'),
    task: l('I + III 等于哪条记录？先预测，再看同一时刻的叠加结果。', 'Which recording equals I + III? Predict, then inspect the sum at the same instant.', '¿Qué registro equivale a I + III? Predice y observa la suma en el mismo instante.'), durationMs: 6500,
  },
  {
    id: 'wheel', title: l('移动位置，保留方向', 'Move the axes, keep the directions', 'Mueve los ejes, conserva las direcciones'),
    narration: l('把每条导联轴平移到同一个中心。方向没有改变，三角形变成一张比较观察方向的地图。', 'Translate each lead axis to the same centre. Its direction stays unchanged; the triangle becomes a map of viewing directions.', 'Traslada cada eje al mismo centro. Su dirección no cambia: el triángulo se convierte en un mapa de puntos de vista.'),
    task: l('哪条导联最直接朝向脚端（+90°）？选轴，观察它在六轴系统中的位置。', 'Which lead looks directly towards the feet (+90°)? Select an axis and inspect its position.', '¿Qué derivación mira directamente hacia los pies (+90°)? Selecciona un eje y observa su posición.'), durationMs: 6000,
  },
  {
    id: 'reference', title: l('参考端也可以由电极组合', 'The reference can combine electrodes', 'La referencia puede combinar electrodos'),
    narration: l('加压导联与另外两肢电极的平均值比较；Wilson 中心电端则取三个肢体电位的平均值。', 'An augmented lead compares one limb with the average of the other two. Wilson’s central terminal averages all three limb potentials.', 'Una derivación aumentada compara una extremidad con la media de las otras dos. El terminal central de Wilson promedia las tres.'),
    task: l('aVL 的负参考端是什么？选择后，看两个参考电位汇合。', 'What is the negative reference for aVL? Choose, then watch the two reference potentials combine.', '¿Cuál es la referencia negativa de aVL? Elige y observa cómo se combinan los dos potenciales.'), durationMs: 6500,
  },
  {
    id: 'chest', title: l('绕到胸前，看同一个心电源', 'Move around the chest, keep one source', 'Rodea el tórax, conserva una fuente'),
    narration: l('胸导联从不同胸前位置与 Wilson 中心电端比较。同一个水平向量环，产生不同的 R/S 比例。', 'Chest leads compare different chest positions with Wilson’s central terminal. One horizontal vector loop produces different R/S ratios.', 'Las precordiales comparan distintos puntos del tórax con el terminal central de Wilson. Un solo bucle produce distintas proporciones R/S.'),
    task: l('先预测：从 V1 走到 V6，波形会相同还是改变？再选择观察位置验证。', 'Predict: will the trace stay the same from V1 to V6? Then choose viewing positions to test it.', 'Predice: ¿será igual el trazado de V1 a V6? Después elige posiciones para comprobarlo.'), durationMs: 7500,
  },
];

const name = (x: string) => l(x, x, x);
const PAIR_EXPLANATION = l('II = 左腿 − 右臂。三条肢体导联使用同一组电极；换的是比较方式，不是心跳。', 'II = left leg − right arm. The limb leads use the same electrodes; the comparison changes, not the heartbeat.', 'II = pierna izquierda − brazo derecho. Las derivaciones usan los mismos electrodos; cambia la comparación, no el latido.');
const SUM_EXPLANATION = l('I + III = (左臂 − 右臂) + (左腿 − 左臂) = II。叠加曲线与 II 完全重合。', 'I + III = (LA − RA) + (LL − LA) = II. The summed curve lies exactly over II.', 'I + III = (LA − RA) + (LL − LA) = II. La curva sumada coincide exactamente con II.');
const AXIS_EXPLANATION = l('aVF 朝向脚端，为 +90°。平移导联轴不会改变原来的观察方向。', 'aVF points towards the feet at +90°. Translating a lead axis does not change its viewing direction.', 'aVF apunta hacia los pies, a +90°. Trasladar el eje no cambia su dirección.');
const REFERENCE_EXPLANATION = l('aVL = 左臂 − (右臂 + 左腿)/2。胸导联的参考则是 WCT = (右臂 + 左臂 + 左腿)/3；它是电位平均值，不是心内电极。', 'aVL = LA − (RA + LL)/2. Chest leads use WCT = (RA + LA + LL)/3: an average potential, not an electrode inside the heart.', 'aVL = LA − (RA + LL)/2. Las precordiales usan WCT = (RA + LA + LL)/3: un potencial medio, no un electrodo dentro del corazón.');
const CHEST_EXPLANATION = l('波形改变，心电源不变。依次点 V1–V6：同一个向量环在不同观察方向上投影，R/S 比例随之改变。', 'The trace changes; the source does not. Select V1–V6: the same loop projects onto different directions, changing the R/S ratio.', 'Cambia el trazado, no la fuente. Selecciona V1–V6: el mismo bucle se proyecta en distintas direcciones y cambia la proporción R/S.');

export function F3Scene(props: StorySceneProps) {
  const uid = useId();
  const [lead, setLead] = useState<LimbLead>('I');
  const [chest, setChest] = useState(0);
  const [answer, setAnswer] = useState('');
  useEffect(() => { setLead(props.step === 3 ? 'aVL' : 'I'); setChest(0); setAnswer(''); }, [props.step]);
  const source = useMemo(() => limbWindow(props.ecg), [props.ecg]);
  const k = Math.max(0, Math.min(4, props.step));
  const p = props.progress;
  const draw = smooth(p, 0.18, 0.92);
  const slide = k === 2 ? smooth(p, 0.12, 0.8) : k > 2 ? 1 : 0;
  const sample = source ? Math.round(draw * (source.leads.I.length - 1)) : 0;
  const selected = k === 1 ? 'II' : lead;
  const poles = LEAD_POLES[selected];
  const formula = `${selected} = ${poles.pos} − ${poles.neg.length === 1 ? poles.neg[0] : `(${poles.neg.join(' + ')})/2`}`;
  const leadSet: readonly LimbLead[] = k === 0 ? [lead] : k === 1 ? ['I', 'III', 'II'] : k === 3 ? [] : LIMB_LEADS;
  const lineOpacity = (l: LimbLead) => k === 0 || l === lead || (k === 1 && l === 'II') ? 1 : .28;
  const go = (value: string) => {
    props.onManipulate(); setAnswer(value);
    if (k === 0) { setLead(value as LimbLead); props.onAttempt(isPairCorrect(value), PAIR_EXPLANATION); }
    else if (k === 1) props.onAttempt(isSumCorrect(value), SUM_EXPLANATION);
    else if (k === 2) { setLead(value as LimbLead); props.onAttempt(isAxisCorrect(value), AXIS_EXPLANATION); }
    else if (k === 3) props.onAttempt(isReferenceCorrect(value), REFERENCE_EXPLANATION);
    else props.onAttempt(isChestPredictionCorrect(value), CHEST_EXPLANATION);
  };
  const chestIndex = k === 4 && !props.attempted ? Math.min(5, Math.floor(smooth(p, .15, .85) * 5)) : chest;
  const chestLead = CHEST_CHOICES[chestIndex];
  const site = PRECORDIAL_SITES[chestLead];
  const hcx = 210 + HEART_CENTER[0], hcy = 175 + HEART_CENTER[1];
  const cx = 210 + site[0], cy = 175 + site[1];
  const plotScale = source ? Math.min(62, 72 / source.max) : 50;

  return <div class="fd-scene">
    <div class="fd-visuals">
      {k < 4 ? <Diagram title={lt(F3_STEPS[k].title)}>
        <defs><marker id={`f3-arrow-${uid}`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 1L6 4L0 7" fill="none" stroke="context-stroke" stroke-width="1.3" /></marker></defs>
        {k === 0 && <text x="220" y="30" text-anchor="middle" class="fd-svg-note">{lt(l('每个电极读取一个电位', 'Each electrode reads a potential', 'Cada electrodo mide un potencial'))}</text>}
        {k === 2 && <circle cx="220" cy="160" r="112" fill="none" stroke="var(--fd-grid)" stroke-width="1" opacity={slide} />}
        <path d={`M${TRIANGLE.RA.join(' ')}L${TRIANGLE.LA.join(' ')}L${TRIANGLE.LL.join(' ')}Z`} fill="none" stroke="var(--fd-grid)" stroke-width="1.5" opacity={k === 3 ? 0 : 1 - slide * .75} />
        {leadSet.map((l, i) => {
          const a = leadGeometry(l, slide);
          const reveal = k === 0 ? smooth(p, .05, .45) : k === 2 ? 1 : smooth(p, i * .065, i * .065 + .26);
          const dx = a.x2 - a.x1, dy = a.y2 - a.y1, len = Math.hypot(dx, dy);
          const labelX = a.x2 + dx / len * 19;
          const labelY = a.y2 + dy / len * 19;
          return <g key={l} opacity={lineOpacity(l)}>
            <path d={`M${a.x1} ${a.y1}L${a.x1 + dx * reveal} ${a.y1 + dy * reveal}`} fill="none" stroke={l === selected ? 'var(--c-vector)' : 'var(--fg-muted)'} stroke-width={l === selected ? 3 : 1.5} marker-end={`url(#f3-arrow-${uid})`} />
            <text x={labelX} y={labelY + 5} text-anchor="middle" class="fd-svg-label" fill={l === selected ? 'var(--c-vector)' : 'var(--fg-muted)'} opacity={reveal}>{l}</text>
          </g>;
        })}
        {(['RA', 'LA', 'LL'] as const).map(e => {
          const [x, y] = TRIANGLE[e];
          const active = poles.pos === e || poles.neg.includes(e);
          const val = source?.phi[e][sample] ?? 0;
          return <g key={e} opacity={k === 3 ? 0 : 1 - slide * .85}>
            <circle cx={x} cy={y} r="8" fill={active ? 'var(--c-highlight)' : 'var(--fg-muted)'} />
            {e === 'LL' && <path d={`M${x + 12} ${y - 5}H${x + 43}`} fill="none" stroke="var(--fg-muted)" stroke-width="1" />}
            <text x={x + (e === 'RA' ? -24 : e === 'LA' ? 24 : 64)} y={y + (e === 'LL' ? 0 : -21)} text-anchor="middle" class="fd-svg-label">{e}</text>
            {k === 0 && <text x={x + (e === 'RA' ? -29 : e === 'LL' ? 64 : 29)} y={y + (e === 'LL' ? 23 : 22)} text-anchor="middle" class="fd-svg-note fd-f3-electrode-value">{numberLabel(val)} mV</text>}
          </g>;
        })}
        {k === 1 && <text x="220" y="164" text-anchor="middle" class="fd-svg-label" fill="var(--c-highlight)">I + III = {props.attempted ? 'II' : '?'}</text>}
        {k === 2 && <><circle cx="220" cy="160" r="4" fill="var(--c-highlight)" /><text x="220" y="28" text-anchor="middle" class="fd-svg-label">{lead} · {LIMB_ANGLE_DEG[lead] > 0 ? '+' : ''}{LIMB_ANGLE_DEG[lead]}°</text></>}
        {k === 3 && <>
          <text x="220" y="25" text-anchor="middle" class="fd-svg-label">{formula}</text>
          <path d="M90 100Q125 100 185 170M90 240Q125 240 185 170" pathLength="1" stroke-dasharray={`${smooth(p, .05, .4)} 1`} fill="none" stroke="var(--c-highlight)" stroke-width="2" />
          <path d="M185 170L340 90" pathLength="1" stroke-dasharray={`${smooth(p, .4, .85)} 1`} fill="none" stroke="var(--c-vector)" stroke-width="3" marker-end={`url(#f3-arrow-${uid})`} />
          <circle cx="90" cy="100" r="8" fill="var(--c-highlight)" /><text x="90" y="80" text-anchor="middle" class="fd-svg-label">RA</text>
          <circle cx="90" cy="240" r="8" fill="var(--c-highlight)" /><text x="90" y="270" text-anchor="middle" class="fd-svg-label">LL</text>
          <circle cx="185" cy="170" r="10" fill="var(--c-highlight)" opacity={smooth(p, .25, .5)} /><text x="185" y="208" text-anchor="middle" class="fd-svg-label" opacity={smooth(p, .25, .5)}>(RA + LL) / 2</text>
          <circle cx="340" cy="90" r="8" fill="var(--c-vector)" /><text x="340" y="69" text-anchor="middle" class="fd-svg-label">LA (+)</text>
          <text x="340" y="120" text-anchor="middle" class="fd-svg-note">{numberLabel(source?.phi.LA[sample] ?? 0)} mV</text>
        </>}
      </Diagram> : <Diagram title={lt(F3_STEPS[4].title)}>
        <text x="220" y="27" text-anchor="middle" class="fd-svg-note">{lt(l('水平面 · 从脚端看', 'Horizontal plane · viewed from the feet', 'Plano horizontal · visto desde los pies'))}</text>
        <ellipse cx="210" cy="175" rx={CHEST.rx} ry={CHEST.ry} fill="var(--panel-2)" stroke="var(--fd-grid)" stroke-width="1.5" />
        <ellipse cx="134" cy="172" rx="47" ry="56" fill="none" stroke="var(--fd-grid)" /><ellipse cx="289" cy="172" rx="40" ry="55" fill="none" stroke="var(--fd-grid)" />
        <circle cx={hcx} cy={hcy} r="31" fill="var(--c-qrs)" opacity=".1" />
        <path d={CHEST_SOURCE.loop.map((v, i) => `${i ? 'L' : 'M'}${hcx + v[0] * 31},${hcy + v[1] * 31}`).join(' ')} fill="none" stroke="var(--c-vector)" stroke-width="2" />
        <path d={`M${hcx} ${hcy}L${cx} ${cy}`} stroke="var(--c-highlight)" stroke-width="2" stroke-dasharray="4 4" />
        {CHEST_CHOICES.map((label, i) => {
          const s = PRECORDIAL_SITES[label]; const x = 210 + s[0], y = 175 + s[1];
          return <g key={label} opacity={i === chestIndex ? 1 : .38}><circle cx={x} cy={y} r={i === chestIndex ? 7 : 4} fill={i === chestIndex ? 'var(--c-highlight)' : 'var(--fg-muted)'} /><text x={x + (i === 0 ? -13 : i === 1 ? 7 : 0)} y={y - (i % 2 === 0 ? 18 : 31)} text-anchor="middle" class="fd-svg-label">{label}</text></g>;
        })}
        <text x="220" y="293" text-anchor="middle" class="fd-svg-note">{lt(l('WCT：参考电位', 'WCT: reference potential', 'WCT: potencial de referencia'))}</text>
      </Diagram>}

      <div class="fd-f3-output">
        {k < 4 ? <>
          <Trace values={source?.leads[selected] ?? []} label={formula} scale={plotScale} progress={draw} color="var(--c-vector)" ghost={k === 1 && props.attempted && source ? source.leads.I.map((v, i) => v + source.leads.III[i]) : undefined} footer={lt(l('同一搏 · 电位差', 'One beat · potential difference', 'Un latido · diferencia de potencial'))} />
          {k === 1 && props.attempted && <p class="fd-f3-equation">I + III <span>≡</span> II</p>}
          {k === 2 && <p class="fd-f3-equation">{lt(l('平移 ≠ 旋转', 'Translation ≠ rotation', 'Traslación ≠ rotación'))}</p>}
          {k === 3 && <p class="fd-f3-reference">WCT = (RA + LA + LL) / 3<br /><span>{lt(l('胸导联：Vₓ − WCT', 'Chest lead: Vₓ − WCT', 'Precordial: Vₓ − WCT'))}</span></p>}
        </> : <Trace values={CHEST_SOURCE.traces[chestIndex]} label={`${chestLead} − WCT`} scale={65 / CHEST_SOURCE.maxAmp} progress={draw} color="var(--c-qrs)" ghost={props.attempted && chestIndex !== 0 ? CHEST_SOURCE.traces[0] : undefined} footer={lt(l('示意模型 · 灰线为 V1', 'Schematic · grey: V1', 'Esquema · gris: V1'))} />}
      </div>
    </div>
    <div class="fd-experiment">
      {k === 0 && <Choices options={['I', 'II', 'III'].map(id => ({ id, label: name(id) }))} value={answer} onChoose={go} />}
      {k === 1 && <Choices options={['I', 'II', 'aVF'].map(id => ({ id, label: name(id) }))} value={answer} onChoose={go} />}
      {k === 2 && <Choices options={LIMB_LEADS.map(id => ({ id, label: name(id) }))} value={answer} onChoose={go} />}
      {k === 3 && <Choices options={[
        { id: 'ra', label: l('只有右臂', 'Right arm alone', 'Solo el brazo derecho') },
        { id: 'average', label: l('右臂与左腿的平均值', 'Mean of right arm and left leg', 'Media de brazo derecho y pierna izquierda') },
        { id: 'wct', label: l('三个肢体电位的平均值', 'Mean of all three limb potentials', 'Media de los tres potenciales') },
      ]} value={answer} onChoose={go} />}
      {k === 4 && <>
        <Choices options={[{ id: 'same', label: l('各位置相同', 'The same at every position', 'Igual en todas las posiciones') }, { id: 'different', label: l('波形随观察位置改变', 'The trace changes with position', 'El trazado cambia con la posición') }]} value={answer} onChoose={go} />
        <Choices options={CHEST_CHOICES.map((label, i) => ({ id: String(i), label: name(label) }))} value={String(chestIndex)} disabled={!props.attempted} label={lt(l('选择观察位置', 'Choose a viewing position', 'Elige una posición'))} onChoose={value => { props.onManipulate(); setChest(Number(value)); }} />
      </>}
    </div>
  </div>;
}
