/**
 * Conduction-system schematic (SA node → atria → AV node → His → bundle branches / fascicles → Purkinje → myocardium).
 * With an ECG it follows the shared cursor: the synthetic engine's region states when available, otherwise timing
 * derived from truth.beats / truth.atrial. Without an ECG it plays one schematic beat once (slow motion, replayable,
 * scrubbable). `block` shows the site of block and how activation reroutes, next to the matching surface complex.
 */
import { useMemo, useRef } from 'preact/hooks';
import type { Signal } from '@preact/signals';
import type { FigureParams } from './api';
import type { Ecg } from '../core/ecg';
import { tf } from '../i18n/figures';
import { beatValue, NORMAL_BEAT, type BeatShape } from './math/beat';
import { clamp, polyline } from './math/geom';
import { CONDUCTION_NODES, schematicTimeline, stateAt, statesFromRegions, timelineAt, type CondBlock, type CondNode, type NodeState } from './math/conduction';
import { FigureFrame, PaperGrid, ReplayButton, Reserve, Slider, Svg, SvgLabel, svgPoint, useCursor, usePlayOnce, useUid } from './shared';
import { leadPath } from './strip';

const W = 780;
const H = 380;

// ── schematic geometry (frontal view, patient's right on screen left) ──────────────────────────────────────────
const OUTLINE = 'M120 70C70 90 60 170 90 232C122 300 210 350 300 362C352 336 404 282 412 204C418 142 392 92 340 70C290 50 170 50 120 70Z';
const RA = 'M96 176C80 130 96 84 132 74C176 62 214 82 226 120C232 146 228 166 222 178Z';
const LA = 'M248 176C244 140 262 92 304 80C350 70 396 96 404 140C408 160 404 170 400 172Z';
const RV = 'M98 190L232 186L286 346C214 336 140 296 112 250C100 228 96 210 98 190Z';
const SEPTUM = 'M232 186L258 184L304 350L286 346Z';
const LV_ANT = 'M258 184L404 176C410 206 404 232 392 252L282 268Z';
const LV_POST = 'M282 268L392 252C374 300 342 336 304 350Z';
const PATHS: Partial<Record<CondNode, string>> = {
  atria: 'M124 84C150 120 196 150 226 172M124 84C170 92 220 100 300 96C330 94 360 104 380 126M124 84C130 130 180 160 224 176',
  his: 'M232 178L246 202',
  rbb: 'M246 202C240 230 234 262 230 292C226 310 210 322 196 326',
  lbb: 'M246 202C252 208 258 212 264 214',
  laf: 'M264 214C300 210 340 204 380 190',
  lpf: 'M264 214C290 240 320 270 352 296',
  // left-sided network (the right-sided one, PURK_R, follows the right bundle)
  purkinje: 'M352 296C340 318 320 334 302 344M380 190C392 212 394 236 386 258M352 296C368 286 380 272 388 254M380 190C368 176 352 172 334 176',
  ap: 'M386 150L398 196',
};
const PURK_R = 'M230 292C210 296 186 298 166 292M196 326C174 318 150 300 136 276M230 292C246 312 266 330 286 340';
const NODE_POS: Record<'sa' | 'av', readonly [number, number]> = { sa: [124, 84], av: [232, 178] };
/** where the block bar is drawn for each element, and its orientation (degrees) */
const BAR: Partial<Record<CondNode, readonly [number, number, number]>> = {
  av: [232, 178, 30],
  rbb: [242, 226, 10],
  lbb: [256, 208, 40],
  laf: [290, 211, 85],
  lpf: [282, 232, 40],
};

