/**
 * X1 — The structured report (docs/PLAN.md §3, stage X).
 * The report skeleton follows the systematic order taught since s1 and mirrored by the Tools checklist and the
 * ReportForm; statement wording per the AHA/ACCF/HRS diagnostic statement list (Mason 2007); machine-statement
 * comparison per the Schläpfer/Wellens bullet of docs/curriculum/criteria.md; ST thresholds per UDMI (Thygesen 2018).
 *
 * ECGs: hook and worked example are synthetic anterior STEMIs (stemi-anterior seeds 1801/1802: sinus ≈ 84/min, PR 160,
 * QRS ≈ 95, QTc (Fridericia) ≈ 410, axis ≈ +40°, ST ↑ V1–V4 with a maximum ≈ 4 mm in V3, reciprocal ↓ in II/III/aVF);
 * the inline report check is real PTB-XL case 4440 (F63, labels: sinus rhythm + first-degree AV block; 12SL: HR 85,
 * PR 254, QRS 94, QTcF 440, axis +2°); the real block is 1101 (normal), 13441 (complete RBBB) and 6764 (old
 * anterolateral infarction, Q waves).
 */
import { l } from '../../core/l10n';
import type { EcgSource, Item } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});
const real = (id: number): EcgSource => ({ kind: 'real', id });
const GRID = { layout: '3x4+1' } as const;

/** The worked tracing, shown again on both sides of the weak/strong contrast: the difference is the report, not the ECG. */
const WORKED = synth('stemi-anterior', 1802);

/** Write the full report of a real ECG (PTB-XL 4440) — graded field by field against the 12SL values and the labels. */
const realReport: Item = {
  id: 'x1:report-4440',
  family: 'report-real',
  competency: 'C11',
  difficulty: 'classic',
  seed: 0,
  kind: 'report',
  prompt: l(
    '真实病例（63 岁女性，申请单无临床信息）。按固定顺序写完整报告：心率、节律、PR、QRS、QTc、电轴，再列出所有发现。用分规自己量，别猜。',
    'A real case (a 63-year-old woman; the request slip gives no clinical details). Write the full report in the fixed order: rate, rhythm, PR, QRS, QTc, axis, then every finding. Measure with the calipers — do not guess.',
    'Un caso real (mujer de 63 años; la petición no aporta datos clínicos). Redacta el informe completo en el orden fijo: frecuencia, ritmo, PR, QRS, QTc, eje y después todos los hallazgos. Mide con el compás; no adivines.',
  ),
  ecg: real(4440),
  view: { layout: '3x4+1', calipers: true },
  explanation: l(
    '参考报告（12SL 测量 + 心脏科医师标注）：记录清晰，25 mm/s、10 mm/mV。窦性心律约 85 次/分，规则；每个 P 后都跟着 QRS。**PR 约 254 ms（>200 ms）**，固定不变；QRS 约 94 ms；QTc（Fridericia）约 440 ms，女性正常；电轴约 +2°（I 正、aVF 近等电位），正常。P、QRS、T 形态无特殊，无病理性 Q，无 ST 偏移。发现：**一度房室传导阻滞**（minor）。无旧图可比。紧急程度：常规——复核用药（β 受体阻滞剂、非二氢吡啶类钙拮抗剂、地高辛）。如果你把 PR 量成 200 左右：分规要从 P 波起点量到 QRS 起点，在 P 最清楚的导联（II）上量。',
    'Reference report (12SL measurements + the cardiologists\' labels): clean recording, 25 mm/s, 10 mm/mV. Sinus rhythm at about 85/min, regular; every P is followed by a QRS. **PR about 254 ms (> 200 ms)** and constant; QRS about 94 ms; QTc (Fridericia) about 440 ms, normal for a woman; axis about +2° (I positive, aVF near equiphasic), normal. P, QRS and T unremarkable, no pathological Q, no ST deviation. Findings: **first-degree AV block** (minor). No previous ECG to compare. Urgency: routine — review the drug list (beta-blockers, non-dihydropyridine calcium-channel blockers, digoxin). If you measured the PR at about 200: run the calipers from the start of the P to the start of the QRS, in the lead where the P is clearest (II).',
    'Informe de referencia (mediciones 12SL + etiquetas de los cardiólogos): registro limpio, 25 mm/s, 10 mm/mV. Ritmo sinusal a unas 85 lpm, regular; cada P va seguida de un QRS. **PR de unos 254 ms (> 200 ms)** y constante; QRS de unos 94 ms; QTc (Fridericia) de unos 440 ms, normal en una mujer; eje de unos +2° (I positiva, aVF casi isodifásica), normal. P, QRS y T sin particularidades, sin Q patológicas ni desviación del ST. Hallazgos: **bloqueo AV de primer grado** (menor). Sin ECG previo para comparar. Urgencia: rutina; revisar la medicación (betabloqueantes, antagonistas del calcio no dihidropiridínicos, digoxina). Si mediste el PR en torno a 200: lleva el compás desde el inicio de la P hasta el inicio del QRS, en la derivación donde la P se vea mejor (II).',
  ),
  findings: ['av-block-1'],
  key: {
    rateBpm: 85,
    rhythm: 'sinus-rhythm',
    regular: null,
    prMs: 254,
    qrsMs: 94,
    qtcMs: 440,
    axisDeg: 2,
    findings: ['av-block-1'],
    optional: ['axis-normal', 'sinus-arrhythmia'],
  },
};

