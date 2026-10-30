/**
 * Heart-rate methods on a 6-second strip at 25 mm/s: the 300-150-100-75-60-50 sequence anchored on an R wave, the
 * 1500 / small-squares method, and the 6-second method (the only one valid for irregular rhythms), with the
 * arithmetic written out. Uses lead II of the ECG when given; otherwise a schematic strip with a rate dial.
 */
import { useMemo, useState } from 'preact/hooks';
import type { FigureParams } from './api';
import type { Ecg } from '../core/ecg';
import { createRng } from '../core/rng';
import { tf } from '../i18n/figures';
import { NORMAL_BEAT, trainValue, type BeatShape } from './math/beat';
import { polyline } from './math/geom';
import { countIn6s, detectRPeaks, meanRate, rate1500, rate300, rate6s, rPeaksFromBeats, rrIrregularity, SEQ_300, seq300Bracket, seq300Label } from './math/rate';
import { Check, FigureFrame, fmt, PaperGrid, Reserve, Slider, Svg, Toggle, useUid } from './shared';
import { leadPath } from './strip';

type Method = '300' | '1500' | '6s';

const W = 760;
const H = 206;
const PX = 20; // paper left
const PY = 60; // paper top
const MM = 4.8; // units per mm
const PW = 150 * MM; // 6 s at 25 mm/s
const PH = 26 * MM;
const BASE = PY + 16 * MM;
const WINDOW = 6000;

const AF_BEAT: BeatShape = { waves: NORMAL_BEAT.waves.slice(1), marks: { ...NORMAL_BEAT.marks, pOn: null, pOff: null } };
const R_OFFSET = 194; // R peak of NORMAL_BEAT from P onset

const xOfT = (t: number, t0: number) => PX + ((t - t0) / 1000) * 25 * MM;

/** The widest wording of each method's arithmetic (widest numbers), to reserve the read-out's height. */
const ARITH_SAMPLES = () => [
  tf('rr300exact', { n: fmt(8, 0), bpm: 300 }),
  tf('rr300between', { n: fmt(8.8, 1), a: 300, b: 150, bpm: 188 }),
  tf('rr300out', { n: fmt(8.8, 1), bpm: 188 }),
  tf('rr1500', { n: fmt(88.8, 1), bpm: 188 }),
  tf('rr6s', { n: 88, bpm: 880 }),
  tf('rrNeedTwo'),
];

