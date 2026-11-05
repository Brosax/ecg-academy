# Foundations story player — F1–F6

Status: **implemented locally; F1 unified cardiac cycle added, 2026-11-04**. The earlier separate
heartbeat and blood/electrical modes have been replaced by one model and one time state. See
[the unified-cycle review](../review/f1-unified-heart-cycle-2026-11-04.md) for current verification;
earlier reviews remain historical evidence. Local delivery only.

This supersedes the foundation lesson flow proposed in [f-explainers.md](f-explainers.md). That earlier document
remains the design history for the existing shared figure runtime and reusable geometry. The new course layer
does not change the default behavior of figures embedded in other lessons.

## Scope and teaching structure

Only F1–F6 use `FoundationsLessonPlayer`. Other lessons retain the existing player. Heart Lab, the review queue,
asset splitting and new 3D models are outside this change. The original `Lesson`, `Block`, route and
`LessonProgress` contracts remain intact.

Each foundation lesson has five named chapters: **start from zero → explore the mechanism → put it into practice →
a real ECG → what to take away**. The mechanism chapter contains short, manually started segments and immediate
experiments. Original objectives, numeric criteria, source citations, questions and real cases stay in lesson
data; supporting texts and model comparisons are available under “Further reading, values & comparisons”.
Original heart/figure blocks are replaced in the foundation presentation by the new scenes, rather than being
rendered as a second competing animation.

### Starting with no anatomy or ECG knowledge

The first chapter now teaches prerequisites before showing the original question. `basics.ts` contains 22
localized concept pages (F1: 6, F2: 4, F3–F6: 3 each). Each page offers an explanation, a short causal sequence
and one takeaway. F1 starts with the heart as a pump, its four chambers and the blood circuit, then distinguishes
electrical activation/recovery from contraction/relaxation before introducing P, QRS and T. Its four-chamber
functional diagram explicitly uses patient left/right. F2 defines baseline, polarity, electrode, lead, vector
and projection before experiments. F3 introduces potential differences and body labels; F4 defines axes, units
and grid scales; F5 introduces anatomical landmarks; F6 introduces the recording chain and artefacts.

F1's first four introductory pages reuse the existing HRA heart/body geometry in one unified 3D scene.
Myocardium, great vessels, conduction tubes, valve leaflets and blood streams stay present together;
anatomical selections only move the label/camera and emphasis. There is no layer-mode switch. The anatomy
reference remains expandable, with all 14 descriptions, patient-relative orientation and model attribution.

`heartCycle.ts` derives six phase boundaries from a settled normal cycle: P onset, atrial contraction,
QRS onset, aortic opening, aortic closure, mitral reopening and cycle end. One piecewise-continuous map
stretches these intervals for teaching. Captions, engine beat snapshots, activation colour, shared GPU
wall deformation, valve motion and valve-gated flow all sample that same physiological time. Seeking is
reversible and the final frame stays within the current beat. Conduction tubes reuse the Lab's schematic
path timing; this is a teaching animation, not a fluid simulation or patient measurement.

`HeartIntroduction.tsx` caches an independent normal engine with the decoded assets. `HeartIntroView`
reuses the Lab's standalone materials, field textures, displacement, valves and blood-flow components,
without its global store, settings or renderer loop. It displays no ECG. Course ECGs still use `src/synth`:
the introductory view replaces the hook while open, and reviewing basics from the story hides its paused
ECG stage (preserving experiment state), so the two sources are not presented as a synchronized tracing.
The Heart Lab implementation and defaults are unchanged.

The learner manually starts one cycle, with pause/resume, replay, previous phase, six key frames, a single
seek slider, 0.25×–2× playback and 0–100% visual deformation amplitude. Repetition is opt-in. Default 0.5×
playback stretches the full explanation to 20 seconds; each physiological phase has equal teaching time,
not equal real duration. Amplitude scales all attached layers equally and does not represent cardiac function.
Reduced-motion mode keeps all phase controls and seeking available without continuous playback. Blurring,
changing concepts or touching the timeline pauses. Original clock defaults for other stories are unchanged.

Desktop pairs the model and narration/controls; narrow screens stack them in reasoning order. Translated
phase headings and captions reserve the tallest text so switching phases does not shift the controls. The
introductory body context, optional anterior cutaway, rotation/zoom/reset and keyboard equivalents remain.
GPU failure retains anatomy descriptions and a retry control. The view releases its GPU resources on exit.

`FoundationsBasics.tsx` shows one concept at a time, with named navigation, previous/next buttons and an explicit
skip. Finishing or skipping exposes the original hook without changing its block index. Reading pages are local
view state, not new persisted steps: reopening the chapter begins with its first concept. The chapter id remains
`question`, preserving route/progress mappings; its public title is “Start from zero”.

