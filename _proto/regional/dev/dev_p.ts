// dev: per-region atrial contribution to leads II and V1 over the P wave (Dower far field, gainA), 5 ms steps
import { buildHeart, DEFAULT_HEART } from '../geometry.ts';
import { aActivation } from '../conduction.ts';
import { NORMAL_ATRIA, LEADSYS } from '../model.ts';
import type { ApParams } from '../membrane.ts';
import { apValue, apTauEff } from '../membrane.ts';
import { dowerElectrodes } from '../leadfield.ts';
import { dot, sub } from '../vec.ts';
const h = buildHeart(DEFAULT_HEART);
const ws = aActivation(h, 'sa', NORMAL_ATRIA.dir0, NORMAL_ATRIA.vScale, NORMAL_ATRIA.dirs);
const D = dowerElectrodes();
const II = sub(D.LL, D.RA), V1 = sub(D.V1, [(D.RA[0] + D.LA[0] + D.LL[0]) / 3, (D.RA[1] + D.LA[1] + D.LL[1]) / 3, (D.RA[2] + D.LA[2] + D.LL[2]) / 3]);
const I = sub(D.LA, D.RA);
console.log('t   ' + ws.map((w) => h.aregions[w.region].id.slice(0, 7).padStart(8)).join('') + '     II     I     V1');
for (let t = 0; t <= 140; t += 5) {
  let row = String(t).padStart(3) + ' ';
  let sII = 0, sV1 = 0, sI = 0;
  for (const w of ws) {
    const pa: ApParams = { t0: w.T - 1.6 * w.h, t1: w.T + 0.3 * w.h, apd: 210, tau: NORMAL_ATRIA.tau, spread: 0, plat: NORMAL_ATRIA.plat, amp: 1, rest: 0, notchDepth: 0, notchD1: 0, notchD2: 1 };
    const pb: ApParams = { ...pa, t0: w.T - 0.3 * w.h, t1: w.T + 1.6 * w.h };
    const v = apValue(pa, t, apTauEff(pa)) - apValue(pb, t, apTauEff(pb));
    const g = LEADSYS.gainA * w.m * v * 10;
    const cII = g * dot(II, w.d), cV1 = g * dot(V1, w.d), cI = g * dot(I, w.d);
    sII += cII; sV1 += cV1; sI += cI;
    row += cII.toFixed(2).padStart(8);
  }
  console.log(row + sII.toFixed(2).padStart(7) + sI.toFixed(2).padStart(6) + sV1.toFixed(2).padStart(7));
}
