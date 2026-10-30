/**
 * Coronary arteries ↔ myocardial walls ↔ ECG lead groups (the map used to localise ST elevation).
 *
 * Sources (criteria only; text is original):
 * - Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Circulation 2018;138:e618-51 (contiguous
 *   lead groups; posterior leads V7–V9 ST elevation ≥ 0.5 mm (≥ 1 mm in men < 40 y); right-sided V3R–V4R ≥ 0.5 mm
 *   (≥ 1 mm in men < 30 y)).
 * - Byrne RA et al. 2023 ESC ACS guidelines. Eur Heart J 2023;44:3720-826 (posterior and RV leads in inferior STEMI).
 * - Zimetbaum PJ, Josephson ME. Use of the electrocardiogram in acute myocardial infarction. N Engl J Med
 *   2003;348:933-40 (culprit-artery clues: STE III > II and ST depression in I/aVL → RCA; STE in I, aVL, V5–V6 → LCx).
 * - Curriculum structure: Castellano C, Pérez de Juan MA, Attie F. Electrocardiografía Clínica, 2nd ed. Elsevier 2004.
 * Coronary anatomy varies (dominance: right ≈ 80–85 %, left or co-dominant in the rest); the map shows the usual case.
 */
import type { L10n } from '../../core/l10n';
import { l } from '../../core/l10n';
import type { Lead } from '../../core/leads';
import type { FigureParams } from '../api';

export type TerritoryId = NonNullable<FigureParams['territories']['highlight']>;
export const TERRITORY_IDS = ['septal', 'anterior', 'lateral', 'inferior', 'posterior', 'rv'] as const satisfies readonly TerritoryId[];

/** Drawn artery segments of the schematic. */
export type ArterySeg =
  | 'lm'
  | 'ladProx'
  | 'ladMid'
  | 'ladDist'
  | 'diag'
  | 'septal'
  | 'lcx'
  | 'om'
  | 'rcaProx'
  | 'rcaMid'
  | 'rvBranch'
  | 'rcaDist'
  | 'pda'
  | 'pl';

/** Walls of the short-axis ring. */
export type Wall = 'septal' | 'anterior' | 'lateral' | 'inferior' | 'posterior' | 'rv';

export interface Territory {
  readonly id: TerritoryId;
  readonly name: L10n;
  readonly leads: readonly Lead[];
  readonly reciprocal: readonly Lead[];
  readonly arteries: readonly ArterySeg[];
  /** secondary (alternative) culprit, drawn dashed */
  readonly altArteries?: readonly ArterySeg[];
  readonly walls: readonly Wall[];
  readonly artery: L10n;
  readonly note: L10n;
}

