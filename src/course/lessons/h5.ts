/**
 * h5 — Hypertrophic cardiomyopathy, including the apical form (docs/PLAN.md §3, stage H).
 * Criteria: docs/curriculum/criteria.md `hcm` row (current values) plus the "Missing in the book" bullet on HCM and
 * infiltrative LV thickening (deep narrow Q, giant negative T, phenocopy red flags) under
 * `atrial-enlargement-ventricular-hypertrophy`.
 */
import { l } from '../../core/l10n';
import type { EcgSource } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});
const GRID = { layout: '3x4+1' } as const;

const lesson: Lesson = {
  id: 'h5',
  stage: 'H',
  order: 5,
  title: l('肥厚型心肌病（含心尖肥厚型）', 'Hypertrophic cardiomyopathy, including the apical form', 'Miocardiopatía hipertrófica, incluida la forma apical'),
  summary: l(
    '肥厚型心肌病的心电图大多数异常：左心室肥厚电压加复极异常、下壁/侧壁深而窄的间隔 Q 波、左心房异常；心尖肥厚型则给出 V2–V5 巨大倒置 T 波。Q 波的方向判读——深+窄+年轻+电压指向肥厚，宽+territory+年长指向梗死。',
    'The ECG is abnormal in most hypertrophic cardiomyopathy patients: LVH voltage with a repolarisation abnormality, deep narrow septal Q waves in the inferior/lateral leads, and left atrial abnormality; the apical form adds giant negative T waves in V2–V5. Read the Q wave direction: deep + narrow + young + voltage means hypertrophy; wide + a territory + older means infarct.',
    'El ECG es anormal en la mayoría de los pacientes con miocardiopatía hipertrófica: voltaje de HVI con alteración de la repolarización, ondas Q septales profundas y estrechas en las derivaciones inferiores/laterales y anomalía auricular izquierda; la forma apical añade ondas T negativas gigantes en V2-V5. Lee la dirección de la Q: profunda + estrecha + joven + voltaje significa hipertrofia; ancha + un territorio + mayor edad significa infarto.',
  ),
  objectives: [
    l(
      '解释室间隔肥厚如何在侧壁（和下壁）导联产生深而窄的 Q 波，而左心室质量增大如何产生高电压。',
      'Explain how septal hypertrophy writes deep, narrow Q waves in the lateral (and inferior) leads while the increased LV mass writes the voltage.',
      'Explicar cómo la hipertrofia septal escribe ondas Q profundas y estrechas en las derivaciones laterales (e inferiores) y cómo el aumento de masa del VI escribe el voltaje.',
    ),
    l(
      '列出 HCM 的核心心电图组合（LVH 电压 + 复极异常、深而窄的 Q 波、左心房异常），并知道大多数患者心电图异常——它是敏感的筛查工具。',
      'List the core HCM ECG package (LVH voltage + repolarisation abnormality, deep narrow Q waves, left atrial abnormality) and know the ECG is abnormal in most patients — a sensitive screening tool.',
      'Enumerar el conjunto electrocardiográfico nuclear de la MCH (voltaje de HVI + alteración de la repolarización, ondas Q profundas y estrechas, anomalía auricular izquierda) y saber que el ECG es anormal en la mayoría: una herramienta de cribado sensible.',
    ),
    l(
      '用方向判读区分 HCM 的间隔 Q 波与缺血性梗死 Q 波（深+窄+年轻+电压 vs 宽+territory+年长）。',
      'Separate the septal Q of HCM from the ischaemic infarct Q by the direction rule (deep + narrow + young + voltage vs wide + a territory + older).',
      'Distinguir la Q septal de la MCH de la Q isquémica del infarto con la regla de dirección (profunda + estrecha + joven + voltaje frente a ancha + un territorio + mayor edad).',
    ),
    l(
      '识别心尖肥厚型（V2–V5 巨大倒置 T ≥10 mm）和表型模仿者红旗（短 PR/预激、室壁厚而电压低）。',
      'Recognise the apical form (giant negative T >=10 mm in V2–V5) and the phenocopy red flags (short PR / pre-excitation, thick walls with low voltage).',
      'Reconocer la forma apical (T negativa gigante >=10 mm en V2-V5) y las señales de alarma de fenocopias (PR corto / preexcitación, paredes gruesas con bajo voltaje).',
    ),
  ],
  minutes: 15,
  competencies: ['C7', 'C10'],
  findings: ['hcm', 'apical-hcm', 'lvh'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('hcm', 1281, { rate: 66 }),
      view: { layout: '3x4+1', highlightLeads: ['I', 'aVL', 'V5', 'V6'] },
      question: l(
        '24 岁男性，晕厥一次。12 导联上左心室电压很高，而 I、aVL、V5–V6 的 QRS 都以一个醒目的窄 q 波开始（aVL 和 V6 约 3.5 mm 深）。这个 Q 波把鉴别诊断引向哪一边？先想好你的判断再继续。',
        'A 24-year-old man, one syncope. On the 12-lead the LV voltage is high, and in I, aVL and V5–V6 the QRS opens with a conspicuous narrow q (about 3.5 mm deep in aVL and V6). Which way does that Q wave run the differential? Commit before you continue.',
        'Varón de 24 años, un síncope. En el ECG de 12 derivaciones el voltaje del VI es alto y en I, aVL y V5-V6 el QRS empieza con una q estrecha y llamativa (unos 3,5 mm de profundidad en aVL y V6). ¿Hacia qué lado dirige esa onda Q el diagnóstico diferencial? Decídete antes de continuar.',
      ),
      reveal: l(
        '**肥厚型心肌病的室间隔肥厚**，不是陈旧梗死。正常间隔除极自左向右、朝向前方——侧壁导联正常小 q 波的来源；肥厚的间隔把这个初始向量放大成一股背离侧壁导联的强力量，写出**深而窄**的 Q 波（I、aVL、V5–V6），而增厚的左心室游离壁同时给出高电压。年轻 + 深而窄 + 高电压，方向指向肥厚，不指向梗死。',
        '**Septal hypertrophy of hypertrophic cardiomyopathy**, not an old infarct. Normal septal activation runs left to right and forward — the origin of the normal small q of the lateral leads; the hypertrophied septum amplifies that initial vector into a strong force aimed away from the lateral leads, writing **deep, narrow** Q waves (I, aVL, V5–V6), while the thickened LV free wall supplies the high voltage at the same time. Young + deep-and-narrow + voltage points towards hypertrophy, not infarction.',
        '**Hipertrofia septal de la miocardiopatía hipertrófica**, no un infarto antiguo. La activación septal normal va de izquierda a derecha y hacia delante —el origen de la pequeña q normal de las derivaciones laterales—; el septo hipertrofiado amplifica ese vector inicial en una fuerza intensa que se aleja de las derivaciones laterales y escribe ondas Q **profundas y estrechas** (I, aVL, V5-V6), mientras la pared libre del VI, engrosada, aporta el voltaje alto. Joven + profunda y estrecha + voltaje apunta a hipertrofia, no a infarto.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('hcm', 1282, { rate: 68 }),
      showConduction: true,
      emphasize: ['lv-basal-anteroseptal', 'lv-basal-inferoseptal', 'lv-mid-anteroseptal', 'lv-mid-inferoseptal', 'lv-apical-septal', 'lv-mid-anterolateral', 'lv-mid-inferolateral'],
      caption: l(
        '播放一个心动周期。间隔除极从左束支进入室间隔，自左向右、朝向前方——这就是侧壁导联正常小 q 波的来源。室间隔肥厚把这一向量放大：**深而窄的间隔 q**（I、aVL、V5–V6）；左心室壁增厚让整个除极更强：高 R 与深 S（左心室肥厚电压）。两个机制住在同一份图上。很多患者还会加上第三个：左心房面对僵硬心室的异常（P 波增宽、切迹）——本图的 P 波还正常，别凭印象把它写进去。',
        'Play one beat. Septal activation enters the septum from the left bundle and runs left to right and forward — that is where the normal small q of the lateral leads comes from. Septal hypertrophy amplifies that vector: a **deep, narrow septal q** (I, aVL, V5–V6); the thickened LV wall strengthens the whole depolarisation: a tall R and a deep S (LVH voltage). Two mechanisms on one tracing. Many patients add a third — the atrial answer to a stiff ventricle, a broad, notched P (left atrial abnormality); the P on this tracing is still normal, so do not write it in from memory.',
        'Reproduce un latido. La activación septal entra en el septo por la rama izquierda y avanza de izquierda a derecha y hacia delante: de ahí sale la pequeña q normal de las derivaciones laterales. La hipertrofia septal amplifica ese vector: una **q septal profunda y estrecha** (I, aVL, V5-V6); la pared del VI engrosada refuerza toda la despolarización: R alta y S profunda (voltaje de HVI). Dos mecanismos en un mismo trazado. Muchos pacientes añaden un tercero, la respuesta auricular a un ventrículo rígido: una P ancha y con muesca (anomalía auricular izquierda); la P de este trazado aún es normal, así que no la escribas de memoria.',
      ),
    },
    {
      kind: 'criteria',
      title: l('肥厚型心肌病：读什么', 'HCM: what to read', 'MCH: qué leer'),
      items: [
        {
          label: l('筛查价值', 'Screening value', 'Valor de cribado'),
          value: l(
            '大多数 HCM 患者心电图异常（正常者只占少数）——敏感的筛查工具；但心电图正常不能完全排除，异常也不能确诊，超声/磁共振定诊',
            'The ECG is abnormal in most HCM patients (normal in only a small minority) — a sensitive screening tool; a normal ECG does not fully exclude it and an abnormal one does not confirm it; echo / MRI make the diagnosis',
            'El ECG es anormal en la mayoría de los pacientes con MCH (normal solo en una minoría): una herramienta de cribado sensible; un ECG normal no la excluye del todo y uno anormal no la confirma; el ecocardiograma / la resonancia dan el diagnóstico',
          ),
        },
        {
          label: l('核心组合', 'Core package', 'Conjunto nuclear'),
          value: l(
            'LVH 电压 + 复极异常（ST 段压低、T 波倒置，常见于侧壁）；左心房异常',
            'LVH voltage + repolarisation abnormality (ST depression, T inversion, often lateral); left atrial abnormality',
            'Voltaje de HVI + alteración de la repolarización (descenso del ST, T negativa, a menudo lateral); anomalía auricular izquierda',
          ),
        },
        {
          label: l('深而窄的 Q 波', 'Deep narrow Q waves', 'Ondas Q profundas y estrechas'),
          value: l(
            '深度 >3 mm 和/或时限 >40 ms，见于下壁（II、III、aVF）和/或侧壁（I、aVL、V4–V6）导联，源自室间隔肥厚',
            'Deeper than 3 mm and/or longer than 40 ms in the inferior (II, III, aVF) and/or lateral (I, aVL, V4–V6) leads, from septal hypertrophy',
            'Más de 3 mm de profundidad y/o más de 40 ms de duración en las derivaciones inferiores (II, III, aVF) y/o laterales (I, aVL, V4-V6), por hipertrofia septal',
          ),
        },
        {
          label: l('心尖肥厚型', 'Apical form', 'Forma apical'),
          value: l(
            'V2–V5 巨大倒置 T 波（≥10 mm），常伴 V3–V5 高 R；梗死样外观却没有梗死故事',
            'Giant negative T waves (>=10 mm) in V2–V5, often with a tall R in V3–V5; an infarct-like look with no infarct story',
            'Ondas T negativas gigantes (>=10 mm) en V2-V5, a menudo con R alta en V3-V5; aspecto de infarto sin historia de infarto',
          ),
        },
        {
          label: l('传导与心律', 'Conduction and rhythm', 'Conducción y ritmo'),
          value: l(
            '可有分支阻滞；未经治疗的 HCM 少见左束支阻滞（主要见于切除术后）；酒精室间隔消融后可见右束支阻滞；心房颤动常见',
            'Fascicular block is possible; LBBB is uncommon in untreated HCM (seen mainly after myectomy); RBBB appears after alcohol septal ablation; atrial fibrillation is common',
            'Puede haber bloqueo fascicular; el bloqueo de rama izquierda es infrecuente en la MCH no tratada (sobre todo tras miectomía); el bloqueo de rama derecha aparece tras la ablación septal alcohólica; la fibrilación auricular es frecuente',
          ),
        },
        {
          label: l('表型模仿者红旗', 'Phenocopy red flags', 'Señales de alarma de fenocopias'),
          value: l(
            '短 PR / 预激 → 想贮积性心肌病（PRKAG2、Danon、Pompe）；室壁厚而电压低 → 想浸润，首推心脏淀粉样变（h4）',
            'Short PR / pre-excitation -> think storage cardiomyopathy (PRKAG2, Danon, Pompe); thick walls with low voltage -> think infiltration, first of all cardiac amyloid (h4)',
            'PR corto / preexcitación -> piensa en miocardiopatía de depósito (PRKAG2, Danon, Pompe); paredes gruesas con bajo voltaje -> piensa en infiltración, ante todo amiloidosis cardíaca (h4)',
          ),
        },
      ],
      source:
        'Arbelo E et al. 2023 ESC Guidelines for the management of cardiomyopathies. Eur Heart J 2023;44:3503-3626; Hancock EW et al. AHA/ACCF/HRS Part V: ECG changes associated with cardiac chamber hypertrophy. Circulation 2009;119:e251-e261',
    },
    {
      kind: 'worked',
      title: l('Q 波的逻辑：肥厚还是梗死？', 'The Q-wave logic: hypertrophy or infarct?', 'La lógica de la Q: ¿hipertrofia o infarto?'),
      ecg: synth('hcm', 1283, { rate: 64 }),
      view: GRID,
      steps: [
        {
          title: l('找到 Q 波', 'Find the Q waves', 'Busca las ondas Q'),
          body: l(
            '在侧壁导联（I、aVL、V5–V6）逐个找 QRS 起始的负向波。本图它们又深又醒目——先别下结论，接着量。',
            'Find the initial negative deflection of the QRS in the lateral leads (I, aVL, V5–V6) one by one. Here they are deep and conspicuous — do not conclude yet; measure next.',
            'Busca la deflexión negativa inicial del QRS en las derivaciones laterales (I, aVL, V5-V6) una por una. Aquí son profundas y llamativas: no concluyas todavía, mide a continuación.',
          ),
          marks: [{ auto: 'q', lead: 'aVL' }, { auto: 'q', lead: 'V6' }],
          highlightLeads: ['I', 'aVL', 'V5', 'V6'],
        },
        {
          title: l('量深与宽', 'Measure depth and width', 'Mide profundidad y anchura'),
          body: l(
            '按病理性 Q 波的标准量：深度 >3 mm 和/或时限 >40 ms。本图 aVL 的 q 约 3.5 mm、V6 约 3 mm 深（>3 mm），I 和 V5 约 2 mm，全部 <40 ms。HCM 的 Q 通常靠**深度**达标——深而窄，间隔除极依然快，只是向量被放大；缺血性 Q 靠**宽度**达标——心肌失活，除极慢或缺失，Q 宽（≥40 ms）或呈 QS、R 波丢失。',
            'Measure against the standard for a pathological Q: deeper than 3 mm and/or longer than 40 ms. Here the q is about 3.5 mm deep in aVL and just over 3 mm in V6 (>3 mm), about 2 mm in I and V5, all <40 ms. The HCM Q usually qualifies on **depth** — deep but narrow, septal depolarisation still fast, only amplified; the ischaemic Q qualifies on **width** — myocardium inactivated, depolarisation slow or absent, a wide Q (>=40 ms) or a QS with a lost R.',
            'Mide con el estándar de la Q patológica: más de 3 mm de profundidad y/o más de 40 ms de duración. Aquí la q mide unos 3,5 mm de profundidad en aVL y algo más de 3 mm en V6 (>3 mm), y unos 2 mm en I y V5, todas <40 ms. La Q de la MCH suele cumplir por la **profundidad**: profunda pero estrecha, con la despolarización septal aún rápida, solo amplificada; la Q isquémica cumple por la **anchura**: miocardio inactivado, despolarización lenta o ausente, Q ancha (>=40 ms) o una QS con pérdida de la R.',
          ),
          marks: [{ auto: 'q', lead: 'V6' }],
          highlightLeads: ['V6'],
        },
        {
          title: l('读图的其余部分', 'Read the rest of the tracing', 'Lee el resto del trazado'),
          body: l(
            '深 Q 之外：V6 R 约 22 mm、V1 S 约 16 mm（Sokolow-Lyon 约 38 mm，LVH 电压）；V1 还有约 7 mm 的 R——肥厚的间隔向前的力量。再看 P 波：本图时限约 105 ms、没有切迹，**没有**左心房异常——组合里的这一项在这位患者身上缺席，照实写。这是一整套肥厚的表现，不是孤立的 Q 波。',
            'Beyond the deep Q: an R of about 22 mm in V6 and an S of about 16 mm in V1 (Sokolow-Lyon about 38 mm, LVH voltage); V1 also carries an R of about 7 mm — the forward force of the thick septum. Now the P: about 105 ms and unnotched here, so **no** left atrial abnormality — that member of the package is absent in this patient; report what is there. A whole hypertrophy package, not an isolated Q wave.',
            'Más allá de la Q profunda: R de unos 22 mm en V6 y S de unos 16 mm en V1 (Sokolow-Lyon de unos 38 mm, voltaje de HVI); V1 tiene además una R de unos 7 mm, la fuerza anterior del septo grueso. Mira ahora la P: unos 105 ms y sin muesca, así que **no** hay anomalía auricular izquierda; ese miembro del conjunto falta en este paciente: informa lo que hay. Un conjunto completo de hipertrofia, no una Q aislada.',
          ),
          marks: [{ auto: 'r', lead: 'V6' }, { auto: 's', lead: 'V1' }, { auto: 'r', lead: 'V1' }],
        },
        {
          title: l('结合背景再下结论', 'Put the context in before you conclude', 'Añade el contexto antes de concluir'),
          body: l(
            '24 岁、晕厥、没有梗死史；Q 波深而窄、侧壁分布而没有 ST–T 的演变故事：**间隔肥厚（HCM）**。方向判读：深 + 窄 + 年轻 + 高电压 ⇒ 肥厚；宽 + territory + 年长 + 缺血史 ⇒ 梗死。心电图给出方向，**超声、家系筛查与猝死风险评估**给出诊断和处理。',
            'Age 24, syncope, no infarct history; the Q is deep and narrow, lateral in distribution, with no evolving ST–T story: **septal hypertrophy (HCM)**. The direction rule: deep + narrow + young + voltage => hypertrophy; wide + a territory + older + ischaemic history => infarct. The ECG gives the direction; **echo, family screening and sudden-death risk assessment** give the diagnosis and the management.',
            '24 años, síncope, sin infarto previo; la Q es profunda y estrecha, de distribución lateral y sin historia de ST-T en evolución: **hipertrofia septal (MCH)**. La regla de dirección: profunda + estrecha + joven + voltaje => hipertrofia; ancha + un territorio + mayor edad + isquemia previa => infarto. El ECG marca la dirección; el **ecocardiograma, el cribado familiar y la evaluación del riesgo de muerte súbita** dan el diagnóstico y el manejo.',
          ),
        },
      ],
    },
    {
      kind: 'ecg',
      ecg: synth('hcm', 1285, { rate: 70 }, 'repolarization'),
      view: { layout: '3x4+1', highlightLeads: ['I', 'aVL', 'V5', 'V6'] },
      marks: [{ auto: 'q', lead: 'V6' }, { auto: 'r', lead: 'V5' }, { auto: 'st', lead: 'V6' }, { auto: 't', lead: 'V6' }],
      caption: l(
        'HCM 的日常面貌：深而窄的间隔 q + LVH 电压 + 侧壁复极异常（V5–V6 ST 压低约 1 mm、T 倒置，I 和 aVL 的 T 也倒置）；左心房异常常同行，但本图没有。大多数 HCM 患者的心电图异常——它是有用的筛查工具；少数心电图正常者也不能就此排除，超声才是裁判。',
        'The everyday face of HCM: a deep narrow septal q + LVH voltage + a lateral repolarisation abnormality (about 1 mm of ST depression with T inversion in V5–V6, and inverted T in I and aVL); left atrial abnormality often comes along, though not on this tracing. The ECG is abnormal in most HCM patients — a useful screening tool; the few with a normal ECG are not excluded either, and echo is the arbiter.',
        'La cara cotidiana de la MCH: q septal profunda y estrecha + voltaje de HVI + alteración lateral de la repolarización (descenso del ST de alrededor de 1 mm con T negativa en V5-V6, y T negativa también en I y aVL); la anomalía auricular izquierda suele acompañar, aunque no en este trazado. El ECG es anormal en la mayoría de los pacientes con MCH: una herramienta de cribado útil; a los pocos con ECG normal tampoco se les puede excluir, y el ecocardiograma es el árbitro.',
      ),
    },
    {
      kind: 'text',
      title: l('心尖肥厚型：巨大的 T 波', 'The apical form: the giant T wave', 'La forma apical: la onda T gigante'),
      body: l(
        '肥厚只限于心尖时，心电图换了一副面孔（山口病，Yamaguchi 综合征）：**V2–V5 巨大倒置 T 波（≥10 mm）**，伴 V3–V5 高 R，QT 常延长。没有胸痛故事、没有动态演变——这不是 NSTEMI，也不是 Wellens（Wellens 出现在胸痛后、伴 V2–V3 双相或深倒 T 而 R 波仍在）。巨大 T 倒置 + 高 R + 无梗死故事 ⇒ 想心尖肥厚，去成像（超声造影/心脏磁共振看心尖）。',
        'When the hypertrophy is confined to the apex, the ECG changes face (Yamaguchi syndrome): **giant negative T waves (>=10 mm) in V2–V5** with a tall R in V3–V5 and often a long QT. No chest-pain story, no dynamic course — this is not an NSTEMI and not Wellens (Wellens follows pain, with biphasic or deeply inverted T in V2–V3 while the R wave persists). Giant T inversion + tall R + no infarct story => think apical HCM and go to imaging (contrast echo / cardiac MRI for the apex).',
        'Cuando la hipertrofia se limita al ápex, el ECG cambia de cara (síndrome de Yamaguchi): **ondas T negativas gigantes (>=10 mm) en V2-V5** con R alta en V3-V5 y a menudo QT largo. Sin dolor torácico ni curso dinámico: no es un NSTEMI ni un Wellens (el Wellens sigue al dolor, con T bifásica o profundamente invertida en V2-V3 mientras la R persiste). T gigante negativa + R alta + sin historia de infarto => piensa en la forma apical y recurre a la imagen (ecocardiograma con contraste / resonancia para el ápex).',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('apical-hcm', 1284, { rate: 62 }),
      view: { layout: '3x4+1', highlightLeads: ['V3', 'V4', 'V5', 'V6'] },
      marks: [{ auto: 'r', lead: 'V4' }, { auto: 't', lead: 'V4' }, { auto: 't', lead: 'V5' }],
      caption: l(
        '52 岁男性，体检发现。胸导联 T 波深倒，最深在 V4（约 20 mm）和 V5（约 18 mm），V3、V6 也达约 10 mm，V2 只是浅倒；I、II、aVL 的 T 也倒置。前面是高 R（V5 约 15 mm）——"巨大 T + 高 R"，心尖肥厚的签名。患者不痛、肌钙蛋白不升；把它当 NSTEMI 送进导管室是错误方向，正确方向是成像看心尖。',
        'A 52-year-old man, an incidental finding. The precordial T waves are deeply inverted, deepest in V4 (about 20 mm) and V5 (about 18 mm), still about 10 mm in V3 and V6 and only shallow in V2; the T is inverted in I, II and aVL too. They follow a tall R (about 15 mm in V5) — "giant T + tall R", the signature of apical hypertrophy. The patient has no pain and the troponin is not rising; routing him to the cath lab as an NSTEMI is the wrong direction — the right one is imaging the apex.',
        'Varón de 52 años, hallazgo casual. Las T precordiales están profundamente invertidas, con el máximo en V4 (unos 20 mm) y V5 (unos 18 mm), todavía unos 10 mm en V3 y V6 y solo levemente en V2; la T también está invertida en I, II y aVL. Siguen a una R alta (unos 15 mm en V5): «T gigante + R alta», la firma de la hipertrofia apical. El paciente no tiene dolor y la troponina no sube; llevarlo al laboratorio de hemodinámica como NSTEMI es la dirección equivocada; la acertada es el estudio de imagen del ápex.',
      ),
    },
    {
      kind: 'text',
      title: l('红旗：这真的是 HCM 吗', 'Red flags: is this really HCM?', 'Señales de alarma: ¿es realmente una MCH?'),
      body: l(
        '影像上"室壁厚"不等于 HCM。两个心电图红旗提示表型模仿者：\n- **短 PR / 预激** + 室壁肥厚 → 想贮积性心肌病：PRKAG2、Danon、Pompe；\n- **室壁厚而电压低**（电压–质量不匹配）→ 想浸润，首推心脏淀粉样变（见 h4），可伴 V1–V3 假性梗死 Q/QS。\n这两面小旗改变整个检查方向（基因、轻链、核素显像），在读图时就要竖起来，不要等影像科先说。',
        'Thick walls on imaging are not the same as HCM. Two ECG red flags wave for phenocopies:\n- **short PR / pre-excitation** + hypertrophied walls -> think storage cardiomyopathy: PRKAG2, Danon, Pompe;\n- **thick walls with low voltage** (voltage–mass discordance) -> think infiltration, first of all cardiac amyloid (see h4), possibly with pseudo-infarct Q/QS in V1–V3.\nThese two small flags redirect the whole work-up (genetics, light chains, scintigraphy) — raise them at the reading stage, not after imaging says so.',
        'Unas paredes gruesas en la imagen no equivalen a una MCH. Dos banderas electrocardiográficas avisan de fenocopias:\n- **PR corto / preexcitación** + paredes hipertrofiadas -> piensa en miocardiopatía de depósito: PRKAG2, Danon, Pompe;\n- **paredes gruesas con bajo voltaje** (discordancia voltaje-masa) -> piensa en infiltración, ante todo amiloidosis cardíaca (ver h4), con posible Q/QS de pseudoinfarto en V1-V3.\nEstas dos pequeñas banderas reorientan todo el estudio (genética, cadenas ligeras, gammagrafía): ízalas ya en la lectura, no cuando la imagen lo diga.',
      ),
    },
    {
      kind: 'contrast',
      title: l('两个 Q 波的世界', 'The two Q-wave worlds', 'Los dos mundos de la onda Q'),
      view: GRID,
      left: {
        ecg: synth('hcm', 1286, { rate: 68 }),
        caption: l('HCM：aVL 深而窄的间隔 q，跟着高 R', 'HCM: a deep, narrow septal q in aVL, followed by a tall R', 'MCH: q septal profunda y estrecha en aVL, seguida de R alta'),
        marks: [{ auto: 'q', lead: 'aVL' }, { auto: 'r', lead: 'aVL' }],
      },
      right: {
        ecg: synth('old-mi', 1287, { rate: 72 }, 'lateral'),
        caption: l('陈旧侧壁梗死：宽 Q/QS，R 波丢失', 'An old lateral infarct: a wide Q/QS with the R wave lost', 'Infarto lateral antiguo: Q/QS ancha con pérdida de la R'),
        marks: [{ auto: 'qrs', lead: 'aVL' }],
      },
      point: l(
        '同看一个导联：左侧的 Q **深而窄**，QRS 其余部分照常强壮——间隔向量被放大，心肌活着；右侧的 Q/QS **宽**，R 波没了——心肌被瘢痕取代。再加上背景：24 岁晕厥 vs 68 岁或有梗死史。深+窄+年轻+电压 ⇒ 肥厚；宽+territory+年长 ⇒ 梗死。',
        'Watch one lead: on the left the Q is **deep but narrow** and the rest of the QRS is as strong as ever — an amplified septal vector with living myocardium; on the right the Q/QS is **wide** and the R is gone — myocardium replaced by scar. Then add the context: 24 with syncope vs 68 with an infarct history. Deep + narrow + young + voltage => hypertrophy; wide + a territory + older => infarct.',
        'Mira una sola derivación: a la izquierda la Q es **profunda pero estrecha** y el resto del QRS sigue vigoroso —vector septal amplificado, miocardio vivo—; a la derecha la Q/QS es **ancha** y la R ha desaparecido —miocardio sustituido por cicatriz—. Añade después el contexto: 24 años con síncope frente a 68 con infarto previo. Profunda + estrecha + joven + voltaje => hipertrofia; ancha + un territorio + mayor edad => infarto.',
      ),
    },
    { kind: 'check', item: { family: 'substrates', seed: 23 } },
    { kind: 'check', item: { family: 'substrates', seed: 21 } },
    { kind: 'drill', families: ['substrates', 'chambers'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [5105, 2415],
      caption: l(
        '两份真实的室间隔肥厚心电图：56 岁女性和 59 岁女性。先在侧壁和下壁导联找 Q 波，量深与宽，再看电压、P 波和 ST–T，定下"间隔肥厚还是梗死"的判断，然后揭晓。',
        'Two real septal-hypertrophy tracings: a 56-year-old and a 59-year-old woman. Hunt the Q waves in the lateral and inferior leads first, measure depth and width, then read the voltage, the P and the ST–T, and commit to "septal hypertrophy or infarct" before the reveal.',
        'Dos trazados reales de hipertrofia septal: una mujer de 56 años y otra de 59. Busca primero las ondas Q en las derivaciones laterales e inferiores, mide profundidad y anchura, lee después el voltaje, la P y el ST-T, y decide entre «hipertrofia septal o infarto» antes de la solución.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把 HCM 的 Q 波按梗死报告：深而窄 + 年轻 + 高电压指向间隔肥厚；宽 Q + territory + 年长才指向梗死。',
          'Reporting the Q waves of HCM as infarct: deep-and-narrow + young + voltage points to septal hypertrophy; a wide Q + a territory + older age points to infarct.',
          'Informar las ondas Q de la MCH como infarto: profunda y estrecha + joven + voltaje apunta a hipertrofia septal; una Q ancha + un territorio + mayor edad apunta a infarto.',
        ),
        l(
          '把心尖肥厚的巨大 T 倒置直接写成"缺血/NSTEMI"：V2–V5 倒置 ≥10 mm 伴高 R、无胸痛与动态演变，先想心尖肥厚，去成像。',
          'Writing the giant T inversion of apical HCM straight down as "ischaemia / NSTEMI": >=10 mm inversion in V2–V5 with a tall R, no pain and no dynamics — think apical hypertrophy first and image it.',
          'Anotar sin más la T negativa gigante de la forma apical como «isquemia / NSTEMI»: inversión >=10 mm en V2-V5 con R alta, sin dolor ni dinámica: piensa primero en la hipertrofia apical y pide imagen.',
        ),
        l(
          '脱离年龄、性别读电压：年轻男性电压本来就高，单纯高电压离 HCM 还很远；HCM 的力量在组合（电压 + 复极异常 + 深 Q + 左心房异常）。',
          'Reading voltage without age and sex: voltage runs high in young men anyway, and pure high voltage is still far from HCM; the power of HCM is in the package (voltage + repolarisation abnormality + deep Q + LA abnormality).',
          'Leer el voltaje sin la edad ni el sexo: en varones jóvenes el voltaje ya es alto de por sí, y un voltaje alto aislado está aún lejos de la MCH; la fuerza de la MCH está en el conjunto (voltaje + alteración de la repolarización + Q profunda + anomalía auricular izquierda).',
        ),
        l(
          '漏掉表型模仿者红旗：短 PR/预激提示 PRKAG2、Danon、Pompe；室壁厚而电压低提示淀粉样变——这两面旗改变整个检查方向。',
          'Missing the phenocopy red flags: short PR / pre-excitation suggests PRKAG2, Danon, Pompe; thick walls with low voltage suggests amyloid — these two flags redirect the whole work-up.',
          'Pasar por alto las señales de alarma de las fenocopias: un PR corto / preexcitación sugiere PRKAG2, Danon o Pompe; paredes gruesas con bajo voltaje sugieren amiloidosis: estas dos banderas reorientan todo el estudio.',
        ),
        l(
          '"心电图正常就排除 HCM"：方向错了——大多数 HCM 心电图异常，正常只占少数，但异常也不能确诊；定诊靠影像，怀疑即转诊（家系筛查、猝死风险评估）。',
          '"A normal ECG excludes HCM": the wrong direction — the ECG is abnormal in most HCM and normal only in a minority, yet an abnormal ECG does not confirm it either; imaging makes the diagnosis, and suspicion means referral (family screening, sudden-death risk assessment).',
          '«Un ECG normal excluye la MCH»: dirección equivocada; el ECG es anormal en la mayoría de las MCH y normal solo en una minoría, pero tampoco la anormalidad la confirma; el diagnóstico lo da la imagen y la sospecha implica derivación (cribado familiar, evaluación del riesgo de muerte súbita).',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          'HCM 的心电图大多数异常——敏感的筛查工具；但正常不能完全排除、异常也不能确诊，超声/磁共振定诊。',
          'The ECG is abnormal in most HCM patients — a sensitive screening tool; a normal ECG does not fully exclude it and an abnormal one does not confirm it; echo / MRI decide.',
          'El ECG es anormal en la mayoría de los pacientes con MCH: una herramienta de cribado sensible; un ECG normal no la excluye del todo y uno anormal no la confirma; deciden el ecocardiograma y la resonancia.',
        ),
        l(
          '核心组合：LVH 电压 + 复极异常（常侧壁）+ 深而窄的 Q 波（>3 mm 和/或 >40 ms，下壁和/或侧壁）+ 左心房异常。',
          'The core package: LVH voltage + repolarisation abnormality (often lateral) + deep narrow Q waves (>3 mm and/or >40 ms, inferior and/or lateral) + left atrial abnormality.',
          'El conjunto nuclear: voltaje de HVI + alteración de la repolarización (a menudo lateral) + ondas Q profundas y estrechas (>3 mm y/o >40 ms, inferiores y/o laterales) + anomalía auricular izquierda.',
        ),
        l(
          'Q 波方向判读：深 + 窄 + 年轻 + 高电压 ⇒ 间隔肥厚；宽 + territory + 年长 + 缺血史 ⇒ 梗死。',
          'Q-wave direction rule: deep + narrow + young + voltage => septal hypertrophy; wide + a territory + older + ischaemic history => infarct.',
          'Regla de dirección de la Q: profunda + estrecha + joven + voltaje => hipertrofia septal; ancha + un territorio + mayor edad + isquemia previa => infarto.',
        ),
        l(
          '心尖肥厚型：V2–V5 巨大倒置 T（≥10 mm）+ V3–V5 高 R，无梗死故事——不是 NSTEMI，去成像看心尖。',
          'Apical form: giant negative T (>=10 mm) in V2–V5 + tall R in V3–V5, with no infarct story — not an NSTEMI; image the apex.',
          'Forma apical: T negativa gigante (>=10 mm) en V2-V5 + R alta en V3-V5, sin historia de infarto: no es un NSTEMI; estudia el ápex con imagen.',
        ),
        l(
          '表型模仿者红旗：短 PR/预激 → PRKAG2、Danon、Pompe；室壁厚而电压低 → 淀粉样变（h4）。',
          'Phenocopy red flags: short PR / pre-excitation -> PRKAG2, Danon, Pompe; thick walls with low voltage -> amyloid (h4).',
          'Señales de alarma de fenocopias: PR corto / preexcitación -> PRKAG2, Danon, Pompe; paredes gruesas con bajo voltaje -> amiloidosis (h4).',
        ),
      ],
    },
  ],
  sources: [
    'Arbelo E et al. 2023 ESC Guidelines for the management of cardiomyopathies. Eur Heart J 2023;44:3503-3626',
    'Hancock EW et al. AHA/ACCF/HRS Part V: ECG changes associated with cardiac chamber hypertrophy. Circulation 2009;119:e251-e261',
    'Castellano et al. 2004',
  ],
};

export default lesson;
