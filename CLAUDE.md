# ECG Academy — project rules

Goal (the one principle): **teach people to read ECGs.** Every feature is judged by whether it makes a learner a better,
faster, safer reader of a real 12-lead ECG. The ECG is always the protagonist; any 3D/heart view is secondary and explains "why".
Audience: medical students (and nurses/residents). UI in zh / en / es.

## Hard boundaries
- Never create, edit, move or delete anything under `C:\Users\A511741\Desktop\Workspace\Dynamic Electrocardiogram`
  (the old project). Reading it for ideas is fine; copying a file *into* this project is fine.
- Book reference (Castellano, Pérez de Juan, Attie — *Electrocardiografía Clínica*, 2nd ed., Elsevier 2004): use it only for
  curriculum structure, criteria and terminology. Never reproduce its prose, tables or figures; write original text; cite it.
- Real ECGs: PTB-XL v1.0.3 and PTB-XL+ v1.0.1 (PhysioNet, CC BY 4.0) — attribution shown in the app. Raw downloads live in
  `data-raw/` (never shipped, never edited by hand); only the derived compressed bundle ships.

## Synthetic ECGs (one-source rule)
- All 12 leads of a synthetic ECG are computed from one cardiac source description through one lead system
  (limb leads obey Einthoven/Goldberger exactly; precordials are referenced to Wilson's central terminal).
- Never draw or edit a waveform per lead. A condition may only change the rhythm, the activation/repolarization model,
  regional parameters, geometry/lead positions (e.g. electrode misplacement) or the recording chain (noise, filters, gain).
- The truth used for grading (intervals, axis, rhythm labels) comes from the model's own timing, and must agree with what is
  measurable on the signal.

## Heart Lab (`src/lab/`) — merged 2026-10-17
- The user decided to merge the old site into this one: ECG Academy is the main site; the old "Dynamic Electrocardiogram"
  app (3D heart + live 12-lead, disease library, blood flow, click-to-freeze) is copied into `src/lab/` as the Heart Lab
  section (`#/lab`, `#/lab/<scenario>`). The old project folder itself stays untouched.
- The lab keeps its own engine and its own rules (voxel one-source rule, see `src/lab/README.md`); courses, drills, atlas
  and exam use `src/synth`. Never mix the two engines in one view; link from a lesson/atlas page to the lab with
  `labHref(findingId)` (`src/lab/links.ts`) when the lab has that condition.
- All lab CSS is scoped under `.lab-root`; the lab follows the main app's language and theme (bridged in `src/lab/index.tsx`).

## AI study assistant (`src/assistant/`) — added 2026-10-31
- An opt-in chat panel (floating button, non-modal) that explains terms, criteria and mechanisms through the LLM API the
  learner configures themself (settings panel / settings page: provider, key, base URL, model). Nothing is sent until a
  key is saved; the key lives only in this browser (`ecg-academy:assistant:v1`, sessionStorage when "remember" is off)
  and never inside the app's preferences. This is the **one runtime network exception** to the "no external network
  resources" convention below: the app works fully without it, and no page, grade or truth ever depends on an answer.
- Two providers: Claude through the official `@anthropic-ai/sdk` (`client.beta.messages.stream`, browser mode, model
  gated parameters: `effort: low`, server-side refusal `fallbacks` on the models that support them), and any
  OpenAI-compatible `chat/completions` endpoint over fetch (DeepSeek, Qwen, Moonshot, Ollama…). Never call Claude through
  the OpenAI-compatible path.
- What travels: the system prompt (`prompt.ts`), the conversation, and a short description of the current page
  (`context.ts`: lesson title + current step, atlas definition + criteria, drill family title). **Never** ECG signal data,
  a real case's labels or measurements, a drill item, seed or topic, or a lesson hook's reveal — the model is told it
  cannot see the tracing and must not guess an answer. Replies are Markdown rendered to VNodes (`markdown.ts`), never
  innerHTML. The shell gets the dock and the settings section through slots (`assistantSlot`, `assistantSettingsSlot`);
  `src/app` never imports `src/assistant`.

## Conventions
- TypeScript strict, ESM, Preact + @preact/signals, three r186 (the small 3D heart and the Heart Lab). No enums (`as const` objects).
- No external network resources at runtime (no CDN, no web fonts; the only exception is the opt-in AI assistant calling
  the endpoint the learner configured). Build → one self-contained `dist/index.html`.
- i18n: zh / en / es for every user-visible string; medical terms must be correct in all three (Spanish: Spain usage —
  "derivación", "aurícula", "onda", "segmento", "bloqueo de rama").
- Light "textbook" theme (pink ECG paper) is the default; dark theme via CSS tokens only.
- Layout stability: any box whose text changes quickly has a fixed size (tabular digits, reserved height); short animations
  play once and hold — no flicker loops.
- localStorage only inside try/catch. Seeded randomness only (exercises reproducible from a seed).
- Tests: Vitest in `tests/` mirroring `src/`. Run `npm test` and `npm run typecheck` before finishing.
- `_proto/` holds throwaway design prototypes; nothing in `src/` imports from it.
