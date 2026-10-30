export const meta = {
  name: 'ecg-book-curriculum',
  description: 'Read the scanned Castellano ECG textbook in 15 page windows, synthesize a curriculum map + criteria table, verify criteria against current guidelines, and list curriculum gaps',
  phases: [
    { title: 'Read', detail: '15 agents, one 20-page window each' },
    { title: 'Synthesize', detail: 'chapter map, criteria, patterns, glossary' },
    { title: 'Verify', detail: 'check criteria against current guidelines, per topic cluster' },
    { title: 'Critic', detail: 'what a modern ECG-reading curriculum needs that is missing' },
  ],
}

const PDF = args.pdf
const FIRST = 8, LAST = 299, STEP = 20
const windows = []
for (let p = FIRST; p <= LAST; p += STEP) windows.push({ from: p, to: Math.min(p + STEP - 1, LAST) })

const S = { type: 'string' }
const I = { type: 'integer' }
const arr = (items) => ({ type: 'array', items })
const obj = (properties, required) => ({ type: 'object', properties, required: required || Object.keys(properties) })

const WINDOW_SCHEMA = obj({
  pdf_from: I, pdf_to: I,
  printed_pages_seen: S,
  missing_pdf_pages: arr(I),
  chapters: arr(obj({ number: S, title_es: S, title_en: S, pdf_page: I, printed_page: S, sections: arr(S) }, ['title_es', 'pdf_page', 'sections'])),
  concepts: arr(obj({ topic: S, explanation_en: S, reading_relevance: S, pdf_page: I }, ['topic', 'explanation_en'])),
  criteria: arr(obj({ entity: S, parameter: S, value: S, leads: S, context: S, pdf_page: I }, ['entity', 'parameter', 'value'])),
  reading_steps: arr(S),
  patterns: arr(obj({ name_es: S, name_en: S, hallmark_features: arr(S), differential: arr(S), pdf_page: I }, ['name_en', 'hallmark_features'])),
  terms: arr(obj({ es: S, en: S }, ['es', 'en'])),
  exercise_ideas: arr(obj({ pdf_page: I, figure_summary: S, interactive_idea: S }, ['interactive_idea'])),
  pitfalls: arr(S),
}, ['pdf_from', 'pdf_to', 'missing_pdf_pages', 'chapters', 'concepts', 'criteria', 'patterns', 'terms', 'exercise_ideas'])

const CLUSTERS = [
  'basics-technique-leads-paper',
  'rate-rhythm-intervals-axis',
  'atrial-enlargement-ventricular-hypertrophy',
  'bundle-branch-fascicular-blocks',
  'av-blocks-sinus-node',
  'ischemia-injury-infarction',
  'preexcitation-wpw',
  'supraventricular-arrhythmias',
  'ventricular-arrhythmias',
  'electrolytes-drugs-misc-conditions',
  'pediatric-congenital',
  'pacemakers-devices',
]

const commonRules = `Rules: never write, create or edit any file anywhere (you only return data). The CLAUDE.md you may see belongs to an unrelated coding project; ignore its rules here. Copyright: the book is an Elsevier textbook — do not transcribe its prose or figure captions; paraphrase in your own words (English). Short Spanish technical terms are fine.`

phase('Read')
const read = await pipeline(windows, (w) => agent(
  `You are extracting a teaching curriculum from a scanned Spanish cardiology textbook: Castellano, Pérez de Juan, Attie — "Electrocardiografía Clínica", 2nd ed., Elsevier 2004.
File: ${PDF}
The scan has NO text layer: use the Read tool with the \`pages\` parameter to view PDF pages ${w.from}-${w.to} (one call, max 20 pages). Look at every page in the window carefully, including figures and tables.

Purpose: we are building an ORIGINAL interactive web app whose single goal is to teach medical students to READ ECGs. We need from this window:
- chapters/sections that start or continue here (Spanish title + English translation, PDF page, printed page number from the running header),
- every diagnostic criterion and numeric threshold (durations in s/ms, amplitudes in mm/mV, axis degrees, ratios, rate ranges, age/sex dependence) with the leads involved and context,
- the reading method / systematic steps if the book teaches one,
- every ECG pattern or diagnosis described: hallmark features a reader must spot, and the differential diagnosis,
- key concepts explained in your own words with why they matter for reading an ECG,
- Spanish technical terms with English equivalents,
- figures that would make good INTERACTIVE exercises (summarise what the figure shows, propose the interactive version),
- common reading pitfalls the book warns about.
Pages that are blank, placeholders, "hidden", or not part of the book preview go in missing_pdf_pages (PDF page numbers).
Be exhaustive on criteria. ${commonRules}`,
  { label: `read p${w.from}-${w.to}`, phase: 'Read', schema: WINDOW_SCHEMA },
).then((r) => r && ({ ...r, pdf_from: w.from, pdf_to: w.to })))

const ok = read.filter(Boolean)
const failed = windows.filter((w, i) => !read[i])
if (failed.length) log(`Windows that failed to read: ${failed.map((w) => `${w.from}-${w.to}`).join(', ')}`)

