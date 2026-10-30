/**
 * Fake ECG providers for the practice tests: a small synthetic catalogue (ids, groups and findings from
 * _proto/DECISION.md §9) and a `generate` that builds schematic but self-consistent truth (beats, atrial events,
 * intervals, axis, ST) from the request's dials and seed, with limb-lead QRS deflections that follow the axis so the
 * generators' signal readings work. The real port serves the shipped PTB-XL case list with flat signals.
 */
import type { AtrialEvent, BeatMarks, Ecg, EcgTruth } from '../../src/core/ecg';
import { FINDINGS, type FindingId } from '../../src/core/findings';
import { EXTRA_LEADS, LIMB_ANGLE_DEG, STD_LEADS, type Lead, type StdLead } from '../../src/core/leads';
import { createRng, type Rng } from '../../src/core/rng';
import { compatibleFindings, getLibrary } from '../../src/real/index';
import type { DialId, ScenarioDef, ScenarioGroup, SynthRequest, SynthResult } from '../../src/synth/index';
import type { RealPort, SynthPort } from '../../src/practice/core/ports';

type Row = readonly [id: string, group: ScenarioGroup, findings: readonly FindingId[], opts?: { readonly na?: boolean; readonly variants?: Record<string, readonly FindingId[]> }];

const ROWS: readonly Row[] = [
  ['normal', 'normal', ['normal-ecg', 'sinus-rhythm']],
  ['sinus-bradycardia', 'normal', ['sinus-bradycardia']],
  ['sinus-tachycardia', 'normal', ['sinus-tachycardia']],
  ['sinus-arrhythmia', 'normal', ['sinus-arrhythmia']],
  ['early-repolarization', 'normal', ['early-repolarization']],
  ['juvenile-t', 'normal', ['juvenile-t']],
  ['athlete', 'normal', ['athlete-changes']],
  ['irbbb', 'normal', ['irbbb']],
  ['sinus-pause', 'atrial', ['sinus-pause']],
  ['sa-exit-block', 'atrial', ['sa-exit-block']],
  ['sinus-node-dysfunction', 'atrial', ['sinus-node-dysfunction']],
  ['ectopic-atrial-rhythm', 'atrial', ['ectopic-atrial-rhythm']],
  ['wandering-atrial-pacemaker', 'atrial', ['wandering-atrial-pacemaker']],
  ['pac', 'atrial', ['pac']],
  ['pac-blocked', 'atrial', ['pac-blocked']],
  ['atrial-tachycardia', 'atrial', ['atrial-tachycardia']],
  ['mat', 'atrial', ['mat']],
  ['pjc', 'atrial', ['pjc']],
  ['junctional-escape-rhythm', 'atrial', ['junctional-escape-rhythm']],
  ['accelerated-junctional-rhythm', 'atrial', ['accelerated-junctional-rhythm']],
  ['atrial-fibrillation', 'svt', ['atrial-fibrillation']],
  ['atrial-flutter', 'svt', ['atrial-flutter']],
  ['avnrt', 'svt', ['avnrt', 'svt']],
  ['avrt', 'svt', ['avrt', 'svt']],
  ['wpw', 'svt', ['wpw', 'short-pr']],
  ['short-pr', 'svt', ['short-pr']],
  ['pvc', 'ventricular', ['pvc']],
  ['ventricular-bigeminy', 'ventricular', ['ventricular-bigeminy', 'pvc']],
  ['pvc-patterns', 'ventricular', ['pvc', 'ventricular-couplet']],
  ['aivr', 'ventricular', ['aivr', 'av-dissociation']],
  ['ventricular-escape-rhythm', 'ventricular', ['ventricular-escape-rhythm', 'av-block-3']],
  ['vt-monomorphic', 'ventricular', ['vt-monomorphic', 'av-dissociation']],
  ['vt-polymorphic', 'ventricular', ['vt-polymorphic'], { na: true }],
  ['torsades', 'ventricular', ['torsades', 'long-qt'], { na: true }],
  ['ventricular-flutter', 'ventricular', ['ventricular-flutter'], { na: true }],
  ['ventricular-fibrillation', 'ventricular', ['ventricular-fibrillation'], { na: true }],
  ['asystole', 'ventricular', ['asystole'], { na: true }],
  ['av-block-1', 'av-block', ['av-block-1']],
  ['av-block-2-mobitz1', 'av-block', ['av-block-2-mobitz1']],
  ['av-block-2-mobitz2', 'av-block', ['av-block-2-mobitz2']],
  ['av-block-2-2to1', 'av-block', ['av-block-2-2to1']],
  ['av-block-high-grade', 'av-block', ['av-block-high-grade']],
  ['av-block-3', 'av-block', ['av-block-3', 'av-dissociation']],
  ['av-dissociation', 'av-block', ['av-dissociation']],
  ['rbbb', 'conduction', ['rbbb', 'secondary-st-t']],
  ['lbbb', 'conduction', ['lbbb', 'secondary-st-t']],
  ['ilbbb', 'conduction', ['ilbbb']],
  ['lafb', 'conduction', ['lafb']],
  ['lpfb', 'conduction', ['lpfb']],
  ['bifascicular-block', 'conduction', ['bifascicular-block', 'rbbb', 'lafb']],
  ['trifascicular-block', 'conduction', ['trifascicular-block', 'bifascicular-block', 'av-block-1']],
  ['ivcd', 'conduction', ['ivcd']],
  ['stemi-anterior', 'ischemia', ['stemi-anterior', 'reciprocal-changes']],
  ['stemi-anteroseptal', 'ischemia', ['stemi-anteroseptal']],
  ['stemi-anterolateral', 'ischemia', ['stemi-anterolateral']],
  ['stemi-high-lateral', 'ischemia', ['stemi-high-lateral']],
  ['stemi-lateral', 'ischemia', ['stemi-lateral']],
  ['stemi-inferior', 'ischemia', ['stemi-inferior', 'reciprocal-changes'], { variants: { posterior: ['stemi-inferior', 'stemi-posterior'] } }],
  ['rv-infarction', 'ischemia', ['rv-infarction', 'stemi-inferior']],
  ['stemi-posterior', 'ischemia', ['stemi-posterior']],
  ['hyperacute-t', 'ischemia', ['hyperacute-t']],
  ['de-winter', 'ischemia', ['de-winter']],
  ['wellens', 'ischemia', ['wellens']],
  ['avr-elevation-diffuse-std', 'ischemia', ['avr-elevation-diffuse-std', 'st-depression-ischemic']],
  ['st-depression-ischemic', 'ischemia', ['st-depression-ischemic']],
  ['t-inversion-ischemic', 'ischemia', ['t-inversion-ischemic']],
  ['old-mi', 'ischemia', ['old-mi-anterior', 'pathological-q'], { variants: { inferior: ['old-mi-inferior', 'pathological-q'], lateral: ['old-mi-lateral', 'pathological-q'] } }],
  ['lv-aneurysm', 'ischemia', ['lv-aneurysm', 'old-mi-anterior']],
  ['sgarbossa', 'ischemia', ['sgarbossa-positive', 'lbbb']],
  ['takotsubo', 'ischemia', ['takotsubo']],
  ['lae', 'chambers', ['lae']],
  ['rae', 'chambers', ['rae']],
  ['biatrial-abnormality', 'chambers', ['biatrial-abnormality']],
  ['interatrial-block', 'chambers', ['interatrial-block']],
  ['lvh', 'chambers', ['lvh']],
  ['lvh-strain', 'chambers', ['lvh-strain']],
  ['rvh', 'chambers', ['rvh']],
  ['biventricular-hypertrophy', 'chambers', ['biventricular-hypertrophy']],
  ['low-voltage', 'chambers', ['low-voltage']],
  ['electrical-alternans', 'chambers', ['electrical-alternans', 'pericardial-effusion']],
  ['poor-r-progression', 'chambers', ['poor-r-progression']],
  ['dextrocardia', 'chambers', ['dextrocardia']],
  ['copd-pattern', 'chambers', ['copd-pattern']],
  ['hyperkalemia', 'repolarization', ['hyperkalemia', 'peaked-t']],
  ['hypokalemia', 'repolarization', ['hypokalemia', 'u-waves']],
  ['hypercalcemia', 'repolarization', ['hypercalcemia']],
  ['hypocalcemia', 'repolarization', ['hypocalcemia', 'long-qt']],
  ['digoxin-effect', 'repolarization', ['digoxin-effect']],
  ['long-qt', 'repolarization', ['long-qt']],
  ['short-qt', 'repolarization', ['short-qt']],
  ['na-channel-blockade', 'repolarization', ['na-channel-blockade', 'sinus-tachycardia']],
  ['hypothermia', 'repolarization', ['hypothermia', 'osborn-waves']],
  ['cerebral-t', 'repolarization', ['cerebral-t', 'long-qt']],
  ['nonspecific-st-t', 'repolarization', ['nonspecific-st-t']],
  ['brugada-type1', 'structural', ['brugada-type1']],
  ['brugada-type2', 'structural', ['brugada-type2']],
  ['hcm', 'structural', ['hcm', 'lvh']],
  ['apical-hcm', 'structural', ['apical-hcm']],
  ['arvc', 'structural', ['arvc', 'epsilon-wave']],
  ['pericarditis', 'structural', ['pericarditis']],
  ['pericardial-effusion', 'structural', ['pericardial-effusion', 'low-voltage']],
  ['pulmonary-embolism', 'structural', ['pulmonary-embolism', 'sinus-tachycardia']],
  ['paced-vvi', 'pacing', ['paced-rhythm', 'secondary-st-t']],
  ['pacing-failure-capture', 'pacing', ['pacing-failure-capture', 'paced-rhythm']],
  ['pacing-undersensing', 'pacing', ['pacing-undersensing']],
  ['pacing-oversensing', 'pacing', ['pacing-oversensing']],
  ['electrode-reversal-la-ra', 'technical', ['electrode-reversal-la-ra']],
  ['electrode-reversal-la-ll', 'technical', ['electrode-reversal-la-ll']],
  ['electrode-reversal-ra-ll', 'technical', ['electrode-reversal-ra-ll']],
  ['precordial-misplacement', 'technical', ['precordial-misplacement']],
  ['baseline-wander', 'technical', ['baseline-wander']],
  ['muscle-tremor', 'technical', ['muscle-tremor']],
  ['ac-interference', 'technical', ['ac-interference']],
];

