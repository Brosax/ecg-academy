/**
 * Numeric families on synthetic ECGs: heart rate (ventricular / atrial, regular / irregular), interval measurement
 * with calipers (PR, QRS, QT, RR) and QTc by four formulas. Every key is read from the model truth.
 */
import type { BeatMarks } from '../../../core/ecg';
import type { L10n } from '../../../core/l10n';
import type { Lead } from '../../../core/leads';
import type { EcgMark } from '../../../ecg/api';
import type { Item } from '../../api';
import type { MeasureDecoy } from '../extras';
import type { ScenarioDef } from '../../../synth/index';
import { FORMULA_EXPR, FORMULA_NAME, qtcOf, QTC_FORMULAS, rateTolerance, TOL, type QtcFormula } from '../grade';
import { L, tpl } from '../text';
import { isDominant, meanRr, middleBeat } from '../truth';
import { atrialMarks, base, bracket, chooseByClass, clampWindow, drawSynth, focusPool, someVariant, specPool, variantAllowed, type GenCtx, type SynthDraw } from './common';

// ── rate ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface RateCfg {
  readonly which: 'ventricular' | 'atrial';
  /** require a regular / irregular ventricular rhythm (undefined = either) */
  readonly regular?: boolean;
  /** scenarios that must be drawn as one of these variants (e.g. atrial tachycardia only with block for the atrial rate) */
  readonly variants?: Readonly<Record<string, readonly string[]>>;
}

/** Atrial-rate items: atrial tachyarrhythmias with block versus AV blocks, drawn in equal shares. */
function atrialClass(s: ScenarioDef): 'av-block' | 'atrial' {
  return s.findings.some((f) => f.startsWith('av-block')) ? 'av-block' : 'atrial';
}

/**
 * The realised ventricular rate agrees with the rate dial the request asked for (±25 %). A tracing whose rhythm ignores
 * its dial (e.g. an AF draw at 75/min realised at 38/min) is redrawn: the key is always the realised rate, and the
 * realised rate must be the one the scenario was asked to show.
 */
export function rateMatchesDial(d: Pick<SynthDraw, 'req' | 'truth'>): boolean {
  const want = d.req.dials?.rate ?? d.req.dials?.ventricularResponse;
  return want === undefined || want <= 0 || Math.abs(d.truth.hrBpm - want) <= 0.25 * want;
}

/** "Count the QRS complexes on the 10-s strip × 6" — the method irregular items teach. */
export function countTimesSix(truth: SynthDraw['truth'], durationMs: number): number {
  return Math.round((truth.beats.length * 60000) / durationMs);
}

