/**
 * Paper & calibration explorer: a piece of ECG paper (in true millimetres) with a calibration pulse and a sample
 * complex. Speed and gain toggles visibly stretch / grow the complex; zoom shows what one small and one large square
 * are worth at the current settings.
 */
import { useRef, useState } from 'preact/hooks';
import type { FigureParams } from './api';
import { tf } from '../i18n/figures';
import { NORMAL_BEAT, periodicValue } from './math/beat';
import { clamp, polyline } from './math/geom';
import { calibrationPulse, mmFromMs, rrBracket, squareValues, type Gain, type Speed } from './math/paper';
import { Check, FigureFrame, fmt, PaperGrid, Svg, Toggle, useUid } from './shared';

const W = 70;
const H = 38;
const BASE = 27; // baseline y (mm)
const X0 = 14; // trace start (mm)
const RR = 800;
const ZOOMS = [1, 2, 4] as const;
type Zoom = (typeof ZOOMS)[number];

export function PaperFigure(props: { readonly params?: FigureParams['paper'] }) {
  const [speed, setSpeed] = useState<Speed>(25);
  const [gain, setGain] = useState<Gain>(10);
  const [zoom, setZoom] = useState<Zoom>(1);
  const [showCal, setShowCal] = useState(props.params?.showCalibration ?? true);
  const [focus, setFocus] = useState<[number, number]>([12, 20]);
  const svgRef = useRef<SVGSVGElement>(null);
  const uid = useUid('pp');
  /** drag start: pointer (client px), focus (mm) and the px-per-mm scale at that moment */
  const drag = useRef<{ cx: number; cy: number; fx: number; fy: number; scale: number } | null>(null);

  const vw = W / zoom;
  const vh = H / zoom;
  const fx = clamp(focus[0], vw / 2, W - vw / 2);
  const fy = clamp(focus[1], vh / 2, H - vh / 2);
  const vx = fx - vw / 2;
  const vy = fy - vh / 2;

  const sq = squareValues(speed, gain);
  const cal = calibrationPulse(speed, gain);

  // calibration pulse
  const cx0 = 2;
  const calPath = polyline([
    [0.5, BASE],
    [cx0, BASE],
    [cx0, BASE - cal.heightMm],
    [cx0 + cal.widthMm, BASE - cal.heightMm],
    [cx0 + cal.widthMm, BASE],
    [cx0 + cal.widthMm + 1, BASE],
  ]);

  // sample trace (beats every RR ms from X0)
  const msPerMm = 1000 / speed;
  const pts: Array<[number, number]> = [];
  let traceTop = BASE;
  let traceBottom = BASE;
  for (let x = X0; x <= W - 0.5; x += 0.1) {
    const t = (x - X0) * msPerMm;
    const y = BASE - periodicValue(NORMAL_BEAT, t, RR) * gain;
    pts.push([x, y]);
    if (y < traceTop) traceTop = y;
    if (y > traceBottom) traceBottom = y;
  }
  const rT = 194; // R peak time of NORMAL_BEAT
  const rX = X0 + mmFromMs(rT, speed);
  const rAmp = 1.25; // R amplitude of NORMAL_BEAT (mV)
  const rTop = BASE - rAmp * gain;
  const r2X = X0 + mmFromMs(rT + RR, speed);
  // R–R bracket above the R peaks, or below the trace when the R reaches the top of the strip (20 mm/mV)
  const rrB = rrBracket(traceTop, traceBottom, H);

  // the first whole large square inside the view, for the annotation brackets
  const ax = Math.ceil((vx + 1.5) / 5) * 5;
  const ay = Math.ceil((vy + (zoom === 1 ? 1 : 0.6)) / 5) * 5;
  const fs = 1.35 / zoom; // ≈ 15 px whatever the zoom

  const pan = (dx: number, dy: number) => setFocus([clamp(fx + dx, vw / 2, W - vw / 2), clamp(fy + dy, vh / 2, H - vh / 2)]);

  const onKey = (e: KeyboardEvent) => {
    const step = 5 / zoom;
    if (e.key === 'ArrowLeft') pan(-step, 0);
    else if (e.key === 'ArrowRight') pan(step, 0);
    else if (e.key === 'ArrowUp') pan(0, -step);
    else if (e.key === 'ArrowDown') pan(0, step);
    else if (e.key === '+' || e.key === '=') setZoom(zoom === 1 ? 2 : 4);
    else if (e.key === '-' || e.key === '_') setZoom(zoom === 4 ? 2 : 1);
    else return;
    e.preventDefault();
  };

  const note = speed === 50 ? tf('paperNote50') : gain === 20 ? tf('paperNote20') : gain === 5 ? tf('paperNote5') : tf('paperNoteStd');

  return (
    <FigureFrame
      id="paper"
      title={tf('paperTitle')}
      controls={
        <>
          <Toggle label={tf('speedLabel')} value={speed} onChange={setSpeed} options={[25, 50].map((v) => ({ value: v as Speed, label: `${v} mm/s` }))} />
          <Toggle label={tf('gainLabel')} value={gain} onChange={setGain} options={[5, 10, 20].map((v) => ({ value: v as Gain, label: `${v} mm/mV` }))} />
          <Toggle label={tf('zoom')} value={zoom} onChange={setZoom} options={ZOOMS.map((z) => ({ value: z, label: `${z}×` }))} />
          <Check id={`${uid}-cal`} label={tf('calPulse')} checked={showCal} onChange={setShowCal} />
        </>
      }
      footer={
        <div class="fg-readout fg-readout--grid" aria-live="polite">
          <div>
            <span class="fg-key fg-key--minor" />
            <b>{tf('smallSquare')}</b>
            <span class="tabular">
              {tf('equalsTime', { v: fmt(sq.smallS, 2) })} · {tf('equalsVolt', { v: fmt(sq.smallMv, sq.smallMv < 0.1 ? 2 : 1) })}
            </span>
          </div>
          <div>
            <span class="fg-key fg-key--major" />
            <b>{tf('largeSquare')}</b>
            <span class="tabular">
              {tf('equalsTime', { v: fmt(sq.largeS, sq.largeS < 0.2 ? 2 : 1) })} · {tf('equalsVolt', { v: fmt(sq.largeMv, sq.largeMv < 0.5 ? 2 : 1) })}
            </span>
          </div>
          <div>
            <span class="fg-key fg-key--cal" />
            <b>{tf('calPulse')}</b>
            <span class="tabular">{tf('calValue', { mm: fmt(cal.heightMm), w: fmt(cal.widthMm) })}</span>
          </div>
          <div>
            <span class="fg-key fg-key--qrs" />
            <b>{tf('rWave')}</b>
            <span class="tabular">{tf('rValue', { mv: fmt(rAmp, 2), mm: fmt(rAmp * gain, 1) })}</span>
          </div>
        </div>
      }
      caption={
        <>
          <span class="fg-note">{note}</span> {tf('paperCaption')}
        </>
      }
    >
      <div
        class="fg-focusable"
        tabIndex={0}
        role="group"
        aria-label={tf('paperAria')}
        onKeyDown={onKey}
      >
        <Svg
          w={W}
          h={H}
          viewBox={`${vx} ${vy} ${vw} ${vh}`}
          label={tf('paperAria')}
          svgRef={svgRef}
          class={`fg-svg--clip ${zoom > 1 ? 'fg-pannable' : ''}`}
          onPointerDown={(e) => {
            if (zoom === 1 || !svgRef.current) return;
            const scale = svgRef.current.getBoundingClientRect().width / vw || 1; // CSS px per mm at this zoom
            drag.current = { cx: e.clientX, cy: e.clientY, fx, fy, scale };
            (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            // screen delta since the start, converted with the scale captured then (the viewBox itself moves)
            setFocus([clamp(d.fx - (e.clientX - d.cx) / d.scale, vw / 2, W - vw / 2), clamp(d.fy - (e.clientY - d.cy) / d.scale, vh / 2, H - vh / 2)]);
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
        >
          <PaperGrid x={0} y={0} w={W} h={H} mm={1} />
          {/* baseline guide */}
          <path d={`M0.5 ${BASE}H${W - 0.5}`} class="fg-baseline" />
          {showCal && <path d={calPath} class="fg-cal" />}
          <path d={polyline(pts)} class="fg-trace" />

          {/* R amplitude */}
          <g class="fg-anno fg-anno--qrs">
            <path d={`M${rX - 1.6} ${BASE}H${rX - 0.6}M${rX - 1.6} ${rTop}H${rX - 0.6}M${rX - 1.1} ${BASE}V${rTop}`} />
          </g>
          {/* R–R */}
          {r2X < W - 0.5 && (
            <g class="fg-anno fg-anno--vector">
              <path d={`M${rX} ${rrB.tick[0]}V${rrB.tick[1]}M${r2X} ${rrB.tick[0]}V${rrB.tick[1]}M${rX} ${rrB.lineY}H${r2X}`} />
              {zoom === 1 && (
                <text x={(rX + r2X) / 2} y={rrB.textY} class="fg-svg-text fg-svg-text--vector" style={{ fontSize: `${fs}px` }} text-anchor="middle">
                  {tf('rrValue', { ms: RR, mm: fmt(mmFromMs(RR, speed)) })}
                </text>
              )}
            </g>
          )}

          {/* large square bracket */}
          <g class="fg-anno fg-anno--major">
            <rect x={ax} y={ay} width={5} height={5} />
            <text x={ax + 2.5} y={ay - 0.35} text-anchor="middle" class="fg-svg-text" style={{ fontSize: `${fs}px` }}>
              {fmt(sq.largeS, sq.largeS < 0.2 ? 2 : 1)} s
            </text>
            <text x={ax + 5.4} y={ay + 2.5} dominant-baseline="middle" class="fg-svg-text" style={{ fontSize: `${fs}px` }}>
              {fmt(sq.largeMv, sq.largeMv < 0.5 ? 2 : 1)} mV
            </text>
          </g>
          {zoom > 1 && (
            <g class="fg-anno fg-anno--minor">
              <rect x={ax + 5 + (zoom === 2 ? 6 : 4)} y={ay + 1} width={1} height={1} />
              <text x={ax + 5.5 + (zoom === 2 ? 6 : 4)} y={ay + 0.7} text-anchor="middle" class="fg-svg-text" style={{ fontSize: `${fs * 0.8}px` }}>
                {fmt(sq.smallS, 2)} s
              </text>
              <text x={ax + 6.25 + (zoom === 2 ? 6 : 4)} y={ay + 1.5} dominant-baseline="middle" class="fg-svg-text" style={{ fontSize: `${fs * 0.8}px` }}>
                {fmt(sq.smallMv, sq.smallMv < 0.1 ? 2 : 1)} mV
              </text>
            </g>
          )}
        </Svg>
      </div>
    </FigureFrame>
  );
}
