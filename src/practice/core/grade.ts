/**
 * Graders — pure functions from (item, answer) to a Grade with feedback that explains THIS answer's error.
 *
 * Tolerances (src/practice/api.ts header; docs/PLAN.md §3 assessment rules): heart rate ±10 % with a minimum of ±5 bpm
 * (the key carries both; irregular-rhythm items widen the minimum because a 6-second count is quantized to 10/min);
 * PR / QRS / RR ±20 ms; QT and QTc ±30 ms; axis full credit within ±20°, partial within ±30°. Numeric answers within
 * twice the tolerance earn half credit ("partial").
 *
 * Not decided here (the player does it after grading, before recording the attempt): the hint penalty and the
 * learner's confidence — see `finalizeGrade`.
 */
import { FINDINGS, isFindingId, type FindingId } from '../../core/findings';
import type { L10n } from '../../core/l10n';
import type { Answer, Grade, Item, ReportAnswer, ReportKey } from '../api';
import { decoysOf } from './extras';
import { hallmark } from './hallmarks';
import { fmtDeg, fname, join, L, list, tpl } from './text';
import { angDiff, axisCategory, isSinus, type AxisCategory } from './truth';

export const TOL = {
  hrPct: 10,
  hrMinBpm: 5,
  hrMinIrregularBpm: 10,
  intervalMs: 20,
  qtMs: 30,
  qtcMs: 30,
  axisFullDeg: 20,
  axisPartialDeg: 30,
} as const;

/** Score multiplier when the learner opened the hint (a hinted correct answer stays below the 0.8 review threshold). */
export const HINT_FACTOR = 0.75;

const EPS = 1e-9;

type Verdict = Grade['verdict'];

function verdictOf(score: number): Verdict {
  return score >= 1 - EPS ? 'correct' : score > EPS ? 'partial' : 'incorrect';
}

function grade(score: number, feedback: L10n, extra?: Partial<Grade>): Grade {
  const s = Math.max(0, Math.min(1, score));
  return { score: s, verdict: verdictOf(s), feedback, ...extra };
}

const NO_ANSWER = L('没有作答。', 'No answer was given.', 'No se ha dado ninguna respuesta.');

/** Credit for a numeric answer: 1 within tol, 0.5 within 2×tol, else 0. */
export function numericCredit(err: number, tol: number): number {
  const a = Math.abs(err);
  if (a <= tol + EPS) return 1;
  if (a <= 2 * tol + EPS) return 0.5;
  return 0;
}

export function rateTolerance(truthBpm: number, pct: number, minBpm: number): number {
  return Math.max((truthBpm * pct) / 100, minBpm);
}

// ── rate ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function gradeRate(item: Extract<Item, { kind: 'rate' }>, a: Answer): Grade {
  if (a.kind !== 'number' || !Number.isFinite(a.value)) return grade(0, NO_ANSWER);
  const { truthBpm, which, tolerancePct, minTolBpm } = item.key;
  const tol = rateTolerance(truthBpm, tolerancePct, minTolBpm);
  const v = a.value;
  const s = numericCredit(v - truthBpm, tol);
  const rr = Math.round(60000 / truthBpm);
  const truth = Math.round(truthBpm);
  if (s === 1) {
    return grade(1, tpl(L('在±{tol}次/分范围内（参考值{truth}次/分）。', 'Within ±{tol}/min of the reference {truth}/min.', 'Dentro de ±{tol} lpm del valor de referencia, {truth} lpm.'), { tol: Math.round(tol), truth }));
  }
  const near = (x: number) => Math.abs(v - x) <= Math.max(tol, 0.12 * x);
  let why: L10n;
  if (which === 'atrial' && (near(truthBpm / 2) || near(truthBpm / 3) || near(truthBpm / 4))) {
    why = L(
      '这更像心室率。本题问的是心房率：数P波（或F波），这里P波多于QRS波。',
      'That looks like the ventricular rate. This item asks for the atrial rate: count the P (or F) waves — here there are more of them than QRS complexes.',
      'Eso parece la frecuencia ventricular. Aquí se pide la auricular: cuenta las ondas P (o F), que son más numerosas que los QRS.',
    );
  } else if (near(truthBpm * 5) || near(truthBpm / 5)) {
    why = L(
      '约差5倍：300对应大格（5 mm），1500对应小格（1 mm）——你可能把两者混用了。',
      'Off by about five times: 300 goes with large (5 mm) squares and 1500 with small (1 mm) squares — the two were probably mixed up.',
      'Error de unas cinco veces: 300 va con cuadros grandes (5 mm) y 1500 con cuadros pequeños (1 mm); probablemente se mezclaron.',
    );
  } else if (which === 'ventricular' && near(truthBpm * 2)) {
    why = L(
      '约为真实心率的2倍：可能把P波或高大的T波也当成了心搏。只数QRS波。',
      'About twice the true rate: P waves or tall T waves were probably counted as beats. Count QRS complexes only.',
      'Aproximadamente el doble de la real: probablemente se contaron ondas P o T altas como latidos. Cuenta solo los QRS.',
    );
  } else if (near(truthBpm / 2)) {
    why = L(
      '约为真实心率的一半：可能量了两个RR间期，或漏数了一半的波群。',
      'About half the true rate: two RR intervals were probably measured as one, or every other complex was missed.',
      'Aproximadamente la mitad de la real: probablemente se midieron dos RR como uno o se omitió un complejo de cada dos.',
    );
  } else if (minTolBpm >= TOL.hrMinIrregularBpm) {
    why = L(
      '节律不规则时不要用单个RR计算：数6秒内的QRS个数乘以10（或10秒×6）。',
      'With an irregular rhythm do not use a single RR: count the QRS complexes in 6 s and multiply by 10 (or 10 s × 6).',
      'Con un ritmo irregular no uses un solo RR: cuenta los QRS en 6 s y multiplica por 10 (o en 10 s por 6).',
    );
  } else {
    why = tpl(
      L(
        '{dir}：这里平均RR约{rr} ms，60000 ÷ {rr} ≈ {truth}次/分。',
        '{dir}: the mean RR here is about {rr} ms, and 60000 ÷ {rr} ≈ {truth}/min.',
        '{dir}: el RR medio es de unos {rr} ms y 60000 ÷ {rr} ≈ {truth} lpm.',
      ),
      { dir: v > truthBpm ? L('偏高', 'Too high', 'Demasiado alta') : L('偏低', 'Too low', 'Demasiado baja'), rr, truth },
    );
  }
  return grade(s, why);
}

