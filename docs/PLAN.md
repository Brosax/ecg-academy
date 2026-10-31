# ECG Academy — master plan (v0.1 draft, 2026-10-16)

> 目标只有一个：**教会人看心电图**。每个功能都用一个问题来检验：它是否让学习者更好、更快、更安全地读懂一份真实的 12 导联心电图？
> The ECG is always the protagonist. The small 3D heart and the 2D figures only explain *why* the tracing looks the way it does.

Status of inputs: book curriculum extraction (`docs/curriculum/`) and the synthesizer bake-off (`_proto/DECISION.md`) are
done (2026-10-17); the **[pending]** markers below are historical — §3 and §7 were finalised from them.

---

> **2026-10-17 merge decision (user):** ECG Academy is the main site and gains a **Heart Lab** section (`#/lab`) — the old
> Dynamic Electrocardiogram app copied into `src/lab/` with its own voxel engine. Lessons, drills, atlas and exam keep the
> new synthesizer and link into the lab ("see it in the Heart Lab") for conditions the lab supports. Nav: Learn ·
> Practice · Heart Lab · Cases · Atlas · Exam · Tools.

## 0. Build status (2026-10-22 integration pass; 2026-10-25 all 64 lessons written)

Built and wired end to end — one self-contained `dist/index.html`; every route renders in zh / en / es, light / dark,
at 1366×768 and 390 px wide, with no console errors (headless Edge check of the built file):

- **Shell** (`src/app`): header · phone menu · tab bar (with Heart Lab), progress ring fed by practice mastery, settings
  (screen calibration, progress export / import / reset), about with every attribution. No placeholder pages remain.
- **Home**: a live synthetic normal 12-lead in the hero — read first, then "label the waves" reveals P/QRS/T, the PR /
  QRS / QT brackets and the model's measurements; "another normal ECG" shows the normal range. The "today" cards are
  filled by their modules: continue lesson (course) · reviews due (practice) · real case of the day (real).
- **Synthetic engine** (`src/synth`): 128 scenarios + 54 variants, dials, difficulty ladder, truth from model timing;
  every scenario gives region states for the small 3D heart (VF and asystole: no organised activation to show).
- **Viewer** (`src/ecg`), **3D heart** (`src/heart3d`), **figures** (`src/figures`: 14 figures, 5 decision trees).
- **Course** (`src/course`): the map of all 8 stages; **all 64 lessons written and validated** against the live
  catalogues (F1–F6, S1–S7, R1–R8, T1–T7, I1–I11, H1–H9, O1–O12, X1–X4; criteria from docs/curriculum/criteria.md
  current values, citations per lesson).
- **Practice** (`src/practice`): 52 drill families on the real engines (synthetic and PTB-XL), exam, mastery + Leitner
  review; every real case page carries the structured report, graded against the 12SL measurements and the mapped labels.
- **Real library** (`src/real`): 300 PTB-XL cases, case of the day. **Atlas** (`src/atlas`): 129 entries — every finding
  of the taxonomy. **Tools** (`src/tools`): checklist, normal values, calculators, glossary.
- **Heart Lab** (`src/lab`, `#/lab`): 40 lab scenarios reachable from 56 findings; "see it in the Heart Lab" links on
  atlas pages, lessons and drills wherever the lab has the condition.
- **AI study assistant** (`src/assistant`, 2026-10-31): an opt-in floating chat panel that explains terms, criteria and
  mechanisms through the learner's own LLM API (Claude via the official SDK, or any OpenAI-compatible endpoint); knows
  which lesson step, atlas entry or drill is on screen, never the hidden answer of a case or item; "ask AI" bubble on
  selected text; settings in the panel and on the settings page; the key stays in the browser (CLAUDE.md).

Planned, not built yet:

- Lesson take-aways → spaced-review queue (§4 `summary`): the course calls practice `scheduleReview(keys, now)`, which
  the practice module does not export yet, so take-aways are not queued.
- Lazy loading / code splitting of the large assets (the single file is 10.4 MB, see §11).

## 1. Learning outcomes (competencies)

