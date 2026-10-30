/**
 * Normal-sinus-rhythm oracle harness (plan "硬预言" / "软目标"; docs/research/disease-spec.md normal-sinus-rhythm and
 * normal_reference). Works on any SimEngine: blind measurements (src/sim/measure) + activation-field checks.
 *
 * "Pure" in the sense that it has no global state and restores the engine's heart rate before returning; it does
 * call engine.setHeartRate to run the 50 → 150 bpm checks (the rhythm is append-only, so later beats are used).
 */
import type { MeasuredBeat } from '../../../src/lab/sim/measure/beat';
import { measureEngineBeat } from '../../../src/lab/sim/measure/beat';
import type { BeatMeasurementEx } from '../../../src/lab/sim/measure/measure';
import type { LeadName, SimEngine, StructureId } from '../../../src/lab/sim/types';
import { compMask } from '../../../src/lab/sim/conduction/gridUtil';
import { CHAMBER, COMP, STRUCTURES, TISSUE } from '../../../src/lab/sim/types';

export interface OracleResult {
  readonly name: string;
  readonly pass: boolean;
  readonly value: number | string;
  readonly target: string;
  /** Normalized distance outside the target (0 when passing) — used by the calibration loss. */
  readonly violation: number;
  /** Loss weight (soft targets; default 1). */
  readonly weight?: number;
}

export interface OracleReport {
  readonly hard: readonly OracleResult[];
  readonly soft: readonly OracleResult[];
  readonly beat: MeasuredBeat;
  readonly slow: MeasuredBeat | null;
  readonly fast: MeasuredBeat | null;
  readonly activation: ActivationSummary;
}

export interface OracleOptions {
  readonly baseBpm?: number;
  readonly slowBpm?: number;
  readonly fastBpm?: number;
  /** Skip the 50/150 bpm checks (cheaper; calibration inner loops). */
  readonly skipRateTest?: boolean;
}

export interface ActivationSummary {
  readonly rvBreakthroughMs: number;
  readonly breakthroughs: readonly { readonly tMs: number; readonly region: StructureId | 'none' }[];
  readonly lastRegion: StructureId | 'none';
  readonly lastRegionOk: boolean;
  readonly qrsSpanMs: number;
  readonly atrialSpanMs: number;
  /** His → first ventricular activation (ms; V event = His activation). */
  readonly hvMs: number;
  /** First activation of voxels facing the LV / RV cavity (ms rel. to the V event). */
  readonly lvOnsetMs: number;
  readonly rvOnsetMs: number;
}

// ---------------------------------------------------------------- helpers

const range = (name: string, value: number, lo: number, hi: number, scale = Math.max(1, (hi - lo) / 2)): OracleResult => {
  // ±Infinity is a legitimate value (e.g. R/S with no S wave); NaN means "not measurable" and always fails.
  const pass = !Number.isNaN(value) && value >= lo && value <= hi;
  const violation = Number.isNaN(value) ? 10 : value < lo ? Math.min(10, (lo - value) / scale) : value > hi ? Math.min(10, (value - hi) / scale) : 0;
  return { name, pass, value: round(value), target: `${fmt(lo)} … ${fmt(hi)}`, violation };
};
const below = (name: string, value: number, hi: number, scale = Math.max(Math.abs(hi), 1e-3)): OracleResult => range(name, value, -Infinity, hi, scale);
const above = (name: string, value: number, lo: number, scale = Math.max(Math.abs(lo), 1e-3)): OracleResult => range(name, value, lo, Infinity, scale);
const boolean = (name: string, pass: boolean, value: string, target: string, violation = 1): OracleResult => ({ name, pass, value, target, violation: pass ? 0 : violation });
const round = (x: number) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : x);
const fmt = (x: number) => (x === Infinity ? '∞' : x === -Infinity ? '−∞' : String(x));

function steadyBeat(engine: SimEngine, bpm: number, ventricularOnlyLeads: boolean): MeasuredBeat {
  engine.setHeartRate(bpm);
  const evs = engine.rhythm.eventsUntil(0);
  const last = evs.length ? evs[evs.length - 1].tMs : 0;
  // three full cycles at the new rate so RR_prev, APD scale and AV delay have settled
  const at = last + 3 * (60000 / bpm) + 400;
  return measureEngineBeat(engine, at, { ventricularOnlyLeads });
}

