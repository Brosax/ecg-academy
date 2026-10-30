// dbg_fseq.ts — flutter: RA activation time (ms after the circuit exit, first activation at or after it) on a grid of
// body height (rows) x position around the RA (columns: angle of the node around the RA centre in the plane normal to
// the RA-LA axis), so the circuit can be read as a map (dev)
// usage: node dbg_fseq.ts ['<FIELD_OVR>'] ['<FIELD_COVR>']
import { generate, lastInternals } from './synth.ts';
import { CH } from './geom.ts';
if (process.argv[2]) process.env.FIELD_OVR = process.argv[2];
if (process.argv[3]) process.env.FIELD_COVR = process.argv[3];
generate('aflutter', { fs: 500, durationS: 2, seed: 1 });
const m = lastInternals!.model; const a = m.acts!; const g = m.g;
let k = a.first[m.sites.FLUT]; while (k >= 0 && a.t[k] < 1000) k = a.next[k];
const t0 = a.t[k];
const after = (i: number) => { let q = a.first[i]; while (q >= 0 && a.t[q] < t0 - 0.01) q = a.next[q]; return q >= 0 ? a.t[q] - t0 : NaN; };
// RA centroid in body coords
let cx = 0, cz = 0, n = 0; for (let i = 0; i < g.n; i++) if (g.ch[i] === CH.RA) { cx += g.pos[3 * i]; cz += g.pos[3 * i + 2]; n++; } cx /= n; cz /= n;
// columns: azimuth around the vertical axis through the RA centroid (0 = toward +x (septum/left), 90 = anterior, 180 = right/lateral, -90 posterior)
const NA = 12, rows: Record<number, (number[])[]> = {};
for (let i = 0; i < g.n; i++) {
  if (g.ch[i] !== CH.RA) continue;
  const y = Math.round(g.pos[3 * i + 1] / 5) * 5; const az = Math.atan2(g.pos[3 * i + 2] - cz, g.pos[3 * i] - cx) * 180 / Math.PI;
  const c = Math.floor(((az + 180) / 360) * NA) % NA;
  (rows[y] ||= Array.from({ length: NA }, () => [])); rows[y][c].push(after(i));
}
console.log(`RA activation map (median ms after exit; '  -- ' none; 'xxx' never). columns: azimuth from -180 (right/lateral) .. +180, 0 = toward left/septum, +90 anterior`);
console.log('   y ' + Array.from({ length: NA }, (_, c) => String(Math.round(-180 + (c + 0.5) * 360 / NA)).padStart(5)).join(''));
for (const y of Object.keys(rows).map(Number).sort((p, q) => q - p)) {
  console.log(String(y).padStart(4) + ' ' + rows[y].map((v) => { if (!v.length) return '   --'; const f = v.filter((x) => !isNaN(x)).sort((p, q) => p - q); if (!f.length) return '  xxx'; return f[f.length >> 1].toFixed(0).padStart(5); }).join(''));
}
// which cells hold never-activated nodes (the isthmus band) — fraction per cell
console.log('fraction of never-activated (band) nodes per cell:');
for (const y of Object.keys(rows).map(Number).sort((p, q) => q - p)) console.log(String(y).padStart(4) + ' ' + rows[y].map((v) => (v.length ? (v.filter((x) => isNaN(x)).length / v.length).toFixed(2).padStart(5) : '   --')).join(''));
const P = (i: number) => [g.pos[3 * i], g.pos[3 * i + 1], g.pos[3 * i + 2]].map((v) => v.toFixed(0)).join(',');
console.log('exit', P(m.sites.FLUT), 'entry', P(m.sites.CTIL), 'CSOS', m.sites.CSOS !== undefined ? P(m.sites.CSOS) : '-', 'centre x,z', cx.toFixed(0), cz.toFixed(0));
