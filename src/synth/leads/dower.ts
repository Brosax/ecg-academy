/**
 * Dower's forward lead-vector rows (US patent 5,711,304, G. E. Dower): lead = a·X + b·Y + c·Z, mV of lead per mV of
 * Frank heart vector, referenced to Wilson's central terminal. The standard rows are the empirical, torso-corrected lead
 * field of the engine at the nine standard electrodes (DECISION §6.2).
 *
 * Extra rows (DECISION §13.1, verified 2026-10-17, re-checked against the patent text 2026-10-19: every WCT row equals
 * equation (1) minus the RA → WCT shift to the third decimal, except the V7 y sign below): the patent also lists V3R, V4R, V5R, V7, V8 and V9, derived from
 * Frank's image surface and adjusted on an Aitoff projection of the Dower matrix ("revised set", WCT-referenced; the
 * patent's RA-referenced equation (1) equals these rows plus the RA → WCT shift (I + II)/3 of the standard rows). Two
 * printing details: the WCT form prints no y term for V8 and V9 (0 here), and prints V7's y as −0.031 while equation (1)
 * (0.308 − 0.277) implies +0.031; equation (1) is the operative result, so +0.031 is used (|Δ| = 0.06 of a 0.72 row).
 * They are the anchors of the baked BEM lead table at those sites (src/synth/leads/leadfield.ts).
 */
import type { Vec3 } from '../api';

export const DOWER = {
  I: [0.632, -0.235, 0.059],
  II: [0.235, 1.066, -0.132],
  V1: [-0.515, 0.157, -0.917],
  V2: [0.044, 0.164, -1.387],
  V3: [0.882, 0.098, -1.277],
  V4: [1.213, 0.127, -0.601],
  V5: [1.125, 0.127, -0.086],
  V6: [0.831, 0.076, 0.23],
} as const satisfies Record<string, Vec3>;

export const DOWER_EXTRA = {
  V3R: [-0.566, 0.164, -0.49],
  V4R: [-0.507, 0.053, -0.289],
  V5R: [-0.463, 0.041, -0.107],
  V7: [0.587, 0.031, 0.412],
  V8: [0.376, 0, 0.411],
  V9: [0.221, 0, 0.473],
} as const satisfies Record<string, Vec3>;
