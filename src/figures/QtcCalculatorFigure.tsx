/**
 * QTc calculator: QT and RR (or heart rate) → Bazett, Fridericia, Framingham and Hodges with the formulas and the
 * arithmetic, a scale of the interpretation limits by sex, and the rate caveat. Limits and sources: math/qtc.ts.
 */
import { useState } from 'preact/hooks';
import type { Ecg } from '../core/ecg';
import { tf } from '../i18n/figures';
import { allQtc, hrFromRr, interpretQtc, QTC_LIMITS, QTC_METHODS, rateCaveat, rrFromHr, type QtcLevel, type QtcMethod, type Sex } from './math/qtc';
import { FigureFrame, fmt, NumberField, Reserve, Slider, Svg, Toggle, useUid } from './shared';

type RateMode = 'rr' | 'hr';

const SCALE = { lo: 300, hi: 600 } as const;
const SW = 640;
const SH = 92;
const PAD = 20;
const xOf = (ms: number) => PAD + ((Math.min(SCALE.hi, Math.max(SCALE.lo, ms)) - SCALE.lo) / (SCALE.hi - SCALE.lo)) * (SW - 2 * PAD);

const LETTER: Record<QtcMethod, string> = { bazett: 'B', fridericia: 'F', framingham: 'Fr', hodges: 'H' };
const QTC_LEVELS = ['very-short', 'short', 'normal', 'prolonged', 'lqts', 'high-risk'] as const satisfies readonly QtcLevel[];

/** R–R range of the inputs (ms): 30–200 /min. */
const RR_RANGE = { min: 300, max: 2000 } as const;

/** The arithmetic of one formula written out (QT and RR in ms; RR in seconds and HR in /min inside the formulas). */
function working(m: QtcMethod, qt: number, rr: number): string {
  const rrS = rr / 1000;
  const hr = hrFromRr(rr);
  switch (m) {
    case 'bazett':
      return `${qt} / √${fmt(rrS, 3)} = ${qt} / ${fmt(Math.sqrt(rrS), 3)}`;
    case 'fridericia':
      return `${qt} / ∛${fmt(rrS, 3)} = ${qt} / ${fmt(Math.cbrt(rrS), 3)}`;
    case 'framingham':
      return `${qt} + 154 × (1 − ${fmt(rrS, 3)}) = ${qt} ${1 - rrS >= 0 ? '+' : '−'} ${fmt(Math.abs(154 * (1 - rrS)), 1)}`;
    case 'hodges':
      return `${qt} + ${fmt(1.75, 2)} × (${fmt(hr, 0)} − 60) = ${qt} ${hr - 60 >= 0 ? '+' : '−'} ${fmt(Math.abs(1.75 * (hr - 60)), 1)}`;
  }
}

