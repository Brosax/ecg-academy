# src/synth: the synthetic 12-lead ECG engine

The engine behind drills, lessons, atlas pages and exams. Design and full spec: `_proto/DECISION.md` (Architecture B,
parametric VCG kernels → Dower electrode potentials, with the grafts of §2). This file is the map of the finished
engine (M1–M6): what lives where, how it is tested, and its known limitations.

Other modules import **only** `src/synth/index.ts`: the frozen contract types of `api.ts` plus `generate`,
`scenarios` and `drawDials`. Nothing in `src/synth` imports UI, `src/lab`, `_proto/` or Node APIs. The Heart Lab
(`src/lab`, its own voxel engine) is never mixed with this one; lesson and atlas pages link to it with
`labHref(findingId)` from `src/lab/links.ts`.

## Rules the code enforces

1. **One source.** Every ECG is one list of kernels rendered into one heart vector H(t) plus near-field electrode
   terms. Kernels come only from morphology builders fed by a `SourceSpec`; no code receives a lead name and a waveform.
2. **One lead system.** `leads/assemble.ts` is the only producer of lead arrays (Einthoven / Goldberger / Wilson from
   electrode potentials). The recording chain acts on electrode potentials, never on a lead.
3. **Truth from the model.** Fiducials are kernel edges and scheduler events; amplitudes (ST at J+60, voltages) are read
   from the clean model signal. Every truth value is re-measured by the independent oracle (`tests/synth/oracle`).
4. **Seeded.** All randomness from `createRng` with named forks (`fork('sinus')`, `fork('af')`, `fork('jitter')`,
   `fork('chain')`…). Same request → byte-identical arrays (golden hashes, T7).
5. **Frank frame** (+X left, +Y inferior, +Z posterior, cm, origin = ventricular centroid); `frame.ts` holds the only
   conversions (hexaxial angles, 3D view).

## Pipeline (`index.ts › generate`)

