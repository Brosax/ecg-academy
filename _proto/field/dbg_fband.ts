// dbg_fband.ts — flutter isthmus band: RA nodes by septal-ness (projection of the node direction from the RA centre,
// in the local xz plane, on the RA->LA septal normal) vs ctiW, and where the landmark sites fall (dev)
// usage: node dbg_fband.ts ['<FIELD_OVR>'] ['<FIELD_COVR>']
import { CONDITIONS } from './conditions.ts';
import { buildModel } from './model.ts';
import { CH } from './geom.ts';
if (process.argv[2]) process.env.FIELD_OVR = process.argv[2];
const p = CONDITIONS.aflutter.params(1);
if (process.argv[3]) { const o = JSON.parse(process.argv[3]); for (const k of Object.keys(o)) { const v = o[k]; const t = p as unknown as Record<string, unknown>; t[k] = v && typeof v === 'object' && !Array.isArray(v) && t[k] && typeof t[k] === 'object' ? { ...(t[k] as object), ...(v as object) } : v; } }
const m = buildModel(p, 1); const g = m.g;
const raC = p.geom.raC, laC = p.geom.laC;
const sn = [laC[0] - raC[0], laC[1] - raC[1], laC[2] - raC[2]]; const L = Math.hypot(...sn); for (let k = 0; k < 3; k++) sn[k] /= L;
const sept = (i: number) => { const v = [g.loc[3 * i] - raC[0], 0, g.loc[3 * i + 2] - raC[2]]; const l = Math.hypot(...v) || 1; return (v[0] * sn[0] + v[2] * sn[2]) / l; };
// histogram of septal-ness for blocked (band) nodes: a node is in the band if all its RA out-edges are blocked
const G = m.graph; const band = new Uint8Array(g.n);
for (let i = 0; i < g.n; i++) { if (g.ch[i] !== CH.RA) continue; let any = false, open = false; for (let e = G.start[i]; e < G.start[i + 1]; e++) { const j = G.to[e]; if (j >= g.n || g.ch[j] !== CH.RA) continue; any = true; if (G.blockUntil[e] !== Infinity) open = true; } if (any && !open) band[i] = 1; }
const bins = new Array(21).fill(0), tot = new Array(21).fill(0);
for (let i = 0; i < g.n; i++) if (g.ch[i] === CH.RA) { const b = Math.round((sept(i) + 1) * 10); tot[b]++; if (band[i]) bins[b]++; }
console.log('septal-ness  RA nodes  band nodes');
for (let b = 0; b <= 20; b++) if (tot[b]) console.log(`${((b / 10) - 1).toFixed(1).padStart(5)} ${String(tot[b]).padStart(8)} ${String(bins[b]).padStart(8)}`);
for (const s of ['FLUT', 'CTIL', 'CSOS', 'AVNE']) if (m.sites[s] !== undefined) console.log(s, 'sept', sept(m.sites[s]).toFixed(2), 'band', band[m.sites[s]], 'body', [0, 1, 2].map((c) => g.pos[3 * m.sites[s] + c].toFixed(0)).join(','));
