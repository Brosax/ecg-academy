/**
 * Phase descriptions of the action-potential figure (standard cellular electrophysiology; original text).
 */
import type { L10n } from '../../core/l10n';
import { l } from '../../core/l10n';
import type { ApCell, ApPhase } from '../math/ap';

export const AP_CELL_NAME: Readonly<Record<ApCell, L10n>> = {
  ventricular: l('心室肌细胞', 'Ventricular myocyte', 'Miocito ventricular'),
  atrial: l('心房肌细胞', 'Atrial myocyte', 'Miocito auricular'),
  nodal: l('窦房结细胞', 'Sinus-node cell', 'Célula del nodo sinusal'),
};

export const AP_PHASE_TEXT: Readonly<Record<ApCell, Readonly<Record<ApPhase, L10n>>>> = {
  ventricular: {
    0: l(
      '快速除极：快钠通道开放，Na⁺ 大量内流（−85 → +25 mV）。整个心室的 0 相发生在 QRS 波群期间。',
      'Rapid depolarization: fast Na⁺ channels open and Na⁺ rushes in (−85 → +25 mV). Across the ventricles, phase 0 happens during the QRS complex.',
      'Despolarización rápida: se abren los canales rápidos de Na⁺ y el Na⁺ entra en masa (−85 → +25 mV). En el conjunto de los ventrículos, la fase 0 ocurre durante el complejo QRS.',
    ),
    1: l(
      '早期快速复极：钠通道失活，瞬时外向钾电流（Ito）形成切迹。',
      'Early partial repolarization: Na⁺ channels inactivate and the transient outward K⁺ current (Ito) makes the notch.',
      'Repolarización precoz parcial: los canales de Na⁺ se inactivan y la corriente transitoria de salida de K⁺ (Ito) produce la muesca.',
    ),
    2: l(
      '平台期：Ca²⁺ 经 L 型通道内流，与 K⁺ 外流相平衡。所有心室细胞处于相近的除极水平，彼此间没有电位差 → ST 段位于等电位线。Ca²⁺ 内流触发收缩。',
      'Plateau: Ca²⁺ enters through L-type channels, balanced by K⁺ leaving. All ventricular cells sit at a similar depolarized level, so there is no potential difference between them → the ST segment is isoelectric. The Ca²⁺ entry triggers contraction.',
      'Meseta: entra Ca²⁺ por los canales de tipo L, equilibrado por la salida de K⁺. Todas las células ventriculares están despolarizadas a un nivel parecido, sin diferencias de potencial entre ellas → el segmento ST es isoeléctrico. La entrada de Ca²⁺ desencadena la contracción.',
    ),
    3: l(
      '复极：钙通道关闭，延迟整流钾电流（IKr、IKs）使膜电位回到静息水平。各部位复极时间不同 → T 波。阻断 IKr 的药物延长 3 相 → QT 延长。',
      'Repolarization: Ca²⁺ channels close and the delayed-rectifier K⁺ currents (IKr, IKs) return the membrane to rest. Different regions repolarize at different times → T wave. Drugs that block IKr prolong phase 3 → long QT.',
      'Repolarización: se cierran los canales de Ca²⁺ y las corrientes rectificadoras tardías de K⁺ (IKr, IKs) devuelven la membrana al reposo. Las distintas regiones se repolarizan en momentos diferentes → onda T. Los fármacos que bloquean IKr alargan la fase 3 → QT largo.',
    ),
    4: l(
      '静息电位（约 −85 mV），由内向整流钾电流（IK1）维持：电舒张期，对应 TP 段。',
      'Resting potential (about −85 mV) held by the inward-rectifier K⁺ current (IK1): electrical diastole, the TP segment.',
      'Potencial de reposo (unos −85 mV), mantenido por la corriente rectificadora de entrada de K⁺ (IK1): diástole eléctrica, el segmento TP.',
    ),
  },
  atrial: {
    0: l(
      '快速 Na⁺ 内流除极：心房除极从窦房结向外扩布 → P 波。',
      'Rapid Na⁺ upstroke: atrial depolarization spreads out from the sinus node → P wave.',
      'Ascenso rápido por Na⁺: la despolarización auricular se extiende desde el nodo sinusal → onda P.',
    ),
    1: l('短暂的早期复极（Ito）。', 'Brief early repolarization (Ito).', 'Breve repolarización precoz (Ito).'),
    2: l(
      '平台期较短：心房肌动作电位比心室肌短。',
      'A short plateau: atrial action potentials are shorter than ventricular ones.',
      'Meseta corta: el potencial de acción auricular es más breve que el ventricular.',
    ),
    3: l(
      '复极（K⁺ 外流）：心房复极波（Ta 波）很小，通常隐藏在 PR 段和 QRS 波群中。',
      'Repolarization (K⁺ out): the atrial T wave (Ta) is small and usually hidden in the PR segment and the QRS.',
      'Repolarización (salida de K⁺): la onda T auricular (Ta) es pequeña y suele quedar oculta en el segmento PR y el QRS.',
    ),
    4: l('稳定的静息电位（约 −80 mV），等待下一个窦性冲动。', 'Stable resting potential (about −80 mV) until the next sinus impulse.', 'Potencial de reposo estable (unos −80 mV) hasta el siguiente impulso sinusal.'),
  },
  nodal: {
    0: l(
      '缓慢上升，由 L 型 Ca²⁺ 电流形成——比心肌细胞慢得多，这也是房室结传导缓慢的原因。',
      'A slow upstroke carried by L-type Ca²⁺ current — much slower than in myocytes, which is why conduction through the AV node is slow.',
      'Ascenso lento debido a la corriente de Ca²⁺ de tipo L, mucho más lento que en los miocitos; por eso la conducción por el nodo AV es lenta.',
    ),
    1: l('结细胞没有明显的 1 相和 2 相。', 'Nodal cells have no distinct phases 1 and 2.', 'Las células nodales no tienen fases 1 y 2 definidas.'),
    2: l('结细胞没有明显的 1 相和 2 相。', 'Nodal cells have no distinct phases 1 and 2.', 'Las células nodales no tienen fases 1 y 2 definidas.'),
    3: l(
      'K⁺ 外流使膜电位回到最大舒张电位（约 −60 mV）。',
      'K⁺ outflow brings the membrane back to the maximum diastolic potential (about −60 mV).',
      'La salida de K⁺ devuelve la membrana al potencial diastólico máximo (unos −60 mV).',
    ),
    4: l(
      '舒张期自动除极："起搏"电流（If，Na⁺）和 Ca²⁺ 电流使膜电位缓慢升至阈电位（约 −40 mV）。其斜率决定心率：交感神经使其变陡，迷走神经使其变平。窦房结本身的激动在体表心电图上看不到。',
      'Spontaneous diastolic depolarization: the "funny" current (If, Na⁺) and Ca²⁺ currents slowly raise the potential to threshold (about −40 mV). Its slope sets the heart rate — sympathetic tone steepens it, vagal tone flattens it. The sinus node’s own firing is invisible on the surface ECG.',
      'Despolarización diastólica espontánea: la corriente "funny" (If, Na⁺) y las corrientes de Ca²⁺ elevan lentamente el potencial hasta el umbral (unos −40 mV). Su pendiente fija la frecuencia: el tono simpático la aumenta y el vagal la reduce. La descarga del propio nodo sinusal no se ve en el ECG de superficie.',
    ),
  },
};
