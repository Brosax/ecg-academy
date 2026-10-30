# Heart Lab (`src/lab/`)

The Heart Lab is the old **Dynamic Electrocardiogram** app — a voxel 3D heart driving a live 12-lead ECG (overview,
electrodes & leads, section, disease library, blood flow, click-to-freeze, Wiggers, quiz, guided tour) — running as one
self-contained section of ECG Academy (`#/lab`, `#/lab/<scenarioId>`). Decision of 2026-10-17: ECG Academy is the
main site; the lab keeps its own engine. Lessons, drills, atlas and exam use the new synthesizer (`src/synth`). **Do
not mix the two**: nothing outside `src/lab` imports lab internals (only `src/lab/index.tsx`), and the lab imports from
the host only `src/app/store.ts` (language/theme bridge) and the `FindingId` type of `src/core/findings.ts`.

## Provenance

Copied byte-for-byte on 2026-10-17 from `C:\Users\A511741\Desktop\Workspace\Dynamic Electrocardiogram` at git HEAD
`7de3b39` ("Blood flow layer (schematic) …") **plus its uncommitted working tree** of that day (blood-flow phase 2:
`sim/measure/mechanics.ts`, `view3d/core/{lvotSlice,venousTiming,vesselPaths}.ts`, `view3d/flowParticles.ts` and the
modified flow, Wiggers, engine, truth and i18n files). The old project is read-only reference; it was not modified.

| old | new |
|---|---|
| `src/**` | `src/lab/**` (same relative layout, so relative imports are unchanged; `main.tsx` deleted) |
| `src/assets/heart-hra.bin`, `body-hra.bin` | `src/lab/assets/` (baked HRA heart and skin) |
| `tests/**` (minus generated `tests/out`) | `tests/lab/**` (relative paths rewritten; outputs now go to `tests/out/lab/`) |
| `docs/research/**` | `docs/lab-research/**` (cited research behind the model; start at its `README.md`) |
| `assets/models/README.md` | `docs/lab-research/models-README.md` (model provenance, licences, changes made) |

Files changed by the port (everything else is identical to the old tree): `app/App.tsx`, `app/engine.ts`,
`app/persist.ts`, `app/theme.ts`, `app/Shell.tsx`, `app/ui/Header.tsx`, `app/ui/AboutDialog.tsx`, `app/ui/controls.tsx`,
`app/modes/leads.tsx`, `ecg/canvas.ts`, `view3d/scene.ts`, `i18n/shell/{zh,en,es}.ts`, the five CSS files,
`ecg/dev/harness.tsx`; new: `index.tsx`, `links.ts`, `bridge.ts`, `app/deepLink.ts`, `dev/`.

## The lab's own rules (from the old project's CLAUDE.md, still binding inside `src/lab`)

- **One source (voxel rule).** Every lab ECG sample is `LeadProjector · H(t)`, with `H(t) = H_A + H_V` coming only from
  voxel activation/repolarization through the voxel-face EDL source `H(t) = −gain · Σ c_v · s_v(t)` (`Σ c_v ≡ 0`). Never
  draw or edit a waveform per lead and never add hand-made waves (Ta, U, f-waves…). A disease may only change the rhythm
  generator, the conduction graph, voxel/region parameters or geometry. The 3D colouring, the slice view and the ECG read
  the same activation/APD fields.
- **Frames & units.** Heart-local mm (+y apex→base, +z anterior, +x LV lateral); app/three.js cm (+x patient left,
  +y superior, +z anterior); Frank (+X left, +Y inferior, +Z posterior). Convert only with `sim/frame.ts`; disease-spec
  vectors via `specToApp`. Time ms (float64 on the CPU; shaders get beat-relative times), voltage mV.
- **Former frozen contracts, now internal to the lab:** `sim/types.ts`, `sim/frame.ts`, `app/store.ts`,
  `app/commands.ts`, `app/clock.ts`, `app/App.tsx`, `app/engine.ts`, the token set of `app/theme.css`,
  `view3d/gpuContract.ts`, `i18n/index.ts`, `i18n/common/*`, and the public props of `view3d/index.tsx` / `ecg/index.tsx`.
  Change them deliberately and keep the lab tests green.
- Never read `store.time.value` in a Preact render (render loops use `store.time.peek()`; info cards use `store.now`).
- i18n per module in `i18n/<module>/{zh,en,es}.ts` with `defineDict`; shared terms via `tc()`. Spanish in Spain usage.
- The lab's test oracles (`tests/lab/oracle/**`) check every disease scenario against `docs/lab-research/disease-spec.json`.

## Entry and host integration (`index.tsx`)

`LabPage({ scenario? })` renders `<div class="lab-root"><div class="lab-viewport"><App/></div></div>`. Also exported:
`labScenarioIds()`, `LAB_SCENARIOS` / `labHref(findingId)` (from `links.ts`) and `LAB_MODEL_CREDITS`.

- **Size.** `.lab-root` is `100dvh − --lab-offset-top` high, where `--lab-offset-top = var(--app-header-h, 56px) + 1px`
  (the host header's bottom border); at ≤ 760 px the host's fixed tab bar (`--app-tabbar-h`) is subtracted as well. It
  must be rendered **full-bleed** (no padding/max-width around it). `.lab-viewport` is the lab's own scroller (the old
  app scrolled the document; on narrow screens the lab now scrolls inside its box).
