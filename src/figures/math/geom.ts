/**
 * Small geometry helpers shared by the figures. Angle convention everywhere in src/figures (same as the frontal
 * hexaxial system): degrees, 0° = patient's left, angles grow clockwise on screen (SVG y points down), so in the
 * frontal plane +90° = inferior and in the horizontal plane +90° = posterior. Ranges are normalised to (−180, 180].
 */
export const DEG = Math.PI / 180;

/** Normalise an angle in degrees to (−180, 180]. */
export function normDeg(a: number): number {
  let x = a % 360;
  if (x <= -180) x += 360;
  if (x > 180) x -= 360;
  return x === 0 ? 0 : x; // no −0
}

/** Smallest signed difference a − b in (−180, 180]. */
export function angleDiff(a: number, b: number): number {
  return normDeg(a - b);
}

/** Unit vector (screen coordinates, y down) for an angle in degrees. */
export function unit(deg: number): [number, number] {
  return [Math.cos(deg * DEG), Math.sin(deg * DEG)];
}

/** Angle (degrees, (−180, 180]) of a screen vector. */
export function angleOf(x: number, y: number): number {
  return normDeg(Math.atan2(y, x) / DEG);
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}

/** Smoothstep easing on [0, 1]. */
export function ease(f: number): number {
  const x = clamp(f, 0, 1);
  return x * x * (3 - 2 * x);
}

/** SVG path "M x y L x y …" through points (rounded to 0.01). */
export function polyline(points: readonly (readonly [number, number])[]): string {
  let d = '';
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    d += `${i === 0 ? 'M' : 'L'}${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100}`;
  }
  return d;
}

/** Gaussian bump. */
export function gauss(t: number, center: number, width: number): number {
  const z = (t - center) / width;
  return Math.exp(-0.5 * z * z);
}
