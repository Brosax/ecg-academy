/**
 * Key references shown in the About dialog (bibliographic entries are language-neutral, so they are data rather than
 * i18n strings). Full citations and what each one supports: docs/research/*.md.
 */
import { SKIN_CREDIT } from '../../sim/geometry/hra/body';
import { HRA_CREDITS } from '../../sim/geometry/hra/parts';

/**
 * Attribution for third-party model data (plan "变更记录 2026-10-08"): the realistic heart and its vessels are adapted
 * from the Human Reference Atlas 3D reference organs (CC BY 4.0). Built from the same credit records the geometry
 * bundle carries (src/sim/geometry/hra/parts.ts), with the changes CC BY asks to indicate.
 */
export const MODEL_CREDITS: readonly string[] = [
  ...HRA_CREDITS.map(
    (c) =>
      `${c.title}. ${c.authors}. ${c.url}. License: ${c.license} (https://creativecommons.org/licenses/by/4.0/). ` +
      'Adapted: re-oriented to a heart-local frame, voxelized and labelled, vessels trimmed, conduction system added.',
  ),
  `${SKIN_CREDIT.title}. ${SKIN_CREDIT.authors}. ${SKIN_CREDIT.url}. License: ${SKIN_CREDIT.license} ` +
    '(https://creativecommons.org/licenses/by/4.0/). Adapted: moved to the heart frame, made translucent; electrode sites ' +
    'and landmark lines added (estimated from body proportions).',
];

export const KEY_REFERENCES: readonly string[] = [
  'Durrer D, van Dam RT, Freud GE, Janse MJ, Meijler FL, Arzbaecher RC. Total excitation of the isolated human heart. Circulation 1970;41:899–912.',
  'Ramanathan C, Jia P, Ghanem R, Ryu K, Rudy Y. Activation and repolarization of the normal human heart under complete physiological conditions. PNAS 2006;103:6309–6314.',
  'Malmivuo J, Plonsey R. Bioelectromagnetism. Oxford University Press, 1995 (ch. 6 and 15).',
  'Dower GE. US Patent 5,711,304 — forward Dower lead vectors (cross-checked against the inverse Dower matrix of Edenbrandt & Pahlm, J Electrocardiol 1988).',
  'van Dam PM, Oostendorp TF, van Oosterom A. ECGSIM: interactive simulation of the ECG for teaching and research purposes. Computing in Cardiology 2010;37:841–844.',
  'Kloosterman M, Boonstra MJ, van der Schaaf I, Loh P, van Dam PM. Exploring ventricular repolarization gradients in control subjects using the equivalent dipole layer. Computing in Cardiology 2023;50.',
  'Sur S, Han L, Tereshchenko LG. PLoS One 2013;8:e57175 (Frank-lead vectorcardiographic values in healthy adults).',
  'Biering-Sørensen T, et al. Cardiac time intervals by tissue Doppler imaging M-mode (normal values). PLoS One 2016;11:e0153636.',
  'Sameni R, Clifford GD, Jutten C, Shamsollahi MB. Multichannel ECG and noise modeling. EURASIP J Adv Signal Process 2007:043407.',
];
