/**
 * The frame of an animated scene (spec §2.7): FigureFrame + a stage wrapper (the autoplay observer target) +
 * SceneTransport + the narration box (a block Reserve sized by the longest caption of the current language, so a beat
 * change never moves anything) + slots for the scene's own controls, a Predict row and a footer.
 *
 *   const stage = useRef<HTMLDivElement>(null);
 *   const sc = useScene({ beats: BEATS, cursor: props.cursor, target: stage });
 *   <SceneFrame id="vector-pen" title={t('title')} aria={t('aria')} scene={sc} stageRef={stage} narration={(id) => t(`beat_${id}`)}> <Svg …/> </SceneFrame>
 */
import type { ComponentChildren, RefObject } from 'preact';
import { FigureFrame, Reserve } from '../shared';
import './scene.css';
import { SceneTransport } from './SceneTransport';
import type { SceneState } from './useScene';

export function SceneFrame<Id extends string>(props: {
  readonly id: string;
  readonly title: string;
  /** aria-label of the stage (what the picture shows) */
  readonly aria: string;
  readonly scene: SceneState<Id>;
  /** the same ref passed to useScene as `target` */
  readonly stageRef: RefObject<HTMLDivElement>;
  /** caption of a beat (the narration shown under the transport) */
  readonly narration: (id: Id) => string;
  /** other wordings the narration box can take (Predict feedback), reserved so the box never grows */
  readonly narrationReserve?: readonly string[];
  /** what the narration shows instead of the beat caption (Predict feedback) */
  readonly narrationOverride?: string | null;
  readonly badge?: ComponentChildren;
  /** scene toggles, drag keyboard helpers */
  readonly controls?: ComponentChildren;
  readonly predict?: ComponentChildren;
  readonly footer?: ComponentChildren;
  /** ≤ 2 lines; the lesson caption is the only other prose */
  readonly caption?: ComponentChildren;
  readonly slow?: number;
  readonly beatLabel?: (id: Id, i: number) => string;
  readonly playBeat?: boolean;
  readonly wide?: boolean;
  readonly children: ComponentChildren;
}) {
  const s = props.scene;
  const all = s.beats.map((b) => props.narration(b.id)).concat(props.narrationReserve ?? []);
  const current = props.narrationOverride ?? (s.beats.length ? props.narration(s.beats[s.i].id) : '');
  return (
    <FigureFrame
      id={props.id}
      title={props.title}
      badge={props.badge}
      controls={props.controls}
      wide={props.wide ?? true}
      footer={
        <div class="sc-foot">
          <SceneTransport scene={s} slow={props.slow} beatLabel={props.beatLabel} playBeat={props.playBeat} />
          <div class="sc-narr" aria-live="polite">
            <Reserve block reserve={all}>
              {current}
            </Reserve>
          </div>
          {props.predict}
          {props.footer}
        </div>
      }
      caption={props.caption}
    >
      <div class="sc-stage" ref={props.stageRef} role="group" aria-label={props.aria}>
        {props.children}
      </div>
    </FigureFrame>
  );
}
