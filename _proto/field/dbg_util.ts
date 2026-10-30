// dbg_util.ts — dev helpers shared by the dbg_* scripts
import type { Geom } from './geom.ts';
// far-field dipole weights of each node (sum over its existing + insulated-virtual 6-neighbours of (pos_j - pos_i))
export function dipoleWeights(g: Geom): Float64Array[] {
  const Wd = [0, 1, 2].map(() => new Float64Array(g.n));
  for (let i = 0; i < g.n; i++) {
    for (let q = g.nb6.start[i]; q < g.nb6.start[i + 1]; q++) { const j = g.nb6.idx[q]; if (g.dom[i] === 1 && g.ch[i] !== g.ch[j]) continue; for (let c = 0; c < 3; c++) Wd[c][i] += g.pos[3 * j + c] - g.pos[3 * i + c]; }
  }
  return Wd;
}