export const TERRITORIES: Readonly<Record<TerritoryId, Territory>> = {
  septal: {
    id: 'septal',
    name: l('室间隔', 'Septal', 'Septal'),
    leads: ['V1', 'V2'],
    reciprocal: [],
    arteries: ['lm', 'ladProx', 'septal'],
    walls: ['septal'],
    artery: l('前降支近段（间隔支）', 'Proximal LAD (septal perforators)', 'DA proximal (ramas septales)'),
    note: l(
      'V1–V2 常与 V3–V4 一起受累（前间隔）。间隔支起自前降支近段，所以单纯间隔受累提示近段病变。',
      'V1–V2 usually change together with V3–V4 (anteroseptal). The septal perforators leave the proximal LAD, so septal involvement points to a proximal lesion.',
      'V1–V2 suelen alterarse junto con V3–V4 (anteroseptal). Las ramas septales nacen de la DA proximal, así que la afectación septal apunta a una lesión proximal.',
    ),
  },
  anterior: {
    id: 'anterior',
    name: l('前壁', 'Anterior', 'Anterior'),
    leads: ['V3', 'V4'],
    reciprocal: ['II', 'III', 'aVF'],
    arteries: ['lm', 'ladProx', 'ladMid', 'ladDist', 'diag'],
    walls: ['anterior'],
    artery: l('左前降支（及对角支）', 'Left anterior descending artery (and diagonals)', 'Arteria descendente anterior (y diagonales)'),
    note: l(
      '前降支近段闭塞时 ST 抬高可从 V1 延伸到 V5–V6 及 I、aVL，下壁导联常有对应性压低；远段（绕过心尖的前降支）闭塞时下壁导联也可抬高。',
      'A proximal LAD occlusion can raise the ST from V1 to V5–V6 and in I and aVL, often with reciprocal depression in the inferior leads; a distal ("wrap-around") LAD can also raise the ST inferiorly.',
      'Una oclusión proximal de la DA puede elevar el ST de V1 a V5–V6 y en I y aVL, a menudo con descenso recíproco en las inferiores; una DA distal que rodea el ápex también puede elevarlo en las inferiores.',
    ),
  },
  lateral: {
    id: 'lateral',
    name: l('侧壁', 'Lateral', 'Lateral'),
    leads: ['I', 'aVL', 'V5', 'V6'],
    reciprocal: ['III', 'aVF'],
    arteries: ['lm', 'lcx', 'om'],
    altArteries: ['diag'],
    walls: ['lateral'],
    artery: l('回旋支（钝缘支），或前降支的第一对角支', 'Circumflex (obtuse marginals), or the first diagonal of the LAD', 'Circunfleja (ramas marginales obtusas) o la primera diagonal de la DA'),
    note: l(
      '高侧壁（I、aVL）多为第一对角支或钝缘支；低侧壁（V5–V6）多为回旋支。回旋支闭塞在心电图上最容易"静默"。',
      'High lateral (I, aVL) is usually the first diagonal or an obtuse marginal; low lateral (V5–V6) usually the circumflex. Circumflex occlusions are the most often electrocardiographically "silent".',
      'La lateral alta (I, aVL) suele depender de la primera diagonal o de una marginal obtusa; la lateral baja (V5–V6), de la circunfleja. Las oclusiones de la circunfleja son las que con más frecuencia son "silentes" en el ECG.',
    ),
  },
  inferior: {
    id: 'inferior',
    name: l('下壁', 'Inferior', 'Inferior'),
    leads: ['II', 'III', 'aVF'],
    reciprocal: ['I', 'aVL'],
    arteries: ['rcaProx', 'rcaMid', 'rcaDist', 'pda'],
    altArteries: ['lcx'],
    walls: ['inferior'],
    artery: l('右冠状动脉（约 80%，后降支），左优势型时为回旋支', 'Right coronary artery (≈ 80 %, via the PDA); the circumflex in left-dominant hearts', 'Coronaria derecha (≈ 80 %, por la descendente posterior); la circunfleja en corazones de dominancia izquierda'),
    note: l(
      'III 抬高 > II、I 和 aVL 压低提示右冠；I、aVL、V5–V6 也抬高或 II ≥ III 提示回旋支。下壁心梗时要加做 V4R 和 V7–V9。',
      'STE in III > II with ST depression in I and aVL suggests the RCA; STE also in I, aVL, V5–V6, or II ≥ III, suggests the circumflex. In inferior MI always record V4R and V7–V9.',
      'Una elevación del ST en III > II con descenso en I y aVL sugiere la coronaria derecha; si también se eleva en I, aVL, V5–V6, o II ≥ III, sugiere la circunfleja. En el infarto inferior registra siempre V4R y V7–V9.',
    ),
  },
  posterior: {
    id: 'posterior',
    name: l('后壁（下侧壁基底段）', 'Posterior (inferobasal / inferolateral)', 'Posterior (inferobasal / inferolateral)'),
    leads: ['V7', 'V8', 'V9'],
    reciprocal: ['V1', 'V2', 'V3'],
    arteries: ['lm', 'lcx', 'om'],
    altArteries: ['rcaDist', 'pl'],
    walls: ['posterior'],
    artery: l('回旋支或右冠的后侧支', 'Circumflex or the posterolateral branch of the RCA', 'Circunfleja o la rama posterolateral de la coronaria derecha'),
    note: l(
      '标准 12 导联中只表现为"镜像"：V1–V3 水平型 ST 压低、R 波增高、T 波直立。V7–V9 抬高 ≥ 0.5 mm（< 40 岁男性 ≥ 1 mm）即可确认。',
      'On the standard 12 leads it appears only as a mirror image: horizontal ST depression, tall R and upright T in V1–V3. ST elevation ≥ 0.5 mm in V7–V9 (≥ 1 mm in men < 40 y) confirms it.',
      'En las 12 derivaciones estándar solo aparece como imagen en espejo: descenso horizontal del ST, R alta y T positiva en V1–V3. Una elevación ≥ 0,5 mm en V7–V9 (≥ 1 mm en varones < 40 años) lo confirma.',
    ),
  },
  rv: {
    id: 'rv',
    name: l('右心室', 'Right ventricle', 'Ventrículo derecho'),
    leads: ['V3R', 'V4R'],
    reciprocal: [],
    arteries: ['rcaProx', 'rvBranch'],
    walls: ['rv'],
    artery: l('右冠状动脉近段（右室支之前）', 'Proximal right coronary artery (before the RV branches)', 'Coronaria derecha proximal (antes de las ramas del VD)'),
    note: l(
      '几乎总伴下壁心梗。V4R ST 抬高 ≥ 0.5 mm（< 30 岁男性 ≥ 1 mm）提示右室梗死；V1 也可抬高。右室梗死患者对前负荷依赖，硝酸酯类可致低血压。',
      'Almost always with an inferior MI. ST elevation ≥ 0.5 mm in V4R (≥ 1 mm in men < 30 y) indicates RV infarction; V1 may also be raised. These patients are preload-dependent: nitrates can cause hypotension.',
      'Casi siempre acompaña a un infarto inferior. Una elevación ≥ 0,5 mm en V4R (≥ 1 mm en varones < 30 años) indica infarto del VD; V1 también puede elevarse. Estos pacientes dependen de la precarga: los nitratos pueden causar hipotensión.',
    ),
  },
};

