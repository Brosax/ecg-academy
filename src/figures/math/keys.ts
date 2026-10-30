/**
 * Keyboard mappings of the figures' custom controls (pure, so they are unit-tested; the components only call them).
 */

/** The parts of a KeyboardEvent the mappings read. */
export interface KeyLike {
  readonly key: string;
  readonly shiftKey: boolean;
}

/**
 * Keyboard for an angle slider (degrees, clockwise positive like the hexaxial system): → / ↓ +5°, ← / ↑ −5°,
 * Shift = 1°, PageDown/PageUp ±30° (one lead), Home = 0°. Returns the new angle or null if the key is not handled.
 */
export function angleKey(e: KeyLike, deg: number): number | null {
  const step = e.shiftKey ? 1 : 5;
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return deg + step;
    case 'ArrowLeft':
    case 'ArrowUp':
      return deg - step;
    case 'PageDown':
      return deg + 30;
    case 'PageUp':
      return deg - 30;
    case 'Home':
      return 0;
    default:
      return null;
  }
}

/**
 * Radio-group keys (WAI-ARIA radio group pattern): from option `i` of `n`, → / ↓ next, ← / ↑ previous (both wrap),
 * Home first, End last. Returns the index to select, or null if the key is not handled.
 */
export function radioKey(key: string, i: number, n: number): number | null {
  if (n <= 0) return null;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (i + 1) % n;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (i - 1 + n) % n;
    case 'Home':
      return 0;
    case 'End':
      return n - 1;
    default:
      return null;
  }
}
