/**
 * Axis calculator: net QRS in I and aVF (entered, or read from the ECG as the net area of the dominant QRS) → quadrant
 * → lead II check → angle, with the isoelectric-lead hint and the vector drawn as the sum of its I and aVF components.
 */
import { useMemo, useState } from 'preact/hooks';
import type { Ecg } from '../core/ecg';
import { tf } from '../i18n/figures';
import { AVF_SCALE, axisFromNets, isoelectricHint, limbNetAreas, mostIsoelectricLead, qrsWindows, quickAngle, type Quadrant } from './math/axis';
import { LIMB_ANGLE_DEG, LIMB_LEADS } from '../core/leads';
import { angleDiff } from './math/geom';
import { detectRPeaks } from './math/rate';
import { ArrowDefs, DegReserve, FigureFrame, fmt, fmtDeg, fmtSigned, Reserve, Slider, Svg, Toggle, useUid } from './shared';
import { AXIS_CLASSES, AxisPill, HexWheel, SectorLegend } from './wheel';

const W = 360;
const H = 360;
const C = 180;
const R = 118;

type Mode = 'manual' | 'ecg';

function useEcgNets(ecg: Ecg | undefined) {
  return useMemo(() => {
    if (!ecg) return null;
    const sig = ecg.signal;
    const beats = ecg.truth?.beats ?? null;
    const peaks = beats && beats.length ? [] : detectRPeaks(sig.leads.II, sig.fs);
    const windows = qrsWindows(beats, peaks).filter(([a, b]) => a >= 40 && b <= sig.durationMs - 10);
    if (!windows.length) return null;
    return limbNetAreas(sig, windows);
  }, [ecg]);
}

const SIGNS = ['Pos', 'Neg', 'Zero'] as const;
const QUADRANTS = ['normal', 'left', 'right', 'extreme', 'indeterminate'] as const satisfies readonly Quadrant[];

/** Every wording of the isoelectric-lead step (each limb lead, either of its two perpendiculars). */
const ISO_WORDINGS = () =>
  LIMB_LEADS.flatMap((lead) => {
    const a = fmtDeg(angleDiff(LIMB_ANGLE_DEG[lead] + 90, 0));
    const b = fmtDeg(angleDiff(LIMB_ANGLE_DEG[lead] - 90, 0));
    return [
      { lead, a, b, c: a },
      { lead, a, b, c: b },
    ];
  });

/** Quadrant, then the lead II check: worked out in the left quadrant, otherwise a muted note saying when it applies. */
function QuadrantStep(props: { readonly quadrant: Quadrant; readonly check?: string }) {
  return (
    <>
      {tf('acQuadrant')} <b>{tf(`quad_${props.quadrant}`)}</b>
      {props.check != null ? <div>{props.check}</div> : <div class="fg-muted">{tf('acIINa')}</div>}
    </>
  );
}

function AngleStep(props: { readonly f: string; readonly i: string; readonly deg: number; readonly quick: number | null }) {
  return (
    <>
      {tf('acAngle', { f: props.f, i: props.i })} <b class="tabular">{fmtDeg(props.deg)}</b>
      {props.quick != null && <span class="fg-muted"> · {tf('acQuick', { deg: fmtDeg(props.quick) })}</span>}
    </>
  );
}

