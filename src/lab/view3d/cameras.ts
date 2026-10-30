/**
 * Camera presets (app frame) and a small allocation-free tween. Presets: anterior, left lateral, base view (looking
 * along the long axis from the base toward the apex) and "view from this lead" (from the + end of the lead axis).
 */
import { mat3MulVec, normalize } from '../sim/frame';
import type { Mat3, Vec3 } from '../sim/types';
import type { PerspectiveCamera, Vector3 } from 'three';

export const CAMERA_PRESETS = ['anterior', 'leftLateral', 'base', 'fromLead'] as const;
export type CameraPreset = (typeof CAMERA_PRESETS)[number];

/** Unit vector from the target to the camera. OrbitControls keeps +y up, so near-vertical directions get a tilt. */
export function presetDirection(preset: CameraPreset, poseR: Mat3, leadDirApp: Vec3 | null): Vec3 {
  let d: Vec3;
  switch (preset) {
    case 'anterior':
      d = [0, 0, 1];
      break;
    case 'leftLateral':
      d = [1, 0, 0];
      break;
    case 'base':
      d = mat3MulVec(poseR, [0, 1, 0]); // local +y (apex → base) in the app frame
      break;
    case 'fromLead':
      d = leadDirApp ?? [0, 0, 1];
      break;
  }
  d = normalize(d);
  if (Math.abs(d[1]) > 0.96) d = normalize([d[0], d[1], d[2] + 0.35]);
  return d;
}

/** Distance at which a sphere of radius r fits the view (both fovs). */
export function fitDistance(radius: number, vFovDeg: number, aspect: number): number {
  const v = (vFovDeg * Math.PI) / 360;
  const h = Math.atan(Math.tan(v) * Math.max(aspect, 1e-3));
  return radius / Math.sin(Math.min(v, h));
}

export class CameraTween {
  private t0 = 0;
  private dur = 0;
  active = false;
  constructor(
    private readonly fromPos: Vector3,
    private readonly toPos: Vector3,
    private readonly fromTarget: Vector3,
    private readonly toTarget: Vector3,
  ) {}

  start(camera: PerspectiveCamera, target: Vector3, pos: Vector3, newTarget: Vector3, nowMs: number, durMs = 450): void {
    this.fromPos.copy(camera.position);
    this.fromTarget.copy(target);
    this.toPos.copy(pos);
    this.toTarget.copy(newTarget);
    this.t0 = nowMs;
    this.dur = durMs;
    this.active = true;
  }

  /** Writes the interpolated state; returns false when done. */
  update(camera: PerspectiveCamera, target: Vector3, nowMs: number): boolean {
    if (!this.active) return false;
    const x = Math.min(1, (nowMs - this.t0) / this.dur);
    const e = x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
    camera.position.lerpVectors(this.fromPos, this.toPos, e);
    target.lerpVectors(this.fromTarget, this.toTarget, e);
    if (x >= 1) this.active = false;
    return this.active;
  }
}
