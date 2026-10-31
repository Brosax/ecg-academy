/**
 * Paper that moves, a pen that does not (lesson f4; spec docs/design/f-explainers.md §4.6). Render only: the maths is
 * in moving-paper.math.ts. One source: lead II of the block's ECG; speed and gain are the recording chain.
 * Ink is built once per scale; per frame only transforms and opacities change.
 */
import type { Signal } from '@preact/signals';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Ecg } from '../../core/ecg';
import type { FigureParams } from '../api';
import { compileBeats, easeInOut, Predict, SceneFrame, useScene, type SceneState } from '../scene/index';
import { fmt, PaperGrid, prefersReducedMotion, Reserve, Svg, Toggle, useUid } from '../shared';
import { tMovingPaper as t } from './moving-paper.i18n';
import * as M from './moving-paper.math';

type Props = { readonly params?: FigureParams['moving-paper']; readonly cursor?: Signal<number | null>; readonly ecg?: Ecg };
type Mode = { readonly speed: M.SpeedMode; readonly gain: M.GainMode; readonly last: 'speed' | 'gain' | null };

const MORPH_MS = 500;
const SPEEDS = [25, 50] as const;
const GAINS = [5, 10, 20] as const;
const nearest = <T extends number>(x: number, opts: readonly T[]): T => opts.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
const num = (x: number) => fmt(x, M.digitsFor(Math.round(x * 100) / 100));
const sqs = (n: number) => fmt(n, M.squaresDigits(n));