// ── measure ──────────────────────────────────────────────────────────────────────────────────────────────────────
const MEASURE_NAME: Readonly<Record<Extract<Item, { kind: 'measure' }>['key']['what'], L10n>> = {
  pr: L('PR间期', 'PR interval', 'intervalo PR'),
  qrs: L('QRS时限', 'QRS duration', 'duración del QRS'),
  qt: L('QT间期', 'QT interval', 'intervalo QT'),
  rr: L('RR间期', 'RR interval', 'intervalo RR'),
  p: L('P波时限', 'P-wave duration', 'duración de la onda P'),
  pp: L('PP间期', 'PP interval', 'intervalo PP'),
};

const MEASURE_SHORT: Readonly<Record<Extract<Item, { kind: 'measure' }>['key']['what'], L10n>> = {
  pr: L(
    '偏短：PR间期从P波起点量到QRS起点，而不是从P波顶点或终点开始。',
    'Too short: the PR interval runs from the START of the P wave to the start of the QRS — not from the P peak or its end.',
    'Demasiado corto: el PR va desde el INICIO de la onda P hasta el inicio del QRS, no desde el pico ni el final de la P.',
  ),
  qrs: L(
    '偏短：在QRS最宽的导联中，从最早的QRS起点量到J点（包括小q波和终末S或R′波）。',
    'Too short: measure from the earliest QRS onset to the J point in the lead where the QRS is widest (include a small q and the terminal S or R′).',
    'Demasiado corto: mide desde el inicio más precoz del QRS hasta el punto J en la derivación donde es más ancho (incluye la q pequeña y la S o R′ terminal).',
  ),
  qt: L(
    '偏短：QT间期终止于T波终点（切线法），而不是T波顶点。',
    'Too short: the QT ends at the END of the T wave (tangent method), not at the T peak.',
    'Demasiado corto: el QT termina al FINAL de la onda T (método de la tangente), no en su pico.',
  ),
  rr: L('偏短：从一个R波顶点量到下一个R波顶点。', 'Too short: measure from one R peak to the next one.', 'Demasiado corto: mide de un pico de R al siguiente.'),
  p: L('偏短：从P波起点量到P波终点。', 'Too short: measure from P onset to P end.', 'Demasiado corto: mide desde el inicio hasta el final de la P.'),
  pp: L('偏短：从一个P波起点量到下一个P波起点。', 'Too short: measure from one P onset to the next.', 'Demasiado corto: mide del inicio de una P al de la siguiente.'),
};

