/**
 * Lead projector: every lead = L · H(t). Limb leads are built from electrode potentials so Einthoven
 * (I + III = II) and Goldberger (aVR + aVL + aVF = 0) hold exactly, including under rewiring.
 */
import { LEADS } from '../types';
import type { ElectrodeField, ElectrodeId, FrankVec, LeadName, LeadProjector, Wiring } from '../types';

type V3 = [number, number, number];

/** Lead vector of every standard lead given electrode lead vectors and a cable→position wiring. */
export function leadMatrix(field: ElectrodeField, wiring: Wiring = {}): Record<LeadName, FrankVec> {
  const at = (cable: ElectrodeId): V3 => {
    const pos = wiring[cable] ?? cable;
    const v = field.L[pos];
    return [v[0], v[1], v[2]];
  };
  const RA = at('RA'), LA = at('LA'), LL = at('LL');
  const lin = (terms: [number, V3][]): FrankVec => {
    const r: V3 = [0, 0, 0];
    for (const [k, v] of terms) {
      r[0] += k * v[0];
      r[1] += k * v[1];
      r[2] += k * v[2];
    }
    return r;
  };
  const wct: [number, V3][] = [[-1 / 3, RA], [-1 / 3, LA], [-1 / 3, LL]];
  const out = {
    I: lin([[1, LA], [-1, RA]]),
    II: lin([[1, LL], [-1, RA]]),
    III: lin([[1, LL], [-1, LA]]),
    aVR: lin([[1, RA], [-0.5, LA], [-0.5, LL]]),
    aVL: lin([[1, LA], [-0.5, RA], [-0.5, LL]]),
    aVF: lin([[1, LL], [-0.5, RA], [-0.5, LA]]),
  } as Record<LeadName, FrankVec>;
  for (const v of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) out[v] = lin([[1, at(v)], ...wct]);
  return out;
}

function toRowMajor(m: Record<LeadName, FrankVec>): Float32Array {
  const a = new Float32Array(LEADS.length * 3);
  LEADS.forEach((l, i) => a.set(m[l], i * 3));
  return a;
}

/**
 * @param field   ventricular electrode field (Dower in the MVP)
 * @param wiring  cable → physical position
 * @param atrialField optional separate atrial lead field (defaults to the ventricular one; L_A = L_V in the MVP)
 */
export function makeProjector(field: ElectrodeField, wiring: Wiring = {}, atrialField?: ElectrodeField): LeadProjector {
  const mVrec = leadMatrix(field, wiring);
  const mV = toRowMajor(mVrec);
  const mA = atrialField ? toRowMajor(leadMatrix(atrialField, wiring)) : mV;
  const L = LEADS.length;
  return {
    leads: LEADS,
    mA,
    mV,
    leadVector: (lead) => mVrec[lead],
    project(hA, hV, n, out) {
      for (let l = 0; l < L; l++) {
        const a0 = mA[l * 3], a1 = mA[l * 3 + 1], a2 = mA[l * 3 + 2];
        const v0 = mV[l * 3], v1 = mV[l * 3 + 1], v2 = mV[l * 3 + 2];
        const o = l * n;
        for (let i = 0; i < n; i++) {
          const j = i * 3;
          out[o + i] = a0 * hA[j] + a1 * hA[j + 1] + a2 * hA[j + 2] + v0 * hV[j] + v1 * hV[j + 1] + v2 * hV[j + 2];
        }
      }
    },
  };
}
