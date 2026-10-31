/**
 * From three electrodes to six axes (lesson f3; spec docs/design/f-explainers.md §4.4; contract src/figures/scene/README.md).
 * Render only: numbers from triangle-to-wheel.math.ts; every lead re-assembled from the block ECG's three potentials.
 * The scene bridges the cursor itself (the instant is not linear in p): our instant is written at commit; a click on the
 * 12-lead stops playback and pins its instant until a transport action or a new play releases it.
 */
import type { Signal } from '@preact/signals';
import { effect } from '@preact/signals';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Ecg } from '../../core/ecg';
import { LIMB_ANGLE_DEG, LIMB_LEADS } from '../../core/leads';
import type { FigureParams } from '../api';
import { unit } from '../math/geom';
import { compileBeats, SceneFrame, tsn, useScene } from '../scene/index';
import { ArrowDefs, Check, fmt, fmtDeg, Reserve, Svg, SvgLabel, useUid } from '../shared';
import { sectorPath } from '../wheel';
import { tTriangleToWheel as t } from './triangle-to-wheel.i18n';
import * as M from './triangle-to-wheel.math';

type Props = { readonly params?: FigureParams['triangle-to-wheel']; readonly cursor?: Signal<number | null>; readonly ecg?: Ecg };
type P2 = M.Vec2;
const AUG = M.AUGMENTED as readonly string[];
// territory tints: tokens that carry no axis meaning in this scene
const GROUP_FILL = { inferior: 'var(--c-highlight)', lateral: 'var(--ok)' } as const;
const GROUPS = ['inferior', 'lateral'] as const;
const line = (a: P2, b: P2) => `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
const txt = (fs: number, fill = 'var(--fg)', w = 700) => ({ fontSize: `${fs}px`, fill, fontWeight: w });
const stk = (c: string, w: number, opacity?: number) => ({ fill: 'none', stroke: `var(--${c})`, strokeWidth: w, opacity });
const r2 = (x: number) => Math.round(x * 100) / 100 || 0;

export function TriangleToWheelScene(props: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const uid = useUid('ttw');
  const [cab, setCab] = useState(!!props.params?.cabrera);
  const [groups, setGroups] = useState(false);
  const [pin, setPin] = useState<number | null>(null);
  const [pl, setPl] = useState(() => M.placementFor(typeof window === 'undefined' ? 760 : window.innerWidth - 80));

  const ecg = props.ecg;
  const src = useMemo(() => {
    const b = ecg?.truth?.beats ?? [];
    const k = M.chooseBeat(b);
    return ecg && k >= 0 ? M.sourceOf(ecg.signal, b[k]) : null;
  }, [ecg]);
  const timeline = useMemo(() => (src ? compileBeats(M.BEATS, { key: `ttw@${src.win[0]}` }) : null), [src]);
  const sc = useScene({ timeline, target: stage });
  const f = M.frame(sc.p, sc.beats, { uStar: src?.uStar ?? 0 });

  // placement: measured on the stage at mount (before autoplay starts) and on resize, never during playback
  const playing = useRef(false);
  playing.current = sc.playing;
  useLayoutEffect(() => {
    const fit = () => {
      const w = stage.current?.clientWidth;
      if (w && !playing.current) setPl(M.placementFor(w));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // ── the shared cursor ──
  const cursor = props.cursor;
  const tNow = src ? (pin ?? M.timeOfU(src, f.u)) : null;
  const tMs = tNow == null ? null : Math.round(tNow);
  const last = useRef<number | null>(null);
  const stop = sc.stop;
  useLayoutEffect(() => {
    if (sc.playing) setPin(null);
  }, [sc.playing]);
  useLayoutEffect(() => {
    if (!cursor || tMs == null) return;
    last.current = tMs;
    if (cursor.peek() !== tMs) cursor.value = tMs;
  }, [cursor, tMs]);
  useEffect(() => {
    if (!cursor || !src) return;
    return effect(() => {
      const v = cursor.value;
      if (v == null || v === last.current) return;
      stop();
      setPin(v);
    });
  }, [cursor, src, stop]);
  // every transport action releases the pin (also when p does not change: replay under reduced motion)
  const free = <A extends unknown[]>(fn: (...a: A) => void) => (...a: A) => (setPin(null), fn(...a));
  const scT: typeof sc = { ...sc, play: free(sc.play), replay: free(sc.replay), seek: free(sc.seek), seekBeat: free(sc.seekBeat), playBeat: free(sc.playBeat), prev: free(sc.prev), next: free(sc.next), prevBeat: free(sc.prev), nextBeat: free(sc.next) };

  // ── paths: once per source and placement ──
  const rw = pl.rows.w, rh = pl.rowH, b0 = Math.round(rh * 0.6);
  const sy = src ? Math.min(32, (rh * 0.55) / src.leadMax) : 1;
  const paths = useMemo(() => {
    if (!src) return null;
    const lead = {} as Record<M.LimbLead, string>;
    for (const l of LIMB_LEADS) lead[l] = M.tracePath(src.leads[l], src.base[l], rw, sy);
    const cw = pl.meters.w / 4;
    const ms = (pl.meters.h * 0.32) / src.phiMax;
    const phi = M.ELECTRODES.map((e) => M.tracePath(src.phi[e], src.phiBase[e], cw - 30, ms));
    return { lead, minusAVR: M.tracePath(src.leads.aVR, src.base.aVR, rw, -sy), sum: M.tracePath(M.sumSeries(src.leads.I, src.leads.III), src.base.I + src.base.III, rw, sy), phi, ms, cw, torso: M.torsoPath(pl) };
  }, [src, pl]);
  const slowK = src ? M.slowFactors(src.win[1] - src.win[0]) : [1, 1];

  const inst = src && tNow != null ? M.instantAt(src, tNow) : null;
  const uNow = src && tNow != null ? M.uOfTime(src, tNow) : 0;
  const inWin = src != null && tNow != null && tNow >= src.win[0] && tNow <= src.win[1];
  const C: P2 = [pl.cx, pl.cy];
  const Rw = M.wheelR(pl);
  const fs = pl.font;
  const anim = sc.reduced ? 'none' : 'transform 450ms ease-in-out, opacity 300ms ease-in-out';
  const hiMax = Math.max(f.hi0, f.hi1, f.hi2);

  const axis = (l: M.LimbLead) => {
    const a = M.axisDraw(pl, l, f);
    if (a.grow <= 0) return null;
    const hi = M.pairHi(f, M.pairOf(l));
    return (
      <g key={`a${l}`} style={{ opacity: 1 - 0.6 * hiMax * (hi > 0 ? 0 : 1) }}>
        <path d={line(a.tail, a.head)} pathLength={100} stroke-dasharray={M.halfDash(a.slide)} marker-end={`url(#${uid}-${a.aug ? 'lead2' : 'lead'})`} style={stk(a.aug ? 'c-repol' : 'c-conduction', 2.2 + 1.6 * hi)} />
        {!a.aug && (
          <text x={a.sideAt[0]} y={a.sideAt[1] + 4} text-anchor={a.sideAnchor} class="fg-svg-text" style={{ ...txt(fs, 'var(--c-conduction)'), opacity: f.fSides }}>
            {t(`lbl_${l}` as 'lbl_I')}
          </text>
        )}
        <text x={a.nameAt[0]} y={a.nameAt[1] + 4} text-anchor="middle" class="fg-svg-text fg-svg-text--lead" style={{ opacity: a.nameOp, fontSize: `${fs + 1}px` }}>
          {l}
        </text>
        <text x={a.degAt[0]} y={a.degAt[1] + 4} text-anchor="middle" class="fg-svg-text fg-svg-text--deg tabular" style={{ opacity: M.degOf(f, l), fontSize: `${fs - 1}px` }}>
          {fmtDeg(LIMB_ANGLE_DEG[l])}
        </text>
      </g>
    );
  };

  // three electrode meters and the gauge Σφ = φRA + φLA + φLL (computed from the three; 0 by construction)
  const meter = (k: number) => {
    if (!paths || !src) return null;
    const e = M.ELECTRODES[k];
    const x = pl.meters.x + k * paths.cw, y = pl.meters.y, h = pl.meters.h, mid = y + h * 0.58, w = paths.cw - 30;
    const v = e ? (inst?.phi[e] ?? 0) : inst ? r2(inst.phi.RA + inst.phi.LA + inst.phi.LL) : 0;
    const bar = -v * paths.ms;
    return (
      <g key={`m${k}`} style={{ opacity: e ? 1 : 0.4 + 0.6 * f.wct }}>
        <rect x={x + 1} y={y} width={paths.cw - 2} height={h} rx="4" class="fg-cell__bg" />
        <text x={x + 6} y={y + 13} class="fg-svg-text" style={txt(fs - 1)}>
          {e ?? t('lbl_wctShort')}
        </text>
        <text x={x + paths.cw - 6} y={y + 13} text-anchor="end" class="fg-svg-text tabular" style={txt(fs - 1, 'var(--fg-muted)', 600)}>
          {fmt(v, 2)}
        </text>
        <line x1={x + 6} x2={x + paths.cw - 6} y1={mid} y2={mid} class="fg-zero" />
        <rect x={x + 8} y={Math.min(mid, mid + bar)} width="8" height={Math.max(0.5, Math.abs(bar))} style={{ fill: 'var(--c-vector)' }} />
        {e && (
          <g transform={`translate(${x + 22} ${mid})`}>
            <clipPath id={`${uid}-m${k}`}>
              <rect x="-1" y={-h} width={w * f.meterRev + 1} height={2 * h} />
            </clipPath>
            <path d={paths.phi[k]} class="fg-trace" clip-path={`url(#${uid}-m${k})`} style={{ strokeWidth: 1.3 }} />
            {inWin && <line x1={w * uNow} x2={w * uNow} y1={-h * 0.3} y2={h * 0.4} class="fg-cursor" />}
          </g>
        )}
      </g>
    );
  };

  const row = (l: M.LimbLead) => {
    if (!paths || !src) return null;
    const slot = M.slotOf(l, cab);
    const rd = M.rowDraw(f, l);
    const g = M.groupOf(l);
    const k = M.pairOf(l);
    const dy = M.rowY(pl, M.slotOf('I', cab)) - M.rowY(pl, slot);
    const inv = l === 'aVR' && cab;
    // the pen sits on the trace being drawn: its height is the lead at the pen's own instant
    const penY = rd.pen == null ? 0 : b0 - (M.at(src.leads[l], rd.pen) - src.base[l]) * (inv ? -1 : 1) * sy;
    return (
      <g key={`r${l}`} style={{ transform: `translate(${pl.rows.x}px, ${M.rowY(pl, slot)}px)`, transition: anim }}>
        <rect width={rw} height={rh} class="fg-paper" />
        {g && <rect width={rw} height={rh} style={{ fill: GROUP_FILL[g], opacity: groups ? 0.12 : 0, transition: anim }} />}
        <line x1="0" x2={rw} y1={b0} y2={b0} class="fg-baseline" />
        <rect x="0.5" y="0.5" width={rw - 1} height={rh - 1} rx="3" style={stk('c-highlight', 2.2, M.pairHi(f, k))} />
        <clipPath id={`${uid}-r${l}`}>
          <rect x="-2" y="0" width={rw * rd.clip + 2} height={rh} />
        </clipPath>
        <g clip-path={`url(#${uid}-r${l})`}>
          <g transform={`translate(0 ${b0})`} style={{ opacity: rd.op }}>
            <path d={paths.lead[l]} class="fg-trace" style={{ opacity: inv ? 0 : 1, transition: anim }} />
            {l === 'aVR' && <path d={paths.minusAVR} class="fg-trace" style={{ opacity: inv ? 1 : 0, transition: anim }} />}
          </g>
        </g>
        {l === 'III' && f.lift > 0 && f.merge < 1 && <path d={paths.lead.III} transform={`translate(0 ${b0 + dy * f.lift})`} style={stk('c-repol', 1.8, Math.min(1, 5 * f.lift) * (1 - f.merge))} />}
        {l === 'II' && f.merge > 0 && <path d={paths.sum} transform={`translate(0 ${b0 + dy * (1 - f.drop)})`} stroke-dasharray="5 3" style={stk('c-highlight', 2.6, f.merge)} />}
        {inWin && M.rowReveal(f, l) > 0 && <line x1={rw * uNow} x2={rw * uNow} y1="0" y2={rh} class="fg-cursor" style={{ opacity: 0.55 }} />}
        {rd.pen != null && <circle cx={rw * rd.pen} cy={penY} r="3.5" class="sc-pen sc-pen--glow" />}
        <text x="6" y="14" class="fg-svg-text fg-svg-text--lead" style={{ fontSize: `${fs}px`, opacity: AUG.includes(l) ? 0.35 + 0.65 * f.augRows : 1 }}>
          {inv ? '−aVR' : l}
        </text>
        {g && (
          <text x="44" y="14" class="fg-svg-text" style={{ ...txt(fs - 1, GROUP_FILL[g]), opacity: groups ? 1 : 0, transition: anim }}>
            {t(`lbl_${g}`)}
          </text>
        )}
        <text x={rw - 6} y="14" text-anchor="end" class="fg-svg-text" style={{ ...txt(fs - 1, 'var(--c-highlight)'), opacity: M.pairMark(f, k) }}>
          {t('lbl_perp', { x: M.partnerOf(l) })}
        </text>
      </g>
    );
  };

  const v = inst?.v ?? [0, 0];
  const vs = src ? (0.92 * Rw) / src.vMax : 0;
  const tip: P2 = [C[0] + v[0] * vs, C[1] + v[1] * vs];
  // the mean QRS axis is the engine's truth for this ECG (the axis the lesson grades), drawn as an arrow
  const meanDeg = src ? M.meanAxisDeg(src, ecg?.truth) : 0;
  const mean = unit(meanDeg);
  const mTip: P2 = [C[0] + mean[0] * Rw * 0.72, C[1] + mean[1] * Rw * 0.72];
  const sgn = (x: number) => (x < 0 ? `(${fmt(x, 2)})` : fmt(x, 2));
  const ro = inst && M.readout(inst.leads);
  const idText = t('lbl_identity', ro ? { i: sgn(ro.I), iii: sgn(ro.III), ii: sgn(ro.II), d: fmt(ro.d, 2) } : { i: '—', iii: '—', ii: '—', d: '—' });
  const idWide = t('lbl_identity', { i: '(−8.88)', iii: '(−8.88)', ii: '(−8.88)', d: '−8.88' });
  const stack: Array<[string, number]> = [
    [t('lbl_augSum'), f.augSum * (1 - f.fAug)],
    [t('lbl_aVF'), f.fAug * (1 - f.identity)],
    [t('lbl_final'), f.identity],
  ];
  const qrsArrow = { 'marker-end': `url(#${uid}-qrs)`, style: stk('c-qrs', 2.6) };

  const controls = (
    <>
      <Check id={`${uid}-cab`} label={t('ctl_cabrera')} checked={cab} onChange={setCab} />
      <Check id={`${uid}-grp`} label={t('ctl_groups')} checked={groups} onChange={setGroups} />
    </>
  );

  return (
    <SceneFrame id="triangle-to-wheel" title={t('title')} aria={t('aria')} scene={scT} stageRef={stage} narration={(id) => t(`beat_${id}`)} controls={controls} caption={t('caption')} footer={<div class="sc-note">{tsn('scModel')}</div>}>
      <Svg w={pl.w} h={pl.h} label={`${t('lbl_meters')} · ${t('lbl_strips')}`}>
        <ArrowDefs id={uid} kinds={['vector', 'lead', 'lead2']} />
        <defs>
          <marker id={`${uid}-qrs`} viewBox="0 0 10 10" refX="8.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="13" markerHeight="13" orient="auto">
            <path d="M0 0L10 5L0 10z" style={{ fill: 'var(--c-qrs)' }} />
          </marker>
        </defs>
        {paths && (
          <g>
            <path d={paths.torso} class="fg-body" style={{ opacity: f.torso, fillOpacity: 0.5 }} />
            <path d={`M${M.ELECTRODES.map((e) => M.electrodeAt(pl, e).join(' ')).join('L')}Z`} class="fg-tri" style={stk('c-conduction', 1.4, f.ghost)} />
            {GROUPS.map((g) => (
              <path d={sectorPath(pl.cx, pl.cy, Rw, g === 'inferior' ? 60 : -30, g === 'inferior' ? 120 : 0)} style={{ fill: GROUP_FILL[g], opacity: groups ? 0.16 * f.augSlide : 0, transition: anim }} />
            ))}
            <circle cx={C[0]} cy={C[1]} r={Rw} class="fg-ring" style={{ opacity: f.ring }} />
            {M.NEG_POLE_DEG.map((d) => {
              const [x, y] = M.degLabelAt(pl, d);
              return (
                <text x={x} y={y + 4} text-anchor="middle" class="fg-svg-text fg-svg-text--deg tabular" style={{ opacity: f.degC, fontSize: `${fs - 1}px` }}>
                  {d === 180 ? '±180°' : fmtDeg(d)}
                </text>
              );
            })}
            {LIMB_LEADS.map(axis)}
            {M.PAIRS.map((_, i) => (
              <path d={M.pairMarkPath(pl, i)} style={stk('c-highlight', 1.6, M.pairMark(f, i))} />
            ))}
            <g style={{ opacity: f.mean }}>
              <path d={line(C, mTip)} {...qrsArrow} />
              <path d="M8 14H28" {...qrsArrow} />
              <text x="36" y="18" class="fg-svg-text tabular" style={txt(fs, 'var(--c-qrs)')}>
                {t('lbl_mean', { deg: fmtDeg(Math.round(meanDeg)) })}
              </text>
            </g>
            {GROUPS.map((g) => {
              const [x, y] = M.groupLabelAt(pl, g);
              return (
                <text x={x} y={y + 4} text-anchor="middle" class="fg-svg-text" style={{ ...txt(fs - 1, GROUP_FILL[g]), stroke: 'var(--panel)', strokeWidth: 3, paintOrder: 'stroke', opacity: groups ? f.augSlide : 0, transition: anim }}>
                  {t(`lbl_${g}`)}
                </text>
              );
            })}
            {Math.hypot(v[0], v[1]) * vs > 3 && <path d={line(C, tip)} class="fg-vector" marker-end={`url(#${uid}-vector)`} style={{ opacity: f.vec }} />}
            <circle cx={C[0]} cy={C[1]} r="3" class="fg-vector-origin" />
            {M.ELECTRODES.map((e) => {
              const [x, y] = M.electrodeAt(pl, e), u = unit(M.ELECTRODE_DEG[e]);
              return (
                <g key={`e${e}`}>
                  <circle cx={x} cy={y} r="7" class="fg-el__dot" style={{ stroke: 'var(--fg-muted)', opacity: 1 - 0.6 * f.augSlide }} />
                  <text x={x + u[0] * 20} y={y + u[1] * 20 + 4} text-anchor="middle" class="fg-svg-text" style={{ ...txt(fs), opacity: 1 - f.augSlide }}>
                    {e}
                  </text>
                </g>
              );
            })}
            {[0, 1, 2, 3].map(meter)}
            <g style={{ opacity: f.wct }}>
              <SvgLabel x={pl.meters.x + 4} y={pl.meters.y + pl.meters.h + 12} text={t('lbl_wct')} max={30} class="fg-svg-text fg-svg-text--small" />
            </g>
            {LIMB_LEADS.map(row)}
            {[f.slow1, f.slow2].map((o, i) => (
              <text x={pl.rows.x + rw - 6} y={pl.rows.y + 14} text-anchor="end" class="fg-svg-text tabular" style={{ ...txt(fs - 1, 'var(--fg-muted)'), opacity: o }}>
                {t('lbl_slow', { k: slowK[i] })}
              </text>
            ))}
          </g>
        )}
      </Svg>
      <div class="fg-arith tabular" style={{ textAlign: 'center' }}>
        <div style={{ opacity: f.readout }} aria-hidden={f.readout < 0.5}>
          <Reserve reserve={[idWide]}>{idText}</Reserve>
        </div>
        <div style={{ display: 'grid', fontSize: 'var(--fs-sm)' }}>
          {stack.map(([s, w]) => (
            <span style={{ gridArea: '1 / 1', opacity: w }} aria-hidden={w < 0.5}>
              {s}
            </span>
          ))}
        </div>
      </div>
    </SceneFrame>
  );
}