export const FAKE_SCENARIOS: readonly ScenarioDef[] = ROWS.map(([id, group, findings, opts]) => ({
  id,
  group,
  findings,
  source: { rhythm: { kind: 'sinus', rateBpm: 75 }, activation: { kind: 'conducted' } },
  dials: { rate: { min: 50, max: 110 }, axis: { min: -60, max: 120 } },
  ...(opts?.na ? { intervals: 'not-applicable' as const } : {}),
  ...(opts?.variants
    ? { variants: Object.fromEntries(Object.entries(opts.variants).map(([k, f]) => [k, { label: { zh: k, en: k, es: k }, patch: {}, findings: f }])) }
    : {}),
}));

const has = (fs: readonly FindingId[], ...xs: FindingId[]) => xs.some((x) => fs.includes(x));

function baseRate(fs: readonly FindingId[]): number {
  if (has(fs, 'ventricular-fibrillation', 'ventricular-flutter')) return 300;
  if (has(fs, 'asystole')) return 0;
  if (has(fs, 'vt-monomorphic', 'vt-polymorphic', 'torsades')) return 180;
  if (has(fs, 'avnrt', 'avrt', 'svt')) return 180;
  if (has(fs, 'atrial-tachycardia', 'mat', 'sinus-tachycardia', 'atrial-fibrillation', 'pulmonary-embolism', 'electrical-alternans')) return 120;
  if (has(fs, 'atrial-flutter')) return 150;
  if (has(fs, 'ventricular-escape-rhythm', 'av-block-3')) return 38;
  if (has(fs, 'junctional-escape-rhythm', 'sinus-bradycardia', 'av-block-2-2to1', 'av-block-high-grade', 'hypothermia', 'athlete-changes')) return 48;
  if (has(fs, 'aivr', 'accelerated-junctional-rhythm')) return 80;
  return 72;
}

