/**
 * One streaming chat call, dispatched to the configured provider. All providers resolve to the same ChatResult and
 * throw the same AssistantError codes, so the store and the UI know nothing about either API.
 */
import type { AssistantSettings, ChatRequest, ChatResult } from './api';
import { streamAnthropic } from './providers/anthropic';
import { streamOpenAi } from './providers/openai';
import { streamServer } from './providers/server';

/** Reply cap: answers are deliberately short (the system prompt asks for a definition plus a few points). */
export const MAX_TOKENS = 4096;

export function streamChat(settings: AssistantSettings, req: ChatRequest): Promise<ChatResult> {
  switch (settings.provider) {
    case 'server':
      return streamServer({ ...req, maxTokens: req.maxTokens ?? MAX_TOKENS });
    case 'anthropic':
      return streamAnthropic(settings, req, req.maxTokens ?? MAX_TOKENS);
    case 'openai':
      return streamOpenAi(settings, req);
  }
}
