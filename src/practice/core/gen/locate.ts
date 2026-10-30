/**
 * Locate families (click the ECG): a wave (P / QRS / T), a lead by its anatomy or hexaxial angle, a blocked P wave,
 * the delta wave, the lead with the greatest ST elevation. Targets are time windows (± a small margin) from the model's
 * fiducials, or whole leads.
 */
import type { BeatMarks } from '../../../core/ecg';
import type { L10n } from '../../../core/l10n';
import { STD_LEADS, type Lead, type StdLead } from '../../../core/leads';
import type { EcgMark } from '../../../ecg/api';
import type { Item } from '../../api';
import { hallmark } from '../hallmarks';
import { fmtStMm, join, L, tpl } from '../text';
import { isDominant, middleBeat, tWindow } from '../truth';
import { contextHallmark } from './choice';
import { atrialMarks, base, clampWindow, drawSynth, focusPool, specPool, type GenCtx } from './common';

type Target = { readonly lead: Lead | 'any'; readonly t0: number; readonly t1: number };

// ── P / QRS / T ──────────────────────────────────────────────────────────────────────────────────────────────────
type Wave = 'p' | 'qrs' | 't';

const WAVE_PROMPT: Readonly<Record<Wave, L10n>> = {
  p: L('点击一个P波（任一导联）。', 'Click on a P wave (any lead).', 'Haz clic en una onda P (cualquier derivación).'),
  qrs: L('点击一个QRS波群（任一导联）。', 'Click on a QRS complex (any lead).', 'Haz clic en un complejo QRS (cualquier derivación).'),
  t: L('点击一个T波（任一导联）。', 'Click on a T wave (any lead).', 'Haz clic en una onda T (cualquier derivación).'),
};

const WAVE_EXPLAIN: Readonly<Record<Wave, L10n>> = {
  p: L('P波：心房除极，QRS前的小圆钝波（II导联最清楚）。', 'P wave: atrial depolarization, the small rounded wave before the QRS (clearest in lead II).', 'Onda P: despolarización auricular, la pequeña onda redondeada antes del QRS (más clara en II).'),
  qrs: L('QRS波群：心室除极，最高最窄的波群。', 'QRS complex: ventricular depolarization, the tallest and sharpest complex.', 'Complejo QRS: despolarización ventricular, el complejo más alto y afilado.'),
  t: L('T波：心室复极，QRS之后、ST段之后的宽圆波。', 'T wave: ventricular repolarization, the broad rounded wave after the QRS and ST segment.', 'Onda T: repolarización ventricular, la onda ancha y redondeada tras el QRS y el ST.'),
};

function waveWindow(w: Wave, b: BeatMarks): readonly [number, number] | null {
  if (w === 'p') return b.pOn !== null && b.pOff !== null ? [b.pOn - 15, b.pOff + 15] : null;
  if (w === 'qrs') return [b.qrsOn - 15, b.qrsOff + 15];
  return tWindow(b);
}

export function makeLocateWave() {
  return async (ctx: GenCtx): Promise<Item> => {
    const pool = focusPool(ctx, specPool(ctx.spec));
    const wave = ctx.rng.fork('wave').pick(['p', 'qrs', 't'] as const);
    // only waves wholly on the strip: one cut at the paper edge is ambiguous to click and to reveal
    const inside = (b: BeatMarks, dur: number) => {
      const w = waveWindow(wave, b);
      return w !== null && w[0] >= 0 && w[1] <= dur ? w : null;
    };
    const d = await drawSynth(ctx, pool, { accept: (x) => x.truth.beats.some((b) => inside(b, x.ecg.signal.durationMs) !== null) });
    const targets: Target[] = [];
    for (const b of d.truth.beats) {
      const w = inside(b, d.ecg.signal.durationMs);
      if (w) targets.push({ lead: 'any', t0: Math.round(w[0]), t1: Math.round(w[1]) });
    }
    const color = wave === 'p' ? 'atrial' : wave === 'qrs' ? 'qrs' : 'repol';
    const reveal: EcgMark[] = targets.map((t) => ({ kind: 'region', lead: 'all', t0: t.t0, t1: t.t1, color }));
    const classic = ctx.difficulty === 'classic';
    return {
      ...base(ctx, {
        prompt: WAVE_PROMPT[wave],
        explanation: WAVE_EXPLAIN[wave],
        ecg: d.source,
        findings: [],
        view: classic ? { layout: 'strip', lead: 'II' } : {},
        reveal,
      }),
      kind: 'locate',
      key: { targets, need: 'one' },
    };
  };
}

