/**
 * Reference values for the tools page (adult normal values, QTc by sex, ST-elevation thresholds by sex and age, brief
 * paediatric notes). Current values from docs/curriculum/criteria.md (rows pr-normal, qrs-duration-normal, qtc-bazett,
 * qt-max-table, qrs-axis-adult, p-wave-normal, extra-chest-leads, st-t-u-normal, t-juvenile-variant, paed-*) and the
 * UDMI thresholds in critic.json. Content text, inline L10n. Pure data — tested in tests/tools.
 */
import { l, type L10n } from '../core/l10n';

export interface NormalRow {
  readonly id: string;
  readonly item: L10n;
  readonly normal: L10n;
  readonly abnormal: L10n;
  /** short citation */
  readonly source: string;
}

export const ADULT_NORMALS: readonly NormalRow[] = [
  {
    id: 'rate',
    item: l('心率', 'Heart rate', 'Frecuencia cardiaca'),
    normal: l('60–100次/分（指南50–100次/分）', '60–100 bpm (guideline 50–100 bpm)', '60–100 lpm (guía: 50–100 lpm)'),
    abnormal: l('<60（<50有临床意义）心动过缓；>100心动过速', '< 60 bradycardia (< 50 clinically significant); > 100 tachycardia', '< 60 bradicardia (< 50 clínicamente significativa); > 100 taquicardia'),
    source: 'Kusumoto 2018',
  },
  {
    id: 'p',
    item: l('P波', 'P wave', 'Onda P'),
    normal: l('时限<120 ms；Ⅱ导联<2.5 mm；电轴0°至+75°；V1正向部分<1.5 mm', 'Duration < 120 ms; < 2.5 mm in II; axis 0° to +75°; positive part in V1 < 1.5 mm', 'Duración < 120 ms; < 2,5 mm en II; eje de 0° a +75°; parte positiva en V1 < 1,5 mm'),
    abnormal: l('≥120 ms：左心房异常或房间阻滞；Ⅱ>2.5 mm：右心房异常；V1终末负向≥1 mm×40 ms：左心房异常', '≥ 120 ms: left atrial abnormality or interatrial block; > 2.5 mm in II: right atrial abnormality; V1 terminal negativity ≥ 1 mm × 40 ms: left atrial abnormality', '≥ 120 ms: anomalía auricular izquierda o bloqueo interauricular; > 2,5 mm en II: anomalía auricular derecha; negatividad terminal en V1 ≥ 1 mm × 40 ms: anomalía auricular izquierda'),
    source: 'Hancock 2009; Bayés de Luna 2012',
  },
  {
    id: 'pr',
    item: l('PR间期', 'PR interval', 'Intervalo PR'),
    normal: l('120–200 ms', '120–200 ms', '120–200 ms'),
    abnormal: l('<120 ms：短PR（找δ波）；>200 ms：一度房室阻滞（训练有素的运动员可达399 ms）', '< 120 ms: short PR (look for a delta wave); > 200 ms: first-degree AV block (up to 399 ms accepted in trained athletes)', '< 120 ms: PR corto (busca onda delta); > 200 ms: bloqueo AV de primer grado (hasta 399 ms aceptado en deportistas entrenados)'),
    source: 'Kusumoto 2018; Sharma 2017',
  },
  {
    id: 'qrs',
    item: l('QRS时限', 'QRS duration', 'Duración del QRS'),
    normal: l('<110 ms（多为80–100 ms）', '< 110 ms (usually 80–100 ms)', '< 110 ms (habitualmente 80–100 ms)'),
    abnormal: l('110–119 ms：不完全性阻滞或室内传导延迟；≥120 ms：完全性束支阻滞或宽QRS', '110–119 ms: incomplete block or IVCD; ≥ 120 ms: complete bundle branch block or wide QRS', '110–119 ms: bloqueo incompleto o trastorno de conducción intraventricular; ≥ 120 ms: bloqueo completo de rama o QRS ancho'),
    source: 'Surawicz 2009',
  },
  {
    id: 'axis',
    item: l('额面QRS电轴', 'Frontal QRS axis', 'Eje frontal del QRS'),
    normal: l('−30°至+90°', '−30° to +90°', '−30° a +90°'),
    abnormal: l('左偏：< −30°；右偏：> +90°；极度偏移：−90°至±180°', 'Left deviation: < −30°; right deviation: > +90°; extreme: −90° to ±180°', 'Desviación izquierda: < −30°; derecha: > +90°; extrema: −90° a ±180°'),
    source: 'Surawicz 2009',
  },
  {
    id: 'qtc',
    item: l('QTc', 'QTc', 'QTc'),
    normal: l('男性<450 ms，女性<460 ms，且>390 ms（用Fridericia或Framingham）', 'Men < 450 ms, women < 460 ms, and > 390 ms (use Fridericia or Framingham)', 'Varones < 450 ms, mujeres < 460 ms, y > 390 ms (usa Fridericia o Framingham)'),
    abnormal: l('见下方按性别的QTc表', 'See the QTc-by-sex table below', 'Consulta la tabla de QTc por sexo más abajo'),
    source: 'Rautaharju 2009',
  },
  {
    id: 'q',
    item: l('Q波', 'Q waves', 'Ondas Q'),
    normal: l('间隔小q波：<30 ms且<R波的25%（Ⅰ、aVL、aVF、V4–V6）；V1呈QS可正常', 'Septal q: < 30 ms and < 25 % of R (I, aVL, aVF, V4–V6); QS in V1 can be normal', 'q septal: < 30 ms y < 25 % de la R (I, aVL, aVF, V4–V6); QS en V1 puede ser normal'),
    abnormal: l('V2–V3任何Q>20 ms或QS；其他导联Q≥30 ms且≥1 mm，见于≥2个相邻导联', 'Any Q > 20 ms or QS in V2–V3; elsewhere Q ≥ 30 ms and ≥ 1 mm in ≥ 2 contiguous leads', 'Cualquier Q > 20 ms o QS en V2–V3; en otras, Q ≥ 30 ms y ≥ 1 mm en ≥ 2 derivaciones contiguas'),
    source: 'UDMI 2018',
  },
  {
    id: 'r-progression',
    item: l('R波递增', 'R-wave progression', 'Progresión de la onda R'),
    normal: l('V1–V2呈rS，移行区V3–V4，V3导联R>3 mm', 'rS in V1–V2, transition at V3–V4, R in V3 > 3 mm', 'rS en V1–V2, transición en V3–V4, R en V3 > 3 mm'),
    abnormal: l('V3导联R≤3 mm且移行延迟：R波递增不良', 'R in V3 ≤ 3 mm with a late transition: poor R-wave progression', 'R en V3 ≤ 3 mm con transición tardía: mala progresión de la R'),
    source: 'Mason 2007; MacKenzie 2005',
  },
  {
    id: 'rpt',
    item: l('R峰时间', 'R-wave peak time', 'Tiempo de pico de la onda R'),
    normal: l('V1<35 ms；V5–V6<45 ms', 'V1 < 35 ms; V5–V6 < 45 ms', 'V1 < 35 ms; V5–V6 < 45 ms'),
    abnormal: l('V5–V6≥50 ms支持左心室肥厚；V1≥35 ms支持右心室肥厚', '≥ 50 ms in V5–V6 supports LVH; ≥ 35 ms in V1 supports RVH', '≥ 50 ms en V5–V6 apoya HVI; ≥ 35 ms en V1 apoya HVD'),
    source: 'Surawicz 2009; Hancock 2009',
  },
  {
    id: 'voltage',
    item: l('QRS电压', 'QRS voltage', 'Voltaje del QRS'),
    normal: l('所有肢体导联≥5 mm或胸导联≥10 mm；Sokolow–Lyon≤35 mm', 'Limb leads ≥ 5 mm or chest leads ≥ 10 mm somewhere; Sokolow–Lyon ≤ 35 mm', 'Alguna derivación de miembros ≥ 5 mm o precordial ≥ 10 mm; Sokolow-Lyon ≤ 35 mm'),
    abnormal: l('低电压：所有肢体导联<5 mm和/或所有胸导联<10 mm；左心室肥厚：Sokolow–Lyon>35 mm，Cornell男>28 mm、女>20 mm', 'Low voltage: all limb leads < 5 mm and/or all chest leads < 10 mm; LVH: Sokolow–Lyon > 35 mm, Cornell > 28 mm men, > 20 mm women', 'Bajo voltaje: todas las de miembros < 5 mm y/o todas las precordiales < 10 mm; HVI: Sokolow-Lyon > 35 mm, Cornell > 28 mm varones, > 20 mm mujeres'),
    source: 'Hancock 2009; Mason 2007; ESC 2024',
  },
  {
    id: 'st',
    item: l('ST段', 'ST segment', 'Segmento ST'),
    normal: l('J点在PR段水平；V2–V3可有按性别和年龄的轻度抬高（见下表）', 'J point level with the PR segment; mild sex- and age-dependent elevation in V2–V3 is normal (table below)', 'Punto J al nivel del PR; en V2–V3 es normal una elevación leve según sexo y edad (tabla inferior)'),
    abnormal: l('新出现水平或下斜型压低≥0.5 mm（≥2个相邻导联）；抬高见下表', 'New horizontal or downsloping depression ≥ 0.5 mm in ≥ 2 contiguous leads; elevation: table below', 'Descenso nuevo horizontal o descendente ≥ 0,5 mm en ≥ 2 derivaciones contiguas; elevación: tabla inferior'),
    source: 'UDMI 2018; ESC ACS 2023',
  },
  {
    id: 't',
    item: l('T波', 'T wave', 'Onda T'),
    normal: l('Ⅰ、Ⅱ、V3–V6直立；aVR倒置；Ⅲ、aVL、V1（V2）可变', 'Upright in I, II and V3–V6; inverted in aVR; variable in III, aVL and V1 (V2)', 'Positiva en I, II y V3–V6; negativa en aVR; variable en III, aVL y V1 (V2)'),
    abnormal: l('R波为主的≥2个相邻导联倒置>1 mm；成人（≥16岁）V2以后倒置需评估', 'Inversion > 1 mm in ≥ 2 contiguous leads with a dominant R; in adults (≥ 16 y) inversion beyond V2 needs evaluation', 'Inversión > 1 mm en ≥ 2 derivaciones contiguas con R dominante; en adultos (≥ 16 años), la inversión más allá de V2 requiere estudio'),
    source: 'UDMI 2018; Sharma 2017',
  },
  {
    id: 'u',
    item: l('U波', 'U wave', 'Onda U'),
    normal: l('小，与T波同向，V2–V3最清楚', 'Small, same polarity as T, clearest in V2–V3', 'Pequeña, de la misma polaridad que la T, más clara en V2–V3'),
    abnormal: l('≥1 mm或≥T波（低钾、药物）；倒置U波属异常', '≥ 1 mm or ≥ T (hypokalaemia, drugs); a negative U is abnormal', '≥ 1 mm o ≥ T (hipopotasemia, fármacos); una U negativa es anormal'),
    source: 'Rautaharju 2009',
  },
];

