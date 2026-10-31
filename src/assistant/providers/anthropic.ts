/**
 * Claude through the official SDK (@anthropic-ai/sdk), called from the browser with the learner's own key
 * (`dangerouslyAllowBrowser`: the SDK then sends the `anthropic-dangerous-direct-browser-access` header the API
 * requires). Streaming via `client.beta.messages.stream` — the beta namespace carries the server-side refusal
 * fallbacks (`fallbacks: 'default'`), which re-run a declined request on another model inside the same call. The model
 * field is free text, so every model-specific parameter is gated by model id (an unsupported one is a 400):
 *   - `output_config.effort: 'low'` on the 4.6+ / 5.x families (a chat assistant wants fast, short answers);
 *   - `fallbacks` on Opus 5 / 5.5, Fable 5 / 5.1 and Sonnet 5.5 only (Haiku 5.5 and Sonnet 5 have none).
 * `thinking` is never sent (adaptive by default on current models) and no sampling parameters either.
 */
import Anthropic from '@anthropic-ai/sdk';
import { AssistantError, type AssistantSettings, type ChatRequest, type ChatResult } from '../api';
import { effectiveBaseUrl, effectiveModel } from '../settings';

export type StreamParams = Parameters<Anthropic['beta']['messages']['stream']>[0];

export type ModelFamily = 'claude5' | 'claude46' | 'other';

/** Which generation a model id belongs to ('other' = unknown or older: only the plain parameters are sent). */
export function modelFamily(model: string): ModelFamily {
  const m = model.trim().toLowerCase();
  if (/^claude-(opus|sonnet|haiku|fable|mythos)-5(-\d+)?$/.test(m)) return 'claude5';
  if (/^claude-(opus|sonnet)-4-[6-9]$/.test(m)) return 'claude46';
  return 'other';
}

export function supportsEffort(model: string): boolean {
  return modelFamily(model) !== 'other';
}

/** Server-side refusal fallbacks: Opus 5 / 5.5, Fable 5 / 5.1 (and Mythos), Sonnet 5.5. */
export function supportsFallbacks(model: string): boolean {
  return /^claude-(opus-5(-5)?|fable-5(-1)?|mythos-5(-1)?|sonnet-5-5)$/.test(model.trim().toLowerCase());
}

export const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export function buildAnthropicParams(model: string, req: ChatRequest, maxTokens: number): StreamParams {
  const params: StreamParams = {
    model,
    max_tokens: maxTokens,
    system: req.system,
    messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
  };
  if (supportsEffort(model)) params.output_config = { effort: 'low' };
  if (supportsFallbacks(model)) {
    params.fallbacks = 'default';
    params.betas = [FALLBACK_BETA];
  }
  return params;
}

/** The SDK's constructor options (not re-exported under the Anthropic namespace). */
export type ClientOptions = NonNullable<ConstructorParameters<typeof Anthropic>[0]>;

export type ClientFactory = (opts: ClientOptions) => Anthropic;

const defaultFactory: ClientFactory = (opts) => new Anthropic(opts);

/** The SDK's typed errors → the assistant's codes (most specific first; abort and connection errors extend APIError). */
export function mapAnthropicError(e: unknown): AssistantError {
  if (e instanceof AssistantError) return e;
  if (e instanceof Anthropic.APIUserAbortError) return new AssistantError('aborted', '');
  if (e instanceof Anthropic.APIConnectionError) return new AssistantError('network', e.message);
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return new AssistantError('auth', e.message);
  if (e instanceof Anthropic.RateLimitError) return new AssistantError('rate', e.message);
  if (e instanceof Anthropic.BadRequestError || e instanceof Anthropic.NotFoundError || e instanceof Anthropic.UnprocessableEntityError) {
    return new AssistantError('request', e.message);
  }
  if (e instanceof Anthropic.InternalServerError) return new AssistantError('server', e.message);
  if (e instanceof Anthropic.APIError) return new AssistantError('unknown', e.message);
  if (typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'AbortError') return new AssistantError('aborted', '');
  return new AssistantError('unknown', e instanceof Error ? e.message : String(e));
}

export async function streamAnthropic(settings: AssistantSettings, req: ChatRequest, maxTokens: number, make: ClientFactory = defaultFactory): Promise<ChatResult> {
  const client = make({
    apiKey: settings.apiKey.trim(),
    baseURL: effectiveBaseUrl(settings),
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
  });
  const params = buildAnthropicParams(effectiveModel(settings), req, maxTokens);
  try {
    const stream = client.beta.messages.stream(params, { signal: req.signal });
    stream.on('text', (delta) => req.onDelta?.(delta));
    const final = await stream.finalMessage();
    const text = final.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    const stop = final.stop_reason === 'refusal' ? 'refused' : final.stop_reason === 'max_tokens' ? 'truncated' : 'done';
    return { text, stop };
  } catch (e) {
    throw mapAnthropicError(e);
  }
}