export function makeRate(cfg: RateCfg) {
  return async (ctx: GenCtx): Promise<Item> => {
    const pool = focusPool(ctx, specPool(ctx.spec));
    const keep = variantAllowed(ctx.spec);
    const tolOf = (bpm: number, irregular: boolean) => rateTolerance(bpm, TOL.hrPct, irregular ? TOL.hrMinIrregularBpm : TOL.hrMinBpm);
    const d = await drawSynth(ctx, pool, {
      ...(cfg.which === 'atrial' ? { choose: chooseByClass(atrialClass, ['atrial', 'av-block'] as const) } : {}),
      variant: (rng, s) => {
        const forced = cfg.variants?.[s.id];
        if (forced && forced.length) return rng.pick([...forced].sort());
        return cfg.which === 'atrial' ? someVariant(0.4, keep)(rng, s) : undefined;
      },
      accept: ({ truth, req, ecg }) =>
        truth.beats.length >= 2 &&
        (cfg.which === 'ventricular' || (truth.atrialRateBpm !== null && truth.atrialRateBpm > truth.hrBpm * 1.2)) &&
        (cfg.regular === undefined || truth.regular === cfg.regular) &&
        (cfg.which === 'atrial' || rateMatchesDial({ req, truth })) &&
        // irregular rhythms: the taught count × 6 must land inside the tolerance of the key
        (truth.regular || cfg.which === 'atrial' || Math.abs(countTimesSix(truth, ecg.signal.durationMs) - truth.hrBpm) <= tolOf(truth.hrBpm, true)),
    });
    const { truth, ecg } = d;
    const irregular = !truth.regular;
    const atrial = cfg.which === 'atrial';
    const truthBpm = atrial ? (truth.atrialRateBpm as number) : truth.hrBpm;
    const rr = meanRr(truth);
    const bpm = Math.round(truthBpm);
    const small = rr / 40;
    const large = rr / 200;
    let explanation: L10n;
    if (atrial) {
      const pp = 60000 / truthBpm;
      explanation = tpl(
        L(
          '心房波（P或F）每隔约{pp} ms出现一次：1500 ÷ {sq}小格 ≈ {bpm}次/分。心室率只有{v}次/分，约{ratio}:1下传——数心房率时要找出隐藏在QRS或T波中的心房波。',
          'Atrial waves (P or F) come every ≈ {pp} ms: 1500 ÷ {sq} small squares ≈ {bpm}/min. The ventricular rate is only {v}/min, about {ratio}:1 conduction — find the atrial waves hidden in QRS or T waves too.',
          'Las ondas auriculares (P o F) aparecen cada ≈ {pp} ms: 1500 ÷ {sq} cuadros pequeños ≈ {bpm} lpm. La frecuencia ventricular es solo de {v} lpm, conducción de aproximadamente {ratio}:1; busca también las ondas auriculares ocultas en el QRS o la T.',
        ),
        { pp: Math.round(pp), sq: (pp / 40).toFixed(1), bpm, v: Math.round(truth.hrBpm), ratio: Math.max(1, Math.round(truthBpm / truth.hrBpm)) },
      );
    } else if (irregular) {
      explanation = tpl(
        L(
          '节律不规则，单个RR会误导：10秒内共{n}个QRS × 6 ≈ {six}次/分（参考值按平均RR计算为{bpm}次/分）。',
          'The rhythm is irregular, so a single RR misleads: {n} QRS complexes in 10 s × 6 ≈ {six}/min (the reference, from the mean RR, is {bpm}/min).',
          'El ritmo es irregular y un solo RR engaña: {n} QRS en 10 s × 6 ≈ {six} lpm (la referencia, con el RR medio, es {bpm} lpm).',
        ),
        { n: truth.beats.length, six: countTimesSix(truth, ecg.signal.durationMs), bpm },
      );
    } else {
      explanation = tpl(
        L(
          'RR约{rr} ms = {sq}小格（25 mm/s时每小格40 ms）：1500 ÷ {sq} ≈ {bpm}次/分；或300 ÷ {lg}大格。{cls}',
          'RR ≈ {rr} ms = {sq} small squares (40 ms each at 25 mm/s): 1500 ÷ {sq} ≈ {bpm}/min; or 300 ÷ {lg} large squares. {cls}',
          'RR ≈ {rr} ms = {sq} cuadros pequeños (40 ms cada uno a 25 mm/s): 1500 ÷ {sq} ≈ {bpm} lpm; o 300 ÷ {lg} cuadros grandes. {cls}',
        ),
        {
          rr: Math.round(rr),
          sq: small.toFixed(1),
          lg: large.toFixed(1),
          bpm,
          cls:
            truthBpm < 60
              ? L('<60次/分为心动过缓。', 'Below 60/min is bradycardia.', 'Por debajo de 60 lpm es bradicardia.')
              : truthBpm > 100
                ? L('>100次/分为心动过速。', 'Above 100/min is tachycardia.', 'Por encima de 100 lpm es taquicardia.')
                : L('60–100次/分为正常范围。', '60–100/min is the normal range.', '60–100 lpm es el rango normal.'),
        },
      );
    }
    const hint = atrial
      ? L(
          '找到相邻两个P（或F）波——有的藏在QRS或T波里——用1500除以它们之间的小格数。',
          'Find two consecutive P (or F) waves — some hide in the QRS or T — and divide 1500 by the small squares between them.',
          'Busca dos ondas P (o F) consecutivas, algunas ocultas en el QRS o la T, y divide 1500 entre los cuadros pequeños que las separan.',
        )
      : irregular
        ? L('节律不规则：数10秒内的QRS个数再乘以6。', 'Irregular rhythm: count the QRS complexes on the 10-s strip and multiply by 6.', 'Ritmo irregular: cuenta los QRS de la tira de 10 s y multiplica por 6.')
        : L('数两个R波之间的大格数，用300除（或用1500除以小格数）。', 'Count the large squares between two R waves and divide 300 by it (or 1500 by the small squares).', 'Cuenta los cuadros grandes entre dos R y divide 300 entre ese número (o 1500 entre los cuadros pequeños).');
    const i = middleBeat(truth, ecg.signal.durationMs, (_b, k) => k < truth.beats.length - 1);
    const reveal: EcgMark[] = [];
    if (i >= 0) reveal.push(bracket('II', truth.beats[i].qrsOn, truth.beats[i + 1].qrsOn, 'RR', 'vector'));
    if (atrial) reveal.push(...atrialMarks(truth));
    return {
      ...base(ctx, {
        prompt: atrial
          ? L('心房率是多少（每分钟P波或F波数）？', 'What is the atrial rate (P or F waves per minute)?', '¿Cuál es la frecuencia auricular (ondas P o F por minuto)?')
          : L('心室率是多少（次/分）？', 'What is the ventricular rate (beats per minute)?', '¿Cuál es la frecuencia ventricular (latidos por minuto)?'),
        explanation,
        ecg: d.source,
        findings: [],
        view: { calipers: true },
        reveal,
        hint,
      }),
      kind: 'rate',
      key: { truthBpm, which: cfg.which, tolerancePct: TOL.hrPct, minTolBpm: irregular ? TOL.hrMinIrregularBpm : TOL.hrMinBpm },
    };
  };
}

