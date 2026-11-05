import { useEffect, useRef, useState } from 'preact/hooks';
import { l } from '../../core/l10n';
import { lt } from '../../i18n';
import { ELECTRODES } from '../../figures/data/electrodes';
import { Choices } from './visuals';
import { smooth, type StorySceneProps, type StoryStep } from './types';
import { CHEST_ORDER, gradePlacement, placementCorrect, ribSpace, targetOf, torsoPoint, type ChestElectrode, type Point } from './f5.math';
import './f5-f6.css';

export const F5_STEPS: readonly StoryStep[] = [
  { id: 'landmarks', title: l('先找到坐标', 'Find the landmarks', 'Encuentra las referencias'), narration: l('从胸骨角找到第 2 肋，向下数肋间。位置由骨性地标决定，而不是由乳头决定。', 'Find the second rib at the sternal angle, then count spaces downward. Use bony landmarks, not the nipple.', 'Localiza la segunda costilla en el ángulo esternal y cuenta los espacios hacia abajo. Usa referencias óseas, no el pezón.'), task: l('V1、V2 应放在哪个肋间？', 'Which intercostal space contains V1 and V2?', '¿En qué espacio intercostal se colocan V1 y V2?'), durationMs: 6000 },
  { id: 'guided', title: l('先放 V4，再连接 V3', 'Place V4 before V3', 'Coloca V4 antes que V3'), narration: l('V4 位于左锁骨中线第 5 肋间；V3 在 V2 与 V4 中间。V5、V6 保持 V4 的水平。', 'V4 sits in the fifth space at the left midclavicular line. V3 is midway from V2 to V4; V5 and V6 stay level with V4.', 'V4 va en el quinto espacio, en la línea medioclavicular izquierda. V3 queda entre V2 y V4; V5 y V6 mantienen el nivel de V4.'), task: l('选择 V4，再点击胸廓上的位置，或拖动 V4。', 'Select V4, then click its site on the chest, or drag V4.', 'Selecciona V4 y pulsa su posición en el tórax, o arrastra V4.'), durationMs: 7000 },
  { id: 'place', title: l('现在由你放置', 'Now place them yourself', 'Ahora colócalos tú'), narration: l('将位置和名称分开思考：先找肋间与参考线，再放对应电极。选择一个电极后点击或拖放。', 'Separate location from cable name: find the space and reference line, then place the electrode. Select and click, or drag.', 'Separa la posición del nombre del cable: encuentra el espacio y la línea de referencia, y coloca el electrodo. Selecciona y pulsa, o arrastra.'), task: l('放置六个电极，然后检查。可用下方位置按钮代替拖动。', 'Place the six electrodes, then check. The site buttons below are an alternative to dragging.', 'Coloca los seis electrodos y comprueba. Los botones de posición permiten hacerlo sin arrastrar.'), durationMs: 5000 },
  { id: 'distinguish', title: l('位置错，还是线接错？', 'Wrong site or wrong cable?', '¿Posición o cable incorrectos?'), narration: l('电极放得过高改变观察位置；交换线缆改变导联名称。两种错误需要不同的修正。', 'An electrode placed too high changes the viewing site. Swapping cables changes the lead labels. The fixes are different.', 'Un electrodo demasiado alto cambia el punto de observación; intercambiar cables cambia las etiquetas. Las correcciones son distintas.'), task: l('图中 V1 比正确位置高了两个肋间。应该怎么修正？', 'V1 is two spaces above its correct site. How should you fix it?', 'V1 está dos espacios por encima de su lugar correcto. ¿Cómo lo corriges?'), durationMs: 6000 },
];

const T = {
  torso: l('胸廓正面：患者右侧在画面左侧', 'Chest, front view: patient’s right is on the left', 'Tórax de frente: la derecha del paciente queda a la izquierda'),
  right: l('患者右', 'Patient R', 'Dcha. paciente'), left: l('患者左', 'Patient L', 'Izda. paciente'),
  angle: l('胸骨角', 'Sternal angle', 'Ángulo esternal'),
  mcl: l('锁骨中线', 'Midclavicular', 'Medioclavicular'),
  aal: l('腋前线', 'Anterior axillary', 'Axilar anterior'), mal: l('腋中线', 'Mid-axillary', 'Axilar media'),
  site: l('选择落点', 'Choose a site', 'Elige una posición'),
  check: l('检查摆放', 'Check placement', 'Comprobar posiciones'), reset: l('重新放置', 'Start again', 'Volver a colocar'),
  schematic: l('定位示意 · 不按解剖比例', 'Placement diagram · not to anatomical scale', 'Esquema de colocación · no a escala anatómica'),
  noWave: l('先判断电极落点，再检查线缆连接。', 'Check electrode placement first, then check the cable connections.', 'Comprueba primero la posición de los electrodos y después las conexiones de los cables.'),
  buttonPlacement: l('用按钮选择电极与落点', 'Choose electrodes and sites with buttons', 'Elegir electrodos y posiciones con botones'),
};

