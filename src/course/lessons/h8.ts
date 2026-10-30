/**
 * h8 — Brugada and early repolarization syndrome (docs/PLAN.md §3, stage H).
 * Criteria: docs/curriculum/criteria.md "Brugada pattern / syndrome" and "Brugada pattern — Type 2 and recording
 * technique" bullets, the `early-repolarization` row, the "Normal (male-pattern) ST elevation" and "Early
 * repolarisation syndrome" bullets, and the "rSr' in V1 / incomplete RBBB vs Brugada pattern" bullet under
 * bundle-branch-fascicular-blocks (current values throughout). No real block: PTB-XL has no curated Brugada cases.
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
const STRIP_V2 = { layout: 'strip', lead: 'V2' } as const;

const lesson: Lesson = {
  id: 'h8',
  stage: 'H',
  order: 8,
  title: l('Brugada综合征与早期复极综合征', 'Brugada and early repolarization syndrome', 'Síndrome de Brugada y síndrome de repolarización precoz'),
  summary: l(
    'V1–V2 穹隆型 ST 段抬高 ≥2 mm 伴 T 波倒置是唯一具有诊断意义的 Brugada 图形：自发出现（无其他心脏病）即可诊断 Brugada 综合征；药物或发热诱发者还需晕厥、室颤或家族史——转诊评估 ICD，积极退热，避开钠通道阻滞剂。下壁/侧壁导联的 J 波（早期复极图形）在无症状者中是良性表现；只有从原因不明的室颤中复苏过来，才叫早期复极综合征。',
    'Coved ST elevation ≥2 mm with a negative T in V1–V2 is the only diagnostic Brugada pattern: spontaneous (with no other heart disease) it diagnoses Brugada syndrome; drug- or fever-induced it also needs syncope, VF or a family history — refer for ICD evaluation, treat fever, avoid sodium-channel blockers. J waves in the inferior/lateral leads (early repolarisation pattern) are benign in asymptomatic people; only a survivor of unexplained VF has early repolarisation syndrome.',
    'La elevación del ST en cúpula ≥2 mm con T negativa en V1-V2 es el único patrón de Brugada diagnóstico: espontáneo (sin otra cardiopatía) diagnostica el síndrome de Brugada; inducido por fármacos o fiebre precisa además síncope, FV o antecedentes familiares: derivar para evaluar un DAI, tratar la fiebre y evitar los bloqueantes de los canales del sodio. Las ondas J en las derivaciones inferiores/laterales (patrón de repolarización precoz) son benignas en personas asintomáticas; solo el superviviente de una FV no explicada tiene un síndrome de repolarización precoz.',
  ),
  objectives: [
    l(
      '写出 1 型（穹隆型）Brugada 图形的诊断条件，并说明为什么 2 型（马鞍型）本身不能诊断。',
      'State the diagnostic criterion of the type 1 (coved) Brugada pattern, and why the type 2 (saddleback) pattern alone is not diagnostic.',
      'Exponer el criterio diagnóstico del patrón de Brugada tipo 1 (en cúpula) y por qué el tipo 2 (en silla de montar) por sí solo no diagnostica.',
    ),
    l(
      '用 β 角 >58°、r′ 三角形底边和 V6/I 导联有无宽 S，把 2 型马鞍形与不完全性右束支阻滞的 rSr′ 区分开。',
      'Separate the type 2 saddleback from the rSr′ of incomplete RBBB using the β angle >58°, the r′ triangle base and the presence or absence of a wide S in V6/I.',
      'Distinguir la silla de montar del tipo 2 del rSr′ del bloqueo incompleto de rama derecha con el ángulo β >58°, la base del triángulo de la r′ y la presencia o ausencia de S ancha en V6/I.',
    ),
    l(
      '区分“图形”与“综合征”：药物或发热诱发的 1 型图形需要心律失常性晕厥、记录到的室颤/多形性室速或家族史才能诊断，并说出随后的行动。',
      'Tell the pattern from the syndrome: a drug- or fever-induced type 1 pattern needs arrhythmic syncope, documented VF/polymorphic VT or a family history, and name the actions that follow.',
      'Distinguir el patrón del síndrome: un patrón tipo 1 inducido por fármacos o fiebre precisa síncope arrítmico, FV/TV polimórfica documentada o antecedentes familiares, y hay que nombrar las medidas que siguen.',
    ),
    l(
      '定义早期复极图形（Jp ≥1 mm，≥2 个相邻下壁/侧壁导联，V1–V3 除外）与早期复极综合征，并列出较高危特征。',
      'Define the early repolarisation pattern (Jp ≥1 mm in ≥2 contiguous inferior/lateral leads, V1–V3 excluded) and early repolarisation syndrome, and list the higher-risk features.',
      'Definir el patrón de repolarización precoz (Jp ≥1 mm en ≥2 derivaciones contiguas inferiores/laterales, V1-V3 excluidas) y el síndrome de repolarización precoz, y enumerar los rasgos de mayor riesgo.',
    ),
  ],
  minutes: 15,
  competencies: ['C10'],
  findings: ['brugada-type1', 'brugada-type2', 'early-repolarization'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('brugada-type1', 1341, { rate: 84 }),
      view: GRID,
      question: l(
        '38 岁男性，发热性疾病期间晕厥一次。V1–V2 的 ST 段呈穹隆样抬高，随后落进一个倒置的 T 波。这个图形叫什么？拿到它你**必须**做什么？先写下答案再揭晓。',
        'A 38-year-old man fainted once during a febrile illness. In V1–V2 the ST segment rises in a coved shape and falls into a negative T wave. What is this pattern called, and what **must** you do with it? Commit before the reveal.',
        'Un varón de 38 años sufrió un síncope durante un proceso febril. En V1-V2 el segmento ST se eleva con morfología en cúpula y cae a una onda T negativa. ¿Cómo se llama este patrón y qué **debes** hacer con él? Escribe tu respuesta antes de ver la solución.',
      ),
      reveal: l(
        '穹隆型（下斜型）ST 段抬高 ≥2 mm + T 波倒置，出现在 ≥1 个右胸导联——这是 **1 型 Brugada 图形**，唯一具有诊断意义的一型。自发的 1 型图形本身就足以诊断；发热诱发的还需要加上临床——这位患者有晕厥，两条路都通向 **Brugada 综合征**：这份 12 导联不是诊断的终点，而是起点——**转诊**（评估植入 ICD），积极退热，并从此让这位患者远离钠通道阻滞剂。',
        'Coved (downward-sloping) ST elevation ≥2 mm followed by a negative T in ≥1 right precordial lead — this is the **type 1 Brugada pattern**, the only diagnostic one. A spontaneous type 1 diagnoses on its own; one brought out by fever needs a clinical feature as well — and this patient has had syncope, so either way it is **Brugada syndrome**: this 12-lead is not the end of the diagnosis but its beginning — **refer** (ICD evaluation), treat the fever aggressively, and keep this patient away from sodium-channel blockers from now on.',
        'Elevación del ST en cúpula (con pendiente descendente) ≥2 mm seguida de T negativa en ≥1 derivación precordial derecha: este es el **patrón de Brugada tipo 1**, el único diagnóstico. Un tipo 1 espontáneo basta por sí solo; uno desenmascarado por la fiebre necesita además un dato clínico, y este paciente ha tenido un síncope, así que en ambos casos es un **síndrome de Brugada**: estas 12 derivaciones no son el final del diagnóstico sino su comienzo: **deriva** (evaluación de DAI), trata la fiebre con decisión y mantén desde ahora a este paciente lejos de los bloqueantes de los canales del sodio.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('brugada-type1', 1342, { rate: 70 }),
      emphasize: ['rv-outflow'],
      showConduction: true,
      caption: l(
        'Brugada 图形写在右心室流出道的**心外膜**上：钠电流减损让该处心外膜动作电位的穹顶丢失，局部复极提前且不均一——V1–V2 于是记到穹隆型 ST 抬高和 T 波倒置。播放一个心动周期并注意：传导系统本身完好，这不是真正的右束支阻滞，而是“假性右束支阻滞”。',
        'The Brugada pattern is written on the **epicardium** of the right ventricular outflow tract: a reduced sodium current lets the action-potential dome drop out there, so repolarisation is early and uneven — and V1–V2 record a coved ST elevation with a negative T. Play one beat and notice: the conduction system itself is intact; this is not a true right bundle-branch block but a "pseudo-RBBB".',
        'El patrón de Brugada se escribe en el **epicardio** del tracto de salida del ventrículo derecho: una corriente de sodio reducida hace que se pierda la cúpula del potencial de acción en esa zona, la repolarización se adelanta y se hace heterogénea, y V1-V2 registran una elevación del ST en cúpula con T negativa. Reproduce un latido y observa: el sistema de conducción está intacto; no es un bloqueo de rama derecha real, sino un «pseudo-BRD».',
      ),
    },
    {
      kind: 'text',
      title: l('两种图形，只有一种能诊断', 'Two patterns, only one diagnoses', 'Dos patrones, solo uno diagnostica'),
      body: l(
        'Brugada 图形分两型，诊断价值完全不对称：\n- **1 型（穹隆型——唯一可诊断）**：≥1 个右胸导联（V1/V2，第 2–4 肋间记录）ST 段呈穹隆型抬高 **≥2 mm**，继以 **T 波倒置**；可为自发，也可由钠通道阻滞剂诱发。\n- **2 型（马鞍型——本身不诊断）**：J 点抬高（通常 ≥2 mm）伴高起点的 r′，ST 段上凹形回落但悬在基线之上，T 波直立或平坦——它的作用是提醒你去别处找 1 型。\n把 2 型变成答案的途径：发热、钠通道阻滞剂（院内监护下）或**高位肋间导联**（把 V1–V2 记在第 2–3 肋间）常能揭出 1 型。\n**图形与综合征**：无其他心脏病者出现**自发**的 1 型图形即可诊断 Brugada 综合征（2022 ESC）；药物或发热诱发的 1 型图形本身还不够，要再加上心律失常性晕厥、记录到的室颤/多形性室速，或家族史（Brugada 综合征，或 <45 岁原因不明的猝死）。\n识别模仿者：发热、高钾血症、钠通道阻滞剂中毒（见 o4），还有胸廓畸形和右心室缺血——先纠正，再下结论。',
        'There are two Brugada patterns, and their diagnostic weight is utterly asymmetric:\n- **Type 1 (coved — the only diagnostic one)**: coved ST elevation **≥2 mm** followed by a **negative T** in ≥1 right precordial lead (V1/V2, recorded in the 2nd–4th intercostal space); spontaneous or induced by a sodium-channel blocker.\n- **Type 2 (saddleback — not diagnostic alone)**: J-point elevation (usually ≥2 mm) with a high take-off r′, an ST segment that falls concavely but stays above the baseline, and an upright or flat T — its job is to send you hunting for a type 1.\nThe ways a type 2 becomes an answer: fever, a sodium-channel blocker (in hospital, monitored) or **high intercostal leads** (V1–V2 recorded in the 2nd–3rd ICS) often unmask a type 1.\n**Pattern vs syndrome**: a **spontaneous** type 1 pattern in someone without other heart disease is enough to diagnose Brugada syndrome (2022 ESC); a drug- or fever-induced type 1 pattern is not enough on its own; add arrhythmic syncope, documented VF/polymorphic VT, or a family history (Brugada syndrome, or unexplained sudden death under 45).\nKnow the phenocopies: fever, hyperkalaemia, sodium-channel-blocker toxicity (see o4), also pectus deformity and right ventricular ischaemia — correct first, conclude after.',
        'Hay dos patrones de Brugada y su peso diagnóstico es del todo asimétrico:\n- **Tipo 1 (en cúpula: el único diagnóstico)**: elevación del ST en cúpula **≥2 mm** seguida de **T negativa** en ≥1 derivación precordial derecha (V1/V2, registradas en el 2.º-4.º espacio intercostal); espontánea o inducida por un bloqueante de los canales del sodio.\n- **Tipo 2 (en silla de montar: no diagnóstica por sí sola)**: elevación del punto J (habitualmente ≥2 mm) con una r′ de inicio alto, un ST que desciende de forma cóncava pero se mantiene sobre la línea de base y una T positiva o plana; su función es enviarte a buscar un tipo 1.\nLas vías por las que un tipo 2 se convierte en respuesta: la fiebre, un bloqueante del canal del sodio (en el hospital, con monitorización) o las **derivaciones intercostales altas** (V1-V2 en el 2.º-3.º espacio) a menudo desenmascaran un tipo 1.\n**Patrón frente a síndrome**: un patrón tipo 1 **espontáneo** en alguien sin otra cardiopatía basta para diagnosticar el síndrome de Brugada (ESC 2022); un patrón tipo 1 inducido por fármacos o fiebre no basta por sí solo; hay que añadir síncope arrítmico, FV/TV polimórfica documentada o antecedentes familiares (síndrome de Brugada, o muerte súbita no explicada antes de los 45 años).\nReconoce las fenocopias: fiebre, hiperpotasemia, intoxicación por bloqueantes del canal del sodio (ver o4), también pectus excavatum e isquemia del ventrículo derecho: corrige primero y concluye después.',
      ),
    },
    {
      kind: 'criteria',
      title: l('Brugada 图形判读卡', 'Brugada pattern reading card', 'Tarjeta de lectura del patrón de Brugada'),
      items: [
        {
          label: l('1 型（穹隆型）', 'Type 1 (coved)', 'Tipo 1 (en cúpula)'),
          value: l(
            '≥1 个右胸导联穹隆型 ST 抬高 ≥2 mm + T 波倒置（第 2–4 肋间记录）——唯一可诊断的图形',
            'Coved ST elevation ≥2 mm + negative T in ≥1 right precordial lead (2nd–4th ICS) — the only diagnostic pattern',
            'Elevación del ST en cúpula ≥2 mm + T negativa en ≥1 derivación precordial derecha (2.º-4.º EIC): el único patrón diagnóstico',
          ),
        },
        {
          label: l('2 型（马鞍型）', 'Type 2 (saddleback)', 'Tipo 2 (en silla de montar)'),
          value: l(
            'ST 抬高 ≥0.5 mm（J 点通常 ≥2 mm），上凹形 ST，T 直立或平坦——本身不能诊断',
            'ST elevation ≥0.5 mm (usually ≥2 mm at the J point), concave-up ST, upright or flat T — not diagnostic alone',
            'Elevación del ST ≥0,5 mm (habitualmente ≥2 mm en el punto J), ST cóncavo hacia arriba, T positiva o plana: no diagnostica por sí sola',
          ),
        },
        {
          label: l('β 角', 'β angle', 'Ángulo β'),
          value: l('>58° 支持马鞍型为 Brugada（而非 iRBBB）', '>58° favours a Brugada saddleback over iRBBB', '>58° apoya una silla de montar de Brugada frente a una BIRD'),
        },
        {
          label: l('r′ 三角形底边', "r′ triangle base", 'Base del triángulo de la r′'),
          value: l(
            '在 r′ 顶点下方 5 mm 处测量：≥3.5 mm 支持马鞍型；右束支阻滞的 r′ 窄而尖',
            'Measured 5 mm below the r′ apex: ≥3.5 mm favours saddleback; the r′ of RBBB is narrow and sharp',
            'Medida 5 mm por debajo del vértice de la r′: ≥3,5 mm apoya la silla de montar; la r′ del BRD es estrecha y puntiaguda',
          ),
        },
        {
          label: l('V6/I 终末 S 波', 'Terminal S in V6/I', 'S terminal en V6/I'),
          value: l(
            'Brugada 的 V6/I 没有宽大的终末 S（假性右束支阻滞）；右束支阻滞（含不完全性）一定留下它',
            'In Brugada, V6/I lack a broad terminal S (pseudo-RBBB); RBBB, complete or incomplete, always leaves one',
            'En el Brugada, V6/I no tienen S terminal ancha (pseudo-BRD); el BRD, completo o incompleto, siempre la deja',
          ),
        },
        {
          label: l('图形 → 综合征', 'Pattern → syndrome', 'Patrón → síndrome'),
          value: l(
            '自发 1 型（无其他心脏病）= 综合征；药物/发热诱发的 1 型 + 心律失常性晕厥、记录到的室颤/多形性室速，或家族史（Brugada 综合征或 <45 岁不明原因猝死）',
            'Spontaneous type 1 (no other heart disease) = syndrome; drug/fever-induced type 1 + arrhythmic syncope, documented VF/polymorphic VT, or a family history (Brugada syndrome or unexplained SCD <45 y)',
            'Tipo 1 espontáneo (sin otra cardiopatía) = síndrome; tipo 1 inducido por fármacos/fiebre + síncope arrítmico, FV/TV polimórfica documentada o antecedentes familiares (síndrome de Brugada o muerte súbita no explicada <45 años)',
          ),
        },
        {
          label: l('模仿者', 'Phenocopies', 'Fenocopias'),
          value: l(
            '发热、高钾血症、钠通道阻滞剂中毒；胸廓畸形、右心室缺血——先处理，再复查',
            'Fever, hyperkalaemia, sodium-channel-blocker toxicity; pectus, RV ischaemia — treat, then repeat',
            'Fiebre, hiperpotasemia, intoxicación por bloqueantes del canal del sodio; pectus, isquemia del VD: tratar y repetir',
          ),
        },
      ],
      source:
        'Bayés de Luna A et al. J Electrocardiol 2012;45:433-442; Antzelevitch C et al. J-wave syndromes expert consensus. Heart Rhythm 2016;13:e295-e310; Zeppenfeld K et al. 2022 ESC Guidelines for ventricular arrhythmias and the prevention of sudden cardiac death. Eur Heart J 2022;43:3997-4126',
    },
    {
      kind: 'worked',
      title: l('1 型、2 型还是 rSr′？四条判读线', 'Type 1, type 2 or rSr′? Four reading lines', '¿Tipo 1, tipo 2 o rSr′? Cuatro líneas de lectura'),
      ecg: synth('brugada-type1', 1343, { rate: 68 }),
      view: GRID,
      steps: [
        {
          title: l('图形住在哪个导联', 'Where the pattern lives', 'Dónde vive el patrón'),
          body: l(
            '右胸导联 V1–V2 面对右心室流出道——Brugada 的签名只写在这里。放大看：ST 从 J 点起一路下斜，尾端接一个倒置的 T。',
            'The right precordial leads V1–V2 face the right ventricular outflow tract — that is where, and only where, the Brugada signature is written. Zoom in: the ST slopes down continuously from the J point and ends in a negative T.',
            'Las derivaciones derechas V1-V2 miran al tracto de salida del ventrículo derecho: ahí y solo ahí se escribe la firma del Brugada. Amplía: el ST desciende sin interrupción desde el punto J y termina en una T negativa.',
          ),
          marks: [{ auto: 'st', lead: 'V1' }, { auto: 't', lead: 'V1' }],
          highlightLeads: ['V1', 'V2'],
          view: { layout: 'strip', lead: 'V1' },
        },
        {
          title: l('穹隆还是马鞍？', 'Coved or saddleback?', '¿Cúpula o silla de montar?'),
          body: l(
            '量 J 点抬高：≥2 mm，ST 连续下斜、T 波倒置——**穹隆型 = 1 型**，唯一可诊断的图形。若换成高起点的 r′、凹形悬在基线之上的 ST 再回到直立的 T，那是**马鞍型 = 2 型**：本身不能诊断，要去高位肋间导联或监护下的药物激发里找 1 型。',
            'Measure the J-point elevation: ≥2 mm, with an ST that slopes down all the way into a negative T — **coved = type 1**, the only diagnostic pattern. Swap in a high take-off r′, an ST that hangs concave above the baseline and returns to an upright T, and you have a **saddleback = type 2**: not diagnostic by itself; the type 1 has to be hunted in high intercostal leads or a monitored drug challenge.',
            'Mide la elevación del punto J: ≥2 mm, con un ST que desciende sin interrupción hasta una T negativa: **en cúpula = tipo 1**, el único patrón diagnóstico. Si en su lugar hay una r′ de inicio alto, un ST cóncavo suspendido sobre la línea de base y una T positiva, tienes una **silla de montar = tipo 2**: no diagnóstica por sí sola; el tipo 1 hay que buscarlo en derivaciones intercostales altas o con prueba farmacológica monitorizada.',
          ),
          marks: [{ auto: 'j', lead: 'V2' }],
          view: { layout: 'strip', lead: 'V2', calipers: true },
        },
        {
          title: l('右束支真的被阻断了吗？', 'Is the right branch really blocked?', '¿Está realmente bloqueada la rama derecha?'),
          body: l(
            'Brugada 看上去像“右束支阻滞”，但传导系统完好。两条证据：V6 和 I 的 QRS 终末**没有**宽钝的 S 波——右束支阻滞（哪怕不完全性）一定会留下它；QRS 也不宽。遇到 V1 只有 rSr′ 的图，让形态学裁决：马鞍型的 r′ 宽而圆钝、β 角 >58°、r′ 三角形底边 ≥3.5 mm；iRBBB 的 r′ 窄而尖。',
            'Brugada looks like "RBBB", but the conduction system is intact. Two pieces of evidence: the QRS in V6 and I ends **without** a broad slurred S — RBBB, even the incomplete one, always leaves one; and the QRS is not wide. When V1 shows only an rSr′, let morphology judge: the saddleback r′ is broad and rounded, β angle >58°, r′ triangle base ≥3.5 mm; the r′ of iRBBB is narrow and sharp.',
            'El Brugada parece un «BRD», pero el sistema de conducción está intacto. Dos pruebas: el QRS de V6 e I termina **sin** una S ancha y empastada — el BRD, incluso el incompleto, siempre la deja — y el QRS no es ancho. Cuando en V1 solo hay un rSr′, decide la morfología: la r′ de la silla de montar es ancha y redondeada, ángulo β >58°, base del triángulo de la r′ ≥3,5 mm; la r′ de la BIRD es estrecha y puntiaguda.',
          ),
          marks: [{ auto: 'qrs', lead: 'V6' }],
          highlightLeads: ['I', 'V6'],
          view: { layout: 'strip', lead: 'V6' },
        },
        {
          title: l('图形之后是行动', 'After the pattern, action', 'Tras el patrón, la acción'),
          body: l(
            '发热时晕厥 + 1 型图形：**Brugada 综合征**。行动清单：转诊至遗传性心律失常门诊并评估 **ICD**；家族筛查与心电图（含第 2–3 肋间的高位 V1–V2）；**积极退热**——发热既揭出也加重图形；终身**避开钠通道阻滞剂**（氟卡尼、阿义马林、普鲁卡因胺等，见 o4），连普通感冒药也要对照清单过一遍。',
            'Syncope during fever + a type 1 pattern: **Brugada syndrome**. The action list: refer to an inherited-arrhythmia clinic and evaluate an **ICD**; screen the family with ECGs (including high-ICS V1–V2 in the 2nd–3rd spaces); **treat fever aggressively** — fever both unmasks and worsens the pattern; avoid sodium-channel blockers **for life** (flecainide, ajmaline, procainamide and others, see o4), checking even common-cold medicines against the list.',
            'Síncope con fiebre + patrón tipo 1: **síndrome de Brugada**. La lista de acciones: derivar a una unidad de arritmias hereditarias y evaluar un **DAI**; cribar a la familia con ECG (incluidas V1-V2 altas en el 2.º-3.º espacio); **tratar la fiebre con decisión**: la fiebre desenmascara y agrava el patrón; evitar de por vida los bloqueantes de los canales del sodio (flecainida, ajmalina, procainamida y otros, ver o4), revisando incluso los medicamentos del resfriado con la lista en la mano.',
          ),
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('马鞍型 vs rSr′：V1 之辩', 'Saddleback vs rSr′: the V1 debate', 'Silla de montar frente a rSr′: el debate de V1'),
      view: GRID,
      left: {
        ecg: synth('brugada-type2', 1344, { rate: 66 }),
        caption: l(
          '2 型 Brugada（V2 最典型）：高起点的 r′ 宽而圆钝，ST 凹形悬于基线之上，T 直立——马鞍型',
          'Type 2 Brugada (clearest in V2): a high take-off r′, broad and rounded, the ST hanging concave above the baseline, T upright — saddleback',
          'Brugada tipo 2 (más clara en V2): r′ de inicio alto, ancha y redondeada, ST cóncavo suspendido sobre la línea de base, T positiva: silla de montar',
        ),
        marks: [{ auto: 'j', lead: 'V2' }, { auto: 't', lead: 'V2' }],
      },
      right: {
        ecg: synth('irbbb', 1345, { rate: 72 }),
        caption: l(
          '不完全性右束支阻滞：V1 呈 rSr′，r′ 窄而尖，QRS <120 ms，V6/I 有顿挫的终末 S',
          'Incomplete RBBB: rSr′ in V1 with a narrow sharp r′, QRS <120 ms, a slurred terminal S in V6/I',
          'Bloqueo incompleto de rama derecha: rSr′ en V1 con r′ estrecha y puntiaguda, QRS <120 ms, S terminal empastada en V6/I',
        ),
        marks: [{ auto: 'qrs', lead: 'V1' }],
      },
      point: l(
        '两个“晚到的右向力量”都写在 V1，裁决要看三处：**r′ 的形状**——马鞍型宽而圆钝，iRBBB 窄而尖；**β 角与三角形**——马鞍型 >58°，且 r′ 顶点下方 5 mm 处的底边 ≥3.5 mm，iRBBB 的三角形又窄又高；**V6/I 的终末 S**——右束支阻滞一定有，Brugada 没有（假性右束支阻滞）。三查之后，rSr′ 就不会再被误叫成 Brugada。',
        'Both "late rightward forces" write themselves in V1; the verdict lives in three places: the **shape of the r′** — broad and rounded in the saddleback, narrow and sharp in iRBBB; the **β angle and triangle** — >58° in the saddleback, with a base ≥3.5 mm measured 5 mm below the r′ apex, whereas the iRBBB triangle is tall and narrow; and the **terminal S in V6/I** — always present in RBBB, absent in Brugada (pseudo-RBBB). After those three checks an rSr′ will not be mislabelled Brugada again.',
        'Ambas «fuerzas derechas tardías» se escriben en V1; el veredicto vive en tres sitios: la **forma de la r′** (ancha y redondeada en la silla de montar, estrecha y puntiaguda en la BIRD); el **ángulo β y el triángulo** (>58° en la silla de montar, con base ≥3,5 mm medida 5 mm por debajo del vértice de la r′, mientras que el triángulo de la BIRD es alto y estrecho) y la **S terminal en V6/I** (siempre presente en el BRD, ausente en el Brugada, pseudo-BRD). Con esas tres comprobaciones, un rSr′ ya no volverá a etiquetarse de Brugada.',
      ),
    },
    {
      kind: 'text',
      title: l('另一种 J 波：早期复极', 'The other J wave: early repolarisation', 'La otra onda J: repolarización precoz'),
      body: l(
        '下壁和侧壁导联也有 J 波，含义完全不同。**早期复极图形（ERP）**：QRS 终末——高大 R 波的降支——有切迹（J 波）或粗钝，其顶点或起点（Jp）在 **≥2 个相邻下壁和/或侧壁导联 ≥1 mm**（V1–V3 不算），QRS <120 ms；ST 段抬高**不是**必要条件。\n单纯 V1–V4 的上凹形 ST 抬高（健康年轻男性常见）**不是 ERP**，而是“正常（男性型）ST 抬高”，界值按年龄和性别：V2–V3 <2.5 mm（<40 岁男性）、<2 mm（≥40 岁男性）、<1.5 mm（女性），其余导联 <1 mm。\n**无症状 = 良性**：ERP 在普通人群和运动员中都是常见正常发现（见 h9），不需要任何进一步检查。\n**早期复极综合征（ERS）**= ERP + 从原因不明的室颤/多形性室速中复苏。较高危特征：Jp ≥2 mm、下壁或广泛分布、J 点后 ST 水平或下斜、J 波动态变化——这是幸存者的风险语言，不是无症状者的检查指征。',
        'The inferior and lateral leads have J waves too, with an entirely different meaning. **Early repolarisation pattern (ERP)**: a notch (J wave) or a slur at the end of the QRS, on the downslope of a prominent R, whose peak or onset (Jp) is **≥1 mm in ≥2 contiguous inferior and/or lateral leads** (V1–V3 do not count), with QRS <120 ms; ST elevation is **not** required.\nConcave ST elevation confined to V1–V4, common in healthy young men, is **not ERP** but "normal (male-pattern) ST elevation", with age- and sex-specific limits: in V2–V3 <2.5 mm (men <40 y), <2 mm (men ≥40 y), <1.5 mm (women); <1 mm in the other leads.\n**No symptoms = benign**: ERP is a common normal finding in the general population and in athletes (see h9) and needs no further testing whatsoever.\n**Early repolarisation syndrome (ERS)** = ERP + resuscitation from unexplained VF/polymorphic VT. Higher-risk features: Jp ≥2 mm, inferior or global distribution, a horizontal or descending ST after the J point, dynamic J waves — that vocabulary belongs to survivors, not to a work-up trigger in the asymptomatic.',
        'Las derivaciones inferiores y laterales también tienen ondas J, con un significado del todo distinto. **Patrón de repolarización precoz (ERP)**: una muesca (onda J) o un empastamiento al final del QRS, en la rama descendente de una R prominente, cuyo vértice o inicio (Jp) alcanza **≥1 mm en ≥2 derivaciones contiguas inferiores y/o laterales** (V1-V3 no cuentan), con QRS <120 ms; la elevación del ST **no** es necesaria.\nLa elevación cóncava del ST limitada a V1-V4, frecuente en varones jóvenes sanos, **no es ERP**, sino «elevación normal del ST (patrón masculino)», con límites por edad y sexo: en V2-V3 <2,5 mm (varones <40 años), <2 mm (varones ≥40 años), <1,5 mm (mujeres); <1 mm en las demás derivaciones.\n**Sin síntomas = benigno**: el ERP es un hallazgo normal frecuente en la población general y en los deportistas (ver h9) y no exige ninguna prueba adicional.\n**Síndrome de repolarización precoz (ERS)** = ERP + reanimación de una FV/TV polimórfica no explicada. Rasgos de mayor riesgo: Jp ≥2 mm, distribución inferior o global, ST horizontal o descendente tras el punto J, ondas J dinámicas: ese vocabulario pertenece a los supervivientes, no a una indicación de estudio en asintomáticos.',
      ),
    },
    {
      kind: 'criteria',
      title: l('早期复极：图形、界值与综合征', 'Early repolarisation: pattern, limits and syndrome', 'Repolarización precoz: patrón, límites y síndrome'),
      items: [
        {
          label: l('ERP（图形）', 'ERP (pattern)', 'ERP (patrón)'),
          value: l(
            'Jp ≥1 mm，≥2 个相邻下壁和/或侧壁导联（V1–V3 除外），QRS <120 ms',
            'Jp ≥1 mm in ≥2 contiguous inferior and/or lateral leads (V1–V3 excluded), QRS <120 ms',
            'Jp ≥1 mm en ≥2 derivaciones contiguas inferiores y/o laterales (V1-V3 excluidas), QRS <120 ms',
          ),
        },
        {
          label: l('ST 段抬高', 'ST elevation', 'Elevación del ST'),
          value: l('不是定义所必需', 'Not required for the definition', 'No es necesaria para la definición'),
        },
        {
          label: l('男性型 ST 抬高（非 ERP）', 'Male-pattern ST elevation (not ERP)', 'Elevación del ST en patrón masculino (no ERP)'),
          value: l(
            'V1–V4 上凹形抬高；V2–V3 界值 <2.5 mm（男 <40 岁）、<2 mm（男 ≥40 岁）、<1.5 mm（女）；其余导联 <1 mm',
            'Concave elevation in V1–V4; V2–V3 limits <2.5 mm (men <40 y), <2 mm (men ≥40 y), <1.5 mm (women); <1 mm elsewhere',
            'Elevación cóncava en V1-V4; límites en V2-V3 <2,5 mm (varones <40 años), <2 mm (varones ≥40 años), <1,5 mm (mujeres); <1 mm en el resto',
          ),
        },
        {
          label: l('无症状者', 'Asymptomatic person', 'Persona asintomática'),
          value: l('良性，无需进一步检查；运动员的正常发现', 'Benign, no further testing; a normal finding in athletes', 'Benigno, sin más pruebas; hallazgo normal en deportistas'),
        },
        {
          label: l('ERS（综合征）', 'ERS (syndrome)', 'ERS (síndrome)'),
          value: l('ERP + 从原因不明室颤/多形性室速中复苏', 'ERP + resuscitated from unexplained VF/polymorphic VT', 'ERP + reanimado de una FV/TV polimórfica no explicada'),
        },
        {
          label: l('较高危特征', 'Higher-risk features', 'Rasgos de mayor riesgo'),
          value: l(
            'Jp ≥2 mm、下壁或广泛分布、ST 水平/下斜、J 波动态变化',
            'Jp ≥2 mm, inferior or global distribution, horizontal/descending ST, dynamic J waves',
            'Jp ≥2 mm, distribución inferior o global, ST horizontal/descendente, ondas J dinámicas',
          ),
        },
      ],
      source:
        'Macfarlane PW et al. J Am Coll Cardiol 2015;66:470-477; Antzelevitch C et al. J-wave syndromes expert consensus. Heart Rhythm 2016;13:e295-e310; Zeppenfeld K et al. 2022 ESC Guidelines for ventricular arrhythmias and the prevention of sudden cardiac death. Eur Heart J 2022;43:3997-4126',
    },
    {
      kind: 'ecg',
      ecg: synth('early-repolarization', 1346, { rate: 62 }),
      view: GRID,
      marks: [{ auto: 'j', lead: 'II' }, { auto: 't', lead: 'II' }],
      caption: l(
        '24 岁男性，体检心电图：II 导联 J 点抬高，R 波降支带切迹，T 波高耸——J 点在 II、III、aVF 和 V4–V6 约 1–1.5 mm（≥2 个相邻的下壁和侧壁导联：下侧壁型）；V1–V3 的抬高（<2.5 mm，24 岁男性的正常范围）不参与定义。无任何症状：这是**良性**早期复极图形，不需要检查，更不需要“除外室颤”。',
        'A 24-year-old man, routine ECG: J-point elevation with a notch on the R downslope and a tall T in lead II — the J point sits about 1–1.5 mm up in II, III and aVF and in V4–V6 (≥2 contiguous inferior and lateral leads: an inferolateral pattern); the elevation in V1–V3 (<2.5 mm, normal for a man of 24) takes no part in the definition. No symptoms of any kind: this is a **benign** early repolarisation pattern; it needs no tests, and certainly no "rule-out VF".',
        'Un varón de 24 años, ECG de rutina: elevación del punto J con muesca en la rama descendente de la R y T alta en la derivación II; el punto J está elevado alrededor de 1-1,5 mm en II, III y aVF y en V4-V6 (≥2 derivaciones contiguas inferiores y laterales: patrón inferolateral); la elevación de V1-V3 (<2,5 mm, normal en un varón de 24 años) no participa en la definición. Sin síntoma alguno: se trata de un patrón de repolarización precoz **benigno**; no exige pruebas y desde luego no un «descarte de FV».',
      ),
    },
    {
      kind: 'live',
      scenario: 'early-repolarization',
      seed: 1347,
      dials: [{ id: 'st', label: l('J 点抬高', 'J-point elevation', 'Elevación del punto J') }],
      view: STRIP_V2,
      marks: [{ auto: 'j', lead: 'V2' }],
      caption: l(
        '移动滑杆，整个图形一起变大变小：V2 的 J 点抬高在约 0.6–1.3 mm 之间摆动，下壁和侧壁导联的 J 波随之起落（II 约 0.8–1.6 mm），而 V6 的 T 波始终远高于 ST（ST/T 比值 <0.25）。无论滑到哪里——都远低于年轻男性 V2–V3 可达的 2.5 mm——它在无症状者身上仍是良性图形；“Jp ≥2 mm + 下壁/广泛 + ST 水平”那套风险语言属于从室颤中复苏过来的患者——单凭心电图永远不能把良性变成综合征。',
        'Move the dial and the whole pattern grows and shrinks together: the J-point elevation in V2 swings between about 0.6 and 1.3 mm, the inferior and lateral J waves rise and fall with it (II about 0.8–1.6 mm), and the T wave in V6 stays far taller than the ST (ST/T ratio < 0.25). Wherever it sits — well under the 2.5 mm a young man may show in V2–V3 — it remains a benign pattern in an asymptomatic person; the "Jp ≥2 mm + inferior/global + horizontal ST" risk vocabulary belongs to patients resuscitated from VF — the ECG alone never turns benign into syndrome.',
        'Mueve el control y todo el patrón crece y mengua a la vez: la elevación del punto J en V2 oscila entre unos 0,6 y 1,3 mm, las ondas J inferiores y laterales suben y bajan con ella (II, unos 0,8-1,6 mm) y la onda T de V6 sigue siendo mucho más alta que el ST (cociente ST/T < 0,25). Esté donde esté —muy por debajo de los 2,5 mm que puede mostrar un varón joven en V2-V3—, sigue siendo un patrón benigno en una persona asintomática; el vocabulario de riesgo «Jp ≥2 mm + inferior/global + ST horizontal» pertenece a pacientes reanimados de una FV: el ECG por sí solo nunca convierte lo benigno en síndrome.',
      ),
    },
    { kind: 'check', item: { family: 'substrates', seed: 10 } },
    { kind: 'check', item: { family: 'substrates', seed: 3 } },
    { kind: 'check', item: { family: 'substrates', seed: 4 } },
    { kind: 'drill', families: ['substrates', 'compare-substrate'], count: 8, passScore: 0.85 },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把马鞍型直接报告为“Brugada”：2 型本身不诊断——先查 β 角和 r′ 三角形底边，再在高位肋间导联（V1–V2 记于第 2–3 肋间）或监护下药物激发中寻找 1 型，最后由临床特征决定。',
          'Reporting a saddleback straight out as "Brugada": type 2 is not diagnostic by itself — check the β angle and the r′ triangle base first, then hunt the type 1 in high intercostal leads (V1–V2 in the 2nd–3rd ICS) or a monitored drug challenge, and let the clinical features decide.',
          'Informar una silla de montar directamente como «Brugada»: el tipo 2 no diagnostica por sí solo: comprueba primero el ángulo β y la base del triángulo de la r′, busca después el tipo 1 en derivaciones intercostales altas (V1-V2 en el 2.º-3.º espacio) o con prueba farmacológica monitorizada y deja que decidan los datos clínicos.',
        ),
        l(
          '把 iRBBB 的 rSr′ 叫作 Brugada：它的 r′ 窄而尖、β 角小，而且 V6/I 一定带着终末 S——Brugada 的 V6 没有宽 S（假性右束支阻滞）。',
          'Calling the rSr′ of iRBBB Brugada: its r′ is narrow and sharp, the β angle small, and V6/I always carry a terminal S — in Brugada, V6 has no wide S (pseudo-RBBB).',
          'Llamar Brugada al rSr′ de la BIRD: su r′ es estrecha y puntiaguda, el ángulo β pequeño, y V6/I siempre llevan una S terminal; en el Brugada, V6 no tiene S ancha (pseudo-BRD).',
        ),
        l(
          '用发热“解释一切”而放下 Brugada：发热恰恰是揭出 1 型图形的时机，也是 Brugada 患者的危险时段——退热本身就是治疗。',
          'Explaining everything away with the fever and dropping Brugada: fever is precisely what unmasks the type 1 pattern, and it is a dangerous period for a Brugada patient — treating the fever is itself the therapy.',
          'Justificarlo todo por la fiebre y olvidar el Brugada: la fiebre es justamente lo que desenmascara el patrón tipo 1 y un período peligroso para el paciente con Brugada: tratar la fiebre ya es terapia.',
        ),
        l(
          '对无症状者的 ERP 大做检查：ERP 在无症状人群中是常见的良性变异（运动员中也是正常发现）；ERS 只属于从原因不明室颤中复苏的患者。',
          'Over-investigating ERP in an asymptomatic person: ERP is a common benign variant in people without symptoms (a normal finding in athletes too); ERS belongs only to survivors of unexplained VF.',
          'Someter a un maremágnum de pruebas el ERP de una persona asintomática: el ERP es una variante benigna frecuente en personas sin síntomas (también hallazgo normal en deportistas); el ERS solo pertenece a los supervivientes de una FV no explicada.',
        ),
        l(
          '给 Brugada 患者开钠通道阻滞剂：氟卡尼、阿义马林、普鲁卡因胺会揭出并加重图形，还可能诱发室颤；开处方前先想起这份心电图（见 o4）。',
          'Prescribing a sodium-channel blocker to a Brugada patient: flecainide, ajmaline and procainamide unmask and worsen the pattern and can trigger VF; think of this ECG before writing the prescription (see o4).',
          'Recetar un bloqueante de los canales del sodio a un paciente con Brugada: flecainida, ajmalina y procainamida desenmascaran y agravan el patrón y pueden desencadenar una FV; piensa en este ECG antes de firmar la receta (ver o4).',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '1 型（穹隆型）：≥1 个右胸导联（第 2–4 肋间）ST 抬高 ≥2 mm + T 波倒置——唯一可诊断的 Brugada 图形；2 型马鞍型本身不能诊断。',
          'Type 1 (coved): ST elevation ≥2 mm + negative T in ≥1 right precordial lead (2nd–4th ICS) — the only diagnostic Brugada pattern; the type 2 saddleback alone diagnoses nothing.',
          'Tipo 1 (en cúpula): elevación del ST ≥2 mm + T negativa en ≥1 derivación precordial derecha (2.º-4.º EIC): el único patrón de Brugada diagnóstico; el tipo 2 en silla de montar, por sí solo, no diagnostica nada.',
        ),
        l(
          '图形 → 综合征：自发 1 型（无其他心脏病）即可诊断；药物/发热诱发的 1 型还需要心律失常性晕厥、室颤/多形性室速或家族史；转诊评估 ICD、积极退热、终身避开钠通道阻滞剂。',
          'Pattern → syndrome: a spontaneous type 1 (no other heart disease) diagnoses on its own; a drug/fever-induced type 1 also needs arrhythmic syncope, VF/polymorphic VT or a family history; refer for ICD evaluation, treat fever, keep sodium-channel blockers away for life.',
          'Patrón → síndrome: un tipo 1 espontáneo (sin otra cardiopatía) basta por sí solo; uno inducido por fármacos o fiebre precisa además síncope arrítmico, FV/TV polimórfica o antecedentes familiares; deriva para evaluar un DAI, trata la fiebre y evita de por vida los bloqueantes de los canales del sodio.',
        ),
        l(
          '马鞍型 vs iRBBB 三查：r′ 宽而圆钝 vs 窄而尖；β 角 >58°、底边 ≥3.5 mm；V6/I 终末 S 有（右束支阻滞）无（Brugada）。',
          'Saddleback vs iRBBB, three checks: broad rounded vs narrow sharp r′; β angle >58° with base ≥3.5 mm; terminal S in V6/I present (RBBB) or absent (Brugada).',
          'Silla de montar frente a BIRD, tres comprobaciones: r′ ancha y redondeada frente a estrecha y puntiaguda; ángulo β >58° con base ≥3,5 mm; S terminal en V6/I presente (BRD) o ausente (Brugada).',
        ),
        l(
          'ERP：Jp ≥1 mm，≥2 个相邻下壁/侧壁导联（V1–V3 除外）——无症状即良性；ERS = ERP + 原因不明室颤复苏；高危语言（Jp ≥2 mm、下壁/广泛、ST 水平）只属于幸存者。',
          'ERP: Jp ≥1 mm in ≥2 contiguous inferior/lateral leads (V1–V3 excluded) — benign if asymptomatic; ERS = ERP + resuscitated from unexplained VF; the high-risk language (Jp ≥2 mm, inferior/global, horizontal ST) belongs to survivors only.',
          'ERP: Jp ≥1 mm en ≥2 derivaciones contiguas inferiores/laterales (V1-V3 excluidas): benigno si no hay síntomas; ERS = ERP + reanimado de una FV no explicada; el lenguaje de alto riesgo (Jp ≥2 mm, inferior/global, ST horizontal) solo pertenece a los supervivientes.',
        ),
      ],
    },
  ],
  sources: [
    'Bayés de Luna A et al. J Electrocardiol 2012;45:433-442',
    'Antzelevitch C et al. J-wave syndromes expert consensus. Heart Rhythm 2016;13:e295-e310',
    'Macfarlane PW et al. J Am Coll Cardiol 2015;66:470-477',
    'Zeppenfeld K et al. 2022 ESC Guidelines for ventricular arrhythmias and the prevention of sudden cardiac death. Eur Heart J 2022;43:3997-4126',
    'Castellano et al. 2004',
  ],
};

export default lesson;
