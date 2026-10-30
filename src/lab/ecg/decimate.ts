/**
 * Min/max decimation per device-pixel column (docs/research/tech-stack.md §8b): when a trace has more samples than
 * pixel columns, each column keeps only its extremes so QRS spikes are never lost. Pure — returns polyline points.
 */

/**
 * @param src     samples (mV)
 * @param i0      first sample index in src
 * @param n       number of samples
 * @param x0      x (device px) of sample i0
 * @param dx      device px per sample (> 0)
 * @param out     receives x,y pairs (y = sample value); must hold ≥ 2·(2·columns + 2) floats
 * @returns number of points written
 */
export function decimateMinMax(src: ArrayLike<number>, i0: number, n: number, x0: number, dx: number, out: Float32Array): number {
  if (n <= 0) return 0;
  // Fewer samples than ~2 per column: keep every sample.
  if (dx >= 0.5) {
    const m = Math.min(n, out.length >> 1);
    for (let i = 0; i < m; i++) {
      out[2 * i] = x0 + i * dx;
      out[2 * i + 1] = src[i0 + i];
    }
    return m;
  }
  let p = 0;
  const cap = out.length >> 1;
  let col = Math.floor(x0);
  let first = src[i0], mn = first, mx = first;
  const flush = (c: number) => {
    // Order the pair so the line continues from the side of the column's first sample.
    const firstLow = first - mn <= mx - first;
    const a = firstLow ? mn : mx, b = firstLow ? mx : mn;
    if (p < cap) {
      out[2 * p] = c + 0.5;
      out[2 * p + 1] = a;
      p++;
    }
    if (p < cap && b !== a) {
      out[2 * p] = c + 0.5;
      out[2 * p + 1] = b;
      p++;
    }
  };
  for (let i = 1; i < n; i++) {
    const v = src[i0 + i];
    const c = Math.floor(x0 + i * dx);
    if (c !== col) {
      flush(col);
      col = c;
      first = mn = mx = v;
    } else {
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
  }
  flush(col);
  return p;
}

/** Points needed for a span of `n` samples at `dx` px per sample (upper bound, for sizing the scratch buffer). */
export function decimatedCapacity(n: number, dx: number): number {
  if (dx >= 0.5) return n;
  return 2 * (Math.ceil(n * dx) + 2);
}
