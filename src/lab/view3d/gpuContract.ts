/**
 * FROZEN CONTRACT — GPU data layout shared by the heart material and the slice plane.
 *
 * Attributes (render mesh, static; re-uploaded only when engine.onChange fires):
 *   aTAct0, aTAct1 : float  activation time (ms, rel. to the beat event) from engine.fields slot 0 / slot 1 of the
 *                           vertex's compartment; 1e9 when not activated / no slot-1 field.
 *   aApdRef        : float  reference APD (ms); the shader multiplies by the beat's apdScale.
 *   aWallDepth     : float  0 endo … 1 epi (septum: 0 LV side … 1 RV side).
 *   aTissue        : float  TISSUE code (exact integer stored as float).
 *   aRegion        : float  index into STRUCTURES (255 = none) — for highlighting.
 *   aAha           : float  AHA segment (0 = none).
 *   restPos        : vec3   = position (rest pose, local mm) — used for rest-space clipping and the displacement field.
 *
 * Uniforms (per frame, computed on the CPU in float64 from engine.activeBeats(t)):
 *   uBeatA[2], uBeatV[2] : vec4(sinceMs, slot, apdScale, active)  most recent beat first.
 *   uRestClip            : vec4(n.xyz, d) in the LOCAL frame; discard fragments with dot(restPos, n) > d when uClipOn = 1.
 *   uClipOn              : float
 *   uContraction         : float 0..1 (store.layers.contraction)
 *   uHighlight[8]        : float region indices to highlight (−1 = unused), uHighlightMix: float 0..1
 *   uChamberCenter[4], uChamberAxis[4], uChamberRadius[4]: contraction field (order LA, RA, LV, RV)
 *   uApTauUp, uApTauRepV, uApTauRepA : AP template constants (match engine.fields.apVentricular / apAtrial)
 *
 * 3D textures (slice plane; same voxel grid as engine.geometry.grid, LINEAR filtering on the float texture):
 *   uFieldTex : RGBA16F  (tAct slot0, tAct slot1, apdRef, sdfMm) — tAct dilated 2 voxels outward so trilinear sampling
 *               does not blend blood/out values into the wall edge.
 *   uLabelTex : R8 NEAREST  TISSUE code.
 *   uGridOrigin (vec3 mm), uGridSize (vec3 mm) map local position → texture coordinates.
 *
 * Displacement field u(restPos, t) MUST be the same GLSL function in the heart material and the slice plane
 * (shared chunk in src/view3d/shaders/). Raycasting uses the rest pose.
 */
export const ATTR = {
  tAct0: 'aTAct0',
  tAct1: 'aTAct1',
  apdRef: 'aApdRef',
  wallDepth: 'aWallDepth',
  tissue: 'aTissue',
  region: 'aRegion',
  aha: 'aAha',
} as const;

export const UNIFORM = {
  beatA: 'uBeatA',
  beatV: 'uBeatV',
  restClip: 'uRestClip',
  clipOn: 'uClipOn',
  contraction: 'uContraction',
  highlight: 'uHighlight',
  highlightMix: 'uHighlightMix',
  chamberCenter: 'uChamberCenter',
  chamberAxis: 'uChamberAxis',
  chamberRadius: 'uChamberRadius',
  fieldTex: 'uFieldTex',
  labelTex: 'uLabelTex',
  gridOrigin: 'uGridOrigin',
  gridSize: 'uGridSize',
} as const;

/**
 * Sentinel for "never activated" in float attributes. RGBA16F textures cannot hold 1e9 (max finite half = 65504): they
 * store 65504, and shaders treat any tAct or APD ≥ 1000 ms as "no value".
 * Atrial beats also carry a rate-adapted apdScale (RR_prev/RR_ref)^(1/3) in uBeatA.z.
 */
export const T_NEVER = 1e9;
export const MAX_HIGHLIGHT = 8;
