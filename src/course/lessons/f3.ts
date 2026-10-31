/**
 * f3 — The lead systems: Einthoven, Goldberger and Wilson; hexaxial and horizontal frames (stage F, docs/PLAN.md §3).
 * Criteria: docs/curriculum/criteria.md `bipolar-limb-leads`, `einthoven-law`, `wilson-goldberger`, `hexaxial-system`,
 * hexaxial reference + Cabrera display ("missing in the book"), `precordial-progression`, `heart-position`.
 *
 * Taught by two scenes (docs/design/f-explainers.md §4.4–4.5, text policy §5): `triangle-to-wheel` carries the limb
 * leads, Einthoven's law, Goldberger's 1.5 × and the hexaxial wheel; `chest-ring` carries Wilson's terminal, V1–V6,
 * the R/S transition and the lead groups. The prose that used to explain them is gone; the numbers stay in the
 * scenes' end frames and in the summary.
 */
import type { Lesson } from '../api';
import { l } from '../../core/l10n';
import { choiceItem, leadItem, SRC, syn } from './f-shared';

const lesson: Lesson = {
  id: 'f3',
  stage: 'F',
  order: 3,
  title: l(
    '导联体系：Einthoven、Goldberger 与 Wilson；六轴系统与水平面',
    'The lead systems: Einthoven, Goldberger and Wilson; hexaxial and horizontal frames',
    'Los sistemas de derivaciones: Einthoven, Goldberger y Wilson; sistema hexaxial y plano horizontal',
  ),
  summary: l(
    '十二个导联，只有八个独立信号：每个导联从哪里看心脏。',
    'Twelve leads, eight independent signals: where each lead looks from.',
    'Doce derivaciones, ocho señales independientes: desde dónde mira cada derivación.',
  ),
  objectives: [
    l('由肢体电极构成 I、II、III，并运用 II = I + III。', 'Build I, II and III from the limb electrodes and use II = I + III.', 'Construir I, II y III con los electrodos de los miembros y aplicar II = I + III.'),
    l('在六轴系统上标出六个肢体导联的角度和三对垂直导联。', 'Place the six limb leads on the hexaxial wheel and name the perpendicular pairs.', 'Situar las seis derivaciones de los miembros en el sistema hexaxial y nombrar los pares perpendiculares.'),
    l('说出 V1–V6 的参考点、移行区和各导联组。', 'Name the chest leads’ reference, the transition and the lead groups.', 'Nombrar la referencia de las precordiales, la transición y los grupos de derivaciones.'),
  ],
  minutes: 10,
  competencies: ['C1', 'C5'],
  findings: [],
  blocks: [
    {
      kind: 'hook',
      ecg: syn('normal', 311),
      view: { layout: '3x4+1', highlightLeads: ['I', 'II', 'III'] },
      question: l(
        'I、II、III 是同时记录的。在 II 的 R 波顶点处画一条竖线，读出三个导联在这条线上离基线几小格。I + III 与 II 相比如何？',
        'I, II and III are recorded at the same moment. Draw a vertical line through the R peak in II and read each lead’s height on that line, in small squares. How does I + III compare with II?',
        'I, II y III se registran a la vez. Traza una línea vertical por el pico de la R de II y lee la altura de cada derivación sobre esa línea, en cuadros pequeños. ¿Cómo es I + III frente a II?',
      ),
      reveal: l(
        '**I + III = II**，每一瞬间都成立（Einthoven 定律）：(LA − RA) + (LL − LA) = LL − RA。要在同一条竖线上相加，而不是把三个相隔几毫秒的波峰相加。',
        '**I + III = II** at every instant (Einthoven’s law): (LA − RA) + (LL − LA) = LL − RA. Add heights on one vertical line, not the three separate peaks, which fall a few ms apart.',
        '**I + III = II** en cada instante (ley de Einthoven): (LA − RA) + (LL − LA) = LL − RA. Suma alturas sobre una misma vertical, no los tres picos, que caen con unos ms de diferencia.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'triangle-to-wheel' },
      ecg: syn('normal', 311),
      caption: l(
        '拖动进度条，看 III 叠到 I 上正好落在 II 上；点击下方 12 导联心电图可换一个瞬间。最后打开“导联分组”和“Cabrera 顺序”。',
        'Scrub and watch III stack onto I to land exactly on II; click the 12-lead below to pick another instant. At the end, switch on Lead groups and Cabrera order.',
        'Arrastra la barra y mira cómo III se apila sobre I y cae justo en II; pulsa el ECG de 12 derivaciones de abajo para elegir otro instante. Al final, activa «Grupos de derivaciones» y «Orden de Cabrera».',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'chest-ring' },
      caption: l(
        '看完一遍后，转动向量，看 R = S 标记沿 V1–V6 移动。先回答问题，再点“揭晓”。',
        'After the tour, watch the R = S marker walk along V1–V6 as the vector turns. Answer the question before you press Reveal.',
        'Tras el recorrido, gira el vector y mira cómo la marca R = S recorre V1–V6. Responde a la pregunta antes de pulsar «Mostrar».',
      ),
    },
    {
      kind: 'worked',
      title: l('用导联体系读一份心电图', 'Using the lead system on one ECG', 'Usar el sistema de derivaciones en un ECG'),
      ecg: syn('normal', 313, { axis: 60 }),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('核对 Einthoven 定律', 'Check Einthoven’s law', 'Comprobar la ley de Einthoven'),
          body: l(
            '在同一条竖线上 I + III = II；明显不符时，说明读数不在同一瞬间，或导联标错——电极反接仍满足此定律（第 f6 课）。',
            'On one vertical line I + III = II; if they clearly disagree, you are not reading one instant or a lead is mislabelled. A cable swap still obeys the law (lesson f6).',
            'Sobre una misma vertical, I + III = II; si no cuadra, no estás leyendo un mismo instante o hay una derivación mal etiquetada: una inversión de cables sigue cumpliendo la ley (lección f6).',
          ),
          marks: [{ auto: 'r', lead: 'II' }],
          highlightLeads: ['I', 'II', 'III'],
        },
        {
          title: l('找最接近正负相等的肢体导联', 'Find the most equiphasic limb lead', 'Buscar la derivación de los miembros más isodifásica'),
          body: l(
            'aVL 的 R 与 S 差不多大：向量与 aVL（−30°）垂直，指向 +60° 或 −120°。',
            'aVL has R ≈ S: the vector is perpendicular to aVL (−30°), so it points at +60° or −120°.',
            'aVL tiene R ≈ S: el vector es perpendicular a aVL (−30°), así que apunta a +60° o a −120°.',
          ),
          marks: [{ kind: 'lead', lead: 'aVL', color: 'highlight' }],
          highlightLeads: ['aVL'],
        },
        {
          title: l('看与它垂直的导联', 'Look at the perpendicular lead', 'Mirar la derivación perpendicular'),
          body: l('II 与 aVL 垂直，且高而正向：向量约 +60°。', 'II, perpendicular to aVL, is tall and positive: the vector is about +60°.', 'II, perpendicular a aVL, es alta y positiva: el vector está en unos +60°.'),
          marks: [{ auto: 'r', lead: 'II' }],
          highlightLeads: ['II'],
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('同样正常，方向不同', 'Both normal, pointing differently', 'Ambos normales, con distinta orientación'),
      view: { layout: '3x4+1' },
      left: {
        ecg: syn('normal', 314, { axis: 5 }),
        caption: l('A：找出正负相等的肢体导联', 'A: find the equiphasic limb lead', 'A: busca la derivación de los miembros isodifásica'),
        marks: [{ kind: 'lead', lead: 'aVF', color: 'highlight' }],
      },
      right: {
        ecg: syn('normal', 315, { axis: 80 }),
        caption: l('B：找出正负相等的肢体导联', 'B: find the equiphasic limb lead', 'B: busca la derivación de los miembros isodifásica'),
        marks: [
          { kind: 'lead', lead: 'I', color: 'highlight' },
          { kind: 'lead', lead: 'aVL', color: 'highlight' },
        ],
      },
      point: l(
        'A：aVF 正负相等，I 最高 → 约 0°（“横位”）。B：I 很小，aVL 向下，下壁导联高 → 约 +80°（“垂直位”）。两者都正常；这些词只描述电轴，不说明心脏的解剖位置。',
        'A: aVF equiphasic, I tallest → about 0° (a “horizontal” axis). B: I small, aVL negative, inferior leads tall → about +80° (a “vertical” axis). Both are normal; the words describe the axis, not where the heart lies.',
        'A: aVF isodifásica, I la más alta → unos 0° (eje «horizontal»). B: I pequeña, aVL negativa, inferiores altas → unos +80° (eje «vertical»). Ambos son normales; los términos describen el eje, no la posición del corazón.',
      ),
    },
    {
      kind: 'check',
      item: {
        inline: leadItem({
          family: 'leads',
          competency: 'C1',
          seed: 31001,
          ecg: syn('normal', 316),
          view: { layout: '3x4+1' },
          leads: ['III'],
          prompt: l('点击由“LL − LA”算出的导联。', 'Click the lead that is computed as LL − LA.', 'Haz clic en la derivación que se calcula como LL − LA.'),
          explanation: l(
            'III = LL − LA，指向 +120°。I = LA − RA，II = LL − RA。',
            'III = LL − LA, pointing at +120°. I = LA − RA and II = LL − RA.',
            'III = LL − LA, que apunta a +120°. I = LA − RA y II = LL − RA.',
          ),
        }),
      },
    },
    {
      kind: 'check',
      item: {
        inline: choiceItem({
          family: 'leads',
          competency: 'C1',
          seed: 31002,
          ecg: syn('normal', 317),
          view: { layout: '3x4+1' },
          prompt: l(
            '打印件上 III 缺失，I 和 II 完好。哪个公式能把 III 算回来？',
            'Lead III is missing from a printout; I and II are fine. Which formula rebuilds III?',
            'En una copia impresa falta III; I y II están bien. ¿Qué fórmula reconstruye III?',
          ),
          options: [
            { id: 'ii-i', label: l('III = II − I', 'III = II − I', 'III = II − I') },
            { id: 'i-ii', label: l('III = I − II', 'III = I − II', 'III = I − II') },
            { id: 'sum', label: l('III = I + II', 'III = I + II', 'III = I + II') },
            { id: 'mean', label: l('III = (I + II)/2', 'III = (I + II)/2', 'III = (I + II)/2') },
          ],
          correct: 'ii-i',
          explanation: l(
            '由 II = I + III 得 III = II − I。所以 12 个导联里只有 8 个独立信号。',
            'From II = I + III, III = II − I. That is why the 12 leads hold only 8 independent signals.',
            'De II = I + III se obtiene III = II − I. Por eso las 12 derivaciones solo contienen 8 señales independientes.',
          ),
        }),
      },
    },
    { kind: 'check', item: { family: 'leads', seed: 31006 } },
    { kind: 'drill', families: ['leads'], count: 6, passScore: 0.8, difficulty: 'classic' },
    {
      kind: 'real',
      ids: [2686, 3762],
      caption: l(
        '两位电轴不同的健康成人：核对 I + III ≈ II，找出正负相等的肢体导联，判断向量方向，再在病例库中打开，与机器测得的电轴比较。',
        'Two healthy adults with different axes: check I + III ≈ II, find the equiphasic limb lead, decide where the vector points, then open it in the case library and compare with the machine’s axis.',
        'Dos adultos sanos con ejes distintos: comprueba I + III ≈ II, busca la derivación de los miembros isodifásica, decide hacia dónde apunta el vector y ábrelo en la biblioteca de casos para compararlo con el eje de la máquina.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '忽视 aVR：正常时 P、QRS、T 都向下；健康人 aVR 的 P 向上、I 导联 P–QRS–T 倒置，提示上肢电极反接（第 f6 课）。',
          'Ignoring aVR: P, QRS and T are normally all negative there. An upright P in aVR with P–QRS–T inverted in I, in a healthy person, suggests an arm-cable reversal (lesson f6).',
          'Ignorar aVR: normalmente P, QRS y T son negativas. Una P positiva en aVR con P–QRS–T invertidos en I, en una persona sana, sugiere una inversión de los cables de los brazos (lección f6).',
        ),
        l(
          '把 12 个导联当成 12 个独立视角：只在一个肢体导联中出现的“新发现”，必须能在其他导联中得到解释。',
          'Treating the 12 leads as 12 independent views: a “finding” in only one limb lead must be explainable in the others.',
          'Tratar las 12 derivaciones como 12 vistas independientes: un «hallazgo» en una sola derivación de los miembros debe poder explicarse en las demás.',
        ),
        l(
          '弄错角度符号：负角度在水平线以上（朝头侧），正角度在下（朝足侧）。',
          'Mixing up the angle signs: negative angles lie above the horizontal (toward the head), positive ones below.',
          'Confundir el signo de los ángulos: los negativos están por encima de la horizontal (hacia la cabeza) y los positivos, por debajo.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          'I = LA − RA，II = LL − RA，III = LL − LA；II = I + III：12 个导联只有 8 个独立信号。',
          'I = LA − RA, II = LL − RA, III = LL − LA; II = I + III: 12 leads, 8 independent signals.',
          'I = LA − RA, II = LL − RA, III = LL − LA; II = I + III: 12 derivaciones, 8 señales independientes.',
        ),
        l(
          '六轴：I 0°，aVL −30°，II +60°，aVF +90°，III +120°，aVR −150°；垂直对 I–aVF、II–aVL、III–aVR。',
          'Hexaxial: I 0°, aVL −30°, II +60°, aVF +90°, III +120°, aVR −150°; perpendicular pairs I–aVF, II–aVL, III–aVR.',
          'Hexaxial: I 0°, aVL −30°, II +60°, aVF +90°, III +120°, aVR −150°; pares perpendiculares I–aVF, II–aVL, III–aVR.',
        ),
        l(
          'V1–V6 以 Wilson 中心电端为参考：V1–V2 呈 rS，移行区（R = S）正常在 V3–V4，V5–V6 呈 qRs。',
          'V1–V6 are read against Wilson’s central terminal: rS in V1–V2, the transition (R = S) normally at V3–V4, qRs in V5–V6.',
          'V1–V6 se miden frente al terminal central de Wilson: rS en V1–V2, la transición (R = S) normalmente en V3–V4, qRs en V5–V6.',
        ),
        l(
          '导联组：下壁 II、III、aVF；侧壁 I、aVL（高侧壁）、V5–V6；间隔 V1–V2；前壁 V3–V4。',
          'Groups: inferior II, III, aVF; lateral I, aVL (high), V5–V6; septal V1–V2; anterior V3–V4.',
          'Grupos: inferior II, III, aVF; lateral I, aVL (alta), V5–V6; septal V1–V2; anterior V3–V4.',
        ),
      ],
    },
  ],
  sources: [
    SRC.kligfield,
    'Goldberger E. A simple, indifferent, electrocardiographic electrode of zero potential and a technique of obtaining augmented, unipolar, extremity leads. Am Heart J 1942;23:483-492',
    'Mason JW et al. AHA/ACCF/HRS Recommendations Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Surawicz B, Knilans TK. Chou’s Electrocardiography in Clinical Practice, 6th ed. Saunders 2008',
    'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction (2018). Eur Heart J 2019;40:237-269',
    SRC.book,
  ],
};

export default lesson;
