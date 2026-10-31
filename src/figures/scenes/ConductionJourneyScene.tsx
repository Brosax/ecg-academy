/**
 * One beat along the wire: what each structure draws (lesson f1; spec docs/design/f-explainers.md §4.1; contract
 * src/figures/scene/README.md). Render only: every number comes from conduction-journey.math.ts (`frame`), the heart
 * from the engine's region states of the block's ECG, the pen from lead II of the same signal (nothing per lead).
 */
import type { Signal } from '@preact/signals';
import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Ecg } from '../../core/ecg';
import { labHref } from '../../lab/links';
import { LinkButton } from '../../ui/index';
import type { FigureParams } from '../api';
import { AP_RANGE, apValue } from '../math/ap';
import { sample } from '../math/beat';
import { polyline } from '../math/geom';
import { PHASE_LABEL_KEY, pOfTime, SceneFrame, tsn, useScene } from '../scene/index';
import { Check, PaperGrid, Svg, svgPoint, useUid } from '../shared';
import { leadPath } from '../strip';
import './conduction-journey.css';
import { tConductionJourney as t, type BeatId } from './conduction-journey.i18n';
import * as M from './conduction-journey.math';

type Props = { readonly params?: FigureParams['conduction-journey']; readonly cursor?: Signal<number | null>; readonly ecg?: Ecg };
type Pt = readonly [number, number];

function Chip(p: { readonly x: number; readonly y: number; readonly text: string; readonly op: number; readonly start?: boolean; readonly cls?: string }) {
  const b = M.chipBox(p.x, p.y, p.text, p.start);
  return (
    <g class={`cj-chip ${p.cls ?? ''}`} style={{ opacity: p.op }} aria-hidden="true">
      <rect x={b.x0} y={b.y0} width={b.x1 - b.x0} height={20} rx={10} />
      <text x={(b.x0 + b.x1) / 2} y={p.y + 4} text-anchor="middle">
        {p.text}
      </text>
    </g>
  );
}

/** A path revealed along its length (stroke-dasharray on pathLength 1). */
function RevealPath(p: { readonly d: string; readonly f: number; readonly op?: number; readonly cls: string }) {
  return <path d={p.d} pathLength={1} class={p.cls} style={{ strokeDasharray: `${Math.max(0, p.f)} 1.01`, opacity: p.op ?? 1 }} />;
}

