// dev: print the activation windows (IN / OUT per region) of one condition, relative to the beat reference,
// plus the ventricular gradient G (frontal angle) from the APD map.
import { CONDITIONS } from '../conditions.ts';
import { buildHeart, DEFAULT_HEART } from '../geometry.ts';
import { buildVGraph, NORMAL_VCOND, vActivation } from '../conduction.ts';
import type { VConduction } from '../conduction.ts';
const id = process.argv[2] ?? 'normal';
const c = CONDITIONS[id];
const h = buildHeart({ ...DEFAULT_HEART, ...(c.heart ?? {}) });
const g = buildVGraph(h);
const vc: VConduction = { ...NORMAL_VCOND, ...(c.vcond ?? {}) } as VConduction;
const w = vActivation(h, g, vc);
let mn = Infinity;
for (const x of w) mn = Math.min(mn, x.t0);
console.log('region            IN [t0,t1]        OUT [t0,t1]   (ms from earliest)  z    wall');
for (let k = 0; k < h.vregions.length; k++) {
  const a = w[2 * k], b = w[2 * k + 1];
  const r = h.vregions[k];
  console.log(`${r.id.padEnd(10)} ${(a.t0 - mn).toFixed(0).padStart(5)} ${(a.t1 - mn).toFixed(0).padStart(5)} ${a.viaPurkinje ? 'P' : ' '}   ${(b.t0 - mn).toFixed(0).padStart(5)} ${(b.t1 - mn).toFixed(0).padStart(5)}      ${r.z.toFixed(2)} ${r.wall.toFixed(2)}  aIn ${r.aIn.map((x) => x.toFixed(1)).join(',')} aOut ${r.aOut.map((x) => x.toFixed(1)).join(',')} c ${r.c.map((x) => x.toFixed(1)).join(',')}`);
}
// ventricular gradient from the APD map (normal-beat APD formula of synth.ts, RR 833)
import { NORMAL_VREP, baseApd } from '../model.ts';
const vr = { ...NORMAL_VREP, ...(c.vrep ?? {}), dTM: { ...NORMAL_VREP.dTM, ...(c.vrep?.dTM ?? {}) }, dGroup: { ...NORMAL_VREP.dGroup, ...(c.vrep?.dGroup ?? {}) } };
const G = [0, 0, 0];
for (let k = 0; k < h.vregions.length; k++) {
  const r = h.vregions[k];
  const m = c.regions?.[r.id] ?? {};
  for (const face of [0, 1]) {
    let apd = baseApd(vr, r, face === 0);
    apd += (m.dApd ?? 0) + (face === 0 ? (m.dApdIn ?? 0) : (m.dApdOut ?? 0));
    const a = face === 0 ? r.aIn : r.aOut;
    const rim = r.aRim;
    for (let j = 0; j < 3; j++) G[j] -= (a[j] + rim[j] / 2) * apd;
  }
}
const frontal = (Math.atan2(-G[1], G[0]) * 180) / Math.PI;
console.log(`G (x L, y sup, z ant) ${G.map((x) => x.toFixed(0)).join(', ')}  frontal ${frontal.toFixed(0)} deg, |G| ${Math.hypot(...G).toFixed(0)}`);
