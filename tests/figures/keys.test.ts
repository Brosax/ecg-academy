import { describe, expect, it } from 'vitest';
import { angleKey, radioKey } from '../../src/figures/math/keys';

describe('angle slider keys (hexaxial and horizontal-plane vectors)', () => {
  const k = (key: string, shiftKey = false) => ({ key, shiftKey });

  it('arrows turn the vector by 5° (Shift: 1°), clockwise for → / ↓', () => {
    expect(angleKey(k('ArrowRight'), 60)).toBe(65);
    expect(angleKey(k('ArrowDown'), 60)).toBe(65);
    expect(angleKey(k('ArrowLeft'), 60)).toBe(55);
    expect(angleKey(k('ArrowUp'), 60)).toBe(55);
    expect(angleKey(k('ArrowRight', true), 60)).toBe(61);
    expect(angleKey(k('ArrowLeft', true), 60)).toBe(59);
  });

  it('PageUp / PageDown jump one lead (30°), Home returns to 0°, other keys are ignored', () => {
    expect(angleKey(k('PageDown'), 60)).toBe(90);
    expect(angleKey(k('PageUp'), 60)).toBe(30);
    expect(angleKey(k('Home'), 60)).toBe(0);
    expect(angleKey(k('Enter'), 60)).toBeNull();
    expect(angleKey(k('a'), 60)).toBeNull();
  });
});

describe('radio-group keys (toggles)', () => {
  it('arrows move to the next / previous option and wrap around', () => {
    expect(radioKey('ArrowRight', 0, 3)).toBe(1);
    expect(radioKey('ArrowDown', 2, 3)).toBe(0);
    expect(radioKey('ArrowLeft', 0, 3)).toBe(2);
    expect(radioKey('ArrowUp', 1, 3)).toBe(0);
  });

  it('Home / End jump to the first / last option; other keys and empty groups are ignored', () => {
    expect(radioKey('Home', 2, 4)).toBe(0);
    expect(radioKey('End', 0, 4)).toBe(3);
    expect(radioKey('Tab', 1, 4)).toBeNull();
    expect(radioKey(' ', 1, 4)).toBeNull();
    expect(radioKey('ArrowRight', 0, 0)).toBeNull();
  });
});
