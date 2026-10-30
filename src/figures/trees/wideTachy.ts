/**
 * Wide-QRS tachycardia (QRS ≥ 120 ms, rate > 100 /min): VT versus SVT with aberrancy.
 *
 * Sources (criteria only; text is original):
 * - Brugada P, Brugada J, Mont L, Smeets J, Andries EW. A new approach to the differential diagnosis of a regular
 *   tachycardia with a wide QRS complex. Circulation 1991;83:1649-59 (4 steps: absence of RS in all precordial leads;
 *   RS interval > 100 ms; AV dissociation; morphology criteria in V1–V2 and V6).
 * - Vereckei A, Duray G, Szénási G, Altemose GT, Miller JM. New algorithm using only lead aVR for differential diagnosis
 *   of wide QRS complex tachycardia. Heart Rhythm 2008;5:89-98 (initial R; initial r/q > 40 ms; notch on the
 *   descending limb of a negative-onset, predominantly negative QRS; vi/vt ≤ 1).
 * - Zeppenfeld K et al. 2022 ESC Guidelines for ventricular arrhythmias and the prevention of sudden cardiac death.
 *   Eur Heart J 2022;43:3997-4126 (treat as VT when in doubt; ECG criteria favouring VT).
 * - Brugada J et al. 2019 ESC SVT guidelines. Eur Heart J 2020;41:655-720 (pre-excited AF: shortest pre-excited R–R
 *   ≤ 250 ms = high risk; avoid AV-nodal blocking drugs).
 */
import { l } from '../../core/l10n';
import type { DecisionTree } from './types';

