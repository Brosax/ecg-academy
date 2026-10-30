/**
 * Occlusion calls (stage I): for a chest-pain ECG commit to "occlusion likely" (+ territory), "indeterminate — repeat
 * the ECG / record extra leads", or "not an occlusion" (+ name the mimic). The call is derived from the truth findings
 * (src/practice/core/truth.ts `occlusionCallOf`): STEMI, STEMI equivalents and Sgarbossa-positive LBBB / pacing →
 * occlusion; LBBB / ventricular pacing without Sgarbossa criteria → indeterminate, managed as a possible occlusion while
 * symptoms continue (2023 ESC ACS guideline); hyperacute T waves alone → indeterminate, "probable occlusion" (lesson i7);
 * regional ischaemic ST depression / T inversion → indeterminate; named mimics → not occlusion. Scoring weights misses
 * over false activations (grade.ts).
 *
 * Explanations quote only what the tracing shows: millimetre thresholds (Fourth Universal Definition of MI, Thygesen
 * 2018; 2023 ESC ACS guideline) are stated as met only when two contiguous leads meet them for this patient's sex and
 * age; Sgarbossa / Smith-modified criteria are listed with the leads that meet them on the signal.
 */
import type { FindingId } from '../../../core/findings';
import type { L10n } from '../../../core/l10n';
import type { StdLead } from '../../../core/leads';
import type { Item, Option } from '../../api';
import { hallmark } from '../hallmarks';
import { fmtStMm, fname, join, L, list, tpl } from '../text';
import {
  INDETERMINATE_FINDINGS,
  middleBeat,
  OCCLUSION_CONFOUNDERS,
  OCCLUSION_FINDINGS,
  OCCLUSION_MIMICS,
  occlusionCallOf,
  PROBABLE_OCCLUSION_FINDINGS,
  TERRITORIES,
  type OcclusionCall,
  type TerritoryId,
} from '../truth';
import { contextHallmark, revealFor, stemiLeadsMet, thresholdText } from './choice';
import { base, chooseByClass, drawSynth, focusPool, qrsExtremes, someVariant, specPool, variantAllowed, type GenCtx, type PoolSel, type SynthDraw } from './common';

export const OCCLUSION_POOL_FINDINGS: readonly FindingId[] = [...OCCLUSION_FINDINGS, ...PROBABLE_OCCLUSION_FINDINGS, ...INDETERMINATE_FINDINGS, 'lbbb', ...OCCLUSION_MIMICS];

/** Scenario selectors of the occlusion family: the findings above plus the ventricular-paced rhythms (AAI pacing has a
 *  narrow QRS and is read with the usual criteria, so it is not a confounder and not in the pool). */
export const OCCLUSION_POOL: readonly PoolSel[] = [...OCCLUSION_POOL_FINDINGS.map((finding) => ({ finding })), { id: 'paced-vvi' }, { id: 'paced-ddd' }, { id: 'paced-biv' }];

export const TERRITORY_OPTIONS: readonly Option[] = [
  { id: 'anterior', label: L('前壁（前降支）', 'Anterior (LAD)', 'Anterior (DA)') },
  { id: 'inferior', label: L('下壁（右冠/回旋支）', 'Inferior (RCA / LCx)', 'Inferior (CD / Cx)') },
  { id: 'lateral', label: L('侧壁（回旋支/对角支）', 'Lateral (LCx / diagonal)', 'Lateral (Cx / diagonal)') },
  { id: 'posterior', label: L('后壁（回旋支/右冠）', 'Posterior (LCx / RCA)', 'Posterior (Cx / CD)') },
];

const PRESENTATION: readonly L10n[] = [
  L('胸痛40分钟。', 'Chest pain for 40 minutes.', 'Dolor torácico de 40 minutos.'),
  L('胸部压迫感伴出汗1小时。', 'Chest pressure and sweating for one hour.', 'Opresión torácica y sudoración desde hace una hora.'),
  L('间断胸痛，目前仍有症状。', 'Intermittent chest pain, still present now.', 'Dolor torácico intermitente, todavía presente.'),
];

