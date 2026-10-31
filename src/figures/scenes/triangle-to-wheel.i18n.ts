/**
 * Strings of the "triangle-to-wheel" scene (From three electrodes to six axes; lesson f3, spec docs/design/f-explainers.md §4.4).
 * Owned by the scene author. Keys: title, aria, caption, beat_<id> for every BEAT_IDS entry (compile-checked by the
 * `satisfies` below), ctl_* (toggles), lbl_* (SVG labels and read-outs). zh / en / es, Spain Spanish, original
 * wording. Checked by tests/figures/scene/strings.test.ts (same keys, no empties, placeholders, lesson-text gates).
 * Every number a caption speaks is drawn at that beat (0°, +60°, +120°, 1.5 ×, 30°, 0.00 mV).
 * The fourth meter is the gauge, not a recorded potential: Σφ = φRA + φLA + φLL, 0 by construction because every
 * potential is read against Wilson's terminal, which is a reference, not a true zero (criteria.md wilson-goldberger).
 */
import { defineDict } from '../../i18n/index';

/** Narration beats in order (the spec's ids). triangle-to-wheel.math.ts builds BEATS from these (import from here). */
export const BEAT_IDS = ['potentials', 'difference', 'law', 'slide', 'augment', 'project'] as const;
export type BeatId = (typeof BEAT_IDS)[number];

export const zh = {
  title: '从三个电极到六条轴',
  aria: '动画场景：三个肢体电极的电位两两相减得到六个肢体导联，三角形的边和加压导联平移到同一中心，组成六轴系统；右侧同步描记各导联。',
  caption: '同一份心电图的一次心搏：三个电位、六个导联、一个六轴系统。',
  beat_potentials: '三个电极记录三个电位；它们的平均值就是 Wilson 中心电端，作为参考。',
  beat_difference: '导联即电位差：I = LA − RA，II = LL − RA，III = LL − LA',
  beat_law: 'I 加 III，在每一个瞬间都恰好等于 II。',
  beat_slide: '把三条边平移到中心：0°、+60°、+120°。',
  beat_augment: '一个肢体对比另两个的平均：aVR、aVL、aVF 平分夹角，是肢体电位的 1.5 倍。',
  beat_project: '六个导联同在额面、相隔 30°——其中只有两个是独立的。',
  ctl_cabrera: 'Cabrera 顺序',
  ctl_groups: '导联分组',
  lbl_wctShort: 'Σφ',
  lbl_wct: 'Σφ = RA + LA + LL = 0（按定义）：三个电位都以 Wilson 中心电端为参考，它是参考点，不是真正的零电位',
  lbl_I: 'I = LA − RA',
  lbl_II: 'II = LL − RA',
  lbl_III: 'III = LL − LA',
  lbl_aVF: 'aVF = LL − (RA + LA)/2 = 1.5 × LL',
  lbl_identity: 'I + III − II = {i} + {iii} − {ii} = {d} mV',
  lbl_augSum: 'aVR + aVL + aVF = 0',
  lbl_final: 'II = I + III · aVR + aVL + aVF = 0 · 8 个独立信号',
  lbl_mean: 'QRS 平均向量 {deg}',
  lbl_perp: '⟂ {x}',
  lbl_inferior: '下壁',
  lbl_lateral: '高侧壁',
  lbl_slow: '慢放 ×{k}',
  lbl_meters: '电极电位（相对中心电端，mV）',
  lbl_strips: '由三个电位重新组合出的肢体导联',
} as const satisfies Record<`beat_${BeatId}`, string> & Record<string, string>;

type D = { readonly [K in keyof typeof zh]: string };

