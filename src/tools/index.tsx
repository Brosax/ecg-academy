/**
 * src/tools — reference tools. Public entry point (docs/PLAN.md §12): other modules import only from here.
 *
 *   ToolsPage({ tab? })     #/tools[/checklist|values|calculators|glossary]
 *   CHECKLIST               the systematic reading order (data; reused by lessons and the report form)
 *   buildGlossary()         trilingual glossary rows (findings + corrected book terms)
 */
export { ToolsPage } from './ToolsPage';
export { TOOL_TABS, toolTab, type ToolTab } from './tabs';
export { CHECKLIST, STEP_IDS, type ChecklistStep, type StepId } from './checklist';
export { buildGlossary, searchGlossary, type GlossaryRow } from './glossary';
export { ADULT_NORMALS, QTC_BY_SEX, ST_THRESHOLDS, PAEDIATRIC_NOTES } from './normals';