const MEASURE_LONG: Readonly<Record<Extract<Item, { kind: 'measure' }>['key']['what'], L10n>> = {
  pr: L(
    '偏长：在QRS的第一个波（q或R）起点处停止，而不是R波顶点。',
    'Too long: stop at the first deflection of the QRS (q or R), not at the R peak.',
    'Demasiado largo: detente en la primera deflexión del QRS (q o R), no en el pico de la R.',
  ),
  qrs: L(
    '偏长：QRS终止于J点，即ST段开始处。',
    'Too long: the QRS ends at the J point, where the ST segment begins.',
    'Demasiado largo: el QRS termina en el punto J, donde empieza el segmento ST.',
  ),
  qt: L(
    '偏长：在T波回到基线处结束QT，不要把U波算进去。',
    'Too long: end the QT where the T wave returns to the baseline and leave out the U wave.',
    'Demasiado largo: termina el QT donde la onda T vuelve a la línea de base y deja fuera la onda U.',
  ),
  rr: L('偏长：量相邻两个QRS之间的距离，不要跨过一个心搏。', 'Too long: measure between two consecutive QRS complexes without skipping a beat.', 'Demasiado largo: mide entre dos QRS consecutivos sin saltarte ningún latido.'),
  p: L('偏长：P波在回到PR段基线处结束。', 'Too long: the P wave ends where it returns to the PR-segment baseline.', 'Demasiado largo: la P termina donde vuelve a la línea de base del segmento PR.'),
  pp: L('偏长：量相邻两个P波之间的距离。', 'Too long: measure between two consecutive P waves.', 'Demasiado largo: mide entre dos ondas P consecutivas.'),
};

function gradeMeasure(item: Extract<Item, { kind: 'measure' }>, a: Answer): Grade {
  if (a.kind !== 'number' || !Number.isFinite(a.value)) return grade(0, NO_ANSWER);
  const { what, truthMs, toleranceMs } = item.key;
  const v = a.value;
  const err = v - truthMs;
  const s = numericCredit(err, toleranceMs);
  const params = { what: MEASURE_NAME[what], v: Math.round(v), truth: Math.round(truthMs), tol: toleranceMs };
  if (s === 1) {
    return grade(1, tpl(L('{what}{v} ms，在参考值{truth} ms的±{tol} ms范围内。', '{what} {v} ms is within ±{tol} ms of the reference {truth} ms.', 'La {what} de {v} ms está a ±{tol} ms o menos de la referencia, {truth} ms.'), params));
  }
  // a precise decoy (e.g. QT to the T peak) beats the generic direction message
  let best: { ms: number; feedback: L10n } | null = null;
  for (const d of decoysOf(item)) {
    const dd = Math.abs(v - d.ms);
    if (dd <= toleranceMs && Math.abs(d.ms - truthMs) > toleranceMs && (!best || dd < Math.abs(v - best.ms))) best = d;
  }
  const why = best?.feedback ?? (err < 0 ? MEASURE_SHORT[what] : MEASURE_LONG[what]);
  const head = tpl(L('你的答案{v} ms，参考值{truth} ms。', 'You answered {v} ms; the reference is {truth} ms.', 'Has respondido {v} ms; la referencia es {truth} ms.'), params);
  return grade(s, join([head, why]));
}

// ── QTc ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export type QtcFormula = Extract<Item, { kind: 'qtc' }>['key']['formula'];
export const QTC_FORMULAS = ['bazett', 'fridericia', 'framingham', 'hodges'] as const satisfies readonly QtcFormula[];

/** QTc in ms (QT, RR in ms). Bazett QT/√RR; Fridericia QT/∛RR; Framingham QT + 154·(1 − RR); Hodges QT + 1.75·(HR − 60). */
export function qtcOf(formula: QtcFormula, qtMs: number, rrMs: number): number {
  const rr = rrMs / 1000;
  switch (formula) {
    case 'bazett':
      return qtMs / Math.sqrt(rr);
    case 'fridericia':
      return qtMs / Math.cbrt(rr);
    case 'framingham':
      return qtMs + 154 * (1 - rr);
    case 'hodges':
      return qtMs + 1.75 * (60000 / rrMs - 60);
  }
}

export const FORMULA_NAME: Readonly<Record<QtcFormula, L10n>> = {
  bazett: L('Bazett公式', 'Bazett', 'Bazett'),
  fridericia: L('Fridericia公式', 'Fridericia', 'Fridericia'),
  framingham: L('Framingham公式', 'Framingham', 'Framingham'),
  hodges: L('Hodges公式', 'Hodges', 'Hodges'),
};

export const FORMULA_EXPR: Readonly<Record<QtcFormula, string>> = {
  bazett: 'QTc = QT / √RR',
  fridericia: 'QTc = QT / ∛RR',
  framingham: 'QTc = QT + 154 × (1 − RR)',
  hodges: 'QTc = QT + 1.75 × (HR − 60)',
};

