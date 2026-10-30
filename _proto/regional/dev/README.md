# dev/ — development and calibration tools (not part of the deliverable)

Small scripts used while building and tuning the regional-dipole model. Run from the `regional/` folder, e.g.
`node dev/dev_cond.ts lbbb '{"vcond":{"vEndo":0.12}}' I,V1,V6 8 160`.

- `dev_cond.ts` — run a condition with a JSON patch and print chosen leads (mm) every few ms.
- `dev_stm.ts` — J / J+40 / J+80 / T-peak table for all leads (ST tuning).
- `dev_lead.ts`, `dev_leadT.ts` — per-region contribution to one lead (needs `simulate(..., { trace: true })`).
- `dev_vc.ts`, `dev_windows.ts`, `dev_graph.ts` — activation windows / conduction graph.
- `dev_truth.ts`, `dev_truth2.ts`, `dev_meas.ts` — calibration of the truth thresholds against signal measurement.
- `dev_fl.ts` — per-segment decomposition of the flutter wave; `dev_brug.ts` — Brugada region grid search.
- `tune.ts`, `tune2.ts`, `tuneT.ts` — the one-off calibrations of the normal heart (QRS loop and T-wave map) from the
  first run. They still type-check and run, but they were written before the sweep bins / truth thresholds and their
  outputs were baked into `conduction.ts` / `model.ts` by hand; re-running them is not part of the normal workflow.
- `vcg.ts` — prints the Kors-reconstructed heart vector of one beat.

Review tools (2026-10-17; all take a JSON patch merged like `dev_cond.ts`; `"regions!"` replaces the regional modifiers
instead of merging them):

- `probe.ts` — one condition + patch → `dev/tmp/<name>.json` (render it with the harness) and a per-lead table of QRS
  extrema, J / J+40 / J+80 and T extrema.
- `sweep.ts` — list of patches → R/S, notch depth, half-height width, J+40, T per lead (QRS morphology tuning).
- `tgrid.ts` — list of patches → T-wave notches / second humps per lead + T amplitudes + QTc (hyper-K tuning).
- `stgrid.ts` — list of patches → J / J+40 / T of every lead (ST and reciprocal-change tuning, STEMI / Brugada / LVH).
- `flgrid.ts` — list of flutter-circuit patches → F-wave extrema per cycle and F min / max in II, III, aVF, V1.
- `frscan.ts` — flutter F–R interval scan: truth vs signal-measured axis / QRS / QT.
- `dev_win.ts` — activation windows of every face for a condition (+ vcond patch); `dev_vtwin.ts` the VT variant.
- `dev_repol.ts` — repolarisation midpoint of every face, sorted; `dev_hump.ts` — LVH ST-T shape.
- `cmp_ref.ts` — max |difference| per lead between the current engine and a reference `out/` folder.
- `dev_lead.ts` now takes an optional 5th argument (JSON patch).
