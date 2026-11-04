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
/** one seed and rate for the voltage film: low-voltage at this seed is the normal QRS scaled by its torso gain */
const NORMAL = synth('normal', 1261, { rate: 80 });
const LOW = synth('low-voltage', 1261, { rate: 80 });
const EMPHYSEMA = synth('low-voltage', 1261, { rate: 80 }, 'emphysema');
/** the film's normal heart at the rate the moving-paper scene narrates (75/min, RR 800 ms, as in f4) */
const PAPER = synth('normal', 1261, { rate: 75, hrv: 0 });

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
      ecg: LOW,
      view: GRID,
      question: l(
        '这份 12 导联心电图上，所有肢体导联的 QRS 都不足 5 mm，所有胸导联的 QRS 都不足 10 mm。信号去哪儿了？先想好你最先想到的三个病因，再揭晓。',
        'On this 12-lead ECG every limb-lead QRS is under 5 mm and every precordial QRS is under 10 mm. Where has the signal gone? Name the three causes that come to mind first, then reveal.',
        'En este ECG de 12 derivaciones, todo QRS de las derivaciones de extremidades mide menos de 5 mm y todo QRS precordial, menos de 10 mm. ¿Adónde se ha ido la señal? Nombra las tres causas que se te ocurran primero y luego mira la solución.',
      ),
      reveal: l(
        '两个方向：**能发电的心肌变少**，或者**心肌与电极之间的东西变多**。这就是 QRS 低电压——标准：全部肢体导联 QRS 振幅 <5 mm，和/或全部胸导联 <10 mm。本图本身说不出病因——心率 80 次/分、没有电交替、没有肺型 P 波，只剩“小”这一条线索；所以要背阶梯：心包积液、肥胖、肺气肿（COPD）、甲状腺功能减退、浸润性心肌病（淀粉样变）、严重心肌疾病。低电压从来不是最终诊断——它的价值在于逼你问"为什么"。',
        'Two directions: **less myocardium generating the signal**, or **more material between it and the electrodes**. This is low QRS voltage — definition: all limb-lead QRS amplitudes <5 mm, and/or all precordial QRS amplitudes <10 mm. This tracing does not name its own cause — rate 80/min, no alternans, no P pulmonale, nothing but smallness — which is why you need the ladder: pericardial effusion, obesity, emphysema (COPD), hypothyroidism, infiltrative cardiomyopathy (amyloid), severe myocardial disease. Low voltage is never a final diagnosis — its value is forcing the question "why?".',
        'Dos direcciones: **menos miocardio que genera la señal** o **más tejido entre él y los electrodos**. Esto es bajo voltaje del QRS: todas las amplitudes del QRS en extremidades <5 mm y/o todas en precordiales <10 mm. Este trazado no dice su causa (80 lpm, sin alternancia, sin P pulmonar: solo queda lo pequeño), y por eso necesitas la escalera: derrame pericárdico, obesidad, enfisema (EPOC), hipotiroidismo, miocardiopatía infiltrativa (amiloide), miocardiopatía grave. El bajo voltaje nunca es un diagnóstico final: su valor es obligarte a preguntar «¿por qué?».',
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
          marks: [{ auto: 'r', lead: 'II' }, { auto: 'q', lead: 'aVR' }],
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
      kind: 'film',
      title: l('信号去哪儿了', 'Where the signal goes', 'Adónde va la señal'),
      view: GRID,
      frames: [
        {
          label: l('正常', 'Normal', 'Normal'),
          ecg: NORMAL,
          note: l(
            '肢体导联最大的 QRS 约 8.5 mm（II），胸导联最大约 18 mm（V3）。',
            'The largest limb-lead QRS is about 8.5 mm (II), the largest chest QRS about 18 mm (V3).',
            'El QRS mayor de las extremidades mide unos 8,5 mm (II) y el mayor precordial unos 18 mm (V3).',
          ),
          marks: [{ auto: 'r', lead: 'II' }, { auto: 'r', lead: 'V3' }],
        },
        {
          label: l('低电压', 'Low voltage', 'Bajo voltaje'),
          ecg: LOW,
          note: l(
            'QRS 形状不变，每个导联都缩到一半以下：肢体导联全部 <5 mm（II 约 4 mm），胸导联全部 <10 mm（V3 约 8 mm）。',
            'Same QRS shapes, every lead under half the size: all limb leads <5 mm (II about 4 mm), all chest leads <10 mm (V3 about 8 mm).',
            'Mismas formas del QRS, todas las derivaciones a menos de la mitad: extremidades todas <5 mm (II unos 4 mm), precordiales todas <10 mm (V3 unos 8 mm).',
          ),
          marks: [{ auto: 'r', lead: 'II' }, { auto: 'r', lead: 'V3' }],
        },
        {
          label: l('肥胖', 'Obesity', 'Obesidad'),
          ecg: synth('low-voltage', 1261, { rate: 80 }, 'obesity'),
          note: l(
            '脂肪：一样小（V3 约 8 mm），电轴向左转到约 −15°。',
            'Fat: just as small (V3 about 8 mm), and the axis turns left to about −15°.',
            'Grasa: igual de pequeño (V3 unos 8 mm) y el eje gira a la izquierda hasta unos −15°.',
          ),
          marks: [{ auto: 'r', lead: 'V3' }],
        },
        {
          label: l('肺气肿', 'Emphysema', 'Enfisema'),
          ecg: EMPHYSEMA,
          note: l(
            '空气：同样小，电轴垂直（约 +80°），I 导联几乎没有 QRS（约 1 mm）。问题在胸腔，不在心肌。',
            'Air: small too, with a vertical axis (about +80°) and almost no QRS in I (about 1 mm). The problem is the chest, not the myocardium.',
            'Aire: también pequeño, con eje vertical (unos +80°) y casi sin QRS en I (alrededor de 1 mm). El problema es el tórax, no el miocardio.',
          ),
          marks: [{ auto: 'r', lead: 'I' }, { auto: 'r', lead: 'aVF' }],
        },
      ],
      predict: {
        question: l(
          '在心脏和电极之间加一层脂肪、空气或液体，QRS 会怎样？',
          'Put a layer of fat, air or fluid between the heart and the electrodes. What happens to the QRS?',
          'Pon una capa de grasa, aire o líquido entre el corazón y los electrodos. ¿Qué le pasa al QRS?',
        ),
        options: [
          l('每个导联都变小', 'Smaller in every lead', 'Más pequeño en todas las derivaciones'),
          l('只有胸导联变小', 'Smaller in the chest leads only', 'Más pequeño solo en las precordiales'),
          l('变宽', 'Wider', 'Más ancho'),
        ],
        answer: 0,
      },
      caption: l(
        '小 QRS 有两条路：心脏与电极之间多了东西（脂肪、空气、心包或胸腔积液），或能发电的心肌变少（淀粉样变：壁厚而电压低）。低电压是线索，不是诊断。',
        'Two roads to a small QRS: something between heart and electrodes (fat, air, pericardial or pleural fluid), or less myocardium making the signal (amyloid: thick walls, low voltage). Low voltage is a clue, not a diagnosis.',
        'Dos caminos hacia un QRS pequeño: algo entre el corazón y los electrodos (grasa, aire, líquido pericárdico o pleural) o menos miocardio que genere la señal (amiloide: paredes gruesas, voltaje bajo). El bajo voltaje es una pista, no un diagnóstico.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'moving-paper', params: { gain: 5 } },
      ecg: PAPER,
      caption: l(
        '同一颗正常心脏，先按半增益（5 mm/mV）画：方波只有 5 mm，II 的 QRS 不到 5 mm。播放导览：10 mm/mV 起步，走一段 50 mm/s，再降到 5 mm/mV 又回到 10。先看方波，再谈低电压。',
        'The same normal heart, first drawn at half gain (5 mm/mV): the pulse is only 5 mm and the QRS in II under 5 mm. Play the tour: it starts at 10 mm/mV, runs a stretch at 50 mm/s, drops to 5 mm/mV and comes back to 10. Read the pulse before you call low voltage.',
        'El mismo corazón normal, dibujado primero a media ganancia (5 mm/mV): el pulso mide solo 5 mm y el QRS de II, menos de 5 mm. Reproduce el recorrido: empieza a 10 mm/mV, pasa un tramo a 50 mm/s, baja a 5 mm/mV y vuelve a 10. Mira el pulso antes de hablar de bajo voltaje.',
      ),
    },
    {
      kind: 'film',
      title: l('心包积液：心脏摆不摆？', 'Effusion: does the heart swing?', 'Derrame: ¿oscila el corazón?'),
      view: { layout: 'strip', lead: 'V3' },
      frames: [
        {
          label: l('积液', 'Effusion', 'Derrame'),
          ecg: synth('pericardial-effusion', 1265, { rate: 106 }),
          note: l(
            'V3 的 QRS 小（约 7.5 mm），窦性心动过速约 106 次/分，每一跳都一样大：没有电交替。',
            'A small QRS in V3 (about 7.5 mm), sinus tachycardia at about 106/min, every beat the same size: no alternans.',
            'QRS pequeño en V3 (unos 7,5 mm), taquicardia sinusal de unos 106 lpm y todos los latidos iguales: sin alternancia.',
          ),
          marks: [{ auto: 'rr' }],
        },
        {
          label: l('电交替', 'Alternans', 'Alternancia'),
          ecg: synth('electrical-alternans', 1264, { rate: 112 }),
          note: l(
            'QRS 一跳高（约 16 mm）、一跳低（约 6 mm），逐搏交替：电交替。心脏在大量积液里摆动，心率约 110 次/分。',
            'The QRS is tall one beat (about 16 mm) and small the next (about 6 mm): electrical alternans. The heart swings in a large effusion, at about 110/min.',
            'El QRS es alto en un latido (unos 16 mm) y pequeño en el siguiente (unos 6 mm): alternancia eléctrica. El corazón oscila en un derrame grande, a unos 110 lpm.',
          ),
          marks: [{ auto: 'r', lead: 'V3', beat: 8 }, { auto: 'r', lead: 'V3', beat: 9 }],
        },
      ],
      caption: l(
        '电交替要积液大到心脏摆得起来：有它分量重，没有它什么也排除不了。低电压 + 电交替 + 窦速让压塞更可能，但压塞是临床诊断。',
        'Alternans needs an effusion big enough for the heart to swing: its presence weighs heavily, its absence excludes nothing. Low voltage + alternans + sinus tachycardia make tamponade more likely, but tamponade is a clinical diagnosis.',
        'La alternancia exige un derrame tan grande que el corazón oscile: su presencia pesa mucho y su ausencia no excluye nada. Bajo voltaje + alternancia + taquicardia sinusal hacen más probable el taponamiento, pero este es un diagnóstico clínico.',
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
        '三份真实的低电压心电图：77 岁男性、62 岁女性、71 岁女性。先确认定准电压，再逐份定下"低电压 + 你最看好的两个病因"（别忘了节律：其中一份不是窦性），然后揭晓。真实病例没有合成图那样干净的答案——病因最终要靠临床与超声去定。',
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
          '只在 II 导联节律条上找电交替：心脏朝前胸摆动，交替在 V2–V4 最大，低电压的肢体导联里可能只有约 1 mm。',
          'Looking for alternans only on the lead II rhythm strip: the heart swings towards the front of the chest, so the alternation is largest in V2–V4 and may be only about 1 mm in the low-voltage limb leads.',
          'Buscar la alternancia solo en la tira de ritmo de II: el corazón oscila hacia la cara anterior del tórax, así que la alternancia es máxima en V2-V4 y en las derivaciones de miembros, de bajo voltaje, puede ser de solo alrededor de 1 mm.',
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