function baseAxis(fs: readonly FindingId[]): number {
  if (has(fs, 'lafb', 'bifascicular-block')) return -60;
  if (has(fs, 'lpfb', 'rvh', 'copd-pattern', 'pulmonary-embolism')) return 115;
  if (has(fs, 'dextrocardia')) return 150;
  if (has(fs, 'lbbb')) return -10;
  return 50;
}

const IRREGULAR: readonly FindingId[] = ['atrial-fibrillation', 'sinus-arrhythmia', 'mat', 'pac', 'pvc', 'ventricular-bigeminy', 'ventricular-couplet', 'wandering-atrial-pacemaker', 'vt-polymorphic', 'torsades', 'ventricular-fibrillation', 'sinus-pause', 'sa-exit-block', 'sinus-node-dysfunction', 'av-block-2-mobitz1', 'av-block-2-mobitz2', 'pac-blocked'];

const ST_LEADS: Readonly<Partial<Record<FindingId, readonly StdLead[]>>> = {
  'stemi-anterior': ['V1', 'V2', 'V3', 'V4'],
  'stemi-anteroseptal': ['V1', 'V2', 'V3'],
  'stemi-anterolateral': ['V3', 'V4', 'V5', 'V6', 'I', 'aVL'],
  'stemi-inferior': ['II', 'III', 'aVF'],
  'rv-infarction': ['II', 'III', 'aVF', 'V1'],
  'stemi-lateral': ['I', 'aVL', 'V5', 'V6'],
  'stemi-high-lateral': ['I', 'aVL'],
  pericarditis: ['I', 'II', 'aVF', 'V2', 'V3', 'V4', 'V5', 'V6'],
  'early-repolarization': ['V2', 'V3', 'V4'],
};

