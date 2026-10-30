/**
 * Declared + derived findings and the voltage / ST facts of the truth (DECISION §6.10). Thresholds are the "current
 * value" column of docs/curriculum/criteria.md; the row id (or, for the bullet lists of criteria.md, the bullet title)
 * is recorded next to each constant (DECISION §13.3).
 *
 * Findings of a mechanism (STEMI by territory, LVH, Brugada…) are DECLARED by the scenario; only the measurable,
 * threshold-defined findings are derived here (rate class, axis, AV block 1, short PR, QT, low voltage, poor R
 * progression). Voltage criteria and the STEMI millimetre criterion are reported as facts, not findings: an athlete
 * with isolated voltage criteria does not have "LVH", and an occlusion MI may not meet the millimetre criterion.
 */
import type { FindingId } from '../../core/findings';
import type { Lead, StdLead } from '../../core/leads';

export const THRESHOLDS = {
  /** sinus-pr-rate-rr: sinus tachycardia > 100, ECG-report bradycardia < 60, sinus arrhythmia PP variation > 120 ms */
  sinusTachy: 100,
  sinusBrady: 60,
  sinusArrhythmiaMs: 120,
  /** qrs-axis-adult: normal −30…+90; LAD < −30 (to −90); RAD > +90 (to +180); −90…±180 extreme (northwest) */
  axisNormalLo: -30,
  axisNormalHi: 90,
  /** first-degree-avb / pr-normal: PR > 200 ms; short PR < 120 ms (wpw-criteria, without a delta wave) */
  prLong: 200,
  prShort: 120,
  /** qtc-bazett / qt-max-table: prolonged ≥ 450 (men) / ≥ 460 (women); short ≤ 390 (AHA 2009 Part IV) */
  qtcLongMale: 450,
  qtcLongFemale: 460,
  qtcShort: 390,
  /** qtc-bazett / qt-max-table: marked prolongation > 500 ms (torsade risk); LQTS diagnosis ≥ 480; short QT syndrome ≤ 360 */
  qtcMarked: 500,
  qtcLqts: 480,
  qtcShortSyndrome: 360,
  /** short QT in tachycardia: above this rate the Fridericia correction is unreliable (Rautaharju 2009 Part IV: rate
   *  correction errors grow at fast rates) and a QTc just under 390 is no evidence of a short QT — only a QTc at the
   *  short-QT-syndrome limit (≤ 360) is derived there (above 150/min no QT finding is derived at all: truth.ts) */
  qtcShortTachyBpm: 100,
  /** bbb-qrs-cutoff: QRS ≥ 120 → judge repolarisation on a QRS-adjusted QT (qtc-bazett: "use the JT interval") */
  qrsWide: 120,
  /** voltage (h4 low voltage): every limb-lead QRS < 0.5 mV p2p, or every chest lead < 1.0 mV */
  lowVoltLimb: 0.5,
  lowVoltChest: 1.0,
  /** precordial-progression: poor R-wave progression = R in V3 ≤ 0.3 mV */
  prwpV3: 0.3,
  /** lvh-axis-voltage: Sokolow–Lyon SV1 + max(RV5, RV6) > 35 mm; Cornell RaVL + SV3 > 28 mm (men) / > 20 mm (women) */
  sokolowMm: 35,
  cornellMaleMm: 28,
  cornellFemaleMm: 20,
  /** criteria.md LVH bullet "Peguero-Lo Presti" (Peguero JG et al., JACC 2017;69:1694): deepest S + S V4 ≥ 28 mm (men) / ≥ 23 mm (women) */
  pegueroMaleMm: 28,
  pegueroFemaleMm: 23,
  /**
   * criteria.md "STEMI — ST-elevation thresholds" and "Normal ST elevation" (UDMI 2018 / ESC 2023): new J-point ST
   * elevation in ≥ 2 contiguous leads, ≥ 0.1 mV in every lead except V2–V3; in V2–V3 ≥ 0.2 mV in men ≥ 40 y,
   * ≥ 0.25 mV in men < 40 y, ≥ 0.15 mV in women.
   */
  stemiOtherMv: 0.1,
  stemiV2V3MenMv: 0.2,
  stemiV2V3YoungMenMv: 0.25,
  stemiV2V3WomenMv: 0.15,
  stemiYoungMenAgeY: 40,
  /** criteria.md "Supplemental leads": V7–V9 ≥ 0.05 mV (≥ 0.1 mV in men < 40 y); V3R / V4R ≥ 0.05 mV (≥ 0.1 mV in men < 30 y) */
  stemiPosteriorMv: 0.05,
  stemiPosteriorYoungMenMv: 0.1,
  stemiRightMv: 0.05,
  stemiRightYoungMenMv: 0.1,
  stemiRightYoungMenAgeY: 30,
  /** posterior-mi: isolated ST depression ≥ 0.05 mV in V1–V3 prompts V7–V9 */
  posteriorStDepressionMv: 0.05,
  /** early-repolarization: J-point (Jp) ≥ 0.1 mV in ≥ 2 contiguous inferior / lateral leads */
  earlyRepolJpMv: 0.1,
} as const;

