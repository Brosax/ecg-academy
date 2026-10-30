/**
 * Laddergram (Lewis ladder diagram) built from the rhythm truth: A / AV / V tiers aligned in time with a lead-II strip,
 * conducted impulses as slanted AV lines (labelled with the AV conduction time), blocked impulses ending in a bar,
 * ectopic origins as dots, and a time cursor shared with the ECG. Without an ECG a set of example rhythms is shown.
 */
import { useMemo, useRef, useState } from 'preact/hooks';
import type { Signal } from '@preact/signals';
import type { FigureParams } from './api';
import type { Ecg } from '../core/ecg';
import { tf } from '../i18n/figures';
import { beatValue, NORMAL_BEAT, waveValue, type BeatShape } from './math/beat';
import { DEMO_RHYTHMS, demoTruth, type DemoRhythm, type DemoTruth } from './math/demo';
import { clamp, polyline } from './math/geom';
import { atrialOnsets, buildLadder, type LadderSegment } from './math/ladder';
import { FigureFrame, fmt, PaperGrid, Svg, svgPoint, Toggle, useCursor, useUid } from './shared';
import { leadPath } from './strip';

const W = 780;
const H = 300;
const PX = 56;
const PW = W - PX - 14;
const SY = 10; // strip top
const SH = 96; // strip height
const LY = 130; // ladder top
const TH = 46; // tier height

const QRS_T: BeatShape = { waves: NORMAL_BEAT.waves.slice(1), marks: NORMAL_BEAT.marks };
const WIDE: BeatShape = {
  waves: [
    { center: 200, wl: 22, wr: 30, amp: 1.1 },
    { center: 262, wl: 26, amp: -0.35 },
    { center: 470, wl: 60, wr: 40, amp: -0.38 },
  ],
  marks: { pOn: null, pOff: null, qrsOn: 160, qrsOff: 310, tPeak: 470, tOff: 560 },
};

/** Schematic lead-II trace of a demo truth (P waves from atrial events, QRS–T from beats). */
function demoValue(truth: DemoTruth, onsets: readonly number[], t: number): number {
  let v = 0;
  truth.atrial.forEach((a, k) => {
    if (a.visible) v += waveValue(NORMAL_BEAT.waves[0], t - onsets[k]);
  });
  for (const b of truth.beats) {
    const wide = b.qrsOff - b.qrsOn > 120;
    const dt = t - b.qrsOn + 160;
    if (dt < -50 || dt > 800) continue;
    v += beatValue(wide ? WIDE : QRS_T, dt);
  }
  return v;
}

