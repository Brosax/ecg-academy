// dev: atrial activation windows and dipole directions for sinus rhythm
import { buildHeart, DEFAULT_HEART } from '../geometry.ts';
import { aActivation } from '../conduction.ts';
import { NORMAL_ATRIA } from '../model.ts';
const h = buildHeart(DEFAULT_HEART);
const ws = aActivation(h, 'sa', NORMAL_ATRIA.dir0, NORMAL_ATRIA.vScale, NORMAL_ATRIA.dirs);
for (const w of ws) {
  const a = h.aregions[w.region];
  console.log(`${a.id.padEnd(9)} T ${w.T.toFixed(0).padStart(4)} h ${w.h.toFixed(0).padStart(3)}  window ${(w.T - w.h).toFixed(0)}..${(w.T + w.h).toFixed(0)}  d ${w.d.map((x) => x.toFixed(2)).join(',')}  m ${w.m}  c ${a.c.map((x) => x.toFixed(1)).join(',')}`);
}