export function AxisCalculatorFigure(props: { readonly ecg?: Ecg }) {
  const nets = useEcgNets(props.ecg);
  const [mode, setMode] = useState<Mode>(nets ? 'ecg' : 'manual');
  const [mI, setMI] = useState(8);
  const [mF, setMF] = useState(4);
  const uid = useUid('ac');

  const fromEcg = mode === 'ecg' && nets != null;
  const netI = fromEcg ? nets.I : mI;
  const netF = fromEcg ? nets.aVF : mF;
  const res = axisFromNets(netI, netF);
  const digits = fromEcg ? 0 : 1;
  const unitLabel = fromEcg ? tf('unitArea') : tf('unitMm');

  // component arrows on the wheel, scaled so that the resultant fits inside the wheel
  const pI = netI;
  const pF = netF * AVF_SCALE;
  const m = Math.max(Math.hypot(pI, pF), 1e-9);
  const k = (R * 0.82) / m;
  const tipX = C + pI * k;
  const tipY = C + pF * k;

  const iso = res.deg == null ? null : fromEcg ? mostIsoelectricLead(nets) : isoelectricHint(res.deg).lead;
  const isoCand = iso ? ([angleDiff(LIMB_ANGLE_DEG[iso] + 90, 0), angleDiff(LIMB_ANGLE_DEG[iso] - 90, 0)] as const) : null;
  const isoChosen = isoCand && res.deg != null ? (Math.abs(angleDiff(res.deg, isoCand[0])) <= Math.abs(angleDiff(res.deg, isoCand[1])) ? isoCand[0] : isoCand[1]) : null;
  const sign = (v: number) => (Math.abs(v) < 1e-9 ? 'Zero' : v > 0 ? 'Pos' : 'Neg');
  const q = res.deg == null ? null : quickAngle(netI, netF);
  /** the widest number the steps can show (manual: one decimal; ECG areas: whole mV·ms) */
  const wide = fromEcg ? fmt(-888, 0) : fmt(-88.8, 1);

  return (
    <FigureFrame
      id="axis-calculator"
      title={tf('acTitle')}
      controls={
        nets ? (
          <Toggle
            label={tf('acSource')}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'manual' as Mode, label: tf('acManual') },
              { value: 'ecg' as Mode, label: tf('acFromEcg') },
            ]}
          />
        ) : undefined
      }
      caption={tf('acCaption')}
    >
      <div class="fg-split">
        <div class="fg-split__side">
          {fromEcg ? (
            <div class="fg-measured">
              <div>
                {tf('acNetI')}: <b class="tabular">{fmtSigned(netI, 0)}</b> {unitLabel}
              </div>
              <div>
                {tf('acNetAvf')}: <b class="tabular">{fmtSigned(netF, 0)}</b> {unitLabel}
              </div>
              <div class="fg-muted">{tf('acEcgNote')}</div>
            </div>
          ) : (
            <>
              <Slider id={`${uid}-i`} label={tf('acNetI')} value={mI} min={-15} max={15} step={0.5} onInput={setMI} display={`${fmtSigned(mI, 1)} mm`} />
              <Slider id={`${uid}-f`} label={tf('acNetAvf')} value={mF} min={-15} max={15} step={0.5} onInput={setMF} display={`${fmtSigned(mF, 1)} mm`} />
              <div class="fg-muted">{tf('acNetHint')}</div>
            </>
          )}
          {/*
            The steps change wording with every slider move: each one reserves the box of its longest wording
            (Reserve), and the angle / isoelectric steps keep their place while the axis is indeterminate.
          */}
          <ol class="fg-steps" aria-live="polite">
            <li>
              <Reserve block reserve={SIGNS.map((x) => tf(`acI${x}`))}>
                {tf(`acI${sign(netI)}`)}
              </Reserve>
            </li>
            <li>
              <Reserve block reserve={SIGNS.map((x) => tf(`acF${x}`))}>
                {tf(`acF${sign(netF)}`)}
              </Reserve>
            </li>
            <li>
              <Reserve
                block
                reserve={[
                  ...QUADRANTS.map((x) => <QuadrantStep quadrant={x} />),
                  <QuadrantStep quadrant="left" check={tf('acIIPos', { v: wide })} />,
                  <QuadrantStep quadrant="left" check={tf('acIINeg', { v: wide })} />,
                ]}
              >
                <QuadrantStep
                  quadrant={res.quadrant}
                  check={res.quadrant === 'left' ? tf(res.netII >= 0 ? 'acIIPos' : 'acIINeg', { v: fmtSigned(res.netII, digits) }) : undefined}
                />
              </Reserve>
            </li>
            <li class={res.deg == null ? 'fg-steps__idle' : undefined} aria-hidden={res.deg == null ? 'true' : undefined}>
              <Reserve block reserve={[<AngleStep f={wide} i={wide} deg={-150} quick={-150} />]}>
                {res.deg != null && <AngleStep f={fmt(netF, digits)} i={fmt(netI, digits)} deg={res.deg} quick={q} />}
              </Reserve>
            </li>
            <li class={iso == null ? 'fg-steps__idle' : undefined} aria-hidden={iso == null ? 'true' : undefined}>
              <Reserve block reserve={ISO_WORDINGS().map((w) => tf('acIso', w))}>
                {iso && isoCand && isoChosen != null && tf('acIso', { lead: iso, a: fmtDeg(isoCand[0]), b: fmtDeg(isoCand[1]), c: fmtDeg(isoChosen) })}
              </Reserve>
            </li>
          </ol>
        </div>
        <div class="fg-split__main">
          <Svg w={W} h={H} label={tf('acAria', { deg: res.deg == null ? '—' : fmtDeg(res.deg) })}>
            <ArrowDefs id={uid} kinds={['vector', 'lead', 'lead2']} />
            <HexWheel cx={C} cy={C} r={R} sectors activeClass={res.cls} isoLead={iso} fontSize={12} />
            {/* components */}
            <path d={`M${C} ${C}L${tipX} ${C}`} class="fg-comp fg-comp--i" marker-end={Math.abs(pI) > 1e-6 ? `url(#${uid}-lead)` : undefined} />
            <path d={`M${tipX} ${C}L${tipX} ${tipY}`} class="fg-comp fg-comp--f" marker-end={Math.abs(pF) > 1e-6 ? `url(#${uid}-lead2)` : undefined} />
            {res.deg != null && <path d={`M${C} ${C}L${tipX} ${tipY}`} class="fg-vector" marker-end={`url(#${uid}-vector)`} />}
            <circle cx={C} cy={C} r={3.5} class="fg-vector-origin" />
          </Svg>
          <div class="fg-readout fg-readout--center" aria-live="polite">
            <span>
              {tf('axisLabel')} <DegReserve deg={res.deg} />
            </span>
            <Reserve reserve={AXIS_CLASSES.map((k) => <AxisPill cls={k} />)}>{res.cls && <AxisPill cls={res.cls} />}</Reserve>
          </div>
          <SectorLegend active={res.cls} />
        </div>
      </div>
    </FigureFrame>
  );
}
