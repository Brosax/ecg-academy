/**
 * Strings of the "conduction-journey" scene (One beat along the wire: what each structure draws; lesson f1, spec
 * docs/design/f-explainers.md §4.1). Owned by the scene author. Keys: title, aria, caption, beat_<id> for every BEAT_IDS
 * entry (compile-checked by the `satisfies` below), ctl_* (toggles), lbl_* (SVG labels). zh / en / es, Spain Spanish,
 * original wording. Numbers are those of docs/curriculum/criteria.md (p-wave-normal, pr-normal, qrs-duration-normal,
 * intrinsic-rates, cell-response-types). Checked by tests/figures/scene/strings.test.ts and
 * tests/figures/scenes/conduction-journey.test.ts.
 */
import { defineDict } from '../../i18n/index';

/** Narration beats in order (the spec's ids). conduction-journey.math.ts builds BEATS from these (import from here). */
export const BEAT_IDS = ['p', 'av', 'his', 'qrs', 'st', 't'] as const;
export type BeatId = (typeof BEAT_IDS)[number];

export const zh = {
  title: '一搏沿导线走：每个结构画出什么',
  aria: '动画：示意心脏与 II 导联同步。窦房结、房室结和希氏束–浦肯野系统只占用时间（平直的 PR 段）；只有心房肌和心室肌除极、复极时笔才画出 P、QRS 和 T。',
  caption: '笔画的是本课合成心电图的 II 导联（慢放）；示意心脏显示此刻哪个结构在工作。点击下方 12 导联可跳到本搏的任一时刻。',
  beat_p: '窦房结放电，细胞太少，纸上看不见；随后心房肌除极，画出 P 波。',
  beat_av: '房室结把冲动拖住：笔照样前进，却什么也画不出。',
  beat_his: '希氏束和浦肯野纤维飞快地把冲动送到各处——纸上仍是直线。',
  beat_qrs: '心室肌质量大、传得快：画出高而窄的 QRS 波群。',
  beat_st: '每个心室细胞都在平台期：彼此没有电位差，ST 段平直。',
  beat_t: '心肌复极较慢：T 波宽而圆钝。导线 = 时间，肌肉 = 波。',
  ctl_labels: '阶段标签',
  lbl_lead: 'II 导联',
  lbl_p: 'P < 120 ms',
  lbl_pr: 'PR 120–200 ms',
  lbl_qrs: 'QRS < 110 ms',
  lbl_st: 'ST',
  lbl_t: 'T',
  lbl_ladder: '固有频率',
  lbl_rateSa: '60–100 次/分',
  lbl_rateAv: '35–60 次/分',
  lbl_rateV: '20–40 次/分',
  lbl_speedAv: '0.02–0.05 m/s',
  lbl_speedHis: '2–4 m/s',
  lbl_fewCells: '细胞太少',
  lbl_sa: '窦房结',
  lbl_av: '房室结',
  lbl_his: '希氏束',
  lbl_ra: '右心房',
  lbl_la: '左心房',
  lbl_rv: '右心室',
  lbl_lv: '左心室',
  lbl_apTitle: '心室肌细胞',
  lbl_phase: '{n} 期',
  lbl_moral: '导线 = 时间 · 肌肉 = 波',
} as const satisfies Record<`beat_${BeatId}`, string> & Record<string, string>;

type D = { readonly [K in keyof typeof zh]: string };