export function LaddergramFigure(props: { readonly params?: FigureParams['laddergram']; readonly ecg?: Ecg; readonly cursor?: Signal<number | null> }) {
  const truth = props.ecg?.truth ?? null;
  const [demo, setDemo] = useState<DemoRhythm>('wenckebach');
  const cursor = useCursor(props.cursor);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const uid = useUid('ld');

  const demoSrc = useMemo(() => demoTruth(demo), [demo]);
  const src: DemoTruth | null = props.ecg ? (truth && truth.beats.length ? truth : null) : demoSrc;
  const layout = useMemo(() => (src ? buildLadder(src, { maxBeats: props.params?.maxBeats ?? 8 }) : null), [src, props.params?.maxBeats]);

  const t0 = layout?.t0 ?? 0;
  const t1 = layout?.t1 ?? 1;
  const X = (t: number) => PX + ((t - t0) / (t1 - t0)) * PW;
  const Y = (y: number) => LY + y * TH;
  const pxPerMm = PW / (((t1 - t0) / 1000) * 25); // 25 mm/s paper under the strip

  const stripD = useMemo(() => {
    if (!src || !layout) return '';
    const toY = (mv: number) => clamp(SY + SH * 0.62 - mv * 10 * pxPerMm, SY + 1, SY + SH - 1);
    if (props.ecg) return leadPath(props.ecg.signal, 'II', t0, t1, X, toY);
    const onsets = atrialOnsets(src);
    const pts: Array<[number, number]> = [];
    for (let t = t0; t <= t1; t += 4) pts.push([X(t), toY(demoValue(src, onsets, t))]);
    return polyline(pts);
  }, [src, layout, props.ecg]);

  const c = cursor.value;
  const setFromPointer = (e: PointerEvent) => {
    if (!svgRef.current) return;
    const [x] = svgPoint(svgRef.current, e);
    cursor.value = Math.round(t0 + clamp((x - PX) / PW, 0, 1) * (t1 - t0));
  };

  const seg = (s: LadderSegment) => <path d={`M${X(s.x0)} ${Y(s.y0)}L${X(s.x1)} ${Y(s.y1)}`} class={`fg-lad fg-lad--${s.kind} ${s.aberrant ? 'is-aberrant' : ''}`} />;

  const blockBar = (t: number, y: number) => {
    // perpendicular to the AV segment that ends here
    const s = layout?.segments.find((q) => q.kind === 'blocked' && q.x1 === t && q.y1 === y);
    let dx = 0, dy = 1;
    if (s) {
      const vx = X(s.x1) - X(s.x0);
      const vy = Y(s.y1) - Y(s.y0);
      const n = Math.hypot(vx, vy) || 1;
      dx = -vy / n;
      dy = vx / n;
    }
    const cx = X(t), cy = Y(y);
    return <path d={`M${cx - 8 * dx} ${cy - 8 * dy}L${cx + 8 * dx} ${cy + 8 * dy}`} class="fg-lad-block" />;
  };

  const empty = !layout;

  return (
    <FigureFrame
      id="laddergram"
      title={tf('ldTitle')}
      wide
      controls={
        !props.ecg ? (
          <Toggle label={tf('ldExample')} value={demo} onChange={setDemo} options={DEMO_RHYTHMS.map((d) => ({ value: d, label: tf(`demo_${d}`) }))} />
        ) : undefined
      }
      footer={
        <div class="fg-legend">
          <span class="fg-legend__item">
            <span class="fg-lkey fg-lkey--atrial" />
            {tf('ldAtrial')}
          </span>
          <span class="fg-legend__item">
            <span class="fg-lkey fg-lkey--antegrade" />
            {tf('ldConducted')}
          </span>
          <span class="fg-legend__item">
            <span class="fg-lkey fg-lkey--blocked" />
            {tf('ldBlocked')}
          </span>
          <span class="fg-legend__item">
            <span class="fg-lkey fg-lkey--origin" />
            {tf('ldOrigin')}
          </span>
          <span class="fg-legend__item">
            <span class="fg-lkey fg-lkey--ventricular" />
            {tf('ldVentricular')}
          </span>
        </div>
      }
      caption={tf('ldCaption')}
    >
      {empty ? (
        <div class="fg-empty" style={{ aspectRatio: `${W} / ${H}` }}>
          {tf('ldNeedsTruth')}
        </div>
      ) : (
        <div
          class="fg-focusable"
          tabIndex={0}
          role="slider"
          aria-label={tf('cursorAria')}
          aria-valuemin={Math.round(t0)}
          aria-valuemax={Math.round(t1)}
          aria-valuenow={c ?? Math.round(t0)}
          aria-valuetext={c == null ? '—' : `${Math.round(c)} ms`}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 200 : 40;
            const cur = c ?? t0;
            if (e.key === 'ArrowRight') cursor.value = Math.min(t1, cur + step);
            else if (e.key === 'ArrowLeft') cursor.value = Math.max(t0, cur - step);
            else if (e.key === 'Home') cursor.value = t0;
            else if (e.key === 'End') cursor.value = t1;
            else return;
            e.preventDefault();
          }}
        >
          <Svg
            w={W}
            h={H}
            label={tf('ldAria')}
            svgRef={svgRef}
            class="fg-scrub"
            onPointerDown={(e) => {
              dragging.current = true;
              (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
              setFromPointer(e);
            }}
            onPointerMove={(e) => {
              if (dragging.current) setFromPointer(e);
            }}
            onPointerUp={() => {
              dragging.current = false;
            }}
          >
            <defs>
              <clipPath id={`${uid}-clip`}>
                <rect x={PX} y={SY} width={PW} height={SH} />
              </clipPath>
            </defs>
            <PaperGrid x={PX} y={SY} w={PW} h={SH} mm={pxPerMm} minor={pxPerMm > 2.2} />
            <path d={stripD} class="fg-trace" clip-path={`url(#${uid}-clip)`} />
            <text x={PX - 8} y={SY + 16} text-anchor="end" class="fg-svg-text fg-svg-text--lead">
              II
            </text>

            {/* tiers */}
            {(['A', 'AV', 'V'] as const).map((k, i) => (
              <g>
                <rect x={PX} y={Y(i)} width={PW} height={TH} class={`fg-tier ${i === 1 ? 'fg-tier--av' : ''}`} />
                <text x={PX - 8} y={Y(i) + TH / 2} text-anchor="end" dominant-baseline="central" class="fg-svg-text fg-svg-text--strong">
                  {tf(`tier${k}`)}
                </text>
              </g>
            ))}
            {layout.segments.map(seg)}
            {layout.marks.map((m) =>
              m.kind === 'block' ? (
                blockBar(m.t, m.y)
              ) : m.kind === 'origin' ? (
                <circle cx={X(m.t)} cy={Y(m.y)} r={4.5} class="fg-lad-origin" />
              ) : (
                <path d={`M${X(m.t)} ${Y(m.y) - 9}V${Y(m.y) + 2}`} class="fg-lad-pace" />
              ),
            )}
            {layout.labels.map((lb) => (
              <text x={X(lb.t) + 6} y={Y(lb.y) + 4} class="fg-svg-text fg-lad-label tabular">
                {fmt(lb.ms)}
              </text>
            ))}
            {/* time axis: 200 ms ticks */}
            {Array.from({ length: Math.floor((t1 - t0) / 200) + 1 }, (_, i) => t0 + i * 200).map((t, i) => (
              <path d={`M${X(t)} ${Y(3)}V${Y(3) + (i % 5 === 0 ? 8 : 4)}`} class="fg-tick" />
            ))}
            <text x={PX + PW} y={Y(3) + 22} text-anchor="end" class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '10px' }}>
              {tf('ldAxis')}
            </text>
            {c != null && c >= t0 && c <= t1 && <path d={`M${X(c)} ${SY}V${Y(3)}`} class="fg-cursor" />}
          </Svg>
        </div>
      )}
    </FigureFrame>
  );
}
