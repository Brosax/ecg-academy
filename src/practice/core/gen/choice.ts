/**
 * Single-choice families. Option ids are finding ids whenever the options are findings, so feedback can explain a
 * wrong choice with that finding's hallmark. The correct option is the finding the scenario was drawn for (present in
 * the truth by construction); distractors are options ABSENT from the truth, confusable ones first.
 *
 * Non-finding choices: sinus or not, normal or abnormal (speed round), paper speed / gain check, P–QRS relationship
 * and 10-second triage.
 */
import { FINDINGS, type FindingId } from '../../../core/findings';
import type { L10n } from '../../../core/l10n';
import type { StdLead } from '../../../core/leads';
import type { Rng } from '../../../core/rng';
import type { EcgMark } from '../../../ecg/api';
import type { ScenarioDef } from '../../../synth/index';
import type { Item, Option } from '../../api';
import type { ItemViewX } from '../extras';
import { hallmark } from '../hallmarks';
import { fmtStMm, fname, join, L, list, tpl } from '../text';
import { allNormal, isDominant, isPreexcitedAf, isSinus, keyFinding, LONG_QT_ACT_NOW_MS, middleBeat, triageOf, triageQtc, type Triage } from '../truth';
import {
  atrialMarks,
  base,
  chooseByClass,
  drawSynth,
  FINDING_LEADS,
  focusPool,
  GenerationError,
  poolWith,
  scenarioFindings,
  someVariant,
  specPool,
  tUprightAmp,
  variantAllowed,
  type DrawOptions,
  type GenCtx,
  type SynthDraw,
} from './common';

/** Look-alikes offered first as distractors (the contrasts the curriculum teaches). */
export const CONFUSABLE: Readonly<Partial<Record<FindingId, readonly FindingId[]>>> = {
  'av-block-2-mobitz1': ['av-block-2-mobitz2', 'av-block-2-2to1', 'pac-blocked'],
  'av-block-2-mobitz2': ['av-block-2-mobitz1', 'av-block-2-2to1', 'av-block-high-grade'],
  'av-block-2-2to1': ['av-block-2-mobitz2', 'av-block-2-mobitz1', 'av-block-3'],
  'av-block-high-grade': ['av-block-3', 'av-block-2-mobitz2', 'av-block-2-2to1'],
  'av-block-3': ['av-block-high-grade', 'av-dissociation', 'av-block-2-2to1'],
  'av-block-1': ['av-block-2-mobitz1', 'short-pr'],
  rbbb: ['irbbb', 'bifascicular-block', 'lbbb'],
  irbbb: ['rbbb', 'ivcd'],
  lbbb: ['ilbbb', 'ivcd', 'rbbb'],
  lafb: ['lpfb', 'bifascicular-block'],
  lpfb: ['lafb', 'bifascicular-block'],
  'bifascicular-block': ['rbbb', 'trifascicular-block', 'lafb'],
  wpw: ['short-pr', 'lbbb', 'av-block-1'],
  'short-pr': ['wpw'],
  'atrial-flutter': ['atrial-tachycardia', 'atrial-fibrillation', 'avnrt'],
  'atrial-fibrillation': ['mat', 'atrial-flutter', 'sinus-arrhythmia'],
  mat: ['atrial-fibrillation', 'wandering-atrial-pacemaker'],
  avnrt: ['avrt', 'atrial-flutter', 'sinus-tachycardia'],
  avrt: ['avnrt', 'atrial-tachycardia'],
  'atrial-tachycardia': ['atrial-flutter', 'sinus-tachycardia', 'avnrt'],
  'sinus-tachycardia': ['atrial-tachycardia', 'atrial-flutter'],
  'vt-monomorphic': ['ventricular-flutter', 'vt-polymorphic', 'aivr'],
  'vt-polymorphic': ['torsades', 'ventricular-fibrillation'],
  torsades: ['vt-polymorphic', 'ventricular-fibrillation'],
  'ventricular-fibrillation': ['vt-polymorphic', 'asystole', 'muscle-tremor'],
  'ventricular-flutter': ['vt-monomorphic', 'ventricular-fibrillation'],
  asystole: ['ventricular-fibrillation'],
  pac: ['pjc', 'pvc', 'pac-blocked'],
  'pac-blocked': ['sinus-pause', 'av-block-2-mobitz2'],
  pjc: ['pac', 'pvc'],
  pvc: ['pac', 'aberrant-conduction'],
  'sinus-pause': ['sa-exit-block', 'pac-blocked'],
  'sa-exit-block': ['sinus-pause', 'av-block-2-mobitz2'],
  'junctional-escape-rhythm': ['ventricular-escape-rhythm', 'sinus-bradycardia'],
  'ventricular-escape-rhythm': ['junctional-escape-rhythm', 'aivr'],
  lvh: ['lvh-strain', 'biventricular-hypertrophy'],
  'lvh-strain': ['lvh', 'st-depression-ischemic'],
  rvh: ['rbbb', 'biventricular-hypertrophy'],
  lae: ['rae', 'biatrial-abnormality'],
  rae: ['lae', 'biatrial-abnormality'],
  'stemi-anterior': ['stemi-anteroseptal', 'stemi-anterolateral'],
  'stemi-inferior': ['rv-infarction', 'stemi-lateral'],
  'stemi-lateral': ['stemi-high-lateral', 'stemi-anterolateral'],
  'stemi-high-lateral': ['stemi-lateral', 'stemi-anterolateral'],
  'stemi-posterior': ['st-depression-ischemic', 'stemi-inferior'],
  'rv-infarction': ['stemi-inferior', 'stemi-posterior'],
  wellens: ['t-inversion-ischemic', 'de-winter'],
  'de-winter': ['hyperacute-t', 'st-depression-ischemic'],
  'hyperacute-t': ['de-winter', 'peaked-t'],
  hyperkalemia: ['hyperacute-t', 'hypercalcemia'],
  hypokalemia: ['hypocalcemia', 'digoxin-effect'],
  hypercalcemia: ['short-qt', 'hyperkalemia'],
  hypocalcemia: ['long-qt', 'hypokalemia'],
  'brugada-type1': ['brugada-type2', 'rbbb'],
  'brugada-type2': ['brugada-type1', 'irbbb'],
  'electrode-reversal-la-ra': ['dextrocardia', 'electrode-reversal-la-ll'],
  dextrocardia: ['electrode-reversal-la-ra'],
  pericarditis: ['early-repolarization', 'stemi-inferior'],
  'early-repolarization': ['pericarditis', 'stemi-anterior'],
  'pacing-failure-capture': ['pacing-undersensing', 'pacing-oversensing'],
  'pacing-undersensing': ['pacing-failure-capture', 'pacing-oversensing'],
  'pacing-oversensing': ['pacing-undersensing', 'pacing-failure-capture'],
};

/**
 * Options never offered as a distractor for a target because their definitions overlap: a partial interatrial block
 * (P ≥ 120 ms) also meets the P-duration criterion of left atrial abnormality, and vice versa (criteria.md
 * `lae-criteria`), so either answer could be defended on the same tracing.
 */
export const OVERLAPPING: Readonly<Partial<Record<FindingId, readonly FindingId[]>>> = {
  'interatrial-block': ['lae'],
  lae: ['interatrial-block'],
};

export function findingOption(id: FindingId): Option {
  return { id, label: fname(id) };
}

