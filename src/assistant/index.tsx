/**
 * src/assistant — the AI study assistant (opt-in; the learner's own LLM API key, called from the browser). Public
 * entry; the shell gets the dock and the settings section through slots (src/app/slots.ts), so src/app never imports
 * this module:
 *   AssistantDock              floating button + panel, rendered by the shell after the tab bar
 *   AssistantSettingsForm      provider / key / base URL / model form (the panel and the settings page share it)
 *   wireAssistant()            plugs both into the shell slots (call once from src/main.tsx)
 *   openAssistant(opts?)       open the panel, optionally with a prefilled or auto-sent question
 *   pageContext(route, lang)   what the assistant is told about a page (pure; for tests and other modules)
 */
import { assistantSettingsSlot, assistantSlot } from '../app/slots';
import { AssistantDock, AssistantSettingsForm } from './Assistant';
import { checkServer } from './store';

export { AssistantDock, AssistantSettingsForm } from './Assistant';
export { openAssistant, sendMessage } from './store';
export { pageContext, type ContextKind, type PageContext } from './context';
export { systemPrompt } from './prompt';
export type { AssistantSettings, ProviderId } from './api';

/** The settings page draws the section frame (title, hint); this is its content. */
export function AssistantSettingsSection() {
  return <AssistantSettingsForm />;
}

/** Plug the assistant into the shell: the floating dock and the settings-page section (call once from src/main.tsx). */
export function wireAssistant(): void {
  assistantSlot.value = AssistantDock;
  assistantSettingsSlot.value = AssistantSettingsSection;
  // only where the page comes from a server (a single-file copy opened from disk has no endpoint to ask)
  if (/^https?:$/.test(globalThis.location?.protocol ?? '')) void checkServer();
}
