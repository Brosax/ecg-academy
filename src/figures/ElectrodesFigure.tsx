/**
 * Electrode placement on a torso (front view; back view for V7–V9): limb electrodes, V1–V6 at their landmarks
 * (4th ICS sternal borders, V4 5th ICS midclavicular, V5 anterior axillary, V6 mid-axillary at V4 level) and the
 * optional right-sided (V3R, V4R) and posterior (V7–V9) leads. Selecting an electrode shows its landmark and the leads
 * it belongs to; `highlight` emphasises electrodes chosen by a lesson.
 */
import { useState } from 'preact/hooks';
import type { FigureParams } from './api';
import { lt } from '../i18n/index';
import { tf } from '../i18n/figures';
import { BACK, ELECTRODE_TIP, ELECTRODES, icsY, LINES, MIDLINE, type ElectrodeDef, type ElectrodeId } from './data/electrodes';
import { polyline } from './math/geom';
import { Check, FigureFrame, Svg, useUid } from './shared';

const FRONT_W = 420;
const BACK_W = 230;
const H = 520;
const BACK_X = 418;
const BACK_Y = 70;
const BACK_S = 0.62;

const TORSO =
  'M186 40C186 62 170 70 140 74L96 82C84 86 86 120 90 135C92 170 88 210 90 240C96 300 112 340 112 380C112 410 104 430 102 448' +
  'L318 448C316 430 308 410 308 380C308 340 324 300 330 240C332 210 328 170 330 135C334 120 336 86 324 82L280 74C250 70 234 62 234 40Z';
const ARM_R = 'M96 84C78 88 68 104 68 128L58 222L38 326L56 332L76 230L92 150Z';
const ARM_L = 'M324 84C342 88 352 104 352 128L362 222L382 326L364 332L344 230L328 150Z';
const LEG_R = 'M104 448C106 474 112 496 116 518L202 518L208 448Z';
const LEG_L = 'M316 448C314 474 308 496 304 518L218 518L212 448Z';
const STERNUM = 'M198 92L222 92L224 138L228 142L228 258L210 274L192 258L192 142L196 138Z';
const HEART = 'M196 178C230 160 282 172 298 200C314 228 302 262 270 270C246 276 214 262 200 240C190 222 186 198 196 178Z';
const CLAV_R = 'M200 90C170 85 130 80 98 85';
const CLAV_L = 'M220 90C250 85 290 80 322 85';

/** Which leads use each electrode. */
const LEAD_USE: Record<ElectrodeId, string> = {
  RA: 'I (−) · II (−) · aVR (+)',
  LA: 'I (+) · III (−) · aVL (+)',
  LL: 'II (+) · III (+) · aVF (+)',
  RL: '—',
  V1: 'V1 (+)',
  V2: 'V2 (+)',
  V3: 'V3 (+)',
  V4: 'V4 (+)',
  V5: 'V5 (+)',
  V6: 'V6 (+)',
  V3R: 'V3R (+)',
  V4R: 'V4R (+)',
  V7: 'V7 (+)',
  V8: 'V8 (+)',
  V9: 'V9 (+)',
};

function backPt(x: number, y: number): [number, number] {
  return [BACK_X + (x - (MIDLINE - 105)) * BACK_S, BACK_Y + y * BACK_S];
}

