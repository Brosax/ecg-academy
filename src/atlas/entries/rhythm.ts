/**
 * Atlas entries — category `rhythm`. Schema and authoring rules: src/atlas/schema.ts. Values: docs/curriculum/criteria.md
 * (sections rate-rhythm-intervals-axis, av-blocks-sinus-node, supraventricular-arrhythmias, ventricular-arrhythmias,
 * pacemakers-devices). Modern names only: mechanism-based SVT names, "junctional" (not "nodal"), sinus node dysfunction,
 * NSVT instead of "triplets", PVC burden instead of Lown grades; a wide-QRS tachycardia is VT until proven otherwise.
 */
import { l } from '../../core/l10n';
import { REF } from '../refs';
import type { AtlasEntry } from '../schema';

/** Full references not (yet) in ../refs.ts — short forms go in each criterion's `source`. */
const R = {
  page2015:
    'Page RL et al. 2015 ACC/AHA/HRS Guideline for the Management of Adult Patients With Supraventricular Tachycardia. Circulation 2016;133:e506–e574.',
  escSvt2019:
    'Brugada J et al. 2019 ESC Guidelines for the management of patients with supraventricular tachycardia. Eur Heart J 2020;41:655–720.',
  sheldon2015:
    'Sheldon RS et al. 2015 HRS expert consensus statement on the diagnosis and treatment of postural tachycardia syndrome, inappropriate sinus tachycardia, and vasovagal syncope. Heart Rhythm 2015;12:e41–e63.',
  kistler2006: 'Kistler PM et al. P-wave morphology in focal atrial tachycardia. J Am Coll Cardiol 2006;48:1010–1017.',
  glikson2021:
    'Glikson M et al. 2021 ESC Guidelines on cardiac pacing and cardiac resynchronization therapy. Eur Heart J 2021;42:3427–3520.',
  barold2001: 'Barold SS, Hayes DL. Second-degree atrioventricular block: a reappraisal. Mayo Clin Proc 2001;76:44–57.',
  alKhatib2017:
    'Al-Khatib SM et al. 2017 AHA/ACC/HRS Guideline for Management of Patients With Ventricular Arrhythmias and the Prevention of Sudden Cardiac Death. Circulation 2018;138:e272–e391.',
  pedersen2014: 'Pedersen CT et al. EHRA/HRS/APHRS expert consensus on ventricular arrhythmias. Europace 2014;16:1257–1283.',
  cronin2019:
    'Cronin EM et al. 2019 HRS/EHRA/APHRS/LAHRS expert consensus statement on catheter ablation of ventricular arrhythmias. Heart Rhythm 2020;17:e2–e154.',
  escAf2024: 'Van Gelder IC et al. 2024 ESC Guidelines for the management of atrial fibrillation. Eur Heart J 2024;45:3314–3414.',
  joglar2023:
    'Joglar JA et al. 2023 ACC/AHA/ACCP/HRS Guideline for the Diagnosis and Management of Atrial Fibrillation. Circulation 2024;149:e1–e156.',
  saoudi2001:
    'Saoudi N et al. A classification of atrial flutter and regular atrial tachycardia according to electrophysiological mechanisms and anatomical bases (ESC/NASPE working group). Eur Heart J 2001;22:1162–1182.',
  appelboam2015:
    'Appelboam A et al. Postural modification to the standard Valsalva manoeuvre for emergency treatment of supraventricular tachycardias (REVERT). Lancet 2015;386:1747–1753.',
  steurer1994:
    'Steurer G et al. The differential diagnosis on the electrocardiogram between ventricular tachycardia and preexcited tachycardia. Clin Cardiol 1994;17:306–308.',
  brugada1991:
    'Brugada P et al. A new approach to the differential diagnosis of a regular tachycardia with a wide QRS complex. Circulation 1991;83:1649–1659.',
  vereckei2008:
    'Vereckei A et al. New algorithm using only lead aVR for differential diagnosis of wide QRS complex tachycardia. Heart Rhythm 2008;5:89–98.',
  pava2010:
    'Pava LF et al. R-wave peak time at DII: a new criterion for differentiating between wide complex QRS tachycardias. Heart Rhythm 2010;7:922–926.',
  wellens1978:
    'Wellens HJ, Bär FW, Lie KI. The value of the electrocardiogram in the differential diagnosis of a tachycardia with a widened QRS complex. Am J Med 1978;64:27–33.',
  zipes2006:
    'Zipes DP et al. ACC/AHA/ESC 2006 Guidelines for Management of Patients With Ventricular Arrhythmias and the Prevention of Sudden Cardiac Death. Circulation 2006;114:e385–e484.',
  soar2021: 'Soar J et al. European Resuscitation Council Guidelines 2021: Adult advanced life support. Resuscitation 2021;161:115–151.',
  panchal2020:
    'Panchal AR et al. Part 3: Adult basic and advanced life support — 2020 AHA Guidelines for Cardiopulmonary Resuscitation and Emergency Cardiovascular Care. Circulation 2020;142:S366–S468.',
  bernstein2002:
    'Bernstein AD et al. The revised NASPE/BPEG generic code for antibradycardia, adaptive-rate, and multisite pacing. Pacing Clin Electrophysiol 2002;25:260–264.',
} as const;

