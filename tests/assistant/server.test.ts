/**
 * The site's assistant endpoint (server/assistant.ts) and its browser client (src/assistant/providers/server.ts):
 * GET reports whether a key is configured; POST validates, checks origin and rate, calls Claude through the SDK
 * (fake client) and streams {t}/{stop}/{error}; the client reads that stream back into a ChatResult. The two are
 * also run end to end (client fetch → handler) without a network.
 */
import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
import { AssistantError } from '../../src/assistant/api';
import type { FetchLike } from '../../src/assistant/providers/openai';
import { probeServer, serverUrl, streamServer } from '../../src/assistant/providers/server';
import type { ClientFactory, StreamParams } from '../../src/assistant/providers/anthropic';
import { createRateLimiter, DEFAULT_SERVER_MODEL, handleAssistant, LIMITS, originAllowed, parseBody, serverError } from '../../server/assistant';

const SITE = 'https://ecg.example.com';
const ENV = { ANTHROPIC_API_KEY: 'sk-ant-server' };
const BODY = { system: 'SYS', messages: [{ role: 'user', content: 'What is QTc?' }] };

function fakeClient(deltas: readonly string[], stopReason: string, seen: { opts?: unknown; params?: StreamParams }[] = []): ClientFactory {
  return (opts) =>
    ({
      beta: {
        messages: {
          stream: (params: StreamParams) => {
            seen.push({ opts, params });
            const fns: ((d: string) => void)[] = [];
            const s = {
              on(ev: string, fn: (d: string) => void) {
                if (ev === 'text') fns.push(fn);
                return s;
              },
              async finalMessage() {
                for (const d of deltas) for (const f of fns) f(d);
                return { content: [{ type: 'text', text: deltas.join('') }], stop_reason: stopReason };
              },
            };
            return s;
          },
        },
      },
    }) as unknown as Anthropic;
}

