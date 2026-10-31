# Stage F explainers — scene runtime, 3D-heart upgrade, nine scenes, text policy

Status: **design, 2026-10-31**. Nothing in `src/` or `tests/` was written or run for this document (no `tsc`, no
`vitest`); it is the spec the implementation PRs follow. Project root: `C:\Users\A511741\Desktop\Workspace\ECG Academy`.

The user's request: *"The site has too much theory. Use animation as much as possible — 3Blue1Brown-style — or 3D
models, so the theory becomes intuitive, with more interaction. For now only the foundations (stage F, f1–f6)."*

Binding rules (CLAUDE.md, repeated here only where this spec leans on them): the ECG is the protagonist; one-source
rule; play once and hold; layout stability; tokens only; zh/en/es with Spain Spanish; no new dependencies; no CDN;
`src/course/api.ts` and `src/heart3d/api.ts` unchanged; nothing from `src/lab/**` imported into `src/figures` or
`src/course` except `labHref()` from `src/lab/links.ts`; `_proto/` and `Dynamic Electrocardiogram` untouched.

---

## 0. Decision record

Three designs were judged on (a) the 3b1b test (continuous transformation that draws the ECG), (b) one-source
correctness, (c) parallel implementability with disjoint files, (d) lesson text removed, (e) layout / motion rules.
Scores 1–5.

| | a motion | b source | c parallel | d text cut | e rules | note |
|---|---|---|---|---|---|---|
| D1 (nine scenes, `compileBeats`, per-scene i18n file) | 5 | 4 | 5 | 5 | 5 | the richest morphs (triangle → wheel, axis rotating through equiphasic, paper under a fixed pen, cables crossing); honest about the 0.866 augmented-lead factor and the RA↔RL chest shift; continuity test per scene; HeartBlock plan verified against `view.ts` and `heart3d.css` |
| D2 (thin runtime, fiducial anchors, in-place upgrades) | 4 | 4 | 3 | 3 | 4 | best timeline idea (beats anchored to fiducials, `play(from,to)`); but upgrading `dipole`/`paper`/`electrodes` in place changes pages outside stage F (`hexaxial`, `horizontal-plane` are embedded by s5, `action-potential` by s6 — verified by grep), and inline `l()` strings ignore the defineDict requirement |
| D3 (prediction game, engine oracle, alternate engine states) | 4 | 5 | 3 | 4 | 4 | strongest correctness (potentials recovered from I and II in the WCT gauge, engine as oracle; clean ECG for the noise scene); the Predict primitive is exactly the project's "commit before reveal" principle; but `generate()` inside scenes (placeholders, idle callbacks, cached states) buys little that the lessons' engine-made contrasts do not already give, and cutting the f1/f2 live blocks silently breaks `tests/course/lessons-f.test.ts` |

**Verdict: D1 is the backbone.** Grafted from D2: beats anchored to the beat's own fiducials (`anchorBeats`), sub-range
play (`playBeat`), the clip-path "pen" idea, the geometry extraction of ConductionFigure / ElectrodesFigure into shared
art modules, "lesson edits land with each scene, no lesson is ever half-cut". Grafted from D3: the `Predict` row (five
scenes), the exact potential algebra with the engine as oracle (`einthoven.ts`), a clean synthetic ECG for the noise
scene, the scene-strings test with the lesson-text gates, `frameGate`, the explicit "crossfade only between true
states, never an interpolated waveform" rule, and `playing` tracked explicitly. Rejected: in-place upgrades of
existing figures; `generate()` inside scenes; cutting `live`/`contrast` blocks; a tenth (filter) scene (the brief's
ceiling is nine; the engine-made monitor-filter contrast in f4 stays and carries that mechanism).

Facts checked in the code that settle the designs' disagreements:

- `src/figures/index.tsx` keys `<Figure>` on `id + JSON(params)`; `FigureBlock` renders the figure before `useEcg`
  resolves, so **the `ecg` prop arrives after mount without a remount** — the runtime must handle a late source (§2.6).
- `src/heart3d/view.ts:515` turns the camera toward newly emphasized walls ("a jump, no animation") whenever
  `emphasize` changes → per-phase emphasis must go on the ECG, never on the heart (§3).
- `.h3d__phase` (`src/heart3d/heart3d.css:126`) is a fixed two-line box holding the phase sentence `Heart3D` prints
  via `onPhase` (`cardiacPhase` in `src/heart3d/phase.ts`, strings in `src/i18n/heart3d.ts`) → reuse it, no second
  narration box in the heart block.
- `src/ui` has `prev`, `next`, `play`, `pause`, `refresh` icons; `EcgDisplay` (`src/course/EcgFrame.tsx`) takes
  `marks?: LessonMark[]` and re-resolves them on identity change; `src/course/lab.ts` already offers the lab link for
  f1's findings (`normal-ecg` → `#/lab/normal-sinus-rhythm`).
- `src/synth/leads/assemble.ts`: `I = Φ_LA − Φ_RA`, …, `Vk = Φ_Vk − (Φ_RA+Φ_LA+Φ_LL)/3`, and the RL site ≡ LL. Hence
  RA↔RL makes II ≡ 0, I′ = −III, aVR′ = aVF′ = III/2 (the f6 test already asserts this) **and shifts V1–V6 by −II/3**:
  "chest leads unchanged" is true only for swaps among RA/LA/LL (criteria.md says the same).
- `tests/course/lessons-f.test.ts` pins `hook` first, `summary` last (3–5 points), and these blocks by kind index:
  f1 `live[0]`, `contrast[0]`, item 11002; f2 items 21001/21002, `live[0]`, `worked[0]`, `contrast[0]`; f3 `hook`,
  `worked[0]`, `contrast[0]`; f4 `hook`, `worked[0]`, `ecg[0]`; f5 `hook`, `worked[0]`, `contrast[0]`, item 51001;
  f6 `hook`, `contrast[0]`, items 61001–61003. The text policy (§5) keeps every one of them, in order, with the same
  ECG sources.

---

## 1. Rules added by this spec

1. **A scene is a pure function of time.** Per-frame state is one number `p ∈ [0,1]`; `math.ts` exports
   `frame(p, state): Frame` (flat numbers/booleans — angles, opacities, reveal fractions, pen y). Path strings,
   loops and strips are computed once per `state` (`useMemo`) and revealed by numbers from `frame`.
2. **No cuts.** The end frame of beat *k* is the start frame of beat *k + 1* (tested, §2.13). Everything moves through
   `seg()` easing: arrows rotate, feet slide, sides translate, cables cross, paper slides. The only discontinuity
   allowed is a **crossfade between two true signal states** (engine output A → engine output B, or two exact
   re-assemblies of the same potentials). An interpolated waveform is never drawn.
3. **No `generate()` inside a scene.** Scenes read the `Ecg` the block gives them, or their own schematic source.
   Engine-made comparisons (WPW, RBBB, monitor filter, V1/V3 swap, flat leads, tremor) already exist as lesson
   `contrast` blocks and stay there.
4. **One source, two conventions, stated once.** Schematic vector scenes (vector-pen, three-vectors, chest-ring)
   project one loop on unit lead axes (`projectFrontal` / `projectLoop`, the HexaxialFigure convention; `II = I + III`
   and `aVR + aVL + aVF = 0` hold exactly). Lead-system scenes (triangle-to-wheel, cable-swap, noisy-electrode) use
   the exact potential algebra of `math/einthoven.ts` with the engine as oracle; there the augmented leads come out
   1.5× the WCT-referenced limb potential, i.e. 0.866× a unit-axis projection for the same vector. The header of
   `einthoven.ts` documents this; no scene explains it twice (one note string, `scModel`).
5. **Every end frame is complete on its own** (labels, brackets, numbers): reduced-motion users and prev/next only
   ever see end frames.
6. **Numbers never leave the lesson.** A numeric criterion that leaves a card reappears as an in-picture label at the
   beat where it matters and stays in the lesson summary, with the value of `docs/curriculum/criteria.md`.
7. **Shared files are edited only by the runtime PR.** A scene PR touches its folder, its test file, its lesson file
   (and `tests/course/lessons-f.test.ts` only if a pinned block moves — it does not under §5).

---

## 2. Runtime design

### 2.1 File layout

```
src/figures/
  scene/                         runtime (one owner, lands first)
    timeline.ts                  pure: beats, easing, targets, time maps, frame gate
    phases.ts                    pure: fiducial-anchored presets (heart block, conduction journey)
    useScene.ts                  the hook (built on usePlayOnce)
    SceneFrame.tsx               FigureFrame + SceneTransport + narration Reserve + Predict slot
    SceneTransport.tsx           the transport row alone (also used by the course's HeartBlock)
    Predict.tsx                  "commit before reveal" chips
    draw.tsx                     RevealPath, Drop, PenStrip, LeadCell, ChestSection, Bracket, Chip, Meter
    layout.ts                    useStageWidth(): 'wide' | 'narrow' (ResizeObserver, 560 CSS px)
    strings.ts                   tsn = defineDict('scene', …): transport / predict / notes (runtime-owned)
    SceneStub.tsx                placeholder component for pre-registered ids
    scene.css                    .sc-* rules, tokens only; imported once from src/figures/index.tsx
  scenes/<id>/                   one folder per scene (one owner)
    <Id>Scene.tsx                render only (SVG from frame numbers), ≤ 15 KB
    math.ts                      BEATS, PLACEMENT (wide/narrow), frame(p, state), scene maths
    strings.ts                   t<Id> = defineDict('scene.<id>', zh, en, es) — see §2.8
    <id>.css                     optional, ≤ 2 KB, imported by <Id>Scene.tsx only
  art/
    conductionArt.ts             OUTLINE, RA, LA, RV, SEPTUM, LV_*, PATHS, PURK_R, NODE_POS, BAR — moved out of
                                 ConductionFigure.tsx (pure move; ConductionFigure imports them)
    torsoArt.ts                  TORSO, ARM_*, LEG_*, STERNUM, HEART, CLAV_*, ribLines() — moved out of
                                 ElectrodesFigure.tsx (pure move)
  math/
    einthoven.ts                 NEW: potential model, hook-ups, noise factors (§2.12)
    projection.ts                + chestArcPoint(s), precordialAt(s) (continuous electrode along the chest wall)
tests/figures/
  scene.test.ts                  runtime maths + useScene contract with a fake rAF
  einthoven.test.ts              engine as oracle (PLACEMENT presets), identities, noise factors
  scene-strings.test.ts          import.meta.glob over scenes/*/strings.ts (no per-scene edit)
  scenes/_shared.ts              assertTiled, assertContinuous, assertEndFrameComplete
  scenes/<id>.test.ts            one per scene
```