function gradeQtc(item: Extract<Item, { kind: 'qtc' }>, a: Answer): Grade {
  if (a.kind !== 'number' || !Number.isFinite(a.value)) return grade(0, NO_ANSWER);
  const { formula, qtMs, rrMs, truthMs, toleranceMs } = item.key;
  const v = a.value;
  const s = numericCredit(v - truthMs, toleranceMs);
  const params = { v: Math.round(v), truth: Math.round(truthMs), f: FORMULA_NAME[formula], expr: FORMULA_EXPR[formula], rr: (rrMs / 1000).toFixed(2), qt: Math.round(qtMs) };
  if (s === 1) return grade(1, tpl(L('正确：{f}，{expr}，得{truth} ms。', 'Right: {f}, {expr} = {truth} ms.', 'Correcto: {f}, {expr} = {truth} ms.'), params));
  const head = tpl(L('你的答案{v} ms，参考值{truth} ms。', 'You answered {v} ms; the reference is {truth} ms.', 'Has respondido {v} ms; la referencia es {truth} ms.'), params);
  let why: L10n | null = null;
  for (const other of QTC_FORMULAS) {
    if (other === formula) continue;
    const ov = qtcOf(other, qtMs, rrMs);
    if (Math.abs(v - ov) <= toleranceMs && Math.abs(ov - truthMs) > toleranceMs) {
      why = tpl(
        L('这与{o}的结果（{ov} ms）一致，但本题要求用{f}。', 'That matches {o} ({ov} ms), but this item asks for {f}.', 'Eso coincide con {o} ({ov} ms), pero aquí se pide {f}.'),
        { o: FORMULA_NAME[other], ov: Math.round(ov), f: FORMULA_NAME[formula] },
      );
      break;
    }
  }
  if (!why && Math.abs(v - qtMs) <= toleranceMs && Math.abs(qtMs - truthMs) > toleranceMs) {
    why = L('这是未校正的QT。QTc需要按心率校正。', 'That is the uncorrected QT. QTc must be corrected for the heart rate.', 'Ese es el QT sin corregir. El QTc debe corregirse por la frecuencia.');
  }
  why ??= tpl(
    L('RR要用秒：{expr}，QT = {qt} ms，RR = {rr} s。', 'Use RR in seconds: {expr} with QT = {qt} ms and RR = {rr} s.', 'Usa el RR en segundos: {expr} con QT = {qt} ms y RR = {rr} s.'),
    params,
  );
  return grade(s, join([head, why]));
}

// ── axis ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function gradeAxis(item: Extract<Item, { kind: 'axis' }>, a: Answer): Grade {
  const { mode, truthDeg, fullDeg, partialDeg } = item.key;
  const truthCat = axisCategory(truthDeg);
  if (mode === 'quadrant' || a.kind === 'choice') {
    let cat: AxisCategory | null = null;
    if (a.kind === 'choice' && (['axis-normal', 'lad', 'rad', 'extreme-axis'] as readonly string[]).includes(a.id)) cat = a.id as AxisCategory;
    else if (a.kind === 'number' && Number.isFinite(a.value)) cat = axisCategory(a.value);
    if (!cat) return grade(0, NO_ANSWER);
    if (cat === truthCat) return grade(1, tpl(L('正确：{c}（约{d}）。', 'Right: {c} (about {d}).', 'Correcto: {c} (unos {d}).'), { c: fname(truthCat), d: fmtDeg(truthDeg) }));
    return grade(
      0,
      join([
        tpl(L('你选了{c}，但电轴约{d}，属于{t}。', 'You chose {c}, but the axis is about {d}: {t}.', 'Has elegido {c}, pero el eje es de unos {d}: {t}.'), { c: fname(cat), d: fmtDeg(truthDeg), t: fname(truthCat) }),
        hallmark(truthCat),
      ]),
    );
  }
  if (a.kind !== 'number' || !Number.isFinite(a.value)) return grade(0, NO_ANSWER);
  const d = angDiff(a.value, truthDeg);
  const s = d <= fullDeg + EPS ? 1 : d <= partialDeg + EPS ? 0.5 : 0;
  const params = { v: fmtDeg(a.value), t: fmtDeg(truthDeg), d: Math.round(d), full: fullDeg };
  if (s === 1) return grade(1, tpl(L('{v}，与参考值{t}相差{d}°（±{full}°以内）。', '{v} is {d}° from the reference {t} (within ±{full}°).', '{v} está a {d}° de la referencia, {t} (dentro de ±{full}°).'), params));
  const head = tpl(L('你的答案{v}，参考值{t}（相差{d}°）。', 'You answered {v}; the reference is {t} ({d}° away).', 'Has respondido {v}; la referencia es {t} (a {d}°).'), params);
  let why: L10n;
  if (d > 150) {
    why = L(
      '方向反了：QRS在某导联以正向为主时，电轴指向该导联的正极。',
      'The direction is reversed: when the QRS is mainly positive in a lead, the axis points toward that lead’s positive pole.',
      'La dirección está invertida: si el QRS es predominantemente positivo en una derivación, el eje apunta hacia su polo positivo.',
    );
  } else if (d >= 60 && d <= 120) {
    why = L(
      '偏了约90°：电轴垂直于QRS最接近等电位（正负相等）的导联，再根据I和aVF的正负决定朝哪一侧。',
      'About 90° off: the axis is perpendicular to the lead where the QRS is most equiphasic; use the signs of I and aVF to choose which side.',
      'Unos 90° de diferencia: el eje es perpendicular a la derivación con el QRS más isodifásico; usa los signos de I y aVF para elegir el lado.',
    );
  } else if (axisCategory(a.value) !== truthCat) {
    why = tpl(L('类别也不同：参考值属于{t}。先用I和aVF确定象限。', 'The category differs too: the reference is {t}. Find the quadrant first with I and aVF.', 'También cambia la categoría: la referencia es {t}. Busca primero el cuadrante con I y aVF.'), {
      t: fname(truthCat),
    });
  } else {
    why = L('象限正确，再用最接近等电位的导联细调角度。', 'Right quadrant; refine the angle with the lead whose QRS is closest to equiphasic.', 'Cuadrante correcto; afina el ángulo con la derivación cuyo QRS es más isodifásico.');
  }
  return grade(s, join([head, why]));
}

