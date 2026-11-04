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
| h1–h9 (stage H subagent) | 8401a7a … 8c557f7, merged b465450 | gate + `lessons-h` + i18n: 280 passed, 30 expected fail; typecheck clean; browser: h4 `moving-paper` starts at 25 mm/s and 5 mm/mV with the 0.2 mV small-square read-out | content review running |
| t1–t7 (stage T subagent) | 28c99cf … c727391, merged 7a2132d | gate + `lessons-t` + i18n: 261 passed, 23 expected fail; typecheck clean; browser: t5 four-mimics film plays, caption hidden before the reveal | content review running |
| i1–i11 (stage I subagent) | d7686c1 … d7c41e6, merged e627fcc | gate + `lessons-i` + i18n: 326 passed, 12 expected fail; typecheck clean; browser: i9 timeline film plays minutes → hours → 1 day → weeks; frame 4 note says "the same as the opening tracing" although it is another seed | content review running |
| o1–o12 (stage O subagent) | 76402fa … 5e26a3c, merged eda43d8 | the PENDING list is empty and deleted; the gate is strict for all 58 S–X lessons: 332 passed; typecheck clean | content review running |
