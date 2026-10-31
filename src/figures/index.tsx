/**
 * Public entry of the 2D explainer figures. Other modules import only from here:
 *   <Figure id="hexaxial" params={{ vectorDeg: 60, interactive: true }} cursor={cursor} ecg={ecg} />
 * The component map is checked by the compiler to cover every FigureId.
 */
import type { ComponentType } from 'preact';
import type { FigureId, FigureProps } from './api';
import { ActionPotentialFigure } from './ActionPotentialFigure';
import { AxisCalculatorFigure } from './AxisCalculatorFigure';
import { ConductionFigure } from './ConductionFigure';
import { DecisionTreeFigure } from './DecisionTreeFigure';
import { DipoleFigure } from './DipoleFigure';
import { ElectrodesFigure } from './ElectrodesFigure';
import { HexaxialFigure } from './HexaxialFigure';
import { HorizontalPlaneFigure } from './HorizontalPlaneFigure';
import { LaddergramFigure } from './LaddergramFigure';
import { PaperFigure } from './PaperFigure';
import { QtcCalculatorFigure } from './QtcCalculatorFigure';
import { RateRulerFigure } from './RateRulerFigure';
import { TerritoriesFigure } from './TerritoriesFigure';
import { VectorLoopFigure } from './VectorLoopFigure';
import { CableSwapScene } from './scenes/CableSwapScene';
import { ChestRingScene } from './scenes/ChestRingScene';
import { ConductionJourneyScene } from './scenes/ConductionJourneyScene';
import { ElectrodeWalkScene } from './scenes/ElectrodeWalkScene';
import { MovingPaperScene } from './scenes/MovingPaperScene';
import { NoisyElectrodeScene } from './scenes/NoisyElectrodeScene';
import { ThreeVectorsScene } from './scenes/ThreeVectorsScene';
import { TriangleToWheelScene } from './scenes/TriangleToWheelScene';
import { VectorPenScene } from './scenes/VectorPenScene';
import './figures.css';

export type { FigureId, FigureParams, FigureProps } from './api';
export { FIGURE_IDS, SCENE_IDS } from './api';
export type { SceneId } from './api';
// scene runtime pieces the course may use (HeartBlock transport, narration box); nothing from scene/* is imported elsewhere
export { HEART_PHASES, JOURNEY_PHASES, PHASE_LABEL_KEY, phaseBeats, SceneTransport, tsn, useScene } from './scene/index';
export type { Beat, BeatDef, SceneState, Timeline } from './scene/index';
export { prefersReducedMotion, Reserve } from './shared';
export { TREES, TREE_IDS } from './trees/index';
export type { DecisionTree, TreeId } from './trees/index';

const FIGURES = {
  paper: PaperFigure,
  electrodes: ElectrodesFigure,
  hexaxial: HexaxialFigure,
  'horizontal-plane': HorizontalPlaneFigure,
  conduction: ConductionFigure,
  laddergram: LaddergramFigure,
  'action-potential': ActionPotentialFigure,
  dipole: DipoleFigure,
  'axis-calculator': AxisCalculatorFigure,
  'rate-ruler': RateRulerFigure,
  'qtc-calculator': QtcCalculatorFigure,
  territories: TerritoriesFigure,
  'decision-tree': DecisionTreeFigure,
  'vector-loop': VectorLoopFigure,
  // animated scenes (stubs until each scene lands; see src/figures/scene/README.md)
  'conduction-journey': ConductionJourneyScene,
  'vector-pen': VectorPenScene,
  'three-vectors': ThreeVectorsScene,
  'triangle-to-wheel': TriangleToWheelScene,
  'chest-ring': ChestRingScene,
  'moving-paper': MovingPaperScene,
  'electrode-walk': ElectrodeWalkScene,
  'cable-swap': CableSwapScene,
  'noisy-electrode': NoisyElectrodeScene,
} as const satisfies { readonly [K in FigureId]: ComponentType<Omit<Extract<FigureProps, { id: K }>, 'id'>> };

/** The component registered for a figure id (tests check every scene id resolves to one). */
export function figureComponent(id: FigureId): ComponentType<Omit<FigureProps, 'id'>> {
  return FIGURES[id] as unknown as ComponentType<Omit<FigureProps, 'id'>>;
}

/** Render a figure by id. A change of id or params remounts it (fresh state, animations replay). */
export function Figure(props: FigureProps) {
  const C = figureComponent(props.id);
  const { id, ...rest } = props;
  return <C key={`${id}:${JSON.stringify(props.params ?? {})}`} {...rest} />;
}