/** Target finding of a drawn scenario for an option universe: the scenario's declared order wins (primary first). */
export function targetOf(d: SynthDraw, universe: readonly FindingId[], focus?: FindingId): FindingId | null {
  const present = d.truth.findings;
  if (focus && universe.includes(focus) && present.includes(focus)) return focus;
  const declared = [...(d.req.variant ? (d.scenario.variants?.[d.req.variant]?.findings ?? []) : []), ...d.scenario.findings];
  for (const f of declared) if (universe.includes(f) && present.includes(f)) return f;
  return universe.find((f) => present.includes(f)) ?? null;
}

/** Distractors: options absent from the truth (and not compatible with it), confusables first, then seeded random. */
export function pickDistractors(rng: Rng, target: FindingId, universe: readonly FindingId[], exclude: readonly FindingId[], n: number): FindingId[] {
  const overlap = OVERLAPPING[target] ?? [];
  const allowed = (f: FindingId) => f !== target && universe.includes(f) && !exclude.includes(f) && !overlap.includes(f);
  const conf = (CONFUSABLE[target] ?? []).filter(allowed);
  const rest = rng.shuffle(universe.filter((f) => allowed(f) && !conf.includes(f)));
  return [...rng.shuffle(conf), ...rest].slice(0, n);
}

/** Reveal marks for a finding: its leads, plus P/F waves on lead II for rhythm and AV-conduction findings. */
export function revealFor(d: SynthDraw, f: FindingId): EcgMark[] {
  const marks: EcgMark[] = (FINDING_LEADS[f] ?? []).map((lead) => ({ kind: 'lead' as const, lead, color: 'highlight' as const }));
  const cat = FINDINGS[f].cat;
  if (cat === 'rhythm' || f.startsWith('av-')) marks.push(...atrialMarks(d.truth));
  return marks;
}

export interface FindingChoiceCfg {
  readonly options: readonly FindingId[];
  readonly prompt: L10n;
  readonly nOptions?: number;
  readonly view?: ItemViewX;
  /** extra acceptance test on the realised tracing (e.g. narrow and regular for the narrow-complex family) */
  readonly accept?: (d: SynthDraw) => boolean;
  /** adjust a scenario's drawn dials (DrawOptions.dials) */
  readonly dials?: DrawOptions['dials'];
}

// ── explanations that describe THIS tracing ────────────────────────────────────────────────────────────────────
const mm = (mv: number | undefined) => fmtStMm(mv ?? 0);

/** Median RP′ (ms) of the retrograde atrial waves (time from the preceding QRS onset), or null when none is visible. */
export function rpPrimeMs(truth: SynthDraw['truth']): number | null {
  const xs: number[] = [];
  for (const a of truth.atrial) {
    if (a.kind !== 'retrograde' || !a.visible) continue;
    let prev: number | null = null;
    for (const b of truth.beats) if (b.qrsOn <= a.t) prev = b.qrsOn;
    if (prev !== null) xs.push(a.t - prev);
  }
  if (xs.length === 0) return null;
  xs.sort((a, b) => a - b);
  return xs[Math.floor(xs.length / 2)];
}

// ── STEMI millimetre criterion (Fourth Universal Definition of MI, Thygesen 2018; 2023 ESC ACS guideline) ────────
/** Contiguous lead groups: aVL–I, II–aVF–III, V1–V6. */
const CONTIGUOUS: readonly (readonly StdLead[])[] = [
  ['aVL', 'I'],
  ['II', 'aVF', 'III'],
  ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
];

/** ST-elevation threshold (mV) of a lead for this patient: V2–V3 2 mm men ≥ 40 y, 2.5 mm men < 40 y, 1.5 mm women; 1 mm elsewhere. */
export function stemiThresholdMv(lead: StdLead, sex: 'female' | 'male', ageY: number): number {
  if (lead !== 'V2' && lead !== 'V3') return 0.1;
  return sex === 'female' ? 0.15 : ageY < 40 ? 0.25 : 0.2;
}

/** Leads that meet the STEMI threshold together with a contiguous neighbour (empty = criterion not met). */
export function stemiLeadsMet(stMv: SynthDraw['truth']['stMv'], sex: 'female' | 'male', ageY: number): StdLead[] {
  const out = new Set<StdLead>();
  for (const row of CONTIGUOUS) {
    const ok = row.map((l) => (stMv[l] ?? 0) >= stemiThresholdMv(l, sex, ageY) - 1e-9);
    for (let i = 0; i + 1 < row.length; i++)
      if (ok[i] && ok[i + 1]) {
        out.add(row[i]);
        out.add(row[i + 1]);
      }
  }
  return [...out];
}

/** "a 52-year-old man: V2–V3 ≥ 2.0 mm, other leads ≥ 1 mm" */
export function thresholdText(sex: 'female' | 'male', ageY: number): L10n {
  const v23 = (stemiThresholdMv('V2', sex, ageY) * 10).toFixed(1);
  return sex === 'female'
    ? tpl(L('{a}岁女性：V2–V3 ≥{x} mm，其余导联≥1 mm', 'a {a}-year-old woman: V2–V3 ≥ {x} mm, other leads ≥ 1 mm', 'mujer de {a} años: V2–V3 ≥ {x} mm, resto de derivaciones ≥ 1 mm'), { a: ageY, x: v23 })
    : tpl(L('{a}岁男性：V2–V3 ≥{x} mm，其余导联≥1 mm', 'a {a}-year-old man: V2–V3 ≥ {x} mm, other leads ≥ 1 mm', 'varón de {a} años: V2–V3 ≥ {x} mm, resto de derivaciones ≥ 1 mm'), { a: ageY, x: v23 });
}

/** Met / not-met sentence of the STEMI millimetre criterion for the tracing's patient (null without a patient). */
function stemiCriterionLine(d: SynthDraw): L10n | null {
  const p = d.scenario.patient;
  if (!p) return null;
  const met = stemiLeadsMet(d.truth.stMv, p.sex, p.ageY);
  if (met.length >= 2) {
    return tpl(L('达到STEMI标准：{x}（阈值——{th}）。', 'STEMI criterion met: {x} (thresholds for {th}).', 'Cumple el criterio de IAMCEST: {x} (umbrales para {th}).'), {
      x: met.map((l) => `${l} ${fmtStMm(d.truth.stMv[l] ?? 0)}`).join(', '),
      th: thresholdText(p.sex, p.ageY),
    });
  }
  const top = (Object.entries(d.truth.stMv) as [StdLead, number][]).filter(([l, v]) => l !== 'aVR' && typeof v === 'number').sort((a, b) => b[1] - a[1])[0];
  return tpl(
    L(
      '未达到STEMI毫米标准（最大抬高{x}；阈值——{th}）：部位由ST段抬高和T波改变所在的导联组判断。',
      'The STEMI millimetre criterion is not met (largest elevation {x}; thresholds for {th}): the territory is read from the lead group that carries the ST elevation and T-wave change.',
      'No se cumple el criterio milimétrico de IAMCEST (elevación máxima {x}; umbrales para {th}): el territorio se lee en el grupo de derivaciones que muestra la elevación del ST y el cambio de la onda T.',
    ),
    { x: top ? `${top[0]} ${fmtStMm(top[1])}` : '—', th: thresholdText(p.sex, p.ageY) },
  );
}

/** Wall sentence of the anterior STEMI without the millimetre thresholds (they are judged per tracing above). */
const ANTERIOR_WALL = L('ST段抬高以V1–V4为中心：前降支供血区。', 'ST elevation centred on V1–V4: the LAD territory.', 'Elevación del ST centrada en V1–V4: territorio de la DA.');

