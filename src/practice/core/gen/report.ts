/**
 * Structured-report items (C11) and the report keys they are graded against — from the model truth (synthetic) or
 * from a real case's labels and 12SL reference measurements (src/real; the case page's report slot uses the same key).
 */
import type { EcgTruth } from '../../../core/ecg';
import { FINDINGS, type FindingId } from '../../../core/findings';
import type { L10n } from '../../../core/l10n';
import type { RealCaseMeta } from '../../../real/index';
import type { Item, ReportKey } from '../../api';
import { fmtDeg, fname, join, L, list, tpl } from '../text';
import { AXIS_CATEGORIES, SINUS_RHYTHMS } from '../truth';
import { base, drawSynth, focusPool, specPool, someVariant, type GenCtx } from './common';

/** Findings a report may list but need not (descriptive, or graded by another field). */
export const REPORT_OPTIONAL: readonly FindingId[] = [...AXIS_CATEGORIES, ...SINUS_RHYTHMS, 'secondary-st-t', 'reciprocal-changes'];

export function reportKeyFromTruth(t: EcgTruth, opts: { readonly intervals: boolean; readonly axisAmbiguous: boolean }): ReportKey {
  const optional = new Set<FindingId>(REPORT_OPTIONAL);
  return {
    rateBpm: Math.round(t.hrBpm),
    rhythm: t.rhythm,
    regular: t.regular,
    prMs: opts.intervals && t.prMs !== null ? Math.round(t.prMs) : null,
    qrsMs: opts.intervals ? Math.round(t.qrsMs) : null,
    qtcMs: opts.intervals ? Math.round(t.qtcFridericiaMs) : null,
    axisDeg: opts.axisAmbiguous ? null : Math.round(t.axisDeg.qrs),
    findings: t.findings.filter((f) => f !== t.rhythm && !optional.has(f)),
    optional: [...optional].filter((f) => f !== t.rhythm),
  };
}

const RHYTHM_FIRST: readonly FindingId[] = [
  'atrial-fibrillation',
  'atrial-flutter',
  'paced-rhythm',
  'svt',
  'atrial-tachycardia',
  'sinus-tachycardia',
  'sinus-bradycardia',
  'sinus-arrhythmia',
  'sinus-rhythm',
];

/**
 * Report key of a real case: 12SL reference measurements (PTB-XL+) and the cardiologists' mapped labels. Regularity is
 * not labelled (null = not graded); the rhythm is the case's main rhythm label; findings the labels only allow
 * (compatibleFindings) are accepted without being required.
 */
export function reportKeyFromCase(c: RealCaseMeta, compatible: readonly FindingId[]): ReportKey {
  const rhythm = RHYTHM_FIRST.find((f) => c.findings.includes(f)) ?? c.findings.find((f) => FINDINGS[f].cat === 'rhythm' && FINDINGS[f].severity !== 'minor') ?? null;
  const af = c.findings.includes('atrial-fibrillation') || c.findings.includes('atrial-flutter');
  const optional = new Set<FindingId>([...REPORT_OPTIONAL, ...compatible]);
  return {
    rateBpm: c.ref.hrBpm,
    rhythm,
    regular: null,
    prMs: af ? null : c.ref.prMs,
    qrsMs: c.ref.qrsMs,
    qtcMs: c.ref.qtcFridericiaMs,
    axisDeg: c.ref.qrsAxisDeg,
    findings: c.findings.filter((f) => f !== rhythm && !REPORT_OPTIONAL.includes(f)),
    optional: [...optional].filter((f) => f !== rhythm),
  };
}

/** A model report in words (the explanation shown after a report item). */
export function modelReport(k: ReportKey): L10n {
  const parts: (L10n | null)[] = [
    k.rateBpm !== null ? tpl(L('心率{v}次/分', 'Rate {v}/min', 'Frecuencia {v} lpm'), { v: Math.round(k.rateBpm) }) : null,
    k.rhythm ? fname(k.rhythm) : null,
    k.regular === null ? null : k.regular ? L('节律规整', 'regular', 'regular') : L('节律不规整', 'irregular', 'irregular'),
    k.prMs !== null ? tpl(L('PR {v} ms', 'PR {v} ms', 'PR {v} ms'), { v: Math.round(k.prMs) }) : null,
    k.qrsMs !== null ? tpl(L('QRS {v} ms', 'QRS {v} ms', 'QRS {v} ms'), { v: Math.round(k.qrsMs) }) : null,
    k.qtcMs !== null ? tpl(L('QTc {v} ms（Fridericia）', 'QTc {v} ms (Fridericia)', 'QTc {v} ms (Fridericia)'), { v: Math.round(k.qtcMs) }) : null,
    k.axisDeg !== null ? tpl(L('电轴{v}', 'axis {v}', 'eje {v}'), { v: fmtDeg(k.axisDeg) }) : null,
  ];
  return join([
    join(parts, L('，', ', ', ', ')),
    k.findings.length
      ? tpl(L('表现：{x}。', 'Findings: {x}.', 'Hallazgos: {x}.'), { x: list(k.findings.map(fname)) })
      : L('无其他异常。', 'No other abnormality.', 'Sin otras alteraciones.'),
  ], L('。', '. ', '. '));
}

export function makeReportSynth() {
  return async (ctx: GenCtx): Promise<Item> => {
    const pool = focusPool(ctx, specPool(ctx.spec));
    const d = await drawSynth(ctx, pool, { variant: someVariant(0.3) });
    const key = reportKeyFromTruth(d.truth, { intervals: d.scenario.intervals !== 'not-applicable', axisAmbiguous: d.result.axisAmbiguous });
    return {
      ...base(ctx, {
        prompt: L('写出这份12导联心电图的完整结构化报告。', 'Write a complete structured report of this 12-lead ECG.', 'Redacta un informe estructurado completo de este ECG de 12 derivaciones.'),
        explanation: modelReport(key),
        ecg: d.source,
        findings: key.findings.filter((f) => FINDINGS[f].severity !== 'normal'),
        view: { calipers: true, toolbar: true },
      }),
      kind: 'report',
      key,
    };
  };
}
