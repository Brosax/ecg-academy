/**
 * Strings of the "moving-paper" scene (Paper that moves, a pen that does not; lesson f4, spec docs/design/f-explainers.md §4.6).
 * Owned by the scene author. Keys: title, aria, caption, beat_<id> for every BEAT_IDS entry (compile-checked by the
 * `satisfies` below), ctl_* (toggles), pq_* (Predict), ov_* (narration while a toggle overrides the tour), lbl_* (SVG
 * labels), ro_* (read-outs). zh / en / es, Spain Spanish, original wording. Numbers inside {placeholders} are formatted
 * by the scene (decimal comma in Spanish). Checked by tests/figures/scene/strings.test.ts.
 */
import { defineDict } from '../../i18n/index';

/** Narration beats in order (the spec's ids). moving-paper.math.ts builds BEATS from these (import from here). */
export const BEAT_IDS = ['pulse', 'second', 'rr', 'speed', 'gain'] as const;
export type BeatId = (typeof BEAT_IDS)[number];

export const zh = {
  title: '纸在动，笔不动',
  aria: '动画场景：心电图纸在固定的描笔下向左移动，描出 II 导联；每个定标方波都留下一张缩小一半的存根。',
  caption: '走纸速度和增益只改变记录的画法，不改变心脏：测量之前先看定标方波。',
  beat_pulse: '1 mV 持续 200 ms，画出 10 mm 高、5 mm 宽的方波：机器自带的尺子。',
  beat_second: '25 mm/s：1 小格 40 ms，1 大格 200 ms，25 mm 即 1 s。',
  beat_rr: 'RR 共 4 大格：4 × 200 = 800 ms，300 ÷ 4 = 75 次/分。',
  beat_speed: '50 mm/s 时同一颗心脏被画宽一倍：8 大格，仍是 800 ms。先看走纸速度！',
  beat_gain: '5 mm/mV 时方波和各波都矮一半：读数乘 2。最后的方波确认回到 10 mm/mV。',
  pq_question: '走纸速度 50 mm/s 时，RR 标尺会显示多少？',
  pq_ok: '对：纸走得快一倍，RR 占 8 大格，但每大格只有 100 ms，仍是 800 ms。',
  pq_wrong: '时间不随纸速改变：8 大格 × 100 ms = 800 ms，只是图形被拉宽了。',
  ctl_speed: '走纸速度',
  ctl_gain: '增益',
  ov_speed: '同一颗心脏按 {v} mm/s 重画：1 mm = {ms} ms，RR 占 {n} 大格，仍是 {rr} ms。',
  ov_gain: '同一颗心脏按 {g} mm/mV 重画：定标方波高 {h} mm，1 mm = {mv} mV。',
  lbl_pulseH: '1 mV = {mm} mm',
  lbl_pulseW: '200 ms = {mm} mm',
  lbl_rr: '{n} × {sq} ms = {ms} ms',
  lbl_rate: '{k} ÷ {n} = {bpm} 次/分',
  lbl_qrs: 'QRS ≈ {n} 小格 = {ms} ms',
  lbl_half: '半增益：读数 ×2',
  lbl_pen: '描笔',
  ro_small: '小格 = {ms} ms · {mv} mV',
  ro_large: '大格 = {ms} ms · {mv} mV',
} as const satisfies Record<`beat_${BeatId}`, string> & Record<string, string>;

type D = { readonly [K in keyof typeof zh]: string };

