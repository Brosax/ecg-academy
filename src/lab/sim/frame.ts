/**
 * Coordinate frames — FROZEN CONTRACT (see types.ts header).
 *   local (mm): +y apex→base, +z anterior (RV side), +x = y × z.
 *   app (cm):   +x patient left, +y superior, +z anterior.
 *   frank:      +X patient left, +Y inferior, +Z posterior.
 *   spec:       research disease-spec frame, +x left, +y inferior, +z anterior.
 */
import type { FrankVec, Mat3, Pose, Vec3 } from './types';

export const appToFrank = (v: Vec3): FrankVec => [v[0], -v[1], -v[2]];
export const frankToApp = (v: FrankVec): Vec3 => [v[0], -v[1], -v[2]];
export const specToApp = (v: Vec3): Vec3 => [v[0], -v[1], v[2]];
export const specToFrank = (v: Vec3): FrankVec => [v[0], v[1], -v[2]];

// ---------------------------------------------------------------- small vector / matrix helpers

export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const norm = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const normalize = (a: Vec3): Vec3 => {
  const n = norm(a);
  return n > 0 ? [a[0] / n, a[1] / n, a[2] / n] : [0, 0, 0];
};

export const mat3MulVec = (m: Mat3, v: Vec3): Vec3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];
export const mat3Mul = (a: Mat3, b: Mat3): Mat3 => {
  const r = new Array<number>(9);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return r as unknown as Mat3;
};
export const mat3Transpose = (m: Mat3): Mat3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
/** Matrix whose columns are the given vectors. */
export const mat3FromColumns = (c0: Vec3, c1: Vec3, c2: Vec3): Mat3 => [
  c0[0], c1[0], c2[0],
  c0[1], c1[1], c2[1],
  c0[2], c1[2], c2[2],
];
export const IDENTITY3: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** Rodrigues rotation about a unit axis. */
export function rotationAboutAxis(axis: Vec3, angleRad: number): Mat3 {
  const [x, y, z] = normalize(axis);
  const c = Math.cos(angleRad), s = Math.sin(angleRad), t = 1 - c;
  return [
    t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c,
  ];
}

// ---------------------------------------------------------------- pose

/** F = diag(1, −1, −1): app → Frank. */
export const APP_TO_FRANK: Mat3 = [1, 0, 0, 0, -1, 0, 0, 0, -1];

export interface PoseParams {
  /** Base → apex unit direction in app coordinates (default: left, inferior, anterior). */
  readonly apexDirApp: Vec3;
  /** Rotation about the long axis (deg); positive = counter-clockwise viewed from the apex. */
  readonly rollDeg: number;
  readonly tCm: Vec3;
}

/** CT long axis ≈ (left 0.60, anterior 0.5–0.6, inferior 0.5–0.6) — Norimatsu 2023 (docs/research/lead-geometry-anatomy). */
export const DEFAULT_POSE_PARAMS: PoseParams = {
  apexDirApp: normalize([0.6, -0.55, 0.58]),
  rollDeg: 0,
  tCm: [0, 0, 0],
};

/**
 * Builds local → app rotation. Local +y maps to −apexDir (apex→base points up-right-back).
 * Local +z (anterior) maps to app +z orthogonalised against the long axis, then rolled about it.
 */
export function buildPose(p: PoseParams = DEFAULT_POSE_PARAMS): Pose {
  const yL = scale(normalize(p.apexDirApp), -1);
  let zL = sub([0, 0, 1], scale(yL, dot([0, 0, 1], yL)));
  zL = normalize(zL);
  const roll = rotationAboutAxis(yL, (p.rollDeg * Math.PI) / 180);
  zL = normalize(mat3MulVec(roll, zL));
  const xL = normalize(cross(yL, zL));
  return { R: mat3FromColumns(xL, yL, zL), tCm: p.tCm };
}

export const localToApp = (pose: Pose, pMm: Vec3): Vec3 => add(mat3MulVec(pose.R, scale(pMm, 0.1)), pose.tCm);
/** Direction (no translation, no unit scaling): local → app. */
export const localDirToApp = (pose: Pose, v: Vec3): Vec3 => mat3MulVec(pose.R, v);
/** M = F · R : local vectors → Frank vectors. */
export const localToFrankMatrix = (pose: Pose): Mat3 => mat3Mul(APP_TO_FRANK, pose.R);

/** Frontal-plane angle (deg) of a Frank vector, hexaxial convention: 0° = left, +90° = inferior. */
export const frontalAngleDeg = (v: FrankVec): number => (Math.atan2(v[1], v[0]) * 180) / Math.PI;