/** RP′ separating typical AVNRT from AVRT on the surface ECG (criteria.md `avnrt`, `orthodromic-avrt`). */
export const RP_AVNRT_MAX_MS = 90;

/**
 * The target's hallmark rewritten for the tracing on screen, where the generic sentence could claim something this
 * tracing does not show (null = the generic hallmark is right). Values quoted are measured on the tracing.
 */
export function contextHallmark(target: FindingId, d: SynthDraw): L10n | null {
  const t = d.truth;
  const st = t.stMv;
  if (target === 'pac' && t.findings.includes('aberrant-conduction')) {
    return L(
      '提前出现形态不同的P′波，其后的QRS宽大、呈束支阻滞形态：这是伴差异性传导的房性期前收缩（激动到达时一侧束支仍处于不应期）。QRS前的P′波是与室性期前收缩鉴别的关键；代偿间歇不完全。',
      'An early P′ wave of a different shape, followed by a wide QRS with a bundle-branch-block shape: a PAC conducted with aberrancy (it reached a bundle branch that was still refractory). The P′ in front of the wide QRS is what separates it from a PVC; the pause is non-compensatory.',
      'Onda P′ prematura de morfología distinta seguida de un QRS ancho con morfología de bloqueo de rama: extrasístole auricular conducida con aberrancia (llegó a una rama todavía refractaria). La P′ delante del QRS ancho la distingue de una extrasístole ventricular; la pausa no es compensadora.',
    );
  }
  if (target === 'avnrt' || target === 'avrt') {
    const rp = rpPrimeMs(t);
    const rr = 60000 / Math.max(1, t.hrBpm);
    const hr = Math.round(t.hrBpm);
    if (target === 'avrt') {
      return rp !== null
        ? tpl(
            L(
              '规则窄QRS心动过速（{hr}次/分），逆行P′波位于ST段：RP′约{rp} ms（≥{lim} ms）且短于P′R——顺向型房室折返性心动过速。',
              'A regular narrow tachycardia at {hr}/min with a retrograde P′ in the ST segment: RP′ ≈ {rp} ms (≥ {lim} ms) and shorter than P′R — orthodromic AVRT.',
              'Taquicardia regular de QRS estrecho a {hr} lpm con P′ retrógrada en el segmento ST: RP′ ≈ {rp} ms (≥ {lim} ms) y menor que P′R: TRAV ortodrómica.',
            ),
            { hr, rp: Math.round(rp), lim: RP_AVNRT_MAX_MS },
          )
        : null;
    }
    if (rp !== null && rp > rr / 2) {
      return tpl(
        L(
          '规则窄QRS心动过速（{hr}次/分），长RP′：II、III、aVF导联倒置的P′波位于下一个QRS之前（RP′约{rp} ms，长于P′R）——非典型（快-慢型）房室结折返性心动过速；需与房性心动过速和持续性交界区折返性心动过速鉴别。',
          'A regular narrow tachycardia at {hr}/min with a long RP′: the P′, negative in II, III and aVF, sits just before the next QRS (RP′ ≈ {rp} ms, longer than P′R) — atypical (fast–slow) AVNRT; the differential is atrial tachycardia and PJRT.',
          'Taquicardia regular de QRS estrecho a {hr} lpm con RP′ largo: la P′, negativa en II, III y aVF, queda justo antes del QRS siguiente (RP′ ≈ {rp} ms, mayor que P′R): TRNAV atípica (rápida-lenta); el diagnóstico diferencial es la taquicardia auricular y la TRUP.',
        ),
        { hr, rp: Math.round(rp) },
      );
    }
    return tpl(
      L(
        '规则窄QRS心动过速（{hr}次/分），逆行P′波隐藏在QRS中或紧贴其终末（可见时表现为V1假性r′、II/III/aVF假性S波）：RP′ <{lim} ms——典型（慢-快型）房室结折返性心动过速。',
        'A regular narrow tachycardia at {hr}/min with the retrograde P′ hidden in the QRS or at its very end (when visible: a pseudo-r′ in V1, a pseudo-S in II, III, aVF): RP′ < {lim} ms — typical (slow–fast) AVNRT.',
        'Taquicardia regular de QRS estrecho a {hr} lpm con la P′ retrógrada oculta en el QRS o al final de este (cuando se ve: pseudo-r′ en V1 y pseudo-S en II, III y aVF): RP′ < {lim} ms: TRNAV típica (lenta-rápida).',
      ),
      { hr, lim: RP_AVNRT_MAX_MS },
    );
  }
  if (target === 'stemi-inferior') {
    const ii = st.II ?? 0;
    const iii = st.III ?? 0;
    const i = st.I ?? 0;
    const vals = { ii: mm(ii), iii: mm(iii), avf: mm(st.aVF), i: mm(i), avl: mm(st.aVL) };
    if (iii > ii && i <= -0.05) {
      return tpl(
        L(
          '下壁导联ST段抬高（II {ii}、III {iii}、aVF {avf}），aVL对应性压低（{avl}）。III抬高大于II且I导联ST段压低（{i}）——提示右冠状动脉闭塞。',
          'ST elevation in the inferior leads (II {ii}, III {iii}, aVF {avf}) with reciprocal depression in aVL ({avl}). III above II with ST depression in I ({i}) points to the RCA.',
          'Elevación del ST en derivaciones inferiores (II {ii}, III {iii}, aVF {avf}) con descenso recíproco en aVL ({avl}). III mayor que II con descenso del ST en I ({i}) orienta a la coronaria derecha.',
        ),
        vals,
      );
    }
    if (ii >= iii && i > -0.05) {
      return tpl(
        L(
          '下壁导联ST段抬高（II {ii}、III {iii}、aVF {avf}）。II抬高不小于III，且I导联ST段无压低（{i}）——提示回旋支闭塞（伴V5–V6抬高时更支持）；III >II伴I导联压低才提示右冠状动脉。',
          'ST elevation in the inferior leads (II {ii}, III {iii}, aVF {avf}). II at least as high as III and no ST depression in I ({i}) point to the circumflex (more so with ST elevation in V5–V6); III > II with ST depression in I would point to the RCA.',
          'Elevación del ST en derivaciones inferiores (II {ii}, III {iii}, aVF {avf}). II igual o mayor que III y sin descenso del ST en I ({i}) orientan a la circunfleja (más aún si se eleva en V5–V6); III > II con descenso en I orientaría a la coronaria derecha.',
        ),
        vals,
      );
    }
    return tpl(
      L(
        '下壁导联ST段抬高（II {ii}、III {iii}、aVF {avf}），aVL {avl}。',
        'ST elevation in the inferior leads (II {ii}, III {iii}, aVF {avf}); aVL {avl}.',
        'Elevación del ST en derivaciones inferiores (II {ii}, III {iii}, aVF {avf}); aVL {avl}.',
      ),
      vals,
    );
  }
  if (target === 'stemi-anterior' || target === 'stemi-anteroseptal' || target === 'stemi-anterolateral' || target === 'stemi-lateral' || target === 'stemi-high-lateral') {
    return join([stemiCriterionLine(d), target === 'stemi-anterior' ? ANTERIOR_WALL : hallmark(target)]);
  }
  if (target === 'stemi-posterior') {
    const k = middleBeat(t, d.ecg.signal.durationMs, (b) => isDominant(b));
    // T polarity is quoted only for the leads where the T rises out of the depressed ST to > 0.1 mV above the baseline
    const up = k >= 0 ? (['V1', 'V2', 'V3'] as const).filter((l) => tUprightAmp(d.ecg, l, t.beats[k]) > 0.1) : [];
    const vals = { v1: mm(st.V1), v2: mm(st.V2), v3: mm(st.V3), up: up.join(', ') };
    return join([
      tpl(
        L('V1–V3导联ST段压低（V1 {v1}、V2 {v2}、V3 {v3}）', 'ST depression in V1–V3 (V1 {v1}, V2 {v2}, V3 {v3})', 'Descenso del ST en V1–V3 (V1 {v1}, V2 {v2}, V3 {v3})'),
        vals,
      ),
      up.length ? tpl(L('，{up}导联T波直立', ', with an upright T in {up}', ', con T positiva en {up}'), vals) : null,
      L(
        '：这是后壁损伤的镜像。加做V7–V9：ST段抬高≥0.5 mm即可确认后壁闭塞。',
        ': the mirror image of posterior injury. Record V7–V9: ST elevation ≥ 0.5 mm there confirms a posterior occlusion.',
        ': la imagen especular de la lesión posterior. Registra V7–V9: una elevación del ST ≥ 0,5 mm allí confirma la oclusión posterior.',
      ),
    ], L('', '', ''));
  }
  return null;
}

