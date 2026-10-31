/** Swap two cables, watch six leads (f6, spec §4.8). Render only; every strip is an exact re-assembly (cable-swap.math.ts). */
import { effect, type Signal } from '@preact/signals';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Ecg } from '../../core/ecg';
import { CHEST_LEADS, LIMB_LEADS, type StdLead } from '../../core/leads';
import type { FigureParams } from '../api';
import { compileBeats, Predict, SceneFrame, useScene } from '../scene/index';
import { Check, fmt, PaperGrid, Svg, SvgLabel, useUid } from '../shared';
import { leadPath } from '../strip';
import { tCableSwap as t } from './cable-swap.i18n';
import * as M from './cable-swap.math';

type Props = { readonly params?: FigureParams['cable-swap']; readonly cursor?: Signal<number | null>; readonly ecg?: Ecg };
type Live = M.Manual & { readonly atP: number };
const REC = ['RA', 'LA', 'LL'] as const;
const pick = () => (typeof window !== 'undefined' && window.innerWidth < 640 ? M.NARROW : M.WIDE);
const op = (opacity: number) => ({ opacity });
const TX = 'fg-svg-text', SM = 'fg-svg-text fg-svg-text--small', B = 'fg-svg-text fg-svg-text--strong';
/** a focusable SVG button (Enter / Space) */
const btn = (label: string, ready: boolean, f: () => void) => ({
  role: 'button' as const,
  tabIndex: ready ? 0 : -1,
  'aria-label': label,
  class: 'fg-focusable',
  style: { cursor: 'pointer' },
  onClick: () => void (ready && f()),
  onKeyDown: (e: KeyboardEvent) => {
    if (ready && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      f();
    }
  },
});

