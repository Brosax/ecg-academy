/**
 * Atlas entries — category `chamber` (atria, ventricular mass, voltage). Schema and authoring rules: src/atlas/schema.ts.
 * Values: docs/curriculum/criteria.md (section atrial-enlargement-ventricular-hypertrophy; p-wave-normal).
 * Terminology: "atrial abnormality" (Hancock 2009), "LVH with secondary ST–T abnormalities", R-wave peak time.
 */
import { l } from '../../core/l10n';
import { REF } from '../refs';
import type { AtlasEntry } from '../schema';

export const entries: readonly AtlasEntry[] = [
  // ── left atrial abnormality ──────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'lae',
    definition: l(
      '反映左心房增大、压力升高或传导延迟的P波改变：Ⅱ导联P波增宽伴切迹，V1导联P波终末负向部分深而宽。',
      'P-wave changes that reflect a large, pressure-loaded or late-activated left atrium: a broad, notched P in II and a deep, broad terminal negative P in V1.',
      'Cambios de la onda P que reflejan una aurícula izquierda grande, sobrecargada o de activación tardía: P ancha y mellada en II y componente negativo terminal profundo y ancho en V1.',
    ),
    features: [
      l(
        '测量Ⅱ导联P波：时限≥120 ms，常呈双峰，两峰间距≥40 ms。',
        'Measure the P in II: duration ≥ 120 ms, often with two humps ≥ 40 ms apart.',
        'Mide la P en II: duración ≥ 120 ms, a menudo con dos jorobas separadas ≥ 40 ms.',
      ),
      l(
        '看V1：P波终末负向部分深≥1 mm、宽≥40 ms（各一个小格）。',
        'Look at V1: the terminal negative part of the P is ≥ 1 mm deep and ≥ 40 ms wide (one small square each way).',
        'Mira V1: la parte negativa terminal de la P mide ≥ 1 mm de profundidad y ≥ 40 ms de anchura (un cuadradito en cada sentido).',
      ),
      l(
        '结合临床：二尖瓣病变、高血压/左心室肥厚、心力衰竭，以及心房颤动风险。',
        'Read it in context: mitral valve disease, hypertension or LVH, heart failure, and the risk of atrial fibrillation.',
        'Interprétalo en su contexto: valvulopatía mitral, hipertensión o HVI, insuficiencia cardiaca y riesgo de fibrilación auricular.',
      ),
    ],
    criteria: [
      {
        label: l('P波时限（Ⅱ导联）', 'P duration (lead II)', 'Duración de la P (II)'),
        value: l('≥120 ms', '≥ 120 ms', '≥ 120 ms'),
        source: 'Hancock 2009 (AHA/ACCF/HRS Part V)',
      },
      {
        label: l('切迹型P波', 'Notched P', 'P mellada'),
        value: l('两峰间距≥40 ms', 'Peak-to-peak interval ≥ 40 ms', 'Intervalo entre picos ≥ 40 ms'),
        source: 'Hancock 2009 (AHA/ACCF/HRS Part V)',
      },
      {
        label: l('V1导联P波终末电势', 'P-terminal force in V1', 'Fuerza terminal de la P en V1'),
        value: l('终末负向部分深≥1 mm且宽≥40 ms（≥0.04 mm·s）', 'Terminal negative P ≥ 1 mm deep and ≥ 40 ms wide (≥ 0.04 mm·s)', 'P negativa terminal ≥ 1 mm de profundidad y ≥ 40 ms de anchura (≥ 0,04 mm·s)'),
        source: 'Hancock 2009 (AHA/ACCF/HRS Part V)',
      },
      {
        label: l('运动员（国际标准）', 'Athletes (international criteria)', 'Deportistas (criterios internacionales)'),
        value: l(
          '属“临界”表现：单独出现无需进一步检查，≥2项临界表现需评估',
          'A “borderline” finding: alone it needs no work-up; two or more borderline findings need evaluation',
          'Hallazgo «límite»: aislado no requiere estudio; dos o más hallazgos límite sí',
        ),
        source: 'Sharma 2017 (international athlete criteria)',
      },
    ],
    mechanism: l(
      '右心房先激动形成P波前部，左心房经Bachmann束较晚激动形成P波后部。左心房增大、压力升高或激动延迟时，P波后部延长，其向后的方向在面向前胸的V1导联表现为深的终末负向波。',
      "The right atrium is activated first and forms the early P wave, while the left atrium, reached later through Bachmann's bundle, forms its end. When the left atrium is large, pressure-loaded or reached late, the end of the P is prolonged and its posterior direction appears as a deep terminal negativity in V1, which faces the front of the chest.",
      'La aurícula derecha se activa primero y forma la parte inicial de la onda P, mientras que la izquierda, alcanzada más tarde a través del haz de Bachmann, forma su final. Cuando la aurícula izquierda es grande, está sobrecargada o se activa tarde, el final de la P se prolonga y su dirección posterior aparece como una negatividad terminal profunda en V1, que mira a la cara anterior del tórax.',
    ),
    mimics: [
      {
        id: 'interatrial-block',
        discriminator: l(
          '两者P波均≥120 ms；房间传导阻滞指传导延迟本身，高度阻滞时Ⅱ、Ⅲ、aVF的P波呈正负双向；左心房异常依赖V1深的终末负向P波。',
          'Both widen the P to ≥ 120 ms; interatrial block names the conduction delay (advanced: +/− P in II, III and aVF), whereas left atrial abnormality rests on the deep terminal P in V1.',
          'Ambos ensanchan la P a ≥ 120 ms; el bloqueo interauricular nombra el retraso de conducción (avanzado: P +/− en II, III y aVF), mientras que la anomalía auricular izquierda se basa en la P terminal profunda en V1.',
        ),
        leads: ['II', 'III', 'aVF', 'V1'],
      },
      {
        id: 'precordial-misplacement',
        discriminator: l(
          'V1放置过高（第2–3肋间）可使V1的P波负向，但Ⅱ导联P波不宽；核对Ⅱ导联P波和电极位置。',
          'V1 placed too high (2nd–3rd interspace) makes the P negative in V1 without a broad P in II; check the P in II and the electrode position.',
          'Un V1 colocado demasiado alto (2.º–3.er espacio intercostal) hace negativa la P en V1 sin P ancha en II; comprueba la P en II y la posición del electrodo.',
        ),
        leads: ['V1', 'V2', 'II'],
      },
      {
        id: 'rae',
        discriminator: l(
          '右心房异常使P波高而窄（Ⅱ导联>2.5 mm，时限<120 ms）；左心房异常使P波宽、有切迹，V1终末负向部分深。',
          'Right atrial abnormality makes the P tall and narrow (> 2.5 mm in II, < 120 ms); left atrial abnormality makes it broad and notched with a deep terminal part in V1.',
          'La anomalía auricular derecha hace la P alta y estrecha (> 2,5 mm en II, < 120 ms); la izquierda la hace ancha y mellada, con una parte terminal profunda en V1.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'biatrial-abnormality',
        discriminator: l(
          '此处P波起始部正常；双心房异常同时有高的起始部（V1>1.5 mm或Ⅱ>2.5 mm）。',
          'Here the initial P is normal; in biatrial abnormality a tall initial component is added (> 1.5 mm in V1 or > 2.5 mm in II).',
          'Aquí la parte inicial de la P es normal; en la anomalía biauricular se añade un componente inicial alto (> 1,5 mm en V1 o > 2,5 mm en II).',
        ),
        leads: ['II', 'V1'],
      },
    ],
    pitfalls: [
      l(
        '认为P波只反映心腔大小：传导延迟和压力负荷同样改变P波，因此称为“心房异常”。',
        'Assuming the P shows chamber size alone: conduction delay and pressure change it too, which is why it is called an atrial abnormality.',
        'Suponer que la P solo refleja el tamaño de la cavidad: el retraso de conducción y la presión también la modifican, por eso se habla de anomalía auricular.',
      ),
      l(
        '只在一个导联测P波时限；应取同步导联中最宽的P波。',
        'Measuring P duration in one lead only; the widest P across simultaneous leads counts.',
        'Medir la duración de la P en una sola derivación; cuenta la P más ancha entre las derivaciones simultáneas.',
      ),
      l(
        '未发现V1电极过高造成的假性终末负向P波。',
        'Missing a high V1 electrode, which creates a false terminal negativity.',
        'No detectar un electrodo V1 demasiado alto, que crea una falsa negatividad terminal.',
      ),
    ],
    lessons: ['h1'],
    sources: [REF.hancock2009, REF.bayesIab2012, REF.sharma2017, REF.chou2008],
    aka: ['LAE', 'LAA', 'P mitrale', 'P mitral', 'left atrial enlargement', 'crecimiento auricular izquierdo', '左心房扩大', '二尖瓣型P波'],
    exemplar: { scenarios: ['lae'], leads: ['II', 'V1'] },
  },

  // ── right atrial abnormality ─────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'rae',
    definition: l(
      '右心房增大或负荷增加引起的P波改变：下壁导联P波高，V1–V2导联P波起始部高，P波时限正常。',
      'P-wave changes from a large or overloaded right atrium: a tall P in the inferior leads and a tall initial P in V1–V2, with a normal P duration.',
      'Cambios de la onda P por una aurícula derecha grande o sobrecargada: P alta en las derivaciones inferiores y componente inicial alto en V1–V2, con duración normal de la P.',
    ),
    features: [
      l('Ⅱ（或Ⅲ、aVF）导联P波振幅>2.5 mm（0.25 mV），多呈尖峰状。', 'P amplitude in II (or III, aVF) > 2.5 mm (0.25 mV), usually peaked.', 'Amplitud de la P en II (o III, aVF) > 2,5 mm (0,25 mV), habitualmente picuda.'),
      l('V1或V2导联P波起始正向部分>1.5 mm。', 'Initial positive part of the P in V1 or V2 > 1.5 mm.', 'Parte inicial positiva de la P en V1 o V2 > 1,5 mm.'),
      l('P波时限仍<120 ms，P电轴右偏（>+75°）。', 'P duration stays < 120 ms and the P axis is rightward (> +75°).', 'La duración de la P sigue < 120 ms y el eje de la P está a la derecha (> +75°).'),
      l(
        '寻找原因：慢性肺病、肺动脉高压、三尖瓣或先天性心脏病；同时查看有无右心室肥厚。',
        'Look for the cause: chronic lung disease, pulmonary hypertension, tricuspid or congenital disease; check for RVH.',
        'Busca la causa: neumopatía crónica, hipertensión pulmonar, valvulopatía tricuspídea o cardiopatía congénita; busca HVD.',
      ),
    ],
    criteria: [
      {
        label: l('P波振幅（Ⅱ、Ⅲ、aVF）', 'P amplitude (II, III, aVF)', 'Amplitud de la P (II, III, aVF)'),
        value: l('>2.5 mm（0.25 mV）', '> 2.5 mm (0.25 mV)', '> 2,5 mm (0,25 mV)'),
        source: 'Hancock 2009 (AHA/ACCF/HRS Part V)',
      },
      {
        label: l('V1/V2 P波起始部', 'Initial P in V1/V2', 'P inicial en V1/V2'),
        value: l('>1.5 mm（0.15 mV）', '> 1.5 mm (0.15 mV)', '> 1,5 mm (0,15 mV)'),
        source: 'Hancock 2009 (AHA/ACCF/HRS Part V)',
      },
      {
        label: l('P电轴', 'P axis', 'Eje de la P'),
        value: l('>+75°', '> +75°', '> +75°'),
        source: 'Hancock 2009 (AHA/ACCF/HRS Part V)',
      },
      {
        label: l('P波时限', 'P duration', 'Duración de la P'),
        value: l('<120 ms（P波增宽提示左心房或双心房异常）', '< 120 ms (a broad P points to left atrial or biatrial abnormality)', '< 120 ms (una P ancha orienta a anomalía auricular izquierda o biauricular)'),
        source: 'Hancock 2009 (AHA/ACCF/HRS Part V)',
      },
    ],
    mechanism: l(
      '右心房激动形成P波前部，方向朝下、朝前。右心房增大或压力负荷增加时，这一早期向下、向前的向量增大，因此下壁导联和V1–V2的P波增高，但时限不延长。',
      'Right atrial activation forms the first part of the P wave and is directed down and forward. A larger or pressure-loaded right atrium adds force to that early vector, so the P grows taller in the inferior leads and in V1–V2 without becoming longer.',
      'La activación de la aurícula derecha forma la primera parte de la onda P y se dirige hacia abajo y adelante. Una aurícula derecha más grande o sobrecargada añade fuerza a ese vector precoz, de modo que la P crece en las derivaciones inferiores y en V1–V2 sin alargarse.',
    ),
    mimics: [
      {
        id: 'copd-pattern',
        discriminator: l(
          '单纯高P波为右心房异常；若伴肢体导联低电压、电轴垂直或右偏及胸导联移行延迟，则整体为慢性阻塞性肺疾病图形。',
          'An isolated tall P is right atrial abnormality; with low limb-lead voltage, a vertical or rightward axis and late precordial transition the whole picture is the COPD pattern.',
          'Una P alta aislada es anomalía auricular derecha; con bajo voltaje en los miembros, eje vertical o derecho y transición precordial tardía, el conjunto es el patrón de EPOC.',
        ),
        leads: ['II', 'V1', 'V6'],
      },
      {
        id: 'sinus-tachycardia',
        discriminator: l(
          '窦性心动过速时P波变高变尖；心率快时P波刚超过2.5 mm证据较弱，应结合整份心电图判断。',
          'At fast sinus rates the P becomes taller and more pointed; a P just over 2.5 mm during tachycardia is weak evidence — read it with the rest of the ECG.',
          'A frecuencias sinusales rápidas la P se hace más alta y picuda; una P apenas por encima de 2,5 mm durante una taquicardia es un dato débil: interprétala con el resto del ECG.',
        ),
        leads: ['II'],
      },
      {
        id: 'lae',
        discriminator: l(
          '左心房异常使P波增宽（≥120 ms）、V1终末部加深；右心房异常使P波增高而时限正常。',
          'Left atrial abnormality widens the P (≥ 120 ms) and deepens its terminal part in V1; right atrial abnormality makes it taller with a normal duration.',
          'La anomalía auricular izquierda ensancha la P (≥ 120 ms) y profundiza su parte terminal en V1; la derecha la hace más alta con duración normal.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'biatrial-abnormality',
        discriminator: l(
          '高P波同时≥120 ms或V1终末负向部分深时，应报告双心房异常。',
          'When a tall P is also ≥ 120 ms or has a deep terminal V1 component, report biatrial abnormality.',
          'Si una P alta además dura ≥ 120 ms o tiene un componente terminal profundo en V1, informa anomalía biauricular.',
        ),
        leads: ['II', 'V1'],
      },
    ],
    pitfalls: [
      l(
        '把单纯高P波称为“肺型P波”并假定有肺病：先天性和瓣膜病同样可引起。',
        'Calling a tall P “P pulmonale” and assuming lung disease: congenital and valve disease cause it too.',
        'Llamar «P pulmonar» a una P alta y presuponer neumopatía: también la causan cardiopatías congénitas y valvulopatías.',
      ),
      l('忽视增益：20 mm/mV时所有P波都显得高。', 'Ignoring the gain: at 20 mm/mV every P wave looks tall.', 'Ignorar la ganancia: a 20 mm/mV todas las ondas P parecen altas.'),
      l(
        '敏感性低：P波正常不能排除右心房增大，需超声心动图判断。',
        'Low sensitivity: a normal P does not exclude a large right atrium — echo decides.',
        'Baja sensibilidad: una P normal no descarta una aurícula derecha grande; decide la ecocardiografía.',
      ),
    ],
    lessons: ['h1', 'h3'],
    sources: [REF.hancock2009, REF.chou2008, REF.escPh2022, REF.sharma2017],
    aka: ['RAE', 'RAA', 'P pulmonale', 'P pulmonar', 'right atrial enlargement', 'crecimiento auricular derecho', '右心房扩大', '肺型P波'],
    exemplar: { scenarios: ['rae'], leads: ['II', 'V1'] },
  },

  // ── interatrial block ────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'interatrial-block',
    definition: l(
      '左右心房间（Bachmann束）传导延迟，使P波时限≥120 ms；高度阻滞时左心房自下而上激动。',
      "Delayed conduction between the atria (Bachmann's bundle) that widens the P wave to ≥ 120 ms; in the advanced form the left atrium is activated from below.",
      'Retraso de la conducción entre las aurículas (haz de Bachmann) que ensancha la onda P hasta ≥ 120 ms; en la forma avanzada la aurícula izquierda se activa desde abajo.',
    ),
    features: [
      l('P波时限≥120 ms（取同步导联中最宽的P波）。', 'P duration ≥ 120 ms (take the widest P across simultaneous leads).', 'Duración de la P ≥ 120 ms (toma la P más ancha entre las derivaciones simultáneas).'),
      l('部分性阻滞：P波宽、常有切迹，但下壁导联仍为正向。', 'Partial block: the P is broad and often notched but positive in the inferior leads.', 'Bloqueo parcial: la P es ancha y a menudo mellada, pero positiva en las derivaciones inferiores.'),
      l('高度阻滞：Ⅱ、Ⅲ、aVF导联P波正负双向（先正后负）。', 'Advanced block: the P is biphasic (+/−) in II, III and aVF — first up, then down.', 'Bloqueo avanzado: la P es bifásica (+/−) en II, III y aVF, primero positiva y luego negativa.'),
      l(
        '与左心房异常分开报告；高度阻滞预示心房颤动和卒中风险。',
        'Report it separately from left atrial abnormality; the advanced form predicts atrial fibrillation and stroke.',
        'Infórmalo aparte de la anomalía auricular izquierda; la forma avanzada predice fibrilación auricular e ictus.',
      ),
    ],
    criteria: [
      {
        label: l('部分性房间传导阻滞', 'Partial interatrial block', 'Bloqueo interauricular parcial'),
        value: l('P波≥120 ms', 'P ≥ 120 ms', 'P ≥ 120 ms'),
        source: 'Bayés de Luna 2012 (consensus)',
      },
      {
        label: l('高度房间传导阻滞', 'Advanced interatrial block', 'Bloqueo interauricular avanzado'),
        value: l('P波≥120 ms + Ⅱ、Ⅲ、aVF导联P波正负双向', 'P ≥ 120 ms + biphasic (+/−) P in II, III and aVF', 'P ≥ 120 ms + P bifásica (+/−) en II, III y aVF'),
        source: 'Bayés de Luna 2012 (consensus)',
      },
    ],
    mechanism: l(
      '正常时左心房经Bachmann束较早激动，左右心房激动重叠，P波时限<120 ms。该束传导缓慢时左心房激动延迟；完全阻滞时激动从下方到达左心房，在下壁导联形成终末负向部分。',
      "Normally the left atrium is reached early through Bachmann's bundle, so right and left atrial activation overlap within a P wave shorter than 120 ms. When that bundle conducts slowly the left atrium is activated late, and when it is blocked the impulse reaches the left atrium from below, adding a terminal negative component in the inferior leads.",
      'Normalmente la aurícula izquierda se alcanza pronto a través del haz de Bachmann, de modo que la activación de ambas aurículas se solapa en una onda P de menos de 120 ms. Si ese haz conduce lento la aurícula izquierda se activa tarde, y si se bloquea el impulso llega a ella desde abajo y añade un componente terminal negativo en las derivaciones inferiores.',
    ),
    mimics: [
      {
        id: 'lae',
        discriminator: l(
          '两者P波均≥120 ms；房间传导阻滞描述传导延迟（高度阻滞时下壁P波正负双向），左心房异常依赖V1深的终末负向P波。',
          'Both give a P ≥ 120 ms; interatrial block describes the conduction delay (advanced: +/− inferior P), whereas left atrial abnormality relies on the deep terminal P in V1.',
          'Ambos dan una P ≥ 120 ms; el bloqueo interauricular describe el retraso de conducción (avanzado: P inferior +/−), mientras que la anomalía auricular izquierda se basa en la P terminal profunda en V1.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'ectopic-atrial-rhythm',
        discriminator: l(
          '低位心房起搏点使Ⅱ、Ⅲ、aVF导联P波完全负向；高度房间传导阻滞的P波先正后负。',
          'A low atrial focus makes the P entirely negative in II, III and aVF; in advanced interatrial block it starts positive and ends negative.',
          'Un foco auricular bajo hace la P totalmente negativa en II, III y aVF; en el bloqueo interauricular avanzado empieza positiva y termina negativa.',
        ),
        leads: ['II', 'III', 'aVF'],
      },
      {
        id: 'biatrial-abnormality',
        discriminator: l(
          '双心房异常还有高的P波起始部（Ⅱ>2.5 mm或V1>1.5 mm）。',
          'Biatrial abnormality adds a tall initial P component (> 2.5 mm in II or > 1.5 mm in V1).',
          'La anomalía biauricular añade un componente inicial alto de la P (> 2,5 mm en II o > 1,5 mm en V1).',
        ),
        leads: ['II', 'V1'],
      },
    ],
    pitfalls: [
      l(
        '把所有宽P波都称为左心房异常，漏掉传导诊断。',
        'Calling every broad P a left atrial abnormality and missing the conduction diagnosis.',
        'Llamar anomalía auricular izquierda a toda P ancha y perder el diagnóstico de conducción.',
      ),
      l(
        'Ⅱ、Ⅲ、aVF的终末负向部分很小，易漏诊高度阻滞——放大观察P波。',
        'Missing the advanced form because the terminal negative part in II, III and aVF is small — zoom in on the P.',
        'Pasar por alto la forma avanzada porque la parte negativa terminal en II, III y aVF es pequeña: amplía la P.',
      ),
    ],
    lessons: ['h1'],
    sources: [REF.bayesIab2012, REF.hancock2009],
    aka: ['IAB', 'Bayés syndrome', 'síndrome de Bayés', 'Bachmann', '房间阻滞'],
    exemplar: { scenarios: ['interatrial-block'], leads: ['II', 'III', 'aVF'] },
  },

  // ── biatrial abnormality ─────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'biatrial-abnormality',
    definition: l(
      '同一份心电图同时有右心房异常和左心房异常的表现。',
      'Signs of right and left atrial abnormality on the same ECG.',
      'Signos de anomalía auricular derecha e izquierda en el mismo ECG.',
    ),
    features: [
      l('P波高（Ⅱ>2.5 mm）且宽（≥120 ms）。', 'A P wave that is tall (> 2.5 mm in II) and broad (≥ 120 ms).', 'Una onda P alta (> 2,5 mm en II) y ancha (≥ 120 ms).'),
      l(
        '或V1 P波正负双向：起始部高（>1.5 mm），终末部深而宽（≥1 mm且≥40 ms）。',
        'Or a biphasic V1 P with a tall initial part (> 1.5 mm) and a deep, broad terminal part (≥ 1 mm and ≥ 40 ms).',
        'O una P bifásica en V1 con parte inicial alta (> 1,5 mm) y parte terminal profunda y ancha (≥ 1 mm y ≥ 40 ms).',
      ),
      l(
        '考虑双侧负荷：二尖瓣合并三尖瓣病变、先天性心脏病、心肌病。',
        'Think of combined loads: mitral plus tricuspid disease, congenital heart disease, cardiomyopathy.',
        'Piensa en sobrecargas combinadas: valvulopatía mitral y tricuspídea, cardiopatía congénita, miocardiopatía.',
      ),
    ],
    criteria: [
      {
        label: l('Ⅱ导联', 'Lead II', 'Derivación II'),
        value: l('P波>2.5 mm且≥120 ms', 'P > 2.5 mm and ≥ 120 ms', 'P > 2,5 mm y ≥ 120 ms'),
        source: 'Hancock 2009 (AHA/ACCF/HRS Part V)',
      },
      {
        label: l('V1导联', 'Lead V1', 'Derivación V1'),
        value: l('起始正向>1.5 mm且终末负向≥1 mm、≥40 ms', 'Initial positive > 1.5 mm and terminal negative ≥ 1 mm deep, ≥ 40 ms', 'Inicial positiva > 1,5 mm y terminal negativa ≥ 1 mm de profundidad y ≥ 40 ms'),
        source: 'Hancock 2009 (AHA/ACCF/HRS Part V)',
      },
      {
        label: l('肢体与胸导联混合', 'Mixed limb / precordial signs', 'Signos mixtos de miembros y precordiales'),
        value: l(
          '肢体导联高P（>2.5 mm）伴V1左心房型终末负向；或肢体导联宽切迹P（≥120 ms）伴V1起始部高',
          'Tall limb-lead P (> 2.5 mm) with left-atrial-type terminal negativity in V1, or a broad notched limb-lead P (≥ 120 ms) with a tall initial P in V1',
          'P alta en miembros (> 2,5 mm) con negatividad terminal de tipo izquierdo en V1, o P ancha y mellada en miembros (≥ 120 ms) con P inicial alta en V1',
        ),
        source: 'Hancock 2009; Chou 2008',
      },
    ],
    mechanism: l(
      '右心房增大或负荷过重使P波前部电力增强，左心房增大或负荷过重则使P波后部延长、加深。由于两心房依次激动，两种改变可出现在同一个P波上：前者表现为振幅增高，后者表现为时限增宽。',
      'A large or overloaded right atrium strengthens the early P forces, while a large or overloaded left atrium prolongs and deepens the late ones. Because the two atria are activated in sequence, both changes can appear in the same P wave, the first in its height and the second in its width.',
      'Una aurícula derecha grande o sobrecargada refuerza las fuerzas iniciales de la P, mientras que una izquierda grande o sobrecargada prolonga y profundiza las finales. Como ambas aurículas se activan en secuencia, los dos cambios pueden verse en la misma onda P, el primero en su altura y el segundo en su anchura.',
    ),
    mimics: [
      {
        id: 'lae',
        discriminator: l('单纯左心房异常的P波起始部高度正常。', 'Left atrial abnormality alone has a normal initial P height.', 'La anomalía auricular izquierda aislada tiene una altura inicial de la P normal.'),
        leads: ['II', 'V1'],
      },
      {
        id: 'rae',
        discriminator: l(
          '单纯右心房异常P波<120 ms，V1无深的终末负向部分。',
          'Right atrial abnormality alone keeps the P shorter than 120 ms without a deep terminal V1 part.',
          'La anomalía auricular derecha aislada mantiene la P por debajo de 120 ms y sin parte terminal profunda en V1.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'interatrial-block',
        discriminator: l('房间传导阻滞使P波增宽但不增高。', 'Interatrial block widens the P without making it tall.', 'El bloqueo interauricular ensancha la P sin hacerla alta.'),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l(
        '发现一种心房征象就停止：始终同时检查高度（Ⅱ、V1起始部）和宽度（Ⅱ、V1终末部）。',
        'Stopping after the first atrial sign: always check both height (II, initial V1) and width (II, terminal V1).',
        'Detenerse en el primer signo auricular: comprueba siempre altura (II, V1 inicial) y anchura (II, V1 terminal).',
      ),
      l('在双倍增益下过度解读电压。', 'Over-reading voltage at double gain.', 'Sobreinterpretar el voltaje con ganancia doble.'),
    ],
    lessons: ['h1'],
    sources: [REF.hancock2009, REF.chou2008],
    aka: ['BAE', 'BAA', 'biatrial enlargement', 'anomalía biauricular', '双房异常'],
    exemplar: { scenarios: ['biatrial-abnormality'], leads: ['II', 'V1'] },
  },

  // ── LVH ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'lvh',
    definition: l(
      '根据QRS电压增高（经验证的电压标准）并常伴支持性征象，推断左心室心肌质量增加。',
      'Increased left ventricular mass inferred from increased QRS voltage (validated voltage criteria), often with supporting signs.',
      'Aumento de la masa ventricular izquierda deducido de un voltaje del QRS aumentado (criterios de voltaje validados), a menudo con signos de apoyo.',
    ),
    features: [
      l(
        '先核对定标：所有导联为10 mm/mV，或对胸导联半增益进行校正。',
        'Check calibration first: full gain (10 mm/mV) on all leads, or correct for half-gain chest leads.',
        'Comprueba primero la calibración: ganancia completa (10 mm/mV) en todas las derivaciones o corrige la media ganancia de las precordiales.',
      ),
      l('Sokolow–Lyon：V1的S + V5或V6中较高的R >35 mm。', 'Sokolow–Lyon: S in V1 + the taller R in V5 or V6 > 35 mm.', 'Sokolow-Lyon: S en V1 + la R más alta de V5 o V6 > 35 mm.'),
      l(
        'Cornell：aVL的R + V3的S，男性>28 mm、女性>20 mm；aVL的R≥11 mm单独也可。',
        'Cornell: R in aVL + S in V3 > 28 mm (men) or > 20 mm (women); R in aVL ≥ 11 mm alone also counts.',
        'Cornell: R en aVL + S en V3 > 28 mm (varones) o > 20 mm (mujeres); R en aVL ≥ 11 mm por sí sola también cuenta.',
      ),
      l(
        '支持征象：左心房异常、V5–V6 R峰时间≥50 ms、继发性ST-T改变（此时报告“左心室肥厚伴继发性ST-T改变”）。',
        'Supporting signs: left atrial abnormality, R-wave peak time ≥ 50 ms in V5–V6, secondary ST–T changes (then report “LVH with secondary ST–T abnormalities”).',
        'Signos de apoyo: anomalía auricular izquierda, tiempo de pico de la R ≥ 50 ms en V5–V6, alteraciones secundarias del ST-T (entonces informa «HVI con alteraciones secundarias del ST-T»).',
      ),
    ],
    criteria: [
      {
        label: l('Sokolow–Lyon', 'Sokolow–Lyon', 'Sokolow-Lyon'),
        value: l('S V1 + R V5或V6 >35 mm（≥3.5 mV）', 'S V1 + R V5 or V6 > 35 mm (≥ 3.5 mV)', 'S V1 + R V5 o V6 > 35 mm (≥ 3,5 mV)'),
        source: 'Sokolow 1949; ESC 2024 hypertension guidelines',
      },
      {
        label: l('Cornell电压', 'Cornell voltage', 'Voltaje de Cornell'),
        value: l('R aVL + S V3：男性>28 mm，女性>20 mm', 'R aVL + S V3 > 28 mm men, > 20 mm women', 'R aVL + S V3 > 28 mm en varones, > 20 mm en mujeres'),
        source: 'Casale 1985; ESC 2024 hypertension guidelines',
      },
      {
        label: l('aVL导联R波', 'R in aVL', 'R en aVL'),
        value: l('≥11 mm', '≥ 11 mm', '≥ 11 mm'),
        source: 'Hancock 2009; ESC 2024 hypertension guidelines',
      },
      {
        label: l('Peguero–Lo Presti', 'Peguero–Lo Presti', 'Peguero-Lo Presti'),
        value: l('任一导联最深S + V4的S：男性≥28 mm，女性≥23 mm', 'Deepest S in any lead + S in V4 ≥ 28 mm men, ≥ 23 mm women', 'S más profunda en cualquier derivación + S en V4 ≥ 28 mm en varones, ≥ 23 mm en mujeres'),
        source: 'Peguero 2017',
      },
      {
        label: l('Romhilt–Estes积分', 'Romhilt–Estes score', 'Puntuación de Romhilt-Estes'),
        value: l('≥5分为左心室肥厚，4分为可能', '≥ 5 points = LVH; 4 = probable', '≥ 5 puntos = HVI; 4 = probable'),
        source: 'Romhilt 1968',
      },
      {
        label: l('准确性', 'Accuracy', 'Exactitud'),
        value: l('经典电压标准敏感性约10–25%，特异性85–99%', 'Classic voltage criteria: sensitivity about 10–25 %, specificity 85–99 %', 'Criterios clásicos de voltaje: sensibilidad de un 10–25 %, especificidad del 85–99 %'),
        source: 'Pewsner 2007 (systematic review)',
      },
    ],
    mechanism: l(
      '左心室壁增厚产生更大的向左、向后的除极电力，因此面向左心室的导联（V5、V6、Ⅰ、aVL）R波增高，右胸导联（V1–V3）S波加深。电压还受胸壁、年龄、性别和体型影响，所以这些标准特异性高而敏感性低。',
      'A thicker left ventricular wall generates larger depolarization forces directed left and posterior, so leads facing the left ventricle (V5, V6, I, aVL) record taller R waves and the right precordial leads (V1–V3) deeper S waves. Voltage also depends on chest wall, age, sex and build, which is why the criteria are specific but insensitive.',
      'Una pared ventricular izquierda más gruesa genera mayores fuerzas de despolarización dirigidas a la izquierda y hacia atrás, de modo que las derivaciones que miran al ventrículo izquierdo (V5, V6, I, aVL) registran ondas R más altas y las precordiales derechas (V1–V3) ondas S más profundas. El voltaje depende también de la pared torácica, la edad, el sexo y la constitución, por eso los criterios son específicos pero poco sensibles.',
    ),
    mimics: [
      {
        id: 'athlete-changes',
        discriminator: l(
          '年轻运动员单纯电压达标而无ST-T改变、Q波或心房异常属训练生理效应；电压伴继发性ST-T改变则不是。',
          'In young athletes isolated voltage criteria without ST–T change, Q waves or atrial abnormality are a normal training effect; voltage with secondary ST–T changes is not.',
          'En deportistas jóvenes, los criterios de voltaje aislados sin cambios del ST-T, ondas Q ni anomalía auricular son un efecto normal del entrenamiento; el voltaje con alteraciones secundarias del ST-T no lo es.',
        ),
        leads: ['V1', 'V5', 'V6'],
      },
      {
        id: 'lvh-strain',
        discriminator: l(
          '此处ST段和T波正常；伴继发性ST-T改变时Ⅰ、aVL、V5–V6出现下斜型ST段压低和不对称T波倒置。',
          'Here ST and T are normal; with secondary ST–T abnormalities there is downsloping ST depression and asymmetric T inversion in I, aVL and V5–V6.',
          'Aquí el ST y la T son normales; con alteraciones secundarias del ST-T aparece descenso descendente del ST e inversión asimétrica de la T en I, aVL y V5–V6.',
        ),
        leads: ['I', 'aVL', 'V5', 'V6'],
      },
      {
        id: 'hcm',
        discriminator: l(
          '肥厚型心肌病常在年轻患者中出现下壁或侧壁深而窄的Q波及明显复极异常——应做超声心动图。',
          'Hypertrophic cardiomyopathy often adds deep, narrow Q waves in inferior or lateral leads and marked repolarization changes in a young patient — get an echo.',
          'La miocardiopatía hipertrófica suele añadir ondas Q profundas y estrechas en derivaciones inferiores o laterales y alteraciones marcadas de la repolarización en un paciente joven: pide una ecocardiografía.',
        ),
        leads: ['II', 'III', 'aVF', 'V5', 'V6'],
      },
      {
        id: 'lbbb',
        discriminator: l(
          'QRS≥120 ms呈左束支传导阻滞图形时电压标准无效，先读传导阻滞。',
          'With QRS ≥ 120 ms and an LBBB pattern the voltage criteria are not valid; read the conduction block first.',
          'Con QRS ≥ 120 ms y patrón de bloqueo de rama izquierda los criterios de voltaje no son válidos; interpreta primero el bloqueo.',
        ),
        leads: ['V1', 'V6'],
      },
    ],
    pitfalls: [
      l(
        '半增益未校正就套用电压标准，或用于高电压常见的瘦高年轻男性。',
        'Applying voltage criteria at half gain without correcting, or to thin young men in whom high voltage is common.',
        'Aplicar los criterios de voltaje con media ganancia sin corregir, o a varones jóvenes delgados, en quienes el voltaje alto es frecuente.',
      ),
      l(
        '在左束支传导阻滞、预激或心室起搏时使用电压标准。',
        'Using voltage criteria in LBBB, pre-excitation or ventricular pacing.',
        'Usar criterios de voltaje en el bloqueo de rama izquierda, la preexcitación o la estimulación ventricular.',
      ),
      l(
        '心电图正常就认为“无左心室肥厚”：心电图漏诊大多数左心室肥厚，心肌质量需超声测量。',
        'Concluding “no LVH” from a normal ECG: the ECG misses most LVH; echo measures mass.',
        'Concluir «no hay HVI» por un ECG normal: el ECG no detecta la mayoría de las HVI; la masa la mide la ecocardiografía.',
      ),
    ],
    lessons: ['h2'],
    sources: [REF.hancock2009, REF.sokolow1949, REF.casale1985, REF.peguero2017, REF.romhilt1968, REF.pewsner2007, REF.escHtn2024, REF.sharma2017],
    aka: ['LVH', 'HVI', 'Sokolow', 'Cornell', 'Peguero', '左室肥厚'],
    exemplar: { scenarios: ['lvh'], leads: ['aVL', 'V1', 'V3', 'V5', 'V6'] },
  },

  // ── LVH with secondary ST–T abnormalities ────────────────────────────────────────────────────────────────────────
  {
    id: 'lvh-strain',
    definition: l(
      '左心室肥厚电压伴继发性ST-T改变：左侧导联出现与高R波方向相反的下斜型ST段压低和不对称T波倒置。',
      'LVH voltage with secondary ST–T abnormalities: downsloping ST depression and asymmetric T inversion opposite the tall R waves in the left-sided leads.',
      'Voltaje de HVI con alteraciones secundarias del ST-T: descenso descendente del ST e inversión asimétrica de la T, opuestos a las R altas, en las derivaciones izquierdas.',
    ),
    features: [
      l('先确定左心室肥厚电压（Sokolow–Lyon、Cornell或Peguero）。', 'First establish LVH voltage (Sokolow–Lyon, Cornell or Peguero).', 'Establece primero el voltaje de HVI (Sokolow-Lyon, Cornell o Peguero).'),
      l(
        'Ⅰ、aVL、V5–V6：ST段下斜压低并延续为缓降快升的不对称倒置T波。',
        'In I, aVL and V5–V6: ST depression sloping down into an asymmetric T inversion (slow descent, fast return).',
        'En I, aVL y V5–V6: descenso del ST que baja hacia una T negativa asimétrica (descenso lento, retorno rápido).',
      ),
      l(
        'V1–V3呈镜像：轻度ST段抬高、T波直立，与深S波成比例。',
        'Mirror image in V1–V3: mild ST elevation with upright T, proportional to the deep S.',
        'Imagen especular en V1–V3: ligera elevación del ST con T positiva, proporcional a la S profunda.',
      ),
      l(
        '常伴左心房异常、V5–V6 R峰时间≥50 ms及QRS轻度增宽（100–115 ms）。',
        'Often with left atrial abnormality, R-wave peak time ≥ 50 ms in V5–V6 and a slightly wide QRS (100–115 ms).',
        'A menudo con anomalía auricular izquierda, tiempo de pico de la R ≥ 50 ms en V5–V6 y un QRS algo ancho (100–115 ms).',
      ),
    ],
    criteria: [
      {
        label: l('电压', 'Voltage', 'Voltaje'),
        value: l('任一经验证的左心室肥厚电压标准（Sokolow–Lyon>35 mm；Cornell>28/20 mm）', 'Any validated LVH voltage criterion (Sokolow–Lyon > 35 mm; Cornell > 28/20 mm)', 'Cualquier criterio de voltaje de HVI validado (Sokolow-Lyon > 35 mm; Cornell > 28/20 mm)'),
        source: 'Hancock 2009; ESC 2024 hypertension guidelines',
      },
      {
        label: l('ST-T', 'ST–T', 'ST-T'),
        value: l(
          '以R波为主的导联（Ⅰ、aVL、V5–V6）下斜或水平型ST段压低伴不对称T波倒置',
          'Downsloping or horizontal ST depression with asymmetric T inversion in leads with dominant R (I, aVL, V5–V6)',
          'Descenso del ST descendente u horizontal con T negativa asimétrica en derivaciones con R dominante (I, aVL, V5–V6)',
        ),
        source: 'Hancock 2009 (AHA/ACCF/HRS Part V)',
      },
      {
        label: l('Romhilt–Estes计分', 'Romhilt–Estes points', 'Puntos de Romhilt-Estes'),
        value: l('典型ST-T与QRS反向：未用洋地黄3分，用洋地黄1分', 'Typical ST–T opposite the QRS: 3 points without digitalis, 1 with digitalis', 'ST-T típico opuesto al QRS: 3 puntos sin digital, 1 con digital'),
        source: 'Romhilt 1968',
      },
      {
        label: l('预后', 'Prognosis', 'Pronóstico'),
        value: l('心血管风险高于单纯电压增高', 'Higher cardiovascular risk than voltage alone', 'Mayor riesgo cardiovascular que el voltaje aislado'),
        source: 'Okin 2004 (LIFE)',
      },
    ],
    mechanism: l(
      '肥厚的左心室除极时间延长，心内膜下最后复极，复极向量因而反转，背离高R波导联。因此这些ST-T改变继发于异常除极和室壁应力，并非冠脉闭塞的直接征象。',
      'In a hypertrophied left ventricle depolarization lasts longer and the inner layer is the last to recover, so the repolarization vector reverses and points away from the leads with tall R waves. These ST–T changes are therefore secondary to abnormal depolarization and wall stress, not a direct sign of coronary occlusion.',
      'En un ventrículo izquierdo hipertrofiado la despolarización dura más y la capa interna es la última en recuperarse, de modo que el vector de repolarización se invierte y se aleja de las derivaciones con R altas. Estas alteraciones del ST-T son, por tanto, secundarias a la despolarización anómala y al estrés parietal, no un signo directo de oclusión coronaria.',
    ),
    mimics: [
      {
        id: 'st-depression-ischemic',
        discriminator: l(
          '此处ST-T与高R波反向、不对称且稳定；缺血性ST段压低多呈水平型，可见于无高R波的导联，随症状变化，且不能用电压解释。',
          'Here the ST–T is opposite a tall R, asymmetric and stable; ischaemic ST depression is often horizontal, appears in leads without tall R, changes with symptoms and is not explained by voltage.',
          'Aquí el ST-T se opone a una R alta, es asimétrico y estable; el descenso isquémico del ST suele ser horizontal, aparece en derivaciones sin R alta, cambia con los síntomas y no se explica por el voltaje.',
        ),
        leads: ['V4', 'V5', 'V6'],
      },
      {
        id: 'digoxin-effect',
        discriminator: l(
          '洋地黄效应为“鱼钩样”下垂ST段伴QT缩短，且无电压标准；左心室肥厚的继发性ST-T呈直线下斜进入倒置T波。',
          'Digoxin gives a scooped, sagging ST with a short QT and no voltage criteria; the secondary ST–T of LVH slopes straight down into an inverted T.',
          'La digoxina produce un ST cóncavo («en cubeta») con QT corto y sin criterios de voltaje; el ST-T secundario de la HVI desciende en línea recta hacia una T negativa.',
        ),
        leads: ['V5', 'V6'],
      },
      {
        id: 'stemi-anterior',
        discriminator: l(
          '左心室肥厚在V1–V3产生与深S波成比例的ST段抬高；抬高与S波不成比例或较既往新出现，须按可能闭塞处理。',
          'LVH produces ST elevation in V1–V3 proportional to the deep S wave; elevation out of proportion to the S, or new compared with a prior ECG, must be treated as possible occlusion.',
          'La HVI produce en V1–V3 una elevación del ST proporcional a la S profunda; una elevación desproporcionada respecto a la S, o nueva frente a un ECG previo, debe tratarse como posible oclusión.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
      {
        id: 'apical-hcm',
        discriminator: l(
          '心尖肥厚型心肌病T波巨大（≥10 mm）、对称倒置，以V3–V5最深；左心室肥厚的继发性改变不对称，以V5–V6、Ⅰ、aVL最明显。',
          'Apical HCM gives giant (≥ 10 mm), symmetric T inversion maximal in V3–V5; the secondary change of LVH is asymmetric and maximal in V5–V6, I and aVL.',
          'La miocardiopatía hipertrófica apical produce T negativas gigantes (≥ 10 mm) y simétricas, máximas en V3–V5; la alteración secundaria de la HVI es asimétrica y máxima en V5–V6, I y aVL.',
        ),
        leads: ['V3', 'V4', 'V5'],
      },
    ],
    pitfalls: [
      l(
        '把左心室肥厚的前壁ST段抬高当作STEMI——或把真正的闭塞当作“只是肥厚”；与既往心电图比较并看是否成比例。',
        'Calling the anterior ST elevation of LVH a STEMI — or dismissing a real occlusion as “just LVH”; compare with a prior ECG and look for proportionality.',
        'Llamar IAMCEST a la elevación anterior del ST de la HVI, o descartar una oclusión real como «solo HVI»: compara con un ECG previo y valora la proporcionalidad.',
      ),
      l(
        '从ST-T推断负荷类型（压力或容量）：心电图无法区分，统称“左心室肥厚伴继发性ST-T改变”。',
        'Inferring the type of load (pressure or volume) from the ST–T: the ECG cannot tell; report LVH with secondary ST–T abnormalities.',
        'Deducir el tipo de sobrecarga (de presión o de volumen) a partir del ST-T: el ECG no lo distingue; informa HVI con alteraciones secundarias del ST-T.',
      ),
      l(
        '在左心室肥厚患者中不核对电压就把所有侧壁ST段压低都当作缺血。',
        'Reading every lateral ST depression as ischaemia in a patient with LVH without checking the voltage.',
        'Interpretar como isquemia todo descenso lateral del ST en un paciente con HVI sin comprobar el voltaje.',
      ),
    ],
    lessons: ['h2', 'i10'],
    sources: [REF.hancock2009, REF.romhilt1968, REF.okin2004, REF.escHtn2024, REF.udmi2018],
    aka: ['LVH strain', 'strain', 'HVI con sobrecarga', '左室肥厚伴劳损', '劳损'],
    exemplar: { scenarios: ['lvh-strain'], leads: ['I', 'aVL', 'V5', 'V6'] },
  },

  // ── RVH ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'rvh',
    definition: l(
      '根据电轴右偏及向前、向右的电力占优势（V1高R波、V5–V6深S波）推断右心室心肌质量增加。',
      'Increased right ventricular mass inferred from a rightward axis and dominant anterior and rightward forces (tall R in V1, deep S in V5–V6).',
      'Aumento de la masa ventricular derecha deducido de un eje derecho y de fuerzas anteriores y derechas dominantes (R alta en V1, S profunda en V5–V6).',
    ),
    features: [
      l('电轴右偏（成人≥+110°）。', 'Right axis deviation (≥ +110° in adults).', 'Desviación del eje a la derecha (≥ +110° en adultos).'),
      l(
        'V1：R≥7 mm，R/S>1，S小（<2 mm）或呈qR（最特异）。',
        'V1: R ≥ 7 mm, R/S > 1, small S (< 2 mm) or a qR complex (the most specific sign).',
        'V1: R ≥ 7 mm, R/S > 1, S pequeña (< 2 mm) o complejo qR (el signo más específico).',
      ),
      l('V5–V6：S波深（≥7 mm），R/S≤1。', 'V5–V6: deep S (≥ 7 mm) with R/S ≤ 1.', 'V5–V6: S profunda (≥ 7 mm) con R/S ≤ 1.'),
      l(
        '常伴右心房异常及V1–V3继发性ST-T改变（T波倒置）。',
        'Often right atrial abnormality and secondary ST–T changes (T inversion) in V1–V3.',
        'A menudo anomalía auricular derecha y alteraciones secundarias del ST-T (T negativa) en V1–V3.',
      ),
    ],
    criteria: [
      {
        label: l('电轴', 'Axis', 'Eje'),
        value: l('≥+110°（成人）', '≥ +110° (adult)', '≥ +110° (adulto)'),
        source: 'Hancock 2009 (AHA/ACCF/HRS Part V)',
      },
      {
        label: l('V1', 'V1', 'V1'),
        value: l('R≥7 mm；R/S>1；S<2 mm；qR（最特异）', 'R ≥ 7 mm; R/S > 1; S < 2 mm; qR (most specific)', 'R ≥ 7 mm; R/S > 1; S < 2 mm; qR (la más específica)'),
        source: 'Hancock 2009 (AHA/ACCF/HRS Part V)',
      },
      {
        label: l('V5–V6', 'V5–V6', 'V5–V6'),
        value: l('S≥7 mm；R/S≤1', 'S ≥ 7 mm; R/S ≤ 1', 'S ≥ 7 mm; R/S ≤ 1'),
        source: 'Hancock 2009 (AHA/ACCF/HRS Part V)',
      },
      {
        label: l('组合', 'Combined', 'Combinado'),
        value: l('R V1 + S V5或V6 >10.5 mm', 'R V1 + S V5 or V6 > 10.5 mm', 'R V1 + S V5 o V6 > 10,5 mm'),
        source: 'Hancock 2009 (AHA/ACCF/HRS Part V)',
      },
      {
        label: l('V1 R峰时间', 'R-wave peak time in V1', 'Tiempo de pico de la R en V1'),
        value: l('≥35 ms', '≥ 35 ms', '≥ 35 ms'),
        source: 'Hancock 2009; Surawicz 2009',
      },
    ],
    mechanism: l(
      '正常时右心室电力被厚得多的左心室掩盖，只有显著肥厚才能使电力平衡转向右前方。这一转变使V1由rS变为R或qR，并使额面电轴右偏。',
      'The right ventricle is normally hidden electrically by the much thicker left ventricle, so only marked hypertrophy shifts the balance of forces rightward and anteriorly. That shift turns the V1 complex from rS into R or qR and moves the frontal axis to the right.',
      'En condiciones normales el ventrículo derecho queda eléctricamente oculto por el izquierdo, mucho más grueso, así que solo una hipertrofia marcada desplaza el balance de fuerzas hacia la derecha y adelante. Ese desplazamiento convierte el complejo de V1 de rS en R o qR y lleva el eje frontal a la derecha.',
    ),
    mimics: [
      {
        id: 'rbbb',
        discriminator: l(
          '右束支传导阻滞QRS≥120 ms，V1呈rSR′，Ⅰ和V6 S波宽；右心室肥厚QRS仍窄。',
          'In RBBB the QRS is ≥ 120 ms with rSR′ in V1 and a broad S in I and V6; RVH keeps a narrow QRS.',
          'En el bloqueo de rama derecha el QRS mide ≥ 120 ms, con rSR′ en V1 y S ancha en I y V6; la HVD mantiene un QRS estrecho.',
        ),
        leads: ['V1', 'I', 'V6'],
      },
      {
        id: 'stemi-posterior',
        discriminator: l(
          '胸痛时V1高R伴V1–V3水平型ST段压低、T波直立提示后壁闭塞（加做V7–V9）；右心室肥厚为电轴右偏伴V1–V3 T波倒置。',
          'A tall R in V1 with horizontal ST depression and upright T in V1–V3 during chest pain suggests posterior occlusion (record V7–V9); RVH has a right axis and T inversion in V1–V3.',
          'Una R alta en V1 con descenso horizontal del ST y T positiva en V1–V3 durante dolor torácico sugiere oclusión posterior (registra V7–V9); la HVD tiene eje derecho y T negativa en V1–V3.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
      {
        id: 'wpw',
        discriminator: l(
          '左侧旁路预激也使V1出现高R，但PR<120 ms且有δ波。',
          'Pre-excitation through a left-sided pathway also gives a tall R in V1, but with PR < 120 ms and a delta wave.',
          'La preexcitación por una vía izquierda también da R alta en V1, pero con PR < 120 ms y onda delta.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'dextrocardia',
        discriminator: l(
          '右位心时Ⅰ导联P、QRS、T全部倒置，R波自V1至V6逐渐减小。',
          'In dextrocardia lead I is fully inverted (P, QRS and T) and R shrinks from V1 to V6.',
          'En la dextrocardia la derivación I está totalmente invertida (P, QRS y T) y la R disminuye de V1 a V6.',
        ),
        leads: ['I', 'V1', 'V6'],
      },
    ],
    pitfalls: [
      l(
        '仅凭V1高R诊断右心室肥厚，而未排除右束支传导阻滞、后壁梗死、预激、肥厚型心肌病和电极位置错误。',
        'Calling RVH from a tall R in V1 without excluding RBBB, posterior MI, pre-excitation, HCM and lead misplacement.',
        'Diagnosticar HVD por una R alta en V1 sin descartar bloqueo de rama derecha, infarto posterior, preexcitación, miocardiopatía hipertrófica y mala colocación de electrodos.',
      ),
      l(
        '把成人标准用于婴幼儿：右心室优势在婴儿期属正常。',
        'Applying adult criteria to infants and children, in whom right ventricular dominance is normal.',
        'Aplicar criterios de adulto a lactantes y niños, en quienes el predominio del ventrículo derecho es normal.',
      ),
      l(
        '指望心电图排除肺动脉高压：其敏感性低。',
        'Expecting the ECG to exclude pulmonary hypertension: its sensitivity is low.',
        'Esperar que el ECG descarte la hipertensión pulmonar: su sensibilidad es baja.',
      ),
    ],
    lessons: ['h3'],
    sources: [REF.hancock2009, REF.surawicz2009, REF.escPh2022, REF.chou2008],
    aka: ['RVH', 'HVD', '右室肥厚'],
    exemplar: { scenarios: ['rvh'], leads: ['I', 'V1', 'V5', 'V6'] },
  },

  // ── biventricular hypertrophy ────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'biventricular-hypertrophy',
    definition: l(
      '同一份心电图同时有左心室肥厚和右心室肥厚的表现。',
      'Signs of left and right ventricular hypertrophy on the same ECG.',
      'Signos de hipertrofia ventricular izquierda y derecha en el mismo ECG.',
    ),
    features: [
      l('左心室肥厚电压标准合并电轴右偏（>+90°）。', 'LVH voltage criteria together with right axis deviation (> +90°).', 'Criterios de voltaje de HVI junto con desviación del eje a la derecha (> +90°).'),
      l('或左心室肥厚电压伴V1–V2高R或V5–V6深S。', 'Or LVH voltage with a tall R in V1–V2 or a deep S in V5–V6.', 'O voltaje de HVI con R alta en V1–V2 o S profunda en V5–V6.'),
      l(
        '或V2–V4出现巨大双向RS波（Katz–Wachtel），主要见于先天性心脏病患儿。',
        'Or large equiphasic RS complexes in V2–V4 (Katz–Wachtel), mainly in children with congenital heart disease.',
        'O complejos RS grandes e isodifásicos en V2–V4 (Katz-Wachtel), sobre todo en niños con cardiopatía congénita.',
      ),
      l('左心房异常伴右心室肥厚征象也应怀疑。', 'Left atrial abnormality with RVH signs also raises suspicion.', 'La anomalía auricular izquierda con signos de HVD también hace sospecharla.'),
    ],
    criteria: [
      {
        label: l('左心室肥厚 + 电轴右偏', 'LVH + right axis', 'HVI + eje derecho'),
        value: l('左心室肥厚电压伴电轴>+90°', 'LVH voltage with axis > +90°', 'Voltaje de HVI con eje > +90°'),
        source: 'Hancock 2009 (AHA/ACCF/HRS Part V)',
      },
      {
        label: l('Katz–Wachtel', 'Katz–Wachtel', 'Katz-Wachtel'),
        value: l('V2–V4中R + S ≥50–60 mm（儿童）', 'R + S ≥ 50–60 mm in V2–V4 (children)', 'R + S ≥ 50–60 mm en V2–V4 (niños)'),
        source: 'Katz 1937; Hancock 2009',
      },
      {
        label: l('左心房异常 + 右心室肥厚', 'LAA + RVH', 'Anomalía auricular izquierda + HVD'),
        value: l('左心房异常伴任一右心室肥厚征象', 'Left atrial abnormality with any RVH sign', 'Anomalía auricular izquierda con cualquier signo de HVD'),
        source: 'Hancock 2009 (AHA/ACCF/HRS Part V)',
      },
    ],
    mechanism: l(
      '两侧心室均肥厚时，右心室增加的电力与左心室增加的电力方向相反而部分抵消。因此心电图常只表现其中之一，或呈混合图形，如左侧高电压伴电轴右偏。',
      'When both ventricles are thick their extra forces partly cancel, because the added right ventricular force points opposite the added left ventricular force. The ECG therefore often shows only one of the two, or a mixture such as left-sided voltage with a rightward axis.',
      'Cuando ambos ventrículos están engrosados sus fuerzas adicionales se anulan en parte, porque la fuerza añadida del ventrículo derecho se opone a la del izquierdo. Por eso el ECG a menudo muestra solo una de las dos o una mezcla, como voltaje izquierdo con eje derecho.',
    ),
    mimics: [
      {
        id: 'lvh',
        discriminator: l('单纯左心室肥厚电轴正常或左偏，V1呈rS。', 'LVH alone keeps a normal or leftward axis and an rS in V1.', 'La HVI aislada mantiene un eje normal o izquierdo y rS en V1.'),
        leads: ['I', 'aVF', 'V1'],
      },
      {
        id: 'rvh',
        discriminator: l('单纯右心室肥厚无左侧电压标准。', 'RVH alone lacks left-sided voltage criteria.', 'La HVD aislada no cumple criterios de voltaje izquierdo.'),
        leads: ['V1', 'V5', 'V6'],
      },
    ],
    pitfalls: [
      l(
        '敏感性低：相互抵消可掩盖一侧或两侧心室，需超声心动图判断。',
        'Low sensitivity: cancellation hides one or both ventricles, so echo decides.',
        'Baja sensibilidad: la cancelación oculta uno o ambos ventrículos, así que decide la ecocardiografía.',
      ),
      l(
        '把瘦高年轻人胸前中部导联的大双向波称为双心室肥厚。',
        'Calling the large biphasic mid-precordial complexes of a thin young adult biventricular hypertrophy.',
        'Llamar hipertrofia biventricular a los complejos bifásicos grandes de las precordiales medias de un adulto joven delgado.',
      ),
    ],
    lessons: ['h2', 'h3'],
    sources: [REF.hancock2009, REF.katz1937],
    aka: ['BVH', 'Katz-Wachtel', 'hipertrofia biventricular', '双室肥厚'],
    exemplar: { scenarios: ['biventricular-hypertrophy'] },
  },

  // ── low voltage ──────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'low-voltage',
    definition: l(
      'QRS振幅减低：所有肢体导联峰-峰值<5 mm，和/或所有胸导联<10 mm。',
      'Small QRS complexes: peak-to-peak amplitude < 5 mm in every limb lead and/or < 10 mm in every precordial lead.',
      'Complejos QRS pequeños: amplitud pico a pico < 5 mm en todas las derivaciones de los miembros y/o < 10 mm en todas las precordiales.',
    ),
    features: [
      l(
        '确认定标脉冲为10 mm（5 mm/mV设置会使所有波形减半）。',
        'Confirm the calibration pulse is 10 mm (a 5 mm/mV setting halves every complex).',
        'Confirma que el pulso de calibración mide 10 mm (con 5 mm/mV todos los complejos se reducen a la mitad).',
      ),
      l(
        '逐一测量肢体导联（均<5 mm）和胸导联（均<10 mm）QRS峰-峰值。',
        'Measure the peak-to-peak QRS in each limb lead (all < 5 mm) and each chest lead (all < 10 mm).',
        'Mide el QRS pico a pico en cada derivación de los miembros (todas < 5 mm) y en cada precordial (todas < 10 mm).',
      ),
      l(
        '寻找伴随表现：窦性心动过速和电交替（积液/心脏压塞）；假性梗死Q波和传导障碍（淀粉样变）；顺钟向转位（肺气肿）。',
        'Look for companions: sinus tachycardia and electrical alternans (effusion, tamponade); pseudo-infarct Q waves and conduction disease (amyloid); clockwise rotation (emphysema).',
        'Busca acompañantes: taquicardia sinusal y alternancia eléctrica (derrame, taponamiento); ondas Q de seudoinfarto y trastornos de conducción (amiloidosis); rotación horaria (enfisema).',
      ),
      l(
        '与既往心电图比较：新出现的低电压比长期低电压更有意义。',
        'Compare with prior ECGs: new low voltage matters more than lifelong low voltage.',
        'Compara con ECG previos: un bajo voltaje nuevo importa más que uno de siempre.',
      ),
    ],
    criteria: [
      {
        label: l('肢体导联', 'Limb leads', 'Derivaciones de los miembros'),
        value: l('所有导联QRS峰-峰值<5 mm（0.5 mV）', 'Peak-to-peak QRS < 5 mm (0.5 mV) in all', 'QRS pico a pico < 5 mm (0,5 mV) en todas'),
        source: 'Mason 2007 (AHA Part II); Hancock 2009',
      },
      {
        label: l('胸导联', 'Precordial leads', 'Derivaciones precordiales'),
        value: l('所有导联QRS峰-峰值<10 mm（1.0 mV）', 'Peak-to-peak QRS < 10 mm (1.0 mV) in all', 'QRS pico a pico < 10 mm (1,0 mV) en todas'),
        source: 'Mason 2007 (AHA Part II); Hancock 2009',
      },
      {
        label: l('淀粉样变警示', 'Amyloid red flag', 'Señal de alarma de amiloidosis'),
        value: l('影像学室壁增厚而心电图电压低或正常（电压-质量不匹配）', 'Low or normal voltage despite a thick LV wall on imaging (voltage–mass mismatch)', 'Voltaje bajo o normal pese a una pared del VI gruesa en la imagen (discordancia voltaje-masa)'),
        source: 'Garcia-Pavia 2021 (ESC position statement)',
      },
    ],
    mechanism: l(
      '当产生电流的心肌减少（浸润、梗死、纤维化），或心脏与电极之间的组织、液体或气体增多（积液、肥胖、肺气肿、水肿）时，QRS电压降低。因此同一表现可源于截然不同的原因，需要结合临床和超声心动图鉴别。',
      'QRS voltage falls when less myocardium generates current (infiltration, infarction, fibrosis) or when more tissue, fluid or air lies between the heart and the electrodes (effusion, obesity, emphysema, oedema). The same finding can therefore have very different causes, which the clinical picture and echo separate.',
      'El voltaje del QRS disminuye cuando hay menos miocardio que genera corriente (infiltración, infarto, fibrosis) o cuando hay más tejido, líquido o aire entre el corazón y los electrodos (derrame, obesidad, enfisema, edema). Por eso el mismo hallazgo puede tener causas muy distintas, que la clínica y la ecocardiografía separan.',
    ),
    mimics: [
      {
        id: 'pericardial-effusion',
        discriminator: l(
          '低电压伴窦性心动过速（±电交替）提示心包积液及可能的心脏压塞；肥胖者长期稳定的低电压则不然。',
          'Low voltage with sinus tachycardia (± electrical alternans) points to effusion and possible tamponade; stable lifelong low voltage in obesity does not.',
          'El bajo voltaje con taquicardia sinusal (± alternancia eléctrica) orienta a derrame y posible taponamiento; el bajo voltaje estable de siempre en la obesidad, no.',
        ),
        leads: ['II', 'V3'],
      },
      {
        id: 'copd-pattern',
        discriminator: l(
          '慢性阻塞性肺疾病的肢体导联低电压伴电轴垂直、右心房异常和胸导联移行延迟。',
          'In COPD low limb-lead voltage comes with a vertical axis, right atrial abnormality and late precordial transition.',
          'En la EPOC el bajo voltaje en miembros se acompaña de eje vertical, anomalía auricular derecha y transición precordial tardía.',
        ),
        leads: ['II', 'aVF', 'V5', 'V6'],
      },
      {
        id: 'electrical-alternans',
        discriminator: l('电交替在低电压基础上出现逐搏的QRS高度变化。', 'Alternans adds a beat-to-beat change in QRS height on top of the low voltage.', 'La alternancia añade un cambio latido a latido de la altura del QRS sobre el bajo voltaje.'),
        leads: ['II', 'V3', 'V4'],
      },
    ],
    pitfalls: [
      l('未发现5 mm/mV（半增益）设置而误判低电压。', 'Missing a 5 mm/mV (half-gain) setting and calling the ECG low-voltage.', 'No ver un ajuste de 5 mm/mV (media ganancia) y diagnosticar bajo voltaje.'),
      l(
        '不看心率和电交替就把低电压归因于“肥胖”。',
        'Putting low voltage down to “obesity” without looking for tachycardia and alternans.',
        'Atribuir el bajo voltaje a «obesidad» sin buscar taquicardia ni alternancia.',
      ),
      l(
        '漏诊淀粉样变：超声室壁厚而心电图低电压是警示而非安慰。',
        'Missing amyloidosis: low voltage with a thick wall on echo is a red flag, not a reassurance.',
        'Pasar por alto una amiloidosis: bajo voltaje con pared gruesa en la ecocardiografía es una alarma, no un alivio.',
      ),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '若为新出现，且伴窦性心动过速、低血压或电交替，立即行超声心动图寻找心包积液和心脏压塞。',
        'If it is new and comes with sinus tachycardia, hypotension or alternans, get an echocardiogram now to look for pericardial effusion and tamponade.',
        'Si es nuevo y se acompaña de taquicardia sinusal, hipotensión o alternancia, pide ya una ecocardiografía para buscar derrame pericárdico y taponamiento.',
      ),
    },
    lessons: ['h4', 'o7'],
    sources: [REF.mason2007, REF.hancock2009, REF.garciaPavia2021, REF.adler2015, REF.escPeri2025],
    aka: ['low voltage', 'bajo voltaje', '低电压'],
    exemplar: { scenarios: ['low-voltage'] },
  },

  // ── electrical alternans ─────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'electrical-alternans',
    definition: l(
      '节律规则时QRS振幅或电轴逐搏交替变化（有时P、T波也交替），典型见于大量心包积液时心脏摆动。',
      'Beat-to-beat alternation of QRS amplitude or axis (sometimes P and T too) with a regular rhythm, classically from a heart swinging in a large pericardial effusion.',
      'Alternancia latido a latido de la amplitud o del eje del QRS (a veces también de P y T) con ritmo regular, clásicamente por el balanceo del corazón en un derrame pericárdico grande.',
    ),
    features: [
      l('每隔一个QRS变高（或电轴改变），而RR间期保持规则。', 'Every other QRS is taller (or changes axis) while the RR interval stays regular.', 'Uno de cada dos QRS es más alto (o cambia de eje) mientras el RR se mantiene regular.'),
      l('在多个导联中寻找，胸导联常最明显。', 'Look in several leads; it is often clearest in the precordial leads.', 'Búscala en varias derivaciones; suele verse mejor en las precordiales.'),
      l('低电压、窦性心动过速和电交替三联征提示心脏压塞。', 'The triad of low voltage, sinus tachycardia and alternans suggests tamponade.', 'La tríada de bajo voltaje, taquicardia sinusal y alternancia sugiere taponamiento.'),
      l(
        '快速窄QRS心动过速时，电交替可仅由心率引起（折返性室上速）。',
        'During a fast narrow-complex tachycardia, alternans can come from the rate alone (re-entrant SVT).',
        'Durante una taquicardia rápida de QRS estrecho, la alternancia puede deberse solo a la frecuencia (TSV por reentrada).',
      ),
    ],
    criteria: [
      {
        label: l('电交替', 'Alternans', 'Alternancia'),
        value: l('节律规则下QRS高度或电轴每隔一搏规律交替', 'Regular alternation of QRS height or axis every second beat, with a regular rhythm', 'Alternancia regular de la altura o del eje del QRS cada dos latidos, con ritmo regular'),
        source: 'Adler 2015 (ESC pericardial diseases); ESC 2025',
      },
      {
        label: l('心脏压塞背景', 'Tamponade context', 'Contexto de taponamiento'),
        value: l('低电压 + 窦性心动过速 + 电交替', 'Low voltage + sinus tachycardia + alternans', 'Bajo voltaje + taquicardia sinusal + alternancia'),
        source: 'Adler 2015; ESC 2025',
      },
    ],
    mechanism: l(
      '大量心包积液时，心脏在充满液体的心包内来回摆动，频率常为心率的一半，因此心脏相对于电极的位置逐搏交替。心电活动本身未变，但其在各导联上的投影随每次摆动而增大或减小。',
      'In a large effusion the heart swings back and forth inside the fluid-filled sac, often at half the heart rate, so its position relative to the electrodes alternates from beat to beat. The electrical source is unchanged, but its projection on each lead grows and shrinks with each swing.',
      'En un derrame grande el corazón oscila dentro del saco lleno de líquido, a menudo a la mitad de la frecuencia cardiaca, de modo que su posición respecto a los electrodos alterna de un latido a otro. La fuente eléctrica no cambia, pero su proyección sobre cada derivación crece y disminuye con cada oscilación.',
    ),
    mimics: [
      {
        id: 'ventricular-bigeminy',
        discriminator: l(
          '二联律时每隔一搏提前出现且形态不同（常宽大）；电交替时各搏间距相等，仅大小或电轴交替。',
          'In bigeminy every second beat is premature and differently shaped (often wide); in alternans the beats are evenly spaced and only their size or axis alternates.',
          'En el bigeminismo uno de cada dos latidos es prematuro y de otra morfología (a menudo ancho); en la alternancia los latidos están equiespaciados y solo alterna su tamaño o su eje.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'baseline-wander',
        discriminator: l(
          '呼吸变异使振幅随呼吸周期在数搏内逐渐变化；电交替严格逐搏交替。',
          'Respiratory variation changes amplitude gradually over several beats with breathing; alternans flips strictly every other beat.',
          'La variación respiratoria cambia la amplitud de forma gradual a lo largo de varios latidos con la respiración; la alternancia cambia estrictamente cada dos latidos.',
        ),
        leads: ['II'],
      },
      {
        id: 'avrt',
        discriminator: l(
          '快速规则窄QRS心动过速中的电交替是心率效应，并非积液征象。',
          'Alternans during a fast regular narrow-complex tachycardia is a rate effect, not a sign of effusion.',
          'La alternancia durante una taquicardia rápida y regular de QRS estrecho es un efecto de la frecuencia, no un signo de derrame.',
        ),
        leads: ['II', 'V2'],
      },
    ],
    pitfalls: [
      l(
        '逐个导联阅读而漏掉电交替；应在节律条上比较相邻心搏。',
        'Missing alternans by reading one lead at a time; compare consecutive beats on the rhythm strip.',
        'Pasar por alto la alternancia al leer derivación por derivación; compara latidos consecutivos en la tira de ritmo.',
      ),
      l(
        '在气促、心动过速患者中忽视电交替：在超声排除之前按可能的心脏压塞处理。',
        'Dismissing alternans in a breathless, tachycardic patient: treat it as possible tamponade until echo says otherwise.',
        'Restar importancia a la alternancia en un paciente disneico y taquicárdico: trátala como posible taponamiento hasta que la ecocardiografía diga lo contrario.',
      ),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '伴低电压和心动过速时，在证实之前按心脏压塞处理：评估血压和颈静脉，立即行超声心动图。',
        'With low voltage and tachycardia, assume tamponade until proven otherwise: assess blood pressure and neck veins and get an echocardiogram immediately.',
        'Con bajo voltaje y taquicardia, supón un taponamiento mientras no se demuestre lo contrario: valora la presión arterial y las yugulares y pide una ecocardiografía de inmediato.',
      ),
    },
    lessons: ['h4', 'o7'],
    sources: [REF.adler2015, REF.escPeri2025, REF.mason2007],
    aka: ['alternans', 'swinging heart', 'alternancia eléctrica', '电交替'],
    exemplar: { scenarios: ['electrical-alternans'] },
  },

  // ── poor R-wave progression ──────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'poor-r-progression',
    definition: l(
      'V1–V4导联R波未能正常递增，V3导联R波≤3 mm，移行区后移。',
      'Failure of the R wave to grow normally across V1–V4, with R in V3 ≤ 3 mm and a late transition.',
      'La onda R no crece con normalidad de V1 a V4, con R en V3 ≤ 3 mm y una transición tardía.',
    ),
    features: [
      l('V3导联R≤3 mm，且V1→V3（或V4）R波不递增。', 'R in V3 ≤ 3 mm, and R not increasing from V1 to V3 (or V4).', 'R en V3 ≤ 3 mm y sin aumento de la R de V1 a V3 (o V4).'),
      l('移行区（R = S）位于V5或更后。', 'Transition (R = S) at V5 or beyond.', 'Transición (R = S) en V5 o más allá.'),
      l(
        '寻找原因：陈旧性前壁梗死（V1–V3 Q或QS）、左心室肥厚、左束支传导阻滞、慢性阻塞性肺疾病、胸导联过高或互换、正常变异。',
        'Look for the cause: old anterior MI (Q or QS in V1–V3), LVH, LBBB, COPD, high or swapped chest electrodes, normal variant.',
        'Busca la causa: infarto anterior antiguo (Q o QS en V1–V3), HVI, bloqueo de rama izquierda, EPOC, electrodos precordiales altos o intercambiados, variante normal.',
      ),
    ],
    criteria: [
      {
        label: l('定义', 'Definition', 'Definición'),
        value: l('V3导联R≤3 mm，V1–V3无递增', 'R in V3 ≤ 3 mm with no progressive growth V1–V3', 'R en V3 ≤ 3 mm sin crecimiento progresivo de V1 a V3'),
        source: 'MacKenzie 2005; Mason 2007 (AHA Part II)',
      },
      {
        label: l('正常递增', 'Normal progression', 'Progresión normal'),
        value: l('V1–V2呈rS，V3–V4附近呈RS，V5–V6呈qRs；移行区在V3–V4', 'rS in V1–V2, RS near V3–V4, qRs in V5–V6; transition at V3–V4', 'rS en V1–V2, RS hacia V3–V4, qRs en V5–V6; transición en V3–V4'),
        source: 'Kligfield 2007; Mason 2007',
      },
      {
        label: l('既往梗死的Q波等同表现', 'Q-wave equivalent of prior MI', 'Equivalente de onda Q de infarto previo'),
        value: l('V2–V3任何Q波>20 ms或QS', 'Any Q > 20 ms or QS complex in V2–V3', 'Cualquier Q > 20 ms o complejo QS en V2–V3'),
        source: 'UDMI 2018',
      },
    ],
    mechanism: l(
      '正常前壁导联R波来自室间隔和左心室前壁朝向V2–V4的电力。当这些电力丧失（瘢痕）、被抵消（左心室肥厚、心脏顺钟向转位）或在错误位置记录（电极过高）时，R波就保持低小。',
      'Normal anterior R waves come from the septum and the anterior left ventricular wall moving toward V2–V4. When those forces are lost (scar), outweighed (LVH, clockwise rotation) or recorded from the wrong place (electrodes too high), the R wave stays small.',
      'Las ondas R anteriores normales proceden del tabique y de la pared anterior del ventrículo izquierdo, que avanzan hacia V2–V4. Cuando esas fuerzas se pierden (cicatriz), quedan contrarrestadas (HVI, rotación horaria) o se registran desde un lugar equivocado (electrodos demasiado altos), la onda R sigue siendo pequeña.',
    ),
    mimics: [
      {
        id: 'old-mi-anterior',
        discriminator: l(
          '陈旧性前壁梗死出现Q或QS（V2–V3任何Q>20 ms）；单纯递增不良仍保留小r波起始。',
          'Old anterior MI gives Q or QS complexes (any Q > 20 ms in V2–V3); poor progression alone keeps a small initial r.',
          'El infarto anterior antiguo da complejos Q o QS (cualquier Q > 20 ms en V2–V3); la mala progresión aislada conserva una r inicial pequeña.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
      {
        id: 'precordial-misplacement',
        discriminator: l(
          '电极放高一个肋间会使V1–V3 R波变小甚至呈rSr′或QS；按正确位置重做后递增恢复。',
          'Electrodes one interspace too high reduce R in V1–V3 and can create rSr′ or QS; repeating with correct placement restores the progression.',
          'Electrodos un espacio intercostal más altos reducen la R en V1–V3 y pueden crear rSr′ o QS; al repetir con la colocación correcta la progresión se normaliza.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
      {
        id: 'lvh',
        discriminator: l(
          '左心室肥厚时V1–V3的深S波和左侧高R波可解释递增不良。',
          'In LVH the deep S waves in V1–V3 with tall left-sided R waves explain the poor progression.',
          'En la HVI las S profundas de V1–V3 con R altas izquierdas explican la mala progresión.',
        ),
        leads: ['V1', 'V3', 'V5'],
      },
      {
        id: 'copd-pattern',
        discriminator: l(
          '慢性阻塞性肺疾病心脏低位、垂直，S波持续到V5–V6并伴肢体导联低电压。',
          'In COPD the heart is low and vertical, so S waves persist to V5–V6, with low limb-lead voltage.',
          'En la EPOC el corazón está bajo y vertical, así que las S persisten hasta V5–V6, con bajo voltaje en miembros.',
        ),
        leads: ['V5', 'V6'],
      },
      {
        id: 'dextrocardia',
        discriminator: l('右位心时R波自V1至V6递减，且Ⅰ导联倒置。', 'In dextrocardia R falls from V1 to V6 and lead I is inverted.', 'En la dextrocardia la R disminuye de V1 a V6 y la derivación I está invertida.'),
        leads: ['I', 'V1', 'V6'],
      },
    ],
    pitfalls: [
      l('仅凭R波递增不良诊断陈旧性前壁梗死。', 'Diagnosing an old anterior infarct from poor R progression alone.', 'Diagnosticar un infarto anterior antiguo solo por la mala progresión de la R.'),
      l('不核对电极高度：胸导联放置过高是常见原因。', 'Not checking electrode height: chest leads placed too high are a common cause.', 'No comprobar la altura de los electrodos: los precordiales colocados demasiado altos son una causa frecuente.'),
    ],
    lessons: ['s5', 'i9', 'o9'],
    sources: [REF.mackenzie2005, REF.mason2007, REF.kligfield2007, REF.udmi2018],
    aka: ['PRWP', 'poor R wave progression', 'mala progresión de R', 'R波递增不良'],
    exemplar: { scenarios: ['poor-r-progression'], leads: ['V1', 'V2', 'V3', 'V4'] },
  },
];
