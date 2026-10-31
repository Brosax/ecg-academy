/**
 * The heart vector is the pen (lesson f2; spec docs/design/f-explainers.md §4.2). Render only: every number comes
 * from vector-pen.math.ts. Strip, trail and cells project one loop; drag / lead pick recompute, never reset the tour.
 */
import type { Signal } from '@preact/signals';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Ecg } from '../../core/ecg';
import { LIMB_ANGLE_DEG, LIMB_LEADS } from '../../core/leads';
import type { FigureParams } from '../api';
import { angleDiff, angleOf, normDeg } from '../math/geom';
import type { DeflectionKind, LimbLead } from '../math/projection';
import { easeInOut, Predict, SceneFrame, tsn, useScene } from '../scene/index';
import { angleKey, ArrowDefs, Check, DegReserve, fmtDeg, fmtSigned, PaperGrid, prefersReducedMotion, Svg, SvgLabel, svgPoint, Toggle, useUid } from '../shared';
import { HexWheel } from '../wheel';
import { tVectorPen as t } from './vector-pen.i18n';
import * as M from './vector-pen.math';

type Props = { readonly params?: FigureParams['vector-pen']; readonly cursor?: Signal<number | null>; readonly ecg?: Ecg };

const KIND = { positive: 'lbl_pos', equiphasic: 'lbl_iso', negative: 'lbl_neg' } as const satisfies Record<DeflectionKind, string>;
const PICKS = [30, -60, 120] as const;
const CHIPS = [['chip_toward', '--ok'], ['chip_across', '--c-highlight'], ['chip_away', '--err']] as const;
const sign = (v: number) => (v >= 0 ? 'positive' : 'negative');