### 2.2 Types

```ts
// src/figures/scene/timeline.ts
export interface BeatDef<Id extends string = string> { readonly id: Id; readonly ms: number }
/** fiducials of the beat a scene is anchored to (BeatMarks); hisOn = qrsOn − 45 ms (math/conduction.ts convention) */
export type Fid = 'start' | 'pOn' | 'pOff' | 'hisOn' | 'qrsOn' | 'qrsOff' | 'tPeak' | 'end';
export interface AnchoredBeatDef<Id extends string = string> { readonly id: Id; readonly from: Fid; readonly to: Fid }
/** a compiled beat: fractions of the timeline, tiling [0, 1] */
export interface Beat<Id extends string = string> { readonly id: Id; readonly from: number; readonly to: number }
export interface Timeline<Id extends string = string> {
  readonly beats: readonly Beat<Id>[];
  readonly durationMs: number;                  // wall-clock length of the play-once run
  readonly window?: readonly [number, number];  // ECG time (ms) that p = 0 … 1 maps to (ECG-backed scenes)
  readonly key: string;                         // identity: changes when the source changes (re-arms autoplay)
}
```

The `Frame` of a scene is its own flat type (`math.ts`); `frame(p, state)` must be deterministic and allocation-light.

### 2.3 `timeline.ts` (pure, tested)

- `compileBeats(defs: BeatDef[]): Timeline` — fractions from the ms, sums to 1, `key` = ids + durations.
- `anchorBeats(defs: AnchoredBeatDef[], b: BeatMarks, opts: { slow: number; pad?: [number, number]; clampMs?: [number, number] }): Timeline` —
  `start = pOn − 40` (or `qrsOn − 160` without a P), `end = tOff + 60`, `hisOn = qrsOn − 45`; anchors must be
  non-decreasing (throws otherwise, the test checks every preset on `NORMAL_BEAT.marks` and on a generated beat);
  a zero-length beat gets 1 % of the timeline; `durationMs = clamp((end − start) × slow, clampMs ?? [1500, 6000])`;
  `window = [start, end]`. Null fiducials (`BeatMarks` types them `number | null`): `tPeak == null` →
  `(qrsOff + tOff) / 2`; `pOn`/`pOff == null` → the P-anchored beats collapse to the 1 % minimum (scenes and the
  heart block only receive sinus beats from `defaultBeat` / `beatAt`, so this is a guard, not a feature).
- `beatIndexAt(beats, p)` (p = 1 → last), `local(beats, i, p) = clamp((p − from)/(to − from), 0, 1)`,
  `seg(x, a, b) = easeInOut(clamp((x − a)/(b − a), 0, 1))` for motions inside a beat, `tween(a, b, f)`,
  `revealed(x, a, b)` (linear, for `pathLength` reveals), `beatTarget(beats, i, 'start' | 'middle' | 'end')`,
  `timeOfP(window, p)`, `pOfTime(window, t)` (clamped to [0, 1]), `frameGate(lastMs, nowMs, minIntervalMs)`.
- Easing: `easeInOut = ease` from `math/geom.ts`; `easeOut(x) = 1 − (1 − x)²`. Hand-rolled only.

### 2.4 `phases.ts` presets

```ts
export type HeartPhaseId = 'sa' | 'p' | 'pr' | 'qrs' | 'st' | 't';
export const HEART_PHASES: readonly AnchoredBeatDef<HeartPhaseId>[] = [
  { id: 'sa',  from: 'start', to: 'pOn' },  { id: 'p',  from: 'pOn',    to: 'pOff' },
  { id: 'pr',  from: 'pOff',  to: 'qrsOn' }, { id: 'qrs', from: 'qrsOn', to: 'qrsOff' },
  { id: 'st',  from: 'qrsOff', to: 'tPeak' }, { id: 't',  from: 'tPeak',  to: 'end' },
];
export type JourneyPhaseId = 'p' | 'av' | 'his' | 'qrs' | 'st' | 't';
export const JOURNEY_PHASES = [ p: start→pOff · av: pOff→hisOn · his: hisOn→qrsOn · qrs · st: qrsOff→tPeak · t: tPeak→end ];
export function phaseBeats<Id>(defs, beat: BeatMarks, slow = 5): Timeline<Id>   // = anchorBeats with the HeartBlock clamp
export const PHASE_LABEL_KEY: Record<HeartPhaseId | JourneyPhaseId, SceneKey>; // 'ph_sa' … for the beat bar
```

One helper, so the course's HeartBlock and the f1 journey step through the same fiducials.

### 2.5 `usePlayOnce` extension (`src/figures/shared.tsx`, runtime PR)

Existing callers unchanged. Added: `play(from = 0, to = 1)` (plays the sub-range at the nominal speed:
`durationMs × (to − from)`, holds at `to`), `stop()`, `holdAt?: number` (frame shown before autoplay and under reduced
motion; default 1), and the duration is read through a ref so a running loop sees the current value. `replay()` ≡
`play(0, 1)`. `playing` becomes an explicit flag (today it is derived from `0 < p < 1`, which misreads a mid-range
seek).

### 2.6 `useScene` contract

```ts
export interface UseSceneOptions<Id extends string> {
  readonly timeline: Timeline<Id> | null;   // null = source not ready (no autoplay armed, controls disabled)
  readonly autoplay?: boolean;              // default true
  readonly seekTo?: 'end' | 'middle';       // where prev / next / bar land; default 'end' (heart block: 'middle')
  readonly cursor?: Signal<number | null>;  // the shared cursor FigureBlock passes
  readonly target: RefObject<Element>;      // IntersectionObserver target (the stage wrapper)
}
export interface SceneState<Id extends string> {
  readonly p: number; readonly i: number; readonly id: Id; readonly beats: readonly Beat<Id>[];
  readonly ready: boolean; readonly playing: boolean; readonly reduced: boolean;
  local(id: Id): number;                    // 0…1 inside that beat (0 before, 1 after)
  seg(a: number, b: number): number;        // eased progress of p through [a, b]
  replay(): void; seek(p: number): void; seekBeat(i: number): void; playBeat(i: number): void; prev(): void; next(): void;
}
```

Behaviour (all tested with a fake rAF in `tests/figures/scene.test.ts`):

0. **Ownership of state.** `useScene` owns the timeline-level state (beat index, `ready`, `playing`, `reduced`, the
   cursor bridge) and delegates only the rAF loop to `usePlayOnce`; there is exactly one `p`, never a copy.
1. **Late source.** `timeline === null` → `p` is 1 under reduced motion else 0, `ready = false`, nothing autoplays.
   When `timeline.key` changes, the hook resets `p` (0, or 1 under reduced motion), stops any run, and re-arms
   autoplay once for that key if the target is in view. `key` is **source identity only** (the block's ECG arrived
   or changed, the chosen beat changed); interaction state (a dragged vector, a hook-up, a toggle) is never part of
   `key` — a drag recomputes paths and frames but never resets `p` or replays the tour. `Figure` does not remount
   when the `ecg` prop arrives (its key is `id + params`), so this is what makes scenes play correctly on first
   visit.
2. **Play once and hold.** `replay()` plays 0 → 1; `playBeat(i)` plays `[from_i, to_i]` and holds at `to_i`;
   `prev()`/`next()`/`seekBeat(i)` seek to `beatTarget(i, seekTo)` and stop; `seek(p)` stops. Nothing loops.
3. **Reduced motion** (`prefersReducedMotion()`: store setting or media query): `p = 1` at mount, `replay()` → 1,
   `playBeat(i)` → end of beat *i*, prev/next/bar as usual; `reduced = true` so the frame shows the note.
4. **Cursor bridge** (when `cursor` and `timeline.window` exist): every `p` change from playback or scrub writes
   `cursor.value = Math.round(timeOfP(window, p))` and remembers it in `lastWritten`; an effect on `cursor` reacts
   only when `t !== lastWritten`: it **stops playback and seeks** `pOfTime(window, t)` (PLAN §6: a click on the ECG
   pauses any animation and sets the cursor). A write from the scene never re-seeks the scene.
5. **Autoplay** comes from `usePlayOnce`'s IntersectionObserver; the lesson player remounts a block per step, so a
   revisit replays once (intended).
6. **Frame gating.** `frameGate` caps state updates at 30 fps when the previous frame took > 20 ms (phones).

### 2.7 Components

**`SceneTransport`** (fixed-height row; also used by HeartBlock): `[Replay]` (`ReplayButton`) · `[prev ◀]` ·
`[▶ play this beat]` · `[next ▶]` · beat bar (`n` segment buttons, `aria-pressed`, filled up to `p`, click =
`seekBeat`) · counter `{i}/{n}` in a 5-ch tabular span · scrub `Slider` (0–1000, `displayReserve` on the widest
read-out: `"{ms} ms"` for ECG-backed scenes, `"{pct} %"` otherwise) · optional slow-motion chip `×{k}`. Buttons are
always rendered (disabled at the ends); nothing appears or disappears during playback. Under reduced motion the
row gains one line of `.sc-note` (`scReduced`) at mount.

