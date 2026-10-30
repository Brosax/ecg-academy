# Research corpus

Five read-only research passes (2026-10-08) that ground the simulator. Each topic has a `.json` (machine-readable, used by tests) and a `.md` (human-readable).

| File | Content |
|---|---|
| activation-physiology | conduction timeline, velocities, APD gradients, AP templates, mechanics timing, VCG targets |
| lead-geometry-anatomy | electrode placement, Dower/inverse-Dower/Kors matrices, heart pose, chamber dimensions, coronary territories, conduction-system anatomy |
| dipole-model-design | EDL source model, ventricular gradient, injury currents, atrial/flutter/AF sources, calibration risks |
| disease-spec | 40 rhythm/disease entries with numeric criteria, model hooks, 3D animation spec and machine-checkable oracles; normal reference values |
| tech-stack | versions (three r186, Vite 8, TS 7, Vitest 5), cross-section & shader techniques, prior art & licences |
| haemodynamics (`.md` only, 2026-10-16) | passive filling vs atrial kick, IVCT / ejection / IVRT, EDV / ESV / SV / EF, SaO2 / SvO2 and the red / blue convention, LV transit fractions; §6 beat-to-beat mechanics (rate-scaled QS2 / IVRT, SV from filling time and RR, PESP, AF pulse deficit, cannon a waves, PVC cycle truth); for the schematic blood-flow layer and the Wiggers panel |

Coordinate note: the disease-spec entries use body frame +x patient-left, +y inferior, +z anterior. The app uses +x left, +y superior, +z anterior; Frank is +X left, +Y inferior, +Z posterior. Convert with `src/sim/frame.ts` (`specToApp`, `appToFrank`).