export function VectorPenScene(props: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const uid = useUid('vp');
  const lead0 = props.params?.lead ?? 'II';
  const [axis, setAxis] = useState(() => normDeg(props.params?.axisDeg ?? 60));
  const [lead, setLead] = useState<LimbLead>(lead0);
  const [leadDeg, setLeadDeg] = useState<number>(LIMB_ANGLE_DEG[lead0]);
  const [all, setAll] = useState(false);
  const [cabrera, setCabrera] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  // placement: a first guess from the window, refined from the stage width at mount and on resize (never during playback)
  const placementOf = (w: number) => M.PLACEMENT[w < M.NARROW_BELOW_PX ? 'narrow' : 'wide'];
  const [pl, setPl] = useState(() => placementOf(typeof window === 'undefined' ? 760 : window.innerWidth - 48));
  const sc = useScene({ beats: M.BEATS, target: stage });
  const playingRef = useRef(sc.playing);
  playingRef.current = sc.playing;
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const refine = () => {
      if (!playingRef.current && el.clientWidth > 0) setPl(placementOf(el.clientWidth));
    };
    refine();
    if (typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(refine);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // the Predict feedback describes the revealed state; any user-started playback makes it stale
  useEffect(() => {
    if (sc.playing) setFeedback(null);
  }, [sc.playing]);
  const dragging = useRef(false);
  const raf = useRef<Record<string, number>>({});

  // hand-rolled eased tween of one angle state (lead pick, Predict reveal); reduced motion jumps to the end
  const stopTween = (k: string) => {
    if (raf.current[k]) cancelAnimationFrame(raf.current[k]);
    raf.current[k] = 0;
  };
  const tweenTo = (k: string, from: number, to: number, ms: number, set: (v: number) => void) => {
    stopTween(k);
    if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function') return set(normDeg(to));
    const t0 = performance.now();
    const step = (now: number) => {
      const x = Math.min(1, (now - t0) / ms);
      set(M.tweenAngle(from, to, easeInOut(x)));
      raf.current[k] = x < 1 ? requestAnimationFrame(step) : 0;
    };
    raf.current[k] = requestAnimationFrame(step);
  };
  useEffect(() => () => Object.keys(raf.current).forEach(stopTween), []);

  const loop = useMemo(() => M.loopFor(axis), [axis]);
  const fronts = useMemo(() => M.fronts(loop), [loop]);
  const f = M.frame(sc.p, { loop, leadDeg });
  const trace = useMemo(() => M.traceOn(loop, f.axisDeg), [loop, f.axisDeg]);
  const letters = useMemo(() => M.waveLetters(trace), [trace]);

  const W = pl.wheel, S = pl.strip, vl = M.vlenOf(pl);
  const { C, mean, tip, inst, foot, shadow, tTip, penY, arrowOp, penX: px, baseY: by, paperX: tx, ...P } = M.points(pl, f, axis);
  const onLead = LIMB_LEADS.find((l) => Math.abs(angleDiff(f.axisDeg, LIMB_ANGLE_DEG[l])) < 0.5);
  const cells = all ? M.sixCells(cabrera) : M.TOUR_CELLS;
  const chipY = all ? pl.chipY6 : pl.chipY;

  const pickLead = (l: LimbLead) => {
    setFeedback(null);
    setLead(l);
    tweenTo('lead', leadDeg, LIMB_ANGLE_DEG[l], 450, setLeadDeg);
  };
  const pointer = (e: PointerEvent, start: boolean) => {
    if (!svgRef.current) return;
    const [x, y] = svgPoint(svgRef.current, e);
    const d = Math.hypot(x - W.cx, y - W.cy);
    if (start) {
      if (d > W.r + 24) return;
      setFeedback(null);
      stopTween('axis');
      dragging.current = true;
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    }
    if (dragging.current && d >= 8) setAxis(M.snapToAxes(angleOf(x - W.cx, y - W.cy)));
  };
  const correct = PICKS.filter((d) => M.kindOf(d, LIMB_ANGLE_DEG.III) === 'equiphasic').map((d) => `d${d}`);
  const txt = (cls: string, size?: number) => ({ class: `fg-svg-text ${cls}`, style: size ? { fontSize: size, fontWeight: 700 } : undefined });

  return (
    <SceneFrame
      id="vector-pen"
      title={t('title')}
      aria={t('aria')}
      scene={sc}
      stageRef={stage}
      narration={(id) => t(`beat_${id}`)}
      narrationReserve={[t('pq_ok'), t('pq_wrong')]}
      narrationOverride={feedback}
      caption={t('caption')}
      controls={
        <>
          <Toggle label={t('ctl_lead')} value={lead} onChange={pickLead} options={LIMB_LEADS.map((l) => ({ value: l, label: l }))} />
          <Check id={`${uid}-all`} label={t('ctl_all')} checked={all} onChange={setAll} />
          {all && <Check id={`${uid}-cab`} label={t('ctl_cabrera')} checked={cabrera} onChange={setCabrera} />}
          <span class="fg-readout">
            {t('lbl_mean')} <DegReserve deg={axis} big={false} />
          </span>
        </>
      }
      predict={
        <Predict
          question={t('pq_question')}
          options={PICKS.map((d) => ({ id: `d${d}`, label: fmtDeg(d) }))}
          correct={correct}
          playing={sc.playing}
          onReveal={(_pick, ok) => {
            setFeedback(t(ok ? 'pq_ok' : 'pq_wrong'));
            setAll(true);
            sc.seek(1);
            tweenTo('axis', axis, 30, 900, setAxis);
          }}
          onReset={() => setFeedback(null)}
        />
      }
    >
      <Svg
        w={pl.w}
        h={pl.h}
        label={t('aria')}
        role="group"
        svgRef={svgRef}
      >
        <ArrowDefs id={uid} kinds={['vector', 'lead2']} />
        <defs>
          <marker id={`${uid}-s`} viewBox="0 0 10 10" refX="8.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0 0L10 5L0 10z" class="fg-ah fg-ah--vector" />
          </marker>
          <marker id={`${uid}-ss`} viewBox="0 0 10 10" refX="8.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0 0L10 5L0 10z" class="fg-ah fg-ah--vector" />
          </marker>
          <clipPath id={`${uid}-c`}>
            <rect x={S.x} y={S.y} width={S.w} height={S.h} />
          </clipPath>
        </defs>
        <text x={8} y={14} class="fg-svg-text fg-svg-text--small">{tsn('scSchematic')}</text>

        {/* the wheel is the only drag surface (touch-action: none here alone, so a swipe elsewhere scrolls the page) */}
        <g
          class="fg-draggable"
          onPointerDown={(e) => pointer(e, true)}
          onPointerMove={(e) => pointer(e, false)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          <circle cx={W.cx} cy={W.cy} r={W.r + 24} fill="transparent" pointer-events="all" aria-hidden="true" />
          {/* wheel + highlighted (rotating) axis */}
          <HexWheel cx={W.cx} cy={W.cy} r={W.r} fontSize={pl.w < 600 ? 12 : 13} />
          <g aria-hidden="true" stroke="var(--c-highlight)">
            <path d={M.lineD(C, P.axisEnd)} stroke-width="2.8" />
            <path d={M.lineD(C, P.axisNeg)} stroke-width="1.6" stroke-dasharray="5 4" opacity="0.7" />
            <circle cx={P.axisEnd[0]} cy={P.axisEnd[1]} r={4.5} fill="var(--c-highlight)" />
          </g>
          {/* beat 1: fronts slide head to tail into the mean vector */}
          <g style={{ opacity: f.chainOn }} aria-hidden="true">
            <path d={M.outlineD(C, vl)} fill="var(--panel-2)" stroke="var(--border-strong)" stroke-width="1.2" opacity="0.8" />
            {fronts.map((fr, k) => {
              const g = M.frontSegment(fronts, k, f.chainF);
              const head = Math.hypot(fr.vx, fr.vy) * vl < 16 ? 'ss' : 's';
              return <path d={M.lineD([W.cx + g.x0 * vl, W.cy + g.y0 * vl], [W.cx + g.x1 * vl, W.cy + g.y1 * vl])} stroke="var(--c-vector)" stroke-width="2" marker-end={`url(#${uid}-${head})`} />;
            })}
          </g>
          {/* the loop trail the tip leaves: QRS, then the T loop */}
          <g transform={`translate(${W.cx} ${W.cy})`} aria-hidden="true">
            {f.s > M.ST_END_S && <path d={M.trailPath(loop.points, f.s, vl)} class="fg-loop fg-loop--t" />}
            <path d={M.trailPath(loop.points, Math.min(f.s, M.ST_END_S), vl)} class="fg-loop fg-loop--qrs" />
          </g>
          {/* mean vector's shadow on the axis (beats 4–5) */}
          <path d={M.lineD(C, shadow)} class={`fg-proj fg-proj--${M.kindOfTrace(trace)}`} style={{ opacity: f.shadowOn * 0.9 }} />
          {/* the drop + shadow; beat 2's guide to the pen (same number) */}
          <g style={{ opacity: f.dropOn }} aria-hidden="true">
            <path d={M.lineD(C, foot)} class={`fg-proj fg-proj--${sign(inst)}`} />
            <g class="fg-perp">
              <path d={M.lineD(tip, foot)} />
              <circle cx={foot[0]} cy={foot[1]} r={4} />
            </g>
          </g>
          <g style={{ opacity: f.guideOn }} aria-hidden="true">
            <path d={M.lineD(foot, [px, penY])} stroke="var(--c-vector)" stroke-width="1" stroke-dasharray="2 4" />
            <text x={P.instLbl[0]} y={P.instLbl[1]} {...txt('fg-svg-text--vector tabular', 12)}>{fmtSigned(inst, 2)}</text>
          </g>
          {/* mean vector + handle, instantaneous arrow, dashed T vector */}
          <path d={M.lineD(C, mean)} class="fg-vector" marker-end={`url(#${uid}-vector)`} style={{ opacity: f.meanOn * (1 - 0.6 * arrowOp) }} />
          <text x={P.meanLbl[0]} y={P.meanLbl[1]} text-anchor={P.meanAnchor} {...txt('fg-svg-text--vector', 11)} opacity={f.meanOn}>{t('lbl_mean')}</text>
          <path d={M.lineD(C, tip)} class="fg-vector" marker-end={`url(#${uid}-vector)`} style={{ opacity: arrowOp }} />
          <circle cx={W.cx} cy={W.cy} r={4} class="fg-vector-origin" />
          <g style={{ opacity: f.tVecOn }} aria-hidden="true">
            <path d={M.lineD(C, tTip)} stroke="var(--c-repol)" stroke-width="2.6" stroke-dasharray="6 4" marker-end={`url(#${uid}-lead2)`} />
            <text x={P.tLbl[0]} y={P.tLbl[1]} text-anchor={P.tAnchor} {...txt('', 11)} fill="var(--c-repol)">{t('lbl_tvec')}</text>
          </g>
          <g style={{ opacity: f.labelSumOn }} aria-hidden="true">
            <SvgLabel x={P.sumLbl[0]} y={P.sumLbl[1]} text={t('lbl_sum')} max={18} anchor="middle" class="fg-svg-text fg-svg-text--hi" />
          </g>
          <circle
            cx={mean[0]}
            cy={mean[1]}
            r={13}
            class="fg-handle"
            tabIndex={0}
            role="slider"
            aria-label={t('ctl_vector', { deg: fmtDeg(axis) })}
            aria-valuemin={-180}
            aria-valuemax={180}
            aria-valuenow={Math.round(axis)}
            aria-valuetext={fmtDeg(axis)}
            onKeyDown={(e) => {
              const v = angleKey(e, axis);
              if (v == null) return;
              e.preventDefault();
              setFeedback(null);
              stopTween('axis');
              setAxis(normDeg(v));
            }}
          />
        </g>

        {/* strip: paper moves under a fixed pen */}
        <g clip-path={`url(#${uid}-c)`} aria-hidden="true">
          <g transform={`translate(${tx} 0)`}>
            <PaperGrid x={S.x - px} y={S.y} w={S.w + M.PX_PER_S} h={S.h} mm={M.MM} />
            <path d={M.stripPath(trace, f.s, f.s > 0 ? f.penValue : undefined)} transform={`translate(0 ${by})`} class="fg-trace" style={{ strokeWidth: 2 }} />
            {letters.map((l) => (
              <text x={M.sOf(l.i) * M.PX_PER_S} y={by - l.v * M.TRACE_SCALE + (l.v >= 0 ? -6 : 14)} text-anchor="middle" {...txt('', 12)} fill={l.text === 'T' ? 'var(--c-repol)' : 'var(--c-qrs)'} opacity={f.s >= M.sOf(l.i) ? f.lettersOn : 0}>
                {l.text}
              </text>
            ))}
          </g>
          <path d={`M${S.x} ${by}H${S.x + S.w}`} class="fg-baseline" />
          <path d={`M${px} ${S.y}V${S.y + S.h}`} stroke="var(--border-strong)" stroke-dasharray="2 3" />
          <g style={{ opacity: f.guideOn }}>
            <path d={M.lineD([px, by], [px, penY])} class={`fg-proj fg-proj--${sign(f.penValue)}`} />
            <text x={px + 9} y={(by + penY) / 2 + 4} {...txt('fg-svg-text--vector tabular', 12)}>{fmtSigned(f.penValue, 2)}</text>
          </g>
          <circle cx={px} cy={penY} r={4.5} class={`sc-pen ${f.penGlow ? 'sc-pen--glow' : ''}`} />
          <text x={S.x + 6} y={S.y + 15} class="fg-svg-text fg-svg-text--lead tabular">{`${onLead ?? ''} ${fmtDeg(Math.round(f.axisDeg))}`.trim()}</text>
          <text x={S.x + S.w - 6} y={S.y + S.h - 6} text-anchor="end" {...txt('', 11)} fill="var(--c-repol)" opacity={f.tVecOn}>{t('lbl_tnote')}</text>
        </g>
        <rect x={S.x} y={S.y} width={S.w} height={S.h} fill="none" stroke="var(--border-strong)" />

        {/* cells: the same loop on fixed axes */}
        {cells.map((c, k) => {
          const r = M.cellRect(pl, k, all);
          const tr = M.traceOn(loop, c.deg);
          const kind = M.kindOfTrace(tr);
          const on = Math.abs(angleDiff(f.axisDeg, c.deg)) < 0.5;
          return (
            <g key={`${c.label}-${all}`} role="img" aria-label={t('lbl_cell', { lead: c.label, kind: t(KIND[kind]) })}>
              <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={7} fill="var(--panel-2)" stroke={on ? 'var(--c-highlight)' : 'var(--border)'} stroke-width={on ? 2 : 1} />
              <g style={{ opacity: all ? 1 : f.cellOn[k] }}>
                <text x={r.x + 7} y={r.y + 15} class="fg-svg-text fg-svg-text--lead">{c.label}</text>
                <text x={r.x + r.w - 6} y={r.y + 14} text-anchor="end" class={`fg-svg-text fg-defl fg-defl--${kind}`} style={{ fontSize: 11 }}>{t(KIND[kind])}</text>
                <path d={`M${r.x + 6} ${r.y + r.h * 0.56}H${r.x + r.w - 6}`} class="fg-baseline" />
                <path d={M.cellPath(tr, r.x, r.y, r.w, r.h)} class="fg-trace" />
              </g>
            </g>
          );
        })}
        {/* the rule: toward · across · away */}
        <g style={{ opacity: f.chipsOn }} aria-hidden="true">
          {CHIPS.map(([key, col], k) => {
            const r = M.cellRect(pl, k, false);
            const text = t(key);
            const two = text.length > M.CHIP_MAX && text.includes(' ');
            return (
              <g>
                <rect x={r.x} y={chipY} width={r.w} height={M.CHIP_H} rx={M.CHIP_H / 2} fill="var(--panel)" stroke={`var(${col})`} stroke-width="1.6" />
                <SvgLabel x={r.x + r.w / 2} y={chipY + (two ? 13 : 19)} text={text} max={M.CHIP_MAX} anchor="middle" class="fg-svg-text fg-svg-text--small fg-svg-text--strong" />
              </g>
            );
          })}
        </g>
      </Svg>
    </SceneFrame>
  );
}
