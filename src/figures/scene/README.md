# Scene runtime — contract for scene authors

Spec: `docs/design/f-explainers.md` (§1 rules, §2 runtime, §4 the nine scenes). This folder is the runtime (one owner,
already landed). You write **one scene in two files of your own** (plus one test file); you never touch a shared file.
Nothing from `src/lab/**` may be imported into `src/figures` except `labHref()` from `src/lab/links.ts`.

## Your files (and only these)

| file | what |
|---|---|
| `src/figures/scenes/<PascalId>Scene.tsx` | the component. Today it is a stub (`<SceneStub id t>`); **replace the body, keep the exported name** (`src/figures/index.tsx` imports it by that name; its `satisfies` clause fails the build otherwise). ≤ 15 KB, render only. |
| `src/figures/scenes/<id>.i18n.ts` | every user-visible string of the scene: `BEAT_IDS`, `zh`, `en`, `es`, `t<PascalId> = defineDict('scene-<id>', zh, en, es)`. Fill the placeholders; add `lbl_*`, `ctl_*`, `pq_*` keys as you need. |
| `src/figures/scenes/<id>.math.ts` | *optional but expected*: the pure maths — `BEATS`, placement tables, `frame(p, state)`, physiology helpers. No Preact, no DOM. Import `BEAT_IDS` / `BeatId` from the i18n file (that direction has no cycle). |
| `src/figures/scenes/<id>.css` | optional, ≤ 2 KB, tokens only, imported by your component only. |
| `tests/figures/scenes/<id>.test.ts` | your test (a stub exists). Add: beats tile, continuity `frame(to_k) ≈ frame(from_{k+1})` ≤ 1e-9 at every boundary for the default state, end-frame completeness at `p = 1`, the scene's physiology facts of spec §4.n. |

**Do not edit**: `src/figures/api.ts` (your id and params type are registered), `src/figures/index.tsx` (your component
is mapped), `src/figures/figures.css`, `src/i18n/figures.ts`, `src/figures/scene/*` (the runtime), `src/figures/dev/harness.tsx`
(your harness item exists), another scene's files, `tests/figures/scene/*` (`spec.ts` pins your beat ids — a change
there is a spec change). A shared helper you need (a draw primitive, an `einthoven.ts` potential model, an `art/*` move)
is a separate tiny PR to the runtime owner first, never a copy into your scene.

Lesson edits (spec §5) land in the same PR as the scene; `tests/course/lessons-f.test.ts` pins block order (spec §0).

## Deviations from the spec recorded here

- **Flat layout**, not one folder per scene: `scenes/<PascalId>Scene.tsx` + `scenes/<id>.i18n.ts` (+ `<id>.math.ts`,
  `<id>.css`), and the dictionary namespace is `scene-<id>` (not `scene.<id>`). The work order asked for this layout;
  tests glob `scenes/*.i18n.ts` and `scenes/*Scene.tsx`.
- **`useScene` owns its rAF loop**; `usePlayOnce` in `shared.tsx` is unchanged (its observer runs once at mount and
  cannot re-arm for a late ECG; extending it would touch every existing figure). The hook offers both the spec's names
  (`i`, `reduced`, `prev`, `next`, `seekBeat`, `playBeat`, `local`, `seg`) and the short ones (`beatIndex`,
  `reducedMotion`, `prevBeat`, `nextBeat`, `play`).
- **Not present yet** (spec §2.1 lists them; ask the runtime owner before assuming them): `draw.tsx` (RevealPath,
  Drop, PenStrip, LeadCell, ChestSection, Bracket, Meter), `layout.ts` (`useStageWidth`), `math/einthoven.ts`
  (potentials, hook-ups, noise factors), `art/conductionArt.ts` / `art/torsoArt.ts`, the `projection.ts` arc helpers.
  Until they land, draw with what `shared.tsx`, `strip.tsx`, `wheel.tsx` and `math/*` already export (below).
- Tests live in `tests/figures/scene/` (`timeline`, `registry`, `strings`) and `tests/figures/scenes/<id>.test.ts`.

## What the runtime gives you (`import … from '../scene/index'`)

```ts
useScene({ beats, durationMs?, timeline?, autoplay?, seekTo?, cursor?, target })  →  SceneState
```