// ── choice ───────────────────────────────────────────────────────────────────────────────────────────────────────
function optionLabel(item: Extract<Item, { kind: 'choice' }>, id: string): L10n {
  const o = item.key.options.find((x) => x.id === id);
  if (o) return o.label;
  return isFindingId(id) ? fname(id) : L(id, id, id);
}

function isCriticalId(id: string): boolean {
  return isFindingId(id) && FINDINGS[id].severity === 'critical';
}

function gradeChoice(item: Extract<Item, { kind: 'choice' }>, a: Answer): Grade {
  if (a.kind !== 'choice') return grade(0, NO_ANSWER);
  const { correct } = item.key;
  const right = optionLabel(item, correct);
  if (a.id === correct) return grade(1, tpl(L('正确：{c}。', 'Right: {c}.', 'Correcto: {c}.'), { c: right }));
  const chosen = optionLabel(item, a.id);
  const lines: (L10n | null)[] = [tpl(L('你选了“{a}”，正确答案是“{c}”。', 'You chose “{a}”; the answer is “{c}”.', 'Has elegido «{a}»; la respuesta es «{c}».'), { a: chosen, c: right })];
  if (isFindingId(a.id) && hallmark(a.id)) lines.push(tpl(L('{a}应表现为：{h}', '{a} would show: {h}', '{a} mostraría: {h}'), { a: chosen, h: hallmark(a.id) ?? '' }));
  const missedCritical = isCriticalId(correct) || correct === 'critical';
  return grade(0, join(lines), missedCritical ? { missedCritical: true } : undefined);
}

// ── findings (multi-select) ──────────────────────────────────────────────────────────────────────────────────────
/** F1 of a selection against the correct set (both empty → 1). */
export function f1(selected: readonly string[], correct: readonly string[]): { score: number; tp: string[]; fp: string[]; fn: string[] } {
  const sel = new Set(selected);
  const cor = new Set(correct);
  const tp = [...sel].filter((x) => cor.has(x));
  const fp = [...sel].filter((x) => !cor.has(x));
  const fn = [...cor].filter((x) => !sel.has(x));
  const denom = 2 * tp.length + fp.length + fn.length;
  return { score: denom === 0 ? 1 : (2 * tp.length) / denom, tp, fp, fn };
}

function names(ids: readonly string[]): L10n {
  return list(ids.map((i) => (isFindingId(i) ? fname(i) : L(i, i, i))));
}

function gradeFindings(item: Extract<Item, { kind: 'findings' }>, a: Answer): Grade {
  if (a.kind !== 'multi') return grade(0, NO_ANSWER);
  const valid = a.ids.filter((x) => (item.key.options as readonly string[]).includes(x));
  const r = f1(valid, item.key.correct);
  const exact = r.fp.length === 0 && r.fn.length === 0;
  const score = exact ? 1 : r.score;
  const missedCritical = r.fn.some(isCriticalId);
  if (exact) return grade(1, L('全部正确，没有多选。', 'All present findings found, nothing extra.', 'Todos los hallazgos presentes, nada de más.'));
  const lines: L10n[] = [];
  if (r.fn.length) lines.push(tpl(L('漏掉：{x}。', 'Missed: {x}.', 'Omitidos: {x}.'), { x: names(r.fn) }));
  if (r.fp.length) lines.push(tpl(L('本图没有：{x}。', 'Not on this tracing: {x}.', 'No están en este trazado: {x}.'), { x: names(r.fp) }));
  if (missedCritical) lines.push(L('漏掉了需要立即处理的危急表现。', 'A can’t-miss (critical) finding was missed.', 'Se ha omitido un hallazgo crítico que no se puede pasar por alto.'));
  return grade(score >= 1 - EPS ? 0.99 : score, join(lines), missedCritical ? { missedCritical: true } : undefined);
}

// ── locate ───────────────────────────────────────────────────────────────────────────────────────────────────────
type Target = Extract<Item, { kind: 'locate' }>['key']['targets'][number];

export function pickHits(t: Target, p: { readonly lead: string; readonly tMs: number }): boolean {
  return (t.lead === 'any' || t.lead === p.lead) && p.tMs >= t.t0 - EPS && p.tMs <= t.t1 + EPS;
}

