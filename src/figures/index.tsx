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
import './figures.css';

export type { FigureId, FigureParams, FigureProps } from './api';
export { FIGURE_IDS } from './api';
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
} as const satisfies { readonly [K in FigureId]: ComponentType<Omit<Extract<FigureProps, { id: K }>, 'id'>> };

/** Render a figure by id. A change of id or params remounts it (fresh state, animations replay). */
export function Figure(props: FigureProps) {
  const C = FIGURES[props.id] as unknown as ComponentType<Omit<FigureProps, 'id'>>;
  const { id, ...rest } = props;
  return <C key={`${id}:${JSON.stringify(props.params ?? {})}`} {...rest} />;
}