/** QTc interpretation by sex (rows) — the same limits as the QTc calculator. */
export interface QtcRow {
  readonly level: L10n;
  readonly men: string;
  readonly women: string;
}

export const QTC_BY_SEX: readonly QtcRow[] = [
  { level: l('正常', 'Normal', 'Normal'), men: '391–449 ms', women: '391–459 ms' },
  { level: l('延长', 'Prolonged', 'Prolongado'), men: '≥ 450 ms', women: '≥ 460 ms' },
  { level: l('支持先天性长QT综合征（多次心电图）', 'Supports congenital LQTS (repeated ECGs)', 'Apoya SQTL congénito (ECG repetidos)'), men: '≥ 480 ms', women: '≥ 480 ms' },
  { level: l('尖端扭转高风险', 'High risk of torsades', 'Alto riesgo de torsade'), men: '> 500 ms', women: '> 500 ms' },
  { level: l('缩短', 'Short', 'Corto'), men: '≤ 390 ms', women: '≤ 390 ms' },
  { level: l('短QT综合征（伴支持证据）', 'Short QT syndrome (with supporting features)', 'Síndrome de QT corto (con datos de apoyo)'), men: '≤ 360 ms', women: '≤ 360 ms' },
];

export const QTC_SOURCE = 'Rautaharju 2009; Drew 2010; Zeppenfeld 2022 (ESC VA/SCD)';