- `beats: BeatDef[]` (`{ id, ms }`) is compiled once per identity; or pass a `timeline` (`compileBeats`, `anchorBeats`,
  `phaseBeats`) — `null` while your source is not ready (no autoplay, transport disabled). The timeline `key` is
  **source identity only** (the block's ECG arrived / the chosen beat changed); a drag, a toggle or a hook-up never
  changes the key, so interaction never resets the tour.
- `SceneState`: `p`, `i`/`beatIndex`, `id`, `beats`, `ready`, `playing`, `reduced`, `local(id)`, `seg(a, b)`,
  `replay()`, `play(from, to)`, `playBeat(i)`, `seek(p)`, `seekBeat(i)`, `prev()`, `next()`, `stop()`, `window`.
- Play once and hold; `prev`/`next` land on beat **ends** by default (`seekTo: 'middle'` for the heart block).
- Reduced motion (store setting or media query): `p = 1` at mount, every play lands on its end frame, the transport
  shows one note line. **Every end frame must be complete on its own** (labels, brackets, numbers).
- Cursor bridge: when the timeline has a `window` (ECG-backed scenes) and the block's `cursor` is passed, every `p`
  is mirrored to the cursor in whole ms (`lastWritten` guard) and a foreign cursor write (a click on the 12-lead under
  the figure) stops playback and seeks the scene.
- Autoplay waits for the stage (`target` ref) to scroll into view (IntersectionObserver), once per key.

`<SceneFrame id title aria scene stageRef narration narrationReserve? narrationOverride? controls? predict? footer? caption? slow? beatLabel? playBeat?>`
wraps `FigureFrame`: stage wrapper (the observer target, `aria-label`), `SceneTransport` (replay · prev · play-this-beat
· next · beat dots · `{i}/{n}` · scrub slider with a reserved read-out · `×k` chip), and the narration box, a block
`<Reserve>` sized by the longest caption of the current language (plus `narrationReserve`, e.g. Predict feedback) so a
beat change never moves anything. `aria-live="polite"` announces per beat.

`<Predict question options correct playing onReveal onReset?>` — commit before reveal; Reveal is disabled until a pick
and while `playing`; the scene animates the reveal (a state change + `playBeat(k)`) and shows the feedback through
`narrationOverride` with the `pq_ok` / `pq_wrong` texts (put both in `narrationReserve`).

`timeline.ts` (pure, tested): `compileBeats`, `anchorBeats`, `fiducialTimes`, `beatIndexAt`, `local`, `seg`
(eased), `revealed` (linear, for `pathLength` reveals), `tween`, `easeInOut`, `easeOut`, `splitRange`, `beatTarget`,
`timeOfP`, `pOfTime`, `frameGate`. `phases.ts`: `HEART_PHASES`, `JOURNEY_PHASES`, `phaseBeats`, `PHASE_LABEL_KEY`.
Runtime strings: `tsn('scSchematic' | 'scModel' | 'scLab' | 'ph_qrs' | …)`.

## Writing the scene (3b1b style, spec §1)

1. **A scene is a function of time.** Per-frame state is `p`; `math.ts` exports `frame(p, state): Frame` with flat
   numbers/booleans (angles, opacities, reveal fractions, pen y). Precompute path strings, loops and strips once per
   `state` (`useMemo`); per frame change only transforms, ≤ 3 drops, one pen and `stroke-dasharray`/`pathLength`
   reveals. ≤ 300 points per trace, ≤ 96 per loop.
2. **No cuts.** The end frame of beat *k* is the start frame of beat *k + 1* (your continuity test). Everything moves
   through `seg()`. The only discontinuity allowed is a crossfade between two **true** signal states (two exact
   re-assemblies, two engine outputs); an interpolated waveform is never drawn.
3. **One source.** A multi-lead picture is one heart vector / loop / set of potentials pushed through the lead system
   (`math/projection.ts`: `projectFrontal`, `projectLoop`, `PRECORDIAL_DEG`; `LIMB_ANGLE_DEG` from `src/core/leads.ts`; limb leads by
   Einthoven/Goldberger exactly, precordials vs Wilson's central terminal) — never a waveform drawn per lead. Label a
   schematic source with `tsn('scSchematic')`.
4. **The ECG is the protagonist.** Every scene draws, in sync, the deflection or strip it explains and holds on the
   final frame. `FigureBlock` (`src/course/blocks.tsx`) already renders the full 12-lead `EcgDisplay` under your
   figure for ECG-backed scenes and hands you `props.ecg` + the shared `props.cursor`.
5. **No `generate()` inside a scene.** Read `props.ecg` (it arrives *after* mount without a remount — pass
   `timeline: null` until then) or your schematic source. Engine-made contrasts live in the lessons.
6. **Numbers never leave the lesson**: a criterion that moves out of a card reappears as an in-picture label at the beat
   where it matters, with the value of `docs/curriculum/criteria.md`.
7. **Layout stability**: fixed-aspect `<Svg w h>`; two placement tables (wide 760 × 400–440, narrow 420 × 600–680)
   sharing one `frame()`, chosen at mount/resize, never during playback; any changing text in a `<Reserve>`; tabular
   digits (`class="tabular"`). Hit targets ≥ 24 px; labels ≥ 11 user units.
8. **Motion**: no loops, no animation library, no `setInterval`; smooth hand-rolled easing only; a Predict reveal under
   reduced motion cuts to the end frame.
9. **Theme**: tokens only (`--fg`, `--fg-muted`, `--c-vector`, `--c-qrs`, `--c-atrial`, `--c-repol`, `--c-conduction`,
   `--c-highlight`, `--panel`, `--panel-2`, `--border`, `--focus`, `--ok`, `--err`); emphasis by `.sc-on` / `.sc-dim`;
   the pen `.sc-pen` / `.sc-pen--glow`. Check light and dark in the harness.
10. **i18n**: zh / en / es for every string, Spain Spanish (derivación, aurícula, onda, segmento, bloqueo de rama,
    terminal central de Wilson, lpm, cable, electrodo, artefacto, isodifásica); Chinese 除极 / 复极, 导联, 电极, 中心电端,
    伪差, 向量环. Narration ≤ 110 characters / 20 words in en, ≤ 45 characters in zh, ≤ 130 in es; one idea per beat; no
    number that is not also drawn; original wording (never the book's prose). Decimal comma in es. The strings test
    applies the lesson-text gates to all three tables automatically.

## Drawing the ECG strip in a scene (what is importable without a cycle)

`src/course/*` imports `src/figures`, so **a scene must not import `src/course/EcgFrame` (`useEcg`, `EcgDisplay`)**
or anything else under `src/course` — that is a cycle, and the block already renders the 12-lead under you. Use:

- `leadPath(sig, lead, t0, t1, toX, toY, columns)` from `src/figures/strip.tsx` — the SVG path of one lead of
  `props.ecg.signal` over a window; `windowMedian` for the baseline. Reveal it with `pathLength={1}` +
  `stroke-dasharray` driven by `revealed(p, a, b)` (one attribute per frame).
- `MiniTrace`, `PaperGrid`, `SvgLabel`, `ArrowDefs`, `Svg`, `Reserve`, `Slider`, `Toggle`, `Check`, `svgPoint`,
  `angleKey`, `fmt`, `fmtDeg`, `DegReserve` from `src/figures/shared.tsx`; `HexWheel` from `src/figures/wheel.tsx`.
- Beat fiducials: `props.ecg.truth.beats[k]` (`BeatMarks`), `beatAt` / `beatWindow` from `src/figures/math/kors.ts`,
  `defaultBeat`-like choices stay in the scene; `anchorBeats` / `phaseBeats` turn a beat into a windowed timeline.
- Schematic sources: `NORMAL_BEAT` + `beatValue` / `periodicValue` / `sample` (`math/beat.ts`), `loopPoints` / `frontalQrsLoop` /
  `horizontalQrsLoop` / `projectLoop` / `measureRS` / `rsTransition` (`math/projection.ts`), `dipoleTrace`
  (`math/dipole.ts`), `apValue` (`math/ap.ts`), `schematicTimeline` / `statesFromRegions` (`math/conduction.ts`),
  `mmFromMs` / `mmFromMv` / `calibrationPulse` (`math/paper.ts`).
- `src/synth` is importable from `src/figures` without a cycle (types such as `SynthRequest` are fine), but **a scene
  never calls `generate()`** (spec §1.3): the lesson block owns the source and passes `ecg`.
- The big voxel heart: link only, `labHref('normal-ecg')` from `src/lab/links.ts`, label `tsn('scLab')`.

## Testing a scene

- Pure maths in `src/figures/scenes/<id>.math.ts`; test in `tests/figures/scenes/<id>.test.ts` (the stub there pins
  `BEAT_IDS` to the spec and the translator namespace — keep those, add yours).
- The node test environment has no DOM: components are not rendered in tests; everything decidable goes in `math.ts`.
- Run `npx tsc --noEmit` and `npx vitest run tests/figures tests/course` before a PR; the harness checklist:
  zh / en / es, light / dark, 1366 px and 390 px, reduce-motion on, keyboard only
  (`src/figures/dev/harness.html?fig=<id>&ecg=normal&lang=es&theme=dark`).

## Registered ids and params (`src/figures/api.ts`)

`conduction-journey` (f1) · `vector-pen` (f2) · `three-vectors` (f2) · `triangle-to-wheel` (f3) · `chest-ring` (f3) ·
`moving-paper` (f4) · `electrode-walk` (f5) · `cable-swap` (f6) · `noisy-electrode` (f6). Params are start values only;
`<Figure>` remounts on any params change, so keep interaction in component state. Lessons embed a scene as
`{ kind: 'figure', figure: { id: 'cable-swap' }, ecg: syn('normal', 611), caption }`.
