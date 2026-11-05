/** One normal model cycle; teaching time is stretched, physiological event order is retained. */
import { l } from '../../core/l10n';
import type { CycleTruth, SimEngine } from '../../lab/sim/types';

export const HEART_CYCLE_DURATION = 10000;
export const CYCLE_CUES = [
  { title:l('电信号出发','The impulse starts','Comienza el impulso'), text:l('先看金色亮点：窦房结像起搏开关，发出电信号并传入心房。电信号是收缩的指令，不是血液；心肌收到指令后才开始收缩。','Follow the gold pulse: the sinus node starts an electrical impulse that spreads through the atria. Electricity is the instruction to contract, not moving blood; muscle responds after activation.','Sigue el pulso dorado: el nodo sinusal inicia un impulso que se propaga por las aurículas. La electricidad es la orden de contraerse, no sangre en movimiento; el músculo responde después de activarse.') },
  { title:l('心房推动血液','Atria push blood','Las aurículas impulsan sangre'), text:l('心房先收缩，把剩余的一部分血液推入心室。看红、蓝血流穿过房室瓣；同时电信号经过房室结的延迟，给心室留出充盈时间。','The atria contract first, adding the final part of ventricular filling through the open AV valves. Watch red and blue flow while the impulse is delayed at the AV node, giving the ventricles time to fill.','Las aurículas se contraen primero y completan parte del llenado ventricular a través de las válvulas AV abiertas. Observa los flujos rojo y azul mientras el impulso se retrasa en el nodo AV y da tiempo al llenado.') },
  { title:l('心室接到指令','Ventricles receive the impulse','El impulso llega a los ventrículos'), text:l('电信号沿传导束传入心室，心室肌随后开始挤压。房室瓣关闭后，出口瓣还要等压力升高才打开：心室开始用力，不等于血液已射出。','The impulse travels down the conduction system into the ventricles, then ventricular muscle begins to squeeze. After AV valves close, outlet valves wait for pressure to rise: starting contraction does not mean ejection has started.','El impulso baja por el sistema de conducción hasta los ventrículos, que comienzan a contraerse después. Tras cerrarse las válvulas AV, las de salida esperan a que suba la presión: contraerse no significa que ya se esté eyectando sangre.') },
  { title:l('心室射血','Ventricular ejection','Eyección ventricular'), text:l('出口瓣打开，两个心室同时射血：右心室把含氧较少的血液送往肺，左心室把含氧较多的血液送往全身。看血流、瓣膜和心壁一起变化；电恢复可在射血后段开始。','Outlet valves open and both ventricles eject together: the right sends oxygen-poor blood to the lungs, the left sends oxygen-rich blood to the body. Follow flow, valves and the moving wall together; electrical recovery can begin during late ejection.','Se abren las válvulas de salida y ambos ventrículos eyectan a la vez: el derecho envía sangre con menos oxígeno a los pulmones y el izquierdo sangre oxigenada al cuerpo. Observa juntos flujo, válvulas y pared; la recuperación eléctrica puede empezar al final de la eyección.') },
  { title:l('舒张，暂未充盈','Relaxation before filling','Relajación antes del llenado'), text:l('射血结束，出口瓣关闭；心室开始放松，压力下降。在房室瓣重新打开之前，心室的入口和出口都关闭，因此这段时间没有血液穿过心室瓣口。','Ejection ends and outlet valves close. The ventricles relax and pressure falls. Before the AV valves reopen, both inlet and outlet are closed, so no blood crosses the ventricular valves during this interval.','Termina la eyección y se cierran las válvulas de salida. Los ventrículos se relajan y baja la presión. Antes de abrirse las válvulas AV, entrada y salida están cerradas y no pasa sangre por las válvulas ventriculares.') },
  { title:l('重新充盈','Filling again','Nuevo llenado'), text:l('房室瓣重新打开，血液从心房流入放松的心室，为下一次跳动做准备。大部分正常充盈发生在心室放松时，不必等到心房再次收缩。','The AV valves reopen and blood flows from the atria into the relaxed ventricles, preparing the next beat. Most normal filling happens while the ventricles relax, before the next atrial contraction.','Se abren de nuevo las válvulas AV y la sangre pasa de las aurículas a los ventrículos relajados, preparando el siguiente latido. La mayor parte del llenado normal ocurre antes de la siguiente contracción auricular.') },
] as const;

export interface HeartCycle { readonly truth:CycleTruth; readonly previous:CycleTruth|null; readonly knots:readonly number[] }
export function makeHeartCycle(engine:Pick<SimEngine,'cycleAt'>):HeartCycle {
  // A settled beat includes the preceding relaxation/filling windows (no artificial start-up).
  const truth=engine.cycleAt(2400);
  if(!truth||truth.pOn===null||truth.qrsOn===null)throw new Error('Normal teaching cycle unavailable');
  const a=truth.mech.find(s=>s.phase==='atrialSystole');
  const out=truth.valves.find(v=>v.id==='AORTIC'), inlet=truth.valves.find(v=>v.id==='MITRAL');
  if(!a||!out||!inlet)throw new Error('Missing teaching valve events');
  const end=Math.max(...truth.segments.map(s=>s.t1));
  const knots=[truth.pOn,a.t0,truth.qrsOn,out.openMs,out.closeMs,inlet.openMs,end];
  if(knots.some((t,i)=>!Number.isFinite(t)||(i>0&&t<=knots[i-1])))throw new Error('Unordered teaching cycle');
  return {truth,previous:engine.cycleAt(truth.pOn-1),knots};
}
export function cycleFrame(cycle:HeartCycle,progress:number) {
  const p=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
  const scaled=p*CYCLE_CUES.length, phase=Math.min(CYCLE_CUES.length-1,Math.floor(scaled));
  const mix=scaled-phase;
  // Keep the final frame within this beat, rather than triggering the next SA impulse.
  const time=cycle.knots[phase]+(cycle.knots[phase+1]-cycle.knots[phase])*mix;
  return {phase,time:Math.min(time,cycle.knots[cycle.knots.length-1]-.001)};
}
/** Sample inside each phase so a key frame visibly demonstrates its action, rather than just its onset. */
export const CYCLE_FRAMES=CYCLE_CUES.map((_,i)=>(i+.45)/CYCLE_CUES.length);
