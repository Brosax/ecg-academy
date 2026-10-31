/**
 * Strings of the "noisy-electrode" scene (Which electrode is shaking?; lesson f6, spec docs/design/f-explainers.md §4.9).
 * Owned by the scene author. Keys: title, aria, caption, beat_<id> for every BEAT_IDS entry (compile-checked by the
 * `satisfies` below), ctl_* (controls), pq_* (Predict), lbl_* (SVG labels). zh / en / es, Spain Spanish, original
 * wording. Checked by tests/figures/scene/strings.test.ts (same keys, no empties, placeholders, lesson-text gates).
 * Placeholders: {e} the electrode as a modifier (en "left-leg", es "de la pierna izquierda", zh "左腿"), {c} the clean
 * bipolar lead, {ms} the RR interval. Numbers in the narration are never written unless they are drawn. nar_heart_other
 * replaces beat_heart when the noise is not the 5-Hz tremor (only the tremor mimics flutter).
 */
import { defineDict } from '../../i18n/index';

/** Narration beats in order (the spec's ids). noisy-electrode.math.ts builds BEATS from these (import from here). */
export const BEAT_IDS = ['shake', 'find', 'move', 'heart'] as const;
export type BeatId = (typeof BEAT_IDS)[number];

export const zh = {
  title: '哪个电极在抖？',
  aria: '动画场景：躯干上的三个肢体电极，六条肢体导联记录条、一行胸导联和一张"元凶"表。一个电极在抖，噪声只进入用到它的导联。',
  caption: '一份干净的合成心电图：噪声只加在一个电极的电位上，十二个导联都按导联公式随之变化。点击一个电极，预测哪条导联干净，再揭晓，噪声随即移过去。',
  beat_shake: '{e}电极在抖：噪声随它的电位进入所有用到它的导联。',
  beat_find: '两个双极导联有噪声、一个干净：元凶是二者共用的电极；三个 aV 导联中它自己的噪声最大。',
  beat_move: '把噪声移到其他电极上，图案随之移动：每个电极都有自己的一行。',
  beat_heart: 'QRS 波群按原来的 RR 间期照常穿过：是伪差，不是心房扑动。',
  nar_heart_other: 'QRS 波群按原来的 RR 间期照常穿过：节律未变，噪声只是伪差。',
  ctl_noise: '噪声类型',
  ctl_tremor: '震颤 5 Hz',
  ctl_mains: '交流电 50 Hz',
  ctl_wander: '基线漂移 0.3 Hz',
  ctl_emg: '肌电 20–60 Hz',
  ctl_amp: '噪声幅度',
  ctl_moveTo: '把{e}电极选为噪声来源',
  lbl_RA: '右臂',
  lbl_LA: '左臂',
  lbl_LL: '左腿',
  lbl_rule: '两个双极导联有噪声、一个干净 → 二者共用的电极',
  lbl_largest: 'aV 中最大',
  lbl_clean: '干净',
  lbl_chest: 'V1–V6 经中心电端：各 ⅓',
  lbl_th_e: '电极',
  lbl_th_bi: '有噪声的双极导联',
  lbl_th_clean: '干净',
  lbl_th_av: '最大的 aV 导联',
  lbl_rate: '5 Hz = 300 次/分',
  lbl_rr: 'RR {ms} ms 不变',
  lbl_verdict: '伪差，不是心房扑动',
  lbl_verdict_other: '伪差，节律不变',
  pq_question: '先点击另一个电极：之后哪条肢体导联会保持干净？',
  pq_ok: '正确：{c} 不用{e}电极，所以保持干净。',
  pq_wrong: '不对：干净的是 {c}——只有它不用{e}电极。',
} as const satisfies Record<`beat_${BeatId}`, string> & Record<string, string>;

type D = { readonly [K in keyof typeof zh]: string };

