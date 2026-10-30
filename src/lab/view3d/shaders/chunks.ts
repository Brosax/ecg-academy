/**
 * Shared GLSL (WebGL2 / GLSL ES 3.00 via three's ShaderMaterial / onBeforeCompile prefixes).
 *
 * The displacement field u(restPos, chamber, tAct, beats) lives ONLY in GLSL_DISPLACEMENT and is used verbatim by the
 * heart material, the slice plane, the slice arrows, the conduction tubes and the valves (GPU contract), so the cut
 * surface, the wall and everything attached to it move together. Colours follow the global colour language (theme.css).
 */
import { AF_MAX_ROTORS, AF_UPSTROKE_MS } from '../../sim/source/afField';
import { VF_MAX_ROTORS, VF_UPSTROKE_MS } from '../../sim/source/vfField';
import { MAX_HIGHLIGHT } from '../gpuContract';

/** Beat uniforms (GPU contract) + slot / "most recent beat that has reached this point" helpers. */
export const GLSL_BEATS = /* glsl */ `
uniform vec4 uBeatA[2];
uniform vec4 uBeatV[2];
uniform float uApTauUp;
uniform float uApTauRepV;
uniform float uApTauRepA;
// Activation times above this are sentinels (1e9, or 65504 in the half-float texture) or blends with them.
const float HV_T_VALID = 1000.0;

float hvSlotT(vec4 b, vec2 tAct) { return b.y < 0.5 ? tAct.x : tAct.y; }

// vec2(tau, apdScale) of the most recent beat whose wavefront has reached this point (tau >= 0); tau = -1 if none.
vec2 hvLocalTau(vec4 b0, vec4 b1, vec2 tAct) {
  float t0 = hvSlotT(b0, tAct);
  if (b0.w > 0.5 && t0 < HV_T_VALID && b0.x - t0 >= 0.0) return vec2(b0.x - t0, b0.z);
  float t1 = hvSlotT(b1, tAct);
  if (b1.w > 0.5 && t1 < HV_T_VALID && b1.x - t1 >= 0.0) return vec2(b1.x - t1, b1.z);
  return vec2(-1.0, 1.0);
}

// Atrial fibrillation rotor field — GPU twin of afTauPacked (src/sim/source/afField.ts), fed by AfModel.pack through
// engine.afFrame. Per rotor 5 vec4: (anchor.xyz, rho) (core.xyz, psi) (e1.xyz, omega) (e2.xyz, k) (tauRep, tauUp, slope, 0).
uniform float uAfOn;
uniform float uAfN;
uniform vec4 uAf[${AF_MAX_ROTORS * 5}];
const float HV_TWO_PI = 6.283185307179586;

// vec3(tau = ms since the local upstroke (< 0 just before it), rho = AP half-repolarization (ms), tauRep (ms)) at rest
// position p: the nearest anchor's rotor owns p; theta = psi - k*|p - core| - atan2(d.e2, d.e1); tau = (theta mod 2pi)/omega - delta.
vec3 hvAfTau(vec3 p) {
  int best = 0;
  float bd = 1e30;
  for (int i = 0; i < ${AF_MAX_ROTORS}; i++) {
    if (float(i) < uAfN) {
      vec3 q = p - uAf[i * 5].xyz;
      float d2 = dot(q, q);
      if (d2 < bd) { bd = d2; best = i; }
    }
  }
  int o = best * 5;
  vec3 d = p - uAf[o + 1].xyz;
  float th = uAf[o + 1].w - uAf[o + 3].w * length(d) - atan(dot(d, uAf[o + 3].xyz), dot(d, uAf[o + 2].xyz) + 1e-9);
  float ph = th - HV_TWO_PI * floor(th / HV_TWO_PI);
  return vec3(ph / uAf[o + 2].w - ${AF_UPSTROKE_MS.toFixed(1)}, uAf[o].w, uAf[o + 4].x);
}

// Ventricular scroll-wave field (VF, torsades de pointes) — GPU twin of afTauPacked / VfModel.pack and of the run gate
// of VfModel.buildRun (src/sim/source/vfField.ts), fed through engine.vfFrame. Rotor slots use the AF layout (5 vec4).
// uVfOn: 0 off, 1 continuous field (VF), 2 torsades run. uVfRun[0] = (t since the trigger, run length D, preceding beat's
// V event rel. to the trigger, its APD scale); uVfRun[1] = (recovery in units of tauRep, its tauRep, envelope, mode).
uniform float uVfOn;
uniform float uVfN;
uniform vec4 uVf[${VF_MAX_ROTORS * 5}];
uniform vec4 uVfRun[2];
const float HV_VF_NONE = -1.0e4;

// vec3(tau, rho, tauRep) of the rotor whose slot starts at uVf[o] (o = 5 * slot), same formula as hvAfTau.
vec3 hvVfTauOf(vec3 p, int o) {
  vec3 d = p - uVf[o + 1].xyz;
  float th = uVf[o + 1].w - uVf[o + 3].w * length(d) - atan(dot(d, uVf[o + 3].xyz), dot(d, uVf[o + 2].xyz) + 1e-9);
  float ph = th - HV_TWO_PI * floor(th / HV_TWO_PI);
  return vec3(ph / uVf[o + 2].w - ${VF_UPSTROKE_MS.toFixed(1)}, uVf[o].w, uVf[o + 4].x);
}

// Continuous field: the nearest anchor's rotor owns p (static Voronoi domains).
vec3 hvVfTau(vec3 p) {
  int best = 0;
  float bd = 1e30;
  for (int i = 0; i < ${VF_MAX_ROTORS}; i++) {
    if (float(i) < uVfN) {
      vec3 q = p - uVf[i * 5].xyz;
      float d2 = dot(q, q);
      if (d2 < bd) { bd = d2; best = i; }
    }
  }
  return hvVfTauOf(p, best * 5);
}

// Ventricular field state at p: vec3(tau, rho, tauRep), or tau = HV_VF_NONE where the field does not drive p (the
// discrete ventricular beats apply). Run (torsades): tAct = (preceding sinus beat, trigger focus) activation, apdRef =
// APD map at p. The trigger is accepted once the preceding beat has recovered (repolarization + recovery*tauRep); p joins
// the rotor at its first wrap after recovering from the trigger (or from the sinus beat where the trigger was blocked);
// after D only the last wrap before D counts (slot 1 = the rotor at D).
vec3 hvVfState(vec3 p, vec2 tAct, float apdRef) {
  vec3 r = vec3(HV_VF_NONE, 1.0, 1.0);
  if (uVfOn > 1.5) {
    vec4 h0 = uVfRun[0];
    vec4 h1 = uVfRun[1];
    float rho = uVf[0].w;
    float tr = uVf[4].x;
    float rec = tAct.x < HV_T_VALID ? h0.z + tAct.x + apdRef * h0.w + h1.x * h1.y : -1.0e9;
    bool trig = tAct.y < HV_T_VALID && tAct.y - ${VF_UPSTROKE_MS.toFixed(1)} >= rec;
    float g = max(trig ? tAct.y + rho + h1.x * tr : rec, 0.0);
    bool live = h0.x <= h0.y;
    vec3 f = hvVfTauOf(p, live ? 0 : 5);
    float lw = (live ? h0.x : h0.y) - f.x - ${VF_UPSTROKE_MS.toFixed(1)};
    if (lw >= g) r = vec3(h0.x - lw - ${VF_UPSTROKE_MS.toFixed(1)}, f.y, f.z);
    else if (trig && h0.x >= tAct.y - ${VF_UPSTROKE_MS.toFixed(1)}) r = vec3(h0.x - tAct.y, rho, tr);
  } else if (uVfOn > 0.5) {
    r = hvVfTau(p);
  }
  return r;
}
`;

