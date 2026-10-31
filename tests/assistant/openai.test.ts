/**
 * The OpenAI-compatible provider (src/assistant/providers/openai.ts): the SSE parser under adversarial chunking, chunk
 * and error parsing, and the streaming call against a fake fetch (stream, non-stream JSON, HTTP errors, abort).
 */
import { describe, expect, it } from 'vitest';
import { AssistantError, type AssistantSettings } from '../../src/assistant/api';
import { buildChatBody, codeForStatus, errorMessageFromBody, finishToStop, parseChunk, SseParser, streamOpenAi, type FetchLike } from '../../src/assistant/providers/openai';

const SETTINGS: AssistantSettings = { provider: 'openai', apiKey: 'sk-test', baseUrl: 'https://api.example.com/v1/', model: 'test-model', remember: true };

const chunk = (content: string | null, finish: string | null = null) =>
  JSON.stringify({ id: 'c1', object: 'chat.completion.chunk', choices: [{ index: 0, delta: content === null ? {} : { content }, finish_reason: finish }] });

describe('SseParser', () => {
  it('delivers complete events whatever the chunk boundaries', () => {
    const events = ['data: {"a":1}\n\n', 'event: ping\ndata: {"b":2}\n\n', ': comment\n\ndata: x\ndata: y\n\n', 'data: [DONE]\n\n'].join('');
    for (const size of [1, 2, 3, 5, 7, 11, 1000]) {
      const p = new SseParser();
      const out: string[] = [];
      for (let i = 0; i < events.length; i += size) out.push(...p.feed(events.slice(i, i + size)));
      out.push(...p.end());
      expect(out, `chunk size ${size}`).toEqual(['{"a":1}', '{"b":2}', 'x\ny', '[DONE]']);
    }
  });
  it('handles CRLF and a CR split from its LF', () => {
    const p = new SseParser();
    const out = [...p.feed('data: a\r'), ...p.feed('\n\r\ndata: b\r\n\r\n')];
    expect(out).toEqual(['a', 'b']);
  });
  it('a final event without a trailing blank line arrives at end()', () => {
    const p = new SseParser();
    expect(p.feed('data: last')).toEqual([]);
    expect(p.end()).toEqual(['last']);
  });
  it('"data:" without a space is accepted', () => {
    const p = new SseParser();
    expect(p.feed('data:{"x":1}\n\n')).toEqual(['{"x":1}']);
  });
});

describe('chunk and error parsing', () => {
  it('reads delta content and finish reason; tolerates null content and garbage', () => {
    expect(parseChunk(chunk('Hel'))).toEqual({ text: 'Hel', finish: null });
    expect(parseChunk(chunk(null, 'stop'))).toEqual({ text: '', finish: 'stop' });
    expect(parseChunk(JSON.stringify({ choices: [{ delta: { content: null, reasoning_content: 'thinking' } }] }))).toEqual({ text: '', finish: null });
    expect(parseChunk('not json')).toEqual({ text: '', finish: null });
    expect(parseChunk(JSON.stringify({ choices: [{ message: { content: 'whole' }, finish_reason: 'stop' }] }))).toEqual({ text: 'whole', finish: 'stop' });
  });
  it('an error object in the stream throws a request error', () => {
    expect(() => parseChunk(JSON.stringify({ error: { message: 'model not found' } }))).toThrowError(/model not found/);
  });
  it('maps finish reasons and HTTP statuses', () => {
    expect(finishToStop('stop')).toBe('done');
    expect(finishToStop(null)).toBe('done');
    expect(finishToStop('length')).toBe('truncated');
    expect(finishToStop('content_filter')).toBe('refused');
    expect([401, 403, 429, 400, 404, 500, 503].map(codeForStatus)).toEqual(['auth', 'auth', 'rate', 'request', 'request', 'server', 'server']);
  });
  it('extracts the provider message from error bodies', () => {
    expect(errorMessageFromBody('{"error":{"message":"Invalid API key","type":"x"}}', 401)).toBe('Invalid API key');
    expect(errorMessageFromBody('{"error":"plain"}', 400)).toBe('plain');
    expect(errorMessageFromBody('{"message":"m"}', 400)).toBe('m');
    expect(errorMessageFromBody('<html>bad gateway</html>', 502)).toBe('<html>bad gateway</html>');
    expect(errorMessageFromBody('', 502)).toBe('HTTP 502');
  });
  it('builds the request body with the system message first and no max_tokens', () => {
    const body = buildChatBody('m', 'SYS', [
      { role: 'user', content: 'q' },
      { role: 'assistant', content: 'a' },
    ]);
    expect(body).toEqual({
      model: 'm',
      stream: true,
      messages: [
        { role: 'system', content: 'SYS' },
        { role: 'user', content: 'q' },
        { role: 'assistant', content: 'a' },
      ],
    });
    expect('max_tokens' in body).toBe(false);
  });
});

