export const meta = {
  name: 'ecg-synth-bakeoff',
  description: 'Prototype three ECG synthesizer architectures on 12 benchmark conditions, review-fix each, blind-judge per condition, and decide the synthesizer design',
  phases: [
    { title: 'Prototype', detail: 'three architectures, one agent each' },
    { title: 'Review-fix', detail: 'fresh-eyes reviewer fixes each prototype' },
    { title: 'Judge', detail: 'blind per-condition comparison + engineering + pedagogy judges' },
    { title: 'Decide', detail: 'decision + synthesizer spec' },
  ],
}

const ROOT = args.root
const PROTO = `${ROOT}\\_proto`
const RENDER = `python -I "${PROTO}\\harness\\render.py"`

const CONDITIONS = [
  { id: 'normal', criteria: 'Normal sinus rhythm 72 bpm. PR ~160 ms, QRS ~90 ms, QT ~380 ms. QRS axis ~+60°, P axis ~+50°, T axis ~+40°. Small septal q in I, aVL, V5, V6; rS in V1; R wave grows V1→V5, R/S transition V3–V4; T upright in I, II, aVF, V2–V6, inverted in aVR; P upright in I, II, aVF, inverted in aVR, small/biphasic in V1. ST isoelectric.' },
  { id: 'rbbb', criteria: 'Complete RBBB: QRS ≥120 ms (~140); rsR′ (M-shaped) in V1–V2 with R′ > r; wide slurred S in I, aVL, V5, V6; R peak time in V1 > 50 ms; secondary T inversion V1–V2(–V3); otherwise normal axis and sinus rhythm.' },
  { id: 'lbbb', criteria: 'Complete LBBB: QRS ≥140 ms (~150); broad notched/slurred R in I, aVL, V5, V6; NO septal q in I, V5, V6; R peak time V5–V6 > 60 ms; QS or rS with tiny r in V1–V3; discordant ST-T (ST elevation + upright T in V1–V3; ST depression + T inversion in I, aVL, V5, V6); normal or left axis.' },
  { id: 'anterior-stemi', criteria: 'Acute anterior STEMI (proximal LAD): J-point ST elevation ≥0.2 mV in V2–V3 and elevation V1–V4 (also I, aVL acceptable); reciprocal ST depression in III and aVF; hyperacute broad T waves V2–V4; sinus rhythm; QRS narrow (early Q / loss of r in V1–V2 acceptable).' },
  { id: 'inferior-stemi', criteria: 'Acute inferior STEMI (RCA): ST elevation in II, III, aVF with III > II; reciprocal ST depression in I and aVL (aVL deepest); possible ST depression V1–V3; sinus rhythm; narrow QRS.' },
  { id: 'lvh-strain', criteria: 'LVH with strain: S in V1 + R in V5 or V6 ≥ 35 mm (aim ~40–45 mm); R in aVL tall (≥11 mm optional); QRS 100–110 ms; R peak time V5–V6 > 50 ms; downsloping ST depression and asymmetric T inversion in I, aVL, V5, V6; mild left axis tendency.' },
  { id: 'wpw', criteria: 'Ventricular pre-excitation (WPW), left lateral accessory pathway: PR < 120 ms (~100), delta wave (slurred initial QRS upstroke) visible in most leads, positive delta and dominant R in V1 (type A), QRS ≥ 110–120 ms, secondary ST-T changes opposite to the delta/QRS.' },
  { id: 'brugada-type1', criteria: 'Brugada type 1 pattern: coved ST elevation ≥ 2 mm at the J point in V1 and V2 descending into a symmetric negative T wave; no reciprocal ST depression; other leads essentially normal; sinus rhythm.' },
  { id: 'aflutter', criteria: 'Typical (counter-clockwise, cavotricuspid) atrial flutter with 4:1 AV conduction: regular sawtooth flutter waves at ~300/min (cycle ~200 ms), NEGATIVE in II, III, aVF with no isoelectric baseline between them, POSITIVE discrete deflections in V1; ventricular rate ~75 regular; narrow QRS.' },
  { id: 'hyperk', criteria: 'Moderate hyperkalaemia: tall, peaked, narrow-based symmetric T waves (≥10 mm in V2–V4); flattened low-amplitude P waves; PR slightly prolonged; QRS mildly widened (~110 ms); QT normal/short; sinus rhythm.' },
  { id: 'afib', criteria: 'Atrial fibrillation: irregularly irregular RR intervals (mean ventricular rate ~100), no P waves, fine irregular fibrillatory baseline (f waves 350–600/min) best seen in V1 and inferior leads; narrow normal QRS and normal ST-T.' },
  { id: 'vt', criteria: 'Monomorphic ventricular tachycardia ~170 bpm: QRS ≥ 140 ms (~160), regular, RBBB-like morphology (LV origin) with superior (north-west/left) axis; AV dissociation — sinus P waves at ~80 bpm marching through independently, visible here and there; no fusion requirement.' },
]