/** ST-elevation thresholds at the J point (UDMI 2018 / ESC 2023), new, in ≥ 2 contiguous leads, no LVH or LBBB. */
export interface StRow {
  readonly leads: L10n;
  readonly menOld: L10n;
  readonly menYoung: L10n;
  readonly women: L10n;
}

/** A value written the same way in every language, except the Spanish decimal comma. */
const same = (s: string) => l(s, s, s.replace(/(\d)\.(\d)/g, '$1,$2'));

export const ST_THRESHOLDS: readonly StRow[] = [
  { leads: l('V2–V3', 'V2–V3', 'V2–V3'), menOld: same('≥ 2 mm'), menYoung: same('≥ 2.5 mm'), women: same('≥ 1.5 mm') },
  { leads: l('其他导联', 'All other leads', 'Resto de derivaciones'), menOld: same('≥ 1 mm'), menYoung: same('≥ 1 mm'), women: same('≥ 1 mm') },
  { leads: l('V7–V9（后壁）', 'V7–V9 (posterior)', 'V7–V9 (posterior)'), menOld: same('≥ 0.5 mm'), menYoung: same('≥ 1 mm'), women: same('≥ 0.5 mm') },
  {
    leads: l('V3R–V4R（右心室）', 'V3R–V4R (right ventricle)', 'V3R–V4R (ventrículo derecho)'),
    menOld: same('≥ 0.5 mm'),
    menYoung: l('≥0.5 mm（<30岁：≥1 mm）', '≥ 0.5 mm (< 30 y: ≥ 1 mm)', '≥ 0,5 mm (< 30 años: ≥ 1 mm)'),
    women: same('≥ 0.5 mm'),
  },
];