function sseResponse(parts: readonly string[], status = 200): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      for (const p of parts) ctrl.enqueue(enc.encode(p));
      ctrl.close();
    },
  });
  return new Response(stream, { status, headers: { 'content-type': 'text/event-stream' } });
}

const ask = (fetchImpl: FetchLike, settings = SETTINGS, onDelta?: (d: string) => void) =>
  streamOpenAi(settings, { system: 'S', messages: [{ role: 'user', content: 'hi' }], onDelta }, fetchImpl);

describe('streamOpenAi', () => {
  it('posts to {baseUrl}/chat/completions with the bearer key and streams the deltas', async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const fetchImpl: FetchLike = (url, init) => {
      seen = { url, init };
      const sse = [`data: ${chunk('Hel')}\n\n`, `data: ${chunk('lo')}\n\ndata: ${chunk(null, 'stop')}\n\n`, 'data: [DONE]\n\n'];
      return Promise.resolve(sseResponse(sse));
    };
    const deltas: string[] = [];
    const r = await ask(fetchImpl, SETTINGS, (d) => deltas.push(d));
    expect(r).toEqual({ text: 'Hello', stop: 'done' });
    expect(deltas).toEqual(['Hel', 'lo']);
    expect(seen!.url).toBe('https://api.example.com/v1/chat/completions');
    expect((seen!.init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    expect(JSON.parse(seen!.init.body as string).messages[0]).toEqual({ role: 'system', content: 'S' });
  });

  it('no key: no Authorization header (local servers)', async () => {
    let headers: Record<string, string> = {};
    const fetchImpl: FetchLike = (_u, init) => {
      headers = init.headers as Record<string, string>;
      return Promise.resolve(sseResponse([`data: ${chunk('x', 'stop')}\n\n`, 'data: [DONE]\n\n']));
    };
    await ask(fetchImpl, { ...SETTINGS, apiKey: '' });
    expect('Authorization' in headers).toBe(false);
  });

  it('a JSON (non-streaming) answer is accepted too; "length" reports truncation', async () => {
    const fetchImpl: FetchLike = () =>
      Promise.resolve(
        new Response(JSON.stringify({ choices: [{ message: { content: 'whole answer' }, finish_reason: 'length' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    expect(await ask(fetchImpl)).toEqual({ text: 'whole answer', stop: 'truncated' });
  });

  it('HTTP errors become coded AssistantErrors with the provider message', async () => {
    const fetchImpl: FetchLike = () =>
      Promise.resolve(new Response(JSON.stringify({ error: { message: 'Incorrect API key provided' } }), { status: 401, headers: { 'content-type': 'application/json' } }));
    const err = (await ask(fetchImpl).catch((e: unknown) => e)) as AssistantError;
    expect(err).toBeInstanceOf(AssistantError);
    expect(err.code).toBe('auth');
    expect(err.detail).toBe('Incorrect API key provided');
  });

  it('a rejected fetch is a network error; an AbortError is "aborted"', async () => {
    const network: FetchLike = () => Promise.reject(new TypeError('Failed to fetch'));
    expect(((await ask(network).catch((e: unknown) => e)) as AssistantError).code).toBe('network');
    const abort: FetchLike = () => Promise.reject(Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' }));
    expect(((await ask(abort).catch((e: unknown) => e)) as AssistantError).code).toBe('aborted');
  });

  it('an error event inside the stream surfaces as a request error', async () => {
    const fetchImpl: FetchLike = () => Promise.resolve(sseResponse([`data: ${chunk('a')}\n\n`, `data: ${JSON.stringify({ error: { message: 'quota' } })}\n\n`]));
    const e = (await ask(fetchImpl).catch((x: unknown) => x)) as AssistantError;
    expect(e.code).toBe('request');
    expect(e.detail).toBe('quota');
  });
});
