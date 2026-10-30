/**
 * Atlas entries — category `conduction`. Schema and authoring rules: src/atlas/schema.ts. Values: docs/curriculum/criteria.md
 * (sections av-blocks-sinus-node, bundle-branch-fascicular-blocks, preexcitation-wpw). Current framing: 2:1 AV block is its
 * own category; "high-grade" = ≥ 2 consecutive blocked P waves; strict LBBB (Strauss) beside the AHA 2009 criteria;
 * fascicular block (never "hemiblock"); "trifascicular" only for ECG evidence of all three fascicles (alternating BBB);
 * short PR without delta is enhanced AV-nodal conduction, not a syndrome.
 */
import { l } from '../../core/l10n';
import { REF } from '../refs';
import type { AtlasEntry } from '../schema';

/** Full references not (yet) in ../refs.ts — short forms go in each criterion's `source`. */
const R = {
  glikson2021:
    'Glikson M et al. 2021 ESC Guidelines on cardiac pacing and cardiac resynchronization therapy. Eur Heart J 2021;42:3427–3520.',
  barold2001: 'Barold SS, Hayes DL. Second-degree atrioventricular block: a reappraisal. Mayo Clin Proc 2001;76:44–57.',
  strauss2011:
    'Strauss DG, Selvester RH, Wagner GS. Defining left bundle branch block in the era of cardiac resynchronization therapy. Am J Cardiol 2011;107:927–934.',
  mcdonagh2021:
    'McDonagh TA et al. 2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure. Eur Heart J 2021;42:3599–3726.',
  escSvt2019:
    'Brugada J et al. 2019 ESC Guidelines for the management of patients with supraventricular tachycardia. Eur Heart J 2020;41:655–720.',
  cohen2012:
    'Cohen MI et al. PACES/HRS expert consensus statement on the management of the asymptomatic young patient with a Wolff-Parkinson-White electrocardiographic pattern. Heart Rhythm 2012;9:1006–1024.',
  brugada1991:
    'Brugada P et al. A new approach to the differential diagnosis of a regular tachycardia with a wide QRS complex. Circulation 1991;83:1649–1659.',
  elizari2013:
    'Elizari MV, Baranchuk A, Chiale PA. Masquerading bundle branch block: a variety of right bundle branch block with left anterior fascicular block. Expert Rev Cardiovasc Ther 2013;11:69–75.',
  brignole2018: 'Brignole M et al. 2018 ESC Guidelines for the diagnosis and management of syncope. Eur Heart J 2018;39:1883–1948.',
  gertsch1988:
    'Gertsch M et al. Electrocardiographic detection of left ventricular hypertrophy in the presence of left anterior fascicular block. Am J Cardiol 1988;61:1098–1101.',
  bayes2012brugada:
    'Bayés de Luna A et al. Current electrocardiographic criteria for diagnosis of Brugada pattern: a consensus report. J Electrocardiol 2012;45:433–442.',
} as const;