export const ST_SOURCE = 'Thygesen 2018 (UDMI); Byrne 2023 (ESC ACS)';

/** Brief paediatric notes (adult criteria do not apply). */
export const PAEDIATRIC_NOTES: readonly { readonly text: L10n; readonly source: string }[] = [
  {
    text: l(
      '心率：出生后3个月内中位数约150–160次/分，12–16岁降至约75–80次/分。',
      'Heart rate: median about 150–160 bpm in the first 3 months, falling to about 75–80 bpm at 12–16 years.',
      'Frecuencia: mediana de unos 150–160 lpm en los 3 primeros meses, que baja a unos 75–80 lpm a los 12–16 años.',
    ),
    source: 'Rijnbeek 2001',
  },
  {
    text: l(
      'PR随年龄增加；一度房室阻滞指PR超过该年龄第98百分位（婴儿早期约120–135 ms，1–5岁约150 ms，12–16岁约175–180 ms），而非>200 ms。',
      'PR lengthens with age; first-degree AV block means a PR above the age-specific 98th centile (about 120–135 ms in early infancy, 150 ms at 1–5 years, 175–180 ms at 12–16 years), not > 200 ms.',
      'El PR se alarga con la edad; el bloqueo AV de primer grado es un PR por encima del percentil 98 para la edad (unos 120–135 ms en la primera infancia, 150 ms a los 1–5 años, 175–180 ms a los 12–16 años), no > 200 ms.',
    ),
    source: 'Rijnbeek 2001',
  },
  {
    text: l(
      'QRS电轴：1周–1个月约+110°（+30°至+180°）；1–3个月+70°（+10°至+125°）；3个月–3岁+60°（+10°至+110°）；3岁以上+60°（+20°至+120°）。',
      'QRS axis: 1 week–1 month about +110° (+30° to +180°); 1–3 months +70° (+10° to +125°); 3 months–3 years +60° (+10° to +110°); over 3 years +60° (+20° to +120°).',
      'Eje del QRS: 1 semana–1 mes unos +110° (+30° a +180°); 1–3 meses +70° (+10° a +125°); 3 meses–3 años +60° (+10° a +110°); más de 3 años +60° (+20° a +120°).',
    ),
    source: 'Park 2021; Rijnbeek 2001',
  },
  {
    text: l(
      'QRS时限：<8岁>80 ms、8–16岁>90 ms即为室内传导延迟。',
      'QRS duration: intraventricular conduction delay at > 80 ms under 8 years and > 90 ms at 8–16 years.',
      'Duración del QRS: trastorno de conducción intraventricular con > 80 ms antes de los 8 años y > 90 ms entre los 8 y 16 años.',
    ),
    source: 'Surawicz 2009',
  },
  {
    text: l(
      '新生儿右心室优势（V1 R>S、电轴右偏）属正常，在数月至数年内消退；电压应查按年龄和性别的百分位表。',
      'Right ventricular dominance (R > S in V1, right axis) is normal in newborns and fades over months to years; read voltages against age- and sex-specific centiles.',
      'El predominio del ventrículo derecho (R > S en V1, eje derecho) es normal en el recién nacido y desaparece en meses o años; interpreta los voltajes con percentiles por edad y sexo.',
    ),
    source: 'Schwartz 2002; Rijnbeek 2001',
  },
  {
    text: l(
      'V1的T波出生后第1周内直立，此后倒置至青春期；第1周后V1 T波直立（R波为主时）提示右心室肥厚。V1–V3的幼年型T波倒置16岁前正常。',
      'T in V1 is upright in the first week, then inverted until adolescence; an upright T in V1 after the first week (with a dominant R) suggests RVH. Juvenile T inversion in V1–V3 is normal up to 16 years.',
      'La T en V1 es positiva la primera semana y después negativa hasta la adolescencia; una T positiva en V1 tras la primera semana (con R dominante) sugiere HVD. La inversión juvenil de la T en V1–V3 es normal hasta los 16 años.',
    ),
    source: 'Schwartz 2002; Sharma 2017',
  },
];

