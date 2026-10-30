/**
 * Atlas entries — category `other` (electrolytes, temperature, pericardium, pulmonary embolism, channelopathies,
 * cardiomyopathies, toxicology, position, athletes, lung disease, pacemaker malfunction). Schema and authoring rules:
 * src/atlas/schema.ts. Values: docs/curriculum/criteria.md (section electrolytes-drugs-misc-conditions and its "missing
 * in the book" list; pacemakers-devices) and docs/curriculum/critic.json (hyperkalaemia progression and insensitivity;
 * S1Q3T3 insensitive in PE; Brugada type 1 the only diagnostic pattern; athlete international criteria; modern paced
 * ECG and malfunction patterns).
 */
import { l } from '../../core/l10n';
import { REF } from '../refs';
import type { AtlasEntry } from '../schema';

/** Full references used here that src/atlas/refs.ts does not have (kept local; reported to the atlas workstream). */
const R = {
  clase2020:
    'Clase CM et al. Potassium homeostasis and management of dyskalemia in kidney diseases: conclusions from a KDIGO Controversies Conference. Kidney Int 2020;97:42–61.',
  ukka2023: 'UK Kidney Association. Clinical Practice Guideline: Treatment of Acute Hyperkalaemia in Adults (2023).',
  lavonas2023:
    'Lavonas EJ et al. 2023 American Heart Association Focused Update on the Management of Patients With Cardiac Arrest or Life-Threatening Toxicity Due to Poisoning. Circulation 2023;148:e149–e184.',
  boehnert1985:
    'Boehnert MT, Lovejoy FH Jr. Value of the QRS duration versus the serum drug level in predicting seizures and ventricular arrhythmias after an acute overdose of tricyclic antidepressants. N Engl J Med 1985;313:474–479.',
  liebelt1995:
    'Liebelt EL, Francis PD, Woolf AD. ECG lead aVR versus QRS interval in predicting seizures and arrhythmias in acute tricyclic antidepressant toxicity. Ann Emerg Med 1995;26:195–201.',
  dow2019:
    'Dow J et al. Wilderness Medical Society Clinical Practice Guidelines for the Out-of-Hospital Evaluation and Treatment of Accidental Hypothermia: 2019 Update. Wilderness Environ Med 2019;30:S47–S69.',
  ginzton1982:
    'Ginzton LE, Laks MM. The differential diagnosis of acute pericarditis from the normal variant: new electrocardiographic criteria. Circulation 1982;65:1004–1009.',
  bayesBrugada2012:
    'Bayés de Luna A et al. Current electrocardiographic criteria for diagnosis of Brugada pattern: a consensus report. J Electrocardiol 2012;45:433–442.',
  elliott2014:
    'Elliott PM et al. 2014 ESC Guidelines on diagnosis and management of hypertrophic cardiomyopathy. Eur Heart J 2014;35:2733–2779.',
  ommen2024:
    'Ommen SR et al. 2024 AHA/ACC/AMSSM/HRS/PACES/SCMR Guideline for the Management of Hypertrophic Cardiomyopathy. Circulation 2024;149:e1239–e1311.',
  marcus2010:
    'Marcus FI et al. Diagnosis of arrhythmogenic right ventricular cardiomyopathy/dysplasia: proposed modification of the Task Force Criteria. Circulation 2010;121:1533–1541.',
  corrado2020: 'Corrado D et al. Diagnosis of arrhythmogenic cardiomyopathy: the Padua criteria. Int J Cardiol 2020;319:106–114.',
  ghadri2018:
    'Ghadri JR et al. International Expert Consensus Document on Takotsubo Syndrome (Part I): clinical characteristics, diagnostic criteria, and pathophysiology (InterTAK). Eur Heart J 2018;39:2032–2046.',
  glikson2021:
    'Glikson M et al. 2021 ESC Guidelines on cardiac pacing and cardiac resynchronization therapy. Eur Heart J 2021;42:3427–3520.',
  ellenbogen2017:
    'Ellenbogen KA, Wilkoff BL, Kay GN, Lau CP, Auricchio A. Clinical Cardiac Pacing, Defibrillation and Resynchronization Therapy, 5th ed. Elsevier 2017.',
  barold2014: 'Barold SS, Herweg B. The effect of hyperkalaemia on cardiac rhythm devices. Europace 2014;16:467–476.',
  crossley2011:
    'Crossley GH et al. The Heart Rhythm Society / American Society of Anesthesiologists 2011 Expert Consensus Statement on the perioperative management of patients with implantable defibrillators, pacemakers and arrhythmia monitors. Heart Rhythm 2011;8:1114–1154.',
} as const;

