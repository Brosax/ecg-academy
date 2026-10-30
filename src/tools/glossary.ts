/**
 * The trilingual glossary (zh / en / es): every finding of the taxonomy (src/core/findings.ts) plus the glossary terms
 * of the curriculum book synthesis (docs/curriculum/book-synthesis.json), corrected to current terminology
 * (docs/curriculum/critic.json "outdated_concepts"): an outdated name is kept only as "replaces …". Book terms that
 * name a finding are merged into that finding's row. Pure data — tests check that every book term and every finding
 * is covered.
 */
import { FINDING_LIST, type FindingCategory, type FindingId } from '../core/findings';
import { l, LANGS, type L10n } from '../core/l10n';

/** One glossary term from the book synthesis, by its English wording there, and where it lives in the glossary. */
export type BookTerm =
  | { readonly book: string; readonly finding: FindingId; readonly replaces?: L10n }
  | { readonly book: string; readonly term: L10n; readonly replaces?: L10n; readonly note?: L10n };

export const BOOK_TERMS: readonly BookTerm[] = [
  { book: 'lead', term: l('导联', 'lead', 'derivación') },
  { book: 'Wilson central terminal', term: l('Wilson中心电端', 'Wilson central terminal', 'terminal central de Wilson') },
  { book: 'hexaxial reference system', term: l('额面六轴系统', 'hexaxial reference system', 'sistema hexaxial') },
  { book: 'electrical axis', term: l('心电轴', 'electrical (QRS) axis', 'eje eléctrico (del QRS)') },
  { book: 'paper speed', term: l('走纸速度', 'paper speed', 'velocidad del papel') },
  { book: 'calibration', term: l('定标电压', 'calibration', 'calibración') },
  { book: 'artefact', term: l('伪差', 'artefact', 'artefacto') },
  { book: 'sinoatrial node', term: l('窦房结', 'sinus (sinoatrial) node', 'nodo sinusal') },
  { book: 'AV node', term: l('房室结', 'AV node', 'nodo auriculoventricular') },
  { book: 'bundle of His', term: l('希氏束', 'bundle of His', 'haz de His') },
  { book: 'P wave', term: l('P波', 'P wave', 'onda P') },
  { book: 'QRS complex', term: l('QRS波群', 'QRS complex', 'complejo QRS') },
  { book: 'J point', term: l('J点', 'J point', 'punto J') },
  { book: 'ST segment', term: l('ST段', 'ST segment', 'segmento ST') },
  { book: 'PR interval', term: l('PR间期', 'PR interval', 'intervalo PR') },
  { book: 'corrected QT', term: l('校正QT间期（QTc）', 'corrected QT interval (QTc)', 'intervalo QT corregido (QTc)') },
  {
    book: 'intrinsicoid deflection',
    term: l('R峰时间', 'R-wave peak time', 'tiempo de pico de la onda R'),
    replaces: l('室壁激动时间（类本位曲折）', 'intrinsicoid deflection', 'deflexión intrinsecoide'),
  },
  { book: 'transition zone', term: l('移行区', 'transition zone', 'zona de transición') },
  { book: 'sinus rhythm', finding: 'sinus-rhythm' },
  { book: 'sinus arrhythmia', finding: 'sinus-arrhythmia' },
  { book: 'left atrial enlargement', finding: 'lae', replaces: l('左心房扩大', 'left atrial enlargement', 'crecimiento auricular izquierdo') },
  { book: 'right atrial enlargement', finding: 'rae', replaces: l('右心房扩大', 'right atrial enlargement', 'crecimiento auricular derecho') },
  { book: 'left ventricular hypertrophy', finding: 'lvh' },
  { book: 'right ventricular hypertrophy', finding: 'rvh' },
  { book: 'right bundle branch block', finding: 'rbbb' },
  { book: 'left bundle branch block', finding: 'lbbb' },
  { book: 'left anterior fascicular block', finding: 'lafb', replaces: l('左前半支阻滞', 'left anterior hemiblock', 'hemibloqueo anterior izquierdo') },
  { book: 'left posterior fascicular block', finding: 'lpfb', replaces: l('左后半支阻滞', 'left posterior hemiblock', 'hemibloqueo posterior izquierdo') },
  { book: 'AV block', term: l('房室传导阻滞', 'AV block', 'bloqueo auriculoventricular') },
  { book: 'Wenckebach phenomenon', term: l('文氏现象', 'Wenckebach phenomenon', 'fenómeno de Wenckebach') },
  { book: 'complete AV block', finding: 'av-block-3' },
  { book: 'sinus arrest', finding: 'sinus-pause' },
  { book: 'sinoatrial block', finding: 'sa-exit-block' },
  {
    book: 'sick sinus syndrome',
    finding: 'sinus-node-dysfunction',
    replaces: l('病态窦房结综合征', 'sick sinus syndrome', 'enfermedad del nodo sinusal'),
  },
  { book: 'AV dissociation', finding: 'av-dissociation' },
  { book: 'pathological Q wave', finding: 'pathological-q' },
  {
    book: 'subendocardial ischaemia',
    finding: 'st-depression-ischemic',
    replaces: l('心内膜下心肌缺血', 'subendocardial ischaemia', 'isquemia subendocárdica'),
  },
  {
    book: 'subepicardial injury',
    term: l('ST段抬高', 'ST-segment elevation', 'elevación del segmento ST'),
    replaces: l('心外膜下心肌损伤', 'subepicardial injury', 'lesión subepicárdica'),
    note: l(
      '描述ST段形态，并判断：闭塞可能、不确定（复查、加做导联）或非闭塞（说出类似表现）。',
      'Describe the ST shape and decide: occlusion likely, indeterminate (repeat, extra leads) or not occlusion (name the mimic).',
      'Describe la forma del ST y decide: oclusión probable, indeterminado (repetir, derivaciones adicionales) o no oclusión (nombra el imitador).',
    ),
  },
  { book: 'reciprocal changes', finding: 'reciprocal-changes' },
  {
    book: 'variant angina',
    term: l('血管痉挛性心绞痛', 'vasospastic angina', 'angina vasoespástica'),
    replaces: l('变异型心绞痛', 'variant (Prinzmetal) angina', 'angina de Prinzmetal'),
  },
  { book: 'exercise stress test', term: l('运动负荷试验', 'exercise stress test', 'prueba de esfuerzo') },
  { book: 'delta wave', term: l('δ波', 'delta wave', 'onda delta') },
  { book: 'accessory pathway', term: l('房室旁路', 'accessory pathway', 'vía accesoria') },
  {
    book: 'WPW syndrome',
    term: l('预激综合征（WPW综合征）', 'Wolff–Parkinson–White syndrome', 'síndrome de Wolff-Parkinson-White'),
    note: l(
      '综合征 = 心室预激 + 心动过速发作；仅有预激而无症状称为WPW图形。',
      'Syndrome = pre-excitation plus tachyarrhythmia; pre-excitation alone is the WPW pattern.',
      'Síndrome = preexcitación más taquiarritmia; la preexcitación sola es el patrón de WPW.',
    ),
  },
  { book: 'atrial premature beat', finding: 'pac' },
  { book: 'atrial flutter', finding: 'atrial-flutter' },
  { book: 'atrial fibrillation', finding: 'atrial-fibrillation' },
  { book: 'AV nodal reentrant tachycardia', finding: 'avnrt' },
  { book: 'ventricular premature beat', finding: 'pvc' },
  { book: 'ventricular tachycardia', term: l('室性心动过速', 'ventricular tachycardia', 'taquicardia ventricular') },
  { book: 'fusion beat', term: l('室性融合波', 'fusion beat', 'latido de fusión') },
  { book: 'capture beat', term: l('心室夺获', 'capture beat', 'latido de captura') },
  { book: 'accelerated idioventricular rhythm', finding: 'aivr' },
  { book: 'torsades de pointes', finding: 'torsades' },
  { book: 'ventricular fibrillation', finding: 'ventricular-fibrillation' },
  { book: 'aberrant conduction', finding: 'aberrant-conduction' },
  { book: 'atrial septal defect', term: l('房间隔缺损', 'atrial septal defect', 'comunicación interauricular') },
  { book: 'tetralogy of Fallot', term: l('法洛四联症', 'tetralogy of Fallot', 'tetralogía de Fallot') },
  { book: 'pacemaker', term: l('起搏器', 'pacemaker', 'marcapasos') },
];