export const entries: readonly AtlasEntry[] = [
  // ── sinus node ───────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'sinus-rhythm',
    definition: l(
      '由窦房结主导的心律：窦性P波在Ⅰ、Ⅱ、aVF直立，aVR倒置，形态一致，PP间期规则。',
      'A rhythm driven by the sinus node: a consistent P wave, upright in I, II and aVF and inverted in aVR, at a regular P–P interval.',
      'Ritmo dirigido por el nodo sinusal: onda P constante, positiva en I, II y aVF y negativa en aVR, con un intervalo P-P regular.',
    ),
    features: [
      l(
        '先在Ⅱ和V1找P波：P波在Ⅰ、Ⅱ、aVF直立，aVR倒置；V1常为正负双向。',
        'Find the P wave first, in II and V1: upright in I, II and aVF, inverted in aVR; often biphasic (+/−) in V1.',
        'Busca primero la onda P en II y V1: positiva en I, II y aVF, negativa en aVR; en V1 suele ser bifásica (+/−).',
      ),
      l(
        '各P波形态相同，PP间期规则（可随呼吸轻度变化）。',
        'Every P wave has the same shape and the P–P interval is regular (it may vary slightly with breathing).',
        'Todas las ondas P tienen la misma forma y el intervalo P-P es regular (puede variar algo con la respiración).',
      ),
      l(
        '频率60–100次/分称窦性心律；更慢为窦性心动过缓，更快为窦性心动过速。',
        'At 60–100/min it is sinus rhythm; slower is sinus bradycardia, faster is sinus tachycardia.',
        'A 60-100 lpm es ritmo sinusal; si es más lento, bradicardia sinusal; si es más rápido, taquicardia sinusal.',
      ),
      l(
        '窦性心律只说明心房激动的起源：PR延长或P波未下传时仍是窦性心律，需另行报告房室传导。',
        'Sinus rhythm names only where atrial activation starts: with a long PR or blocked P waves it is still sinus rhythm — report AV conduction separately.',
        'El ritmo sinusal solo indica dónde empieza la activación auricular: con un PR largo o P bloqueadas sigue siendo ritmo sinusal; describe la conducción AV aparte.',
      ),
    ],
    criteria: [
      {
        label: l('窦性P波', 'Sinus P wave', 'Onda P sinusal'),
        value: l(
          'P电轴0°至+75°：Ⅰ、Ⅱ、aVF直立，aVR倒置；Ⅲ、aVL可直立、低平、双向或倒置',
          'P axis 0° to +75°: upright in I, II, aVF, inverted in aVR; in III and aVL it may be upright, flat, biphasic or inverted',
          'Eje de la P de 0° a +75°: positiva en I, II, aVF, negativa en aVR; en III y aVL puede ser positiva, plana, bifásica o negativa',
        ),
        source: 'Mason 2007 (AHA/ACCF/HRS Part II); Chou 2008',
      },
      {
        label: l('频率', 'Rate', 'Frecuencia'),
        value: l(
          '心电图常规60–100次/分；2018年指南以50–100次/分为正常',
          '60–100/min by ECG convention; the 2018 guideline uses 50–100/min as normal',
          '60-100 lpm por convención del ECG; la guía de 2018 considera normal 50-100 lpm',
        ),
        source: 'Kusumoto 2018 (ACC/AHA/HRS bradycardia)',
      },
      {
        label: l('定义要素', 'What defines it', 'Qué lo define'),
        value: l(
          'P波起源（形态和电轴）及规则的PP间期；不要求PR正常',
          'P-wave origin (shape and axis) and a regular P–P interval; a normal PR is not required',
          'El origen de la P (forma y eje) y un P-P regular; no exige un PR normal',
        ),
        source: 'Page 2015 (ACC/AHA/HRS SVT)',
      },
    ],
    mechanism: l(
      '窦房结位于右心房上部，自律性最高，因此主导心律，心房激动由右上向左下扩布。该方向在Ⅰ、Ⅱ、aVF导联上投影为正、在aVR上为负，所以P波极性可以识别起搏点的位置。',
      'The sinus node, high in the right atrium, is the fastest pacemaker and so sets the rhythm, and atrial activation spreads downward and to the left. That direction projects positively on I, II and aVF and negatively on aVR, which is why P-wave polarity identifies the pacemaker.',
      'El nodo sinusal, en la parte alta de la aurícula derecha, es el marcapasos más rápido y por eso dirige el ritmo, y la activación auricular avanza hacia abajo y a la izquierda. Esa dirección se proyecta en positivo sobre I, II y aVF y en negativo sobre aVR, por lo que la polaridad de la P identifica el marcapasos.',
    ),
    mimics: [
      {
        id: 'ectopic-atrial-rhythm',
        discriminator: l(
          '此处P波在Ⅱ、Ⅲ、aVF直立；房性异位心律的P电轴超出窦性范围（如低位心房起源时下壁导联P波倒置）。',
          'Here the P wave is upright in II, III and aVF; in ectopic atrial rhythm the P axis lies outside the sinus range (a low atrial focus gives negative inferior P waves).',
          'Aquí la P es positiva en II, III y aVF; en el ritmo auricular ectópico el eje de la P está fuera del rango sinusal (un foco auricular bajo da P negativas en las inferiores).',
        ),
        leads: ['II', 'III', 'aVF'],
      },
      {
        id: 'electrode-reversal-la-ra',
        discriminator: l(
          '此处Ⅰ导联P波直立、aVR倒置；左右上肢电极反接时两者都翻转（Ⅰ导联P波倒置，aVR直立）。',
          'Here P is upright in I and inverted in aVR; with arm-electrode reversal both flip (P negative in I, upright in aVR).',
          'Aquí la P es positiva en I y negativa en aVR; con la inversión de los electrodos de los brazos ambas se invierten (P negativa en I, positiva en aVR).',
        ),
        leads: ['I', 'aVR'],
      },
      {
        id: 'accelerated-junctional-rhythm',
        discriminator: l(
          '此处每个QRS前有直立的窦性P波且PR固定；交界性心律时P波倒置（Ⅱ、Ⅲ、aVF）、紧贴或位于QRS之后，或与QRS无关。',
          'Here an upright sinus P precedes each QRS at a fixed PR; in a junctional rhythm the P is inverted in II, III and aVF, sits close to or after the QRS, or is unrelated to it.',
          'Aquí una P sinusal positiva precede a cada QRS con un PR fijo; en un ritmo de la unión la P es negativa en II, III y aVF, está pegada al QRS o detrás de él, o no guarda relación con él.',
        ),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l(
        '不看Ⅱ和aVR的P波极性就写“窦性心律”。',
        'Writing “sinus rhythm” without checking P polarity in II and aVR.',
        'Escribir «ritmo sinusal» sin comprobar la polaridad de la P en II y aVR.',
      ),
      l(
        '要求PR正常才算窦性心律：窦性心律伴一度房室传导阻滞仍是窦性心律。',
        'Requiring a normal PR: sinus rhythm with first-degree AV block is still sinus rhythm.',
        'Exigir un PR normal: el ritmo sinusal con bloqueo AV de primer grado sigue siendo ritmo sinusal.',
      ),
      l(
        '把Ⅲ或aVL导联的P波倒置当作异常——取决于P电轴，可以正常。',
        'Calling a negative P in III or aVL abnormal — depending on the P axis it can be normal.',
        'Considerar anormal una P negativa en III o aVL: según el eje de la P puede ser normal.',
      ),
    ],
    lessons: ['s3', 's1'],
    sources: [REF.mason2007, REF.kusumoto2018, R.page2015, REF.chou2008],
    aka: ['NSR', 'normal sinus rhythm', 'ritmo sinusal normal', '正常窦性心律'],
    exemplar: { scenarios: ['normal'], layout: '3x4+1', lead: 'II', leads: ['I', 'II', 'aVR', 'aVF'] },
  },
  {
    id: 'sinus-bradycardia',
    definition: l(
      '频率低于60次/分的窦性心律（心电图常规界值；2018年指南采用<50次/分）。',
      'Sinus rhythm slower than 60/min by ECG convention (the 2018 bradycardia guideline uses < 50/min).',
      'Ritmo sinusal a menos de 60 lpm por convención del ECG (la guía de bradicardia de 2018 usa < 50 lpm).',
    ),
    features: [
      l(
        '每个QRS前有窦性P波（Ⅰ、Ⅱ、aVF直立），频率<60次/分（RR间距超过5个大格）。',
        'A sinus P (upright in I, II, aVF) before every QRS at < 60/min (more than five large squares between R waves).',
        'Una P sinusal (positiva en I, II, aVF) antes de cada QRS a < 60 lpm (más de cinco cuadros grandes entre ondas R).',
      ),
      l('PR和QRS通常正常，PP间期可轻度变化。', 'PR and QRS are usually normal; the P–P may vary slightly.', 'El PR y el QRS suelen ser normales; el P-P puede variar ligeramente.'),
      l(
        '睡眠、运动员和年轻人常见且正常；询问用药（β受体阻滞剂、维拉帕米/地尔硫䓬、地高辛、伊伐布雷定）和症状。',
        'Common and normal in sleep, athletes and the young; ask about drugs (beta-blockers, verapamil/diltiazem, digoxin, ivabradine) and symptoms.',
        'Es frecuente y normal durante el sueño, en deportistas y en jóvenes; pregunta por fármacos (betabloqueantes, verapamilo/diltiazem, digoxina, ivabradina) y por síntomas.',
      ),
      l(
        '在同一份心电图上寻找可逆原因：T波高尖（高钾）、QT延长或Osborn波（低体温）、下壁ST段抬高。',
        'Look for a reversible cause on the same ECG: peaked T waves (hyperkalaemia), long QT or Osborn waves (hypothermia), inferior ST elevation.',
        'Busca una causa reversible en el mismo ECG: ondas T picudas (hiperpotasemia), QT largo u ondas de Osborn (hipotermia), elevación inferior del ST.',
      ),
    ],
    criteria: [
      {
        label: l('窦性心动过缓', 'Sinus bradycardia', 'Bradicardia sinusal'),
        value: l('常规<60次/分；2018年ACC/AHA/HRS定义<50次/分', '< 60/min by convention; < 50/min in the 2018 ACC/AHA/HRS definition', '< 60 lpm por convención; < 50 lpm según la definición ACC/AHA/HRS de 2018'),
        source: 'Kusumoto 2018 (ACC/AHA/HRS bradycardia)',
      },
      {
        label: l('运动员', 'Athletes', 'Deportistas'),
        value: l(
          '≥30次/分为训练相关的正常表现；<30次/分或停搏≥3 s需进一步评估',
          '≥ 30/min is a normal training effect; < 30/min or pauses ≥ 3 s need evaluation',
          '≥ 30 lpm es un efecto normal del entrenamiento; < 30 lpm o pausas ≥ 3 s requieren estudio',
        ),
        source: 'Sharma 2017 (international athlete criteria)',
      },
      {
        label: l('是否处理', 'When it matters', 'Cuándo importa'),
        value: l('取决于症状与心率的相关性，而非单纯数值', 'Symptom–rhythm correlation, not the number alone', 'La correlación entre síntomas y ritmo, no la cifra aislada'),
        source: 'Kusumoto 2018',
      },
    ],
    mechanism: l(
      '迷走张力、药物或窦房结本身病变使窦房结细胞4相自动除极变慢，每次冲动发出得更晚。心房和心室激动仍沿正常途径进行，因此只是正常P-QRS-T周期之间的间距变大。',
      'Vagal tone, drugs or intrinsic disease slow the spontaneous phase-4 depolarization of sinus-node cells, so each impulse leaves the node later. Atrial and ventricular activation still follow the normal path, so only the spacing between otherwise normal P–QRS–T cycles changes.',
      'El tono vagal, los fármacos o la enfermedad intrínseca enlentecen la despolarización espontánea de fase 4 de las células del nodo sinusal, y cada impulso sale más tarde. La activación auricular y ventricular sigue el camino normal, de modo que solo cambia la separación entre ciclos P-QRS-T por lo demás normales.',
    ),
    mimics: [
      {
        id: 'pac-blocked',
        discriminator: l(
          '此处每个P波形态相同且均下传；房早未下传二联律时每个T波内藏有提前的P′，使心室率减半。',
          'Here every P has the same shape and conducts; with blocked atrial bigeminy an early P′ hides in every T wave and halves the ventricular rate.',
          'Aquí todas las P son iguales y se conducen; en el bigeminismo auricular bloqueado una P′ precoz se esconde en cada onda T y reduce a la mitad la frecuencia ventricular.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'av-block-2-2to1',
        discriminator: l(
          '此处心房率等于心室率；2:1房室传导阻滞时两个QRS之间多一个未下传的P波（常藏在T波中）。',
          'Here the atrial rate equals the ventricular rate; in 2:1 AV block an extra non-conducted P sits between QRS complexes, often in the T wave.',
          'Aquí la frecuencia auricular es igual a la ventricular; en el bloqueo AV 2:1 hay una P no conducida entre dos QRS, a menudo dentro de la onda T.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'junctional-escape-rhythm',
        discriminator: l(
          '此处QRS前有窦性P波且PR正常；交界性逸搏心律时P波缺如、逆行或与QRS无关。',
          'Here a sinus P precedes the QRS with a normal PR; in a junctional escape rhythm the P is absent, retrograde or unrelated to the QRS.',
          'Aquí una P sinusal precede al QRS con un PR normal; en el ritmo de escape de la unión la P falta, es retrógrada o no guarda relación con el QRS.',
        ),
        leads: ['II'],
      },
      {
        id: 'sa-exit-block',
        discriminator: l(
          '此处间期逐渐变化；窦房传导阻滞时长间歇恰为两个PP间期。',
          'Here the intervals change gradually; in sinoatrial exit block a pause equals exactly two P–P cycles.',
          'Aquí los intervalos cambian de forma gradual; en el bloqueo sinoauricular una pausa mide exactamente dos ciclos P-P.',
        ),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l(
        '漏看藏在T波内未下传的P波（房早未下传二联律、2:1阻滞），误称窦性心动过缓。',
        'Missing blocked P waves hidden in the T waves (blocked atrial bigeminy, 2:1 block) and calling it sinus bradycardia.',
        'Pasar por alto P bloqueadas escondidas en las ondas T (bigeminismo auricular bloqueado, bloqueo 2:1) y llamarlo bradicardia sinusal.',
      ),
      l(
        '只看数字：无症状运动员心率42次/分无需处理。',
        'Treating a number: an asymptomatic athlete at 42/min needs nothing.',
        'Tratar una cifra: un deportista asintomático a 42 lpm no necesita nada.',
      ),
      l(
        '不寻找可逆原因（药物、高钾、甲减、低体温、下壁心肌梗死）。',
        'Not looking for a reversible cause (drugs, hyperkalaemia, hypothyroidism, hypothermia, inferior MI).',
        'No buscar una causa reversible (fármacos, hiperpotasemia, hipotiroidismo, hipotermia, infarto inferior).',
      ),
    ],
    lessons: ['r1', 's3'],
    sources: [REF.kusumoto2018, REF.sharma2017, REF.mason2007],
    aka: ['sinus brady', 'bradycardia', 'bradicardia', '心动过缓'],
    exemplar: { scenarios: ['sinus-bradycardia'], layout: '3x4+1', lead: 'II', leads: ['II'] },
  },
  {
    id: 'sinus-tachycardia',
    definition: l('频率超过100次/分的窦性心律。', 'Sinus rhythm faster than 100/min.', 'Ritmo sinusal a más de 100 lpm.'),
    features: [
      l(
        '每个QRS前有窦性P波（Ⅰ、Ⅱ、aVF直立），频率>100次/分；成人静息时很少超过约150次/分。',
        'A sinus P (upright in I, II, aVF) before every QRS at > 100/min; at rest an adult rarely exceeds about 150/min.',
        'Una P sinusal (positiva en I, II, aVF) antes de cada QRS a > 100 lpm; en reposo un adulto rara vez supera unos 150 lpm.',
      ),
      l(
        '起止渐进，频率随呼吸、活动和病因处理而变化。',
        'Gradual onset and offset; the rate changes with breathing, effort and treatment of the cause.',
        'Inicio y final graduales; la frecuencia cambia con la respiración, el esfuerzo y el tratamiento de la causa.',
      ),
      l(
        '心率快时P波与前一个T波融合——在Ⅱ和V1导联T波降支上找P波。',
        'At fast rates the P merges with the preceding T — look for it on the T downslope in II and V1.',
        'A frecuencias altas la P se funde con la T previa: búscala en la rama descendente de la T en II y V1.',
      ),
      l(
        '它是一种反应：找出原因（发热、疼痛、低血容量、贫血、低氧、肺栓塞、脓毒症、甲亢、药物）。',
        'It is a response: name the cause (fever, pain, hypovolaemia, anaemia, hypoxia, pulmonary embolism, sepsis, thyrotoxicosis, drugs).',
        'Es una respuesta: identifica la causa (fiebre, dolor, hipovolemia, anemia, hipoxia, tromboembolismo pulmonar, sepsis, tirotoxicosis, fármacos).',
      ),
    ],
    criteria: [
      {
        label: l('窦性心动过速', 'Sinus tachycardia', 'Taquicardia sinusal'),
        value: l('窦性P波，频率>100次/分', 'Sinus P waves at > 100/min', 'Ondas P sinusales a > 100 lpm'),
        source: 'Page 2015 (ACC/AHA/HRS SVT)',
      },
      {
        label: l('不适当窦性心动过速', 'Inappropriate sinus tachycardia', 'Taquicardia sinusal inapropiada'),
        value: l(
          '静息窦性心率>100次/分，24小时平均>90次/分，且无原发原因',
          'Resting sinus rate > 100/min, mean 24-h rate > 90/min, no primary cause',
          'Frecuencia sinusal en reposo > 100 lpm, media de 24 h > 90 lpm y sin causa primaria',
        ),
        source: 'Sheldon 2015 (HRS); Brugada 2019 (ESC SVT)',
      },
      {
        label: l('规则窄QRS约150次/分', 'Regular narrow QRS at about 150/min', 'QRS estrecho regular a unos 150 lpm'),
        value: l('先寻找第二个F波（2:1心房扑动），再接受窦速诊断', 'Search for a second F wave (2:1 flutter) before accepting sinus tachycardia', 'Busca una segunda onda F (flutter 2:1) antes de aceptar taquicardia sinusal'),
        source: 'Brugada 2019 (ESC SVT)',
      },
    ],
    mechanism: l(
      '交感兴奋和迷走张力减弱使窦房结4相除极坡度变陡，更快达到阈电位。由于冲动仍起源于窦房结，P波电轴保持窦性，只是心动周期缩短。',
      'Sympathetic drive and withdrawal of vagal tone steepen phase-4 depolarization in the sinus node, so it reaches threshold sooner. Because the impulse still starts in the sinus node, the P wave keeps its sinus axis and only the cycle length shortens.',
      'La estimulación simpática y la retirada del tono vagal aumentan la pendiente de la fase 4 en el nodo sinusal, que alcanza antes el umbral. Como el impulso sigue naciendo en el nodo sinusal, la onda P conserva su eje sinusal y solo se acorta el ciclo.',
    ),
    mimics: [
      {
        id: 'atrial-flutter',
        discriminator: l(
          '此处每个QRS前一个P波，P波之间有等电位线；2:1心房扑动（约150次/分）时第二个F波藏在QRS或T波内，下壁导联基线呈锯齿状。',
          'Here there is one P per QRS with a flat baseline between; in 2:1 flutter at about 150/min a second F wave hides in the QRS or T and the inferior baseline is saw-toothed.',
          'Aquí hay una P por QRS con línea de base plana entre ellas; en el flutter 2:1 a unos 150 lpm una segunda onda F se esconde en el QRS o la T y la línea de base inferior es en dientes de sierra.',
        ),
        leads: ['II', 'III', 'aVF', 'V1'],
      },
      {
        id: 'atrial-tachycardia',
        discriminator: l(
          '此处P电轴为窦性且起止渐进；局灶性房速的P′电轴异常，突发突止，可出现房室阻滞而心动过速持续。',
          'Here the P axis is sinus and the onset gradual; focal atrial tachycardia has an abnormal P′ axis, starts and stops abruptly, and may continue despite AV block.',
          'Aquí el eje de la P es sinusal y el inicio gradual; la taquicardia auricular focal tiene un eje de P′ anómalo, empieza y termina bruscamente y puede persistir pese a un bloqueo AV.',
        ),
        leads: ['II', 'aVF', 'V1'],
      },
      {
        id: 'avnrt',
        discriminator: l(
          '此处QRS前可见P波；典型房室结折返性心动过速时QRS前无P波，V1可见伪r′，突然发作且频率固定。',
          'Here a P wave is visible before each QRS; typical AVNRT has no P before the QRS, a pseudo-r′ in V1 and an abrupt onset at a fixed rate.',
          'Aquí se ve una P antes de cada QRS; la TRIN típica no tiene P antes del QRS, muestra pseudo-r′ en V1 y empieza bruscamente a frecuencia fija.',
        ),
        leads: ['V1', 'II'],
      },
    ],
    pitfalls: [
      l('只处理心率而不处理病因。', 'Treating the rate instead of the cause.', 'Tratar la frecuencia en lugar de la causa.'),
      l(
        '不寻找扑动波就把固定在150次/分的心动过速称为窦速。',
        'Calling a tachycardia fixed at 150/min “sinus” without hunting for flutter waves.',
        'Llamar «sinusal» a una taquicardia fija a 150 lpm sin buscar ondas de flutter.',
      ),
      l(
        '把落在T波上的P波误认为T波切迹——与心率较慢时的心电图比较。',
        'Taking a P on the T wave for a notched T — compare with an ECG at a slower rate.',
        'Confundir una P sobre la onda T con una T mellada: compara con un ECG a menor frecuencia.',
      ),
    ],
    lessons: ['r1', 't1'],
    sources: [R.page2015, R.escSvt2019, R.sheldon2015],
    aka: ['sinus tach', 'IST', 'taquicardia', '心动过速'],
    exemplar: { scenarios: ['sinus-tachycardia'], layout: '3x4+1', lead: 'II', leads: ['II', 'V1'] },
  },
  {
    id: 'sinus-arrhythmia',
    definition: l(
      '窦性心律的PP间期变化超过约120 ms（或>10%），通常随呼吸变化。',
      'Sinus rhythm whose P–P interval varies by more than about 120 ms (or > 10 %), usually with breathing.',
      'Ritmo sinusal cuyo intervalo P-P varía más de unos 120 ms (o > 10 %), casi siempre con la respiración.',
    ),
    features: [
      l(
        '每个QRS前都是相同的窦性P波，PR恒定——只有PP间期在变。',
        'The same sinus P before every QRS with a constant PR — only the P–P changes.',
        'La misma P sinusal antes de cada QRS con un PR constante: solo cambia el P-P.',
      ),
      l(
        '呼吸性（时相性）：吸气时加快、呼气时减慢，周期渐变；儿童和年轻人很常见。',
        'Respiratory (phasic): faster on inspiration, slower on expiration, in smooth cycles; very common in children and young adults.',
        'Respiratoria (fásica): más rápida en la inspiración y más lenta en la espiración, en ciclos suaves; muy frecuente en niños y adultos jóvenes.',
      ),
      l(
        '非呼吸性窦性心律不齐与呼吸无关，较少见，见于老年人、地高辛或窦房结病变。',
        'Non-respiratory sinus arrhythmia, unrelated to breathing, is less common and is seen in older people, with digoxin or with sinus node disease.',
        'La arritmia sinusal no respiratoria, sin relación con la respiración, es menos frecuente y aparece en ancianos, con digoxina o con disfunción sinusal.',
      ),
    ],
    criteria: [
      {
        label: l('PP间期变化', 'P–P variation', 'Variación del P-P'),
        value: l(
          '>120 ms或>平均PP的10%（旧教材>160 ms；无统一指南数值）',
          '> 120 ms or > 10 % of the mean P–P (older texts > 160 ms; there is no single guideline value)',
          '> 120 ms o > 10 % del P-P medio (textos antiguos > 160 ms; no hay un valor único de guía)',
        ),
        source: 'Mason 2007 (AHA/ACCF/HRS Part II); Kusumoto 2018',
      },
      {
        label: l('运动员', 'Athletes', 'Deportistas'),
        value: l('训练相关的正常表现', 'Normal training-related finding', 'Hallazgo normal relacionado con el entrenamiento'),
        source: 'Sharma 2017 (international athlete criteria)',
      },
    ],
    mechanism: l(
      '吸气时通过压力反射和肺牵张反射短暂减少对窦房结的迷走传出，窦房结加快，呼气时迷走张力恢复。由于每次冲动仍来自窦房结，P波形态和PR间期保持不变，只有心动周期时长时短。',
      'Inspiration briefly reduces vagal outflow to the sinus node through baroreflex and lung-stretch reflexes, so the node speeds up, and expiration restores vagal tone. Because every impulse still comes from the sinus node, P morphology and PR stay constant while the cycle length waxes and wanes.',
      'La inspiración reduce brevemente el tono vagal sobre el nodo sinusal mediante reflejos barorreceptores y de distensión pulmonar, de modo que el nodo se acelera, y la espiración restablece el tono vagal. Como cada impulso sigue saliendo del nodo sinusal, la morfología de la P y el PR se mantienen mientras el ciclo se alarga y se acorta.',
    ),
    mimics: [
      {
        id: 'atrial-fibrillation',
        discriminator: l(
          '此处每个QRS前都有清晰一致的P波，RR渐变；心房颤动没有P波，RR绝对不规则。',
          'Here a clear, identical P precedes every QRS and the R–R changes smoothly; in AF there are no P waves and the R–R is irregularly irregular.',
          'Aquí una P clara e idéntica precede a cada QRS y el R-R cambia de forma suave; en la FA no hay ondas P y el R-R es irregularmente irregular.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'pac',
        discriminator: l(
          '此处P波形态相同，周期平滑变化；房性期前收缩是突然提前的搏动，P′形态不同。',
          'Here the P waves are identical and the cycle changes smoothly; a PAC is a sudden early beat with a differently shaped P′.',
          'Aquí las P son idénticas y el ciclo cambia con suavidad; una extrasístole auricular es un latido adelantado brusco con una P′ de otra forma.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'wandering-atrial-pacemaker',
        discriminator: l(
          '此处只有一种P波形态；游走性心房起搏点有≥3种P波形态和不同的PR间期。',
          'Here there is one P morphology; a wandering atrial pacemaker shows ≥ 3 P shapes with differing PR intervals.',
          'Aquí hay una sola morfología de P; el marcapasos auricular migratorio muestra ≥ 3 formas de P con PR distintos.',
        ),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l(
        '只因节律不齐就怀疑房颤，而不去找P波。',
        'Suspecting AF because the rhythm is irregular without looking for P waves.',
        'Sospechar FA porque el ritmo es irregular sin buscar ondas P.',
      ),
      l(
        '测量RR而不是PP（房室阻滞可使RR不齐而窦性PP规则）。',
        'Measuring R–R instead of P–P (AV block can make the R–R irregular while the sinus P–P is regular).',
        'Medir el R-R en lugar del P-P (un bloqueo AV puede hacer irregular el R-R aunque el P-P sinusal sea regular).',
      ),
      l(
        '把年轻人生理性的呼吸变化报告为异常。',
        'Reporting physiological respiratory variation in a young person as abnormal.',
        'Informar como anormal la variación respiratoria fisiológica de una persona joven.',
      ),
    ],
    lessons: ['s3'],
    sources: [REF.mason2007, REF.kusumoto2018, REF.sharma2017],
    aka: ['respiratory sinus arrhythmia', 'arritmia sinusal respiratoria', '呼吸性窦性心律不齐'],
    exemplar: { scenarios: ['sinus-arrhythmia'], layout: '3x4+1', lead: 'II', leads: ['II'] },
  },
  {
    id: 'sinus-pause',
    definition: l(
      '窦房结突然停止发放冲动：长间歇内无P波，其长度与基础PP间期无倍数关系；>3 s有临床意义。',
      'A sudden gap in sinus activity with no P wave for longer than expected, not a multiple of the basic P–P, significant when > 3 s.',
      'Ausencia brusca de actividad sinusal, sin onda P durante más tiempo del esperado y sin relación de múltiplo con el P-P de base; es significativa si supera 3 s.',
    ),
    features: [
      l(
        '节律条图上出现一段既无P波也无QRS的直线。',
        'A flat stretch on the rhythm strip with neither P wave nor QRS.',
        'Un tramo plano en la tira de ritmo sin onda P ni QRS.',
      ),
      l(
        '长间歇不是前面PP间期的整数倍（若是整数倍则为窦房传导阻滞）。',
        'The pause is not an exact multiple of the preceding P–P (that would be sinoatrial exit block).',
        'La pausa no es un múltiplo exacto del P-P previo (eso sería un bloqueo sinoauricular).',
      ),
      l(
        '长间歇可由窦性搏动结束，也可由交界性或室性逸搏结束（无P波或逆行P′）。',
        'The pause may end with a sinus beat or with a junctional or ventricular escape beat (no P or a retrograde P′).',
        'La pausa puede terminar con un latido sinusal o con un latido de escape de la unión o ventricular (sin P o con P′ retrógrada).',
      ),
      l(
        '检查长间歇前的T波是否藏有提前的P′（房早未下传是意外长间歇最常见的原因）。',
        'Check the T wave before the pause for a hidden early P′ (a blocked PAC is the commonest cause of an unexpected pause).',
        'Revisa la onda T previa a la pausa en busca de una P′ precoz escondida (la extrasístole auricular bloqueada es la causa más frecuente de una pausa inesperada).',
      ),
    ],
    criteria: [
      {
        label: l('有意义的窦性停搏', 'Significant sinus pause', 'Pausa sinusal significativa'),
        value: l('>3 s', '> 3 s', '> 3 s'),
        source: 'Kusumoto 2018 (ACC/AHA/HRS bradycardia)',
      },
      {
        label: l('运动员与睡眠', 'Athletes and sleep', 'Deportistas y sueño'),
        value: l(
          '运动员停搏≥3 s需评估；单纯夜间停搏本身不是起搏指征',
          'Pauses ≥ 3 s in athletes need evaluation; nocturnal pauses alone are not a pacing indication',
          'En deportistas, las pausas ≥ 3 s requieren estudio; las pausas nocturnas por sí solas no indican marcapasos',
        ),
        source: 'Sharma 2017; Kusumoto 2018',
      },
      {
        label: l('起搏（ESC，反复不明原因晕厥）', 'Pacing (ESC, recurrent unexplained syncope)', 'Marcapasos (ESC, síncope recurrente inexplicado)'),
        value: l('有症状停搏>3 s或无症状停搏>6 s', 'Symptomatic pause > 3 s or asymptomatic pause > 6 s', 'Pausa sintomática > 3 s o asintomática > 6 s'),
        source: 'Glikson 2021 (ESC pacing)',
      },
    ],
    mechanism: l(
      '窦房结未能发放冲动（窦性停搏），或冲动发出后未能传出窦房结，心房因而未被激动。在窦房结恢复或下级起搏点逸搏之前，心脏无除极，心电图呈一段直线。',
      'The sinus node fails to fire (sinus arrest), or fires but its impulse fails to leave the node, so the atria are not activated. Until the node recovers or a subsidiary pacemaker escapes, nothing depolarizes and the ECG stays flat.',
      'El nodo sinusal deja de disparar (paro sinusal), o dispara pero el impulso no sale del nodo, de modo que las aurículas no se activan. Hasta que el nodo se recupera o escapa un marcapasos subsidiario no hay despolarización y el ECG queda plano.',
    ),
    mimics: [
      {
        id: 'sa-exit-block',
        discriminator: l(
          '此处长间歇与PP间期无关；窦房传导阻滞时长间歇约等于基础PP的2倍（或3倍）。',
          'Here the pause is unrelated to the P–P; in sinoatrial exit block it is about exactly two (or three) basic P–P intervals.',
          'Aquí la pausa no guarda relación con el P-P; en el bloqueo sinoauricular mide casi exactamente dos (o tres) P-P de base.',
        ),
        leads: ['II'],
      },
      {
        id: 'pac-blocked',
        discriminator: l(
          '此处长间歇前的T波与其他T波相同；房早未下传时该T波因藏有P′而变形。',
          'Here the T before the pause matches the other T waves; with a blocked PAC that T is deformed by a hidden P′.',
          'Aquí la T previa a la pausa es igual a las demás; con una extrasístole auricular bloqueada esa T está deformada por una P′ escondida.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'av-block-2-mobitz2',
        discriminator: l(
          '此处长间歇内没有P波；房室阻滞时长间歇内有P波但其后无QRS。',
          'Here there is no P wave in the pause; in AV block a P wave appears in the pause and is not followed by a QRS.',
          'Aquí no hay onda P en la pausa; en el bloqueo AV aparece una P en la pausa que no va seguida de QRS.',
        ),
        leads: ['II', 'V1'],
      },
    ],
    pitfalls: [
      l('把房早未下传当成窦性停搏（看长间歇前的T波）。', 'Calling a blocked PAC a sinus pause (look at the T wave before the gap).', 'Llamar pausa sinusal a una extrasístole auricular bloqueada (mira la onda T anterior a la pausa).'),
      l(
        '只量QRS到QRS的间期而不检查其间有无P波（房室阻滞）。',
        'Measuring QRS to QRS without checking for P waves inside the pause (AV block).',
        'Medir de QRS a QRS sin comprobar si hay ondas P dentro de la pausa (bloqueo AV).',
      ),
      l(
        '把无症状者睡眠中或运动员的停搏判为疾病。',
        'Diagnosing disease from a pause during sleep or in an asymptomatic athlete.',
        'Diagnosticar enfermedad por una pausa durante el sueño o en un deportista asintomático.',
      ),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '询问有无晕厥或黑矇；若停搏长或有症状，进行心电监护，停用减慢窦性心律的药物并检查血钾。',
        'Ask about syncope or presyncope; if the pause is long or symptomatic, put the patient on a monitor, stop sinus-slowing drugs and check potassium.',
        'Pregunta por síncope o presíncope; si la pausa es larga o sintomática, monitoriza al paciente, suspende los fármacos que frenan el nodo sinusal y determina el potasio.',
      ),
    },
    lessons: ['r1'],
    sources: [REF.kusumoto2018, R.glikson2021, REF.sharma2017, REF.chou2008],
    aka: ['sinus arrest', 'paro sinusal', '窦性静止'],
    exemplar: { scenarios: ['sinus-pause'], layout: '3x4+1', lead: 'II', leads: ['II'] },
  },
  {
    id: 'sa-exit-block',
    definition: l(
      '窦房结冲动已形成但间歇性不能传出：Ⅱ型时长间歇恰为基础PP的整数倍，Ⅰ型时PP逐渐缩短后出现长间歇（成组搏动）。',
      'Sinus impulses that form but intermittently fail to leave the node, seen as pauses that are exact multiples of the P–P (type II) or as group beating with shortening P–P (type I).',
      'Impulsos sinusales que se forman pero a veces no salen del nodo: pausas que son múltiplos exactos del P-P (tipo II) o latidos agrupados con un P-P que se acorta (tipo I).',
    ),
    features: [
      l(
        'Ⅱ型二度窦房阻滞：整个P-QRS-T周期缺失，长间歇≈2×PP（在窦性心律不齐的误差范围内）。',
        'Second-degree type II: a whole P–QRS–T cycle is missing and the pause ≈ 2 × P–P (within sinus-arrhythmia tolerance).',
        'Segundo grado tipo II: falta un ciclo P-QRS-T completo y la pausa ≈ 2 × P-P (dentro del margen de la arritmia sinusal).',
      ),
      l(
        'Ⅰ型（窦房文氏）：PP逐渐缩短，随后出现短于2×PP的长间歇——PR恒定的成组搏动。',
        'Type I (SA Wenckebach): the P–P shortens progressively, then a pause shorter than 2 × P–P — group beating with a constant PR.',
        'Tipo I (Wenckebach sinoauricular): el P-P se acorta progresivamente y luego hay una pausa menor de 2 × P-P; latidos agrupados con PR constante.',
      ),
      l(
        '一度窦房阻滞在体表心电图上看不见；三度窦房阻滞与窦性停搏无法区分。',
        'First-degree SA block is invisible on the surface ECG; third-degree SA block looks the same as sinus arrest.',
        'El bloqueo sinoauricular de primer grado no se ve en el ECG de superficie; el de tercer grado es igual que un paro sinusal.',
      ),
      l(
        '整个过程中PR不变：问题在心房之前，不在房室结。',
        'The PR does not change: the problem lies before the atria, not in the AV node.',
        'El PR no cambia: el problema está antes de las aurículas, no en el nodo AV.',
      ),
    ],
    criteria: [
      {
        label: l('Ⅱ型窦房阻滞', 'Type II SA block', 'Bloqueo sinoauricular tipo II'),
        value: l('长间歇=基础PP的2倍（或3倍）', 'Pause = 2× (or 3×) the basic P–P', 'Pausa = 2 (o 3) veces el P-P de base'),
        source: 'Kusumoto 2018; Chou 2008',
      },
      {
        label: l('Ⅰ型窦房阻滞', 'Type I SA block', 'Bloqueo sinoauricular tipo I'),
        value: l('PP逐渐缩短，随后长间歇<2×PP', 'Progressive P–P shortening, then a pause < 2 × P–P', 'Acortamiento progresivo del P-P y luego una pausa < 2 × P-P'),
        source: 'Chou 2008',
      },
    ],
    mechanism: l(
      '窦房结按自身节律持续发放冲动，但冲动经窦房结周围组织传至心房时有一次或数次失败。由于隐藏的窦房结节律仍在继续，下一个P波准时出现，因此长间歇是基础周期的整数倍。',
      'The node keeps firing at its own rhythm, but conduction through the perinodal tissue to the atrium fails for one or more beats. Because the hidden sinus clock keeps ticking, the next P arrives exactly on time, which is why the pause is a multiple of the basic cycle.',
      'El nodo sigue disparando a su ritmo, pero la conducción a través del tejido perinodal hacia la aurícula falla en uno o más latidos. Como el reloj sinusal oculto sigue marcando el tiempo, la P siguiente llega puntual, y por eso la pausa es un múltiplo del ciclo de base.',
    ),
    mimics: [
      {
        id: 'sinus-pause',
        discriminator: l(
          '此处长间歇恰为PP的整数倍；窦性停搏与PP没有算术关系。',
          'Here the pause is an exact multiple of the P–P; a sinus arrest has no arithmetic relation to it.',
          'Aquí la pausa es un múltiplo exacto del P-P; el paro sinusal no guarda relación aritmética con él.',
        ),
        leads: ['II'],
      },
      {
        id: 'av-block-2-mobitz1',
        discriminator: l(
          '此处缺失的是整个P-QRS，PR不变；房室文氏阻滞时P波照常出现，PR逐渐延长直至一个P波后无QRS。',
          'Here the whole P–QRS is missing and the PR never changes; in AV Wenckebach the P waves keep coming and the PR lengthens until one P is not followed by a QRS.',
          'Aquí falta el P-QRS completo y el PR no cambia; en el Wenckebach AV las P siguen llegando y el PR se alarga hasta que una P no va seguida de QRS.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'sinus-arrhythmia',
        discriminator: l(
          '此处间期突然成倍延长；窦性心律不齐时PP逐渐变化。',
          'Here the interval suddenly doubles; in sinus arrhythmia the P–P changes gradually.',
          'Aquí el intervalo se duplica de golpe; en la arritmia sinusal el P-P cambia de forma gradual.',
        ),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l('不用分规测量就把所有长间歇称为窦房阻滞。', 'Calling every pause “SA block” without walking calipers across it.', 'Llamar «bloqueo sinoauricular» a cualquier pausa sin medirla con el compás.'),
      l(
        '把窦房文氏的成组搏动与房室文氏混淆——窦房阻滞时PR不变。',
        'Confusing SA Wenckebach group beating with AV Wenckebach — in SA block the PR does not change.',
        'Confundir los latidos agrupados del Wenckebach sinoauricular con el Wenckebach AV: en el bloqueo sinoauricular el PR no cambia.',
      ),
    ],
    lessons: ['r1', 'r8'],
    sources: [REF.kusumoto2018, REF.chou2008],
    aka: ['SA block', 'sinoatrial block', 'bloqueo sinoauricular', '窦房阻滞'],
    exemplar: { scenarios: ['sa-exit-block'], layout: '3x4+1', lead: 'II', leads: ['II'] },
  },
  {
    id: 'sinus-node-dysfunction',
    definition: l(
      '窦房结不能维持适当的心率：不适当的窦性心动过缓、停搏或窦房阻滞、变时功能不全，或心动过缓与房性快速心律失常交替（慢快综合征）。',
      'A sinus node that cannot keep an appropriate rate — inappropriate sinus bradycardia, pauses or SA block, chronotropic incompetence, or bradycardia alternating with atrial tachyarrhythmias (tachy–brady syndrome).',
      'Nodo sinusal incapaz de mantener una frecuencia adecuada: bradicardia sinusal inapropiada, pausas o bloqueo sinoauricular, incompetencia cronotrópica o bradicardia que alterna con taquiarritmias auriculares (síndrome bradicardia-taquicardia).',
    ),
    features: [
      l(
        '寻找慢快模式：一阵房颤、房扑或房速终止后出现长间歇，然后才恢复窦性心律或逸搏。',
        'Look for the tachy–brady pattern: a run of AF, flutter or atrial tachycardia that ends in a long pause before sinus rhythm or an escape returns.',
        'Busca el patrón bradicardia-taquicardia: una racha de FA, flutter o taquicardia auricular que termina en una pausa larga antes de que vuelva el ritmo sinusal o un escape.',
      ),
      l(
        '持续窦性心动过缓、窦性停搏或窦房阻滞，且不能用药物或睡眠解释。',
        'Persistent sinus bradycardia, sinus pauses or SA exit block not explained by drugs or sleep.',
        'Bradicardia sinusal persistente, pausas sinusales o bloqueo sinoauricular no explicados por fármacos ni por el sueño.',
      ),
      l(
        '因窦房结迟迟不发放冲动，缓慢的交界性或房性异位逸搏心律接管心律。',
        'Slow junctional or ectopic atrial escape rhythms take over because the sinus node is late.',
        'Ritmos de escape lentos, de la unión o auriculares ectópicos, toman el mando porque el nodo sinusal se retrasa.',
      ),
      l(
        '诊断需要症状与心律相关（Holter、贴片、植入式记录器）并排除可逆原因；运动时达不到80%心率储备为变时功能不全。',
        'The diagnosis needs symptom–rhythm correlation (Holter, patch, loop recorder) and exclusion of reversible causes; failing to reach 80 % of heart-rate reserve on exercise is chronotropic incompetence.',
        'El diagnóstico exige correlación entre síntomas y ritmo (Holter, parche, registrador implantable) y descartar causas reversibles; no alcanzar el 80 % de la reserva de frecuencia en el esfuerzo es incompetencia cronotrópica.',
      ),
    ],
    criteria: [
      {
        label: l('转复后停搏', 'Post-conversion pause', 'Pausa posconversión'),
        value: l('快速心律终止后的停搏为典型表现；>3 s有意义', 'A pause after the tachycardia stops is typical; > 3 s is significant', 'Una pausa al terminar la taquicardia es típica; > 3 s es significativa'),
        source: 'Kusumoto 2018 (ACC/AHA/HRS bradycardia)',
      },
      {
        label: l('起搏', 'Pacing', 'Marcapasos'),
        value: l(
          '症状与心动过缓相关时（包括慢快综合征）为Ⅰ类；无症状者不起搏',
          'Class I when symptoms correlate with bradycardia (including tachy–brady); not for asymptomatic dysfunction',
          'Clase I cuando los síntomas se correlacionan con la bradicardia (incluido el síndrome bradicardia-taquicardia); no en la disfunción asintomática',
        ),
        source: 'Kusumoto 2018; Glikson 2021 (ESC pacing)',
      },
      {
        label: l('变时功能不全', 'Chronotropic incompetence', 'Incompetencia cronotrópica'),
        value: l('<预期心率储备的80%（预测最大心率=220−年龄）', '< 80 % of the expected heart-rate reserve (predicted maximum = 220 − age)', '< 80 % de la reserva de frecuencia esperada (máxima prevista = 220 − edad)'),
        source: 'Kusumoto 2018',
      },
    ],
    mechanism: l(
      '与年龄相关的窦房结及周围心房纤维化使冲动形成和传出减慢，同一病变心房又易维持折返性房性快速心律失常。快速心律失常终止时，本已受抑的窦房结又经过超速抑制，因此恢复之前出现长间歇。',
      'Age-related fibrosis of the sinus node and the surrounding atrium slows impulse formation and exit, and the same diseased atrium readily sustains re-entrant atrial tachyarrhythmias. When a tachyarrhythmia stops, the already depressed node has been further suppressed by overdrive, so a long pause appears before it recovers.',
      'La fibrosis del nodo sinusal y de la aurícula vecina, ligada a la edad, enlentece la formación y la salida del impulso, y esa misma aurícula enferma sostiene con facilidad taquiarritmias auriculares por reentrada. Cuando la taquiarritmia se detiene, el nodo ya deprimido está además suprimido por sobreestimulación, y aparece una pausa larga antes de que se recupere.',
    ),
    mimics: [
      {
        id: 'atrial-fibrillation',
        discriminator: l(
          '此处房颤发作与心动过缓、长间歇交替；窦房结功能正常的单纯房颤终止后迅速恢复窦性心律。',
          'Here AF episodes alternate with bradycardia and long pauses; isolated AF with a healthy sinus node returns promptly to sinus rhythm when it stops.',
          'Aquí los episodios de FA alternan con bradicardia y pausas largas; la FA aislada con un nodo sinusal sano vuelve enseguida a ritmo sinusal al terminar.',
        ),
        leads: ['II'],
      },
      {
        id: 'sinus-bradycardia',
        discriminator: l(
          '此处心动过缓不适当，伴停搏或变时功能不全和症状；生理性窦性心动过缓在运动时正常加快。',
          'Here the bradycardia is inappropriate, with pauses or chronotropic incompetence and symptoms; physiological sinus bradycardia rises normally with exercise.',
          'Aquí la bradicardia es inapropiada, con pausas o incompetencia cronotrópica y síntomas; la bradicardia sinusal fisiológica aumenta con normalidad en el esfuerzo.',
        ),
        leads: ['II'],
      },
      {
        id: 'av-block-high-grade',
        discriminator: l(
          '此处长间歇内没有P波；房室阻滞时P波继续出现但未下传。',
          'Here the pauses contain no P waves; in AV block the P waves continue and are not conducted.',
          'Aquí las pausas no contienen ondas P; en el bloqueo AV las P continúan y no se conducen.',
        ),
        leads: ['II', 'V1'],
      },
    ],
    pitfalls: [
      l(
        '为控制快速相使用减慢心率的药物，却没注意到它们会延长停搏。',
        'Starting rate-control drugs for the fast phase without noticing the pauses they will lengthen.',
        'Iniciar fármacos para controlar la frecuencia de la fase rápida sin advertir que alargarán las pausas.',
      ),
      l('为无症状的心率慢或夜间停搏植入起搏器。', 'Pacing for an asymptomatic slow rate or nocturnal pauses.', 'Implantar un marcapasos por una frecuencia lenta asintomática o por pausas nocturnas.'),
      l(
        '未先排除药物、甲减、睡眠呼吸暂停和高钾血症。',
        'Not excluding drugs, hypothyroidism, sleep apnoea and hyperkalaemia first.',
        'No descartar antes fármacos, hipotiroidismo, apnea del sueño e hiperpotasemia.',
      ),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '停搏引起晕厥或黑矇时进行心电监护，停用减慢窦性心律的药物并评估起搏；快速相所需的控制心率药物可能需要临时起搏保护。',
        'If pauses cause syncope or presyncope, monitor the patient, stop sinus-slowing drugs and arrange a pacing assessment; rate-control drugs for the fast phase may need pacing cover.',
        'Si las pausas causan síncope o presíncope, monitoriza al paciente, suspende los fármacos que frenan el nodo sinusal y solicita valoración para marcapasos; los fármacos para controlar la fase rápida pueden requerir la protección de un marcapasos.',
      ),
    },
    lessons: ['r1', 't2'],
    sources: [REF.kusumoto2018, R.glikson2021],
    aka: ['sick sinus syndrome', 'SSS', 'tachy-brady', 'síndrome del seno enfermo', 'bradicardia-taquicardia', '病态窦房结综合征', '慢快综合征'],
    exemplar: { scenarios: ['sinus-node-dysfunction'], layout: '3x4+1', lead: 'II', leads: ['II'] },
  },
  // ── atrial rhythms and premature beats ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'ectopic-atrial-rhythm',
    definition: l(
      '起源于窦房结以外心房部位、频率<100次/分的规则心房节律，P电轴超出窦性范围。',
      'A regular atrial rhythm below 100/min from a focus outside the sinus node, recognised by a P axis outside the sinus range.',
      'Ritmo auricular regular a menos de 100 lpm desde un foco fuera del nodo sinusal, reconocible por un eje de la P fuera del rango sinusal.',
    ),
    features: [
      l(
        'P波形态一致但不是窦性：如Ⅱ、Ⅲ、aVF倒置（低位心房起源），或Ⅰ、aVL倒置（左心房起源）。',
        'One consistent P morphology that is not sinus: negative in II, III and aVF (low atrial focus) or negative in I and aVL (left atrial focus).',
        'Una morfología de P constante pero no sinusal: negativa en II, III y aVF (foco auricular bajo) o negativa en I y aVL (foco auricular izquierdo).',
      ),
      l('频率<100次/分（≥100次/分为局灶性房性心动过速）。', 'Rate < 100/min (≥ 100/min is focal atrial tachycardia).', 'Frecuencia < 100 lpm (≥ 100 lpm es taquicardia auricular focal).'),
      l(
        'PR≥120 ms；下壁导联P波倒置而PR<120 ms提示交界区起源。',
        'PR ≥ 120 ms; a negative inferior P with PR < 120 ms suggests a junctional origin instead.',
        'PR ≥ 120 ms; una P inferior negativa con PR < 120 ms sugiere un origen en la unión.',
      ),
      l(
        '常为窦性减慢时的逸搏心律（睡眠、运动员），通常为良性。',
        'Often an escape rhythm when the sinus node slows (sleep, athletes); usually benign.',
        'Suele ser un ritmo de escape cuando el nodo sinusal se enlentece (sueño, deportistas); casi siempre benigno.',
      ),
    ],
    criteria: [
      {
        label: l('房性异位心律', 'Ectopic atrial rhythm', 'Ritmo auricular ectópico'),
        value: l('P电轴不在0°至+75°，频率<100次/分，PR≥120 ms', 'P axis outside 0° to +75°, rate < 100/min, PR ≥ 120 ms', 'Eje de la P fuera de 0° a +75°, frecuencia < 100 lpm, PR ≥ 120 ms'),
        source: 'Mason 2007 (AHA/ACCF/HRS Part II); Page 2015',
      },
      {
        label: l('低位心房起源', 'Low atrial focus', 'Foco auricular bajo'),
        value: l('P波在Ⅱ、Ⅲ、aVF倒置，aVR直立', 'P negative in II, III, aVF and positive in aVR', 'P negativa en II, III, aVF y positiva en aVR'),
        source: 'Brugada 2019 (ESC SVT)',
      },
      {
        label: l('P′定位', 'P′ localisation', 'Localización por la P′'),
        value: l(
          'Ⅰ/aVL负向或等电位→左心房；V1负向→右心房外侧；下壁负向→低位起源',
          'Negative or isoelectric in I/aVL → left atrium; negative in V1 → lateral right atrium; negative inferiorly → low origin',
          'Negativa o isoeléctrica en I/aVL → aurícula izquierda; negativa en V1 → aurícula derecha lateral; negativa en inferiores → origen bajo',
        ),
        source: 'Kistler 2006; Brugada 2019',
      },
    ],
    mechanism: l(
      '窦房结以外的一组心房细胞除极快于窦房结，从而接管心律。心房激动由该部位开始，因此P波向量背离起源点，肢体导联的P波极性随之改变。',
      'A group of atrial cells outside the sinus node depolarizes faster than the node and takes over the rhythm. Atrial activation then starts from that site, so the P vector, and with it the P polarity in the limb leads, points away from the focus.',
      'Un grupo de células auriculares fuera del nodo sinusal se despolariza más rápido que el nodo y toma el mando del ritmo. La activación auricular empieza entonces en ese punto, de modo que el vector de la P, y con él su polaridad en las derivaciones de los miembros, se aleja del foco.',
    ),
    mimics: [
      {
        id: 'junctional-escape-rhythm',
        discriminator: l(
          '此处PR≥120 ms；交界性心律的逆行P′波PR<120 ms或位于QRS之后。',
          'Here the PR is ≥ 120 ms; a junctional retrograde P′ has a PR < 120 ms or follows the QRS.',
          'Aquí el PR es ≥ 120 ms; la P′ retrógrada de la unión tiene un PR < 120 ms o aparece tras el QRS.',
        ),
        leads: ['II', 'III', 'aVF'],
      },
      {
        id: 'electrode-reversal-la-ra',
        discriminator: l(
          '此处Ⅰ导联只有P波倒置，QRS正常；左右上肢反接时Ⅰ导联P、QRS、T全部倒置，aVR变为直立。',
          'Here only the P wave is negative in I and the QRS is normal; with arm reversal P, QRS and T are all inverted in I and aVR turns upright.',
          'Aquí solo la P es negativa en I y el QRS es normal; con la inversión de los brazos P, QRS y T son negativos en I y aVR se vuelve positiva.',
        ),
        leads: ['I', 'aVR'],
      },
      {
        id: 'atrial-tachycardia',
        discriminator: l('此处频率<100次/分；局灶性房速≥100次/分。', 'Here the rate is < 100/min; focal atrial tachycardia runs at ≥ 100/min.', 'Aquí la frecuencia es < 100 lpm; la taquicardia auricular focal va a ≥ 100 lpm.'),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l(
        '把Ⅲ或aVL导联P波倒置都当作异位心律：窦性P波在这些导联也可倒置，要看Ⅱ和aVF。',
        'Calling any negative P in III or aVL ectopic: the sinus P can be negative there — check II and aVF.',
        'Considerar ectópica cualquier P negativa en III o aVL: la P sinusal puede serlo ahí; mira II y aVF.',
      ),
      l('忽略肢体电极反接导致的“Ⅰ导联P波倒置”。', 'Missing limb-electrode reversal as the cause of a “negative P in I”.', 'Pasar por alto la inversión de electrodos de los miembros como causa de una «P negativa en I».'),
    ],
    lessons: ['s3', 'r2'],
    sources: [REF.mason2007, R.page2015, R.escSvt2019, R.kistler2006],
    aka: ['low atrial rhythm', 'coronary sinus rhythm', 'ritmo auricular bajo', 'ritmo del seno coronario', '低位房性心律'],
    exemplar: { scenarios: ['ectopic-atrial-rhythm'], layout: '3x4+1', lead: 'II', leads: ['II', 'III', 'aVF', 'I'] },
  },
  {
    id: 'wandering-atrial-pacemaker',
    definition: l(
      '频率<100次/分的心房节律，起搏点在≥3个部位之间游走，产生≥3种P波形态和不同的PR间期。',
      'An atrial rhythm below 100/min whose pacemaker shifts among three or more sites, giving ≥ 3 P-wave shapes and varying PR intervals.',
      'Ritmo auricular a menos de 100 lpm cuyo marcapasos se desplaza entre tres o más focos, con ≥ 3 morfologías de P y PR variables.',
    ),
    features: [
      l(
        '同一导联（以Ⅱ最佳）至少三种不同的P波形态，逐搏渐变。',
        'At least three different P shapes in the same lead (best II), changing gradually from beat to beat.',
        'Al menos tres formas distintas de P en la misma derivación (mejor II), que cambian de forma gradual latido a latido.',
      ),
      l('PR和PP随P波形态变化；频率<100次/分。', 'PR and P–P vary with the P shape; rate < 100/min.', 'El PR y el P-P varían con la forma de la P; frecuencia < 100 lpm.'),
      l(
        '每个P波后都有QRS，节律轻度不齐；通常为良性（迷走张力高、睡眠、运动员、年轻人）。',
        'Every P is followed by a QRS and the rhythm is slightly irregular; usually benign (high vagal tone, sleep, athletes, the young).',
        'Cada P va seguida de un QRS y el ritmo es algo irregular; casi siempre benigno (tono vagal alto, sueño, deportistas, jóvenes).',
      ),
    ],
    criteria: [
      {
        label: l('游走性心房起搏点', 'Wandering atrial pacemaker', 'Marcapasos auricular migratorio'),
        value: l('≥3种P波形态，频率<100次/分', '≥ 3 P morphologies at < 100/min', '≥ 3 morfologías de P a < 100 lpm'),
        source: 'Page 2015 (ACC/AHA/HRS SVT); Mason 2007',
      },
      {
        label: l('与多源性房速的界限', 'Boundary with MAT', 'Límite con la TAM'),
        value: l('同样表现但频率>100次/分即为多源性房性心动过速', 'The same picture above 100/min is multifocal atrial tachycardia', 'El mismo cuadro por encima de 100 lpm es taquicardia auricular multifocal'),
        source: 'Brugada 2019 (ESC SVT)',
      },
    ],
    mechanism: l(
      '迷走张力增高使窦性频率下降时，心房其他部位和交界区的潜在起搏点以相近频率发放冲动，轮流主导心律。每个起搏点从不同起点激动心房，因此P波向量、P波形态和PR间期逐搏变化。',
      'When vagal tone lowers the sinus rate, latent pacemakers elsewhere in the atria and in the junction fire at similar rates and take turns leading. Each site activates the atria from a different starting point, so the P vector, and with it the P shape and PR, changes from beat to beat.',
      'Cuando el tono vagal baja la frecuencia sinusal, marcapasos latentes de otras zonas de las aurículas y de la unión disparan a frecuencias parecidas y se turnan en el mando. Cada foco activa las aurículas desde un punto distinto, así que el vector de la P, y con él su forma y el PR, cambia de un latido a otro.',
    ),
    mimics: [
      {
        id: 'mat',
        discriminator: l(
          '此处频率<100次/分；多源性房速>100次/分，多见于急性病患者（慢阻肺加重）。',
          'Here the rate is < 100/min; MAT runs > 100/min, typically in an acutely ill patient (COPD exacerbation).',
          'Aquí la frecuencia es < 100 lpm; la TAM supera 100 lpm, típicamente en un paciente agudo (EPOC reagudizada).',
        ),
        leads: ['II'],
      },
      {
        id: 'atrial-fibrillation',
        discriminator: l(
          '此处每个QRS前有独立的P波，P波之间有等电位线；心房颤动没有P波。',
          'Here a discrete P precedes every QRS with a flat baseline between; AF has no P waves.',
          'Aquí una P bien definida precede a cada QRS con línea de base plana entre ellas; la FA no tiene ondas P.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'pac',
        discriminator: l(
          '此处P波形态渐变而不提前；房性期前收缩是突然提前出现的P′。',
          'Here the P shape changes gradually without prematurity; PACs are sudden early P′ waves.',
          'Aquí la forma de la P cambia de manera gradual sin adelantarse; las extrasístoles auriculares son P′ bruscas y precoces.',
        ),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l('因节律不齐而称为房颤——先找每个QRS前的P波。', 'Calling it AF because the rhythm is irregular — look for a P before every QRS.', 'Llamarlo FA porque el ritmo es irregular: busca una P antes de cada QRS.'),
      l('只数出两种P波形态就下诊断：需要三种或以上。', 'Diagnosing it from only two P shapes: three or more are needed.', 'Diagnosticarlo con solo dos formas de P: se necesitan tres o más.'),
    ],
    lessons: ['s3', 't2'],
    sources: [R.page2015, REF.mason2007, R.escSvt2019],
    aka: ['WAP', 'marcapasos migratorio', '游走心律'],
    exemplar: { scenarios: ['wandering-atrial-pacemaker'], layout: '3x4+1', lead: 'II', leads: ['II'] },
  },
  {
    id: 'pac',
    definition: l(
      '由心房异位灶引起的提前搏动：提前出现的P′形态不同于窦性P波，其后通常为正常QRS。',
      'An early beat started by an atrial focus: a premature P′ shaped differently from the sinus P, usually followed by a normal QRS.',
      'Latido adelantado originado en un foco auricular: una P′ prematura de forma distinta a la sinusal, seguida casi siempre de un QRS normal.',
    ),
    features: [
      l(
        '提前出现的P′与窦性P波不同（常藏在前一个T波内使其变形——比较各个T波）。',
        'A premature P′ that differs from the sinus P (often hidden in, and deforming, the preceding T — compare the T waves).',
        'Una P′ prematura distinta de la sinusal (a menudo escondida en la T previa, a la que deforma: compara las ondas T).',
      ),
      l('P′R正常或延长；QRS通常与窦性QRS相同。', 'P′R normal or prolonged; the QRS is usually identical to the sinus QRS.', 'P′R normal o prolongado; el QRS suele ser idéntico al sinusal.'),
      l(
        '很早的房早可伴差异性传导（多为右束支阻滞型）或完全不下传（房早未下传）。',
        'A very early PAC may conduct with aberrancy (usually RBBB-shaped) or not conduct at all (blocked PAC).',
        'Una extrasístole muy precoz puede conducirse con aberrancia (casi siempre con forma de BRD) o no conducirse (extrasístole bloqueada).',
      ),
      l('代偿间歇通常不完全：窦房结被重整。', 'The pause is usually less than compensatory: the sinus node is reset.', 'La pausa suele ser no compensadora: el nodo sinusal se reinicia.'),
    ],
    criteria: [
      {
        label: l('房性期前收缩', 'Premature atrial complex', 'Extrasístole auricular'),
        value: l(
          '提前出现、形态不同的P′；P′R≥120 ms；QRS同窦性（或差异性传导）',
          'Premature P′ of different shape; P′R ≥ 120 ms; QRS as in sinus beats (or aberrant)',
          'P′ prematura de forma distinta; P′R ≥ 120 ms; QRS como el sinusal (o aberrante)',
        ),
        source: 'Mason 2007 (AHA/ACCF/HRS Part II); Brugada 2019 (ESC SVT)',
      },
      {
        label: l('间歇', 'Pause', 'Pausa'),
        value: l('前后间期之和<2×窦性PP（不完全代偿）', 'Pre- plus post-ectopic interval < 2 × sinus P–P (non-compensatory)', 'Intervalo pre- más posectópico < 2 × P-P sinusal (no compensadora)'),
        source: 'Chou 2008',
      },
    ],
    mechanism: l(
      '心房异位灶在下一个窦性冲动到来前发放冲动，从异常部位激动心房，因而P波形态改变。该冲动随后正常经房室结和希氏-浦肯野系统下传，并侵入窦房结使其从此刻重新开始计时。',
      'An atrial focus fires before the next sinus impulse is due and activates the atria from an abnormal site, which changes the P shape. The impulse then crosses the AV node and His–Purkinje system normally and also discharges the sinus node, which restarts its cycle from that moment.',
      'Un foco auricular dispara antes de que llegue el siguiente impulso sinusal y activa las aurículas desde un lugar anómalo, lo que cambia la forma de la P. El impulso cruza después el nodo AV y el sistema de His-Purkinje con normalidad y además descarga el nodo sinusal, que reinicia su ciclo desde ese momento.',
    ),
    mimics: [
      {
        id: 'pvc',
        discriminator: l(
          '此处提前的P′后跟与窦性相同的QRS；室性期前收缩是提前的宽QRS，其前没有提前的P波。',
          'Here an early P′ precedes a QRS like the sinus QRS; a PVC is an early wide QRS with no premature P before it.',
          'Aquí una P′ precoz precede a un QRS igual al sinusal; una extrasístole ventricular es un QRS ancho y precoz sin P prematura delante.',
        ),
        leads: ['V1', 'II'],
      },
      {
        id: 'pjc',
        discriminator: l(
          '此处P′R≥120 ms，P′在QRS之前；交界性期前收缩的逆行P′其PR<120 ms或位于QRS之后。',
          'Here the P′R is ≥ 120 ms with the P′ before the QRS; a PJC has a retrograde P′ with PR < 120 ms or one after the QRS.',
          'Aquí el P′R es ≥ 120 ms con la P′ antes del QRS; en la extrasístole de la unión la P′ retrógrada tiene PR < 120 ms o va tras el QRS.',
        ),
        leads: ['II', 'III', 'aVF'],
      },
      {
        id: 'sinus-arrhythmia',
        discriminator: l(
          '此处是突然提前且P′形态不同；窦性心律不齐的P波相同，周期渐变。',
          'Here the beat is suddenly early with a different P′; in sinus arrhythmia the P waves are identical and the cycle changes gradually.',
          'Aquí el latido se adelanta de golpe con una P′ distinta; en la arritmia sinusal las P son iguales y el ciclo cambia poco a poco.',
        ),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l('漏看藏在前一个T波内的P′——将该T波与其他T波比较。', 'Missing the P′ buried in the preceding T wave — compare that T with the others.', 'Pasar por alto la P′ escondida en la T previa: compara esa T con las demás.'),
      l('把伴差异性传导的房早称为室早。', 'Calling an aberrantly conducted PAC a PVC.', 'Llamar extrasístole ventricular a una extrasístole auricular conducida con aberrancia.'),
    ],
    lessons: ['r5'],
    sources: [REF.mason2007, R.escSvt2019, REF.chou2008],
    aka: ['PAC', 'APC', 'APB', 'atrial premature beat', 'extrasístole supraventricular', '房早'],
    exemplar: { scenarios: ['pac'], layout: '3x4+1', lead: 'II', leads: ['II', 'V1'] },
  },
  {
    id: 'pac-blocked',
    definition: l(
      '过早出现的P′在房室结仍处于不应期时到达，其后没有QRS，形成长间歇。',
      'A premature P′ so early that it meets a still-refractory AV node, so no QRS follows and a pause results.',
      'Una P′ tan prematura que encuentra el nodo AV aún refractario, de modo que no la sigue ningún QRS y se produce una pausa.',
    ),
    features: [
      l(
        '意外的长间歇；其前的T波比其他T波更高、有切迹或更尖（藏有P′）。',
        'An unexpected pause; the T wave before it is taller, notched or more peaked than the other T waves (hidden P′).',
        'Una pausa inesperada; la onda T previa es más alta, mellada o picuda que las demás (P′ escondida).',
      ),
      l('P′提前出现（P-P′短于窦性PP）且形态不同。', 'The P′ is early (P–P′ shorter than the sinus P–P) and differently shaped.', 'La P′ es precoz (P-P′ más corto que el P-P sinusal) y de forma distinta.'),
      l(
        '二联律时（每隔一个搏动出现一个未下传房早）酷似窦性心动过缓或2:1房室阻滞。',
        'In bigeminy (every other beat a blocked PAC) it mimics sinus bradycardia or 2:1 AV block.',
        'En bigeminismo (una extrasístole bloqueada cada dos latidos) imita una bradicardia sinusal o un bloqueo AV 2:1.',
      ),
      l('是节律条图上不明原因长间歇最常见的原因。', 'It is the commonest cause of an unexplained pause on a rhythm strip.', 'Es la causa más frecuente de una pausa inexplicada en una tira de ritmo.'),
    ],
    criteria: [
      {
        label: l('房早未下传', 'Blocked PAC', 'Extrasístole auricular bloqueada'),
        value: l('提前的P′后无QRS，P′落在T波内或其附近', 'Premature P′ without a QRS, falling in or near the T wave', 'P′ prematura sin QRS, situada en la onda T o cerca de ella'),
        source: 'Mason 2007; Brugada 2019 (ESC SVT)',
      },
      {
        label: l('诊断二度房室阻滞之前', 'Before diagnosing second-degree AV block', 'Antes de diagnosticar un bloqueo AV de segundo grado'),
        value: l('确认P波频率恒定；排除未下传的房早', 'Confirm a constant P rate; exclude non-conducted PACs', 'Confirma una frecuencia de P constante; descarta extrasístoles auriculares no conducidas'),
        source: 'Kusumoto 2018; Barold 2001',
      },
    ],
    mechanism: l(
      '期前出现的P′波到达时房室结和希氏-浦肯野系统仍处于前一次激动后的不应期，冲动因而受阻。它仍使窦房结重整，下一个窦性P波在P′之后一个完整周期才出现，于是形成长间歇。',
      'The premature P′ arrives while the AV node and His–Purkinje system are still refractory from the previous beat, so the impulse stops there. It still resets the sinus node, so the next sinus P comes a full cycle after the P′ and a pause appears.',
      'La P′ prematura llega cuando el nodo AV y el sistema de His-Purkinje siguen refractarios por el latido anterior, y el impulso se detiene ahí. Aun así reinicia el nodo sinusal, de modo que la siguiente P sinusal aparece un ciclo completo después de la P′ y se produce una pausa.',
    ),
    mimics: [
      {
        id: 'av-block-2-mobitz2',
        discriminator: l(
          '此处未下传的P′提前出现（P-P′较短）；莫氏Ⅱ型时被阻滞的P波按时出现，PP恒定。',
          'Here the non-conducted P′ is early (short P–P′); in Mobitz II the blocked P comes on time at a constant P–P.',
          'Aquí la P′ no conducida es precoz (P-P′ corto); en el Mobitz II la P bloqueada llega a su hora con un P-P constante.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'sinus-pause',
        discriminator: l(
          '此处长间歇前的T波因P′而变形；窦性停搏前的T波正常，间歇内无P波。',
          'Here the T before the pause is deformed by a P′; before a sinus pause the T is normal and there is no P in the gap.',
          'Aquí la T previa a la pausa está deformada por una P′; antes de una pausa sinusal la T es normal y no hay P en el hueco.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'av-block-2-2to1',
        discriminator: l(
          '此处P′提前且形态不同；2:1阻滞时P波形态相同、节律恒定。',
          'Here the P′ is early and differently shaped; in 2:1 block identical P waves march at a constant rate.',
          'Aquí la P′ es precoz y de otra forma; en el bloqueo 2:1 ondas P idénticas avanzan a ritmo constante.',
        ),
        leads: ['II', 'V1'],
      },
    ],
    pitfalls: [
      l(
        '未核实被阻滞的P波是否按时出现，仅凭一次漏搏就诊断莫氏Ⅱ型。',
        'Diagnosing Mobitz II from one dropped beat without checking that the blocked P came on time.',
        'Diagnosticar un Mobitz II por un solo latido bloqueado sin comprobar que la P bloqueada llegó a su hora.',
      ),
      l('为未下传房早二联律造成的“心动过缓”进行治疗。', 'Treating a “bradycardia” that is really blocked atrial bigeminy.', 'Tratar una «bradicardia» que en realidad es un bigeminismo auricular bloqueado.'),
    ],
    lessons: ['r5', 'r3'],
    sources: [REF.mason2007, R.escSvt2019, REF.kusumoto2018, R.barold2001],
    aka: ['non-conducted PAC', 'nonconducted APC', 'extrasístole auricular no conducida', '房早未下传'],
    exemplar: { scenarios: ['pac-blocked'], layout: '3x4+1', lead: 'II', leads: ['II', 'V1'] },
  },
  {
    id: 'pjc',
    definition: l(
      '起源于房室交界区的提前搏动，QRS通常狭窄，其前无窦性P波；逆行P′可在QRS前（PR<120 ms）、QRS内或QRS后。',
      'An early, usually narrow QRS from the AV junction without a preceding sinus P, with a retrograde P′ just before (PR < 120 ms), inside or just after the QRS.',
      'Latido precoz de la unión AV, con QRS casi siempre estrecho y sin P sinusal previa, con una P′ retrógrada justo antes (PR < 120 ms), dentro o justo después del QRS.',
    ),
    features: [
      l('提前出现的QRS与窦性QRS形态相同（除非有束支阻滞）。', 'A premature QRS shaped like the sinus QRS (narrow unless there is BBB).', 'Un QRS prematuro igual al sinusal (estrecho salvo que haya bloqueo de rama).'),
      l(
        'P′在Ⅱ、Ⅲ、aVF倒置：位于QRS前（P′R<120 ms）、隐藏在QRS内，或位于其后的ST段。',
        'P′ negative in II, III and aVF: before the QRS with P′R < 120 ms, hidden in it, or after it in the ST segment.',
        'P′ negativa en II, III y aVF: antes del QRS con P′R < 120 ms, oculta en él o detrás, en el segmento ST.',
      ),
      l('若窦房结未被重整，代偿间歇常为完全性。', 'The pause is often fully compensatory when the sinus node is not reset.', 'La pausa suele ser compensadora completa cuando el nodo sinusal no se reinicia.'),
    ],
    criteria: [
      {
        label: l('逆行P′', 'Retrograde P′', 'P′ retrógrada'),
        value: l('Ⅱ、Ⅲ、aVF倒置；P′R<120 ms或P′在QRS之后', 'Negative in II, III, aVF; P′R < 120 ms or P′ after the QRS', 'Negativa en II, III, aVF; P′R < 120 ms o P′ tras el QRS'),
        source: 'Mason 2007; Brugada 2019 (ESC SVT)',
      },
    ],
    mechanism: l(
      '房室交界区的异位灶提前发放冲动，沿正常希氏-浦肯野系统激动心室，因此QRS与窦性QRS相同。心房由下向上逆行激动，在下壁导联形成倒置的P′波，其出现时机取决于前向与逆向传导的相对速度。',
      'A focus in the AV junction fires early and activates the ventricles down the normal His–Purkinje system, so the QRS looks like a sinus QRS. The atria are activated backwards from below, which gives an inverted P′ in the inferior leads whose timing depends on the relative speed of forward and backward conduction.',
      'Un foco de la unión AV dispara antes de tiempo y activa los ventrículos por el sistema de His-Purkinje normal, por eso el QRS se parece al sinusal. Las aurículas se activan al revés, desde abajo, lo que da una P′ negativa en las derivaciones inferiores cuyo momento depende de la velocidad relativa de la conducción anterógrada y retrógrada.',
    ),
    mimics: [
      {
        id: 'pac',
        discriminator: l(
          '此处P′R<120 ms或看不到P′；低位心房房早的P′虽在下壁倒置，但P′R≥120 ms。',
          'Here the P′R is < 120 ms or no P′ is seen; a low atrial PAC has a negative inferior P′ too, but its P′R is ≥ 120 ms.',
          'Aquí el P′R es < 120 ms o no se ve P′; una extrasístole auricular baja también tiene P′ inferior negativa, pero su P′R es ≥ 120 ms.',
        ),
        leads: ['II', 'III', 'aVF'],
      },
      {
        id: 'pvc',
        discriminator: l('此处QRS窄且与窦性相同；室早QRS宽大畸形。', 'Here the QRS is narrow and like the sinus beats; a PVC is wide and bizarre.', 'Aquí el QRS es estrecho e igual al sinusal; la extrasístole ventricular es ancha y abigarrada.'),
        leads: ['V1'],
      },
      {
        id: 'accelerated-junctional-rhythm',
        discriminator: l(
          '此处是单个提前搏动；加速性交界性心律是连续的60–100次/分的节律。',
          'Here it is a single early beat; an accelerated junctional rhythm is a sustained rhythm at 60–100/min.',
          'Aquí es un único latido precoz; el ritmo de la unión acelerado es un ritmo mantenido a 60-100 lpm.',
        ),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l(
        '仅凭P波倒置就判为交界性：决定因素是P′R（≥120 ms为心房起源）。',
        'Calling a beat junctional from the negative P alone: the P′R decides (≥ 120 ms means atrial).',
        'Llamar «de la unión» a un latido solo por la P negativa: decide el P′R (≥ 120 ms indica origen auricular).',
      ),
      l('原有束支阻滞者的交界性早搏被误认为室早——与窦性QRS比较。', 'Calling a PJC with pre-existing BBB a PVC — compare with the sinus QRS.', 'Llamar extrasístole ventricular a una de la unión con bloqueo de rama previo: compárala con el QRS sinusal.'),
    ],
    lessons: ['r5'],
    sources: [REF.mason2007, R.escSvt2019, REF.chou2008],
    aka: ['PJC', 'JPC', 'junctional premature beat', 'extrasístole nodal', '交界早搏'],
    exemplar: { scenarios: ['pjc'], layout: '3x4+1', lead: 'II', leads: ['II', 'III', 'aVF'] },
  },
  {
    id: 'pvc',
    definition: l(
      '起源于心室异位灶的提前出现的宽QRS，其前无提前的P波，通常伴完全性代偿间歇。',
      'An early, wide QRS from a ventricular focus, not preceded by a premature P wave, usually followed by a fully compensatory pause.',
      'QRS ancho y precoz originado en un foco ventricular, sin onda P prematura delante y seguido casi siempre de una pausa compensadora completa.',
    ),
    features: [
      l('提前出现的QRS，通常≥120 ms且畸形，其前无相关的P′。', 'A premature QRS, usually ≥ 120 ms and bizarre, with no related P′ before it.', 'Un QRS prematuro, casi siempre ≥ 120 ms y abigarrado, sin P′ relacionada delante.'),
      l('ST-T与QRS主波方向相反（继发性改变）。', 'ST–T opposite to the main QRS deflection (secondary change).', 'ST-T opuesto a la deflexión principal del QRS (alteración secundaria).'),
      l(
        '完全性代偿间歇：前后间期之和=2×窦性PP（窦性P波常藏在室早或其T波中）。',
        'Fully compensatory pause: pre- plus post-ectopic interval = 2 × sinus P–P (the sinus P often hides in the PVC or its T).',
        'Pausa compensadora completa: intervalo pre- más posectópico = 2 × P-P sinusal (la P sinusal suele esconderse en la extrasístole o en su T).',
      ),
      l(
        '形态提示起源：V1呈左束支阻滞型+电轴向下=流出道；V1呈右束支阻滞型=左心室或分支。',
        'Shape locates the origin: LBBB-like V1 with an inferior axis = outflow tract; RBBB-like V1 = left ventricle or fascicles.',
        'La forma localiza el origen: V1 tipo BRI con eje inferior = tracto de salida; V1 tipo BRD = ventrículo izquierdo o fascículos.',
      ),
      l(
        '记录数量、形态（单形或多形）、联律间期和是否成串。',
        'Note how many, how many shapes (uniform or multiform), the coupling interval and any runs.',
        'Anota cuántas hay, cuántas formas (monomorfas o multiformes), el intervalo de acoplamiento y si hay rachas.',
      ),
    ],
    criteria: [
      {
        label: l('室性期前收缩', 'Premature ventricular complex', 'Extrasístole ventricular'),
        value: l('提前的QRS，通常≥120 ms，其前无提前的P波', 'Premature QRS, usually ≥ 120 ms, without a preceding premature P', 'QRS prematuro, casi siempre ≥ 120 ms, sin P prematura previa'),
        source: 'Surawicz 2009; Zeppenfeld 2022',
      },
      {
        label: l('负荷', 'Burden', 'Carga'),
        value: l(
          '≥10%的心搏且LVEF不明原因降低→怀疑室早性心肌病',
          '≥ 10 % of beats with an unexplained low LVEF → suspect PVC-induced cardiomyopathy',
          '≥ 10 % de los latidos con FEVI baja sin explicación → sospecha miocardiopatía por extrasístoles',
        ),
        source: 'Zeppenfeld 2022 (ESC VA/SCD)',
      },
      {
        label: l('高危特征', 'High-risk features', 'Rasgos de alto riesgo'),
        value: l(
          '短联律间期（<300 ms）、QRS>150–160 ms、多形、运动时增多、结构性心脏病',
          'Short coupling (< 300 ms), QRS > 150–160 ms, multiform, increase with exercise, structural heart disease',
          'Acoplamiento corto (< 300 ms), QRS > 150-160 ms, multiformes, aumento con el esfuerzo, cardiopatía estructural',
        ),
        source: 'Zeppenfeld 2022; Pedersen 2014',
      },
      {
        label: l('流出道起源', 'Outflow-tract origin', 'Origen en el tracto de salida'),
        value: l(
          '左束支阻滞型、电轴向下；移行在V4或之后→右室流出道，在V2或之前→左室流出道/主动脉窦',
          'LBBB-like with an inferior axis; transition at V4 or later → RVOT, at or before V2 → LVOT/aortic cusp',
          'Tipo BRI con eje inferior; transición en V4 o después → TSVD, en V2 o antes → TSVI/senos aórticos',
        ),
        source: 'Cronin 2019 (HRS/EHRA consensus)',
      },
    ],
    mechanism: l(
      '心室异位灶在下一个窦性搏动之前发放冲动，从异常部位经心肌细胞间缓慢传导激动心室，形成宽大畸形的QRS和继发性ST-T改变。该冲动通常不能逆传重整窦房结，下一个窦性搏动按时出现，因此代偿间歇完全。',
      'A ventricular focus fires before the next sinus beat and activates the ventricles muscle-to-muscle from an abnormal site, which is slow and gives a wide, bizarre QRS with a secondary ST–T change. The impulse usually does not reach and reset the sinus node, so the next sinus beat arrives on schedule and the pause is fully compensatory.',
      'Un foco ventricular dispara antes del siguiente latido sinusal y activa los ventrículos de músculo a músculo desde un lugar anómalo, lo que es lento y da un QRS ancho y abigarrado con alteración secundaria del ST-T. El impulso no suele llegar al nodo sinusal ni reiniciarlo, así que el siguiente latido sinusal llega a su hora y la pausa es compensadora completa.',
    ),
    mimics: [
      {
        id: 'aberrant-conduction',
        discriminator: l(
          '此处宽搏动前没有提前的P′；伴差异性传导的房早在前一个T波上有P′，多呈典型右束支阻滞型。',
          'Here no premature P′ precedes the wide beat; an aberrant PAC has a P′ on the preceding T and usually a typical RBBB shape.',
          'Aquí ninguna P′ prematura precede al latido ancho; una extrasístole auricular aberrante tiene una P′ en la T previa y suele mostrar un BRD típico.',
        ),
        leads: ['V1', 'II'],
      },
      {
        id: 'paced-rhythm',
        discriminator: l('此处QRS前无起搏信号；起搏搏动前有刺激信号。', 'Here no spike precedes the QRS; a paced beat follows a stimulus artefact.', 'Aquí no hay espiga antes del QRS; un latido de marcapasos sigue a un artefacto de estímulo.'),
        leads: ['V1', 'II'],
      },
      {
        id: 'muscle-tremor',
        discriminator: l(
          '此处室早打乱节律并有自己的T波；伪差时原有QRS仍按时出现在伪差之中。',
          'Here the PVC disturbs the rhythm and has its own T wave; with artefact the underlying QRS complexes keep marching on time through it.',
          'Aquí la extrasístole altera el ritmo y tiene su propia T; con un artefacto los QRS de base siguen apareciendo a su hora a través de él.',
        ),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l(
        '用Lown分级或单凭“R-on-T”判断危险——应看负荷、形态、联律间期和有无心脏病。',
        'Grading with Lown classes or “R-on-T” alone — use burden, morphology, coupling and the presence of heart disease.',
        'Clasificar con los grados de Lown o solo por «R sobre T»: usa la carga, la morfología, el acoplamiento y la presencia de cardiopatía.',
      ),
      l('不在前一个T波上找P′就把伴差异性传导的房早称为室早。', 'Calling an aberrant PAC a PVC without looking for a P′ on the preceding T.', 'Llamar extrasístole ventricular a una auricular aberrante sin buscar la P′ en la T previa.'),
      l('忽视左心室射血分数降低患者的频发室早。', 'Ignoring frequent PVCs in a patient with reduced ejection fraction.', 'Ignorar las extrasístoles ventriculares frecuentes en un paciente con fracción de eyección reducida.'),
    ],
    lessons: ['r5'],
    sources: [REF.surawicz2009, REF.escVa2022, R.pedersen2014, R.cronin2019, R.alKhatib2017],
    aka: ['PVC', 'VPC', 'VPB', 'ventricular extrasystole', 'ectopic beat', 'EV', '室早'],
    exemplar: { scenarios: ['pvc'], layout: '3x4+1', lead: 'II', leads: ['V1', 'II', 'III', 'aVF'] },
  },
  {
    id: 'ventricular-bigeminy',
    definition: l(
      '每个窦性（或其他）搏动后都跟随一个室性期前收缩的重复模式。',
      'A repeating pattern in which every sinus (or other) beat is followed by a PVC.',
      'Patrón repetido en el que cada latido sinusal (u otro) va seguido de una extrasístole ventricular.',
    ),
    features: [
      l('正常搏动、室早、正常搏动、室早……持续数个周期；联律间期固定。', 'Normal beat, PVC, normal beat, PVC … for several cycles, at a fixed coupling interval.', 'Latido normal, extrasístole, latido normal, extrasístole… durante varios ciclos, con acoplamiento fijo.'),
      l(
        '脉搏可能只有心电图心率的一半：室早可能产生不了脉搏（脉搏短绌）。',
        'The pulse may be half the ECG rate: the PVCs may not produce a pulse (pulse deficit).',
        'El pulso puede ser la mitad de la frecuencia del ECG: las extrasístoles pueden no generar pulso (déficit de pulso).',
      ),
      l('三联律=每第三个搏动为室早；描述模式而不是分级。', 'Trigeminy = every third beat is a PVC; describe the pattern rather than grade it.', 'Trigeminismo = una extrasístole cada tres latidos; describe el patrón en vez de clasificarlo.'),
      l('考虑地高辛中毒、低钾和长QT等原因。', 'Think of digoxin toxicity, hypokalaemia and long QT as causes.', 'Piensa en intoxicación digitálica, hipopotasemia y QT largo como causas.'),
    ],
    criteria: [
      {
        label: l('二联律', 'Bigeminy', 'Bigeminismo'),
        value: l('每个正常搏动后跟一个室早', 'A PVC after every normal beat', 'Una extrasístole tras cada latido normal'),
        source: 'Mason 2007 (AHA/ACCF/HRS Part II)',
      },
      {
        label: l('负荷', 'Burden', 'Carga'),
        value: l(
          '整个Holter均为二联律≈50%负荷；≥10%且射血分数低→怀疑室早性心肌病',
          'Bigeminy throughout a Holter ≈ 50 % burden; ≥ 10 % with a low ejection fraction → suspect PVC-induced cardiomyopathy',
          'Bigeminismo durante todo el Holter ≈ 50 % de carga; ≥ 10 % con fracción de eyección baja → sospecha miocardiopatía por extrasístoles',
        ),
        source: 'Zeppenfeld 2022 (ESC VA/SCD)',
      },
    ],
    mechanism: l(
      '室性异位灶在每个正常搏动后以固定间期发放冲动，多为依赖前一搏动的折返或触发活动。每个室早后的代偿间歇延长了下一个心动周期，长周期又易诱发下一个室早，使二联律得以持续。',
      'A ventricular focus fires at a fixed interval after each normal beat, usually through re-entry or triggered activity that depends on the preceding beat. The compensatory pause after each PVC lengthens the next cycle, which in turn favours the next PVC and keeps the pattern going.',
      'Un foco ventricular dispara a un intervalo fijo tras cada latido normal, casi siempre por reentrada o actividad desencadenada que depende del latido previo. La pausa compensadora tras cada extrasístole alarga el ciclo siguiente, lo que favorece la próxima extrasístole y mantiene el patrón.',
    ),
    mimics: [
      {
        id: 'pac',
        discriminator: l(
          '此处提前搏动宽大且前无P′；房性二联律有提前的P′和窄QRS。',
          'Here the early beats are wide with no P′ before them; atrial bigeminy has premature P′ waves and narrow QRS complexes.',
          'Aquí los latidos precoces son anchos y sin P′ delante; el bigeminismo auricular tiene P′ prematuras y QRS estrechos.',
        ),
        leads: ['V1', 'II'],
      },
      {
        id: 'ventricular-couplet',
        discriminator: l('此处室早与正常搏动交替；成对室早是连续两个室早。', 'Here PVCs alternate with normal beats; a couplet is two PVCs in a row.', 'Aquí las extrasístoles alternan con latidos normales; una pareja son dos extrasístoles seguidas.'),
        leads: ['II'],
      },
      {
        id: 'electrical-alternans',
        discriminator: l(
          '此处每隔一个搏动提前且增宽；电交替时RR恒定，只是QRS振幅逐搏交替。',
          'Here every other beat is early and wide; in electrical alternans the R–R is constant and only the QRS amplitude alternates.',
          'Aquí uno de cada dos latidos es precoz y ancho; en la alternancia eléctrica el R-R es constante y solo alterna la amplitud del QRS.',
        ),
        leads: ['V3', 'II'],
      },
    ],
    pitfalls: [
      l('用脉搏或血氧仪计数心率：无效的室早使脉搏减半。', 'Counting the heart rate from the pulse or an oximeter: ineffective PVCs halve the pulse.', 'Contar la frecuencia por el pulso o el pulsioxímetro: las extrasístoles ineficaces reducen el pulso a la mitad.'),
      l('漏掉地高辛中毒或低钾这些原因。', 'Missing digoxin toxicity or hypokalaemia as the cause.', 'Pasar por alto la intoxicación digitálica o la hipopotasemia como causa.'),
    ],
    lessons: ['r5'],
    sources: [REF.mason2007, REF.escVa2022, R.alKhatib2017],
    aka: ['bigeminy', 'trigeminy', 'bigeminismo', 'trigeminismo', '二联律'],
    exemplar: { scenarios: ['ventricular-bigeminy'], layout: '3x4+1', lead: 'II', leads: ['II', 'V1'] },
  },
  {
    id: 'ventricular-couplet',
    definition: l(
      '连续两个室性期前收缩；连续三个及以上、频率>100次/分即为非持续性室速。',
      'Two consecutive PVCs; three or more in a row at > 100/min are already non-sustained VT.',
      'Dos extrasístoles ventriculares seguidas; tres o más seguidas a > 100 lpm ya son una TV no sostenida.',
    ),
    features: [
      l('两个宽大提前搏动紧接出现，随后为间歇。', 'Two wide premature beats back to back, then a pause.', 'Dos latidos anchos y prematuros seguidos, y luego una pausa.'),
      l('形态相同（单形）或不同（多形）——注明。', 'Same shape (uniform) or different (multiform) — say which.', 'Misma forma (monomorfos) o distinta (multiformes): indícalo.'),
      l(
        '连续三个或以上>100次/分的室性搏动=非持续性室速，而不是“三联发”。',
        'Three or more consecutive ventricular beats at > 100/min = NSVT, not a “triplet”.',
        'Tres o más latidos ventriculares seguidos a > 100 lpm = TVNS, no un «triplete».',
      ),
      l(
        '寻找基质：Q波、左心室肥厚、长QT、结构性心脏病；用Holter评估负荷。',
        'Look for the substrate: Q waves, LVH, long QT, structural heart disease; measure the burden on a Holter.',
        'Busca el sustrato: ondas Q, HVI, QT largo, cardiopatía estructural; mide la carga en un Holter.',
      ),
    ],
    criteria: [
      {
        label: l('成对室早', 'Couplet', 'Pareja'),
        value: l('连续2个室早', '2 consecutive PVCs', '2 extrasístoles ventriculares seguidas'),
        source: 'Al-Khatib 2017 (AHA/ACC/HRS VA/SCD)',
      },
      {
        label: l('非持续性室速', 'Non-sustained VT', 'TV no sostenida'),
        value: l('≥3个连续室性搏动，>100次/分，持续<30 s', '≥ 3 consecutive ventricular beats at > 100/min lasting < 30 s', '≥ 3 latidos ventriculares seguidos a > 100 lpm que duran < 30 s'),
        source: 'Al-Khatib 2017; Zeppenfeld 2022',
      },
    ],
    mechanism: l(
      '第一个室早造成短周期和恢复不均一的心肌区域，使第二个冲动得以折返或再触发一次搏动。每多一个连续搏动都提示同一基质更不稳定，因此连发越长风险越高。',
      'The first PVC creates a short cycle and a patch of unevenly recovered myocardium, which lets a second impulse re-enter or a second triggered beat occur. Each extra beat signals more instability of the same substrate, which is why longer runs carry more risk.',
      'La primera extrasístole crea un ciclo corto y una zona de miocardio con recuperación desigual, que permite la reentrada de un segundo impulso o un segundo latido desencadenado. Cada latido añadido indica más inestabilidad del mismo sustrato, por eso las rachas más largas conllevan más riesgo.',
    ),
    mimics: [
      {
        id: 'vt-monomorphic',
        discriminator: l(
          '此处只有两个搏动；连续三个及以上、>100次/分即为室速（<30 s为非持续性）。',
          'Here there are only two beats; three or more in a row at > 100/min are VT (non-sustained if < 30 s).',
          'Aquí solo hay dos latidos; tres o más seguidos a > 100 lpm son una TV (no sostenida si dura < 30 s).',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'aberrant-conduction',
        discriminator: l(
          '此处宽搏动前没有P′；成对的差异性传导房早前有P′，多呈典型右束支阻滞型。',
          'Here no P′ precedes the wide beats; a pair of aberrant PACs is preceded by P′ waves and usually has a typical RBBB shape.',
          'Aquí ninguna P′ precede a los latidos anchos; una pareja de extrasístoles auriculares aberrantes va precedida de P′ y suele tener forma de BRD típico.',
        ),
        leads: ['V1'],
      },
      {
        id: 'ventricular-bigeminy',
        discriminator: l('此处两个室早相连；二联律时室早与正常搏动交替。', 'Here two PVCs are joined; in bigeminy PVCs alternate with normal beats.', 'Aquí dos extrasístoles van juntas; en el bigeminismo alternan con latidos normales.'),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l('把连续三个室早称为“三联发”，而不是非持续性室速。', 'Calling three consecutive PVCs a “triplet” instead of NSVT.', 'Llamar «triplete» a tres extrasístoles seguidas en lugar de TVNS.'),
      l('忽视既往心梗或射血分数低患者的成对室早。', 'Ignoring couplets in a patient with prior MI or a low ejection fraction.', 'Ignorar las parejas en un paciente con infarto previo o fracción de eyección baja.'),
    ],
    lessons: ['r5', 't5'],
    sources: [R.alKhatib2017, REF.escVa2022],
    aka: ['couplet', 'pair', 'pareja', 'dupleta', '成对室早'],
    exemplar: { scenarios: ['pvc-patterns'], layout: '3x4+1', lead: 'II', leads: ['II', 'V1'] },
  },
  // ── escape and accelerated rhythms ───────────────────────────────────────────────────────────────────────────────
  {
    id: 'junctional-escape-rhythm',
    definition: l(
      '窦性冲动缺失或被阻滞时，由房室交界区发放的40–60次/分的规则窄QRS心律。',
      'A regular narrow-QRS rhythm at 40–60/min from the AV junction that takes over when sinus impulses fail or are blocked.',
      'Ritmo regular de QRS estrecho a 40-60 lpm desde la unión AV que toma el mando cuando los impulsos sinusales fallan o se bloquean.',
    ),
    features: [
      l('规则节律，40–60次/分，QRS狭窄（除非原有束支阻滞）。', 'Regular rhythm at 40–60/min with a narrow QRS (unless there is pre-existing BBB).', 'Ritmo regular a 40-60 lpm con QRS estrecho (salvo bloqueo de rama previo).'),
      l(
        'QRS前无窦性P波：逆行P′（Ⅱ、Ⅲ、aVF倒置）紧贴QRS前（PR<120 ms）、隐藏在QRS内或位于其后；或窦性P波与QRS无关（房室分离）。',
        'No sinus P before the QRS: a retrograde P′ (negative in II, III, aVF) just before it (PR < 120 ms), hidden in it or after it — or sinus P waves unrelated to the QRS (AV dissociation).',
        'Sin P sinusal antes del QRS: una P′ retrógrada (negativa en II, III, aVF) justo antes (PR < 120 ms), oculta en él o detrás, o bien P sinusales sin relación con el QRS (disociación AV).',
      ),
      l('逸搏出现得晚：在长于窦性周期的间歇之后。', 'Escape beats come late, after a pause longer than the sinus cycle.', 'Los latidos de escape llegan tarde, tras una pausa más larga que el ciclo sinusal.'),
      l(
        '追问窦性为何失效：窦性心动过缓/停搏、房室阻滞、药物、高钾、下壁心肌梗死。',
        'Ask why the sinus node failed: sinus bradycardia or arrest, AV block, drugs, hyperkalaemia, inferior MI.',
        'Pregúntate por qué falló el nodo sinusal: bradicardia o paro sinusal, bloqueo AV, fármacos, hiperpotasemia, infarto inferior.',
      ),
    ],
    criteria: [
      {
        label: l('交界性逸搏频率', 'Junctional escape rate', 'Frecuencia del escape de la unión'),
        value: l('40–60次/分', '40–60/min', '40-60 lpm'),
        source: 'Brugada 2019 (ESC SVT); Kusumoto 2018',
      },
      {
        label: l('逆行P′', 'Retrograde P′', 'P′ retrógrada'),
        value: l('Ⅱ、Ⅲ、aVF倒置；PR<120 ms或P′在QRS之后', 'Negative in II, III, aVF; PR < 120 ms or P′ after the QRS', 'Negativa en II, III, aVF; PR < 120 ms o P′ tras el QRS'),
        source: 'Mason 2007 (AHA/ACCF/HRS Part II)',
      },
      {
        label: l('运动员', 'Athletes', 'Deportistas'),
        value: l('交界性逸搏心律属训练相关的正常表现', 'A junctional escape rhythm is a normal training-related finding', 'Un ritmo de escape de la unión es un hallazgo normal del entrenamiento'),
        source: 'Sharma 2017 (international athlete criteria)',
      },
    ],
    mechanism: l(
      '房室交界区细胞固有频率低于窦房结，正常时受其抑制。窦性冲动不能下达时，交界区自行达到阈电位，经正常希氏-浦肯野系统激动心室，因此QRS仍然狭窄。',
      'Cells in the AV junction have a slower intrinsic rate than the sinus node and are normally suppressed by it. When sinus impulses stop arriving, the junction reaches threshold on its own and drives the ventricles through the normal His–Purkinje system, so the QRS stays narrow.',
      'Las células de la unión AV tienen una frecuencia intrínseca más lenta que el nodo sinusal y normalmente están suprimidas por él. Cuando dejan de llegar impulsos sinusales, la unión alcanza el umbral por sí sola y activa los ventrículos por el sistema de His-Purkinje normal, por eso el QRS sigue siendo estrecho.',
    ),
    mimics: [
      {
        id: 'accelerated-junctional-rhythm',
        discriminator: l(
          '此处40–60次/分，是逸搏；加速性交界性心律60–100次/分，为自律性增高。',
          'Here the rate is 40–60/min, an escape; an accelerated junctional rhythm runs at 60–100/min from enhanced automaticity.',
          'Aquí la frecuencia es 40-60 lpm, un escape; el ritmo de la unión acelerado va a 60-100 lpm por aumento del automatismo.',
        ),
        leads: ['II'],
      },
      {
        id: 'ectopic-atrial-rhythm',
        discriminator: l(
          '此处PR<120 ms或P′在QRS之后；低位心房心律的PR≥120 ms。',
          'Here the PR is < 120 ms or the P′ follows the QRS; a low atrial rhythm has a PR ≥ 120 ms.',
          'Aquí el PR es < 120 ms o la P′ va tras el QRS; un ritmo auricular bajo tiene un PR ≥ 120 ms.',
        ),
        leads: ['II', 'III', 'aVF'],
      },
      {
        id: 'av-block-3',
        discriminator: l(
          '此处窦性减慢后交界区逸搏；完全性房室阻滞时窦性P波更快且全部未下传。',
          'Here the junction escapes because the sinus slowed; in complete AV block faster sinus P waves march through and none conducts.',
          'Aquí la unión escapa porque el nodo sinusal se frenó; en el bloqueo AV completo P sinusales más rápidas avanzan sin que ninguna se conduzca.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'ventricular-escape-rhythm',
        discriminator: l('此处QRS窄、40–60次/分；室性逸搏心律QRS宽、20–40次/分。', 'Here the QRS is narrow at 40–60/min; a ventricular escape rhythm is wide at 20–40/min.', 'Aquí el QRS es estrecho a 40-60 lpm; el escape ventricular es ancho a 20-40 lpm.'),
        leads: ['V1'],
      },
    ],
    pitfalls: [
      l('治疗逸搏心律本身（它是保护性的）；应处理窦房结失效或阻滞的原因。', 'Treating the escape rhythm (it is protective) instead of the cause of the sinus failure or block.', 'Tratar el ritmo de escape (es protector) en lugar de la causa del fallo sinusal o del bloqueo.'),
      l('漏诊完全性房室阻滞：寻找频率更快、穿行而过的P波。', 'Missing complete AV block: look for faster P waves marching through.', 'Pasar por alto un bloqueo AV completo: busca ondas P más rápidas que avanzan a través del trazado.'),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '评估血压和症状，检查血钾和用药（β受体阻滞剂、钙通道阻滞剂、地高辛），并寻找频率更快的P波以排除房室阻滞。',
        'Check blood pressure and symptoms, potassium and the drug list (beta-blockers, calcium-channel blockers, digoxin), and look for faster P waves that would mean AV block.',
        'Comprueba la presión arterial y los síntomas, el potasio y la medicación (betabloqueantes, antagonistas del calcio, digoxina), y busca P más rápidas que indicarían un bloqueo AV.',
      ),
    },
    lessons: ['r2'],
    sources: [R.escSvt2019, REF.kusumoto2018, REF.mason2007, REF.sharma2017],
    aka: ['junctional rhythm', 'nodal rhythm', 'ritmo de la unión', '交界性心律'],
    exemplar: { scenarios: ['junctional-escape-rhythm'], layout: '3x4+1', lead: 'II', leads: ['II', 'III', 'aVF'] },
  },
  {
    id: 'accelerated-junctional-rhythm',
    definition: l(
      '频率约60–100次/分、快于交界区逸搏频率的窄QRS交界性心律，常伴逆行P波或房室分离。',
      'A narrow-QRS junctional rhythm at about 60–100/min, faster than the junction’s escape rate, often with retrograde P waves or AV dissociation.',
      'Ritmo de la unión de QRS estrecho a unos 60-100 lpm, más rápido que su frecuencia de escape, a menudo con P retrógradas o disociación AV.',
    ),
    features: [
      l('规则窄QRS，60–100次/分，起始渐进（“温醒”）。', 'Regular narrow QRS at 60–100/min with a gradual onset (“warm-up”).', 'QRS estrecho regular a 60-100 lpm con inicio gradual («calentamiento»).'),
      l(
        'P′逆行（PR<120 ms或位于QRS后），或窦性P波在QRS前后漂移（等频性房室分离）。',
        'Retrograde P′ (PR < 120 ms or after the QRS), or sinus P waves drifting in and out of the QRS (isorhythmic AV dissociation).',
        'P′ retrógrada (PR < 120 ms o tras el QRS), o P sinusales que entran y salen del QRS (disociación AV isorrítmica).',
      ),
      l(
        '病因：地高辛中毒、下壁心肌梗死、心肌炎、心脏术后、儿茶酚胺、低钾；健康人静息时也可出现。',
        'Causes: digoxin toxicity, inferior MI, myocarditis, after cardiac surgery, catecholamines, hypokalaemia; it can occur at rest in healthy people.',
        'Causas: intoxicación digitálica, infarto inferior, miocarditis, posoperatorio cardiaco, catecolaminas, hipopotasemia; puede aparecer en reposo en personas sanas.',
      ),
      l('>100次/分即为交界性心动过速（儿童心脏术后的交界性异位心动过速）。', 'Above 100/min it is junctional tachycardia (junctional ectopic tachycardia in children after surgery).', 'Por encima de 100 lpm es una taquicardia de la unión (taquicardia ectópica de la unión en niños tras cirugía).'),
    ],
    criteria: [
      {
        label: l('加速性交界性心律', 'Accelerated junctional rhythm', 'Ritmo de la unión acelerado'),
        value: l('约60–100次/分；旧称非阵发性交界性心动过速（70–130次/分）', 'About 60–100/min; historically “non-paroxysmal junctional tachycardia” (70–130/min)', 'Unos 60-100 lpm; antes llamado «taquicardia de la unión no paroxística» (70-130 lpm)'),
        source: 'Brugada 2019 (ESC SVT); Mason 2007',
      },
    ],
    mechanism: l(
      '房室交界区自律性增高或触发活动使其发放频率超过通常的逸搏频率，超过了频率相近的窦房结。交界区与窦房结竞争，两者常并行，窦性P波在QRS前后漂移。',
      'Enhanced automaticity or triggered activity in the AV junction lets it fire faster than its usual escape rate and overtake a sinus node running at a similar rate. Because the junction then competes with the sinus node, the two often run side by side and the sinus P waves drift through the QRS complexes.',
      'El aumento del automatismo o la actividad desencadenada en la unión AV le permite disparar más rápido que su frecuencia de escape habitual y superar a un nodo sinusal de frecuencia parecida. Como la unión compite entonces con el nodo sinusal, ambos suelen funcionar en paralelo y las P sinusales se desplazan a través de los QRS.',
    ),
    mimics: [
      {
        id: 'junctional-escape-rhythm',
        discriminator: l('此处60–100次/分；交界性逸搏心律40–60次/分。', 'Here the rate is 60–100/min; a junctional escape rhythm runs at 40–60/min.', 'Aquí la frecuencia es 60-100 lpm; el escape de la unión va a 40-60 lpm.'),
        leads: ['II'],
      },
      {
        id: 'avnrt',
        discriminator: l(
          '此处60–100次/分，起始渐进；房室结折返性心动过速140–220次/分，突发突止。',
          'Here the rate is 60–100/min with a gradual onset; AVNRT runs at 140–220/min and starts and stops abruptly.',
          'Aquí la frecuencia es 60-100 lpm con inicio gradual; la TRIN va a 140-220 lpm y empieza y termina bruscamente.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'av-block-3',
        discriminator: l(
          '此处交界区快于窦性，时机合适的P波仍可夺获；完全性房室阻滞时心房率更快且无一下传。',
          'Here the junction is faster than the sinus and a well-timed P can still capture; in complete AV block the atrial rate is faster and none conducts.',
          'Aquí la unión va más rápida que el nodo sinusal y una P bien situada aún puede capturar; en el bloqueo AV completo la frecuencia auricular es mayor y ninguna se conduce.',
        ),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l(
        '漏诊地高辛中毒：服用地高辛的房颤患者出现加速性交界性心律，原本不规则的节律变得规则（“规则化房颤”）。',
        'Missing digoxin toxicity: in a patient with AF on digoxin an accelerated junctional rhythm makes the irregular rhythm regular (“regularised AF”).',
        'Pasar por alto la intoxicación digitálica: en un paciente con FA tratado con digoxina, un ritmo de la unión acelerado vuelve regular el ritmo irregular («FA regularizada»).',
      ),
      l('把等频性房室分离称为“房室阻滞”。', 'Calling isorhythmic dissociation “AV block”.', 'Llamar «bloqueo AV» a la disociación isorrítmica.'),
    ],
    lessons: ['r2'],
    sources: [R.escSvt2019, REF.mason2007, REF.chou2008],
    aka: ['non-paroxysmal junctional tachycardia', 'JET', 'ritmo de la unión acelerado', '加速性交界性逸搏心律'],
    exemplar: { scenarios: ['accelerated-junctional-rhythm'], layout: '3x4+1', lead: 'II', leads: ['II'] },
  },
  {
    id: 'ventricular-escape-rhythm',
    definition: l(
      '上级起搏点失效或被阻滞时出现的缓慢（约20–40次/分）宽QRS心室起搏心律。',
      'A slow (about 20–40/min), wide-QRS rhythm from a ventricular pacemaker that appears when higher pacemakers fail or are blocked.',
      'Ritmo lento (unos 20-40 lpm) de QRS ancho originado en un marcapasos ventricular que aparece cuando los marcapasos superiores fallan o se bloquean.',
    ),
    features: [
      l('规则的宽QRS（≥120 ms），20–40次/分，其前没有下传的P波。', 'Regular wide QRS (≥ 120 ms) at 20–40/min, not preceded by conducted P waves.', 'QRS ancho (≥ 120 ms) regular a 20-40 lpm, sin ondas P conducidas delante.'),
      l(
        '多见于完全性房室阻滞（P波以更快频率穿行）或窦性停搏之后。',
        'Usually seen with complete AV block (faster P waves march through) or after sinus arrest.',
        'Suele verse con bloqueo AV completo (P más rápidas que avanzan a través) o tras un paro sinusal.',
      ),
      l('逸搏形态：右束支阻滞型=左心室起源；左束支阻滞型=右心室起源。', 'Escape shape: RBBB-like = left ventricular focus; LBBB-like = right ventricular focus.', 'Forma del escape: tipo BRD = foco ventricular izquierdo; tipo BRI = foco ventricular derecho.'),
      l('不稳定：逸搏灶可能减慢或停止（心室停搏），心排血量低。', 'Unstable: the escape focus can slow or stop (asystole), and cardiac output is low.', 'Inestable: el foco de escape puede enlentecerse o detenerse (asistolia), y el gasto cardiaco es bajo.'),
    ],
    criteria: [
      {
        label: l('室性逸搏频率', 'Ventricular escape rate', 'Frecuencia del escape ventricular'),
        value: l('约20–40次/分，QRS≥120 ms', 'About 20–40/min, QRS ≥ 120 ms', 'Unos 20-40 lpm, QRS ≥ 120 ms'),
        source: 'Kusumoto 2018; Chou 2008',
      },
      {
        label: l('完全性房室阻滞伴宽逸搏', 'Wide escape in complete AV block', 'Escape ancho en el bloqueo AV completo'),
        value: l('提示结下（希氏-浦肯野系统）阻滞', 'Points to infranodal (His–Purkinje) block', 'Indica un bloqueo infranodal (His-Purkinje)'),
        source: 'Kusumoto 2018 (ACC/AHA/HRS bradycardia)',
      },
    ],
    mechanism: l(
      '浦肯野纤维和心室肌细胞的固有自律性最低，只有在上方冲动无法到达时才会发放。由于激动起源于心室内并在心肌细胞间扩布，QRS宽大，频率慢且不可靠。',
      'Purkinje and ventricular muscle cells have the slowest intrinsic automaticity and fire only when no impulse from above reaches them. Because activation starts inside the ventricle and spreads cell to cell, the QRS is wide and the rate slow and unreliable.',
      'Las células de Purkinje y del músculo ventricular tienen el automatismo intrínseco más lento y solo disparan cuando no les llega ningún impulso desde arriba. Como la activación nace dentro del ventrículo y se propaga de célula a célula, el QRS es ancho y la frecuencia lenta y poco fiable.',
    ),
    mimics: [
      {
        id: 'aivr',
        discriminator: l(
          '此处是20–40次/分的逸搏；加速性室性自主心律50–110次/分，与窦性竞争并有融合波。',
          'Here it is an escape at 20–40/min; AIVR runs at 50–110/min, competes with sinus rhythm and shows fusion beats.',
          'Aquí es un escape a 20-40 lpm; el RIVA va a 50-110 lpm, compite con el ritmo sinusal y muestra latidos de fusión.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'junctional-escape-rhythm',
        discriminator: l('此处QRS宽、20–40次/分；交界性逸搏QRS窄、40–60次/分。', 'Here the QRS is wide at 20–40/min; a junctional escape is narrow at 40–60/min.', 'Aquí el QRS es ancho a 20-40 lpm; el escape de la unión es estrecho a 40-60 lpm.'),
        leads: ['V1'],
      },
      {
        id: 'hyperkalemia',
        discriminator: l(
          '此处无T波高尖，P波可见；严重高钾血症时P波低平消失，宽QRS缓慢呈正弦波样。',
          'Here there are no peaked T waves and P waves are visible; severe hyperkalaemia flattens the P waves and gives slow, wide, sine-like complexes.',
          'Aquí no hay T picudas y se ven ondas P; la hiperpotasemia grave aplana las P y da complejos lentos, anchos y sinusoidales.',
        ),
        leads: ['II', 'V2'],
      },
      {
        id: 'paced-rhythm',
        discriminator: l('此处QRS前无起搏信号；心室起搏时每个宽QRS前有刺激信号。', 'Here no spike precedes the QRS; ventricular pacing puts a stimulus before each wide QRS.', 'Aquí no hay espiga antes del QRS; la estimulación ventricular pone una espiga antes de cada QRS ancho.'),
        leads: ['V1', 'II'],
      },
    ],
    pitfalls: [
      l(
        '用抗心律失常药（利多卡因、胺碘酮）抑制逸搏——它是维持患者生命的唯一节律。',
        'Suppressing the escape with antiarrhythmics (lidocaine, amiodarone) — it is the only rhythm keeping the patient alive.',
        'Suprimir el escape con antiarrítmicos (lidocaína, amiodarona): es el único ritmo que mantiene vivo al paciente.',
      ),
      l('漏掉高钾血症或药物中毒等原因。', 'Missing hyperkalaemia or drug toxicity as the cause.', 'Pasar por alto la hiperpotasemia o la toxicidad farmacológica como causa.'),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '立即评估灌注并贴上除颤/起搏电极片——逸搏灶随时可能减慢或停止。准备起搏，查血钾和用药，切勿使用会抑制逸搏的抗心律失常药。',
        'Assess perfusion now and attach defibrillator/pacing pads — the escape focus can slow or stop at any moment. Prepare pacing, check potassium and drugs, and never give antiarrhythmics that would suppress the escape.',
        'Valora ya la perfusión y coloca parches de desfibrilación/estimulación: el foco de escape puede frenarse o detenerse en cualquier momento. Prepara la estimulación, determina el potasio y revisa los fármacos, y no des nunca antiarrítmicos que supriman el escape.',
      ),
    },
    lessons: ['r2', 'r4', 't7'],
    sources: [REF.kusumoto2018, REF.chou2008, R.glikson2021],
    aka: ['idioventricular rhythm', 'IVR', 'ritmo idioventricular', '室性自主心律'],
    exemplar: { scenarios: ['ventricular-escape-rhythm'], layout: '3x4+1', lead: 'II', leads: ['II', 'V1'] },
  },
  {
    id: 'aivr',
    definition: l(
      '频率约50–110次/分、接近窦性频率的规则宽QRS室性心律，通常与窦性心律竞争。',
      'A regular wide-QRS ventricular rhythm at about 50–110/min, close to the sinus rate, typically competing with sinus rhythm.',
      'Ritmo ventricular regular de QRS ancho a unos 50-110 lpm, cercano a la frecuencia sinusal, que suele competir con el ritmo sinusal.',
    ),
    features: [
      l('规则宽QRS（≥120 ms），连续3个或以上，频率多为60–110次/分。', 'Regular wide QRS (≥ 120 ms), three or more beats, usually at 60–110/min.', 'QRS ancho (≥ 120 ms) regular, tres o más latidos, casi siempre a 60-110 lpm.'),
      l(
        '随窦性频率升降而渐进开始和终止；转换处可见融合波和夺获。',
        'Gradual onset and offset as the sinus rate falls or rises; fusion and capture beats at the transitions.',
        'Comienza y termina de forma gradual según baja o sube la frecuencia sinusal; latidos de fusión y captura en las transiciones.',
      ),
      l(
        '常见于急性心梗再灌注后、地高辛中毒、心肌病；通常为良性、自限性，无需治疗。',
        'Common after reperfusion in acute MI, with digoxin toxicity and in cardiomyopathy; usually benign, self-limited and needs no treatment.',
        'Frecuente tras la reperfusión del infarto agudo, en la intoxicación digitálica y en miocardiopatías; casi siempre benigno, autolimitado y sin necesidad de tratamiento.',
      ),
    ],
    criteria: [
      {
        label: l('加速性室性自主心律', 'Accelerated idioventricular rhythm', 'Ritmo idioventricular acelerado'),
        value: l('≥3个连续室性搏动，约50–110次/分（各定义略有不同）', '≥ 3 consecutive ventricular beats at about 50–110/min (definitions vary)', '≥ 3 latidos ventriculares seguidos a unos 50-110 lpm (las definiciones varían)'),
        source: 'Mason 2007; Byrne 2023 (ESC ACS)',
      },
      {
        label: l('与再灌注的关系', 'Link with reperfusion', 'Relación con la reperfusión'),
        value: l('再灌注后常见，但并非再灌注的特异标志（ST段回落才是）', 'Common after reperfusion but not a specific marker of it (ST resolution is)', 'Frecuente tras la reperfusión, pero no es un marcador específico de ella (lo es la resolución del ST)'),
        source: 'Byrne 2023 (ESC ACS)',
      },
    ],
    mechanism: l(
      '心室异位灶自律性增高，使其频率接近窦性频率，此时哪一个较快就由哪一个驱动心室。两者频率交叉时，窦性激动和心室激动在心室内相遇，形成室性融合波。',
      'Enhanced automaticity in a ventricular focus raises its rate close to the sinus rate, so whichever is faster at the moment drives the ventricles. When the two rates cross, the sinus and ventricular wavefronts meet inside the ventricles and produce fusion beats.',
      'El aumento del automatismo de un foco ventricular eleva su frecuencia hasta cerca de la sinusal, de modo que el que sea más rápido en cada momento dirige los ventrículos. Cuando las dos frecuencias se cruzan, los frentes sinusal y ventricular se encuentran dentro de los ventrículos y producen latidos de fusión.',
    ),
    mimics: [
      {
        id: 'vt-monomorphic',
        discriminator: l(
          '此处频率<110–120次/分，渐进起止，与窦性融合；室速更快（>120次/分），突然发作。',
          'Here the rate is below about 110–120/min with gradual onset and fusion with sinus beats; VT is faster (> 120/min) and starts abruptly.',
          'Aquí la frecuencia está por debajo de unos 110-120 lpm, con inicio gradual y fusión con latidos sinusales; la TV es más rápida (> 120 lpm) y empieza bruscamente.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'ventricular-escape-rhythm',
        discriminator: l('此处50–110次/分；室性逸搏心律20–40次/分。', 'Here the rate is 50–110/min; a ventricular escape rhythm runs at 20–40/min.', 'Aquí la frecuencia es 50-110 lpm; el escape ventricular va a 20-40 lpm.'),
        leads: ['II'],
      },
      {
        id: 'rbbb',
        discriminator: l(
          '此处宽QRS间歇出现、前无相关P波且有融合波；束支阻滞时每个宽QRS前都有窦性P波和固定PR。',
          'Here the wide beats come and go, without a related P and with fusion beats; in bundle branch block every wide QRS follows a sinus P at a fixed PR.',
          'Aquí los latidos anchos van y vienen, sin P relacionada y con fusiones; en el bloqueo de rama cada QRS ancho sigue a una P sinusal con PR fijo.',
        ),
        leads: ['V1', 'II'],
      },
    ],
    pitfalls: [
      l('把它当作室速，使用抗心律失常药或电复律。', 'Treating it as VT with antiarrhythmics or cardioversion.', 'Tratarlo como una TV con antiarrítmicos o cardioversión.'),
      l('把它当作再灌注成功的证据。', 'Taking it as proof of successful reperfusion.', 'Tomarlo como prueba de una reperfusión eficaz.'),
    ],
    lessons: ['r2', 'i9'],
    sources: [REF.mason2007, REF.escAcs2023, REF.escVa2022],
    aka: ['AIVR', 'RIVA', 'slow VT', 'TV lenta', '加速性室性自主心律'],
    exemplar: { scenarios: ['aivr'], layout: '3x4+1', lead: 'II', leads: ['II', 'V1'] },
  },
  // ── supraventricular tachycardias ────────────────────────────────────────────────────────────────────────────────
  {
    id: 'atrial-tachycardia',
    definition: l(
      '起源于心房单一病灶、频率≥100次/分（多为100–250次/分）的有序心房节律，P′不同于窦性P波，P′之间有等电位线。',
      'An organised atrial rhythm ≥ 100/min (usually 100–250/min) from a discrete focus, with P′ waves unlike the sinus P and an isoelectric baseline between them.',
      'Ritmo auricular organizado ≥ 100 lpm (casi siempre 100-250 lpm) desde un foco concreto, con P′ distintas de la sinusal y línea isoeléctrica entre ellas.',
    ),
    features: [
      l(
        '规则窄QRS心动过速，每个QRS前有电轴/形态异常的P′，P′之间为等电位线。',
        'Regular narrow-QRS tachycardia with an abnormally shaped P′ before each QRS and a flat baseline between P′ waves.',
        'Taquicardia regular de QRS estrecho con una P′ de forma anómala antes de cada QRS y línea de base plana entre las P′.',
      ),
      l('多为长RP心动过速（RP>PR），但P′R取决于房室传导。', 'Usually a long-RP tachycardia (RP > PR), but the P′R depends on AV conduction.', 'Suele ser una taquicardia de RP largo (RP > PR), aunque el P′R depende de la conducción AV.'),
      l(
        '可出现房室阻滞（2:1、文氏）而心动过速继续——这不支持房室结折返或房室折返。',
        'AV block (2:1, Wenckebach) can appear while the tachycardia continues — this argues against AVNRT and AVRT.',
        'Puede aparecer bloqueo AV (2:1, Wenckebach) sin que la taquicardia se detenga, lo que va en contra de TRIN y TRAV.',
      ),
      l('发作时“温醒”、终止时“冷却”提示自律性病灶。', 'Warm-up at onset and cool-down at termination suggest an automatic focus.', 'El «calentamiento» al inicio y el «enfriamiento» al final sugieren un foco automático.'),
      l(
        'P′形态提示部位：Ⅰ/aVL负向→左心房；下壁负向→低位起源。',
        'P′ shape points to the site: negative in I/aVL → left atrium; negative inferiorly → low origin.',
        'La forma de la P′ orienta al origen: negativa en I/aVL → aurícula izquierda; negativa en inferiores → origen bajo.',
      ),
    ],
    criteria: [
      {
        label: l('局灶性房速', 'Focal atrial tachycardia', 'Taquicardia auricular focal'),
        value: l('起源于单一部位、≥100次/分的有序心房节律', 'Organised atrial rhythm ≥ 100/min from a discrete origin', 'Ritmo auricular organizado ≥ 100 lpm desde un origen concreto'),
        source: 'Brugada 2019 (ESC SVT)',
      },
      {
        label: l('房速伴阻滞', 'Atrial tachycardia with block', 'Taquicardia auricular con bloqueo'),
        value: l('P′多于QRS，P′间有等电位线（经典见于地高辛中毒、低钾）', 'More P′ than QRS with an isoelectric baseline (classically digoxin toxicity, hypokalaemia)', 'Más P′ que QRS con línea isoeléctrica (clásicamente intoxicación digitálica, hipopotasemia)'),
        source: 'Brugada 2019 (ESC SVT)',
      },
      {
        label: l('P′定位', 'P′ localisation', 'Localización por la P′'),
        value: l('Ⅰ/aVL负向→左心房；V1负向→右心房外侧；下壁正向→高位起源', 'Negative in I/aVL → left atrium; negative in V1 → lateral right atrium; positive inferiorly → high origin', 'Negativa en I/aVL → aurícula izquierda; negativa en V1 → aurícula derecha lateral; positiva en inferiores → origen alto'),
        source: 'Kistler 2006',
      },
    ],
    mechanism: l(
      '心房内一个小病灶通过异常自律性、触发活动或微折返快速发放冲动，从该点向四周扩布激动心房。由于房室结不参与发生机制，房室阻滞可减慢心室率而不终止房性心动过速。',
      'A small atrial focus fires rapidly through abnormal automaticity, triggered activity or micro-re-entry, and the impulse spreads outward through the atria from that point. Because the AV node is not part of the mechanism, AV block can slow the ventricular response without stopping the tachycardia.',
      'Un foco auricular pequeño dispara rápidamente por automatismo anómalo, actividad desencadenada o microrreentrada, y el impulso se extiende por las aurículas desde ese punto. Como el nodo AV no forma parte del mecanismo, un bloqueo AV puede enlentecer la respuesta ventricular sin detener la taquicardia.',
    ),
    mimics: [
      {
        id: 'sinus-tachycardia',
        discriminator: l(
          '此处P′电轴异常，突发突止；窦性心动过速P波为窦性，频率渐变。',
          'Here the P′ axis is abnormal and the onset abrupt; sinus tachycardia keeps a sinus P and changes rate gradually.',
          'Aquí el eje de la P′ es anómalo y el inicio brusco; la taquicardia sinusal mantiene una P sinusal y cambia de frecuencia poco a poco.',
        ),
        leads: ['II', 'aVF'],
      },
      {
        id: 'atrial-flutter',
        discriminator: l(
          '此处下壁导联P′之间有等电位线；典型房扑呈连续锯齿波，无等电位线。',
          'Here the inferior leads show a flat baseline between P′ waves; typical flutter is a continuous saw-tooth with no flat segment.',
          'Aquí las inferiores muestran línea plana entre las P′; el flutter típico es un diente de sierra continuo sin tramo plano.',
        ),
        leads: ['II', 'III', 'aVF'],
      },
      {
        id: 'avnrt',
        discriminator: l(
          '此处出现房室阻滞时心动过速继续；房室结折返性心动过速一旦房室阻滞即终止。',
          'Here the tachycardia continues through AV block; AVNRT stops as soon as AV conduction blocks.',
          'Aquí la taquicardia continúa pese al bloqueo AV; la TRIN se detiene en cuanto se bloquea la conducción AV.',
        ),
        leads: ['II', 'V1'],
      },
    ],
    pitfalls: [
      l(
        '不与既往窦性心电图比较P波，就把长RP心动过速称为窦速。',
        'Calling a long-RP tachycardia “sinus” without comparing the P with a previous sinus ECG.',
        'Llamar «sinusal» a una taquicardia de RP largo sin comparar la P con un ECG sinusal previo.',
      ),
      l(
        '以为有等电位线就能排除大折返，尤其是心房手术或消融后。',
        'Assuming an isoelectric baseline excludes macro-re-entry, especially after atrial surgery or ablation.',
        'Suponer que una línea isoeléctrica descarta una macrorreentrada, sobre todo tras cirugía o ablación auricular.',
      ),
    ],
    lessons: ['t1'],
    sources: [R.escSvt2019, R.page2015, R.kistler2006],
    aka: ['AT', 'focal AT', 'PAT', 'paroxysmal atrial tachycardia', 'TA', 'taquicardia auricular', '房速'],
    exemplar: { scenarios: ['atrial-tachycardia'], layout: '3x4+1', lead: 'II', leads: ['II', 'V1', 'I', 'aVL'] },
  },
  {
    id: 'mat',
    definition: l(
      '频率>100次/分的不规则心房节律，有≥3种P波形态，PP、PR、RR间期均不等。',
      'An irregular atrial rhythm above 100/min with ≥ 3 distinct P-wave shapes and variable P–P, PR and R–R intervals.',
      'Ritmo auricular irregular a más de 100 lpm con ≥ 3 formas de onda P y P-P, PR y R-R variables.',
    ),
    features: [
      l(
        '不规则窄QRS心动过速；每个QRS前都有P波，但同一导联P波形态≥3种。',
        'An irregular narrow-QRS tachycardia; a P wave precedes every QRS, but the P shapes vary (≥ 3 in one lead).',
        'Taquicardia irregular de QRS estrecho; una onda P precede a cada QRS, pero su forma varía (≥ 3 en una derivación).',
      ),
      l('P波之间有等电位线；PP、PR和RR均变化。', 'An isoelectric baseline between P waves; P–P, PR and R–R all vary.', 'Línea isoeléctrica entre las P; el P-P, el PR y el R-R varían.'),
      l(
        '典型背景：慢阻肺急性加重、低氧、肺动脉高压、茶碱、低镁、脓毒症。',
        'Typical setting: COPD exacerbation, hypoxia, pulmonary hypertension, theophylline, hypomagnesaemia, sepsis.',
        'Contexto típico: EPOC reagudizada, hipoxia, hipertensión pulmonar, teofilina, hipomagnesemia, sepsis.',
      ),
      l('治疗基础疾病；电复律无效。', 'Treat the underlying illness; cardioversion does not work.', 'Trata la enfermedad de base; la cardioversión no funciona.'),
    ],
    criteria: [
      {
        label: l('多源性房性心动过速', 'Multifocal atrial tachycardia', 'Taquicardia auricular multifocal'),
        value: l('≥3种P波形态，心房率>100次/分，有等电位线，PP/PR/RR不等', '≥ 3 P morphologies, atrial rate > 100/min, isoelectric baseline, variable P–P/PR/R–R', '≥ 3 morfologías de P, frecuencia auricular > 100 lpm, línea isoeléctrica, P-P/PR/R-R variables'),
        source: 'Brugada 2019 (ESC SVT); Page 2015',
      },
    ],
    mechanism: l(
      '心房受牵拉、缺氧或儿茶酚胺作用时，多个心房异位灶通过触发活动轮流发放冲动。每个异位灶产生各自的P波形态和至房室结的不同传导距离，因此P波形态、PR和RR逐搏变化。',
      'Several atrial foci, driven by triggered activity in stretched, hypoxic or catecholamine-exposed atria, fire in turn. Each focus has its own P shape and its own distance to the AV node, so P morphology, PR and R–R change from beat to beat.',
      'Varios focos auriculares, impulsados por actividad desencadenada en unas aurículas distendidas, hipóxicas o expuestas a catecolaminas, disparan por turnos. Cada foco tiene su propia forma de P y su propia distancia al nodo AV, de modo que la morfología de la P, el PR y el R-R cambian latido a latido.',
    ),
    mimics: [
      {
        id: 'atrial-fibrillation',
        discriminator: l(
          '此处每个QRS前有独立的P波，P波间有等电位线；心房颤动没有P波，只有f波。',
          'Here a discrete P precedes every QRS with a flat baseline between; AF has no P waves, only fibrillatory waves.',
          'Aquí una P bien definida precede a cada QRS con línea plana entre ellas; la FA no tiene ondas P, solo ondas f.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'wandering-atrial-pacemaker',
        discriminator: l('此处>100次/分；游走性心房起搏点<100次/分。', 'Here the rate is > 100/min; a wandering atrial pacemaker runs below 100/min.', 'Aquí la frecuencia es > 100 lpm; el marcapasos auricular migratorio va a menos de 100 lpm.'),
        leads: ['II'],
      },
      {
        id: 'atrial-flutter',
        discriminator: l(
          '此处P波形态各异；房扑伴不等比下传时F波完全相同，RR为F-F周期的倍数。',
          'Here the P waves differ from each other; flutter with variable block has identical F waves and R–R intervals at multiples of the F–F cycle.',
          'Aquí las P son distintas entre sí; el flutter con bloqueo variable tiene ondas F idénticas y R-R múltiplos del ciclo F-F.',
        ),
        leads: ['II', 'V1'],
      },
    ],
    pitfalls: [
      l('把多源性房速当作房颤，开始抗凝或电复律。', 'Calling MAT AF and starting anticoagulation or cardioversion.', 'Llamar FA a una TAM e iniciar anticoagulación o cardioversión.'),
      l('条图不够长，数出的P波形态不足三种。', 'Counting fewer than three P shapes on a strip that is too short.', 'Contar menos de tres formas de P en una tira demasiado corta.'),
    ],
    lessons: ['t2'],
    sources: [R.escSvt2019, R.page2015],
    aka: ['MAT', 'TAM', 'chaotic atrial tachycardia', 'taquicardia auricular caótica', '紊乱性房性心动过速'],
    exemplar: { scenarios: ['mat'], layout: '3x4+1', lead: 'II', leads: ['II', 'V1'] },
  },
  {
    id: 'atrial-fibrillation',
    definition: l(
      '心房活动紊乱、无重复出现的P波，房室传导正常时RR间期绝对不规则。',
      'Disorganised atrial activity without repeating P waves, with irregularly irregular R–R intervals while AV conduction is intact.',
      'Actividad auricular desorganizada sin ondas P repetidas, con intervalos R-R irregularmente irregulares mientras la conducción AV está conservada.',
    ),
    features: [
      l(
        '无可辨认的重复P波；f波（粗、细或看不见），V1导联最清楚。',
        'No discernible repeating P waves; fibrillatory f waves (coarse, fine or invisible), best seen in V1.',
        'Sin ondas P repetidas reconocibles; ondas f (gruesas, finas o invisibles), mejor vistas en V1.',
      ),
      l('RR绝对不规则，没有规律。', 'Irregularly irregular R–R with no pattern.', 'R-R irregularmente irregular, sin patrón.'),
      l(
        '未治疗时心室率多为100–180次/分；未用药而心室率慢提示房室结病变。',
        'Untreated ventricular rate is usually 100–180/min; a slow rate without drugs suggests AV-node disease.',
        'Sin tratamiento la frecuencia ventricular suele ser 100-180 lpm; una frecuencia lenta sin fármacos sugiere enfermedad del nodo AV.',
      ),
      l(
        '房颤时RR规则=完全性房室阻滞伴逸搏或交界性心律（地高辛中毒），而不是“心室率控制良好”。',
        'Regular R–R in AF means complete AV block with an escape, or a junctional rhythm (digoxin toxicity) — not “good rate control”.',
        'Un R-R regular en la FA significa bloqueo AV completo con escape o ritmo de la unión (intoxicación digitálica), no «buen control de frecuencia».',
      ),
      l(
        '极快（>250次/分）、不规则、宽而形态多变的QRS=预激伴房颤。',
        'Very fast (> 250/min), irregular, broad QRS that keeps changing shape = pre-excited AF.',
        'QRS muy rápido (> 250 lpm), irregular, ancho y de forma cambiante = FA preexcitada.',
      ),
    ],
    criteria: [
      {
        label: l('诊断', 'Diagnosis', 'Diagnóstico'),
        value: l(
          '标准12导联心电图或≥30 s单导联记录显示RR不规则且无重复P波',
          'Standard 12-lead ECG or ≥ 30 s single-lead strip showing irregular R–R and no repeating P waves',
          'ECG de 12 derivaciones o registro de una derivación ≥ 30 s con R-R irregular y sin ondas P repetidas',
        ),
        source: 'Van Gelder 2024 (ESC AF)',
      },
      {
        label: l('f波', 'f waves', 'Ondas f'),
        value: l('约350–600次/分', 'About 350–600/min', 'Unas 350-600 por minuto'),
        source: 'Van Gelder 2024; Joglar 2023 (ACC/AHA AF)',
      },
      {
        label: l('预激伴房颤', 'Pre-excited AF', 'FA preexcitada'),
        value: l('最短预激RR≤250 ms为高危', 'Shortest pre-excited R–R ≤ 250 ms = high risk', 'R-R preexcitado más corto ≤ 250 ms = alto riesgo'),
        source: 'Brugada 2019 (ESC SVT)',
      },
    ],
    mechanism: l(
      '多个游走的子波和快速驱动灶（常起源于肺静脉）以350–600次/分的频率紊乱地激动心房，因此没有有序的P波。房室结接收到的冲动远多于其能下传的数量，只随机下传其中一部分，心室律因而绝对不规则。',
      'Multiple wandering wavelets and rapid drivers, often from the pulmonary veins, activate the atria chaotically at 350–600/min, so there is no organised P wave. The AV node receives far more impulses than it can conduct and lets only some through at random, which makes the ventricular rhythm irregularly irregular.',
      'Múltiples ondas errantes y focos rápidos, a menudo de las venas pulmonares, activan las aurículas de forma caótica a 350-600 por minuto, de modo que no hay una onda P organizada. El nodo AV recibe muchos más impulsos de los que puede conducir y deja pasar solo algunos al azar, lo que hace el ritmo ventricular irregularmente irregular.',
    ),
    mimics: [
      {
        id: 'mat',
        discriminator: l(
          '此处无P波；多源性房速有≥3种独立P波，其间有等电位线。',
          'Here there are no P waves; MAT has ≥ 3 distinct P waves with a flat baseline between them.',
          'Aquí no hay ondas P; la TAM tiene ≥ 3 ondas P distintas con línea plana entre ellas.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'atrial-flutter',
        discriminator: l(
          '此处心房活动的频率和形态都不规则；房扑伴不等比下传时F波相同，RR聚集在F-F周期的倍数上。',
          'Here atrial activity varies in rate and shape; flutter with variable block has identical F waves and R–R intervals that cluster at multiples of the F–F cycle.',
          'Aquí la actividad auricular varía en frecuencia y forma; el flutter con bloqueo variable tiene ondas F idénticas y R-R agrupados en múltiplos del ciclo F-F.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'muscle-tremor',
        discriminator: l(
          '此处RR确实不规则；肌电伪差可类似f波，但RR规则，其他导联可见P波。',
          'Here the R–R is truly irregular; tremor artefact can mimic f waves, but the R–R is regular and P waves show in other leads.',
          'Aquí el R-R es realmente irregular; el artefacto por temblor puede imitar ondas f, pero el R-R es regular y se ven P en otras derivaciones.',
        ),
        leads: ['II', 'V1'],
      },
    ],
    pitfalls: [
      l('不找P波，仅因节律不齐就诊断房颤（多源性房速、频发房早、窦性心律不齐）。', 'Diagnosing AF from an irregular rhythm without checking for P waves (MAT, frequent PACs, sinus arrhythmia).', 'Diagnosticar FA por un ritmo irregular sin buscar ondas P (TAM, extrasístoles auriculares frecuentes, arritmia sinusal).'),
      l('仅凭V1把粗颤称为房扑（或反之）——看下壁导联。', 'Calling coarse AF “flutter” (or the reverse) from V1 alone — check the inferior leads.', 'Llamar «flutter» a una FA gruesa (o al revés) solo por V1: mira las inferiores.'),
      l('对快速、宽大、不规则的心动过速使用房室结阻滞药（预激伴房颤）。', 'Giving AV-nodal blockers to a fast, broad, irregular tachycardia (pre-excited AF).', 'Dar bloqueantes del nodo AV a una taquicardia rápida, ancha e irregular (FA preexcitada).'),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '先评估血流动力学是否稳定。若QRS宽大、极快且形态多变，按预激伴房颤处理，禁用房室结阻滞药；否则安排心室率控制并评估卒中风险。',
        'Check haemodynamic stability first. If the QRS is broad, very fast and changing shape, treat it as pre-excited AF and give no AV-nodal blockers; otherwise plan rate control and a stroke-risk assessment.',
        'Comprueba primero la estabilidad hemodinámica. Si el QRS es ancho, muy rápido y cambia de forma, trátala como FA preexcitada y no des bloqueantes del nodo AV; si no, planifica el control de frecuencia y la valoración del riesgo de ictus.',
      ),
    },
    lessons: ['t2'],
    sources: [R.escAf2024, R.joglar2023, R.escSvt2019, REF.chou2008],
    aka: ['AF', 'AFib', 'FA', 'fibrilación', '房颤'],
    exemplar: { scenarios: ['atrial-fibrillation'], layout: '3x4+1', lead: 'II', leads: ['V1', 'II'] },
  },
  {
    id: 'atrial-flutter',
    definition: l(
      '心房大折返性心动过速，心房活动规则，约250–330次/分；典型房扑在Ⅱ、Ⅲ、aVF呈负向锯齿状F波。',
      'A macro-re-entrant atrial tachycardia with regular atrial activity at about 250–330/min; typical flutter shows negative saw-tooth F waves in II, III and aVF.',
      'Taquicardia auricular por macrorreentrada con actividad auricular regular a unos 250-330 por minuto; el flutter típico muestra ondas F negativas en dientes de sierra en II, III y aVF.',
    ),
    features: [
      l(
        '典型（逆钟向、峡部依赖）：Ⅱ、Ⅲ、aVF负向锯齿状F波，无等电位线；V1为正向F波。',
        'Typical (counter-clockwise, isthmus-dependent): negative saw-tooth F waves in II, III, aVF with no isoelectric baseline; positive F waves in V1.',
        'Típico (antihorario, dependiente del istmo): ondas F negativas en dientes de sierra en II, III, aVF sin línea isoeléctrica; ondas F positivas en V1.',
      ),
      l(
        '心房率约300次/分；多为2:1下传→心室率约150次/分；也可3:1、4:1或不等比。',
        'Atrial rate about 300/min; conduction is usually 2:1 → ventricular rate about 150/min; also 3:1, 4:1 or variable.',
        'Frecuencia auricular de unos 300 por minuto; la conducción suele ser 2:1 → frecuencia ventricular de unos 150 lpm; también 3:1, 4:1 o variable.',
      ),
      l(
        '任何约150次/分的规则窄QRS心动过速：在QRS或T波内寻找第二个F波。',
        'Any regular narrow tachycardia at about 150/min: search for a second F wave hidden in the QRS or T.',
        'Ante cualquier taquicardia estrecha regular a unos 150 lpm, busca una segunda onda F oculta en el QRS o la T.',
      ),
      l(
        '1:1下传（IC类药物、胺碘酮、交感兴奋）造成极快、常为宽QRS的心动过速——急症。',
        '1:1 conduction (class IC drugs, amiodarone, sympathetic drive) gives a very fast, often wide tachycardia — an emergency.',
        'La conducción 1:1 (fármacos IC, amiodarona, estímulo simpático) da una taquicardia muy rápida, a menudo ancha: es una urgencia.',
      ),
    ],
    criteria: [
      {
        label: l('典型房扑', 'Typical flutter', 'Flutter típico'),
        value: l('心房率约250–330次/分；Ⅱ、Ⅲ、aVF负向F波；V1正向F波', 'Atrial rate about 250–330/min; negative F in II, III, aVF; positive F in V1', 'Frecuencia auricular de unos 250-330 por minuto; F negativas en II, III, aVF; F positivas en V1'),
        source: 'Brugada 2019 (ESC SVT); Saoudi 2001',
      },
      {
        label: l('线索', 'Clue', 'Pista'),
        value: l('规则心室率约150次/分→考虑2:1房扑', 'Regular ventricular rate about 150/min → consider 2:1 flutter', 'Frecuencia ventricular regular de unos 150 lpm → piensa en flutter 2:1'),
        source: 'Brugada 2019 (ESC SVT)',
      },
      {
        label: l('非典型房扑', 'Atypical flutter', 'Flutter atípico'),
        value: l('非峡部依赖的大折返（常见于消融或手术后），形态与典型环路不符', 'Non-isthmus macro-re-entry (often after ablation or surgery) whose morphology fits no typical circuit', 'Macrorreentrada no dependiente del istmo (a menudo tras ablación o cirugía) cuya morfología no encaja con los circuitos típicos'),
        source: 'Saoudi 2001',
      },
    ],
    mechanism: l(
      '一个激动波沿右心房三尖瓣环周围的大折返环路循环，经过下腔静脉-三尖瓣环峡部，心房被持续激动，因而没有等电位间歇。房室结无法跟随每分钟300次的冲动，通常每两个下传一个，形成约150次/分的典型心室率。',
      'A single wavefront circles a large anatomical circuit around the tricuspid annulus in the right atrium, passing through the cavotricuspid isthmus, so the atria are activated continuously and there is no isoelectric pause. The AV node cannot follow 300 impulses per minute and usually conducts every second one, which gives the classic ventricular rate of about 150/min.',
      'Un único frente de onda gira por un gran circuito anatómico alrededor del anillo tricuspídeo en la aurícula derecha, pasando por el istmo cavotricuspídeo, de modo que las aurículas se activan sin pausa y no hay línea isoeléctrica. El nodo AV no puede seguir 300 impulsos por minuto y suele conducir uno de cada dos, lo que da la frecuencia ventricular clásica de unos 150 lpm.',
    ),
    mimics: [
      {
        id: 'sinus-tachycardia',
        discriminator: l(
          '此处第二个F波藏在QRS或T波内，频率固定不变；窦速每个QRS前一个P波，频率可变。',
          'Here a second F wave hides in the QRS or T and the rate never moves; sinus tachycardia has one P per QRS and a varying rate.',
          'Aquí una segunda onda F se esconde en el QRS o la T y la frecuencia no cambia; la taquicardia sinusal tiene una P por QRS y frecuencia variable.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'atrial-fibrillation',
        discriminator: l(
          '此处F波相同、频率固定；房颤的f波频率和形态都不规则。',
          'Here the F waves are identical at a fixed rate; AF has f waves of irregular rate and shape.',
          'Aquí las ondas F son idénticas y de frecuencia fija; la FA tiene ondas f de frecuencia y forma irregulares.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'atrial-tachycardia',
        discriminator: l(
          '此处下壁导联没有等电位线；局灶性房速的P′之间基线平直。',
          'Here the inferior leads have no flat baseline; focal atrial tachycardia shows discrete P′ waves with a flat line between them.',
          'Aquí las inferiores no tienen línea plana; la taquicardia auricular focal muestra P′ separadas por una línea plana.',
        ),
        leads: ['II', 'III', 'aVF'],
      },
      {
        id: 'muscle-tremor',
        discriminator: l(
          '此处F波在所有导联都规则且与QRS有固定比例；震颤伪差不规则，在各肢体导联间不同。',
          'Here the F waves are regular in every lead and keep a fixed ratio to the QRS; tremor artefact is irregular and differs between limb leads.',
          'Aquí las ondas F son regulares en todas las derivaciones y mantienen una relación fija con el QRS; el artefacto por temblor es irregular y cambia entre derivaciones de los miembros.',
        ),
        leads: ['II', 'III'],
      },
    ],
    pitfalls: [
      l('漏诊150次/分的2:1房扑，因为第二个F波埋在QRS里。', 'Missing 2:1 flutter at 150/min because the second F wave is buried in the QRS.', 'Pasar por alto un flutter 2:1 a 150 lpm porque la segunda onda F está enterrada en el QRS.'),
      l(
        '把下壁正向F波的房扑都称为“非典型”：顺钟向（反向典型）房扑仍依赖峡部。',
        'Calling every flutter with positive inferior waves “atypical”: clockwise (reverse-typical) flutter is still isthmus-dependent.',
        'Llamar «atípico» a todo flutter con ondas inferiores positivas: el flutter horario (típico inverso) sigue dependiendo del istmo.',
      ),
      l('单用IC类药物减慢房扑而不加房室结阻滞药（有1:1下传风险）。', 'Slowing flutter with class IC drugs without an AV-nodal blocker (risk of 1:1 conduction).', 'Enlentecer el flutter con fármacos IC sin un bloqueante del nodo AV (riesgo de conducción 1:1).'),
    ],
    lessons: ['t3', 't1'],
    sources: [R.escSvt2019, R.saoudi2001, R.page2015],
    aka: ['flutter', 'AFL', 'aleteo auricular', '房扑'],
    exemplar: { scenarios: ['atrial-flutter'], layout: '3x4+1', lead: 'II', leads: ['II', 'III', 'aVF', 'V1'] },
  },
  {
    id: 'svt',
    definition: l(
      '机制涉及希氏束及以上组织、频率>100次/分的心动过速——在此作为尚未确定机制的规则窄QRS心动过速的工作名称。',
      'A tachycardia above 100/min whose mechanism involves tissue from the His bundle upward — here the working label for a regular narrow-QRS tachycardia before its mechanism is named.',
      'Taquicardia a más de 100 lpm cuyo mecanismo implica tejido desde el haz de His hacia arriba; aquí, la etiqueta provisional de una taquicardia regular de QRS estrecho antes de nombrar su mecanismo.',
    ),
    features: [
      l(
        '频率>100次/分，QRS窄（<120 ms），除非伴差异性传导或原有束支阻滞。',
        'Rate > 100/min with a narrow QRS (< 120 ms), unless there is aberrancy or pre-existing BBB.',
        'Frecuencia > 100 lpm con QRS estrecho (< 120 ms), salvo aberrancia o bloqueo de rama previo.',
      ),
      l(
        '先判断规则与否：不规则→房颤、多源性房速、房扑/房速伴不等比下传。',
        'Decide regular or irregular first: irregular → AF, MAT, or flutter/atrial tachycardia with variable block.',
        'Decide primero si es regular o irregular: irregular → FA, TAM, o flutter/taquicardia auricular con bloqueo variable.',
      ),
      l(
        '规则时找心房活动：无P′或P′在QRS末（V1伪r′）→典型房室结折返；P′在ST段（短RP）→顺向型房室折返；长RP→房速、非典型房室结折返、持续性交界区反复性心动过速（PJRT）、窦速。',
        'If regular, find atrial activity: no P′ or P′ at the end of the QRS (pseudo-r′ in V1) → typical AVNRT; P′ in the ST segment (short RP) → orthodromic AVRT; long RP → atrial tachycardia, atypical AVNRT, PJRT, sinus tachycardia.',
        'Si es regular, busca la actividad auricular: sin P′ o P′ al final del QRS (pseudo-r′ en V1) → TRIN típica; P′ en el ST (RP corto) → TRAV ortodrómica; RP largo → taquicardia auricular, TRIN atípica, taquicardia reciprocante permanente de la unión (TRPU), taquicardia sinusal.',
      ),
      l('P′多于QRS→房速或房扑（不依赖房室结）。', 'More P′ than QRS → atrial tachycardia or flutter (AV-node-independent).', 'Más P′ que QRS → taquicardia auricular o flutter (independientes del nodo AV).'),
      l(
        '在迷走神经刺激或腺苷时记录12导联：终止方式或暴露的心房活动可揭示机制。',
        'Record a 12-lead during vagal manoeuvres or adenosine: how it stops, or the atrial activity it unmasks, reveals the mechanism.',
        'Registra un ECG de 12 derivaciones durante las maniobras vagales o la adenosina: cómo termina, o la actividad auricular que desenmascara, revela el mecanismo.',
      ),
    ],
    criteria: [
      {
        label: l('定义', 'Definition', 'Definición'),
        value: l(
          '心房和/或心室率>100次/分，机制涉及希氏束及以上；房颤按惯例另列',
          'Atrial and/or ventricular rate > 100/min with a mechanism involving the His bundle or above; AF is conventionally excluded',
          'Frecuencia auricular y/o ventricular > 100 lpm con un mecanismo que implica el haz de His o estructuras superiores; la FA se excluye por convención',
        ),
        source: 'Brugada 2019 (ESC SVT)',
      },
      {
        label: l('RP界值', 'RP cut-off', 'Punto de corte del RP'),
        value: l(
          '可见RP′<90 ms支持房室结折返；RP′≥90 ms且<RR的一半支持房室折返',
          'A visible RP′ < 90 ms favours AVNRT; RP′ ≥ 90 ms and less than half the R–R favours AVRT',
          'Un RP′ visible < 90 ms favorece la TRIN; RP′ ≥ 90 ms y menor de la mitad del R-R favorece la TRAV',
        ),
        source: 'Brugada 2019 (ESC SVT)',
      },
      {
        label: l('宽QRS', 'Wide QRS', 'QRS ancho'),
        value: l('宽QRS心动过速在证实之前按室速处理', 'A wide-QRS tachycardia is VT until proven otherwise', 'Una taquicardia de QRS ancho es una TV mientras no se demuestre lo contrario'),
        source: 'Zeppenfeld 2022 (ESC VA/SCD)',
      },
    ],
    mechanism: l(
      '多数规则的室上性心动过速是利用房室结的折返（房室结折返、房室折返），或心房内的病灶或环路（房速、房扑）。由于心室经正常希氏-浦肯野系统激动，QRS保持狭窄，P′波相对于QRS的位置反映所用的环路。',
      'Most regular SVTs are re-entry using the AV node (AVNRT, AVRT) or a focus or circuit within the atria (atrial tachycardia, flutter). Because the ventricles are activated through the normal His–Purkinje system, the QRS stays narrow, and where the P′ falls relative to the QRS reflects which circuit is in use.',
      'La mayoría de las TSV regulares son reentradas que usan el nodo AV (TRIN, TRAV) o un foco o circuito dentro de las aurículas (taquicardia auricular, flutter). Como los ventrículos se activan por el sistema de His-Purkinje normal, el QRS es estrecho, y el lugar de la P′ respecto al QRS refleja qué circuito se usa.',
    ),
    mimics: [
      {
        id: 'sinus-tachycardia',
        discriminator: l(
          '此处突发突止、频率固定；窦速起止渐进，可见窦性P波。',
          'Here the onset is abrupt and the rate fixed; sinus tachycardia starts and stops gradually with visible sinus P waves.',
          'Aquí el inicio es brusco y la frecuencia fija; la taquicardia sinusal empieza y termina de forma gradual con P sinusales visibles.',
        ),
        leads: ['II'],
      },
      {
        id: 'atrial-flutter',
        discriminator: l(
          '约150次/分时在Ⅱ、Ⅲ、aVF、V1寻找第二个F波；有则为2:1房扑。',
          'At about 150/min search II, III, aVF and V1 for a second F wave; if present it is 2:1 flutter.',
          'A unos 150 lpm busca en II, III, aVF y V1 una segunda onda F; si está, es un flutter 2:1.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'vt-monomorphic',
        discriminator: l(
          '此处QRS<120 ms；任何宽QRS心动过速在证实之前都按室速处理。',
          'Here the QRS is < 120 ms; any wide-QRS tachycardia is treated as VT until proven otherwise.',
          'Aquí el QRS es < 120 ms; cualquier taquicardia de QRS ancho se trata como TV mientras no se demuestre lo contrario.',
        ),
        leads: ['V1', 'aVR'],
      },
    ],
    pitfalls: [
      l(
        '停留在“室上速”：应说出机制（房室结折返、房室折返、局灶性房速、房扑）——旧的笼统术语“阵发性室上速”不是诊断。',
        'Stopping at “SVT”: name the mechanism (AVNRT, AVRT, focal atrial tachycardia, flutter) — the old umbrella “PSVT” is not a diagnosis.',
        'Quedarse en «TSV»: nombra el mecanismo (TRIN, TRAV, taquicardia auricular focal, flutter); el antiguo término general «TPSV» no es un diagnóstico.',
      ),
      l('把宽QRS心动过速假定为室上速伴差异性传导而给予维拉帕米。', 'Giving verapamil to a wide-QRS tachycardia assumed to be SVT with aberrancy.', 'Dar verapamilo a una taquicardia de QRS ancho que se supone TSV con aberrancia.'),
      l('给腺苷时不记录12导联——错过了诊断时机。', 'Not recording a 12-lead during adenosine — the diagnostic moment is lost.', 'No registrar un ECG de 12 derivaciones durante la adenosina: se pierde el momento diagnóstico.'),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '评估血流动力学。稳定者先记录12导联，再在心电记录下行改良Valsalva动作或给予腺苷；不稳定者同步电复律。',
        'Check haemodynamic stability. If stable, record a 12-lead, then try a modified Valsalva manoeuvre or adenosine with the ECG running; if unstable, synchronised cardioversion.',
        'Valora la estabilidad hemodinámica. Si está estable, registra un ECG de 12 derivaciones y luego prueba una maniobra de Valsalva modificada o adenosina con el ECG en marcha; si está inestable, cardioversión sincronizada.',
      ),
    },
    lessons: ['t1'],
    sources: [R.escSvt2019, R.page2015, REF.escVa2022, R.appelboam2015],
    aka: ['SVT', 'TSV', 'PSVT', 'TPSV', 'paroxysmal supraventricular tachycardia', 'narrow complex tachycardia', '室上速'],
    exemplar: { scenarios: ['avnrt', 'avrt'], layout: '3x4+1', lead: 'II', leads: ['II', 'V1'] },
  },
  {
    id: 'avnrt',
    definition: l(
      '房室结及其周围利用慢径路和快径路的折返性心动过速；典型（慢-快型）为规则窄QRS心动过速，P′藏在QRS内或位于其末尾。',
      'Re-entry within the AV node and its approaches using a slow and a fast pathway; typical (slow–fast) AVNRT is a regular narrow-QRS tachycardia with the P′ hidden in or at the end of the QRS.',
      'Reentrada en el nodo AV y sus aledaños por una vía lenta y otra rápida; la TRIN típica (lenta-rápida) es una taquicardia regular de QRS estrecho con la P′ oculta en el QRS o al final de él.',
    ),
    features: [
      l('突发突止；规则窄QRS，多为140–220次/分。', 'Abrupt onset and offset; regular narrow QRS, usually 140–220/min.', 'Inicio y final bruscos; QRS estrecho regular, casi siempre a 140-220 lpm.'),
      l(
        'QRS前无可见P波；P′藏在QRS内或位于其末尾：V1伪r′，Ⅱ、Ⅲ、aVF伪S（与窦性心电图比较）。',
        'No visible P before the QRS; the P′ is hidden in it or at its very end: pseudo-r′ in V1, pseudo-S in II, III, aVF (compare with the sinus ECG).',
        'Sin P visible antes del QRS; la P′ está oculta en él o al final: pseudo-r′ en V1, pseudo-S en II, III, aVF (compara con el ECG sinusal).',
      ),
      l('可见时RP′<90 ms。', 'When visible, RP′ < 90 ms.', 'Cuando se ve, RP′ < 90 ms.'),
      l('非典型（快-慢型）：长RP，Ⅱ、Ⅲ、aVF的P′倒置。', 'Atypical (fast–slow): long RP with negative P′ in II, III and aVF.', 'Atípica (rápida-lenta): RP largo con P′ negativa en II, III y aVF.'),
      l('腺苷可终止；改良Valsalva动作约四成有效。', 'Adenosine terminates it; a modified Valsalva works in about four out of ten.', 'La adenosina la termina; la Valsalva modificada funciona en unos cuatro de cada diez casos.'),
    ],
    criteria: [
      {
        label: l('典型房室结折返', 'Typical AVNRT', 'TRIN típica'),
        value: l('约占90%；RP′<90 ms（P′在QRS内或末尾）', 'About 90 % of AVNRT; RP′ < 90 ms (P′ in or at the end of the QRS)', 'Alrededor del 90 % de las TRIN; RP′ < 90 ms (P′ dentro o al final del QRS)'),
        source: 'Brugada 2019 (ESC SVT)',
      },
      {
        label: l('伪r′/伪S', 'Pseudo-r′ / pseudo-S', 'Pseudo-r′ / pseudo-S'),
        value: l('特异性高（91–100%），敏感性低', 'Specific (91–100 %) but insensitive', 'Específicas (91-100 %) pero poco sensibles'),
        source: 'Brugada 2019 (ESC SVT)',
      },
      {
        label: l('迷走神经刺激', 'Vagal manoeuvres', 'Maniobras vagales'),
        value: l('改良Valsalva约43%终止（标准法17%）', 'Modified Valsalva terminates about 43 % (17 % with the standard manoeuvre)', 'La Valsalva modificada termina un 43 % (17 % con la maniobra estándar)'),
        source: 'Appelboam 2015 (REVERT)',
      },
    ],
    mechanism: l(
      '前向传导沿慢径路下传，经快径路逆传返回，心房和心室几乎同时被激动。因此逆行P′波落在QRS内或其终末，表现为终末小波（V1导联伪r′、下壁导联伪S）。',
      'Antegrade conduction goes down the slow pathway and returns up the fast pathway, so atria and ventricles are activated almost simultaneously. The retrograde P′ therefore falls inside or at the very end of the QRS, appearing as a small terminal deflection (pseudo-r′ in V1, pseudo-S inferiorly).',
      'La conducción anterógrada baja por la vía lenta y vuelve por la vía rápida, de modo que aurículas y ventrículos se activan casi a la vez. Por eso la P′ retrógrada cae dentro del QRS o justo al final, como una pequeña deflexión terminal (pseudo-r′ en V1, pseudo-S en las inferiores).',
    ),
    mimics: [
      {
        id: 'avrt',
        discriminator: l(
          '此处RP′<90 ms（P′在QRS内或末尾）；顺向型房室折返的P′明显位于ST段（RP′≥90 ms）。',
          'Here RP′ < 90 ms (P′ in or at the end of the QRS); in orthodromic AVRT the P′ sits clearly in the ST segment (RP′ ≥ 90 ms).',
          'Aquí RP′ < 90 ms (P′ dentro o al final del QRS); en la TRAV ortodrómica la P′ está claramente en el ST (RP′ ≥ 90 ms).',
        ),
        leads: ['V1', 'II'],
      },
      {
        id: 'atrial-flutter',
        discriminator: l('此处每个QRS一个心房波；2:1房扑有两个。', 'Here there is one atrial wave per QRS; 2:1 flutter has two.', 'Aquí hay una onda auricular por QRS; el flutter 2:1 tiene dos.'),
        leads: ['II', 'V1'],
      },
      {
        id: 'irbbb',
        discriminator: l(
          '此处V1的伪r′在窦性心律时消失；不完全性右束支阻滞的r′持续存在。',
          'Here the pseudo-r′ in V1 disappears in sinus rhythm; the r′ of incomplete RBBB persists.',
          'Aquí la pseudo-r′ de V1 desaparece en ritmo sinusal; la r′ del BIRD persiste.',
        ),
        leads: ['V1'],
      },
    ],
    pitfalls: [
      l('把V1伪r′误认为不完全性右束支阻滞——与窦性心电图比较。', 'Taking the pseudo-r′ in V1 for incomplete RBBB — compare with the sinus ECG.', 'Confundir la pseudo-r′ de V1 con un BIRD: compara con el ECG sinusal.'),
      l(
        '根据发作后正常的心电图诊断“LGL”或隐匿旁路；正常基线恰恰是房室结折返的典型表现。',
        'Inferring “LGL” or a hidden pathway from a normal ECG after the episode; a normal baseline is exactly what AVNRT looks like.',
        'Deducir un «LGL» o una vía oculta a partir de un ECG normal tras el episodio; un trazado basal normal es justo lo típico de la TRIN.',
      ),
    ],
    lessons: ['t1'],
    sources: [R.escSvt2019, R.page2015, R.appelboam2015],
    aka: ['AVNRT', 'TRIN', 'TRNAV', 'slow-fast', 'reentrada intranodal', '房室结折返'],
    exemplar: { scenarios: ['avnrt'], layout: '3x4+1', lead: 'II', leads: ['V1', 'II', 'III', 'aVF'] },
  },
  {
    id: 'avrt',
    definition: l(
      '利用房室结和旁路的折返性心动过速；顺向型（经房室结下传、旁路逆传）为规则窄QRS心动过速，逆行P′位于ST段。',
      'Re-entry using the AV node and an accessory pathway; orthodromic AVRT (down the node, up the pathway) is a regular narrow-QRS tachycardia with a retrograde P′ in the ST segment.',
      'Reentrada que usa el nodo AV y una vía accesoria; la TRAV ortodrómica (baja por el nodo y sube por la vía) es una taquicardia regular de QRS estrecho con P′ retrógrada en el ST.',
    ),
    features: [
      l('规则窄QRS心动过速，多为150–220次/分，突发突止。', 'Regular narrow-QRS tachycardia, typically 150–220/min, with abrupt onset and offset.', 'Taquicardia regular de QRS estrecho, típicamente a 150-220 lpm, de inicio y final bruscos.'),
      l(
        '逆行P′明显在QRS之后的ST段内：RP′恒定、≥90 ms但短于P′R（短RP）。',
        'Retrograde P′ clearly after the QRS, in the ST segment: a constant RP′ ≥ 90 ms but shorter than the P′R (short RP).',
        'P′ retrógrada claramente detrás del QRS, en el ST: RP′ constante ≥ 90 ms pero más corto que el P′R (RP corto).',
      ),
      l('常见ST段压低和QRS电交替，但不特异。', 'ST depression and QRS alternans are common but not specific.', 'El descenso del ST y la alternancia del QRS son frecuentes pero no específicos.'),
      l(
        '窦性心电图可显示预激（显性旁路，WPW综合征），也可正常（隐匿性旁路）。',
        'The sinus ECG may show pre-excitation (manifest pathway, WPW syndrome) or be normal (concealed pathway).',
        'El ECG sinusal puede mostrar preexcitación (vía manifiesta, síndrome de WPW) o ser normal (vía oculta).',
      ),
      l(
        '逆向型（经旁路下传）=宽大、完全预激的QRS，与室速无法区分——按室速处理。',
        'Antidromic AVRT (down the pathway) = wide, fully pre-excited QRS, indistinguishable from VT — manage it as VT.',
        'La TRAV antidrómica (baja por la vía) = QRS ancho y totalmente preexcitado, indistinguible de una TV: manéjala como TV.',
      ),
    ],
    criteria: [
      {
        label: l('顺向型房室折返', 'Orthodromic AVRT', 'TRAV ortodrómica'),
        value: l('RP′恒定，≥90 ms（>70 ms）且<RR的一半', 'Constant RP′, ≥ 90 ms (> 70 ms) and < half the R–R', 'RP′ constante, ≥ 90 ms (> 70 ms) y < la mitad del R-R'),
        source: 'Brugada 2019 (ESC SVT)',
      },
      {
        label: l('Coumel征', 'Coumel sign', 'Signo de Coumel'),
        value: l('与游离壁旁路同侧的功能性束支阻滞使心动过速减慢——证实房室折返', 'Functional BBB on the same side as a free-wall pathway slows the tachycardia — proof of AVRT', 'Un bloqueo de rama funcional del mismo lado que una vía de pared libre enlentece la taquicardia: prueba de TRAV'),
        source: 'Brugada 2019 (ESC SVT)',
      },
      {
        label: l('逆向型房室折返', 'Antidromic AVRT', 'TRAV antidrómica'),
        value: l(
          '规则、完全预激的宽QRS；支持室速：V4–V6以负向为主、V2–V6出现QR、房室分离',
          'Regular, fully pre-excited wide QRS; favours VT: mainly negative V4–V6, QR in V2–V6, AV dissociation',
          'QRS ancho regular totalmente preexcitado; favorecen la TV: QRS predominantemente negativo en V4-V6, QR en V2-V6, disociación AV',
        ),
        source: 'Steurer 1994; Brugada 2019',
      },
    ],
    mechanism: l(
      '冲动沿房室结和希氏-浦肯野系统下传，正常激动心室，然后经旁路逆传回心房。由于心室必须先被激动旁路才能逆传，逆行P′波总是与QRS之间隔着一段固定间期。',
      'The impulse travels down the AV node and His–Purkinje system, activates the ventricles normally and then returns to the atria through the accessory pathway. Because the ventricle has to be activated before the pathway can conduct back, the retrograde P′ is always separated from the QRS by a fixed interval.',
      'El impulso baja por el nodo AV y el sistema de His-Purkinje, activa los ventrículos con normalidad y vuelve a las aurículas por la vía accesoria. Como el ventrículo tiene que activarse antes de que la vía pueda conducir hacia atrás, la P′ retrógrada siempre queda separada del QRS por un intervalo fijo.',
    ),
    mimics: [
      {
        id: 'avnrt',
        discriminator: l(
          '此处P′位于ST段，RP′≥90 ms；房室结折返的P′藏在QRS内或其末尾。',
          'Here the P′ is in the ST segment with RP′ ≥ 90 ms; in AVNRT the P′ hides in or at the end of the QRS.',
          'Aquí la P′ está en el ST con RP′ ≥ 90 ms; en la TRIN la P′ se esconde dentro o al final del QRS.',
        ),
        leads: ['V1', 'II', 'III', 'aVF'],
      },
      {
        id: 'atrial-tachycardia',
        discriminator: l(
          '此处房室阻滞会终止心动过速；房速可伴房室阻滞继续，P′在QRS之前（长RP）。',
          'Here AV block ends the tachycardia; atrial tachycardia continues with AV block and its P′ comes before the QRS (long RP).',
          'Aquí el bloqueo AV termina la taquicardia; la taquicardia auricular sigue con bloqueo AV y su P′ precede al QRS (RP largo).',
        ),
        leads: ['II'],
      },
      {
        id: 'vt-monomorphic',
        discriminator: l(
          '逆向型房室折返与室速相似；除非已知WPW且窦性预激QRS形态相同，否则按室速处理。',
          'Antidromic AVRT looks like VT; unless WPW is known and the sinus pre-excited QRS looks the same, treat it as VT.',
          'La TRAV antidrómica se parece a una TV; salvo que se conozca un WPW con el mismo QRS preexcitado en ritmo sinusal, trátala como TV.',
        ),
        leads: ['V1', 'V4', 'V5', 'V6'],
      },
    ],
    pitfalls: [
      l('以为窦性心电图正常就能排除旁路——隐匿性旁路静息时看不见。', 'Assuming a normal sinus ECG excludes a pathway — concealed pathways are invisible at rest.', 'Suponer que un ECG sinusal normal descarta una vía: las vías ocultas no se ven en reposo.'),
      l('把逆向型房室折返当作室上速伴差异性传导而给予维拉帕米。', 'Treating antidromic AVRT as SVT with aberrancy and giving verapamil.', 'Tratar una TRAV antidrómica como TSV con aberrancia y dar verapamilo.'),
    ],
    lessons: ['t1', 't4'],
    sources: [R.escSvt2019, R.page2015, R.steurer1994],
    aka: ['AVRT', 'TRAV', 'orthodromic', 'antidromic', 'ortodrómica', 'antidrómica', 'WPW syndrome', '房室折返'],
    exemplar: { scenarios: ['avrt'], layout: '3x4+1', lead: 'II', leads: ['II', 'V1', 'III', 'aVF'] },
  },
  // ── ventricular tachyarrhythmias and arrest rhythms ──────────────────────────────────────────────────────────────
  {
    id: 'vt-monomorphic',
    definition: l(
      '连续3个或以上、频率>100次/分、QRS形态单一稳定的宽QRS室性搏动。',
      'Three or more consecutive ventricular beats at > 100/min with a single, stable wide-QRS morphology.',
      'Tres o más latidos ventriculares seguidos a > 100 lpm con una única morfología de QRS ancho y estable.',
    ),
    features: [
      l('规则宽QRS心动过速（QRS多≥120 ms），多为120–250次/分。', 'Regular wide-QRS tachycardia (QRS usually ≥ 120 ms), typically 120–250/min.', 'Taquicardia regular de QRS ancho (QRS casi siempre ≥ 120 ms), típicamente a 120-250 lpm.'),
      l(
        '安全原则：任何宽QRS心动过速在证实之前都是室速——尤其是有心梗史或结构性心脏病时。',
        'Safety rule: any wide-QRS tachycardia is VT until proven otherwise — especially with prior MI or structural heart disease.',
        'Regla de seguridad: toda taquicardia de QRS ancho es una TV mientras no se demuestre lo contrario, sobre todo con infarto previo o cardiopatía estructural.',
      ),
      l(
        '室速的证据：房室分离（P波独立穿行）、心室夺获（窄QRS）和室性融合波（介于两者之间）。',
        'Proof of VT: AV dissociation (P waves marching independently), capture beats (narrow) and fusion beats (intermediate).',
        'Prueba de TV: disociación AV (ondas P que avanzan independientes), latidos de captura (estrechos) y de fusión (intermedios).',
      ),
      l(
        '支持点：胸导联同向性、V1–V6均无RS或R至S>100 ms、aVR起始R波（或r/q>40 ms）、极度电轴、QRS>140 ms（右束支阻滞型）或>160 ms（左束支阻滞型）。',
        'Supporting signs: precordial concordance, no RS in V1–V6 or R-to-S > 100 ms, an initial R (or r/q > 40 ms) in aVR, extreme axis, QRS > 140 ms (RBBB-like) or > 160 ms (LBBB-like).',
        'Datos a favor: concordancia precordial, ausencia de RS en V1-V6 o R-S > 100 ms, R inicial (o r/q > 40 ms) en aVR, eje extremo, QRS > 140 ms (tipo BRD) o > 160 ms (tipo BRI).',
      ),
      l('非持续性：<30 s自行终止；持续性：>30 s或需提前终止。', 'Non-sustained: < 30 s and self-terminating; sustained: > 30 s or needing earlier termination.', 'No sostenida: < 30 s y autolimitada; sostenida: > 30 s o que exige terminarla antes.'),
    ],
    criteria: [
      {
        label: l('室性心动过速', 'Ventricular tachycardia', 'Taquicardia ventricular'),
        value: l(
          '≥3个连续室性搏动，>100次/分（周期<600 ms）；持续性：>30 s或血流动力学障碍',
          '≥ 3 consecutive ventricular beats > 100/min (cycle < 600 ms); sustained: > 30 s or haemodynamic compromise',
          '≥ 3 latidos ventriculares seguidos > 100 lpm (ciclo < 600 ms); sostenida: > 30 s o compromiso hemodinámico',
        ),
        source: 'Al-Khatib 2017; Zeppenfeld 2022',
      },
      {
        label: l('Brugada流程', 'Brugada algorithm', 'Algoritmo de Brugada'),
        value: l(
          'V1–V6均无RS；任一胸导联RS>100 ms；房室分离；V1–V2和V6符合室速形态',
          'No RS in V1–V6; RS > 100 ms in any precordial lead; AV dissociation; VT morphology in V1–V2 and V6',
          'Sin RS en V1-V6; RS > 100 ms en alguna precordial; disociación AV; morfología de TV en V1-V2 y V6',
        ),
        source: 'Brugada 1991',
      },
      {
        label: l('aVR流程（Vereckei）', 'aVR algorithm (Vereckei)', 'Algoritmo de aVR (Vereckei)'),
        value: l('起始R波；起始r或q>40 ms；负向QRS下降支有切迹；vi/vt≤1', 'Initial R; initial r or q > 40 ms; notch on the descending limb of a negative QRS; vi/vt ≤ 1', 'R inicial; r o q inicial > 40 ms; muesca en la rama descendente de un QRS negativo; vi/vt ≤ 1'),
        source: 'Vereckei 2008',
      },
      {
        label: l('Ⅱ导联', 'Lead II', 'Derivación II'),
        value: l('R峰时间≥50 ms支持室速', 'R-wave peak time ≥ 50 ms favours VT', 'Un tiempo de pico de la R ≥ 50 ms favorece la TV'),
        source: 'Pava 2010',
      },
      {
        label: l('形态', 'Morphology', 'Morfología'),
        value: l('QRS>140 ms（右束支阻滞型）或>160 ms（左束支阻滞型）；“无人区”电轴', 'QRS > 140 ms (RBBB-like) or > 160 ms (LBBB-like); northwest axis', 'QRS > 140 ms (tipo BRD) o > 160 ms (tipo BRI); eje en «tierra de nadie»'),
        source: 'Wellens 1978',
      },
    ],
    mechanism: l(
      '瘢痕周围的折返环路（最常见为陈旧性心肌梗死）或快速发放的心室异位灶从心肌内部激动心室，绕过快速的希氏-浦肯野系统。因此QRS宽大且逐搏相同，心房通常仍以自身较慢的频率独立活动。',
      'A re-entry circuit around scar (most often an old infarct) or a rapidly firing ventricular focus activates the ventricles from inside the muscle, bypassing the fast His–Purkinje system. The QRS is therefore wide and identical beat to beat, and the atria usually carry on independently at their own slower rate.',
      'Un circuito de reentrada alrededor de una cicatriz (casi siempre un infarto antiguo) o un foco ventricular que dispara rápido activa los ventrículos desde dentro del músculo, sin pasar por el sistema rápido de His-Purkinje. Por eso el QRS es ancho e igual latido a latido, y las aurículas suelen seguir de forma independiente a su propia frecuencia, más lenta.',
    ),
    mimics: [
      {
        id: 'aberrant-conduction',
        discriminator: l(
          '此处有房室分离、融合/夺获、同向性或aVR起始R波；差异性传导呈典型右/左束支阻滞形态，与已知束支阻滞相同。',
          'Here there is AV dissociation, fusion/capture, concordance or an initial R in aVR; aberrancy shows a typical RBBB or LBBB shape identical to the known block.',
          'Aquí hay disociación AV, fusión/captura, concordancia o R inicial en aVR; la aberrancia muestra un BRD o BRI típico idéntico al bloqueo conocido.',
        ),
        leads: ['V1', 'V6', 'aVR'],
      },
      {
        id: 'avrt',
        discriminator: l(
          '预激性心动过速（逆向型）：窦性心电图有相同的预激QRS；否则按室速处理。',
          'Pre-excited (antidromic) tachycardia: the sinus ECG shows the same pre-excited QRS; otherwise manage it as VT.',
          'Taquicardia preexcitada (antidrómica): el ECG sinusal muestra el mismo QRS preexcitado; si no, manéjala como TV.',
        ),
        leads: ['V4', 'V5', 'V6'],
      },
      {
        id: 'hyperkalemia',
        discriminator: l(
          '高钾血症：QRS极宽呈正弦波样，伴T波高尖、P波低平，频率常不快——立即查血钾。',
          'Hyperkalaemia: very wide, sine-like QRS with peaked T waves and flat P waves, often at a modest rate — check potassium now.',
          'Hiperpotasemia: QRS muy ancho y sinusoidal con T picudas y P aplanadas, a menudo a frecuencia moderada: determina ya el potasio.',
        ),
        leads: ['II', 'V2'],
      },
      {
        id: 'paced-rhythm',
        discriminator: l('起搏心律：每个QRS前有刺激信号，频率等于设定频率。', 'Paced rhythm: a spike before every QRS, at the programmed rate.', 'Ritmo de marcapasos: una espiga antes de cada QRS, a la frecuencia programada.'),
        leads: ['V1', 'II'],
      },
      {
        id: 'muscle-tremor',
        discriminator: l(
          '伪差：在伪差中可见窄QRS按原频率穿行，患者状况与“室速”不符。',
          'Artefact: narrow QRS complexes march through it at the underlying rate, and the patient does not look like VT.',
          'Artefacto: QRS estrechos lo atraviesan a la frecuencia de base y el paciente no parece estar en TV.',
        ),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l(
        '因患者看起来状况良好而称稳定的宽QRS心动过速为室上速伴差异性传导——血流动力学稳定不能排除室速。',
        'Calling a stable wide-QRS tachycardia “SVT with aberrancy” because the patient looks well — stability does not exclude VT.',
        'Llamar «TSV con aberrancia» a una taquicardia de QRS ancho estable porque el paciente tiene buen aspecto: la estabilidad no descarta una TV.',
      ),
      l('给不明原因的宽QRS心动过速使用维拉帕米或地尔硫䓬。', 'Giving verapamil or diltiazem to a wide-QRS tachycardia of unknown origin.', 'Dar verapamilo o diltiazem a una taquicardia de QRS ancho de origen desconocido.'),
      l('对不稳定患者花几分钟套用诊断流程。', 'Spending minutes on algorithms in an unstable patient.', 'Perder minutos con algoritmos en un paciente inestable.'),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '立即检查脉搏和灌注。无脉：开始心肺复苏并除颤。有脉但不稳定：同步电复律。稳定：记录12导联，在证实之前按室速处理（禁用维拉帕米）。',
        'Check pulse and perfusion now. Pulseless: start CPR and defibrillate. Unstable with a pulse: synchronised cardioversion. Stable: record a 12-lead and treat as VT until proven otherwise (no verapamil).',
        'Comprueba ya el pulso y la perfusión. Sin pulso: inicia RCP y desfibrila. Inestable con pulso: cardioversión sincronizada. Estable: registra un ECG de 12 derivaciones y trátala como TV mientras no se demuestre lo contrario (sin verapamilo).',
      ),
    },
    lessons: ['t5', 't7'],
    sources: [R.alKhatib2017, REF.escVa2022, R.brugada1991, R.vereckei2008, R.pava2010, R.wellens1978, R.escSvt2019],
    aka: ['VT', 'TV', 'NSVT', 'TVNS', 'wide complex tachycardia', 'WCT', 'taquicardia de QRS ancho', '室速', '宽QRS心动过速'],
    exemplar: { scenarios: ['vt-monomorphic'], layout: '3x4+1', lead: 'II', leads: ['V1', 'V6', 'aVR', 'II'] },
  },
  {
    id: 'vt-polymorphic',
    definition: l(
      'QRS形态逐搏持续变化的室性心动过速；QT正常时多由急性缺血引起。',
      'Ventricular tachycardia whose QRS shape changes continuously from beat to beat; when the QT is normal it is usually caused by acute ischaemia.',
      'Taquicardia ventricular cuyo QRS cambia de forma de un latido a otro; cuando el QT es normal suele deberse a isquemia aguda.',
    ),
    features: [
      l('快速（多为150–300次/分）、不规则的宽QRS心动过速，形态和电轴逐搏变化。', 'Fast (usually 150–300/min), irregular wide-QRS tachycardia whose shape and axis change beat to beat.', 'Taquicardia rápida (casi siempre 150-300 lpm) e irregular de QRS ancho cuya forma y eje cambian latido a latido.'),
      l(
        '测量发作前窦性搏动的QT：QT长→尖端扭转；QT正常→缺血、儿茶酚胺敏感性多形性室速、短联律间期特发性室颤。',
        'Measure the QT on the sinus beats before the episode: long QT → torsades; normal QT → ischaemia, CPVT, short-coupled idiopathic VF.',
        'Mide el QT de los latidos sinusales previos: QT largo → torsade de pointes; QT normal → isquemia, TVPC, FV idiopática de acoplamiento corto.',
      ),
      l('常恶化为室颤；多有血流动力学不稳定。', 'Often degenerates into VF; usually haemodynamically unstable.', 'Suele degenerar en FV; casi siempre hay inestabilidad hemodinámica.'),
      l('双向性室速（电轴交替）提示地高辛中毒或儿茶酚胺敏感性多形性室速。', 'Bidirectional VT (alternating axis) points to digoxin toxicity or CPVT.', 'La TV bidireccional (eje alternante) orienta a intoxicación digitálica o TVPC.'),
    ],
    criteria: [
      {
        label: l('多形性室速', 'Polymorphic VT', 'TV polimorfa'),
        value: l('QRS形态变化或多形，周期<600 ms', 'Changing or multiform QRS morphology at a cycle length < 600 ms', 'Morfología del QRS cambiante o multiforme con ciclo < 600 ms'),
        source: 'Al-Khatib 2017 (AHA/ACC/HRS VA/SCD)',
      },
      {
        label: l('QT正常的多形性室速', 'Normal-QT polymorphic VT', 'TV polimorfa con QT normal'),
        value: l('考虑急性缺血：血运重建，而不是镁剂/起搏', 'Think acute ischaemia: revascularisation, not magnesium or pacing', 'Piensa en isquemia aguda: revascularización, no magnesio ni estimulación'),
        source: 'Zeppenfeld 2022; Drew 2010',
      },
      {
        label: l('电风暴', 'Electrical storm', 'Tormenta eléctrica'),
        value: l('24小时内≥3次持续性室速/室颤（或ICD恰当治疗）', '≥ 3 episodes of sustained VT/VF (or appropriate ICD therapies) within 24 h', '≥ 3 episodios de TV/FV sostenida (o terapias apropiadas del DAI) en 24 h'),
        source: 'Zeppenfeld 2022 (ESC VA/SCD)',
      },
    ],
    mechanism: l(
      '在缺血或遗传异常心肌中，激动波漂移、破裂的功能性折返不断改变心室激动的路径。因此每个搏动的除极方向和时间都不相同，QRS形态持续变化。',
      'Functional re-entry with wavefronts that wander and break, often in ischaemic or genetically abnormal myocardium, keeps changing the path of ventricular activation. Each beat therefore has a different direction and duration of depolarization, which is why the QRS shape keeps changing.',
      'Una reentrada funcional con frentes de onda que se desplazan y se rompen, a menudo en miocardio isquémico o genéticamente anómalo, cambia sin parar el camino de la activación ventricular. Por eso cada latido tiene una dirección y una duración de despolarización distintas y la forma del QRS no deja de cambiar.',
    ),
    mimics: [
      {
        id: 'torsades',
        discriminator: l(
          '此处发作前QT正常；尖端扭转发生于QT显著延长，振幅呈扭转样变化，常由长短周期诱发。',
          'Here the QT before the episode is normal; torsades arises on a markedly long QT, with twisting amplitude and a pause-dependent onset.',
          'Aquí el QT previo es normal; la torsade de pointes surge con un QT muy largo, con amplitud que se retuerce e inicio dependiente de pausa.',
        ),
        leads: ['II', 'V3'],
      },
      {
        id: 'ventricular-fibrillation',
        discriminator: l('此处仍可辨认（虽在变化的）QRS波；室颤没有可分辨的QRS。', 'Here QRS complexes, though changing, can still be identified; VF has no discrete complexes.', 'Aquí aún se reconocen QRS, aunque cambien; la FV no tiene complejos definidos.'),
        leads: ['II'],
      },
      {
        id: 'wpw',
        discriminator: l(
          '预激伴房颤也快速、不规则、宽且形态多变，但每个QRS都是含delta波的融合波，频率可超过250次/分——禁用房室结阻滞药。',
          'Pre-excited AF is also fast, irregular, broad and changing, but every QRS is a fusion with a delta wave and the rate can exceed 250/min — no AV-nodal blockers.',
          'La FA preexcitada también es rápida, irregular, ancha y cambiante, pero cada QRS es una fusión con onda delta y la frecuencia puede superar 250 lpm: sin bloqueantes del nodo AV.',
        ),
        leads: ['V1', 'II'],
      },
    ],
    pitfalls: [
      l('对QT正常的多形性室速给予镁剂和起搏，而不去寻找缺血。', 'Giving magnesium and pacing for polymorphic VT with a normal QT instead of looking for ischaemia.', 'Dar magnesio y estimulación en una TV polimorfa con QT normal en lugar de buscar isquemia.'),
      l(
        '漏认伪差（刷牙、震颤）——寻找按时穿行的正常QRS。',
        'Missing artefact (tooth-brushing, tremor) — look for normal QRS complexes marching through on time.',
        'No reconocer un artefacto (cepillado de dientes, temblor): busca QRS normales que siguen apareciendo a su hora.',
      ),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '无脉者立即开始心肺复苏并非同步除颤。恢复节律后测量窦性搏动的QT：QT正常→紧急冠状动脉造影；QT延长→按尖端扭转处理。',
        'If pulseless, start CPR and defibrillate (unsynchronised). Once a rhythm returns, measure the QT of the sinus beats: normal QT → urgent coronary angiography; long QT → manage as torsades.',
        'Si no hay pulso, inicia RCP y desfibrila (no sincronizado). Cuando vuelva un ritmo, mide el QT de los latidos sinusales: QT normal → coronariografía urgente; QT largo → manejo como torsade de pointes.',
      ),
    },
    lessons: ['t6', 't7'],
    sources: [R.alKhatib2017, REF.escVa2022, REF.drew2010, R.soar2021],
    aka: ['PVT', 'polymorphic VT', 'TV polimórfica', 'bidirectional VT', 'TV bidireccional', '多形性室速'],
    exemplar: { scenarios: ['vt-polymorphic'], layout: '3x4+1', lead: 'II', leads: ['II', 'V1'] },
  },
  {
    id: 'torsades',
    definition: l(
      '发生于QT延长基础上的多形性室速，QRS振幅和极性每5–20个搏动围绕基线扭转一次。',
      'Polymorphic VT occurring with a prolonged QT, whose QRS amplitude and polarity twist around the baseline every 5–20 beats.',
      'TV polimorfa que aparece con un QT prolongado, cuyo QRS cambia de amplitud y polaridad girando alrededor de la línea de base cada 5-20 latidos.',
    ),
    features: [
      l('约160–250次/分的宽QRS，电轴和振幅围绕等电位线旋转（“扭转”）。', 'Wide QRS at about 160–250/min whose axis and amplitude rotate around the isoelectric line (“twisting”).', 'QRS ancho a unos 160-250 lpm cuyo eje y amplitud giran alrededor de la línea isoeléctrica («torsión»).'),
      l(
        '发作前的窦性搏动QT延长（QTc常>500 ms），T-U波变形。',
        'The sinus beats before the episode show a long QT (QTc often > 500 ms) and distorted T–U waves.',
        'Los latidos sinusales previos muestran un QT largo (QTc a menudo > 500 ms) y ondas T-U deformadas.',
      ),
      l(
        '长间歇依赖性发作：短-长-短RR序列，室早落在长间歇后搏动的T/U波上。',
        'Pause-dependent onset: a short–long–short R–R sequence, with the PVC landing on the T/U wave of the post-pause beat.',
        'Inicio dependiente de pausa: secuencia R-R corto-largo-corto, con la extrasístole cayendo sobre la T/U del latido posterior a la pausa.',
      ),
      l('常自行终止（反复晕厥），但可恶化为室颤。', 'Often self-terminating (recurrent syncope) but can degenerate into VF.', 'Suele autolimitarse (síncopes de repetición), pero puede degenerar en FV.'),
    ],
    criteria: [
      {
        label: l('高危QT', 'High-risk QT', 'QT de alto riesgo'),
        value: l('QTc>500 ms，或用QT延长药物后增加>60 ms', 'QTc > 500 ms, or a rise > 60 ms on a QT-prolonging drug', 'QTc > 500 ms, o un aumento > 60 ms con un fármaco que alarga el QT'),
        source: 'Drew 2010 (AHA/ACCF)',
      },
      {
        label: l('频率与形态', 'Rate and pattern', 'Frecuencia y patrón'),
        value: l('约160–250次/分，每5–20个搏动扭转一次', 'About 160–250/min, a twisting cycle every 5–20 beats', 'Unos 160-250 lpm, un ciclo de torsión cada 5-20 latidos'),
        source: 'Drew 2010; Zeppenfeld 2022',
      },
      {
        label: l('先天性长QT综合征', 'Congenital long QT syndrome', 'Síndrome de QT largo congénito'),
        value: l('多次心电图QTc≥480 ms，或LQTS评分>3', 'QTc ≥ 480 ms on repeated ECGs, or LQTS score > 3', 'QTc ≥ 480 ms en ECG repetidos, o puntuación de SQTL > 3'),
        source: 'Zeppenfeld 2022 (ESC VA/SCD)',
      },
    ],
    mechanism: l(
      '复极延长且不均一，使早期后除极触发期前搏动，并在恢复时间不同的区域之间折返。折返环在心室内漂移，QRS主轴随之旋转，振幅忽大忽小，形如扭转的丝带。',
      'Prolonged and uneven repolarization lets early afterdepolarizations trigger a premature beat, which then re-enters through regions that recovered at different times. The re-entry drifts around the ventricles, so the main QRS axis rotates and the amplitude waxes and wanes like a twisted ribbon.',
      'Una repolarización prolongada y desigual permite que las pospotenciales precoces desencadenen un latido prematuro, que luego reentra por zonas que se han recuperado en momentos distintos. La reentrada se desplaza por los ventrículos, de modo que el eje principal del QRS gira y la amplitud crece y decrece como una cinta retorcida.',
    ),
    mimics: [
      {
        id: 'vt-polymorphic',
        discriminator: l(
          '此处QT延长且发作依赖长间歇；QT正常的多形性室速通常为缺血性。',
          'Here the QT is long and the onset pause-dependent; polymorphic VT with a normal QT is usually ischaemic.',
          'Aquí el QT es largo y el inicio depende de una pausa; la TV polimorfa con QT normal suele ser isquémica.',
        ),
        leads: ['II'],
      },
      {
        id: 'ventricular-fibrillation',
        discriminator: l('此处为有序的扭转样波群；室颤完全紊乱。', 'Here the complexes twist in an organised way; VF is completely chaotic.', 'Aquí los complejos giran de forma organizada; la FV es completamente caótica.'),
        leads: ['II'],
      },
      {
        id: 'muscle-tremor',
        discriminator: l(
          '伪差：可见窄QRS以原频率穿行，患者清醒，与心律不符。',
          'Artefact: narrow QRS complexes march through at the original rate, and the patient is awake, which does not fit the rhythm.',
          'Artefacto: QRS estrechos lo atraviesan a la frecuencia original y el paciente está despierto, lo que no encaja con el ritmo.',
        ),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l('用胺碘酮或其他延长QT的药物治疗尖端扭转。', 'Treating torsades with amiodarone or other QT-prolonging drugs.', 'Tratar una torsade de pointes con amiodarona u otros fármacos que alargan el QT.'),
      l('不测量发作前搏动的QT。', 'Not measuring the QT on the beats before the episode.', 'No medir el QT de los latidos previos al episodio.'),
      l('忘记血钾、血镁和用药清单。', 'Forgetting potassium, magnesium and the drug list.', 'Olvidar el potasio, el magnesio y la lista de fármacos.'),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '持续或无脉时除颤。随后静脉给予镁剂，停用所有延长QT的药物，纠正血钾（至正常高值），并防止长间歇（心动过缓时临时起搏或异丙肾上腺素）。',
        'If sustained or pulseless, defibrillate. Then give IV magnesium, stop every QT-prolonging drug, correct potassium to high-normal and prevent pauses (temporary pacing or isoprenaline if bradycardic).',
        'Si es sostenida o sin pulso, desfibrila. Después da magnesio intravenoso, suspende todos los fármacos que alargan el QT, corrige el potasio hasta valores normales altos y evita las pausas (marcapasos temporal o isoprenalina si hay bradicardia).',
      ),
    },
    lessons: ['t6', 'h7'],
    sources: [REF.drew2010, REF.escVa2022, R.alKhatib2017, REF.rautaharju2009],
    aka: ['TdP', 'torsade de pointes', 'torsade', '尖端扭转'],
    exemplar: { scenarios: ['torsades'], layout: '3x4+1', lead: 'II', leads: ['II', 'V2', 'V3'] },
  },
  {
    id: 'ventricular-flutter',
    definition: l(
      '极快（约300次/分）、规则的正弦波样心室节律，QRS与T波无法分开。',
      'A very fast (about 300/min), regular, sine-wave ventricular rhythm in which QRS and T cannot be told apart.',
      'Ritmo ventricular muy rápido (unos 300 lpm), regular y sinusoidal en el que no se distinguen el QRS y la T.',
    ),
    features: [
      l('规则、单形的正弦波，约250–350次/分，无等电位间期。', 'Regular, monomorphic sine wave at about 250–350/min with no isoelectric interval.', 'Onda sinusoidal regular y monomorfa a unos 250-350 lpm sin intervalo isoeléctrico.'),
      l('无法分出QRS、ST或T。', 'No separable QRS, ST or T.', 'No se pueden separar QRS, ST ni T.'),
      l('多为无脉或即将无脉；常恶化为室颤。', 'Usually pulseless or about to be; often degenerates into VF.', 'Suele cursar sin pulso o estar a punto; a menudo degenera en FV.'),
    ],
    criteria: [
      {
        label: l('心室扑动', 'Ventricular flutter', 'Flutter ventricular'),
        value: l('规则（周期变异≲30 ms），约300次/分（周期约200 ms），无等电位间期', 'Regular (cycle variation ≲ 30 ms), about 300/min (cycle about 200 ms), no isoelectric interval', 'Regular (variación del ciclo ≲ 30 ms), unos 300 lpm (ciclo de unos 200 ms), sin intervalo isoeléctrico'),
        source: 'Zipes 2006 (ACC/AHA/ESC)',
      },
    ],
    mechanism: l(
      '一个极快的折返环路每秒约激动心室5次，除极和复极融合成一个连续波形。心室在两次搏动之间几乎无法充盈，因此心排血量骤降，并很快转为心室颤动。',
      'A single very fast re-entrant circuit activates the ventricles about five times a second, so depolarization and repolarization merge into one continuous wave. The ventricles barely fill between beats, which is why output collapses and the rhythm soon breaks up into fibrillation.',
      'Un único circuito de reentrada muy rápido activa los ventrículos unas cinco veces por segundo, de modo que la despolarización y la repolarización se funden en una onda continua. Los ventrículos apenas se llenan entre latidos, por eso el gasto se desploma y el ritmo pronto se rompe en fibrilación.',
    ),
    mimics: [
      {
        id: 'vt-monomorphic',
        discriminator: l('此处分不出QRS和T；单形性室速频率较慢，可辨认QRS和T。', 'Here QRS and T cannot be separated; monomorphic VT is slower with a recognisable QRS and T.', 'Aquí no se separan QRS y T; la TV monomorfa es más lenta y tiene QRS y T reconocibles.'),
        leads: ['II'],
      },
      {
        id: 'ventricular-fibrillation',
        discriminator: l('此处波形规则且相同；室颤紊乱，振幅和形态不断变化。', 'Here the waves are regular and identical; VF is chaotic with ever-changing amplitude and shape.', 'Aquí las ondas son regulares e idénticas; la FV es caótica, con amplitud y forma siempre cambiantes.'),
        leads: ['II'],
      },
      {
        id: 'hyperkalemia',
        discriminator: l(
          '严重高钾血症的正弦波通常更慢（常<150次/分），且有相应临床背景（肾衰竭、药物）。',
          'The sine wave of severe hyperkalaemia is usually slower (often < 150/min) and comes with a fitting context (renal failure, drugs).',
          'La onda sinusoidal de la hiperpotasemia grave suele ser más lenta (a menudo < 150 lpm) y aparece en un contexto compatible (insuficiencia renal, fármacos).',
        ),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l('把它称为“快速室速”而延误无脉患者的除颤。', 'Calling it “fast VT” and delaying defibrillation in a pulseless patient.', 'Llamarlo «TV rápida» y retrasar la desfibrilación en un paciente sin pulso.'),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '检查脉搏。无脉：按室颤开始心肺复苏并除颤。有脉但不稳定：立即同步电复律。',
        'Check for a pulse. Pulseless: start CPR and defibrillate as for VF. With a pulse but unstable: immediate synchronised cardioversion.',
        'Comprueba el pulso. Sin pulso: inicia RCP y desfibrila como en la FV. Con pulso pero inestable: cardioversión sincronizada inmediata.',
      ),
    },
    lessons: ['t6', 't7'],
    sources: [R.zipes2006, REF.escVa2022, R.soar2021],
    aka: ['VFL', 'flutter ventricular', '室扑'],
    exemplar: { scenarios: ['ventricular-flutter'], layout: '3x4+1', lead: 'II', leads: ['II'] },
  },
  {
    id: 'ventricular-fibrillation',
    definition: l(
      '紊乱、不规则的心室电活动，无可辨认的QRS波，也无心排血量。',
      'Chaotic, irregular ventricular electrical activity with no identifiable QRS complexes and no cardiac output.',
      'Actividad eléctrica ventricular caótica e irregular, sin complejos QRS identificables y sin gasto cardiaco.',
    ),
    features: [
      l('振幅、形态和频率（多>300次/分）不断变化的不规则波动；无QRS、ST或T。', 'Irregular undulations of varying amplitude, shape and rate (usually > 300/min); no QRS, ST or T.', 'Ondulaciones irregulares de amplitud, forma y frecuencia variables (casi siempre > 300 por minuto); sin QRS, ST ni T.'),
      l('粗颤（波幅大）或细颤（波幅小）——细颤可酷似心室停搏。', 'Coarse VF (larger waves) or fine VF (small waves) — fine VF can look like asystole.', 'FV gruesa (ondas grandes) o fina (ondas pequeñas); la FV fina puede parecer una asistolia.'),
      l('患者无脉、意识丧失：如果患者在说话，那就是伪差。', 'The patient is pulseless and unconscious: if the patient is talking, it is artefact.', 'El paciente está sin pulso e inconsciente: si habla, es un artefacto.'),
    ],
    criteria: [
      {
        label: l('心室颤动', 'Ventricular fibrillation', 'Fibrilación ventricular'),
        value: l('快速（多>300次/分，周期≤180 ms）、极不规则，形态和振幅不断变化', 'Rapid (usually > 300/min, cycle ≤ 180 ms), grossly irregular, varying morphology and amplitude', 'Rápida (casi siempre > 300 por minuto, ciclo ≤ 180 ms), muy irregular, con morfología y amplitud variables'),
        source: 'Zipes 2006 (ACC/AHA/ESC)',
      },
      {
        label: l('细颤与心室停搏', 'Fine VF versus asystole', 'FV fina frente a asistolia'),
        value: l('判定停搏前检查≥2个导联、增益和导线连接', 'Check ≥ 2 leads, the gain and the connections before calling asystole', 'Comprueba ≥ 2 derivaciones, la ganancia y las conexiones antes de diagnosticar asistolia'),
        source: 'Soar 2021 (ERC ALS)',
      },
    ],
    mechanism: l(
      '大量折返子波破裂并在心室内漂移，小块心肌各自独立除极，心肌只是颤动而不收缩。由于没有协调的激动，心电图只见紊乱的波形，心脏不能泵血。',
      'Many re-entrant wavelets break up and wander through the ventricles, so small regions depolarize independently and the muscle quivers without contracting. With no coordinated activation the ECG shows only chaotic waves and the heart pumps no blood.',
      'Muchas pequeñas ondas de reentrada se rompen y vagan por los ventrículos, de modo que pequeñas regiones se despolarizan de forma independiente y el músculo tiembla sin contraerse. Sin activación coordinada el ECG solo muestra ondas caóticas y el corazón no bombea sangre.',
    ),
    mimics: [
      {
        id: 'muscle-tremor',
        discriminator: l('伪差见于清醒患者，其他导联可见QRS。', 'Artefact occurs in a conscious patient and QRS complexes show in other leads.', 'El artefacto aparece en un paciente consciente y en otras derivaciones se ven QRS.'),
        leads: ['II', 'V1'],
      },
      {
        id: 'asystole',
        discriminator: l(
          '细颤有低幅波动；心室停搏在足够增益下两个导联均为直线。',
          'Fine VF has low-amplitude undulations; asystole is flat in two leads at adequate gain.',
          'La FV fina tiene ondulaciones de baja amplitud; la asistolia es plana en dos derivaciones con ganancia adecuada.',
        ),
        leads: ['II'],
      },
      {
        id: 'vt-polymorphic',
        discriminator: l('多形性室速仍有可分辨的QRS波；室颤没有。', 'Polymorphic VT still has discrete QRS complexes; VF has none.', 'La TV polimorfa aún tiene QRS definidos; la FV no.'),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l('把细颤称为“心室停搏”而不除颤。', 'Calling fine VF “asystole” and not defibrillating.', 'Llamar «asistolia» a una FV fina y no desfibrilar.'),
      l('不看患者就对伪差除颤。', 'Defibrillating artefact without looking at the patient.', 'Desfibrilar un artefacto sin mirar al paciente.'),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '确认无反应、无脉，呼救，立即开始心肺复苏并尽早除颤。',
        'Confirm unresponsiveness and no pulse, call for help, start CPR and defibrillate as early as possible.',
        'Confirma que no responde y no tiene pulso, pide ayuda, inicia RCP y desfibrila lo antes posible.',
      ),
    },
    lessons: ['t6', 't7'],
    sources: [R.zipes2006, R.soar2021, R.panchal2020, REF.escVa2022],
    aka: ['VF', 'FV', 'fibrilación ventricular', '室颤'],
    exemplar: { scenarios: ['ventricular-fibrillation'], layout: '3x4+1', lead: 'II', leads: ['II'] },
  },
  {
    id: 'asystole',
    definition: l(
      '无心室电活动：一条没有QRS波的直线（P波可能仍存在，即P波型停搏）。',
      'No ventricular electrical activity: a flat line without QRS complexes (P waves may persist — P-wave asystole).',
      'Ausencia de actividad eléctrica ventricular: una línea plana sin QRS (pueden persistir ondas P: asistolia con ondas P).',
    ),
    features: [
      l('整条记录无QRS，除轻度漂移外基线平直。', 'No QRS on the whole strip; the baseline is flat apart from slight drift.', 'Ningún QRS en toda la tira; línea de base plana salvo una leve deriva.'),
      l(
        'P波型（心室）停搏：P波继续而无QRS——完全性房室阻滞且无逸搏，起搏可能有效。',
        'P-wave (ventricular) asystole: P waves continue without QRS — complete AV block with no escape; pacing may work.',
        'Asistolia con ondas P (ventricular): las P continúan sin QRS; bloqueo AV completo sin escape; la estimulación puede funcionar.',
      ),
      l('在足够增益下以两个导联确认；检查导联是否脱落（导联脱落的直线）。', 'Confirm in two leads at adequate gain; check the leads are attached (a lead-off flat line).', 'Confírmalo en dos derivaciones con ganancia adecuada; comprueba que los electrodos estén conectados (línea plana por desconexión).'),
    ],
    criteria: [
      {
        label: l('确认心室停搏', 'Confirming asystole', 'Confirmar la asistolia'),
        value: l('≥2个导联均为直线，已提高增益并检查连接', 'Flat in ≥ 2 leads, gain increased, connections checked', 'Plana en ≥ 2 derivaciones, con la ganancia aumentada y las conexiones comprobadas'),
        source: 'Soar 2021 (ERC ALS); Panchal 2020 (AHA)',
      },
    ],
    mechanism: l(
      '心脏各部位的起搏点均未达到阈电位，或所有冲动在到达心室前均被阻断，心室因而不发生除极。没有心室除极就没有QRS，也没有收缩。',
      'No pacemaker anywhere in the heart reaches threshold, or every impulse is blocked before it reaches the ventricles, so the ventricles never depolarize. Without ventricular depolarization there is no QRS and no contraction.',
      'Ningún marcapasos del corazón alcanza el umbral, o todos los impulsos se bloquean antes de llegar a los ventrículos, de modo que estos no se despolarizan. Sin despolarización ventricular no hay QRS ni contracción.',
    ),
    mimics: [
      {
        id: 'ventricular-fibrillation',
        discriminator: l('细颤有低幅波动——提高增益并检查两个导联。', 'Fine VF has low-amplitude undulations — raise the gain and check two leads.', 'La FV fina tiene ondulaciones de baja amplitud: aumenta la ganancia y revisa dos derivaciones.'),
        leads: ['II'],
      },
      {
        id: 'sinus-pause',
        discriminator: l('此处整条记录无活动；窦性停搏在数秒内以一次搏动结束。', 'Here there is no activity over the whole strip; a sinus pause ends with a beat within seconds.', 'Aquí no hay actividad en toda la tira; una pausa sinusal termina con un latido en pocos segundos.'),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l('对心室停搏除颤（无益）。', 'Defibrillating asystole (it does not help).', 'Desfibrilar una asistolia (no sirve).'),
      l('把导联脱落或增益过低称为“心室停搏”。', 'Calling a disconnected lead or a low gain “asystole”.', 'Llamar «asistolia» a un electrodo desconectado o a una ganancia baja.'),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '检查患者和导联连接，开始心肺复苏，按高级生命支持给予肾上腺素；寻找P波（起搏可能有效）并处理可逆原因。',
        'Check the patient and the connections, start CPR and give adrenaline as per advanced life support; look for P waves (pacing may help) and treat reversible causes.',
        'Comprueba al paciente y las conexiones, inicia RCP y administra adrenalina según el soporte vital avanzado; busca ondas P (la estimulación puede ayudar) y trata las causas reversibles.',
      ),
    },
    lessons: ['t6', 't7'],
    sources: [R.soar2021, R.panchal2020],
    aka: ['flat line', 'P-wave asystole', 'asistolia', '心脏停搏'],
    exemplar: { scenarios: ['asystole'], layout: '3x4+1', lead: 'II', leads: ['II'] },
  },
  // ── pacing ───────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'paced-rhythm',
    definition: l(
      '心房、心室或两者由起搏器激动的心律，表现为刺激信号后紧跟被夺获的P波或QRS。',
      'A rhythm in which the atria, the ventricles or both are activated by a pacemaker, recognised by stimulus spikes followed by captured P waves or QRS complexes.',
      'Ritmo en el que las aurículas, los ventrículos o ambos se activan por un marcapasos, reconocible por espigas seguidas de ondas P o QRS capturados.',
    ),
    features: [
      l(
        '在多个导联寻找刺激信号（双极起搏信号可能很小甚至看不见）；心电图机也可能添加标记信号。',
        'Look for spikes in several leads (bipolar spikes may be tiny or invisible); the electrocardiograph may also add marker spikes.',
        'Busca espigas en varias derivaciones (las bipolares pueden ser diminutas o invisibles); el electrocardiógrafo también puede añadir espigas marcadoras.',
      ),
      l('心房起搏：信号→P波；心室起搏：信号→宽QRS。', 'Atrial pacing: spike → P wave; ventricular pacing: spike → wide QRS.', 'Estimulación auricular: espiga → onda P; ventricular: espiga → QRS ancho.'),
      l(
        '右心室心尖起搏：左束支阻滞样QRS（常≥140 ms）、电轴左上、胸导联以负向为主、ST-T与QRS相反。',
        'RV apical pacing: LBBB-like QRS (often ≥ 140 ms), left superior axis, mostly negative precordial QRS, discordant ST–T.',
        'Estimulación apical del VD: QRS tipo BRI (a menudo ≥ 140 ms), eje superior izquierdo, QRS precordial mayoritariamente negativo, ST-T discordante.',
      ),
      l(
        '双心室起搏（CRT）：V1以R波为主、Ⅰ导联负向；传导系统起搏：QRS窄（希氏束）或V1呈右束支阻滞样（左束支区域）。',
        'Biventricular pacing (CRT): dominant R in V1 and negative I; conduction-system pacing: narrow QRS (His) or RBBB-like V1 (left bundle area).',
        'Estimulación biventricular (TRC): R dominante en V1 y I negativa; estimulación del sistema de conducción: QRS estrecho (His) o V1 tipo BRD (área de la rama izquierda).',
      ),
      l('融合波和假性融合波是正常的时间巧合，不是故障。', 'Fusion and pseudofusion beats are normal timing coincidences, not malfunction.', 'Los latidos de fusión y pseudofusión son coincidencias normales de tiempo, no un fallo.'),
    ],
    criteria: [
      {
        label: l('右心室心尖起搏', 'RV apical pacing', 'Estimulación apical del VD'),
        value: l('左束支阻滞样、电轴向上、QRS≥140–180 ms、ST-T与QRS相反', 'LBBB-like, superior axis, QRS ≥ 140–180 ms, discordant ST–T', 'Tipo BRI, eje superior, QRS ≥ 140-180 ms, ST-T discordante'),
        source: 'Mason 2007; Glikson 2021 (ESC pacing)',
      },
      {
        label: l('NBG编码', 'NBG code', 'Código NBG'),
        value: l(
          'Ⅰ起搏心腔，Ⅱ感知心腔，Ⅲ感知后反应（I抑制/T触发/D双重），Ⅳ频率应答（R）',
          'I chamber paced, II chamber sensed, III response to sensing (I inhibit / T trigger / D dual), IV rate modulation (R)',
          'I cámara estimulada, II cámara detectada, III respuesta a la detección (I inhibe / T dispara / D doble), IV modulación de frecuencia (R)',
        ),
        source: 'Bernstein 2002 (NASPE/BPEG)',
      },
      {
        label: l('起搏心律中的心肌梗死', 'MI in a paced rhythm', 'Infarto en ritmo de marcapasos'),
        value: l('Sgarbossa/Smith改良标准（ST/S≤−0.25）', 'Sgarbossa / Smith-modified criteria (ST/S ≤ −0.25)', 'Criterios de Sgarbossa / Smith modificados (ST/S ≤ −0,25)'),
        source: 'Byrne 2023 (ESC ACS); Smith 2012',
      },
    ],
    mechanism: l(
      '起搏电极在其尖端释放电流，激动由该点经心肌扩布，而不是从传导系统开始。从右心室心尖起搏时，激动波由右向左、由心尖向心底缓慢传导，因此QRS宽大、呈左束支阻滞样、电轴向上。',
      'The pacing lead delivers current at its tip, and activation spreads from that point through the myocardium instead of starting in the conduction system. From the RV apex the wavefront travels slowly from right to left and from apex to base, so the QRS is wide, LBBB-like and directed superiorly.',
      'El cable de marcapasos libera corriente en su punta y la activación se propaga desde ese punto por el miocardio en lugar de empezar en el sistema de conducción. Desde el ápex del VD el frente avanza despacio de derecha a izquierda y del ápex a la base, por lo que el QRS es ancho, parecido a un bloqueo de rama izquierda y dirigido hacia arriba.',
    ),
    mimics: [
      {
        id: 'lbbb',
        discriminator: l(
          '此处每个QRS前有刺激信号，电轴向上；左束支阻滞无信号，QRS跟随窦性P波和PR。',
          'Here a spike precedes each QRS and the axis is superior; LBBB has no spikes and the QRS follows a sinus P at a normal PR.',
          'Aquí una espiga precede a cada QRS y el eje es superior; el BRI no tiene espigas y el QRS sigue a una P sinusal con su PR.',
        ),
        leads: ['V1', 'II', 'aVF'],
      },
      {
        id: 'vt-monomorphic',
        discriminator: l('此处QRS前有刺激信号，频率等于设定频率；室速无信号。', 'Here a spike precedes the QRS at the programmed rate; VT has no spikes.', 'Aquí una espiga precede al QRS a la frecuencia programada; la TV no tiene espigas.'),
        leads: ['V1', 'II'],
      },
      {
        id: 'pacing-failure-capture',
        discriminator: l(
          '此处每个信号后都有夺获；失夺获时不应期外的信号后没有P波或QRS。',
          'Here every spike is followed by capture; in failure to capture a spike outside the refractory period is followed by no P or QRS.',
          'Aquí cada espiga va seguida de captura; en el fallo de captura una espiga fuera del periodo refractario no va seguida de P ni de QRS.',
        ),
        leads: ['II', 'V1'],
      },
    ],
    pitfalls: [
      l('漏看微小的双极起搏信号，把节律称为左束支阻滞或室速。', 'Missing tiny bipolar spikes and calling the rhythm LBBB or VT.', 'No ver espigas bipolares diminutas y llamar al ritmo BRI o TV.'),
      l('把融合波或假性融合波当作起搏器故障。', 'Calling fusion or pseudofusion beats a malfunction.', 'Considerar un fallo los latidos de fusión o pseudofusión.'),
      l('忽视起搏心律中的急性心肌梗死——应用Sgarbossa类标准。', 'Ignoring acute MI in a paced rhythm — apply Sgarbossa-type criteria.', 'Ignorar un infarto agudo en ritmo de marcapasos: aplica criterios tipo Sgarbossa.'),
    ],
    lessons: ['o11'],
    sources: [REF.mason2007, R.glikson2021, R.bernstein2002, REF.escAcs2023, REF.smith2012],
    aka: ['pacemaker', 'pacing', 'VVI', 'DDD', 'CRT', 'marcapasos', '起搏器'],
    exemplar: { scenarios: ['paced-vvi', 'paced-ddd', 'paced-biv', 'paced-aai'], layout: '3x4+1', lead: 'II', leads: ['II', 'V1', 'I'] },
  },
];
