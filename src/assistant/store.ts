/**
 * Assistant state (signals) and actions: open / close, the settings, the conversation, one streaming request at a
 * time (stop = abort). Streamed deltas are batched (~40 ms) before they reach the message signal, so a fast stream
 * does not re-render per token. The conversation lives in memory only (nothing of it is stored).
 */
import { computed, signal } from '@preact/signals';
import { route } from '../app/router';
import { store } from '../app/store';
import type { tai } from '../i18n/assistant';
import { AssistantError, type AssistantErrorCode, type AssistantSettings, type ChatRole, type ChatTurn } from './api';
import { pageContext } from './context';
import { streamChat } from './llm';
import { systemPrompt } from './prompt';
import { probeServer } from './providers/server';
import { effectiveModel, isConfigured, loadSettings, saveSettings } from './settings';

/** Whether this site has its own assistant endpoint (probed once, see checkServer). */
export interface ServerState {
  readonly status: 'unknown' | 'checking' | 'ready' | 'off';
  readonly model: string;
}

export type AssistantKey = Parameters<typeof tai>[0];

export type MessageStatus = 'streaming' | 'done' | 'stopped' | 'truncated' | 'refused' | 'error';

export interface ChatMessage {
  readonly id: number;
  readonly role: ChatRole;
  readonly content: string;
  /** assistant turns only */
  readonly status?: MessageStatus;
  readonly error?: { readonly code: AssistantErrorCode; readonly detail: string };
}

export type AssistantView = 'chat' | 'settings';

export const assistant = {
  open: signal(false),
  view: signal<AssistantView>('chat'),
  settings: signal<AssistantSettings>(loadSettings()),
  messages: signal<readonly ChatMessage[]>([]),
  draft: signal(''),
  busy: signal(false),
  /** a short note above the composer (a dictionary key), e.g. "configure the API first" */
  notice: signal<AssistantKey | null>(null),
  server: signal<ServerState>({ status: 'unknown', model: '' }),
};

export const configured = computed(() => isConfigured(assistant.settings.value, assistant.server.value.status === 'ready'));

let probing: Promise<void> | null = null;

/** Ask the site whether it has an assistant endpoint (once; `force` asks again). */
export function checkServer(force = false): Promise<void> {
  if (probing && !force) return probing;
  if (!force && (assistant.server.value.status === 'ready' || assistant.server.value.status === 'off')) return Promise.resolve();
  assistant.server.value = { ...assistant.server.value, status: 'checking' };
  probing = probeServer().then((info) => {
    assistant.server.value = info.enabled ? { status: 'ready', model: info.model } : { status: 'off', model: '' };
    if (configured.value && assistant.notice.value === 'notConfigured') assistant.notice.value = null;
  });
  return probing;
}

/** Turns sent with a request: the last MAX_TURNS completed turns, starting with the learner, same-role turns merged. */
export const MAX_TURNS = 12;

let nextId = 1;
let controller: AbortController | null = null;

export function openAssistant(opts?: { readonly prefill?: string; readonly send?: boolean }): void {
  assistant.open.value = true;
  if (opts?.prefill === undefined) return;
  if (opts.send && configured.value && !assistant.busy.value) {
    assistant.view.value = 'chat';
    void sendMessage(opts.prefill);
  } else {
    assistant.draft.value = opts.prefill;
    assistant.view.value = configured.value ? 'chat' : 'settings';
  }
}

export function closeAssistant(): void {
  assistant.open.value = false;
}

export function showSettings(): void {
  assistant.view.value = 'settings';
}

export function showChat(): void {
  assistant.view.value = 'chat';
  assistant.notice.value = null;
}

export function updateAssistantSettings(s: AssistantSettings): void {
  assistant.settings.value = saveSettings(s);
  if (configured.value) assistant.notice.value = null;
}

export function stopGeneration(): void {
  controller?.abort();
}

export function clearConversation(): void {
  stopGeneration();
  assistant.messages.value = [];
  assistant.notice.value = null;
}

