# How to turn a lesson into watching and doing

The user's goal (2026-11-04): the whole course should teach through animations and small experiments the learner can
run, with short, plain explanations next to them. Foundations (F1–F6) already work this way. This guide converts a
lesson in stages S, R, T, I, H, O or X. `src/course/lessons/s2.ts` is the worked example; read it first.

## What done means

`tests/course/learn-by-doing.test.ts` checks every lesson of stages S–X:

- `text` blocks hold at most 200 zh characters in total (title + body). Zero is the target.
- Every caption of an `ecg`, `live`, `heart`, `figure` or `film` block is at most 120 zh characters.
- Every `play.notes[].text` and `frames[].note` is at most 80 zh characters.
- At least 3 blocks of kind `live`, `heart`, `figure` or `film`.
- At least 1 block that plays: a `live` block with `play`, or a `film`.
- Every criteria item in `tests/course/fixtures/criteria-baseline.json` still exists, word for word, in its lesson.

`tests/course/mark-beats.test.ts` checks that on a strip where the default beat is ambiguous (more than one beat kind,
an aberrant beat, or RR varying by more than 15 %) every auto mark names its `beat`.

The stage test (`tests/course/lessons-<stage>.test.ts`) still applies: hook first, a `worked` block before the first
`check` or `drill`, `criteria`, `contrast`, `drill`, `real` and `pitfalls` present, `summary` last with 3–5 points,
every live dial realised by the engine.

## The tools

**`live` with `play`.** A synthetic ECG the learner can drag. `play: { dial, from?, to, notes? }` sweeps `dial` once
from `from` (default: the scenario's authored value) to `to` and holds. `notes` are `{ min, max, text }` ranges of
that dial; the note whose range holds the current value shows under the tracing, during the sweep and when the
learner drags. Cover the values where something changes; gaps show nothing. The dial must be in the scenario's
`dials` (see the scenario reference) and `from`/`to`/notes must sit inside its range.

**`film`.** `frames: [{ label, ecg, note, marks? }]`, 2–6 frames, all drawn in one place with the block's `view`.
Play steps through them (3.2 s each) and holds on the last; then the learner clicks any frame. Each frame is any
`EcgSource`: a different scenario, a variant, other dial values, or a `recording` override (electrode placement,
noise, filter, gain; see `RecordingSpec` in `src/synth/api.ts`). Use one seed per film where you can, so only the
condition changes. Labels are 1–4 words.

**`predict`** (on a `live` with `play`, or a `film`): `{ question, options, answer }`. The learner picks before the
experiment runs; the reveal is the experiment itself. Use it when the learner can reason the answer out, not for
trivia. The player shows the options in a fixed order seeded by the question (`src/course/predict.ts`), so write the
answer wherever is natural. When the options form a scale (numbers, shorter → longer, none → all), write them in
scale order and set `ordered: true`; they are then shown as written.

**`heart`.** The 3D heart follows the ECG cursor, with optional `showConduction` and `emphasize` regions. Use it for
mechanism: where the impulse is slow, which wall is injured, where a pathway sits.

**`figure`.** Interactive and animated explainers (`src/figures/api.ts`): `laddergram`, `conduction` (with `block`),
`vector-loop`, `action-potential`, `hexaxial`, `horizontal-plane`, `axis-calculator`, `qtc-calculator`,
`rate-ruler`, `territories`, `decision-tree`, and the F scenes (`moving-paper`, `electrode-walk`, `cable-swap`,
`noisy-electrode`, `chest-ring`, `triangle-to-wheel`, `vector-pen`, `three-vectors`, `conduction-journey`).

## Convert a lesson

1. List the teaching points of every `text` block and every caption over 120 zh characters.
2. For each point, pick the first tool that can show it:
   1. a `live` sweep, when a dial the scenario exposes changes the thing (PR, QRS, QTc, ST, axis, rate, flutter
      ratio, AF response);
   2. a `film`, when the change is between conditions or stages (normal → peaked T → wide QRS; hyperacute →
      evolving → old; correct cables → LA/RA swapped);
   3. a `heart` block, when the point is the mechanism inside the heart;
   4. a `figure`.
3. Write the point as the note on the frame or dial range where the learner sees it. Say what to look at and what it
   means, in one or two sentences.
4. A point that no picture shows: if `criteria`, `pitfalls` or `summary` already holds it, drop it. Otherwise add it
   as a pitfall or a new criteria item, or keep it in one short `text` block (all text blocks together ≤ 200 zh).
5. Shorten every long caption. Move numbers into notes.
6. Prove every number you wrote in a note or frame note: add an assertion to the stage test that generates the same
   request and checks `ecg.truth` (`hrBpm`, `prMs`, `qrsMs`, `qtcBazettMs`, `axisDeg.qrs`, `stMv`, the RR of `beats`).
   A sweep note covers a range; assert both ends.
7. Run the checks below. Do not open a browser; the coordinator walks every stage after the merge.

Merge blocks rather than add them: a lesson that had a `text` block and a static `ecg` block about the same point
usually becomes one `film`.

## Rules that do not bend

- Never change or delete an existing criteria item; the gate compares them word for word. You may add items.
- Every tracing comes from the engine. Never describe a feature the tracing does not show. When a note gives a
  number (a PR, an RR, a QRS width), it must match what the engine draws for that request; check `truth` in a test
  or measure on screen.
- zh, en and es for every string. Spanish as used in Spain ("derivación", "aurícula", "onda", "segmento",
  "bloqueo de rama"). Medical terms correct in all three.
- Original wording. The Castellano et al. 2004 book is for structure and criteria only; never copy its prose.
- A note states only what the learner can see or measure on screen: the tracing, its marks, the dial read-outs.
  Never quote a value the screen does not show, such as a formula's result, unless the note works the arithmetic
  from on-screen values (for example "QT 342 ms, RR 603 ms: 342 ÷ √0.603 ≈ 440").
- Notes are written for the block's other dials at their start values; the player hides the note as soon as the
  learner moves another dial.
- A prediction must be answerable from what the lesson has already shown. If it needs something taught later, it is
  a quiz: move the block or change the question.
- Nothing on screen before the reveal may give the answer away. Until the learner has predicted, the player hides
  the caption, the notes, the marks, the highlighted leads and the film's frame labels (chips show only their
  number). The block's title is the step heading and is always visible, so a title never states the answer; the
  tracing itself (frame 1 of a film, the start of a sweep) is visible too.
