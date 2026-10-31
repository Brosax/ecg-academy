/** A reference that is not on the chest (f3, spec §4.5). Render only (maths: chest-ring.math.ts); one source, the loop. */
import type { Signal } from '@preact/signals';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Ecg } from '../../core/ecg';
import { CHEST_LEADS } from '../../core/leads';
import type { FigureParams } from '../api';
import { angleOf, normDeg } from '../math/geom';
import { CHEST, DEFAULT_HORIZONTAL_DEG } from '../math/projection';
import { Predict, SceneFrame, tsn, useScene } from '../scene/index';
import { angleKey, ArrowDefs, DegReserve, fmt, fmtDeg, Reserve, Svg, SvgLabel, svgPoint, useUid } from '../shared';
import { tChestRing as t } from './chest-ring.i18n';
import * as M from './chest-ring.math';

type Props = { readonly params?: FigureParams['chest-ring']; readonly cursor?: Signal<number | null>; readonly ecg?: Ecg };

const HI = 'var(--c-highlight)';
const SM = 'fg-svg-text fg-svg-text--strong';
const SMALL = 'fg-svg-text fg-svg-text--small';
const F11 = { fontSize: '11px' };
const CLS = ['early', 'normal', 'late'] as const;
const TR_I = M.BEATS.findIndex((b) => b.id === 'transition');