const INDETERMINATE_ADVICE = L(
  '本图没有闭塞图形，但有缺血：15–30分钟内（症状变化时立即）复查心电图，可疑时加做V7–V9/V4R，并动态复查肌钙蛋白。',
  'No occlusion pattern on this tracing, but there is ischaemia: repeat the ECG in 15–30 minutes (at once if symptoms change), add V7–V9 / V4R when suspicious, and follow serial troponins.',
  'No hay patrón de oclusión en este trazado, pero sí isquemia: repite el ECG en 15–30 minutos (de inmediato si cambian los síntomas), añade V7–V9 / V4R si hay sospecha y sigue la troponina seriada.',
);

const PROBABLE_ADVICE = L(
  '按“很可能的闭塞”处理：15–30分钟内（疼痛变化时立即）复查心电图，观察ST段是否演变为抬高；加做V7–V9/V4R，对比旧图，动态复查肌钙蛋白。胸痛持续而心电图不能确诊时，应立即行冠状动脉造影（2023 ESC指南）。',
  'Manage it as a probable occlusion: repeat the ECG in 15–30 minutes (at once if the pain changes) and watch for evolving ST elevation; record V7–V9 / V4R, compare with an old tracing and follow serial troponins. Ongoing pain with a non-diagnostic ECG calls for immediate angiography (2023 ESC guideline).',
  'Trátalo como una oclusión probable: repite el ECG en 15–30 minutos (de inmediato si cambia el dolor) buscando la evolución a elevación del ST; registra V7–V9 / V4R, compara con un trazado previo y sigue la troponina seriada. El dolor persistente con un ECG no diagnóstico exige una coronariografía inmediata (guía ESC 2023).',
);

const CONFOUNDER_ADVICE = L(
  '但患者仍有缺血症状：按2023 ESC指南，束支阻滞或起搏心律伴持续症状应按“可能的闭塞”处理——立即与导管室讨论紧急冠状动脉造影；同时对比旧图，15–30分钟内复查心电图（症状变化时立即），床旁超声看节段性室壁运动，并动态复查肌钙蛋白。',
  'But the symptoms are ongoing: under the 2023 ESC guideline a bundle-branch block or paced rhythm with ongoing ischaemic symptoms is managed as a possible occlusion — discuss urgent angiography with the cath lab now; meanwhile compare with an old ECG, repeat the ECG in 15–30 minutes (at once if symptoms change), look for a regional wall-motion abnormality on bedside echo and follow serial troponins.',
  'Pero los síntomas persisten: según la guía ESC 2023, un bloqueo de rama o un ritmo de marcapasos con síntomas isquémicos persistentes se maneja como una posible oclusión; comenta ya con hemodinámica una coronariografía urgente y, mientras, compara con un ECG previo, repite el ECG en 15–30 minutos (de inmediato si cambian los síntomas), busca una alteración segmentaria de la contractilidad con ecografía a pie de cama y sigue la troponina seriada.',
);

// ── STEMI millimetre criterion (UDMI 2018): helpers live in ./choice (shared with the territory family) ─────────
export { stemiLeadsMet, stemiThresholdMv } from './choice';

const stOf = (d: SynthDraw, l: StdLead) => `${l} ${fmtStMm(d.truth.stMv[l] ?? 0)}`;

/** Leads with reciprocal (≥ 0.5 mm) ST depression, largest first. */
function depressedLeads(d: SynthDraw, max = 4): StdLead[] {
  return (Object.entries(d.truth.stMv) as [StdLead, number][])
    .filter(([l, v]) => l !== 'aVR' && typeof v === 'number' && v <= -0.05)
    .sort((a, b) => a[1] - b[1])
    .slice(0, max)
    .map(([l]) => l);
}

