/**
 * Shell-facing controls of the 3D view that live outside <HeartView> (its props are frozen): camera-preset requests,
 * the current preset, and the colour-key entries. HeartView subscribes to `cameraRequest` and reports `cameraPreset`.
 * NOTE for the integrator: a camera command in AppCommands would replace this signal.
 */
import { signal } from '@preact/signals';
import type { View3dKey } from '../i18n/view3d/zh';
import type { CameraPreset } from './cameras';
import { FRONT_CSS } from './scene';

export { CAMERA_PRESETS } from './cameras';
export type { CameraPreset } from './cameras';

/** Each request carries a counter so asking for the same preset twice still re-frames the heart. */
export const cameraRequest = signal<{ readonly preset: CameraPreset; readonly n: number } | null>(null);
/** The preset last applied (button or request); orbiting does not change it. */
export const cameraPreset = signal<CameraPreset>('anterior');
/**
 * Enlarged 3D view: the shell widens the side panel (and gives the heart more of its height) while this is on; the
 * scene re-fits through its ResizeObserver. Not persisted, like the 3D layers.
 */
export const heartEnlarged = signal(false);

export function requestCameraPreset(preset: CameraPreset): void {
  cameraRequest.value = { preset, n: (cameraRequest.peek()?.n ?? 0) + 1 };
}

export const PRESET_KEYS = {
  anterior: { label: 'cam.anterior', aria: 'cam.anterior.aria' },
  leftLateral: { label: 'cam.leftLateral', aria: 'cam.leftLateral.aria' },
  base: { label: 'cam.base', aria: 'cam.base.aria' },
  fromLead: { label: 'cam.fromLead', aria: 'cam.fromLead.aria' },
} as const satisfies Record<CameraPreset, { label: View3dKey; aria: View3dKey }>;

export const LEGEND: readonly { readonly key: View3dKey; readonly color: string; readonly ring?: boolean }[] = [
  { key: 'legend.atrial', color: 'var(--c-atrial)' },
  { key: 'legend.ventricular', color: 'var(--c-qrs)' },
  { key: 'legend.repol', color: 'var(--c-repol)' },
  { key: 'legend.front', color: FRONT_CSS, ring: true },
  { key: 'legend.rest', color: 'var(--c-myo-rest)' },
  { key: 'legend.conduction', color: 'var(--c-conduction)' },
  { key: 'legend.vector', color: 'var(--c-vector)' },
];
