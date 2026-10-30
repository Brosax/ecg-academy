/**
 * f6 — Step 1: check the signal quality (stage F, docs/PLAN.md §3).
 * Criteria: docs/curriculum/criteria.md `arm-cable-reversal`, other limb cable reversals, finding the faulty electrode,
 * technical artefacts mimicking arrhythmia, baseline wander, mains interference, computer interpretation
 * ("missing in the book" rows), outdated "six-step method" replaced by a structured read that starts with technical
 * quality (critic.json).
 * Reversals are the `normal` heart recorded through a wrong hook-up (one-source rule). Artefacts come from the technical
 * scenarios of the synth catalogue (noise on one named electrode, so the localisation rule can be read on the tracing):
 * `muscle-tremor` (EMG on the left arm) and `muscle-tremor-parkinsonian` (5-Hz tremor on the left leg, pseudo-flutter).
 */
import type { Lesson } from '../api';
import { l } from '../../core/l10n';
import { choiceItem, leadItem, OPT, PLACEMENT, SRC, syn } from './f-shared';

const lesson: Lesson = {
  id: 'f6',
  stage: 'F',
  order: 6,
  title: l('第一步：检查信号质量', 'Step 1: check the signal quality', 'Paso 1: comprobar la calidad de la señal'),
  summary: l(
    '判读之前先花 30 秒检查记录本身：定标、导联齐全、基线干净、电极位置合理。不合格就重做，而不是去解释它。',
    'Before you read, spend 30 seconds on the recording itself: calibration, all leads present, a clean baseline, plausible electrode placement. If it fails, repeat it rather than interpret it.',
    'Antes de leer, dedica 30 segundos al propio registro: calibración, todas las derivaciones, línea de base limpia y colocación plausible de los electrodos. Si falla, repítelo en lugar de interpretarlo.',
  ),
  objectives: [
    l(
      '在每次判读前按固定顺序完成技术检查。',
      'Run a fixed technical check before every read.',
      'Hacer una comprobación técnica fija antes de cada lectura.',
    ),
    l(
      '识别肢体导线反接的特征，并与右位心区分。',
      'Recognise the signatures of limb-cable reversals and tell them apart from dextrocardia.',
      'Reconocer los signos de las inversiones de los cables de los miembros y distinguirlos de la dextrocardia.',
    ),
    l(
      '根据伪差出现在哪些导联，找出有问题的电极。',
      'Find the faulty electrode from the leads that carry the artefact.',
      'Localizar el electrodo defectuoso según las derivaciones que muestran el artefacto.',
    ),
    l(
      '知道什么时候应重新记录，而不是解释一份有问题的心电图。',
      'Know when to repeat the recording instead of interpreting a flawed one.',
      'Saber cuándo repetir el registro en lugar de interpretar uno defectuoso.',
    ),
  ],
  minutes: 12,
  competencies: ['C12', 'C1'],
  findings: ['electrode-reversal-la-ra', 'electrode-reversal-la-ll', 'electrode-reversal-ra-ll', 'precordial-misplacement', 'muscle-tremor'],
  blocks: [
    {
      kind: 'hook',
      ecg: syn('normal', 611, undefined, PLACEMENT.laRa),
      view: { layout: '3x4+1' },
      question: l(
        '35 岁健康男性，没有症状。先看 I 导联和 aVR。你会把这份心电图签为正常吗？',
        'A healthy 35-year-old man with no symptoms. Look at lead I and aVR first. Would you sign this ECG as normal?',
        'Varón sano de 35 años, sin síntomas. Mira primero la derivación I y aVR. ¿Firmarías este ECG como normal?',
      ),
      reveal: l(
        '还不能。I 导联完全倒置——P 波、QRS 波群和 T 波都向下——而 aVR 却是直立的。健康成人几乎不会出现这种情况。胸导联正常，R 波从 V1 到 V5 逐渐增高，所以不是右位心：是**左右上肢导线接反了**。纠正导线、重新记录，再开始判读。',
        'Not yet. Lead I is upside down — negative P, QRS and T — and aVR is upright. In a healthy adult that almost never comes from the heart. The chest leads are normal, with R growing from V1 to V5, so this is not dextrocardia: **the left- and right-arm cables are reversed**. Correct them and record again before you read anything else.',
        'Todavía no. La derivación I está invertida (P, QRS y T negativas) y aVR es positiva. En un adulto sano eso casi nunca viene del corazón. Las precordiales son normales, con la R creciendo de V1 a V5, así que no es una dextrocardia: **están invertidos los cables de los brazos**. Corrígelos y repite el registro antes de leer nada más.',
      ),
    },
    {
      kind: 'text',
      title: l('判读前的 30 秒检查', 'The 30-second check before you read', 'La comprobación de 30 segundos antes de leer'),
      body: l(
        '- **定标与走纸速度**：10 mm 脉冲、25 mm/s（否则注明）。\n- **导联齐全**：没有直线，没有缺失的导联。\n- **基线干净**：没有掩盖 P 波或 ST 段的漂移、颤动或交流电干扰。\n- **电极位置合理**：窦性心律时 P 波在 I、II 直立，在 aVR 倒置；R 波从 V1 到 V5 平稳增高。\n- **做决定**：可以判读，还是纠正后重做。机器的自动诊断最后再看——它不能可靠地识别导线反接。',
        '- **Calibration and speed**: 10 mm pulse, 25 mm/s (or note the change).\n- **All leads present**: no flat line, no missing lead.\n- **Clean baseline**: no wander, tremor or mains hum hiding the P waves or the ST segment.\n- **Plausible placement**: in sinus rhythm P is upright in I and II and negative in aVR; R grows smoothly from V1 to V5.\n- **Decide**: read it, or fix and repeat. Read the computer statement last — it does not recognise lead reversals reliably.',
        '- **Calibración y velocidad**: pulso de 10 mm, 25 mm/s (o anota el cambio).\n- **Todas las derivaciones**: ninguna línea plana ni derivación ausente.\n- **Línea de base limpia**: sin oscilación, temblor ni interferencia de la red que oculten las ondas P o el ST.\n- **Colocación plausible**: en ritmo sinusal la P es positiva en I y II y negativa en aVR; la R crece de forma progresiva de V1 a V5.\n- **Decide**: interprétalo o corrige y repite. Lee el informe automático al final: no reconoce de forma fiable las inversiones de electrodos.',
      ),
    },
    {
      kind: 'worked',
      title: l('一步步检查这份心电图', 'The check, step by step, on this ECG', 'La comprobación, paso a paso, en este ECG'),
      ecg: syn('normal', 611, undefined, PLACEMENT.laRa),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('定标脉冲与走纸速度', 'Pulse and speed', 'Pulso y velocidad'),
          body: l('脉冲高 10 mm，走纸速度 25 mm/s：标准设置。继续。', 'The pulse is 10 mm and the speed 25 mm/s: standard. Go on.', 'El pulso mide 10 mm y la velocidad es 25 mm/s: estándar. Sigue.'),
        },
        {
          title: l('导联齐全、基线干净', 'All leads present, clean baseline', 'Todas las derivaciones, línea de base limpia'),
          body: l('12 个导联都有信号，没有直线，基线平稳。', 'All 12 leads carry a signal, none is flat, the baseline is steady.', 'Las 12 derivaciones tienen señal, ninguna es plana y la línea de base es estable.'),
        },
        {
          title: l('I 导联和 aVR', 'Lead I and aVR', 'La derivación I y aVR'),
          body: l(
            'I 导联的 P 波、QRS 波群和 T 波全部向下；aVR 的 P 波和 QRS 却向上。窦性 P 波在 I 导联倒置是一个危险信号。',
            'P, QRS and T are all negative in lead I; in aVR the P and the QRS are upright. A sinus P that is negative in lead I is a red flag.',
            'P, QRS y T son negativas en la derivación I; en aVR la P y el QRS son positivos. Una P sinusal negativa en I es una señal de alarma.',
          ),
          marks: [
            { auto: 'p', lead: 'I' },
            { auto: 'p', lead: 'aVR' },
          ],
          highlightLeads: ['I', 'aVR'],
        },
        {
          title: l('胸导联', 'The chest leads', 'Las precordiales'),
          body: l(
            'R 波从 V1 到 V5 正常增高：心脏在左侧。右位心时恰好相反——R 波向 V6 逐渐变小。',
            'R grows normally from V1 to V5: the heart is on the left. Dextrocardia would show the opposite — R shrinking toward V6.',
            'La R crece con normalidad de V1 a V5: el corazón está a la izquierda. En la dextrocardia ocurriría lo contrario: la R disminuiría hacia V6.',
          ),
          marks: [
            { auto: 'r', lead: 'V1' },
            { auto: 'r', lead: 'V5' },
          ],
          highlightLeads: ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
        },
        {
          title: l('结论', 'Decision', 'Decisión'),
          body: l(
            '左右上肢导线反接。不要报告电轴或“侧壁”改变：纠正导线，重新记录。',
            'Left/right arm cable reversal. Do not report an axis or “lateral” changes: correct the cables and record again.',
            'Inversión de los cables de los brazos. No informes el eje ni cambios «laterales»: corrige los cables y repite el registro.',
          ),
        },
      ],
    },
    {
      kind: 'criteria',
      title: l('肢体导线反接的特征', 'Limb-cable reversal signatures', 'Signos de inversión de los cables de los miembros'),
      items: [
        {
          label: l('LA ↔ RA', 'LA ↔ RA', 'LA ↔ RA'),
          value: l(
            'I 完全倒置（P、QRS、T）；aVR ↔ aVL；II ↔ III；aVF 和 V1–V6 不变',
            'I fully inverted (P, QRS, T); aVR ↔ aVL; II ↔ III; aVF and V1–V6 unchanged',
            'I invertida por completo (P, QRS, T); aVR ↔ aVL; II ↔ III; aVF y V1-V6 sin cambios',
          ),
        },
        {
          label: l('LA ↔ LL', 'LA ↔ LL', 'LA ↔ LL'),
          value: l(
            'I ↔ II；aVL ↔ aVF；III 倒置；aVR 不变——常常看起来正常（线索：I 的 P 波比 II 大）',
            'I ↔ II; aVL ↔ aVF; III inverted; aVR unchanged — often looks normal (clue: P larger in I than in II)',
            'I ↔ II; aVL ↔ aVF; III invertida; aVR sin cambios; a menudo parece normal (pista: P mayor en I que en II)',
          ),
        },
        {
          label: l('RA ↔ LL', 'RA ↔ LL', 'RA ↔ LL'),
          value: l(
            'II 倒置；aVR ↔ aVF；aVL 不变；像下壁 Q 波或异位心房节律',
            'II inverted; aVR ↔ aVF; aVL unchanged; mimics inferior Q waves or an ectopic atrial rhythm',
            'II invertida; aVR ↔ aVF; aVL sin cambios; imita ondas Q inferiores o un ritmo auricular ectópico',
          ),
        },
        {
          label: l('RA ↔ RL（中性线）', 'RA ↔ RL (neutral)', 'RA ↔ RL (neutro)'),
          value: l('II 几乎是一条直线', 'II is almost a flat line', 'II es casi una línea plana'),
        },
        {
          label: l('LA ↔ RL（中性线）', 'LA ↔ RL (neutral)', 'LA ↔ RL (neutro)'),
          value: l('III 几乎是一条直线', 'III is almost a flat line', 'III es casi una línea plana'),
        },
        {
          label: l('RA、LA、LL 之间互换', 'Swaps among RA, LA and LL', 'Intercambios entre RA, LA y LL'),
          value: l(
            'V1–V6 不变：Wilson 中心电端是三者的平均值，交换顺序不影响它',
            'V1–V6 unchanged: Wilson’s central terminal is the average of all three, whatever the order',
            'V1-V6 sin cambios: el terminal central de Wilson es la media de los tres, en cualquier orden',
          ),
        },
      ],
      source:
        'Batchvarov VN, Malik M, Camm AJ. Europace 2007;9:1081-1090; Harrigan RA, Chan TC, Brady WJ. J Emerg Med 2012;43:1038-1044; Kligfield 2007 AHA/ACCF/HRS Part I',
    },
    {
      kind: 'contrast',
      title: l('哪个导联变成了直线？', 'Which lead went flat?', '¿Qué derivación quedó plana?'),
      view: { layout: '3x4+1' },
      left: {
        ecg: syn('normal', 612, undefined, PLACEMENT.raRl),
        caption: l('记录 A', 'Recording A', 'Registro A'),
        marks: [{ kind: 'lead', lead: 'II', color: 'err' }],
      },
      right: {
        ecg: syn('normal', 612, undefined, PLACEMENT.laRl),
        caption: l('记录 B', 'Recording B', 'Registro B'),
        marks: [{ kind: 'lead', lead: 'III', color: 'err' }],
      },
      point: l(
        'A 中 II 导联平直，B 中 III 导联平直。两下肢的电位相同，所以一个导联的两个电极如果都落在下肢上，几乎记录不到任何东西。右上肢导线夹到右下肢（RA ↔ RL）时 II 变平；左上肢导线夹到右下肢（LA ↔ RL）时 III 变平。哪个导联变平，就告诉你该纠正哪根导线。',
        'A: lead II is flat. B: lead III is flat. Both legs carry the same potential, so a lead whose two electrodes both end up on the legs records almost nothing. II goes flat when the right-arm cable is on a leg (RA ↔ RL); III goes flat when the left-arm cable is (LA ↔ RL). The flat lead names the cable to fix.',
        'A: II está plana. B: III está plana. Las dos piernas tienen el mismo potencial, así que una derivación cuyos dos electrodos acaban en las piernas casi no registra nada. II se aplana cuando el cable del brazo derecho está en una pierna (RA ↔ RL); III, cuando lo está el del brazo izquierdo (LA ↔ RL). La derivación plana indica qué cable corregir.',
      ),
    },
    {
      kind: 'criteria',
      title: l('伪差来自哪个电极？', 'Which electrode is noisy?', '¿Qué electrodo tiene ruido?'),
      items: [
        {
          label: l('I 和 II 有伪差，III 没有', 'Artefact in I and II, not in III', 'Artefacto en I y II, no en III'),
          value: l('右上肢电极（aVR 中最明显）', 'right-arm electrode (largest in aVR)', 'electrodo del brazo derecho (máximo en aVR)'),
        },
        {
          label: l('I 和 III 有伪差，II 没有', 'Artefact in I and III, not in II', 'Artefacto en I y III, no en II'),
          value: l('左上肢电极（aVL 中最明显）', 'left-arm electrode (largest in aVL)', 'electrodo del brazo izquierdo (máximo en aVL)'),
        },
        {
          label: l('II 和 III 有伪差，I 没有', 'Artefact in II and III, not in I', 'Artefacto en II y III, no en I'),
          value: l('左下肢电极（aVF 中最明显）', 'left-leg electrode (largest in aVF)', 'electrodo de la pierna izquierda (máximo en aVF)'),
        },
        {
          label: l('规则的细小振荡', 'Fine, regular oscillation', 'Oscilación fina y regular'),
          value: l(
            '交流电干扰：50 Hz（西班牙、欧洲、中国）或 60 Hz（美国）；检查接触和导线',
            'mains interference: 50 Hz (Spain, Europe, China) or 60 Hz (USA); check contact and cables',
            'interferencia de la red: 50 Hz (España, Europa, China) o 60 Hz (EE. UU.); revisa el contacto y los cables',
          ),
        },
        {
          label: l('4–6 Hz 节律性振荡', 'Rhythmic 4–6 Hz oscillation', 'Oscilación rítmica de 4-6 Hz'),
          value: l(
            '震颤：可类似心房扑动或颤动；真正的 QRS 波群按原有 RR 间期“穿行”其中',
            'tremor: can mimic flutter or fibrillation; the real QRS complexes keep marching through at the underlying RR',
            'temblor: puede imitar un flúter o una fibrilación; los QRS reales siguen apareciendo a su RR de base',
          ),
        },
        {
          label: l('随呼吸缓慢起伏', 'Slow drift with breathing', 'Deriva lenta con la respiración'),
          value: l('基线漂移：可造成或掩盖 ST 段偏移', 'baseline wander: can create or hide ST deviation', 'oscilación de la línea de base: puede crear u ocultar desviaciones del ST'),
        },
      ],
      source:
        'Aslanger E, Yalin K. J Electrocardiol 2012;45:15-17; Knight BP et al. N Engl J Med 1999;341:1270-1274; Baranchuk A et al. Crit Care Nurse 2009;29:67-73; Kligfield 2007 AHA/ACCF/HRS Part I',
    },
    {
      kind: 'figure',
      figure: { id: 'electrodes', params: { highlight: ['RA', 'LA', 'LL', 'RL'] } },
      caption: l(
        '点击一个肢体电极，看哪些导联用到它。被两个双极导联共用的电极会把噪声带进这两个导联——据此就能找到它。',
        'Click a limb electrode to see which leads use it. An electrode shared by two bipolar leads spreads its noise into both of them — that is how you find it.',
        'Haz clic en un electrodo de los miembros para ver qué derivaciones lo usan. Un electrodo compartido por dos derivaciones bipolares lleva su ruido a ambas: así se localiza.',
      ),
    },
    {
      kind: 'text',
      title: l('像疾病一样的伪差', 'Artefacts that look like disease', 'Artefactos que parecen enfermedad'),
      body: l(
        '- 震颤、寒战或敲击可以模仿心房扑动、心房颤动，甚至室性心动过速。线索：正常的 QRS 波群按患者自身的 RR 间期继续出现，而这种“心律失常”至少在一个导联中看不到。\n- 基线漂移可以制造或掩盖 ST 段偏移：只在基线平稳处判断 ST 段。\n- 看患者本人：一位平静、状态良好的患者出现“心律失常”，在被证实之前先当作伪差。\n下面是一个例子；更多伪差图形在第 o10 课。',
        '- Tremor, shivering or tapping can imitate atrial flutter, fibrillation or even VT. The clue: normal QRS complexes keep marching through at the patient’s own RR, and the “arrhythmia” is absent in at least one lead.\n- Baseline wander can create or hide ST deviation: judge the ST segment only where the baseline is steady.\n- Look at the patient: an “arrhythmia” in a calm, well patient is an artefact until proven otherwise.\nOne example follows; more artefact tracings come in lesson o10.',
        '- El temblor, los escalofríos o los golpecitos pueden imitar un flúter, una fibrilación auricular o incluso una TV. La pista: los QRS normales siguen apareciendo al RR propio del paciente y la «arritmia» falta al menos en una derivación.\n- La oscilación de la línea de base puede crear u ocultar desviaciones del ST: valora el ST solo donde la línea de base esté estable.\n- Mira al paciente: una «arritmia» en un paciente tranquilo y que está bien es un artefacto mientras no se demuestre lo contrario.\nA continuación tienes un ejemplo; en la lección o10 hay más trazados con artefactos.',
      ),
    },
    {
      kind: 'contrast',
      title: l('心房扑动还是震颤？', 'Flutter or tremor?', '¿Flúter o temblor?'),
      view: { layout: '3x4+1', highlightLeads: ['I', 'II', 'III', 'aVF'] },
      left: {
        ecg: syn('atrial-flutter', 616, { conductionRatio: 4 }),
        caption: l('A：69 岁男性', 'A: man, 69', 'A: varón de 69 años'),
      },
      right: {
        ecg: syn('muscle-tremor-parkinsonian', 617),
        caption: l('B：74 岁男性', 'B: man, 74', 'B: varón de 74 años'),
        marks: [{ auto: 'p', lead: 'I' }],
      },
      point: l(
        '两者在 II、III、aVF 都有每秒约 5 次（300 次/分）的规则锯齿波。A：真正的心房扑动——所有看得到心房的导联（包括 I 和 V1）都有扑动波，没有正常 P 波，QRS 以固定的 4:1 下传。B：I 导联干净，每个 QRS 前都有正常的 P 波，QRS 按患者自身的窦性节律出现；振荡只出现在用到左下肢电极的导联（II、III、aVF；aVR 和 aVL 中为一半大小，胸导联经 Wilson 中心电端带上三分之一）——左腿 5 Hz 的静止性震颤（帕金森病）。伪差会放过不用那个电极的导联，心脏不会。',
        'Both show a regular saw-tooth of about 5 per second (300/min) in II, III and aVF. A: true atrial flutter — the flutter waves run through every lead that sees the atria, I and V1 included, there is no normal P wave, and the QRS follow at a fixed 4:1. B: lead I is clean, with a normal P wave before every QRS, and the QRS come at the patient’s own sinus rate; the oscillation is confined to the leads that use the left-leg electrode (II, III, aVF; half size in aVR and aVL, and a third of it in the chest leads through Wilson’s terminal) — a 5-Hz rest tremor of the left leg, as in Parkinson’s disease. An artefact spares the lead that does not use the faulty electrode; the heart does not.',
        'Ambos muestran unos dientes de sierra regulares de unos 5 por segundo (300 lpm) en II, III y aVF. A: un flúter auricular verdadero: las ondas de flúter recorren todas las derivaciones que ven las aurículas, también I y V1, no hay ninguna onda P normal y los QRS siguen con una conducción fija 4:1. B: la derivación I está limpia, con una P normal antes de cada QRS, y los QRS llegan al ritmo sinusal propio del paciente; la oscilación se limita a las derivaciones que usan el electrodo de la pierna izquierda (II, III, aVF; la mitad en aVR y aVL, y un tercio en las precordiales a través del terminal de Wilson): un temblor de reposo de 5 Hz de la pierna izquierda, como en la enfermedad de Parkinson. El artefacto respeta la derivación que no usa el electrodo afectado; el corazón no.',
      ),
    },
    {
      kind: 'check',
      item: {
        inline: leadItem({
          family: 'artefacts',
          competency: 'C12',
          seed: 61001,
          ecg: syn('normal', 613, undefined, PLACEMENT.laRl),
          view: { layout: '3x4+1' },
          leads: ['III'],
          prompt: l(
            '这份记录有一个导联几乎没有信号。点击它，再想一想该纠正哪根导线。',
            'One lead of this recording carries almost no signal. Click it, then think which cable needs fixing.',
            'Una derivación de este registro casi no tiene señal. Haz clic en ella y piensa qué cable hay que corregir.',
          ),
          explanation: l(
            'III 导联（LL − LA）是平的：左上肢导线夹在了右下肢上，而两下肢电位相同。把左上肢导线和中性（RL）导线换回原位，重新记录。',
            'Lead III (LL − LA) is flat: the left-arm cable sits on the right leg, and both legs share the same potential. Swap the left-arm and neutral (RL) cables back and record again.',
            'La derivación III (LL − LA) es plana: el cable del brazo izquierdo está en la pierna derecha y ambas piernas tienen el mismo potencial. Devuelve a su sitio el cable del brazo izquierdo y el neutro (RL) y repite el registro.',
          ),
        }),
      },
    },
    {
      kind: 'check',
      item: {
        inline: choiceItem({
          family: 'artefacts',
          competency: 'C12',
          seed: 61002,
          ecg: syn('normal', 614, undefined, PLACEMENT.raLl),
          view: { layout: '3x4+1' },
          findings: ['electrode-reversal-ra-ll'],
          prompt: l(
            '一位无症状的年轻人。看 II 导联和 aVR，再看 aVL 和胸导联。最可能的解释是什么？',
            'A young adult without symptoms. Look at lead II and aVR, then at aVL and the chest leads. What is the most likely explanation?',
            'Un adulto joven sin síntomas. Mira la derivación II y aVR, y después aVL y las precordiales. ¿Cuál es la explicación más probable?',
          ),
          options: [
            { id: 'ra-ll', label: OPT.raLl },
            { id: 'la-ra', label: OPT.laRa },
            { id: 'inferior', label: l('陈旧性下壁梗死', 'Old inferior infarction', 'Infarto inferior antiguo') },
            { id: 'normal', label: OPT.normal },
          ],
          correct: 'ra-ll',
          explanation: l(
            'II 导联完全倒置（P、QRS、T），aVR 看起来像正常的 aVF，而 aVL 和 V1–V6 正常：右上肢与左下肢导线接反了。无症状者下壁导联出现倒置 P 波而其余正常时，先检查导线，再考虑异位心律或下壁 Q 波。',
            'Lead II is fully inverted (P, QRS and T) and aVR looks like a normal aVF, while aVL and V1–V6 are normal: the right-arm and left-leg cables are reversed. Inverted P waves in the inferior leads of a well person with an otherwise normal ECG mean: check the cables before calling an ectopic rhythm or inferior Q waves.',
            'La derivación II está invertida por completo (P, QRS y T) y aVR parece una aVF normal, mientras que aVL y V1-V6 son normales: están invertidos los cables del brazo derecho y de la pierna izquierda. Ondas P negativas en las derivaciones inferiores de una persona sana con un ECG por lo demás normal: revisa los cables antes de hablar de ritmo ectópico o de ondas Q inferiores.',
          ),
        }),
      },
    },
    {
      kind: 'check',
      item: {
        inline: choiceItem({
          family: 'artefacts',
          competency: 'C12',
          seed: 61003,
          ecg: syn('normal', 615, undefined, PLACEMENT.laLl),
          view: { layout: '3x4+1' },
          findings: ['electrode-reversal-la-ll'],
          prompt: l(
            '这份图乍看没有什么问题。比较 I 和 II 的 P 波，再看 III 导联。最可能的是？',
            'Nothing looks dramatic here. Compare the P waves in I and II, then look at lead III. What is most likely?',
            'Aquí nada parece llamativo. Compara las ondas P de I y II y mira después la derivación III. ¿Qué es lo más probable?',
          ),
          hint: l('窦性心律时，P 波通常在 II 导联比 I 导联大。', 'In sinus rhythm the P wave is normally larger in II than in I.', 'En ritmo sinusal la onda P suele ser mayor en II que en I.'),
          options: [
            { id: 'normal', label: OPT.normal },
            { id: 'la-ll', label: OPT.laLl },
            { id: 'la-ra', label: OPT.laRa },
            { id: 'ra-ll', label: OPT.raLl },
          ],
          correct: 'la-ll',
          explanation: l(
            'P 波在 I 导联比 II 导联大，III 导联的 P 波以负向为主：左上肢与左下肢导线接反了（I ↔ II，aVL ↔ aVF，III 倒置，aVR 不变）。这种反接很容易漏掉，因为图形看起来仍然合理——检查 P 波就能发现它。',
            'P is larger in I than in II, and the P wave in III is mainly negative: the left-arm and left-leg cables are reversed (I ↔ II, aVL ↔ aVF, III inverted, aVR unchanged). This reversal is easy to miss because the tracing still looks plausible — the P-wave check catches it.',
            'La P es mayor en I que en II y la P de III es sobre todo negativa: están invertidos los cables del brazo izquierdo y de la pierna izquierda (I ↔ II, aVL ↔ aVF, III invertida, aVR sin cambios). Esta inversión pasa fácilmente desapercibida porque el trazado sigue pareciendo verosímil; la comprobación de la onda P la detecta.',
          ),
        }),
      },
    },
    {
      kind: 'check',
      item: {
        inline: leadItem({
          family: 'artefacts',
          competency: 'C12',
          seed: 61004,
          ecg: syn('muscle-tremor', 618),
          view: { layout: '3x4+1' },
          findings: ['muscle-tremor'],
          leads: ['II'],
          prompt: l(
            '一些导联被细小、不规则的噪声覆盖。点击唯一干净的肢体导联，再说出该处理哪个电极。',
            'Fine, irregular noise covers some of the leads. Click the one limb lead that is clean, then name the electrode to fix.',
            'Un ruido fino e irregular cubre algunas derivaciones. Haz clic en la única derivación de los miembros que está limpia y di qué electrodo hay que corregir.',
          ),
          explanation: l(
            'II 导联（LL − RA）是唯一不用左上肢电极的肢体导联，所以它是干净的。共用左上肢电极的两个双极导联 I 和 III 带着噪声，aVL 中最明显；aVF 和胸导联通过平均电位也带上了一部分。这是左臂的肌电干扰：让手臂放松，重新处理皮肤、贴好左上肢电极，再记录。',
            'Lead II (LL − RA) is the only limb lead that does not use the left-arm electrode, so it is clean. I and III, the two bipolar leads that share the left-arm electrode, carry the noise, and it is largest in aVL; aVF and the chest leads pick up part of it through the averaged references. This is muscle (EMG) noise from the left arm: relax the arm, prepare the skin, re-attach the left-arm electrode and record again.',
            'La derivación II (LL − RA) es la única de los miembros que no usa el electrodo del brazo izquierdo, por eso está limpia. I y III, las dos derivaciones bipolares que comparten el electrodo del brazo izquierdo, llevan el ruido, que es máximo en aVL; aVF y las precordiales recogen una parte a través de las referencias promediadas. Es ruido muscular (electromiográfico) del brazo izquierdo: relaja el brazo, prepara la piel, vuelve a colocar el electrodo del brazo izquierdo y repite el registro.',
          ),
        }),
      },
    },
    { kind: 'drill', families: ['artefacts', 'compare-technical', 'paper'], count: 6, passScore: 0.8 },
    {
      kind: 'real',
      ids: [1101, 21589],
      caption: l(
        '判读前，先对这两份真实记录做 30 秒检查。两份都应通过：没有导线反接，没有平直导联，基线干净。通过检查是最常见的结果——不要“发明”问题。',
        'Run the 30-second check on these two real recordings before reading them. Both should pass: no reversal, no flat lead, a clean baseline. Passing is the usual result — do not invent problems.',
        'Haz la comprobación de 30 segundos en estos dos registros reales antes de leerlos. Ambos deberían superarla: sin inversiones, sin derivaciones planas, con línea de base limpia. Superarla es lo habitual: no inventes problemas.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '相信机器的诊断：简单的上肢导线反接，机器可能打印出“电轴右偏”或“侧壁梗死”。',
          'Trusting the machine statement: a simple arm-cable reversal may be printed as “right axis deviation” or “lateral infarction”.',
          'Fiarse del informe automático: una simple inversión de los cables de los brazos puede aparecer como «desviación del eje a la derecha» o «infarto lateral».',
        ),
        l(
          '只是上肢导线接反，却诊断为右位心：看 V1–V6。',
          'Calling dextrocardia when only the arm cables are reversed: look at V1–V6.',
          'Diagnosticar dextrocardia cuando solo están invertidos los cables de los brazos: mira V1-V6.',
        ),
        l(
          '透过基线漂移或监护滤波判断 ST 段改变。',
          'Judging ST changes through baseline wander or a monitor filter.',
          'Valorar cambios del ST a través de una oscilación de la línea de base o de un filtro de monitorización.',
        ),
        l(
          '把震颤伪差当作心房扑动、心房颤动或室性心动过速：找按原有节律“穿行”的 QRS 波群。',
          'Taking a tremor artefact for flutter, fibrillation or VT: look for the QRS complexes marching through.',
          'Tomar un artefacto por temblor por un flúter, una fibrilación o una TV: busca los QRS que siguen apareciendo a su ritmo.',
        ),
        l('用滤波来“修好”噪声，而不是改善电极接触。', 'Fixing noise with a filter instead of with better electrode contact.', 'Corregir el ruido con un filtro en lugar de mejorar el contacto de los electrodos.'),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '每次判读的第一步：脉冲、走纸速度、导联齐全、基线干净、电极位置合理。',
          'Step 1 of every read: pulse, speed, all leads, clean baseline, plausible placement.',
          'Paso 1 de toda lectura: pulso, velocidad, todas las derivaciones, línea de base limpia y colocación plausible.',
        ),
        l(
          'I 导联 P–QRS–T 全部倒置而胸导联正常 = 上肢导线接反。',
          'Negative P, QRS and T in lead I with normal chest leads = arm cables reversed.',
          'P, QRS y T negativas en I con precordiales normales = cables de los brazos invertidos.',
        ),
        l('某个肢体导联变成直线 = 中性线（RL）与一根上肢导线互换。', 'A flat limb lead = the neutral (RL) cable swapped with an arm cable.', 'Una derivación de los miembros plana = el cable neutro (RL) intercambiado con el de un brazo.'),
        l(
          '伪差出现在两个肢体导联而第三个没有 → 问题出在它们共用的电极。',
          'An artefact in two limb leads but not the third → their shared electrode is the culprit.',
          'Un artefacto en dos derivaciones de los miembros pero no en la tercera → el culpable es su electrodo común.',
        ),
        l('检查不通过就重新记录，然后再判读。', 'If the check fails, repeat the ECG before you interpret it.', 'Si la comprobación falla, repite el ECG antes de interpretarlo.'),
      ],
    },
  ],
  sources: [
    SRC.kligfield,
    'Batchvarov VN, Malik M, Camm AJ. Incorrect electrode cable connection during electrocardiographic recording. Europace 2007;9:1081-1090',
    'Harrigan RA, Chan TC, Brady WJ. Electrocardiographic electrode misplacement, misconnection, and artifact. J Emerg Med 2012;43:1038-1044',
    'Aslanger E, Yalin K. Electromechanical association: a subtle electrocardiogram artifact. J Electrocardiol 2012;45:15-17',
    'Knight BP et al. Clinical consequences of electrocardiographic artifact mimicking ventricular tachycardia. N Engl J Med 1999;341:1270-1274',
    'Baranchuk A et al. Electrocardiography pitfalls and artifacts: the 10 commandments. Crit Care Nurse 2009;29:67-73',
    'Schläpfer J, Wellens HJ. Computer-interpreted electrocardiograms: benefits and limitations. J Am Coll Cardiol 2017;70:1183-1192',
    SRC.book,
  ],
};

export default lesson;
