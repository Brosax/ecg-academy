/**
 * One-cycle strip for quiz questions, drawn from engine.sampleLeads (a projection of the one heart vector — no
 * per-lead drawing). Unlabelled on purpose: the ECG workstream's strips show truth labels that would give answers away.
 * Click (or focus + ←/→ + Enter) picks an instant.
 */
import { useMemo, useState } from 'preact/hooks';
import { sampleLead } from '../explain';
import { tq } from '../i18n/quiz';
import type { SimEngine } from '../sim/types';
import type { StripSpec } from './types';

export interface QuizStripProps {
  readonly engine: SimEngine;
  readonly spec: StripSpec;
  readonly onPick?: (tMs: number) => void;
  /** Absolute times of cursors to draw (clicked point, caliper legs). */
  readonly cursors?: readonly number[];
  /** Truth span to shade after grading. */
  readonly answer?: { readonly t0: number; readonly t1: number } | null;
}

const H = 300;

export function QuizStrip({ engine, spec, onPick, cursors = [], answer }: QuizStripProps) {
  const dur = spec.t1 - spec.t0;
  const data = useMemo(() => {
    const s = sampleLead(engine, spec.lead, spec.t0, spec.t1);
    let lo = -0.4, hi = 0.8;
    for (const v of s) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    lo -= 0.1;
    hi += 0.1;
    const y = (v: number) => ((hi - v) / (hi - lo)) * H;
    const pts: string[] = [];
    for (let i = 0; i < s.length; i += 2) pts.push(`${i},${y(s[i]).toFixed(1)}`);
    const hLines: { y: number; major: boolean }[] = [];
    for (let mv = Math.ceil(lo * 10) / 10; mv <= hi; mv += 0.1) {
      const r = Math.round(mv * 10);
      hLines.push({ y: y(r / 10), major: r % 5 === 0 });
    }
    return { pts: pts.join(' '), hLines, yZero: y(0) };
  }, [engine, spec.lead, spec.t0, spec.t1]);

  // vertical grid: 40 ms minor / 200 ms major boxes, aligned to P onset (time 0)
  const vLines: { x: number; major: boolean }[] = [];
  const ticks: { x: number; label: string }[] = [];
  for (let k = Math.ceil((spec.t0 - spec.zeroMs) / 40); spec.zeroMs + k * 40 <= spec.t1; k++) {
    const x = spec.zeroMs + k * 40 - spec.t0;
    vLines.push({ x, major: k % 5 === 0 });
    // labels every 200 ms, skipped near the right edge where the unit sits
    if (k % 5 === 0 && x < 0.9 * dur) ticks.push({ x, label: String(k * 40) });
  }

  const [probe, setProbe] = useState<number | null>(null);
  const toX = (t: number) => t - spec.t0;
  const interactive = !!onPick;

  const pickAt = (clientX: number, el: Element) => {
    const r = el.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (clientX - r.left) / Math.max(1, r.width)));
    onPick?.(spec.t0 + f * dur);
  };

  const onKey = (e: KeyboardEvent) => {
    if (!interactive) return;
    const step = e.shiftKey ? 20 : 4;
    const cur = probe ?? spec.t0 + dur / 2;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      setProbe(Math.min(spec.t1, Math.max(spec.t0, cur + (e.key === 'ArrowRight' ? step : -step))));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPick?.(cur);
    }
  };

  const label = tq('quiz.strip.label', { lead: spec.lead });
  return (
    <figure class="quiz-strip">
      <div
        class={`strip-box ${interactive ? 'is-interactive' : ''}`}
        role={interactive ? 'slider' : 'img'}
        aria-label={label}
        aria-valuemin={interactive ? Math.round(spec.t0 - spec.zeroMs) : undefined}
        aria-valuemax={interactive ? Math.round(spec.t1 - spec.zeroMs) : undefined}
        aria-valuenow={interactive ? Math.round((probe ?? spec.t0 + dur / 2) - spec.zeroMs) : undefined}
        aria-valuetext={interactive ? `${Math.round((probe ?? spec.t0 + dur / 2) - spec.zeroMs)} ms` : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={interactive ? (e) => pickAt(e.clientX, e.currentTarget) : undefined}
        onKeyDown={onKey}
        onBlur={() => setProbe(null)}
      >
        <svg viewBox={`0 0 ${dur} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <rect class="strip-paper" x={0} y={0} width={dur} height={H} />
          {answer && <rect class="strip-answer" x={toX(answer.t0)} y={0} width={Math.max(1, answer.t1 - answer.t0)} height={H} />}
          {data.hLines.map((l) => (
            <line class={l.major ? 'grid-major' : 'grid-minor'} x1={0} x2={dur} y1={l.y} y2={l.y} vector-effect="non-scaling-stroke" />
          ))}
          {vLines.map((l) => (
            <line class={l.major ? 'grid-major' : 'grid-minor'} x1={l.x} x2={l.x} y1={0} y2={H} vector-effect="non-scaling-stroke" />
          ))}
          <polyline class="strip-trace" points={data.pts} fill="none" vector-effect="non-scaling-stroke" />
          {spec.mark !== undefined && (
            <line class="strip-mark" x1={toX(spec.mark)} x2={toX(spec.mark)} y1={0} y2={H} vector-effect="non-scaling-stroke" />
          )}
          {cursors.map((t) => (
            <line class="strip-cursor" x1={toX(t)} x2={toX(t)} y1={0} y2={H} vector-effect="non-scaling-stroke" />
          ))}
          {probe !== null && <line class="strip-probe" x1={toX(probe)} x2={toX(probe)} y1={0} y2={H} vector-effect="non-scaling-stroke" />}
        </svg>
        {spec.mark !== undefined && (
          <span class="strip-mark-label" style={{ left: `${(toX(spec.mark) / dur) * 100}%` }}>
            ▼ {tq('quiz.strip.mark')}
          </span>
        )}
      </div>
      <div class="strip-ticks" aria-hidden="true">
        {ticks.map((t) => (
          <span style={{ left: `${(t.x / dur) * 100}%` }}>{t.label}</span>
        ))}
        <span class="strip-unit">ms</span>
      </div>
      <figcaption class="fine-print">{label}</figcaption>
    </figure>
  );
}