export function F5Scene(props: StorySceneProps) {
  const [selected, setSelected] = useState<ChestElectrode>('V4');
  const [placed, setPlaced] = useState<Partial<Record<ChestElectrode, Point>>>({});
  const [checked, setChecked] = useState(false);
  const [answer, setAnswer] = useState('');
  const [fixed, setFixed] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: ChestElectrode; start: Point; moved: boolean } | null>(null);
  useEffect(() => { setPlaced({}); setChecked(false); setAnswer(''); setFixed(false); setSelected(props.step === 2 ? 'V1' : 'V4'); }, [props.step]);
  const p = props.progress;
  const interactive = props.step === 1 || props.step === 2;
  const mapPoint = (e: PointerEvent): Point => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const matrix = svg.getScreenCTM()?.inverse();
    if (!matrix) return [0, 0];
    const xy = pt.matrixTransform(matrix);
    return [Math.max(42, Math.min(395, xy.x)), Math.max(45, Math.min(280, xy.y))];
  };
  const place = (id: ChestElectrode, point: Point) => {
    props.onManipulate(); setPlaced(old => ({ ...old, [id]: point })); setChecked(false);
    if (props.step === 1) {
      const correct = placementCorrect(id, point);
      setChecked(true);
      props.onAttempt(correct, correct ? ELECTRODES[id].where : l(`再对照地标：${ELECTRODES[id].where.zh}`, `Check the landmarks: ${ELECTRODES[id].where.en}`, `Revisa las referencias: ${ELECTRODES[id].where.es}`));
    }
  };
  const pick = (id: string, correct: string, explanation: ReturnType<typeof l>) => { props.onManipulate(); setAnswer(id); props.onAttempt(id === correct, explanation); };
  const slots = CHEST_ORDER.map((id, i) => ({ id, p: [58 + i * 65, 313] as Point }));
  const current = ELECTRODES[selected];
  return <div class="fd-scene fd-electrodes">
    <div class="fd-visuals">
      <div class="fd-diagram fd-torso">
        <svg ref={svgRef} viewBox="0 0 440 346" role="group" aria-label={lt(T.torso)}
          onPointerDown={e => { if (!interactive || e.button !== 0 || (e.target as Element).closest('[data-electrode]')) return; props.onManipulate(); place(selected, mapPoint(e)); }}
          onPointerMove={e => { if (!drag.current) return; const xy = mapPoint(e); drag.current.moved ||= Math.hypot(xy[0] - drag.current.start[0], xy[1] - drag.current.start[1]) > 5; setPlaced(old => ({ ...old, [drag.current!.id]: xy })); }}
          onPointerUp={e => { const d = drag.current; drag.current = null; if (d?.moved) place(d.id, mapPoint(e)); }}
          onPointerCancel={() => { drag.current = null; }}>
          <text x="48" y="25" class="fd-svg-note">{lt(T.right)}</text><text x="302" y="25" class="fd-svg-note">{lt(T.left)}</text>
          <path d="M145 42L130 58Q90 60 67 96L48 266M225 42L240 58Q312 54 351 96L391 266M131 58Q181 84 240 58M76 104Q105 182 107 280M349 104Q349 205 365 280" fill="none" stroke="var(--fd-muted)" stroke-width="2" opacity=".65" />
          <path d="M184 65L184 250" fill="none" stroke="var(--fd-muted)" stroke-width="9" opacity=".2" />
          {[2, 3, 4, 5, 6].map((n, i) => {
            const a = ribSpace(n as 2 | 3 | 4 | 5 | 6, 125), b = ribSpace(n as 2 | 3 | 4 | 5 | 6, 210), c = ribSpace(n as 2 | 3 | 4 | 5 | 6, 335);
            const opacity = props.step > 0 ? .6 : smooth(p, i * .12, i * .12 + .3);
            return <g key={n} opacity={opacity}><path d={`M${a[0]} ${a[1] - 10}Q${b[0]} ${b[1] - 4} ${c[0]} ${c[1] - 10}`} fill="none" stroke="var(--fd-muted)" stroke-width="1.2" /><text x="85" y={b[1] + 3} class="fd-svg-note">{n}</text></g>;
          })}
          {props.step === 0 && <g opacity={smooth(p, 0, .25)}><circle cx="184" cy="94" r="5" fill="var(--c-highlight)" /><path d="M188 94L244 78" stroke="var(--c-highlight)" /><text x="250" y="80" class="fd-svg-note">{lt(T.angle)}</text><path d="M153 105V194" stroke="var(--c-highlight)" stroke-width="3" stroke-dasharray="5 5" opacity={smooth(p, .2, .8)} /></g>}
          {props.step > 0 && <g opacity={smooth(p, 0, .4)}><path d={`M${targetOf('V4')[0]} 66V280M${targetOf('V5')[0]} 98V280M${targetOf('V6')[0]} 114V280`} stroke="var(--c-vector)" stroke-dasharray="3 5" fill="none" opacity=".45" /><path d={`M${targetOf('V4')[0]} ${targetOf('V4')[1]}H${targetOf('V6')[0] + 20}`} stroke="var(--c-repol)" stroke-width="2" stroke-dasharray="6 4" /></g>}
          {CHEST_ORDER.map((id, i) => { const [x, y] = targetOf(id); const show = props.step === 0 ? id === 'V1' || id === 'V2' : true; if (!show) return null; const reveal = props.step === 1 ? smooth(p, i * .1, i * .1 + .2) : smooth(p, .35, .7); return <g opacity={reveal} key={id}><circle cx={x} cy={y} r="11" fill="var(--fd-bg)" stroke="var(--c-repol)" stroke-width="1.5" stroke-dasharray={props.step === 2 ? '2 3' : undefined} />{props.step !== 2 && <text x={x} y={y + 4} text-anchor="middle" class="fd-placement-tag">{id}</text>}</g>; })}
          {props.step === 3 && <g><circle cx={targetOf('V1')[0]} cy={fixed ? targetOf('V1')[1] : ribSpace(2, ELECTRODES.V1.x)[1]} r="16" fill="var(--fd-bg)" stroke={fixed ? 'var(--ok)' : 'var(--err)'} stroke-width="3" /><text x={targetOf('V1')[0]} y={(fixed ? targetOf('V1')[1] : ribSpace(2, ELECTRODES.V1.x)[1]) + 5} text-anchor="middle" class="fd-placement-tag">V1</text>{props.attempted && !fixed && <path d={`M${targetOf('V1')[0]} ${ribSpace(2, ELECTRODES.V1.x)[1] + 18}V${targetOf('V1')[1] - 14}`} stroke="var(--c-highlight)" stroke-width="3" stroke-dasharray="4 4" />}</g>}
          {interactive && slots.map(({ id, p: tray }) => { const point = placed[id] ?? tray; const right = placed[id] && placementCorrect(id, point); return <g key={id} data-electrode={id} class="fd-electrode-token" role="button" tabIndex={0} aria-label={`${id}: ${lt(ELECTRODES[id].where)}`} aria-pressed={selected === id}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); props.onManipulate(); setSelected(id); } }}
            onPointerDown={e => { e.stopPropagation(); props.onManipulate(); setSelected(id); drag.current = { id, start: mapPoint(e), moved: false }; (e.currentTarget as Element).setPointerCapture(e.pointerId); }}
            onClick={() => setSelected(id)}>
            <circle cx={point[0]} cy={point[1]} r="21" fill="transparent" /><circle cx={point[0]} cy={point[1]} r="15" fill="var(--fd-bg)" stroke={checked && placed[id] ? right ? 'var(--ok)' : 'var(--err)' : selected === id ? 'var(--c-highlight)' : 'var(--c-vector)'} stroke-width={selected === id ? 3 : 2} /><text x={point[0]} y={point[1] + 5} text-anchor="middle" class="fd-placement-tag">{id}</text>
            {checked && placed[id] && !right && <path d={`M${point[0]} ${point[1]}L${targetOf(id)[0]} ${targetOf(id)[1]}`} stroke="var(--c-highlight)" stroke-dasharray="3 4" />}
          </g>; })}
        </svg>
        <p class="fd-scene-note">{lt(T.schematic)}</p>
      </div>
      <div class="fd-anatomy-guide">
        <span class="fd-eyebrow">{props.step === 0 ? lt(T.angle) : props.step === 3 ? lt(l('先检查记录', 'Check the recording first', 'Revisa primero el registro')) : selected}</span>
        <h3>{props.step === 0 ? lt(l('2 → 3 → 4', '2 → 3 → 4', '2 → 3 → 4')) : props.step === 3 ? lt(l('同一名称，不同位置', 'Same label, different site', 'Misma etiqueta, otro sitio')) : lt(current.where)}</h3>
        <p>{props.step === 0 ? lt(l('胸骨角对应第 2 肋；其下是第 2 肋间。向下数到第 4 肋间，再分清胸骨左右缘。', 'The second rib meets the sternal angle. Below it is the second space. Count down to the fourth, then choose the correct sternal border.', 'La segunda costilla se une al ángulo esternal. Debajo está el segundo espacio. Cuenta hasta el cuarto y elige el borde esternal correcto.')) : props.step === 3 ? lt(T.noWave) : lt(l('先定位，再连接。患者的左侧在画面右边。', 'Locate first, connect second. The patient’s left is on your right.', 'Primero localiza y después conecta. La izquierda del paciente está a tu derecha.'))}</p>
        {props.step > 0 && props.step < 3 && <dl><div><dt>V4</dt><dd>{lt(T.mcl)}</dd></div><div><dt>V5</dt><dd>{lt(T.aal)}</dd></div><div><dt>V6</dt><dd>{lt(T.mal)}</dd></div></dl>}
        {props.step === 2 && <p class="fd-placement-count">{Object.keys(placed).length}<span> / 6</span></p>}
      </div>
    </div>
    <div class="fd-experiment">
      {props.step === 0 && <Choices value={answer} options={[2, 4, 5].map(n => ({ id: String(n), label: l(`第 ${n} 肋间`, `Space ${n}`, `Espacio ${n}`) }))} onChoose={id => pick(id, '4', l('V1、V2 位于第 4 肋间，分别在胸骨右缘和左缘。', 'V1 and V2 occupy the fourth space at the right and left sternal borders.', 'V1 y V2 van en el cuarto espacio, en los bordes esternales derecho e izquierdo.'))} />}
      {interactive && <>
        <details class="fd-placement-buttons">
          <summary>{lt(T.buttonPlacement)}</summary>
          <Choices value={selected} options={CHEST_ORDER.map(id => ({ id, label: l(id, id, id) }))} onChoose={id => { props.onManipulate(); setSelected(id as ChestElectrode); }} />
          <div class="fd-site-options" role="group" aria-label={lt(T.site)}>{CHEST_ORDER.map(id => <button type="button" class="fd-site-button" onClick={() => place(selected, targetOf(id))}>{lt(ELECTRODES[id].where)}</button>)}</div>
        </details>
        {props.step === 2 && <div class="fd-choices"><button type="button" class="fd-choice" disabled={Object.keys(placed).length < 6} onClick={() => { props.onManipulate(); setChecked(true); const wrong = gradePlacement(placed); props.onAttempt(wrong.length === 0, wrong.length === 0 ? l('六个位置都正确。V3 在 V2 与 V4 中间，V4–V6 保持同一水平。', 'All six sites are correct. V3 lies between V2 and V4; V4–V6 share a horizontal level.', 'Las seis posiciones son correctas. V3 queda entre V2 y V4; V4–V6 comparten nivel horizontal.') : l(`检查 ${wrong.join('、')}：虚线指向正确落点。答错也可以继续，或重新摆放。`, `Check ${wrong.join(', ')}: dashed lines point to the correct sites. Continue or try again.`, `Revisa ${wrong.join(', ')}: las líneas discontinuas señalan los sitios correctos. Puedes continuar o repetir.`)); }}>{lt(T.check)}</button><button type="button" class="fd-choice" onClick={() => { props.onManipulate(); setPlaced({}); setChecked(false); }}>{lt(T.reset)}</button></div>}
      </>}
      {props.step === 3 && <Choices value={answer} options={[{ id: 'move', label: l('将 V1 移至第 4 肋间', 'Move V1 to the fourth space', 'Mover V1 al cuarto espacio') }, { id: 'swap', label: l('交换 V1 与 V2 线缆', 'Swap the V1 and V2 cables', 'Intercambiar los cables V1 y V2') }]} onChoose={id => { setFixed(id === 'move'); pick(id, 'move', l('先把 V1 移回胸骨右缘第 4 肋间。交换线缆不能修复一个过高的电极。', 'Return V1 to the fourth space at the right sternal border. A cable swap cannot fix an electrode placed too high.', 'Devuelve V1 al cuarto espacio del borde esternal derecho. Intercambiar cables no corrige un electrodo demasiado alto.')); }} />}
    </div>
  </div>;
}
