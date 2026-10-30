/**
 * Keyboard control of the 3D heart, as pure functions (no DOM, no three.js): which key does what, and the orbit step it
 * makes. view.ts maps a keydown through keyAction() and applies orbitStep() to the camera.
 * Keys pressed with Ctrl, Meta (⌘) or Alt are never taken: Ctrl+0 / Ctrl+= / Ctrl+− are the browser's page zoom and
 * must keep working while the heart has focus. Shift is allowed ('+' and '_' need it on most layouts).
 */

export const KEY_ACTIONS = ['left', 'right', 'up', 'down', 'zoomIn', 'zoomOut', 'reset'] as const;
export type KeyAction = (typeof KEY_ACTIONS)[number];

export interface KeyInput {
  readonly key: string;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
}

const MAP: Readonly<Record<string, KeyAction>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  '+': 'zoomIn',
  '=': 'zoomIn',
  '-': 'zoomOut',
  _: 'zoomOut',
  '0': 'reset',
  Home: 'reset',
};

/** The heart action of a keydown, or null when the key is not ours (the event must then be left alone). */
export function keyAction(e: KeyInput): KeyAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  return Object.hasOwn(MAP, e.key) ? MAP[e.key] : null;
}

/** Camera position around the target in spherical coordinates (three.js Spherical convention: phi from +y). */
export interface Orbit {
  readonly radius: number;
  readonly phi: number;
  readonly theta: number;
}

export interface OrbitLimits {
  readonly minDistance: number;
  readonly maxDistance: number;
}

/** Rotation step of one key press (15°) and zoom factor of one +/− press. */
export const KEY_ROTATE_RAD = (15 * Math.PI) / 180;
export const KEY_ZOOM = 0.85;
/** Keep the camera off the poles so "up" never flips the view. */
export const POLE_MARGIN_RAD = 0.15;

/** One keyboard step of the orbit (reset is handled by the view: it restores the home position). */
export function orbitStep(o: Orbit, action: Exclude<KeyAction, 'reset'>, lim: OrbitLimits): Orbit {
  switch (action) {
    case 'left':
      return { ...o, theta: o.theta - KEY_ROTATE_RAD };
    case 'right':
      return { ...o, theta: o.theta + KEY_ROTATE_RAD };
    case 'up':
      return { ...o, phi: Math.max(POLE_MARGIN_RAD, o.phi - KEY_ROTATE_RAD) };
    case 'down':
      return { ...o, phi: Math.min(Math.PI - POLE_MARGIN_RAD, o.phi + KEY_ROTATE_RAD) };
    case 'zoomIn':
      return { ...o, radius: Math.max(lim.minDistance, o.radius * KEY_ZOOM) };
    case 'zoomOut':
      return { ...o, radius: Math.min(lim.maxDistance, o.radius / KEY_ZOOM) };
  }
}
