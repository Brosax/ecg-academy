/**
 * O9 — Lead reversal, misplacement and dextrocardia (docs/PLAN.md §3, stage O).
 * Criteria: docs/curriculum/criteria.md `arm-cable-reversal` row; "Other limb cable reversals" and
 * "Precordial misplacement / transposition" missing-book bullets (Batchvarov 2007; Kligfield 2007 Part I).
 */
import { l } from '../../core/l10n';
import type { EcgSource } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
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
        '这份心电图的 I 导联整个倒了过来，aVR 却直立。在写下任何“异常”之前，哪一个检查能解释全部表现？',
        'Lead I on this ECG is entirely upside down, yet aVR is upright. Before you write down any "abnormality", which single check explains everything?',
        'La derivación I de este ECG está completamente del revés y, sin embargo, la aVR es positiva. Antes de anotar cualquier «anomalía», ¿qué única comprobación lo explica todo?',
      ),
      reveal: l(
        '**左右上肢电极接反（LA/RA）**。I 导联的 P、QRS、T 全部倒置；II 与 III 互换，aVR 与 aVL 互换；aVF 不变。那“一个检查”就是**看胸前导联**：V1–V6 完全正常、R 波递增如常——问题在记录，不在心脏（这也正是它与右位心的区别）。重新接好电极，再录一份。',
        '**The left and right arm electrodes are swapped (LA/RA).** P, QRS and T are all inverted in lead I; II and III have traded places, and so have aVR and aVL; aVF is unchanged. The single check is **look at the chest leads**: V1–V6 are completely normal with a normal R progression — the problem is the recording, not the heart (exactly what separates this from dextrocardia). Re-attach the electrodes and record again.',
        '**Los electrodos de ambos brazos están intercambiados (AI/AD).** La P, el QRS y la T están invertidos en la derivación I; II y III se han intercambiado, e igual aVR y aVL; aVF no cambia. Esa única comprobación es **mirar las derivaciones precordiales**: V1-V6 son totalmente normales y la R progresa con normalidad; el problema está en el registro, no en el corazón (justo lo que la separa de la dextrocardia). Reconecta los electrodos y repite el ECG.',
      ),
    },
    {
      kind: 'text',
      title: l('先查记录，再查心脏', 'Check the recording before the heart', 'Comprueba el registro antes que el corazón'),
      body: l(
        '读到“不对劲”的肢体导联，先查记录再查心脏（f6 的规则）。所有接反签名都来自同一条原理：导联是两个电极电位之差，交换电极就是给导联换符号或换位置。\n- **LA/RA（左右上肢）**：I 导联 P、QRS、T 全倒置；II↔III 互换；aVR↔aVL 互换；aVF 不变；V1–V6 完全正常。\n- **LA/LL（左上肢/左下肢）**：I↔II 互换；aVL↔aVF 互换；III 倒置；aVR 正常——I 导联不倒，最容易漏。\n- **RA/LL（右上肢/左下肢）**：I、II、III 看起来全都倒置；貌似下壁 Q 波或低位房性心律。\n- **任何涉及右腿（中性）电极的反接**：某个肢体导联几乎变成直线。\n所有肢体接反中 **V1–V6 都不受影响**——胸前一旦异常，想别的（右位心、病变、胸导联错位）。',
        'When the limb leads look wrong, check the recording before the heart (the f6 rule). Every reversal signature follows one principle: a lead is the difference between two electrodes, so swapping them flips a lead\'s sign or moves it.\n- **LA/RA (both arms)**: lead I fully inverted (P, QRS, T); II↔III swapped; aVR↔aVL swapped; aVF unchanged; V1–V6 completely normal.\n- **LA/LL (left arm / left leg)**: I↔II swapped; aVL↔aVF swapped; III inverted; aVR normal — no inverted lead I to alert you, so the easiest to miss.\n- **RA/LL (right arm / left leg)**: I, II and III all look inverted; mimics inferior Q waves or a low atrial rhythm.\n- **Any reversal involving the right-leg (neutral) electrode**: one limb lead collapses to almost a flat line.\nIn every limb reversal **V1–V6 are unaffected** — if the chest leads are abnormal, think of something else (dextrocardia, disease, chest-electrode misplacement).',
        'Cuando las derivaciones periféricas parecen raras, comprueba el registro antes que el corazón (la regla de f6). Todas las firmas de inversión siguen un mismo principio: una derivación es la diferencia entre dos electrodos, así que intercambiarlos cambia el signo o el puesto de la derivación.\n- **AI/AD (los dos brazos)**: la derivación I invertida por completo (P, QRS y T); II↔III intercambiadas; aVR↔aVL intercambiadas; aVF sin cambios; V1-V6 totalmente normales.\n- **AI/PI (brazo izquierdo / pierna izquierda)**: I↔II intercambiadas; aVL↔aVF intercambiadas; III invertida; aVR normal: como la I no se invierte, es la más fácil de pasar por alto.\n- **AD/PI (brazo derecho / pierna izquierda)**: I, II y III parecen todas invertidas; simula ondas Q inferiores o un ritmo auricular bajo.\n- **Cualquier inversión en la que intervenga el electrodo de la pierna derecha (neutro)**: una derivación periférica se queda casi en línea plana.\nEn todas las inversiones de miembros **V1-V6 no se afectan**: si las precordiales son anómalas, piensa en otra cosa (dextrocardia, enfermedad, mala colocación de los electrodos torácicos).',
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
      kind: 'ecg',
      ecg: synth('electrode-reversal-la-ll', 1565),
      view: { layout: '3x4+1', highlightLeads: ['I', 'II', 'III', 'aVL', 'aVF'] },
      marks: [{ auto: 'p', lead: 'I' }, { auto: 'p', lead: 'II' }],
      caption: l(
        'LA/LL 接反：I 与 II 互换、aVL 与 aVF 互换、III 倒置、**aVR 正常**——没有一个倒置的 I 导联来提醒你。隐秘线索：I 导联的 P 波**大于** II 导联（正常窦性 P 在 II 最高）。当 I 和 II 长得像双胞胎时，想想交换。',
        'LA/LL reversal: I and II have swapped, aVL and aVF have swapped, III is inverted and **aVR is normal** — there is no inverted lead I to warn you. The subtle clue: the P wave in lead I is **larger** than in lead II (a normal sinus P is tallest in II). When I and II look like twins, think of a swap.',
        'Inversión AI/PI: I y II se han intercambiado, aVL y aVF también, III está invertida y **aVR es normal**: no hay una derivación I invertida que te avise. La pista sutil: la onda P de la derivación I es **mayor** que la de la II (la P sinusal normal es más alta en II). Cuando I y II parecen gemelas, piensa en un intercambio.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('neutral-cable-reversal', 1566),
      view: { layout: '3x4+1', highlightLeads: ['III'] },
      marks: [{ auto: 'qrs', lead: 'III' }],
      caption: l(
        '左上肢与右腿（中性）电极反接：III 导联几乎成一条直线。凡是**一个**肢体导联变得近乎平坦，都要怀疑中性（右腿）电极。不要忽略它，也不要过度解读——重录一份。',
        'Left-arm / right-leg (neutral) reversal: lead III collapses to almost a flat line. Whenever **one** limb lead becomes nearly flat, suspect the neutral (right-leg) electrode. Do not ignore it, and do not over-read it — re-record.',
        'Inversión del electrodo de brazo izquierdo y pierna derecha (neutro): la derivación III se queda casi en línea plana. Siempre que **una** derivación periférica se vuelva casi plana, sospecha del electrodo neutro (pierna derecha). No la ignores ni la sobreinterpretes: repite el ECG.',
      ),
    },
    {
      kind: 'text',
      title: l('胸导联：错位而不是病', 'The chest leads: misplacement, not disease', 'Las precordiales: mala colocación, no enfermedad'),
      body: l(
        '胸导联的错误不是接反，而是**放错位置**：\n- 交换胸导联电缆会打断平滑的 R 波递增与 T 波演变——典型表现是**一个导联的孤立跳变**；\n- **V1–V2 放得过高**（第 2 肋间）：rSr′ 貌似不完全右束支阻滞，V1–V2 的 P 波倒置、递增不良，甚至 Brugada 样 ST——先摸肋骨再下诊断（注意：第 2–3 肋间的高 V1–V2 也是 Brugada 筛查的正规做法，别把故意的高位当成失误）；\n- V1–V2 放得过低可能掩盖真实图形；\n- 运动心电图把肢体电极放在躯干（Mason–Likar）：电轴与电压都会变，必须写在记录上；\n- **系列对比前先确认电极位置一致**——位置不同会凭空造出“新变化”。',
        'Chest-lead errors are not reversals but **wrong positions**:\n- Swapped chest cables break the smooth R-wave progression and T-wave evolution — classically an **isolated jump in one lead**;\n- **V1–V2 placed too high** (2nd intercostal space): an rSr′ mimicking incomplete RBBB, negative P waves in V1–V2, poor progression, even a Brugada-like ST — palpate the ribs before diagnosing (note: V1–V2 in the 2nd–3rd space is also the deliberate way to screen for Brugada; do not mistake intent for error);\n- V1–V2 placed too low can hide a true pattern;\n- Exercise ECGs put the limb electrodes on the torso (Mason–Likar): axis and voltages change, and this must be written on the tracing;\n- **Before any serial comparison, confirm identical electrode positions** — different positions manufacture "new changes".',
        'Los errores de las precordiales no son inversiones sino **posiciones equivocadas**:\n- Cables precordiales intercambiados rompen la progresión suave de la R y la evolución de la T: lo típico es un **salto aislado en una derivación**;\n- **V1-V2 colocadas demasiado altas** (2.º espacio intercostal): una rSr′ que simula un bloqueo de rama derecha incompleto, P negativa en V1-V2, mala progresión e incluso un ST tipo Brugada: palpa las costillas antes de diagnosticar (ojo: V1-V2 en el 2.º-3.º espacio es también la forma deliberada de cribar el síndrome de Brugada; no confundas la intención con el error);\n- V1-V2 demasiado bajas pueden ocultar un patrón real;\n- El ECG de esfuerzo coloca los electrodos de los miembros en el tronco (Mason-Likar): el eje y los voltajes cambian, y hay que anotarlo en el trazado;\n- **Antes de comparar series, confirma que la colocación de los electrodos es idéntica**: posiciones distintas fabrican «cambios nuevos».',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('precordial-misplacement', 1567),
      view: { layout: '3x4+1', highlightLeads: ['V2', 'V3', 'V4'] },
      marks: [{ auto: 'r', lead: 'V2' }, { auto: 'r', lead: 'V3' }],
      caption: l(
        'V2/V3 电缆互换：R 波在 V2 意外变高、在 V3 塌下去、到 V4 又回来。递增应当**平滑单调**——哪里断开、哪里跳变，先查电极。',
        'V2/V3 cables swapped: the R wave is unexpectedly tall in V2, collapses in V3 and returns by V4. Progression should be **smooth and monotonic** — wherever it breaks or jumps, check the electrodes first.',
        'Cables de V2/V3 intercambiados: la R es inesperadamente alta en V2, se hunde en V3 y vuelve en V4. La progresión debe ser **suave y monótona**: donde se rompa o salte, comprueba primero los electrodos.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('precordial-misplacement-high', 1568),
      view: { layout: '3x4+1', highlightLeads: ['V1', 'V2'] },
      marks: [{ auto: 'p', lead: 'V1' }],
      caption: l(
        'V1–V2 放在第 2 肋间：V1 的 **P 波倒置**、V2 的 R 变小、递增不良。教科书还会加上 rSr′ 与 Brugada 样 ST——许多“Brugada 惊魂”正是从这里开始。回到第 4 肋间（胸骨角往下数两根肋骨）再录一份。',
        'V1–V2 in the 2nd intercostal space: a **negative P wave** in V1, a smaller R in V2 and poor progression. The textbook adds an rSr′ and a Brugada-like ST — many a "Brugada scare" starts exactly here. Return to the 4th space (two ribs below the sternal angle) and record again.',
        'V1-V2 en el 2.º espacio intercostal: **P negativa** en V1, R más pequeña en V2 y mala progresión. El libro añade una rSr′ y un ST tipo Brugada: muchos «sustos de Brugada» empiezan justo aquí. Vuelve al 4.º espacio (dos costillas por debajo del ángulo esternal) y repite el ECG.',
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
        'PTB-XL 没有标注电极反接的记录，所以这里练的是反面：一份 I 导联 QRS 以负向为主的真实心电图。是电缆反接吗？查 P 波：上肢反接时 I 导联的 P、QRS、T **一起**倒置，aVR 的 P 变为直立；这里 II 导联 P 直立、aVR 的 P 倒置——电缆没接错，I 导联负向的 QRS 来自心脏本身的右偏电轴。先写下你的结论，再揭晓标签。',
        'PTB-XL has no record labelled as an electrode reversal, so practise the opposite case: a real ECG whose QRS in lead I is mostly negative. Is it a cable reversal? Check the P wave: with the arm cables swapped, P, QRS and T in lead I invert **together** and the P in aVR turns upright; here the P is upright in II and inverted in aVR — the cables are right, and the negative QRS in lead I is the heart’s own rightward axis. Write your conclusion first, then reveal the label.',
        'PTB-XL no contiene registros etiquetados como inversión de electrodos, así que practica el caso contrario: un ECG real con el QRS de la derivación I predominantemente negativo. ¿Es una inversión de cables? Mira la onda P: con los cables de los brazos invertidos, la P, el QRS y la T de I se invierten **juntos** y la P de aVR se vuelve positiva; aquí la P es positiva en II y negativa en aVR: los cables están bien y el QRS negativo en I es el eje derecho del propio corazón. Escribe tu conclusión y después mira la etiqueta.',
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
        l('肢体接反不碰胸前导联：LA/RA = I 导联全倒置、II↔III、aVR↔aVL、aVF 不变，V1–V6 正常。', 'Limb reversals spare the chest leads: LA/RA = lead I fully inverted, II↔III, aVR↔aVL, aVF unchanged, V1–V6 normal.', 'Las inversiones de miembros no tocan las precordiales: AI/AD = derivación I invertida por completo, II↔III, aVR↔aVL, aVF sin cambios y V1-V6 normales.'),
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
