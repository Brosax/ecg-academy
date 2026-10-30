/**
 * Contrast items: two tracings side by side, "which one shows X?" — the pattern and its look-alike (curriculum
 * principle: contrasting cases). Pairs are only offered when the catalogue has both scenarios.
 */
import type { FindingId } from '../../../core/findings';
import type { L10n } from '../../../core/l10n';
import type { ScenarioDef } from '../../../synth/index';
import type { Item } from '../../api';
import { hallmark } from '../hallmarks';
import { fname, join, L, tpl } from '../text';
import { base, drawSynth, GenerationError, resolvePool, type GenCtx, type PoolSel } from './common';

export interface ComparePair {
  /** the pattern asked for */
  readonly a: FindingId;
  /** its look-alike ('normal' = a normal tracing) */
  readonly b: FindingId | 'normal';
  readonly point: L10n;
}

export const COMPARE_SETS: Readonly<Record<string, readonly ComparePair[]>> = {
  occlusion: [
    {
      a: 'stemi-anterior',
      b: 'early-repolarization',
      point: L('闭塞：ST段抬高伴对应性压低、T波相对QRS过大；早期复极：J点切迹、凹面抬高、无对应性压低。', 'Occlusion: ST elevation with reciprocal depression and T waves large for the QRS; early repolarization: J notch, concave elevation, no reciprocal depression.', 'Oclusión: elevación del ST con descenso recíproco y T grandes para el QRS; repolarización precoz: muesca en J, elevación cóncava y sin descenso recíproco.'),
    },
    {
      a: 'stemi-inferior',
      b: 'pericarditis',
      point: L('下壁闭塞有aVL对应性压低且局限于一个区域；心包炎为广泛抬高伴PR段压低。', 'Inferior occlusion shows reciprocal depression in aVL and stays in one territory; pericarditis is diffuse with PR depression.', 'La oclusión inferior muestra descenso recíproco en aVL y se limita a un territorio; la pericarditis es difusa con descenso del PR.'),
    },
    {
      a: 'hyperacute-t',
      b: 'hyperkalemia',
      point: L('超急性期T波宽基、局限于一个冠脉区域；高钾T波窄而尖、分布广泛。', 'Hyperacute T waves are broad-based and confined to a coronary territory; hyperkalaemic T waves are narrow, peaked and widespread.', 'Las T hiperagudas tienen base ancha y se limitan a un territorio coronario; las de la hiperpotasemia son estrechas, picudas y difusas.'),
    },
    {
      a: 'stemi-anterior',
      b: 'lv-aneurysm',
      point: L('室壁瘤：QS波伴持续ST抬高而T波较小；急性闭塞：T波相对ST和QRS更大。', 'Aneurysm: QS waves with persistent ST elevation and small T waves; acute occlusion: T waves large relative to the ST and QRS.', 'Aneurisma: ondas QS con elevación persistente del ST y T pequeñas; oclusión aguda: T grandes respecto al ST y al QRS.'),
    },
    {
      a: 'sgarbossa-positive',
      b: 'lbbb',
      point: L('左束支阻滞的ST-T本应与QRS方向相反；同向抬高或过度的反向抬高提示闭塞。', 'In LBBB the ST–T should be opposite to the QRS; concordant or excessively discordant elevation signals occlusion.', 'En el BRI el ST-T debe ser opuesto al QRS; la elevación concordante o excesivamente discordante indica oclusión.'),
    },
  ],
  conduction: [
    {
      a: 'av-block-2-mobitz2',
      b: 'av-block-2-mobitz1',
      point: L('Ⅱ型：脱漏前后PR恒定；Ⅰ型：PR逐搏延长后脱漏。', 'Mobitz II: constant PR before and after the dropped beat; Mobitz I: the PR lengthens before the drop.', 'Mobitz II: PR constante antes y después del latido bloqueado; Mobitz I: el PR se alarga antes del bloqueo.'),
    },
    {
      a: 'wpw',
      b: 'short-pr',
      point: L('两者PR都短，只有预激有δ波和宽QRS。', 'Both have a short PR; only pre-excitation has a delta wave and a wide QRS.', 'Ambos tienen PR corto; solo la preexcitación tiene onda delta y QRS ancho.'),
    },
    {
      a: 'rbbb',
      b: 'irbbb',
      point: L('完全性右束支阻滞QRS ≥120 ms；不完全性为110–119 ms。', 'Complete RBBB has QRS ≥ 120 ms; the incomplete form 110–119 ms.', 'El BRD completo tiene QRS ≥ 120 ms; el incompleto, 110–119 ms.'),
    },
    {
      a: 'lafb',
      b: 'normal',
      point: L('左前分支阻滞电轴在−45°以左，aVL呈qR、下壁导联呈rS。', 'LAFB has an axis beyond −45° with qR in aVL and rS in the inferior leads.', 'El BFAI tiene el eje más allá de −45°, con qR en aVL y rS en las inferiores.'),
    },
  ],
  substrate: [
    {
      a: 'brugada-type1',
      b: 'rbbb',
      point: L('Brugada 1型为V1–V2穹窿型ST抬高伴T倒置，I、V6没有宽S波。', 'Brugada type 1 is coved ST elevation with T inversion in V1–V2, without the wide S in I and V6 of RBBB.', 'El Brugada tipo 1 es una elevación del ST en cúpula con T negativa en V1–V2, sin la S ancha en I y V6 del BRD.'),
    },
    {
      a: 'long-qt',
      b: 'normal',
      point: L('QT延长：T波终点超过RR间期的一半以上（心率正常时的粗略判断），QTc需计算确认。', 'Long QT: the T wave ends well past the midpoint of the RR interval (a rough check at normal rates); confirm with the QTc.', 'QT largo: la T termina bastante después de la mitad del RR (comprobación aproximada a frecuencias normales); confírmalo con el QTc.'),
    },
    {
      a: 'lvh',
      b: 'normal',
      point: L('左心室肥厚的电压标准，如SV1+RV5 ≥35 mm。', 'LVH meets a voltage criterion, e.g. SV1 + RV5 ≥ 35 mm.', 'La HVI cumple un criterio de voltaje, p. ej., SV1 + RV5 ≥ 35 mm.'),
    },
  ],
  technical: [
    {
      a: 'electrode-reversal-la-ra',
      b: 'dextrocardia',
      point: L('上肢电极反接时胸导联正常；右位心的胸导联R波从V1到V6逐渐变小。', 'With arm-electrode reversal the chest leads are normal; in dextrocardia the R waves shrink from V1 to V6.', 'Con la inversión de los electrodos de los brazos las precordiales son normales; en la dextrocardia la R disminuye de V1 a V6.'),
    },
    {
      a: 'muscle-tremor',
      b: 'normal',
      point: L('肌电干扰：只出现在使用该肢体电极的导联中的快速不规则波动。', 'Tremor artefact: fast irregular noise only in the leads that use the affected limb electrode.', 'Artefacto por temblor: ruido rápido e irregular solo en las derivaciones que usan el electrodo del miembro afectado.'),
    },
  ],
};