`explanations.ts` provides detailed causal narration for every story segment. It is open when entering a segment.
Starting playback closes the reading panel; reopening it pauses playback. Learners entering a story directly
can open the same introductory pages without unmounting the experiment or losing its attempt state. Introductory
and experimental answer content is not added to AI context, which still uses public chapter descriptions only.
The original concise captions remain alongside the diagram. Course titles and reading-time estimates now match
the beginner path. F2 objectives, support caption and summary distinguish an instantaneous zero projection from
a biphasic waveform over time; the original questions and answer-record identities remain in place.

The stage uses a local dark palette and existing atrial, QRS, repolarization and vector colors. Geometry, trace,
narration and transport belong to one stage. Responsive layouts place the visual parts in reading order on
small screens; the desktop composition is not scaled down as one image. A reference 12-lead ECG is available
on demand. It is labeled as a reference and is not represented as the live output of every experimental setting.
All scene titles, instructions and feedback have Chinese, English and Spanish strings. There is no audio,
prerendered video, new animation dependency or external runtime asset.

## Six implemented stories

| Lesson | Continuous explanation | Learner operation and feedback |
|---|---|---|
| F1 · Conduction and waves | Five segments: atrial excitation/P, AV delay/PR, ventricular activation/QRS, recovery/T, intrinsic clocks. Heart regions and the II trace share model fiducials. | Select structures or wave regions to locate the corresponding event in both views. Predict the interval affected by AV delay, then adjust PR from 120–200 ms through the engine. Later segments introduce cellular action potential and intrinsic rates. |
| F2 · Vectors and polarity | Six segments: one resultant arrow, lead direction and projection, pen/trace, biphasic waveform, multiple limb leads, staged QRS vectors. | Rotate the arrow for positive, negative or near-zero projection; compare a momentary zero with the complete changing vector loop. Inspect several leads derived from the same schematic source. |
| F3 · Lead systems | Five segments: an electrode pair, Einthoven identity, triangle-to-axis translation, augmented/Wilson references, chest viewpoints. | Predict electrode-pair direction and the I + III sum, choose a frontal axis and reference, then compare chest viewpoints. Formulas appear with the construction they explain. |
| F4 · Paper and calibration | Four segments: speed, gain, calibration pulse and rate measurement. The same source samples remain fixed while their paper coordinates change. | Predict before changing one parameter; compare 25/50 mm/s or 10/20 mm/mV with a fixed reference. Identify the 1 mV, 200 ms pulse dimensions and verify that the measured rate is unchanged. |
| F5 · Placement | Four segments: chest landmarks, guided placement, independent V1–V6 placement, site error versus cable error. The 2D chest reveals landmarks and horizontal relations in stages. | Drag an electrode or select it and choose a site. Check all six placements; feedback marks actual and intended sites. Arbitrary placements receive position feedback only, without invented ECGs. |
| F6 · Connections and artifact | Four segments: observe a reversed lead, repair the connection, locate an electrode-noise source, then explore recording changes. | Predict the RA/LA swap effect, exchange two cables, identify the noise source from affected leads, then vary hookup or noise. Current and original traces compare the same cardiac source. |

The original practice and real-case chapters provide transfer checks after the explanatory stories. Original
content indices are passed to `BlockView`, so answer-record identifiers are not renumbered by the chapter layout.

## Runtime and interaction contract

The implementation lives in `src/course/foundations/`:

- `FoundationsLessonPlayer.tsx` adapts old lesson data to chapters and renders retained content.
- `presentation.ts` owns chapter membership and shared presentation progress.
- `StoryTheatre.tsx`, `clock.ts` and `types.ts` own segment selection, clock, attempts, transport and the scene contract.
- `F1Scene.tsx`–`F6Scene.tsx` and their pure math modules own each explanation and experiment.
- `visuals.tsx` and scoped styles provide the shared dark stage and responsive SVG primitives.

A `StoryStep` supplies an id, localized title/narration/task and duration. A scene receives the current segment,
normalized progress, attempt state and optional ECG source. It reports manipulation and an attempt result plus
localized explanation; it does not create its own autoplay loop.

Segments normally last 5–8 seconds. Entry is stationary; play starts or continues the current segment, which
stops at its end. Pause, replay, previous segment, next segment and one seek slider are available. Manipulating
the diagram or timeline pauses playback. Losing window focus, hiding the document, changing the segment or
leaving the chapter stops the clock. **One attempt unlocks the next segment**, regardless of whether the attempt
was correct or the explanation has played to its end. Submission pauses at the result keyframe. Incorrect
attempts explain the relationship and permit retry or continuation. Returning to a tried segment preserves its
unlocked state while clearing transient answer feedback, so reset experiment controls do not display a stale result.
The mechanism chapter's continue action becomes available after all its segments have been attempted.

