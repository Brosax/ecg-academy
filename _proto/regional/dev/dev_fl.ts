// dev: per-group flutter contributions to leads I and II over one cycle (depolarisation + repolarisation)
import { flutterRevolution, prepare } from '../synth.ts';
import { DEFAULT_HEART } from '../geometry.ts';
import { NORMAL_ATRIA, LEADSYS } from '../model.ts';
import { apValue, apTauEff } from '../membrane.ts';
import type { ApParams } from '../membrane.ts';
const prep = prepare(DEFAULT_HEART);
const cl = 200;
const evs = [...flutterRevolution(prep.heart, -cl, cl, NORMAL_ATRIA), ...flutterRevolution(prep.heart, 0, cl, NORMAL_ATRIA), ...flutterRevolution(prep.heart, cl, cl, NORMAL_ATRIA)];
const per = evs.length / 3;
const groups = (i: number) => { const k = i % per; return k < 24 ? 'seg' + Math.floor(k / 6) : k < 32 ? 'LA' : 'BB'; };
const lead = (e: number[], name: string) => name === 'I' ? e[1] - e[0] : name === 'II' ? e[2] - e[0] : e[3] - (e[0] + e[1] + e[2]) / 3;
for (const L of (process.argv[2] ?? 'I,II,V1').split(',')) {
  console.log(`lead ${L}: t  seg0  seg1  seg2  seg3   LA    BB   total`);
  for (let t = 0; t < cl; t += 10) {
    const acc: Record<string, number> = { seg0: 0, seg1: 0, seg2: 0, seg3: 0, LA: 0, BB: 0 };
    evs.forEach((ev, i) => {
      const pa: ApParams = { t0: ev.T - 1.6 * ev.h, t1: ev.T + 0.3 * ev.h, apd: ev.apd, tau: ev.tau, spread: 0, plat: ev.plat, amp: 1, rest: 0, notchDepth: 0, notchD1: 0, notchD2: 1 };
      const pb: ApParams = { ...pa, t0: ev.T - 0.3 * ev.h, t1: ev.T + 1.6 * ev.h, apd: ev.apd - (ev.apdK ?? 0.6) * 1.3 * ev.h };
      const v = apValue(pa, t, apTauEff(pa)) - apValue(pb, t, apTauEff(pb));
      const w = [0, 1, 2, 3].map((e) => { const l = ev.pos ? prep.lf.at(e, ev.pos) : prep.lA[e][ev.region]; return l[0] * ev.d[0] + l[1] * ev.d[1] + l[2] * ev.d[2]; });
      acc[groups(i)] += LEADSYS.gainA * ev.m * lead(w, L) * v * 10;
    });
    const tot = Object.values(acc).reduce((a, b) => a + b, 0);
    console.log(`      ${String(t).padStart(3)} ` + Object.values(acc).map((x) => x.toFixed(1).padStart(5)).join(' ') + tot.toFixed(1).padStart(7));
  }
}
