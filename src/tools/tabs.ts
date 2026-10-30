/** Tool tabs (route segment of #/tools/:tab). Pure — tested in tests/tools. */
export const TOOL_TABS = ['checklist', 'values', 'calculators', 'glossary'] as const;
export type ToolTab = (typeof TOOL_TABS)[number];

/** The tab to show for a route segment; unknown or missing → the checklist. */
export function toolTab(tab: string | undefined): ToolTab {
  return (TOOL_TABS as readonly string[]).includes(tab ?? '') ? (tab as ToolTab) : 'checklist';
}
