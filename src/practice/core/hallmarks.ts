/**
 * The discriminating ECG feature of each finding, in one sentence (zh / en / es). Choice, findings, occlusion and
 * compare feedback use it to explain the specific error: "you chose X — X would show …; this tracing shows …".
 *
 * Criteria follow docs/curriculum/criteria.md (current values): QRS < 110 ms normal, 110–119 incomplete block / IVCD,
 * ≥ 120 complete BBB (AHA/ACCF/HRS 2009 Part III); QTc ≥ 450 ms men / ≥ 460 ms women, > 500 ms high torsades risk
 * (AHA 2009 Part IV; Drew 2010); STEMI thresholds of the Fourth Universal Definition of MI (Thygesen 2018) and the
 * 2023 ESC ACS guideline; Brugada type 1 only diagnostic (2022 ESC VA/SCD); international athlete criteria (Sharma
 * 2017). Original wording; the reference book (Castellano et al. 2004) is used only for curriculum structure.
 */
import type { FindingId } from '../../core/findings';
import type { L10n } from '../../core/l10n';
import { L } from './text';

export const HALLMARKS: Readonly<Partial<Record<FindingId, L10n>>> = {
  'normal-ecg': L(
    '窦性心律60–100次/分，PR 120–200 ms，QRS <110 ms，电轴−30°～+90°，无ST-T异常。',
    'Sinus rhythm 60–100/min, PR 120–200 ms, QRS < 110 ms, axis −30° to +90°, no ST–T abnormality.',
    'Ritmo sinusal a 60–100 lpm, PR 120–200 ms, QRS < 110 ms, eje entre −30° y +90° y sin alteraciones del ST-T.',
  ),
  'sinus-rhythm': L(
    '每个QRS前有P波，P波在I、II、aVF直立，aVR倒置，PP间期规整。',
    'A P wave before every QRS, upright in I, II and aVF and inverted in aVR, with a regular PP interval.',
    'Una onda P antes de cada QRS, positiva en I, II y aVF y negativa en aVR, con PP regular.',
  ),
  'sinus-bradycardia': L('窦性P波，频率<60次/分。', 'Sinus P waves at a rate below 60/min.', 'Ondas P sinusales a menos de 60 lpm.'),
  'sinus-tachycardia': L(
    '窦性P波，频率>100次/分，P波形态与正常窦性相同。',
    'Sinus P waves at more than 100/min, same P shape as normal sinus rhythm.',
    'Ondas P sinusales a más de 100 lpm, con la misma morfología que en ritmo sinusal normal.',
  ),
  'sinus-arrhythmia': L(
    'P波形态一致，PP间期变化>120 ms（常随呼吸变化）。',
    'Constant P-wave shape with PP intervals varying by more than 120 ms (often with breathing).',
    'Onda P de morfología constante con variación del PP > 120 ms (a menudo con la respiración).',
  ),
  'sinus-pause': L(
    '突然出现无P波的长间歇，其长度不是PP间期的整数倍。',
    'A sudden pause without a P wave whose length is not a multiple of the PP interval.',
    'Pausa brusca sin onda P cuya duración no es múltiplo del intervalo PP.',
  ),
  'sa-exit-block': L(
    '长间歇约等于PP间期的整数倍，前后P波形态相同。',
    'A pause that is about an exact multiple of the PP interval, with the same P wave before and after.',
    'Pausa que es aproximadamente un múltiplo exacto del PP, con la misma onda P antes y después.',
  ),
  'sinus-node-dysfunction': L(
    '房性快速心律失常发作终止后出现长间歇，然后才恢复窦性或逸搏心律。',
    'A burst of atrial tachyarrhythmia that ends in a long pause before sinus or escape beats return.',
    'Una racha de taquiarritmia auricular que termina en una pausa larga antes de que vuelva el ritmo sinusal o de escape.',
  ),
  'ectopic-atrial-rhythm': L(
    'P波规律但电轴异常（如II、III、aVF倒置），频率<100次/分，PR ≥120 ms。',
    'Regular P waves with an abnormal axis (e.g. negative in II, III and aVF) at < 100/min, PR ≥ 120 ms.',
    'Ondas P regulares con eje anómalo (p. ej., negativas en II, III y aVF) a < 100 lpm y PR ≥ 120 ms.',
  ),
  'wandering-atrial-pacemaker': L(
    '至少三种不同形态的P波，频率<100次/分。',
    'At least three different P-wave shapes at a rate below 100/min.',
    'Al menos tres morfologías distintas de onda P con frecuencia < 100 lpm.',
  ),
  pac: L(
    '提前出现形态不同的P′波，其后QRS与窦性相同，代偿间歇不完全。',
    'An early P′ wave of a different shape, followed by a QRS like the sinus ones and a non-compensatory pause.',
    'Onda P′ prematura de morfología distinta, seguida de un QRS igual al sinusal y de una pausa no compensadora.',
  ),
  'pac-blocked': L(
    '提前的P′波（常隐藏在T波中使其变形）后无QRS，形成长间歇。',
    'An early P′ wave (often deforming the T wave) with no QRS after it, causing a pause.',
    'Onda P′ prematura (a menudo deformando la onda T) sin QRS posterior, que produce una pausa.',
  ),
  pjc: L(
    '提前出现的窄QRS，其前无P波，或在QRS前后可见逆行P′波（II、III、aVF倒置）。',
    'An early narrow QRS with no P before it, or a retrograde P′ (negative in II, III, aVF) just before or after it.',
    'QRS estrecho prematuro sin P previa, o con una P′ retrógrada (negativa en II, III y aVF) justo antes o después.',
  ),
  pvc: L(
    '提前出现宽大畸形的QRS（≥120 ms），其前无P波，T波与主波方向相反，多有完全代偿间歇。',
    'An early wide QRS (≥ 120 ms) without a preceding P wave, T opposite to the QRS, usually a full compensatory pause.',
    'QRS prematuro y ancho (≥ 120 ms) sin onda P previa, T opuesta al QRS y habitualmente pausa compensadora completa.',
  ),
  'ventricular-bigeminy': L('每一个窦性搏动后跟随一个室性期前收缩。', 'Every second beat is a premature ventricular complex.', 'Cada segundo latido es una extrasístole ventricular.'),
  'ventricular-couplet': L('连续出现两个室性期前收缩。', 'Two premature ventricular complexes in a row.', 'Dos extrasístoles ventriculares consecutivas.'),
  'junctional-escape-rhythm': L(
    '规则的窄QRS心律，40–60次/分，QRS前无P波，或有PR很短的逆行P′波。',
    'A regular narrow-QRS rhythm at 40–60/min with no P before the QRS, or a retrograde P′ with a very short PR.',
    'Ritmo regular de QRS estrecho a 40–60 lpm sin P previa, o con P′ retrógrada y PR muy corto.',
  ),
  'accelerated-junctional-rhythm': L(
    '规则的窄QRS心律，61–100次/分，P′波逆行或与QRS无关。',
    'A regular narrow-QRS rhythm at 61–100/min with retrograde or dissociated P waves.',
    'Ritmo regular de QRS estrecho a 61–100 lpm con P retrógradas o disociadas.',
  ),
  'ventricular-escape-rhythm': L(
    '规则的宽QRS心律，20–40次/分；完全性房室阻滞时P波按自身节律出现。',
    'A regular wide-QRS rhythm at 20–40/min; in complete AV block the P waves march through at their own rate.',
    'Ritmo regular de QRS ancho a 20–40 lpm; en el bloqueo AV completo las ondas P siguen su propio ritmo.',
  ),
  aivr: L(
    '规则的宽QRS心律，60–110次/分（快于逸搏、慢于室速），常见融合波。',
    'A regular wide-QRS rhythm at 60–110/min (faster than escape, slower than VT), often with fusion beats.',
    'Ritmo regular de QRS ancho a 60–110 lpm (más rápido que el escape y más lento que la TV), a menudo con latidos de fusión.',
  ),
  'atrial-tachycardia': L(
    'P′波规律出现，150–250次/分，P′波之间有等电位线，形态不同于窦性P波。',
    'Regular P′ waves at 150–250/min with an isoelectric baseline between them and a shape unlike the sinus P.',
    'Ondas P′ regulares a 150–250 lpm con línea isoeléctrica entre ellas y morfología distinta de la sinusal.',
  ),
  mat: L(
    '心率>100次/分，节律不齐，至少三种形态的P波，PR间期不等。',
    'An irregular rhythm above 100/min with at least three P-wave shapes and varying PR intervals.',
    'Ritmo irregular por encima de 100 lpm con al menos tres morfologías de P y PR variable.',
  ),
  'atrial-fibrillation': L(
    'RR间期绝对不规则，无P波，代之以大小不等的f波。',
    'Irregularly irregular RR intervals with no P waves, only fine or coarse fibrillatory waves.',
    'RR irregularmente irregular sin ondas P, solo ondas f finas o gruesas.',
  ),
  'atrial-flutter': L(
    '锯齿状F波，约250–350次/分（典型者在II、III、aVF为负向），常呈2:1下传。',
    'Sawtooth F waves at about 250–350/min (negative in II, III, aVF in typical flutter), often with 2:1 conduction.',
    'Ondas F en dientes de sierra a unos 250–350 lpm (negativas en II, III y aVF en el flutter típico), a menudo con conducción 2:1.',
  ),
  svt: L(
    '规则的窄QRS心动过速，P波不可见或为逆行P′波。',
    'A regular narrow-QRS tachycardia with hidden or retrograde P waves.',
    'Taquicardia regular de QRS estrecho con ondas P ocultas o retrógradas.',
  ),
  avnrt: L(
    '规则窄QRS心动过速（常为140–220次/分）。典型（慢-快型）：P′波隐藏在QRS中或紧贴其终末（V1假性r′、II/III/aVF假性S波），RP′ <90 ms；非典型（快-慢型）：长RP′，II/III/aVF的P′波倒置。',
    'A regular narrow tachycardia (usually 140–220/min). Typical (slow–fast): the P′ is hidden in the QRS or at its end (pseudo-r′ in V1, pseudo-S in II, III, aVF), RP′ < 90 ms; atypical (fast–slow): a long RP′ with P′ negative in II, III, aVF.',
    'Taquicardia regular de QRS estrecho (habitualmente 140–220 lpm). Típica (lenta-rápida): P′ oculta en el QRS o al final de este (pseudo-r′ en V1, pseudo-S en II, III y aVF), RP′ < 90 ms; atípica (rápida-lenta): RP′ largo con P′ negativa en II, III y aVF.',
  ),
  avrt: L(
    '规则窄QRS心动过速，逆行P′波位于ST段或T波上（RP′ ≥90 ms且短于P′R）。',
    'A regular narrow tachycardia with a retrograde P′ on the ST segment or T wave (RP′ ≥ 90 ms and shorter than P′R).',
    'Taquicardia regular de QRS estrecho con P′ retrógrada sobre el segmento ST o la onda T (RP′ ≥ 90 ms y menor que P′R).',
  ),
  'vt-monomorphic': L(
    '规则的宽QRS心动过速（QRS ≥140 ms），形态一致；房室分离、夺获或融合波可确诊室速。',
    'A regular wide-complex tachycardia (QRS ≥ 140 ms) with uniform complexes; AV dissociation, capture or fusion beats prove VT.',
    'Taquicardia regular de QRS ancho (≥ 140 ms) con complejos uniformes; la disociación AV y los latidos de captura o fusión confirman la TV.',
  ),
  'vt-polymorphic': L(
    '宽QRS心动过速，QRS形态逐搏变化，发作前QT间期正常。',
    'A wide-complex tachycardia whose QRS shape changes from beat to beat, with a normal QT before it.',
    'Taquicardia de QRS ancho cuya morfología cambia latido a latido, con QT previo normal.',
  ),
  torsades: L(
    '多形性室速，QRS主波围绕基线扭转、振幅周期性增减，发生于QT延长的基础上。',
    'Polymorphic VT twisting around the baseline with waxing and waning amplitude, on a background of a long QT.',
    'TV polimorfa que gira alrededor de la línea de base con amplitud creciente y decreciente, sobre un QT largo.',
  ),
  'ventricular-flutter': L(
    '正弦波样心动过速，250–350次/分，QRS与T波无法区分。',
    'A sine-wave tachycardia at 250–350/min in which QRS and T cannot be told apart.',
    'Taquicardia sinusoidal a 250–350 lpm en la que no se distinguen el QRS y la T.',
  ),
  'ventricular-fibrillation': L(
    '杂乱无章的颤动波，无法辨认QRS波群——没有有效心排出量。',
    'Chaotic, irregular deflections with no identifiable QRS complexes — there is no cardiac output.',
    'Deflexiones caóticas e irregulares sin complejos QRS identificables: no hay gasto cardiaco.',
  ),
  asystole: L(
    '几乎平直的线，无QRS波群；须在两个导联确认，并检查增益和导联连接。',
    'A (near) flat line without QRS complexes; confirm in two leads and check gain and cables.',
    'Línea (casi) plana sin complejos QRS; confírmalo en dos derivaciones y revisa la ganancia y los cables.',
  ),
  'paced-rhythm': L(
    '起搏钉样信号后紧跟起搏的P波或宽QRS，频率等于设定频率。',
    'Pacing spikes each followed by a paced P wave or a wide QRS at the programmed rate.',
    'Espigas de marcapasos seguidas de una onda P o un QRS ancho estimulados a la frecuencia programada.',
  ),
  'av-block-1': L('每个P波均下传，PR间期恒定且>200 ms。', 'Every P wave is conducted with a constant PR above 200 ms.', 'Todas las P conducen con un PR constante > 200 ms.'),
  'av-block-2-mobitz1': L(
    'PR间期逐搏延长，直至一个P波后QRS脱漏；脱漏后的第一个PR最短。',
    'The PR lengthens beat by beat until a P wave is not conducted; the PR after the pause is the shortest.',
    'El PR se alarga latido a latido hasta que una P no conduce; el PR tras la pausa es el más corto.',
  ),
  'av-block-2-mobitz2': L(
    'P波突然不能下传，脱漏前后PR间期恒定；QRS常增宽（希氏束以下病变）。',
    'A P wave suddenly fails to conduct with a constant PR before and after; the QRS is often wide (infra-His disease).',
    'Una P deja de conducir de repente con PR constante antes y después; el QRS suele ser ancho (enfermedad infrahisiana).',
  ),
  'av-block-2-2to1': L(
    '每隔一个P波不能下传，因此无法根据PR变化区分Ⅰ型与Ⅱ型；心房率是心室率的2倍。',
    'Every second P wave is not conducted, so Mobitz I and II cannot be told apart by the PR; atrial rate = twice the ventricular rate.',
    'Una de cada dos P no conduce, así que no se distingue Mobitz I de II por el PR; la frecuencia auricular es el doble de la ventricular.',
  ),
  'av-block-high-grade': L(
    '连续两个或以上P波不能下传，下传的搏动PR间期恒定。',
    'Two or more consecutive P waves are not conducted; the conducted beats keep a constant PR.',
    'Dos o más ondas P consecutivas no conducen; los latidos conducidos mantienen un PR constante.',
  ),
  'av-block-3': L(
    'P波与QRS各自规律但互不相关（PR间期随机变化），心房率快于逸搏心率。',
    'P waves and QRS complexes are each regular but unrelated (the PR varies at random); the atrial rate is faster than the escape rate.',
    'Las ondas P y los QRS son regulares pero independientes (el PR varía al azar); la frecuencia auricular supera la de escape.',
  ),
  'av-dissociation': L(
    '心房和心室各自独立激动，心室率等于或快于心房率。',
    'Atria and ventricles beat independently, with a ventricular rate equal to or faster than the atrial rate.',
    'Aurículas y ventrículos laten de forma independiente, con frecuencia ventricular igual o mayor que la auricular.',
  ),
  rbbb: L(
    'QRS ≥120 ms，V1呈rsR′型（R′>r），I、V6导联S波宽钝。',
    'QRS ≥ 120 ms, rsR′ in V1 with R′ taller than r, and a wide slurred S in I and V6.',
    'QRS ≥ 120 ms, rsR′ en V1 con R′ mayor que r y S ancha y empastada en I y V6.',
  ),
  irbbb: L('V1呈rsr′型，QRS 110–119 ms。', 'An rsr′ pattern in V1 with a QRS of 110–119 ms.', 'Patrón rsr′ en V1 con QRS de 110–119 ms.'),
  lbbb: L(
    'QRS ≥120 ms，I、aVL、V5、V6的R波宽大有切迹且无间隔q波，V1–V3呈QS或rS型，ST-T与主波方向相反。',
    'QRS ≥ 120 ms, broad notched R in I, aVL, V5, V6 without septal q, QS or rS in V1–V3, and discordant ST–T.',
    'QRS ≥ 120 ms, R ancha y mellada en I, aVL, V5 y V6 sin q septal, QS o rS en V1–V3 y ST-T discordante.',
  ),
  ilbbb: L(
    'QRS 110–119 ms，I、V5、V6无间隔q波，R峰时间延迟。',
    'QRS 110–119 ms with no septal q in I, V5, V6 and a delayed R-peak time.',
    'QRS de 110–119 ms sin q septal en I, V5 y V6 y con tiempo de pico de R retrasado.',
  ),
  lafb: L(
    '电轴−45°～−90°，aVL呈qR型，II、III、aVF呈rS型，QRS <120 ms。',
    'Axis −45° to −90°, qR in aVL, rS in II, III and aVF, QRS < 120 ms.',
    'Eje entre −45° y −90°, qR en aVL, rS en II, III y aVF y QRS < 120 ms.',
  ),
  lpfb: L(
    '电轴+90°～+180°，I、aVL呈rS型，III、aVF呈qR型，QRS <120 ms（需排除右心室肥厚和侧壁梗死）。',
    'Axis +90° to +180°, rS in I and aVL, qR in III and aVF, QRS < 120 ms (after excluding RVH and lateral MI).',
    'Eje entre +90° y +180°, rS en I y aVL, qR en III y aVF y QRS < 120 ms (tras descartar HVD e infarto lateral).',
  ),
  'bifascicular-block': L(
    '右束支阻滞合并左前（或左后）分支阻滞：RBBB图形伴明显电轴左偏（或右偏）。',
    'RBBB plus left anterior (or posterior) fascicular block: an RBBB pattern with marked left (or right) axis deviation.',
    'BRD con bloqueo fascicular anterior (o posterior) izquierdo: patrón de BRD con desviación marcada del eje a la izquierda (o derecha).',
  ),
  'trifascicular-block': L(
    '双分支阻滞合并一度房室阻滞（PR >200 ms）。',
    'Bifascicular block together with a prolonged PR (> 200 ms).',
    'Bloqueo bifascicular con PR prolongado (> 200 ms).',
  ),
  ivcd: L('QRS ≥110 ms，但不符合左、右束支阻滞标准。', 'QRS ≥ 110 ms without the criteria of RBBB or LBBB.', 'QRS ≥ 110 ms sin criterios de BRD ni de BRI.'),
  'aberrant-conduction': L(
    '室上性搏动以束支阻滞形态下传，典型地出现在长-短周期之后。',
    'A supraventricular beat conducted with a bundle-branch-block shape, typically after a long–short cycle.',
    'Latido supraventricular conducido con morfología de bloqueo de rama, típicamente tras un ciclo largo-corto.',
  ),
  wpw: L(
    'PR <120 ms，QRS起始部顿挫（δ波），QRS增宽，继发性ST-T改变。',
    'Short PR (< 120 ms), a slurred QRS upstroke (delta wave), a wide QRS and secondary ST–T changes.',
    'PR corto (< 120 ms), empastamiento inicial del QRS (onda delta), QRS ancho y alteraciones secundarias del ST-T.',
  ),
  'short-pr': L('PR <120 ms，但QRS起始陡直（无δ波）。', 'PR < 120 ms with a normal, sharp QRS onset (no delta wave).', 'PR < 120 ms con inicio del QRS normal y nítido (sin onda delta).'),
  'axis-normal': L('QRS电轴在−30°～+90°之间。', 'QRS axis between −30° and +90°.', 'Eje del QRS entre −30° y +90°.'),
  lad: L('QRS电轴在−30°～−90°之间（I正向，II以负向为主）。', 'QRS axis between −30° and −90° (I positive, II mainly negative).', 'Eje del QRS entre −30° y −90° (I positiva, II predominantemente negativa).'),
  rad: L('QRS电轴在+90°～+180°之间（I负向，aVF正向）。', 'QRS axis between +90° and +180° (I negative, aVF positive).', 'Eje del QRS entre +90° y +180° (I negativa, aVF positiva).'),
  'extreme-axis': L('QRS电轴在−90°～±180°之间：I和aVF均以负向为主。', 'QRS axis between −90° and ±180°: both I and aVF mainly negative.', 'Eje del QRS entre −90° y ±180°: I y aVF predominantemente negativas.'),
  lae: L(
    'II导联P波≥120 ms，常有切迹（两峰间距≥40 ms）；V1导联P波终末负向部分≥1 mm深、≥40 ms宽（PTF ≥0.04 mm·s）。',
    'P ≥ 120 ms in II, often notched (peaks ≥ 40 ms apart); a terminal negative P in V1 at least 1 mm deep and 40 ms wide (P-terminal force ≥ 0.04 mm·s).',
    'P ≥ 120 ms en II, a menudo mellada (picos separados ≥ 40 ms); componente negativo terminal de la P en V1 de al menos 1 mm de profundidad y 40 ms de anchura (fuerza terminal ≥ 0,04 mm·s).',
  ),
  rae: L('II导联P波振幅≥0.25 mV（2.5 mm），V1初始P波高尖。', 'P amplitude ≥ 0.25 mV (2.5 mm) in II and a tall initial P in V1.', 'Onda P ≥ 0,25 mV (2,5 mm) en II y P inicial alta en V1.'),
  'biatrial-abnormality': L('同时具有左、右心房异常的特征。', 'Features of both left and right atrial abnormality.', 'Rasgos de anomalía auricular izquierda y derecha a la vez.'),
  'interatrial-block': L(
    'P波≥120 ms；高度房间阻滞时II、III、aVF的P波呈正负双向。',
    'P ≥ 120 ms; in advanced block the P is biphasic (+/−) in II, III and aVF.',
    'P ≥ 120 ms; en el bloqueo avanzado la P es bifásica (+/−) en II, III y aVF.',
  ),
  lvh: L(
    '符合电压标准，如Sokolow-Lyon（SV1+RV5/V6 >35 mm，即>3.5 mV）或Cornell（RaVL+SV3 男>28 mm、女>20 mm）。',
    'QRS voltage criteria, e.g. Sokolow–Lyon (SV1 + RV5/V6 > 35 mm, i.e. > 3.5 mV) or Cornell (RaVL + SV3 > 28 mm men, > 20 mm women).',
    'Criterios de voltaje, p. ej., Sokolow-Lyon (SV1 + RV5/V6 > 35 mm, es decir, > 3,5 mV) o Cornell (RaVL + SV3 > 28 mm en varones, > 20 mm en mujeres).',
  ),
  'lvh-strain': L(
    '左心室肥厚电压标准，加上I、aVL、V5、V6的下斜型ST段压低和不对称T波倒置。',
    'LVH voltage plus downsloping ST depression and asymmetric T inversion in I, aVL, V5 and V6.',
    'Voltaje de HVI con descenso del ST descendente e inversión asimétrica de la T en I, aVL, V5 y V6.',
  ),
  rvh: L('V1导联R/S >1，电轴右偏，V5–V6 S波深。', 'R/S > 1 in V1, right axis deviation and deep S waves in V5–V6.', 'R/S > 1 en V1, desviación del eje a la derecha y S profundas en V5–V6.'),
  'biventricular-hypertrophy': L(
    '左心室肥厚电压伴电轴右偏或V1高R波。',
    'LVH voltage together with right axis deviation or a tall R in V1.',
    'Voltaje de HVI junto con desviación del eje a la derecha o R alta en V1.',
  ),
  'low-voltage': L(
    '所有肢体导联QRS <5 mm和/或所有胸导联QRS <10 mm。',
    'All limb-lead QRS amplitudes < 5 mm and/or all chest-lead QRS < 10 mm.',
    'Todos los QRS de las derivaciones de los miembros < 5 mm y/o todos los precordiales < 10 mm.',
  ),
  'electrical-alternans': L(
    'QRS振幅逐搏交替变化，常伴心动过速和低电压（心包积液）。',
    'QRS amplitude alternating from beat to beat, often with tachycardia and low voltage (pericardial effusion).',
    'Amplitud del QRS que alterna latido a latido, a menudo con taquicardia y bajo voltaje (derrame pericárdico).',
  ),
  'poor-r-progression': L('V3导联R波≤3 mm，V1→V3 R波不递增。', 'R in V3 ≤ 3 mm with no growth of R from V1 to V3.', 'R en V3 ≤ 3 mm sin crecimiento de la R de V1 a V3.'),
  'stemi-anterior': L(
    'V1–V4导联ST段抬高（V2–V3：男≥40岁≥2 mm、<40岁≥2.5 mm，女≥1.5 mm），提示前降支闭塞。',
    'ST elevation in V1–V4 (V2–V3: ≥ 2 mm in men ≥ 40 y, ≥ 2.5 mm < 40 y, ≥ 1.5 mm in women) — LAD occlusion.',
    'Elevación del ST en V1–V4 (V2–V3: ≥ 2 mm en varones ≥ 40 años, ≥ 2,5 mm < 40 años, ≥ 1,5 mm en mujeres): oclusión de la DA.',
  ),
  'stemi-anteroseptal': L('ST段抬高局限于V1–V3。', 'ST elevation confined to V1–V3.', 'Elevación del ST limitada a V1–V3.'),
  'stemi-anterolateral': L('V3–V6及I、aVL导联ST段抬高。', 'ST elevation in V3–V6 plus I and aVL.', 'Elevación del ST en V3–V6 y en I y aVL.'),
  'stemi-inferior': L(
    'II、III、aVF导联ST段抬高≥1 mm，aVL对应性压低；III >II且I导联ST段压低提示右冠状动脉，II ≥III且I导联无压低提示回旋支。',
    'ST elevation ≥ 1 mm in II, III and aVF with reciprocal depression in aVL; III > II with ST depression in I suggests the RCA, II ≥ III with no ST depression in I suggests the circumflex.',
    'Elevación del ST ≥ 1 mm en II, III y aVF con descenso recíproco en aVL; III > II con descenso del ST en I sugiere la CD, y II ≥ III sin descenso en I sugiere la circunfleja.',
  ),
  'stemi-lateral': L('I、aVL、V5、V6导联ST段抬高（回旋支）。', 'ST elevation in I, aVL, V5 and V6 (circumflex).', 'Elevación del ST en I, aVL, V5 y V6 (circunfleja).'),
  'stemi-high-lateral': L(
    'I和aVL导联ST段抬高，III、aVF对应性压低。',
    'ST elevation in I and aVL with reciprocal depression in III and aVF.',
    'Elevación del ST en I y aVL con descenso recíproco en III y aVF.',
  ),
  'stemi-posterior': L(
    'V1–V3导联水平型ST段压低最明显，其后T波直立（后壁的镜像；演变期出现高R波）；V7–V9 ST段抬高≥0.5 mm可确认。',
    'Horizontal ST depression maximal in V1–V3 ending in an upright T (the posterior mirror image; a tall R follows as it evolves); ST elevation ≥ 0.5 mm in V7–V9 confirms it.',
    'Descenso horizontal del ST máximo en V1–V3 seguido de una T positiva (la imagen especular posterior; con la evolución aparece una R alta); una elevación del ST ≥ 0,5 mm en V7–V9 lo confirma.',
  ),
  'rv-infarction': L(
    '下壁心肌梗死伴V4R导联ST段抬高≥1 mm（V1抬高而V2不明显）。',
    'Inferior STEMI with ST elevation ≥ 1 mm in V4R (and in V1 more than in V2).',
    'IAMCEST inferior con elevación del ST ≥ 1 mm en V4R (y en V1 más que en V2).',
  ),
  'de-winter': L(
    'V1–V6 J点上斜型ST段压低，延续为高大对称的T波，aVR轻度抬高——等同于前降支闭塞。',
    'Upsloping J-point ST depression in V1–V6 running into tall symmetric T waves, slight ST elevation in aVR — an LAD occlusion equivalent.',
    'Descenso ascendente del ST en el punto J en V1–V6 que continúa en ondas T altas y simétricas, con ligera elevación en aVR: equivalente de oclusión de la DA.',
  ),
  wellens: L(
    '胸痛缓解后V2–V3出现正负双向（A型）或深而对称（B型）的T波倒置，无Q波、ST改变轻微——前降支近段重度狭窄。',
    'Biphasic (type A) or deep symmetric (type B) T inversion in V2–V3 after pain has settled, no Q waves, little ST change — critical proximal LAD stenosis.',
    'Inversión bifásica (tipo A) o profunda y simétrica (tipo B) de la T en V2–V3 tras ceder el dolor, sin Q y con poco cambio del ST: estenosis crítica de la DA proximal.',
  ),
  'avr-elevation-diffuse-std': L(
    'aVR导联ST段抬高伴≥6个导联ST段压低：弥漫性心内膜下缺血（左主干或多支病变等）。',
    'ST elevation in aVR with ST depression in ≥ 6 leads: diffuse subendocardial ischaemia (left main or multivessel disease, among other causes).',
    'Elevación del ST en aVR con descenso del ST en ≥ 6 derivaciones: isquemia subendocárdica difusa (tronco o multivaso, entre otras causas).',
  ),
  'hyperacute-t': L(
    '某一冠状动脉区域的T波宽基、高大、对称，与QRS不成比例——闭塞的早期表现。',
    'Broad-based, tall, symmetric T waves out of proportion to the QRS in one coronary territory — an early sign of occlusion.',
    'Ondas T de base ancha, altas y simétricas, desproporcionadas respecto al QRS en un territorio coronario: signo precoz de oclusión.',
  ),
  'st-depression-ischemic': L(
    '≥2个相邻导联水平型或下斜型ST段压低≥0.5 mm。',
    'Horizontal or downsloping ST depression ≥ 0.5 mm in ≥ 2 contiguous leads.',
    'Descenso horizontal o descendente del ST ≥ 0,5 mm en ≥ 2 derivaciones contiguas.',
  ),
  't-inversion-ischemic': L(
    '≥2个以R波为主的相邻导联对称性T波倒置≥1 mm。',
    'Symmetric T inversion ≥ 1 mm in ≥ 2 contiguous leads with a dominant R wave.',
    'Inversión simétrica de la T ≥ 1 mm en ≥ 2 derivaciones contiguas con R dominante.',
  ),
  'reciprocal-changes': L('与ST段抬高导联相对的导联出现ST段压低。', 'ST depression in the leads facing away from the ST elevation.', 'Descenso del ST en las derivaciones opuestas a la elevación.'),
  'pathological-q': L(
    '≥2个相邻导联Q波≥30 ms且≥1 mm（V2–V3任何≥20 ms的Q波）。',
    'Q ≥ 30 ms and ≥ 1 mm deep in 2 contiguous leads (any Q ≥ 20 ms in V2–V3).',
    'Q ≥ 30 ms y ≥ 1 mm de profundidad en 2 derivaciones contiguas (cualquier Q ≥ 20 ms en V2–V3).',
  ),
  'old-mi-anterior': L('V1–V4出现Q波或QS波，ST段已基本回到基线。', 'Q or QS waves in V1–V4 with the ST back near the baseline.', 'Ondas Q o QS en V1–V4 con el ST casi en la línea de base.'),
  'old-mi-inferior': L('II、III、aVF导联病理性Q波，ST段基本回到基线。', 'Pathological Q waves in II, III and aVF with the ST near the baseline.', 'Ondas Q patológicas en II, III y aVF con el ST cerca de la línea de base.'),
  'old-mi-lateral': L('I、aVL、V5、V6导联病理性Q波。', 'Pathological Q waves in I, aVL, V5 and V6.', 'Ondas Q patológicas en I, aVL, V5 y V6.'),
  'lv-aneurysm': L(
    '心肌梗死数周后V1–V4仍有QS波伴持续ST段抬高，T波相对较小。',
    'QS waves with persistent ST elevation and relatively small T waves in V1–V4 weeks after an MI.',
    'Ondas QS con elevación persistente del ST y ondas T relativamente pequeñas en V1–V4 semanas después de un infarto.',
  ),
  'sgarbossa-positive': L(
    '左束支阻滞或起搏时：同向性ST段抬高≥1 mm、V1–V3同向性ST段压低≥1 mm，或过度的反向ST段抬高（ST/S ≤−0.25，Smith标准）。',
    'With LBBB or pacing: concordant ST elevation ≥ 1 mm, concordant ST depression ≥ 1 mm in V1–V3, or excessively discordant ST elevation (ST/S ≤ −0.25, Smith).',
    'Con BRI o marcapasos: elevación concordante del ST ≥ 1 mm, descenso concordante ≥ 1 mm en V1–V3 o elevación discordante excesiva (ST/S ≤ −0,25, Smith).',
  ),
  'nonspecific-st-t': L('T波低平或轻度倒置、ST段轻微改变，不符合特定标准。', 'Flat or slightly inverted T waves or minor ST change that meet no specific criterion.', 'Ondas T aplanadas o ligeramente negativas o cambios menores del ST sin criterios específicos.'),
  'secondary-st-t': L(
    '由于除极异常（束支阻滞、预激、起搏、室早），ST-T方向与QRS主波相反。',
    'ST–T opposite to the main QRS deflection because depolarization is abnormal (BBB, pre-excitation, pacing, PVC).',
    'ST-T opuesto a la deflexión principal del QRS porque la despolarización es anómala (bloqueo de rama, preexcitación, marcapasos, extrasístole).',
  ),
  'early-repolarization': L(
    'QRS <120 ms，≥2个相邻下壁和/或侧壁导联（不含V1–V3）R波降支末端出现J点切迹或顿挫，峰值≥0.1 mV；不要求ST段抬高，除aVR外无对应性压低。',
    'QRS < 120 ms with a J-point notch or slur on the R-wave downslope peaking ≥ 0.1 mV in ≥ 2 contiguous inferior and/or lateral leads (V1–V3 excluded); ST elevation is not required, and there is no reciprocal depression except in aVR.',
    'QRS < 120 ms con muesca o empastamiento del punto J en la rama descendente de la R, con pico ≥ 0,1 mV, en ≥ 2 derivaciones contiguas inferiores y/o laterales (sin contar V1–V3); no se requiere elevación del ST y no hay descenso recíproco salvo en aVR.',
  ),
  'long-qt': L(
    'QTc 男≥450 ms、女≥460 ms；>500 ms时尖端扭转型室速风险高。',
    'QTc ≥ 450 ms in men or ≥ 460 ms in women; above 500 ms the risk of torsades is high.',
    'QTc ≥ 450 ms en varones o ≥ 460 ms en mujeres; por encima de 500 ms el riesgo de torsade de pointes es alto.',
  ),
  'short-qt': L(
    'QTc ≤360 ms，T波高尖（按AHA标准QTc ≤390 ms即为缩短）。',
    'QTc ≤ 360 ms with tall peaked T waves (≤ 390 ms already counts as short by the AHA standard).',
    'QTc ≤ 360 ms con ondas T altas y picudas (≤ 390 ms ya se considera corto según la AHA).',
  ),
  'peaked-t': L('T波高、窄、对称，呈"帐篷状"。', 'Tall, narrow, symmetric "tented" T waves.', 'Ondas T altas, estrechas y simétricas, «en tienda de campaña».'),
  'u-waves': L('T波之后的正向小波，V2–V3最清楚；≥1 mm或高于T波时为明显U波。', 'A positive wave after the T, clearest in V2–V3; prominent when ≥ 1 mm or taller than the T.', 'Onda positiva tras la T, más clara en V2–V3; prominente si ≥ 1 mm o mayor que la T.'),
  'osborn-waves': L('J点处的正向驼峰（J波），V3–V6最大，体温越低越明显。', 'A positive hump at the J point (J wave), largest in V3–V6, growing as body temperature falls.', 'Joroba positiva en el punto J (onda J), mayor en V3–V6, que crece al bajar la temperatura.'),
  'digoxin-effect': L('ST段呈"鱼钩样"（下垂型）压低，T波低平，QT缩短。', 'Scooped ("reverse tick") ST depression, flat T waves and a short QT.', 'Descenso del ST «en cubeta», ondas T aplanadas y QT corto.'),
  'cerebral-t': L('巨大、宽阔的T波倒置伴QT明显延长（如颅内出血后）。', 'Giant, wide T-wave inversion with a very long QT (e.g. after intracranial haemorrhage).', 'Inversión gigante y ancha de la onda T con QT muy largo (p. ej., tras una hemorragia intracraneal).'),
  hyperkalemia: L(
    'T波高尖窄；继而P波低平、PR延长、QRS增宽，最终呈正弦波。',
    'Peaked narrow T waves; then flat P waves, a longer PR and a wider QRS; finally a sine wave.',
    'Ondas T picudas y estrechas; después P aplanadas, PR más largo y QRS más ancho; al final, onda sinusoidal.',
  ),
  hypokalemia: L('T波低平，U波明显（U>T），ST段压低，QU间期延长。', 'Flat T waves, prominent U waves (U > T), ST depression and an apparently long QT (QU).', 'Ondas T aplanadas, ondas U prominentes (U > T), descenso del ST y QT aparentemente largo (QU).'),
  hypercalcemia: L('QT缩短，ST段很短或消失。', 'A short QT with a very short or absent ST segment.', 'QT corto con segmento ST muy corto o ausente.'),
  hypocalcemia: L('ST段平直延长导致QT延长，T波形态正常。', 'A long QT caused by a long, flat ST segment, with a normal T wave.', 'QT largo por un segmento ST largo y plano, con onda T normal.'),
  hypothermia: L('Osborn J波、心动过缓、QT延长，常有寒战伪差。', 'Osborn J waves, bradycardia, a long QT and often shivering artefact.', 'Ondas J de Osborn, bradicardia, QT largo y a menudo artefacto por tiritona.'),
  pericarditis: L(
    '广泛凹面向上ST段抬高伴PR段压低（aVR PR段抬高），除aVR、V1外无对应性ST段压低。',
    'Diffuse concave ST elevation with PR depression (PR elevation in aVR) and no reciprocal ST depression except in aVR and V1.',
    'Elevación difusa y cóncava del ST con descenso del PR (PR elevado en aVR) y sin descenso recíproco salvo en aVR y V1.',
  ),
  'pericardial-effusion': L('低电压、窦性心动过速，可伴电交替。', 'Low voltage and sinus tachycardia, with or without electrical alternans.', 'Bajo voltaje y taquicardia sinusal, con o sin alternancia eléctrica.'),
  'pulmonary-embolism': L(
    '窦性心动过速，V1–V4和III导联T波倒置，S1Q3T3，电轴右移或右束支阻滞——均不特异。',
    'Sinus tachycardia, T inversion in V1–V4 and III, S1Q3T3, a rightward axis shift or RBBB — none of them specific.',
    'Taquicardia sinusal, T negativas en V1–V4 y III, S1Q3T3, desplazamiento del eje a la derecha o BRD; ninguno es específico.',
  ),
  'brugada-type1': L(
    'V1–V2导联穹窿型ST段抬高≥2 mm，继以倒置T波（唯一有诊断意义的类型）。',
    'Coved ST elevation ≥ 2 mm in V1–V2 descending into a negative T wave (the only diagnostic type).',
    'Elevación del ST ≥ 2 mm en V1–V2 de tipo «en cúpula» que desciende hacia una T negativa (el único tipo diagnóstico).',
  ),
  'brugada-type2': L(
    'V1–V2马鞍型ST段抬高，T波直立或双向；本身不能诊断，应在高一至两个肋间记录V1–V2。',
    'Saddleback ST elevation in V1–V2 with an upright or biphasic T; not diagnostic on its own — record V1–V2 one or two spaces higher.',
    'Elevación del ST «en silla de montar» en V1–V2 con T positiva o bifásica; no es diagnóstica por sí sola: registra V1–V2 uno o dos espacios más arriba.',
  ),
  hcm: L('左心室肥厚电压伴侧壁或下壁导联深而窄的"匕首样"Q波。', 'LVH voltage with deep, narrow "dagger" Q waves in the lateral or inferior leads.', 'Voltaje de HVI con ondas Q profundas y estrechas «en daga» en derivaciones laterales o inferiores.'),
  'apical-hcm': L('V3–V5导联巨大倒置T波（≥10 mm）伴高R波。', 'Giant negative T waves (≥ 10 mm) in V3–V5 with tall R waves.', 'Ondas T negativas gigantes (≥ 10 mm) en V3–V5 con R altas.'),
  arvc: L(
    '无右束支阻滞时V1–V3 T波倒置，V1–V3 QRS后可见ε波，终末激动时间延长。',
    'T inversion in V1–V3 without RBBB, an epsilon wave after the QRS in V1–V3 and a prolonged terminal activation.',
    'T negativas en V1–V3 sin BRD, onda épsilon tras el QRS en V1–V3 y activación terminal prolongada.',
  ),
  'epsilon-wave': L('V1–V3导联紧随QRS之后的低振幅小波。', 'A small low-amplitude deflection right after the QRS in V1–V3.', 'Pequeña deflexión de baja amplitud justo después del QRS en V1–V3.'),
  takotsubo: L(
    '前壁ST段抬高而无对应性压低（aVR除外），之后出现弥漫深倒T波和QT延长——仅凭心电图无法与STEMI区分。',
    'Anterior ST elevation without reciprocal change (except aVR), later deep diffuse T inversion with a long QT — the ECG alone cannot tell it from a STEMI.',
    'Elevación anterior del ST sin cambios recíprocos (salvo aVR) y después T negativas profundas y difusas con QT largo; el ECG por sí solo no lo distingue de un IAMCEST.',
  ),
  'na-channel-blockade': L(
    'QRS增宽，aVR终末R波≥3 mm，终末电轴右偏，常伴窦性心动过速。',
    'A wide QRS, a terminal R in aVR ≥ 3 mm, a rightward terminal axis and usually sinus tachycardia.',
    'QRS ancho, R terminal en aVR ≥ 3 mm, eje terminal desviado a la derecha y habitualmente taquicardia sinusal.',
  ),
  dextrocardia: L(
    'I导联P、QRS、T均倒置，aVR直立，且胸导联R波从V1到V6逐渐变小。',
    'Negative P, QRS and T in I, upright aVR, and R waves that get smaller from V1 to V6.',
    'P, QRS y T negativas en I, aVR positiva y ondas R que disminuyen de V1 a V6.',
  ),
  'athlete-changes': L(
    '窦性心动过缓、单纯电压增高、不完全性右束支阻滞、早期复极——不伴T波倒置或ST段压低。',
    'Sinus bradycardia, isolated voltage criteria, incomplete RBBB, early repolarization — without T inversion or ST depression.',
    'Bradicardia sinusal, criterios de voltaje aislados, BRD incompleto y repolarización precoz, sin T negativas ni descenso del ST.',
  ),
  'juvenile-t': L('V1–V3 T波倒置，V4起T波直立，ST段在等电位线。', 'T inversion in V1–V3 with upright T from V4 on and an isoelectric ST.', 'T negativas en V1–V3 con T positivas desde V4 y ST isoeléctrico.'),
  'copd-pattern': L('肢体导联低电压、电轴右偏、II导联P波高尖、R波递增不良。', 'Low limb-lead voltage, right axis, a tall P in II and poor R-wave progression.', 'Bajo voltaje en los miembros, eje derecho, P alta en II y mala progresión de la R.'),
  'pacing-failure-capture': L('起搏信号后没有跟随P波或QRS波。', 'Pacing spikes not followed by a P wave or QRS complex.', 'Espigas de marcapasos no seguidas de onda P ni de QRS.'),
  'pacing-undersensing': L('起搏信号落在自身QRS或T波内（起搏器没有感知到自身心搏）。', 'Pacing spikes inside native QRS or T waves (the pacemaker did not see the native beats).', 'Espigas dentro de QRS u ondas T propias (el marcapasos no detectó los latidos propios).'),
  'pacing-oversensing': L('出现长于下限频率间期的停搏且无起搏信号（起搏器被噪声抑制）。', 'Pauses longer than the lower-rate interval without spikes (the pacemaker was inhibited by noise).', 'Pausas más largas que el intervalo de frecuencia mínima sin espigas (el marcapasos fue inhibido por ruido).'),
  'electrode-reversal-la-ra': L(
    'I导联P、QRS、T均倒置，aVR直立，但胸导联正常（与右位心不同）。',
    'P, QRS and T negative in I with an upright aVR, but normal chest leads (unlike dextrocardia).',
    'P, QRS y T negativas en I con aVR positiva, pero precordiales normales (a diferencia de la dextrocardia).',
  ),
  'electrode-reversal-la-ll': L(
    'I与II互换，III倒置，aVL与aVF互换——很隐匿，I导联P波大于II导联是线索。',
    'I and II swapped, III inverted, aVL and aVF swapped — subtle; a P wave larger in I than in II is a clue.',
    'I y II intercambiadas, III invertida y aVL y aVF intercambiadas; es sutil: una P mayor en I que en II es una pista.',
  ),
  'electrode-reversal-ra-ll': L(
    'II导联倒置，aVR与aVF互换（aVR直立、aVF倒置），下壁导联P波倒置。',
    'Lead II inverted and aVR/aVF swapped (upright aVR, negative aVF), so the inferior P waves look negative.',
    'II invertida y aVR/aVF intercambiadas (aVR positiva, aVF negativa), por lo que las P inferiores parecen negativas.',
  ),
  'precordial-misplacement': L(
    'R波递增突然跳跃或倒退（如V1/V2互换），或电极位置过高时V1–V2出现rSr′、P波倒置。',
    'R-wave progression that jumps or reverses (e.g. V1/V2 swapped), or rSr′ with a negative P in V1–V2 when placed too high.',
    'Progresión de la R que salta o retrocede (p. ej., V1/V2 intercambiadas), o rSr′ con P negativa en V1–V2 si están demasiado altas.',
  ),
  'baseline-wander': L('基线缓慢上下漂移（呼吸、体动）。', 'A slow up-and-down drift of the baseline (breathing, movement).', 'Oscilación lenta de la línea de base (respiración, movimiento).'),
  'muscle-tremor': L('快速不规则的细小干扰，只出现在使用该肢体电极的导联。', 'Fast, irregular noise only in the leads that use the trembling limb’s electrode.', 'Ruido rápido e irregular solo en las derivaciones que usan el electrodo del miembro que tiembla.'),
  'ac-interference': L('规则的50/60 Hz细小振荡使基线变粗。', 'A fine, regular 50/60 Hz oscillation that thickens the baseline.', 'Oscilación fina y regular de 50/60 Hz que engrosa la línea de base.'),
};

export function hallmark(id: FindingId): L10n | null {
  return HALLMARKS[id] ?? null;
}