export function ConductionJourneyScene(props: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef(false);
  const uid = useUid('cj');
  const [labels, setLabels] = useState(true);
  // placement: a first guess, then the stage width once at mount (before any playback), never during playback
  const [pl, setPl] = useState(() => M.placementFor(typeof window === 'undefined' ? 760 : window.innerWidth - 80));
  useLayoutEffect(() => {
    const w = stage.current?.clientWidth;
    if (w) setPl(M.placementFor(w));
  }, []);

  const ecg = props.ecg;
  const src = useMemo(() => (ecg ? M.ecgSource(ecg) : null) ?? M.schematicSource(), [ecg]);
  const live = !src.schematic;
  const sc = useScene({ timeline: src.timeline, cursor: live ? props.cursor : undefined, target: stage });
  const win = src.timeline.window ?? ([src.fid.start, src.fid.end] as const);
  const f = M.frame(sc.p, src);
  const a = f.anat;

  // computed once per source / placement: strip paper, trace, AP curve, label anchors, leader routes
  const g = useMemo(() => M.stripGeom(pl.strip, win, src.range), [src, pl]);
  const X = (tm: number) => M.stripX(g, tm);
  const Y = (mv: number) => M.stripY(g, mv);
  const H = (pt: Pt) => M.heartToStage(pl, pt);
  const apX = (tm: number) => pl.ap.x + ((tm - win[0]) / (win[1] - win[0])) * pl.ap.w;
  const apY = (mv: number) => pl.ap.y + ((AP_RANGE.max - mv) / (AP_RANGE.max - AP_RANGE.min)) * pl.ap.h;
  const geo = useMemo(() => {
    const fd = src.fid;
    const pts = (fn: (tm: number) => number, step: number, x: (tm: number) => number, y: (v: number) => number) =>
      polyline(sample(fn, win[0], win[1], step).map(([tm, v]) => [x(tm), y(v)] as const));
    const trace = live && ecg ? leadPath(ecg.signal, 'II', win[0], win[1], X, Y, 150) : pts(src.mv, 2.5, X, Y);
    const ap = pts((tm) => apValue('ventricular', M.apTime(src.beat, tm)), 3, apX, apY);
    let pPeak = 0;
    for (let tm = fd.pOn; tm <= fd.pOff; tm += 2) pPeak = Math.max(pPeak, src.mv(tm));
    const stMid = fd.qrsOff + 0.3 * (fd.tPeak - fd.qrsOff);
    const row1 = g.y0 + g.h + 12;
    const row2 = row1 + 26;
    const p: Pt = [X((fd.pOn + fd.pOff) / 2), Y(pPeak) - 10];
    const pr: Pt = [X(fd.pOn), X(src.beat.qrsOn)];
    const qrs: Pt = [X(fd.qrsOn), X(fd.qrsOff)];
    const st: Pt = [X(stMid), Y(Math.max(0, src.mv(stMid))) - 12];
    const tw: Pt = [X(fd.tPeak), Y(Math.max(0, src.mv(fd.tPeak))) - 10];
    const wide = pl.id === 'wide';
    const from: Record<M.LeaderId, Pt> = {
      p: [p[0], p[1] - 13],
      st: [st[0], st[1] - 13],
      t: [tw[0], tw[1] - 13],
      pr: wide ? [pr[0] - 3, row1] : [pr[1] + 3, row1],
      qrs: wide ? [qrs[0] - 3, row2] : [qrs[1] + 3, row2],
    };
    const leaders = M.LEADERS.map((id) => ({ id, to: H(M.HEART.target[id]), d: polyline(M.leaderRoute(pl, g, id, from[id], H(M.HEART.target[id]))) }));
    return { trace, ap, row1, row2, p, pr, qrs, st, t: tw, leaders };
  }, [src, pl, g]);

  const s = pl.heart.s;
  const penX = X(f.t);
  const penY = Y(f.mv);
  const L = labels ? 1 : 0;

  const scrub = (e: PointerEvent) => {
    if (!svgRef.current) return;
    const [x] = svgPoint(svgRef.current, e);
    sc.seek(pOfTime(win, g.t0 + ((x - g.x0) / g.mm) * 40));
  };

  const bracket = (x1: number, x2: number, y: number, grow: number, op: number, text: string, cls: string) => (
    <g class={cls} style={{ opacity: op > 0 || grow > 0 ? 1 : 0 }} aria-hidden="true">
      <path d={`M${x1} ${y - 5}V${y}H${x1 + (x2 - x1) * grow}${grow >= 1 ? `V${y - 5}` : ''}`} class="cj-br" style={{ opacity: Math.min(1, grow * 4) }} />
      <text x={(x1 + x2) / 2} y={y + 14} text-anchor="middle" class="cj-lbl cj-lbl--out" style={{ opacity: op }}>
        {text}
      </text>
    </g>
  );
  const leaderOp: Record<M.LeaderId, readonly [number, string]> = {
    p: [f.lblP, 'cj-k-atrial'],
    st: [f.lblSt, 'cj-k-st'],
    t: [f.lblT, 'cj-k-repol'],
    pr: [f.lblPr, 'cj-k-cond'],
    qrs: [f.lblQrs, 'cj-k-qrs'],
  };
  const lad = M.HEART.ladder;
  const ladderKeys = ['lbl_rateSa', 'lbl_rateAv', 'lbl_rateV'] as const;
  const lab = labHref('normal-ecg');
  const av = M.HEART.av;

  return (
    <SceneFrame
      id="conduction-journey"
      title={t('title')}
      aria={t('aria')}
      scene={sc}
      stageRef={stage}
      narration={(id: BeatId) => t(`beat_${id}`)}
      beatLabel={(id: BeatId) => tsn(PHASE_LABEL_KEY[id])}
      slow={M.SLOW}
      controls={
        <>
          <Check id={`${uid}-lbl`} label={t('ctl_labels')} checked={labels} onChange={setLabels} />
          {lab && (
            <LinkButton href={lab} size="sm">
              {tsn('scLab')}
            </LinkButton>
          )}
        </>
      }
      caption={t('caption')}
    >
      <Svg
        w={pl.w}
        h={pl.h}
        label={t('aria')}
        svgRef={svgRef}
        class="fg-scrub"
        maxWidth={pl.id === 'narrow' ? 460 : undefined}
        onPointerDown={(e) => {
          if (!svgRef.current) return;
          const [x, y] = svgPoint(svgRef.current, e);
          if (x < g.x0 - 6 || x > g.x0 + g.w + 6 || y < g.y0 || y > geo.row2 + 18) return;
          drag.current = true;
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
          scrub(e);
        }}
        onPointerMove={(e) => {
          if (drag.current) scrub(e);
        }}
        onPointerUp={() => {
          drag.current = false;
        }}
      >
        <defs>
          <clipPath id={`${uid}-pen`}>
            <rect x={g.x0 - 2} y={g.y0 - 30} width={Math.max(0, penX - g.x0 + 2)} height={g.h + 40} />
          </clipPath>
          <clipPath id={`${uid}-ap`}>
            <rect x={pl.ap.x - 2} y={pl.ap.y - 4} width={Math.max(0, apX(f.t) - pl.ap.x + 2)} height={pl.ap.h + 8} />
          </clipPath>
        </defs>

        {/* the schematic heart, from the engine's region states */}
        <g transform={`translate(${pl.heart.x} ${pl.heart.y}) scale(${s})`} aria-hidden="true">
          <path d={M.HEART.outline} class="fg-heart" />
          {(['ra', 'la'] as const).map((k) => (
            <g key={k}>
              <path d={M.HEART.chamber[k]} class="fg-chamber" />
              <path d={M.HEART.chamber[k]} class="fg-chamber-fill fg-chamber-fill--atria" style={{ opacity: 0.6 * a.fill[k] }} />
            </g>
          ))}
          {(['rv', 'lv', 'base', 'sep'] as const).map((k) => (
            <g key={k}>
              <path d={M.HEART.chamber[k]} class={k === 'sep' ? 'fg-chamber fg-chamber--septum' : 'fg-chamber'} />
              <path d={M.HEART.chamber[k]} class="fg-chamber-fill fg-chamber-fill--vent" style={{ opacity: 0.6 * a.fill[k] }} />
              <path d={M.HEART.chamber[k]} class="cj-repol" style={{ opacity: 0.45 * a.repol[k] }} />
            </g>
          ))}
          <path d={M.HEART.avRing} class="fg-avring" />
          {M.WIRES.map((k) => (
            <g key={k}>
              <path d={M.HEART.wire[k].join('')} class="fg-cs fg-cs--rest" />
              {M.HEART.wire[k].map((d, i) => (
                <RevealPath key={i} d={d} f={a.wire[k]} op={a.wireOp[k]} cls="fg-cs fg-cs--on" />
              ))}
            </g>
          ))}
          <circle cx={av[0]} cy={av[1]} r={16} class="cj-arc cj-arc--track" style={{ opacity: Math.min(1, 8 * f.avArc) * L }} />
          <circle cx={av[0]} cy={av[1]} r={16} pathLength={1} class="cj-arc" transform={`rotate(-90 ${av[0]} ${av[1]})`} style={{ strokeDasharray: `${f.avArc} 1.01`, opacity: f.avArc > 0 ? 1 : 0 }} />
          <circle cx={av[0]} cy={av[1]} r={9 + 16 * f.avArc} class="cj-ring" style={{ opacity: 0.7 * (1 - f.avArc) * Math.min(1, 8 * f.avArc) }} />
          <circle cx={M.HEART.sa[0]} cy={M.HEART.sa[1]} r={7} class="fg-node" style={{ opacity: 0.35 + 0.65 * a.sa }} />
          <circle cx={av[0]} cy={av[1]} r={8} class="fg-node" style={{ opacity: 0.35 + 0.65 * a.av }} />
        </g>
        <g aria-hidden="true">
          {M.NAME_IDS.map((k) => {
            const n = M.HEART.names[k];
            const [x, y] = H(n.at);
            return (
              <text key={k} x={x} y={y} text-anchor={n.anchor} class="fg-svg-text fg-svg-text--small">
                {t(`lbl_${k}`)}
              </text>
            );
          })}
        </g>

        {/* lead II: the pen draws the real signal; paper under a time-linear clip */}
        <text x={g.x0} y={g.y0 - 10} class="fg-svg-text fg-svg-text--strong">
          {t('lbl_lead')}
        </text>
        <PaperGrid x={g.x0} y={g.y0} w={g.w} h={g.h} mm={g.mm} />
        <path d={geo.trace} class="fg-trace" clip-path={`url(#${uid}-pen)`} />
        <rect x={g.x0} y={g.y0} width={g.w} height={geo.row2 + 18 - g.y0} class="cj-hit" />
        <circle cx={penX} cy={penY} r={11} class="cj-glow" style={{ opacity: 0.35 * f.penGlow }} />
        <circle cx={penX} cy={penY} r={3.5} class="sc-pen sc-pen--glow" />
        <text x={penX + 8} y={g.baseY - 18} class="fg-svg-text fg-svg-text--hi" style={{ opacity: f.penGlow }} aria-hidden="true">
          {t('lbl_fewCells')}
        </text>
        <text x={pl.moral.x} y={pl.moral.y} text-anchor={pl.moral.anchor} class="cj-moral" style={{ opacity: f.moral }}>
          {t('lbl_moral')}
        </text>

        {labels && (
          <g aria-hidden="true">
            <text x={geo.p[0]} y={geo.p[1]} text-anchor="middle" class="cj-lbl cj-k-atrial" style={{ opacity: f.lblP }}>
              {t('lbl_p')}
            </text>
            <text x={geo.st[0]} y={geo.st[1]} text-anchor="middle" class="cj-lbl cj-k-st" style={{ opacity: f.lblSt }}>
              {t('lbl_st')}
            </text>
            <text x={geo.t[0]} y={geo.t[1]} text-anchor="middle" class="cj-lbl cj-k-repol" style={{ opacity: f.lblT }}>
              {t('lbl_t')}
            </text>
            {bracket(geo.pr[0], geo.pr[1], geo.row1, f.prGrow, f.lblPr, t('lbl_pr'), 'cj-k-cond')}
            {bracket(geo.qrs[0], geo.qrs[1], geo.row2, f.qrsGrow, f.lblQrs, t('lbl_qrs'), 'cj-k-qrs')}

            {/* pacemaker ladder (intrinsic rates) and conduction speeds */}
            <g style={{ opacity: f.ladder }}>
              <text x={H([lad.x, lad.header])[0]} y={H([lad.x, lad.header])[1]} class="fg-svg-text fg-svg-text--small">
                {t('lbl_ladder')}
              </text>
              {lad.rows.map((r, i) => {
                const [x, y] = H([lad.x, r.y]);
                const [tx, ty] = H(r.to);
                const w = M.textW(t(ladderKeys[i])) + 14;
                return (
                  <g key={i}>
                    <path d={`M${x + w} ${y}L${tx} ${ty}`} class="fg-leader" />
                    <Chip x={x} y={y} text={t(ladderKeys[i])} op={1} start />
                  </g>
                );
              })}
            </g>
            <Chip x={H(M.HEART.chipAv)[0]} y={H(M.HEART.chipAv)[1]} text={t('lbl_speedAv')} op={f.chipAv} cls="cj-k-cond" />
            <Chip x={H(M.HEART.chipHis)[0]} y={H(M.HEART.chipHis)[1]} text={t('lbl_speedHis')} op={f.chipHis} cls="cj-k-cond" />
          </g>
        )}

        {/* ventricular action potential, aligned on the QRS onset of the same beat */}
        <g aria-hidden="true">
          <rect x={pl.ap.x} y={pl.ap.y} width={pl.ap.w} height={pl.ap.h} rx={4} class="cj-ap-box" />
          <text x={pl.ap.x} y={pl.ap.y - 6} class="fg-svg-text fg-svg-text--small">
            {t('lbl_apTitle')}
          </text>
          <path d={geo.ap} class="cj-ap" clip-path={`url(#${uid}-ap)`} />
          <circle cx={apX(f.t)} cy={apY(f.apMv)} r={3} class="cj-dot" />
          <text x={pl.ap.x + pl.ap.w} y={pl.ap.y + pl.ap.h + 14} text-anchor="end" class="fg-svg-text fg-svg-text--strong tabular" style={{ fontSize: '11px' }}>
            {t('lbl_phase', { n: f.apPhase })}
          </text>
        </g>
        <text x={12} y={pl.h - 8} class="fg-svg-text fg-svg-text--small">
          {tsn('scSchematic')}
        </text>

        {/* leaders last, over heart and paper: label edge → lane / bracket row → gutter → its structure */}
        {labels && (
          <g aria-hidden="true" style={{ pointerEvents: 'none' }}>
            {geo.leaders.map(({ id, to, d }) => (
              <g key={id} class={leaderOp[id][1]} style={{ opacity: 0.85 * leaderOp[id][0] }}>
                <path d={d} class="cj-lead" />
                <circle cx={to[0]} cy={to[1]} r={2.5} fill="currentColor" />
              </g>
            ))}
          </g>
        )}
      </Svg>
    </SceneFrame>
  );
}
