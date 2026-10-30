/**
 * Deterministic Nelder–Mead simplex minimizer (standard coefficients: reflection 1, expansion 2, contraction ½,
 * shrink ½). The initial simplex is x0 plus one step along each axis.
 */
export interface NelderMeadOptions {
  readonly steps: readonly number[];
  readonly maxEvals: number;
  /** Stop when the spread of simplex values falls below this. */
  readonly fTol?: number;
  readonly onEval?: (x: readonly number[], f: number, evals: number) => void;
}

export interface NelderMeadResult {
  readonly x: number[];
  readonly f: number;
  readonly evals: number;
  readonly history: readonly number[];
}

export function nelderMead(fn: (x: readonly number[]) => number, x0: readonly number[], o: NelderMeadOptions): NelderMeadResult {
  const n = x0.length;
  let evals = 0;
  const history: number[] = [];
  const f = (x: number[]) => {
    const v = fn(x);
    evals++;
    history.push(v);
    o.onEval?.(x, v, evals);
    return Number.isFinite(v) ? v : 1e12;
  };
  let simplex: { x: number[]; f: number }[] = [{ x: [...x0], f: f([...x0]) }];
  for (let i = 0; i < n && evals < o.maxEvals; i++) {
    const x = [...x0];
    x[i] += o.steps[i];
    simplex.push({ x, f: f(x) });
  }
  const tol = o.fTol ?? 1e-6;
  while (evals < o.maxEvals && simplex.length === n + 1) {
    simplex.sort((a, b) => a.f - b.f);
    if (Math.abs(simplex[n].f - simplex[0].f) < tol) break;
    const centroid = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centroid[j] += simplex[i].x[j] / n;
    const worst = simplex[n];
    const along = (t: number) => centroid.map((c, j) => c + t * (worst.x[j] - c));
    const xr = along(-1);
    const fr = f(xr);
    if (fr < simplex[0].f) {
      const xe = along(-2);
      const fe = f(xe);
      simplex[n] = fe < fr ? { x: xe, f: fe } : { x: xr, f: fr };
    } else if (fr < simplex[n - 1].f) {
      simplex[n] = { x: xr, f: fr };
    } else {
      const outside = fr < worst.f;
      const xc = along(outside ? -0.5 : 0.5);
      const fc = f(xc);
      if (fc < (outside ? fr : worst.f)) simplex[n] = { x: xc, f: fc };
      else {
        const best = simplex[0];
        simplex = simplex.map((s, i) => {
          if (i === 0) return s;
          const x = s.x.map((v, j) => best.x[j] + 0.5 * (v - best.x[j]));
          return { x, f: f(x) };
        });
      }
    }
  }
  simplex.sort((a, b) => a.f - b.f);
  return { x: simplex[0].x, f: simplex[0].f, evals, history };
}