function stemiEvidence(d: SynthDraw, target: FindingId, sex: 'female' | 'male', ageY: number): (L10n | null)[] {
  const t = d.truth;
  if (target === 'stemi-posterior') return [contextHallmark('stemi-posterior', d)];
  if (target === 'de-winter') return [hallmark('de-winter')];
  const met = stemiLeadsMet(t.stMv, sex, ageY);
  const wall = target === 'stemi-inferior' || target === 'rv-infarction' ? contextHallmark('stemi-inferior', d) : null;
  const out: (L10n | null)[] = [];
  if (met.length >= 2) {
    out.push(
      tpl(L('达到STEMI标准：≥2个相邻导联ST段抬高（{x}；阈值——{th}）。', 'STEMI criterion met: ST elevation in ≥ 2 contiguous leads ({x}; thresholds for {th}).', 'Cumple el criterio de IAMCEST: elevación del ST en ≥ 2 derivaciones contiguas ({x}; umbrales para {th}).'), {
        x: met.map((l) => stOf(d, l)).join(', '),
        th: thresholdText(sex, ageY),
      }),
    );
  } else {
    const up = (Object.entries(t.stMv) as [StdLead, number][]).filter(([l, v]) => l !== 'aVR' && typeof v === 'number').sort((a, b) => b[1] - a[1])[0];
    const support = [
      t.findings.includes('hyperacute-t') ? L('超急性期T波', 'hyperacute T waves', 'ondas T hiperagudas') : null,
      depressedLeads(d).length ? L('对应性ST段压低', 'reciprocal ST depression', 'descenso recíproco del ST') : null,
      t.findings.includes('pathological-q') ? L('病理性Q波', 'pathological Q waves', 'ondas Q patológicas') : null,
    ].filter((x): x is L10n => x !== null);
    out.push(
      tpl(
        L(
          '未达到STEMI毫米标准（最大抬高{x}；阈值——{th}）。闭塞的判断依据是{s}加上持续胸痛：闭塞性心肌梗死不需要达到毫米标准——按闭塞处理，并在15–30分钟内复查心电图。',
          'The STEMI millimetre criterion is not met (largest elevation {x}; thresholds for {th}). The occlusion call rests on {s} with ongoing pain: an occlusion MI does not need the millimetres — treat it as an occlusion and repeat the ECG within 15–30 minutes.',
          'No cumple el criterio milimétrico de IAMCEST (elevación máxima {x}; umbrales para {th}). La decisión de oclusión se apoya en {s} con dolor persistente: un IAM oclusivo no necesita los milímetros; trátalo como oclusión y repite el ECG en 15–30 minutos.',
        ),
        { x: up ? stOf(d, up[0]) : '—', th: thresholdText(sex, ageY), s: support.length ? list(support) : L('图形', 'the pattern', 'el patrón') },
      ),
    );
  }
  if (wall) out.push(wall);
  if (target === 'rv-infarction') {
    const v1 = t.stMv.V1 ?? 0;
    const v2 = t.stMv.V2 ?? 0;
    out.push(
      v1 > v2 && v1 >= 0.05
        ? tpl(L('V1抬高（{a}）大于V2（{b}）提示右心室受累：加做V4R，ST段抬高≥1 mm即可确认。', 'ST elevation in V1 ({a}) above V2 ({b}) suggests right-ventricular involvement: record V4R — ST elevation ≥ 1 mm there confirms it.', 'La elevación del ST en V1 ({a}) mayor que en V2 ({b}) sugiere afectación del ventrículo derecho: registra V4R; una elevación ≥ 1 mm lo confirma.'), {
            a: fmtStMm(v1),
            b: fmtStMm(v2),
          })
        : L('下壁闭塞时加做V4R：ST段抬高≥1 mm提示右心室受累。', 'With an inferior occlusion record V4R: ST elevation ≥ 1 mm there means right-ventricular involvement.', 'En una oclusión inferior registra V4R: una elevación del ST ≥ 1 mm indica afectación del ventrículo derecho.'),
    );
  }
  return out;
}