export function makeFindingChoice(cfg: FindingChoiceCfg) {
  return async (ctx: GenCtx): Promise<Item> => {
    const pool0 = specPool(ctx.spec).filter((s) => scenarioFindings(s).some((f) => cfg.options.includes(f)));
    // a strict topic never falls back to the whole pool; a review focus does
    const want = ctx.topic ?? ctx.focus;
    const focused = want && cfg.options.includes(want) ? poolWith(pool0, want) : [];
    if (ctx.topic && focused.length === 0) throw new GenerationError(`family "${ctx.spec.id}": no scenario shows "${ctx.topic}"`, ctx.spec.id);
    const pool = focused.length ? focused : pool0;
    // balance across targets: pick a target finding first, then a scenario that shows it
    const targets = ctx.topic ? [ctx.topic] : cfg.options.filter((f) => pool.some((s) => scenarioFindings(s).includes(f)));
    const d = await drawSynth(ctx, pool, {
      choose: (rng, p) => {
        const t = rng.pick(targets.length ? targets : cfg.options);
        const xs = poolWith(p, t);
        return rng.pick(xs.length ? xs : p);
      },
      variant: someVariant(0.4, variantAllowed(ctx.spec)),
      ...(cfg.dials ? { dials: cfg.dials } : {}),
      accept: (x) => (ctx.topic ? targetOf(x, cfg.options, ctx.topic) === ctx.topic : targetOf(x, cfg.options, ctx.focus) !== null) && (cfg.accept?.(x) ?? true),
    });
    const target = targetOf(d, cfg.options, ctx.topic ?? ctx.focus) as FindingId;
    const n = Math.min(cfg.nOptions ?? 4, cfg.options.length);
    const distract = pickDistractors(d.rng, target, cfg.options, d.truth.findings, n - 1);
    const options = d.rng.shuffle([target, ...distract]).map(findingOption);
    const others = d.truth.findings.filter((f) => f !== target && FINDINGS[f].severity !== 'normal' && f !== 'secondary-st-t');
    const explanation = join([
      tpl(L('答案：{t}。', 'Answer: {t}.', 'Respuesta: {t}.'), { t: fname(target) }),
      contextHallmark(target, d) ?? hallmark(target),
      others.length ? tpl(L('本图还有：{x}。', 'Also on this tracing: {x}.', 'También en este trazado: {x}.'), { x: list(others.map(fname)) }) : null,
    ]);
    return {
      ...base(ctx, {
        prompt: cfg.prompt,
        explanation,
        ecg: d.source,
        findings: [target],
        view: cfg.view,
        reveal: revealFor(d, target),
      }),
      kind: 'choice',
      key: { options, correct: target },
    };
  };
}

// ── sinus or not ─────────────────────────────────────────────────────────────────────────────────────────────────
const SINUS_OPTS: readonly Option[] = [
  { id: 'sinus', label: L('窦性心律', 'Sinus rhythm', 'Ritmo sinusal') },
  { id: 'not-sinus', label: L('非窦性心律', 'Not sinus rhythm', 'No es ritmo sinusal') },
];

export function makeSinusOrNot() {
  return async (ctx: GenCtx): Promise<Item> => {
    const pool = focusPool(ctx, specPool(ctx.spec));
    const classOf = (s: ScenarioDef): 'sinus' | 'not' => (s.findings.some((f) => isSinus(f) || f === 'normal-ecg' || f === 'av-block-1') ? 'sinus' : 'not');
    const d = await drawSynth(ctx, pool, { choose: chooseByClass(classOf, ['sinus', 'not'] as const) });
    const sinus = isSinus(d.truth.rhythm);
    const explanation = sinus
      ? join([
          tpl(L('窦性：{r}。', 'Sinus: {r}.', 'Sinusal: {r}.'), { r: fname(d.truth.rhythm) }),
          hallmark('sinus-rhythm'),
          d.truth.prMs !== null && d.truth.prMs > 200
            ? L('PR延长并不改变窦性心律的判断：这是窦性心律伴一度房室阻滞。', 'A long PR does not make it non-sinus: this is sinus rhythm with first-degree AV block.', 'Un PR largo no impide que sea sinusal: es ritmo sinusal con bloqueo AV de primer grado.')
            : null,
        ])
      : join([tpl(L('非窦性：{r}。', 'Not sinus: {r}.', 'No sinusal: {r}.'), { r: fname(d.truth.rhythm) }), hallmark(d.truth.rhythm)]);
    return {
      ...base(ctx, {
        prompt: L('这是窦性心律吗？', 'Is this sinus rhythm?', '¿Es un ritmo sinusal?'),
        explanation,
        ecg: d.source,
        findings: [d.truth.rhythm],
        reveal: atrialMarks(d.truth),
        hint: L('看II和aVR：窦性P波在II直立、aVR倒置，并且出现在每个QRS之前。', 'Look at II and aVR: a sinus P is upright in II, inverted in aVR, and comes before every QRS.', 'Mira II y aVR: la P sinusal es positiva en II, negativa en aVR y precede a cada QRS.'),
      }),
      kind: 'choice',
      key: { options: SINUS_OPTS, correct: sinus ? 'sinus' : 'not-sinus' },
    };
  };
}

// ── normal or abnormal (speed round) ─────────────────────────────────────────────────────────────────────────────
const NORMAL_OPTS: readonly Option[] = [
  { id: 'normal', label: L('正常（含正常变异）', 'Normal (or a normal variant)', 'Normal (o variante de la normalidad)') },
  { id: 'abnormal', label: L('异常', 'Abnormal', 'Anormal') },
];

