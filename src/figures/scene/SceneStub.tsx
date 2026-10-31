/**
 * Placeholder for a pre-registered scene id: a SceneFrame with one beat and a visible "scene under construction"
 * notice, so lessons can embed the id today and the scene author replaces only src/figures/scenes/<Id>Scene.tsx.
 */
import { useRef } from 'preact/hooks';
import type { Translator } from '../../i18n/index';
import { Svg } from '../shared';
import { SceneFrame } from './SceneFrame';
import { tsn } from './strings';
import { useScene } from './useScene';

const W = 760;
const H = 400;
const STUB_BEATS = [{ id: 'stub', ms: 1500 }] as const;

export function SceneStub(props: { readonly id: string; readonly t: Translator<'title' | 'aria'> }) {
  const stage = useRef<HTMLDivElement>(null);
  const sc = useScene({ beats: STUB_BEATS, autoplay: false, target: stage });
  const note = tsn('scStub');
  return (
    <SceneFrame id={props.id} title={props.t('title')} aria={props.t('aria')} scene={sc} stageRef={stage} narration={() => note} playBeat={false}>
      <Svg w={W} h={H} label={props.t('aria')} class="sc-stub">
        <rect x={8} y={8} width={W - 16} height={H - 16} rx={12} class="sc-stub__box" />
        <text x={W / 2} y={H / 2 - 8} text-anchor="middle" class="fg-svg-text fg-svg-text--strong sc-stub__text">
          {props.t('title')}
        </text>
        <text x={W / 2} y={H / 2 + 18} text-anchor="middle" class="fg-svg-text fg-svg-text--muted">
          {note}
        </text>
      </Svg>
    </SceneFrame>
  );
}
