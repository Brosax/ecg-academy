/**
 * The heart vector H (Frank: +X left, +Y inferior, +Z posterior) drawn in the frontal plane (X right, Y down — the
 * hexaxial convention) and the horizontal plane (X right, anterior = −Z down, so angles grow toward anterior as in
 * the precordial diagram). Arrow length = in-plane fraction of |H|.
 */
import { fmtDeg, frontalAngleDeg, horizontalAngleDeg, mag } from '../explain';
import { tq } from '../i18n/quiz';
import type { Lang } from '../app/store';
import type { FrankVec } from '../sim/types';

function Plane(p: {
  readonly a: number;
  readonly b: number;
  readonly title: string;
  readonly angle: string;
  readonly labels: readonly [string, string, string, string];
}) {
  const [right, left, down, up] = p.labels;
  const x = 60 + 44 * p.a, y = 60 + 44 * p.b;
  const len = Math.hypot(p.a, p.b);
  const ux = len > 1e-6 ? p.a / len : 0, uy = len > 1e-6 ? p.b / len : 0;
  const head = `${x},${y} ${x - 9 * ux - 5 * uy},${y - 9 * uy + 5 * ux} ${x - 9 * ux + 5 * uy},${y - 9 * uy - 5 * ux}`;
  return (
    <figure class="vplane">
      <svg viewBox="0 0 120 120" width="120" height="120" role="img" aria-label={`${p.title}: ${p.angle}`}>
        <circle cx={60} cy={60} r={46} class="vplane-ring" />
        <line x1={10} x2={110} y1={60} y2={60} class="vplane-axis" />
        <line x1={60} x2={60} y1={10} y2={110} class="vplane-axis" />
        <text x={114} y={57} text-anchor="end" class="vplane-label">{right}</text>
        <text x={6} y={57} class="vplane-label">{left}</text>
        <text x={64} y={116} class="vplane-label">{down}</text>
        <text x={64} y={12} class="vplane-label">{up}</text>
        {len > 0.02 && (
          <>
            <line x1={60} y1={60} x2={x} y2={y} class="vplane-arrow" />
            <polygon points={head} class="vplane-head" />
          </>
        )}
      </svg>
      <figcaption>
        {p.title} · {p.angle}
      </figcaption>
    </figure>
  );
}

export function VectorPlanes({ h, lang }: { readonly h: FrankVec; readonly lang: Lang }) {
  const m = mag(h) || 1;
  const L = (k: Parameters<typeof tq.in>[1]) => tq.in(lang, k);
  return (
    <div class="vplanes">
      <Plane
        a={h[0] / m}
        b={h[1] / m}
        title={L('quiz.plane.frontal')}
        angle={fmtDeg(frontalAngleDeg(h), lang)}
        labels={[L('quiz.ax.L'), L('quiz.ax.R'), L('quiz.ax.I'), L('quiz.ax.S')]}
      />
      <Plane
        a={h[0] / m}
        b={-h[2] / m}
        title={L('quiz.plane.horizontal')}
        angle={fmtDeg(horizontalAngleDeg(h), lang)}
        labels={[L('quiz.ax.L'), L('quiz.ax.R'), L('quiz.ax.A'), L('quiz.ax.P')]}
      />
    </div>
  );
}