export function makeNormalOrAbnormal() {
  return async (ctx: GenCtx): Promise<Item> => {
    const pool = focusPool(ctx, specPool(ctx.spec));
    // classes from the declared findings, with the same rule the acceptance test applies to the realised truth: only
    // clearly normal (normal findings and variants) or clearly abnormal (major / critical) tracings — a minor finding
    // (sinus bradycardia, incomplete RBBB …) is neither, so it never enters the speed round and the two classes stay
    // balanced
    const classOf = (s: ScenarioDef): 'normal' | 'abnormal' | null =>
      allNormal(s.findings) ? 'normal' : s.findings.some((f) => FINDINGS[f].severity === 'major' || FINDINGS[f].severity === 'critical') ? 'abnormal' : null;
    const d = await drawSynth(ctx, pool, {
      choose: (rng, p) => {
        const q = p.filter((s) => classOf(s) !== null);
        return chooseByClass(classOf, ['normal', 'abnormal'] as const)(rng, q.length ? q : p);
      },
      accept: (x) => allNormal(x.truth.findings) || x.truth.findings.some((f) => FINDINGS[f].severity === 'major' || FINDINGS[f].severity === 'critical'),
    });
    const normal = allNormal(d.truth.findings);
    const key = keyFinding(d.truth.findings);
    const explanation = normal
      ? join([
          tpl(L('正常：{x}。', 'Normal: {x}.', 'Normal: {x}.'), { x: list(d.truth.findings.map(fname)) }),
          L('正常变异（早期复极、幼年型T波、运动员改变）不应过度诊断。', 'Normal variants (early repolarization, juvenile T waves, athlete changes) should not be over-called.', 'Las variantes normales (repolarización precoz, T juveniles, cambios del deportista) no deben sobrediagnosticarse.'),
        ])
      : join([tpl(L('异常：{k}。', 'Abnormal: {k}.', 'Anormal: {k}.'), { k: key ? fname(key) : '—' }), key ? hallmark(key) : null]);
    return {
      ...base(ctx, {
        prompt: L('快速判断：正常还是异常？', 'Speed round: normal or abnormal?', 'Ronda rápida: ¿normal o anormal?'),
        explanation,
        ecg: d.source,
        findings: normal ? ['normal-ecg'] : key ? [key] : [],
        reveal: key && !normal ? revealFor(d, key) : [],
      }),
      kind: 'choice',
      key: { options: NORMAL_OPTS, correct: normal ? 'normal' : 'abnormal' },
    };
  };
}

// ── paper speed and gain check (C1) — the one family whose key is the recording setting, not the heart ─────────────
const PAPER = [
  { id: '25-10', speed: 25, gain: 10 },
  { id: '25-5', speed: 25, gain: 5 },
  { id: '25-20', speed: 25, gain: 20 },
  { id: '50-10', speed: 50, gain: 10 },
] as const;

export function makeCalibration() {
  return async (ctx: GenCtx): Promise<Item> => {
    const pool = focusPool(ctx, specPool(ctx.spec));
    const d = await drawSynth(ctx, pool);
    const p = d.rng.pick(PAPER);
    const options: Option[] = PAPER.map((x) => ({
      id: x.id,
      label: tpl(L('{s} mm/s，{g} mm/mV', '{s} mm/s, {g} mm/mV', '{s} mm/s, {g} mm/mV'), { s: x.speed, g: x.gain }),
    }));
    const explanation = join([
      tpl(
        L('定标脉冲高{g} mm（1 mV），说明增益为{g} mm/mV；1秒占{s} mm（{s} mm/s）。', 'The calibration pulse is {g} mm tall for 1 mV, so the gain is {g} mm/mV; one second spans {s} mm ({s} mm/s).', 'El pulso de calibración mide {g} mm para 1 mV, así que la ganancia es de {g} mm/mV; un segundo ocupa {s} mm ({s} mm/s).'),
        { g: p.gain, s: p.speed },
      ),
      p.gain !== 10
        ? L('应用电压标准（如左心室肥厚）之前，先把振幅换算回10 mm/mV。', 'Convert amplitudes back to 10 mm/mV before applying any voltage criterion (e.g. LVH).', 'Convierte las amplitudes a 10 mm/mV antes de aplicar cualquier criterio de voltaje (p. ej., HVI).')
        : null,
      p.speed === 50
        ? L('50 mm/s时每小格为20 ms，波形看起来更宽、心率看起来更慢。', 'At 50 mm/s each small square is 20 ms: complexes look wider and the rate looks slower.', 'A 50 mm/s cada cuadro pequeño son 20 ms: los complejos parecen más anchos y la frecuencia más lenta.')
        : null,
    ]);
    return {
      ...base(ctx, {
        prompt: L('这份心电图的走纸速度和增益是多少？先看定标脉冲。', 'What are the paper speed and gain of this recording? Check the calibration pulse first.', '¿Cuáles son la velocidad del papel y la ganancia de este registro? Mira primero el pulso de calibración.'),
        explanation,
        ecg: d.source,
        findings: [],
        view: { speed: p.speed, gain: p.gain, toolbar: false, layout: '3x4+1' },
      }),
      kind: 'choice',
      key: { options, correct: p.id },
    };
  };
}

// ── P–QRS relationship (C3) ──────────────────────────────────────────────────────────────────────────────────────
type Relation = '1to1' | 'more-p' | 'independent' | 'retro' | 'no-p';

const RELATION_OF: Readonly<Partial<Record<FindingId, Relation>>> = {
  'normal-ecg': '1to1',
  'sinus-rhythm': '1to1',
  'sinus-bradycardia': '1to1',
  'sinus-tachycardia': '1to1',
  'av-block-1': '1to1',
  'ectopic-atrial-rhythm': '1to1',
  'short-pr': '1to1',
  'av-block-2-mobitz1': 'more-p',
  'av-block-2-mobitz2': 'more-p',
  'av-block-2-2to1': 'more-p',
  'av-block-high-grade': 'more-p',
  'av-block-3': 'independent',
  'av-dissociation': 'independent',
  'junctional-escape-rhythm': 'retro',
  'accelerated-junctional-rhythm': 'retro',
  avnrt: 'retro',
  avrt: 'retro',
  'atrial-fibrillation': 'no-p',
};

const RELATION_OPTS: readonly Option[] = [
  { id: '1to1', label: L('每个P波后跟一个QRS，PR恒定', 'Every P followed by a QRS at a constant PR', 'Cada P seguida de un QRS con PR constante') },
  { id: 'more-p', label: L('P波多于QRS（部分P波未下传）', 'More P waves than QRS (some P waves not conducted)', 'Más ondas P que QRS (algunas P no conducen)') },
  { id: 'independent', label: L('P与QRS各自规律、互不相关', 'P and QRS each regular but unrelated', 'P y QRS regulares pero independientes') },
  { id: 'retro', label: L('无P波或逆行P′紧贴QRS', 'No P, or a retrograde P′ right next to the QRS', 'Sin P, o con P′ retrógrada pegada al QRS') },
  { id: 'no-p', label: L('无规律的心房波（f波）', 'No organized atrial waves (f waves)', 'Sin actividad auricular organizada (ondas f)') },
];