// ── Sgarbossa / Smith-modified Sgarbossa (LBBB or ventricular pacing) ─────────────────────────────────────────────
export interface SgarbossaReading {
  /** concordant ST elevation ≥ 1 mm (lead with a positive QRS) */
  readonly concordantElevation: readonly StdLead[];
  /** concordant ST depression ≥ 1 mm in V1–V3 (negative QRS) */
  readonly concordantDepression: readonly StdLead[];
  /** excessively discordant ST elevation: ≥ 1 mm and ST/S ≤ −0.25 (negative QRS) */
  readonly smith: readonly { readonly lead: StdLead; readonly ratio: number; readonly sMv: number }[];
  /** the most discordant ST/S ratio among negative-QRS leads with ST elevation ≥ 0.5 mm (null when none) */
  readonly worst: { readonly lead: StdLead; readonly ratio: number; readonly sMv: number } | null;
}

const LEADS12: readonly StdLead[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

/** Read the (Smith-modified) Sgarbossa criteria off a dominant beat of the signal. */
export function readSgarbossa(d: Pick<SynthDraw, 'ecg' | 'truth'>): SgarbossaReading {
  const t = d.truth;
  // the beat ST is measured on (truth.stMv is read on the dominant, non-aberrant complex)
  const k = middleBeat(t, d.ecg.signal.durationMs, (b) => !b.aberrant);
  const ce: StdLead[] = [];
  const cd: StdLead[] = [];
  const sm: { lead: StdLead; ratio: number; sMv: number }[] = [];
  let worst: { lead: StdLead; ratio: number; sMv: number } | null = null;
  if (k < 0) return { concordantElevation: ce, concordantDepression: cd, smith: sm, worst };
  const beat = t.beats[k];
  for (const l of LEADS12) {
    const st = t.stMv[l] ?? 0;
    const { hi, lo } = qrsExtremes(d.ecg, l, beat);
    const positive = hi + lo > 0;
    if (positive && st >= 0.1) ce.push(l);
    if (!positive && st <= -0.1 && (l === 'V1' || l === 'V2' || l === 'V3')) cd.push(l);
    if (!positive && st >= 0.05 && lo < -0.05) {
      const ratio = st / lo;
      if (st >= 0.1 && ratio <= -0.25) sm.push({ lead: l, ratio, sMv: lo });
      if (!worst || ratio < worst.ratio) worst = { lead: l, ratio, sMv: lo };
    }
  }
  return { concordantElevation: ce, concordantDepression: cd, smith: sm, worst };
}

const ratioText = (x: { lead: StdLead; ratio: number; sMv: number }, d: SynthDraw) =>
  `${x.lead} ${fmtStMm(d.truth.stMv[x.lead] ?? 0)} / S ${fmtStMm(x.sMv)} = ${x.ratio.toFixed(2).replace('-', '−')}`;

function sgarbossaEvidence(d: SynthDraw): L10n {
  const r = readSgarbossa(d);
  const parts: L10n[] = [];
  if (r.concordantElevation.length)
    parts.push(tpl(L('同向性ST段抬高≥1 mm：{x}', 'concordant ST elevation ≥ 1 mm: {x}', 'elevación concordante del ST ≥ 1 mm: {x}'), { x: r.concordantElevation.map((l) => stOf(d, l)).join(', ') }));
  if (r.concordantDepression.length)
    parts.push(tpl(L('V1–V3同向性ST段压低≥1 mm：{x}', 'concordant ST depression ≥ 1 mm in V1–V3: {x}', 'descenso concordante del ST ≥ 1 mm en V1–V3: {x}'), { x: r.concordantDepression.map((l) => stOf(d, l)).join(', ') }));
  if (r.smith.length)
    parts.push(tpl(L('过度的反向ST段抬高（ST/S ≤−0.25，Smith）：{x}', 'excessively discordant ST elevation (ST/S ≤ −0.25, Smith): {x}', 'elevación discordante excesiva del ST (ST/S ≤ −0,25, Smith): {x}'), { x: r.smith.map((s) => ratioText(s, d)).join(', ') }));
  const head = L(
    '左束支阻滞或心室起搏使常规STEMI毫米阈值失效，改用（Smith改良的）Sgarbossa标准。',
    'LBBB or ventricular pacing invalidates the usual STEMI millimetre thresholds: read it with the (Smith-modified) Sgarbossa criteria.',
    'El BRI o la estimulación ventricular anulan los umbrales milimétricos habituales del IAMCEST: léelo con los criterios de Sgarbossa (modificados por Smith).',
  );
  if (!parts.length) return join([head, hallmark('sgarbossa-positive')]);
  return join([head, tpl(L('本图符合：{x}。', 'Met on this tracing: {x}.', 'Se cumplen en este trazado: {x}.'), { x: join(parts, L('；', '; ', '; ')) })]);
}

function confounderEvidence(d: SynthDraw, target: FindingId): L10n {
  const r = readSgarbossa(d);
  const what =
    target === 'paced-rhythm'
      ? L('心室起搏', 'Ventricular pacing', 'La estimulación ventricular')
      : d.truth.findings.includes('aberrant-conduction')
        ? L('频率依赖性左束支阻滞', 'Rate-dependent LBBB', 'El BRI dependiente de la frecuencia')
        : L('左束支阻滞', 'LBBB', 'El BRI');
  const consistent = r.concordantElevation.length === 0 && r.concordantDepression.length === 0 && r.smith.length === 0;
  return join([
    consistent
      ? tpl(
          L(
            '{w}使常规STEMI毫米阈值失效（反向的ST-T改变属于预期），因此用（Smith改良的）Sgarbossa标准判断：本图无同向性ST段抬高≥1 mm，V1–V3无同向性ST段压低≥1 mm，反向ST段抬高也未达ST/S ≤−0.25。',
            '{w} invalidates the usual STEMI millimetre thresholds (discordant ST–T change is expected), so read it with the (Smith-modified) Sgarbossa criteria: no concordant ST elevation ≥ 1 mm, no concordant ST depression ≥ 1 mm in V1–V3, and no discordant ST elevation reaching ST/S ≤ −0.25.',
            '{w} anula los umbrales milimétricos habituales del IAMCEST (el ST-T discordante es esperable), así que se lee con los criterios de Sgarbossa (modificados por Smith): no hay elevación concordante del ST ≥ 1 mm, ni descenso concordante ≥ 1 mm en V1–V3, ni elevación discordante que llegue a ST/S ≤ −0,25.',
          ),
          { w: what },
        )
      : tpl(
          L(
            '{w}使常规STEMI毫米阈值失效（反向的ST-T改变属于预期），需用（Smith改良的）Sgarbossa标准判断。',
            '{w} invalidates the usual STEMI millimetre thresholds (discordant ST–T change is expected): read it with the (Smith-modified) Sgarbossa criteria.',
            '{w} anula los umbrales milimétricos habituales del IAMCEST (el ST-T discordante es esperable): léelo con los criterios de Sgarbossa (modificados por Smith).',
          ),
          { w: what },
        ),
    consistent && r.worst && !d.truth.findings.includes('aberrant-conduction')
      ? tpl(L('最明显的反向抬高：{x}（高于−0.25）。', 'Most discordant lead: {x} (above −0.25).', 'Derivación más discordante: {x} (por encima de −0,25).'), { x: ratioText(r.worst, d) })
      : null,
    d.truth.findings.includes('aberrant-conduction')
      ? L(
          '频率依赖性阻滞时，正常下传的窄QRS搏动按常规标准判读，宽QRS搏动按Sgarbossa标准判读。',
          'With a rate-dependent block, read the normally conducted narrow beats with the usual criteria and the wide beats with Sgarbossa.',
          'Con un bloqueo dependiente de la frecuencia, lee los latidos estrechos conducidos normalmente con los criterios habituales y los anchos con Sgarbossa.',
        )
      : null,
    CONFOUNDER_ADVICE,
  ]);
}

// ── the generator ────────────────────────────────────────────────────────────────────────────────────────────────
const CALL_LINE: Readonly<Record<'occlusion' | 'confounder' | 'probable' | 'ischemia', L10n>> = {
  occlusion: L('可能为急性冠状动脉闭塞——立即再灌注', 'occlusion likely — immediate reperfusion', 'oclusión probable: reperfusión inmediata'),
  confounder: L(
    '不能确定（左束支阻滞/起搏，Sgarbossa阴性）——症状持续时按可能的闭塞处理',
    'indeterminate (LBBB / pacing, Sgarbossa negative) — with ongoing symptoms manage as a possible occlusion',
    'indeterminado (BRI / marcapasos, Sgarbossa negativo): con síntomas persistentes, manéjalo como una posible oclusión',
  ),
  probable: L('不能确定——很可能为闭塞（超急性期T波，未达STEMI标准）', 'indeterminate — probable occlusion (hyperacute T waves without STEMI criteria)', 'indeterminado: oclusión probable (T hiperagudas sin criterios de IAMCEST)'),
  ischemia: L('不能确定', 'indeterminate', 'indeterminado'),
};

export function makeOcclusion() {
  return async (ctx: GenCtx): Promise<Item> => {
    const inPool = (fs: readonly FindingId[]) => fs.some((f) => OCCLUSION_POOL_FINDINGS.includes(f) || (OCCLUSION_CONFOUNDERS as readonly string[]).includes(f));
    const pool = focusPool(ctx, specPool(ctx.spec).filter((s) => inPool(s.findings)));
    const classOf = (s: { findings: readonly FindingId[] }): OcclusionCall => occlusionCallOf(s.findings).call;
    const d = await drawSynth(ctx, pool, {
      // misses matter most: occlusions are drawn as often as both other calls together
      choose: (rng, p) => chooseByClass(classOf, rng.next() < 0.5 ? (['occlusion'] as const) : (['indeterminate', 'not-occlusion'] as const))(rng, p),
      // variants add variety (e.g. Sgarbossa concordant depression / Smith) — the key follows the realised truth
      variant: someVariant(0.4, variantAllowed(ctx.spec)),
      accept: (x) => {
        const c = occlusionCallOf(x.truth.findings);
        // pacing is a confounder only when the ventricles are paced (wide QRS)
        if (c.target === null || (c.target === 'paced-rhythm' && x.truth.qrsMs < 120)) return false;
        // the signal must agree with the key: a Sgarbossa-negative confounder shows no criterion, a Sgarbossa-positive
        // tracing shows at least one (a scenario that disagrees with its own truth is redrawn, never explained wrongly)
        if (c.reason === 'confounder' || c.reason === 'sgarbossa') {
          const r = readSgarbossa(x);
          const any = r.concordantElevation.length + r.concordantDepression.length + r.smith.length > 0;
          return c.reason === 'sgarbossa' ? any : !any;
        }
        return true;
      },
    });
    const truth = occlusionCallOf(d.truth.findings);
    const target = truth.target as FindingId;
    const mimicOptions =
      truth.call === 'not-occlusion' && truth.mimic
        ? d.rng.shuffle([truth.mimic, ...d.rng.shuffle(OCCLUSION_MIMICS.filter((m) => m !== truth.mimic && !d.truth.findings.includes(m))).slice(0, 3)])
        : d.rng.shuffle([...OCCLUSION_MIMICS]).slice(0, 4);
    const sex = d.scenario.patient?.sex ?? (d.rng.next() < 0.5 ? 'female' : 'male');
    const age = d.scenario.patient?.ageY ?? d.rng.int(38, 82);
    const who =
      sex === 'female'
        ? tpl(L('{a}岁女性。', 'A {a}-year-old woman.', 'Mujer de {a} años.'), { a: age })
        : tpl(L('{a}岁男性。', 'A {a}-year-old man.', 'Varón de {a} años.'), { a: age });
    const prompt = join([
      who,
      d.rng.pick(PRESENTATION),
      L('请判断：可能为急性冠状动脉闭塞、不能确定（复查/加做导联），还是非闭塞（说出类似图形）？', 'Commit: occlusion likely, indeterminate (repeat ECG / extra leads), or not an occlusion (name the mimic)?', 'Decide: ¿oclusión probable, indeterminado (repetir ECG / derivaciones adicionales) o no es una oclusión (nombra el simulador)?'),
    ]);
    const stLeads = Object.entries(d.truth.stMv)
      .filter(([, v]) => typeof v === 'number' && Math.abs(v) >= 0.05)
      .sort((a, b) => Math.abs(b[1] as number) - Math.abs(a[1] as number))
      .slice(0, 6)
      .map(([l, v]) => `${l} ${fmtStMm(v as number)}`);
    const also = d.truth.findings.filter((f) => f !== target && ((OCCLUSION_FINDINGS as readonly string[]).includes(f) || (PROBABLE_OCCLUSION_FINDINGS as readonly string[]).includes(f)));
    const recip = depressedLeads(d);
    const callLine =
      truth.call === 'occlusion'
        ? CALL_LINE.occlusion
        : truth.call === 'not-occlusion'
          ? tpl(L('非闭塞：{m}', 'not an occlusion: {m}', 'no es una oclusión: {m}'), { m: fname(target) })
          : CALL_LINE[truth.reason === 'confounder' ? 'confounder' : truth.reason === 'probable' ? 'probable' : 'ischemia'];
    const territory: TerritoryId | undefined = truth.territory ?? undefined;
    const territoryLine = territory
      ? tpl(L('部位：{t}。', 'Territory: {t}.', 'Territorio: {t}.'), { t: TERRITORY_OPTIONS.find((o) => o.id === territory)?.label ?? territory })
      : null;
    const evidence: (L10n | null)[] =
      truth.reason === 'stemi'
        ? stemiEvidence(d, target, sex, age)
        : truth.reason === 'sgarbossa'
          ? [sgarbossaEvidence(d)]
          : truth.reason === 'confounder'
            ? [confounderEvidence(d, target)]
            : truth.reason === 'probable'
              ? [hallmark(target), PROBABLE_ADVICE]
              : truth.reason === 'ischemia'
                ? [hallmark(target), INDETERMINATE_ADVICE]
                : [hallmark(target)];
    const explanation = join([
      tpl(L('判断：{c}。', 'Call: {c}.', 'Decisión: {c}.'), { c: callLine }),
      ...evidence,
      territoryLine,
      stLeads.length ? tpl(L('J+60 ms处ST偏移：{x}。', 'ST deviation at J+60 ms: {x}.', 'Desviación del ST en J+60 ms: {x}.'), { x: stLeads.join(', ') }) : null,
      truth.reason === 'stemi' && d.truth.findings.includes('reciprocal-changes') && recip.length
        ? tpl(L('对应性ST段压低（{x}）支持真正的闭塞，而不是类似图形。', 'Reciprocal ST depression ({x}) supports a true occlusion rather than a mimic.', 'El descenso recíproco del ST ({x}) apoya una oclusión verdadera y no un simulador.'), {
            x: recip.map((l) => stOf(d, l)).join(', '),
          })
        : null,
      truth.call === 'occlusion' && also.length ? tpl(L('同时存在：{x}。', 'Also present: {x}.', 'También presente: {x}.'), { x: list(also.map(fname)) }) : null,
    ]);
    return {
      ...base(ctx, {
        prompt,
        explanation,
        ecg: d.source,
        findings: [target],
        reveal: revealFor(d, target),
      }),
      kind: 'occlusion',
      key: {
        call: truth.call,
        ...(territory ? { territory } : {}),
        ...(truth.mimic ? { mimic: truth.mimic } : {}),
        mimicOptions,
        territoryOptions: TERRITORY_OPTIONS.filter((o) => (TERRITORIES as readonly string[]).includes(o.id)),
      },
    };
  };
}
