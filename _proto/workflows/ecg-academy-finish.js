export const meta = {
  name: 'ecg-academy-finish',
  description: 'Finish the core build: synth rhythm/morph/leads groups, synth finish (dials + gallery review), lesson review, integration',
  phases: [
    { title: 'Synth groups', detail: 'rhythm / morphology / leads+chain (parallel)' },
    { title: 'Synth finish', detail: 'dials, difficulty, full oracle sweep and gallery review' },
    { title: 'Lesson review', detail: 'medical, language and render validation of f1–f6, s1–s7' },
    { title: 'Integrate', detail: 'wire slots, cross-module checks, build' },
  ],
}
// Already finished in run wf_292897e5-7b6 (reports in _proto/reports/): synth-core, practice, atlas-tools, course-player,
// atlas-rhythm-conduction, atlas-ischemia-other, lessons-F, lessons-S.

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

phase('Synth groups')
const groups = await parallel([
    () => run('synth-rhythm', 'Synth groups', 'src/synth/rhythm/**, src/synth/truth/truth.ts (rhythm-related truth only), src/synth/catalogue/{rhythm-atrial,rhythm-svt,rhythm-ventricular,av-block,pacing}.ts, tests/synth/rhythm/**, tests/synth/catalogue/{rhythm-atrial,rhythm-svt,rhythm-ventricular,av-block,pacing}*',
`Milestone M3 of _proto/DECISION.md §12.1: the event scheduler (§6.7) with clocks, junction (decremental AV node, His–Purkinje block, bundle refractoriness/aberrancy, accessory pathway, escape), ectopy patterns, AF wavelets and VF, flutter circuits with per-cycle atrial repolarisation, pacing (AAI/VVI/DDD/BiV, faults, stimulus kernels), rate laws; then every scenario of catalogue groups atrial, svt, ventricular, av-block and pacing (§9.2–§9.5, §9.11) with its oracle criteria. Read src/synth/README.md first (written by the core port). The core port's report is in _proto/reports/synth-core.json. Render your scenarios with scripts/synth/gallery.ts and look at them; rhythm truth (atrial events, conducted/blocked, beat kinds) must match what a reader sees (laddergram-ready).`),
    () => run('synth-morph', 'Synth groups', 'src/synth/morph/**, src/synth/heart/**, src/synth/truth/findings.ts, src/synth/catalogue/{conduction,ischemia,chambers,repolarization,structural}.ts, tests/synth/morph/**, tests/synth/heart/**, tests/synth/catalogue/{conduction,ischemia,chambers,repolarization,structural}*',
`Milestone M4 of _proto/DECISION.md §12.1: territories (§6.5), injury and necrosis, repolarisation changes (ΔG/ApdChange, U, alternans, memory), substrate (mass, scar, slow regions, conduction stretch), near-field extras (Brugada coved/saddleback, epsilon, J/Osborn, fragmentation), atrial morphology/injury, derived findings (truth/findings.ts, thresholds from docs/curriculum/criteria.md — current values: sex/age J-point thresholds, Sokolow/Cornell/Peguero, QTc limits by sex); then every scenario of groups conduction, ischemia, chambers, repolarization and structural (§9.6–§9.10) with oracle criteria. Ischaemia must teach the occlusion-MI decision: hyperacute T, proportionality, terminal QRS distortion, posterior (V1–V4 ST depression with V7–V9 elevation), RV (V4R), Wellens A/B, de Winter, aVR + diffuse ST depression, LBBB/paced Sgarbossa/Smith, and the mimics. Read src/synth/README.md first. The core port's report is in _proto/reports/synth-core.json. Render your scenarios with scripts/synth/gallery.ts and look at them.`),
    () => run('synth-leads', 'Synth groups', 'src/synth/leads/**, src/synth/chain/**, src/synth/catalogue/technical.ts, scripts/synth/bake-leadfield.ts, tests/synth/leads/**, tests/synth/chain/**, tests/synth/catalogue/technical*',
`Milestone M5 of _proto/DECISION.md §12.1: bake lead vectors for any chest/back position offline from _proto/field's BEM torso (scripts/synth/bake-leadfield.ts → src/synth/leads/leadTable.gen.ts, blended so the standard sites reproduce Dower exactly; verify the open item in §13 about Dower extra rows), electrode placement (limb cable swaps incl. RA/LA, LA/LL, RA/LL, neutral swaps; precordial swaps and high/low placement; Mason–Likar), extra leads V3R/V4R/V7–V9, the recording chain (§6.9: wander, EMG, tremor, mains with imbalance, electrode pop, motion, lead-off; diagnostic/monitor filters incl. the 0.5 Hz high-pass ST distortion; gain error; ADC), and every scenario of group technical (§9.12) with oracle criteria (each electrode reversal produces its textbook signature). Read src/synth/README.md first. The core port's report is in _proto/reports/synth-core.json. Render your scenarios and look at them.`),
])
const gOk = groups.filter(Boolean)
log(`synth groups finished: ${gOk.length}/3`)

phase('Synth finish')
const sf = await run('synth-finish', 'Synth finish', 'all of src/synth/** and tests/synth/** and scripts/synth/** (the group workstreams are finished)',
`Milestone M6 of _proto/DECISION.md §12.1 plus the final quality pass of the whole engine:
- dials (§7): DialDef table, analytic and root-find solves so drills set exact PR / QRS / QTc / axis / ST / rate and truth stays exact; drawDials(scenario, rng, difficulty) with the difficulty ladder classic → subtle → noisy → borderline; natural jitter; T5 tests.
- Run the complete oracle over EVERY scenario and variant (T1–T9) and fix every failure; the catalogue test (every FindingId in src/core/findings.ts produced by at least one scenario) must pass; performance budget §10 (bench script, T9).
- Render the full gallery (scripts/synth/gallery.ts) and review EVERY PNG as a senior cardiologist who teaches ECG reading (wave shapes, amplitudes, durations, lead-to-lead consistency, hallmark features of the condition, no artefactual notches). Fix what is wrong at the source level (one-source rule). Write tests/out/gallery/REVIEW.md (gitignored) with a one-line verdict per scenario and keep a short committed summary in src/synth/README.md (known limitations).
The group workstreams reported: ${JSON.stringify(gOk)}`)


// ── Lesson review (after lessons and the finished engine) ──────────────────────────────────────────────────────────
phase('Lesson review')
const lr = await run('lesson-review', 'Lesson review', 'src/course/lessons/f*.ts and s*.ts, tests/course/lessons-*.test.ts',
`Fresh-eyes review of the 13 lessons (f1–f6, s1–s7) now that the synthetic engine is finished. For EACH lesson:
1) Validate it (src/course/validate.ts, tests) — every scenario/variant/dial/family/finding/real id resolves; fix references to scenarios that ended up with other ids (read src/synth catalogue).
2) Render every synthetic ECG it uses (generate() + python -I _proto/harness/render.py) and check that what the text says is visible on that ECG (marks land on the right waves, criteria values match truth, the "normal" examples are really normal, live dials stay within range).
3) Medical accuracy against docs/curriculum/criteria.md and current guidelines; modern terminology; no copied book text.
4) Language: zh / en / es complete, natural, correct terms (Spain Spanish); consistent with the finding names in src/core/findings.ts.
5) Pedagogy: attempt-first hooks, worked example before practice, checks with good distractors and explanatory feedback.
Fix everything in place. Lesson writers' reports: _proto/reports/lessons-F.json and lessons-S.json. Engine finish reported: ${JSON.stringify(sf)}.`)


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
