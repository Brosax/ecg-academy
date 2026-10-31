/**
 * h3 — RVH and right heart strain (docs/PLAN.md §3, stage H).
 * Criteria: docs/curriculum/criteria.md `rvh-criteria`, `rv-systolic-overload`, `rv-volume-overload`,
 * `biventricular-hypertrophy`, `cor-pulmonale-chronic` (current values), plus the missing-in-book bullets under
 * `atrial-enlargement-ventricular-hypertrophy`: the dominant-R-in-V1 differential, RVH in COPD/emphysema and
 * acute RV pressure overload (pulmonary embolism).
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
  id: 'h3',
  stage: 'H',
  order: 3,
  title: l('右心室肥厚与右心负荷过重', 'RVH and right heart strain', 'HVD y sobrecarga del corazón derecho'),
  summary: l(
    'V1 出现主导 R 波时先走鉴别阶梯（束支阻滞、预激、后壁心梗、右位心、年轻人），再用右心室肥厚征象群（电轴右偏 ≥+110°、V1 高 R、V5–V6 深 S）下诊断；COPD 图形中经典标准并不敏感。',
    'When V1 shows a dominant R, run the differential ladder first (bundle branch block, pre-excitation, posterior MI, dextrocardia, youth), then apply the RVH constellation (RAD ≥+110°, tall R in V1, deep S in V5–V6); in the COPD pattern the classic criteria are insensitive.',
    'Ante una R dominante en V1, recorre primero la escalera diferencial (bloqueo de rama, preexcitación, infarto posterior, dextrocardia, juventud) y aplica después el conjunto de signos de HVD (eje derecho ≥+110°, R alta en V1, S profunda en V5-V6); en el patrón de EPOC los criterios clásicos son poco sensibles.',
  ),
  objectives: [
    l(
      '对 V1 主导 R 波先走鉴别阶梯：QRS 时限、PR 与 δ 波、电轴、T 波方向、年龄，再决定是否诊断右心室肥厚。',
      'Run the differential ladder for a dominant R in V1 — QRS width, PR and delta wave, axis, T direction, age — before calling RVH.',
      'Recorrer la escalera diferencial de la R dominante en V1 — anchura del QRS, PR y onda delta, eje, dirección de la T y edad— antes de diagnosticar HVD.',
    ),
    l(
      '应用右心室肥厚征象群：电轴右偏 ≥+110°、R V1 ≥7 mm、R/S V1 >1、S V5/V6 ≥7 mm、R V1 + S V5/V6 >10.5 mm、R aVR ≥5 mm、V1–V3 继发性ST-T改变。',
      'Apply the RVH constellation: RAD ≥+110°, R V1 ≥7 mm, R/S V1 >1, S V5/V6 ≥7 mm, R V1 + S V5/V6 >10.5 mm, R aVR ≥5 mm, secondary ST–T in V1–V3.',
      'Aplicar el conjunto de signos de HVD: eje derecho ≥+110°, R V1 ≥7 mm, R/S V1 >1, S V5/V6 ≥7 mm, R V1 + S V5/V6 >10,5 mm, R aVR ≥5 mm, ST-T secundario en V1-V3.',
    ),
    l(
      '在左心室肥厚电压的基础上识别双心室肥厚（电轴右偏、V1–V2 高 R 或 V2–V4 大 RS）。',
      'Recognise biventricular hypertrophy when LVH voltage comes with RAD, a tall R in V1–V2 or a large RS in V2–V4.',
      'Reconocer la hipertrofia biventricular cuando al voltaje de HVI se suman eje derecho, R alta en V1-V2 o una RS grande en V2-V4.',
    ),
    l(
      '区分慢性右心室肥厚、COPD 图形、右心容量负荷（V1 呈 rsR′）与急性右心压力负荷（肺栓塞）。',
      'Tell chronic RVH, the COPD pattern, RV volume overload (rsR′ in V1) and acute RV pressure overload (pulmonary embolism) apart.',
      'Distinguir la HVD crónica, el patrón de EPOC, la sobrecarga de volumen del VD (rsR′ en V1) y la sobrecarga aguda de presión (embolia pulmonar).',
    ),
  ],
  minutes: 15,
  competencies: ['C7', 'C5'],
  findings: ['rvh', 'biventricular-hypertrophy', 'copd-pattern'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('rvh', 1241, { rate: 78 }),
      view: { layout: '3x4+1', highlightLeads: ['V1'] },
      question: l(
        'V1 的 R 波超过了它自己的 S 波。先别急着下诊断——把"V1 主导 R 波"的鉴别诊断整张清单列出来，然后说出你选哪一个、为什么。',
        'The R wave in V1 outweighs its own S. Do not commit to a diagnosis yet — list the whole differential of a dominant R in V1, then say which one you pick and why.',
        'La onda R en V1 supera a su propia S. No te comprometas todavía con un diagnóstico: enumera todo el diagnóstico diferencial de la R dominante en V1 y di después cuál eliges y por qué.',
      ),
      reveal: l(
        '主导 R 波是一段阶梯：**右束支阻滞**（QRS ≥120 ms）、**后壁心肌梗死**（下壁 Q 波、V1 的 T 直立）、**WPW 预激**（δ 波、PR 短）、**肥厚型心肌病**、**右位心/电极错位**、**儿童与年轻人**的正常表现——最后才是右心室肥厚。本图 QRS 不宽、PR 正常、无 δ 波，电轴右偏（约 +120°），V1 呈高 R（约 18 mm，几乎没有 S），S 波一直延续到 V6：**右心室肥厚**。跳过阶梯直接写诊断，是这个图形最常见的错误。',
        'A dominant R is a ladder: **RBBB** (QRS ≥120 ms), **posterior MI** (inferior Q waves, upright T in V1), **WPW** (delta wave, short PR), **HCM**, **dextrocardia / lead misplacement**, the **normal young** — and only then RVH. Here the QRS is narrow, the PR normal, there is no delta, the axis is rightward (about +120°), V1 has a tall R (about 18 mm, with almost no S) and the S persists out to V6: **RVH**. Jumping straight to the diagnosis is the commonest error this shape invites.',
        'Una R dominante es una escalera: **bloqueo de rama derecha** (QRS ≥120 ms), **infarto posterior** (ondas Q inferiores, T positiva en V1), **WPW** (onda delta, PR corto), **miocardiopatía hipertrófica**, **dextrocardia / electrodos mal puestos**, el **joven normal**… y solo después la HVD. Aquí el QRS es estrecho, el PR normal, no hay delta, el eje está desviado a la derecha (unos +120°), V1 tiene una R alta (unos 18 mm, casi sin S) y la S persiste hasta V6: **HVD**. Saltar la escalera y escribir el diagnóstico directo es el error más frecuente que invita esta forma.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('rvh', 1242, { rate: 72 }),
      showConduction: true,
      emphasize: ['rv-basal', 'rv-mid', 'rv-apical', 'rv-outflow'],
      caption: l(
        '播放一个心动周期。正常的右心室壁薄，除极力量被厚得多的左心室"接管"，V1 因此写下一个小 r 加深 S（rS）。肺动脉高压使右心室肥厚——图中高亮的四个右心室节段——向量重新指向右、前方，正对 V1：R 波长高，V5–V6 记下深 S 波，肢体导联则表现为电轴右偏。同一个向量，三处落笔。',
        'Play one beat. The normal RV wall is thin, so its depolarisation force is swamped by the much thicker left ventricle, and V1 writes a small r with a deep S (rS). Pulmonary hypertension hypertrophies the right ventricle — the four highlighted RV segments — and the vector swings rightward and forward, straight at V1: the R grows, V5–V6 record a deep S, and the limb leads show right axis deviation. One vector, three places it is written down.',
        'Reproduce un latido. La pared del VD normal es fina, su fuerza de despolarización queda eclipsada por el ventrículo izquierdo, mucho más grueso, y V1 escribe una r pequeña con una S profunda (rS). La hipertensión pulmonar hipertrofia el ventrículo derecho —los cuatro segmentos destacados— y el vector gira hacia la derecha y hacia delante, de frente a V1: la R crece, V5-V6 registran una S profunda y las derivaciones de extremidades muestran desviación derecha del eje. Un solo vector, escrito en tres sitios.',
      ),
    },
    {
      kind: 'text',
      title: l('先走阶梯，再谈标准', 'The ladder first, the criteria second', 'Primero la escalera, después los criterios'),
      body: l(
        '右心室肥厚没有单条金标准，只有一组互相支持的征象；而下结论之前必须先排除同样能"抬高 V1 的 R"的其他原因：\n- **右束支阻滞**：QRS ≥120 ms，V1 呈 rsR′——先看宽度；\n- **后壁心肌梗死**：下壁导联有病理性 Q，V1 的 T 直立（与右心室肥厚的 T 倒置相反）；\n- **WPW 预激**：PR 短、δ 波；\n- **肥厚型心肌病**、**右位心或电极放错**（看 I 导联和胸导联 R 波递增）、**儿童**（右心室占优势是正常的）。\n检查四样东西再签"右心室肥厚"：电轴、QRS 时限、PR 与 δ 波、T 波方向。',
        'No single criterion is a gold standard for RVH — only a constellation of mutually supporting signs — and before concluding you must exclude the other causes that also "lift the R in V1":\n- **RBBB**: QRS ≥120 ms with rsR′ in V1 — check the width first;\n- **posterior MI**: pathological Q waves in the inferior leads with an **upright** T in V1 (the opposite of RVH, which inverts it);\n- **WPW**: short PR, delta wave;\n- **HCM**, **dextrocardia or misplaced leads** (check lead I and the precordial R progression), and **children** (RV dominance is normal).\nCheck four things before signing "RVH": axis, QRS width, PR/delta, and the T direction.',
        'No existe un criterio único de oro para la HVD, solo un conjunto de signos que se apoyan entre sí, y antes de concluir hay que excluir las demás causas que también «elevan la R en V1»:\n- **bloqueo de rama derecha**: QRS ≥120 ms con rsR′ en V1; mira primero la anchura;\n- **infarto posterior**: ondas Q patológicas en las derivaciones inferiores con T **positiva** en V1 (lo contrario de la HVD, que la invierte);\n- **WPW**: PR corto, onda delta;\n- **miocardiopatía hipertrófica**, **dextrocardia o electrodos mal colocados** (mira la derivación I y la progresión de la R precordial) y **niños** (el dominio del VD es normal).\nComprueba cuatro cosas antes de firmar «HVD»: eje, anchura del QRS, PR/delta y dirección de la T.',
      ),
    },
    {
      kind: 'criteria',
      title: l('右心室肥厚征象群与右心负荷图形', 'The RVH constellation and the right-heart overload patterns', 'El conjunto de signos de HVD y los patrones de sobrecarga derecha'),
      items: [
        {
          label: l('电轴', 'Axis', 'Eje'),
          value: l('成人电轴右偏 ≥+110°', 'RAD ≥+110° in adults', 'Desviación derecha del eje ≥+110° en adultos'),
        },
        {
          label: l('V1', 'V1', 'V1'),
          value: l(
            'R ≥7 mm；R/S >1（Cabrera R/(R+S) ≥0.5 等价）；S <2 mm；qR 型特异性最高；R 峰时间 ≥35 ms',
            'R ≥7 mm; R/S >1 (Cabrera R/(R+S) ≥0.5 is equivalent); S <2 mm; a qR pattern is the most specific; R-peak time ≥35 ms',
            'R ≥7 mm; R/S >1 (Cabrera R/(R+S) ≥0,5 es equivalente); S <2 mm; el patrón qR es el más específico; tiempo hasta la cúspide de la R ≥35 ms',
          ),
        },
        {
          label: l('V5/V6 与总和', 'V5/V6 and the sums', 'V5/V6 y las sumas'),
          value: l(
            'S V5/V6 ≥7 mm 且 R/S ≤1；R V1 + S V5/V6 >10.5 mm；R aVR ≥5 mm（流出道受累时）',
            'S V5/V6 ≥7 mm with R/S ≤1; R V1 + S V5/V6 >10.5 mm; R aVR ≥5 mm',
            'S V5/V6 ≥7 mm con R/S ≤1; R V1 + S V5/V6 >10,5 mm; R aVR ≥5 mm',
          ),
        },
        {
          label: l('继发性ST-T改变', 'Secondary ST–T', 'ST-T secundario'),
          value: l(
            'V1–V3（可到 V4 及 II/III/aVF）T 不对称倒置 ± ST 压低，出现在高 R 波的导联——报告写"伴继发性ST-T改变"，不写"劳损"',
            'Asymmetric T inversion ± ST depression in V1–V3 (sometimes to V4 and in II/III/aVF), in the leads with the tall R — report "with secondary ST–T abnormality", not "strain"',
            'Inversión asimétrica de la T ± descenso del ST en V1-V3 (a veces hasta V4 y en II/III/aVF), en las derivaciones con R alta: se informa «con alteración secundaria del ST-T», no «sobrecarga»',
          ),
        },
        {
          label: l('必须排除', 'Must exclude', 'Hay que excluir'),
          value: l(
            '右束支阻滞、后壁心梗、WPW、肥厚型心肌病、右位心/电极错位、正常年轻人',
            'RBBB, posterior MI, WPW, HCM, dextrocardia / lead error, and the normal young',
            'Bloqueo de rama derecha, infarto posterior, WPW, miocardiopatía hipertrófica, dextrocardia / error de electrodos y el joven normal',
          ),
        },
        {
          label: l('双心室肥厚', 'Biventricular hypertrophy', 'Hipertrofia biventricular'),
          value: l(
            'LVH 电压 + 电轴右偏（>+90°）；或 LVH 伴 V1–V2 高 R / V5–V6 深 S；或 V2–V4 大双向 RS、R+S ≥50–60 mm（Katz-Wachtel，主要见于儿童先心病）；左心房异常 + 右心室肥厚征象也应起疑',
            'LVH voltage + RAD (>+90°); or LVH with a tall R in V1–V2 / deep S in V5–V6; or a large biphasic RS in V2–V4 with R+S ≥50–60 mm (Katz-Wachtel, mainly children with congenital disease); LA abnormality plus RVH signs also raises suspicion',
            'Voltaje de HVI + desviación derecha del eje (>+90°); o HVI con R alta en V1-V2 / S profunda en V5-V6; o RS bifásica grande en V2-V4 con R+S ≥50-60 mm (Katz-Wachtel, sobre todo en niños con cardiopatía congénita); la anomalía auricular izquierda con signos de HVD también debe levantar sospecha',
          ),
        },
        {
          label: l('COPD / 慢性肺心病', 'COPD / chronic cor pulmonale', 'EPOC / cor pulmonale crónico'),
          value: l(
            '肢体导联低电压 + 肺型 P 波（II/III/aVF ≥2.5 mm，P 电轴垂直）+ 电轴右偏或 S1S2S3 + R 波递增不良、S 波持续到 V5–V6；经典右心室肥厚电压标准在此不敏感；心电图正常不能排除肺动脉高压',
            'Low limb-lead voltage + P pulmonale (≥2.5 mm in II/III/aVF, vertical P axis) + RAD or S1S2S3 + poor R progression with S waves persisting to V5–V6; the classic RVH voltage criteria are insensitive here; a normal ECG does not exclude pulmonary hypertension',
            'Bajo voltaje en extremidades + P pulmonale (≥2,5 mm en II/III/aVF, eje de la P vertical) + eje derecho o S1S2S3 + mala progresión de la R con ondas S que persisten hasta V5-V6; los criterios clásicos de voltaje de HVD son aquí poco sensibles; un ECG normal no excluye la hipertensión pulmonar',
          ),
        },
        {
          label: l('右心容量负荷（ASD）', 'RV volume overload (ASD)', 'Sobrecarga de volumen del VD (CIA)'),
          value: l(
            'V1 呈 rsR′/rSR′（不完全性右束支阻滞图形）+ 电轴右偏，II/III/aVF 的 R 上可有 crochetage 切迹，常伴一度房室传导阻滞；原发孔型 ASD 则 rsR′ 伴电轴左偏',
            'rsR′/rSR′ in V1 (incomplete RBBB pattern) + rightward axis, often a crochetage notch on R in II/III/aVF and first-degree AV block; in primum ASD the rsR′ comes with LEFT axis deviation',
            'rsR′/rSR′ en V1 (patrón de bloqueo de rama derecha incompleto) + eje derecho, a menudo muesca en crochetage sobre la R en II/III/aVF y bloqueo AV de primer grado; en la CIA tipo primum la rsR′ se acompaña de desviación IZQUIERDA del eje',
          ),
        },
      ],
      source:
        'Hancock EW et al. AHA/ACCF/HRS Part V: ECG changes associated with cardiac chamber hypertrophy. Circulation 2009;119:e251-e261; Humbert M et al. 2022 ESC/ERS Guidelines for pulmonary hypertension. Eur Heart J 2022;43:3618-3642',
    },
    {
      kind: 'worked',
      title: l('在一份图上走完这条阶梯', 'Walk the ladder on one tracing', 'Recorre la escalera en un solo trazado'),
      ecg: synth('rvh', 1243, { rate: 80 }),
      view: GRID,
      steps: [
        {
          title: l('第一步：宽度、PR、δ 波', 'Step 1: width, PR, delta', 'Paso 1: anchura, PR, delta'),
          body: l(
            'V1 的 R 波高，但 QRS 不宽（<120 ms，不是右束支阻滞的 rsR′），PR 正常，QRS 起始处没有 δ 波（不是预激）。阶梯上的前两级就此跨过。',
            'The R in V1 is tall, but the QRS is narrow (<120 ms — not the rsR′ of RBBB), the PR is normal, and there is no delta slur at the QRS onset (not pre-excitation). The first two rungs of the ladder are crossed off.',
            'La R en V1 es alta, pero el QRS es estrecho (<120 ms: no es la rsR′ del bloqueo de rama derecha), el PR es normal y no hay empastamiento delta al inicio del QRS (no es preexcitación). Los dos primeros peldaños de la escalera quedan descartados.',
          ),
          marks: [{ auto: 'qrs', lead: 'V1' }, { auto: 'pr', lead: 'II' }],
          highlightLeads: ['V1', 'II'],
        },
        {
          title: l('第二步：电轴', 'Step 2: the axis', 'Paso 2: el eje'),
          body: l(
            '看肢体导联：I 导联以 S 为主，II、III、aVF 以 R 为主，III 高于 II——电轴右偏，约 +120°，越过了成人右心室肥厚那条 ≥+110° 的线。电轴左偏会把思路带向别处；右偏才支持右心。',
            'Read the limb leads: I is dominated by its S, II, III and aVF by their R, and III exceeds II — a right axis of about +120°, past the adult RVH line of ≥+110°. A leftward axis would send you elsewhere; a rightward one points at the right ventricle.',
            'Lee las derivaciones de extremidades: la I está dominada por su S, II, III y aVF por su R, y la III supera a la II: eje derecho de unos +120°, más allá de la línea de HVD del adulto (≥+110°). Un eje izquierdo llevaría a otro sitio; un eje derecho apunta al ventrículo derecho.',
          ),
          highlightLeads: ['I', 'II', 'III', 'aVF'],
        },
        {
          title: l('第三步：量 V1 和 V5/V6', 'Step 3: measure V1 and V5/V6', 'Paso 3: medir V1 y V5/V6'),
          body: l(
            'V1：R 约 18 mm（远超 7 mm），R/S >1，几乎没有 S（<2 mm）；如果 R 前还有一个小 q（qR 型），那是特异性最高的一条。V5–V6：S 约 9–10 mm，R/S <1（V6 约 4 mm 对 9 mm）——S 一直拖到最左侧的胸导联。相加：R V1 + S V5 ≈ 18 + 10 = 28 mm，远超 10.5 mm。aVR 的 R 只有约 3 mm，这一条（≥5 mm）不成立——征象群从来不要求全部阳性。',
            'V1: the R is about 18 mm (far beyond 7 mm), R/S >1, with almost no S (<2 mm); if a small q preceded the R (a qR complex), that would be the most specific single sign. V5–V6: an S of about 9–10 mm, with R/S <1 (about 4 vs 9 mm in V6) — the S drags on to the leftmost chest lead. Add them: R V1 + S V5 ≈ 18 + 10 = 28 mm, well past 10.5 mm. The R in aVR is only about 3 mm, so that sign (≥5 mm) is absent — a constellation never asks for every sign.',
            'V1: la R mide unos 18 mm (muy por encima de 7 mm), R/S >1, casi sin S (<2 mm); si una pequeña q precediera a la R (complejo qR), sería el signo aislado más específico. V5-V6: una S de unos 9-10 mm, con R/S <1 (unos 4 frente a 9 mm en V6): la S se arrastra hasta la precordial más izquierda. Suma: R V1 + S V5 ≈ 18 + 10 = 28 mm, muy por encima de 10,5 mm. La R de aVR mide solo unos 3 mm, así que ese signo (≥5 mm) falta: un conjunto de signos nunca exige todos.',
          ),
          marks: [{ auto: 'r', lead: 'V1' }, { auto: 's', lead: 'V6' }],
          highlightLeads: ['V1', 'V6'],
        },
        {
          title: l('第四步：下结论，再读 T 波', 'Step 4: conclude, then read the T', 'Paso 4: concluir y leer la T'),
          body: l(
            '电轴右偏 + V1 高 R + S 持续到 V5–V6 + R V1 + S V5 >10.5 mm + QRS 不宽：**右心室肥厚**。最后看 V1–V3 的 T：本图只有 V1 的 T 浅倒（V1 单独倒置可以是正常的），V2 起直立——只报"右心室肥厚"；若 T 深而不对称地倒置并延及 V2–V3（± ST 压低），加一句"伴继发性ST-T改变"（下一张图）。反之，若下壁有病理性 Q 而 V1 的 T 直立，阶梯会指向后壁心梗——同一形状，两种结局。',
            'RAD + tall R in V1 + S persisting into V5–V6 + R V1 + S V5 >10.5 mm + narrow QRS: **RVH**. Finally read the T in V1–V3: here only V1 is shallowly inverted (an isolated negative T in V1 can be normal) and it is upright from V2 — report "RVH" alone; if the T is deeply and asymmetrically inverted into V2–V3 (± ST depression), add "with secondary ST–T abnormality" (next tracing). Conversely, with pathological inferior Q waves and an upright T in V1, the ladder points to posterior MI — one shape, two endings.',
            'Eje derecho + R alta en V1 + S que persiste hasta V5-V6 + R V1 + S V5 >10,5 mm + QRS estrecho: **HVD**. Por último lee la T en V1-V3: aquí solo V1 está levemente invertida (una T negativa aislada en V1 puede ser normal) y es positiva desde V2: informa solo «HVD»; si la T se invierte de forma profunda y asimétrica hasta V2-V3 (± descenso del ST), añade «con alteración secundaria del ST-T» (siguiente trazado). Al contrario, con ondas Q patológicas inferiores y T positiva en V1, la escalera apunta al infarto posterior: una misma forma, dos desenlaces.',
          ),
          marks: [{ auto: 't', lead: 'V1' }],
          highlightLeads: ['V1', 'V2', 'V3'],
        },
      ],
    },
    {
      kind: 'ecg',
      ecg: synth('rvh', 1244, { rate: 74 }, 'strain'),
      view: { layout: '3x4+1', highlightLeads: ['V1', 'V2', 'III', 'aVF'] },
      marks: [{ auto: 'r', lead: 'V1' }, { auto: 't', lead: 'V1' }, { auto: 't', lead: 'V2' }, { auto: 't', lead: 'III' }],
      caption: l(
        '同一份右心室肥厚，加上**继发性ST-T改变**：V1–V2 的 T 深而不对称地倒置（约 7–9 mm），到 V3 只剩浅浅一点（约 1 mm），III 也倒置、aVF 浅倒——都发生在 R 波占优的导联；常可伴 ST 压低，并可延伸到 V3–V4。这与左心室肥厚的继发性改变是同一个机制、相反的方向。现用报告用语是"**右心室肥厚伴继发性ST-T改变**"——"劳损（strain）"和"收缩期负荷过重"都不再使用，也不要从心电图推断压力还是容量负荷。',
        'The same RVH, now with a **secondary ST–T abnormality**: a deep, asymmetric T inversion in V1–V2 (about 7–9 mm) that fades to a trace in V3 (about 1 mm), with an inverted T in III and a shallow one in aVF — always in the leads where the R dominates; ST depression often accompanies it, and it can extend to V3–V4. The mechanism is the same as in LVH, pointing the other way. The current report wording is "**RVH with secondary ST–T abnormality**" — "strain" and "systolic overload" are out, and pressure vs volume load cannot be inferred from the ECG.',
        'La misma HVD, ahora con una **alteración secundaria del ST-T**: inversión profunda y asimétrica de la T en V1-V2 (unos 7-9 mm) que en V3 queda en un esbozo (alrededor de 1 mm), con T negativa también en III y levemente negativa en aVF; siempre en las derivaciones donde domina la R; a menudo la acompaña un descenso del ST y puede extenderse a V3-V4. El mecanismo es el mismo que en la HVI, apuntando en sentido contrario. El informe actual es «**HVD con alteración secundaria del ST-T**»; «sobrecarga» («strain») y «sobrecarga sistólica» están en desuso, y la sobrecarga de presión o de volumen no puede deducirse del ECG.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('copd-pattern', 1245, { rate: 84 }),
      view: { layout: '3x4+1', highlightLeads: ['II', 'III', 'V1', 'V6'] },
      marks: [{ auto: 'p', lead: 'II' }, { auto: 'r', lead: 'V1' }],
      caption: l(
        '71 岁男性的 COPD 图形，右心负荷的另一种写法。本图可见：**肺型 P 波**（II/III/aVF 约 3 mm，高而尖，P 电轴约 +90°，垂直）、QRS 电轴约 +95°（右偏）、I 和 aVL 的 QRS 很小、V1–V2 的 QRS 几乎贴着基线、R 波递增不良。完整的图形还可以有**肢体导联低电压**（本图 II/III/aVF 仍约 7 mm，未达到）和 S 波一直持续到 V5–V6（顺钟向转位）。R V1 只有约 0.6 mm——R V1 ≥7 mm、R V1 + S V5 >10.5 mm 这些经典标准一条也不阳性：它们在肺气肿里并不敏感。看到这组图形应想慢性肺心病并申请超声评估肺动脉压；**心电图正常也不能排除肺动脉高压**。',
        'The COPD pattern of a 71-year-old man — right-heart load written differently. On this tracing: **P pulmonale** (about 3 mm in II/III/aVF, tall and peaked, P axis about +90°, vertical), a QRS axis of about +95° (rightward), tiny QRS complexes in I and aVL, and V1–V2 complexes that barely leave the baseline, with poor R progression. The full pattern can add **low limb-lead voltage** (not reached here: II/III/aVF still measure about 7 mm) and S waves persisting into V5–V6 (clockwise rotation). The R in V1 is only about 0.6 mm, so the classic criteria — R V1 ≥7 mm, R V1 + S V5 >10.5 mm — are all negative: they are insensitive in emphysema. Read this cluster as chronic cor pulmonale and request echo for the pulmonary pressures; **a normal ECG does not exclude pulmonary hypertension** either.',
        'El patrón de EPOC de un varón de 71 años: la sobrecarga derecha escrita de otra manera. En este trazado: **P pulmonale** (unos 3 mm en II/III/aVF, alta y picuda, eje de la P de unos +90°, vertical), eje del QRS de unos +95° (derecho), QRS diminutos en I y aVL y complejos de V1-V2 que apenas se separan de la línea de base, con mala progresión de la R. El patrón completo puede añadir **bajo voltaje en extremidades** (aquí no se alcanza: II/III/aVF miden aún unos 7 mm) y ondas S que persisten hasta V5-V6 (rotación horaria). La R de V1 mide solo unos 0,6 mm, así que los criterios clásicos —R V1 ≥7 mm, R V1 + S V5 >10,5 mm— son todos negativos: son poco sensibles en el enfisema. Lee este conjunto como cor pulmonale crónico y solicita un ecocardiograma para las presiones pulmonares; **un ECG normal tampoco excluye la hipertensión pulmonar**.',
      ),
    },
    {
      kind: 'contrast',
      title: l('只有右心室，还是两个心室？', 'One ventricle, or both?', '¿Un ventrículo o los dos?'),
      view: { layout: '3x4+1', highlightLeads: ['V1', 'V3', 'V6'] },
      left: {
        ecg: synth('rvh', 1246, { rate: 68 }),
        caption: l('右心室肥厚：V1 高 R、S 持续到 V5–V6，左心室电压不高', 'RVH: tall R in V1, S persisting into V5–V6, no LV voltage', 'HVD: R alta en V1, S que persiste hasta V5-V6, sin voltaje de VI'),
        marks: [{ auto: 'r', lead: 'V1' }],
      },
      right: {
        ecg: synth('biventricular-hypertrophy', 1247, { rate: 76 }),
        caption: l(
          '双心室肥厚：LVH 电压（V3 深 S 约 25 mm，Peguero-Lo Presti 约 40 mm）叠加电轴右偏（约 +97°）与 V1 高 R（约 11 mm）；Sokolow-Lyon 却只有约 11 mm',
          'Biventricular hypertrophy: LVH voltage (a deep S of about 25 mm in V3; Peguero-Lo Presti about 40 mm) plus a right axis (about +97°) and a tall R in V1 (about 11 mm); yet Sokolow-Lyon is only about 11 mm',
          'Hipertrofia biventricular: voltaje de HVI (S profunda de unos 25 mm en V3; Peguero-Lo Presti de unos 40 mm) más eje derecho (unos +97°) y R alta en V1 (unos 11 mm); y, sin embargo, el Sokolow-Lyon solo suma unos 11 mm',
        ),
        marks: [{ auto: 'r', lead: 'V1' }, { auto: 's', lead: 'V3' }],
      },
      point: l(
        '右心室肥厚是"右侧赢"；双心室肥厚是"两边都在用力，互相抵消"——本图里左心室的力量没有写成 V5–V6 的高 R，而是写成 V3 的巨大 S（V3 的 RS 约 35 mm），右心室则把电轴拉向右、把 V1 的 R 抬起来；只看 Sokolow-Lyon 就会漏掉左侧。所以双心室肥厚常被漏诊：**满足左心室肥厚电压而电轴却右偏（>+90°）**，或 LVH 伴 V1–V2 高 R / V5–V6 深 S，就应怀疑；V2–V4 出现 R+S ≥50–60 mm 的大双向 RS（Katz-Wachtel，主要见于儿童先心病）、或左心房异常合并右心室肥厚征象，同样提示。哪一侧的电压都不再"纯粹"时，写下双心室肥厚并让超声作证。',
        'RVH is "the right side wins"; biventricular hypertrophy is "both sides pushing, cancelling each other" — here the LV force is written not as a tall R in V5–V6 but as a huge S in V3 (an RS of about 35 mm), while the RV drags the axis rightward and lifts the R in V1; read Sokolow-Lyon alone and you miss the left side. That is why BVH is so often missed: suspect it when **LVH voltage comes with a rightward axis (>+90°)**, or LVH with a tall R in V1–V2 / a deep S in V5–V6; a large biphasic RS in V2–V4 with R+S ≥50–60 mm (Katz-Wachtel, mainly children with congenital disease), or LA abnormality with RVH signs, points the same way. When neither side\'s voltage looks "pure" any more, write biventricular hypertrophy and let echo confirm.',
        'La HVD es «gana el lado derecho»; la hipertrofia biventricular es «los dos lados empujan y se anulan»: aquí la fuerza del VI no se escribe como una R alta en V5-V6, sino como una S enorme en V3 (una RS de unos 35 mm), mientras el VD arrastra el eje a la derecha y levanta la R de V1; quien mire solo el Sokolow-Lyon pierde el lado izquierdo. Por eso la HVB pasa tan desapercibida: sospecha cuando **al voltaje de HVI se suma un eje derecho (>+90°)**, o la HVI viene con R alta en V1-V2 / S profunda en V5-V6; una RS bifásica grande en V2-V4 con R+S ≥50-60 mm (Katz-Wachtel, sobre todo en cardiopatía congénita infantil) o una anomalía auricular izquierda con signos de HVD apuntan igual. Cuando el voltaje de ningún lado luce ya «puro», escribe hipertrofia biventricular y que el ecocardiograma lo confirme.',
      ),
    },
    {
      kind: 'text',
      title: l('急性与慢性，压力与容量', 'Acute vs chronic, pressure vs volume', 'Agudo frente a crónico, presión frente a volumen'),
      body: l(
        '慢性右心室肥厚只是"右心负荷"的一种写法，另外两种别混为一谈：\n- **急性右心压力负荷（肺栓塞）**：窦性心动过速最常见；新发不完全/完全性右束支阻滞、S1Q3T3、V1–V4 T 倒置（±下壁）、V1 呈 QR、电轴右移、aVR/V1 的 ST 抬高。这些改变敏感度低但**有预后意义**，而且是一过性的——不要把它们写成"右心室肥厚"（详见肺栓塞一课 o6）。\n- **慢性右心容量负荷（继发孔型 ASD）**：V1 呈 rsR′/rSR′（不完全性右束支阻滞图形）+ 电轴右偏，II/III/aVF 的 R 上常有 crochetage 切迹，伴一度房室传导阻滞；原发孔型 ASD 的 rsR′ 伴电轴**左**偏。\n记住方向：压力负荷慢慢来 → 肥厚；容量负荷慢慢来 → rsR′；压力负荷突然来 → 肺栓塞的那组征象。',
        'Chronic RVH is only one way the right heart writes its load; do not confuse it with the other two:\n- **Acute RV pressure overload (pulmonary embolism)**: sinus tachycardia is the commonest finding; then new incomplete/complete RBBB, S1Q3T3, T inversion in V1–V4 (± inferior), a QR in V1, right axis shift, ST elevation in aVR/V1. These signs have low sensitivity but **carry prognostic weight**, and they are transient — do not report them as "RVH" (see the pulmonary embolism lesson, o6).\n- **Chronic RV volume overload (secundum ASD)**: rsR′/rSR′ in V1 (incomplete RBBB pattern) + rightward axis, often a crochetage notch on R in II/III/aVF with first-degree AV block; in primum ASD the rsR′ comes with a **left**ward axis.\nRemember the directions: pressure load slowly → hypertrophy; volume load slowly → rsR′; pressure load suddenly → the PE cluster.',
        'La HVD crónica es solo una de las formas en que el corazón derecho escribe su sobrecarga; no la confundas con las otras dos:\n- **Sobrecarga aguda de presión del VD (embolia pulmonar)**: lo más frecuente es la taquicardia sinusal; después, bloqueo de rama derecha incompleto/completo de nueva aparición, S1Q3T3, inversión de la T en V1-V4 (± inferior), QR en V1, desviación derecha del eje y elevación del ST en aVR/V1. Tienen baja sensibilidad pero **pesan en el pronóstico** y son transitorias: no las informes como «HVD» (véase la lección de embolia pulmonar, o6).\n- **Sobrecarga crónica de volumen del VD (CIA tipo ostium secundum)**: rsR′/rSR′ en V1 (patrón de bloqueo de rama derecha incompleto) + eje derecho, a menudo muesca en crochetage sobre la R en II/III/aVF con bloqueo AV de primer grado; en la CIA primum la rsR′ viene con desviación **izquierda** del eje.\nRecuerda las direcciones: sobrecarga de presión lenta → hipertrofia; de volumen lenta → rsR′; de presión brusca → el conjunto de la embolia pulmonar.',
      ),
    },
    { kind: 'check', item: { family: 'chambers', seed: 7 } },
    { kind: 'check', item: { family: 'chambers', seed: 8 } },
    { kind: 'drill', families: ['chambers'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [2417, 2493, 10279],
      caption: l(
        '三份标注为右心室肥厚的真实心电图：78 岁女性、57 岁男性、39 岁男性。每份都先走一遍 V1 主导 R 波的阶梯（宽度、PR 与 δ 波、下壁 Q 波、电轴），再量 V1 与 V5–V6 的数值，先想好你的报告，然后揭晓。阶梯的第一级在这里真的会拦人：其中两份同时有右束支阻滞（一份完全性、一份不完全性），电压标准要打折扣。',
        'Three real tracings labelled RVH: a 78-year-old woman, a 57-year-old man and a 39-year-old man. On each, walk the dominant-R-in-V1 ladder first (width, PR and delta, inferior Q waves, axis), then measure V1 and V5–V6, commit to a report, and only then reveal. The first rung really bites here: two of them also carry right bundle branch block (one complete, one incomplete), which discounts the voltage criteria.',
        'Tres trazados reales etiquetados como HVD: una mujer de 78 años, un varón de 57 y un varón de 39. En cada uno, recorre primero la escalera de la R dominante en V1 (anchura, PR y delta, ondas Q inferiores, eje), mide después V1 y V5-V6, decide tu informe y solo entonces mira la solución. El primer peldaño aquí sí frena: dos de ellos tienen además bloqueo de rama derecha (uno completo y otro incompleto), lo que resta valor a los criterios de voltaje.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          'V1 的 R 波一高就写"右心室肥厚"：先走阶梯——右束支阻滞看宽度，WPW 看 δ 波和 PR，后壁心梗看下壁 Q 波和 V1 直立的 T，右位心看 I 导联，儿童本来右心占优势。',
          'Writing "RVH" the moment the R in V1 looks tall: run the ladder first — width for RBBB, delta and PR for WPW, inferior Q waves and an upright T in V1 for posterior MI, lead I for dextrocardia, and remember RV dominance is normal in children.',
          'Escribir «HVD» en cuanto la R de V1 parece alta: recorre primero la escalera; la anchura del QRS por el bloqueo de rama derecha, la delta y el PR por el WPW, las ondas Q inferiores y la T positiva en V1 por el infarto posterior, la derivación I por la dextrocardia, y recuerda que en el niño el dominio del VD es normal.',
        ),
        l(
          '把陈旧性下壁/后壁心梗的 qR 或高 R 当成右心室肥厚：先找下壁病理性 Q 波，再看 V1 的 T——后壁心梗的 T 直立，右心室肥厚伴继发性ST-T改变的 T 倒置。',
          'Calling the qR or tall R of an old inferior/posterior infarct RVH: look for the pathological inferior Q waves first, then the T in V1 — posterior MI leaves it upright, RVH with secondary ST–T inverts it.',
          'Llamar HVD a la qR o a la R alta de un infarto inferior/posterior antiguo: busca primero las ondas Q patológicas inferiores y mira después la T en V1; en el infarto posterior queda positiva, en la HVD con ST-T secundario se invierte.',
        ),
        l(
          '在 COPD 图形里套用经典右心室肥厚电压标准并因"阴性"而放心：低电压、rS 遍布胸导联时这些标准本就不敏感；要看的是肺型 P、电轴右偏/S1S2S3、R 波递增不良这一整组，而且心电图正常不能排除肺动脉高压。',
          'Applying the classic RVH voltage criteria to the COPD pattern and being reassured by a "negative": with low voltage and rS across the chest they are insensitive by construction — read the cluster instead (P pulmonale, RAD/S1S2S3, poor R progression), and remember a normal ECG does not exclude pulmonary hypertension.',
          'Aplicar los criterios clásicos de voltaje de HVD al patrón de EPOC y tranquilizarse con un «negativo»: con bajo voltaje y rS por todo el tórax son insensibles de nacimiento; lee el conjunto (P pulmonale, eje derecho/S1S2S3, mala progresión de la R) y recuerda que un ECG normal no excluye la hipertensión pulmonar.',
        ),
        l(
          '把急性肺栓塞的 S1Q3T3、新发右束支阻滞或 V1–V4 T 倒置写成"右心室肥厚"：那是急性右心负荷，常为一过性、有预后意义，是另一个诊断（见 o6）。',
          'Reporting the S1Q3T3, new RBBB or V1–V4 T inversion of acute pulmonary embolism as "RVH": that is acute RV load — often transient, prognostically meaningful, and a different diagnosis (see o6).',
          'Informar el S1Q3T3, el bloqueo de rama derecha nuevo o la inversión de la T en V1-V4 de la embolia pulmonar aguda como «HVD»: eso es sobrecarga derecha aguda, a menudo transitoria y con peso pronóstico, y es otro diagnóstico (véase o6).',
        ),
        l(
          '把 V1 的 rsR′（不完全性右束支阻滞/ASD 容量负荷图形）直接叫右心室肥厚：容量负荷的写法是 rsR′ 加电轴右偏（常伴 crochetage 与一度房室传导阻滞），与压力负荷的高 R/qR 不同。',
          'Calling an rsR′ in V1 (incomplete RBBB / the ASD volume-load pattern) straight "RVH": volume load writes rsR′ with a rightward axis (often crochetage and first-degree AV block) — a different script from the tall R or qR of pressure load.',
          'Llamar directamente «HVD» a la rsR′ en V1 (bloqueo de rama derecha incompleto / patrón de sobrecarga de volumen por CIA): la sobrecarga de volumen se escribe como rsR′ con eje derecho (a menudo crochetage y bloqueo AV de primer grado), un guion distinto de la R alta o la qR de la sobrecarga de presión.',
        ),
        l(
          '满足了左心室肥厚电压就收工：LVH 电压 + 电轴右偏（>+90°）或 V1–V2 高 R 提示**双心室肥厚**——两个心室互相抵消，恰好最容易漏。',
          'Stopping once the LVH voltage criteria are met: LVH voltage + RAD (>+90°) or a tall R in V1–V2 suggests **biventricular hypertrophy** — the two ventricles cancel each other, which is exactly why it is missed.',
          'Dar por terminada la lectura al cumplir el voltaje de HVI: voltaje de HVI + eje derecho (>+90°) o R alta en V1-V2 sugiere **hipertrofia biventricular**; los dos ventrículos se anulan entre sí y por eso mismo es la que más se pasa por alto.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          'V1 主导 R 波先走阶梯：右束支阻滞（宽度）、WPW（δ 波、短 PR）、后壁心梗（下壁 Q、V1 直立 T）、肥厚型心肌病、右位心/电极错位、儿童——排除后才轮到右心室肥厚。',
          'For a dominant R in V1, run the ladder first: RBBB (width), WPW (delta, short PR), posterior MI (inferior Q, upright T in V1), HCM, dextrocardia / lead error, children — only then RVH.',
          'Ante una R dominante en V1, recorre primero la escalera: bloqueo de rama derecha (anchura), WPW (delta, PR corto), infarto posterior (Q inferiores, T positiva en V1), miocardiopatía hipertrófica, dextrocardia / error de electrodos, niños; solo después, HVD.',
        ),
        l(
          '右心室肥厚是一组征象：电轴右偏 ≥+110°、R V1 ≥7 mm、R/S V1 >1、S V5/V6 ≥7 mm 且 R/S ≤1、R V1 + S V5/V6 >10.5 mm、R 峰时间 V1 ≥35 ms、R aVR ≥5 mm；qR 型 V1 特异性最高。',
          'RVH is a constellation: RAD ≥+110°, R V1 ≥7 mm, R/S V1 >1, S V5/V6 ≥7 mm with R/S ≤1, R V1 + S V5/V6 >10.5 mm, R-peak time V1 ≥35 ms, R aVR ≥5 mm; a qR in V1 is the most specific.',
          'La HVD es un conjunto de signos: eje derecho ≥+110°, R V1 ≥7 mm, R/S V1 >1, S V5/V6 ≥7 mm con R/S ≤1, R V1 + S V5/V6 >10,5 mm, tiempo hasta la cúspide de la R en V1 ≥35 ms, R aVR ≥5 mm; la qR en V1 es la más específica.',
        ),
        l(
          '继发性ST-T改变：V1–V3（可到 V4 和下壁）T 不对称倒置 ± ST 压低，出现在高 R 波的导联；报告写"右心室肥厚伴继发性ST-T改变"。',
          'Secondary ST–T abnormality: asymmetric T inversion ± ST depression in V1–V3 (to V4 and inferior), in the leads with the tall R; report "RVH with secondary ST–T abnormality".',
          'Alteración secundaria del ST-T: inversión asimétrica de la T ± descenso del ST en V1-V3 (hasta V4 e inferior), en las derivaciones con R alta; se informa «HVD con alteración secundaria del ST-T».',
        ),
        l(
          'COPD 图形：低肢体电压 + 肺型 P + 电轴右偏/S1S2S3 + R 波递增不良、S 持续到 V5–V6；经典右心室肥厚标准在此不敏感，心电图正常不能排除肺动脉高压。',
          'COPD pattern: low limb voltage + P pulmonale + RAD/S1S2S3 + poor R progression with S to V5–V6; the classic RVH criteria are insensitive here, and a normal ECG does not exclude pulmonary hypertension.',
          'Patrón de EPOC: bajo voltaje en extremidades + P pulmonale + eje derecho/S1S2S3 + mala progresión de la R con S hasta V5-V6; los criterios clásicos de HVD son aquí poco sensibles y un ECG normal no excluye la hipertensión pulmonar.',
        ),
        l(
          '别忘了另外两种右心负荷：LVH 电压 + 电轴右偏（>+90°）= 双心室肥厚；rsR′ V1 + 电轴右偏 = 容量负荷（ASD）；S1Q3T3、新发右束支阻滞、V1–V4 T 倒置 = 急性肺栓塞（见 o6）。',
          'Do not forget the other two right-heart loads: LVH voltage + RAD (>+90°) = biventricular hypertrophy; rsR′ in V1 + rightward axis = volume load (ASD); S1Q3T3, new RBBB, T inversion V1–V4 = acute pulmonary embolism (see o6).',
          'No olvides las otras dos sobrecargas del corazón derecho: voltaje de HVI + eje derecho (>+90°) = hipertrofia biventricular; rsR′ en V1 + eje derecho = sobrecarga de volumen (CIA); S1Q3T3, bloqueo de rama derecha nuevo e inversión de la T en V1-V4 = embolia pulmonar aguda (véase o6).',
        ),
      ],
    },
  ],
  sources: [
    'Hancock EW et al. AHA/ACCF/HRS Part V: ECG changes associated with cardiac chamber hypertrophy. Circulation 2009;119:e251-e261',
    'Humbert M et al. 2022 ESC/ERS Guidelines for pulmonary hypertension. Eur Heart J 2022;43:3618-3642',
    'Castellano et al. 2004',
  ],
};

export default lesson;
