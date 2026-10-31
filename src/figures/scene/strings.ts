/**
 * UI strings of the scene runtime (transport, narration box, Predict, notes, phase labels). Scene-specific text lives
 * in each scene's own src/figures/scenes/<id>.i18n.ts; src/i18n/figures.ts is not touched by the scene work.
 * Spanish = Spain usage; Chinese = standard textbook terms (除极 / 复极).
 */
import { defineDict } from '../../i18n/index';

export const sceneZh = {
  scPrev: '上一段',
  scNext: '下一段',
  scPlayBeat: '播放本段',
  scBeatOf: '{i}/{n}',
  scGoBeat: '跳到第 {i} 段',
  scScrub: '进度',
  scMs: '{ms} ms',
  scPct: '{pct} %',
  scReduced: '动画已关闭——请逐帧查看',
  scSlow: '×{k}',
  scSchematic: '示意图（不按比例）',
  scModel: '模型说明：加压导联按等边三角形计算，幅度是单位轴投影的 0.866 倍',
  scPredict: '先预测',
  scReveal: '揭晓',
  scYourPick: '你的选择：{pick}',
  scCorrect: '正确',
  scWrong: '不对',
  scTryAgain: '再试一次',
  scStub: '动画场景建设中',
  scLab: '在心脏实验室查看这一搏',
  ph_sa: '窦房结',
  ph_p: 'P 波',
  ph_pr: 'PR 段',
  ph_av: '房室结',
  ph_his: '希氏束–浦肯野',
  ph_qrs: 'QRS 波群',
  ph_st: 'ST 段',
  ph_t: 'T 波',
} as const;

type D = { readonly [K in keyof typeof sceneZh]: string };

export const sceneEn: D = {
  scPrev: 'Previous beat',
  scNext: 'Next beat',
  scPlayBeat: 'Play this beat',
  scBeatOf: '{i}/{n}',
  scGoBeat: 'Go to beat {i}',
  scScrub: 'Progress',
  scMs: '{ms} ms',
  scPct: '{pct} %',
  scReduced: 'Animation off — step through the frames',
  scSlow: '×{k}',
  scSchematic: 'Schematic (not to scale)',
  scModel: 'Model note: augmented leads follow the equilateral triangle, 0.866 × a unit-axis projection',
  scPredict: 'Predict first',
  scReveal: 'Reveal',
  scYourPick: 'Your pick: {pick}',
  scCorrect: 'Correct',
  scWrong: 'Not quite',
  scTryAgain: 'Try again',
  scStub: 'Animated scene under construction',
  scLab: 'See this beat in the Heart Lab',
  ph_sa: 'Sinus node',
  ph_p: 'P wave',
  ph_pr: 'PR segment',
  ph_av: 'AV node',
  ph_his: 'His–Purkinje',
  ph_qrs: 'QRS complex',
  ph_st: 'ST segment',
  ph_t: 'T wave',
};

export const sceneEs: D = {
  scPrev: 'Tramo anterior',
  scNext: 'Tramo siguiente',
  scPlayBeat: 'Reproducir este tramo',
  scBeatOf: '{i}/{n}',
  scGoBeat: 'Ir al tramo {i}',
  scScrub: 'Progreso',
  scMs: '{ms} ms',
  scPct: '{pct} %',
  scReduced: 'Animación desactivada: recorre los fotogramas paso a paso',
  scSlow: '×{k}',
  scSchematic: 'Esquema (sin escala)',
  scModel: 'Nota del modelo: las derivaciones aumentadas siguen el triángulo equilátero, 0,866 × la proyección sobre un eje unitario',
  scPredict: 'Predice primero',
  scReveal: 'Mostrar',
  scYourPick: 'Tu elección: {pick}',
  scCorrect: 'Correcto',
  scWrong: 'No exactamente',
  scTryAgain: 'Inténtalo de nuevo',
  scStub: 'Escena animada en construcción',
  scLab: 'Ver este latido en el Laboratorio del corazón',
  ph_sa: 'Nódulo sinusal',
  ph_p: 'Onda P',
  ph_pr: 'Segmento PR',
  ph_av: 'Nódulo AV',
  ph_his: 'His–Purkinje',
  ph_qrs: 'Complejo QRS',
  ph_st: 'Segmento ST',
  ph_t: 'Onda T',
};

export const tsn = defineDict('scene', sceneZh, sceneEn, sceneEs);
export type SceneKey = keyof typeof sceneZh;