export const en: D = {
  title: 'From three electrodes to six axes',
  aria: 'Animated scene: three limb-electrode potentials subtracted in pairs give the six limb leads; the triangle sides and the augmented leads slide to one centre and form the hexaxial wheel, with the leads drawn alongside.',
  caption: 'One beat of the same ECG: three potentials, six leads, one hexaxial wheel.',
  beat_potentials: "Three electrodes record three potentials; their average, Wilson's terminal, is the reference.",
  beat_difference: 'A lead is a difference: I = LA − RA, II = LL − RA, III = LL − LA.',
  beat_law: 'Add I and III: you get II at every instant.',
  beat_slide: 'Slide the three sides to the centre: 0°, +60°, +120°.',
  beat_augment: 'One limb against the average of the other two: aVR, aVL, aVF bisect the angles, 1.5 × the limb potential.',
  beat_project: 'Six leads, one plane, every 30°: only two of them are independent.',
  ctl_cabrera: 'Cabrera order',
  ctl_groups: 'Lead groups',
  lbl_wctShort: 'Σφ',
  lbl_wct: 'Σφ = RA + LA + LL = 0 by construction: all three are read against WCT, a reference, not a true zero',
  lbl_I: 'I = LA − RA',
  lbl_II: 'II = LL − RA',
  lbl_III: 'III = LL − LA',
  lbl_aVF: 'aVF = LL − (RA + LA)/2 = 1.5 × LL',
  lbl_identity: 'I + III − II = {i} + {iii} − {ii} = {d} mV',
  lbl_augSum: 'aVR + aVL + aVF = 0',
  lbl_final: 'II = I + III · aVR + aVL + aVF = 0 · 8 independent signals',
  lbl_mean: 'mean QRS {deg}',
  lbl_perp: '⟂ {x}',
  lbl_inferior: 'inferior',
  lbl_lateral: 'high lateral',
  lbl_slow: 'slow motion ×{k}',
  lbl_meters: 'Electrode potentials (against WCT, mV)',
  lbl_strips: 'Limb leads re-assembled from the three potentials',
};

export const es: D = {
  title: 'De tres electrodos a seis ejes',
  aria: 'Escena animada: los potenciales de tres electrodos de miembros, restados por pares, dan las seis derivaciones de miembros; los lados del triángulo y las derivaciones aumentadas se deslizan a un centro común y forman el sistema hexaxial, con las derivaciones trazadas al lado.',
  caption: 'Un latido del mismo ECG: tres potenciales, seis derivaciones, un sistema hexaxial.',
  beat_potentials: 'Tres electrodos registran tres potenciales; su media, el terminal central de Wilson, es la referencia.',
  beat_difference: 'Una derivación es una diferencia: I = LA − RA, II = LL − RA, III = LL − LA.',
  beat_law: 'Suma I y III: obtienes II en cada instante.',
  beat_slide: 'Desliza los tres lados hasta el centro: 0°, +60°, +120°.',
  beat_augment: 'Un miembro frente a la media de los otros dos: aVR, aVL y aVF bisecan los ángulos, 1,5 × el potencial del miembro.',
  beat_project: 'Seis derivaciones, un plano, cada 30°: solo dos de ellas son independientes.',
  ctl_cabrera: 'Orden de Cabrera',
  ctl_groups: 'Grupos de derivaciones',
  lbl_wctShort: 'Σφ',
  lbl_wct: 'Σφ = RA + LA + LL = 0 por construcción: se leen frente al TCW, una referencia, no un cero verdadero',
  lbl_I: 'I = LA − RA',
  lbl_II: 'II = LL − RA',
  lbl_III: 'III = LL − LA',
  lbl_aVF: 'aVF = LL − (RA + LA)/2 = 1,5 × LL',
  lbl_identity: 'I + III − II = {i} + {iii} − {ii} = {d} mV',
  lbl_augSum: 'aVR + aVL + aVF = 0',
  lbl_final: 'II = I + III · aVR + aVL + aVF = 0 · 8 señales independientes',
  lbl_mean: 'QRS medio {deg}',
  lbl_perp: '⟂ {x}',
  lbl_inferior: 'inferior',
  lbl_lateral: 'lateral alta',
  lbl_slow: 'cámara lenta ×{k}',
  lbl_meters: 'Potenciales de los electrodos (frente al TCW, mV)',
  lbl_strips: 'Derivaciones de miembros recompuestas a partir de los tres potenciales',
};

export const tTriangleToWheel = defineDict('scene-triangle-to-wheel', zh, en, es);
export type TriangleToWheelKey = keyof typeof zh;
