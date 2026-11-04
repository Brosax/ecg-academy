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
      kind: 'heart',
      ecg: synth('na-channel-blockade', 1462),
      showConduction: true,
      emphasize: ['rv-outflow', 'rv-basal', 'lv-basal-anteroseptal'],
      caption: l(
        '阻滞剂让整个心室传导变慢，最后被激动的右室流出道和基底部最慢：QRS最后40 ms指向右上方，正对aVR。',
        'The blocker slows conduction in the whole ventricle, most where activation comes last (RV outflow and base): the last 40 ms of the QRS point up and right, straight at aVR.',
        'El bloqueante enlentece la conducción en todo el ventrículo, sobre todo donde la activación llega la última (tracto de salida y base del VD): los últimos 40 ms del QRS apuntan arriba y a la derecha, hacia aVR.',
      ),
    },
    {
      kind: 'film',
      title: l('钠通道被阻滞时', 'When the sodium channel is blocked', 'Cuando se bloquea el canal de sodio'),
      view: { layout: '3x4+1', highlightLeads: ['aVR', 'I', 'V1'] },
      frames: [
        {
          label: l('用药前', 'Before', 'Antes'),
          ecg: synth('sinus-tachycardia', 1462, { rate: 104 }),
          note: l('窦速104次/分，QRS约95 ms：aVR全是负的，I导联全是正的。', 'Sinus tachycardia at 104/min, QRS about 95 ms: aVR is all negative, lead I all upright.', 'Taquicardia sinusal a 104 lpm, QRS de unos 95 ms: aVR es todo negativo y I todo positivo.'),
          marks: [{ auto: 'qrs', lead: 'II' }],
        },
        {
          label: l('钠通道阻滞', 'Sodium-channel block', 'Bloqueo del sodio'),
          ecg: synth('na-channel-blockade', 1462, { rate: 104 }),
          note: l('QRS约130 ms，每个导联都宽。aVR现在以约4 mm的宽R波结束，I导联以宽S波结束。', 'QRS about 130 ms, wide in every lead. aVR now ends in a broad R of about 4 mm; lead I ends in a broad S.', 'QRS de unos 130 ms, ancho en todas las derivaciones. aVR acaba ahora en una R ancha de unos 4 mm; I acaba en una S ancha.'),
          marks: [
            { auto: 'qrs', lead: 'II' },
            { auto: 'r', lead: 'aVR', label: l('终末 R', 'terminal R', 'R terminal') },
            { auto: 's', lead: 'I', label: l('终末 S', 'terminal S', 'S terminal') },
          ],
        },
        {
          label: l('药物性Brugada', 'Drug Brugada', 'Brugada por fármacos'),
          ecg: synth('na-channel-blockade', 1462, { rate: 104 }, 'brugada'),
          note: l('有的阻滞剂还让V1–V2出现约3 mm的穹窿形ST抬高，V1接倒置T：药物性Brugada图形。先纠正病因，再复查。', 'Some blockers also raise a coved ST of about 3 mm in V1–V2, into a negative T in V1: a drug-induced Brugada pattern. Correct the cause, then repeat.', 'Algunos bloqueantes elevan además el ST en V1–V2 unos 3 mm, en cúpula y hacia una T negativa en V1: patrón de Brugada por fármacos. Corrige la causa y repite.'),
          marks: [{ auto: 'j', lead: 'V1' }, { auto: 'j', lead: 'V2' }],
        },
        {
          label: l('右束支阻滞', 'RBBB', 'Bloqueo de rama derecha'),
          ecg: synth('rbbb', 1462, { rate: 95 }),
          note: l('右束支阻滞的aVR也以R波结束，但V1有高大的rsR′（兔耳）；中毒时V1没有大R′。', 'RBBB also ends with an R in aVR, but V1 has a tall rsR′ (rabbit ears); in the poisoning V1 has no big R′.', 'El bloqueo de rama derecha también acaba en R en aVR, pero V1 tiene una rsR′ alta (orejas de conejo); en la intoxicación V1 no tiene una R′ grande.'),
          marks: [{ auto: 'r', lead: 'V1' }, { auto: 'r', lead: 'aVR' }],
        },
      ],
      predict: {
        question: l('阻滞剂让最后激动的右上部分最慢。哪个导联会以宽R波结束？', 'The blocker slows the last, upper-right region most. Which lead will end in a broad R?', 'El bloqueante frena sobre todo la última región, arriba a la derecha. ¿Qué derivación acabará en una R ancha?'),
        options: [l('aVR', 'aVR', 'aVR'), l('aVF', 'aVF', 'aVF'), l('V6', 'V6', 'V6')],
        answer: 0,
      },
      caption: l(
        '钠通道阻滞剂：三环类、Ia/IC类、可卡因、苯海拉明、卡马西平、局麻药、奎宁、（羟）氯喹。看QRS宽度、aVR终末R和I导联终末S。',
        'Sodium-channel blockers: tricyclics, class Ia/IC, cocaine, diphenhydramine, carbamazepine, local anaesthetics, quinine, (hydroxy)chloroquine. Read the QRS width, the terminal R in aVR and the terminal S in I.',
        'Bloqueantes del sodio: tricíclicos, clase Ia/IC, cocaína, difenhidramina, carbamazepina, anestésicos locales, quinina, (hidroxi)cloroquina. Lee la anchura del QRS, la R terminal de aVR y la S terminal de I.',
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
        {
          label: l('各类药物的心电图', 'Drug classes on the ECG', 'Clases de fármacos en el ECG'),
          value: l(
            'Ia：QRS 增宽 + QT 延长；IC：心率越快 QRS 越宽，可揭示 Brugada 图形，可使房扑减慢至 1:1 下传（t3）；III：QT 延长（胺碘酮还减慢窦律）；β 受体阻滞剂、维拉帕米、地尔硫䓬：窦缓、PR 延长、房室阻滞',
            'Ia: wide QRS + long QT; IC: the QRS widens further at faster rates, can unmask a Brugada pattern, can slow flutter into 1:1 conduction (t3); III: long QT (amiodarone also slows the sinus rate); beta-blockers, verapamil, diltiazem: sinus bradycardia, long PR, AV block',
            'Ia: QRS ancho + QT largo; IC: el QRS se ensancha más a frecuencias altas, puede desenmascarar un patrón de Brugada y enlentecer el flúter hasta conducción 1:1 (t3); III: QT largo (la amiodarona además frena el ritmo sinusal); betabloqueantes, verapamilo, diltiazem: bradicardia sinusal, PR largo, bloqueo AV',
          ),
        },
        {
          label: l('药物性长 QT', 'Drug-induced long QT', 'QT largo por fármacos'),
          value: l(
            'hERG 阻滞：T 低而宽、QRS 窄；QTc >500 ms 为尖端扭转型室速高风险：停药、补钾补镁至正常高值、监护；非心脏药也算（大环内酯类、氟喹诺酮类、美沙酮、抗精神病药、昂丹司琼）',
            'hERG block: a low, broad T with a narrow QRS; QTc >500 ms is high torsades risk: stop the drugs, bring K and Mg to high-normal, monitor; non-cardiac drugs count (macrolides, fluoroquinolones, methadone, antipsychotics, ondansetron)',
            'Bloqueo hERG: T baja y ancha con QRS estrecho; QTc >500 ms es alto riesgo de torsades: suspende los fármacos, sube K y Mg a valores normales altos y monitoriza; cuentan también los no cardiacos (macrólidos, fluoroquinolonas, metadona, antipsicóticos, ondansetrón)',
          ),
        },
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
      kind: 'film',
      title: l('先问患者在吃什么药', 'Ask what the patient takes', 'Pregunta qué toma el paciente'),
      view: { layout: '3x4+1', highlightLeads: ['II', 'V5'] },
      frames: [
        {
          label: l('钾通道阻滞', 'Potassium-channel block', 'Bloqueo del potasio'),
          ecg: synth('long-qt', 1467, undefined, 'drug'),
          note: l('64次/分，QT约505 ms，T波低而宽，QRS却窄：被拉长的是复极，不是除极。', 'At 64/min the QT is about 505 ms with a low, broad T, yet the QRS is narrow: repolarisation is stretched, not depolarisation.', 'A 64 lpm el QT mide unos 505 ms con una T baja y ancha, pero el QRS es estrecho: se alarga la repolarización, no la despolarización.'),
          marks: [{ auto: 'qt', lead: 'II' }, { auto: 't', lead: 'II' }],
        },
        {
          label: l('地高辛', 'Digoxin', 'Digoxina'),
          ecg: synth('digoxin-effect', 1470),
          note: l('V5的ST勺状下垂，T波低，QT短（约350 ms）：在用地高辛（第o3课）。', 'A scooped ST in V5, a low T and a short QT (about 350 ms): digoxin on board (lesson o3).', 'ST en cuchara en V5, T baja y QT corto (unos 350 ms): toma digoxina (lección o3).'),
          marks: [{ auto: 'st60', lead: 'V5' }, { auto: 'qt', lead: 'II' }],
        },
        {
          label: l('房室结阻滞药', 'AV-nodal blockers', 'Frenadores del nodo AV'),
          ecg: synth('av-block-1', 1471, { rate: 55, pr: 240 }),
          note: l('窦性约55次/分，PR 240 ms：β受体阻滞剂、维拉帕米或地尔硫䓬减慢窦房结和房室结（第r3、r4课）。', 'Sinus at about 55/min with a PR of 240 ms: beta-blockers, verapamil or diltiazem slow the sinus and AV nodes (lessons r3, r4).', 'Sinusal a unos 55 lpm con PR de 240 ms: betabloqueantes, verapamilo o diltiazem frenan el nodo sinusal y el AV (lecciones r3, r4).'),
          marks: [{ auto: 'pr', lead: 'II' }, { auto: 'rr', lead: 'II' }],
        },
      ],
      caption: l(
        '心电图“说不通”时，先要完整的用药清单，包括非心脏药物。每类药都留下自己的痕迹。',
        'When an ECG does not add up, get the full drug list, non-cardiac drugs included. Each class leaves its own mark.',
        'Cuando un ECG no cuadra, pide la lista completa de fármacos, también los no cardiacos. Cada clase deja su huella.',
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
        l(
          '因为 aVR 以 R 波结束就叫“右束支阻滞”：右束支阻滞 V1 有高大的 rsR′，QRS 起始正常、只是尾部宽；中毒是整个 QRS 变宽，V1 没有大 R′。',
          'Calling the poisoning "RBBB" because aVR ends in an R: RBBB has a tall rsR′ in V1 and a normal start with a wide tail; the poison widens the whole QRS and V1 has no big R′.',
          'Llamar «bloqueo de rama derecha» a la intoxicación porque aVR acaba en R: el bloqueo de rama derecha tiene una rsR′ alta en V1 y un inicio normal con una cola ancha; el tóxico ensancha todo el QRS y V1 no tiene una R′ grande.',
        ),
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
