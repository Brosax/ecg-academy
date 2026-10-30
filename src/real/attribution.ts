/**
 * Attribution for the real ECGs (CC BY 4.0 requires credit, a licence link and a statement of the changes made).
 * Shown on every case page and exported for the About page.
 */
import type { L10n } from '../core/l10n';

/** Dataset citations and licence. */
export const ATTRIBUTION_SOURCES: L10n = {
  zh:
    '真实心电图来自 PTB-XL v1.0.3（Wagner P, Strodthoff N, Bousseljot RD, et al. PTB-XL, a large publicly available electrocardiography dataset. Sci Data 2020;7:154）' +
    '与 PTB-XL+ v1.0.1（Strodthoff N, Mehari T, Nagel C, et al. PTB-XL+, a comprehensive electrocardiographic feature dataset. Sci Data 2023;10:279），' +
    '由 PhysioNet 发布（Goldberger AL, Amaral LAN, Glass L, et al. PhysioBank, PhysioToolkit, and PhysioNet. Circulation 2000;101(23):e215–e220），' +
    '采用知识共享署名 4.0 国际许可协议（CC BY 4.0）。',
  en:
    'Real ECGs from PTB-XL v1.0.3 (Wagner P, Strodthoff N, Bousseljot RD, et al. PTB-XL, a large publicly available electrocardiography dataset. Sci Data 2020;7:154) ' +
    'and PTB-XL+ v1.0.1 (Strodthoff N, Mehari T, Nagel C, et al. PTB-XL+, a comprehensive electrocardiographic feature dataset. Sci Data 2023;10:279), ' +
    'distributed by PhysioNet (Goldberger AL, Amaral LAN, Glass L, et al. PhysioBank, PhysioToolkit, and PhysioNet. Circulation 2000;101(23):e215–e220) ' +
    'under the Creative Commons Attribution 4.0 International licence (CC BY 4.0).',
  es:
    'ECG reales de PTB-XL v1.0.3 (Wagner P, Strodthoff N, Bousseljot RD, et al. PTB-XL, a large publicly available electrocardiography dataset. Sci Data 2020;7:154) ' +
    'y PTB-XL+ v1.0.1 (Strodthoff N, Mehari T, Nagel C, et al. PTB-XL+, a comprehensive electrocardiographic feature dataset. Sci Data 2023;10:279), ' +
    'distribuidos por PhysioNet (Goldberger AL, Amaral LAN, Glass L, et al. PhysioBank, PhysioToolkit, and PhysioNet. Circulation 2000;101(23):e215–e220) ' +
    'con licencia Creative Commons Atribución 4.0 Internacional (CC BY 4.0).',
};

/** Changes made to the data in this app. */
export const ATTRIBUTION_CHANGES: L10n = {
  zh:
    '修改内容：精选 300 份记录（每位患者一份、标注经人工确认、无噪声标记）；经 100 Hz 低通滤波后由 500 Hz 降采样至 250 Hz；以 5 µV 量化；' +
    'III、aVR、aVL、aVF 导联由 I、II 导联按 Einthoven/Goldberger 关系重新计算；SCP-ECG 诊断语句译为中文、英文和西班牙文并对应到本应用的心电图表现；' +
    '来自 PTB-XL+ 的 GE 12SL 自动测量值作为参考值显示。',
  en:
    'Changes: a curated subset of 300 records (one per patient, human-validated labels, no noise flags); resampled from 500 Hz to 250 Hz after a 100 Hz low-pass filter; ' +
    'quantised to 5 µV; leads III, aVR, aVL and aVF recomputed from I and II (Einthoven/Goldberger); SCP-ECG statements translated into Chinese, English and Spanish ' +
    "and mapped onto this app's findings; GE 12SL measurements from PTB-XL+ shown as reference values.",
  es:
    'Cambios: selección de 300 registros (uno por paciente, etiquetas validadas por personas, sin marcas de ruido); remuestreo de 500 Hz a 250 Hz tras un filtro paso bajo de 100 Hz; ' +
    'cuantificación a 5 µV; derivaciones III, aVR, aVL y aVF recalculadas a partir de I y II (Einthoven/Goldberger); afirmaciones SCP-ECG traducidas al chino, inglés y español ' +
    'y asignadas a los hallazgos de esta aplicación; mediciones GE 12SL de PTB-XL+ mostradas como valores de referencia.',
};

/** Full attribution (sources + licence + changes) — `RealLibrary.attribution`. */
export const attribution: L10n = {
  zh: `${ATTRIBUTION_SOURCES.zh}${ATTRIBUTION_CHANGES.zh}`,
  en: `${ATTRIBUTION_SOURCES.en} ${ATTRIBUTION_CHANGES.en}`,
  es: `${ATTRIBUTION_SOURCES.es} ${ATTRIBUTION_CHANGES.es}`,
};

/** Links for the footer (plain hyperlinks; nothing is fetched at runtime). */
export const ATTRIBUTION_LINKS = [
  { label: 'PTB-XL 1.0.3', href: 'https://physionet.org/content/ptb-xl/1.0.3/' },
  { label: 'PTB-XL+ 1.0.1', href: 'https://physionet.org/content/ptb-xl-plus/1.0.1/' },
  { label: 'CC BY 4.0', href: 'https://creativecommons.org/licenses/by/4.0/' },
] as const;