// ── surface complexes for the schematic (lead depends on the block) ─────────────────────────────────────────────
const TRACE: Record<CondBlock, { readonly lead: string; readonly shape: BeatShape }> = {
  none: { lead: 'II', shape: NORMAL_BEAT },
  av: { lead: 'II', shape: { waves: [NORMAL_BEAT.waves[0]], marks: NORMAL_BEAT.marks } },
  rbb: {
    lead: 'V1',
    shape: {
      waves: [
        { center: 176, wl: 7, amp: 0.3 },
        { center: 204, wl: 9, amp: -0.55 },
        { center: 252, wl: 15, wr: 18, amp: 0.95 },
        { center: 430, wl: 55, wr: 38, amp: -0.25 },
        NORMAL_BEAT.waves[0],
      ],
      marks: { ...NORMAL_BEAT.marks, qrsOff: 300 },
    },
  },
  lbb: {
    lead: 'V1',
    shape: {
      waves: [{ center: 222, wl: 30, wr: 36, amp: -1.35 }, { center: 440, wl: 60, wr: 40, amp: 0.42 }, NORMAL_BEAT.waves[0]],
      marks: { ...NORMAL_BEAT.marks, qrsOff: 300 },
    },
  },
  laf: {
    lead: 'II',
    shape: {
      waves: [NORMAL_BEAT.waves[0], { center: 180, wl: 6, amp: 0.3 }, { center: 206, wl: 10, amp: -0.75 }, { center: 410, wl: 55, wr: 36, amp: 0.18 }],
      marks: NORMAL_BEAT.marks,
    },
  },
  lpf: {
    lead: 'I',
    shape: {
      waves: [NORMAL_BEAT.waves[0], { center: 180, wl: 6, amp: 0.25 }, { center: 206, wl: 10, amp: -0.6 }, { center: 410, wl: 55, wr: 36, amp: 0.15 }],
      marks: NORMAL_BEAT.marks,
    },
  },
  accessory: {
    lead: 'II',
    shape: {
      waves: [NORMAL_BEAT.waves[0], { center: 150, wl: 34, wr: 8, amp: 0.55 }, { center: 172, wl: 8, amp: 0.85 }, { center: 196, wl: 8, amp: -0.15 }, { center: 380, wl: 55, wr: 36, amp: 0.22 }],
      marks: { ...NORMAL_BEAT.marks, qrsOn: 100, qrsOff: 260 },
    },
  },
};

const SLOW = 5; // slow motion factor of the schematic animation

const STAGES = ['sa', 'atria', 'av', 'his', 'vent', 'repol', 'rest', 'blockedAv', 'waiting'] as const;
type Stage = (typeof STAGES)[number];

function stageOf(s: Record<CondNode, NodeState>): Stage {
  const moving = (id: CondNode) => s[id].act > 0 && s[id].act < 1;
  const myo: CondNode[] = ['septum', 'rv', 'lvAnt', 'lvPost'];
  if (myo.some(moving)) return 'vent';
  if (myo.some((id) => s[id].act >= 1 && s[id].recovered > 0 && s[id].recovered < 1)) return 'repol';
  if (['his', 'rbb', 'lbb', 'laf', 'lpf', 'purkinje'].some((id) => moving(id as CondNode))) return 'his';
  if (s.av.blockedAt != null && s.atria.act >= 1) return 'blockedAv';
  if (moving('av')) return 'av';
  if (moving('atria')) return 'atria';
  if (moving('sa')) return 'sa';
  if (s.av.act >= 1 && s.his.act === 0) return 'av';
  if (myo.some((id) => s[id].act >= 1 && s[id].recovered < 1)) return 'vent';
  return 'rest';
}

