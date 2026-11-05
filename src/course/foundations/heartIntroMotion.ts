import { Data3DTexture, LinearFilter, Matrix3, RGBAFormat, UnsignedByteType, type BufferGeometry, type MeshStandardMaterial } from 'three';
import { l } from '../../core/l10n';
import type { GeometryBundle } from '../../lab/sim/types';
import { GLSL_BEATS, GLSL_GRID, GLSL_DISPLACEMENT } from '../../lab/view3d/shaders/chunks';
import { createSharedUniforms } from '../../lab/view3d/shaders/uniforms';
import { DEFAULT_AV_GAP_MS } from '../../lab/view3d/conductionTiming';
import { unit } from './heartIntroAnimation';
import { buildChamberWeights } from '../../lab/view3d/core/fieldTexture';

/** One illustrative normal cycle, slowed by the playback control. Not a haemodynamic measurement. */
export const PUMP_CYCLE_MS=800;
export const PUMP_FRAMES=[0,.14,.52,.67] as const;
export const PUMP_LABELS=[
  l('舒张与充盈','Relaxation & filling','Relajación y llenado'),
  l('心房收缩','Atrial contraction','Contracción auricular'),
  l('心室收缩','Ventricular contraction','Contracción ventricular'),
  l('心室舒张','Ventricular relaxation','Relajación ventricular'),
] as const;
export function pumpPhase(p:number) {p=unit(p);return p<.06||p>=.8?0:p<.22?1:p<.53?2:3;}
export function pumpTimes(progress:number) {const a=unit(progress)*PUMP_CYCLE_MS;return {atrial:a,ventricular:a-DEFAULT_AV_GAP_MS};}

/** Import the Lab's single displacement field verbatim. Both myocardium and great vessels use
 * the same local-mm deformation and pose transform; the anatomical surface is never scaled as a whole. */
export const INTRO_MOTION_DECL=`
attribute vec3 introRest;
uniform mat3 introRotation;
${GLSL_BEATS}
${GLSL_GRID}
${GLSL_DISPLACEMENT}
`;
const chamberCache=new WeakMap<GeometryBundle,Uint8Array>();
export function createIntroMotion(geo:GeometryBundle) {
  const u=createSharedUniforms();
  u.uContraction.value=0;
  u.uMechRef.value.set(0,40,200,250);
  let weights=chamberCache.get(geo);
  if(!weights){weights=buildChamberWeights(geo.grid);chamberCache.set(geo,weights);}
  const texture=new Data3DTexture(weights,...geo.grid.dims);
  texture.format=RGBAFormat;texture.type=UnsignedByteType;
  texture.minFilter=LinearFilter;texture.magFilter=LinearFilter;texture.unpackAlignment=1;texture.needsUpdate=true;
  u.uChamberTex.value=texture;
  u.uGridOrigin.value.fromArray(geo.grid.originMm).addScalar(-geo.grid.hMm/2);
  u.uGridSize.value.set(...geo.grid.dims).multiplyScalar(geo.grid.hMm);
  for(const ch of geo.chambers) {
    const i=ch.chamber-1;
    if(i<0||i>3)continue;
    u.uChamberCenter.value[i].fromArray(ch.centerMm);
    u.uChamberAxis.value[i].fromArray(ch.axis).normalize();
    u.uChamberRadius.value[i]=ch.radiusMm;
    u.uChamberLength.value[i]=ch.lengthMm;
  }
  const rotation={value:new Matrix3().set(...geo.pose.R)};
  return {
    attach(material:MeshStandardMaterial,geometry:BufferGeometry) {
      if(!geometry.hasAttribute('introRest'))throw new Error('Missing motion coordinates');
      material.onBeforeCompile=shader=>{
        Object.assign(shader.uniforms,u,{introRotation:rotation});
        shader.vertexShader=INTRO_MOTION_DECL+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
          vec4 introWeights=texture(uChamberTex,hvTexCoord(introRest));
          float introV=clamp(introWeights.z+introWeights.w,0.0,1.0);
          float introArrival=mix(uMechRef.x,uMechRef.y,introV);
          transformed += .1 * introRotation * heartDisplacement(introRest,introWeights,vec2(introArrival),250.0);`);
      };
      material.customProgramCacheKey=()=> 'foundation-pump-v2';
    },
    update(progress:number,amplitude:number) {
      const t=pumpTimes(progress);
      u.uContraction.value=unit(amplitude);
      u.uBeatA.value[0].set(t.atrial,0,1,1);
      u.uBeatV.value[0].set(t.ventricular,0,1,1);
    },
    dispose(){texture.dispose();},
  };
}
