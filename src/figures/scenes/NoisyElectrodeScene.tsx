/**
 * Which electrode is shaking? (f6, spec §4.9). Render only; every lead from one re-assembly of the clean ECG with noise
 * on ONE electrode. Predict is blind: a click only proposes an electrode; strips and table answers wait for Reveal.
 */
import type { Signal } from '@preact/signals';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Ecg } from '../../core/ecg';
import type { StdLead } from '../../core/leads';
import type { FigureParams } from '../api';
import { compileBeats, easeInOut, Predict, SceneFrame, timeOfP, useScene } from '../scene/index';
import { fmt, PaperGrid, Slider, Svg, SvgLabel, Toggle, useUid } from '../shared';
import { leadPath } from '../strip';
import { tNoisyElectrode as t } from './noisy-electrode.i18n';
import * as M from './noisy-electrode.math';

type Props = { readonly params?: FigureParams['noisy-electrode']; readonly cursor?: Signal<number | null>; readonly ecg?: Ecg };
type Paths = Record<StdLead, string>;

const FADE_MS = 450;
const HI = 'var(--c-highlight)';
const QRS_TXT = { fill: 'var(--c-qrs)', fontSize: 11, fontWeight: 700 };
const CHIP = 'fg-svg-text fg-svg-text--strong';