- **Engine lifecycle.** `app/engine.ts` `loadLabOnce()` builds the engine and its commands once per page load and caches
  them at module level (a failed load is retried on the next mount). A revisit renders the Shell immediately (no loading
  screen); only the WebGL scene is recreated (the packed field volume is cached per engine fields in
  `view3d/scene.ts`). The clock, persistence and theme effects run only while `App` is mounted; `HeartView` disposes
  its renderer, geometries, controls and listeners on unmount. The lab store (time, mode, scenario, layers…) survives
  between visits.
- **Deep links.** `LabPage({ scenario })` → `app/deepLink.ts` `openScenario()` → `commands.setMode('disease')` +
  `commands.setScenario(id)` (serialised; unknown ids ignored). `links.ts` maps 56 ECG Academy findings onto the 40 lab
  scenarios (every scenario is reachable). The lab does not write the URL when the student picks another condition.
- **Keyboard.** Space / ←→ / 1–4 are bound on `window` only while the Shell is mounted, and act only when the key is
  aimed at the lab (focus inside `.lab-root`, or nothing focused) — never on host header/menu focus, form fields,
  contenteditable or open dialogs. The skip link focuses `#lab-main` without changing the hash (hash = route here).
- **Persistence.** The lab keeps its own key `dyn-ecg:prefs:v1` (electrode colour standard IEC/AHA). Language and theme
  are not stored by the lab any more.

## Bridges (`bridge.ts`)

- **Language.** `syncFromHost()` (once, before the first lab render) and `installHostBridge()` (while mounted) copy the
  host `store.lang` / `store.theme` (`src/app/store.ts`) into the lab store. The lab header's own language and theme
  buttons were removed (and their i18n keys), so the host header is the single switch.
- **Theme.** The host owns `<html data-theme>` (and `<html lang>`); the lab never writes them. Lab tokens are defined on
  `.lab-root` and `:root[data-theme='dark'] .lab-root`. `app/theme.ts` bumps `themeVersion` on the lab theme change
  (deferred to a microtask, after the host has written the attribute) and on any `data-theme` mutation, so canvases and
  three.js re-read colours; `readThemeColors(el)` reads from the view's own host element (inside `.lab-root`).

## CSS isolation

Both apps' CSS ship in one bundle, so:

- **Lab → host:** every lab rule is prefixed with `.lab-root` (`:root` → `.lab-root`, `:root[data-theme='dark']` →
  `:root[data-theme='dark'] .lab-root`; `*`, `:focus-visible` etc. scoped; the old `html, body` base styles moved onto
  `.lab-root`). `.lab-root` is a size container (`container: lab / size`) with layout containment: viewport units became
  `cqw`/`cqh` (except the About `<dialog>`, which lives in the top layer) and width/height `@media` queries became
  `@container lab (…)`; `position: fixed` drawers/sheets are contained in the lab box instead of covering the host header.
- **Host → lab:** classes used by both were renamed in the lab (CSS + TSX): `app` → `lab-app`, `app-e` → `lab-app-e`,
  `app-header` → `lab-app-header`, `app-footer` → `lab-app-footer`, `app-loading` → `lab-app-loading`, `swatch` →
  `lab-swatch`; the duplicate landmark `<main id="main">` became `<section id="lab-main">`.
- `tests/lab/cssIsolation.test.ts` re-checks both directions against **all** host CSS on every run (scoping, host class
  selectors that could match lab elements, ids, `@keyframes`), so a host class added later that could match a lab element fails the test suite instead of silently restyling the lab.

## Dev mount page (`dev/`)

`npx vite --port 5391 --strictPort`, then open `http://localhost:5391/src/lab/dev/index.html`: the host's theme/shell/ui
CSS and store (with its persistence), a stand-in header from the host's header classes (mount/unmount, zh/en/es,
light/dark, scenario deep link) and `<LabPage>` full-bleed. `window.__labDev` exposes the same actions
(`mount/unmount/setLang/setTheme/open/state`) for scripted browser checks. Not part of the build.
`dev/browser-check.mjs` drives that page in headless Edge over CDP (23 checks: render, lang/theme bridge, shortcut
scoping, fixed-drawer containment, deep link, host styles unaffected, unmount/remount leaks, 1366/phone layout, console);
usage in its header.
`ecg/dev/harness.html` is the old ECG-components harness (stub engine), now wrapped in `.lab-root`.

## Tests

`npm run test:lab` (= `vitest run tests/lab`, ≈ 60–70 s; also part of `npm test`). Env-gated and skipped by default:
`bake/bake.test.ts`, `bake/body.test.ts` (rebuild the assets: `BAKE=1`, needs the raw HRA GLBs in `assets-raw/hra/`),
`bake/slices.test.ts` (`BAKE=1` or `HRA_PNG=1`), `calibrate/calibrate.test.ts` (`CALIBRATE=1`). Image/JSON outputs go to
`tests/out/lab/` (git-ignored).

## Credits to show in About

The lab's realistic anatomy is adapted from Human Reference Atlas (HuBMAP) 3D reference organs, **CC BY 4.0**
(details and the changes made: `docs/lab-research/models-README.md`; text lines: `LAB_MODEL_CREDITS`):

- HRA 3D Reference Organ — Heart, Male (VH_M_Heart) v1.3, Browne K, Schlehlein H — https://doi.org/10.48539/HBM564.WKNG.249
- HRA 3D Reference Organ — Blood Vasculature, Male (VH_M_Blood_Vasculature) v1.3 — https://doi.org/10.48539/HBM473.XTPP.725
- HRA 3D Reference Organ — Skin, Male (VH_M_Skin) v1.3, Browne K, Schlehlein H — https://doi.org/10.48539/HBM527.FMBB.748

The conduction system, electrode sites and landmark lines were added by this project. The lab's own About dialog
already lists these credits and its key references.
