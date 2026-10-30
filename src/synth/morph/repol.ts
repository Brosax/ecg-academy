/**
 * Repolarisation (DECISION §6.4): ventricular-gradient rule with a split T, JT anchoring and the regional APD map.
 *
 * Integral constraint (Wilson 1934; Burger 1957): the total T area is A_T = G − (1 − c)·A_QRS. The T is built from
 * parts whose areas sum exactly to that, so the gradient rule and the truth stay exact while the T loop gains width:
 *  - secondary lobes: one per QRS lobe k, area −(1 − c − p)·A_k, centred at the lobe's activation time + APD of its
 *    regions (relative to the population mean): if all cells had the same APD, repolarisation would replay activation
 *    reversed and smeared by phase 3 — that is this part;
 *  - plateau-slope ST lobe (phase-2 decline, A's review): area −p·A_QRS early in the ST segment (discordant J shift);
 *  - primary lobe(s) carrying G (the APD-heterogeneity part): one T lobe with the JT timing and `tShape`, plus one
 *    lobe per ApdChange carrying ΔG = −k_G Σ m_r ΔAPD_r ĉ_r − k_tm Σ m_r (ΔAPD_epi,r − ΔAPD_endo,r) n_r, timed at the
 *    changed regions' repolarisation;
 *  - optional U lobe (direction of the T area), split primary (LQT2 bifid T).
 * Every secondary and change lobe has the primary's shape and is clipped to end no later than the primary, so the
 * composite's descending limb is the primary's: truth T end = primary tangent end.
 *
 * Times of the output lobes are relative to the J point (QRS offset) at RR = 1000 ms; per beat they are scaled by the
 * JT rate law (rhythm/rate.ts). JT_ref = QTc − QRS₀ (QRS₀ = the pattern's QRS before conduction stretch), so a wider
 * QRS lengthens QT by the widening.
 */
import type { RegionId } from '../../core/regions';
import type { LobeSpec, PacingSite, RepolSpec, Vec3, VentOrigin } from '../api';
import { generatedPattern, ORIGIN_INPUT, PACING_INPUT } from '../rhythm/fronts';
import { ECTOPIC_SITES } from './patterns/sites';
import { resolveLobe } from './resolve';
import { add, len, scale, sub, unit } from '../frame';
import { isVentricular, massNormal, REGION_INDEX, VENT_IDS, ventGeom } from '../heart/anatomy';
import { meanApd, type ApdDelta, type ApdMap } from '../heart/apd';
import type { RegionTiming } from '../heart/activation';
import { lobeArea, lobeWithArea, type Lobe } from '../kernel/kernel';
import { posteriorFar } from './injury';

/** Normal QTc (Fridericia, ms) of the base: middle of the normal range (criteria.md `qtc-bazett`, < 450/460). */
export const NORMAL_QTC = 405;
/** Default ST segment as a fraction of JT (J → T 2 % onset). */
export const DEFAULT_ST_FRAC = 0.25;
/** Default T rise fraction (onset → peak / onset → end): rise slower than fall (normal T asymmetry ≥ 1.2). */
export const DEFAULT_RISE_FRAC = 0.66;
/** ΔG coefficients (mV·ms per unit mass per ms of APD change), calibrated on hyperacute T / Wellens / strain. */
export const K_G = 2.2;
export const K_TM = 3.4;
/** Plateau slope of a wide activation (RepolInput.stFromActivation): phase 2 of the earliest-activated myocardium begins
 *  this long after the QRS onset (ms); the discordant shift is complete ST_PEAK_AFTER_J ms after J. */
const PHASE2_MS = 60;
const ST_PEAK_AFTER_J = 10;
/** Normal U wave: ratio of the T peak amplitude and lag after the T end (ms). */
export const NORMAL_U = { ratio: 0.06, lagMs: 0 } as const;

export interface TTiming {
  readonly on: number;
  readonly peak: number;
  readonly end: number;
}

