import { dipoleWeights } from './dbg_util.ts';
// dbg_sets.ts — dipole (sum of EDL weights) of anatomical node sets (dev)
import { buildGeom, CH, SF, DOM } from './geom.ts';
const g = buildGeom();
const Wd = dipoleWeights(g);
const H = (f: (i: number) => boolean) => { const h = [0, 0, 0]; let n = 0; for (let i = 0; i < g.n; i++) if (g.dom[i] === DOM.V && f(i)) { n++; for (let c = 0; c < 3; c++) h[c] += Wd[c][i]; } return `n ${n} H(xL,yU,zA) ${h.map((v) => v.toFixed(0).padStart(6)).join('')} |H| ${Math.hypot(...h).toFixed(0)}`; };
console.log('LV endo layer tm<0.2      ', H((i) => g.ch[i] === CH.LV && !(g.sf[i] & SF.SEPTAL) && g.tm[i] < 0.2));
console.log('LV endo layer incl septum ', H((i) => g.ch[i] === CH.LV && g.tm[i] < 0.2));
console.log('LV all (free+sept)        ', H((i) => g.ch[i] === CH.LV));
console.log('LV free wall              ', H((i) => g.ch[i] === CH.LV && !(g.sf[i] & SF.SEPTAL)));
console.log('septum                    ', H((i) => (g.sf[i] & SF.SEPTAL) !== 0));
console.log('RV all                    ', H((i) => g.ch[i] === CH.RV));
console.log('LV ab<0.8                 ', H((i) => g.ch[i] === CH.LV && g.ab[i] < 0.8));
console.log('LV ab<0.8 endo tm<.2      ', H((i) => g.ch[i] === CH.LV && g.ab[i] < 0.8 && g.tm[i] < 0.2));
console.log('vent ab<0.8               ', H((i) => g.ab[i] < 0.8));
console.log('vent ab>=0.8              ', H((i) => g.ab[i] >= 0.8));