| id | The learner can… | Mastery evidence |
|---|---|---|
| C1 | read the paper (speed, gain, calibration), name the leads and their placement, label P/QRS/T/U and PR/QRS/ST/QT | locate items ≥ 90 % |
| C2 | compute the ventricular (and atrial) rate, regular or irregular | ±10 % on 10 consecutive items |
| C3 | decide sinus vs not sinus and describe P–QRS relationship | rhythm items ≥ 85 % |
| C4 | measure PR, QRS, QT and compute QTc | PR/QRS ±20 ms, QT ±30 ms, QTc ±30 ms |
| C5 | determine the frontal QRS axis (quadrant, then degrees) | quadrant 100 %, ±20° |
| C6 | recognise AV blocks, bundle-branch/fascicular blocks, pre-excitation | ≥ 85 % |
| C7 | recognise atrial abnormality and ventricular hypertrophy by named criteria | ≥ 80 % |
| C8 | recognise acute coronary occlusion (STEMI by territory + reciprocity, STEMI equivalents) and its mimics | ≥ 90 % on "can't-miss" set |
| C9 | classify tachy/bradyarrhythmias (narrow/wide, regular/irregular) | ≥ 85 % |
| C10 | recognise electrolyte, drug, channelopathy, cardiomyopathy, pacing patterns | ≥ 80 % |
| C11 | write a complete structured report of a 12-lead | report score ≥ 80 % |
| C12 | spot artefacts and electrode misplacement | ≥ 85 % |

Evidence-based teaching principles used everywhere: a fixed **systematic approach** taught first and reused in every
lesson; **worked examples → faded examples → independent practice**; **immediate, explanatory feedback**;
**deliberate practice** on one skill at a time, then **interleaving**; **contrasting cases** (pattern vs its mimic);
**spaced repetition** of what was missed; **real tracings** before declaring mastery.

## 2. Information architecture (hash routes)

| Route | Page | Purpose |
|---|---|---|
| `#/` | Home | continue lesson · learning-path map · reviews due today · quick drill · real case of the day |
| `#/learn` | Course map | stages → units → lessons with progress rings |
| `#/learn/:lessonId` | Lesson player | blocks (see §4), ECG-first layout |
| `#/practice` | Drill hub | choose a skill / pattern family / difficulty; adaptive mixed mode |
| `#/practice/:drillId` | Drill session | item → answer → feedback → next; session summary |
| `#/cases` | Real ECG library (PTB-XL) | filter by category; "read first, then reveal" |
| `#/cases/:ecgId` | Real case | full viewer + structured report form + reveal (cardiologist labels, 12SL measurements) |
| `#/atlas` / `#/atlas/:findingId` | Pattern atlas | every finding: synthetic exemplar · criteria · real examples · mimics/differential |
| `#/exam` | Exam | timed mixed set (synthetic + real) → score by competency → review mistakes |
| `#/tools` | Reference | systematic checklist · normal values · calculators (rate, QTc, axis) · glossary zh/en/es |
| `#/progress` | Progress | mastery per competency/finding, review queue, export/import |
| `#/settings`, `#/about` | Settings / credits | language, theme, paper defaults, screen calibration; book citation, PTB-XL & HRA attributions |

Global header: logo · Learn · Practice · Cases · Atlas · Exam · Tools · progress ring · language (中文/English/Español) · theme.

## 3. Curriculum (final: book map + guideline check + evidence-based path, `docs/curriculum/`)

Eight stages, adopted from the completeness critic's evidence-based path (docs/curriculum/critic.json) and mapped to the
book chapters (docs/curriculum/book-synthesis.json). Modern framing wins where the 2004 book is outdated (occlusion-MI
decision instead of the ischaemia–injury–necrosis triad; sex/age J-point thresholds; "atrial abnormality"; "fascicular
block"; "LVH with secondary ST–T changes"; Brugada type 1 only diagnostic; Fridericia/Framingham over Bazett; 2:1 AV block
as its own category; mechanism-based SVT names). Lesson ids are stable.

