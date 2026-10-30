import { buildGeom, DEFAULT_GEOM } from './geom.ts';
import { defaultTorso, leadSystem, leadVectorsAt, sphereMesh, bemMatrix, luFactor, luSolve, SIGMA, ELECTRODES } from './torso.ts';
import type { Vec3 } from './geom.ts';

// sphere test: dipole at centre -> surface potential 3x infinite medium
{
  const R = 100; const m = sphereMesh(R, 18, 36); const A = bemMatrix(m); const piv = luFactor(A, m.n);
  const p: Vec3 = [0, 0, 1e-6];
  const rhs = new Float64Array(m.n);
  for (let i = 0; i < m.n; i++) { const r: Vec3 = [m.cen[3*i]/1000, m.cen[3*i+1]/1000, m.cen[3*i+2]/1000]; const d = Math.hypot(...r); rhs[i] = 2 * (p[0]*r[0]+p[1]*r[1]+p[2]*r[2]) / (4*Math.PI*SIGMA*d**3); }
  const phi = luSolve(A, piv, m.n, rhs);
  let mean = 0; for (let i = 0; i < m.n; i++) mean += phi[i]; mean /= m.n;
  let num = 0, den = 0;
  for (let i = 0; i < m.n; i++) { const r: Vec3 = [m.cen[3*i]/1000, m.cen[3*i+1]/1000, m.cen[3*i+2]/1000]; const d = Math.hypot(...r); const inf = (p[0]*r[0]+p[1]*r[1]+p[2]*r[2]) / (4*Math.PI*SIGMA*d**3); num += (phi[i]-mean)*inf; den += inf*inf; }
  console.log('sphere test ratio (expect ~3):', (num/den).toFixed(3), 'panels', m.n);
}
const t0 = performance.now();
const tp = defaultTorso();
const ls = leadSystem(tp);
console.log('lead system ms', (performance.now()-t0).toFixed(0), 'panels', ls.mesh.n);
const g = buildGeom({ ...DEFAULT_GEOM, ...(process.env.GEOM ? JSON.parse(process.env.GEOM) : {}) });
let c: Vec3 = [0,0,0]; let nv = 0;
for (let i = 0; i < g.n; i++) if (g.dom[i] === 0) { c[0]+=g.pos[3*i]; c[1]+=g.pos[3*i+1]; c[2]+=g.pos[3*i+2]; nv++; }
c = [c[0]/nv, c[1]/nv, c[2]/nv];
console.log('ventricular centroid body', c.map(v=>v.toFixed(0)));
const L = leadVectorsAt(ls, c);
const E: Record<string, Vec3> = {}; ELECTRODES.forEach((e, i) => { E[e] = L[i]; });
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const wct: Vec3 = [(E.RA[0]+E.LA[0]+E.LL[0])/3, (E.RA[1]+E.LA[1]+E.LL[1])/3, (E.RA[2]+E.LA[2]+E.LL[2])/3];
const leads: Record<string, Vec3> = { I: sub(E.LA, E.RA), II: sub(E.LL, E.RA), III: sub(E.LL, E.LA) };
for (const v of ['V1','V2','V3','V4','V5','V6']) leads[v] = sub(E[v], wct);
const frank = (v: Vec3): Vec3 => [v[0], -v[1], -v[2]];
const dower: Record<string, Vec3> = { V1:[-0.515,0.157,-0.917], V2:[0.044,0.164,-1.387], V3:[0.882,0.098,-1.277], V4:[1.213,0.127,-0.601], V5:[1.125,0.127,-0.086], V6:[0.831,0.076,0.230], I:[0.632,-0.235,0.059], II:[0.235,1.066,-0.132], III:[0.235-0.632,1.066+0.235,-0.132-0.059] };
const scale = Math.hypot(...leads.II) / Math.hypot(...dower.II);
console.log('lead      ours(Frank, scaled to |II|=Dower)        |ours|   Dower                 |D|   angle');
for (const k of Object.keys(leads)) {
  const f = frank(leads[k]).map(v => v/scale) as Vec3; const d = dower[k];
  const cos = (f[0]*d[0]+f[1]*d[1]+f[2]*d[2])/(Math.hypot(...f)*Math.hypot(...d));
  const fr = Math.atan2(f[1], f[0])*180/Math.PI;
  console.log(k.padEnd(4), f.map(v=>v.toFixed(2).padStart(6)).join(' '), Math.hypot(...f).toFixed(2).padStart(6), '  ', d.map(v=>v.toFixed(2).padStart(6)).join(' '), Math.hypot(...d).toFixed(2), (Math.acos(cos)*180/Math.PI).toFixed(0).padStart(4), ' frontal', fr.toFixed(0));
}
