/**
 * Gate G1 on the realistic HRA heart: the real engine built on the baked HRA geometry with NORMAL_SCENARIO must pass
 * EVERY hard normal-rhythm oracle (tests/oracle/normalOracles). The formatted report (incl. the soft targets) is
 * printed, a golden snapshot of the ECG feature vector guards the calibration against silent geometry / engine
 * drift, and tests/out/ecg-hra-normal.png (12-lead 3 × 4 + lead II rhythm strip, 25 mm/s, 10 mm/mV) is written for a
 * human read.
 *
 * Golden: tests/oracle/hra-normal.golden.json. After an intentional recalibration regenerate it with
 *   UPDATE_GOLDEN=1 node node_modules/vitest/vitest.mjs run tests/oracle/hra-normal.test.ts
 * and review the diff. Tolerances: intervals ±5 ms, QRS axis ±5°, P/T axes ±8°, transition exact, amplitudes
 * ±max(0.05 mV, 10 %), ST ±0.03 mV, VCG magnitudes ±10 %, QRS–T angle ±5°, activation times ±2 ms.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { plot12Lead } from '../../../src/lab/sim/calibrate/ecgPlot';
import { encodePng } from '../../../src/lab/sim/calibrate/png';
import { buildEngineSync } from '../../../src/lab/sim/engine';
import { loadHraGeometry } from '../../../src/lab/sim/geometry/hra/load';
import { NORMAL_SCENARIO } from '../../../src/lab/sim/scenarios/normal';
import type { LeadName } from '../../../src/lab/sim/types';
import { LEADS } from '../../../src/lab/sim/types';
import type { OracleReport } from './normalOracles';
import { formatOracleReport, runNormalOracles } from './normalOracles';

const ASSET = new URL('../../../src/lab/assets/heart-hra.bin', import.meta.url);
const GOLDEN = new URL('./hra-normal.golden.json', import.meta.url);
const OUT = new URL('../../out/lab/', import.meta.url);

interface LeadFeatures {
  readonly q: number;
  readonly r: number;
  readonly s: number;
  readonly t: number;
  readonly stJ: number;
}

interface Features {
  readonly intervals: { readonly prMs: number; readonly pDurMs: number; readonly qrsMs: number; readonly qtMs: number; readonly qtcFMs: number };
  readonly axes: { readonly qrsDeg: number; readonly pDeg: number; readonly tDeg: number };
  readonly transition: string | null;
  readonly leads: Readonly<Record<LeadName, LeadFeatures>>;
  readonly vcg: { readonly qrsPeakMv: number; readonly tPeakMv: number; readonly qrsTAngleDeg: number; readonly svgMvMs: number };
  readonly activation: { readonly hvMs: number; readonly rvMinusLvMs: number; readonly rvBreakthroughMs: number };
}

const r3 = (x: number) => Math.round(x * 1000) / 1000;

function features(r: OracleReport): Features {
  const m = r.beat.m;
  const leads = {} as Record<LeadName, LeadFeatures>;
  for (const l of LEADS) {
    const x = m.leads[l];
    leads[l] = { q: r3(x.qAmp), r: r3(x.rAmp), s: r3(x.sAmp), t: r3(x.tAmp), stJ: r3(x.stJ) };
  }
  return {
    intervals: { prMs: r3(m.prMs), pDurMs: r3(m.pDurMs), qrsMs: r3(m.qrsMs), qtMs: r3(m.qtMs), qtcFMs: r3(m.qtcFridericiaMs) },
    axes: { qrsDeg: r3(m.axisQrsDeg), pDeg: r3(m.axisPDeg), tDeg: r3(m.axisTDeg) },
    transition: m.transitionLead,
    leads,
    vcg: { qrsPeakMv: r3(m.vcg.qrsPeakMv), tPeakMv: r3(m.vcg.tPeakMv), qrsTAngleDeg: r3(m.vcg.qrsTAngleDeg), svgMvMs: r3(m.vcg.svgMvMs) },
    activation: {
      hvMs: r3(r.activation.hvMs),
      rvMinusLvMs: r3(r.activation.rvOnsetMs - r.activation.lvOnsetMs),
      rvBreakthroughMs: r3(r.activation.rvBreakthroughMs),
    },
  };
}

/** Lists every feature outside its tolerance (empty = matches the golden). */
function compareFeatures(got: Features, want: Features): string[] {
  const bad: string[] = [];
  const near = (name: string, a: number, b: number, tol: number) => {
    if (!(Math.abs(a - b) <= tol)) bad.push(`${name}: ${a} vs golden ${b} (±${r3(tol)})`);
  };
  const amp = (name: string, a: number, b: number) => near(name, a, b, Math.max(0.05, 0.1 * Math.abs(b)));
  for (const k of Object.keys(want.intervals) as (keyof Features['intervals'])[]) near(`intervals.${k}`, got.intervals[k], want.intervals[k], 5);
  near('axes.qrsDeg', got.axes.qrsDeg, want.axes.qrsDeg, 5);
  near('axes.pDeg', got.axes.pDeg, want.axes.pDeg, 8);
  near('axes.tDeg', got.axes.tDeg, want.axes.tDeg, 8);
  if (got.transition !== want.transition) bad.push(`transition: ${got.transition} vs golden ${want.transition}`);
  for (const l of LEADS) {
    const a = got.leads[l], b = want.leads[l];
    amp(`${l}.q`, a.q, b.q);
    amp(`${l}.r`, a.r, b.r);
    amp(`${l}.s`, a.s, b.s);
    amp(`${l}.t`, a.t, b.t);
    near(`${l}.stJ`, a.stJ, b.stJ, 0.03);
  }
  near('vcg.qrsPeakMv', got.vcg.qrsPeakMv, want.vcg.qrsPeakMv, 0.1 * want.vcg.qrsPeakMv);
  near('vcg.tPeakMv', got.vcg.tPeakMv, want.vcg.tPeakMv, 0.1 * want.vcg.tPeakMv);
  near('vcg.svgMvMs', got.vcg.svgMvMs, want.vcg.svgMvMs, 0.1 * want.vcg.svgMvMs);
  near('vcg.qrsTAngleDeg', got.vcg.qrsTAngleDeg, want.vcg.qrsTAngleDeg, 5);
  for (const k of Object.keys(want.activation) as (keyof Features['activation'])[]) near(`activation.${k}`, got.activation[k], want.activation[k], 2);
  return bad;
}