export type Sex = 'female' | 'male' | null;

/**
 * J-point ST elevation that meets the STEMI criterion in one lead (criteria.md STEMI thresholds; sex / age-specific in
 * V2–V3 and in the supplemental leads). Unknown sex → the more sensitive limit; unknown age → the ≥ 40 y limit.
 */
export function stemiThresholdMv(lead: Lead, sex: Sex, ageY: number | null): number {
  const T = THRESHOLDS;
  const youngMan = (limit: number): boolean => sex === 'male' && ageY !== null && ageY < limit;
  if (lead === 'V2' || lead === 'V3') {
    if (sex === 'male') return youngMan(T.stemiYoungMenAgeY) ? T.stemiV2V3YoungMenMv : T.stemiV2V3MenMv;
    return T.stemiV2V3WomenMv;
  }
  if (lead === 'V7' || lead === 'V8' || lead === 'V9') return youngMan(T.stemiYoungMenAgeY) ? T.stemiPosteriorYoungMenMv : T.stemiPosteriorMv;
  if (lead === 'V3R' || lead === 'V4R') return youngMan(T.stemiRightYoungMenAgeY) ? T.stemiRightYoungMenMv : T.stemiRightMv;
  return T.stemiOtherMv;
}

/** Contiguous lead groups of the STEMI criterion (criteria.md: I / aVL / V5–V6; II / III / aVF; V1–V6; extras). */
export const CONTIGUOUS: readonly (readonly Lead[])[] = [
  ['aVL', 'I', 'V5', 'V6'], ['II', 'aVF', 'III'], ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'], ['V7', 'V8', 'V9'], ['V3R', 'V4R'],
];

/**
 * The STEMI millimetre criterion on J-point ST values (mV): ≥ 2 neighbouring leads of one contiguous group at or above
 * their thresholds. Returns the leads that meet it (empty: not met).
 */
export function stemiCriterionLeads(stJ: Readonly<Partial<Record<Lead, number>>>, sex: Sex, ageY: number | null): Lead[] {
  const met = new Set<Lead>();
  for (const g of CONTIGUOUS) {
    for (let i = 0; i + 1 < g.length; i++) {
      const a = g[i], b = g[i + 1];
      const va = stJ[a], vb = stJ[b];
      if (va === undefined || vb === undefined) continue;
      if (va >= stemiThresholdMv(a, sex, ageY) && vb >= stemiThresholdMv(b, sex, ageY)) {
        met.add(a);
        met.add(b);
      }
    }
  }
  return [...met];
}

/** QTcF (ms) at or below which `short-qt` is derived: 390 (AHA 2009), but at rates above 100/min only the short-QT
 *  syndrome limit 360 — a borderline-short QTc in tachycardia is a rate-correction artefact, not a finding. */
export function shortQtLimit(hrBpm: number): number {
  return hrBpm > THRESHOLDS.qtcShortTachyBpm ? THRESHOLDS.qtcShortSyndrome : THRESHOLDS.qtcShort;
}