export const en: D = {
  title: 'One beat along the wire: what each structure draws',
  aria: 'Animation: a schematic heart in step with lead II. The sinus node, AV node and His–Purkinje system only take time (the flat PR segment); the pen draws P, QRS and T only while atrial or ventricular muscle depolarizes or recovers.',
  caption: 'The pen draws lead II of the lesson’s synthetic ECG in slow motion; the schematic heart shows which structure is working. Click the 12-lead below to jump to any instant of this beat.',
  beat_p: 'The sinus node fires unseen — too few cells. Then atrial muscle depolarizes: the P wave.',
  beat_av: 'The AV node holds the impulse: the pen keeps moving but draws nothing.',
  beat_his: 'His bundle and Purkinje fibres deliver it everywhere fast — still a flat line.',
  beat_qrs: 'Ventricular muscle: a large mass activated fast — a tall, narrow QRS.',
  beat_st: 'Every ventricular cell is on its plateau: no difference between them, so ST is flat.',
  beat_t: 'Muscle recovers more slowly: a broad T wave. Wire = time, muscle = waves.',
  ctl_labels: 'Phase labels',
  lbl_lead: 'Lead II',
  lbl_p: 'P < 120 ms',
  lbl_pr: 'PR 120–200 ms',
  lbl_qrs: 'QRS < 110 ms',
  lbl_st: 'ST',
  lbl_t: 'T',
  lbl_ladder: 'Intrinsic rate',
  lbl_rateSa: '60–100 /min',
  lbl_rateAv: '35–60 /min',
  lbl_rateV: '20–40 /min',
  lbl_speedAv: '0.02–0.05 m/s',
  lbl_speedHis: '2–4 m/s',
  lbl_fewCells: 'too few cells',
  lbl_sa: 'Sinus node',
  lbl_av: 'AV node',
  lbl_his: 'His bundle',
  lbl_ra: 'RA',
  lbl_la: 'LA',
  lbl_rv: 'RV',
  lbl_lv: 'LV',
  lbl_apTitle: 'Ventricular cell',
  lbl_phase: 'phase {n}',
  lbl_moral: 'wire = time · muscle = waves',
};

export const es: D = {
  title: 'Un latido por el cable: qué dibuja cada estructura',
  aria: 'Animación: un corazón esquemático sincronizado con la derivación II. El nódulo sinusal, el nódulo AV y el sistema His–Purkinje solo ocupan tiempo (el segmento PR plano); la plumilla dibuja P, QRS y T solo mientras el músculo auricular o ventricular se despolariza o se recupera.',
  caption: 'La plumilla dibuja a cámara lenta la derivación II del ECG sintético de la lección; el corazón esquemático muestra qué estructura trabaja. Pulsa el ECG de 12 derivaciones de abajo para saltar a cualquier instante de este latido.',
  beat_p: 'El nódulo sinusal dispara sin dejar rastro: son muy pocas células. Luego se despolarizan las aurículas: la onda P.',
  beat_av: 'El nódulo AV retiene el impulso: la plumilla avanza, pero no dibuja nada.',
  beat_his: 'El haz de His y las fibras de Purkinje lo reparten muy deprisa; en el papel sigue la línea plana.',
  beat_qrs: 'Músculo ventricular: mucha masa activada deprisa; un QRS alto y estrecho.',
  beat_st: 'Todas las células ventriculares están en meseta: no hay diferencia entre ellas y el segmento ST es plano.',
  beat_t: 'El músculo se recupera más despacio: una onda T ancha. Cable = tiempo, músculo = ondas.',
  ctl_labels: 'Etiquetas de fase',
  lbl_lead: 'Derivación II',
  lbl_p: 'P < 120 ms',
  lbl_pr: 'PR 120–200 ms',
  lbl_qrs: 'QRS < 110 ms',
  lbl_st: 'ST',
  lbl_t: 'T',
  lbl_ladder: 'Frecuencia intrínseca',
  lbl_rateSa: '60–100 lpm',
  lbl_rateAv: '35–60 lpm',
  lbl_rateV: '20–40 lpm',
  lbl_speedAv: '0,02–0,05 m/s',
  lbl_speedHis: '2–4 m/s',
  lbl_fewCells: 'muy pocas células',
  lbl_sa: 'Nódulo sinusal',
  lbl_av: 'Nódulo AV',
  lbl_his: 'Haz de His',
  lbl_ra: 'AD',
  lbl_la: 'AI',
  lbl_rv: 'VD',
  lbl_lv: 'VI',
  lbl_apTitle: 'Célula ventricular',
  lbl_phase: 'fase {n}',
  lbl_moral: 'cable = tiempo · músculo = ondas',
};

export const tConductionJourney = defineDict('scene-conduction-journey', zh, en, es);
export type ConductionJourneyKey = keyof typeof zh;