function gradeLocate(item: Extract<Item, { kind: 'locate' }>, a: Answer): Grade {
  if (a.kind !== 'picks' || a.picks.length === 0) return grade(0, NO_ANSWER);
  const { targets, need } = item.key;
  if (need === 'one') {
    // the learner's last pick is their answer
    const p = a.picks[a.picks.length - 1];
    const ok = targets.some((t) => pickHits(t, p));
    if (ok) return grade(1, L('点对了。', 'Right on target.', 'En el blanco.'));
    return grade(
      0,
      tpl(L('你点在{lead}导联{t} ms处，不在目标上。看图上的标记。', 'Your click (lead {lead}, {t} ms) is not on a target — see the marks on the tracing.', 'Tu clic (derivación {lead}, {t} ms) no está en un objetivo: mira las marcas del trazado.'), {
        lead: p.lead,
        t: Math.round(p.tMs),
      }),
    );
  }
  const hit = targets.filter((t) => a.picks.some((p) => pickHits(t, p))).length;
  const extra = a.picks.filter((p) => !targets.some((t) => pickHits(t, p))).length;
  const score = targets.length ? Math.max(0, (hit - 0.5 * extra) / targets.length) : 0;
  const fb = tpl(L('找到{h}/{n}个目标，多点了{x}处。', 'Found {h} of {n} targets with {x} extra click(s).', 'Has encontrado {h} de {n} objetivos con {x} clic(s) de más.'), { h: hit, n: targets.length, x: extra });
  return grade(hit === targets.length && extra === 0 ? 1 : Math.min(score, 0.99), fb);
}

// ── occlusion ────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Score of a three-way call. Missing an occlusion is the worst error (0 and `missedCritical`); a false activation
 * (calling occlusion on a mimic) scores 0.25; deferring with "indeterminate" earns partial credit; a right call with
 * the wrong territory or mimic loses 0.25.
 */
export const OCCLUSION_SCORE: Readonly<Record<'occlusion' | 'indeterminate' | 'not-occlusion', Readonly<Record<'occlusion' | 'indeterminate' | 'not-occlusion', number>>>> = {
  // truth → answer → score
  occlusion: { occlusion: 1, indeterminate: 0.25, 'not-occlusion': 0 },
  indeterminate: { occlusion: 0.5, indeterminate: 1, 'not-occlusion': 0.25 },
  'not-occlusion': { occlusion: 0.25, indeterminate: 0.5, 'not-occlusion': 1 },
};

const CALL_NAME: Readonly<Record<'occlusion' | 'indeterminate' | 'not-occlusion', L10n>> = {
  occlusion: L('可能为冠状动脉急性闭塞', 'occlusion likely', 'oclusión probable'),
  indeterminate: L('不能确定（复查心电图/加做导联）', 'indeterminate (repeat ECG / extra leads)', 'indeterminado (repetir ECG / derivaciones adicionales)'),
  'not-occlusion': L('非闭塞（说出类似图形）', 'not an occlusion (name the mimic)', 'no es una oclusión (nombra el simulador)'),
};

export function callName(c: 'occlusion' | 'indeterminate' | 'not-occlusion'): L10n {
  return CALL_NAME[c];
}

