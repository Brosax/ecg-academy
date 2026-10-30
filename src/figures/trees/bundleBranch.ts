/**
 * Bundle-branch and fascicular blocks: QRS duration → V1 morphology → I/V6 → frontal axis.
 *
 * Sources (criteria only; text is original):
 * - Surawicz B, Childers R, Deal BJ, Gettes LS. AHA/ACCF/HRS Recommendations for the Standardization and Interpretation
 *   of the Electrocardiogram, Part III: Intraventricular Conduction Disturbances. Circulation 2009;119:e235-40
 *   (complete RBBB/LBBB QRS ≥ 120 ms; incomplete 110–119 ms; RBBB: rsr′/rsR′/rSR′ in V1–V2, S in I and V6 longer than R
 *   or > 40 ms; LBBB: broad notched/slurred R in I, aVL, V5, V6, absent q in I, V5, V6, R-peak time > 60 ms in V5–V6;
 *   LAFB: axis −45° to −90°, qR in aVL, R-peak time in aVL ≥ 45 ms, rS in II, III, aVF; LPFB: axis +90° to +180°,
 *   rS in I and aVL, qR in III and aVF, after excluding other causes of right axis deviation; IVCD: QRS > 110 ms
 *   without RBBB/LBBB criteria). A fascicular block alone keeps the QRS < 120 ms but may lengthen it to 110–119 ms, so
 *   the 110–119 ms branch can also lead to the axis question.
 * - Strauss DG, Selvester RH, Wagner GS. Defining left bundle branch block in the era of cardiac resynchronization
 *   therapy. Am J Cardiol 2011;107:927-34.
 */
import { l } from '../../core/l10n';
import type { DecisionTree } from './types';