const COMMON = `
Project: ${ROOT} ("ECG Academy", a web app that teaches people to read ECGs). Read ${ROOT}\\CLAUDE.md first — in particular the one-source rule for synthetic ECGs.
Hard boundaries:
- Write ONLY inside your own folder (given below). Never write anywhere else. Never create, edit or delete anything under C:\\Users\\A511741\\Desktop\\Workspace\\Dynamic Electrocardiogram (another project) — reading it for ideas is allowed (e.g. its docs/research/lead-geometry-anatomy.md, dipole-model-design.md, activation-physiology.md, and src/sim/** for a voxel EDL engine).
- Zero npm dependencies. Language: TypeScript using only erasable syntax (no enums, namespaces or parameter properties) so it runs directly with Node 24 type stripping: \`node gen.ts\`. Seeded randomness only.
- One-source rule: all 12 leads come from one cardiac source description through one lead system. Limb leads must satisfy III = II − I, aVR = −(I+II)/2, aVL = I − II/2, aVF = II − I/2 exactly (derive them from electrode potentials RA, LA, LL); precordials V1–V6 are referenced to Wilson's central terminal. A condition may only change rhythm, activation/repolarization parameters, regional parameters or geometry — never per-lead waveform edits.
Required interface (in your folder, file synth.ts):
  export function generate(conditionId: string, opts: { fs: number; durationS: number; seed: number }): {
    leads: Record<'I'|'II'|'III'|'aVR'|'aVL'|'aVF'|'V1'|'V2'|'V3'|'V4'|'V5'|'V6', Float32Array>;  // mV
    truth: { hrBpm: number; prMs: number | null; qrsMs: number; qtMs: number; qrsAxisDeg: number; rhythm: string;
             beats: { pOnMs: number | null; qrsOnMs: number; qrsOffMs: number; tOffMs: number }[] };
    regions: { names: string[]; activityAt(tMs: number): Float32Array };  // per-region state for a small 3D heart view (e.g. depolarizing / depolarized / repolarizing as 0..1)
  }
gen.ts must generate all benchmark conditions (10 s, fs 500, seed 1) to out/<id>.json as {"fs":500,"title":"<id>","leads":{...}} plus out/<id>.truth.json, and print the generation time per condition.
Render each with: ${RENDER} out/<id>.json out/<id>   (writes out/<id>.png = standard 3x4 + II rhythm strip at 25 mm/s 10 mm/mV, and out/<id>-beat.png = one beat per lead at 50 mm/s 20 mm/mV).
LOOK at the PNGs with the Read tool and iterate until each condition matches its textbook criteria (amplitudes in mm at 10 mm/mV; durations in small squares of 40 ms). Also write a self-check (check.ts) that measures intervals/axis from the signals and compares with truth.
Benchmark conditions and their textbook criteria:
${CONDITIONS.map((c) => `- ${c.id}: ${c.criteria}`).join('\n')}
Also write DESIGN.md in your folder: the model, how each condition is parameterised, how the approach would scale to ~80 catalogue conditions (all arrhythmias, blocks, infarct territories/ages, hypertrophies, electrolytes/drugs, Brugada/LQT/ARVC/early repol/hypothermia, pacing, electrode misplacement, artefacts) and to continuous drill variation (e.g. dial PR, QRS axis, QTc, rate), performance (ms per 10 s 12-lead), known limitations, and honest morphology failures you could not fix.`

