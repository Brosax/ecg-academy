/**
 * f3 — The lead systems: Einthoven, Goldberger and Wilson; hexaxial and horizontal frames (stage F, docs/PLAN.md §3).
 * Criteria: docs/curriculum/criteria.md `bipolar-limb-leads`, `einthoven-law`, `wilson-goldberger`, `hexaxial-system`,
 * hexaxial reference + Cabrera display ("missing in the book"), `precordial-progression`, `heart-position`.
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
    '十二个导联，只有八个独立信号：肢体导联、加压导联和胸导联是怎样构成的，各自从哪个方向看心脏。',
    'Twelve leads, eight independent signals: how the limb, augmented and chest leads are built, and where each one looks from.',
    'Doce derivaciones, ocho señales independientes: cómo se construyen las derivaciones de los miembros, las aumentadas y las precordiales, y desde dónde mira cada una.',
  ),
  objectives: [
    l(
      '由肢体电极构成 I、II、III 导联，并运用 Einthoven 定律（II = I + III）。',
      'Build I, II and III from the limb electrodes and use Einthoven’s law (II = I + III).',
      'Construir I, II y III a partir de los electrodos de los miembros y aplicar la ley de Einthoven (II = I + III).',
    ),
    l(
      '解释加压肢体导联和 Wilson 中心电端。',
      'Explain the augmented limb leads and Wilson’s central terminal.',
      'Explicar las derivaciones aumentadas de los miembros y el terminal central de Wilson.',
    ),
    l(
      '在六轴系统上标出六个肢体导联的角度，说出三对互相垂直的导联。',
      'Place the six limb leads on the hexaxial wheel and name the three perpendicular pairs.',
      'Situar las seis derivaciones de los miembros en el sistema hexaxial y nombrar los tres pares perpendiculares.',
    ),
    l(
      '在水平面上排列 V1–V6，并说出下壁、侧壁和前壁导联组。',
      'Arrange V1–V6 in the horizontal plane and name the inferior, lateral and anterior lead groups.',
      'Ordenar V1-V6 en el plano horizontal y nombrar los grupos de derivaciones inferiores, laterales y anteriores.',
    ),
  ],
  minutes: 12,
  competencies: ['C1', 'C5'],
  findings: [],
  blocks: [
    {
      kind: 'hook',
      ecg: syn('normal', 311),
      view: { layout: '3x4+1', highlightLeads: ['I', 'II', 'III'] },
      question: l(
        'I、II、III 导联在第一列，是同时记录的。在 II 导联 R 波顶点处画一条竖线，读出这条线上 I、II、III 三个导联离基线的高度（小格数）。把 I 和 III 相加，与 II 比较，你发现了什么？',
        'Leads I, II and III sit in the first column, recorded at the same moment. Draw a vertical line through the peak of the R wave in II and read how far each of I, II and III is from its baseline on that line (in small squares). Add I and III and compare the sum with II. What do you notice?',
        'Las derivaciones I, II y III están en la primera columna y se registran a la vez. Traza una línea vertical por el pico de la onda R de II y lee, sobre esa línea, a qué altura de su línea de base está cada una de I, II y III (en cuadros pequeños). Suma I y III y compara el resultado con II. ¿Qué observas?',
      ),
      reveal: l(
        '**I + III = II**，而且在心动周期的每一瞬间都成立（Einthoven 定律）。这不是巧合：I = LA − RA，III = LL − LA，两者相加正好是 LL − RA = II。注意要在同一时刻比较：三个导联的 R 波顶点并不在同一瞬间，所以各自的最高点相加并不正好等于 II。三个肢体导联共用三个电极，所以其中只有两个包含独立信息。',
        '**I + III = II**, at every instant of the cycle (Einthoven’s law). It is no coincidence: I = LA − RA and III = LL − LA, so their sum is LL − RA = II. Compare at one instant: the three R waves do not peak at exactly the same moment, so their separate peaks do not add up exactly. The three limb leads share three electrodes, so only two of them carry independent information.',
        '**I + III = II**, en cada instante del ciclo (ley de Einthoven). No es casualidad: I = LA − RA y III = LL − LA, así que su suma es LL − RA = II. Compara en un mismo instante: las tres R no alcanzan su pico exactamente a la vez, así que sus picos por separado no suman exactamente. Las tres derivaciones comparten tres electrodos, de modo que solo dos aportan información independiente.',
      ),
    },
    {
      kind: 'text',
      title: l('三个电极，六个导联', 'Three electrodes, six leads', 'Tres electrodos, seis derivaciones'),
      body: l(
        '标准肢体导联比较两个电极的电位：\n- **I** = LA − RA（从左侧看，0°）\n- **II** = LL − RA（+60°）\n- **III** = LL − LA（+120°）\n加压导联（Goldberger）把一个肢体与另外两个肢体的平均电位比较：**aVR**（−150°）、**aVL**（−30°）、**aVF**（+90°）。它们由同样的三个电极算出，所以 aVR + aVL + aVF = 0。右下肢电极只是参考（驱动地）电极。',
        'The standard limb leads compare the potentials of two electrodes:\n- **I** = LA − RA (looks from the left, 0°)\n- **II** = LL − RA (+60°)\n- **III** = LL − LA (+120°)\nThe augmented leads (Goldberger) compare one limb with the average of the other two: **aVR** (−150°), **aVL** (−30°), **aVF** (+90°). They are computed from the same three electrodes, so aVR + aVL + aVF = 0. The right-leg electrode is only the reference (driven ground).',
        'Las derivaciones estándar de los miembros comparan el potencial de dos electrodos:\n- **I** = LA − RA (mira desde la izquierda, 0°)\n- **II** = LL − RA (+60°)\n- **III** = LL − LA (+120°)\nLas derivaciones aumentadas (Goldberger) comparan un miembro con la media de los otros dos: **aVR** (−150°), **aVL** (−30°), **aVF** (+90°). Se calculan con los mismos tres electrodos, así que aVR + aVL + aVF = 0. El electrodo de la pierna derecha es solo la referencia (tierra activa).',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'hexaxial', params: { vectorDeg: 60, interactive: true, showProjections: true } },
      caption: l(
        '拖动心电向量绕圆转动。每个肢体导联显示向量在其轴上的投影：向量指向导联时投影长而为正，与导联垂直时为零。',
        'Drag the heart vector around the wheel. Each limb lead shows the projection of the vector on its axis: long and positive when the vector points at the lead, zero when it is perpendicular.',
        'Arrastra el vector cardiaco alrededor del círculo. Cada derivación de los miembros muestra la proyección del vector sobre su eje: larga y positiva cuando el vector apunta a la derivación, nula cuando es perpendicular.',
      ),
    },
    {
      kind: 'criteria',
      title: l('六轴参考系统', 'The hexaxial reference system', 'El sistema de referencia hexaxial'),
      items: [
        {
          label: l('导联角度', 'Lead angles', 'Ángulos de las derivaciones'),
          value: l(
            'I 0°，aVL −30°，II +60°，aVF +90°，III +120°，aVR −150°（即 +210°）',
            'I 0°, aVL −30°, II +60°, aVF +90°, III +120°, aVR −150° (= +210°)',
            'I 0°, aVL −30°, II +60°, aVF +90°, III +120°, aVR −150° (= +210°)',
          ),
        },
        {
          label: l('互相垂直的导联对', 'Perpendicular pairs', 'Pares perpendiculares'),
          value: l('I ⟂ aVF · II ⟂ aVL · III ⟂ aVR', 'I ⟂ aVF · II ⟂ aVL · III ⟂ aVR', 'I ⟂ aVF · II ⟂ aVL · III ⟂ aVR'),
        },
        {
          label: l('恒等式', 'Identities', 'Identidades'),
          value: l(
            'II = I + III；aVR + aVL + aVF = 0；aVR = −(I + II)/2；aVL = I − II/2；aVF = II − I/2',
            'II = I + III; aVR + aVL + aVF = 0; aVR = −(I + II)/2; aVL = I − II/2; aVF = II − I/2',
            'II = I + III; aVR + aVL + aVF = 0; aVR = −(I + II)/2; aVL = I − II/2; aVF = II − I/2',
          ),
        },
        {
          label: l('独立信号', 'Independent signals', 'Señales independientes'),
          value: l('12 个导联中只有 8 个：I、II 和 V1–V6', 'only 8 of the 12: I, II and V1–V6', 'solo 8 de las 12: I, II y V1-V6'),
        },
        {
          label: l('Cabrera 排列', 'Cabrera display', 'Presentación de Cabrera'),
          value: l(
            'aVL、I、−aVR、II、aVF、III：肢体导联按角度顺序排列（−30° 到 +120°）',
            'aVL, I, −aVR, II, aVF, III: the limb leads in the order of their angles (−30° to +120°)',
            'aVL, I, −aVR, II, aVF, III: las derivaciones de los miembros en el orden de sus ángulos (−30° a +120°)',
          ),
        },
      ],
      source: 'Kligfield 2007 AHA/ACCF/HRS Part I (Circulation 2007;115:1306); Surawicz & Knilans, Chou’s Electrocardiography in Clinical Practice, 6th ed. (2008)',
    },
    {
      kind: 'text',
      title: l('Wilson 中心电端与胸导联', 'Wilson’s central terminal and the chest leads', 'El terminal central de Wilson y las derivaciones precordiales'),
      body: l(
        '- 胸导联需要一个不在胸壁上的参考点。**Wilson 中心电端**是 RA、LA、LL 三个电位的平均值。\n- 每个胸导联 = 该电极的电位 − 中心电端。V1 到 V6 在**水平面**上从右前方一直看到左侧。\n- 中心电端只是参考，不是真正的零电位：它在心动周期中略有变化。\n- Goldberger 的 aVR、aVL、aVF 恰好是以中心电端为参考的肢体电位的 1.5 倍——“加压”就是这个意思。',
        '- The chest leads need a reference that is not on the chest. **Wilson’s central terminal** (WCT) is the average of the RA, LA and LL potentials.\n- Each chest lead = the potential of its electrode − WCT. V1 to V6 look at the heart in the **horizontal plane**, from the right front round to the left side.\n- The WCT is a reference, not a true zero: it changes slightly through the cycle.\n- Goldberger’s aVR, aVL and aVF are exactly 1.5 times the WCT-referenced limb potentials — that is what “augmented” means.',
        '- Las precordiales necesitan una referencia que no esté en el tórax. El **terminal central de Wilson** (TCW) es la media de los potenciales de RA, LA y LL.\n- Cada derivación precordial = potencial de su electrodo − TCW. De V1 a V6 miran el corazón en el **plano horizontal**, desde delante a la derecha hasta el costado izquierdo.\n- El TCW es una referencia, no un cero verdadero: varía un poco durante el ciclo.\n- Las aVR, aVL y aVF de Goldberger son exactamente 1,5 veces los potenciales de los miembros referidos al TCW: eso significa «aumentadas».',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'horizontal-plane', params: { interactive: true } },
      caption: l(
        '从足侧看胸导联：V1、V2 面对右心室和室间隔，V3、V4 面对前壁，V5、V6 面对左心室侧壁。拖动向量：与它垂直的导联就是移行区（R ≈ S）。',
        'The chest leads seen from the feet: V1 and V2 face the right ventricle and septum, V3 and V4 the anterior wall, V5 and V6 the lateral left ventricle. Drag the vector: the lead perpendicular to it is the transition zone (R ≈ S).',
        'Las precordiales vistas desde los pies: V1 y V2 miran al ventrículo derecho y al tabique, V3 y V4 a la cara anterior, V5 y V6 a la cara lateral del ventrículo izquierdo. Arrastra el vector: la derivación perpendicular a él es la zona de transición (R ≈ S).',
      ),
    },
    {
      kind: 'criteria',
      title: l('导联组：谁看哪一面', 'Lead groups: who looks at which wall', 'Grupos de derivaciones: quién mira cada cara'),
      items: [
        { label: l('下壁', 'Inferior', 'Inferior'), value: l('II、III、aVF', 'II, III, aVF', 'II, III, aVF') },
        { label: l('侧壁', 'Lateral', 'Lateral'), value: l('I、aVL（高侧壁），V5、V6', 'I, aVL (high lateral), V5, V6', 'I, aVL (lateral alta), V5, V6') },
        { label: l('间隔与前壁', 'Septal and anterior', 'Septal y anterior'), value: l('V1–V2 间隔，V3–V4 前壁', 'V1–V2 septal, V3–V4 anterior', 'V1-V2 septal, V3-V4 anterior') },
        {
          label: l('aVR', 'aVR', 'aVR'),
          value: l('从右肩看向心腔：正常时 P、QRS、T 都向下', 'looks into the cavity from the right shoulder: P, QRS and T are normally all negative', 'mira la cavidad desde el hombro derecho: P, QRS y T son normalmente negativas'),
        },
        {
          label: l('胸导联 R 波递增', 'Chest-lead R progression', 'Progresión de la R en precordiales'),
          value: l('V1–V2 呈 rS，V3–V4 附近为移行区（R ≈ S），V5–V6 呈 qRs 或 qR', 'rS in V1–V2, transition (R ≈ S) near V3–V4, qRs or qR in V5–V6', 'rS en V1-V2, transición (R ≈ S) hacia V3-V4, qRs o qR en V5-V6'),
        },
      ],
      source:
        'Thygesen K et al. Fourth Universal Definition of MI, Eur Heart J 2019;40:237 (contiguous lead groups); Kligfield 2007 AHA/ACCF/HRS Part I; Mason JW et al. AHA/ACCF/HRS 2007 Part II (Circulation 2007;115:1325)',
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
            '在同一条竖线上（例如 II 的 R 波顶点处），I 的高度 + III 的高度 = II 的高度。各自的 R 波顶点相差几毫秒，相加只是约等于。如果明显不符，先怀疑导联标错或电极接错（第 f6 课）。',
            'On one vertical line (for example through the R peak in II), the height in I + the height in III = the height in II. The three R peaks are a few ms apart, so adding the separate peaks gives only roughly II. If the leads clearly disagree, suspect a mislabelled lead or a cable error first (lesson f6).',
            'Sobre una misma línea vertical (por ejemplo, por el pico de la R de II), la altura en I + la altura en III = la altura en II. Los picos de las tres R están separados unos ms, así que sumar los picos por separado solo da aproximadamente II. Si no cuadra claramente, sospecha primero una derivación mal etiquetada o un error de cables (lección f6).',
          ),
          marks: [
            { auto: 'r', lead: 'I' },
            { auto: 'r', lead: 'II' },
            { auto: 'r', lead: 'III' },
          ],
          highlightLeads: ['I', 'II', 'III'],
        },
        {
          title: l('找最接近正负相等的肢体导联', 'Find the most equiphasic limb lead', 'Buscar la derivación de los miembros más isodifásica'),
          body: l(
            '这里是 aVL：R 波和 S 波差不多大。向量与 aVL（−30°）垂直，所以指向 +60° 或 −120°。',
            'Here it is aVL: its R and S are about the same size. The vector is perpendicular to aVL (−30°), so it points at +60° or at −120°.',
            'Aquí es aVL: su R y su S tienen un tamaño parecido. El vector es perpendicular a aVL (−30°), así que apunta a +60° o a −120°.',
          ),
          marks: [{ kind: 'lead', lead: 'aVL', color: 'highlight' }],
          highlightLeads: ['aVL'],
        },
        {
          title: l('看与它垂直的导联', 'Look at the perpendicular lead', 'Mirar la derivación perpendicular'),
          body: l(
            'II 与 aVL 垂直。II 高而正向，所以向量指向 II 的正极：约 +60°。',
            'II is perpendicular to aVL. II is tall and positive, so the vector points toward II’s positive pole: about +60°.',
            'II es perpendicular a aVL. II es alta y positiva, así que el vector apunta hacia el polo positivo de II: unos +60°.',
          ),
          marks: [{ auto: 'r', lead: 'II' }],
          highlightLeads: ['II'],
        },
        {
          title: l('用 I 和 aVF 核对', 'Confirm with I and aVF', 'Confirmar con I y aVF'),
          body: l(
            'I 和 aVF 都向上：向量位于 0° 到 +90° 的左下象限。与上一步一致。',
            'I and aVF are both positive: the vector lies in the lower-left quadrant, between 0° and +90°. It fits the previous step.',
            'I y aVF son positivas: el vector está en el cuadrante inferior izquierdo, entre 0° y +90°. Cuadra con el paso anterior.',
          ),
          highlightLeads: ['I', 'aVF'],
        },
        {
          title: l('再看水平面', 'Then the horizontal plane', 'Después, el plano horizontal'),
          body: l(
            '从 V1 到 V5，R 波逐渐增高，S 波逐渐变浅；R ≈ S 的移行区通常在 V3–V4。',
            'From V1 to V5 the R wave grows and the S wave shrinks; the transition, where R ≈ S, usually lies at V3–V4.',
            'De V1 a V5 la R crece y la S disminuye; la transición, donde R ≈ S, suele estar en V3-V4.',
          ),
          highlightLeads: ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
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
        'A：aVF 正负相等，I 最高 → 向量约 0°（“横位”）。B：I 很小，aVL 主波向下，II、III、aVF 高 → 向量约 +80°（“垂直位”）。两者都是正常电轴，只是向量指向不同。这些位置描述只说明电轴，并不能证明心脏的解剖位置。',
        'A: aVF is equiphasic and I is the tallest → the vector points at about 0° (a “horizontal” axis). B: I is small, aVL is mainly negative and II, III, aVF are tall → about +80° (a “vertical” axis). Both are normal axes; the vector simply points elsewhere. These words describe the axis only — they do not prove where the heart lies.',
        'A: aVF es isodifásica y I es la más alta → el vector apunta a unos 0° (eje «horizontal»). B: I es pequeña, aVL es sobre todo negativa y II, III y aVF son altas → unos +80° (eje «vertical»). Ambos ejes son normales; el vector solo apunta a otro sitio. Estos términos describen el eje, no demuestran la posición anatómica del corazón.',
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
            'III = LL − LA：正极在左下肢，负极在左上肢，指向 +120°。I = LA − RA，II = LL − RA。',
            'III = LL − LA: positive pole on the left leg, negative on the left arm, pointing at +120°. I = LA − RA and II = LL − RA.',
            'III = LL − LA: polo positivo en la pierna izquierda y negativo en el brazo izquierdo; apunta a +120°. I = LA − RA y II = LL − RA.',
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
            '一份打印件上 III 导联缺失，但 I 和 II 完好。哪个公式可以把 III 算回来？',
            'Lead III is missing from a printout, but I and II are fine. Which formula rebuilds III?',
            'En una copia impresa falta la derivación III, pero I y II están bien. ¿Qué fórmula reconstruye III?',
          ),
          options: [
            { id: 'ii-i', label: l('III = II − I', 'III = II − I', 'III = II − I') },
            { id: 'i-ii', label: l('III = I − II', 'III = I − II', 'III = I − II') },
            { id: 'sum', label: l('III = I + II', 'III = I + II', 'III = I + II') },
            { id: 'mean', label: l('III = (I + II)/2', 'III = (I + II)/2', 'III = (I + II)/2') },
          ],
          correct: 'ii-i',
          explanation: l(
            '由 Einthoven 定律 II = I + III 得 III = II − I。在这份心电图上验证一下：在同一条竖线上，II 的高度减去 I 的高度，就是 III 的高度。正因为如此，12 个导联里只有 8 个独立信号。',
            'From Einthoven’s law II = I + III, so III = II − I. Check it on this tracing: on any one vertical line, the height in II minus the height in I is the height in III. This is why the 12 leads hold only 8 independent signals.',
            'De la ley de Einthoven, II = I + III, así que III = II − I. Compruébalo en este trazado: sobre cualquier línea vertical, la altura en II menos la altura en I es la altura en III. Por eso las 12 derivaciones solo contienen 8 señales independientes.',
          ),
        }),
      },
    },
    { kind: 'check', item: { family: 'leads', seed: 31003 } },
    { kind: 'drill', families: ['leads', 'axis-quadrant'], count: 6, passScore: 0.8, difficulty: 'classic' },
    {
      kind: 'real',
      ids: [2686, 3762],
      caption: l(
        '两位电轴不同的健康成人。对每份心电图：核对 I + III ≈ II，找出最接近正负相等的肢体导联，判断向量指向哪里；然后打开完整病例，与机器测得的电轴比较。',
        'Two healthy adults with different axes. For each one: check that I + III ≈ II, find the most equiphasic limb lead and decide where the vector points. Then open the full case and compare with the machine’s axis.',
        'Dos adultos sanos con ejes distintos. En cada uno: comprueba que I + III ≈ II, busca la derivación de los miembros más isodifásica y decide hacia dónde apunta el vector. Después abre el caso completo y compáralo con el eje que mide la máquina.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '忽视 aVR：它是 I 与 II 平均值的镜像，正常时全部向下；健康人 aVR 的 P 波和 QRS 向上，提示上肢电极反接（第 f6 课）。',
          'Ignoring aVR: it mirrors the average of I and II and is normally all negative. An upright P and QRS in aVR in a healthy person points to an arm-cable reversal (lesson f6).',
          'Ignorar aVR: es la imagen especular de la media de I y II y normalmente es toda negativa. Una P y un QRS positivos en aVR en una persona sana apuntan a una inversión de los cables de los brazos (lección f6).',
        ),
        l(
          '把 12 个导联当成 12 个独立视角：肢体导联只是两个信号的组合，只在一个导出导联中出现的“新发现”必须能在其他导联中得到解释。',
          'Treating the 12 leads as 12 independent views: the limb leads are combinations of two signals, so a “finding” in one derived lead must be explainable in the others.',
          'Tratar las 12 derivaciones como 12 vistas independientes: las de los miembros son combinaciones de dos señales, así que un «hallazgo» en una sola de las derivaciones calculadas debe poder explicarse en las demás.',
        ),
        l(
          '弄错角度符号：负角度在水平线以上（朝头侧），正角度在水平线以下（朝足侧）。',
          'Mixing up the angle signs: negative angles lie above the horizontal (toward the head), positive angles below it (toward the feet).',
          'Confundir el signo de los ángulos: los negativos están por encima de la horizontal (hacia la cabeza) y los positivos por debajo (hacia los pies).',
        ),
        l(
          '用“横位心”“垂直位心”当诊断：这些词只描述电轴，不能证明心脏的解剖位置。',
          'Using “horizontal heart” or “vertical heart” as a diagnosis: the terms describe the axis only, not the anatomical position.',
          'Usar «corazón horizontal» o «corazón vertical» como diagnóstico: solo describen el eje, no la posición anatómica.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('I = LA − RA，II = LL − RA，III = LL − LA；II = I + III。', 'I = LA − RA, II = LL − RA, III = LL − LA; II = I + III.', 'I = LA − RA, II = LL − RA, III = LL − LA; II = I + III.'),
        l(
          'I 0°，aVL −30°，II +60°，aVF +90°，III +120°，aVR −150°。',
          'I 0°, aVL −30°, II +60°, aVF +90°, III +120°, aVR −150°.',
          'I 0°, aVL −30°, II +60°, aVF +90°, III +120°, aVR −150°.',
        ),
        l('互相垂直：I–aVF、II–aVL、III–aVR。', 'Perpendicular pairs: I–aVF, II–aVL, III–aVR.', 'Pares perpendiculares: I-aVF, II-aVL, III-aVR.'),
        l(
          'V1–V6 以 Wilson 中心电端为参考，在水平面上从右前看到左侧。',
          'V1–V6 are referenced to Wilson’s central terminal and look around the horizontal plane from the right front to the left side.',
          'V1-V6 se refieren al terminal central de Wilson y recorren el plano horizontal desde delante a la derecha hasta el costado izquierdo.',
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