export const bundleBranchTree: DecisionTree = {
  id: 'bundle-branch',
  title: l('束支与分支阻滞', 'Bundle-branch and fascicular blocks', 'Bloqueos de rama y fasciculares'),
  intro: l(
    '按顺序：QRS 时限 → V1 中 QRS 的终末部分 → I 和 V6 → 额面电轴。在 QRS 最宽的导联测量时限。',
    'In order: QRS duration → how the QRS ends in V1 → leads I and V6 → frontal axis. Measure the duration in the lead where the QRS is widest.',
    'Por orden: duración del QRS → cómo termina el QRS en V1 → derivaciones I y V6 → eje frontal. Mide la duración en la derivación donde el QRS es más ancho.',
  ),
  root: 'width',
  sources: [
    'Surawicz B et al. AHA/ACCF/HRS 2009, Part III. Circulation 2009;119:e235-40',
    'Strauss DG et al. Am J Cardiol 2011;107:927-34 (strict LBBB)',
  ],
  nodes: {
    width: {
      kind: 'question',
      text: l('QRS 时限是多少？', 'What is the QRS duration?', '¿Cuánto dura el QRS?'),
      options: [
        { label: l('≥ 120 ms', '≥ 120 ms', '≥ 120 ms'), next: 'v1' },
        { label: l('110–119 ms', '110–119 ms', '110–119 ms'), next: 'v1inc' },
        { label: l('< 110 ms', '< 110 ms', '< 110 ms'), next: 'axis' },
      ],
    },
    v1: {
      kind: 'question',
      text: l('QRS 增宽：看 V1。QRS 的终末部分朝向哪里？', 'Wide QRS: look at V1. How does the QRS end?', 'QRS ancho: mira V1. ¿Cómo termina el QRS?'),
      options: [
        {
          label: l('终末正向：rsR′、rSR′（"M"形）或宽而有切迹的 R 波', 'Terminal positive deflection: rsR′, rSR′ ("M") or a broad notched R', 'Deflexión terminal positiva: rsR′, rSR′ ("M") o una R ancha con muesca'),
          next: 'rbbbS',
        },
        {
          label: l('终末负向：QS 或 rS，S 波宽', 'Terminal negative deflection: QS or rS with a broad S', 'Deflexión terminal negativa: QS o rS con una S ancha'),
          next: 'lbbbR',
        },
        { label: l('都不典型', 'Neither typical pattern', 'Ninguno de los dos patrones típicos'), next: 'ivcd' },
      ],
    },
    rbbbS: {
      kind: 'question',
      text: l(
        '看 I 和 V6：有无宽而顿挫的终末 S 波（时限长于 R 波或 > 40 ms）？',
        'Check I and V6: is there a wide, slurred terminal S wave (longer than the R, or > 40 ms)?',
        'Mira I y V6: ¿hay una onda S terminal ancha y empastada (más larga que la R o > 40 ms)?',
      ),
      options: [
        { label: l('有', 'Yes', 'Sí'), next: 'rbbbAxis' },
        { label: l('没有', 'No', 'No'), next: 'rbbbAtypical' },
      ],
    },
    rbbbAxis: {
      kind: 'question',
      text: l(
        '右束支阻滞已确认。再看额面电轴（右束支阻滞不影响 QRS 最初 60 ms）：',
        'RBBB confirmed. Now the frontal axis (RBBB does not change the first 60 ms of the QRS):',
        'BRD confirmado. Ahora el eje frontal (el BRD no modifica los primeros 60 ms del QRS):',
      ),
      options: [
        { label: l('正常（或 −30° 至 −45°）', 'Normal (or −30° to −45°)', 'Normal (o entre −30° y −45°)'), next: 'rbbb' },
        {
          label: l('左偏 −45° 至 −90°：aVL 呈 qR，II、III、aVF 呈 rS', 'Left, −45° to −90°: qR in aVL, rS in II, III, aVF', 'Izquierdo, −45° a −90°: qR en aVL, rS en II, III, aVF'),
          next: 'rbbbLafb',
        },
        {
          label: l('右偏 > +90°：I、aVL 呈 rS，III、aVF 呈 qR（无右心室肥厚）', 'Right, > +90°: rS in I and aVL, qR in III and aVF (no RVH)', 'Derecho, > +90°: rS en I y aVL, qR en III y aVF (sin HVD)'),
          next: 'rbbbLpfb',
        },
      ],
    },
    lbbbR: {
      kind: 'question',
      text: l(
        '看 I、aVL、V5、V6：是否为宽而有切迹或顿挫的 R 波，且 I、V5、V6 无间隔 q 波？',
        'Check I, aVL, V5 and V6: broad notched or slurred R waves, with no septal q wave in I, V5 and V6?',
        'Mira I, aVL, V5 y V6: ¿ondas R anchas con muesca o empastamiento, sin q septal en I, V5 y V6?',
      ),
      options: [
        { label: l('是', 'Yes', 'Sí'), next: 'lbbb' },
        { label: l('否（有 q 波或无宽 R 波）', 'No (q waves present, or no broad R)', 'No (hay ondas q o no hay R ancha)'), next: 'ivcd' },
      ],
    },
    v1inc: {
      kind: 'question',
      text: l('QRS 110–119 ms：是哪种图形？', 'QRS 110–119 ms: which pattern?', 'QRS de 110–119 ms: ¿qué patrón?'),
      options: [
        {
          label: l('V1–V2 呈 rSR′，I 和 V6 有小的终末 S 波', 'rSR′ in V1–V2 with a small terminal S in I and V6', 'rSR′ en V1–V2 con una S terminal pequeña en I y V6'),
          next: 'irbbb',
        },
        {
          label: l('I、V5、V6 无 q 波，R 波顿挫，V4–V6 R 峰时间 > 60 ms', 'No q in I, V5, V6, slurred R, R-peak time > 60 ms in V4–V6', 'Sin q en I, V5, V6, R empastada, tiempo hasta el pico de R > 60 ms en V4–V6'),
          next: 'ilbbb',
        },
        {
          label: l(
            '都不是，但电轴在 −45° 至 −90° 或 +90° 至 +180°（可能为分支阻滞）',
            'Neither, but the axis is −45° to −90° or +90° to +180° (possible fascicular block)',
            'Ninguno, pero el eje está entre −45° y −90° o entre +90° y +180° (posible hemibloqueo)',
          ),
          next: 'axis',
        },
        { label: l('都不是', 'Neither', 'Ninguno'), next: 'ivcd' },
      ],
    },
    axis: {
      kind: 'question',
      text: l(
        '无束支阻滞。检查额面电轴以判断有无分支阻滞。',
        'No bundle-branch block. Check the frontal axis for a fascicular block.',
        'No hay bloqueo de rama. Revisa el eje frontal en busca de un hemibloqueo.',
      ),
      help: l(
        '单纯分支阻滞时 QRS < 120 ms，但可使其轻度增宽（110–119 ms）。',
        'A fascicular block alone keeps the QRS < 120 ms, but it may lengthen it slightly (to 110–119 ms).',
        'Un hemibloqueo aislado mantiene el QRS < 120 ms, aunque puede alargarlo un poco (hasta 110–119 ms).',
      ),
      options: [
        {
          label: l('−45° 至 −90°，aVL 呈 qR，II、III、aVF 呈 rS', '−45° to −90° with qR in aVL and rS in II, III, aVF', '−45° a −90° con qR en aVL y rS en II, III, aVF'),
          next: 'lafb',
        },
        {
          label: l('+90° 至 +180°，I、aVL 呈 rS，III、aVF 呈 qR', '+90° to +180° with rS in I and aVL and qR in III and aVF', '+90° a +180° con rS en I y aVL y qR en III y aVF'),
          next: 'lpfb',
        },
        { label: l('正常电轴（或 −30° 至 −45°）', 'Normal axis (or −30° to −45°)', 'Eje normal (o entre −30° y −45°)'), next: 'noBlock' },
      ],
    },

    // ── leaves ────────────────────────────────────────────────────────────────────────────────────────────────────
    rbbb: {
      kind: 'leaf',
      tone: 'major',
      findings: ['rbbb'],
      title: l('完全性右束支传导阻滞', 'Complete right bundle-branch block', 'Bloqueo completo de rama derecha'),
      text: l(
        'QRS ≥ 120 ms，V1–V2 呈 rsR′，I 和 V6 有宽 S 波：右心室最后才被激动（从左向右）。V1–V3 的继发性 ST 压低 / T 波倒置是预期改变。常见，多为良性；新出现时可伴随肺栓塞或前壁心梗。',
        'QRS ≥ 120 ms, rsR′ in V1–V2 and a wide S in I and V6: the right ventricle is activated last, from left to right. Secondary ST depression / T inversion in V1–V3 is expected. Common and often benign; a new RBBB can accompany pulmonary embolism or anterior MI.',
        'QRS ≥ 120 ms, rsR′ en V1–V2 y S ancha en I y V6: el ventrículo derecho se activa el último, de izquierda a derecha. Es esperable un descenso secundario del ST / inversión de la T en V1–V3. Frecuente y a menudo benigno; un BRD nuevo puede acompañar a una embolia pulmonar o a un infarto anterior.',
      ),
    },
    rbbbLafb: {
      kind: 'leaf',
      tone: 'major',
      findings: ['rbbb', 'lafb', 'bifascicular-block'],
      title: l('双分支阻滞：右束支阻滞 + 左前分支阻滞', 'Bifascicular block: RBBB + left anterior fascicular block', 'Bloqueo bifascicular: BRD + hemibloqueo anterior izquierdo'),
      text: l(
        '只剩左后分支仍在传导。注意 PR 间期：若有晕厥或房室阻滞，需评估间歇性完全性房室阻滞。',
        'Only the left posterior fascicle still conducts. Check the PR interval: with syncope or AV block, look for intermittent complete AV block.',
        'Solo conduce ya el fascículo posterior izquierdo. Revisa el PR: si hay síncope o bloqueo AV, busca un bloqueo AV completo intermitente.',
      ),
    },
    rbbbLpfb: {
      kind: 'leaf',
      tone: 'major',
      findings: ['rbbb', 'lpfb', 'bifascicular-block'],
      title: l('双分支阻滞：右束支阻滞 + 左后分支阻滞', 'Bifascicular block: RBBB + left posterior fascicular block', 'Bloqueo bifascicular: BRD + hemibloqueo posterior izquierdo'),
      text: l(
        '排除右心室肥厚、侧壁心梗和垂位心后，右束支阻滞伴电轴右偏。较少见，常提示较严重的心脏疾病。',
        'Right axis deviation with RBBB after excluding RVH, lateral infarction and a vertical heart. Less common, and more often a sign of significant heart disease.',
        'Desviación del eje a la derecha con BRD, una vez descartadas HVD, infarto lateral y corazón vertical. Menos frecuente y con más a menudo cardiopatía significativa.',
      ),
    },
    rbbbAtypical: {
      kind: 'leaf',
      tone: 'minor',
      title: l('V1 有 R′ 波，但不具备右束支阻滞的特征', 'R′ in V1 without the RBBB signature', 'R′ en V1 sin el sello del BRD'),
      text: l(
        'V1 终末正向波，但 I/V6 无宽 S 波：考虑 V1–V2 电极放置过高、Brugada 图形、右心室肥厚、后壁心梗或预激（寻找 delta 波）。',
        'A terminal positive wave in V1 without a wide S in I/V6: consider V1–V2 placed too high, a Brugada pattern, right ventricular hypertrophy, posterior infarction or pre-excitation (look for a delta wave).',
        'Onda terminal positiva en V1 sin S ancha en I/V6: considera V1–V2 colocadas demasiado altas, patrón de Brugada, hipertrofia ventricular derecha, infarto posterior o preexcitación (busca onda delta).',
      ),
    },
    lbbb: {
      kind: 'leaf',
      tone: 'major',
      findings: ['lbbb'],
      title: l('完全性左束支传导阻滞', 'Complete left bundle-branch block', 'Bloqueo completo de rama izquierda'),
      text: l(
        'QRS ≥ 120 ms，V1 呈 QS 或 rS，I、aVL、V5–V6 为宽而有切迹的 R 波且无间隔 q 波，ST–T 与 QRS 方向相反：左心室最后被激动（从右向左）。通常提示心脏疾病；判断缺血用 Sgarbossa 标准。（Strauss 标准用于心脏再同步治疗：男性 QRS ≥ 140 ms、女性 ≥ 130 ms，且 V1、V2、V5、V6、I、aVL 中 ≥ 2 个导联 QRS 中段有切迹。）',
        'QRS ≥ 120 ms, QS or rS in V1, broad notched R without septal q in I, aVL, V5–V6, and ST–T opposite to the QRS: the left ventricle is activated last, from right to left. Usually a sign of heart disease; for ischaemia use the Sgarbossa criteria. (Strauss criteria, used for resynchronisation therapy: QRS ≥ 140 ms in men / ≥ 130 ms in women with mid-QRS notching in ≥ 2 of V1, V2, V5, V6, I, aVL.)',
        'QRS ≥ 120 ms, QS o rS en V1, R ancha con muesca y sin q septal en I, aVL, V5–V6, y ST–T opuesto al QRS: el ventrículo izquierdo se activa el último, de derecha a izquierda. Suele indicar cardiopatía; para la isquemia usa los criterios de Sgarbossa. (Criterios de Strauss, usados para la terapia de resincronización: QRS ≥ 140 ms en varones / ≥ 130 ms en mujeres con muescas en la mitad del QRS en ≥ 2 de V1, V2, V5, V6, I, aVL.)',
      ),
    },
    ivcd: {
      kind: 'leaf',
      tone: 'major',
      findings: ['ivcd'],
      title: l('非特异性室内传导阻滞', 'Non-specific intraventricular conduction delay', 'Trastorno inespecífico de la conducción intraventricular'),
      text: l(
        'QRS ≥ 110 ms，但不具备典型右束支或左束支阻滞形态。考虑左心室肥厚或心肌病、陈旧性心梗、高钾血症、钠通道阻滞药物、预激和心室起搏。',
        'QRS ≥ 110 ms without typical RBBB or LBBB morphology. Consider LV hypertrophy or cardiomyopathy, old infarction, hyperkalaemia, sodium-channel-blocking drugs, pre-excitation and ventricular pacing.',
        'QRS ≥ 110 ms sin morfología típica de BRD ni de BRI. Considera hipertrofia del VI o miocardiopatía, infarto antiguo, hiperpotasemia, fármacos bloqueantes de los canales de sodio, preexcitación y estimulación ventricular.',
      ),
    },
    irbbb: {
      kind: 'leaf',
      tone: 'minor',
      findings: ['irbbb'],
      title: l('不完全性右束支传导阻滞', 'Incomplete right bundle-branch block', 'Bloqueo incompleto de rama derecha'),
      text: l(
        'V1 呈 rSR′，QRS 110–119 ms。常为正常变异（年轻人、运动员）；也见于右心室容量负荷过重（如房间隔缺损）。',
        'rSR′ in V1 with QRS 110–119 ms. Often a normal variant (young people, athletes); also seen with right ventricular volume overload (e.g. atrial septal defect).',
        'rSR′ en V1 con QRS de 110–119 ms. A menudo es una variante normal (jóvenes, deportistas); también aparece con sobrecarga de volumen del ventrículo derecho (p. ej., comunicación interauricular).',
      ),
    },
    ilbbb: {
      kind: 'leaf',
      tone: 'minor',
      findings: ['ilbbb'],
      title: l('不完全性左束支传导阻滞', 'Incomplete left bundle-branch block', 'Bloqueo incompleto de rama izquierda'),
      text: l(
        '具备左束支阻滞样特征但 QRS 110–119 ms：I、V5、V6 无间隔 q 波，V4–V6 R 峰时间延迟（> 60 ms）。常伴左心室肥厚。',
        'LBBB-like features with QRS 110–119 ms: no septal q in I, V5, V6 and a late R peak (> 60 ms) in V4–V6. Often accompanies LVH.',
        'Rasgos de BRI con QRS de 110–119 ms: sin q septal en I, V5, V6 y pico de R tardío (> 60 ms) en V4–V6. Suele acompañar a la HVI.',
      ),
    },
    lafb: {
      kind: 'leaf',
      tone: 'minor',
      findings: ['lafb', 'lad'],
      title: l('左前分支阻滞（左前半阻滞）', 'Left anterior fascicular block (left anterior hemiblock)', 'Hemibloqueo anterior izquierdo'),
      text: l(
        '电轴 −45° 至 −90°，aVL 呈 qR（R 峰时间 ≥ 45 ms），II、III、aVF 呈 rS，QRS < 120 ms。是显著电轴左偏最常见的原因。',
        'Axis −45° to −90°, qR in aVL (R-peak time ≥ 45 ms), rS in II, III and aVF, QRS < 120 ms. The commonest cause of marked left axis deviation.',
        'Eje entre −45° y −90°, qR en aVL (tiempo hasta el pico de R ≥ 45 ms), rS en II, III y aVF, QRS < 120 ms. Es la causa más frecuente de desviación marcada del eje a la izquierda.',
      ),
    },
    lpfb: {
      kind: 'leaf',
      tone: 'minor',
      findings: ['lpfb', 'rad'],
      title: l('左后分支阻滞（左后半阻滞）', 'Left posterior fascicular block (left posterior hemiblock)', 'Hemibloqueo posterior izquierdo'),
      text: l(
        '电轴 +90° 至 +180°，I、aVL 呈 rS，III、aVF 呈 qR，QRS < 120 ms。是排除性诊断：先排除右心室肥厚、侧壁心梗、垂位心和肢体导联接反。',
        'Axis +90° to +180°, rS in I and aVL, qR in III and aVF, QRS < 120 ms. A diagnosis of exclusion: first rule out RVH, lateral infarction, a vertical heart and limb-lead reversal.',
        'Eje entre +90° y +180°, rS en I y aVL, qR en III y aVF, QRS < 120 ms. Es un diagnóstico de exclusión: descarta antes HVD, infarto lateral, corazón vertical e inversión de electrodos de los miembros.',
      ),
    },
    noBlock: {
      kind: 'leaf',
      tone: 'normal',
      title: l('无束支或分支阻滞', 'No bundle-branch or fascicular block', 'Sin bloqueo de rama ni hemibloqueo'),
      text: l(
        '没有束支或分支阻滞图形。若 QRS 为 110–119 ms 而无上述任何图形，应诊断为非特异性室内传导延迟。电轴在 −30° 至 −45° 之间属于电轴左偏，但不满足左前分支阻滞标准。',
        'No bundle-branch or fascicular block pattern. With a QRS of 110–119 ms and none of these patterns, call it a non-specific intraventricular conduction delay. An axis between −30° and −45° is left axis deviation but does not meet the LAFB criteria.',
        'Sin patrón de bloqueo de rama ni de hemibloqueo. Con un QRS de 110–119 ms y ninguno de estos patrones, se trata de un trastorno inespecífico de la conducción intraventricular. Un eje entre −30° y −45° es desviación a la izquierda, pero no cumple los criterios de hemibloqueo anterior izquierdo.',
      ),
    },
  },
};