/** QTc limit (ms) at or above which the QT is prolonged, by sex (qtc-bazett: ≥ 450 men, ≥ 460 women; unknown: 460). */
export function qtcLongLimit(sex: Sex): number {
  return sex === 'male' ? THRESHOLDS.qtcLongMale : THRESHOLDS.qtcLongFemale;
}

/**
 * ST facts of the truth (graders and feedback): the STEMI threshold in V2–V3 for this patient and the leads that meet
 * the millimetre criterion, from the J-point ST of every recorded lead (truth.ts, median over the dominant beats).
 */
export function stFacts(stJ: Readonly<Partial<Record<Lead, number>>>, sex: Sex, ageY: number | null, applies = true): Record<string, string> {
  const threshold = String(Math.round(stemiThresholdMv('V2', sex, ageY) * 100) / 10);
  // LBBB and ventricular paced / ventricular rhythms: the millimetre criterion is not used (their secondary ST is
  // discordant by design); occlusion is judged with the Sgarbossa–Smith rules (criteria.md, UDMI 2018 confounders)
  if (!applies) return { stemiThresholdV2V3Mm: threshold, stemiCriterionLeads: '', stemiCriterionMet: 'not-applicable' };
  const leads = stemiCriterionLeads(stJ, sex, ageY);
  return {
    stemiThresholdV2V3Mm: threshold,
    stemiCriterionLeads: leads.join(' '),
    stemiCriterionMet: leads.length ? 'yes' : 'no',
  };
}

export interface LeadAmps {
  /** max positive and most negative QRS deflection vs the PR level (mV) */
  readonly r: number;
  readonly s: number;
}

export interface DerivedInput {
  readonly declared: readonly FindingId[];
  readonly rhythm: FindingId;
  readonly hrBpm: number;
  readonly ppRangeMs: number | null;
  readonly prMs: number | null;
  readonly qrsMs: number;
  /** QTcF graded for the long / short QT findings: in an irregular rhythm the mean of the per-beat QTcF over the
   *  strip (criteria.md qtc-bazett: "in atrial fibrillation, average over about 10 beats"), else the reported QTcF */
  readonly qtcFridericiaMs: number;
  readonly axisDeg: number;
  readonly amps: Readonly<Record<StdLead, LeadAmps>>;
  readonly sex: Sex;
  readonly ventricularRhythm: boolean;
  /** the dominant complexes come from a ventricular focus (VT, AIVR, ventricular escape; not pacing) */
  readonly ventricularFocus?: boolean;
  /** patient age (years; null: unknown) */
  readonly ageY?: number | null;
}

/** Sinus rhythm relabelled by rate / PP variation (sinus-pr-rate-rr). */
export function sinusLabel(hrBpm: number, ppRangeMs: number | null): FindingId {
  // the rate a reader reports is a whole number per minute: 59.97 /min is 60 /min, not bradycardia (< 60)
  const r = Math.round(hrBpm);
  if (r > THRESHOLDS.sinusTachy) return 'sinus-tachycardia';
  if (r < THRESHOLDS.sinusBrady) return 'sinus-bradycardia';
  if (ppRangeMs !== null && ppRangeMs > THRESHOLDS.sinusArrhythmiaMs) return 'sinus-arrhythmia';
  return 'sinus-rhythm';
}

export function axisFinding(deg: number): FindingId {
  if (deg >= THRESHOLDS.axisNormalLo && deg <= THRESHOLDS.axisNormalHi) return 'axis-normal';
  if (deg < THRESHOLDS.axisNormalLo && deg >= -90) return 'lad';
  if (deg > THRESHOLDS.axisNormalHi && deg <= 180) return 'rad';
  return 'extreme-axis';
}

/** poor R progression is not derived in LBBB (QS / rS in V1–V3 belong to the block) nor in dextrocardia (reversed) */
const PRWP_EXCLUDED: readonly FindingId[] = ['lbbb', 'dextrocardia'];
const SINUS_FAMILY: readonly FindingId[] = ['sinus-rhythm', 'sinus-bradycardia', 'sinus-tachycardia', 'sinus-arrhythmia'];
/** derived findings that make a declared 'normal-ecg' false */
const NOT_NORMAL: readonly FindingId[] = ['lad', 'rad', 'extreme-axis', 'av-block-1', 'short-pr', 'long-qt', 'short-qt', 'low-voltage', 'poor-r-progression', 'sinus-tachycardia'];

