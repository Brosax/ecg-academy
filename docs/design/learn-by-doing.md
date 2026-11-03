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

A lesson still listed in `PENDING` is expected to fail. When your lesson passes, the test turns red with "Expect test
to fail": delete the lesson id from its stage's line in `PENDING`.

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
trivia.

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
- Keep the ids, seeds and order of existing `check`, `drill` and `real` blocks.
- Stage tests find some blocks by position. When a test breaks because a block moved, fix the index, never the
  assertion. When an assertion checks a block you deleted, move it to the block that now carries that ECG, or report
  it; never delete a medical assertion.
- Captions and notes are plain: short sentences, `**bold**` for the one thing to look at, no lecture.

## Check your work

```bash
npx vitest run --maxWorkers=2 tests/course/learn-by-doing.test.ts tests/course/lessons-s.test.ts
```

```bash
npm run typecheck
```

Replace `lessons-s` with your stage. Both must pass, and your lessons must be off `PENDING`.
