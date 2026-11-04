# Learn by doing: decision trail (2026-11-04)

The user's goal: the whole course teaches through animations and small experiments the learner can run, with short,
plain explanations. Branch `worktree-learn-by-animation`, from `cb26b61`. The uncommitted Foundations redesign in the
main checkout is not part of this work; F1–F6 stay as committed.

## Baseline (measured at cb26b61)

Measured with `tests/course/lesson-audit.test.ts`.

| Stage | Lessons | Text blocks, zh chars per lesson | Longest caption, zh | live | heart | figure |
|---|---|---|---|---|---|---|
| F | 6 | 0 | 95 | 2 | 1 | 10 |
| S | 7 | 401 | 210 | 6 | 1 | 6 |
| R | 8 | 357 | 244 | 3 | 9 | 7 |
| T | 7 | 951 | 217 | 2 | 2 | 2 |
| I | 11 | 531 | 279 | 2 | 8 | 1 |
| H | 9 | 709 | 331 | 3 | 7 | 0 |
| O | 12 | 735 | 219 | 2 | 2 | 0 |
| X | 4 | 1047 | 262 | 0 | 0 | 0 |

The engine exposes few dials per scenario: of 130 scenarios, 71 offer only `rate` and 31 offer none. No scenario offers `stage`, `site`,
`voltage` or `noise` as a dial. So experiments cannot rely on sliders alone.

## Decisions

| # | Decision | Why | Evidence |
|---|---|---|---|
| 1 | Gate S–X with limits anchored on F (text ≤ 200 zh, captions ≤ 120, notes ≤ 80, ≥ 3 media, ≥ 1 that plays). | F already reads the way the user wants; its numbers are measured, not invented. | Baseline table. |
| 2 | Freeze every criteria item (408 in 64 lessons) in `criteria-baseline.json`; the gate checks each word for word. | Cutting prose is where reading rules get lost. | `learn-by-doing.test.ts`, "criteria survive verbatim". |
| 3 | Add `live.play` (one-shot dial sweep with notes and an optional prediction). | Dials exist for rate, PR, QRS, QTc, ST, axis, flutter ratio, AF response; a sweep turns a slider into an animation. | Synth runs in about 25 ms per 10-s 12-lead, so 24 frames at 160 ms are smooth. |
| 4 | Add `film` (2–6 engine states in one place). | Most conditions have no continuous dial; separate scenarios, variants and recording overrides still keep the one-source rule. | `scenarios()` reference. |
| 5 | Reuse `Predict` from the scenes and `Reserve` for layout-stable notes. | One commit-before-reveal control in the app; notes keep their box size. | `src/course/blocks.tsx`. |
| 6 | The assistant gets a film's title and caption only. | A prediction's answer is like a hook's reveal. | `src/assistant/context.ts`. |
| 7 | s2 converted by hand as the template; the other 57 lessons go to one subagent per stage, each in its own worktree, touching only its stage's lesson files and its line of `PENDING`. | Lesson files are disjoint; the gate and stage tests check each delegate's work. | `docs/design/learn-by-doing.md`. |
| 8 | Stage S first as a pilot; the other six stages only after its diff and tests were checked. | A flaw in the brief then costs one rerun, not seven. | The pilot needed no change to the recipe; its three lessons learned went into every later brief. |
| 9 | Every number in a note must be proven by a truth assertion in the stage test. | The s2 note at 102–110/min was wrong by arithmetic and caught only by hand; the S5 notes said +30° while the read-out showed +50°. | `tests/course/lessons-s.test.ts`. |
| 10 | Launch R, T, I, H, O, X before the S review returned, with the reviewer's checklist in every brief. | Writers take about 30 minutes each; a reviewer reads every stage afterwards anyway. | `brief-common.md` in the session scratchpad. |
| 11 | Hide a live note when the learner moves any other dial (`liveNote`), instead of a writing rule. | The S review found a note that stayed on screen with a false value after the second dial moved; a structure makes the stale state impossible. | 099b79b, `tests/course/live.test.ts`. |
| 12 | Send the review's general findings to the six running writers and fix S in a fresh agent with the reviewer's list and the coordinator's decision per item. | The same mistakes would repeat in every stage. | `s-review-fixes.md` in the session scratchpad. |
| 14 | Hide a live or film caption until the learner has predicted; the title rule goes into the how-to. | The X review found three predictions answered by the caption under the prediction box and three by the film title. Hiding the caption is a structure; titles are the step heading and must be written not to tell. | 5405115; the caption keeps its space, so the block height stays 280 px across the reveal (measured on s2). |
| 15 | Put a film's question, frame chips and note above the tracing. | t5's four-mimics film uses a 12x1 layout 1046 px tall, which pushed the chips and the note below a 768 px window. | 816cac3; measured on t5: question at 519 px, chips 589, note 627, tracing 678. |
| 16 | Keep the s7 notch framing after the re-check. | The measured II waveform returns to the baseline 28 ms before the J mark, then rises to a separate 0.35 mV hump: a real J wave. The re-check's valid points (the test must prove a separate hump; a ≥ 2 mm inferior notch is a higher-risk feature; s6 calls the J-point value a "notch") go to a fix agent. | `s-residual-fixes.md` in the session scratchpad. |
| 17 | Allow a note to quote a formula result when it works the arithmetic from on-screen values. | s4's Bazett note does exactly that and teaches the formula; the re-check asked for a conscious sign-off. | `docs/design/learn-by-doing.md`. |
| 18 | Before a prediction is revealed, show only the bare tracing and numbered chips: hide notes, marks, highlighted leads, frame labels and the caption. | The H review found five answers on screen before the reveal (a live note naming 500 ms, a QRS 140 ms bracket, V4–V5 highlighted, two telling chips). A structure ends the whole class; writers only have to keep titles neutral. | d230776; chip row 305 px before and after the reveal on h3. |
| 13 | Rewrite the s7 early repolarisation sweep to teach the notch peak (Jp), not the ST at the J mark. | The engine draws a terminal notch of about 3.5 mm in II and 3 mm in aVF at every ST value, so by Macfarlane 2015 the pattern is present from the first frame; the old notes contradicted the block's own caption. Changing the engine was out of scope. | 2c16605; `jPeak()` in `tests/course/lessons-s.test.ts`. |