function gradeOcclusion(item: Extract<Item, { kind: 'occlusion' }>, a: Answer): Grade {
  if (a.kind !== 'occlusion') return grade(0, NO_ANSWER);
  const k = item.key;
  let score = OCCLUSION_SCORE[k.call][a.call];
  const lines: (L10n | null)[] = [];
  const missedCritical = k.call === 'occlusion' && a.call !== 'occlusion';
  if (k.call === a.call) {
    if (k.call === 'occlusion' && k.territory && a.territory !== k.territory) {
      score -= 0.25;
      const tl = k.territoryOptions?.find((o) => o.id === k.territory)?.label;
      lines.push(tpl(L('判断正确，但部位应为：{t}。', 'Right call, but the territory is: {t}.', 'Decisión correcta, pero el territorio es: {t}.'), { t: tl ?? k.territory }));
    } else if (k.call === 'not-occlusion' && k.mimic && a.mimic !== k.mimic) {
      score -= 0.25;
      lines.push(tpl(L('判断正确，但这是：{m}。', 'Right call, but the mimic is: {m}.', 'Decisión correcta, pero el simulador es: {m}.'), { m: fname(k.mimic) }));
      if (a.mimic && hallmark(a.mimic)) lines.push(tpl(L('{a}应表现为：{h}', '{a} would show: {h}', '{a} mostraría: {h}'), { a: fname(a.mimic), h: hallmark(a.mimic) ?? '' }));
      lines.push(hallmark(k.mimic));
    } else {
      lines.push(tpl(L('正确：{c}。', 'Right: {c}.', 'Correcto: {c}.'), { c: CALL_NAME[k.call] }));
    }
  } else if (missedCritical && a.call === 'not-occlusion') {
    lines.push(
      L(
        '漏诊了冠状动脉闭塞——这是最严重的错误：患者需要立即再灌注治疗。',
        'A missed occlusion — the most serious error: this patient needs immediate reperfusion.',
        'Oclusión no detectada, el error más grave: este paciente necesita reperfusión inmediata.',
      ),
    );
  } else if (missedCritical) {
    lines.push(
      L(
        '这里已有足够的闭塞证据，等待复查会延误再灌注。',
        'There is already enough evidence of occlusion here; waiting for a repeat ECG delays reperfusion.',
        'Aquí ya hay pruebas suficientes de oclusión; esperar a repetir el ECG retrasa la reperfusión.',
      ),
    );
  } else if (k.call === 'not-occlusion' && a.call === 'occlusion') {
    lines.push(
      tpl(
        L('误启动：这是类似图形（{m}），不是闭塞。误启动的代价小于漏诊，但仍应避免。', 'A false activation: this is a mimic ({m}), not an occlusion. Less harmful than a miss, but still to avoid.', 'Activación falsa: es un simulador ({m}), no una oclusión. Es menos grave que no detectarla, pero hay que evitarla.'),
        { m: k.mimic ? fname(k.mimic) : L('—', '—', '—') },
      ),
    );
  } else {
    lines.push(tpl(L('你的判断：{a}；正确判断：{c}。', 'Your call: {a}; the right call: {c}.', 'Tu decisión: {a}; la correcta: {c}.'), { a: CALL_NAME[a.call], c: CALL_NAME[k.call] }));
  }
  return grade(Math.max(0, score), join(lines), missedCritical ? { missedCritical: true } : undefined);
}

// ── report ───────────────────────────────────────────────────────────────────────────────────────────────────────
/** Field weights of the structured report (findings dominate; rhythm counts double). */
export const REPORT_WEIGHTS = { rate: 1, rhythm: 2, regular: 0.5, pr: 1, qrs: 1, qtc: 1, axis: 1, findings: 3 } as const;
export type ReportField = keyof typeof REPORT_WEIGHTS;

export interface ReportFieldResult {
  readonly field: ReportField;
  readonly credit: number;
  readonly ok: boolean;
  readonly expected: string;
  readonly given: string;
}

const numStr = (v: number | null, unit: string) => (v === null ? '—' : `${Math.round(v)} ${unit}`.trim());

/** Per-field results of a report against its key (fields whose key is null are not graded). */
export function reportFields(key: ReportKey, ans: ReportAnswer): ReportFieldResult[] {
  const out: ReportFieldResult[] = [];
  const num = (field: ReportField, truth: number | null, given: number | null, tol: number, unit: string) => {
    if (truth === null) return;
    const credit = given === null || !Number.isFinite(given) ? 0 : numericCredit(given - truth, tol);
    out.push({ field, credit, ok: credit === 1, expected: numStr(truth, unit), given: numStr(given, unit) });
  };
  if (key.rateBpm !== null) num('rate', key.rateBpm, ans.rateBpm, rateTolerance(key.rateBpm, TOL.hrPct, TOL.hrMinBpm), 'bpm');
  if (key.rhythm !== null) {
    let credit = 0;
    if (ans.rhythm === key.rhythm) credit = 1;
    else if (ans.rhythm && isSinus(ans.rhythm) && isSinus(key.rhythm)) credit = 0.5; // right origin, wrong rate class
    out.push({ field: 'rhythm', credit, ok: credit === 1, expected: key.rhythm, given: ans.rhythm ?? '—' });
  }
  if (key.regular !== null) {
    const credit = ans.regular === key.regular ? 1 : 0;
    out.push({ field: 'regular', credit, ok: credit === 1, expected: String(key.regular), given: ans.regular === null ? '—' : String(ans.regular) });
  }
  num('pr', key.prMs, ans.prMs, TOL.intervalMs, 'ms');
  num('qrs', key.qrsMs, ans.qrsMs, TOL.intervalMs, 'ms');
  num('qtc', key.qtcMs, ans.qtcMs, TOL.qtcMs, 'ms');
  if (key.axisDeg !== null) {
    const credit = ans.axisDeg === null || !Number.isFinite(ans.axisDeg) ? 0 : angDiff(ans.axisDeg, key.axisDeg) <= TOL.axisFullDeg + EPS ? 1 : angDiff(ans.axisDeg, key.axisDeg) <= TOL.axisPartialDeg + EPS ? 0.5 : 0;
    out.push({ field: 'axis', credit, ok: credit === 1, expected: fmtDeg(key.axisDeg), given: ans.axisDeg === null ? '—' : fmtDeg(ans.axisDeg) });
  }
  // findings: required ones must be listed; optional ones are free; anything else counts as a false positive
  const optional = new Set<string>([...(key.optional ?? []), ...(key.rhythm ? [key.rhythm] : [])]);
  const listed = ans.findings.filter((f) => f !== key.rhythm);
  const counted = listed.filter((f) => key.findings.includes(f) || !optional.has(f));
  const r = f1(counted, key.findings);
  out.push({ field: 'findings', credit: r.score, ok: r.fp.length === 0 && r.fn.length === 0, expected: key.findings.join(', ') || '—', given: listed.join(', ') || '—' });
  return out;
}

