import { l, type L10n } from '../../core/l10n';
import { buildAtrialActivation, buildVentricularActivation } from '../../lab/sim/conduction/graph';
import { DEFAULT_ENGINE_PARAMS } from '../../lab/sim/conduction/params';
import { closestOnPolyline, nearestVoxel, polylineArc } from '../../lab/sim/conduction/gridUtil';
import { CHAMBER, type GeometryBundle, type StructureId } from '../../lab/sim/types';
import type { HeartIntroMode } from './heartIntroModel';

export const HEART_DEMO_DURATION = 7000;
export const HEART_KEYFRAMES = [0, .5, 1] as const;
export const unit = (p: number) => Math.max(0, Math.min(1, Number.isFinite(p) ? p : 0));
export const spanProgress = (p: number, start: number, end: number) => unit((p - start) / (end - start));
export const isHeartDemo = (mode: HeartIntroMode): mode is 'flow' | 'electrical' => mode === 'flow' || mode === 'electrical';

/** Sample by physical arc, not vertex index: unequal path sampling must not change propagation speed. */
export function sampleArrival(times: readonly number[], arc: readonly number[], distance: number): number {
  if (!times.length) return Infinity;
  let hi=1;
  while(hi<arc.length-1&&arc[hi]<distance)hi++;
  if(times.length===1)return times[0];
  const a=times[hi-1],b=times[hi];
  if(!Number.isFinite(a)||!Number.isFinite(b))return Infinity;
  const u=unit((distance-arc[hi-1])/Math.max(1e-9,arc[hi]-arc[hi-1]));
  return a+(b-a)*u;
}

/** Teaching time, not fluid velocity. Venous streams finish at the atrium before the AV leg;
 * arterial streams start only after the ventricular/outflow leg. No repeating particles or teleporting loop. */
export function flowLegProgress(p: number, vessel: boolean, inflow: boolean): number {
  const first = vessel === inflow;
  return spanProgress(unit(p), first ? 0 : .45, first ? .45 : 1);
}

type Cues = readonly [L10n, L10n, L10n];
export const HEART_CUES: Record<'flow' | 'electrical', readonly Cues[]> = {
  flow: [
    [l('先看蓝色起点：血液从身体沿腔静脉回来。','Start at the blue markers: blood returns from the body through the venae cavae.','Empieza en las marcas azules: la sangre vuelve del cuerpo por las venas cavas.'),l('血液到达右心房，再经过三尖瓣进入右心室。','Blood reaches the right atrium, then passes through the tricuspid valve into the right ventricle.','La sangre llega a la aurícula derecha y cruza la tricúspide hacia el ventrículo derecho.'),l('现在停在右心室。下一段看它如何流向肺部。','Hold at the right ventricle. Next, follow the route toward the lungs.','Nos detenemos en el ventrículo derecho. Después seguimos hacia los pulmones.')],
    [l('从右心室出发，沿流出道走向肺动脉瓣。','Start in the right ventricle and follow the outflow tract toward the pulmonary valve.','Desde el ventrículo derecho, sigue el tracto de salida hacia la válvula pulmonar.'),l('经过肺动脉瓣，进入肺动脉并沿分支前进。','Cross the pulmonary valve and advance along the pulmonary artery branches.','Cruza la válvula pulmonar y avanza por las ramas de la arteria pulmonar.'),l('接下来是肺部气体交换；肺没有画在这个局部模型里。','Gas exchange follows in the lungs, which are outside this local model.','Después se intercambian gases en los pulmones, fuera de este modelo local.')],
    [l('从肺部回来的血液，沿肺静脉进入左心房。','Blood returning from the lungs enters the left atrium through pulmonary veins.','La sangre vuelve de los pulmones por las venas pulmonares a la aurícula izquierda.'),l('到达左心房后，经过二尖瓣进入左心室。','After reaching the left atrium, blood passes through the mitral valve into the left ventricle.','Desde la aurícula izquierda, cruza la mitral hacia el ventrículo izquierdo.'),l('现在停在左心室。下一段看它如何把血送向身体。','Hold at the left ventricle. Next, see the route toward the body.','Nos detenemos en el ventrículo izquierdo. Después seguimos hacia el cuerpo.')],
    [l('从左心室出发，沿流出道走向主动脉瓣。','Start in the left ventricle and follow the outflow tract toward the aortic valve.','Desde el ventrículo izquierdo, sigue el tracto de salida hacia la válvula aórtica.'),l('经过主动脉瓣，血液进入主动脉。','Blood crosses the aortic valve and enters the aorta.','La sangre cruza la válvula aórtica y entra en la aorta.'),l('沿主动脉送往全身。左右心实际协调工作，这四段只是逐段跟踪路线。','The aorta carries blood to the body. Both sides work together; these four scenes simply follow the route.','La aorta lleva sangre al cuerpo. Ambos lados trabajan coordinados; estas escenas solo siguen la ruta.')],
  ],
  electrical: [
    [l('先找到右心房上方的窦房结：正常心跳的起点。','Locate the sinus node high in the right atrium: the usual starting point.','Localiza el nodo sinusal en la parte superior de la aurícula derecha: el inicio habitual.'),l('亮点沿窦房结展开：一次电激动开始了。','The bright marker advances along the sinus node: an activation begins.','La marca brillante recorre el nodo sinusal: comienza una activación.'),l('电激动即将进入心房肌。这里移动的是激活标记，不是血液。','Activation is ready to spread into atrial muscle. The moving marker represents activation, not blood.','La activación va a extenderse al músculo auricular. La marca representa activación, no sangre.')],
    [l('从窦房结附近开始，让激动进入心房肌。','Begin near the sinus node as activation enters atrial muscle.','Comienza cerca del nodo sinusal cuando la activación entra en el músculo auricular.'),l('已到达的心肌变亮；激动也沿房间连接传播到左心房。','Reached muscle lights up; activation also spreads toward the left atrium through the interatrial connection.','El músculo alcanzado se ilumina; la activación también llega a la aurícula izquierda por la conexión interauricular.'),l('两个心房的激活展开了，对应之后认识的 P 波；它们不会整块同时亮起。','Activation has spread through both atria, relating to the P wave introduced later. They do not activate as two solid blocks.','La activación se ha extendido por ambas aurículas y se relaciona con la onda P. No se activan como bloques simultáneos.')],
    [l('来到房室结。心房已被激活，心室还没有开始。','Arrive at the AV node. The atria have been activated; the ventricles have not started.','Llegamos al nodo AV. Las aurículas ya se han activado; los ventrículos aún no.'),l('这里传导较慢：亮点仍在房室结附近，心室保持暗色。','Conduction is slower here: the marker remains near the AV node while the ventricles stay dark.','Aquí la conducción es más lenta: la marca sigue cerca del nodo AV y los ventrículos permanecen oscuros.'),l('离开房室结，接到希氏束。下一段再看信号如何分配到心室。','Leave the AV node and reach the His bundle. Next, follow distribution into the ventricles.','Salimos del nodo AV hacia el haz de His. Después seguimos la distribución ventricular.')],
    [l('从希氏束进入左右束支。观察亮点沿既有传导束前进。','From the His bundle, enter the left and right bundle branches. Follow the markers along the conduction paths.','Desde el haz de His entramos en ambas ramas. Sigue las marcas por las vías de conducción.'),l('激动经过束支和浦肯野系统，到达心室肌；到达处逐渐变亮。','Activation passes through the branches and Purkinje system to ventricular muscle, which lights as it is reached.','La activación llega por las ramas y el sistema de Purkinje al músculo ventricular, que se ilumina al ser alcanzado.'),l('心室激活完成，对应 QRS。亮色保留来显示已到达区域，不代表持续通电或肌肉收缩。','Ventricular activation is complete, corresponding to QRS. Held colour marks reached tissue, not sustained activation or contraction.','Se completa la activación ventricular, correspondiente al QRS. El color conserva las zonas alcanzadas; no indica activación sostenida ni contracción.')],
  ],
};