**`SceneFrame`**: `FigureFrame` + stage wrapper (`ref` for the observer, `aria-label`) + `SceneTransport` + narration
`<div class="sc-narr" aria-live="polite"><Reserve block reserve={texts.all}>{texts.beat(id)}</Reserve></div>` sized
by the longest beat text of the current language (plus every Predict feedback wording), so a beat change never
moves anything; the text changes only at beat boundaries, so `aria-live` announces per beat. Slots: `controls`
(scene toggles / drags' keyboard helpers), `predict`, `footer`, `caption` (≤ 2 lines; the lesson caption is the only
other prose).

**`Predict`** (`{ question, options: {id, label}[], correct: id | id[], multi?, onReveal(pick), feedback: { ok, wrong } }`):
states ask → picked → revealed; the question is visible from mount, Reveal is disabled until a pick **and while
`playing === true`** (a tour in progress is never interrupted — Predict is the after-the-tour interaction); the
scene decides what the reveal animates (usually `playBeat(k)` or a state change followed by `playBeat`); the
feedback lives in the narration Reserve; chips use `--ok` / `--err`. Guesses are scene-local (no persistence).
Under reduced motion the reveal cuts to the end frame of the target state.

**`draw.tsx`**: `RevealPath` (precomputed `d`, `pathLength={1}` + `stroke-dasharray` reveal — one attribute changes
per frame), `Drop` (perpendicular from a point to an axis + foot dot), `PenStrip` (`PaperGrid` + a `leadPath`/polyline
`d` revealed to `p` + pen dot that glows when it moves without drawing + optional moving-paper translate),
`LeadCell` (HexaxialFigure's fixed 130 × 110 mini box, extracted), `ChestSection` (the transverse section of
`projection.ts`: `CHEST`, `HEART_CENTER`, `PRECORDIAL_SITES`, axes from the centre), `Bracket` (labelled interval
bracket), `Chip` (small label box), `Meter` (a small signed bar for a potential).

**`layout.ts`**: `useStageWidth(ref): 'wide' | 'narrow'` (ResizeObserver, breakpoint 560 CSS px; `matchMedia`
fallback). Every scene has two placement tables: `wide` (760 × 400–440) and `narrow` (420 × 600–680, strips stacked
under the diagram), sharing one `frame()`; labels ≥ 11 units wide / ≥ 12 units narrow. The aspect ratio changes only
at mount or on resize, never during playback.

### 2.8 Strings

Per scene, in the scene's own file, with the `heart3d.ts` pattern so tests can read the raw tables:

```ts
// src/figures/scenes/vector-pen/strings.ts
import { defineDict } from '../../../i18n/index';
import type { BeatId } from './math';
export const vectorPenZh = {
  title: '心电向量就是那支笔', aria: '…', caption: '…',
  beat_sum: '…', beat_drop: '…', beat_draw: '…', beat_turn: '…', beat_t: '…',
  lbl_toward: '朝向 → 向上', lbl_away: '…', lbl_perp: '…', pq_question: '…', pq_ok: '…', pq_wrong: '…',
} as const satisfies Record<`beat_${BeatId}`, string> & Record<string, string>;
type D = { readonly [K in keyof typeof vectorPenZh]: string };
export const vectorPenEn: D = { … };
export const vectorPenEs: D = { … };
export const tvp = defineDict('scene.vector-pen', vectorPenZh, vectorPenEn, vectorPenEs);
```

- `satisfies Record<`beat_${BeatId}`, string>` on the zh table: a missing narration is a compile error (the beat ids
  are a string-literal union exported by `math.ts`; `import type` so there is no runtime cycle).
- Keys: `title`, `aria`, `caption`, `beat_<id>`, `lbl_*` (SVG labels), `ctl_*` (toggles), `pq_*` (Predict).
- Narration ≤ 110 characters / ≤ 20 words in en, ≤ 45 characters in zh, ≤ 130 characters in es; one idea, no number
  that is not also drawn. Spanish (Spain): derivación, aurícula, onda, segmento, bucle vectorial, terminal central de
  Wilson, lpm, cable, electrodo, inversión de cables, artefacto, temblor, interferencia de la red, isodifásica.
  Chinese: 除极 / 复极, 导联, 电极, 中心电端, 伪差, 向量环.
- Runtime strings (one file, `src/figures/scene/strings.ts`, `tsn = defineDict('scene', …)`): `scPrev`, `scNext`,
  `scPlayBeat`, `scBeatOf` (`{i}/{n}`), `scScrub`, `scReduced` ("Animation off — step through the frames"), `scSlow`
  (`×{k}`), `scSchematic`, `scModel` (the one 0.866 note), `scPredict`, `scReveal`, `scYourPick`, `scCorrect`,
  `scWrong`, `scTryAgain`, `scStub`, `scLab` ("See this beat in the Heart Lab"), `ph_sa`, `ph_p`, `ph_pr`, `ph_av`,
  `ph_his`, `ph_qrs`, `ph_st`, `ph_t`. `src/i18n/figures.ts` (53 KB, shared) is **not** edited by anyone in this work.
- `tests/app/i18n.test.ts` checks only shell/common, so scene dictionaries need their own test (§2.13).

### 2.9 Registration (the runtime PR pre-registers all nine ids; scene PRs touch no shared file)

```ts
// src/figures/api.ts — appended to FigureParams (doc comment per id) and to FIGURE_IDS
readonly 'conduction-journey': Record<string, never>;
readonly 'vector-pen': { readonly axisDeg?: number; readonly lead?: 'I' | 'II' | 'III' | 'aVR' | 'aVL' | 'aVF' };
readonly 'three-vectors': { readonly mainDeg?: number; readonly lateVector?: boolean };
readonly 'triangle-to-wheel': { readonly cabrera?: boolean };
readonly 'chest-ring': { readonly mainDeg?: number };
readonly 'moving-paper': { readonly speed?: 25 | 50; readonly gain?: 5 | 10 | 20 };
readonly 'electrode-walk': { readonly swap?: 'none' | 'v2v3' | 'v1v3' };
readonly 'cable-swap': { readonly start?: 'correct' | 'laRa' | 'laLl' | 'raLl' | 'raRl' | 'laRl' };
readonly 'noisy-electrode': { readonly electrode?: 'RA' | 'LA' | 'LL'; readonly noise?: 'tremor' | 'mains' | 'wander' | 'emg' };
```

Params are start values only (all interaction is internal state: `Figure` remounts on any params change). The
runtime PR creates every `src/figures/scenes/<id>/<Id>Scene.tsx` as `export { SceneStub as <Id>Scene } from
'../../scene/SceneStub'` and adds the nine entries to the `FIGURES` map in `src/figures/index.tsx` (its `satisfies`
clause fails the build if one is missing) plus one harness item each in `src/figures/dev/harness.tsx`. A scene PR
replaces the contents of its `<Id>Scene.tsx`; no import line changes. `src/course/validate.ts` needs nothing
(`deps.figureIds = FIGURE_IDS`). Lessons embed a scene with the existing block —
`{ kind: 'figure', figure: { id: 'cable-swap' }, ecg: syn('normal', 611), caption }` — and `FigureBlock` already
hands the scene `ecg` + the shared `cursor` and renders the full `EcgDisplay` under it, so the protagonist 12-lead
is on screen in every ECG-backed scene and a click on it scrubs the scene.

Exports for the course (modules import only through index files): `src/figures/index.tsx` re-exports `useScene`,
`phaseBeats`, `HEART_PHASES`, `SceneTransport`, `Reserve`, `prefersReducedMotion`. `src/course/blocks.tsx` imports
exactly these from `'../figures'` and nothing from `src/figures/scene/*` or `shared.tsx`.

### 2.10 CSS

`src/figures/scene/scene.css` (imported once from `src/figures/index.tsx` next to `figures.css`): `.sc-transport`
(fixed min-height), `.sc-bar` / `.sc-bar__seg` (`.is-done`, `.is-on`), `.sc-narr` (block Reserve, `min-height` from
the ghosts only), `.sc-predict` / `.sc-chip` (`--ok`, `--err`, `--panel-2`, `--border`, `--focus`), `.sc-note`,
`.sc-dim { opacity: .35 }` / `.sc-on` for emphasis by dimming, `.sc-pen` (glow via `--c-highlight-soft`). Tokens only
(`--fg`, `--fg-muted`, `--c-vector`, `--c-qrs`, `--c-atrial`, `--c-repol`, `--c-conduction`, `--c-highlight`,
`--panel`, `--panel-2`, `--border`, `--focus`); the dark theme inherits. A scene may add `<id>.css` (≤ 2 KB).

### 2.11 Performance rules (baked into the runtime, checked in review)

`usePlayOnce` sets state every frame, so a scene precomputes every path string once per `state`, reveals with
`pathLength`/`stroke-dasharray` or a clip rect, and moves only arrows, drops and the pen per frame (≤ 3 drops, one
pen); traces ≤ 300 points per lead (`leadPath(…, columns ≤ 300)`); loops ≤ 96 points; recomputation only on
interaction (drag, toggle, hook-up change: 12 × 5 000 samples once); the cursor write per frame is what HeartBlock
already does today; `frameGate` to 30 fps on slow frames. The synth engine is never called from a scene.

### 2.12 `src/figures/math/einthoven.ts` (runtime PR, tested against the engine)

