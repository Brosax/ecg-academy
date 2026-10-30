/**
 * Electrodes, body sites and placement (DECISION §6.8).
 *
 * A placement maps every cable to a body site. Limb cables go to the four limb–trunk junctions (both legs are
 * equipotential: Φ_RL = Φ_LL, so a swap involving RL flattens one limb lead) or, with Mason–Likar, to four torso
 * sites; chest cables go to the six standard sites (a swap exchanges traces exactly) or to any chest/back site given as
 * (intercostal space, line, side). Extra leads V3R, V4R, V7, V8, V9 are Wilson leads of their own electrodes.
 *
 * Site keys: the nine sites render.ts computes ('RA', 'LA', 'LL', 'V1'…'V6'), plus keys for every other site in use
 * ('RA@ml'…, 'V4R'…, 'chest:2:sternal:R'…), each with its position and lead vector in `Hookup.sites`. Their
 * potentials come from `sitePotentials` (sites.ts); `assemble` refuses a hook-up whose sites have no potentials.
 */
import type { ExtraLead } from '../../core/leads';
import type { ChestCable, ChestSite, LimbCable, PlacementSpec, Vec3 } from '../api';
import { chestLeadVector, inLeadTable, masonLikarSite } from './leadfield';
import { chestSurface, EXTRA_CHEST_SITES, STANDARD_CHEST_SITES, STANDARD_POS, surfacePos } from './torso';

export const LIMB_SITES = ['RA', 'LA', 'LL', 'RL'] as const;
export const CHEST_SITES = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
export const EXTRA_SITES = ['V3R', 'V4R', 'V7', 'V8', 'V9'] as const;
export type LimbSite = (typeof LIMB_SITES)[number];
export type ChestSiteId = (typeof CHEST_SITES)[number];
export type ExtraSite = (typeof EXTRA_SITES)[number];
export type SiteId = LimbSite | ChestSiteId | ExtraSite;

