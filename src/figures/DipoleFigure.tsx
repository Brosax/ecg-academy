/**
 * Why a deflection is positive, negative or biphasic: a depolarization (or repolarization) front crosses a strip of
 * tissue while four electrodes record it. Plays once (replayable, scrubbable); the maths is in math/dipole.ts.
 */
import { useMemo, useRef, useState } from 'preact/hooks';
import type { FigureParams } from './api';
import { tf } from '../i18n/figures';
import { classifyDeflection, DIPOLE_ELECTRODES, dipoleScale, dipoleTrace, electrodeBearing, paddedTrace, type DipoleMode, type Electrode } from './math/dipole';
import { unit } from './math/geom';
import { ArrowDefs, FigureFrame, MiniTrace, ReplayButton, Reserve, Slider, Svg, Toggle, usePlayOnce, useUid } from './shared';

const W = 760;
const H = 380;
const SX = 220; // strip start (screen)
const SL = 300; // strip length (screen)
const SY = 160; // strip centre line
const STRIP_H = 34;
const N = 121;
const PAD = 24;

const sx = (x: number) => SX + x * SL;
/** every wording of the info box (rule while the front moves, conclusion when it is done), to reserve its height */
const DIPOLE_TEXTS = ['dpRuleDepol', 'dpRuleRepol', 'dpDoneDepol', 'dpDoneRepol'] as const;
/** Screen position of an electrode: same bearing from the strip's centre as in the model, drawn closer (not to scale). */
function electrodeXY(e: Electrode): [number, number] {
  const [ux, uy] = unit(electrodeBearing(e));
  const r = Math.abs(uy) > 0.5 ? 128 : 290;
  return [sx(0.5) + r * ux, SY + r * uy];
}

