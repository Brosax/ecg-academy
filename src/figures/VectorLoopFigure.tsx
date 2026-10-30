/**
 * Vectorcardiographic loops (frontal and horizontal) reconstructed from the ECG with the inverse Kors regression
 * (Kors et al., Eur Heart J 1990 — see math/kors.ts), for the beat under the cursor: P, QRS and T loops, the mean QRS
 * vector and the instantaneous vector at the cursor. Without an ECG a schematic normal QRS loop is traced once.
 */
import { useMemo, useRef } from 'preact/hooks';
import type { Signal } from '@preact/signals';
import type { FigureParams } from './api';
import type { BeatMarks, Ecg } from '../core/ecg';
import { tf } from '../i18n/figures';
import { angleOf, clamp, polyline } from './math/geom';
import { beatWindow, loopSignedArea, meanVector, stepBeatCursor, stickyBeat, vcgAt, vcgSeries, type VcgSeries, type Xyz } from './math/kors';
import { DEFAULT_HORIZONTAL_DEG, frontalQrsLoop, horizontalQrsLoop } from './math/projection';
import { detectRPeaks } from './math/rate';
import { ArrowDefs, FigureFrame, fmtDeg, PaperGrid, ReplayButton, Svg, svgPoint, useCursor, usePlayOnce, useUid } from './shared';
import { leadPath } from './strip';

type Plane = 'frontal' | 'horizontal';
const W = 760;
const H = 440;
const PANEL = 300;
const STRIP_Y = 352;
const STRIP_H = 72;

interface BeatWin {
  readonly beat: BeatMarks;
  readonly approx: boolean;
}

/** Fiducials of the beat under the cursor: from truth, or approximated around detected R peaks. */
function useBeats(ecg: Ecg | undefined): { beats: BeatMarks[]; approx: boolean } {
  return useMemo(() => {
    if (!ecg) return { beats: [], approx: false };
    const tb = ecg.truth?.beats;
    if (tb && tb.length) return { beats: tb.slice(), approx: false };
    const peaks = detectRPeaks(ecg.signal.leads.II, ecg.signal.fs);
    const beats: BeatMarks[] = peaks.map((r) => ({
      kind: 'sinus',
      pOn: r - 230,
      pOff: r - 140,
      qrsOn: r - 50,
      qrsOff: r + 55,
      j: r + 55,
      tPeak: r + 280,
      tOff: r + 400,
      uOff: null,
      aberrant: false,
    }));
    return { beats, approx: true };
  }, [ecg]);
}