const CANDIDATES = [
  {
    key: 'regional',
    brief: `ARCHITECTURE A — "regional dipoles + volume-conductor lead field". Model the heart as ~15–25 anatomical regions placed in a realistic thorax frame (RA, LA, interventricular septum with left→right initial activation, RV free wall, RVOT, LV anterior / lateral / inferior / posterior / apical / basal, papillary/Purkinje-early sites…). Each region carries a time-varying current-dipole moment: depolarization = local wavefront direction × envelope over its activation window (from an activation schedule driven by the conduction system); repolarization = a dipole from the repolarization gradient (APD differences, so T is concordant normally). Electrode potentials from a volume-conductor lead field (e.g. infinite homogeneous medium φ ∝ p·(r − r0)/|r − r0|³, with realistic electrode positions on the chest and limb electrodes at the shoulders/hip, optionally a documented bounded-torso correction) so precordial leads see proximity effects. Pathologies edit region timing, amplitude, direction and repolarization (injury current = a plateau-phase ST dipole from injured regions).`,
  },
  {
    key: 'vcg',
    brief: `ARCHITECTURE B — "parametric VCG kernels + VCG→12-lead transform". Build the heart vector H(t) (Frank X, Y, Z) as a sum of parametric 3D kernels (Gaussian or skewed lobes, each: time centre, width(s), 3D direction, amplitude), e.g. P = RA lobe then LA lobe; QRS = septal, apical/anterior, LV free wall, basal/terminal lobes; an ST injury vector; T and U lobes. Map H(t) to the 12 leads with a published VCG→12-lead transform (inverse Dower or Kors; cite the coefficients), computing electrode-level potentials first so the limb-lead identities hold exactly. Tag every kernel with anatomical region(s) and drive regions.activityAt from the kernels. If a pattern cannot be reached by a single dipole (e.g. localized right-precordial findings), you may add a documented per-region proximity (non-dipolar) term that acts on electrode potentials by electrode position — never per-lead edits.`,
  },
  {
    key: 'field',
    brief: `ARCHITECTURE C — "activation field on a coarse anatomical heart". A coarse heart (RA, LA and biventricular myocardium, a few thousand nodes on analytic shapes such as truncated ellipsoidal shells, placed realistically in a thorax frame) with eikonal activation computed by a fast multi-source shortest-path (Dijkstra) on a node graph with conduction velocities (His–Purkinje fast tree / endocardial early sites, myocardium slow, atrial routes, AV-node delay, accessory pathways, ectopic foci, block lines, re-entry for flutter). Each node has a parametric transmembrane action-potential template with APD heterogeneity (endo/epi, apex/base, ischaemic shift of rest/plateau, hyperkalaemia, Brugada RVOT epicardial loss of dome…). ECG from a dipole-density / equivalent-double-layer sum (source ∝ spatial gradient of Vm) times a volume-conductor lead field with realistic electrode positions. Every condition only changes these parameters.`,
  },
]

const BUILD_SCHEMA = { type: 'object', properties: { folder: { type: 'string' }, conditions_done: { type: 'array', items: { type: 'string' } }, ms_per_ecg: { type: 'number' }, known_failures: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } }, required: ['folder', 'conditions_done', 'known_failures', 'summary'] }

phase('Prototype')
const built = await pipeline(
  CANDIDATES,
  (c) => agent(
    `${c.brief}
Your folder: ${PROTO}\\${c.key}\\ (create it if missing). RESUME NOTE: an earlier run of this exact task was interrupted; the folder may already contain its code and outputs. Inspect what is there first, keep what is good, and continue from it rather than restarting. ${COMMON}
Quality bar: a cardiologist should recognise every benchmark ECG at a glance and find nothing physiologically wrong (wave shapes, amplitudes, durations, lead-to-lead consistency, rhythm). Iterate on the rendered PNGs until you are satisfied or you can state precisely what the architecture cannot do.`,
    { label: `prototype ${c.key}`, phase: 'Prototype', schema: BUILD_SCHEMA },
  ),
  (b, c) => agent(
    `You are a fresh-eyes reviewer and fixer for an ECG synthesizer prototype in ${PROTO}\\${c.key}\\ (${c.brief.split('—')[1]?.split('.')[0] || c.key}).
The builder reported: ${JSON.stringify(b)}
1) Re-run gen.ts and the renders, then look at EVERY out/<id>.png and out/<id>-beat.png as a cardiologist would, against the criteria below. Also run check.ts and verify the Einthoven/Goldberger identities numerically.
2) List each deviation (lead, feature, expected vs seen).
3) Fix as many as possible inside this folder only, without breaking the one-source rule or the other conditions; re-render and re-check.
4) Update DESIGN.md with a "Review" section: what you fixed, what still deviates.
${COMMON}`,
    { label: `review-fix ${c.key}`, phase: 'Review-fix', schema: BUILD_SCHEMA },
  ),
)

const ready = CANDIDATES.map((c, i) => ({ ...c, report: built[i] })).filter((c) => c.report)
if (ready.length < CANDIDATES.length) log(`Prototypes missing: ${CANDIDATES.filter((c, i) => !built[i]).map((c) => c.key).join(', ')}`)