export function heartCueIndex(progress: number): number { return progress >= 1 ? 2 : progress >= .45 ? 1 : 0; }

/** Reuse the existing normal activation solver on the existing anatomy, without constructing a Lab
 * engine, rhythm, ECG projector or store. Keep original ms internally; the lesson stretches each segment. */
export function buildIntroActivation(geo: GeometryBundle) {
  const a = buildAtrialActivation(geo, DEFAULT_ENGINE_PARAMS);
  const v = buildVentricularActivation(geo, DEFAULT_ENGINE_PARAMS);
  const atrial = Float32Array.from(geo.mesh.voxel, voxel => a.field.tAct[voxel]);
  const ventricular = Float32Array.from(geo.mesh.voxel, voxel => v.field.tAct[voxel]);
  const paths = new Map<StructureId, readonly number[]>();
  for (const path of [...a.paths, ...v.paths]) {
    const display=geo.paths.find(p=>p.id===path.id);
    if(!display)continue;
    const arc=polylineArc(path.pointsMm).cum;
    paths.set(path.id,display.pointsMm.map(p=>sampleArrival(path.tMs,arc,closestOnPolyline(path.pointsMm,p).arcMm)));
  }
  // The display Purkinje polylines sample the existing ventricular arrival field; they do not invent
  // another activation clock. Bundle polylines use the solver's actual point-by-point cable timings.
  for (const path of geo.paths) if (path.id === 'PURKINJE_LV' || path.id === 'PURKINJE_RV') {
    const chamber = path.id === 'PURKINJE_LV' ? CHAMBER.LV : CHAMBER.RV;
    paths.set(path.id, path.pointsMm.map(p => {
      const near = nearestVoxel(geo.grid, p, voxel => geo.grid.chamber[voxel] === chamber && Number.isFinite(v.field.tAct[voxel]), 8);
      return near.voxel >= 0 ? v.field.tAct[near.voxel] : Infinity;
    }));
  }
  return { atrial, ventricular, paths, atrialEnd: a.field.tMaxMs, ventricularEnd: v.field.tMaxMs };
}
export type IntroActivation = ReturnType<typeof buildIntroActivation>;
const activationCache = new WeakMap<GeometryBundle, IntroActivation>();
export function introActivation(geo: GeometryBundle): IntroActivation {
  let result = activationCache.get(geo);
  if (!result) { result = buildIntroActivation(geo); activationCache.set(geo, result); }
  return result;
}
export function electricalTime(step: number, progress: number, field: Pick<IntroActivation, 'atrialEnd' | 'ventricularEnd'>) {
  const p = unit(progress);
  return {
    atrial: step === 0 ? -1 : step === 1 ? p * (field.atrialEnd + 1) - .5 : field.atrialEnd + 1,
    ventricular: step < 3 ? -1 : p * (field.ventricularEnd + 1) - .5,
  };
}
