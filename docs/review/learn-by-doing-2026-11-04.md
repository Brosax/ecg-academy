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

## Units

| Unit | Commit | Check | Verdict |
|---|---|---|---|
| Gate, criteria baseline, `live.play`, `film`, validator rules, unit tests | 555b82a | course + assistant tests: 1150 passed, 58 expected fail; typecheck clean | VERIFIED |
| s2 | b5a8ab4, 46dc7fe | gate, `lessons-s`, typecheck; browser: rate sweep 60 → 100 holds at 100/min with RR 611 ms and the "3 large squares" note; film steps regular → sinus arrhythmia → AF and holds; 375 px wide: no horizontal overflow | VERIFIED |
| s1, s3–s7 (pilot subagent) | 1a936dd … a841d25 | merged fast-forward; course + assistant tests 1173 passed, 51 expected fail; typecheck clean; browser: s4 Bazett sweep ends at 100/min with "higher than true" marked right, s6 four-frame filter film loads without placeholders | NOT VERIFIED: the review found 5 blocking content errors (numbers not on screen, a stale note, a knowledge-quiz prediction, an early-repolarization boundary off by 0.02 mV, overstated P-wave claims), 6 wording errors, 7 loose tolerances, 3 lost reading rules; fix round running |
| x1–x4 (stage X subagent) | cb53709 … e29bbaa, merged a5140c9 | gate + `lessons-x` + validator: 265 passed, 47 expected fail; typecheck clean; browser: x3 triage film plays five frames and holds, each note gives the bin and the first action | content review running |