function Panel(props: {
  readonly plane: Plane;
  readonly ox: number;
  readonly oy: number;
  readonly size: number;
  readonly scale: number;
  readonly loops: ReadonlyArray<{ readonly kind: 'p' | 'qrs' | 't'; readonly pts: ReadonlyArray<readonly [number, number]> }>;
  readonly mean: readonly [number, number] | null;
  readonly inst: readonly [number, number] | null;
  readonly uid: string;
}) {
  const { ox, oy, size, scale } = props;
  const cx = ox + size / 2;
  const cy = oy + size / 2;
  const P = (x: number, y: number): [number, number] => [cx + x * scale, cy + y * scale];
  const fr = props.plane === 'frontal';
  return (
    <g>
      <rect x={ox} y={oy} width={size} height={size} rx={10} class="fg-cell__bg" />
      <path d={`M${ox + 12} ${cy}H${ox + size - 12}M${cx} ${oy + 12}V${oy + size - 12}`} class="fg-axisline" />
      <circle cx={cx} cy={cy} r={size * 0.42} class="fg-ring fg-ring--faint" />
      <text x={ox + size - 8} y={cy - 6} text-anchor="end" class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '10px' }}>
        {fr ? 'I 0°' : `V6 · ${tf('sideL')}`}
      </text>
      <text x={cx + 6} y={oy + size - 10} class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '10px' }}>
        {fr ? 'aVF +90°' : tf('posterior')}
      </text>
      <text x={cx + 6} y={oy + 20} class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '10px' }}>
        {fr ? '−90°' : `V2 · ${tf('anterior')}`}
      </text>
      <text x={ox + 8} y={cy - 6} class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '10px' }}>
        {fr ? '±180°' : tf('sideR')}
      </text>
      <text x={ox + 10} y={oy + 20} class="fg-svg-text fg-svg-text--strong">
        {tf(fr ? 'vlFrontal' : 'vlHorizontal')}
      </text>
      {props.loops.map((l) => (
        <path d={polyline(l.pts.map(([x, y]) => P(x, y)))} class={`fg-loop fg-loop--${l.kind}`} />
      ))}
      {props.mean && Math.hypot(props.mean[0], props.mean[1]) > 1e-9 && (
        // the mean vector is shown as a direction (fixed length): its frontal angle is the QRS axis
        <path
          d={`M${cx} ${cy}L${cx + (props.mean[0] / Math.hypot(props.mean[0], props.mean[1])) * size * 0.4} ${cy + (props.mean[1] / Math.hypot(props.mean[0], props.mean[1])) * size * 0.4}`}
          class="fg-meanvec"
          marker-end={`url(#${props.uid}-lead)`}
        />
      )}
      {props.inst &&
        (Math.hypot(props.inst[0], props.inst[1]) * scale > 10 ? (
          <path d={`M${cx} ${cy}L${P(props.inst[0], props.inst[1]).join(' ')}`} class="fg-vector" marker-end={`url(#${props.uid}-vector)`} />
        ) : (
          <circle cx={P(props.inst[0], props.inst[1])[0]} cy={P(props.inst[0], props.inst[1])[1]} r={4} class="fg-cursor-dot" />
        ))}
      <circle cx={cx} cy={cy} r={3} class="fg-vector-origin" />
    </g>
  );
}

const pick = (plane: Plane, v: Xyz): [number, number] => (plane === 'frontal' ? [v[0], v[1]] : [v[0], v[2]]);