/** Voxel-grid textures. uGridOrigin = grid.originMm − h/2 and uGridSize = dims·h, so voxel i ↔ texel centre (i+0.5)/n. */
export const GLSL_GRID = /* glsl */ `
uniform highp sampler3D uFieldTex;
uniform highp sampler3D uLabelTex;
uniform highp sampler3D uChamberTex;
uniform vec3 uGridOrigin;
uniform vec3 uGridSize;
vec3 hvTexCoord(vec3 p) { return (p - uGridOrigin) / uGridSize; }
`;

/** Contraction field. Requires GLSL_BEATS and GLSL_GRID. Physiology: docs/research/activation-physiology.md §5. */
export const GLSL_DISPLACEMENT = /* glsl */ `
uniform vec3 uChamberCenter[4];
uniform vec3 uChamberAxis[4];
uniform float uChamberRadius[4];
uniform float uChamberLength[4];
uniform float uContraction;
uniform vec4 uMechRef;
uniform float uBaseDescentMm;

// Ventricular contraction state 0..1 for one beat. Mechanical onset = 1.06*tAct + 8.4 ms (MRI tagging); shortening
// builds up until the local action potential ends (≈ aortic closure at the end of T), then relaxes over ≈ 120 ms
// (IVRT ≈ 93 ms + early filling).
float hvVentState(vec4 b, vec2 tAct, float apd) {
  if (b.w < 0.5) return 0.0;
  float t = hvSlotT(b, tAct);
  if (t >= HV_T_VALID) t = uMechRef.y;
  float onset = 1.06 * t + 8.4;
  float apdEnd = t + apd * b.z;
  float rise = smoothstep(0.0, max(apdEnd - onset, 60.0), b.x - onset);
  return rise * (1.0 - smoothstep(apdEnd, apdEnd + 120.0, b.x));
}

// Atrial systole starts 40-60 ms after local activation and lasts ≈ 110 ms.
float hvAtrialState(vec4 b, vec2 tAct) {
  if (b.w < 0.5) return 0.0;
  float t = hvSlotT(b, tAct);
  if (t >= HV_T_VALID) t = uMechRef.x;
  float s = b.x - (t + 50.0);
  return smoothstep(0.0, 60.0, s) * (1.0 - smoothstep(60.0, 150.0, s));
}

// Radial motion toward the chamber axis with an incompressible-wall profile r'^2 = r^2 - k*s*R^2: the endocardium
// (small r) moves further than the epicardium, so the wall thickens. Tapered toward the apex / atrial ends.
vec3 hvRadial(vec3 p, int i, float s, float k, float atrial) {
  vec3 d = p - uChamberCenter[i];
  vec3 a = uChamberAxis[i];
  float ax = dot(d, a);
  vec3 rad = d - a * ax;
  float r = length(rad);
  float z = ax / max(0.5 * uChamberLength[i], 1.0);
  float prof = atrial > 0.5 ? 1.0 - smoothstep(0.55, 1.15, abs(z)) : 1.0 - smoothstep(0.25, 1.1, z);
  float R = uChamberRadius[i];
  float r2 = max(r * r - k * s * prof * R * R, 0.3 * r * r);
  return -rad * ((r - sqrt(r2)) / max(r, 1e-3));
}

// Longitudinal shortening: the AV plane descends toward the almost fixed apex by uBaseDescentMm (12-14 mm), scaled by
// the axial coordinate; above the AV plane the motion fades out across the atria and great vessels.
vec3 hvLongitudinal(vec3 p, float s) {
  vec3 a = uChamberAxis[2];
  float L = max(uChamberLength[2], 1.0);
  vec3 apex = uChamberCenter[2] + a * (0.5 * L);
  float h = dot(apex - p, a) / L;
  float prof = h <= 1.0 ? max(h, 0.0) : max(0.0, 1.0 - (h - 1.0) / 0.45);
  return a * (uBaseDescentMm * s * prof);
}

const float HV_K_VENT = 0.22;
const float HV_K_ATRIAL = 0.12;

// u(restPos, chamber weights (LA, RA, LV, RV), tAct (slot 0, slot 1), apdRef; beats) in local mm.
vec3 heartDisplacement(vec3 p, vec4 w, vec2 tAct, float apdRef) {
  if (uContraction <= 0.0) return vec3(0.0);
  float apd = (apdRef > 1.0 && apdRef < HV_T_VALID) ? apdRef : uMechRef.w;
  float sV = max(hvVentState(uBeatV[0], tAct, apd), hvVentState(uBeatV[1], tAct, apd));
  float sA = max(hvAtrialState(uBeatA[0], tAct), hvAtrialState(uBeatA[1], tAct));
  if (uAfOn > 0.5) {
    // fibrillating atria: small local twitches after each local upstroke, no coordinated atrial systole
    float ta = hvAfTau(p).x;
    sA = 0.25 * smoothstep(0.0, 25.0, ta - 10.0) * (1.0 - smoothstep(40.0, 90.0, ta));
  }
  if (uVfOn > 0.5) {
    // fibrillating / re-entering ventricles: local twitches after each local upstroke, no coordinated systole
    vec3 vf = hvVfState(p, tAct, apd);
    if (vf.x > HV_VF_NONE + 1.0) sV = 0.3 * smoothstep(0.0, 25.0, vf.x - 10.0) * (1.0 - smoothstep(60.0, 140.0, vf.x));
  }
  vec2 ref = vec2(uMechRef.y);
  float sG = max(hvVentState(uBeatV[0], ref, uMechRef.w), hvVentState(uBeatV[1], ref, uMechRef.w));
  vec3 d = w.x * hvRadial(p, 0, sA, HV_K_ATRIAL, 1.0)
         + w.y * hvRadial(p, 1, sA, HV_K_ATRIAL, 1.0)
         + w.z * hvRadial(p, 2, sV, HV_K_VENT, 0.0)
         + w.w * hvRadial(p, 3, sV, HV_K_VENT, 0.0)
         + hvLongitudinal(p, sG);
  return d * uContraction;
}

// The field form used by every material: inputs sampled from the voxel textures at the REST position.
vec3 heartDisplacementAt(vec3 p) {
  vec3 uvw = hvTexCoord(p);
  vec4 f = textureLod(uFieldTex, uvw, 0.0);
  vec4 w = textureLod(uChamberTex, uvw, 0.0);
  return heartDisplacement(p, w, f.xy, f.z);
}
`;