const lesson: Lesson = {
  id: 'x1',
  stage: 'X',
  order: 1,
  title: l('结构化报告', 'The structured report', 'El informe estructurado'),
  summary: l(
    '一份报告让另一位读者能依赖：固定顺序（记录→心率→节律→间期→电轴→形态→ST→按严重程度列出发现→对比旧图→紧急程度与下一步），先描述后诊断，每一句都能在纸上指出依据。',
    'A report another reader can rely on: a fixed order (recording → rate → rhythm → intervals → axis → morphology → ST → findings by severity → comparison → urgency and next action), description before diagnosis, every sentence pointable on the paper.',
    'Un informe en el que otro lector pueda confiar: un orden fijo (registro → frecuencia → ritmo → intervalos → eje → morfología → ST → hallazgos por gravedad → comparación → urgencia y siguiente paso), la descripción antes del diagnóstico y cada frase localizable en el papel.',
  ),
  objectives: [
    l('按固定顺序写一份完整的心电图报告，每一项都给出数字或明确的“正常”。', 'Write a complete ECG report in the fixed order, with a number or an explicit "normal" on every line.', 'Redactar un informe electrocardiográfico completo en el orden fijo, con una cifra o un «normal» explícito en cada línea.'),
    l('区分“描述”与“诊断”层级的措辞，并说明把握程度。', 'Distinguish descriptive from diagnostic wording, and say how sure you are.', 'Distinguir el lenguaje descriptivo del diagnóstico y decir con qué seguridad se afirma.'),
    l('按严重程度排列发现，并以紧急程度与下一步收尾。', 'Order findings by severity and end with urgency and the next action.', 'Ordenar los hallazgos por gravedad y cerrar con la urgencia y el paso siguiente.'),
    l('对照机器判读与旧图，只签署你亲自核实过的内容。', 'Compare with the machine statement and old tracings, and sign only what you verified.', 'Comparar con la lectura automática y los ECG previos, y firmar solo lo verificado.'),
  ],
  minutes: 20,
  competencies: ['C11'],
  findings: ['normal-ecg', 'stemi-anterior', 'av-block-1'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('stemi-anterior', 1801),
      view: GRID,
      question: l(
        '胸痛患者的十二导联。先别看任何提示：写出你完整的报告——从记录质量到“下一步做什么”。写完后数一数：你写了几行？每一行有数字吗？',
        'A 12-lead of a patient with chest pain. Before any hints: write your complete report — from recording quality to "what happens next". Then count: how many lines did you write, and does each line carry a number?',
        'Un ECG de 12 derivaciones de un paciente con dolor torácico. Sin pistas: redacta tu informe completo, desde la calidad del registro hasta «qué hacer a continuación». Después cuenta: ¿cuántas líneas has escrito y lleva cada una una cifra?',
      ),
      reveal: l(
        '写完了吗？现在对照固定骨架检查你漏了哪一项：记录 → 心率（心室+心房）→ 节律（起源、P–QRS 关系、规则性）→ PR/QRS/QTc → 电轴 → P/QRS/T 形态 → ST 段 → 按严重程度列发现 → 对比旧图 → **紧急程度与下一步**。这份图：窦性约 84 次/分，间期与电轴正常，**V1–V4 ST 抬高（V3 最高约 4 mm），II、III、aVF 镜像压低**——急性前壁 STEMI，现在就要行动。多数初学者写对了“STEMI”，却漏了最后两行——而真正改变患者结局的恰恰是这两行。',
        'Done? Now check what you missed against the fixed skeleton: recording → rate (ventricular + atrial) → rhythm (origin, P–QRS relationship, regularity) → PR/QRS/QTc → axis → P/QRS/T morphology → ST segments → findings by severity → comparison with old tracings → **urgency and next action**. This tracing: sinus at about 84/min, normal intervals and axis, **ST elevation in V1–V4 (highest, about 4 mm, in V3) with reciprocal depression in II, III and aVF** — an acute anterior STEMI that needs action now. Most beginners get "STEMI" right and miss the last two lines — and those two lines are the ones that change what happens to the patient.',
        '¿Terminaste? Comprueba qué te faltó con el esqueleto fijo: registro → frecuencia (ventricular y auricular) → ritmo (origen, relación P-QRS, regularidad) → PR/QRS/QTc → eje → morfología de P/QRS/T → segmento ST → hallazgos por gravedad → comparación con previos → **urgencia y siguiente paso**. Este ECG: sinusal a unas 84 lpm, intervalos y eje normales, **elevación del ST en V1-V4 (máxima, de unos 4 mm, en V3) con descenso recíproco en II, III y aVF**: un IAMCEST anterior agudo que exige actuar ya. La mayoría de los principiantes aciertan «IAMCEST» y olvidan las dos últimas líneas, que son precisamente las que cambian lo que le pasa al paciente.',
      ),
    },
    {
      kind: 'text',
      title: l('报告骨架', 'The report skeleton', 'El esqueleto del informe'),
      body: l(
        '1. **记录**：走纸、增益、伪差、导联位置（f4、o9、o10）。\n2. **心率**：心室率与心房率（不相等时分别报，s2）。\n3. **节律**：起源（窦性？）、P–QRS 关系、规则性（s3、R 阶段）。\n4. **间期**：PR、QRS（全局测量）、QT/QTc（s4）。\n5. **电轴**：分类 + 描述性度数（s5）。\n6. **形态**：P（心房）、QRS（心腔、电压、R 递增、Q 波）、T/U。\n7. **ST 段**：按导联组读抬高/压低，并找镜像改变（i1）。\n8. **发现清单**：按严重程度（危急 → 重要 → 次要 → 正常变异）。\n9. **对比**：与旧图逐项对比；没有旧图就写“无旧图”。\n10. **紧急程度与下一步**：现在处理 / 当天评估 / 常规；谁需要知道。\n前七步是**描述**（纸上有什么），第八步才是**诊断**（这意味着什么），最后两步是**决策**（现在做什么）。',
        '1. **Recording**: speed, gain, artefact, lead placement (f4, o9, o10).\n2. **Rate**: ventricular and atrial (report both when they differ — s2).\n3. **Rhythm**: origin (sinus?), P–QRS relationship, regularity (s3, stage R).\n4. **Intervals**: PR, QRS (measured globally), QT/QTc (s4).\n5. **Axis**: category + descriptive degrees (s5).\n6. **Morphology**: P (atria), QRS (chambers, voltage, R progression, Q waves), T/U.\n7. **ST segments**: elevation/depression by lead group, and look for the reciprocal change (i1).\n8. **Findings list**: ordered critical → major → minor → normal variant.\n9. **Comparison**: item by item with old tracings; with none, write "no previous ECG".\n10. **Urgency and next action**: act now / review today / routine; who needs to know.\nSteps 1–7 are **description** (what is on the paper), step 8 is **diagnosis** (what it means), and the last two are the **decision** (what happens now).',
        '1. **Registro**: velocidad, ganancia, artefacto y posición de derivaciones (f4, o9, o10).\n2. **Frecuencia**: ventricular y auricular (ambas si difieren: s2).\n3. **Ritmo**: origen (¿sinusal?), relación P-QRS y regularidad (s3, etapa R).\n4. **Intervalos**: PR, QRS (medición global) y QT/QTc (s4).\n5. **Eje**: categoría y grados descriptivos (s5).\n6. **Morfología**: P (aurículas), QRS (cavidades, voltaje, progresión de R, ondas Q), T/U.\n7. **Segmento ST**: elevación/descenso por grupos de derivaciones, buscando el cambio recíproco (i1).\n8. **Lista de hallazgos**: de crítico a mayor, menor y variante normal.\n9. **Comparación**: punto por punto con ECG previos; si no los hay, escribe «sin ECG previo».\n10. **Urgencia y siguiente paso**: actuar ya / revisar hoy / rutina; a quién informar.\nLos pasos 1-7 son **descripción** (qué hay en el papel), el paso 8 es **diagnóstico** (qué significa) y los dos últimos son la **decisión** (qué se hace ahora).',
      ),
    },
    {
      kind: 'worked',
      title: l('一份完整的报告，十步走完', 'One complete report, all ten steps', 'Un informe completo, los diez pasos'),
      ecg: WORKED,
      view: GRID,
      steps: [
        {
          title: l('1 · 记录', '1 · Recording', '1 · Registro'),
          body: l(
            '"25 mm/s，10 mm/mV（定标脉冲 10 mm），十二个导联齐全，基线平稳，无伪差。I 导联 P 与 QRS 均直立、aVR 均倒置——没有左右手电极接反的迹象。"先确认纸可信，后面每个数字才可信。',
            '"25 mm/s, 10 mm/mV (calibration pulse 10 mm), all twelve leads present, steady baseline, no artefact. P and QRS upright in I and negative in aVR — no sign of a limb-electrode reversal." Trust the paper first; only then can every number that follows be trusted.',
            '«25 mm/s, 10 mm/mV (pulso de calibración de 10 mm), las doce derivaciones presentes, línea de base estable, sin artefacto. P y QRS positivas en I y negativas en aVR: sin signos de inversión de electrodos de miembros». Primero hay que fiarse del papel; solo así se puede fiar uno de cada cifra posterior.',
          ),
          highlightLeads: ['I', 'aVR'],
        },
        {
          title: l('2 · 心率', '2 · Rate', '2 · Frecuencia'),
          body: l(
            '"RR 约 710 ms（约 3.5 个大格）→ 心室率约 84 次/分；每个 QRS 前一个 P，心房率相同。"写数字，不写“正常心率”。',
            '"RR about 710 ms (about three and a half large squares) → ventricular rate about 84/min; one P before every QRS, so the atrial rate is the same." Write the number, not "normal rate".',
            '«RR de unos 710 ms (unos tres cuadros grandes y medio) → frecuencia ventricular de unas 84 lpm; una P antes de cada QRS, así que la auricular es la misma». Escribe la cifra, no «frecuencia normal».',
          ),
          marks: [{ auto: 'rr' }],
        },
        {
          title: l('3 · 节律', '3 · Rhythm', '3 · Ritmo'),
          body: l(
            '"P 波在 I、II 直立、aVR 倒置，每个 P 后跟一个 QRS，PR 恒定，RR 规则——**窦性心律**。"起源、P–QRS 关系、规则性：三件事各一句。',
            '"P upright in I and II, inverted in aVR, each P followed by a QRS at a constant PR, regular RR — **sinus rhythm**." Origin, P–QRS relationship, regularity: one clause each.',
            '«P positiva en I y II, negativa en aVR, cada P seguida de un QRS con PR constante, RR regular: **ritmo sinusal**». Origen, relación P-QRS y regularidad: una frase para cada uno.',
          ),
          marks: [{ auto: 'p', lead: 'II' }],
          highlightLeads: ['I', 'II', 'aVR'],
        },
        {
          title: l('4 · 间期', '4 · Intervals', '4 · Intervalos'),
          body: l(
            '"PR 160 ms，QRS 约 95 ms，QT 约 365 ms → QTc（Fridericia）约 410 ms。均在正常范围内。"数字来自你自己的分规，不是机器。',
            '"PR 160 ms, QRS about 95 ms, QT about 365 ms → QTc (Fridericia) about 410 ms. All within normal limits." Numbers from your own calipers, not the machine.',
            '«PR 160 ms, QRS de unos 95 ms, QT de unos 365 ms → QTc (Fridericia) de unos 410 ms. Todo dentro de la normalidad». Cifras de tu compás, no de la máquina.',
          ),
          marks: [{ auto: 'pr' }, { auto: 'qrs' }, { auto: 'qt' }],
        },
        {
          title: l('5 · 电轴', '5 · Axis', '5 · Eje'),
          body: l(
            '"I 与 aVF 的 QRS 均以正向为主，II 最正——**电轴正常，约 +40°**。"先象限，后度数。',
            '"QRS mainly positive in both I and aVF, most positive in II — **normal axis, about +40°**." Quadrant first, degrees second.',
            '«QRS predominantemente positivo en I y en aVF, máximo en II: **eje normal, de unos +40°**». Primero el cuadrante, después los grados.',
          ),
          highlightLeads: ['I', 'II', 'aVF'],
        },
        {
          title: l('6 · 形态', '6 · Morphology', '6 · Morfología'),
          body: l(
            '"P 波正常。V1–V2 呈 rS，移行在 V3，R 波递增正常，电压正常，**无病理性 Q 波**。T 波在 ST 抬高的导联直立。"无 Q 波这一句很重要：它提示心肌还没坏死——还有可挽救的心肌。',
            '"Normal P waves. rS in V1–V2, transition at V3, normal R progression, normal voltage, **no pathological Q waves**. T upright in the leads with ST elevation." The "no Q" line matters: no necrosis yet — there is myocardium left to save.',
            '«Ondas P normales. rS en V1-V2, transición en V3, progresión de R normal, voltaje normal, **sin ondas Q patológicas**. T positiva en las derivaciones con elevación del ST». La línea «sin Q» importa: todavía no hay necrosis y queda miocardio que salvar.',
          ),
          marks: [{ auto: 'r', lead: 'V3' }],
          highlightLeads: ['V1', 'V2', 'V3'],
        },
        {
          title: l('7 · ST 段：按导联组', '7 · ST segments, group by group', '7 · Segmento ST, grupo a grupo'),
          body: l(
            '"前壁组：V2 约 3 mm、V3 约 4 mm、V4 约 2 mm 抬高（J 点后 60 ms），V1 约 1 mm——V2–V3 超过任何性别与年龄的阈值。下壁组：II、III、aVF **镜像压低**（III 约 1 mm）。侧壁组：I、aVL、V5 < 1 mm，V6 等电位。"三组都读，镜像改变才会被看到。',
            '"Anterior group: ST elevation of about 3 mm in V2, 4 mm in V3 and 2 mm in V4 (at J + 60 ms), about 1 mm in V1 — V2–V3 are above the threshold for any sex and age. Inferior group: **reciprocal depression** in II, III and aVF (about 1 mm in III). Lateral group: I, aVL and V5 < 1 mm, V6 isoelectric." Read all three groups — that is how the reciprocal change gets seen.',
            '«Grupo anterior: elevación del ST de unos 3 mm en V2, 4 mm en V3 y 2 mm en V4 (a J + 60 ms), y de 1 mm en V1; V2-V3 superan el umbral para cualquier sexo y edad. Grupo inferior: **descenso recíproco** en II, III y aVF (de 1 mm en III). Grupo lateral: I, aVL y V5 < 1 mm, V6 isoeléctrica». Hay que leer los tres grupos: así se ve el cambio recíproco.',
          ),
          marks: [{ auto: 'st60', lead: 'V3' }, { auto: 'st60', lead: 'III' }],
          highlightLeads: ['V1', 'V2', 'V3', 'V4', 'II', 'III', 'aVF'],
        },
        {
          title: l('8 · 按严重程度列发现', '8 · Findings by severity', '8 · Hallazgos por gravedad'),
          body: l(
            '"1. V1–V4 ST 抬高伴下壁镜像压低：**急性前壁 ST 段抬高型心肌梗死**（前降支闭塞可能性大）——危急。2. 窦性心律，间期、电轴正常。"危急的放第一行，哪怕它是你最后才看到的。',
            '"1. ST elevation V1–V4 with reciprocal inferior depression: **acute anterior STEMI** (LAD occlusion likely) — critical. 2. Sinus rhythm, normal intervals and axis." The critical finding goes on line one, even if it was the last thing you saw.',
            '«1. Elevación del ST en V1-V4 con descenso recíproco inferior: **IAMCEST anterior agudo** (probable oclusión de la DA), crítico. 2. Ritmo sinusal, intervalos y eje normales». Lo crítico va en la primera línea, aunque sea lo último que viste.',
          ),
        },
        {
          title: l('9 · 对比', '9 · Comparison', '9 · Comparación'),
          body: l(
            '"无旧图可比。"——没有就写没有。如果有旧图：逐项对比，尤其是 ST 和 Q 波；但“与旧图相同”永远不能压下一条明显的进行中闭塞。',
            '"No previous ECG available." — if there is none, say so. With one: compare item by item, the ST segments and Q waves above all; but "unchanged from before" must never hold back an obvious ongoing occlusion.',
            '«Sin ECG previo disponible»: si no lo hay, se dice. Si lo hay: compara punto por punto, sobre todo el ST y las ondas Q; pero «sin cambios respecto al previo» nunca debe frenar una oclusión en curso evidente.',
          ),
        },
        {
          title: l('10 · 紧急程度与下一步', '10 · Urgency and next action', '10 · Urgencia y siguiente paso'),
          body: l(
            '"**现在处理**：启动再灌注流程（导管室），立即通知上级医师；若有延误，15–30 分钟复查心电图。"——一句话，一个箱子，一个动作，一个收信人。',
            '"**Act now**: activate the reperfusion pathway (cath lab) and tell the senior at once; if there is any delay, repeat the ECG in 15–30 min." — one sentence, one bin, one action, one person to tell.',
            '«**Actuar ya**: activar el circuito de reperfusión (laboratorio de hemodinámica) y avisar al responsable de inmediato; si hay retraso, repetir el ECG en 15-30 min»: una frase, una categoría, una acción, una persona a quien avisar.',
          ),
          highlightLeads: ['V2', 'V3', 'V4'],
        },
      ],
    },
    {
      kind: 'text',
      title: l('先描述，后诊断，再说把握', 'Describe, then diagnose, then say how sure', 'Describir, diagnosticar y decir con qué seguridad'),
      body: l(
        '- **描述层**写纸上有什么：“V2–V4 ST 抬高 3–4 mm，III、aVF 压低 1 mm”。另一位读者可以拿分规核对它。\n- **诊断层**写这意味着什么：“急性前壁 STEMI”。它建立在描述层之上，所以描述必须先出现。\n- **把握程度**用固定的词：“符合”“可能”“考虑”——而不是“?”或“临床相关”。x4 会把这些词变成可以校准的信心数字。\n- 机器判读只是一个假设：自动判读必须由有资质的读者复核，其错误集中在节律与电极接反（o12）。**只签署你亲自核实过的那一行。**',
        '- The **descriptive layer** says what is on the paper: "ST elevation of 3–4 mm in V2–V4, 1 mm depression in III and aVF". Another reader can check it with calipers.\n- The **diagnostic layer** says what it means: "acute anterior STEMI". It stands on the description, so the description comes first.\n- **How sure** uses fixed words — "consistent with", "probable", "possible" — never "?" or "clinical correlation advised". x4 turns these words into confidence numbers you can calibrate.\n- The machine statement is a hypothesis: the automated read must be confirmed by a qualified reader, and its errors cluster in rhythm and electrode reversals (o12). **Sign only the lines you verified yourself.**',
        '- La **capa descriptiva** dice qué hay en el papel: «elevación del ST de 3-4 mm en V2-V4, descenso de 1 mm en III y aVF». Otro lector puede comprobarlo con el compás.\n- La **capa diagnóstica** dice qué significa: «IAMCEST anterior agudo». Se apoya en la descripción, así que la descripción va primero.\n- **La seguridad** se expresa con palabras fijas —«compatible con», «probable», «posible»—, nunca con «?» ni con «correlacionar con la clínica». En x4 esas palabras se convierten en cifras de confianza que se pueden calibrar.\n- La lectura automática es una hipótesis: debe confirmarla un lector cualificado, y sus errores se concentran en el ritmo y en las inversiones de electrodos (o12). **Firma solo las líneas que hayas comprobado tú.**',
      ),
    },
    {
      kind: 'contrast',
      title: l('同一份图，两份报告', 'Same tracing, two reports', 'El mismo ECG, dos informes'),
      view: GRID,
      left: {
        ecg: WORKED,
        caption: l(
          '弱报告：“窦速？ST 改变，?缺血，请结合临床。”',
          'Weak report: "Sinus tach? ST changes, ?ischaemia, clinical correlation advised."',
          'Informe débil: «¿Taquicardia sinusal? Alteraciones del ST, ¿isquemia?, correlacionar con la clínica».',
        ),
      },
      right: {
        ecg: WORKED,
        caption: l(
          '强报告：“窦性 84 次/分，间期与电轴正常；V1–V4 ST 抬高（V3 约 4 mm），II/III/aVF 镜像压低——急性前壁 STEMI。无旧图。现在处理：导管室。”',
          'Strong report: "Sinus 84/min, normal intervals and axis; ST elevation V1–V4 (about 4 mm in V3), reciprocal depression II/III/aVF — acute anterior STEMI. No previous ECG. Act now: cath lab."',
          'Informe sólido: «Sinusal a 84 lpm, intervalos y eje normales; elevación del ST en V1-V4 (unos 4 mm en V3), descenso recíproco en II/III/aVF: IAMCEST anterior agudo. Sin ECG previo. Actuar ya: hemodinámica».',
        ),
        marks: [{ auto: 'st60', lead: 'V3' }, { auto: 'st60', lead: 'III' }],
      },
      point: l(
        '心电图一模一样，差别全在报告里。弱报告：**心率错了**（84 不是心动过速），“ST 改变”没有导联、没有毫米、没有方向，漏掉了镜像压低，“?”和“请结合临床”把决定推给了下一个人，**没有紧急程度**——读到它的人不会启动导管室。强报告：每一句都能用分规核对，危急发现在最前，最后一句是行动。',
        'The tracings are identical; the whole difference is in the report. The weak one: **the rate is wrong** (84 is not a tachycardia); "ST changes" has no leads, no millimetres and no direction; the reciprocal depression is missing; "?" and "clinical correlation" push the decision onto the next person; and **there is no urgency** — whoever reads it will not call the cath lab. The strong one: every sentence can be checked with calipers, the critical finding comes first, and the last sentence is an action.',
        'Los ECG son idénticos; toda la diferencia está en el informe. El débil: **la frecuencia está mal** (84 no es taquicardia); «alteraciones del ST» no dice derivaciones, ni milímetros, ni dirección; falta el descenso recíproco; «?» y «correlacionar con la clínica» pasan la decisión al siguiente; y **no hay urgencia**: quien lo lea no activará hemodinámica. El sólido: cada frase se puede comprobar con el compás, el hallazgo crítico va primero y la última frase es una acción.',
      ),
    },
    {
      kind: 'contrast',
      title: l('正常报告也是完整报告', 'A normal report is still a complete report', 'Un informe normal también es completo'),
      view: GRID,
      left: {
        ecg: synth('normal', 1803),
        caption: l(
          '正常：“窦性 72 次/分，PR 160、QRS 95、QTc 410 ms，电轴 +40°，形态与 ST 正常。正常心电图。常规。”',
          'Normal: "Sinus 72/min, PR 160, QRS 95, QTc 410 ms, axis +40°, morphology and ST normal. Normal ECG. Routine."',
          'Normal: «Sinusal a 72 lpm, PR 160, QRS 95, QTc 410 ms, eje +40°, morfología y ST normales. ECG normal. Rutina».',
        ),
      },
      right: {
        ecg: synth('av-block-1', 1804, { pr: 280 }),
        caption: l(
          '正常 + 一度房室传导阻滞：同样的十行，只是 PR 一行变成“280 ms，延长”，发现清单多一项。',
          'Normal + first-degree AV block: the same ten lines; only the PR line now reads "280 ms, prolonged", and the findings list gains one item.',
          'Normal + bloqueo AV de primer grado: las mismas diez líneas; solo la del PR pasa a decir «280 ms, prolongado» y la lista de hallazgos gana un elemento.',
        ),
        marks: [{ auto: 'pr' }],
      },
      point: l(
        '“正常”不是一句话，是走完十步后的结论。右侧只多一个发现（PR 280 ms）——报告的其他九项照写。加一个发现，不减其余项目；而“正常心电图”这四个字，只有在十项都写出数字之后才有资格出现。',
        '"Normal" is not one sentence; it is the conclusion after all ten steps. The right side adds a single finding (PR 280 ms) — the other nine lines stay. Adding a finding removes nothing, and the words "normal ECG" earn their place only after all ten lines carry their numbers.',
        '«Normal» no es una frase: es la conclusión tras los diez pasos. El lado derecho solo añade un hallazgo (PR de 280 ms) y las otras nueve líneas siguen. Añadir un hallazgo no quita nada, y las palabras «ECG normal» solo se ganan su sitio cuando las diez líneas llevan sus cifras.',
      ),
    },
    {
      kind: 'criteria',
      title: l('报告质量清单', 'The report quality checklist', 'La lista de calidad del informe'),
      items: [
        { label: l('顺序', 'Order', 'Orden'), value: l('固定十步，从记录到行动', 'The fixed ten steps, recording to action', 'Los diez pasos fijos, del registro a la acción') },
        { label: l('数字', 'Numbers', 'Cifras'), value: l('心率、PR、QRS、QTc、电轴都写数字（自己测量）', 'Rate, PR, QRS, QTc and axis as numbers (your own measurements)', 'Frecuencia, PR, QRS, QTc y eje con cifras (medidas propias)') },
        { label: l('可核性', 'Verifiability', 'Verificabilidad'), value: l('每个陈述都能在纸上指出导联与位置', 'Every statement can be pointed at on the paper: lead and place', 'Cada afirmación puede señalarse en el papel: derivación y lugar') },
        { label: l('描述 vs 诊断', 'Descriptive vs diagnostic', 'Descriptivo frente a diagnóstico'), value: l('"V2–V4 ST 抬高 3–4 mm"（描述）→ "前壁 STEMI"（诊断）分层出现', '"ST elevation 3–4 mm in V2–V4" (description) → "anterior STEMI" (diagnosis), in layers', '"Elevación del ST de 3-4 mm en V2-V4" (descripción) → "IAMCEST anterior" (diagnóstico), por capas') },
        { label: l('严重程度', 'Severity', 'Gravedad'), value: l('危急 → 重要 → 次要 → 正常变异，按序排列', 'Critical → major → minor → normal variant, in order', 'Crítico → mayor → menor → variante normal, en orden') },
        { label: l('结尾', 'Ending', 'Cierre'), value: l('对比旧图（或“无旧图”）+ 紧急程度（现在/当天/常规）+ 下一步', 'Comparison (or "no previous ECG") + urgency (now / today / routine) + next action', 'Comparación (o «sin ECG previo») + urgencia (ya / hoy / rutina) + siguiente paso') },
      ],
      source: 'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332; Schläpfer J, Wellens HJ. Computer-interpreted electrocardiograms. J Am Coll Cardiol 2017;70:1183-1192',
    },
    { kind: 'check', item: { inline: realReport } },
    { kind: 'check', item: { family: 'report', seed: 2 } },
    { kind: 'check', item: { family: 'findings', seed: 5 } },
    { kind: 'drill', families: ['report', 'report-real'], count: 5, passScore: 0.8 },
    {
      kind: 'real',
      ids: [1101, 13441, 6764],
      caption: l(
        '三份真实心电图（53 岁女性、81 岁女性、64 岁男性）：一份正常、一份束支传导阻滞、一份带着陈旧 Q 波。每份都在纸上写满十行——包括“无旧图”和紧急程度——再揭晓心脏科医师标注与 12SL 测量值。',
        'Three real ECGs (a 53-year-old woman, an 81-year-old woman, a 64-year-old man): one normal, one bundle branch block, one with old Q waves. Write all ten lines on paper for each — including "no previous ECG" and the urgency — then reveal the cardiologists\' labels and the 12SL measurements.',
        'Tres ECG reales (mujer de 53 años, mujer de 81 y varón de 64): uno normal, uno con bloqueo de rama y uno con ondas Q antiguas. Escribe en papel las diez líneas de cada uno —incluidas «sin ECG previo» y la urgencia— y después mira las etiquetas de los cardiólogos y las mediciones 12SL.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l('“未见明显异常”当作一份报告：没有数字的“正常”无法被核对。', 'Passing "unremarkable" off as a report: a "normal" with no numbers cannot be checked.', 'Presentar «sin hallazgos significativos» como informe: un «normal» sin cifras no se puede comprobar.'),
        l('发现不按严重程度排序（ST 抬高排在 T 波平坦后面）。', 'Findings not ordered by severity (ST elevation listed after flat T waves).', 'Hallazgos sin ordenar por gravedad (elevación del ST tras una T plana).'),
        l('“ST 改变”不写导联、毫米与方向，也不找镜像改变。', '"ST changes" with no leads, no millimetres, no direction — and no search for the reciprocal change.', '«Alteraciones del ST» sin derivaciones, sin milímetros, sin dirección y sin buscar el cambio recíproco.'),
        l('用“?”和“请结合临床”代替紧急程度与下一步。', '"?" and "clinical correlation advised" in place of an urgency line and a next action.', '«?» y «correlacionar con la clínica» en lugar de una línea de urgencia y un siguiente paso.'),
        l('机器的数字直接照抄，没有自己测量；不写“无旧图”就当已经对比过。', 'Copying the machine\'s numbers without measuring; leaving out "no previous ECG" as if a comparison had been made.', 'Copiar las cifras de la máquina sin medir; omitir «sin ECG previo» como si se hubiera comparado.'),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('报告 = 固定十步，从记录检查到紧急程度与下一步；每一行都有数字或明确的“正常”。', 'A report = the fixed ten steps, from the recording check to urgency and next action; every line carries a number or an explicit "normal".', 'El informe = los diez pasos fijos, de la comprobación del registro a la urgencia y el siguiente paso; cada línea lleva una cifra o un «normal» explícito.'),
        l('先描述后诊断，用固定措辞说把握；每一句都能在纸上指出。', 'Describe first, diagnose second, and say how sure in fixed words; every sentence pointable on the paper.', 'Primero describir, después diagnosticar y decir la seguridad con palabras fijas; cada frase localizable en el papel.'),
        l('ST 按导联组读，找镜像改变；危急发现放第一行，结尾是行动与收信人。', 'Read ST group by group and look for the reciprocal change; the critical finding goes first, and the ending is an action and who to tell.', 'Lee el ST por grupos y busca el cambio recíproco; lo crítico va primero y el cierre es una acción y a quién avisar.'),
        l('“正常”是走完十步的结论，不是省略十步的理由。', '"Normal" is the conclusion after ten steps, not a reason to skip them.', '«Normal» es la conclusión tras los diez pasos, no un motivo para saltárselos.'),
      ],
    },
  ],
  sources: [
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Schläpfer J, Wellens HJ. Computer-interpreted electrocardiograms. J Am Coll Cardiol 2017;70:1183-1192',
    'Kligfield P et al. AHA/ACCF/HRS Part I: The electrocardiogram and its technology. Circulation 2007;115:1306-1324',
    'Thygesen K et al. Fourth universal definition of myocardial infarction (2018). Eur Heart J 2019;40:237-269',
    'Castellano et al. 2004',
  ],
};

export default lesson;
