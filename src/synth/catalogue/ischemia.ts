/**
 * §9.7 Ischaemia and infarction, organised around the occlusion-MI decision a reader has to make:
 *  - acute occlusion by territory (injury current solved from the ST at J+60 in a reference lead; hyperacute T from
 *    epicardial APD shortening; reciprocal changes follow from the one injury vector, never drawn per lead);
 *  - the STEMI equivalents: posterior (V1–V3 ST depression with upright T; V7–V9 when synth-leads delivers the extra
 *    leads), RV involvement (V1 ST elevation; V4R likewise), de Winter, hyperacute T, a subtle anterior occlusion below
 *    the STEMI thresholds (disproportionate ST elevation, bulky T, reciprocal depression);
 *  - the non-occlusion patterns: Wellens A/B (reperfused LAD, epicardial APD prolongation), aVR elevation with diffuse
 *    subendocardial ST depression, regional ST depression and ischaemic T inversion;
 *  - the course (stage maps of morph/stage.ts), old MI (necrosis), aneurysm, MI in LBBB (Sgarbossa / Smith), takotsubo.
 * Mimics live in their own groups and are meant to be shown side by side: early repolarisation (normal), pericarditis
 * and Brugada (structural), LVH strain (chambers), LBBB (conduction), hyperkalaemia (repolarization).
 * Hallmark criteria: tests/synth/oracle/criteria/ischemia.ts.
 */
import type { RegionId } from '../../core/regions';
import { l } from '../../core/l10n';
import type { RegionHighlight } from '../api';
import { infarctStage } from '../morph/stage';
import { defineGroup } from './define';

const SINUS = (rateBpm: number, hrv = 0.02) => ({ kind: 'sinus', rateBpm, hrv }) as const;

/** AHA LAD segments 1, 2, 7, 8, 13, 14, 17 (Cerqueira 2002); proximal occlusion. */
const LAD: readonly RegionId[] = ['lv-basal-anterior', 'lv-basal-anteroseptal', 'lv-mid-anterior', 'lv-mid-anteroseptal', 'lv-apical-anterior', 'lv-apical-septal', 'lv-apex'];
/** The septal wall of the LAD (septal perforators): basal to apical septum plus the mid-anterior wall. */
const ANTEROSEPTAL: readonly RegionId[] = ['lv-basal-anteroseptal', 'lv-mid-anteroseptal', 'lv-apical-septal', 'lv-mid-anterior'];
/** LAD after the first diagonal and septal branches: the anteroseptal wall below the base. */
const LAD_MID: readonly RegionId[] = ['lv-mid-anteroseptal', 'lv-mid-anterior', 'lv-apical-anterior', 'lv-apical-septal', 'lv-apex'];
const DIAGONAL: readonly RegionId[] = ['lv-basal-anterolateral', 'lv-mid-anterolateral', 'lv-basal-anterior'];
/**
 * First-diagonal occlusion: the high anterolateral wall (AHA 6) with the adjoining basal anteroseptal rim (AHA 2) as a
 * second, weaker share of the same injury. The anterolateral share points superior-leftward (ST↑ I and aVL, ST↓ III
 * and aVF) and pulls V5–V6 up; the anteroseptal share points anterior (ST↑ V1–V2) and pulls V5–V6 down, so together
 * they draw the "South African flag" of Littmann 2016: ST↑ I, aVL and V2 (V1 ≈ V2 the precordial maximum, V3 lower,
 * V4–V6 under 1 mm) with ST↓ III and aVF. The mid-anterior wall is left out: it faces V3–V4 (ST↑ V3 > V2).
 */