export function gradeReport(key: ReportKey, ans: ReportAnswer): Grade {
  const fields = reportFields(key, ans);
  let wsum = 0;
  let acc = 0;
  for (const f of fields) {
    wsum += REPORT_WEIGHTS[f.field];
    acc += REPORT_WEIGHTS[f.field] * f.credit;
  }
  const score = wsum > 0 ? acc / wsum : 0;
  const missedFindings = key.findings.filter((f) => !ans.findings.includes(f));
  const missedCritical = [...missedFindings, ...(key.rhythm && ans.rhythm !== key.rhythm ? [key.rhythm] : [])].some((f) => FINDINGS[f].severity === 'critical');
  const okN = fields.filter((f) => f.ok).length;
  const lines: (L10n | null)[] = [tpl(L('{ok}/{n}项正确，总分{s}%。', '{ok} of {n} fields right; score {s} %.', '{ok} de {n} apartados correctos; puntuación {s} %.'), { ok: okN, n: fields.length, s: Math.round(score * 100) })];
  if (missedFindings.length) lines.push(tpl(L('漏掉的表现：{x}。', 'Findings missed: {x}.', 'Hallazgos omitidos: {x}.'), { x: names(missedFindings) }));
  if (missedCritical) lines.push(L('漏掉了危急表现。', 'A critical finding was missed.', 'Se ha omitido un hallazgo crítico.'));
  // report items pass at 80 % (C11 mastery evidence)
  const verdict: Verdict = score >= 0.8 - EPS ? 'correct' : score >= 0.5 - EPS ? 'partial' : 'incorrect';
  return {
    score: Math.max(0, Math.min(1, score)),
    verdict,
    feedback: join(lines),
    fields: fields.map((f) => ({ field: f.field, ok: f.ok, expected: f.expected, given: f.given })),
    ...(missedCritical ? { missedCritical: true } : {}),
  };
}

// ── compare ──────────────────────────────────────────────────────────────────────────────────────────────────────
function gradeCompare(item: Extract<Item, { kind: 'compare' }>, a: Answer): Grade {
  if (a.kind !== 'choice' || (a.id !== 'left' && a.id !== 'right')) return grade(0, NO_ANSWER);
  const side = (s: 'left' | 'right') => (s === 'left' ? L('左图', 'the left tracing', 'el trazado de la izquierda') : L('右图', 'the right tracing', 'el trazado de la derecha'));
  if (a.id === item.key.correct) return grade(1, tpl(L('正确：是{s}。', 'Right: it is {s}.', 'Correcto: es {s}.'), { s: side(item.key.correct) }));
  const crit = item.findings.some((f) => FINDINGS[f].severity === 'critical');
  return grade(0, tpl(L('不对：是{s}。', 'Not quite: it is {s}.', 'No: es {s}.'), { s: side(item.key.correct) }), crit ? { missedCritical: true } : undefined);
}

// ── entry point ──────────────────────────────────────────────────────────────────────────────────────────────────
export function gradeItem(item: Item, answer: Answer): Grade {
  switch (item.kind) {
    case 'rate':
      return gradeRate(item, answer);
    case 'measure':
      return gradeMeasure(item, answer);
    case 'qtc':
      return gradeQtc(item, answer);
    case 'axis':
      return gradeAxis(item, answer);
    case 'choice':
      return gradeChoice(item, answer);
    case 'findings':
      return gradeFindings(item, answer);
    case 'locate':
      return gradeLocate(item, answer);
    case 'occlusion':
      return gradeOcclusion(item, answer);
    case 'report':
      return answer.kind === 'report' ? gradeReport(item.key, answer.report) : grade(0, NO_ANSWER);
    case 'compare':
      return gradeCompare(item, answer);
  }
}

/** Apply the hint penalty and stamp the learner's confidence (done by the player after grading). */
export function finalizeGrade(g: Grade, opts: { readonly usedHint?: boolean; readonly confidence?: 1 | 2 | 3 }): Grade {
  const score = opts.usedHint ? g.score * HINT_FACTOR : g.score;
  return {
    ...g,
    score,
    ...(opts.usedHint ? { usedHint: true } : {}),
    ...(opts.confidence ? { confidence: opts.confidence } : {}),
  };
}

/** Is an id one of the findings in a list (type guard for option ids). */
export function asFinding(id: string): FindingId | null {
  return isFindingId(id) ? id : null;
}