describe('normal sinus rhythm on the HRA heart (gate G1)', () => {
  it('passes every hard oracle, matches the golden feature vector and writes ecg-hra-normal.png', async () => {
    const geo = await loadHraGeometry(undefined, new Uint8Array(readFileSync(ASSET)));
    const engine = buildEngineSync(geo, undefined, { scenario: NORMAL_SCENARIO });
    const report = runNormalOracles(engine);
    const fast = report.fast!.m;
    console.log(
      `HRA heart + NORMAL_SCENARIO (geometry ${geo.hash})\n${formatOracleReport(report)}\n` +
        `fast-rate beat (150 bpm): QRS onset ${(fast.fiducials.qrsOn! - report.fast!.v.tMs).toFixed(0)} ms after the V event, ` +
        `PR ${fast.prMs.toFixed(0)} ms, QT ${fast.qtMs.toFixed(0)} ms, QTcF ${fast.qtcFridericiaMs.toFixed(0)} ms`,
    );
    const failed = report.hard.filter((x) => !x.pass).map((x) => `${x.name} = ${x.value} (target ${x.target})`);
    expect(failed).toEqual([]);

    // 12-lead printout for a human read (tests/out is scratch, gitignored)
    engine.setHeartRate(75);
    const evs = engine.rhythm.eventsUntil(0);
    const t0 = (evs.length ? evs[evs.length - 1].tMs : 0) + 4000;
    const n = 10000;
    const leads = new Float32Array(12 * n);
    engine.sampleLeads(t0, n, leads);
    const img = plot12Lead(leads, n, engine.fsHz, { title: `HRA HEART  NORMAL SINUS RHYTHM 75 BPM  25 MM/S  10 MM/MV  ${geo.hash}` });
    mkdirSync(OUT, { recursive: true });
    writeFileSync(new URL('ecg-hra-normal.png', OUT), encodePng(img.width, img.height, img.rgb, (x) => deflateSync(x)));

    const got = features(report);
    if (process.env.UPDATE_GOLDEN === '1') {
      writeFileSync(GOLDEN, `${JSON.stringify({ geometryHash: geo.hash, ...got }, null, 1)}\n`);
      console.log('golden written: tests/oracle/hra-normal.golden.json');
    }
    expect(existsSync(GOLDEN), 'golden missing: run with UPDATE_GOLDEN=1').toBe(true);
    const want = JSON.parse(readFileSync(GOLDEN, 'utf8')) as Features & { geometryHash: string };
    expect(compareFeatures(got, want)).toEqual([]);
  }, 60_000);
});
