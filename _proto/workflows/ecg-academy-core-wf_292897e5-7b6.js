export const meta = {
  name: 'ecg-academy-core',
  description: 'Build the production synthesizer, practice engine, atlas + tools, course player and lesson stages F and S, then review lessons and integrate',
  phases: [
    { title: 'Core', detail: 'synth core port, practice engine, atlas framework, course player (parallel)' },
    { title: 'Synth groups', detail: 'rhythm / morphology / leads+chain (parallel, after core port)' },
    { title: 'Synth finish', detail: 'dials, difficulty, full oracle sweep and gallery review' },
    { title: 'Atlas content', detail: 'entries for all findings (two batches)' },
    { title: 'Lessons', detail: 'stage F and stage S lessons' },
    { title: 'Lesson review', detail: 'medical, language and render validation' },
    { title: 'Integrate', detail: 'wire slots, cross-module checks, build' },
  ],
}

const ROOT = args.root
const OLD = 'C:\\Users\\A511741\\Desktop\\Workspace\\Dynamic Electrocardiogram'

const COMMON = `
Project root: ${ROOT} — "ECG Academy", a web app whose single goal is to teach people to read ECGs (medical students). Read first: CLAUDE.md, docs/PLAN.md (esp. §1 outcomes, §3 curriculum, §4 lesson anatomy, §5 practice, §12 contracts), and the frozen contracts you depend on: src/core/*.ts, src/app/store.ts, src/app/router.ts, src/app/slots.ts, src/i18n/index.ts, src/i18n/common.ts (tc), src/ui/index.tsx, src/ecg/api.ts, src/real/api.ts + src/real/index.tsx exports, src/heart3d/api.ts, src/figures/api.ts, src/synth/api.ts, src/practice/api.ts, src/course/api.ts. Medical reference: docs/curriculum/criteria.md (criteria verified against current guidelines — ALWAYS use the current value and cite the source), docs/curriculum/critic.json (modern topics, outdated concepts to avoid), docs/curriculum/book-synthesis.json. Synth spec: _proto/DECISION.md.
Rules:
- Write ONLY the files your workstream owns (listed below). Never edit frozen contracts or another workstream's files; if a contract is insufficient, work around it locally and report it in contract_requests.
- Never create, edit or delete anything under ${OLD}. Nothing in src/ imports from _proto/.
- Stack: TypeScript strict (TS 7), ESM, Preact 10 + @preact/signals, three r186 (3D heart only), Vite 8 (import.meta.glob is available), Vitest 5. No new dependencies, no network at runtime, no enums, no Math.random in app logic (src/core/rng.ts), localStorage only in try/catch.
- Every user-visible string in zh / en / es (UI via defineDict in src/i18n/<module>.ts; content via inline L10n). Medical terminology correct in all three — Chinese standard textbook terms, Spanish = Spain usage ("derivación", "aurícula", "onda", "segmento", "bloqueo de rama", "bloqueo fascicular"). Write original text; never copy the reference book.
- Theme tokens only; light pink-paper default; layout-stable (fixed-size boxes for changing text, play-once animations); keyboard accessible.
- Tests in tests/<module>/ (Vitest, node env). Before returning run \`npx vitest run tests/<your module>\` and \`npx tsc --noEmit\` from the root and fix every error in your own files (report others).
- The one goal: does this make the learner a better, faster, safer reader of a real 12-lead ECG?`