/**
 * Territory selected when the figure opens: the lesson's `highlight`; an explicit `highlight: null` means "nothing
 * selected yet" (the learner picks); without the parameter the inferior territory is shown as an example.
 */
export function initialTerritory(params: FigureParams['territories'] | undefined): TerritoryId | null {
  return params?.highlight !== undefined ? params.highlight : 'inferior';
}

export interface ArteryDef {
  readonly name: L10n;
  readonly abbr: L10n;
}

/** Artery names for the legend (each drawn segment belongs to one of these). */
export const ARTERIES = {
  lm: { name: l('左主干', 'Left main', 'Tronco común izquierdo'), abbr: l('LM', 'LM', 'TCI') },
  lad: { name: l('左前降支', 'Left anterior descending', 'Descendente anterior'), abbr: l('LAD', 'LAD', 'DA') },
  lcx: { name: l('左回旋支', 'Left circumflex', 'Circunfleja'), abbr: l('LCX', 'LCx', 'Cx') },
  rca: { name: l('右冠状动脉', 'Right coronary artery', 'Coronaria derecha'), abbr: l('RCA', 'RCA', 'CD') },
} as const satisfies Record<string, ArteryDef>;

export function arteryOf(seg: ArterySeg): keyof typeof ARTERIES {
  if (seg === 'lm') return 'lm';
  if (seg === 'ladProx' || seg === 'ladMid' || seg === 'ladDist' || seg === 'diag' || seg === 'septal') return 'lad';
  if (seg === 'lcx' || seg === 'om') return 'lcx';
  return 'rca';
}