/** Electrical-state colour. Requires GLSL_BEATS. */
export const GLSL_ELECTRICAL = /* glsl */ `
uniform vec3 uColRest;
uniform vec3 uColAtrial;
uniform vec3 uColQrs;
uniform vec3 uColRepol;
uniform vec3 uColFront;
uniform vec3 uColRing;
uniform vec3 uColVessel;
uniform vec3 uColDead;
uniform vec3 uColBlood;

// TISSUE codes (types.ts): LV 2, RV 3, Septum 4 -> ventricular (2); LA 5, RA 6 -> atrial (1).
float hvCompOfTissue(float t) {
  if (t > 1.5 && t < 4.5) return 2.0;
  if (t > 4.5 && t < 6.5) return 1.0;
  return 0.0;
}

vec3 hvStaticColor(float t) {
  if (t > 0.5 && t < 1.5) return uColBlood;
  if (t > 6.5 && t < 7.5) return uColRing;
  if (t > 7.5 && t < 8.5) return uColVessel;
  if (t > 8.5) return uColDead;
  return uColRest;
}

// Front band (tau 0-6 ms, bright) -> plateau = saturated amber (atria) / magenta (ventricles) -> teal as the AP
// template repolarizes, sigma(-(tau - APD)/tau_r) -> back to resting muscle. .a = front-band intensity (emissive).
vec4 hvElectricalColorT(float comp, vec2 tauScale, float apdRef, float tauRep) {
  float tau = tauScale.x;
  if (tau < 0.0) return vec4(uColRest, 0.0);
  float apd = apdRef * tauScale.y;
  vec3 depol = comp > 1.5 ? uColQrs : uColAtrial;
  float sRep = 1.0 / (1.0 + exp(clamp((tau - apd) / tauRep, -30.0, 30.0)));
  vec3 c = mix(uColRepol, depol, sRep);
  c = mix(c, uColRest, smoothstep(apd + tauRep, apd + tauRep + 90.0, tau));
  float front = 1.0 - smoothstep(0.0, max(6.0, 2.0 * uApTauUp), tau);
  c = mix(c, uColFront, front * 0.8);
  return vec4(c, front);
}

vec4 hvElectricalColor(float comp, vec2 tauScale, float apdRef) {
  return hvElectricalColorT(comp, tauScale, apdRef, comp > 1.5 ? uApTauRepV : uApTauRepA);
}

// Atrial state colour at rest position p: the AF rotor field when it is on, otherwise the discrete atrial beats.
vec4 hvAtrialColor(vec3 p, vec2 tAct, float apdRef) {
  vec4 r;
  if (uAfOn > 0.5) {
    vec3 af = hvAfTau(p);
    r = hvElectricalColorT(1.0, vec2(af.x, 1.0), af.y, af.z);
  } else {
    r = hvElectricalColor(1.0, hvLocalTau(uBeatA[0], uBeatA[1], tAct), apdRef);
  }
  return r;
}

// Ventricular state colour at rest position p: the scroll-wave field (VF, torsades run) where it drives p, otherwise the
// discrete ventricular beats. Fine VF (envelope < 1, weaker local sources) is drawn paler.
vec4 hvVentricularColor(vec3 p, vec2 tAct, float apdRef) {
  vec4 r = hvElectricalColor(2.0, hvLocalTau(uBeatV[0], uBeatV[1], tAct), apdRef);
  if (uVfOn > 0.5) {
    vec3 vf = hvVfState(p, tAct, apdRef);
    if (vf.x > HV_VF_NONE + 1.0) {
      r = hvElectricalColorT(2.0, vec2(vf.x, 1.0), vf.y, vf.z);
      r.rgb = mix(uColRest, r.rgb, 0.35 + 0.65 * uVfRun[1].z);
    }
  }
  return r;
}

// Single exit: the D3D/ANGLE translator warns about early returns here ("potentially uninitialized").
vec4 hvTissueColor(float tissue, vec2 tAct, float apdRef, vec3 p) {
  float comp = hvCompOfTissue(tissue);
  vec4 r = vec4(hvStaticColor(tissue), 0.0);
  if (comp > 1.5) r = hvVentricularColor(p, tAct, apdRef);
  else if (comp > 0.5) r = hvAtrialColor(p, tAct, apdRef);
  return r;
}
`;

