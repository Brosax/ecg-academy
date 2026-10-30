/**
 * Action potential (ventricular / atrial / sinus-node cell) with phases 0–4, aligned in time above a surface ECG beat:
 * QRS ↔ ventricular phase 0, ST ↔ phase 2 (plateau), T ↔ phase 3, TP ↔ phase 4; P ↔ atrial phase 0. A time cursor
 * (drag, keyboard, or the shared ECG cursor mapped onto the beat) reads the membrane potential and the phase.
 */
import { useMemo, useRef, useState } from 'preact/hooks';
import type { Signal } from '@preact/signals';
import type { FigureParams } from './api';
import type { Ecg } from '../core/ecg';
import { lt } from '../i18n/index';
import { tf } from '../i18n/figures';
import { AP_PHASE_TEXT } from './data/ap';
import { AP_CELLS, AP_RANGE, AP_RR, AP_WINDOW, apPhaseAt, apPhases, apValue, beatZero, ecgPartAt, mapFromSchematic, mapToSchematic, type ApCell, type ApPhase, type EcgPart } from './math/ap';
import { NORMAL_BEAT, periodicValue } from './math/beat';
import { clamp, polyline } from './math/geom';
import { FigureFrame, fmt, Reserve, Svg, svgPoint, Toggle } from './shared';

const W = 760;
const H = 430;
const PX = 64;
const PW = W - PX - 20;
const AY0 = 34; // AP panel
const AY1 = 226;
const EY0 = 262; // ECG panel
const EY1 = 392;
const X = (t: number) => PX + ((t - AP_WINDOW.t0) / (AP_WINDOW.t1 - AP_WINDOW.t0)) * PW;
const T = (x: number) => AP_WINDOW.t0 + ((x - PX) / PW) * (AP_WINDOW.t1 - AP_WINDOW.t0);
const YA = (mv: number) => AY1 - ((mv - AP_RANGE.min) / (AP_RANGE.max - AP_RANGE.min)) * (AY1 - AY0);
const YE = (mv: number) => EY0 + (EY1 - EY0) * 0.66 - mv * 72;

/** The schematic surface beat under the action potential (fixed: computed once per page load). */
const ECG_PATH = (() => {
  const pts: Array<[number, number]> = [];
  for (let tt = AP_WINDOW.t0; tt <= AP_WINDOW.t1; tt += 2) pts.push([X(tt), YE(periodicValue(NORMAL_BEAT, tt + AP_RR, AP_RR))]);
  return polyline(pts);
})();

const ECG_PARTS = ['pre-p', 'p', 'pr', 'qrs', 'st', 't', 'tp'] as const satisfies readonly EcgPart[];

const ECG_LABELS: ReadonlyArray<readonly [string, number]> = [
  ['P', 50],
  ['QRS', 200],
  ['ST', 268],
  ['T', 410],
];

