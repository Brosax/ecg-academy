/**
 * S3 — Sinus rhythm and sinus arrhythmia (docs/PLAN.md §3, stage S).
 * Criteria: docs/curriculum/criteria.md `sinus-p-polarity` (current value, the book's list is wrong), `sinus-pr-rate-rr`
 * (sinus rhythm is defined by the P origin, not the PR), `p-wave-normal`, "Sinus node rhythms".
 */
import { l } from '../../core/l10n';
import type { EcgSource, Item } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});
const STRIP = { layout: 'strip', lead: 'II' } as const;

const longPr: Item = {
  id: 's3:long-pr-still-sinus',
  family: 'sinus',
  competency: 'C3',
  difficulty: 'classic',
  seed: 0,
  kind: 'choice',
  prompt: l(
    '这份心电图的 PR 间期约 220 ms。它还是窦性心律吗？',
    'The PR interval on this ECG is about 220 ms. Is it still sinus rhythm?',
    'El intervalo PR de este ECG mide unos 220 ms. ¿Sigue siendo ritmo sinusal?',
  ),
  ecg: synth('athlete', 311, undefined, 'first-degree'),
  explanation: l(
    '是。窦性心律由 P 波的来源决定：I、II、aVF 直立、aVR 倒置的 P 波，规则地出现在每个 QRS 之前。PR > 200 ms 只是另外加一个诊断：窦性心动过缓伴一度房室传导阻滞（在训练有素的运动员中属于训练相关改变）。交界性心律的 P 波在 II、III、aVF 倒置，紧贴 QRS 甚至看不见，而不是直立的 P 波加一个长 PR。',
    'Yes. Sinus rhythm is defined by where the P wave comes from: a P upright in I, II and aVF and inverted in aVR, regularly before every QRS. A PR > 200 ms simply adds a second statement: sinus bradycardia with first-degree AV block (a training-related finding in a trained athlete). A junctional rhythm would show a P that is negative in II, III and aVF, close to the QRS or hidden in it — not an upright P with a long PR.',
    'Sí. El ritmo sinusal se define por el origen de la onda P: una P positiva en I, II y aVF y negativa en aVR, de forma regular antes de cada QRS. Un PR > 200 ms solo añade un segundo diagnóstico: bradicardia sinusal con bloqueo AV de primer grado (un hallazgo relacionado con el entrenamiento en un deportista). Un ritmo de la unión mostraría una P negativa en II, III y aVF, pegada al QRS u oculta en él, no una P positiva con un PR largo.',
  ),
  findings: ['sinus-bradycardia', 'av-block-1'],
  key: {
    options: [
      { id: 'yes', label: l('是：窦性心动过缓伴 PR 延长（一度房室传导阻滞）', 'Yes: sinus bradycardia with a long PR (first-degree AV block)', 'Sí: bradicardia sinusal con PR largo (bloqueo AV de primer grado)') },
      { id: 'no', label: l('不是：PR 延长就排除了窦性心律', 'No: a long PR rules out sinus rhythm', 'No: un PR largo descarta el ritmo sinusal') },
      { id: 'junctional', label: l('不是：PR 这么长，说明冲动来自房室交界区', 'No: a PR this long means the impulse comes from the AV junction', 'No: un PR tan largo indica que el impulso nace en la unión AV') },
    ],
    correct: 'yes',
  },
};

