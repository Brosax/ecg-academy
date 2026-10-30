/**
 * Real-ECG families (PTB-XL, CC BY 4.0): the top of every difficulty ladder. Keys come from the case's 12SL reference
 * measurements (PTB-XL+) and its cardiologist labels mapped to findings (src/real); real ECGs carry no fiducials, so
 * there are no reveal marks. Tolerances are those of src/practice/api.ts. Findings the labels only allow
 * (compatibleFindings) are never used as distractors.
 */
import { FINDINGS, type FindingId } from '../../../core/findings';
import type { L10n } from '../../../core/l10n';
import type { RealCaseMeta } from '../../../real/index';
import type { Item, Option } from '../../api';
import { TOL } from '../grade';
import { hallmark } from '../hallmarks';
import { fmtDeg, fname, join, L, list, tpl } from '../text';
import { axisBoundaryDistance, axisCategory, keyFinding } from '../truth';
import { base, pickCase, realCases, type GenCtx } from './common';
import { findingOption } from './choice';
import { universeOf } from './multi';
import { modelReport, reportKeyFromCase } from './report';
import { ports } from '../ports';

const REF_NOTE = L(
  '参考值来自GE 12SL自动测量（PTB-XL+）。自动测量也需人工复核：差距较大时请重新测量。',
  'Reference: GE 12SL automated measurement (PTB-XL+). Machine values need over-reading too — if yours is far off, measure again.',
  'Referencia: medición automática GE 12SL (PTB-XL+). Los valores de la máquina también hay que revisarlos: si el tuyo se aleja mucho, vuelve a medir.',
);

const IRREGULAR: readonly FindingId[] = ['atrial-fibrillation', 'atrial-flutter', 'sinus-arrhythmia', 'mat', 'pac', 'pvc', 'ventricular-bigeminy'];

const caseSource = (c: RealCaseMeta) => ({ kind: 'real' as const, id: c.id });

export function makeRealRate() {
  return async (ctx: GenCtx): Promise<Item> => {
    const c = pickCase(ctx, realCases().filter((x) => x.ref.hrBpm !== null));
    const hr = c.ref.hrBpm as number;
    const irregular = c.findings.some((f) => IRREGULAR.includes(f));
    return {
      ...base(ctx, {
        prompt: L('真实心电图：心室率是多少（次/分）？', 'Real ECG: what is the ventricular rate (beats per minute)?', 'ECG real: ¿cuál es la frecuencia ventricular (latidos por minuto)?'),
        explanation: join([
          tpl(L('参考心率{v}次/分。', 'Reference rate {v}/min.', 'Frecuencia de referencia: {v} lpm.'), { v: Math.round(hr) }),
          irregular
            ? L('节律不规则：数10秒内的QRS个数再乘以6。', 'Irregular rhythm: count the QRS complexes in 10 s and multiply by 6.', 'Ritmo irregular: cuenta los QRS en 10 s y multiplica por 6.')
            : null,
          REF_NOTE,
        ]),
        ecg: caseSource(c),
        findings: [],
        view: { calipers: true, toolbar: true },
      }),
      kind: 'rate',
      key: { truthBpm: hr, which: 'ventricular', tolerancePct: TOL.hrPct, minTolBpm: irregular ? TOL.hrMinIrregularBpm : TOL.hrMinBpm },
    };
  };
}

type RealWhat = 'pr' | 'qrs' | 'qt';
const REAL_WHAT_NAME: Readonly<Record<RealWhat, L10n>> = {
  pr: L('PR间期', 'PR interval', 'intervalo PR'),
  qrs: L('QRS时限', 'QRS duration', 'duración del QRS'),
  qt: L('QT间期', 'QT interval', 'intervalo QT'),
};