| Stage | Goal | Lessons |
|---|---|---|
| **F** Foundations | predict the deflection in any lead from an activation vector; check the recording before reading | f1 conduction system & what each part draws · f2 dipole & vector: why a deflection is positive, negative or equiphasic · f3 the lead systems (Einthoven, Goldberger, Wilson; hexaxial & horizontal frames) · f4 paper, calibration, speed & filters · f5 electrode placement, colour codes, right-sided & posterior leads · f6 signal-quality check as step 1 |
| **S** Systematic read & measurement | a fixed-order structured read in ~3 min, accurate measurements, no over-calling of normal | s1 the fixed reading order · s2 heart rate (300/1500/6-s) · s3 sinus rhythm & sinus arrhythmia · s4 intervals: PR, QRS, QT (tangent method), QTc formulas & limits · s5 frontal axis & R-wave progression · s6 J point & measuring ST deviation · s7 normal variants (early repolarisation pattern, juvenile T, incomplete RBBB, athletes, children) |
| **R** Rhythm I | find atrial activity, establish the P–QRS relationship, name rhythm/site/urgency; AV and bundle-branch blocks | r1 sinus brady/tachy, pauses, SA block, sinus node dysfunction · r2 escape beats & rhythms, AV dissociation · r3 1st-degree AV block & Mobitz I · r4 Mobitz II, 2:1, high-grade & complete AV block · r5 premature beats (PAC, blocked PAC, PJC, PVC) & aberrancy · r6 RBBB & LBBB (strict criteria) · r7 fascicular blocks, bifascicular, alternating BBB, IVCD · r8 ladder diagrams |
| **T** Rhythm II | classify any tachycardia by width & regularity; treat unexplained WCT as VT; peri-arrest rhythms in 10 s | t1 regular narrow-QRS tachycardia (sinus, AVNRT, AVRT, focal AT, flutter 2:1) · t2 irregular rhythms (AF, flutter with variable block, MAT, frequent ectopy) · t3 atrial flutter in depth · t4 pre-excitation: WPW pattern vs syndrome, pre-excited AF · t5 wide-complex tachycardia (AV dissociation, capture/fusion, concordance, one fast algorithm) · t6 polymorphic VT, torsades, VF, asystole, PEA, artefact mimicking VT · t7 peri-arrest rhythm recognition and the first action |
| **I** Ischaemia & infarction | for every chest-pain ECG commit to: occlusion likely / indeterminate (repeat, extra leads) / not occlusion (name the mimic); localise the culprit | i1 measuring ST, UDMI thresholds by sex & age, contiguous leads, reciprocity · i2 territories & culprit artery · i3 anterior occlusion · i4 inferior & RV infarction · i5 lateral & high lateral · i6 posterior infarction (V1–V4 ST depression, V7–V9) · i7 subtle occlusion: hyperacute T, proportionality, terminal QRS distortion, serial ECGs · i8 Wellens, de Winter, aVR elevation with diffuse ST depression · i9 evolution, Q waves, reperfusion, old MI, LV aneurysm · i10 confounders: LBBB & pacing (Sgarbossa, Smith), RBBB, LVH · i11 mimics: pericarditis, early repolarisation, aneurysm, Brugada, hyperkalaemia, takotsubo |
| **H** Chambers & sudden-death substrates | recognise structural & channelopathy substrates; know what to refer | h1 atrial abnormality & interatrial block · h2 LVH (Sokolow-Lyon, Cornell, Peguero-Lo Presti; secondary ST–T) · h3 RVH & right-heart strain · h4 low voltage & infiltrative disease · h5 HCM incl. apical · h6 ARVC · h7 long QT (congenital & drug-induced) & short QT · h8 Brugada & early repolarisation syndrome · h9 athlete ECG (international criteria) |
| **O** Systemic, toxic, device, technical | explain an abnormal ECG by metabolism, drugs, temperature, devices or the recording before blaming the heart | o1 potassium · o2 calcium & magnesium · o3 digoxin effect vs toxicity · o4 sodium-channel blockers & other drugs · o5 hypothermia · o6 pulmonary embolism · o7 pericarditis, effusion, tamponade · o8 deep T inversion that is not ischaemia (cerebral, post-tachycardia, memory) · o9 lead reversal, misplacement, dextrocardia · o10 artefacts & filters · o11 the paced ECG · o12 computer interpretation & automation bias |
| **X** Integration | read unselected real ECGs under time pressure; structured report with urgency & next action | x1 the structured report · x2 ECG clinic: prevalence-weighted real stream · x3 10-second emergency triage · x4 confidence calibration & personal error review |

Assessment rules from the critic: measurement tolerances HR ±5 bpm (or ±10 %), intervals ±20 ms, axis ±30°; emergency
("class A", `critical` findings) recognition must reach 100 %; in ischaemia sets missed occlusions and false activations are
scored separately (misses weigh more) and "repeat ECG / extra leads" is a valid answer; rhythm sets are interleaved with
learning curves (pass = rolling 80 % over the last 30 items and plateau); missed items re-enter spaced review; the learner
commits a read before any machine statement is shown; confidence is collected for calibration.

## 4. Lesson anatomy

A lesson is data (`src/course/lessons/<id>.ts`), rendered by one player. Text lives inline as `{ zh, en, es }`.