export const entries: readonly AtlasEntry[] = [
  // ── AV conduction ────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'av-block-1',
    definition: l(
      'PR间期>200 ms，每个P波均下传（1:1）。',
      'PR interval > 200 ms with every P wave conducted (1:1).',
      'Intervalo PR > 200 ms con todas las ondas P conducidas (1:1).',
    ),
    features: [
      l('每个搏动的PR恒定且>200 ms（超过一个大格）。', 'A constant PR > 200 ms (more than one large square) on every beat.', 'Un PR constante > 200 ms (más de un cuadro grande) en todos los latidos.'),
      l(
        '每个P波后都有QRS——没有被阻滞的P波，“房室延迟”是更准确的名称。',
        'Every P is followed by a QRS — nothing is blocked, so “AV delay” is the more accurate name.',
        'Cada P va seguida de un QRS: no se bloquea ninguna, así que «retraso AV» es el nombre más preciso.',
      ),
      l(
        'QRS窄且PR>300 ms多为房室结延迟；伴束支阻滞时延迟可能在结下。',
        'A narrow QRS with PR > 300 ms usually means AV-nodal delay; with bundle branch block the delay may be infranodal.',
        'Un QRS estrecho con PR > 300 ms suele indicar retraso en el nodo AV; con bloqueo de rama el retraso puede ser infranodal.',
      ),
      l('PR很长时P波可能藏在前一个T波内——仔细寻找。', 'With a very long PR the P can hide in the preceding T wave — look for it.', 'Con un PR muy largo la P puede esconderse en la T anterior: búscala.'),
    ],
    criteria: [
      {
        label: l('成人', 'Adults', 'Adultos'),
        value: l('PR>200 ms，1:1下传', 'PR > 200 ms with 1:1 conduction', 'PR > 200 ms con conducción 1:1'),
        source: 'Kusumoto 2018 (ACC/AHA/HRS bradycardia)',
      },
      {
        label: l('运动员', 'Athletes', 'Deportistas'),
        value: l('PR<400 ms属训练相关的正常表现；≥400 ms需评估', 'PR < 400 ms is a normal training effect; ≥ 400 ms needs evaluation', 'PR < 400 ms es un efecto normal del entrenamiento; ≥ 400 ms requiere estudio'),
        source: 'Sharma 2017 (international athlete criteria)',
      },
      {
        label: l('儿童', 'Children', 'Niños'),
        value: l('使用按年龄和心率的正常值表', 'Use age- and rate-specific normal tables', 'Usa tablas de normalidad por edad y frecuencia'),
        source: 'Rijnbeek 2001',
      },
      {
        label: l('显著延长且有症状', 'Marked and symptomatic', 'Marcado y sintomático'),
        value: l('PR>300 ms伴类起搏器综合征症状时起搏为Ⅱa类', 'PR > 300 ms with pacemaker-syndrome-like symptoms: pacing is class IIa', 'PR > 300 ms con síntomas similares al síndrome de marcapasos: estimulación de clase IIa'),
        source: 'Kusumoto 2018; Glikson 2021',
      },
    ],
    mechanism: l(
      '通过房室结（少数为希氏-浦肯野系统）的传导减慢但从不中断，每个心房冲动都延迟到达心室。延长的时间在心电图上表现为更长的PR段。',
      'Conduction through the AV node (rarely the His–Purkinje system) is slowed but never fails, so every atrial impulse reaches the ventricles late. The extra time shows on the ECG as a longer isoelectric PR segment.',
      'La conducción por el nodo AV (rara vez por el sistema de His-Purkinje) se enlentece pero nunca falla, así que cada impulso auricular llega tarde a los ventrículos. Ese tiempo extra aparece en el ECG como un segmento PR isoeléctrico más largo.',
    ),
    mimics: [
      {
        id: 'av-block-2-mobitz1',
        discriminator: l('此处PR恒定；文氏阻滞时PR逐渐延长直到一个P波未下传。', 'Here the PR is constant; in Wenckebach the PR lengthens until a P is not conducted.', 'Aquí el PR es constante; en el Wenckebach el PR se alarga hasta que una P no se conduce.'),
        leads: ['II'],
      },
      {
        id: 'av-block-2-2to1',
        discriminator: l(
          '此处每个QRS前只有一个P波；2:1阻滞时两个QRS之间多一个P波（常藏在T波中）。',
          'Here there is one P per QRS; in 2:1 block a second P sits between the QRS complexes, often in the T wave.',
          'Aquí hay una P por QRS; en el bloqueo 2:1 una segunda P se sitúa entre los QRS, a menudo dentro de la T.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'av-dissociation',
        discriminator: l('此处PR固定；房室分离时“PR”逐搏变化。', 'Here the PR is fixed; in AV dissociation the “PR” changes from beat to beat.', 'Aquí el PR es fijo; en la disociación AV el «PR» cambia de un latido a otro.'),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l(
        '只在P波起始不清楚的单一导联测量PR——应取各导联中最早的P波起点。',
        'Measuring the PR in a single lead where the P onset is unclear — take the earliest P onset across leads.',
        'Medir el PR en una sola derivación en la que el inicio de la P no se ve bien: toma el inicio más precoz de la P en todas las derivaciones.',
      ),
      l('把藏在前一个T波中的P波漏掉而称为“交界性心律”。', 'Missing a P hidden in the preceding T and calling the rhythm “junctional”.', 'No ver una P escondida en la T previa y llamar al ritmo «de la unión».'),
    ],
    lessons: ['r3'],
    sources: [REF.kusumoto2018, REF.sharma2017, REF.rijnbeek2001, R.glikson2021],
    aka: ['1st degree AV block', 'AV delay', 'long PR', 'PR largo', 'BAV de primer grado', '一度房室阻滞'],
    exemplar: { scenarios: ['av-block-1'], layout: '3x4+1', lead: 'II', leads: ['II'] },
  },
  {
    id: 'av-block-2-mobitz1',
    definition: l(
      'PR逐搏延长直至一个P波不能下传的二度房室传导阻滞；长间歇后的第一个PR最短。',
      'Second-degree AV block in which the PR lengthens over successive beats until one P wave is not conducted, the first PR after the pause being the shortest.',
      'Bloqueo AV de segundo grado en el que el PR se alarga latido a latido hasta que una P no se conduce, y el primer PR tras la pausa es el más corto.',
    ),
    features: [
      l('PP恒定（心房率<100次/分）；有一个P波后无QRS。', 'Constant P–P (atrial rate < 100/min); one P is not followed by a QRS.', 'P-P constante (frecuencia auricular < 100 lpm); una P no va seguida de QRS.'),
      l(
        '被阻滞P波之前的PR长于其后的PR——这是最可靠的征象。',
        'The PR before the blocked P is longer than the PR after it — the most reliable sign.',
        'El PR anterior a la P bloqueada es más largo que el posterior: es el signo más fiable.',
      ),
      l(
        '典型：第2个搏动PR增量最大，RR逐渐缩短，长间歇<2×PP，成组搏动；不典型序列也很常见。',
        'Typical: the largest PR increment on the second beat, shortening R–R, a pause < 2 × P–P, group beating; atypical sequences are common.',
        'Típico: el mayor incremento del PR en el segundo latido, R-R que se acortan, pausa < 2 × P-P y latidos agrupados; las secuencias atípicas son frecuentes.',
      ),
      l(
        'QRS窄→几乎都在房室结；伴束支阻滞时可能是结下文氏。',
        'Narrow QRS → almost always in the AV node; with bundle branch block an infranodal Wenckebach is possible.',
        'QRS estrecho → casi siempre en el nodo AV; con bloqueo de rama es posible un Wenckebach infranodal.',
      ),
      l('常见于夜间、运动员和下壁心梗；通常为良性。', 'Common at night, in athletes and in inferior MI; usually benign.', 'Frecuente por la noche, en deportistas y en el infarto inferior; casi siempre benigno.'),
    ],
    criteria: [
      {
        label: l('莫氏Ⅰ型', 'Mobitz I', 'Mobitz I'),
        value: l('P波频率恒定；单个P波未下传；阻滞前后PR不等', 'Constant P rate; a single non-conducted P; PR not constant before and after it', 'Frecuencia de P constante; una sola P no conducida; PR no constante antes y después'),
        source: 'Kusumoto 2018 (ACC/AHA/HRS bradycardia)',
      },
      {
        label: l('关键征象', 'Key sign', 'Signo clave'),
        value: l('长间歇后第一个PR<长间歇前最后一个PR', 'First PR after the pause < last PR before it', 'Primer PR tras la pausa < último PR antes de ella'),
        source: 'Kusumoto 2018; Barold 2001',
      },
      {
        label: l('比例写法', 'Ratio notation', 'Notación de la relación'),
        value: l('P:QRS，如4:3=每4个P波阻滞1个', 'P : QRS, so 4:3 means one blocked P in four', 'P : QRS; 4:3 significa una P bloqueada de cada cuatro'),
        source: 'Kusumoto 2018',
      },
    ],
    mechanism: l(
      '房室结具有递减传导特性：冲动在其恢复期中越早到达，传导越慢，PR逐搏延长，直至某个冲动遇到房室结不应期而受阻。受阻的搏动使房室结得到充分休息，下一个PR重新变短，周期重新开始。',
      'The AV node conducts decrementally: each impulse that arrives earlier in its recovery is conducted more slowly, so the PR grows beat by beat until one impulse finds the node refractory. The blocked beat gives the node a full rest, so the next PR is short again and the cycle restarts.',
      'El nodo AV tiene conducción decremental: cada impulso que llega antes en su recuperación se conduce más despacio, así que el PR crece latido a latido hasta que un impulso encuentra el nodo refractario. El latido bloqueado da al nodo un descanso completo, por lo que el PR siguiente vuelve a ser corto y el ciclo se reinicia.',
    ),
    mimics: [
      {
        id: 'av-block-2-mobitz2',
        discriminator: l(
          '此处长间歇后的PR短于之前；莫氏Ⅱ型阻滞前后PR不变。',
          'Here the PR after the pause is shorter than before it; in Mobitz II the PR is the same before and after.',
          'Aquí el PR tras la pausa es más corto que antes; en el Mobitz II el PR es igual antes y después.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'pac-blocked',
        discriminator: l(
          '此处被阻滞的P波按时出现（PP恒定）；房早未下传时P′提前出现。',
          'Here the blocked P comes on time (constant P–P); a blocked PAC is early.',
          'Aquí la P bloqueada llega a su hora (P-P constante); la extrasístole auricular bloqueada llega antes de tiempo.',
        ),
        leads: ['II'],
      },
      {
        id: 'sa-exit-block',
        discriminator: l(
          '此处有P波而无QRS；窦房阻滞时整个P-QRS缺失，PR恒定。',
          'Here a P wave stands without a QRS; in SA block the whole P–QRS is missing and the PR is constant.',
          'Aquí hay una P sin QRS; en el bloqueo sinoauricular falta todo el P-QRS y el PR es constante.',
        ),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l('比较远离长间歇的PR——应比较长间歇前最后一个和其后第一个PR。', 'Comparing PR intervals far from the pause — compare the last PR before it and the first PR after it.', 'Comparar PR lejos de la pausa: compara el último PR antes de ella y el primero después.'),
      l('把2:1下传称为莫氏Ⅰ型或Ⅱ型。', 'Calling 2:1 conduction Mobitz I or Mobitz II.', 'Llamar Mobitz I o Mobitz II a una conducción 2:1.'),
      l('为无症状的房室结文氏阻滞植入起搏器。', 'Pacing an asymptomatic nodal Wenckebach.', 'Implantar un marcapasos por un Wenckebach nodal asintomático.'),
    ],
    lessons: ['r3', 'r8'],
    sources: [REF.kusumoto2018, R.barold2001, REF.sharma2017],
    aka: ['Wenckebach', 'Mobitz I', 'Mobitz type 1', 'type I second-degree', '文氏', '莫氏Ⅰ型'],
    exemplar: { scenarios: ['av-block-2-mobitz1'], layout: '3x4+1', lead: 'II', leads: ['II', 'V1'] },
  },
  {
    id: 'av-block-2-mobitz2',
    definition: l(
      '单个P波突然不能下传、而其前后下传搏动PR保持不变的二度房室传导阻滞。',
      'Second-degree AV block in which a single P wave suddenly fails to conduct while the PR of the conducted beats before and after it stays constant.',
      'Bloqueo AV de segundo grado en el que una sola P deja de conducirse de forma brusca mientras el PR de los latidos conducidos antes y después se mantiene constante.',
    ),
    features: [
      l('PP恒定（<100次/分）；一个按时出现的P波后无QRS。', 'Constant P–P (< 100/min); a P wave on time with no QRS after it.', 'P-P constante (< 100 lpm); una P a su hora sin QRS detrás.'),
      l('被阻滞P波前后的PR相同。', 'The PR is the same before and after the blocked P.', 'El PR es igual antes y después de la P bloqueada.'),
      l(
        'QRS多宽（束支阻滞或双分支阻滞）：阻滞位于结下（希氏-浦肯野系统）。',
        'The QRS is usually wide (BBB or bifascicular block): the block is infranodal (His–Purkinje).',
        'El QRS suele ser ancho (bloqueo de rama o bifascicular): el bloqueo es infranodal (His-Purkinje).',
      ),
      l('长间歇=2×PP；2:1下传不在此定义之内。', 'The pause = 2 × P–P; 2:1 conduction is excluded from this definition.', 'La pausa = 2 × P-P; la conducción 2:1 queda fuera de esta definición.'),
    ],
    criteria: [
      {
        label: l('莫氏Ⅱ型', 'Mobitz II', 'Mobitz II'),
        value: l('P波频率恒定；单个P波未下传；阻滞前后PR恒定', 'Constant P rate; a single non-conducted P; constant PR before and after it', 'Frecuencia de P constante; una sola P no conducida; PR constante antes y después'),
        source: 'Kusumoto 2018 (ACC/AHA/HRS bradycardia)',
      },
      {
        label: l('起搏', 'Pacing', 'Marcapasos'),
        value: l('排除可逆原因后，无论有无症状均为Ⅰ类', 'Class I regardless of symptoms once reversible causes are excluded', 'Clase I con independencia de los síntomas una vez descartadas causas reversibles'),
        source: 'Kusumoto 2018; Glikson 2021 (ESC pacing)',
      },
    ],
    mechanism: l(
      '希氏束或双侧束支病变使传导呈全或无：冲动要么以正常速度通过，要么完全受阻。由于没有逐渐疲劳的过程，PR保持固定，漏搏毫无先兆，同一病变组织还可连续多次失传导。',
      'Disease of the His bundle or both bundle branches makes conduction all-or-none: an impulse either crosses at normal speed or fails completely. Because there is no gradual fatigue, the PR stays fixed and the dropped beat comes without warning, and the same diseased tissue can fail for many beats in a row.',
      'La enfermedad del haz de His o de ambas ramas hace que la conducción sea de todo o nada: un impulso cruza a velocidad normal o falla por completo. Como no hay fatiga progresiva, el PR se mantiene fijo y el latido bloqueado llega sin aviso, y el mismo tejido enfermo puede fallar muchos latidos seguidos.',
    ),
    mimics: [
      {
        id: 'av-block-2-mobitz1',
        discriminator: l(
          '此处长间歇前后PR相同；文氏阻滞时长间歇后的PR明显缩短。',
          'Here the PR is identical before and after the pause; in Wenckebach the PR after the pause is clearly shorter.',
          'Aquí el PR es idéntico antes y después de la pausa; en el Wenckebach el PR posterior a la pausa es claramente más corto.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'pac-blocked',
        discriminator: l(
          '此处被阻滞的P波形态与其他P波相同且按时出现；房早未下传时P′提前且形态不同。',
          'Here the blocked P has the same shape as the others and comes on time; a blocked PAC is early and differently shaped.',
          'Aquí la P bloqueada tiene la misma forma que las demás y llega a su hora; la extrasístole auricular bloqueada es precoz y de otra forma.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'av-block-2-2to1',
        discriminator: l(
          '莫氏Ⅱ型需要连续两个下传搏动的PR可供比较；2:1下传无法分型。',
          'Mobitz II needs two consecutive conducted beats whose PR can be compared; 2:1 conduction cannot be typed.',
          'El Mobitz II exige dos latidos conducidos seguidos con PR comparables; la conducción 2:1 no se puede tipificar.',
        ),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l('长间歇后PR更短时仍诊断莫氏Ⅱ型（那是莫氏Ⅰ型）。', 'Diagnosing Mobitz II when the PR after the pause is shorter (that is Mobitz I).', 'Diagnosticar un Mobitz II cuando el PR tras la pausa es más corto (eso es un Mobitz I).'),
      l('漏掉提前出现的未下传房早。', 'Missing a premature non-conducted PAC.', 'Pasar por alto una extrasístole auricular prematura no conducida.'),
      l(
        '把迷走神经介导的阻滞（窦性减慢与PR延长同时出现）称为莫氏Ⅱ型。',
        'Calling vagally mediated block (sinus slowing together with PR lengthening) Mobitz II.',
        'Llamar Mobitz II a un bloqueo vagal (enlentecimiento sinusal junto con alargamiento del PR).',
      ),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '心电监护并备好体外起搏电极片，寻找可逆原因（药物、血钾、缺血），安排永久起搏——即使无症状也有指征。',
        'Monitor the patient with pacing pads at hand, look for reversible causes (drugs, potassium, ischaemia) and arrange permanent pacing — it is indicated even without symptoms.',
        'Monitoriza al paciente con parches de estimulación a mano, busca causas reversibles (fármacos, potasio, isquemia) y organiza un marcapasos definitivo: está indicado incluso sin síntomas.',
      ),
    },
    lessons: ['r4'],
    sources: [REF.kusumoto2018, R.glikson2021, R.barold2001],
    aka: ['Mobitz II', 'Mobitz type 2', 'type II second-degree', '莫氏Ⅱ型'],
    exemplar: { scenarios: ['av-block-2-mobitz2'], layout: '3x4+1', lead: 'II', leads: ['II', 'V1'] },
  },
  {
    id: 'av-block-2-2to1',
    definition: l(
      '心房率恒定、每隔一个P波不能下传的房室阻滞——单独成类，仅凭2:1片段无法分为莫氏Ⅰ型或Ⅱ型。',
      'AV block in which every second P wave, at a constant atrial rate, is not conducted — a category of its own that cannot be typed as Mobitz I or II from the 2:1 segment alone.',
      'Bloqueo AV en el que, con frecuencia auricular constante, una de cada dos P no se conduce; es una categoría propia que no puede tipificarse como Mobitz I o II solo con el tramo 2:1.',
    ),
    features: [
      l('每个QRS对应两个P波，PP规则；其中一个常藏在T波中。', 'Two P waves for every QRS at a regular P–P; one often hides in the T wave.', 'Dos ondas P por cada QRS con P-P regular; una suele esconderse en la onda T.'),
      l('下传搏动PR恒定；心室率为心房率的一半。', 'Constant PR in the conducted beats; the ventricular rate is half the atrial rate.', 'PR constante en los latidos conducidos; la frecuencia ventricular es la mitad de la auricular.'),
      l(
        '房室结水平的线索：QRS窄、下传PR长、记录其他部分可见文氏周期、运动或阿托品后改善。',
        'Clues to the AV node: narrow QRS, long PR in conducted beats, Wenckebach periods elsewhere on the strip, improvement with exercise or atropine.',
        'Pistas de nivel nodal: QRS estrecho, PR largo en los latidos conducidos, periodos de Wenckebach en otra parte del registro, mejoría con el esfuerzo o la atropina.',
      ),
      l(
        '结下水平的线索：QRS宽或束支阻滞、PR正常、运动或阿托品后加重、颈动脉窦按摩后改善。',
        'Clues to infranodal block: wide QRS or BBB, normal PR, worsening with exercise or atropine, improvement with carotid sinus massage.',
        'Pistas de nivel infranodal: QRS ancho o bloqueo de rama, PR normal, empeoramiento con el esfuerzo o la atropina, mejoría con el masaje del seno carotídeo.',
      ),
      l('沿记录寻找能揭示类型的3:2周期。', 'Look along the strip for 3:2 periods that reveal the type.', 'Busca a lo largo del registro periodos 3:2 que revelen el tipo.'),
    ],
    criteria: [
      {
        label: l('2:1房室阻滞', '2:1 AV block', 'Bloqueo AV 2:1'),
        value: l('心房率恒定，每隔一个P波下传；不能归为莫氏Ⅰ型或Ⅱ型', 'Constant atrial rate with every other P conducted; not classifiable as Mobitz I or II', 'Frecuencia auricular constante con una de cada dos P conducida; no clasificable como Mobitz I o II'),
        source: 'Kusumoto 2018; Barold 2001',
      },
      {
        label: l('部位不明时', 'If the site is unclear', 'Si el nivel no está claro'),
        value: l('运动试验（Ⅱa）或电生理检查（Ⅱb）', 'Exercise test (IIa) or electrophysiology study (IIb)', 'Prueba de esfuerzo (IIa) o estudio electrofisiológico (IIb)'),
        source: 'Kusumoto 2018 (ACC/AHA/HRS bradycardia)',
      },
      {
        label: l('起搏', 'Pacing', 'Marcapasos'),
        value: l('希氏束下2:1阻滞为Ⅰ类', 'Infra-His 2:1 block: class I', 'Bloqueo 2:1 infrahisiano: clase I'),
        source: 'Glikson 2021 (ESC pacing)',
      },
    ],
    mechanism: l(
      '两次阻滞之间只有一个下传搏动，没有第二个PR可供比较，因此递减性的房室结阻滞与全或无的结下阻滞看起来完全相同。只有QRS宽度、下传PR以及对自主神经张力变化的反应能揭示阻滞部位。',
      'With only one conducted beat between blocked P waves there is no second PR to compare, so a decremental nodal block and an all-or-none infranodal block look exactly alike. Only the QRS width, the conducted PR and the response to changes in autonomic tone reveal where the block lies.',
      'Con un solo latido conducido entre P bloqueadas no hay un segundo PR que comparar, de modo que un bloqueo nodal decremental y un bloqueo infranodal de todo o nada parecen idénticos. Solo la anchura del QRS, el PR conducido y la respuesta a los cambios del tono autonómico revelan dónde está el bloqueo.',
    ),
    mimics: [
      {
        id: 'sinus-bradycardia',
        discriminator: l(
          '此处两个QRS之间有第二个P波（常在T波中）；窦性心动过缓每个QRS只有一个P波。',
          'Here a second P sits between QRS complexes (often in the T); sinus bradycardia has one P per QRS.',
          'Aquí hay una segunda P entre los QRS (a menudo en la T); la bradicardia sinusal tiene una P por QRS.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'pac-blocked',
        discriminator: l(
          '此处P波形态相同、PP恒定；未下传房早二联律的P′提前且形态不同。',
          'Here the P waves are identical at a constant P–P; in blocked atrial bigeminy the P′ is early and differently shaped.',
          'Aquí las P son idénticas con P-P constante; en el bigeminismo auricular bloqueado la P′ es precoz y de otra forma.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'av-block-high-grade',
        discriminator: l(
          '此处每次只阻滞一个P波；高度阻滞时连续≥2个P波不下传（3:1、4:1）。',
          'Here only one P is blocked at a time; in high-grade block two or more consecutive P waves fail (3:1, 4:1).',
          'Aquí solo se bloquea una P cada vez; en el bloqueo de alto grado fallan dos o más P seguidas (3:1, 4:1).',
        ),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l('仅凭2:1片段就称为莫氏Ⅱ型（或Ⅰ型）。', 'Labelling 2:1 block Mobitz II (or Mobitz I) from the 2:1 segment.', 'Etiquetar un bloqueo 2:1 como Mobitz II (o I) solo por el tramo 2:1.'),
      l('漏看T波中的P波而称为窦性心动过缓。', 'Missing the P hidden in the T and calling the rhythm sinus bradycardia.', 'No ver la P escondida en la T y llamar al ritmo bradicardia sinusal.'),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '评估症状和QRS宽度：QRS宽或有症状时进行心电监护、备好起搏电极片并评估起搏；检查用药和血钾。',
        'Assess symptoms and QRS width: with a wide QRS or symptoms, monitor with pacing pads at hand and arrange a pacing assessment; review drugs and potassium.',
        'Valora los síntomas y la anchura del QRS: con QRS ancho o síntomas, monitoriza con parches de estimulación a mano y solicita valoración para marcapasos; revisa fármacos y potasio.',
      ),
    },
    lessons: ['r4'],
    sources: [REF.kusumoto2018, R.barold2001, R.glikson2021],
    aka: ['2:1 block', '2 to 1 AV block', 'bloqueo 2:1', '2:1阻滞'],
    exemplar: { scenarios: ['av-block-2-2to1'], layout: '3x4+1', lead: 'II', leads: ['II', 'V1'] },
  },
  {
    id: 'av-block-high-grade',
    definition: l(
      '心房率恒定且处于生理范围时，连续≥2个P波不能下传，但仍有部分P波下传的房室阻滞。',
      'AV block with two or more consecutive non-conducted P waves at a constant physiological atrial rate, while some P waves still conduct.',
      'Bloqueo AV con dos o más ondas P seguidas no conducidas a una frecuencia auricular fisiológica constante, mientras algunas P todavía se conducen.',
    ),
    features: [
      l('连续≥2个P波被阻滞（3:1、4:1……），偶有下传搏动且PR恒定。', 'Runs of ≥ 2 blocked P waves (3:1, 4:1 …) with occasional conducted beats at a constant PR.', 'Rachas de ≥ 2 P bloqueadas (3:1, 4:1…) con latidos conducidos ocasionales de PR constante.'),
      l('心室率常很慢，可出现逸搏。', 'The ventricular rate is often very slow and escape beats may appear.', 'La frecuencia ventricular suele ser muy lenta y pueden aparecer latidos de escape.'),
      l('多为结下病变，QRS常宽。', 'Usually infranodal disease, often with a wide QRS.', 'Casi siempre enfermedad infranodal, a menudo con QRS ancho.'),
      l('与完全性阻滞的区别：仍有下传搏动（部分QRS前PR固定）。', 'Differs from complete block because conducted beats exist (a fixed PR before some QRS complexes).', 'Se diferencia del bloqueo completo en que hay latidos conducidos (un PR fijo antes de algunos QRS).'),
    ],
    criteria: [
      {
        label: l('高度房室阻滞', 'High-grade (advanced) AV block', 'Bloqueo AV de alto grado (avanzado)'),
        value: l('生理性恒定心房率下连续≥2个P波未下传，且仍有部分传导', '≥ 2 consecutive non-conducted P waves at a constant physiological rate, with some conduction', '≥ 2 P seguidas no conducidas a una frecuencia fisiológica constante, con algo de conducción'),
        source: 'Kusumoto 2018 (ACC/AHA/HRS bradycardia)',
      },
      {
        label: l('比例写法', 'Ratio notation', 'Notación de la relación'),
        value: l('3:1=每个下传搏动之前阻滞两个P波', '3:1 = two blocked P waves for each conducted beat', '3:1 = dos P bloqueadas por cada latido conducido'),
        source: 'Kusumoto 2018',
      },
      {
        label: l('起搏', 'Pacing', 'Marcapasos'),
        value: l('无可逆原因时，无论有无症状均为Ⅰ类', 'Class I regardless of symptoms when no reversible cause is found', 'Clase I con independencia de los síntomas si no hay causa reversible'),
        source: 'Kusumoto 2018; Glikson 2021 (ESC pacing)',
      },
    ],
    mechanism: l(
      '传导系统严重病变（通常在房室结以下），心房冲动只能偶尔下传。连续数个窦性冲动丢失，心室只能依赖少数下传搏动或缓慢的逸搏起搏点。',
      'Severe disease of the conduction system, usually below the AV node, lets an atrial impulse through only now and then. Several sinus impulses in a row are lost, so the ventricles depend on rare conducted beats or on slow escape pacemakers.',
      'Una enfermedad grave del sistema de conducción, casi siempre por debajo del nodo AV, solo deja pasar un impulso auricular de vez en cuando. Se pierden varios impulsos sinusales seguidos, de modo que los ventrículos dependen de raros latidos conducidos o de marcapasos de escape lentos.',
    ),
    mimics: [
      {
        id: 'av-block-3',
        discriminator: l(
          '此处部分P波以固定PR下传；完全性阻滞时无一下传，PR随机变化。',
          'Here some P waves conduct at a fixed PR; in complete block none does and the PR varies at random.',
          'Aquí algunas P se conducen con PR fijo; en el bloqueo completo ninguna lo hace y el PR varía al azar.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'av-block-2-2to1',
        discriminator: l('此处连续阻滞≥2个P波；2:1阻滞每次只阻滞一个。', 'Here two or more P waves in a row are blocked; 2:1 block drops only one at a time.', 'Aquí se bloquean dos o más P seguidas; el bloqueo 2:1 solo bloquea una cada vez.'),
        leads: ['II'],
      },
      {
        id: 'sinus-node-dysfunction',
        discriminator: l('此处长间歇内P波照常出现；窦房结功能障碍时长间歇内没有P波。', 'Here P waves keep coming through the pauses; in sinus node dysfunction the pauses contain no P waves.', 'Aquí las P siguen apareciendo en las pausas; en la disfunción sinusal las pausas no contienen P.'),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l('仍有搏动下传时称为完全性房室阻滞（或反之）。', 'Calling it complete heart block when some beats conduct (or the reverse).', 'Llamarlo bloqueo completo cuando algunos latidos se conducen (o al revés).'),
      l('把3:1下传称为“莫氏Ⅱ型”。', 'Calling 3:1 conduction “Mobitz II”.', 'Llamar «Mobitz II» a una conducción 3:1.'),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '立即评估灌注并贴上起搏电极片；症状明显或逸搏缓慢宽大时准备经皮起搏。寻找可逆原因（药物、血钾、缺血）并安排永久起搏。',
        'Assess perfusion now and attach pacing pads; with symptoms or a slow, wide escape, prepare transcutaneous pacing. Look for reversible causes (drugs, potassium, ischaemia) and arrange permanent pacing.',
        'Valora ya la perfusión y coloca parches de estimulación; si hay síntomas o un escape lento y ancho, prepara la estimulación transcutánea. Busca causas reversibles (fármacos, potasio, isquemia) y organiza un marcapasos definitivo.',
      ),
    },
    lessons: ['r4'],
    sources: [REF.kusumoto2018, R.glikson2021],
    aka: ['advanced AV block', '3:1 block', 'bloqueo AV de alto grado', '高度阻滞'],
    exemplar: { scenarios: ['av-block-high-grade'], layout: '3x4+1', lead: 'II', leads: ['II', 'V1'] },
  },
  {
    id: 'av-block-3',
    definition: l(
      '没有心房冲动能到达心室：P波与QRS各自独立，心房率快于心室逸搏频率。',
      'No atrial impulse reaches the ventricles: P waves and QRS complexes run independently, with the atrial rate faster than the ventricular escape rate.',
      'Ningún impulso auricular llega a los ventrículos: las ondas P y los QRS van por separado y la frecuencia auricular supera a la del escape ventricular.',
    ),
    features: [
      l('PP规则、RR规则，各有自己的频率；心房率>心室率。', 'Regular P–P and regular R–R, each at its own rate; atrial rate > ventricular rate.', 'P-P regular y R-R regular, cada uno a su propia frecuencia; frecuencia auricular > ventricular.'),
      l(
        'PR随机变化；P波落在心动周期的各个位置（包括不应期外），但无一下传。',
        'The PR varies at random; P waves fall at every point of the cycle, including outside refractoriness, and none conducts.',
        'El PR varía al azar; las P caen en todos los puntos del ciclo, también fuera del periodo refractario, y ninguna se conduce.',
      ),
      l(
        '逸搏：窄QRS 40–60次/分（交界性，房室结/希氏束阻滞），或宽QRS 20–40次/分（室性，结下阻滞——成人最常见）。',
        'Escape: narrow QRS at 40–60/min (junctional; nodal or His block) or wide QRS at 20–40/min (ventricular; infranodal block — the commonest in adults).',
        'Escape: QRS estrecho a 40-60 lpm (de la unión; bloqueo nodal o hisiano) o QRS ancho a 20-40 lpm (ventricular; bloqueo infranodal, el más frecuente en adultos).',
      ),
      l('房颤时RR缓慢而绝对规则=完全性房室阻滞伴逸搏。', 'In AF, a slow and perfectly regular R–R means complete AV block with an escape rhythm.', 'En la FA, un R-R lento y perfectamente regular significa bloqueo AV completo con ritmo de escape.'),
    ],
    criteria: [
      {
        label: l('三度房室阻滞', 'Third-degree AV block', 'Bloqueo AV de tercer grado'),
        value: l('无房室传导证据；心房率>心室率；逸搏规则', 'No evidence of AV conduction; atrial rate > ventricular rate; regular escape', 'Sin conducción AV; frecuencia auricular > ventricular; escape regular'),
        source: 'Kusumoto 2018 (ACC/AHA/HRS bradycardia)',
      },
      {
        label: l('逸搏部位', 'Escape site', 'Nivel del escape'),
        value: l('窄QRS 40–60次/分→房室结/希氏束；宽QRS 20–40次/分→结下', 'Narrow 40–60/min → node or His; wide 20–40/min → infranodal', 'Estrecho 40-60 lpm → nodo o His; ancho 20-40 lpm → infranodal'),
        source: 'Kusumoto 2018',
      },
      {
        label: l('起搏', 'Pacing', 'Marcapasos'),
        value: l('无可逆原因时，无论有无症状均为Ⅰ类', 'Class I regardless of symptoms when no reversible cause is found', 'Clase I con independencia de los síntomas si no hay causa reversible'),
        source: 'Kusumoto 2018; Glikson 2021 (ESC pacing)',
      },
    ],
    mechanism: l(
      '房室结、希氏束或双侧束支的传导完全中断，窦房结只能驱动心房。阻滞部位以下的次级起搏点以自身较慢的频率接管心室，两种节律互不相干。',
      'Conduction is interrupted completely in the AV node, the His bundle or both bundle branches, so the sinus node drives only the atria. A subsidiary pacemaker below the block takes over the ventricles at its own slower rate, and the two rhythms never interact.',
      'La conducción se interrumpe por completo en el nodo AV, el haz de His o ambas ramas, de modo que el nodo sinusal solo dirige las aurículas. Un marcapasos subsidiario por debajo del bloqueo toma el mando de los ventrículos a su propia frecuencia, más lenta, y los dos ritmos nunca interactúan.',
    ),
    mimics: [
      {
        id: 'av-dissociation',
        discriminator: l(
          '此处心房快于心室，时机合适的P波也不下传；无阻滞的房室分离时心室率≥心房率，P波时机合适即可夺获。',
          'Here the atria are faster than the ventricles and even well-timed P waves fail; in AV dissociation without block the ventricular rate is ≥ the atrial rate and a well-timed P captures.',
          'Aquí las aurículas van más rápido que los ventrículos y ni las P bien situadas se conducen; en la disociación AV sin bloqueo la frecuencia ventricular es ≥ la auricular y una P bien situada captura.',
        ),
        leads: ['II'],
      },
      {
        id: 'av-block-high-grade',
        discriminator: l('此处无任何下传；高度阻滞时偶有以固定PR下传的搏动。', 'Here nothing conducts; in high-grade block occasional beats conduct at a fixed PR.', 'Aquí no se conduce nada; en el bloqueo de alto grado algunos latidos se conducen con PR fijo.'),
        leads: ['II', 'V1'],
      },
      {
        id: 'accelerated-junctional-rhythm',
        discriminator: l(
          '加速性交界性心律时交界区频率≥窦性频率（等频性分离），足够提前到达的窦性P波仍可下传。',
          'In an accelerated junctional rhythm the junction runs at or above the sinus rate (isorhythmic dissociation) and a sinus P that comes early enough still conducts.',
          'En el ritmo de la unión acelerado la unión va igual o más rápida que el nodo sinusal (disociación isorrítmica) y una P sinusal suficientemente precoz aún se conduce.',
        ),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l('把等频性房室分离称为完全性房室阻滞。', 'Calling isorhythmic AV dissociation complete heart block.', 'Llamar bloqueo AV completo a una disociación AV isorrítmica.'),
      l('房颤时因“节律规则、心室率得到控制”而漏诊完全性阻滞。', 'Missing complete block in AF because “the rhythm is regular and controlled”.', 'Pasar por alto un bloqueo completo en la FA porque «el ritmo es regular y está controlado».'),
      l('用抗心律失常药抑制室性逸搏。', 'Suppressing a ventricular escape with antiarrhythmic drugs.', 'Suprimir un escape ventricular con antiarrítmicos.'),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '立即评估灌注并贴上起搏电极片；逸搏缓慢宽大或有症状时准备经皮起搏。检查血钾、用药和缺血（下壁心梗），并安排永久起搏。',
        'Assess perfusion now and attach pacing pads; with a slow, wide escape or symptoms, prepare transcutaneous pacing. Check potassium, drugs and ischaemia (inferior MI), and arrange permanent pacing.',
        'Valora ya la perfusión y coloca parches de estimulación; con un escape lento y ancho o síntomas, prepara la estimulación transcutánea. Revisa potasio, fármacos e isquemia (infarto inferior) y organiza un marcapasos definitivo.',
      ),
    },
    lessons: ['r4', 't7'],
    sources: [REF.kusumoto2018, R.glikson2021, REF.chou2008],
    aka: ['complete heart block', 'CHB', 'third degree', 'bloqueo AV completo', 'BAV completo', '三度阻滞', '完全性房室阻滞'],
    exemplar: { scenarios: ['av-block-3'], layout: '3x4+1', lead: 'II', leads: ['II', 'V1'] },
  },
  {
    id: 'av-dissociation',
    definition: l(
      '心房与心室在部分或全部搏动中各自独立——这是对节律的描述而非诊断，原因可为窦性减慢、次级起搏点加速、房室阻滞或其组合。',
      'Atria and ventricles beating independently for some or all beats — a description of the rhythm, not a diagnosis, caused by sinus slowing, an accelerated subsidiary pacemaker, AV block or a combination.',
      'Aurículas y ventrículos que laten de forma independiente en algunos o todos los latidos; es una descripción del ritmo, no un diagnóstico, causada por enlentecimiento sinusal, un marcapasos subsidiario acelerado, bloqueo AV o una combinación.',
    ),
    features: [
      l('P波与QRS无关：“PR”不断变化，P波漂入并穿过QRS。', 'P waves and QRS complexes are unrelated: the “PR” keeps changing and P waves drift into and through the QRS.', 'Las P y los QRS no guardan relación: el «PR» cambia sin parar y las P se desplazan hasta el QRS y lo atraviesan.'),
      l('无阻滞时心室率等于或快于心房率（两者接近时称等频性）。', 'Without block the ventricular rate equals or exceeds the atrial rate (isorhythmic when they are nearly equal).', 'Sin bloqueo la frecuencia ventricular iguala o supera a la auricular (isorrítmica cuando son casi iguales).'),
      l(
        '心室夺获（时机合适的P波下传，产生提前的正常QRS）证明房室传导仍然存在。',
        'Capture beats (a well-timed P conducts and gives an early normal QRS) prove that AV conduction is possible.',
        'Los latidos de captura (una P bien situada se conduce y da un QRS normal precoz) demuestran que la conducción AV es posible.',
      ),
      l('宽QRS心动过速中，房室分离、夺获或融合波强烈支持室速。', 'In a wide-QRS tachycardia, AV dissociation, capture or fusion beats strongly favour VT.', 'En una taquicardia de QRS ancho, la disociación AV, las capturas o las fusiones apoyan firmemente una TV.'),
      l(
        '说出原因：完全性房室阻滞、加速性交界性心律、加速性室性自主心律、室速，或窦性心动过缓伴逸搏。',
        'Name the cause: complete AV block, accelerated junctional rhythm, AIVR, VT, or sinus bradycardia with an escape rhythm.',
        'Nombra la causa: bloqueo AV completo, ritmo de la unión acelerado, RIVA, TV o bradicardia sinusal con ritmo de escape.',
      ),
    ],
    criteria: [
      {
        label: l('定义', 'Definition', 'Definición'),
        value: l('心房和心室活动相互独立；是描述而非诊断', 'Independent atrial and ventricular activity; a description, not a diagnosis', 'Actividad auricular y ventricular independientes; una descripción, no un diagnóstico'),
        source: 'Kusumoto 2018; Chou 2008',
      },
      {
        label: l('宽QRS心动过速中', 'In a wide-QRS tachycardia', 'En una taquicardia de QRS ancho'),
        value: l('房室分离、夺获或融合波→室速', 'AV dissociation, capture or fusion beats → VT', 'Disociación AV, capturas o fusiones → TV'),
        source: 'Zeppenfeld 2022 (ESC VA/SCD); Brugada 1991',
      },
    ],
    mechanism: l(
      '当心房以下的次级起搏点快于窦房结，或窦性冲动被阻滞时，心室跟随自身起搏点，心房跟随窦房结。两种节律相互错开漂移，只有当P波恰好在心室恢复后到达时才能下传。',
      'Whenever a subsidiary pacemaker below the atria runs faster than the sinus node, or sinus impulses are blocked, the ventricles follow their own pacemaker and the atria follow the sinus node. The two rhythms drift past each other, and a P wave conducts only when it happens to arrive after the ventricles have recovered.',
      'Siempre que un marcapasos subsidiario por debajo de las aurículas va más rápido que el nodo sinusal, o los impulsos sinusales se bloquean, los ventrículos siguen a su propio marcapasos y las aurículas al nodo sinusal. Los dos ritmos se desplazan uno respecto al otro, y una P solo se conduce cuando llega después de que los ventrículos se han recuperado.',
    ),
    mimics: [
      {
        id: 'av-block-3',
        discriminator: l(
          '此处心室率≥心房率且有夺获；完全性阻滞时心房率更快且无一下传。',
          'Here the ventricular rate is ≥ the atrial rate and captures occur; in complete block the atrial rate is faster and nothing conducts.',
          'Aquí la frecuencia ventricular es ≥ la auricular y hay capturas; en el bloqueo completo la auricular es más rápida y nada se conduce.',
        ),
        leads: ['II'],
      },
      {
        id: 'av-block-1',
        discriminator: l('此处“PR”逐搏变化；一度房室阻滞PR虽长但恒定。', 'Here the “PR” changes beat to beat; in first-degree AV block the PR is long but constant.', 'Aquí el «PR» cambia latido a latido; en el bloqueo AV de primer grado el PR es largo pero constante.'),
        leads: ['II'],
      },
      {
        id: 'av-block-2-mobitz1',
        discriminator: l(
          '此处PR变化无规律；文氏阻滞时PR按规律延长，阻滞后重新开始。',
          'Here the PR varies without a pattern; in Wenckebach it lengthens in a pattern that resets after the blocked P.',
          'Aquí el PR varía sin patrón; en el Wenckebach se alarga siguiendo un patrón que se reinicia tras la P bloqueada.',
        ),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l('把“房室分离”当作最终诊断——应说出基础节律。', 'Using “AV dissociation” as the final diagnosis — name the underlying rhythm.', 'Usar «disociación AV» como diagnóstico final: nombra el ritmo de base.'),
      l('把房室分离等同于完全性房室阻滞。', 'Equating AV dissociation with complete AV block.', 'Equiparar la disociación AV con el bloqueo AV completo.'),
    ],
    lessons: ['r2', 't5'],
    sources: [REF.kusumoto2018, REF.chou2008, REF.escVa2022, R.brugada1991],
    aka: ['AV dissociation', 'isorhythmic dissociation', 'disociación AV', 'disociación isorrítmica', '房室脱节'],
    exemplar: { scenarios: ['av-dissociation', 'vt-monomorphic', 'av-block-3'], layout: '3x4+1', lead: 'II', leads: ['II', 'V1'] },
  },
  // ── bundle branch and fascicular blocks ──────────────────────────────────────────────────────────────────────────
  {
    id: 'rbbb',
    definition: l(
      'QRS≥120 ms伴延迟的右向终末波：V1–V2呈rsR′（或宽而有切迹的R），Ⅰ和V6有宽S波。',
      'QRS ≥ 120 ms with a late rightward terminal deflection: rsR′ (or a broad notched R) in V1–V2 and a wide S wave in I and V6.',
      'QRS ≥ 120 ms con una deflexión terminal tardía hacia la derecha: rsR′ (o R ancha y mellada) en V1-V2 y onda S ancha en I y V6.',
    ),
    features: [
      l('QRS时限≥120 ms（各导联整体测量）。', 'QRS duration ≥ 120 ms, measured across all leads.', 'Duración del QRS ≥ 120 ms, medida en todas las derivaciones.'),
      l(
        'V1–V2：rsR′/rSR′（R′通常宽于r）——“M”形；少数为宽而有切迹的R波。',
        'V1–V2: rsR′ or rSR′ (R′ usually wider than r) — the “M” shape; a minority show a broad notched R.',
        'V1-V2: rsR′ o rSR′ (la R′ suele ser más ancha que la r), la forma en «M»; una minoría muestra una R ancha y mellada.',
      ),
      l('Ⅰ和V6：S波时限长于R波或>40 ms（终末S波宽钝）。', 'I and V6: an S wave longer than the R or > 40 ms (slurred terminal S).', 'I y V6: onda S más larga que la R o > 40 ms (S terminal empastada).'),
      l('V1的R峰时间>50 ms，V5–V6正常。', 'R-wave peak time > 50 ms in V1, normal in V5–V6.', 'Tiempo de pico de la R > 50 ms en V1, normal en V5-V6.'),
      l(
        '继发性ST-T与终末波方向相反：V1–V2（V3）T波倒置，Ⅰ、V6直立。',
        'Secondary ST–T opposite to the terminal deflection: T inverted in V1–V2 (V3), upright in I and V6.',
        'ST-T secundario opuesto a la deflexión terminal: T negativa en V1-V2 (V3), positiva en I y V6.',
      ),
      l(
        '初始向量不受影响：梗死Q波仍可判读；看电轴是否合并分支阻滞。',
        'Initial forces are untouched: infarct Q waves stay readable; check the axis for an added fascicular block.',
        'Las fuerzas iniciales no cambian: las ondas Q de infarto siguen siendo legibles; mira el eje por si hay un bloqueo fascicular añadido.',
      ),
    ],
    criteria: [
      {
        label: l('完全性右束支传导阻滞', 'Complete RBBB', 'Bloqueo completo de rama derecha'),
        value: l(
          'QRS≥120 ms；V1或V2呈rsr′/rsR′/rSR′；Ⅰ和V6的S波长于R波或>40 ms；V1的R峰时间>50 ms',
          'QRS ≥ 120 ms; rsr′/rsR′/rSR′ in V1 or V2; S in I and V6 longer than R or > 40 ms; R-wave peak time in V1 > 50 ms',
          'QRS ≥ 120 ms; rsr′/rsR′/rSR′ en V1 o V2; S en I y V6 más larga que la R o > 40 ms; tiempo de pico de la R en V1 > 50 ms',
        ),
        source: 'Surawicz 2009 (AHA/ACCF/HRS Part III)',
      },
      {
        label: l('儿童', 'Children', 'Niños'),
        value: l('>100 ms（4–16岁），>90 ms（<4岁）', '> 100 ms (4–16 y), > 90 ms (< 4 y)', '> 100 ms (4-16 años), > 90 ms (< 4 años)'),
        source: 'Surawicz 2009',
      },
      {
        label: l('运动员', 'Athletes', 'Deportistas'),
        value: l('临界表现：单独出现无需检查，合并另一项临界表现需评估', 'Borderline: alone needs no work-up; with another borderline finding, evaluate', 'Limítrofe: aislado no requiere estudio; con otro hallazgo limítrofe, hay que estudiarlo'),
        source: 'Sharma 2017 (international athlete criteria)',
      },
      {
        label: l('持续缺血症状', 'Ongoing ischaemic symptoms', 'Síntomas isquémicos persistentes'),
        value: l('右束支阻滞+缺血症状→直接PCI策略', 'RBBB with ischaemic symptoms → primary-PCI strategy', 'BRD con síntomas isquémicos → estrategia de ICP primaria'),
        source: 'Byrne 2023 (ESC ACS)',
      },
    ],
    mechanism: l(
      '右束支阻滞时，室间隔和左心室首先正常激动，右心室则由左侧经心肌缓慢传导而延迟激动。这一延迟、无对抗的向右前方激动在V1形成R′，在Ⅰ、V6形成宽S波。',
      'With the right bundle blocked, the septum and left ventricle activate normally first, and the right ventricle is reached late by slow muscle-to-muscle spread from the left side. That late, unopposed rightward and anterior activation adds the R′ in V1 and the broad S in I and V6.',
      'Con la rama derecha bloqueada, el tabique y el ventrículo izquierdo se activan primero con normalidad y el ventrículo derecho se alcanza tarde por una propagación lenta de músculo a músculo desde el lado izquierdo. Esa activación tardía, sin oposición, hacia la derecha y adelante añade la R′ en V1 y la S ancha en I y V6.',
    ),
    mimics: [
      {
        id: 'irbbb',
        discriminator: l('此处QRS≥120 ms；不完全性右束支阻滞形态相同但QRS 110–119 ms。', 'Here the QRS is ≥ 120 ms; incomplete RBBB has the same shape with a QRS of 110–119 ms.', 'Aquí el QRS es ≥ 120 ms; el BIRD tiene la misma forma con un QRS de 110-119 ms.'),
        leads: ['V1'],
      },
      {
        id: 'brugada-type1',
        discriminator: l(
          '此处R′窄而尖，Ⅰ和V6有相应的宽S波；Brugada 1型在V1–V2呈穹窿形ST抬高≥2 mm伴T波倒置，V6无相应宽S波。',
          'Here the R′ is narrow and sharp with a matching wide S in I and V6; Brugada type 1 shows coved ST elevation ≥ 2 mm with T inversion in V1–V2 and no matching wide S in V6.',
          'Aquí la R′ es estrecha y aguda con una S ancha correspondiente en I y V6; el Brugada tipo 1 muestra elevación del ST en cúpula ≥ 2 mm con T negativa en V1-V2 y sin S ancha correspondiente en V6.',
        ),
        leads: ['V1', 'V2', 'V6'],
      },
      {
        id: 'stemi-posterior',
        discriminator: l(
          '此处V1高R伴QRS≥120 ms及Ⅰ/V6宽S；后壁心梗QRS窄，V1–V3高宽R伴ST段压低。',
          'Here the tall R in V1 comes with QRS ≥ 120 ms and a wide S in I/V6; posterior MI has a narrow QRS with a tall broad R and ST depression in V1–V3.',
          'Aquí la R alta de V1 se acompaña de QRS ≥ 120 ms y S ancha en I/V6; el infarto posterior tiene QRS estrecho con R alta y ancha y descenso del ST en V1-V3.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
      {
        id: 'wpw',
        discriminator: l(
          '此处PR正常、QRS起始锐利；左侧旁路预激的V1高R伴短PR和delta波。',
          'Here the PR is normal and the QRS starts sharply; a left-sided pathway gives a tall R in V1 with a short PR and a delta wave.',
          'Aquí el PR es normal y el QRS empieza de forma nítida; una vía izquierda da R alta en V1 con PR corto y onda delta.',
        ),
        leads: ['V1', 'II'],
      },
    ],
    pitfalls: [
      l(
        '把V1–V3的T波倒置当作缺血：这是继发性改变；应寻找与终末QRS同向的ST抬高或T波改变。',
        'Reading the T inversion in V1–V3 as ischaemia: it is secondary; look instead for ST elevation or T changes in the same direction as the terminal QRS.',
        'Interpretar como isquemia la T negativa de V1-V3: es secundaria; busca en cambio elevación del ST o cambios de T en la misma dirección que el QRS terminal.',
      ),
      l('漏看合并的分支阻滞（看电轴）：右束支阻滞+左前分支阻滞即双分支阻滞。', 'Missing an added fascicular block (check the axis): RBBB plus LAFB is bifascicular block.', 'Pasar por alto un bloqueo fascicular añadido (mira el eje): BRD más BFAI es un bloqueo bifascicular.'),
      l('忽视胸痛患者新出现的右束支阻滞。', 'Dismissing a new RBBB in a patient with chest pain.', 'Restar importancia a un BRD nuevo en un paciente con dolor torácico.'),
    ],
    lessons: ['r6', 'i10'],
    sources: [REF.surawicz2009, REF.sharma2017, REF.escAcs2023, REF.udmi2018],
    aka: ['RBBB', 'CRBBB', 'BRD', 'BCRD', '右束支阻滞'],
    exemplar: { scenarios: ['rbbb'], leads: ['V1', 'V2', 'I', 'V6'] },
  },
  {
    id: 'irbbb',
    definition: l(
      '成人QRS 110–119 ms、呈右束支阻滞形态（V1呈rsr′，Ⅰ和V6有终末S波）。',
      'An RBBB-shaped QRS (rsr′ in V1, terminal S in I and V6) with a QRS of 110–119 ms in an adult.',
      'QRS con forma de BRD (rsr′ en V1, S terminal en I y V6) y duración de 110-119 ms en el adulto.',
    ),
    features: [
      l('V1（V2）呈rSr′或rsR′，QRS 110–119 ms。', 'rSr′ or rsR′ in V1 (V2) with a QRS of 110–119 ms.', 'rSr′ o rsR′ en V1 (V2) con un QRS de 110-119 ms.'),
      l('Ⅰ和V6终末S波宽钝。', 'A slurred terminal S in I and V6.', 'S terminal empastada en I y V6.'),
      l('QRS<110 ms的rSr′是常见的正常变异，不是不完全性右束支阻滞。', 'An rSr′ with QRS < 110 ms is a common normal variant, not incomplete RBBB.', 'Una rSr′ con QRS < 110 ms es una variante normal frecuente, no un BIRD.'),
      l(
        '运动员中属正常；伴电轴右偏或下壁R波切迹（钩状征）时考虑房间隔缺损所致右心室容量负荷。',
        'Normal in athletes; with right axis deviation or a notch on the inferior R waves (crochetage), consider right ventricular volume load from an atrial septal defect.',
        'Normal en deportistas; con desviación del eje a la derecha o muesca en la R inferior (signo de crochetage), piensa en una sobrecarga de volumen del VD por comunicación interauricular.',
      ),
    ],
    criteria: [
      {
        label: l('不完全性右束支阻滞', 'Incomplete RBBB', 'Bloqueo incompleto de rama derecha'),
        value: l(
          '右束支阻滞形态，QRS 110–119 ms（成人）；90–100 ms（8–16岁）；86–90 ms（<8岁）',
          'RBBB morphology with QRS 110–119 ms (adults); 90–100 ms (8–16 y); 86–90 ms (< 8 y)',
          'Morfología de BRD con QRS de 110-119 ms (adultos); 90-100 ms (8-16 años); 86-90 ms (< 8 años)',
        ),
        source: 'Surawicz 2009 (AHA/ACCF/HRS Part III)',
      },
      {
        label: l('运动员', 'Athletes', 'Deportistas'),
        value: l('训练相关的正常表现', 'Normal training-related finding', 'Hallazgo normal relacionado con el entrenamiento'),
        source: 'Sharma 2017',
      },
      {
        label: l('与Brugada 2型鉴别', 'Versus Brugada type 2', 'Frente al Brugada tipo 2'),
        value: l('β角>58°；r′顶点下5 mm处底宽≥3.5 mm提示Brugada', 'β angle > 58°; base of the r′ triangle 5 mm below its apex ≥ 3.5 mm points to Brugada', 'Ángulo β > 58°; base del triángulo de la r′ a 5 mm del vértice ≥ 3,5 mm orienta a Brugada'),
        source: 'Bayés de Luna 2012 (Brugada consensus)',
      },
    ],
    mechanism: l(
      '右束支传导轻度延迟，或右心室较大、较厚，使右心室最后部分激动延迟到足以形成r′，但QRS尚未增宽到120 ms。由于额外延迟很小，同样的图形既可见于正常变异，也可见于右心室容量负荷。',
      'A mild right-bundle delay, or a larger or thicker right ventricle, makes the last part of right ventricular activation late enough to show as an r′ without widening the QRS to 120 ms. Because the extra delay is small, the same pattern appears both as a normal variant and with right ventricular volume load.',
      'Un retraso leve en la rama derecha, o un ventrículo derecho más grande o más grueso, hace que la última parte de la activación del VD llegue lo bastante tarde para formar una r′ sin ensanchar el QRS hasta 120 ms. Como el retraso añadido es pequeño, el mismo patrón aparece como variante normal y en la sobrecarga de volumen del VD.',
    ),
    mimics: [
      {
        id: 'rbbb',
        discriminator: l('此处QRS 110–119 ms；完全性右束支阻滞≥120 ms。', 'Here the QRS is 110–119 ms; complete RBBB is ≥ 120 ms.', 'Aquí el QRS mide 110-119 ms; el BRD completo mide ≥ 120 ms.'),
        leads: ['V1'],
      },
      {
        id: 'brugada-type2',
        discriminator: l(
          '此处r′窄而尖，V6有相应的宽S波；鞍背型（2型）r′宽而圆钝（β角>58°）伴ST抬高，V6无相应S波。',
          'Here the r′ is narrow and sharp with a matching wide S in V6; the saddleback (type 2) r′ is broad and rounded (β angle > 58°) with ST elevation and no matching S in V6.',
          'Aquí la r′ es estrecha y aguda con una S ancha correspondiente en V6; la r′ en silla de montar (tipo 2) es ancha y redondeada (ángulo β > 58°), con elevación del ST y sin S correspondiente en V6.',
        ),
        leads: ['V1', 'V2', 'V6'],
      },
      {
        id: 'precordial-misplacement',
        discriminator: l(
          'V1–V2放置过高时出现rSr′伴V1的P波倒置，正确放置后消失。',
          'V1–V2 placed too high give an rSr′ with a negative P in V1 that disappears when the electrodes are placed correctly.',
          'V1-V2 colocados demasiado altos dan una rSr′ con P negativa en V1 que desaparece al colocarlos bien.',
        ),
        leads: ['V1', 'V2'],
      },
    ],
    pitfalls: [
      l('把正常的rSr′（QRS<110 ms）判为不完全性右束支阻滞。', 'Labelling a normal rSr′ (QRS < 110 ms) as incomplete RBBB.', 'Etiquetar como BIRD una rSr′ normal (QRS < 110 ms).'),
      l('漏看Brugada 2型图形——观察r′形态和ST段。', 'Missing a Brugada type 2 pattern — look at the r′ shape and the ST segment.', 'No reconocer un patrón de Brugada tipo 2: fíjate en la forma de la r′ y en el segmento ST.'),
    ],
    lessons: ['r6', 's7'],
    sources: [REF.surawicz2009, REF.sharma2017, R.bayes2012brugada],
    aka: ['IRBBB', 'iRBBB', 'BIRD', 'rSr′', '不完全性右束支阻滞'],
    exemplar: { scenarios: ['irbbb'], leads: ['V1', 'V2', 'V6'] },
  },
  {
    id: 'lbbb',
    definition: l(
      'QRS≥120 ms，左心室激动延迟且顺序逆转：V1–V2呈QS或rS，Ⅰ、aVL、V5–V6为宽而有切迹或顿挫的R波，无间隔q波。',
      'QRS ≥ 120 ms with delayed and reversed left ventricular activation: QS or rS in V1–V2 and a broad notched or slurred R in I, aVL and V5–V6 without septal q waves.',
      'QRS ≥ 120 ms con activación ventricular izquierda retrasada e invertida: QS o rS en V1-V2 y R ancha, mellada o empastada en I, aVL y V5-V6 sin q septales.',
    ),
    features: [
      l('QRS≥120 ms（严格标准：男性≥140 ms，女性≥130 ms）。', 'QRS ≥ 120 ms (strict criteria: ≥ 140 ms in men, ≥ 130 ms in women).', 'QRS ≥ 120 ms (criterios estrictos: ≥ 140 ms en varones, ≥ 130 ms en mujeres).'),
      l('V1–V2：QS或rS（r波很小）。', 'V1–V2: QS or rS (tiny r).', 'V1-V2: QS o rS (r diminuta).'),
      l(
        'Ⅰ、aVL、V5–V6：宽大、有切迹或顿挫的R波；Ⅰ、V5、V6无q波（aVL可有窄q波）。',
        'I, aVL, V5–V6: broad, notched or slurred R; no q in I, V5 or V6 (a narrow q in aVL can be normal).',
        'I, aVL, V5-V6: R ancha, mellada o empastada; sin q en I, V5 ni V6 (una q estrecha en aVL puede ser normal).',
      ),
      l('V5–V6的R峰时间>60 ms。', 'R-wave peak time in V5–V6 > 60 ms.', 'Tiempo de pico de la R en V5-V6 > 60 ms.'),
      l(
        'ST-T与QRS方向相反（V1–V3 ST抬高，Ⅰ、aVL、V5–V6 ST压低）属预期；同向改变异常。',
        'ST–T discordant to the QRS (ST elevation in V1–V3, depression in I, aVL, V5–V6) is expected; concordant changes are abnormal.',
        'El ST-T discordante con el QRS (elevación en V1-V3, descenso en I, aVL, V5-V6) es lo esperado; los cambios concordantes son anormales.',
      ),
      l('电轴不是诊断标准（可正常、左偏或右偏）。', 'The axis is not a criterion (it may be normal, left or right).', 'El eje no es un criterio (puede ser normal, izquierdo o derecho).'),
    ],
    criteria: [
      {
        label: l('完全性左束支阻滞（AHA 2009）', 'Complete LBBB (AHA 2009)', 'BRI completo (AHA 2009)'),
        value: l(
          'QRS≥120 ms；Ⅰ、aVL、V5–V6宽而有切迹/顿挫的R；Ⅰ、V5–V6无q；V5–V6的R峰时间>60 ms',
          'QRS ≥ 120 ms; broad notched or slurred R in I, aVL, V5–V6; no q in I, V5–V6; R-wave peak time in V5–V6 > 60 ms',
          'QRS ≥ 120 ms; R ancha, mellada o empastada en I, aVL, V5-V6; sin q en I, V5-V6; tiempo de pico de la R en V5-V6 > 60 ms',
        ),
        source: 'Surawicz 2009 (AHA/ACCF/HRS Part III)',
      },
      {
        label: l('严格左束支阻滞（Strauss）', 'Strict LBBB (Strauss)', 'BRI estricto (Strauss)'),
        value: l(
          'QRS男≥140 ms/女≥130 ms；V1–V2呈QS或rS；V1、V2、V5、V6、Ⅰ、aVL中≥2个导联QRS中段切迹或顿挫',
          'QRS ≥ 140 ms (men) / ≥ 130 ms (women); QS or rS in V1–V2; mid-QRS notching or slurring in ≥ 2 of V1, V2, V5, V6, I, aVL',
          'QRS ≥ 140 ms (varones) / ≥ 130 ms (mujeres); QS o rS en V1-V2; muesca o empastamiento a mitad del QRS en ≥ 2 de V1, V2, V5, V6, I, aVL',
        ),
        source: 'Strauss 2011',
      },
      {
        label: l('心脏再同步治疗（LVEF≤35%，窦性心律）', 'CRT (LVEF ≤ 35 %, sinus rhythm)', 'TRC (FEVI ≤ 35 %, ritmo sinusal)'),
        value: l('左束支阻滞且QRS≥150 ms为Ⅰ类；130–149 ms为Ⅱa类', 'LBBB with QRS ≥ 150 ms class I; 130–149 ms class IIa', 'BRI con QRS ≥ 150 ms clase I; 130-149 ms clase IIa'),
        source: 'Glikson 2021 (ESC pacing/CRT); McDonagh 2021',
      },
      {
        label: l('左束支阻滞中的急性心梗', 'Acute MI with LBBB', 'Infarto agudo con BRI'),
        value: l(
          '同向ST抬高≥1 mm；V1–V3同向ST压低≥1 mm；过度反向ST抬高（ST/S≤−0.25）',
          'Concordant ST elevation ≥ 1 mm; concordant ST depression ≥ 1 mm in V1–V3; excessively discordant ST elevation (ST/S ≤ −0.25)',
          'Elevación concordante del ST ≥ 1 mm; descenso concordante ≥ 1 mm en V1-V3; elevación discordante excesiva (ST/S ≤ −0,25)',
        ),
        source: 'Sgarbossa 1996; Smith 2012',
      },
    ],
    mechanism: l(
      '左束支阻滞时，室间隔改由右侧激动，因此左侧导联正常的小间隔q波消失，V1初始r波也随之消失。左心室随后由右侧经心肌缓慢激动，在左侧导联形成宽大、有切迹的R波，在V1–V2形成深的QS或rS波。',
      'With the left bundle blocked, the septum is activated from the right side, so the normal small septal q in the left-sided leads disappears and V1 loses its initial r. The left ventricle is then activated slowly through muscle from the right, which produces a broad, notched R in the left-sided leads and a deep QS or rS in V1–V2.',
      'Con la rama izquierda bloqueada, el tabique se activa desde la derecha, de modo que desaparece la pequeña q septal normal de las derivaciones izquierdas y V1 pierde su r inicial. Después el ventrículo izquierdo se activa lentamente a través del músculo desde la derecha, lo que produce una R ancha y mellada en las derivaciones izquierdas y una QS o rS profunda en V1-V2.',
    ),
    mimics: [
      {
        id: 'paced-rhythm',
        discriminator: l(
          '此处QRS前无刺激信号，跟随窦性P波；右心室起搏时每个QRS前有信号，电轴常向上。',
          'Here no spike precedes the QRS, which follows a sinus P; RV pacing puts a spike before each QRS and the axis is usually superior.',
          'Aquí ninguna espiga precede al QRS, que sigue a una P sinusal; la estimulación del VD pone una espiga antes de cada QRS y el eje suele ser superior.',
        ),
        leads: ['V1', 'II'],
      },
      {
        id: 'lvh',
        discriminator: l(
          '左心室肥厚QRS<120 ms，保留间隔q波，R峰时间正常或轻度延长；此处无q波且QRS≥120 ms。',
          'LVH has a QRS < 120 ms with septal q waves preserved and a normal or slightly long R-wave peak time; here there is no q and the QRS is ≥ 120 ms.',
          'La HVI tiene QRS < 120 ms con q septales conservadas y tiempo de pico de la R normal o algo largo; aquí no hay q y el QRS es ≥ 120 ms.',
        ),
        leads: ['V5', 'V6', 'I'],
      },
      {
        id: 'ivcd',
        discriminator: l(
          '非特异性室内传导延迟QRS增宽但保留间隔q波或形态不符合左束支阻滞。',
          'A nonspecific IVCD is wide but keeps septal q waves or otherwise does not fit LBBB morphology.',
          'El TCIV inespecífico es ancho pero conserva las q septales o no encaja con la morfología de BRI.',
        ),
        leads: ['I', 'V6'],
      },
      {
        id: 'sgarbossa-positive',
        discriminator: l(
          '此处V1–V3的ST抬高与QRS方向相反且成比例（ST/S>−0.25）；同向或过度反向的ST改变为Sgarbossa阳性。',
          'Here the ST elevation in V1–V3 is discordant and proportionate (ST/S > −0.25); concordant or excessively discordant ST change is Sgarbossa-positive.',
          'Aquí la elevación del ST en V1-V3 es discordante y proporcionada (ST/S > −0,25); un ST concordante o excesivamente discordante es Sgarbossa positivo.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
      {
        id: 'wpw',
        discriminator: l('右侧旁路预激也呈左束支阻滞样，但PR短并有delta波。', 'A right-sided pathway also looks LBBB-like, but with a short PR and a delta wave.', 'Una vía accesoria derecha también parece un BRI, pero con PR corto y onda delta.'),
        leads: ['V1', 'II'],
      },
    ],
    pitfalls: [
      l('把V1–V3预期的反向ST抬高当作STEMI——应用Sgarbossa/Smith标准。', 'Calling the expected discordant ST elevation in V1–V3 a STEMI — apply the Sgarbossa/Smith criteria.', 'Llamar IAMCEST a la elevación discordante esperada en V1-V3: aplica los criterios de Sgarbossa/Smith.'),
      l(
        '把左束支阻滞自动视为STEMI等危症——但伴持续缺血症状时，无论新旧都走直接PCI流程。',
        'Treating LBBB as an automatic STEMI equivalent — but with ongoing ischaemic symptoms, LBBB leads to a primary-PCI pathway whether it is new or old.',
        'Considerar el BRI un equivalente automático de IAMCEST; pero con síntomas isquémicos persistentes lleva a la vía de ICP primaria, sea nuevo o antiguo.',
      ),
      l('在左束支阻滞中根据电压或Q波诊断左心室肥厚或陈旧性梗死。', 'Diagnosing LVH or old infarction from voltage or Q waves in LBBB.', 'Diagnosticar HVI o infarto antiguo por el voltaje o las ondas Q en presencia de BRI.'),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '有胸痛时应用Sgarbossa/Smith标准并与旧图比较；持续缺血症状→直接PCI流程。无症状的新发左束支阻滞：安排超声心动图寻找结构性心脏病。',
        'With chest pain, apply the Sgarbossa/Smith criteria and compare with old ECGs; ongoing ischaemic symptoms → primary-PCI pathway. New LBBB without symptoms: arrange an echocardiogram for structural heart disease.',
        'Con dolor torácico, aplica los criterios de Sgarbossa/Smith y compara con ECG previos; síntomas isquémicos persistentes → vía de ICP primaria. BRI nuevo sin síntomas: solicita un ecocardiograma para buscar cardiopatía estructural.',
      ),
    },
    lessons: ['r6', 'i10'],
    sources: [REF.surawicz2009, R.strauss2011, R.glikson2021, R.mcdonagh2021, REF.sgarbossa1996, REF.smith2012, REF.escAcs2023],
    aka: ['LBBB', 'CLBBB', 'BRI', 'BCRI', 'strict LBBB', '左束支阻滞'],
    exemplar: { scenarios: ['lbbb'], leads: ['V1', 'V2', 'I', 'aVL', 'V5', 'V6'] },
  },
  {
    id: 'ilbbb',
    definition: l(
      'QRS 110–119 ms的左束支阻滞样传导：Ⅰ、V5、V6无间隔q波，左胸导联R峰时间延长。',
      'LBBB-like conduction with a QRS of 110–119 ms: no septal q in I, V5 and V6 and a delayed R-wave peak time in the left precordial leads.',
      'Conducción tipo BRI con un QRS de 110-119 ms: sin q septal en I, V5 y V6 y tiempo de pico de la R prolongado en las precordiales izquierdas.',
    ),
    features: [
      l('QRS 110–119 ms（成人）。', 'QRS 110–119 ms (adults).', 'QRS de 110-119 ms (adultos).'),
      l('Ⅰ、V5、V6间隔q波消失。', 'Loss of septal q waves in I, V5 and V6.', 'Pérdida de las q septales en I, V5 y V6.'),
      l('V4–V6的R峰时间>60 ms，常伴左心室肥厚电压。', 'R-wave peak time > 60 ms in V4–V6, often with LVH voltage.', 'Tiempo de pico de la R > 60 ms en V4-V6, a menudo con voltaje de HVI.'),
      l('通常反映左心室病变（肥厚、心肌病），很少孤立存在。', 'Usually reflects left ventricular disease (hypertrophy, cardiomyopathy); seldom isolated.', 'Suele reflejar enfermedad del ventrículo izquierdo (hipertrofia, miocardiopatía); rara vez aislado.'),
    ],
    criteria: [
      {
        label: l('不完全性左束支阻滞', 'Incomplete LBBB', 'Bloqueo incompleto de rama izquierda'),
        value: l(
          'QRS 110–119 ms；左心室肥厚图形；V4–V6的R峰时间>60 ms；Ⅰ、V5、V6无q波',
          'QRS 110–119 ms; LVH pattern; R-wave peak time > 60 ms in V4–V6; no q in I, V5, V6',
          'QRS de 110-119 ms; patrón de HVI; tiempo de pico de la R > 60 ms en V4-V6; sin q en I, V5, V6',
        ),
        source: 'Surawicz 2009 (AHA/ACCF/HRS Part III)',
      },
      {
        label: l('儿童', 'Children', 'Niños'),
        value: l('90–100 ms（8–16岁），80–90 ms（<8岁）', '90–100 ms (8–16 y), 80–90 ms (< 8 y)', '90-100 ms (8-16 años), 80-90 ms (< 8 años)'),
        source: 'Surawicz 2009',
      },
    ],
    mechanism: l(
      '左束支部分传导延迟或左心室增厚，使室间隔在左侧冲动到达之前先由右侧激动，间隔q波因而消失。左心室激动稍有延迟，R峰时间延长，但QRS尚未达到120 ms。',
      'Partial delay in the left bundle, or a thick left ventricle, lets the septum be activated from the right before the left-sided impulse arrives, which removes the septal q. The left ventricle is then activated slightly late, so the R-wave peak time lengthens without the QRS reaching 120 ms.',
      'Un retraso parcial en la rama izquierda, o un ventrículo izquierdo grueso, hace que el tabique se active desde la derecha antes de que llegue el impulso izquierdo, lo que elimina la q septal. El ventrículo izquierdo se activa un poco tarde, de modo que el tiempo de pico de la R se alarga sin que el QRS llegue a 120 ms.',
    ),
    mimics: [
      {
        id: 'lbbb',
        discriminator: l('此处QRS 110–119 ms；完全性左束支阻滞≥120 ms。', 'Here the QRS is 110–119 ms; complete LBBB is ≥ 120 ms.', 'Aquí el QRS mide 110-119 ms; el BRI completo mide ≥ 120 ms.'),
        leads: ['V5', 'V6'],
      },
      {
        id: 'lvh',
        discriminator: l('单纯左心室肥厚保留间隔q波；此处q波消失。', 'Plain LVH keeps the septal q waves; here they are lost.', 'La HVI simple conserva las q septales; aquí se han perdido.'),
        leads: ['I', 'V5', 'V6'],
      },
      {
        id: 'ivcd',
        discriminator: l(
          '非特异性室内传导延迟保留间隔q波或不具左束支阻滞特征。',
          'A nonspecific IVCD keeps septal q waves or lacks the LBBB features.',
          'El TCIV inespecífico conserva las q septales o no tiene los rasgos de BRI.',
        ),
        leads: ['I', 'V6'],
      },
    ],
    pitfalls: [
      l('只报告该图形而不寻找原因（左心室肥厚、心肌病）。', 'Reporting it without looking for its cause (LVH, cardiomyopathy).', 'Informarlo sin buscar su causa (HVI, miocardiopatía).'),
      l('把110–119 ms的QRS称为“正常”。', 'Calling a QRS of 110–119 ms “normal”.', 'Llamar «normal» a un QRS de 110-119 ms.'),
    ],
    lessons: ['r6'],
    sources: [REF.surawicz2009, REF.hancock2009],
    aka: ['ILBBB', 'iLBBB', 'BIRI', '不完全性左束支阻滞'],
    exemplar: { scenarios: ['ilbbb'], leads: ['I', 'V5', 'V6'] },
  },
  {
    id: 'lafb',
    definition: l(
      '左前分支阻滞：额面电轴−45°至−90°，aVL呈qR，Ⅱ、Ⅲ、aVF呈rS，QRS<120 ms。',
      'Block of the left anterior fascicle: frontal axis −45° to −90° with qR in aVL, rS in II, III and aVF and QRS < 120 ms.',
      'Bloqueo del fascículo anterior izquierdo: eje frontal de −45° a −90° con qR en aVL, rS en II, III y aVF y QRS < 120 ms.',
    ),
    features: [
      l('显著电轴左偏（−45°至−90°）：Ⅰ正向，Ⅱ、Ⅲ、aVF呈rS（SⅢ>SⅡ）。', 'Marked left axis deviation (−45° to −90°): I positive, rS in II, III and aVF (S in III deeper than in II).', 'Desviación marcada del eje a la izquierda (−45° a −90°): I positiva, rS en II, III y aVF (S en III más profunda que en II).'),
      l('aVL（和Ⅰ）呈qR；aVL的R峰时间≥45 ms。', 'qR in aVL (and I); R-wave peak time in aVL ≥ 45 ms.', 'qR en aVL (y en I); tiempo de pico de la R en aVL ≥ 45 ms.'),
      l('QRS<120 ms（常比以前稍宽）。', 'QRS < 120 ms (often slightly wider than before).', 'QRS < 120 ms (a menudo algo más ancho que antes).'),
      l(
        '胸导联：V5–V6 S波加深，可有R波递增不良——不要据此过度诊断前壁梗死，也不要凭aVL电压诊断左心室肥厚。',
        'Precordial leads: deeper S in V5–V6 and possible poor R progression — do not over-call anterior MI from it, or LVH from aVL voltage.',
        'Precordiales: S más profunda en V5-V6 y posible mala progresión de R; no sobrediagnostiques un infarto anterior por ello ni una HVI por el voltaje de aVL.',
      ),
      l('排除下壁心梗（下壁以Q波而非r波起始）。', 'Exclude inferior MI (Q waves instead of an initial r in the inferior leads).', 'Descarta un infarto inferior (ondas Q en vez de r inicial en las inferiores).'),
    ],
    criteria: [
      {
        label: l('左前分支阻滞', 'Left anterior fascicular block', 'Bloqueo fascicular anterior izquierdo'),
        value: l('电轴−45°至−90°；aVL呈qR；aVL的R峰时间≥45 ms；QRS<120 ms', 'Axis −45° to −90°; qR in aVL; R-wave peak time in aVL ≥ 45 ms; QRS < 120 ms', 'Eje −45° a −90°; qR en aVL; tiempo de pico de la R en aVL ≥ 45 ms; QRS < 120 ms'),
        source: 'Surawicz 2009 (AHA/ACCF/HRS Part III)',
      },
      {
        label: l('合并左心室肥厚时', 'LVH with LAFB', 'HVI con BFAI'),
        value: l('aVL电压会高估左心室肥厚；建议SⅢ+胸导联最大(R+S)≥30 mm', 'aVL voltage over-calls LVH; S(III) + the largest precordial R+S ≥ 30 mm has been proposed', 'El voltaje de aVL sobrediagnostica HVI; se ha propuesto S(III) + la mayor R+S precordial ≥ 30 mm'),
        source: 'Hancock 2009; Gertsch 1988',
      },
    ],
    mechanism: l(
      '左前分支阻滞时，左心室首先经左后分支从下后方激动，前上壁最后激动。初始向量指向下方（下壁导联小r、aVL小q），后续主向量指向左上方，形成显著电轴左偏。',
      'With the anterior fascicle blocked, the left ventricle is activated first through the posterior fascicle, from inferior and posterior, and its anterosuperior wall last. The initial forces point down (small r inferiorly, small q in aVL) and the late, dominant forces point up and to the left, giving the marked left axis.',
      'Con el fascículo anterior bloqueado, el ventrículo izquierdo se activa primero por el fascículo posterior, desde abajo y atrás, y la pared anterosuperior la última. Las fuerzas iniciales apuntan hacia abajo (r pequeña inferior, q pequeña en aVL) y las tardías, dominantes, hacia arriba y a la izquierda, lo que da la desviación marcada del eje.',
    ),
    mimics: [
      {
        id: 'lad',
        discriminator: l(
          '电轴左偏只是测量结果；左前分支阻滞是诊断，需≤−45°加aVL qR、下壁rS且无其他原因。',
          'LAD is a measurement; LAFB is a diagnosis that needs ≤ −45° plus qR in aVL, rS inferiorly and no other cause.',
          'La desviación a la izquierda es una medida; el BFAI es un diagnóstico que exige ≤ −45°, qR en aVL, rS inferior y ninguna otra causa.',
        ),
        leads: ['aVL', 'II', 'III'],
      },
      {
        id: 'old-mi-inferior',
        discriminator: l(
          '此处下壁导联以小r波起始（rS）；陈旧性下壁梗死以Q波起始（QS或Qr）。',
          'Here the inferior leads start with a small r (rS); old inferior MI starts with a Q wave (QS or Qr).',
          'Aquí las inferiores empiezan con una r pequeña (rS); el infarto inferior antiguo empieza con una Q (QS o Qr).',
        ),
        leads: ['II', 'III', 'aVF'],
      },
      {
        id: 'lvh',
        discriminator: l(
          '左前分支阻滞本身使aVL的R波增高；只凭aVL电压会误诊左心室肥厚。',
          'LAFB itself makes the R in aVL taller; aVL voltage alone will over-call LVH.',
          'El propio BFAI hace más alta la R de aVL; el voltaje de aVL por sí solo sobrediagnostica HVI.',
        ),
        leads: ['aVL', 'III'],
      },
    ],
    pitfalls: [
      l('在−30°至−45°（中度左偏）或无aVL qR时诊断左前分支阻滞。', 'Diagnosing LAFB at −30° to −45° (moderate LAD) or without the qR in aVL.', 'Diagnosticar BFAI con −30° a −45° (desviación moderada) o sin qR en aVL.'),
      l('在左前分支阻滞时凭aVL R≥11 mm诊断左心室肥厚。', 'Calling LVH from an R ≥ 11 mm in aVL in the presence of LAFB.', 'Diagnosticar HVI por una R ≥ 11 mm en aVL en presencia de BFAI.'),
      l('漏掉被左前分支阻滞掩盖的下壁梗死。', 'Missing an inferior infarct hidden by LAFB.', 'Pasar por alto un infarto inferior enmascarado por el BFAI.'),
    ],
    lessons: ['r7', 's5'],
    sources: [REF.surawicz2009, REF.hancock2009, R.gertsch1988],
    aka: ['LAFB', 'LAHB', 'left anterior hemiblock', 'hemibloqueo anterior izquierdo', 'BFAI', 'HBAI', '左前半支阻滞'],
    exemplar: { scenarios: ['lafb'], leads: ['I', 'II', 'III', 'aVF', 'aVL'] },
  },
  {
    id: 'lpfb',
    definition: l(
      '左后分支阻滞——排除性诊断：电轴右偏（+90°至+180°），Ⅰ、aVL呈rS，Ⅲ、aVF呈qR，QRS<120 ms。',
      'Block of the left posterior fascicle — a diagnosis of exclusion: right axis deviation (+90° to +180°) with rS in I and aVL, qR in III and aVF and QRS < 120 ms.',
      'Bloqueo del fascículo posterior izquierdo, un diagnóstico de exclusión: desviación del eje a la derecha (+90° a +180°) con rS en I y aVL, qR en III y aVF y QRS < 120 ms.',
    ),
    features: [
      l('成人电轴右偏+90°至+180°：Ⅰ、aVL呈rS，Ⅲ、aVF呈qR。', 'Right axis deviation of +90° to +180° in an adult: rS in I and aVL, qR in III and aVF.', 'Desviación del eje a la derecha de +90° a +180° en el adulto: rS en I y aVL, qR en III y aVF.'),
      l('QRS时限<120 ms（合并右束支阻滞时即为双分支阻滞）。', 'QRS duration < 120 ms (with RBBB added it becomes bifascicular block).', 'Duración del QRS < 120 ms (si se añade un BRD, pasa a ser un bloqueo bifascicular).'),
      l(
        '先排除其他原因：右心室肥厚、侧壁梗死、垂直位心脏/瘦长体型、急性右心室负荷（肺栓塞）、肺气肿、肢体导联反接。',
        'Exclude other causes first: RVH, lateral MI, a vertical heart or slender build, acute RV strain (pulmonary embolism), emphysema, limb-lead reversal.',
        'Descarta antes otras causas: HVD, infarto lateral, corazón vertical o constitución delgada, sobrecarga aguda del VD (tromboembolismo pulmonar), enfisema, inversión de electrodos de los miembros.',
      ),
      l('单独出现罕见，常与右束支阻滞并存（双分支阻滞）；系列心电图上新出现的电轴右移支持诊断。', 'Rare in isolation and often with RBBB (bifascicular block); a new rightward shift on serial ECGs supports it.', 'Raro de forma aislada y a menudo con BRD (bloqueo bifascicular); un desplazamiento nuevo a la derecha en ECG seriados lo apoya.'),
    ],
    criteria: [
      {
        label: l('左后分支阻滞', 'Left posterior fascicular block', 'Bloqueo fascicular posterior izquierdo'),
        value: l(
          '电轴+90°至+180°；Ⅰ、aVL呈rS；Ⅲ、aVF呈qR；QRS<120 ms；已排除其他原因',
          'Axis +90° to +180°; rS in I and aVL; qR in III and aVF; QRS < 120 ms; other causes excluded',
          'Eje +90° a +180°; rS en I y aVL; qR en III y aVF; QRS < 120 ms; otras causas descartadas',
        ),
        source: 'Surawicz 2009 (AHA/ACCF/HRS Part III)',
      },
      {
        label: l('儿童（至16岁）', 'Children (up to 16 y)', 'Niños (hasta 16 años)'),
        value: l('仅在记录到明确的电轴右移时使用', 'Use only when a distinct rightward axis shift is documented', 'Úsalo solo si se documenta un desplazamiento claro del eje a la derecha'),
        source: 'Surawicz 2009',
      },
    ],
    mechanism: l(
      '左后分支阻滞时，激动先经左前分支从左心室前上部开始，下后壁最后激动。因此初始向量指向左上（Ⅰ导联小r、下壁导联小q），后续向量指向右下，形成电轴右偏。',
      'With the posterior fascicle blocked, activation starts through the anterior fascicle in the anterosuperior left ventricle and reaches the inferoposterior wall last. The initial forces therefore point up and to the left (small r in I, small q inferiorly) and the late forces down and to the right, producing right axis deviation.',
      'Con el fascículo posterior bloqueado, la activación empieza por el fascículo anterior en la región anterosuperior del ventrículo izquierdo y alcanza la pared inferoposterior la última. Por eso las fuerzas iniciales apuntan hacia arriba y a la izquierda (r pequeña en I, q pequeña inferior) y las tardías hacia abajo y a la derecha, lo que produce desviación del eje a la derecha.',
    ),
    mimics: [
      {
        id: 'rad',
        discriminator: l(
          '电轴右偏只是测量结果；左后分支阻滞还需Ⅲ/aVF qR、Ⅰ/aVL rS并排除其他原因。',
          'RAD is the measurement; LPFB also needs qR in III/aVF, rS in I/aVL and every other cause excluded.',
          'La desviación a la derecha es la medida; el BFPI exige además qR en III/aVF, rS en I/aVL y descartar las demás causas.',
        ),
        leads: ['I', 'III', 'aVF'],
      },
      {
        id: 'rvh',
        discriminator: l(
          '右心室肥厚有V1高R（R/S>1）或qR、右心房异常和继发性ST-T改变；左后分支阻滞V1正常。',
          'RVH shows a tall R (R/S > 1) or qR in V1, right atrial abnormality and secondary ST–T change; in LPFB V1 is normal.',
          'La HVD muestra R alta (R/S > 1) o qR en V1, anomalía auricular derecha y alteración secundaria del ST-T; en el BFPI V1 es normal.',
        ),
        leads: ['V1', 'V2'],
      },
      {
        id: 'pulmonary-embolism',
        discriminator: l(
          '急性右心室负荷：新出现的右偏伴窦性心动过速和V1–V4 T波倒置。',
          'Acute RV strain: a new rightward shift with sinus tachycardia and T inversion in V1–V4.',
          'Sobrecarga aguda del VD: desplazamiento nuevo a la derecha con taquicardia sinusal e inversión de T en V1-V4.',
        ),
        leads: ['I', 'V1', 'V2', 'V3'],
      },
      {
        id: 'old-mi-lateral',
        discriminator: l('侧壁梗死在Ⅰ、aVL有病理性Q波；左后分支阻滞在Ⅰ、aVL以小r波起始。', 'Lateral MI has pathological Q waves in I and aVL; LPFB starts with a small r in I and aVL.', 'El infarto lateral tiene Q patológicas en I y aVL; el BFPI empieza con una r pequeña en I y aVL.'),
        leads: ['I', 'aVL'],
      },
      {
        id: 'electrode-reversal-la-ra',
        discriminator: l('上肢电极反接时Ⅰ导联P波也倒置；左后分支阻滞时P波正常。', 'With arm-electrode reversal the P in I is inverted too; in LPFB the P is normal.', 'Con la inversión de los electrodos de los brazos la P también es negativa en I; en el BFPI la P es normal.'),
        leads: ['I', 'aVR'],
      },
    ],
    pitfalls: [
      l('未排除右心室肥厚、侧壁梗死、肺部疾病和导联反接就诊断左后分支阻滞。', 'Diagnosing LPFB without excluding RVH, lateral MI, lung disease and lead reversal.', 'Diagnosticar BFPI sin descartar HVD, infarto lateral, neumopatía e inversión de electrodos.'),
      l('把成人电轴标准套用于儿童或瘦长的年轻人。', 'Applying adult axis limits to children or slim young adults.', 'Aplicar los límites del eje del adulto a niños o a adultos jóvenes delgados.'),
    ],
    lessons: ['r7', 's5'],
    sources: [REF.surawicz2009, REF.hancock2009, REF.escPe2019, REF.batchvarov2007],
    aka: ['LPFB', 'LPHB', 'left posterior hemiblock', 'hemibloqueo posterior izquierdo', 'BFPI', 'HBPI', '左后半支阻滞'],
    exemplar: { scenarios: ['lpfb'], leads: ['I', 'aVL', 'III', 'aVF'] },
  },
  {
    id: 'bifascicular-block',
    definition: l(
      '三支中的两支传导阻滞，最常见为右束支阻滞合并左前分支阻滞（较少为右束支阻滞合并左后分支阻滞）。',
      'Block in two of the three fascicles, most often RBBB with left anterior fascicular block (less often RBBB with left posterior fascicular block).',
      'Bloqueo de dos de los tres fascículos, casi siempre BRD con bloqueo fascicular anterior izquierdo (menos a menudo BRD con bloqueo fascicular posterior izquierdo).',
    ),
    features: [
      l('V1、Ⅰ、V6符合右束支阻滞（QRS≥120 ms）。', 'RBBB criteria in V1, I and V6 (QRS ≥ 120 ms).', 'Criterios de BRD en V1, I y V6 (QRS ≥ 120 ms).'),
      l(
        '加左前分支阻滞：电轴−45°至−90°，aVL qR，下壁rS伴宽终末S；或加左后分支阻滞：电轴+90°至+180°，Ⅰ/aVL rS，Ⅲ/aVF qR。',
        'Plus LAFB: axis −45° to −90°, qR in aVL, rS inferiorly with a broad terminal S — or plus LPFB: axis +90° to +180°, rS in I/aVL, qR in III/aVF.',
        'Más BFAI: eje −45° a −90°, qR en aVL, rS inferior con S terminal ancha; o más BFPI: eje +90° a +180°, rS en I/aVL, qR en III/aVF.',
      ),
      l('PR延长单独作为一个组成部分报告（“右束支阻滞+左前分支阻滞+一度房室阻滞”）。', 'Report a long PR as a separate component (“RBBB + LAFB + first-degree AV block”).', 'Informa un PR largo como componente aparte («BRD + BFAI + bloqueo AV de primer grado»).'),
      l(
        '无症状：不需起搏；不明原因晕厥：电生理检查（HV≥70 ms→起搏）。',
        'Asymptomatic: no pacing; unexplained syncope: electrophysiology study (HV ≥ 70 ms → pacing).',
        'Asintomático: no necesita marcapasos; síncope inexplicado: estudio electrofisiológico (HV ≥ 70 ms → marcapasos).',
      ),
      l(
        '伪装型束支阻滞：V1呈右束支阻滞，而肢体导联似左束支阻滞（Ⅰ/aVL无S波）——提示严重传导系统病变。',
        'Masquerading BBB: RBBB in V1 but LBBB-like limb leads (no S in I/aVL) — a sign of advanced conduction disease.',
        'BR enmascarado: BRD en V1 pero derivaciones de los miembros tipo BRI (sin S en I/aVL); indica una enfermedad avanzada de la conducción.',
      ),
    ],
    criteria: [
      {
        label: l('右束支阻滞+左前分支阻滞', 'RBBB + LAFB', 'BRD + BFAI'),
        value: l('右束支阻滞形态+电轴−45°至−90°（aVL qR，下壁rS）', 'RBBB morphology + axis −45° to −90° (qR in aVL, rS inferiorly)', 'Morfología de BRD + eje −45° a −90° (qR en aVL, rS inferior)'),
        source: 'Surawicz 2009 (AHA/ACCF/HRS Part III)',
      },
      {
        label: l('右束支阻滞+左后分支阻滞', 'RBBB + LPFB', 'BRD + BFPI'),
        value: l('右束支阻滞形态+电轴+90°至+180°，并排除其他原因', 'RBBB morphology + axis +90° to +180° after excluding other causes', 'Morfología de BRD + eje +90° a +180° tras descartar otras causas'),
        source: 'Surawicz 2009',
      },
      {
        label: l('晕厥合并双分支阻滞', 'Syncope with bifascicular block', 'Síncope con bloqueo bifascicular'),
        value: l('电生理检查；HV≥70 ms或希氏束下阻滞→起搏', 'Electrophysiology study; HV ≥ 70 ms or infra-His block → pacing', 'Estudio electrofisiológico; HV ≥ 70 ms o bloqueo infrahisiano → marcapasos'),
        source: 'Glikson 2021 (ESC pacing); Brignole 2018',
      },
      {
        label: l('无症状', 'Asymptomatic', 'Asintomático'),
        value: l('无起搏指征', 'No pacing indication', 'Sin indicación de marcapasos'),
        source: 'Kusumoto 2018 (ACC/AHA/HRS bradycardia)',
      },
    ],
    mechanism: l(
      '右束支和一支左侧分支阻滞时，心室的快速传导只依赖剩下的一支分支。QRS兼有右束支阻滞的终末右向向量和分支阻滞引起的电轴偏移，若最后这一支也失传导，就会发生完全性房室阻滞。',
      'With the right bundle and one left fascicle blocked, the ventricles depend on the single remaining fascicle for rapid conduction. The QRS combines the late rightward forces of RBBB with the axis shift of the fascicular block, and failure of that last fascicle would mean complete AV block.',
      'Con la rama derecha y un fascículo izquierdo bloqueados, los ventrículos dependen del único fascículo restante para la conducción rápida. El QRS combina las fuerzas tardías hacia la derecha del BRD con el cambio de eje del bloqueo fascicular, y si falla ese último fascículo aparece un bloqueo AV completo.',
    ),
    mimics: [
      {
        id: 'rbbb',
        discriminator: l('单纯右束支阻滞电轴正常；此处合并显著左偏或右偏——一定要看电轴。', 'Isolated RBBB has a normal axis; here there is also marked left or right deviation — always check the axis.', 'El BRD aislado tiene eje normal; aquí hay además una desviación marcada a la izquierda o a la derecha: mira siempre el eje.'),
        leads: ['I', 'II', 'aVF'],
      },
      {
        id: 'trifascicular-block',
        discriminator: l(
          '三分支阻滞需三支均受累的证据（交替性束支阻滞）；仅PR延长并不构成三分支阻滞。',
          'Trifascicular block needs evidence that all three fascicles fail (alternating BBB); a long PR alone does not make it trifascicular.',
          'El bloqueo trifascicular exige pruebas de fallo de los tres fascículos (bloqueo de rama alternante); un PR largo por sí solo no lo convierte en trifascicular.',
        ),
        leads: ['V1', 'II'],
      },
      {
        id: 'lbbb',
        discriminator: l(
          '伪装型束支阻滞的肢体导联似左束支阻滞，但V1为宽R′——仍是右束支阻滞+左前分支阻滞。',
          'Masquerading BBB has LBBB-like limb leads but a broad R′ in V1 — it is still RBBB plus LAFB.',
          'El BR enmascarado tiene derivaciones de los miembros tipo BRI pero una R′ ancha en V1: sigue siendo BRD más BFAI.',
        ),
        leads: ['V1', 'I', 'aVL'],
      },
    ],
    pitfalls: [
      l('把双分支阻滞+PR延长称为“三分支阻滞”。', 'Calling bifascicular block with a long PR “trifascicular block”.', 'Llamar «bloqueo trifascicular» a un bloqueo bifascicular con PR largo.'),
      l('不看电轴，只报告“右束支阻滞”。', 'Missing the axis and reporting only “RBBB”.', 'No mirar el eje e informar solo «BRD».'),
      l('为无症状者起搏，或不查明晕厥原因。', 'Pacing an asymptomatic patient, or not investigating syncope.', 'Implantar un marcapasos a un paciente asintomático, o no estudiar un síncope.'),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '若患者有晕厥，收入监护并安排电生理检查或起搏评估；无症状者常规随访。',
        'If the patient has had syncope, admit to monitoring and arrange an electrophysiology study or pacing assessment; if asymptomatic, routine follow-up.',
        'Si el paciente ha tenido un síncope, ingrésalo con monitorización y solicita estudio electrofisiológico o valoración para marcapasos; si está asintomático, seguimiento habitual.',
      ),
    },
    lessons: ['r7'],
    sources: [REF.surawicz2009, R.glikson2021, R.brignole2018, REF.kusumoto2018, R.elizari2013],
    aka: ['bifascicular', 'RBBB + LAFB', 'BRD + BFAI', 'bloqueo bifascicular', 'masquerading bundle branch block', '双束支阻滞'],
    exemplar: { scenarios: ['bifascicular-block'], leads: ['V1', 'I', 'II', 'aVF', 'aVL'] },
  },
  {
    id: 'trifascicular-block',
    definition: l(
      '三支均传导阻滞的心电图证据——表现为交替性束支阻滞（或完全性房室阻滞伴宽QRS逸搏）；双分支阻滞伴PR延长应按各组成部分报告。',
      'ECG evidence of block in all three fascicles — shown by alternating bundle branch block (or complete AV block with a wide escape); bifascicular block with a long PR is reported by its components instead.',
      'Pruebas en el ECG de bloqueo de los tres fascículos, que se manifiestan como bloqueo de rama alternante (o bloqueo AV completo con escape ancho); el bloqueo bifascicular con PR largo se informa por sus componentes.',
    ),
    features: [
      l(
        '交替性束支阻滞：同一或先后心电图上出现右束支阻滞和左束支阻滞，或右束支阻滞+左前分支阻滞与右束支阻滞+左后分支阻滞交替。',
        'Alternating BBB: RBBB and LBBB on the same or successive ECGs, or RBBB + LAFB alternating with RBBB + LPFB.',
        'Bloqueo de rama alternante: BRD y BRI en el mismo ECG o en ECG sucesivos, o BRD + BFAI que alterna con BRD + BFPI.',
      ),
      l('既往双分支阻滞患者出现完全性房室阻滞伴宽QRS结下逸搏。', 'Complete AV block with a wide infranodal escape in a patient with known bifascicular block.', 'Bloqueo AV completo con escape infranodal ancho en un paciente con bloqueo bifascicular conocido.'),
      l(
        '双分支阻滞+PR>200 ms不是三分支阻滞：报告为“右束支阻滞+左前分支阻滞+一度房室阻滞”（PR延长多在房室结）。',
        'Bifascicular block + PR > 200 ms is NOT trifascicular: report “RBBB + LAFB + first-degree AV block” (the PR delay is usually nodal).',
        'Bloqueo bifascicular + PR > 200 ms NO es trifascicular: informa «BRD + BFAI + bloqueo AV de primer grado» (el retraso del PR suele ser nodal).',
      ),
      l('比较系列心电图：交替常只在不同记录之间才能看到。', 'Compare serial ECGs: the alternation is often seen only across tracings.', 'Compara ECG seriados: la alternancia a menudo solo se ve entre registros.'),
    ],
    criteria: [
      {
        label: l('术语', 'Terminology', 'Terminología'),
        value: l('双分支阻滞+PR>200 ms不用“三分支”，应列出各组成部分', 'Avoid “trifascicular” for bifascicular block + PR > 200 ms; name the components', 'Evita «trifascicular» para el bloqueo bifascicular + PR > 200 ms; nombra los componentes'),
        source: 'Surawicz 2009; Kusumoto 2018',
      },
      {
        label: l('交替性束支阻滞', 'Alternating BBB', 'Bloqueo de rama alternante'),
        value: l('即使无症状，永久起搏为Ⅰ类', 'Permanent pacing class I, even without symptoms', 'Marcapasos definitivo clase I, incluso sin síntomas'),
        source: 'Glikson 2021 (ESC pacing); Kusumoto 2018',
      },
    ],
    mechanism: l(
      '右束支和左侧两支分支均有病变时，传导在恰好恢复的分支之间交替，QRS在右束支和左束支阻滞图形之间切换。任何时刻三支都可能同时失传导，导致突发完全性房室阻滞和缓慢的宽QRS逸搏。',
      'When the right bundle and both left fascicles are all diseased, conduction alternates between whichever fascicle happens to recover, so the QRS switches between right and left bundle branch patterns. At any moment all three may fail together, which causes sudden complete AV block with a slow, wide escape.',
      'Cuando la rama derecha y los dos fascículos izquierdos están enfermos, la conducción alterna entre el fascículo que se recupera en cada momento, y el QRS cambia entre patrones de bloqueo de rama derecha e izquierda. En cualquier momento pueden fallar los tres a la vez, lo que causa un bloqueo AV completo brusco con un escape lento y ancho.',
    ),
    mimics: [
      {
        id: 'bifascicular-block',
        discriminator: l(
          '双分支阻滞只有两支受累，无论PR是否延长；三分支阻滞需看到三支都失传导的证据。',
          'Bifascicular block involves two fascicles, with or without a long PR; trifascicular block needs evidence that all three fail.',
          'El bloqueo bifascicular afecta a dos fascículos, con o sin PR largo; el trifascicular exige pruebas de que fallan los tres.',
        ),
        leads: ['V1', 'II'],
      },
      {
        id: 'aberrant-conduction',
        discriminator: l(
          '频率依赖性束支阻滞只在超过临界频率（或长短周期后）出现，且只累及一侧；交替性束支阻滞与频率无关地在左右之间切换。',
          'Rate-dependent BBB appears only above a critical rate (or after a long–short cycle) and involves one side; alternating BBB switches sides regardless of rate.',
          'El bloqueo de rama dependiente de la frecuencia solo aparece por encima de una frecuencia crítica (o tras un ciclo largo-corto) y afecta a un lado; el alternante cambia de lado sin relación con la frecuencia.',
        ),
        leads: ['V1'],
      },
      {
        id: 'av-block-1',
        discriminator: l('单纯PR延长=房室延迟，多在房室结，不提示三支病变。', 'A long PR alone = AV delay, usually nodal, and does not prove three-fascicle disease.', 'Un PR largo aislado = retraso AV, casi siempre nodal, y no prueba enfermedad de los tres fascículos.'),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l(
        '把双分支阻滞+一度房室阻滞称为“三分支阻滞”（并为无症状者起搏）。',
        'Labelling bifascicular block + first-degree AV block “trifascicular” (and pacing it without symptoms).',
        'Etiquetar como «trifascicular» un bloqueo bifascicular + bloqueo AV de primer grado (e implantar marcapasos sin síntomas).',
      ),
      l('不与旧图比较而漏掉交替性束支阻滞。', 'Missing alternating BBB because old ECGs were not compared.', 'Pasar por alto un bloqueo de rama alternante por no comparar con ECG previos.'),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '交替性束支阻滞即使无症状也需心电监护和永久起搏；调阅旧心电图并寻找房室阻滞。',
        'Alternating bundle branch block needs monitoring and permanent pacing even without symptoms; pull the old ECGs and look for AV block.',
        'El bloqueo de rama alternante requiere monitorización y marcapasos definitivo incluso sin síntomas; revisa los ECG previos y busca bloqueo AV.',
      ),
    },
    lessons: ['r7'],
    sources: [REF.surawicz2009, REF.kusumoto2018, R.glikson2021],
    aka: ['trifascicular', 'alternating bundle branch block', 'alternating BBB', 'bloqueo de rama alternante', 'bloqueo trifascicular', '交替性束支阻滞'],
    exemplar: { scenarios: ['alternating-bbb'], leads: ['V1', 'I', 'II', 'aVF'] },
  },
  {
    id: 'ivcd',
    definition: l(
      '成人QRS>110 ms，但既不符合右束支阻滞也不符合左束支阻滞标准。',
      'QRS > 110 ms in an adult that meets neither RBBB nor LBBB criteria.',
      'QRS > 110 ms en el adulto que no cumple criterios de BRD ni de BRI.',
    ),
    features: [
      l('QRS≥110 ms（整体测量），但V1和V6不符合任一束支阻滞形态。', 'QRS ≥ 110 ms (measured globally), but V1 and V6 fit neither bundle branch pattern.', 'QRS ≥ 110 ms (medido de forma global), pero V1 y V6 no encajan con ningún bloqueo de rama.'),
      l(
        '原因：左心室肥厚、心肌病、陈旧性心梗（梗死周围阻滞）、高钾血症、钠通道阻滞剂、低体温。',
        'Causes: LVH, cardiomyopathy, prior MI (peri-infarction block), hyperkalaemia, sodium-channel blockers, hypothermia.',
        'Causas: HVI, miocardiopatía, infarto previo (bloqueo periinfarto), hiperpotasemia, bloqueantes de canales de sodio, hipotermia.',
      ),
      l('新出现或进行性增宽：先查血钾和用药。', 'New or progressive widening: check potassium and drugs first.', 'Ensanchamiento nuevo o progresivo: revisa primero el potasio y los fármacos.'),
      l('运动员QRS≥140 ms属异常，需评估。', 'A QRS ≥ 140 ms in an athlete is abnormal and needs evaluation.', 'Un QRS ≥ 140 ms en un deportista es anormal y requiere estudio.'),
    ],
    criteria: [
      {
        label: l('非特异性室内传导延迟', 'Nonspecific IVCD', 'TCIV inespecífico'),
        value: l('QRS>110 ms（成人）、>90 ms（8–16岁）、>80 ms（<8岁），形态不符合束支阻滞', 'QRS > 110 ms (adults), > 90 ms (8–16 y), > 80 ms (< 8 y), without RBBB or LBBB morphology', 'QRS > 110 ms (adultos), > 90 ms (8-16 años), > 80 ms (< 8 años), sin morfología de BRD ni BRI'),
        source: 'Surawicz 2009 (AHA/ACCF/HRS Part III)',
      },
      {
        label: l('运动员', 'Athletes', 'Deportistas'),
        value: l('≥140 ms为异常', '≥ 140 ms is abnormal', '≥ 140 ms es anormal'),
        source: 'Sharma 2017',
      },
      {
        label: l('心脏再同步治疗（非左束支阻滞）', 'CRT (non-LBBB)', 'TRC (sin BRI)'),
        value: l('≥150 ms为Ⅱa类；130–149 ms为Ⅱb类（LVEF≤35%）', '≥ 150 ms class IIa; 130–149 ms class IIb (LVEF ≤ 35 %)', '≥ 150 ms clase IIa; 130-149 ms clase IIb (FEVI ≤ 35 %)'),
        source: 'Glikson 2021 (ESC pacing/CRT)',
      },
    ],
    mechanism: l(
      '传导减慢弥漫存在于浦肯野网络或心室肌，而非局限于某一束支，因此各处激动都延长。由于没有单一阻滞路径，QRS增宽但不具备典型的束支阻滞形态。',
      'Conduction is slowed diffusely in the Purkinje network or the ventricular muscle rather than in one bundle, so activation takes longer everywhere. Without a single blocked pathway the QRS widens but keeps no typical bundle branch shape.',
      'La conducción se enlentece de forma difusa en la red de Purkinje o en el músculo ventricular y no en una sola rama, así que la activación tarda más en todas partes. Sin una vía bloqueada concreta, el QRS se ensancha pero no adopta una forma típica de bloqueo de rama.',
    ),
    mimics: [
      {
        id: 'hyperkalemia',
        discriminator: l('高钾血症伴T波高尖、P波低平，QRS随血钾升高而增宽。', 'Hyperkalaemia comes with peaked T waves and flat P waves, and the QRS widens as potassium rises.', 'La hiperpotasemia se acompaña de T picudas y P aplanadas, y el QRS se ensancha a medida que sube el potasio.'),
        leads: ['II', 'V2'],
      },
      {
        id: 'na-channel-blockade',
        discriminator: l('钠通道阻滞剂中毒：aVR终末R波、心动过速和服药过量背景。', 'Sodium-channel blocker toxicity: a terminal R in aVR, tachycardia and an overdose context.', 'Intoxicación por bloqueantes de canales de sodio: R terminal en aVR, taquicardia y contexto de sobredosis.'),
        leads: ['aVR', 'I'],
      },
      {
        id: 'wpw',
        discriminator: l('预激：PR短并有delta波。', 'Pre-excitation: short PR and a delta wave.', 'Preexcitación: PR corto y onda delta.'),
        leads: ['II', 'V5'],
      },
      {
        id: 'lbbb',
        discriminator: l('此处保留间隔q波或不具左束支阻滞特征；左束支阻滞Ⅰ、V5、V6无q波。', 'Here septal q waves are kept or the LBBB features are missing; LBBB has no q in I, V5 or V6.', 'Aquí se conservan las q septales o faltan los rasgos de BRI; el BRI no tiene q en I, V5 ni V6.'),
        leads: ['I', 'V6'],
      },
    ],
    pitfalls: [
      l('把室内传导延迟硬归为“不典型左束支阻滞”（影响再同步治疗决策）。', 'Forcing an IVCD into “atypical LBBB” (it changes CRT decisions).', 'Forzar un TCIV como «BRI atípico» (cambia las decisiones de TRC).'),
      l('QRS在数小时内增宽时漏掉高钾血症或药物中毒。', 'Missing hyperkalaemia or drug toxicity when the QRS widens over hours.', 'Pasar por alto una hiperpotasemia o una intoxicación cuando el QRS se ensancha en horas.'),
    ],
    lessons: ['r7'],
    sources: [REF.surawicz2009, REF.sharma2017, R.glikson2021],
    aka: ['IVCD', 'NIVCD', 'TCIV', 'intraventricular conduction delay', 'trastorno de conducción intraventricular', '室内阻滞'],
    exemplar: { scenarios: ['ivcd'], leads: ['V1', 'V6', 'I'] },
  },
  {
    id: 'aberrant-conduction',
    definition: l(
      '室上性冲动在一侧束支仍处于不应期时到达，因而以暂时的束支阻滞图形下传。',
      'A supraventricular impulse conducted with a temporary bundle branch block pattern because it reaches the conduction system while one bundle is still refractory.',
      'Impulso supraventricular conducido con un patrón transitorio de bloqueo de rama porque llega al sistema de conducción cuando una rama sigue refractaria.',
    ),
    features: [
      l('宽QRS前有（提前的）P′——在前一个搏动的T波中寻找。', 'A wide QRS preceded by a (premature) P′ — look in the T wave of the previous beat.', 'Un QRS ancho precedido de una P′ (prematura): búscala en la onda T del latido anterior.'),
      l(
        '多呈右束支阻滞型（V1三相rsR′，V6 qRs）；起始QRS向量与正常下传搏动相同。',
        'Usually RBBB-shaped (triphasic rsR′ in V1, qRs in V6); the initial QRS vector matches the normally conducted beats.',
        'Suele tener forma de BRD (rsR′ trifásica en V1, qRs en V6); el vector inicial del QRS coincide con el de los latidos conducidos normalmente.',
      ),
      l('Ashman现象：房颤时长周期后的短周期产生宽搏动。', 'Ashman phenomenon: in AF, a short cycle after a long one produces a wide beat.', 'Fenómeno de Ashman: en la FA, un ciclo corto tras uno largo produce un latido ancho.'),
      l('频率依赖性束支阻滞：超过临界频率时出现，需降到更低频率才消失（滞后现象）。', 'Rate-dependent BBB: appears above a critical rate and disappears only at a slower rate (hysteresis).', 'Bloqueo de rama dependiente de la frecuencia: aparece por encima de una frecuencia crítica y solo desaparece a una frecuencia más baja (histéresis).'),
      l('宽QRS心动过速中，只有呈典型束支阻滞形态时才考虑差异性传导——否则按室速处理。', 'In a wide-QRS tachycardia accept aberrancy only with a typical BBB shape — otherwise treat as VT.', 'En una taquicardia de QRS ancho acepta la aberrancia solo con un bloqueo de rama típico; si no, trátala como TV.'),
    ],
    criteria: [
      {
        label: l('支持差异性传导', 'Favour aberrancy', 'A favor de aberrancia'),
        value: l('宽搏动前有提前P′；典型右/左束支阻滞形态；起始向量与下传搏动相同', 'Premature P′ before the wide beat; typical RBBB/LBBB shape; same initial vector as conducted beats', 'P′ prematura antes del latido ancho; forma típica de BRD/BRI; mismo vector inicial que los latidos conducidos'),
        source: 'Surawicz 2009; Brugada 2019 (ESC SVT)',
      },
      {
        label: l('支持室早', 'Favour a PVC', 'A favor de extrasístole ventricular'),
        value: l('无P′、联律间期固定、V1呈单相R/qR、完全性代偿间歇', 'No P′, fixed coupling, monophasic R or qR in V1, compensatory pause', 'Sin P′, acoplamiento fijo, R o qR monofásica en V1, pausa compensadora'),
        source: 'Brugada 2019; Zeppenfeld 2022',
      },
    ],
    mechanism: l(
      '长周期后束支不应期延长，且右束支通常最后恢复，因此长RR间期后的提前冲动会遇到一侧束支仍处于不应期。该搏动经另一侧束支下传，QRS在一个或数个搏动中呈相应的束支阻滞形态。',
      'Bundle branch refractoriness lengthens after a long cycle and the right bundle usually recovers last, so an early impulse after a long R–R finds one bundle still refractory. The beat then spreads through the other bundle and the QRS takes that bundle branch block shape for one or a few beats.',
      'La refractariedad de las ramas se alarga tras un ciclo largo y la rama derecha suele recuperarse la última, así que un impulso precoz tras un R-R largo encuentra una rama todavía refractaria. El latido se propaga entonces por la otra rama y el QRS adopta esa forma de bloqueo de rama durante uno o pocos latidos.',
    ),
    mimics: [
      {
        id: 'pvc',
        discriminator: l(
          '此处宽搏动前有提前的P′；室早前没有P′，代偿间歇完全。',
          'Here a premature P′ precedes the wide beat; a PVC has no P′ before it and a full compensatory pause.',
          'Aquí una P′ prematura precede al latido ancho; la extrasístole ventricular no tiene P′ delante y la pausa es compensadora completa.',
        ),
        leads: ['V1', 'II'],
      },
      {
        id: 'vt-monomorphic',
        discriminator: l(
          '持续宽QRS心动过速只有在呈典型束支阻滞形态时才接受差异性传导；否则按室速处理。',
          'In a sustained wide-QRS tachycardia accept aberrancy only with a typical BBB shape; otherwise treat it as VT.',
          'En una taquicardia sostenida de QRS ancho acepta la aberrancia solo con un bloqueo de rama típico; si no, trátala como TV.',
        ),
        leads: ['V1', 'V6', 'aVR'],
      },
      {
        id: 'wpw',
        discriminator: l('预激搏动有delta波且窦性时PR短；差异性传导起始锐利。', 'Pre-excited beats have a delta wave and a short PR in sinus rhythm; aberrant beats start sharply.', 'Los latidos preexcitados tienen onda delta y PR corto en ritmo sinusal; los aberrantes empiezan de forma nítida.'),
        leads: ['II', 'V1'],
      },
    ],
    pitfalls: [
      l(
        '把房颤中每个宽搏动都称为Ashman现象——联律间期固定且无长短周期的连发宽搏动更可能是室性的。',
        'Calling every wide beat in AF “Ashman” — runs of wide beats with fixed coupling and no long–short sequence are more likely ventricular.',
        'Llamar «Ashman» a cualquier latido ancho en la FA: las rachas de latidos anchos con acoplamiento fijo y sin secuencia largo-corto son probablemente ventriculares.',
      ),
      l('因患者稳定就假定宽QRS心动过速为室上速伴差异性传导。', 'Assuming a wide-QRS tachycardia is SVT with aberrancy because the patient is stable.', 'Suponer que una taquicardia de QRS ancho es una TSV con aberrancia porque el paciente está estable.'),
    ],
    lessons: ['r5', 't5'],
    sources: [REF.surawicz2009, R.escSvt2019, REF.escVa2022],
    aka: ['aberrancy', 'Ashman phenomenon', 'rate-dependent bundle branch block', 'aberrancia', 'fenómeno de Ashman', '差异性传导'],
    exemplar: { scenarios: ['pac-aberrant', 'rate-dependent-bbb'], layout: '3x4+1', lead: 'V1', leads: ['V1', 'V6', 'II'] },
  },
  // ── pre-excitation ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'wpw',
    definition: l(
      '经房室旁路的心室预激：窦性心律时PR短（<120 ms）、有delta波、QRS增宽。',
      'Ventricular pre-excitation through an accessory AV pathway: a short PR (< 120 ms), a delta wave and a widened QRS in sinus rhythm.',
      'Preexcitación ventricular por una vía accesoria AV: PR corto (< 120 ms), onda delta y QRS ensanchado en ritmo sinusal.',
    ),
    features: [
      l('PR<120 ms（P波直接连到QRS）。', 'PR < 120 ms (the P runs straight into the QRS).', 'PR < 120 ms (la P enlaza directamente con el QRS).'),
      l('delta波：多个导联QRS起始部（上升支或下降支）顿挫。', 'Delta wave: a slurred initial QRS upstroke (or downstroke) in many leads.', 'Onda delta: empastamiento inicial del QRS (ascendente o descendente) en muchas derivaciones.'),
      l('QRS常≥110–120 ms；继发性ST-T与delta波/QRS方向相反。', 'QRS usually ≥ 110–120 ms; secondary ST–T opposite to the delta wave and QRS.', 'QRS casi siempre ≥ 110-120 ms; ST-T secundario opuesto a la onda delta y al QRS.'),
      l(
        'delta波极性可定位旁路：Ⅰ、aVL、V5–V6负向且V1以R波为主→左侧游离壁；下壁负向→下间隔旁。',
        'Delta polarity locates the pathway: negative in I, aVL, V5–V6 with a dominant R in V1 → left free wall; negative inferior deltas → inferior paraseptal.',
        'La polaridad de la delta localiza la vía: negativa en I, aVL, V5-V6 con R dominante en V1 → pared libre izquierda; deltas inferiores negativas → paraseptal inferior.',
      ),
      l('预激搏动上不要判读Q波、左心室肥厚、束支阻滞、电轴或QT（假性梗死）。', 'Do not read Q waves, LVH, BBB, axis or QT on pre-excited beats (pseudo-infarction).', 'No interpretes ondas Q, HVI, bloqueo de rama, eje ni QT en latidos preexcitados (pseudoinfarto).'),
      l('WPW综合征=图形+快速心律失常；预激伴房颤=快速、宽大、不规则。', 'WPW syndrome = the pattern plus a tachyarrhythmia; pre-excited AF = fast, broad and irregular.', 'Síndrome de WPW = el patrón más una taquiarritmia; FA preexcitada = rápida, ancha e irregular.'),
    ],
    criteria: [
      {
        label: l('成人', 'Adults', 'Adultos'),
        value: l('PR<120 ms；delta波；QRS>120 ms（预激程度轻时100–120 ms）', 'PR < 120 ms; delta wave; QRS > 120 ms (100–120 ms with minimal pre-excitation)', 'PR < 120 ms; onda delta; QRS > 120 ms (100-120 ms con preexcitación mínima)'),
        source: 'Surawicz 2009; Brugada 2019 (ESC SVT)',
      },
      {
        label: l('儿童', 'Children', 'Niños'),
        value: l('PR<90 ms；QRS>90 ms', 'PR < 90 ms; QRS > 90 ms', 'PR < 90 ms; QRS > 90 ms'),
        source: 'Surawicz 2009',
      },
      {
        label: l('高危特征', 'High-risk features', 'Rasgos de alto riesgo'),
        value: l(
          '房颤时最短预激RR≤250 ms、旁路不应期≤250 ms、多条旁路、可诱发房室折返',
          'Shortest pre-excited R–R in AF ≤ 250 ms, pathway refractory period ≤ 250 ms, multiple pathways, inducible AVRT',
          'R-R preexcitado más corto en FA ≤ 250 ms, periodo refractario de la vía ≤ 250 ms, vías múltiples, TRAV inducible',
        ),
        source: 'Brugada 2019; Cohen 2012',
      },
      {
        label: l('运动员', 'Athletes', 'Deportistas'),
        value: l('心室预激属异常，需进一步评估', 'Pre-excitation is abnormal and needs evaluation', 'La preexcitación es anormal y requiere estudio'),
        source: 'Sharma 2017',
      },
    ],
    mechanism: l(
      '旁路不经房室结延搁直接由心房传到心室，使部分心室肌提前开始并经心肌间缓慢除极。QRS是这种提前而缓慢的激动（形成delta波并缩短PR）与经房室结下传的正常激动的融合。',
      'An accessory pathway conducts from atrium to ventricle without the AV node’s delay, so part of the ventricle starts depolarizing early by slow muscle-to-muscle spread. The QRS is a fusion of that early slow activation, which draws the delta wave and shortens the PR, and the normal activation arriving through the AV node.',
      'Una vía accesoria conduce de la aurícula al ventrículo sin el retraso del nodo AV, de modo que una parte del ventrículo empieza a despolarizarse antes, por una propagación lenta de músculo a músculo. El QRS es una fusión de esa activación precoz y lenta, que dibuja la onda delta y acorta el PR, con la activación normal que llega por el nodo AV.',
    ),
    mimics: [
      {
        id: 'short-pr',
        discriminator: l('此处有delta波且QRS增宽；单纯PR缩短时QRS窄、起始锐利。', 'Here there is a delta wave and a widened QRS; an isolated short PR has a narrow QRS with a sharp onset.', 'Aquí hay onda delta y QRS ensanchado; un PR corto aislado tiene QRS estrecho de inicio nítido.'),
        leads: ['II', 'V5'],
      },
      {
        id: 'old-mi-inferior',
        discriminator: l(
          '负向delta波在下壁形成假性Q波；PR短且其他导联可见delta波。',
          'A negative delta wave creates pseudo-Q waves inferiorly; the PR is short and delta waves show in other leads.',
          'Una onda delta negativa crea pseudo-Q inferiores; el PR es corto y se ven ondas delta en otras derivaciones.',
        ),
        leads: ['II', 'III', 'aVF'],
      },
      {
        id: 'rbbb',
        discriminator: l(
          '左侧旁路使V1呈高R，但PR短、有delta波，Ⅰ/V6无宽终末S。',
          'A left-sided pathway gives a tall R in V1, but with a short PR, a delta wave and no wide terminal S in I/V6.',
          'Una vía izquierda da R alta en V1, pero con PR corto, onda delta y sin S terminal ancha en I/V6.',
        ),
        leads: ['V1', 'V6'],
      },
      {
        id: 'lvh',
        discriminator: l('预激可增高QRS电压（假性左心室肥厚）；先看PR和delta波。', 'Pre-excitation can raise QRS voltage (pseudo-LVH); look at the PR and the delta wave first.', 'La preexcitación puede aumentar el voltaje del QRS (pseudo-HVI); mira primero el PR y la onda delta.'),
        leads: ['V5', 'V6'],
      },
    ],
    pitfalls: [
      l('在预激搏动上诊断梗死、左心室肥厚或束支阻滞。', 'Diagnosing infarction, LVH or BBB on pre-excited beats.', 'Diagnosticar infarto, HVI o bloqueo de rama en latidos preexcitados.'),
      l(
        '预激伴房颤时使用房室结阻滞药（腺苷、维拉帕米、地尔硫䓬、β受体阻滞剂、地高辛、静脉胺碘酮）。',
        'Giving AV-nodal blockers (adenosine, verapamil, diltiazem, beta-blockers, digoxin, IV amiodarone) in pre-excited AF.',
        'Dar bloqueantes del nodo AV (adenosina, verapamilo, diltiazem, betabloqueantes, digoxina, amiodarona intravenosa) en la FA preexcitada.',
      ),
      l(
        '漏掉左侧游离壁旁路的轻微预激（PR接近正常，Ⅰ、aVL、V5–V6间隔q波消失）。',
        'Missing subtle pre-excitation from a left lateral pathway (near-normal PR, loss of septal q in I, aVL, V5–V6).',
        'Pasar por alto una preexcitación sutil de una vía lateral izquierda (PR casi normal, pérdida de la q septal en I, aVL, V5-V6).',
      ),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '询问心悸、晕厥及猝死家族史，转诊心内科进行危险分层。若出现快速、宽大、不规则的心动过速：禁用房室结阻滞药，不稳定时电复律。',
        'Ask about palpitations, syncope and a family history of sudden death, and refer for risk stratification. If a fast, broad, irregular tachycardia appears: no AV-nodal blockers, and cardioversion if unstable.',
        'Pregunta por palpitaciones, síncope y antecedentes familiares de muerte súbita, y deriva para estratificar el riesgo. Si aparece una taquicardia rápida, ancha e irregular: sin bloqueantes del nodo AV, y cardioversión si hay inestabilidad.',
      ),
    },
    lessons: ['t4'],
    sources: [REF.surawicz2009, R.escSvt2019, R.cohen2012, REF.sharma2017, REF.udmi2018],
    aka: ['WPW', 'Wolff-Parkinson-White', 'pre-excitation', 'preexcitación', 'delta wave', 'onda delta', '预激综合征'],
    exemplar: { scenarios: ['wpw', 'preexcited-af'], leads: ['II', 'V1', 'I', 'aVL', 'V5'] },
  },
  {
    id: 'short-pr',
    definition: l(
      'PR间期<120 ms，P电轴正常，QRS窄且无delta波。',
      'A PR interval < 120 ms with a normal P axis, a narrow QRS and no delta wave.',
      'Intervalo PR < 120 ms con eje de la P normal, QRS estrecho y sin onda delta.',
    ),
    features: [
      l('窦性心律下PR<120 ms；Ⅱ导联P波直立（窦性）。', 'PR < 120 ms in sinus rhythm; the P wave is upright in II (sinus).', 'PR < 120 ms en ritmo sinusal; la P es positiva en II (sinusal).'),
      l('QRS窄，起始部正常——无delta波。', 'Narrow QRS with a normal initial upstroke — no delta wave.', 'QRS estrecho con un inicio normal, sin onda delta.'),
      l(
        '通常为正常变异（年轻人、交感张力高、妊娠）——“房室结传导加速”。',
        'Usually a normal variant (young people, high sympathetic tone, pregnancy) — “enhanced AV-nodal conduction”.',
        'Casi siempre una variante normal (jóvenes, tono simpático alto, embarazo): «conducción nodal AV acelerada».',
      ),
      l('检查P电轴：下壁P波倒置伴PR短=交界性或低位心房心律，而不是单纯PR缩短。', 'Check the P axis: a negative inferior P with a short PR means a junctional or low atrial rhythm, not a short PR.', 'Comprueba el eje de la P: una P inferior negativa con PR corto indica un ritmo de la unión o auricular bajo, no un PR corto.'),
      l('PR短合并左心室肥厚/肥厚型心肌病图形：考虑贮积病（PRKAG2、Danon、Pompe）。', 'Short PR with an LVH or HCM pattern: think of storage diseases (PRKAG2, Danon, Pompe).', 'PR corto con patrón de HVI o MCH: piensa en enfermedades de depósito (PRKAG2, Danon, Pompe).'),
    ],
    criteria: [
      {
        label: l('PR缩短', 'Short PR', 'PR corto'),
        value: l('<120 ms（成人），QRS窄，无delta波', '< 120 ms (adults), narrow QRS, no delta wave', '< 120 ms (adultos), QRS estrecho, sin onda delta'),
        source: 'Brugada 2019 (ESC SVT); Mason 2007',
      },
      {
        label: l('运动员', 'Athletes', 'Deportistas'),
        value: l('无delta波的单纯PR缩短无需检查', 'An isolated short PR without a delta wave needs no work-up', 'Un PR corto aislado sin onda delta no requiere estudio'),
        source: 'Sharma 2017',
      },
      {
        label: l('警示信号', 'Red flag', 'Señal de alarma'),
        value: l('PR短伴左心室肥厚→考虑PRKAG2/Danon/Pompe病', 'Short PR with LVH → consider PRKAG2, Danon or Pompe disease', 'PR corto con HVI → piensa en PRKAG2, Danon o Pompe'),
        source: 'Arbelo 2023 (ESC cardiomyopathies)',
      },
    ],
    mechanism: l(
      '交感张力高、房室结较小或结内组织传导本身较快时，房室结传导加快，缩短了心房与心室激动之间的延搁。由于心室仍只经希氏-浦肯野系统激动，QRS保持狭窄、起始陡直，没有delta波。',
      'Fast conduction through the AV node, from high sympathetic tone, a small node or naturally quick nodal tissue, shortens the delay between atrial and ventricular activation. Because the ventricles are still activated only through the His–Purkinje system, the QRS stays narrow and starts sharply, without a delta wave.',
      'Una conducción rápida por el nodo AV, por tono simpático alto, un nodo pequeño o un tejido nodal rápido por naturaleza, acorta el retraso entre la activación auricular y la ventricular. Como los ventrículos se siguen activando solo por el sistema de His-Purkinje, el QRS es estrecho y empieza de forma brusca, sin onda delta.',
    ),
    mimics: [
      {
        id: 'wpw',
        discriminator: l('此处QRS窄、起始锐利；预激有delta波且QRS增宽。', 'Here the QRS is narrow with a sharp onset; pre-excitation has a delta wave and a widened QRS.', 'Aquí el QRS es estrecho y de inicio nítido; la preexcitación tiene onda delta y QRS ensanchado.'),
        leads: ['II', 'V5', 'I'],
      },
      {
        id: 'ectopic-atrial-rhythm',
        discriminator: l(
          '此处P波为窦性；低位心房或交界性起源时Ⅱ、Ⅲ、aVF的P波倒置，PR常较短。',
          'Here the P wave is sinus; a low atrial or junctional origin gives negative P waves in II, III and aVF, often with a short PR.',
          'Aquí la P es sinusal; un origen auricular bajo o de la unión da P negativas en II, III y aVF, a menudo con PR corto.',
        ),
        leads: ['II', 'III', 'aVF'],
      },
    ],
    pitfalls: [
      l(
        '称为“Lown-Ganong-Levine综合征”——它不是独立的综合征；任何室上速应按机制分类。',
        'Labelling a short PR “Lown–Ganong–Levine syndrome” — it is not a distinct syndrome; classify any SVT by its mechanism.',
        'Etiquetar un PR corto como «síndrome de Lown-Ganong-Levine»: no es un síndrome propio; clasifica cualquier TSV por su mecanismo.',
      ),
      l('漏看细微的delta波——在所有导联观察QRS起始部。', 'Missing a subtle delta wave — look at the QRS onset in every lead.', 'No ver una onda delta sutil: mira el inicio del QRS en todas las derivaciones.'),
    ],
    lessons: ['t4', 's4'],
    sources: [R.escSvt2019, REF.mason2007, REF.sharma2017, REF.escCmp2023],
    aka: ['short PR', 'LGL', 'Lown-Ganong-Levine', 'enhanced AV nodal conduction', 'PR corto', 'PR间期缩短'],
    exemplar: { scenarios: ['short-pr'], layout: '3x4+1', lead: 'II', leads: ['II', 'V5'] },
  },
];
