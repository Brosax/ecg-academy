/**
 * The Anthropic provider (src/assistant/providers/anthropic.ts): model-gated parameters (effort, server-side refusal
 * fallbacks), the SDK error mapping, and the streaming call against a fake client (text events, final message, stop
 * reasons, browser flag and base URL).
 */
import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
import { AssistantError, type AssistantSettings } from '../../src/assistant/api';
import {
  buildAnthropicParams,
  FALLBACK_BETA,
  mapAnthropicError,
  modelFamily,
  streamAnthropic,
  supportsEffort,
  supportsFallbacks,
  type ClientFactory,
  type ClientOptions,
  type StreamParams,
} from '../../src/assistant/providers/anthropic';
import { DEFAULT_MODEL } from '../../src/assistant/settings';

const SETTINGS: AssistantSettings = { provider: 'anthropic', apiKey: ' sk-ant-test ', baseUrl: '', model: '', remember: true };
const REQ = { system: 'SYS', messages: [{ role: 'user' as const, content: 'What is QTc?' }] };

describe('model gating', () => {
  it('classifies model ids', () => {
    expect(modelFamily('claude-opus-5-5')).toBe('claude5');
    expect(modelFamily('claude-sonnet-5')).toBe('claude5');
    expect(modelFamily('claude-haiku-5-5')).toBe('claude5');
    expect(modelFamily('claude-fable-5-1')).toBe('claude5');
    expect(modelFamily('claude-opus-4-7')).toBe('claude46');
    expect(modelFamily('claude-sonnet-4-6')).toBe('claude46');
    expect(modelFamily('claude-haiku-4-5')).toBe('other');
    expect(modelFamily('claude-sonnet-4-5-20250929')).toBe('other');
    expect(modelFamily('gpt-4o')).toBe('other');
  });
  it('effort on 4.6+ and 5.x only; fallbacks on Opus 5 / 5.5, Fable 5 / 5.1, Sonnet 5.5 only', () => {
    expect(supportsEffort('claude-opus-5-5')).toBe(true);
    expect(supportsEffort('claude-opus-4-6')).toBe(true);
    expect(supportsEffort('claude-haiku-4-5')).toBe(false);
    for (const m of ['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-fable-5', 'claude-sonnet-5-5']) expect(supportsFallbacks(m), m).toBe(true);
    for (const m of ['claude-haiku-5-5', 'claude-sonnet-5', 'claude-opus-4-8', 'claude-opus-4-6', 'gpt-4o']) expect(supportsFallbacks(m), m).toBe(false);
  });
  it('builds the params: the default model gets low effort, default fallbacks and the beta; an old model gets neither', () => {
    const p = buildAnthropicParams(DEFAULT_MODEL.anthropic, REQ, 4096);
    expect(p.model).toBe('claude-opus-5-5');
    expect(p.max_tokens).toBe(4096);
    expect(p.system).toBe('SYS');
    expect(p.messages).toEqual([{ role: 'user', content: 'What is QTc?' }]);
    expect(p.output_config).toEqual({ effort: 'low' });
    expect(p.fallbacks).toBe('default');
    expect(p.betas).toEqual([FALLBACK_BETA]);
    expect('thinking' in p).toBe(false);
    expect('temperature' in p).toBe(false);

    const h = buildAnthropicParams('claude-haiku-5-5', REQ, 100);
    expect(h.output_config).toEqual({ effort: 'low' });
    expect('fallbacks' in h).toBe(false);
    expect('betas' in h).toBe(false);

    const old = buildAnthropicParams('claude-haiku-4-5', REQ, 100);
    expect('output_config' in old).toBe(false);
    expect('fallbacks' in old).toBe(false);
  });
});

