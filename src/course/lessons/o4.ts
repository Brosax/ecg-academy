/**
 * O4 — Sodium-channel blockers and other drugs (docs/PLAN.md §3, stage O).
 * Criteria: docs/curriculum/criteria.md "Sodium-channel blocker toxicity" missing-book bullet (Lavonas 2023,
 * Boehnert 1985, Liebelt 1995), `qt-causes` row (drug menu), Brugada phenocopy wording in the Brugada bullet.
 *
 * Tracings (checked against the model truth, tests/course/lessons-o.test.ts): `na-channel-blockade` = sinus
 * tachycardia ≈ 104/min, QRS ≈ 128 ms, a terminal R in aVR ≈ 4 mm (R/S ≈ 0.75) and a terminal S in I; it has no
 * Brugada-type ST in V1 (the drug-induced Brugada pattern is taught in text only).
 */
import { l } from '../../core/l10n';
import type { EcgSource, Item } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});

/** The QRS-width risk bands applied to a poisoned patient. */
const qrsRiskCheck: Item = {
  id: 'o4:tca-qrs-risk',
  family: 'metabolic',
  competency: 'C10',
  difficulty: 'classic',
  seed: 0,
  kind: 'choice',
  prompt: l(
    '31 岁女性，被发现身旁有空的阿米替林药盒，嗜睡，血压 95/60 mmHg。读这份心电图：下一步最合适的是什么？',
    'A woman of 31 found drowsy next to an empty box of amitriptyline; blood pressure 95/60 mmHg. Read this ECG: what is the best next step?',
    'Mujer de 31 años hallada somnolienta junto a una caja vacía de amitriptilina; tensión arterial 95/60 mmHg. Lee este ECG: ¿cuál es el mejor paso siguiente?',
  ),
  ecg: synth('na-channel-blockade', 1469),
  view: { layout: '3x4+1', highlightLeads: ['aVR', 'II'] },
  explanation: l(
    '窦速约 104 次/分，QRS 约 130 ms（≥100 ms），aVR 终末 R 约 4 mm、R/S ≥0.7，I 导联终末 S 宽钝：钠通道阻滞剂中毒。QRS ≥100 ms 已提示抽搐风险，而且患者低血压——现在就静脉推注碳酸氢钠（常用 1–2 mmol/kg，可重复），复查心电图看 QRS 是否变窄，并请毒理会诊。胺碘酮或普鲁卡因胺这类抗心律失常药会进一步阻滞钠通道，是错误选择；“等 QRS 到 160 ms 再说”是在等心律失常。',
    'Sinus tachycardia at about 104/min, QRS about 130 ms (≥100 ms), a terminal R in aVR of about 4 mm with R/S ≥0.7, and a broad terminal S in lead I: sodium-channel-blocker poisoning. A QRS ≥100 ms already signals seizure risk and the patient is hypotensive — give IV sodium bicarbonate now (typically 1–2 mmol/kg, repeated as needed), repeat the ECG to see the QRS narrow, and call toxicology. Antiarrhythmics such as amiodarone or procainamide add sodium-channel blockade and are the wrong choice; "waiting until the QRS reaches 160 ms" is waiting for the arrhythmia.',
    'Taquicardia sinusal a unos 104 lpm, QRS de unos 130 ms (≥100 ms), R terminal en aVR de unos 4 mm con R/S ≥0,7 y S terminal ancha en I: intoxicación por bloqueantes de los canales de sodio. Un QRS ≥100 ms ya indica riesgo de convulsiones y la paciente está hipotensa: administra ahora bicarbonato sódico IV (habitualmente 1–2 mmol/kg, repetible), repite el ECG para ver estrecharse el QRS y consulta con toxicología. Antiarrítmicos como la amiodarona o la procainamida añaden bloqueo del sodio y son la opción equivocada; "esperar a que el QRS llegue a 160 ms" es esperar a la arritmia.',
  ),
  findings: ['na-channel-blockade'],
  key: {
    options: [
      { id: 'bicarb', label: l('静脉碳酸氢钠，复查心电图，毒理会诊', 'IV sodium bicarbonate, repeat the ECG, call toxicology', 'Bicarbonato sódico IV, repetir el ECG, consultar con toxicología') },
      { id: 'amio', label: l('静脉胺碘酮治疗“宽 QRS 心动过速”', 'IV amiodarone for a "wide-QRS tachycardia"', 'Amiodarona IV para una "taquicardia de QRS ancho"') },
      { id: 'wait', label: l('观察：QRS 未到 160 ms，暂不处理', 'Observe: the QRS is under 160 ms, no treatment yet', 'Observar: el QRS no llega a 160 ms, de momento nada') },
      { id: 'cardiovert', label: l('同步电复律', 'Synchronised cardioversion', 'Cardioversión sincronizada') },
    ],
    correct: 'bicarb',
  },
};

