/**
 * Strings of the "vector-pen" scene (The heart vector is the pen; lesson f2, spec docs/design/f-explainers.md §4.2).
 * Owned by the scene author. Keys: title, aria, caption, beat_<id> for every BEAT_IDS entry (compile-checked by the
 * `satisfies` below), ctl_* (controls), pq_* (Predict), lbl_* / chip_* (SVG labels). zh / en / es, Spain Spanish,
 * original wording. Checked by tests/figures/scene/strings.test.ts (same keys, no empties, placeholders, lesson-text
 * gates). Lead names (I, II, aVR …) and wave letters (q, R, s, T) are notation and stay untranslated in the component.
 */
import { defineDict } from '../../i18n/index';

/** Narration beats in order (the spec's ids). vector-pen.math.ts builds BEATS from these (import from here). */
export const BEAT_IDS = ['sum', 'drop', 'draw', 'turn', 't'] as const;
export type BeatId = (typeof BEAT_IDS)[number];

export const zh = {
  title: '心电向量就是那支笔',
  aria: '动画场景：六轴系统上的心电向量与它画出的导联纸带；向量在导联轴上的投影决定笔的高度',
  caption: '一个示意向量环投影到各导联轴上，就画出了全部肢体导联。可拖动向量，或选择纸带上的导联。',
  beat_sum: '许多小的除极波阵面相加，合成一支箭头：心电向量。',
  beat_drop: '每个导联只看到箭头在自身导联轴上的投影，投影就是笔的高度。',
  beat_draw: '箭头沿向量环转动，投影随之移动，笔画出 QRS 波群。',
  beat_turn: '转动导联轴：同一向量环画出的波群变小，垂直时双向，背离时倒置。',
  beat_t: 'T 向量与 QRS 向量方向相近，所以 T 波与 QRS 波群同向。',
  ctl_lead: '纸带上的导联',
  ctl_all: '全部六个导联',
  ctl_cabrera: 'Cabrera 顺序',
  ctl_vector: 'QRS 平均向量：{deg}',
  lbl_sum: '心电向量 = 所有波阵面之和',
  lbl_shadow: '投影',
  lbl_mean: 'QRS 平均向量',
  lbl_tvec: 'T 向量',
  lbl_pos: '正向',
  lbl_iso: '双向',
  lbl_neg: '负向',
  lbl_cell: '{lead} 导联：{kind}',
  chip_toward: '朝向正极 → 向上',
  chip_across: '垂直 → 双向',
  chip_away: '背离 → 向下',
  lbl_tnote: 'T 向量 ≈ QRS 方向 → 同向',
  pq_question: '向量指向哪个方向时，III 导联呈双向？',
  pq_ok: '正确：+30° 的向量与 III 导联轴（+120°）垂直，投影为零，QRS 呈双向。',
  pq_wrong: '不对：向量与 III 导联轴（+120°）垂直时它才呈双向；在这些选项中是 +30°。',
} as const satisfies Record<`beat_${BeatId}`, string> & Record<string, string>;

type D = { readonly [K in keyof typeof zh]: string };

export const en: D = {
  title: 'The heart vector is the pen',
  aria: 'Animated scene: a heart vector on the hexaxial wheel and the lead strip it draws; its shadow on the lead axis sets the pen height',
  caption: 'One schematic loop, projected on each lead axis, draws every limb lead. Drag the vector or pick the lead on the strip.',
  beat_sum: 'Many small activation fronts add up to one arrow: the heart vector.',
  beat_drop: 'A lead sees only the shadow of the arrow on its own axis: that shadow is the pen height.',
  beat_draw: 'As the arrow sweeps its loop, the shadow moves and the pen draws the QRS.',
  beat_turn: 'Turn the axis: the same loop draws a smaller complex, equiphasic across the vector, then inverted.',
  beat_t: 'The T vector points close to the QRS vector, so T has the same polarity as the QRS.',
  ctl_lead: 'Lead on the strip',
  ctl_all: 'All six leads',
  ctl_cabrera: 'Cabrera order',
  ctl_vector: 'Mean QRS vector: {deg}',
  lbl_sum: 'heart vector = sum of all fronts',
  lbl_shadow: 'shadow',
  lbl_mean: 'mean QRS',
  lbl_tvec: 'T vector',
  lbl_pos: 'positive',
  lbl_iso: 'equiphasic',
  lbl_neg: 'negative',
  lbl_cell: 'Lead {lead}: {kind}',
  chip_toward: 'toward + → up',
  chip_across: 'across → equiphasic',
  chip_away: 'away → down',
  lbl_tnote: 'T vector ≈ QRS direction → same polarity',
  pq_question: 'At which direction of the vector is lead III equiphasic?',
  pq_ok: 'Right: +30° is perpendicular to the III axis (+120°), so the shadow is zero: equiphasic.',
  pq_wrong: 'Not quite: III is equiphasic with the vector perpendicular to +120°; of these, +30°.',
};

export const es: D = {
  title: 'El vector cardíaco es la pluma',
  aria: 'Escena animada: un vector cardíaco sobre el sistema hexaxial y el registro que dibuja; su sombra sobre el eje de la derivación fija la altura de la pluma',
  caption: 'Una sola asa esquemática, proyectada sobre el eje de cada derivación, dibuja todas las derivaciones de los miembros. Arrastra el vector o elige la derivación del registro.',
  beat_sum: 'Muchos frentes de activación pequeños se suman en una sola flecha: el vector cardíaco.',
  beat_drop: 'Una derivación solo ve la sombra de la flecha sobre su propio eje: esa sombra es la altura de la pluma.',
  beat_draw: 'Cuando la flecha recorre su asa, la sombra se mueve y la pluma dibuja el QRS.',
  beat_turn: 'Gira el eje: la misma asa da un complejo menor, isodifásico si el eje es perpendicular, y luego invertido.',
  beat_t: 'El vector T apunta cerca del vector QRS; por eso la onda T tiene la misma polaridad que el QRS.',
  ctl_lead: 'Derivación del registro',
  ctl_all: 'Las seis derivaciones',
  ctl_cabrera: 'Orden de Cabrera',
  ctl_vector: 'Vector QRS medio: {deg}',
  lbl_sum: 'vector cardíaco = suma de todos los frentes',
  lbl_shadow: 'sombra',
  lbl_mean: 'QRS medio',
  lbl_tvec: 'vector T',
  lbl_pos: 'positiva',
  lbl_iso: 'isodifásica',
  lbl_neg: 'negativa',
  lbl_cell: 'Derivación {lead}: {kind}',
  chip_toward: 'hacia el polo + → arriba',
  chip_across: 'perpendicular → isodifásica',
  chip_away: 'alejándose → abajo',
  lbl_tnote: 'vector T ≈ dirección del QRS → misma polaridad',
  pq_question: '¿Con qué dirección del vector es isodifásica la derivación III?',
  pq_ok: 'Correcto: a +30° el vector es perpendicular al eje de III (+120°); su sombra es nula y el QRS es isodifásico.',
  pq_wrong: 'No exactamente: III es isodifásica cuando el vector es perpendicular a su eje (+120°); de estas opciones, +30°.',
};

export const tVectorPen = defineDict('scene-vector-pen', zh, en, es);
export type VectorPenKey = keyof typeof zh;
