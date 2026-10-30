export const meta = {
  name: 'ecg-academy-foundation',
  description: 'Build the synthesizer-independent modules of ECG Academy (viewer, real-case library, 3D heart, figures, app shell) in parallel, each followed by a fresh-eyes review-fix pass',
  phases: [
    { title: 'Build', detail: 'five workstreams, disjoint folders' },
    { title: 'Review-fix', detail: 'fresh-eyes reviewer per workstream' },
  ],
}

const ROOT = args.root
const OLD = 'C:\\Users\\A511741\\Desktop\\Workspace\\Dynamic Electrocardiogram'

const COMMON = `
Project root: ${ROOT} — "ECG Academy", a web app whose single goal is to teach people to read ECGs (medical students). Read first: ${ROOT}\\CLAUDE.md, ${ROOT}\\docs\\PLAN.md, and the frozen contracts: src/core/*.ts (l10n, leads, rng, ecg, findings, regions), src/app/store.ts, src/app/router.ts, src/app/theme.css, src/i18n/index.ts, src/i18n/common.ts (tc), src/ui/index.tsx + ui.css, src/ecg/api.ts, src/real/api.ts, src/heart3d/api.ts, src/figures/api.ts.
Rules:
- Write ONLY the files your workstream owns (listed below). Never edit the frozen contracts or another workstream's folder. If a contract is insufficient, work around it locally and list the needed change in contract_requests.
- Never create, edit or delete anything under ${OLD} (the old project). Reading it is encouraged where noted, and you may copy-adapt its code into your own files.
- Stack: TypeScript strict (TS 7), ESM, Preact 10 + @preact/signals, three r186 only for the 3D heart, Vite 8, Vitest 5. No new dependencies; no network at runtime; no enums (use as-const objects); no Math.random in app logic (src/core/rng.ts).
- Every user-visible string in zh / en / es: UI strings via defineDict in src/i18n/<module>.ts, content text via inline L10n {zh,en,es}. Medical terminology must be correct in all three (Chinese = standard textbook terms; Spanish = Spain usage: "derivación", "aurícula", "onda", "segmento", "bloqueo de rama", "hemibloqueo").
- Theme tokens only (no hard-coded colours) so light and dark both work; light textbook pink paper is the default. Layout stability: any box whose content changes quickly has a fixed size; short animations play once and hold (no flicker loops). Accessible: keyboard operable, aria labels, focus visible.
- localStorage only inside try/catch.
- Tests: Vitest in tests/<module>/ (environment node; mock DOM-free logic; keep rendering code thin over pure, tested functions). Run \`npx vitest run tests/<module>\` and \`npx tsc --noEmit\` from ${ROOT}; fix every error in your own files (errors in other in-progress folders are not yours — report them in notes).
- Quality bar: a production-quality teaching tool. The ECG is the protagonist; clarity beats decoration.`

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