function derivedFindings(declared: readonly FindingId[], hr: number, axis: number, pr: number | null, qtcF: number): FindingId[] {
  const out = new Set<FindingId>(declared);
  const rhythmDeclared = declared.some((f) => FINDINGS[f].cat === 'rhythm');
  if (!rhythmDeclared) {
    out.add(hr < 60 ? 'sinus-bradycardia' : hr > 100 ? 'sinus-tachycardia' : 'sinus-rhythm');
  }
  out.add(axis >= -30 && axis <= 90 ? 'axis-normal' : axis < -30 && axis >= -90 ? 'lad' : axis > 90 ? 'rad' : 'extreme-axis');
  if (pr !== null && pr > 200) out.add('av-block-1');
  if (qtcF >= 470 && !out.has('short-qt')) out.add('long-qt');
  return [...out];
}

function rhythmOf(findings: readonly FindingId[]): FindingId {
  return findings.find((f) => FINDINGS[f].cat === 'rhythm') ?? 'sinus-rhythm';
}

/** Biphasic triangle so that net = a and p2p = |a| + 0.6. */
function writeQrs(arr: Float32Array, fs: number, t0: number, t1: number, a: number): void {
  const up = Math.max(a, 0) + 0.3;
  const down = -(Math.max(-a, 0) + 0.3);
  const mid = (t0 + t1) / 2;
  const i0 = Math.max(0, Math.round((t0 * fs) / 1000));
  const i1 = Math.min(arr.length - 1, Math.round((t1 * fs) / 1000));
  const im = Math.round((mid * fs) / 1000);
  for (let i = i0; i <= i1; i++) {
    const t = (i * 1000) / fs;
    if (i <= im) {
      const x = (t - t0) / Math.max(1, mid - t0);
      arr[i] = up * (1 - Math.abs(2 * x - 1));
    } else {
      const x = (t - mid) / Math.max(1, t1 - mid);
      arr[i] = down * (1 - Math.abs(2 * x - 1));
    }
  }
}