describe('error mapping', () => {
  it('maps the SDK error classes to codes', () => {
    const h = new Headers();
    expect(mapAnthropicError(new Anthropic.AuthenticationError(401, { error: { message: 'invalid x-api-key' } }, 'invalid x-api-key', h)).code).toBe('auth');
    expect(mapAnthropicError(new Anthropic.RateLimitError(429, undefined, 'rate', h)).code).toBe('rate');
    expect(mapAnthropicError(new Anthropic.BadRequestError(400, undefined, 'bad', h)).code).toBe('request');
    expect(mapAnthropicError(new Anthropic.NotFoundError(404, undefined, 'no model', h)).code).toBe('request');
    expect(mapAnthropicError(new Anthropic.InternalServerError(500, undefined, 'oops', h)).code).toBe('server');
    expect(mapAnthropicError(new Anthropic.APIConnectionError({ message: 'Connection error.' })).code).toBe('network');
    expect(mapAnthropicError(new Anthropic.APIUserAbortError()).code).toBe('aborted');
    expect(mapAnthropicError(Object.assign(new Error('x'), { name: 'AbortError' })).code).toBe('aborted');
    expect(mapAnthropicError(new Error('weird')).code).toBe('unknown');
    const own = new AssistantError('rate', 'r');
    expect(mapAnthropicError(own)).toBe(own);
  });
});

interface FakeCall {
  readonly opts: ClientOptions;
  readonly params: StreamParams;
  readonly signal: AbortSignal | null | undefined;
}

function fakeClient(deltas: readonly string[], stopReason: string, calls: FakeCall[]): ClientFactory {
  return (opts) => {
    const client = {
      beta: {
        messages: {
          stream: (params: StreamParams, options?: { signal?: AbortSignal | null }) => {
            calls.push({ opts, params, signal: options?.signal });
            const listeners: ((d: string, snapshot: string) => void)[] = [];
            let snapshot = '';
            const stream = {
              on(event: string, fn: (d: string, s: string) => void) {
                if (event === 'text') listeners.push(fn);
                return stream;
              },
              async finalMessage() {
                for (const d of deltas) {
                  snapshot += d;
                  for (const l of listeners) l(d, snapshot);
                }
                return { content: [{ type: 'text', text: snapshot }], stop_reason: stopReason };
              },
            };
            return stream;
          },
        },
      },
    };
    return client as unknown as Anthropic;
  };
}

describe('streamAnthropic', () => {
  it('creates a browser client with the trimmed key and the default base URL, streams deltas and returns the final text', async () => {
    const calls: FakeCall[] = [];
    const deltas: string[] = [];
    const ac = new AbortController();
    const r = await streamAnthropic(SETTINGS, { ...REQ, signal: ac.signal, onDelta: (d) => deltas.push(d) }, 2048, fakeClient(['QTc ', 'is…'], 'end_turn', calls));
    expect(r).toEqual({ text: 'QTc is…', stop: 'done' });
    expect(deltas).toEqual(['QTc ', 'is…']);
    expect(calls).toHaveLength(1);
    expect(calls[0].opts.apiKey).toBe('sk-ant-test');
    expect(calls[0].opts.baseURL).toBe('https://api.anthropic.com');
    expect(calls[0].opts.dangerouslyAllowBrowser).toBe(true);
    expect(calls[0].params.model).toBe('claude-opus-5-5');
    expect(calls[0].params.max_tokens).toBe(2048);
    expect(calls[0].signal).toBe(ac.signal);
  });

  it('a proxy base URL and a custom model are passed through; refusal and max_tokens map to stop kinds', async () => {
    const calls: FakeCall[] = [];
    const s = { ...SETTINGS, baseUrl: 'https://relay.example.com/anthropic/', model: 'claude-haiku-5-5' };
    const r1 = await streamAnthropic(s, REQ, 100, fakeClient([], 'refusal', calls));
    expect(r1.stop).toBe('refused');
    expect(calls[0].opts.baseURL).toBe('https://relay.example.com/anthropic');
    expect(calls[0].params.model).toBe('claude-haiku-5-5');
    expect('fallbacks' in calls[0].params).toBe(false);
    const r2 = await streamAnthropic(s, REQ, 100, fakeClient(['cut'], 'max_tokens', calls));
    expect(r2).toEqual({ text: 'cut', stop: 'truncated' });
  });

  it('SDK errors are mapped', async () => {
    const make: ClientFactory = () =>
      ({
        beta: {
          messages: {
            stream: () => {
              throw new Anthropic.AuthenticationError(401, undefined, 'bad key', new Headers());
            },
          },
        },
      }) as unknown as Anthropic;
    const e = (await streamAnthropic(SETTINGS, REQ, 100, make).catch((x: unknown) => x)) as AssistantError;
    expect(e).toBeInstanceOf(AssistantError);
    expect(e.code).toBe('auth');
  });
});