/**
 * Rest-space clipping (GPU contract: discard where dot(restPos, n) > d when uClipOn = 1). The discard is compiled in
 * only while a cross-section is active (define HV_CLIP, see setClipDefine): any `discard` in a shader disables early
 * depth rejection, which made the multi-layer heart mesh (epicardium + endocardia) ~3× more expensive to shade.
 */
export const GLSL_CLIP = /* glsl */ `
uniform vec4 uRestClip;
uniform float uClipOn;
#ifdef HV_CLIP
#define HV_CLIP_DISCARD(p) if (uClipOn > 0.5 && dot((p), uRestClip.xyz) > uRestClip.w) discard;
#else
#define HV_CLIP_DISCARD(p)
#endif
`;

/** Toggles the HV_CLIP define (program variant; three caches both variants). */
export function setClipDefine(m: { defines?: Record<string, unknown>; needsUpdate: boolean }, on: boolean): void {
  const has = !!m.defines && 'HV_CLIP' in m.defines;
  if (has === on) return;
  const d = { ...(m.defines ?? {}) };
  if (on) d.HV_CLIP = '';
  else delete d.HV_CLIP;
  m.defines = d;
  m.needsUpdate = true;
}

export const GLSL_HIGHLIGHT = /* glsl */ `
uniform float uHighlight[${MAX_HIGHLIGHT}];
uniform float uHighlightMix;
uniform vec3 uColHighlight;
float hvHighlight(float region) {
  if (region > 254.5) return 0.0;
  for (int i = 0; i < ${MAX_HIGHLIGHT}; i++) if (abs(uHighlight[i] - region) < 0.5) return 1.0;
  return 0.0;
}
`;

/** Rodrigues rotation (valve leaflets). */
export const GLSL_ROTATE = /* glsl */ `
vec3 hvRotate(vec3 v, vec3 k, float a) {
  float c = cos(a), s = sin(a);
  return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
}
`;

/** Inserts `code` after the first occurrence of `anchor`; throws if the anchor is missing (three chunk renamed). */
export function insertAfter(src: string, anchor: string, code: string): string {
  const i = src.indexOf(anchor);
  if (i < 0) throw new Error(`view3d shader patch: anchor not found: ${anchor}`);
  return src.slice(0, i + anchor.length) + '\n' + code + '\n' + src.slice(i + anchor.length);
}

/** Replaces the first occurrence of `anchor`; throws if missing. */
export function replaceOnce(src: string, anchor: string, code: string): string {
  const i = src.indexOf(anchor);
  if (i < 0) throw new Error(`view3d shader patch: anchor not found: ${anchor}`);
  return src.slice(0, i) + code + src.slice(i + anchor.length);
}