- An assertion's tolerance matches the note's precision. This applies to every number in the lesson's text (notes,
  frame notes, captions, worked steps, contrast points, hook reveals), not only notes:

  | Text says | Assert |
  |---|---|
  | "about N ms" | N ± 5 ms |
  | "about N mm" | N ± 0.25 mm, or ± 5 % of N when that is larger |
  | "N/min" (a stated rate) | N ± 1/min |
  | "about N°" | N ± 5° |
  | "≈ x" (a ratio) | x ± 0.05 |
  | "a–b" | the value inside [a, b] |
  | "about a–b" | inside [a − tol, b + tol], tol from the rows above |
  | "flat", "isoelectric", "on the baseline" | \|value\| ≤ 0.05 mV (`MIN_WAVE_MV`) |

  A bare number without "about" gets the same tolerance, or gains "about". Where a note range marks the threshold of
  a finding, assert both sides of the boundary in every lead the definition uses. A claim with a direction ("deeper
  than", "below 1 mm") is asserted on both sides when the text also gives a size.
- A shape or lead claim ("rS in V1", "inverted T in V5–V6", "mirror depression in III") is asserted on the tracing it
  describes, in every lead it names. If it cannot be asserted, narrow the words to what is.
- "The same heart", "the same tracing", "same voltage": only when both use the same scenario and seed with only a dial,
  a variant or a `recording` override changed, and the quantity named is asserted equal. Otherwise say "a similar".
- On a strip where the default beat is ambiguous (see `mark-beats.test.ts`), every auto mark names its `beat`, and the
  stage test asserts that beat is the one the text is about (its kind, or that its RR is the pause).
- A prediction's answer is something the tracing will show. If a criteria card, a hook reveal or an earlier block
  already states the answer, the question is recall: change it. Assert the answer against the engine.
- Text about a real PTB-XL case states only its labels and the PTB-XL+ / 12SL values, and the stage test checks each
  stated value against `ptbxl-meta.json` in a claims table (see `tests/course/lessons-x.test.ts`).
- A frozen criteria item that is wrong is reported to the coordinator, never edited and never contradicted elsewhere
  in the lesson.
- Do not reuse a category name that criteria already define (for example "Borderline" in the athlete criteria) for
  something else.
- Keep the ids, seeds and order of existing `check`, `drill` and `real` blocks.
- Stage tests find some blocks by position. When a test breaks because a block moved, fix the index, never the
  assertion. When an assertion checks a block you deleted, move it to the block that now carries that ECG, or report
  it; never delete a medical assertion.
- Captions and notes are plain: short sentences, `**bold**` for the one thing to look at, no lecture.

## Check your work

```bash
npx vitest run --maxWorkers=2 tests/course/learn-by-doing.test.ts tests/course/mark-beats.test.ts tests/course/predict.test.ts tests/course/lessons-s.test.ts
```

```bash
npm run typecheck
```

Replace `lessons-s` with your stage. Both must pass.