export function ElectrodesFigure(props: { readonly params?: FigureParams['electrodes'] }) {
  const highlight = new Set(props.params?.highlight ?? []);
  const [showExtra, setShowExtra] = useState(props.params?.showExtra ?? [...highlight].some((h) => ['V3R', 'V4R', 'V7', 'V8', 'V9'].includes(h)));
  const [sel, setSel] = useState<ElectrodeId | null>(null);
  const uid = useUid('el');
  const W = showExtra ? FRONT_W + BACK_W : FRONT_W;

  const visible = (e: ElectrodeDef) => e.group === 'limb' || e.group === 'chest' || showExtra;
  const list = Object.values(ELECTRODES).filter(visible);

  const ribLines: string[] = [];
  for (const n of [2, 3, 4, 5, 6] as const) {
    const right: Array<[number, number]> = [];
    const left: Array<[number, number]> = [];
    for (let x = 230; x <= 318; x += 4) right.push([x, icsY(n, x)]);
    for (let x = 190; x >= 102; x -= 4) left.push([x, icsY(n, x)]);
    ribLines.push(polyline(right), polyline(left));
  }

  const selDef = sel ? ELECTRODES[sel] : null;

  const electrode = (e: ElectrodeDef) => {
    const [x, y] = e.view === 'front' ? [e.x, e.y] : backPt(e.x, e.y);
    const on = sel === e.id;
    const hi = highlight.has(e.id);
    const small = e.id.length > 2;
    return (
      <g
        key={e.id}
        class={`fg-el fg-el--${e.group} ${on ? 'is-sel' : ''} ${hi ? 'is-hi' : ''}`}
        transform={`translate(${x} ${y})`}
        tabIndex={0}
        role="button"
        aria-pressed={on}
        aria-label={`${e.id}: ${lt(e.where)}`}
        onClick={() => setSel(on ? null : e.id)}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            setSel(on ? null : e.id);
          }
        }}
      >
        {hi && <circle r={15} class="fg-el__pulse" />}
        <circle r={9.5} class="fg-el__dot" />
        <text class="fg-el__label" text-anchor="middle" dominant-baseline="central" style={{ fontSize: small ? '6.5px' : '8px' }}>
          {e.id}
        </text>
      </g>
    );
  };

  return (
    <FigureFrame
      id="electrodes"
      title={tf('elTitle')}
      controls={<Check id={`${uid}-extra`} label={tf('elShowExtra')} checked={showExtra} onChange={setShowExtra} />}
      footer={
        <div class="fg-info" aria-live="polite">
          {selDef ? (
            <>
              <div class="fg-info__title">
                <span class={`fg-chip fg-chip--${selDef.group}`}>{selDef.id}</span> {tf(`elGroup_${selDef.group}`)}
              </div>
              <div>{lt(selDef.where)}</div>
              <div class="fg-info__sub">
                {tf('elLeads')}: <span class="tabular">{LEAD_USE[selDef.id]}</span>
                {selDef.group !== 'limb' && <> · {tf('elWct')}</>}
              </div>
            </>
          ) : (
            <>
              <div class="fg-info__title">{tf('elPick')}</div>
              <div>{lt(ELECTRODE_TIP)}</div>
            </>
          )}
        </div>
      }
      caption={tf('elCaption')}
    >
      <Svg w={W} h={H} label={tf('elAria')} role="group" maxWidth={W * 1.25}>
        {/* front view */}
        <g aria-hidden="true">
          <path d={ARM_R} class="fg-body" />
          <path d={ARM_L} class="fg-body" />
          <path d={LEG_R} class="fg-body" />
          <path d={LEG_L} class="fg-body" />
          <path d={TORSO} class="fg-body" />
          <path d={HEART} class="fg-heart-shadow" />
          <path d={CLAV_R} class="fg-bone" />
          <path d={CLAV_L} class="fg-bone" />
          <path d={STERNUM} class="fg-bone fg-bone--fill" />
          {ribLines.map((d) => (
            <path d={d} class="fg-rib" />
          ))}
          {/* sternal angle */}
          <path d="M186 140H234" class="fg-landmark" />
          <text x={238} y={136} class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '9px' }}>
            {tf('elSternalAngle')}
          </text>
          {/* ICS numbers (patient's right side) */}
          {([2, 3, 4, 5, 6] as const).map((n) => (
            <text x={104} y={icsY(n, 104) + 3} class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '9px' }}>
              {tf('elIcs', { n })}
            </text>
          ))}
          {/* vertical reference lines */}
          {(
            [
              ['mclR', LINES.mclR, 'elMcl'],
              ['mclL', LINES.mclL, 'elMcl'],
              ['aalL', LINES.aalL, 'elAal'],
              ['malL', LINES.malL, 'elMal'],
            ] as const
          ).map(([k, x, label]) => (
            <g key={k}>
              <path d={`M${x} ${k === 'malL' ? 150 : 104}V${296}`} class="fg-refline" />
              <text x={x} y={k === 'malL' ? 324 : 308} text-anchor="middle" class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '8.5px' }}>
                {tf(label)}
              </text>
            </g>
          ))}
          <text x={18} y={30} class="fg-svg-text fg-svg-text--strong" style={{ fontSize: '13px' }}>
            {tf('sideR')}
          </text>
          <text x={FRONT_W - 30} y={30} class="fg-svg-text fg-svg-text--strong" style={{ fontSize: '13px' }}>
            {tf('sideL')}
          </text>
          <text x={MIDLINE} y={510} text-anchor="middle" class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '10px' }}>
            {tf('elFront')}
          </text>
        </g>

        {/* back view */}
        {showExtra && (
          <g aria-hidden="true">
            <g transform={`translate(${BACK_X - (MIDLINE - 105) * BACK_S} ${BACK_Y}) scale(${BACK_S})`}>
              <path d={ARM_R} class="fg-body" />
              <path d={ARM_L} class="fg-body" />
              <path d={TORSO} class="fg-body" />
              <path d="M210 60V440" class="fg-bone" />
              <path d="M112 110L178 104L148 200Z" class="fg-bone fg-bone--fill" />
              <path d="M308 110L242 104L272 200Z" class="fg-bone fg-bone--fill" />
              <path d={`M${BACK.pal} 150V300M${BACK.scap} 150V300M${BACK.para} 150V300`} class="fg-refline" />
            </g>
            <text x={backPt(MIDLINE, 0)[0]} y={H - 10} text-anchor="middle" class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '10px' }}>
              {tf('elBack')}
            </text>
            <text x={backPt(BACK.pal, 0)[0] - 4} y={backPt(0, 130)[1]} text-anchor="middle" class="fg-svg-text fg-svg-text--strong" style={{ fontSize: '12px' }}>
              {tf('sideL')}
            </text>
            <text x={backPt(MIDLINE * 2 - BACK.pal, 0)[0] + 4} y={backPt(0, 130)[1]} text-anchor="middle" class="fg-svg-text fg-svg-text--strong" style={{ fontSize: '12px' }}>
              {tf('sideR')}
            </text>
          </g>
        )}

        {list.map(electrode)}
      </Svg>
    </FigureFrame>
  );
}