```ts
export const ELECTRODE_UNIT = { RA: unit(-150), LA: unit(-30), LL: unit(90) };          // equilateral model
export function limbLeadsOfVector(v: Vec2): Record<LimbLead, number>;                   // φ_e = v·u_e/√3 → I,II,III = unit projections; aVR/aVL/aVF = 0.866× (all identities exact)
export function frontalVectorOfLeads(I: number, II: number): Vec2;                      // (I, (2·II − I)/√3): the exact inverse
export type Cable = 'RA' | 'LA' | 'LL' | 'RL'; export type Hookup = Readonly<Record<Cable, Cable>>; // cable → limb it is clipped to
export const HOOKUPS: Record<'correct' | 'laRa' | 'laLl' | 'raLl' | 'raRl' | 'laRl', Hookup>; // = src/course/lessons/f-shared.ts PLACEMENT
export interface Potentials { RA: Float32Array; LA: Float32Array; LL: Float32Array; V: Record<ChestLead, Float32Array> } // WCT gauge
export function potentialsFromSignal(sig: EcgSignal): Potentials;  // φ_RA = −(I+II)/3, φ_LA = φ_RA + I, φ_LL = φ_RA + II, φ_RL := φ_LL, φ_Vk := Vk
export function assembleHookup(phi: Potentials, hook: Hookup, noise?: { on: 'RA' | 'LA' | 'LL'; n: Float32Array }): LeadSignals; // the formulas of src/synth/leads/assemble.ts
export const NOISE_FACTORS: Record<'RA' | 'LA' | 'LL', Record<StdLead, number>>;        // RA: I −1, II −1, III 0, aVR +1, aVL −½, aVF −½, V −⅓ (and the LA / LL rows)
export function hookupSignature(hook: Hookup): { inverted: StdLead[]; swapped: [StdLead, StdLead][]; flat: StdLead[]; chestShift: boolean };
```

Tests (`tests/figures/einthoven.test.ts`): for each `PLACEMENT` preset, `assembleHookup(potentialsFromSignal(correct),
HOOKUPS.x)` equals `generate(syn('normal', 611, undefined, PLACEMENT.x)).ecg.signal` lead by lead within 1e-4 mV
(Float32); `II = I + III`, `aVR + aVL + aVF = 0`, `aVF = (II + III)/2` on `limbLeadsOfVector` for 36 angles; the
derived axis directions are 0°, 60°, 120°, −150°, −30°, 90°; `NOISE_FACTORS` reproduce the re-assembled leads
with a unit noise series; RA↔RL gives II ≡ 0 and `V′k = Vk − II/3`.

### 2.13 Tests

- `tests/figures/scene.test.ts`: `compileBeats` tiles [0,1]; `anchorBeats` presets on `NORMAL_BEAT.marks` and on a
  generated sinus beat (monotone, `qrs` spans exactly `[qrsOn, qrsOff]`); `beatIndexAt` edges; `local`/`seg` clamp;
  `beatTarget`; `timeOfP`/`pOfTime` round-trip in whole ms; `useScene` with a fake rAF and a fake signal: late
  timeline arms autoplay once, external cursor write stops and seeks, own writes do not re-seek, reduced motion
  mounts at 1 and prev/next land on end frames, `playing` is false after a mid-range seek.
- `tests/figures/einthoven.test.ts`: §2.12.
- `tests/figures/scene-strings.test.ts`: `import.meta.glob('../../src/figures/scenes/*/strings.ts', { eager: true })`;
  for every scene: zh/en/es have the same keys and placeholders, no empty strings, every `BEATS` id has `beat_`,
  beat lengths (§2.8), and the lesson-text gates of `tests/course/lessons-f.test.ts` (outdated terms, Spanish
  decimal comma, zh is Chinese, es ≠ en) applied to all three tables.
- `tests/figures/scenes/<id>.test.ts` (one per scene, using `_shared.ts`): beats tile; **continuity**
  `frame(to_k) ≈ frame(from_{k+1})` within 1e-9 for every beat boundary and for the default state; **end-frame
  completeness** (every label/bracket flag true at `p = 1`); the scene's physiology facts (listed per scene in §4);
  for engine-strip scenes, exact permutation / re-assembly equality instead of continuity across the crossfade.
- Harness checklist per scene before merge: zh / en / es, light / dark, 1366 px and 390 px, reduce-motion on,
  keyboard only.

### 2.14 Ownership and order

1. **Runtime PR** (one engineer, ≈ 1.5 days): `scene/*`, `shared.tsx` extension, `art/*` pure moves (ConductionFigure
   and ElectrodesFigure import from them; their behaviour unchanged, existing tests green), `math/einthoven.ts` +
   test, `projection.ts` arc helpers + test lines in `tests/figures/projection.test.ts`, nine stubs registered,
   harness items, `scene.css`, runtime strings, `scene.test.ts`, `scene-strings.test.ts`, `_shared.ts`.
2. **HeartBlock PR** (§3) — can go in parallel with the scenes once the runtime is in.
3. **Scene PRs** in parallel, one folder each (+ its test + its lesson edits of §5). A scene PR never edits
   `api.ts`, `index.tsx`, `figures.css`, `i18n/figures.ts`, `projection.ts`, `einthoven.ts` or another scene's
   folder; a needed shared helper is a separate tiny PR first.
4. Priority: **P1** (one per lesson, remove the most theory): conduction-journey, vector-pen, triangle-to-wheel,
   moving-paper, electrode-walk, cable-swap. **P2**: three-vectors, noisy-electrode, chest-ring. Until a P2 scene
   lands, its lesson keeps the blocks it would replace (no lesson is ever half-cut).
5. Gate for every PR: `npx tsc --noEmit`, `npx vitest run tests/figures tests/course`, harness checklist, and
   `npm run build` size (today 12 694 461 bytes; budget 14 MB; expected total addition ≈ 150–250 KB).

---

## 3. The 3D heart: upgrade the block, leave `src/heart3d` alone

Decision: **keep and upgrade** the small 3D heart in f1 (it is the only view with real anatomy); the big voxel heart
stays in the Heart Lab, linked. No change to `src/heart3d/*` or its api. All changes in `src/course/blocks.tsx`
`HeartBlock` (≈ 2 h):

- **Timeline.** Replace the hand-rolled rAF loop with
  `useScene({ timeline: ecg?.truth ? phaseBeats(HEART_PHASES, truth.beats[defaultBeat(truth, durationMs)], SLOW_MOTION) : null, autoplay: false, seekTo: 'middle', cursor, target })`.
  Same ×5 slow motion and 1.5–6 s clamp as today; `window = [pOn − 40, tOff + 60]` as today's `t0/t1`; `target` is
  the heart side's wrapper ref (coherent observer semantics even with `autoplay: false`); the shared cursor stays
  the single clock (the heart reads it as today; `markDirty` → one render per cursor change).
- **Transport.** `SceneTransport` under the heart: "Play one beat in slow motion" (= `replay`, keeps `tco('playBeat')`),
  prev / next phase, the six-segment phase bar (`ph_sa` … `ph_t`), scrub slider (`"{ms} ms"`), `×5` chip. `seekTo:
  'middle'` because a phase end is ambiguous in 3D (atria fully lit at the end of P looks like PR). Reduced motion:
  Play puts the cursor in the middle of the QRS (as today); prev/next/bar walk the phase middles.
- **Narration: no second box.** `Heart3D` already prints the engine's phase sentence (`phaseAtrial` … `phaseT`)
  in `.h3d__phase`, a fixed two-line box; the block caption is cut to one sentence (f1.ts). The richer "what it
  draws and why" narration belongs to the conduction-journey scene that follows.
- **Emphasis on the ECG, not the camera.** `emphasize` and `showConduction` stay the lesson's static values
  (`view.ts:515` turns the camera toward newly emphasized walls — a jump). Per phase the block passes one AutoMark to
  `EcgDisplay`: `{ auto: 'p' | 'pr-segment' | 'qrs' | 'st' | 't', lead: 'II', beat: k, color: 'highlight' }` (none
  for `sa`), memoised so its identity changes only at phase boundaries (6 re-resolutions per play, never per frame).