export function DipoleFigure(props: { readonly params?: FigureParams['dipole'] }) {
  const [mode, setMode] = useState<DipoleMode>('depolarization');
  const wrapRef = useRef<HTMLDivElement>(null);
  const anim = usePlayOnce(3200, props.params?.autoplay ?? true, wrapRef);
  const uid = useUid('dp');
  const p = anim.p;
  const depol = mode === 'depolarization';

  const scale = useMemo(() => dipoleScale(), []);
  const traces = useMemo(() => DIPOLE_ELECTRODES.map((e) => dipoleTrace(e, N, mode)), [mode]);
  const shown = useMemo(() => DIPOLE_ELECTRODES.map((e) => paddedTrace(e, N, mode, PAD)), [mode]);
  // visible part of the padded trace: the baseline before the front, then up to the front, then the tail once done
  const upto = p >= 1 ? 1 : (PAD + p * (N - 1)) / (N + 2 * PAD - 1);

  const signs: Array<{ x: number; s: string }> = [];
  for (let x = 0.03; x < 1; x += 0.07) {
    const behind = x < p;
    const neg = depol ? behind : !behind;
    signs.push({ x, s: neg ? '−' : '+' });
  }

  const cellW = 172;
  const cellY = 262;
  const desc = (id: Electrode['id']) => tf(`dpEl_${id}`);

  return (
    <FigureFrame
      id="dipole"
      title={tf('dpTitle')}
      wide
      controls={
        <>
          <Toggle
            label={tf('dpMode')}
            value={mode}
            onChange={(m) => {
              setMode(m);
              anim.replay();
            }}
            options={[
              { value: 'depolarization' as DipoleMode, label: tf('dpDepol') },
              { value: 'repolarization' as DipoleMode, label: tf('dpRepol') },
            ]}
          />
          <ReplayButton onClick={anim.replay} />
          <Slider id={`${uid}-p`} label={tf('dpFront')} value={Math.round(p * 100)} min={0} max={100} onInput={(v) => anim.seek(v / 100)} display={`${Math.round(p * 100)} %`} />
        </>
      }
      footer={
        <div class="fg-info" aria-live="polite">
          <Reserve block reserve={DIPOLE_TEXTS.map((k) => tf(k))}>
            {p >= 1 ? tf(depol ? 'dpDoneDepol' : 'dpDoneRepol') : tf(depol ? 'dpRuleDepol' : 'dpRuleRepol')}
          </Reserve>
        </div>
      }
      caption={tf('dpCaption')}
    >
      <div ref={wrapRef}>
        <Svg w={W} h={H} label={tf('dpAria')}>
          <ArrowDefs id={uid} kinds={['vector']} />
          {/* tissue */}
          <rect x={sx(0)} y={SY - STRIP_H / 2} width={SL} height={STRIP_H} rx={6} class="fg-tissue" />
          <rect
            x={depol ? sx(0) : sx(p)}
            y={SY - STRIP_H / 2}
            width={Math.max(0, depol ? SL * p : SL * (1 - p))}
            height={STRIP_H}
            rx={6}
            class="fg-tissue fg-tissue--active"
          />
          {signs.map((g) => (
            <g aria-hidden="true">
              <text x={sx(g.x)} y={SY - STRIP_H / 2 - 5} text-anchor="middle" class={`fg-charge ${g.s === '+' ? 'is-pos' : 'is-neg'}`}>
                {g.s}
              </text>
              <text x={sx(g.x)} y={SY + STRIP_H / 2 + 14} text-anchor="middle" class={`fg-charge ${g.s === '+' ? 'is-pos' : 'is-neg'}`}>
                {g.s}
              </text>
            </g>
          ))}
          {/* the front and its dipole */}
          {p > 0 && p < 1 && (
            <g>
              <path d={`M${sx(p)} ${SY - STRIP_H / 2 - 2}V${SY + STRIP_H / 2 + 2}`} class="fg-front" />
              <path d={depol ? `M${sx(p) - 26} ${SY}L${sx(p) + 30} ${SY}` : `M${sx(p) + 26} ${SY}L${sx(p) - 30} ${SY}`} class="fg-vector" marker-end={`url(#${uid}-vector)`} />
            </g>
          )}
          <text x={sx(0)} y={SY + STRIP_H / 2 + 34} class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '10.5px' }}>
            {tf('dpTravel')} →
          </text>
          {/* electrodes (drawn closer than in the model, same directions) */}
          {DIPOLE_ELECTRODES.map((e) => {
            const [ex, ey] = electrodeXY(e);
            return (
              <g>
                <path d={`M${ex} ${ey}L${sx(0.5)} ${SY}`} class="fg-leader" />
                <circle cx={ex} cy={ey} r={13} class="fg-el__dot fg-el--probe" />
                <text x={ex} y={ey} text-anchor="middle" dominant-baseline="central" class="fg-el__label">
                  {e.id}
                </text>
              </g>
            );
          })}
          {/* traces */}
          {DIPOLE_ELECTRODES.map((e, i) => {
            const x = 18 + i * (cellW + 12);
            const shape = classifyDeflection(traces[i]);
            return (
              <g>
                <rect x={x} y={cellY} width={cellW} height={104} rx={8} class="fg-cell__bg" />
                <text x={x + 10} y={cellY + 18} class="fg-svg-text fg-svg-text--strong">
                  {e.id}
                </text>
                <text x={x + 26} y={cellY + 18} class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '10.5px' }}>
                  {desc(e.id)}
                </text>
                <path d={`M${x + 10} ${cellY + 62}H${x + cellW - 10}`} class="fg-baseline" />
                <MiniTrace values={shown[i]} x={x + 12} y={cellY + 62} w={cellW - 24} scale={34 / scale} upto={upto} class="fg-trace fg-trace--qrs" />
                <text x={x + cellW - 10} y={cellY + 96} text-anchor="end" class={`fg-svg-text fg-defl fg-defl--${shape.startsWith('bi') ? 'equiphasic' : shape}`} style={{ fontSize: '11px', opacity: p >= 1 ? 1 : 0 }}>
                  {tf(`dpShape_${shape}`)}
                </text>
              </g>
            );
          })}
        </Svg>
      </div>
    </FigureFrame>
  );
}
