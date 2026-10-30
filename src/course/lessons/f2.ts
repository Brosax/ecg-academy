/**
 * f2 — Dipoles and vectors: why a deflection is positive, negative or equiphasic (stage F, docs/PLAN.md §3).
 * Stage goal: predict the deflection in any lead from an activation vector (critic.json learning path, stage 1).
 * Criteria: docs/curriculum/criteria.md `dipole-rule`, `activation-vectors`, `repolarization-direction`,
 * `qrs-naming`, normal septal q waves (UDMI).
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
    '一条规则解释所有波形：比较激动波前的方向和导联的方向。',
    'One rule explains every deflection: compare the direction of the activation front with the direction of the lead.',
    'Una sola regla explica todas las deflexiones: compara la dirección del frente de activación con la dirección de la derivación.',
  ),
  objectives: [
    l(
      '说出偶极子规则：朝向正极 → 向上；背离正极 → 向下；与导联垂直 → 正负相等（双向）。',
      'State the dipole rule: toward the positive pole → upward; away from it → downward; perpendicular to the lead → equiphasic.',
      'Enunciar la regla del dipolo: hacia el polo positivo → hacia arriba; alejándose → hacia abajo; perpendicular a la derivación → isodifásica.',
    ),
    l(
      '描述心室除极的三个向量，以及它们在 V1 和 V6 形成的 QRS 形态。',
      'Describe the three ventricular activation vectors and the QRS shape they produce in V1 and V6.',
      'Describir los tres vectores de activación ventricular y la forma del QRS que producen en V1 y V6.',
    ),
    l(
      '解释为什么正常 T 波与 QRS 主波方向一致。',
      'Explain why a normal T wave points the same way as the main QRS deflection.',
      'Explicar por qué la onda T normal tiene la misma polaridad que la deflexión principal del QRS.',
    ),
    l(
      '已知平均 QRS 向量的方向，预测某个肢体导联的 QRS 形态。',
      'Predict the QRS in a limb lead from the direction of the mean QRS vector.',
      'Predecir el QRS de una derivación de los miembros a partir de la dirección del vector medio del QRS.',
    ),
  ],
  minutes: 11,
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
        '每个导联都从不同方向观察同一个电活动。心室除极的总和指向**左下方**：朝向 II 导联的正极（左下肢），背离 aVR 导联的正极（右肩）。朝向 = 向上，背离 = 向下。',
        'Each lead looks at the same electrical event from a different direction. Summed, ventricular activation points **down and to the patient’s left**: toward the positive pole of II (left leg) and away from that of aVR (right shoulder). Toward = upward; away = downward.',
        'Cada derivación mira el mismo fenómeno eléctrico desde una dirección distinta. En conjunto, la activación ventricular apunta **hacia abajo y a la izquierda del paciente**: hacia el polo positivo de II (pierna izquierda) y lejos del de aVR (hombro derecho). Hacia = arriba; lejos = abajo.',
      ),
    },
    {
      kind: 'text',
      title: l('偶极子规则', 'The dipole rule', 'La regla del dipolo'),
      body: l(
        '激动波前是一条移动的边界：后面的组织已经除极（细胞外为负），前面的组织仍在静息（细胞外为正）。电极看到的是：\n- 波前**朝向**它而来 → 向上（正向）波\n- 波前**背离**它而去 → 向下（负向）波\n- 波前从它**侧面横过**（与导联垂直）→ 正负相等的双向波\n波的大小取决于参与的心肌有多少，以及波前有多正对着电极。',
        'An activation front is a moving boundary: tissue behind it is already depolarized (negative outside), tissue ahead is still at rest (positive outside). An electrode sees:\n- the front **coming toward** it → an upward (positive) deflection\n- the front **moving away** → a downward (negative) deflection\n- the front passing **across** it (perpendicular to the lead) → an equiphasic deflection, as much up as down\nThe size depends on how much muscle is activated and how directly the front heads toward the electrode.',
        'Un frente de activación es un límite en movimiento: el tejido de detrás ya está despolarizado (negativo por fuera) y el de delante sigue en reposo (positivo por fuera). Un electrodo ve:\n- el frente **acercándose** → una deflexión positiva (hacia arriba)\n- el frente **alejándose** → una deflexión negativa (hacia abajo)\n- el frente pasando **de lado** (perpendicular a la derivación) → una deflexión isodifásica, tan positiva como negativa\nEl tamaño depende de cuánto músculo se activa y de lo directamente que el frente se dirige al electrodo.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'dipole', params: { autoplay: true } },
      caption: l(
        '一个波前，四个电极。看波前经过时每个电极记录到什么：同一个事件，站的位置不同，记录到的波可以向上、向下或双向。',
        'One front, four electrodes. Watch what each electrode records as the front passes: the same event is upward, downward or biphasic depending on where you stand.',
        'Un frente, cuatro electrodos. Observa qué registra cada electrodo al pasar el frente: el mismo fenómeno es positivo, negativo o bifásico según dónde se mire.',
      ),
    },
    {
      kind: 'criteria',
      title: l('每个波背后的规则', 'The rules behind every wave', 'Las reglas detrás de cada onda'),
      items: [
        {
          label: l('除极波前朝向正极', 'Depolarization front toward the positive pole', 'Frente de despolarización hacia el polo positivo'),
          value: l('正向波', 'positive deflection', 'deflexión positiva'),
        },
        {
          label: l('除极波前背离正极', 'Depolarization front away from the positive pole', 'Frente de despolarización alejándose del polo positivo'),
          value: l('负向波', 'negative deflection', 'deflexión negativa'),
        },
        {
          label: l('波前与导联垂直', 'Front perpendicular to the lead', 'Frente perpendicular a la derivación'),
          value: l('正负相等的双向波', 'equiphasic (isodiphasic) deflection', 'deflexión isodifásica'),
        },
        {
          label: l('复极波前', 'Repolarization front', 'Frente de repolarización'),
          value: l(
            '符号相反：背离电极的复极产生正向波',
            'opposite sign: repolarization moving away from the electrode gives a positive deflection',
            'signo opuesto: una repolarización que se aleja del electrodo da una deflexión positiva',
          ),
        },
        {
          label: l('正常心室复极', 'Normal ventricular repolarization', 'Repolarización ventricular normal'),
          value: l(
            '外膜动作电位较短，复极从外膜向内膜进行，所以 T 波通常与 QRS 主波同向',
            'epicardial action potentials are shorter, so repolarization runs from epicardium to endocardium and T normally has the polarity of the main QRS deflection',
            'los potenciales de acción del epicardio son más cortos, la repolarización va de epicardio a endocardio y la T suele tener la polaridad de la deflexión principal del QRS',
          ),
        },
      ],
      source:
        'Kligfield 2007 AHA/ACCF/HRS Part I (Circulation 2007;115:1306); Macfarlane PW et al. Comprehensive Electrocardiology, 2nd ed. (2011); Yan GX, Antzelevitch C. Circulation 1998;98:1928-1936; Rautaharju PM et al. AHA/ACCF/HRS 2009 Part IV (Circulation 2009;119:e241)',
    },
    {
      kind: 'text',
      title: l('三个向量组成 QRS', 'Three vectors make the QRS', 'Tres vectores forman el QRS'),
      body: l(
        '- **向量 1，室间隔**：最先激动，从左向右、向前。\n- **向量 2，心室游离壁**：由厚的左心室主导，指向左、下、后，是最大的向量。\n- **向量 3，基底部**：最后激动，指向上、后。\nV1 位于右前方：先看到向量 1 迎面而来（小 r 波），再看到向量 2 离去（深 S 波）→ **rS**。V6 位于左侧：向量 1 离去（小 q 波），向量 2 迎面而来（高 R 波）→ **qR**。',
        '- **Vector 1, the septum**: activated first, from left to right and forward.\n- **Vector 2, the free walls**: dominated by the thick left ventricle, pointing left, down and back. It is the largest.\n- **Vector 3, the bases**: activated last, pointing up and back.\nV1 sits on the right, in front: it sees vector 1 coming (small r) and then vector 2 leaving (deep S) → **rS**. V6 sits on the left: vector 1 leaves (small q), vector 2 arrives (tall R) → **qR**.',
        '- **Vector 1, el tabique**: se activa primero, de izquierda a derecha y hacia delante.\n- **Vector 2, las paredes libres**: dominado por el grueso ventrículo izquierdo, apunta a la izquierda, abajo y atrás. Es el mayor.\n- **Vector 3, las bases**: se activan al final y apuntan arriba y atrás.\nV1 está a la derecha y delante: ve llegar el vector 1 (r pequeña) y alejarse el vector 2 (S profunda) → **rS**. V6 está a la izquierda: el vector 1 se aleja (q pequeña) y el vector 2 se acerca (R alta) → **qR**.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'vector-loop', params: { plane: 'both' } },
      ecg: syn('normal', 211),
      caption: l(
        '由这份心电图重建的 QRS 向量环。点击心电图上的某一时刻，箭头显示那一瞬间心电向量指向哪里：中段的大向量指向左下，就是心室游离壁。',
        'The QRS loop reconstructed from this ECG. Click a moment on the tracing: the arrow shows where the heart vector points at that instant. The large middle part of the loop points left and down — the free walls.',
        'El bucle del QRS reconstruido a partir de este ECG. Haz clic en un instante del trazado: la flecha muestra hacia dónde apunta el vector cardiaco en ese momento. La gran parte central del bucle apunta a la izquierda y abajo: las paredes libres.',
      ),
    },
    {
      kind: 'worked',
      title: l('在 V1 和 V6 读出三个向量', 'Reading the three vectors in V1 and V6', 'Leer los tres vectores en V1 y V6'),
      ecg: syn('normal', 212),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('V1：小 r 波', 'V1: small r', 'V1: r pequeña'),
          body: l(
            '室间隔从左向右除极，朝向 V1 而来：一个小而窄的正向波。',
            'The septum depolarizes from left to right, toward V1: a small, narrow upward wave.',
            'El tabique se despolariza de izquierda a derecha, hacia V1: una onda positiva pequeña y estrecha.',
          ),
          marks: [{ auto: 'r', lead: 'V1' }],
          highlightLeads: ['V1'],
        },
        {
          title: l('V1：深 S 波', 'V1: deep S', 'V1: S profunda'),
          body: l(
            '接着，强大的左心室向量向左后方离开 V1：深的负向波。V1 正常为 rS 形。',
            'Next the large left-ventricular vector heads left and back, away from V1: a deep downward wave. V1 is normally rS.',
            'Después, el gran vector del ventrículo izquierdo se dirige a la izquierda y atrás, lejos de V1: una onda negativa profunda. V1 es normalmente rS.',
          ),
          marks: [{ auto: 's', lead: 'V1' }],
          highlightLeads: ['V1'],
        },
        {
          title: l('V6：小 q 波', 'V6: small q', 'V6: q pequeña'),
          body: l(
            '同一个室间隔向量背离 V6：一个小而窄的 q 波。这是正常的“间隔 q 波”，不是梗死。',
            'The same septal vector moves away from V6: a small, narrow q wave. This is the normal septal q, not an infarct.',
            'El mismo vector septal se aleja de V6: una onda q pequeña y estrecha. Es la q septal normal, no un infarto.',
          ),
          marks: [{ auto: 'q', lead: 'V6' }],
          highlightLeads: ['V6'],
        },
        {
          title: l('V6：高 R 波', 'V6: tall R', 'V6: R alta'),
          body: l(
            '左心室向量迎着 V6 而来：高大的 R 波。V1 和 V6 是同一组向量从两个相反方向看到的样子。',
            'The left-ventricular vector comes straight at V6: a tall R wave. V1 and V6 show the same vectors seen from opposite sides.',
            'El vector del ventrículo izquierdo llega de frente a V6: una R alta. V1 y V6 muestran los mismos vectores vistos desde lados opuestos.',
          ),
          marks: [{ auto: 'r', lead: 'V6' }],
          highlightLeads: ['V6'],
        },
        {
          title: l('T 波跟随 QRS', 'T follows the QRS', 'La T sigue al QRS'),
          body: l(
            '复极的方向与除极相反，符号也相反，两次“相反”抵消：V6 中 QRS 向上、T 向上；aVR 中两者都向下。',
            'Repolarization runs in the opposite direction *and* with the opposite sign — the two reversals cancel out: in V6 QRS and T are both upright; in aVR both are negative.',
            'La repolarización va en sentido contrario *y* con signo contrario, y las dos inversiones se anulan: en V6 el QRS y la T son positivos; en aVR, ambos negativos.',
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
        '转动心脏：平均 QRS 向量在额面上旋转。盯住 III 和 aVL 导联：向量转向某导联的正极，它的 QRS 向上变大；转离，就变为向下。约 +30° 时 III 导联正负相等——此时向量与它垂直。',
        'Turn the heart: the mean QRS vector rotates in the frontal plane. Watch III and aVL: as the vector turns toward a lead’s positive pole its QRS grows upward; as it turns away, the QRS turns downward. At about +30° lead III becomes equiphasic — the vector is perpendicular to it.',
        'Gira el corazón: el vector medio del QRS rota en el plano frontal. Fíjate en III y aVL: cuando el vector se acerca al polo positivo de una derivación, su QRS crece hacia arriba; cuando se aleja, se vuelve negativo. Hacia +30° la derivación III se hace isodifásica: el vector es perpendicular a ella.',
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
        '右束支阻滞时，右心室最后才被激动，多出一个**晚期向量**，指向右前方。V1 在右前方，看到它迎面而来 → QRS 末尾出现高的正向波；I 和 V6 在左侧，看到它离去 → 末尾出现宽 S 波。规则没变，只是多了一个向量。',
        'With the right bundle blocked, the right ventricle is activated last, adding a **late vector** that points right and forward. V1 (right, in front) sees it coming → a tall positive wave at the end of the QRS; I and V6 (on the left) see it leaving → a broad terminal S. Same rule, one more vector.',
        'Con la rama derecha bloqueada, el ventrículo derecho se activa al final y añade un **vector tardío** que apunta a la derecha y hacia delante. V1 (a la derecha, delante) lo ve llegar → una onda positiva alta al final del QRS; I y V6 (a la izquierda) lo ven alejarse → una S final ancha. La misma regla, un vector más.',
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
            '这颗心脏的平均 QRS 向量几乎水平指向患者左侧。点击 QRS 波群最接近正负相等的肢体导联。',
            'The mean QRS vector of this heart points almost horizontally to the patient’s left. Click the limb lead whose QRS is closest to equiphasic.',
            'El vector medio del QRS de este corazón apunta casi en horizontal hacia la izquierda del paciente. Haz clic en la derivación de los miembros cuyo QRS sea más isodifásico.',
          ),
          explanation: l(
            'aVF 从下方（足部）观察，与水平向量垂直：波前从它侧面横过，QRS 正负相等。从左侧观察的 I 导联正对着向量，QRS 几乎全部向上。',
            'aVF looks from below (the feet), at right angles to a horizontal vector: the front passes across it, so its QRS is equiphasic. Lead I, looking from the left, faces the vector head-on: its QRS is almost entirely upright.',
            'aVF mira desde abajo (los pies), en ángulo recto con un vector horizontal: el frente le pasa de lado y su QRS es isodifásico. La derivación I, que mira desde la izquierda, tiene el vector de frente: su QRS es casi todo positivo.',
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
            '先遮住 aVR 的 T 波，只看它的 QRS 波群。正常心脏中，aVR 的 T 波应该是什么方向？',
            'Cover the T wave in aVR and look only at its QRS. In a normal heart, which way should the T wave in aVR point?',
            'Tapa la onda T de aVR y mira solo su QRS. En un corazón normal, ¿hacia dónde debería apuntar la onda T en aVR?',
          ),
          options: [
            { id: 'neg', label: l('向下，与 QRS 相同', 'Downward, like the QRS', 'Hacia abajo, como el QRS') },
            { id: 'pos', label: l('向上，与 QRS 相反', 'Upward, opposite to the QRS', 'Hacia arriba, al contrario que el QRS') },
            { id: 'flat', label: l('完全平坦', 'Completely flat', 'Completamente plana') },
          ],
          correct: 'neg',
          explanation: l(
            'aVR 的 QRS 向下，因为心室除极背离右肩。复极从外膜向内膜进行，方向和符号都与除极相反，所以 T 波与 QRS 主波同向：aVR 中 T 波倒置是正常的。',
            'The QRS in aVR is negative because activation heads away from the right shoulder. Repolarization runs from epicardium to endocardium, with the opposite direction and the opposite sign, so T follows the main QRS deflection: a negative T in aVR is normal.',
            'El QRS de aVR es negativo porque la activación se aleja del hombro derecho. La repolarización va de epicardio a endocardio, con sentido y signo contrarios, así que la T sigue a la deflexión principal del QRS: una T negativa en aVR es normal.',
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
        '两位健康成人。先在每份心电图中找出 R 波最高的肢体导联和最接近正负相等的肢体导联：平均向量指向前者，横过后者。再检查 V1 是否为 rS、V6 是否为 qR。',
        'Two healthy adults. In each tracing, first find the limb lead with the tallest R and the one closest to equiphasic: the mean vector points toward the first and runs across the second. Then check that V1 is rS and V6 is qR.',
        'Dos adultos sanos. En cada trazado busca primero la derivación de los miembros con la R más alta y la más isodifásica: el vector medio apunta hacia la primera y pasa de lado por la segunda. Después comprueba que V1 sea rS y V6, qR.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把“向上”当作正常、“向下”当作异常：方向只说明向量与导联的关系，aVR 本来就应该向下。',
          'Reading “upward” as healthy and “downward” as diseased: polarity only tells you the direction relative to the lead — aVR is normally negative.',
          'Leer «positivo» como sano y «negativo» como enfermo: la polaridad solo indica la dirección respecto a la derivación; aVR es normalmente negativa.',
        ),
        l(
          '忘了波形大小也取决于方向：小波群可能只是向量与导联垂直，而不是心肌少。',
          'Forgetting that size also depends on direction: a small complex may mean a vector perpendicular to the lead, not little muscle.',
          'Olvidar que el tamaño también depende de la dirección: un complejo pequeño puede indicar un vector perpendicular a la derivación, no poco músculo.',
        ),
        l(
          '以为 T 波应与 QRS 方向相反：正常情况下两者同向。',
          'Expecting T to oppose the QRS: in a normal heart they point the same way.',
          'Esperar que la T sea opuesta al QRS: en un corazón normal apuntan en el mismo sentido.',
        ),
        l(
          '把 I、aVL、V5–V6 中窄小的间隔 q 波当作梗死 Q 波：它们来自正常的室间隔向量。',
          'Calling the narrow, small septal q waves in I, aVL and V5–V6 infarct Q waves: they come from the normal septal vector.',
          'Tomar las q septales pequeñas y estrechas de I, aVL y V5-V6 por ondas Q de infarto: proceden del vector septal normal.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('朝向正极 = 向上；背离 = 向下；横过 = 正负相等。', 'Toward the positive pole = up; away = down; across = equiphasic.', 'Hacia el polo positivo = arriba; alejándose = abajo; de lado = isodifásica.'),
        l(
          'QRS = 室间隔（向右）+ 游离壁（向左，左心室主导）+ 基底部（向上）：V1 呈 rS，V6 呈 qR。',
          'QRS = septum (rightward) + free walls (leftward, LV-dominated) + bases (upward): rS in V1, qR in V6.',
          'QRS = tabique (hacia la derecha) + paredes libres (hacia la izquierda, domina el VI) + bases (hacia arriba): rS en V1, qR en V6.',
        ),
        l('正常 T 波与 QRS 主波同向。', 'A normal T points the same way as the main QRS.', 'La T normal apunta en el mismo sentido que la deflexión principal del QRS.'),
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
