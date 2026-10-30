// dev: lead-field magnitude ratios (proximity) for chosen regions under each precordial electrode (WCT-referenced)
import { buildHeart, DEFAULT_HEART } from '../geometry.ts';
import { buildLeadField, ELECTRODES } from '../leadfield.ts';
import { LEADSYS } from '../model.ts';
import { sub, norm, scale, add } from '../vec.ts';
const beta = Number(process.argv[2] ?? LEADSYS.beta);
const h = buildHeart(DEFAULT_HEART);
const lf = buildLeadField(beta);
const regs = ['rv_free', 'rv_ant', 'rvot', 'm_antsep', 'm_antlat', 'b_inflat', 'apex', 'a_ant'];
const wct = (r: number[]) => scale(add(add(lf.at(0, r as any), lf.at(1, r as any)), lf.at(2, r as any)), 1 / 3);
console.log('beta', beta, 'kappa', lf.kappa.toFixed(2));
for (const id of regs) {
  const r = h.vregions[h.index[id]].c;
  const row = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'].map((v) => { const e = ELECTRODES.indexOf(v as any); return norm(sub(lf.at(e, r), wct(r as any))).toFixed(2); });
  console.log(id.padEnd(10), row.join(' '));
}