export interface RepolInput {
  /** final QRS lobes (relative to QRS onset) */
  readonly qrs: readonly Lobe[];
  /** QRS offset (relative to QRS onset) */
  readonly qrsOff: number;
  /** QRS of the pattern before conduction stretch (JT law) */
  readonly qrs0: number;
  readonly timing: RegionTiming;
  /** APD map after the changes, and the changes */
  readonly apd: ApdMap;
  readonly delta: ApdDelta;
  /** primary gradient (mV·ms) */
  readonly G: Vec3;
  readonly spec: RepolSpec | undefined;
  /** ventricular-lobe location resolver (near field), null = no location */
  readonly locOf: (regions: readonly (readonly [RegionId, number])[]) => Vec3 | null;
  /**
   * the plateau slope belongs to the activation pattern (a wide, slow activation: LBBB): its discordant shift builds up
   * during the QRS — from when the earliest-activated myocardium reaches phase 2 to the J point — instead of starting
   * just before J
   */
  readonly stFromActivation?: boolean;
}

export interface RepolOut {
  /** T parts, ST lobe, U: times relative to J at RR 1000 */
  readonly lobes: readonly Lobe[];
  readonly tPrimary: TTiming;
  /** indices (in `lobes`) of the primary lobes (alternans scales them) */
  readonly primaryIdx: readonly number[];
  readonly jtRef: number;
  readonly uEnd: number | null;
  /** total T area (diagnostic: equals G + ΔG − (1 − c)·A_QRS) */
  readonly tArea: Vec3;
  readonly aQrs: Vec3;
}

const VENT_TAGS = VENT_IDS.map((id) => [id, 1] as const);

/** QRS of the normal base pattern (ms): wider patterns keep the normal JT by default (their QT is longer). */
export const NORMAL_QRS_MS = 92;

/** Default QTc target of a pattern: the normal JT on top of the pattern's own QRS (bundle-branch blocks, WPW, VT). */
export function defaultQtc(qrs0: number): number {
  return NORMAL_QTC + Math.max(0, qrs0 - NORMAL_QRS_MS);
}

/** Shape of the primary T at RR 1000 relative to J. */
export function primaryTiming(spec: RepolSpec | undefined, qrs0: number): { t: TTiming; jtRef: number; q: number; qtc: number } {
  const qtc = spec?.qtcMs ?? defaultQtc(qrs0);
  const jtRef = Math.max(120, qtc - qrs0);
  const sh = spec?.tShape ?? {};
  const width = sh.widthMs !== undefined ? Math.min(jtRef - 10, sh.widthMs) : jtRef - (sh.stMs ?? DEFAULT_ST_FRAC * jtRef);
  const on = jtRef - Math.max(60, width);
  const peak = on + (sh.riseFrac ?? DEFAULT_RISE_FRAC) * (jtRef - on);
  return { t: { on, peak, end: jtRef }, jtRef, q: sh.q ?? 2, qtc };
}

/** Mass-weighted mean repolarisation time (activation midpoint + APD) of a region set, relative to QRS onset. */
function repolTime(timing: RegionTiming, apd: ApdMap, ids: readonly RegionId[]): number | null {
  let s = 0, w = 0;
  for (const id of ids) {
    if (!isVentricular(id)) continue;
    const i = REGION_INDEX[id];
    if (!Number.isFinite(timing.t0[i])) continue;
    const m = ventGeom(id).mass;
    s += m * (0.5 * (timing.t0[i] + timing.t1[i]) + 0.5 * (apd.endo[i] + apd.epi[i]));
    w += m;
  }
  return w > 0 ? s / w : null;
}

/**
 * QRS area (mV·ms, Frank) of the pattern cardiac memory remembers (DECISION §6.4: G += w·A_QRS of the remembered
 * pattern, so the sinus T follows the direction of the earlier abnormal QRS — Rosenbaum MB et al., Am J Cardiol
 * 1982;50:213–222). The remembered pattern is the engine's own paced or ectopic pattern of that site (the same lobes the
 * scheduler renders for a paced / ectopic beat), so the memory T is consistent with the QRS a learner saw while paced:
 * RV apical pacing (posterior, superior QRS) → T inversion in V1–V4 and II, III, aVF with an upright T in I, aVL, V6.
 */
export function memoryQrsArea(from: PacingSite | VentOrigin): Vec3 {
  const sum = (lobes: readonly LobeSpec[]): Vec3 => lobes.reduce<Vec3>((s, l) => add(s, lobeArea(resolveLobe(l, 'QRS', 'none'))), [0, 0, 0]);
  if (from === 'his' || from === 'ra-appendage') throw new Error(`src/synth: cardiac memory from '${from}' has no abnormal QRS to remember`);
  if (from in PACING_INPUT) {
    const site = from as keyof typeof PACING_INPUT;
    return sum(generatedPattern(`paced:${site}`, PACING_INPUT[site], `paced ${site}`).lobes);
  }
  const o = from as VentOrigin;
  const e = ECTOPIC_SITES[o];
  if (e) return sum(e.lobes);
  if (o === 'junctional') throw new Error("src/synth: cardiac memory from 'junctional' has no abnormal QRS to remember");
  return sum(generatedPattern(`origin:${o}`, ORIGIN_INPUT[o], o).lobes);
}