// ── measure ──────────────────────────────────────────────────────────────────────────────────────────────────────
type What = 'pr' | 'qrs' | 'qt' | 'rr';

const WHAT_NAME: Readonly<Record<What, L10n>> = {
  pr: L('PR间期', 'PR interval', 'intervalo PR'),
  qrs: L('QRS时限', 'QRS duration', 'duración del QRS'),
  qt: L('QT间期', 'QT interval', 'intervalo QT'),
  rr: L('RR间期', 'RR interval', 'intervalo RR'),
};

const MEASURE_HINT: Readonly<Record<What, L10n>> = {
  pr: L('从P波起点量到QRS起点（第一个q或R）。', 'From the start of the P wave to the start of the QRS (the first q or R).', 'Desde el inicio de la onda P hasta el inicio del QRS (la primera q o R).'),
  qrs: L('从QRS起点量到J点（ST段开始处）。', 'From the QRS onset to the J point (where the ST segment begins).', 'Desde el inicio del QRS hasta el punto J (donde empieza el ST).'),
  qt: L(
    '从QRS起点量到T波终点：沿T波下降支最陡处画切线，与基线的交点即T波终点。',
    'From the QRS onset to the end of the T wave: draw a tangent on the steepest part of the T downslope; where it meets the baseline is the T end.',
    'Desde el inicio del QRS hasta el final de la T: traza una tangente en la parte más pendiente de la rama descendente de la T; donde corta la línea de base termina la T.',
  ),
  rr: L('从一个R波顶点量到下一个R波顶点。', 'From one R peak to the next.', 'De un pico de R al siguiente.'),
};

function measureLead(what: What, findings: readonly string[]): Lead {
  if (what === 'qrs' && findings.some((f) => f === 'rbbb' || f === 'lbbb' || f === 'irbbb' || f === 'ilbbb' || f === 'bifascicular-block')) return 'V1';
  if (what === 'qt') return 'V3';
  return 'II';
}

function truthOf(what: What, d: SynthDraw, b: BeatMarks, next: BeatMarks | undefined): number | null {
  const t = d.truth;
  switch (what) {
    case 'pr':
      return t.prMs;
    case 'qrs':
      return t.qrsMs;
    case 'qt':
      return t.qtMs;
    case 'rr':
      return next ? next.qrsOn - b.qrsOn : null;
  }
}

