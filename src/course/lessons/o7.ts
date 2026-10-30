/**
 * O7 — Pericarditis, effusion and tamponade (docs/PLAN.md §3, stage O).
 * Criteria: docs/curriculum/criteria.md "Acute pericarditis / tamponade" missing-book bullet (Adler 2015, ESC 2025),
 * `pulmonary-embolism`-section STEMI-mimics bullet (UDMI 2018), low-voltage + electrical-alternans signs (Part II).
 *
 * Tracings (checked against the model truth, tests/course/lessons-o.test.ts): `pericarditis` = sinus ≈ 96/min,
 * concave ST elevation (vs TP) ≈ 1.7 mm in II and ≈ 2–3 mm in V3–V4, ST depression only in aVR, PR depression ≈ 1 mm
 * in II and V4–V6 with PR elevation ≈ 1 mm in aVR, ST/T in V6 ≈ 0.5 (ST from the PR segment, as the ratio is defined);
 * `early-repolarization` has no PR shift and, since the 2026-10-29 final engine fix (tall, broad lateral T), a V6 ST/T
 * ≈ 0.2: the ER contrast shows both clues — the PR segment in II and the ST/T ratio in V6.
 * The engine does not draw Spodick's sign (a downsloping TP segment): it is taught in text only.
 */
import { l } from '../../core/l10n';
import type { EcgSource, Item } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});

/** The most specific clue for pericarditis over STEMI. */
const prClueCheck: Item = {
  id: 'o7:most-specific-clue',
  family: 'systemic',
  competency: 'C10',
  difficulty: 'classic',
  seed: 0,
  kind: 'choice',
  prompt: l(
    '32 岁男性，感冒一周后出现胸痛，前倾坐位时减轻。看这份心电图：哪一项最支持心包炎而不是 STEMI？',
    'A man of 32 with chest pain a week after a cold, easier when he sits forward. Look at this ECG: which finding best supports pericarditis over STEMI?',
    'Varón de 32 años con dolor torácico una semana después de un catarro, que mejora al inclinarse hacia delante. Mira este ECG: ¿qué hallazgo apoya mejor la pericarditis frente a un IAMCEST?',
  ),
  ecg: synth('pericarditis', 1528),
  view: { layout: '3x4+1', highlightLeads: ['II', 'aVR'] },
  explanation: l(
    'PR 段压低（II、V4–V6）并在 aVR 抬高：心房外膜也在发炎，这是心包炎最特异的线索。其余选项都不能把两者分开：II 导联 ST 抬高两者都有；胸前导联 T 波高大在早期 STEMI 和心包炎都可见；窦速只是发热和疼痛的反应。再加上 ST 抬高跨越血管分区、除 aVR（和 V1）外无对应性压低，答案就很清楚了。',
    'PR depression (II, V4–V6) with PR elevation in aVR: the atrial epicardium is inflamed too — the most specific clue to pericarditis. None of the other options separates the two: ST elevation in II occurs in both, tall precordial T waves are seen in early STEMI as well as pericarditis, and sinus tachycardia is just the response to fever and pain. Add ST elevation crossing coronary territories with no reciprocal depression except in aVR (and V1), and the answer is clear.',
    'Descenso del PR (II, V4–V6) con PR elevado en aVR: el epicardio auricular también está inflamado; es la pista más específica de pericarditis. Las demás opciones no separan los dos cuadros: la elevación del ST en II aparece en ambos, las T altas precordiales se ven tanto en el IAMCEST precoz como en la pericarditis y la taquicardia sinusal es solo la respuesta a la fiebre y el dolor. Añade una elevación del ST que cruza territorios coronarios sin descenso recíproco salvo en aVR (y V1) y la respuesta es clara.',
  ),
  findings: ['pericarditis'],
  key: {
    options: [
      { id: 'pr', label: l('PR 段压低，aVR 的 PR 抬高', 'PR depression, with PR elevation in aVR', 'Descenso del PR, con PR elevado en aVR') },
      { id: 'ste-ii', label: l('II 导联 ST 抬高', 'ST elevation in lead II', 'Elevación del ST en II') },
      { id: 'tall-t', label: l('V3–V4 的 T 波高大', 'Tall T waves in V3–V4', 'Ondas T altas en V3–V4') },
      { id: 'tachy', label: l('窦性心动过速', 'Sinus tachycardia', 'Taquicardia sinusal') },
    ],
    correct: 'pr',
  },
};