export function fakeGenerate(req: SynthRequest): SynthResult {
  const sc = FAKE_SCENARIOS.find((s) => s.id === req.scenario);
  if (!sc) throw new Error(`fake synth: unknown scenario ${req.scenario}`);
  const rng: Rng = createRng(`fake:${req.scenario}:${req.variant ?? ''}:${req.seed}`);
  const declared = (req.variant && sc.variants?.[req.variant]?.findings) || sc.findings;
  const fs = req.fs ?? 250;
  const durationMs = (req.durationS ?? 10) * 1000;
  const n = Math.round((durationMs * fs) / 1000);
  const hr0 = req.dials?.rate ?? baseRate(declared);
  const hr = hr0 > 0 ? hr0 + rng.range(-3, 3) : 0;
  const axis = req.dials?.axis ?? baseAxis(declared) + rng.range(-8, 8);
  const irregular = has(declared, ...IRREGULAR);
  const na = sc.intervals === 'not-applicable';
  const noP = has(declared, 'atrial-fibrillation', 'atrial-flutter', 'junctional-escape-rhythm', 'accelerated-junctional-rhythm', 'avnrt', 'avrt', 'vt-monomorphic', 'ventricular-escape-rhythm', 'aivr', 'av-block-3') || na;
  const pr = noP ? null : has(declared, 'av-block-1', 'trifascicular-block') ? 250 + rng.int(0, 30) : has(declared, 'wpw', 'short-pr') ? 100 : 150 + rng.int(0, 30);
  const qrs = has(declared, 'rbbb', 'lbbb', 'paced-rhythm', 'sgarbossa-positive', 'bifascicular-block') ? 140 : has(declared, 'vt-monomorphic', 'ventricular-escape-rhythm', 'aivr') ? 160 : has(declared, 'wpw', 'ivcd', 'ilbbb', 'irbbb') ? 115 : 90 + rng.int(0, 8);
  const rr = hr > 0 ? 60000 / hr : durationMs;
  const qtF = has(declared, 'long-qt', 'hypocalcemia', 'cerebral-t') ? 520 : has(declared, 'short-qt', 'hypercalcemia') ? 330 : 410;
  const qt = qtF * Math.cbrt(rr / 1000);
  const leads = {} as Record<Lead, Float32Array>;
  for (const l of STD_LEADS) leads[l] = new Float32Array(n);
  for (const l of req.extraLeads ?? []) if ((EXTRA_LEADS as readonly string[]).includes(l)) leads[l] = new Float32Array(n);
  const beats: BeatMarks[] = [];
  const atrial: AtrialEvent[] = [];
  if (hr > 0) {
    let t = 300 + rng.range(0, 200);
    while (t < durationMs - 400) {
      const b: BeatMarks = {
        kind: noP ? 'junctional' : 'sinus',
        pOn: pr !== null ? t - pr : null,
        pOff: pr !== null ? t - pr + 100 : null,
        qrsOn: t,
        qrsOff: t + qrs,
        j: t + qrs,
        tPeak: t + qt - 90,
        tOff: t + qt,
        uOff: has(declared, 'hypokalemia', 'u-waves') ? t + qt + 140 : null,
        aberrant: false,
      };
      if (b.pOn !== null && b.pOn >= 0) atrial.push({ t: b.pOn, kind: 'sinus', conductedTo: beats.length, visible: true });
      beats.push(b);
      for (const l of ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'] as const) writeQrs(leads[l], fs, b.qrsOn, b.qrsOff, Math.cos(((axis - LIMB_ANGLE_DEG[l]) * Math.PI) / 180));
      const step = irregular ? rr * rng.range(0.7, 1.3) : rr;
      if (has(declared, 'av-block-2-2to1', 'av-block-2-mobitz2', 'av-block-2-mobitz1', 'av-block-high-grade', 'pac-blocked') && !noP) {
        atrial.push({ t: t + step / 2 - (pr ?? 160), kind: 'sinus', conductedTo: null, visible: true });
      }
      t += step;
    }
  }
  if (has(declared, 'av-block-3', 'av-dissociation', 'ventricular-escape-rhythm')) {
    for (let t = 150; t < durationMs - 100; t += 750) atrial.push({ t, kind: 'sinus', conductedTo: null, visible: true });
  }
  if (has(declared, 'atrial-flutter')) for (let t = 50; t < durationMs; t += 200) atrial.push({ t, kind: 'flutter', conductedTo: null, visible: true });
  atrial.sort((a, b) => a.t - b.t);
  const atrialRate = has(declared, 'atrial-fibrillation') ? null : has(declared, 'atrial-flutter') ? 300 : has(declared, 'av-block-3', 'av-dissociation', 'ventricular-escape-rhythm') ? 80 : has(declared, 'av-block-2-2to1', 'av-block-high-grade') ? hr * 2 : hr;
  const stMv: Partial<Record<Lead, number>> = {};
  for (const l of STD_LEADS) stMv[l] = 0;
  for (const f of declared) for (const l of ST_LEADS[f] ?? []) stMv[l] = 0.2 + rng.range(0, 0.15);
  if (has(declared, 'stemi-posterior', 'de-winter', 'st-depression-ischemic')) for (const l of ['V1', 'V2', 'V3', 'V4'] as const) stMv[l] = -0.15;
  // Sgarbossa criterion 2 on the fake signal (precordial QRS are flat, i.e. not positive): concordant depression V1–V3
  if (has(declared, 'sgarbossa-positive')) for (const l of ['V1', 'V2', 'V3'] as const) stMv[l] = -0.15;
  const qtcB = qt / Math.sqrt(rr / 1000);
  const qtcF = qt / Math.cbrt(rr / 1000);
  const findings = derivedFindings(declared, hr, axis, pr, qtcF);
  const truth: EcgTruth = {
    rhythm: rhythmOf(findings),
    findings,
    regular: !irregular,
    hrBpm: hr,
    atrialRateBpm: atrialRate,
    prMs: pr,
    qrsMs: qrs,
    qtMs: qt,
    qtcBazettMs: qtcB,
    qtcFridericiaMs: qtcF,
    axisDeg: { p: noP ? null : 50, qrs: axis, t: axis },
    beats,
    atrial,
    stMv,
    facts: {},
  };
  const ecg: Ecg = { origin: { kind: 'synthetic', scenarioId: sc.id, seed: req.seed }, signal: { fs, durationMs, leads }, truth, regions: null };
  const applied: Partial<Record<DialId, number>> = { ...(req.dials ?? {}) };
  return { ecg, applied, axisAmbiguous: false };
}

export const fakeSynth: SynthPort = {
  generate: fakeGenerate,
  scenarios: (filter) => FAKE_SCENARIOS.filter((s) => (!filter?.group || s.group === filter.group) && (!filter?.finding || s.findings.includes(filter.finding) || Object.values(s.variants ?? {}).some((v) => v.findings?.includes(filter.finding as FindingId)))),
  drawDials: (id, rng, difficulty) => {
    const s = FAKE_SCENARIOS.find((x) => x.id === id);
    if (!s) return {};
    const base = baseRate(s.findings);
    if (base <= 0 || base >= 250) return {};
    const spread = difficulty === 'classic' ? 0.05 : 0.15;
    return { rate: Math.round(base * (1 + rng.range(-spread, spread))) };
  },
};

export function flatEcg(id: number): Ecg {
  const fs = 250;
  const n = 2500;
  const leads = {} as Record<StdLead, Float32Array>;
  for (const l of STD_LEADS) leads[l] = new Float32Array(n);
  return { origin: { kind: 'real', dataset: 'PTB-XL', ecgId: id }, signal: { fs, durationMs: 10000, leads }, truth: null, regions: null };
}

export const fakeReal: RealPort = {
  cases: () => getLibrary().cases,
  load: async (id) => flatEcg(id),
  compatible: (codes, stadium) => compatibleFindings(codes, stadium),
};

/** The fake engine restricted to a few scenario ids (a catalogue that is still growing). */
export function subsetSynth(ids: readonly string[]): SynthPort {
  return {
    ...fakeSynth,
    scenarios: (filter) => fakeSynth.scenarios(filter).filter((s) => ids.includes(s.id)),
    generate: (req) => {
      if (!ids.includes(req.scenario)) throw new Error(`unknown scenario ${req.scenario}`);
      return fakeGenerate(req);
    },
  };
}

/** A real port with an empty case library. */
export const emptyReal: RealPort = { ...fakeReal, cases: () => [] };

/** A synth port whose engine always throws (today's stub). */
export const throwingSynth: SynthPort = {
  ...fakeSynth,
  generate: () => {
    throw new Error('engine not built');
  },
};