const D1_LATERAL: readonly RegionId[] = ['lv-basal-anterolateral'];
const D1_SEPTAL: readonly RegionId[] = ['lv-basal-anteroseptal'];
const D1: readonly RegionId[] = [...D1_LATERAL, ...D1_SEPTAL];
/** obtuse-marginal / LCx lateral wall (AHA 6, 12, 16): ST↑ in I, aVL, V5–V6 with inferior reciprocity */
const LATERAL_WALL: readonly RegionId[] = ['lv-basal-anterolateral', 'lv-mid-anterolateral', 'lv-apical-lateral'];
const LATERAL: readonly RegionId[] = ['lv-basal-anterolateral', 'lv-mid-anterolateral', 'lv-apical-lateral', 'lv-mid-inferolateral', 'lv-basal-inferolateral'];
const INFERIOR_RCA: readonly RegionId[] = ['lv-basal-inferoseptal', 'lv-basal-inferior', 'lv-mid-inferoseptal', 'lv-mid-inferior', 'lv-apical-inferior', 'lv-basal-inferolateral'];
const INFERIOR_LCX: readonly RegionId[] = ['lv-basal-inferior', 'lv-mid-inferior', 'lv-basal-inferolateral', 'lv-mid-inferolateral', 'lv-apical-lateral'];
/** the posterobasal wall (AHA segments 5 and 6, LCx) that faces V7–V9: together their injury vector is posterior */
const POSTERIOR: readonly RegionId[] = ['lv-basal-inferolateral', 'lv-basal-anterolateral'];
/** the true posterior wall (AHA segment 5, basal inferolateral): its normal faces the back (V7–V9) */
const POSTERIOR_WALL: readonly RegionId[] = ['lv-basal-inferolateral'];
/** the lateral wall of an obtuse-marginal / LCx occlusion that joins a posterior injury (posterolateral STEMI) */
const OM_LATERAL: readonly RegionId[] = ['lv-basal-anterolateral', 'lv-mid-anterolateral', 'lv-mid-inferolateral', 'lv-apical-lateral'];
/** the posterior scar of an evolved posterior MI (segments 5 and 11) */
const POSTERIOR_SCAR: readonly RegionId[] = ['lv-basal-inferolateral', 'lv-mid-inferolateral', 'lv-basal-anterolateral', 'lv-basal-inferior', 'lv-mid-anterolateral'];
const RV: readonly RegionId[] = ['rv-basal', 'rv-mid', 'rv-apical'];
const APICAL: readonly RegionId[] = ['lv-apical-anterior', 'lv-apical-septal', 'lv-apical-inferior', 'lv-apical-lateral', 'lv-apex', 'lv-mid-anterior', 'lv-mid-anterolateral'];
/** the reperfused LAD wall of Wellens syndrome (mid / apical LAD with the basal anterior and anteroseptal segments) */
const WELLENS: readonly RegionId[] = [...LAD_MID, 'lv-basal-anteroseptal', 'lv-basal-anterior'];
/** the mid walls around the ballooned apex (late takotsubo: widespread deep T inversion V2–V6, I, aVL) */
const TAKOTSUBO_MID: readonly RegionId[] = ['lv-mid-anteroseptal', 'lv-mid-inferolateral', 'lv-mid-inferior'];
/** the whole LV (subendocardial ischaemia of multivessel / left-main disease) */
const LV_ALL: readonly RegionId[] = [
  'lv-basal-anterior', 'lv-basal-anteroseptal', 'lv-basal-inferoseptal', 'lv-basal-inferior', 'lv-basal-inferolateral', 'lv-basal-anterolateral',
  'lv-mid-anterior', 'lv-mid-anteroseptal', 'lv-mid-inferoseptal', 'lv-mid-inferior', 'lv-mid-inferolateral', 'lv-mid-anterolateral',
  'lv-apical-anterior', 'lv-apical-septal', 'lv-apical-inferior', 'lv-apical-lateral', 'lv-apex',
];

const mark = (ids: readonly RegionId[], h: RegionHighlight): Partial<Record<RegionId, RegionHighlight>> => Object.fromEntries(ids.map((id) => [id, h]));

const ANTERIOR_COURSE = { where: [...LAD], peakStMv: 0.32, ref: 'V2', scarWhere: [...LAD_MID], inversionWhere: [...ANTEROSEPTAL, 'lv-apical-anterior'] } as const;
const evo = (stage: number) => infarctStage(ANTERIOR_COURSE, stage);

