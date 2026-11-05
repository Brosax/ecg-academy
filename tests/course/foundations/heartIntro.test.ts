import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { LANGS } from '../../../src/core/l10n';
import { loadHraGeometry } from '../../../src/lab/sim/geometry/hra/load';
import { localToApp } from '../../../src/lab/sim/frame';
import { CHAMBER, type GeometryBundle } from '../../../src/lab/sim/types';
import { buildFlowNetwork } from '../../../src/lab/view3d/core/vesselPaths';
import { FOUNDATION_BASICS } from '../../../src/course/foundations/basics';
import { HEART_INTRO, introChambers, introStep } from '../../../src/course/foundations/heartIntroModel';
import { HEART_CUES, HEART_KEYFRAMES, electricalTime, flowLegProgress, heartCueIndex, introActivation, sampleArrival } from '../../../src/course/foundations/heartIntroAnimation';

describe('F1 reuses the actual Heart Lab anatomy',()=>{
  let geo:GeometryBundle;
  beforeAll(async()=>{geo=await loadHraGeometry(undefined,readFileSync(new URL('../../../src/lab/assets/heart-hra.bin',import.meta.url)));});
  it('links four distinct chambers to labelled mesh surfaces in patient coordinates',()=>{
    const ids=introChambers(geo), sums=new Map<number,{x:number;n:number}>();
    expect(ids.length).toBe(geo.mesh.position.length/3);
    for(let v=0;v<ids.length;v++){
      const id=ids[v], s=sums.get(id)??{x:0,n:0};
      const p=localToApp(geo.pose,[geo.mesh.position[v*3],geo.mesh.position[v*3+1],geo.mesh.position[v*3+2]]);
      s.x+=p[0];s.n++;sums.set(id,s);
    }
    for(const id of [CHAMBER.RA,CHAMBER.RV,CHAMBER.LA,CHAMBER.LV])expect(sums.get(id)!.n).toBeGreaterThan(100);
    // Patient-left x increases; a left/right flip in the transform or highlight map must fail.
    expect(sums.get(CHAMBER.LA)!.x/sums.get(CHAMBER.LA)!.n).toBeGreaterThan(sums.get(CHAMBER.RA)!.x/sums.get(CHAMBER.RA)!.n);
    expect(sums.get(CHAMBER.LV)!.x/sums.get(CHAMBER.LV)!.n).toBeGreaterThan(sums.get(CHAMBER.RV)!.x/sums.get(CHAMBER.RV)!.n);
    const original=geo.grid.chamber[geo.mesh.voxel[0]];ids[0]=255;
    expect(geo.grid.chamber[geo.mesh.voxel[0]]).toBe(original);
  });
  it('every blood-route choice has an existing cardiac and vessel path, and every conduction choice exists',()=>{
    const network=buildFlowNetwork(geo);
    expect(HEART_INTRO.flow.map(s=>s.valve)).toEqual(['TRICUSPID','PULMONARY','MITRAL','AORTIC']);
    for(const step of HEART_INTRO.flow) {
      expect(network.heart.some(p=>p.valve===step.valve&&p.pts.length>2)).toBe(true);
      expect(network.vessels.some(p=>p.valve===step.valve&&p.pts.length>2)).toBe(true);
    }
    for(const step of HEART_INTRO.electrical) for(const id of step.structures??[])
      expect(geo.paths.some(p=>p.id===id&&p.pointsMm.length>0)||!!geo.landmarks[id],id).toBe(true);
  });
  it('teaches position, chambers, circulation and then electrical activity with explicit three-language descriptions',()=>{
    expect(FOUNDATION_BASICS.f1.filter(p=>p.heart).map(p=>p.heart)).toEqual(['position','chambers','flow','electrical']);
    for(const steps of Object.values(HEART_INTRO))for(const step of steps)for(const lang of LANGS){
      expect(step.title[lang].length).toBeGreaterThan(0);expect(step.description[lang].length).toBeGreaterThan(0);
    }
    expect(introStep('flow',99)).toBe(HEART_INTRO.flow[3]);
    expect(introStep('flow',-2)).toBe(HEART_INTRO.flow[0]);
  });
  it('moves venous blood into the atrium before the AV leg, and ventricular blood before the arterial leg',()=>{
    for(const inflow of [true,false]) {
      const firstVessel=inflow;
      expect(flowLegProgress(0,firstVessel,inflow)).toBe(0);
      expect(flowLegProgress(.225,firstVessel,inflow)).toBeCloseTo(.5);
      expect(flowLegProgress(.225,!firstVessel,inflow)).toBe(0);
      expect(flowLegProgress(.45,firstVessel,inflow)).toBe(1);
      expect(flowLegProgress(.45,!firstVessel,inflow)).toBe(0);
      expect(flowLegProgress(.725,!firstVessel,inflow)).toBeCloseTo(.5);
      expect(flowLegProgress(1,!firstVessel,inflow)).toBe(1);
      // Seeking backward is deterministic; no accumulated particle state or cyclic wrap.
      expect(flowLegProgress(.225,!firstVessel,inflow)).toBe(0);
    }
  });
  it('uses the same existing arrival field for progressive myocardial activation and preserves AV separation',()=>{
    const field=introActivation(geo);
    expect(introActivation(geo)).toBe(field);
    expect(field.atrial.length).toBe(geo.mesh.voxel.length);
    const counts=(step:number,p:number)=>{
      const t=electricalTime(step,p,field);
      return [field.atrial.filter(x=>x<=t.atrial).length,field.ventricular.filter(x=>x<=t.ventricular).length];
    };
    expect(counts(0,1)).toEqual([0,0]);
    const a0=counts(1,0),a1=counts(1,.5),a2=counts(1,1);
    expect(a0).toEqual([0,0]);expect(a1[0]).toBeGreaterThan(0);expect(a1[0]).toBeLessThan(a2[0]);expect(a2[1]).toBe(0);
    for(const p of HEART_KEYFRAMES)expect(counts(2,p)).toEqual(a2);
    const v0=counts(3,0),v1=counts(3,.5),v2=counts(3,1);
    expect(v0).toEqual(a2);expect(v1[1]).toBeGreaterThan(0);expect(v1[1]).toBeLessThan(v2[1]);
    expect(counts(3,0)).toEqual(v0);
    for(const id of ['HIS','LBB','RBB'] as const) {
      const times=field.paths.get(id)!;
      expect(times.length).toBeGreaterThan(1);
      expect(times.every(Number.isFinite)).toBe(true);
      expect(times[times.length-1]).toBeGreaterThan(times[0]);
    }
    for(let i=0;i<geo.mesh.voxel.length;i++) {
      const chamber=geo.grid.chamber[geo.mesh.voxel[i]];
      if(chamber===CHAMBER.LA||chamber===CHAMBER.RA)expect(Number.isFinite(field.ventricular[i])).toBe(false);
      if(chamber===CHAMBER.LV||chamber===CHAMBER.RV)expect(Number.isFinite(field.atrial[i])).toBe(false);
    }
  },20000);
  it('every dynamic segment has translated start, transition and held-result captions',()=>{
    for(const mode of ['flow','electrical'] as const) {
      expect(HEART_CUES[mode].length).toBe(HEART_INTRO[mode].length);
      for(const cues of HEART_CUES[mode])for(const p of HEART_KEYFRAMES)for(const lang of LANGS)
        expect(cues[heartCueIndex(p)][lang].trim().length).toBeGreaterThan(0);
    }
    expect(heartCueIndex(.44)).toBe(0);expect(heartCueIndex(.45)).toBe(1);expect(heartCueIndex(1)).toBe(2);
  });
  it('samples cable arrival by arc length even when vertices are unevenly spaced',()=>{
    expect(sampleArrival([0,1,10],[0,2,20],10)).toBeCloseTo(5);
    expect(sampleArrival([0,1,10],[0,2,20],20)).toBe(10);
    expect(sampleArrival([0,Infinity],[0,2],1)).toBe(Infinity);
  });
});
