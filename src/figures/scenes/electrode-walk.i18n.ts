/**
 * Strings of the "electrode-walk" scene (Placing V1–V6: count, level, then look; lesson f5, spec docs/design/f-explainers.md §4.7).
 * Owned by the scene author. Keys: title, aria, caption, beat_<id> for every BEAT_IDS entry (compile-checked by the
 * `satisfies` below), ctl_* (controls), lbl_* (SVG labels). zh / en / es, Spain Spanish, original wording. Numbers
 * from docs/curriculum/criteria.md (precordial-positions, extra-chest-leads). Checked by
 * tests/figures/scene/strings.test.ts and tests/figures/scenes/electrode-walk.test.ts.
 */
import { defineDict } from '../../i18n/index';

/** Narration beats in order (the spec's ids). electrode-walk.math.ts builds BEATS from these (import from here). */
export const BEAT_IDS = ['count', 'level', 'walk', 'swap', 'extra'] as const;
export type BeatId = (typeof BEAT_IDS)[number];

export const zh = {
  title: '放置 V1–V6：数肋间、对水平、再观察',
  aria: '动画场景：在胸前找到胸导联电极的位置，六个导联的波形随电极位置逐步变化，交换两根导联线会让 R/(R+S) 阶梯出现跳变。',
  caption: '胸导联的形态取决于电极的位置：从胸骨角数肋间，V5–V6 与 V4 同一水平；相邻导联间孤立的跳变提示导联线或电极位置有误。',
  beat_count: '先摸到胸骨角（第2肋），向下数到第4肋间：V1在胸骨右缘，V2在左缘。',
  beat_level: 'V4在第5肋间锁骨中线，V3居中；V5、V6与V4同一水平，不沿肋间走。',
  beat_walk: '从V1到V6，R/(R+S)逐步升高：R波至V4–V5最高，S波渐浅，没有跳变。',
  beat_swap: '交换两根导联线，阶梯就断了：心脏不会在相邻导联间跳变。',
  beat_extra: 'V4R与V4对称，看右心室；V7–V9在背部与V6同一水平，看后壁。',
  ctl_reset: '复位电极',
  ctl_ghost: '显示沿肋间下滑的错误',
  ctl_swap: '导联线',
  ctl_none: '正确',
  ctl_electrode: '{e} 电极，位于 {s} 的位置。按 Enter 选中，再在另一个位置按 Enter 交换',
  lbl_sternal: '胸骨角（第2肋）',
  lbl_ics2: '第2肋间',
  lbl_ics3: '第3肋间',
  lbl_ics4: '第4肋间',
  lbl_ics5: '第5肋间',
  lbl_mcl: '锁骨中线',
  lbl_aal: '腋前线',
  lbl_mal: '腋中线',
  lbl_level: 'V4 水平',
  lbl_ghost: '沿肋间 ✗',
  lbl_breast: '女性：放在乳房下方',
  lbl_ratio: 'R/(R+S)',
  lbl_rs: 'R = S',
  lbl_transition: '移行区',
  lbl_jump: '跳变：检查电极',
  lbl_before: '{a} ↔ {b} 导联线互换',
  lbl_back: '背面',
  lbl_chip: 'ST抬高 ≥ 0.5 mm',
  lbl_rv: '右心室',
  lbl_post: '后壁',
  lbl_gain: '25 mm/s · {g} mm/mV',
  lbl_summary: '从胸骨角数起 · V5–V6 与 V4 同一水平 · 出现跳变＝检查电极',
  lbl_drag: '把电极拖到另一个位置',
  lbl_sr_ok: '导联线顺序正确：V1到V6没有跳变，{tr}。',
  lbl_sr_jump: 'V1到V6的顺序在 {leads} 处跳变：检查电极，{tr}。',
  lbl_sr_tr: '移行区在 {t}',
  lbl_sr_notr: '没有移行区',
} as const satisfies Record<`beat_${BeatId}`, string> & Record<string, string>;

type D = { readonly [K in keyof typeof zh]: string };