export const ISCHEMIA_SCENARIOS = defineGroup('ischemia', [
  // ── acute occlusion by territory ────────────────────────────────────────────────────────────────────────────────
  {
    id: 'stemi-anterior',
    group: 'ischemia',
    findings: ['stemi-anterior', 'reciprocal-changes', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 58 },
    source: {
      rhythm: SINUS(84, 0.015),
      activation: { kind: 'conducted' },
      // acute stage: the injury current (ST elevation from the J point) dominates; the T keeps its normal size on top of
      // the displaced ST (judges: hyperacute-looking T of 1.25–1.4 mV was wrong for this stage)
      // the AHA LAD segments (1, 2, 7, 8, 13, 14, 17; Cerqueira 2002): the anterolateral wall (D1) is variable
      injury: [{ where: [...LAD], layer: 'transmural', stMv: 0.3, ref: 'V2' }],
    },
    dials: { rate: { min: 65, max: 105 }, st: { min: 0.22, max: 0.45 } },
    facts: { territory: 'anterior', culprit: 'LAD (proximal)' },
    highlights: mark([...LAD, 'lv-mid-anterolateral'], 'ischemia'),
  },
  {
    id: 'stemi-anterior-subtle',
    group: 'ischemia',
    findings: ['stemi-anterior', 'hyperacute-t', 'reciprocal-changes', 'sinus-rhythm'],
    title: l('隐匿性前壁闭塞性心肌梗死（未达 STEMI 标准）', 'Subtle anterior occlusion MI (below the STEMI thresholds)', 'IAM oclusivo anterior sutil (sin criterios de IAMCEST)'),
    patient: { sex: 'male', ageY: 52 },
    source: {
      rhythm: SINUS(78),
      activation: { kind: 'conducted' },
      // ST elevation below the V2–V3 threshold but disproportionate to the QRS, with a bulky T (epicardial APD
      // shortening) and inferior reciprocity
      injury: [{ where: [...LAD], layer: 'transmural', stMv: 0.13, ref: 'V3' }],
      repol: { apd: [{ where: [...LAD], layer: 'epi', deltaMs: -55 }] },
    },
    dials: { rate: { min: 60, max: 95 } },
    facts: { territory: 'anterior', culprit: 'LAD (proximal)', teaching: 'occlusion MI without STEMI criteria: ST elevation disproportionate to the QRS, hyperacute T, inferior reciprocal depression' },
    highlights: mark([...LAD], 'ischemia'),
  },
  {
    id: 'stemi-anteroseptal',
    group: 'ischemia',
    findings: ['stemi-anteroseptal', 'sinus-rhythm'],
    patient: { sex: 'female', ageY: 64 },
    source: { rhythm: SINUS(80), activation: { kind: 'conducted' }, injury: [{ where: [...ANTEROSEPTAL], layer: 'transmural', stMv: 0.28, ref: 'V2' }] },
    dials: { rate: { min: 60, max: 100 }, st: { min: 0.2, max: 0.4 } },
    facts: { territory: 'anteroseptal', culprit: 'LAD (septal branches, after the first diagonal)' },
    highlights: mark(ANTEROSEPTAL, 'ischemia'),
  },
  {
    id: 'stemi-anterolateral',
    group: 'ischemia',
    findings: ['stemi-anterolateral', 'reciprocal-changes', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 61 },
    source: {
      rhythm: SINUS(88),
      activation: { kind: 'conducted' },
      injury: [{ where: [...LAD_MID, 'lv-mid-anterolateral', 'lv-apical-lateral', 'lv-basal-anterolateral'], layer: 'transmural', stMv: 0.3, ref: 'V4' }],
    },
    dials: { rate: { min: 65, max: 105 }, st: { min: 0.2, max: 0.4 } },
    facts: { territory: 'anterolateral', culprit: 'LAD with a large diagonal' },
    highlights: mark([...LAD_MID, 'lv-mid-anterolateral', 'lv-apical-lateral', 'lv-basal-anterolateral'], 'ischemia'),
  },
  {
    id: 'stemi-high-lateral',
    group: 'ischemia',
    findings: ['stemi-high-lateral', 'reciprocal-changes', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 57 },
    source: { rhythm: SINUS(76), activation: { kind: 'conducted' }, injury: [{ where: [...D1_LATERAL], layer: 'transmural', stMv: 0.24, ref: 'aVL' }, { where: [...D1_SEPTAL], layer: 'transmural', stMv: 0.16, ref: 'V2' }] },
    dials: { rate: { min: 60, max: 95 }, st: { min: 0.15, max: 0.28 } },
    facts: { territory: 'high lateral (high anterior wall)', culprit: 'first diagonal', pattern: 'ST↑ I, aVL and V2 with ST↓ III and aVF ("South African flag")' },
    highlights: mark(D1, 'ischemia'),
  },
  {
    id: 'stemi-lateral',
    group: 'ischemia',
    findings: ['stemi-lateral', 'reciprocal-changes', 'sinus-rhythm'],
    patient: { sex: 'female', ageY: 69 },
    source: { rhythm: SINUS(82), activation: { kind: 'conducted' }, injury: [{ where: [...LATERAL_WALL], layer: 'transmural', stMv: 0.2, ref: 'V6' }] },
    dials: { rate: { min: 60, max: 100 }, st: { min: 0.15, max: 0.3 } },
    facts: { territory: 'lateral', culprit: 'LCx / obtuse marginal' },
    highlights: mark(LATERAL_WALL, 'ischemia'),
  },
  {
    id: 'stemi-inferior',
    group: 'ischemia',
    findings: ['stemi-inferior', 'reciprocal-changes', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 63 },
    source: {
      rhythm: SINUS(66),
      activation: { kind: 'conducted' },
      injury: [{ where: 'rca-proximal', layer: 'transmural', stMv: 0.25, ref: 'III' }],
      repol: { apd: [{ where: 'rca-proximal', layer: 'epi', deltaMs: -15 }] },
    },
    dials: { rate: { min: 55, max: 95 }, st: { min: 0.15, max: 0.4 } },
    variants: {
      lcx: {
        label: l('回旋支闭塞', 'LCx occlusion', 'oclusión de la circunfleja'),
        patch: { injury: [{ where: [...INFERIOR_LCX], layer: 'transmural', stMv: 0.24, ref: 'II' }], repol: { apd: [{ where: [...INFERIOR_LCX], layer: 'epi', deltaMs: -15 }] } },
        findings: ['stemi-inferior', 'stemi-lateral', 'sinus-rhythm'],
      },
      posterior: {
        label: l('合并后壁受累', 'with posterior extension', 'con extensión posterior'),
        patch: { injury: [{ where: [...INFERIOR_RCA], layer: 'transmural', stMv: 0.25, ref: 'III' }, { where: [...POSTERIOR_WALL], layer: 'transmural', stMv: -0.14, ref: 'V2' }] },
        findings: ['stemi-inferior', 'stemi-posterior', 'reciprocal-changes', 'sinus-rhythm'],
      },
    },
    facts: {
      territory: 'inferior (variants: inferolateral, inferoposterior)',
      culprit: 'RCA (proximal); lcx variant: LCx (II ≥ III, ST↑ V5–V6); posterior variant: dominant RCA with its posterolateral branch (III > II)',
    },
    highlights: mark(INFERIOR_RCA, 'ischemia'),
  },
  {
    id: 'rv-infarction',
    group: 'ischemia',
    findings: ['rv-infarction', 'stemi-inferior', 'reciprocal-changes', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 66 },
    source: {
      rhythm: SINUS(58),
      activation: { kind: 'conducted' },
      // proximal RCA: inferior wall + the lateral RV free wall (acute marginal branches), which faces V1 and the
      // right-sided leads: ST↑ V4R ≥ 0.1 mV, V1 > V2
      injury: [{ where: [...INFERIOR_RCA], layer: 'transmural', stMv: 0.24, ref: 'III' }, { where: ['rv-basal'], layer: 'transmural', stMv: 0.15, ref: 'V1' }],
    },
    dials: { rate: { min: 50, max: 90 } },
    facts: { territory: 'inferior + right ventricle', culprit: 'RCA (proximal, before the RV branches)', extraLeads: 'record V3R / V4R in every inferior STEMI: ST↑ ≥ 0.05 mV (≥ 0.1 mV in men < 30 y)' },
    highlights: { ...mark(INFERIOR_RCA, 'ischemia'), ...mark(RV, 'ischemia') },
  },
  {
    id: 'stemi-posterior',
    group: 'ischemia',
    findings: ['stemi-posterior', 'stemi-lateral', 'sinus-rhythm'],
    title: l('后侧壁 STEMI（V1–V3 镜像性 ST 段压低）', 'Posterolateral STEMI (mirror ST depression in V1–V3)', 'IAMCEST posterolateral (descenso especular del ST en V1–V3)'),
    patient: { sex: 'male', ageY: 59 },
    source: {
      rhythm: SINUS(74),
      activation: { kind: 'conducted' },
      // the posterobasal wall faces V7–V9; V1–V3 see the mirror image: horizontal ST depression with an upright T.
      // Isolated posterior MI is rare (variant 'isolated'); with an LCx occlusion the lateral leads usually show the
      // direct ST elevation too (a second, lateral injury of the same occlusion). The posterior wall's longer
      // epicardial APD (evolving posterior T inversion) mirrors as the upright T that ends the depressed ST in V1–V3
      injury: [{ where: [...POSTERIOR_WALL], layer: 'transmural', stMv: -0.17, ref: 'V2' }, { where: [...OM_LATERAL], layer: 'transmural', stMv: 0.18, ref: 'V6' }],
      repol: { apd: [{ where: [...POSTERIOR_WALL, 'lv-mid-inferolateral'], layer: 'epi', deltaMs: 170 }] },
    },
    dials: { rate: { min: 60, max: 95 } },
    variants: {
      isolated: {
        label: l('孤立性后壁 STEMI（V7–V9 抬高，侧壁导联无抬高）', 'isolated posterior STEMI (V7–V9 elevation, flat lateral leads)', 'IAMCEST posterior aislado (elevación en V7–V9, derivaciones laterales sin elevación)'),
        patch: {
          injury: [{ where: [...POSTERIOR_WALL], layer: 'transmural', stMv: -0.2, ref: 'V2' }],
          repol: { apd: [{ where: [...POSTERIOR_WALL, 'lv-mid-inferolateral'], layer: 'epi', deltaMs: 170 }] },
        },
        findings: ['stemi-posterior', 'sinus-rhythm'],
      },
      evolved: {
        label: l('演变期（V1–V2 高 R 波）', 'evolved (tall R in V1–V2)', 'evolucionado (R alta en V1–V2)'),
        patch: {
          injury: [{ where: [...POSTERIOR_WALL], layer: 'transmural', stMv: -0.09, ref: 'V2' }, { where: [...OM_LATERAL], layer: 'transmural', stMv: 0.1, ref: 'V6' }],
          substrate: { scar: [{ where: [...POSTERIOR_SCAR], transmurality: 1 }] },
          repol: { apd: [{ where: [...POSTERIOR_SCAR], layer: 'epi', deltaMs: 35 }] },
        },
        findings: ['stemi-posterior', 'stemi-lateral', 'pathological-q', 'sinus-rhythm'],
      },
    },
    facts: { territory: 'posterolateral (posterobasal)', culprit: 'LCx', extraLeads: 'record V7–V9 when V1–V3 show ST depression: ST↑ ≥ 0.05 mV (≥ 0.1 mV in men < 40 y)' },
    highlights: mark(POSTERIOR, 'ischemia'),
  },
  // ── STEMI equivalents and non-occlusion patterns ───────────────────────────────────────────────────────────────
  {
    id: 'hyperacute-t',
    group: 'ischemia',
    findings: ['hyperacute-t', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 55 },
    // minutes after occlusion: epicardial APD shortening (bulky, broad-based T, large relative to the QRS) before the
    // ST elevation develops
    source: {
      rhythm: SINUS(80),
      activation: { kind: 'conducted' },
      injury: [{ where: [...LAD], layer: 'transmural', stMv: 0.05, ref: 'V2' }],
      repol: { apd: [{ where: [...LAD], layer: 'epi', deltaMs: -80 }] },
    },
    dials: { rate: { min: 60, max: 100 } },
    facts: { territory: 'anterior', culprit: 'LAD (proximal), minutes after occlusion' },
    highlights: mark(LAD, 'ischemia'),
  },
  {
    id: 'de-winter',
    group: 'ischemia',
    findings: ['de-winter', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 54 },
    source: {
      rhythm: SINUS(82),
      activation: { kind: 'conducted' },
      // proximal LAD occlusion without ST elevation: subendocardial injury (upsloping J-point depression) with very
      // short epicardial APD (tall, symmetric T) in the LAD territory
      injury: [{ where: [...LAD], layer: 'subendocardial', stMv: -0.2, ref: 'V3' }, { where: [...LV_ALL], layer: 'subendocardial', stMv: 0.08, ref: 'aVR' }],
      repol: { apd: [{ where: [...LAD], layer: 'epi', deltaMs: -70 }], tShape: { stMs: 20 } },
    },
    dials: { rate: { min: 65, max: 100 } },
    facts: { territory: 'anterior', culprit: 'LAD (proximal), STEMI equivalent' },
    highlights: mark(LAD, 'ischemia'),
  },
  {
    id: 'wellens',
    group: 'ischemia',
    findings: ['wellens', 'sinus-rhythm'],
    patient: { sex: 'female', ageY: 62 },
    // after the pain: reperfused LAD with longer epicardial APD → T inversion; type A = biphasic (up then down) V2–V3
    source: { rhythm: SINUS(70), activation: { kind: 'conducted' }, repol: { qtcMs: 440, apd: [{ where: [...WELLENS], layer: 'epi', deltaMs: 56 }] } },
    dials: { rate: { min: 55, max: 90 } },
    variants: {
      b: {
        label: l('B 型（深而对称的倒置 T 波）', 'type B (deep symmetric T inversion)', 'tipo B (onda T negativa profunda y simétrica)'),
        // type B: the transmural gradient of the reperfused wall is reversed (epicardial APD longer, endocardial shorter):
        // the change lobe is not delayed, so the T is one deep, symmetric inversion instead of a late negative half
        patch: { repol: { qtcMs: 455, apd: [{ where: [...WELLENS], layer: 'epi', deltaMs: 85 }, { where: [...WELLENS], layer: 'endo', deltaMs: -60 }] } },
      },
    },
    facts: { territory: 'anterior', culprit: 'critical proximal LAD stenosis (reperfused)' },
    highlights: mark(LAD_MID, 'ischemia'),
  },
  {
    id: 'avr-elevation-diffuse-std',
    group: 'ischemia',
    findings: ['avr-elevation-diffuse-std', 'st-depression-ischemic', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 71 },
    // diffuse subendocardial ischaemia of the whole LV: the injury vector points to the base and the right (aVR)
    source: { rhythm: SINUS(86), activation: { kind: 'conducted' }, injury: [{ where: [...LV_ALL], layer: 'subendocardial', stMv: -0.2, ref: 'V5' }] },
    dials: { rate: { min: 80, max: 100 } },
    variants: {
      'left-main': {
        label: l('左主干（aVR 抬高 ≥ V1）', 'left main (aVR elevation ≥ V1)', 'tronco común (elevación en aVR ≥ V1)'),
        patch: { injury: [{ where: [...LV_ALL], layer: 'subendocardial', stMv: -0.24, ref: 'V5' }, { where: ['lv-basal-anteroseptal', 'lv-basal-inferoseptal', 'rv-outflow'], layer: 'transmural', stMv: 0.1, ref: 'V1' }] },
      },
    },
    facts: { culprit: 'multivessel or left-main disease (not a classic STEMI)' },
    highlights: mark(LV_ALL, 'ischemia'),
  },
  {
    id: 'st-depression-ischemic',
    group: 'ischemia',
    findings: ['st-depression-ischemic', 'sinus-rhythm'],
    patient: { sex: 'female', ageY: 67 },
    source: { rhythm: SINUS(88), activation: { kind: 'conducted' }, injury: [{ where: [...LATERAL, 'lv-apical-anterior', 'lv-mid-anterior'], layer: 'subendocardial', stMv: -0.13, ref: 'V5' }] },
    dials: { rate: { min: 65, max: 110 } },
    facts: { territory: 'anterolateral (subendocardial)' },
    highlights: mark(LATERAL, 'ischemia'),
  },
  {
    id: 't-inversion-ischemic',
    group: 'ischemia',
    findings: ['t-inversion-ischemic', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 64 },
    source: { rhythm: SINUS(72), activation: { kind: 'conducted' }, repol: { apd: [{ where: [...LATERAL, 'lv-apical-anterior'], layer: 'epi', deltaMs: 55 }] } },
    dials: { rate: { min: 55, max: 95 } },
    facts: { territory: 'lateral' },
    highlights: mark(LATERAL, 'ischemia'),
  },
  // ── course, old MI, aneurysm ───────────────────────────────────────────────────────────────────────────────────
  {
    id: 'stemi-evolution',
    group: 'ischemia',
    findings: ['stemi-anterior', 'reciprocal-changes', 'sinus-rhythm'],
    title: l('前壁心肌梗死的演变', 'Evolution of an anterior MI', 'Evolución de un infarto anterior'),
    patient: { sex: 'male', ageY: 60 },
    source: { ...evo(0.25), rhythm: SINUS(82), activation: { kind: 'conducted' } },
    dials: { rate: { min: 60, max: 100 } },
    variants: {
      hyperacute: { label: l('超急性期（数分钟）', 'hyperacute (minutes)', 'hiperagudo (minutos)'), patch: evo(0), findings: ['stemi-anterior', 'hyperacute-t', 'sinus-rhythm'] },
      evolving: { label: l('演变期（Q 波 + T 波倒置）', 'evolving (Q waves + T inversion)', 'en evolución (ondas Q + T negativas)'), patch: evo(0.5), findings: ['stemi-anterior', 'pathological-q', 'sinus-rhythm'] },
      old: { label: l('陈旧期（Q 波，ST 回落）', 'old (Q waves, ST back to baseline)', 'antiguo (ondas Q, ST normalizado)'), patch: evo(1), findings: ['old-mi-anterior', 'pathological-q', 'sinus-rhythm'] },
    },
    facts: { territory: 'anterior', culprit: 'LAD (proximal), not reperfused', stage: 'acute (hours)' },
    highlights: { ...mark(LAD, 'ischemia'), ...mark(LAD_MID, 'infarct') },
  },
  {
    id: 'old-mi',
    group: 'ischemia',
    findings: ['old-mi-anterior', 'pathological-q', 'sinus-rhythm'],
    title: l('陈旧性心肌梗死', 'Old myocardial infarction', 'Infarto de miocardio antiguo'),
    patient: { sex: 'male', ageY: 68 },
    source: { rhythm: SINUS(70), activation: { kind: 'conducted' }, substrate: { scar: [{ where: [...LAD_MID], transmurality: 0.9 }] } },
    dials: { rate: { min: 55, max: 95 } },
    variants: {
      inferior: {
        label: l('下壁', 'inferior', 'inferior'),
        patch: { substrate: { scar: [{ where: ['lv-basal-inferior', 'lv-mid-inferior', 'lv-apical-inferior', 'lv-basal-inferoseptal', 'lv-mid-inferoseptal'], transmurality: 0.9 }] } },
        findings: ['old-mi-inferior', 'pathological-q', 'sinus-rhythm'],
      },
      lateral: {
        label: l('侧壁', 'lateral', 'lateral'),
        patch: { substrate: { scar: [{ where: ['lv-basal-anterolateral', 'lv-mid-anterolateral', 'lv-apical-lateral', 'lv-mid-inferolateral', 'lv-basal-anterior', 'lv-mid-anterior'], transmurality: 1 }] } },
        findings: ['old-mi-lateral', 'pathological-q', 'sinus-rhythm'],
      },
      fragmented: {
        label: l('伴碎裂 QRS', 'with fragmented QRS', 'con QRS fragmentado'),
        patch: { substrate: { scar: [{ where: [...LAD_MID], transmurality: 0.85, fragmented: true }] } },
      },
    },
    facts: { territory: 'anterior (variants: inferior, lateral)' },
    highlights: mark(LAD_MID, 'infarct'),
  },
  {
    id: 'lv-aneurysm',
    group: 'ischemia',
    findings: ['lv-aneurysm', 'old-mi-anterior', 'pathological-q', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 66 },
    source: {
      rhythm: SINUS(76),
      activation: { kind: 'conducted' },
      // transmural scar of the anterior wall and apex (deep QS V1–V3) with a persistent injury current of the
      // dyskinetic anteroseptal sac, and a small T: T / QRS ≤ 0.36 in every lead V1–V4 (Klein 2015 — the rule that
      // separates an old aneurysm from an acute anterior STEMI)
      substrate: { scar: [{ where: [...LAD_MID, 'lv-basal-anteroseptal', 'lv-basal-anterior', 'lv-mid-anterolateral'], transmurality: 1 }] },
      injury: [{ where: ['lv-mid-anteroseptal', 'lv-apical-septal', 'lv-basal-anteroseptal', 'lv-apical-anterior'], layer: 'transmural', stMv: 0.18, ref: 'V2' }],
      repol: { gScale: 0.4, apd: [{ where: [...LAD_MID], layer: 'epi', deltaMs: 30 }] },
    },
    dials: { rate: { min: 60, max: 95 } },
    facts: { territory: 'anterior + apex', teaching: 'persistent ST elevation weeks after MI; T small relative to the QRS (aneurysm vs acute)' },
    highlights: mark(LAD_MID, 'infarct'),
  },
  // ── MI in LBBB (Sgarbossa / Smith) ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'sgarbossa',
    group: 'ischemia',
    findings: ['sgarbossa-positive', 'lbbb', 'stemi-lateral', 'sinus-rhythm'],
    title: l('左束支传导阻滞合并急性心肌梗死（Sgarbossa 标准）', 'Acute MI in LBBB (Sgarbossa criteria)', 'IAM con bloqueo de rama izquierda (criterios de Sgarbossa)'),
    patient: { sex: 'male', ageY: 73 },
    source: {
      rhythm: SINUS(80),
      activation: { kind: 'conducted', blocks: { lbb: 'complete' } },
      // concordant ST elevation in the leads with a positive QRS (lateral wall injury); the injury overcomes the LBBB's
      // own discordant ST depression in V5–V6 (≈ −0.15 mV), leaving a J-point elevation ≥ 0.14 mV in V5–V6
      injury: [{ where: [...LATERAL], layer: 'transmural', stMv: 0.2, ref: 'V6' }],
    },
    dials: { rate: { min: 60, max: 100 } },
    variants: {
      'concordant-depression': {
        label: l('V1–V3 同向 ST 段压低', 'concordant ST depression in V1–V3', 'descenso concordante del ST en V1–V3'),
        patch: { injury: [{ where: [...POSTERIOR_WALL], layer: 'transmural', stMv: -0.17, ref: 'V2' }] },
        findings: ['sgarbossa-positive', 'lbbb', 'stemi-posterior', 'sinus-rhythm'],
      },
      smith: {
        label: l('过度不一致的 ST 抬高（Smith 改良标准）', 'excessively discordant ST elevation (Smith-modified)', 'elevación del ST excesivamente discordante (Smith)'),
        // (a smaller torso transfer keeps the giant discordant T below the QRS, as in most real LBBB tracings). The
        // LBBB pattern's own discordant ST is part of the solved J+60 level, so the injury is sized for a J-point ST/S
        // of ≈ −0.35 to −0.4 in V3 (Smith ≤ −0.25) against ≈ −0.1 in the uncomplicated LBBB. stMv is the recorded
        // J+60 level in V2 (after the 0.72 torso gain; was 0.7 cardiac before the solve honoured the gain)
        patch: { injury: [{ where: [...ANTEROSEPTAL], layer: 'transmural', stMv: 0.5, ref: 'V2' }], geometry: { torsoGain: 0.72 }, repol: { coupling: 0.25 } },
        findings: ['sgarbossa-positive', 'lbbb', 'stemi-anterior', 'sinus-rhythm'],
      },
    },
    facts: { territory: 'lateral (variants: posterior, anterior)', baseline: 'LBBB (secondary, discordant ST-T)' },
    highlights: { ...mark(LATERAL, 'ischemia'), lbb: 'block' },
  },
  {
    id: 'takotsubo',
    group: 'ischemia',
    findings: ['takotsubo', 'sinus-rhythm'],
    patient: { sex: 'female', ageY: 71 },
    // apical ballooning: injury of the apex and mid-anterior wall (no single coronary territory; little reciprocity)
    source: { rhythm: SINUS(86), activation: { kind: 'conducted' }, injury: [{ where: [...APICAL], layer: 'transmural', stMv: 0.22, ref: 'V3' }] },
    dials: { rate: { min: 80, max: 100 } },
    variants: {
      late: {
        label: l('晚期（深倒置 T 波 + QT 延长）', 'late (deep T inversion + long QT)', 'tardío (T negativas profundas + QT largo)'),
        patch: { rhythm: SINUS(70), injury: [], repol: { qtcMs: 505, apd: [{ where: [...APICAL, ...TAKOTSUBO_MID], layer: 'epi', deltaMs: 160 }] } },
        findings: ['takotsubo', 'long-qt', 'sinus-rhythm'],
      },
    },
    facts: { territory: 'apical ballooning (no single coronary territory)' },
    highlights: mark(APICAL, 'ischemia'),
  },
]);