/**
 * The turns a request carries: completed turns with text (errors, refusals and the pending reply are skipped),
 * consecutive same-role turns merged (some providers reject them), the last `max`, starting with the learner.
 */
export function historyTurns(msgs: readonly ChatMessage[], max = MAX_TURNS): ChatTurn[] {
  const complete = msgs.filter(
    (m) => m.content.trim() !== '' && (m.role === 'user' || m.status === 'done' || m.status === 'truncated' || m.status === 'stopped'),
  );
  const merged: ChatTurn[] = [];
  for (const m of complete) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) merged[merged.length - 1] = { role: last.role, content: `${last.content}\n\n${m.content}` };
    else merged.push({ role: m.role, content: m.content });
  }
  let turns = merged.slice(-max);
  while (turns.length > 0 && turns[0].role !== 'user') turns = turns.slice(1);
  return turns;
}

function patch(id: number, f: (m: ChatMessage) => ChatMessage): void {
  assistant.messages.value = assistant.messages.value.map((m) => (m.id === id ? f(m) : m));
}

export async function sendMessage(text: string): Promise<void> {
  const q = text.trim();
  if (q === '' || assistant.busy.value) return;
  const settings = assistant.settings.value;
  if (settings.provider === 'server' && assistant.server.value.status !== 'ready' && assistant.server.value.status !== 'off') await checkServer();
  if (assistant.busy.value) return;
  if (!isConfigured(settings, assistant.server.value.status === 'ready')) {
    assistant.draft.value = q;
    assistant.notice.value = 'notConfigured';
    assistant.view.value = 'settings';
    return;
  }
  const lang = store.lang.value;
  const ctx = pageContext(route.value, lang);
  const user: ChatMessage = { id: nextId++, role: 'user', content: q };
  const reply: ChatMessage = { id: nextId++, role: 'assistant', content: '', status: 'streaming' };
  const turns = historyTurns([...assistant.messages.value, user]);
  assistant.messages.value = [...assistant.messages.value, user, reply];
  assistant.busy.value = true;
  assistant.notice.value = null;

  const ac = new AbortController();
  controller = ac;
  let pending = '';
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending === '') return;
    const add = pending;
    pending = '';
    patch(reply.id, (m) => ({ ...m, content: m.content + add }));
  };
  try {
    const result = await streamChat(settings, {
      system: systemPrompt(lang, ctx),
      messages: turns,
      signal: ac.signal,
      onDelta: (d) => {
        pending += d;
        if (!timer) timer = setTimeout(flush, 40);
      },
    });
    flush();
    patch(reply.id, (m) => ({ ...m, content: result.text || m.content, status: result.stop }));
  } catch (e) {
    flush();
    const err = e instanceof AssistantError ? e : new AssistantError('unknown', e instanceof Error ? e.message : String(e));
    if (err.code === 'aborted') patch(reply.id, (m) => ({ ...m, status: 'stopped' }));
    else patch(reply.id, (m) => ({ ...m, status: 'error', error: { code: err.code, detail: err.detail } }));
  } finally {
    if (controller === ac) controller = null;
    assistant.busy.value = false;
  }
}

export type ConnectionTest = { readonly ok: true; readonly model: string } | { readonly ok: false; readonly error: AssistantError };

/** One tiny request with the given (possibly unsaved) settings. */
export async function testConnection(s: AssistantSettings): Promise<ConnectionTest> {
  try {
    if (s.provider === 'server') {
      await checkServer(true);
      if (assistant.server.value.status !== 'ready') throw new AssistantError('server', 'no server');
    }
    await streamChat(s, {
      system: 'This is a connection test. Reply with the single word OK.',
      messages: [{ role: 'user', content: 'Reply with OK.' }],
      maxTokens: 64,
    });
    return { ok: true, model: s.provider === 'server' ? assistant.server.value.model : effectiveModel(s) };
  } catch (e) {
    return { ok: false, error: e instanceof AssistantError ? e : new AssistantError('unknown', e instanceof Error ? e.message : String(e)) };
  }
}
