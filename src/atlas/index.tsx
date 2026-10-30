/**
 * src/atlas — the pattern atlas. Public entry point (docs/PLAN.md §12): other modules import only from here.
 *
 *   AtlasPage                       #/atlas — browse by category and severity, search in zh / en / es, can't-miss filter
 *   FindingPage({ id })             #/atlas/:findingId — exemplar, criteria, mechanism, mimics side by side, real cases
 *   entryOf(id) / allEntries()      atlas entries (schema: ./schema.ts; entry files: ./entries/<category>.ts)
 *   searchFindings(query)           ranked finding ids for a query in any of the three languages
 *   LESSON_TITLES / lessonTitle(id) short titles of the PLAN §3 lessons
 */
export { AtlasPage } from './AtlasPage';
export { FindingPage } from './FindingPage';
export { allEntries, entryOf, hasEntry } from './registry';
export { searchFindings, filterFindings, normalize } from './search';
export { LESSON_TITLES, lessonTitle } from './lessons';
export { LESSON_IDS, validateEntry, type AtlasEntry, type Criterion, type MimicSpec, type Urgency, type UrgencySpec, type ExemplarSpec } from './schema';
