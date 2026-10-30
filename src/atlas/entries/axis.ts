/**
 * Atlas entries — category `axis`. Schema and authoring rules: src/atlas/schema.ts. Values: docs/curriculum/criteria.md
 * (rows qrs-axis-adult, axis-methods, hexaxial-system, heart-position, paed-axis).
 */
import { l } from '../../core/l10n';
import { REF } from '../refs';
import type { AtlasEntry } from '../schema';

export const entries: readonly AtlasEntry[] = [
  {
    id: 'axis-normal',
    definition: l(
      '成人额面QRS电轴位于−30°至+90°之间。',
      'Frontal-plane QRS axis between −30° and +90° in an adult.',
      'Eje del QRS en el plano frontal entre −30° y +90° en el adulto.',
    ),
    features: [
      l(
        '先看Ⅰ和aVF导联QRS的净振幅（正向波减负向波）。',
        'Look first at the net QRS (positive minus negative deflection) in I and aVF.',
        'Mira primero el QRS neto (deflexión positiva menos negativa) en I y aVF.',
      ),
      l('Ⅰ正、aVF正 → 0°至+90°，正常。', 'I positive and aVF positive → 0° to +90°: normal.', 'I positiva y aVF positiva → 0° a +90°: normal.'),
      l(
        'Ⅰ正、aVF负 → 看Ⅱ导联：净正向为−30°至0°（仍正常），净负向为电轴左偏。',
        'I positive and aVF negative → look at II: net positive means −30° to 0° (still normal); net negative means left axis deviation.',
        'I positiva y aVF negativa → mira II: si es neta positiva, −30° a 0° (todavía normal); si es neta negativa, desviación del eje a la izquierda.',
      ),
      l(
        '精确估算：电轴与QRS最接近等电位的肢体导联垂直，并指向QRS为正的一侧。',
        'Refine: the axis lies about 90° from the most equiphasic limb lead, on the side of the leads that are positive.',
        'Afina: el eje está a unos 90° de la derivación de los miembros más isodifásica, hacia el lado de las derivaciones positivas.',
      ),
    ],
    criteria: [
      {
        label: l('成人正常电轴', 'Normal adult axis', 'Eje normal del adulto'),
        value: l('−30°至+90°', '−30° to +90°', '−30° a +90°'),
        source: 'Surawicz 2009 (AHA/ACCF/HRS Part III)',
      },
      {
        label: l('垂直位与横位（描述性）', 'Vertical / horizontal axis (descriptive)', 'Eje vertical / horizontal (descriptivo)'),
        value: l(
          '约+60°至+90°为垂直位（瘦长、年轻者）；约0°至+30°为横位（肥胖、妊娠、老年）——两者均正常',
          'About +60° to +90° vertical (thin, young); about 0° to +30° horizontal (obesity, pregnancy, older age) — both normal',
          'Unos +60° a +90° vertical (personas delgadas, jóvenes); unos 0° a +30° horizontal (obesidad, embarazo, edad avanzada): ambos normales',
        ),
        source: 'Mason 2007 (AHA Part II); Surawicz 2009',
      },
      {
        label: l('六轴系统角度', 'Hexaxial angles', 'Ángulos del sistema hexaxial'),
        value: l('Ⅰ 0°，Ⅱ +60°，aVF +90°，Ⅲ +120°，aVL −30°，aVR −150°', 'I 0°, II +60°, aVF +90°, III +120°, aVL −30°, aVR −150°', 'I 0°, II +60°, aVF +90°, III +120°, aVL −30°, aVR −150°'),
        source: 'Kligfield 2007 (AHA/ACCF/HRS Part I)',
      },
      {
        label: l('儿童', 'Children', 'Niños'),
        value: l(
          '更偏右：1周–1个月约+110°（+30°至+180°）；3岁以后约+60°（+20°至+120°）',
          'More rightward: about +110° (+30° to +180°) at 1 week–1 month; about +60° (+20° to +120°) after 3 years',
          'Más a la derecha: unos +110° (+30° a +180°) entre 1 semana y 1 mes; unos +60° (+20° a +120°) después de los 3 años',
        ),
        source: 'Park 2021; Rijnbeek 2001',
      },
    ],
    mechanism: l(
      'QRS电轴是心室除极平均向量的方向，由于较厚的左心室占优势，正常时指向左下方。每个肢体导联记录该向量在其导联轴上的投影，因此与向量最平行的导联QRS正向波最大，与之垂直的导联呈等电位。',
      'The QRS axis is the direction of the mean ventricular depolarization vector, which normally points left and inferior because the thicker left ventricle dominates. Each limb lead records the projection of that vector on its own axis, so the most parallel lead shows the largest positive QRS and the perpendicular lead is equiphasic.',
      'El eje del QRS es la dirección del vector medio de despolarización ventricular, que normalmente apunta hacia la izquierda y abajo porque predomina el ventrículo izquierdo, más grueso. Cada derivación de los miembros registra la proyección de ese vector sobre su propio eje, de modo que la más paralela muestra el QRS positivo mayor y la perpendicular es isodifásica.',
    ),
    mimics: [
      {
        id: 'lad',
        discriminator: l(
          '此处aVF为负时Ⅱ导联仍为净正向（−30°至0°）；电轴左偏时Ⅱ导联也为净负向。',
          'Here II is net positive when aVF is negative (−30° to 0°); in left axis deviation II is net negative too.',
          'Aquí II es neta positiva aunque aVF sea negativa (−30° a 0°); en la desviación a la izquierda II también es neta negativa.',
        ),
        leads: ['I', 'II', 'aVF'],
      },
      {
        id: 'rad',
        discriminator: l(
          '此处Ⅰ导联为净正向；电轴右偏时Ⅰ导联净负向而aVF正向。',
          'Here I is net positive; in right axis deviation I is net negative while aVF is positive.',
          'Aquí I es neta positiva; en la desviación a la derecha I es neta negativa y aVF positiva.',
        ),
        leads: ['I', 'aVF'],
      },
      {
        id: 'electrode-reversal-la-ra',
        discriminator: l(
          '电极反接时计算的电轴没有意义：左右上肢反接时Ⅰ导联P波、QRS均倒置，aVR变为直立。',
          'An axis measured on a reversed recording is meaningless: with arm reversal the P wave and QRS are negative in I and aVR turns upright.',
          'Un eje medido en un registro con electrodos invertidos no tiene sentido: con la inversión de los brazos la P y el QRS son negativos en I y aVR se vuelve positiva.',
        ),
        leads: ['I', 'aVR'],
      },
    ],
    pitfalls: [
      l(
        '用最高的R波而不是净振幅（R减S）判断电轴。',
        'Judging the axis from the tallest R wave instead of the net (R minus S) deflection.',
        'Juzgar el eje por la onda R más alta en lugar de por la deflexión neta (R menos S).',
      ),
      l(
        '把−20°称为电轴左偏：成人正常范围到−30°，要看Ⅱ导联。',
        'Calling −20° left axis deviation: the adult normal range extends to −30°; check lead II.',
        'Llamar desviación a la izquierda a −20°: el rango normal del adulto llega a −30°; comprueba la derivación II.',
      ),
      l(
        '忘记儿童和年轻人正常电轴更偏右。',
        'Forgetting that children and young adults normally have a more rightward axis.',
        'Olvidar que los niños y los adultos jóvenes tienen normalmente un eje más a la derecha.',
      ),
    ],
    lessons: ['f3', 's5'],
    sources: [REF.surawicz2009, REF.mason2007, REF.kligfield2007, REF.park2021, REF.rijnbeek2001],
    aka: ['normal axis', 'QRS axis', 'eje normal', '电轴正常'],
    exemplar: { scenarios: ['normal'], leads: ['I', 'II', 'aVF'] },
  },
  {
    id: 'lad',
    definition: l(
      '额面QRS电轴较−30°更偏左上（位于−30°至−90°之间）。',
      'Frontal QRS axis more negative than −30° (between −30° and −90°).',
      'Eje frontal del QRS más negativo que −30° (entre −30° y −90°).',
    ),
    features: [
      l('Ⅰ导联净正向，aVF导联净负向。', 'Lead I net positive, aVF net negative.', 'Derivación I neta positiva, aVF neta negativa.'),
      l(
        'Ⅱ导联净负向（S波深于R波）：电轴超过−30°。',
        'Lead II net negative (S deeper than R): the axis is beyond −30°.',
        'Derivación II neta negativa (S más profunda que R): el eje supera −30°.',
      ),
      l(
        '显著左偏（−45°至−90°）伴aVL呈qR、Ⅱ/Ⅲ/aVF呈rS且QRS<120 ms，提示左前分支阻滞。',
        'Marked LAD (−45° to −90°) with qR in aVL, rS in II, III and aVF and QRS < 120 ms suggests left anterior fascicular block.',
        'Una desviación marcada (−45° a −90°) con qR en aVL, rS en II, III y aVF y QRS < 120 ms sugiere bloqueo fascicular anterior izquierdo.',
      ),
      l(
        '再找原因：下壁Q波（陈旧性下壁梗死）、左心室肥厚、左束支传导阻滞、心室预激、起搏心律。',
        'Then look for the cause: inferior Q waves (old inferior MI), LVH, LBBB, pre-excitation, a paced rhythm.',
        'Busca después la causa: ondas Q inferiores (infarto inferior antiguo), HVI, bloqueo de rama izquierda, preexcitación, ritmo de marcapasos.',
      ),
    ],
    criteria: [
      {
        label: l('电轴左偏', 'Left axis deviation', 'Desviación del eje a la izquierda'),
        value: l('−30°至−90°；中度−30°至−45°，显著−45°至−90°', '−30° to −90°; moderate −30° to −45°, marked −45° to −90°', '−30° a −90°; moderada −30° a −45°, marcada −45° a −90°'),
        source: 'Surawicz 2009 (AHA/ACCF/HRS Part III)',
      },
      {
        label: l('快速判断', 'Quick test', 'Comprobación rápida'),
        value: l('Ⅰ正 + Ⅱ负 = 超过−30°', 'I positive + II negative = beyond −30°', 'I positiva + II negativa = más allá de −30°'),
        source: 'Surawicz 2009; Kligfield 2007',
      },
      {
        label: l('左前分支阻滞图形', 'Left anterior fascicular block pattern', 'Patrón de bloqueo fascicular anterior izquierdo'),
        value: l('电轴−45°至−90°，aVL呈qR，Ⅱ/Ⅲ/aVF呈rS，QRS<120 ms', 'Axis −45° to −90°, qR in aVL, rS in II/III/aVF, QRS < 120 ms', 'Eje −45° a −90°, qR en aVL, rS en II/III/aVF, QRS < 120 ms'),
        source: 'Surawicz 2009 (AHA/ACCF/HRS Part III)',
      },
    ],
    mechanism: l(
      '当平均除极向量向上偏移时，下壁导联记录到背离的向量而出现深S波，Ⅰ、aVL导联仍为正向。最常见的原因是左前分支阻滞使左心室前上部最后激动，但下壁瘢痕、左心室肥厚和异常激动顺序也可产生同样改变。',
      'When the mean depolarization vector swings superiorly, the inferior leads see it moving away and record deep S waves while I and aVL stay positive. The commonest reason is block of the left anterior fascicle, which makes the anterosuperior left ventricle activate last, but inferior scar, LVH and abnormal activation sequences can do the same.',
      'Cuando el vector medio de despolarización se desplaza hacia arriba, las derivaciones inferiores lo ven alejarse y registran ondas S profundas, mientras I y aVL siguen positivas. La causa más frecuente es el bloqueo del fascículo anterior izquierdo, que hace que la región anterosuperior del ventrículo izquierdo se active la última, aunque una cicatriz inferior, la HVI y otras secuencias de activación anómalas producen lo mismo.',
    ),
    mimics: [
      {
        id: 'lafb',
        discriminator: l(
          '电轴左偏只是测量结果；左前分支阻滞是诊断，需显著左偏（≤−45°）加aVL qR、下壁rS且无其他原因。',
          'LAD is a measurement; LAFB is a diagnosis that needs marked LAD (≤ −45°) plus qR in aVL, rS inferiorly and no other cause.',
          'La desviación a la izquierda es una medida; el bloqueo fascicular anterior izquierdo es un diagnóstico que exige desviación marcada (≤ −45°), qR en aVL, rS inferior y ninguna otra causa.',
        ),
        leads: ['aVL', 'II', 'III'],
      },
      {
        id: 'old-mi-inferior',
        discriminator: l(
          '左前分支阻滞时下壁导联以小r波起始（rS）；陈旧性下壁梗死时以Q波起始（QS或Qr）。',
          'In LAFB the inferior leads start with a small r (rS); in old inferior MI they start with a Q wave (QS or Qr).',
          'En el bloqueo fascicular anterior las derivaciones inferiores empiezan con una r pequeña (rS); en el infarto inferior antiguo empiezan con una onda Q (QS o Qr).',
        ),
        leads: ['II', 'III', 'aVF'],
      },
      {
        id: 'axis-normal',
        discriminator: l(
          '−30°至0°时Ⅱ导联仍为净正向，电轴正常；只有Ⅱ导联净负向才是左偏。',
          'Between −30° and 0° lead II is still net positive and the axis is normal; only a net-negative II means LAD.',
          'Entre −30° y 0° la derivación II sigue siendo neta positiva y el eje es normal; solo una II neta negativa indica desviación a la izquierda.',
        ),
        leads: ['II'],
      },
      {
        id: 'extreme-axis',
        discriminator: l(
          '电轴左偏时Ⅰ导联仍为正向；极度电轴偏移时Ⅰ和aVF均为负向。',
          'In LAD lead I stays positive; in extreme axis deviation I and aVF are both negative.',
          'En la desviación a la izquierda la derivación I sigue positiva; en la desviación extrema I y aVF son ambas negativas.',
        ),
        leads: ['I', 'aVF'],
      },
    ],
    pitfalls: [
      l(
        '仅凭电轴左偏诊断左前分支阻滞，而不看aVL的qR、不排除下壁梗死。',
        'Diagnosing LAFB from LAD alone, without checking qR in aVL and excluding inferior MI.',
        'Diagnosticar bloqueo fascicular anterior solo por la desviación del eje, sin comprobar la qR en aVL ni descartar un infarto inferior.',
      ),
      l(
        '左前分支阻滞的rS可掩盖下壁小Q波，导致漏诊下壁梗死——与既往心电图比较。',
        'Missing an inferior infarct because the rS of LAFB can hide small Q waves — compare with prior ECGs.',
        'Pasar por alto un infarto inferior porque la rS del bloqueo fascicular puede ocultar ondas Q pequeñas: compara con ECG previos.',
      ),
      l(
        '把成人电轴标准套用于儿童（儿童正常电轴更偏右）。',
        'Applying adult axis limits to children, whose normal axis is more rightward.',
        'Aplicar los límites del eje del adulto a los niños, cuyo eje normal está más a la derecha.',
      ),
    ],
    lessons: ['s5', 'r7'],
    sources: [REF.surawicz2009, REF.kligfield2007, REF.mason2007],
    aka: ['LAD', 'left axis', 'eje izquierdo', '电轴左偏'],
    exemplar: { scenarios: ['lafb'], leads: ['I', 'II', 'aVF', 'aVL'] },
  },
  {
    id: 'rad',
    definition: l(
      '成人额面QRS电轴超过+90°（位于+90°至+180°之间）。',
      'Frontal QRS axis beyond +90° (between +90° and +180°) in an adult.',
      'Eje frontal del QRS más allá de +90° (entre +90° y +180°) en el adulto.',
    ),
    features: [
      l('Ⅰ导联净负向（S波深于R波），aVF导联净正向。', 'Lead I net negative (S deeper than R), aVF net positive.', 'Derivación I neta negativa (S más profunda que R), aVF neta positiva.'),
      l(
        '儿童和部分瘦高年轻人属正常——结合年龄和体型判读。',
        'Normal in children and in some tall, thin young adults — read it with age and build in mind.',
        'Es normal en niños y en algunos adultos jóvenes altos y delgados: interprétalo según la edad y la constitución.',
      ),
      l(
        '再找原因：V1右心室肥厚征象（高R、qR）、急性右心室负荷（肺栓塞）、侧壁梗死、左后分支阻滞、慢性阻塞性肺疾病。',
        'Then look for the cause: RVH signs in V1 (tall R, qR), acute RV strain (pulmonary embolism), lateral MI, left posterior fascicular block, COPD.',
        'Busca después la causa: signos de HVD en V1 (R alta, qR), sobrecarga aguda del VD (tromboembolismo pulmonar), infarto lateral, bloqueo fascicular posterior izquierdo, EPOC.',
      ),
      l(
        '若Ⅰ导联P波也倒置，首先考虑左右上肢电极反接或右位心。',
        'If the P wave in lead I is negative too, think of arm-electrode reversal or dextrocardia before anything else.',
        'Si la onda P también es negativa en I, piensa antes que nada en inversión de los electrodos de los brazos o en dextrocardia.',
      ),
    ],
    criteria: [
      {
        label: l('成人电轴右偏', 'Right axis deviation (adult)', 'Desviación del eje a la derecha (adulto)'),
        value: l('+90°至+180°；中度+90°至+120°，显著+120°至+180°', '+90° to +180°; moderate +90° to +120°, marked +120° to +180°', '+90° a +180°; moderada +90° a +120°, marcada +120° a +180°'),
        source: 'Surawicz 2009 (AHA/ACCF/HRS Part III)',
      },
      {
        label: l('支持右心室肥厚', 'Supporting RVH', 'A favor de HVD'),
        value: l('电轴≥+110°，伴V1 R/S>1或R≥7 mm', 'Axis ≥ +110° with R/S > 1 or R ≥ 7 mm in V1', 'Eje ≥ +110° con R/S > 1 o R ≥ 7 mm en V1'),
        source: 'Hancock 2009 (AHA/ACCF/HRS Part V)',
      },
      {
        label: l('儿童', 'Children', 'Niños'),
        value: l('新生儿约+110°（+30°至+180°）；约3岁后接近成人范围', 'Newborn about +110° (+30° to +180°); near the adult range after about 3 years', 'Recién nacido unos +110° (+30° a +180°); cerca del rango adulto a partir de unos 3 años'),
        source: 'Park 2021; Rijnbeek 2001',
      },
    ],
    mechanism: l(
      '当右心室电力增大（肥厚或急性扩张）、左心室侧壁电力减小（侧壁梗死）或左后分支阻滞时，平均向量转向右方。此时朝向0°的Ⅰ导联记录到背离的向量，出现以S波为主的波形。',
      'The mean vector turns rightward when the right ventricle contributes more force (hypertrophy or acute dilation), when the left lateral wall contributes less (lateral infarct) or when the left posterior fascicle is blocked. Lead I, oriented at 0°, then sees the vector moving away and records a dominant S wave.',
      'El vector medio gira a la derecha cuando el ventrículo derecho aporta más fuerza (hipertrofia o dilatación aguda), cuando la pared lateral izquierda aporta menos (infarto lateral) o cuando se bloquea el fascículo posterior izquierdo. La derivación I, orientada a 0°, ve entonces alejarse el vector y registra una onda S dominante.',
    ),
    mimics: [
      {
        id: 'electrode-reversal-la-ra',
        discriminator: l(
          '真正电轴右偏时Ⅰ导联P波仍直立；左右上肢反接时Ⅰ导联P、QRS、T全部倒置，aVR变为直立。',
          'In true RAD the P wave in I is still upright; with arm-electrode reversal P, QRS and T are all inverted in I and aVR turns positive.',
          'En la desviación real a la derecha la P sigue positiva en I; con la inversión de los electrodos de los brazos P, QRS y T son negativos en I y aVR se vuelve positiva.',
        ),
        leads: ['I', 'aVR'],
      },
      {
        id: 'dextrocardia',
        discriminator: l(
          '电轴右偏时R波仍从V1向V5递增；右位心时R波自V1至V6逐渐减小，且Ⅰ导联完全倒置。',
          'In RAD the R wave still grows from V1 to V5; in dextrocardia it shrinks across V1–V6 and lead I is fully inverted.',
          'En la desviación a la derecha la R sigue creciendo de V1 a V5; en la dextrocardia disminuye de V1 a V6 y la derivación I está totalmente invertida.',
        ),
        leads: ['I', 'V1', 'V6'],
      },
      {
        id: 'lpfb',
        discriminator: l(
          '电轴右偏是测量结果；左后分支阻滞是排除性诊断，需右偏伴Ⅲ/aVF qR、Ⅰ/aVL rS，并排除右心室肥厚、侧壁梗死和肺部疾病。',
          'RAD is the measurement; LPFB is a diagnosis of exclusion that needs RAD with qR in III/aVF, rS in I/aVL and no RVH, lateral MI or lung disease.',
          'La desviación a la derecha es la medida; el bloqueo fascicular posterior izquierdo es un diagnóstico de exclusión que exige además qR en III/aVF, rS en I/aVL y ausencia de HVD, infarto lateral o neumopatía.',
        ),
        leads: ['I', 'III', 'aVF'],
      },
      {
        id: 'pulmonary-embolism',
        discriminator: l(
          '慢性右偏伴V1高R提示右心室肥厚；新出现的右偏伴窦性心动过速和V1–V4 T波倒置提示急性右心室负荷（如肺栓塞）。',
          'Chronic RAD with a tall R in V1 points to RVH; a new rightward shift with sinus tachycardia and T inversion in V1–V4 points to acute RV strain such as pulmonary embolism.',
          'Una desviación crónica con R alta en V1 orienta a HVD; un desplazamiento nuevo a la derecha con taquicardia sinusal e inversión de T en V1–V4 orienta a sobrecarga aguda del VD, como en el tromboembolismo pulmonar.',
        ),
        leads: ['I', 'V1', 'V2', 'V3'],
      },
    ],
    pitfalls: [
      l('把儿童或瘦长年轻人的右偏判为异常。', 'Calling RAD abnormal in a child or a slim young adult.', 'Considerar anormal la desviación a la derecha en un niño o en un adulto joven delgado.'),
      l(
        '未排除右心室肥厚、侧壁梗死和肺部疾病就诊断左后分支阻滞。',
        'Diagnosing left posterior fascicular block without excluding RVH, lateral MI and lung disease.',
        'Diagnosticar bloqueo fascicular posterior izquierdo sin descartar HVD, infarto lateral y neumopatía.',
      ),
      l('漏掉上肢电极反接：始终检查Ⅰ导联的P波。', 'Missing arm-electrode reversal: always check the P wave in lead I.', 'Pasar por alto la inversión de los electrodos de los brazos: comprueba siempre la onda P en I.'),
    ],
    lessons: ['s5', 'h3', 'o9'],
    sources: [REF.surawicz2009, REF.hancock2009, REF.batchvarov2007, REF.escPe2019, REF.park2021, REF.rijnbeek2001],
    aka: ['RAD', 'right axis', 'eje derecho', '电轴右偏'],
    exemplar: { scenarios: ['rvh'], leads: ['I', 'aVF', 'V1'] },
  },
  {
    id: 'extreme-axis',
    definition: l(
      '额面QRS电轴位于−90°至±180°之间（右上象限，“无人区”电轴）。',
      'Frontal QRS axis between −90° and ±180° (right superior or “northwest” axis).',
      'Eje frontal del QRS entre −90° y ±180° (eje superior derecho o «tierra de nadie»).',
    ),
    features: [
      l('Ⅰ和aVF导联均为净负向；aVR常以正向波为主。', 'Leads I and aVF both net negative; aVR is often dominantly positive.', 'Derivaciones I y aVF ambas netas negativas; aVR suele ser predominantemente positiva.'),
      l(
        '先排除肢体电极反接和右位心（看Ⅰ导联P波和胸导联R波递增）。',
        'First exclude limb-electrode reversal and dextrocardia (check the P wave in I and the precordial R progression).',
        'Descarta primero la inversión de electrodos de los miembros y la dextrocardia (mira la onda P en I y la progresión de R en precordiales).',
      ),
      l(
        '宽QRS心动过速伴极度电轴偏移强烈支持室性心动过速。',
        'With a wide-QRS tachycardia, an extreme axis strongly favours ventricular tachycardia.',
        'En una taquicardia de QRS ancho, un eje extremo apoya firmemente una taquicardia ventricular.',
      ),
      l(
        '其他原因：高钾血症、心室起搏或室性异位心律、严重右心室肥厚、复杂先天性心脏病。',
        'Other causes: hyperkalaemia, ventricular paced or ectopic rhythms, severe RVH, complex congenital heart disease.',
        'Otras causas: hiperpotasemia, ritmos ventriculares ectópicos o de marcapasos, HVD grave, cardiopatías congénitas complejas.',
      ),
    ],
    criteria: [
      {
        label: l('极度（右上）电轴', 'Extreme (right superior) axis', 'Eje extremo (superior derecho)'),
        value: l('−90°至±180°：Ⅰ负、aVF负', '−90° to ±180°: I negative and aVF negative', '−90° a ±180°: I negativa y aVF negativa'),
        source: 'Surawicz 2009 (AHA/ACCF/HRS Part III)',
      },
      {
        label: l('不确定电轴（另一诊断用语）', 'Indeterminate axis (a different statement)', 'Eje indeterminado (otro enunciado)'),
        value: l('所有肢体导联均呈等电位，无法确定电轴', 'All limb leads equiphasic: the axis cannot be determined', 'Todas las derivaciones de los miembros isodifásicas: no se puede determinar el eje'),
        source: 'Mason 2007 (AHA/ACCF/HRS Part II)',
      },
      {
        label: l('宽QRS心动过速时', 'In a wide-complex tachycardia', 'En una taquicardia de complejo ancho'),
        value: l('“无人区”电轴支持室速；不明原因的宽QRS心动过速按室速处理', 'A northwest axis favours VT; an unexplained wide-complex tachycardia is treated as VT', 'Un eje en «tierra de nadie» favorece la TV; una taquicardia de complejo ancho no explicada se trata como TV'),
        source: 'Zeppenfeld 2022 (ESC VA/SCD)',
      },
    ],
    mechanism: l(
      '指向右上方的向量意味着除极由心尖向心底、由左向右进行，这是正常希氏束-浦肯野系统传导不会产生的。因此它提示激动起源于心室本身、存在严重异常的心肌基质，或记录错误。',
      'A vector pointing up and to the right means that depolarization runs from the apex toward the base and from left to right, which normal His–Purkinje conduction does not produce. It therefore suggests activation starting in the ventricles themselves, a grossly abnormal substrate, or a recording error.',
      'Un vector que apunta hacia arriba y a la derecha significa que la despolarización avanza del ápex a la base y de izquierda a derecha, algo que la conducción normal por el His-Purkinje no produce. Por eso sugiere una activación que nace en los propios ventrículos, un sustrato muy anómalo o un error de registro.',
    ),
    mimics: [
      {
        id: 'electrode-reversal-la-ra',
        discriminator: l(
          '上肢电极反接时Ⅰ导联P波也倒置而胸导联正常；真正的极度电轴在窦性心律时Ⅰ导联P波直立。',
          'With arm reversal the P wave in lead I is inverted too and the precordial leads look normal; a true extreme axis keeps an upright P in I during sinus rhythm.',
          'Con la inversión de los brazos la P también es negativa en I y las precordiales son normales; un eje extremo real mantiene la P positiva en I en ritmo sinusal.',
        ),
        leads: ['I', 'aVR'],
      },
      {
        id: 'vt-monomorphic',
        discriminator: l(
          '窄QRS窦性心律时极度电轴只是形态描述；规则的宽QRS心动过速伴此电轴是室速的线索，处理方式随之改变。',
          'An extreme axis in narrow-QRS sinus rhythm is a morphology statement; with a regular wide-complex tachycardia it is a clue to VT and changes management.',
          'Un eje extremo en ritmo sinusal con QRS estrecho es un dato morfológico; en una taquicardia regular de complejo ancho es una pista de TV y cambia el manejo.',
        ),
        leads: ['I', 'aVF'],
      },
      {
        id: 'dextrocardia',
        discriminator: l(
          '右位心时R波自V1至V6逐渐减小且Ⅰ导联P波倒置；电极反接和真正的极度电轴胸导联递增正常。',
          'In dextrocardia the R wave shrinks from V1 to V6 and P is negative in I; with reversal or a true extreme axis the precordial progression is normal.',
          'En la dextrocardia la R disminuye de V1 a V6 y la P es negativa en I; con la inversión de electrodos o un eje extremo real la progresión precordial es normal.',
        ),
        leads: ['I', 'V1', 'V6'],
      },
      {
        id: 'lad',
        discriminator: l(
          '电轴左偏时Ⅰ导联为正；极度电轴偏移时Ⅰ和aVF均为负。',
          'In LAD lead I is positive; in extreme axis deviation both I and aVF are negative.',
          'En la desviación a la izquierda la derivación I es positiva; en la desviación extrema I y aVF son negativas.',
        ),
        leads: ['I', 'aVF'],
      },
    ],
    pitfalls: [
      l('未排除电极反接就接受“无人区”电轴。', 'Accepting a northwest axis without excluding lead reversal.', 'Aceptar un eje en «tierra de nadie» sin descartar la inversión de electrodos.'),
      l(
        '把极度电轴的宽QRS心动过速当作室上速伴差异性传导。',
        'Labelling a wide-complex tachycardia with an extreme axis as SVT with aberrancy.',
        'Etiquetar como TSV con aberrancia una taquicardia de complejo ancho con eje extremo.',
      ),
      l(
        '混淆极度电轴偏移与不确定电轴（所有肢体导联均等电位）。',
        'Confusing extreme axis deviation with an indeterminate axis (all limb leads equiphasic).',
        'Confundir la desviación extrema con un eje indeterminado (todas las derivaciones de los miembros isodifásicas).',
      ),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '先复查电极位置。若QRS宽且心率快，在证实之前按室性心动过速处理；否则检查血钾并寻找室性或起搏心律。',
        'Re-check electrode placement first. If the QRS is wide and the rate fast, treat it as ventricular tachycardia until proven otherwise; otherwise check potassium and look for a ventricular or paced rhythm.',
        'Comprueba primero la colocación de los electrodos. Si el QRS es ancho y la frecuencia rápida, trátalo como taquicardia ventricular mientras no se demuestre lo contrario; si no, determina el potasio y busca un ritmo ventricular o de marcapasos.',
      ),
    },
    lessons: ['s5', 't5', 'o9'],
    sources: [REF.surawicz2009, REF.mason2007, REF.escVa2022, REF.batchvarov2007],
    aka: ['northwest axis', "no man's land", 'right superior axis', 'eje extremo', '无人区电轴', '极度电轴偏移'],
  },
];