## Units

| Unit | Commit | Check | Verdict |
|---|---|---|---|
| Gate, criteria baseline, `live.play`, `film`, validator rules, unit tests | 555b82a | course + assistant tests: 1150 passed, 58 expected fail; typecheck clean | VERIFIED |
| s2 | b5a8ab4, 46dc7fe | gate, `lessons-s`, typecheck; browser: rate sweep 60 → 100 holds at 100/min with RR 611 ms and the "3 large squares" note; film steps regular → sinus arrhythmia → AF and holds; 375 px wide: no horizontal overflow | VERIFIED |
| s1, s3–s7 (pilot subagent) | 1a936dd … a841d25 | merged fast-forward; course + assistant tests 1173 passed, 51 expected fail; typecheck clean; browser: s4 Bazett sweep ends at 100/min with "higher than true" marked right, s6 four-frame filter film loads without placeholders | NOT VERIFIED: the review found 5 blocking content errors (numbers not on screen, a stale note, a knowledge-quiz prediction, an early-repolarization boundary off by 0.02 mV, overstated P-wave claims), 6 wording errors, 7 loose tolerances, 3 lost reading rules; fix round running |
| x1–x4 (stage X subagent) | cb53709 … e29bbaa, merged a5140c9 | gate + `lessons-x` + validator: 265 passed, 47 expected fail; typecheck clean; browser: x3 triage film plays five frames and holds, each note gives the bin and the first action | NOT VERIFIED: review found FIX in all four (a dial named for the wrong lead, an overstated mechanism, six predictions given away by title or caption, two claims about real ECGs beyond their labels, a lost STEMI-equivalent list, missing first actions for unstable AF and VF, unasserted numbers); fix round running |
| r1–r8 (stage R subagent) | 2bc1fbf … a0135b1, merged c9ce0b1 | gate + `lessons-r` + i18n: 264 passed, 39 expected fail; typecheck clean; browser: r4 AV-block film plays first degree → Mobitz I → Mobitz II → 3:1 → complete and holds | NOT VERIFIED: review passed r3 and r8, FIX in r1, r2, r4–r7 (an RBBB test that included an LBBB tracing, unproven mark indices, broad S asserted by depth only, AIVR wording wrong in en/es, a "one RBBB" film over two seeds); fix round running |
| S review fixes (fresh subagent) | a9bae3c … 630cbe7, merged d9a0497; 2c16605 | all fix-list items handled, numbers changed to match the engine where the list disagreed (s3 P shrinks 1.3×, s6 1.9–3.3 mm, s4 RR 603 ms); S tests 178 passed, typecheck clean | re-check: every item landed; the coordinator's s7 rewrite needs a stronger test, the higher-risk note and consistent wording in s6/s7; residual fix round running |
| h1–h9 (stage H subagent) | 8401a7a … 8c557f7, merged b465450 | gate + `lessons-h` + i18n: 280 passed, 30 expected fail; typecheck clean; browser: h4 `moving-paper` starts at 25 mm/s and 5 mm/mV with the 0.2 mV small-square read-out | NOT VERIFIED: review passed h1 and h2, FIX in h3–h9 (the h4 moving-paper scene marks 800 ms for an 80/min tracing, an LQT1 T described as LQT3's, "not early repolarisation" on a heart that has it, three recall questions, a lost Bazett slow-rate rule); fix round running |
| t1–t7 (stage T subagent) | 28c99cf … c727391, merged 7a2132d | gate + `lessons-t` + i18n: 261 passed, 23 expected fail; typecheck clean; browser: t5 four-mimics film plays, caption hidden before the reveal | NOT VERIFIED: review found FIX in all seven (t7 dropped ESC 2022 first-line cardioversion for stable VT, a qRS vs qRs morphology that flips the VT algorithm, the AVRT heart lighting the right atrium first against a left pathway, a concealed pathway called WPW syndrome, unasserted claims); fix round running |
| i1–i11 (stage I subagent) | d7686c1 … d7c41e6, merged e627fcc | gate + `lessons-i` + i18n: 326 passed, 12 expected fail; typecheck clean; browser: i9 timeline film plays minutes → hours → 1 day → weeks; frame 4 note says "the same as the opening tracing" although it is another seed | NOT VERIFIED: review passed i6, FIX in the other ten ("six ST elevations" over a hyperkalaemia frame with none, "Anterior" used for the criteria's Anteroseptal, a management-quiz prediction, the zh "same as the opening tracing" overclaim, loose 1 mm tolerances, Spanish "unos 1 mm"); all thresholds match UDMI 2018 / ESC 2023; fix round running |
| o1–o12 (stage O subagent) | 76402fa … 5e26a3c, merged eda43d8 | the PENDING list is empty and deleted; the gate is strict for all 58 S–X lessons: 332 passed; typecheck clean | NOT VERIFIED: review passed o1–o4 and o12, FIX in o5–o11 (a CRT frame highlighting a V1 the criteria read as LV capture loss, a marked answer contradicting its note, two scenarios shown as one heart, a knowledge-quiz prediction, a lost RV-capture-loss rule, Spanish term drift); fix round running |

## Stopped 2026-11-04 (usage limit)

- Full suite at eda43d8: 4884 passed, 1 failed (`tests/course/heart-block.test.ts` > every heart block in the course > six-phase timeline; likely a heart block added by a stage writer), 9 skipped. Not fixed.
- Stopped mid-run, branches kept: R fix (worktree-agent-a84ea4df4403eddf7), S residual fix (…a8196621ee72a67fd), X fix (…a1c4b60b7fc6f73ef), H fix (…a05d267f80e79e948). Their fix lists are in the session scratchpad. Reviews of T, I and O were stopped before reporting.
- Content still NOT VERIFIED for R, T, I, H, O, X: each stage passes the gate and its tests, but reviews found (or would need to check) medical and wording errors listed above.

## Resumed 2026-11-04

- Heart-block test fixed (8e1add2): t1's AVRT heart has a retrograde P′, so the six heart phases cannot compile; HeartBlock already falls back to following the cursor, and the test now checks that fallback. Browser: t1 step 7 renders the heart and the ECG with no console error.
- Of the four stopped fix branches only X1 had a commit (f698877); merged as d9fe209. Fresh fix agents for R, S (residual), H and X2–X4 and reviews of T, I and O started from d9fe209; fix agents now commit each lesson as soon as it passes.
- X2–X4 review fixes merged (efa0d75, 8a0cdf2, 852566c → 67459a5): every list item done; x4's axis is now asserted with the figure's own exported steps (−62.3°). The coordinator replaced a test that regex-matched ProgressPage.tsx source with a pure `overconfident()` in mastery.ts. X tests 220 passed; practice tests pass. X: VERIFIED against its review.
- R review fixes merged (d3f3ac7 … ab8b3f5 → afedf12): every list item done; notes changed to the measured values where they disagreed (r1 first PP 906–917 ms, not 920); mark indices proven beat by beat; the r6 RBBB loop no longer includes the LBBB tracing, whose V1 is rS once measured to the end of its S; broad S is now asserted by duration (sMs). R tests 305 passed. R: VERIFIED against its review.
- H review fixes merged (6c9943d … 3ca81f3 → 1fbff2b): every list item done; h4's moving-paper scene now gets the same heart at 75/min so its own 800 ms answer is true, and the caption describes its tour (browser: scene text shows 800 ms and 75/min); h7's LQT1/LQT3 notes match the measured T shapes and the Bazett slow-rate rule is back as a pitfall (Bazett 486 vs Fridericia 500 at 50/min); h8 no longer denies early repolarisation on a heart that has it. H tests 312 passed. H: VERIFIED against its review.
- S residual fixes merged (0866aa9 … 5ff2eb2 → 48bb6cb): s7's test now proves a separate hump (II dip +0.003 mV then a 0.33 mV peak; the same check rejects the athlete and a normal tracing); the caption names the higher-risk features (notch > 2 mm, inferior, horizontal ST) as relevant only with symptoms or family history; s6 now says "ST at the J point". Deviation accepted: the athlete hook's hump follows an S wave (an RSr′, not a notch), so it is described as 1–1.5 mm J-point elevation per the 2017 athlete criteria. Engine note for later: the athlete scenario draws an unnamed 2.5–3.8 mm terminal r′ in II, aVF, V5 and V6. S tests 286 passed. S: VERIFIED against its reviews.
- O review fixes merged (40f5e60 … 4b9d239 → 6677a50): every list item done; o7 went further and removed a V1 claim the tracing contradicts (V1 measures about +1 mm, not flat); o8's second scenario is now labelled "Another patient, pacing stopped" (one-scenario rebuild impossible without engine changes); o11 gains the CRT pitfall (a negative V1 alone does not prove LV capture loss) and the lost RV-capture-loss criteria item, and the one-in-three capture failure is asserted from the drawn signal. O tests 332 passed. O: VERIFIED against its review.
- T review fixes merged (64caef8 … 45688c5 → 3829404): every list item done. The fixer rejected one coordinator premise with evidence: marks.ts capitalises a wave at ≥ 0.5 mV or ≥ half the largest wave, not at S ≥ R; V6 measures R/S 2.0, so the note now says "small q, tall R, smaller S (R/S > 1)" and asserts the ratio. t7 restores ESC 2022 first-line cardioversion for stable VT. The coordinator corrected the t6 hook to the measured QT 565 ms / QTc about 570 (was 580 / 570–590). T tests 302 passed. T: VERIFIED against its review.
- I review fixes merged (1a84aed … 73a505c → 344641e): every list item done; i11's hyperkalaemia frame is asserted to have J < 0.05 mV in every lead and the film is now "six tracings that can pass for an occlusion"; i3 uses the criteria's "Anteroseptal"; every "about 1 mm" is asserted to 0.075–0.125 mV. I tests 338 passed. I: VERIFIED against its review.

## Final verification (8c40ef7)

Predicate from Phase A, checked on the real product:

| Predicate | Result | Evidence |
|---|---|---|
| Text blocks ≤ 200 zh per S–X lesson | Met. S, R, I, H, O: 0 zh per lesson (was 357–735). T: 12 (one drill instruction an older test needs). X: 46 (one 184-char overview in x2). | `lesson-audit.test.ts` → `audit-after.json` |
| Captions ≤ 120 zh, notes ≤ 80 zh, ≥ 3 media, ≥ 1 that plays | Met for all 58 S–X lessons. | `learn-by-doing.test.ts`, strict, no PENDING |
| Criteria survive word for word | Met: all 408 baseline items; new items only appended. | `learn-by-doing.test.ts` |
| Every note number proven by truth | Met where the reviews checked; each stage was reviewed and its findings fixed. | stage tests |
| Tests and typecheck | Full suite 4895 passed, 9 skipped, 0 failed; typecheck clean. | `npx vitest run`, `tsc --noEmit` |
| Build | Single-file `dist/index.html`, 12320 KB. | `npm run build` |
| Browser walk per stage | s2, r4, t5, i9, h3, o1, x3: chips, notes and caption hidden before the reveal, shown after, no placeholder, no console error. | dev server, 2026-11-04 |

Blocks in S–X after the run: 94 films, 30 live, 42 heart, 28 figures (F adds 2 live, 1 heart and 10 figures).

Open, not done in this run:

- The engine draws an unnamed 2.5–3.8 mm terminal r′ in the athlete scenario (II, aVF, V5, V6); the CRT scenario draws no dominant R in V1; the AVRT heart lights the right atrium first for a left pathway. Lessons now say only what is drawn; the engine is unchanged.
- No second review pass after the fix rounds; each fix agent reported item by item and the stage tests pass, but no independent reader re-read the fixed text. (Done below.)
- Not tested on a physical touch screen.

## Second review (from c69f5a4)

The user asked for the fixed text to be read again before a PR.

- Closure audit first: every lesson on a first-round fix list has a fix commit; lessons with none (s2, r3, h1, o1–o4, o12) passed round one. Only docs changed after the last full run (344641e).
- Eight independent judges (opus, read-only), one per stage and two for I. Each read whole lessons first, then the fix commits, then checked the first-round list for closure. Lessons that passed round one were not re-read.
- Findings: 4 BLOCK (h9 pitfall made PR ≥ 400 ms a pacing indication; t6 film title named the prediction's answer; o8 only the right option carried a reason; s7 prediction needed the notch rule taught later), about 200 FIX and NIT. Closure: every first-round item resolved; 4 resolutions introduced a new problem (s7 athlete notch claim dropped instead of measured, s6 "Smith rule" claim wider than its assertion, x3 Wellens act-now against the lesson's own "Review today" card, x3 mark label left with the shape the note lost). Most findings are older text the first round did not reach (worked steps, contrast captions, hook reveals): numbers without an assertion or with a looser tolerance than the words.
- Two classes moved into structure instead of 100 edits:
  - Prediction order (e3ae75d). 68 of 99 predictions had the answer first and the player showed options as written. `optionOrder()` shuffles them with a seed from the English question; `ordered: true` keeps a scale as written. Course-wide share of answers at the first chip is now tested ≤ 50 %.
  - Mark beats (930d4da). Default auto marks go to the dominant beat, which put r1's pause bracket on a normal cycle and r5's P′ mark on a sinus P. `mark-beats.test.ts` requires an explicit `beat` on strips with mixed kinds, aberrant beats or RR varying over 15 %; 72 marks in 20 lessons were flagged (o11 had pacing-spike marks resolving to sinus beats, which no judge saw).
- The recurring decisions became rules in the recipe: a tolerance table for every number in a lesson's text, "flat" = |x| ≤ 0.05 mV, "same heart" only for the same scenario and seed, predictions answered from the tracing, real-case claims tables, frozen items reported not patched.
- Coordinator decisions per item are in the session scratchpad (`fix2-decisions.md`). Wellens stays "act now" (critical LAD stenosis; the triage drill grades it critical), with the item relabelled "STEMI equivalents and other act-now patterns" and new LBBB or RBBB with ongoing ischaemic symptoms added (ESC 2023 ACS). ESC 2023 itself files a pain-free Wellens patient as high-risk NSTE-ACS (angiography within 24 h), so this is a teaching choice.
- Frozen criteria items the judges think wrong (not edited, for the user): o10 "the augmented lead named after it is the worst" (it is as noisy as the two limb leads that share the electrode, not more); i7 terminal QRS distortion item lacks "no S wave"; t7 arrest item reads as self-contradictory; o9 Spanish electrode labels AI/AD read as aurícula; h3 "R aVR ≥ 5 mm" has a zh-only clause ("when the outflow tract is involved"). Fixers added: i10 "in paced rhythm V4–V6 may also count" (unsourced); r1 "< 50/min clinically significant" (the 2018 guideline only defines bradycardia there); r5 PAC "differs in shape" (the blocked-PAC tracing's P′ is sinus-like); o9 "upright P in aVR" (the engine draws it below 0.05 mV); x1 "3–4 mm in V2–V4" example (the worked V4 is 2.2 mm).

### Fix round (930d4da → eea5502)

- First attempt: all eight fixers stopped on a network error (ENOTFOUND) before any commit; restarted on fresh branches (`lbd3-*`) from 930d4da.
- Merged: H (dfc8beb), I1–I6 (d1ed237), X (6c4f7d5), I7–I11 (e410be4, lessons-i.test.ts merged without conflict), O (983a880), R (dbb5c3d), S (8546b86), T (6a91d8c). Every BLOCK, FIX and NIT handled or reported; per-stage reports name the measured values. Notable:
  - Text corrected to the engine where the judge only asked for a tighter bound: h3 biventricular (all six numbers wrong: axis +96°, Peguero 52 mm, not +97° / 40 mm); o8 apical HCM (about 18–20 mm, not 10–13); r8 blocked PAC (the sinus node resets: next P at +915 ms, not "on time"); t3 hidden F (73 ms before the next QRS, not on the T); i8 hook (V2 inverted, V3 up then down).
  - Predictions answered from the tracing, not a card: h2, h6, h7, h9, i6, i8, i9, i11, s7, t6 rewritten, each answer asserted. 22 of 100 predictions are `ordered` scales; the other 78 are shuffled by the player.
  - The P′ films of t1 and t4 moved from a II strip to the 12-lead sheet: II has no P′ hump on those seeds; I and aVL do (0.063–0.080 mV).
  - x3: Wellens stays act-now with its reason; BBB with ongoing ischaemic symptoms added "new or known" (ESC 2023 treats BBB with ongoing ischaemia like STEMI regardless of age; from the fixer's and the coordinator's recall, not re-checked against the text). x1 step 10 gives the ESC 2023 reperfusion timing.
- Coordinator follow-ups after the merges:
  - h2 heart caption: the R grows in V6 and aVL; V5 falls on this seed (5b37ce7). i9 Q in II "nearly 5 mm" (194fbd7: 4.751 mm sat 0.0001 mV inside "about 5"). t4 high risk read on the shortest RR between two wide beats, 238 ms (5cbaa74: the 210 ms one started on a narrow beat). r3 RR about 890 → 840 (118b999).
  - Marks that drew nothing (17338c3): a mark without `lead` defaulted to II even on a V5 or V2 strip, and the viewer only draws a mark on panels of its lead; about 30 marks in r6, t1, t6, h4, h9, o2, o3 and o12 were invisible. `resolveMarks` now uses the shown lead in one-lead views; `mark-beats.test.ts` also fails a mark that draws nothing or lands off the shown lead. The newly visible labels were read against their notes (o12 QT 405, RR 346–1095; o3 PR 190, QT 353; t6 QT 565; h4 RR 572): all agree.
  - AF f-wave labels (eea5502): one "f" per wavelet put about 290 labels on o3's 10 s strip and hid the tracing (seen in the browser). AF now gets at most 8 labels, 600 ms apart, in the gaps between beats; flutter keeps one per F wave.
- Last checks (44ce39c): the 22 `ordered` predictions are all real scales written in scale order (read one by one); F's strip marks agree with their notes and F joins the marks-draw gate; Spanish lessons now all say "tromboembolismo pulmonar", as the catalogue, atlas, findings and lab already did (the O fixer had moved o6 and o8 to "tromboembolia"; r1, t1 and t7 used it before). Touched stages, i18n and the gates pass (569 tests).
- Verified at eea5502: full suite 5108 passed, 9 skipped, 0 failed; typecheck clean; build one `dist/index.html`, 12327 KB; no console error on the pages walked.
- Not done at that point: no third independent read of the second-round fixes (done below); the browser check covered t4 (shuffled options, 12-lead P′ marks in I), o12 (labels hidden before the reveal, V2 marks drawn) and o3 (f labels), not every changed block.

## Third read: the second round's diff (from 930d4da)

The user asked for the second round's edits to be read before a PR.

- Nine judges (opus, read-only): one per stage, two for I, one for the engine and gate code. Each read `git diff 930d4da HEAD` for its files, judged every hunk in context and searched the lesson for the claim it replaced. Findings and the coordinator's decision per item: session scratchpad, `rejudge3-findings.md`.
- About 90 findings, 3 BLOCK: s4's Bazett prediction answered by the hook reveal; h2's prediction answered by the heart block placed above it (same LVH tracing on the 12-lead sheet, caption naming V6); t6's answer option naming "artefact" in zh. The commonest FIX was a rewritten prediction that a card, caption or earlier block still answers (o8, r4, r6, t2, t5, t6, i6, i8). One medicine error predated the rounds: t4 tied "WPW syndrome" to the rhythm of one tracing (it is pre-excitation plus documented tachycardia or symptoms, ACC/AHA/HRS 2015). x2 had dropped "non-specific" from 12899's STD_ label and paired it with an elevation the labels never name.
- Engine and gate (2807d3d): the marks gate only checked that a mark resolved, not that the viewer shows it; o7's V3 R marks on beats 4–5 sat outside the V3 column and never drew. The gate now builds the sheet the viewer builds (`computeSheet` + `markInPanel`) and checks a live block also where its sweep stops (the state the reveal holds). AF f labels now spread over the whole panel and stay off the QRS. `ordered` is validated as a boolean.
- Fixes merged: S+H (5511acb), O (17e8537), I (05d15ff), T (7b57ec2), R+X (6ed70fb), plus t1 worked steps 3–4 on aVL (2b8f7ec: lead I's P′ sits 0.037 mV below its onset, flat by the course rule). Notable: the course uses 120 ms as the wide-QRS line in every pre-excited AF check (t4's bracket is now 226.7 ms between beats 17 and 18); o7's alternans marks moved onto a V3 rhythm strip; o10's "half the ripple" is measured on the tremor alone (0.50); r3's worked arithmetic adds up (800 + 90 = 890, 800 + 45 = 845, pause 1465); x3 now names paced rhythm and keeps a new LBBB without symptoms in "review today".
- Known limits, reported not fixed:
  - A learner who sets 50 mm/s sees a 5 s sheet; 12 marks on beats after 5 s (o5 slow AF, t2, t4, t5 brackets among them) then draw nothing.
  - The engine keeps no record of pacing stimuli that fail to capture, so o11 brackets the gap that holds the failed spike instead of marking the spike itself.
  - Thin margins kept on purpose, all deterministic: s1 marked RR 1004 vs 1000 ± 5; x1 P in I 0.052 vs 0.05; x1 V4 0.220 vs 0.225; i10 V1 ST/S −0.256 vs −0.25; i1/i5 mirror depths 0.004–0.007 mV inside their bounds.
  - Ordered scales put the answer in the middle 12 times out of 22; the shuffle does not apply to scales.
- Verified at 6ed70fb: full suite 5122 passed, 9 skipped, 0 failed; typecheck clean; build one `dist/index.html`, 12328 KB. Browser: t6's burst film (neutral title, no option names the artefact) and r4's frame-4 prediction (rates in the stem, 1 / 2 / 3 in order) read as written; no console error.
- Not done: no fourth read of these fixes; the browser check covered t6 and r4 only.