const STREAMS = [
  {
    key: 'ecg-viewer',
    owns: 'src/ecg/** (except api.ts), src/i18n/ecg.ts, tests/ecg/**',
    brief: `Build the ECG viewer — the protagonist of the app — implementing src/ecg/api.ts exactly. src/ecg/index.tsx must export: EcgView (EcgViewProps), Monitor (MonitorProps), and re-export the api types.
Requirements (docs/PLAN.md §6):
- Canvas 2D, devicePixelRatio-aware, ResizeObserver; paper grid at true scale (1 mm minor, 5 mm major; colours from --ecg-* tokens read via getComputedStyle and refreshed when data-theme changes); grid pre-rendered to an offscreen canvas; no animation loop when idle.
- Layouts: '3x4+1' (rows I aVR V1 V4 / II aVL V2 V5 / III aVF V3 V6, 2.5 s columns, + 10 s rhythm strip of props.lead ?? II), '3x4+3' (rhythm strips II, V1, V5), '6x2' (limb column + chest column, full 5 s or record), '12x1', 'single' (one lead, window), 'strip' (one long lead, wraps across rows if long). Cabrera option: limb order aVL, I, −aVR (inverted aVR, labelled −aVR), II, aVF, III. Calibration pulse at the start of each row reflecting the gain (and the chest half-gain when on). Lead labels; small separator ticks between columns as on real 12-lead printouts.
- speed 25/50 mm/s, gain 5/10/20 mm/mV, chestHalfGain; defaults from store.settings.viewer, props override.
- Overlays from ecg.truth when present: wave labels (P, QRS, T, U, and δ/J where flagged), interval brackets (PR, QRS, QT) on the dominant beat, ST markers (J point and J+60 ms with ST deviation read-out in mm and mV). Marks (EcgMark) and highlightLeads drawn with --c-* role colours. Pins for locate answers.
- Tools: calipers (two draggable vertical lines; read-out Δt in ms, small squares, rate in bpm; amplitude mode with horizontal lines in mV and mm; "march out" repeat of the interval), magnifier lens, crosshair read-out (t ms, mV) — read-outs in fixed-size boxes with tabular digits. Built-in compact toolbar (Segmented/Button from src/ui) when toolbar=true.
- Cursor: clicking sets props.cursor (a vertical cursor line drawn across panels at that time); with onPick, clicking reports {lead, tMs, mv} (hit-test which panel/lead was clicked; hover highlights the panel). Keyboard: tools toggles reachable; arrow keys nudge the cursor/calipers.
- Monitor: one sweeping lead like a bedside monitor (erase bar), plays once through the record then holds; play/pause via props.playing; respects reduce-motion (store.settings.reduceMotion).
- Performance: a 10 s 12-lead at 500 Hz must redraw in a few ms; decimate per pixel column (min/max) at low zoom.
You may read and copy-adapt ${OLD}\\src\\ecg\\* (paper.ts, draw.ts, calipers.ts, caliperPlace.ts, zoom.ts, ecg12View.ts, stripView.ts, waveLabels.ts) — rewrite against the new contracts.
Tests (tests/ecg/): layout geometry for every layout (panel rects, time windows), time/voltage ↔ px mapping at each speed/gain, Cabrera order and −aVR inversion, caliper math (ms, squares, bpm), overlay extraction from a truth fixture, pick hit-testing. Build fixtures in tests (e.g. a few Gaussian waves projected consistently on the leads) — do not import src/synth (it does not exist yet).
Also add a dev-only demo component src/ecg/dev/ViewerDemo.tsx (renders a fixture ECG in every layout with tools) that the shell can mount at #/dev/viewer for manual checks.`,
  },
  {
    key: 'real-library',
    owns: 'src/real/** (except api.ts), src/i18n/real.ts, tests/real/**',
    brief: `Build the real-ECG case library on the curated PTB-XL bundle (src/data/real/ptbxl-meta.json + ptbxl-signals.bin; format documented at the top of scripts/data/build-real-bundle.mjs; raw labels in data-raw/ptbxl/scp_statements.csv — read-only). Implement src/real/api.ts; src/real/index.tsx exports: CasesPage, CasePage({ id }), getLibrary(): RealLibrary, loadRealEcg(id): Promise<Ecg>, scpStatements (all SCP codes with zh/en/es names and kind), and the attribution L10n.
- Decoder: import the .bin with Vite '?url' (inlined as a data URL in the single-file build), fetch → ArrayBuffer once, slice per record, DecompressionStream('deflate-raw') → zigzag varint decode → Float32Array mV (quantum 0.005) for I, II, V1–V6; derive III, aVR, aVL, aVF with deriveLimbLeads (src/core/leads.ts). Keep the pure decoding core separate from the browser inflate so tests can use node:zlib inflateRawSync. Cache decoded records (LRU, ~20).
- Ecg for a real case: origin {kind:'real', dataset:'PTB-XL', ecgId}, truth null, regions null.
- SCP → app findings (src/core/findings.ts): a careful, documented mapping table for all 71 SCP codes. Map only when confident; respect PTB-XL semantics (diagnostic likelihood; IMI/ASMI/etc. infarct statements are not necessarily acute — use infarction_stadium to separate acute vs old where possible, else map to 'pathological-q' / old-mi-* conservatively; form statements like LVOLT → low-voltage; rhythm statements SR → sinus-rhythm, AFIB → atrial-fibrillation, PACE → paced-rhythm etc.). Translate every SCP statement description into zh/en/es (medical terminology correct; Spain Spanish).
- CasesPage: browse the 300 cases; filters by category (rhythm, conduction, hypertrophy, infarction, ischaemia/ST-T, other) and by finding; "blind mode" on by default — cards show only age/sex/case number, not the diagnosis, so learners read first; a "random case" button (seeded by date for a 'case of the day').
- CasePage: full 12-lead EcgView (toolbar, calipers on), a "your reading" panel (free-text notes kept in localStorage per case + a short structured checklist: rate, rhythm, axis, PR, QRS, QT/QTc, main findings), a "Reveal" step showing the cardiologist labels (translated, with likelihood), the 12SL reference measurements next to the learner's measurements with the difference, links to atlas pages (#/atlas/<findingId>) for mapped findings, previous/next case navigation, and an attribution footer (PTB-XL: Wagner P, Strodthoff N, et al. Sci Data 2020;7:154; PTB-XL+: Strodthoff N, et al. Sci Data 2023;10:279; Goldberger AL, et al. PhysioNet. Circulation 2000; CC BY 4.0; list the changes made). Leave an optional slot prop/hook so the practice module can later replace the checklist with its structured report form (document it in notes).
- The EcgView component is being built in parallel by another workstream: import { EcgView } from '../ecg/index' and code strictly against src/ecg/api.ts; if src/ecg/index.tsx does not exist yet when you typecheck, create nothing in src/ecg — note it instead.
Tests (tests/real/): decode every record with node:zlib (count = 300, lengths, finite values, Einthoven identities exact), SCP table covers every code present in the meta, finding mapping only produces valid FindingIds, filters, case-of-the-day determinism.`,
  },
  {
    key: 'heart3d',
    owns: 'src/heart3d/** (except api.ts), src/assets/heart.bin, scripts/bake-heart.mjs (or tests/bake/heart.test.ts), src/i18n/heart3d.ts, tests/heart3d/**',
    brief: `Build the small secondary 3D heart implementing src/heart3d/api.ts; src/heart3d/index.tsx exports Heart3D and HEART_CREDIT.
- Bake (Node, no deps): read assets-raw/hra/3d-vh-m-heart.glb (HRA 3D Reference Organ "Heart, Male" v1.3, Visible Human, CC BY 4.0, https://doi.org/10.48539/HBM564.WKNG.249). You may copy-adapt the GLB reader and frame logic from ${OLD}\\src\\sim\\geometry\\hra\\ (glb.ts, heartFrame.ts, parts.ts, mesh.ts) and read ${OLD}\\assets\\models\\README.md. Keep the myocardium (LV, RV, RA, LA) and short stubs of the great vessels for orientation; decimate to ~15–25k triangles (vertex clustering + normal recompute); build a heart frame (long axis apex→base, septum direction); label every vertex with a RegionId from src/core/regions.ts (LV: AHA 17 segments by long-axis third + circumferential sector relative to the septum/anterior; RV free wall basal/mid/apical + outflow tract; RA, LA); place the conduction system as anatomical polylines (SA node at the RA–SVC junction, AV node, His, RBB down the septum to the moderator band, LBB with anterior and posterior fascicles, a sparse Purkinje fan) tagged with conduction RegionIds. Write a compact binary src/assets/heart.bin (quantized positions, uint8 region per vertex, indices, polylines; target ≤ 400 KB) and document the format. Store the credit and the list of changes (CC BY "indicate changes").
- Runtime: <Heart3D> renders into a small canvas with three.js (OrbitControls from three/examples/jsm is allowed — same package), render ON DEMAND only (cursor change, drag, resize) — no continuous loop. Region colour from regions.stateAt(cursorMs): rest = --heart-rest, depolarizing → --c-qrs (atria → --c-atrial) blending by fraction, depolarized = muted magenta, repolarizing → --c-repol fading back to rest; highlights: infarct (dark red), ischemia (red tint), pathway (gold bridge between atrium and ventricle at the region), focus (static ring marker), block (grey); conduction overlay in --c-conduction with the activated part brighter; emphasize = outline/glow; hover labels (localized region names). Colours from theme tokens, updated on theme change. Fallback text if WebGL is unavailable. Dispose GPU resources on unmount.
- Lazy decode of heart.bin (import ?url, fetch once).
Tests (tests/heart3d/): asset decodes, triangle budget, every RegionId has vertices (conduction ids have polylines), state→colour mapping pure function, frame orientation sanity (apex below base in app frame).`,
  },
  {
    key: 'figures',
    owns: 'src/figures/** (except api.ts), src/i18n/figures.ts, tests/figures/**',
    brief: `Build every 2D explainer figure in src/figures/api.ts (FIGURE_IDS) with high teaching quality; src/figures/index.tsx exports Figure (FigureProps) and the api types. Each figure: SVG (or canvas where needed), fixed aspect ratio, tokens only, localized labels and captions, interactive where it teaches (dragging a vector, toggling options), keyboard operable, play-once animations.
- paper: zoomable piece of ECG paper explaining 1 mm = 0.04 s / 0.1 mV, 5 mm = 0.2 s / 0.5 mV, speed and gain toggles that visibly change a sample complex, calibration pulse.
- electrodes: torso front view with RA, LA, RL, LL and V1–V6 at correct landmarks (4th ICS right/left sternal border, V4 5th ICS midclavicular, V5 anterior axillary, V6 mid-axillary at V4 level) + optional V3R/V4R/V7–V9; highlight prop.
- hexaxial: Einthoven triangle and hexaxial wheel (I 0°, II 60°, III 120°, aVF 90°, aVL −30°, aVR −150°), a draggable heart vector whose projection on each limb lead is drawn and shown as a mini QRS deflection per lead (positive/negative/isoelectric); quadrant mode shading normal (−30° to +90°), LAD, RAD, extreme.
- horizontal-plane: transverse chest section with V1–V6 directions, a vector projected on each, R/S progression mini-complexes, transition zone.
- conduction: schematic SA → atria → AV node → His → bundles/fascicles → Purkinje; animates the activation in sync with the cursor when an ECG with truth is given (using truth.beats/atrial timing), block prop shows the site of block.
- laddergram: A / AV / V tiers from ecg.truth (atrial events, conduction, beats, blocked impulses with a bar), aligned to time, cursor line.
- action-potential: ventricular / nodal / atrial action potential with phases 0–4 aligned under a surface ECG beat (QRS ↔ phase 0, ST ↔ phase 2, T ↔ phase 3).
- dipole: a depolarization front along a strip of tissue with electrodes at several positions showing positive / negative / biphasic deflections (play once, replay button).
- axis-calculator: net QRS in I and aVF (inputs or read from an ECG: net area of the dominant QRS) → quadrant and angle on the wheel, with the isoelectric-lead hint.
- rate-ruler: the 300-150-100-75-60-50 sequence overlaid on a strip (from the ECG if given), 1500/small-squares and 6-second methods with the arithmetic shown.
- qtc-calculator: QT and RR (or HR) inputs → Bazett, Fridericia, Framingham, Hodges with the formulas, and interpretation limits (e.g. prolonged > 450 ms men / > 460 ms women; > 500 ms high risk; short < 340–360 ms — cite AHA/ACCF/HRS 2009 and ESC sources in a comment).
- territories: coronary anatomy (LAD with diagonals/septals, LCx with obtuse marginals, RCA with PDA/RV branches) ↔ walls ↔ lead groups; highlight prop; legend.
- decision-tree: interactive step-by-step trees with L10n content in src/figures/trees/*.ts: narrow-tachy (regular/irregular, P waves, RP), wide-tachy (Brugada 1991 steps + Vereckei aVR, AV dissociation, concordance), brady-av-block (PR behaviour, dropped beats, AV dissociation), st-elevation (STEMI vs pericarditis vs early repol vs LVH/LBBB vs Brugada vs aneurysm), bundle-branch (QRS ≥ 120, V1 morphology, I/V6). Content must be medically correct and current — be careful and cite sources in comments.
- vector-loop: frontal and horizontal VCG loops computed from the ECG (inverse Kors transform from I, II, V1–V6; cite Kors 1990 coefficients) with the instantaneous vector at the cursor.
Tests (tests/figures/): projection maths (hexaxial and horizontal), axis-calculator quadrant/angle, QTc formulas against known values, rate-ruler arithmetic, Kors transform shape, laddergram layout from a truth fixture, every tree is a valid DAG whose leaves have zh/en/es text.`,
  },
  {
    key: 'app-shell',
    owns: 'src/main.tsx, src/app/** (except store.ts, router.ts, theme.css), src/i18n/shell.ts, tests/app/**, .claude/launch.json, and TEMPORARY stub files src/course/index.tsx, src/practice/index.tsx, src/atlas/index.tsx, src/tools/index.tsx (each exporting the page names from docs/PLAN.md §12 as a clearly marked STUB placeholder — later workstreams replace them)',
    brief: `Build the application shell. Read docs/PLAN.md §2 and §12.
- src/main.tsx: import './app/theme.css', startPersistence(), startRouter(), render <App/> into #app.
- App/Shell: header (logo + "ECG Academy · 心电图读图学院" via tc('appName'), nav Learn/Practice/Cases/Atlas/Exam/Tools, progress entry, language switch 中文/English/Español, theme toggle), a main outlet that switches on route.value and renders the page components imported from the module index files (src/course, src/practice, src/real, src/atlas, src/tools, src/app); responsive (≤ 760 px: compact header + bottom tab bar), skip-to-content link, focus the page h1 on route change, document.title per page. A dev route #/dev/viewer mounting src/ecg/dev/ViewerDemo.tsx IF it exists (lazy import with a try; it is being built in parallel — do not create it).
- Pages owned here: HomePage (layout v0: hero with the app's promise "learn to read the 12-lead ECG step by step", the learning path overview (stages F, M, R, C, H, I, O, X from PLAN §3 with short localized descriptions), entry cards for Practice / Real cases / Atlas / Exam; leave clearly marked slots for "continue lesson", "reviews due" and "case of the day" that later modules fill), SettingsPage (language, theme, viewer defaults: speed, gain, layout, Cabrera, chest half gain; screen calibration: drag a bank-card outline to match a real card 85.60 mm wide → store pxPerMm; reduce motion; show 3D heart; a placeholder for progress export/import/reset), AboutPage (what the app is; how ECGs are generated — one-source synthetic model vs real PTB-XL recordings; credits and licences: Castellano C, Pérez de Juan MA, Attie F. Electrocardiografía clínica, 2.ª ed. Madrid: Elsevier; 2004 — used as a curriculum reference only; PTB-XL (Wagner et al., Sci Data 2020) and PTB-XL+ (Strodthoff et al., Sci Data 2023), PhysioNet, CC BY 4.0; HRA 3D Reference Organ Heart, Male v1.3, CC BY 4.0; disclaimer: educational, not for clinical decisions), NotFoundPage.
- Visual design: clean, calm textbook look; generous whitespace; ECG pink paper as the signature motif; the header must stay one row at 1366 px in all three languages; fits 1366×768 without horizontal scroll; dark theme via tokens.
- .claude/launch.json: {"version":"0.0.1","configurations":[{"name":"ecg-academy","runtimeExecutable":"npm","runtimeArgs":["run","dev","--","--port","5173","--strictPort"],"port":5173}]}.
Tests (tests/app/): route parsing/href round-trip for every route, page switch covers every route name, i18n dictionaries complete (zh/en/es same keys, no empty strings) for shell and common.`,
  },
]