export const en: D = {
  title: 'Which electrode is shaking?',
  aria: 'Animated scene: a torso with the three limb electrodes, six limb-lead strips, a row of chest leads and a culprit table. One electrode shakes; the noise enters only the leads that use it.',
  caption: 'A clean synthetic ECG: the noise is added to one electrode potential and all twelve leads follow from the lead formulas. Click an electrode, predict the clean lead, then reveal to move the noise.',
  beat_shake: 'The {e} electrode shakes: its potential carries the noise into every lead that uses it.',
  beat_find: 'Two noisy bipolar leads, one clean: blame their shared electrode. Of the aV leads, its own is the noisiest.',
  beat_move: 'Move the noise to the other electrodes and the pattern moves with it: each electrode gets its own row.',
  beat_heart: 'The QRS complexes march through at the same RR: artefact, not flutter.',
  nar_heart_other: 'The QRS complexes march through at the same RR: the rhythm is untouched, the noise is artefact.',
  ctl_noise: 'Noise type',
  ctl_tremor: 'tremor 5 Hz',
  ctl_mains: 'mains 50 Hz',
  ctl_wander: 'wander 0.3 Hz',
  ctl_emg: 'EMG 20–60 Hz',
  ctl_amp: 'Noise amplitude',
  ctl_moveTo: 'Propose the {e} electrode as the noise source',
  lbl_RA: 'right-arm',
  lbl_LA: 'left-arm',
  lbl_LL: 'left-leg',
  lbl_rule: '2 noisy bipolar leads + 1 clean → the electrode they share',
  lbl_largest: 'largest aV',
  lbl_clean: 'clean',
  lbl_chest: 'V1–V6 via Wilson: ⅓ each',
  lbl_th_e: 'electrode',
  lbl_th_bi: 'noisy bipolar leads',
  lbl_th_clean: 'clean',
  lbl_th_av: 'largest aV lead',
  lbl_rate: '5 Hz = 300 /min',
  lbl_rr: 'RR {ms} ms unchanged',
  lbl_verdict: 'artefact, not flutter',
  lbl_verdict_other: 'artefact, rhythm intact',
  pq_question: 'Click another electrode first: which limb lead will then stay clean?',
  pq_ok: 'Correct: {c} does not use the {e} electrode, so it stays clean.',
  pq_wrong: 'Not quite: {c} is the clean one — it is the only lead without the {e} electrode.',
};

export const es: D = {
  title: '¿Qué electrodo tiembla?',
  aria: 'Escena animada: un torso con los tres electrodos de los miembros, seis tiras de derivaciones de los miembros, una fila de precordiales y una tabla del culpable. Un electrodo tiembla; el ruido solo entra en las derivaciones que lo usan.',
  caption: 'Un ECG sintético limpio: el ruido se suma al potencial de un electrodo y las doce derivaciones siguen sus fórmulas. Pulsa un electrodo, predice la derivación limpia y revela para mover el ruido.',
  beat_shake: 'El electrodo {e} tiembla: su potencial lleva el ruido a todas las derivaciones que lo usan.',
  beat_find: 'Dos bipolares con ruido y una limpia: culpa al electrodo que comparten; su derivación aV es la de más ruido entre las aV.',
  beat_move: 'Mueve el ruido a los otros electrodos y el patrón se mueve con él: cada electrodo tiene su fila.',
  beat_heart: 'Los complejos QRS siguen pasando con el mismo RR: artefacto, no flúter.',
  nar_heart_other: 'Los complejos QRS siguen pasando con el mismo RR: el ritmo no cambia, el ruido es un artefacto.',
  ctl_noise: 'Tipo de ruido',
  ctl_tremor: 'temblor 5 Hz',
  ctl_mains: 'red 50 Hz',
  ctl_wander: 'deriva 0,3 Hz',
  ctl_emg: 'EMG 20–60 Hz',
  ctl_amp: 'Amplitud del ruido',
  ctl_moveTo: 'Proponer el electrodo {e} como origen del ruido',
  lbl_RA: 'del brazo derecho',
  lbl_LA: 'del brazo izquierdo',
  lbl_LL: 'de la pierna izquierda',
  lbl_rule: '2 bipolares con ruido + 1 limpia → el electrodo que comparten',
  lbl_largest: 'aV máxima',
  lbl_clean: 'limpia',
  lbl_chest: 'V1–V6 vía Wilson: ⅓ cada una',
  lbl_th_e: 'electrodo',
  lbl_th_bi: 'bipolares con ruido',
  lbl_th_clean: 'limpia',
  lbl_th_av: 'derivación aV máxima',
  lbl_rate: '5 Hz = 300 lpm',
  lbl_rr: 'RR {ms} ms sin cambios',
  lbl_verdict: 'artefacto, no flúter',
  lbl_verdict_other: 'artefacto, ritmo intacto',
  pq_question: 'Pulsa antes otro electrodo: ¿qué derivación de los miembros quedará entonces limpia?',
  pq_ok: 'Correcto: {c} no usa el electrodo {e}, por eso queda limpia.',
  pq_wrong: 'No exactamente: la limpia es {c}, la única que no usa el electrodo {e}.',
};

export const tNoisyElectrode = defineDict('scene-noisy-electrode', zh, en, es);
export type NoisyElectrodeKey = keyof typeof zh;
