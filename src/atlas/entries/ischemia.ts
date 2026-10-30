/**
 * Atlas entries — category `ischemia` (acute coronary occlusion, its equivalents, ischaemic ST/T, Q waves and old
 * infarction). Schema and authoring rules: src/atlas/schema.ts. Values: docs/curriculum/criteria.md (section
 * ischemia-injury-infarction and its "missing in the book" list: UDMI sex/age J-point thresholds, V3R/V4R and V7–V9,
 * posterior STEMI equivalent, de Winter, Wellens, aVR with diffuse ST depression, Sgarbossa/Smith/Barcelona, LV
 * aneurysm T/QRS rule) and docs/curriculum/critic.json (occlusion-MI framing; describe ST/T morphology instead of
 * "subendocardial / subepicardial" labels; Q waves track infarct size, not transmurality).
 *
 * Framing used throughout: for every chest-pain ECG the reader commits to "occlusion likely", "indeterminate — repeat
 * the ECG / record extra leads" or "not occlusion — name the mimic" (PLAN §3 stage I).
 */
import { l } from '../../core/l10n';
import { REF } from '../refs';
import type { AtlasEntry, UrgencySpec } from '../schema';

/** Full references used here that src/atlas/refs.ts does not have (kept local; reported to the atlas workstream). */
const R = {
  deWinter2008:
    'de Winter RJ, Verouden NJW, Wellens HJJ, Wilde AAM. A new ECG sign of proximal LAD occlusion. N Engl J Med 2008;359:2071–2073.',
  deZwaan1982:
    'de Zwaan C, Bär FW, Wellens HJJ. Characteristic electrocardiographic pattern indicating a critical stenosis high in left anterior descending coronary artery in patients admitted because of impending myocardial infarction. Am Heart J 1982;103:730–736.',
  zimetbaum2003: 'Zimetbaum PJ, Josephson ME. Use of the electrocardiogram in acute myocardial infarction. N Engl J Med 2003;348:933–940.',
  engelen1999:
    'Engelen DJ et al. Value of the electrocardiogram in localizing the occlusion site in the left anterior descending coronary artery in acute anterior myocardial infarction. J Am Coll Cardiol 1999;34:389–395.',
  zehender1993:
    'Zehender M et al. Right ventricular infarction as an independent predictor of prognosis after acute inferior myocardial infarction. N Engl J Med 1993;328:981–988.',
  bayes2006:
    'Bayés de Luna A et al. A new terminology for left ventricular walls and location of myocardial infarcts that present Q wave based on the standard of cardiac magnetic resonance imaging (ISHE statement). Circulation 2006;114:1755–1760.',
  moon2004:
    'Moon JC et al. The pathologic basis of Q-wave and non-Q-wave myocardial infarction: a cardiovascular magnetic resonance study. J Am Coll Cardiol 2004;44:554–560.',
  klein2015:
    'Klein LR, Shroff GR, Beeman W, Smith SW. Electrocardiographic criteria to differentiate acute anterior ST-elevation myocardial infarction from left ventricular aneurysm. Am J Emerg Med 2015;33:786–790.',
  meyers2021:
    'Meyers HP et al. Accuracy of OMI ECG findings versus STEMI criteria for diagnosis of acute coronary occlusion myocardial infarction. Int J Cardiol Heart Vasc 2021;33:100767.',
  driver2017:
    'Driver BE et al. A new 4-variable formula to differentiate normal variant ST segment elevation in V2–V4 (early repolarization) from subtle left anterior descending coronary occlusion. J Electrocardiol 2017;50:561–569.',
  kontos2022:
    'Kontos MC et al. 2022 ACC Expert Consensus Decision Pathway on the evaluation and disposition of acute chest pain in the emergency department. J Am Coll Cardiol 2022;80:1925–1960.',
  gulati2021:
    'Gulati M et al. 2021 AHA/ACC/ASE/CHEST/SAEM/SCCT/SCMR Guideline for the evaluation and diagnosis of chest pain. Circulation 2021;144:e368–e454.',
  diMarco2020:
    'Di Marco A et al. New electrocardiographic algorithm for the diagnosis of acute myocardial infarction in patients with left bundle branch block (Barcelona algorithm). J Am Heart Assoc 2020;9:e015573.',
  dodd2021:
    'Dodd KW et al. Electrocardiographic diagnosis of acute coronary occlusion myocardial infarction in ventricular paced rhythm using the modified Sgarbossa criteria. Ann Emerg Med 2021;78:517–529.',
  littmann2016:
    'Littmann L. South African flag sign: a teaching tool for easier ECG recognition of high lateral infarct. Am J Emerg Med 2016;34:107–109.',
  durant2015:
    'Durant E, Singh A. Acute first diagonal artery occlusion: a characteristic pattern of ST elevation in noncontiguous leads. Am J Emerg Med 2015;33:1326.e3–e5.',
  ghadri2018:
    'Ghadri JR et al. International Expert Consensus Document on Takotsubo Syndrome (Part I): clinical characteristics, diagnostic criteria, and pathophysiology (InterTAK). Eur Heart J 2018;39:2032–2046.',
} as const;

/** The shared next step for an acute coronary occlusion (territory entries add their own extra-lead advice). */
const STEMI_NOW: UrgencySpec = {
  level: 'immediate',
  next: l(
    '按急性冠脉闭塞处理：立即启动直接PCI流程（预计诊断至PCI超过120 min时溶栓），持续心电监护并备好除颤器。',
    'Treat as acute coronary occlusion: activate the primary PCI pathway now (fibrinolysis if PCI cannot be done within 120 min of diagnosis), monitor continuously and keep a defibrillator at hand.',
    'Trátalo como una oclusión coronaria aguda: activa ya el circuito de ICP primaria (fibrinólisis si la ICP no puede hacerse en 120 min desde el diagnóstico), monitoriza de forma continua y ten un desfibrilador a mano.',
  ),
};

/** UDMI J-point thresholds, written once and reused by every STEMI entry. */
const STE_THRESHOLDS = {
  label: l('ST段抬高阈值（J点，≥2个相邻导联）', 'ST-elevation thresholds (J point, ≥ 2 contiguous leads)', 'Umbrales de elevación del ST (punto J, ≥ 2 derivaciones contiguas)'),
  value: l(
    'V2–V3：男性≥40岁≥2 mm，男性<40岁≥2.5 mm，女性≥1.5 mm；其他导联≥1 mm（无左心室肥厚或左束支阻滞）',
    'V2–V3: ≥ 2 mm men ≥ 40 y, ≥ 2.5 mm men < 40 y, ≥ 1.5 mm women; all other leads ≥ 1 mm (no LVH or LBBB)',
    'V2–V3: ≥ 2 mm en varones ≥ 40 años, ≥ 2,5 mm en varones < 40 años, ≥ 1,5 mm en mujeres; resto de derivaciones ≥ 1 mm (sin HVI ni BRI)',
  ),
  source: 'Thygesen 2018 (UDMI §27); Byrne 2023 (ESC ACS §3.2.1)',
} as const;