const results = await pipeline(
  STREAMS,
  (s) =>
    agent(`WORKSTREAM: ${s.key}. You own: ${s.owns}.\nRESUME NOTE: an earlier run of this exact workstream was interrupted by a usage limit; your folders may already contain its partial files (and stray scratch files such as tests/*/zz-scratch.test.ts — delete those). Inspect what exists first, keep what is good, and continue from it rather than restarting.\n${s.brief}\n${COMMON}`, { label: `build ${s.key}`, phase: 'Build', schema: REPORT }),
  (built, s) =>
    agent(
      `You are a fresh-eyes reviewer and fixer for workstream "${s.key}" of ECG Academy. You may edit only: ${s.owns}.
The builder reported: ${JSON.stringify(built)}
The brief they worked from:
${s.brief}
Do this:
1) Read every file the workstream owns. Check it against the brief, docs/PLAN.md and the contracts: missing features, wrong behaviour, contract violations, medical or terminology errors (zh/en/es; Spain Spanish), hard-coded colours, layout instability, accessibility gaps, performance problems (render loops, per-frame allocations), untested logic.
2) Run the workstream's tests and \`npx tsc --noEmit\`.
3) Fix everything you can (add tests for what you fix). Do not rewrite working code for taste.
4) Report what you changed and what remains.
${COMMON}`,
      { label: `review ${s.key}`, phase: 'Review-fix', schema: REPORT },
    ),
)

return STREAMS.map((s, i) => ({ key: s.key, report: results[i] }))
