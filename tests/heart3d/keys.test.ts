import { describe, expect, it } from 'vitest';
import { KEY_ROTATE_RAD, KEY_ZOOM, keyAction, orbitStep, POLE_MARGIN_RAD, type Orbit } from '../../src/heart3d/keys';

describe('keyboard map of the 3D heart', () => {
  it('arrows rotate, +/= and −/_ zoom, 0 and Home reset', () => {
    expect(keyAction({ key: 'ArrowLeft' })).toBe('left');
    expect(keyAction({ key: 'ArrowRight' })).toBe('right');
    expect(keyAction({ key: 'ArrowUp' })).toBe('up');
    expect(keyAction({ key: 'ArrowDown' })).toBe('down');
    expect(keyAction({ key: '+' })).toBe('zoomIn');
    expect(keyAction({ key: '=' })).toBe('zoomIn');
    expect(keyAction({ key: '-' })).toBe('zoomOut');
    expect(keyAction({ key: '_' })).toBe('zoomOut');
    expect(keyAction({ key: '0' })).toBe('reset');
    expect(keyAction({ key: 'Home' })).toBe('reset');
  });

  it('leaves every other key alone (Tab, Escape, Enter, letters, inherited object keys)', () => {
    for (const key of ['Tab', 'Escape', 'Enter', ' ', 'a', '1', 'PageDown', 'End', 'toString', 'constructor', '__proto__']) {
      expect(keyAction({ key }), key).toBeNull();
    }
  });

  it('never takes a key pressed with Ctrl, Meta or Alt (browser zoom Ctrl+0 / Ctrl+= / Ctrl+− must keep working)', () => {
    for (const key of ['0', '=', '+', '-', 'Home', 'ArrowLeft']) {
      expect(keyAction({ key, ctrlKey: true }), `ctrl ${key}`).toBeNull();
      expect(keyAction({ key, metaKey: true }), `meta ${key}`).toBeNull();
      expect(keyAction({ key, altKey: true }), `alt ${key}`).toBeNull();
    }
  });
});

describe('orbit step', () => {
  const o: Orbit = { radius: 100, phi: Math.PI / 2, theta: 0 };
  const lim = { minDistance: 50, maxDistance: 200 };

  it('turns 15° per press around the vertical axis and tilts within the poles', () => {
    expect(orbitStep(o, 'left', lim).theta).toBeCloseTo(-KEY_ROTATE_RAD, 12);
    expect(orbitStep(o, 'right', lim).theta).toBeCloseTo(KEY_ROTATE_RAD, 12);
    expect(orbitStep(o, 'up', lim).phi).toBeCloseTo(Math.PI / 2 - KEY_ROTATE_RAD, 12);
    expect(orbitStep(o, 'down', lim).phi).toBeCloseTo(Math.PI / 2 + KEY_ROTATE_RAD, 12);
    expect(orbitStep({ ...o, phi: 0.2 }, 'up', lim).phi).toBe(POLE_MARGIN_RAD);
    expect(orbitStep({ ...o, phi: Math.PI - 0.2 }, 'down', lim).phi).toBe(Math.PI - POLE_MARGIN_RAD);
    // rotation keeps the distance
    expect(orbitStep(o, 'left', lim).radius).toBe(100);
  });

  it('zooms by a fixed factor, clamped to the controls limits', () => {
    expect(orbitStep(o, 'zoomIn', lim).radius).toBeCloseTo(100 * KEY_ZOOM, 12);
    expect(orbitStep(o, 'zoomOut', lim).radius).toBeCloseTo(100 / KEY_ZOOM, 12);
    expect(orbitStep({ ...o, radius: 52 }, 'zoomIn', lim).radius).toBe(50);
    expect(orbitStep({ ...o, radius: 190 }, 'zoomOut', lim).radius).toBe(200);
    // zoom keeps the direction
    const z = orbitStep(o, 'zoomIn', lim);
    expect([z.phi, z.theta]).toEqual([o.phi, o.theta]);
  });
});