export function VectorLoopFigure(props: { readonly params?: FigureParams['vector-loop']; readonly ecg?: Ecg; readonly cursor?: Signal<number | null> }) {
  const plane = props.params?.plane ?? 'both';
  const planes: Plane[] = plane === 'both' ? ['frontal', 'horizontal'] : [plane];
  const ecg = props.ecg;
  const cursor = useCursor(props.cursor);
  const uid = useUid('vl');
  const { beats, approx } = useBeats(ecg);
  const live = !!ecg && beats.length > 0;
  const wrapRef = useRef<HTMLDivElement>(null);
  const anim = usePlayOnce(2600, !live, wrapRef);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  /** the beat on screen: kept while the cursor stays inside its window (math/kors.ts stickyBeat) */
  const shownBeat = useRef(-1);

  const c = cursor.value;
  const durationMs = ecg?.signal.durationMs ?? 0;
  const bi = live ? stickyBeat(beats, c, shownBeat.current, durationMs) : -1;
  shownBeat.current = bi;
  const win: BeatWin | null = bi >= 0 ? { beat: beats[bi], approx } : null;

  const data = useMemo(() => {
    if (!ecg || !win) return null;
    const b = win.beat;
    const [t0, t1] = beatWindow(b, ecg.signal.durationMs);
    const s: VcgSeries = vcgSeries(ecg.signal, t0, t1, 2, [b.qrsOn - 40, b.qrsOn - 8]);
    const seg = (a: number | null, z: number | null) => {
      const out: Xyz[] = [];
      if (a == null || z == null) return out;
      for (let k = 0; k < s.t.length; k++) if (s.t[k] >= a && s.t[k] <= z) out.push([s.x[k], s.y[k], s.z[k]]);
      return out;
    };
    const qrs = seg(b.qrsOn, b.qrsOff);
    const p = seg(b.pOn, b.pOff);
    const tl = seg(b.j, b.tOff);
    let max = 1e-6;
    for (const v of qrs) max = Math.max(max, Math.hypot(v[0], v[1]), Math.hypot(v[0], v[2]));
    const mean = meanVector(s, b.qrsOn, b.qrsOff);
    return { s, qrs, p, t: tl, max, mean, t0, t1 };
  }, [ecg, win?.beat]);

  // schematic loops (unit amplitude)
  const schem = useMemo(() => ({ frontal: frontalQrsLoop(60, 96), horizontal: horizontalQrsLoop(DEFAULT_HORIZONTAL_DEG, 96) }), []);

  const size = planes.length === 2 ? PANEL : 330;
  const gap = planes.length === 2 ? (W - 2 * PANEL) / 3 : (W - size) / 2;
  const scale = data ? (size * 0.42) / data.max : size * 0.38;

  const loopsFor = (pl: Plane) => {
    if (data) {
      return [
        { kind: 'p' as const, pts: data.p.map((v) => pick(pl, v)) },
        { kind: 't' as const, pts: data.t.map((v) => pick(pl, v)) },
        { kind: 'qrs' as const, pts: data.qrs.map((v) => pick(pl, v)) },
      ];
    }
    const pts = schem[pl];
    const n = Math.max(2, Math.round(anim.p * (pts.length - 1)) + 1);
    return [{ kind: 'qrs' as const, pts: pts.slice(0, n) }];
  };
  const instFor = (pl: Plane): [number, number] | null => {
    if (data) {
      if (c == null) return null;
      const v = vcgAt(data.s, c);
      return v ? pick(pl, v) : null;
    }
    const pts = schem[pl];
    if (anim.p <= 0 || anim.p >= 1) return null;
    const v = pts[Math.round(anim.p * (pts.length - 1))];
    return [v[0], v[1]];
  };

  const meanF = data ? angleOf(data.mean[0], data.mean[1]) : 60;
  const meanH = data ? angleOf(data.mean[0], data.mean[2]) : null;
  const rot = data ? loopSignedArea(data.qrs.map((v) => v[0]), data.qrs.map((v) => v[1])) : 0;

  // strip
  const sx0 = 40;
  const sw = W - 80;
  const sT0 = data?.t0 ?? 0;
  const sT1 = data?.t1 ?? 1;
  const tX = (t: number) => sx0 + ((t - sT0) / (sT1 - sT0)) * sw;
  const stripD = useMemo(() => {
    if (!ecg || !data) return '';
    return leadPath(ecg.signal, 'II', sT0, sT1, tX, (mv) => clamp(STRIP_Y + STRIP_H * 0.62 - mv * 30, STRIP_Y + 1, STRIP_Y + STRIP_H - 1), 500);
  }, [ecg, data]);

  const scrub = (e: PointerEvent) => {
    if (!svgRef.current || !data) return;
    const [x, y] = svgPoint(svgRef.current, e);
    if (y < STRIP_Y - 10) return;
    cursor.value = Math.round(sT0 + clamp((x - sx0) / sw, 0, 1) * (sT1 - sT0));
  };

  const H2 = data ? H : STRIP_Y - 10;

  return (
    <FigureFrame
      id="vector-loop"
      title={tf('vlTitle')}
      wide
      controls={!live ? <ReplayButton onClick={anim.replay} /> : undefined}
      footer={
        <div class="fg-readout" aria-live="polite">
          <span>
            {tf('vlMeanFrontal')} <b class="fg-big tabular">{fmtDeg(meanF)}</b>
          </span>
          {meanH != null && (
            <span>
              {tf('vlMeanHorizontal')} <b class="tabular">{fmtDeg(meanH)}</b>
            </span>
          )}
          {data && <span class="fg-muted">{tf(rot >= 0 ? 'vlRotCw' : 'vlRotCcw')}</span>}
          {ecg?.truth && ecg.origin.kind === 'synthetic' && <span class="fg-muted">{tf('vlTruthAxis', { deg: fmtDeg(ecg.truth.axisDeg.qrs) })}</span>}
          {!live && <span class="fg-muted">{tf('vlSchematic')}</span>}
          {approx && <span class="fg-muted">{tf('vlApprox')}</span>}
        </div>
      }
      caption={tf('vlCaption')}
    >
      <div
        ref={wrapRef}
        class={data ? 'fg-focusable' : undefined}
        tabIndex={data ? 0 : undefined}
        role={data ? 'slider' : undefined}
        aria-label={data ? tf('cursorAria') : undefined}
        aria-valuemin={data ? Math.round(sT0) : undefined}
        aria-valuemax={data ? Math.round(sT1) : undefined}
        aria-valuenow={data ? Math.round(c ?? sT0) : undefined}
        aria-valuetext={data ? (c == null ? '—' : `${Math.round(c)} ms`) : undefined}
        onKeyDown={(e) => {
          if (!data || bi < 0) return;
          const step = e.shiftKey ? 40 : 4;
          let next: { readonly beat: number; readonly t: number };
          // arrows walk through the beat and on into the neighbouring beats; Home / End jump to this beat's edges
          if (e.key === 'ArrowRight') next = stepBeatCursor(beats, bi, c, step, durationMs);
          else if (e.key === 'ArrowLeft') next = stepBeatCursor(beats, bi, c, -step, durationMs);
          else if (e.key === 'Home') next = { beat: bi, t: sT0 };
          else if (e.key === 'End') next = { beat: bi, t: sT1 };
          else return;
          e.preventDefault();
          shownBeat.current = next.beat;
          cursor.value = Math.round(next.t);
        }}
      >
        <Svg
          w={W}
          h={H2}
          label={tf('vlAria')}
          svgRef={svgRef}
          class={data ? 'fg-scrub' : ''}
          onPointerDown={(e) => {
            if (!data) return;
            dragging.current = true;
            (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
            scrub(e);
          }}
          onPointerMove={(e) => {
            if (dragging.current) scrub(e);
          }}
          onPointerUp={() => {
            dragging.current = false;
          }}
        >
          <ArrowDefs id={uid} kinds={['vector', 'lead']} />
          {planes.map((pl, i) => (
            <Panel
              plane={pl}
              ox={gap + i * (size + gap)}
              oy={20}
              size={size}
              scale={scale}
              loops={loopsFor(pl)}
              mean={data ? pick(pl, data.mean) : null}
              inst={instFor(pl)}
              uid={uid}
            />
          ))}
          {data && (
            <g>
              <PaperGrid x={sx0} y={STRIP_Y} w={sw} h={STRIP_H} mm={sw / (((sT1 - sT0) / 1000) * 25)} minor={false} />
              {win && (
                <>
                  <rect x={tX(win.beat.qrsOn)} y={STRIP_Y} width={Math.max(1, tX(win.beat.qrsOff) - tX(win.beat.qrsOn))} height={STRIP_H} class="fg-span fg-span--qrs" />
                  <rect x={tX(win.beat.j)} y={STRIP_Y} width={Math.max(1, tX(win.beat.tOff) - tX(win.beat.j))} height={STRIP_H} class="fg-span fg-span--t" />
                </>
              )}
              <path d={stripD} class="fg-trace" />
              <text x={sx0 - 8} y={STRIP_Y + 14} text-anchor="end" class="fg-svg-text fg-svg-text--lead">
                II
              </text>
              {c != null && c >= sT0 && c <= sT1 && <path d={`M${tX(c)} ${STRIP_Y}V${STRIP_Y + STRIP_H}`} class="fg-cursor" />}
              <text x={sx0 + sw} y={STRIP_Y + STRIP_H + 13} text-anchor="end" class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '10px' }}>
                {tf('vlStripHint')}
              </text>
            </g>
          )}
        </Svg>
      </div>
    </FigureFrame>
  );
}
