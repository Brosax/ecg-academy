/**
 * h4 — Low voltage and infiltrative disease (docs/PLAN.md §3, stage H).
 * Criteria: docs/curriculum/criteria.md low-QRS-voltage bullet (rate-rhythm-intervals-axis, "Missing in the book"),
 * cardiac-amyloidosis and acute-pericarditis/tamponade bullets (electrolytes-drugs-misc-conditions) — current values.
 */
import { l } from '../../core/l10n';
import type { EcgSource } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});
const GRID = { layout: '3x4+1' } as const;

const lesson: Lesson = {
  id: 'h4',
  stage: 'H',
  order: 4,
  title: l('低电压与浸润性心肌病', 'Low voltage and infiltrative disease', 'Bajo voltaje y enfermedad infiltrativa'),
  summary: l(
    'QRS低电压（肢体导联全部 <5 mm 和/或胸导联全部 <10 mm）的原因阶梯，从肥胖、COPD、心包积液到浸润性心肌病；低电压 + 电交替 + 窦性心动过速指向大量积液与心脏压塞。',
    'The cause ladder behind low QRS voltage (all limb leads <5 mm and/or all precordial leads <10 mm), from obesity, COPD and pericardial effusion to infiltrative disease; low voltage + electrical alternans + sinus tachycardia point to a large effusion and tamponade.',
    'La escalera de causas del bajo voltaje del QRS (todas las derivaciones de extremidades <5 mm y/o todas las precordiales <10 mm), desde la obesidad, la EPOC y el derrame pericárdico hasta la enfermedad infiltrativa; bajo voltaje + alternancia eléctrica + taquicardia sinusal apuntan a un derrame importante y al taponamiento.',
  ),
  objectives: [
    l(
      '给出 QRS 低电压的定义（肢体导联全部 <5 mm 和/或胸导联全部 <10 mm），并在判定前先核对定准电压。',
      'State the definition of low QRS voltage (all limb leads <5 mm and/or all precordial leads <10 mm) and check the calibration before calling it.',
      'Exponer la definición de bajo voltaje del QRS (todas las extremidades <5 mm y/o todas las precordiales <10 mm) y comprobar la calibración antes de afirmarlo.',
    ),
    l(
      '背出低电压的病因阶梯：肥胖、COPD/肺气肿、心包积液、甲状腺功能减退、浸润性心肌病（淀粉样变）、严重心肌疾病。',
      'Recite the cause ladder of low voltage: obesity, COPD/emphysema, pericardial effusion, hypothyroidism, infiltrative cardiomyopathy (amyloid), severe myocardial disease.',
      'Recitar la escalera de causas del bajo voltaje: obesidad, EPOC/enfisema, derrame pericárdico, hipotiroidismo, miocardiopatía infiltrativa (amiloide), miocardiopatía grave.',
    ),
    l(
      '识别心脏淀粉样变的红旗：电压–质量不匹配、V1–V3 假性梗死图形、传导阻滞、心房颤动。',
      'Recognise the red flags of cardiac amyloidosis: voltage–mass discordance, pseudo-infarct pattern in V1–V3, conduction disease, atrial fibrillation.',
      'Reconocer las señales de alarma de la amiloidosis cardíaca: discordancia voltaje-masa, patrón de pseudoinfarto en V1-V3, trastorno de conducción, fibrilación auricular.',
    ),
    l(
      '把低电压 + 电交替 + 窦性心动过速与大量心包积液/心脏压塞联系起来，并知道压塞终究是临床诊断。',
      'Link low voltage + electrical alternans + sinus tachycardia to a large pericardial effusion or tamponade, and know that tamponade remains a clinical diagnosis.',
      'Relacionar bajo voltaje + alternancia eléctrica + taquicardia sinusal con un derrame pericárdico importante o un taponamiento, y saber que el taponamiento sigue siendo un diagnóstico clínico.',
    ),
  ],
  minutes: 15,
  competencies: ['C7', 'C12'],
  findings: ['low-voltage', 'electrical-alternans', 'pericardial-effusion'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('low-voltage', 1261, { rate: 80 }),
      view: GRID,
      question: l(
        '这份 12 导联心电图上，所有肢体导联的 QRS 都不足 5 mm，所有胸导联的 QRS 都不足 10 mm。信号去哪儿了？先写下你最先想到的三个病因，再揭晓。',
        'On this 12-lead ECG every limb-lead QRS is under 5 mm and every precordial QRS is under 10 mm. Where has the signal gone? Write the three causes that come to mind first, then reveal.',
        'En este ECG de 12 derivaciones, todo QRS de las derivaciones de extremidades mide menos de 5 mm y todo QRS precordial, menos de 10 mm. ¿Adónde se ha ido la señal? Escribe las tres causas que se te ocurran primero y luego mira la solución.',
      ),
      reveal: l(
        '两个方向：**能发电的心肌变少**，或者**心肌与电极之间的东西变多**。这就是 QRS 低电压——标准：全部肢体导联 QRS 振幅 <5 mm，和/或全部胸导联 <10 mm。本图本身说不出病因——心率 80 次/分、没有电交替、没有肺型 P 波，只剩“小”这一条线索；所以要背阶梯：心包积液、肥胖、肺气肿（COPD）、甲状腺功能减退、浸润性心肌病（淀粉样变）、严重心肌疾病。低电压从来不是最终诊断——它的价值在于逼你问"为什么"。',
        'Two directions: **less myocardium generating the signal**, or **more material between it and the electrodes**. This is low QRS voltage — definition: all limb-lead QRS amplitudes <5 mm, and/or all precordial QRS amplitudes <10 mm. This tracing does not name its own cause — rate 80/min, no alternans, no P pulmonale, nothing but smallness — which is why you need the ladder: pericardial effusion, obesity, emphysema (COPD), hypothyroidism, infiltrative cardiomyopathy (amyloid), severe myocardial disease. Low voltage is never a final diagnosis — its value is forcing the question "why?".',
        'Dos direcciones: **menos miocardio que genera la señal** o **más tejido entre él y los electrodos**. Esto es bajo voltaje del QRS: todas las amplitudes del QRS en extremidades <5 mm y/o todas en precordiales <10 mm. Este trazado no dice su causa (80 lpm, sin alternancia, sin P pulmonar: solo queda lo pequeño), y por eso necesitas la escalera: derrame pericárdico, obesidad, enfisema (EPOC), hipotiroidismo, miocardiopatía infiltrativa (amiloide), miocardiopatía grave. El bajo voltaje nunca es un diagnóstico final: su valor es obligarte a preguntar «¿por qué?».',
      ),
    },
    {
      kind: 'text',
      title: l('信号去哪儿了', 'Where the signal goes', 'Adónde va la señal'),
      body: l(
        '心电图测量的是到达体表的电位，它由两件事决定：**电源**（心肌的质量与除极向量）和**传输**（心肌到电极之间的组织）。低电压有两条路：\n- 传输被衰减——肥胖（脂肪）、肺气肿（空气）、心包积液（液体），甚至大量胸腔积液，都在电源与电极之间隔了一层；\n- 电源被削弱——浸润性心肌病（淀粉样变）取代了能除极的心肌，或广泛的心肌损伤与瘢痕。\n所以同一张"小 QRS"背后可以藏着完全不同的病：一个肥胖的健康人，或一个心壁很厚却几乎发不出电的淀粉样变患者。读图之外，必须问临床和超声。',
        'The ECG measures the potential that reaches the body surface, and two things set it: the **source** (the mass and depolarisation vector of the myocardium) and the **transfer** (the tissues between myocardium and electrodes). Low voltage has two roads:\n- a dampened transfer — obesity (fat), emphysema (air), pericardial effusion (fluid), even a large pleural effusion interpose a layer between the source and the electrodes;\n- a weakened source — infiltrative disease (amyloid) replaces myocardium that could depolarise, or extensive damage and scarring does.\nSo the same "small QRS" can hide opposite diseases: a healthy person with obesity, or an amyloid patient with very thick walls that barely generate a signal. Beyond the tracing you must ask the patient and the echo.',
        'El ECG mide el potencial que llega a la superficie del cuerpo, y dos cosas lo determinan: la **fuente** (la masa y el vector de despolarización del miocardio) y la **transmisión** (los tejidos entre el miocardio y los electrodos). El bajo voltaje tiene dos caminos:\n- una transmisión amortiguada: la obesidad (grasa), el enfisema (aire), el derrame pericárdico (líquido) e incluso un derrame pleural importante interponen una capa entre la fuente y los electrodos;\n- una fuente debilitada: la enfermedad infiltrativa (amiloide) sustituye a miocardio capaz de despolarizarse, o lo hacen un daño y una cicatriz extensos.\nAsí, el mismo «QRS pequeño» puede esconder enfermedades opuestas: una persona sana con obesidad o un paciente con amiloidosis de paredes muy gruesas que apenas genera señal. Más allá del trazado, hay que preguntar a la clínica y al ecocardiograma.',
      ),
    },
    {
      kind: 'criteria',
      title: l('低电压与病因阶梯', 'Low voltage and the cause ladder', 'Bajo voltaje y la escalera de causas'),
      items: [
        {
          label: l('低电压（定义）', 'Low voltage (definition)', 'Bajo voltaje (definición)'),
          value: l(
            '全部肢体导联 QRS 振幅 <5 mm（0.5 mV），和/或全部胸导联 QRS 振幅 <10 mm（1.0 mV）',
            'All limb-lead QRS amplitudes <5 mm (0.5 mV), and/or all precordial QRS amplitudes <10 mm (1.0 mV)',
            'Todas las amplitudes del QRS en extremidades <5 mm (0,5 mV) y/o todas en precordiales <10 mm (1,0 mV)',
          ),
        },
        {
          label: l('测量之前', 'Before measuring', 'Antes de medir'),
          value: l(
            '先看定准电压：标准 10 mm/mV；半电压（5 mm/mV）会把一切减半，"制造"出低电压',
            'Check the calibration first: standard gain is 10 mm/mV; half gain (5 mm/mV) halves everything and fakes low voltage',
            'Mira primero la calibración: la ganancia estándar es 10 mm/mV; con media ganancia (5 mm/mV) todo se reduce a la mitad y simula bajo voltaje',
          ),
        },
        {
          label: l('病因阶梯', 'Cause ladder', 'Escalera de causas'),
          value: l(
            '肥胖 · COPD/肺气肿 · 心包积液 · 甲状腺功能减退 · 浸润性心肌病（淀粉样变）· 严重心肌疾病',
            'Obesity · COPD/emphysema · pericardial effusion · hypothyroidism · infiltrative cardiomyopathy (amyloid) · severe myocardial disease',
            'Obesidad · EPOC/enfisema · derrame pericárdico · hipotiroidismo · miocardiopatía infiltrativa (amiloide) · miocardiopatía grave',
          ),
        },
        {
          label: l('淀粉样变红旗', 'Amyloid red flags', 'Señales de alarma de la amiloidosis'),
          value: l(
            '低电压而超声室壁增厚（电压–质量不匹配）；V1–V3 假性梗死 Q/QS；房室或室内传导阻滞；心房颤动。电压正常不能排除淀粉样变',
            'Low voltage despite thick walls on echo (voltage–mass discordance); pseudo-infarct Q/QS in V1–V3; AV or intraventricular conduction disease; atrial fibrillation. Normal voltage does not exclude amyloid',
            'Bajo voltaje con paredes gruesas en el ecocardiograma (discordancia voltaje-masa); Q/QS de pseudoinfarto en V1-V3; trastorno de conducción AV o intraventricular; fibrilación auricular. Un voltaje normal no excluye la amiloidosis',
          ),
        },
        {
          label: l('大量积液/心脏压塞', 'Large effusion / tamponade', 'Derrame importante / taponamiento'),
          value: l(
            '低 QRS 电压 + 电交替 + 窦性心动过速；三者俱全时压塞可能性增大，但心电图不敏感——压塞是临床诊断',
            'Low QRS voltage + electrical alternans + sinus tachycardia; with all three, tamponade becomes more likely, but the ECG is insensitive — tamponade is a clinical diagnosis',
            'Bajo voltaje del QRS + alternancia eléctrica + taquicardia sinusal; con los tres, el taponamiento se vuelve más probable, pero el ECG es insensible: el taponamiento es un diagnóstico clínico',
          ),
        },
        {
          label: l('COPD 的低电压', 'COPD low voltage', 'Bajo voltaje en la EPOC'),
          value: l(
            '低电压 + 肺型P波 + 电轴右偏/垂直位：问题在空气，不在心肌——不要按心肌病去追',
            'Low voltage + P pulmonale + rightward/vertical axis: the problem is air, not myocardium — do not chase it as myocardial disease',
            'Bajo voltaje + P pulmonar + eje derecho/vertical: el problema es el aire, no el miocardio; no lo persigas como miocardiopatía',
          ),
        },
      ],
      source:
        'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332; Garcia-Pavia P et al. ESC position statement on cardiac amyloidosis. Eur Heart J 2021;42:1554-1568; Adler Y et al. 2015 ESC Guidelines on pericardial diseases. Eur Heart J 2015;36:2921-2964',
    },
    {
      kind: 'worked',
      title: l('把电压查一遍，再把阶梯搭起来', 'Run the voltage check, then build the ladder', 'Haz la comprobación del voltaje y monta después la escalera'),
      ecg: synth('low-voltage', 1262, { rate: 76 }),
      view: GRID,
      steps: [
        {
          title: l('先看定准电压', 'Check the calibration first', 'Comprueba primero la calibración'),
          body: l(
            '在判定"低电压"之前先确认走纸速度与增益：25 mm/s、10 mm/mV。半电压记录会把所有振幅减半——先排除这个技术原因，再谈疾病。',
            'Before calling "low voltage", confirm speed and gain: 25 mm/s and 10 mm/mV. A half-gain recording halves every amplitude — exclude this technical cause before you talk about disease.',
            'Antes de decir «bajo voltaje», confirma la velocidad y la ganancia: 25 mm/s y 10 mm/mV. Un registro a media ganancia reduce todas las amplitudes a la mitad: descarta esta causa técnica antes de hablar de enfermedad.',
          ),
        },
        {
          title: l('六个肢体导联', 'The six limb leads', 'Las seis derivaciones de extremidades'),
          body: l(
            '逐个测量 I、II、III、aVR、aVL、aVF 的 QRS 振幅——从最高的正向波顶到最深的负向波底（峰-峰值）：本图最大的是 II，约 4 mm，全部 <5 mm。任何一条达到 5 mm，"肢体导联低电压"就不成立。',
            'Measure the QRS amplitude in each of I, II, III, aVR, aVL and aVF — from the top of the tallest positive wave to the bottom of the deepest negative one (peak to peak): the largest here is II at about 4 mm, all <5 mm. If any single lead reaches 5 mm, "low limb voltage" is not met.',
            'Mide la amplitud del QRS en I, II, III, aVR, aVL y aVF, desde la cima de la onda positiva más alta hasta el fondo de la negativa más profunda (pico a pico): la mayor es II, con unos 4 mm; todas <5 mm. Si una sola derivación llega a 5 mm, no se cumple el «bajo voltaje en extremidades».',
          ),
          marks: [{ auto: 'r', lead: 'II' }, { auto: 's', lead: 'aVR' }],
          highlightLeads: ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'],
        },
        {
          title: l('六个胸导联', 'The six precordial leads', 'Las seis derivaciones precordiales'),
          body: l(
            '再测 V1–V6：本图最大的是 V3，约 8 mm，全部 <10 mm。阈值是肢体导联的两倍，因为胸导联离心脏更近、电压天然更高。两条定义之间是"和/或"：满足其一即可报告低电压。',
            'Now measure V1–V6: the largest is V3 at about 8 mm, all <10 mm. The threshold is double the limb one because the precordial electrodes sit closer to the heart and voltage runs higher there. The two definitions join with "and/or": either one alone justifies the statement.',
            'Mide ahora V1-V6: la mayor es V3, con unos 8 mm; todas <10 mm. El umbral es el doble que en extremidades porque los electrodos precordiales están más cerca del corazón y allí el voltaje es naturalmente mayor. Las dos definiciones se unen con «y/o»: basta una para informar bajo voltaje.',
          ),
          marks: [{ auto: 's', lead: 'V2' }, { auto: 'r', lead: 'V5' }],
          highlightLeads: ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
        },
        {
          title: l('搭起病因阶梯', 'Build the cause ladder', 'Monta la escalera de causas'),
          body: l(
            '低电压成立，现在问为什么。阶梯：肥胖（心电图上没有别的线索）、COPD/肺气肿（肺型P波、电轴右偏）、心包积液（窦性心动过速、电交替）、甲状腺功能减退（窦性心动过缓）、淀粉样变（室壁厚而电压低、V1–V3 假性梗死、传导阻滞、房颤）、严重心肌疾病。下一步是超声和临床，不是更多导联。',
            'Low voltage stands; now ask why. The ladder: obesity (no other clue on the ECG), COPD/emphysema (P pulmonale, rightward axis), pericardial effusion (sinus tachycardia, electrical alternans), hypothyroidism (sinus bradycardia), amyloid (thick walls with low voltage, pseudo-infarct V1–V3, conduction disease, AF), severe myocardial disease. The next step is the echo and the patient, not more leads.',
            'El bajo voltaje se confirma; ahora pregunta por qué. La escalera: obesidad (ninguna otra pista en el ECG), EPOC/enfisema (P pulmonar, eje derecho), derrame pericárdico (taquicardia sinusal, alternancia eléctrica), hipotiroidismo (bradicardia sinusal), amiloide (paredes gruesas con bajo voltaje, pseudoinfarto en V1-V3, trastorno de conducción, FA), miocardiopatía grave. El paso siguiente es el ecocardiograma y el paciente, no más derivaciones.',
          ),
        },
      ],
    },
    {
      kind: 'text',
      title: l('红旗：心壁很厚，电压却很低', 'Red flag: thick walls, low voltage', 'Señal de alarma: paredes gruesas, voltaje bajo'),
      body: l(
        '浸润性心肌病最典型的代表是**心脏淀粉样变**：蛋白沉积在心肌间质里，室壁增厚，能正常除极的心肌反而变少。于是出现教科书级的矛盾——**超声室壁厚，心电图电压低**（电压–质量不匹配）。红旗组合：\n- 低电压，或电压与室壁厚度不成比例地低；\n- V1–V3 假性梗死 Q/QS，而没有梗死病史；\n- 房室或室内传导阻滞（想想"无明确病因的年轻房室阻滞"）；\n- 心房颤动。\n遇到"壁厚 + 电压低"先想淀粉样变，再去做超声、血清游离轻链和核素显像；反过来也要记住，**电压正常同样不能排除淀粉样变**。',
        'The archetype of infiltrative disease is **cardiac amyloidosis**: protein deposits fill the interstitium, the walls thicken, yet less myocardium depolarises normally. The result is a textbook contradiction — **thick walls on echo, low voltage on the ECG** (voltage–mass discordance). The red-flag package:\n- low voltage, or voltage disproportionately low for the wall thickness;\n- pseudo-infarct Q/QS in V1–V3 with no infarct history;\n- AV or intraventricular conduction disease (think of "unexplained AV block in younger adults");\n- atrial fibrillation.\nWhen walls are thick and voltage low, think amyloid first and go on to echo, serum free light chains and scintigraphy; and in the other direction, remember that **normal voltage does not exclude amyloid either**.',
        'El arquetipo de la enfermedad infiltrativa es la **amiloidosis cardíaca**: los depósitos de proteína ocupan el intersticio, las paredes se engrosan y, sin embargo, menos miocardio se despolariza con normalidad. El resultado es una contradicción de libro: **paredes gruesas en el ecocardiograma, voltaje bajo en el ECG** (discordancia voltaje-masa). El paquete de señales de alarma:\n- bajo voltaje, o voltaje desproporcionadamente bajo para el grosor parietal;\n- Q/QS de pseudoinfarto en V1-V3 sin infarto previo;\n- trastorno de conducción AV o intraventricular (piensa en el «bloqueo AV sin causa clara en adultos jóvenes»);\n- fibrilación auricular.\nAnte paredes gruesas con voltaje bajo, piensa primero en la amiloidosis y sigue con ecocardiograma, cadenas ligeras libres séricas y gammagrafía; y a la inversa, recuerda que **un voltaje normal tampoco la excluye**.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('low-voltage', 1263, { rate: 78 }, 'emphysema'),
      view: GRID,
      marks: [{ auto: 'r', lead: 'I' }, { auto: 'r', lead: 'V3' }],
      caption: l(
        '同一低电压场景的"肺气肿"版本：胸导联全部 <10 mm，肢体导联也全部 <5 mm（最大的 II、III、aVF 约 4–5 mm）；再看电轴——约 +80°，**垂直位**，I 和 aVL 几乎没有 QRS。空气把信号隔掉，过度充气的肺把膈肌压低、心脏变成垂直位。本图的 P 波还不高（II 约 1 mm）；完整的肺气肿图形常再加上肺型 P 波和右偏电轴。这是胸腔的问题，不是心肌的问题：不要按"严重心肌疾病"去追查。',
        'The "emphysema" face of the same low voltage: every precordial QRS is <10 mm and every limb QRS <5 mm (the largest, II, III and aVF, about 4–5 mm); now look at the axis — about +80°, **vertical**, with almost no QRS in I and aVL. Air dampens the signal, and the hyperinflated lungs flatten the diaphragm and hang the heart vertically. The P is not yet tall here (about 1 mm in II); the full emphysema picture often adds P pulmonale and a rightward axis. The problem is in the chest, not in the myocardium: do not chase it as "severe myocardial disease".',
        'La cara «enfisema» del mismo bajo voltaje: todos los QRS precordiales miden <10 mm y todos los de extremidades <5 mm (los mayores, II, III y aVF, unos 4-5 mm); mira ahora el eje: unos +80°, **vertical**, casi sin QRS en I y aVL. El aire amortigua la señal y los pulmones hiperinsuflados aplanan el diafragma y verticalizan el corazón. Aquí la P aún no es alta (alrededor de 1 mm en II); el cuadro completo del enfisema suele añadir P pulmonar y eje derecho. El problema está en el tórax, no en el miocardio; no lo persigas como «miocardiopatía grave».',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('electrical-alternans', 1264, { rate: 112 }),
      // the heart swings towards and away from the chest wall: the alternation is largest in V2–V4, small in the (low-voltage) limb leads
      view: { layout: 'strip', lead: 'V3' },
      marks: [{ auto: 'r', lead: 'V3', beat: 8 }, { auto: 'r', lead: 'V3', beat: 9 }],
      caption: l(
        'V3 导联，10 秒：QRS 一跳高（峰-峰约 16 mm）、一跳低（约 6 mm），逐搏交替——**电交替**。机制是"摆动的心脏"：大量心包积液中，心脏每搏向胸壁靠近又离开，所以交替在面对前胸的 V2–V4 最明显；本图肢体导联本身电压就低，交替只有约 1 mm（II 约 3 mm 对 4 mm）——只看 II 导联节律条很容易漏掉它。背景是约 110 次/分的窦性心动过速，肢体导联低电压。P 和 T 也一起交替时叫“全心电交替”，本图 T 几乎不变。电交替说明积液已大到能让心脏摆动，压塞的可能性随之升高。',
        'Lead V3, 10 s: the QRS is tall one beat (about 16 mm peak to peak) and small the next (about 6 mm), alternating beat by beat — **electrical alternans**. The mechanism is the "swinging heart": inside a large pericardial effusion the heart moves towards the chest wall and away again every beat, so the alternation is largest in V2–V4, which face the front of the chest; in the already low-voltage limb leads of this tracing it is only about 1 mm (lead II about 3 vs 4 mm) — read only the lead II rhythm strip and you can easily miss it. Underneath: a sinus tachycardia of about 110/min with low limb-lead voltage. When the P and T alternate too it is called total alternans; here the T hardly changes. Alternans means the effusion is big enough to let the heart swing, and tamponade becomes more likely.',
        'Derivación V3, 10 s: el QRS es alto en un latido (unos 16 mm pico a pico) y pequeño en el siguiente (unos 6 mm), alternando latido a latido: **alternancia eléctrica**. El mecanismo es el «corazón oscilante»: dentro de un derrame pericárdico importante el corazón se acerca a la pared torácica y se aleja en cada latido, así que la alternancia es máxima en V2-V4, que miran a la cara anterior del tórax; en las derivaciones de extremidades de este trazado, ya de bajo voltaje, es de solo 1 mm (II, unos 3 frente a 4 mm): si solo lees la tira de ritmo de II, se te escapa con facilidad. Debajo: taquicardia sinusal de unos 110 lpm con bajo voltaje en extremidades. Cuando también alternan la P y la T se habla de alternancia total; aquí la T apenas cambia. La alternancia indica que el derrame ya permite que el corazón oscile y el taponamiento se vuelve más probable.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('pericardial-effusion', 1265, { rate: 106 }),
      view: GRID,
      marks: [{ auto: 'r', lead: 'I' }, { auto: 'rr' }],
      caption: l(
        '心包积液的日常面貌：全部导联小 QRS + 窦性心动过速（本图约 106 次/分），没有电交替。电交替要积液够大、心脏摆得起来才会出现——所以"有"分量很重，"没有"什么也排除不了。',
        'The everyday face of a pericardial effusion: a small QRS in every lead plus sinus tachycardia (about 106/min here), without alternans. Alternans needs an effusion large enough for the heart to swing — so its presence weighs heavily, and its absence excludes nothing.',
        'La cara cotidiana de un derrame pericárdico: QRS pequeño en todas las derivaciones más taquicardia sinusal (aquí unos 106 lpm), sin alternancia. La alternancia exige un derrame lo bastante grande como para que el corazón oscile: su presencia pesa mucho y su ausencia no excluye nada.',
      ),
    },
    {
      kind: 'text',
      title: l('压塞：心电图之后是病人', 'Tamponade: after the ECG comes the patient', 'Taponamiento: después del ECG viene el paciente'),
      body: l(
        '大量积液走向心脏压塞时，心电图给出三联征：**低电压 + 电交替 + 窦性心动过速**。但它们出现得晚、也不敏感——压塞始终是**临床**诊断：血压下降、心音遥远、颈静脉压升高（Beck 三联征），奇脉，气促。如果病人在休克而你还在等电交替出现，病人就危险了：疑诊压塞立刻做超声，必要时心包穿刺，不要等心电图"长得典型"。',
        'As a large effusion moves towards tamponade, the ECG offers a triad: **low voltage + electrical alternans + sinus tachycardia**. But these appear late and are insensitive — tamponade is always a **clinical** diagnosis: falling blood pressure, muffled heart sounds, raised jugular venous pressure (Beck\'s triad), pulsus paradoxus, dyspnoea. A patient who is shocked while you wait for alternans to appear is a patient in danger: when tamponade is suspected, echo now and pericardiocentesis if needed — do not wait for the ECG to "look typical".',
        'Cuando un derrame importante avanza hacia el taponamiento, el ECG ofrece una tríada: **bajo voltaje + alternancia eléctrica + taquicardia sinusal**. Pero aparecen tarde y son insensibles: el taponamiento es siempre un diagnóstico **clínico**: descenso de la tensión arterial, ruidos cardíacos apagados, presión venosa yugular elevada (tríada de Beck), pulso paradójico, disnea. Un paciente en shock mientras esperas a que aparezca la alternancia es un paciente en peligro: ante la sospecha de taponamiento, ecocardiograma inmediato y pericardiocentesis si hace falta; no esperes a que el ECG «parezca típico».',
      ),
    },
    {
      kind: 'contrast',
      title: l('同一个导联，两个方向', 'One lead, two directions', 'Una derivación, dos direcciones'),
      view: GRID,
      left: {
        ecg: synth('low-voltage', 1266, { rate: 72 }),
        caption: l('低电压：V5 的 R 波小，全页 12 个导联都小', 'Low voltage: a small R in V5 — every lead on the page is small', 'Bajo voltaje: R pequeña en V5; las doce derivaciones son pequeñas'),
        marks: [{ auto: 'r', lead: 'V5' }],
      },
      right: {
        ecg: synth('lvh', 1267, { rate: 66 }),
        caption: l('左心室肥厚：同一个 V5，R 波高耸', 'LVH: the same V5 with a towering R', 'HVI: la misma V5 con una R muy alta'),
        marks: [{ auto: 'r', lead: 'V5' }],
      },
      point: l(
        '两个极端回答同一个问题——"电压去哪儿了"。左侧：心肌的信号在途中被衰减（脂肪、空气、液体），或能发电的心肌本身变少；右侧：心肌增多、除极向量更强。两者并不互斥：肥胖或积液会把肥厚心脏的电压"压小"，让所有左心室肥厚电压标准假阴性——这正是低电压背景下不能凭电压排除肥厚的原因。',
        'Two extremes answer one question — "where did the voltage go?". Left: the myocardium\'s signal is dampened on the way (fat, air, fluid), or the generating myocardium itself has shrunk. Right: more muscle, a stronger depolarisation vector. The two are not mutually exclusive: obesity or an effusion can shrink a hypertrophied heart\'s voltage and turn every LVH voltage criterion falsely negative — which is why voltage cannot exclude hypertrophy in a low-voltage tracing.',
        'Dos extremos responden a una sola pregunta: «¿adónde fue el voltaje?». Izquierda: la señal del miocardio se amortigua en el camino (grasa, aire, líquido) o el propio miocardio generador se ha reducido. Derecha: más músculo, un vector de despolarización más fuerte. No se excluyen entre sí: la obesidad o un derrame pueden empequeñecer el voltaje de un corazón hipertrofiado y volver falsamente negativos todos los criterios de voltaje de HVI; por eso el voltaje no puede excluir la hipertrofia en un trazado de bajo voltaje.',
      ),
    },
    { kind: 'check', item: { family: 'chambers', seed: 16 } },
    { kind: 'check', item: { family: 'chambers-findings', seed: 3 } },
    { kind: 'drill', families: ['chambers', 'chambers-findings'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [7796, 1599, 10303],
      caption: l(
        '三份真实的低电压心电图：77 岁男性、62 岁女性、71 岁女性。先确认定准电压，再逐份写下"低电压 + 你最看好的两个病因"（别忘了节律：其中一份不是窦性），然后揭晓。真实病例没有合成图那样干净的答案——病因最终要靠临床与超声去定。',
        'Three real low-voltage tracings: a 77-year-old man, a 62-year-old woman and a 71-year-old woman. Check the calibration first, then commit on each to "low voltage + your top two causes" (and name the rhythm: one of them is not sinus) before the reveal. Real cases do not come with the clean answer of a synthetic strip — the cause is finally settled by the patient and the echo.',
        'Tres trazados reales de bajo voltaje: un varón de 77 años, una mujer de 62 y una de 71. Comprueba primero la calibración y comprométete en cada uno con «bajo voltaje + tus dos causas más probables» (y nombra el ritmo: uno de ellos no es sinusal) antes de la solución. Los casos reales no traen la respuesta limpia de una tira sintética: la causa la acaban decidiendo el paciente y el ecocardiograma.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '不看定准电压就报低电压：半电压（5 mm/mV）会把所有振幅减半，平白"制造"低电压。永远先看定准脉冲。',
          'Reporting low voltage without checking the calibration: half gain (5 mm/mV) halves every amplitude and fakes low voltage out of nothing. Always look at the calibration pulse first.',
          'Informar bajo voltaje sin mirar la calibración: con media ganancia (5 mm/mV) todas las amplitudes se reducen a la mitad y se «fabrica» un bajo voltaje de la nada. Mira siempre primero el pulso de calibración.',
        ),
        l(
          '把电交替当成伪差或体位变化：窦性心动过速背景下整份 P–QRS–T 逐搏交替，在写"电极松了"之前先想摆动的心脏。',
          'Calling electrical alternans artefact or a positional wobble: with the whole P–QRS–T alternating beat by beat on a sinus tachycardia, think of the swinging heart before writing "loose electrode".',
          'Llamar a la alternancia eléctrica artefacto o variación postural: con todo el P-QRS-T alternando latido a latido sobre una taquicardia sinusal, piensa en el corazón oscilante antes de escribir «electrodo suelto».',
        ),
        l(
          '低电压 + 超声室壁厚却不想到淀粉样变：电压–质量不匹配加上 V1–V3 假性梗死 Q/QS，是浸润性心肌病的信号；电压正常也同样不能排除。',
          'Low voltage plus thick walls on echo without the amyloid thought: voltage–mass discordance with pseudo-infarct Q/QS in V1–V3 is the signature of infiltrative disease — and normal voltage does not exclude it either.',
          'Bajo voltaje con paredes gruesas en el ecocardiograma sin pensar en la amiloidosis: la discordancia voltaje-masa con Q/QS de pseudoinfarto en V1-V3 es la firma de la enfermedad infiltrativa, y un voltaje normal tampoco la excluye.',
        ),
        l(
          '把 COPD 的低电压当成心肌病去追：肺型P波、右偏/垂直电轴加低电压指向空气与过度充气，不是心肌本身的问题。',
          'Chasing COPD low voltage as myocardial disease: P pulmonale, a rightward or vertical axis plus low voltage point to air and hyperinflation, not to the myocardium itself.',
          'Perseguir el bajo voltaje de la EPOC como miocardiopatía: P pulmonar, eje derecho o vertical y bajo voltaje apuntan al aire y la hiperinsuflación, no al propio miocardio.',
        ),
        l(
          '等低电压、电交替、窦速"三件套"齐全才行动：它们出现得晚且不敏感；压塞靠临床诊断（Beck 三联征、奇脉），疑诊即超声。',
          'Waiting for the full set of low voltage, alternans and sinus tachycardia before acting: they appear late and are insensitive; tamponade is diagnosed clinically (Beck\'s triad, pulsus paradoxus) — echo as soon as it is suspected.',
          'Esperar a que se reúnan bajo voltaje, alternancia y taquicardia sinusal antes de actuar: aparecen tarde y son insensibles; el taponamiento se diagnostica clínicamente (tríada de Beck, pulso paradójico) y ante la sospecha, ecocardiograma.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          'QRS低电压 = 全部肢体导联 QRS <5 mm，和/或全部胸导联 <10 mm——先核对定准电压（10 mm/mV）再判定。',
          'Low QRS voltage = all limb-lead QRS <5 mm, and/or all precordial QRS <10 mm — check the gain (10 mm/mV) before calling it.',
          'Bajo voltaje del QRS = todo QRS en extremidades <5 mm y/o todo QRS precordial <10 mm; comprueba la ganancia (10 mm/mV) antes de afirmarlo.',
        ),
        l(
          '信号去哪儿了：心肌与电极之间的东西变多（肥胖、肺气肿、心包积液），或能发电的心肌变少（浸润性心肌病、严重心肌疾病）；甲状腺功能减退也在阶梯上。',
          'Where the signal goes: more between myocardium and electrodes (obesity, emphysema, pericardial effusion) or less generating myocardium (infiltrative disease, severe myocardial disease); hypothyroidism is on the ladder too.',
          'Adónde va la señal: más tejido entre el miocardio y los electrodos (obesidad, enfisema, derrame pericárdico) o menos miocardio generador (enfermedad infiltrativa, miocardiopatía grave); el hipotiroidismo también está en la escalera.',
        ),
        l(
          '淀粉样变红旗：室壁厚而电压低（电压–质量不匹配）、V1–V3 假性梗死 Q/QS、传导阻滞、心房颤动；电压正常不能排除。',
          'Amyloid red flags: thick walls with low voltage (voltage–mass discordance), pseudo-infarct Q/QS V1–V3, conduction disease, atrial fibrillation; normal voltage does not exclude it.',
          'Señales de alarma de la amiloidosis: paredes gruesas con bajo voltaje (discordancia voltaje-masa), Q/QS de pseudoinfarto en V1-V3, trastorno de conducción, fibrilación auricular; el voltaje normal no la excluye.',
        ),
        l(
          '低电压 + 电交替 + 窦性心动过速 = 大量心包积液，压塞可能性增大；但心电图不敏感——压塞靠临床（Beck 三联征、奇脉）诊断，疑诊即超声。',
          'Low voltage + electrical alternans + sinus tachycardia = a large pericardial effusion with rising odds of tamponade; but the ECG is insensitive — tamponade is a clinical diagnosis (Beck\'s triad, pulsus paradoxus), so echo as soon as it is suspected.',
          'Bajo voltaje + alternancia eléctrica + taquicardia sinusal = derrame pericárdico importante con mayor probabilidad de taponamiento; pero el ECG es insensible: el taponamiento es un diagnóstico clínico (tríada de Beck, pulso paradójico) y ante la sospecha, ecocardiograma.',
        ),
      ],
    },
  ],
  sources: [
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Garcia-Pavia P et al. ESC position statement on cardiac amyloidosis. Eur Heart J 2021;42:1554-1568',
    'Adler Y et al. 2015 ESC Guidelines on pericardial diseases. Eur Heart J 2015;36:2921-2964',
    'Castellano et al. 2004',
  ],
};

export default lesson;
