import { useEffect, useRef, useState } from 'preact/hooks';
import { l } from '../../core/l10n';
import { lt } from '../../i18n';
import { loadHraGeometry } from '../../lab/sim/geometry/hra/load';
import { loadHraBody } from '../../lab/sim/geometry/hra/body';
import type { ModelCredit } from '../../lab/sim/types';
import { HEART_INTRO, introStep, type HeartIntroMode } from './heartIntroModel';
import { HeartIntroView } from './heartIntroView';
import { createEngine } from '../../lab/sim/engine';
import { CYCLE_CUES, CYCLE_FRAMES, HEART_CYCLE_DURATION, cycleFrame, makeHeartCycle, type HeartCycle } from './heartCycle';
import { useStoryClock } from './clock';


// One immutable decoded model shared by F1 pages. No lab playback/settings subscriptions.
let assets: ReturnType<typeof loadAssets> | undefined;
async function loadAssets() {
  const [geo,body]=await Promise.all([loadHraGeometry(),loadHraBody()]);
  const engine=await createEngine(geo);
  return {engine,body,cycle:makeHeartCycle(engine)};
}
function anatomyAssets() {
  if(!assets) { assets=loadAssets(); assets.catch(()=>{assets=undefined;}); }
  return assets;
}

export function HeartIntroduction({mode}:{mode:HeartIntroMode}) {
  const [selection,setSelection]=useState<{mode:HeartIntroMode;step:number}>({mode,step:0});
  const step=selection.mode===mode?selection.step:0;
  const [speed,setSpeed]=useState(.5),[amplitude,setAmplitude]=useState(.8),[repeat,setRepeat]=useState(false);
  const [anatomyOpen,setAnatomyOpen]=useState(false);
  const [cycle,setCycle]=useState<HeartCycle|null>(null);
  const clock=useStoryClock(`heart:${mode}`,HEART_CYCLE_DURATION,false,{rate:speed,loop:repeat});
  const [cut,setCut]=useState(false), [depth,setDepth]=useState(.55);
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
  const [retry,setRetry]=useState(0), [credits,setCredits]=useState<readonly ModelCredit[]>([]);
  const canvas=useRef<HTMLCanvasElement>(null), tag=useRef<HTMLDivElement>(null), view=useRef<HeartIntroView|null>(null);
  const config=useRef({mode,step,cut,depth,amplitude,progress:clock.progress});config.current={mode,step,cut,depth,amplitude,progress:clock.progress};
  const item=introStep(mode,step);
  useEffect(()=>{
    let alive=true;
    setStatus('loading');
    anatomyAssets().then(({engine,body,cycle:loadedCycle})=>{
      if(!alive||!canvas.current||!tag.current)return;
      try {
        view.current=new HeartIntroView(canvas.current,tag.current,engine,body,loadedCycle,()=>setStatus('error'));
        const c=config.current;view.current.update(c.mode,c.step,c.cut,c.depth);view.current.animate(c.progress,c.amplitude);
        setCycle(loadedCycle);setCredits([...(engine.geometry.credits??[]),body.credit]);setStatus('ready');
      } catch {view.current?.dispose();view.current=null;setStatus('error');}
    },()=>{if(alive)setStatus('error');});
    return()=>{alive=false;view.current?.dispose();view.current=null;};
  },[retry]);
  useEffect(()=>{setCut(false);},[mode]);
  useEffect(()=>{
    try {view.current?.update(mode,step,cut,depth);}
    catch {clock.pause();setStatus('error');}
  },[mode,step,cut,depth]);
  useEffect(()=>{
    try {view.current?.animate(clock.progress,amplitude);}
    catch {clock.pause();setStatus('error');}
  },[clock.progress,amplitude]);
  useEffect(()=>{if(status!=='ready')clock.pause();},[status]);
  const change=(next:number)=>{clock.pause();setSelection({mode,step:next});};
  const phase=cycle?cycleFrame(cycle,clock.progress).phase:0;
  const play=()=>clock.reduced?clock.seek(CYCLE_FRAMES.find(p=>p>clock.progress+.001)??0):clock.playing?clock.pause():clock.play();
  return <section class="fd-heart-intro fd-heart-unified" onKeyDown={e=>e.stopPropagation()} aria-label={lt(l('认识立体心脏','Meet the heart in 3D','Conoce el corazón en 3D'))}>
    <div class="fd-heart-top"><span>3D · {lt(l('同一颗心脏，一起看懂','ONE HEART, ONE CONNECTED CYCLE','UN CORAZÓN, UN CICLO CONECTADO'))}</span><span>{phase+1} / {CYCLE_CUES.length}</span></div>
    <div class="fd-heart-legend"><span>{lt(l('金色 · 电信号','Gold · electrical impulse','Dorado · impulso eléctrico'))}</span><span>{lt(l('红 / 蓝 · 血液','Red / blue · blood','Rojo / azul · sangre'))}</span><span>{lt(l('心壁 · 收缩与舒张','Wall · contraction & relaxation','Pared · contracción y relajación'))}</span></div>
    <div class="fd-heart-stage">
    <div class="fd-heart-canvas-wrap" onPointerDown={clock.pause}>
      <canvas key={retry} ref={canvas} class="fd-heart-canvas" tabIndex={status==='ready'?0:-1} role="img" aria-label={lt(l('可旋转的心脏模型。方向键旋转，加减键缩放，Home 复位。也可使用下方按钮。','Rotatable heart model. Arrow keys rotate, plus/minus zoom, Home resets. Buttons below provide the same actions.','Modelo giratorio. Flechas para girar, más/menos para ampliar, Inicio para restablecer. También puedes usar los botones.'))} onKeyDown={e=>{
        if(e.ctrlKey||e.metaKey||e.altKey)return;
        clock.pause();
        const v=view.current; if(!v)return;
        if(e.key==='ArrowLeft')v.rotate(-.2);else if(e.key==='ArrowRight')v.rotate(.2);else if(e.key==='ArrowUp')v.rotate(0,-.15);else if(e.key==='ArrowDown')v.rotate(0,.15);else if(e.key==='+'||e.key==='=')v.zoom(.85);else if(e.key==='-')v.zoom(1.18);else if(e.key==='Home')v.reset();else return;
        e.preventDefault();e.stopPropagation();
      }}/>
      <div class="fd-heart-tag" ref={tag} hidden={status!=='ready'||!anatomyOpen}>{lt(item.title)}</div>
      {status!=='ready'&&<div class="fd-heart-status" role="status">{lt(status==='loading'?l('正在准备已有的 3D 心脏…','Preparing the existing 3D heart…','Preparando el corazón 3D existente…'):l('3D 暂时无法显示。下方的部位说明仍可逐步阅读，也可以查看二维关系图。','3D is unavailable. You can still explore the descriptions and the relationship diagram below.','El 3D no está disponible. Puedes seguir las explicaciones y el esquema inferior.'))}{status==='error'&&<button type="button" class="fd-choice" onClick={()=>setRetry(v=>v+1)}>{lt(l('重试 3D','Retry 3D','Reintentar 3D'))}</button>}</div>}
    </div>
    <div class="fd-heart-cycle-panel">
      <div class="fd-heart-cycle-heading" aria-live="polite"><span>{String(phase+1).padStart(2,'0')}</span><div class="fd-heart-cycle-title"><strong>{lt(CYCLE_CUES[phase].title)}</strong>{CYCLE_CUES.map(c=><strong class="fd-heart-caption-reserve" aria-hidden="true">{lt(c.title)}</strong>)}</div></div>
      <div class="fd-heart-caption-copy fd-heart-cycle-copy"><p aria-live="polite">{lt(CYCLE_CUES[phase].text)}</p>{CYCLE_CUES.map(c=><p class="fd-heart-caption-reserve" aria-hidden="true">{lt(c.text)}</p>)}</div>
      <div class="fd-heart-transport">
        <button type="button" class="fd-choice" disabled={status!=='ready'||phase===0} onClick={()=>clock.seek(CYCLE_FRAMES[phase-1])}>{lt(l('上一阶段','Previous phase','Fase anterior'))}</button>
        <button type="button" class="fd-next" disabled={status!=='ready'} onClick={play}>{lt(clock.reduced?l('下一关键帧','Next key frame','Siguiente fotograma'):clock.playing?l('暂停','Pause','Pausar'):clock.progress>0&&clock.progress<1?l('继续播放','Continue','Continuar'):l('开始同步演示','Start linked demonstration','Iniciar demostración conjunta'))}</button>
        <button type="button" class="fd-choice" disabled={status!=='ready'} onClick={()=>clock.reduced?clock.seek(0):clock.play(true)}>{lt(l('从头重播','Replay from start','Repetir desde el inicio'))}</button>
      </div>
      <label class="fd-heart-seek"><span>{lt(l('心动周期位置','Cycle position','Posición del ciclo'))}</span><input type="range" min="0" max="100" step=".1" value={clock.progress*100} disabled={status!=='ready'} aria-valuetext={lt(CYCLE_CUES[phase].title)} onPointerDown={clock.pause} onKeyDown={clock.pause} onInput={e=>clock.seek(Number(e.currentTarget.value)/100)}/><output aria-hidden="true">{Math.round(clock.progress*100)}%</output></label>
      <div class="fd-heart-adjust">
        <label>{lt(l('播放速度','Playback speed','Velocidad de reproducción'))}<select value={speed} disabled={clock.reduced} onChange={e=>setSpeed(Number(e.currentTarget.value))}>{[.25,.5,1,2].map(value=><option value={value}>{value}×</option>)}</select></label>
        <label>{lt(l('形变幅度','Motion amplitude','Amplitud del movimiento'))}<input type="range" min="0" max="100" step="5" value={Math.round(amplitude*100)} disabled={status!=='ready'} onInput={e=>setAmplitude(Number(e.currentTarget.value)/100)}/><output>{Math.round(amplitude*100)}%</output></label>
      </div>
      <label class="fd-heart-repeat"><input type="checkbox" checked={repeat} disabled={clock.reduced} onChange={e=>setRepeat(e.currentTarget.checked)}/>{lt(l('连续演示整个周期','Repeat the whole cycle','Repetir el ciclo completo'))}</label>
      {clock.reduced&&<p class="fd-heart-hint">{lt(l('减少动画已开启：通过阶段按钮或滑块，同步查看心壁、血流与电信号的关键帧。','Reduced motion: use phase buttons or the slider to inspect linked key frames of the wall, flow and impulse.','Movimiento reducido: usa las fases o la barra para observar fotogramas conjuntos de pared, flujo e impulso.'))}</p>}
    </div>
    </div>
    <div class="fd-heart-cycle-steps" aria-label={lt(l('心动周期阶段','Cardiac cycle phases','Fases del ciclo cardíaco'))}>{CYCLE_FRAMES.map((p,i)=><button type="button" class="fd-choice" disabled={status!=='ready'} aria-pressed={phase===i} onClick={()=>clock.seek(p)}><span>{i+1}</span>{lt(CYCLE_CUES[i].title)}</button>)}</div>
    <div class="fd-heart-tools" onClick={clock.pause} aria-label={lt(l('模型操作','Model controls','Controles del modelo'))}>
      <button type="button" class="fd-choice" disabled={status!=='ready'} onClick={()=>view.current?.rotate(-.3)}>{lt(l('向左转','Rotate left','Girar a la izquierda'))}</button>
      <button type="button" class="fd-choice" disabled={status!=='ready'} onClick={()=>view.current?.rotate(.3)}>{lt(l('向右转','Rotate right','Girar a la derecha'))}</button>
      <button type="button" class="fd-choice" disabled={status!=='ready'} onClick={()=>view.current?.zoom(.82)} aria-label={lt(l('放大模型','Zoom in','Acercar'))}>＋</button>
      <button type="button" class="fd-choice" disabled={status!=='ready'} onClick={()=>view.current?.zoom(1.22)} aria-label={lt(l('缩小模型','Zoom out','Alejar'))}>−</button>
      <button type="button" class="fd-choice" disabled={status!=='ready'} onClick={()=>view.current?.reset()}>{lt(l('复位视角','Reset view','Restablecer vista'))}</button>
      <button type="button" class="fd-choice" disabled={status!=='ready'} aria-pressed={cut} onClick={()=>setCut(!cut)}>{lt(l('剖开观察内部','Cut away the front','Cortar la parte anterior'))}</button>
    </div>
    {cut&&<label class="fd-heart-cut">{lt(l('剖切深度','Cut depth','Profundidad del corte'))}<input type="range" min="15" max="90" value={depth*100} onInput={e=>{clock.pause();setDepth(Number(e.currentTarget.value)/100);}}/></label>}
    <p class="fd-heart-hint">{lt(l('拖动可旋转。前面、后面都看看；左右始终以患者本人为准。','Drag to rotate. Look from front and back; left and right always refer to the patient.','Arrastra para girar. Observa delante y detrás; los lados siempre se refieren al paciente.'))}</p>
    <details class="fd-heart-anatomy" onToggle={e=>setAnatomyOpen(e.currentTarget.open)}><summary>{lt(l('认识当前章节的部位','Explore this chapter’s anatomy','Explora la anatomía de este capítulo'))}</summary>
    <div class="fd-heart-choices">{HEART_INTRO[mode].map((s,i)=><button type="button" class="fd-choice" aria-pressed={step===i} onClick={()=>change(i)}>{lt(s.title)}</button>)}</div>
    <div class="fd-heart-description" aria-live="polite"><strong>{lt(item.title)}</strong><p>{lt(item.description)}</p></div></details>
    <p class="fd-heart-note">{lt(l('三个过程始终同屏。金色是电信号；红、蓝表示含氧较多、较少的血液，蓝色只是示意。每个阶段均慢放以便观察，并非真实时长；形变幅度只控制显示效果，不代表心脏功能。','All three processes stay visible. Gold marks electricity; red and blue represent oxygen-rich and oxygen-poor blood (blue is schematic). Each phase is slowed for observation, not shown at real duration. Motion amplitude changes only the display, not cardiac function.','Los tres procesos permanecen visibles. El dorado indica electricidad; rojo y azul representan sangre con más y menos oxígeno (el azul es esquemático). Cada fase se ralentiza para observarla; no representa su duración real. La amplitud solo cambia la visualización, no la función cardíaca.'))}</p>
    <details class="fd-basic-sources"><summary>{lt(l('模型来源与许可','Model sources & licences','Fuentes y licencias del modelo'))}</summary><ul>{credits.map(c=><li><a href={c.url} target="_blank" rel="noopener noreferrer">{c.title}</a> · {c.authors} · {c.license}</li>)}</ul><p>{lt(l('教学呈现：重新着色、局部高亮、透明与可选剖切；传导线及血流路径是已有模型的示意路径。','Teaching presentation: recolouring, selective highlighting, transparency and optional clipping. Conduction and flow lines reuse the existing model’s schematic paths.','Presentación didáctica: recoloración, resaltado, transparencia y corte opcional. Las líneas reutilizan las rutas esquemáticas del modelo existente.'))}</p></details>
  </section>;
}