- **Lab link.** A `LinkButton` "See this beat in the Heart Lab" via `labHref('normal-ecg')` next to the transport
  (the lesson page's existing `labLinks` stays; the button is the in-context one).
- **Housekeeping.** Delete the duplicate `reducedMotion()` in blocks.tsx in favour of `prefersReducedMotion` from
  `'../figures'`; `SLOW_MOTION` stays.
- **Position in f1.** The heart block stays right after the hook (3D first, as today); the conduction-journey scene
  follows it ("now the same beat, drawn").

Why not a 3D scene runtime: per-phase camera moves would need animation code outside the timeline, `setOptions`
rebuilds decoration geometry on every emphasis change, and f1's idea (which structure draws which wave) is carried by
the 2D journey; the heart's job is anatomy and the state colours it already has. Verified: the WebGL-less fallback
already exists; the transport works without it.

---

## 4. Scenes (nine; ids kebab-case; every lesson f1–f6 has at least one)

Conventions below: durations are nominal; "W" = wide placement (760 × H), "N" = narrow (420 × H′). Beat narration is
given in English only as the one idea per beat; authors write zh/es fresh (§2.8). "Tests" are the per-scene
physiology assertions beyond tiling/continuity/completeness.

### 4.1 `conduction-journey` — f1 — P1

- **Params** `Record<string, never>`. **Block** `{ kind: 'figure', figure: { id: 'conduction-journey' }, ecg: syn('normal', 111) }`
  (the same heart as the heart block).
- **Title** One beat along the wire: what each structure draws. **Concept** Only muscle draws: the impulse crosses
  five structures, but the pen moves only while atrial or ventricular muscle is active; nodes and His–Purkinje show
  up only as time (the flat PR).
- **Source** the block's synthetic ECG: schematic heart states from `ecg.regions.stateAt` through `statesFromRegions`
  (`math/conduction.ts`, as ConductionFigure's live mode; `timelineAt(truth, t)` fallback), lead II from
  `leadPath(sig, 'II', t0, t1)`, brackets from `truth.beats[k]`. Beats = `phaseBeats(JOURNEY_PHASES, beat, 6)`
  (≈ 4.6 s). Without an ECG: `schematicTimeline('none')` + `NORMAL_BEAT`, no cursor bridge.
- **Layout** W: schematic heart left (paths from `art/conductionArt.ts`), lead-II `PenStrip` right (time runs with
  `p`; the pen draws the real signal), a 120 × 60 action-potential inset under the strip (`apValue('ventricular')`,
  `math/ap.ts`, aligned on `qrsOn`). N: heart over strip over inset.
- **Beats** (one idea each):
  1. `p` — "The sinus node fires; for 40 ms nothing is drawn — too few cells." then "Atrial muscle depolarizes:
     the P wave." SA dot lights, pen glows but stays on the baseline, then the atrial fill spreads RA → LA while the
     pen draws P. End: atria filled, P drawn, label `P < 120 ms`, pacemaker ladder chips `60–100 · 35–60 · 20–40 /min`
     beside SA / AV / ventricles.
  2. `av` — "The AV node holds the impulse: the pen moves but draws nothing." Slow pulse on the node, a stopwatch
     arc fills (`0.02–0.05 m/s` chip), flat line. End: bracket `PR 120–200 ms` from P onset to the QRS-onset mark.
  3. `his` — "His–Purkinje delivers it everywhere at once — still invisible." Bundle and branches light along their
     length (`RevealPath`), chip `2–4 m/s`, pen on the baseline.
  4. `qrs` — "Ventricular muscle: large mass, fast spread — tall and narrow." Septum → free walls → bases fill from
     the region states; the pen draws the QRS; the AP inset fires phase 0. End: bracket `QRS < 110 ms`.
  5. `st` — "Every cell on the plateau: no difference, so a flat ST." Fills hold; AP plateau.
  6. `t` — "Repolarization: slower and broader — the T wave." Fills fade; AP phase 3. End: the whole beat with
     five labelled parts, narration "wire = time, muscle = waves".
- **Interaction** scrub / prev / next / play-beat / replay; the 12-lead under the figure follows the cursor and a
  click on it scrubs the scene; toggle `ctl_labels` (default on). No Predict: the lesson's live PR dial and the WPW
  contrast are the what-ifs and follow immediately.
- **Final frame** lead-II strip with P, PR bracket (120–200 ms), QRS bracket (< 110 ms), ST, T each pointing at its
  structure; the schematic heart in its end-of-T state; the AP inset at phase 4; the 12-lead below with the cursor
  at the end of the beat; lab link via `labHref('normal-ecg')`.
- **Replaces** f1 `text[2]` "Fast cables, a slow gate" (speeds → chips in beats 2–4), `figure[4]` action-potential
  (→ the inset), `criteria[5]` "What each part draws" (→ the end-frame labels and ladder), `worked[6]` "One beat,
  part by part" (→ beats 1–6). Heart caption → one sentence.
- **Tests** beat `qrs` spans `[qrsOn, qrsOff]` of the chosen beat; pen y is on the baseline throughout `av` and
  `his` (|lead II| < 0.05 mV outside P/QRS/T on seed 111); atrial fill > 0 only after `pOn`; end frame has all five
  labels; with no ECG the schematic path produces the same beat ids.

### 4.2 `vector-pen` — f2 — P1

- **Params** `{ axisDeg?: number; lead?: LimbLead }` (defaults +60°, `II`). No block ECG.
- **Title** The heart vector is the pen. **Concept** A lead's deflection at every instant is the projection of the
  heart vector on that lead's axis: toward the positive pole → up, away → down, perpendicular → equiphasic; the same
  loop draws every lead, and T has the QRS polarity because the T vector points near the QRS vector.
- **Source** one schematic frontal loop: `loopPoints` with components septal (≈ +165°, amp 0.18, centre 0.12), main
  (axis, amp 1, centre 0.25, width 0.07, sweep 70°), basal (axis − 170°, amp 0.15, centre 0.38), and T (axis − 15°,
  amp 0.35, centre 0.78, width 0.12); loop time `s ∈ [0, 1]` with a flat ST between 0.45 and 0.6. Leads =
  `projectLoop` on `LIMB_ANGLE_DEG` (unit axes; `II = I + III` exact). Mean QRS vector = area vector of the QRS part.
- **Layout** W: `HexWheel` left (one axis highlighted), `PenStrip` right (paper moves, pen fixed at ⅔), three fixed
  `LeadCell`s under the strip (II / aVL / aVR). N: wheel, strip, cells stacked.
- **Beats** (≈ 8 s): 1 `sum` "Many small fronts add up to one arrow: the heart vector." (small arrows on a faint LV
  outline slide to the centre and merge; axis II highlighted; strip empty) · 2 `drop` "Lead II sees only the shadow of
  the arrow on its axis." (a perpendicular drops to the II axis; a guide line carries the foot's signed distance to
  the pen height; both labelled with the same tabular number) · 3 `draw` "As the arrow turns, the shadow moves: the
  pen draws the QRS." (arrow sweeps the loop, paper moves, pen draws q/R/s; trail stays) · 4 `turn` "Turn the axis:
  the same loop shrinks, passes through equiphasic and inverts." (the highlighted axis rotates II → I → aVL → aVR; the
  complex is recomputed per angle, visibly shrinking to equiphasic at aVL and inverting at aVR; the three cells fill
  as the axis passes them, labelled positive / equiphasic / negative) · 5 `t` "The T vector points near the QRS
  vector, so T follows the QRS." (axis eases back to II; the T component sweeps; the pen draws an upright T; dashed T
  vector beside the mean QRS vector).
- **Interaction** drag the vector / `angleKey` keyboard (loop and cells recompute; snaps to the six axes within 5°);
  six lead buttons pick the highlighted axis; toggle `ctl_all` (six cells, Cabrera order optional). **Predict**
  (after the tour): "At which direction of the vector is lead III equiphasic?" chips `+30°` / `−60°` / `+120°`;
  Reveal rotates the vector from +60° to +30° (`seg` over 900 ms) and III's cell morphs to equiphasic; feedback via
  `deflectionKind(30, 120) === 'equiphasic'`.
- **Final frame** wheel with the mean QRS vector, the loop trail, the highlighted II axis; lead-II strip holding QRS
  + T; the three cells (II positive, aVL equiphasic, aVR negative) with the rule as three chips; the dashed T vector.