const lesson: Lesson = {
  id: 'o4',
  stage: 'O',
  order: 4,
  title: l('钠通道阻滞剂及其他药物', 'Sodium-channel blockers and other drugs', 'Bloqueantes de los canales de sodio y otros fármacos'),
  summary: l(
    '三环类等钠通道阻滞剂中毒：窦速 + QRS 增宽 + aVR 终末 R 波（I 导联终末 S）。QRS ≥100 ms 提示抽搐风险、≥160 ms 提示室性心律失常风险；静脉碳酸氢钠使 QRS 变窄。读任何“说不通”的心电图前，先问用药单。',
    'Sodium-channel-blocker poisoning (tricyclics and others): sinus tachycardia + a wide QRS + a terminal R in aVR (with a terminal S in I). QRS ≥100 ms predicts seizures and ≥160 ms ventricular arrhythmias; IV sodium bicarbonate narrows the QRS. Before reading any ECG that "does not add up", ask for the drug list.',
    'Intoxicación por bloqueantes de los canales de sodio (tricíclicos y otros): taquicardia sinusal + QRS ancho + R terminal en aVR (con S terminal en I). Un QRS ≥100 ms predice convulsiones y ≥160 ms arritmias ventriculares; el bicarbonato sódico IV estrecha el QRS. Antes de leer un ECG que "no cuadra", pide la lista de medicación.',
  ),
  objectives: [
    l('识别钠通道阻滞剂中毒的心电图标志（QRS ≥100 ms、aVR 终末 R ≥3 mm 或 R/S ≥0.7、终末 40 ms 向量右偏）。', 'Recognise the ECG markers of sodium-channel-blocker poisoning (QRS ≥100 ms, terminal R in aVR ≥3 mm or R/S ≥0.7, rightward terminal 40-ms axis).', 'Reconocer los signos de la intoxicación por bloqueantes del sodio (QRS ≥100 ms, R terminal en aVR ≥3 mm o R/S ≥0,7, eje de los últimos 40 ms a la derecha).'),
    l('用 QRS 宽度分级风险，并说出解毒剂（高渗碳酸氢钠）与应避免的药物。', 'Grade the risk by QRS width and name the antidote (hypertonic sodium bicarbonate) and the drugs to avoid.', 'Graduar el riesgo por la anchura del QRS y nombrar el antídoto (bicarbonato sódico hipertónico) y los fármacos que hay que evitar.'),
    l('把中毒性宽 QRS 与重度高钾、右束支阻滞区分开。', 'Separate the toxic wide QRS from severe hyperkalaemia and from right bundle-branch block.', 'Distinguir el QRS ancho tóxico de la hiperpotasemia grave y del bloqueo de rama derecha.'),
    l('说出常用药物的心电图“指纹”菜单，并识别药物性 QT 延长。', 'Name the ECG "fingerprints" of common drugs and recognise drug-induced QT prolongation.', 'Citar las "huellas" electrocardiográficas de fármacos frecuentes y reconocer el QT largo farmacológico.'),
  ],
  minutes: 17,
  competencies: ['C10', 'C12'],
  findings: ['na-channel-blockade', 'long-qt', 'brugada-type1'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('na-channel-blockade', 1461),
      view: { layout: '3x4+1', highlightLeads: ['aVR'] },
      question: l(
        '一位服抗抑郁药过量的患者：窦性心动过速，QRS 增宽，aVR 导联 QRS 的末尾又宽又高。是哪个通道出了问题？你会给什么静脉药？',
        'An antidepressant overdose: sinus tachycardia, a wide QRS and a broad, tall final deflection in aVR. Which channel is blocked, and which IV drug will you give?',
        'Sobredosis de antidepresivos: taquicardia sinusal, QRS ancho y una deflexión final ancha y alta en aVR. ¿Qué canal está bloqueado y qué fármaco IV darás?',
      ),
      reveal: l(
        '快钠通道（三环类中毒）。标志都在：QRS 增宽（约 130 ms）、**aVR 终末 R 波**（约 4 mm）、I 导联终末 S——终末向量右偏。QRS ≥100 ms 预示抽搐，≥160 ms 预示室性心律失常；治疗是**高渗碳酸氢钠**，不是抗心律失常药。',
        'The fast sodium channel (tricyclic poisoning). The markers are all here: a wide QRS (about 130 ms), a **terminal R in aVR** (about 4 mm) and a terminal S in lead I — a rightward terminal axis. QRS ≥100 ms predicts seizures and ≥160 ms ventricular arrhythmias; the treatment is **hypertonic sodium bicarbonate**, not antiarrhythmics.',
        'El canal rápido de sodio (intoxicación tricíclica). Están todas las señales: QRS ancho (unos 130 ms), **R terminal en aVR** (unos 4 mm) y S terminal en I: eje terminal a la derecha. Un QRS ≥100 ms predice convulsiones y ≥160 ms arritmias ventriculares; el tratamiento es **bicarbonato sódico hipertónico**, no antiarrítmicos.',
      ),
    },
    {
      kind: 'text',
      title: l('为什么是 aVR', 'Why aVR', 'Por qué aVR'),
      body: l(
        '钠通道阻滞剂让整个心室传导变慢（QRS 变宽），而在传导储备最少、最后被激动的部位——右室流出道、右室基底部和室间隔基底部——减慢最多。于是 QRS 的**最后 40 ms** 指向右上方，正对 aVR 的正极：aVR 出现终末 R 波（≥3 mm 或 R/S ≥0.7），I 和 aVL 出现宽钝的终末 S 波。\n三环类还有抗胆碱作用（窦速）和 α 受体阻滞作用（低血压），并阻滞钾通道（QT 延长）。宽 QRS 并不只出现在三环类：Ia/Ic 类抗心律失常药、可卡因、苯海拉明、卡马西平、局麻药、奎宁和（羟）氯喹都能做到。',
        'Sodium-channel blockers slow conduction throughout the ventricles (a wider QRS) and most of all where the conduction reserve is lowest and activation comes last — the RV outflow tract, the basal RV and the basal septum. So the **last 40 ms** of the QRS point up and to the right, straight at aVR’s positive pole: a terminal R in aVR (≥3 mm or R/S ≥0.7) and a broad terminal S in I and aVL.\nTricyclics also have anticholinergic effects (sinus tachycardia), alpha-blockade (hypotension) and potassium-channel block (a longer QT). A wide QRS is not only a tricyclic signature: class Ia/Ic antiarrhythmics, cocaine, diphenhydramine, carbamazepine, local anaesthetics, quinine and (hydroxy)chloroquine can all produce it.',
        'Los bloqueantes del sodio enlentecen la conducción en todo el ventrículo (QRS más ancho), y sobre todo donde la reserva de conducción es menor y la activación llega la última: el tracto de salida del VD, el VD basal y el septo basal. Por eso los **últimos 40 ms** del QRS apuntan arriba y a la derecha, directos al polo positivo de aVR: R terminal en aVR (≥3 mm o R/S ≥0,7) y S terminal ancha en I y aVL.\nLos tricíclicos tienen además efecto anticolinérgico (taquicardia sinusal), bloqueo alfa (hipotensión) y bloqueo de canales de potasio (QT más largo). El QRS ancho no es exclusivo de los tricíclicos: los antiarrítmicos Ia/Ic, la cocaína, la difenhidramina, la carbamazepina, los anestésicos locales, la quinina y la (hidroxi)cloroquina también lo producen.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('na-channel-blockade', 1462),
      view: { layout: '3x4+1', highlightLeads: ['aVR', 'I'] },
      marks: [
        { auto: 'qrs', lead: 'II' },
        { auto: 'r', lead: 'aVR', label: l('终末 R', 'terminal R', 'R terminal') },
        { auto: 's', lead: 'I', label: l('终末 S', 'terminal S', 'S terminal') },
      ],
      caption: l(
        '同一种中毒，全 12 导联：QRS 约 130 ms，每个导联都宽；aVR 呈 qR 形，终末 R 约 4 mm（R/S 约 0.75）；I 导联终末 S 宽钝。注意 V1 **没有** 右束支阻滞的 rsR′ 大兔耳——终末力量是“向右上”，而不是“向右前”。窦速约 104 次/分，P 波仍在 T 波之后可见。',
        'The same poisoning on all 12 leads: QRS about 130 ms, wide in every lead; aVR is qR with a terminal R of about 4 mm (R/S about 0.75); a broad terminal S in lead I. Note that V1 has **no** big rsR′ "rabbit ears" of RBBB — the terminal force points up and right, not right and forward. Sinus tachycardia at about 104/min, the P still visible after the T.',
        'La misma intoxicación en las 12 derivaciones: QRS de unos 130 ms, ancho en todas; aVR es qR con una R terminal de unos 4 mm (R/S de unos 0,75); S terminal ancha en I. Fíjate en que V1 **no** tiene las grandes "orejas de conejo" rsR′ del BRD: la fuerza terminal apunta arriba y a la derecha, no a la derecha y adelante. Taquicardia sinusal a unos 104 lpm, con la P todavía visible tras la T.',
      ),
    },
    {
      kind: 'criteria',
      title: l('钠通道阻滞剂中毒', 'Sodium-channel blocker toxicity', 'Intoxicación por bloqueantes de los canales de sodio'),
      items: [
        { label: l('基础节律', 'Baseline rhythm', 'Ritmo de base'), value: l('窦性心动过速（三环类的抗胆碱作用）', 'Sinus tachycardia (the anticholinergic effect of tricyclics)', 'Taquicardia sinusal (efecto anticolinérgico de los tricíclicos)') },
        { label: l('QRS 宽度风险', 'QRS-width risk', 'Riesgo por anchura del QRS'), value: l('≥100 ms 抽搐风险；≥160 ms 室性心律失常风险', '≥100 ms seizure risk; ≥160 ms ventricular-arrhythmia risk', '≥100 ms riesgo de convulsiones; ≥160 ms riesgo de arritmias ventriculares') },
        { label: l('aVR 与 I', 'aVR and I', 'aVR e I'), value: l('aVR 终末 R ≥3 mm 或 R/S ≥0.7；I、aVL 终末 S；终末 40 ms 向量右偏', 'Terminal R in aVR ≥3 mm or R/S ≥0.7; terminal S in I and aVL; rightward terminal 40-ms axis', 'R terminal en aVR ≥3 mm o R/S ≥0,7; S terminal en I y aVL; eje de los últimos 40 ms a la derecha') },
        { label: l('其他表现', 'Other findings', 'Otros hallazgos'), value: l('QT 延长；Brugada 样图形；低血压；晚期心动过缓是不祥之兆', 'QT prolongation; Brugada-like pattern; hypotension; late bradycardia is an ominous sign', 'QT largo; patrón tipo Brugada; hipotensión; la bradicardia tardía es un signo ominoso') },
        { label: l('治疗', 'Treatment', 'Tratamiento'), value: l('静脉高渗碳酸氢钠（推注、可重复，看 QRS 变窄）；避免 Ia/Ic/III 类抗心律失常药；毒理会诊', 'IV hypertonic sodium bicarbonate (bolus, repeat while the QRS narrows); avoid class Ia/Ic/III antiarrhythmics; call toxicology', 'Bicarbonato sódico hipertónico IV (en bolo, repetible mientras se estrecha el QRS); evitar antiarrítmicos Ia/Ic/III; consultar con toxicología') },
      ],
      source: 'Lavonas EJ et al. AHA 2023 Focused Update on poisoning-related cardiac arrest and toxicity. Circulation 2023;148:e149-e186; Boehnert MT, Lovejoy FH. N Engl J Med 1985;313:474-479; Liebelt EL et al. Ann Emerg Med 1995;26:195-201',
    },
    {
      kind: 'worked',
      title: l('四步确认中毒', 'Confirm the poisoning in four steps', 'Confirmar la intoxicación en cuatro pasos'),
      ecg: synth('na-channel-blockade', 1462),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('心率与节律', 'Rate and rhythm', 'Frecuencia y ritmo'),
          body: l('窦性心动过速约 104 次/分，每个 QRS 前有 P 波。宽 QRS 加窦性 P 波，先排除“室速”——这是被增宽的窦性心律。', 'Sinus tachycardia at about 104/min, a P before every QRS. A wide QRS with sinus P waves: before anyone says "VT", this is a sinus rhythm with a widened QRS.', 'Taquicardia sinusal a unos 104 lpm, con P delante de cada QRS. QRS ancho con P sinusales: antes de que alguien diga "TV", esto es un ritmo sinusal con el QRS ensanchado.'),
          marks: [{ auto: 'p', lead: 'II' }, { auto: 'rr', lead: 'II' }],
        },
        {
          title: l('量 QRS', 'Measure the QRS', 'Mide el QRS'),
          body: l('在最宽的导联测量：约 130 ms。已超过 100 ms（抽搐风险），离 160 ms（室性心律失常风险）还有距离——但趋势比单次数值更重要，要连续复查。', 'Measure in the widest lead: about 130 ms. Beyond 100 ms (seizure risk), still short of 160 ms (ventricular-arrhythmia risk) — but the trend matters more than one value, so repeat the ECG.', 'Mide en la derivación más ancha: unos 130 ms. Por encima de 100 ms (riesgo de convulsiones), todavía lejos de 160 ms (riesgo de arritmias ventriculares); pero importa más la tendencia que un valor aislado, así que repite el ECG.'),
          marks: [{ auto: 'qrs', lead: 'II' }],
        },
        {
          title: l('看 aVR 与 I', 'Look at aVR and I', 'Mira aVR e I'),
          body: l('aVR 的 QRS 末尾是粗钝的 R 波，约 4 mm、R/S 约 0.75（两条标准都满足）；I 导联同时出现宽钝的终末 S——终末向量右偏。', 'A broad terminal R closes the QRS in aVR — about 4 mm, R/S about 0.75 (both criteria met) — while lead I shows a broad terminal S: a rightward terminal axis.', 'Una R terminal ancha cierra el QRS en aVR —unos 4 mm, R/S de unos 0,75 (se cumplen ambos criterios)— mientras I muestra una S terminal ancha: eje terminal a la derecha.'),
          marks: [{ auto: 'r', lead: 'aVR' }, { auto: 's', lead: 'I' }],
          highlightLeads: ['aVR', 'I'],
        },
        {
          title: l('行动', 'Act', 'Actúa'),
          body: l('静脉高渗碳酸氢钠，复查心电图看 QRS 是否变窄、aVR 的 R 是否变小；心电监护、气道保护、处理抽搐（苯二氮䓬类）；不再给任何钠通道阻滞剂，包括 Ia/Ic 类和胺碘酮。', 'IV hypertonic sodium bicarbonate, then repeat the ECG: does the QRS narrow, does the R in aVR shrink? Monitor, protect the airway, treat seizures (benzodiazepines); give no further sodium-channel blockers, including class Ia/Ic drugs and amiodarone.', 'Bicarbonato hipertónico IV y repite el ECG: ¿se estrecha el QRS, disminuye la R de aVR? Monitoriza, protege la vía aérea, trata las convulsiones (benzodiacepinas) y no des más bloqueantes del sodio, incluidos los Ia/Ic y la amiodarona.'),
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('两种“代谢性”宽 QRS', 'Two "metabolic" wide QRS complexes', 'Dos QRS anchos "metabólicos"'),
      view: { layout: '3x4+1', highlightLeads: ['aVR', 'II', 'V3'] },
      left: {
        ecg: synth('na-channel-blockade', 1463),
        caption: l('钠通道阻滞剂中毒：窦速、P 波清楚、aVR 终末 R', 'Sodium-channel-blocker poisoning: sinus tachycardia, clear P waves, terminal R in aVR', 'Intoxicación por bloqueantes del sodio: taquicardia sinusal, P claras, R terminal en aVR'),
        marks: [{ auto: 'r', lead: 'aVR' }],
      },
      right: {
        ecg: synth('hyperkalemia-severe', 1466),
        caption: l('重度高钾：心率约 60、P 波消失、QRS 更宽并融入高尖 T', 'Severe hyperkalaemia: rate about 60, P waves gone, an even wider QRS merging into a tall tented T', 'Hiperpotasemia grave: frecuencia de unos 60, sin ondas P, QRS aún más ancho fundiéndose con una T picuda'),
        marks: [{ auto: 't', lead: 'V3' }],
      },
      point: l(
        '两侧 QRS 都宽，都是急症，都可能用到碳酸氢钠——但第一针不同。左：**快**（窦速）、P 波清楚、T 波正常、aVR 终末 R——钠通道阻滞，先给碳酸氢钠。右：**慢**、P 波没了、QRS 约 170 ms 直接连着窄底高尖的 T——高钾，**先给钙剂**（o1）。三个问题分开它们：心率快还是慢？P 波在不在？T 波是窄高的帐篷吗？',
        'Both QRS complexes are wide, both are emergencies, and bicarbonate may play a part in both — but the first syringe differs. Left: **fast** (sinus tachycardia), clear P waves, normal T waves, a terminal R in aVR — sodium-channel blockade: bicarbonate first. Right: **slow**, P waves gone, a QRS of about 170 ms running straight into a narrow-based tented T — hyperkalaemia: **calcium first** (o1). Three questions split them: fast or slow? Is the P there? Is the T a tall narrow tent?',
        'Ambos QRS son anchos, ambos son urgencias y el bicarbonato puede intervenir en los dos, pero la primera jeringa es distinta. Izquierda: **rápido** (taquicardia sinusal), P claras, T normales, R terminal en aVR: bloqueo del sodio, primero bicarbonato. Derecha: **lento**, sin P, un QRS de unos 170 ms que entra directamente en una T picuda de base estrecha: hiperpotasemia, **primero calcio** (o1). Tres preguntas los separan: ¿rápido o lento? ¿Está la P? ¿Es la T una tienda alta y estrecha?',
      ),
    },
    {
      kind: 'text',
      title: l('这不是右束支阻滞，也不是 Brugada 综合征', 'Not RBBB, and not Brugada syndrome', 'No es un BRD ni un síndrome de Brugada'),
      body: l(
        '两个常见误读：\n- **右束支阻滞**：aVR 也可以有终末 R，但右束支阻滞的终末力量指向**右前**——V1 是高大的 rsR′、I 和 V6 是宽 S，QRS 后段宽而前段正常；中毒是**整个** QRS 都被拉宽，V1 没有大的 R′，再加上窦速和中毒史。\n- **Brugada 图形**：钠通道阻滞剂（三环类、Ic 类、锂盐、可卡因等）可以在 V1–V2 制造穹顶样 ST 抬高——这是**药物诱发的 Brugada 图形**，可能揭示潜在的 Brugada 综合征，也可能只是中毒的一部分。发热和高钾也能产生类似图形（“表型拷贝”）。先排除药物、发热和电解质，待其纠正后复查，再决定是否需要专科评估（h8）。',
        'Two common misreadings:\n- **RBBB**: aVR can show a terminal R too, but in RBBB the terminal force points **right and forward** — a tall rsR′ in V1, a broad S in I and V6, a normal initial QRS with a wide tail; poisoning widens the **whole** QRS, V1 has no big R′, and the story is tachycardia plus an overdose.\n- **Brugada pattern**: sodium-channel blockers (tricyclics, class IC drugs, lithium, cocaine and others) can produce coved ST elevation in V1–V2 — a **drug-induced Brugada pattern** that may unmask an underlying Brugada syndrome or may simply be part of the poisoning. Fever and hyperkalaemia make similar copies ("phenocopies"). Exclude drugs, fever and electrolytes, repeat once they are corrected, and only then decide on specialist assessment (h8).',
        'Dos lecturas erróneas frecuentes:\n- **BRD**: aVR también puede tener una R terminal, pero en el BRD la fuerza terminal apunta **a la derecha y adelante**: rsR′ alta en V1, S ancha en I y V6, inicio del QRS normal con una cola ancha; la intoxicación ensancha **todo** el QRS, V1 no tiene una R′ grande y la historia es taquicardia más sobredosis.\n- **Patrón de Brugada**: los bloqueantes del sodio (tricíclicos, fármacos IC, litio, cocaína y otros) pueden producir una elevación del ST en cúpula en V1–V2, un **patrón de Brugada inducido por fármacos** que puede desenmascarar un síndrome de Brugada subyacente o ser simplemente parte de la intoxicación. La fiebre y la hiperpotasemia producen copias parecidas ("fenocopias"). Descarta fármacos, fiebre y electrolitos, repite tras corregirlos y solo entonces decide si hace falta una valoración especializada (h8).',
      ),
    },
    {
      kind: 'text',
      title: l('药物心电图菜单', 'The drug ECG menu', 'El menú electrocardiográfico de los fármacos'),
      body: l(
        '读一份“说不通”的心电图之前，先问“患者在吃什么药”：\n- **Ic 类（氟卡尼、普罗帕酮）**：QRS 增宽，心率越快越宽；可揭示 Brugada 图形；可把房扑减慢到 1:1 下传（t3）；\n- **Ia 类（奎尼丁、普鲁卡因胺、丙吡胺）**：QRS 增宽 + QT 延长；\n- **III 类（胺碘酮、索他洛尔、多非利特）**：QT 延长（h7）；胺碘酮还减慢窦律；\n- **地高辛**：鱼钩样效应 → 中毒节律（o3）；\n- **β 阻滞剂 / 维拉帕米 / 地尔硫䓬**：窦缓、PR 延长、房室阻滞（r3、r4）；\n- **非心脏药也会延长 QT**（hERG 阻滞）：大环内酯类、氟喹诺酮类、美沙酮、氟哌啶醇等抗精神病药、昂丹司琼、部分抗抑郁药——叠加两种并不“温和”，低钾低镁时更危险（CredibleMeds 名单，h7）。',
        'Before reading an ECG that "does not add up", ask what the patient is taking:\n- **class IC (flecainide, propafenone)**: a wide QRS that widens further at faster rates; can unmask a Brugada pattern; can slow flutter until it conducts 1:1 (t3);\n- **class Ia (quinidine, procainamide, disopyramide)**: a wide QRS plus a long QT;\n- **class III (amiodarone, sotalol, dofetilide)**: a long QT (h7); amiodarone also slows the sinus rate;\n- **digoxin**: the scooped effect, then the toxic rhythms (o3);\n- **beta-blockers / verapamil / diltiazem**: sinus bradycardia, a longer PR, AV block (r3, r4);\n- **non-cardiac drugs lengthen the QT too** (hERG block): macrolides, fluoroquinolones, methadone, haloperidol and other antipsychotics, ondansetron, some antidepressants — two of them together are not "mild", and low potassium or magnesium makes it worse (CredibleMeds list, h7).',
        'Antes de leer un ECG que "no cuadra", pregunta qué toma el paciente:\n- **IC (flecainida, propafenona)**: QRS ancho que se ensancha más con frecuencias altas; puede desenmascarar un patrón de Brugada; puede enlentecer el flutter hasta que conduzca 1:1 (t3);\n- **Ia (quinidina, procainamida, disopiramida)**: QRS ancho y QT largo;\n- **III (amiodarona, sotalol, dofetilida)**: QT largo (h7); la amiodarona además enlentece el ritmo sinusal;\n- **digoxina**: efecto en cuchara y después las arritmias tóxicas (o3);\n- **betabloqueantes / verapamilo / diltiacem**: bradicardia sinusal, PR más largo, bloqueo AV (r3, r4);\n- **fármacos no cardiacos también alargan el QT** (bloqueo hERG): macrólidos, fluoroquinolonas, metadona, haloperidol y otros antipsicóticos, ondansetrón, algunos antidepresivos; dos juntos no son "suaves", y el potasio o el magnesio bajos lo empeoran (lista CredibleMeds, h7).',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('long-qt', 1467, undefined, 'drug'),
      view: { layout: 'strip', lead: 'II' },
      marks: [{ auto: 'qt', lead: 'II' }, { auto: 't', lead: 'II' }],
      caption: l(
        '药物性 QT 延长（II）：心率约 64 次/分，QT 约 505 ms，QTc 约 515 ms；T 波低、宽并呈双峰（先一个小切迹再一个驼峰——hERG 阻滞的典型形态）。QTc >500 ms 是尖端扭转型室速的高风险区：停用延长 QT 的药物，补钾补镁到正常高值，连续监护。这里 QRS 不宽——钾通道阻滞拉长的是复极，不是除极。',
        'Drug-induced QT prolongation (II): rate about 64/min, QT about 505 ms, QTc about 515 ms; a low, broad, two-humped (bifid) T — the typical hERG-block shape. A QTc >500 ms is the high-risk zone for torsades de pointes: stop the QT-prolonging drugs, bring potassium and magnesium to high-normal, monitor continuously. Note the QRS is narrow — potassium-channel block stretches repolarisation, not depolarisation.',
        'QT largo farmacológico (II): frecuencia de unos 64 lpm, QT de unos 505 ms, QTc de unos 515 ms; T baja, ancha y bífida (con dos jorobas), la forma típica del bloqueo hERG. Un QTc >500 ms es la zona de alto riesgo de torsades de pointes: suspende los fármacos que alargan el QT, sube el potasio y el magnesio a valores normales altos y monitoriza de forma continua. Fíjate en que el QRS es estrecho: el bloqueo de los canales de potasio alarga la repolarización, no la despolarización.',
      ),
    },
    { kind: 'check', item: { inline: qrsRiskCheck } },
    { kind: 'check', item: { family: 'metabolic', seed: 8 } },
    { kind: 'check', item: { family: 'metabolic', seed: 53 } },
    { kind: 'drill', families: ['metabolic'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [6479, 9894],
      caption: l(
        'PTB-XL 没有中毒标签，但有标注为“QT 延长”的真实心电图。先自己量：选 QT 最长的导联、用切线法找 T 波终点、按心率校正（Fridericia）。再想一想：报告里写下“QT 延长”之后，你要问的第一个问题是什么？（答案：用药单和血钾、血镁。）',
        'PTB-XL has no poisoning label, but it does have real tracings labelled "long QT". Measure them yourself first: pick the lead with the longest QT, find the T end with the tangent method, correct for rate (Fridericia). Then ask: once "long QT" is in the report, what is your first question? (The drug list, and the potassium and magnesium.)',
        'PTB-XL no tiene etiquetas de intoxicación, pero sí trazados reales etiquetados como "QT largo". Mídelos tú primero: elige la derivación con el QT más largo, busca el final de la T con el método de la tangente y corrige por la frecuencia (Fridericia). Después piensa: cuando "QT largo" ya está en el informe, ¿cuál es tu primera pregunta? (La lista de medicación, y el potasio y el magnesio.)',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l('把中毒性 QRS 增宽当作室速，给了胺碘酮或普鲁卡因胺（更堵钠通道）。', 'Treating toxic QRS widening as VT and giving amiodarone or procainamide (more sodium-channel blockade).', 'Tratar el QRS ancho tóxico como TV y dar amiodarona o procainamida (más bloqueo del sodio).'),
        l('等 QRS 到 160 ms 才给碳酸氢钠：≥100 ms 加上低血压、抽搐或心律失常就该给了。', 'Waiting for 160 ms before giving bicarbonate: ≥100 ms with hypotension, seizures or arrhythmia is already the indication.', 'Esperar a 160 ms para dar bicarbonato: ≥100 ms con hipotensión, convulsiones o arritmias ya es la indicación.'),
        l('把高钾的宽 QRS 当作中毒（或反过来）：心率、P 波和 T 波形态决定第一针是钙还是碳酸氢钠。', 'Mistaking the wide QRS of hyperkalaemia for poisoning (or the reverse): the rate, the P and the T shape decide whether the first syringe is calcium or bicarbonate.', 'Confundir el QRS ancho de la hiperpotasemia con una intoxicación (o al revés): la frecuencia, la P y la forma de la T deciden si la primera jeringa es calcio o bicarbonato.'),
        l('药物诱发的 Brugada 图形被直接送去做遗传学评估，却不查用药单、体温和电解质。', 'A drug-induced Brugada pattern sent straight to genetics without checking the drug list, the temperature and the electrolytes.', 'Mandar un patrón de Brugada inducido por fármacos directamente a genética sin revisar la medicación, la temperatura y los electrolitos.'),
        l('药物史只问“心脏病药”，漏掉抗生素、止吐药和精神科药物。', 'Taking a drug history of "cardiac medicines" only and missing antibiotics, antiemetics and psychiatric drugs.', 'Hacer una anamnesis farmacológica solo de "medicación cardiaca" y olvidar antibióticos, antieméticos y psicofármacos.'),
        l('叠加 QT 延长药物（两种“温和”的药合用并不温和），又不纠正低钾低镁。', 'Stacking QT-prolonging drugs (two "mild" drugs are not mild together) without correcting low potassium and magnesium.', 'Sumar fármacos que alargan el QT (dos "suaves" juntos no lo son) sin corregir el potasio y el magnesio bajos.'),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('中毒组合：窦速 + QRS ≥100 ms + aVR 终末 R（≥3 mm 或 R/S ≥0.7）+ I 导联终末 S。', 'The toxic combination: sinus tachycardia + QRS ≥100 ms + terminal R in aVR (≥3 mm or R/S ≥0.7) + terminal S in I.', 'La combinación tóxica: taquicardia sinusal + QRS ≥100 ms + R terminal en aVR (≥3 mm o R/S ≥0,7) + S terminal en I.'),
        l('QRS ≥100 ms 提示抽搐、≥160 ms 提示室性心律失常；解毒剂是高渗碳酸氢钠，不是抗心律失常药。', 'QRS ≥100 ms warns of seizures and ≥160 ms of ventricular arrhythmias; the antidote is hypertonic sodium bicarbonate, not an antiarrhythmic.', 'Un QRS ≥100 ms avisa de convulsiones y ≥160 ms de arritmias ventriculares; el antídoto es el bicarbonato hipertónico, no un antiarrítmico.'),
        l('宽 QRS 的三个代谢/中毒来源看三件事：心率、P 波、T 波——快 + P 在 + aVR 终末 R 是钠通道；慢 + 无 P + 帐篷 T 是钾。', 'For a toxic or metabolic wide QRS look at rate, P and T: fast + P present + terminal R in aVR = sodium channel; slow + no P + tented T = potassium.', 'Ante un QRS ancho tóxico o metabólico mira frecuencia, P y T: rápido + P presente + R terminal en aVR = canal de sodio; lento + sin P + T picuda = potasio.'),
        l('钠通道阻滞剂、发热与高钾都能产生 Brugada 样图形：先纠正原因再复查。', 'Sodium-channel blockers, fever and hyperkalaemia can all produce a Brugada-like pattern: correct the cause, then repeat.', 'Los bloqueantes del sodio, la fiebre y la hiperpotasemia pueden producir un patrón tipo Brugada: corrige la causa y repite.'),
        l('每份无法解释的心电图都值得一张完整的用药单（包括非心脏药）。', 'Every unexplained ECG deserves a complete drug list, non-cardiac drugs included.', 'Todo ECG inexplicable merece una lista completa de medicación, incluidos los fármacos no cardiacos.'),
      ],
    },
  ],
  sources: [
    'Lavonas EJ et al. AHA 2023 Focused Update on poisoning-related cardiac arrest and toxicity. Circulation 2023;148:e149-e186',
    'Boehnert MT, Lovejoy FH. Value of the QRS duration versus the serum drug level in predicting seizures and ventricular arrhythmias after an acute overdose of tricyclic antidepressants. N Engl J Med 1985;313:474-479',
    'Liebelt EL, Francis PD, Woolf AD. ECG lead aVR versus QRS interval in predicting seizures and arrhythmias in acute tricyclic antidepressant toxicity. Ann Emerg Med 1995;26:195-201',
    'Drew BJ et al. Prevention of torsade de pointes in hospital settings: AHA/ACCF scientific statement. Circulation 2010;121:1047-1060',
    'Zeppenfeld K et al. 2022 ESC Guidelines for ventricular arrhythmias and the prevention of sudden cardiac death. Eur Heart J 2022;43:3997-4126',
    'Castellano et al. 2004',
  ],
};

export default lesson;
