/**
 * Strings of the "cable-swap" scene (Swap two cables, watch six leads; lesson f6, spec docs/design/f-explainers.md §4.8).
 * Owned by the scene author. Keys: title, aria, caption, beat_<id> for every BEAT_IDS entry (compile-checked by the
 * `satisfies` below), ctl_* (controls), pq_* (Predict), lbl_* (SVG labels), th_* (table header), row_* (the tell-tale
 * sign of each reversal). zh / en / es, Spain Spanish, original wording. Electrode and lead names (RA, LA, LL, RL,
 * I … aVF, V1–V6) stay as codes in every language, as on the machine. Checked by tests/figures/scene/strings.test.ts.
 */
import { defineDict } from '../../i18n/index';

/** Narration beats in order (the spec's ids). cable-swap.math.ts builds BEATS from these (import from here). */
export const BEAT_IDS = ['potentials', 'laRa', 'wct', 'raRl'] as const;
export type BeatId = (typeof BEAT_IDS)[number];

export const zh = {
  title: '换两根导线，看六个导联',
  aria: '动画场景：四根肢体导线从躯干接到心电图机；交换两根导线后，六个肢体导联、V1–V6 一行和反接特征表都由同一组电位重新计算。',
  caption: '点击两个电极夹即可交换导线；每条曲线都由同样三个电位重新计算。',
  beat_potentials: '每根导线记录所夹肢体的电位；一个导联就是两个电位之差。',
  beat_laRa: 'LA与RA对调：I倒置，II和III换位，aVR和aVL换位，aVF不变。',
  beat_wct: '胸导联以三者的平均为参照：顺序任意，平均不变，V1–V6 不变。',
  beat_raRl: '把 RA 导线夹到右腿：II 的两端都在腿上，II 成一条直线。',
  ctl_reset: '复位',
  ctl_formulas: '显示公式',
  ctl_dextro: '右位心？',
  ctl_plug: '{c} 导线，夹在 {l}：按下选中，再选另一根导线即可交换',
  ctl_row: '应用 {s} 反接',
  lbl_rl: '中性电极 不入公式',
  lbl_wct: '中心电端：RA、LA、LL 顺序任意，平均相同',
  lbl_wctName: '中心电端',
  lbl_vSame: '✓ V1–V6 不变',
  lbl_vShift: '只有三个肢体之间互换才不影响 V1–V6',
  lbl_flat: '直线：两端都在腿上',
  lbl_flatShort: '直线',
  lbl_chip: 'LA↔RA：I 倒置 + aVR 直立 + 胸导联正常 = 上肢导线反接，不是右位心',
  lbl_dextro: '右位心时 R 波从 V1 到 V6 逐渐变小；这里胸导联正常，所以是导线问题。',
  lbl_recorder: '心电图机',
  lbl_gain: '25 mm/s · I–aVF {g} mm/mV · V1–V6 {gv} mm/mV',
  th_swap: '反接',
  th_key: '特征',
  row_laRa: 'I 倒置',
  row_laLl: 'III 倒置',
  row_raLl: 'II 倒置',
  row_raRl: 'II 直线',
  row_laRl: 'III 直线',
  pq_question: 'LA ↔ LL：哪个导联倒置？',
  pq_ok: '对：III = LL − LA 的两端对调，所以 III 倒置；I 与 II 只是互换。',
  pq_wrong: '不对：III = LL − LA 的两端对调，所以倒置的是 III；I 与 II 只是互换。',
} as const satisfies Record<`beat_${BeatId}`, string> & Record<string, string>;

type D = { readonly [K in keyof typeof zh]: string };