function decoys(what: What, b: BeatMarks, next: BeatMarks | undefined): MeasureDecoy[] {
  const out: MeasureDecoy[] = [];
  if (what === 'qt') {
    if (b.tPeak !== null)
      out.push({
        ms: b.tPeak - b.qrsOn,
        feedback: L('你量到了T波顶点；QT间期终止于T波终点。', 'You measured to the T peak; the QT ends at the end of the T wave.', 'Has medido hasta el pico de la T; el QT termina al final de la onda T.'),
      });
    if (b.uOff !== null)
      out.push({
        ms: b.uOff - b.qrsOn,
        feedback: L('你把U波算进去了；QT在T波终点结束，不包括U波。', 'You included the U wave; the QT stops at the end of the T wave.', 'Has incluido la onda U; el QT termina al final de la T.'),
      });
    if (b.pOn !== null)
      out.push({
        ms: b.tOff - b.pOn,
        feedback: L('你从P波开始量；QT从QRS起点开始。', 'You started at the P wave; the QT starts at the QRS onset.', 'Has empezado en la onda P; el QT empieza al inicio del QRS.'),
      });
  }
  if (what === 'pr' && b.pOn !== null && b.pOff !== null) {
    out.push({
      ms: b.qrsOn - b.pOff,
      feedback: L(
        '你量的是PR段（P波终点到QRS）；PR间期从P波起点开始。',
        'You measured the PR segment (end of P to QRS); the PR interval starts at the beginning of the P wave.',
        'Has medido el segmento PR (final de la P al QRS); el intervalo PR empieza al inicio de la P.',
      ),
    });
    out.push({
      ms: b.pOff - b.pOn,
      feedback: L('你量的是P波时限，不是PR间期。', 'You measured the P-wave duration, not the PR interval.', 'Has medido la duración de la onda P, no el PR.'),
    });
    out.push({
      ms: b.qrsOff - b.pOn,
      feedback: L('你量到了QRS终点；PR间期止于QRS起点。', 'You went to the end of the QRS; the PR interval stops at the QRS onset.', 'Has llegado al final del QRS; el PR termina al inicio del QRS.'),
    });
  }
  if (what === 'qrs') {
    out.push({
      ms: b.tOff - b.qrsOn,
      feedback: L('你量的是QT间期；QRS在J点结束。', 'You measured the QT interval; the QRS ends at the J point.', 'Has medido el QT; el QRS termina en el punto J.'),
    });
  }
  if (what === 'rr' && next) {
    out.push({
      ms: 2 * (next.qrsOn - b.qrsOn),
      feedback: L('你量了两个心动周期；RR是相邻两个QRS之间的距离。', 'You measured two cycles; the RR runs between two consecutive QRS complexes.', 'Has medido dos ciclos; el RR va entre dos QRS consecutivos.'),
    });
  }
  return out;
}