const lesson: Lesson = {
  id: 's3',
  stage: 'S',
  order: 3,
  title: l('窦性心律与窦性心律不齐', 'Sinus rhythm and sinus arrhythmia', 'Ritmo sinusal y arritmia sinusal'),
  summary: l(
    '窦性心律由 P 波的来源决定：I、II、aVF 直立、aVR 倒置的 P 波规则地出现在每个 QRS 之前。窦性心律不齐是正常现象。',
    'Sinus rhythm is defined by where the P wave comes from: a P upright in I, II and aVF and inverted in aVR, regularly before every QRS. Sinus arrhythmia is normal.',
    'El ritmo sinusal se define por el origen de la onda P: una P positiva en I, II y aVF y negativa en aVR, de forma regular antes de cada QRS. La arritmia sinusal es normal.',
  ),
  objectives: [
    l('用 I、II、aVF 和 aVR 的 P 波判断是否为窦性心律。', 'Decide whether a rhythm is sinus from the P wave in I, II, aVF and aVR.', 'Decidir si un ritmo es sinusal por la onda P en I, II, aVF y aVR.'),
    l('用分规测 PP，识别窦性心律不齐并认定其为正常。', 'Recognise sinus arrhythmia by marching the PP, and accept it as normal.', 'Reconocer la arritmia sinusal recorriendo el PP con el compás y aceptarla como normal.'),
    l('把窦性心律不齐与心房颤动区分开。', 'Tell sinus arrhythmia from atrial fibrillation.', 'Distinguir la arritmia sinusal de la fibrilación auricular.'),
  ],
  minutes: 12,
  competencies: ['C3'],
  findings: ['sinus-rhythm', 'sinus-arrhythmia', 'sinus-bradycardia', 'sinus-tachycardia'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('sinus-arrhythmia', 301, { hrv: 0.15 }),
      view: STRIP,
      question: l(
        '这条节律条的 RR 间期长短不一。这个节律异常吗？想好你会怎么报告。',
        'The RR intervals on this strip vary. Is the rhythm abnormal? Decide what you would report.',
        'Los intervalos RR de esta tira varían. ¿Es anormal el ritmo? Decide qué pondrías en el informe.',
      ),
      reveal: l(
        '每个 QRS 前都是**同样的直立 P 波、同样的 PR**。只有 PP 间期在平滑地变长、变短（这里约 730–990 ms）：**窦性心律不齐**，通常与呼吸有关——这是正常现象，年轻人尤其常见。',
        'Every QRS is preceded by **the same upright P wave at the same PR**. Only the PP interval changes, lengthening and shortening smoothly (here from about 730 to 990 ms): **sinus arrhythmia**, usually respiratory. It is a normal finding, especially in young people.',
        'Cada QRS va precedido de **la misma onda P positiva con el mismo PR**. Solo cambia el intervalo PP, que se alarga y se acorta de forma gradual (aquí de unos 730 a 990 ms): **arritmia sinusal**, habitualmente respiratoria. Es un hallazgo normal, sobre todo en jóvenes.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('normal', 302, { rate: 70 }),
      showConduction: true,
      emphasize: ['sa-node', 'ra', 'la'],
      caption: l(
        '播放一个心动周期。窦房结位于右心房上部，激动向下、向左扩布到两个心房。这个方向（约 +50°）使窦性 P 波在 I、II、aVF 直立，在 aVR 倒置。',
        'Play one beat. The sinus node sits high in the right atrium, and activation spreads down and to the left across both atria. That direction (about +50°) makes the sinus P upright in I, II and aVF and inverted in aVR.',
        'Reproduce un latido. El nodo sinusal está en la parte alta de la aurícula derecha y la activación se propaga hacia abajo y a la izquierda por ambas aurículas. Esa dirección (unos +50°) hace que la P sinusal sea positiva en I, II y aVF y negativa en aVR.',
      ),
    },
    {
      kind: 'text',
      title: l('什么决定窦性心律', 'What makes a rhythm sinus', 'Qué hace que un ritmo sea sinusal'),
      body: l(
        '窦性心律由 **P 波的来源**决定，而不是由 PR 或心率决定：\n- P 波形态符合窦性：I、II、aVF 直立，aVR 倒置（V1 常为正负双向）；\n- P 波电轴在 0° 至 +75° 之间；\n- PP 间期规则（窦性心律不齐除外）。\n窦性心律伴 PR 延长（一度房室传导阻滞）仍然是窦性心律。III 和 aVL 的窦性 P 波可以直立、低平或倒置。',
        'Sinus rhythm is defined by **where the P wave comes from**, not by the PR or the rate:\n- a P wave of sinus shape: upright in I, II and aVF, inverted in aVR (often biphasic in V1);\n- a P axis between 0° and +75°;\n- a regular PP interval, apart from sinus arrhythmia.\nSinus rhythm with a long PR (first-degree AV block) is still sinus rhythm. In III and aVL a sinus P may be upright, flat or negative.',
        'El ritmo sinusal se define por **el origen de la onda P**, no por el PR ni por la frecuencia:\n- una P de morfología sinusal: positiva en I, II y aVF, negativa en aVR (a menudo bifásica en V1);\n- un eje de la P entre 0° y +75°;\n- un intervalo PP regular, salvo la arritmia sinusal.\nUn ritmo sinusal con PR largo (bloqueo AV de primer grado) sigue siendo sinusal. En III y aVL la P sinusal puede ser positiva, plana o negativa.',
      ),
    },
    {
      kind: 'criteria',
      title: l('窦性心律及其变化', 'Sinus rhythm and its variations', 'El ritmo sinusal y sus variaciones'),
      items: [
        {
          label: l('窦性 P 波', 'Sinus P wave', 'Onda P sinusal'),
          value: l('I、II、aVF 直立；aVR 倒置；III、aVL 可变；V1 常为正负双向', 'Upright in I, II, aVF; inverted in aVR; III and aVL variable; often +/− in V1', 'Positiva en I, II, aVF; negativa en aVR; III y aVL variables; a menudo +/− en V1'),
        },
        { label: l('P 波电轴', 'P axis', 'Eje de la P'), value: l('0° 至 +75°', '0° to +75°', '0° a +75°') },
        { label: l('P 波时限与振幅', 'P duration and amplitude', 'Duración y amplitud de la P'), value: l('< 120 ms；II 导联 < 2.5 mm', '< 120 ms; < 2.5 mm in lead II', '< 120 ms; < 2,5 mm en la derivación II') },
        { label: l('窦性心率（惯例）', 'Sinus rate (convention)', 'Frecuencia sinusal (convención)'), value: l('60–100 次/分', '60–100/min', '60–100 lpm') },
        {
          label: l('窦性心动过缓', 'Sinus bradycardia', 'Bradicardia sinusal'),
          value: l('< 60 次/分（惯例）；< 50 次/分有临床意义', '< 60/min (convention); < 50/min clinically significant', '< 60 lpm (convención); < 50 lpm clínicamente relevante'),
        },
        { label: l('窦性心动过速', 'Sinus tachycardia', 'Taquicardia sinusal'), value: l('> 100 次/分', '> 100/min', '> 100 lpm') },
        {
          label: l('窦性心律不齐', 'Sinus arrhythmia', 'Arritmia sinusal'),
          value: l('P 波形态不变，PP 变化 > 120 ms 或 > 平均 PP 的 10%（无统一指南界值）', 'Same P shape; PP varies by > 120 ms or > 10 % of the mean PP (no single guideline value)', 'Misma morfología de la P; el PP varía > 120 ms o > 10 % del PP medio (no hay un valor único de guía)'),
        },
      ],
      source: 'Mason JW et al. Circulation 2007;115:1325 (Part II); Page RL et al. 2015 ACC/AHA/HRS SVT guideline, Circulation 2016;133:e506; Kusumoto FM et al. Circulation 2019;140:e382; Hancock EW et al. Circulation 2009;119:e251 (Part V)',
    },
    {
      kind: 'worked',
      title: l('是不是窦性？问四个问题', 'Is it sinus? Ask four questions', '¿Es sinusal? Haz cuatro preguntas'),
      ecg: synth('sinus-arrhythmia', 303, { hrv: 0.14 }),
      steps: [
        {
          title: l('找 P 波', 'Find the P wave', 'Busca la onda P'),
          body: l('II 导联最容易看清 P 波。每个 QRS 前都有一个吗？', 'Lead II shows P waves best. Is there one before every QRS?', 'La derivación II es la que mejor muestra la onda P. ¿Hay una antes de cada QRS?'),
          marks: [{ auto: 'p' }],
          highlightLeads: ['II'],
        },
        {
          title: l('看 P 波方向', 'Check its direction', 'Mira su dirección'),
          body: l(
            'I、II、aVF 直立，aVR 倒置：心房从右上向左下激动，起源于窦房结。',
            'Upright in I, II and aVF, inverted in aVR: the atria are activated from top right to bottom left, so the impulse starts in the sinus node.',
            'Positiva en I, II y aVF, negativa en aVR: las aurículas se activan de arriba a la derecha hacia abajo a la izquierda, así que el impulso nace en el nodo sinusal.',
          ),
          marks: [{ auto: 'p', lead: 'II' }, { auto: 'p', lead: 'aVR' }],
          highlightLeads: ['I', 'II', 'aVF', 'aVR'],
        },
        {
          title: l('每搏 PR 相同', 'The same PR every beat', 'El mismo PR en cada latido'),
          body: l('PR 恒定（这里约 160 ms）：每个 P 波以相同的延迟下传。', 'The PR is constant (here about 160 ms): every P conducts with the same delay.', 'El PR es constante (aquí unos 160 ms): cada P conduce con el mismo retraso.'),
          marks: [{ auto: 'pr' }],
        },
        {
          title: l('用分规测 PP', 'March out the PP', 'Recorre el PP con el compás'),
          body: l(
            '把分规卡在一个间期上，沿节律条移动：间期平滑地变长又变短，差值 > 120 ms。P 波相同、PR 相同、PP 变化：**窦性心律不齐**。',
            'Set the calipers on one interval and walk them along the strip: it lengthens and shortens smoothly, by more than 120 ms. Same P, same PR, varying PP: **sinus arrhythmia**.',
            'Ajusta el compás a un intervalo y recórrelo a lo largo de la tira: se alarga y se acorta de forma gradual, más de 120 ms. Misma P, mismo PR, PP variable: **arritmia sinusal**.',
          ),
          marks: [{ auto: 'rr' }],
          view: { layout: 'strip', lead: 'II', calipers: true },
        },
      ],
    },
    {
      kind: 'live',
      scenario: 'sinus-arrhythmia',
      seed: 304,
      dials: [{ id: 'hrv' }],
      view: STRIP,
      marks: [{ auto: 'p' }, { auto: 'pr' }],
      caption: l(
        '加大变异度：PP 间期摆动更大，但 P 波和 PR 保持不变。窦房结只是在吸气时加快、呼气时减慢。',
        'Increase the variability: the PP interval swings more, but the P wave and the PR stay the same. The sinus node simply speeds up with inspiration and slows with expiration.',
        'Aumenta la variabilidad: el PP oscila más, pero la onda P y el PR no cambian. El nodo sinusal simplemente se acelera en la inspiración y se frena en la espiración.',
      ),
    },
    {
      kind: 'contrast',
      title: l('不规则：窦性还是不是？', 'Irregular: sinus or not?', 'Irregular: ¿sinusal o no?'),
      view: STRIP,
      left: { ecg: synth('sinus-arrhythmia', 305, { hrv: 0.16 }), caption: l('II 导联，10 秒', 'Lead II, 10 s', 'Derivación II, 10 s') },
      right: { ecg: synth('atrial-fibrillation', 306), caption: l('II 导联，10 秒', 'Lead II, 10 s', 'Derivación II, 10 s') },
      point: l(
        '先找每个 QRS 前的 P 波。A：每个 QRS 前都有同样的 P 波，RR 逐渐变化、周而复始。B：完全没有 P 波，基线是不规则的颤动波，RR 毫无规律（绝对不规则）：心房颤动，不是窦性。',
        'Look for a P before every QRS. A: the same P precedes every QRS and the RR changes gradually, in a repeating cycle. B: no P waves at all, an uneven fibrillating baseline and RR intervals with no pattern (irregularly irregular): atrial fibrillation, not sinus.',
        'Busca una P antes de cada QRS. A: la misma P precede a cada QRS y el RR cambia de forma gradual, en un ciclo que se repite. B: no hay ondas P, la línea de base es una oscilación irregular y los RR no siguen ningún patrón (irregularmente irregulares): fibrilación auricular, no sinusal.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('sinus-tachycardia', 307, { rate: 140 }),
      view: STRIP,
      // the T wave of one beat and the P wave of the next: at 140/min the P starts before that T has ended
      marks: [{ auto: 't', beat: 10 }, { auto: 'p', beat: 11 }],
      caption: l(
        '140 次/分时，P 波骑在前一个 T 波的末端。先找到它，再决定一个快速节律是不是“非窦性”。窦性心动过速是一种描述，要问的是“为什么”（发热、疼痛、出血、缺氧……）。',
        'At 140/min the P wave rides on the end of the previous T wave. Find it before you call a fast rhythm “not sinus”. Sinus tachycardia is a description; the question is why (fever, pain, bleeding, hypoxia…).',
        'A 140 lpm la onda P cabalga sobre el final de la T anterior. Búscala antes de llamar “no sinusal” a un ritmo rápido. La taquicardia sinusal es una descripción; la pregunta es por qué (fiebre, dolor, sangrado, hipoxia…).',
      ),
    },
    { kind: 'check', item: { family: 'sinus', seed: 30 } },
    { kind: 'check', item: { family: 'sinus', seed: 9 } },
    { kind: 'check', item: { inline: longPr } },
    { kind: 'check', item: { family: 'sinus', seed: 2 } },
    { kind: 'drill', families: ['sinus'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [16233, 2084, 21589],
      caption: l(
        '其中两份有窦性心律不齐，一份是规则的窦性心律。先看 II 和 aVR 的 P 波，再用分规测 PP，然后揭晓。',
        'Two of these show sinus arrhythmia and one a regular sinus rhythm. Check the P in II and aVR, march the PP, then reveal.',
        'Dos de ellos muestran arritmia sinusal y uno un ritmo sinusal regular. Mira la P en II y aVR, recorre el PP con el compás y después mira la solución.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l('没找 P 波就把不规则节律叫作“房颤”。', 'Calling an irregular rhythm “AF” without looking for P waves.', 'Llamar “FA” a un ritmo irregular sin buscar ondas P.'),
        l('要求 PR 正常才算窦性：窦性心律伴一度房室传导阻滞仍是窦性。', 'Requiring a normal PR for sinus rhythm: sinus rhythm with first-degree AV block is still sinus.', 'Exigir un PR normal para el ritmo sinusal: un ritmo sinusal con bloqueo AV de primer grado sigue siendo sinusal.'),
        l('因为 III 或 aVL 的 P 波倒置就判为异位：这是允许的，关键导联是 I、II、aVF 和 aVR。', 'Calling a negative P in III or aVL “ectopic”: that is allowed; the key leads are I, II, aVF and aVR.', 'Llamar “ectópica” a una P negativa en III o aVL: es aceptable; las derivaciones clave son I, II, aVF y aVR.'),
        l('心率快时漏看藏在 T 波里的 P 波。', 'Missing a P wave hidden in the T wave at fast rates.', 'No ver una P escondida en la T con frecuencias rápidas.'),
        l('跳过记录检查：左右手电极接反会使 I 导联 P 波倒置、aVR 直立——假的“异位心律”。', 'Skipping the recording check: reversed arm cables make the P negative in I and upright in aVR, a fake “ectopic” rhythm.', 'Saltarse la comprobación del registro: con los cables de los brazos invertidos la P es negativa en I y positiva en aVR, un falso ritmo “ectópico”.'),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('窦性 = 每个 QRS 前有窦性形态的 P 波（I、II、aVF 直立，aVR 倒置），PP 规则。', 'Sinus = a P of sinus shape (upright I, II, aVF; inverted aVR) before every QRS, with a regular PP.', 'Sinusal = una P de morfología sinusal (positiva en I, II, aVF; negativa en aVR) antes de cada QRS, con PP regular.'),
        l('PR 不决定是否窦性。', 'The PR does not decide whether a rhythm is sinus.', 'El PR no decide si un ritmo es sinusal.'),
        l('窦性心律不齐：P 相同、PR 相同、PP 平滑变化（> 120 ms），是正常现象。', 'Sinus arrhythmia: same P, same PR, a PP that varies smoothly (> 120 ms); it is normal.', 'Arritmia sinusal: misma P, mismo PR, PP que varía de forma gradual (> 120 ms); es normal.'),
        l('不规则且没有 P 波就不是窦性：想到心房颤动。', 'Irregular with no P waves is not sinus: think of atrial fibrillation.', 'Irregular y sin ondas P no es sinusal: piensa en fibrilación auricular.'),
      ],
    },
  ],
  sources: [
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Page RL et al. 2015 ACC/AHA/HRS Guideline for the management of adult patients with supraventricular tachycardia. Circulation 2016;133:e506-e574',
    'Kusumoto FM et al. 2018 ACC/AHA/HRS Guideline on bradycardia and cardiac conduction delay. Circulation 2019;140:e382-e482',
    'Hancock EW et al. AHA/ACCF/HRS Part V: ECG changes associated with cardiac chamber hypertrophy. Circulation 2009;119:e251-e261',
    'Castellano et al. 2004',
  ],
};

export default lesson;