export const en: D = {
  title: 'Swap two cables, watch six leads',
  aria: 'Animated scene: four limb cables run from the torso to the ECG machine; when two are swapped, the six limb leads, the V1–V6 row and a reversal table are recomputed from the same potentials.',
  caption: 'Click two plugs to swap their cables; every strip is recomputed from the same three potentials.',
  beat_potentials: 'Each cable records the limb it is clipped to; a lead is the difference of two of them.',
  beat_laRa: 'Swap LA and RA: I turns upside down, II and III trade places, so do aVR and aVL; aVF stays.',
  beat_wct: 'The chest leads use the average of all three: any order, same average, so V1–V6 do not change.',
  beat_raRl: 'Put the RA cable on the right leg: both ends of II now sit on the legs, so II is flat.',
  ctl_reset: 'Reset',
  ctl_formulas: 'Show formulas',
  ctl_dextro: 'Dextrocardia?',
  ctl_plug: '{c} cable, clipped to {l}: press to pick it, then pick another cable to swap them',
  ctl_row: 'Apply the {s} reversal',
  lbl_rl: 'neutral: in no formula',
  lbl_wct: 'WCT: any order of RA, LA, LL gives the same average',
  lbl_wctName: 'WCT',
  lbl_vSame: '✓ V1–V6 unchanged',
  lbl_vShift: 'only swaps among the three limbs leave V1–V6 alone',
  lbl_flat: 'flat: both ends on the legs',
  lbl_flatShort: 'flat',
  lbl_chip: 'LA↔RA: I inverted + aVR upright + normal chest leads = arm cables, not dextrocardia',
  lbl_dextro: 'Dextrocardia would make R shrink from V1 to V6; these chest leads are normal, so think cables.',
  lbl_recorder: 'ECG machine',
  lbl_gain: '25 mm/s · I–aVF {g} mm/mV · V1–V6 {gv} mm/mV',
  th_swap: 'swap',
  th_key: 'tell',
  row_laRa: 'I inverted',
  row_laLl: 'III inverted',
  row_raLl: 'II inverted',
  row_raRl: 'II flat',
  row_laRl: 'III flat',
  pq_question: 'LA ↔ LL: which lead is inverted?',
  pq_ok: 'Right: III = LL − LA has both of its ends swapped, so III flips; I and II only trade places.',
  pq_wrong: 'Not quite: III = LL − LA has both of its ends swapped, so III flips; I and II only trade places.',
};

export const es: D = {
  title: 'Intercambia dos cables y observa seis derivaciones',
  aria: 'Escena animada: cuatro cables de los miembros van del tronco al electrocardiógrafo; al intercambiar dos, las seis derivaciones de los miembros, la fila V1–V6 y una tabla de inversiones se recalculan con los mismos potenciales.',
  caption: 'Pulsa dos pinzas para intercambiar sus cables; cada tira se recalcula a partir de los mismos tres potenciales.',
  beat_potentials: 'Cada cable registra el miembro en el que está pinzado; una derivación es la diferencia entre dos de ellos.',
  beat_laRa: 'Intercambia LA y RA: I se invierte, II y III se intercambian, igual que aVR y aVL; aVF no cambia.',
  beat_wct: 'Las precordiales usan la media de los tres: en cualquier orden la media es igual y V1–V6 no cambian.',
  beat_raRl: 'Pon el cable RA en la pierna derecha: los dos extremos de II quedan en las piernas y II sale plana.',
  ctl_reset: 'Restablecer',
  ctl_formulas: 'Mostrar fórmulas',
  ctl_dextro: '¿Dextrocardia?',
  ctl_plug: 'Cable {c}, pinzado en {l}: pulsa para elegirlo y luego elige otro cable para intercambiarlos',
  ctl_row: 'Aplicar la inversión {s}',
  lbl_rl: 'neutro: sin fórmula',
  lbl_wct: 'TCW: RA, LA, LL en cualquier orden dan la misma media',
  lbl_wctName: 'TCW',
  lbl_vSame: '✓ V1–V6 sin cambios',
  lbl_vShift: 'solo los intercambios entre los tres miembros dejan V1–V6 intactas',
  lbl_flat: 'plana: polos en las piernas',
  lbl_flatShort: 'plana',
  lbl_chip: 'LA↔RA: I invertida + aVR positiva + precordiales normales = cables de los brazos, no dextrocardia',
  lbl_dextro: 'En la dextrocardia la R disminuye de V1 a V6; aquí las precordiales son normales: piensa en los cables.',
  lbl_recorder: 'electrocardiógrafo',
  lbl_gain: '25 mm/s · I–aVF {g} mm/mV · V1–V6 {gv} mm/mV',
  th_swap: 'inversión',
  th_key: 'clave',
  row_laRa: 'I invertida',
  row_laLl: 'III invertida',
  row_raLl: 'II invertida',
  row_raRl: 'II plana',
  row_laRl: 'III plana',
  pq_question: 'LA ↔ LL: ¿qué derivación se invierte?',
  pq_ok: 'Correcto: en III = LL − LA se intercambian los dos extremos, así que III se invierte; I y II solo cambian de sitio.',
  pq_wrong: 'No exactamente: en III = LL − LA se intercambian los dos extremos, así que III se invierte; I y II solo cambian de sitio.',
};

export const tCableSwap = defineDict('scene-cable-swap', zh, en, es);
export type CableSwapKey = keyof typeof zh;
