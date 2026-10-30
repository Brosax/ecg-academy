/**
 * Coronary territories: arteries (anterior view) ↔ walls (short-axis slice) ↔ lead groups (12-lead grid + V3R/V4R and
 * V7–V9). Choosing a territory highlights its culprit artery, its wall, its ST-elevation leads and the leads with
 * reciprocal ST depression. Data and sources: data/territories.ts.
 */
import { useState } from 'preact/hooks';
import type { FigureParams } from './api';
import type { Lead } from '../core/leads';
import { lt } from '../i18n/index';
import { tf } from '../i18n/figures';
import { arteryOf, initialTerritory, TERRITORIES, TERRITORY_IDS, type ArterySeg, type TerritoryId, type Wall } from './data/territories';
import { unit } from './math/geom';
import { FigureFrame, Svg } from './shared';

const W = 780;
const H = 380;

const SEG_PATH: Record<ArterySeg, string> = {
  lm: 'M160 116C172 114 186 116 198 124',
  ladProx: 'M198 124C200 140 200 156 201 172',
  ladMid: 'M201 172C204 200 208 226 214 252',
  ladDist: 'M214 252C220 288 228 318 238 344',
  diag: 'M202 184C218 196 234 208 250 226M210 232C224 244 236 256 250 268',
  septal: 'M199 146L186 160M203 196L189 211M208 226L195 240',
  lcx: 'M198 124C216 124 236 132 250 146C258 156 264 170 266 186',
  om: 'M252 150C258 172 262 196 262 218M262 176C266 200 268 224 266 248',
  rcaProx: 'M146 120C120 124 98 136 84 158',
  rcaMid: 'M84 158C70 186 68 222 80 252',
  rvBranch: 'M76 206C96 216 118 232 134 252',
  rcaDist: 'M80 252C96 280 124 302 160 318',
  pda: 'M160 318C186 330 210 340 236 346',
  pl: 'M160 318C190 314 222 306 252 292',
};
/** segments drawn dashed: they run on the inferior / posterior surface */
const BEHIND: ReadonlySet<ArterySeg> = new Set(['rcaDist', 'pda', 'pl']);
const SEGS = Object.keys(SEG_PATH) as ArterySeg[];

const HEART_OUTLINE = 'M84 112C54 150 54 228 88 270C128 312 190 342 238 346C264 320 274 262 266 202C260 158 240 130 212 118C172 102 122 100 84 112Z';
const AORTA = 'M132 120C126 86 130 54 152 38C172 26 200 30 210 50L196 60C190 48 176 46 166 54C152 66 150 92 156 118Z';
const PULM = 'M168 122C174 96 188 80 214 68L222 80C204 90 194 104 190 124Z';

// short-axis slice (looking from the apex): anterior up, septum on the screen left, lateral on the right
const SA = { cx: 432, cy: 184, r0: 46, r1: 80, rv1: 110 } as const;
const WALL_ARC: Record<Exclude<Wall, 'rv'>, readonly [number, number]> = {
  anterior: [-125, -55],
  lateral: [-55, 15],
  posterior: [15, 75],
  inferior: [75, 135],
  septal: [135, 235],
};

function ringPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => {
    const [x, y] = unit(a);
    return `${cx + r * x} ${cy + r * y}`;
  };
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${p(r1, a0)}A${r1} ${r1} 0 ${large} 1 ${p(r1, a1)}L${p(r0, a1)}A${r0} ${r0} 0 ${large} 0 ${p(r0, a0)}Z`;
}

const GRID: readonly (readonly Lead[])[] = [
  ['I', 'aVR', 'V1', 'V4'],
  ['II', 'aVL', 'V2', 'V5'],
  ['III', 'aVF', 'V3', 'V6'],
];
const EXTRA: readonly Lead[] = ['V3R', 'V4R', 'V7', 'V8', 'V9'];

function territoryOfLead(l: Lead): TerritoryId | null {
  for (const id of TERRITORY_IDS) if (TERRITORIES[id].leads.includes(l)) return id;
  return null;
}

export function TerritoriesFigure(props: { readonly params?: FigureParams['territories'] }) {
  const [sel, setSel] = useState<TerritoryId | null>(() => initialTerritory(props.params));
  const t = sel ? TERRITORIES[sel] : null;
  const main = new Set<ArterySeg>(t?.arteries ?? []);
  const alt = new Set<ArterySeg>(t?.altArteries ?? []);
  const stUp = new Set<Lead>(t?.leads ?? []);
  const stDown = new Set<Lead>(t?.reciprocal ?? []);
  const walls = new Set<Wall>(t?.walls ?? []);

  const leadCell = (l: Lead, x: number, y: number, w: number) => {
    const cls = stUp.has(l) ? 'is-up' : stDown.has(l) ? 'is-down' : '';
    const owner = territoryOfLead(l);
    return (
      // pointer shortcut only (the territory buttons above are the keyboard / screen-reader route)
      <g class={`fg-leadcell ${cls}`} onClick={() => owner && setSel(owner)}>
        <rect x={x} y={y} width={w} height={34} rx={5} />
        <text x={x + w / 2} y={y + 17} text-anchor="middle" dominant-baseline="central" class="fg-svg-text fg-svg-text--lead">
          {l}
        </text>
        {cls && (
          <text x={x + w - 6} y={y + 10} text-anchor="end" dominant-baseline="central" class="fg-svg-text fg-leadcell__arrow">
            {cls === 'is-up' ? '↑' : '↓'}
          </text>
        )}
      </g>
    );
  };

  return (
    <FigureFrame
      id="territories"
      title={tf('trTitle')}
      wide
      controls={
        <div class="fg-chips" role="group" aria-label={tf('trChoose')}>
          {TERRITORY_IDS.map((id) => (
            <button type="button" aria-pressed={sel === id} class={`fg-chipbtn ${sel === id ? 'is-on' : ''}`} onClick={() => setSel(sel === id ? null : id)}>
              {lt(TERRITORIES[id].name)}
            </button>
          ))}
        </div>
      }
      footer={
        <div class="fg-info fg-info--tall" aria-live="polite">
          {t ? (
            <>
              <div class="fg-info__title">{lt(t.name)}</div>
              <div>
                <b>{tf('trLeads')}:</b> <span class="tabular">{t.leads.join(', ')}</span>
                {t.reciprocal.length > 0 && (
                  <>
                    {' · '}
                    <b>{tf('trReciprocal')}:</b> <span class="tabular">{t.reciprocal.join(', ')}</span>
                  </>
                )}
              </div>
              <div>
                <b>{tf('trArtery')}:</b> {lt(t.artery)}
              </div>
              <div class="fg-info__sub">{lt(t.note)}</div>
            </>
          ) : (
            <div>{tf('trPick')}</div>
          )}
        </div>
      }
      caption={tf('trCaption')}
    >
      <Svg w={W} h={H} label={tf('trAria', { name: t ? lt(t.name) : '—' })}>
        {/* panel titles */}
        <text x={160} y={20} text-anchor="middle" class="fg-svg-text fg-svg-text--muted">
          {tf('trArteries')}
        </text>
        <text x={SA.cx} y={20} text-anchor="middle" class="fg-svg-text fg-svg-text--muted">
          {tf('trWalls')}
        </text>
        <text x={665} y={20} text-anchor="middle" class="fg-svg-text fg-svg-text--muted">
          {tf('trLeadGroups')}
        </text>

        {/* arteries */}
        <g aria-hidden="true">
          <path d={HEART_OUTLINE} class="fg-heart" />
          <path d="M200 124C204 200 214 280 238 346" class="fg-groove" />
          <path d={AORTA} class="fg-vessel" />
          <path d={PULM} class="fg-vessel" />
          {SEGS.map((s) => (
            <path
              d={SEG_PATH[s]}
              class={`fg-artery fg-artery--${arteryOf(s)} ${main.has(s) ? 'is-culprit' : alt.has(s) ? 'is-alt' : t ? 'is-dim' : ''} ${BEHIND.has(s) ? 'is-behind' : ''}`}
            />
          ))}
          <text x={110} y={124} class="fg-svg-text fg-artlabel">
            {tf('artRCA')}
          </text>
          <text x={180} y={106} class="fg-svg-text fg-artlabel">
            {tf('artLM')}
          </text>
          <text x={206} y={162} class="fg-svg-text fg-artlabel">
            {tf('artLAD')}
          </text>
          <text x={256} y={132} class="fg-svg-text fg-artlabel">
            {tf('artLCx')}
          </text>
          <text x={252} y={238} class="fg-svg-text fg-artlabel">
            {tf('artD')}
          </text>
          <text x={270} y={206} class="fg-svg-text fg-artlabel">
            {tf('artOM')}
          </text>
          <text x={108} y={260} class="fg-svg-text fg-artlabel">
            {tf('artRV')}
          </text>
          <text x={186} y={362} class="fg-svg-text fg-artlabel">
            {tf('artPDA')}
          </text>
          <text x={10} y={372} class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '9.5px' }}>
            {tf('trDashed')}
          </text>
        </g>

        {/* short-axis slice */}
        <g>
          <path d={ringPath(SA.cx, SA.cy, SA.r1 + 2, SA.rv1, 130, 240)} class={`fg-wall fg-wall--rv ${walls.has('rv') ? 'is-on' : ''}`} onClick={() => setSel('rv')} />
          {(Object.keys(WALL_ARC) as Array<Exclude<Wall, 'rv'>>).map((w) => {
            const [a0, a1] = WALL_ARC[w];
            return <path d={ringPath(SA.cx, SA.cy, SA.r0, SA.r1, a0, a1)} class={`fg-wall ${walls.has(w) ? 'is-on' : ''}`} onClick={() => setSel(w)} />;
          })}
          {(Object.keys(WALL_ARC) as Array<Exclude<Wall, 'rv'>>).map((w) => {
            const [a0, a1] = WALL_ARC[w];
            const [ux, uy] = unit((a0 + a1) / 2);
            const r = w === 'septal' ? SA.r0 - 26 : SA.r1 + 22;
            return (
              <text x={SA.cx + r * ux} y={SA.cy + r * uy} text-anchor="middle" dominant-baseline="central" class="fg-svg-text fg-wall__label">
                {tf(`wall_${w}`)}
              </text>
            );
          })}
          <text x={SA.cx - SA.rv1 + 4} y={SA.cy + 64} class="fg-svg-text fg-wall__label">
            {tf('wall_rv')}
          </text>
          <text x={SA.cx} y={SA.cy + SA.rv1 + 34} text-anchor="middle" class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '9.5px' }}>
            {tf('trSliceNote')}
          </text>
        </g>

        {/* lead grid */}
        <g>
          {GRID.map((row, r) => row.map((l, c) => leadCell(l, 560 + c * 54, 44 + r * 42, 48)))}
          <text x={560} y={190} class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '10px' }}>
            {tf('trExtra')}
          </text>
          {EXTRA.map((l, i) => leadCell(l, 560 + (i % 3) * 72, 200 + Math.floor(i / 3) * 42, 64))}
          <g transform="translate(560 300)">
            <rect width={14} height={14} rx={3} class="fg-leadcell-key is-up" />
            <text x={20} y={11} class="fg-svg-text" style={{ fontSize: '11px' }}>
              {tf('trUp')}
            </text>
            <rect y={22} width={14} height={14} rx={3} class="fg-leadcell-key is-down" />
            <text x={20} y={33} class="fg-svg-text" style={{ fontSize: '11px' }}>
              {tf('trDown')}
            </text>
          </g>
        </g>
      </Svg>
    </FigureFrame>
  );
}
