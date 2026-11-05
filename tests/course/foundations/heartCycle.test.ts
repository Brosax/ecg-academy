import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { LANGS } from '../../../src/core/l10n';
import { loadHraGeometry } from '../../../src/lab/sim/geometry/hra/load';
import { buildEngineSync, type Engine } from '../../../src/lab/sim/engine';
import { CYCLE_CUES, CYCLE_FRAMES, cycleFrame, makeHeartCycle, type HeartCycle } from '../../../src/course/foundations/heartCycle';
import { FlowContextCache, flowAt } from '../../../src/lab/view3d/core/flowTiming';
import { FLOW_Q, FLOW_STATE_LEN } from '../../../src/lab/view3d/core/flowTypes';
import { VALVES } from '../../../src/lab/sim/types';

describe('one physiological cycle for the F1 heart, blood, impulse and narration',()=>{
  let engine:Engine,cycle:HeartCycle;
  beforeAll(async()=>{
    const geo=await loadHraGeometry(undefined,readFileSync(new URL('../../../src/lab/assets/heart-hra.bin',import.meta.url)));
    engine=buildEngineSync(geo);cycle=makeHeartCycle(engine);
  },30000);
  it('derives ordered teaching boundaries from the actual normal cycle',()=>{
    const c=cycle.truth;
    expect(cycle.knots).toEqual([c.pOn,c.mech.find(s=>s.phase==='atrialSystole')!.t0,c.qrsOn,c.valves.find(v=>v.id==='AORTIC')!.openMs,c.valves.find(v=>v.id==='AORTIC')!.closeMs,c.valves.find(v=>v.id==='MITRAL')!.openMs,Math.max(...c.segments.map(s=>s.t1))]);
    expect(cycle.previous?.pOn).toBeLessThan(c.pOn!);
    for(let i=1;i<cycle.knots.length;i++)expect(cycle.knots[i]).toBeGreaterThan(cycle.knots[i-1]);
  });
  it('maps a monotonic continuous explanation to physiological time and holds before the next beat',()=>{
    let prev=-Infinity;
    for(let i=0;i<=1000;i++){const f=cycleFrame(cycle,i/1000);expect(f.time).toBeGreaterThanOrEqual(prev);expect(f.phase).toBeGreaterThanOrEqual(0);expect(f.phase).toBeLessThan(6);prev=f.time;}
    for(let i=1;i<6;i++)expect(Math.abs(cycleFrame(cycle,i/6-1e-9).time-cycleFrame(cycle,i/6+1e-9).time)).toBeLessThan(.001);
    expect(cycleFrame(cycle,1).time).toBeLessThan(cycle.knots[6]);
    expect(engine.cycleAt(cycleFrame(cycle,1).time)?.aId).toBe(cycle.truth.aId);
    expect(cycleFrame(cycle,NaN)).toEqual(cycleFrame(cycle,0));
  });
  it('gives every key frame a matching translated explanation and actual mechanical phase',()=>{
    expect(CYCLE_FRAMES.map(p=>cycleFrame(cycle,p).phase)).toEqual([0,1,2,3,4,5]);
    for(const cue of CYCLE_CUES)for(const lang of LANGS){expect(cue.title[lang]).not.toBe('');expect(cue.text[lang].length).toBeGreaterThan(50);}
    for(const [i,name] of [[1,'atrialSystole'],[3,'ejection'],[4,'isovolumicRelaxation'],[5,'filling']] as const){
      const {time}=cycleFrame(cycle,CYCLE_FRAMES[i]);expect(cycle.truth.mech.some(s=>s.phase===name&&time>=s.t0&&time<s.t1),name).toBe(true);
    }
  });
  it('ejection has both outflows; isovolumic relaxation has no ventricular valve flow; refilling has inlet flow',()=>{
    const cache=new FlowContextCache(),out=new Float32Array(FLOW_STATE_LEN),gates={vf:false,af:false};
    const flow=(phase:number)=>{const {time}=cycleFrame(cycle,CYCLE_FRAMES[phase]);flowAt(cache.get(engine,time,cycle.knots[6]-cycle.knots[0]),time,gates,out);return Array.from(out.slice(FLOW_Q));};
    const ejection=flow(3);expect(ejection[2]).toBeGreaterThan(0);expect(ejection[3]).toBeGreaterThan(0);expect(ejection[0]).toBe(0);expect(ejection[1]).toBe(0);
    expect(flow(4)).toEqual([0,0,0,0]);
    const filling=flow(5);expect(filling[0]).toBeGreaterThan(0);expect(filling[1]).toBeGreaterThan(0);expect(filling[2]).toBe(0);expect(filling[3]).toBe(0);
    for(let i=0;i<100;i++){
      const {time}=cycleFrame(cycle,i/100);flowAt(cache.get(engine,time,cycle.knots[6]-cycle.knots[0]),time,gates,out);
      for(const [j,id] of VALVES.entries())if(id==='AORTIC'||id==='PULMONARY'){
        const ev=cycle.truth.valves.find(v=>v.id===id)!;if(time<ev.openMs||time>=ev.closeMs)expect(out[FLOW_Q+j]).toBe(0);
      }
    }
  });
  it('seeking backwards reproduces the same beat snapshots and flow, with no accumulating particle time',()=>{
    const cache=new FlowContextCache(),out=new Float32Array(FLOW_STATE_LEN);
    const sample=(p:number)=>{const {time}=cycleFrame(cycle,p);flowAt(cache.get(engine,time,cycle.knots[6]-cycle.knots[0]),time,{vf:false,af:false},out);return {time,snap:engine.activeBeats(time),flow:Array.from(out)};};
    const first=sample(.58);sample(.98);sample(.02);expect(sample(.58)).toEqual(first);
  });
});