export function makeMeasure(what: What) {
  return async (ctx: GenCtx): Promise<Item> => {
    const pool = focusPool(ctx, specPool(ctx.spec));
    const d = await drawSynth(ctx, pool, {
      accept: (x) => {
        if (x.truth.beats.length < 3) return false;
        if (x.scenario.intervals === 'not-applicable') return false;
        if (what === 'pr' && x.truth.prMs === null) return false;
        if (what === 'rr' && !x.truth.regular) return false;
        return true;
      },
    });
    const { truth, ecg } = d;
    const dur = ecg.signal.durationMs;
    const i = middleBeat(truth, dur, (b, k) => isDominant(b) && k < truth.beats.length - 1 && (what !== 'pr' || b.pOn !== null));
    const k = i >= 0 ? i : Math.floor(truth.beats.length / 2) - 1;
    const b = truth.beats[k];
    const next = truth.beats[k + 1];
    const truthMs = truthOf(what, d, b, next) ?? 0;
    const lead = measureLead(what, truth.findings);
    const window = clampWindow(b.qrsOn - 900, b.qrsOn + 1600, dur);
    const tol = what === 'qt' ? TOL.qtMs : TOL.intervalMs;
    const reveal: EcgMark[] = [];
    if (what === 'pr' && b.pOn !== null) reveal.push(bracket(lead, b.pOn, b.qrsOn, 'PR', 'atrial'));
    if (what === 'qrs') reveal.push(bracket(lead, b.qrsOn, b.qrsOff, 'QRS', 'qrs'));
    if (what === 'qt') {
      reveal.push(bracket(lead, b.qrsOn, b.tOff, 'QT', 'repol'));
      if (b.tPeak !== null) reveal.push({ kind: 'wave', lead, t: b.tPeak, label: 'T', color: 'repol' });
    }
    if (what === 'rr' && next) reveal.push(bracket(lead, b.qrsOn, next.qrsOn, 'RR', 'vector'));
    const ex: Readonly<Record<What, L10n>> = {
      pr: tpl(
        L('PR间期{v} ms（正常120–200 ms；>200 ms为一度房室阻滞，<120 ms为PR缩短）。', 'PR interval {v} ms (normal 120–200 ms; > 200 ms is first-degree AV block, < 120 ms a short PR).', 'Intervalo PR de {v} ms (normal 120–200 ms; > 200 ms es bloqueo AV de primer grado y < 120 ms, PR corto).'),
        { v: Math.round(truthMs) },
      ),
      qrs: tpl(
        L('QRS {v} ms（成人<110 ms正常；110–119 ms为不完全性束支阻滞或室内传导延迟；≥120 ms为完全性束支阻滞或宽QRS）。', 'QRS {v} ms (adults: < 110 ms normal; 110–119 ms incomplete block or IVCD; ≥ 120 ms complete bundle-branch block or wide QRS).', 'QRS de {v} ms (adultos: < 110 ms normal; 110–119 ms bloqueo incompleto o trastorno de la conducción; ≥ 120 ms bloqueo completo de rama o QRS ancho).'),
        { v: Math.round(truthMs) },
      ),
      qt: tpl(
        L('QT {v} ms（心率{hr}次/分）。用切线法确定T波终点，不包括U波；再按心率校正为QTc（Fridericia {qtc} ms）。', 'QT {v} ms at {hr}/min. Find the T end with the tangent method and leave out any U wave; then correct for rate (Fridericia QTc {qtc} ms).', 'QT de {v} ms a {hr} lpm. Busca el final de la T con el método de la tangente y deja fuera la U; después corrige por la frecuencia (QTc de Fridericia {qtc} ms).'),
        { v: Math.round(truthMs), hr: Math.round(truth.hrBpm), qtc: Math.round(truth.qtcFridericiaMs) },
      ),
      rr: tpl(
        L('RR {v} ms → 心率 60000 ÷ {v} ≈ {hr}次/分。25 mm/s时1小格 = 40 ms，1大格 = 200 ms。', 'RR {v} ms → rate 60000 ÷ {v} ≈ {hr}/min. At 25 mm/s one small square = 40 ms and one large square = 200 ms.', 'RR de {v} ms → frecuencia 60000 ÷ {v} ≈ {hr} lpm. A 25 mm/s un cuadro pequeño = 40 ms y uno grande = 200 ms.'),
        { v: Math.round(truthMs), hr: Math.round(60000 / Math.max(1, truthMs)) },
      ),
    };
    return {
      ...base(ctx, {
        prompt: tpl(
          L('用分规在{lead}导联测量{what}（毫秒）。', 'Use the calipers to measure the {what} in lead {lead} (ms).', 'Mide con el compás el {what} en la derivación {lead} (ms).'),
          { what: WHAT_NAME[what], lead },
        ),
        explanation: ex[what],
        ecg: d.source,
        findings: [],
        view: { layout: 'single', lead, window, calipers: true, toolbar: true },
        reveal,
        hint: MEASURE_HINT[what],
      }),
      kind: 'measure',
      // a decoy must be a plausible, distinguishable wrong landmark (e.g. no PR segment when the P runs into a delta wave)
      key: Object.assign({ what, lead, truthMs, toleranceMs: tol }, { decoys: decoys(what, b, next).filter((x) => x.ms >= 20 && Math.abs(x.ms - truthMs) > tol) }),
    };
  };
}