// ── leads by anatomy / hexaxial angle ───────────────────────────────────────────────────────────────────────────
interface LeadQuestion {
  readonly q: L10n;
  readonly leads: readonly StdLead[];
  readonly why: L10n;
}

export const LEAD_QUESTIONS: readonly LeadQuestion[] = [
  {
    q: L('点击一个面向下壁的导联。', 'Click a lead that faces the inferior wall.', 'Haz clic en una derivación que mire a la cara inferior.'),
    leads: ['II', 'III', 'aVF'],
    why: L('II、III、aVF的正极位于左下肢方向（+60°、+120°、+90°），面向下壁。', 'II, III and aVF have their positive poles toward the left leg (+60°, +120°, +90°): they face the inferior wall.', 'II, III y aVF tienen su polo positivo hacia la pierna izquierda (+60°, +120°, +90°): miran a la cara inferior.'),
  },
  {
    q: L('点击正极指向−30°（左肩）的导联。', 'Click the lead whose positive pole points to −30° (left shoulder).', 'Haz clic en la derivación cuyo polo positivo apunta a −30° (hombro izquierdo).'),
    leads: ['aVL'],
    why: L('aVL的正极在左上肢，−30°。', 'aVL has its positive pole on the left arm, at −30°.', 'aVL tiene su polo positivo en el brazo izquierdo, a −30°.'),
  },
  {
    q: L('点击正常时P、QRS、T均为负向的导联。', 'Click the lead in which P, QRS and T are normally all negative.', 'Haz clic en la derivación en la que P, QRS y T son normalmente negativas.'),
    leads: ['aVR'],
    why: L('aVR的正极在右肩（−150°），正常心脏的电活动背离它而去。', 'aVR looks from the right shoulder (−150°); normal activation travels away from it.', 'aVR mira desde el hombro derecho (−150°); la activación normal se aleja de ella.'),
  },
  {
    q: L('点击与I导联垂直的导联。', 'Click the lead perpendicular to lead I.', 'Haz clic en la derivación perpendicular a I.'),
    leads: ['aVF'],
    why: L('I在0°，aVF在+90°：两者互相垂直，因此用I和aVF确定电轴象限。', 'I is at 0° and aVF at +90°: they are perpendicular, which is why I and aVF give the axis quadrant.', 'I está a 0° y aVF a +90°: son perpendiculares, por eso I y aVF dan el cuadrante del eje.'),
  },
  {
    q: L('点击与II导联垂直的导联。', 'Click the lead perpendicular to lead II.', 'Haz clic en la derivación perpendicular a II.'),
    leads: ['aVL'],
    why: L('II在+60°，aVL在−30°，相差90°。', 'II is at +60° and aVL at −30°, 90° apart.', 'II está a +60° y aVL a −30°, separadas 90°.'),
  },
  {
    q: L('点击与III导联垂直的导联。', 'Click the lead perpendicular to lead III.', 'Haz clic en la derivación perpendicular a III.'),
    leads: ['aVR'],
    why: L('III在+120°，aVR在−150°，相差90°。', 'III is at +120° and aVR at −150°, 90° apart.', 'III está a +120° y aVR a −150°, separadas 90°.'),
  },
  {
    q: L('点击放在胸骨右缘第4肋间的导联。', 'Click the lead placed in the 4th intercostal space at the right sternal border.', 'Haz clic en la derivación colocada en el 4.º espacio intercostal, borde esternal derecho.'),
    leads: ['V1'],
    why: L('V1：胸骨右缘第4肋间；V2：胸骨左缘第4肋间。', 'V1: 4th intercostal space, right sternal border; V2: same space at the left sternal border.', 'V1: 4.º espacio intercostal, borde esternal derecho; V2: el mismo espacio en el borde izquierdo.'),
  },
  {
    q: L('点击放在左锁骨中线第5肋间的导联。', 'Click the lead placed in the 5th intercostal space on the left mid-clavicular line.', 'Haz clic en la derivación colocada en el 5.º espacio intercostal, línea medioclavicular izquierda.'),
    leads: ['V4'],
    why: L('V4在左锁骨中线第5肋间；V3在V2与V4之间。', 'V4 sits in the 5th intercostal space on the mid-clavicular line; V3 lies halfway between V2 and V4.', 'V4 está en el 5.º espacio intercostal en la línea medioclavicular; V3 está entre V2 y V4.'),
  },
  {
    q: L('点击放在左腋中线（与V4同一水平）的导联。', 'Click the lead on the left mid-axillary line (at the level of V4).', 'Haz clic en la derivación de la línea medioaxilar izquierda (al nivel de V4).'),
    leads: ['V6'],
    why: L('V5在腋前线，V6在腋中线，均与V4同一水平。', 'V5 is on the anterior axillary line and V6 on the mid-axillary line, both level with V4.', 'V5 está en la línea axilar anterior y V6 en la medioaxilar, ambas al nivel de V4.'),
  },
  {
    q: L('点击一个高侧壁导联。', 'Click a high-lateral lead.', 'Haz clic en una derivación lateral alta.'),
    leads: ['I', 'aVL'],
    why: L('I和aVL面向左心室高侧壁。', 'I and aVL face the high lateral wall of the left ventricle.', 'I y aVL miran a la cara lateral alta del ventrículo izquierdo.'),
  },
  {
    q: L('点击左下肢为正极、左上肢为负极的导联。', 'Click the lead whose positive electrode is the left leg and negative electrode the left arm.', 'Haz clic en la derivación con el electrodo positivo en la pierna izquierda y el negativo en el brazo izquierdo.'),
    leads: ['III'],
    why: L('III = 左下肢 − 左上肢（+120°）。', 'III = left leg − left arm (+120°).', 'III = pierna izquierda − brazo izquierdo (+120°).'),
  },
];