/** Activation-sequence facts from the engine's slot-0 fields. */
export function summarizeActivation(engine: SimEngine): ActivationSummary {
  const g = engine.geometry.grid;
  const [nx, ny, nz] = g.dims;
  const fV = engine.fields.ventricular[0], fA = engine.fields.atrial[0];
  const tV = fV.tAct;
  const t0 = fV.tMinMs;
  const tissue = g.tissue, chamber = g.chamber;
  const OUT = TISSUE.Out, VESSEL = TISSUE.Vessel, RING = TISSUE.Ring, BLOOD = TISSUE.Blood, RV = TISSUE.RV, CH_LV = CHAMBER.LV, CH_RV = CHAMBER.RV;
  const isV = compMask(g, COMP.Ventricular);
  // Epicardium: ventricular voxels with a face neighbour outside the heart OR in a solid epicardial vessel (coronary
  // arteries / cardiac veins run in the subepicardial fat — myocardium under them is epicardium; without this the
  // epicardial sheet has holes along every vessel of a realistic geometry). Cavity onsets from blood neighbours.
  // Breakthrough candidates additionally must not touch the fibrous ring: the basal rim where the myocardium inserts
  // into the AV annulus is the edge of the epicardial sheet, and its earlier neighbours (under the ring / atria) are
  // not epicardial, so a rim voxel is a "local minimum" without any intramural breakthrough (HRA heart, 2026-10-08).
  const epi = new Uint8Array(tV.length);
  const rim = new Uint8Array(tV.length);
  const off = [1, -1, nx, -nx, nx * ny, -nx * ny];
  let lvOn = Infinity, rvOn = Infinity;
  for (let k = 1; k < nz - 1; k++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const v = i + nx * (j + ny * k);
        const tv = tV[v];
        if (!isV[v] || tv === Infinity) continue;
        for (const o of off) {
          const w = v + o, tw = tissue[w];
          if (tw === OUT || tw === VESSEL) epi[v] = 1;
          else if (tw === RING) rim[v] = 1;
          else if (tw === BLOOD) {
            // Durrer: RV endocardium starts 5–10 ms after the LV
            if (chamber[w] === CH_LV) lvOn = Math.min(lvOn, tv);
            else if (chamber[w] === CH_RV) rvOn = Math.min(rvOn, tv);
          }
        }
      }
  let rvBt = Infinity;
  for (let v = 0; v < tV.length; v++) if (epi[v] && tissue[v] === RV) rvBt = Math.min(rvBt, tV[v] - t0);
  // breakthrough sites: epicardial local minima of tAct within a 6 mm neighbourhood
  const r = Math.max(1, Math.round(6 / g.hMm));
  const breakthroughs: { tMs: number; region: StructureId | 'none' }[] = [];
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const v = i + nx * (j + ny * k);
        if (!epi[v] || rim[v]) continue;
        let isMin = true;
        for (let dk = -r; dk <= r && isMin; dk++)
          for (let dj = -r; dj <= r && isMin; dj++)
            for (let di = -r; di <= r; di++) {
              const ii = i + di, jj = j + dj, kk = k + dk;
              if (ii < 0 || jj < 0 || kk < 0 || ii >= nx || jj >= ny || kk >= nz) continue;
              const w = ii + nx * (jj + ny * kk);
              if (w === v || !epi[w]) continue;
              if (tV[w] < tV[v] || (tV[w] === tV[v] && w < v)) {
                isMin = false;
                break;
              }
            }
        if (isMin) breakthroughs.push({ tMs: tV[v] - t0, region: g.region[v] < STRUCTURES.length ? STRUCTURES[g.region[v]] : 'none' });
      }
  breakthroughs.sort((a, b) => a.tMs - b.tMs);
  // last activated 1 % of ventricular voxels → majority region
  const order: number[] = [];
  for (let v = 0; v < tV.length; v++) if (Number.isFinite(tV[v])) order.push(v);
  order.sort((a, b) => tV[b] - tV[a]);
  const top = order.slice(0, Math.max(1, Math.round(order.length * 0.01)));
  const counts = new Map<string, number>();
  let basalPosterolateral = 0;
  for (const v of top) {
    const id = g.region[v] < STRUCTURES.length ? STRUCTURES[g.region[v]] : 'none';
    counts.set(id, (counts.get(id) ?? 0) + 1);
    const lvBasalFree = (id === 'LV_LATERAL' || id === 'LV_INFERIOR') && g.apexBase[v] >= 0.66;
    if (id === 'LV_POSTEROBASAL' || id === 'RVOT' || lvBasalFree) basalPosterolateral++;
  }
  const lastRegion = ([...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none') as StructureId | 'none';
  return {
    rvBreakthroughMs: rvBt,
    breakthroughs,
    lastRegion,
    lastRegionOk: basalPosterolateral >= 0.5 * top.length,
    qrsSpanMs: fV.tMaxMs - fV.tMinMs,
    atrialSpanMs: fA.tMaxMs - fA.tMinMs,
    hvMs: fV.tMinMs,
    lvOnsetMs: lvOn,
    rvOnsetMs: rvOn,
  };
}

// ---------------------------------------------------------------- oracles

export function runNormalOracles(engine: SimEngine, opts: OracleOptions = {}): OracleReport {
  const hr0 = engine.rhythm.heartRate;
  const base = opts.baseBpm ?? 75;
  const beat = steadyBeat(engine, base, false);
  const m = beat.m;
  const L = (l: LeadName) => m.leads[l];
  const act = summarizeActivation(engine);

  const hard: OracleResult[] = [
    range('PR (ms)', m.prMs, 120, 200, 20),
    below('P duration (ms)', m.pDurMs, 120, 20),
    above('P net area I (mV·ms)', m.pArea.I, 0, 1),
    above('P net area II (mV·ms)', m.pArea.II, 0, 1),
    above('P net area aVF (mV·ms)', m.pArea.aVF, 0, 1),
    below('P net area aVR (mV·ms)', m.pArea.aVR, 0, 1),
    below('QRS duration (ms)', m.qrsMs, 120, 20),
    range('QRS axis, net areas (deg)', m.axisQrsDeg, -30, 90, 30),
    below('aVR net QRS area (mV·ms)', L('aVR').netQrsArea, 0, 5),
    below('aVR net T area (mV·ms)', L('aVR').netTArea, 0, 5),
    below('R/S V1', m.rsRatio.V1, 1, 1),
    above('R/S V5', m.rsRatio.V5, 1, 1),
    above('R/S V6', m.rsRatio.V6, 1, 1),
    boolean('transition V2–V4', ['V2', 'V3', 'V4'].includes(m.transitionLead ?? ''), String(m.transitionLead), 'V2 … V4'),
    boolean(
      'septal q in (V5 or V6) and (I or aVL)',
      (L('V5').qAmp > 0 || L('V6').qAmp > 0) && (L('I').qAmp > 0 || L('aVL').qAmp > 0),
      `V5 ${L('V5').qAmp.toFixed(3)} V6 ${L('V6').qAmp.toFixed(3)} I ${L('I').qAmp.toFixed(3)} aVL ${L('aVL').qAmp.toFixed(3)}`,
      'q ≥ 0.03 mV, ≤ 40 ms',
    ),
    ...(['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V4', 'V5', 'V6'] as const).map((l) => below(`|ST(J)| ${l} (mV)`, Math.abs(L(l).stJ), 0.1, 0.05)),
    ...(['V2', 'V3'] as const).map((l) => below(`|ST(J)| ${l} (mV)`, Math.abs(L(l).stJ), 0.2, 0.05)),
    ...(['I', 'II', 'V3', 'V4', 'V5', 'V6'] as const).map((l) => above(`T net area ${l} (mV·ms)`, L(l).netTArea, 0, 5)),
    below('SV1 + RV5 (mV)', L('V1').sAmp + L('V5').rAmp, 3.5, 0.5),
    range('QTc Fridericia (ms)', m.qtcFridericiaMs, 350, 440, 20),
    below('RV epicardial breakthrough (ms)', act.rvBreakthroughMs, 25, 5),
    below('latest breakthrough (ms)', act.breakthroughs.length ? Math.max(...act.breakthroughs.map((b) => b.tMs)) : Infinity, 40, 5),
    boolean('last activation basal posterolateral LV or RVOT', act.lastRegionOk, act.lastRegion, 'LV_POSTEROBASAL / basal LV lateral-inferior / RVOT'),
    below('atrial activation span (ms)', act.atrialSpanMs, 110, 10),
  ];

  let slow: MeasuredBeat | null = null, fast: MeasuredBeat | null = null;
  if (!opts.skipRateTest) {
    slow = steadyBeat(engine, opts.slowBpm ?? 50, true);
    fast = steadyBeat(engine, opts.fastBpm ?? 150, true);
    hard.push(
      range(`QTc Fridericia @${opts.slowBpm ?? 50} bpm (ms)`, slow.m.qtcFridericiaMs, 350, 440, 20),
      range(`QTc Fridericia @${opts.fastBpm ?? 150} bpm (ms)`, fast.m.qtcFridericiaMs, 350, 440, 20),
      above('PR shortening slow → fast (ms)', slow.m.prMs - fast.m.prMs, 1e-6, 5),
    );
  }
  engine.setHeartRate(hr0);

  const rProg = [L('V1').rAmp, L('V2').rAmp, L('V3').rAmp, L('V4').rAmp];
  const soft: OracleResult[] = [
    range('QRS duration (ms)', m.qrsMs, 80, 100, 10),
    range('QRS axis (deg)', m.axisQrsDeg, 30, 70, 20),
    boolean('transition V3–V4', ['V3', 'V4'].includes(m.transitionLead ?? ''), String(m.transitionLead), 'V3 … V4', 0.5),
    boolean('R increasing V1 → V4', rProg.every((x, i) => i === 0 || x > rProg[i - 1]), rProg.map((x) => x.toFixed(2)).join(' < '), 'monotonic', 0.5),
    range('VCG peak |QRS| (mV)', m.vcg.qrsPeakMv, 1.4, 2.5, 0.5),
    range('VCG peak |T| (mV)', m.vcg.tPeakMv, 0.4, 0.8, 0.2),
    range('spatial QRS–T angle (deg)', m.vcg.qrsTAngleDeg, 30, 60, 20),
    range('SVG (mV·ms)', m.vcg.svgMvMs, 60, 110, 20),
    range('P amplitude II (mV)', L('II').pAmp, 0.05, 0.25, 0.05),
    range('P axis (deg)', m.axisPDeg, 0, 75, 20),
    range('T axis (deg)', m.axisTDeg, 0, 90, 20),
    below('|ST(J+60)| max (mV)', Math.max(...Object.values(m.leads).map((x) => Math.abs(x.stJ60))), 0.05, 0.05),
    // conduction-system design targets (graph.ts spec; Durrer 1970, Denker 1984) — weighted so calibration cannot
    // buy ECG morphology with non-physiological timing
    { ...range('HV interval (ms)', act.hvMs, 35, 45, 5), weight: 4 },
    { ...range('RV − LV endocardial onset (ms)', act.rvOnsetMs - act.lvOnsetMs, 5, 10, 3), weight: 4 },
    ...durrerSpread(engine),
  ];
  return { hard, soft, beat, slow, fast, activation: act };
}

/** Spread of the LV fascicle-terminal (Durrer site) activation times, when the engine exposes them. */
function durrerSpread(engine: SimEngine): OracleResult[] {
  const va = (engine as Partial<{ ventricularActivation: { terminals: readonly { id: string; voxel: number }[] } }>).ventricularActivation;
  if (!va) return [];
  const t = engine.fields.ventricular[0].tAct;
  const lv = va.terminals.filter((x) => x.id !== 'RBB').map((x) => t[x.voxel]);
  if (lv.length === 0) return [];
  const lvOnset = engine.fields.ventricular[0].tMinMs;
  return [{ ...range('Durrer LV sites: latest − LV onset (ms)', Math.max(...lv) - lvOnset, 0, 5, 3), weight: 4 }];
}

export function formatOracleReport(r: OracleReport): string {
  const line = (x: OracleResult) => `  ${x.pass ? 'PASS' : 'FAIL'}  ${x.name.padEnd(46)} ${String(x.value).padEnd(28)} target ${x.target}`;
  const nh = r.hard.filter((x) => x.pass).length, ns = r.soft.filter((x) => x.pass).length;
  const m: BeatMeasurementEx = r.beat.m;
  return [
    `HARD ${nh}/${r.hard.length}`,
    ...r.hard.map(line),
    `SOFT ${ns}/${r.soft.length}`,
    ...r.soft.map(line),
    `beat: HR ${m.hrBpm.toFixed(0)} PR ${m.prMs.toFixed(0)} P ${m.pDurMs.toFixed(0)} QRS ${m.qrsMs.toFixed(0)} QT ${m.qtMs.toFixed(0)} QTcF ${m.qtcFridericiaMs.toFixed(0)} axis ${m.axisQrsDeg.toFixed(0)}° transition ${m.transitionLead}`,
    `activation: HV ${r.activation.hvMs.toFixed(1)} ms, LV/RV endocardial onset ${r.activation.lvOnsetMs.toFixed(1)}/${r.activation.rvOnsetMs.toFixed(1)} ms, RV breakthrough ${r.activation.rvBreakthroughMs.toFixed(1)} ms, ${r.activation.breakthroughs.length} breakthroughs ≤ ${Math.max(...r.activation.breakthroughs.map((b) => b.tMs)).toFixed(1)} ms, last ${r.activation.lastRegion}, QRS span ${r.activation.qrsSpanMs.toFixed(0)} ms, atria ${r.activation.atrialSpanMs.toFixed(0)} ms`,
  ].join('\n');
}

/** Scalar loss for calibration: hard violations weigh 10×, soft distances 1×. */
export function oracleLoss(r: OracleReport, hardWeight = 10): number {
  let s = 0;
  for (const x of r.hard) if (!x.pass) s += hardWeight * (1 + Math.min(5, x.violation));
  for (const x of r.soft) if (!x.pass) s += (x.weight ?? 1) * Math.min(5, x.violation) ** 2;
  return s;
}