```
hook          an ECG + a question ("What is wrong here?") — attempt before teaching
concept       short text + an interactive figure or a live synthetic ECG with one or two dials
criteria      the numeric criteria card (also shown in the atlas)
worked        a worked example: step-by-step reading on an ECG (lead highlights, calipers, annotations per step)
contrast      pattern vs its look-alike, side by side, with the discriminating feature highlighted
check         2–5 inline items with immediate explanatory feedback
drill         an embedded mini-drill (generated, unlimited) — mastery bar
real          1–3 real PTB-XL tracings of the same finding ("now on a real patient")
pitfalls      common reading errors
summary       3–5 bullet take-aways → added to the spaced-repetition queue
```

## 5. Practice engine

Item types (all graded from model truth or curated real-ECG truth):

| type | learner action | graded against |
|---|---|---|
| `rate` | type bpm (method hint on request) | truth HR ± 10 % |
| `measure` | place calipers on the strip (or type ms) | truth PR/QRS/QT ± tolerance |
| `qtc` | compute QTc (Bazett/Fridericia) | truth ± 30 ms |
| `axis` | drag the vector on the hexaxial dial (or pick a quadrant) | truth ± 20° (partial ± 35°) |
| `rhythm` | choose the rhythm | rhythm label |
| `findings` | multi-select findings from a short list | finding set (precision/recall) |
| `locate` | click the ECG (a lead / a beat / a wave) | lead + time window from annotations |
| `territory` | choose wall / culprit artery | scenario territory |
| `report` | fill the structured report | per-field score |
| `compare` | pick which of two ECGs shows X | — |
| `spot` | normal or abnormal? (speed round) | — |

Mastery: per competency and per finding — exponentially weighted accuracy + a Leitner box (1, 2, 4, 8, 16 days) for spaced
review. Difficulty ladder per item family: *classic* → *subtle* (smaller effect sizes, borderline values) → *noisy* (baseline
wander, tremor, mains hum) → *real*. All randomness is seeded; every item has a reproducible id `family:seed`.
Persistence: `localStorage` (try/catch), versioned schema, export/import JSON.

## 6. ECG viewer (the protagonist)

- Canvas paper at true scale (px/mm from settings; optional on-screen calibration with a bank card, 85.60 mm).
- Layouts: `3x4+1` (II rhythm strip), `3x4+3` (II, V1, V5), `6x2`, `12x1`, `single`, `strip` (one long lead); standard or
  Cabrera limb-lead order. Speed 25/50 mm/s, gain 5/10/20 mm/mV, optional half gain on chest leads.
- Tools: calipers (Δt in ms and small squares, bpm; amplitude mode in mV/mm; march-out), magnifier, crosshair read-out,
  lead highlight, overlays (wave labels, interval brackets, J-point and J+60 ms markers, ST deviation read-out), answer pins
  for `locate` items.
- Time cursor: clicking the ECG pauses any animation and sets the shared cursor; the 3D heart, conduction diagram,
  laddergram and vector figures follow it.
- Live "monitor" sweep mode for rhythm lessons (play once and hold; no flicker loops).

## 7. Synthetic ECG engine **[pending: `_proto/DECISION.md`]**

One cardiac source → one lead system → 12 leads (one-source rule, CLAUDE.md). Interface:
`generate(scenario, { fs, durationS, seed }) → { leads, truth, annotations, regions }` where `truth` carries rhythm/beat
timing, intervals, axes and the finding set, `annotations` carries per-beat fiducials for overlays and `locate` items,
and `regions` drives the small 3D heart. Scenarios are data: a base condition + continuous dials (rate, PR, QRS width,
axis, QTc, ST shift…) so drills can vary every parameter while truth stays exact.

## 8. Real ECG library (done: data pipeline)

300 curated PTB-XL records (64 classes, human-validated, no noise flags, one per patient) →
`src/data/real/ptbxl-signals.bin` (2.4 MB) + `ptbxl-meta.json` (labels, 12SL reference measurements). Decoded lazily with
`DecompressionStream('deflate-raw')`. SCP codes are mapped to the app's finding taxonomy and translated (zh/en/es).
Attribution (Wagner et al. 2020; Strodthoff et al. 2023; PhysioNet; CC BY 4.0) on every case page and in About.

## 9. Secondary views

