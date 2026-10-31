/**
 * Assistant state and actions (src/assistant/store.ts) with the LLM call replaced: the history sent with a request,
 * the unconfigured path (settings view + notice), a streamed reply (deltas batched into the message), stop (partial
 * reply kept), errors, and wiring into the shell slots.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/assistant/llm', () => ({
  MAX_TOKENS: 4096,
  streamChat: vi.fn(),
}));

import { assistantSettingsSlot, assistantSlot } from '../../src/app/slots';
import { AssistantDock, AssistantSettingsSection, wireAssistant } from '../../src/assistant';
import { AssistantError, type ChatRequest, type ChatResult } from '../../src/assistant/api';
import { streamChat } from '../../src/assistant/llm';
import {
  assistant,
  clearConversation,
  historyTurns,
  openAssistant,
  sendMessage,
  stopGeneration,
  testConnection,
  updateAssistantSettings,
  type ChatMessage,
} from '../../src/assistant/store';

const mockedStream = vi.mocked(streamChat);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const msg = (id: number, role: 'user' | 'assistant', content: string, status?: ChatMessage['status']): ChatMessage => ({ id, role, content, status });

beforeEach(() => {
  mockedStream.mockReset();
  assistant.messages.value = [];
  assistant.draft.value = '';
  assistant.notice.value = null;
  assistant.view.value = 'chat';
  assistant.open.value = false;
  assistant.settings.value = { provider: 'openai', apiKey: 'k', baseUrl: 'https://x/v1', model: 'm', remember: true };
});
afterEach(() => vi.unstubAllGlobals());

describe('historyTurns', () => {
  it('keeps completed turns, merges same-role runs, trims to the last N and starts with the learner', () => {
    const msgs = [
      msg(1, 'assistant', 'greeting', 'done'),
      msg(2, 'user', 'q1'),
      msg(3, 'assistant', '', 'error'),
      msg(4, 'user', 'q2'),
      msg(5, 'assistant', 'partial', 'stopped'),
      msg(6, 'user', 'q3'),
      msg(7, 'assistant', '', 'streaming'),
    ];
    expect(historyTurns(msgs)).toEqual([
      { role: 'user', content: 'q1\n\nq2' },
      { role: 'assistant', content: 'partial' },
      { role: 'user', content: 'q3' },
    ]);
    expect(historyTurns(msgs, 2)).toEqual([{ role: 'user', content: 'q3' }]);
  });
});

describe('sendMessage', () => {
  it('without a configured API: keeps the draft, shows the notice and opens the settings view, sends nothing', async () => {
    assistant.settings.value = { provider: 'anthropic', apiKey: '', baseUrl: '', model: '', remember: true };
    await sendMessage('什么是 QTc？');
    expect(mockedStream).not.toHaveBeenCalled();
    expect(assistant.messages.value).toEqual([]);
    expect(assistant.draft.value).toBe('什么是 QTc？');
    expect(assistant.notice.value).toBe('notConfigured');
    expect(assistant.view.value).toBe('settings');
  });

  it('streams a reply: the user turn and a streaming placeholder appear at once, deltas arrive batched, the end sets the status', async () => {
    let release: (r: ChatResult) => void = () => {};
    mockedStream.mockImplementation((_s, req: ChatRequest) => {
      req.onDelta?.('QTc ');
      req.onDelta?.('corrects the QT.');
      return new Promise<ChatResult>((resolve) => (release = resolve));
    });
    const p = sendMessage('What is QTc?');
    expect(assistant.busy.value).toBe(true);
    expect(assistant.messages.value.map((m) => [m.role, m.status])).toEqual([
      ['user', undefined],
      ['assistant', 'streaming'],
    ]);
    await wait(80);
    expect(assistant.messages.value[1].content).toBe('QTc corrects the QT.');
    release({ text: 'QTc corrects the QT.', stop: 'done' });
    await p;
    expect(assistant.busy.value).toBe(false);
    expect(assistant.messages.value[1]).toMatchObject({ role: 'assistant', content: 'QTc corrects the QT.', status: 'done' });
    const req = mockedStream.mock.calls[0][1];
    expect(req.messages).toEqual([{ role: 'user', content: 'What is QTc?' }]);
    expect(req.system).toContain('ECG Academy');
  });

  it('a second request carries the earlier turns; a truncated stop is reported', async () => {
    mockedStream.mockResolvedValueOnce({ text: 'A1', stop: 'done' });
    await sendMessage('Q1');
    mockedStream.mockResolvedValueOnce({ text: 'A2 cut', stop: 'truncated' });
    await sendMessage('Q2');
    const req = mockedStream.mock.calls[1][1];
    expect(req.messages).toEqual([
      { role: 'user', content: 'Q1' },
      { role: 'assistant', content: 'A1' },
      { role: 'user', content: 'Q2' },
    ]);
    expect(assistant.messages.value[3]).toMatchObject({ content: 'A2 cut', status: 'truncated' });
  });

  it('stop aborts the request and keeps the partial reply as "stopped"', async () => {
    mockedStream.mockImplementation((_s, req: ChatRequest) => {
      req.onDelta?.('partial ');
      return new Promise<ChatResult>((_resolve, reject) => {
        req.signal?.addEventListener('abort', () => reject(new AssistantError('aborted', '')));
      });
    });
    const p = sendMessage('long question');
    await wait(60);
    stopGeneration();
    await p;
    expect(assistant.busy.value).toBe(false);
    expect(assistant.messages.value[1]).toMatchObject({ content: 'partial ', status: 'stopped' });
  });

  it('a provider error is recorded on the reply with its code and detail, and is not resent as history', async () => {
    mockedStream.mockRejectedValueOnce(new AssistantError('auth', 'invalid key'));
    await sendMessage('q');
    expect(assistant.messages.value[1]).toMatchObject({ status: 'error', error: { code: 'auth', detail: 'invalid key' } });
    mockedStream.mockResolvedValueOnce({ text: 'ok', stop: 'done' });
    await sendMessage('q2');
    expect(mockedStream.mock.calls[1][1].messages).toEqual([{ role: 'user', content: 'q\n\nq2' }]);
  });

  it('ignores empty text and a send while busy', async () => {
    await sendMessage('   ');
    expect(mockedStream).not.toHaveBeenCalled();
    let release: (r: ChatResult) => void = () => {};
    mockedStream.mockImplementation(() => new Promise<ChatResult>((resolve) => (release = resolve)));
    const p = sendMessage('first');
    await sendMessage('second while busy');
    expect(mockedStream).toHaveBeenCalledTimes(1);
    release({ text: 'done', stop: 'done' });
    await p;
  });

  it('clearConversation empties the thread', async () => {
    mockedStream.mockResolvedValueOnce({ text: 'A', stop: 'done' });
    await sendMessage('Q');
    expect(assistant.messages.value).toHaveLength(2);
    clearConversation();
    expect(assistant.messages.value).toEqual([]);
  });
});

describe('openAssistant and settings', () => {
  it('opens; with send: true and a configured API the prefill is sent, otherwise it becomes the draft', async () => {
    mockedStream.mockResolvedValueOnce({ text: 'A', stop: 'done' });
    openAssistant({ prefill: 'Explain "Wenckebach".', send: true });
    expect(assistant.open.value).toBe(true);
    await wait(0);
    expect(mockedStream).toHaveBeenCalledTimes(1);
    assistant.settings.value = { provider: 'anthropic', apiKey: '', baseUrl: '', model: '', remember: true };
    openAssistant({ prefill: 'draft only', send: true });
    expect(assistant.draft.value).toBe('draft only');
    expect(assistant.view.value).toBe('settings');
  });

  it('updateAssistantSettings sanitises, stores and clears the notice once configured', () => {
    vi.stubGlobal('localStorage', undefined);
    vi.stubGlobal('sessionStorage', undefined);
    assistant.notice.value = 'notConfigured';
    updateAssistantSettings({ provider: 'anthropic', apiKey: ' sk ', baseUrl: 'https://relay/', model: '', remember: true });
    expect(assistant.settings.value).toEqual({ provider: 'anthropic', apiKey: 'sk', baseUrl: 'https://relay', model: '', remember: true });
    expect(assistant.notice.value).toBeNull();
  });

  it('testConnection reports success with the effective model, or the mapped error', async () => {
    mockedStream.mockResolvedValueOnce({ text: 'OK', stop: 'done' });
    const s = { provider: 'anthropic' as const, apiKey: 'k', baseUrl: '', model: '', remember: true };
    expect(await testConnection(s)).toEqual({ ok: true, model: 'claude-opus-5-5' });
    expect(mockedStream.mock.calls[0][1].maxTokens).toBe(64);
    mockedStream.mockRejectedValueOnce(new AssistantError('network', 'Failed to fetch'));
    const r = await testConnection(s);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('network');
  });
});

describe('wireAssistant', () => {
  it('plugs the dock and the settings section into the shell slots', () => {
    wireAssistant();
    expect(assistantSlot.value).toBe(AssistantDock);
    expect(assistantSettingsSlot.value).toBe(AssistantSettingsSection);
  });
});