export function makeLocateLead() {
  return async (ctx: GenCtx): Promise<Item> => {
    const pool = focusPool(ctx, specPool(ctx.spec));
    const d = await drawSynth(ctx, pool);
    const q = ctx.rng.fork('question').pick(LEAD_QUESTIONS);
    const dur = d.ecg.signal.durationMs;
    const targets: Target[] = q.leads.map((lead) => ({ lead, t0: 0, t1: dur }));
    return {
      ...base(ctx, {
        prompt: q.q,
        explanation: q.why,
        ecg: d.source,
        findings: [],
        view: { layout: '3x4+1' },
        reveal: q.leads.map((lead) => ({ kind: 'lead' as const, lead, color: 'ok' as const })),
      }),
      kind: 'locate',
      key: { targets, need: 'one' },
    };
  };
}

// ── blocked P wave ───────────────────────────────────────────────────────────────────────────────────────────────
export function makeLocateBlockedP() {
  return async (ctx: GenCtx): Promise<Item> => {
    const pool = focusPool(ctx, specPool(ctx.spec));
    const blocked = (t: { atrial: readonly { conductedTo: number | null; visible: boolean; kind: string }[] }) =>
      t.atrial.filter((a) => a.conductedTo === null && a.visible && a.kind !== 'fibrillation' && a.kind !== 'retrograde');
    const d = await drawSynth(ctx, pool, { accept: (x) => blocked(x.truth).length > 0 });
    const evs = d.truth.atrial.filter((a) => a.conductedTo === null && a.visible && a.kind !== 'fibrillation' && a.kind !== 'retrograde');
    const targets: Target[] = evs.map((a) => ({ lead: 'any', t0: Math.round(a.t - 30), t1: Math.round(a.t + 140) }));
    const reveal: EcgMark[] = [...targets.map((t) => ({ kind: 'region' as const, lead: 'all' as const, t0: t.t0, t1: t.t1, color: 'err' as const })), ...atrialMarks(d.truth)];
    const f = d.truth.findings.find((x) => x.startsWith('av-block-2') || x === 'av-block-high-grade' || x === 'pac-blocked') ?? null;
    return {
      ...base(ctx, {
        prompt: L('点击一个未下传的P波（其后没有QRS）。', 'Click a P wave that is not conducted (no QRS follows it).', 'Haz clic en una onda P no conducida (no le sigue ningún QRS).'),
        explanation: join([
          L('未下传的P波后没有QRS；它可能落在前一个T波上，使T波变形。用分规按PP间期“走”出每个P波。', 'A non-conducted P wave has no QRS after it; it may sit on the preceding T wave and deform it. March out the PP interval with the calipers to find every P.', 'Una P no conducida no va seguida de QRS; puede caer sobre la T previa y deformarla. Recorre el intervalo PP con el compás para encontrar todas las P.'),
          f ? hallmark(f) : null,
        ]),
        ecg: d.source,
        findings: f ? [f] : [],
        view: { layout: 'strip', lead: 'II', calipers: true },
        reveal,
      }),
      kind: 'locate',
      key: { targets, need: 'one' },
    };
  };
}

