/**
 * Lead assembly: the ONLY place in the engine that creates lead signals (DECISION §3.2).
 *
 *   I = Φ_LA − Φ_RA, II = Φ_LL − Φ_RA, III = Φ_LL − Φ_LA,
 *   aVR = Φ_RA − (Φ_LA + Φ_LL)/2, aVL = Φ_LA − (Φ_RA + Φ_LL)/2, aVF = Φ_LL − (Φ_RA + Φ_LA)/2   (Einthoven / Goldberger)
 *   Vk = Φ_Vk − (Φ_RA + Φ_LA + Φ_LL)/3,  V3R / V4R / V7 / V8 / V9 likewise                      (Wilson)
 *
 * Φ of a cable is the potential of the body site the hook-up clips it to (a site key; RL at its junction ≡ LL).
 */
import type { LeadSignals } from '../../core/ecg';
import type { ExtraLead, StdLead } from '../../core/leads';
import type { ComputedSite, Hookup } from './electrodes';

/** Site potentials: the nine computed sites plus any keyed non-computed site of the hook-up. */
export type SitePotentials<T> = Readonly<Record<ComputedSite, T>> & Readonly<Record<string, T | undefined>>;

/** The potential array of a site key, or a clear error when the site was not computed. */
export function sitePotential<T>(phi: SitePotentials<T>, key: string): T {
  const p = phi[key];
  if (p === undefined) {
    throw new Error(
      `src/synth: no potentials for electrode site '${key}'. Sites outside the nine standard ones (Mason–Likar, explicit chest sites, extra leads) are computed by hookupSitePotentials() in src/synth/leads/sites.ts, which the caller must add to the potentials`,
    );
  }
  return p;
}

/** 12 standard leads (+ the hook-up's extra leads), Float32, mV, from the site potentials through a hook-up. */
export function assemble(phi: SitePotentials<ArrayLike<number>>, hook: Hookup, from = 0, n = phi.RA.length - from): LeadSignals {
  const RA = sitePotential(phi, hook.RA), LA = sitePotential(phi, hook.LA), LL = sitePotential(phi, hook.LL);
  const V = (k: string): ArrayLike<number> => sitePotential(phi, k);
  const v1 = V(hook.V1), v2 = V(hook.V2), v3 = V(hook.V3), v4 = V(hook.V4), v5 = V(hook.V5), v6 = V(hook.V6);
  const mk = (): Float32Array => new Float32Array(n);
  const out = { I: mk(), II: mk(), III: mk(), aVR: mk(), aVL: mk(), aVF: mk(), V1: mk(), V2: mk(), V3: mk(), V4: mk(), V5: mk(), V6: mk() };
  for (let j = 0; j < n; j++) {
    const i = j + from;
    const r = RA[i], l = LA[i], f = LL[i];
    const wct = (r + l + f) / 3;
    out.I[j] = l - r;
    out.II[j] = f - r;
    out.III[j] = f - l;
    out.aVR[j] = r - (l + f) / 2;
    out.aVL[j] = l - (r + f) / 2;
    out.aVF[j] = f - (r + l) / 2;
    out.V1[j] = v1[i] - wct;
    out.V2[j] = v2[i] - wct;
    out.V3[j] = v3[i] - wct;
    out.V4[j] = v4[i] - wct;
    out.V5[j] = v5[i] - wct;
    out.V6[j] = v6[i] - wct;
  }
  if (hook.extra.length === 0) return out;
  const extra: Partial<Record<ExtraLead, Float32Array>> = {};
  for (const l of hook.extra) {
    const e = V(hook.extraSite[l] ?? l);
    const x = mk();
    for (let j = 0; j < n; j++) {
      const i = j + from;
      x[j] = e[i] - (RA[i] + LA[i] + LL[i]) / 3;
    }
    extra[l] = x;
  }
  return { ...out, ...extra };
}

/** One lead at one instant from scalar site potentials (truth probes and solves; same formulas as `assemble`). */
export function leadAt(lead: StdLead, p: SitePotentials<number>, hook: Hookup): number {
  const r = sitePotential(p, hook.RA), l = sitePotential(p, hook.LA), f = sitePotential(p, hook.LL);
  switch (lead) {
    case 'I': return l - r;
    case 'II': return f - r;
    case 'III': return f - l;
    case 'aVR': return r - (l + f) / 2;
    case 'aVL': return l - (r + f) / 2;
    case 'aVF': return f - (r + l) / 2;
    default: return sitePotential(p, hook[lead]) - (r + l + f) / 3;
  }
}