const RELATION_EXPLAIN: Readonly<Record<Relation, L10n>> = {
  '1to1': L('1:1传导：每个P波后都有QRS，PR间期恒定。', '1:1 conduction: every P wave is followed by a QRS at a constant PR.', 'Conducción 1:1: cada P va seguida de un QRS con PR constante.'),
  'more-p': L('P波多于QRS：部分P波没有下传——这是二度或高度房室阻滞的标志。', 'More P waves than QRS: some P waves are not conducted — the mark of second-degree or high-grade AV block.', 'Más P que QRS: algunas P no conducen, la marca del bloqueo AV de segundo grado o avanzado.'),
  independent: L('P波和QRS各自按自身节律出现，PR随意变化：房室分离。', 'P waves and QRS complexes each keep their own rhythm and the PR varies at random: AV dissociation.', 'Las P y los QRS siguen cada uno su ritmo y el PR varía al azar: disociación AV.'),
  retro: L('QRS前没有P波，或逆行P′紧贴QRS（在其前、其中或其后）：交界区起源或房室结折返。', 'No P before the QRS, or a retrograde P′ right next to it (before, inside or after): a junctional origin or AV-nodal re-entry.', 'Sin P antes del QRS, o con P′ retrógrada pegada a él (antes, dentro o después): origen en la unión o reentrada nodal.'),
  'no-p': L('没有规律的心房波，只有f波，RR绝对不规则：心房颤动。', 'No organized atrial waves, only f waves, with irregularly irregular RR: atrial fibrillation.', 'Sin ondas auriculares organizadas, solo ondas f, con RR irregularmente irregular: fibrilación auricular.'),
};

/** Dissociation with and without block: the atrial rate is faster (complete AV block) or not (the lower pacemaker
 *  usurps: accelerated junctional rhythm, AIVR, VT, isorhythmic dissociation). */
const DISSOCIATION_WITH_BLOCK = L(
  '心房率快于心室率，而P波落在本应下传的时机也不下传：这是三度（完全性）房室阻滞所致的房室分离，心室由逸搏心律维持。',
  'The atrial rate is faster than the ventricular rate, and P waves that fall where they should conduct still do not: AV dissociation caused by complete (third-degree) AV block, with an escape rhythm driving the ventricles.',
  'La frecuencia auricular supera la ventricular y las P que caen donde deberían conducir tampoco lo hacen: disociación AV por bloqueo AV completo (de tercer grado), con un ritmo de escape que gobierna los ventrículos.',
);
const DISSOCIATION_WITHOUT_BLOCK = L(
  '心室率等于或快于心房率：下位起搏点（加速性交界区心律、室性心律）夺获了心室，并非房室阻滞——这是不伴阻滞的房室分离（等频性分离）。',
  'The ventricular rate equals or exceeds the atrial rate: a lower pacemaker (accelerated junctional or ventricular rhythm) has taken over the ventricles — this is AV dissociation without AV block (isorhythmic dissociation), not complete heart block.',
  'La frecuencia ventricular iguala o supera a la auricular: un marcapasos inferior (ritmo de la unión acelerado o ventricular) ha tomado los ventrículos; es una disociación AV sin bloqueo (disociación isorrítmica), no un bloqueo AV completo.',
);

/** AF with complete AV block ("regularised" AF): there are no P waves to dissociate — the f waves are simply not
 *  conducted and a regular escape rhythm drives the ventricles. */
const AF_COMPLETE_BLOCK = L(
  '没有规律的心房波，只有f波——但RR规整而缓慢：f波一个也没有下传，心室由规整的逸搏心律维持。这是心房颤动伴完全性（三度）房室阻滞（“规整化”房颤；要想到地高辛中毒）。',
  'No organized atrial waves, only f waves — yet the RR is regular and slow: none of the f waves is conducted and a regular escape rhythm drives the ventricles. This is atrial fibrillation with complete (third-degree) AV block ("regularised" AF; think of digoxin toxicity).',
  'Sin ondas auriculares organizadas, solo ondas f, pero con RR regular y lento: ninguna onda f conduce y un ritmo de escape regular gobierna los ventrículos. Es una fibrilación auricular con bloqueo AV completo (de tercer grado) (FA «regularizada»; piensa en una intoxicación digitálica).',
);

/** AF with a ventricular pacemaker (VVI): the RR is regular because every QRS is paced. */
const AF_PACED = L(
  '没有规律的心房波，只有f波——但RR规整：每个宽QRS都是起搏心搏，心室跟随起搏器，而不是颤动的心房。',
  'No organized atrial waves, only f waves — but the RR is regular: every wide QRS is a paced beat, so the ventricles follow the pacemaker, not the fibrillating atria.',
  'Sin ondas auriculares organizadas, solo ondas f, pero con RR regular: cada QRS ancho es un latido estimulado, así que los ventrículos siguen al marcapasos y no a las aurículas fibrilantes.',
);

function relationOf(findings: readonly FindingId[]): Relation | null {
  // fibrillation has no P waves: with complete AV block it is still "no organized atrial waves", not P–QRS dissociation
  if (findings.includes('atrial-fibrillation')) return 'no-p';
  // block / dissociation beats rhythm (sinus rhythm with 2:1 block is "more P")
  const order: readonly Relation[] = ['independent', 'more-p', 'no-p', 'retro', '1to1'];
  const rels = findings.map((f) => RELATION_OF[f]).filter((r): r is Relation => !!r);
  return order.find((r) => rels.includes(r)) ?? null;
}

export function makePqrsRelation() {
  return async (ctx: GenCtx): Promise<Item> => {
    const pool = focusPool(ctx, specPool(ctx.spec).filter((s) => relationOf(s.findings) !== null));
    const d = await drawSynth(ctx, pool, {
      // draw balance: AF with complete block is drawn with the complete-block tracings (as before), keyed 'no-p'
      choose: chooseByClass((s) => (s.findings.includes('av-block-3') ? 'independent' : relationOf(s.findings)), ['1to1', 'more-p', 'independent', 'retro', 'no-p'] as const),
      accept: (x) => relationOf(x.truth.findings) !== null,
    });
    const rel = relationOf(d.truth.findings) as Relation;
    const afBlock = rel === 'no-p' && d.truth.findings.includes('av-block-3');
    const afPaced = rel === 'no-p' && !afBlock && d.truth.findings.includes('paced-rhythm');
    return {
      ...base(ctx, {
        prompt: L('P波与QRS是什么关系？', 'What is the relationship between P waves and QRS complexes?', '¿Qué relación hay entre las ondas P y los QRS?'),
        explanation: join([
          afBlock ? AF_COMPLETE_BLOCK : afPaced ? AF_PACED : RELATION_EXPLAIN[rel],
          rel === 'independent' ? (d.truth.findings.some((f) => f === 'av-block-3' || f === 'av-block-high-grade') ? DISSOCIATION_WITH_BLOCK : DISSOCIATION_WITHOUT_BLOCK) : null,
          tpl(L('节律：{r}。', 'Rhythm: {r}.', 'Ritmo: {r}.'), { r: fname(d.truth.rhythm) }),
        ]),
        ecg: d.source,
        findings: d.truth.findings.filter((f) => (RELATION_OF[f] === rel || (afBlock && f === 'av-block-3')) && f !== 'normal-ecg' && f !== 'sinus-rhythm'),
        view: { layout: 'strip', lead: 'II', calipers: true },
        reveal: atrialMarks(d.truth),
        hint: L('先在II导联标出所有P波（包括藏在T波里的），再看每个P波后是否有QRS。', 'First mark every P wave in lead II (including those hidden in T waves), then check whether each is followed by a QRS.', 'Marca primero todas las P en II (incluidas las ocultas en la T) y después comprueba si a cada una le sigue un QRS.'),
      }),
      kind: 'choice',
      key: { options: RELATION_OPTS, correct: rel },
    };
  };
}

