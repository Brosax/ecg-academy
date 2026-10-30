/**
 * One set of IUniform objects referenced by every heart-attached material, so the per-frame CPU update is a handful of
 * component writes (no allocation, no per-material copies). Names follow the GPU contract (UNIFORM in gpuContract.ts);
 * extra internal uniforms are prefixed the same way.
 */
import { Color, Vector3, Vector4 } from 'three';
import type { Data3DTexture, IUniform } from 'three';
import { AF_MAX_ROTORS } from '../../sim/source/afField';
import { VF_MAX_ROTORS } from '../../sim/source/vfField';
import { MAX_HIGHLIGHT } from '../gpuContract';

export function createSharedUniforms() {
  const v4 = () => new Vector4(0, 0, 1, 0);
  const v3x4 = () => [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  return {
    // beats (contract)
    uBeatA: { value: [v4(), v4()] },
    uBeatV: { value: [v4(), v4()] },
    uApTauUp: { value: 2.5 },
    uApTauRepV: { value: 15 },
    uApTauRepA: { value: 40 },
    // AF rotor field (engine.afFrame → AfModel.pack layout, 5 vec4 per rotor)
    uAfOn: { value: 0 },
    uAfN: { value: 0 },
    uAf: { value: Array.from({ length: AF_MAX_ROTORS * 5 }, () => new Vector4()) },
    // ventricular scroll-wave field (engine.vfFrame → VfModel.pack layout + run header; VF / torsades)
    uVfOn: { value: 0 },
    uVfN: { value: 0 },
    uVf: { value: Array.from({ length: VF_MAX_ROTORS * 5 }, () => new Vector4()) },
    uVfRun: { value: [new Vector4(), new Vector4()] },
    // clipping / contraction / highlight (contract)
    uRestClip: { value: new Vector4(0, 0, 1, 1e6) },
    uClipOn: { value: 0 },
    uContraction: { value: 1 },
    uHighlight: { value: new Float32Array(MAX_HIGHLIGHT).fill(-1) },
    uHighlightMix: { value: 0 },
    // contraction field (contract: order LA, RA, LV, RV) + internal extras
    uChamberCenter: { value: v3x4() },
    uChamberAxis: { value: v3x4() },
    uChamberRadius: { value: new Float32Array(4) },
    uChamberLength: { value: new Float32Array(4).fill(1) },
    uMechRef: { value: new Vector4(50, 50, 200, 250) },
    uBaseDescentMm: { value: 13 },
    // voxel textures (contract) + internal chamber membership
    uFieldTex: { value: null as Data3DTexture | null },
    uLabelTex: { value: null as Data3DTexture | null },
    uChamberTex: { value: null as Data3DTexture | null },
    uGridOrigin: { value: new Vector3() },
    uGridSize: { value: new Vector3(1, 1, 1) },
    // colour language (theme tokens, linear-sRGB)
    uColRest: { value: new Color() },
    uColAtrial: { value: new Color() },
    uColQrs: { value: new Color() },
    uColRepol: { value: new Color() },
    uColFront: { value: new Color(1, 1, 1) },
    uColRing: { value: new Color() },
    uColVessel: { value: new Color() },
    uColDead: { value: new Color(0.35, 0.35, 0.35) },
    uColBlood: { value: new Color() },
    uColHighlight: { value: new Color() },
    uColConduction: { value: new Color() },
    uColPulse: { value: new Color() },
    uColArrowRest: { value: new Color() },
  } satisfies Record<string, IUniform>;
}

export type SharedUniforms = ReturnType<typeof createSharedUniforms>;
