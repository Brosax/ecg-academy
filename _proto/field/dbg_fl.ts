// dbg_fl.ts — flutter: activation time per atrial sub-region relative to the isthmus exit (dev)
import { generate, lastInternals } from './synth.ts';
import { DOM, CH, dot, norm } from './geom.ts';
if (process.argv[2]) process.env.FIELD_OVR = process.argv[2];
generate('aflutter', { fs: 500, durationS: 2, seed: 1 });
const m = lastInternals!.model; const a = m.acts!; const g = m.g; const p = m.p;
let k = a.first[m.sites.FLUT]; const ex: number[] = []; while (k >= 0) { ex.push(a.t[k]); k = a.next[k]; }
const t0 = ex[ex.length - 3];
const raC = p.geom.raC, laC = p.geom.laC; const sepN = norm([laC[0] - raC[0], laC[1] - raC[1], laC[2] - raC[2]]);
const ant = norm(g.bodyToLocalDir([0, 0, 1]));
const R: Record<string, number[]> = {};
for (let i = 0; i < g.n; i++) {
  if (g.dom[i] !== DOM.A) continue;
  let kk = a.first[i]; let t = NaN; while (kk >= 0) { if (a.t[kk] >= t0 - 5) { t = a.t[kk] - t0; break; } kk = a.next[kk]; }
  const c = g.ch[i] === CH.RA ? raC : laC;
  const v = [g.loc[3 * i] - c[0], g.loc[3 * i + 1] - c[1], g.loc[3 * i + 2] - c[2]] as [number, number, number];
  const lvl = v[1] < -5 ? 'low' : v[1] < 8 ? 'mid' : 'high';
  const lat = dot(norm(v), sepN); const an = dot(norm(v), ant);
  const pos = g.ch[i] === CH.RA ? (lat > 0.5 ? 'sept' : lat < -0.4 ? 'lat' : an > 0 ? 'ant' : 'post') : (lat < -0.5 ? 'sept' : lat > 0.4 ? 'lat' : an > 0 ? 'ant' : 'post');
  const key = (g.ch[i] === CH.RA ? 'RA-' : 'LA-') + pos + '-' + lvl;
  (R[key] ||= []).push(t);
}
for (const [k2, ts] of Object.entries(R).sort()) { const v = ts.filter((x) => !isNaN(x)).sort((x, y) => x - y); console.log(k2.padEnd(14), String(ts.length).padStart(4), v.length ? `${v[0].toFixed(0)} ${v[v.length >> 1].toFixed(0)} ${v[v.length - 1].toFixed(0)}` : '-'); }
console.log('exits', ex.map((x) => x.toFixed(0)).join(' '));
