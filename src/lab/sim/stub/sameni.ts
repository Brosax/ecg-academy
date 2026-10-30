/**
 * Sameni 3D dynamic VCG model (Sameni, Clifford, Jutten, Shamsollahi, EURASIP JASP 2007:043407), normal parameter
 * set from FECGSYN load_gparam 'normal' case 1 / OSET (BSD-3). Frank frame, mV (inferred), θ in rad with R peak at 0.
 * Used (a) as the UI-development stub stream and (b) as the last-resort fallback source. Every lead is still a
 * projection of this one vector.
 */
export interface GaussAxis {
  readonly theta: readonly number[];
  readonly alpha: readonly number[];
  readonly b: readonly number[];
}

export const SAMENI_NORMAL: Readonly<Record<'x' | 'y' | 'z', GaussAxis>> = {
  x: {
    theta: [-1.09, -0.83, -0.19, -0.07, 0, 0.06, 0.22, 1.2, 1.42, 1.68],
    alpha: [0.03, 0.08, -0.13, 0.85, 1.11, 0.75, 0.06, 0.1, 0.17, 0.39],
    b: [0.0906, 0.1057, 0.0453, 0.0378, 0.0332, 0.0302, 0.0378, 0.604, 0.302, 0.1812],
  },
  y: {
    theta: [-1.1, -0.9, -0.76, -0.11, -0.01, 0.065, 0.8, 1.58],
    alpha: [0.035, 0.015, -0.019, 0.32, 0.51, -0.32, 0.04, 0.08],
    b: [0.07, 0.07, 0.04, 0.055, 0.037, 0.0604, 0.45, 0.3],
  },
  z: {
    theta: [-1.1, -0.93, -0.7, -0.4, -0.15, 0.095, 1.05, 1.25, 1.55],
    alpha: [-0.03, -0.14, -0.035, 0.045, -0.4, 0.46, -0.12, -0.2, -0.35],
    b: [0.03, 0.12, 0.04, 0.4, 0.045, 0.05, 0.8, 0.4, 0.2],
  },
};

/** Gaussians with θ below this belong to the atrial (P) source. */
export const SAMENI_ATRIAL_CUTOFF = -0.6;

/** Sum of Gaussians for one axis; part = 'A' (atrial terms) | 'V' (ventricular terms). */
export function sameniAxis(axis: GaussAxis, theta: number, part: 'A' | 'V'): number {
  let s = 0;
  for (let i = 0; i < axis.theta.length; i++) {
    const isA = axis.theta[i] < SAMENI_ATRIAL_CUTOFF;
    if ((part === 'A') !== isA) continue;
    let d = theta - axis.theta[i];
    d = Math.atan2(Math.sin(d), Math.cos(d));
    s += axis.alpha[i] * Math.exp(-(d * d) / (2 * axis.b[i] * axis.b[i]));
  }
  return s;
}