| step | module | what |
|---|---|---|
| 1 resolve | `catalogue/`, `morph/compose.ts`, `dials/solve.ts`, `dials/jitter.ts` | scenario + variant patch + dials (a dial never overrides what the variant patches) + seeded jitter → one validated `SourceSpec`; axis and P-axis solves |
| 2 schedule | `rhythm/scheduler.ts` (+ `clocks.ts`, `junction.ts`, `fronts.ts`, `atrialSites.ts`, `ectopy.ts`, `flutter.ts`, `fibrillation.ts`, `pacing.ts`, `rate.ts`) | atrial events → AV junction / pathway → ventricular beat instances (4 s pre-roll) |
| 3 morphology | `morph/ventricular.ts` (+ `patterns/`, `repol.ts`, `injury.ts`, `nearfield.ts`, `atrial.ts`, `stage.ts`) | QRS lobes, split T, ST, U, injury plateaus, near-field extras, geometry; once per pattern key |
| 4 recording layers | `index.ts › mergeRecording`, `chain/chain.ts › recordingForDifficulty`, `dials/dials.ts › noiseForLevel` | scenario recording → difficulty (noisy) → noise dial → request recording; placement resolved **before** the render (`leads/electrodes.ts › resolvePlacement` with the extra leads) |
| 5 render | `kernel/render.ts`, `leads/leadfield.ts`, `leads/sites.ts` | kernels → H(t) + near-field sums → potentials at the nine computed sites and at every other site of the hook-up (explicit chest sites, Mason–Likar, V3R / V4R / V7–V9) |
| 6 clean leads + truth | `leads/assemble.ts`, `truth/truth.ts`, `truth/axis.ts`, `truth/findings.ts` | ventricular-only and atrial-only leads, clean = their sum; `EcgTruth` on the clean signal |
| 7 chain | `chain/chain.ts`, `chain/noise.ts`, `chain/filters.ts` | artefacts per electrode (incl. the schedule's myopotential bursts), gain, filters, ADC; skipped (identity) for a plain recording; artefact findings added |
| 8 3D | `regions3d/states.ts` | `RegionStates` (per-region activation / recovery timeline) |

## Module map

| path | contents |
|---|---|
| `api.ts` | public contract (§5), **frozen**; a change is a contract request |
| `index.ts` | `generate`, `scenarios`, `drawDials` |
| `frame.ts`, `kernel/` | Vec3 / rotations / hexaxial; bump, plateau, impulse shapes; render (inline fixed-direction bumps, sample-major near field, bounded integer-keyed gain cache) |
| `heart/` | baked region geometry (`regionGeom.gen.ts`, `scripts/synth/bake-regions.ts`), AHA territories, 42-face region graph with Purkinje exits and blocks, APD map |
| `morph/patterns/` | authored lobe sets: normal, RBBB, LBBB, iRBBB, iLBBB, LAFB, LPFB, bifascicular, RVH, WPW / VT sites |
| `morph/` | ventricular builder (substrate: LV / RV mass, septum, scar, slow regions, conduction; split-T repolarisation, memory, alternans; injury solve; near field: Brugada, epsilon, J wave, fragments; geometry), atrial P (+ RAE / LAE / IAB / atrial injury, `rotateAtrial`), stage maps |
| `rhythm/` | every rhythm of §9.2–§9.5 and §9.11: sinus (HRV, pauses, SA block), ectopic / wandering / multifocal atrial, flutter (CCW / CW), AF streams, junctional, AVNRT, AVRT (ortho / antidromic), pre-excited AF, VT (captures, fusion), PMVT / torsades, VF, ventricular flutter, asystole, PAC / PJC / PVC patterns, AV node (decremental, ERP, concealment), infra-His block, bundle refractoriness, pathway, escape, pacing (AAI / VVI / DDD / BiV, faults) |
| `leads/` | BEM lead table blended to Dower (`leadTable.gen.ts`, `scripts/synth/bake-leadfield.ts`), Dower extra rows, electrode sites (ICS 1–9 × 8 lines), placement (cable swaps incl. neutral, chest swaps / explicit sites, Mason–Likar), assembly |
| `chain/` | wander, EMG (+ windowed bursts), tremor, mains, pop, motion, lead-off; LTI filters (causal / zero-phase); ADC; artefact findings; difficulty layer |
| `truth/` | truth, axes, derived findings with criteria.md thresholds, voltage and STEMI-criterion facts |
| `regions3d/states.ts` | `RegionStates` for the 3D heart |
| `dials/` | `dials.ts` (DialDef table: unit, exactness, mechanism, range, thresholds, exclusion bands; AF response map), `ranges.ts` (drill ranges), `solve.ts` (applyDials, variant ownership, axis bisection), `draw.ts` (difficulty ladder), `jitter.ts` (natural variability) |
| `catalogue/` | registry + one file per group (§9): 186 cases (129 scenarios + 57 variants) |

## Dials and drills (DECISION §7)

`DIALS` in `dials/dials.ts` is the single table. Exactness: `rate` (forward: clock rate; JT follows the rate law),
`pr` (analytic AV-node solve at the beat RR), `qrs` (forward conduction stretch, the JT is anchored), `qtc` (forward
JT law), `axis` (solve: heart rotation about Frank Z; the search turns the kernels of one built beat, R·Rz(Δ)·Rᵀ, then
the found angle is checked and refined on full builds — residual ≤ 1°), `pAxis` (solve: rotation of the sinus P,
≤ 2°), `st` (forward injury solve in the reference lead), `tAmp`, `voltage` (torso gain ×, as the course units expect),
`fCoarseness`, `conductionRatio` (AV-node ERP inside the N:1 window, `junction.ts › erpForRatio`),
`ventricularResponse` (AF ERP from the measured `AF_RESPONSE_MAP`; the realised mean rate is reported), `hrv` and
`noise` (statistics, realised value reported). `stage` and `site` are expressed as scenario variants, not dials.

* **Variant ownership** (`solve.ts › variantOwns`): a dial whose parameter the variant patches is not applied (the
  'variable' flutter stays variable, rapid / slow AF keep their node) and is absent from `applied`.
* **Exclusion bands**: band = max(T2 oracle gate, ½ practice tolerance of `src/practice/core/grade.ts › TOL`) around
  each threshold (rate 60 / 100; PR 120 / 200; QRS 110 / 120; QTc 390 / 450–460 by sex / 500; axis −90 / −45 / −30 /
  +90 / 180; P axis 0 / 75; ST: the patient's STEMI limit in the injury's reference lead, or −0.05 mV for depression).
* **Difficulty ladder** (`draw.ts`): classic = middle half of the range outside every band; subtle = the quarter of
  the range nearest the closest threshold, outside its band; noisy = classic values + the noisy recording (diagnostic
  filter, wander 0.3 mV, EMG 0.02 mV, 50 Hz mains); borderline = inside a band that meets the range (else subtle). A
  draw never retries: an empty interval falls back to the next wider one.
* **Two ranges per dial**: `ScenarioDef.dials` is what lessons and live blocks may request (the truth is exact in all of
  it); `dials/ranges.ts › DRILL_RANGES` narrows it to what drills draw — the part the T5 sweep validated (min, mid
  and max pass T1–T3: the oracle's P onset at a short TP, J-point criteria at small ST, hallmarks at their threshold).
  2:1 / 3:1 flutter is lesson-only (`conductionRatio` is not a drill dial).

## Declaring oracle criteria (T3)

Criteria live in `tests/synth/oracle/criteria/<group>.ts` (one file per catalogue group; repolarization and structural
are re-exported from chambers.ts), keyed by scenario id, with variant additions in `*_VARIANT_CRITERIA`. A criterion
reads **only** the oracle's measurement of the delivered ECG; thresholds come from the "current value" column of
`docs/curriculum/criteria.md` with the row id in `source`. The generic sanity set (`criteria/generic.ts`) applies
unless the scenario opts out with a reason. `tests/synth/oracle/tiers.ts` exposes T1 / T2 / T3 as functions for the
sweeps.

## Tests (`tests/synth/`, mirrors this folder) — all pass (1173 tests; the T9 gate is skipped unless `SYNTH_BENCH=1`)

| tier | file | gate |
|---|---|---|
| oracle on real data | `oracle/real.test.ts` | 300 PTB-XL records vs GE 12SL (median \|Δ\| ≤ 10 ms PR / QRS, ≤ 10° axis, ≤ 2 bpm; QT within the tangent-vs-12SL bias ± 10 ms) |
| T0 | `kernel/shapes.test.ts`, `frame.test.ts`, `leads/leadfield.test.ts`, `leads/leadtable.test.ts` | exact |
| T1 | `leads/lead-system.test.ts` | identities ≤ 1e-6 mV on every case, cable permutations, neutral cable, chest swaps, Mason–Likar, filter commutation |
| T2 | `truth/truth-vs-oracle.test.ts` | every case × 5 seeds on the clean (noise-free twin) signal: HR ±2, PR ±10, QRS ±8, QT ±15, axis ±5°, P / T axis ±10°, beats, visible P, ST ±0.03 mV |
| T3 | `criteria.test.ts` | §9 hallmarks + generic sanity, 3 seeds |
| T4 | `envelopes.test.ts` | PTB-XL class envelopes, ratchet floors |
| T5 | `dials/dials.test.ts`, `dials/sweep-{0..3}.test.ts` (shared logic `dials/sweep.ts`) | every scenario × drill-range dial × {min, mid, max} + one draw per difficulty: T1–T3, the dial realised within its exactness, other truths moved only by the declared couplings; ladder properties; drill ⊆ scenario ranges |
| T6 | `dials/noisy.test.ts`, `catalogue/technical.test.ts` | noisy difficulty: truth unchanged on every case; reader-filter oracle within HR ±3, PR / QRS ±15, QT ±20, axis ±10° and hallmarks in ≥ 90 % of 20 seeds (normal, RBBB, anterior STEMI, hyperkalaemia, pericarditis, LVH); artefact scenarios |
| T7 | `determinism.test.ts` | byte-identical, cache-order independent; golden hashes (`fixtures/golden.json`, 186 cases) |
| T8 | `regions3d/states.test.ts` | ranges, monotone, depolarised / recovered, blocks, highlights, cost |
| T9 | `bench.test.ts` (runs with `SYNTH_BENCH=1`; shared logic `bench.ts`) | ×5 margin on §10 |
| catalogue | `catalogue/catalogue.test.ts` + group files | ids, groups, benchmarks, criteria declared, **every FindingId produced** |

## Dev scripts (`scripts/synth/`, Node only, never imported by src)

Run with `node --import ./scripts/synth/node-hooks.mjs scripts/synth/<name>.ts`: `gallery.ts` (review PNGs in
`tests/out/gallery/`, review log `tests/out/gallery/REVIEW.md`), `golden.ts` (T7 fixture), `sweep.ts` (the full T5
matrix, `--seeds`, `--draws`, `--af-map` re-measures the AF response map), `bench.ts` (T9 report), `report.ts`,
`criteria-report.ts`, `realism-report.ts`, `oracle-real.ts`, `calibrate.ts`, `envelopes.ts`, `bake-regions.ts`,
`bake-leadfield.ts` (`--check`).

## Performance (T9, Node 24 on the dev laptop; ranges over the 2026-10-19 and 2026-10-21 runs)

| item | §10 budget | measured |
|---|---|---|
| sinus-family generate, warm median / p95 | 6 / 15 ms | 4.8–7.2 / 9–13 ms |
| worst (AF, VF, flutter, torsades, pre-excited AF + 5 extra leads + noisy chain) | 15 / 25 ms | 22–31 / 33–49 ms — **over** |
| 60 s monitor strip | 60 ms | 31–91 ms |
| first generate (cold: JIT, lazy caches) | 30 ms | 36–73 ms — **over** |
| dial solves of one item (axis + P axis) | 2 ms | 1.4–2.1 ms |
| stateAt | 0.05 ms | < 0.01 ms |
| 50-item exam set | 1 s | 0.32–0.44 s |
| memory per ECG | 400 KB | 239 KB |

`SYNTH_BENCH=1 npx vitest run tests/synth/bench.test.ts` (×5 margin) passes. The worst case is dominated by the noisy
chain (per-electrode noise generation and the 0.05 Hz causal filter with its 3 s warm-up on 14 cables): per scenario
3–11 ms clean, 6–14 ms with the 5 extra leads, 15–23 ms with the noisy chain; its profile is flat (wander, EMG, filter,
lead statistics; no single hotspot). The cold first call is above budget in Node; in the browser the drills
pre-generate during feedback. Done: inline bump rendering, sample-major near field, integer gain-cache keys, clean leads
summed from the ventricular / atrial parts, the identity chain skipped, allocation-free noise statistics.

## Deliberate deviations from `_proto/DECISION.md` (with reasons)

* **RR history of the JT law**: weight 0.2 on the preceding RR (DECISION §6.4 said 0.6); QT adapts slowly (QT/RR
  hysteresis), and 0.6 swung the QT by ±70 ms beat to beat in AF. 4 s pre-roll so the history settles.
* **LVH strain** uses lateral *epicardial* APD prolongation (§6.4's endocardial rule contradicts its own ΔG rule).
* **Truth refinements**: `stMv` is the median over the complete dominant beats (ventricular-only in fibrillation /
  flutter); the T axis uses only beats whose T is complete (a beat or stimulus in the T is excluded); rate counts
  complexes whose first 15 ms are inside the strip; the paced QRS onset is the stimulus. The reference level of ST and
  amplitudes is the median of the beat's own PR segment (P end → QRS − 10 ms) even when it slopes (PR depression of
  pericarditis, atrial repolarisation); without a PR segment, the window 30–10 ms before the QRS when isoelectric, else
  the zero baseline. The sinus label uses the whole-number rate a reader reports (59.97 /min is 60: sinus rhythm;
  bradycardia is < 60). In fibrillation the long / short QT findings grade the mean per-beat QTcF over the strip
  (criteria.md qtc-bazett: "average over about 10 beats"); the reported QTc stays median QT over mean RR.
  Short QT is derived conservatively at fast rates (`truth/findings.ts › shortQtLimit`): QTcF ≤ 390 ms up to 100 /min,
  only QTcF ≤ 360 ms (the short-QT-syndrome limit) above 100 /min, where the rate correction is unreliable and a QTcF
  just under 390 is no evidence of a short QT; above 150 /min (or after a run of ≥ 3 ectopic beats) no QT finding is
  derived at all (`truth.ts`). A declared `short-qt` / `long-qt` is never removed.
* **Findings of the recording are not findings of the heart**: with re-cabled or torso-mounted limb electrodes the
  derived axis and low-voltage findings are dropped; with displaced chest electrodes poor R progression is dropped.
  For rhythms of ventricular origin the only axis finding is a northwest axis (`extreme-axis`, a VT criterion of
  criteria.md `wct-morphology`); a paced ventricle's programmed AV delay yields no short-PR / first-degree finding.
* **`voltage` dial** stays the torso-gain factor (×) the course expects, not a Sokolow solve; voltage criteria are facts.
* **Plateau-slope ST of a wide activation** (§6.4 has one generic plateau-slope lobe): an activation pattern may carry its
  own phase-2 J shift (`PatternDef.plateauSlope`; LBBB 0.2), used when the source's RepolSpec sets none, and then the
  lobe builds up during the QRS (from 60 ms after onset to 10 ms after J) instead of starting 24 ms before J — the
  appropriate discordance of LBBB (J-point ST↑ V1–V3, ST↓ I, aVL, V5–V6) on every LBBB beat, with a J point the oracle
  still reads within ±8 ms. Fused patterns (fusion beats, partially pre-excited beats) do not carry it; no catalogue
  case fuses onto an LBBB heart.
* **STEMI-criterion facts** are `not-applicable` for LBBB and ventricular paced / ventricular rhythms (UDMI 2018
  confounders; the Sgarbossa–Smith rules apply); a declared intermittent LBBB (rate-dependent BBB) counts as LBBB.
* **'classic' is a clean chain** (no diagnostic filter), as §7 states; 'subtle' is clean too (its difficulty is in the
  dial values); the 'noisy' EMG is 0.02 mV (0.03 mV left the clean-signal delineator below 90 % on PR in T6).
* **T6** is gated on six scenarios where the clean-signal delineator still reads filtered noise; every case is checked
  for truth invariance.
* **Oracle QT** is the tangent method in the lead with the largest T (the truth's convention).
* **§6.3 lobe / graph consistency** is checked as union coverage ≥ 70 %.

## Engine rules added by the 2026-10-29 review fixes (`docs/review/defects-2026-10-29.md`)

Rhythm and conduction:

* **Fast-pathway atrial site** (`rhythm/atrialSites.ts`, `GenSite 'fast-pathway'`): the retrograde exit of typical
  AVNRT is the anterior (fast-pathway) septum with its own chamber directions — the pseudo-r′ in V1 and pseudo-S in
  II / III / aVF come from the generated P′, not from a drawn notch.
* **Retrograde VA delay** (`rhythm/junction.ts › RETRO_EXTRA_MS` = 60): retrograde nodal conduction is the antegrade AH
  law + 60 ms (His–atrial 100–180 ms), so a junctional premature beat inscribes its P′ just after its QRS.
* **AF variant bands and the slow-response map** (`dials/solve.ts › afVariantBand`, `dials/dials.ts ›
  AF_SLOW_RESPONSE_MAP`): an AF variant that patches the node keeps its response class — the `ventricularResponse`
  dial is realised inside the variant's band (slow 40–55, rapid 105–160 /min); the slow class uses its own measured
  ERP → rate map (12 seeds × 10 s), the rapid class and the base the calibrated `AF_RESPONSE_MAP`.
* **VT default 150 /min** (`vt-monomorphic`): a common sustained rate at which several dissociated P waves stay
  visible; faster rates remain available through the dial.
* **Facts from the realised rhythm** (`rhythm/scheduler.ts`, end of `schedule`): block level, escape pacemaker (only
  when escape beats appear in the strip), flutter circuit, atrial site and the PVC origins that fired override the
  scenario's facts, so a variant can never keep a stale fact.
* **Full pre-excitation** (`rhythm/fronts.ts › fullPreexcitedPattern`, `morph/patterns/sites.ts ›
  FULL_PREEXCITED_LOBES`): the maximal pre-excitation of a left lateral pathway is an authored lobe set (DECISION §11
  fallback) sweeping base → apex — V4–V6 predominantly positive (Steurer), I / aVL negative or isoelectric, R in V1,
  QRS ≈ 158 ms, axis ≈ +100°. The generated family sums a point source at the left lateral base into a rightward
  vector (area ≈ (−0.42, 0.63, −0.68): the bulk of the heart lies to its right), which gave QS in V5–V6;
  branch-specific His–Purkinje engagement, an endocardial insertion, faster RV conduction and a broad annular front
  were tried and none turned V5–V6 positive. In pre-excited AF, a nodal front arriving ≥ `PREEXCITED_HP_ENGAGE_MS`
  − 10 ms after the delta collides in the conduction system: the beat is fully pre-excited (not a fusion dominated by
  the generated front).
* **Exit part of a point source** (`rhythm/fronts.ts › mergeExit`): the source regions' own part (or any part narrower
  than `MIN_LOBE_MS`) is merged into the front it starts and peaks with it — on its own it drew a notch at the start of
  every PVC / paced QRS. Exits with < 10 % of the largest regional force stay out (they are dropped as insignificant
  and do not set the QRS onset); the family-scale reference (Purkinje only) is untouched.

Morphology:

* **posteriorFar injury rule** (`morph/injury.ts › posteriorFar`): a transmural / subendocardial injury whose wall faces
  the back (normal ẑ ≥ 0.72) is an eccentric dipole at the wall (far 0, ramping to 1 at ẑ ≤ 0.55): V1–V3 see its
  mirror, V7–V9 face it, the lateral leads stay near the baseline (isolated posterior MI). The same rule holds for the
  ΔG lobe of an APD change on that wall (`morph/repol.ts`, far = posteriorFar(massNormal(changed regions))): the
  posterior epicardial APD prolongation of `stemi-posterior` (+170 ms; the only APD sets with far < 1 are the
  `stemi-posterior` base / isolated, far 0.2, and evolved, far 0.41) is mirrored as a tall upright T in V1–V3
  (horizontal ST depression ending in an upright T: T peak ≥ 0.13 mV in V1, ≈ 0.4 mV in V2) without the negative T
  tail a central dipole drew in V6 and II. Its late T reaches the next P above 90 /min, so its drill range stops at 90.
* **Injury solve on the recorded signal** (`morph/ventricular.ts › solveInjury`): `stMv` is the J+60 level after the
  torso gain (effusion, lean chest, the `voltage` dial) — the injury is a cardiac source, the ST is what the reader
  measures (`sgarbossa:smith` re-stated as 0.5 mV recorded = 0.7 × its 0.72 gain, the reviewed tracing).
* **Osborn dome counted in the QRS** (`morph/nearfield.ts › J_DOME`, `ventricular.ts`): a J wave above 0.3 mV widens by
  120 ms/mV into a dome; the dome is a terminal QRS deflection (the J point is its end) and repolarisation keeps its
  absolute timing. An early-repolarisation notch (≤ 0.3 mV) stays on the R downslope.
* **Split T ends at the QTc** (`morph/repol.ts`, LQT2 bifid T): the late part ends at the JT target, so the QTc of the
  RepolSpec (and the qtc dial) is the QT of the whole bifid T; the early part leads it by the lag.
* **Effusion swing torso gain** (`ventricular.ts › SWING_GAIN_PER_CM` = 0.12): the swung heart lies nearer the chest
  wall, so every lead records it larger — the alternans reaches the limb leads without an axis change.
* **Brugada saddleback late lobe** (`nearfield.ts › SADDLEBACK`): a shorter dome (end 140 ms, 0.8 share) and an
  anterior late lobe (−0.6 share), so an upright T rises out of an ST trough ≥ 0.05 mV in V1 and V2.
* **LAE_DIR** (`morph/atrial.ts`): the dilated LA force turns leftward, slightly inferior and posterior (reached at
  laScale 2.2) — a deep, wide terminal P in V1.
* **RBBB transseptal breakthrough 0.3** (`morph/patterns/rbbb.ts`): the transseptal lobe amplitude that takes the s
  below the baseline in V1 (rsR′, not an "M" above the baseline).
* **Early repolarisation** (`catalogue/normal.ts`): separate inferior and lateral J-wave sources (each with its own
  outward direction) and inferior / lateral epicardial ST shares: Jp ≥ 0.1 mV in II, III, aVF and V4–V5 (V6 J ≈ 0.11)
  with a T/QRS of ≈ 0.45 (V2) / 0.65–0.8 (V3), against ≈ 1.05 / 1.1–1.25 in `stemi-anterior-subtle`. A shorter lateral
  epicardial APD (−40 ms) draws the tall, broad lateral T of a young man, so the V6 ST/T ratio is ≈ 0.17–0.18 at the default
  dial and < 0.25 at every seed and every `st` value (≈ 0.09 at st 0.06; Ginzton: < 0.25 early repolarisation, ≥ 0.25
  pericarditis; pericarditis ≈ 0.45–0.5). The leftward lateral T leaves a shallow negative T in V1 (≈ −0.1 to
  −0.15 mV; normal in V1 alone). The drill st range starts at 0.09 (Jp ≥ 0.1 mV in II / aVF).
  `athlete` carries a modest training-related version (J ≈ 0.1–0.15 mV inferolateral, notch in V5–V6, upright T,
  lateral APD −30 ms: V6 ST/T ≈ 0.17–0.19).
* **st dial with several injuries** (`dials/solve.ts`): the first injury is solved to the dial value in its reference
  lead and every other injury of the source scales by the same factor — the early-repolarisation dial (set in V2)
  moves II and V5–V6 with V2, the D1 dial (set in aVL) moves its anteroseptal share with it.
* **First-diagonal STEMI** (`catalogue/ischemia.ts › D1_LATERAL, D1_SEPTAL`): the basal anterolateral wall (aVL 0.24 mV)
  plus a weaker basal anteroseptal share (V2 0.16 mV) — the "South African flag": ST↑ ≈ 1.2 mm in I, 2.2 mm in aVL,
  1.5 mm in V2 (V1 ≈ V2 the precordial maximum), V3 ≈ 1.1 mm, V4 < 1 mm, V5–V6 ≈ 0.5 mm, III ≈ −3.3 mm. The mid-anterior
  segment is left out (it faces V3–V4 and made V3 > V2).
* **AVNRT P′ amplitude** (`catalogue/rhythm-svt.ts`): typical AVNRT has atrial gain 1.4 (both atria break through from
  the septum at once): pseudo-r′ ≈ 0.06 mV in V1 with the pseudo-S in II, III, aVF; a taller P′ merges with the
  delineated QRS (QRS > truth + 8 ms). The atypical variant keeps gain 1.
* **Pericarditis solved in II** (`catalogue/structural.ts`): the diffuse epicardial injury (now including the basal
  inferior wall) is solved to 0.18 mV at J+60 in II: ST ≈ 1.7 mm above the TP segment against a PR depression of
  ≈ 1.1 mm; V6 ST/T ≈ 0.45–0.5.

## Known limitations

* **Oracle** (tests): no noise-robust delineator (T6 runs on a subset); the P onset is read late when a long T tail
  still decays into it (`av-block-2-mobitz2`: the beat after the pause, ±7 ms PR tolerance); F waves hidden at 2:1 / 3:1 flutter are not
  re-measurable, so 2:1 / 3:1 flutter is lesson-only; the P onset is detected late when the TP segment is short (fast
  rates, long QT), which is why several drill rate ranges stop below 90–100/min (the scenario ranges do not).
* **Morphology**: terminal QRS distortion and alternating BBB are not modelled; high V1–V2 placement shows no rSr′ (the normal base has no superior terminal force); the left-atrial rhythm meets the
  LA signs (P′ negative in I and V6, upright in V1) but its P′ is small and it reads close to a low-atrial one; P waves
  are 0.09 mV in II (the calibrated NORM amplitude), so a 120 ms interatrial-block P is hard to measure by eye; LBBB
  keeps small notches (V4 rsR′, aVF); the anterior old-MI QS in V2–V3 carries one small notch (a single necrosis lobe
  cannot follow both the septal r and the anterior R; timing it from the pattern's own lobes moved the notch to V4), so
  the fragmented variant differs from the base mainly in V4; the evolved posterior MI reaches R/S ≈ 1 in V2 only (V1
  stays rS: a larger posterior scar adds inferior Q waves, not anterior R); paced beats carry no injury current
  (`scheduler.ts` builds them with `tissue = false`), so a paced Sgarbossa scenario does not exist; COPD keeps a limb
  QRS of 5–6 mm (low limb voltage is a border case, not a clear < 5 mm); biventricular hypertrophy reaches a Sokolow sum
  of ≈ 15 mm only (its LV voltage comes mostly from a deep S in V3); the fully pre-excited QRS is authored for the left
  lateral pathway only (other pathway sites use the generated family, whose basal point sources sum rightward);
  generated paced / ectopic QRS keep small mid-QRS notches (RV-apex origin: ≈ 0.4 mV at 45–60 ms in V1); the first-diagonal STEMI
  draws V1 ≈ V2 (V1 0.01 mV higher): every anterior share that lifts V2 above V1 also lifts V3–V4.
* **Missing scenarios**: bidirectional VT (the contract's ventricular rhythm has one origin and the taxonomy has no
  FindingId for it: a contract request) and a separate Spodick-sign variant. "Regularised" AF exists
  (`af-regularised`: fibrillation, complete nodal block, junctional escape 44 /min, findings atrial-fibrillation +
  av-block-3).
* **Regions3d**: AF / flutter use the generic per-stream handling (no per-stream phases).
* **Taxonomy gaps** (src/core/findings.ts, contract requests): `ventricular-trigeminy`, `cardiac-memory`,
  `motion-artefact`, `electrode-reversal-rl` are carried in facts; RA/RL neutral reversal is a request-level
  placement (lead II flat breaks the P-visibility rule in II / V1).
* **Brugada high-lead manoeuvre**: a variant cannot change the RecordingSpec (api.ts), so it is a fact on
  brugada-type2; a lesson requests the 2nd-ICS placement itself.

## Calibration and review status (2026-10-21; review fixes 2026-10-29)

M1–M6 complete: the normal base is calibrated on the PTB-XL+ NORM envelope; every scenario and variant of the 12 groups
passes T1–T3 and T7, every declared dial passes the T5 sweep, the catalogue produces every FindingId of
`src/core/findings.ts`. The whole gallery (182 cases) was reviewed by the engine workstream
(`tests/out/gallery/REVIEW.md`, git-ignored) and re-rendered on 2026-10-21 (byte-identical before the LBBB fix):
torsades, BiV pacing, pacemaker oversensing and the LBBB discordant ST were fixed at the source;
the remaining remarks are the known limitations above. **No scenario has cardiologist sign-off yet (T10)**: exams
should use only reviewed scenarios once sign-off exists.
