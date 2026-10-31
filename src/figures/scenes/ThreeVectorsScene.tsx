/**
 * Three vectors, two windows: V1 and V6 (f2; spec §4.3). Render only: every number comes from three-vectors.math.ts
 * (one source: the horizontal QRS loop projected on V1–V6); the strips are revealed by a clip rect at the pen.
 */
import type { Signal } from '@preact/signals';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Ecg } from '../../core/ecg';
import type { ChestLead } from '../math/projection';
import { angleOf, unit } from '../math/geom';
import type { FigureParams } from '../api';
import { SceneFrame, tsn, useScene } from '../scene/index';
import { Check, DegReserve, Svg, fmtDeg, svgPoint, useUid } from '../shared';
import { tThreeVectors as t } from './three-vectors.i18n';
import * as M from './three-vectors.math';

type Props = { readonly params?: FigureParams['three-vectors']; readonly cursor?: Signal<number | null>; readonly ecg?: Ecg };

const TOK: Readonly<Record<M.Group, string>> = { septal: 'var(--c-conduction)', walls: 'var(--c-vector)', basal: 'var(--c-repol)', late: 'var(--c-injury)' };
const NUM: Readonly<Record<M.Group, string>> = { septal: '1', walls: '2', basal: '3', late: '4' };
const LBL = { septal: 'lbl_septal', walls: 'lbl_walls', basal: 'lbl_basal', late: 'lbl_late' } as const;
const TXT = 'fg-svg-text';
const len = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const SR = { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' } as const;

export function ThreeVectorsScene(props: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<M.Drag | null>(null);
  const uid = useUid('tv');
  const [main, setMain] = useState(() => M.clampMain(props.params?.mainDeg ?? M.MAIN_DEFAULT));
  const [late, setLate] = useState(props.params?.lateVector ?? false);
  const [pl, setPl] = useState(() => M.placementFor(typeof window === 'undefined' ? 760 : window.innerWidth - 80));
  const sc = useScene({ beats: M.BEATS, target: stage });
  const playing = useRef(false);
  playing.current = sc.playing;

  // the placement follows the stage width, never during playback (a resize while playing applies when it stops)
  const relayout = () => {
    const el = stage.current;
    if (!playing.current && el && el.clientWidth > 0) setPl(M.placementFor(el.clientWidth));
  };
  useEffect(() => {
    if (!stage.current || typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(relayout);
    ro.observe(stage.current);
    return () => ro.disconnect();
  }, []);
  useEffect(relayout, [sc.playing]);

  const src = useMemo(() => M.computeSource(main, late), [main, late]);
  const paths = useMemo(
    () => ({
      V1: M.stripPath(src, 'V1', pl.v1, pl.amp),
      V6: M.stripPath(src, 'V6', pl.v6, pl.amp),
      cells: M.ROW_LEADS.map((l, k) => M.cellPath(src, l, M.cellRect(pl, k), pl.cellAmp)),
      loop: M.loopPath(pl, src),
    }),
    [src, pl],
  );
  const f = M.frame(sc.p, sc.beats);
  const u = f.u;
  const [hx, hy] = M.heartScreen(pl);
  const [rx, ry] = M.chestRadii(pl);
  const tip = M.tipScreen(pl, M.vectorAt(src, u));
  const vecOn = len(tip, [hx, hy]) > 1.5;
  const penX = M.stripX(pl.v1, u);
  const walls = src.stamps.find((s) => s.g === 'walls')!;
  const handle = M.tipScreen(pl, walls.v);
  const set = (d: number) => setMain(M.clampMain(d));

  // drags start only on the hit disc around the heart; a tap away from the handle changes nothing
  const at = (e: PointerEvent): [number, number] => (svgRef.current ? svgPoint(svgRef.current, e) : [hx, hy]);
  const aim = ([x, y]: [number, number]) => len([x, y], [hx, hy]) > 8 && set(angleOf(x - hx, y - hy) + M.handleOffset(src));
  const end = () => void (drag.current = null);

  const arrow = (a: readonly number[], b: readonly number[], color: string, w: number, op = 1) => (
    <path d={`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`} style={{ stroke: color, strokeWidth: w, opacity: op * Math.min(1, Math.max(0, (len(a, b) - 3) / 10)), fill: 'none', strokeLinecap: 'round' }} marker-end={`url(#${uid}${color.slice(5, -1)})`} />
  );

  const neg = M.NEG_AXIS_U * pl.vlen;
  const axis = (l: ChestLead, grow: number, op: number) => {
    const site = M.siteScreen(pl, l);
    const [ux, uy] = unit(M.leadDeg(l));
    return (
      <g class="fg-leadaxis is-hi" style={{ opacity: op }} aria-hidden="true">
        <path d={`M${hx} ${hy}L${hx + (site[0] - hx) * grow} ${hy + (site[1] - hy) * grow}`} class="fg-leadaxis__pos" />
        {(l === 'V1' || l === 'V6') && <path d={`M${hx} ${hy}L${hx - ux * neg * grow} ${hy - uy * neg * grow}`} class="fg-leadaxis__neg" />}
        <g style={{ opacity: l === 'V1' || l === 'V6' ? f.axisLbl : 1 }}>
          <circle cx={site[0]} cy={site[1]} r={12} class="fg-el__dot fg-el--chest" />
          <text x={site[0]} y={site[1]} text-anchor="middle" dominant-baseline="central" class="fg-el__label" style={{ fontSize: '11px' }}>
            {l}
          </text>
        </g>
      </g>
    );
  };

  const drop = (l: ChestLead) => {
    const d = M.dropAt(src, l, u);
    const foot = M.axisPoint(pl, l, d);
    return (
      <g aria-hidden="true">
        <path d={`M${hx} ${hy}L${foot[0]} ${foot[1]}`} class={`fg-proj fg-proj--${d >= 0 ? 'positive' : 'negative'}`} />
        <g class="fg-perp">
          <path d={`M${tip[0]} ${tip[1]}L${foot[0]} ${foot[1]}`} />
          <circle cx={foot[0]} cy={foot[1]} r={3} />
        </g>
      </g>
    );
  };

  const strip = (l: 'V1' | 'V6') => {
    const r = l === 'V1' ? pl.v1 : pl.v6;
    const y0 = M.stripBase(r);
    const morph = M.morphology(src.waves[l]);
    return (
      <g aria-hidden="true">
        <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={4} class="fg-paper" style={{ stroke: 'var(--border)' }} />
        <path d={`M${r.x + 4} ${y0}H${r.x + r.w - 4}`} class="fg-baseline" />
        <path d={paths[l]} class="fg-trace fg-trace--qrs" clip-path={`url(#${uid}-clip)`} />
        <circle cx={penX} cy={y0 - M.traceAt(src, l, u) * pl.amp} r={4.5} class={`sc-pen ${f.drawing ? 'sc-pen--glow' : ''}`} />
        <text x={r.x + 8} y={r.y + 16} class={`${TXT} ${TXT}--lead`}>
          {l}
        </text>
        {src.waves[l].map((w) => (
          <text x={M.stripX(r, M.uOf(w.i))} y={y0 - w.v * pl.amp + (w.v > 0 ? -7 : 16)} text-anchor="middle" class={`${TXT} ${TXT}--strong`} style={{ fill: 'var(--c-qrs)', opacity: M.after(u, M.uOf(w.i)) }}>
            {w.name}
          </text>
        ))}
        <text x={r.x + r.w - 8} y={r.y + 16} text-anchor="end" class={`${TXT} ${TXT}--strong`} style={{ opacity: f.rowLbl }}>
          {morph}
        </text>
      </g>
    );
  };

  const mark = M.transitionMark(pl, src.transition);
  const trL = mark && M.transitionLabel(pl, mark, t('lbl_transition'));
  const ends = M.lateEnds(src);
  const narration = (id: M.BeatId) => (late && id === 'bases' ? t('beat_bases_late', ends) : late && id === 'row' ? t('beat_row_late') : t(`beat_${id}`));

  return (
    <SceneFrame
      id="three-vectors"
      title={t('title')}
      aria={t('aria')}
      scene={sc}
      stageRef={stage}
      narration={narration}
      narrationReserve={[t('beat_bases'), t('beat_row'), t('beat_bases_late', { r: 'R′', s: 'S' }), t('beat_row_late')]}
      slow={M.SLOW}
      caption={t('caption')}
      controls={
        <>
          <Check id={`${uid}-late`} label={t('ctl_late')} checked={late} onChange={setLate} />
          <span class="fg-readout">
            {t('ctl_main')} <DegReserve deg={main} big={false} />
          </span>
        </>
      }
    >
      <Svg w={pl.w} h={pl.h} label={t('title')} role="group" svgRef={svgRef}>
        <defs>
          {[...Object.values(TOK), 'var(--fg)'].map((c) => (
            <marker id={`${uid}${c.slice(5, -1)}`} viewBox="0 0 10 10" refX="8.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto">
              <path d="M0 0L10 5L0 10z" style={{ fill: c }} />
            </marker>
          ))}
          <clipPath id={`${uid}-clip`}>
            <rect x={0} y={0} width={Math.max(0, penX)} height={pl.h} />
          </clipPath>
        </defs>

        {/* the transverse section, seen from the feet */}
        <g aria-hidden="true">
          <ellipse cx={pl.ox} cy={pl.oy} rx={rx} ry={ry} class="fg-body" />
          <ellipse cx={pl.ox - 62 * pl.s} cy={pl.oy + 8 * pl.s} rx={50 * pl.s} ry={68 * pl.s} class="fg-lung" />
          <ellipse cx={pl.ox + 76 * pl.s} cy={pl.oy + 14 * pl.s} rx={44 * pl.s} ry={62 * pl.s} class="fg-lung" />
          <rect x={pl.ox - 9 * pl.s} y={pl.oy - ry + 2} width={18 * pl.s} height={14 * pl.s} rx={3} class="fg-bone fg-bone--fill" />
          <circle cx={pl.ox} cy={pl.oy + 80 * pl.s} r={13 * pl.s} class="fg-bone fg-bone--fill" />
          <ellipse cx={hx + 4} cy={hy + 6} rx={46 * pl.s} ry={32 * pl.s} transform={`rotate(-30 ${hx} ${hy})`} class="fg-heart-shadow" />
          <text x={pl.ox} y={pl.oy - ry - 26} text-anchor="middle" class={`${TXT} ${TXT}--muted`}>
            {t('lbl_ant')}
          </text>
          <text x={pl.ox} y={pl.oy + ry + 18} text-anchor="middle" class={`${TXT} ${TXT}--muted`}>
            {t('lbl_post')}
          </text>
          <text x={pl.ox - rx - 4} y={pl.oy + 26} text-anchor="end" class={`${TXT} ${TXT}--strong`}>
            {t('lbl_right')}
          </text>
          <text x={pl.ox + rx + 4} y={pl.oy + 26} class={`${TXT} ${TXT}--strong`}>
            {t('lbl_left')}
          </text>
          <text x={8} y={14} class={`${TXT} ${TXT}--small`}>
            {t('lbl_feet')} · {tsn('scSchematic')}
          </text>
        </g>

        {/* lead axes: V2–V5 join in the last beat */}
        {M.ROW_LEADS.map((l, k) => axis(l, 1, 0.55 * f.cells[k]))}
        {axis('V1', f.axes, 1)}
        {axis('V6', f.axes, 1)}

        {/* the loop trail, then the numbered arrows stamped as the pens pass each vector's peak */}
        <path d={`${paths.loop}Z`} style={{ fill: 'var(--c-vector)', fillOpacity: 0.1 * f.loopHi, stroke: 'none' }} aria-hidden="true" />
        <path d={paths.loop} pathLength={1} style={{ fill: 'none', stroke: 'var(--fg-muted)', strokeWidth: 1.4 + f.loopHi, strokeDasharray: `${M.arcAt(src, u)} 2` }} aria-hidden="true" />
        {src.stamps.map((s) => {
          const op = M.after(u, M.uOf(s.i)) * f.emph[s.g];
          const end = M.tipScreen(pl, s.v);
          const [dx, dy] = unit(angleOf(s.v[0], s.v[1]));
          return (
            <g aria-hidden="true" style={{ opacity: op }}>
              {arrow([hx, hy], end, TOK[s.g], 3)}
              <text x={end[0] + dx * 13} y={end[1] + dy * 13 + 4} text-anchor="middle" class={`${TXT} ${TXT}--strong`} style={{ fill: TOK[s.g] }}>
                {NUM[s.g]}
              </text>
            </g>
          );
        })}

        {/* the moving heart vector, its groups tip-to-tail, and the two drops (pen height = gain × drop) */}
        {vecOn && (
          <g aria-hidden="true">
            {drop('V1')}
            {drop('V6')}
            {M.chainAt(src, u).map((c) => {
              const a = M.tipScreen(pl, c.from), b = M.tipScreen(pl, c.to);
              return len(a, b) > 3 && arrow(a, b, TOK[c.g], 2.2, 0.9);
            })}
            {arrow([hx, hy], tip, 'var(--fg)', 1.4, 0.8)}
          </g>
        )}
        <circle cx={hx} cy={hy} r={3.5} class="fg-vector-origin" />
        <g
          class="fg-draggable"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => {
            const p = at(e);
            drag.current = M.dragStart(p, handle);
            e.currentTarget.setPointerCapture?.(e.pointerId);
            if (drag.current.live) aim(p);
          }}
          onPointerMove={(e) => {
            const d = drag.current, p = at(e);
            if (d && (d.live = M.dragLive(d, p))) aim(p);
          }}
          onPointerUp={end}
          onPointerCancel={end}
          onLostPointerCapture={end}
        >
          <circle cx={hx} cy={hy} r={M.hitRadius(pl)} style={{ fill: 'none', pointerEvents: 'all' }} aria-hidden="true" />
          <circle
            cx={handle[0]}
            cy={handle[1]}
            r={13}
            class="fg-handle"
            style={{ fillOpacity: 0.12, strokeDasharray: '3 3', opacity: 0.35 + 0.65 * M.after(u, M.uOf(walls.i)) }}
            tabindex={0}
            role="slider"
            aria-label={t('ctl_main')}
            aria-valuemin={M.MAIN_MIN}
            aria-valuemax={M.MAIN_MAX}
            aria-valuenow={main}
            aria-valuetext={fmtDeg(main)}
            onKeyDown={(e) => {
              const v = M.mainKey(e, main);
              if (v == null) return;
              e.preventDefault();
              set(v);
            }}
          />
        </g>

        {/* legend of the numbered vectors and the closing sentence */}
        <text x={10} y={pl.legY} class={TXT} style={{ fontSize: '11px' }} aria-hidden="true">
          {src.stamps.map((s, k) => (
            <tspan style={{ fill: TOK[s.g], opacity: M.after(u, M.uOf(s.i)) }} font-weight="700">
              {`${k ? ' · ' : ''}${NUM[s.g]} ${t(LBL[s.g])}`}
            </tspan>
          ))}
        </text>
        <text x={pl.ox} y={pl.sameY} text-anchor="middle" class={`${TXT} ${TXT}--hi`} style={{ opacity: f.same }}>
          {t('lbl_same')}
        </text>

        {strip('V1')}
        {strip('V6')}

        {/* V2–V5 slide in between the two windows: the same loop from four more places */}
        {M.ROW_LEADS.map((l, k) => {
          const r = M.cellRect(pl, k);
          const a = f.cells[k];
          return (
            <g transform={`translate(${(1 - a) * 40} 0)`} style={{ opacity: a }} aria-hidden="true">
              <rect x={r.x + 2} y={r.y} width={r.w - 4} height={r.h} rx={4} class="fg-paper" style={{ stroke: 'var(--border)' }} />
              <path d={paths.cells[k]} class="fg-trace fg-trace--qrs" />
              <text x={r.x + 8} y={M.cellLabelY(r)} class={`${TXT} ${TXT}--lead`}>
                {l}
              </text>
              <text x={r.x + r.w / 2} y={M.cellLabelY(r)} text-anchor="middle" class={`${TXT} ${TXT}--strong`} style={{ opacity: f.rowLbl }}>
                {M.morphology(src.waves[l])}
              </text>
            </g>
          );
        })}
        {mark && trL && (
          <g style={{ opacity: f.rowLbl }} aria-hidden="true">
            <rect x={mark.x - M.TR_HALF} y={pl.row.y + 20} width={2 * M.TR_HALF} height={pl.row.h - 40} rx={6} class="fg-transition" />
            <text x={trL.x} y={trL.y} text-anchor={trL.anchor} class={`${TXT} ${TXT}--hi`} style={{ fontSize: '11px' }}>
              {trL.text}
            </text>
          </g>
        )}
      </Svg>
      <div style={SR}>{t('sr_result', { leads: M.leadsText(src), tr: M.transitionText(src.transition) })}</div>
    </SceneFrame>
  );
}
