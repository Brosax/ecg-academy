/**
 * OpenAI-compatible chat completions (`POST {baseUrl}/chat/completions`, `stream: true`) over fetch — the format
 * most hosted and local providers speak (DeepSeek, Qwen, Moonshot, Zhipu, OpenAI, Ollama, LM Studio…). Claude is
 * never called this way: the Anthropic provider uses the official SDK. No `max_tokens` is sent (newer OpenAI models
 * reject it); the system prompt asks for short answers instead. Pure parts (SSE parser, chunk parsing, error mapping)
 * are exported for tests.
 */
import { AssistantError, type AssistantErrorCode, type AssistantSettings, type ChatRequest, type ChatResult, type ChatTurn, type StopKind } from '../api';
import { effectiveBaseUrl, effectiveModel } from '../settings';

export interface ChatCompletionBody {
  readonly model: string;
  readonly stream: true;
  readonly messages: readonly { readonly role: 'system' | 'user' | 'assistant'; readonly content: string }[];
}

export function buildChatBody(model: string, system: string, messages: readonly ChatTurn[]): ChatCompletionBody {
  return {
    model,
    stream: true,
    messages: [{ role: 'system', content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
  };
}

/**
 * Incremental Server-Sent Events parser. feed() takes raw text chunks that may split anywhere (inside a line, between
 * CR and LF) and returns the payloads of the events completed so far (`data:` lines of one event joined by '\n');
 * comment lines and the event / id / retry fields are ignored.
 */
export class SseParser {
  private buffer = '';
  private dataLines: string[] = [];

  feed(chunk: string): string[] {
    this.buffer += chunk;
    const out: string[] = [];
    for (;;) {
      const m = /\r\n|\n|\r/.exec(this.buffer);
      if (!m) break;
      // a lone CR at the very end may be the first half of a CRLF: wait for more input
      if (m[0] === '\r' && m.index === this.buffer.length - 1) break;
      const line = this.buffer.slice(0, m.index);
      this.buffer = this.buffer.slice(m.index + m[0].length);
      this.line(line, out);
    }
    return out;
  }

  /** End of input: a last event without a trailing blank line is still delivered. */
  end(): string[] {
    const out: string[] = [];
    if (this.buffer !== '') {
      const rest = this.buffer;
      this.buffer = '';
      for (const line of rest.split(/\r\n|\n|\r/)) this.line(line, out);
    }
    if (this.dataLines.length > 0) out.push(this.take());
    return out;
  }

  private line(line: string, out: string[]): void {
    if (line === '') {
      if (this.dataLines.length > 0) out.push(this.take());
      return;
    }
    if (line.startsWith(':')) return;
    const colon = line.indexOf(':');
    const field = colon < 0 ? line : line.slice(0, colon);
    let value = colon < 0 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'data') this.dataLines.push(value);
  }

  private take(): string {
    const s = this.dataLines.join('\n');
    this.dataLines = [];
    return s;
  }
}

export interface ChunkDelta {
  readonly text: string;
  readonly finish: string | null;
}

interface CompletionChunk {
  readonly error?: { readonly message?: string } | string;
  readonly choices?: readonly {
    readonly delta?: { readonly content?: string | null };
    readonly message?: { readonly content?: string | null };
    readonly finish_reason?: string | null;
  }[];
}

/** The text and finish reason carried by one streamed chunk (unparseable payloads are skipped; an error object throws). */
export function parseChunk(payload: string): ChunkDelta {
  let obj: unknown;
  try {
    obj = JSON.parse(payload);
  } catch {
    return { text: '', finish: null };
  }
  const o = (typeof obj === 'object' && obj !== null ? obj : {}) as CompletionChunk;
  if (o.error) throw new AssistantError('request', typeof o.error === 'string' ? o.error : (o.error.message ?? 'error'));
  const ch = o.choices?.[0];
  const content = ch?.delta?.content ?? ch?.message?.content;
  return { text: typeof content === 'string' ? content : '', finish: ch?.finish_reason ?? null };
}

export function finishToStop(finish: string | null): StopKind {
  return finish === 'length' ? 'truncated' : finish === 'content_filter' ? 'refused' : 'done';
}

export function codeForStatus(status: number): AssistantErrorCode {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate';
  if (status >= 500) return 'server';
  if (status >= 400) return 'request';
  return 'unknown';
}

/** The provider's error text from a response body (`error.message`, `message` or `error`), else the raw body. */
export function errorMessageFromBody(body: string, status: number): string {
  try {
    const j = JSON.parse(body) as { error?: { message?: unknown } | string; message?: unknown };
    const m = typeof j.error === 'string' ? j.error : (j.error?.message ?? j.message);
    if (typeof m === 'string' && m.trim() !== '') return m.trim();
  } catch {
    /* not JSON */
  }
  const t = body.trim();
  return t === '' ? `HTTP ${status}` : t.slice(0, 300);
}

const isAbort = (e: unknown): boolean => typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'AbortError';

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export async function streamOpenAi(settings: AssistantSettings, req: ChatRequest, fetchImpl?: FetchLike): Promise<ChatResult> {
  const doFetch: FetchLike = fetchImpl ?? ((input, init) => fetch(input, init));
  const url = `${effectiveBaseUrl(settings)}/chat/completions`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'text/event-stream' };
  const key = settings.apiKey.trim();
  if (key !== '') headers.Authorization = `Bearer ${key}`;
  const body = buildChatBody(effectiveModel(settings), req.system, req.messages);

  let res: Response;
  try {
    res = await doFetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: req.signal });
  } catch (e) {
    if (isAbort(e)) throw new AssistantError('aborted', '');
    // fetch rejects with a TypeError for network failures — in a browser almost always a CORS refusal
    throw new AssistantError('network', e instanceof Error ? e.message : String(e));
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AssistantError(codeForStatus(res.status), errorMessageFromBody(text, res.status));
  }

  const type = res.headers.get('content-type') ?? '';
  if (!res.body || !type.includes('text/event-stream')) {
    // a server that ignored `stream: true` answers with one JSON completion
    const text = await res.text();
    const d = parseChunk(text);
    if (d.text) req.onDelta?.(d.text);
    return { text: d.text, stop: finishToStop(d.finish) };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parser = new SseParser();
  let text = '';
  let finish: string | null = null;
  const consume = (payloads: readonly string[]): boolean => {
    for (const payload of payloads) {
      if (payload.trim() === '[DONE]') return true;
      const d = parseChunk(payload);
      if (d.text) {
        text += d.text;
        req.onDelta?.(d.text);
      }
      if (d.finish) finish = d.finish;
    }
    return false;
  };
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        consume(parser.end());
        break;
      }
      if (consume(parser.feed(decoder.decode(value, { stream: true })))) break;
    }
  } catch (e) {
    if (e instanceof AssistantError) throw e;
    if (isAbort(e)) throw new AssistantError('aborted', '');
    throw new AssistantError('network', e instanceof Error ? e.message : String(e));
  }
  return { text, stop: finishToStop(finish) };
}