// ── delta wave ───────────────────────────────────────────────────────────────────────────────────────────────────
export function makeLocateDelta() {
  return async (ctx: GenCtx): Promise<Item> => {
    const pool = focusPool(ctx, specPool(ctx.spec));
    const d = await drawSynth(ctx, pool, { accept: (x) => x.truth.findings.includes('wpw') && x.truth.beats.length >= 3 });
    // a beat cut by the end of the record keeps only the part that is on the paper
    const dur = d.ecg.signal.durationMs;
    const targets: Target[] = d.truth.beats
      .filter(isDominant)
      .filter((b) => b.qrsOn - 10 < dur)
      .map((b) => ({ lead: 'any', t0: Math.round(b.qrsOn - 10), t1: Math.min(Math.round(b.qrsOn + 60), Math.floor(dur)) }));
    const i = middleBeat(d.truth, d.ecg.signal.durationMs);
    const b = d.truth.beats[i >= 0 ? i : 0];
    const window = clampWindow(b.qrsOn - 900, b.qrsOn + 1600, d.ecg.signal.durationMs);
    return {
      ...base(ctx, {
        prompt: L('点击δ波（QRS起始部的顿挫）。', 'Click the delta wave (the slurred start of the QRS).', 'Haz clic en la onda delta (el empastamiento inicial del QRS).'),
        explanation: join([L('δ波位于QRS起始的30–60 ms内：上升缓慢，随后QRS变陡。', 'The delta wave occupies the first 30–60 ms of the QRS: a slow upstroke before the QRS steepens.', 'La onda delta ocupa los primeros 30–60 ms del QRS: un ascenso lento antes de que el QRS se haga más pendiente.'), hallmark('wpw')]),
        ecg: d.source,
        findings: ['wpw'],
        view: { layout: 'single', lead: 'V4', window },
        reveal: targets.map((t) => ({ kind: 'region' as const, lead: 'all' as const, t0: t.t0, t1: t.t1, color: 'qrs' as const })),
      }),
      kind: 'locate',
      key: { targets, need: 'one' },
    };
  };
}

// ── lead with the greatest ST elevation ─────────────────────────────────────────────────────────────────────────
export function makeLocateMaxSt() {
  return async (ctx: GenCtx): Promise<Item> => {
    const pool = focusPool(ctx, specPool(ctx.spec));
    const maxSt = (st: Readonly<Partial<Record<string, number>>>) => Math.max(...STD_LEADS.map((l) => st[l] ?? -Infinity));
    const d = await drawSynth(ctx, pool, { accept: (x) => maxSt(x.truth.stMv) >= 0.1 });
    const st = d.truth.stMv;
    const top = maxSt(st);
    const leads = STD_LEADS.filter((l) => (st[l] ?? -Infinity) >= top - 0.03);
    const dur = d.ecg.signal.durationMs;
    const fmt = (l: StdLead) => `${l} ${fmtStMm(st[l] ?? 0)}`;
    const ranked = [...STD_LEADS].sort((a, b) => (st[b] ?? 0) - (st[a] ?? 0)).slice(0, 4);
    const f = d.truth.findings.find((x) => x.startsWith('stemi-') || x === 'rv-infarction') ?? null;
    return {
      ...base(ctx, {
        prompt: L('点击ST段抬高最明显的导联（J点后60 ms处测量）。', 'Click the lead with the greatest ST elevation (measured 60 ms after the J point).', 'Haz clic en la derivación con mayor elevación del ST (medida 60 ms tras el punto J).'),
        explanation: join([
          tpl(L('J+60 ms处ST偏移（相对PR段）：{x}。', 'ST deviation at J+60 ms (against the PR segment): {x}.', 'Desviación del ST en J+60 ms (respecto al segmento PR): {x}.'), { x: ranked.map(fmt).join(', ') }),
          // the tracing-specific wording: never quote a STEMI threshold the tracing does not meet
          f ? (contextHallmark(f, d) ?? hallmark(f)) : null,
        ]),
        ecg: d.source,
        findings: f ? [f] : [],
        reveal: leads.map((lead) => ({ kind: 'lead' as const, lead, color: 'injury' as const })),
        hint: L('以PR段为基线，在J点后60 ms比较各导联ST段的高度。', 'Use the PR segment as the baseline and compare the ST level 60 ms after the J point in each lead.', 'Usa el segmento PR como línea de base y compara el nivel del ST 60 ms tras el punto J en cada derivación.'),
      }),
      kind: 'locate',
      key: { targets: leads.map((lead) => ({ lead, t0: 0, t1: dur })), need: 'one' },
    };
  };
}
