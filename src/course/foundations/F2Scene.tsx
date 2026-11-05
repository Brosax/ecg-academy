import { useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import { l } from '../../core/l10n';
import { LIMB_ANGLE_DEG, LIMB_LEADS } from '../../core/leads';
import { lt } from '../../i18n';
import { frontalQrsLoop, horizontalQrsLoop } from '../../figures/math/projection';
import { Choices, Diagram, Trace, numberLabel } from './visuals';
import { chestTraces, limbTraces, projection, projectionKind, type Limb } from './f2.math';
import { smooth, type StorySceneProps, type StoryStep } from './types';

export const F2_STEPS: readonly StoryStep[] = [
  { id: 'arrow', title: l('把电活动变成一个箭头', 'Begin with one arrow', 'Empezar con una flecha'), narration: l('许多微小电活动相加，成为一个瞬时向量。先只看它与 II 导联的方向。', 'Many small electrical contributions add into one instantaneous vector. First compare its direction with lead II.', 'Muchas contribuciones eléctricas forman un vector instantáneo. Compara primero su dirección con la derivación II.'), task: l('转动蓝色箭头，让它朝向 II 导联的正端，再验证。', 'Turn the blue arrow towards the positive end of lead II, then check.', 'Gira la flecha azul hacia el polo positivo de II y comprueba.') },
  { id: 'shadow', title: l('导联只看见一个投影', 'A lead sees a projection', 'Una derivación ve una proyección'), narration: l('将箭头垂直落到导联轴上。这段有正负的“影子”，就是此刻记录的值。', 'Drop the arrow onto the lead axis. This signed shadow is the value recorded at this instant.', 'Proyecta la flecha sobre el eje. Esta sombra con signo es el valor registrado en este instante.'), task: l('让箭头与 II 导联垂直，使瞬时投影接近零。', 'Make the arrow perpendicular to lead II, bringing its instantaneous projection close to zero.', 'Coloca la flecha perpendicular a II para que la proyección instantánea sea casi cero.') },
  { id: 'pen', title: l('投影移动，笔尖留下波形', 'The moving projection draws a trace', 'La proyección móvil dibuja el trazado'), narration: l('箭头随心室激动改变方向和大小。每一刻的投影控制笔尖高度，时间向右展开。', 'The vector changes direction and size during ventricular activation. Its projection sets pen height as time moves right.', 'El vector cambia de dirección y tamaño durante la activación ventricular. Su proyección mueve la pluma mientras avanza el tiempo.'), task: l('拖动时间轴观察笔尖。波形的高度由什么决定？', 'Scrub time and follow the pen. What determines its height?', 'Mueve el tiempo y sigue la pluma. ¿Qué determina su altura?') },
  { id: 'balance', title: l('零投影不等于整段平线', 'Zero now is not a flat complex', 'Cero ahora no significa un complejo plano'), narration: l('aVL 与平均向量垂直，但瞬时向量仍在转动：正负投影相抵，留下双向 QRS。', 'aVL is perpendicular to the mean vector, but the instantaneous vector still moves: positive and negative areas balance.', 'aVL es perpendicular al vector medio, pero el vector instantáneo gira: las áreas positiva y negativa se compensan.'), task: l('平均向量与导联垂直时，动态 QRS 最可能怎样？', 'With a perpendicular mean vector, what can the moving QRS look like?', 'Con un vector medio perpendicular, ¿qué aspecto puede tener el QRS dinámico?') },
  { id: 'leads', title: l('同一个心脏，六个观察方向', 'One source, six viewpoints', 'Una fuente, seis puntos de vista'), narration: l('保持同一个向量环，只改变观察方向。所有肢体导联同时产生，彼此存在确定关系。', 'Keep the same vector loop and change the viewpoint. All limb leads arise together and obey fixed relationships.', 'Mantén el mismo bucle vectorial y cambia la observación. Todas las derivaciones de miembros se obtienen a la vez y mantienen relaciones fijas.'), task: l('选择主要呈负向 QRS 的导联，观察它与 II 导联的差别。', 'Choose a lead with a mainly negative QRS and compare it with II.', 'Elige una derivación con QRS predominantemente negativo y compárala con II.') },
  { id: 'sequence', title: l('一个 QRS，也是一段旅程', 'A QRS is a sequence, too', 'El QRS también es una secuencia'), narration: l('先是室间隔，再是主要心室肌，最后是基底部。V1 与 V6 从不同位置观察同一组向量。', 'Septal, main ventricular and basal activation follow in sequence. V1 and V6 observe the same source from different positions.', 'Se activan primero el tabique, luego la masa ventricular y después las bases. V1 y V6 observan la misma fuente desde posiciones distintas.'), task: l('主要左室激动时，哪一个观察窗产生较大的正向波？', 'During main left-ventricular activation, which window has the larger positive wave?', 'Durante la activación principal del VI, ¿qué derivación muestra la mayor onda positiva?') },
];

export function F2Scene(p: StorySceneProps) {
  const [angle, setAngle] = useState(60);
  const [lead, setLead] = useState<Limb>('II');
  const [choice, setChoice] = useState('');
  const [touched, setTouched] = useState(false);
  const dragging = useRef(false);
  const svg = useRef<SVGSVGElement>(null);
  const id = useId();
  useEffect(() => { setChoice(''); setTouched(false); setAngle(60); setLead(p.step === 3 ? 'aVL' : 'II'); }, [p.step]);
  const dynamic = p.step >= 2;
  const chest = p.step === 5;
  const traces = useMemo(() => limbTraces(angle), [angle]);
  const chestSignals = useMemo(chestTraces, []);
  const loop = useMemo(() => chest ? horizontalQrsLoop(40, 180) : frontalQrsLoop(angle, 180), [angle, chest]);
  const k = Math.min(loop.length - 1, Math.round(p.progress * (loop.length - 1)));
  const vector = dynamic ? loop[k] : [Math.cos(angle * Math.PI / 180), Math.sin(angle * Math.PI / 180)];
  const cx = 210, cy = 145, radius = 106;
  const axis = (chest ? 0 : LIMB_ANGLE_DEG[lead]) * Math.PI / 180;
  const ux = Math.cos(axis), uy = Math.sin(axis);
  const dot = vector[0] * ux + vector[1] * uy;
  const tip = [cx + vector[0] * radius, cy + vector[1] * radius];
  const foot = [cx + dot * ux * radius, cy + dot * uy * radius];
  const changeAngle = (v: number) => { p.onManipulate(); setTouched(true); setAngle(Math.round(v)); };
  const reveal = touched ? 1 : p.progress;
  const shadowReveal = p.step === 0 ? smooth(reveal, .65, 1) : p.step === 1 ? smooth(reveal, .35, .85) : 1;
  const dragTo = (e: PointerEvent) => {
    if (!svg.current || dynamic) return;
    const point = svg.current.createSVGPoint(); point.x = e.clientX; point.y = e.clientY;
    const matrix = svg.current.getScreenCTM(); if (!matrix) return;
    const q = point.matrixTransform(matrix.inverse());
    changeAngle(Math.atan2(q.y - cy, q.x - cx) * 180 / Math.PI);
  };
  const pick = (v: string, answer: string, explanation: ReturnType<typeof l>) => { p.onManipulate(); setChoice(v); p.onAttempt(v === answer, explanation); };
  const percent = dynamic ? p.progress : 1;
  return <div class="fd-scene">
    <div class="fd-visuals">
      <div class="fd-diagram fd-vector-plane">
        <svg ref={svg} viewBox="0 0 440 300" role="img" aria-label={lt(l('向量、导联轴和投影', 'Vector, lead axis and projection', 'Vector, eje y proyección'))} onPointerDown={e => { if (dynamic) return; dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); dragTo(e); }} onPointerMove={e => { if (dragging.current) dragTo(e); }} onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }}>
          <defs><marker id={`arrow-${id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="var(--c-vector)" stroke-width="1.6" /></marker></defs>
          <circle cx={cx} cy={cy} r={radius} class="fd-orbit" />
          <path d={`M${cx-radius-20} ${cy}H${cx+radius+20}M${cx} ${cy-radius-20}V${cy+radius+20}`} class="fd-baseline" />
          {!chest && (p.step >= 4 ? LIMB_LEADS : [lead]).map(a => { const rad = LIMB_ANGLE_DEG[a] * Math.PI / 180; const x = Math.cos(rad), y = Math.sin(rad); return <g key={a} opacity={lead === a ? 1 : .26}><path d={`M${cx-x*radius} ${cy-y*radius}L${cx+x*radius} ${cy+y*radius}`} class="fd-axis" /><text x={cx+x*(radius+24)} y={cy+y*(radius+24)+5} text-anchor="middle" class="fd-svg-label">{a}<tspan class="fd-svg-note"> +</tspan></text></g>; })}
          {dynamic && <path d={loop.slice(0, k + 1).map(([x,y], i) => `${i ? 'L' : 'M'}${cx+x*radius},${cy+y*radius}`).join(' ')} class="fd-vector-trail" />}
          {p.step === 0 && reveal < .85 && (() => { const u=vector, v=[-u[1],u[0]], chain=smooth(reveal,0,.55), fade=1-smooth(reveal,.55,.85); const parts=[[u[0]*.4+v[0]*.28,u[1]*.4+v[1]*.28],[u[0]*.4-v[0]*.28,u[1]*.4-v[1]*.28],[u[0]*.2,u[1]*.2]]; let x=0,y=0; return parts.map(([dx,dy],i)=>{const sx=cx+x*radius+(1-chain)*(i-1)*105,sy=cy+y*radius-(1-chain)*50; x+=dx;y+=dy;return <path key={i} d={`M${sx} ${sy}l${dx*radius} ${dy*radius}`} stroke="var(--c-vector)" stroke-width="2.4" marker-end={`url(#arrow-${id})`} opacity={fade}/>;}); })()}
          {p.step >= 1 && !chest && <g opacity={p.step === 1 ? smooth(reveal, 0, .2) : 1}><path d={`M${tip[0]} ${tip[1]}L${tip[0]+(foot[0]-tip[0])*smooth(reveal,0,.45)} ${tip[1]+(foot[1]-tip[1])*smooth(reveal,0,.45)}`} class="fd-drop" /><path d={`M${cx} ${cy}L${cx+(foot[0]-cx)*shadowReveal} ${cy+(foot[1]-cy)*shadowReveal}`} stroke="var(--c-highlight)" stroke-width="5" stroke-linecap="round" /><circle cx={foot[0]} cy={foot[1]} r="5" fill="var(--c-highlight)" opacity={shadowReveal}/></g>}
          <path d={`M${cx} ${cy}L${tip[0]} ${tip[1]}`} stroke="var(--c-vector)" stroke-width="3.5" marker-end={`url(#arrow-${id})`} opacity={p.step===0 ? smooth(reveal,.5,.85) : 1}/>
          {!dynamic && <circle cx={tip[0]} cy={tip[1]} r="13" class="fd-handle" opacity={p.step===0?smooth(reveal,.5,.85):1}/>}
          <circle cx={cx} cy={cy} r="4" fill="var(--fg)" />
          <text x="20" y="28" class="fd-svg-note">{lt(l('共同的心电源 · 示意', 'SHARED SOURCE · SCHEMATIC', 'FUENTE COMÚN · ESQUEMA'))}</text>
          <text x="210" y="289" text-anchor="middle" class="fd-svg-label">{chest ? lt(l('室间隔 → 心室肌 → 基底部', 'Septum → ventricles → bases', 'Tabique → ventrículos → bases')) : dynamic ? lt(l('瞬时向量沿轨迹运动', 'The instantaneous vector follows the loop', 'El vector instantáneo recorre el bucle')) : `${angle}°`}</text>
        </svg>
      </div>
      <div class="fd-plot-stack">
        {dynamic ? <><Trace values={chest ? chestSignals.V1 : traces[lead]} label={chest ? 'V1' : `${lead} · ${lt(l('投影随时间展开', 'projection over time', 'proyección en el tiempo'))}`} progress={percent} scale={62} footer={lt(l('时间 →', 'time →', 'tiempo →'))} />{(chest || p.step >= 4) && <Trace values={chest ? chestSignals.V6 : traces.II} label={chest ? 'V6' : 'II'} progress={percent} scale={62} color="var(--c-repol)" />}</> : <Diagram title={lt(l('瞬时记录值', 'Instantaneous reading', 'Valor instantáneo'))}>
          <text x="30" y="28" class="fd-svg-note">{lt(l('此刻的记录', 'THE READING, RIGHT NOW', 'EL REGISTRO, AHORA'))}</text>
          <path d="M70 150H370M220 60V240" class="fd-baseline" /><text x="235" y="65" class="fd-svg-note">+</text><text x="235" y="242" class="fd-svg-note">−</text>
          <path d={`M220 150V${150-projection(angle,'II')*85*shadowReveal}`} stroke="var(--c-highlight)" stroke-width="5" stroke-linecap="round" /><circle cx="220" cy={150-projection(angle,'II')*85*shadowReveal} r="6" fill="var(--c-highlight)" />
          <text x="300" y="155" class="fd-svg-value" opacity={shadowReveal}>{numberLabel(projection(angle,'II'))}</text><text x="220" y="285" text-anchor="middle" class="fd-svg-label">{lt(l('II 导联 · 相对幅值', 'Lead II · relative amplitude', 'II · amplitud relativa'))}</text>
        </Diagram>}
      </div>
    </div>
    <div class="fd-experiment">
      {p.step <= 1 ? <><label class="fd-range-label">{lt(l('转动心电向量', 'Rotate the vector', 'Gira el vector'))}<output>{angle}°</output><input aria-label={lt(l('向量方向', 'Vector direction', 'Dirección del vector'))} type="range" min="-180" max="180" value={angle} onInput={e => changeAngle(Number(e.currentTarget.value))} /></label><button type="button" class="fd-choice" onClick={() => p.onAttempt(projectionKind(projection(angle,'II')) === (p.step === 0 ? 'positive' : 'zero'), l('朝向正端得到正值，背离得到负值，垂直时接近零。拖动时，橙色投影与记录值一起改变。', 'Towards the positive pole gives a positive value; away gives a negative one; perpendicular is near zero. The orange projection and reading change together.', 'Hacia el polo positivo: valor positivo; en sentido opuesto: negativo; perpendicular: casi cero. La proyección naranja y el registro cambian juntos.'))}>{lt(l('验证我的方向', 'Check my direction', 'Comprobar mi dirección'))}</button></> : p.step === 4 ? <Choices options={LIMB_LEADS.map(a => ({ id:a,label:l(a,a,a) }))} value={lead} onChoose={a => { setLead(a as Limb); p.onManipulate(); p.onAttempt(a === 'aVR',l('aVR 从右上方观察，与主要向左下的向量相背，因此主要负向；II 从另一侧观察。', 'aVR looks from the upper right, opposite the main left-inferior vector, so it is mainly negative. II sees the same source from another side.', 'aVR observa desde arriba a la derecha, opuesta al vector principal hacia abajo a la izquierda: predomina la negatividad. II ve la misma fuente desde otro lado.')); }} /> : <Choices value={choice} options={p.step === 2 ? [{id:'projection',label:l('瞬时投影', 'Instantaneous projection', 'Proyección instantánea')},{id:'length',label:l('只有箭头长度', 'Arrow length alone', 'Solo la longitud')},{id:'speed',label:l('纸移动的速度', 'Paper speed', 'Velocidad del papel')}] : p.step === 3 ? [{id:'biphasic',label:l('先正后负或先负后正', 'Positive and negative parts', 'Partes positivas y negativas')},{id:'flat',label:l('始终平直', 'Flat throughout', 'Siempre plano')}] : [{id:'V1',label:l('V1', 'V1', 'V1')},{id:'V6',label:l('V6', 'V6', 'V6')}]} onChoose={v => pick(v,p.step === 2 ? 'projection' : p.step === 3 ? 'biphasic' : 'V6',p.step === 2 ? l('笔尖读的是向量在导联方向上的投影。向量越长不一定波越高，还要看夹角。', 'The pen reads the projection along the lead. A longer vector is not necessarily a taller wave: the angle matters.', 'La pluma lee la proyección en el eje. Un vector más largo no siempre da una onda más alta: importa el ángulo.') : p.step === 3 ? l('平均投影为零，可以由正负面积相抵形成；图中的动态轨迹不是静止的垂直箭头。', 'Zero mean projection can come from cancelling positive and negative areas. The moving loop is not a stationary perpendicular arrow.', 'La media cero puede resultar de áreas opuestas que se compensan. El bucle móvil no es una flecha perpendicular inmóvil.') : l('主要左室向量朝向 V6，产生较大的 R 波；V1 从另一侧看，主要为 S 波。', 'The main LV vector points towards V6, producing a large R; V1 sees it from the other side, mainly as S.', 'El vector principal del VI apunta a V6 y genera una R grande; V1 lo ve desde el lado opuesto, principalmente como S.'))} />}
    </div>
  </div>;
}