- **Replaces** f2 `text[1]` "The dipole rule" (the dipole figure's info box + beats 2–4), `criteria[3]` "The rules
  behind every wave" (rows 1–3 → chips; rows 4–5 → beat 5 + the dipole figure's repolarization mode), `figure[5]`
  vector-loop (the Kors loop returns in s5). Worked 5 → 2 steps.
- **Tests** mean QRS angle of the loop within 3° of `axisDeg` for −90…+180; `projectLoop` on III at axis +30° has
  |net| < 5 % of its peak-to-peak; at axis +60° II net > 0, aVR net < 0, aVL |net| small; T projection on II has the
  sign of the QRS net; the sum of the small arrows in beat 1 equals the mean vector.

### 4.3 `three-vectors` — f2 — P2

- **Params** `{ mainDeg?: number; lateVector?: boolean }` (default 40°, false). No block ECG.
- **Title** Three vectors, two windows: V1 and V6. **Concept** Ventricular activation is three successive vectors
  (septum right-forward, free walls left-back, bases back-right); V1 and V6 see the same three from opposite sides,
  hence rS and qR.
- **Source** `horizontalQrsLoop(mainDeg)` (`projection.ts`: septal −120°, main sweep, basal +110°) projected on
  `PRECORDIAL_DEG` × `PRECORDIAL_GAIN`; the optional late RV vector is one more `LoopComponent` (right-anterior, amp
  0.5, centre 0.9, wide). Time runs ×8 during beats 2–4.
- **Layout** W: `ChestSection` (seen from the feet) left with V1 and V6 axes; two `PenStrip`s right (V1 above, V6
  below); V2–V5 cells slide in below at the end. N: section over strips.
- **Beats** (≈ 7 s): 1 `look` "V1 looks from the right front, V6 from the left side." (axes grow from the centre) ·
  2 `septum` "Vector 1, the septum, left to right: toward V1 (r), away from V6 (q)." (small arrow grows; two drops;
  pens draw r and q together) · 3 `walls` "Vector 2, the free walls, LV-dominant: away from V1 (S), toward V6 (R)."
  · 4 `bases` "Vector 3, the bases, up and back: the small terminal s." (arrows tip-to-tail reveal the loop) ·
  5 `row` "The same three vectors from six places: rS → RS → qR." (V2–V5 cells slide in; transition marked).
- **Interaction** drag the main vector ±40°; toggle `ctl_late` "late right vector" (R′ in V1, broad S in V6 — the
  RBBB contrast follows); scrub / prev / next / replay. No Predict (the hook and checks cover polarity).
- **Final frame** section with the three numbered arrows and the loop; V1 rS and V6 qRs completed with wave labels;
  V2–V5 between them; "same vectors, opposite windows".
- **Replaces** f2 `text[4]` "Three vectors make the QRS"; worked 5 → 2 steps ("confirm rS in V1 and qR in V6 on
  this model ECG", "T upright with the QRS"; same ecg — tested).
- **Tests** `measureRS`: V1 r < S and V6 q small / R tall at 40°; with the late vector V1 ends positive and V6 ends
  negative; `rsTransition` of the six traces is 'normal' at 40°.

### 4.4 `triangle-to-wheel` — f3 — P1

- **Params** `{ cabrera?: boolean }`. **Block** `ecg: syn('normal', 311)` (the hook's ECG: II = I + III is what the
  learner just measured).
- **Title** From three electrodes to six axes. **Concept** Three electrode potentials make six leads by subtraction;
  sliding the triangle's sides and Goldberger's bisectors to one centre gives the hexaxial wheel, and Einthoven's law
  is arithmetic, not coincidence.
- **Source** the block ECG is the one source: `potentialsFromSignal` recovers φ_RA, φ_LA, φ_LL in the WCT gauge from
  the recorded I and II; every limb lead on screen is re-assembled by `assembleHookup` (equal to the recorded leads to
  Float32 precision — the test); the instantaneous frontal vector is `frontalVectorOfLeads(I(t), II(t))`; the wheel
  directions are derived geometry (`u_LA − u_RA` → 0°, `u_LL − u_RA` → 60°, `u_LL − (u_RA + u_LA)/2` → 90°). Window =
  `beatWindow(beats[beatAt(beats, null)])` (`math/kors.ts`), slow ×6.
- **Layout** W: torso outline → triangle → wheel on the left; three `Meter`s and six strips (`PenStrip`, lead
  values from the re-assembly) on the right; identity read-out `I + III − II = 0.00 mV` in a tabular Reserve.
  N: diagram over strips.
- **Beats** (≈ 9 s): 1 `potentials` "Three electrodes record three potentials — and their sum is Wilson's terminal."
  (the beat plays once through the vector; the three meters move; a fourth meter shows the sum pinned near 0: the
  gauge) · 2 `difference` "A lead is a difference: I = LA − RA, II = LL − RA, III = LL − LA." (sides grow with +
  at LA / LL / LL; the three strips draw in turn) · 3 `law` "Add I and III: you get II at every instant." (strip III
  lifts onto strip I, the sum lands exactly on II, read-out 0.00 mV; a small line `aVR + aVL + aVF = 0`) · 4 `slide`
  "Slide the three sides to the centre: 0°, +60°, +120°." (parallel translation, triangle ghosted) · 5 `augment`
  "Compare one limb with the other two: aVR, aVL, aVF bisect the angles — 1.5× the limb potential." (three axes grow
  at −150°, −30°, +90°; their strips appear as computed) · 6 `project` "Six leads, one plane, every 30° — only two of
  them are independent." (degree labels; the six cells hold the beat's complexes; the perpendicular pairs light
  two by two; Cabrera toggle reorders the cells by sliding).
- **Interaction** scrub (linked to the 12-lead below: a click there moves the instant and the meters), prev / next /
  play-beat / replay; `ctl_cabrera`; `ctl_groups` shades II–III–aVF (inferior) and I–aVL (lateral) on the wheel.
  No Predict (check 31002 is that question).
- **Final frame** `HexWheel` over the ghost triangle with degree labels, the beat's mean QRS vector, six mini
  complexes (Cabrera order if toggled), the three perpendicular pairs marked, the identity line
  `II = I + III · aVR + aVL + aVF = 0 · 8 independent signals`; the 12-lead below holding the same instant.
- **Replaces** f3 `text[1]` "Three electrodes, six leads", `figure[2]` hexaxial (HexaxialFigure itself stays for s5
  and the atlas), `criteria[3]` "The hexaxial reference system" (angles, pairs, identities, Cabrera → end frame;
  "only 8 independent" → final narration). Worked 5 → 3 steps.
- **Tests** re-assembled I/II/III/aVR/aVL/aVF equal the recorded leads within 1e-4 mV on seed 311; `max |I + III − II|`
  < 1e-4 over the beat; `frontalVectorOfLeads` round-trips `limbLeadsOfVector` for 36 angles; derived axis angles
  0 / 60 / 120 / −150 / −30 / 90.

### 4.5 `chest-ring` — f3 — P2

- **Params** `{ mainDeg?: number }` (default `DEFAULT_HORIZONTAL_DEG` = 40). No block ECG.
- **Title** A reference that is not on the chest. **Concept** Each chest lead is one electrode minus Wilson's central
  terminal; walking the electrode from V1 to V6 around the section changes where it looks and how close it is, which
  is why R grows, S shrinks and the transition sits near V3–V4.
- **Source** `horizontalQrsLoop(mainDeg)` projected on `PRECORDIAL_DEG` / `PRECORDIAL_GAIN` at the six sites and on
  `precordialAt(s)` (new `projection.ts` helper: angle from `HEART_CENTER` to `chestArcPoint(s)` on the chest-wall
  arc between sites, gain ∝ 1/distance) for the moving electrode; `rsTransition` marks the transition. The WCT beat
  is symbolic (a label), so the picture has exactly one animated source.
- **Layout** W: `ChestSection` centre with the three limb wires meeting at a junction symbol; a ring of six fixed
  `LeadCell`s around it; a small frontal inset bottom-right. N: section, then the six cells in a 3 × 2 grid.
- **Beats** (≈ 8 s): 1 `wct` "Wilson's terminal, the average of RA, LA and LL, is the zero every chest lead is
  measured against." · 2 `one` "V1 = its electrode minus the terminal; from the right front it sees rS." (electrode
  appears at V1; axis; the cell draws) · 3 `walk` "Walk the electrode round to V6: the window turns and comes closer."
  (continuous glide; the axis rotates and the gain follows; at each site it pauses and that cell draws) · 4
  `transition` "Where the lead is perpendicular to the main vector, R = S: the transition, usually V3–V4." ·
  5 `groups` "V1–V2 septal, V3–V4 anterior, V5–V6 lateral; II, III, aVF inferior; I, aVL high lateral." (ring tinted;
  frontal inset tinted).
- **Interaction** drag the main vector (as HorizontalPlaneFigure, keyboard `angleKey`): traces, gains and the
  transition recompute; hover / tap a cell to highlight its axis. **Predict**: "Rotate the heart clockwise (vector
  more posterior): where does the transition go?" chips `V1–V2 (early)` / `V5–V6 (late)`; Reveal rotates 40° → 75°
  and the transition marker walks across the ring.
- **Final frame** section with the WCT junction, the mean vector, six axes, the ring of complexes with the transition
  marked and the lead groups tinted; the frontal inset; "V1–V6: right front → left side, all against the same
  reference".
- **Replaces** f3 `text[4]` "Wilson's central terminal and the chest leads", `figure[5]` horizontal-plane (the figure
  stays for s5), `criteria[6]` "Lead groups" (territories → beat 5; R-progression row → beats 3–4; the aVR row stays in
  pitfalls).
- **Tests** `precordialAt(k)` equals `PRECORDIAL_DEG[Vk]` / `PRECORDIAL_GAIN[Vk]` at integer `s`; angle and gain are
  continuous and monotone in `s`; `rsTransition` is 'normal' at 40°, 'late' at 75°, 'early' at 5°; R/(R+S) rises
  monotonically V1 → V6 at 40°.

### 4.6 `moving-paper` — f4 — P1