/** Continuous 500 ms morph of the scale weights toward the target, starting from wherever the blend is now. */
function useMorph(target: M.Scale): M.Scale {
  const [cur, setCur] = useState(target);
  const ref = useRef(cur);
  ref.current = cur;
  const key = `${target.sw.join()}|${target.gw.join()}`;
  useEffect(() => {
    const from = ref.current;
    if (`${from.sw.join()}|${from.gw.join()}` === key) return;
    if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function') return setCur(target);
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const f = Math.min(1, (now - t0) / MORPH_MS);
      const e = easeInOut(f);
      setCur(f >= 1 ? target : { sw: M.blend(from.sw, target.sw, e), gw: M.blend(from.gw, target.gw, e) });
      if (f < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key]);
  return cur;
}

export function MovingPaperScene(props: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const uid = useUid('mp');
  const [lay, setLay] = useState(() => M.placementFor(typeof window === 'undefined' ? 760 : window.innerWidth - 64));
  useEffect(() => {
    const w = stage.current?.clientWidth;
    if (w) setLay(M.placementFor(w));
  }, []);
  const [mode, setMode] = useState<Mode>({ speed: props.params?.speed ?? 'tour', gain: props.params?.gain ?? 'tour', last: props.params?.gain ? 'gain' : props.params?.speed ? 'speed' : null });
  const [feedback, setFeedback] = useState<string | null>(null);
  const scale = useMorph(useMemo(() => M.scaleOf(mode.speed, mode.gain), [mode.speed, mode.gain]));

  const ecg = props.ecg;
  const plan = useMemo(() => (ecg?.truth ? M.planFor(ecg.truth.beats, ecg.signal.leads.II, ecg.signal.fs, ecg.signal.durationMs) : null), [ecg]);
  const timeline = useMemo(
    () => (plan ? compileBeats(M.beatDefs(plan), { window: [plan.t0, plan.t1], durationMs: (plan.t1 - plan.t0) * M.SLOW, key: `moving-paper@${Math.round(plan.t0)}` }) : null),
    [plan],
  );
  const sc = useScene({ timeline, cursor: props.cursor, target: stage });
  const ink = useMemo(() => (plan ? M.inkPath(plan, scale, lay.base) : ''), [plan, scale, lay]);
  const f = plan ? M.frame(sc.p, plan, scale, lay) : null;
  const grid = useMemo(() => M.gridExtent(plan, lay), [plan, lay]);

  // the narration transport restores the tour (morphing); scrubbing keeps the learner's settings
  const tour = () => {
    setMode({ speed: 'tour', gain: 'tour', last: null });
    setFeedback(null);
  };
  const wrap = <A extends unknown[]>(fn: (...a: A) => void) => (...a: A) => {
    tour();
    fn(...a);
  };
  // prev / next step from the beat whose end frame is shown (M.navIndex)
  const i = M.navIndex(sc.beats, sc.p);
  const prev = wrap(() => sc.seekBeat(i - 1));
  const next = wrap(() => sc.seekBeat(i + 1));
  const scene: SceneState<M.BeatId> = { ...sc, i, beatIndex: i, id: sc.beats[i]?.id ?? sc.id, replay: wrap(sc.replay), prev, next, prevBeat: prev, nextBeat: next, playBeat: wrap(sc.playBeat), seekBeat: wrap(sc.seekBeat) };

  const v = f?.v ?? 25;
  const g = f?.g ?? 10;
  const rr0 = plan?.rrMs[0] ?? 800;
  const ovSpeed = (s: number) => t('ov_speed', { v: s, ms: num(1000 / s), n: sqs(M.rrLabel(rr0, s).n), rr: M.rrShown(rr0) });
  const ovGain = (k: number) => t('ov_gain', { g: k, h: k, mv: num(1 / k) });
  const override = mode.last === 'speed' && mode.speed !== 'tour' ? ovSpeed(mode.speed) : mode.last === 'gain' && mode.gain !== 'tour' ? ovGain(mode.gain) : null;
  const reserve = [...SPEEDS.map(ovSpeed), ...GAINS.map(ovGain), t('pq_ok'), t('pq_wrong')];

  const ro = (sv: number, gv: number) => [t('ro_small', { ms: Math.round(1000 / sv), mv: num(1 / gv) }), t('ro_large', { ms: Math.round(5000 / sv), mv: num(5 / gv) })];
  const roWide = [ro(25, 5), ro(25, 20), ro(50, 20), ro(37, 7)];
  const [small, large] = ro(v, g);
  const fs = lay.fs;
  const txt = (o: number, extra = '') => ({ opacity: o, fontSize: `${fs}px`, ...(extra ? { fill: extra } : {}) });

  return (
    <SceneFrame
      id="moving-paper"
      title={t('title')}
      aria={t('aria')}
      scene={scene}
      stageRef={stage}
      narration={(id) => t(`beat_${id}`)}
      narrationReserve={reserve}
      narrationOverride={feedback ?? override}
      slow={M.SLOW}
      caption={t('caption')}
      controls={
        <>
          <Toggle label={t('ctl_speed')} value={mode.speed === 'tour' ? nearest(v, SPEEDS) : mode.speed} onChange={(s) => (setFeedback(null), setMode({ ...mode, speed: s, last: 'speed' }))} options={SPEEDS.map((s) => ({ value: s, label: `${s} mm/s` }))} />
          <Toggle label={t('ctl_gain')} value={mode.gain === 'tour' ? nearest(g, GAINS) : mode.gain} onChange={(k) => (setFeedback(null), setMode({ ...mode, gain: k, last: 'gain' }))} options={GAINS.map((k) => ({ value: k, label: `${k} mm/mV` }))} />
        </>
      }
      predict={
        <Predict
          question={t('pq_question')}
          options={(['800', '400', '1600'] as const).map((id) => ({ id, label: `${id} ms` }))}
          correct="800"
          playing={sc.playing}
          onReveal={(_pick, ok) => {
            tour();
            setFeedback(t(ok ? 'pq_ok' : 'pq_wrong'));
            sc.playBeat(3);
          }}
          onReset={() => setFeedback(null)}
        />
      }
      footer={
        <div class="fg-readout fg-readout--grid tabular">
          <div>
            <b>{t('ctl_speed')}</b>
            <Reserve reserve={['50 mm/s']}>{`${Math.round(v)} mm/s`}</Reserve>
          </div>
          <div>
            <b>{t('ctl_gain')}</b>
            <Reserve reserve={['20 mm/mV']}>{`${Math.round(g)} mm/mV`}</Reserve>
          </div>
          <div>
            <Reserve reserve={roWide.map((r) => r[0])}>{small}</Reserve>
          </div>
          <div>
            <Reserve reserve={roWide.map((r) => r[1])}>{large}</Reserve>
          </div>
        </div>
      }
    >
      <Svg w={lay.w} h={lay.h} label={t('aria')}>
        <defs>
          <clipPath id={`${uid}-p`}>
            <rect x={0} y={lay.pt} width={lay.w} height={lay.pb - lay.pt} />
          </clipPath>
          <clipPath id={`${uid}-i`}>
            <rect x={0} y={lay.pt} width={lay.pen} height={lay.pb - lay.pt} />
          </clipPath>
        </defs>

        {/* receipt slots, filled when a pulse copy lands */}
        <g>
          {lay.cardX.map((x, k) => {
            const r = f?.receipts[k];
            const o = r?.fly ?? 0;
            const lx = x + lay.lblDx;
            const ly = lay.cardY + lay.lblDy;
            return (
              <g key={k}>
                <rect x={x} y={lay.cardY} width={lay.cardW} height={lay.cardH} rx={0.4} fill="none" stroke="var(--border-strong)" stroke-width="1" stroke-dasharray="3 2" vector-effect="non-scaling-stroke" />
                <g style={{ opacity: o }}>
                  <rect x={x} y={lay.cardY} width={lay.cardW} height={lay.cardH} rx={0.4} class="fg-paper" stroke="var(--border-strong)" stroke-width="1" vector-effect="non-scaling-stroke" />
                  <path d={M.cardGridPath(x, lay)} class="fg-grid-major" />
                  <text x={x + lay.cardW - 0.4} y={lay.cardY + 1.5} text-anchor="end" class="fg-svg-text fg-svg-text--muted" style={{ fontSize: `${fs}px` }}>½</text>
                </g>
                <text x={x + lay.cardW / 2} y={lay.cardY + lay.cardH / 2 + fs * 0.35} text-anchor="middle" class="fg-svg-text fg-svg-text--muted" style={{ fontSize: `${fs}px`, opacity: 1 - o }}>{k + 1}</text>
                {r && (
                  <g class="tabular" style={{ opacity: o }}>
                    <text x={lx} y={ly} class={`fg-svg-text ${Math.round(r.v) === 25 ? 'fg-svg-text--muted' : 'fg-svg-text--hi'}`} style={{ fontSize: `${fs}px` }}>{`${num(r.v)} mm/s`}</text>
                    <text x={lx} y={ly + fs * 1.25} class={`fg-svg-text ${Math.round(r.g) === 10 ? 'fg-svg-text--muted' : 'fg-svg-text--hi'}`} style={{ fontSize: `${fs}px` }}>{`${num(r.g)} mm/mV`}</text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        <g clip-path={`url(#${uid}-p)`}>
          <g transform={`translate(${f?.shift ?? lay.pen} 0)`}>
            <PaperGrid x={grid[0]} y={lay.pt} w={grid[1] - grid[0]} h={lay.pb - lay.pt} mm={1} />
          </g>
          {f && plan && (
            <>
              {/* what the pen has laid (clipped at the pen) */}
              <g clip-path={`url(#${uid}-i)`}>
                <g transform={`translate(${f.shift} 0)`}>
                  <g class="fg-anno fg-anno--minor" style={{ opacity: f.sqO[0] }}>
                    <rect x={f.ticks[0]} y={lay.base - 1} width={1} height={1} />
                  </g>
                  <g class="fg-anno fg-anno--major" style={{ opacity: f.sqO[1] }}>
                    <rect x={f.ticks[0]} y={lay.base - 5} width={5} height={5} />
                  </g>
                  <path d={M.rulerPath(f.ticks, lay)} fill="none" stroke="var(--c-vector)" stroke-width="1.2" vector-effect="non-scaling-stroke" />
                  <path d={ink} class="fg-trace" />
                </g>
              </g>

              {/* labels attached to the paper */}
              <g transform={`translate(${f.shift} 0)`} class="tabular">
                {(['40 ms', '200 ms', '1 s'] as const).map((s, k) => (
                  <text x={f.ticks[[1, 5, 25][k]]} y={lay.pb - 2.9} text-anchor={k === 0 ? 'end' : 'middle'} class="fg-svg-text fg-svg-text--ruler" style={txt(f.rulerO[k])}>{s}</text>
                ))}
                {f.receipts.map((r) => (
                  <g style={{ opacity: r.dimO }}>
                    <text x={r.px + r.widthMm / 2} y={lay.base - r.heightMm - 0.7} text-anchor="middle" class="fg-svg-text" style={txt(1)}>{t('lbl_pulseH', { mm: num(r.heightMm) })}</text>
                    <text x={r.px + r.widthMm / 2} y={lay.base + 2.4} text-anchor="middle" class="fg-svg-text" style={txt(1)}>{t('lbl_pulseW', { mm: num(r.widthMm) })}</text>
                  </g>
                ))}
                {f.rr.map((b) =>
                  b.o > 0 ? (
                    <g>
                      <g class="fg-anno fg-anno--vector" style={{ opacity: b.o }}>
                        <path d={`M${b.x1} ${b.tick0}V${b.tick1}M${b.x2} ${b.tick0}V${b.tick1}M${b.x1} ${b.lineY}H${b.x2}`} />
                      </g>
                      <g style={{ opacity: b.lo }}>
                        <text x={(b.x1 + b.x2) / 2} y={b.y1} text-anchor="middle" class="fg-svg-text fg-svg-text--vector fg-svg-text--strong" style={txt(1)}>
                          {t('lbl_rr', { n: sqs(b.label.n), sq: Math.round(b.label.sq), ms: M.rrShown(b.label.ms) })}
                        </text>
                        <text x={(b.x1 + b.x2) / 2} y={b.y2} text-anchor="middle" class="fg-svg-text fg-svg-text--vector" style={txt(1)}>
                          {t('lbl_rate', { k: Math.round(b.label.k), n: sqs(b.label.n), bpm: Math.round(b.label.bpm) })}
                        </text>
                      </g>
                    </g>
                  ) : null,
                )}
                {f.qrs.map((q) =>
                  q.o > 0 ? (
                    <g style={{ opacity: q.o }}>
                      <g class="fg-anno fg-anno--qrs">
                        <path d={`M${q.x1} ${q.y - 0.6}V${q.y + 0.6}M${q.x2} ${q.y - 0.6}V${q.y + 0.6}M${q.x1} ${q.y}H${q.x2}`} />
                      </g>
                      <text x={(q.x1 + q.x2) / 2} y={q.y + 0.6 + 0.75 * fs} text-anchor="middle" class="fg-svg-text fg-svg-text--strong" style={txt(1, 'var(--c-qrs)')}>
                        {t('lbl_qrs', { n: fmt(q.n, 1), ms: Math.round(q.ms) })}
                      </text>
                    </g>
                  ) : null,
                )}
                <text x={f.halfX} y={f.halfY} text-anchor="middle" class="fg-svg-text fg-svg-text--hi" style={txt(f.halfO)}>{t('lbl_half')}</text>
              </g>

            </>
          )}

          {/* the fixed pen on its lever arm (arm length ∝ gain) */}
          <g>
            <line x1={lay.pen} x2={lay.pen} y1={lay.pt} y2={lay.pb} stroke="var(--fg-faint)" stroke-width="1" stroke-dasharray="2 3" vector-effect="non-scaling-stroke" />
            <line x1={lay.pen} y1={f?.penY ?? lay.base} x2={lay.pen + (f?.leverMm ?? 10 * lay.lever)} y2={lay.base} stroke="var(--fg-muted)" stroke-width="2.5" stroke-linecap="round" vector-effect="non-scaling-stroke" />
            <circle cx={lay.pen + (f?.leverMm ?? 10 * lay.lever)} cy={lay.base} r={0.5} fill="var(--panel)" stroke="var(--fg)" stroke-width="1.2" vector-effect="non-scaling-stroke" />
            <circle cx={lay.pen} cy={f?.penY ?? lay.base} r={0.65} class="sc-pen sc-pen--glow" />
            {lay.penLabels && (
              <g class="tabular">
                <text x={lay.pen + 1.5} y={lay.pt + 2.2} class="fg-svg-text fg-svg-text--muted" style={txt(1)}>{t('lbl_pen')}</text>
                <text x={lay.pen + 1.5} y={lay.pt + 4.2} class="fg-svg-text fg-svg-text--strong" style={txt(1)}>{`← ${Math.round(v)} mm/s`}</text>
                <text x={lay.pen + 1.5} y={lay.pb - 1.5} class="fg-svg-text fg-svg-text--strong" style={txt(1)}>{`${Math.round(g)} mm/mV`}</text>
              </g>
            )}
          </g>
        </g>
        {/* pulse copies flying home */}
        {f?.receipts.map((r) =>
          r.fly > 0 ? <path transform={`translate(${r.x} ${r.y}) scale(${r.k})`} d={`M-1.5 0H0V${-r.heightMm}H${r.widthMm}V0H${r.widthMm + 1.5}`} class="fg-cal" /> : null,
        )}
      </Svg>
    </SceneFrame>
  );
}