export function ChestRingScene(props: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef(false);
  const playing = useRef(false);
  const uid = useUid('cr');
  const [pl, setPl] = useState(() => M.placementFor(typeof window === 'undefined' ? 760 : window.innerWidth - 48));
  // loop parameter (float); the arrow shows the loop's mean
  const [mainDeg, setMainDeg] = useState(() => normDeg(Math.round(props.params?.mainDeg ?? DEFAULT_HORIZONTAL_DEG)));
  const [reveal, setReveal] = useState<{ from: number; to: number } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pqKey, setPqKey] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const sc = useScene({ beats: M.BEATS, target: stage });
  playing.current = sc.playing;
  const f = M.frame(sc.p, { mainDeg, reveal });

  // the placement table follows the stage width, but never switches during playback
  useEffect(() => {
    const el = stage.current;
    if (!el || typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(() => {
      if (!playing.current && el.clientWidth > 0) setPl(M.placementFor(el.clientWidth));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const src = useMemo(() => M.computeSource(f.deg), [f.deg]);
  const paths = useMemo(() => M.cellPaths(pl, src), [pl, src]);
  const loopD = useMemo(() => M.loopPath(pl, src.loop), [pl, src]);
  const art = useMemo(() => ({ wires: M.wirePaths(pl), inset: M.insetAxes(pl), sec: M.sectionArt(pl), axes: CHEST_LEADS.map((_, k) => M.axisGeom(pl, k)) }), [pl]);

  const [jx, jy] = M.junction(pl);
  const mv = M.precordialAt(f.s);
  const [ex, ey] = M.toScreen(pl, mv.site);
  const nx = M.fromCentre(pl, mv.deg + 180, M.NEG_LEN * f.axis);
  const mean = src.meanDeg;
  const tip = M.fromCentre(pl, mean, M.VLEN);
  const perp = M.perpEnd(pl, mean);
  const drop = f.drawing >= 0 ? M.dropOnAxis(pl, src.loop, f.pen, mv.deg) : null;
  const pen = M.penPoint(pl, src, f);
  const tr = src.transition;
  const where = M.whereOf(tr);
  const pair = M.straddling(tr);
  const mk = M.markerScreen(pl, tr.crossing ?? M.SITES_MAX);
  const trText = where ? t('lbl_transition', { where }) : t('lbl_none');
  const hiK = hover ?? pinned;
  const S = pl.scale;
  const [px, py] = pl.panel;
  const row = (i: number) => py + pl.panelRows[i];
  const { sec } = art;

  // a drag / arrow key sets the mean; the loop parameter follows (inverted)
  const setDeg = (d: number) => {
    setMainDeg(normDeg(M.mainForMean(normDeg(Math.round(d)))));
    if (reveal) setPqKey((k) => k + 1);
    setReveal(null);
    setFeedback(null);
  };
  const aim = (e: PointerEvent) => {
    const [x, y] = svgPoint(svgRef.current!, e);
    if (Math.hypot(x - jx, y - jy) > 8) setDeg(angleOf(x - jx, y - jy));
  };
  const toggle = (k: number) => setPinned((c) => (c === k ? null : k));

  return (
    <SceneFrame id="chest-ring" title={t('title')} aria={t('aria')} scene={sc} stageRef={stage}
      narration={(id) => t(`beat_${id}`)}
      narrationReserve={[t('pq_ok'), t('pq_wrong')]}
      narrationOverride={feedback && sc.i >= TR_I ? feedback : null}
      badge={<span class="sc-chip sc-chip--muted">{tsn('scSchematic')}</span>}
      controls={
        <div class="fg-readout">
          <span>{t('lbl_vector')} <DegReserve deg={Math.round(mean)} /></span>
          <Reserve reserve={[...M.ALL_WHERE.map((w) => t('lbl_transition', { where: w })), t('lbl_none')].map((w) => <span class="fg-pill">{w}</span>)}><span class={`fg-pill fg-pill--tr-${tr.cls}`}>{trText}</span></Reserve>
          <Reserve class="fg-muted" reserve={CLS.map((k) => t(`lbl_cls_${k}`))}>{t(`lbl_cls_${tr.cls}`)}</Reserve>
        </div>
      }
      predict={
        <Predict<'early' | 'late'>
          key={pqKey}
          question={t('pq_question')}
          options={[{ id: 'early', label: t('pq_early') }, { id: 'late', label: t('pq_late') }]}
          correct="late"
          playing={sc.playing}
          onReveal={(_pick, ok) => {
            setReveal(M.revealFrom(mainDeg));
            setFeedback(t(ok ? 'pq_ok' : 'pq_wrong'));
            sc.play(M.BEAT_RANGES.transition[0], 1);
          }}
          onReset={() => (setReveal(null), setFeedback(null))}
        />
      }
      caption={t('caption')}
    >
      <Svg w={pl.w} h={pl.h} label={t('aria')} role="group" svgRef={svgRef} class="fg-draggable"
        onPointerDown={(e) => {
          const [x, y] = svgPoint(svgRef.current!, e);
          if (!M.onSection(pl, x, y)) return;
          drag.current = true;
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
          aim(e);
        }}
        onPointerMove={(e) => drag.current && aim(e)}
        onPointerUp={() => (drag.current = false)}
      >
        <ArrowDefs id={uid} kinds={['vector']} />
        <g aria-hidden>
          <ellipse cx={pl.ox} cy={pl.oy} rx={CHEST.rx * S} ry={CHEST.ry * S} class="fg-body" />
          {sec.lungs.map(([cx, cy, rx, ry]) => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} class="fg-lung" />)}
          <rect x={sec.sternum[0]} y={sec.sternum[1]} width={sec.sternum[2]} height={sec.sternum[3]} rx={3} class="fg-bone fg-bone--fill" />
          <circle cx={sec.spine[0]} cy={sec.spine[1]} r={sec.spine[2]} class="fg-bone fg-bone--fill" />
          <ellipse cx={sec.heart[0]} cy={sec.heart[1]} rx={sec.heart[2]} ry={sec.heart[3]} transform={`rotate(-30 ${jx} ${jy})`} class="fg-heart-shadow" />
          <text x={pl.ox - 40} y={pl.oy - CHEST.ry * S - 2} text-anchor="end" class={SMALL}>{t('lbl_ant')}</text>
          <text x={pl.ox - 14} y={pl.oy + CHEST.ry * S + 16} text-anchor="end" class={SMALL}>{t('lbl_post')}</text>
          <text x={pl.ox - CHEST.rx * S - 6} y={pl.oy + 24} text-anchor="end" class={SM}>{t('lbl_right')}</text>
          <text x={pl.ox + CHEST.rx * S + 6} y={pl.oy + 24} class={SM}>{t('lbl_left')}</text>
        </g>

        {/* wct: limb wires meet at the junction (symbolic) */}
        <g aria-hidden style={{ opacity: 1 - 0.55 * f.electrode }}>
          {art.wires.map((d, i) => (
            <g>
              <path d={d} pathLength={1} fill="none" style={{ stroke: 'var(--fg-muted)', strokeWidth: 1.6, strokeDasharray: `${f.wires} 2` }} />
              <text x={pl.wires[i][0]} y={pl.wires[i][1] + 14} text-anchor="middle" class={SM} style={{ opacity: Math.min(1, f.wires * 3), ...F11 }}>{['RA', 'LA', 'LL'][i]}</text>
            </g>
          ))}
        </g>
        <g aria-hidden style={{ opacity: f.wct }}>
          <circle cx={jx} cy={jy} r={7} style={{ fill: 'var(--panel)', stroke: 'var(--fg)', strokeWidth: 2 }} />
          <text x={jx - 10} y={jy + 19} text-anchor="end" class={SM} style={F11}>{t('lbl_junction')}</text>
        </g>

        {art.axes.map((a, k) => (
          <g aria-hidden class={`fg-leadaxis ${hiK === k || (pair.includes(k) && f.transition > 0.5) ? 'is-hi' : ''}`} style={{ opacity: Math.min(1, f.cells[k] * 4) * (hiK != null && hiK !== k ? 0.35 : 1) }}>
            <path d={`M${jx} ${jy}L${a.site[0]} ${a.site[1]}`} class="fg-leadaxis__pos" />
            <path d={`M${jx} ${jy}L${a.neg[0]} ${a.neg[1]}`} class="fg-leadaxis__neg" />
            <circle cx={a.site[0]} cy={a.site[1]} r={5} class="fg-el__dot fg-el--chest" />
            <text x={a.label[0]} y={a.label[1]} text-anchor="middle" class={SM} style={F11}>{CHEST_LEADS[k]}</text>
          </g>
        ))}

        {/* transition: ⟂ to the mean, where R = S */}
        <g class="fg-perp" aria-hidden style={{ opacity: where ? f.transition : 0 }}>
          <path d={`M${jx} ${jy}L${perp[0]} ${perp[1]}`} />
        </g>
        <g aria-hidden style={{ opacity: f.vector }}>
          <path d={loopD} class="fg-loop fg-loop--qrs" style={{ opacity: 0.55 }} />
          <path d={`M${jx} ${jy}L${tip[0]} ${tip[1]}`} class="fg-vector" marker-end={`url(#${uid}-vector)`} />
        </g>
        <circle cx={tip[0]} cy={tip[1]} r={13} class="fg-handle" style={{ opacity: 0.3 + 0.7 * f.vector }} tabIndex={0} role="slider" aria-label={t('ctl_drag')} aria-valuemin={-180} aria-valuemax={180} aria-valuenow={Math.round(mean)} aria-valuetext={`${fmtDeg(mean)} — ${trText}`}
          onKeyDown={(e) => {
            const v = angleKey(e, Math.round(mean));
            if (v != null) (e.preventDefault(), setDeg(v));
          }}
        />

        {/* one / walk: electrode, axis (both halves), drop */}
        <g aria-hidden style={{ opacity: f.electrode * (1 - 0.6 * f.transition) }}>
          <path d={`M${jx} ${jy}L${nx[0]} ${nx[1]}`} class="fg-leadaxis__neg" style={{ stroke: HI }} />
          <path d={`M${jx} ${jy}L${jx + (ex - jx) * f.axis} ${jy + (ey - jy) * f.axis}`} style={{ stroke: HI, strokeWidth: 2.6, strokeLinecap: 'round' }} />
          <circle cx={ex} cy={ey} r={8} style={{ fill: HI, stroke: 'var(--panel)', strokeWidth: 2 }} />
        </g>
        {drop && (
          <g class="fg-perp" aria-hidden style={{ opacity: f.penOn }}>
            <path d={`M${drop.pt[0]} ${drop.pt[1]}L${drop.foot[0]} ${drop.foot[1]}`} />
            <circle cx={drop.pt[0]} cy={drop.pt[1]} r={3.5} />
            <circle cx={drop.foot[0]} cy={drop.foot[1]} r={3.5} style={{ fill: HI }} />
          </g>
        )}

        {/* the ring of cells */}
        {CHEST_LEADS.map((l, k) => {
          const [cx, cy] = pl.cells[k];
          const g = M.cellGeom(pl, k, src.maxAmp);
          const lv = M.rsLevels(pl, src, k);
          const box = { x: cx - pl.cellW / 2, y: cy - pl.cellH / 2, width: pl.cellW, height: pl.cellH, rx: 6 };
          const on = pair.includes(k);
          return (
            <g class={`fg-cell ${hiK === k ? 'is-on' : ''}`} tabIndex={0} role="button" aria-pressed={pinned === k} aria-label={t('ctl_cell', { v: l })} onPointerEnter={() => setHover(k)} onPointerLeave={() => setHover(null)} onClick={() => toggle(k)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle(k))}
            >
              <rect {...box} class="fg-cell__bg" />
              <rect {...box} style={{ fill: M.GROUP_TOKEN[M.CELL_GROUP[k]], fillOpacity: 0.16 * f.groups, stroke: 'none' }} />
              {on && <rect {...box} style={{ fill: 'none', stroke: HI, strokeWidth: 2.2, opacity: f.transition }} />}
              <path d={`M${g.x0} ${g.base}H${g.x1}`} class="fg-baseline" />
              <path d={paths[k]} pathLength={1} class="fg-trace fg-trace--qrs" style={{ strokeDasharray: `${f.cells[k]} 2`, opacity: f.cells[k] > 0 ? 1 : 0 }} />
              <text x={box.x + 6} y={box.y + 15} class="fg-svg-text fg-svg-text--lead">{l}</text>
              {on && <path d={`M${lv.x - M.TICK} ${lv.r}h5M${lv.x} ${lv.r}V${lv.s}M${lv.x - M.TICK} ${lv.s}h5M${lv.x - M.TICK} ${lv.base}h5`} style={{ stroke: HI, strokeWidth: 1.6, fill: 'none', opacity: f.transition }} />}
            </g>
          );
        })}
        <circle cx={pen[0]} cy={pen[1]} r={4} class="sc-pen sc-pen--glow" style={{ opacity: f.penOn }} aria-hidden />

        {/* transition: R = S marker */}
        <g aria-hidden style={{ opacity: where ? f.transition : 0 }}>
          <rect x={mk[0] - M.PILL.w / 2} y={mk[1] - M.PILL.h / 2} width={M.PILL.w} height={M.PILL.h} rx={8} class="fg-transition" />
          <text x={mk[0]} y={mk[1] + 4} text-anchor="middle" class="fg-svg-text fg-svg-text--hi" style={F11}>{t('lbl_equal')}</text>
        </g>

        {/* groups + frontal inset */}
        <g aria-hidden>
          {(['septal', 'anterior', 'lateral'] as const).map((n, i) => (
            <text x={pl.groupAt[i][0]} y={pl.groupAt[i][1]} text-anchor={pl.groupAnchor} class={SM} style={{ fill: M.GROUP_TOKEN[n], opacity: f.groups }}>{t(`lbl_${n}`)}</text>
          ))}
          <circle cx={pl.inset[0]} cy={pl.inset[1]} r={pl.insetR} class="fg-ring fg-ring--faint" />
          <text x={pl.inset[0]} y={pl.inset[1] - pl.insetR - 22} text-anchor="middle" class={SMALL}>{t('lbl_frontal')}</text>
          {art.inset.map((a) => {
            const d = `M${pl.inset[0]} ${pl.inset[1]}L${a.end[0]} ${a.end[1]}`;
            return (
              <g>
                <path d={d} style={{ stroke: 'var(--fg-muted)', strokeWidth: 1.2 }} />
                {a.group !== 'none' && <path d={d} style={{ stroke: M.GROUP_TOKEN[a.group], strokeWidth: 1.2 + 1.8 * f.groups, opacity: f.groups }} />}
                <text x={a.label[0]} y={a.label[1]} text-anchor="middle" class={SM} style={F11}>{a.lead}</text>
              </g>
            );
          })}
          {(['inferior', 'highLateral'] as const).map((n, i) => (
            <text x={pl.legendAt[0]} y={pl.legendAt[1] + 15 * i} text-anchor={pl.legendAnchor} class={SM} style={{ fill: M.GROUP_TOKEN[n], opacity: f.groups, ...F11 }}>{t(`lbl_${n}`)}</text>
          ))}
        </g>

        {/* text panel */}
        <g aria-hidden>
          <text x={px} y={row(0)} class={SM} style={{ opacity: f.wct }}>{t('lbl_wct')}</text>
          <g style={{ opacity: f.wct }}>
            <SvgLabel x={px} y={row(1)} text={t('lbl_wct_ref')} max={pl.panelChars} />
          </g>
          <text x={px} y={row(2)} class={SM} style={{ opacity: f.electrode, fill: HI }}>{t('lbl_formula', { v: CHEST_LEADS[Math.round(f.s)] })}</text>
          <g style={{ opacity: f.gain }}>
            <rect x={px} y={row(3) - 9} width={40 * mv.gain} height={9} rx={2} style={{ fill: HI }} />
            <text x={px + 46} y={row(3)} class="fg-svg-text tabular" style={F11}>{`${t('lbl_gain', { g: fmt(mv.gain, 2) })}  ${t('lbl_closer')}`}</text>
          </g>
          <text x={px} y={row(4)} class="fg-svg-text fg-svg-text--hi" style={{ opacity: f.transition }}>{trText}</text>
          <text x={px} y={row(5)} class={SMALL} style={{ opacity: f.transition }}>{t(`lbl_cls_${tr.cls}`)}</text>
        </g>
      </Svg>
    </SceneFrame>
  );
}