export const wideTachyTree: DecisionTree = {
  id: 'wide-tachy',
  title: l('宽QRS波心动过速', 'Wide-QRS tachycardia', 'Taquicardia de QRS ancho'),
  intro: l(
    'QRS ≥ 120 ms、心室率 > 100 次/分。大多数（约 80%，心梗后更多）是室性心动过速。患者不稳定时先处理；拿不准时按室速处理。没有一种流程是完美的。',
    'QRS ≥ 120 ms and rate > 100 /min. Most are ventricular tachycardia (about 80 %, even more after a myocardial infarction). If the patient is unstable, treat first; if in doubt, treat as VT. No algorithm is perfect.',
    'QRS ≥ 120 ms y frecuencia > 100 lpm. La mayoría son taquicardias ventriculares (alrededor del 80 %, aún más tras un infarto). Si el paciente está inestable, primero se trata; ante la duda, se trata como TV. Ningún algoritmo es perfecto.',
  ),
  root: 'regular',
  sources: [
    'Brugada P et al. Circulation 1991;83:1649-59',
    'Vereckei A et al. Heart Rhythm 2008;5:89-98',
    'Zeppenfeld K et al. 2022 ESC VA/SCD guidelines. Eur Heart J 2022;43:3997-4126',
    'Brugada J et al. 2019 ESC SVT guidelines. Eur Heart J 2020;41:655-720',
  ],
  nodes: {
    regular: {
      kind: 'question',
      text: l('节律是否规整？', 'Is the rhythm regular?', '¿Es regular el ritmo?'),
      options: [
        { label: l('规整', 'Regular', 'Regular'), next: 'clues' },
        { label: l('不规整', 'Irregular', 'Irregular'), next: 'irregular' },
      ],
    },
    irregular: {
      kind: 'question',
      text: l('不规整的宽QRS心动过速：QRS 波群表现如何？', 'Irregular wide-QRS tachycardia: how do the QRS complexes behave?', 'Taquicardia irregular de QRS ancho: ¿cómo se comportan los QRS?'),
      options: [
        {
          label: l('每个心搏都是相同的束支阻滞样形态', 'The same bundle-branch-block-like shape in every beat', 'La misma morfología de bloqueo de rama en todos los latidos'),
          next: 'afBbb',
        },
        {
          label: l('极快（部分 R–R < 250 ms），QRS 宽度和形态逐搏变化', 'Very fast (some R–R < 250 ms); QRS width and shape change from beat to beat', 'Muy rápida (algunos R–R < 250 ms); la anchura y la morfología del QRS cambian de un latido a otro'),
          next: 'preexAf',
        },
        {
          label: l('电轴和振幅不断变化，围绕基线"扭转"', 'Axis and amplitude keep changing, twisting around the baseline', 'El eje y la amplitud cambian sin cesar, girando alrededor de la línea de base'),
          next: 'polyVt',
        },
      ],
    },
    clues: {
      kind: 'question',
      text: l(
        '用流程之前，先在整条记录（及 12 导联）中寻找能证明室速的线索。有没有？',
        'Before any algorithm, scan the whole strip (and all 12 leads) for clues that prove VT. Do you see any?',
        'Antes de cualquier algoritmo, recorre toda la tira (y las 12 derivaciones) buscando signos que demuestren TV. ¿Ves alguno?',
      ),
      help: l(
        '房室分离：P 波以自身较慢的频率独立出现。心室夺获：突然出现一个窄 QRS（P 波正常下传）。室性融合波：形态介于窦性 QRS 与宽 QRS 之间。',
        'AV dissociation: P waves marching through at their own, slower rate. Capture beat: a sudden narrow QRS (a P wave conducted normally). Fusion beat: a QRS halfway between the sinus QRS and the wide QRS.',
        'Disociación AV: ondas P que avanzan a su propia frecuencia, más lenta. Latido de captura: un QRS estrecho repentino (una P conducida con normalidad). Latido de fusión: un QRS intermedio entre el sinusal y el ancho.',
      ),
      options: [
        { label: l('房室分离、心室夺获或室性融合波', 'AV dissociation, capture or fusion beats', 'Disociación AV, latidos de captura o de fusión'), next: 'vtDissoc' },
        { label: l('没有（或不确定）', 'None seen (or not sure)', 'Ninguno (o no estoy seguro)'), next: 'method' },
      ],
    },
    method: {
      kind: 'question',
      text: l('选择一种流程（两者应得出相同结论）。', 'Choose an algorithm (both should reach the same answer).', 'Elige un algoritmo (ambos deberían llegar a la misma conclusión).'),
      options: [
        { label: l('Brugada 1991（胸导联，4 步）', 'Brugada 1991 (precordial leads, 4 steps)', 'Brugada 1991 (derivaciones precordiales, 4 pasos)'), next: 'b1' },
        { label: l('Vereckei aVR 2008（仅 aVR 导联，4 步）', 'Vereckei aVR 2008 (lead aVR only, 4 steps)', 'Vereckei aVR 2008 (solo la derivación aVR, 4 pasos)'), next: 'v1' },
      ],
    },
    b1: {
      kind: 'question',
      text: l(
        'Brugada 第 1 步：是否所有胸导联（V1–V6）都没有 RS 波形（先 R 后 S）？',
        'Brugada step 1: is an RS complex (an R followed by an S) absent from ALL precordial leads V1–V6?',
        'Brugada, paso 1: ¿falta un complejo RS (una R seguida de una S) en TODAS las derivaciones precordiales V1–V6?',
      ),
      help: l(
        'RS 波形指 R 波之后紧跟 S 波（rS、RS、Rs）。"无 RS"是指 V1–V6 中没有任何一个导联出现这种波形：每个胸导联的 QRS 都是 R、qR、QR、QS 等不含"R 后接 S"的形态。正向或负向同向性（胸导联 QRS 全部向上或全部向下）是其极端情况。',
        'An RS complex is an R wave followed by an S wave (rS, RS, Rs). "No RS" means that no lead from V1 to V6 shows one: every precordial QRS is R, qR, QR, QS or another shape without an R followed by an S. Positive or negative concordance (all precordial QRS upright, or all negative) is the extreme case.',
        'Un complejo RS es una onda R seguida de una onda S (rS, RS, Rs). "Sin RS" significa que ninguna derivación de V1 a V6 lo muestra: todos los QRS precordiales son R, qR, QR, QS u otra morfología sin una R seguida de una S. La concordancia positiva o negativa (todos los QRS precordiales positivos, o todos negativos) es el caso extremo.',
      ),
      options: [
        { label: l('是——任何胸导联都无 RS（含同向性）', 'Yes — no RS in any precordial lead (includes concordance)', 'Sí: ninguna precordial tiene RS (incluye concordancia)'), next: 'vt' },
        { label: l('否——至少一个导联有 RS', 'No — at least one lead shows an RS', 'No: al menos una derivación muestra RS'), next: 'b2' },
      ],
    },
    b2: {
      kind: 'question',
      text: l(
        '第 2 步：在有 RS 的胸导联中，是否有任何一个 RS 间期 > 100 ms？',
        'Step 2: in any precordial lead with an RS, is the RS interval longer than 100 ms?',
        'Paso 2: en alguna precordial con RS, ¿es el intervalo RS mayor de 100 ms?',
      ),
      help: l(
        'RS 间期 = 从 R 波起点到 S 波最低点。在 RS 间期最长的导联测量。注意：这里测的不是 QRS 时限。',
        'RS interval = from the onset of the R wave to the nadir (deepest point) of the S wave, measured in the lead where it is longest. It is not the QRS duration.',
        'Intervalo RS = desde el inicio de la onda R hasta el nadir (punto más profundo) de la onda S, medido en la derivación donde es más largo. No es la duración del QRS.',
      ),
      options: [
        { label: l('是，至少一个导联 > 100 ms', 'Yes, > 100 ms in at least one lead', 'Sí, > 100 ms en al menos una derivación'), next: 'vt' },
        { label: l('否', 'No', 'No'), next: 'b3' },
      ],
    },
    b3: {
      kind: 'question',
      text: l('第 3 步：有无房室分离的证据？', 'Step 3: is there evidence of AV dissociation?', 'Paso 3: ¿hay signos de disociación auriculoventricular?'),
      help: l(
        'QRS 多于 P 波；P 波与 QRS 无固定关系；心室夺获或室性融合波。',
        'More QRS complexes than P waves; P waves with no fixed relation to the QRS; capture or fusion beats.',
        'Más QRS que ondas P; ondas P sin relación fija con el QRS; latidos de captura o de fusión.',
      ),
      options: [
        { label: l('有', 'Yes', 'Sí'), next: 'vt' },
        { label: l('没有', 'No', 'No'), next: 'b4' },
      ],
    },
    b4: {
      kind: 'question',
      text: l(
        '第 4 步：形态标准。QRS 呈右束支阻滞样（V1 主波向上）还是左束支阻滞样（V1 主波向下）？',
        'Step 4: morphology criteria. Is the QRS RBBB-like (mainly positive in V1) or LBBB-like (mainly negative in V1)?',
        'Paso 4: criterios morfológicos. ¿El QRS es tipo bloqueo de rama derecha (predominantemente positivo en V1) o tipo bloqueo de rama izquierda (predominantemente negativo en V1)?',
      ),
      options: [
        { label: l('右束支阻滞样', 'RBBB-like', 'Tipo bloqueo de rama derecha'), next: 'b4r' },
        { label: l('左束支阻滞样', 'LBBB-like', 'Tipo bloqueo de rama izquierda'), next: 'b4l' },
      ],
    },
    b4r: {
      kind: 'question',
      text: l(
        '右束支阻滞样：V1–V2 和 V6 是否同时符合室速形态标准？',
        'RBBB-like: are VT criteria present in BOTH V1–V2 AND V6?',
        'Tipo BRD: ¿hay criterios de TV a la vez en V1–V2 Y en V6?',
      ),
      help: l(
        'V1 室速样：单相 R、qR，或 R 高于 R′（"左兔耳"更高）。V6 室速样：R/S < 1、QS 或 QR。差异性传导则在 V1 呈三相 rsR′、在 V6 呈 qRs。',
        'VT in V1: monophasic R, qR, or R taller than R′ (taller "left rabbit ear"). VT in V6: R/S < 1, QS or QR. Aberrancy instead shows a triphasic rsR′ in V1 and qRs in V6.',
        'TV en V1: R monofásica, qR, o R más alta que R′ ("oreja de conejo" izquierda más alta). TV en V6: R/S < 1, QS o QR. La aberrancia muestra, en cambio, un rsR′ trifásico en V1 y qRs en V6.',
      ),
      options: [
        { label: l('是，两处都符合', 'Yes, VT criteria in both', 'Sí, criterios de TV en ambas'), next: 'vt' },
        { label: l('否（V1 典型 rsR′ / V6 qRs）', 'No (typical rsR′ in V1 / qRs in V6)', 'No (rsR′ típico en V1 / qRs en V6)'), next: 'svtAb' },
      ],
    },
    b4l: {
      kind: 'question',
      text: l(
        '左束支阻滞样：V1–V2 和 V6 是否同时符合室速形态标准？',
        'LBBB-like: are VT criteria present in BOTH V1–V2 AND V6?',
        'Tipo BRI: ¿hay criterios de TV a la vez en V1–V2 Y en V6?',
      ),
      help: l(
        'V1–V2 室速样：R 波 > 30 ms、S 波降支有切迹或顿挫、或 QRS 起点到 S 波最低点 > 60 ms。V6 室速样：QR 或 QS。差异性传导则在 V1 呈窄 r 波和陡直光滑的 S 波降支。',
        'VT in V1–V2: R wave > 30 ms, a notched or slurred S downstroke, or > 60 ms from QRS onset to the S nadir. VT in V6: QR or QS. Aberrancy instead shows a narrow r and a fast, clean S downstroke in V1.',
        'TV en V1–V2: onda R > 30 ms, rama descendente de la S con muesca o empastamiento, o > 60 ms desde el inicio del QRS hasta el nadir de la S. TV en V6: QR o QS. La aberrancia muestra, en cambio, una r estrecha y una rama descendente de la S rápida y limpia en V1.',
      ),
      options: [
        { label: l('是，两处都符合', 'Yes, VT criteria in both', 'Sí, criterios de TV en ambas'), next: 'vt' },
        { label: l('否', 'No', 'No'), next: 'svtAb' },
      ],
    },
    v1: {
      kind: 'question',
      text: l(
        'aVR 第 1 步：aVR 中 QRS 是否以 R 波开始（R、Rs）？',
        'aVR step 1: does the QRS in aVR start with an R wave (R, Rs)?',
        'aVR, paso 1: ¿empieza el QRS en aVR con una onda R (R, Rs)?',
      ),
      help: l(
        '室上性心动过速伴差异性传导时，初始激动背离 aVR，aVR 以负向波开始。初始为 R 波说明激动从心尖下部或心室开始——室速。',
        'In SVT with aberrancy the initial activation moves away from aVR, so aVR starts negative. An initial R means activation starts low in the ventricles, from the apex — VT.',
        'En la TSV con aberrancia la activación inicial se aleja de aVR, por lo que aVR empieza en negativo. Una R inicial indica que la activación nace abajo en los ventrículos, desde el ápex: TV.',
      ),
      options: [
        { label: l('是', 'Yes', 'Sí'), next: 'vt' },
        { label: l('否', 'No', 'No'), next: 'v2' },
      ],
    },
    v2: {
      kind: 'question',
      text: l('第 2 步：aVR 中初始 r 波或 q 波宽度是否 > 40 ms？', 'Step 2: is the initial r or q wave in aVR wider than 40 ms?', 'Paso 2: ¿la onda r o q inicial en aVR mide más de 40 ms?'),
      options: [
        { label: l('是', 'Yes', 'Sí'), next: 'vt' },
        { label: l('否', 'No', 'No'), next: 'v3' },
      ],
    },
    v3: {
      kind: 'question',
      text: l(
        '第 3 步：QRS 以负向波开始且以负向为主时，其降支上有无切迹？',
        'Step 3: when the QRS starts negative and is mainly negative, is there a notch on its descending limb?',
        'Paso 3: si el QRS empieza en negativo y es predominantemente negativo, ¿hay una muesca en su rama descendente?',
      ),
      options: [
        { label: l('有', 'Yes', 'Sí'), next: 'vt' },
        { label: l('没有', 'No', 'No'), next: 'v4' },
      ],
    },
    v4: {
      kind: 'question',
      text: l(
        '第 4 步：在 aVR 测 vi/vt。vi = QRS 最初 40 ms 内的电压变化，vt = 最后 40 ms 内的电压变化。vi/vt 是否 ≤ 1？',
        'Step 4: measure vi/vt in aVR. vi = voltage change during the first 40 ms of the QRS; vt = during the last 40 ms. Is vi/vt ≤ 1?',
        'Paso 4: mide vi/vt en aVR. vi = variación de voltaje en los primeros 40 ms del QRS; vt = en los últimos 40 ms. ¿Es vi/vt ≤ 1?',
      ),
      help: l(
        '室速起始于心肌间缓慢传导，最初 40 ms 的变化小于最后 40 ms：vi/vt ≤ 1。差异性传导起始经希氏–浦肯野系统快速传导：vi/vt > 1。',
        'VT starts slowly (muscle-to-muscle conduction), so the first 40 ms move less than the last 40 ms: vi/vt ≤ 1. Aberrancy starts fast over the His–Purkinje system: vi/vt > 1.',
        'La TV empieza lenta (conducción de músculo a músculo): los primeros 40 ms varían menos que los últimos 40 ms, vi/vt ≤ 1. La aberrancia empieza rápida por el sistema His-Purkinje: vi/vt > 1.',
      ),
      options: [
        { label: l('vi/vt ≤ 1', 'vi/vt ≤ 1', 'vi/vt ≤ 1'), next: 'vt' },
        { label: l('vi/vt > 1', 'vi/vt > 1', 'vi/vt > 1'), next: 'svtAb' },
      ],
    },

    // ── leaves ────────────────────────────────────────────────────────────────────────────────────────────────────
    vt: {
      kind: 'leaf',
      tone: 'critical',
      findings: ['vt-monomorphic'],
      title: l('室性心动过速', 'Ventricular tachycardia', 'Taquicardia ventricular'),
      text: l(
        '你找到的标准支持室速。单形性室速是规整宽QRS心动过速最常见的原因，尤其见于陈旧性心梗或结构性心脏病。按室速处理；心动过速时的 12 导联心电图对日后分析非常有价值。',
        'The criterion you found favours VT. Monomorphic VT is the commonest cause of a regular wide-QRS tachycardia, especially after a myocardial infarction or with structural heart disease. Manage as VT; a 12-lead ECG recorded during the tachycardia is very valuable later.',
        'El criterio que has encontrado favorece la TV. La TV monomorfa es la causa más frecuente de taquicardia regular de QRS ancho, sobre todo tras un infarto o con cardiopatía estructural. Trátala como TV; un ECG de 12 derivaciones durante la taquicardia es muy valioso después.',
      ),
    },
    vtDissoc: {
      kind: 'leaf',
      tone: 'critical',
      findings: ['vt-monomorphic', 'av-dissociation'],
      title: l('室性心动过速（房室分离）', 'Ventricular tachycardia (AV dissociation)', 'Taquicardia ventricular (disociación AV)'),
      text: l(
        '房室分离、心室夺获和室性融合波是室速最特异的征象（但只见于少数病例）：心室以快于心房且独立于心房的频率搏动。',
        'AV dissociation, capture and fusion beats are the most specific signs of VT (though seen in only a minority of cases): the ventricles beat faster than, and independently of, the atria.',
        'La disociación AV y los latidos de captura y de fusión son los signos más específicos de TV (aunque solo aparecen en una minoría): los ventrículos laten más rápido que las aurículas e independientemente de ellas.',
      ),
    },
    svtAb: {
      kind: 'leaf',
      tone: 'major',
      findings: ['svt', 'aberrant-conduction'],
      title: l('室上性心动过速伴差异性传导（可能）', 'Probable SVT with aberrant conduction', 'Probable TSV con conducción aberrante'),
      text: l(
        '未满足任何室速标准，故可能是室上速伴束支阻滞或频率依赖性差异性传导。与既往心电图比较（窦律时是否有相同的束支阻滞？）。预激性心动过速（逆向型 AVRT）可类似室速，这些流程无法区分。拿不准时按室速处理。',
        'No VT criterion was met, so SVT with bundle-branch block or rate-related aberrancy is likely. Compare with an earlier ECG (the same bundle-branch block in sinus rhythm?). Pre-excited tachycardia (antidromic AVRT) can mimic VT and is not separated by these algorithms. If in doubt, treat as VT.',
        'No se cumple ningún criterio de TV, así que es probable una TSV con bloqueo de rama o aberrancia dependiente de la frecuencia. Compara con un ECG previo (¿el mismo bloqueo de rama en ritmo sinusal?). La taquicardia preexcitada (TRAV antidrómica) puede imitar una TV y estos algoritmos no la distinguen. Ante la duda, trátala como TV.',
      ),
    },
    afBbb: {
      kind: 'leaf',
      tone: 'major',
      findings: ['atrial-fibrillation', 'aberrant-conduction'],
      title: l('心房颤动伴束支阻滞或差异性传导', 'Atrial fibrillation with bundle-branch block or aberrancy', 'Fibrilación auricular con bloqueo de rama o aberrancia'),
      text: l(
        'R–R 绝对不规整，QRS 恒定增宽，呈典型右束支或左束支阻滞形态。与窦性心律时的心电图比较。',
        'Irregularly irregular rhythm with a constant wide QRS of typical RBBB or LBBB shape. Compare with an ECG in sinus rhythm.',
        'Ritmo irregularmente irregular con un QRS ancho constante de morfología típica de BRD o BRI. Compara con un ECG en ritmo sinusal.',
      ),
    },
    preexAf: {
      kind: 'leaf',
      tone: 'critical',
      findings: ['atrial-fibrillation', 'wpw'],
      title: l('预激性心房颤动（经旁路下传）', 'Pre-excited atrial fibrillation (conduction over an accessory pathway)', 'Fibrilación auricular preexcitada (conducción por una vía accesoria)'),
      text: l(
        '极快且不规整，QRS 宽度不断变化（经旁路的融合程度不同）；最短预激 R–R ≤ 250 ms 提示发生心室颤动的风险高。避免使用阻断房室结的药物（腺苷、维拉帕米、地尔硫䓬、地高辛、β 受体阻滞剂）：它们可加快旁路传导。不稳定时同步电复律。',
        'Very fast and irregular, with QRS complexes of changing width (varying fusion over the pathway); a shortest pre-excited R–R ≤ 250 ms means a high risk of ventricular fibrillation. Avoid drugs that block the AV node (adenosine, verapamil, diltiazem, digoxin, beta-blockers): they can speed conduction over the pathway. Synchronised cardioversion if unstable.',
        'Muy rápida e irregular, con QRS de anchura cambiante (fusión variable por la vía); un R–R preexcitado más corto ≤ 250 ms indica alto riesgo de fibrilación ventricular. Evita los fármacos que bloquean el nodo AV (adenosina, verapamilo, diltiazem, digoxina, betabloqueantes): pueden acelerar la conducción por la vía. Cardioversión sincronizada si hay inestabilidad.',
      ),
    },
    polyVt: {
      kind: 'leaf',
      tone: 'critical',
      findings: ['vt-polymorphic', 'torsades'],
      title: l('多形性室速 / 尖端扭转型室速', 'Polymorphic VT / torsades de pointes', 'TV polimorfa / torsade de pointes'),
      text: l(
        'QRS 形态持续变化。若基础心电图 QT 延长，即为尖端扭转型室速（波峰围绕基线扭转）：检查延长 QT 的药物、血钾和血镁。QT 不长时要想到急性缺血。常蜕变为心室颤动。',
        'The QRS shape changes continuously. With a long QT on the baseline ECG it is torsades de pointes (the peaks twist around the baseline): check QT-prolonging drugs, potassium and magnesium. Without a long QT, think of acute ischaemia. It often degenerates into ventricular fibrillation.',
        'La morfología del QRS cambia continuamente. Con un QT largo en el ECG basal es una torsade de pointes (los picos giran alrededor de la línea de base): revisa fármacos que alargan el QT, potasio y magnesio. Sin QT largo, piensa en isquemia aguda. Con frecuencia degenera en fibrilación ventricular.',
      ),
    },
  },
};
