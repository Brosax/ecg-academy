import type { Mode } from '../store';
import { DiseaseMode } from './disease';
import { LeadsMode } from './leads';
import { OverviewMode } from './overview';
import { SectionMode } from './section';
import type { ModeView } from './types';

export const MODE_VIEWS: Readonly<Record<Mode, ModeView>> = {
  overview: OverviewMode,
  leads: LeadsMode,
  section: SectionMode,
  disease: DiseaseMode,
};
export type { ModeProps, ModeView } from './types';
