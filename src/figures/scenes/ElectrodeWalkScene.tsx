/** Placing V1–V6 (lesson f5; spec §4.7). Render only; the maths (tour vs learner's map, picks) in electrode-walk.math.ts. */
import type { Signal } from '@preact/signals';
import type { JSX } from 'preact';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Ecg } from '../../core/ecg';
import type { FigureParams } from '../api';
import { compileBeats, easeInOut, SceneFrame, useScene } from '../scene/index';
import { Check, fmt, PaperGrid, Svg, SvgLabel, Toggle, svgPoint, useUid } from '../shared';
import { sayMap, tElectrodeWalk as t } from './electrode-walk.i18n';
import * as M from './electrode-walk.math';

type Props = { readonly params?: FigureParams['electrode-walk']; readonly cursor?: Signal<number | null>; readonly ecg?: Ecg };
type Swap = 'none' | 'v2v3' | 'v1v3';
type Drag = { readonly site: number; readonly x: number; readonly y: number; readonly x0: number; readonly y0: number; readonly moved: boolean };
const SWAPS: readonly Swap[] = ['none', 'v2v3', 'v1v3'];
const ID = M.CHEST_IDS;
const same = (a: M.CableMap, b: M.CableMap) => a.every((s, c) => s === b[c]);
const SR: JSX.CSSProperties = { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' };
type TxOpt = { a?: 'start' | 'middle' | 'end'; c?: string; o?: number; fill?: string; tr?: boolean };
/** 11-unit label */
const tx = (x: number, y: number, s: string, p: TxOpt = {}) => (
  <text x={x} y={y} text-anchor={p.a ?? 'start'} class={`fg-svg-text ${p.c ? `fg-svg-text--${p.c}` : ''} tabular`} style={{ fontSize: 11, opacity: p.o ?? 1, fill: p.fill, transition: p.tr ? 'opacity 300ms' : undefined }}>
    {s}
  </text>
);
const dot = (x: number, y: number, r: number, stroke: string, extra: JSX.SVGAttributes<SVGCircleElement> = {}) => <circle cx={x} cy={y} r={r} fill="var(--panel)" stroke={stroke} stroke-width={1.7} {...extra} />;
const NS = 'non-scaling-stroke';
const art = (list: readonly M.ArtPath[]) =>
  list.map((a) => <path d={a.d} fill={a.fill ?? 'none'} stroke={a.stroke ?? 'var(--fg-muted)'} stroke-width={a.w ?? 1} stroke-dasharray={a.dash} vector-effect={NS} style={a.o == null ? undefined : { opacity: a.o }} />);

export function ElectrodeWalkScene(props: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const uid = useUid('ew');
  // layout chosen once at mount from the stage width
  const [L, setL] = useState(() => M.layoutFor(globalThis.innerWidth ?? 1024));
  useLayoutEffect(() => {
    const w = stage.current?.clientWidth;
    if (w) setL(M.layoutFor(w));
  }, []);
  const start = M.mapFromParam(props.params?.swap);
  const [map, setMap] = useState<M.CableMap>(start);
  const [prev, setPrev] = useState<M.CableMap>(start);
  const [mx, setMx] = useState(1);
  const [ghost, setGhost] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  // the live region speaks after a learner change only
  const [touched, setTouched] = useState(false);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const ecg = props.ecg;
  const src = useMemo(() => M.sourceOf(ecg), [ecg]);
  const timeline = useMemo(() => (src ? compileBeats(M.BEATS, { key: `electrode-walk@${Math.round(src.beat.qrsOn)}`, window: src.win }) : null), [src]);
  const sc = useScene({ timeline, target: stage, cursor: props.cursor });
  const strips = useMemo(() => (ecg && src ? M.buildStrips(ecg.signal, src.win, L) : null), [ecg, src, L]);

  const site = src?.site ?? [0, 0, 0, 0, 0, 0];
  const f = M.frame(sc.p, { transition: M.transitionIndex(site) });
  const mix: M.SwapMix = { prev, map, mx, tm: f.traceMix, tour: f.tourOn };
  const [c1, c2] = M.DEMO_PAIR;
  const rDemo = M.cellRatios(site, M.DEMO);
  const mark = M.transitionMark(mix, site);
  const P = (q: M.Pt) => M.toFrame(L, q);

  const change = (m: M.CableMap) => {
    setPick(null);
    if (same(m, map)) return;
    setTouched(true);
    // the learner takes over: skip the tour
    if (f.tourOn > 0) sc.seek(M.TIMELINE_BEATS[3].to);
    setPrev(map);
    setMap(m);
    cancelAnimationFrame(raf.current);
    if (sc.reduced || typeof requestAnimationFrame !== 'function') return setMx(1);
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 450);
      setMx(easeInOut(k));
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    setMx(0);
    raf.current = requestAnimationFrame(step);
  };
  const choose = (s: number) => (pick == null ? setPick(s) : pick === s ? setPick(null) : change(M.swapSites(map, pick, s)));
  const posOf = (s: number) => M.dragPos(L, f.el[s], drag?.site === s ? drag : null);
  const cap = (id: number, on: boolean) => {
    try {
      if (on) svg.current?.setPointerCapture?.(id);
      else svg.current?.releasePointerCapture?.(id);
    } catch {
      /* a nicety */
    }
  };
  // the pick is the nearest live site (not whichever hit circle is drawn on top)
  const onDown = (e: PointerEvent) => {
    if (!svg.current) return;
    const [x, y] = svgPoint(svg.current, e);
    const s = M.pickSite(L, x, y, f.el);
    if (s == null) return;
    e.preventDefault();
    cap(e.pointerId, true);
    setDrag({ site: s, x, y, x0: x, y0: y, moved: false });
  };
  const onMove = (e: PointerEvent) => {
    if (!drag || !svg.current) return;
    const [x, y] = svgPoint(svg.current, e);
    setDrag({ ...drag, x, y, moved: drag.moved || Math.hypot(x - drag.x0, y - drag.y0) > 3 });
  };
  const onUp = (e: PointerEvent) => {
    if (!drag) return;
    cap(e.pointerId, false);
    setDrag(null);
    if (e.type === 'pointercancel') return;
    if (!drag.moved) return choose(drag.site);
    const to = M.dropSite(L, ...posOf(drag.site));
    if (to != null && to !== drag.site) change(M.swapSites(map, drag.site, to));
  };
  const swapValue = SWAPS.find((v) => same(M.mapFromParam(v), map)) ?? ('' as Swap);

  const cell = (k: number) => {
    const r = L.cells[k];
    if (!strips) return <PaperGrid x={r.x} y={r.y} w={r.w} h={r.h} mm={r.w / 15} />;
    const rv = f.reveal[k];
    const layers = M.cellLayers(k, mix);
    const top = layers.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    const hi = Math.max(f.hi[k], k === c1 || k === c2 ? f.pairHi : 0);
    const g = strips.cs.gain;
    return (
      <g>
        <PaperGrid x={r.x} y={r.y} w={r.w} h={r.h} mm={strips.cs.mm} />
        <clipPath id={`${uid}-c${k}`}>
          <rect x={r.x} y={r.y} width={rv * r.w} height={r.h} />
        </clipPath>
        <g clip-path={`url(#${uid}-c${k})`}>
          {layers.map(([s, w]) => <path d={strips.paths[k][s]} class="fg-trace" style={{ opacity: w, strokeWidth: 1.4 }} />)}
        </g>
        {rv > 0 && rv < 1 && <circle cx={r.x + rv * r.w} cy={strips.pen(k, top, rv)} r={3.5} class="sc-pen sc-pen--glow" />}
        <rect x={r.x + 1} y={r.y + 1} width={r.w - 2} height={r.h - 2} rx={3} fill="none" stroke="var(--c-highlight)" stroke-width={2} style={{ opacity: hi }} />
        {tx(r.x + 5, r.y + 14, ID[k], { c: 'strong' })}
        {k === 5 && tx(r.x + r.w - 4, r.y + r.h - 5, t('lbl_gain', { g: fmt(g, g % 1 ? 1 : 0) }), { a: 'end', c: 'muted' })}
      </g>
    );
  };

  // R/(R+S) bars at (sliding) slots, red where the sequence jumps
  const stairs = (R: M.Rect, top: number, val: (k: number) => number, slot: (k: number) => number, rise: (k: number) => number, err: (k: number) => number, nums: boolean) => {
    const sw = R.w / 6, bot = R.y + R.h - 16, H = bot - top, bw = Math.min(26, sw * 0.5);
    const cx = (s: number) => R.x + sw * (s + 0.5);
    return (
      <g>
        <line x1={R.x} x2={R.x + R.w} y1={bot - H / 2} y2={bot - H / 2} stroke="var(--fg-muted)" stroke-dasharray="4 3" />
        <line x1={R.x} x2={R.x + R.w} y1={bot} y2={bot} stroke="var(--border-strong)" />
        {ID.map((l, k) => {
          const h = val(k) * H * rise(k), x = cx(slot(k)) - bw / 2;
          return (
            <g>
              <rect x={x} y={bot - h} width={bw} height={h} fill="var(--c-qrs)" />
              <rect x={x} y={bot - h} width={bw} height={h} fill="var(--err)" style={{ opacity: err(k) }} />
              {nums && tx(x + bw / 2, top - 3, fmt(val(k), 2), { a: 'middle', o: rise(k) })}
              {tx(cx(k), R.y + R.h - 3, l, { a: 'middle', c: 'strong' })}
            </g>
          );
        })}
      </g>
    );
  };
  const S = L.stair, Bf = L.before, sw = S.w / 6;
  const wide = L.w > M.NARROW_BELOW;
  const sTop = S.y + (wide ? 32 : 20), sMid = (S.y + S.h - 16 + sTop) / 2;
  const mX = S.x + sw * mark.x;

  const T = L.torso, I = L.inset;
  const v4r = P([f.v4r.x, f.v4r.y]);
  const cur = P(f.cursor), gh = P([f.ghost.x, f.ghost.y]);
  const at = M.cableAt(map);

  const electrode = (s: number) => {
    const e = f.el[s];
    const [x, y] = posOf(s);
    const wrong = M.siteWrong(s, mix) > 0.5, live = e.on > 0.5;
    return (
      <g
        role="button"
        tabIndex={live ? 0 : -1}
        aria-label={t('ctl_electrode', { e: ID[at[s]], s: ID[s] })}
        aria-pressed={pick === s}
        class="fg-focusable"
        style={{ opacity: e.on, cursor: live ? (drag?.site === s ? 'grabbing' : 'grab') : 'default', pointerEvents: live ? 'auto' : 'none', touchAction: 'none' }}
        onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && (ev.preventDefault(), choose(s))}
      >
        {/* hit area + focus ring */}
        <circle cx={x} cy={y} r={M.HIT_R} fill="transparent" stroke={pick === s ? 'var(--focus)' : 'none'} stroke-width={2} />
        {dot(x, y, 7 * Math.max(0.3, e.on), wrong ? 'var(--err)' : 'var(--fg)')}
        {M.siteNames(s, mix).map(([c, w]) => tx(x, y - 10, ID[c], { a: 'middle', c: 'strong', o: w, fill: wrong ? 'var(--err)' : undefined }))}
      </g>
    );
  };

  return (
    <SceneFrame id="electrode-walk" title={t('title')} aria={t('aria')} scene={sc} stageRef={stage} narration={(id) => t(`beat_${id}`)} caption={t('caption')}
      controls={
        <>
          <Toggle label={t('ctl_swap')} value={swapValue} onChange={(v) => change(M.mapFromParam(v))} options={SWAPS.map((v) => ({ value: v, label: v === 'none' ? t('ctl_none') : v === 'v2v3' ? 'V2 ↔ V3' : 'V1 ↔ V3' }))} />
          <button type="button" class="fg-btn" onClick={() => change(M.IDENTITY)} disabled={M.isIdentity(map)}>
            {t('ctl_reset')}
          </button>
          <Check id={`${uid}-ghost`} label={t('ctl_ghost')} checked={ghost} onChange={setGhost} />
          <span class="sc-note">{t('lbl_drag')}</span>
          <span style={SR} aria-live="polite">
            {src && touched ? sayMap(M.mapSummary(map, site)) : ''}
          </span>
        </>
      }
    >
      <Svg w={L.w} h={L.h} label={t('aria')} role="group" svgRef={svg} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
        {/* torso (zoomed on the chest, clipped to the frame), cables, the ghost path */}
        <clipPath id={`${uid}-fr`}>
          <rect width={L.w} height={L.h} />
        </clipPath>
        <g clip-path={`url(#${uid}-fr)`}>
        <g transform={`translate(${T.x} ${T.y}) scale(${T.s})`} aria-hidden="true" fill="none" stroke="var(--fg-muted)" vector-effect={NS}>
          {art(M.FRONT_ART)}
          {f.el.map((e, s) => (
            <path d={M.cablePath(e.x, e.y, M.cableEndX(s, mix, f.demoMix))} stroke-width={1.2} vector-effect={NS} style={{ opacity: 0.7 * e.on }} />
          ))}
          <path d={M.GHOST_PATH} stroke="var(--err)" stroke-width={1.5} stroke-dasharray="3 3" vector-effect={NS} style={{ opacity: Math.max(f.ghost.on, ghost ? 1 : 0), transition: 'opacity 300ms' }} />
        </g>
        </g>
        {/* landmarks, the along-the-space error, V4R, the back inset */}
        {M.landmarkLines(L, f).map((l) => (
          <line x1={l.x1} x2={l.x2} y1={l.y1} y2={l.y2} stroke={l.stroke} stroke-width={l.w} stroke-dasharray={l.dash} style={{ opacity: l.o }} />
        ))}
        {dot(gh[0], gh[1], 7, 'var(--err)', { fill: 'none', 'stroke-dasharray': '2 2', style: { opacity: f.ghost.on } })}
        <g style={{ opacity: ghost ? 1 : 0, transition: 'opacity 300ms' }}>
          {M.GHOST_SITES.map((q) => dot(P(q)[0], P(q)[1], 7, 'var(--err)', { fill: 'none', 'stroke-dasharray': '2 2' }))}
        </g>
        {dot(v4r[0], v4r[1], 7, 'var(--c-vector)', { style: { opacity: f.v4r.on } })}
        <g style={{ opacity: f.insetOn }}>
          <clipPath id={`${uid}-in`}>
            <rect x={I.x} y={I.y} width={I.w} height={I.h} />
          </clipPath>
          <rect x={I.x} y={I.y} width={I.w} height={I.h} rx={4} fill="var(--panel)" stroke="var(--border-strong)" />
          <g clip-path={`url(#${uid}-in)`}>
            <g transform={M.insetTransform(L)}>
              {art(M.BACK_ART)}
            </g>
          </g>
          {f.back.map((b) => {
            const q = M.backToFrame(L, [b.x, b.y]);
            return dot(q[0], q[1], 6, 'var(--c-vector)', { style: { opacity: b.on } });
          })}
        </g>
        {M.torsoLabels(L, f, ghost ? 1 : 0).map((b) => tx(b.x, b.y, b.key ? t(b.key) : b.text ?? '', b))}
        {/* electrodes (drag, or Enter on two, to swap cables); the hand */}
        {ID.map((_, s) => electrode(s))}
        <g style={{ opacity: f.cursorOn, pointerEvents: 'none' }} aria-hidden="true">
          <circle cx={cur[0]} cy={cur[1]} r={12} fill="none" stroke="var(--c-highlight)" stroke-width={2} />
          <circle cx={cur[0]} cy={cur[1]} r={4} class="sc-pen" />
        </g>
        <g style={{ opacity: f.chipsOn }}>
          <SvgLabel x={L.summary.x} y={L.summary.y + 12} text={t('lbl_summary')} max={24} class="fg-svg-text fg-svg-text--strong" />
        </g>
        {/* cells, staircase + transition, "before" row */}
        {ID.map((_, k) => cell(k))}
        {tx(S.x, S.y + 12, t('lbl_ratio'), { c: 'strong' })}
        {tx(S.x + S.w, S.y + 12, t('lbl_jump'), { a: 'end', c: 'strong', fill: 'var(--err)', o: M.jumpLabelOn(mix, site, f.jumpOn) })}
        {stairs(S, sTop, (k) => M.barValue(k, mix, site), (k) => M.barSlot(k, mix), (k) => f.bar[k], (k) => M.barErr(k, mix, site, f.jumpOn), wide)}
        {tx(S.x + 2, sMid - 3, t('lbl_rs'), { c: 'muted' })}
        <g style={{ opacity: f.transitionOn * mark.on }}>
          <line x1={mX} x2={mX} y1={sTop - 2} y2={S.y + S.h - 16} stroke="var(--ok)" stroke-width={2} stroke-dasharray="4 2" />
          {tx(mX + (mark.x > 0.5 ? -4 : 4), sTop + 10, t('lbl_transition'), { a: mark.x > 0.5 ? 'end' : 'start', c: 'strong', fill: 'var(--ok)' })}
        </g>
        <g style={{ opacity: f.beforeOn }}>
          <rect x={Bf.x} y={Bf.y} width={Bf.w} height={Bf.h} rx={4} fill="none" stroke="var(--border)" />
          {tx(Bf.x + 4, Bf.y + 13, t('lbl_before', { a: ID[c1], b: ID[c2] }), { c: 'muted' })}
          {stairs(Bf, Bf.y + 22, (k) => rDemo[k], (k) => k, () => 1, (k) => (M.jumps(rDemo).includes(k) ? 1 : 0), false)}
        </g>
      </Svg>
    </SceneFrame>
  );
}