export const en: D = {
  title: 'Paper that moves, a pen that does not',
  aria: 'Animated scene: ECG paper slides left under a fixed pen drawing lead II; each calibration pulse leaves a half-size receipt.',
  caption: 'Speed and gain change only how the record is drawn, never the heart: read the pulse before you measure.',
  beat_pulse: '1 mV for 200 ms draws a box 10 mm tall and 5 mm wide: the machine stamps its own ruler.',
  beat_second: 'At 25 mm/s a small square is 40 ms, a large square 200 ms, and 25 mm make 1 s.',
  beat_rr: 'Four large squares between two R waves: 4 × 200 = 800 ms, and 300 ÷ 4 = 75 per minute.',
  beat_speed: 'At 50 mm/s the same heart comes out twice as wide: 8 squares, still 800 ms. Read the speed first.',
  beat_gain: 'At 5 mm/mV the pulse and every wave are half as tall: multiply by 2. A last pulse confirms 10 mm/mV.',
  pq_question: 'At 50 mm/s, what will the RR bracket read?',
  pq_ok: 'Right: the paper ran twice as fast, so 8 squares, but each is only 100 ms. Still 800 ms.',
  pq_wrong: 'Time does not follow the paper: 8 squares × 100 ms = 800 ms. Only the drawing got wider.',
  ctl_speed: 'Paper speed',
  ctl_gain: 'Gain',
  ov_speed: 'Same heart redrawn at {v} mm/s: 1 mm = {ms} ms, so the RR spans {n} large squares, still {rr} ms.',
  ov_gain: 'Same heart redrawn at {g} mm/mV: the pulse is {h} mm tall and 1 mm = {mv} mV.',
  lbl_pulseH: '1 mV = {mm} mm',
  lbl_pulseW: '200 ms = {mm} mm',
  lbl_rr: '{n} × {sq} ms = {ms} ms',
  lbl_rate: '{k} ÷ {n} = {bpm}/min',
  lbl_qrs: 'QRS ≈ {n} small squares = {ms} ms',
  lbl_half: 'half gain: × 2',
  lbl_pen: 'pen',
  ro_small: 'Small square = {ms} ms · {mv} mV',
  ro_large: 'Large square = {ms} ms · {mv} mV',
};

export const es: D = {
  title: 'El papel se mueve, la pluma no',
  aria: 'Escena animada: el papel del ECG se desliza bajo una plumilla fija que dibuja la derivación II; cada pulso de calibración deja un resguardo a mitad de tamaño.',
  caption: 'La velocidad y la ganancia solo cambian cómo se dibuja el registro, nunca el corazón: mira el pulso antes de medir.',
  beat_pulse: '1 mV durante 200 ms dibuja un rectángulo de 10 mm de alto y 5 mm de ancho: el aparato imprime su propia regla.',
  beat_second: 'A 25 mm/s un cuadrito vale 40 ms, un cuadro grande 200 ms, y 25 mm son 1 s.',
  beat_rr: 'Cuatro cuadros grandes entre dos ondas R: 4 × 200 = 800 ms, y 300 ÷ 4 = 75 lpm.',
  beat_speed: 'A 50 mm/s el mismo corazón sale el doble de ancho: 8 cuadros, y siguen siendo 800 ms. Mira primero la velocidad.',
  beat_gain: 'A 5 mm/mV el pulso y todas las ondas miden la mitad: multiplica por 2. Un último pulso confirma los 10 mm/mV.',
  pq_question: 'A 50 mm/s, ¿qué marcará el corchete RR?',
  pq_ok: 'Correcto: el papel corrió el doble, así que 8 cuadros, pero cada uno vale solo 100 ms. Siguen siendo 800 ms.',
  pq_wrong: 'El tiempo no sigue al papel: 8 cuadros × 100 ms = 800 ms. Solo se ensanchó el dibujo.',
  ctl_speed: 'Velocidad del papel',
  ctl_gain: 'Ganancia',
  ov_speed: 'El mismo corazón redibujado a {v} mm/s: 1 mm = {ms} ms, el RR ocupa {n} cuadros grandes y sigue siendo {rr} ms.',
  ov_gain: 'El mismo corazón redibujado a {g} mm/mV: el pulso mide {h} mm de alto y 1 mm = {mv} mV.',
  lbl_pulseH: '1 mV = {mm} mm',
  lbl_pulseW: '200 ms = {mm} mm',
  lbl_rr: '{n} × {sq} ms = {ms} ms',
  lbl_rate: '{k} ÷ {n} = {bpm} lpm',
  lbl_qrs: 'QRS ≈ {n} cuadritos = {ms} ms',
  lbl_half: 'media ganancia: × 2',
  lbl_pen: 'plumilla',
  ro_small: 'Cuadrito = {ms} ms · {mv} mV',
  ro_large: 'Cuadro grande = {ms} ms · {mv} mV',
};

export const tMovingPaper = defineDict('scene-moving-paper', zh, en, es);
export type MovingPaperKey = keyof typeof zh;
