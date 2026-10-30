/**
 * T4 realism envelopes (DECISION §8.2): a scenario's oracle-measured features against the 5th–95th percentiles of its
 * PTB-XL class (tests/synth/fixtures/ptbxl-envelopes.json, from PTB-XL+ GE 12SL features; scripts/synth/envelopes.ts).
 * Feature mapping (12SL → oracle): R_Amp → first R, S_Amp → S, T_Amp → largest |T| (signed), ST_Amp → ST at J+60,
 * PR / QRS / QT / axes → the oracle intervals (QT after the tangent-vs-12SL convention bias measured on the real records,
 * tests/synth/oracle/real.test.ts). Data: PTB-XL v1.0.3 / PTB-XL+ v1.0.1, PhysioNet, CC BY 4.0.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { STD_LEADS } from '../../src/core/leads';
import type { Measurement } from './oracle/measure';

/** Scenario → PTB-XL class (classes with ≥ 30 clean records in the fixture). */
export const SCENARIO_CLASS: Readonly<Record<string, string>> = {
  normal: 'NORM', 'sinus-bradycardia': 'SBRAD', 'sinus-tachycardia': 'STACH', 'sinus-arrhythmia': 'SARRH', irbbb: 'IRBBB',
  rbbb: 'CRBBB', lbbb: 'CLBBB', 'stemi-anterior': 'AMI', 'stemi-inferior': 'IMI', 'lvh-strain': 'LVH', wpw: 'WPW',
  'atrial-flutter': 'AFLT', 'atrial-fibrillation': 'AFIB',
};

/** oracle tangent QT − 12SL QT on the shipped records (2026-10-17): compare QT features after adding it back */
export const QT_CONVENTION_BIAS_MS = -35;

interface Env { readonly p5: number; readonly p50: number; readonly p95: number }
interface ClassEnv { readonly n: number; readonly global: Readonly<Record<string, Env>>; readonly leads: Readonly<Record<string, Readonly<Record<string, Env>>>> }
let cache: Readonly<Record<string, ClassEnv>> | null = null;

export function envelopes(): Readonly<Record<string, ClassEnv>> {
  cache ??= (JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/ptbxl-envelopes.json', import.meta.url)), 'utf8')) as { classes: Record<string, ClassEnv> }).classes;
  return cache;
}

export interface FeatureCheck {
  readonly name: string;
  readonly value: number;
  readonly env: Env;
  readonly inside: boolean;
}

/** Every comparable feature of one measurement against a class envelope. */
export function checkFeatures(m: Measurement, cls: string): FeatureCheck[] {
  const e = envelopes()[cls];
  if (!e) throw new Error(`no envelope for class ${cls}`);
  const out: FeatureCheck[] = [];
  const add = (name: string, value: number | null, env: Env | undefined, angle = false): void => {
    if (value === null || !Number.isFinite(value) || !env || !Number.isFinite(env.p5)) return;
    // angles: 12SL reports −90…270°, the oracle (−180, 180]; try the equivalent angle one turn away
    let v = value;
    if (angle && v < env.p5 && v + 360 <= env.p95) v += 360;
    if (angle && v > env.p95 && v - 360 >= env.p5) v -= 360;
    out.push({ name, value: v, env, inside: v >= env.p5 && v <= env.p95 });
  };
  add('QRS', m.qrsMs, e.global.qrs);
  // no P waves in fibrillation / flutter: PR and P axis are not features of those classes
  const atrialChaos = cls === 'AFIB' || cls === 'AFLT';
  if (!atrialChaos) add('PR', m.prMs, e.global.pr);
  add('QT', m.qtMs === null ? null : m.qtMs - QT_CONVENTION_BIAS_MS, e.global.qt);
  add('QRS axis', m.axisDeg, e.global.qrsAxis, true);
  if (!atrialChaos) add('P axis', m.pAxisDeg, e.global.pAxis, true);
  add('T axis', m.tAxisDeg, e.global.tAxis, true);
  for (const l of STD_LEADS) {
    const f = m.feats[l], le = e.leads[l];
    add(`${l} R`, f.r, le.R_Amp);
    add(`${l} S`, f.s, le.S_Amp);
    add(`${l} T`, f.t, le.T_Amp);
    add(`${l} ST`, f.st60, le.ST_Amp);
  }
  return out;
}
