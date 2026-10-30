/**
 * Multi-select findings families: the correct set is every option present in the truth; distractors come from the same
 * categories as the present findings (so they are plausible), never from findings the truth contains.
 */
import { FINDINGS, FINDING_LIST, type FindingCategory, type FindingId } from '../../../core/findings';
import type { L10n } from '../../../core/l10n';
import type { Item } from '../../api';
import { hallmark } from '../hallmarks';
import { fname, join, L, list, tpl } from '../text';
import { base, drawSynth, focusPool, specPool, someVariant, type GenCtx } from './common';
import { revealFor } from './choice';

/** Findings never offered as options (the report fields cover them, or they are purely descriptive). */
export const NOT_OFFERED: readonly FindingId[] = ['sinus-rhythm', 'axis-normal', 'secondary-st-t', 'normal-ecg'];

export interface MultiCfg {
  /** categories the options are drawn from */
  readonly categories: readonly FindingCategory[];
  readonly prompt: L10n;
  readonly nOptions?: number;
}

export function universeOf(categories: readonly FindingCategory[]): FindingId[] {
  return FINDING_LIST.filter((d) => categories.includes(d.cat) && !NOT_OFFERED.includes(d.id)).map((d) => d.id);
}

export function makeFindingsMulti(cfg: MultiCfg) {
  return async (ctx: GenCtx): Promise<Item> => {
    const universe = universeOf(cfg.categories);
    const pool = focusPool(ctx, specPool(ctx.spec).filter((s) => s.findings.some((f) => universe.includes(f))));
    const d = await drawSynth(ctx, pool, {
      variant: someVariant(0.4),
      accept: (x) => x.truth.findings.some((f) => universe.includes(f)),
    });
    const present = d.truth.findings.filter((f) => universe.includes(f));
    const correct = d.rng.shuffle(present).slice(0, 4);
    const n = Math.max(cfg.nOptions ?? 7, correct.length + 2);
    const cats = new Set(correct.map((f) => FINDINGS[f].cat));
    const near = d.rng.shuffle(universe.filter((f) => !d.truth.findings.includes(f) && cats.has(FINDINGS[f].cat)));
    const far = d.rng.shuffle(universe.filter((f) => !d.truth.findings.includes(f) && !cats.has(FINDINGS[f].cat)));
    const distract = [...near, ...far].slice(0, n - correct.length);
    const order = new Map(FINDING_LIST.map((f, i) => [f.id, i] as const));
    const options = [...correct, ...distract].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
    const explanation = join([
      tpl(L('本图的表现：{x}。', 'Present on this tracing: {x}.', 'Presentes en este trazado: {x}.'), { x: list(correct.map(fname)) }),
      ...correct.slice(0, 3).map((f) => {
        const h = hallmark(f);
        return h ? tpl(L('{f}：{h}', '{f}: {h}', '{f}: {h}'), { f: fname(f), h }) : null;
      }),
    ]);
    const reveal = correct.flatMap((f) => revealFor(d, f));
    return {
      ...base(ctx, {
        prompt: cfg.prompt,
        explanation,
        ecg: d.source,
        findings: correct,
        reveal,
        hint: L('按固定顺序读图：心率→节律→PR→QRS→QT→电轴→P/QRS/ST/T形态。', 'Read in the fixed order: rate → rhythm → PR → QRS → QT → axis → P, QRS, ST and T morphology.', 'Lee en el orden fijo: frecuencia → ritmo → PR → QRS → QT → eje → morfología de P, QRS, ST y T.'),
      }),
      kind: 'findings',
      key: { options, correct },
    };
  };
}
