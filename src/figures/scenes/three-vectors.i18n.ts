/**
 * Strings of the "three-vectors" scene (Three vectors, two windows: V1 and V6; lesson f2, spec docs/design/f-explainers.md §4.3).
 * Owned by the scene author. Keys: title, aria, caption, beat_<id> for every BEAT_IDS entry (compile-checked by the
 * `satisfies` below), beat_<id>_late (the wording of a beat while the late right vector is on; {r} / {s} are the
 * terminal waves of V1 / V6 as computed), sr_result (the computed outcome for screen readers), ctl_* (controls),
 * lbl_* (SVG labels). zh / en / es, Spain Spanish, original wording. Wave letters (r, S, q, R′ …) and lead names are
 * notation, shared by all three languages, and are not in these tables. Checked by tests/figures/scene/strings.test.ts.
 */
import { defineDict } from '../../i18n/index';

/** Narration beats in order (the spec's ids). three-vectors.math.ts builds BEATS from these (import from here). */
export const BEAT_IDS = ['look', 'septum', 'walls', 'bases', 'row'] as const;
export type BeatId = (typeof BEAT_IDS)[number];

export const zh = {
  title: '三个向量，两扇窗：V1 与 V6',
  aria: '动画场景：从足侧看的胸部横断面，心室除极的三个向量依次出现，并在右侧画出 V1 和 V6 的 QRS 波群',
  caption: '示意模型：同一个水平面 QRS 向量环投影到 V1–V6。可拖动主向量，或加入晚期右向向量。',
  beat_look: 'V1 从右前方看心脏，V6 从左侧看。',
  beat_septum: '向量1（室间隔）指向右前：朝向V1（r），背离V6（q）。',
  beat_walls: '向量2（游离壁）指向左后：背离V1（S），朝向V6（R）。',
  beat_bases: '向量3（基底部）指向后右：V6出现小s，V1回到基线。',
  beat_bases_late: '向量3之后还有晚期右向向量：V1出现{r}，V6出现宽{s}。',
  beat_row: '同样的向量，相反的窗口：从V1到V6，rS经RS变为qRs。',
  beat_row_late: '同样的向量，相反的窗口：晚期右向向量使V1终末向上、V6终末向下。',
  ctl_late: '晚期右向向量',
  ctl_main: '主向量（游离壁）方向',
  lbl_feet: '从足侧看',
  lbl_ant: '前',
  lbl_post: '后',
  lbl_right: '右',
  lbl_left: '左',
  lbl_septal: '室间隔',
  lbl_walls: '游离壁',
  lbl_basal: '基底部',
  lbl_late: '晚期右向',
  lbl_transition: '移行区',
  lbl_same: '同样的向量，相反的窗口',
  sr_result: '计算结果：{leads}；R/S 移行区：{tr}。',
} as const satisfies Record<`beat_${BeatId}`, string> & Record<string, string>;

type D = { readonly [K in keyof typeof zh]: string };

export const en: D = {
  title: 'Three vectors, two windows: V1 and V6',
  aria: 'Animated scene: a chest section seen from the feet where the three ventricular activation vectors appear in turn and draw the QRS of V1 and V6 on the right',
  caption: 'Schematic model: one horizontal QRS loop projected on V1–V6. Drag the main vector, or add a late right vector.',
  beat_look: 'V1 looks at the heart from the right front, V6 from the left side.',
  beat_septum: 'Vector 1, the septum, points right and forward: toward V1 (r), away from V6 (q).',
  beat_walls: 'Vector 2, the free walls, points left and back: away from V1 (S), toward V6 (R).',
  beat_bases: 'Vector 3, the bases, points back and right: a small s in V6, V1 back to baseline.',
  beat_bases_late: 'After vector 3 comes a late right vector: {r} in V1, a broad {s} in V6.',
  beat_row: 'Same vectors, opposite windows: from V1 to V6, rS turns through RS into qRs.',
  beat_row_late: 'Same vectors, opposite windows: the late right vector ends V1 upward and V6 downward.',
  ctl_late: 'Late right vector',
  ctl_main: 'Direction of the main (free-wall) vector',
  lbl_feet: 'Seen from the feet',
  lbl_ant: 'Anterior',
  lbl_post: 'Posterior',
  lbl_right: 'R',
  lbl_left: 'L',
  lbl_septal: 'septum',
  lbl_walls: 'free walls',
  lbl_basal: 'bases',
  lbl_late: 'late right',
  lbl_transition: 'Transition',
  lbl_same: 'Same vectors, opposite windows',
  sr_result: 'Computed result: {leads}; R/S transition: {tr}.',
};

export const es: D = {
  title: 'Tres vectores, dos ventanas: V1 y V6',
  aria: 'Escena animada: un corte del tórax visto desde los pies donde aparecen por turno los tres vectores de activación ventricular, que dibujan a la derecha el QRS de V1 y de V6',
  caption: 'Modelo esquemático: un único bucle vectorial QRS horizontal proyectado sobre V1–V6. Arrastra el vector principal o añade un vector tardío derecho.',
  beat_look: 'V1 mira el corazón desde delante y a la derecha; V6, desde el lado izquierdo.',
  beat_septum: 'Vector 1, el tabique, apunta a la derecha y adelante: se acerca a V1 (r) y se aleja de V6 (q).',
  beat_walls: 'Vector 2, las paredes libres, apunta a la izquierda y atrás: se aleja de V1 (S) y se acerca a V6 (R).',
  beat_bases: 'Vector 3, las bases, apunta atrás y a la derecha: una s pequeña en V6; V1 vuelve a la línea de base.',
  beat_bases_late: 'Tras el vector 3 llega un vector tardío derecho: {r} en V1 y una {s} ancha en V6.',
  beat_row: 'Mismos vectores, ventanas opuestas: de V1 a V6, rS pasa por RS hasta llegar a qRs.',
  beat_row_late: 'Mismos vectores, ventanas opuestas: el vector tardío derecho termina hacia arriba en V1 y hacia abajo en V6.',
  ctl_late: 'Vector tardío derecho',
  ctl_main: 'Dirección del vector principal (paredes libres)',
  lbl_feet: 'Visto desde los pies',
  lbl_ant: 'Anterior',
  lbl_post: 'Posterior',
  lbl_right: 'D',
  lbl_left: 'I',
  lbl_septal: 'tabique',
  lbl_walls: 'paredes libres',
  lbl_basal: 'bases',
  lbl_late: 'tardío derecho',
  lbl_transition: 'Transición',
  lbl_same: 'Mismos vectores, ventanas opuestas',
  sr_result: 'Resultado calculado: {leads}; transición R/S: {tr}.',
};

export const tThreeVectors = defineDict('scene-three-vectors', zh, en, es);
export type ThreeVectorsKey = keyof typeof zh;
