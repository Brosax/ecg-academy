/** Small display helpers shared by the real-case pages (pure). */
import { store, type LayoutId } from '../app/store';
import type { Lang } from '../core/l10n';
import { tr } from '../i18n/real';
import type { RealCaseMeta, ScpStatement } from './api';
import type { AxisClass, MeasureKey } from './reading';
import type { CaseCategory, LikelihoodWord } from './scp';

/** Case numbers are shown with three digits ("Case 007") so cards align. */
export function caseNumber(n: number): string {
  return String(n).padStart(3, '0');
}

export function sexLabel(sex: RealCaseMeta['sex'], lang?: Lang): string {
  const key = sex === 'M' ? 'sexM' : sex === 'F' ? 'sexF' : 'sexUnknown';
  return lang ? tr.in(lang, key) : tr(key);
}

export function ageLabel(age: number | null, lang?: Lang): string {
  if (age == null) return lang ? tr.in(lang, 'ageUnknown') : tr('ageUnknown');
  return lang ? tr.in(lang, 'ageYears', { n: age }) : tr('ageYears', { n: age });
}

/** "female, 63 y" — the only patient data shown before the reveal. */
export function patientLine(c: Pick<RealCaseMeta, 'sex' | 'age'>, lang?: Lang): string {
  const sex = sexLabel(c.sex, lang);
  const age = ageLabel(c.age, lang);
  return lang ? tr.in(lang, 'patientLine', { sex, age }) : tr('patientLine', { sex, age });
}

export const CATEGORY_KEY = {
  all: 'catAll',
  normal: 'catNormal',
  rhythm: 'catRhythm',
  conduction: 'catConduction',
  hypertrophy: 'catHypertrophy',
  infarction: 'catInfarction',
  ischemia: 'catIschemia',
  other: 'catOther',
} as const satisfies Record<CaseCategory | 'all', string>;

/** Signed number with a true minus sign ("+12", "−8", "0"). */
export function signed(v: number): string {
  const r = Math.round(v);
  if (r === 0) return '0';
  return r > 0 ? `+${r}` : `−${Math.abs(r)}`;
}

const LOCALE: Readonly<Record<Lang, string>> = { zh: 'zh-CN', en: 'en-GB', es: 'es-ES' };
const decimalFormats = new Map<string, Intl.NumberFormat>();

/** A number with a fixed count of decimals in the language's notation ("1.25", "1,25"); defaults to the UI language. */
export function decimal(v: number, digits: number, lang: Lang = store.lang.value): string {
  const key = `${lang}|${digits}`;
  let f = decimalFormats.get(key);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE[lang], { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false });
    decimalFormats.set(key, f);
  }
  return f.format(v);
}

/** Integer with a true minus sign, or an em dash for null. */
export function numOrDash(v: number | null): string {
  if (v == null) return '—';
  const r = Math.round(v);
  return r < 0 ? `−${Math.abs(r)}` : String(r);
}

/** PTB-XL infarction_stadium → dictionary key (null when the record has no stadium). */
export function stadiumKey(
  stadium: string | null | undefined,
): 'stadiumI' | 'stadiumI_II' | 'stadiumII' | 'stadiumII_III' | 'stadiumIII' | 'stadiumUnknown' | null {
  if (stadium == null) return null;
  switch (stadium.trim()) {
    case 'Stadium I':
      return 'stadiumI';
    case 'Stadium I-II':
      return 'stadiumI_II';
    case 'Stadium II':
      return 'stadiumII';
    case 'Stadium II-III':
      return 'stadiumII_III';
    case 'Stadium III':
      return 'stadiumIII';
    default:
      return 'stadiumUnknown';
  }
}

export const KIND_KEY = { diagnostic: 'kindDiagnostic', form: 'kindForm', rhythm: 'kindRhythm' } as const satisfies Record<
  ScpStatement['kind'],
  string
>;

export const LIKELIHOOD_KEY = {
  definite: 'lhDefinite',
  probable: 'lhProbable',
  possible: 'lhPossible',
  unlikely: 'lhUnlikely',
} as const satisfies Record<LikelihoodWord, string>;

export const MEASURE_LABEL_KEY = {
  hr: 'mHr',
  pr: 'mPr',
  qrs: 'mQrs',
  qt: 'mQt',
  qtcB: 'mQtcB',
  qtcF: 'mQtcF',
  axis: 'mAxis',
  pAxis: 'mPAxis',
  tAxis: 'mTAxis',
} as const satisfies Record<MeasureKey, string>;

/** Signed angle with a degree sign ("+39°", "−45°"), or an em dash. */
export function degOrDash(v: number | null): string {
  if (v == null) return '—';
  const r = Math.round(v);
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r)}°`;
}

export const AXIS_KEY = { normal: 'axisNormal', lad: 'axisLad', rad: 'axisRad', extreme: 'axisExtreme' } as const satisfies Record<
  AxisClass,
  string
>;

/** Layouts that show all 12 leads; a case always opens on one of them (the toolbar can still switch to one lead). */
const TWELVE_LEAD_LAYOUTS: readonly LayoutId[] = ['3x4+1', '3x4+3', '6x2', '12x1'];

/** The layout a case opens with: the learner's setting when it shows all 12 leads, else the standard 3×4+1 sheet. */
export function caseLayout(setting: LayoutId): LayoutId {
  return TWELVE_LEAD_LAYOUTS.includes(setting) ? setting : '3x4+1';
}

/**
 * Median width / height of the viewer's sheet over the 300 records (10 s, 25 mm/s, 10 mm/mV), per layout. Rows grow with
 * the QRS amplitude, so one tracing can differ (3×4+1: 0.98–2.94); the loading placeholder uses the median so the
 * tracing replaces it with as little movement as possible.
 */
export const SHEET_RATIO: Readonly<Record<LayoutId, number>> = {
  '3x4+1': 2.12,
  '3x4+3': 1.43,
  '6x2': 1.46,
  '12x1': 0.83,
  single: 2.12,
  strip: 2.12,
};