export function ConductionFigure(props: { readonly params?: FigureParams['conduction']; readonly ecg?: Ecg; readonly cursor?: Signal<number | null> }) {
  const block: CondBlock = props.params?.block ?? 'none';
  const ecg = props.ecg;
  const truth = ecg?.truth ?? null;
  const live = !!ecg && !!(ecg.regions || (truth && truth.beats.length));
  const cursor = useCursor(props.cursor);
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  /** the trace window frozen for the length of a drag (live mode), so x → time does not change under the pointer */
  const dragWin = useRef<[number, number] | null>(null);
  const uid = useUid('cd');

  const tl = useMemo(() => schematicTimeline(block), [block]);
  const dur = tl.t1 - tl.t0;
  const anim = usePlayOnce(dur * SLOW, !live, stageRef);
  const buf = useMemo(() => (ecg?.regions ? new Float32Array(ecg.regions.ids.length) : null), [ecg]);

  // time and states
  let t: number | null;
  let states: Record<CondNode, NodeState> | null = null;
  let win: [number, number];
  if (live) {
    t = cursor.value;
    const tlE = t != null && truth ? timelineAt(truth, t, block) : null;
    win = tlE ? [tlE.t0, tlE.t1] : truth && truth.beats.length ? [truth.beats[0].qrsOn - 300, truth.beats[0].tOff + 100] : [0, 1000];
    if (t != null) {
      if (ecg!.regions && buf && block === 'none') {
        ecg!.regions.stateAt(t, buf);
        states = statesFromRegions(ecg!.regions.ids, buf, ecg!.regions.highlights);
      } else if (tlE) states = stateAt(tlE, t);
    }
  } else {
    t = tl.t0 + anim.p * dur;
    states = stateAt(tl, t);
    win = [tl.t0, tl.t1];
  }
  if (live && dragWin.current) win = dragWin.current;
  const s = states ?? (Object.fromEntries(CONDUCTION_NODES.map((id) => [id, { act: 0, recovered: 0, blockedAt: null }])) as Record<CondNode, NodeState>);
  const stage: Stage = states ? stageOf(s) : 'waiting';
  const showAp = block === 'accessory' || s.ap.act > 0;

  const fillOp = (st: NodeState) => 0.55 * st.act * (1 - st.recovered);
  // with a bundle-branch block the Purkinje network on that side is reached late, through the myocardium
  const purkR: NodeState = s.rbb.blockedAt != null ? { ...s.rv, blockedAt: null } : s.purkinje;
  const purkL: NodeState = s.lbb.blockedAt != null ? { ...s.lvPost, blockedAt: null } : s.purkinje;
  const pathEl = (id: CondNode, override?: { readonly d: string; readonly st: NodeState }) => {
    const d = override?.d ?? PATHS[id];
    if (!d) return null;
    const st = override?.st ?? (id === 'purkinje' ? purkL : s[id]);
    const reached = st.blockedAt != null ? Math.min(st.act, st.blockedAt) : st.act;
    return (
      <g>
        <path d={d} class="fg-cs fg-cs--rest" />
        <path d={d} pathLength={1} class="fg-cs fg-cs--on" style={{ strokeDasharray: `${reached} 1.01`, opacity: 1 - 0.85 * st.recovered }} />
      </g>
    );
  };

  // surface trace panel
  const TX = 522;
  const TY = 70;
  const TW = 246;
  const THh = 170;
  const trace = TRACE[block];
  const tX = (tt: number) => TX + ((tt - win[0]) / (win[1] - win[0])) * TW;
  const traceD = useMemo(() => {
    const toY = (mv: number) => clamp(TY + THh * 0.6 - mv * 60, TY + 1, TY + THh - 1);
    if (live && ecg) return leadPath(ecg.signal, 'II', win[0], win[1], tX, toY, 400);
    const pts: Array<[number, number]> = [];
    for (let tt = win[0]; tt <= win[1]; tt += 2) pts.push([tX(tt), toY(beatValue(trace.shape, tt))]);
    return polyline(pts);
  }, [live, ecg, block, win[0], win[1]]);

  const scrub = (e: PointerEvent) => {
    if (!svgRef.current) return;
    const [x] = svgPoint(svgRef.current, e);
    if (x < TX - 10) return;
    const tt = win[0] + clamp((x - TX) / TW, 0, 1) * (win[1] - win[0]);
    if (live) cursor.value = Math.round(tt);
    else anim.seek((tt - tl.t0) / dur);
  };

  return (
    <FigureFrame
      id="conduction"
      title={tf('cdTitle')}
      wide
      controls={
        !live ? (
          <>
            <ReplayButton onClick={anim.replay} />
            <Slider
              id={`${uid}-t`}
              label={tf('cdScrub')}
              value={Math.round(anim.p * 1000)}
              min={0}
              max={1000}
              onInput={(v) => anim.seek(v / 1000)}
              display={`${Math.round(t ?? 0)} ms`}
            />
          </>
        ) : undefined
      }
      footer={
        <div class="fg-stage" ref={stageRef} aria-live="polite">
          <span class={`fg-stage__dot fg-stage__dot--${stage}`} />
          <Reserve block reserve={STAGES.map((k) => tf(`cdStage_${k}`))}>
            {tf(`cdStage_${stage}`)}
          </Reserve>
        </div>
      }
      caption={
        <>
          {block !== 'none' && <span class="fg-note">{tf(`cdBlock_${block}`)} </span>}
          {tf(live ? 'cdCaptionLive' : 'cdCaption')}
        </>
      }
    >
      <Svg
        w={W}
        h={H}
        label={tf('cdAria')}
        svgRef={svgRef}
        onPointerDown={(e) => {
          dragging.current = true;
          dragWin.current = live ? win : null;
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
          scrub(e);
        }}
        onPointerMove={(e) => {
          if (dragging.current) scrub(e);
        }}
        onPointerUp={() => {
          dragging.current = false;
          dragWin.current = null;
        }}
      >
        {/* chambers */}
        <path d={OUTLINE} class="fg-heart" />
        <path d={RA} class="fg-chamber" />
        <path d={LA} class="fg-chamber" />
        <path d={RA} class="fg-chamber-fill fg-chamber-fill--atria" style={{ opacity: fillOp(s.atria) }} />
        <path d={LA} class="fg-chamber-fill fg-chamber-fill--atria" style={{ opacity: fillOp(s.atria) }} />
        <path d={RV} class="fg-chamber" />
        <path d={LV_ANT} class="fg-chamber" />
        <path d={LV_POST} class="fg-chamber" />
        <path d={SEPTUM} class="fg-chamber fg-chamber--septum" />
        <path d={RV} class="fg-chamber-fill fg-chamber-fill--vent" style={{ opacity: fillOp(s.rv) }} />
        <path d={LV_ANT} class="fg-chamber-fill fg-chamber-fill--vent" style={{ opacity: fillOp(s.lvAnt) }} />
        <path d={LV_POST} class="fg-chamber-fill fg-chamber-fill--vent" style={{ opacity: fillOp(s.lvPost) }} />
        <path d={SEPTUM} class="fg-chamber-fill fg-chamber-fill--vent" style={{ opacity: fillOp(s.septum) }} />
        <path d="M92 182L408 172" class="fg-avring" />

        {/* conduction system */}
        {(['atria', 'his', 'rbb', 'lbb', 'laf', 'lpf', 'purkinje'] as const).map((id) => pathEl(id))}
        {pathEl('purkinje', { d: PURK_R, st: purkR })}
        {showAp && pathEl('ap')}
        {(['sa', 'av'] as const).map((id) => (
          <circle cx={NODE_POS[id][0]} cy={NODE_POS[id][1]} r={id === 'sa' ? 8 : 9} class={`fg-node ${s[id].act > 0 ? 'is-on' : ''}`} style={{ opacity: 0.45 + 0.55 * Math.min(1, s[id].act) * (1 - 0.85 * s[id].recovered) }} />
        ))}
        {(Object.keys(BAR) as CondNode[]).map((id) => {
          const show = s[id].blockedAt != null && (id !== 'av' || s.atria.act > 0);
          if (!show) return null;
          const [x, y, a] = BAR[id]!;
          return <path d={`M${x - 11} ${y}H${x + 11}`} transform={`rotate(${a} ${x} ${y})`} class="fg-blockbar" />;
        })}

        {/* labels */}
        <g class="fg-cs-labels" aria-hidden="true">
          <SvgLabel x={110} y={68} anchor="end" text={tf('csSa')} />
          <SvgLabel x={150} y={160} anchor="end" text={tf('csAv')} />
          <path d="M152 157L222 177" class="fg-leader" />
          <SvgLabel x={170} y={226} anchor="end" text={tf('csHis')} />
          <path d="M172 222L240 194" class="fg-leader" />
          <SvgLabel x={150} y={280} anchor="end" text={tf('csRbb')} />
          <path d="M152 276L232 268" class="fg-leader" />
          <SvgLabel x={420} y={186} text={tf('csLaf')} />
          <path d="M418 190L382 191" class="fg-leader" />
          <SvgLabel x={420} y={302} text={tf('csLpf')} />
          <path d="M418 300L354 296" class="fg-leader" />
          <SvgLabel x={294} y={236} text={tf('csLbb')} />
          <SvgLabel x={150} y={344} text={tf('csPurkinje')} />
          <text x={205} y={124} class="fg-svg-text fg-svg-text--muted" text-anchor="middle">
            {tf('chRA')}
          </text>
          <text x={330} y={124} class="fg-svg-text fg-svg-text--muted" text-anchor="middle">
            {tf('chLA')}
          </text>
          <text x={160} y={250} class="fg-svg-text fg-svg-text--muted" text-anchor="middle">
            {tf('chRV')}
          </text>
          <text x={345} y={256} class="fg-svg-text fg-svg-text--muted" text-anchor="middle">
            {tf('chLV')}
          </text>
          {showAp && <SvgLabel x={420} y={140} text={tf('csAp')} />}
        </g>

        {/* surface trace */}
        <g>
          <text x={TX} y={TY - 10} class="fg-svg-text fg-svg-text--strong">
            {live ? tf('cdLeadLive') : tf('cdLeadSchematic', { lead: trace.lead })}
          </text>
          <PaperGrid x={TX} y={TY} w={TW} h={THh} mm={TW / (((win[1] - win[0]) / 1000) * 25)} minor={false} />
          <path d={traceD} class="fg-trace" />
          {t != null && t >= win[0] && t <= win[1] && <path d={`M${tX(t)} ${TY}V${TY + THh}`} class="fg-cursor" />}
          <text x={TX + TW} y={TY + THh + 16} text-anchor="end" class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '10px' }}>
            {live ? tf('cdClickHint') : tf('cdSlowMotion', { k: SLOW })}
          </text>
        </g>
      </Svg>
    </FigureFrame>
  );
}
