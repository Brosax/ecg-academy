/**
 * Electrode sites of the standard 12-lead ECG and the extra right-sided / posterior leads, with their anatomical
 * landmarks (AHA/ACCF/HRS Recommendations for the Standardization and Interpretation of the ECG, Part I — Kligfield P
 * et al., Circulation 2007;115:1306-24; extra leads: Fourth Universal Definition of MI, Thygesen K et al. 2018).
 *
 * Coordinates are in the torso drawing's units (front view, viewBox 0 0 420 520; patient's right on screen left;
 * back view drawn separately, patient's left on screen left as seen from behind).
 */
import type { L10n } from '../../core/l10n';
import { l } from '../../core/l10n';

export const ELECTRODE_IDS = ['RA', 'LA', 'RL', 'LL', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V3R', 'V4R', 'V7', 'V8', 'V9'] as const;
export type ElectrodeId = (typeof ELECTRODE_IDS)[number];
export type ElectrodeGroup = 'limb' | 'chest' | 'right' | 'posterior';

export interface ElectrodeDef {
  readonly id: ElectrodeId;
  readonly group: ElectrodeGroup;
  readonly view: 'front' | 'back';
  readonly x: number;
  readonly y: number;
  readonly where: L10n;
}

/** Midline and the rib model of the front view: intercostal space n at the sternal border is at ICS_Y[n]. */
export const MIDLINE = 210;
export const ICS_Y: Readonly<Record<2 | 3 | 4 | 5 | 6, number>> = { 2: 132, 3: 157, 4: 182, 5: 207, 6: 232 };
/**
 * The anterior ribs and intercostal spaces rise towards the axilla (they slope down towards the sternum), which is
 * why V5–V6 must be placed on the horizontal level of V4 rather than along the 5th space.
 */
export const RIB_SLOPE = 0.16;
export const STERNUM_HALF = 18;
export function icsY(n: 2 | 3 | 4 | 5 | 6, x: number): number {
  return ICS_Y[n] + 26 - RIB_SLOPE * Math.max(STERNUM_HALF + 4, Math.abs(x - MIDLINE));
}
/** Vertical reference lines (front view x). */
export const LINES = { mclR: 148, mclL: 272, aalL: 302, malL: 332 } as const;

const v4y = icsY(5, LINES.mclL);
const v1 = { x: MIDLINE - 22, y: icsY(4, MIDLINE - 22) };
const v2 = { x: MIDLINE + 22, y: icsY(4, MIDLINE + 22) };
const v4 = { x: LINES.mclL, y: v4y };
const v3 = { x: (v2.x + v4.x) / 2, y: (v2.y + v4.y) / 2 };

/** Back view: centre line and posterior reference lines (patient's left = screen left). */
export const BACK = { center: 210, pal: 100, scap: 145, para: 190, level: v4y } as const;

export const ELECTRODES: Readonly<Record<ElectrodeId, ElectrodeDef>> = {
  RA: {
    id: 'RA',
    group: 'limb',
    view: 'front',
    x: 44,
    y: 312,
    where: l(
      '右上肢（腕部或前臂）。肢体电极可放在肩以远的任何部位，但两侧要对称。',
      'Right arm (wrist or forearm). Limb electrodes may sit anywhere distal to the shoulder, as long as both sides match.',
      'Brazo derecho (muñeca o antebrazo). Los electrodos de los miembros pueden ir en cualquier punto distal al hombro, siempre que ambos lados sean simétricos.',
    ),
  },
  LA: {
    id: 'LA',
    group: 'limb',
    view: 'front',
    x: 376,
    y: 312,
    where: l('左上肢（腕部或前臂）。', 'Left arm (wrist or forearm).', 'Brazo izquierdo (muñeca o antebrazo).'),
  },
  RL: {
    id: 'RL',
    group: 'limb',
    view: 'front',
    x: 162,
    y: 492,
    where: l(
      '右下肢：中性（接地）电极，不参与任何导联。',
      'Right leg: the neutral (ground) electrode; it is not part of any lead.',
      'Pierna derecha: electrodo neutro (tierra); no forma parte de ninguna derivación.',
    ),
  },
  LL: {
    id: 'LL',
    group: 'limb',
    view: 'front',
    x: 258,
    y: 492,
    where: l(
      '左下肢：Einthoven 三角的下顶点（II、III、aVF 导联）。',
      'Left leg: the lower corner of the Einthoven triangle (leads II, III and aVF).',
      'Pierna izquierda: el vértice inferior del triángulo de Einthoven (derivaciones II, III y aVF).',
    ),
  },
  V1: {
    id: 'V1',
    group: 'chest',
    view: 'front',
    ...v1,
    where: l('第 4 肋间，胸骨右缘。', '4th intercostal space, right sternal border.', '4.º espacio intercostal, borde esternal derecho.'),
  },
  V2: {
    id: 'V2',
    group: 'chest',
    view: 'front',
    ...v2,
    where: l('第 4 肋间，胸骨左缘。', '4th intercostal space, left sternal border.', '4.º espacio intercostal, borde esternal izquierdo.'),
  },
  V3: {
    id: 'V3',
    group: 'chest',
    view: 'front',
    ...v3,
    where: l('V2 与 V4 连线的中点（先放 V4 再放 V3）。', 'Midway between V2 and V4 (place V4 first, then V3).', 'A medio camino entre V2 y V4 (coloca primero V4 y después V3).'),
  },
  V4: {
    id: 'V4',
    group: 'chest',
    view: 'front',
    ...v4,
    where: l('第 5 肋间，左锁骨中线。', '5th intercostal space, left midclavicular line.', '5.º espacio intercostal, línea medioclavicular izquierda.'),
  },
  V5: {
    id: 'V5',
    group: 'chest',
    view: 'front',
    x: LINES.aalL,
    y: v4y,
    where: l('左腋前线，与 V4 同一水平。', 'Left anterior axillary line, at the horizontal level of V4.', 'Línea axilar anterior izquierda, al mismo nivel horizontal que V4.'),
  },
  V6: {
    id: 'V6',
    group: 'chest',
    view: 'front',
    x: LINES.malL,
    y: v4y,
    where: l('左腋中线，与 V4、V5 同一水平。', 'Left mid-axillary line, at the horizontal level of V4 and V5.', 'Línea axilar media izquierda, al mismo nivel horizontal que V4 y V5.'),
  },
  V3R: {
    id: 'V3R',
    group: 'right',
    view: 'front',
    x: 2 * MIDLINE - v3.x,
    y: v3.y,
    where: l('右胸与 V3 对称的位置。', 'The mirror image of V3 on the right chest.', 'La imagen especular de V3 en el hemitórax derecho.'),
  },
  V4R: {
    id: 'V4R',
    group: 'right',
    view: 'front',
    x: LINES.mclR,
    y: v4y,
    where: l(
      '第 5 肋间，右锁骨中线（与 V4 对称）。用于发现右心室梗死。',
      '5th intercostal space, right midclavicular line (mirror of V4). Used to detect right ventricular infarction.',
      '5.º espacio intercostal, línea medioclavicular derecha (simétrica de V4). Sirve para detectar el infarto del ventrículo derecho.',
    ),
  },
  V7: {
    id: 'V7',
    group: 'posterior',
    view: 'back',
    x: BACK.pal,
    y: BACK.level,
    where: l('左腋后线，与 V4–V6 同一水平。', 'Left posterior axillary line, at the level of V4–V6.', 'Línea axilar posterior izquierda, al nivel de V4–V6.'),
  },
  V8: {
    id: 'V8',
    group: 'posterior',
    view: 'back',
    x: BACK.scap,
    y: BACK.level,
    where: l('左肩胛中线（肩胛下角下方），同一水平。', 'Left mid-scapular line (below the tip of the scapula), same level.', 'Línea medioescapular izquierda (bajo la punta de la escápula), al mismo nivel.'),
  },
  V9: {
    id: 'V9',
    group: 'posterior',
    view: 'back',
    x: BACK.para,
    y: BACK.level,
    where: l('左脊柱旁线，同一水平。用于发现后壁梗死。', 'Left paraspinal line, same level. Used to detect posterior infarction.', 'Línea paravertebral izquierda, al mismo nivel. Sirve para detectar el infarto posterior.'),
  },
};

export const ELECTRODE_TIP: L10n = l(
  '如何找第 4 肋间：先摸到胸骨角（Louis 角），第 2 肋在此与胸骨相连，其下方为第 2 肋间，再向下数两个肋间。V1–V2 放得过高是最常见的胸导联错误。',
  'Finding the 4th intercostal space: feel the sternal angle (angle of Louis) — the 2nd rib joins the sternum there; the space below it is the 2nd ICS; count down two more spaces. V1–V2 placed too high is the commonest precordial error.',
  'Cómo localizar el 4.º espacio intercostal: palpa el ángulo esternal (de Louis), donde la 2.ª costilla se une al esternón; el espacio de debajo es el 2.º EIC; baja dos espacios más. Colocar V1–V2 demasiado altas es el error precordial más frecuente.',
);
