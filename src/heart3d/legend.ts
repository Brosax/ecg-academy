/**
 * Pure presentation logic shared by the three.js view and the <Heart3D> chrome: which conduction fibres are drawn,
 * which legend entries (with the same colours as the 3D view) apply to the current options, and what the hover
 * tooltip says. No DOM, no three.js.
 */
import type { RegionStates } from '../core/ecg';
import { pick, type Lang } from '../core/l10n';
import { REGIONS, type RegionId } from '../core/regions';
import { th3 } from '../i18n/heart3d';
import {
  classifyState,
  conductionColor,
  infarctColor,
  myocardiumColor,
  stateColor,
  type HeartPalette,
  type HighlightTag,
  type Rgb,
  type StatePhase,
} from './colors';
import { VESSEL_LABELS, type HeartLabel } from './format';

export const isConductionId = (id: string): boolean => REGIONS[id as RegionId]?.group === 'conduction';

/**
 * Conduction fibres to draw: all of them with `showConduction`, otherwise only the conduction ids a lesson emphasizes
 * or the engine highlights (e.g. a blocked right bundle). A non-empty result switches the view to x-ray mode.
 */
export function shownConduction(
  showConduction: boolean,
  emphasize: readonly RegionId[],
  regions: RegionStates | null,
): 'all' | ReadonlySet<RegionId> {
  if (showConduction) return 'all';
  const s = new Set<RegionId>();
  for (const id of emphasize) if (isConductionId(id)) s.add(id);
  for (const id of Object.keys(regions?.highlights ?? {}) as RegionId[]) if (isConductionId(id)) s.add(id);
  return s;
}

export function anyConductionShown(shown: 'all' | ReadonlySet<RegionId>): boolean {
  return shown === 'all' || shown.size > 0;
}

/** Fixed legend order of the highlight tags (stable whatever order the engine lists its highlights in). */
export const HIGHLIGHT_ORDER = ['infarct', 'ischemia', 'hypertrophy', 'block', 'pathway', 'focus'] as const satisfies readonly HighlightTag[];

export const TAG_KEY = {
  infarct: 'tagInfarct',
  ischemia: 'tagIschemia',
  pathway: 'tagPathway',
  focus: 'tagFocus',
  block: 'tagBlock',
  hypertrophy: 'tagHypertrophy',
} as const satisfies Record<HighlightTag, string>;

export type LegendKey =
  | 'legendMyocardium'
  | 'legendRest'
  | 'legendAtrial'
  | 'legendQrs'
  | 'legendPlateau'
  | 'legendRepol'
  | 'legendConduction'
  | (typeof TAG_KEY)[HighlightTag];

export interface LegendItem {
  /** UI-string key in src/i18n/heart3d.ts */
  readonly key: LegendKey;
  readonly color: Rgb;
  readonly shape: 'box' | 'line' | 'ring';
}

/** Swatch colour of a highlight tag (same mapping as the 3D view). */
export function tagSwatch(tag: HighlightTag, P: HeartPalette): Rgb {
  switch (tag) {
    case 'infarct':
      return infarctColor(P);
    case 'pathway':
      return P.conduction;
    case 'focus':
      return P.highlight;
    default:
      return myocardiumColor(0, 'ventricle', tag, P);
  }
}

/**
 * Legend entries for the current options. Without region states (anatomy only, e.g. a real ECG) the activation
 * colours never appear, so only the myocardium, the conduction system (when drawn) and the highlights are listed.
 * A block on a conduction fibre (the usual case: a bundle branch, a fascicle, the AV node) is drawn as a grey fibre,
 * so its entry is a grey line; a block tag on myocardium is a greyed wall (box).
 */
export function legendItems(regions: RegionStates | null, conductionShown: boolean, P: HeartPalette): LegendItem[] {
  const out: LegendItem[] = [];
  if (regions) {
    out.push(
      { key: 'legendRest', color: stateColor(0, 'ventricle', P), shape: 'box' },
      { key: 'legendAtrial', color: stateColor(0.8, 'atria', P), shape: 'box' },
      { key: 'legendQrs', color: stateColor(0.8, 'ventricle', P), shape: 'box' },
      { key: 'legendPlateau', color: stateColor(1, 'ventricle', P), shape: 'box' },
      { key: 'legendRepol', color: stateColor(1.3, 'ventricle', P), shape: 'box' },
    );
  } else out.push({ key: 'legendMyocardium', color: stateColor(null, 'ventricle', P), shape: 'box' });
  if (conductionShown) out.push({ key: 'legendConduction', color: conductionColor(1, false, P), shape: 'line' });
  const hl = Object.entries(regions?.highlights ?? {});
  const tags = new Set(hl.map(([, tag]) => tag));
  const blockedFibre = hl.some(([id, tag]) => tag === 'block' && isConductionId(id));
  for (const tag of HIGHLIGHT_ORDER) {
    if (!tags.has(tag)) continue;
    if (tag === 'block' && blockedFibre) {
      out.push({ key: TAG_KEY.block, color: conductionColor(1, true, P), shape: 'line' });
      continue;
    }
    out.push({ key: TAG_KEY[tag], color: tagSwatch(tag, P), shape: tag === 'pathway' ? 'line' : tag === 'focus' ? 'ring' : 'box' });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ hover tooltip

/** UI-string key of each state phase (tooltip line under the region name). */
export const STATE_KEY = {
  rest: 'stateRest',
  depolarizing: 'stateDepolarizing',
  depolarized: 'stateDepolarized',
  repolarizing: 'stateRepolarizing',
} as const satisfies Record<StatePhase, string>;

const isVessel = (id: HeartLabel): boolean => (VESSEL_LABELS as readonly string[]).includes(id);

/** Localized name of a mesh label: region names from src/core/regions.ts, the vessel stubs from the dictionary. */
export function labelName(id: HeartLabel, lang: Lang): string {
  if (id === 'aorta') return th3.in(lang, 'aorta');
  if (id === 'pulmonary-trunk') return th3.in(lang, 'pulmonaryTrunk');
  return pick(REGIONS[id].name, lang);
}

/**
 * Percentage shown while a region depolarizes: 1…99 — "0 %" or "100 %" would contradict "depolarizing" (rest and
 * fully depolarized have their own words).
 */
export function depolarizingPct(fraction: number): number {
  return Math.min(99, Math.max(1, Math.round(fraction * 100)));
}

/**
 * Lines of the hover tooltip: the label name, then — for anatomical regions — the state at the cursor (null = no state to
 * report: anatomy only, no cursor yet, or a region the engine does not report) and the highlight tag. Vessel stubs show
 * only their name.
 */
export function tooltipLines(id: HeartLabel, state: number | null, tag: HighlightTag | undefined, lang: Lang): string[] {
  const lines = [labelName(id, lang)];
  if (isVessel(id)) return lines;
  if (state !== null) {
    const s = classifyState(state);
    lines.push(th3.in(lang, STATE_KEY[s.phase], { pct: depolarizingPct(s.fraction) }));
  }
  if (tag) lines.push(th3.in(lang, TAG_KEY[tag]));
  return lines;
}

/** Upper-case the first letter (legend rows reuse the lower-case tooltip phrases; no effect on Chinese). */
export function capitalize(s: string): string {
  // locale-independent on purpose (a Turkish-locale browser would turn "i" into "İ"); zh has no case
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