- **Params** `{ speed?: 25 | 50; gain?: 5 | 10 | 20 }`. **Block** `ecg: syn('normal', 412, REGULAR_75)` (the worked
  example's heart: RR 800 ms, rate 75).
- **Title** Paper that moves, a pen that does not. **Concept** Every time you read is distance ÷ speed and every
  voltage is height ÷ gain; the calibration pulse tells you both before you measure anything.
- **Source** the block's lead II via `leadPath` with `toX = mmFromMs(t, speed)` and `toY = mmFromMv(mv, gain)`
  (`math/paper.ts`): speed and gain only change the drawing scale — the recording chain, never the heart. RR and QRS
  numbers come from `truth.beats`; the pulse from `calibrationPulse(speed, gain)`. Window = 4 s of the record from
  the first whole beat (≈ 100 mm of paper at 25 mm/s), played at ×1.25 (≈ 5 s). Speed and gain are a draw-scale
  state independent of `p`: the window stays `[t0, t0 + 4000]` and `timeOfP` stays linear through the speed and gain
  morphs, so the cursor bridge is unaffected (the paper moves faster on screen, time does not).
- **Layout** W: viewBox in millimetres (80 × 40 mm, like PaperFigure's 70 × 38 so the minor grid stays legible); a
  fixed pen at two thirds; the paper (`PaperGrid` in true mm) slides left under it; three fixed "receipt" slots above
  the paper keep each calibration pulse that passed; read-outs in a tabular Reserve. N: 48 × 40 mm window (same
  mm units, shorter paper), receipts above.
- **Beats**: 1 `pulse` "1 mV for 200 ms: 10 mm tall, 5 mm wide — the ruler's own stamp." (receipt 1) · 2 `second`
  "25 mm = 1 s, so one small square is 40 ms and one large square 200 ms." (ticks each mm, bold at 25 mm; first beat
  drawn) · 3 `rr` "Four large squares between two R waves: 800 ms, 300 ÷ 4 = 75 per minute." (RR bracket, the
  arithmetic; QRS bracket `≈ 2 small squares`) · 4 `speed` "At 50 mm/s the same heart comes out twice as wide — read
  the speed first." (paper accelerates continuously to 50 mm/s; the RR bracket spans 8 squares while the ms label
  stays 800; new pulse 10 mm wide = receipt 2) · 5 `gain` "At 5 mm/mV every wave is half as tall; the pulse says so."
  (back at 25 mm/s the pen's lever arm halves continuously; pulse 5 mm tall = receipt 3; then back to 10 mm/mV for the
  last beat).
- **Interaction** speed (25 / 50) and gain (5 / 10 / 20) toggles at any time with a continuous 500 ms morph of the
  paper scale (never a cut); the 12-lead below (same source) follows the cursor; scrub / prev / next / play-beat /
  replay. **Predict**: "At 50 mm/s, what will the RR bracket read?" chips `800 ms` / `400 ms` / `1600 ms`; Reveal
  plays beat 4 (the stretch; the ms label does not change).
- **Final frame** the last 80 mm of paper holding the 5 mm/mV pulse and beat and the final standard pulse and beat,
  the RR bracket (800 ms → 75/min) and the QRS bracket on the standard beat, the square values, the three receipts
  labelled `25 mm/s · 10 mm/mV`, `50 mm/s`, `5 mm/mV`; the 12-lead below with its cursor at the end.
- **Replaces** f4 `figure[1]` paper (PaperFigure stays registered), `criteria[2]` "The grid at standard settings"
  (all five rows → beat labels; the 12-lead-sheet row → the `ecg[4]` caption), `text[5]` "Filters" (diagnostic
  numbers → the kept `criteria` "Recording standards" trimmed to 3 rows; monitor effects → the contrast point; mains →
  f6's artefact table). Worked 5 → 3 steps.
- **Tests** at every interpolated speed pulse width × speed = 200 ms and at every gain pulse height ÷ gain = 1 mV;
  RR of seed 412 within ±15 ms of 800 and `hrBpm` ≈ 75; the receipt count equals the number of pulses that passed
  the pen at `p = 1`.

### 4.7 `electrode-walk` — f5 — P1

- **Params** `{ swap?: 'none' | 'v2v3' | 'v1v3' }` (start state). **Block** `ecg: syn('normal', 512)` (the worked
  example's ECG, correct placement).
- **Title** Placing V1–V6: count, level, then look. **Concept** Chest-lead morphology follows electrode position:
  find the 4th space from the sternal angle, keep V5–V6 at V4's level, and an isolated jump in the V1 → V6 sequence
  means a cable or a position, not the heart.
- **Source** the block ECG's V1–V6 over one beat window (`leadPath`) are the strips; a cable swap is an exact
  permutation of those traces (what the engine does — `PLACEMENT.v2v3` swaps traces bit for bit; the test compares
  with `generate` under that placement). The torso and landmarks come from `art/torsoArt.ts` + `data/electrodes.ts`
  (`ELECTRODES`, `icsY`, `LINES`). Nothing is interpolated between sites: between landings only the electrode moves.
- **Layout** W: torso front (420 × 520 scaled into the left half) with a back-view inset for beat 5; six fixed
  `LeadCell`s + an R/(R+S) staircase on the right. N: torso, then the cells in a 3 × 2 grid.
- **Beats** (≈ 8 s): 1 `count` "Find the sternal angle — the 2nd rib — and count down to the 4th space: V1 right,
  V2 left of the sternum." (a hand-cursor lands and steps rib by rib; V1/V2 snap; their cells draw) · 2 `level` "V4
  in the 5th space on the midclavicular line, V3 between; V5 and V6 at V4's level, never down the space." (V4, V3
  drop in; a level line from V4; V5, V6 slide along it; a ghost electrode shows the wrong sloping path and fades) ·
  3 `walk` "From V1 to V6 the R grows and the S shrinks step by step — no jumps." (the recording electrode moves
  continuously along the placed sites; the strips are engine traces, so each cell is *revealed* by its `PenStrip` at
  the landing and never interpolated between sites — the continuity test diffs the electrode position and excludes
  reveal fractions, each landing being a sub-beat boundary; the staircase rises; transition flagged) · 4 `swap` "Swap two
  cables and the staircase breaks: the heart never jumps between neighbours." (V2 and V3 cables cross continuously;
  at the crossing the two cells exchange their traces — an exact permutation; the step down-then-up is highlighted) ·
  5 `extra` "V4R mirrors V4 for the right ventricle; V7–V9 on the back at V6's level for the posterior wall." (back-view
  inset; chips `ST ≥ 0.5 mm`; no strips — these leads matter on infarction tracings, lessons i4 and i6).
- **Interaction** drag any chest electrode onto another standard site → the cells permute (a cable swap) and the
  jump appears; `ctl_reset`; toggle the ghost "along the space" error; scrub / prev / next / replay; the 12-lead
  below shows the correct recording for comparison. No Predict (checks 51001 / 51003 are the application).
- **Final frame** torso with V1–V6 (and V4R, V7–V9) at their landmarks and the V4 level line; the six cells in
  correct order with the R/(R+S) staircase and the transition; the swap jump as a small "before" row; "count from the
  sternal angle; V5–V6 at V4's level; a jump = check the electrodes".
- **Replaces** f5 `figure[1]` electrodes (ElectrodesFigure stays registered), `criteria[2]` "Chest electrodes" (→
  landmark labels in beats 1–2, incl. the women row as a label), `text[6]` "Extra leads", `figure[7]` electrodes
  (extra) (→ beat 5). Worked 4 → 2 steps.
- **Tests** the permuted V2/V3 cells equal `generate(syn('normal', 512, undefined, PLACEMENT.v2v3)).ecg.signal`
  lead by lead; R/(R+S) is monotone V1 → V4 for the correct order (same assertion as the lesson test) and not after
  the swap; every electrode lands on `ELECTRODES[id]` coordinates at the end of beat 2.

### 4.8 `cable-swap` — f6 — P1

- **Params** `{ start?: 'correct' | 'laRa' | 'laLl' | 'raLl' | 'raRl' | 'laRl' }`. **Block** `ecg: syn('normal', 611)`
  (the hook's heart, correctly recorded — the swap recreates the hook's tracing).
- **Title** Swap two cables, watch six leads. **Concept** Limb leads are differences of three electrode potentials,
  so a cable reversal permutes and inverts them in a fixed pattern; swaps among RA/LA/LL leave the chest leads
  untouched because Wilson's terminal is symmetric — and a lead whose two cables sit on the legs goes flat.
- **Source** the block's one synthetic ECG: `potentialsFromSignal` → `assembleHookup(phi, hookup)` for every hook-up
  (exact against the engine's `PLACEMENT` presets); the V row is re-assembled too (RA↔RL shifts it by −II/3 — shown
  honestly). Window = one beat (`beatWindow`), ×5.
- **Layout** W: torso with the four limb plugs and cables to a small recorder (left); six fixed limb strips (3 × 2)
  and a thin V1–V6 row (right); a signature table that fills during playback. N: torso, strips 2 × 3, V row.
- **Beats** (≈ 9 s): 1 `potentials` "Each cable records the limb it is clipped to; a lead is a difference of two."
  (three meters; formulas beside each strip; strips draw; RL labelled "neutral: in no formula") · 2 `laRa` "Swap LA
  and RA: I turns upside down, II and III change places, aVR and aVL change places, aVF stays." (the two cables cross
  continuously; at the crossing the strips crossfade (300 ms) to the exact re-assembly; signature row fills) · 3
  `wct` "The chest leads use the average of all three — any order, same average: V1–V6 unchanged." (wires join into
  the WCT symbol; ✓ on the V row) · 4 `raRl` "Clip the arm cable to the right leg: both ends of II sit on the legs —
  flat." (cables return, then RA↔RL cross; II collapses to a line, I = −III, aVF = III/2; the V row shifts a little —
  label "only swaps among the three limbs leave V1–V6 alone"; a small second row shows LA↔RL → III flat).
- **Interaction** click two plugs to swap them (any pair incl. RL) — strips and the signature row recompute exactly;
  `ctl_reset`; toggle `ctl_formulas`; `ctl_dextro` points at the unchanged chest leads as the discriminator; scrub /
  prev / next / play-beat / replay; the 12-lead below (correct hook-up) for comparison. **Predict**: "LA ↔ LL: which
  lead is inverted?" chips `I` / `II` / `III`; Reveal applies the hook-up and highlights III (from `hookupSignature`).
- **Final frame** torso with the RA↔RL hook-up, six limb strips (II flat), the shifted V row, and the signature table
  built from what was shown (LA↔RA: I inverted, aVR⇄aVL, II⇄III, V same · LA↔LL: I⇄II, aVL⇄aVF, III inverted ·
  RA↔LL: II inverted, aVR⇄aVF, aVL same · RA↔RL: II flat · LA↔RL: III flat · V1–V6 unchanged only for swaps among
  RA/LA/LL); the chip "I inverted + aVR upright + normal chest leads = arm cables, not dextrocardia".
- **Replaces** f6 `text[1]` "The 30-second check" (→ the worked block's five steps on the hook ECG, bodies ≤ 1
  sentence, and summary point 1), `criteria[3]` "Limb-cable reversal signatures" (→ the table the scene builds),
  `figure[6]` electrodes (→ noisy-electrode beat 2).
- **Tests** `assembleHookup` under each preset equals the engine's recording (oracle, §2.12); `hookupSignature`
  matches the table above; II peak-to-peak < 0.05 mV under RA↔RL; V unchanged bit for bit under LA↔RA, LA↔LL,
  RA↔LL.

### 4.9 `noisy-electrode` — f6 — P2

- **Params** `{ electrode?: 'RA' | 'LA' | 'LL'; noise?: 'tremor' | 'mains' | 'wander' | 'emg' }` (default LL, tremor).
  **Block** `ecg: syn('normal', 618)` — a **clean** recording (never the `muscle-tremor` scenario: its I and II already
  carry the noise, so the recovered potentials would be noisy and the scene would double it).
- **Title** Which electrode is shaking? **Concept** Noise on one limb electrode appears in the two bipolar leads that
  use it and is largest in its augmented lead, half in the other two, a third in V1–V6 through Wilson's terminal; QRS
  complexes marching through unchanged mark it as artefact.
- **Source** the same potential model as cable-swap with one additive electrode term: `φ_e += n(t)`, `n` from a
  seeded generator in the scene's `math.ts` (`createRng` from `src/core/rng`; tremor 5 Hz × slow envelope, mains
  50 Hz, wander 0.3 Hz, EMG band-limited white 20–60 Hz), amplitude 0–0.3 mV; the leads follow by the formulas
  (`NOISE_FACTORS` are the test assertions). The ECG itself is the block's synthetic normal. Window = 2.5 s (three
  beats, so the march-through is visible), ×2.