/** Sites whose potential render.ts computes (RL is not: legs are equipotential, Φ_RL = Φ_LL). */
export const COMPUTED_SITES = ['RA', 'LA', 'LL', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
export type ComputedSite = (typeof COMPUTED_SITES)[number];

/** Site positions (cm, Frank): the nine standard landmarks of prototype B and the extra chest sites of the torso model. */
export const SITE_POS: Readonly<Record<SiteId, Vec3>> = {
  ...STANDARD_POS,
  RL: STANDARD_POS.LL,
  V3R: surfacePos(chestSurface(EXTRA_CHEST_SITES.V3R)),
  V4R: surfacePos(chestSurface(EXTRA_CHEST_SITES.V4R)),
  V7: surfacePos(chestSurface(EXTRA_CHEST_SITES.V7)),
  V8: surfacePos(chestSurface(EXTRA_CHEST_SITES.V8)),
  V9: surfacePos(chestSurface(EXTRA_CHEST_SITES.V9)),
};

/** The standard chest sites as (intercostal space, line, side). */
export const STANDARD_CHEST: Readonly<Record<ChestCable, ChestSite>> = STANDARD_CHEST_SITES;

/** A body site that render.ts does not compute: its position (near field) and WCT-gauge lead vector (far field). */
export interface SiteDef {
  readonly pos: Vec3;
  readonly lv: Vec3;
}

/** Resolved hook-up: the site key each cable records, the extra leads requested, and the non-computed sites in use. */
export interface Hookup {
  readonly RA: string;
  readonly LA: string;
  readonly LL: string;
  readonly V1: string;
  readonly V2: string;
  readonly V3: string;
  readonly V4: string;
  readonly V5: string;
  readonly V6: string;
  /** extra leads to deliver, in request order (each the Wilson lead of its own electrode) */
  readonly extra: readonly ExtraLead[];
  readonly extraSite: Readonly<Partial<Record<ExtraLead, string>>>;
  /** every site of this hook-up outside COMPUTED_SITES */
  readonly sites: Readonly<Record<string, SiteDef>>;
}

export const STANDARD_HOOKUP: Hookup = {
  RA: 'RA', LA: 'LA', LL: 'LL', V1: 'V1', V2: 'V2', V3: 'V3', V4: 'V4', V5: 'V5', V6: 'V6', extra: [], extraSite: {}, sites: {},
};

/** True when the hook-up needs potentials beyond the nine computed sites. */
export const needsExtraSites = (h: Hookup): boolean => Object.keys(h.sites).length > 0;

const sameSite = (a: ChestSite, b: ChestSite): boolean => a.ics === b.ics && a.line === b.line && a.side === b.side;

/** Key and definition of an explicit chest site (standard sites resolve to their computed key). */
export function chestSiteKey(s: ChestSite): { readonly key: string; readonly def: SiteDef | null } {
  const std = (Object.entries(STANDARD_CHEST_SITES) as [ChestCable, ChestSite][]).find(([, x]) => sameSite(x, s));
  if (std) return { key: std[0], def: null };
  if (!(s.ics >= 1 && s.ics <= 9)) throw new Error(`src/synth: intercostal space ${s.ics} is outside 1–9`);
  const sp = chestSurface(s);
  if (!inLeadTable(sp)) throw new Error(`src/synth: chest site (${s.ics}th ICS, ${s.line} line, ${s.side}) is outside the baked lead table (right-sided back sites are not baked)`);
  return { key: `chest:${s.ics}:${s.line}:${s.side}`, def: { pos: surfacePos(sp), lv: chestLeadVector(sp) } };
}

/**
 * Resolve a PlacementSpec (and the requested extra leads) into a hook-up. Limb cables: `limbs` maps a cable to the
 * limb it is clipped to (all four cables on four different limbs); `limbsOnTorso` moves the four electrodes to the
 * Mason–Likar torso sites. Chest cables: a cable name (swap) or an explicit site.
 */
export function resolvePlacement(p: PlacementSpec | undefined, extraLeads: readonly ExtraLead[] = []): Hookup {
  if (!p && extraLeads.length === 0) return STANDARD_HOOKUP;
  const sites: Record<string, SiteDef> = {};
  // limbs
  const limbs: Record<LimbCable, LimbCable> = { RA: 'RA', LA: 'LA', LL: 'LL', RL: 'RL' };
  for (const [cable, site] of Object.entries(p?.limbs ?? {}) as [LimbCable, LimbCable | undefined][]) if (site) limbs[cable] = site;
  if (new Set(Object.values(limbs)).size !== 4) throw new Error('src/synth: a limb placement must clip the four cables to four different limbs');
  const limbKey = (limb: LimbCable): string => {
    if (p?.limbsOnTorso) {
      const key = `${limb}@ml`;
      sites[key] = masonLikarSite(limb);
      return key;
    }
    return limb === 'RL' ? 'LL' : limb; // legs are equipotential at their junctions
  };
  // chest
  const chest: Record<ChestCable, string> = { V1: 'V1', V2: 'V2', V3: 'V3', V4: 'V4', V5: 'V5', V6: 'V6' };
  for (const [cable, site] of Object.entries(p?.chest ?? {}) as [ChestCable, ChestCable | ChestSite | undefined][]) {
    if (!site) continue;
    if (typeof site === 'string') {
      chest[cable] = site;
      continue;
    }
    const { key, def } = chestSiteKey(site);
    chest[cable] = key;
    if (def) sites[key] = def;
  }
  // extra leads
  const extraSite: Partial<Record<ExtraLead, string>> = {};
  const extra: ExtraLead[] = [];
  for (const l of extraLeads) {
    if (extraSite[l]) continue;
    const sp = chestSurface(EXTRA_CHEST_SITES[l]);
    sites[l] = { pos: surfacePos(sp), lv: chestLeadVector(sp) };
    extraSite[l] = l;
    extra.push(l);
  }
  return { RA: limbKey(limbs.RA), LA: limbKey(limbs.LA), LL: limbKey(limbs.LL), ...chest, extra, extraSite, sites };
}