export const entries: readonly AtlasEntry[] = [
  // ── acute anterior STEMI ─────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'stemi-anterior',
    definition: l(
      '前降支（LAD）急性闭塞，表现为胸前导联（V1–V4，可延及V5–V6、Ⅰ、aVL）新出现的ST段抬高。',
      'Acute occlusion of the left anterior descending artery (LAD), shown by new ST elevation in the anterior chest leads (V1–V4, sometimes V5–V6, I and aVL).',
      'Oclusión aguda de la arteria descendente anterior (DA), que se manifiesta con elevación nueva del ST en las derivaciones precordiales anteriores (V1–V4, a veces V5–V6, I y aVL).',
    ),
    features: [
      l(
        '以TP或PR段为基线在J点测量：≥2个相邻胸导联ST段抬高，V2–V3按性别和年龄采用不同阈值。',
        'Measure at the J point against the TP or PR baseline: ST elevation in ≥ 2 contiguous chest leads, with sex- and age-specific limits in V2–V3.',
        'Mide en el punto J respecto a la línea TP o PR: elevación del ST en ≥ 2 derivaciones precordiales contiguas, con umbrales por sexo y edad en V2–V3.',
      ),
      l(
        '看形态：ST段平直或上凸，直接延续为宽大的T波；T波相对于QRS显得过大。',
        'Look at the shape: a straight or convex ST that runs into a broad, tall T wave; the T is large for the size of its QRS.',
        'Mira la forma: ST rectilíneo o convexo que se continúa con una T ancha y alta; la T es grande para el tamaño de su QRS.',
      ),
      l(
        '找对应性改变：Ⅲ、aVF导联ST段压低支持损伤，而不是正常变异。',
        'Look for reciprocal ST depression in III and aVF: it points to injury rather than a normal variant.',
        'Busca descenso recíproco del ST en III y aVF: apunta a lesión aguda y no a una variante normal.',
      ),
      l(
        '近段闭塞线索：Ⅰ、aVL（以及aVR、V1）也抬高，同时下壁导联压低；包绕心尖的长前降支可使下壁导联也抬高。',
        'Clues to a proximal occlusion: ST elevation also in I and aVL (and in aVR and V1) with inferior ST depression; a long LAD that wraps the apex can raise the inferior ST too.',
        'Pistas de oclusión proximal: elevación también en I y aVL (y en aVR y V1) con descenso inferior; una DA larga que rodea la punta puede elevar también el ST inferior.',
      ),
      l(
        '数小时内V1–V3的R波降低、出现Q波；这并不意味着“为时已晚”。',
        'Within hours the R waves in V1–V3 shrink and Q waves appear; this does not mean it is too late to reperfuse.',
        'En pocas horas las R de V1–V3 disminuyen y aparecen ondas Q; eso no significa que sea tarde para reperfundir.',
      ),
    ],
    criteria: [
      STE_THRESHOLDS,
      {
        label: l('前降支近段闭塞（第一间隔支和第一对角支之前）', 'Proximal LAD (before the first septal and first diagonal)', 'DA proximal (antes de la primera septal y la primera diagonal)'),
        value: l(
          'aVR、aVL、V1抬高（V1>2.5 mm）伴下壁（Ⅲ>Ⅱ）及V5压低；新发右束支阻滞也支持',
          'ST elevation in aVR, aVL and V1 (V1 > 2.5 mm) with ST depression inferiorly (III > II) and in V5; a new RBBB also supports it',
          'Elevación del ST en aVR, aVL y V1 (V1 > 2,5 mm) con descenso inferior (III > II) y en V5; un BRD nuevo también lo apoya',
        ),
        source: 'Engelen 1999; Zimetbaum 2003',
      },
      {
        label: l('细微前壁闭塞与正常变异', 'Subtle anterior occlusion vs normal variant', 'Oclusión anterior sutil frente a variante normal'),
        value: l(
          'V2–V4抬高轻微时，结合QTc、V4的R波、V2的QRS振幅和V3 J点后60 ms的ST（4变量公式），并复查心电图',
          'With modest ST elevation in V2–V4, use QTc, R amplitude in V4, QRS amplitude in V2 and ST 60 ms after J in V3 (4-variable formula), plus serial ECGs',
          'Con elevación modesta en V2–V4, usa el QTc, la R de V4, el QRS de V2 y el ST 60 ms tras el punto J en V3 (fórmula de 4 variables), además de ECG seriados',
        ),
        source: 'Driver 2017',
      },
    ],
    mechanism: l(
      '前降支供血区全层缺血时，受损心肌的动作电位平台期提前消失，在ST段期间健康与受损心肌之间形成损伤电流，ST向量指向前壁。面对前壁的胸导联记录到ST段抬高，而从相反方向观察的Ⅲ、aVF导联记录到对应性压低。',
      'When the whole thickness of the LAD territory is ischaemic, the injured cells lose their action-potential plateau early, so during the ST segment a current flows between healthy and injured muscle and the ST vector points toward the anterior wall. The chest leads that face that wall record ST elevation, while III and aVF, which look from the opposite side, record reciprocal depression.',
      'Cuando todo el espesor del territorio de la DA está isquémico, las células lesionadas pierden pronto la meseta del potencial de acción, de modo que durante el ST circula una corriente entre músculo sano y lesionado y el vector del ST apunta hacia la cara anterior. Las precordiales que miran a esa cara registran elevación del ST, mientras que III y aVF, que miran desde el lado opuesto, registran un descenso recíproco.',
    ),
    mimics: [
      {
        id: 'early-repolarization',
        discriminator: l(
          '这里ST平直或上凸、T波相对QRS过大且有对应性压低；正常变异为凹面抬高、J点切迹、T波与高QRS成比例、无对应性改变且复查不变。',
          'Here the ST is straight or convex, the T is large for its QRS and there is reciprocal depression; in the normal variant the ST is concave with a notched J point, the T is proportionate to a tall QRS, nothing is mirrored and serial ECGs do not change.',
          'Aquí el ST es rectilíneo o convexo, la T es grande para su QRS y hay descenso recíproco; en la variante normal el ST es cóncavo con muesca en J, la T es proporcionada a un QRS alto, no hay imagen especular y los ECG seriados no cambian.',
        ),
        leads: ['V2', 'V3', 'V4', 'III'],
      },
      {
        id: 'lv-aneurysm',
        discriminator: l(
          '这里T波高大（任一V1–V4导联T/QRS振幅比≥0.36）；室壁瘤为QS波上持续抬高，T波小，与旧图一致。',
          'Here the T waves are large (T/QRS amplitude ratio ≥ 0.36 in any of V1–V4); an aneurysm shows fixed ST elevation over QS waves with small T waves, identical to old tracings.',
          'Aquí las T son grandes (cociente de amplitud T/QRS ≥ 0,36 en alguna de V1–V4); el aneurisma muestra elevación fija sobre complejos QS con T pequeñas, igual que en trazados antiguos.',
        ),
        leads: ['V1', 'V2', 'V3', 'V4'],
      },
      {
        id: 'lvh-strain',
        discriminator: l(
          '左心室肥厚时V1–V3的ST抬高与深S波成比例，凹面，且V5–V6有ST压低和T倒置；闭塞时抬高与QRS不成比例。',
          'In LVH the ST elevation in V1–V3 is concave and proportionate to deep S waves, with ST depression and T inversion in V5–V6; in occlusion the elevation is out of proportion to the QRS.',
          'En la HVI la elevación del ST en V1–V3 es cóncava y proporcionada a S profundas, con descenso del ST y T negativa en V5–V6; en la oclusión la elevación es desproporcionada al QRS.',
        ),
        leads: ['V1', 'V2', 'V3', 'V5', 'V6'],
      },
      {
        id: 'takotsubo',
        discriminator: l(
          'Takotsubo的前壁抬高常超出单一冠脉分布、对应性压低少，但心电图无法可靠区分，必须行冠脉造影。',
          'Takotsubo ST elevation often spreads beyond one coronary territory with little reciprocal depression, but the ECG cannot reliably tell them apart: angiography decides.',
          'La elevación del tako-tsubo suele extenderse más allá de un territorio coronario y con poco descenso recíproco, pero el ECG no los distingue con fiabilidad: decide la coronariografía.',
        ),
        leads: ['V2', 'V3', 'V4', 'V5', 'aVR'],
      },
    ],
    pitfalls: [
      l(
        '在T波已呈超急性期改变时，仍等待ST抬高“达到毫米标准”。',
        'Waiting for the ST to reach the millimetre criteria when the T waves are already hyperacute.',
        'Esperar a que el ST alcance los criterios milimétricos cuando las T ya son hiperagudas.',
      ),
      l(
        '未检查对应性改变、未复查心电图，就把年轻男性V2–V4的轻度抬高当作早期复极。',
        'Calling modest V2–V4 elevation in a young man early repolarization without checking for reciprocity or repeating the ECG.',
        'Etiquetar como repolarización precoz una elevación modesta en V2–V4 en un varón joven sin buscar cambios recíprocos ni repetir el ECG.',
      ),
      l(
        '以ST段起点而不是J点测量，或在心动过速时选错基线。',
        'Measuring at the wrong point (not the J point) or against a sloping baseline in tachycardia.',
        'Medir en el punto equivocado (no en el punto J) o respecto a una línea de base inclinada en la taquicardia.',
      ),
    ],
    urgency: STEMI_NOW,
    lessons: ['i1', 'i2', 'i3'],
    sources: [REF.udmi2018, REF.escAcs2023, REF.wagner2009, R.engelen1999, R.zimetbaum2003, R.driver2017, R.klein2015, R.ghadri2018],
    aka: ['anterior STEMI', 'LAD occlusion', 'anterior OMI', 'IAMCEST anterior', 'IAM anterior', '前壁心梗', '前壁STEMI', 'tombstone'],
    exemplar: { scenarios: ['stemi-anterior'], leads: ['V1', 'V2', 'V3', 'V4', 'III', 'aVF'] },
  },

  // ── acute anteroseptal STEMI ─────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'stemi-anteroseptal',
    definition: l(
      'ST段抬高局限于V1–V3（可至V4），Ⅰ、aVL不抬高，多为第一对角支以远的前降支闭塞。',
      'ST elevation confined to V1–V3 (sometimes V4) without elevation in I and aVL, usually from an LAD occlusion beyond the first diagonal branch.',
      'Elevación del ST limitada a V1–V3 (a veces V4) sin elevación en I ni aVL, habitualmente por oclusión de la DA distal a la primera diagonal.',
    ),
    features: [
      l(
        'V1–V3 ST段抬高达到阈值（V2–V3按性别和年龄判断）。',
        'ST elevation in V1–V3 above threshold (V2–V3 judged by sex and age).',
        'Elevación del ST en V1–V3 por encima del umbral (V2–V3 según sexo y edad).',
      ),
      l(
        'Ⅰ和aVL无抬高，甚至轻度压低：高侧壁未受累。',
        'No ST elevation in I and aVL, sometimes slight depression: the high lateral wall is spared.',
        'Sin elevación en I ni aVL, a veces con ligero descenso: la cara lateral alta está respetada.',
      ),
      l(
        '下壁导联对应性压低小或没有——无对应性改变并不能排除此处的闭塞。',
        'Reciprocal depression in the inferior leads is small or absent, so its absence does not exclude occlusion here.',
        'El descenso recíproco en las inferiores es pequeño o falta, así que su ausencia no excluye aquí una oclusión.',
      ),
      l(
        'V1抬高最明显并伴新发右束支阻滞时，提示闭塞位于第一间隔支之前。',
        'Marked ST elevation in V1 with a new RBBB points to an occlusion before the first septal branch.',
        'Una elevación marcada en V1 con BRD nuevo apunta a una oclusión antes de la primera septal.',
      ),
    ],
    criteria: [
      STE_THRESHOLDS,
      {
        label: l('闭塞部位', 'Occlusion site', 'Lugar de la oclusión'),
        value: l(
          'V1–V3抬高而Ⅰ、aVL不抬高：第一对角支以远；另有aVR抬高、V1抬高>2.5 mm或新发右束支阻滞：第一间隔支之前',
          'V1–V3 elevation without elevation in I/aVL: beyond the first diagonal; added ST elevation in aVR, V1 > 2.5 mm or a new RBBB: before the first septal',
          'Elevación en V1–V3 sin elevación en I/aVL: distal a la primera diagonal; si además hay elevación en aVR, V1 > 2,5 mm o BRD nuevo: antes de la primera septal',
        ),
        source: 'Engelen 1999',
      },
    ],
    mechanism: l(
      '前降支在第一对角支之后闭塞时，损伤区位于室间隔和面向V1–V3的前壁，ST向量指向前方并略偏右。Ⅰ和aVL面对的高侧壁血供保留，因此这些导联没有ST段抬高。',
      'When the LAD is blocked after its first diagonal branch, the injured zone is the septum and the anterior wall facing V1–V3, so the ST vector points forward and slightly to the right. Leads I and aVL face the high lateral wall, which keeps its blood supply, so they show no ST elevation.',
      'Cuando la DA se ocluye después de la primera diagonal, la zona lesionada es el tabique y la cara anterior que miran V1–V3, por lo que el vector del ST apunta hacia delante y algo a la derecha. Las derivaciones I y aVL miran la cara lateral alta, que conserva su riego, y no muestran elevación del ST.',
    ),
    mimics: [
      {
        id: 'lvh-strain',
        discriminator: l(
          '左心室肥厚时V1–V3凹面抬高与深S波成比例，伴侧壁高电压和继发性ST-T改变。',
          'In LVH the concave V1–V3 elevation is proportionate to deep S waves, with high lateral voltage and secondary ST–T changes.',
          'En la HVI la elevación cóncava en V1–V3 es proporcionada a S profundas, con voltaje lateral alto y alteraciones secundarias del ST-T.',
        ),
        leads: ['V1', 'V2', 'V3', 'V5', 'V6'],
      },
      {
        id: 'brugada-type1',
        discriminator: l(
          'Brugada为V1–V2穹窿形抬高后接对称倒置T波，V3通常正常，无对应性改变、无演变。',
          'Brugada type 1 is a coved elevation in V1–V2 that descends into a symmetric negative T, with V3 usually normal, no reciprocity and no evolution.',
          'El Brugada tipo 1 es una elevación en cúpula en V1–V2 que desciende hacia una T negativa simétrica, con V3 normal, sin cambios recíprocos ni evolución.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
      {
        id: 'lbbb',
        discriminator: l(
          '左束支阻滞QRS≥120 ms，V1–V3的ST抬高与深S波方向相反且成比例。',
          'In LBBB the QRS is ≥ 120 ms and the V1–V3 ST elevation is discordant to, and proportionate with, deep S waves.',
          'En el BRI el QRS mide ≥ 120 ms y la elevación en V1–V3 es discordante y proporcionada a S profundas.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
      {
        id: 'rv-infarction',
        discriminator: l(
          '右心室梗死时V1抬高最大、向V3减小，并伴下壁STEMI；前间壁闭塞时抬高向V3增大。',
          'In RV infarction the elevation is largest in V1 and fades toward V3, with an inferior STEMI; in anteroseptal occlusion it grows toward V3.',
          'En el infarto del VD la elevación es máxima en V1 y disminuye hacia V3, con IAMCEST inferior; en la oclusión anteroseptal aumenta hacia V3.',
        ),
        leads: ['V1', 'V2', 'V3', 'V4R'],
      },
    ],
    pitfalls: [
      l(
        '以为“仅间隔受累”就不那么紧急——这仍是前降支急性闭塞。',
        'Treating “only septal” elevation as less urgent: it is still an acutely occluded LAD.',
        'Considerar menos urgente una elevación «solo septal»: sigue siendo una DA ocluida.',
      ),
      l(
        '对女性V2–V3仍套用2 mm阈值，漏掉1.5–2 mm的抬高。',
        'Applying the 2 mm limit to women in V2–V3 and missing 1.5–2 mm elevation.',
        'Aplicar el umbral de 2 mm a mujeres en V2–V3 y pasar por alto una elevación de 1,5–2 mm.',
      ),
    ],
    urgency: STEMI_NOW,
    lessons: ['i2', 'i3'],
    sources: [REF.udmi2018, REF.escAcs2023, R.engelen1999, R.bayes2006, REF.wagner2009],
    aka: ['anteroseptal STEMI', 'septal STEMI', 'IAMCEST anteroseptal', '前间壁心梗', '前间壁STEMI'],
    exemplar: { scenarios: ['stemi-anteroseptal'], leads: ['V1', 'V2', 'V3', 'I', 'aVL'] },
  },

  // ── acute anterolateral STEMI ────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'stemi-anterolateral',
    definition: l(
      '前壁和侧壁导联（V3–V6及Ⅰ、aVL）ST段抬高，见于前降支近段或前降支加对角支闭塞，梗死范围大。',
      'ST elevation across the anterior and lateral leads (V3–V6 with I and aVL), from a proximal LAD or LAD-plus-diagonal occlusion that threatens a large territory.',
      'Elevación del ST en las derivaciones anteriores y laterales (V3–V6 con I y aVL), por oclusión de la DA proximal o de la DA con la diagonal, que amenaza un territorio extenso.',
    ),
    features: [
      l('V3–V6以及Ⅰ、aVL导联ST段抬高。', 'ST elevation in V3–V6 and in I and aVL.', 'Elevación del ST en V3–V6 y en I y aVL.'),
      l(
        'Ⅲ、aVF对应性ST段压低，常以Ⅲ最深。',
        'Reciprocal ST depression in III and aVF, usually deepest in III.',
        'Descenso recíproco del ST en III y aVF, casi siempre máximo en III.',
      ),
      l(
        'V1–V6全部抬高加Ⅰ、aVL：广泛前壁，提示前降支近段闭塞。',
        'Elevation from V1 to V6 plus I and aVL means an extensive anterior infarction from a proximal LAD occlusion.',
        'Elevación de V1 a V6 más I y aVL indica un infarto anterior extenso por oclusión proximal de la DA.',
      ),
      l(
        '注意新出现的束支或分支阻滞及房室传导阻滞——提示大面积受累。',
        'Watch for a new bundle branch block, fascicular block or AV block: they signal a large territory.',
        'Vigila un bloqueo de rama, fascicular o AV nuevo: indican un territorio extenso.',
      ),
    ],
    criteria: [
      STE_THRESHOLDS,
      {
        label: l('高侧壁抬高的对应导联', 'Mirror of high lateral elevation', 'Imagen especular de la elevación lateral alta'),
        value: l('Ⅰ、aVL抬高时Ⅲ（≥aVF）对应性压低', 'ST depression in III (≥ aVF) when I and aVL are elevated', 'Descenso del ST en III (≥ aVF) cuando I y aVL están elevadas'),
        source: 'Wagner 2009 (AHA Part VI); Zimetbaum 2003',
      },
    ],
    mechanism: l(
      '闭塞区覆盖前壁、心尖和侧壁，使ST向量指向左前方，即V3–V6、Ⅰ和aVL。下壁导联尤其是Ⅲ从背面记录同一向量，因此出现对应性ST段压低。',
      'A large occluded territory spanning the anterior wall, the apex and the lateral wall turns the ST vector leftward and forward, toward V3–V6, I and aVL. The inferior leads, especially III, record the same vector from behind and show reciprocal ST depression.',
      'Un territorio ocluido amplio que abarca la cara anterior, la punta y la cara lateral orienta el vector del ST hacia la izquierda y adelante, hacia V3–V6, I y aVL. Las derivaciones inferiores, sobre todo III, registran el mismo vector desde detrás y muestran descenso recíproco.',
    ),
    mimics: [
      {
        id: 'pericarditis',
        discriminator: l(
          '心包炎为广泛凹面抬高（含Ⅱ、Ⅲ、aVF）伴PR段压低，除aVR、V1外无对应性压低。',
          'Pericarditis gives widespread concave elevation (including II, III and aVF) with PR depression and no reciprocal depression except in aVR and V1.',
          'La pericarditis produce elevación cóncava difusa (incluidas II, III y aVF) con descenso del PR y sin descenso recíproco salvo en aVR y V1.',
        ),
        leads: ['II', 'III', 'aVF', 'aVR'],
      },
      {
        id: 'stemi-lateral',
        discriminator: l(
          '单纯侧壁闭塞时V3–V4不抬高，仅Ⅰ、aVL、V5–V6受累。',
          'An isolated lateral occlusion spares V3–V4 and involves only I, aVL and V5–V6.',
          'Una oclusión lateral aislada respeta V3–V4 y afecta solo a I, aVL y V5–V6.',
        ),
        leads: ['V3', 'V4', 'V5', 'V6'],
      },
      {
        id: 'takotsubo',
        discriminator: l(
          'Takotsubo抬高广泛但对应性压低少，常伴后期深倒T波和QT延长；仍需造影鉴别。',
          'Takotsubo elevation is widespread with little reciprocal depression and later deep T inversion with a long QT; angiography is still needed.',
          'La elevación del tako-tsubo es extensa con poco descenso recíproco y luego T negativas profundas con QT largo; sigue siendo necesaria la coronariografía.',
        ),
        leads: ['V2', 'V3', 'V4', 'V5', 'III'],
      },
    ],
    pitfalls: [
      l(
        '因为受累导联多就诊断为心包炎——先看Ⅲ、aVF有无对应性压低。',
        'Calling it pericarditis because many leads are involved: first look for reciprocal depression in III and aVF.',
        'Diagnosticar pericarditis porque hay muchas derivaciones afectadas: busca primero el descenso recíproco en III y aVF.',
      ),
    ],
    urgency: STEMI_NOW,
    lessons: ['i2', 'i3', 'i5'],
    sources: [REF.udmi2018, REF.escAcs2023, REF.wagner2009, R.zimetbaum2003, REF.adler2015],
    aka: ['anterolateral STEMI', 'extensive anterior STEMI', 'IAMCEST anterolateral', 'IAMCEST anterior extenso', '前侧壁心梗', '广泛前壁心梗'],
    exemplar: { scenarios: ['stemi-anterolateral'], leads: ['V3', 'V4', 'V5', 'V6', 'I', 'aVL', 'III'] },
  },

  // ── acute inferior STEMI ─────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'stemi-inferior',
    definition: l(
      '右冠状动脉（或较少见的回旋支）急性闭塞，表现为Ⅱ、Ⅲ、aVF新出现的ST段抬高。',
      'Acute occlusion of the right coronary artery (or, less often, the circumflex), shown by new ST elevation in II, III and aVF.',
      'Oclusión aguda de la coronaria derecha (o, con menos frecuencia, de la circunfleja), que se manifiesta con elevación nueva del ST en II, III y aVF.',
    ),
    features: [
      l('Ⅱ、Ⅲ、aVF中≥2个导联ST段抬高≥1 mm。', 'ST elevation ≥ 1 mm in ≥ 2 of II, III and aVF.', 'Elevación del ST ≥ 1 mm en ≥ 2 de II, III y aVF.'),
      l(
        '看aVL：对应性ST段压低常最早出现，甚至早于下壁抬高变得明显。',
        'Look at aVL: reciprocal ST depression there is often the earliest sign, even before the inferior elevation is obvious.',
        'Mira aVL: el descenso recíproco suele ser el signo más precoz, incluso antes de que la elevación inferior sea evidente.',
      ),
      l(
        '定罪犯血管：Ⅲ抬高>Ⅱ且Ⅰ压低提示右冠；Ⅱ≥Ⅲ、Ⅰ等电位或抬高、V5–V6抬高提示回旋支。',
        'Name the culprit: III > II with ST depression in I suggests the RCA; II ≥ III with I isoelectric or raised and ST elevation in V5–V6 suggests the circumflex.',
        'Identifica la culpable: III > II con descenso en I sugiere la coronaria derecha; II ≥ III con I isoeléctrica o elevada y elevación en V5–V6 sugiere la circunfleja.',
      ),
      l(
        'V1–V3 ST段压低提示后壁受累，加做V7–V9；V1抬高提示右心室受累，加做V3R–V4R。',
        'ST depression in V1–V3 suggests posterior extension (record V7–V9); ST elevation in V1 suggests RV involvement (record V3R–V4R).',
        'El descenso del ST en V1–V3 sugiere extensión posterior (registra V7–V9); la elevación en V1 sugiere afectación del VD (registra V3R–V4R).',
      ),
      l(
        '注意心动过缓和房室传导阻滞（房室结多由右冠供血）。',
        'Watch for bradycardia and AV block (the AV node is usually supplied by the RCA).',
        'Vigila la bradicardia y el bloqueo AV (el nodo AV suele depender de la coronaria derecha).',
      ),
    ],
    criteria: [
      STE_THRESHOLDS,
      {
        label: l('右冠与回旋支', 'RCA vs circumflex', 'Coronaria derecha frente a circunfleja'),
        value: l(
          '右冠：Ⅲ抬高>Ⅱ，Ⅰ、aVL压低；回旋支：Ⅱ≥Ⅲ，Ⅰ等电位或抬高',
          'RCA: ST elevation III > II with depression in I and aVL; circumflex: II ≥ III with I isoelectric or elevated',
          'Coronaria derecha: elevación III > II con descenso en I y aVL; circunfleja: II ≥ III con I isoeléctrica o elevada',
        ),
        source: 'Zimetbaum 2003; Wagner 2009 (AHA Part VI)',
      },
      {
        label: l('附加导联', 'Extra leads', 'Derivaciones adicionales'),
        value: l(
          '每例下壁STEMI加做V3R/V4R（≥0.5 mm；<30岁男性≥1 mm）和V7–V9（≥0.5 mm；<40岁男性≥1 mm）',
          'In every inferior STEMI record V3R/V4R (≥ 0.5 mm; ≥ 1 mm in men < 30 y) and V7–V9 (≥ 0.5 mm; ≥ 1 mm in men < 40 y)',
          'En todo IAMCEST inferior registra V3R/V4R (≥ 0,5 mm; ≥ 1 mm en varones < 30 años) y V7–V9 (≥ 0,5 mm; ≥ 1 mm en varones < 40 años)',
        ),
        source: 'Thygesen 2018 (UDMI §28); Byrne 2023 (ESC ACS)',
      },
    ],
    mechanism: l(
      '右冠或回旋支闭塞使下壁受损，其ST向量指向下方，即Ⅱ、Ⅲ、aVF。aVL朝向相反方向，因此记录到对应性ST段压低，而且常在下壁抬高明显之前出现。',
      'An occluded right coronary or circumflex artery injures the inferior wall, and its ST vector points downward toward II, III and aVF. Lead aVL faces the opposite direction, so it records reciprocal ST depression, often before the inferior elevation is obvious.',
      'La oclusión de la coronaria derecha o de la circunfleja lesiona la cara inferior, y su vector del ST apunta hacia abajo, hacia II, III y aVF. La derivación aVL mira en sentido opuesto y registra un descenso recíproco del ST, a menudo antes de que la elevación inferior sea evidente.',
    ),
    mimics: [
      {
        id: 'pericarditis',
        discriminator: l(
          '心包炎抬高广泛、Ⅱ常>Ⅲ、伴PR段压低，aVL没有ST段压低。',
          'Pericarditis gives widespread elevation, usually II > III, with PR depression and no ST depression in aVL.',
          'La pericarditis da una elevación difusa, generalmente II > III, con descenso del PR y sin descenso del ST en aVL.',
        ),
        leads: ['II', 'III', 'aVL', 'aVR'],
      },
      {
        id: 'early-repolarization',
        discriminator: l(
          '下壁早期复极为J点切迹伴凹面轻度抬高，aVL无对应性压低，复查无变化。',
          'Inferior early repolarization is a notched J point with mild concave elevation, no reciprocal depression in aVL and no change on repeat ECGs.',
          'La repolarización precoz inferior es una muesca en J con elevación cóncava leve, sin descenso recíproco en aVL y sin cambios en ECG repetidos.',
        ),
        leads: ['II', 'III', 'aVF', 'aVL'],
      },
      {
        id: 'old-mi-inferior',
        discriminator: l(
          '陈旧性下壁梗死有Q波但ST段在基线，与旧图一致；急性闭塞有新的抬高和对应性改变。',
          'An old inferior infarction has Q waves with the ST at baseline, unchanged from old tracings; acute occlusion has new elevation and reciprocity.',
          'Un infarto inferior antiguo tiene ondas Q con el ST en la línea de base, sin cambios respecto a trazados antiguos; la oclusión aguda tiene elevación nueva y cambios recíprocos.',
        ),
        leads: ['II', 'III', 'aVF'],
      },
    ],
    pitfalls: [
      l(
        '忽视aVL轻微的ST段压低或T波倒置——它可能是下壁闭塞的唯一早期线索。',
        'Ignoring subtle ST depression or T inversion in aVL, which can be the only early clue to an inferior occlusion.',
        'Ignorar un descenso sutil del ST o una T negativa en aVL, que puede ser la única pista precoz de una oclusión inferior.',
      ),
      l(
        '未加做右胸和后壁导联，漏诊右心室或后壁受累。',
        'Not recording right-sided and posterior leads, and so missing RV or posterior involvement.',
        'No registrar derivaciones derechas ni posteriores y pasar por alto la afectación del VD o de la cara posterior.',
      ),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '立即启动直接PCI流程；同时加做V3R/V4R和V7–V9，监测心动过缓和房室传导阻滞，右心室受累或低血压时避免硝酸酯。',
        'Activate the primary PCI pathway now; record V3R/V4R and V7–V9, watch for bradycardia and AV block, and avoid nitrates if the RV is involved or the patient is hypotensive.',
        'Activa ya el circuito de ICP primaria; registra V3R/V4R y V7–V9, vigila la bradicardia y el bloqueo AV y evita los nitratos si hay afectación del VD o hipotensión.',
      ),
    },
    lessons: ['i2', 'i4'],
    sources: [REF.udmi2018, REF.escAcs2023, REF.wagner2009, R.zimetbaum2003, REF.macfarlane2015],
    aka: ['inferior STEMI', 'RCA occlusion', 'inferior OMI', 'IAMCEST inferior', 'IAM inferior', '下壁心梗', '下壁STEMI'],
    exemplar: { scenarios: ['stemi-inferior'], leads: ['II', 'III', 'aVF', 'aVL', 'I'] },
  },

  // ── acute lateral STEMI ──────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'stemi-lateral',
    definition: l(
      '侧壁导联（Ⅰ、aVL、V5–V6）ST段抬高，多为回旋支或钝缘支闭塞。',
      'ST elevation in the lateral leads (I, aVL, V5–V6), usually from a circumflex or obtuse marginal occlusion.',
      'Elevación del ST en las derivaciones laterales (I, aVL, V5–V6), habitualmente por oclusión de la circunfleja o de una obtusa marginal.',
    ),
    features: [
      l(
        'Ⅰ、aVL和/或V5–V6中≥2个相邻导联ST段抬高≥1 mm——幅度常很小。',
        'ST elevation ≥ 1 mm in ≥ 2 contiguous leads among I, aVL and V5–V6, often small.',
        'Elevación del ST ≥ 1 mm en ≥ 2 derivaciones contiguas entre I, aVL y V5–V6, a menudo pequeña.',
      ),
      l(
        '对应性改变：Ⅲ、aVF压低，常伴V1–V3压低（后外侧受累）。',
        'Reciprocal change: depression in III and aVF, often with depression in V1–V3 (posterolateral involvement).',
        'Cambio recíproco: descenso en III y aVF, a menudo con descenso en V1–V3 (afectación posterolateral).',
      ),
      l(
        '回旋支闭塞在12导联上常表现轻微甚至“正常”——症状持续时加做V7–V9并复查。',
        'Circumflex occlusions are often subtle or even “normal” on the 12 leads: with ongoing symptoms record V7–V9 and repeat the ECG.',
        'Las oclusiones de la circunfleja suelen ser sutiles o incluso «normales» en las 12 derivaciones: si los síntomas persisten, registra V7–V9 y repite el ECG.',
      ),
    ],
    criteria: [
      STE_THRESHOLDS,
      {
        label: l('回旋支闭塞的敏感性', 'Sensitivity for circumflex occlusion', 'Sensibilidad para la oclusión de la circunfleja'),
        value: l(
          'STEMI毫米标准漏诊相当比例的急性闭塞，回旋支尤甚；注意V1–V3压低和细微侧壁抬高',
          'STEMI millimetre criteria miss a sizeable share of acute occlusions, circumflex most of all; look for V1–V3 depression and subtle lateral elevation',
          'Los criterios milimétricos de IAMCEST no detectan una parte importante de las oclusiones agudas, sobre todo de la circunfleja; busca descenso en V1–V3 y elevación lateral sutil',
        ),
        source: 'Meyers 2021; Byrne 2023 (ESC ACS)',
      },
    ],
    mechanism: l(
      '回旋支供应侧壁和后侧壁，这些部位远离大多数胸前电极，只有Ⅰ、aVL、V5和V6面对它们。因此其损伤向量在常规12导联上很小且常指向后方，这正是侧壁闭塞最常被漏诊的原因。',
      'The circumflex supplies the lateral and posterolateral wall, which lies far from most chest electrodes and faces only I, aVL, V5 and V6. Its injury vector is therefore small on the standard 12 leads and often points backward, which is why lateral occlusions are the ones most often missed.',
      'La circunfleja irriga la cara lateral y posterolateral, que queda lejos de la mayoría de los electrodos precordiales y solo la miran I, aVL, V5 y V6. Por eso su vector de lesión es pequeño en las 12 derivaciones habituales y a menudo apunta hacia atrás, lo que explica que las oclusiones laterales sean las que más se pasan por alto.',
    ),
    mimics: [
      {
        id: 'stemi-high-lateral',
        discriminator: l(
          '高侧壁闭塞只累及Ⅰ、aVL（可伴V2），V5–V6不抬高。',
          'A high lateral occlusion involves only I and aVL (sometimes V2), sparing V5–V6.',
          'La oclusión lateral alta afecta solo a I y aVL (a veces V2) y respeta V5–V6.',
        ),
        leads: ['I', 'aVL', 'V5', 'V6'],
      },
      {
        id: 'lvh-strain',
        discriminator: l(
          '左心室肥厚的侧壁导联为ST段压低伴不对称T倒置和高电压，而不是抬高。',
          'LVH shows lateral ST depression with asymmetric T inversion and high voltage, not elevation.',
          'La HVI muestra descenso del ST lateral con T negativa asimétrica y voltaje alto, no elevación.',
        ),
        leads: ['I', 'aVL', 'V5', 'V6'],
      },
      {
        id: 'pericarditis',
        discriminator: l(
          '心包炎抬高同时见于下壁和胸前导联，伴PR段压低，无下壁对应性压低。',
          'In pericarditis the elevation also involves the inferior and chest leads, with PR depression and no inferior reciprocal depression.',
          'En la pericarditis la elevación afecta también a las inferiores y precordiales, con descenso del PR y sin descenso recíproco inferior.',
        ),
        leads: ['II', 'III', 'aVF', 'V5', 'V6'],
      },
    ],
    pitfalls: [
      l(
        '期待回旋支闭塞产生大幅ST抬高；1 mm的侧壁抬高伴下壁压低已足以考虑闭塞。',
        'Expecting large ST elevation from a circumflex occlusion; 1 mm of lateral elevation with inferior depression is enough to suspect it.',
        'Esperar una gran elevación del ST en la oclusión de la circunfleja; 1 mm de elevación lateral con descenso inferior basta para sospecharla.',
      ),
    ],
    urgency: STEMI_NOW,
    lessons: ['i2', 'i5'],
    sources: [REF.udmi2018, REF.escAcs2023, R.meyers2021, REF.wagner2009, REF.adler2015],
    aka: ['lateral STEMI', 'circumflex occlusion', 'LCx', 'IAMCEST lateral', '侧壁心梗', '回旋支闭塞'],
    exemplar: { scenarios: ['stemi-lateral'], leads: ['I', 'aVL', 'V5', 'V6', 'III'] },
  },

  // ── acute high lateral STEMI ─────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'stemi-high-lateral',
    definition: l(
      'ST段抬高局限于Ⅰ、aVL（常伴V2），Ⅲ对应性压低，多为第一对角支或钝缘支闭塞（“南非国旗”征）。',
      'ST elevation limited to I and aVL (often with V2) and reciprocal depression in III, usually from a first diagonal or obtuse marginal occlusion (the “South African flag” sign).',
      'Elevación del ST limitada a I y aVL (a menudo con V2) con descenso recíproco en III, habitualmente por oclusión de la primera diagonal o de una obtusa marginal (signo de la «bandera sudafricana»).',
    ),
    features: [
      l(
        'Ⅰ和aVL ST段抬高——因这两个导联QRS小，抬高也常很小。',
        'ST elevation in I and aVL: often small, because these leads have small QRS complexes.',
        'Elevación del ST en I y aVL: a menudo pequeña, porque estas derivaciones tienen QRS pequeños.',
      ),
      l(
        'Ⅲ（及aVF）对应性压低常比抬高更醒目——发现孤立的下壁压低时先看aVL。',
        'Reciprocal depression in III (and aVF) is often more striking than the elevation: when you see isolated inferior depression, look at aVL first.',
        'El descenso recíproco en III (y aVF) suele ser más llamativo que la elevación: ante un descenso inferior aislado, mira primero aVL.',
      ),
      l(
        '第一对角支闭塞：V2也抬高而V3–V6相对正常；在3×4排版上，Ⅰ、aVL、V2抬高与Ⅲ压低组成“国旗”图案。',
        'First diagonal occlusion: V2 is raised too while V3–V6 are relatively spared; on the 3 × 4 layout, I, aVL and V2 up with III down form the “flag”.',
        'Oclusión de la primera diagonal: V2 también se eleva mientras V3–V6 quedan relativamente respetadas; en el formato 3 × 4, I, aVL y V2 elevadas con III descendida forman la «bandera».',
      ),
      l(
        '按比例判断：QRS仅3 mm的aVL出现1 mm抬高已经很大。',
        'Judge by proportion: 1 mm of elevation in an aVL whose QRS is 3 mm tall is large.',
        'Valora la proporción: 1 mm de elevación en una aVL cuyo QRS mide 3 mm es mucho.',
      ),
    ],
    criteria: [
      STE_THRESHOLDS,
      {
        label: l('“南非国旗”征', '“South African flag” sign', 'Signo de la «bandera sudafricana»'),
        value: l(
          'Ⅰ、aVL、V2抬高伴Ⅲ（±Ⅱ、aVF）压低，V3–V6相对不受累',
          'ST elevation in I, aVL and V2 with depression in III (± II, aVF) and V3–V6 relatively spared',
          'Elevación del ST en I, aVL y V2 con descenso en III (± II, aVF) y V3–V6 relativamente respetadas',
        ),
        source: 'Littmann 2016; Durant 2015',
      },
    ],
    mechanism: l(
      '第一对角支或钝缘支供应左心室高前侧壁，其损伤向量指向左上方，即Ⅰ和aVL。Ⅲ导联几乎正好指向相反方向，因此记录到常比抬高更大的镜像压低。',
      'The first diagonal or an obtuse marginal branch supplies the high anterolateral wall, whose injury vector points up and to the left toward I and aVL. Lead III points almost exactly the other way, so it records a mirror-image depression that is often larger than the elevation.',
      'La primera diagonal o una obtusa marginal irrigan la cara anterolateral alta, cuyo vector de lesión apunta hacia arriba y a la izquierda, hacia I y aVL. La derivación III apunta casi exactamente en sentido contrario y registra un descenso especular a menudo mayor que la elevación.',
    ),
    mimics: [
      {
        id: 'st-depression-ischemic',
        discriminator: l(
          '只要Ⅰ或aVL有任何抬高，下壁压低就是对应性改变；原发缺血性压低时aVL不抬高。',
          'Any ST elevation in I or aVL makes the inferior depression reciprocal; in primary ischaemic depression aVL is not elevated.',
          'Cualquier elevación del ST en I o aVL convierte el descenso inferior en recíproco; en el descenso isquémico primario aVL no está elevada.',
        ),
        leads: ['I', 'aVL', 'III', 'aVF'],
      },
      {
        id: 'stemi-lateral',
        discriminator: l(
          '侧壁（回旋支）闭塞累及V5–V6；高侧壁闭塞V5–V6不受累。',
          'A lateral (circumflex) occlusion involves V5–V6; a high lateral occlusion spares them.',
          'Una oclusión lateral (circunfleja) afecta a V5–V6; la lateral alta las respeta.',
        ),
        leads: ['V5', 'V6'],
      },
      {
        id: 'lvh-strain',
        discriminator: l(
          '左心室肥厚时Ⅰ、aVL为ST压低伴不对称T倒置，高电压，而不是抬高。',
          'In LVH, I and aVL show ST depression with asymmetric T inversion and high voltage, not elevation.',
          'En la HVI, I y aVL muestran descenso del ST con T negativa asimétrica y voltaje alto, no elevación.',
        ),
        leads: ['I', 'aVL'],
      },
    ],
    pitfalls: [
      l(
        '把Ⅲ、aVF压低当作“下壁缺血”，而忽视aVL的轻微抬高。',
        'Reading the depression in III and aVF as “inferior ischaemia” and overlooking subtle elevation in aVL.',
        'Interpretar el descenso en III y aVF como «isquemia inferior» y pasar por alto una elevación sutil en aVL.',
      ),
      l(
        '因Ⅰ、aVL抬高不足1 mm而放弃——应与其QRS大小比较并复查。',
        'Dismissing elevation in I and aVL because it is under 1 mm: compare it with the QRS size and repeat the ECG.',
        'Descartar la elevación en I y aVL por ser menor de 1 mm: compárala con el tamaño del QRS y repite el ECG.',
      ),
    ],
    urgency: STEMI_NOW,
    lessons: ['i5', 'i7'],
    sources: [REF.udmi2018, REF.escAcs2023, R.littmann2016, R.durant2015, REF.wagner2009],
    aka: ['high lateral STEMI', 'South African flag', 'D1 occlusion', 'bandera sudafricana', 'IAMCEST lateral alto', '高侧壁心梗', '南非国旗征'],
    exemplar: { scenarios: ['stemi-high-lateral'], leads: ['I', 'aVL', 'V2', 'III'] },
  },

  // ── acute posterior MI (STEMI equivalent) ────────────────────────────────────────────────────────────────────────
  {
    id: 'stemi-posterior',
    definition: l(
      '后侧壁急性闭塞（多为回旋支），在12导联上表现为V1–V3（V4）ST段压低，在V7–V9表现为ST段抬高，属STEMI等危症。',
      'Acute occlusion of the posterolateral wall (usually the circumflex) that appears as ST depression in V1–V3 (V4) on the 12 leads and as ST elevation in V7–V9, a STEMI equivalent.',
      'Oclusión aguda de la cara posterolateral (habitualmente la circunfleja) que aparece como descenso del ST en V1–V3 (V4) en las 12 derivaciones y como elevación en V7–V9, un equivalente de IAMCEST.',
    ),
    features: [
      l(
        'V1–V4水平型ST段压低，常以V2–V3最深，终末T波直立。',
        'Horizontal ST depression in V1–V4, usually deepest in V2–V3, with an upright terminal T wave.',
        'Descenso horizontal del ST en V1–V4, habitualmente máximo en V2–V3, con T terminal positiva.',
      ),
      l(
        '把V1–V3“翻过来”看：压低变成抬高，高R波变成Q波——这就是后壁的镜像。',
        'Flip V1–V3 in your mind: the depression becomes elevation and the tall R becomes a Q, the mirror image of the posterior wall.',
        'Da la vuelta mentalmente a V1–V3: el descenso se convierte en elevación y la R alta en una Q, la imagen especular de la cara posterior.',
      ),
      l(
        '数小时后V1–V2出现宽而高的R波（R/S≥1）。',
        'After hours, broad tall R waves develop in V1–V2 (R/S ≥ 1).',
        'Al cabo de horas aparecen R anchas y altas en V1–V2 (R/S ≥ 1).',
      ),
      l(
        '加做V7–V9：ST段抬高≥0.5 mm（<40岁男性≥1 mm）即可确诊。',
        'Record V7–V9: ST elevation ≥ 0.5 mm (≥ 1 mm in men < 40 y) confirms it.',
        'Registra V7–V9: una elevación del ST ≥ 0,5 mm (≥ 1 mm en varones < 40 años) lo confirma.',
      ),
      l('常与下壁或侧壁抬高并存（下后壁、后侧壁）。', 'Often accompanies inferior or lateral elevation (inferoposterior, posterolateral).', 'Suele acompañar a una elevación inferior o lateral (inferoposterior, posterolateral).'),
    ],
    criteria: [
      {
        label: l('后壁闭塞（急性）', 'Posterior occlusion (acute)', 'Oclusión posterior (aguda)'),
        value: l(
          'V1–V3孤立ST段压低≥0.5 mm伴终末T波直立；V7–V9 ST抬高≥0.5 mm（<40岁男性≥1 mm）',
          'Isolated ST depression ≥ 0.5 mm in V1–V3 with an upright terminal T; ST elevation ≥ 0.5 mm in V7–V9 (≥ 1 mm in men < 40 y)',
          'Descenso aislado del ST ≥ 0,5 mm en V1–V3 con T terminal positiva; elevación del ST ≥ 0,5 mm en V7–V9 (≥ 1 mm en varones < 40 años)',
        ),
        source: 'Thygesen 2018 (UDMI §28); Byrne 2023 (ESC ACS §3.2.1)',
      },
      {
        label: l('V7–V9位置', 'V7–V9 placement', 'Colocación de V7–V9'),
        value: l(
          '与V6同一水平：腋后线、肩胛中线、左脊柱旁线',
          'At the level of V6: posterior axillary, mid-scapular and left paravertebral lines',
          'A la altura de V6: líneas axilar posterior, medioescapular y paravertebral izquierda',
        ),
        source: 'Kligfield 2007 (AHA Part I)',
      },
    ],
    mechanism: l(
      '没有常规导联正对后壁，因此指向后方的损伤向量只能被前方的V1–V3以ST段压低的形式记录。放在背部的V7–V9直接面对损伤区，记录到前方导联只能镜像显示的ST段抬高。',
      'No standard lead faces the posterior wall, so its injury vector, which points backward, is recorded from the front by V1–V3 as ST depression. Electrodes on the back (V7–V9) face the injury directly and show the ST elevation that the front leads only mirror.',
      'Ninguna derivación habitual mira la cara posterior, así que su vector de lesión, que apunta hacia atrás, lo registran desde delante V1–V3 como descenso del ST. Los electrodos de la espalda (V7–V9) miran directamente la lesión y muestran la elevación que las derivaciones anteriores solo reflejan en espejo.',
    ),
    mimics: [
      {
        id: 'st-depression-ischemic',
        discriminator: l(
          '这里压低以V1–V3（V4）最明显、T波直立、R波增高；非闭塞性缺血的压低多以V4–V6最明显，常伴T波低平或倒置。',
          'Here the depression is maximal in V1–V3 (V4) with upright T waves and growing R waves; non-occlusive ischaemia is usually maximal in V4–V6, often with flat or inverted T.',
          'Aquí el descenso es máximo en V1–V3 (V4) con T positivas y R crecientes; la isquemia sin oclusión suele ser máxima en V4–V6, a menudo con T aplanada o negativa.',
        ),
        leads: ['V1', 'V2', 'V3', 'V5', 'V6'],
      },
      {
        id: 'rbbb',
        discriminator: l(
          '右束支阻滞QRS≥120 ms，V1呈rsR′，ST-T压低是继发性的。',
          'RBBB has a QRS ≥ 120 ms with rsR′ in V1, and its ST–T depression is secondary.',
          'El BRD tiene QRS ≥ 120 ms con rsR′ en V1, y su descenso del ST-T es secundario.',
        ),
        leads: ['V1', 'V2'],
      },
      {
        id: 'rvh',
        discriminator: l(
          '右心室肥厚的V1高R伴电轴右偏、右胸导联T波倒置，为慢性稳定图形。',
          'RVH gives a tall R in V1 with right axis deviation and T inversion in the right chest leads, a stable chronic pattern.',
          'La HVD da una R alta en V1 con desviación del eje a la derecha y T negativas en precordiales derechas, un patrón crónico y estable.',
        ),
        leads: ['V1', 'V2', 'I', 'aVF'],
      },
    ],
    pitfalls: [
      l(
        '把V1–V3压低诊断为“前壁缺血/NSTEMI”而延误再灌注。',
        'Calling V1–V3 depression “anterior ischaemia / NSTEMI” and delaying reperfusion.',
        'Llamar «isquemia anterior / IAMSEST» al descenso en V1–V3 y retrasar la reperfusión.',
      ),
      l(
        '不做V7–V9，或用1 mm阈值判断后壁导联——后壁导联离心脏远，电压低，阈值更低。',
        'Not recording V7–V9, or judging them with a 1 mm limit: posterior leads are far from the heart and have low voltage, so their threshold is lower.',
        'No registrar V7–V9, o juzgarlas con un umbral de 1 mm: las derivaciones posteriores están lejos del corazón y tienen poco voltaje, por eso su umbral es menor.',
      ),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '立即加做V7–V9（下壁受累时加V4R）；后壁导联抬高或症状持续伴此图形时，按STEMI处理，启动直接PCI。',
        'Record V7–V9 now (and V4R if the inferior wall is involved); if they show elevation, or the pattern persists with symptoms, manage as STEMI and activate primary PCI.',
        'Registra ya V7–V9 (y V4R si hay afectación inferior); si muestran elevación, o el patrón persiste con síntomas, trátalo como IAMCEST y activa la ICP primaria.',
      ),
    },
    lessons: ['i6', 'f5'],
    sources: [REF.udmi2018, REF.escAcs2023, REF.kligfield2007, R.bayes2006, R.meyers2021],
    aka: ['posterior STEMI', 'posterior OMI', 'inferobasal', 'V7-V9', 'IAM posterior', 'infarto posterior', '后壁心梗', '后壁STEMI'],
    exemplar: { scenarios: ['stemi-posterior'], leads: ['V1', 'V2', 'V3', 'V7', 'V8', 'V9'] },
  },

  // ── right ventricular infarction ─────────────────────────────────────────────────────────────────────────────────
  {
    id: 'rv-infarction',
    definition: l(
      '右冠近段闭塞累及右心室，表现为右胸导联V3R–V4R ST段抬高。',
      'Right ventricular involvement in a proximal RCA occlusion, shown by ST elevation in the right-sided leads V3R–V4R.',
      'Afectación del ventrículo derecho en una oclusión proximal de la coronaria derecha, que se manifiesta con elevación del ST en las derivaciones derechas V3R–V4R.',
    ),
    features: [
      l('下壁STEMI，Ⅲ抬高>Ⅱ（右冠近段）。', 'Inferior STEMI with III > II (proximal RCA).', 'IAMCEST inferior con III > II (coronaria derecha proximal).'),
      l(
        'V4R ST段抬高≥0.5 mm（<30岁男性≥1 mm）——抬高可能在数小时内消失，要早做。',
        'ST elevation ≥ 0.5 mm in V4R (≥ 1 mm in men < 30 y); it can vanish within hours, so record it early.',
        'Elevación del ST ≥ 0,5 mm en V4R (≥ 1 mm en varones < 30 años); puede desaparecer en horas, así que regístrala pronto.',
      ),
      l(
        'V1 ST段抬高，且V1抬高大于V2（或V2压低）。',
        'ST elevation in V1, larger than in V2 (or with V2 depressed).',
        'Elevación del ST en V1, mayor que en V2 (o con V2 descendida).',
      ),
      l(
        '临床：低血压、肺野清晰、颈静脉怒张；硝酸酯可致血压骤降。',
        'Clinically: hypotension, clear lungs and raised jugular venous pressure; nitrates can cause collapse.',
        'En la clínica: hipotensión, pulmones limpios e ingurgitación yugular; los nitratos pueden provocar un colapso.',
      ),
    ],
    criteria: [
      {
        label: l('右心室受累', 'RV involvement', 'Afectación del VD'),
        value: l('V3R/V4R ST抬高≥0.5 mm（<30岁男性≥1 mm）', 'ST elevation ≥ 0.5 mm in V3R/V4R (≥ 1 mm in men < 30 y)', 'Elevación del ST ≥ 0,5 mm en V3R/V4R (≥ 1 mm en varones < 30 años)'),
        source: 'Thygesen 2018 (UDMI §28); Byrne 2023 (ESC ACS)',
      },
      {
        label: l('V4R位置', 'V4R placement', 'Colocación de V4R'),
        value: l('右锁骨中线第5肋间（V4的镜像位置）', 'Right midclavicular line, 5th intercostal space (mirror of V4)', 'Línea medioclavicular derecha, 5.º espacio intercostal (espejo de V4)'),
        source: 'Kligfield 2007 (AHA Part I)',
      },
      {
        label: l('预后', 'Prognosis', 'Pronóstico'),
        value: l('下壁梗死伴V4R抬高者院内死亡和并发症更多', 'Inferior MI with V4R elevation carries more in-hospital death and complications', 'El infarto inferior con elevación en V4R se asocia a más mortalidad y complicaciones hospitalarias'),
        source: 'Zehender 1993',
      },
    ],
    mechanism: l(
      '右冠近段通过其锐缘支供应右心室游离壁，闭塞位于这些分支之前时，右心室和下壁同时受损。右胸导联位于右心室表面，记录到其ST段抬高；V1是常规导联中最靠近右心室的，有时也会抬高。',
      'The proximal right coronary artery feeds the right ventricular free wall through its marginal branches, so a block above them injures the right ventricle as well as the inferior wall. The right-sided leads lie over the right ventricle and record its ST elevation, which V1, the standard lead closest to the right ventricle, sometimes shows too.',
      'La coronaria derecha proximal irriga la pared libre del ventrículo derecho mediante sus ramas marginales, de modo que una oclusión por encima de ellas lesiona el ventrículo derecho además de la cara inferior. Las derivaciones derechas quedan sobre el ventrículo derecho y registran su elevación del ST, que a veces muestra también V1, la derivación habitual más cercana al ventrículo derecho.',
    ),
    mimics: [
      {
        id: 'stemi-anteroseptal',
        discriminator: l(
          '前间壁闭塞的抬高向V3增大且无下壁抬高；右心室梗死时V1>V2–V3，并伴下壁STEMI。',
          'Anteroseptal occlusion grows toward V3 with no inferior elevation; in RV infarction V1 > V2–V3 with an inferior STEMI.',
          'La oclusión anteroseptal crece hacia V3 sin elevación inferior; en el infarto del VD V1 > V2–V3 con IAMCEST inferior.',
        ),
        leads: ['V1', 'V2', 'V3', 'III'],
      },
      {
        id: 'brugada-type1',
        discriminator: l(
          'Brugada为V1–V2穹窿形抬高接倒置T波，无下壁STEMI、无演变。',
          'Brugada type 1 is a coved V1–V2 elevation into a negative T, without an inferior STEMI and without evolution.',
          'El Brugada tipo 1 es una elevación en cúpula en V1–V2 hacia una T negativa, sin IAMCEST inferior y sin evolución.',
        ),
        leads: ['V1', 'V2'],
      },
      {
        id: 'pulmonary-embolism',
        discriminator: l(
          '肺栓塞的右心负荷表现为窦速和V1–V4 T波倒置，没有下壁ST段抬高。',
          'Pulmonary embolism strains the RV with sinus tachycardia and T inversion in V1–V4, without inferior ST elevation.',
          'La embolia pulmonar sobrecarga el VD con taquicardia sinusal y T negativas en V1–V4, sin elevación inferior del ST.',
        ),
        leads: ['V1', 'V2', 'V3', 'V4', 'III'],
      },
    ],
    pitfalls: [
      l(
        '下壁STEMI不做右胸导联，到低血压时才想到右心室。',
        'Not recording right-sided leads in an inferior STEMI and only thinking of the RV when hypotension appears.',
        'No registrar derivaciones derechas en un IAMCEST inferior y pensar en el VD solo cuando aparece la hipotensión.',
      ),
      l(
        '把V3R/V4R的电极直接放在左侧原位，忘记重新标记导联。',
        'Placing the right-sided electrodes but leaving the leads labelled V3/V4, so the tracing is misread later.',
        'Colocar los electrodos derechos pero dejar las derivaciones rotuladas como V3/V4, con lo que el trazado se malinterpreta después.',
      ),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '按STEMI处理（直接PCI）；避免硝酸酯和利尿剂，低血压时补液，并监测房室传导阻滞和心动过缓。',
        'Manage as STEMI (primary PCI); avoid nitrates and diuretics, give fluids for hypotension, and watch for AV block and bradycardia.',
        'Trátalo como IAMCEST (ICP primaria); evita nitratos y diuréticos, administra líquidos si hay hipotensión y vigila el bloqueo AV y la bradicardia.',
      ),
    },
    lessons: ['i4', 'f5'],
    sources: [REF.udmi2018, REF.escAcs2023, REF.kligfield2007, R.zehender1993, R.zimetbaum2003],
    aka: ['RV infarction', 'right ventricular MI', 'V4R', 'infarto de ventrículo derecho', 'IAM de VD', '右室梗死', '右心室心梗'],
    exemplar: { scenarios: ['rv-infarction'], leads: ['V3R', 'V4R', 'V1', 'II', 'III', 'aVF'] },
  },

  // ── de Winter T waves ────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'de-winter',
    definition: l(
      '胸前导联J点上斜型压低，延续为高大对称的T波，没有ST段抬高——前降支近段闭塞的STEMI等危症。',
      'Upsloping ST depression at the J point in the chest leads running into tall, symmetric T waves without ST elevation, a STEMI equivalent of proximal LAD occlusion.',
      'Descenso ascendente del ST en el punto J en las precordiales que se continúa con T altas y simétricas, sin elevación del ST: un equivalente de IAMCEST por oclusión proximal de la DA.',
    ),
    features: [
      l(
        'V1–V6的J点压低1–3 mm，ST段向上斜行。',
        'J-point depression of 1–3 mm in V1–V6 with an upsloping ST segment.',
        'Descenso del punto J de 1–3 mm en V1–V6 con un ST ascendente.',
      ),
      l(
        '紧接着是高大、宽基底、对称的T波（超急性期形态）。',
        'Right after it, tall, broad-based, symmetric T waves (hyperacute shape).',
        'Justo después, ondas T altas, de base ancha y simétricas (forma hiperaguda).',
      ),
      l('胸前导联没有ST段抬高。', 'No ST elevation in the chest leads.', 'Sin elevación del ST en las precordiales.'),
      l('aVR常有轻度ST段抬高。', 'Often slight ST elevation in aVR.', 'A menudo ligera elevación del ST en aVR.'),
      l(
        '图形通常持续存在直到再灌注，而不是一闪而过的过渡阶段。',
        'The pattern usually persists until reperfusion; it is not a fleeting transition.',
        'El patrón suele persistir hasta la reperfusión; no es una fase pasajera.',
      ),
    ],
    criteria: [
      {
        label: l('de Winter图形', 'de Winter pattern', 'Patrón de De Winter'),
        value: l(
          'V1–V6 J点上斜型压低>1 mm延续为高大对称T波，aVR常轻度抬高，胸前导联无ST抬高',
          'Upsloping J-point depression > 1 mm in V1–V6 into tall symmetric T waves, often slight ST elevation in aVR, no precordial ST elevation',
          'Descenso ascendente del punto J > 1 mm en V1–V6 hacia T altas y simétricas, a menudo ligera elevación del ST en aVR, sin elevación precordial',
        ),
        source: 'de Winter 2008',
      },
      {
        label: l('处理', 'Management class', 'Categoría de manejo'),
        value: l('视为STEMI等危症（急性冠脉闭塞）', 'Treated as a STEMI equivalent (acute coronary occlusion)', 'Se trata como equivalente de IAMCEST (oclusión coronaria aguda)'),
        source: 'Thygesen 2018 (UDMI §27); Kontos 2022 (ACC ECDP)',
      },
    ],
    mechanism: l(
      '闭塞的前降支供血区复极明显异常，形成宽大的T波，而ST向量并未像通常那样指向胸前导联。为什么没有出现通常的ST段抬高尚不完全清楚，但造影几乎总能发现前降支近段闭塞。',
      'The occluded LAD territory repolarizes abnormally, which produces the broad, tall T waves, while the ST vector does not turn toward the chest leads as it usually does. Why the usual ST elevation fails to appear is not fully understood, but angiography almost always finds an occluded proximal LAD.',
      'El territorio ocluido de la DA se repolariza de forma anómala, lo que produce las T anchas y altas, mientras que el vector del ST no se orienta hacia las precordiales como de costumbre. No se sabe del todo por qué falta la elevación habitual del ST, pero la coronariografía casi siempre encuentra la DA proximal ocluida.',
    ),
    mimics: [
      {
        id: 'hyperkalemia',
        discriminator: l(
          '高钾血症的T波窄基底、尖顶，没有J点压低，常伴P波低平或QRS增宽。',
          'Hyperkalaemic T waves are narrow-based and pointed, without J-point depression, often with flat P waves or a wide QRS.',
          'Las T de la hiperpotasemia son de base estrecha y puntiagudas, sin descenso del punto J, a menudo con P aplanadas o QRS ancho.',
        ),
        leads: ['V2', 'V3', 'V4', 'II'],
      },
      {
        id: 'st-depression-ischemic',
        discriminator: l(
          '非闭塞性缺血的压低为水平或下斜型，T波低平或倒置，而不是高大对称的T波。',
          'Non-occlusive ischaemia gives horizontal or downsloping depression with flat or inverted T waves, not tall symmetric ones.',
          'La isquemia sin oclusión produce un descenso horizontal o descendente con T aplanadas o negativas, no altas y simétricas.',
        ),
        leads: ['V3', 'V4', 'V5', 'V6'],
      },
      {
        id: 'early-repolarization',
        discriminator: l(
          '早期复极为J点抬高伴凹面ST，而不是J点压低。',
          'Early repolarization raises the J point with a concave ST; it does not depress it.',
          'La repolarización precoz eleva el punto J con un ST cóncavo; no lo desciende.',
        ),
        leads: ['V2', 'V3', 'V4'],
      },
    ],
    pitfalls: [
      l(
        '因为“没有ST抬高”而按NSTEMI处理，延误再灌注。',
        'Managing it as NSTEMI because “there is no ST elevation” and delaying reperfusion.',
        'Tratarlo como IAMSEST porque «no hay elevación del ST» y retrasar la reperfusión.',
      ),
      l(
        '只看到上斜型压低而忽视后面的T波——上斜型压低本身特异性低，关键是高大对称的T波。',
        'Seeing the upsloping depression but ignoring the T waves: upsloping depression alone is not specific; the tall symmetric T is the key.',
        'Ver el descenso ascendente pero ignorar las T: el descenso ascendente por sí solo es poco específico; la clave es la T alta y simétrica.',
      ),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '按STEMI处理：立即启动直接PCI，不要等待ST段抬高出现。',
        'Treat as STEMI: activate primary PCI now and do not wait for ST elevation to appear.',
        'Trátalo como IAMCEST: activa ya la ICP primaria y no esperes a que aparezca la elevación del ST.',
      ),
    },
    lessons: ['i8', 'i7'],
    sources: [R.deWinter2008, REF.udmi2018, REF.escAcs2023, R.kontos2022],
    aka: ['de Winter', 'De Winter T waves', 'patrón de De Winter', 'STEMI equivalent', 'de Winter T波', 'STEMI等危症'],
    exemplar: { scenarios: ['de-winter'], leads: ['V1', 'V2', 'V3', 'V4', 'aVR'] },
  },

  // ── Wellens pattern ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'wellens',
    definition: l(
      '胸痛缓解后V2–V3出现正负双向（A型）或深而对称倒置（B型）的T波，提示前降支近段严重狭窄且已再灌注。',
      'Biphasic (type A) or deep, symmetric inverted (type B) T waves in V2–V3 in a patient who is now pain-free, signalling a critical proximal LAD stenosis that has reperfused.',
      'Ondas T bifásicas (tipo A) o negativas profundas y simétricas (tipo B) en V2–V3 en un paciente ya sin dolor, que señalan una estenosis crítica de la DA proximal que se ha reperfundido.',
    ),
    features: [
      l(
        '记录时患者已无胸痛——T波改变出现在疼痛之后。',
        'The patient is pain-free when the ECG is taken: the T changes appear after the pain.',
        'El paciente está sin dolor cuando se registra el ECG: los cambios de la T aparecen después del dolor.',
      ),
      l(
        'A型：V2–V3 T波先正后负（双向）；B型：V2–V3（可延至V1–V6）T波深而对称倒置。',
        'Type A: biphasic T in V2–V3, up then down; type B: deep symmetric T inversion in V2–V3 (sometimes V1–V6).',
        'Tipo A: T bifásica en V2–V3, primero positiva y luego negativa; tipo B: T negativa profunda y simétrica en V2–V3 (a veces V1–V6).',
      ),
      l(
        'R波保留、无Q波，ST段等电位或抬高<1 mm。',
        'R waves preserved, no Q waves, ST isoelectric or raised < 1 mm.',
        'R conservadas, sin ondas Q, ST isoeléctrico o elevado < 1 mm.',
      ),
      l(
        '再次胸痛时倒置的T波可能“变正”（假性正常化）——这是再次闭塞，不是好转。',
        'If pain returns, the inverted T can become upright (pseudo-normalization): that is re-occlusion, not improvement.',
        'Si vuelve el dolor, la T negativa puede hacerse positiva (seudonormalización): es una reoclusión, no una mejoría.',
      ),
    ],
    criteria: [
      {
        label: l('Wellens图形', 'Wellens pattern', 'Patrón de Wellens'),
        value: l(
          '无痛时V2–V3双向或深对称倒置T波；ST<1 mm；无胸前Q波；R波保留；肌钙蛋白正常或轻度升高',
          'Pain-free biphasic or deep symmetric T inversion in V2–V3; ST < 1 mm; no precordial Q waves; R waves preserved; troponin normal or mildly raised',
          'Sin dolor, T bifásica o negativa profunda y simétrica en V2–V3; ST < 1 mm; sin Q precordiales; R conservadas; troponina normal o poco elevada',
        ),
        source: 'de Zwaan 1982; Byrne 2023 (ESC ACS §3.2.2)',
      },
    ],
    mechanism: l(
      '前降支曾短暂闭塞后又再通，再灌注的前壁复极延迟，使面对它的导联T波倒置。动脉仍然严重狭窄，因此数日内再次闭塞可导致大面积前壁梗死。',
      'The LAD was briefly occluded and then reopened, and the reperfused anterior wall now repolarizes late, which inverts the T waves in the leads that face it. The artery stays critically narrowed, so the next occlusion can cause a large anterior infarction within days.',
      'La DA se ocluyó brevemente y luego se reabrió, y la cara anterior reperfundida se repolariza ahora con retraso, lo que invierte las T en las derivaciones que la miran. La arteria sigue críticamente estrechada, por lo que la siguiente oclusión puede causar un infarto anterior extenso en pocos días.',
    ),
    mimics: [
      {
        id: 'cerebral-t',
        discriminator: l(
          '脑型T波为广泛巨大倒置伴明显QT延长，见于颅内事件，无胸痛病史。',
          'Cerebral T waves are giant, widespread inversions with a markedly long QT after an intracranial event, without a chest-pain story.',
          'Las T cerebrales son inversiones gigantes y difusas con QT muy largo tras un evento intracraneal, sin historia de dolor torácico.',
        ),
        leads: ['V2', 'V3', 'V4', 'V5'],
      },
      {
        id: 'apical-hcm',
        discriminator: l(
          '心尖肥厚型心肌病为V3–V5巨大倒置T波伴高R波，多年稳定不变。',
          'Apical HCM gives giant T inversion in V3–V5 with tall R waves, stable over years.',
          'La miocardiopatía hipertrófica apical da T negativas gigantes en V3–V5 con R altas, estables durante años.',
        ),
        leads: ['V3', 'V4', 'V5'],
      },
      {
        id: 'pulmonary-embolism',
        discriminator: l(
          '肺栓塞的V1–V4 T波倒置伴窦性心动过速和右心负荷征（Ⅲ倒置、右束支阻滞）。',
          'Pulmonary embolism gives T inversion in V1–V4 with sinus tachycardia and RV strain signs (T inversion in III, RBBB).',
          'La embolia pulmonar da T negativas en V1–V4 con taquicardia sinusal y signos de sobrecarga del VD (T negativa en III, BRD).',
        ),
        leads: ['V1', 'V2', 'V3', 'III'],
      },
      {
        id: 'juvenile-t',
        discriminator: l(
          '幼年型T波见于无症状青少年，V1–V3倒置较浅，V4起直立。',
          'The juvenile pattern is shallow T inversion in V1–V3 in an asymptomatic adolescent, upright from V4 onward.',
          'El patrón juvenil es una T negativa poco profunda en V1–V3 en un adolescente asintomático, positiva desde V4.',
        ),
        leads: ['V1', 'V2', 'V3', 'V4'],
      },
    ],
    pitfalls: [
      l(
        '因患者已无痛、心电图“看起来平静”而安排运动试验——可诱发大面积梗死。',
        'Sending a pain-free patient for an exercise test because the ECG “looks calm”: it can provoke a large infarction.',
        'Enviar a una prueba de esfuerzo a un paciente sin dolor porque el ECG «parece tranquilo»: puede provocar un infarto extenso.',
      ),
      l(
        '把再次疼痛时T波转正当作改善。',
        'Taking an inverted T that turns upright with new pain as an improvement.',
        'Interpretar como mejoría una T negativa que se hace positiva con un nuevo dolor.',
      ),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '收入院，不做负荷试验；尽早冠脉造影（24 h内，胸痛复发时立即），任何新发胸痛都复查心电图。',
        'Admit and do not stress-test; arrange early coronary angiography (within 24 h, immediately if pain recurs) and repeat the ECG with any new pain.',
        'Ingresa al paciente y no hagas prueba de esfuerzo; programa una coronariografía precoz (en 24 h, inmediata si recurre el dolor) y repite el ECG ante cualquier dolor nuevo.',
      ),
    },
    lessons: ['i8'],
    sources: [R.deZwaan1982, REF.escAcs2023, REF.udmi2018, REF.bayesNegT2014],
    aka: ['Wellens syndrome', 'Wellens sign', 'LAD T-wave syndrome', 'síndrome de Wellens', 'Wellens综合征'],
    exemplar: { scenarios: ['wellens'], leads: ['V1', 'V2', 'V3', 'V4'] },
  },

  // ── ST elevation in aVR with diffuse ST depression ───────────────────────────────────────────────────────────────
  {
    id: 'avr-elevation-diffuse-std',
    definition: l(
      '≥6个导联ST段压低≥1 mm伴aVR（常及V1）ST段抬高，是多支病变或左主干缺血的高危征象，而不是单支闭塞。',
      'ST depression ≥ 1 mm in six or more leads with ST elevation in aVR (often V1), a high-risk sign of multivessel or left-main ischaemia rather than of a single occluded artery.',
      'Descenso del ST ≥ 1 mm en seis o más derivaciones con elevación del ST en aVR (a menudo V1), un signo de alto riesgo de isquemia multivaso o del tronco común más que de una arteria ocluida.',
    ),
    features: [
      l(
        '广泛水平或下斜型ST段压低，以V4–V6、Ⅰ、Ⅱ最明显。',
        'Widespread horizontal or downsloping ST depression, deepest in V4–V6, I and II.',
        'Descenso del ST difuso, horizontal o descendente, máximo en V4–V6, I y II.',
      ),
      l(
        'aVR ST段抬高≥1 mm——aVR反映的是所有压低导联的总和。',
        'ST elevation ≥ 1 mm in aVR: aVR records the sum of all the depressed leads.',
        'Elevación del ST ≥ 1 mm en aVR: aVR registra la suma de todas las derivaciones descendidas.',
      ),
      l('V1可同时抬高（aVR抬高>V1支持左主干）。', 'V1 may be raised too (aVR > V1 favours the left main).', 'V1 puede estar también elevada (aVR > V1 orienta al tronco común).'),
      l(
        '先排除需求性原因：快速心律失常、低血压、贫血、低氧可产生同样图形。',
        'First rule out demand causes: a fast arrhythmia, hypotension, anaemia or hypoxia can produce the same pattern.',
        'Descarta primero causas por demanda: una taquiarritmia, hipotensión, anemia o hipoxia pueden producir el mismo patrón.',
      ),
    ],
    criteria: [
      {
        label: l('高危图形', 'High-risk pattern', 'Patrón de alto riesgo'),
        value: l(
          '≥6个导联ST压低≥1 mm，伴aVR和/或V1 ST抬高',
          'ST depression ≥ 1 mm in ≥ 6 leads with ST elevation in aVR and/or V1',
          'Descenso del ST ≥ 1 mm en ≥ 6 derivaciones con elevación del ST en aVR y/o V1',
        ),
        source: 'Byrne 2023 (ESC ACS §3.2.1); Thygesen 2018 (UDMI §27)',
      },
    ],
    mechanism: l(
      '当缺血累及左心室大部分的内层心肌时，各区域的ST向量都指向心腔、朝上朝右，使大多数导联ST段压低。aVR从右肩方向看向心腔，因此把这些向量的总和记录为ST段抬高。',
      'When ischaemia involves the inner layer of most of the left ventricle, the ST vector of every region points into the cavity, upward and to the right, which lowers the ST in most leads. Lead aVR looks into the cavity from the right shoulder, so it records the sum of those vectors as ST elevation.',
      'Cuando la isquemia afecta a la capa interna de casi todo el ventrículo izquierdo, el vector del ST de cada región apunta hacia la cavidad, hacia arriba y a la derecha, lo que desciende el ST en la mayoría de las derivaciones. La derivación aVR mira la cavidad desde el hombro derecho y registra la suma de esos vectores como elevación del ST.',
    ),
    mimics: [
      {
        id: 'stemi-posterior',
        discriminator: l(
          '后壁闭塞的压低以V1–V3（V4）最明显、T波直立，而不是广泛分布。',
          'Posterior occlusion gives depression maximal in V1–V3 (V4) with upright T waves, not a widespread pattern.',
          'La oclusión posterior da un descenso máximo en V1–V3 (V4) con T positivas, no un patrón difuso.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
      {
        id: 'lvh-strain',
        discriminator: l(
          '左心室肥厚的压低限于高电压导联，T波不对称倒置，与旧图一致。',
          'LVH depression is limited to high-voltage leads, with asymmetric T inversion, unchanged from old tracings.',
          'El descenso de la HVI se limita a derivaciones de voltaje alto, con T negativa asimétrica, sin cambios respecto a trazados antiguos.',
        ),
        leads: ['V5', 'V6', 'I', 'aVL'],
      },
      {
        id: 'svt',
        discriminator: l(
          '室上速时广泛ST压低伴aVR抬高常与心率相关，心率控制后复查心电图再判断。',
          'During a fast SVT, diffuse ST depression with aVR elevation is often rate-related: repeat the ECG after rate control before calling it ischaemia.',
          'Durante una TSV rápida, el descenso difuso con elevación en aVR suele depender de la frecuencia: repite el ECG tras controlarla antes de llamarlo isquemia.',
        ),
        leads: ['II', 'V5', 'aVR'],
      },
      {
        id: 'digoxin-effect',
        discriminator: l(
          '地高辛效应为鱼钩样下垂的ST伴QT缩短，aVR无显著抬高。',
          'Digoxin effect is a scooped ST with a short QT and no significant aVR elevation.',
          'El efecto digitálico es un ST en cubeta con QT corto y sin elevación significativa en aVR.',
        ),
        leads: ['V5', 'V6', 'aVR'],
      },
    ],
    pitfalls: [
      l(
        '称之为“左主干STEMI”而当作单支闭塞处理——它代表弥漫缺血，需要的是紧急有创评估和寻找诱因。',
        'Calling it a “left-main STEMI” and treating it as one occluded artery: it means diffuse ischaemia that needs urgent invasive assessment and a search for triggers.',
        'Llamarlo «IAMCEST del tronco» y tratarlo como una sola arteria ocluida: indica isquemia difusa que requiere valoración invasiva urgente y búsqueda de desencadenantes.',
      ),
      l(
        '忽视aVR——它是常被跳过的导联。',
        'Skipping aVR, the lead most often ignored.',
        'Saltarse aVR, la derivación que más se ignora.',
      ),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '按极高危急性冠脉综合征处理：立即请心内科评估，不稳定或持续胸痛时立即有创治疗；同时寻找并纠正需求性诱因（快速心律失常、低血压、贫血）。',
        'Treat as very high-risk ACS: immediate cardiology review and an immediate invasive strategy if the patient is unstable or pain continues; meanwhile look for and correct a demand cause (fast arrhythmia, hypotension, anaemia).',
        'Trátalo como un SCA de muy alto riesgo: valoración inmediata por cardiología y estrategia invasiva inmediata si hay inestabilidad o dolor persistente; mientras tanto, busca y corrige una causa por demanda (taquiarritmia, hipotensión, anemia).',
      ),
    },
    lessons: ['i8'],
    sources: [REF.escAcs2023, REF.udmi2018, REF.wagner2009],
    aka: ['aVR elevation', 'left main pattern', 'diffuse ST depression', 'elevación del ST en aVR', 'aVR抬高', '左主干病变'],
    exemplar: { scenarios: ['avr-elevation-diffuse-std'], leads: ['aVR', 'V1', 'I', 'II', 'V4', 'V5', 'V6'] },
  },

  // ── hyperacute T waves ───────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'hyperacute-t',
    definition: l(
      '≥2个相邻导联T波宽基底、饱满、对称，且相对QRS过大——急性冠脉闭塞最早的征象，常早于ST段抬高。',
      'Broad-based, bulky, symmetric T waves that are large for their QRS in ≥ 2 contiguous leads, the earliest sign of acute coronary occlusion and often present before ST elevation.',
      'Ondas T de base ancha, voluminosas y simétricas, grandes para su QRS en ≥ 2 derivaciones contiguas: el signo más precoz de oclusión coronaria aguda, a menudo antes de la elevación del ST.',
    ),
    features: [
      l(
        'T波基底宽、面积大（“胖”），顶部圆钝而不尖。',
        'The T is wide at its base with a large area (“fat”), and its top is rounded rather than sharp.',
        'La T es ancha en la base, de gran área («gorda»), y su vértice es redondeado, no afilado.',
      ),
      l(
        '与QRS比较：V2–V4的T波接近或超过R波高度时要警惕。',
        'Compare it with the QRS: a T in V2–V4 close to or taller than its R wave is suspicious.',
        'Compárala con el QRS: una T en V2–V4 casi tan alta como su R, o más, es sospechosa.',
      ),
      l(
        'ST段可轻度抬高或变直，失去正常的凹面。',
        'The ST may be slightly raised or straightened, losing its normal concavity.',
        'El ST puede estar algo elevado o rectificado, y pierde su concavidad normal.',
      ),
      l(
        '常伴对应性改变（如下壁时aVL的ST压低或T倒置）。',
        'Often with a reciprocal change (for an inferior occlusion, ST depression or T inversion in aVL).',
        'A menudo con un cambio recíproco (en la oclusión inferior, descenso del ST o T negativa en aVL).',
      ),
      l(
        '动态变化：与旧图比较，并每15–30 min复查，可演变为ST段抬高。',
        'It is dynamic: compare with old tracings and repeat every 15–30 min, as it can evolve into ST elevation.',
        'Es dinámica: compárala con trazados antiguos y repite cada 15–30 min, porque puede evolucionar a elevación del ST.',
      ),
    ],
    criteria: [
      {
        label: l('超急性期T波', 'Hyperacute T wave', 'Onda T hiperaguda'),
        value: l(
          '≥2个相邻导联T波宽基底、对称、相对QRS过大，可早于ST抬高出现（无公认毫米阈值）',
          'Broad-based, symmetric T waves, large relative to the QRS, in ≥ 2 contiguous leads; can precede ST elevation (no agreed millimetre threshold)',
          'T de base ancha, simétricas y grandes respecto al QRS en ≥ 2 derivaciones contiguas; pueden preceder a la elevación del ST (sin umbral milimétrico consensuado)',
        ),
        source: 'Thygesen 2018 (UDMI §27); Byrne 2023 (ESC ACS §3.2)',
      },
      {
        label: l('复查心电图', 'Serial ECGs', 'ECG seriados'),
        value: l(
          '首诊10 min内记录；不能诊断而症状持续时每15–30 min复查',
          'First ECG within 10 min; if non-diagnostic and symptoms persist, repeat every 15–30 min',
          'Primer ECG en 10 min; si no es diagnóstico y los síntomas persisten, repítelo cada 15–30 min',
        ),
        source: 'Byrne 2023 (ESC ACS); Gulati 2021 (AHA/ACC chest pain)',
      },
    ],
    mechanism: l(
      '闭塞最初几分钟内，缺血细胞的动作电位缩短，该区域提前完成复极，指向它的T波向量变大变宽。这发生在损伤电流尚不足以抬高ST段之前，所以T波可能是唯一的早期征象。',
      'In the first minutes of occlusion the ischaemic cells shorten their action potentials, so the territory finishes repolarizing early and the T-wave vector toward it grows larger and broader. This happens before the injury current is big enough to lift the ST segment, which is why the T wave can be the only early sign.',
      'En los primeros minutos de la oclusión las células isquémicas acortan su potencial de acción, de modo que el territorio termina antes de repolarizarse y el vector de la T dirigido hacia él se hace mayor y más ancho. Esto ocurre antes de que la corriente de lesión sea suficiente para elevar el ST, y por eso la T puede ser el único signo precoz.',
    ),
    mimics: [
      {
        id: 'peaked-t',
        discriminator: l(
          '高钾血症的T波窄基底、尖顶、帐篷状，分布广泛，常伴P波低平或QRS增宽；超急性期T波宽基底、饱满，限于一个冠脉分布区。',
          'Hyperkalaemic T waves are narrow-based, pointed and tented, widespread, often with flat P waves or a wide QRS; hyperacute T waves are broad-based, bulky and confined to one coronary territory.',
          'Las T de la hiperpotasemia son de base estrecha, picudas y en tienda, difusas, a menudo con P aplanadas o QRS ancho; las T hiperagudas son de base ancha, voluminosas y limitadas a un territorio coronario.',
        ),
        leads: ['V2', 'V3', 'V4', 'II'],
      },
      {
        id: 'early-repolarization',
        discriminator: l(
          '早期复极的高T波与高QRS成比例，伴J点切迹和凹面ST，复查不变。',
          'In early repolarization the tall T is proportionate to a tall QRS, with a notched J point and a concave ST, and it does not change on repeat ECGs.',
          'En la repolarización precoz la T alta es proporcionada a un QRS alto, con muesca en J y ST cóncavo, y no cambia en ECG repetidos.',
        ),
        leads: ['V2', 'V3', 'V4'],
      },
      {
        id: 'lvh',
        discriminator: l(
          '左心室肥厚时V1–V3高T波伴深S波，二者成比例，T波不对称。',
          'In LVH the tall T waves in V1–V3 follow deep S waves in proportion, and they are asymmetric.',
          'En la HVI las T altas de V1–V3 siguen a S profundas de forma proporcionada y son asimétricas.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
      {
        id: 'de-winter',
        discriminator: l(
          'de Winter在同样高大的T波前有J点上斜型压低≥1 mm。',
          'de Winter adds upsloping J-point depression of ≥ 1 mm before the same tall T waves.',
          'El patrón de De Winter añade un descenso ascendente del punto J ≥ 1 mm antes de esas mismas T altas.',
        ),
        leads: ['V2', 'V3', 'V4'],
      },
    ],
    pitfalls: [
      l(
        '只用毫米标准读图，把一份“没有ST抬高”的心电图当作正常并让患者离开。',
        'Reading only for millimetres and discharging a patient whose ECG has “no ST elevation”.',
        'Leer solo milímetros y dar el alta a un paciente cuyo ECG «no tiene elevación del ST».',
      ),
      l(
        '不与旧图比较——同一患者的T波突然变大才是关键。',
        'Not comparing with old tracings: a T wave that has suddenly grown in the same patient is the key finding.',
        'No comparar con trazados antiguos: una T que ha crecido de repente en el mismo paciente es el hallazgo clave.',
      ),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '每15–30 min复查心电图并与旧图比较；T波增大、出现ST抬高或症状持续时，立即请心内科评估是否为闭塞。',
        'Repeat the ECG every 15–30 minutes and compare with old tracings; if the T waves grow, ST elevation appears or symptoms persist, involve cardiology at once for a possible occlusion.',
        'Repite el ECG cada 15–30 minutos y compáralo con trazados antiguos; si las T crecen, aparece elevación del ST o persisten los síntomas, avisa de inmediato a cardiología por posible oclusión.',
      ),
    },
    lessons: ['i7'],
    sources: [REF.udmi2018, REF.escAcs2023, R.gulati2021, R.meyers2021, R.kontos2022],
    aka: ['hyperacute T', 'OMI', 'occlusion MI', 'T hiperaguda', 'ondas T hiperagudas', '超急性T波', '闭塞性心梗'],
    exemplar: { scenarios: ['hyperacute-t'], leads: ['V2', 'V3', 'V4', 'aVL'] },
  },

  // ── ischaemic ST depression ──────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'st-depression-ischemic',
    definition: l(
      '≥2个相邻导联新出现水平或下斜型ST段压低≥0.5 mm，提示非闭塞性缺血（非ST段抬高型急性冠脉综合征）或需求性缺血。',
      'New horizontal or downsloping ST depression ≥ 0.5 mm in ≥ 2 contiguous leads, the sign of ischaemia without coronary occlusion (NSTE-ACS) or of demand ischaemia.',
      'Descenso nuevo del ST, horizontal o descendente, ≥ 0,5 mm en ≥ 2 derivaciones contiguas: el signo de isquemia sin oclusión coronaria (SCASEST) o de isquemia por demanda.',
    ),
    features: [
      l(
        '以PR段为基线，在J点（及J点后60–80 ms）测量。',
        'Measure at the J point (and 60–80 ms after it) against the PR baseline.',
        'Mide en el punto J (y 60–80 ms después) respecto a la línea del PR.',
      ),
      l(
        '形态：水平或下斜型；单纯上斜型压低特异性较低。',
        'Shape: horizontal or downsloping; upsloping depression alone is less specific.',
        'Forma: horizontal o descendente; el descenso ascendente aislado es menos específico.',
      ),
      l(
        '常见于V4–V6、Ⅰ、Ⅱ；随症状出现和消失（动态变化）。',
        'Usually in V4–V6, I and II; it comes and goes with symptoms (dynamic).',
        'Habitualmente en V4–V6, I y II; aparece y desaparece con los síntomas (dinámico).',
      ),
      l(
        'ST段压低不能像ST段抬高那样定位罪犯血管。',
        'Unlike ST elevation, ST depression does not localize the culprit artery.',
        'A diferencia de la elevación, el descenso del ST no localiza la arteria culpable.',
      ),
      l(
        '先问两个问题：是否是别处抬高的对应性改变？是否是以V1–V3最明显的后壁闭塞？',
        'Ask two questions first: is it the mirror of elevation elsewhere, and is it maximal in V1–V3 (posterior occlusion)?',
        'Hazte primero dos preguntas: ¿es la imagen especular de una elevación en otra parte? ¿Es máximo en V1–V3 (oclusión posterior)?',
      ),
    ],
    criteria: [
      {
        label: l('缺血性ST段压低', 'Ischaemic ST depression', 'Descenso isquémico del ST'),
        value: l(
          '≥2个相邻导联新出现水平或下斜型压低≥0.5 mm',
          'New horizontal or downsloping depression ≥ 0.5 mm in ≥ 2 contiguous leads',
          'Descenso nuevo horizontal o descendente ≥ 0,5 mm en ≥ 2 derivaciones contiguas',
        ),
        source: 'Thygesen 2018 (UDMI §27); Byrne 2023 (ESC ACS §3.2.2)',
      },
      {
        label: l('运动试验阳性', 'Positive exercise test', 'Prueba de esfuerzo positiva'),
        value: l(
          'J点后60–80 ms水平或下斜型压低≥1 mm',
          'Horizontal or downsloping depression ≥ 1 mm, 60–80 ms after the J point',
          'Descenso horizontal o descendente ≥ 1 mm, 60–80 ms tras el punto J',
        ),
        source: 'Gibbons 2002 (ACC/AHA exercise testing)',
      },
      {
        label: l('正常心电图', 'Normal ECG', 'ECG normal'),
        value: l(
          '超过三分之一的非ST段抬高型ACS心电图正常',
          'More than a third of NSTE-ACS have a normal ECG',
          'Más de un tercio de los SCASEST tienen un ECG normal',
        ),
        source: 'Byrne 2023 (ESC ACS)',
      },
    ],
    mechanism: l(
      '供氧不能满足需求时，心室内层最先缺血，其ST向量从心外膜指向心腔，背离其上方的胸前电极。面对缺血区的导联因此记录到ST段压低，但由于许多室壁的向量同时指向心腔，压低并不能指出是哪支血管狭窄。',
      'When oxygen demand exceeds supply, the inner layer of the ventricle becomes ischaemic first and its ST vector points from the epicardium toward the cavity, away from the chest electrodes above it. Leads facing the ischaemic region therefore record ST depression, but because vectors from many walls point into the cavity at once, the depression does not tell which artery is narrowed.',
      'Cuando la demanda de oxígeno supera el aporte, la capa interna del ventrículo es la primera en sufrir isquemia y su vector del ST apunta del epicardio hacia la cavidad, alejándose de los electrodos precordiales situados encima. Las derivaciones que miran la región isquémica registran por ello descenso del ST, pero como los vectores de muchas paredes apuntan a la vez hacia la cavidad, el descenso no indica qué arteria está estrechada.',
    ),
    mimics: [
      {
        id: 'stemi-posterior',
        discriminator: l(
          '以V1–V3最明显、T波直立、R波增高的压低是后壁闭塞，应加做V7–V9。',
          'Depression maximal in V1–V3 with upright T waves and growing R waves is posterior occlusion: record V7–V9.',
          'Un descenso máximo en V1–V3 con T positivas y R crecientes es una oclusión posterior: registra V7–V9.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
      {
        id: 'reciprocal-changes',
        discriminator: l(
          '若其他导联有ST段抬高，这里的压低就是对应性改变，诊断是STEMI。',
          'If other leads show ST elevation, this depression is its mirror and the diagnosis is STEMI.',
          'Si otras derivaciones muestran elevación del ST, este descenso es su imagen especular y el diagnóstico es IAMCEST.',
        ),
        leads: ['aVL', 'III', 'aVF'],
      },
      {
        id: 'lvh-strain',
        discriminator: l(
          '左心室肥厚的压低见于高电压导联，下斜型ST伴不对称T倒置，长期不变。',
          'LVH depression occurs in high-voltage leads, a downsloping ST with asymmetric T inversion, unchanged over time.',
          'El descenso de la HVI aparece en derivaciones de voltaje alto, con ST descendente y T negativa asimétrica, sin cambios en el tiempo.',
        ),
        leads: ['V5', 'V6', 'I', 'aVL'],
      },
      {
        id: 'digoxin-effect',
        discriminator: l(
          '地高辛效应为鱼钩样下垂的ST，伴QT缩短。',
          'Digoxin effect is a scooped, sagging ST with a short QT.',
          'El efecto digitálico es un ST en cubeta con QT corto.',
        ),
        leads: ['V5', 'V6'],
      },
      {
        id: 'hypokalemia',
        discriminator: l(
          '低钾血症的ST压低伴T波低平和明显U波。',
          'Hypokalaemia combines ST depression with flat T waves and prominent U waves.',
          'La hipopotasemia combina descenso del ST con T aplanadas y ondas U prominentes.',
        ),
        leads: ['V2', 'V3'],
      },
    ],
    pitfalls: [
      l(
        '把V1–V3压低当作非ST段抬高型ACS，而它是后壁闭塞。',
        'Calling V1–V3 depression NSTE-ACS when it is a posterior occlusion.',
        'Llamar SCASEST a un descenso en V1–V3 que es una oclusión posterior.',
      ),
      l(
        '把别处抬高的对应性压低当作“另外的缺血”。',
        'Reading the mirror of elevation elsewhere as a “second area of ischaemia”.',
        'Interpretar la imagen especular de una elevación en otra parte como una «segunda zona de isquemia».',
      ),
      l(
        '以为心电图正常就排除了急性冠脉综合征。',
        'Assuming a normal ECG rules out an acute coronary syndrome.',
        'Suponer que un ECG normal descarta un síndrome coronario agudo.',
      ),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '持续胸痛、血流动力学不稳定、恶性心律失常或动态改变时，为极高危非ST段抬高型ACS，需立即有创治疗；否则复查心电图并检测高敏肌钙蛋白。',
        'With ongoing pain, haemodynamic instability, a life-threatening arrhythmia or dynamic changes, this is very high-risk NSTE-ACS needing an immediate invasive strategy; otherwise repeat the ECG and measure high-sensitivity troponin.',
        'Con dolor persistente, inestabilidad hemodinámica, arritmia grave o cambios dinámicos, es un SCASEST de muy alto riesgo que requiere estrategia invasiva inmediata; si no, repite el ECG y determina troponina de alta sensibilidad.',
      ),
    },
    lessons: ['i1', 'i6'],
    sources: [REF.udmi2018, REF.escAcs2023, REF.gibbons2002, REF.wagner2009],
    aka: ['ST depression', 'NSTEMI', 'NSTE-ACS', 'SCASEST', 'IAMSEST', 'descenso del ST', 'infradesnivel del ST', 'ST段压低', '非ST段抬高型心梗'],
    exemplar: { scenarios: ['st-depression-ischemic'], leads: ['V4', 'V5', 'V6', 'I', 'II'] },
  },

  // ── ischaemic T-wave inversion ───────────────────────────────────────────────────────────────────────────────────
  {
    id: 't-inversion-ischemic',
    definition: l(
      '≥2个以R波为主（或R/S>1）的相邻导联T波倒置>1 mm，通常提示一次已过去的缺血（再灌注），而不是正在进行的闭塞。',
      'T-wave inversion > 1 mm in ≥ 2 contiguous leads with a prominent R wave (or R/S > 1), usually marking an ischaemic episode that has passed (reperfusion) rather than an ongoing occlusion.',
      'Inversión de la onda T > 1 mm en ≥ 2 derivaciones contiguas con R prominente (o R/S > 1), que suele marcar un episodio isquémico ya pasado (reperfusión) más que una oclusión en curso.',
    ),
    features: [
      l(
        '深度>1 mm，位于R波为主的导联。',
        'Depth > 1 mm, in leads with a dominant R wave.',
        'Profundidad > 1 mm, en derivaciones con R dominante.',
      ),
      l(
        '常对称、谷底尖锐，ST段等电位或略上凸。',
        'Often symmetric with a sharp nadir; the ST is isoelectric or slightly convex.',
        'A menudo simétrica, con un vértice inferior afilado; el ST es isoeléctrico o algo convexo.',
      ),
      l(
        '符合一个冠脉分布区，并且与旧图相比是新出现的。',
        'It follows one coronary territory and is new compared with old tracings.',
        'Sigue un territorio coronario y es nueva respecto a trazados antiguos.',
      ),
      l(
        '无痛患者V2–V3深倒或双向T波：考虑Wellens图形。',
        'Deep or biphasic T waves in V2–V3 in a pain-free patient: think of Wellens.',
        'T profundas o bifásicas en V2–V3 en un paciente sin dolor: piensa en Wellens.',
      ),
    ],
    criteria: [
      {
        label: l('缺血性T波倒置', 'Ischaemic T inversion', 'Inversión isquémica de la T'),
        value: l(
          '≥2个相邻导联T倒置>1 mm，且该导联R波为主或R/S>1',
          'T inversion > 1 mm in ≥ 2 contiguous leads with a prominent R wave or R/S > 1',
          'T negativa > 1 mm en ≥ 2 derivaciones contiguas con R prominente o R/S > 1',
        ),
        source: 'Thygesen 2018 (UDMI §27); Byrne 2023 (ESC ACS §3.2.2)',
      },
      {
        label: l('意义', 'Meaning', 'Significado'),
        value: l(
          '孤立的T倒置多为缺血后或再灌注表现，而不是持续缺血',
          'Isolated T inversion is usually post-ischaemic or a reperfusion sign, not ongoing ischaemia',
          'La T negativa aislada suele ser posisquémica o un signo de reperfusión, no isquemia en curso',
        ),
        source: 'Bayés de Luna 2014 (negative T wave consensus)',
      },
    ],
    mechanism: l(
      '一次缺血之后，受累心肌的复极在数天至数周内都晚于周围心肌，T波向量背离它，面对它的导联记录到倒置T波。持续的急性缺血很少只产生孤立的T倒置，所以深倒置T波多提示再灌注或近期损伤，而不是此刻闭塞的动脉。',
      'After an episode of ischaemia the affected myocardium repolarizes later than its neighbours for days to weeks, so the T-wave vector turns away from it and the leads facing it record inverted T waves. Ongoing acute ischaemia rarely produces isolated T inversion, which is why a deep negative T usually marks reperfusion or recent injury rather than an artery that is occluded now.',
      'Tras un episodio isquémico, el miocardio afectado se repolariza más tarde que el vecino durante días o semanas, así que el vector de la T se aleja de él y las derivaciones que lo miran registran T negativas. La isquemia aguda en curso rara vez produce una T negativa aislada, por lo que una T negativa profunda suele indicar reperfusión o lesión reciente y no una arteria ocluida en ese momento.',
    ),
    mimics: [
      {
        id: 'secondary-st-t',
        discriminator: l(
          '继发性T倒置不对称，方向与宽QRS或高电压QRS的主波相反。',
          'Secondary T inversion is asymmetric and points opposite the main deflection of a wide or high-voltage QRS.',
          'La T negativa secundaria es asimétrica y opuesta a la deflexión principal de un QRS ancho o de voltaje alto.',
        ),
        leads: ['V5', 'V6', 'V1', 'V2'],
      },
      {
        id: 'nonspecific-st-t',
        discriminator: l(
          '非特异性改变倒置≤1 mm，不符合冠脉分布，也无演变。',
          'Nonspecific change is ≤ 1 mm deep, follows no coronary territory and does not evolve.',
          'El cambio inespecífico mide ≤ 1 mm, no sigue un territorio coronario y no evoluciona.',
        ),
        leads: ['I', 'aVL', 'V5', 'V6'],
      },
      {
        id: 'cerebral-t',
        discriminator: l(
          '脑型T波巨大、宽、广泛，伴明显QT延长，见于颅内事件。',
          'Cerebral T waves are giant, wide and widespread with a markedly long QT, after an intracranial event.',
          'Las T cerebrales son gigantes, anchas y difusas con QT muy largo, tras un evento intracraneal.',
        ),
        leads: ['V3', 'V4', 'V5', 'V6'],
      },
      {
        id: 'juvenile-t',
        discriminator: l(
          '幼年型T波限于V1–V3，见于年轻无症状者。',
          'The juvenile pattern stays within V1–V3 in a young, asymptomatic person.',
          'El patrón juvenil se limita a V1–V3 en una persona joven y asintomática.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
    ],
    pitfalls: [
      l(
        '把单独Ⅲ、aVR或V1的T倒置当作缺血——这些导联可以正常倒置。',
        'Calling T inversion in III alone, aVR or V1 ischaemic: it can be normal in these leads.',
        'Considerar isquémica una T negativa solo en III, en aVR o en V1: puede ser normal en ellas.',
      ),
      l(
        '把胸痛时倒置T波“转正”当作改善——假性正常化提示再次闭塞。',
        'Taking an inverted T that turns upright during new pain as improvement: pseudo-normalization means re-occlusion.',
        'Interpretar como mejoría una T negativa que se hace positiva durante un nuevo dolor: la seudonormalización indica reoclusión.',
      ),
    ],
    lessons: ['i1', 'i9', 'o8'],
    sources: [REF.udmi2018, REF.escAcs2023, REF.bayesNegT2014, REF.rautaharju2009],
    aka: ['T inversion', 'negative T', 'T negativa', 'onda T invertida', 'T波倒置', '缺血性T波'],
    exemplar: { scenarios: ['t-inversion-ischemic'], leads: ['V2', 'V3', 'V4', 'V5'] },
  },

  // ── reciprocal ST changes ────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'reciprocal-changes',
    definition: l(
      '背离ST段抬高区域的导联出现ST段压低——同一损伤向量的镜像，支持急性冠脉闭塞而非其类似图形。',
      'ST depression in leads that face away from an area of ST elevation, the mirror image of the same injury vector, which favours acute coronary occlusion over its mimics.',
      'Descenso del ST en las derivaciones que miran en sentido opuesto a una zona de elevación: la imagen especular del mismo vector de lesión, que apoya una oclusión coronaria aguda frente a sus imitadores.',
    ),
    features: [
      l(
        '常见配对：下壁抬高↔aVL（Ⅰ）压低；高侧壁抬高↔Ⅲ、aVF压低；前降支近段↔下壁压低；后壁↔V1–V3压低。',
        'Usual pairs: inferior elevation ↔ depression in aVL (I); high lateral elevation ↔ depression in III and aVF; proximal LAD ↔ inferior depression; posterior ↔ depression in V1–V3.',
        'Parejas habituales: elevación inferior ↔ descenso en aVL (I); elevación lateral alta ↔ descenso en III y aVF; DA proximal ↔ descenso inferior; posterior ↔ descenso en V1–V3.',
      ),
      l(
        'aVL的对应性压低可早于下壁抬高出现。',
        'Reciprocal depression in aVL can appear before the inferior elevation.',
        'El descenso recíproco en aVL puede aparecer antes que la elevación inferior.',
      ),
      l(
        '心包炎和早期复极除aVR（和V1）外没有对应性压低。',
        'Pericarditis and early repolarization have no reciprocal depression except in aVR (and V1).',
        'La pericarditis y la repolarización precoz no tienen descenso recíproco salvo en aVR (y V1).',
      ),
      l(
        '对应性压低可大于原发抬高（高侧壁闭塞时尤为常见）。',
        'The mirror can be larger than the primary elevation (typical of high lateral occlusion).',
        'La imagen especular puede ser mayor que la elevación primaria (típico de la oclusión lateral alta).',
      ),
    ],
    criteria: [
      {
        label: l('对应导联组', 'Reciprocal lead pairs', 'Parejas de derivaciones recíprocas'),
        value: l(
          '下壁STEMI：Ⅰ/aVL压低；前壁STEMI：Ⅲ/aVF压低；下后壁：V1–V3压低',
          'Inferior STEMI: depression in I/aVL; anterior STEMI: depression in III/aVF; inferoposterior: depression in V1–V3',
          'IAMCEST inferior: descenso en I/aVL; IAMCEST anterior: descenso en III/aVF; inferoposterior: descenso en V1–V3',
        ),
        source: 'Thygesen 2018 (UDMI §27); Wagner 2009 (AHA Part VI)',
      },
    ],
    mechanism: l(
      '一个损伤电流只产生一个ST向量，每个导联记录它的投影：面对它的导联为正，从对侧观察的导联为负。同时看到同一向量的两端，说明ST偏移来自局部损伤，而心包炎或正常变异的弥漫性过程没有相对的室壁可以形成镜像。',
      'An injury current produces one ST vector, and every lead records its projection, positive in leads that face it and negative in leads that look at it from the opposite side. Seeing both ends of the same vector shows that the ST shift comes from a localized injury, whereas the diffuse process of pericarditis or a normal variant has no opposite wall to mirror.',
      'Una corriente de lesión produce un único vector del ST, y cada derivación registra su proyección: positiva en las que lo miran de frente y negativa en las que lo miran desde el lado opuesto. Ver los dos extremos del mismo vector demuestra que el desplazamiento del ST procede de una lesión localizada, mientras que el proceso difuso de la pericarditis o de una variante normal no tiene una pared opuesta que reflejar.',
    ),
    mimics: [
      {
        id: 'st-depression-ischemic',
        discriminator: l(
          '原发缺血性压低时其他导联没有ST段抬高（aVR除外）。',
          'Primary ischaemic depression has no ST elevation elsewhere (apart from aVR).',
          'El descenso isquémico primario no tiene elevación del ST en otras derivaciones (salvo aVR).',
        ),
        leads: ['V4', 'V5', 'V6', 'aVR'],
      },
      {
        id: 'pericarditis',
        discriminator: l(
          '心包炎只有aVR（和V1）的ST段压低和PR段抬高。',
          'Pericarditis shows ST depression and PR elevation only in aVR (and V1).',
          'La pericarditis muestra descenso del ST y elevación del PR solo en aVR (y V1).',
        ),
        leads: ['aVR', 'V1', 'II'],
      },
      {
        id: 'secondary-st-t',
        discriminator: l(
          '左心室肥厚或左束支阻滞的ST压低与QRS主波方向相反，是继发性的，并非镜像。',
          'In LVH or LBBB the ST depression is opposite to the QRS and secondary, not a mirror.',
          'En la HVI o el BRI el descenso del ST es opuesto al QRS y secundario, no una imagen especular.',
        ),
        leads: ['V5', 'V6', 'I', 'aVL'],
      },
    ],
    pitfalls: [
      l(
        '有对应性压低才诊断闭塞——前间壁等部位的闭塞可以没有对应性改变。',
        'Requiring reciprocity before calling occlusion: some occlusions (anteroseptal, for example) show none.',
        'Exigir cambios recíprocos para diagnosticar oclusión: algunas oclusiones (la anteroseptal, por ejemplo) no los muestran.',
      ),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '找到与之配对的抬高导联：存在即按STEMI处理；只见压低而症状持续时，加做后壁和右胸导联并复查。',
        'Find the paired leads with elevation: if present, manage as STEMI; if only depression is seen and symptoms persist, record posterior and right-sided leads and repeat the ECG.',
        'Busca las derivaciones pareadas con elevación: si existen, trátalo como IAMCEST; si solo hay descenso y persisten los síntomas, registra derivaciones posteriores y derechas y repite el ECG.',
      ),
    },
    lessons: ['i1', 'i7'],
    sources: [REF.udmi2018, REF.escAcs2023, REF.wagner2009, REF.adler2015],
    aka: ['reciprocal depression', 'mirror image', 'imagen especular', 'cambios recíprocos', '对应性改变', '镜像改变'],
    exemplar: { scenarios: ['stemi-inferior', 'stemi-anterior'], leads: ['aVL', 'I', 'III', 'aVF'] },
  },

  // ── pathological Q waves ─────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'pathological-q',
    definition: l(
      '宽度或深度达到第四版心肌梗死通用定义（UDMI）陈旧梗死标准的Q波，出现在正常时Q波很小或没有的导联。',
      'A Q wave wide or deep enough to meet the UDMI criteria for prior infarction, in leads where normal Q waves are small or absent.',
      'Una onda Q lo bastante ancha o profunda para cumplir los criterios de infarto previo de la DUIM, en derivaciones donde las Q normales son pequeñas o no existen.',
    ),
    features: [
      l(
        'V2–V3：任何>20 ms的Q波或QS波即异常。',
        'V2–V3: any Q > 20 ms, or a QS complex, is abnormal.',
        'V2–V3: cualquier Q > 20 ms, o un complejo QS, es anormal.',
      ),
      l(
        '其他导联：同一相邻导联组中≥2个导联Q波≥30 ms且深≥1 mm（或QS）。',
        'Other leads: Q ≥ 30 ms and ≥ 1 mm deep (or QS) in ≥ 2 leads of one contiguous group.',
        'Resto de derivaciones: Q ≥ 30 ms y ≥ 1 mm de profundidad (o QS) en ≥ 2 derivaciones de un mismo grupo contiguo.',
      ),
      l(
        '先排除正常Q波：V1的QS；Ⅰ、aVL、aVF、V4–V6的小间隔q波（<30 ms且<R波的25%）；Ⅲ单独的Q波；aVR的Q波。',
        'First exclude normal Q waves: QS in V1; small septal q in I, aVL, aVF and V4–V6 (< 30 ms and < 25% of R); an isolated Q in III; the Q of aVR.',
        'Descarta antes las Q normales: QS en V1; q septal pequeña en I, aVL, aVF y V4–V6 (< 30 ms y < 25 % de la R); Q aislada en III; la Q de aVR.',
      ),
      l(
        'Q波反映梗死面积而不是是否透壁；急性闭塞数小时内即可出现，不代表已错过再灌注时机。',
        'Q waves reflect infarct size, not transmurality; they can appear within hours of an acute occlusion and do not mean reperfusion is too late.',
        'Las ondas Q reflejan el tamaño del infarto, no la transmuralidad; pueden aparecer a las pocas horas de una oclusión aguda y no significan que sea tarde para reperfundir.',
      ),
    ],
    criteria: [
      {
        label: l('陈旧梗死Q波（无左束支阻滞、左心室肥厚、预激）', 'Prior-MI Q waves (no LBBB, LVH or pre-excitation)', 'Ondas Q de infarto previo (sin BRI, HVI ni preexcitación)'),
        value: l(
          'V2–V3任何Q波>20 ms或QS；Ⅰ、Ⅱ、aVL、aVF或V4–V6中同组≥2个导联Q波≥30 ms且≥1 mm（或QS）',
          'Any Q > 20 ms or QS in V2–V3; Q ≥ 30 ms and ≥ 1 mm deep (or QS) in ≥ 2 leads of one group among I, II, aVL, aVF and V4–V6',
          'Cualquier Q > 20 ms o QS en V2–V3; Q ≥ 30 ms y ≥ 1 mm (o QS) en ≥ 2 derivaciones de un grupo entre I, II, aVL, aVF y V4–V6',
        ),
        source: 'Thygesen 2018 (UDMI §30–31)',
      },
      {
        label: l('后壁/侧壁Q波等同', 'Posterior or lateral Q-wave equivalent', 'Equivalente de Q posterior o lateral'),
        value: l(
          'V1–V2 R波≥40 ms、R/S≥1伴直立T波（无传导异常）',
          'R ≥ 40 ms in V1–V2 with R/S ≥ 1 and an upright T (no conduction defect)',
          'R ≥ 40 ms en V1–V2 con R/S ≥ 1 y T positiva (sin trastorno de conducción)',
        ),
        source: 'Thygesen 2018 (UDMI)',
      },
      {
        label: l('Q波与透壁性', 'Q waves and transmurality', 'Ondas Q y transmuralidad'),
        value: l('Q波与梗死面积相关，与是否透壁关系不大（心脏磁共振）', 'Q waves track infarct size more than transmurality (CMR)', 'Las ondas Q se relacionan más con el tamaño del infarto que con la transmuralidad (RM cardiaca)'),
        source: 'Moon 2004',
      },
    ],
    mechanism: l(
      '坏死心肌不产生电活动，其上方的电极如同透过“电窗口”看到对侧室壁，对侧的激动背离电极，形成起始负向波。Q波越宽越深，瘢痕越大，但Q波反映的是梗死面积，而不是瘢痕是否贯穿全层。',
      'Dead myocardium generates no electrical force, so the electrode over it looks through an electrical window at the opposite wall, whose activation moves away and draws an initial negative deflection. The wider and deeper the Q, the larger the scar, but Q waves track infarct size rather than whether the scar spans the whole wall.',
      'El miocardio necrosado no genera fuerza eléctrica, así que el electrodo situado encima mira a través de una ventana eléctrica la pared opuesta, cuya activación se aleja y dibuja una deflexión inicial negativa. Cuanto más ancha y profunda es la Q, mayor es la cicatriz, pero las Q reflejan el tamaño del infarto y no si la cicatriz atraviesa toda la pared.',
    ),
    mimics: [
      {
        id: 'hcm',
        discriminator: l(
          '肥厚型心肌病的Q波深而窄（<40 ms），伴左心室高电压，多见于下壁和侧壁导联。',
          'HCM Q waves are deep but narrow (< 40 ms), with LVH voltage, mostly in inferior and lateral leads.',
          'Las Q de la miocardiopatía hipertrófica son profundas pero estrechas (< 40 ms), con voltaje de HVI, sobre todo en derivaciones inferiores y laterales.',
        ),
        leads: ['I', 'aVL', 'V5', 'V6', 'II', 'III', 'aVF'],
      },
      {
        id: 'wpw',
        discriminator: l(
          '预激的负向δ波可像Q波，但PR短、QRS起始顿挫。',
          'A negative delta wave in pre-excitation can look like a Q, but the PR is short and the QRS starts with a slur.',
          'Una onda delta negativa en la preexcitación puede parecer una Q, pero el PR es corto y el QRS empieza empastado.',
        ),
        leads: ['II', 'III', 'aVF', 'V1'],
      },
      {
        id: 'lbbb',
        discriminator: l(
          '左束支阻滞时V1–V3的QS属于阻滞本身，不能按Q波标准诊断梗死。',
          'In LBBB the QS in V1–V3 belongs to the block, so the Q-wave criteria cannot be used.',
          'En el BRI los QS de V1–V3 pertenecen al bloqueo, así que no se aplican los criterios de onda Q.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
      {
        id: 'precordial-misplacement',
        discriminator: l(
          'V1–V2放得过高可出现rSr′或QS（假性间隔Q波），按正确位置重做后消失。',
          'V1–V2 placed too high can show rSr′ or QS (pseudo-septal Q), which disappears when the electrodes are moved to the right place.',
          'V1–V2 colocadas demasiado altas pueden mostrar rSr′ o QS (seudo-Q septal), que desaparece al recolocar los electrodos.',
        ),
        leads: ['V1', 'V2'],
      },
    ],
    pitfalls: [
      l(
        '把小间隔q波、Ⅲ导联单独的Q波、aVR或V1的Q波当作病理性。',
        'Calling septal q waves, an isolated Q in III, or the Q of aVR or V1 pathological.',
        'Considerar patológicas las q septales, una Q aislada en III o la Q de aVR o de V1.',
      ),
      l(
        '急性胸痛时见到Q波伴ST抬高，就判断为“陈旧梗死、无需处理”。',
        'Seeing Q waves with ST elevation during acute pain and deciding “old infarct, nothing to do”.',
        'Ver ondas Q con elevación del ST durante un dolor agudo y decidir «infarto antiguo, nada que hacer».',
      ),
    ],
    lessons: ['i9'],
    sources: [REF.udmi2018, R.moon2004, R.bayes2006, REF.wagner2009],
    aka: ['Q wave', 'necrosis Q', 'QS', 'onda Q de necrosis', 'Q patológica', '病理性Q波', '坏死型Q波'],
    exemplar: { scenarios: ['old-mi'], leads: ['V1', 'V2', 'V3', 'II', 'III', 'aVF'] },
  },

  // ── old anterior MI ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'old-mi-anterior',
    definition: l(
      'V1–V4（可延及V5–V6、Ⅰ、aVL）出现病理性Q波或QS波且无急性ST偏移，为已愈合的前降支梗死。',
      'Pathological Q waves or QS complexes in V1–V4 (sometimes V5–V6, I and aVL) without an acute ST shift, from a healed LAD infarction.',
      'Ondas Q patológicas o complejos QS en V1–V4 (a veces V5–V6, I y aVL) sin desplazamiento agudo del ST, por un infarto cicatrizado de la DA.',
    ),
    features: [
      l(
        'V2–V3任何>20 ms的Q波或QS；胸导联R波递增消失或倒退。',
        'Any Q > 20 ms or QS in V2–V3; R-wave progression lost or reversed across the chest leads.',
        'Cualquier Q > 20 ms o QS en V2–V3; progresión de la R perdida o invertida en las precordiales.',
      ),
      l(
        'ST段回到基线；T波可直立或稳定倒置。',
        'ST back at baseline; T waves upright or stably inverted.',
        'ST en la línea de base; T positivas o negativas de forma estable.',
      ),
      l(
        '与旧图比较：图形稳定，没有动态演变。',
        'Compare with old tracings: the pattern is stable, with no evolution.',
        'Compara con trazados antiguos: el patrón es estable, sin evolución.',
      ),
      l(
        'QS波上ST段持续抬高数周以上：考虑室壁瘤。',
        'Persistent ST elevation over QS waves for weeks or longer: think of an aneurysm.',
        'Elevación persistente del ST sobre QS durante semanas o más: piensa en un aneurisma.',
      ),
    ],
    criteria: [
      {
        label: l('前壁Q波', 'Anterior Q waves', 'Ondas Q anteriores'),
        value: l(
          'V2–V3任何Q>20 ms或QS；V4–V6中≥2个导联Q≥30 ms且≥1 mm',
          'Any Q > 20 ms or QS in V2–V3; Q ≥ 30 ms and ≥ 1 mm in ≥ 2 of V4–V6',
          'Cualquier Q > 20 ms o QS en V2–V3; Q ≥ 30 ms y ≥ 1 mm en ≥ 2 de V4–V6',
        ),
        source: 'Thygesen 2018 (UDMI §30–31)',
      },
    ],
    mechanism: l(
      '愈合的前降支梗死使前壁和室间隔变为不产生电力的瘢痕，V1–V4失去R波，记录到后壁背离它们的激动，形成Q或QS波。损伤电流已经消失，因此ST段回到基线，而Q波通常终生存在。',
      'A healed LAD infarction turns the anterior wall and septum into scar that generates no force, so V1–V4 lose their R waves and record the activation of the posterior wall moving away from them as Q or QS complexes. Because the injury current has ended, the ST returns to baseline while the Q waves usually remain for life.',
      'Un infarto cicatrizado de la DA convierte la cara anterior y el tabique en una cicatriz que no genera fuerza, así que V1–V4 pierden sus R y registran como Q o QS la activación de la pared posterior que se aleja de ellas. Como la corriente de lesión ha cesado, el ST vuelve a la línea de base, mientras que las Q suelen persistir de por vida.',
    ),
    mimics: [
      {
        id: 'poor-r-progression',
        discriminator: l(
          'R波递增不良为V1–V3的r波很小但存在，无≥20 ms的Q波，常由电极位置、左心室肥厚或肺气肿引起。',
          'Poor R-wave progression keeps tiny r waves in V1–V3 without Q ≥ 20 ms, often from electrode position, LVH or emphysema.',
          'La mala progresión de la R conserva r diminutas en V1–V3 sin Q ≥ 20 ms, a menudo por la posición de los electrodos, HVI o enfisema.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
      {
        id: 'lbbb',
        discriminator: l(
          '左束支阻滞QRS≥120 ms，V1–V3的QS是阻滞所致。',
          'In LBBB the QRS is ≥ 120 ms and the QS in V1–V3 comes from the block.',
          'En el BRI el QRS mide ≥ 120 ms y los QS de V1–V3 se deben al bloqueo.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
      {
        id: 'lvh',
        discriminator: l(
          '左心室肥厚V1–V2可呈QS或rS伴很深的S波，但侧壁R波高大。',
          'LVH can give QS or rS with very deep S waves in V1–V2, but the lateral R waves are tall.',
          'La HVI puede dar QS o rS con S muy profundas en V1–V2, pero las R laterales son altas.',
        ),
        leads: ['V1', 'V2', 'V5', 'V6'],
      },
      {
        id: 'precordial-misplacement',
        discriminator: l(
          'V1–V2放置过高可产生假性QS，复位后正常。',
          'V1–V2 placed too high can create a pseudo-QS that normalizes when the electrodes are replaced.',
          'V1–V2 demasiado altas pueden crear un seudo-QS que se normaliza al recolocar los electrodos.',
        ),
        leads: ['V1', 'V2'],
      },
    ],
    pitfalls: [
      l(
        '仅凭V1–V3 r波小就诊断陈旧前壁梗死，而没有符合标准的Q波。',
        'Diagnosing an old anterior infarction from small r waves in V1–V3 without Q waves that meet the criteria.',
        'Diagnosticar un infarto anterior antiguo por r pequeñas en V1–V3 sin ondas Q que cumplan los criterios.',
      ),
    ],
    lessons: ['i9'],
    sources: [REF.udmi2018, R.moon2004, R.bayes2006, REF.mackenzie2005],
    aka: ['old anterior MI', 'prior anterior infarction', 'infarto anterior antiguo', 'necrosis anterior', '陈旧性前壁心梗'],
    exemplar: { scenarios: ['old-mi'], variant: 'anterior', leads: ['V1', 'V2', 'V3', 'V4'] },
  },

  // ── old inferior MI ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'old-mi-inferior',
    definition: l(
      'Ⅱ、Ⅲ、aVF出现病理性Q波且无急性ST偏移，为已愈合的右冠或回旋支梗死。',
      'Pathological Q waves in II, III and aVF without an acute ST shift, from a healed RCA or circumflex infarction.',
      'Ondas Q patológicas en II, III y aVF sin desplazamiento agudo del ST, por un infarto cicatrizado de la coronaria derecha o de la circunfleja.',
    ),
    features: [
      l(
        'Ⅱ和aVF（常连同Ⅲ）Q波≥30 ms且深≥1 mm。',
        'Q ≥ 30 ms and ≥ 1 mm deep in II and aVF (usually III as well).',
        'Q ≥ 30 ms y ≥ 1 mm de profundidad en II y aVF (habitualmente también en III).',
      ),
      l(
        '仅Ⅲ导联有Q波不能诊断——Ⅲ的Q波可随呼吸和电轴变化，正常人也常见。',
        'A Q in III alone is not enough: it changes with breathing and axis and is common in healthy people.',
        'Una Q solo en III no basta: cambia con la respiración y el eje y es frecuente en personas sanas.',
      ),
      l(
        '下壁梗死可使电轴左偏；与左前分支阻滞不同，Ⅱ导联呈Qr或QS，而不是rS。',
        'An inferior infarction can swing the axis left; unlike left anterior fascicular block, lead II shows Qr or QS rather than rS.',
        'Un infarto inferior puede desviar el eje a la izquierda; a diferencia del bloqueo fascicular anterior izquierdo, II muestra Qr o QS en lugar de rS.',
      ),
      l('ST段在基线，T波直立或稳定倒置。', 'ST at baseline, T upright or stably inverted.', 'ST en la línea de base, T positiva o negativa de forma estable.'),
    ],
    criteria: [
      {
        label: l('下壁Q波', 'Inferior Q waves', 'Ondas Q inferiores'),
        value: l(
          'Ⅱ和aVF（下壁组Ⅱ、Ⅲ、aVF）Q≥30 ms且≥1 mm（或QS）；仅Ⅲ导联的Q波不算',
          'Q ≥ 30 ms and ≥ 1 mm (or QS) in II and aVF (inferior group II, III, aVF); a Q in III alone does not count',
          'Q ≥ 30 ms y ≥ 1 mm (o QS) en II y aVF (grupo inferior II, III, aVF); una Q solo en III no cuenta',
        ),
        source: 'Thygesen 2018 (UDMI §30–31)',
      },
      {
        label: l('Ⅲ导联正常Q波', 'Normal Q in III', 'Q normal en III'),
        value: l(
          '电轴−30°至0°时，Ⅲ导联Q<30 ms且<R波的25%可为正常',
          'With an axis of −30° to 0°, a Q in III < 30 ms and < 25% of R can be normal',
          'Con un eje entre −30° y 0°, una Q en III < 30 ms y < 25 % de la R puede ser normal',
        ),
        source: 'Thygesen 2018 (UDMI)',
      },
    ],
    mechanism: l(
      '下壁瘢痕不产生电力，Ⅱ、Ⅲ、aVF记录到心室上部背离它们的起始激动，形成Q波。损伤电流已消失，所以ST段在基线，Q波则长期存在。',
      'Inferior scar generates no force, so II, III and aVF record the initial activation of the upper ventricle moving away from them as Q waves. The injury current has ended, so the ST sits at baseline while the Q waves persist.',
      'La cicatriz inferior no genera fuerza, así que II, III y aVF registran como ondas Q la activación inicial de la parte alta del ventrículo, que se aleja de ellas. La corriente de lesión ha cesado, por lo que el ST está en la línea de base mientras las Q persisten.',
    ),
    mimics: [
      {
        id: 'lafb',
        discriminator: l(
          '左前分支阻滞Ⅱ、Ⅲ、aVF呈rS（起始小r波），没有Q波。',
          'Left anterior fascicular block gives rS in II, III and aVF (a small initial r), with no Q wave.',
          'El bloqueo fascicular anterior izquierdo da rS en II, III y aVF (r inicial pequeña), sin onda Q.',
        ),
        leads: ['II', 'III', 'aVF'],
      },
      {
        id: 'wpw',
        discriminator: l(
          '后间隔旁路的负向δ波可在下壁导联形成假性Q波，但PR短。',
          'A posteroseptal accessory pathway can make negative delta waves look like inferior Q waves, but the PR is short.',
          'Una vía accesoria posteroseptal puede hacer que las ondas delta negativas parezcan Q inferiores, pero el PR es corto.',
        ),
        leads: ['II', 'III', 'aVF'],
      },
      {
        id: 'hcm',
        discriminator: l(
          '肥厚型心肌病下壁Q波深而窄（<40 ms），伴高电压。',
          'In HCM the inferior Q waves are deep but narrow (< 40 ms), with high voltage.',
          'En la miocardiopatía hipertrófica las Q inferiores son profundas pero estrechas (< 40 ms), con voltaje alto.',
        ),
        leads: ['II', 'III', 'aVF'],
      },
    ],
    pitfalls: [
      l(
        '仅凭Ⅲ导联Q波诊断陈旧下壁梗死。',
        'Diagnosing an old inferior infarction from a Q in III alone.',
        'Diagnosticar un infarto inferior antiguo por una Q solo en III.',
      ),
    ],
    lessons: ['i9'],
    sources: [REF.udmi2018, R.moon2004, REF.surawicz2009],
    aka: ['old inferior MI', 'prior inferior infarction', 'infarto inferior antiguo', 'necrosis inferior', '陈旧性下壁心梗'],
    exemplar: { scenarios: ['old-mi'], variant: 'inferior', leads: ['II', 'III', 'aVF'] },
  },

  // ── old lateral MI ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'old-mi-lateral',
    definition: l(
      'Ⅰ、aVL和/或V5–V6出现病理性Q波（或V1–V2高宽R波作为侧壁瘢痕的镜像），且无急性ST偏移。',
      'Pathological Q waves in I, aVL and/or V5–V6 (or a tall, broad R in V1–V2 as the mirror of lateral scar) without an acute ST shift.',
      'Ondas Q patológicas en I, aVL y/o V5–V6 (o una R alta y ancha en V1–V2 como imagen especular de la cicatriz lateral) sin desplazamiento agudo del ST.',
    ),
    features: [
      l(
        'Ⅰ和aVL，或V5和V6，Q波≥30 ms且深≥1 mm。',
        'Q ≥ 30 ms and ≥ 1 mm deep in I and aVL, or in V5 and V6.',
        'Q ≥ 30 ms y ≥ 1 mm de profundidad en I y aVL, o en V5 y V6.',
      ),
      l(
        '垂直电轴时aVL单独的Q波可以正常——需Ⅰ导联同时有Q波。',
        'With a vertical axis a Q in aVL alone can be normal: lead I must have one too.',
        'Con un eje vertical una Q solo en aVL puede ser normal: la derivación I también debe tenerla.',
      ),
      l(
        'V1–V2 R波≥40 ms、R/S≥1伴直立T波：心脏磁共振显示多为侧壁（过去称“后壁”）瘢痕。',
        'R ≥ 40 ms in V1–V2 with R/S ≥ 1 and an upright T: cardiac MRI shows this mostly reflects lateral scar (once called “posterior”).',
        'R ≥ 40 ms en V1–V2 con R/S ≥ 1 y T positiva: la RM cardiaca muestra que suele reflejar una cicatriz lateral (antes llamada «posterior»).',
      ),
    ],
    criteria: [
      {
        label: l('侧壁Q波', 'Lateral Q waves', 'Ondas Q laterales'),
        value: l(
          'Ⅰ、aVL或V5–V6中≥2个相邻导联Q≥30 ms且≥1 mm（或QS）',
          'Q ≥ 30 ms and ≥ 1 mm (or QS) in ≥ 2 contiguous leads among I, aVL and V5–V6',
          'Q ≥ 30 ms y ≥ 1 mm (o QS) en ≥ 2 derivaciones contiguas entre I, aVL y V5–V6',
        ),
        source: 'Thygesen 2018 (UDMI §30–31)',
      },
      {
        label: l('V1–V2的R波等同', 'R-wave equivalent in V1–V2', 'Equivalente de R en V1–V2'),
        value: l(
          'R≥40 ms、R/S≥1伴直立T波，无右束支阻滞、预激或右心室肥厚；多对应侧壁瘢痕',
          'R ≥ 40 ms, R/S ≥ 1 with upright T, without RBBB, pre-excitation or RVH; mostly lateral scar',
          'R ≥ 40 ms, R/S ≥ 1 con T positiva, sin BRD, preexcitación ni HVD; suele ser cicatriz lateral',
        ),
        source: 'Bayés de Luna 2006 (CMR terminology); Thygesen 2018 (UDMI)',
      },
    ],
    mechanism: l(
      '侧壁瘢痕不产生电力，Ⅰ、aVL、V5–V6记录到背离它们的激动，形成Q波。同一缺失的侧向电力在右胸导联表现为相对增高增宽的R波，这就是V1–V2高R波的镜像来源。',
      'Lateral scar generates no force, so I, aVL and V5–V6 record activation moving away from them as Q waves. The same missing lateral force appears in the right chest leads as a relatively taller and broader R wave, which is the mirror behind a tall R in V1–V2.',
      'La cicatriz lateral no genera fuerza, así que I, aVL y V5–V6 registran como ondas Q una activación que se aleja de ellas. La misma pérdida de fuerza lateral aparece en las precordiales derechas como una R relativamente más alta y ancha, que es la imagen especular de la R alta en V1–V2.',
    ),
    mimics: [
      {
        id: 'rvh',
        discriminator: l(
          '右心室肥厚的V1高R伴电轴右偏和右胸导联T波倒置；侧壁梗死的V1 T波直立。',
          'RVH gives a tall R in V1 with right axis deviation and T inversion in the right chest leads; lateral scar keeps the T upright in V1.',
          'La HVD da una R alta en V1 con desviación del eje a la derecha y T negativa en precordiales derechas; la cicatriz lateral mantiene la T positiva en V1.',
        ),
        leads: ['V1', 'V2', 'I'],
      },
      {
        id: 'rbbb',
        discriminator: l(
          '右束支阻滞V1呈rsR′且QRS≥120 ms，Ⅰ、V6有宽S波。',
          'RBBB gives rsR′ in V1 with QRS ≥ 120 ms and a wide S in I and V6.',
          'El BRD da rsR′ en V1 con QRS ≥ 120 ms y S ancha en I y V6.',
        ),
        leads: ['V1', 'I', 'V6'],
      },
      {
        id: 'wpw',
        discriminator: l(
          '左侧旁路预激使V1呈高R波，但PR短并有δ波。',
          'A left-sided accessory pathway gives a tall R in V1, but with a short PR and a delta wave.',
          'Una vía accesoria izquierda da una R alta en V1, pero con PR corto y onda delta.',
        ),
        leads: ['V1', 'I', 'aVL'],
      },
    ],
    pitfalls: [
      l(
        '仅凭aVL的Q波诊断侧壁梗死。',
        'Diagnosing a lateral infarction from a Q wave in aVL alone.',
        'Diagnosticar un infarto lateral por una Q solo en aVL.',
      ),
      l(
        '把V1高R波称为“正后壁梗死”而不先排除右束支阻滞、右心室肥厚和预激。',
        'Calling a tall R in V1 a “true posterior infarction” without first excluding RBBB, RVH and pre-excitation.',
        'Llamar «infarto posterior» a una R alta en V1 sin descartar antes BRD, HVD y preexcitación.',
      ),
    ],
    lessons: ['i9', 'i5'],
    sources: [REF.udmi2018, R.bayes2006, R.moon2004, REF.hancock2009],
    aka: ['old lateral MI', 'prior lateral infarction', 'infarto lateral antiguo', 'necrosis lateral', '陈旧性侧壁心梗'],
    exemplar: { scenarios: ['old-mi'], variant: 'lateral', leads: ['I', 'aVL', 'V5', 'V6', 'V1'] },
  },

  // ── LV aneurysm pattern ──────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'lv-aneurysm',
    definition: l(
      '梗死数周后Q/QS波上的ST段持续抬高，通常在前壁，来自运动障碍的瘢痕节段。',
      'Persistent ST elevation over Q or QS waves weeks after an infarction, usually anterior, from a dyskinetic scarred segment.',
      'Elevación persistente del ST sobre ondas Q o QS semanas después de un infarto, habitualmente anterior, por un segmento cicatricial discinético.',
    ),
    features: [
      l('V1–V4出现QS或深Q波。', 'QS or deep Q waves in V1–V4.', 'QS u ondas Q profundas en V1–V4.'),
      l(
        'ST段抬高持续数周（常>2–4周）不回落。',
        'ST elevation that has not resolved for weeks (often > 2–4 weeks).',
        'Elevación del ST que no se resuelve en semanas (a menudo > 2–4 semanas).',
      ),
      l(
        'T波相对QRS较小（T/QRS比值低）。',
        'T waves small relative to the QRS (low T/QRS ratio).',
        'T pequeñas respecto al QRS (cociente T/QRS bajo).',
      ),
      l('与旧图相同，没有对应性改变的动态演变。', 'Identical to old tracings, with no dynamic reciprocal change.', 'Igual que en trazados antiguos, sin cambios recíprocos dinámicos.'),
    ],
    criteria: [
      {
        label: l('室壁瘤与急性前壁STEMI', 'Aneurysm vs acute anterior STEMI', 'Aneurisma frente a IAMCEST anterior agudo'),
        value: l(
          '任一V1–V4导联T/QRS振幅比≥0.36支持急性STEMI；比值低且有QS波支持室壁瘤',
          'T/QRS amplitude ratio ≥ 0.36 in any of V1–V4 favours acute STEMI; lower ratios with QS waves favour aneurysm',
          'Un cociente de amplitud T/QRS ≥ 0,36 en alguna de V1–V4 orienta a IAMCEST agudo; cocientes menores con QS orientan a aneurisma',
        ),
        source: 'Klein 2015',
      },
      {
        label: l('混杂因素', 'Confounder', 'Factor de confusión'),
        value: l(
          '陈旧Q波上的持续ST抬高是急性心梗诊断的已知混杂因素',
          'Persistent ST elevation over old Q waves is a recognised confounder of acute MI diagnosis',
          'La elevación persistente del ST sobre ondas Q antiguas es un factor de confusión reconocido en el diagnóstico de IAM',
        ),
        source: 'Thygesen 2018 (UDMI §31)',
      },
    ],
    mechanism: l(
      '变薄的瘢痕节段在收缩期向外膨出，其边缘被牵拉的心肌被认为在梗死愈合后仍产生类似损伤的电流。因此ST段抬高可固定存在数月，而瘢痕中存活的心肌很少，T波始终较小。',
      'A thin scarred segment bulges outward in systole, and the stretched border zone is thought to keep producing an injury-like current long after the infarction has healed. The ST elevation therefore stays fixed for months, while the T waves remain small because the scar has little living myocardium to repolarize.',
      'Un segmento cicatricial adelgazado protruye hacia fuera en sístole, y se cree que la zona limítrofe estirada sigue generando una corriente similar a la de lesión mucho después de cicatrizar el infarto. Por eso la elevación del ST permanece fija durante meses, mientras que las T siguen siendo pequeñas porque la cicatriz apenas tiene miocardio vivo que repolarizar.',
    ),
    mimics: [
      {
        id: 'stemi-anterior',
        discriminator: l(
          '急性STEMI的T波相对QRS大，R波仍在，并且会动态演变。',
          'Acute STEMI has T waves large for the QRS, preserved R waves and dynamic evolution.',
          'El IAMCEST agudo tiene T grandes para el QRS, R conservadas y evolución dinámica.',
        ),
        leads: ['V1', 'V2', 'V3', 'V4'],
      },
      {
        id: 'old-mi-anterior',
        discriminator: l(
          '一般陈旧前壁梗死有Q波但ST段回到基线。',
          'An ordinary old anterior infarction has Q waves but the ST is back at baseline.',
          'Un infarto anterior antiguo habitual tiene ondas Q pero el ST ha vuelto a la línea de base.',
        ),
        leads: ['V1', 'V2', 'V3', 'V4'],
      },
      {
        id: 'pericarditis',
        discriminator: l(
          '心包炎抬高广泛、凹面，伴PR段压低，无Q波。',
          'Pericarditis gives widespread concave elevation with PR depression and no Q waves.',
          'La pericarditis da elevación difusa y cóncava con descenso del PR y sin ondas Q.',
        ),
        leads: ['II', 'V5', 'V6', 'aVR'],
      },
    ],
    pitfalls: [
      l(
        '没有旧图就直接认定为“室壁瘤”，而不做复查、肌钙蛋白和超声心动图。',
        'Assuming “aneurysm” without an old tracing, instead of using serial ECGs, troponin and echocardiography.',
        'Dar por hecho un «aneurisma» sin trazado antiguo, en lugar de usar ECG seriados, troponina y ecocardiografía.',
      ),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '找旧心电图：完全相同即为旧图形；无旧图或症状提示ACS时，复查心电图、测肌钙蛋白并做超声心动图，不要直接认定为室壁瘤。',
        'Find an old ECG: if identical, it is the old pattern; if none is available or symptoms suggest ACS, repeat the ECG, measure troponin and arrange echocardiography rather than assuming an aneurysm.',
        'Busca un ECG antiguo: si es idéntico, es el patrón previo; si no lo hay o los síntomas sugieren SCA, repite el ECG, determina troponina y pide ecocardiografía en lugar de suponer un aneurisma.',
      ),
    },
    lessons: ['i9', 'i11'],
    sources: [R.klein2015, REF.udmi2018, REF.wagner2009, REF.adler2015],
    aka: ['ventricular aneurysm', 'persistent ST elevation', 'aneurisma ventricular', '室壁瘤'],
    exemplar: { scenarios: ['lv-aneurysm'], leads: ['V1', 'V2', 'V3', 'V4'] },
  },

  // ── positive Sgarbossa criteria ──────────────────────────────────────────────────────────────────────────────────
  {
    id: 'sgarbossa-positive',
    definition: l(
      '在左束支阻滞或心室起搏时提示急性冠脉闭塞的ST改变：一致性ST抬高、V1–V3一致性ST压低，或与QRS不成比例的不一致性ST抬高。',
      'ST changes that reveal acute coronary occlusion despite LBBB or ventricular pacing: concordant ST elevation, concordant ST depression in V1–V3, or discordant ST elevation out of proportion to the QRS.',
      'Cambios del ST que revelan una oclusión coronaria aguda a pesar de un BRI o de la estimulación ventricular: elevación concordante, descenso concordante en V1–V3 o elevación discordante desproporcionada al QRS.',
    ),
    features: [
      l(
        '先确认基础节律：左束支阻滞（QRS≥120 ms）或心室起搏。',
        'First confirm the substrate: LBBB (QRS ≥ 120 ms) or ventricular pacing.',
        'Confirma primero el sustrato: BRI (QRS ≥ 120 ms) o estimulación ventricular.',
      ),
      l(
        '正常情况下ST-T与QRS主波方向相反（不一致）且成比例。',
        'Normally the ST–T points opposite the main QRS deflection (discordant) and in proportion to it.',
        'Normalmente el ST-T se opone a la deflexión principal del QRS (discordante) y es proporcional a ella.',
      ),
      l(
        '异常一：QRS正向导联ST段抬高≥1 mm（一致性抬高）。',
        'Abnormal 1: ST elevation ≥ 1 mm in a lead with a positive QRS (concordant elevation).',
        'Anormal 1: elevación del ST ≥ 1 mm en una derivación con QRS positivo (elevación concordante).',
      ),
      l(
        '异常二：V1–V3 ST段压低≥1 mm（一致性压低）。',
        'Abnormal 2: ST depression ≥ 1 mm in V1–V3 (concordant depression).',
        'Anormal 2: descenso del ST ≥ 1 mm en V1–V3 (descenso concordante).',
      ),
      l(
        '异常三：不一致性ST抬高与S波深度之比≤−0.25（Smith改良标准）。',
        'Abnormal 3: discordant ST elevation with an ST/S ratio ≤ −0.25 (Smith-modified rule).',
        'Anormal 3: elevación discordante con cociente ST/S ≤ −0,25 (regla de Sgarbossa modificada de Smith).',
      ),
    ],
    criteria: [
      {
        label: l('Sgarbossa原始标准', 'Original Sgarbossa criteria', 'Criterios originales de Sgarbossa'),
        value: l(
          '一致性ST抬高≥1 mm（5分）；V1–V3一致性ST压低≥1 mm（3分）；不一致性ST抬高≥5 mm（2分）；≥3分特异性高',
          'Concordant ST elevation ≥ 1 mm (5 points); concordant ST depression ≥ 1 mm in V1–V3 (3 points); discordant ST elevation ≥ 5 mm (2 points); ≥ 3 points is specific',
          'Elevación concordante ≥ 1 mm (5 puntos); descenso concordante ≥ 1 mm en V1–V3 (3 puntos); elevación discordante ≥ 5 mm (2 puntos); ≥ 3 puntos es específico',
        ),
        source: 'Sgarbossa 1996',
      },
      {
        label: l('Smith改良标准', 'Smith-modified rule', 'Regla modificada de Smith'),
        value: l(
          '以不成比例的不一致性抬高（ST/S≤−0.25，ST抬高≥1 mm）替代≥5 mm标准',
          'Replaces the ≥ 5 mm criterion with disproportionate discordant elevation (ST/S ≤ −0.25 with ST elevation ≥ 1 mm)',
          'Sustituye el criterio de ≥ 5 mm por la elevación discordante desproporcionada (ST/S ≤ −0,25 con elevación ≥ 1 mm)',
        ),
        source: 'Smith 2012',
      },
      {
        label: l('心室起搏', 'Ventricular pacing', 'Estimulación ventricular'),
        value: l('改良Sgarbossa标准同样适用于心室起搏心律', 'The modified Sgarbossa criteria also apply to ventricular paced rhythm', 'Los criterios de Sgarbossa modificados también se aplican al ritmo de marcapasos ventricular'),
        source: 'Dodd 2021',
      },
      {
        label: l('巴塞罗那标准（替代方法）', 'Barcelona algorithm (alternative)', 'Algoritmo de Barcelona (alternativa)'),
        value: l(
          '任一导联与QRS同向的ST偏移≥1 mm，或QRS最大振幅≤6 mm的导联中不一致性ST偏移≥1 mm',
          'ST deviation ≥ 1 mm concordant with the QRS in any lead, or discordant ST deviation ≥ 1 mm in a lead whose largest QRS deflection is ≤ 6 mm',
          'Desviación del ST ≥ 1 mm concordante con el QRS en cualquier derivación, o desviación discordante ≥ 1 mm en una derivación cuya mayor deflexión del QRS sea ≤ 6 mm',
        ),
        source: 'Di Marco 2020',
      },
    ],
    mechanism: l(
      '左束支阻滞和右心室起搏时心室激动顺序异常，ST-T本应与QRS方向相反且大小成比例。闭塞会叠加自己的损伤向量，表现为与QRS同向的ST偏移，或相对其QRS过大的不一致性偏移。',
      'In LBBB and right ventricular pacing the ventricles activate in an abnormal order, so the ST–T normally points opposite the QRS and in proportion to it. An occlusion adds its own injury vector, which shows up as an ST shift in the same direction as the QRS or as a discordant shift too large for the QRS that carries it.',
      'En el BRI y la estimulación del ventrículo derecho los ventrículos se activan en un orden anómalo, de modo que el ST-T se opone normalmente al QRS y es proporcional a él. Una oclusión añade su propio vector de lesión, que aparece como un desplazamiento del ST en el mismo sentido que el QRS o como un desplazamiento discordante demasiado grande para su QRS.',
    ),
    mimics: [
      {
        id: 'lbbb',
        discriminator: l(
          '单纯左束支阻滞的ST-T全部不一致且成比例（ST/S>−0.25）。',
          'Uncomplicated LBBB has a fully discordant, proportionate ST–T (ST/S > −0.25).',
          'El BRI no complicado tiene un ST-T totalmente discordante y proporcionado (ST/S > −0,25).',
        ),
        leads: ['V1', 'V2', 'V3', 'V5', 'V6'],
      },
      {
        id: 'paced-rhythm',
        discriminator: l(
          '正常起搏心律的ST-T与起搏QRS方向相反，幅度成比例。',
          'Normal paced rhythm has an ST–T opposite the paced QRS and proportionate to it.',
          'El ritmo de marcapasos normal tiene un ST-T opuesto al QRS estimulado y proporcionado a él.',
        ),
        leads: ['V1', 'V2', 'V3', 'V5', 'V6'],
      },
      {
        id: 'lvh-strain',
        discriminator: l(
          '左心室肥厚的不一致性抬高与深S波成比例，QRS<120 ms。',
          'LVH gives discordant elevation proportionate to deep S waves, with QRS < 120 ms.',
          'La HVI da una elevación discordante proporcionada a S profundas, con QRS < 120 ms.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
    ],
    pitfalls: [
      l(
        '把新发（或推测为新发）的左束支阻滞本身当作STEMI等危症——它本身不是，应用Sgarbossa/Smith标准判断。',
        'Treating new (or presumed new) LBBB by itself as a STEMI equivalent: it is not; apply the Sgarbossa or Smith criteria.',
        'Considerar un BRI nuevo (o presuntamente nuevo) por sí solo como equivalente de IAMCEST: no lo es; aplica los criterios de Sgarbossa o de Smith.',
      ),
      l(
        '因为“左束支阻滞无法判读”而放弃读图，漏掉一致性改变。',
        'Giving up because “LBBB cannot be read” and missing a concordant change.',
        'Rendirse porque «el BRI no se puede leer» y pasar por alto un cambio concordante.',
      ),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '启动直接PCI流程；即使标准阴性，伴持续缺血症状的左束支阻滞或起搏心律也应按直接PCI策略处理。',
        'Activate the primary PCI pathway; with ongoing ischaemic symptoms, LBBB or a paced rhythm leads to a primary PCI strategy even when the criteria are negative.',
        'Activa el circuito de ICP primaria; con síntomas isquémicos persistentes, un BRI o un ritmo de marcapasos llevan a una estrategia de ICP primaria aunque los criterios sean negativos.',
      ),
    },
    lessons: ['i10', 'o11'],
    sources: [REF.sgarbossa1996, REF.smith2012, R.dodd2021, R.diMarco2020, REF.udmi2018, REF.escAcs2023],
    aka: ['Sgarbossa', 'Smith-modified Sgarbossa', 'Barcelona criteria', 'LBBB MI', 'criterios de Sgarbossa', 'Sgarbossa标准'],
    exemplar: { scenarios: ['sgarbossa'], leads: ['V1', 'V2', 'V3', 'V5', 'V6'] },
  },
];
