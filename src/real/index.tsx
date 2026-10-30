/**
 * src/real — the real-ECG case library (300 curated PTB-XL records). Public entry point: other modules import only from
 * here (contract types: ./api.ts).
 *
 *   CasesPage, CasePage({ id, readingSlot? })   pages for #/cases and #/cases/:ecgId
 *   getLibrary(): RealLibrary                   all cases (blind case-number order) + attribution
 *   loadRealEcg(id): Promise<Ecg>               decoded 12-lead Ecg (truth null, regions null), LRU-cached
 *   peekRealEcg(id): Ecg | null                 the decoded Ecg when already cached (synchronous; no placeholder flash)
 *   scpStatements                               all 71 SCP-ECG statements with zh/en/es names and kind
 *   attribution                                 CC BY 4.0 attribution (sources + changes) as L10n
 *   casesWithFinding(id)                        real examples of a finding (atlas, lessons)
 *   compatibleFindings(codes, stadium)          what a case's labels allow without stating it (grade "consistent",
 *                                               not "wrong" — for a replacement reading panel; scp.ts rule 11)
 *   CaseOfDayCard                               for homeSlots.caseOfDay (src/app/slots.ts)
 *   setCaseReadingSlot(Component | null)        replace the default reading checklist on every case page
 */
export { CasesPage } from './CasesPage';
export { CasePage, type CasePageProps } from './CasePage';
export { CaseOfDayCard } from './CaseOfDayCard';
export { AttributionFooter } from './AttributionFooter';
export { FindingLink } from './RevealPanel';
export { caseOfTheDay, casesWithFinding, dateKey, getCase, getCases, getLibrary, type RealCase } from './library';
export { loadRealEcg, peekRealEcg, prefetchRealEcg } from './bundle';
export { scpStatements, SCP_LIST, CASE_CATEGORIES, compatibleFindings, type CaseCategory } from './scp';
export { attribution, attribution as realAttribution, ATTRIBUTION_CHANGES, ATTRIBUTION_LINKS, ATTRIBUTION_SOURCES } from './attribution';
export { caseReadingSlot, setCaseReadingSlot, type CaseReadingSlotProps } from './state';
export type { RealCaseMeta, RealLibrary, RealReference, ScpStatement } from './api';