const QUESTION = (a: FindingId): L10n => tpl(L('哪一份心电图显示{f}？', 'Which tracing shows {f}?', '¿Qué trazado muestra {f}?'), { f: fname(a) });

/**
 * Scenarios whose base definition (drawn without a variant) declares `f` — and, for the look-alike side, does NOT
 * declare the pattern asked for (the WPW scenario also declares a short PR, so it can never be the "short PR only"
 * tracing).
 */
export function scenariosFor(f: FindingId | 'normal', not?: FindingId): ScenarioDef[] {
  const sel: PoolSel[] = f === 'normal' ? [{ group: 'normal' }] : [{ finding: f }];
  const xs = resolvePool(sel).filter((s) => s.findings.includes(f === 'normal' ? 'normal-ecg' : f));
  return not ? xs.filter((s) => !s.findings.includes(not)) : xs;
}

/** The contrast pairs of a set that the current catalogue can show (both sides drawable). */
export function availablePairs(set: string): readonly ComparePair[] {
  return (COMPARE_SETS[set] ?? []).filter((p) => scenariosFor(p.a).length > 0 && scenariosFor(p.b, p.a).length > 0);
}

export function makeCompare(set: string) {
  return async (ctx: GenCtx): Promise<Item> => {
    const pairs = availablePairs(set);
    const focused = ctx.focus ? pairs.filter((p) => p.a === ctx.focus) : [];
    const avail = focused.length ? focused : pairs;
    if (avail.length === 0) throw new GenerationError(`no contrast pair available for family "${ctx.spec.id}"`, ctx.spec.id);
    const pair = ctx.rng.fork('pair').pick(avail);
    const A = await drawSynth({ ...ctx, rng: ctx.rng.fork('A') }, scenariosFor(pair.a), { accept: (x) => x.truth.findings.includes(pair.a) });
    const B = await drawSynth({ ...ctx, rng: ctx.rng.fork('B') }, scenariosFor(pair.b, pair.a), {
      accept: (x) => !x.truth.findings.includes(pair.a) && (pair.b === 'normal' || x.truth.findings.includes(pair.b)),
    });
    const left = ctx.rng.fork('side').next() < 0.5;
    const explanation = join([
      pair.point,
      hallmark(pair.a),
      pair.b !== 'normal' ? tpl(L('另一份为{b}：{h}', 'The other is {b}: {h}', 'El otro es {b}: {h}'), { b: fname(pair.b), h: hallmark(pair.b) ?? '' }) : null,
    ]);
    return {
      ...base(ctx, {
        prompt: QUESTION(pair.a),
        explanation,
        ecg: left ? A.source : B.source,
        findings: [pair.a],
      }),
      kind: 'compare',
      ecg2: left ? B.source : A.source,
      key: { correct: left ? 'left' : 'right' },
    };
  };
}
