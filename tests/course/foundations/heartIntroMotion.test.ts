import { describe, expect, it } from 'vitest';
import { INTRO_MOTION_DECL, PUMP_CYCLE_MS, PUMP_FRAMES, PUMP_LABELS, pumpPhase, pumpTimes } from '../../../src/course/foundations/heartIntroMotion';
import { GLSL_DISPLACEMENT } from '../../../src/lab/view3d/shaders/chunks';
import { LANGS } from '../../../src/core/l10n';

describe('foundations heartbeat reuses the existing deformation',()=>{
  it('embeds the shared myocardium/vessel displacement unchanged, including thickening and base descent',()=>{
    expect(INTRO_MOTION_DECL.split(GLSL_DISPLACEMENT)).toHaveLength(2);
  });
  it('provides a complete reversible cycle with atrial activity before ventricular activity',()=>{
    expect(pumpTimes(0)).toEqual({atrial:0,ventricular:-130});
    expect(pumpTimes(1)).toEqual({atrial:PUMP_CYCLE_MS,ventricular:PUMP_CYCLE_MS-130});
    expect(pumpTimes(.5).atrial-pumpTimes(.5).ventricular).toBe(130);
    expect(pumpTimes(-1)).toEqual(pumpTimes(0));
    expect(pumpTimes(2)).toEqual(pumpTimes(1));
    expect(PUMP_FRAMES.map(pumpPhase)).toEqual([0,1,2,3]);
    expect(pumpPhase(.65)).toBe(3);
    for(const label of PUMP_LABELS)for(const lang of LANGS)expect(label[lang].length).toBeGreaterThan(0);
  });
});
