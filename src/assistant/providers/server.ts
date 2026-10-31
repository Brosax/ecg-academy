/**
 * The site's own assistant endpoint (server/assistant.ts): no key in the browser. `probeServer` asks whether the site
 * has one (a single-file copy opened from disk has none); `streamServer` posts the conversation and reads the SSE
 * events {t} / {stop} / {error}. Same ChatResult and AssistantError codes as the other providers.
 */
import { AssistantError, type AssistantErrorCode, type ChatRequest, type ChatResult, type StopKind } from '../api';
import { codeForStatus, SseParser, type FetchLike } from './openai';

export const SERVER_PATH = '/api/assistant';

export interface ServerInfo {
  readonly enabled: boolean;
  readonly model: string;
}

const CODES: readonly AssistantErrorCode[] = ['auth', 'network', 'rate', 'request', 'server', 'aborted', 'unknown'];
const isCode = (c: unknown): c is AssistantErrorCode => typeof c === 'string' && (CODES as readonly string[]).includes(c);
const isStop = (s: unknown): s is StopKind => s === 'done' || s === 'truncated' || s === 'refused';
const isAbort = (e: unknown): boolean => typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'AbortError';

/** The endpoint URL on this site, or null when the page is not served over http(s) (opened from a file). */
export function serverUrl(loc: { readonly protocol: string; readonly href: string } | undefined = globalThis.location): string | null {
  if (!loc || !/^https?:$/.test(loc.protocol)) return null;
  return new URL(SERVER_PATH, loc.href).href;
}

const defaultFetch: FetchLike = (input, init) => fetch(input, init);

/** Whether this site has a configured assistant endpoint (any failure = no). */
export async function probeServer(fetchImpl: FetchLike = defaultFetch, url: string | null = serverUrl()): Promise<ServerInfo> {
  if (!url) return { enabled: false, model: '' };
  try {
    const res = await fetchImpl(url, { method: 'GET', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout?.(8000) });
    if (!res.ok) return { enabled: false, model: '' };
    const j = (await res.json()) as { enabled?: unknown; model?: unknown };
    return { enabled: j.enabled === true, model: typeof j.model === 'string' ? j.model : '' };
  } catch {
    return { enabled: false, model: '' };
  }
}

async function errorFrom(res: Response): Promise<AssistantError> {
  const text = await res.text().catch(() => '');
  try {
    const j = JSON.parse(text) as { error?: { code?: unknown; message?: unknown } };
    const code = isCode(j.error?.code) ? j.error.code : codeForStatus(res.status);
    return new AssistantError(code, typeof j.error?.message === 'string' ? j.error.message : `HTTP ${res.status}`);
  } catch {
    return new AssistantError(codeForStatus(res.status), text.trim().slice(0, 300) || `HTTP ${res.status}`);
  }
}

export async function streamServer(req: ChatRequest, fetchImpl: FetchLike = defaultFetch, url: string | null = serverUrl()): Promise<ChatResult> {
  if (!url) throw new AssistantError('server', 'no server');
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ system: req.system, messages: req.messages, maxTokens: req.maxTokens }),
      signal: req.signal,
    });
  } catch (e) {
    if (isAbort(e)) throw new AssistantError('aborted', '');
    throw new AssistantError('network', e instanceof Error ? e.message : String(e));
  }
  if (!res.ok || !res.body) throw await errorFrom(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parser = new SseParser();
  let text = '';
  let stop: StopKind = 'done';
  const consume = (payloads: readonly string[]): void => {
    for (const p of payloads) {
      let ev: { t?: unknown; stop?: unknown; error?: { code?: unknown; message?: unknown } };
      try {
        ev = JSON.parse(p) as typeof ev;
      } catch {
        continue;
      }
      if (typeof ev.t === 'string') {
        text += ev.t;
        req.onDelta?.(ev.t);
      }
      if (isStop(ev.stop)) stop = ev.stop;
      if (ev.error) throw new AssistantError(isCode(ev.error.code) ? ev.error.code : 'unknown', typeof ev.error.message === 'string' ? ev.error.message : '');
    }
  };
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        consume(parser.end());
        break;
      }
      consume(parser.feed(decoder.decode(value, { stream: true })));
    }
  } catch (e) {
    if (e instanceof AssistantError) throw e;
    if (isAbort(e)) throw new AssistantError('aborted', '');
    throw new AssistantError('network', e instanceof Error ? e.message : String(e));
  }
  return { text, stop };
}
