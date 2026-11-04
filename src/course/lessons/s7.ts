/**
 * S7 — Normal variants: early repolarization, juvenile T waves, incomplete RBBB, athletes and children
 * (docs/PLAN.md §3, stage S; stage goal: accept the full normal range without over-calling).
 * Criteria: docs/curriculum/criteria.md `early-repolarization` (ERP vs normal male-pattern ST elevation vs syndrome),
 * `t-juvenile-variant`, `rbbb-incomplete`, "Athlete's ECG — Normal vs abnormal findings", "Athlete ECG — chamber
 * criteria", `paed-rate-pr`, `paed-t-and-dominance`, `paed-axis`, "Brugada pattern / syndrome".
 */
import { l } from '../../core/l10n';
import type { EcgSource, Item } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});
const NEVER_SEED = 712;

const athleteCheck: Item = {
  id: 's7:athlete-workup',
  family: 'spot',
  competency: 'C11',
  difficulty: 'classic',
  seed: 0,
  kind: 'choice',
  prompt: l(
    '22 岁足球运动员，无症状。这份心电图上哪一项需要进一步检查？',
    'A 22-year-old footballer with no symptoms. Which finding on this ECG needs further tests?',
    'Futbolista de 22 años, asintomático. ¿Qué hallazgo de este ECG requiere más pruebas?',
  ),
  ecg: synth('athlete', 711, undefined, 'first-degree'),
  explanation: l(
    '都不需要。在运动员中，≥ 30 次/分的窦性心动过缓、PR < 400 ms 的一度房室传导阻滞、不完全性右束支阻滞和早期复极都是训练相关改变。同样的 PR 出现在一位晕厥的 70 岁老人身上，解读就不同了：背景决定结论。',
    'None. In an athlete, sinus bradycardia ≥ 30/min, first-degree AV block with a PR < 400 ms, incomplete RBBB and early repolarisation are all training-related. The same PR in a 70-year-old with syncope would be read differently: context decides.',
    'Ninguno. En un deportista, la bradicardia sinusal ≥ 30 lpm, el bloqueo AV de primer grado con PR < 400 ms, el bloqueo incompleto de rama derecha y la repolarización precoz son cambios relacionados con el entrenamiento. El mismo PR en una persona de 70 años con síncope se interpretaría de otro modo: el contexto decide.',
  ),
  findings: ['athlete-changes', 'av-block-1'],
  key: {
    options: [
      { id: 'none', label: l('都不需要：全部是训练相关改变', 'None: all are training-related', 'Ninguno: todos son cambios del entrenamiento') },
      { id: 'brady', label: l('约 48 次/分的窦性心动过缓', 'Sinus bradycardia of about 48/min', 'Bradicardia sinusal de unos 48 lpm') },
      { id: 'pr', label: l('约 220 ms 的 PR 间期', 'A PR interval of about 220 ms', 'Un intervalo PR de unos 220 ms') },
      { id: 'rsr', label: l('V1 的 rSr′', 'The rSr′ in V1', 'La rSr′ en V1') },
    ],
    correct: 'none',
  },
};