- **Layout** W: torso with RA, LA, LL (left; the chosen electrode jitters by a small transform); six fixed limb strips
  and a thin V1–V6 row (right); the culprit table below. N: torso, strips 2 × 3, V row, table.
- **Beats** (≈ 7 s): 1 `shake` "The left-leg electrode shakes: its potential carries the noise." (noise amplitude
  ramps 0 → 1 continuously; II and III fill with noise, I stays clean; factors appear as chips −n, −n, 0, +n, −½n,
  −½n; V −⅓n) · 2 `find` "Noisy in two bipolar leads, clean in the third: their shared electrode — largest in its
  aV lead." (II and III light; LL pulses; first table row) · 3 `move` "Move the noise to the arm and the pattern moves
  with it." (the noise crossfades LL → LA → RA between the potentials; each state adds a table row) · 4 `heart` "The
  QRS complexes march through unchanged: artefact, not flutter." (back on LL at 5 Hz — the 300 /min saw-tooth in II,
  III, aVF; the QRS complexes outlined at the unchanged RR; the flutter-vs-tremor contrast follows).
- **Interaction** click an electrode to move the noise; noise-type toggle; amplitude slider; scrub / prev / next /
  replay. **Predict**: "Which limb lead will stay clean?" — click a strip (I / II / III); Reveal re-assembles and
  marks it.
- **Final frame** torso with the noise on LL, six strips (II, III, aVF noisy, I clean, aVF largest), the V row
  faintly noisy, the three-row culprit table (RA → I + II / aVR; LA → I + III / aVL; LL → II + III / aVF) and the
  "QRS marches through" outline.
- **Replaces** f6 `criteria[5]` rows 1–3 (→ the table the scene builds; rows 4–6 become a kept 3-row card "Artefact
  signatures": mains / tremor / wander), `text[7]` "Artefacts that look like disease" (→ beat 4 + the contrast
  point).
- **Tests** with noise on LA: rms(II − clean II) ≈ 0, rms in I = III = aVL, aVR = aVF = ½, every Vk = ⅓ (within 1 %);
  the same for RA and LL rows; the sequence is identical for the same seed; the clean lead's QRS onsets equal the
  truth's `qrsOn` (nothing moved).

---

## 5. Text policy per lesson

**Rules.** (1) The player shows one block per step, so every cut block is a step the learner no longer reads; scenes
carry the theory, prose survives only where a picture cannot hold it. (2) No standalone `text` block remains in
f1–f6 (9 → 0): each becomes a label at the beat where it matters, a chip, a scene table built during playback, or
a scene's narration; a scene's `caption` (≤ 2 lines) replaces the lead-in paragraph. (3) `criteria` cards survive
only as genuine reference tables of ≤ 3–4 rows (12 → 4): f4 "Recording standards" (high-pass, low-pass, sampling),
f5 "The two colour codes" (IEC, AHA, Mason–Likar note), f5 "When to add them" (3 rows), f6 "Artefact signatures"
(mains, tremor, wander). Every kept card keeps its `source` (the validator warns without one and the F test demands
zero warnings). (4) `worked` blocks stay (reads on the viewer) but shrink to the steps a scene cannot do — calipers,
lead highlights, a model 12-lead: f1 cut, f2 5 → 2, f3 5 → 3, f4 5 → 3, f5 4 → 2, f6 5 → 5 (bodies ≤ 1 sentence;
the five steps are the procedure the lesson teaches) — 29 → 15 steps; their `ecg` sources are unchanged. (5) Never
cut `hook`, `live`, `contrast`, `check`, `drill`, `real`, `summary`; keep the order within each kind (the pinned
indexes of §0). (6) Pitfalls ≤ 3 bullets; summary 3–5 points, the first one the lesson's first scene's closing
narration. (7) Captions of figure / heart / live blocks ≤ 2 sentences that never repeat the narration; contrast
`point` texts ≤ 3 sentences (f4 filters and f6 tremor are 7–8 today). (8) Numbers stay (rule 6 of §1); the card's
`source` string moves into the lesson's `sources` when the card goes. (9) Update `minutes` after the cut
(≈ 40 s per scene tour + interaction): f1 9 → 8, f2 11 → 10, f3 12 → 10, f4 10 → 9, f5 11 → 10, f6 12 → 11.
(10) Lesson edits land in the same PR as their scene; until a P2 scene lands its lesson keeps the blocks it would
replace.

**Before → after (block = step).**

- **f1** 15 → 12: hook · heart (upgraded, one-sentence caption) · **conduction-journey** · live PR dial · contrast WPW ·
  check · check · check · drill · real · pitfalls (3) · summary (5). Cut: `text[2]`, `figure[4]` action-potential,
  `criteria[5]`, `worked[6]`.
- **f2** 15 → 13: hook · figure dipole · **vector-pen** · **three-vectors** · worked (2) · live axis dial · contrast RBBB ·
  check · check · drill · real · pitfalls (4 → 3) · summary (4). Cut: `text[1]`, `criteria[3]`, `text[4]`, `figure[5]`
  vector-loop.
- **f3** 16 → 12: hook · **triangle-to-wheel** · **chest-ring** · worked (3: Einthoven check, equiphasic lead,
  perpendicular lead) · contrast · check · check · check · drill · real · pitfalls (4 → 3) · summary (4). Cut:
  `text[1]`, `figure[2]` hexaxial, `criteria[3]`, `text[4]`, `figure[5]` horizontal-plane, `criteria[6]`.
- **f4** 15 → 13: hook · **moving-paper** · worked (3: pulse first, RR → rate, calipers) · ecg sheet (caption gains the
  "3 × 4 + rhythm strip" row) · contrast filters (point ≤ 3 sentences) · criteria Recording standards (3 rows) ·
  check · check · check · drill · real · pitfalls (4 → 3) · summary (4). Cut: `figure[1]` paper, `criteria[2]`,
  `text[5]`.
- **f5** 16 → 13: hook · **electrode-walk** · criteria colour codes · worked (2: find the transition, V5–V6 look like
  I/aVL) · contrast V1/V3 · criteria When to add them · check · check · check · drill · real · pitfalls (5 → 3) ·
  summary (4). Cut: `figure[1]`, `criteria[2]`, `text[6]`, `figure[7]`.
- **f6** 17 → 15: hook · **cable-swap** · worked (5, one-sentence bodies) · contrast flat lead · **noisy-electrode** ·
  criteria Artefact signatures (3 rows) · contrast flutter / tremor (point ≤ 3 sentences) · check × 4 · drill ·
  real · pitfalls (5 → 3) · summary (5). Cut: `text[1]`, `criteria[3]`, `figure[6]`, `text[7]`; `criteria[5]`
  trimmed to its last three rows.

Total 94 → 78 steps; theory-only blocks (text + criteria + worked) 27 → 9 (4 criteria + 5 worked, 15 steps); every
lesson has at least one narrated, scrubbable scene before its first check. `tests/course/lessons-f.test.ts` needs
no change under this policy (hook first, summary last, pinned kinds in order, same ECG sources); any further cut
edits that test in the same PR.

---

## 6. Risks and budget

1. **Build size.** `dist/index.html` is 12 694 461 bytes (budget 14 MB). Runtime + nine scenes + three languages ≈
   250–350 KB of source → ≈ 150–250 KB minified; no assets, fonts or dependencies. Reuse `draw.tsx`, `art/*`,
   `einthoven.ts`; measure with `npm run build` after each merge.
2. **Late ECG.** The one runtime behaviour that decides first-visit correctness (§2.6 item 1); tested with a fake rAF.
3. **Frame cost.** Per-frame work is transforms, one pen, ≤ 3 drops; paths memoised; `frameGate`; verify on a phone
   in the harness; the cursor write per frame is today's HeartBlock behaviour.
4. **390 px.** Two placement tables per scene (§2.7 `layout.ts`); labels ≥ 11 / 12 units; hit targets ≥ 24 px; the
   harness checklist is the gate.
5. **Model honesty.** Schematic loops are labelled (`scSchematic`); the 0.866 augmented-lead factor is documented once
   (`einthoven.ts`, `scModel`); WCT is exactly 0 only in the ideal triangle ("nearly zero" narrated); T is explained
   as "T vector near the QRS vector" (the why — two reversals cancel — stays in the dipole figure); RA↔RL does shift
   V1–V6 by −II/3 and the scene says so; R height is not monotonic across V1–V6 (gain peaks at V3–V4), so progression
   checks use R/(R+S).
6. **Test coupling.** §0 lists the pinned blocks; §5 keeps them; the live-block assertions (f1 PR dial, f2 axis dial)
   stay where they are because the blocks stay.
7. **Scope.** triangle-to-wheel and vector-pen are the heavy ones (≈ 5–6 h each); moving-paper and cable-swap ≈ 4 h;
   the rest 3–4 h with the reused maths. If a P2 scene slips, its lesson keeps its current blocks.
8. **Reduced motion.** `p = 1` on mount → every end frame complete (tested); prev / next / bar are buttons; the range
   input is labelled; Predict reveals cut to the end frame.
9. **Content volume.** ≈ 45 beats × 3 languages + labels: the same medical and language review passes as lesson text
   (`scene-strings.test.ts` applies the lesson-text gates automatically).
10. **Working tree.** The repository carries unrelated uncommitted changes (assistant module, package.json); this
    design touches none of them and nothing is committed.

## 7. Verification

Design only: no files under `src/` or `tests/` were created or changed, so `npx tsc --noEmit` and `npx vitest run`
were not run for this document. The first implementation PR (the runtime) adds `tests/figures/scene.test.ts`,
`einthoven.test.ts`, `scene-strings.test.ts` and `scenes/_shared.ts` before any lesson edit.