export type GlossaryKind = 'finding' | 'term';

export interface GlossaryRow {
  readonly key: string;
  readonly kind: GlossaryKind;
  readonly term: L10n;
  readonly finding?: FindingId;
  readonly cat?: FindingCategory;
  /** older / outdated names this term replaces */
  readonly replaces?: L10n;
  readonly note?: L10n;
  /** the book wording(s) this row covers */
  readonly book: readonly string[];
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Build the glossary: one row per finding (with merged book terms) and one row per remaining book term. */
export function buildGlossary(): GlossaryRow[] {
  const byFinding = new Map<FindingId, { replaces?: L10n; book: string[] }>();
  const terms: GlossaryRow[] = [];
  for (const b of BOOK_TERMS) {
    if ('finding' in b) {
      const cur = byFinding.get(b.finding) ?? { book: [] };
      cur.book.push(b.book);
      if (b.replaces) cur.replaces = b.replaces;
      byFinding.set(b.finding, cur);
    } else {
      terms.push({ key: `term:${slug(b.book)}`, kind: 'term', term: b.term, book: [b.book], ...(b.replaces ? { replaces: b.replaces } : {}), ...(b.note ? { note: b.note } : {}) });
    }
  }
  const findings: GlossaryRow[] = FINDING_LIST.map((d) => {
    const extra = byFinding.get(d.id);
    return {
      key: `finding:${d.id}`,
      kind: 'finding',
      term: d.name,
      finding: d.id,
      cat: d.cat,
      book: extra?.book ?? [],
      ...(extra?.replaces ? { replaces: extra.replaces } : {}),
    };
  });
  return [...findings, ...terms];
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\-‐-―−'’"“”«»()（）,.;:，。；：]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Rows matching a query in any language (term, replaced names, note), accent- and case-insensitive. */
export function searchGlossary(rows: readonly GlossaryRow[], query: string): GlossaryRow[] {
  const q = norm(query);
  if (!q) return [...rows];
  const toks = q.split(' ');
  return rows.filter((r) => {
    const hay = norm(
      [
        ...LANGS.map((x) => r.term[x]),
        ...(r.replaces ? LANGS.map((x) => r.replaces?.[x] ?? '') : []),
        ...(r.note ? LANGS.map((x) => r.note?.[x] ?? '') : []),
        ...(r.finding ? [r.finding] : []),
      ].join(' '),
    );
    return toks.every((t) => hay.includes(t));
  });
}