export function makeRealMeasure() {
  return async (ctx: GenCtx): Promise<Item> => {
    const what = ctx.rng.fork('what').pick(['pr', 'qrs', 'qt'] as const);
    const ok = (c: RealCaseMeta) => {
      const af = c.findings.includes('atrial-fibrillation') || c.findings.includes('atrial-flutter');
      if (what === 'pr') return c.ref.prMs !== null && !af && !c.findings.includes('av-block-3');
      if (what === 'qrs') return c.ref.qrsMs !== null;
      return c.ref.qtMs !== null;
    };
    const c = pickCase(ctx, realCases().filter(ok));
    const truthMs = (what === 'pr' ? c.ref.prMs : what === 'qrs' ? c.ref.qrsMs : c.ref.qtMs) as number;
    return {
      ...base(ctx, {
        prompt: tpl(L('真实心电图：测量{w}（毫秒）。', 'Real ECG: measure the {w} (ms).', 'ECG real: mide el {w} (ms).'), { w: REAL_WHAT_NAME[what] }),
        explanation: join([tpl(L('参考{w}：{v} ms。', 'Reference {w}: {v} ms.', 'Referencia del {w}: {v} ms.'), { w: REAL_WHAT_NAME[what], v: Math.round(truthMs) }), REF_NOTE]),
        ecg: caseSource(c),
        findings: [],
        view: { calipers: true, toolbar: true },
      }),
      kind: 'measure',
      key: { what, truthMs, toleranceMs: what === 'qt' ? TOL.qtMs : TOL.intervalMs },
    };
  };
}

export function makeRealAxis() {
  return async (ctx: GenCtx): Promise<Item> => {
    const mode = ctx.rng.fork('mode').pick(['quadrant', 'degrees'] as const);
    const c = pickCase(
      ctx,
      realCases().filter((x) => x.ref.qrsAxisDeg !== null && (mode === 'degrees' || axisBoundaryDistance(x.ref.qrsAxisDeg) >= 10)),
    );
    const deg = c.ref.qrsAxisDeg as number;
    const cat = axisCategory(deg);
    return {
      ...base(ctx, {
        prompt:
          mode === 'quadrant'
            ? L('真实心电图：QRS电轴属于哪一类？', 'Real ECG: which category is the QRS axis?', 'ECG real: ¿en qué categoría está el eje del QRS?')
            : L('真实心电图：估计额面QRS电轴（度）。', 'Real ECG: estimate the frontal QRS axis in degrees.', 'ECG real: estima el eje frontal del QRS en grados.'),
        explanation: join([tpl(L('参考电轴{d}：{c}。', 'Reference axis {d}: {c}.', 'Eje de referencia {d}: {c}.'), { d: fmtDeg(deg), c: fname(cat) }), hallmark(cat), REF_NOTE]),
        ecg: caseSource(c),
        findings: [],
      }),
      kind: 'axis',
      key: { mode, truthDeg: deg, fullDeg: TOL.axisFullDeg, partialDeg: TOL.axisPartialDeg },
    };
  };
}

const SPOT_OPTS: readonly Option[] = [
  { id: 'normal', label: L('正常（含正常变异）', 'Normal (or a normal variant)', 'Normal (o variante de la normalidad)') },
  { id: 'abnormal', label: L('异常', 'Abnormal', 'Anormal') },
];

const serious = (f: FindingId) => FINDINGS[f].severity === 'major' || FINDINGS[f].severity === 'critical';

export function makeRealSpot() {
  return async (ctx: GenCtx): Promise<Item> => {
    const normal = ctx.rng.fork('class').next() < 0.5;
    const cases = realCases().filter((c) => (normal ? c.findings.includes('normal-ecg') : c.findings.some(serious)));
    const c = pickCase(ctx, cases);
    const key = keyFinding(c.findings);
    return {
      ...base(ctx, {
        prompt: L('真实心电图快速判断：正常还是异常？', 'Real ECG speed round: normal or abnormal?', 'ECG real, ronda rápida: ¿normal o anormal?'),
        explanation: normal
          ? L('心脏科医师判读为正常心电图。', 'The cardiologists labelled this ECG normal.', 'Los cardiólogos lo etiquetaron como ECG normal.')
          : join([tpl(L('心脏科医师标注：{x}。', 'Cardiologists’ labels: {x}.', 'Etiquetas de los cardiólogos: {x}.'), { x: list(c.findings.map(fname)) }), key ? hallmark(key) : null]),
        ecg: caseSource(c),
        findings: normal ? ['normal-ecg'] : key ? [key] : [],
      }),
      kind: 'choice',
      key: { options: SPOT_OPTS, correct: normal ? 'normal' : 'abnormal' },
    };
  };
}

/** Main rhythm labels a real case can be asked about. */
export const REAL_RHYTHMS: readonly FindingId[] = [
  'sinus-rhythm',
  'sinus-bradycardia',
  'sinus-tachycardia',
  'sinus-arrhythmia',
  'atrial-fibrillation',
  'atrial-flutter',
  'svt',
  'paced-rhythm',
];

