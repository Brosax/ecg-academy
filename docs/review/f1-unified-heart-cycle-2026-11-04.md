# F1 unified heart cycle

The first four F1 anatomy topics share a single interactive heart. Wall motion, electrical activation, valves, blood flow and the six translated explanations follow the same normal cycle. The default half-speed demonstration takes 20 seconds. Seeking or selecting a phase reveals the corresponding state immediately.

## Verification

- Type checking and the single-file production build passed.
- Full regression run completed with 4,695 tests passed and 5 skipped across 223 passing and 4 skipped files. The final focused foundations and assistant run passed all 160 tests.
- Five new cycle checks cover event order, continuity, translated phase selection, valve-gated flow and reproducible backward seeking.
- Browser walkthrough covered six phases in Chinese, English and Spanish at 1366, 390 and 320 pixels wide. All 54 combinations retained one canvas, fit horizontally and kept the stage height stable across phase changes at each language and size.
- Manual checks covered playback through filling, pause, replay controls, seeking, repetition, visual amplitude, model rotation, cutaway and all six keyboard-accessible reduced-motion frames. Narrow layouts were checked using browser viewports. Physical touchscreen testing remains outstanding.

The screenshots show [ventricular ejection](foundations-screenshots/f1-unified-ejection-zh.jpg), [the same instant with visual deformation set to zero](foundations-screenshots/f1-unified-ejection-zero-amplitude.jpg) and [filling](foundations-screenshots/f1-unified-filling-zh.jpg). Measurements and interaction observations are in the [walkthrough record](foundations-screenshots/f1-unified-walkthrough.json).