const lesson: Lesson = {
  id: 'o7',
  stage: 'O',
  order: 7,
  title: l('心包炎、心包积液与心脏压塞', 'Pericarditis, effusion and tamponade', 'Pericarditis, derrame pericárdico y taponamiento'),
  summary: l(
    '急性心包炎：广泛凹面向上 ST 抬高 + PR 段压低（aVR 的 PR 抬高），除 aVR/V1 外无对应性压低，可见 Spodick 征。大量积液或压塞：低电压、电交替、窦速。与 STEMI 的鉴别靠分布、PR 段、对应性与演变顺序；与早期复极的鉴别靠 V6 的 ST/T 比值与 PR 段。',
    'Acute pericarditis: widespread concave ST elevation + PR depression (PR elevation in aVR), no reciprocal depression except in aVR/V1, sometimes Spodick’s sign. Large effusion or tamponade: low voltage, electrical alternans, sinus tachycardia. Pericarditis vs STEMI is decided by distribution, the PR segment, reciprocity and the order of evolution; vs early repolarisation by the ST/T ratio in V6 and the PR segment.',
    'Pericarditis aguda: elevación del ST cóncava y difusa + descenso del PR (PR elevado en aVR), sin descensos recíprocos salvo en aVR/V1 y a veces con signo de Spodick. Derrame grande o taponamiento: bajo voltaje, alternancia eléctrica y taquicardia sinusal. La distinción con el IAMCEST depende de la distribución, el segmento PR, la reciprocidad y el orden evolutivo; con la repolarización precoz, del cociente ST/T en V6 y del segmento PR.',
  ),
  objectives: [
    l('用分布、PR 段和对应性三个问题把心包炎与 STEMI 分开。', 'Separate pericarditis from STEMI with three questions: distribution, the PR segment and reciprocity.', 'Separar la pericarditis del IAMCEST con tres preguntas: distribución, segmento PR y reciprocidad.'),
    l('用 V6 的 ST/T 比值和 PR 段把心包炎与早期复极分开。', 'Separate pericarditis from early repolarisation with the ST/T ratio in V6 and the PR segment.', 'Separar la pericarditis de la repolarización precoz con el cociente ST/T en V6 y el segmento PR.'),
    l('描述心包炎的分期与演变顺序（ST 先回落，T 再倒置）。', 'Describe the stages of pericarditis and their order (ST normalises before T inverts).', 'Describir las fases de la pericarditis y su orden (el ST se normaliza antes de que se invierta la T).'),
    l('认出积液/压塞的心电图组合（低电压、电交替、窦速），并知道压塞是临床诊断、超声是下一步。', 'Recognise the effusion/tamponade combination (low voltage, electrical alternans, sinus tachycardia) and know that tamponade is a clinical diagnosis with echo as the next step.', 'Reconocer la combinación derrame/taponamiento (bajo voltaje, alternancia eléctrica, taquicardia sinusal) y saber que el taponamiento es un diagnóstico clínico con la ecocardiografía como paso siguiente.'),
  ],
  minutes: 18,
  competencies: ['C10', 'C12'],
  findings: ['pericarditis', 'pericardial-effusion', 'electrical-alternans', 'low-voltage'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('pericarditis', 1521),
      view: { layout: '3x4+1', highlightLeads: ['II', 'aVR'] },
      question: l(
        '胸痛、广泛 ST 抬高：是 STEMI 还是心包炎？写下你将在两分钟内检查的特征。',
        'Chest pain with widespread ST elevation: STEMI or pericarditis? Write down the features you will check in the next two minutes.',
        'Dolor torácico con elevación difusa del ST: ¿IAMCEST o pericarditis? Escribe las características que comprobarás en los próximos dos minutos.',
      ),
      reveal: l(
        '**分布**、**PR 段**和**对应性**。这里 ST 凹面向上，在 I、II、aVF 和 V2–V6 广泛抬高（跨越血管分区），只有 aVR（和 V1）压低；PR 段在 II 和 V4–V6 压低、在 aVR 抬高——这是心包的弥漫性炎症，而不是某一支冠状动脉的地图。',
        '**Distribution**, the **PR segment** and **reciprocity**. Here the ST is concave and widely elevated in I, II, aVF and V2–V6 (crossing coronary territories), depressed only in aVR (and V1); the PR segment is depressed in II and V4–V6 and elevated in aVR — diffuse inflammation of the pericardium, not the map of one coronary artery.',
        '**Distribución**, **segmento PR** y **reciprocidad**. Aquí el ST es cóncavo y está elevado de forma difusa en I, II, aVF y V2–V6 (cruza territorios coronarios), y solo desciende en aVR (y V1); el PR desciende en II y V4–V6 y se eleva en aVR: inflamación difusa del pericardio, no el mapa de una arteria coronaria.',
      ),
    },
    {
      kind: 'text',
      title: l('三个问题', 'The three questions', 'Las tres preguntas'),
      body: l(
        '心包本身没有电活动；心电图看到的是**紧贴心包的心外膜**的炎症（损伤电流）：\n- **第一问：分布**。ST 抬高跨越血管分区（肢体 + 胸前广泛）、凹面向上 → 心包炎；局限在一组相邻导联 → STEMI（i1）。\n- **第二问：PR 段**。心房外膜的损伤电流使 PR 段压低（aVR 的 PR 抬高）——最特异的线索，也最常被忽略。量 PR 段要以 TP 段为基线。\n- **第三问：对应性**。心包炎只在 aVR（常含 V1）压低；STEMI 有镜像（下壁 STEMI 看 I/aVL，i4）。\n**Spodick 征**：TP 段向下倾斜（从 T 波末端到下一个 P 波逐渐下降），支持心包炎，但敏感性有限，心率快时也难评估。\n若有旧图，再看**演变**：心包炎 ST 先回基线、之后 T 才倒置；STEMI 的 T 倒置与 ST 抬高同期出现，并有 Q 波演变。',
        'The pericardium itself is electrically silent; the ECG sees the inflammation (an injury current) of the **epicardium right underneath it**:\n- **Question one: distribution.** ST elevation crossing coronary territories (limb + precordial, widespread), concave → pericarditis; confined to one contiguous group → STEMI (i1).\n- **Question two: the PR segment.** The atrial epicardial injury current depresses the PR segment (elevating it in aVR) — the most specific clue, and the most often missed. Measure the PR segment against the TP segment.\n- **Question three: reciprocity.** Pericarditis depresses only aVR (often V1 too); a STEMI has a mirror (for an inferior STEMI look at I/aVL, i4).\n**Spodick’s sign**: a downsloping TP segment (the line falls steadily from the end of the T to the next P) supports pericarditis, but its sensitivity is limited and it is hard to judge at fast rates.\nIf an old tracing exists, add **evolution**: in pericarditis the ST returns to baseline first and only then does the T invert; in a STEMI the T inverts while the ST is still up, with Q waves evolving.',
        'El pericardio no tiene actividad eléctrica propia; el ECG ve la inflamación (una corriente de lesión) del **epicardio que está justo debajo**:\n- **Primera pregunta: distribución.** Elevación del ST que cruza territorios coronarios (periféricas y precordiales, difusa) y cóncava → pericarditis; limitada a un grupo contiguo → IAMCEST (i1).\n- **Segunda pregunta: el segmento PR.** La corriente de lesión del epicardio auricular desciende el PR (y lo eleva en aVR): la pista más específica y la más olvidada. Mide el PR respecto al segmento TP.\n- **Tercera pregunta: reciprocidad.** La pericarditis solo desciende aVR (a menudo también V1); el IAMCEST tiene su imagen especular (en el inferior, mira I/aVL, i4).\n**Signo de Spodick**: un segmento TP descendente (la línea baja de forma continua desde el final de la T hasta la siguiente P) apoya la pericarditis, pero su sensibilidad es limitada y es difícil de valorar con frecuencias altas.\nSi hay un ECG previo, añade la **evolución**: en la pericarditis el ST vuelve primero a la línea de base y solo después se invierte la T; en el IAMCEST la T se invierte con el ST todavía elevado y aparecen ondas Q.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('pericarditis', 1522),
      view: { layout: '3x4+1', highlightLeads: ['II', 'aVR', 'V5'] },
      marks: [
        { auto: 'pr-segment', lead: 'II' },
        { auto: 'pr-segment', lead: 'aVR' },
        { auto: 'st', lead: 'V4' },
      ],
      caption: l(
        '把测量做出来，以 TP 段为基线：PR 段在 II 和 V4–V6 低约 1 mm，在 aVR 反而高出约 1 mm（标记处）；ST 段在 II 抬高约 1.5–2 mm、在 V3–V4 约 2–3 mm，都是凹面向上，aVR 的 ST 压低。如果你从已经压低的 PR 段量起，ST 抬高会显得更高（II 约 3 mm、V4 约 3.5 mm）——这又是一个要盯着 PR 段的理由。PR 段的偏移只有约 1 mm，必须盯着基线看才看得见。',
        'Make the measurements against the TP segment: the PR segment sits about 1 mm low in II and V4–V6 and about 1 mm high in aVR (marked); the ST is elevated about 1.5–2 mm in II and about 2–3 mm in V3–V4, all concave, and depressed in aVR. Measured from the already depressed PR segment, the ST elevation looks taller (about 3 mm in II, 3.5 mm in V4) — one more reason to watch the PR segment. Its shift is only about 1 mm: you only see it if you keep your eye on the baseline.',
        'Haz las mediciones respecto al segmento TP: el PR está alrededor de 1 mm por debajo en II y V4–V6 y alrededor de 1 mm por encima en aVR (marcado); el ST está elevado alrededor de 1,5-2 mm en II y de 2-3 mm en V3–V4, siempre cóncavo, y descendido en aVR. Si lo mides desde el PR, que ya está descendido, la elevación del ST parece mayor (unos 3 mm en II y 3,5 mm en V4): otra razón para vigilar el PR. Su desplazamiento es de solo 1 mm: solo lo ves si no le quitas ojo a la línea de base.',
      ),
    },
    {
      kind: 'criteria',
      title: l('心包炎与积液/压塞', 'Pericarditis and effusion/tamponade', 'Pericarditis y derrame/taponamiento'),
      items: [
        { label: l('心包炎：ST', 'Pericarditis: ST', 'Pericarditis: ST'), value: l('广泛凹面向上抬高，跨越血管分区；除 aVR（常含 V1）外无对应性压低', 'Widespread concave elevation across territories; no reciprocal depression except aVR (often V1)', 'Elevación cóncava difusa que cruza territorios; sin descensos recíprocos salvo aVR (a menudo V1)') },
        { label: l('心包炎：PR', 'Pericarditis: PR', 'Pericarditis: PR'), value: l('PR 段压低；aVR 的 PR 抬高（最特异）', 'PR-segment depression; PR elevation in aVR (most specific)', 'Descenso del PR; PR elevado en aVR (lo más específico)') },
        { label: l('支持征象', 'Supporting signs', 'Signos de apoyo'), value: l('Spodick 征（TP 段下斜）；V6 的 ST/T 比值 >0.25（对比早期复极）', 'Spodick’s sign (downsloping TP); ST/T ratio in V6 >0.25 (against early repolarisation)', 'Signo de Spodick (TP descendente); cociente ST/T en V6 >0,25 (frente a la repolarización precoz)') },
        { label: l('演变分期', 'Evolution stages', 'Fases evolutivas'), value: l('数天至数周；ST 先回基线，T 后倒置（与梗死相反）；可完全恢复', 'Days to weeks; ST normalises before T inverts (opposite of infarction); can fully resolve', 'Días a semanas; el ST se normaliza antes de que se invierta la T (lo contrario del infarto); puede normalizarse del todo') },
        { label: l('诊断地位', 'Diagnostic role', 'Papel diagnóstico'), value: l('新出现的广泛 ST 抬高或 PR 压低是临床诊断标准之一（另有胸痛、心包摩擦音、心包积液）', 'New widespread ST elevation or PR depression is one of the clinical criteria (with chest pain, a rub and an effusion)', 'La elevación difusa del ST o el descenso del PR de nueva aparición es uno de los criterios clínicos (junto al dolor, el roce y el derrame)') },
        { label: l('积液/压塞', 'Effusion/tamponade', 'Derrame/taponamiento'), value: l('低电压（肢体 QRS <5 mm、胸前 <10 mm）+ 电交替 + 窦性心动过速', 'Low voltage (limb QRS <5 mm, precordial <10 mm) + electrical alternans + sinus tachycardia', 'Bajo voltaje (QRS <5 mm en periféricas, <10 mm en precordiales) + alternancia eléctrica + taquicardia sinusal') },
        { label: l('压塞是临床诊断', 'Tamponade is clinical', 'El taponamiento es clínico'), value: l('低血压、颈静脉怒张、奇脉、心动过速——立即超声', 'Hypotension, raised JVP, pulsus paradoxus, tachycardia — echo now', 'Hipotensión, ingurgitación yugular, pulso paradójico, taquicardia: ecocardiografía urgente') },
      ],
      source: 'Adler Y et al. 2015 ESC Guidelines on pericardial diseases. Eur Heart J 2015;36:2921-2964; 2025 ESC Guidelines for the management of myocarditis and pericarditis. Eur Heart J 2025; Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269',
    },
    {
      kind: 'worked',
      title: l('三问法实战', 'The three questions in practice', 'Las tres preguntas en la práctica'),
      ecg: synth('pericarditis', 1522),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('圈出抬高', 'Circle the elevation', 'Rodea la elevación'),
          body: l('哪些导联抬高？I、II、aVF 和 V2–V6——下壁、侧壁和前壁同时抬高，没有哪一支冠状动脉能同时供应这么大的范围。形态是凹面向上的“笑脸”。', 'Which leads are elevated? I, II, aVF and V2–V6 — inferior, lateral and anterior at once; no single coronary artery supplies all of that. The shape is a concave "smile".', '¿Qué derivaciones están elevadas? I, II, aVF y V2–V6: inferior, lateral y anterior a la vez; ninguna arteria coronaria irriga todo eso. La forma es una "sonrisa" cóncava.'),
          marks: [{ auto: 'st', lead: 'II' }, { auto: 'st', lead: 'V4' }],
        },
        {
          title: l('看 PR 段', 'Check the PR segment', 'Mira el segmento PR'),
          body: l('把 TP 段当基线：PR 段在 II 和 V4–V6 低于它，在 aVR 高于它——心房外膜也发炎了。这一条在 STEMI 中很少见。', 'Use the TP segment as the baseline: the PR segment is below it in II and V4–V6 and above it in aVR — the atrial epicardium is inflamed too. STEMI rarely does this.', 'Usa el segmento TP como línea de base: el PR está por debajo en II y V4–V6 y por encima en aVR; el epicardio auricular también está inflamado. El IAMCEST rara vez hace esto.'),
          marks: [{ auto: 'pr-segment', lead: 'II' }, { auto: 'pr-segment', lead: 'aVR' }],
          highlightLeads: ['II', 'aVR'],
        },
        {
          title: l('查对应性', 'Check reciprocity', 'Comprueba la reciprocidad'),
          body: l('压低出现在哪里？只有 aVR（V1 也基本平）。I 和 aVL 没有镜像压低——如果是下壁 STEMI，aVL 一定会压低（i4）。', 'Where is the depression? Only in aVR (V1 is roughly flat). There is no mirror depression in I and aVL — an inferior STEMI would depress aVL (i4).', '¿Dónde está el descenso? Solo en aVR (V1 está prácticamente plana). No hay descenso especular en I ni aVL; un IAMCEST inferior descendería aVL (i4).'),
          highlightLeads: ['aVR', 'aVL', 'I'],
        },
        {
          title: l('结论与临床', 'Conclusion and clinic', 'Conclusión y clínica'),
          body: l('报告：窦性心律约 96 次/分，广泛凹面 ST 抬高伴 PR 段压低，aVR 的 ST 压低、PR 抬高——符合急性心包炎。下一步是临床与超声：胸痛性质（前倾减轻）、心包摩擦音、肌钙蛋白（升高提示心肌心包炎）、有无积液。若有任何疑问，复查心电图并按 STEMI 路径评估——宁可多问一次。', 'Report: sinus rhythm about 96/min, widespread concave ST elevation with PR depression, ST depression and PR elevation in aVR — consistent with acute pericarditis. The next step is clinical and echo: the pain (easier sitting forward), a rub, troponin (a rise suggests myopericarditis), any effusion. If in doubt, repeat the ECG and assess along the STEMI pathway — better to ask once more.', 'Informe: ritmo sinusal a unos 96 lpm, elevación del ST cóncava y difusa con descenso del PR, y descenso del ST con PR elevado en aVR: compatible con pericarditis aguda. El paso siguiente es clínico y ecocardiográfico: el dolor (mejora al inclinarse hacia delante), un roce, la troponina (si sube, miopericarditis) y si hay derrame. Ante cualquier duda, repite el ECG y valora por la vía del IAMCEST: mejor preguntar una vez más.'),
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('心包炎还是下壁 STEMI', 'Pericarditis or inferior STEMI', '¿Pericarditis o IAMCEST inferior?'),
      view: { layout: '3x4+1', highlightLeads: ['II', 'III', 'aVL'] },
      left: {
        ecg: synth('pericarditis', 1523),
        caption: l('急性心包炎：广泛抬高，aVL 不压低，PR 压低', 'Acute pericarditis: widespread elevation, no depression in aVL, PR depressed', 'Pericarditis aguda: elevación difusa, sin descenso en aVL, PR descendido'),
        marks: [{ auto: 'st', lead: 'II' }, { auto: 'st', lead: 'aVL' }],
      },
      right: {
        ecg: synth('stemi-inferior', 1524),
        caption: l('下壁 STEMI：III > II 抬高，aVL 与 I 镜像压低，PR 正常', 'Inferior STEMI: elevation III > II, mirror depression in aVL and I, normal PR', 'IAMCEST inferior: elevación III > II, descenso especular en aVL e I, PR normal'),
        marks: [{ auto: 'st', lead: 'III' }, { auto: 'st', lead: 'aVL' }],
      },
      point: l(
        '两侧下壁导联都抬高。左：抬高广泛（含胸前）、II ≥ III、aVL 不压低、PR 段压低、aVR 是唯一的“对应”导联。右：抬高集中在 II/III/aVF 且 **III > II**，I/aVL 明确压低，PR 正常——一支冠状动脉的地图。第四步永远是临床与演变（体位、摩擦音、肌钙蛋白、复查心电图）。',
        'Both sides elevate inferiorly. Left: elevation is widespread (precordium included), II ≥ III, no depression in aVL, PR depressed, aVR the lone "reciprocal". Right: elevation confined to II/III/aVF with **III > II**, clear depression in I/aVL and a normal PR — the map of one coronary artery. Step four is always the clinical picture and evolution (posture, rub, troponin, repeat ECG).',
        'Ambos lados elevan las inferiores. Izquierda: elevación difusa (también precordiales), II ≥ III, sin descenso en aVL, PR descendido y aVR como único "recíproco". Derecha: elevación limitada a II/III/aVF con **III > II**, descenso claro en I/aVL y PR normal: el mapa de una arteria coronaria. El cuarto paso es siempre la clínica y la evolución (postura, roce, troponina, ECG seriado).',
      ),
    },
    {
      kind: 'contrast',
      title: l('心包炎还是早期复极', 'Pericarditis or early repolarisation', '¿Pericarditis o repolarización precoz?'),
      view: { highlightLeads: ['II', 'V6'] },
      left: {
        ecg: synth('pericarditis', 1521),
        caption: l(
          '心包炎：约 96 次/分；II 导联 PR 段比 TP 段低约 1 mm，ST 凹面抬高（距 TP 约 1.5–2 mm）；V6 的 ST 约为 T 波高度的一半（ST/T 约 0.55）',
          'Pericarditis: about 96/min; in II the PR segment about 1 mm below the TP segment and concave ST elevation about 1.5–2 mm above TP; in V6 the ST is about half the height of the T (ST/T ≈ 0.55)',
          'Pericarditis: unas 96 lpm; en II el PR alrededor de 1 mm por debajo del TP y elevación cóncava del ST de 1,5-2 mm sobre el TP; en V6 el ST mide cerca de la mitad de la altura de la T (ST/T ≈ 0,55)',
        ),
        marks: [{ auto: 'pr-segment', lead: 'II' }, { auto: 'st60', lead: 'II' }, { auto: 'st60', lead: 'V6' }],
      },
      right: {
        ecg: synth('early-repolarization', 1527),
        caption: l(
          '早期复极：约 62 次/分；II 导联 PR 段与 TP 段平齐，J 点抬高约 1.5 mm、R 降支带切迹；V6 的 T 波高大，远高于约 1 mm 的 ST（ST/T 约 0.2）',
          'Early repolarisation: about 62/min; in II the PR segment level with the TP segment and the J point up about 1.5 mm with a notch on the R downslope; in V6 a tall T towers over an ST of about 1 mm (ST/T ≈ 0.2)',
          'Repolarización precoz: unas 62 lpm; en II el PR al nivel del TP y el punto J elevado unos 1,5 mm con muesca en la rama descendente de la R; en V6 una T alta domina sobre un ST de alrededor de 1 mm (ST/T ≈ 0,2)',
        ),
        marks: [{ auto: 'pr-segment', lead: 'II' }, { auto: 'j', lead: 'II' }, { auto: 'st60', lead: 'V6' }],
      },
      point: l(
        '年轻人、广泛的凹面 ST 抬高——良性早期复极还是心包炎？先以 TP 段为基线看 PR 段：心包炎压低（这里约 1 mm），早期复极与 TP 平齐。再看心率和患者：心包炎有胸痛，常伴窦性心动过速；早期复极没有胸痛、心率正常、多年不变——旧图会说话。经典的第三条线索在 V6：以 PR 段为基线，用 ST 抬高的高度除以 T 波高度，**>0.25 支持心包炎**（炎症把整段 ST 抬起来），<0.25 支持早期复极——这里左图约 0.55，右图约 0.2。它是有用的线索，不是绝对规则——要与 PR 段和病史一起权衡。',
        'A young person with widespread concave ST elevation — benign early repolarisation or pericarditis? Start with the PR segment against the TP segment: depressed in pericarditis (about 1 mm here), level in early repolarisation. Then the rate and the patient: pericarditis hurts and often brings a sinus tachycardia; early repolarisation has no chest pain, a normal rate, and stays the same for years — an old ECG speaks. The classic third clue is in V6: measured from the PR segment, divide the height of the ST elevation by the height of the T wave — **>0.25 favours pericarditis** (the inflammation lifts the whole ST), <0.25 favours early repolarisation; here about 0.55 on the left against about 0.2 on the right. It is a helpful clue, not an absolute rule: weigh it together with the PR segment and the story.',
        'Una persona joven con elevación difusa y cóncava del ST: ¿repolarización precoz benigna o pericarditis? Empieza por el segmento PR respecto al TP: descendido en la pericarditis (aquí alrededor de 1 mm), al mismo nivel en la repolarización precoz. Después la frecuencia y el paciente: la pericarditis duele y a menudo trae taquicardia sinusal; la repolarización precoz no duele, tiene frecuencia normal y no cambia en años; un ECG previo habla. La tercera pista clásica está en V6: tomando el PR como referencia, divide la altura de la elevación del ST entre la altura de la T; **>0,25 apoya la pericarditis** (la inflamación levanta todo el ST), <0,25 apoya la repolarización precoz; aquí, unos 0,55 a la izquierda frente a unos 0,2 a la derecha. Es una pista útil, no una regla absoluta: pondérala junto con el segmento PR y la historia.',
      ),
    },
    {
      kind: 'text',
      title: l('积液与压塞：电压变小、心脏摆动', 'Effusion and tamponade: smaller voltage, a swinging heart', 'Derrame y taponamiento: menos voltaje y un corazón que se balancea'),
      body: l(
        '心包里的液体像一层导电的“短路”，把心脏的电场分流掉，所以：\n- **低电压**：所有肢体导联 QRS 峰峰值 <5 mm，或所有胸前导联 <10 mm。低电压的其他原因：肥胖、肺气肿、浸润性心肌病（淀粉样变）、甲减、大面积梗死（h4）——低电压是“去找原因”，不是诊断。\n- **电交替**：大量积液中心脏逐搏前后摆动，QRS 振幅（有时连同 P、T）高低交替。它特异性高、敏感性低。\n- **窦性心动过速**：每搏量下降，心率代偿。\n**心脏压塞是临床诊断**：低血压、颈静脉怒张、心音遥远（Beck 三联征），奇脉，心动过速。心电图可以提示、不能排除；看到低电压 + 心动过速 + 呼吸困难或低血压，**马上做超声**——压塞需要心包穿刺，不是等心电图“更典型”。',
        'Fluid in the pericardium acts as a conductive "short circuit" that shunts the heart’s electrical field away, so:\n- **low voltage**: peak-to-peak QRS <5 mm in every limb lead, or <10 mm in every precordial lead. Other causes of low voltage: obesity, emphysema, infiltrative cardiomyopathy (amyloid), hypothyroidism, extensive infarction (h4) — low voltage means "go and find the cause", not a diagnosis;\n- **electrical alternans**: in a large effusion the heart swings back and forth beat by beat, so the QRS amplitude (sometimes the P and T too) alternates. Highly specific, not sensitive;\n- **sinus tachycardia**: the stroke volume falls and the rate compensates.\n**Tamponade is a clinical diagnosis**: hypotension, raised JVP, muffled heart sounds (Beck’s triad), pulsus paradoxus, tachycardia. The ECG can suggest it but cannot exclude it; low voltage + tachycardia + breathlessness or hypotension means **echo now** — tamponade needs pericardiocentesis, not a more typical ECG.',
        'El líquido del pericardio actúa como un "cortocircuito" conductor que deriva el campo eléctrico del corazón, por eso:\n- **bajo voltaje**: QRS pico a pico <5 mm en todas las derivaciones de los miembros o <10 mm en todas las precordiales. Otras causas de bajo voltaje: obesidad, enfisema, miocardiopatía infiltrativa (amiloidosis), hipotiroidismo, infarto extenso (h4); el bajo voltaje significa "busca la causa", no es un diagnóstico;\n- **alternancia eléctrica**: en un derrame grande el corazón se balancea latido a latido, de modo que la amplitud del QRS (a veces también de la P y la T) alterna. Muy específica, poco sensible;\n- **taquicardia sinusal**: cae el volumen sistólico y la frecuencia compensa.\n**El taponamiento es un diagnóstico clínico**: hipotensión, ingurgitación yugular, tonos apagados (tríada de Beck), pulso paradójico y taquicardia. El ECG puede sugerirlo pero no descartarlo; bajo voltaje + taquicardia + disnea o hipotensión significa **ecocardiografía ya**: el taponamiento necesita una pericardiocentesis, no un ECG más típico.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('pericardial-effusion', 1525),
      view: { layout: '3x4+1' },
      marks: [{ auto: 'qrs', lead: 'I' }, { auto: 'rr', lead: 'II' }],
      caption: l(
        '大量心包积液：所有肢体导联 QRS 都不到 5 mm（低电压），窦性心动过速约 106 次/分。胸前导联也变小了。仅凭这份图你说不出原因——它只告诉你“去做超声”。',
        'A large pericardial effusion: the QRS is under 5 mm in every limb lead (low voltage), with sinus tachycardia at about 106/min. The chest leads are smaller too. From this tracing alone you cannot name the cause — it only tells you "get an echo".',
        'Derrame pericárdico abundante: el QRS mide menos de 5 mm en todas las derivaciones de los miembros (bajo voltaje), con taquicardia sinusal a unos 106 lpm. Las precordiales también son pequeñas. Solo con este trazado no puedes nombrar la causa: solo te dice "pide una ecocardiografía".',
      ),
    },
    {
      kind: 'worked',
      title: l('找到电交替', 'Finding electrical alternans', 'Encontrar la alternancia eléctrica'),
      ecg: synth('electrical-alternans', 1526),
      view: { layout: '3x4+1', highlightLeads: ['V3', 'V4'] },
      steps: [
        {
          title: l('心率与电压', 'Rate and voltage', 'Frecuencia y voltaje'),
          body: l('窦性心动过速约 112 次/分；肢体导联 QRS 都很小（低电压）。已经是“积液”的模样了。', 'Sinus tachycardia at about 112/min; the limb-lead QRS complexes are all small (low voltage). Already the look of an effusion.', 'Taquicardia sinusal a unos 112 lpm; los QRS de los miembros son todos pequeños (bajo voltaje). Ya tiene el aspecto de un derrame.'),
          marks: [{ auto: 'rr', lead: 'II' }, { auto: 'qrs', lead: 'I' }],
        },
        {
          title: l('逐搏比较 R 波', 'Compare the R waves beat by beat', 'Compara las R latido a latido'),
          body: l('在 V3–V4 里，从左到右逐个看 R 波的高度：高、低、高、低……相邻两搏的振幅交替，而节律本身是规则的。肢体导联太小，交替不明显——找 QRS 最大的导联。', 'In V3–V4, look at the height of each R from left to right: tall, short, tall, short… Neighbouring beats alternate in amplitude while the rhythm itself stays regular. The limb leads are too small to show it — look where the QRS is biggest.', 'En V3–V4 mira la altura de cada R de izquierda a derecha: alta, baja, alta, baja… Los latidos vecinos alternan en amplitud mientras el ritmo sigue siendo regular. Las derivaciones de los miembros son demasiado pequeñas para mostrarlo: busca donde el QRS es mayor.'),
          marks: [{ auto: 'r', lead: 'V3', beat: 4 }, { auto: 'r', lead: 'V3', beat: 5 }],
          highlightLeads: ['V3', 'V4'],
        },
        {
          title: l('排除其他原因', 'Exclude the other causes', 'Descarta otras causas'),
          body: l('交替不等于积液：体位变化、呼吸会让振幅缓慢起伏（不是逐搏交替）；室上速时也可见 QRS 交替。逐搏、规则、伴低电压与窦速——这一组合才指向大量积液。', 'Alternation is not always effusion: posture and breathing make amplitude wax and wane slowly (not every other beat), and QRS alternans can also appear during SVT. Beat-to-beat, regular, with low voltage and sinus tachycardia — that combination points to a large effusion.', 'Alternar no siempre es derrame: la postura y la respiración hacen que la amplitud suba y baje lentamente (no latido a latido), y en la TSV también puede verse alternancia del QRS. Latido a latido, regular, con bajo voltaje y taquicardia sinusal: esa combinación apunta a un derrame grande.'),
        },
        {
          title: l('行动', 'Act', 'Actúa'),
          body: l('低电压 + 电交替 + 窦速 = 大量积液，可能压塞——测血压、看颈静脉、查奇脉，**立即床旁超声**。不稳定的压塞需要心包穿刺。别把电交替写成“伪差”。', 'Low voltage + alternans + sinus tachycardia = a large effusion, possibly tamponade — check the blood pressure, the JVP and for pulsus paradoxus, and get a **bedside echo now**. Unstable tamponade needs pericardiocentesis. Do not write alternans off as "artefact".', 'Bajo voltaje + alternancia + taquicardia sinusal = derrame grande, posible taponamiento: toma la tensión, mira la yugular, busca el pulso paradójico y haz una **ecocardiografía a pie de cama ya**. El taponamiento inestable necesita pericardiocentesis. No despaches la alternancia como "artefacto".'),
        },
      ],
    },
    { kind: 'check', item: { inline: prClueCheck } },
    { kind: 'check', item: { family: 'systemic', seed: 2 } },
    { kind: 'check', item: { family: 'systemic', seed: 5 } },
    { kind: 'check', item: { family: 'systemic', seed: 9 } },
    { kind: 'drill', families: ['systemic'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [10303, 12632],
      caption: l(
        'PTB-XL 没有心包炎或积液标签，但有标注为“低电压”的真实心电图：一份窦性心律，一份心房颤动约 100 次/分。先自己量：每个肢体导联的 QRS 峰峰值是否都 <5 mm？胸前导联呢？然后想一想——仅凭心电图，你能说出低电压的原因吗？（不能：积液、肥胖、肺气肿、淀粉样变……需要临床与超声。）',
        'PTB-XL has no pericarditis or effusion label, but it has real tracings labelled "low voltage": one in sinus rhythm, one in atrial fibrillation at about 100/min. Measure first: is the peak-to-peak QRS <5 mm in every limb lead? And the chest leads? Then ask yourself: from the ECG alone, can you name the cause? (No: effusion, obesity, emphysema, amyloid… need the clinical picture and an echo.)',
        'PTB-XL no tiene etiquetas de pericarditis ni de derrame, pero sí trazados reales etiquetados como "bajo voltaje": uno en ritmo sinusal y otro en fibrilación auricular a unos 100 lpm. Mide primero: ¿el QRS pico a pico es <5 mm en todas las derivaciones de los miembros? ¿Y en las precordiales? Después pregúntate: solo con el ECG, ¿puedes nombrar la causa? (No: derrame, obesidad, enfisema, amiloidosis… necesitan la clínica y una ecocardiografía.)',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l('PR 段压低被忽略（最特异的线索）——或者以 PR 段本身当基线去量 ST。', 'Overlooking PR depression (the most specific clue) — or using the PR segment itself as the baseline for the ST.', 'No ver el descenso del PR (la pista más específica), o usar el propio PR como línea de base para medir el ST.'),
        l('肌钙蛋白升高就把心包炎改成心肌梗死（心肌心包炎存在）——但也别反过来：有疑问就按 STEMI 路径评估。', 'Changing pericarditis to MI just because troponin is up (myopericarditis exists) — but not the reverse either: when in doubt, assess along the STEMI pathway.', 'Cambiar la pericarditis por infarto solo porque sube la troponina (existe la miopericarditis), pero tampoco al revés: ante la duda, valora por la vía del IAMCEST.'),
        l('把年轻人的早期复极叫作心包炎（或相反）：量 V6 的 ST/T 比值，看 PR 段，问症状。', 'Calling a young person’s early repolarisation pericarditis (or the reverse): measure the ST/T ratio in V6, check the PR segment, ask about symptoms.', 'Llamar pericarditis a la repolarización precoz de un joven (o al revés): mide el cociente ST/T en V6, mira el PR y pregunta por los síntomas.'),
        l('电交替被当作伪差或体位变化。', 'Electrical alternans dismissed as artefact or posture.', 'Despachar la alternancia eléctrica como artefacto o cambio postural.'),
        l('低电压 + 心动过速 + 呼吸困难的患者没做超声——等着心电图“更典型”。', 'A low-voltage, tachycardic, breathless patient left without an echo while waiting for a "more typical" ECG.', 'Dejar sin ecocardiografía a un paciente con bajo voltaje, taquicardia y disnea esperando un ECG "más típico".'),
        l('心包炎后期（ST 回落、T 倒置）误读为“演变期心肌梗死”：问时间线，看有无 Q 波。', 'Late pericarditis (ST back to baseline, T inverted) read as "evolving MI": ask about the timeline and look for Q waves.', 'Leer la pericarditis tardía (ST normalizado, T negativa) como "infarto en evolución": pregunta por la cronología y busca ondas Q.'),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('心包炎 = 广泛凹面 ST 抬高 + PR 压低（aVR 的 PR 抬高）+ 除 aVR/V1 外无对应性压低；Spodick 征支持。', 'Pericarditis = widespread concave ST elevation + PR depression (PR elevation in aVR) + no reciprocal depression except aVR/V1; Spodick’s sign supports it.', 'Pericarditis = elevación cóncava difusa del ST + descenso del PR (PR elevado en aVR) sin descensos recíprocos salvo aVR/V1; el signo de Spodick la apoya.'),
        l('与 STEMI 的鉴别：分布、PR 段、对应性、演变顺序；有疑问就按 STEMI 评估。', 'Vs STEMI: distribution, PR segment, reciprocity, order of evolution; when in doubt, assess as a STEMI.', 'Frente al IAMCEST: distribución, segmento PR, reciprocidad y orden evolutivo; ante la duda, valora como IAMCEST.'),
        l('与早期复极的鉴别：V6 的 ST/T >0.25 与 PR 压低支持心包炎。', 'Vs early repolarisation: an ST/T ratio >0.25 in V6 and PR depression favour pericarditis.', 'Frente a la repolarización precoz: un cociente ST/T >0,25 en V6 y el descenso del PR apoyan la pericarditis.'),
        l('演变：ST 先回基线，T 后倒置（与梗死相反），可完全恢复。', 'Evolution: ST normalises first, T inverts after (the reverse of infarction), and it can fully resolve.', 'Evolución: el ST se normaliza antes y la T se invierte después (lo contrario del infarto), y puede normalizarse del todo.'),
        l('积液/压塞：低电压 + 电交替 + 窦速；压塞是临床诊断，超声决定。', 'Effusion/tamponade: low voltage + alternans + sinus tachycardia; tamponade is clinical, and echo decides.', 'Derrame/taponamiento: bajo voltaje + alternancia + taquicardia sinusal; el taponamiento es clínico y lo decide la ecocardiografía.'),
      ],
    },
  ],
  sources: [
    'Adler Y et al. 2015 ESC Guidelines for the diagnosis and management of pericardial diseases. Eur Heart J 2015;36:2921-2964',
    '2025 ESC Guidelines for the management of myocarditis and pericarditis. Eur Heart J 2025;46:3952',
    'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269',
    'Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    'Ginzton LE, Laks MM. The differential diagnosis of acute pericarditis from the normal variant: new electrocardiographic criteria. Circulation 1982;65:1004-1009',
    'Castellano et al. 2004',
  ],
};

export default lesson;