export const entries: readonly AtlasEntry[] = [
  // ── hyperkalaemia ────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'hyperkalemia',
    definition: l(
      '血钾升高，心电图从高窄帐篷样T波，发展到P波消失、QRS增宽和正弦波，任何阶段都可能发生心脏骤停。',
      'Raised serum potassium, whose ECG signs progress from tall, narrow, tented T waves to loss of P waves, QRS widening and a sine wave, with arrest possible at any stage.',
      'Potasio sérico elevado, cuyos signos en el ECG progresan desde ondas T altas, estrechas y en tienda hasta la pérdida de la P, el ensanchamiento del QRS y la onda sinusoidal, con posible parada en cualquier fase.',
    ),
    features: [
      l(
        'T波高、基底窄、对称、顶端尖（帐篷样），V2–V4及Ⅱ、Ⅲ最明显；QT正常或偏短。',
        'Tall, narrow-based, symmetric, pointed (“tented”) T waves, clearest in V2–V4, II and III; QT normal or short.',
        'Ondas T altas, de base estrecha, simétricas y picudas («en tienda»), más claras en V2–V4, II y III; QT normal o corto.',
      ),
      l(
        '随后PR延长、P波低平直至消失。',
        'Then the PR lengthens and the P wave flattens until it disappears.',
        'Después el PR se alarga y la onda P se aplana hasta desaparecer.',
      ),
      l(
        '接着QRS增宽、形态怪异（可似束支阻滞、STEMI或Brugada），出现心动过缓、交界性或室性逸搏、高度房室传导阻滞。',
        'Next the QRS widens with a bizarre shape (it can look like bundle branch block, STEMI or Brugada), with bradycardia, junctional or ventricular escape and high-grade AV block.',
        'Luego el QRS se ensancha con forma extraña (puede parecer un bloqueo de rama, un IAMCEST o un Brugada), con bradicardia, escape de la unión o ventricular y bloqueo AV avanzado.',
      ),
      l(
        '终末：QRS与T融合为正弦波，继而室颤、停搏或无脉电活动。',
        'Finally the QRS merges with the T into a sine wave, then VF, asystole or pulseless electrical activity.',
        'Al final el QRS se funde con la T en una onda sinusoidal, seguida de FV, asistolia o actividad eléctrica sin pulso.',
      ),
      l(
        '心电图与血钾相关性差：血钾危险时心电图可接近正常，且进展不按固定顺序。',
        'The ECG correlates poorly with serum potassium: it can be near-normal at dangerous levels, and the sequence is not fixed.',
        'El ECG se correlaciona mal con el potasio: puede ser casi normal con cifras peligrosas, y la secuencia no es fija.',
      ),
    ],
    criteria: [
      {
        label: l('血钾升高时的大致演变', 'Rough sequence as potassium rises', 'Secuencia aproximada al subir el potasio'),
        value: l(
          'T波高尖 → PR延长、P波消失 → QRS增宽 → 正弦波、心动过缓、室颤或停搏',
          'Tented T → PR prolongation and P loss → QRS widening → sine wave, bradycardia, VF or asystole',
          'T en tienda → PR largo y pérdida de la P → QRS ancho → onda sinusoidal, bradicardia, FV o asistolia',
        ),
        source: 'Clase 2020 (KDIGO); Littmann 2018',
      },
      {
        label: l('高危心电图表现', 'High-risk ECG findings', 'Hallazgos de alto riesgo en el ECG'),
        value: l(
          '心动过缓（<50次/分）、交界性心律、QRS增宽预示短期不良事件',
          'Bradycardia (< 50/min), junctional rhythm and QRS widening predict short-term adverse events',
          'Bradicardia (< 50 lpm), ritmo de la unión y QRS ancho predicen eventos adversos a corto plazo',
        ),
        source: 'Durfey 2017',
      },
      {
        label: l('严重程度', 'Severity', 'Gravedad'),
        value: l(
          '血钾≥6.5 mmol/L为重度；任何心电图改变都属急症',
          'K ≥ 6.5 mmol/L is severe; any ECG change makes it an emergency',
          'K ≥ 6,5 mmol/L es grave; cualquier cambio en el ECG lo convierte en una urgencia',
        ),
        source: 'UK Kidney Association 2023; Clase 2020 (KDIGO)',
      },
    ],
    mechanism: l(
      '细胞外钾升高使复极3期的外向钾电流加快，复极缩短变陡，形成窄而高、对称的T波。血钾更高时静息膜电位去极化、钠通道失活，传导先在心房、后在心室减慢，使P波低平、QRS增宽，最终与T波融合为正弦波。',
      'Raised extracellular potassium speeds the outward potassium current of phase 3, which shortens and steepens repolarization and gives the narrow, tall, symmetric T wave. Higher levels depolarize the resting membrane and inactivate sodium channels, which slows conduction in the atria first and then in the ventricles, flattening the P wave and widening the QRS until it merges with the T into a sine wave.',
      'El potasio extracelular alto acelera la corriente de salida de potasio de la fase 3, lo que acorta y empina la repolarización y da la onda T estrecha, alta y simétrica. Con cifras mayores la membrana en reposo se despolariza y los canales de sodio se inactivan, lo que enlentece la conducción primero en las aurículas y luego en los ventrículos, aplana la P y ensancha el QRS hasta fundirlo con la T en una onda sinusoidal.',
    ),
    mimics: [
      {
        id: 'hyperacute-t',
        discriminator: l(
          '这里T波窄基底、尖顶、分布广泛；超急性期T波宽基底、饱满，局限于一个冠脉分布区并常有对应性改变。',
          'Here the T waves are narrow-based, pointed and widespread; hyperacute T waves are broad-based and bulky, confined to one coronary territory and often with reciprocal change.',
          'Aquí las T son de base estrecha, picudas y difusas; las T hiperagudas son de base ancha y voluminosas, limitadas a un territorio coronario y a menudo con cambios recíprocos.',
        ),
        leads: ['V2', 'V3', 'V4', 'aVL'],
      },
      {
        id: 'stemi-anterior',
        discriminator: l(
          '高钾所致的“假性STEMI”伴QRS增宽和P波消失，补钙或降钾后迅速改善；真正的闭塞QRS窄、P波正常。',
          'Hyperkalaemic “pseudo-STEMI” comes with a wide QRS and absent P waves and improves quickly with calcium and potassium lowering; true occlusion has a narrow QRS and normal P waves.',
          'El «seudo-IAMCEST» hiperpotasémico se acompaña de QRS ancho y P ausentes y mejora rápido con calcio y descenso del potasio; la oclusión verdadera tiene QRS estrecho y P normales.',
        ),
        leads: ['V1', 'V2', 'V3', 'II'],
      },
      {
        id: 'brugada-type1',
        discriminator: l(
          '高钾可产生Brugada样图形（表型模拟），纠正血钾后消失；真正的Brugada图形血钾正常。',
          'Hyperkalaemia can produce a Brugada-like pattern (a phenocopy) that vanishes when potassium is corrected; a true Brugada pattern has normal potassium.',
          'La hiperpotasemia puede producir un patrón similar al Brugada (fenocopia) que desaparece al corregir el potasio; el Brugada verdadero tiene potasio normal.',
        ),
        leads: ['V1', 'V2'],
      },
      {
        id: 'na-channel-blockade',
        discriminator: l(
          '钠通道阻滞剂中毒常为窦性心动过速伴aVR终末R波；高钾多为心动过缓、T波高尖、P波低平。',
          'Sodium-channel blocker toxicity usually gives sinus tachycardia with a terminal R in aVR; hyperkalaemia usually gives bradycardia, peaked T waves and flat P waves.',
          'La intoxicación por bloqueantes de canales de sodio suele dar taquicardia sinusal con R terminal en aVR; la hiperpotasemia suele dar bradicardia, T picudas y P aplanadas.',
        ),
        leads: ['aVR', 'I', 'II'],
      },
    ],
    pitfalls: [
      l(
        '因心电图“只有轻度改变”而放心——心电图可在致命性高钾时仍接近正常。',
        'Being reassured by a “mild” ECG: it can be near-normal at a lethal potassium.',
        'Tranquilizarse con un ECG «poco alterado»: puede ser casi normal con un potasio letal.',
      ),
      l(
        'QRS已增宽仍等待化验结果才给予静脉钙剂。',
        'Waiting for the laboratory result before giving IV calcium when the QRS is already wide.',
        'Esperar al resultado del laboratorio antes de administrar calcio IV cuando el QRS ya es ancho.',
      ),
      l(
        '起搏患者：高钾可使起搏QRS增宽（>200 ms）甚至失夺获。',
        'In a paced patient, hyperkalaemia can widen the paced QRS (> 200 ms) or cause loss of capture.',
        'En un paciente con marcapasos, la hiperpotasemia puede ensanchar el QRS estimulado (> 200 ms) o causar pérdida de captura.',
      ),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '立即测血钾（血气或床旁检测）并持续监护；有心电图改变时立即静脉注射钙剂稳定心肌，然后用胰岛素加葡萄糖使钾进入细胞。',
        'Check potassium now (blood gas or point-of-care) and monitor continuously; with ECG changes give IV calcium at once to stabilize the myocardium, then shift potassium into cells with insulin and glucose.',
        'Determina ya el potasio (gasometría o prueba a pie de cama) y monitoriza de forma continua; si hay cambios en el ECG administra calcio IV de inmediato para estabilizar el miocardio y después desplaza el potasio al interior celular con insulina y glucosa.',
      ),
    },
    lessons: ['o1', 'i11'],
    sources: [R.clase2020, R.ukka2023, REF.littmann2018, REF.durfey2017, REF.diercks2004, R.barold2014],
    aka: ['high potassium', 'hyperK', 'tented T', 'sine wave', 'hiperpotasemia', 'hiperkalemia', 'T en tienda de campaña', '高钾', 'T波高尖'],
    exemplar: { scenarios: ['hyperkalemia'], leads: ['V2', 'V3', 'V4', 'II'] },
  },

  // ── hypokalaemia ─────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'hypokalemia',
    definition: l(
      '血钾降低，心电图表现为T波低平、ST段压低和明显的U波，U波与T波融合形成表面上的“QT延长”（实为QU间期）。',
      'Low serum potassium, shown by flat T waves, ST depression and prominent U waves that fuse with the T into an apparently long QT (really a QU interval).',
      'Potasio sérico bajo, que se manifiesta con T aplanadas, descenso del ST y ondas U prominentes que se funden con la T en un QT aparentemente largo (en realidad un intervalo QU).',
    ),
    features: [
      l('T波低平或倒置。', 'Flat or inverted T waves.', 'Ondas T aplanadas o negativas.'),
      l(
        'U波明显，在V2–V3常高于T波。',
        'Prominent U waves, often taller than the T in V2–V3.',
        'Ondas U prominentes, a menudo más altas que la T en V2–V3.',
      ),
      l('ST段下垂性压低。', 'Sagging ST depression.', 'Descenso del ST en forma de hamaca.'),
      l(
        'T与U融合：QT应测到T波终点，不要把U波算进去。',
        'T and U fuse: measure the QT to the end of the T and do not include the U wave.',
        'La T y la U se funden: mide el QT hasta el final de la T sin incluir la onda U.',
      ),
      l(
        '易发尖端扭转和地高辛中毒；常合并低镁。',
        'It raises the risk of torsades and of digoxin toxicity, and it often comes with low magnesium.',
        'Aumenta el riesgo de torsade y de toxicidad digitálica, y a menudo se acompaña de hipomagnesemia.',
      ),
    ],
    criteria: [
      {
        label: l('U波明显', 'Prominent U wave', 'Onda U prominente'),
        value: l('U波高于同导联T波（常见于V2–V3）', 'U wave taller than the T in the same lead (typically V2–V3)', 'Onda U más alta que la T en la misma derivación (típicamente V2–V3)'),
        source: 'Rautaharju 2009 (AHA Part IV)',
      },
      {
        label: l('QT测量', 'QT measurement', 'Medición del QT'),
        value: l('切线法测到T波终点，排除独立的U波', 'Tangent method to the end of T, leaving out a separate U wave', 'Método de la tangente hasta el final de la T, excluyendo una onda U separada'),
        source: 'Rautaharju 2009 (AHA Part IV)',
      },
      {
        label: l('尖端扭转风险', 'Torsades risk', 'Riesgo de torsade'),
        value: l('QTc>500 ms或较基线延长>60 ms为高危', 'QTc > 500 ms or a rise > 60 ms from baseline is high risk', 'QTc > 500 ms o un aumento > 60 ms respecto al basal es de alto riesgo'),
        source: 'Drew 2010 (AHA/ACCF statement)',
      },
    ],
    mechanism: l(
      '细胞外钾降低使终止动作电位的外向钾电流减弱，复极变慢变平，因此T波降低、ST段压低。部分心肌层的晚期复极随后表现为独立的U波，血钾越低U波越大，并与T波融合。',
      'Low extracellular potassium weakens the outward potassium current that ends the action potential, so repolarization becomes slower and flatter, which lowers the T wave and depresses the ST. The late repolarization of some cell layers then shows as a separate U wave, which grows and merges with the T as potassium falls further.',
      'El potasio extracelular bajo debilita la corriente de salida de potasio que termina el potencial de acción, de modo que la repolarización se hace más lenta y plana, lo que reduce la T y desciende el ST. La repolarización tardía de algunas capas celulares aparece después como una onda U separada, que crece y se funde con la T a medida que el potasio baja.',
    ),
    mimics: [
      {
        id: 'long-qt',
        discriminator: l(
          '真正的QT延长是T波本身变宽或延迟，没有独立U波；低钾时延长的是QU，T波本身不长。',
          'In a true long QT the T wave itself is broad or late, with no separate U wave; in hypokalaemia it is the QU that is long, not the T.',
          'En el QT largo verdadero es la propia T la que es ancha o tardía, sin onda U separada; en la hipopotasemia lo largo es el QU, no la T.',
        ),
        leads: ['II', 'V2', 'V3', 'V5'],
      },
      {
        id: 'digoxin-effect',
        discriminator: l(
          '地高辛效应为鱼钩样ST伴QT缩短；低钾时“QT”显得延长并有大U波。',
          'Digoxin effect gives a scooped ST with a short QT; hypokalaemia gives an apparently long “QT” with large U waves.',
          'El efecto digitálico da un ST en cubeta con QT corto; la hipopotasemia da un «QT» aparentemente largo con ondas U grandes.',
        ),
        leads: ['V5', 'V6'],
      },
      {
        id: 'st-depression-ischemic',
        discriminator: l(
          '缺血性ST压低为区域性、动态，与症状相关，没有大U波。',
          'Ischaemic ST depression is regional and dynamic with symptoms, without large U waves.',
          'El descenso isquémico del ST es regional y dinámico con los síntomas, sin ondas U grandes.',
        ),
        leads: ['V4', 'V5', 'V6'],
      },
    ],
    pitfalls: [
      l(
        '把QT测到U波终点，误诊“QT延长”。',
        'Measuring the QT to the end of the U wave and calling it “long QT”.',
        'Medir el QT hasta el final de la onda U y llamarlo «QT largo».',
      ),
      l(
        '只补钾不查血镁。',
        'Replacing potassium without checking magnesium.',
        'Reponer potasio sin comprobar el magnesio.',
      ),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '查血钾和血镁并补充，持续监护心律，停用延长QT的药物；有室性早搏、服用地高辛或QTc>500 ms时要更快处理。',
        'Check and replace potassium and magnesium, monitor the rhythm and stop QT-prolonging drugs; act faster when there is ectopy, digoxin or a QTc > 500 ms.',
        'Determina y repón potasio y magnesio, monitoriza el ritmo y suspende los fármacos que alargan el QT; actúa más rápido si hay extrasístoles, digoxina o QTc > 500 ms.',
      ),
    },
    lessons: ['o1'],
    sources: [REF.rautaharju2009, REF.drew2010, REF.diercks2004],
    aka: ['low potassium', 'hypoK', 'U waves', 'hipopotasemia', 'hipokalemia', '低钾', 'U波'],
    exemplar: { scenarios: ['hypokalemia'], leads: ['V2', 'V3', 'II'] },
  },

  // ── hypercalcaemia ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'hypercalcemia',
    definition: l(
      '血钙升高，ST段缩短使QT缩短，T波看起来紧接着QRS起始。',
      'Raised serum calcium, which shortens the QT by shortening the ST segment, so the T wave seems to start right at the end of the QRS.',
      'Calcio sérico elevado, que acorta el QT al acortar el segmento ST, de modo que la onda T parece empezar justo al final del QRS.',
    ),
    features: [
      l(
        'QT缩短，主要因为ST段很短或消失。',
        'Short QT, mainly from a short or absent ST segment.',
        'QT corto, sobre todo por un segmento ST corto o ausente.',
      ),
      l('T波本身宽度正常。', 'The T wave itself has a normal width.', 'La onda T en sí tiene una anchura normal.'),
      l(
        '重度时可见J波（Osborn样波）、PR延长或房室传导阻滞。',
        'In severe cases J (Osborn-like) waves, PR prolongation or AV block may appear.',
        'En casos graves pueden aparecer ondas J (similares a las de Osborn), PR largo o bloqueo AV.',
      ),
      l(
        '服用地高辛者高钙会增加中毒风险。',
        'In a patient on digoxin, high calcium raises the risk of toxicity.',
        'En un paciente que toma digoxina, el calcio alto aumenta el riesgo de toxicidad.',
      ),
    ],
    criteria: [
      {
        label: l('QT机制', 'QT mechanism', 'Mecanismo del QT'),
        value: l('ST段缩短或消失导致QT缩短；T波宽度正常', 'Short QT through a short or absent ST segment; T width normal', 'QT corto por un ST corto o ausente; anchura de la T normal'),
        source: 'Rautaharju 2009 (AHA Part IV)',
      },
      {
        label: l('短QT', 'Short QT', 'QT corto'),
        value: l('QTc约≤390 ms', 'QTc about ≤ 390 ms', 'QTc aproximadamente ≤ 390 ms'),
        source: 'Rautaharju 2009 (AHA Part IV)',
      },
      {
        label: l('J波', 'J waves', 'Ondas J'),
        value: l('重度高钙偶见非缺血性J波', 'Non-ischaemic J waves occasionally appear in severe hypercalcaemia', 'En la hipercalcemia grave aparecen a veces ondas J no isquémicas'),
        source: 'Antzelevitch 2016 (J-wave consensus)',
      },
    ],
    mechanism: l(
      '细胞外钙升高缩短心室动作电位的平台期，所有心肌细胞更早开始复极。ST段正是这一平台期的心电图表现，因此它缩短或消失，而T波本身保持正常宽度。',
      'A high extracellular calcium shortens the plateau of the ventricular action potential, so every cell starts repolarizing sooner. The ST segment is the electrical picture of that plateau, so it shortens or vanishes while the T wave keeps its normal width.',
      'Un calcio extracelular alto acorta la meseta del potencial de acción ventricular, de modo que todas las células empiezan antes a repolarizarse. El segmento ST es la imagen eléctrica de esa meseta, así que se acorta o desaparece mientras la onda T conserva su anchura normal.',
    ),
    mimics: [
      {
        id: 'short-qt',
        discriminator: l(
          '先天性短QT（QTc≤360 ms）伴高尖对称T波，血钙正常，常有家族史。',
          'Congenital short QT (QTc ≤ 360 ms) has tall, peaked, symmetric T waves with normal calcium and often a family history.',
          'El QT corto congénito (QTc ≤ 360 ms) tiene T altas, picudas y simétricas con calcio normal y a menudo antecedentes familiares.',
        ),
        leads: ['V2', 'V3', 'II'],
      },
      {
        id: 'digoxin-effect',
        discriminator: l(
          '地高辛效应也缩短QT，但ST呈鱼钩样下垂。',
          'Digoxin effect also shortens the QT, but the ST sags in a scooped curve.',
          'El efecto digitálico también acorta el QT, pero el ST desciende en cubeta.',
        ),
        leads: ['V5', 'V6'],
      },
      {
        id: 'hypothermia',
        discriminator: l(
          '低体温的J波伴心动过缓和QT延长，而不是QT缩短。',
          'The J waves of hypothermia come with bradycardia and a long QT, not a short one.',
          'Las ondas J de la hipotermia se acompañan de bradicardia y QT largo, no corto.',
        ),
        leads: ['II', 'V4', 'V5'],
      },
    ],
    pitfalls: [
      l(
        '只核对QT上限，从不注意QT过短。',
        'Checking only the upper limit of the QT and never noticing a short one.',
        'Comprobar solo el límite superior del QT y no fijarse nunca en un QT corto.',
      ),
    ],
    lessons: ['o2'],
    sources: [REF.rautaharju2009, REF.antzelevitch2016, REF.diercks2004],
    aka: ['high calcium', 'hiperCa', 'short ST', 'hipercalcemia', '高钙', 'ST段缩短'],
    exemplar: { scenarios: ['hypercalcemia'], leads: ['II', 'V2', 'V5'] },
  },

  // ── hypocalcaemia ────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'hypocalcemia',
    definition: l(
      '血钙降低，ST段延长使QT延长，而T波本身宽度正常。',
      'Low serum calcium, which lengthens the QT by stretching the ST segment while the T wave keeps its normal width.',
      'Calcio sérico bajo, que alarga el QT al estirar el segmento ST mientras la onda T conserva su anchura normal.',
    ),
    features: [
      l('ST段长而平直、等电位。', 'A long, flat, isoelectric ST segment.', 'Un segmento ST largo, plano e isoeléctrico.'),
      l(
        'T波形态和宽度正常（有时低平或倒置）。',
        'T wave of normal shape and width (sometimes flat or inverted).',
        'Onda T de forma y anchura normales (a veces aplanada o negativa).',
      ),
      l('QTc延长。', 'QTc prolonged.', 'QTc prolongado.'),
      l(
        '常见原因：甲状腺或甲状旁腺术后、甲状旁腺功能减退、慢性肾病、低镁。',
        'Typical causes: after thyroid or parathyroid surgery, hypoparathyroidism, chronic kidney disease, low magnesium.',
        'Causas típicas: tras cirugía de tiroides o paratiroides, hipoparatiroidismo, enfermedad renal crónica, hipomagnesemia.',
      ),
    ],
    criteria: [
      {
        label: l('QT机制', 'QT mechanism', 'Mecanismo del QT'),
        value: l('ST段延长导致QT延长；T波宽度正常', 'Long QT through a long ST segment; T width normal', 'QT largo por un ST largo; anchura de la T normal'),
        source: 'Rautaharju 2009 (AHA Part IV)',
      },
      {
        label: l('QTc延长', 'Prolonged QTc', 'QTc prolongado'),
        value: l('男性≥450 ms，女性≥460 ms', '≥ 450 ms in men, ≥ 460 ms in women', '≥ 450 ms en varones, ≥ 460 ms en mujeres'),
        source: 'Rautaharju 2009 (AHA Part IV)',
      },
    ],
    mechanism: l(
      '细胞外钙降低延长心室动作电位的平台期，每个细胞的复极都开始得更晚。反映平台期的ST段因此被拉长，而反映复极扩布的T波本身宽度正常。',
      'Low extracellular calcium lengthens the plateau of the ventricular action potential, so repolarization starts later in every cell. The ST segment, which reflects that plateau, therefore stretches, while the T wave itself, which reflects the spread of recovery, keeps a normal width.',
      'El calcio extracelular bajo alarga la meseta del potencial de acción ventricular, de modo que la repolarización empieza más tarde en todas las células. El segmento ST, que refleja esa meseta, se estira, mientras que la onda T, que refleja la propagación de la recuperación, conserva una anchura normal.',
    ),
    mimics: [
      {
        id: 'long-qt',
        discriminator: l(
          '先天性或药物性长QT是T波本身变宽、切迹或低平；低钙时延长的是平直的ST段。',
          'In congenital or drug-induced long QT the T wave itself is broad, notched or low; in hypocalcaemia it is the flat ST segment that is long.',
          'En el QT largo congénito o farmacológico es la propia T la que es ancha, mellada o baja; en la hipocalcemia lo largo es el ST plano.',
        ),
        leads: ['II', 'V5'],
      },
      {
        id: 'hypokalemia',
        discriminator: l(
          '低钾的“QT延长”来自T与U融合，ST段下垂、T波低平。',
          'In hypokalaemia the apparent long QT comes from T–U fusion, with a sagging ST and flat T.',
          'En la hipopotasemia el QT aparentemente largo procede de la fusión T-U, con ST en hamaca y T aplanada.',
        ),
        leads: ['V2', 'V3'],
      },
      {
        id: 'hypothermia',
        discriminator: l(
          '低体温QT也延长，但伴心动过缓和J波。',
          'Hypothermia also lengthens the QT, but with bradycardia and J waves.',
          'La hipotermia también alarga el QT, pero con bradicardia y ondas J.',
        ),
        leads: ['II', 'V4', 'V5'],
      },
    ],
    pitfalls: [
      l(
        '甲状腺术后患者出现QT延长时没有想到低钙。',
        'Not thinking of low calcium when a long QT appears after thyroid surgery.',
        'No pensar en hipocalcemia cuando aparece un QT largo tras una cirugía de tiroides.',
      ),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '查离子钙、血镁和血钾；有症状或重度低钙伴QT延长时静脉补钙并监护心律。',
        'Check ionised calcium, magnesium and potassium; symptomatic or severe hypocalcaemia with a long QT needs IV calcium and rhythm monitoring.',
        'Determina calcio iónico, magnesio y potasio; la hipocalcemia sintomática o grave con QT largo requiere calcio IV y monitorización del ritmo.',
      ),
    },
    lessons: ['o2'],
    sources: [REF.rautaharju2009, REF.diercks2004, REF.drew2010],
    aka: ['low calcium', 'hipoCa', 'long ST', 'hipocalcemia', '低钙', 'ST段延长'],
    exemplar: { scenarios: ['hypocalcemia'], leads: ['II', 'V2', 'V5'] },
  },

  // ── hypothermia ──────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'hypothermia',
    definition: l(
      '核心体温<35 °C，心电图表现为Osborn（J）波、心动过缓、PR、QRS和QT延长及寒战伪差，体温越低室颤和停搏风险越高。',
      'Core temperature below 35 °C, shown by Osborn (J) waves, bradycardia, longer PR, QRS and QT and shivering artefact, with a rising risk of VF and asystole as it deepens.',
      'Temperatura central por debajo de 35 °C, que se manifiesta con ondas J de Osborn, bradicardia, alargamiento del PR, el QRS y el QT y artefacto por tiritona, con riesgo creciente de FV y asistolia a medida que se agrava.',
    ),
    features: [
      l(
        'Osborn波：J点处正向的驼峰，Ⅱ及V3–V6最明显，体温越低越大。',
        'Osborn wave: a positive hump at the J point, clearest in II and V3–V6, larger at lower temperatures.',
        'Onda de Osborn: una joroba positiva en el punto J, más clara en II y V3–V6, mayor cuanto más baja la temperatura.',
      ),
      l(
        '窦性心动过缓，或心室率缓慢的心房颤动。',
        'Sinus bradycardia, or atrial fibrillation with a slow ventricular response.',
        'Bradicardia sinusal, o fibrilación auricular con respuesta ventricular lenta.',
      ),
      l('PR、QRS和QT均延长。', 'PR, QRS and QT all prolonged.', 'PR, QRS y QT prolongados.'),
      l(
        '寒战产生的肌电伪差可掩盖波形——在多个导联中寻找J波。',
        'Shivering artefact can hide the waves: look for the J wave in several leads.',
        'El artefacto por tiritona puede ocultar las ondas: busca la onda J en varias derivaciones.',
      ),
      l('复温后J波消失。', 'The J waves resolve with rewarming.', 'Las ondas J desaparecen con el recalentamiento.'),
    ],
    criteria: [
      {
        label: l('Osborn波', 'Osborn wave', 'Onda de Osborn'),
        value: l('振幅随核心体温下降而增大', 'Amplitude grows as core temperature falls', 'La amplitud crece al bajar la temperatura central'),
        source: 'Antzelevitch 2016 (J-wave consensus); Mattu 2002',
      },
      {
        label: l('心律失常风险', 'Arrhythmia risk', 'Riesgo de arritmia'),
        value: l('低于约28–30 °C时室颤和停搏风险急剧上升', 'The risk of VF and asystole rises sharply below about 28–30 °C', 'El riesgo de FV y asistolia aumenta bruscamente por debajo de unos 28–30 °C'),
        source: 'Dow 2019 (Wilderness Medical Society)',
      },
    ],
    mechanism: l(
      '低温使左心室心外膜动作电位早期复极的切迹比心内膜更深，两层之间的电压差在QRS末尾表现为J（Osborn）波。低温还减慢起搏细胞、传导和复极，从而出现心动过缓以及PR、QRS和QT延长。',
      'Cooling deepens the early-repolarization notch of the action potential more in the left ventricular epicardium than in the endocardium, and the voltage difference between the two layers appears at the end of the QRS as the J (Osborn) wave. Cold also slows pacemaker cells, conduction and repolarization, which explains the bradycardia and the long PR, QRS and QT.',
      'El frío profundiza la muesca de repolarización precoz del potencial de acción más en el epicardio del ventrículo izquierdo que en el endocardio, y la diferencia de voltaje entre ambas capas aparece al final del QRS como la onda J de Osborn. El frío también enlentece las células marcapasos, la conducción y la repolarización, lo que explica la bradicardia y el alargamiento del PR, el QRS y el QT.',
    ),
    mimics: [
      {
        id: 'early-repolarization',
        discriminator: l(
          '早期复极的J点切迹小，心率和QT正常，体温正常。',
          'Early repolarization has a small J notch with normal rate, normal QT and normal temperature.',
          'La repolarización precoz tiene una muesca J pequeña con frecuencia, QT y temperatura normales.',
        ),
        leads: ['II', 'V4', 'V5', 'V6'],
      },
      {
        id: 'stemi-inferior',
        discriminator: l(
          'Osborn波是J点处的圆顶，伴QT延长和心动过缓，没有冠脉分布和对应性改变。',
          'The Osborn wave is a dome at the J point with a long QT and bradycardia, without a coronary territory or reciprocal change.',
          'La onda de Osborn es una cúpula en el punto J con QT largo y bradicardia, sin territorio coronario ni cambios recíprocos.',
        ),
        leads: ['II', 'III', 'aVF', 'aVL'],
      },
      {
        id: 'muscle-tremor',
        discriminator: l(
          '这里伪差下面仍有心动过缓和J波；单纯肌电干扰时其下的心电图正常。',
          'Here bradycardia and J waves persist beneath the noise; with tremor artefact alone the underlying ECG is normal.',
          'Aquí la bradicardia y las ondas J persisten bajo el ruido; con un artefacto por temblor aislado el ECG subyacente es normal.',
        ),
        leads: ['II', 'V5'],
      },
    ],
    pitfalls: [
      l(
        '把Osborn波读成STEMI而启动导管室。',
        'Reading Osborn waves as STEMI and activating the catheter laboratory.',
        'Interpretar las ondas de Osborn como un IAMCEST y activar la sala de hemodinámica.',
      ),
      l(
        '用普通体温计测量，漏诊重度低体温。',
        'Using an ordinary thermometer and missing severe hypothermia.',
        'Usar un termómetro convencional y pasar por alto una hipotermia grave.',
      ),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '用低温体温计测量核心体温，轻柔搬动患者并复温；持续监护，因为粗暴搬动可诱发室颤。',
        'Measure core temperature with a low-reading thermometer, handle the patient gently and rewarm; monitor continuously because rough handling can trigger VF.',
        'Mide la temperatura central con un termómetro de baja lectura, moviliza al paciente con suavidad y recaliéntalo; monitoriza de forma continua porque una manipulación brusca puede desencadenar una FV.',
      ),
    },
    lessons: ['o5'],
    sources: [REF.antzelevitch2016, REF.mattu2002, R.dow2019],
    aka: ['Osborn wave', 'J wave', 'cold', 'hipotermia', 'onda J', 'onda de Osborn', '低体温', 'Osborn波'],
    exemplar: { scenarios: ['hypothermia'], leads: ['II', 'V3', 'V4', 'V5', 'V6'] },
  },

  // ── acute pericarditis ───────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'pericarditis',
    definition: l(
      '心包炎症，表现为新出现的广泛凹面ST段抬高和PR段压低，对应性改变只见于aVR（常及V1）。',
      'Inflammation of the pericardium, shown by new widespread concave ST elevation and PR depression, with reciprocal change only in aVR (and often V1).',
      'Inflamación del pericardio, que se manifiesta con elevación difusa y cóncava del ST y descenso del PR, de aparición reciente, con cambios recíprocos solo en aVR (y a menudo V1).',
    ),
    features: [
      l(
        '多数导联（Ⅰ、Ⅱ、aVL、aVF、V2–V6）凹面向上的ST段抬高，不符合单一冠脉分布。',
        'Concave ST elevation in most leads (I, II, aVL, aVF, V2–V6) that follows no single coronary territory.',
        'Elevación cóncava del ST en la mayoría de las derivaciones (I, II, aVL, aVF, V2–V6) que no sigue un único territorio coronario.',
      ),
      l(
        'PR段压低（Ⅱ、V5–V6），aVR的PR段抬高。',
        'PR depression (II, V5–V6) with PR elevation in aVR.',
        'Descenso del PR (II, V5–V6) con elevación del PR en aVR.',
      ),
      l(
        '只有aVR（和V1）ST段压低；无Q波，R波不丢失。',
        'ST depression only in aVR (and V1); no Q waves and no loss of R.',
        'Descenso del ST solo en aVR (y V1); sin ondas Q ni pérdida de R.',
      ),
      l(
        'V6的ST/T振幅比>0.25支持心包炎而非早期复极；常伴窦性心动过速。',
        'An ST/T amplitude ratio > 0.25 in V6 favours pericarditis over early repolarization; sinus tachycardia is common.',
        'Un cociente de amplitud ST/T > 0,25 en V6 orienta a pericarditis frente a repolarización precoz; la taquicardia sinusal es frecuente.',
      ),
      l(
        '演变：ST先回到基线，之后T波才倒置（心梗时T倒置常在ST仍抬高时出现）。',
        'Evolution: the ST returns to baseline before the T inverts (in infarction the T often inverts while the ST is still raised).',
        'Evolución: el ST vuelve a la línea de base antes de que la T se invierta (en el infarto la T suele invertirse con el ST aún elevado).',
      ),
    ],
    criteria: [
      {
        label: l('临床诊断标准之一', 'One of the clinical criteria', 'Uno de los criterios clínicos'),
        value: l(
          '新出现的广泛ST抬高或PR压低（与胸痛、心包摩擦音、心包积液中满足≥2项）',
          'New widespread ST elevation or PR depression (≥ 2 of: pain, rub, ECG change, effusion)',
          'Elevación difusa del ST o descenso del PR nuevos (≥ 2 de: dolor, roce, cambio en el ECG, derrame)',
        ),
        source: 'Adler 2015 (ESC pericardial); ESC 2025 myocarditis–pericarditis',
      },
      {
        label: l('与早期复极鉴别', 'Versus early repolarization', 'Frente a repolarización precoz'),
        value: l('V6导联ST抬高/T波振幅>0.25支持心包炎', 'ST elevation / T amplitude in V6 > 0.25 favours pericarditis', 'Elevación del ST / amplitud de la T en V6 > 0,25 orienta a pericarditis'),
        source: 'Ginzton 1982',
      },
    ],
    mechanism: l(
      '炎症损伤几乎整个心脏表面的心外膜层，ST向量从各方向指向心尖，使除aVR外的大多数导联ST段抬高，aVR从相反方向观察。心房也受累，其损伤电流使PR段压低，aVR同样反向显示为PR段抬高。',
      'Inflammation injures the thin epicardial layer over almost the whole heart, so the ST vector points toward the apex and lifts the ST in most leads except aVR, which looks from the opposite direction. The atria are inflamed too, and their injury current depresses the PR segment, which aVR again shows in reverse as PR elevation.',
      'La inflamación lesiona la fina capa epicárdica de casi todo el corazón, de modo que el vector del ST apunta hacia la punta y eleva el ST en la mayoría de las derivaciones salvo aVR, que mira desde el lado opuesto. Las aurículas también están inflamadas y su corriente de lesión desciende el segmento PR, que aVR muestra de nuevo al revés como elevación del PR.',
    ),
    mimics: [
      {
        id: 'stemi-inferior',
        discriminator: l(
          '下壁STEMI时Ⅲ抬高>Ⅱ，aVL有对应性压低，ST平直或上凸；心包炎Ⅱ≥Ⅲ，aVL无压低。',
          'Inferior STEMI has III > II, reciprocal depression in aVL and a straight or convex ST; pericarditis has II ≥ III and no depression in aVL.',
          'El IAMCEST inferior tiene III > II, descenso recíproco en aVL y ST rectilíneo o convexo; la pericarditis tiene II ≥ III y no desciende aVL.',
        ),
        leads: ['II', 'III', 'aVL'],
      },
      {
        id: 'early-repolarization',
        discriminator: l(
          '早期复极无PR段压低，V6的ST/T比≤0.25，J点切迹，多年不变。',
          'Early repolarization has no PR depression, an ST/T ratio ≤ 0.25 in V6, a J notch and no change over years.',
          'La repolarización precoz no tiene descenso del PR, su cociente ST/T en V6 es ≤ 0,25, presenta muesca J y no cambia en años.',
        ),
        leads: ['V5', 'V6', 'II'],
      },
      {
        id: 'stemi-anterolateral',
        discriminator: l(
          '前侧壁STEMI有Ⅲ、aVF对应性压低，ST上凸，可出现Q波。',
          'Anterolateral STEMI has reciprocal depression in III and aVF, a convex ST and may develop Q waves.',
          'El IAMCEST anterolateral tiene descenso recíproco en III y aVF, ST convexo y puede desarrollar ondas Q.',
        ),
        leads: ['III', 'aVF', 'V3', 'V4'],
      },
    ],
    pitfalls: [
      l(
        '因“导联多”就诊断心包炎——先排除对应性压低（aVR、V1以外）和Ⅲ>Ⅱ。',
        'Calling it pericarditis because “many leads” are involved: first exclude reciprocal depression outside aVR and V1, and III > II.',
        'Diagnosticar pericarditis porque hay «muchas derivaciones»: descarta antes un descenso recíproco fuera de aVR y V1, y III > II.',
      ),
      l(
        '忘记查肌钙蛋白（心肌心包炎）和超声（积液、压塞）。',
        'Forgetting troponin (myopericarditis) and echocardiography (effusion, tamponade).',
        'Olvidar la troponina (miopericarditis) y la ecocardiografía (derrame, taponamiento).',
      ),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '先排除STEMI（对应性改变、冠脉分布、复查心电图）；再做超声心动图和肌钙蛋白，寻找积液或心肌炎。',
        'Exclude STEMI first (reciprocal change, coronary territory, serial ECGs); then confirm with echocardiography and troponin, looking for effusion or myocarditis.',
        'Descarta primero un IAMCEST (cambios recíprocos, territorio coronario, ECG seriados); después confirma con ecocardiografía y troponina, buscando derrame o miocarditis.',
      ),
    },
    lessons: ['o7', 'i11'],
    sources: [REF.adler2015, REF.escPeri2025, R.ginzton1982, REF.udmi2018],
    aka: ['acute pericarditis', 'PR depression', 'Spodick sign', 'pericarditis aguda', '急性心包炎', 'PR段压低'],
    exemplar: { scenarios: ['pericarditis'], leads: ['II', 'V5', 'V6', 'aVR', 'V1'] },
  },

  // ── pericardial effusion ─────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'pericardial-effusion',
    definition: l(
      '心包腔积液，使QRS电压降低；大量积液时心脏摆动产生电交替，伴心动过速时提示心脏压塞。',
      'Fluid in the pericardial sac, which lowers QRS voltage and, when large, lets the heart swing and causes electrical alternans; with tachycardia this suggests tamponade.',
      'Líquido en el saco pericárdico, que reduce el voltaje del QRS y, si es abundante, deja que el corazón oscile y produce alternancia eléctrica; con taquicardia sugiere taponamiento.',
    ),
    features: [
      l(
        'QRS低电压：所有肢体导联<5 mm和/或所有胸导联<10 mm。',
        'Low QRS voltage: all limb leads < 5 mm and/or all chest leads < 10 mm.',
        'Bajo voltaje del QRS: todas las derivaciones de los miembros < 5 mm y/o todas las precordiales < 10 mm.',
      ),
      l('窦性心动过速。', 'Sinus tachycardia.', 'Taquicardia sinusal.'),
      l(
        '电交替：QRS振幅逐搏交替变化；低电压+心动过速+电交替提示压塞。',
        'Electrical alternans: QRS amplitude alternating beat to beat; low voltage + tachycardia + alternans suggests tamponade.',
        'Alternancia eléctrica: amplitud del QRS que alterna latido a latido; bajo voltaje + taquicardia + alternancia sugieren taponamiento.',
      ),
      l(
        '可同时有心包炎的ST、PR改变。',
        'Pericarditis ST and PR changes may coexist.',
        'Pueden coexistir los cambios del ST y del PR de la pericarditis.',
      ),
      l(
        '心电图不敏感：心电图正常不能排除积液，需超声心动图。',
        'The ECG is insensitive: a normal ECG does not exclude an effusion, so echocardiography is needed.',
        'El ECG es poco sensible: un ECG normal no descarta un derrame, así que hace falta una ecocardiografía.',
      ),
    ],
    criteria: [
      {
        label: l('低电压', 'Low voltage', 'Bajo voltaje'),
        value: l(
          '所有肢体导联QRS峰-峰值<5 mm（0.5 mV）和/或所有胸导联<10 mm（1.0 mV）',
          'Peak-to-peak QRS < 5 mm (0.5 mV) in all limb leads and/or < 10 mm (1.0 mV) in all chest leads',
          'QRS pico a pico < 5 mm (0,5 mV) en todas las derivaciones de los miembros y/o < 10 mm (1,0 mV) en todas las precordiales',
        ),
        source: 'Mason 2007 (AHA Part II); Hancock 2009',
      },
      {
        label: l('大量积液或压塞', 'Large effusion or tamponade', 'Derrame abundante o taponamiento'),
        value: l('低电压、电交替、窦性心动过速', 'Low voltage, electrical alternans, sinus tachycardia', 'Bajo voltaje, alternancia eléctrica, taquicardia sinusal'),
        source: 'Adler 2015 (ESC pericardial)',
      },
    ],
    mechanism: l(
      '心脏周围的液体在电流到达胸壁之前使一部分电流短路，并使心脏远离电极，因此每个波群都被记录得更小。大量积液时心脏随每次搏动在液体中摆动，位置变化使QRS振幅逐搏交替。',
      'Fluid around the heart short-circuits part of the current before it reaches the chest wall and moves the heart away from the electrodes, so every complex is recorded smaller. In a large effusion the heart swings within the fluid with each beat, and its changing position makes the QRS amplitude alternate from beat to beat.',
      'El líquido que rodea al corazón cortocircuita parte de la corriente antes de que llegue a la pared torácica y aleja el corazón de los electrodos, de modo que todos los complejos se registran más pequeños. En un derrame abundante el corazón oscila dentro del líquido con cada latido, y el cambio de posición hace que la amplitud del QRS alterne latido a latido.',
    ),
    mimics: [
      {
        id: 'low-voltage',
        discriminator: l(
          '肥胖、肺气肿、淀粉样变等其他低电压原因没有电交替和心动过速；超声心动图可确定。',
          'Other causes of low voltage (obesity, emphysema, amyloid) lack alternans and tachycardia; echocardiography decides.',
          'Otras causas de bajo voltaje (obesidad, enfisema, amiloidosis) no tienen alternancia ni taquicardia; decide la ecocardiografía.',
        ),
        leads: ['I', 'II', 'III', 'V1', 'V6'],
      },
      {
        id: 'copd-pattern',
        discriminator: l(
          '慢阻肺图形为肢体导联低电压伴电轴右偏、肺型P波和R波递增不良。',
          'The COPD pattern gives low limb-lead voltage with a rightward axis, tall P waves and poor R-wave progression.',
          'El patrón de EPOC da bajo voltaje en los miembros con eje a la derecha, P altas y mala progresión de la R.',
        ),
        leads: ['II', 'III', 'aVF', 'V1', 'V2', 'V3'],
      },
      {
        id: 'pericarditis',
        discriminator: l(
          '单纯心包炎为广泛ST抬高和PR压低，电压正常。',
          'Pericarditis alone gives widespread ST elevation and PR depression with normal voltage.',
          'La pericarditis sola da elevación difusa del ST y descenso del PR con voltaje normal.',
        ),
        leads: ['II', 'V5', 'aVR'],
      },
    ],
    pitfalls: [
      l(
        '把电交替当作伪差或呼吸变化。',
        'Dismissing electrical alternans as artefact or respiratory variation.',
        'Descartar la alternancia eléctrica como artefacto o variación respiratoria.',
      ),
      l(
        '心电图“正常”就排除积液。',
        'Excluding an effusion because the ECG is “normal”.',
        'Descartar un derrame porque el ECG es «normal».',
      ),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '尽快做超声心动图；伴低血压、心动过速和电交替时按心脏压塞处理，立即请求心包穿刺。',
        'Arrange echocardiography now; with hypotension, tachycardia and alternans treat it as tamponade and call for pericardiocentesis immediately.',
        'Solicita ya una ecocardiografía; con hipotensión, taquicardia y alternancia trátalo como un taponamiento y pide una pericardiocentesis de inmediato.',
      ),
    },
    lessons: ['o7', 'h4'],
    sources: [REF.adler2015, REF.escPeri2025, REF.mason2007, REF.hancock2009],
    aka: ['effusion', 'tamponade', 'electrical alternans', 'derrame pericárdico', 'taponamiento', '心包积液', '心脏压塞'],
    exemplar: { scenarios: ['pericardial-effusion', 'electrical-alternans'], leads: ['I', 'II', 'V2', 'V3'] },
  },

  // ── acute pulmonary embolism ─────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'pulmonary-embolism',
    definition: l(
      '肺动脉急性阻塞，心电图既不敏感也不特异：最常见的是窦性心动过速，急性右心室负荷征象提示栓塞较重。',
      'Acute obstruction of the pulmonary arteries whose ECG is insensitive and nonspecific: sinus tachycardia is the commonest finding, and signs of acute RV strain mark a more severe embolism.',
      'Obstrucción aguda de las arterias pulmonares cuyo ECG es poco sensible e inespecífico: la taquicardia sinusal es el hallazgo más frecuente, y los signos de sobrecarga aguda del VD indican una embolia más grave.',
    ),
    features: [
      l(
        '窦性心动过速最常见，轻症时可能是唯一表现。',
        'Sinus tachycardia is the commonest finding and may be the only one in milder cases.',
        'La taquicardia sinusal es el hallazgo más frecuente y puede ser el único en los casos leves.',
      ),
      l(
        '右心室负荷：V1–V4 T波倒置（±Ⅲ、aVF），是重症肺栓塞最常见的表现。',
        'RV strain: T inversion in V1–V4 (± III, aVF), the commonest finding in severe embolism.',
        'Sobrecarga del VD: T negativas en V1–V4 (± III, aVF), el hallazgo más frecuente en la embolia grave.',
      ),
      l(
        '新出现的不完全或完全性右束支阻滞、V1呈QR、电轴右移、aVR/V1 ST段抬高。',
        'New incomplete or complete RBBB, a QR in V1, a rightward axis shift, ST elevation in aVR and V1.',
        'BRD incompleto o completo nuevo, QR en V1, desplazamiento del eje a la derecha, elevación del ST en aVR y V1.',
      ),
      l(
        'S1Q3T3既不敏感也不特异——不能据此诊断或排除。',
        'S1Q3T3 is neither sensitive nor specific: it can neither make nor exclude the diagnosis.',
        'El S1Q3T3 no es sensible ni específico: no sirve para diagnosticar ni para descartar.',
      ),
      l(
        '可出现房颤或房扑；改变常为一过性，心电图也可完全正常。',
        'AF or flutter can occur; the changes are often transient and the ECG can be entirely normal.',
        'Puede aparecer FA o flutter; los cambios suelen ser transitorios y el ECG puede ser completamente normal.',
      ),
    ],
    criteria: [
      {
        label: l('右心室负荷征象', 'RV-strain signs', 'Signos de sobrecarga del VD'),
        value: l(
          'V1–V4 T倒置、V1呈QR、S1Q3T3、不完全/完全性右束支阻滞；多见于较重的肺栓塞，提示预后较差',
          'T inversion V1–V4, QR in V1, S1Q3T3, incomplete or complete RBBB; mainly in more severe PE and linked to worse outcome',
          'T negativas en V1–V4, QR en V1, S1Q3T3, BRD incompleto o completo; sobre todo en la embolia más grave y asociados a peor pronóstico',
        ),
        source: 'Konstantinides 2019 (ESC PE)',
      },
      {
        label: l('诊断价值', 'Diagnostic value', 'Valor diagnóstico'),
        value: l(
          '心电图不能确诊也不能排除；诊断依靠临床概率、D-二聚体和CT肺动脉造影',
          'The ECG neither confirms nor excludes PE; diagnosis rests on clinical probability, D-dimer and CT pulmonary angiography',
          'El ECG no confirma ni descarta la embolia; el diagnóstico se basa en la probabilidad clínica, el dímero D y la angio-TC pulmonar',
        ),
        source: 'Konstantinides 2019 (ESC PE)',
      },
    ],
    mechanism: l(
      '肺动脉压力突然升高使右心室扩张和受牵拉，右心室激动延迟、复极异常，因此右胸和下壁导联T波倒置、电轴右移，有时出现右束支阻滞。这些改变反映的是右心负荷而不是血栓本身，所以小的栓子心电图可正常，压力下降后征象也随之消失。',
      'A sudden rise in pulmonary pressure dilates and strains the right ventricle, which delays its activation and disturbs its repolarization, so the right chest and inferior leads show T inversion, the axis shifts right and right bundle branch block may appear. The changes follow the strain rather than the clot, which is why small emboli leave the ECG normal and why the signs fade as the pressure falls.',
      'Un aumento brusco de la presión pulmonar dilata y sobrecarga el ventrículo derecho, lo que retrasa su activación y altera su repolarización, de modo que las precordiales derechas y las inferiores muestran T negativas, el eje se desplaza a la derecha y puede aparecer un bloqueo de rama derecha. Los cambios siguen a la sobrecarga y no al trombo, por eso los émbolos pequeños dejan el ECG normal y los signos desaparecen cuando baja la presión.',
    ),
    mimics: [
      {
        id: 'wellens',
        discriminator: l(
          'Wellens见于胸痛缓解后，V2–V3深倒或双向T波，无心动过速和右心负荷征象。',
          'Wellens follows resolved chest pain with deep or biphasic T in V2–V3, without tachycardia or RV-strain signs.',
          'El Wellens sigue a un dolor torácico resuelto, con T profundas o bifásicas en V2–V3, sin taquicardia ni signos de sobrecarga del VD.',
        ),
        leads: ['V2', 'V3'],
      },
      {
        id: 't-inversion-ischemic',
        discriminator: l(
          '肺栓塞的T波倒置同时见于V1–V4和Ⅲ（右心室分布），常伴窦速；缺血性倒置符合冠脉分布。',
          'In PE the T inversion involves both V1–V4 and III (a right-heart distribution), usually with sinus tachycardia; ischaemic inversion follows a coronary territory.',
          'En la embolia las T negativas afectan a la vez a V1–V4 y a III (distribución del corazón derecho), habitualmente con taquicardia sinusal; la inversión isquémica sigue un territorio coronario.',
        ),
        leads: ['V1', 'V2', 'V3', 'V4', 'III'],
      },
      {
        id: 'rvh',
        discriminator: l(
          '慢性右心室肥厚为V1高R波、稳定的电轴右偏和肺型P波，无急性心动过速。',
          'Chronic RVH gives a tall R in V1, a stable right axis and tall P waves, without acute tachycardia.',
          'La HVD crónica da una R alta en V1, un eje derecho estable y P altas, sin taquicardia aguda.',
        ),
        leads: ['V1', 'I', 'II'],
      },
    ],
    pitfalls: [
      l(
        '用S1Q3T3诊断或排除肺栓塞。',
        'Using S1Q3T3 to diagnose or exclude pulmonary embolism.',
        'Usar el S1Q3T3 para diagnosticar o descartar una embolia pulmonar.',
      ),
      l(
        '把V1–V4 T波倒置只当作前壁缺血，而不考虑肺栓塞。',
        'Reading T inversion in V1–V4 only as anterior ischaemia without considering embolism.',
        'Interpretar las T negativas en V1–V4 solo como isquemia anterior sin considerar una embolia.',
      ),
      l(
        '心电图正常就放心。',
        'Being reassured by a normal ECG.',
        'Tranquilizarse con un ECG normal.',
      ),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '不要用心电图确诊或排除肺栓塞：评估临床概率并安排CT肺动脉造影（不稳定者床旁超声）；伴休克时立即按高危肺栓塞处理。',
        'Do not use the ECG to rule PE in or out: assess clinical probability and arrange CT pulmonary angiography (bedside echocardiography if unstable); with shock, treat as high-risk PE now.',
        'No uses el ECG para confirmar o descartar la embolia: valora la probabilidad clínica y solicita una angio-TC pulmonar (ecocardiografía a pie de cama si hay inestabilidad); con shock, trátala ya como embolia de alto riesgo.',
      ),
    },
    lessons: ['o6', 'h3'],
    sources: [REF.escPe2019, REF.hancock2009],
    aka: ['PE', 'S1Q3T3', 'McGinn-White', 'acute cor pulmonale', 'TEP', 'tromboembolismo pulmonar', '肺栓塞', '急性肺心病'],
    exemplar: { scenarios: ['pulmonary-embolism'], leads: ['V1', 'V2', 'V3', 'V4', 'I', 'III'] },
  },

  // ── Brugada type 1 pattern ───────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'brugada-type1',
    definition: l(
      '至少一个右胸导联（V1–V2，第2–4肋间）出现≥2 mm的穹窿形ST段抬高并下降至倒置T波——唯一具有诊断意义的Brugada图形。',
      'Coved ST elevation ≥ 2 mm in at least one right precordial lead (V1–V2, recorded in the 2nd–4th intercostal space) descending into a negative T wave, the only diagnostic Brugada pattern.',
      'Elevación del ST en cúpula ≥ 2 mm en al menos una precordial derecha (V1–V2, registrada en el 2.º–4.º espacio intercostal) que desciende hacia una onda T negativa: el único patrón de Brugada diagnóstico.',
    ),
    features: [
      l(
        'V1–V2：J点/ST段抬高≥2 mm，呈穹窿形（上凸后下斜），接对称倒置的T波。',
        'V1–V2: J-point and ST elevation ≥ 2 mm with a coved shape (convex, then sloping down) into a symmetric negative T.',
        'V1–V2: elevación del punto J y del ST ≥ 2 mm en cúpula (convexa y luego descendente) hacia una T negativa simétrica.',
      ),
      l('一个导联符合即可。', 'One lead is enough.', 'Basta con una derivación.'),
      l(
        '可能只在高位（第2–3肋间）放置V1–V2时出现。',
        'It may appear only when V1–V2 are placed high (2nd–3rd intercostal space).',
        'Puede aparecer solo al colocar V1–V2 altas (2.º–3.º espacio intercostal).',
      ),
      l(
        '图形动态变化：发热、钠通道阻滞剂、迷走张力增高可诱发或加重。',
        'The pattern is dynamic: fever, sodium-channel blockers and high vagal tone can unmask or accentuate it.',
        'El patrón es dinámico: la fiebre, los bloqueantes de canales de sodio y el tono vagal alto pueden desenmascararlo o acentuarlo.',
      ),
      l(
        '其他导联正常，无对应性压低；先排除表型模拟（高钾、钠通道阻滞剂中毒、缺血、右心室受压）。',
        'Other leads are normal, with no reciprocal depression; first exclude phenocopies (hyperkalaemia, sodium-channel blocker toxicity, ischaemia, RV compression).',
        'El resto de derivaciones es normal, sin descenso recíproco; descarta antes las fenocopias (hiperpotasemia, intoxicación por bloqueantes de canales de sodio, isquemia, compresión del VD).',
      ),
    ],
    criteria: [
      {
        label: l('1型（诊断性）图形', 'Type 1 (diagnostic) pattern', 'Patrón tipo 1 (diagnóstico)'),
        value: l(
          '第2、3或4肋间的V1–V2中≥1个导联穹窿形ST抬高≥2 mm（0.2 mV）后接倒置T波，自发或药物诱发',
          'Coved ST elevation ≥ 2 mm (0.2 mV) followed by a negative T in ≥ 1 of V1–V2 in the 2nd, 3rd or 4th intercostal space, spontaneous or drug-induced',
          'Elevación del ST en cúpula ≥ 2 mm (0,2 mV) seguida de T negativa en ≥ 1 de V1–V2 en el 2.º, 3.º o 4.º espacio intercostal, espontánea o inducida por fármacos',
        ),
        source: 'Zeppenfeld 2022 (ESC VA/SCD); Bayés de Luna 2012 (Brugada consensus)',
      },
      {
        label: l('Brugada综合征的诊断', 'Diagnosing Brugada syndrome', 'Diagnóstico del síndrome de Brugada'),
        value: l(
          '自发1型图形即可诊断；药物诱发的1型还需心律失常性晕厥、记录到室颤/多形性室速或家族史',
          'A spontaneous type 1 pattern is diagnostic; a drug-induced type 1 also needs arrhythmic syncope, documented VF or polymorphic VT, or a family history',
          'Un tipo 1 espontáneo es diagnóstico; un tipo 1 inducido por fármacos requiere además síncope arrítmico, FV o TV polimorfa documentada, o antecedentes familiares',
        ),
        source: 'Zeppenfeld 2022 (ESC VA/SCD); Antzelevitch 2016 (Shanghai score)',
      },
    ],
    mechanism: l(
      '右心室流出道异常——其心外膜的一过性外向电流突出或传导减慢——在QRS末尾形成电压梯度，其上方的V1、V2记录为穹窿形ST抬高。当该处心外膜复极晚于心内膜时，同一导联的T波转为倒置。',
      'An abnormal right ventricular outflow tract, with a prominent transient outward current or slowed conduction in its epicardium, creates a voltage gradient at the end of the QRS that the leads over it, V1 and V2, record as a coved ST elevation. When epicardial repolarization there is delayed beyond the endocardium, the T wave in the same leads turns negative.',
      'Un tracto de salida del ventrículo derecho anómalo, con una corriente transitoria de salida prominente o una conducción lenta en su epicardio, crea un gradiente de voltaje al final del QRS que las derivaciones situadas encima, V1 y V2, registran como elevación del ST en cúpula. Cuando la repolarización epicárdica de esa zona se retrasa respecto al endocardio, la onda T de esas mismas derivaciones se vuelve negativa.',
    ),
    mimics: [
      {
        id: 'brugada-type2',
        discriminator: l(
          '2型为马鞍形：ST下降后仍高于基线≥0.5 mm，T波直立或双向，不具诊断意义。',
          'Type 2 is a saddleback: the ST falls but stays ≥ 0.5 mm above baseline, with a positive or biphasic T, and it is not diagnostic.',
          'El tipo 2 es en silla de montar: el ST desciende pero se mantiene ≥ 0,5 mm sobre la línea de base, con T positiva o bifásica, y no es diagnóstico.',
        ),
        leads: ['V1', 'V2'],
      },
      {
        id: 'rbbb',
        discriminator: l(
          '右束支阻滞的r′窄而锐，ST不呈穹窿形，Ⅰ和V6有宽S波。',
          'In RBBB the r′ is narrow and sharp, the ST is not coved, and I and V6 have a wide S wave.',
          'En el BRD la r′ es estrecha y aguda, el ST no es en cúpula, e I y V6 tienen una S ancha.',
        ),
        leads: ['V1', 'V2', 'I', 'V6'],
      },
      {
        id: 'stemi-anteroseptal',
        discriminator: l(
          '前间壁STEMI抬高延及V3–V4，随时间演变，并伴胸痛和肌钙蛋白升高。',
          'Anteroseptal STEMI extends to V3–V4, evolves over time and comes with chest pain and rising troponin.',
          'El IAMCEST anteroseptal se extiende a V3–V4, evoluciona en el tiempo y se acompaña de dolor torácico y elevación de la troponina.',
        ),
        leads: ['V1', 'V2', 'V3', 'V4'],
      },
      {
        id: 'hyperkalemia',
        discriminator: l(
          '高钾的Brugada样图形伴P波低平、QRS增宽和T波高尖，补钾纠正后消失。',
          'The Brugada-like pattern of hyperkalaemia comes with flat P waves, a wide QRS and peaked T waves, and vanishes when potassium is corrected.',
          'El patrón similar al Brugada de la hiperpotasemia se acompaña de P aplanadas, QRS ancho y T picudas, y desaparece al corregir el potasio.',
        ),
        leads: ['V1', 'V2', 'II'],
      },
    ],
    pitfalls: [
      l(
        '把马鞍形（2型）图形诊断为Brugada综合征。',
        'Diagnosing Brugada syndrome from a saddleback (type 2) pattern.',
        'Diagnosticar un síndrome de Brugada a partir de un patrón en silla de montar (tipo 2).',
      ),
      l(
        '晕厥患者不做高位V1–V2记录。',
        'Not recording high V1–V2 in a patient with syncope.',
        'No registrar V1–V2 altas en un paciente con síncope.',
      ),
      l(
        '忘记表型模拟：高钾、三环类抗抑郁药过量和发热都可产生同样图形。',
        'Forgetting phenocopies: hyperkalaemia, tricyclic overdose and fever can all produce the same pattern.',
        'Olvidar las fenocopias: la hiperpotasemia, la sobredosis de tricíclicos y la fiebre pueden producir el mismo patrón.',
      ),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '有晕厥、发热或用药诱因时进行心电监护；及时退热，停用钠通道阻滞药物，查血钾，并转诊心脏电生理（有晕厥者紧急转诊）。',
        'Monitor the rhythm if there was syncope, fever or a drug trigger; treat fever promptly, stop sodium-channel-blocking drugs, check potassium and refer to cardiac electrophysiology (urgently after syncope).',
        'Monitoriza el ritmo si hubo síncope, fiebre o un fármaco desencadenante; trata la fiebre con rapidez, suspende los bloqueantes de canales de sodio, determina el potasio y deriva a electrofisiología (con urgencia tras un síncope).',
      ),
    },
    lessons: ['h8', 'i11'],
    sources: [REF.escVa2022, R.bayesBrugada2012, REF.antzelevitch2016],
    aka: ['Brugada', 'coved ST', 'Brugada pattern', 'patrón de Brugada', 'Brugada综合征', '穹窿形ST抬高'],
    exemplar: { scenarios: ['brugada-type1'], leads: ['V1', 'V2', 'V3'] },
  },

  // ── Brugada type 2 pattern ───────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'brugada-type2',
    definition: l(
      'V1–V2马鞍形ST抬高（高起点r′≥2 mm，ST最低点高于基线≥0.5 mm，T波直立或双向），提示但不能诊断Brugada综合征。',
      'Saddleback ST elevation in V1–V2 (high take-off r′ ≥ 2 mm, ST trough ≥ 0.5 mm above baseline, positive or biphasic T), suggestive of Brugada syndrome but not diagnostic.',
      'Elevación del ST en silla de montar en V1–V2 (r′ de despegue alto ≥ 2 mm, valle del ST ≥ 0,5 mm sobre la línea de base, T positiva o bifásica), sugestiva de síndrome de Brugada pero no diagnóstica.',
    ),
    features: [
      l(
        'V1–V2：高起点的r′≥2 mm，随后ST下降但仍高于基线≥0.5 mm（马鞍形）。',
        'V1–V2: a high take-off r′ ≥ 2 mm, then an ST that falls but stays ≥ 0.5 mm above baseline (the saddle).',
        'V1–V2: r′ de despegue alto ≥ 2 mm y después un ST que desciende pero se mantiene ≥ 0,5 mm sobre la línea de base (la silla).',
      ),
      l('V2 T波直立（V1可变）。', 'Positive T in V2 (variable in V1).', 'T positiva en V2 (variable en V1).'),
      l(
        'r′基底宽（β角大），与不完全性右束支阻滞窄而锐的r′不同。',
        'The r′ is wide at its base (large β angle), unlike the narrow, sharp r′ of incomplete RBBB.',
        'La r′ es ancha en su base (ángulo β amplio), a diferencia de la r′ estrecha y aguda del BRD incompleto.',
      ),
      l(
        '高位（第2–3肋间）记录V1–V2，可能转为1型。',
        'Record V1–V2 higher (2nd–3rd intercostal space): it may convert to type 1.',
        'Registra V1–V2 más altas (2.º–3.º espacio intercostal): puede convertirse en tipo 1.',
      ),
    ],
    criteria: [
      {
        label: l('马鞍形图形', 'Saddleback pattern', 'Patrón en silla de montar'),
        value: l(
          'r′≥2 mm，ST最低点≥0.5 mm，T波直立或双向；仅提示性，不能诊断',
          'r′ ≥ 2 mm, ST trough ≥ 0.5 mm, positive or biphasic T; suggestive only, not diagnostic',
          'r′ ≥ 2 mm, valle del ST ≥ 0,5 mm, T positiva o bifásica; solo sugestivo, no diagnóstico',
        ),
        source: 'Bayés de Luna 2012 (Brugada consensus); Zeppenfeld 2022 (ESC VA/SCD)',
      },
      {
        label: l('与不完全性右束支阻滞鉴别', 'Versus incomplete RBBB', 'Frente a BRD incompleto'),
        value: l('r′的β角>58°支持Brugada图形', 'A β angle of the r′ > 58° favours a Brugada pattern', 'Un ángulo β de la r′ > 58° orienta a patrón de Brugada'),
        source: 'Bayés de Luna 2012 (Brugada consensus)',
      },
    ],
    mechanism: l(
      '与1型相同的右心室流出道异常，但程度较轻或记录电极较远，只产生马鞍形ST抬高，而没有使T波倒置的心外膜晚期复极。电极放得更高，或发热、药物加大电压梯度时，可转为具有诊断意义的穹窿形图形。',
      'The same right ventricular outflow tract abnormality as in type 1, but milder or recorded from further away, produces only a saddle-shaped ST elevation without the late epicardial repolarization that would invert the T wave. It can turn into the diagnostic coved pattern when leads are placed higher or when fever or drugs accentuate the gradient.',
      'La misma anomalía del tracto de salida del ventrículo derecho que en el tipo 1, pero más leve o registrada desde más lejos, produce solo una elevación del ST en silla de montar, sin la repolarización epicárdica tardía que invertiría la T. Puede convertirse en el patrón diagnóstico en cúpula al colocar los electrodos más altos o cuando la fiebre o los fármacos acentúan el gradiente.',
    ),
    mimics: [
      {
        id: 'brugada-type1',
        discriminator: l(
          '1型为穹窿形ST接倒置T波，具有诊断意义。',
          'Type 1 is a coved ST into a negative T and is diagnostic.',
          'El tipo 1 es un ST en cúpula hacia una T negativa y es diagnóstico.',
        ),
        leads: ['V1', 'V2'],
      },
      {
        id: 'irbbb',
        discriminator: l(
          '不完全性右束支阻滞的r′窄而锐（β角小），ST不抬高，Ⅰ和V6有S波。',
          'Incomplete RBBB has a narrow, sharp r′ (small β angle), no ST elevation, and an S wave in I and V6.',
          'El BRD incompleto tiene una r′ estrecha y aguda (ángulo β pequeño), sin elevación del ST, y S en I y V6.',
        ),
        leads: ['V1', 'V2', 'I', 'V6'],
      },
      {
        id: 'precordial-misplacement',
        discriminator: l(
          'V1–V2放置过高会在正常人中产生rSr′和ST轻度抬高；在正确位置复查后正常。',
          'V1–V2 placed too high can give rSr′ with slight ST elevation in a normal person, which normalizes when re-recorded in the right place.',
          'V1–V2 colocadas demasiado altas pueden dar rSr′ con ligera elevación del ST en una persona normal, que se normaliza al registrar en la posición correcta.',
        ),
        leads: ['V1', 'V2'],
      },
    ],
    pitfalls: [
      l(
        '把2型图形报告为Brugada综合征，或在有晕厥、家族史时不做高位导联就放过。',
        'Reporting type 2 as Brugada syndrome, or dismissing it without high leads when there is syncope or a family history.',
        'Informar un tipo 2 como síndrome de Brugada, o descartarlo sin derivaciones altas cuando hay síncope o antecedentes familiares.',
      ),
    ],
    urgency: {
      level: 'routine',
      next: l(
        '在第2、3肋间记录V1–V2；有晕厥、猝死家族史或高位导联出现穹窿形图形时转诊心内科。',
        'Record V1–V2 in the 2nd and 3rd intercostal spaces; refer to cardiology if there is syncope, a family history of sudden death or a coved pattern in the high leads.',
        'Registra V1–V2 en el 2.º y 3.º espacio intercostal; deriva a cardiología si hay síncope, antecedentes familiares de muerte súbita o un patrón en cúpula en las derivaciones altas.',
      ),
    },
    lessons: ['h8'],
    sources: [R.bayesBrugada2012, REF.escVa2022, REF.antzelevitch2016],
    aka: ['saddleback', 'Brugada type 2', 'silla de montar', 'Brugada 2型', '马鞍形ST抬高'],
    exemplar: { scenarios: ['brugada-type2'], leads: ['V1', 'V2', 'V3'] },
  },

  // ── hypertrophic cardiomyopathy ──────────────────────────────────────────────────────────────────────────────────
  {
    id: 'hcm',
    definition: l(
      '肥厚型心肌病：多数患者心电图异常，表现为左心室高电压伴复极异常、深而窄的Q波和左心房异常——年轻人出现时应做超声心动图。',
      'Hypertrophic cardiomyopathy: the ECG is abnormal in most patients, with LVH voltage and repolarization abnormalities, deep narrow Q waves and left atrial abnormality, and in a young person it should prompt echocardiography.',
      'Miocardiopatía hipertrófica: el ECG es anormal en la mayoría de los pacientes, con voltaje de HVI y alteraciones de la repolarización, ondas Q profundas y estrechas y anomalía auricular izquierda, y en una persona joven obliga a hacer una ecocardiografía.',
    ),
    features: [
      l(
        '左心室高电压伴ST段压低和T波倒置（常见于侧壁）。',
        'LVH voltage with ST depression and T inversion (often lateral).',
        'Voltaje de HVI con descenso del ST y T negativas (a menudo laterales).',
      ),
      l(
        '下壁（Ⅱ、Ⅲ、aVF）和/或侧壁（Ⅰ、aVL、V4–V6）出现深（>3 mm）而常较窄的Q波，来自肥厚的室间隔。',
        'Deep (> 3 mm), often narrow Q waves in inferior (II, III, aVF) and/or lateral (I, aVL, V4–V6) leads, from the thick septum.',
        'Ondas Q profundas (> 3 mm), a menudo estrechas, en derivaciones inferiores (II, III, aVF) y/o laterales (I, aVL, V4–V6), por el tabique engrosado.',
      ),
      l('左心房异常；可有心房颤动。', 'Left atrial abnormality; atrial fibrillation may occur.', 'Anomalía auricular izquierda; puede haber fibrilación auricular.'),
      l(
        '表型模拟的警示：短PR或预激（PRKAG2、Danon、Pompe），室壁厚而电压低（淀粉样变）。',
        'Phenocopy red flags: short PR or pre-excitation (PRKAG2, Danon, Pompe), and low voltage despite thick walls (amyloid).',
        'Señales de fenocopia: PR corto o preexcitación (PRKAG2, Danon, Pompe) y bajo voltaje pese a paredes gruesas (amiloidosis).',
      ),
    ],
    criteria: [
      {
        label: l('心电图敏感性', 'ECG sensitivity', 'Sensibilidad del ECG'),
        value: l('多数患者心电图异常，正常者仅占少数', 'The ECG is abnormal in most patients and normal in only a small minority', 'El ECG es anormal en la mayoría de los pacientes y normal solo en una pequeña minoría'),
        source: 'Arbelo 2023 (ESC cardiomyopathies); Ommen 2024 (AHA/ACC HCM)',
      },
      {
        label: l('病理性Q波', 'Pathological Q waves', 'Ondas Q patológicas'),
        value: l('≥2个相邻导联（aVR除外）Q波宽>40 ms或深>3 mm（或>R波的25%）', 'Q > 40 ms wide or > 3 mm deep (or > 25% of R) in ≥ 2 contiguous leads other than aVR', 'Q > 40 ms de anchura o > 3 mm de profundidad (o > 25 % de la R) en ≥ 2 derivaciones contiguas distintas de aVR'),
        source: 'Elliott 2014 (ESC HCM); Arbelo 2023 (ESC cardiomyopathies)',
      },
      {
        label: l('运动员中的异常表现', 'Abnormal in athletes', 'Anormal en deportistas'),
        value: l(
          '侧壁或下侧壁T倒置≥1 mm、ST压低≥0.5 mm或病理性Q波需进一步检查',
          'Lateral or inferolateral T inversion ≥ 1 mm, ST depression ≥ 0.5 mm or pathological Q waves need further testing',
          'La T negativa lateral o inferolateral ≥ 1 mm, el descenso del ST ≥ 0,5 mm o las Q patológicas requieren más estudio',
        ),
        source: 'Sharma 2017 (international athlete criteria)',
      },
    ],
    mechanism: l(
      '增厚且排列紊乱的室间隔和左心室产生更大、方向异常的电力，因此QRS电压高，在室间隔向量背离的导联出现深而窄的Q波。肥厚且常伴纤维化的心肌复极也不正常，从而出现ST段压低和T波倒置。',
      'A thick, disarrayed septum and left ventricle generate larger and differently directed forces, which give high QRS voltage and deep, narrow Q waves where the septal vector points away from the lead. Repolarization of the hypertrophied, often fibrotic muscle is abnormal too, which produces the ST depression and T inversion.',
      'Un tabique y un ventrículo izquierdo gruesos y desorganizados generan fuerzas mayores y de dirección distinta, lo que da voltaje alto del QRS y Q profundas y estrechas donde el vector septal se aleja de la derivación. La repolarización del músculo hipertrófico, a menudo fibrótico, también es anómala, lo que produce el descenso del ST y las T negativas.',
    ),
    mimics: [
      {
        id: 'athlete-changes',
        discriminator: l(
          '运动员可有单纯电压增高，但没有侧壁T倒置、ST压低或病理性Q波。',
          'An athlete can have isolated high voltage, but no lateral T inversion, ST depression or pathological Q waves.',
          'Un deportista puede tener voltaje alto aislado, pero sin T negativas laterales, descenso del ST ni Q patológicas.',
        ),
        leads: ['V4', 'V5', 'V6', 'I', 'aVL'],
      },
      {
        id: 'pathological-q',
        discriminator: l(
          '梗死Q波宽（≥40 ms）、符合冠脉分布，常有心梗病史；肥厚型心肌病的Q波深而窄，伴高电压。',
          'Infarct Q waves are wide (≥ 40 ms), follow a coronary territory and usually have an MI history; HCM Q waves are deep but narrow, with high voltage.',
          'Las Q de infarto son anchas (≥ 40 ms), siguen un territorio coronario y suelen tener antecedente de IAM; las de la miocardiopatía hipertrófica son profundas pero estrechas, con voltaje alto.',
        ),
        leads: ['II', 'III', 'aVF', 'V5', 'V6'],
      },
      {
        id: 'lvh-strain',
        discriminator: l(
          '高血压性左心室肥厚伴继发ST-T改变见于老年高血压患者，通常无深窄Q波；仍需超声区分。',
          'Hypertensive LVH with secondary ST–T changes occurs in older hypertensive patients, usually without deep narrow Q waves; echocardiography still decides.',
          'La HVI hipertensiva con alteraciones secundarias del ST-T aparece en hipertensos mayores, por lo general sin Q profundas y estrechas; decide igualmente la ecocardiografía.',
        ),
        leads: ['V5', 'V6', 'I', 'aVL'],
      },
    ],
    pitfalls: [
      l(
        '把年轻运动员的侧壁T倒置或深Q波归为“运动员心脏”。',
        'Putting lateral T inversion or deep Q waves in a young athlete down to “athlete’s heart”.',
        'Atribuir a «corazón de deportista» las T negativas laterales o las Q profundas de un deportista joven.',
      ),
    ],
    urgency: {
      level: 'routine',
      next: l(
        '安排超声心动图或心脏磁共振并转诊心内科；有劳力性晕厥、胸痛或猝死家族史时尽快评估。',
        'Arrange echocardiography or cardiac MRI and refer to cardiology; seek review sooner if there is exertional syncope, chest pain or a family history of sudden death.',
        'Solicita ecocardiografía o RM cardiaca y deriva a cardiología; adelanta la valoración si hay síncope de esfuerzo, dolor torácico o antecedentes familiares de muerte súbita.',
      ),
    },
    lessons: ['h5', 'h9'],
    sources: [REF.escCmp2023, R.ommen2024, R.elliott2014, REF.sharma2017],
    aka: ['HCM', 'HOCM', 'hypertrophic cardiomyopathy', 'MCH', 'miocardiopatía hipertrófica', '肥厚型心肌病', '肥厚性心肌病'],
    exemplar: { scenarios: ['hcm'], leads: ['I', 'aVL', 'V5', 'V6', 'II', 'III', 'aVF'] },
  },

  // ── apical HCM ───────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'apical-hcm',
    definition: l(
      '肥厚局限于左心室心尖，典型表现为V2–V5巨大倒置T波（≥10 mm）和胸前中部导联高R波。',
      'Hypertrophy confined to the left ventricular apex, typically with giant negative T waves (≥ 10 mm) in V2–V5 and tall R waves in the mid-chest leads.',
      'Hipertrofia limitada a la punta del ventrículo izquierdo, típicamente con ondas T negativas gigantes (≥ 10 mm) en V2–V5 y R altas en las precordiales medias.',
    ),
    features: [
      l(
        'V3–V5为主的巨大对称倒置T波（≥10 mm）。',
        'Giant symmetric T inversion (≥ 10 mm), deepest in V3–V5.',
        'T negativas gigantes y simétricas (≥ 10 mm), máximas en V3–V5.',
      ),
      l('同一导联R波高大（左心室高电压）。', 'Tall R waves in the same leads (LVH voltage).', 'R altas en esas mismas derivaciones (voltaje de HVI).'),
      l('常伴ST段压低。', 'Often with ST depression.', 'A menudo con descenso del ST.'),
      l(
        '多年稳定不变；患者常无症状或胸痛不典型。',
        'Stable over years; the patient is often asymptomatic or has atypical pain.',
        'Estable durante años; el paciente suele estar asintomático o tener un dolor atípico.',
      ),
      l(
        '常规超声可能漏诊心尖肥厚——需造影超声或心脏磁共振。',
        'Routine echocardiography can miss apical hypertrophy: contrast echo or cardiac MRI is needed.',
        'La ecocardiografía habitual puede no ver la hipertrofia apical: hace falta eco con contraste o RM cardiaca.',
      ),
    ],
    criteria: [
      {
        label: l('巨大倒置T波', 'Giant negative T waves', 'Ondas T negativas gigantes'),
        value: l('V2–V5 T波倒置≥10 mm', 'T inversion ≥ 10 mm in V2–V5', 'T negativas ≥ 10 mm en V2–V5'),
        source: 'Arbelo 2023 (ESC cardiomyopathies)',
      },
    ],
    mechanism: l(
      '增厚的心尖向胸前中部导联产生较大电力，形成高R波。心尖复极延迟且顺序反转，T波向量背离心尖，面对它的导联记录到深而对称的倒置T波。',
      'The thick apex generates large forces toward the mid-chest leads, which gives tall R waves there. Its repolarization is delayed and reversed, so the T-wave vector points away from the apex and the leads facing it record deep, symmetric T inversion.',
      'La punta engrosada genera grandes fuerzas hacia las precordiales medias, lo que produce R altas en ellas. Su repolarización está retrasada e invertida, así que el vector de la T se aleja de la punta y las derivaciones que la miran registran T negativas profundas y simétricas.',
    ),
    mimics: [
      {
        id: 'wellens',
        discriminator: l(
          'Wellens以V2–V3为主，R波正常，见于胸痛后并随时间演变；心尖肥厚以V3–V5为主，R波高，多年不变。',
          'Wellens is centred on V2–V3 with normal R waves, follows chest pain and evolves; apical HCM is centred on V3–V5 with tall R waves and stays the same for years.',
          'El Wellens se centra en V2–V3 con R normales, sigue a un dolor torácico y evoluciona; la miocardiopatía apical se centra en V3–V5 con R altas y no cambia en años.',
        ),
        leads: ['V2', 'V3', 'V4', 'V5'],
      },
      {
        id: 'cerebral-t',
        discriminator: l(
          '脑型T波宽大、伴明显QT延长，见于急性颅内事件，随病情变化。',
          'Cerebral T waves are wide with a markedly long QT, after an acute intracranial event, and change with the illness.',
          'Las T cerebrales son anchas con QT muy largo, tras un evento intracraneal agudo, y cambian con la evolución.',
        ),
        leads: ['V3', 'V4', 'V5', 'V6'],
      },
      {
        id: 't-inversion-ischemic',
        discriminator: l(
          '缺血性T倒置通常较浅，符合冠脉分布并随时间演变。',
          'Ischaemic T inversion is usually shallower, follows a coronary territory and evolves over time.',
          'La inversión isquémica de la T suele ser menos profunda, sigue un territorio coronario y evoluciona en el tiempo.',
        ),
        leads: ['V2', 'V3', 'V4'],
      },
    ],
    pitfalls: [
      l(
        '没有旧图对比就反复按Wellens或急性缺血进行急诊造影。',
        'Sending the patient for emergency angiography as “Wellens” again and again without comparing with old tracings.',
        'Enviar al paciente una y otra vez a coronariografía urgente como «Wellens» sin comparar con trazados antiguos.',
      ),
    ],
    urgency: {
      level: 'routine',
      next: l(
        '与旧图比较：图形稳定且无胸痛时，安排造影超声或心脏磁共振而非急诊造影；新出现并伴胸痛时，先按ACS处理直至排除。',
        'Compare with old tracings: if the pattern is stable and the patient is pain-free, arrange contrast echocardiography or cardiac MRI rather than emergency angiography; if it is new with chest pain, manage as ACS until proven otherwise.',
        'Compara con trazados antiguos: si el patrón es estable y no hay dolor, solicita eco con contraste o RM cardiaca en lugar de una coronariografía urgente; si es nuevo y hay dolor torácico, trátalo como SCA hasta demostrar lo contrario.',
      ),
    },
    lessons: ['h5', 'o8'],
    sources: [REF.escCmp2023, R.ommen2024],
    aka: ['apical HCM', 'Yamaguchi', 'giant negative T', 'miocardiopatía hipertrófica apical', 'T negativas gigantes', '心尖肥厚型心肌病', '巨大倒置T波'],
    exemplar: { scenarios: ['apical-hcm'], leads: ['V3', 'V4', 'V5'] },
  },

  // ── arrhythmogenic right ventricular cardiomyopathy ──────────────────────────────────────────────────────────────
  {
    id: 'arvc',
    definition: l(
      '致心律失常性右心室心肌病：右心室心肌被纤维脂肪组织替代，心电图表现为青春期后V1–V3 T波倒置、终末激动延迟、ε波及左束支阻滞形态的室性异位搏动。',
      'Arrhythmogenic right ventricular cardiomyopathy: fibrofatty replacement of the right ventricle that shows as T inversion in V1–V3 beyond adolescence, delayed terminal activation, epsilon waves and ventricular ectopy with LBBB morphology.',
      'Miocardiopatía arritmogénica del ventrículo derecho: sustitución fibroadiposa del ventrículo derecho que se manifiesta con T negativas en V1–V3 después de la adolescencia, activación terminal retrasada, ondas épsilon y ectopia ventricular con morfología de bloqueo de rama izquierda.',
    ),
    features: [
      l(
        '>14岁、无完全性右束支阻滞者V1–V3（或更远）T波倒置。',
        'T inversion in V1–V3 (or beyond) in someone over 14 without complete RBBB.',
        'T negativas en V1–V3 (o más allá) en mayores de 14 años sin BRD completo.',
      ),
      l(
        'V1–V3终末激动时间≥55 ms（从S波最低点到QRS终点）。',
        'Terminal activation duration ≥ 55 ms in V1–V3 (from the S-wave nadir to the end of the QRS).',
        'Duración de la activación terminal ≥ 55 ms en V1–V3 (desde el nadir de la S hasta el final del QRS).',
      ),
      l('V1–V3 QRS后的ε波。', 'Epsilon waves after the QRS in V1–V3.', 'Ondas épsilon tras el QRS en V1–V3.'),
      l(
        '左束支阻滞形态的室性早搏或室速（上方电轴提示右心室体部起源）；肢体导联低电压。',
        'PVCs or VT with LBBB morphology (a superior axis points to the RV body); low limb-lead voltage.',
        'Extrasístoles o TV con morfología de BRI (el eje superior apunta al cuerpo del VD); bajo voltaje en los miembros.',
      ),
      l(
        '左心室受累型：下侧壁T倒置和低电压（Padua标准）。',
        'Left-dominant forms: inferolateral T inversion and low voltage (Padua criteria).',
        'Formas con predominio izquierdo: T negativas inferolaterales y bajo voltaje (criterios de Padua).',
      ),
    ],
    criteria: [
      {
        label: l('复极（主要标准）', 'Repolarization (major)', 'Repolarización (mayor)'),
        value: l(
          '>14岁、无完全性右束支阻滞者V1–V3或更远T波倒置',
          'T inversion in V1–V3 or beyond in individuals > 14 y without complete RBBB',
          'T negativas en V1–V3 o más allá en mayores de 14 años sin BRD completo',
        ),
        source: 'Marcus 2010 (Task Force); Corrado 2020 (Padua)',
      },
      {
        label: l('除极', 'Depolarization', 'Despolarización'),
        value: l(
          'V1–V3终末激动时间≥55 ms（次要）；ε波（2010年为主要，2020年Padua降为次要）',
          'Terminal activation duration ≥ 55 ms in V1–V3 (minor); epsilon wave (major in 2010, minor in Padua 2020)',
          'Duración de la activación terminal ≥ 55 ms en V1–V3 (menor); onda épsilon (mayor en 2010, menor en Padua 2020)',
        ),
        source: 'Marcus 2010 (Task Force); Corrado 2020 (Padua)',
      },
    ],
    mechanism: l(
      '右心室心肌被脂肪和纤维组织替代后，残存心肌束中的激动缓慢而延迟，使QRS终末部分延长，并在右胸导联留下ε波等小的晚电位。病变的右心室复极也异常，因此在幼年型图形本应消失的年龄之后，V1–V3 T波仍然倒置。',
      'As right ventricular muscle is replaced by fat and fibrous tissue, activation through the remaining strands becomes slow and late, which prolongs the end of the QRS and leaves small late potentials such as the epsilon wave in the right chest leads. The diseased right ventricle also repolarizes abnormally, so the T waves in V1–V3 stay inverted beyond the age at which the juvenile pattern should have gone.',
      'Al sustituirse el músculo del ventrículo derecho por grasa y tejido fibroso, la activación a través de los haces restantes se vuelve lenta y tardía, lo que alarga el final del QRS y deja pequeños potenciales tardíos como la onda épsilon en las precordiales derechas. El ventrículo derecho enfermo también se repolariza de forma anómala, así que las T de V1–V3 siguen negativas más allá de la edad en que el patrón juvenil debería haber desaparecido.',
    ),
    mimics: [
      {
        id: 'juvenile-t',
        discriminator: l(
          '幼年型T波见于<16岁且无其他异常；成人V1–V3以外的T倒置不应归为幼年型。',
          'The juvenile pattern belongs to under-16s with no other abnormality; T inversion beyond V3 in an adult should not be called juvenile.',
          'El patrón juvenil corresponde a menores de 16 años sin otras alteraciones; una T negativa más allá de V3 en un adulto no debe llamarse juvenil.',
        ),
        leads: ['V1', 'V2', 'V3', 'V4'],
      },
      {
        id: 'rbbb',
        discriminator: l(
          '完全性右束支阻滞时V1–V3 T倒置是继发性的，不能作为ARVC标准；ARVC的终末延迟没有典型的宽R′。',
          'In complete RBBB, T inversion in V1–V3 is secondary and does not count for ARVC; the terminal delay of ARVC lacks the typical broad R′.',
          'En el BRD completo la T negativa en V1–V3 es secundaria y no cuenta para la MAVD; el retraso terminal de la MAVD carece de la R′ ancha típica.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
      {
        id: 'brugada-type1',
        discriminator: l(
          'Brugada为V1–V2穹窿形ST抬高，而非单纯T倒置和终末延迟。',
          'Brugada type 1 is a coved ST elevation in V1–V2, not isolated T inversion with terminal delay.',
          'El Brugada tipo 1 es una elevación del ST en cúpula en V1–V2, no una T negativa aislada con retraso terminal.',
        ),
        leads: ['V1', 'V2'],
      },
      {
        id: 'pulmonary-embolism',
        discriminator: l(
          '肺栓塞的V1–V4 T倒置是急性的，伴心动过速，随右心压力下降而消失。',
          'The V1–V4 T inversion of PE is acute, comes with tachycardia and fades as right-heart pressure falls.',
          'La T negativa en V1–V4 de la embolia es aguda, se acompaña de taquicardia y desaparece al bajar la presión del corazón derecho.',
        ),
        leads: ['V1', 'V2', 'V3', 'V4'],
      },
    ],
    pitfalls: [
      l(
        '把成人V1–V3 T倒置当作“幼年型”而不进一步检查。',
        'Accepting T inversion in V1–V3 in an adult as “juvenile” without further tests.',
        'Aceptar como «juvenil» una T negativa en V1–V3 en un adulto sin más estudios.',
      ),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '转诊心内科行超声心动图、心脏磁共振和动态心电图；有晕厥、心悸或左束支阻滞形态室速者紧急转诊，并在评估前暂停竞技耐力运动。',
        'Refer to cardiology for echocardiography, cardiac MRI and Holter monitoring; urgently if there is syncope, palpitations or VT with LBBB morphology, and advise against competitive endurance sport until assessed.',
        'Deriva a cardiología para ecocardiografía, RM cardiaca y Holter; con urgencia si hay síncope, palpitaciones o TV con morfología de BRI, y desaconseja el deporte de resistencia de competición hasta la valoración.',
      ),
    },
    lessons: ['h6'],
    sources: [R.marcus2010, R.corrado2020, REF.escCmp2023],
    aka: ['ARVC', 'ARVD', 'arrhythmogenic cardiomyopathy', 'MAVD', 'displasia arritmogénica', '致心律失常性右室心肌病'],
    exemplar: { scenarios: ['arvc'], leads: ['V1', 'V2', 'V3'] },
  },

  // ── epsilon wave ─────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'epsilon-wave',
    definition: l(
      'V1–V3中QRS终点之后、T波之前的小幅低振幅波（切迹或细小波动），代表右心室极晚的激动。',
      'A small, low-amplitude deflection (a notch or wiggle) after the end of the QRS and before the T wave in V1–V3, marking very late right ventricular activation.',
      'Una deflexión pequeña de baja amplitud (muesca u ondulación) tras el final del QRS y antes de la onda T en V1–V3, que marca una activación muy tardía del ventrículo derecho.',
    ),
    features: [
      l(
        '看V1–V3中QRS终点与ST段起点之间。',
        'Look in V1–V3 between the end of the QRS and the start of the ST segment.',
        'Mira en V1–V3 entre el final del QRS y el inicio del segmento ST.',
      ),
      l('在多个心搏中可重复出现（噪声不会）。', 'Reproducible beat after beat (noise is not).', 'Reproducible latido a latido (el ruido no lo es).'),
      l(
        '低振幅、高频：40 Hz监护滤波可将其滤掉——用诊断带宽记录并放大增益。',
        'Low amplitude and high frequency: a 40 Hz monitor filter can remove it, so record with diagnostic bandwidth and higher gain.',
        'Baja amplitud y alta frecuencia: un filtro de monitor de 40 Hz puede eliminarla, así que registra con ancho de banda diagnóstico y más ganancia.',
      ),
      l(
        '主要见于ARVC，也可见于结节病、右心室梗死和法洛四联症术后。',
        'Mainly seen in ARVC, but also in sarcoidosis, RV infarction and after tetralogy of Fallot repair.',
        'Se ve sobre todo en la MAVD, pero también en la sarcoidosis, el infarto del VD y tras la corrección de la tetralogía de Fallot.',
      ),
    ],
    criteria: [
      {
        label: l('ε波', 'Epsilon wave', 'Onda épsilon'),
        value: l(
          'V1–V3中QRS终点与T波起点之间可重复出现的低振幅信号',
          'Reproducible low-amplitude signal between the end of the QRS and the onset of the T wave in V1–V3',
          'Señal reproducible de baja amplitud entre el final del QRS y el inicio de la onda T en V1–V3',
        ),
        source: 'Marcus 2010 (Task Force)',
      },
      {
        label: l('诊断权重', 'Diagnostic weight', 'Peso diagnóstico'),
        value: l(
          '2010年工作组标准为主要标准，2020年Padua标准因易过度判读降为次要标准',
          'Major in the 2010 Task Force criteria, downgraded to minor in the 2020 Padua criteria because it is easily over-read',
          'Mayor en los criterios del Task Force de 2010, rebajada a menor en los de Padua de 2020 porque se sobreinterpreta con facilidad',
        ),
        source: 'Corrado 2020 (Padua)',
      },
    ],
    mechanism: l(
      '纤维脂肪化右心室组织中残存的心肌岛在其余心室激动结束后才被激动。它们微小的电信号落在QRS之后，最靠近右心室的V1–V3记录得最清楚。',
      'Islands of surviving muscle inside fibrofatty right ventricular tissue are activated very late, after the rest of the ventricles have finished. Their small electrical signal falls after the QRS and is recorded best by the leads closest to the right ventricle, V1 to V3.',
      'Los islotes de músculo superviviente dentro del tejido fibroadiposo del ventrículo derecho se activan muy tarde, cuando el resto de los ventrículos ya ha terminado. Su pequeña señal eléctrica cae después del QRS y la registran mejor las derivaciones más cercanas al ventrículo derecho, de V1 a V3.',
    ),
    mimics: [
      {
        id: 'rbbb',
        discriminator: l(
          '右束支阻滞的R′是QRS的一部分，宽大，并伴Ⅰ、V6宽S波；ε波是QRS之后单独的小波。',
          'The R′ of RBBB is part of the QRS, broad, with a wide S in I and V6; the epsilon wave is a separate small wiggle after the QRS.',
          'La R′ del BRD forma parte del QRS, es ancha y se acompaña de S ancha en I y V6; la onda épsilon es una pequeña ondulación separada tras el QRS.',
        ),
        leads: ['V1', 'V2', 'I', 'V6'],
      },
      {
        id: 'muscle-tremor',
        discriminator: l(
          '肌电干扰不规则、不随心搏重复，并出现在许多导联中。',
          'Muscle tremor is irregular, does not repeat with each beat and appears in many leads.',
          'El temblor muscular es irregular, no se repite con cada latido y aparece en muchas derivaciones.',
        ),
        leads: ['V1', 'V2', 'I', 'II'],
      },
      {
        id: 'osborn-waves',
        discriminator: l(
          'Osborn波是J点处的圆顶，见于下壁和侧壁导联，伴低体温。',
          'The Osborn wave is a dome at the J point in inferior and lateral leads, with hypothermia.',
          'La onda de Osborn es una cúpula en el punto J en derivaciones inferiores y laterales, con hipotermia.',
        ),
        leads: ['II', 'V4', 'V5', 'V6'],
      },
    ],
    pitfalls: [
      l(
        '把噪声或QRS切迹过度判读为ε波。',
        'Over-reading noise or a QRS notch as an epsilon wave.',
        'Sobreinterpretar ruido o una muesca del QRS como onda épsilon.',
      ),
      l(
        '在40 Hz滤波的监护记录上寻找ε波。',
        'Looking for epsilon waves on a 40 Hz filtered monitor strip.',
        'Buscar ondas épsilon en una tira de monitor filtrada a 40 Hz.',
      ),
    ],
    urgency: {
      level: 'routine',
      next: l(
        '在诊断带宽记录上确认其逐搏重复，然后转诊心内科评估ARVC（超声、心脏磁共振、动态心电图）；有症状时尽快。',
        'Confirm it beat by beat on a diagnostic-bandwidth recording, then refer to cardiology for ARVC assessment (echocardiography, cardiac MRI, Holter), sooner if there are symptoms.',
        'Confírmala latido a latido en un registro de ancho de banda diagnóstico y deriva a cardiología para estudio de MAVD (ecocardiografía, RM cardiaca, Holter), antes si hay síntomas.',
      ),
    },
    lessons: ['h6', 'o10'],
    sources: [R.marcus2010, R.corrado2020, REF.kligfield2007],
    aka: ['epsilon', 'Fontaine wave', 'onda épsilon', 'ε波', 'Epsilon波'],
    exemplar: { scenarios: ['arvc'], leads: ['V1', 'V2', 'V3'] },
  },

  // ── takotsubo syndrome ───────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'takotsubo',
    definition: l(
      '应激相关的一过性左心室功能障碍（常为心尖球形），急性期心电图酷似前壁STEMI，之后出现广泛深倒置T波和QT延长。',
      'Transient stress-related left ventricular dysfunction (often apical ballooning) whose ECG imitates an anterior STEMI in the acute phase and later shows deep widespread T inversion with a long QT.',
      'Disfunción ventricular izquierda transitoria relacionada con el estrés (a menudo abombamiento apical), cuyo ECG imita un IAMCEST anterior en la fase aguda y después muestra T negativas profundas y difusas con QT largo.',
    ),
    features: [
      l(
        '急性期：ST段抬高，常见于V2–V5并超出单一冠脉分布（可累及下壁、侧壁），对应性压低少（aVR除外）；也可只有ST压低。',
        'Acute phase: ST elevation, often in V2–V5 and beyond one coronary territory (inferior and lateral too), with little reciprocal depression except in aVR; sometimes ST depression only.',
        'Fase aguda: elevación del ST, a menudo en V2–V5 y más allá de un territorio coronario (también inferior y lateral), con poco descenso recíproco salvo en aVR; a veces solo descenso del ST.',
      ),
      l(
        '数天内：广泛深倒置T波伴QTc延长（有尖端扭转风险）。',
        'Over days: deep, widespread T inversion with QTc prolongation (risk of torsades).',
        'En días: T negativas profundas y difusas con QTc prolongado (riesgo de torsade).',
      ),
      l('数周至数月逐渐恢复。', 'Gradual recovery over weeks to months.', 'Recuperación gradual en semanas o meses.'),
      l(
        '多见于绝经后女性，常有情绪或躯体应激诱因——但心电图无法排除冠脉闭塞。',
        'Typical in postmenopausal women after emotional or physical stress, but the ECG cannot exclude a coronary occlusion.',
        'Típico en mujeres posmenopáusicas tras un estrés emocional o físico, pero el ECG no puede excluir una oclusión coronaria.',
      ),
    ],
    criteria: [
      {
        label: l('心电图演变', 'ECG course', 'Evolución del ECG'),
        value: l(
          '急性ST抬高（常为前壁、超出单一冠脉分布、对应性压低少）→ 数天后深倒置T波伴QTc延长',
          'Acute ST elevation (often anterior, beyond one territory, little reciprocal depression) → deep T inversion with QTc prolongation over days',
          'Elevación aguda del ST (a menudo anterior, más allá de un territorio, poco descenso recíproco) → T negativas profundas con QTc prolongado en días',
        ),
        source: 'Ghadri 2018 (InterTAK)',
      },
      {
        label: l('与STEMI鉴别', 'Versus STEMI', 'Frente a IAMCEST'),
        value: l('心电图不能可靠区分，必须行冠脉造影', 'The ECG cannot reliably separate them: coronary angiography is required', 'El ECG no los distingue con fiabilidad: es necesaria la coronariografía'),
        source: 'Ghadri 2018 (InterTAK); Byrne 2023 (ESC ACS)',
      },
    ],
    mechanism: l(
      '儿茶酚胺骤增被认为使左心室心尖和中段心肌顿抑，顿抑心肌产生类似损伤的电流，使不符合单一冠脉分布的区域ST段抬高。心肌恢复期间复极持续延迟数天，因此T波广泛倒置、QT延长。',
      'A catecholamine surge is thought to stun the apical and mid segments of the left ventricle, and the stunned muscle produces an injury-like current that lifts the ST over a region that follows no single coronary artery. As the muscle recovers, its repolarization stays delayed for days, which inverts the T waves widely and lengthens the QT.',
      'Se cree que una descarga de catecolaminas aturde los segmentos apicales y medios del ventrículo izquierdo, y el músculo aturdido genera una corriente similar a la de lesión que eleva el ST en una región que no sigue una única arteria coronaria. Mientras el músculo se recupera, su repolarización sigue retrasada durante días, lo que invierte las T de forma difusa y alarga el QT.',
    ),
    mimics: [
      {
        id: 'stemi-anterior',
        discriminator: l(
          '心电图无法可靠区分：前降支闭塞可有对应性压低，但只有造影才能确定。',
          'The ECG cannot separate them reliably: LAD occlusion may show reciprocal depression, but only angiography decides.',
          'El ECG no los separa con fiabilidad: la oclusión de la DA puede mostrar descenso recíproco, pero solo decide la coronariografía.',
        ),
        leads: ['V2', 'V3', 'V4', 'III', 'aVF'],
      },
      {
        id: 'cerebral-t',
        discriminator: l(
          '脑型T波见于颅内事件，同样有深倒置T波和长QT，但无急性ST抬高期。',
          'Cerebral T waves follow an intracranial event, with the same deep T inversion and long QT but no acute ST-elevation phase.',
          'Las T cerebrales siguen a un evento intracraneal, con la misma T negativa profunda y QT largo pero sin fase aguda de elevación del ST.',
        ),
        leads: ['V3', 'V4', 'V5', 'V6'],
      },
      {
        id: 'wellens',
        discriminator: l(
          'Wellens的T倒置局限于V2–V3（可至V4），QT多正常，提示前降支严重狭窄。',
          'Wellens T inversion is limited to V2–V3 (perhaps V4) with a mostly normal QT, pointing to a critical LAD stenosis.',
          'La T negativa del Wellens se limita a V2–V3 (quizá V4) con un QT casi siempre normal, y apunta a una estenosis crítica de la DA.',
        ),
        leads: ['V2', 'V3', 'V4'],
      },
    ],
    pitfalls: [
      l(
        '因为“像Takotsubo”而不做冠脉造影。',
        'Withholding angiography because the ECG “looks like takotsubo”.',
        'No hacer coronariografía porque el ECG «parece un tako-tsubo».',
      ),
      l(
        '亚急性期QT延长时继续使用延长QT的药物。',
        'Continuing QT-prolonging drugs during the subacute long-QT phase.',
        'Mantener fármacos que alargan el QT durante la fase subaguda de QT largo.',
      ),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '在造影排除罪犯血管闭塞之前按STEMI处理；之后监测QT并避免延长QT的药物。',
        'Manage as STEMI until angiography shows no culprit occlusion; afterwards monitor the QT and avoid QT-prolonging drugs.',
        'Trátalo como IAMCEST hasta que la coronariografía descarte una oclusión culpable; después vigila el QT y evita los fármacos que lo alargan.',
      ),
    },
    lessons: ['i11', 'o8'],
    sources: [R.ghadri2018, REF.escAcs2023, REF.drew2010],
    aka: ['takotsubo', 'stress cardiomyopathy', 'broken heart syndrome', 'apical ballooning', 'tako-tsubo', 'miocardiopatía de estrés', '应激性心肌病', '心碎综合征'],
    exemplar: { scenarios: ['takotsubo'], leads: ['V2', 'V3', 'V4', 'V5', 'aVR'] },
  },

  // ── sodium-channel blocker toxicity ──────────────────────────────────────────────────────────────────────────────
  {
    id: 'na-channel-blockade',
    definition: l(
      '阻滞快钠通道的药物（三环类抗抑郁药、IC类药物等）中毒，表现为窦性心动过速、QRS增宽、aVR终末高R波和QRS终末电轴右偏。',
      'Toxicity from drugs that block fast sodium channels (tricyclic antidepressants, class IC drugs and others), shown by sinus tachycardia, QRS widening, a tall terminal R in aVR and a rightward terminal QRS axis.',
      'Intoxicación por fármacos que bloquean los canales rápidos de sodio (antidepresivos tricíclicos, fármacos de clase IC y otros), que se manifiesta con taquicardia sinusal, QRS ancho, R terminal alta en aVR y eje terminal del QRS a la derecha.',
    ),
    features: [
      l('窦性心动过速（抗胆碱能作用）。', 'Sinus tachycardia (anticholinergic effect).', 'Taquicardia sinusal (efecto anticolinérgico).'),
      l(
        'QRS≥100 ms提示抽搐风险，≥160 ms提示室性心律失常风险。',
        'QRS ≥ 100 ms signals seizure risk, ≥ 160 ms ventricular arrhythmia risk.',
        'Un QRS ≥ 100 ms indica riesgo de convulsiones y ≥ 160 ms riesgo de arritmia ventricular.',
      ),
      l(
        'aVR终末R波≥3 mm或R/S≥0.7；Ⅰ、aVL终末S波深（终末40 ms电轴右偏）。',
        'Terminal R in aVR ≥ 3 mm or R/S ≥ 0.7; deep terminal S in I and aVL (rightward terminal 40 ms axis).',
        'R terminal en aVR ≥ 3 mm o R/S ≥ 0,7; S terminal profunda en I y aVL (eje de los 40 ms terminales a la derecha).',
      ),
      l(
        'QT延长；可出现Brugada样图形。',
        'QT prolongation; a Brugada-like pattern may appear.',
        'QT prolongado; puede aparecer un patrón similar al Brugada.',
      ),
      l(
        '宽QRS心动过速可酷似室速。',
        'A wide-complex tachycardia that can look like VT.',
        'Una taquicardia de QRS ancho que puede parecer una TV.',
      ),
    ],
    criteria: [
      {
        label: l('QRS时限与风险', 'QRS duration and risk', 'Duración del QRS y riesgo'),
        value: l('≥100 ms：抽搐风险；≥160 ms：室性心律失常风险', '≥ 100 ms: seizure risk; ≥ 160 ms: ventricular arrhythmia risk', '≥ 100 ms: riesgo de convulsiones; ≥ 160 ms: riesgo de arritmia ventricular'),
        source: 'Boehnert 1985',
      },
      {
        label: l('aVR导联', 'Lead aVR', 'Derivación aVR'),
        value: l('终末R波≥3 mm或R/S≥0.7', 'Terminal R ≥ 3 mm or R/S ≥ 0.7', 'R terminal ≥ 3 mm o R/S ≥ 0,7'),
        source: 'Liebelt 1995',
      },
      {
        label: l('治疗', 'Treatment', 'Tratamiento'),
        value: l('QRS增宽用高渗碳酸氢钠治疗', 'QRS widening is treated with hypertonic sodium bicarbonate', 'El ensanchamiento del QRS se trata con bicarbonato sódico hipertónico'),
        source: 'Lavonas 2023 (AHA poisoning update)',
      },
    ],
    mechanism: l(
      '阻滞快钠通道使动作电位0期上升变慢，心室内传导减慢，QRS增宽，尤其是其终末部分。右心室流出道最后被激动，其延迟激动表现为终末向右的电力，即aVR的高R波和Ⅰ导联的深S波。',
      'Blocking fast sodium channels slows the upstroke of the action potential, so conduction through the ventricles slows and the QRS widens, most of all in its final part. The right ventricular outflow tract is activated last, so its delayed activation appears as a terminal rightward force, the tall R in aVR and the deep S in I.',
      'El bloqueo de los canales rápidos de sodio enlentece la fase de ascenso del potencial de acción, de modo que la conducción ventricular se hace más lenta y el QRS se ensancha, sobre todo en su parte final. El tracto de salida del ventrículo derecho se activa el último, así que su activación retrasada aparece como una fuerza terminal dirigida a la derecha, la R alta en aVR y la S profunda en I.',
    ),
    mimics: [
      {
        id: 'hyperkalemia',
        discriminator: l(
          '高钾时多为心动过缓、T波高尖和P波低平；钠通道阻滞剂中毒多为窦速伴aVR终末R波。',
          'Hyperkalaemia usually gives bradycardia, peaked T waves and flat P waves; sodium-channel blocker toxicity gives sinus tachycardia with a terminal R in aVR.',
          'La hiperpotasemia suele dar bradicardia, T picudas y P aplanadas; la intoxicación por bloqueantes de canales de sodio da taquicardia sinusal con R terminal en aVR.',
        ),
        leads: ['aVR', 'II', 'V2'],
      },
      {
        id: 'rbbb',
        discriminator: l(
          '右束支阻滞也有aVR终末R波，但V1呈rsR′、心率正常、长期稳定，无中毒史。',
          'RBBB also gives a terminal R in aVR, but with rsR′ in V1, a normal rate, long-term stability and no toxic history.',
          'El BRD también da R terminal en aVR, pero con rsR′ en V1, frecuencia normal, estabilidad a largo plazo y sin antecedente tóxico.',
        ),
        leads: ['aVR', 'V1', 'I'],
      },
      {
        id: 'brugada-type1',
        discriminator: l(
          '中毒引起的Brugada样图形伴QRS增宽和心动过速，随解毒消失；真正的Brugada QRS时限正常。',
          'The toxic Brugada-like pattern comes with a wide QRS and tachycardia and resolves with treatment; true Brugada has a normal QRS duration.',
          'El patrón similar al Brugada de origen tóxico se acompaña de QRS ancho y taquicardia y se resuelve con el tratamiento; el Brugada verdadero tiene un QRS de duración normal.',
        ),
        leads: ['V1', 'V2', 'aVR'],
      },
    ],
    pitfalls: [
      l(
        '等待血药浓度——浓度与毒性相关性差，心电图更能预测风险。',
        'Waiting for drug levels: they correlate poorly with toxicity, and the ECG predicts risk better.',
        'Esperar a los niveles del fármaco: se correlacionan mal con la toxicidad y el ECG predice mejor el riesgo.',
      ),
      l(
        '把100–120 ms的QRS当作“接近正常”。',
        'Treating a QRS of 100–120 ms as “nearly normal”.',
        'Considerar «casi normal» un QRS de 100–120 ms.',
      ),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '立即监护并处理：QRS≥100 ms或出现心律失常时给予高渗碳酸氢钠，保护气道，联系中毒中心；避免使用其他钠通道阻滞药物。',
        'Monitor and treat now: with QRS ≥ 100 ms or an arrhythmia give hypertonic sodium bicarbonate, protect the airway and involve toxicology; avoid other sodium-channel-blocking drugs.',
        'Monitoriza y trata ya: con QRS ≥ 100 ms o arritmia administra bicarbonato sódico hipertónico, protege la vía aérea y consulta con toxicología; evita otros bloqueantes de canales de sodio.',
      ),
    },
    lessons: ['o4'],
    sources: [R.boehnert1985, R.liebelt1995, R.lavonas2023],
    aka: ['TCA overdose', 'tricyclic', 'sodium channel blockade', 'intoxicación por tricíclicos', 'bloqueo de canales de sodio', '三环类抗抑郁药中毒', '钠通道阻滞'],
    exemplar: { scenarios: ['na-channel-blockade'], leads: ['aVR', 'I', 'II', 'V1'] },
  },

  // ── dextrocardia ─────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'dextrocardia',
    definition: l(
      '心脏呈镜像位于右胸，表现为Ⅰ导联P、QRS、T全部倒置，aVR直立，胸导联R波从V1到V6逐渐变小。',
      'A mirror-image heart in the right chest, shown by an inverted lead I (P, QRS and T), an upright aVR and R waves that shrink from V1 to V6.',
      'Corazón en imagen especular en el hemitórax derecho, que se manifiesta con la derivación I invertida (P, QRS y T), aVR positiva y ondas R que disminuyen de V1 a V6.',
    ),
    features: [
      l('Ⅰ导联P、QRS、T均为负向。', 'Lead I: P, QRS and T all negative.', 'Derivación I: P, QRS y T negativas.'),
      l('aVR直立（P波和QRS正向）。', 'aVR upright (positive P and QRS).', 'aVR positiva (P y QRS positivos).'),
      l(
        '胸导联：R波不递增，反而从V1到V6逐渐变小——左右手导线反接时胸导联正常。',
        'Chest leads: no R progression; the R shrinks from V1 to V6, whereas with arm-cable reversal the chest leads are normal.',
        'Precordiales: sin progresión de la R, que disminuye de V1 a V6, mientras que en la inversión de los cables de los brazos las precordiales son normales.',
      ),
      l(
        '右胸导联（V3R–V6R）记录到正常的R波递增。',
        'Right-sided chest leads (V3R–V6R) show a normal R progression.',
        'Las precordiales derechas (V3R–V6R) muestran una progresión normal de la R.',
      ),
    ],
    criteria: [
      {
        label: l('与左右手反接鉴别', 'Versus arm-cable reversal', 'Frente a la inversión de los cables de los brazos'),
        value: l(
          'Ⅰ导联倒置+aVR直立，胸导联R波从V1到V6递减为右位心；胸导联正常为导线反接',
          'Inverted I and upright aVR with R shrinking from V1 to V6 = dextrocardia; normal chest leads = LA/RA cable reversal',
          'I invertida y aVR positiva con R decreciente de V1 a V6 = dextrocardia; precordiales normales = inversión de los cables LA/RA',
        ),
        source: 'Batchvarov 2007',
      },
      {
        label: l('记录方法', 'How to record', 'Cómo registrar'),
        value: l(
          '交换上肢导线并按右胸位置放置胸导联，可得到“常规”心电图',
          'Swap the arm cables and place the chest leads on the right side to obtain a “standard” ECG',
          'Intercambia los cables de los brazos y coloca las precordiales en el lado derecho para obtener un ECG «estándar»',
        ),
        source: 'Surawicz 2008 (Chou’s Electrocardiography)',
      },
    ],
    mechanism: l(
      '心脏位于右胸时，心房和心室向右除极，Ⅰ导联看到所有波都在远离，记录为倒置，而aVR看到它们迎面而来。左胸导联下方的心脏组织越来越少，所以R波从V1到V6逐渐变小而不是增大。',
      'With the heart in the right chest, the atria and ventricles depolarize toward the right, so lead I sees every wave moving away and records it inverted while aVR sees it coming. The left chest leads lie over less and less heart, so the R waves shrink from V1 to V6 instead of growing.',
      'Con el corazón en el hemitórax derecho, aurículas y ventrículos se despolarizan hacia la derecha, de modo que la derivación I ve alejarse todas las ondas y las registra invertidas, mientras que aVR las ve acercarse. Las precordiales izquierdas quedan sobre cada vez menos corazón, así que las R disminuyen de V1 a V6 en lugar de crecer.',
    ),
    mimics: [
      {
        id: 'electrode-reversal-la-ra',
        discriminator: l(
          '左右手导线反接时肢体导联相同，但胸导联R波递增正常。',
          'Arm-cable reversal gives the same limb leads, but the chest leads show a normal R progression.',
          'La inversión de los cables de los brazos da las mismas derivaciones de los miembros, pero las precordiales muestran una progresión normal de la R.',
        ),
        leads: ['I', 'aVR', 'V4', 'V5', 'V6'],
      },
      {
        id: 'poor-r-progression',
        discriminator: l(
          'R波递增不良时Ⅰ导联正常、aVR倒置。',
          'In poor R-wave progression lead I is normal and aVR is negative.',
          'En la mala progresión de la R la derivación I es normal y aVR es negativa.',
        ),
        leads: ['I', 'aVR', 'V1', 'V2', 'V3'],
      },
    ],
    pitfalls: [
      l(
        '只看肢体导联就判断为导线反接，未检查胸导联。',
        'Calling it cable reversal from the limb leads alone, without checking the chest leads.',
        'Diagnosticar una inversión de cables solo por las derivaciones de los miembros, sin mirar las precordiales.',
      ),
      l(
        '把胸导联R波消失读成广泛前壁梗死。',
        'Reading the loss of chest-lead R waves as an extensive anterior infarction.',
        'Interpretar la pérdida de R en las precordiales como un infarto anterior extenso.',
      ),
    ],
    lessons: ['o9'],
    sources: [REF.batchvarov2007, REF.chou2008, REF.kligfield2007],
    aka: ['dextrocardia', 'situs inversus', 'mirror-image dextrocardia', 'dextrocardia en espejo', '右位心', '镜像右位心'],
    exemplar: { scenarios: ['dextrocardia'], leads: ['I', 'aVR', 'V1', 'V4', 'V6'] },
  },

  // ── physiological athlete ECG changes ────────────────────────────────────────────────────────────────────────────
  {
    id: 'athlete-changes',
    definition: l(
      '运动训练引起的心电图改变（窦性心动过缓、单纯QRS高电压、不完全性右束支阻滞、早期复极、一度房室阻滞、文氏阻滞），单独出现时无需进一步检查。',
      'Training-related ECG changes (sinus bradycardia, isolated QRS voltage for LVH, incomplete RBBB, early repolarization, first-degree AV block, Mobitz I) that need no further tests when they occur alone.',
      'Cambios del ECG relacionados con el entrenamiento (bradicardia sinusal, voltaje aislado del QRS de HVI, BRD incompleto, repolarización precoz, bloqueo AV de primer grado, Mobitz I) que no requieren más estudios cuando aparecen solos.',
    ),
    features: [
      l(
        '正常：窦性心动过缓≥30次/分、窦性心律不齐、异位房性或交界性心律、一度房室阻滞、文氏阻滞、单纯电压增高、不完全性右束支阻滞、早期复极。',
        'Normal: sinus bradycardia ≥ 30/min, sinus arrhythmia, ectopic atrial or junctional rhythm, first-degree AV block, Mobitz I, isolated voltage, incomplete RBBB, early repolarization.',
        'Normal: bradicardia sinusal ≥ 30 lpm, arritmia sinusal, ritmo auricular ectópico o de la unión, bloqueo AV de primer grado, Mobitz I, voltaje aislado, BRD incompleto, repolarización precoz.',
      ),
      l(
        '黑人运动员：V1–V4 T倒置，若前有J点抬高和上凸ST抬高，属正常。',
        'Black athletes: T inversion in V1–V4 preceded by J-point elevation and convex ST elevation is normal.',
        'Deportistas de raza negra: la T negativa en V1–V4 precedida de elevación del punto J y ST convexo es normal.',
      ),
      l(
        '临界（单项可接受，≥2项需检查）：电轴左偏或右偏、左/右心房异常、完全性右束支阻滞。',
        'Borderline (one alone is fine, two or more need work-up): left or right axis deviation, left or right atrial abnormality, complete RBBB.',
        'Límite (uno aislado es aceptable, dos o más requieren estudio): desviación del eje a la izquierda o a la derecha, anomalía auricular izquierda o derecha, BRD completo.',
      ),
      l(
        '异常（总需检查）：侧壁或下侧壁T倒置、ST压低≥0.5 mm、病理性Q波、左束支阻滞、预激、QTc过长、Brugada 1型、ε波、二度Ⅱ型或三度房室阻滞。',
        'Abnormal (always work up): lateral or inferolateral T inversion, ST depression ≥ 0.5 mm, pathological Q waves, LBBB, pre-excitation, long QTc, Brugada type 1, epsilon wave, Mobitz II or third-degree AV block.',
        'Anormal (estudiar siempre): T negativa lateral o inferolateral, descenso del ST ≥ 0,5 mm, ondas Q patológicas, BRI, preexcitación, QTc largo, Brugada tipo 1, onda épsilon, Mobitz II o bloqueo AV de tercer grado.',
      ),
    ],
    criteria: [
      {
        label: l('需要检查的异常表现', 'Abnormal findings that need work-up', 'Hallazgos anormales que requieren estudio'),
        value: l(
          '≥2个相邻导联T倒置≥1 mm（V1–V4除外的情况）、ST压低≥0.5 mm、Q/R≥0.25或≥40 ms、QRS≥140 ms、QTc≥470 ms（男）/≥480 ms（女）、心率<30次/分、PR≥400 ms、≥2个室性早搏',
          'T inversion ≥ 1 mm in ≥ 2 contiguous leads (beyond the normal exceptions), ST depression ≥ 0.5 mm, Q/R ≥ 0.25 or ≥ 40 ms, QRS ≥ 140 ms, QTc ≥ 470 ms (men) / ≥ 480 ms (women), HR < 30/min, PR ≥ 400 ms, ≥ 2 PVCs',
          'T negativa ≥ 1 mm en ≥ 2 derivaciones contiguas (fuera de las excepciones normales), descenso del ST ≥ 0,5 mm, Q/R ≥ 0,25 o ≥ 40 ms, QRS ≥ 140 ms, QTc ≥ 470 ms (varones) / ≥ 480 ms (mujeres), FC < 30 lpm, PR ≥ 400 ms, ≥ 2 extrasístoles ventriculares',
        ),
        source: 'Sharma 2017 (international athlete criteria)',
      },
      {
        label: l('临界表现', 'Borderline findings', 'Hallazgos límite'),
        value: l('单项无需检查；≥2项需进一步评估', 'One alone needs no work-up; two or more need assessment', 'Uno aislado no requiere estudio; dos o más requieren valoración'),
        source: 'Sharma 2017 (international athlete criteria)',
      },
    ],
    mechanism: l(
      '耐力训练提高迷走张力并使心腔增大，从而减慢窦性心率、延长房室传导并增高QRS电压。这些是健康心脏的适应，所以它们单独出现，不伴心肌病的病理性Q波、侧壁T倒置或ST段压低。',
      'Endurance training raises vagal tone and enlarges the cardiac chambers, which slows the sinus rate, lengthens AV conduction and raises QRS voltage. These are adaptations of a healthy heart, so they appear on their own, without the pathological Q waves, lateral T inversion or ST depression of cardiomyopathy.',
      'El entrenamiento de resistencia aumenta el tono vagal y agranda las cavidades cardiacas, lo que enlentece la frecuencia sinusal, alarga la conducción AV y aumenta el voltaje del QRS. Son adaptaciones de un corazón sano, así que aparecen solas, sin las ondas Q patológicas, las T negativas laterales ni el descenso del ST de una miocardiopatía.',
    ),
    mimics: [
      {
        id: 'hcm',
        discriminator: l(
          '肥厚型心肌病除电压外还有侧壁T倒置、ST压低或深Q波，以及左心房异常。',
          'HCM adds lateral T inversion, ST depression or deep Q waves, and left atrial abnormality, to the voltage.',
          'La miocardiopatía hipertrófica añade al voltaje T negativas laterales, descenso del ST u ondas Q profundas, y anomalía auricular izquierda.',
        ),
        leads: ['I', 'aVL', 'V5', 'V6'],
      },
      {
        id: 'arvc',
        discriminator: l(
          'ARVC的T倒置超出V1–V3，前面没有J点抬高，可伴ε波或左束支阻滞形态的室性早搏。',
          'In ARVC the T inversion extends beyond V1–V3 without preceding J-point elevation, sometimes with epsilon waves or LBBB-shaped PVCs.',
          'En la MAVD la T negativa se extiende más allá de V1–V3 sin elevación previa del punto J, a veces con ondas épsilon o extrasístoles con morfología de BRI.',
        ),
        leads: ['V1', 'V2', 'V3', 'V4'],
      },
      {
        id: 'av-block-2-mobitz2',
        discriminator: l(
          '运动员可有文氏阻滞（PR逐渐延长），但PR固定后突然脱落（二度Ⅱ型）永远不正常。',
          'Athletes can have Mobitz I (the PR lengthens progressively), but a fixed PR with a sudden dropped beat (Mobitz II) is never normal.',
          'Los deportistas pueden tener Mobitz I (el PR se alarga progresivamente), pero un PR fijo con un latido bloqueado de repente (Mobitz II) nunca es normal.',
        ),
        leads: ['II', 'V1'],
      },
    ],
    pitfalls: [
      l(
        '把侧壁T倒置归因于训练。',
        'Putting lateral T inversion down to training.',
        'Atribuir al entrenamiento una T negativa lateral.',
      ),
      l(
        '对单纯电压增高或不完全性右束支阻滞过度检查。',
        'Over-investigating isolated voltage or incomplete RBBB.',
        'Estudiar en exceso un voltaje aislado o un BRD incompleto.',
      ),
    ],
    lessons: ['h9', 's7'],
    sources: [REF.sharma2017, REF.malhotra2017, REF.macfarlane2015],
    aka: ["athlete's heart", 'athlete ECG', 'corazón de deportista', 'ECG del deportista', '运动员心脏', '运动员心电图'],
    exemplar: { scenarios: ['athlete'], leads: ['V1', 'V2', 'V5', 'II'] },
  },

  // ── persistent juvenile T-wave pattern ───────────────────────────────────────────────────────────────────────────
  {
    id: 'juvenile-t',
    definition: l(
      '从儿童期延续下来的V1–V3 T波倒置，<16岁属正常，部分健康年轻成人（尤其女性）也可见到。',
      'T-wave inversion in V1–V3 persisting from childhood, normal under 16 years and seen in some healthy young adults, especially women.',
      'Inversión de la onda T en V1–V3 que persiste desde la infancia, normal por debajo de los 16 años y presente en algunos adultos jóvenes sanos, sobre todo mujeres.',
    ),
    features: [
      l(
        'T倒置局限于V1–V3，V4起直立。',
        'T inversion confined to V1–V3, upright from V4 onward.',
        'T negativa limitada a V1–V3, positiva desde V4.',
      ),
      l('倒置较浅；QRS和ST段正常。', 'Shallow inversion; normal QRS and ST segment.', 'Inversión poco profunda; QRS y ST normales.'),
      l(
        '<16岁属正常；成年后局限于V1–V2常见，延至V3少见，超过V3罕见。',
        'Normal under 16; after that, inversion limited to V1–V2 is common, extension to V3 uncommon and beyond V3 rare.',
        'Normal antes de los 16 años; después, la limitada a V1–V2 es frecuente, la que llega a V3 poco frecuente y más allá de V3 rara.',
      ),
      l(
        '成人T倒置超过V3或伴其他异常：考虑ARVC、肥厚型心肌病或肺动脉高压。',
        'In an adult, inversion beyond V3 or with other abnormalities points to ARVC, HCM or pulmonary hypertension.',
        'En un adulto, la inversión más allá de V3 o con otras alteraciones orienta a MAVD, miocardiopatía hipertrófica o hipertensión pulmonar.',
      ),
    ],
    criteria: [
      {
        label: l('年龄', 'Age', 'Edad'),
        value: l('<16岁V1–V3 T倒置属正常', 'T inversion in V1–V3 is normal under 16 years', 'La T negativa en V1–V3 es normal antes de los 16 años'),
        source: 'Sharma 2017 (international athlete criteria)',
      },
      {
        label: l('成人', 'Adults', 'Adultos'),
        value: l(
          '青春期后局限于V1–V2常见；超过V2少见（多为女性），超过V3罕见，需进一步评估',
          'After puberty, inversion in V1–V2 is common; beyond V2 is uncommon (mostly women) and beyond V3 is rare and needs assessment',
          'Tras la pubertad, la inversión en V1–V2 es frecuente; más allá de V2 es poco frecuente (sobre todo mujeres) y más allá de V3 es rara y requiere valoración',
        ),
        source: 'Malhotra 2017',
      },
    ],
    mechanism: l(
      '儿童期右心室相对较大且靠前，T波向量指向左后，背离右胸导联。青春期左心室逐渐占优势，V1–V3的T波通常转为直立，但部分人儿童期图形持续存在而无疾病。',
      'In childhood the right ventricle is relatively large and anterior, so the T-wave vector points to the left and backward, away from the right chest leads. As the left ventricle comes to dominate during adolescence the T in V1–V3 usually turns upright, but in some people the childhood pattern persists without disease.',
      'En la infancia el ventrículo derecho es relativamente grande y anterior, de modo que el vector de la T apunta hacia la izquierda y atrás, alejándose de las precordiales derechas. Cuando el ventrículo izquierdo pasa a dominar en la adolescencia la T de V1–V3 suele hacerse positiva, pero en algunas personas el patrón infantil persiste sin enfermedad.',
    ),
    mimics: [
      {
        id: 'arvc',
        discriminator: l(
          'ARVC见于>14–16岁，T倒置常超出V3，伴终末激动延迟、ε波或室性早搏。',
          'ARVC appears after 14–16 years, the T inversion often goes beyond V3, and there is terminal delay, epsilon waves or ectopy.',
          'La MAVD aparece después de los 14–16 años, la T negativa suele ir más allá de V3 y hay retraso terminal, ondas épsilon o extrasístoles.',
        ),
        leads: ['V1', 'V2', 'V3', 'V4'],
      },
      {
        id: 'wellens',
        discriminator: l(
          'Wellens见于胸痛后，V2–V3深倒或双向，随时间演变。',
          'Wellens follows chest pain, with deep or biphasic T in V2–V3 that evolves over time.',
          'El Wellens sigue a un dolor torácico, con T profundas o bifásicas en V2–V3 que evolucionan en el tiempo.',
        ),
        leads: ['V2', 'V3'],
      },
      {
        id: 'pulmonary-embolism',
        discriminator: l(
          '肺栓塞的右胸T倒置是新出现的，伴心动过速和症状。',
          'The right chest T inversion of PE is new, with tachycardia and symptoms.',
          'La T negativa en precordiales derechas de la embolia es nueva, con taquicardia y síntomas.',
        ),
        leads: ['V1', 'V2', 'V3', 'V4'],
      },
    ],
    pitfalls: [
      l(
        '把成人V1–V4 T倒置称为幼年型而不做超声。',
        'Calling T inversion in V1–V4 in an adult “juvenile” without echocardiography.',
        'Llamar «juvenil» a una T negativa en V1–V4 en un adulto sin hacer una ecocardiografía.',
      ),
      l(
        '把儿童正常的V1–V3 T倒置报告为缺血。',
        'Reporting the normal V1–V3 T inversion of a child as ischaemia.',
        'Informar como isquemia la T negativa normal de V1–V3 de un niño.',
      ),
    ],
    lessons: ['s7'],
    sources: [REF.sharma2017, REF.malhotra2017, REF.rijnbeek2001],
    aka: ['juvenile T', 'persistent juvenile pattern', 'patrón juvenil', 'T juvenil', '幼年型T波', '持续性幼年型T波'],
    exemplar: { scenarios: ['juvenile-t'], leads: ['V1', 'V2', 'V3', 'V4'] },
  },

  // ── COPD pattern ─────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'copd-pattern',
    definition: l(
      '慢性阻塞性肺疾病（肺过度充气、膈肌低位、肺动脉压升高）引起的心电图改变：肢体导联低电压、电轴垂直或右偏、右心房异常和R波递增不良。',
      'ECG changes of chronic obstructive lung disease (hyperinflation, a low diaphragm, raised pulmonary pressure): low limb-lead voltage, a vertical or rightward axis, right atrial abnormality and poor R-wave progression.',
      'Cambios del ECG de la enfermedad pulmonar obstructiva crónica (hiperinsuflación, diafragma bajo, presión pulmonar elevada): bajo voltaje en los miembros, eje vertical o a la derecha, anomalía auricular derecha y mala progresión de la R.',
    ),
    features: [
      l('肢体导联QRS低电压。', 'Low QRS voltage in the limb leads.', 'Bajo voltaje del QRS en las derivaciones de los miembros.'),
      l(
        'Ⅱ、Ⅲ、aVF P波≥2.5 mm，P波电轴垂直（>+70°）。',
        'P ≥ 2.5 mm in II, III and aVF with a vertical P axis (> +70°).',
        'P ≥ 2,5 mm en II, III y aVF con un eje de la P vertical (> +70°).',
      ),
      l('电轴右偏或S1S2S3图形。', 'Right axis deviation or an S1S2S3 pattern.', 'Desviación del eje a la derecha o patrón S1S2S3.'),
      l(
        'R波递增不良，S波持续到V5–V6（移行区左移）。',
        'Poor R-wave progression with S waves persisting to V5–V6 (late transition).',
        'Mala progresión de la R con S que persisten hasta V5–V6 (transición tardía).',
      ),
      l(
        '肺心病时可有右心室肥厚征、右束支阻滞；常见多源性房速和房颤。',
        'In cor pulmonale: RVH signs and RBBB; multifocal atrial tachycardia and AF are common.',
        'En el cor pulmonale: signos de HVD y BRD; son frecuentes la taquicardia auricular multifocal y la FA.',
      ),
    ],
    criteria: [
      {
        label: l('右心房异常', 'Right atrial abnormality', 'Anomalía auricular derecha'),
        value: l('Ⅱ、Ⅲ、aVF P波≥0.25 mV，P波电轴约>+70°', 'P ≥ 0.25 mV in II, III, aVF with a P axis beyond about +70°', 'P ≥ 0,25 mV en II, III y aVF con un eje de la P por encima de unos +70°'),
        source: 'Hancock 2009 (AHA Part V)',
      },
      {
        label: l('肺动脉高压', 'Pulmonary hypertension', 'Hipertensión pulmonar'),
        value: l(
          '电轴右偏、右心室肥厚和右心房异常提示肺动脉高压；心电图正常不能排除',
          'Right axis, RVH and right atrial abnormality suggest pulmonary hypertension; a normal ECG does not exclude it',
          'El eje derecho, la HVD y la anomalía auricular derecha sugieren hipertensión pulmonar; un ECG normal no la descarta',
        ),
        source: 'Humbert 2022 (ESC/ERS PH)',
      },
    ],
    mechanism: l(
      '过度充气的肺把膈肌和心脏向下推，并使心脏与胸壁电极之间绝缘，因此电轴变得垂直、肢体导联电压降低、移行区移向左胸导联。慢性肺动脉高压再加上右心房和右心室负荷，表现为下壁导联高尖P波和电轴右偏。',
      'Hyperinflated lungs push the diaphragm and the heart downward and insulate the heart from the chest electrodes, which makes the axis vertical, lowers the limb-lead voltage and shifts the transition to the left chest leads. Chronic pulmonary hypertension adds right atrial and right ventricular strain, which tall P waves in the inferior leads and a rightward axis reveal.',
      'Los pulmones hiperinsuflados empujan hacia abajo el diafragma y el corazón y lo aíslan de los electrodos torácicos, lo que verticaliza el eje, reduce el voltaje de los miembros y desplaza la transición hacia las precordiales izquierdas. La hipertensión pulmonar crónica añade sobrecarga auricular y ventricular derecha, que se revela con P altas en las inferiores y un eje a la derecha.',
    ),
    mimics: [
      {
        id: 'old-mi-anterior',
        discriminator: l(
          '陈旧前壁梗死V2–V3有>20 ms的Q波或QS；慢阻肺仅有小r波和持续的S波。',
          'An old anterior infarct has Q > 20 ms or QS in V2–V3; COPD only has tiny r waves and persistent S waves.',
          'Un infarto anterior antiguo tiene Q > 20 ms o QS en V2–V3; la EPOC solo tiene r diminutas y S persistentes.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
      {
        id: 'low-voltage',
        discriminator: l(
          '其他低电压原因（积液、淀粉样变、肥胖）没有垂直电轴和肺型P波。',
          'Other causes of low voltage (effusion, amyloid, obesity) lack the vertical axis and tall P waves.',
          'Otras causas de bajo voltaje (derrame, amiloidosis, obesidad) carecen del eje vertical y de las P altas.',
        ),
        leads: ['I', 'II', 'III'],
      },
      {
        id: 'rvh',
        discriminator: l(
          '明显的右心室肥厚有V1高R波（R/S≥1）和右胸导联继发ST-T改变；单纯慢阻肺V1多为rS或QS。',
          'Established RVH gives a tall R in V1 (R/S ≥ 1) with secondary right chest ST–T changes; uncomplicated COPD usually has rS or QS in V1.',
          'La HVD establecida da una R alta en V1 (R/S ≥ 1) con alteraciones secundarias del ST-T en precordiales derechas; la EPOC no complicada suele tener rS o QS en V1.',
        ),
        leads: ['V1', 'V2'],
      },
    ],
    pitfalls: [
      l(
        '把R波递增不良读成陈旧前壁梗死。',
        'Reading poor R-wave progression as an old anterior infarction.',
        'Interpretar la mala progresión de la R como un infarto anterior antiguo.',
      ),
      l(
        '把多源性房速误认为房颤。',
        'Mistaking multifocal atrial tachycardia for atrial fibrillation.',
        'Confundir la taquicardia auricular multifocal con una fibrilación auricular.',
      ),
    ],
    lessons: ['h3', 'h4'],
    sources: [REF.hancock2009, REF.escPh2022, REF.mackenzie2005],
    aka: ['COPD', 'emphysema', 'chronic cor pulmonale', 'EPOC', 'enfisema', 'cor pulmonale crónico', '慢阻肺', '肺气肿'],
    exemplar: { scenarios: ['copd-pattern'], leads: ['II', 'III', 'aVF', 'V1', 'V5', 'V6'] },
  },

  // ── pacemaker failure to capture ─────────────────────────────────────────────────────────────────────────────────
  {
    id: 'pacing-failure-capture',
    definition: l(
      '在心肌可兴奋期发放的起搏脉冲后没有P波（心房）或QRS（心室）。',
      'A pacing stimulus delivered when the heart is excitable that is not followed by a P wave (atrial) or a QRS (ventricular).',
      'Un estímulo de marcapasos liberado cuando el corazón es excitable que no va seguido de una onda P (auricular) ni de un QRS (ventricular).',
    ),
    features: [
      l(
        '可见起搏信号（钉样波），其后没有相应的起搏波群。',
        'A pacing spike is visible but no paced complex follows it.',
        'Se ve una espiga de marcapasos, pero no la sigue ningún complejo estimulado.',
      ),
      l(
        '脉冲落在不应期之外——落在自身QRS之后不应期内的脉冲不夺获是正常的。',
        'The spike falls outside the refractory period; a spike that falls in the refractory period right after an intrinsic QRS is expected not to capture.',
        'La espiga cae fuera del periodo refractario; una espiga que cae en el refractario justo después de un QRS propio no debe capturar.',
      ),
      l(
        '间歇性或完全性；起搏依赖者可出现严重心动过缓或停搏。',
        'Intermittent or complete; in a pacing-dependent patient it causes severe bradycardia or asystole.',
        'Intermitente o completo; en un paciente dependiente del marcapasos causa bradicardia grave o asistolia.',
      ),
      l(
        '原因：阈值升高（心梗、高钾、药物）、导线脱位或断裂、电池耗竭。',
        'Causes: a rise in threshold (infarction, hyperkalaemia, drugs), lead dislodgement or fracture, battery depletion.',
        'Causas: aumento del umbral (infarto, hiperpotasemia, fármacos), desplazamiento o fractura del cable, agotamiento de la batería.',
      ),
      l(
        '起搏QRS异常增宽（>200 ms）或脉冲-QRS潜伏期延长：查血钾和药物。',
        'An unusually wide paced QRS (> 200 ms) or a long spike-to-QRS latency: check potassium and drugs.',
        'Un QRS estimulado anormalmente ancho (> 200 ms) o una latencia espiga-QRS larga: comprueba el potasio y los fármacos.',
      ),
    ],
    criteria: [
      {
        label: l('失夺获', 'Failure to capture', 'Fallo de captura'),
        value: l(
          '不应期之外的起搏脉冲后无心房或心室除极',
          'A stimulus outside the refractory period with no atrial or ventricular depolarization',
          'Un estímulo fuera del periodo refractario sin despolarización auricular ni ventricular',
        ),
        source: 'Mason 2007 (AHA Part II); Ellenbogen 2017',
      },
      {
        label: l('高钾血症', 'Hyperkalaemia', 'Hiperpotasemia'),
        value: l(
          '血钾>7 mmol/L左右可使起搏QRS增宽、潜伏期延长，出现传出阻滞直至失夺获',
          'Potassium above about 7 mmol/L widens the paced QRS, lengthens latency and can cause exit block up to loss of capture',
          'Un potasio por encima de unos 7 mmol/L ensancha el QRS estimulado, alarga la latencia y puede causar bloqueo de salida hasta la pérdida de captura',
        ),
        source: 'Barold 2014',
      },
    ],
    mechanism: l(
      '起搏器发放了脉冲，但能量低于组织的夺获阈值，原因是阈值升高或导线已不再接触健康心肌。没有夺获时，心电图上只留下起搏信号，若患者没有逸搏心律，心室就会停搏。',
      'The pacemaker delivers its stimulus, but the energy is below the tissue’s capture threshold, because the threshold has risen or the lead no longer touches healthy myocardium. Without capture the stimulus leaves only its spike on the ECG, and if the patient has no escape rhythm the ventricles stop.',
      'El marcapasos libera su estímulo, pero la energía queda por debajo del umbral de captura del tejido, porque el umbral ha subido o el cable ya no contacta con miocardio sano. Sin captura, el estímulo solo deja su espiga en el ECG y, si el paciente no tiene ritmo de escape, los ventrículos se detienen.',
    ),
    mimics: [
      {
        id: 'pacing-undersensing',
        discriminator: l(
          '感知不足时脉冲落在自身QRS或T波内，处于不应期，不夺获属预期；失夺获是在可兴奋期不夺获。',
          'In undersensing the spikes fall inside intrinsic QRS or T waves, in the refractory period, where non-capture is expected; failure to capture happens when the heart is excitable.',
          'En la infradetección las espigas caen dentro de QRS u ondas T propios, en el periodo refractario, donde no capturar es lo esperado; el fallo de captura ocurre con el corazón excitable.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'pacing-oversensing',
        discriminator: l(
          '感知过度时长间歇中没有起搏信号；失夺获时有信号但无波群。',
          'In oversensing the long pause has no spikes; in failure to capture there are spikes without complexes.',
          'En la sobredetección la pausa larga no tiene espigas; en el fallo de captura hay espigas sin complejos.',
        ),
        leads: ['II', 'V1'],
      },
    ],
    pitfalls: [
      l(
        '把落在不应期内的脉冲称为失夺获。',
        'Calling a spike that falls in the refractory period a failure to capture.',
        'Llamar fallo de captura a una espiga que cae en el periodo refractario.',
      ),
      l(
        '漏看微小的双极起搏信号——要在多个导联中寻找。',
        'Missing tiny bipolar spikes: look for them in several leads.',
        'Pasar por alto espigas bipolares diminutas: búscalas en varias derivaciones.',
      ),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '立即评估患者和心律：心动过缓或血流动力学不稳定时开始经皮起搏；查血钾和药物，并紧急程控起搏器。',
        'Assess the patient and the rhythm now: start transcutaneous pacing if there is bradycardia with instability; check potassium and drugs, and arrange urgent device interrogation.',
        'Valora ya al paciente y el ritmo: inicia estimulación transcutánea si hay bradicardia con inestabilidad; comprueba potasio y fármacos y solicita una interrogación urgente del dispositivo.',
      ),
    },
    lessons: ['o11'],
    sources: [REF.mason2007, R.ellenbogen2017, R.barold2014, R.glikson2021],
    aka: ['loss of capture', 'non-capture', 'fallo de captura', 'pérdida de captura', '失夺获', '起搏器失夺获'],
    exemplar: { scenarios: ['pacing-failure-capture'], lead: 'II', leads: ['II', 'V1'] },
  },

  // ── pacemaker undersensing ───────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'pacing-undersensing',
    definition: l(
      '起搏器未感知到自身P波或QRS，仍按时发放脉冲，导致起搏信号出现在不恰当的时刻且计时不重整。',
      'The pacemaker fails to see intrinsic P waves or QRS complexes and fires as if they were absent, so spikes appear at the wrong times and the timing does not reset.',
      'El marcapasos no detecta las ondas P o los QRS propios y estimula como si no existieran, de modo que las espigas aparecen en momentos inadecuados y la temporización no se reinicia.',
    ),
    features: [
      l(
        '起搏信号出现在自身QRS之内或之后不久，甚至落在T波上。',
        'Spikes appear inside or just after intrinsic QRS complexes, or even on the T wave.',
        'Aparecen espigas dentro o justo después de QRS propios, o incluso sobre la onda T.',
      ),
      l(
        '自身搏动后起搏间期不重整。',
        'The pacing interval does not reset after an intrinsic beat.',
        'El intervalo de estimulación no se reinicia tras un latido propio.',
      ),
      l(
        '落在不应期的脉冲不夺获是预期的，不属于失夺获。',
        'Spikes in the refractory period do not capture, as expected; that is not failure to capture.',
        'Las espigas en el periodo refractario no capturan, como es de esperar; eso no es un fallo de captura.',
      ),
      l(
        '排除正常情况：磁铁模式（非同步起搏）、空白期或不应期内的功能性感知不足、融合与假性融合波。',
        'Rule out normal behaviour: magnet mode (asynchronous pacing), functional undersensing in blanking or refractory periods, fusion and pseudofusion beats.',
        'Descarta el funcionamiento normal: modo imán (estimulación asíncrona), infradetección funcional en periodos de blanking o refractarios, latidos de fusión y seudofusión.',
      ),
    ],
    criteria: [
      {
        label: l('感知不足（抑制失败）', 'Undersensing (failure to inhibit)', 'Infradetección (fallo de inhibición)'),
        value: l('自身搏动后仍按原计时发放脉冲', 'Stimuli delivered on the old timing despite intrinsic beats', 'Estímulos liberados con la temporización previa a pesar de los latidos propios'),
        source: 'Mason 2007 (AHA Part II); Ellenbogen 2017',
      },
      {
        label: l('融合与假性融合', 'Fusion and pseudofusion', 'Fusión y seudofusión'),
        value: l(
          '自身心率接近起搏频率时出现，属正常计时巧合，不是故障',
          'Seen when the intrinsic rate is close to the pacing rate; normal timing coincidences, not malfunction',
          'Aparecen cuando la frecuencia propia se acerca a la de estimulación; coincidencias normales, no un fallo',
        ),
        source: 'Ellenbogen 2017',
      },
    ],
    mechanism: l(
      '起搏器在导线尖端测量每个自身信号的振幅，当信号低于程控的感知灵敏度时，这次搏动就“看不见”。计时器于是继续从上一个事件开始计时并按时发放脉冲，而不管已经发生的自身搏动。',
      'The device measures the amplitude of each intrinsic signal at the lead tip, and when that signal falls below the programmed sensitivity the beat goes unseen. The timer therefore keeps running from the previous event and fires on schedule, regardless of the intrinsic beat that has already occurred.',
      'El dispositivo mide la amplitud de cada señal propia en la punta del cable, y cuando esa señal queda por debajo de la sensibilidad programada el latido pasa inadvertido. Por eso el temporizador sigue contando desde el evento anterior y estimula a su hora, sin tener en cuenta el latido propio que ya se ha producido.',
    ),
    mimics: [
      {
        id: 'paced-rhythm',
        discriminator: l(
          '正常起搏时可见融合或假性融合波，但自身搏动后计时会重整。',
          'Normal pacing can show fusion or pseudofusion beats, but the timing resets after intrinsic beats.',
          'La estimulación normal puede mostrar latidos de fusión o seudofusión, pero la temporización se reinicia tras los latidos propios.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'pacing-failure-capture',
        discriminator: l(
          '失夺获的脉冲落在可兴奋期却没有波群；感知不足的脉冲落在自身搏动之中。',
          'In failure to capture the spike falls when the heart is excitable but no complex follows; in undersensing the spike lands on an intrinsic beat.',
          'En el fallo de captura la espiga cae con el corazón excitable y no la sigue ningún complejo; en la infradetección la espiga cae sobre un latido propio.',
        ),
        leads: ['II', 'V1'],
      },
    ],
    pitfalls: [
      l(
        '把假性融合波称为感知不足。',
        'Calling pseudofusion beats undersensing.',
        'Llamar infradetección a los latidos de seudofusión.',
      ),
      l(
        '把磁铁引起的非同步起搏当作故障。',
        'Taking magnet-induced asynchronous pacing for a malfunction.',
        'Interpretar como fallo la estimulación asíncrona inducida por un imán.',
      ),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '当天程控起搏器；持续心电监护，因为落在T波上的脉冲可诱发室性心律失常。',
        'Arrange device interrogation the same day and monitor the rhythm, because a stimulus on the T wave can trigger a ventricular arrhythmia.',
        'Solicita la interrogación del dispositivo en el día y monitoriza el ritmo, porque un estímulo sobre la onda T puede desencadenar una arritmia ventricular.',
      ),
    },
    lessons: ['o11'],
    sources: [REF.mason2007, R.ellenbogen2017, R.glikson2021],
    aka: ['undersensing', 'failure to sense', 'failure to inhibit', 'infradetección', 'fallo de detección', '感知不足', '起搏器感知不良'],
    exemplar: { scenarios: ['pacing-undersensing'], lead: 'II', leads: ['II', 'V1'] },
  },

  // ── pacemaker oversensing ────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'pacing-oversensing',
    definition: l(
      '起搏器把非心脏或远场信号（肌电、电磁干扰、T波、导线噪声）误认为心搏而抑制起搏，造成超过低限频率间期且无起搏信号的长间歇。',
      'The pacemaker counts non-cardiac or far-field signals (muscle potentials, interference, T waves, lead noise) as heartbeats and withholds pacing, causing pauses longer than the lower-rate interval with no spikes.',
      'El marcapasos cuenta como latidos señales no cardiacas o de campo lejano (miopotenciales, interferencias, ondas T, ruido del cable) e inhibe la estimulación, con pausas más largas que el intervalo de frecuencia mínima y sin espigas.',
    ),
    features: [
      l(
        '间歇长于低限频率间期，间歇中既无起搏信号也无自身活动。',
        'A pause longer than the lower-rate interval, with neither spikes nor intrinsic activity inside it.',
        'Una pausa más larga que el intervalo de frecuencia mínima, sin espigas ni actividad propia en su interior.',
      ),
      l(
        '常与肌肉活动（肌电位）或基线噪声同时出现。',
        'Often coincides with muscle activity (myopotentials) or baseline noise.',
        'A menudo coincide con actividad muscular (miopotenciales) o ruido de la línea de base.',
      ),
      l(
        '起搏依赖者可发生晕厥或停搏；植入式除颤器的过感知可导致不恰当放电。',
        'In a pacing-dependent patient it causes syncope or asystole; in an ICD, oversensing can trigger inappropriate shocks.',
        'En un paciente dependiente causa síncope o asistolia; en un DAI la sobredetección puede provocar descargas inapropiadas.',
      ),
      l(
        '先排除正常功能：频率滞后、睡眠频率、减少右心室起搏的算法。',
        'First exclude normal functions: rate hysteresis, sleep rate and algorithms that minimise RV pacing.',
        'Descarta antes funciones normales: histéresis de frecuencia, frecuencia de sueño y algoritmos que reducen la estimulación del VD.',
      ),
    ],
    criteria: [
      {
        label: l('过感知（起搏失败）', 'Oversensing (failure to pace)', 'Sobredetección (fallo de estimulación)'),
        value: l('间歇>低限频率间期且无起搏脉冲', 'Pause > lower-rate interval without a stimulus', 'Pausa > intervalo de frecuencia mínima sin estímulo'),
        source: 'Mason 2007 (AHA Part II); Glikson 2021 (ESC pacing)',
      },
      {
        label: l('磁铁反应', 'Magnet response', 'Respuesta al imán'),
        value: l(
          '起搏器上放磁铁通常转为非同步起搏；植入式除颤器上放磁铁只暂停快速心律失常治疗，不改变起搏',
          'A magnet over a pacemaker usually gives asynchronous pacing; over an ICD it only suspends tachyarrhythmia therapy and does not change pacing',
          'Un imán sobre un marcapasos suele producir estimulación asíncrona; sobre un DAI solo suspende las terapias antitaquicardia y no cambia la estimulación',
        ),
        source: 'Crossley 2011 (HRS/ASA)',
      },
    ],
    mechanism: l(
      '导线上任何超过感知阈值的信号都会被当作心搏，包括肌电位、电磁干扰、高大T波或断裂导线的噪声。每个假事件都会重整起搏计时器，于是起搏器保持静默，而心脏可能已经停搏。',
      'Any signal at the lead that exceeds the sensing threshold is counted as a heartbeat, including muscle potentials, electromagnetic interference, large T waves or noise from a fractured lead. Each false event resets the pacing timer, so the device stays silent while the heart may be standing still.',
      'Cualquier señal en el cable que supere el umbral de detección se cuenta como un latido, incluidos los miopotenciales, las interferencias electromagnéticas, las ondas T grandes o el ruido de un cable fracturado. Cada evento falso reinicia el temporizador, así que el dispositivo permanece en silencio mientras el corazón puede estar parado.',
    ),
    mimics: [
      {
        id: 'pacing-failure-capture',
        discriminator: l(
          '失夺获时间歇中有起搏信号但无波群；过感知时间歇中没有任何信号。',
          'In failure to capture the pause contains spikes without complexes; in oversensing it contains no spikes at all.',
          'En el fallo de captura la pausa contiene espigas sin complejos; en la sobredetección no contiene ninguna espiga.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'sinus-pause',
        discriminator: l(
          '起搏器正常时，窦性停搏会在低限频率间期末被起搏搏动终止；过感知时间歇更长且无起搏信号。',
          'With a working pacemaker a sinus pause is ended by a paced beat at the lower-rate interval; with oversensing the pause runs longer with no spike.',
          'Con un marcapasos que funciona, una pausa sinusal termina con un latido estimulado al cumplirse el intervalo de frecuencia mínima; con sobredetección la pausa se alarga sin espiga.',
        ),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l(
        '把频率滞后或睡眠频率当作过感知。',
        'Calling rate hysteresis or a sleep rate oversensing.',
        'Llamar sobredetección a la histéresis de frecuencia o a la frecuencia de sueño.',
      ),
      l(
        '以为磁铁对植入式除颤器也会产生非同步起搏。',
        'Assuming a magnet makes an ICD pace asynchronously too.',
        'Suponer que un imán hace que un DAI estimule también de forma asíncrona.',
      ),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '间歇引起症状时：在起搏器（非植入式除颤器）上放置磁铁以非同步起搏，或行经皮起搏；紧急程控并去除干扰源。',
        'If pauses cause symptoms, place a magnet over a pacemaker (not an ICD) for asynchronous pacing or pace transcutaneously; arrange urgent interrogation and remove sources of interference.',
        'Si las pausas causan síntomas, coloca un imán sobre el marcapasos (no sobre un DAI) para estimular de forma asíncrona o estimula por vía transcutánea; solicita una interrogación urgente y elimina las fuentes de interferencia.',
      ),
    },
    lessons: ['o11', 'o10'],
    sources: [REF.mason2007, R.glikson2021, R.ellenbogen2017, R.crossley2011],
    aka: ['oversensing', 'myopotential inhibition', 'failure to pace', 'sobredetección', 'inhibición por miopotenciales', '感知过度', '起搏器过感知'],
    exemplar: { scenarios: ['pacing-oversensing'], lead: 'II', leads: ['II', 'V1'] },
  },
];