const REPORT = {
  type: 'object',
  properties: {
    files: { type: 'array', items: { type: 'string' } },
    tests: { type: 'string' },
    typecheck: { type: 'string' },
    contract_requests: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['files', 'tests', 'typecheck', 'contract_requests', 'notes'],
}

const run = (key, phase, owns, brief) =>
  agent(`WORKSTREAM: ${key}. You own: ${owns}.\nRESUME NOTE: an earlier run of this workflow was paused; your files may already contain partial work from it. Inspect what exists first, keep what is good, continue from it rather than restarting, and delete stray scratch files. MERGE NOTE (user decision 2026-10-17, see CLAUDE.md "Heart Lab"): the old heart+ECG app is being copied into src/lab/ by another agent as a "Heart Lab" section (#/lab, #/lab/<scenario>); never edit src/lab/** or tests/lab/**; where it helps learning, link to the lab with labHref(findingId) from src/lab/links.ts (if that file exists) instead of building lab features yourself.\n${brief}\n${COMMON}`, { label: key, phase, schema: REPORT })

// ── Core (parallel) ────────────────────────────────────────────────────────────────────────────────────────────────
const synthCore = run('synth-core', 'Core', 'everything under src/synth/** (replace the stub src/synth/index.ts; keep src/synth/api.ts frozen), src/i18n/synth.ts, scripts/synth/**, tests/synth/**',
`Implement milestones M1 and M2 of _proto/DECISION.md §12.1: port Architecture B (_proto/vcg — read its DESIGN.md and code) into the module layout of §4, with the structural changes (split T, JT anchoring, every ventricular lobe carries a location, ventricular-only axis) and the grafts of §2 from _proto/regional (region geometry baked onto src/core/regions.ts ids, region activation graph, APD map) and _proto/field (junction/refractoriness rules come later in M3; the "unmeasurable truth fails" rule now). Follow §3 invariants, §5 types (src/synth/api.ts is frozen — implement it exactly), §6 algorithms, §8 oracle and test tiers (T0–T4, T7 now), §6.11 RegionStates for the 3D heart.
- Replace src/synth/index.ts with the real module: export * from './api' plus generate, scenarios, drawDials (drawDials may be a simple uniform draw within the scenario's dial ranges until the synth-finish workstream).
- Create catalogue/index.ts (registry) and ALL group files of §4 (normal.ts, rhythm-atrial.ts, rhythm-svt.ts, rhythm-ventricular.ts, av-block.ts, conduction.ts, ischemia.ts, chambers.ts, repolarization.ts, structural.ts, pacing.ts, technical.ts). Fill normal.ts (§9.1) and the 12 bake-off benchmarks with their §9 catalogue ids; other groups may start empty — three later workstreams fill them.
- Apply the judge fixes of §12.2; calibrate the normal base on the PTB-XL+ NORM envelope (scripts/synth/envelopes.ts may read data-raw/ — dev only — and writes tests/synth/fixtures/ptbxl-envelopes.json).
- scripts/synth/gallery.ts renders every scenario to tests/out/gallery/<id>.png with python -I _proto/harness/render.py; LOOK at your PNGs and iterate until a cardiologist would accept them.
- Write src/synth/README.md: the internal module boundaries and extension points the next workstreams use — rhythm/ (synth-rhythm), morph/ heart/ truth/findings.ts (synth-morph), leads/ chain/ (synth-leads), dials/ (synth-finish) — including how a group file registers scenarios and how oracle criteria are declared per scenario.`)

const practice = run('practice', 'Core', 'src/practice/** (replace the stub index.tsx; keep api.ts frozen), src/i18n/practice.ts, tests/practice/**',
`Build the practice engine exactly per src/practice/api.ts (types + the list of index exports at its end) and docs/PLAN.md §5 + the assessment rules at the end of §3.
- ecgOf(source): synthetic via generate() from src/synth/index.ts (the engine is being built in parallel — today it is a stub that throws; code against the contract and use dependency injection so tests run with a fake provider), real via loadRealEcg from src/real; small cache.
- Item generators per drill family, seeded and deterministic: rate (regular 300/1500, irregular 6-second ×10, brady/tachy, atrial vs ventricular rate), measure (PR, QRS, QT, RR on a chosen lead with calipers via EcgView onCaliper, or typed), qtc (Bazett/Fridericia/Framingham/Hodges), axis (quadrant / degrees with your own accessible axis dial), choice families (sinus or not, normal or abnormal, calibration/speed check, rhythm id, block id, territory), findings (multi-select), locate (EcgView onPick + pins: identify a P wave / QRS / T, a lead, a blocked P, the delta wave, the lead with max ST), occlusion (three-way call + territory + mimic, misses weighted), report (ReportForm, per-field scoring), compare (two ECGs). Families must cover every competency C1–C12, using scenarios({group|finding}) and drawDials() from src/synth so they grow automatically with the catalogue; real-ECG families use src/real cases with their 12SL references (tolerances from api.ts header). Difficulty ladder classic → subtle → noisy → borderline (+ real).
- Graders (pure, unit-tested at tolerance edges), feedback text that explains the specific error (e.g. "you measured to the T peak; QT ends at the end of the T wave"), confidence collection.
- Progress store: attempts, mastery (EW accuracy, rolling-30, plateau), Leitner review cards, lesson progress, overallMastery, export/import/reset, versioned schema, progressVersion signal.
- UI: ItemPlayer for every kind (ECG first, answer panel beside/below, Feedback, explanation, reveal marks on the ECG), DrillRunner, ReportForm (also plugged into the real-case page via setCaseReadingSlot at integration), ReviewsDueCard and ProgressDataControls (home and settings slots), PracticePage (hub by stage and competency + adaptive mixed mode that interleaves weak skills and due reviews), DrillPage, ExamPage (blueprinted mixed synth + real, optional timer, score by competency, separate count of missed critical findings, review of mistakes), ProgressPage (learning curve per competency, the critical-findings 100 % tracker, review queue, confidence-calibration chart).
Tests: generator determinism per seed, every family produces valid items against a fake ECG provider, graders at tolerance edges, report scoring, occlusion weighting, mastery/Leitner maths, progress import/export round trip and corrupt-data recovery.`)

const atlasCore = run('atlas-tools', 'Core', 'src/atlas/** (replace the stub index.tsx), src/tools/** (replace the stub index.tsx), src/i18n/atlas.ts, src/i18n/tools.ts, tests/atlas/**, tests/tools/**',
`Build the pattern atlas framework and the tools page.
Atlas: an entry schema in src/atlas/schema.ts (per FindingId: one-line definition, "how to recognise it" key features, numeric criteria with source, mechanism in two sentences, mimics / differential (finding ids) with the discriminating feature, pitfalls, urgency/next step for critical findings, related lessons by id, all L10n) and entries split by category in src/atlas/entries/<category>.ts. AtlasPage: browse by category and severity, search in all three languages, "can't-miss" filter. FindingPage({id}): synthetic exemplar (scenarios({finding}) + generate; variant chips; small 3D heart toggle if regions exist), criteria card, real examples (casesWithFinding from src/real — blind-friendly thumbnails), mimics shown side by side with the discriminating feature, "practise this" link to practice families (families() from src/practice filtered by finding — being built in parallel; code against the contract), related lessons. Write the entries for categories normal, axis, chamber, repolarization and technical now (two other workstreams write rhythm+conduction and ischemia+other later using your schema — document it at the top of schema.ts). Content from docs/curriculum/criteria.md (current values only, cite sources).
Tools ToolsPage({tab}): systematic-reading checklist (PLAN §3 stage S reading order, printable), normal values table (adult; sex-specific QTc and STEMI thresholds; brief paediatric notes), calculators (rate, QTc, axis — reuse Figure 'rate-ruler', 'qtc-calculator', 'axis-calculator' from src/figures), glossary zh/en/es built from FINDING_LIST plus docs/curriculum/book-synthesis.json glossary terms (corrected to current terminology).
Tests: every entry validates (all three languages non-empty, mimics are valid FindingIds, sources present), search, glossary completeness.`)

const coursePlayer = run('course-player', 'Core', 'src/course/** EXCEPT src/course/lessons/f*.ts and src/course/lessons/s*.ts (replace the stub index.tsx; keep api.ts frozen), src/i18n/course.ts, tests/course/** except lesson-content tests the lesson writers add',
`Build the course: the lesson player and the course map, per src/course/api.ts and docs/PLAN.md §3–§4.
- Lesson registry src/course/lessons/index.ts using import.meta.glob('./[a-z][0-9]*.ts', { eager: true }) so lesson writers only add files (no shared registry edits). STAGES: a StageDef for all 8 stages with all 65 lesson ids and titles from PLAN §3 (zh/en/es), status 'ready' when a lesson file exists, else 'planned'.
- LearnPage: the 8-stage learning path with progress per lesson (practice progress API getLessonProgress), planned lessons visible but marked "coming soon".
- LessonPage({id, step}): one block at a time with a step rail and deep links (#/learn/<id>/<step>); renders EVERY Block kind: hook (commit an answer before the reveal), text (light markup), ecg (EcgView + AutoMark resolution from truth: implement resolveMarks(ecg, marks) → EcgMark[] in src/course/marks.ts, unit-tested), live (synthetic ECG + sliders for the listed dials; regenerate on change with the same seed; show applied values), figure (Figure from src/figures, with optional ECG + shared cursor), heart (EcgView + Heart3D sharing a cursor signal), criteria card, worked example (steps change marks/highlights on the same ECG), contrast (two ECGs side by side, discriminating point), check (ItemPlayer from src/practice; ItemRef by family+seed via generateItem or inline), drill (DrillRunner, mastery bar, pass score), real (real cases via src/real, blind until opened), pitfalls, summary (adds review cards). Resolve EcgSource with ecgOf from src/practice. Track progress with setLessonProgress. Previous/next lesson, keyboard navigation, estimated minutes.
- ContinueLessonCard for homeSlots.continueLesson (next unfinished ready lesson).
- src/course/validate.ts: validateLesson(lesson, deps) checking schema, all three languages present, scenario ids exist (scenarios()), variant ids exist, dial ids allowed by the scenario, practice families exist (families()), finding ids, real case ids (getCase), figure ids; plus tests/course/lessons.test.ts that validates every registered lesson (it will start passing as lessons and the synth catalogue arrive — write it so unknown scenario ids fail clearly).
- Write one short example lesson ONLY as a test fixture under tests/course/fixtures/ (not in src).
The practice engine and synth are built in parallel; code strictly against their api.ts contracts.`)

// ── Synth groups (after the core port) ─────────────────────────────────────────────────────────────────────────────
const synthGroups = synthCore.then((core) =>
  parallel([
    () => run('synth-rhythm', 'Synth groups', 'src/synth/rhythm/**, src/synth/truth/truth.ts (rhythm-related truth only), src/synth/catalogue/{rhythm-atrial,rhythm-svt,rhythm-ventricular,av-block,pacing}.ts, tests/synth/rhythm/**, tests/synth/catalogue/{rhythm-atrial,rhythm-svt,rhythm-ventricular,av-block,pacing}*',
`Milestone M3 of _proto/DECISION.md §12.1: the event scheduler (§6.7) with clocks, junction (decremental AV node, His–Purkinje block, bundle refractoriness/aberrancy, accessory pathway, escape), ectopy patterns, AF wavelets and VF, flutter circuits with per-cycle atrial repolarisation, pacing (AAI/VVI/DDD/BiV, faults, stimulus kernels), rate laws; then every scenario of catalogue groups atrial, svt, ventricular, av-block and pacing (§9.2–§9.5, §9.11) with its oracle criteria. Read src/synth/README.md first (written by the core port). The core port reported: ${JSON.stringify(core)}. Render your scenarios with scripts/synth/gallery.ts and look at them; rhythm truth (atrial events, conducted/blocked, beat kinds) must match what a reader sees (laddergram-ready).`),
    () => run('synth-morph', 'Synth groups', 'src/synth/morph/**, src/synth/heart/**, src/synth/truth/findings.ts, src/synth/catalogue/{conduction,ischemia,chambers,repolarization,structural}.ts, tests/synth/morph/**, tests/synth/heart/**, tests/synth/catalogue/{conduction,ischemia,chambers,repolarization,structural}*',
`Milestone M4 of _proto/DECISION.md §12.1: territories (§6.5), injury and necrosis, repolarisation changes (ΔG/ApdChange, U, alternans, memory), substrate (mass, scar, slow regions, conduction stretch), near-field extras (Brugada coved/saddleback, epsilon, J/Osborn, fragmentation), atrial morphology/injury, derived findings (truth/findings.ts, thresholds from docs/curriculum/criteria.md — current values: sex/age J-point thresholds, Sokolow/Cornell/Peguero, QTc limits by sex); then every scenario of groups conduction, ischemia, chambers, repolarization and structural (§9.6–§9.10) with oracle criteria. Ischaemia must teach the occlusion-MI decision: hyperacute T, proportionality, terminal QRS distortion, posterior (V1–V4 ST depression with V7–V9 elevation), RV (V4R), Wellens A/B, de Winter, aVR + diffuse ST depression, LBBB/paced Sgarbossa/Smith, and the mimics. Read src/synth/README.md first. The core port reported: ${JSON.stringify(core)}. Render your scenarios with scripts/synth/gallery.ts and look at them.`),
    () => run('synth-leads', 'Synth groups', 'src/synth/leads/**, src/synth/chain/**, src/synth/catalogue/technical.ts, scripts/synth/bake-leadfield.ts, tests/synth/leads/**, tests/synth/chain/**, tests/synth/catalogue/technical*',
`Milestone M5 of _proto/DECISION.md §12.1: bake lead vectors for any chest/back position offline from _proto/field's BEM torso (scripts/synth/bake-leadfield.ts → src/synth/leads/leadTable.gen.ts, blended so the standard sites reproduce Dower exactly; verify the open item in §13 about Dower extra rows), electrode placement (limb cable swaps incl. RA/LA, LA/LL, RA/LL, neutral swaps; precordial swaps and high/low placement; Mason–Likar), extra leads V3R/V4R/V7–V9, the recording chain (§6.9: wander, EMG, tremor, mains with imbalance, electrode pop, motion, lead-off; diagnostic/monitor filters incl. the 0.5 Hz high-pass ST distortion; gain error; ADC), and every scenario of group technical (§9.12) with oracle criteria (each electrode reversal produces its textbook signature). Read src/synth/README.md first. The core port reported: ${JSON.stringify(core)}. Render your scenarios and look at them.`),
  ]),
)

const synthFinish = synthGroups.then((groups) =>
  run('synth-finish', 'Synth finish', 'all of src/synth/** and tests/synth/** and scripts/synth/** (the group workstreams are finished)',
`Milestone M6 of _proto/DECISION.md §12.1 plus the final quality pass of the whole engine:
- dials (§7): DialDef table, analytic and root-find solves so drills set exact PR / QRS / QTc / axis / ST / rate and truth stays exact; drawDials(scenario, rng, difficulty) with the difficulty ladder classic → subtle → noisy → borderline; natural jitter; T5 tests.
- Run the complete oracle over EVERY scenario and variant (T1–T9) and fix every failure; the catalogue test (every FindingId in src/core/findings.ts produced by at least one scenario) must pass; performance budget §10 (bench script, T9).
- Render the full gallery (scripts/synth/gallery.ts) and review EVERY PNG as a senior cardiologist who teaches ECG reading (wave shapes, amplitudes, durations, lead-to-lead consistency, hallmark features of the condition, no artefactual notches). Fix what is wrong at the source level (one-source rule). Write tests/out/gallery/REVIEW.md (gitignored) with a one-line verdict per scenario and keep a short committed summary in src/synth/README.md (known limitations).
The group workstreams reported: ${JSON.stringify(groups)}`),
)

// ── Atlas content (after the framework) ────────────────────────────────────────────────────────────────────────────
const atlasContent = atlasCore.then((a) =>
  parallel([
    () => run('atlas-rhythm-conduction', 'Atlas content', 'src/atlas/entries/rhythm.ts and src/atlas/entries/conduction.ts only',
`Write the atlas entries for every finding in categories rhythm and conduction (src/core/findings.ts) using the schema in src/atlas/schema.ts (read its header and the existing entries for tone and depth). Criteria and current values from docs/curriculum/criteria.md and current guidelines (2:1 AV block as its own category; mechanism-based SVT names; fascicular block terminology; strict LBBB criteria; WCT treated as VT until proven otherwise). The atlas workstream reported: ${JSON.stringify(a)}. Run the atlas tests.`),
    () => run('atlas-ischemia-other', 'Atlas content', 'src/atlas/entries/ischemia.ts and src/atlas/entries/other.ts only',
`Write the atlas entries for every finding in categories ischemia and other (src/core/findings.ts) using the schema in src/atlas/schema.ts (read its header and the existing entries for tone and depth). Use the occlusion-MI framing and current thresholds (4th UDMI sex/age J-point thresholds, posterior and RV leads, Wellens, de Winter, aVR, Sgarbossa/Smith), current Brugada (type 1 only diagnostic), hyperkalaemia progression, PE (S1Q3T3 insensitive), etc., from docs/curriculum/criteria.md and docs/curriculum/critic.json. The atlas workstream reported: ${JSON.stringify(a)}. Run the atlas tests.`),
  ]),
)

// ── Lessons (after the player and the practice engine) ─────────────────────────────────────────────────────────────
const lessons = Promise.all([coursePlayer, practice]).then(([c, p]) =>
  parallel(
    [
      { stage: 'F', ids: 'f1–f6', files: 'src/course/lessons/f*.ts, tests/course/lessons-f.test.ts' },
      { stage: 'S', ids: 's1–s7', files: 'src/course/lessons/s*.ts, tests/course/lessons-s.test.ts' },
    ].map((L) => () =>
      run(`lessons-${L.stage}`, 'Lessons', L.files,
`Write the lessons of stage ${L.stage} (${L.ids}) of docs/PLAN.md §3, one file per lesson exporting a Lesson (src/course/api.ts), following the lesson anatomy of §4 (hook → concept → criteria → worked example → contrast → checks → drill → real cases → pitfalls → summary; not every block every time, but always attempt-first and always ECG-first). Requirements:
- Pedagogy: one idea per block, short sentences, a worked example before independent practice, contrasting cases, immediate feedback; stage goal and assessment from docs/curriculum/critic.json learning_path (stages 1–2). Stage F stays short and causal (only the physiology that explains waves); stage S teaches the fixed reading order and accurate measurement without over-calling normal variants.
- Every numeric criterion from docs/curriculum/criteria.md (current values; cite sources in lesson.sources). Modern terminology (critic outdated_concepts).
- ECGs: synthetic via SynthRequest with scenario ids and dials from _proto/DECISION.md §9 / src/synth catalogue (the engine is still being finished — use ids exactly as listed there; the validator will check them), AutoMarks for annotations, live blocks with dials for "what changes when…" moments, the small 3D heart where mechanism helps (f1, f2), figures from src/figures where they teach (paper, electrodes, hexaxial, horizontal-plane, conduction, dipole, action-potential, rate-ruler, qtc-calculator, axis-calculator), and real PTB-XL cases (ids from src/data/real/ptbxl-meta.json; pick clean examples; NORM cases for normal ECGs).
- Checks and drills use practice families (families() in src/practice — read its registry) or inline items.
- zh / en / es all complete and natural (not literal), Spain Spanish, Chinese textbook terms.
- A test file validating your lessons with src/course/validate.ts.
The course player reported: ${JSON.stringify(c)}. The practice engine reported: ${JSON.stringify(p)}.`),
    ),
  ),
)

// ── Lesson review (after lessons and the finished engine) ──────────────────────────────────────────────────────────
const lessonReview = Promise.all([lessons, synthFinish]).then(([ls, sf]) =>
  run('lesson-review', 'Lesson review', 'src/course/lessons/f*.ts and s*.ts, tests/course/lessons-*.test.ts',
`Fresh-eyes review of the 13 lessons (f1–f6, s1–s7) now that the synthetic engine is finished. For EACH lesson:
1) Validate it (src/course/validate.ts, tests) — every scenario/variant/dial/family/finding/real id resolves; fix references to scenarios that ended up with other ids (read src/synth catalogue).
2) Render every synthetic ECG it uses (generate() + python -I _proto/harness/render.py) and check that what the text says is visible on that ECG (marks land on the right waves, criteria values match truth, the "normal" examples are really normal, live dials stay within range).
3) Medical accuracy against docs/curriculum/criteria.md and current guidelines; modern terminology; no copied book text.
4) Language: zh / en / es complete, natural, correct terms (Spain Spanish); consistent with the finding names in src/core/findings.ts.
5) Pedagogy: attempt-first hooks, worked example before practice, checks with good distractors and explanatory feedback.
Fix everything in place. Lesson writers reported: ${JSON.stringify(ls)}. Engine finish reported: ${JSON.stringify(sf)}.`),
)

await Promise.all([lessonReview, atlasContent])

// ── Integration ────────────────────────────────────────────────────────────────────────────────────────────────────
phase('Integrate')
const integ = await run('integrate', 'Integrate', 'src/main.tsx, src/app/** (except store.ts, router.ts, theme.css), and small cross-module glue fixes anywhere (list each)',
`Integrate the app and make it work end to end:
- Wire the slots in src/main.tsx: homeSlots.continueLesson (course ContinueLessonCard), homeSlots.reviewsDue (practice ReviewsDueCard), homeSlots.caseOfDay (real CaseOfDayCard), homeSlots.heroEcg (a live synthetic normal 12-lead in the home hero), overallProgress (practice overallMastery, updated on progressVersion), progressDataSlot (practice ProgressDataControls), setCaseReadingSlot(ReportForm adapter graded against the case's 12SL reference + mapped findings). Remove every remaining STUB page.
- The Heart Lab (src/lab) is ALREADY wired by the integrator: routes #/lab and #/lab/<scenario>, header/menu/tab-bar entry, full-bleed layout without footer, lab model credits on the About page — keep all of that working. Add "see it in the Heart Lab" links (labHref from src/lab) on atlas finding pages and in lessons wherever the lab has the condition and they are still missing. Report the single-file size with the lab included (its two .bin assets add about 3.6 MB base64; raise the budget note to ≤ 14 MB but report what dominates).
- Cross-module checks: every route renders (incl. #/lab); lessons validate; atlas entries exist for every finding (report gaps); practice families all generate items from the real engine; real cases open; 3D heart shows region states for synthetic ECGs; no console errors.
- Run npx vitest run (all) and npx tsc --noEmit; npm run build (single self-contained dist/index.html) and report its size (budget ≤ 8 MB); check in a headless browser (as earlier workstreams did: private Vite server on a scratch port, headless Edge via CDP, stop everything afterwards) at 1366×768 and 390 px wide, zh/en/es, light/dark: home, a lesson, a drill, a real case, an atlas page, tools.
- Update docs/PLAN.md status notes (what is built, what is planned) without changing its decisions.`)

return { integ }