export const en: D = {
  title: 'Placing V1–V6: count, level, then look',
  aria: 'Animated scene: the chest electrodes are found on the torso, the six chest leads change step by step with electrode position, and swapping two cables breaks the R/(R+S) staircase.',
  caption: 'Chest-lead shapes follow the electrode: count from the sternal angle, keep V5–V6 at V4’s level, and read a lone jump between neighbours as a cable or position error.',
  beat_count: 'Find the sternal angle (2nd rib) and count down to the 4th space: V1 right, V2 left of the sternum.',
  beat_level: 'V4 in the 5th space, midclavicular line; V3 between; V5 and V6 at V4’s level, not down the space.',
  beat_walk: 'From V1 to V6, R/(R+S) climbs step by step: R grows to V4–V5, S fades. No jumps.',
  beat_swap: 'Swap two cables and the staircase breaks: the heart never jumps between neighbours.',
  beat_extra: 'V4R: V4’s mirror site on the right chest (right ventricle); V7–V9: back, at V6’s level (posterior wall).',
  ctl_reset: 'Reset electrodes',
  ctl_ghost: 'Show the along-the-space error',
  ctl_swap: 'Cables',
  ctl_none: 'correct',
  ctl_electrode: 'Electrode {e} on the {s} site. Press Enter to pick it, then Enter on another site to swap',
  lbl_sternal: 'sternal angle (2nd rib)',
  lbl_ics2: '2nd ICS',
  lbl_ics3: '3rd ICS',
  lbl_ics4: '4th ICS',
  lbl_ics5: '5th ICS',
  lbl_mcl: 'MCL',
  lbl_aal: 'AAL',
  lbl_mal: 'MAL',
  lbl_level: 'V4 level',
  lbl_ghost: 'along the space ✗',
  lbl_breast: 'women: under the breast',
  lbl_ratio: 'R/(R+S)',
  lbl_rs: 'R = S',
  lbl_transition: 'transition',
  lbl_jump: 'jump: check the electrodes',
  lbl_before: '{a} ↔ {b} cables swapped',
  lbl_back: 'back',
  lbl_chip: 'ST↑ ≥ 0.5 mm',
  lbl_rv: 'right ventricle',
  lbl_post: 'posterior wall',
  lbl_gain: '25 mm/s · {g} mm/mV',
  lbl_summary: 'Count from the sternal angle · V5–V6 at V4’s level · a jump = check the electrodes',
  lbl_drag: 'drag an electrode onto another site',
  lbl_sr_ok: 'Cables in order: no jump from V1 to V6; {tr}.',
  lbl_sr_jump: 'The V1–V6 sequence jumps at {leads}: check the electrodes; {tr}.',
  lbl_sr_tr: 'transition at {t}',
  lbl_sr_notr: 'no transition',
};

export const es: D = {
  title: 'Colocar V1–V6: contar, nivelar y mirar',
  aria: 'Escena animada: se localizan los electrodos precordiales en el tórax, las seis derivaciones precordiales cambian paso a paso con la posición del electrodo y al intercambiar dos cables se rompe la escalera R/(R+S).',
  caption: 'La morfología precordial sigue al electrodo: cuenta desde el ángulo esternal, deja V5–V6 al nivel de V4 y lee un salto aislado entre vecinas como un error de cable o de posición.',
  beat_count: 'Palpa el ángulo esternal (2.ª costilla) y baja hasta el 4.º espacio: V1 a la derecha y V2 a la izquierda del esternón.',
  beat_level: 'V4 en el 5.º espacio, línea medioclavicular; V3 en medio; V5 y V6 al nivel de V4, sin seguir el espacio.',
  beat_walk: 'De V1 a V6, R/(R+S) sube paso a paso: la R crece hasta V4–V5 y la S se reduce, sin saltos.',
  beat_swap: 'Intercambia dos cables y la escalera se rompe: el corazón nunca salta entre derivaciones vecinas.',
  beat_extra: 'V4R, simétrico a V4 en el hemitórax derecho (ventrículo derecho); V7–V9, en la espalda al nivel de V6 (pared posterior).',
  ctl_reset: 'Restablecer electrodos',
  ctl_ghost: 'Mostrar el error de seguir el espacio intercostal',
  ctl_swap: 'Cables',
  ctl_none: 'correctos',
  ctl_electrode: 'Electrodo {e} en el punto de {s}. Pulsa Intro para elegirlo y luego Intro en otro punto para intercambiarlos',
  lbl_sternal: 'ángulo esternal (2.ª costilla)',
  lbl_ics2: '2.º EIC',
  lbl_ics3: '3.er EIC',
  lbl_ics4: '4.º EIC',
  lbl_ics5: '5.º EIC',
  lbl_mcl: 'LMC',
  lbl_aal: 'LAA',
  lbl_mal: 'LAM',
  lbl_level: 'nivel de V4',
  lbl_ghost: 'siguiendo el espacio ✗',
  lbl_breast: 'mujeres: bajo la mama',
  lbl_ratio: 'R/(R+S)',
  lbl_rs: 'R = S',
  lbl_transition: 'transición',
  lbl_jump: 'salto: revisa los electrodos',
  lbl_before: 'cables {a} ↔ {b} intercambiados',
  lbl_back: 'espalda',
  lbl_chip: 'ST↑ ≥ 0,5 mm',
  lbl_rv: 'ventrículo derecho',
  lbl_post: 'pared posterior',
  lbl_gain: '25 mm/s · {g} mm/mV',
  lbl_summary: 'Cuenta desde el ángulo esternal · V5–V6 al nivel de V4 · un salto = revisa los electrodos',
  lbl_drag: 'arrastra un electrodo a otro punto',
  lbl_sr_ok: 'Cables en orden: sin saltos de V1 a V6; {tr}.',
  lbl_sr_jump: 'La secuencia V1–V6 salta en {leads}: revisa los electrodos; {tr}.',
  lbl_sr_tr: 'transición en {t}',
  lbl_sr_notr: 'sin transición',
};

export const tElectrodeWalk = defineDict('scene-electrode-walk', zh, en, es);
export type ElectrodeWalkKey = keyof typeof zh;

/** the live-region sentence for a cable map (electrode-walk.math.ts `mapSummary`): its jumps and its transition lead */
export function sayMap(m: { readonly jumps: readonly string[]; readonly transition: string | null }): string {
  const t = tElectrodeWalk;
  const tr = m.transition ? t('lbl_sr_tr', { t: m.transition }) : t('lbl_sr_notr');
  return m.jumps.length ? t('lbl_sr_jump', { leads: m.jumps.join(', '), tr }) : t('lbl_sr_ok', { tr });
}