const lesson: Lesson = {
  id: 's7',
  stage: 'S',
  order: 7,
  title: l(
    '正常变异：早期复极、幼年型 T 波、不完全性右束支传导阻滞、运动员与儿童',
    'Normal variants: early repolarization, juvenile T waves, incomplete RBBB, athletes and children',
    'Variantes normales: repolarización precoz, patrón juvenil de la onda T, bloqueo incompleto de rama derecha, deportistas y niños',
  ),
  summary: l(
    '认识常见的正常变异，知道它们的边界，不把正常判为异常——也知道哪些表现永远不是变异。',
    'Recognise the common normal variants and their limits so you do not over-call normal, and know which findings are never a variant.',
    'Reconoce las variantes normales frecuentes y sus límites para no sobrediagnosticar lo normal, y sabe qué hallazgos nunca son una variante.',
  ),
  objectives: [
    l('识别早期复极图形、正常男性型 ST 抬高、幼年型 T 波和 rSr′/不完全性右束支阻滞。', 'Recognise the early repolarisation pattern, normal male-pattern ST elevation, the juvenile T pattern and rSr′ / incomplete RBBB.', 'Reconocer el patrón de repolarización precoz, la elevación del ST normal de patrón masculino, el patrón juvenil de la T y la rSr′ / bloqueo incompleto de rama derecha.'),
    l('用 2017 国际标准把运动员心电图分为正常、临界和异常。', 'Sort an athlete’s ECG into normal, borderline and abnormal findings with the 2017 international criteria.', 'Clasificar el ECG de un deportista en hallazgos normales, límite y anormales con los criterios internacionales de 2017.'),
    l('说出永远不是正常变异的表现。', 'Name the findings that are never a normal variant.', 'Nombrar los hallazgos que nunca son una variante normal.'),
  ],
  minutes: 18,
  competencies: ['C11'],
  findings: ['early-repolarization', 'juvenile-t', 'irbbb', 'athlete-changes', 'sinus-bradycardia', 'sinus-arrhythmia'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('athlete', 702),
      question: l(
        '22 岁足球运动员，无症状，参赛前筛查。列出你看到的表现，并说出哪些需要进一步检查。',
        'A 22-year-old footballer with no symptoms, pre-participation screening. List what you see and say which findings need further tests.',
        'Futbolista de 22 años, asintomático, en el reconocimiento previo a la competición. Enumera lo que ves y di qué hallazgos requieren más pruebas.',
      ),
      reveal: l(
        '窦性心动过缓（约 48 次/分）伴轻度窦性心律不齐，V1 呈 rSr′（不完全性右束支阻滞图形，QRS 约 115 ms），胸导联电压高（SV1 + RV5 ≈ 36 mm，单纯达到左心室肥厚的电压标准），II 和 V5–V6 的 J 点抬高约 1–1.5 mm（2017 运动员标准称之为“早期复极/ST 抬高”，比本课讲的切迹/顿挫定义宽松）。**都不需要进一步检查**：对训练有素的运动员，这些都是训练相关改变。哪些表现需要检查，本课后面会列出（例如 V1–V3 以外或侧壁的 T 波倒置、ST 段压低、病理性 Q 波、QRS ≥ 140 ms）。',
        'Sinus bradycardia (about 48/min) with mild sinus arrhythmia, an rSr′ in V1 (incomplete RBBB pattern, QRS about 115 ms), tall chest-lead voltages (SV1 + RV5 ≈ 36 mm: an isolated voltage criterion for LVH) and about 1–1.5 mm of J-point elevation in II and V5–V6 (what the 2017 athlete criteria call “early repolarisation / ST elevation”, a looser use of the term than the notch-or-slur definition taught in this lesson). **None needs further tests**: in a trained athlete all of them are training-related. What would need work-up is listed later in this lesson (for example T inversion beyond V1–V3 or in the lateral leads, ST depression, pathological Q waves, a QRS ≥ 140 ms).',
        'Bradicardia sinusal (unos 48 lpm) con arritmia sinusal leve, rSr′ en V1 (patrón de bloqueo incompleto de rama derecha, QRS de unos 115 ms), voltajes precordiales altos (SV1 + RV5 ≈ 36 mm: un criterio aislado de voltaje de HVI) y una elevación del punto J de unos 1–1,5 mm en II y V5–V6 (lo que los criterios de deportistas de 2017 llaman “repolarización precoz / elevación del ST”, un uso más laxo del término que la definición por la muesca o el empastamiento que enseña esta lección). **Ninguno requiere más pruebas**: en un deportista entrenado todos son cambios relacionados con el entrenamiento. Lo que sí requeriría estudio se enumera más adelante en esta lección (por ejemplo, T negativas más allá de V1–V3 o en las derivaciones laterales, descenso del ST, ondas Q patológicas o un QRS ≥ 140 ms).',
      ),
    },
    {
      kind: 'live',
      scenario: 'early-repolarization',
      seed: 701,
      dials: [{ id: 'st' }],
      marks: [{ auto: 'j', lead: 'II' }, { auto: 'j', lead: 'aVF' }, { auto: 'j', lead: 'V5' }],
      play: {
        dial: 'st',
        from: 0.06,
        to: 0.14,
        notes: [
          {
            min: 0.06,
            max: 0.08,
            text: l(
              'J 标记前的**切迹**：II 约 3.5 mm、aVF 约 3 mm，QRS < 120 ms：图形已经在了。之后的 ST 还 < 1 mm。',
              'The **notch** just before the J mark: about 3.5 mm in II, 3 mm in aVF, QRS < 120 ms. The pattern is already there; the ST after it is under 1 mm.',
              'La **muesca** justo antes de la marca J: unos 3,5 mm en II y 3 mm en aVF, QRS < 120 ms. El patrón ya está; el ST que sigue está por debajo de 1 mm.',
            ),
          },
          {
            min: 0.09,
            max: 0.14,
            text: l(
              'II 在 J 标记处的 ST 也到了 1 mm，切迹仍约 3.5–4 mm。决定图形的是切迹，不是 ST。',
              'The ST at the J mark in II now reaches 1 mm too; the notch is still about 3.5–4 mm. The notch decides the pattern, not the ST.',
              'El ST en la marca J de II llega ahora también a 1 mm; la muesca sigue en unos 3,5–4 mm. Lo que define el patrón es la muesca, no el ST.',
            ),
          },
        ],
      },
      predict: {
        question: l(
          '我们把 ST 旋钮调高。看 II 和 aVF 的 QRS 末端：那里的切迹会怎样？',
          'We turn the ST dial up. Watch the end of the QRS in II and aVF: what happens to the notch there?',
          'Subimos el mando del ST. Mira el final del QRS en II y aVF: ¿qué le pasa a la muesca?',
        ),
        options: [
          l('从头到尾都在，其后的 ST 逐渐抬高', 'It stays from start to end while the ST after it rises', 'Sigue ahí de principio a fin mientras sube el ST que la sigue'),
          l('等 ST 抬高之后才出现', 'It appears only once the ST has risen', 'Solo aparece cuando el ST ya ha subido'),
          l('随着 ST 抬高而消失', 'It fades away as the ST rises', 'Desaparece a medida que sube el ST'),
        ],
        answer: 0,
      },
      caption: l(
        '早期复极看 QRS 末端**切迹或顿挫的顶点**，不看 ST：两个相邻下壁或侧壁导联 ≥ 1 mm。这里切迹 > 2 mm、在下壁、其后 ST 水平，属高危特征；但只在有症状（如不明原因晕厥）或猝死家族史时才有意义，否则仍是正常变异。',
        'Early repolarisation is read at the **top of the notch or slur** at the end of the QRS, not at the ST: ≥ 1 mm in two contiguous inferior or lateral leads. This notch is over 2 mm, inferior, with a horizontal ST after it: higher-risk features, but they matter only with symptoms such as unexplained syncope or a family history of sudden death. Otherwise it is a normal variant.',
        'La repolarización precoz se mide en el **vértice de la muesca o del empastamiento** al final del QRS, no en el ST: ≥ 1 mm en dos derivaciones contiguas inferiores o laterales. Esta muesca supera los 2 mm, es inferior y el ST que sigue es horizontal: rasgos de mayor riesgo, que solo importan si hay síntomas (como un síncope inexplicado) o antecedentes familiares de muerte súbita. Si no, es una variante normal.',
      ),
    },
    {
      kind: 'film',
      title: l('每周都会遇到的变异', 'Variants you meet every week', 'Variantes que verás cada semana'),
      frames: [
        {
          label: l('幼年型 T 波', 'Juvenile T', 'T juvenil'),
          ecg: synth('juvenile-t', 703),
          note: l(
            '16 岁女孩：V1–V3 的 T 波倒置，V4 起直立。16 岁以前正常；从 16 岁起倒置到 V3，非运动员多为良性，运动员属异常。',
            'Girl of 16: T inverted in V1–V3, upright from V4. Normal under 16; from 16, inversion reaching V3 is usually benign in a non-athlete but abnormal in an athlete.',
            'Chica de 16 años: T negativa en V1–V3 y positiva desde V4. Normal antes de los 16; desde los 16, que llegue a V3 suele ser benigno en un no deportista, pero es anormal en un deportista.',
          ),
          marks: [{ auto: 't', lead: 'V2' }, { auto: 't', lead: 'V5' }],
        },
        {
          label: l('V1 的 rSr′', 'rSr′ in V1', 'rSr′ en V1'),
          ecg: synth('irbbb', 704),
          note: l('V1 呈 rSr′，QRS 约 118 ms（110–119）：不完全性右束支阻滞。QRS < 110 ms 的 rSr′ 只是正常变异。', 'rSr′ in V1 with a QRS of about 118 ms (110–119): incomplete RBBB. An rSr′ under 110 ms is just a normal variant.', 'rSr′ en V1 con QRS de unos 118 ms (110–119): bloqueo incompleto de rama derecha. Una rSr′ por debajo de 110 ms es solo una variante normal.'),
          marks: [{ auto: 'qrs', lead: 'V1' }, { auto: 'r', lead: 'V1' }],
        },
      ],
      caption: l(
        '两种常见变异，各有一条界线：T 波倒置到哪个导联、QRS 有多宽。',
        'Two common variants, each with one line to check: how far the T inversion reaches, and how wide the QRS is.',
        'Dos variantes frecuentes, cada una con un límite que comprobar: hasta dónde llega la T negativa y cuánto mide el QRS.',
      ),
    },
    {
      kind: 'criteria',
      title: l('常见正常变异（除注明外为成人）', 'Common normal variants (adults unless stated)', 'Variantes normales frecuentes (adultos salvo que se indique)'),
      items: [
        {
          label: l('早期复极图形', 'Early repolarisation pattern', 'Patrón de repolarización precoz'),
          value: l('≥ 2 个相邻下壁和/或侧壁导联（不含 V1–V3）J 点切迹/顿挫 ≥ 1 mm，QRS < 120 ms；不要求 ST 抬高', 'J notch or slur ≥ 1 mm in ≥ 2 contiguous inferior and/or lateral leads (V1–V3 excluded), QRS < 120 ms; ST elevation not required', 'Muesca o empastamiento J ≥ 1 mm en ≥ 2 derivaciones contiguas inferiores y/o laterales (sin V1–V3), QRS < 120 ms; no exige elevación del ST'),
        },
        {
          label: l('高危特征（仅在有症状或猝死家族史时有意义）', 'Higher-risk features (matter only with symptoms or a family history of sudden death)', 'Rasgos de mayor riesgo (solo importan con síntomas o antecedentes familiares de muerte súbita)'),
          value: l('J 点 ≥ 2 mm、下壁或广泛分布、J 点后 ST 水平或下斜', 'J point ≥ 2 mm, inferior or global distribution, horizontal or descending ST after the J point', 'Punto J ≥ 2 mm, distribución inferior o global, ST horizontal o descendente tras el punto J'),
        },
        {
          label: l('早期复极综合征', 'Early repolarisation syndrome', 'Síndrome de repolarización precoz'),
          value: l('只用于心室颤动/多形性室速复苏后的患者', 'Only after a resuscitated VF or polymorphic VT', 'Solo tras una FV o TV polimórfica recuperada'),
        },
        {
          label: l('正常男性型 ST 抬高（V2–V3，J 点）', 'Normal male-pattern ST elevation (V2–V3, J point)', 'Elevación normal del ST de patrón masculino (V2–V3, punto J)'),
          value: l('< 40 岁男性 < 2.5 mm；≥ 40 岁男性 < 2 mm；女性 < 1.5 mm', '< 2.5 mm men < 40 y; < 2 mm men ≥ 40 y; < 1.5 mm women', '< 2,5 mm varones < 40 años; < 2 mm varones ≥ 40 años; < 1,5 mm mujeres'),
        },
        {
          label: l('幼年型 T 波', 'Juvenile T pattern', 'Patrón juvenil de la T'),
          value: l('< 16 岁 V1–V3 倒置正常；≥ 16 岁仅 V1（± V2）', 'Inversion in V1–V3 normal < 16 y; from 16 y only V1 (± V2)', 'T negativa en V1–V3 normal < 16 años; desde los 16, solo V1 (± V2)'),
        },
        {
          label: l('V1 的 rSr′', 'rSr′ in V1', 'rSr′ en V1'),
          value: l('QRS < 110 ms 为正常变异；110–119 ms 为不完全性右束支阻滞', 'QRS < 110 ms: normal variant; 110–119 ms: incomplete RBBB', 'QRS < 110 ms: variante normal; 110–119 ms: bloqueo incompleto de rama derecha'),
        },
        {
          label: l('不完全性右束支阻滞的形态', 'Incomplete RBBB: the shape', 'Bloqueo incompleto de rama derecha: la morfología'),
          value: l(
            'V1 呈 rSr′，I 和 V6 的 S 波顿挫；成人 QRS < 120 ms（110–119 ms）',
            'rSr′ in V1 with a slurred S in I and V6; QRS < 120 ms in adults (110–119 ms)',
            'rSr′ en V1 con S empastada en I y V6; QRS < 120 ms en adultos (110–119 ms)',
          ),
        },
        {
          label: l('16 岁起 T 波倒置到 V3', 'T inversion reaching V3 from 16 y', 'T negativa hasta V3 desde los 16 años'),
          value: l(
            '持续的幼年型 T 波：非运动员多为良性，有症状或猝死家族史时需评估；运动员按 2017 国际标准属异常（黑人运动员复极图形除外）',
            'Persistent juvenile pattern: usually benign in a non-athlete, but evaluate with symptoms or a family history of sudden death; abnormal in an athlete under the 2017 international criteria (except the Black-athlete repolarisation pattern)',
            'Patrón juvenil persistente: suele ser benigno en un no deportista, pero hay que estudiarlo si hay síntomas o antecedentes familiares de muerte súbita; en un deportista es anormal según los criterios internacionales de 2017 (salvo el patrón de repolarización del deportista de raza negra)',
          ),
        },
        { label: l('儿童：心率', 'Children: rate', 'Niños: frecuencia'), value: l('更快：出生后数月中位数约 150 次/分，青少年约 75–80 次/分', 'Faster: median about 150/min in the first months, about 75–80/min in teenagers', 'Más rápida: mediana de unos 150 lpm en los primeros meses, unos 75–80 lpm en adolescentes') },
        {
          label: l('儿童：PR 与 QRS', 'Children: PR and QRS', 'Niños: PR y QRS'),
          value: l('更短；一度房室传导阻滞指 PR 超过年龄别第 98 百分位，而不是 > 200 ms', 'Shorter; first-degree AV block means a PR above the 98th centile for age, not > 200 ms', 'Más cortos; el bloqueo AV de primer grado es un PR por encima del percentil 98 para la edad, no > 200 ms'),
        },
        {
          label: l('新生儿', 'Newborns', 'Recién nacidos'),
          value: l('电轴偏右、右心室占优势（V1 高 R）是正常的，在最初几年逐渐消退', 'A rightward axis and RV dominance (tall R in V1) are normal and fade over the first years', 'El eje derecho y el predominio del ventrículo derecho (R alta en V1) son normales y desaparecen en los primeros años'),
        },
        {
          label: l('儿童：V1 的 T 波', 'Children: T in V1', 'Niños: T en V1'),
          value: l(
            '出生后一周内转为倒置并保持到青春期；1 周至青春期之间直立提示右心室肥厚。用年龄别参考表',
            'Inverts within the first week and stays inverted until adolescence; upright between 1 week and adolescence suggests RV hypertrophy. Use age-specific tables',
            'Se hace negativa en la primera semana y sigue así hasta la adolescencia; positiva entre la primera semana y la adolescencia sugiere hipertrofia ventricular derecha. Usa tablas por edad',
          ),
        },
      ],
      source: 'Macfarlane PW et al. J Am Coll Cardiol 2015;66:470; Antzelevitch C et al. Heart Rhythm 2016;13:e295; Zeppenfeld K et al. Eur Heart J 2022;43:3997; Thygesen K et al. Eur Heart J 2019;40:237; Sharma S, Drezner JA et al. J Am Coll Cardiol 2017;69:1057; Surawicz B et al. Circulation 2009;119:e235',
    },
    {
      kind: 'criteria',
      title: l('运动员心电图（2017 国际标准）', 'Athlete ECG (2017 international criteria)', 'ECG del deportista (criterios internacionales de 2017)'),
      items: [
        {
          label: l('正常（训练相关）', 'Normal (training-related)', 'Normal (relacionado con el entrenamiento)'),
          value: l(
            '窦性心动过缓 ≥ 30 次/分；窦性心律不齐；房性异位或交界性逸搏心律；一度房室传导阻滞（PR < 400 ms）；莫氏 I 型；不完全性右束支阻滞；单纯 QRS 电压达左/右心室肥厚标准；早期复极；黑人运动员复极图形；< 16 岁幼年型 T 波',
            'Sinus bradycardia ≥ 30/min; sinus arrhythmia; ectopic atrial or junctional escape rhythm; first-degree AV block (PR < 400 ms); Mobitz I; incomplete RBBB; isolated QRS voltage criteria for LVH or RVH; early repolarisation; the Black-athlete repolarisation pattern; juvenile T pattern < 16 y',
            'Bradicardia sinusal ≥ 30 lpm; arritmia sinusal; ritmo auricular ectópico o de escape de la unión; bloqueo AV de primer grado (PR < 400 ms); Mobitz I; bloqueo incompleto de rama derecha; criterios aislados de voltaje de HVI o HVD; repolarización precoz; patrón de repolarización del deportista de raza negra; patrón juvenil de la T < 16 años',
          ),
        },
        {
          label: l('临界（≥ 2 项 → 评估）', 'Borderline (≥ 2 → evaluate)', 'Límite (≥ 2 → estudiar)'),
          value: l('电轴左偏；电轴右偏；左或右心房异常；完全性右束支阻滞', 'Left axis deviation; right axis deviation; left or right atrial abnormality; complete RBBB', 'Desviación del eje a la izquierda; desviación a la derecha; anomalía auricular izquierda o derecha; bloqueo completo de rama derecha'),
        },
        {
          label: l('异常（评估）', 'Abnormal (evaluate)', 'Anormal (estudiar)'),
          value: l(
            '上述例外之外的 T 波倒置 ≥ 1 mm（≥ 2 个相邻导联，尤其侧壁/下侧壁）；ST 压低 ≥ 0.5 mm；病理性 Q 波；完全性左束支阻滞；QRS ≥ 140 ms；ε 波；心室预激；QTc 男 ≥ 470、女 ≥ 480 ms；Brugada 1 型；心率 < 30 次/分或停搏 ≥ 3 s；PR ≥ 400 ms；莫氏 II 型或三度阻滞；每份图 ≥ 2 个室性期前收缩；房性快速心律失常',
            'T inversion ≥ 1 mm in ≥ 2 contiguous leads beyond the exceptions (especially lateral or inferolateral); ST depression ≥ 0.5 mm; pathological Q waves; complete LBBB; QRS ≥ 140 ms; epsilon wave; pre-excitation; QTc ≥ 470 ms (men) or ≥ 480 ms (women); Brugada type 1; rate < 30/min or pauses ≥ 3 s; PR ≥ 400 ms; Mobitz II or third-degree block; ≥ 2 PVCs per tracing; atrial tachyarrhythmias',
            'T negativa ≥ 1 mm en ≥ 2 derivaciones contiguas fuera de las excepciones (sobre todo laterales o inferolaterales); descenso del ST ≥ 0,5 mm; ondas Q patológicas; bloqueo completo de rama izquierda; QRS ≥ 140 ms; onda épsilon; preexcitación; QTc ≥ 470 ms (varones) o ≥ 480 ms (mujeres); Brugada tipo 1; frecuencia < 30 lpm o pausas ≥ 3 s; PR ≥ 400 ms; Mobitz II o bloqueo de tercer grado; ≥ 2 extrasístoles ventriculares por trazado; taquiarritmias auriculares',
          ),
        },
        {
          label: l('黑人运动员复极图形', 'Black-athlete repolarisation pattern', 'Patrón de repolarización del deportista de raza negra'),
          value: l('V1–V4 的 J 点抬高和凸面型 ST 抬高，随后 T 波倒置：在黑人运动员中属正常', 'J-point elevation and convex ST elevation followed by T inversion in V1–V4: normal in Black athletes', 'Elevación del punto J y del ST convexo seguida de T negativa en V1–V4: normal en deportistas de raza negra'),
        },
      ],
      source: 'Sharma S, Drezner JA et al. International recommendations for electrocardiographic interpretation in athletes. J Am Coll Cardiol 2017;69:1057; Eur Heart J 2018;39:1466',
    },
    {
      kind: 'worked',
      title: l('按三组分类一份运动员心电图', 'Sorting an athlete’s ECG into the three groups', 'Clasificar el ECG de un deportista en los tres grupos'),
      ecg: synth('athlete', 702),
      steps: [
        {
          title: l('心率与节律', 'Rate and rhythm', 'Frecuencia y ritmo'),
          body: l('窦性心律，约 48 次/分，RR 略有变化：窦性心动过缓伴窦性心律不齐，≥ 30 次/分——正常组。', 'Sinus rhythm at about 48/min with slightly varying RR: sinus bradycardia with sinus arrhythmia, ≥ 30/min. Normal group.', 'Ritmo sinusal a unos 48 lpm con RR algo variable: bradicardia sinusal con arritmia sinusal, ≥ 30 lpm. Grupo normal.'),
          marks: [{ auto: 'rr' }, { auto: 'p' }],
        },
        {
          title: l('QRS', 'QRS', 'QRS'),
          body: l(
            'V1 呈 rSr′，QRS 约 115 ms：不完全性右束支阻滞图形——正常组，远低于需要评估的 140 ms。胸导联电压高：SV1 + RV5 ≈ 36 mm，单纯达到左心室肥厚的电压标准——没有 ST 压低、T 波倒置或病理性 Q 波时，也属于正常组。',
            'rSr′ in V1 with a QRS of about 115 ms: incomplete RBBB pattern — normal group, and far below the 140 ms that would need evaluation. Tall chest-lead voltages: SV1 + RV5 ≈ 36 mm, an isolated voltage criterion for LVH — also normal group, as long as there is no ST depression, T inversion or pathological Q wave.',
            'rSr′ en V1 con QRS de unos 115 ms: patrón de bloqueo incompleto de rama derecha; grupo normal, y muy por debajo de los 140 ms que requerirían estudio. Voltajes precordiales altos: SV1 + RV5 ≈ 36 mm, un criterio aislado de voltaje de HVI; también grupo normal mientras no haya descenso del ST, T negativas ni ondas Q patológicas.',
          ),
          marks: [{ auto: 'qrs', lead: 'V1' }, { auto: 'r', lead: 'V5' }],
          highlightLeads: ['V1', 'V5'],
        },
        {
          title: l('复极', 'Repolarisation', 'Repolarización'),
          body: l(
            'II 和 V5–V6 的 J 点抬高约 1–1.5 mm。2017 运动员标准称之为早期复极/ST 抬高（比上面的切迹/顿挫定义宽松），归入正常组。没有 ST 压低，T 波倒置不超过 V2：没有异常组表现。',
            'About 1–1.5 mm of J-point elevation in II and V5–V6. The 2017 athlete criteria call this early repolarisation / ST elevation (a looser use than the notch-or-slur definition above) and put it in the normal group. No ST depression and no T inversion beyond V2: nothing from the abnormal group.',
            'Elevación del punto J de unos 1–1,5 mm en II y V5–V6. Los criterios de deportistas de 2017 la llaman repolarización precoz / elevación del ST (un uso más laxo que la definición por la muesca o el empastamiento de arriba) y la sitúan en el grupo normal. Sin descenso del ST ni T negativas más allá de V2: nada del grupo anormal.',
          ),
          marks: [{ auto: 'j', lead: 'V5' }, { auto: 'j', lead: 'II' }],
          highlightLeads: ['V1', 'V2', 'V4', 'V5', 'V6', 'II', 'aVF'],
        },
        {
          title: l('结论', 'Conclusion', 'Conclusión'),
          body: l('只有训练相关改变，没有临界或异常表现：**运动员正常心电图**，不需要进一步检查。', 'Only training-related findings, nothing borderline or abnormal: **normal athlete ECG**, no further tests.', 'Solo cambios relacionados con el entrenamiento, nada límite ni anormal: **ECG normal de deportista**, sin más pruebas.'),
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('T 波倒置：在哪里？', 'T inversion: where is it?', 'T negativa: ¿dónde está?'),
      left: {
        ecg: synth('juvenile-t', 705),
        caption: l('16 岁女孩', 'Girl, 16', 'Chica de 16 años'),
        marks: [{ auto: 't', lead: 'V2' }, { auto: 't', lead: 'V5' }],
      },
      right: {
        ecg: synth('lvh-strain', 706),
        caption: l('67 岁男性', 'Man, 67', 'Varón de 67 años'),
        marks: [{ auto: 't', lead: 'V5' }, { auto: 'st60', lead: 'V5' }],
      },
      point: l(
        'A：T 波倒置只在右胸导联（V1–V3），V4 起直立——幼年型。16 岁以前它就是正常的；从 16 岁起延伸到 V3 就不再是正常的幼年型：非运动员多为良性，但运动员属异常，有症状时也要评估。B：侧壁导联 V5–V6 以及 I、aVL 的 T 波倒置伴 ST 压低，V1–V3 的 S 波很深：侧壁 T 波倒置永远不是正常变异，这里是左心室肥厚伴继发性 ST–T 改变（在年轻运动员身上要想到心肌病）。',
        'A: T inversion only in the right chest leads (V1–V3), upright from V4: the juvenile pattern. Under 16 it is simply normal; from 16, inversion reaching V3 is no longer the normal juvenile pattern: often benign in a non-athlete, but abnormal in an athlete and worth evaluating with symptoms. B: T inversion with ST depression in the lateral leads V5–V6 and in I and aVL, with deep S waves in V1–V3. Lateral T inversion is never a normal variant: here it is LVH with secondary ST–T abnormality (in a young athlete, think of cardiomyopathy).',
        'A: T negativa solo en las precordiales derechas (V1–V3) y positiva desde V4: patrón juvenil. Antes de los 16 años es sencillamente normal; desde los 16, que llegue a V3 ya no es el patrón juvenil normal: suele ser benigno en un no deportista, pero es anormal en un deportista y hay que estudiarlo si hay síntomas. B: T negativa con descenso del ST en las derivaciones laterales V5–V6 y en I y aVL, con ondas S profundas en V1–V3. La T negativa lateral nunca es una variante normal: aquí es una HVI con alteración secundaria del ST–T (en un deportista joven, piensa en una miocardiopatía).',
      ),
    },
    {
      kind: 'contrast',
      title: l('V1–V2 的 ST 抬高：变异还是 Brugada？', 'ST elevation in V1–V2: variant or Brugada?', 'Elevación del ST en V1–V2: ¿variante o Brugada?'),
      view: { highlightLeads: ['V1', 'V2', 'V3'] },
      left: {
        ecg: synth('early-repolarization', 707),
        caption: l('24 岁男性', 'Man, 24', 'Varón de 24 años'),
      },
      right: {
        ecg: synth('brugada-type1', 708),
        caption: l('38 岁男性', 'Man, 38', 'Varón de 38 años'),
      },
      point: l(
        'A：V2 的 ST 凹面向上抬高，V2–V3 的 T 波直立（V1 的 T 浅倒，单独出现在 V1 是正常的），II、aVF、V5 和 V6 有 J 点切迹：早期复极，正常。B：V1–V2 穹窿形（coved）ST 抬高 ≥ 2 mm，下斜进入倒置的 T 波，其他导联没有类似改变：Brugada 1 型图形。它永远不是正常变异，需要转诊（第 H8 课）。',
        'A: concave ST elevation in V2, upright T waves in V2–V3 (the T in V1 is shallowly inverted, which is normal in V1 alone), and J notches in II, aVF, V5 and V6: early repolarisation, normal. B: coved ST elevation ≥ 2 mm in V1–V2 sloping down into a negative T, nothing similar elsewhere: Brugada type 1 pattern. It is never a normal variant and needs referral (lesson H8).',
        'A: elevación cóncava del ST en V2, ondas T positivas en V2–V3 (la T de V1 es negativa y poco profunda, algo normal cuando se limita a V1) y muescas J en II, aVF, V5 y V6: repolarización precoz, normal. B: elevación del ST en forma de cúpula (coved) ≥ 2 mm en V1–V2 que desciende hacia una T negativa, sin nada parecido en otras derivaciones: patrón de Brugada tipo 1. Nunca es una variante normal y requiere derivación (lección H8).',
      ),
    },
    {
      kind: 'film',
      title: l('永远不是变异', 'Never a variant', 'Nunca son una variante'),
      frames: [
        {
          label: l('病理性 Q 波', 'Pathological Q', 'Q patológica'),
          ecg: synth('old-mi', NEVER_SEED),
          note: l('V2–V3 呈 QS 波：本该长出 R 波的地方完全没有 R。病理性 Q 波永远需要检查。', 'QS complexes in V2–V3: no R at all where it should grow. Pathological Q waves always need work-up.', 'Complejos QS en V2–V3: ninguna R donde debería crecer. Las Q patológicas siempre requieren estudio.'),
        },
        {
          label: l('QRS ≥ 140 ms', 'QRS ≥ 140 ms', 'QRS ≥ 140 ms'),
          ecg: synth('lbbb', NEVER_SEED, { qrs: 150 }),
          note: l('QRS 约 150 ms，完全性左束支阻滞：≥ 140 ms 永远不是“运动员心脏”。', 'QRS about 150 ms, complete LBBB: ≥ 140 ms is never “athlete’s heart”.', 'QRS de unos 150 ms, bloqueo completo de rama izquierda: ≥ 140 ms nunca es “corazón de deportista”.'),
          marks: [{ auto: 'qrs', lead: 'V6' }],
        },
        {
          label: l('预激', 'Pre-excitation', 'Preexcitación'),
          ecg: synth('wpw', NEVER_SEED),
          note: l('PR 约 115 ms，QRS 起始部有 δ 波：心室预激需要评估，与训练无关。', 'PR about 115 ms with a delta wave: pre-excitation needs evaluation, whatever the training.', 'PR de unos 115 ms con onda delta: la preexcitación requiere estudio, sea cual sea el entrenamiento.'),
          marks: [{ auto: 'pr' }, { auto: 'delta' }],
        },
        {
          label: l('长 QTc', 'Long QTc', 'QTc largo'),
          ecg: synth('long-qt', NEVER_SEED, { qtc: 500, rate: 60 }),
          note: l(
            'QT 约 500 ms，60 次/分（RR 约 1 s），所以 QTc ≈ QT ≈ 500 ms：超过男性 470、女性 480 ms 的界值。绝非训练所致。',
            'QT about 500 ms at 60/min (RR about 1 s), so QTc ≈ QT ≈ 500 ms: over the 470-ms (men) and 480-ms (women) limits. Never a result of training.',
            'QT de unos 500 ms a 60 lpm (RR de 1 s aprox.), así que QTc ≈ QT ≈ 500 ms: por encima de los límites de 470 ms (varones) y 480 ms (mujeres). Nunca es fruto del entrenamiento.',
          ),
          marks: [{ auto: 'qt' }, { auto: 'rr' }],
        },
      ],
      caption: l(
        '训练会让心率变慢、电压变高、出现 rSr′ 和 J 点切迹，但不会造成这些。看到任何一项都要进一步评估。',
        'Training slows the rate, raises voltage and brings rSr′ and J notches, but it never makes these. Any one of them needs work-up.',
        'El entrenamiento frena la frecuencia, aumenta el voltaje y da rSr′ y muescas J, pero nunca produce esto. Cualquiera de ellos requiere estudio.',
      ),
    },
    { kind: 'check', item: { family: 'spot', seed: 6 } },
    { kind: 'check', item: { inline: athleteCheck } },
    { kind: 'check', item: { family: 'spot', seed: 17 } },
    { kind: 'check', item: { family: 'spot', seed: 27 } },
    { kind: 'check', item: { family: 'spot', seed: 13 } },
    { kind: 'drill', families: ['spot', 'spot-real'], count: 10, passScore: 0.8 },
    {
      kind: 'real',
      ids: [15112, 13683, 2084],
      caption: l(
        '三位 16 至 42 岁的受检者。每份都测 QRS，看 V1–V3 和 V2–V4 的 ST，然后判断“正常或正常变异”还是“需要评估”。其中一份标注为不完全性右束支阻滞：同意这个标注之前，先量一量它的 QRS。',
        'Three people aged 16 to 42. For each, measure the QRS, look at V1–V3 and at the ST in V2–V4, then decide “normal or normal variant” versus “needs evaluation”. One carries the label incomplete RBBB: measure its QRS before you agree with the label.',
        'Tres personas de 16 a 42 años. En cada ECG, mide el QRS, mira V1–V3 y el ST en V2–V4, y decide “normal o variante normal” frente a “requiere estudio”. Uno de ellos lleva la etiqueta de bloqueo incompleto de rama derecha: mide su QRS antes de aceptarla.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l('把所有 V1 的 rSr′ 都叫作不完全性右束支阻滞：先量 QRS（< 110 ms 为正常变异）。', 'Calling every rSr′ in V1 “incomplete RBBB”: measure the QRS first (< 110 ms is a normal variant).', 'Llamar “bloqueo incompleto de rama derecha” a toda rSr′ en V1: mide antes el QRS (< 110 ms es una variante normal).'),
        l('不看对应性改变、PR 压低和临床情况，就把早期复极叫作心包炎或 STEMI。', 'Calling early repolarisation “pericarditis” or “STEMI” without looking for reciprocity, PR depression or the clinical picture.', 'Llamar “pericarditis” o “IAMCEST” a una repolarización precoz sin buscar reciprocidad, descenso del PR ni valorar la clínica.'),
        l('把侧壁 T 波倒置当成“运动员心脏”：它永远不是变异。', 'Accepting lateral T inversion as “athlete’s heart”: it is never a variant.', 'Aceptar una T negativa lateral como “corazón de deportista”: nunca es una variante.'),
        l('对儿童使用成人界值（电轴、PR、QRS、V1 的 T 波）。', 'Using adult limits in children (axis, PR, QRS, the T in V1).', 'Usar límites de adulto en niños (eje, PR, QRS, la T en V1).'),
        l('对有症状的人套用运动员标准：晕厥或胸痛会改变一切。', 'Applying athlete criteria to someone with symptoms: syncope or chest pain changes everything.', 'Aplicar los criterios del deportista a alguien con síntomas: un síncope o un dolor torácico lo cambian todo.'),
        l('把 V1–V2 穹窿形 ST 抬高叫作早期复极：Brugada 1 型永远不是变异。', 'Calling coved ST elevation in V1–V2 “early repolarisation”: Brugada type 1 is never a variant.', 'Llamar “repolarización precoz” a una elevación del ST en cúpula en V1–V2: el Brugada tipo 1 nunca es una variante.'),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('认识变异：早期复极、正常男性型 ST 抬高、幼年型 T 波、rSr′/不完全性右束支阻滞、运动员改变。', 'Know the variants: early repolarisation, normal male-pattern ST elevation, juvenile T pattern, rSr′ / incomplete RBBB, athlete’s changes.', 'Conoce las variantes: repolarización precoz, elevación normal del ST de patrón masculino, patrón juvenil de la T, rSr′ / bloqueo incompleto de rama derecha, cambios del deportista.'),
        l('早期复极 = ≥ 2 个下壁或侧壁导联 J 点切迹/顿挫 ≥ 1 mm；无症状时为良性。', 'Early repolarisation = a J notch or slur ≥ 1 mm in ≥ 2 inferior or lateral leads; benign without symptoms.', 'Repolarización precoz = muesca o empastamiento J ≥ 1 mm en ≥ 2 derivaciones inferiores o laterales; benigna sin síntomas.'),
        l('V1–V3 的 T 波倒置在 16 岁以下正常；成人只限 V1（± V2）。', 'T inversion in V1–V3 is normal under 16; in adults only V1 (± V2).', 'La T negativa en V1–V3 es normal antes de los 16 años; en adultos, solo en V1 (± V2).'),
        l('侧壁 T 波倒置、ST 压低、病理性 Q 波、QRS ≥ 140 ms、Brugada 1 型永远不是变异。', 'Lateral T inversion, ST depression, pathological Q waves, a QRS ≥ 140 ms and Brugada type 1 are never variants.', 'La T negativa lateral, el descenso del ST, las Q patológicas, un QRS ≥ 140 ms y el Brugada tipo 1 nunca son variantes.'),
      ],
    },
  ],
  sources: [
    'Sharma S, Drezner JA et al. International recommendations for electrocardiographic interpretation in athletes. J Am Coll Cardiol 2017;69:1057-1075',
    'Macfarlane PW et al. The early repolarization pattern: a consensus paper. J Am Coll Cardiol 2015;66:470-477',
    'Antzelevitch C et al. J-wave syndromes expert consensus conference report. Heart Rhythm 2016;13:e295-e324',
    'Zeppenfeld K et al. 2022 ESC Guidelines for ventricular arrhythmias and the prevention of sudden cardiac death. Eur Heart J 2022;43:3997-4126',
    'Surawicz B et al. AHA/ACCF/HRS Part III: Intraventricular conduction disturbances. Circulation 2009;119:e235-e240',
    'Malhotra A et al. Anterior T-wave inversion in young white athletes and nonathletes. J Am Coll Cardiol 2017;69:1-9',
    'Rijnbeek PR et al. New normal limits for the paediatric electrocardiogram. Eur Heart J 2001;22:702-711',
    'Castellano et al. 2004',
  ],
};

export default lesson;
