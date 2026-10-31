/**
 * f2 — Dipoles and vectors: why a deflection is positive, negative or equiphasic (stage F, docs/PLAN.md §3).
 * Stage goal: predict the deflection in any lead from an activation vector (critic.json learning path, stage 1).
 * Criteria: docs/curriculum/criteria.md `dipole-rule`, `activation-vectors`, `repolarization-direction`,
 * `qrs-naming`, normal septal q waves (UDMI).
 * Text policy: docs/design/f-explainers.md §5 — the theory lives in the scenes `vector-pen` (dipole rule, projection,
 * T vector) and `three-vectors` (septum / free walls / bases in V1 and V6); the prose here only says what to do.
 */
import type { Lesson } from '../api';
import { l } from '../../core/l10n';
import { choiceItem, leadItem, SRC, syn } from './f-shared';

const lesson: Lesson = {
  id: 'f2',
  stage: 'F',
  order: 2,
  title: l(
    '电偶极子与向量：波形为何向上、向下或呈双向',
    'Dipoles and vectors: why a deflection is positive, negative or equiphasic',
    'Dipolo y vector: por qué una deflexión es positiva, negativa o isodifásica',
  ),
  summary: l(
    '一条规则解释所有波形：比较心电向量与导联的方向。',
    'One rule explains every deflection: compare the heart vector with the direction of the lead.',
    'Una sola regla explica todas las deflexiones: compara el vector cardíaco con la dirección de la derivación.',
  ),
  objectives: [
    l(
      '朝向正极 → 向上；背离 → 向下；垂直 → 双向。',
      'Toward the positive pole → up; away → down; perpendicular → equiphasic.',
      'Hacia el polo positivo → arriba; alejándose → abajo; perpendicular → isodifásica.',
    ),
    l(
      '用三个除极向量解释 V1 的 rS 和 V6 的 qR。',
      'Explain rS in V1 and qR in V6 with the three activation vectors.',
      'Explicar la rS de V1 y la qR de V6 con los tres vectores de activación.',
    ),
    l('解释正常 T 波为何与 QRS 主波同向。', 'Explain why a normal T follows the main QRS.', 'Explicar por qué la T normal sigue al QRS.'),
    l(
      '由平均 QRS 向量预测肢体导联的 QRS。',
      'Predict a limb-lead QRS from the mean QRS vector.',
      'Predecir el QRS de cada derivación de los miembros desde el vector medio.',
    ),
  ],
  minutes: 10,
  competencies: ['C1', 'C5'],
  findings: ['normal-ecg'],
  blocks: [
    {
      kind: 'hook',
      ecg: syn('normal', 211),
      view: { layout: '3x4+1' },
      question: l(
        '同一次心跳，所有导联同时记录。为什么 QRS 波群在 II 导联主要向上，在 aVR 导联却主要向下？',
        'One heartbeat, recorded at the same moment by every lead. Why is the QRS mainly upward in II but mainly downward in aVR?',
        'Un mismo latido, registrado a la vez por todas las derivaciones. ¿Por qué el QRS es sobre todo positivo en II y sobre todo negativo en aVR?',
      ),
      reveal: l(
        '心室除极的总和指向**左下方**：朝向 II 导联的正极（左下肢），背离 aVR 导联的正极（右肩）。',
        'Summed, ventricular activation points **down and to the patient’s left**: toward the positive pole of II (left leg), away from that of aVR (right shoulder).',
        'En conjunto, la activación ventricular apunta **hacia abajo y a la izquierda del paciente**: hacia el polo positivo de II (pierna izquierda) y lejos del de aVR (hombro derecho).',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'dipole', params: { autoplay: true } },
      caption: l(
        '一个波前，四个电极：同一事件，位置不同，波形就不同。再把过程切换为“复极”，比较电极 A。',
        'One front, four electrodes: the same event looks different from each spot. Then switch the process to Repolarization and compare electrode A.',
        'Un frente, cuatro electrodos: el mismo fenómeno se ve distinto desde cada sitio. Luego cambia el proceso a Repolarización y compara el electrodo A.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'vector-pen' },
      caption: l(
        '看完演示后，拖动箭头绕六轴转一圈：纸带下方的导联格随之变化（朝向导联 → 向上，与之垂直 → 双向，背离 → 向下）。先回答 III 导联的问题，再看揭晓。',
        'After the tour, drag the arrow round the wheel: the lead cells under the strip turn up, equiphasic or down as it points toward a lead, is perpendicular to it, or points away. Answer the lead III question before the reveal.',
        'Tras la demostración, arrastra la flecha por el sistema hexaxial: las casillas bajo el registro suben, se hacen isodifásicas o bajan según apunte hacia la derivación, quede perpendicular a ella o se aleje. Responde a la pregunta sobre III antes de ver la solución.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'three-vectors' },
      caption: l(
        '拖动游离壁向量：拖到哪里，V1 都保持 rS，V6 始终为 qR 或 qRs。再打开“晚期右向向量”并重播：V1 末尾转为向上。',
        'Drag the free-wall vector: wherever it goes, V1 stays rS and V6 qR or qRs. Then switch on the late right vector and press Replay: V1 now ends upward.',
        'Arrastra el vector de las paredes libres: lo muevas donde lo muevas, V1 sigue siendo rS y V6, qR o qRs. Luego activa el vector tardío derecho y pulsa Repetir: ahora V1 termina hacia arriba.',
      ),
    },
    {
      kind: 'worked',
      title: l('在 12 导联心电图上验证', 'Check it on a 12-lead', 'Compruébalo en un ECG de 12 derivaciones'),
      ecg: syn('normal', 212),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('V1 为 rS，V6 为 qR', 'V1 rS, V6 qR', 'V1 rS, V6 qR'),
          body: l(
            '同一组向量从两侧观察：室间隔给 V1 小 r、给 V6 小 q；左心室给 V1 深 S、给 V6 高 R。',
            'Same vectors, opposite sides: the septum gives V1’s small r and V6’s small q; the left ventricle gives V1’s deep S and V6’s tall R.',
            'Mismos vectores, lados opuestos: el tabique da la r pequeña de V1 y la q pequeña de V6; el ventrículo izquierdo, la S profunda de V1 y la R alta de V6.',
          ),
          marks: [
            { auto: 'r', lead: 'V1' },
            { auto: 's', lead: 'V1' },
            { auto: 'q', lead: 'V6' },
            { auto: 'r', lead: 'V6' },
          ],
          highlightLeads: ['V1', 'V6'],
        },
        {
          title: l('T 波跟随 QRS', 'T follows the QRS', 'La T sigue al QRS'),
          body: l(
            '找出 V6 和 aVR 的 T 波：各自与本导联的 QRS 同向。',
            'Find T in V6 and aVR: each points the same way as its own QRS.',
            'Busca la T en V6 y en aVR: cada una apunta como su propio QRS.',
          ),
          marks: [
            { auto: 't', lead: 'V6' },
            { auto: 't', lead: 'aVR' },
          ],
          highlightLeads: ['V6', 'aVR'],
        },
      ],
    },
    {
      kind: 'live',
      scenario: 'normal',
      seed: 213,
      dials: [{ id: 'axis', label: l('平均 QRS 向量的方向', 'Direction of the mean QRS vector', 'Dirección del vector medio del QRS') }],
      view: { layout: '3x4+1' },
      caption: l(
        '现在在完整的心电图上转动平均 QRS 向量：找出 aVL 呈双向的角度，再找 III 的。',
        'Now turn the mean QRS vector on a full ECG: find the angle where aVL goes equiphasic, then where III does.',
        'Ahora gira el vector medio del QRS en un ECG completo: busca el ángulo en que aVL se hace isodifásica y luego el de III.',
      ),
    },
    {
      kind: 'contrast',
      title: l('多一个向量，多一个波', 'One more vector, one more wave', 'Un vector más, una onda más'),
      view: { layout: '3x4+1' },
      left: {
        ecg: syn('normal', 214),
        caption: l('正常传导', 'Normal conduction', 'Conducción normal'),
        marks: [
          { auto: 'r', lead: 'V1' },
          { auto: 's', lead: 'V1' },
          { auto: 'r', lead: 'V6' },
        ],
      },
      right: {
        ecg: syn('rbbb', 214),
        caption: l('右束支不传导', 'The right bundle branch does not conduct', 'La rama derecha no conduce'),
        marks: [
          { auto: 'r', lead: 'V1' },
          { auto: 's', lead: 'V6' },
          { auto: 's', lead: 'I' },
        ],
      },
      point: l(
        '右心室最后激动，多出一个指向右前方的**晚期向量**。V1 看到它迎面而来 → 末尾高的正向波；I 和 V6 看到它离去 → 末尾宽 S 波。规则没变，只是多了一个向量。',
        'The right ventricle is activated last, adding a **late vector** pointing right and forward. V1 sees it coming → a tall terminal positive wave; I and V6 see it leaving → a broad terminal S. Same rule, one more vector.',
        'El ventrículo derecho se activa al final y añade un **vector tardío** hacia la derecha y adelante. V1 lo ve llegar → una onda positiva final alta; I y V6 lo ven alejarse → una S final ancha. La misma regla, un vector más.',
      ),
    },
    {
      kind: 'check',
      item: {
        inline: leadItem({
          family: 'leads',
          competency: 'C1',
          seed: 21001,
          ecg: syn('normal', 215, { axis: 5 }),
          view: { layout: '3x4+1' },
          leads: ['aVF'],
          prompt: l(
            '平均 QRS 向量几乎水平指向患者左侧。点击 QRS 最接近双向的肢体导联。',
            'The mean QRS vector points almost horizontally to the patient’s left. Click the limb lead whose QRS is closest to equiphasic.',
            'El vector medio del QRS apunta casi en horizontal hacia la izquierda del paciente. Haz clic en la derivación de los miembros con el QRS más isodifásico.',
          ),
          explanation: l(
            'aVF 从下方观察，与水平向量垂直，所以 QRS 呈双向；I 导联正对向量，QRS 几乎全部向上。',
            'aVF looks from below, at right angles to a horizontal vector, so its QRS is equiphasic; lead I faces the vector head-on and is almost entirely upright.',
            'aVF mira desde abajo, en ángulo recto con un vector horizontal, así que su QRS es isodifásico; I tiene el vector de frente y es casi toda positiva.',
          ),
        }),
      },
    },
    {
      kind: 'check',
      item: {
        inline: choiceItem({
          family: 'waves',
          competency: 'C1',
          seed: 21002,
          ecg: syn('normal', 216),
          view: { layout: '3x4+1', highlightLeads: ['aVR'] },
          prompt: l(
            '先遮住 aVR 的 T 波，只看它的 QRS。正常心脏中，aVR 的 T 波应该朝哪个方向？',
            'Cover the T wave in aVR and look only at its QRS. In a normal heart, which way should the T in aVR point?',
            'Tapa la onda T de aVR y mira solo su QRS. En un corazón normal, ¿hacia dónde debería apuntar la T en aVR?',
          ),
          options: [
            { id: 'neg', label: l('向下，与 QRS 相同', 'Downward, like the QRS', 'Hacia abajo, como el QRS') },
            { id: 'pos', label: l('向上，与 QRS 相反', 'Upward, opposite to the QRS', 'Hacia arriba, al contrario que el QRS') },
            { id: 'flat', label: l('完全平坦', 'Completely flat', 'Completamente plana') },
          ],
          correct: 'neg',
          explanation: l(
            '除极背离右肩，所以 aVR 的 QRS 向下；正常 T 与 QRS 主波同向，aVR 中 T 倒置是正常的。',
            'Activation heads away from the right shoulder, so the QRS in aVR is negative; a normal T follows the main QRS, so a negative T in aVR is normal.',
            'La activación se aleja del hombro derecho, así que el QRS de aVR es negativo; la T normal sigue al QRS, de modo que una T negativa en aVR es normal.',
          ),
        }),
      },
    },
    // interleaved foundation practice: lead directions (which lead is perpendicular to which, which lead is normally all
    // negative) and the waves the vectors draw; axis categories come in lesson s5
    { kind: 'drill', families: ['leads', 'waves'], count: 5, passScore: 0.8, difficulty: 'classic' },
    {
      kind: 'real',
      ids: [21589, 11459],
      caption: l(
        '两位健康成人。找出 R 波最高和最接近双向的肢体导联：平均向量指向前者，横过后者。再确认 V1 为 rS、V6 为 qR。',
        'Two healthy adults. Find the tallest-R and the most equiphasic limb leads: the mean vector points at the first and crosses the second. Then confirm rS in V1, qR in V6.',
        'Dos adultos sanos. Busca las derivaciones de los miembros con la R más alta y la más isodifásica: el vector medio apunta a la primera y cruza la segunda. Después confirma rS en V1 y qR en V6.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把“向下”当作异常：方向只说明向量与导联的关系，aVR 本来就向下。',
          'Reading “downward” as diseased: polarity only gives the direction relative to the lead — aVR is normally negative.',
          'Leer «negativo» como enfermo: la polaridad solo indica la dirección respecto a la derivación; aVR es normalmente negativa.',
        ),
        l(
          '把小波群当作心肌少：它可能只是向量与导联垂直。',
          'Reading a small complex as little muscle: the vector may simply be perpendicular to the lead.',
          'Atribuir un complejo pequeño a poco músculo: puede que el vector sea perpendicular a la derivación.',
        ),
        l(
          '把 I、aVL、V5–V6 中窄小（< 30–40 ms）的间隔 q 波当作梗死 Q 波：它们来自正常的室间隔向量。',
          'Calling the small, narrow (< 30–40 ms) septal q waves in I, aVL and V5–V6 infarct Q waves: they come from the normal septal vector.',
          'Tomar las q septales pequeñas y estrechas (< 30–40 ms) de I, aVL y V5–V6 por ondas Q de infarto: proceden del vector septal normal.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('朝向正极 = 向上；背离 = 向下；垂直 = 双向。', 'Toward the positive pole = up; away = down; perpendicular = equiphasic.', 'Hacia el polo positivo = arriba; alejándose = abajo; perpendicular = isodifásica.'),
        l(
          'QRS = 室间隔（向右前）+ 游离壁（向左，左心室主导）+ 基底部（向上、向后、略偏右）：V1 呈 rS，V6 呈 qR 或 qRs。',
          'QRS = septum (right, forward) + free walls (left, LV-dominated) + bases (up, back, slightly right): rS in V1, qR or qRs in V6.',
          'QRS = tabique (derecha, adelante) + paredes libres (izquierda, domina el VI) + bases (arriba, atrás y algo a la derecha): rS en V1, qR o qRs en V6.',
        ),
        l('正常 T 波与 QRS 主波同向。', 'A normal T points the same way as the main QRS.', 'La T normal apunta en el mismo sentido que el QRS.'),
        l(
          '每个导联就是一个方向：知道向量，就能预测每个导联。',
          'Each lead is a direction: know the vector and you can predict every lead.',
          'Cada derivación es una dirección: si conoces el vector, puedes predecir todas las derivaciones.',
        ),
      ],
    },
  ],
  sources: [
    SRC.kligfield,
    'Durrer D et al. Total excitation of the isolated human heart. Circulation 1970;41:899-912',
    'Yan GX, Antzelevitch C. Cellular basis for the normal T wave and the electrocardiographic manifestations of the long-QT syndrome. Circulation 1998;98:1928-1936',
    'Rautaharju PM et al. AHA/ACCF/HRS Recommendations Part IV: The ST segment, T and U waves, and the QT interval. Circulation 2009;119:e241-e250',
    'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction (2018). Eur Heart J 2019;40:237-269',
    'Macfarlane PW et al. Comprehensive Electrocardiology, 2nd ed. Springer 2011',
    'Kors JA et al. Reconstruction of the Frank vectorcardiogram from standard electrocardiographic leads. Eur Heart J 1990;11:1083-1092',
    SRC.book,
  ],
};

export default lesson;