export function deriveFindings(d: DerivedInput): FindingId[] {
  const out = new Set<FindingId>(d.declared);
  // rhythm: the sinus family is relabelled; the declared sinus label is replaced
  if (SINUS_FAMILY.includes(d.rhythm)) {
    for (const f of SINUS_FAMILY) out.delete(f);
    out.add(d.rhythm);
  }
  if (!d.ventricularRhythm) out.add(axisFinding(d.axisDeg));
  // wct-morphology: a right-superior ('northwest', −90…±180°) axis of ventricular complexes favours VT — the one axis
  // category reported for a rhythm of ventricular origin (LAD / RAD are not applied to ventricular complexes)
  else if (d.ventricularFocus && axisFinding(d.axisDeg) === 'extreme-axis') out.add('extreme-axis');
  if (d.prMs !== null && d.prMs > THRESHOLDS.prLong) out.add('av-block-1');
  if (d.prMs !== null && d.prMs < THRESHOLDS.prShort && !d.declared.includes('wpw')) out.add('short-pr');
  if (!d.ventricularRhythm) {
    const adj = d.qrsMs >= THRESHOLDS.qrsWide ? d.qtcFridericiaMs - (d.qrsMs - 100) : d.qtcFridericiaMs;
    if (adj >= qtcLongLimit(d.sex)) out.add('long-qt');
    else if (adj <= shortQtLimit(d.hrBpm)) out.add('short-qt');
  }
  const limb: StdLead[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];
  const chest: StdLead[] = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
  const p2p = (l: StdLead): number => d.amps[l].r - d.amps[l].s;
  if (limb.every((l) => p2p(l) < THRESHOLDS.lowVoltLimb) || chest.every((l) => p2p(l) < THRESHOLDS.lowVoltChest)) out.add('low-voltage');
  if (!d.ventricularRhythm && d.amps.V3.r <= THRESHOLDS.prwpV3 && !d.declared.some((f) => PRWP_EXCLUDED.includes(f))) out.add('poor-r-progression');
  if (out.has('normal-ecg') && NOT_NORMAL.some((f) => out.has(f))) out.delete('normal-ecg');
  return [...out];
}

/**
 * LVH voltage criteria in mm at 10 mm/mV (truth facts) with their sex-specific thresholds and the criteria met
 * (lvh-axis-voltage: Sokolow–Lyon > 35 mm, Cornell > 28 / 20 mm; Peguero–Lo Presti ≥ 28 / 23 mm).
 */
export function voltageFacts(a: Readonly<Record<StdLead, LeadAmps>>, sex: Sex): Record<string, string> {
  const mm = (v: number): number => Math.round(v * 100) / 10;
  const sok = mm(-a.V1.s + Math.max(a.V5.r, a.V6.r));
  const cornell = mm(a.aVL.r - a.V3.s);
  const deepestS = Math.min(...(Object.values(a) as LeadAmps[]).map((x) => x.s));
  const peguero = mm(-deepestS - a.V4.s);
  const cornellTh = sex === 'female' ? THRESHOLDS.cornellFemaleMm : THRESHOLDS.cornellMaleMm;
  const pegueroTh = sex === 'female' ? THRESHOLDS.pegueroFemaleMm : THRESHOLDS.pegueroMaleMm;
  const met = [
    ...(sok > THRESHOLDS.sokolowMm ? ['sokolow-lyon'] : []),
    ...(cornell > cornellTh ? ['cornell'] : []),
    ...(peguero >= pegueroTh ? ['peguero-lo-presti'] : []),
  ];
  return {
    sokolowLyonMm: String(sok),
    cornellMm: String(cornell),
    pegueroLoPrestiMm: String(peguero),
    cornellThresholdMm: String(cornellTh),
    pegueroThresholdMm: String(pegueroTh),
    lvhVoltageCriteria: met.join(' ') || 'none',
  };
}