export function NoisyElectrodeScene(props: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const uid = useUid('ne');
  const [home, setHome] = useState<M.Electrode>(props.params?.electrode ?? 'LL');
  const [type, setType] = useState<M.NoiseType>(props.params?.noise ?? 'tremor');
  const [amp, setAmp] = useState(M.AMP_DEFAULT_MV);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [marked, setMarked] = useState(false);
  const [pending, setPending] = useState<M.Electrode | null>(null);
  const [qKey, setQKey] = useState(0);
  const [fade, setFade] = useState<{ readonly from: M.Electrode; readonly f: number } | null>(null);
  const fadeRaf = useRef(0);
  const stopFade = () => typeof cancelAnimationFrame === 'function' && cancelAnimationFrame(fadeRaf.current);
  useEffect(() => stopFade, []);
  // placement chosen once at mount (never during playback)
  const [pl, setPl] = useState(() => M.placementFor(typeof window === 'undefined' ? 760 : window.innerWidth - 48));
  useLayoutEffect(() => {
    const w = stage.current?.clientWidth;
    if (w) setPl(M.placementFor(w));
  }, []);

  const ecg = props.ecg;
  const sig = ecg?.signal;
  const truthBeats = ecg?.truth?.beats ?? [];
  const win = useMemo(() => (ecg ? M.chooseWindow((ecg.truth?.beats ?? []).map((b) => b.qrsOn), ecg.signal.durationMs) : null), [ecg]);
  const timeline = useMemo(() => (win ? compileBeats(M.BEATS, { window: win, key: `noisy-electrode@${win[0]},${win[1]}` }) : null), [win]);
  const sc = useScene({ timeline, cursor: props.cursor, target: stage });
  const f = M.frame(sc.p, sc.beats, { home });
  // a crossfade blends the weights AND the table rows of the two tour orders
  const ff = fade ? M.frame(sc.p, sc.beats, { home: fade.from }) : null;
  const ef = fade ? easeInOut(fade.f) : 1;
  const w = ff ? M.blendWeights(ff.w, f.w, ef) : f.w;
  const rows = ff ? M.blendWeights(ff.rows, f.rows, ef) : f.rows;
  const dot = (e: M.Electrode) => (pending && !sc.playing ? +(e === pending) : w[e]);
  const tremor = type === 'tremor';

  const fs = sig?.fs ?? 500;
  const n = sig && win ? M.sampleRange(sig, win).n : 0;
  const noise = useMemo(() => M.noiseSeries(type, n, fs), [type, n, fs]);

  // paths of one exact re-assembly, cached per source / noise / placement
  const cache = useMemo(() => new Map<string, Paths>(), [noise, sig, win, pl]);
  const pathsFor = (e: M.Electrode, a: number): Paths | null => {
    if (!sig || !win) return null;
    const key = `${e}|${a.toFixed(4)}`;
    const hit = cache.get(key);
    if (hit) return hit;
    if (cache.size > 48) cache.clear();
    const ws = M.windowSignal(sig, win, M.assembleNoisy(sig, win, e, noise, a));
    const out = {} as Paths;
    for (const l of M.ALL_LEADS) {
      const s = M.stripScale(M.stripRect(pl, l));
      out[l] = leadPath(ws, l, 0, M.WINDOW_MS, s.x, s.y, M.isLimb(l) ? 150 : 48);
    }
    cache.set(key, out);
    return out;
  };
  const states = M.ELECTRODES.filter((e) => w[e] > 0.002).map((e) => ({ e, w: w[e], paths: pathsFor(e, amp * f.gain) }));
  const tNow = win ? timeOfP(win, sc.p) - win[0] : 0;
  const { qrs, rr } = win ? M.qrsInWindow(truthBeats, win) : { qrs: [], rr: 0 };

  const vars = (e: M.Electrode) => ({ e: t(`lbl_${e}`), c: M.CULPRIT[e].clean });
  // only the 5-Hz tremor mimics flutter; other artefacts get a neutral heart beat
  const narration = (id: M.BeatId) => t(id === 'heart' && !tremor ? 'nar_heart_other' : `beat_${id}`, vars(home));
  const reserve = [t('nar_heart_other'), ...M.ELECTRODES.flatMap((e) => [...M.BEATS.map((b) => t(`beat_${b.id}`, vars(e))), t('pq_ok', vars(e)), t('pq_wrong', vars(e))])];

  // a click proposes an electrode (a new question after a reveal); it never moves the strips
  const choose = (e: M.Electrode) => {
    if (marked) {
      setQKey((k) => k + 1);
      setMarked(false);
      setFeedback(null);
    }
    setPending(e === home ? null : e);
  };
  // Reveal: two exact re-assemblies crossfade old home -> new home
  const crossTo = (e: M.Electrode) => {
    const from = home;
    setHome(e);
    stopFade();
    if (sc.reduced || typeof requestAnimationFrame !== 'function') {
      setFade(null);
      return;
    }
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / FADE_MS);
      setFade(k < 1 ? { from, f: k } : null);
      if (k < 1) fadeRaf.current = requestAnimationFrame(step);
    };
    setFade({ from, f: 0 });
    fadeRaf.current = requestAnimationFrame(step);
  };

  // static paper per placement (no minor grid on the chest row)
  const paper = useMemo(
    () => <g>{M.ALL_LEADS.map((l) => M.stripRect(pl, l)).map((r, k) => <PaperGrid x={r.x} y={r.y} w={r.w} h={r.h} mm={M.stripScale(r).mm} minor={k < 6} />)}</g>,
    [pl],
  );
  const box = (r: M.Rect, stroke: string, sw: number, op: number) => <rect x={r.x + 1} y={r.y + 1} width={r.w - 2} height={r.h - 2} rx="3" fill="none" stroke={stroke} stroke-width={sw} style={{ opacity: op }} />;

  const strip = (l: StdLead, r: M.Rect, limb: boolean) => {
    const cid = `${uid}-${l}`;
    const s = M.stripScale(r);
    const ll = l as M.LimbLead;
    const x = (ms: number) => s.x(ms - win![0]);
    return (
      <g key={l}>
        <clipPath id={cid}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} />
        </clipPath>
        <g clip-path={`url(#${cid})`}>
          {states.map((st) => st.paths && <path key={st.e} d={st.paths[l]} class="fg-trace" style={{ opacity: st.w, strokeWidth: limb ? 1.5 : 1.1 }} />)}
        </g>
        <line x1={s.x(tNow)} x2={s.x(tNow)} y1={r.y} y2={r.y + r.h} stroke="var(--ecg-cursor)" stroke-width="1" style={{ opacity: 0.5 }} />
        {limb &&
          states.map((st) => {
            const c = M.CULPRIT[st.e];
            const tag = l === c.clean ? 'clean' : l === c.aug ? 'largest' : null;
            return (
              <g key={st.e} style={{ opacity: st.w }}>
                {c.noisy.includes(ll) && box(r, HI, 2, f.hi)}
                {tag && (
                  <text x={r.x + r.w - 5} y={r.y + 13} text-anchor="end" class={CHIP} style={{ opacity: f.hi, fill: tag === 'clean' ? 'var(--ok)' : HI, fontSize: 11 }}>
                    {t(tag === 'clean' ? 'lbl_clean' : 'lbl_largest')}
                  </text>
                )}
                <text x={r.x + 36} y={r.y + 13} class={`${CHIP} tabular`} style={{ opacity: f.chips, fill: HI, fontSize: 11 }}>
                  {M.factorLabel(M.NOISE_FACTORS[st.e][l])}
                </text>
                {f.outline > 0 && (c.noisy.includes(ll) || c.aug === l) &&
                  qrs.map((b) => {
                    const x0 = Math.max(r.x, x(b.qrsOn - 20));
                    return <rect x={x0} y={r.y + 17} width={x(b.qrsOff + 20) - x0} height={r.h - 21} rx="4" fill="none" stroke="var(--c-qrs)" stroke-width="1.6" stroke-dasharray="4 3" style={{ opacity: f.outline }} />;
                  })}
                {marked && st.e === home && l === c.clean && box(r, 'var(--ok)', 2.5, 1)}
                {l === c.clean && rr > 0 && (
                  <g style={{ opacity: f.outline }}>
                    <path d={`M${x(qrs[0].qrsOn)} ${r.y + r.h - 9}v4H${x(qrs[1].qrsOn)}v-4`} fill="none" stroke="var(--c-qrs)" stroke-width="1.2" />
                    <text x={x(qrs[0].qrsOn + rr / 2)} y={r.y + r.h - 12} text-anchor="middle" class="fg-svg-text tabular" style={QRS_TXT}>
                      {t('lbl_rr', { ms: rr })}
                    </text>
                  </g>
                )}
                {l === c.noisy[1] && tremor && (
                  <text x={r.x + r.w - 5} y={r.y + 13} text-anchor="end" class="fg-svg-text tabular" style={{ ...QRS_TXT, opacity: f.verdict }}>
                    {t('lbl_rate')}
                  </text>
                )}
              </g>
            );
          })}
        <text x={r.x + 5} y={r.y + (limb ? 14 : 11)} class={limb ? 'fg-svg-text fg-svg-text--lead' : 'fg-svg-text fg-svg-text--small'}>
          {l}
        </text>
      </g>
    );
  };

  const T = pl.torso;
  const tb = pl.table;
  const col = [0, 0.2, 0.48, 0.68].map((k) => tb.x + tb.w * k);

  return (
    <SceneFrame
      id="noisy-electrode"
      title={t('title')}
      aria={t('aria')}
      scene={sc}
      stageRef={stage}
      narration={narration}
      narrationReserve={reserve}
      narrationOverride={feedback}
      slow={M.SLOW}
      caption={t('caption')}
      controls={
        <>
          <Toggle label={t('ctl_noise')} value={type} onChange={setType} options={M.NOISE_TYPES.map((v) => ({ value: v, label: t(`ctl_${v}`) }))} />
          <Slider id={`${uid}-amp`} label={t('ctl_amp')} value={amp} min={0} max={M.AMP_MAX_MV} step={0.01} onInput={setAmp} display={`${fmt(amp, 2)} mV`} displayReserve={[`${fmt(M.AMP_MAX_MV, 2)} mV`]} />
        </>
      }
      predict={
        <Predict
          key={qKey}
          question={t('pq_question')}
          options={(['I', 'II', 'III'] as const).map((l) => ({ id: l, label: l }))}
          correct={M.cleanLeadOf(pending ?? home)}
          playing={sc.playing || pending === null}
          onReveal={(_pick, ok) => {
            if (!pending) return;
            setFeedback(t(ok ? 'pq_ok' : 'pq_wrong', vars(pending)));
            setMarked(true);
            setPending(null);
            crossTo(pending);
            sc.playBeat(1);
          }}
          onReset={() => {
            setFeedback(null);
            setMarked(false);
          }}
        />
      }
    >
      <Svg w={pl.w} h={pl.h} label={t('aria')} role="group">
        {/* torso with the three limb electrodes (a click proposes one for Predict) */}
        <path d={M.TORSO_PATH} transform={`translate(${T.x} ${T.y}) scale(${T.w / 190} ${T.h / 280})`} fill="var(--panel-2)" stroke="var(--fg-muted)" stroke-width="1.4" vector-effect="non-scaling-stroke" />
        {M.ELECTRODES.map((e) => {
          const [cx, cy] = M.plugAt(pl, e);
          const j = M.jitterPx(noise, fs, tNow, f.gain, amp, type) * dot(e);
          const press = () => choose(e);
          return (
            <g key={e} role="button" tabIndex={0} aria-label={t('ctl_moveTo', { e: t(`lbl_${e}`) })} aria-pressed={e === (pending ?? home)} class="fg-focusable" style={{ cursor: 'pointer' }} onClick={press}
              onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && (ev.preventDefault(), press())}>
              <circle cx={cx} cy={cy} r={M.HIT_R} fill="transparent" />
              {e === pending && <circle cx={cx} cy={cy} r={14} fill="none" stroke={HI} stroke-width="1.6" stroke-dasharray="3 3" />}
              {e === home && <circle cx={cx} cy={cy} r={10 + 14 * f.pulse} fill="none" stroke={HI} stroke-width="2" style={{ opacity: f.pulse }} />}
              <g transform={`translate(${j} ${j * 0.6})`}>
                <circle cx={cx} cy={cy} r={9} fill="var(--panel)" stroke="var(--fg)" stroke-width="1.5" />
                <circle cx={cx} cy={cy} r={9} fill={HI} style={{ opacity: dot(e) * Math.max(f.gain, 0.15) }} />
              </g>
              <text x={cx} y={e === 'LL' ? cy - 15 : cy + 25} text-anchor="middle" class="fg-svg-text fg-svg-text--lead">
                {e}
              </text>
            </g>
          );
        })}
        <g style={{ opacity: f.rule }}>
          <SvgLabel x={pl.rule[0]} y={pl.rule[1]} text={t('lbl_rule')} max={pl.rule[2]} class="fg-svg-text fg-svg-text--hi" />
        </g>
        <text x={pl.verdict[0]} y={pl.verdict[1]} class="fg-svg-text fg-svg-text--lead" style={{ opacity: f.verdict, fill: 'var(--c-qrs)' }}>
          {t(tremor ? 'lbl_verdict' : 'lbl_verdict_other')}
        </text>
        {/* six limb strips and the thin chest row: one source, twelve leads */}
        {paper}
        {M.ALL_LEADS.map((l) => strip(l, M.stripRect(pl, l), M.isLimb(l)))}
        <text x={pl.chest.V6.x + pl.chest.V6.w} y={pl.chest.V1.y - 5} text-anchor="end" class={CHIP} style={{ opacity: f.chips, fill: HI, fontSize: 11 }}>
          {`${t('lbl_chest')} (${M.factorLabel(-1 / 3)})`}
        </text>
        {/* the culprit table, built row by row during playback */}
        <g class="fg-svg-text" style={{ fontSize: 11 }}>
          {(['lbl_th_e', 'lbl_th_bi', 'lbl_th_clean', 'lbl_th_av'] as const).map((k, i) => (
            <text x={col[i]} y={tb.y + 11} class="fg-svg-text--muted">{t(k)}</text>
          ))}
          <line x1={tb.x} x2={tb.x + tb.w} y1={tb.y + 16} y2={tb.y + 16} stroke="var(--border-strong)" />
          {M.ELECTRODES.map((e, k) => {
            const y = tb.y + 16 + tb.row * (k + 1) - 7;
            const c = M.CULPRIT[e];
            return (
              <g key={e} style={{ opacity: rows[e], fontSize: 12 }}>
                <text x={col[0]} y={y} class="fg-svg-text--strong" style={{ fill: e === home ? HI : undefined }}>
                  {e}
                </text>
                <g style={{ opacity: pending ? 0 : 1, transition: 'opacity .3s' }}>
                  <text x={col[1]} y={y}>{`${c.noisy[0]} + ${c.noisy[1]}`}</text>
                  <text x={col[2]} y={y} style={{ fill: 'var(--ok)' }}>
                    {c.clean}
                  </text>
                </g>
                <text x={col[3]} y={y} class="fg-svg-text--strong">
                  {c.aug}
                </text>
                <line x1={tb.x} x2={tb.x + tb.w} y1={y + 7} y2={y + 7} stroke="var(--border)" />
              </g>
            );
          })}
        </g>
      </Svg>
    </SceneFrame>
  );
}