export function ActionPotentialFigure(props: { readonly params?: FigureParams['action-potential']; readonly ecg?: Ecg; readonly cursor?: Signal<number | null> }) {
  const [cell, setCell] = useState<ApCell>(props.params?.cell ?? 'ventricular');
  const [local, setLocal] = useState<number>(270);
  const [pinned, setPinned] = useState<ApPhase | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  /** the last cursor value this figure wrote, with the beat it was anchored on and the schematic time it meant */
  const wrote = useRef<{ readonly c: number; readonly start: number; readonly t: number } | null>(null);

  // with an ECG and a shared cursor the figure follows the cursor (mapped onto the beat under it), and moving the
  // figure's own cursor moves the shared one
  const beats = props.ecg?.truth?.beats ?? [];
  const follow = props.cursor != null && beats.length > 0;
  const cur = props.cursor?.value ?? null;
  const own = wrote.current != null && cur === wrote.current.c ? wrote.current : null;
  const mapped = follow ? mapToSchematic(beats, cur) : null;
  const t = own ? own.t : (mapped?.t ?? local);
  const setT = (v: number) => {
    const tt = Math.round(clamp(v, AP_WINDOW.t0, AP_WINDOW.t1));
    setLocal(tt);
    if (follow && props.cursor) {
      const start = own?.start ?? mapped?.start ?? beatZero(beats[0]);
      const c = mapFromSchematic(start, tt);
      wrote.current = { c, start, t: tt };
      props.cursor.value = c;
    }
  };
  const v = apValue(cell, t);
  const phase = pinned ?? apPhaseAt(cell, t);
  const part = ecgPartAt(t);
  const spans = apPhases(cell);

  // the traces depend only on the cell type: built once, not on every cursor move
  const apPath = useMemo(() => {
    const pts: Array<[number, number]> = [];
    for (let tt = AP_WINDOW.t0; tt <= AP_WINDOW.t1; tt += 1) pts.push([X(tt), YA(apValue(cell, tt))]);
    return polyline(pts);
  }, [cell]);

  // alignment connectors (ventricular: QRS/ST/T; atrial: P; nodal: firing before P)
  const links: ReadonlyArray<readonly [number, string]> =
    cell === 'ventricular'
      ? [
          [spans.find((s) => s.phase === 0)?.t0 ?? 168, 'QRS'],
          [spans.find((s) => s.phase === 2)?.t0 ?? 186, ''],
          [spans.find((s) => s.phase === 3)?.t0 ?? 300, 'T'],
          [spans.find((s) => s.phase === 3)?.t1 ?? 470, ''],
        ]
      : cell === 'atrial'
        ? [
            [spans.find((s) => s.phase === 0)?.t0 ?? 4, 'P'],
            [spans.find((s) => s.phase === 3)?.t1 ?? 215, 'Ta'],
          ]
        : [[spans.find((s) => s.phase === 0 && s.t0 > -100)?.t0 ?? -28, '']];

  const onPointer = (e: PointerEvent) => {
    if (!svgRef.current) return;
    const [x] = svgPoint(svgRef.current, e);
    setPinned(null);
    setT(T(x));
  };

  return (
    <FigureFrame
      id="action-potential"
      title={tf('apTitle')}
      wide
      controls={
        <>
          <Toggle label={tf('apCell')} value={cell} onChange={setCell} options={AP_CELLS.map((c) => ({ value: c, label: tf(`apCell_${c}`) }))} />
          <span class="fg-btn-group" role="group" aria-label={tf('apPhases')}>
            {([0, 1, 2, 3, 4] as const).map((p) => (
              <button
                type="button"
                class={`fg-btn fg-btn--phase ${phase === p ? 'is-on' : ''}`}
                aria-pressed={pinned === p}
                disabled={cell === 'nodal' && (p === 1 || p === 2)}
                onClick={() => {
                  setPinned(pinned === p ? null : p);
                  const s = spans.find((x) => x.phase === p && x.t1 > AP_WINDOW.t0 + 1 && x.t0 > -60) ?? spans.find((x) => x.phase === p);
                  if (s) setT((Math.max(s.t0, AP_WINDOW.t0) + Math.min(s.t1, AP_WINDOW.t1)) / 2);
                }}
              >
                {p}
              </button>
            ))}
          </span>
        </>
      }
      footer={
        <div class="fg-info fg-info--tall" aria-live="polite">
          <div class="fg-info__title">
            <span class={`fg-phase-badge fg-phase-badge--${phase}`}>{tf('apPhaseN', { n: phase })}</span>
            {/* the read-out changes with every cursor move: its box fits the widest numbers and every ECG part */}
            <Reserve class="tabular fg-muted" reserve={ECG_PARTS.map((x) => `${tf('apReadout', { t: fmt(-100), mv: fmt(-88) })} · ${tf(`ecgPart_${x}`)}`)}>
              {tf('apReadout', { t: fmt(t), mv: fmt(v) })} · {tf(`ecgPart_${part}`)}
            </Reserve>
          </div>
          <Reserve block reserve={([0, 1, 2, 3, 4] as const).map((n) => lt(AP_PHASE_TEXT[cell][n]))}>
            {lt(AP_PHASE_TEXT[cell][phase])}
          </Reserve>
        </div>
      }
      caption={follow ? `${tf('apCaption')} ${tf('apFollows')}` : tf('apCaption')}
    >
      <div
        class="fg-focusable"
        tabIndex={0}
        role="slider"
        aria-label={tf('cursorAria')}
        aria-valuemin={AP_WINDOW.t0}
        aria-valuemax={AP_WINDOW.t1}
        aria-valuenow={Math.round(t)}
        aria-valuetext={`${Math.round(t)} ms, ${tf('apPhaseN', { n: phase })}`}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 50 : 10;
          if (e.key === 'ArrowRight') setT(Math.round(t) + step);
          else if (e.key === 'ArrowLeft') setT(Math.round(t) - step);
          else return;
          setPinned(null);
          e.preventDefault();
        }}
      >
        <Svg
          w={W}
          h={H}
          label={tf('apAria', { cell: tf(`apCell_${cell}`) })}
          svgRef={svgRef}
          class="fg-scrub"
          onPointerDown={(e) => {
            dragging.current = true;
            (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
            onPointer(e);
          }}
          onPointerMove={(e) => {
            if (dragging.current) onPointer(e);
          }}
          onPointerUp={() => {
            dragging.current = false;
          }}
        >
          {/* phase bands */}
          {spans.map((s) => (
            <g>
              <rect x={X(s.t0)} y={AY0} width={Math.max(0, X(s.t1) - X(s.t0))} height={AY1 - AY0} class={`fg-band fg-band--${s.phase} ${phase === s.phase ? 'is-on' : ''}`} />
              {X(s.t1) - X(s.t0) > 9 && (
                <text x={(X(s.t0) + X(s.t1)) / 2} y={AY0 + 14} text-anchor="middle" class="fg-svg-text fg-band__n">
                  {s.phase}
                </text>
              )}
            </g>
          ))}
          {/* AP axes */}
          {[-80, -40, 0, 20].map((mv) => (
            <g>
              <path d={`M${PX} ${YA(mv)}H${PX + PW}`} class={mv === 0 ? 'fg-zero' : 'fg-gridline'} />
              <text x={PX - 6} y={YA(mv) + 4} text-anchor="end" class="fg-svg-text fg-svg-text--muted tabular" style={{ fontSize: '10px' }}>
                {fmt(mv)}
              </text>
            </g>
          ))}
          <text x={14} y={AY0 + 4} class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '10px' }}>
            mV
          </text>
          {cell === 'nodal' && (
            <g>
              <path d={`M${PX} ${YA(-41)}H${PX + PW}`} class="fg-threshold" />
              <text x={PX + PW - 4} y={YA(-41) - 4} text-anchor="end" class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '10px' }}>
                {tf('apThreshold')}
              </text>
            </g>
          )}
          <path d={apPath} class="fg-ap" />
          <text x={PX + 6} y={AY0 - 8} class="fg-svg-text fg-svg-text--strong" style={{ fontSize: '12px' }}>
            {tf(`apCell_${cell}`)}
          </text>

          {/* ECG */}
          <rect x={PX} y={EY0} width={PW} height={EY1 - EY0} class="fg-paper" />
          <path d={`M${PX} ${YE(0)}H${PX + PW}`} class="fg-baseline" />
          <path d={ECG_PATH} class="fg-trace" />
          {ECG_LABELS.map(([lbl, tt]) => (
            <text x={X(tt)} y={EY1 + 16} text-anchor="middle" class={`fg-svg-text fg-ecglabel ${part === lbl.toLowerCase() ? 'is-on' : ''}`}>
              {lbl}
            </text>
          ))}
          <text x={PX + 6} y={EY0 + 14} class="fg-svg-text fg-svg-text--strong" style={{ fontSize: '12px' }}>
            {tf('apSurface')}
          </text>

          {/* alignment links */}
          {links.map(([tt, lbl]) => (
            <g>
              <path d={`M${X(tt)} ${AY0}V${EY1}`} class="fg-link" />
              {lbl && (
                <text x={X(tt) + 3} y={EY0 - 6} class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '10px' }}>
                  {lbl}
                </text>
              )}
            </g>
          ))}

          {/* cursor */}
          <path d={`M${X(t)} ${AY0 - 6}V${EY1 + 2}`} class="fg-cursor" />
          <circle cx={X(t)} cy={YA(v)} r={4.5} class="fg-cursor-dot" />
          <text x={X(AP_WINDOW.t1)} y={H - 6} text-anchor="end" class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '10px' }}>
            {tf('apAxis')}
          </text>
        </Svg>
      </div>
    </FigureFrame>
  );
}
