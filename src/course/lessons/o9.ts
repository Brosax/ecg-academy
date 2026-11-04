/**
 * O9 — Lead reversal, misplacement and dextrocardia (docs/PLAN.md §3, stage O).
 * Criteria: docs/curriculum/criteria.md `arm-cable-reversal` row; "Other limb cable reversals" and
 * "Precordial misplacement / transposition" missing-book bullets (Batchvarov 2007; Kligfield 2007 Part I).
 */
import { l } from '../../core/l10n';
import type { EcgSource } from '../../practice/api';
import type { DialId, PlacementSpec } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});
/** One heart (normal, 72/min) recorded through another electrode placement: only the recording changes. */
const placed = (seed: number, placement?: PlacementSpec): EcgSource => ({
  kind: 'synth',
  req: { scenario: 'normal', seed, dials: { rate: 72 }, ...(placement ? { recording: { placement } } : {}) },
});

const lesson: Lesson = {
  id: 'o9',
  stage: 'O',
  order: 9,
  title: l('导联接反、电极位置错误与右位心', 'Lead reversal, misplacement and dextrocardia', 'Inversión de derivaciones, colocación incorrecta y dextrocardia'),
  summary: l(
    '左右上肢电极接反让 I 导联整个倒置，却留下完全正常的胸前导联；右位心同样使 I 倒置，却伴 V1–V6 R 波递增不良。接反、错位、右位心——先查记录，再查心脏。',
    'An arm-cable reversal turns lead I fully upside down but leaves the chest leads normal; dextrocardia inverts lead I and breaks R-wave progression across V1–V6. Reversal, misplacement, dextrocardia — check the recording before the heart.',
    'La inversión de los cables de los brazos pone la derivación I del revés pero deja las precordiales normales; la dextrocardia también invierte la I, pero rompe la progresión de la R en V1-V6. Inversión, mala colocación, dextrocardia: comprueba el registro antes que el corazón.',
  ),
  objectives: [
    l('说出 LA/RA 接反的完整签名，并指出胸前导联不受影响。', 'State the full LA/RA reversal signature and point out that the chest leads are spared.', 'Exponer la firma completa de la inversión AI/AD y señalar que las precordiales se libran.'),
    l('用 V1–V6 的 R 波递增把右位心与接反分开。', 'Separate dextrocardia from cable reversal by the R-wave progression in V1–V6.', 'Separar la dextrocardia de la inversión de cables por la progresión de la R en V1-V6.'),
    l('认出其他肢体反接：LA/LL（I↔II、aVR 正常）、RA/LL，以及表现为“近乎平坦导联”的中性电极反接。', 'Recognise the other limb reversals: LA/LL (I↔II, aVR normal), RA/LL, and the neutral-electrode reversal with its nearly flat lead.', 'Reconocer las demás inversiones: AI/PI (I↔II, aVR normal), AD/PI y la inversión del electrodo neutro con su derivación casi plana.'),
    l('认出胸导联错位（递增中断、V1–V2 过高），并在系列对比前核对电极位置。', 'Recognise chest-lead misplacement (broken progression, high V1–V2) and verify electrode positions before serial comparison.', 'Reconocer la mala colocación precordial (progresión rota, V1-V2 altas) y comprobar la posición de los electrodos antes de comparar series.'),
  ],
  minutes: 14,
  competencies: ['C12'],
  findings: ['electrode-reversal-la-ra', 'electrode-reversal-la-ll', 'dextrocardia', 'precordial-misplacement'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('electrode-reversal-la-ra', 1561),
      view: { layout: '3x4+1', highlightLeads: ['I', 'aVR'] },
      question: l(
        '这份心电图的 I 导联整个倒了过来，aVR 却直立。在认定任何“异常”之前，哪一个检查能解释全部表现？',
        'Lead I on this ECG is entirely upside down, yet aVR is upright. Before you call any "abnormality", which single check explains everything?',
        'La derivación I de este ECG está completamente del revés y, sin embargo, la aVR es positiva. Antes de dar por buena cualquier «anomalía», ¿qué única comprobación lo explica todo?',
      ),
      reveal: l(
        '**左右上肢电极接反（LA/RA）**。I 导联的 P、QRS、T 全部倒置；II 与 III 互换，aVR 与 aVL 互换；aVF 不变。那“一个检查”就是**看胸前导联**：V1–V6 完全正常、R 波递增如常——问题在记录，不在心脏（这也正是它与右位心的区别）。重新接好电极，再录一份。',
        '**The left and right arm electrodes are swapped (LA/RA).** P, QRS and T are all inverted in lead I; II and III have traded places, and so have aVR and aVL; aVF is unchanged. The single check is **look at the chest leads**: V1–V6 are completely normal with a normal R progression — the problem is the recording, not the heart (exactly what separates this from dextrocardia). Re-attach the electrodes and record again.',
        '**Los electrodos de ambos brazos están intercambiados (AI/AD).** La P, el QRS y la T están invertidos en la derivación I; II y III se han intercambiado, e igual aVR y aVL; aVF no cambia. Esa única comprobación es **mirar las derivaciones precordiales**: V1-V6 son totalmente normales y la R progresa con normalidad; el problema está en el registro, no en el corazón (justo lo que la separa de la dextrocardia). Reconecta los electrodos y repite el ECG.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'cable-swap', params: { start: 'correct' } },
      ecg: placed(1561),
      caption: l(
        '导联是两个电极之差。交换两根导线，导联就会翻转或互换位置；胸导联始终不变。逐一试试每种接反。',
        'A lead is the difference between two electrodes. Swap two cables and leads flip or trade places; the chest leads never change. Try each swap.',
        'Una derivación es la diferencia entre dos electrodos. Intercambia dos cables y las derivaciones se invierten o cambian de sitio; las precordiales no cambian nunca. Prueba cada inversión.',
      ),
    },
    {
      kind: 'film',
      title: l('同一颗心，接错肢体导线', 'One heart, the limb cables wrong', 'Un corazón, los cables de miembros mal puestos'),
      view: { layout: '3x4+1', highlightLeads: ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'] },
      frames: [
        {
          label: l('接法正确', 'Correct', 'Correcto'),
          ecg: placed(1561),
          note: l('接法正确：I和II的P、QRS、T都直立，P在II最高；aVR全为负。', 'Correct cables: P, QRS and T upright in I and II, the P tallest in II; aVR all negative.', 'Cables correctos: P, QRS y T positivas en I y II, con la P más alta en II; aVR todo negativo.'),
          marks: [{ auto: 'p', lead: 'II' }],
        },
        {
          label: l('左右上肢接反', 'LA/RA swapped', 'LA/RA invertidos'),
          ecg: placed(1561, { limbs: { RA: 'LA', LA: 'RA' } }),
          note: l('两上肢接反：I导联完全倒置（P、QRS、T）；II与III互换，aVR与aVL互换；aVF和V1–V6不变。', 'Arm cables swapped: lead I fully inverted (P, QRS, T); II and III trade places, so do aVR and aVL; aVF and V1–V6 unchanged.', 'Cables de los brazos invertidos: I del todo invertida (P, QRS, T); II y III se intercambian, igual que aVR y aVL; aVF y V1–V6 no cambian.'),
          marks: [{ auto: 'p', lead: 'I' }],
        },
        {
          label: l('左上肢与左下肢接反', 'LA/LL swapped', 'LA/LL invertidos'),
          ecg: placed(1561, { limbs: { LA: 'LL', LL: 'LA' } }),
          note: l('左上肢与左下肢接反：I与II互换，aVL与aVF互换，III倒置，aVR不变。线索：I的P波比II大。', 'Left arm and left leg swapped: I and II trade places, aVL and aVF too, III inverts, aVR unchanged. Clue: the P is bigger in I than in II.', 'Brazo y pierna izquierdos invertidos: I y II se intercambian, aVL y aVF también, III se invierte y aVR no cambia. Pista: la P es mayor en I que en II.'),
          marks: [{ auto: 'p', lead: 'I' }, { auto: 'p', lead: 'II' }],
        },
        {
          label: l('右上肢与左下肢接反', 'RA/LL swapped', 'RA/LL invertidos'),
          ecg: placed(1561, { limbs: { RA: 'LL', LL: 'RA' } }),
          note: l('右上肢与左下肢接反：I、II、III看起来都倒置，aVR变直立，aVF变成负的：像下壁Q波或低位房性心律。', 'Right arm and left leg swapped: I, II and III all look inverted, aVR turns upright and aVF negative: it can pass for inferior Q waves or a low atrial rhythm.', 'Brazo derecho y pierna izquierda invertidos: I, II y III parecen invertidas, aVR se vuelve positiva y aVF negativa: puede pasar por Q inferiores o un ritmo auricular bajo.'),
          marks: [{ auto: 'p', lead: 'II' }],
        },
        {
          label: l('左上肢与右下肢接反', 'LA/RL swapped', 'LA/RL invertidos'),
          ecg: placed(1561, { limbs: { LA: 'RL', RL: 'LA' } }),
          note: l('左上肢导线接到右腿（中性电极）：III几乎成了一条直线，I和II一模一样，胸导联也稍有改变。', 'Left-arm cable on the right leg (the neutral electrode): lead III goes almost flat, I and II look identical, and the chest leads shift a little.', 'Cable del brazo izquierdo en la pierna derecha (el electrodo neutro): III queda casi plana, I y II son idénticas y las precordiales cambian algo.'),
          marks: [{ auto: 'qrs', lead: 'III' }],
        },
      ],
      predict: {
        question: l('把两根上肢导线互换，I导联会怎样？', 'Swap the two arm cables. What happens to lead I?', 'Intercambia los dos cables de los brazos. ¿Qué le pasa a la derivación I?'),
        options: [l('完全倒置', 'It turns fully upside down', 'Se invierte por completo'), l('变成直线', 'It goes flat', 'Se queda plana'), l('不变', 'Nothing', 'Nada')],
        answer: 0,
      },
      caption: l(
        '肢体导联看起来不对时，先查记录再查心脏。上肢与左下肢导线互换不影响V1–V6；胸导联也异常，就要想别的原因。',
        'When the limb leads look wrong, check the recording before the heart. Swapping arm and left-leg cables never touches V1–V6; if the chest leads are abnormal too, think of something else.',
        'Si las derivaciones de miembros parecen raras, revisa el registro antes que el corazón. Intercambiar los cables de brazos y pierna izquierda no toca V1–V6; si las precordiales también fallan, piensa en otra cosa.',
      ),
    },
    {
      kind: 'criteria',
      title: l('接反与错位的签名', 'The reversal and misplacement signatures', 'Las firmas de inversión y mala colocación'),
      items: [
        {
          label: l('LA/RA 接反', 'LA/RA reversal', 'Inversión AI/AD'),
          value: l('I 导联 P、QRS、T 全倒置；II↔III；aVR↔aVL；aVF 不变；V1–V6 正常递增', 'Lead I fully inverted (P, QRS, T); II↔III; aVR↔aVL; aVF unchanged; V1–V6 normal progression', 'Derivación I invertida por completo (P, QRS y T); II↔III; aVR↔aVL; aVF sin cambios; V1-V6 con progresión normal'),
        },
        {
          label: l('右位心', 'Dextrocardia', 'Dextrocardia'),
          value: l('I 导联同样倒置，但 V1–V6 R 波递增不良/递减；aVR 的 P 直立；右侧胸导联可恢复递增', 'Lead I also inverted, but R progression across V1–V6 is poor or reversed; upright P in aVR; right-sided chest leads restore it', 'La I también invertida, pero con progresión de la R pobre o invertida en V1-V6; P positiva en aVR; las precordiales derechas la restauran'),
        },
        {
          label: l('LA/LL 接反', 'LA/LL reversal', 'Inversión AI/PI'),
          value: l('I↔II 互换；aVL↔aVF；III 倒置；aVR 正常；线索：I 的 P 大于 II', 'I↔II swapped; aVL↔aVF; III inverted; aVR normal; clue: the P is larger in I than in II', 'I↔II intercambiadas; aVL↔aVF; III invertida; aVR normal; pista: la P es mayor en I que en II'),
        },
        {
          label: l('RA/LL 接反', 'RA/LL reversal', 'Inversión AD/PI'),
          value: l('I、II、III 全部倒置样；貌似下壁 Q 波或异位房性心律', 'I, II and III all look inverted; mimics inferior Q waves or an ectopic atrial rhythm', 'I, II y III parecen invertidas; simula ondas Q inferiores o un ritmo auricular ectópico'),
        },
        {
          label: l('中性（RL）电极反接', 'Neutral (RL) cable reversal', 'Inversión del electrodo neutro (PD)'),
          value: l('一个肢体导联几乎成直线（LA/RL→III；RA/RL→II）', 'One limb lead becomes almost a flat line (LA/RL→III; RA/RL→II)', 'Una derivación periférica se vuelve casi plana (AI/PD→III; AD/PD→II)'),
        },
        {
          label: l('胸导联电极错位', 'Precordial misplacement', 'Mala colocación precordial'),
          value: l('R 波递增中断/孤立跳变；V1–V2 过高：rSr′ + V1–V2 P 波倒置，貌似 iRBBB 或 Brugada', 'Broken R progression / an isolated jump; V1–V2 too high: rSr′ + negative P in V1–V2, mimicking iRBBB or Brugada', 'Progresión de la R rota o salto aislado; V1-V2 altas: rSr′ y P negativa en V1-V2, simulando bloqueo de rama derecha incompleto o Brugada'),
        },
        {
          label: l('其他放置规则', 'Other placement rules', 'Otras reglas de colocación'),
          value: l(
            '肢体电极放在躯干（Mason–Likar，运动试验）：电轴和电压会变，须在图上注明；V1–V2 过低可掩盖真正的图形；有意放在第 2–3 肋间是筛查 Brugada；做系列对比前先确认电极位置相同',
            'Limb electrodes on the torso (Mason–Likar, exercise ECG): axis and voltages change, so label the tracing; V1–V2 too low can hide a real pattern; V1–V2 in the 2nd–3rd space on purpose is the Brugada screen; confirm identical positions before any serial comparison',
            'Electrodos de miembros en el torso (Mason-Likar, prueba de esfuerzo): cambian el eje y los voltajes, anótalo en el trazado; V1-V2 demasiado bajos pueden ocultar un patrón real; V1-V2 en el 2.º-3.er espacio a propósito es el cribado de Brugada; confirma posiciones idénticas antes de cualquier comparación seriada',
          ),
        },
      ],
      source: 'Batchvarov VN, Malik M, Camm AJ. Europace 2007;9:1081-1090; Kligfield P et al. AHA/ACCF/HRS Part I: The electrocardiogram and its technology. Circulation 2007;115:1306-1324',
    },
    {
      kind: 'worked',
      title: l('接反还是右位心？两条记录的逻辑', 'Reversal or dextrocardia? The two-tracing logic', '¿Inversión o dextrocardia? La lógica de los dos trazados'),
      ecg: synth('dextrocardia', 1562),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('I 导联倒置：两个候选', 'Lead I inverted: two candidates', 'Derivación I invertida: dos candidatas'),
          body: l(
            'P、QRS、T 在 I 导联全部倒置。这个签名只有两个常见解释：**LA/RA 接反**（上一份图）和**镜像右位心**。两者在这一步完全一样，别停在这里。',
            'P, QRS and T are all inverted in lead I. Only two common explanations give this signature: **LA/RA reversal** (the previous tracing) and **mirror-image dextrocardia**. The two are identical at this step — keep going.',
            'La P, el QRS y la T están invertidos en la derivación I. Solo dos explicaciones habituales dan esta firma: la **inversión AI/AD** (el trazado anterior) y la **dextrocardia en espejo**. Las dos son idénticas en este paso: sigue adelante.',
          ),
          marks: [{ auto: 'p', lead: 'I' }, { auto: 'qrs', lead: 'I' }],
          highlightLeads: ['I'],
        },
        {
          title: l('aVR 不能裁决', 'aVR does not decide', 'La aVR no decide'),
          body: l(
            'aVR 的 P 直立（aVL 倒置）——两者都符合：接反时 aVR↔aVL 互换，右位心时镜像的心房朝向 aVR。aVR 只确认“确实反了”，不能告诉你为什么。',
            'The P is upright in aVR (inverted in aVL) — both explanations fit: with reversed cables aVR and aVL swap, and in dextrocardia the mirrored atria point towards aVR. aVR confirms that something is flipped, but not why.',
            'La P es positiva en aVR (negativa en aVL): encaja con las dos; con los cables invertidos aVR y aVL se intercambian, y en la dextrocardia las aurículas en espejo apuntan hacia aVR. La aVR confirma que algo está invertido, pero no por qué.',
          ),
          marks: [{ auto: 'p', lead: 'aVR' }],
          highlightLeads: ['aVR', 'aVL'],
        },
        {
          title: l('裁决者：V1–V6', 'The decider: V1–V6', 'La decisiva: V1-V6'),
          body: l(
            '从 V1 走到 V6：R 波**越来越小**——递增不良，到 V6 几乎全负。肢体接反不会碰胸前导联，所以这不是电缆的问题：**右位心**。若 R 波平滑递增，答案就是接反——回到上一份图。',
            'Walk V1 to V6: the R wave gets **smaller and smaller** — poor progression, almost fully negative by V6. Limb reversals never touch the chest leads, so this is not a cable problem: **dextrocardia**. Had the R progressed smoothly, the answer would be the cable reversal of the previous tracing.',
            'Recorre de V1 a V6: la onda R se hace **cada vez más pequeña**: mala progresión, casi negativa del todo en V6. Las inversiones de miembros nunca tocan las precordiales, así que esto no es un problema de cables: **dextrocardia**. Si la R hubiera progresado con suavidad, la respuesta sería la inversión de cables del trazado anterior.',
          ),
          marks: [{ auto: 'r', lead: 'V1' }, { auto: 'r', lead: 'V6' }],
          highlightLeads: ['V1', 'V3', 'V6'],
        },
        {
          title: l('行动', 'What to do next', 'Qué hacer'),
          body: l(
            '接反：核对电极颜色与位置，重新记录，报告技术错误而非诊断。右位心：右侧胸导联（V3R–V6R）可恢复递增；结合查体与影像确认内脏转位——并记住右位心会把电轴、肥厚与梗死的标准全部换到镜像位置。',
            'Reversal: check the electrode colours and positions, re-record, and report a technical error rather than a diagnosis. Dextrocardia: right-sided chest leads (V3R–V6R) restore the progression; confirm situs with examination and imaging — and remember that in dextrocardia every axis, hypertrophy and infarction criterion must be read mirrored.',
            'Inversión: comprueba los colores y la posición de los electrodos, repite el ECG e informa de un error técnico, no de un diagnóstico. Dextrocardia: las precordiales derechas (V3R-V6R) restauran la progresión; confirma el situs con la exploración y la imagen, y recuerda que en la dextrocardia todos los criterios de eje, hipertrofia e infarto se leen en espejo.',
          ),
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('同一个倒置的 I，两种胸前', 'One inverted I, two different chests', 'La misma I invertida, dos precordiales distintas'),
      view: { layout: '6x2' },
      left: {
        ecg: synth('electrode-reversal-la-ra', 1563),
        caption: l('LA/RA 接反：胸前递增正常', 'LA/RA reversal: normal precordial progression', 'Inversión AI/AD: progresión precordial normal'),
        marks: [{ auto: 'r', lead: 'V4' }],
      },
      right: {
        ecg: synth('dextrocardia', 1564),
        caption: l('右位心：R 波向 V6 递减', 'Dextrocardia: the R wave falls towards V6', 'Dextrocardia: la R decrece hacia V6'),
        marks: [{ auto: 'r', lead: 'V1' }],
      },
      point: l(
        '两边的 I 导联同样倒置，裁决在胸前。左：V1–V6 R 波平滑递增（看 V4）——电缆接反，重录即可。右：V1 的 R 最高、向 V6 递减——心脏在右边：右位心。',
        'Lead I is equally inverted on both sides; the verdict is in the chest. Left: smooth R progression across V1–V6 (look at the R in V4) — cable reversal; re-record. Right: the tallest R sits in V1 and falls towards V6 — the heart is on the right: dextrocardia.',
        'La derivación I está igualmente invertida en ambos lados; el veredicto está en las precordiales. Izquierda: progresión suave de la R en V1-V6 (mira la R en V4): inversión de cables; repite el ECG. Derecha: la R más alta está en V1 y decrece hacia V6: el corazón está a la derecha; dextrocardia.',
      ),
    },
    {
      kind: 'film',
      title: l('同一颗心，胸导电极放错', 'One heart, the chest electrodes wrong', 'Un corazón, los electrodos precordiales mal puestos'),
      view: { layout: '3x4+1', highlightLeads: ['V1', 'V2', 'V3', 'V4'] },
      frames: [
        {
          label: l('位置正确', 'Correct', 'Correcto'),
          ecg: placed(1567),
          note: l('位置正确：R波从V1到V4一步步长高（约1、5、12、14 mm），V1的P波正负双相。', 'Correct sites: the R grows step by step from V1 to V4 (about 1, 5, 12, 14 mm); the P in V1 is up-down.', 'Posiciones correctas: la R crece paso a paso de V1 a V4 (unos 1, 5, 12, 14 mm); la P de V1 es bifásica.'),
          marks: [{ auto: 'r', lead: 'V2' }, { auto: 'r', lead: 'V3' }],
        },
        {
          label: l('V2与V3接反', 'V2/V3 swapped', 'V2/V3 invertidos'),
          ecg: placed(1567, { chest: { V2: 'V3', V3: 'V2' } }),
          note: l('V2与V3导线接反：V2突然变高（约12 mm），V3又掉回约5 mm，V4再高起来：孤立的跳跃 = 接错线。', 'V2 and V3 cables swapped: V2 is suddenly tall (about 12 mm), V3 drops back to about 5 mm, V4 is tall again: an isolated jump means a swap.', 'Cables de V2 y V3 invertidos: V2 de pronto alta (unos 12 mm), V3 vuelve a unos 5 mm y V4 vuelve a ser alta: un salto aislado es un cambio de cables.'),
          marks: [{ auto: 'r', lead: 'V2' }, { auto: 'r', lead: 'V3' }],
        },
        {
          label: l('V1–V2过高', 'V1–V2 too high', 'V1–V2 demasiado altos'),
          ecg: placed(1567, { chest: { V1: { ics: 2, line: 'sternal', side: 'R' }, V2: { ics: 2, line: 'sternal', side: 'L' } } }),
          note: l('V1–V2放在第2肋间：V1的P波变成全负，V2的r波从约5 mm缩到约2 mm。会被当成R波递增不良或前壁梗死。', 'V1–V2 in the 2nd intercostal space: the P in V1 turns fully negative and the r in V2 shrinks from about 5 to 2 mm. It can pass for poor R progression or an anterior infarct.', 'V1–V2 en el 2.º espacio intercostal: la P de V1 se vuelve negativa y la r de V2 baja de unos 5 a 2 mm. Puede pasar por mala progresión de R o un infarto anterior.'),
          marks: [{ auto: 'p', lead: 'V1' }, { auto: 'r', lead: 'V2' }],
        },
      ],
      predict: {
        question: l('把V2和V3的导线互换，R波递增会是什么样？', 'Swap the V2 and V3 cables. What will the R progression look like?', 'Intercambia los cables de V2 y V3. ¿Cómo será la progresión de la R?'),
        options: [l('出现跳跃：V2高、V3矮', 'A jump: tall in V2, small in V3', 'Un salto: alta en V2, pequeña en V3'), l('和原来一样平滑', 'As smooth as before', 'Tan suave como antes'), l('所有R波倒置', 'Every R inverted', 'Todas las R invertidas')],
        answer: 0,
      },
      caption: l(
        'R波递增应平滑单调；哪里断开或跳跃，先查电极。V1有负P就数一数肋间：第4肋间在胸骨角下两根肋骨。',
        'R progression should be smooth and steady; wherever it breaks or jumps, check the electrodes first. A negative P in V1: count the ribs, the 4th space is two ribs below the sternal angle.',
        'La progresión de la R debe ser suave y constante; donde se rompa o salte, revisa primero los electrodos. Una P negativa en V1: cuenta las costillas; el 4.º espacio está dos costillas por debajo del ángulo esternal.',
      ),
    },
    { kind: 'check', item: { family: 'artefacts', seed: 1 } },
    { kind: 'check', item: { family: 'artefacts', seed: 3 } },
    { kind: 'check', item: { family: 'artefacts', seed: 7 } },
    { kind: 'drill', families: ['artefacts', 'compare-technical'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [17860],
      caption: l(
        'PTB-XL 没有标注电极反接的记录，所以这里练的是反面：一份 I 导联 QRS 以负向为主的真实心电图。是电缆反接吗？查 P 波：上肢反接时 I 导联的 P、QRS、T **一起**倒置，aVR 的 P 变为直立；这里 II 导联 P 直立、aVR 的 P 倒置——电缆没接错，I 导联负向的 QRS 来自心脏本身的右偏电轴。先想好你的结论，再揭晓标签。',
        'PTB-XL has no record labelled as an electrode reversal, so practise the opposite case: a real ECG whose QRS in lead I is mostly negative. Is it a cable reversal? Check the P wave: with the arm cables swapped, P, QRS and T in lead I invert **together** and the P in aVR turns upright; here the P is upright in II and inverted in aVR — the cables are right, and the negative QRS in lead I is the heart’s own rightward axis. Decide your conclusion first, then reveal the label.',
        'PTB-XL no contiene registros etiquetados como inversión de electrodos, así que practica el caso contrario: un ECG real con el QRS de la derivación I predominantemente negativo. ¿Es una inversión de cables? Mira la onda P: con los cables de los brazos invertidos, la P, el QRS y la T de I se invierten **juntos** y la P de aVR se vuelve positiva; aquí la P es positiva en II y negativa en aVR: los cables están bien y el QRS negativo en I es el eje derecho del propio corazón. Decide tu conclusión y después mira la etiqueta.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l('右位心被当作“正常变异”放过，递增不良又被当成前壁梗死。', 'Dextrocardia waved through as a "normal variant", and its poor R progression then read as anterior infarction.', 'Dar la dextrocardia por «variante normal» y leer luego su mala progresión de la R como infarto anterior.'),
        l('左右手接反的患者被送去超声心动图：重录一份就够了。', 'The patient with reversed arm cables is sent for an echocardiogram: re-recording the ECG is enough.', 'Pedir un ecocardiograma al paciente con los cables de los brazos invertidos: basta con repetir el ECG.'),
        l('V1–V2 放高的 rSr′ 引发“Brugada”惊魂——先确认肋间。', 'A high-placed V1–V2 with rSr′ starts a Brugada scare — confirm the intercostal space first.', 'Una V1-V2 colocada alta con rSr′ desata el susto por Brugada: confirma antes el espacio intercostal.'),
        l('系列对比前忘记核对电极位置，把体位差异当成疾病演变。', 'Forgetting to check electrode placement before serial comparison, and reading position differences as disease evolution.', 'Olvidar comprobar la colocación de los electrodos antes de comparar series, y leer diferencias de posición como evolución de la enfermedad.'),
        l('近乎平坦的导联被直接忽略——中性电极反接也是错误，也要重录。', 'The nearly flat lead is simply ignored — a neutral-cable reversal is still an error, and still needs a re-record.', 'Ignorar sin más la derivación casi plana: la inversión del electrodo neutro también es un error y también exige repetir el ECG.'),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('上肢与左下肢导线互换不碰胸前导联：LA/RA = I 导联全倒置、II↔III、aVR↔aVL、aVF 不变，V1–V6 正常。', 'Arm and left-leg cable swaps spare the chest leads: LA/RA = lead I fully inverted, II↔III, aVR↔aVL, aVF unchanged, V1–V6 normal.', 'Los intercambios de cables de brazos y pierna izquierda no tocan las precordiales: AI/AD = derivación I invertida por completo, II↔III, aVR↔aVL, aVF sin cambios y V1-V6 normales.'),
        l('I 导联倒置 + V1–V6 R 波递增不良 = 右位心，不是接反；右侧胸导联可证实。', 'Inverted lead I + poor R progression across V1–V6 = dextrocardia, not cable reversal; right-sided chest leads confirm it.', 'Derivación I invertida + mala progresión de la R en V1-V6 = dextrocardia, no inversión de cables; las precordiales derechas lo confirman.'),
        l('LA/LL 最隐秘（I↔II、aVR 正常、I 的 P 大于 II）；涉及中性电极的反接让一个导联近乎平坦。', 'LA/LL is the subtlest (I↔II, aVR normal, P larger in I than in II); any reversal involving the neutral electrode flattens one lead.', 'La AI/PI es la más sutil (I↔II, aVR normal, P mayor en I que en II); toda inversión que afecte al electrodo neutro aplana una derivación.'),
        l('胸导联错位打断 R 波递增（孤立跳变）；V1–V2 过高貌似 iRBBB/Brugada。先查记录，再查心脏。', 'Chest-lead misplacement breaks R progression (an isolated jump); high V1–V2 mimics iRBBB/Brugada. Check the recording before the heart.', 'La mala colocación precordial rompe la progresión de la R (salto aislado); V1-V2 altas simulan un bloqueo de rama derecha incompleto o Brugada. Comprueba el registro antes que el corazón.'),
      ],
    },
  ],
  sources: [
    'Batchvarov VN, Malik M, Camm AJ. Europace 2007;9:1081-1090',
    'Kligfield P et al. AHA/ACCF/HRS Part I: The electrocardiogram and its technology. Circulation 2007;115:1306-1324',
    'Castellano et al. 2004',
  ],
};

export default lesson;
