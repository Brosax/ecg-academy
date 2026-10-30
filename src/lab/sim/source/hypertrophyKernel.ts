/**
 * Hypertrophy-weighted voxel-face EDL kernel (batch 3: LVH / RVH, atrial enlargement).
 *
 * The voxel-face kernel (voxelEdl.ts) is the discrete form of H = ∫ J_i dV with J_i = −σ_i ∇V_m: summed over the
 * INTERNAL faces of the myocardium, each face between voxels v → w (unit normal e) contributes h²·e·(s_v − s_w), so
 *   c_v = −h² · Σ_{internal faces of v} e_{v→w}   (= h² · Σ boundary-face normals, the familiar form).
 * A thicker / stronger wall is a larger intracellular source. Weighting each INTERNAL FACE (not each voxel) keeps the
 * discrete gradient theorem intact:
 *   c_v = −h² · Σ_{internal faces f of v} M_f · e_{v→w}
 * Each face appears once with +M_f·e and once with −M_f·e, so Σ_v c_v ≡ 0 for any weights, a uniformly depolarized
 * heart gives H = 0 (flat ST, no plateau artefact) and the weight acts only where V_m has a gradient — on the
 * wavefront and the repolarization front. (A per-VOXEL weight, `tissue.gain`, leaves Σc ≠ 0 at the region border:
 * on the HRA heart an LV weight of 1.6 gives ±0.4–1.2 mV of spurious "ST shift".)
 *
 * Face weight M_f, from the per-voxel thickness factor k (k_f = mean of the two voxels):
 *   'isotropic'  M_f = k_f · I                         source-strength factor (e.g. atrial enlargement)
 *   'transmural' M_f = k_f · I − (k_f − 1) · d dᵀ      d = unit transmural direction (grid.transDir, face mean)
 * 'transmural' is the exact image of a wall stretched k-fold across its thickness and mapped back onto the fixed
 * voxels: under x' = x + (k − 1)(x·d)d the face vector n·dA becomes det(F)·F⁻ᵀ·n·dA = (k·I − (k − 1)·d dᵀ)·n·dA, i.e.
 * fronts travelling ALONG the wall (whose surface spans the wall thickness) grow k-fold, fronts crossing the wall
 * (surface parallel to the wall) keep their area. The matching activation change — k-fold longer transmural path —
 * belongs to the conduction graph (the scenario's speed factors), not to the kernel.
 * Face vectors are rounded to multiples of 1/2¹⁰ (in units of h²) before accumulation. For the HRA grid (h = 1.5 mm,
 * h² = 2.25 dyadic) every c entry is then exact in float32 and the float64 closure sum is exactly zero, as for the
 * unweighted kernel; for a non-dyadic h² the sum is zero up to float32 rounding. With k ≡ 1 the result equals
 * buildKernel.
 */
import { compMask } from '../conduction/gridUtil';
import type { Comp, SourceKernel, VoxelGrid } from '../types';

export type HypertrophyMode = 'isotropic' | 'transmural';

const Q = 1024; // face-vector quantum: h²/1024

export function buildHypertrophyKernel(g: VoxelGrid, comp: Comp, k: Float32Array, mode: HypertrophyMode): SourceKernel {
  const [nx, ny, nz] = g.dims;
  const h2 = g.hMm * g.hMm;
  const n = nx * ny * nz;
  const inC = compMask(g, comp);
  const td = g.transDir;
  const acc = new Float64Array(3 * n); // Σ M_f·e over the internal faces, in units of h² (negated at the end)
  const strides = [1, nx, nx * ny];
  const lim = [nx, ny, nz];
  for (let kk = 0; kk < nz; kk++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const v = i + nx * (j + ny * kk);
        if (!inC[v]) continue;
        const ijk = [i, j, kk];
        for (let ax = 0; ax < 3; ax++) {
          if (ijk[ax] + 1 >= lim[ax]) continue;
          const w = v + strides[ax];
          if (!inC[w]) continue;
          const kf = 0.5 * (k[v] + k[w]);
          // u = M_f · e_ax (e = unit vector along +ax, from v to w)
          let ux = ax === 0 ? kf : 0, uy = ax === 1 ? kf : 0, uz = ax === 2 ? kf : 0;
          if (kf !== 1 && mode === 'transmural') {
            let dx = td[3 * v] + td[3 * w], dy = td[3 * v + 1] + td[3 * w + 1], dz = td[3 * v + 2] + td[3 * w + 2];
            const dn = Math.hypot(dx, dy, dz);
            if (dn > 1e-3) {
              dx /= dn;
              dy /= dn;
              dz /= dn;
              const de = ax === 0 ? dx : ax === 1 ? dy : dz; // d · e
              const f = (kf - 1) * de;
              ux -= f * dx;
              uy -= f * dy;
              uz -= f * dz;
            }
          }
          ux = Math.round(ux * Q) / Q;
          uy = Math.round(uy * Q) / Q;
          uz = Math.round(uz * Q) / Q;
          acc[3 * v] += ux;
          acc[3 * v + 1] += uy;
          acc[3 * v + 2] += uz;
          acc[3 * w] -= ux;
          acc[3 * w + 1] -= uy;
          acc[3 * w + 2] -= uz;
        }
      }
  const vox: number[] = [];
  const cs: number[] = [];
  for (let v = 0; v < n; v++) {
    if (!inC[v]) continue;
    const cx = acc[3 * v], cy = acc[3 * v + 1], cz = acc[3 * v + 2];
    if (cx === 0 && cy === 0 && cz === 0) continue;
    vox.push(v);
    // c_v = −h² Σ M_f·e_{v→w}; + 0 turns −0 into 0
    cs.push(-cx * h2 + 0, -cy * h2 + 0, -cz * h2 + 0);
  }
  return { comp, voxels: Uint32Array.from(vox), c: Float32Array.from(cs) };
}