/** Full references for the values tab. */
export const NORMALS_SOURCES: readonly string[] = [
  'Kusumoto FM et al. 2018 ACC/AHA/HRS Guideline on Bradycardia and Cardiac Conduction Delay. Circulation 2019;140:e382–e482.',
  'Hancock EW et al. AHA/ACCF/HRS Recommendations, Part V: ECG changes associated with cardiac chamber hypertrophy. Circulation 2009;119:e251–e261.',
  'Bayés de Luna A et al. Interatrial blocks: a consensus report. J Electrocardiol 2012;45:445–451.',
  'Surawicz B et al. AHA/ACCF/HRS Recommendations, Part III: Intraventricular conduction disturbances. Circulation 2009;119:e235–e240.',
  'Rautaharju PM et al. AHA/ACCF/HRS Recommendations, Part IV: The ST segment, T and U waves, and the QT interval. Circulation 2009;119:e241–e250.',
  'Mason JW et al. AHA/ACCF/HRS Recommendations, Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325–1332.',
  'MacKenzie R. Poor R-wave progression. J Insur Med 2005;37:58–62.',
  'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction (UDMI 2018). Eur Heart J 2019;40:237–269.',
  'Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720–3826.',
  'Drew BJ et al. Prevention of torsade de pointes in hospital settings. Circulation 2010;121:1047–1060.',
  'Zeppenfeld K et al. 2022 ESC Guidelines for ventricular arrhythmias and the prevention of sudden cardiac death. Eur Heart J 2022;43:3997–4126.',
  'McEvoy JW et al. 2024 ESC Guidelines for the management of elevated blood pressure and hypertension (ESC 2024). Eur Heart J 2024;45:3912–4018.',
  'Sharma S, Drezner JA et al. International recommendations for electrocardiographic interpretation in athletes. J Am Coll Cardiol 2017;69:1057–1075.',
  'Rijnbeek PR et al. New normal limits for the paediatric electrocardiogram. Eur Heart J 2001;22:702–711.',
  "Park MK, Salamat M. Park's Pediatric Cardiology for Practitioners, 7th ed. Elsevier 2021.",
  'Schwartz PJ et al. Guidelines for the interpretation of the neonatal electrocardiogram. Eur Heart J 2002;23:1329–1344.',
];