export function makeRealRhythm() {
  return async (ctx: GenCtx): Promise<Item> => {
    const one = (c: RealCaseMeta) => c.findings.filter((f) => REAL_RHYTHMS.includes(f)).length === 1;
    const pool = realCases().filter(one);
    // balance: pick the rhythm first, then a case
    const avail = REAL_RHYTHMS.filter((r) => pool.some((c) => c.findings.includes(r)));
    const target0 = ctx.focus && avail.includes(ctx.focus) ? ctx.focus : ctx.rng.fork('rhythm').pick(avail.length ? avail : REAL_RHYTHMS);
    const c = pickCase(ctx, pool.filter((x) => x.findings.includes(target0)));
    const target = c.findings.find((f) => REAL_RHYTHMS.includes(f)) as FindingId;
    const compatible = ports().real.compatible(c.codes, c.infarctionStadium);
    const r = ctx.rng.fork('options');
    const distract = r.shuffle(REAL_RHYTHMS.filter((f) => f !== target && !c.findings.includes(f) && !compatible.includes(f))).slice(0, 3);
    return {
      ...base(ctx, {
        prompt: L('真实心电图：主要节律是什么？', 'Real ECG: what is the main rhythm?', 'ECG real: ¿cuál es el ritmo principal?'),
        explanation: join([tpl(L('心脏科医师标注的节律：{r}。', 'Rhythm labelled by the cardiologists: {r}.', 'Ritmo etiquetado por los cardiólogos: {r}.'), { r: fname(target) }), hallmark(target)]),
        ecg: caseSource(c),
        findings: [target],
      }),
      kind: 'choice',
      key: { options: r.shuffle([target, ...distract]).map(findingOption), correct: target },
    };
  };
}

export function makeRealReport() {
  return async (ctx: GenCtx): Promise<Item> => {
    const c = pickCase(ctx, realCases().filter((x) => x.ref.hrBpm !== null && x.findings.length > 0));
    const key = reportKeyFromCase(c, ports().real.compatible(c.codes, c.infarctionStadium));
    return {
      ...base(ctx, {
        prompt: L('真实心电图：写出完整的结构化报告。', 'Real ECG: write a complete structured report.', 'ECG real: redacta un informe estructurado completo.'),
        explanation: join([modelReport(key), REF_NOTE]),
        ecg: caseSource(c),
        findings: key.findings.filter((f) => FINDINGS[f].severity !== 'normal'),
        view: { calipers: true, toolbar: true },
      }),
      kind: 'report',
      key,
    };
  };
}

export function makeRealFindings() {
  return async (ctx: GenCtx): Promise<Item> => {
    const universe = universeOf(['rhythm', 'conduction', 'axis', 'chamber', 'ischemia', 'repolarization', 'other']);
    const c = pickCase(ctx, realCases().filter((x) => x.findings.some((f) => universe.includes(f) && FINDINGS[f].severity !== 'normal')));
    const compatible = ports().real.compatible(c.codes, c.infarctionStadium);
    const r = ctx.rng.fork('options');
    const correct = r.shuffle(c.findings.filter((f) => universe.includes(f))).slice(0, 4);
    const cats = new Set(correct.map((f) => FINDINGS[f].cat));
    const free = universe.filter((f) => !c.findings.includes(f) && !compatible.includes(f));
    const distract = [...r.shuffle(free.filter((f) => cats.has(FINDINGS[f].cat))), ...r.shuffle(free.filter((f) => !cats.has(FINDINGS[f].cat)))].slice(0, 7 - correct.length);
    const options = r.shuffle([...correct, ...distract]);
    return {
      ...base(ctx, {
        prompt: L('真实心电图：选出所有存在的表现。', 'Real ECG: select every finding that is present.', 'ECG real: selecciona todos los hallazgos presentes.'),
        explanation: join([
          tpl(L('心脏科医师标注：{x}。', 'Cardiologists’ labels: {x}.', 'Etiquetas de los cardiólogos: {x}.'), { x: list(c.findings.map(fname)) }),
          compatible.length ? tpl(L('与标注相容（不算错）：{x}。', 'Compatible with the labels (not marked wrong): {x}.', 'Compatibles con las etiquetas (no cuentan como error): {x}.'), { x: list(compatible.map(fname)) }) : null,
        ]),
        ecg: caseSource(c),
        findings: correct,
      }),
      kind: 'findings',
      key: { options, correct },
    };
  };
}