Reduced motion uses the completed keyframe while retaining experiments and explanations. Native buttons and
range controls, keyboard handlers for selectable SVG objects, and placement alternatives to dragging are
implemented. Actual mouse, touch and keyboard behavior at the acceptance widths is recorded separately in the
browser review, rather than inferred from the presence of these handlers.

## Time and source correctness

Teaching time is a normalized segment clock, not an ECG timestamp. Each scene maps that clock to its source or
geometry once, and derives its linked outputs from the same resulting state.

- **F1:** `f1.math.ts` maps segment progress to the selected beat's P/QRS/T fiducials. Structure and trace selection
  resolve to the same physiological moment. PR changes request a new seeded model ECG at the course layer; no
  waveform is interpolated between parameter states. The cellular action-potential inset is labeled schematic.
- **F2:** a schematic vector source drives the arrow, projections and accumulated trace together. Limb leads use
  the lead-system algebra, including the augmented-lead scale. A perpendicular instant is distinct from a whole
  positive/negative deflection. The pedagogical vector tracing is labeled as a schematic, not a patient ECG.
- **F3:** limb views and sums use the supplied model source. The horizontal-plane demonstration uses one shared,
  explicitly schematic source loop for the different chest viewpoints.
- **F4:** time-to-distance and voltage-to-height transforms use speed and gain. The samples and source RR do not
  change; a calibration pulse and fixed-scale reference make the changed paper dimensions visible.
- **F5:** grading uses anatomical target positions. The free placement exercise does not imply the engine can
  simulate arbitrary electrode locations; original validated model comparisons remain supporting course content.
- **F6:** electrode potentials are recovered from the same supplied source and recombined for hookup changes.
  Noise enters an electrode and propagates through the lead equations. Before/after records share the underlying
  cardiac signal; no independent lead-by-lead ECG drawing or cross-state waveform morph is introduced.

## Links, progress and assistant context

Chapter membership is computed from the unchanged original block kinds:

| Chapter | Original block kinds |
|---|---|
| Question | `hook` |
| Mechanism | All remaining kinds not assigned below |
| Practice | `check`, `drill` |
| Real ECG | `real` |
| Take-away | `pitfalls`, `summary` |

Every original one-based step belongs to exactly one chapter; the first member is the chapter's representative
link. Old numeric deep links therefore still resolve. Out-of-range coordinates use the existing clamp behavior.
Retained content is rendered with its original index, and original mechanism steps resolve into the story
chapter. No millisecond position or experiment state is persisted: reopening a story begins at its first segment.
The stored resume coordinate remains the old block coordinate. `foundationEntryStep` maps a resume entry to its
chapter's first step and canonicalizes the route; an explicit old content link still identifies its original item
within that chapter. Completed lessons reopen at the question chapter without clearing their completion flag.

Progress writes continue through the existing visit/finish functions. Existing `done` state remains authoritative,
and the storage/import/export schema is unchanged. The player, home resume card and course map share
`presentationProgress`, so chapter labels and fractions use one mapping rather than three independent conversions.
This is an adapter, not a migration that rewrites prior learning records.

For foundations, assistant context uses the public current chapter title and safe concept description from the
same mapping. Current experiment answers, practice choices, case labels and hidden measurements are not supplied.
Nonfoundation assistant context follows its previous path.

## Local delivery and acceptance evidence

This delivery is a locally runnable application and local build; it does not publish or merge automatically.
Implementation includes pure checks for experiment grading, projection and electrode relationships, paper
scaling, fiducial mapping, clock gates and chapter coverage. The final commands, results and any remaining
limitations must be taken from [the acceptance record](../review/foundations-redesign-2026-11-03.md).

Recorded acceptance includes all six stories (28 segments), original practice entry and each lesson's first real
case, mouse/keyboard and reduced-motion samples, playback/seek/early-submit behavior, progress import/export,
home resume, completed-course reopening and the original S1 player. Automated checks cover all legacy step
mappings and public assistant context; no live AI network request was made. The first-segment layout matrix
covers Chinese/English/Spanish at 1366×768, 390×844 and 320×844, with 54 measurements and no horizontal overflow.

This is not an exhaustive segment × language × size test. Pointer Events support touch, but no physical
touchscreen was tested; focus/hidden-document pause is implemented but was not independently exercised by a
manual event test. F2 submission-height measurements establish stability for that sample, not every animated
frame. The review records these limits and the final focused test/build rerun separately. The older plan's
baseline screenshots and build results are not used as acceptance evidence for this redesign.
