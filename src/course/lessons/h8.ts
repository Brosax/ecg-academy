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
/** the heart block's type 1 heart; the same request with V1–V2 moved to another intercostal space */
const TYPE1_REQ = { scenario: 'brugada-type1', seed: 1342, dials: { rate: 70 } } as const;
const TYPE1: EcgSource = { kind: 'synth', req: TYPE1_REQ };
const v1v2At = (ics: number) => ({ chest: { V1: { ics, line: 'sternal', side: 'R' }, V2: { ics, line: 'sternal', side: 'L' } } }) as const;

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
        '38 岁男性，发热性疾病期间晕厥一次。V1–V2 的 ST 段呈穹隆样抬高，随后落进一个倒置的 T 波。这个图形叫什么？拿到它你**必须**做什么？先想好答案再揭晓。',
        'A 38-year-old man fainted once during a febrile illness. In V1–V2 the ST segment rises in a coved shape and falls into a negative T wave. What is this pattern called, and what **must** you do with it? Commit before the reveal.',
        'Un varón de 38 años sufrió un síncope durante un proceso febril. En V1-V2 el segmento ST se eleva con morfología en cúpula y cae a una onda T negativa. ¿Cómo se llama este patrón y qué **debes** hacer con él? Decide tu respuesta antes de ver la solución.',
      ),
      reveal: l(
        '穹隆型（下斜型）ST 段抬高 ≥2 mm + T 波倒置，出现在 ≥1 个右胸导联——这是 **1 型 Brugada 图形**，唯一具有诊断意义的一型。自发的 1 型图形本身就足以诊断；发热诱发的还需要加上临床——这位患者有晕厥，两条路都通向 **Brugada 综合征**：这份 12 导联不是诊断的终点，而是起点——**转诊**（评估植入 ICD），积极退热，并从此让这位患者远离钠通道阻滞剂。',
        'Coved (downward-sloping) ST elevation ≥2 mm followed by a negative T in ≥1 right precordial lead — this is the **type 1 Brugada pattern**, the only diagnostic one. A spontaneous type 1 diagnoses on its own; one brought out by fever needs a clinical feature as well — and this patient has had syncope, so either way it is **Brugada syndrome**: this 12-lead is not the end of the diagnosis but its beginning — **refer** (ICD evaluation), treat the fever aggressively, and keep this patient away from sodium-channel blockers from now on.',
        'Elevación del ST en cúpula (con pendiente descendente) ≥2 mm seguida de T negativa en ≥1 derivación precordial derecha: este es el **patrón de Brugada tipo 1**, el único diagnóstico. Un tipo 1 espontáneo basta por sí solo; uno desenmascarado por la fiebre necesita además un dato clínico, y este paciente ha tenido un síncope, así que en ambos casos es un **síndrome de Brugada**: estas 12 derivaciones no son el final del diagnóstico sino su comienzo: **deriva** (evaluación de DAI), trata la fiebre con decisión y mantén desde ahora a este paciente lejos de los bloqueantes de los canales del sodio.',
      ),
    },
    {
      kind: 'heart',
      ecg: TYPE1,
      emphasize: ['rv-outflow'],
      showConduction: true,
      caption: l(
        '图形写在右心室流出道的**心外膜**上：钠电流减弱，那里动作电位的穹顶丢失，V1–V2 记下穹隆型 ST 抬高和倒置 T。传导系统完好：这是“假性右束支阻滞”。',
        'The pattern is written on the **epicardium** of the RV outflow tract: a weak sodium current loses the action-potential dome there, so V1–V2 record a coved ST elevation and a negative T. The conduction system is intact: a "pseudo-RBBB".',
        'El patrón se escribe en el **epicardio** del tracto de salida del VD: una corriente de sodio débil pierde allí la cúpula del potencial de acción, y V1-V2 registran un ST elevado en cúpula y una T negativa. El sistema de conducción está intacto: un «pseudo-BRD».',
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
      kind: 'film',
      title: l('同一颗心脏，V1–V2 换个肋间', 'One heart, V1–V2 one space up or down', 'Un corazón, V1-V2 un espacio arriba o abajo'),
      view: { layout: '3x4+1', highlightLeads: ['V1', 'V2'] },
      frames: [
        {
          label: l('低一个肋间', 'One space low', 'Un espacio más bajo'),
          ecg: { kind: 'synth', req: { ...TYPE1_REQ, recording: { placement: v1v2At(5) } } },
          note: l(
            'V1–V2 贴在第 5 肋间：J 点只抬高约 1 mm，不到 1 型要求的 2 mm。1 型图形就这样被漏掉。',
            'V1–V2 in the 5th intercostal space: the J point is up only about 1 mm, under the 2 mm a type 1 needs. This is how a type 1 is missed.',
            'V1-V2 en el 5.º espacio intercostal: el punto J solo sube alrededor de 1 mm, por debajo de los 2 mm que exige el tipo 1. Así se pasa por alto un tipo 1.',
          ),
          marks: [{ auto: 'j', lead: 'V2' }],
        },
        {
          label: l('第 4 肋间', '4th space', '4.º espacio'),
          ecg: TYPE1,
          note: l(
            '标准位置：J 点约 3.5 mm，ST 一路下斜进入倒置 T（约 4 mm）：1 型 Brugada 图形。',
            'Standard position: the J point is about 3.5 mm up and the ST slopes down into a negative T (about 4 mm): the type 1 Brugada pattern.',
            'Posición estándar: el punto J sube unos 3,5 mm y el ST desciende hasta una T negativa (unos 4 mm): el patrón de Brugada tipo 1.',
          ),
          marks: [{ auto: 'j', lead: 'V2' }, { auto: 't', lead: 'V2' }],
        },
        {
          label: l('高一个肋间', 'One space high', 'Un espacio más alto'),
          ecg: { kind: 'synth', req: { ...TYPE1_REQ, recording: { placement: v1v2At(3) } } },
          note: l(
            '同一颗心脏，V1–V2 移到第 3 肋间、更贴近流出道：J 点约 5–7 mm，T 更深。高位导联能揭出并放大图形。',
            'Same heart, V1–V2 in the 3rd intercostal space, closer to the outflow tract: the J point is about 5–7 mm up and the T deeper. High leads unmask and enlarge the pattern.',
            'Mismo corazón, V1-V2 en el 3.er espacio intercostal, más cerca del tracto de salida: el punto J sube unos 5-7 mm y la T es más profunda. Las derivaciones altas desenmascaran y agrandan el patrón.',
          ),
          marks: [{ auto: 'j', lead: 'V2' }, { auto: 't', lead: 'V2' }],
        },
      ],
      predict: {
        question: l(
          '把 V1–V2 往上移一个肋间，更贴近右心室流出道。穹隆型 ST 会怎样？',
          'Move V1–V2 one space up, closer to the RV outflow tract. What happens to the coved ST?',
          'Sube V1-V2 un espacio, más cerca del tracto de salida del VD. ¿Qué le pasa al ST en cúpula?',
        ),
        options: [l('变高', 'It grows', 'Crece'), l('变低', 'It shrinks', 'Disminuye'), l('不变', 'No change', 'No cambia')],
        answer: 0,
      },
      caption: l(
        '怀疑 Brugada 时把 V1–V2 记在第 2–3 肋间；2 型马鞍型本身不诊断，要在高位导联、发热时或监护下药物激发中去找 1 型。',
        'When Brugada is suspected, record V1–V2 in the 2nd–3rd intercostal spaces; a type 2 saddleback diagnoses nothing alone, so hunt the type 1 in high leads, during fever or in a monitored drug challenge.',
        'Ante la sospecha de Brugada, registra V1-V2 en el 2.º-3.er espacio intercostal; un tipo 2 en silla de montar no diagnostica por sí solo: busca el tipo 1 en derivaciones altas, con fiebre o en una prueba farmacológica monitorizada.',
      ),
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
      kind: 'film',
      title: l('下壁和侧壁的 J 波：过不过 1 mm', 'Inferolateral J waves: over 1 mm or not', 'Ondas J inferolaterales: ¿pasan de 1 mm?'),
      view: { layout: '3x4+1', highlightLeads: ['II', 'III', 'aVF', 'V4', 'V5', 'V6'] },
      frames: [
        {
          label: l('J 点低', 'Low J', 'J baja'),
          ecg: synth('early-repolarization', 1346, { rate: 62, st: 0.06 }),
          note: l(
            'II、III、aVF 和 V4–V6 的 J 点都不到 1 mm：不够早期复极图形。',
            'The J point is under 1 mm in II, III, aVF and V4–V6: not an early repolarisation pattern.',
            'El punto J no llega a 1 mm en II, III, aVF ni V4-V6: no es un patrón de repolarización precoz.',
          ),
          marks: [{ auto: 'j', lead: 'II' }, { auto: 'j', lead: 'V5' }],
        },
        {
          label: l('早期复极', 'Early repolarisation', 'Repolarización precoz'),
          ecg: synth('early-repolarization', 1346, { rate: 62 }),
          note: l(
            '同一颗心脏：R 降支末端的 J 点（切迹或顿挫）在 II、III、aVF 和 V4–V6 抬高约 1–1.6 mm：下侧壁早期复极图形。无症状即良性。',
            'Same heart: the J point at the end of the R downslope (notch or slur) is up about 1–1.6 mm in II, III, aVF and V4–V6: an inferolateral early repolarisation pattern. Benign without symptoms.',
            'Mismo corazón: el punto J al final de la rama descendente de la R (muesca o empastamiento) sube unos 1-1,6 mm en II, III, aVF y V4-V6: patrón de repolarización precoz inferolateral. Benigno sin síntomas.',
          ),
          marks: [{ auto: 'j', lead: 'II' }, { auto: 'j', lead: 'V5' }],
        },
      ],
      caption: l(
        '早期复极看的是下壁和侧壁（≥2 个相邻导联 Jp ≥1 mm），V1–V3 不算。只有从原因不明的室颤中复苏的人才叫早期复极综合征。',
        'Early repolarisation is read in the inferior and lateral leads (Jp ≥1 mm in ≥2 contiguous leads); V1–V3 do not count. Only a survivor of unexplained VF has early repolarisation syndrome.',
        'La repolarización precoz se lee en las derivaciones inferiores y laterales (Jp ≥1 mm en ≥2 contiguas); V1-V3 no cuentan. Solo quien sobrevive a una FV no explicada tiene síndrome de repolarización precoz.',
      ),
    },
    {
      kind: 'live',
      scenario: 'early-repolarization',
      seed: 1347,
      dials: [{ id: 'st', label: l('J 点抬高', 'J-point elevation', 'Elevación del punto J') }],
      view: STRIP_V2,
      marks: [{ auto: 'j', lead: 'V2' }],
      play: {
        dial: 'st',
        from: 0.06,
        to: 0.14,
        notes: [
          {
            min: 0.06,
            max: 0.1,
            text: l(
              'V2 的 ST 抬高约 0.6–1 mm（读数 mV × 10），T 直立：远低于年轻男性 2.5 mm 的界值。',
              'The ST in V2 is up about 0.6–1 mm (the read-out in mV × 10) with an upright T: far under the 2.5 mm limit of a young man.',
              'El ST de V2 sube unos 0,6-1 mm (la lectura en mV × 10) con T positiva: muy por debajo del límite de 2,5 mm de un varón joven.',
            ),
          },
          {
            min: 0.11,
            max: 0.14,
            text: l(
              'V2 升到约 1.1–1.4 mm，T 仍直立、ST 不呈穹隆：不是 Brugada。V1–V3 不计入早期复极。',
              'V2 rises to about 1.1–1.4 mm, the T still upright and the ST not coved: not Brugada. V1–V3 do not count towards early repolarisation.',
              'V2 sube a unos 1,1-1,4 mm, con la T aún positiva y el ST sin cúpula: no es Brugada. V1-V3 no cuentan para la repolarización precoz.',
            ),
          },
        ],
      },
      predict: {
        question: l(
          '滑杆最高是 0.14 mV。V2 的 ST 会达到年轻男性 2.5 mm 的界值吗？',
          'The dial tops out at 0.14 mV. Will the ST in V2 ever reach the 2.5 mm limit of a young man?',
          'El control llega como máximo a 0,14 mV. ¿Alcanzará el ST de V2 el límite de 2,5 mm de un varón joven?',
        ),
        options: [
          l('会，不到顶就超过', 'Yes, before the top', 'Sí, antes del máximo'),
          l('刚好在顶端碰到', 'Only just, at the top', 'Justo al llegar al máximo'),
          l('不会，一直远低于它', 'No, it stays well under', 'No, se queda muy por debajo'),
        ],
        answer: 2,
      },
      caption: l(
        '移动滑杆，整个图形一起变大变小。无症状者无论滑到哪里都是良性；单凭心电图永远不能把良性图形变成综合征。',
        'Move the dial and the whole pattern grows and shrinks together. In an asymptomatic person it stays benign wherever it sits; the ECG alone never turns a benign pattern into a syndrome.',
        'Mueve el control y todo el patrón crece y mengua a la vez. En una persona asintomática sigue siendo benigno esté donde esté; el ECG por sí solo nunca convierte un patrón benigno en síndrome.',
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
          '把下侧壁的 J 点抬高读成心包炎：早期复极时 V6 的 T 远高于 ST（ST/T 比值 <0.25）；比值更大才提示心包炎。',
          'Reading inferolateral J-point elevation as pericarditis: in early repolarisation the T in V6 stays far taller than the ST (ST/T ratio < 0.25); a larger ratio points to pericarditis.',
          'Leer como pericarditis una elevación del punto J inferolateral: en la repolarización precoz la T de V6 sigue siendo mucho más alta que el ST (cociente ST/T < 0,25); un cociente mayor orienta a pericarditis.',
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