// ── QTc ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export function makeQtc() {
  return async (ctx: GenCtx): Promise<Item> => {
    const pool = focusPool(ctx, specPool(ctx.spec));
    const d = await drawSynth(ctx, pool, { accept: (x) => x.truth.regular && x.truth.beats.length >= 3 && x.scenario.intervals !== 'not-applicable' });
    const { truth } = d;
    const formulas: readonly QtcFormula[] = ctx.difficulty === 'classic' ? ['bazett', 'fridericia'] : QTC_FORMULAS;
    const formula = d.rng.pick(formulas);
    const given = ctx.difficulty === 'classic' || ctx.difficulty === 'borderline';
    const qtMs = Math.round(truth.qtMs);
    const rrMs = Math.round(meanRr(truth));
    const truthMs = Math.round(qtcOf(formula, qtMs, rrMs));
    const prompt = given
      ? tpl(
          L('QT = {qt} ms，RR = {rr} ms。用{f}计算QTc（毫秒）。', 'QT = {qt} ms, RR = {rr} ms. Compute the QTc with {f} (ms).', 'QT = {qt} ms y RR = {rr} ms. Calcula el QTc con {f} (ms).'),
          { qt: qtMs, rr: rrMs, f: FORMULA_NAME[formula] },
        )
      : tpl(
          L('在图上测量QT和RR，再用{f}计算QTc（毫秒）。', 'Measure the QT and RR on this tracing, then compute the QTc with {f} (ms).', 'Mide el QT y el RR en este trazado y calcula el QTc con {f} (ms).'),
          { f: FORMULA_NAME[formula] },
        );
    const limit = L(
      '男性QTc ≥450 ms、女性≥460 ms为延长；>500 ms为尖端扭转型室速高危。心率远离60次/分时，Fridericia或线性公式（Framingham、Hodges）比Bazett更可靠。',
      'QTc ≥ 450 ms in men and ≥ 460 ms in women is prolonged; > 500 ms carries a high risk of torsades. Away from 60/min, Fridericia or the linear formulas (Framingham, Hodges) are more reliable than Bazett.',
      'Un QTc ≥ 450 ms en varones y ≥ 460 ms en mujeres está prolongado; > 500 ms supone alto riesgo de torsade de pointes. Lejos de 60 lpm, Fridericia o las fórmulas lineales (Framingham, Hodges) son más fiables que Bazett.',
    );
    const explanation = tpl(
      L('{expr}（RR以秒计 = {rrs} s）：QTc = {v} ms。{limit}', '{expr} (RR in seconds = {rrs} s): QTc = {v} ms. {limit}', '{expr} (RR en segundos = {rrs} s): QTc = {v} ms. {limit}'),
      { expr: FORMULA_EXPR[formula], rrs: (rrMs / 1000).toFixed(3), v: truthMs, limit },
    );
    const i = middleBeat(truth, d.ecg.signal.durationMs);
    const reveal: EcgMark[] = [];
    if (i >= 0) {
      const b = truth.beats[i];
      reveal.push(bracket('II', b.qrsOn, b.tOff, 'QT', 'repol'));
      if (truth.beats[i + 1]) reveal.push(bracket('II', b.qrsOn, truth.beats[i + 1].qrsOn, 'RR', 'vector'));
    }
    return {
      ...base(ctx, {
        prompt,
        explanation,
        ecg: d.source,
        findings: truth.findings.filter((f) => f === 'long-qt' || f === 'short-qt'),
        view: { calipers: true },
        reveal,
        hint: tpl(L('先把RR换算成秒，再代入：{expr}。', 'Convert RR to seconds first, then use {expr}.', 'Pasa primero el RR a segundos y aplica {expr}.'), { expr: FORMULA_EXPR[formula] }),
      }),
      kind: 'qtc',
      key: { formula, qtMs, rrMs, truthMs, toleranceMs: TOL.qtcMs, given },
    };
  };
}