export function QtcCalculatorFigure(props: { readonly ecg?: Ecg }) {
  const truth = props.ecg?.truth ?? null;
  const uid = useUid('qt');
  const [qt, setQt] = useState(Math.round(truth?.qtMs ?? 380));
  const [rr, setRr] = useState(Math.round(truth && truth.hrBpm > 0 ? rrFromHr(truth.hrBpm) : 750));
  const [mode, setMode] = useState<RateMode>('hr');
  const [sex, setSex] = useState<Sex>('male');

  const hr = hrFromRr(rr);
  const vals = allQtc(qt, rr);
  const caveat = rateCaveat(hr);

  const arithmetic = (m: QtcMethod) => working(m, qt, rr);
  const formula: Record<QtcMethod, string> = {
    bazett: 'QT / √RR',
    fridericia: 'QT / ∛RR',
    framingham: 'QT + 154 × (1 − RR)',
    hodges: `QT + ${fmt(1.75, 2)} × (${tf('hrAbbr')} − 60)`,
  };

  const prolonged = QTC_LIMITS.prolonged[sex];
  const zones: ReadonlyArray<readonly [number, number, QtcLevel]> = [
    [SCALE.lo, QTC_LIMITS.veryShort, 'very-short'],
    [QTC_LIMITS.veryShort, QTC_LIMITS.short, 'short'],
    [QTC_LIMITS.short, prolonged, 'normal'],
    [prolonged, QTC_LIMITS.lqts, 'prolonged'],
    [QTC_LIMITS.lqts, QTC_LIMITS.highRisk, 'lqts'],
    [QTC_LIMITS.highRisk, SCALE.hi, 'high-risk'],
  ];

  // marker labels spread horizontally so that close values stay readable (leaders point to the exact value)
  const order = QTC_METHODS.slice().sort((a, b) => vals[a] - vals[b]);
  const labelX: Partial<Record<QtcMethod, number>> = {};
  let prev = -Infinity;
  for (const m of order) {
    const lx = Math.max(xOf(vals[m]), prev + 24);
    labelX[m] = lx;
    prev = lx;
  }
  const overflow = prev - (SW - PAD);
  if (overflow > 0) for (const m of order) labelX[m] = (labelX[m] ?? 0) - overflow;

  return (
    <FigureFrame
      id="qtc-calculator"
      title={tf('qtTitle')}
      controls={
        <>
          <Toggle
            label={tf('qtSex')}
            value={sex}
            onChange={setSex}
            options={[
              { value: 'male' as Sex, label: tf('male') },
              { value: 'female' as Sex, label: tf('female') },
            ]}
          />
          <Toggle
            label={tf('qtRateInput')}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'hr' as RateMode, label: tf('qtHr') },
              { value: 'rr' as RateMode, label: tf('qtRr') },
            ]}
          />
        </>
      }
      caption={
        <>
          {truth && <span class="fg-note">{tf('qtFromEcg')} </span>}
          {tf('qtCaption')}
        </>
      }
    >
      <div class="fg-inputs">
        <Slider id={`${uid}-qt`} label={tf('qtQt')} value={qt} min={200} max={700} step={2} onInput={setQt} display={`${qt} ms`} />
        {mode === 'rr' ? (
          <Slider id={`${uid}-rr`} label={tf('qtRr')} value={rr} min={RR_RANGE.min} max={RR_RANGE.max} step={10} onInput={setRr} display={`${rr} ms · ${fmt(hr, 0)} ${tf('perMin')}`} displayReserve={[`${RR_RANGE.max} ms · 30 ${tf('perMin')}`, `${RR_RANGE.min} ms · 200 ${tf('perMin')}`]} />
        ) : (
          <Slider
            id={`${uid}-hr`}
            label={tf('qtHr')}
            value={Math.round(hr)}
            min={30}
            max={200}
            step={1}
            onInput={(v) => setRr(Math.round(rrFromHr(v)))}
            display={`${fmt(hr, 0)} ${tf('perMin')} · ${rr} ms`}
            displayReserve={[`200 ${tf('perMin')} · ${RR_RANGE.min} ms`, `30 ${tf('perMin')} · ${RR_RANGE.max} ms`]}
          />
        )}
        <NumberField id={`${uid}-qtn`} label={tf('qtExact')} value={qt} min={200} max={700} onChange={(v) => setQt(Math.round(v))} suffix="ms" />
      </div>

      <div class="fg-table-wrap">
      <table class="fg-table">
        <thead>
          <tr>
            <th scope="col">{tf('qtMethod')}</th>
            <th scope="col">{tf('qtFormula')}</th>
            <th scope="col" class="fg-hide-narrow">
              {tf('qtWorking')}
            </th>
            <th scope="col" class="fg-num-col">
              QTc
            </th>
            <th scope="col">{tf('qtLevel')}</th>
          </tr>
        </thead>
        <tbody>
          {QTC_METHODS.map((m) => {
            const lv = interpretQtc(vals[m], sex);
            return (
              <tr>
                <th scope="row">
                  <span class="fg-letter">{LETTER[m]}</span> {tf(`qt_${m}`)}
                </th>
                <td class="fg-formula">{formula[m]}</td>
                <td class="fg-formula fg-hide-narrow tabular">
                  {/* the working changes with every slider move: reserve its widest form (RR at both ends of the range) */}
                  <Reserve reserve={[working(m, 700, RR_RANGE.min), working(m, 700, RR_RANGE.max)]}>{arithmetic(m)}</Reserve>
                </td>
                <td class="fg-num-col tabular">
                  {/* up to four digits (e.g. Bazett at a fast rate with a long QT) */}
                  <Reserve
                    reserve={[
                      <>
                        <b>{fmt(8888, 0)}</b> ms
                      </>,
                    ]}
                  >
                    <b>{fmt(vals[m], 0)}</b> ms
                  </Reserve>
                </td>
                <td>
                  <Reserve reserve={QTC_LEVELS.map((x) => <span class="fg-pill">{tf(`qtLv_${x}`)}</span>)}>
                    <span class={`fg-pill fg-pill--q-${lv}`}>{tf(`qtLv_${lv}`)}</span>
                  </Reserve>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      <Svg w={SW} h={SH} label={tf('qtScaleAria')}>
        {zones.map(([a, b, lv]) => (
          <rect x={xOf(a)} y={40} width={Math.max(0, xOf(b) - xOf(a))} height={16} class={`fg-zone fg-zone--${lv}`} />
        ))}
        {[300, 340, 360, 400, 450, 460, 480, 500, 550, 600]
          .filter((v) => v !== (sex === 'male' ? 460 : 450) && v !== 340)
          .map((v) => (
            <g>
              <path d={`M${xOf(v)} 56V62`} class="fg-tick" />
              <text x={xOf(v)} y={74} text-anchor="middle" class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '10px' }}>
                {v}
              </text>
            </g>
          ))}
        <text x={SW - PAD} y={88} text-anchor="end" class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '9.5px' }}>
          QTc (ms)
        </text>
        {QTC_METHODS.map((m) => {
          const x = xOf(vals[m]);
          const lx = labelX[m] ?? x;
          return (
            <g class="fg-marker">
              <path d={`M${lx} ${24}L${x} ${36}V58`} />
              <text x={lx} y={20} text-anchor="middle" class="fg-svg-text fg-svg-text--strong" style={{ fontSize: '10px' }}>
                {LETTER[m]}
              </text>
            </g>
          );
        })}
      </Svg>

      <div class="fg-info fg-info--short" aria-live="polite">
        <Reserve block reserve={[tf('qtCaveatFast'), tf('qtCaveatSlow'), tf('qtCaveatNone')]}>
          {caveat ? tf(caveat === 'fast' ? 'qtCaveatFast' : 'qtCaveatSlow') : tf('qtCaveatNone')}
        </Reserve>
      </div>
    </FigureFrame>
  );
}