export function CableSwapScene(props: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const uid = useUid('cs');
  const [pl, setPl] = useState(pick);
  const start = props.params?.start ?? 'correct';
  const ecg = props.ecg;
  const win = useMemo(() => (ecg?.truth ? M.sceneWindow(ecg.truth, ecg.signal.durationMs) : null), [ecg]);
  const phi = useMemo(() => (ecg ? M.potentialsFromSignal(ecg.signal) : null), [ecg]);
  const fid = useMemo(() => (phi && win && ecg?.truth ? M.meterFiducial(phi, ecg.truth, win) : 0.5), [phi, win]);
  const timeline = useMemo(() => (win ? compileBeats(M.BEATS, { key: `cable-swap@${win[0]}` }) : null), [win]);
  // no timeline window: the block cursor follows the meters (one clock, bridged below), not p
  const sc = useScene({ timeline, target: stage, autoplay: start === 'correct' });
  const [live, setLive] = useState<Live | null>(null);
  const [armed, setArmed] = useState<M.Cable | null>(null);
  const [tried, setTried] = useState<ReadonlySet<M.SwapId>>(() => new Set());
  const [showF, setShowF] = useState(true);
  const [dextro, setDextro] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pk, setPk] = useState(0);
  const [pin, setPin] = useState<{ t: number; atP: number } | null>(null);
  const raf = useRef(0), pRef = useRef(sc.p), last = useRef<number | null>(null);
  pRef.current = sc.p;

  useEffect(() => {
    const on = () => setPl(pick());
    window.addEventListener('resize', on);
    return () => (window.removeEventListener('resize', on), cancelAnimationFrame(raf.current));
  }, []);
  // a learner hook-up (and its Predict / dextro view) belongs to its instant: a scrub or replay ends it
  useEffect(() => {
    if (live && live.atP !== sc.p) {
      cancelAnimationFrame(raf.current);
      setLive(null);
      setArmed(null);
      setDextro(false);
      setFeedback(null);
      setPk((k) => k + 1);
    }
    if (pin && pin.atP !== sc.p) setPin(null);
  }, [sc.p]);
  // a lesson start hook-up: held on the end frame
  useEffect(() => {
    if (sc.ready && start !== 'correct') {
      sc.seek(1);
      setLive({ from: M.HOOKUPS[start], to: M.HOOKUPS[start], f: 1, atP: 1 });
      setTried((s) => new Set(s).add(start));
    }
  }, [sc.ready]);

  const tour = M.frame(sc.p, null, fid);
  const fr = live && live.atP === sc.p ? M.composeManual(tour, live) : tour;
  const shown = M.shownHookup(fr);
  const meterT = pin && pin.atP === sc.p ? pin.t : fr.meterT;
  // own cursor writes are remembered; a click on the 12-lead stops the tour and pins the meters there
  const cur = props.cursor, curMs = win ? M.cursorMs(win, meterT) : null;
  useEffect(() => {
    if (!cur || curMs == null) return;
    last.current = curMs;
    if (cur.peek() !== curMs) cur.value = curMs;
  }, [cur, curMs]);
  useEffect(() => {
    if (!cur || !win) return;
    return effect(() => {
      const v = cur.value;
      if (v == null || v === last.current) return;
      sc.stop();
      setPin({ t: M.cursorFrac(win, v), atP: pRef.current });
    });
  }, [cur, win]);

  const swapTo = (to: M.Hookup) => {
    const from = shown, atP = sc.p;
    sc.stop();
    cancelAnimationFrame(raf.current);
    const id = M.hookupId(to);
    if (id && id !== 'correct') setTried((s) => new Set(s).add(id));
    if (id !== 'laRa') setDextro(false);
    if (sc.reduced) return setLive({ from, to, f: 1, atP });
    const t0 = performance.now();
    const step = (now: number) => {
      const f = Math.min(1, (now - t0) / M.SWAP_MS);
      setLive({ from, to, f, atP });
      if (f < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };
  const onPlug = (c: M.Cable) => {
    if (sc.playing) sc.stop();
    if (armed == null) return setArmed(c);
    setArmed(null);
    if (armed !== c) swapTo(M.swapCables(shown, armed, c));
  };

  // strip paths per hook-up (and layout)
  const geo = useMemo(() => (phi && win ? M.stripScale(phi, win, pl) : null), [phi, win, pl]);
  const cache = useMemo(() => new Map<string, Record<StdLead, string>>(), [geo]);
  const paths = (h: M.Hookup) => {
    if (!phi || !win || !geo) return null;
    const k = M.hookupKey(h);
    if (!cache.has(k)) cache.set(k, M.stripPaths(phi, h, win, pl, geo, leadPath));
    return cache.get(k)!;
  };
  const pA = paths(fr.hookA), pB = paths(fr.hookB);
  const same = M.sameHookup(fr.hookA, fr.hookB);
  const sig = M.hookupSignature(shown);
  const shownId = M.hookupId(shown), changed = shownId !== 'correct';
  const tagOp = (same ? 1 : Math.abs(2 * fr.xf - 1)) * (changed ? 1 : 0);
  const predicted = feedback != null && shownId === 'laLl';
  const dx = dextro && shownId === 'laRa';
  const dash = fr.reveal < 1 ? `${fr.reveal} 2` : undefined;

  const strip = (l: StdLead) => {
    const [x, y, w, h] = M.stripBox(pl, l);
    const d = l.startsWith('V') ? null : sig.per[l as M.LimbLead];
    const tag = d ? M.descText(d) : '';
    const hi = (predicted && l === M.PREDICT_LEAD) || (dx && (l === 'I' || l === 'aVR'));
    const cx = x + w * meterT;
    return (
      <g key={l}>
        <PaperGrid x={x} y={y} w={w} h={h} mm={d ? geo?.mmL ?? 5 : geo?.mmV ?? 5} minor={!!d} />
        <clipPath id={uid + l}>
          <rect x={x} y={y} width={w} height={h} />
        </clipPath>
        <g clip-path={`url(#${uid}${l})`}>
          {pA && <path d={pA[l]} pathLength={1} stroke-dasharray={dash} class="fg-trace" style={op(same ? 1 : 1 - fr.xf)} />}
          {pB && !same && <path d={pB[l]} pathLength={1} stroke-dasharray={dash} class="fg-trace" style={op(fr.xf)} />}
          <line x1={cx} x2={cx} y1={y} y2={y + h} stroke="var(--ecg-cursor)" style={op(0.6 * fr.meterOp)} />
        </g>
        {(hi || (changed && d && tag !== '=')) && (
          <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx={3} fill="none" stroke={hi ? 'var(--c-vector)' : M.cellColor(tag)} stroke-width={hi ? 2.5 : 1.6} style={op(hi ? 1 : tagOp)} />
        )}
        <text x={x + 4} y={y + 13} class={d ? 'fg-svg-text fg-svg-text--lead' : B}>{l}</text>
        {d && (
          <>
            <text x={x + w - 4} y={y + 13} text-anchor="end" class={`${B} tabular`} style={{ fill: M.cellColor(tag), opacity: tagOp }}>{tag}</text>
            <text x={x} y={y + h + 11} class={`${SM} tabular`} style={op(fr.formulaOp * (showF ? 1 : 0))}>{M.formulaText(l as M.LimbLead, shown, pl.narrow)}</text>
            {d.k === 0 && (
              <g style={op(fr.flatOp)}>
                <SvgLabel x={x + 4} y={y + h - 6} text={M.fitLabel(t('lbl_flat'), t('lbl_flatShort'), w - 8)} max={99} class="fg-svg-text fg-svg-text--hi" />
              </g>
            )}
          </>
        )}
      </g>
    );
  };

  const [rx, ry, rw, rh] = pl.recorder;
  const shift = sig.chestShift;
  const vText = M.vRowText(shown, t('lbl_vShift'), t('lbl_wct'), t('lbl_vSame'));
  const chip = t('lbl_chip');
  const ty = (k: number) => pl.table[1] + pl.rowH * k + pl.rowH / 2 + 4;
  const num = (g: number) => fmt(g, M.gainDigits(g));

  return (
    <SceneFrame
      id="cable-swap"
      title={t('title')}
      aria={t('aria')}
      scene={sc}
      stageRef={stage}
      narration={(id) => t(`beat_${id}`)}
      narrationReserve={[t('pq_ok'), t('pq_wrong'), t('lbl_dextro')]}
      narrationOverride={sc.playing ? null : predicted ? feedback : dx ? t('lbl_dextro') : null}
      slow={geo ? M.penSlow(geo.ms) : undefined}
      caption={t('caption')}
      controls={
        <>
          <button type="button" class="fg-btn" onClick={() => swapTo(M.HOOKUPS.correct)} disabled={!sc.ready}>
            {t('ctl_reset')}
          </button>
          <Check id={`${uid}-f`} label={t('ctl_formulas')} checked={showF} onChange={setShowF} />
          <Check id={`${uid}-d`} label={t('ctl_dextro')} checked={dextro} onChange={(v) => (setDextro(v), v && swapTo(M.HOOKUPS.laRa))} />
        </>
      }
      predict={
        <Predict
          key={pk}
          question={t('pq_question')}
          options={(['I', 'II', 'III'] as const).map((l) => ({ id: l, label: l }))}
          correct={M.PREDICT_LEAD}
          playing={sc.playing}
          onReveal={(_p, ok) => {
            setFeedback(t(ok ? 'pq_ok' : 'pq_wrong'));
            swapTo(M.HOOKUPS.laLl);
          }}
          onReset={() => setFeedback(null)}
        />
      }
    >
      <Svg w={pl.w} h={pl.h} label={t('aria')} role="group">
        <g aria-hidden="true">
          <g transform={pl.bodyT}>
            {pl.body.map((d, i) => (
              <path d={d} fill={i < 2 ? 'var(--panel-2)' : 'none'} stroke="var(--border-strong)" stroke-width={i < 2 ? 1.5 : 9} stroke-linecap="round" />
            ))}
          </g>
          {M.CABLES.map((l) => {
            const q = M.siteLabel(pl, l);
            return <text x={q.x} y={q.y} text-anchor={q.anchor} class={SM}>{l}</text>;
          })}
          <rect x={rx} y={ry} width={rw} height={rh} rx={6} fill="var(--panel)" stroke="var(--border-strong)" />
          <text x={rx + rw / 2} y={ry + rh - 6} text-anchor="middle" class={SM}>{t('lbl_recorder')}</text>
          {REC.map((c) => {
            const [sx, sy] = pl.sockets[c], j = fr.wctJoin;
            return <line x1={sx} y1={sy} x2={sx + (pl.wct[0] - sx) * j} y2={sy + (pl.wct[1] - sy) * j} stroke="var(--c-vector)" stroke-width={1.6} style={op(j > 0 ? 1 : 0)} />;
          })}
          <g style={op(fr.wctLabelOp)}>
            <circle cx={pl.wct[0]} cy={pl.wct[1]} r={4} fill="var(--c-vector)" />
            <text x={pl.wct[0] + 8} y={pl.wct[1] + 4} class={`${B} fg-svg-text--vector`}>{t('lbl_wctName')}</text>
          </g>
          <g style={op(fr.rlOp)}>
            <SvgLabel x={pl.rlNote[0]} y={pl.rlNote[1]} text={t('lbl_rl')} max={pl.rlMax} />
          </g>
          {REC.map((c) => {
            const [mx, my] = pl.meters[c];
            const v = phi && win ? M.meterBar(M.cableValue(phi, shown, c, win, meterT)) : 0;
            return (
              <g style={op(fr.meterOp)}>
                <line x1={mx - 9} x2={mx + 9} y1={my} y2={my} stroke="var(--border-strong)" />
                <rect x={mx - 5} y={Math.min(my, my - v)} width={10} height={Math.abs(v)} fill={M.CABLE_COLOR[c]} />
                <text x={mx} y={my + 30} text-anchor="middle" class={SM}>{`φ${c}`}</text>
              </g>
            );
          })}
        </g>
        {M.CABLES.map((c) => {
          const m = fr.cables[c], s = pl.sockets[c];
          const [px, py] = M.plugPos(m, pl);
          return (
            <g key={c} {...btn(t('ctl_plug', { c, l: M.plugLimb(m) }), sc.ready, () => onPlug(c))} aria-pressed={armed === c}>
              <path d={M.cablePath(s, [px, py])} fill="none" stroke={M.CABLE_COLOR[c]} stroke-width={2.2} />
              <circle cx={s[0]} cy={s[1]} r={3} fill={M.CABLE_COLOR[c]} />
              <circle cx={px} cy={py} r={M.PLUG_HIT} fill="transparent" stroke={armed === c ? 'var(--focus)' : 'none'} stroke-width={2.5} />
              <circle cx={px} cy={py} r={M.PLUG_R} fill="var(--panel)" stroke={M.CABLE_COLOR[c]} stroke-width={3} />
              <text x={px} y={py + 4} text-anchor="middle" class={B} style={{ fontSize: 11 }}>{c}</text>
            </g>
          );
        })}
        {LIMB_LEADS.map(strip)}
        {CHEST_LEADS.map(strip)}
        <g style={op(shift ? fr.shiftOp : Math.max(fr.wctLabelOp, fr.vCheckOp))}>
          <SvgLabel x={pl.vRow[0]} y={pl.vRow[1] - (pl.narrow ? 20 : 6)} text={vText} max={pl.chars} class={`${TX} ${shift ? 'fg-svg-text--hi' : 'fg-svg-text--vector'}`} />
        </g>
        {!shift && (
          <rect x={pl.vRow[0] - 2} y={pl.vRow[1] - 2} width={6 * pl.vW + 5 * pl.vGap + 4} height={pl.vH + 4} rx={4} fill="none" stroke="var(--ok)" stroke-width={2} style={op(dx ? 1 : fr.vCheckOp)} />
        )}
        <g class={`${TX} tabular`} style={{ fontSize: 11 }}>
          {[null, ...M.SWAP_IDS].map((id, k) => {
            const y = ty(k), cells = M.rowCells(pl, id, t('th_swap'), id ? t(`row_${id}`) : t('th_key'));
            const o = id ? M.rowOpacity(fr, id, tried.has(id)) : 1, on = o > M.ROW_LIVE;
            const b0 = id ? btn(t('ctl_row', { s: cells[0].text }), sc.ready && on, () => swapTo(M.HOOKUPS[id])) : null;
            return (
              <g key={id ?? 'h'} {...b0} aria-hidden={!on} style={{ ...b0?.style, opacity: o, pointerEvents: on ? 'auto' : 'none' }}>
                {id && <rect x={pl.table[0]} y={y - pl.rowH / 2 - 4} width={pl.tableW} height={pl.rowH} rx={3} fill={M.sameHookup(M.HOOKUPS[id], shown) ? 'var(--c-highlight-soft)' : 'transparent'} />}
                {cells.map((c) => (
                  <text x={c.x} y={y} text-anchor={c.mid ? 'middle' : 'start'} style={{ fill: c.fill, fontWeight: c.bold ? 700 : 400 }}>{c.text}</text>
                ))}
              </g>
            );
          })}
        </g>
        {geo && <text x={pl.w - 4} y={pl.chip[1] - 6} text-anchor="end" class={`${SM} tabular`}>{t('lbl_gain', { g: num(geo.g), gv: num(geo.gv) })}</text>}
        <g style={op(Math.max(fr.dextroOp, dx ? 1 : 0))}>
          <rect x={pl.chip[0]} y={pl.chip[1]} width={pl.chipW} height={M.CHIP_H} rx={8} fill="var(--panel-2)" stroke="var(--c-vector)" stroke-width={1.5} />
          <SvgLabel x={pl.chip[0] + 10} y={pl.chip[1] + (chip.length > M.CHIP_CHARS ? 15 : 22)} text={chip} max={M.CHIP_CHARS} class={B} />
        </g>
      </Svg>
    </SceneFrame>
  );
}