- **Small 3D heart** (`src/heart3d/`): HRA "Heart, Male" v1.3 (CC BY 4.0) decimated to a compact asset; regions coloured by the
  synthetic engine's activation/repolarization state at the cursor; overlays for infarct zone, accessory pathway, ectopic
  focus, heart vector. Shown in lessons that explain mechanism and as an optional side panel in the viewer.
- **2D figures** (`src/figures/`): paper & calibration · electrode placement (drag to misplace) · Einthoven triangle & hexaxial
  projection of a heart vector · horizontal plane · conduction-system diagram synced to the cursor · auto laddergram from
  rhythm events · action potential vs surface ECG · axis calculator · rate rulers & QTc · VCG loop projections ·
  coronary territory map · decision trees (wide/narrow tachycardia, AV block, ST elevation differential).

## 10. Code layout and ownership (each folder has one owner during the build)

```
src/core/       shared types, lead definitions, finding taxonomy, seeded RNG, l10n type, signal utils
src/synth/      synthetic ECG engine + scenario catalogue + truth/annotations
src/ecg/        viewer, paper, layouts, tools, overlays, monitor mode
src/real/       real-ECG bundle decoder, case model, SCP → finding mapping + translations
src/practice/   item generators, graders, mastery + spaced repetition, drills, exam
src/course/     curriculum structure, lesson player, lessons/<id>.ts
src/figures/    2D interactive explainers
src/heart3d/    small three.js heart
src/atlas/      pattern atlas pages
src/tools/      checklist, normal values, calculators, glossary
src/app/        main, router, shell, store, settings, theme.css, home, progress, about
src/i18n/       core (defineDict, tc) + per-module UI dictionaries
```

## 11. Quality gates

- Synthetic oracle tests per scenario: criteria measured on the signals (e.g. RBBB: QRS ≥ 120 ms, R′ in V1, S duration in
  I/V6); Einthoven/Goldberger identities; truth vs measured intervals.
- Practice: generators deterministic per seed; graders unit-tested at tolerance edges.
- Content: every lesson validates against the schema; every referenced scenario/finding/case exists; every string has
  zh/en/es; medical review + language review passes recorded per lesson.
- Real bundle: decode test, record count, finding mapping coverage.
- UI: browser verification (1366×768, 1536×735, 1920×1080, phone), zh/en/es, light/dark; layout-stability checks.
- Build: single self-contained `dist/index.html`, size budget ≤ 8 MB — raised to **≤ 14 MB** with the Heart Lab merge
  (its two HRA geometry assets add ≈ 3.6 MB of base64). 2026-10-22: **10.4 MB** — base64 binaries 7.2 MB (PTB-XL signals
  3.3 · lab heart 2.35 · lab body 1.28 · small 3D heart 0.26), JS 3.3 MB (atlas text 0.69 · three.js 0.43 · course 0.28 ·
  synth 0.22 · lab code + strings ≈ 0.55 · practice 0.20 · figures 0.19 · real 0.15), CSS 0.17 MB. Start-up is dominated by
  parsing the file (first paint ≈ 1.8 s from cache in headless Edge; app JS < 0.1 s).

## 12. Contracts and page exports (frozen unless the integrator changes them)

Shared contracts (integrator-owned): `src/core/*` (l10n, leads, rng, ecg, findings, regions), `src/app/store.ts`,
`src/app/router.ts`, `src/app/theme.css`, `src/i18n/index.ts`, `src/i18n/common.ts` (`tc`), `src/ui/*` (primitives),
and each module's `api.ts` (`src/ecg/api.ts`, `src/real/api.ts`, `src/heart3d/api.ts`, `src/figures/api.ts`; synth,
practice and course contracts follow the synthesizer decision). Modules import other modules only through their
`index.tsx`. Module UI strings: `src/i18n/<module>.ts` via `defineDict`.

Page components (the shell's router switch imports exactly these names):

| module | exports |
|---|---|
| `src/app` | `HomePage`, `SettingsPage`, `AboutPage`, `NotFoundPage` |
| `src/course` | `LearnPage`, `LessonPage({ id, step? })` |
| `src/practice` | `PracticePage`, `DrillPage({ id })`, `ExamPage`, `ProgressPage` |
| `src/real` | `CasesPage`, `CasePage({ id })` |
| `src/atlas` | `AtlasPage`, `FindingPage({ id })` |
| `src/tools` | `ToolsPage({ tab? })` |
| `src/lab` | `LabPage({ scenario? })` (Heart Lab, the old app copied in; `#/lab`, `#/lab/<scenario>`) |
