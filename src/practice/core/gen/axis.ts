/**
 * Frontal QRS axis families: the category ("quadrant": normal / LAD / RAD / extreme) first, then degrees on the
 * hexaxial dial. The key is the model's net-deflection axis (truth.axisDeg.qrs — the method the curriculum teaches);
 * draws whose net-deflection and area axes disagree (`axisAmbiguous`) are rejected, and outside `borderline` difficulty
 * so are axes within 10° of a category boundary.
 */
import type { Ecg } from '../../../core/ecg';
import { LIMB_LEADS, type StdLead } from '../../../core/leads';
import type { EcgMark } from '../../../ecg/api';
import type { Item } from '../../api';
import { TOL } from '../grade';
import { hallmark } from '../hallmarks';
import { fmtDeg, fname, join, L, tpl } from '../text';
import { axisBoundaryDistance, axisCategory, isDominant, middleBeat } from '../truth';
import { base, drawSynth, focusPool, netQrs, p2pQrs, specPool, type GenCtx } from './common';

const LIMB_ANGLE: Readonly<Record<(typeof LIMB_LEADS)[number], number>> = { I: 0, II: 60, III: 120, aVR: -150, aVL: -30, aVF: 90 };

interface AxisReading {
  readonly netI: number;
  readonly netAvf: number;
  readonly iso: StdLead;
}

/** Net deflections in I and aVF and the most equiphasic limb lead of the dominant beat (what the learner sees). */
export function readAxis(ecg: Ecg): AxisReading | null {
  const t = ecg.truth;
  if (!t) return null;
  const i = middleBeat(t, ecg.signal.durationMs, (b) => isDominant(b));
  if (i < 0) return null;
  const b = t.beats[i];
  let iso: StdLead = 'I';
  let best = Infinity;
  for (const lead of LIMB_LEADS) {
    const p2p = p2pQrs(ecg, lead, b);
    const ratio = p2p > 0 ? Math.abs(netQrs(ecg, lead, b)) / p2p : 1;
    if (ratio < best) {
      best = ratio;
      iso = lead;
    }
  }
  return { netI: netQrs(ecg, 'I', b), netAvf: netQrs(ecg, 'aVF', b), iso };
}

const sign = (v: number) => (v >= 0 ? L('正向为主', 'mainly positive', 'predominantemente positivo') : L('负向为主', 'mainly negative', 'predominantemente negativo'));

export function makeAxis(mode: 'quadrant' | 'degrees') {
  return async (ctx: GenCtx): Promise<Item> => {
    const pool = focusPool(ctx, specPool(ctx.spec));
    const d = await drawSynth(ctx, pool, {
      accept: (x) => !x.result.axisAmbiguous && (ctx.difficulty === 'borderline' || axisBoundaryDistance(x.truth.axisDeg.qrs) >= 10),
      tries: 10,
    });
    const deg = d.truth.axisDeg.qrs;
    const cat = axisCategory(deg);
    const r = readAxis(d.ecg);
    const lines = [
      tpl(L('QRS电轴约{d}：{c}。', 'QRS axis ≈ {d}: {c}.', 'Eje del QRS ≈ {d}: {c}.'), { d: fmtDeg(deg), c: fname(cat) }),
      r
        ? tpl(
            L('I导联{i}，aVF导联{f}，确定象限；最接近等电位的肢体导联是{iso}（{a}），电轴与之垂直。', 'Lead I is {i} and aVF is {f}, which gives the quadrant; the most equiphasic limb lead is {iso} ({a}), and the axis is perpendicular to it.', 'I es {i} y aVF {f}, lo que da el cuadrante; la derivación de los miembros más isodifásica es {iso} ({a}) y el eje es perpendicular a ella.'),
            { i: sign(r.netI), f: sign(r.netAvf), iso: r.iso, a: fmtDeg(LIMB_ANGLE[r.iso as keyof typeof LIMB_ANGLE]) },
          )
        : null,
      hallmark(cat),
      ctx.difficulty === 'borderline' && axisBoundaryDistance(deg) < 10
        ? L('该电轴接近分类界限（−30°、+90°）：此时看II导联——II以正向为主则不低于−30°。', 'This axis sits near a category boundary (−30°, +90°): look at lead II — if II is mainly positive the axis is not beyond −30°.', 'Este eje está cerca de un límite (−30°, +90°): mira la derivación II; si es predominantemente positiva, el eje no pasa de −30°.')
        : null,
    ];
    const reveal: EcgMark[] = [
      { kind: 'lead', lead: 'I', color: 'vector', label: r ? sign(r.netI) : undefined },
      { kind: 'lead', lead: 'aVF', color: 'vector', label: r ? sign(r.netAvf) : undefined },
      ...(r && r.iso !== 'I' && r.iso !== 'aVF' ? [{ kind: 'lead' as const, lead: r.iso, color: 'highlight' as const, label: L('最接近等电位', 'most equiphasic', 'más isodifásica') }] : []),
    ];
    const findings = d.truth.findings.filter((f) => f === 'lafb' || f === 'lpfb' || f === 'lad' || f === 'rad' || f === 'extreme-axis');
    const common = base(ctx, {
      prompt:
        mode === 'quadrant'
          ? L('QRS电轴属于哪一类？', 'Which category is the QRS axis?', '¿En qué categoría está el eje del QRS?')
          : L('估计额面QRS电轴（度），在轴盘上拖动或输入数值。', 'Estimate the frontal QRS axis in degrees — drag the vector on the dial or type it.', 'Estima el eje frontal del QRS en grados: arrastra el vector en el círculo o escríbelo.'),
      explanation: join(lines),
      ecg: d.source,
      findings,
      reveal,
      hint: L(
        '先看I和aVF的QRS主波方向确定象限，再找最接近等电位的肢体导联。',
        'First the signs of the QRS in I and aVF (the quadrant), then the limb lead with the most equiphasic QRS.',
        'Primero el signo del QRS en I y aVF (el cuadrante); después la derivación de los miembros con el QRS más isodifásico.',
      ),
    });
    return { ...common, kind: 'axis', key: { mode, truthDeg: deg, fullDeg: TOL.axisFullDeg, partialDeg: TOL.axisPartialDeg } };
  };
}