// ── 10-second triage (x3) ────────────────────────────────────────────────────────────────────────────────────────
const TRIAGE_OPTS: readonly Option[] = [
  { id: 'critical', label: L('立即处理（马上呼叫上级/启动急救）', 'Act now (call for help / activate the team)', 'Actuar ya (pedir ayuda / activar al equipo)') },
  { id: 'major', label: L('当天尽快评估', 'Prompt review today', 'Revisión preferente hoy') },
  { id: 'routine', label: L('常规处理', 'Routine', 'Rutinario') },
];

export function makeTriage() {
  return async (ctx: GenCtx): Promise<Item> => {
    const pool = focusPool(ctx, specPool(ctx.spec));
    const classOf = (s: ScenarioDef): Triage => triageOf(s.findings);
    const d = await drawSynth(ctx, pool, {
      choose: chooseByClass(classOf, ['critical', 'major', 'routine'] as const),
    });
    const qtc = triageQtc(d.truth);
    const level = triageOf(d.truth.findings, { qtcMs: qtc.ms });
    const preexcitedAf = isPreexcitedAf(d.truth.findings);
    const key = preexcitedAf ? 'wpw' : keyFinding(d.truth.findings);
    const longQt = d.truth.findings.includes('long-qt') && !d.truth.findings.includes('torsades');
    const explanation = join([
      preexcitedAf
        ? L(
            '关键表现：预激伴心房颤动——快速、宽大、绝对不规则的QRS，宽度逐搏变化（不同程度的融合）。经旁路下传的房颤可蜕变为心室颤动：立即处理。不稳定时同步电复律；稳定时可用普鲁卡因胺或伊布利特；禁用房室结阻滞药（腺苷、维拉帕米/地尔硫䓬、β受体阻滞剂、地高辛、静脉胺碘酮）。',
            'Key finding: pre-excited atrial fibrillation — fast, broad, irregularly irregular QRS complexes whose width changes from beat to beat (variable fusion). AF conducted over an accessory pathway can degenerate into VF: act now. Synchronised cardioversion if unstable; procainamide or ibutilide if stable; no AV-nodal blockers (adenosine, verapamil/diltiazem, beta-blockers, digoxin, IV amiodarone).',
            'Hallazgo clave: fibrilación auricular preexcitada: QRS rápidos, anchos e irregularmente irregulares cuya anchura cambia latido a latido (fusión variable). La FA conducida por una vía accesoria puede degenerar en FV: actúa ya. Cardioversión sincronizada si hay inestabilidad; procainamida o ibutilida si está estable; nada de bloqueantes del nodo AV (adenosina, verapamilo/diltiazem, betabloqueantes, digoxina, amiodarona i.v.).',
          )
        : null,
      !preexcitedAf && key ? tpl(L('关键表现：{k}。', 'Key finding: {k}.', 'Hallazgo clave: {k}.'), { k: fname(key) }) : null,
      !preexcitedAf && key ? hallmark(key) : null,
      longQt
        ? tpl(
            qtc.ms >= LONG_QT_ACT_NOW_MS
              ? L(
                  'QTc约{q} ms（{f}），≥{lim} ms：尖端扭转型室速风险高——立即处理：心电监护，纠正血钾、血镁，停用延长QT的药物。',
                  'QTc ≈ {q} ms ({f}), at or above {lim} ms: high risk of torsades — act now: monitor, correct potassium and magnesium, stop QT-prolonging drugs.',
                  'QTc ≈ {q} ms ({f}), igual o superior a {lim} ms: riesgo alto de torsade de pointes; actúa ya: monitorización, corrige potasio y magnesio y retira los fármacos que alargan el QT.',
                )
              : L(
                  'QTc约{q} ms（{f}），<{lim} ms，且无尖端扭转型室速或晕厥：当天评估——查血钾、血镁、血钙，核对用药。',
                  'QTc ≈ {q} ms ({f}), below {lim} ms, with no torsades or syncope: review it today — check potassium, magnesium and calcium and the drug list.',
                  'QTc ≈ {q} ms ({f}), por debajo de {lim} ms, sin torsade de pointes ni síncope: revísalo hoy; comprueba potasio, magnesio y calcio y la lista de fármacos.',
                ),
            { q: Math.round(qtc.ms), f: qtc.formula === 'bazett' ? 'Bazett' : 'Fridericia', lim: LONG_QT_ACT_NOW_MS },
          )
        : null,
      level === 'critical'
        ? L('这是“不能漏诊”的表现：需要立即行动。', 'This is a can’t-miss finding: it needs action now.', 'Es un hallazgo que no se puede pasar por alto: requiere actuar ya.')
        : level === 'major'
          ? L('临床重要但不需要立即抢救：当天评估。', 'Clinically important but not an emergency: review it today.', 'Clínicamente importante pero no urgente: revísalo hoy.')
          : L('无需紧急处理。', 'Nothing that needs urgent action.', 'Nada que requiera actuación urgente.'),
      d.truth.findings.includes('brugada-type1') && level !== 'critical'
        ? L(
            'Brugada 1型图形绝不能漏诊，但若无晕厥、心律失常或发热，应当天请心脏专科评估，而非启动抢救；有发热时立即退热，并停用钠通道阻滞剂。',
            'A Brugada type 1 pattern must never be missed, but without syncope, arrhythmia or fever it needs a same-day cardiology review rather than a resuscitation call; treat any fever at once and stop sodium-channel blockers.',
            'Un patrón de Brugada tipo 1 nunca debe pasarse por alto, pero sin síncope, arritmias ni fiebre requiere una valoración por cardiología el mismo día, no activar al equipo de reanimación; trata la fiebre de inmediato y retira los bloqueantes de los canales de sodio.',
          )
        : null,
    ]);
    return {
      ...base(ctx, {
        prompt: L('10秒分诊：这份心电图有多紧急？', '10-second triage: how urgent is this ECG?', 'Triaje en 10 segundos: ¿qué urgencia tiene este ECG?'),
        explanation,
        ecg: d.source,
        findings: preexcitedAf ? ['atrial-fibrillation', 'wpw'] : key ? [key] : [],
        reveal: key ? revealFor(d, key) : [],
      }),
      kind: 'choice',
      key: { options: TRIAGE_OPTS, correct: level },
    };
  };
}

// ── wide-complex tachycardia (T stage): ventricular rhythm or a supraventricular one conducted wide ────────────────
/** Option id of "supraventricular tachycardia with aberrancy or pre-excitation" (not a finding: a class of WCT). */
export const SVT_WIDE = 'svt-wide';

export const SVT_WIDE_OPTION: Option = {
  id: SVT_WIDE,
  label: L('室上性心动过速伴差异性传导或预激', 'SVT with aberrancy or pre-excitation', 'TSV con aberrancia o preexcitación'),
};

const SV_RHYTHMS: readonly FindingId[] = ['svt', 'avnrt', 'avrt', 'atrial-tachycardia', 'atrial-flutter', 'atrial-fibrillation', 'sinus-tachycardia', 'mat'];
const WIDE_CONDUCTION: readonly FindingId[] = ['wpw', 'aberrant-conduction', 'lbbb', 'rbbb'];

/** Declared findings of a supraventricular rhythm conducted with a wide QRS (accessory pathway, aberrancy or BBB). */
export function isSupraventricularWide(fs: readonly FindingId[]): boolean {
  return fs.some((f) => SV_RHYTHMS.includes(f)) && fs.some((f) => WIDE_CONDUCTION.includes(f));
}

const declaredOf = (s: ScenarioDef, variant?: string): readonly FindingId[] => (variant ? (s.variants?.[variant]?.findings ?? s.findings) : s.findings);