export function RateRulerFigure(props: { readonly params?: FigureParams['rate-ruler']; readonly ecg?: Ecg }) {
  const ecg = props.ecg;
  const uid = useUid('rr');
  const [method, setMethod] = useState<Method>(props.params?.method ?? '300');
  const [hr, setHr] = useState(75);
  const [irregular, setIrregular] = useState(false);
  const [pairSel, setPairSel] = useState(0);

  // R peaks and the trace
  const real = useMemo(() => {
    if (!ecg) return null;
    const sig = ecg.signal;
    const beats = ecg.truth?.beats;
    const peaks = beats && beats.length ? rPeaksFromBeats(beats, sig.leads.II, sig.fs) : detectRPeaks(sig.leads.II, sig.fs);
    const t0 = 0;
    const t1 = Math.min(sig.durationMs, t0 + WINDOW);
    const d = leadPath(sig, 'II', t0, t1, (t) => xOfT(t, t0), (mv) => Math.max(PY + 1, Math.min(PY + PH - 1, BASE - mv * 10 * MM)));
    return { peaks, t0, t1, d };
  }, [ecg]);

  const schematic = useMemo(() => {
    if (ecg) return null;
    const rng = createRng('rate-ruler-af');
    const mean = 60000 / hr;
    const onsets: number[] = [];
    // regular rhythm: first R exactly on a heavy line (400 ms = 2 large squares), as the 300 rule starts
    let t = irregular ? 60 : 400 - R_OFFSET;
    while (t < WINDOW + 400) {
      onsets.push(t);
      t += irregular ? mean * (0.6 + 0.8 * rng.next()) : mean;
    }
    const shape = irregular ? AF_BEAT : NORMAL_BEAT;
    const pts: Array<[number, number]> = [];
    for (let tt = 0; tt <= WINDOW; tt += 4) {
      const f = irregular ? 0.035 * Math.sin((2 * Math.PI * tt) / 163) + 0.025 * Math.sin((2 * Math.PI * tt) / 127 + 1) : 0;
      pts.push([xOfT(tt, 0), BASE - (trainValue(shape, tt, onsets) + f) * 10 * MM]);
    }
    return { peaks: onsets.map((o) => o + R_OFFSET), t0: 0, t1: WINDOW, d: polyline(pts) };
  }, [ecg, hr, irregular]);

  const src = (real ?? schematic)!;
  const inWin = src.peaks.filter((p) => p >= src.t0 && p < src.t0 + WINDOW);
  const pairs = Math.max(0, inWin.length - 1);
  const k = Math.min(pairSel, Math.max(0, pairs - 1));
  const rA = inWin[k];
  const rB = inWin[k + 1];
  const rr = rA != null && rB != null ? rB - rA : null;
  const irr = rrIrregularity(src.peaks) > 0.16;
  const mean = meanRate(src.peaks);
  const n6 = countIn6s(src.peaks, src.t0);

  let arithmetic = '';
  if (method === '6s') arithmetic = tf('rr6s', { n: n6, bpm: rate6s(n6) });
  else if (rr == null) arithmetic = tf('rrNeedTwo');
  else if (method === '1500') {
    const sq = rr / 40;
    arithmetic = tf('rr1500', { n: fmt(sq, 1), bpm: fmt(rate1500(sq), 0) });
  } else {
    const L = rr / 200;
    const lbl = seq300Label(Math.round(L * 10) / 10);
    const br = seq300Bracket(L);
    arithmetic =
      lbl != null
        ? tf('rr300exact', { n: fmt(L, 0), bpm: lbl })
        : br
          ? tf('rr300between', { n: fmt(L, 1), a: br[0], b: br[1], bpm: fmt(rate300(L), 0) })
          : tf('rr300out', { n: fmt(L, 1), bpm: fmt(rate300(L), 0) });
  }

  const x = (t: number) => xOfT(t, src.t0);

  return (
    <FigureFrame
      id="rate-ruler"
      title={tf('rrTitle')}
      wide
      controls={
        <>
          <Toggle
            label={tf('rrMethod')}
            value={method}
            onChange={setMethod}
            options={[
              { value: '300' as Method, label: tf('rrM300') },
              { value: '1500' as Method, label: tf('rrM1500') },
              { value: '6s' as Method, label: tf('rrM6s') },
            ]}
          />
          {method !== '6s' && (
            <span class="fg-btn-group" role="group" aria-label={tf('rrPair')}>
              <button type="button" class="fg-btn" disabled={k <= 0} onClick={() => setPairSel(Math.max(0, k - 1))}>
                ‹ {tf('rrPrev')}
              </button>
              <button type="button" class="fg-btn" disabled={k >= pairs - 1} onClick={() => setPairSel(Math.min(pairs - 1, k + 1))}>
                {tf('rrNext')} ›
              </button>
            </span>
          )}
          {!ecg && (
            <>
              <Slider id={`${uid}-hr`} label={tf('rrRateDial')} value={hr} min={30} max={200} onInput={setHr} display={`${hr} ${tf('perMin')}`} />
              <Check id={`${uid}-irr`} label={tf('rrIrregular')} checked={irregular} onChange={setIrregular} />
            </>
          )}
        </>
      }
      footer={
        <div class="fg-readout fg-readout--col" aria-live="polite">
          {/* the arithmetic changes with the rate dial and the R–R chosen: its box fits the widest wording of every method */}
          <Reserve block class="fg-arith tabular" reserve={ARITH_SAMPLES()}>
            {arithmetic}
          </Reserve>
          <Reserve block class={`fg-warnline ${irr && method !== '6s' ? 'is-on' : ''}`} reserve={[tf('rrIrregularWarn')]}>
            {irr && method !== '6s' ? tf('rrIrregularWarn') : ' '}
          </Reserve>
          <div class="fg-muted tabular">{mean != null ? tf('rrMean', { bpm: fmt(mean, 0) }) : ' '}</div>
        </div>
      }
      caption={tf('rrCaption')}
    >
      <Svg w={W} h={H} label={tf('rrAria')}>
        <defs>
          <clipPath id={`${uid}-clip`}>
            <rect x={PX} y={PY} width={PW} height={PH} />
          </clipPath>
        </defs>
        <PaperGrid x={PX} y={PY} w={PW} h={PH} mm={MM} />
        {method === '6s' && <rect x={PX} y={PY} width={PW} height={PH} class="fg-window" />}
        <path d={src.d} class="fg-trace" clip-path={`url(#${uid}-clip)`} />
        {/* 3-second ticks (as printed on paper) */}
        {[0, 3000, 6000].map((t) => (
          <path d={`M${x(src.t0 + t)} ${PY + PH}V${PY + PH + 8}`} class="fg-tick" />
        ))}
        <text x={PX} y={PY + PH + 20} class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '10px' }}>
          {tf('rrSpeedNote')}
        </text>

        {method === '300' && rA != null && (
          <g>
            {SEQ_300.map((v, j) => {
              const t = rA + (j + 1) * 200;
              if (x(t) > PX + PW) return null;
              // highlight the label the next R lands on, or the two that bracket it
              const L = rr != null ? rr / 200 : 0;
              const n = j + 1;
              const hit = rr != null && (Math.abs(L - Math.round(L)) < 0.05 ? n === Math.round(L) : n === Math.floor(L) || n === Math.ceil(L));
              return (
                <g>
                  <path d={`M${x(t)} ${PY - 6}V${PY + PH}`} class="fg-ruler" />
                  <text x={x(t)} y={PY - 10} text-anchor="middle" class={`fg-svg-text fg-svg-text--ruler tabular ${hit ? 'is-hit' : ''}`}>
                    {v}
                  </text>
                </g>
              );
            })}
            <path d={`M${x(rA)} ${PY - 22}V${PY + PH}`} class="fg-ruler fg-ruler--anchor" />
            <text x={x(rA)} y={PY - 26} text-anchor="middle" class="fg-svg-text fg-svg-text--ruler">
              R
            </text>
            {rB != null && <path d={`M${x(rB) - 6} ${PY - 9}L${x(rB) + 6} ${PY - 9}L${x(rB)} ${PY - 1}Z`} class="fg-rmark" />}
          </g>
        )}

        {method === '1500' && rA != null && rB != null && (
          <g class="fg-bracket">
            <path d={`M${x(rA)} ${PY - 4}V${PY - 18}M${x(rB)} ${PY - 4}V${PY - 18}M${x(rA)} ${PY - 11}H${x(rB)}`} />
            <text x={(x(rA) + x(rB)) / 2} y={PY - 22} text-anchor="middle" class="fg-svg-text fg-svg-text--ruler tabular">
              {tf('rrSmallSq', { n: fmt((rB - rA) / 40, 1) })}
            </text>
          </g>
        )}

        {method === '6s' &&
          src.peaks
            .filter((p) => p >= src.t0 && p < src.t0 + WINDOW)
            .map((p, i) => (
              <g>
                <circle cx={x(p)} cy={PY - 14} r={8} class="fg-count" />
                <text x={x(p)} y={PY - 14} text-anchor="middle" dominant-baseline="central" class="fg-svg-text fg-count__n" style={{ fontSize: '9.5px' }}>
                  {i + 1}
                </text>
              </g>
            ))}
      </Svg>
    </FigureFrame>
  );
}