phase('Judge')
const SCORE_SCHEMA = {
  type: 'object',
  properties: {
    condition: { type: 'string' },
    scores: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, score: { type: 'number' }, recognisable: { type: 'boolean' }, errors: { type: 'array', items: { type: 'string' } } }, required: ['label', 'score', 'recognisable', 'errors'] } },
    best_label: { type: 'string' },
  },
  required: ['condition', 'scores', 'best_label'],
}
const LETTERS = ['X', 'Y', 'Z']
const condJudges = CONDITIONS.map((cond, ci) => () => {
  // blind: rotate the candidate order per condition
  const order = ready.map((_, k) => ready[(k + ci) % ready.length])
  const listing = order.map((c, k) => `${LETTERS[k]}: ${PROTO}\\${c.key}\\out\\${cond.id}.png and ${PROTO}\\${c.key}\\out\\${cond.id}-beat.png`).join('\n')
  return agent(
    `You are a senior cardiologist who teaches ECG reading. Judge synthetic ECGs of the condition "${cond.id}" made by ${order.length} anonymous generators. Textbook criteria: ${cond.criteria}
Images (use the Read tool on each; paper: 25 mm/s and 10 mm/mV in the standard image, 50 mm/s and 20 mm/mV in the -beat image; 1 small square = 1 mm):
${listing}
For each label: score 0–10 (10 = indistinguishable from a good textbook example; deduct for every wrong feature: wave shapes, amplitudes, durations, lead-to-lead inconsistency, unphysiological artefacts, missing hallmark features), say whether a student would recognise the diagnosis, and list concrete errors (lead + feature). Do not open any other files.`,
    { label: `judge ${cond.id}`, phase: 'Judge', schema: SCORE_SCHEMA },
  ).then((r) => r && { ...r, condition: cond.id, mapping: Object.fromEntries(order.map((c, k) => [LETTERS[k], c.key])) })
})

const ENG_SCHEMA = { type: 'object', properties: { ranking: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, controllability: { type: 'number' }, extensibility: { type: 'number' }, performance: { type: 'number' }, simplicity: { type: 'number' }, threeD_support: { type: 'number' }, risks: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' } }, required: ['key', 'controllability', 'extensibility', 'performance', 'simplicity', 'threeD_support', 'risks'] } } }, required: ['ranking'] }

const [condScores, eng] = await Promise.all([
  parallel(condJudges),
  agent(
    `You are a senior engineer evaluating ${ready.length} ECG synthesizer prototypes for a teaching web app (browser, TypeScript). Folders: ${ready.map((c) => `${c.key}: ${PROTO}\\${c.key}`).join('; ')}. Read each DESIGN.md, synth.ts and helpers, run \`node gen.ts\` in each folder to measure speed. Score each 0–10 on: controllability (can a drill set exact PR / QRS / QT / axis / rate and get matching truth?), extensibility to ~80 conditions + electrode misplacement + artefacts, performance (must generate a 10 s 12-lead in well under 100 ms in a browser, many times for drills), code simplicity/maintainability, and support for a small synchronized 3D heart view. List risks. Do not modify any file.`,
    { label: 'engineering judge', phase: 'Judge', schema: ENG_SCHEMA },
  ),
])

const scores = condScores.filter(Boolean).map((s) => ({
  condition: s.condition,
  best: s.mapping[s.best_label] || s.best_label,
  scores: s.scores.map((x) => ({ key: s.mapping[x.label] || x.label, score: x.score, recognisable: x.recognisable, errors: x.errors })),
}))
const totals = {}
for (const s of scores) for (const x of s.scores) totals[x.key] = (totals[x.key] || 0) + x.score
log(`Fidelity totals: ${JSON.stringify(totals)}`)

phase('Decide')
const decision = await agent(
  `Decide the ECG synthesizer architecture for ECG Academy (${ROOT}), a web app whose only goal is to teach people to read ECGs; synthetic ECGs power lessons, unlimited drills (rate, rhythm, axis, intervals, morphology, diagnosis) and a small synchronized 3D heart; real PTB-XL ECGs are used separately for "real case" practice.
Evidence:
- Blind per-condition fidelity scores (0–10) by cardiologist judges: ${JSON.stringify(scores)}
- Totals: ${JSON.stringify(totals)}
- Engineering judge: ${JSON.stringify(eng)}
- Builder/reviewer reports: ${JSON.stringify(ready.map((c) => ({ key: c.key, report: c.report })))}
You may read the prototypes' DESIGN.md files and code in ${PROTO}\\<key>\\.
Write ${PROTO}\\DECISION.md (the only file you may write) containing: the winner (or a hybrid — say exactly which parts come from which prototype), why, what to graft from the runners-up, and a complete synthesizer SPEC for the production build: module layout under src/synth/, the TypeScript types (condition/scenario spec, rhythm spec, regional parameters, recording chain: noise/filters/gain/electrode misplacement), how drills vary parameters continuously while keeping truth exact, the calibration/oracle test plan (per condition: measurable criteria checked automatically on the signals), the full condition catalogue to support (~80, grouped) with the mechanism each uses, performance budget, and the list of known-hard conditions with the planned mechanism. Return the full DECISION.md text.`,
  { label: 'decide synthesizer', phase: 'Decide' },
)

return { scores, totals, eng, reports: ready.map((c) => ({ key: c.key, report: c.report })), decision }