const post = (body: unknown, origin: string | null = SITE, extra: Record<string, string> = {}) =>
  new Request(`${SITE}/api/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}), ...extra },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const allowAll = { allow: () => true };

describe('parseBody', () => {
  it('accepts a valid conversation and clamps maxTokens', () => {
    expect(parseBody({ ...BODY, maxTokens: 99999 })).toEqual({ system: 'SYS', messages: BODY.messages, maxTokens: LIMITS.maxTokens });
    expect(parseBody({ ...BODY, maxTokens: 1 })).toMatchObject({ maxTokens: LIMITS.minTokens });
    expect(parseBody(BODY)).toMatchObject({ maxTokens: LIMITS.maxTokens });
  });
  it('rejects bad shapes, roles, order and sizes', () => {
    expect(typeof parseBody(null)).toBe('string');
    expect(typeof parseBody({ system: 1, messages: BODY.messages })).toBe('string');
    expect(typeof parseBody({ system: '', messages: [] })).toBe('string');
    expect(typeof parseBody({ system: '', messages: [{ role: 'system', content: 'x' }] })).toBe('string');
    expect(typeof parseBody({ system: '', messages: [{ role: 'assistant', content: 'x' }] })).toBe('string');
    expect(typeof parseBody({ system: '', messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] })).toBe('string');
    expect(typeof parseBody({ system: '', messages: [{ role: 'user', content: 'x'.repeat(LIMITS.turnChars + 1) }] })).toBe('string');
    expect(typeof parseBody({ system: 'x'.repeat(LIMITS.systemChars + 1), messages: BODY.messages })).toBe('string');
    const many = Array.from({ length: LIMITS.turns + 1 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x' }));
    expect(typeof parseBody({ system: '', messages: many })).toBe('string');
  });
});

describe('origin and rate guards', () => {
  it('same origin by default; an explicit list replaces it; no Origin header is refused', () => {
    expect(originAllowed(post(BODY), {})).toBe(true);
    expect(originAllowed(post(BODY, 'https://evil.example'), {})).toBe(false);
    expect(originAllowed(post(BODY, null), {})).toBe(false);
    expect(originAllowed(post(BODY, 'https://www.example.com'), { ALLOWED_ORIGINS: 'https://example.com, https://www.example.com/' })).toBe(true);
    expect(originAllowed(post(BODY), { ALLOWED_ORIGINS: 'https://example.com' })).toBe(false);
  });
  it('the limiter allows N per window per key', () => {
    const allow = createRateLimiter(2, 1000);
    expect([allow('a', 0), allow('a', 1), allow('a', 2), allow('b', 2), allow('a', 1001)]).toEqual([true, true, false, true, true]);
  });
  it('key or region problems on the server are reported as a server problem, not the learner’s key', () => {
    expect(serverError(new Anthropic.AuthenticationError(401, undefined, 'bad', new Headers())).code).toBe('server');
    expect(serverError(new Anthropic.PermissionDeniedError(403, undefined, 'region', new Headers())).code).toBe('server');
    expect(serverError(new Anthropic.RateLimitError(429, undefined, 'slow down', new Headers())).code).toBe('rate');
  });
});

describe('handleAssistant', () => {
  it('GET reports whether the server has a key, and its model', async () => {
    const on = await handleAssistant(new Request(`${SITE}/api/assistant`), ENV);
    expect(await on.json()).toEqual({ enabled: true, model: DEFAULT_SERVER_MODEL });
    const custom = await handleAssistant(new Request(`${SITE}/api/assistant`), { ...ENV, ASSISTANT_MODEL: 'claude-sonnet-5-5' });
    expect(await custom.json()).toEqual({ enabled: true, model: 'claude-sonnet-5-5' });
    const off = await handleAssistant(new Request(`${SITE}/api/assistant`), {});
    expect(await off.json()).toEqual({ enabled: false, model: '' });
  });

  it('refuses without a key (503), from another origin (403), over the rate (429), with a bad body (400)', async () => {
    expect((await handleAssistant(post(BODY), {}, allowAll)).status).toBe(503);
    expect((await handleAssistant(post(BODY, 'https://evil.example'), ENV, allowAll)).status).toBe(403);
    expect((await handleAssistant(post(BODY), ENV, { allow: () => false })).status).toBe(429);
    expect((await handleAssistant(post('{nope'), ENV, allowAll)).status).toBe(400);
    const bad = await handleAssistant(post({ system: '', messages: [] }), ENV, allowAll);
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ error: { code: 'request' } });
  });

  it('streams text events and the stop; the server key, fixed model and gated params reach the SDK', async () => {
    const seen: { opts?: unknown; params?: StreamParams }[] = [];
    const res = await handleAssistant(post({ ...BODY, maxTokens: 500 }), ENV, { ...allowAll, makeClient: fakeClient(['QTc ', 'is…'], 'end_turn', seen) });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const text = await res.text();
    expect(text).toBe('data: {"t":"QTc "}\n\ndata: {"t":"is…"}\n\ndata: {"stop":"done"}\n\n');
    expect(seen[0].opts).toMatchObject({ apiKey: 'sk-ant-server' });
    expect(seen[0].opts).not.toHaveProperty('dangerouslyAllowBrowser');
    expect(seen[0].params).toMatchObject({ model: 'claude-opus-5-5', max_tokens: 500, system: 'SYS', fallbacks: 'default', output_config: { effort: 'low' } });
  });

  it('an SDK failure mid-call becomes an error event', async () => {
    const make: ClientFactory = () =>
      ({
        beta: {
          messages: {
            stream: () => {
              throw new Anthropic.AuthenticationError(401, undefined, 'invalid x-api-key', new Headers());
            },
          },
        },
      }) as unknown as Anthropic;
    const res = await handleAssistant(post(BODY), ENV, { ...allowAll, makeClient: make });
    expect(await res.text()).toContain('"error":{"code":"server"');
  });
});

describe('browser client', () => {
  it('serverUrl only over http(s)', () => {
    expect(serverUrl({ protocol: 'https:', href: `${SITE}/#/learn/f1` })).toBe(`${SITE}/api/assistant`);
    expect(serverUrl({ protocol: 'file:', href: 'file:///C:/dist/index.html' })).toBeNull();
    expect(serverUrl(undefined)).toBeNull();
  });

  /** fetch that hands the request to the real handler (same origin, fake Claude). */
  const viaHandler =
    (env: typeof ENV | Record<string, never>, makeClient: ClientFactory): FetchLike =>
    (url, init) =>
      handleAssistant(new Request(url, { ...init, headers: { ...(init.headers as Record<string, string>), Origin: SITE } }), env, { allow: () => true, makeClient });

  it('probe: enabled with the model, or off on any failure', async () => {
    expect(await probeServer(viaHandler(ENV, fakeClient([], 'end_turn')), `${SITE}/api/assistant`)).toEqual({ enabled: true, model: DEFAULT_SERVER_MODEL });
    expect(await probeServer(viaHandler({}, fakeClient([], 'end_turn')), `${SITE}/api/assistant`)).toEqual({ enabled: false, model: '' });
    expect(await probeServer(() => Promise.reject(new TypeError('offline')), `${SITE}/api/assistant`)).toEqual({ enabled: false, model: '' });
    expect(await probeServer(undefined, null)).toEqual({ enabled: false, model: '' });
  });

  it('end to end: deltas stream through, stop kinds survive', async () => {
    const deltas: string[] = [];
    const r = await streamServer({ ...BODY, messages: [{ role: 'user', content: 'What is QTc?' }], onDelta: (d) => deltas.push(d) }, viaHandler(ENV, fakeClient(['a', 'b'], 'max_tokens')), `${SITE}/api/assistant`);
    expect(r).toEqual({ text: 'ab', stop: 'truncated' });
    expect(deltas).toEqual(['a', 'b']);
  });

  it('HTTP errors and in-stream errors become coded AssistantErrors', async () => {
    const e1 = (await streamServer({ system: 'S', messages: [{ role: 'user', content: 'q' }] }, viaHandler({}, fakeClient([], 'end_turn')), `${SITE}/api/assistant`).catch((e: unknown) => e)) as AssistantError;
    expect(e1).toBeInstanceOf(AssistantError);
    expect(e1.code).toBe('server');
    const failing: ClientFactory = () =>
      ({
        beta: {
          messages: {
            stream: () => {
              throw new Anthropic.RateLimitError(429, undefined, 'slow', new Headers());
            },
          },
        },
      }) as unknown as Anthropic;
    const e2 = (await streamServer({ system: 'S', messages: [{ role: 'user', content: 'q' }] }, viaHandler(ENV, failing), `${SITE}/api/assistant`).catch((e: unknown) => e)) as AssistantError;
    expect(e2.code).toBe('rate');
    const e3 = (await streamServer({ system: 'S', messages: [{ role: 'user', content: 'q' }] }, undefined, null).catch((e: unknown) => e)) as AssistantError;
    expect(e3.code).toBe('server');
  });
});