const PREEXCITED_AF = L(
  '预激伴心房颤动：快速、宽大、绝对不规则的QRS，宽度逐搏变化（不同程度的融合）。可蜕变为心室颤动；禁用房室结阻滞药，不稳定时同步电复律。',
  'Pre-excited AF: fast, broad, irregularly irregular QRS complexes whose width changes from beat to beat (variable fusion). It can degenerate into VF; no AV-nodal blockers, synchronised cardioversion if unstable.',
  'FA preexcitada: QRS rápidos, anchos e irregularmente irregulares cuya anchura cambia latido a latido (fusión variable). Puede degenerar en FV; nada de bloqueantes del nodo AV y cardioversión sincronizada si hay inestabilidad.',
);
const ANTIDROMIC = L(
  '逆向型房室折返性心动过速：规则的宽QRS心动过速，QRS完全预激（起始部为δ波样顿挫），激动经旁路前传、经房室结逆传。它酷似室速；支持室速的是房室分离、V4–V6以负向为主、V2–V6出现QR型（Steurer标准）。',
  'Antidromic AVRT: a regular wide tachycardia with fully pre-excited QRS complexes (a slurred, delta-like onset), conducted down the accessory pathway and back up the AV node. It mimics VT; AV dissociation, predominantly negative QRS in V4–V6 or a QR in V2–V6 would favour VT (Steurer criteria).',
  'TRAV antidrómica: taquicardia regular de QRS ancho con preexcitación máxima (inicio empastado, como una onda delta), que baja por la vía accesoria y sube por el nodo AV. Imita una TV; la disociación AV, un QRS predominantemente negativo en V4–V6 o un QR en V2–V6 orientarían a TV (criterios de Steurer).',
);
const ABERRANT_SVT = L(
  '室上性心动过速伴差异性传导：宽QRS呈典型的束支阻滞形态（如V1 rsR′、V6 qRs），每个QRS与心房激动相关联。',
  'SVT with aberrancy: the wide QRS has a typical bundle-branch-block shape (e.g. rsR′ in V1 with qRs in V6), and every QRS is linked to atrial activity.',
  'TSV con aberrancia: el QRS ancho tiene una morfología típica de bloqueo de rama (p. ej., rsR′ en V1 y qRs en V6) y cada QRS está ligado a la actividad auricular.',
);
const WCT_RULE = L(
  '原则：不能明确解释的宽QRS心动过速一律按室速处理（器质性心脏病、房室分离、夺获/融合波和极度电轴偏移支持室速）。',
  'Rule: an unexplained wide-complex tachycardia is VT until proven otherwise (structural heart disease, AV dissociation, capture or fusion beats and an extreme axis favour VT).',
  'Regla: toda taquicardia de QRS ancho no explicada es una TV hasta que se demuestre lo contrario (la cardiopatía estructural, la disociación AV, los latidos de captura o fusión y el eje extremo apoyan la TV).',
);

/**
 * VT and the other ventricular rhythms versus a supraventricular tachycardia conducted wide (antidromic AVRT,
 * pre-excited AF, and any SVT-with-aberrancy scenario the catalogue gains). Option ids: the ventricular findings plus
 * SVT_WIDE; the SVT-wide option is always offered, so every item tests the VT-vs-aberrancy decision.
 */
export function makeWideTachy(cfg: { readonly options: readonly FindingId[]; readonly prompt: L10n }) {
  return async (ctx: GenCtx): Promise<Item> => {
    const all = specPool(ctx.spec);
    const keep = variantAllowed(ctx.spec);
    const svCapable = (s: ScenarioDef) => isSupraventricularWide(s.findings) || Object.values(s.variants ?? {}).some((v) => keep(v.findings) && isSupraventricularWide(v.findings ?? s.findings));
    const classOf = (s: ScenarioDef): string | null => s.findings.find((f) => cfg.options.includes(f)) ?? (svCapable(s) ? SVT_WIDE : null);
    const pool0 = all.filter((s) => classOf(s) !== null);
    const focusClass = ctx.focus && (cfg.options.includes(ctx.focus) ? ctx.focus : WIDE_CONDUCTION.includes(ctx.focus) ? SVT_WIDE : null);
    const focused = focusClass ? pool0.filter((s) => classOf(s) === focusClass) : [];
    const pool = focused.length ? focused : pool0;
    const classes = [...cfg.options, SVT_WIDE].filter((c) => pool.some((s) => classOf(s) === c));
    const targetOfWide = (x: SynthDraw): string | null => {
      const t = x.truth;
      if (isSupraventricularWide(t.findings) && t.qrsMs >= 120 && t.hrBpm > 100) return SVT_WIDE;
      for (const f of declaredOf(x.scenario, x.req.variant)) if (cfg.options.includes(f) && t.findings.includes(f)) return f;
      return null;
    };
    const d = await drawSynth(ctx, pool, {
      choose: chooseByClass(classOf, classes),
      // a scenario that is supraventricular-wide only in a variant (avrt → antidromic) is always drawn as that variant
      variant: (rng, s) => {
        if (classOf(s) === SVT_WIDE && !isSupraventricularWide(s.findings)) {
          const ids = Object.entries(s.variants ?? {})
            .filter(([, v]) => keep(v.findings) && isSupraventricularWide(v.findings ?? s.findings))
            .map(([id]) => id)
            .sort();
          return ids.length ? rng.pick(ids) : undefined;
        }
        return someVariant(0.4, (fs) => keep(fs) && !(fs && isSupraventricularWide(fs)))(rng, s);
      },
      accept: (x) => targetOfWide(x) !== null,
    });
    const target = targetOfWide(d) as string;
    const svt = target === SVT_WIDE;
    const others = cfg.options.filter((f) => f !== target && !d.truth.findings.includes(f));
    const distract: string[] = svt
      ? [...(others.includes('vt-monomorphic') ? ['vt-monomorphic'] : []), ...d.rng.shuffle(others.filter((f) => f !== 'vt-monomorphic'))].slice(0, 3)
      : [SVT_WIDE, ...pickDistractors(d.rng, target as FindingId, cfg.options, d.truth.findings, 2)];
    const options: Option[] = d.rng.shuffle([target, ...distract]).map((id) => (id === SVT_WIDE ? SVT_WIDE_OPTION : findingOption(id as FindingId)));
    const svFindings = d.truth.findings.filter((f) => f === 'avrt' || f === 'wpw' || f === 'atrial-fibrillation' || f === 'aberrant-conduction');
    const explanation = join([
      tpl(L('答案：{t}。', 'Answer: {t}.', 'Respuesta: {t}.'), { t: svt ? SVT_WIDE_OPTION.label : fname(target as FindingId) }),
      svt ? (isPreexcitedAf(d.truth.findings) ? PREEXCITED_AF : d.truth.findings.includes('wpw') ? ANTIDROMIC : ABERRANT_SVT) : hallmark(target as FindingId),
      WCT_RULE,
    ]);
    return {
      ...base(ctx, {
        prompt: cfg.prompt,
        explanation,
        ecg: d.source,
        findings: svt ? svFindings : [target as FindingId],
        reveal: revealFor(d, svt ? (d.truth.findings.includes('wpw') ? 'wpw' : (svFindings[0] ?? 'aberrant-conduction')) : (target as FindingId)),
      }),
      kind: 'choice',
      key: { options, correct: target },
    };
  };
}