/**
 * Label prefix of substrate lobes whose QRS area is also added to the gradient (RV hypertrophy, necrosis): their
 * secondary T is timed with the primary T so the two cancel exactly (ventricular.ts).
 */
export const MASS_LOBE = '[mass] ';
export const isMassLobe = (l: Lobe): boolean => l.label.startsWith(MASS_LOBE);

/** ΔG of a set of APD deltas (DECISION §6.4). */
export function deltaG(d: ApdDelta): Vec3 {
  let g: Vec3 = [0, 0, 0];
  for (const id of d.regions) {
    const i = REGION_INDEX[id];
    const geo = ventGeom(id as (typeof VENT_IDS)[number]);
    const mean = 0.5 * (d.endo[i] + d.epi[i]);
    g = add(g, scale(unit(geo.c), -K_G * geo.mass * mean));
    g = add(g, scale(geo.n, -K_TM * geo.mass * (d.epi[i] - d.endo[i])));
  }
  return g;
}

export function buildRepol(inp: RepolInput): RepolOut {
  const spec = inp.spec;
  const c = Math.min(0.95, Math.max(0, spec?.coupling ?? 0));
  const ps = Math.min(0.5, Math.max(0, spec?.plateauSlope ?? 0));
  const { t: tEnd, jtRef, q } = primaryTiming(spec, inp.qrs0);
  const base = { endRule: 'tangent' as const, q, dir2: null, far: 1, wave: 'T' as const };
  const out: Lobe[] = [];
  const primaryIdx: number[] = [];
  // split primary (LQT2 bifid T): the late part ends at the JT target, so the QTc of the RepolSpec (and the qtc dial)
  // is the QT of the whole bifid T; the early part — and the secondary / change lobes that shape it — lead it by the
  // lag (kept ≥ 40 ms after J)
  const split = spec?.split;
  const share = split ? Math.min(0.9, Math.max(0, split.share)) : 0;
  const lag = split && share > 0 ? Math.max(0, Math.min(split.lagMs, tEnd.on - 40)) : 0;
  const t: TTiming = lag > 0 ? { on: tEnd.on - lag, peak: tEnd.peak - lag, end: tEnd.end - lag } : tEnd;
  const shifted = (d: number, scaleW = 1): TTiming => {
    // primary shape shifted by d (and narrowed about its peak by scaleW), clipped to end ≤ the primary end
    const on = t.peak + d - (t.peak - t.on) * scaleW;
    const peak = t.peak + d;
    let end = t.peak + d + (t.end - t.peak) * scaleW;
    if (end > t.end - 2) end = t.end - 2;
    return { on, peak: Math.min(peak, end - 12), end };
  };
  // ── secondary lobes ──────────────────────────────────────────────────────────────────────────────────────────
  const aQrs = inp.qrs.reduce<Vec3>((s, l) => add(s, lobeArea(l)), [0, 0, 0]);
  const sec = inp.qrs.map((l) => ({ l, a: lobeArea(l), tau: l.peak + meanApd(inp.apd, l.regions) - inp.qrsOff, mass: isMassLobe(l) }));
  let wsum = 0, tauBar = 0;
  for (const s of sec) {
    if (s.mass) continue;
    const w = len(s.a);
    wsum += w;
    tauBar += w * s.tau;
  }
  tauBar = wsum > 0 ? tauBar / wsum : t.peak;
  const kSec = 1 - c - ps;
  for (const s of sec) {
    if (len(s.a) === 0 || kSec === 0) continue;
    // a substrate (mass) lobe's area is also in G, and its secondary T sits exactly under the primary: net zero, so
    // hypertrophy or necrosis does not by itself change the T (primary changes are explicit ApdChanges)
    const tm = shifted(s.mass ? 0 : s.tau - tauBar);
    // (with a split primary the late population carries its share of the whole T — gradient and secondary part)
    out.push(lobeWithArea({ label: `secondary T (${s.l.label})`, ...tm, ...base, regions: s.l.regions, loc: s.l.loc }, scale(s.a, -kSec * (1 - (lag > 0 ? share : 0)))));
  }
  // ── plateau-slope ST lobe ───────────────────────────────────────────────────────────────────────────────────
  if (ps > 0 && len(aQrs) > 0) {
    // starts inside the last part of the QRS (phase 2 begins where the cells are already depolarised): J-point shift.
    // From a wide activation pattern it starts PHASE2_MS after the QRS onset and is complete just after J
    const w = inp.stFromActivation
      ? { on: Math.min(-24, PHASE2_MS - inp.qrsOff), peak: ST_PEAK_AFTER_J }
      : { on: -24, peak: 0.12 * jtRef };
    out.push(lobeWithArea({ label: 'plateau slope (ST)', ...w, end: 0.6 * jtRef, endRule: 'edge', q: 2, far: 1, wave: 'ST', regions: VENT_TAGS, loc: null }, scale(aQrs, -ps)));
  }
  // ── primary lobe(s) ─────────────────────────────────────────────────────────────────────────────────────────
  primaryIdx.push(out.length);
  out.push(lobeWithArea({ label: 'primary T (G)', ...t, ...base, regions: VENT_TAGS, loc: null }, scale(inp.G, lag > 0 ? 1 - share : 1)));
  let tPrimary = t;
  if (lag > 0) {
    primaryIdx.push(out.length);
    out.push(lobeWithArea({ label: 'primary T (split)', ...tEnd, ...base, regions: VENT_TAGS, loc: null }, scale(sub(inp.G, scale(aQrs, kSec)), share)));
    tPrimary = { on: t.on, peak: t.peak, end: tEnd.end };
  }
  // ── change lobes (ΔG) ───────────────────────────────────────────────────────────────────────────────────────
  let dG: Vec3 = [0, 0, 0];
  if (inp.delta.regions.length) {
    dG = deltaG(inp.delta);
    const allRepol = repolTime(inp.timing, inp.apd, VENT_IDS) ?? 0;
    const changed = repolTime(inp.timing, inp.apd, inp.delta.regions) ?? allRepol;
    // the change lobe is timed at the changed regions' repolarisation, but it must end with the primary (truth T end):
    // a large delay is capped so the lobe keeps ≥ 70 % of its descending limb (otherwise clipping squeezes it into a
    // narrow, QRS-like spike — apical HCM, cerebral T)
    const CHANGE_W = 0.85;
    const dMax = t.end - 2 - t.peak - 0.7 * CHANGE_W * (t.end - t.peak);
    const tm = shifted(Math.min(changed - allRepol, dMax), CHANGE_W);
    if (len(dG) > 0) {
      primaryIdx.push(out.length);
      // a change on a wall that faces the back is an eccentric dipole at that wall, like its injury current
      // (injury.ts › posteriorFar): V1–V3 see its mirror, the lateral leads do not see it as a central dipole
      const loc = inp.locOf(inp.delta.regions.map((id) => [id, 1] as const));
      const far = loc ? posteriorFar(massNormal(inp.delta.regions)) : 1;
      out.push(lobeWithArea({ label: 'primary T (ΔG, APD change)', ...tm, ...base, far, regions: inp.delta.regions.map((id) => [id, 1] as const), loc }, dG));
    }
  }
  const tArea = sub(add(inp.G, dG), scale(aQrs, 1 - c));
  // ── U wave ──────────────────────────────────────────────────────────────────────────────────────────────────
  let uEnd: number | null = null;
  const u = spec?.u ?? NORMAL_U;
  if (u.ratio > 0 && len(tArea) > 0) {
    const lag = u.lagMs ?? 0;
    const primaryLobe = out[primaryIdx[0]];
    const tPeakAmp = len(tArea) / Math.max(1e-9, len(lobeArea(primaryLobe)) / Math.max(1e-9, primaryLobe.amp));
    const on = tPrimary.end - 20 + lag, peak = tPrimary.end + 55 + lag, end = tPrimary.end + 140 + lag;
    out.push({ label: 'U', on, peak, end, endRule: 'edge', q: 2, dir: unit(tArea), dir2: null, amp: u.ratio * tPeakAmp, regions: VENT_TAGS, loc: null, far: 1, wave: 'U' });
    uEnd = end;
  }
  return { lobes: out, tPrimary, primaryIdx, jtRef, uEnd, tArea, aQrs };
}