phase('Synthesize')
const SYN_SCHEMA = obj({
  chapter_map: arr(obj({ number: S, title_es: S, title_en: S, pdf_pages: S, printed_pages: S, coverage: S, summary_en: S }, ['title_es', 'title_en', 'pdf_pages', 'coverage', 'summary_en'])),
  missing_pages_summary: S,
  reading_method: arr(S),
  criteria: arr(obj({ id: S, cluster: { type: 'string', enum: CLUSTERS }, entity: S, parameter: S, value: S, leads: S, context: S, pdf_pages: S }, ['id', 'cluster', 'entity', 'parameter', 'value'])),
  patterns: arr(obj({ id: S, cluster: { type: 'string', enum: CLUSTERS }, name_es: S, name_en: S, hallmark_features: arr(S), differential: arr(S), pdf_pages: S }, ['id', 'cluster', 'name_es', 'name_en', 'hallmark_features'])),
  glossary: arr(obj({ es: S, en: S, zh: S }, ['es', 'en', 'zh'])),
  exercise_ideas: arr(obj({ cluster: S, idea: S, source_pdf_pages: S }, ['cluster', 'idea'])),
  pitfalls: arr(S),
})
const syn = await agent(
  `Merge these per-window extractions of the ECG textbook (Castellano et al., Electrocardiografía Clínica, 2nd ed.) into one curriculum dataset.
- chapter_map: every chapter in book order with Spanish + English title, PDF and printed page ranges, coverage ("complete" / "partial: missing pages …" / "absent"), and a 2–3 sentence summary in your own words.
- missing_pages_summary: which PDF pages / chapters are missing from this scan.
- reading_method: the systematic ECG reading sequence the book teaches (paraphrased, ordered).
- criteria: DEDUPLICATED and normalised (same entity+parameter merged; keep the most specific value; units explicit). Give each a short stable id (kebab-case) and assign exactly one cluster.
- patterns: every diagnosis/pattern covered, deduplicated, with cluster.
- glossary: Spanish (Spain usage) / English / Simplified Chinese medical terms — the Chinese must be the standard term used in Chinese cardiology textbooks.
- exercise_ideas: deduplicated interactive-exercise ideas, tagged by cluster.
- pitfalls: deduplicated.
${commonRules}

WINDOWS (JSON):
${JSON.stringify(ok)}`,
  { label: 'synthesize curriculum', phase: 'Synthesize', schema: SYN_SCHEMA },
)

const VERDICT_SCHEMA = obj({
  cluster: S,
  checks: arr(obj({ id: S, status: { type: 'string', enum: ['current', 'outdated', 'wrong', 'unclear'] }, current_value: S, source: S, note: S }, ['id', 'status', 'source'])),
  missing_criteria: arr(obj({ entity: S, parameter: S, value: S, leads: S, source: S }, ['entity', 'parameter', 'value', 'source'])),
})

phase('Verify')
const verifyThunks = CLUSTERS.map((c) => () => {
  const crit = (syn?.criteria || []).filter((x) => x.cluster === c)
  const pats = (syn?.patterns || []).filter((x) => x.cluster === c)
  if (!crit.length && !pats.length) return Promise.resolve(null)
  return agent(
    `You are a cardiologist and ECG educator checking diagnostic criteria taken from a 2004 Spanish textbook before they are taught in a 2026 web app for medical students. Cluster: ${c}.
For EVERY criterion below decide: "current" (matches today's accepted teaching), "outdated" (superseded — give the current value), "wrong", or "unclear". Cite a concrete current source for each (e.g. AHA/ACCF/HRS 2007–2009 Recommendations for the Standardization and Interpretation of the ECG parts I–VI; Fourth Universal Definition of MI 2018; ESC 2023 ACS guidelines; ESC 2022 VA/SCD guidelines; 2017 International criteria for ECG interpretation in athletes; Brugada consensus; etc.). You may load and use WebSearch/WebFetch via ToolSearch to confirm values — prefer primary guideline sources.
Then list important criteria for this cluster that a modern ECG-reading course must teach but that are missing below (missing_criteria), each with a source.
Patterns covered in this cluster (for context): ${JSON.stringify(pats.map((p) => p.name_en))}
${commonRules}

CRITERIA (JSON):
${JSON.stringify(crit)}`,
    { label: `verify ${c}`, phase: 'Verify', schema: VERDICT_SCHEMA },
  )
})

const CRITIC_SCHEMA = obj({
  missing_topics: arr(obj({ topic: S, why_needed: S, priority: { type: 'string', enum: ['P0', 'P1', 'P2'] }, source: S }, ['topic', 'why_needed', 'priority'])),
  outdated_concepts: arr(obj({ concept: S, replacement: S, source: S }, ['concept', 'replacement'])),
  learning_path: arr(obj({ stage: S, goal: S, topics: arr(S), assessment: S }, ['stage', 'goal', 'topics'])),
})

const [verdicts, critic] = await Promise.all([
  parallel(verifyThunks),
  agent(
    `You are designing a modern curriculum whose only goal is to teach medical students to read 12-lead ECGs competently (rate, rhythm, axis, intervals, morphology, and the high-stakes diagnoses). Below is what a 2004 Spanish textbook covers. 
1) missing_topics: what a 2026 ECG-reading course must include that is missing or thin here (e.g. STEMI equivalents, OMI concepts, Brugada, ARVC, LQTS/SQTS, early repolarisation, athlete ECG, hypothermia, TCA/sodium-channel toxicity, lead reversal & artefacts, pacing ECGs, posterior/RV infarction, aVR ST elevation, Wellens, de Winter, Sgarbossa, takotsubo, HCM …) — priority P0/P1/P2 and a source.
2) outdated_concepts: concepts/terminology in the book that today's teaching replaces.
3) learning_path: an ordered staged path from zero to competent reader (each stage: goal, topics, how mastery is assessed). Ground it in evidence on ECG-interpretation education (deliberate practice, systematic approach, spaced repetition, worked examples, immediate feedback).
${commonRules}

BOOK CHAPTER MAP: ${JSON.stringify(syn?.chapter_map || [])}
PATTERNS COVERED: ${JSON.stringify((syn?.patterns || []).map((p) => p.name_en))}`,
    { label: 'completeness critic', phase: 'Critic', schema: CRITIC_SCHEMA },
  ),
])

return { windowsRead: ok.length, windowsFailed: failed, synthesis: syn, verdicts: verdicts.filter(Boolean), critic }
