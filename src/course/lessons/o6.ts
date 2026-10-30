/**
 * O6 — Pulmonary embolism (docs/PLAN.md §3, stage O).
 * Criteria: docs/curriculum/criteria.md `pulmonary-embolism` row (current value) plus the "Acute RV pressure overload
 * (pulmonary embolism)" missing-book bullet under atrial-enlargement-ventricular-hypertrophy, and `rvh-criteria` for
 * the chronic contrast.
 */
import { l } from '../../core/l10n';
import type { EcgSource } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});
const STRIP = { layout: 'strip', lead: 'II' } as const;

const lesson: Lesson = {
  id: 'o6',
  stage: 'O',
  order: 6,
  title: l('肺栓塞', 'Pulmonary embolism', 'Tromboembolismo pulmonar'),
  summary: l(
    '肺栓塞的心电图既不能确诊也不能排除：窦性心动过速最常见，右心室负荷征象（V1–V4 T 波倒置、S1Q3T3、新发右束支传导阻滞、V1 呈 QR 型、电轴右偏、aVR/V1 ST 段抬高）提示病情更重；确诊靠临床评分、D-二聚体与 CT 肺动脉造影。',
    'The ECG neither rules pulmonary embolism in nor out: sinus tachycardia is the commonest finding, and RV-strain signs (T inversion in V1–V4, S1Q3T3, a new RBBB, QR in V1, right axis, ST elevation in aVR/V1) mark a more severe patient; confirmation comes from a clinical score, D-dimer and CT pulmonary angiography.',
    'El ECG ni confirma ni excluye el tromboembolismo pulmonar: la taquicardia sinusal es el hallazgo más frecuente y los signos de sobrecarga del VD (T invertida en V1–V4, S1Q3T3, BRD de novo, QR en V1, eje derecho y elevación del ST en aVR/V1) marcan un paciente más grave; la confirmación llega con la puntuación clínica, el dímero D y la angio-TC pulmonar.',
  ),
  objectives: [
    l(
      '列出急性肺栓塞的右心室负荷征象，并说出重症患者最常见的表现。',
      'List the RV-strain signs of acute PE and name the most frequent finding in severe PE.',
      'Enumerar los signos de sobrecarga del VD en el TEP agudo y nombrar el hallazgo más frecuente en el TEP grave.',
    ),
    l(
      '说明心电图在疑诊肺栓塞时能做什么、不能做什么（不能确诊也不能排除；主要用途是排除其他诊断和评估严重度）。',
      'State what the ECG can and cannot do in suspected PE (it neither rules in nor out; its main uses are excluding other diagnoses and grading severity).',
      'Explicar qué puede y qué no puede hacer el ECG ante la sospecha de TEP (ni confirma ni excluye; sus usos principales son descartar otros diagnósticos y valorar la gravedad).',
    ),
    l(
      '把急性右心室负荷与慢性右心室肥厚的心电图区分开。',
      'Separate the ECG of acute RV strain from that of chronic RVH.',
      'Distinguir el ECG de la sobrecarga aguda del VD del de la hipertrofia ventricular derecha crónica.',
    ),
    l(
      '说出确诊路径（Wells/Geneva 评分、D-二聚体、CTPA）以及心电图在其中的位置。',
      'Describe the confirming pathway (Wells/Geneva score, D-dimer, CTPA) and where the ECG sits in it.',
      'Describir el itinerario diagnóstico (Wells/Ginebra, dímero D, angio-TC) y el lugar del ECG en él.',
    ),
  ],
  minutes: 14,
  competencies: ['C10', 'C12'],
  findings: ['pulmonary-embolism', 'rvh', 'sinus-tachycardia'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('pulmonary-embolism', 1501, { rate: 106 }),
      view: STRIP,
      question: l(
        '女性，58 岁，突发呼吸困难并晕厥。这条 II 导联上，什么会改变你接下来十分钟的处理？',
        'A 58-year-old woman with sudden dyspnoea and syncope. On this lead-II strip, what would change your next ten minutes?',
        'Una mujer de 58 años con disnea súbita y síncope. En esta tira de la derivación II, ¿qué cambiaría tu actuación en los próximos diez minutos?',
      ),
      reveal: l(
        '**这条记录上没有任何表现能确诊肺栓塞**——窦性心动过速（这里约 106 次/分）是肺栓塞最常见的心电图异常，但它什么也证明不了。右心室负荷的征象（V1–V4 T 波倒置、S1Q3T3、新发右束支传导阻滞、V1 呈 QR 型、电轴右偏、aVR/V1 ST 段抬高）提高怀疑程度并标记严重度。心电图既不能确诊也不能排除肺栓塞——它的任务是排除其他诊断并评估严重度。',
        '**Nothing on this tracing confirms a pulmonary embolism** — sinus tachycardia (about 106/min here) is the commonest ECG abnormality in PE, and it proves nothing. Signs of RV strain (T inversion in V1–V4, S1Q3T3, a new right bundle-branch block, QR in V1, right axis, ST elevation in aVR/V1) raise suspicion and mark severity. The ECG can neither rule PE in nor out — its job is to exclude other diagnoses and to grade severity.',
        '**Nada en este trazado confirma una tromboembolia pulmonar**: la taquicardia sinusal (aquí unas 106 lpm) es la alteración electrocardiográfica más frecuente del TEP y no demuestra nada. Los signos de sobrecarga del VD (inversión de la T en V1–V4, S1Q3T3, bloqueo de rama derecha de novo, QR en V1, eje derecho y elevación del ST en aVR/V1) aumentan la sospecha y marcan la gravedad. El ECG ni confirma ni excluye el TEP: su tarea es descartar otros diagnósticos y valorar la gravedad.',
      ),
    },
    {
      kind: 'text',
      title: l('心电图能做什么、不能做什么', 'What the ECG can and cannot do', 'Lo que el ECG puede y no puede hacer'),
      body: l(
        '肺栓塞的心电图**既不敏感也不特异**：\n- **不能确诊**：没有任何一种表现能证明肺栓塞；\n- **不能排除**：大约 10–25 % 的肺栓塞心电图基本正常（因研究队列而异）；\n- 改变常为**一过性**，并随血流动力学状态波动。\n它真正的两个用途：**排除其他诊断**（STEMI、心包炎（o7）、原发性心律问题）和**评估严重度**——右心室负荷征象与更差的预后相连。确诊路径是 Wells/Geneva 评分 → D-二聚体 → CT 肺动脉造影（CTPA）：**心电图不是那项检查**。',
        'The ECG in PE is **insensitive and nonspecific**:\n- it cannot **rule in**: no single finding proves PE;\n- it cannot **rule out**: the tracing is essentially normal in roughly 10–25 % of cases (series-dependent);\n- the changes are often **transient** and shift with the haemodynamic state.\nIts two real uses: **excluding other diagnoses** (STEMI, pericarditis (o7), a primary rhythm problem) and **grading severity** — RV-strain signs are linked to worse outcomes. The confirming pathway is a Wells/Geneva score → D-dimer → CT pulmonary angiography (CTPA): **the ECG is not that test**.',
        'El ECG en el TEP es **poco sensible y poco específico**:\n- no puede **confirmarlo**: ningún hallazgo aislado demuestra un TEP;\n- no puede **excluirlo**: el trazado es prácticamente normal en torno al 10–25 % de los casos (según las series);\n- los cambios suelen ser **transitorios** y oscilan con el estado hemodinámico.\nSus dos usos reales: **descartar otros diagnósticos** (IAMCEST, pericarditis (o7), un problema primario del ritmo) y **valorar la gravedad**: los signos de sobrecarga del VD se asocian a peor pronóstico. El itinerario que confirma es Wells/Ginebra → dímero D → angio-TC pulmonar (CTPA): **el ECG no es esa prueba**.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('pulmonary-embolism', 1502, { rate: 104 }),
      emphasize: ['rv-outflow', 'rv-basal', 'rv-mid', 'rv-apical', 'lv-basal-inferoseptal'],
      caption: l(
        '急性右心室压力负荷：肺动脉突然被阻塞，右心室对抗高压泵血。室间隔被从右心室侧除极（III 导联出现 Q 波），负荷的右心室增加一个向右的晚期力（I 导联 S 波），右心室与室间隔的心外膜复极延长（III 与 V1–V3 T 波倒置），心脏顺钟向转位（电轴右偏）。',
        'Acute RV pressure overload: the pulmonary artery is suddenly obstructed and the right ventricle pumps against a high resistance. The septum is activated from the RV side (a Q wave appears in III), the loaded RV adds a late rightward force (an S wave in I), RV and septal epicardial repolarisation is prolonged (T inversion in III and V1–V3), and the heart rotates clockwise (a rightward axis).',
        'Sobrecarga aguda de presión del VD: la arteria pulmonar se obstruye de golpe y el ventrículo derecho bombea contra una resistencia alta. El septo se activa desde el lado del VD (aparece una Q en III), el VD sobrecargado añade una fuerza tardía hacia la derecha (una S en I), la repolarización epicárdica del VD y del septo se prolonga (T invertida en III y V1–V3) y el corazón rota en sentido horario (eje a la derecha).',
      ),
    },
    {
      kind: 'criteria',
      title: l('肺栓塞：右心室负荷清单', 'Pulmonary embolism: the RV-strain list', 'Tromboembolismo pulmonar: la lista de sobrecarga del VD'),
      items: [
        {
          label: l('最常见的异常', 'Commonest abnormality', 'Alteración más frecuente'),
          value: l('窦性心动过速；较轻病例可仅此一项', 'Sinus tachycardia; may be the only abnormality in milder cases', 'Taquicardia sinusal; puede ser la única alteración en los casos más leves'),
        },
        {
          label: l('正常心电图', 'A normal ECG', 'Un ECG normal'),
          value: l('约 10–25 % 的病例（因研究队列而异）', 'In roughly 10–25 % of cases (series-dependent)', 'En torno al 10–25 % de los casos (según las series)'),
        },
        {
          label: l('负荷：重症最常见的表现', 'Strain: most frequent in severe PE', 'Sobrecarga: lo más frecuente en el TEP grave'),
          value: l(
            'V1–V4 T 波倒置（±下壁导联）——重症肺栓塞最常见的表现',
            'T inversion in V1–V4 (± inferior leads) — the most frequent finding in severe PE',
            'Inversión de la T en V1–V4 (± derivaciones inferiores): el hallazgo más frecuente en el TEP grave',
          ),
        },
        {
          label: l('S1Q3T3', 'S1Q3T3', 'S1Q3T3'),
          value: l('I 导联 S 波 + III 导联 Q 波与 T 波倒置；仅见于少数患者', 'S in I + Q and inverted T in III; seen in a minority of patients', 'S en I + Q y T invertida en III; se ve en una minoría de pacientes'),
        },
        {
          label: l('传导与电轴', 'Conduction and axis', 'Conducción y eje'),
          value: l(
            '新发不完全性或完全性右束支传导阻滞；电轴右偏；V1 呈 QR 型；aVR/V1 ST 段抬高',
            'A new incomplete or complete RBBB; right axis shift; QR in V1; ST elevation in aVR/V1',
            'BRD incompleto o completo de novo; desviación derecha del eje; QR en V1; elevación del ST en aVR/V1',
          ),
        },
        {
          label: l('心律与病程', 'Rhythm and course', 'Ritmo y evolución'),
          value: l(
            '可出现心房颤动等房性心律失常；改变常为一过性；负荷征象提示预后更差',
            'Atrial arrhythmias such as AF can occur; changes are often transient; strain signs mark worse outcomes',
            'Pueden aparecer arritmias auriculares como FA; los cambios suelen ser transitorios; los signos de sobrecarga implican peor pronóstico',
          ),
        },
      ],
      source: 'Konstantinides SV et al. 2019 ESC Guidelines for acute pulmonary embolism. Eur Heart J 2020;41:543-603; Hancock EW et al. Circulation 2009;119:e251-e261 (Part V)',
    },
    {
      kind: 'worked',
      title: l('逐项收集负荷征象', 'Collecting the strain signs one by one', 'Reuniendo los signos de sobrecarga uno a uno'),
      ecg: synth('pulmonary-embolism', 1503, { rate: 102 }),
      steps: [
        {
          title: l('心率与节律', 'Rate and rhythm', 'Frecuencia y ritmo'),
          body: l(
            '约 102 次/分，每个 QRS 前都有清晰的 P 波：窦性心动过速——肺栓塞最常见的心电图异常，也是最不特异的一个。',
            'About 102/min with a clear P before every QRS: sinus tachycardia — the commonest ECG abnormality of PE and the least specific.',
            'Unas 102 lpm con una P nítida antes de cada QRS: taquicardia sinusal, la alteración más frecuente del TEP y la menos específica.',
          ),
          marks: [{ auto: 'rr' }],
        },
        {
          title: l('S1Q3T3 的前两笔', 'The first two strokes of S1Q3T3', 'Las dos primeras piezas del S1Q3T3'),
          body: l(
            'I 导联出现深 S 波、III 导联出现 Q 波——急性右心室负荷使室间隔从右侧除极，并增加一个向右的晚期力。aVL 呈镜像改变。',
            'A deep S appears in I and a Q in III — the acute RV load activates the septum from the right and adds a late rightward force. Note the mirror picture in aVL.',
            'Aparece una S profunda en I y una Q en III: la carga aguda del VD activa el septo desde la derecha y añade una fuerza tardía hacia la derecha. Fíjate en la imagen en espejo en aVL.',
          ),
          marks: [{ auto: 's', lead: 'I' }, { auto: 'q', lead: 'III' }],
          highlightLeads: ['I', 'III'],
        },
        {
          title: l('T 波倒置', 'The inverted T', 'La T invertida'),
          body: l(
            'III 与 V1–V3 的 T 波倒置——右心室与室间隔心外膜复极延长。V1–V4 T 波倒置（±下壁导联）是**重症肺栓塞最常见的表现**，也是最容易被误读为“前间壁 NSTEMI”的地方。',
            'The T inverts in III and V1–V3 — prolonged epicardial repolarisation of the RV and the septum. T inversion in V1–V4 (± inferior leads) is the **most frequent finding in severe PE**, and the easiest to misread as an "anteroseptal NSTEMI".',
            'La T se invierte en III y V1–V3: repolarización epicárdica prolongada del VD y del septo. La inversión de la T en V1–V4 (± inferiores) es **el hallazgo más frecuente en el TEP grave** y el más fácil de leer como un «NSTEMI anteroseptal».',
          ),
          marks: [{ auto: 't', lead: 'III' }, { auto: 't', lead: 'V1' }, { auto: 't', lead: 'V2' }],
          highlightLeads: ['III', 'V1', 'V2'],
        },
        {
          title: l('收集严重度', 'Collect the severity', 'Reúne la gravedad'),
          body: l(
            '再扫一遍：电轴是否右偏？V1 是否呈 QR 型？有没有新发的束支传导阻滞？aVR、V1 有没有 ST 段抬高？这些负荷征象把患者向“更重”的方向移动——它们不确诊肺栓塞，但参与危险分层。下一步不是再一份心电图，而是 Wells/Geneva → D-二聚体 → CTPA。',
            'Sweep once more: is the axis rightward? Is there a QR in V1, a new bundle-branch block, ST elevation in aVR or V1? These strain signs move the patient towards "more severe" — they do not confirm PE, but they feed the risk stratification. The next step is not another ECG: it is Wells/Geneva → D-dimer → CTPA.',
            'Repasa una vez más: ¿está el eje desviado a la derecha? ¿Hay un QR en V1, un bloqueo de rama de novo, elevación del ST en aVR o V1? Estos signos de sobrecarga desplazan al paciente hacia el lado «más grave»: no confirman el TEP, pero alimentan la estratificación de riesgo. El siguiente paso no es otro ECG, sino Wells/Ginebra → dímero D → angio-TC.',
          ),
          highlightLeads: ['aVR', 'V1'],
        },
      ],
    },
    {
      kind: 'live',
      scenario: 'pulmonary-embolism',
      seed: 1504,
      dials: [{ id: 'rate' }],
      view: STRIP,
      marks: [{ auto: 'rr' }],
      caption: l(
        '把心率在 100–115 的范围内拨动：窦性心动过速贯穿始终，但 S1Q3T3 与右胸 T 波倒置**不依赖心率**。反过来，单看心率什么也得不到——疼痛、发热、脓毒症同样造成窦性心动过速。',
        'Slide the rate across its 100–115 range: sinus tachycardia runs throughout, but the S1Q3T3 and the right-precordial T inversion do **not** depend on the rate. And the rate alone gives you nothing — pain, fever and sepsis also produce sinus tachycardia.',
        'Mueve la frecuencia por su rango de 100–115: la taquicardia sinusal acompaña todo el trayecto, pero el S1Q3T3 y la T invertida precordial derecha **no** dependen de ella. Y la frecuencia por sí sola no aporta nada: dolor, fiebre y sepsis también producen taquicardia sinusal.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('pulmonary-embolism', 1505, { rate: 108 }),
      marks: [{ auto: 't', lead: 'V1' }, { auto: 't', lead: 'V2' }, { auto: 't', lead: 'V3' }],
      caption: l(
        'V1–V3 的 T 波倒置伴小 rS 型 QRS（电压不高）是急性右心室负荷的典型组合。没有临床背景时，它常被报成“前间壁 T 波改变，考虑缺血”——呼吸困难的病史才是扭转判读的关键。同时看一眼 aVR 与 V1 的 ST 段：抬高同样列在负荷征象里。',
        'T inversion in V1–V3 with small rS complexes (no increase in voltage) is the typical ensemble of acute RV strain. Without the story it often gets reported as "anteroseptal T changes, consider ischaemia" — the history of dyspnoea is what turns the reading around. Glance at the ST in aVR and V1 as well: elevation there is on the same strain list.',
        'La inversión de la T en V1–V3 con complejos rS pequeños (sin aumento del voltaje) es el conjunto típico de la sobrecarga aguda del VD. Sin la clínica suele informarse como «alteraciones de la T anteroseptal, considerar isquemia»: la historia de disnea es lo que gira la lectura. Mira también el ST en aVR y V1: su elevación está en la misma lista de sobrecarga.',
      ),
    },
    {
      kind: 'text',
      title: l('不是这项检查', 'Not the test', 'No es esa prueba'),
      body: l(
        '确诊路径在心电图之外：\n- **Wells 或 Geneva 评分**先定验前概率；\n- 低/中概率且 **D-二聚体**阴性可以排除；\n- 可能性高或 D-二聚体阳性 → **CT 肺动脉造影（CTPA）**；\n- 高概率患者不要为了“再确认一下”而推迟 CTPA。\n心电图在路径中的位置：排除模仿者（STEMI、心包炎（o7）、原发性心律问题），并让右心室负荷征象参与危险分层。改变是一过性的——与旧图对比、必要时复查。',
        'The confirming pathway lies outside the ECG:\n- a **Wells or Geneva score** sets the pre-test probability;\n- low/intermediate probability with a negative **D-dimer** rules PE out;\n- high probability or a positive D-dimer → **CT pulmonary angiography (CTPA)**;\n- in a high-probability patient, never delay CTPA for "one more look" at the ECG.\nWhere the ECG sits in the pathway: excluding the mimics (STEMI, pericarditis (o7), a primary rhythm problem) and feeding the RV-strain signs into the risk stratification. The changes are transient — compare with an old tracing and repeat when needed.',
        'El itinerario que confirma está fuera del ECG:\n- una **puntuación de Wells o de Ginebra** fija la probabilidad a priori;\n- probabilidad baja o intermedia con **dímero D** negativo excluye el TEP;\n- probabilidad alta o dímero D positivo → **angio-TC pulmonar (CTPA)**;\n- en un paciente de probabilidad alta, no retrases la angio-TC para «otra mirada» al ECG.\nEl lugar del ECG en el itinerario: descartar a los imitadores (IAMCEST, pericarditis (o7), un problema primario del ritmo) y aportar los signos de sobrecarga del VD a la estratificación de riesgo. Los cambios son transitorios: compara con un ECG antiguo y repítelo si hace falta.',
      ),
    },
    {
      kind: 'contrast',
      title: l('急性负荷还是慢性肥厚？', 'Acute strain or chronic hypertrophy?', '¿Sobrecarga aguda o hipertrofia crónica?'),
      left: {
        ecg: synth('pulmonary-embolism', 1506, { rate: 104 }),
        caption: l(
          '急性肺栓塞：窦性心动过速、S1Q3T3、V1–V3 T 波倒置；QRS 电压不高',
          'Acute PE: sinus tachycardia, S1Q3T3, T inversion in V1–V3; QRS voltage not increased',
          'TEP agudo: taquicardia sinusal, S1Q3T3, T invertida en V1–V3; voltaje del QRS no aumentado',
        ),
        marks: [{ auto: 't', lead: 'V2' }],
      },
      right: {
        ecg: synth('rvh', 1507, { rate: 82 }),
        caption: l(
          '慢性右心室肥厚（肺动脉高压）：V1 高 R 波、V5–V6 深 S 波、电轴右偏、P 波高尖',
          'Chronic RVH (pulmonary hypertension): tall R in V1, deep S in V5–V6, right axis, peaked P waves',
          'HVD crónica (hipertensión pulmonar): R alta en V1, S profunda en V5–V6, eje derecho y P apuntada',
        ),
        marks: [{ auto: 'r', lead: 'V1' }],
      },
      point: l(
        '急性与慢性的分界：**急性负荷**几乎没有电压——右心室还来不及肥厚——只有 S1Q3T3、T 波倒置与新发的传导改变，并随血流动力学好转而消退。**慢性 RVH** 给出电压（V1 高 R 波、V5–V6 深 S 波），加上右心房异常（P 波高尖）与继发性 ST–T 改变。QR 型 V1 两侧都可能出现：在慢性侧，它是右心室肥厚最特异的标准。',
        'The line between acute and chronic: **acute strain** comes with almost no voltage — the RV has had no time to hypertrophy — only S1Q3T3, T inversion and new conduction changes, and it fades as the haemodynamics improve. **Chronic RVH** delivers voltage (a tall R in V1, a deep S in V5–V6) plus a right atrial abnormality (peaked P waves) and secondary ST–T changes. A QR in V1 can appear on both sides; on the chronic side it is the most specific RVH criterion.',
        'La frontera entre lo agudo y lo crónico: la **sobrecarga aguda** llega casi sin voltaje —el VD no ha tenido tiempo de hipertrofiarse—, solo S1Q3T3, T invertida y cambios de conducción de novo, y se borra al mejorar la hemodinámica. La **HVD crónica** aporta voltaje (R alta en V1, S profunda en V5–V6) además de anomalía auricular derecha (P apuntada) y alteraciones secundarias del ST-T. Un QR en V1 puede aparecer en ambos lados; en el lado crónico es el criterio más específico de HVD.',
      ),
    },
    { kind: 'check', item: { family: 'systemic', seed: 3 } },
    { kind: 'check', item: { family: 'systemic', seed: 15 } },
    { kind: 'drill', families: ['systemic', 'spot'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [4408, 2417],
      caption: l(
        'PTB-XL 没有肺栓塞标签，所以这里放的是这一课的两块“拼图”。第一份：窦性心动过速约 130 次/分——肺栓塞最常见的心电图异常，但单独出现时什么也证明不了。第二份标注为右心室肥厚：V1 高 R、V1–V4 T 波倒置——慢性右心压力负荷带来的是电压。先自己读：哪一份有右室“电压”，哪一份只有心率？再揭晓标签。',
        'PTB-XL carries no pulmonary-embolism label, so here are the two halves of this lesson’s puzzle. The first: sinus tachycardia at about 130/min — the commonest ECG abnormality in PE, and on its own proof of nothing. The second is labelled right ventricular hypertrophy: a tall R in V1 with T inversion in V1–V4 — a chronic RV pressure load brings voltage. Read them yourself first: which one has RV voltage, which one only has a rate? Then reveal the labels.',
        'PTB-XL no tiene etiquetas de tromboembolismo pulmonar, así que aquí van las dos piezas del rompecabezas de esta lección. La primera: taquicardia sinusal a unos 130 lpm, la alteración electrocardiográfica más frecuente del TEP y, por sí sola, prueba de nada. La segunda está etiquetada como hipertrofia ventricular derecha: R alta en V1 con T negativas en V1–V4; la sobrecarga crónica de presión del VD aporta voltaje. Léelas tú primero: ¿cuál tiene voltaje del VD y cuál solo frecuencia? Después mira las etiquetas.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '非要看到 S1Q3T3 才相信肺栓塞——它只见于少数患者。',
          'Demanding S1Q3T3 before believing in PE — it appears in only a minority of patients.',
          'Exigir un S1Q3T3 antes de creer en el TEP: solo aparece en una minoría de pacientes.',
        ),
        l(
          '用心电图“正常”来排除肺栓塞——约 10–25 % 的病例心电图基本正常。',
          'Using a "normal" ECG to rule out PE — the tracing is essentially normal in roughly 10–25 % of cases.',
          'Usar un ECG «normal» para excluir el TEP: el trazado es prácticamente normal en torno al 10–25 % de los casos.',
        ),
        l(
          '没有病史就把 V1–V3 T 波倒置报成“前间壁 NSTEMI”。',
          'Reporting T inversion in V1–V3 as an "anteroseptal NSTEMI" without the story.',
          'Informar la T invertida en V1–V3 como «NSTEMI anteroseptal» sin la clínica.',
        ),
        l(
          '高概率患者为了“再确认”而推迟 CTPA。',
          'Delaying CTPA in a high-probability patient for "one more confirmation".',
          'Retrasar la angio-TC en un paciente de probabilidad alta para buscar «una confirmación más».',
        ),
        l(
          '危险分层时忽略右心室负荷征象——它们提示更差的预后。',
          'Ignoring the RV-strain signs when risk-scoring — they mark a worse outcome.',
          'Ignorar los signos de sobrecarga del VD al estratificar el riesgo: marcan un peor pronóstico.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '心电图既不能确诊也不能排除肺栓塞；它的用途是排除其他诊断并评估严重度。',
          'The ECG neither rules PE in nor out; its uses are excluding other diagnoses and grading severity.',
          'El ECG ni confirma ni excluye el TEP; sus usos son descartar otros diagnósticos y valorar la gravedad.',
        ),
        l(
          '窦性心动过速是最常见的异常；约 10–25 % 的病例心电图基本正常。',
          'Sinus tachycardia is the commonest abnormality; the ECG is essentially normal in roughly 10–25 % of cases.',
          'La taquicardia sinusal es la alteración más frecuente; el ECG es prácticamente normal en torno al 10–25 % de los casos.',
        ),
        l(
          '右心室负荷清单：V1–V4 T 波倒置（±下壁）是重症最常见的表现；还有 S1Q3T3、新发右束支传导阻滞、V1 呈 QR 型、电轴右偏、aVR/V1 ST 段抬高。',
          'The RV-strain list: T inversion in V1–V4 (± inferior) is the most frequent finding in severe PE; also S1Q3T3, a new RBBB, QR in V1, right axis and ST elevation in aVR/V1.',
          'La lista de sobrecarga del VD: la T invertida en V1–V4 (± inferior) es el hallazgo más frecuente en el TEP grave; también S1Q3T3, BRD de novo, QR en V1, eje derecho y elevación del ST en aVR/V1.',
        ),
        l(
          '急性负荷与慢性 RVH 的分界：急性几乎没有电压且一过性；慢性给出电压、右心房异常与继发性 ST–T 改变。',
          'Acute strain vs chronic RVH: the acute picture has almost no voltage and is transient; the chronic one delivers voltage, right atrial abnormality and secondary ST–T changes.',
          'Sobrecarga aguda frente a HVD crónica: el cuadro agudo casi no tiene voltaje y es transitorio; el crónico aporta voltaje, anomalía auricular derecha y alteraciones secundarias del ST-T.',
        ),
        l(
          '确诊靠 Wells/Geneva 评分、D-二聚体与 CTPA——绝不为心电图而推迟影像学。',
          'Confirmation comes from Wells/Geneva, D-dimer and CTPA — never delay imaging for the ECG.',
          'La confirmación llega con Wells/Ginebra, dímero D y angio-TC: nunca retrases la imagen por el ECG.',
        ),
      ],
    },
  ],
  sources: [
    'Konstantinides SV et al. 2019 ESC Guidelines for acute pulmonary embolism. Eur Heart J 2020;41:543-603',
    'Hancock EW et al. AHA/ACCF/HRS Part V: ECG changes associated with cardiac chamber hypertrophy. Circulation 2009;119:e251-e261',
    'Castellano et al. 2004',
  ],
};

export default lesson;
